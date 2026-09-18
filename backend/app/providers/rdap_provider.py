import httpx
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult


class RDAPProvider(BaseProvider):
    """
    ICANN Registration Data Access Protocol (RDAP) Inspector.
    
    Queries authoritative RDAP endpoints to discover domain registrar,
    nameservers, creation/expiration dates, and domain lifecycle status.
    """

    @property
    def provider_id(self) -> str:
        return "provider-rdap"

    @property
    def display_name(self) -> str:
        return "ICANN RDAP Domain Registry Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["domain", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        domain = pivot_value.split("@")[-1].strip().lower() if "@" in pivot_value else pivot_value.strip().lower()

        # Free webmail domains (gmail, outlook, yahoo, proton) don't need individual domain RDAP queries in email context
        FREE_MAIL_DOMAINS = {"gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "proton.me", "protonmail.com", "icloud.com"}
        if domain in FREE_MAIL_DOMAINS and pivot_type == "email":
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.SUCCESS,
                status_code=200,
                raw_payload={"domain": domain, "note": "Major public email service provider"},
                extracted_signals=[{
                    "signal_type": "PUBLIC_MAIL_PROVIDER",
                    "domain": domain,
                    "service_class": "Major Public Webmail",
                }],
            )

        url = f"https://rdap.org/domain/{domain}"
        headers = {
            "User-Agent": "YOUR-PRINTS-Intelligence-Engine/0.1 (+https://github.com/dhamini06/YOUR-PRINTS)",
            "Accept": "application/rdap+json, application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)

            if response.status_code == 404:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.NO_RESULTS,
                    status_code=404,
                    raw_payload={"domain": domain, "found": False},
                )

            if response.status_code == 429:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.RATE_LIMITED,
                    status_code=429,
                    error_message="RDAP registry rate limit reached.",
                )

            if response.status_code != 200:
                return ProviderResult(
                    provider_id=self.provider_id,
                    status=ProviderStatus.UNAVAILABLE,
                    status_code=response.status_code,
                    error_message=f"RDAP registry returned HTTP status {response.status_code}",
                )

            data = response.json()
            extracted_signals: List[Dict[str, Any]] = []

            # 1. Registrar Extraction
            registrar_name = ""
            entities = data.get("entities") or []
            for ent in entities:
                roles = ent.get("roles") or []
                if "registrar" in roles:
                    vcard_array = ent.get("vcardArray")
                    if vcard_array and len(vcard_array) > 1:
                        for item in vcard_array[1]:
                            if item[0] == "fn":
                                registrar_name = item[3]
                                break
                    if not registrar_name:
                        registrar_name = ent.get("handle") or ""

            if registrar_name:
                extracted_signals.append({
                    "signal_type": "DOMAIN_REGISTRAR",
                    "domain": domain,
                    "registrar_name": registrar_name,
                })

            # 2. Domain Events (Creation, Expiration)
            events = data.get("events") or []
            for ev in events:
                action = ev.get("eventAction")
                event_date = ev.get("eventDate")
                if action and event_date:
                    extracted_signals.append({
                        "signal_type": "DOMAIN_EVENT",
                        "domain": domain,
                        "action": action,
                        "event_date": event_date,
                    })

            # 3. Nameservers
            nameservers = data.get("nameservers") or []
            for ns in nameservers:
                ns_name = ns.get("ldhName") or ns.get("handle")
                if ns_name:
                    extracted_signals.append({
                        "signal_type": "DOMAIN_NAMESERVER",
                        "domain": domain,
                        "nameserver": ns_name.lower(),
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
                error_message=f"RDAP query timed out after {timeout_sec}s for domain {domain}",
            )
        except Exception as e:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.ERROR,
                error_message=f"RDAP query error: {str(e)}",
            )
