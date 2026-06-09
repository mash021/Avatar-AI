from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TranscriptionResult:
    text: str
    language: str


class STTProvider(ABC):
    @abstractmethod
    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        language: str = "auto",
    ) -> TranscriptionResult:
        pass
