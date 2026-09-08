import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.domain.enums import (
    TargetType,
    InvestigationStatus,
    EntityType,
    RelationshipType,
    ObservationConfidence,
    RelationshipConfidence,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    target_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    target_type: Mapped[TargetType] = mapped_column(
        SQLEnum(TargetType), nullable=False, default=TargetType.EMAIL
    )
    status: Mapped[InvestigationStatus] = mapped_column(
        SQLEnum(InvestigationStatus), nullable=False, default=InvestigationStatus.QUEUED, index=True
    )
    current_stage: Mapped[str] = mapped_column(String(64), default="01_VALIDATING_TARGET")
    client_ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    
    # Provider summary states, e.g. {"dns": "SUCCESS", "gravatar": "NO_RESULTS"}
    provider_states: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    summary_stats: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    raw_signals: Mapped[List["RawSignal"]] = relationship(
        "RawSignal", back_populates="investigation", cascade="all, delete-orphan"
    )
    entities: Mapped[List["Entity"]] = relationship(
        "Entity", back_populates="investigation", cascade="all, delete-orphan"
    )
    relationships: Mapped[List["Relationship"]] = relationship(
        "Relationship", back_populates="investigation", cascade="all, delete-orphan"
    )


class RawSignal(Base):
    __tablename__ = "raw_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[str] = mapped_column(String(64), nullable=False)
    query_type: Mapped[str] = mapped_column(String(64), nullable=False)
    query_target: Mapped[str] = mapped_column(String(255), nullable=False)
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    payload_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="raw_signals")
    evidence_records: Mapped[List["Evidence"]] = relationship(
        "Evidence", back_populates="raw_signal", cascade="all, delete-orphan"
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    raw_signal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("raw_signals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_label: Mapped[str] = mapped_column(String(128), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discovery_method: Mapped[str] = mapped_column(String(64), nullable=False)
    observation_confidence: Mapped[ObservationConfidence] = mapped_column(
        SQLEnum(ObservationConfidence), nullable=False, default=ObservationConfidence.RELIABLE
    )
    observed_value: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    raw_signal: Mapped[Optional["RawSignal"]] = relationship("RawSignal", back_populates="evidence_records")
    relationships: Mapped[List["Relationship"]] = relationship("Relationship", back_populates="evidence")


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    canonical_value: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[EntityType] = mapped_column(SQLEnum(EntityType), nullable=False)
    display_label: Mapped[str] = mapped_column(String(255), nullable=False)
    attributes: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="entities")


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        SQLEnum(RelationshipType), nullable=False
    )
    confidence: Mapped[RelationshipConfidence] = mapped_column(
        SQLEnum(RelationshipConfidence), nullable=False, default=RelationshipConfidence.UNVERIFIED
    )
    evidence_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True, index=True
    )
    inference_rationale: Mapped[str] = mapped_column(Text, nullable=False)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="relationships")
    evidence: Mapped[Optional["Evidence"]] = relationship("Evidence", back_populates="relationships")


class OptOutTarget(Base):
    __tablename__ = "opt_out_targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    target_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmation_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
