"""Provider adapter framework for YOUR-PRINTS."""
from app.providers.base import BaseProvider, ProviderResult
from app.providers.registry import ProviderRegistry, provider_registry
from app.providers.dns_provider import DNSProvider
from app.providers.rdap_provider import RDAPProvider
from app.providers.gravatar_provider import GravatarProvider
from app.providers.github_provider import GitHubProvider
from app.providers.keybase_provider import KeybaseProvider

__all__ = [
    "BaseProvider",
    "ProviderResult",
    "ProviderRegistry",
    "provider_registry",
    "DNSProvider",
    "RDAPProvider",
    "GravatarProvider",
    "GitHubProvider",
    "KeybaseProvider",
]
