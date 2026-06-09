from openai import APIConnectionError, AuthenticationError, OpenAI, OpenAIError, RateLimitError

from app.config import get_settings
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.providers.tts.base import SynthesisResult, TTSProvider

settings = get_settings()


class OpenAITTSProvider(TTSProvider):
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.openai_api_key
        if not key.strip():
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is not configured. Add your API key to backend/.env"
            )
        self._client = OpenAI(api_key=key)

    def _resolve_voice(self, language: str, voice_id: str | None) -> str:
        if voice_id:
            return voice_id
        if language == "ar":
            return settings.openai_tts_voice_ar
        return settings.openai_tts_voice_en

    def synthesize(self, text: str, language: str, voice_id: str | None = None) -> SynthesisResult:
        voice = self._resolve_voice(language, voice_id)

        try:
            response = self._client.audio.speech.create(
                model=settings.openai_tts_model,
                voice=voice,
                input=text,
                response_format="mp3",
            )
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
            raise OpenAIServiceError("Unable to reach OpenAI text-to-speech service") from exc

        return SynthesisResult(
            audio_bytes=response.content,
            content_type="audio/mpeg",
            cache_hit=False,
        )
