import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class HackerNewsProvider(BaseProvider):
    """
    Hacker News Public Profile & Identity Inspector.
    
    Queries the official Firebase REST API for Hacker News user profiles matching
    a candidate username seed, extracting karma, about statement, and account creation date.
    """

    @property
    def provider_id(self) -> str:
        return "provider-hackernews"

    @property
    def display_name(self) -> str:
        return "Hacker News Public Identity Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["username", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        # If pivot is email, derive username from local part
        username = pivot_value.split("@")[0].strip() if "@" in pivot_value else pivot_value.strip()

        # Sanitize username (alphanumeric, underscores, hyphens)
        if not username or len(username) > 100:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                error_message="Invalid username format for Hacker News query.",
            )

        url = f"https://hacker-news.firebaseio.com/v0/user/{username}.json"
        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(url, headers=headers)

            if response.status_code == 429 or response.status_code == 403:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=response.status_code,
                    error_message=f"Hacker News API rate limited (HTTP {response.status_code}). Respecting policy.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"Hacker News API returned HTTP status {response.status_code}",
                )

            # Hacker News returns `null` JSON for non-existent users
            text = (response.text or "").strip()
            if not text or text == "null":
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload={"username": username, "found": False},
                )

            try:
                data = response.json()
            except Exception:
                data = None

            if not data or not isinstance(data, dict) or not data.get("id"):
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload={"username": username, "found": False},
                )

            extracted_signals: List[Dict[str, Any]] = []
            profile_url = f"https://news.ycombinator.com/user?id={username}"
            about = data.get("about") or ""
            karma = data.get("karma", 0)
            created = data.get("created", "")

            extracted_signals.append({
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "Hacker News",
                "username": username,
                "display_name": username,
                "profile_url": profile_url,
                "avatar_url": "",
                "bio": about,
                "karma": karma,
                "account_created_at": str(created) if created else "",
            })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload={"id": data.get("id"), "karma": karma, "created": created},
                extracted_signals=extracted_signals,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"Hacker News API query timed out after {timeout_sec}s.",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"Hacker News provider failed: {str(e)}",
            )
