export function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function createFixedWindowLimiter({ limit, windowMs }) {
  const buckets = new Map()

  return {
    take(key, now = Date.now()) {
      const current = buckets.get(key)
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
      }
      if (current.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
        }
      }
      current.count += 1
      return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 }
    },
  }
}
