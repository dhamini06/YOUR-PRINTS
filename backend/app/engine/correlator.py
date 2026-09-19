from typing import List, Dict, Tuple, Optional, Any
from app.domain.enums import EntityType, RelationshipType, RelationshipConfidence
from app.domain.confidence import ConfidenceEvaluator
from app.engine.normalizer import NormalizedEntityItem


class CorrelatedEdge:
    def __init__(
        self,
        source_canonical: str,
        target_canonical: str,
        relationship_type: RelationshipType,
        confidence: RelationshipConfidence,
        inference_rationale: str,
        evidence_data: Any,
    ):
        self.source_canonical = source_canonical
        self.target_canonical = target_canonical
        self.relationship_type = relationship_type
        self.confidence = confidence
        self.inference_rationale = inference_rationale
        self.evidence_data = evidence_data


class GraphCorrelator:
    """
    Correlates normalized entities into a structured intelligence graph,
    applying epistemological confidence rules to every edge.
    """

    @classmethod
    def correlate_investigation_graph(
        cls,
        target_email: str,
        target_domain: str,
        derived_local_part: str,
        entities: List[NormalizedEntityItem],
    ) -> List[CorrelatedEdge]:
        edges: List[CorrelatedEdge] = []
        entity_map = {e.canonical_value: e for e in entities}

        # Find corroborating names across profiles (e.g. Gravatar display name)
        corroborating_name: Optional[str] = None
        for e in entities:
            if e.entity_type == EntityType.PUBLIC_ACCOUNT and e.attributes.get("platform") == "Gravatar":
                corroborating_name = e.attributes.get("display_name")
                if corroborating_name:
                    break

        # 1. Connect Target Email to Domain (if domain entity exists or implied)
        for e in entities:
            if e.entity_type == EntityType.DOMAIN:
                edges.append(
                    CorrelatedEdge(
                        source_canonical=target_email,
                        target_canonical=e.canonical_value,
                        relationship_type=RelationshipType.HOSTED_ON,
                        confidence=RelationshipConfidence.CONFIRMED_ASSOCIATION,
                        inference_rationale=f"Target email address domain root resolves to mail server '{e.canonical_value}'.",
                        evidence_data=e.evidence,
                    )
                )

            elif e.entity_type == EntityType.ORGANIZATION:
                edges.append(
                    CorrelatedEdge(
                        source_canonical=target_email,
                        target_canonical=e.canonical_value,
                        relationship_type=RelationshipType.PROVIDED_BY,
                        confidence=RelationshipConfidence.CONFIRMED_ASSOCIATION,
                        inference_rationale=f"Email delivery infrastructure for '{target_email}' is operated by '{e.canonical_value}'.",
                        evidence_data=e.evidence,
                    )
                )

            elif e.entity_type == EntityType.USERNAME:
                # Target Email -> Derived Username
                edges.append(
                    CorrelatedEdge(
                        source_canonical=target_email,
                        target_canonical=e.canonical_value,
                        relationship_type=RelationshipType.ASSOCIATED_WITH,
                        confidence=RelationshipConfidence.CONFIRMED_ASSOCIATION,
                        inference_rationale=f"Handle '@{e.canonical_value}' directly derived from target email prefix '{derived_local_part}'.",
                        evidence_data=e.evidence,
                    )
                )

            elif e.entity_type == EntityType.PUBLIC_ACCOUNT:
                platform = e.attributes.get("platform", "")
                uname = e.attributes.get("username") or derived_local_part

                if platform == "Gravatar":
                    # Direct email hash link -> Confirmed Association
                    edges.append(
                        CorrelatedEdge(
                            source_canonical=target_email,
                            target_canonical=e.canonical_value,
                            relationship_type=RelationshipType.POSSIBLE_ACCOUNT,
                            confidence=RelationshipConfidence.CONFIRMED_ASSOCIATION,
                            inference_rationale=f"Direct 1:1 match verified via SHA-256 email hash on Gravatar.",
                            evidence_data=e.evidence,
                        )
                    )
                else:
                    # Inferred platform account (GitHub, Keybase)
                    p_name = e.attributes.get("display_name")
                    p_website = e.attributes.get("url")
                    conf, rationale = ConfidenceEvaluator.evaluate_account_match(
                        username=uname,
                        platform=platform,
                        target_email=target_email,
                        target_domain=target_domain,
                        profile_display_name=p_name,
                        corroborating_name=corroborating_name,
                        profile_website=p_website,
                    )
                    # Connect Derived Username -> Public Account
                    edges.append(
                        CorrelatedEdge(
                            source_canonical=uname,
                            target_canonical=e.canonical_value,
                            relationship_type=RelationshipType.POSSIBLE_ACCOUNT,
                            confidence=conf,
                            inference_rationale=rationale,
                            evidence_data=e.evidence,
                        )
                    )

            elif e.entity_type == EntityType.WEB_REFERENCE:
                # Connect to related account or target
                edges.append(
                    CorrelatedEdge(
                        source_canonical=target_email,
                        target_canonical=e.canonical_value,
                        relationship_type=RelationshipType.REFERENCES,
                        confidence=RelationshipConfidence.STRONG_MATCH,
                        inference_rationale=f"External reference/proof linked to discovered investigation entities.",
                        evidence_data=e.evidence,
                    )
                )

        return edges
