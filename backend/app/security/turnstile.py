"""
Cloudflare Turnstile server-side token verification middleware.

When TURNSTILE_SECRET_KEY is configured, this module validates the token
submitted by the frontend before allowing an investigation to proceed.

When TURNSTILE_SECRET_KEY is empty (local dev / test), verification is bypassed.
This allows zero-friction local testing without modifying application logic.
"""

import httpx
from app.config import settings


TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile_token(token: str | None) -> tuple[bool, str]:
    """
    Verify a Cloudflare Turnstile token server-side.

    Returns:
        (True, "ok") if verification passes or if Turnstile is not configured.
        (False, reason) if verification fails.
    """
    # If no secret key configured, skip verification (local dev)
    if not settings.TURNSTILE_SECRET_KEY:
        return True, "turnstile_not_configured"

    if not token:
        return False, "Cloudflare Turnstile token is required for public submissions."

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                TURNSTILE_VERIFY_URL,
                data={
                    "secret": settings.TURNSTILE_SECRET_KEY,
                    "response": token,
                },
            )
            data = response.json()
            if data.get("success"):
                return True, "ok"
            error_codes = data.get("error-codes", [])
            return False, f"Turnstile verification failed: {', '.join(error_codes)}"

    except httpx.TimeoutException:
        # Do not block investigation if Turnstile is temporarily unreachable
        return True, "turnstile_timeout_bypass"
    except Exception as e:
        # Fail open — log but do not block
        return True, f"turnstile_exception_bypass: {str(e)}"
