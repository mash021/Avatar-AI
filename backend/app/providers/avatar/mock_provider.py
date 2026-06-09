import uuid

from app.providers.avatar.base import AvatarProvider, AvatarSession, SpeakResult


class MockAvatarProvider(AvatarProvider):
    name = "mock"

    def __init__(self) -> None:
        self._sessions: dict[str, AvatarSession] = {}

    def create_session(self, config: dict) -> AvatarSession:
        session_id = str(uuid.uuid4())
        session = AvatarSession(
            session_id=session_id,
            stream_url=None,
            provider=self.name,
            metadata={"mode": "tts-visual"},
        )
        self._sessions[session_id] = session
        return session

    def speak(
        self,
        session_id: str,
        text: str,
        language: str,
        config: dict,
        audio_bytes: bytes | None = None,
    ) -> SpeakResult:
        if session_id not in self._sessions:
            raise ValueError("Avatar session not found")

        return SpeakResult(
            session_id=session_id,
            status="completed",
            stream_url=None,
            audio_bytes=audio_bytes or b"",
            task_id=str(uuid.uuid4()),
        )

    def close_session(self, session_id: str, config: dict) -> None:
        self._sessions.pop(session_id, None)

    def get_stream_url(self, session_id: str, config: dict) -> str | None:
        session = self._sessions.get(session_id)
        return session.stream_url if session else None
