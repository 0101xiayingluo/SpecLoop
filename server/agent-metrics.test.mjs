import { describe, expect, it } from 'vitest'
import { createAgentRun, estimateCostUsd, normalizeUsage, readPricing } from './agent-metrics.mjs'

describe('agent run metrics', () => {
  it('normalizes provider usage and estimates cached-token-aware cost', () => {
    const usage = normalizeUsage({
      input_tokens: 1_000,
      input_tokens_details: { cached_tokens: 400 },
      output_tokens: 200,
      output_tokens_details: { reasoning_tokens: 50 },
      total_tokens: 1_200,
    })
    const pricing = readPricing({
      OPENAI_INPUT_USD_PER_1M: '2',
      OPENAI_CACHED_INPUT_USD_PER_1M: '0.5',
      OPENAI_OUTPUT_USD_PER_1M: '8',
    })

    expect(usage).toEqual({
      inputTokens: 1_000,
      cachedInputTokens: 400,
      outputTokens: 200,
      reasoningTokens: 50,
      totalTokens: 1_200,
    })
    expect(estimateCostUsd(usage, pricing)).toBe(0.003)
  })

  it('reports cost as unavailable when pricing is not configured', () => {
    const pricing = readPricing({})
    const run = createAgentRun({
      id: 'resp-test',
      model: 'test-model',
      status: 'succeeded',
      startedAt: '2026-08-20T00:00:00.000Z',
      completedAt: '2026-08-20T00:00:01.000Z',
      serverLatencyMs: 1_000,
      usage: { input_tokens: 10, output_tokens: 5 },
      pricing,
    })

    expect(run.estimatedCostUsd).toBeNull()
    expect(run.pricingConfigured).toBe(false)
    expect(run.totalTokens).toBe(15)
  })
})
