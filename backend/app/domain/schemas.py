from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.domain.enums import (
    TargetType,
    InvestigationStatus,
    EntityType,
    RelationshipType,
    ObservationConfidence,
    RelationshipConfidence,
)


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


class InvestigationCreateRequest(BaseModel):
    target: EmailStr = Field(description="Target email address to investigate")
    target_type: TargetType = Field(default=TargetType.EMAIL)
    turnstile_token: Optional[str] = Field(default=None, description="Cloudflare Turnstile token")


class EvidenceSchema(BaseModel):
    id: str
    raw_signal_id: Optional[str] = None
    source_label: str
    source_url: Optional[str] = None
    discovery_method: str
    observation_confidence: ObservationConfidence
    observed_value: str
    rationale: str
    observed_at: datetime

    model_config = {"from_attributes": True}


class EntitySchema(BaseModel):
    id: str
    canonical_value: str
    entity_type: EntityType
    display_label: str
    attributes: Dict[str, Any] = {}
    first_seen_at: datetime

    model_config = {"from_attributes": True}


class RelationshipSchema(BaseModel):
    id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    confidence: RelationshipConfidence
    evidence_id: Optional[str] = None
    inference_rationale: str

    model_config = {"from_attributes": True}


class InvestigationResponse(BaseModel):
    id: str
    target_value: str
    target_type: TargetType
    status: InvestigationStatus
    current_stage: str
    provider_states: Dict[str, Any] = {}
    summary_stats: Dict[str, Any] = {}
    created_at: datetime
    completed_at: Optional[datetime] = None
    entities: List[EntitySchema] = []
    relationships: List[RelationshipSchema] = []

    model_config = {"from_attributes": True}
