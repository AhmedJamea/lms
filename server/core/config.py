from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./lms.db"
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_production_991823908"
    JWT_REFRESH_SECRET_KEY: str = "dev_refresh_secret_key_change_in_production_109283"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Load environment variables from .env file if it exists
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
