import json
import hashlib
from typing import Dict, List, Set, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.domain.models import (
    Investigation,
    RawSignal,
    Entity,
    Relationship,
    Evidence,
    utc_now,
)
from app.domain.enums import (
    InvestigationStatus,
    EntityType,
    ProviderStatus,
    ObservationConfidence,
)
from app.providers.registry import provider_registry
from app.engine.normalizer import SignalNormalizer, NormalizedEntityItem, DiscoveredPivot
from app.engine.correlator import GraphCorrelator


class InvestigationOrchestrator:
    """
    Core Pipeline Orchestrator executing the 5 deterministic investigation stages.
    """

    @classmethod
    async def execute_investigation(cls, investigation_id: str, db: AsyncSession) -> Investigation:
        # 1. Fetch Investigation
        stmt = (
            select(Investigation)
            .where(Investigation.id == investigation_id)
            .options(
                selectinload(Investigation.entities),
                selectinload(Investigation.relationships),
                selectinload(Investigation.raw_signals),
            )
        )
        res = await db.execute(stmt)
        inv = res.scalars().first()
        if not inv:
            raise ValueError(f"Investigation {investigation_id} not found.")

        target_email = inv.target_value
        local_part = target_email.split("@")[0]
        domain = target_email.split("@")[-1]

        # Stage 01: Target Validation (Already validated in API ingress)
        inv.status = InvestigationStatus.DISCOVERING
        inv.current_stage = "02_DISCOVERING_PUBLIC_SIGNALS"
        await db.flush()

        all_normalized_entities: List[NormalizedEntityItem] = []
        secondary_pivots_to_query: Set[str] = {local_part}
        provider_states: Dict[str, str] = {}
        raw_signal_map: Dict[str, str] = {}  # provider_id -> raw_signal_id

        # 2. Stage 02: Primary Signal Discovery (Email & Domain Pivots)
        primary_results = await provider_registry.execute_all_for_pivot("email", target_email)
        domain_results = await provider_registry.execute_all_for_pivot("domain", domain)

        for result in (primary_results + domain_results):
            provider_states[result.provider_id] = result.status.value

            # Save immutable RawSignal with SHA-256 payload hash
            payload_str = json.dumps(result.raw_payload or {}, sort_keys=True)
            payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

            raw_signal = RawSignal(
                investigation_id=inv.id,
                provider_id=result.provider_id,
                query_type="PRIMARY_PIVOT_LOOKUP",
                query_target=target_email if result.provider_id != "provider-rdap" else domain,
                http_status=result.status_code,
                payload=result.raw_payload or {},
                payload_sha256=payload_hash,
            )
            inv.raw_signals.append(raw_signal)
            db.add(raw_signal)
            await db.flush()
            raw_signal_map[result.provider_id] = raw_signal.id

            # Normalize signals
            normalized = SignalNormalizer.normalize_provider_result(
                result=result,
                target_email=target_email,
                target_domain=domain,
            )
            all_normalized_entities.extend(normalized.entities)
            for p in normalized.secondary_pivots:
                if p.pivot_type == "username" and len(p.pivot_value) >= 2:
                    secondary_pivots_to_query.add(p.pivot_value)

        # 3. Stage 03: Identity Correlation & Secondary Username Pivoting
        inv.status = InvestigationStatus.CORRELATING
        inv.current_stage = "03_CORRELATING_IDENTITIES"
        await db.flush()

        # Bounded query (max 2 username seeds) to respect rate limits
        queried_usernames = list(secondary_pivots_to_query)[:2]
        for uname in queried_usernames:
            sec_results = await provider_registry.execute_all_for_pivot("username", uname)
            for result in sec_results:
                provider_states[f"{result.provider_id}:{uname}"] = result.status.value

                payload_str = json.dumps(result.raw_payload or {}, sort_keys=True)
                payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

                raw_signal = RawSignal(
                    investigation_id=inv.id,
                    provider_id=result.provider_id,
                    query_type="SECONDARY_USERNAME_LOOKUP",
                    query_target=uname,
                    http_status=result.status_code,
                    payload=result.raw_payload or {},
                    payload_sha256=payload_hash,
                )
                inv.raw_signals.append(raw_signal)
                db.add(raw_signal)
                await db.flush()
                raw_signal_map[result.provider_id] = raw_signal.id

                normalized = SignalNormalizer.normalize_provider_result(
                    result=result,
                    target_email=target_email,
                    target_domain=domain,
                )
                all_normalized_entities.extend(normalized.entities)

        # 4. Stage 04: Exposure Analysis
        inv.status = InvestigationStatus.ANALYSING_EXPOSURE
        inv.current_stage = "04_ANALYSING_EXPOSURE"
        await db.flush()

        # 5. Stage 05: Building Digital Footprint & Graph Assembly
        inv.current_stage = "05_BUILDING_DIGITAL_FOOTPRINT"

        # Deduplicate and persist entities in DB
        entity_db_map: Dict[str, str] = {}  # canonical_value -> entity_id

        # Find existing root entity
        for ent in inv.entities:
            entity_db_map[ent.canonical_value] = ent.id

        for n_ent in all_normalized_entities:
            if n_ent.canonical_value not in entity_db_map:
                db_entity = Entity(
                    investigation_id=inv.id,
                    canonical_value=n_ent.canonical_value,
                    entity_type=n_ent.entity_type,
                    display_label=n_ent.display_label,
                    attributes=n_ent.attributes,
                )
                inv.entities.append(db_entity)
                db.add(db_entity)
                await db.flush()
                entity_db_map[n_ent.canonical_value] = db_entity.id

        # Correlate Graph Edges
        correlated_edges = GraphCorrelator.correlate_investigation_graph(
            target_email=target_email,
            target_domain=domain,
            derived_local_part=local_part,
            entities=all_normalized_entities,
        )

        confirmed_count = 0
        strong_count = 0
        possible_count = 0

        for edge in correlated_edges:
            src_id = entity_db_map.get(edge.source_canonical)
            tgt_id = entity_db_map.get(edge.target_canonical)

            if src_id and tgt_id and src_id != tgt_id:
                # Create Evidence Record
                ev_data = edge.evidence_data
                evidence = Evidence(
                    raw_signal_id=None,
                    source_label=ev_data.source_label if ev_data else "System Correlator",
                    source_url=ev_data.source_url if ev_data else None,
                    discovery_method=ev_data.discovery_method if ev_data else "CORRELATION",
                    observation_confidence=ev_data.observation_confidence if ev_data else ObservationConfidence.RELIABLE,
                    observed_value=ev_data.observed_value if ev_data else edge.inference_rationale,
                    rationale=ev_data.rationale if ev_data else edge.inference_rationale,
                )
                db.add(evidence)
                await db.flush()

                # Create Relationship
                relationship = Relationship(
                    investigation_id=inv.id,
                    source_entity_id=src_id,
                    target_entity_id=tgt_id,
                    relationship_type=edge.relationship_type,
                    confidence=edge.confidence,
                    evidence_id=evidence.id,
                    inference_rationale=edge.inference_rationale,
                )
                inv.relationships.append(relationship)
                db.add(relationship)

                if edge.confidence.value == "CONFIRMED_ASSOCIATION":
                    confirmed_count += 1
                elif edge.confidence.value == "STRONG_MATCH":
                    strong_count += 1
                elif edge.confidence.value == "POSSIBLE_MATCH":
                    possible_count += 1

        # Calculate final stats & status
        inv.provider_states = provider_states
        inv.summary_stats = {
            "total_entities": len(entity_db_map),
            "confirmed_links": confirmed_count,
            "strong_matches": strong_count,
            "possible_matches": possible_count,
            "exposure_count": 0,
        }

        # Terminal status evaluation
        successful_providers = [s for s in provider_states.values() if s in ("SUCCESS", "NO_RESULTS")]
        if len(successful_providers) == len(provider_states):
            inv.status = InvestigationStatus.COMPLETED
        elif len(successful_providers) > 0:
            inv.status = InvestigationStatus.PARTIALLY_COMPLETED
        else:
            inv.status = InvestigationStatus.FAILED

        inv.completed_at = utc_now()
        await db.commit()

        return inv


# Global orchestrator singleton
orchestrator = InvestigationOrchestrator()
