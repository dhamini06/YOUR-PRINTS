from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.domain.enums import EntityType, ObservationConfidence
from app.providers.base import ProviderResult


class NormalizedEvidenceData(BaseModel):
    source_label: str
    source_url: Optional[str] = None
    discovery_method: str
    observation_confidence: ObservationConfidence
    observed_value: str
    rationale: str


class NormalizedEntityItem(BaseModel):
    canonical_value: str
    entity_type: EntityType
    display_label: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    evidence: NormalizedEvidenceData


class DiscoveredPivot(BaseModel):
    pivot_type: str  # "username", "domain"
    pivot_value: str
    source_provider: str


class NormalizationResult(BaseModel):
    entities: List[NormalizedEntityItem] = Field(default_factory=list)
    secondary_pivots: List[DiscoveredPivot] = Field(default_factory=list)


class SignalNormalizer:
    """
    Transforms raw heterogeneous provider payloads into standardized domain entities
    and extracts candidate secondary pivots for bounded correlation.
    """

    @classmethod
    def normalize_provider_result(
        cls,
        result: ProviderResult,
        target_email: str,
        target_domain: str,
    ) -> NormalizationResult:
        res = NormalizationResult()
        if not result.extracted_signals:
            return res

        prov_id = result.provider_id

        for signal in result.extracted_signals:
            sig_type = signal.get("signal_type")

            # 1. DNS: Mail Exchanger & Organization
            if sig_type == "MAIL_EXCHANGER":
                exchange = signal.get("exchange_host", "")
                pref = signal.get("preference", 10)
                if exchange:
                    res.entities.append(
                        NormalizedEntityItem(
                            canonical_value=exchange,
                            entity_type=EntityType.DOMAIN,
                            display_label=f"MX: {exchange} (Pref: {pref})",
                            attributes={"exchange": exchange, "preference": pref, "domain": target_domain},
                            evidence=NormalizedEvidenceData(
                                source_label="Authoritative DNS Nameserver",
                                source_url=None,
                                discovery_method="DNS_MX_LOOKUP",
                                observation_confidence=ObservationConfidence.DEFINITIVE,
                                observed_value=f"MX {pref} {exchange}",
                                rationale=f"Domain '{target_domain}' delegates mail reception to exchange host '{exchange}'.",
                            ),
                        )
                    )

            elif sig_type == "MAIL_ORGANIZATION":
                org_name = signal.get("organization_name", "")
                if org_name:
                    res.entities.append(
                        NormalizedEntityItem(
                            canonical_value=org_name,
                            entity_type=EntityType.ORGANIZATION,
                            display_label=org_name,
                            attributes={"organization": org_name, "domain": target_domain},
                            evidence=NormalizedEvidenceData(
                                source_label="DNS Mail Fingerprint Analyzer",
                                source_url=None,
                                discovery_method="FINGERPRINT_MATCH",
                                observation_confidence=ObservationConfidence.DEFINITIVE,
                                observed_value=org_name,
                                rationale=f"Mail servers for '{target_domain}' match fingerprint for '{org_name}'.",
                            ),
                        )
                    )

            # 2. RDAP: Registrar & Nameservers
            elif sig_type == "DOMAIN_REGISTRAR":
                reg_name = signal.get("registrar_name", "")
                if reg_name:
                    res.entities.append(
                        NormalizedEntityItem(
                            canonical_value=reg_name,
                            entity_type=EntityType.ORGANIZATION,
                            display_label=f"Registrar: {reg_name}",
                            attributes={"registrar": reg_name, "domain": target_domain},
                            evidence=NormalizedEvidenceData(
                                source_label="ICANN RDAP Registry",
                                source_url=f"https://rdap.org/domain/{target_domain}",
                                discovery_method="OFFICIAL_RDAP_API",
                                observation_confidence=ObservationConfidence.DEFINITIVE,
                                observed_value=reg_name,
                                rationale=f"Official ICANN RDAP registry records '{reg_name}' as the authoritative registrar for domain '{target_domain}'.",
                            ),
                        )
                    )

            # 3. Gravatar & Public Profiles
            elif sig_type == "PUBLIC_PROFILE":
                platform = signal.get("platform", "Gravatar")
                display_name = signal.get("display_name", "")
                avatar_url = signal.get("avatar_url", "")
                profile_url = signal.get("profile_url", "")
                bio = signal.get("bio", "")
                location = signal.get("location", "")

                res.entities.append(
                    NormalizedEntityItem(
                        canonical_value=profile_url or f"{platform}:{display_name}",
                        entity_type=EntityType.PUBLIC_ACCOUNT,
                        display_label=f"{platform} Profile: {display_name or target_email}",
                        attributes={
                            "platform": platform,
                            "display_name": display_name,
                            "avatar_url": avatar_url,
                            "profile_url": profile_url,
                            "bio": bio,
                            "location": location,
                        },
                        evidence=NormalizedEvidenceData(
                            source_label="Gravatar Profile Directory",
                            source_url=profile_url,
                            discovery_method="OFFICIAL_REST_API",
                            observation_confidence=ObservationConfidence.RELIABLE,
                            observed_value=f"{display_name} ({profile_url})",
                            rationale=f"Public profile matched the cryptographic SHA-256 hash of email '{target_email}'.",
                        ),
                    )
                )

            # 4. Discovered Usernames (for secondary fan-out)
            elif sig_type == "DERIVED_USERNAME":
                uname = signal.get("username", "")
                if uname and len(uname) >= 2:
                    res.entities.append(
                        NormalizedEntityItem(
                            canonical_value=uname,
                            entity_type=EntityType.USERNAME,
                            display_label=f"@{uname}",
                            attributes={"username": uname, "source": signal.get("source", "Email")},
                            evidence=NormalizedEvidenceData(
                                source_label=signal.get("source", "Email Target Prefix"),
                                source_url=None,
                                discovery_method="DERIVATION",
                                observation_confidence=ObservationConfidence.RELIABLE,
                                observed_value=uname,
                                rationale=f"Username handle derived from {signal.get('source', 'target email local part')}.",
                            ),
                        )
                    )
                    res.secondary_pivots.append(
                        DiscoveredPivot(
                            pivot_type="username",
                            pivot_value=uname,
                            source_provider=prov_id,
                        )
                    )

            # 5. GitHub & Keybase Accounts
            elif sig_type == "PUBLIC_ACCOUNT":
                platform = signal.get("platform", "")
                username = signal.get("username", "")
                display_name = signal.get("display_name", username)
                profile_url = signal.get("profile_url", "")
                avatar_url = signal.get("avatar_url", "")
                bio = signal.get("bio", "")

                res.entities.append(
                    NormalizedEntityItem(
                        canonical_value=f"{platform}:{username}",
                        entity_type=EntityType.PUBLIC_ACCOUNT,
                        display_label=f"{platform} Account: @{username}",
                        attributes={
                            "platform": platform,
                            "username": username,
                            "display_name": display_name,
                            "profile_url": profile_url,
                            "avatar_url": avatar_url,
                            "bio": bio,
                            "public_repos": signal.get("public_repos"),
                            "account_created_at": signal.get("account_created_at"),
                        },
                        evidence=NormalizedEvidenceData(
                            source_label=f"{platform} Official Public API",
                            source_url=profile_url,
                            discovery_method="OFFICIAL_REST_API",
                            observation_confidence=ObservationConfidence.RELIABLE,
                            observed_value=f"{platform} @{username} ({display_name})",
                            rationale=f"Public account discovered on {platform} matching derived username seed '{username}'.",
                        ),
                    )
                )

            # 6. Cryptographic Proofs (Keybase)
            elif sig_type == "CRYPTOGRAPHIC_PROOF":
                proof_type = signal.get("proof_type", "")
                nametag = signal.get("nametag", "")
                service_url = signal.get("service_url", "")

                res.entities.append(
                    NormalizedEntityItem(
                        canonical_value=f"proof:{proof_type}:{nametag}",
                        entity_type=EntityType.WEB_REFERENCE,
                        display_label=f"Verified Proof: {proof_type.capitalize()} ({nametag})",
                        attributes={"proof_type": proof_type, "nametag": nametag, "service_url": service_url},
                        evidence=NormalizedEvidenceData(
                            source_label="Keybase Cryptographic Proof Registry",
                            source_url=service_url,
                            discovery_method="CRYPTOGRAPHIC_PROOF",
                            observation_confidence=ObservationConfidence.DEFINITIVE,
                            observed_value=f"{proof_type}: {nametag}",
                            rationale=f"Cryptographically signed identity proof verified on Keybase for '{nametag}'.",
                        ),
                    )
                )

            # 7. Derived Websites
            elif sig_type == "DERIVED_WEBSITE":
                url = signal.get("url", "")
                if url:
                    res.entities.append(
                        NormalizedEntityItem(
                            canonical_value=url,
                            entity_type=EntityType.WEB_REFERENCE,
                            display_label=f"Website: {url}",
                            attributes={"url": url, "source": signal.get("source", "Profile")},
                            evidence=NormalizedEvidenceData(
                                source_label=signal.get("source", "Public Profile Blog Field"),
                                source_url=url,
                                discovery_method="PROFILE_METADATA",
                                observation_confidence=ObservationConfidence.RELIABLE,
                                observed_value=url,
                                rationale=f"Personal website URL referenced in public profile metadata.",
                            ),
                        )
                    )

        return res
