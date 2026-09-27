"""
Phase 6 Tests:
  - SSRF guard (prohibited IP/hostname detection)
  - Rate limiter (sliding window, daily cap)
  - Target throttle cache (deduplication)
  - Opt-out API (register, conflict, check)
  - Data retention purge task
"""

import ipaddress
import time
import pytest
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient, ASGITransport
from sqlalchemy import select as sa_select

from app.main import app
from app.security.ssrf_guard import (
    validate_hostname_or_ip,
    validate_url,
    SSRFValidationError,
    is_ip_prohibited,
)
from app.security.rate_limit import SlidingWindowRateLimiter, TargetThrottleCache
from app.security.purge_task import run_purge
from app.domain.models import Investigation
from app.domain.enums import TargetType, InvestigationStatus
from tests.conftest import TestSessionLocal


# ─────────────────────────────────────────────────────────────────────────────
# SSRF Guard Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestSSRFGuard:
    def test_loopback_ipv4_is_prohibited(self):
        ip = ipaddress.ip_address("127.0.0.1")
        assert is_ip_prohibited(ip) is True

    def test_private_rfc1918_is_prohibited(self):
        for addr in ["10.0.0.1", "172.16.0.1", "192.168.1.1"]:
            assert is_ip_prohibited(ipaddress.ip_address(addr)) is True

    def test_link_local_is_prohibited(self):
        assert is_ip_prohibited(ipaddress.ip_address("169.254.169.254")) is True

    def test_public_ip_is_allowed(self):
        assert is_ip_prohibited(ipaddress.ip_address("1.1.1.1")) is False
        assert is_ip_prohibited(ipaddress.ip_address("8.8.8.8")) is False

    def test_loopback_ipv6_is_prohibited(self):
        assert is_ip_prohibited(ipaddress.ip_address("::1")) is True

    def test_direct_private_ip_blocked(self):
        with pytest.raises(SSRFValidationError, match="prohibited"):
            validate_hostname_or_ip("127.0.0.1")

    def test_direct_public_ip_allowed(self):
        # 1.1.1.1 is a known public IP — should not raise
        validate_hostname_or_ip("1.1.1.1")

    def test_invalid_url_scheme_blocked(self):
        with pytest.raises(SSRFValidationError, match="scheme"):
            validate_url("file:///etc/passwd")

    def test_valid_https_url_passes(self):
        scheme, host = validate_url("https://api.github.com/users/test")
        assert scheme == "https"
        assert host == "api.github.com"

    def test_ftp_scheme_blocked(self):
        with pytest.raises(SSRFValidationError, match="scheme"):
            validate_url("ftp://malicious.host/file")

    def test_no_hostname_blocked(self):
        with pytest.raises(SSRFValidationError):
            validate_url("https://")


# ─────────────────────────────────────────────────────────────────────────────
# Rate Limiter Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestRateLimiter:
    async def test_first_request_allowed(self):
        limiter = SlidingWindowRateLimiter(short_window_limit=4, long_window_limit=15)
        allowed, _ = await limiter.check("192.0.2.1")
        assert allowed is True

    async def test_short_window_limit_enforced(self):
        limiter = SlidingWindowRateLimiter(short_window_limit=3, long_window_limit=100)
        ip = "192.0.2.2"
        for _ in range(3):
            await limiter.record(ip)
        allowed, reason = await limiter.check(ip)
        assert allowed is False
        assert "Rate limit exceeded" in reason

    async def test_long_window_limit_enforced(self):
        limiter = SlidingWindowRateLimiter(
            short_window_seconds=1,
            short_window_limit=100,
            long_window_seconds=3600,
            long_window_limit=5,
        )
        ip = "192.0.2.3"
        for _ in range(5):
            await limiter.record(ip)
        allowed, reason = await limiter.check(ip)
        assert allowed is False
        assert "Daily limit" in reason

    async def test_different_ips_are_independent(self):
        limiter = SlidingWindowRateLimiter(short_window_limit=1, long_window_limit=100)
        await limiter.record("192.0.2.10")
        allowed_10, _ = await limiter.check("192.0.2.10")
        allowed_11, _ = await limiter.check("192.0.2.11")
        assert allowed_10 is False
        assert allowed_11 is True


# ─────────────────────────────────────────────────────────────────────────────
# Target Throttle Cache Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestTargetThrottleCache:
    async def test_no_cache_initially(self):
        cache = TargetThrottleCache(target_ttl_seconds=3600)
        result = await cache.get_cached("somehash")
        assert result is None

    async def test_cached_within_ttl(self):
        cache = TargetThrottleCache(target_ttl_seconds=3600)
        await cache.record("abc123", "inv-999")
        result = await cache.get_cached("abc123")
        assert result == "inv-999"

    async def test_expired_cache_returns_none(self):
        cache = TargetThrottleCache(target_ttl_seconds=1)
        await cache.record("expiredhash", "inv-888")
        time.sleep(1.1)
        result = await cache.get_cached("expiredhash")
        assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# Opt-Out API Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestOptOutAPI:
    async def test_register_opt_out_success(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/v1/opt-out", json={"email": "optout_user@example.com"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "opted_out"
        assert "opt-out registry" in data["message"]

    async def test_register_opt_out_invalid_email(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/v1/opt-out", json={"email": "not-an-email"})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_EMAIL"

    async def test_register_opt_out_duplicate_returns_409(self):
        email = "duplicate_optout@example.com"
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/v1/opt-out", json={"email": email})
            res = await client.post("/api/v1/opt-out", json={"email": email})
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "ALREADY_OPTED_OUT"

    async def test_check_opt_out_not_registered(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/opt-out/check", params={"email": "notregistered@example.com"})
        assert res.status_code == 200
        assert res.json()["status"] == "not_opted_out"

    async def test_check_opt_out_registered(self):
        email = "check_optout@example.com"
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/v1/opt-out", json={"email": email})
            res = await client.get("/api/v1/opt-out/check", params={"email": email})
        assert res.status_code == 200
        assert res.json()["status"] == "opted_out"

    async def test_opted_out_target_blocks_investigation(self):
        """An opted-out email must return 403 on investigation creation."""
        email = "blocked_target@example.com"
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/v1/opt-out", json={"email": email})
            res = await client.post(
                "/api/v1/investigations",
                json={"target": email, "target_type": "EMAIL"},
            )
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "TARGET_OPTED_OUT"


# ─────────────────────────────────────────────────────────────────────────────
# Data Retention Purge Tests (using shared in-memory test DB via override_get_db)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestPurgeTask:
    async def test_purge_deletes_expired_investigations(self):
        """Investigations with expires_at in the past should be deleted by run_purge."""
        async with TestSessionLocal() as db:
            inv = Investigation(
                target_value="expired@example.com",
                target_type=TargetType.EMAIL,
                status=InvestigationStatus.COMPLETED,
                current_stage="05_BUILDING_DIGITAL_FOOTPRINT",
                provider_states={},
                summary_stats={},
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            )
            db.add(inv)
            await db.commit()
            inv_id = inv.id

            deleted_count = await run_purge(db)
            assert deleted_count >= 1

            res = await db.execute(sa_select(Investigation).where(Investigation.id == inv_id))
            assert res.scalars().first() is None

    async def test_purge_preserves_fresh_investigations(self):
        """Investigations with expires_at in the future must NOT be deleted."""
        async with TestSessionLocal() as db:
            inv = Investigation(
                target_value="fresh@example.com",
                target_type=TargetType.EMAIL,
                status=InvestigationStatus.COMPLETED,
                current_stage="05_BUILDING_DIGITAL_FOOTPRINT",
                provider_states={},
                summary_stats={},
                expires_at=datetime.now(timezone.utc) + timedelta(hours=47),
            )
            db.add(inv)
            await db.commit()
            inv_id = inv.id

            await run_purge(db)

            res = await db.execute(sa_select(Investigation).where(Investigation.id == inv_id))
            fresh_inv = res.scalars().first()
            assert fresh_inv is not None

            # Clean up
            await db.delete(fresh_inv)
            await db.commit()

    async def test_purge_no_expired_returns_zero(self):
        """run_purge() with no expired records returns 0."""
        async with TestSessionLocal() as db:
            count = await run_purge(db)
        assert isinstance(count, int)
        assert count == 0
