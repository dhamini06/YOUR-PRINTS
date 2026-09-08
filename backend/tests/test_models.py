import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import Base
from app.domain.models import Investigation, RawSignal, Evidence, Entity, Relationship
from app.domain.enums import (
    TargetType,
    InvestigationStatus,
    EntityType,
    RelationshipType,
    ObservationConfidence,
    RelationshipConfidence,
)


@pytest.mark.asyncio
async def test_domain_models_creation():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Create an Investigation
        inv = Investigation(
            target_value="test@example.com",
            target_type=TargetType.EMAIL,
            status=InvestigationStatus.VALIDATING,
            current_stage="01_VALIDATING_TARGET",
        )
        session.add(inv)
        await session.flush()

        # Create RawSignal
        signal = RawSignal(
            investigation_id=inv.id,
            provider_id="provider-dns",
            query_type="DNS_MX",
            query_target="example.com",
            payload={"records": ["mail.example.com"]},
            payload_sha256="dummy_sha256_hash",
        )
        session.add(signal)
        await session.flush()

        # Create Evidence
        evidence = Evidence(
            raw_signal_id=signal.id,
            source_label="Cloudflare DNS Resolver",
            source_url="https://1.1.1.1",
            discovery_method="DNS_LOOKUP",
            observation_confidence=ObservationConfidence.DEFINITIVE,
            observed_value="mail.example.com",
            rationale="Domain resolves to mail server",
        )
        session.add(evidence)
        await session.flush()

        # Create Entities
        email_ent = Entity(
            investigation_id=inv.id,
            canonical_value="test@example.com",
            entity_type=EntityType.EMAIL_TARGET,
            display_label="test@example.com",
        )
        domain_ent = Entity(
            investigation_id=inv.id,
            canonical_value="example.com",
            entity_type=EntityType.DOMAIN,
            display_label="example.com",
        )
        session.add_all([email_ent, domain_ent])
        await session.flush()

        # Create Relationship
        rel = Relationship(
            investigation_id=inv.id,
            source_entity_id=email_ent.id,
            target_entity_id=domain_ent.id,
            relationship_type=RelationshipType.HOSTED_ON,
            confidence=RelationshipConfidence.CONFIRMED_ASSOCIATION,
            evidence_id=evidence.id,
            inference_rationale="Target email address domain root matches example.com",
        )
        session.add(rel)
        await session.commit()

        # Assertions
        assert inv.id is not None
        assert signal.id is not None
        assert evidence.id is not None
        assert email_ent.id is not None
        assert domain_ent.id is not None
        assert rel.id is not None
        assert rel.relationship_type == RelationshipType.HOSTED_ON
        assert rel.confidence == RelationshipConfidence.CONFIRMED_ASSOCIATION

    await test_engine.dispose()
