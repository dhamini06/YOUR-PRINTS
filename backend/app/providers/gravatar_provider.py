import hashlib
import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class GravatarProvider(BaseProvider):
    """
    Gravatar Public Identity & Avatar Inspector.
    
    Queries the official unauthenticated Gravatar v3 API using the cryptographic
    SHA-256 hash of the target email to discover public display names, avatars,
    bios, and verified platform accounts.
    """

    @property
    def provider_id(self) -> str:
        return "provider-gravatar"

    @property
    def display_name(self) -> str:
        return "Gravatar Public Profile Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        clean_email = pivot_value.strip().lower()
        email_hash = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
        url = f"https://api.gravatar.com/v3/profiles/{email_hash}"

        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(url, headers=headers)

            if response.status_code == 404:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=404,
                    raw_payload={"email_hash": email_hash, "found": False},
                )

            if response.status_code == 429:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=429,
                    error_message="Gravatar API rate limit reached. Respecting upstream quota.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"Gravatar API returned HTTP status {response.status_code}",
                )

            data = response.json()
            extracted_signals: List[Dict[str, Any]] = []

            # 1. Primary Public Profile Signal
            display_name = data.get("display_name") or data.get("preferred_username") or ""
            avatar_url = data.get("avatar_url") or f"https://www.gravatar.com/avatar/{email_hash}"
            bio = data.get("about_me") or ""
            location = data.get("location") or ""
            profile_url = data.get("profile_url") or f"https://gravatar.com/{email_hash}"

            extracted_signals.append({
                "signal_type": "PUBLIC_PROFILE",
                "platform": "Gravatar",
                "display_name": display_name,
                "avatar_url": avatar_url,
                "bio": bio,
                "location": location,
                "profile_url": profile_url,
                "email_hash": email_hash,
            })

            # 2. Derived Usernames & Linked Accounts
            preferred_username = data.get("preferred_username")
            if preferred_username:
                extracted_signals.append({
                    "signal_type": "DERIVED_USERNAME",
                    "username": preferred_username,
                    "source": "Gravatar Profile",
                })

            # Verified accounts array (e.g. github, twitter links)
            verified_accounts = data.get("verified_accounts") or []
            for acc in verified_accounts:
                service_type = acc.get("service_type") or "Unknown"
                service_url = acc.get("url") or ""
                service_label = acc.get("service_label") or service_type
                if service_url:
                    extracted_signals.append({
                        "signal_type": "LINKED_ACCOUNT",
                        "platform": service_label,
                        "account_url": service_url,
                        "verified": acc.get("is_hidden") is False,
                    })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload=data,
                extracted_signals=extracted_signals,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"Gravatar query timed out after {timeout_sec}s",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"Gravatar query error: {str(e)}",
            )
