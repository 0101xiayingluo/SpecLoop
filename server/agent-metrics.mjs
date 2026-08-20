function nonNegativeInteger(value) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0
}

function price(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function readPricing(environment) {
  const inputUsdPerMillion = price(environment.OPENAI_INPUT_USD_PER_1M)
  const cachedInputUsdPerMillion = price(environment.OPENAI_CACHED_INPUT_USD_PER_1M)
  const outputUsdPerMillion = price(environment.OPENAI_OUTPUT_USD_PER_1M)
  const configured = inputUsdPerMillion !== null && cachedInputUsdPerMillion !== null && outputUsdPerMillion !== null

  return {
    configured,
    inputUsdPerMillion,
    cachedInputUsdPerMillion,
    outputUsdPerMillion,
  }
}

export function normalizeUsage(usage = {}) {
  const inputTokens = nonNegativeInteger(usage.input_tokens)
  const cachedInputTokens = Math.min(
    inputTokens,
    nonNegativeInteger(usage.input_tokens_details?.cached_tokens),
  )
  const outputTokens = nonNegativeInteger(usage.output_tokens)
  const reasoningTokens = Math.min(
    outputTokens,
    nonNegativeInteger(usage.output_tokens_details?.reasoning_tokens),
  )

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: nonNegativeInteger(usage.total_tokens) || inputTokens + outputTokens,
  }
}

export function estimateCostUsd(usage, pricing) {
  if (!pricing.configured) return null
  const uncachedInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens)
  const total = (
    uncachedInputTokens * pricing.inputUsdPerMillion
    + usage.cachedInputTokens * pricing.cachedInputUsdPerMillion
    + usage.outputTokens * pricing.outputUsdPerMillion
  ) / 1_000_000
  return Number(total.toFixed(8))
}

export function createAgentRun({
  id,
  model,
  status,
  startedAt,
  completedAt,
  serverLatencyMs,
  requestId,
  usage: rawUsage,
  pricing,
  error,
}) {
  const usage = normalizeUsage(rawUsage)
  return {
    id,
    provider: 'openai',
    model,
    status,
    startedAt,
    completedAt,
    ...(requestId ? { requestId } : {}),
    ...usage,
    serverLatencyMs: Math.max(0, Math.round(serverLatencyMs)),
    clientLatencyMs: 0,
    estimatedCostUsd: estimateCostUsd(usage, pricing),
    pricingConfigured: pricing.configured,
    ...(error ? { error: error.slice(0, 800) } : {}),
  }
}
