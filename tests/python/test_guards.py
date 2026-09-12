import pytest

from specloop_agent.guards import GroundingError, validate_and_limit_analysis


def test_grounding_guard_rejects_invented_evidence(complex_request, valid_analysis):
    invented = valid_analysis.model_copy(deep=True)
    invented.issues[0].evidence_ids = ["ev-invented"]

    with pytest.raises(GroundingError, match="unknown evidence"):
        validate_and_limit_analysis(complex_request, invented, 3)


def test_questions_are_ranked_and_capped(complex_request, valid_analysis):
    base = valid_analysis.questions[0]
    questions = [
        base.model_copy(update={"key": f"q-{index}", "information_gain": float(index)})
        for index in range(5)
    ]
    analysis = valid_analysis.model_copy(update={"questions": questions})

    guarded, report = validate_and_limit_analysis(complex_request, analysis, 3)

    assert [question.information_gain for question in guarded.questions] == [4, 3, 2]
    assert report.grounding_integrity == 1
    assert report.trace_faithfulness == 1
