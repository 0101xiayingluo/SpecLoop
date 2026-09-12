from __future__ import annotations

from dataclasses import dataclass

from .schemas import Complexity, ReasonRequest, RequestedTier

ROUTING_POLICY_VERSION = "risk-floor-v2"


@dataclass(frozen=True, slots=True)
class RoutePlan:
    complexity: Complexity
    requested_tier: RequestedTier
    question_budget: int
    review_required: bool
    score: int
    conflicts: int
    high_severity: int
    assumptions: int


def plan_request(request: ReasonRequest) -> RoutePlan:
    """Recompute routing from deterministic signals when the caller supplies them."""
    if not request.baseline_issues:
        complexity = request.routing.complexity
        return RoutePlan(
            complexity=complexity,
            requested_tier=request.routing.requested_tier,
            question_budget=min(request.max_questions, _budget(complexity)),
            review_required=request.routing.review_required,
            score=0,
            conflicts=0,
            high_severity=0,
            assumptions=0,
        )

    conflicts = sum(issue.kind == "conflict" for issue in request.baseline_issues)
    assumptions = sum(issue.kind == "assumption" for issue in request.baseline_issues)
    high_severity = sum(issue.severity == "high" for issue in request.baseline_issues)
    score = (
        conflicts * 3
        + high_severity * 2
        + assumptions
        + (2 if len(request.evidence) >= 12 else 0)
    )
    if score >= 10 or conflicts >= 2 or high_severity >= 3:
        complexity: Complexity = "high-risk"
    elif score >= 5 or high_severity >= 1:
        complexity = "complex"
    else:
        complexity = "simple"
    requested_tier: RequestedTier = (
        "none" if complexity == "simple" else "large" if complexity == "high-risk" else "small"
    )
    return RoutePlan(
        complexity=complexity,
        requested_tier=requested_tier,
        question_budget=min(request.max_questions, _budget(complexity)),
        review_required=high_severity > 0 or complexity == "high-risk",
        score=score,
        conflicts=conflicts,
        high_severity=high_severity,
        assumptions=assumptions,
    )


def _budget(complexity: Complexity) -> int:
    return 5 if complexity == "high-risk" else 3 if complexity == "complex" else 1
