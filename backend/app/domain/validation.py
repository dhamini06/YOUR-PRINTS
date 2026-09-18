import re
import hashlib
from typing import Tuple
from email_validator import validate_email, EmailNotValidError


class TargetValidationError(ValueError):
    """Raised when a target identifier fails validation."""
    pass


def compute_target_hash(canonical_email: str) -> str:
    """Compute SHA-256 hash of canonical email for privacy-preserving opt-out checks."""
    return hashlib.sha256(canonical_email.encode("utf-8")).hexdigest()


def normalize_and_validate_email(raw_email: str) -> Tuple[str, str, str]:
    """
    Normalizes and strictly validates an email address according to RFC 5322 / RFC 5321.
    
    Returns:
        Tuple of (canonical_email, local_part, domain)
        
    Raises:
        TargetValidationError if the email format is invalid or exceeds protocol bounds.
    """
    if not raw_email or not isinstance(raw_email, str):
        raise TargetValidationError("Email address cannot be empty.")

    cleaned = raw_email.strip().lower()

    if len(cleaned) > 254:
        raise TargetValidationError("Email address exceeds maximum allowed length (254 characters).")

    if "@" not in cleaned:
        raise TargetValidationError("Email address must contain an '@' symbol.")

    parts = cleaned.rsplit("@", 1)
    local_part, domain = parts[0], parts[1]

    if not local_part:
        raise TargetValidationError("Email address missing local part before '@'.")

    if len(local_part) > 64:
        raise TargetValidationError("Email local part exceeds maximum allowed length (64 characters).")

    if not domain:
        raise TargetValidationError("Email address missing domain part after '@'.")

    if "." not in domain:
        raise TargetValidationError("Email domain must contain at least one dot separator.")

    if domain.startswith(".") or domain.endswith("."):
        raise TargetValidationError("Email domain cannot start or end with a dot.")

    # Use email_validator for deep syntax, DNS punycode normalization, and character set checks
    try:
        validated_info = validate_email(cleaned, check_deliverability=False)
        canonical = validated_info.normalized.lower()
        return canonical, validated_info.local_part.lower(), validated_info.domain.lower()
    except EmailNotValidError as e:
        raise TargetValidationError(f"Invalid email syntax: {str(e)}")
