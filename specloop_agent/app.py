from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings
from .guardrails import ConcurrencyError, ConcurrencyGate, FixedWindowRateLimiter
from .orchestrator import AgentExecutionError, SpecLoopAgent
from .provider import OpenAIResponsesProvider, ReasoningProvider
from .schemas import ReasonRequest, ReasonResponse


def create_app(
    settings: Settings | None = None,
    provider: ReasoningProvider | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    if provider is None and settings.openai_api_key:
        provider = OpenAIResponsesProvider(
            settings.openai_api_key,
            settings.model_timeout_seconds,
        )
    agent = SpecLoopAgent(settings, provider)
    limiter = FixedWindowRateLimiter(settings.requests_per_minute)
    concurrency = ConcurrencyGate(settings.max_concurrent_requests)
    app = FastAPI(
        title="SpecLoop Agent API",
        version="0.2.0",
        description="Evidence-grounded requirements clarification agent runtime",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins) or ["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def request_guards(request: Request, call_next):
        if request.url.path == "/api/reason":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 2 * 1024 * 1024:
                return JSONResponse({"error": "Request body exceeds 2 MB"}, status_code=413)
            origin = request.headers.get("origin")
            if settings.allowed_origins and origin not in settings.allowed_origins:
                return JSONResponse(
                    {"error": "Origin is not allowed to use the agent endpoint"},
                    status_code=403,
                )
        return await call_next(request)

    @app.get("/api/health")
    async def health():
        return {
            "available": provider is not None,
            "runtime": "python-fastapi",
            "model": settings.default_model,
            "models": {"small": settings.small_model, "large": settings.large_model},
            "pricingConfigured": settings.pricing_configured,
            "policyVersion": "risk-floor-v2",
            "guardrails": {
                "originRestricted": bool(settings.allowed_origins),
                "requestsPerMinute": settings.requests_per_minute,
                "maxConcurrentRequests": settings.max_concurrent_requests,
                "modelTimeoutMs": round(settings.model_timeout_seconds * 1_000),
            },
        }

    @app.post("/api/reason", response_model=ReasonResponse, response_model_by_alias=True)
    async def reason(payload: ReasonRequest, request: Request):
        client = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        client_key = client or (request.client.host if request.client else "unknown")
        allowed, remaining, retry_after = limiter.take(client_key)
        if not allowed:
            return JSONResponse(
                {"error": "Agent request rate limit exceeded"},
                status_code=429,
                headers={"Retry-After": str(retry_after)},
            )
        try:
            async with concurrency.enter():
                response = await agent.run(payload)
        except ConcurrencyError:
            return JSONResponse(
                {"error": "Agent service is at concurrency capacity"},
                status_code=503,
                headers={"Retry-After": "2"},
            )
        except AgentExecutionError as error:
            return JSONResponse(
                {
                    "error": "Agent execution failed",
                    "detail": str(error),
                    "run": error.run.model_dump(by_alias=True, mode="json", exclude_none=True),
                },
                status_code=error.status_code,
            )
        return JSONResponse(
            response.model_dump(by_alias=True, mode="json", exclude_none=True),
            headers={
                "X-RateLimit-Limit": str(settings.requests_per_minute),
                "X-RateLimit-Remaining": str(remaining),
            },
        )

    dist = Path(__file__).resolve().parent.parent / "dist"
    if dist.is_dir():
        app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
    return app


app = create_app()
