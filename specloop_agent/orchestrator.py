from __future__ import annotations

from datetime import UTC, datetime
from time import perf_counter
from uuid import uuid4

from .config import Settings
from .guards import GroundingError, validate_and_limit_analysis
from .metrics import estimate_cost_usd
from .policy import decide_execution_mode
from .provider import ProviderFailure, ReasoningProvider
from .routing import ROUTING_POLICY_VERSION, RoutePlan, plan_request
from .schemas import (
    AgentRun,
    AgentStep,
    ExecutionReport,
    GuardResults,
    ReasonRequest,
    ReasonResponse,
    Usage,
)


class AgentExecutionError(RuntimeError):
    def __init__(self, message: str, status_code: int, run: AgentRun):
        super().__init__(message)
        self.status_code = status_code
        self.run = run


class SpecLoopAgent:
    """A bounded single-agent graph; model output is a proposal, never state authority."""

    def __init__(self, settings: Settings, provider: ReasoningProvider | None):
        self._settings = settings
        self._provider = provider

    async def run(self, request: ReasonRequest) -> ReasonResponse:
        started_at = datetime.now(UTC)
        start = perf_counter()
        steps: list[AgentStep] = [
            AgentStep(
                name="validate-input",
                status="passed",
                latency_ms=0,
                detail=f"Validated {len(request.evidence)} evidence fragments with Pydantic",
            )
        ]

        plan_start = perf_counter()
        plan = plan_request(request)
        steps.append(
            AgentStep(
                name="plan-route",
                status="passed",
                latency_ms=_elapsed_ms(plan_start),
                detail=(
                    f"{plan.complexity} -> {plan.requested_tier}; score={plan.score}; "
                    f"question_budget={plan.question_budget}"
                ),
            )
        )

        if plan.requested_tier == "none":
            raise self._failure(
                "Simple requests stay on the deterministic frontend path",
                422,
                started_at,
                start,
                plan,
                steps,
            )
        if self._provider is None:
            steps.append(
                AgentStep(
                    name="model-proposal",
                    status="failed",
                    latency_ms=0,
                    detail="OPENAI_API_KEY is not configured",
                )
            )
            raise self._failure(
                "OPENAI_API_KEY is not configured",
                503,
                started_at,
                start,
                plan,
                steps,
            )

        selected_model = (
            self._settings.large_model
            if plan.requested_tier == "large"
            else self._settings.small_model
        )
        provider_start = perf_counter()
        try:
            result = await self._provider.propose(
                request,
                model=selected_model,
                question_budget=plan.question_budget,
            )
        except ProviderFailure as error:
            steps.append(
                AgentStep(
                    name="model-proposal",
                    status="failed",
                    latency_ms=_elapsed_ms(provider_start),
                    detail=str(error)[:240],
                )
            )
            raise self._failure(
                str(error),
                502,
                started_at,
                start,
                plan,
                steps,
                request_id=error.request_id,
                model=selected_model,
            ) from error

        steps.append(
            AgentStep(
                name="model-proposal",
                status="passed",
                latency_ms=_elapsed_ms(provider_start),
                detail=f"Received schema-bound proposal from {result.model}",
            )
        )
        guard_start = perf_counter()
        try:
            analysis, guard_report = validate_and_limit_analysis(
                request,
                result.analysis,
                plan.question_budget,
            )
        except GroundingError as error:
            steps.append(
                AgentStep(
                    name="grounding-guard",
                    status="failed",
                    latency_ms=_elapsed_ms(guard_start),
                    detail=str(error)[:240],
                )
            )
            raise self._failure(
                str(error),
                502,
                started_at,
                start,
                plan,
                steps,
                request_id=result.request_id,
                model=result.model,
                usage=result.usage,
                run_id=result.response_id,
            ) from error

        steps.append(
            AgentStep(
                name="grounding-guard",
                status="passed",
                latency_ms=_elapsed_ms(guard_start),
                detail="All issue citations and question links resolve to allowlisted IDs",
            )
        )
        execution_mode = decide_execution_mode(
            plan.complexity,
            provider_available=True,
            schema_valid=True,
            grounding_integrity=guard_report.grounding_integrity,
            trace_faithfulness=guard_report.trace_faithfulness,
        )
        steps.append(
            AgentStep(
                name="review-gate",
                status="passed",
                latency_ms=0,
                detail=f"Execution mode set to {execution_mode}",
            )
        )
        guards = GuardResults(
            schema_valid=True,
            grounding_integrity=guard_report.grounding_integrity,
            trace_faithfulness=guard_report.trace_faithfulness,
            review_required=plan.review_required,
        )
        completed_at = datetime.now(UTC)
        run = AgentRun(
            id=result.response_id,
            model=result.model,
            status="succeeded",
            started_at=started_at,
            completed_at=completed_at,
            request_id=result.request_id,
            **result.usage.model_dump(),
            server_latency_ms=_elapsed_ms(start),
            estimated_cost_usd=estimate_cost_usd(result.usage, self._settings),
            pricing_configured=self._settings.pricing_configured,
            execution_mode=execution_mode,
            policy_version=ROUTING_POLICY_VERSION,
            steps=steps,
            guards=guards,
        )
        return ReasonResponse(
            analysis=analysis,
            run=run,
            execution=ExecutionReport(
                complexity=plan.complexity,
                requested_tier=plan.requested_tier,
                question_budget=plan.question_budget,
                review_required=plan.review_required,
                execution_mode=execution_mode,
                policy_version=ROUTING_POLICY_VERSION,
            ),
        )

    def _failure(
        self,
        message: str,
        status_code: int,
        started_at: datetime,
        start: float,
        plan: RoutePlan,
        steps: list[AgentStep],
        *,
        request_id: str | None = None,
        model: str | None = None,
        usage: Usage | None = None,
        run_id: str | None = None,
    ) -> AgentExecutionError:
        usage = usage or Usage()
        mode = decide_execution_mode(
            plan.complexity,
            provider_available=False,
            schema_valid=False,
            grounding_integrity=0,
            trace_faithfulness=0,
        )
        run = AgentRun(
            id=run_id or f"run-{uuid4().hex[:12]}",
            model=model
            or (
                self._settings.large_model
                if plan.requested_tier == "large"
                else self._settings.small_model
            ),
            status="failed",
            started_at=started_at,
            completed_at=datetime.now(UTC),
            request_id=request_id,
            **usage.model_dump(),
            server_latency_ms=_elapsed_ms(start),
            estimated_cost_usd=estimate_cost_usd(usage, self._settings),
            pricing_configured=self._settings.pricing_configured,
            error=message[:800],
            execution_mode=mode,
            policy_version=ROUTING_POLICY_VERSION,
            steps=steps,
            guards=GuardResults(
                schema_valid=False,
                grounding_integrity=0,
                trace_faithfulness=0,
                review_required=plan.review_required,
            ),
        )
        return AgentExecutionError(message, status_code, run)


def _elapsed_ms(start: float) -> int:
    return max(0, round((perf_counter() - start) * 1_000))
