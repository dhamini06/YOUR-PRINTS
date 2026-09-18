import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class KeybaseProvider(BaseProvider):
    """
    Keybase Cryptographic Identity Proofs Inspector.
    
    Queries the official Keybase public API for cryptographically signed identity proofs
    linking usernames to verified Twitter/X, GitHub, Reddit, Hackernews, domains, and PGP keys.
    """

    @property
    def provider_id(self) -> str:
        return "provider-keybase"

    @property
    def display_name(self) -> str:
        return "Keybase Cryptographic Proof Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["username", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        username = pivot_value.split("@")[0].strip().lower() if "@" in pivot_value else pivot_value.strip().lower()

        if not username or len(username) > 30:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                error_message="Invalid username format for Keybase query.",
            )

        url = f"https://keybase.io/_/api/1.0/user/lookup.json?usernames={username}"
        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(url, headers=headers)

            if response.status_code == 429:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=429,
                    error_message="Keybase API rate limit reached.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"Keybase API returned HTTP status {response.status_code}",
                )

            data = response.json()
            them_list = data.get("them") or []

            if not them_list or them_list[0] is None:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload={"username": username, "found": False},
                )

            user_obj = them_list[0]
            extracted_signals: List[Dict[str, Any]] = []

            # 1. Keybase Profile Signal
            profile_data = user_obj.get("profile") or {}
            full_name = profile_data.get("full_name") or ""
            bio = profile_data.get("bio") or ""
            location = profile_data.get("location") or ""
            keybase_username = user_obj.get("basics", {}).get("username") or username

            extracted_signals.append({
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "Keybase",
                "username": keybase_username,
                "display_name": full_name or keybase_username,
                "profile_url": f"https://keybase.io/{keybase_username}",
                "bio": bio,
                "location": location,
            })

            # 2. Cryptographic Proofs (Linked Twitter, GitHub, HackerNews, Domains)
            proofs = user_obj.get("proofs_summary", {}).get("all") or []
            for proof in proofs:
                proof_type = proof.get("proof_type") or "unknown"
                nametag = proof.get("nametag") or ""
                service_url = proof.get("service_url") or ""
                state = proof.get("state")  # 1 = OK

                if state == 1 and nametag:
                    extracted_signals.append({
                        "signal_type": "CRYPTOGRAPHIC_PROOF",
                        "proof_type": proof_type,
                        "nametag": nametag,
                        "service_url": service_url,
                        "verified": True,
                    })

            # 3. PGP Public Keys
            public_keys = user_obj.get("public_keys", {}).get("primary") or {}
            key_fingerprint = public_keys.get("key_fingerprint")
            if key_fingerprint:
                extracted_signals.append({
                    "signal_type": "PGP_PUBLIC_KEY",
                    "fingerprint": key_fingerprint,
                })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload=user_obj,
                extracted_signals=extracted_signals,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"Keybase query timed out after {timeout_sec}s",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"Keybase query error: {str(e)}",
            )
