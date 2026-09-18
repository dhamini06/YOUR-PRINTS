import asyncio
import dns.asyncresolver
import dns.resolver
from typing import List, Dict, Any, Optional
from app.domain.enums import ProviderStatus
from app.providers.base import BaseProvider, ProviderResult

# Known mail infrastructure fingerprints for evidence-based attribution
KNOWN_MAIL_PROVIDERS = {
    "google.com": "Google Workspace / Gmail",
    "googlemail.com": "Google Workspace / Gmail",
    "outlook.com": "Microsoft 365 / Exchange Online",
    "microsoft.com": "Microsoft 365 / Exchange Online",
    "pphosted.com": "Proofpoint Protection",
    "protonmail.ch": "Proton Mail (Encrypted)",
    "proton.me": "Proton Mail (Encrypted)",
    "messagingengine.com": "Fastmail",
    "zoho.com": "Zoho Mail",
    "zoho.eu": "Zoho Mail",
    "icloud.com": "Apple iCloud Mail",
    "mimecast.com": "Mimecast Security Gateway",
    "barracudanetworks.com": "Barracuda Email Security",
}


class DNSProvider(BaseProvider):
    """
    Asynchronous DNS & Mail Exchanger Inspector.
    
    Performs non-invasive DNS lookups (MX, TXT/SPF) to determine domain mail
    infrastructure, host organization, and verification signatures.
    """

    @property
    def provider_id(self) -> str:
        return "provider-dns"

    @property
    def display_name(self) -> str:
        return "DNS & Mail Infrastructure Inspector"

    @property
    def supported_pivots(self) -> List[str]:
        return ["domain", "email"]

    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 4.0) -> ProviderResult:
        # Extract domain from email if pivot is email
        domain = pivot_value.split("@")[-1].strip().lower() if "@" in pivot_value else pivot_value.strip().lower()

        resolver = dns.asyncresolver.Resolver()
        resolver.lifetime = timeout_sec
        resolver.timeout = timeout_sec

        mx_records: List[Dict[str, Any]] = []
        txt_records: List[str] = []
        identified_providers: List[str] = []

        # 1. Query MX Records
        try:
            mx_answers = await resolver.resolve(domain, "MX")
            for rdata in mx_answers:
                exchange_host = str(rdata.exchange).rstrip(".").lower()
                preference = int(rdata.preference)
                mx_records.append({"exchange": exchange_host, "preference": preference})

                # Check known provider fingerprints
                for fingerprint, provider_name in KNOWN_MAIL_PROVIDERS.items():
                    if fingerprint in exchange_host and provider_name not in identified_providers:
                        identified_providers.append(provider_name)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            pass
        except dns.exception.Timeout:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.TIMEOUT,
                error_message=f"DNS query timed out after {timeout_sec}s for domain {domain}",
            )
        except Exception as e:
            # Non-fatal DNS resolution error
            pass

        # 2. Query TXT Records (SPF / verification)
        try:
            txt_answers = await resolver.resolve(domain, "TXT")
            for rdata in txt_answers:
                txt_str = b"".join(rdata.strings).decode("utf-8", errors="replace")
                txt_records.append(txt_str)

                # Check SPF fingerprints for mail providers
                if "v=spf1" in txt_str:
                    for fingerprint, provider_name in KNOWN_MAIL_PROVIDERS.items():
                        if fingerprint in txt_str and provider_name not in identified_providers:
                            identified_providers.append(provider_name)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        except Exception:
            pass

        if not mx_records and not txt_records:
            return ProviderResult(
                provider_id=self.provider_id,
                status=ProviderStatus.NO_RESULTS,
                raw_payload={"domain": domain, "mx": [], "txt": []},
            )

        extracted_signals: List[Dict[str, Any]] = []

        # Signal for each MX record
        for mx in mx_records:
            extracted_signals.append({
                "signal_type": "MAIL_EXCHANGER",
                "exchange_host": mx["exchange"],
                "preference": mx["preference"],
                "domain": domain,
            })

        # Signal for identified infrastructure organizations
        for prov in identified_providers:
            extracted_signals.append({
                "signal_type": "MAIL_ORGANIZATION",
                "organization_name": prov,
                "domain": domain,
            })

        # Signal for SPF configuration
        spf_records = [t for t in txt_records if t.startswith("v=spf1")]
        if spf_records:
            extracted_signals.append({
                "signal_type": "SPF_RECORD",
                "raw_spf": spf_records[0],
                "domain": domain,
            })

        return ProviderResult(
            provider_id=self.provider_id,
            status=ProviderStatus.SUCCESS,
            status_code=200,
            raw_payload={
                "domain": domain,
                "mx_records": mx_records,
                "txt_records": txt_records,
                "identified_providers": identified_providers,
            },
            extracted_signals=extracted_signals,
        )
