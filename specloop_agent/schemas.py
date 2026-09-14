from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        extra="forbid",
    )


IssueKind = Literal["conflict", "missing", "assumption"]
Severity = Literal["high", "medium", "low"]
Complexity = Literal["simple", "complex", "high-risk"]
RequestedTier = Literal["none", "small", "large"]
ExecutionMode = Literal[
    "deterministic",
    "model-assisted",
    "deterministic-review",
    "model-assisted-review",
    "manual-review",
]


class EvidenceInput(ApiModel):
    id: str = Field(min_length=1, max_length=160)
    quote: str = Field(min_length=1, max_length=20_000)
    line: int = Field(ge=1)


class PreferencesInput(ApiModel):
    reasoner_mode: Literal["demo", "model"] | None = None
    priority_mode: Literal["risk-first", "value-first", "effort-first"] = "risk-first"
    writing_style: Literal["concise", "balanced", "detailed"] = "balanced"
    risk_tolerance: Literal["low", "medium", "high"] = "low"
    updated_at: str | None = None


class RoutingInput(ApiModel):
    complexity: Complexity
    requested_tier: RequestedTier
    review_required: bool
    policy_version: str = Field(min_length=1, max_length=80)


class BaselineIssue(ApiModel):
    key: str = Field(min_length=1, max_length=160)
    kind: IssueKind
    severity: Severity
    evidence_ids: list[str] = Field(min_length=1, max_length=6)


class ReasonRequest(ApiModel):
    evidence: list[EvidenceInput] = Field(min_length=1, max_length=500)
    preferences: PreferencesInput
    max_questions: int = Field(ge=1, le=5)
    routing: RoutingInput
    baseline_issues: list[BaselineIssue] = Field(default_factory=list, max_length=50)


class AnalysisIssue(ApiModel):
    key: str = Field(min_length=1, max_length=80)
    kind: IssueKind
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=600)
    severity: Severity
    evidence_ids: list[str] = Field(min_length=1, max_length=6)


class QuestionOption(ApiModel):
    label: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=400)


class AnalysisQuestion(ApiModel):
    key: str = Field(min_length=1, max_length=80)
    prompt: str = Field(min_length=1, max_length=280)
    why: str = Field(min_length=1, max_length=400)
    information_gain: float = Field(ge=0, le=100)
    issue_keys: list[str] = Field(min_length=1, max_length=4)
    options: list[QuestionOption] = Field(min_length=2, max_length=4)
    recommendation_index: int = Field(ge=0, le=3)


class SelfAssessment(ApiModel):
    confidence: float = Field(ge=0, le=1)
    review_recommended: bool
    unresolved_risks: list[str] = Field(max_length=6)


class Analysis(ApiModel):
    issues: list[AnalysisIssue] = Field(max_length=16)
    questions: list[AnalysisQuestion] = Field(max_length=10)
    self_assessment: SelfAssessment


class Usage(ApiModel):
    input_tokens: int = Field(default=0, ge=0)
    cached_input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    reasoning_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class AgentStep(ApiModel):
    name: Literal[
        "validate-input",
        "plan-route",
        "model-proposal",
        "grounding-guard",
        "review-gate",
    ]
    status: Literal["passed", "failed", "skipped"]
    latency_ms: int = Field(ge=0)
    detail: str = Field(min_length=1, max_length=240)


class GuardResults(ApiModel):
    schema_valid: bool
    grounding_integrity: float = Field(ge=0, le=1)
    trace_faithfulness: float = Field(ge=0, le=1)
    review_required: bool


class AgentRun(ApiModel):
    id: str
    provider: Literal["openai"] = "openai"
    model: str
    status: Literal["succeeded", "failed"]
    started_at: datetime
    completed_at: datetime
    request_id: str | None = None
    input_tokens: int = Field(ge=0)
    cached_input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    reasoning_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    server_latency_ms: int = Field(ge=0)
    client_latency_ms: int = Field(default=0, ge=0)
    estimated_cost_usd: float | None
    pricing_configured: bool
    error: str | None = Field(default=None, max_length=800)
    runtime: Literal["python-fastapi"] = "python-fastapi"
    execution_mode: ExecutionMode
    policy_version: str
    steps: list[AgentStep]
    guards: GuardResults


class ExecutionReport(ApiModel):
    complexity: Complexity
    requested_tier: RequestedTier
    question_budget: int
    review_required: bool
    execution_mode: ExecutionMode
    policy_version: str


class ReasonResponse(ApiModel):
    analysis: Analysis
    run: AgentRun
    execution: ExecutionReport
