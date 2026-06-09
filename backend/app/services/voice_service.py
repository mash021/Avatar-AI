import hashlib
from pathlib import Path

from app.config import get_settings
from app.providers.stt.base import STTProvider, TranscriptionResult
from app.providers.stt.openai_provider import OpenAISTTProvider
from app.providers.tts.base import SynthesisResult, TTSProvider
from app.providers.tts.openai_provider import OpenAITTSProvider
from app.services.language_service import detect_language

settings = get_settings()
TTS_PROVIDER_NAME = "openai"


def _tts_cache_dir() -> Path:
    cache_dir = Path(settings.file_storage_path) / "tts"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def _tts_cache_key(text: str, language: str, voice_id: str) -> str:
    payload = f"{text}|{language}|{voice_id}|{TTS_PROVIDER_NAME}|{settings.openai_tts_model}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _resolve_language(text: str, language: str) -> str:
    if language in {"en", "ar"}:
        return language
    detected = detect_language(text)
    return detected if detected in {"en", "ar"} else "en"


def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    language: str = "auto",
    provider: STTProvider | None = None,
) -> TranscriptionResult:
    stt = provider or OpenAISTTProvider()
    return stt.transcribe(audio_bytes, filename, language)


def synthesize_speech(
    text: str,
    language: str = "auto",
    voice_id: str | None = None,
    provider: TTSProvider | None = None,
) -> SynthesisResult:
    resolved_language = _resolve_language(text, language)
    tts = provider or OpenAITTSProvider()
    voice = voice_id or (
        settings.openai_tts_voice_ar
        if resolved_language == "ar"
        else settings.openai_tts_voice_en
    )

    cache_key = _tts_cache_key(text, resolved_language, voice)
    cache_path = _tts_cache_dir() / f"{cache_key}.mp3"
    if cache_path.exists():
        return SynthesisResult(
            audio_bytes=cache_path.read_bytes(),
            content_type="audio/mpeg",
            cache_hit=True,
        )

    result = tts.synthesize(text, resolved_language, voice_id)
    cache_path.write_bytes(result.audio_bytes)
    return SynthesisResult(
        audio_bytes=result.audio_bytes,
        content_type=result.content_type,
        cache_hit=False,
    )
