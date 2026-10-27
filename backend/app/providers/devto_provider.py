import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class DevtoProvider(BaseProvider):
    """
    Dev.to Public Developer Profile & Community Inspector.
    
    Queries the official Forem / Dev.to REST API for developer profiles matching
    a candidate username seed, extracting public name, bio, profile image, and external site.
    """

    @property
    def provider_id(self) -> str:
        return "provider-devto"

    @property
    def display_name(self) -> str:
        return "Dev.to Developer Profile Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["username", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        # If pivot is email, derive username from local part
        username = pivot_value.split("@")[0].strip() if "@" in pivot_value else pivot_value.strip()

        if not username or len(username) > 100:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                error_message="Invalid username format for Dev.to query.",
            )

        url = f"https://dev.to/api/users/by_username?url={username}"
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
                    error_message=f"Dev.to API rate limited (HTTP {response.status_code}). Respecting policy.",
                )

            if response.status_code == 404:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=404,
                    raw_payload={"username": username, "found": False},
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"Dev.to API returned HTTP status {response.status_code}",
                )

            data = response.json()
            if not isinstance(data, dict) or not data.get("username"):
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload={"username": username, "found": False},
                )

            extracted_signals: List[Dict[str, Any]] = []
            profile_url = f"https://dev.to/{username}"
            display_name = data.get("name") or username
            bio = data.get("summary") or ""
            website_url = data.get("website_url") or ""
            avatar_url = data.get("profile_image") or ""
            joined_at = data.get("joined_at") or ""
            location = data.get("location") or ""

            extracted_signals.append({
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "Dev.to",
                "username": username,
                "display_name": display_name,
                "profile_url": profile_url,
                "avatar_url": avatar_url,
                "bio": bio,
                "url": website_url,
                "location": location,
                "account_created_at": joined_at,
            })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload={"username": data.get("username"), "name": display_name},
                extracted_signals=extracted_signals,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"Dev.to API query timed out after {timeout_sec}s.",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"Dev.to provider failed: {str(e)}",
            )
