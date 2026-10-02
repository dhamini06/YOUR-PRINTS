import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class ExposureProvider(BaseProvider):
    """
    Public Exposure & Breach Catalog Inspector.
    
    Queries public data disclosure directories (XposedOrNot open API or optional
    commercial HaveIBeenPwned API) to detect whether the target email appears in
    publicly reported security incidents.
    
    Strict Privacy Discipline:
    Zero password hashes, cleartext secrets, or exploit records are ever requested
    or processed. Only breach incident labels, disclosure dates, and affected data
    classes (e.g. 'Email, Username') are recorded.
    """

    @property
    def provider_id(self) -> str:
        return "provider-exposure"

    @property
    def display_name(self) -> str:
        return "Public Exposure & Breach Catalog Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["exposure", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        clean_email = pivot_value.strip().lower()

        # If HIBP API key is present in environment, query HIBP
        if settings.HIBP_API_KEY:
            return await self._query_hibp(clean_email, timeout_sec)
        
        # Otherwise use free public community endpoint (XposedOrNot)
        return await self._query_xposedornot(clean_email, timeout_sec)

    async def _query_xposedornot(self, email: str, timeout_sec: float) -> ProviderResult:
        url = f"https://api.xposedornot.com/v1/check-email/{email}"
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
                    raw_payload={"email": email, "found": False, "breaches": []},
                    extracted_signals=[],
                )

            if response.status_code == 429:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=429,
                    error_message="Exposure catalog rate limit reached. Respecting upstream quota.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"Exposure catalog returned status {response.status_code}",
                )

            data = response.json()
            raw_breaches = data.get("breaches", [])
            breach_names: List[str] = []

            # XposedOrNot returns breaches nested e.g. [["Breach1", "Breach2"]] or ["Breach1"]
            if raw_breaches and isinstance(raw_breaches[0], list):
                breach_names = [str(b).strip() for b in raw_breaches[0] if b]
            elif isinstance(raw_breaches, list):
                breach_names = [str(b).strip() for b in raw_breaches if b]

            if not breach_names:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=200,
                    raw_payload=data,
                    extracted_signals=[],
                )

            extracted: List[Dict[str, Any]] = []
            for b_name in breach_names[:10]:  # Cap at 10 to keep dossier focused
                clean_title = b_name.replace("_", " ").title()
                extracted.append({
                    "signal_type": "EXPOSURE_EVENT",
                    "breach_name": b_name,
                    "breach_title": clean_title,
                    "breach_date": "Historical Disclosure",
                    "domain": "",
                    "compromised_data_classes": ["Email address", "Public account metadata"],
                    "description": f"Target email appeared in public disclosure catalog for incident '{clean_title}'.",
                    "source": "XposedOrNot Public Security Catalog",
                })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload={"email": email, "breach_count": len(breach_names), "breaches": breach_names},
                extracted_signals=extracted,
            )

        except httpx.TimeoutException:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"Exposure catalog timed out after {timeout_sec}s",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"Exposure query failed: {str(e)}",
            )

    async def _query_hibp(self, email: str, timeout_sec: float) -> ProviderResult:
        url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false"
        headers = {
            "hibp-api-key": settings.HIBP_API_KEY,
            "user-agent": "YOUR-PRINTS-Intelligence-Engine/0.1",
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
                    raw_payload={"email": email, "found": False, "breaches": []},
                )

            if response.status_code == 429:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=429,
                    error_message="HIBP API rate limit reached.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"HIBP API returned status {response.status_code}",
                )

            data = response.json()
            extracted: List[Dict[str, Any]] = []
            for item in data[:10]:
                b_name = item.get("Name", "Unknown")
                b_title = item.get("Title", b_name)
                b_date = item.get("BreachDate", "Unknown")
                data_classes = item.get("DataClasses", ["Email address"])
                domain = item.get("Domain", "")

                extracted.append({
                    "signal_type": "EXPOSURE_EVENT",
                    "breach_name": b_name,
                    "breach_title": b_title,
                    "breach_date": b_date,
                    "domain": domain,
                    "compromised_data_classes": data_classes,
                    "description": item.get("Description", ""),
                    "source": "HaveIBeenPwned Catalog",
                })

            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload={"email": email, "breaches": [item.get("Name") for item in data]},
                extracted_signals=extracted,
            )

        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"HIBP query error: {str(e)}",
            )
