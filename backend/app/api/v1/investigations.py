from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.config import settings
from app.domain.models import Investigation, Entity, Evidence, OptOutTarget, utc_now
from app.domain.enums import (
    TargetType,
    InvestigationStatus,
    EntityType,
)
from app.domain.schemas import (
    InvestigationCreateRequest,
    InvestigationResponse,
    EvidenceSchema,
    ErrorResponse,
)
from app.domain.validation import (
    normalize_and_validate_email,
    compute_target_hash,
    TargetValidationError,
)
from app.engine.orchestrator import orchestrator

router = APIRouter(prefix="/investigations", tags=["Investigations"])


@router.post(
    "",
    response_model=InvestigationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid target format"},
        403: {"model": ErrorResponse, "description": "Target has been opted out by owner"},
        422: {"model": ErrorResponse, "description": "Unprocessable target input"},
    },
)
async def create_investigation(
    req: InvestigationCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a new digital footprint investigation for an email address.
    
    Normalizes the email address, verifies opt-out status, initializes the
    investigation record with an ephemeral TTL, and executes the 5-stage
    investigation pipeline (discovery, correlation, and evidence linking).
    """
    # 1. Syntax & protocol normalization
    try:
        canonical_email, local_part, domain = normalize_and_validate_email(req.target)
    except TargetValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_TARGET_SYNTAX",
                "message": str(e),
            },
        )

    # 2. Check Opt-Out Registry
    target_hash = compute_target_hash(canonical_email)
    opt_out_stmt = select(OptOutTarget).where(OptOutTarget.target_hash == target_hash)
    opt_out_res = await db.execute(opt_out_stmt)
    opted_out = opt_out_res.scalars().first()

    if opted_out:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TARGET_OPTED_OUT",
                "message": "This target identifier has been permanently opted out from public investigations by its owner.",
            },
        )

    # 3. Create Investigation Record
    expires_at = utc_now() + timedelta(hours=settings.INVESTIGATION_TTL_HOURS)
    investigation = Investigation(
        target_value=canonical_email,
        target_type=TargetType.EMAIL,
        status=InvestigationStatus.QUEUED,
        current_stage="01_VALIDATING_TARGET",
        provider_states={},
        summary_stats={
            "total_entities": 1,
            "confirmed_links": 0,
            "strong_matches": 0,
            "possible_matches": 0,
            "exposure_count": 0,
        },
        expires_at=expires_at,
    )
    db.add(investigation)
    await db.flush()

    # 4. Create Root Entity (Email Target)
    root_entity = Entity(
        investigation_id=investigation.id,
        canonical_value=canonical_email,
        entity_type=EntityType.EMAIL_TARGET,
        display_label=canonical_email,
        attributes={
            "local_part": local_part,
            "domain": domain,
            "target_hash": target_hash,
        },
    )
    db.add(root_entity)
    await db.commit()

    # 5. Execute 5-Stage Orchestration Pipeline
    completed_inv = await orchestrator.execute_investigation(investigation.id, db)

    return completed_inv


@router.get(
    "/{investigation_id}",
    response_model=InvestigationResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid investigation ID format"},
        404: {"model": ErrorResponse, "description": "Investigation not found"},
    },
)
async def get_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve current status and digital footprint intelligence for an investigation.
    """
    if len(investigation_id) != 36:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IDENTIFIER",
                "message": "Investigation ID must be a valid 36-character UUID string.",
            },
        )

    stmt = (
        select(Investigation)
        .where(Investigation.id == investigation_id)
        .options(
            selectinload(Investigation.entities),
            selectinload(Investigation.relationships),
        )
    )
    res = await db.execute(stmt)
    inv = res.scalars().first()

    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INVESTIGATION_NOT_FOUND",
                "message": f"No investigation found with identifier: {investigation_id}",
            },
        )

    return inv


@router.get(
    "/{investigation_id}/evidence/{evidence_id}",
    response_model=EvidenceSchema,
    responses={
        404: {"model": ErrorResponse, "description": "Evidence not found"},
    },
)
async def get_evidence(
    investigation_id: str,
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve forensic evidence details and raw observation provenance.
    """
    stmt = select(Evidence).where(Evidence.id == evidence_id)
    res = await db.execute(stmt)
    evidence = res.scalars().first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EVIDENCE_NOT_FOUND",
                "message": f"No evidence record found with identifier: {evidence_id}",
            },
        )

    return evidence


@router.delete(
    "/{investigation_id}",
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse, "description": "Investigation not found"},
    },
)
async def delete_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Immediate hard deletion of investigation records, entities, and evidence upon user request.
    """
    stmt = select(Investigation).where(Investigation.id == investigation_id)
    res = await db.execute(stmt)
    inv = res.scalars().first()

    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INVESTIGATION_NOT_FOUND",
                "message": f"No investigation found with identifier: {investigation_id}",
            },
        )

    await db.delete(inv)
    await db.commit()

    return {
        "status": "deleted",
        "investigation_id": investigation_id,
        "message": "Investigation and all associated graph nodes and evidence records have been permanently purged.",
    }
