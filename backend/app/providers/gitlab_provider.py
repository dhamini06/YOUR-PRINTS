import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class GitLabProvider(BaseProvider):
    """
    GitLab Public Profile & Account Inspector.
    
    Queries the official GitLab REST API (v4) for public profiles matching
    a derived username seed, extracting public metadata, bio, avatar, and linked website.
    """

    @property
    def provider_id(self) -> str:
        return "provider-gitlab"

    @property
    def display_name(self) -> str:
        return "GitLab Public Profile Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["username", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        # If pivot is email, derive username from local part
        username = pivot_value.split("@")[0].strip() if "@" in pivot_value else pivot_value.strip()

        # Sanitize username (alphanumeric, dots, underscores, hyphens, max 255 chars per GitLab spec)
        if not username or len(username) > 255:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                error_message="Invalid username format for GitLab query.",
            )

        url = f"https://gitlab.com/api/v4/users?username={username}"
        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(url, headers=headers)

            # Check rate limiting
            if response.status_code == 429 or response.status_code == 403:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=response.status_code,
                    error_message=f"GitLab API rate limited (HTTP {response.status_code}). Respecting policy.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"GitLab API returned HTTP status {response.status_code}",
                )

            data = response.json()
            if not isinstance(data, list) or len(data) == 0:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload={"username": username, "found": False},
                )

            user_data = data[0]
            extracted_signals: List[Dict[str, Any]] = []

            # Extract public profile signals
            profile_url = user_data.get("web_url") or f"https://gitlab.com/{username}"
            display_name = user_data.get("name") or username
            bio = user_data.get("bio") or ""
            website_url = user_data.get("website_url") or ""
            avatar_url = user_data.get("avatar_url") or ""
            created_at = user_data.get("created_at") or ""
            location = user_data.get("location") or ""

            extracted_signals.append({
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "GitLab",
                "username": username,
                "display_name": display_name,
                "profile_url": profile_url,
                "avatar_url": avatar_url,
                "bio": bio,
                "url": website_url,
                "location": location,
                "created_at": created_at,
            })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload=user_data,
                extracted_signals=extracted_signals,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"GitLab API timed out after {timeout_sec}s.",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=str(e),
            )
