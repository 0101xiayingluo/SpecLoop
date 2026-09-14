from dataclasses import dataclass

from fastapi.testclient import TestClient

from specloop_agent.app import create_app
from specloop_agent.provider import ProviderResult
from specloop_agent.schemas import Analysis, Usage


@dataclass
class FakeProvider:
    analysis: Analysis

    async def propose(self, request, *, model, question_budget):
        return ProviderResult(
            analysis=self.analysis,
            response_id="resp-api-test",
            request_id="req-api-test",
            model=model,
            usage=Usage(input_tokens=10, output_tokens=5, total_tokens=15),
        )


def valid_analysis() -> Analysis:
    return Analysis.model_validate(
        {
            "issues": [
                {
                    "key": "scope",
                    "kind": "conflict",
                    "title": "Scope conflict",
                    "description": "Two scope statements differ.",
                    "severity": "high",
                    "evidenceIds": ["ev-upload"],
                }
            ],
            "questions": [
                {
                    "key": "scope-question",
                    "prompt": "Which scope is correct?",
                    "why": "It changes acceptance scope.",
                    "informationGain": 10,
                    "issueKeys": ["scope"],
                    "options": [
                        {"label": "A", "value": "A"},
                        {"label": "B", "value": "B"},
                    ],
                    "recommendationIndex": 0,
                }
            ],
            "selfAssessment": {
                "confidence": 0.8,
                "reviewRecommended": True,
                "unresolvedRisks": [],
            },
        }
    )


def test_health_exposes_python_runtime_and_guards(settings):
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "available": False,
        "runtime": "python-fastapi",
        "model": "test-small",
        "models": {"small": "test-small", "large": "test-large"},
        "pricingConfigured": True,
        "policyVersion": "risk-floor-v2",
        "guardrails": {
            "originRestricted": False,
            "requestsPerMinute": 12,
            "maxConcurrentRequests": 2,
            "modelTimeoutMs": 30_000,
        },
    }


def test_missing_provider_returns_auditable_fallback(settings, complex_request):
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/reason",
            json=complex_request.model_dump(by_alias=True),
        )

    assert response.status_code == 503
    body = response.json()
    assert body["run"]["runtime"] == "python-fastapi"
    assert body["run"]["executionMode"] == "deterministic-review"
    assert body["run"]["steps"][-1]["name"] == "model-proposal"


def test_success_response_keeps_frontend_camel_case_contract(settings, complex_request):
    with TestClient(create_app(settings, FakeProvider(valid_analysis()))) as client:
        response = client.post(
            "/api/reason",
            json=complex_request.model_dump(by_alias=True),
        )

    assert response.status_code == 200
    body = response.json()
    assert body["run"]["runtime"] == "python-fastapi"
    assert body["run"]["executionMode"] == "model-assisted"
    assert body["run"]["guards"]["groundingIntegrity"] == 1
    assert body["execution"]["questionBudget"] == 3


def test_pydantic_rejects_more_than_five_questions(settings, complex_request):
    payload = complex_request.model_dump(by_alias=True)
    payload["maxQuestions"] = 6
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/reason", json=payload)

    assert response.status_code == 422
