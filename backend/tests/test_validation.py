import pytest
from app.domain.validation import (
    normalize_and_validate_email,
    compute_target_hash,
    TargetValidationError,
)


def test_valid_email_normalization():
    raw = "  Alex.Smith+test@EXAMPLE.Com  "
    canonical, local, domain = normalize_and_validate_email(raw)
    assert canonical == "alex.smith+test@example.com"
    assert local == "alex.smith+test"
    assert domain == "example.com"


def test_subdomain_email():
    raw = "analyst@security.corp.example.org"
    canonical, local, domain = normalize_and_validate_email(raw)
    assert canonical == "analyst@security.corp.example.org"
    assert domain == "security.corp.example.org"


def test_compute_target_hash():
    email = "alex@example.com"
    h1 = compute_target_hash(email)
    h2 = compute_target_hash("alex@example.com")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex digest length


@pytest.mark.parametrize(
    "invalid_input",
    [
        "",
        "   ",
        "plainaddress",
        "@missinglocal.com",
        "missingdomain@",
        "missingdot@domain",
        "nodots@localhost",
        "trailingdot@example.com.",
        "a" * 65 + "@example.com",  # Local part > 64 chars
        "user@" + "b" * 250 + ".com",  # Total > 254 chars
    ],
)
def test_invalid_email_formats(invalid_input):
    with pytest.raises(TargetValidationError):
        normalize_and_validate_email(invalid_input)
