from __future__ import annotations

import pytest

from specloop_agent.config import Settings
from specloop_agent.schemas import Analysis, ReasonRequest


@pytest.fixture
def settings() -> Settings:
    return Settings(
        openai_api_key=None,
        default_model="test-small",
        small_model="test-small",
        large_model="test-large",
        allowed_origins=(),
        requests_per_minute=12,
        max_concurrent_requests=2,
        model_timeout_seconds=30,
        input_usd_per_million=2,
        cached_input_usd_per_million=0.5,
        output_usd_per_million=8,
        host="127.0.0.1",
        port=8787,
    )


@pytest.fixture
def complex_request() -> ReasonRequest:
    return ReasonRequest.model_validate(
        {
            "evidence": [
                {"id": "ev-upload", "quote": "用户需要上传 PDF。", "line": 1},
                {"id": "ev-scope", "quote": "首版只支持粘贴。", "line": 2},
            ],
            "preferences": {
                "reasonerMode": "model",
                "priorityMode": "risk-first",
                "writingStyle": "concise",
                "riskTolerance": "low",
                "updatedAt": "2026-09-12T00:00:00Z",
            },
            "maxQuestions": 3,
            "routing": {
                "complexity": "complex",
                "requestedTier": "small",
                "reviewRequired": True,
                "policyVersion": "risk-floor-v2",
            },
            "baselineIssues": [
                {
                    "key": "upload-failure",
                    "kind": "missing",
                    "severity": "high",
                    "evidenceIds": ["ev-upload"],
                }
            ],
        }
    )


@pytest.fixture
def valid_analysis() -> Analysis:
    return Analysis.model_validate(
        {
            "issues": [
                {
                    "key": "scope",
                    "kind": "conflict",
                    "title": "上传范围冲突",
                    "description": "上传与只粘贴不能同时成立。",
                    "severity": "high",
                    "evidenceIds": ["ev-upload", "ev-scope"],
                }
            ],
            "questions": [
                {
                    "key": "q-scope",
                    "prompt": "首版是否支持 PDF 上传？",
                    "why": "该选择会改变实现和验收范围。",
                    "informationGain": 12,
                    "issueKeys": ["scope"],
                    "options": [
                        {"label": "支持上传", "value": "首版支持 PDF 上传。"},
                        {"label": "仅粘贴", "value": "首版仅支持粘贴。"},
                    ],
                    "recommendationIndex": 0,
                }
            ],
            "selfAssessment": {
                "confidence": 0.74,
                "reviewRecommended": True,
                "unresolvedRisks": ["文件解析失败行为未定义"],
            },
        }
    )
