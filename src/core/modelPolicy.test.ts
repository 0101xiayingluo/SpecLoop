import { describe, expect, it } from 'vitest'
import { decideExecutionMode } from './modelPolicy'

const passingSignals = {
  providerAvailable: true,
  schemaValid: true,
  groundingIntegrity: 1,
  traceFaithfulness: 1,
}

describe('model capability boundaries', () => {
  it('keeps simple work deterministic even when a model is available', () => {
    expect(decideExecutionMode('simple', passingSignals)).toBe('deterministic')
  })

  it('degrades complex work to a reviewable deterministic result', () => {
    expect(decideExecutionMode('complex', { ...passingSignals, providerAvailable: false })).toBe('deterministic-review')
  })

  it('sends high-risk work directly to manual review when any hard guard fails', () => {
    expect(decideExecutionMode('high-risk', { ...passingSignals, groundingIntegrity: 0.99 })).toBe('manual-review')
    expect(decideExecutionMode('high-risk', passingSignals)).toBe('model-assisted-review')
  })
})
