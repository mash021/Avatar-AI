from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "AI Avatar API"
    app_env: str = "development"
    debug: bool = True

    database_url: str = "postgresql+psycopg://avatar:avatar_dev_password@localhost:5433/avatar_db"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:3000"

    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_whisper_model: str = "whisper-1"
    openai_tts_model: str = "tts-1"
    openai_tts_voice_en: str = "alloy"
    openai_tts_voice_ar: str = "nova"
    heygen_api_key: str = ""
    file_storage_path: str = "./uploads"
    max_upload_size_mb: int = 50

    rag_top_k: int = 8
    rag_similarity_threshold: float = 0.55
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50

    celery_task_always_eager: bool = False
    scraper_use_playwright: bool = False
    scraper_timeout_seconds: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
