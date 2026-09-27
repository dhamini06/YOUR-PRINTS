"""
Opt-Out Portal API — POST /api/v1/opt-out

Allows an email address owner to permanently opt out of YOUR-PRINTS investigations.
The target hash (HMAC-SHA256 of the normalized email) is stored in opt_out_targets.
Once opted out, all future POST /api/v1/investigations for that email return HTTP 403.

No raw email address is stored — only its cryptographic hash.
No confirmation flow required for MVP; can be layered in v1.1.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.domain.models import OptOutTarget, utc_now
from app.domain.validation import normalize_and_validate_email, compute_target_hash, TargetValidationError
from app.domain.schemas import ErrorResponse
from pydantic import BaseModel, Field


router = APIRouter(prefix="/opt-out", tags=["Privacy & Opt-Out"])


class OptOutRequest(BaseModel):
    email: str = Field(..., description="Email address to permanently opt out of YOUR-PRINTS investigations.")


class OptOutResponse(BaseModel):
    status: str
    message: str


@router.post(
    "",
    response_model=OptOutResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid email format"},
        409: {"model": ErrorResponse, "description": "Target already opted out"},
    },
    summary="Register a permanent opt-out for a target email address.",
)
async def register_opt_out(req: OptOutRequest, db: AsyncSession = Depends(get_db)) -> OptOutResponse:
    """
    Accept an email address opt-out request.

    Only the HMAC-SHA256 hash of the normalized email is stored — never the raw address.
    All future investigation attempts targeting this email will be immediately rejected.
    """
    # Validate and normalize the email
    try:
        canonical_email, _, _ = normalize_and_validate_email(req.email)
    except TargetValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_EMAIL", "message": str(e)},
        )

    target_hash = compute_target_hash(canonical_email)

    # Check if already opted out
    existing = await db.execute(select(OptOutTarget).where(OptOutTarget.target_hash == target_hash))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_OPTED_OUT",
                "message": "This target has already been registered in the opt-out registry.",
            },
        )

    # Register the opt-out
    opt_out = OptOutTarget(
        target_hash=target_hash,
        requested_at=utc_now(),
    )
    db.add(opt_out)
    await db.commit()

    return OptOutResponse(
        status="opted_out",
        message=(
            "Your email address hash has been permanently recorded in our opt-out registry. "
            "All future investigation attempts targeting this address will be immediately rejected. "
            "No raw email address has been stored."
        ),
    )


@router.get(
    "/check",
    response_model=OptOutResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid email format"},
    },
    summary="Check if an email address is in the opt-out registry.",
)
async def check_opt_out_status(email: str, db: AsyncSession = Depends(get_db)) -> OptOutResponse:
    """
    Allow an email owner to verify their opt-out status.
    Returns whether the email hash is present in the opt-out registry.
    """
    try:
        canonical_email, _, _ = normalize_and_validate_email(email)
    except TargetValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_EMAIL", "message": str(e)},
        )

    target_hash = compute_target_hash(canonical_email)
    result = await db.execute(select(OptOutTarget).where(OptOutTarget.target_hash == target_hash))
    opted_out = result.scalars().first()

    if opted_out:
        return OptOutResponse(
            status="opted_out",
            message="This email address is registered in the YOUR-PRINTS opt-out registry. No investigations can be created for this target.",
        )
    return OptOutResponse(
        status="not_opted_out",
        message="This email address is not currently in the opt-out registry.",
    )
