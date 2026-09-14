from __future__ import annotations

import os
from dataclasses import dataclass


def _positive_int(value: str | None, fallback: int) -> int:
    try:
        parsed = int(value or "")
    except ValueError:
        return fallback
    return parsed if parsed > 0 else fallback


def _price(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


@dataclass(frozen=True, slots=True)
class Settings:
    openai_api_key: str | None
    default_model: str
    small_model: str
    large_model: str
    allowed_origins: tuple[str, ...]
    requests_per_minute: int
    max_concurrent_requests: int
    model_timeout_seconds: float
    input_usd_per_million: float | None
    cached_input_usd_per_million: float | None
    output_usd_per_million: float | None
    host: str
    port: int

    @classmethod
    def from_env(cls) -> Settings:
        default_model = os.getenv("OPENAI_MODEL", "gpt-5-mini")
        origins = tuple(
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGIN", "").split(",")
            if origin.strip()
        )
        timeout_ms = _positive_int(os.getenv("MODEL_TIMEOUT_MS"), 30_000)
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY") or None,
            default_model=default_model,
            small_model=os.getenv("OPENAI_MODEL_SMALL", default_model),
            large_model=os.getenv("OPENAI_MODEL_LARGE", default_model),
            allowed_origins=origins,
            requests_per_minute=_positive_int(os.getenv("MAX_REQUESTS_PER_MINUTE"), 12),
            max_concurrent_requests=_positive_int(os.getenv("MAX_CONCURRENT_MODEL_REQUESTS"), 2),
            model_timeout_seconds=timeout_ms / 1_000,
            input_usd_per_million=_price(os.getenv("OPENAI_INPUT_USD_PER_1M")),
            cached_input_usd_per_million=_price(os.getenv("OPENAI_CACHED_INPUT_USD_PER_1M")),
            output_usd_per_million=_price(os.getenv("OPENAI_OUTPUT_USD_PER_1M")),
            host=os.getenv("HOST", "127.0.0.1"),
            port=_positive_int(os.getenv("PORT"), 8787),
        )

    @property
    def pricing_configured(self) -> bool:
        return all(
            value is not None
            for value in (
                self.input_usd_per_million,
                self.cached_input_usd_per_million,
                self.output_usd_per_million,
            )
        )
