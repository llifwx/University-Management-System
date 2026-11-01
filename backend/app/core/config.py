from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str
    jwt_secret: str = Field(min_length=32)
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]
    access_token_minutes: int = Field(default=15, gt=0, le=60)
    refresh_token_days: int = Field(default=7, gt=0, le=90)
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None
    seed_password: str | None = None

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use postgresql+asyncpg")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def reject_placeholder(cls, value: str) -> str:
        if value.startswith("replace-"):
            raise ValueError("Generate a JWT_SECRET before starting the API")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
