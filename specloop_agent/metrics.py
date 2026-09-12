from __future__ import annotations

from .config import Settings
from .schemas import Usage


def normalize_usage(raw_usage: object | None) -> Usage:
    if raw_usage is None:
        return Usage()

    def value(name: str) -> int:
        raw = getattr(raw_usage, name, 0)
        return max(0, round(raw if isinstance(raw, (int, float)) else 0))

    input_tokens = value("input_tokens")
    output_tokens = value("output_tokens")
    input_details = getattr(raw_usage, "input_tokens_details", None)
    output_details = getattr(raw_usage, "output_tokens_details", None)
    cached = min(input_tokens, _detail_value(input_details, "cached_tokens"))
    reasoning = min(output_tokens, _detail_value(output_details, "reasoning_tokens"))
    return Usage(
        input_tokens=input_tokens,
        cached_input_tokens=cached,
        output_tokens=output_tokens,
        reasoning_tokens=reasoning,
        total_tokens=value("total_tokens") or input_tokens + output_tokens,
    )


def estimate_cost_usd(usage: Usage, settings: Settings) -> float | None:
    if not settings.pricing_configured:
        return None
    uncached = max(0, usage.input_tokens - usage.cached_input_tokens)
    total = (
        uncached * float(settings.input_usd_per_million)
        + usage.cached_input_tokens * float(settings.cached_input_usd_per_million)
        + usage.output_tokens * float(settings.output_usd_per_million)
    ) / 1_000_000
    return round(total, 8)


def _detail_value(details: object | None, name: str) -> int:
    raw = getattr(details, name, 0) if details is not None else 0
    return max(0, round(raw if isinstance(raw, (int, float)) else 0))
