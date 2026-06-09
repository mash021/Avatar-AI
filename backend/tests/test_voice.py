from app.providers.stt.base import STTProvider, TranscriptionResult
from app.providers.tts.base import SynthesisResult, TTSProvider
from app.services.voice_service import synthesize_speech, transcribe_audio


class MockSTT(STTProvider):
    def transcribe(self, audio_bytes: bytes, filename: str, language: str = "auto") -> TranscriptionResult:
        return TranscriptionResult(
            text="What are your business hours?",
            language="en",
        )


class MockTTS(TTSProvider):
    def __init__(self) -> None:
        self.calls = 0

    def synthesize(self, text: str, language: str, voice_id: str | None = None) -> SynthesisResult:
        self.calls += 1
        return SynthesisResult(
            audio_bytes=b"fake-mp3-audio-bytes",
            content_type="audio/mpeg",
            cache_hit=False,
        )


def test_stt_endpoint(client, monkeypatch):
    import app.api.voice as voice_api

    monkeypatch.setattr(
        voice_api,
        "transcribe_audio",
        lambda audio_bytes, filename, language="auto": MockSTT().transcribe(
            audio_bytes, filename, language
        ),
    )

    response = client.post(
        "/api/v1/voice/stt",
        files={"file": ("recording.webm", b"fake-audio", "audio/webm")},
        data={"language": "en"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "What are your business hours?"
    assert data["language"] == "en"


def test_stt_endpoint_rejects_empty_file(client):
    response = client.post(
        "/api/v1/voice/stt",
        files={"file": ("empty.webm", b"", "audio/webm")},
    )
    assert response.status_code == 400


def test_tts_endpoint_with_mock_provider(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.voice_service.settings.file_storage_path", str(tmp_path))

    import app.api.voice as voice_api

    mock_tts = MockTTS()
    monkeypatch.setattr(
        voice_api,
        "synthesize_speech",
        lambda text, language="auto", voice_id=None: synthesize_speech(
            text, language, voice_id, provider=mock_tts
        ),
    )

    response = client.post(
        "/api/v1/voice/tts",
        json={"text": "Hello from TTS cache test.", "language": "en"},
    )
    assert response.status_code == 200
    assert response.content == b"fake-mp3-audio-bytes"
    assert response.headers.get("x-cache-hit") == "false"

    response2 = client.post(
        "/api/v1/voice/tts",
        json={"text": "Hello from TTS cache test.", "language": "en"},
    )
    assert response2.status_code == 200
    assert response2.headers.get("x-cache-hit") == "true"
    assert mock_tts.calls == 1


def test_transcribe_with_mock_provider():
    result = transcribe_audio(b"audio", "test.webm", "en", provider=MockSTT())
    assert result.text == "What are your business hours?"
    assert result.language == "en"


def test_synthesize_cache(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.voice_service.settings.file_storage_path", str(tmp_path))
    mock_tts = MockTTS()

    first = synthesize_speech("Cached phrase for testing.", "en", provider=mock_tts)
    second = synthesize_speech("Cached phrase for testing.", "en", provider=mock_tts)

    assert first.cache_hit is False
    assert second.cache_hit is True
    assert mock_tts.calls == 1
