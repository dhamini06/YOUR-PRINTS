import asyncio
from typing import List, Dict, Type
from app.providers.base import BaseProvider, ProviderResult
from app.domain.enums import ProviderStatus
from app.providers.dns_provider import DNSProvider
from app.providers.rdap_provider import RDAPProvider
from app.providers.gravatar_provider import GravatarProvider
from app.providers.github_provider import GitHubProvider
from app.providers.keybase_provider import KeybaseProvider


class ProviderRegistry:
    """
    Central Registry for all OSINT Collector Adapters.
    
    Provides decoupled discovery, registration, and isolated parallel execution
    of providers for any given target pivot.
    """

    def __init__(self):
        self._providers: Dict[str, BaseProvider] = {}
        # Register core zero-cost providers
        self.register(DNSProvider())
        self.register(RDAPProvider())
        self.register(GravatarProvider())
        self.register(GitHubProvider())
        self.register(KeybaseProvider())

    def register(self, provider: BaseProvider):
        self._providers[provider.provider_id] = provider

    def get_provider(self, provider_id: str) -> BaseProvider:
        return self._providers.get(provider_id)

    def get_providers_for_pivot(self, pivot_type: str) -> List[BaseProvider]:
        """Returns all registered providers that support the given pivot type."""
        return [
            prov for prov in self._providers.values()
            if pivot_type.lower() in [p.lower() for p in prov.supported_pivots]
        ]

    async def execute_all_for_pivot(
        self,
        pivot_type: str,
        pivot_value: str,
        timeout_sec: float = 4.0,
    ) -> List[ProviderResult]:
        """
        Executes all applicable providers concurrently with strict isolation and timeout.
        
        Guarantees that a failing or hanging provider will not abort the batch.
        """
        providers = self.get_providers_for_pivot(pivot_type)
        if not providers:
            return []

        async def _safe_run(provider: BaseProvider) -> ProviderResult:
            try:
                return await provider.query(pivot_type, pivot_value, timeout_sec=timeout_sec)
            except Exception as e:
                return ProviderResult(
                    provider_id=provider.provider_id,
                    status=ProviderStatus.ERROR,
                    error_message=f"Unhandled exception in provider {provider.provider_id}: {str(e)}",
                )

        tasks = [_safe_run(prov) for prov in providers]
        results = await asyncio.gather(*tasks, return_exceptions=False)
        return results


# Global singleton registry
provider_registry = ProviderRegistry()
