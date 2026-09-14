from __future__ import annotations

from dataclasses import dataclass

import pytest

from specloop_agent.orchestrator import AgentExecutionError, SpecLoopAgent
from specloop_agent.provider import ProviderFailure, ProviderResult
from specloop_agent.schemas import Analysis, ReasonRequest, Usage


@dataclass
class FakeProvider:
    analysis: Analysis
    failure: str | None = None

    async def propose(
        self,
        request: ReasonRequest,
        *,
        model: str,
        question_budget: int,
    ) -> ProviderResult:
        if self.failure:
            raise ProviderFailure(self.failure, request_id="req-failed")
        return ProviderResult(
            analysis=self.analysis,
            response_id="resp-test",
            request_id="req-test",
            model=model,
            usage=Usage(
                input_tokens=1_000,
                cached_input_tokens=400,
                output_tokens=200,
                reasoning_tokens=50,
                total_tokens=1_200,
            ),
        )


async def test_agent_graph_returns_guarded_analysis_and_step_trace(
    settings, complex_request, valid_analysis
):
    agent = SpecLoopAgent(settings, FakeProvider(valid_analysis))

    response = await agent.run(complex_request)

    assert response.execution.execution_mode == "model-assisted"
    assert response.run.runtime == "python-fastapi"
    assert response.run.policy_version == "risk-floor-v2"
    assert response.run.estimated_cost_usd == 0.003
    assert response.run.guards.grounding_integrity == 1
    assert [step.name for step in response.run.steps] == [
        "validate-input",
        "plan-route",
        "model-proposal",
        "grounding-guard",
        "review-gate",
    ]


async def test_provider_failure_has_deterministic_review_telemetry(
    settings, complex_request, valid_analysis
):
    agent = SpecLoopAgent(settings, FakeProvider(valid_analysis, failure="provider timeout"))

    with pytest.raises(AgentExecutionError) as captured:
        await agent.run(complex_request)

    assert captured.value.status_code == 502
    assert captured.value.run.status == "failed"
    assert captured.value.run.execution_mode == "deterministic-review"
    assert captured.value.run.request_id == "req-failed"


async def test_grounding_failure_keeps_usage_for_bad_case_linkage(
    settings, complex_request, valid_analysis
):
    invalid = valid_analysis.model_copy(deep=True)
    invalid.issues[0].evidence_ids = ["ev-not-present"]
    agent = SpecLoopAgent(settings, FakeProvider(invalid))

    with pytest.raises(AgentExecutionError) as captured:
        await agent.run(complex_request)

    assert captured.value.run.execution_mode == "deterministic-review"
    assert captured.value.run.total_tokens == 1_200
    assert captured.value.run.steps[-1].name == "grounding-guard"
    assert captured.value.run.steps[-1].status == "failed"
