import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult
from app.config import settings


class GitHubProvider(BaseProvider):
    """
    GitHub Public Profile & Account Inspector.
    
    Queries the official GitHub REST API (v3) for public user profiles matching
    a derived username seed, extracting public metadata, bio, avatar, and linked website.
    """

    @property
    def provider_id(self) -> str:
        return "provider-github"

    @property
    def display_name(self) -> str:
        return "GitHub Public Profile Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["username", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        # If pivot is email, derive username from local part
        username = pivot_value.split("@")[0].strip() if "@" in pivot_value else pivot_value.strip()

        # Sanitize username (alphanumeric, single hyphens, max 39 chars per GitHub spec)
        if not username or len(username) > 39:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                error_message="Invalid username format for GitHub query.",
            )

        url = f"https://api.github.com/users/{username}"
        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/vnd.github.v3+json",
        }

        # Include GitHub token if configured (boosts rate limit from 60 to 5,000 req/hr)
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(url, headers=headers)

            if response.status_code == 404:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=404,
                    raw_payload={"username": username, "found": False},
                )

            # Check rate limiting
            if response.status_code == 403 or response.status_code == 429:
                remaining = response.headers.get("x-ratelimit-remaining")
                reset_time = response.headers.get("x-ratelimit-reset")
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=response.status_code,
                    error_message=f"GitHub API rate limited (Remaining: {remaining}, Reset: {reset_time}). Respecting policy.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"GitHub API returned HTTP status {response.status_code}",
                )

            data = response.json()
            extracted_signals: List[Dict[str, Any]] = []

            # Extract public profile signals
            profile_url = data.get("html_url") or f"https://github.com/{username}"
            display_name = data.get("name") or username
            bio = data.get("bio") or ""
            company = data.get("company") or ""
            blog = data.get("blog") or ""
            avatar_url = data.get("avatar_url") or ""
            created_at = data.get("created_at") or ""
            public_repos = data.get("public_repos", 0)

            extracted_signals.append({
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "GitHub",
                "username": username,
                "display_name": display_name,
                "profile_url": profile_url,
                "avatar_url": avatar_url,
                "bio": bio,
                "company": company,
                "public_repos": public_repos,
                "account_created_at": created_at,
            })

            # If user has listed a public blog/domain on GitHub
            if blog:
                extracted_signals.append({
                    "signal_type": "DERIVED_WEBSITE",
                    "url": blog,
                    "source": "GitHub Profile Blog Field",
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
                error_message=f"GitHub query timed out after {timeout_sec}s",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"GitHub query error: {str(e)}",
            )
