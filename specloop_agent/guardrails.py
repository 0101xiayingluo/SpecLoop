from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from time import monotonic


class FixedWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def take(self, key: str) -> tuple[bool, int, int]:
        now = monotonic()
        bucket = self._requests[key]
        while bucket and bucket[0] <= now - self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.limit:
            retry_after = max(1, round(self.window_seconds - (now - bucket[0])))
            return False, 0, retry_after
        bucket.append(now)
        return True, self.limit - len(bucket), 0


class ConcurrencyGate:
    def __init__(self, limit: int):
        self._limit = limit
        self._active = 0
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def enter(self):
        async with self._lock:
            if self._active >= self._limit:
                raise ConcurrencyError("Agent service is at concurrency capacity")
            self._active += 1
        try:
            yield
        finally:
            async with self._lock:
                self._active -= 1


class ConcurrencyError(RuntimeError):
    pass
