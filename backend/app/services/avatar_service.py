import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.avatar_config import AvatarConfig
from app.providers.avatar.base import AvatarProvider, AvatarSession, SpeakResult
from app.providers.avatar.factory import get_avatar_provider
from app.services.language_service import detect_language
from app.services.voice_service import synthesize_speech

settings = get_settings()

DEFAULT_PROVIDER_CONFIG: dict[str, Any] = {
    "avatar_id": "default",
    "voice_id_en": settings.openai_tts_voice_en,
    "voice_id_ar": settings.openai_tts_voice_ar,
}


@dataclass
class RuntimeAvatarSession:
    session: AvatarSession
    provider_name: str
    config: dict[str, Any] = field(default_factory=dict)


_runtime_sessions: dict[str, RuntimeAvatarSession] = {}


def _mask_config(config: dict[str, Any]) -> dict[str, Any]:
    masked = dict(config)
    if masked.get("api_key"):
        masked["api_key"] = "***"
    return masked


def get_or_create_avatar_config(db: Session) -> AvatarConfig:
    row = db.query(AvatarConfig).order_by(AvatarConfig.updated_at.desc()).first()
    if row:
        return row

    row = AvatarConfig(
        provider="mock",
        provider_config=dict(DEFAULT_PROVIDER_CONFIG),
        is_enabled=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def resolve_provider_config(db_row: AvatarConfig) -> dict[str, Any]:
    config = dict(DEFAULT_PROVIDER_CONFIG)
    config.update(db_row.provider_config or {})
    if not config.get("api_key") and settings.heygen_api_key:
        config["api_key"] = settings.heygen_api_key
    return config


def get_public_config(db: Session) -> dict:
    row = get_or_create_avatar_config(db)
    provider = row.provider if row.is_enabled else "none"
    supports_stream = row.is_enabled and row.provider in {"heygen", "d-id"}
    return {
        "is_enabled": row.is_enabled,
        "provider": provider,
        "supports_stream": supports_stream,
    }


def update_avatar_config(db: Session, payload: dict) -> AvatarConfig:
    row = get_or_create_avatar_config(db)
    row.provider = payload["provider"] if payload["provider"] != "none" else "mock"
    row.is_enabled = payload["is_enabled"]
    incoming = payload.get("provider_config") or {}

    merged = dict(row.provider_config or {})
    merged.update(incoming)
    if merged.get("api_key") == "***":
        merged["api_key"] = (row.provider_config or {}).get("api_key", "")
    row.provider_config = merged
    db.commit()
    db.refresh(row)
    return row


def _resolve_language(text: str, language: str) -> str:
    if language in {"en", "ar"}:
        return language
    detected = detect_language(text)
    return detected if detected in {"en", "ar"} else "en"


def create_avatar_session(db: Session, language: str = "auto") -> RuntimeAvatarSession:
    row = get_or_create_avatar_config(db)
    if not row.is_enabled:
        raise ValueError("Avatar is disabled")

    provider_name = row.provider
    provider = get_avatar_provider(provider_name)
    config = resolve_provider_config(row)
    session = provider.create_session(config)

    runtime = RuntimeAvatarSession(
        session=session,
        provider_name=provider_name,
        config=config,
    )
    _runtime_sessions[session.session_id] = runtime
    return runtime


def speak_in_session(
    db: Session,
    session_id: str,
    text: str,
    language: str = "auto",
    provider: AvatarProvider | None = None,
) -> SpeakResult:
    runtime = _runtime_sessions.get(session_id)
    if not runtime:
        raise ValueError("Avatar session not found")

    row = get_or_create_avatar_config(db)
    if not row.is_enabled:
        raise ValueError("Avatar is disabled")

    resolved_language = _resolve_language(text, language)
    tts = synthesize_speech(text, resolved_language)
    avatar_provider = provider or get_avatar_provider(runtime.provider_name)

    return avatar_provider.speak(
        session_id=session_id,
        text=text,
        language=resolved_language,
        config=runtime.config,
        audio_bytes=tts.audio_bytes,
    )


def get_session_stream(session_id: str) -> RuntimeAvatarSession | None:
    return _runtime_sessions.get(session_id)


def close_avatar_session(session_id: str) -> None:
    runtime = _runtime_sessions.pop(session_id, None)
    if not runtime:
        return
    provider = get_avatar_provider(runtime.provider_name)
    provider.close_session(session_id, runtime.config)


def clear_runtime_sessions() -> None:
    _runtime_sessions.clear()
