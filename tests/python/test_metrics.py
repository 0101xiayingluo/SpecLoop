from types import SimpleNamespace

from specloop_agent.metrics import estimate_cost_usd, normalize_usage


def test_usage_and_cached_token_cost_are_normalized(settings):
    usage = normalize_usage(
        SimpleNamespace(
            input_tokens=1_000,
            input_tokens_details=SimpleNamespace(cached_tokens=400),
            output_tokens=200,
            output_tokens_details=SimpleNamespace(reasoning_tokens=50),
            total_tokens=1_200,
        )
    )

    assert usage.model_dump() == {
        "input_tokens": 1_000,
        "cached_input_tokens": 400,
        "output_tokens": 200,
        "reasoning_tokens": 50,
        "total_tokens": 1_200,
    }
    assert estimate_cost_usd(usage, settings) == 0.003
