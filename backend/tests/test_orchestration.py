import pytest
import respx
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import Base
from app.domain.models import Investigation, Entity, RawSignal, Evidence, Relationship
from app.domain.enums import (
    TargetType,
    InvestigationStatus,
    EntityType,
    RelationshipType,
    RelationshipConfidence,
    ProviderStatus,
)
from app.domain.confidence import ConfidenceEvaluator
from app.engine.normalizer import SignalNormalizer
from app.engine.correlator import GraphCorrelator
from app.engine.orchestrator import orchestrator
from app.providers.base import ProviderResult


# ==============================================================================
# 1. Confidence Evaluator Unit Tests
# ==============================================================================

def test_confidence_dictionary_penalty():
    # Common name 'alex' with no corroboration -> WEAK_SIGNAL
    conf, rationale = ConfidenceEvaluator.evaluate_account_match(
        username="alex",
        platform="GitHub",
        target_email="alex@company.com",
        target_domain="company.com",
        profile_display_name="Different Person",
        corroborating_name="Alex Smith",
        profile_website="https://random.org",
    )
    assert conf == RelationshipConfidence.WEAK_SIGNAL
    assert "collision probability" in rationale


def test_confidence_dictionary_corroborated():
    # Common name 'alex' with matching display name -> STRONG_MATCH
    conf, rationale = ConfidenceEvaluator.evaluate_account_match(
        username="alex",
        platform="GitHub",
        target_email="alex@company.com",
        target_domain="company.com",
        profile_display_name="Alex Smith",
        corroborating_name="Alex Smith",
        profile_website=None,
    )
    assert conf == RelationshipConfidence.STRONG_MATCH
    assert "corroborated" in rationale


def test_confidence_unique_username_uncorroborated():
    # Unique name 'alex_forensic_99' with no corroboration -> POSSIBLE_MATCH
    conf, rationale = ConfidenceEvaluator.evaluate_account_match(
        username="alex_forensic_99",
        platform="GitHub",
        target_email="alex_forensic_99@company.com",
        target_domain="company.com",
        profile_display_name="Unknown",
        corroborating_name=None,
        profile_website=None,
    )
    assert conf == RelationshipConfidence.POSSIBLE_MATCH


def test_confidence_unique_username_domain_backlink():
    # Unique name with profile website pointing to company.com -> STRONG_MATCH
    conf, rationale = ConfidenceEvaluator.evaluate_account_match(
        username="alexsmith",
        platform="GitHub",
        target_email="alexsmith@company.com",
        target_domain="company.com",
        profile_display_name="Alex S",
        corroborating_name=None,
        profile_website="https://company.com/team/alex",
    )
    assert conf == RelationshipConfidence.STRONG_MATCH


# ==============================================================================
# 2. Signal Normalizer Unit Tests
# ==============================================================================

def test_signal_normalizer_dns():
    res = ProviderResult(
        provider_id="provider-dns",
        status=ProviderStatus.SUCCESS,
        extracted_signals=[
            {
                "signal_type": "MAIL_EXCHANGER",
                "exchange_host": "mail.example.com",
                "preference": 10,
            },
            {
                "signal_type": "MAIL_ORGANIZATION",
                "organization_name": "Google Workspace / Gmail",
            },
        ],
    )
    normalized = SignalNormalizer.normalize_provider_result(
        result=res,
        target_email="test@example.com",
        target_domain="example.com",
    )
    assert len(normalized.entities) == 2
    types = [e.entity_type for e in normalized.entities]
    assert EntityType.DOMAIN in types
    assert EntityType.ORGANIZATION in types


# ==============================================================================
# 3. End-to-End Orchestrator Pipeline Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_orchestrator_full_execution():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Setup Mock Providers in Registry
    mock_dns_result = ProviderResult(
        provider_id="provider-dns",
        status=ProviderStatus.SUCCESS,
        status_code=200,
        raw_payload={"domain": "company.com", "mx": ["mail.company.com"]},
        extracted_signals=[
            {
                "signal_type": "MAIL_EXCHANGER",
                "exchange_host": "mail.company.com",
                "preference": 10,
            }
        ],
    )

    mock_gravatar_result = ProviderResult(
        provider_id="provider-gravatar",
        status=ProviderStatus.SUCCESS,
        status_code=200,
        raw_payload={"display_name": "Alex Smith"},
        extracted_signals=[
            {
                "signal_type": "PUBLIC_PROFILE",
                "platform": "Gravatar",
                "display_name": "Alex Smith",
                "profile_url": "https://gravatar.com/alexsmith",
            },
            {
                "signal_type": "DERIVED_USERNAME",
                "username": "alexsmith",
                "source": "Gravatar",
            },
        ],
    )

    mock_github_result = ProviderResult(
        provider_id="provider-github",
        status=ProviderStatus.SUCCESS,
        status_code=200,
        raw_payload={"login": "alexsmith"},
        extracted_signals=[
            {
                "signal_type": "PUBLIC_ACCOUNT",
                "platform": "GitHub",
                "username": "alexsmith",
                "display_name": "Alex Smith",
                "profile_url": "https://github.com/alexsmith",
            }
        ],
    )

    mock_empty_result = ProviderResult(
        provider_id="provider-keybase",
        status=ProviderStatus.NO_RESULTS,
        status_code=200,
    )

    with patch("app.providers.registry.provider_registry.execute_all_for_pivot") as mock_exec:
        async def fake_pivot(pivot_type, pivot_val, timeout_sec=4.0):
            if pivot_type == "email":
                return [mock_dns_result, mock_gravatar_result]
            elif pivot_type == "domain":
                return [mock_dns_result]
            elif pivot_type == "username":
                return [mock_github_result, mock_empty_result]
            return []

        mock_exec.side_effect = fake_pivot

        async with async_session() as session:
            inv = Investigation(
                target_value="alexsmith@company.com",
                target_type=TargetType.EMAIL,
                status=InvestigationStatus.QUEUED,
                current_stage="01_VALIDATING_TARGET",
            )
            session.add(inv)
            await session.flush()

            root_ent = Entity(
                investigation_id=inv.id,
                canonical_value="alexsmith@company.com",
                entity_type=EntityType.EMAIL_TARGET,
                display_label="alexsmith@company.com",
            )
            session.add(root_ent)
            await session.commit()

            # Execute Orchestrator
            completed_inv = await orchestrator.execute_investigation(inv.id, session)

            # Assertions
            assert completed_inv.status == InvestigationStatus.COMPLETED
            assert completed_inv.current_stage == "05_BUILDING_DIGITAL_FOOTPRINT"
            assert completed_inv.summary_stats["total_entities"] >= 3
            assert completed_inv.summary_stats["confirmed_links"] >= 1
            assert len(completed_inv.raw_signals) >= 3
            assert len(completed_inv.relationships) >= 2

            # Check that raw signals contain SHA-256 hashes
            for sig in completed_inv.raw_signals:
                assert len(sig.payload_sha256) == 64

    await test_engine.dispose()
