from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.dependencies import get_db_session
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.providers.avatar.factory import get_avatar_provider
from app.schemas.avatar import (
    AvatarPublicConfig,
    AvatarSessionCreate,
    AvatarSessionResponse,
    AvatarSpeakRequest,
    AvatarSpeakResponse,
    AvatarStreamResponse,
)
from app.services import avatar_service

router = APIRouter(prefix="/avatar", tags=["avatar"])

_ALLOWED_MODEL_HOSTS = {
    "models.readyplayer.me",
}


@router.get("/model")
async def proxy_avatar_model(
    url: str = Query(..., description="Remote GLB URL to proxy"),
) -> Response:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host not in _ALLOWED_MODEL_HOSTS:
        raise HTTPException(status_code=400, detail="Model host is not allowed")

    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Invalid model URL")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            upstream = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch avatar model: {exc}",
        ) from exc

    if upstream.status_code != 200:
        raise HTTPException(
            status_code=upstream.status_code,
            detail="Avatar model not found upstream",
        )

    content_type = upstream.headers.get("content-type", "model/gltf-binary")
    return Response(
        content=upstream.content,
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
        },
    )


@router.get("/config", response_model=AvatarPublicConfig)
def get_avatar_config(db: Session = Depends(get_db_session)) -> AvatarPublicConfig:
    data = avatar_service.get_public_config(db)
    return AvatarPublicConfig(**data)


@router.post("/session", response_model=AvatarSessionResponse)
def create_session(
    payload: AvatarSessionCreate,
    db: Session = Depends(get_db_session),
) -> AvatarSessionResponse:
    try:
        runtime = avatar_service.create_avatar_session(db, payload.language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AvatarSessionResponse(
        session_id=runtime.session.session_id,
        provider=runtime.provider_name,
        stream_url=runtime.session.stream_url,
        is_enabled=True,
    )


@router.post("/speak", response_model=AvatarSpeakResponse)
def speak(
    payload: AvatarSpeakRequest,
    db: Session = Depends(get_db_session),
) -> AvatarSpeakResponse:
    try:
        result = avatar_service.speak_in_session(
            db,
            session_id=payload.session_id,
            text=payload.text,
            language=payload.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (OpenAIConfigurationError, OpenAIServiceError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AvatarSpeakResponse(
        session_id=result.session_id,
        task_id=result.task_id,
        status=result.status,
        stream_url=result.stream_url,
        has_audio=bool(result.audio_bytes),
    )


@router.post("/speak/audio")
def speak_audio(
    payload: AvatarSpeakRequest,
    db: Session = Depends(get_db_session),
) -> Response:
    try:
        result = avatar_service.speak_in_session(
            db,
            session_id=payload.session_id,
            text=payload.text,
            language=payload.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (OpenAIConfigurationError, OpenAIServiceError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(
        content=result.audio_bytes,
        media_type=result.audio_content_type,
        headers={"Content-Disposition": "inline; filename=avatar-speech.mp3"},
    )


@router.get("/stream/{session_id}", response_model=AvatarStreamResponse)
def get_stream(
    session_id: str,
    db: Session = Depends(get_db_session),
) -> AvatarStreamResponse:
    runtime = avatar_service.get_session_stream(session_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Avatar session not found")

    provider = get_avatar_provider(runtime.provider_name)
    stream_url = provider.get_stream_url(session_id, runtime.config)

    return AvatarStreamResponse(
        session_id=session_id,
        stream_url=stream_url or runtime.session.stream_url,
        status="active",
        provider=runtime.provider_name,
    )


@router.delete("/session/{session_id}", status_code=204)
def close_session(session_id: str) -> None:
    avatar_service.close_avatar_session(session_id)
