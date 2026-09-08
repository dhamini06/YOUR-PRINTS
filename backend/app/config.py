from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Environment & Logging
    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")

    # API Server
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)
    ALLOWED_ORIGINS: str = Field(default="http://localhost:3000,http://127.0.0.1:3000")

    # Database
    # Default to async SQLite for test/local resilience if PostgreSQL is not active
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./yourprints_dev.db")

    # Guardrails
    INVESTIGATION_TIMEOUT_SECONDS: float = Field(default=15.0)
    PER_PROVIDER_TIMEOUT_SECONDS: float = Field(default=5.0)
    MAX_CONCURRENT_INVESTIGATIONS: int = Field(default=10)
    INVESTIGATION_TTL_HOURS: int = Field(default=48)

    # External APIs (Optional)
    GITHUB_TOKEN: str = Field(default="")
    HIBP_API_KEY: str = Field(default="")
    TURNSTILE_SECRET_KEY: str = Field(default="")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
