from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class AvatarSession:
    session_id: str
    stream_url: str | None = None
    provider: str = "mock"
    metadata: dict = field(default_factory=dict)


@dataclass
class SpeakResult:
    session_id: str
    status: str
    stream_url: str | None = None
    audio_content_type: str = "audio/mpeg"
    audio_bytes: bytes = b""
    task_id: str | None = None


class AvatarProvider(ABC):
    name: str = "base"

    @abstractmethod
    def create_session(self, config: dict) -> AvatarSession:
        pass

    @abstractmethod
    def speak(
        self,
        session_id: str,
        text: str,
        language: str,
        config: dict,
        audio_bytes: bytes | None = None,
    ) -> SpeakResult:
        pass

    @abstractmethod
    def close_session(self, session_id: str, config: dict) -> None:
        pass

    @abstractmethod
    def get_stream_url(self, session_id: str, config: dict) -> str | None:
        pass
