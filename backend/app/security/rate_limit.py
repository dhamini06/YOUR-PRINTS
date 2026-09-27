"""
Sliding-window in-memory rate limiter for investigation submission abuse prevention.

Strategy:
  - Per-IP limit  : max 4 investigations per 10 minutes
  - Per-IP daily  : max 15 investigations per 24 hours
  - Per-target    : if same email was investigated in the last 4 hours, return cached ID
  - Global        : max MAX_CONCURRENT_INVESTIGATIONS active pipeline tasks

All IP keys are stored as HMAC-SHA256 hashes to prevent logging raw IPs.
"""

import asyncio
import hashlib
import hmac
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional
from app.config import settings


_HMAC_KEY = b"your-prints-ip-salt"  # Static salting key; rotate via env in production


def _hash_ip(ip: str) -> str:
    """Return HMAC-SHA256 hash of an IP to avoid storing raw addresses."""
    return hmac.new(_HMAC_KEY, ip.encode(), hashlib.sha256).hexdigest()


class SlidingWindowRateLimiter:
    """
    Thread-safe (asyncio-safe) sliding window rate limiter backed purely by in-memory deques.
    No Redis dependency required for MVP.
    """

    def __init__(
        self,
        short_window_seconds: int = 600,       # 10 minutes
        short_window_limit: int = 4,
        long_window_seconds: int = 86400,      # 24 hours
        long_window_limit: int = 15,
    ) -> None:
        self.short_window_seconds = short_window_seconds
        self.short_window_limit = short_window_limit
        self.long_window_seconds = long_window_seconds
        self.long_window_limit = long_window_limit

        # ip_hash -> deque of timestamps (seconds since epoch)
        self._short: Dict[str, Deque[float]] = defaultdict(deque)
        self._long: Dict[str, Deque[float]] = defaultdict(deque)

        self._lock = asyncio.Lock()

    def _prune(self, dq: Deque[float], cutoff: float) -> None:
        while dq and dq[0] < cutoff:
            dq.popleft()

    async def check(self, client_ip: str) -> tuple[bool, str]:
        """
        Check whether the client IP is within rate limits.
        Returns (allowed: bool, reason: str).
        """
        ip_key = _hash_ip(client_ip)
        now = time.time()

        async with self._lock:
            short_dq = self._short[ip_key]
            long_dq = self._long[ip_key]

            self._prune(short_dq, now - self.short_window_seconds)
            self._prune(long_dq, now - self.long_window_seconds)

            if len(short_dq) >= self.short_window_limit:
                return False, (
                    f"Rate limit exceeded: {self.short_window_limit} investigations "
                    f"per {self.short_window_seconds // 60} minutes."
                )
            if len(long_dq) >= self.long_window_limit:
                return False, (
                    f"Daily limit exceeded: {self.long_window_limit} investigations per 24 hours."
                )
            return True, "ok"

    async def record(self, client_ip: str) -> None:
        """Record a new investigation attempt for the given IP."""
        ip_key = _hash_ip(client_ip)
        now = time.time()

        async with self._lock:
            self._short[ip_key].append(now)
            self._long[ip_key].append(now)


class TargetThrottleCache:
    """
    Prevents duplicate investigations of the same target email within a TTL window.
    If the same target hash was investigated within target_ttl_seconds, the cached
    investigation_id is returned instead of triggering a fresh pipeline run.
    """

    def __init__(self, target_ttl_seconds: int = 14400) -> None:
        """Default 4-hour deduplication window."""
        self.target_ttl_seconds = target_ttl_seconds
        # target_hash -> (investigation_id, timestamp)
        self._cache: Dict[str, tuple[str, float]] = {}
        self._lock = asyncio.Lock()

    async def get_cached(self, target_hash: str) -> Optional[str]:
        """Return the cached investigation ID if still within TTL, else None."""
        async with self._lock:
            if target_hash in self._cache:
                inv_id, ts = self._cache[target_hash]
                if time.time() - ts < self.target_ttl_seconds:
                    return inv_id
                del self._cache[target_hash]
        return None

    async def record(self, target_hash: str, investigation_id: str) -> None:
        """Cache a new investigation result for the target hash."""
        async with self._lock:
            self._cache[target_hash] = (investigation_id, time.time())


# Singleton instances shared across the app process
rate_limiter = SlidingWindowRateLimiter()
target_throttle = TargetThrottleCache()
