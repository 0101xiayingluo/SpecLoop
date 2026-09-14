from .schemas import Complexity, ExecutionMode


def decide_execution_mode(
    complexity: Complexity,
    *,
    provider_available: bool,
    schema_valid: bool,
    grounding_integrity: float,
    trace_faithfulness: float,
) -> ExecutionMode:
    if complexity == "simple":
        return "deterministic"
    guards_pass = (
        provider_available
        and schema_valid
        and grounding_integrity == 1
        and trace_faithfulness == 1
    )
    if not guards_pass:
        return "manual-review" if complexity == "high-risk" else "deterministic-review"
    return "model-assisted-review" if complexity == "high-risk" else "model-assisted"
