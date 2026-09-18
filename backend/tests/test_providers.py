import pytest
import respx
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
import dns.resolver
from app.domain.enums import ProviderStatus
from app.providers.dns_provider import DNSProvider
from app.providers.gravatar_provider import GravatarProvider
from app.providers.github_provider import GitHubProvider
from app.providers.rdap_provider import RDAPProvider
from app.providers.keybase_provider import KeybaseProvider
from app.providers.registry import ProviderRegistry


# ==============================================================================
# 1. DNS Provider Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_dns_provider_success():
    provider = DNSProvider()

    # Mock MX Record Answer
    mock_mx = MagicMock()
    mock_mx.exchange = "aspmx.l.google.com."
    mock_mx.preference = 10

    # Mock TXT Record Answer
    mock_txt = MagicMock()
    mock_txt.strings = [b"v=spf1 include:_spf.google.com ~all"]

    with patch("dns.asyncresolver.Resolver.resolve", new_callable=AsyncMock) as mock_resolve:
        async def side_effect(domain, rdtype):
            if rdtype == "MX":
                return [mock_mx]
            elif rdtype == "TXT":
                return [mock_txt]
            raise dns.resolver.NoAnswer

        mock_resolve.side_effect = side_effect

        result = await provider.query("email", "alex@company.com")

    assert result.status == ProviderStatus.SUCCESS
    assert result.status_code == 200
    assert "Google Workspace / Gmail" in result.raw_payload["identified_providers"]
    assert len(result.extracted_signals) >= 2

    types = [s["signal_type"] for s in result.extracted_signals]
    assert "MAIL_EXCHANGER" in types
    assert "MAIL_ORGANIZATION" in types


@pytest.mark.asyncio
async def test_dns_provider_no_records():
    provider = DNSProvider()

    with patch("dns.asyncresolver.Resolver.resolve", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.side_effect = dns.resolver.NXDOMAIN

        result = await provider.query("domain", "nonexistentdomain12345.com")

    assert result.status == ProviderStatus.NO_RESULTS


# ==============================================================================
# 2. Gravatar Provider Tests
# ==============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_gravatar_provider_success():
    provider = GravatarProvider()
    email_hash = "ef537f25c8cfb491232ffd6436a59655" # md5/sha256 representation

    # Mock Gravatar v3 JSON response
    mock_payload = {
        "display_name": "Alex Smith",
        "preferred_username": "alexsmith",
        "about_me": "Forensic Investigator and OSINT Researcher",
        "location": "Berlin, Germany",
        "avatar_url": "https://gravatar.com/avatar/sample.jpg",
        "profile_url": "https://gravatar.com/alexsmith",
        "verified_accounts": [
            {
                "service_type": "github",
                "service_label": "GitHub",
                "url": "https://github.com/alexsmith",
                "is_hidden": False,
            }
        ],
    }

    respx.get(url__regex=r"https://api\.gravatar\.com/v3/profiles/.*").respond(
        status_code=200, json=mock_payload
    )

    result = await provider.query("email", "alexsmith@example.com")

    assert result.status == ProviderStatus.SUCCESS
    assert result.status_code == 200
    assert len(result.extracted_signals) >= 3

    types = [s["signal_type"] for s in result.extracted_signals]
    assert "PUBLIC_PROFILE" in types
    assert "DERIVED_USERNAME" in types
    assert "LINKED_ACCOUNT" in types


@pytest.mark.asyncio
@respx.mock
async def test_gravatar_provider_not_found():
    provider = GravatarProvider()

    respx.get(url__regex=r"https://api\.gravatar\.com/v3/profiles/.*").respond(
        status_code=404
    )

    result = await provider.query("email", "nobody@example.com")
    assert result.status == ProviderStatus.NO_RESULTS
    assert result.status_code == 404


@pytest.mark.asyncio
@respx.mock
async def test_gravatar_provider_rate_limited():
    provider = GravatarProvider()

    respx.get(url__regex=r"https://api\.gravatar\.com/v3/profiles/.*").respond(
        status_code=429
    )

    result = await provider.query("email", "alex@example.com")
    assert result.status == ProviderStatus.RATE_LIMITED
    assert result.status_code == 429


# ==============================================================================
# 3. GitHub Provider Tests
# ==============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_github_provider_success():
    provider = GitHubProvider()

    mock_github = {
        "login": "alexsmith",
        "name": "Alex Smith",
        "company": "Cyber Research Lab",
        "blog": "https://alexsmith.dev",
        "bio": "Open Source Analyst",
        "public_repos": 42,
        "avatar_url": "https://avatars.githubusercontent.com/u/12345",
        "html_url": "https://github.com/alexsmith",
        "created_at": "2018-04-12T10:00:00Z",
    }

    respx.get("https://api.github.com/users/alexsmith").respond(
        status_code=200, json=mock_github
    )

    result = await provider.query("username", "alexsmith")

    assert result.status == ProviderStatus.SUCCESS
    assert result.status_code == 200
    assert len(result.extracted_signals) == 2

    account_sig = result.extracted_signals[0]
    assert account_sig["signal_type"] == "PUBLIC_ACCOUNT"
    assert account_sig["platform"] == "GitHub"
    assert account_sig["display_name"] == "Alex Smith"
    assert account_sig["public_repos"] == 42

    website_sig = result.extracted_signals[1]
    assert website_sig["signal_type"] == "DERIVED_WEBSITE"
    assert website_sig["url"] == "https://alexsmith.dev"


@pytest.mark.asyncio
@respx.mock
async def test_github_provider_rate_limited():
    provider = GitHubProvider()

    respx.get("https://api.github.com/users/alexsmith").respond(
        status_code=403,
        headers={"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1726000000"},
    )

    result = await provider.query("username", "alexsmith")
    assert result.status == ProviderStatus.RATE_LIMITED
    assert "GitHub API rate limited" in result.error_message


# ==============================================================================
# 4. RDAP Provider Tests
# ==============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_rdap_provider_success():
    provider = RDAPProvider()

    mock_rdap = {
        "entities": [
            {
                "roles": ["registrar"],
                "vcardArray": ["vcard", [["fn", {}, "text", "Namecheap Inc."]]],
            }
        ],
        "events": [
            {"eventAction": "registration", "eventDate": "2020-01-15T00:00:00Z"},
            {"eventAction": "expiration", "eventDate": "2028-01-15T00:00:00Z"},
        ],
        "nameservers": [{"ldhName": "ns1.cloudflare.com"}, {"ldhName": "ns2.cloudflare.com"}],
    }

    respx.get("https://rdap.org/domain/mycustomdomain.com").respond(
        status_code=200, json=mock_rdap
    )

    result = await provider.query("domain", "mycustomdomain.com")

    assert result.status == ProviderStatus.SUCCESS
    assert len(result.extracted_signals) >= 4

    types = [s["signal_type"] for s in result.extracted_signals]
    assert "DOMAIN_REGISTRAR" in types
    assert "DOMAIN_EVENT" in types
    assert "DOMAIN_NAMESERVER" in types


@pytest.mark.asyncio
async def test_rdap_provider_free_mail_optimization():
    provider = RDAPProvider()
    result = await provider.query("email", "target@gmail.com")
    assert result.status == ProviderStatus.SUCCESS
    assert result.extracted_signals[0]["signal_type"] == "PUBLIC_MAIL_PROVIDER"


# ==============================================================================
# 5. Keybase Provider Tests
# ==============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_keybase_provider_success():
    provider = KeybaseProvider()

    mock_keybase = {
        "status": {"code": 0, "name": "OK"},
        "them": [
            {
                "basics": {"username": "alexsmith"},
                "profile": {"full_name": "Alex Smith", "bio": "Security Engineer"},
                "proofs_summary": {
                    "all": [
                        {
                            "proof_type": "twitter",
                            "nametag": "alex_security",
                            "service_url": "https://twitter.com/alex_security",
                            "state": 1,
                        }
                    ]
                },
                "public_keys": {
                    "primary": {"key_fingerprint": "EB8690FA31F605A4"}
                },
            }
        ],
    }

    respx.get(url__regex=r"https://keybase\.io/_/api/1\.0/user/lookup\.json.*").respond(
        status_code=200, json=mock_keybase
    )

    result = await provider.query("username", "alexsmith")

    assert result.status == ProviderStatus.SUCCESS
    types = [s["signal_type"] for s in result.extracted_signals]
    assert "PUBLIC_ACCOUNT" in types
    assert "CRYPTOGRAPHIC_PROOF" in types
    assert "PGP_PUBLIC_KEY" in types


# ==============================================================================
# 6. Provider Registry Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_provider_registry_discovery():
    registry = ProviderRegistry()
    email_providers = registry.get_providers_for_pivot("email")
    assert len(email_providers) >= 3

    provider_ids = [p.provider_id for p in email_providers]
    assert "provider-dns" in provider_ids
    assert "provider-gravatar" in provider_ids
