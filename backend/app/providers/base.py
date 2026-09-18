from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.domain.enums import ProviderStatus


class ProviderResult(BaseModel):
    """Encapsulates the isolated execution result of a single provider query."""
    provider_id: str
    status: ProviderStatus
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None
    extracted_signals: List[Dict[str, Any]] = Field(default_factory=list)


class BaseProvider(ABC):
    """
    Abstract Base Provider Interface.
    
    All OSINT collector adapters (DNS, RDAP, Gravatar, GitHub, etc.) inherit from this interface.
    External failures or rate limits must be caught and returned as structured ProviderResult objects,
    preventing any external dependency from crashing the orchestrator pipeline.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique machine identifier for this provider adapter (e.g. 'provider-dns')."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable display name for forensic reports."""
        pass

    @property
    @abstractmethod
    def supported_pivots(self) -> List[str]:
        """List of supported input pivot types (e.g. ['email', 'domain', 'username'])."""
        pass

    @abstractmethod
    async def query(self, pivot_type: str, pivot_value: str, timeout_sec: float = 5.0) -> ProviderResult:
        """
        Executes non-blocking collection for the target pivot with strict timeout.
        
        Returns:
            ProviderResult containing status, payload, and extracted signals.
        """
        pass
