from specloop_agent.routing import ROUTING_POLICY_VERSION, plan_request


def test_high_severity_issue_sets_complex_risk_floor(complex_request):
    plan = plan_request(complex_request)

    assert ROUTING_POLICY_VERSION == "risk-floor-v2"
    assert plan.complexity == "complex"
    assert plan.requested_tier == "small"
    assert plan.question_budget == 3
    assert plan.review_required is True


def test_two_conflicts_route_to_large_tier(complex_request):
    conflicts = [
        {
            "key": f"conflict-{index}",
            "kind": "conflict",
            "severity": "high",
            "evidenceIds": ["ev-upload"],
        }
        for index in range(2)
    ]
    issue_type = type(complex_request.baseline_issues[0])
    request = complex_request.model_copy(
        update={"baseline_issues": [issue_type(**item) for item in conflicts]}
    )

    plan = plan_request(request)

    assert plan.complexity == "high-risk"
    assert plan.requested_tier == "large"
    assert plan.question_budget == 3
