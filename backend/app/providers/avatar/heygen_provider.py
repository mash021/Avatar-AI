import logging
import uuid

import httpx

from app.providers.avatar.base import AvatarProvider, AvatarSession, SpeakResult
from app.providers.avatar.mock_provider import MockAvatarProvider

logger = logging.getLogger(__name__)

HEYGEN_API_BASE = "https://api.heygen.com"


class HeyGenAvatarProvider(AvatarProvider):
    name = "heygen"

    def __init__(self) -> None:
        self._sessions: dict[str, AvatarSession] = {}
        self._fallback = MockAvatarProvider()

    def _api_key(self, config: dict) -> str:
        return (config.get("api_key") or "").strip()

    def _headers(self, api_key: str) -> dict[str, str]:
        return {
            "X-Api-Key": api_key,
            "Content-Type": "application/json",
        }

    def create_session(self, config: dict) -> AvatarSession:
        api_key = self._api_key(config)
        if not api_key:
            logger.warning("HeyGen API key missing, falling back to mock avatar")
            session = self._fallback.create_session(config)
            session.provider = self.name
            self._sessions[session.session_id] = session
            return session

        avatar_id = config.get("avatar_id") or config.get("avatar_name") or "default"
        voice_id = config.get("voice_id_en") or config.get("voice_id") or ""

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{HEYGEN_API_BASE}/v1/streaming.new",
                    headers=self._headers(api_key),
                    json={
                        "quality": "medium",
                        "avatar_name": avatar_id,
                        "voice": {"voice_id": voice_id} if voice_id else {},
                    },
                )
                response.raise_for_status()
                data = response.json().get("data", {})
        except Exception:
            logger.exception("HeyGen create_session failed, using mock fallback")
            session = self._fallback.create_session(config)
            session.provider = self.name
            self._sessions[session.session_id] = session
            return session

        session = AvatarSession(
            session_id=data.get("session_id") or str(uuid.uuid4()),
            stream_url=data.get("url"),
            provider=self.name,
            metadata={"access_token": data.get("access_token")},
        )
        self._sessions[session.session_id] = session
        return session

    def speak(
        self,
        session_id: str,
        text: str,
        language: str,
        config: dict,
        audio_bytes: bytes | None = None,
    ) -> SpeakResult:
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError("Avatar session not found")

        api_key = self._api_key(config)
        if not api_key or not session.stream_url:
            return self._fallback.speak(session_id, text, language, config, audio_bytes)

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{HEYGEN_API_BASE}/v1/streaming.task",
                    headers=self._headers(api_key),
                    json={
                        "session_id": session_id,
                        "text": text,
                        "task_type": "repeat",
                    },
                )
                response.raise_for_status()
                data = response.json().get("data", {})
        except Exception:
            logger.exception("HeyGen speak failed, using TTS audio fallback")
            return self._fallback.speak(session_id, text, language, config, audio_bytes)

        return SpeakResult(
            session_id=session_id,
            status=data.get("status", "processing"),
            stream_url=session.stream_url,
            audio_bytes=audio_bytes or b"",
            task_id=data.get("task_id"),
        )

    def close_session(self, session_id: str, config: dict) -> None:
        api_key = self._api_key(config)
        if api_key and session_id in self._sessions:
            try:
                with httpx.Client(timeout=15.0) as client:
                    client.post(
                        f"{HEYGEN_API_BASE}/v1/streaming.stop",
                        headers=self._headers(api_key),
                        json={"session_id": session_id},
                    )
            except Exception:
                logger.exception("HeyGen close_session failed")
        self._sessions.pop(session_id, None)
        self._fallback.close_session(session_id, config)

    def get_stream_url(self, session_id: str, config: dict) -> str | None:
        session = self._sessions.get(session_id)
        return session.stream_url if session else None
