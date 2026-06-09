from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SynthesisResult:
    audio_bytes: bytes
    content_type: str
    cache_hit: bool


class TTSProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, language: str, voice_id: str | None = None) -> SynthesisResult:
        pass
