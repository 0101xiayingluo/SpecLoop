from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

from openai import AsyncOpenAI

from .metrics import normalize_usage
from .schemas import Analysis, ReasonRequest, Usage

SYSTEM_INSTRUCTIONS = """You are SpecLoop's requirements clarification reasoner.
Analyze only the supplied evidence. Identify contradictory statements, missing
implementation or acceptance conditions, and explicitly uncertain assumptions.
Every issue must cite supplied evidence IDs exactly. Never invent an evidence ID.
Propose only questions that can materially change implementation, scope, risk, or
acceptance. Rank them with informationGain from 0 to 100. Do not exceed the
requested maximum question count. Keep language consistent with the evidence.
Return a calibrated selfAssessment. It is advisory and never overrides
deterministic review policy."""


@dataclass(frozen=True, slots=True)
class ProviderResult:
    analysis: Analysis
    response_id: str
    request_id: str | None
    model: str
    usage: Usage


class ReasoningProvider(Protocol):
    async def propose(
        self,
        request: ReasonRequest,
        *,
        model: str,
        question_budget: int,
    ) -> ProviderResult: ...


class ProviderFailure(RuntimeError):
    def __init__(self, message: str, request_id: str | None = None):
        super().__init__(message)
        self.request_id = request_id


class OpenAIResponsesProvider:
    def __init__(self, api_key: str, timeout_seconds: float):
        self._client = AsyncOpenAI(api_key=api_key, timeout=timeout_seconds)

    async def propose(
        self,
        request: ReasonRequest,
        *,
        model: str,
        question_budget: int,
    ) -> ProviderResult:
        payload = request.model_dump(by_alias=True)
        payload["maxQuestions"] = question_budget
        try:
            response = await self._client.responses.create(
                model=model,
                instructions=SYSTEM_INSTRUCTIONS,
                input=json.dumps(payload, ensure_ascii=False),
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "specloop_analysis",
                        "strict": True,
                        "schema": Analysis.model_json_schema(by_alias=True),
                    }
                },
                store=False,
            )
            analysis = Analysis.model_validate_json(response.output_text)
        except Exception as error:
            request_id = getattr(error, "request_id", None)
            raise ProviderFailure(str(error)[:800], request_id=request_id) from error

        return ProviderResult(
            analysis=analysis,
            response_id=response.id,
            request_id=getattr(response, "_request_id", None),
            model=response.model,
            usage=normalize_usage(response.usage),
        )
