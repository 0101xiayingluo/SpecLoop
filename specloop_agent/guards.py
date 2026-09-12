from __future__ import annotations

from dataclasses import dataclass

from .schemas import Analysis, ReasonRequest


class GroundingError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class GuardReport:
    grounding_integrity: float
    trace_faithfulness: float


def validate_and_limit_analysis(
    request: ReasonRequest,
    analysis: Analysis,
    question_budget: int,
) -> tuple[Analysis, GuardReport]:
    evidence_allowlist = {item.id for item in request.evidence}
    issue_keys: set[str] = set()

    for issue in analysis.issues:
        if issue.key in issue_keys:
            raise GroundingError(f"duplicate issue key: {issue.key}")
        issue_keys.add(issue.key)
        unknown = set(issue.evidence_ids) - evidence_allowlist
        if unknown:
            raise GroundingError(
                f"issue {issue.key} referenced unknown evidence: {', '.join(sorted(unknown))}"
            )

    for question in analysis.questions:
        unknown_issues = set(question.issue_keys) - issue_keys
        if unknown_issues:
            unknown_labels = ", ".join(sorted(unknown_issues))
            raise GroundingError(
                f"question {question.key} referenced unknown issues: {unknown_labels}"
            )
        if question.recommendation_index >= len(question.options):
            raise GroundingError(f"question {question.key} has an invalid recommendation index")

    questions = sorted(
        analysis.questions,
        key=lambda question: question.information_gain,
        reverse=True,
    )[:question_budget]
    return (
        analysis.model_copy(update={"questions": questions}),
        GuardReport(grounding_integrity=1.0, trace_faithfulness=1.0),
    )
