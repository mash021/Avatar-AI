import io

from openai import APIConnectionError, AuthenticationError, OpenAI, OpenAIError, RateLimitError

from app.config import get_settings
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.providers.stt.base import STTProvider, TranscriptionResult
from app.services.language_service import detect_language

settings = get_settings()

WHISPER_LANGUAGE_MAP = {
    "en": "en",
    "ar": "ar",
    "auto": None,
}


class OpenAISTTProvider(STTProvider):
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.openai_api_key
        if not key.strip():
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is not configured. Add your API key to backend/.env"
            )
        self._client = OpenAI(api_key=key)

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        language: str = "auto",
    ) -> TranscriptionResult:
        whisper_lang = WHISPER_LANGUAGE_MAP.get(language)

        try:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = filename

            kwargs: dict = {
                "model": settings.openai_whisper_model,
                "file": audio_file,
                "response_format": "json",
            }
            if whisper_lang:
                kwargs["language"] = whisper_lang

            response = self._client.audio.transcriptions.create(**kwargs)
        except AuthenticationError as exc:
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is invalid. Check your API key in backend/.env"
            ) from exc
        except RateLimitError as exc:
            if "insufficient_quota" in str(exc).lower():
                raise OpenAIServiceError(
                    "OpenAI account has no remaining quota. Add billing/credits at platform.openai.com"
                ) from exc
            raise OpenAIServiceError("OpenAI rate limit reached. Please try again later.") from exc
        except (APIConnectionError, OpenAIError) as exc:
            raise OpenAIServiceError("Unable to reach OpenAI speech-to-text service") from exc

        text = (response.text or "").strip()
        detected = whisper_lang or detect_language(text) if text else "en"
        if detected not in {"en", "ar"}:
            detected = "en"

        return TranscriptionResult(text=text, language=detected)
