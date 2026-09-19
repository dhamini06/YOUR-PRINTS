from typing import Tuple, Optional, Set
from app.domain.enums import RelationshipType, RelationshipConfidence, ObservationConfidence

# High-collision dictionary terms and generic handles that require corroboration
COMMON_DICTIONARY_USERNAMES: Set[str] = {
    "admin", "administrator", "root", "support", "help", "info", "contact",
    "test", "demo", "user", "staff", "sales", "office", "dev", "master",
    "alex", "john", "david", "michael", "chris", "sam", "max", "dan", "tom",
    "ben", "jack", "paul", "mark", "luke", "james", "robert", "william",
    "richard", "joseph", "thomas", "charles", "daniel", "matthew", "anthony",
    "donald", "steven", "andrew", "joshua", "brian", "kevin", "eric", "scott",
}


class ConfidenceEvaluator:
    """
    Epistemological Three-Tier Confidence Evaluation Engine.
    
    Determines relationship confidence without arbitrary arithmetic points,
    strictly distinguishing direct observations from inferred identity claims.
    """

    @staticmethod
    def is_dictionary_username(username: str) -> bool:
        """Checks if a username is a common dictionary name prone to false positives."""
        clean = username.strip().lower()
        return clean in COMMON_DICTIONARY_USERNAMES or len(clean) <= 3

    @classmethod
    def evaluate_account_match(
        cls,
        username: str,
        platform: str,
        target_email: str,
        target_domain: str,
        profile_display_name: Optional[str] = None,
        corroborating_name: Optional[str] = None,
        profile_website: Optional[str] = None,
    ) -> Tuple[RelationshipConfidence, str]:
        """
        Evaluates the confidence of linking a public platform account to the target email.
        
        Returns:
            Tuple of (RelationshipConfidence, forensic_rationale)
        """
        is_dictionary = cls.is_dictionary_username(username)
        has_name_match = False
        has_domain_match = False

        # 1. Check Display Name Corroboration
        if profile_display_name and corroborating_name:
            norm_p = profile_display_name.strip().lower()
            norm_c = corroborating_name.strip().lower()
            if norm_p and norm_c and (norm_p == norm_c or norm_p in norm_c or norm_c in norm_p):
                has_name_match = True

        # 2. Check Domain Back-link Corroboration
        if profile_website and target_domain:
            norm_w = profile_website.strip().lower()
            norm_d = target_domain.strip().lower()
            if norm_d in norm_w and norm_d not in {"gmail.com", "yahoo.com", "outlook.com", "proton.me", "protonmail.com"}:
                has_domain_match = True

        # 3. Rule-Based Epistemological Classification
        if is_dictionary:
            if has_name_match or has_domain_match:
                corroboration_reasons = []
                if has_name_match:
                    corroboration_reasons.append(f"display name match ('{profile_display_name}')")
                if has_domain_match:
                    corroboration_reasons.append(f"profile website back-link to domain '{target_domain}'")
                reasons_str = " and ".join(corroboration_reasons)
                return (
                    RelationshipConfidence.STRONG_MATCH,
                    f"Username '{username}' is a common term, but match is corroborated by {reasons_str}.",
                )
            else:
                return (
                    RelationshipConfidence.WEAK_SIGNAL,
                    f"Username '{username}' matches on {platform}, but is classified as a weak signal due to high collision probability on dictionary/short handles.",
                )

        # Non-dictionary username
        if has_name_match or has_domain_match:
            corroboration_reasons = []
            if has_name_match:
                corroboration_reasons.append(f"display name matching '{profile_display_name}'")
            if has_domain_match:
                corroboration_reasons.append(f"profile website referencing target domain '{target_domain}'")
            reasons_str = " and ".join(corroboration_reasons)
            return (
                RelationshipConfidence.STRONG_MATCH,
                f"Username '{username}' on {platform} is supported by independent corroboration ({reasons_str}).",
            )
        else:
            return (
                RelationshipConfidence.POSSIBLE_MATCH,
                f"Unique username '{username}' exists on {platform}. Direct email linkage is unverified; treat as an inferred candidate.",
            )

    @classmethod
    def evaluate_infrastructure_link(
        cls,
        rel_type: RelationshipType,
        source_label: str,
        target_label: str,
    ) -> Tuple[RelationshipConfidence, str]:
        """
        Evaluates technical infrastructure connections (MX records, DNS hosting).
        """
        if rel_type in (RelationshipType.PROVIDED_BY, RelationshipType.HOSTED_ON):
            return (
                RelationshipConfidence.CONFIRMED_ASSOCIATION,
                f"Directly verified via authoritative DNS/RDAP records connecting {source_label} to {target_label}.",
            )
        return (
            RelationshipConfidence.POSSIBLE_MATCH,
            f"Technical connection observed between {source_label} and {target_label}.",
        )
