from app.providers.avatar.base import AvatarProvider, AvatarSession, SpeakResult


class DIDAvatarProvider(AvatarProvider):
    """Stub provider — D-ID integration deferred; use HeyGen or mock."""

    name = "d-id"

    def create_session(self, config: dict) -> AvatarSession:
        raise NotImplementedError("D-ID provider is not implemented yet. Use heygen or mock.")

    def speak(
        self,
        session_id: str,
        text: str,
        language: str,
        config: dict,
        audio_bytes: bytes | None = None,
    ) -> SpeakResult:
        raise NotImplementedError("D-ID provider is not implemented yet. Use heygen or mock.")

    def close_session(self, session_id: str, config: dict) -> None:
        raise NotImplementedError("D-ID provider is not implemented yet. Use heygen or mock.")

    def get_stream_url(self, session_id: str, config: dict) -> str | None:
        raise NotImplementedError("D-ID provider is not implemented yet. Use heygen or mock.")
