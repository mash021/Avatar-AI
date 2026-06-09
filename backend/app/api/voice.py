from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.schemas.voice import STTResponse, TTSRequest
from app.services.voice_service import synthesize_speech, transcribe_audio

router = APIRouter(prefix="/voice", tags=["voice"])

MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/ogg",
    "video/webm",
    "application/octet-stream",
}


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
) -> STTResponse:
    if language not in {"auto", "en", "ar"}:
        raise HTTPException(status_code=400, detail="language must be auto, en, or ar")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {content_type}")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25 MB limit")

    filename = file.filename or "recording.webm"

    try:
        result = transcribe_audio(audio_bytes, filename, language)
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not result.text:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")

    return STTResponse(text=result.text, language=result.language)


@router.post("/tts")
def text_to_speech(payload: TTSRequest) -> Response:
    if payload.language not in {"auto", "en", "ar"}:
        raise HTTPException(status_code=400, detail="language must be auto, en, or ar")

    try:
        result = synthesize_speech(payload.text, payload.language, payload.voice_id)
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    headers = {
        "X-Cache-Hit": "true" if result.cache_hit else "false",
        "Content-Disposition": "inline; filename=speech.mp3",
    }
    return Response(content=result.audio_bytes, media_type=result.content_type, headers=headers)
