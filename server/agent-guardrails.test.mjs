import { describe, expect, it } from 'vitest'
import { createFixedWindowLimiter, positiveInteger } from './agent-guardrails.mjs'

describe('agent server guardrails', () => {
  it('uses safe positive integer fallbacks', () => {
    expect(positiveInteger('12', 5)).toBe(12)
    expect(positiveInteger('0', 5)).toBe(5)
    expect(positiveInteger('invalid', 5)).toBe(5)
  })

  it('limits repeated requests and resets after the window', () => {
    const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 60_000 })

    expect(limiter.take('client-a', 1_000)).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.take('client-a', 2_000)).toMatchObject({ allowed: true, remaining: 0 })
    expect(limiter.take('client-a', 3_000)).toMatchObject({ allowed: false, retryAfterSeconds: 58 })
    expect(limiter.take('client-b', 3_000)).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.take('client-a', 61_000)).toMatchObject({ allowed: true, remaining: 1 })
  })
})
