from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.models.user import User
from app.schemas.avatar import (
    AvatarConfigResponse,
    AvatarConfigUpdate,
    AvatarTestRequest,
)
from app.services import avatar_service
from app.services.avatar_service import _mask_config

router = APIRouter(prefix="/admin/avatar", tags=["admin-avatar"])


@router.get("/config", response_model=AvatarConfigResponse)
def get_admin_avatar_config(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> AvatarConfigResponse:
    row = avatar_service.get_or_create_avatar_config(db)
    config = row.provider_config or {}
    return AvatarConfigResponse(
        id=str(row.id),
        provider=row.provider,
        is_enabled=row.is_enabled,
        provider_config=_mask_config(config),
        updated_at=row.updated_at,
        has_api_key=bool(config.get("api_key")),
    )


@router.put("/config", response_model=AvatarConfigResponse)
def update_admin_avatar_config(
    payload: AvatarConfigUpdate,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> AvatarConfigResponse:
    if payload.provider == "d-id" and payload.is_enabled:
        raise HTTPException(
            status_code=400,
            detail="D-ID provider is not implemented yet. Use heygen or mock.",
        )

    row = avatar_service.update_avatar_config(
        db,
        {
            "provider": payload.provider,
            "is_enabled": payload.is_enabled,
            "provider_config": payload.provider_config,
        },
    )
    config = row.provider_config or {}
    return AvatarConfigResponse(
        id=str(row.id),
        provider=row.provider,
        is_enabled=row.is_enabled,
        provider_config=_mask_config(config),
        updated_at=row.updated_at,
        has_api_key=bool(config.get("api_key")),
    )


@router.post("/test")
def test_avatar(
    payload: AvatarTestRequest,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> Response:
    row = avatar_service.get_or_create_avatar_config(db)
    if not row.is_enabled:
        raise HTTPException(status_code=400, detail="Avatar is disabled")

    try:
        runtime = avatar_service.create_avatar_session(db, payload.language)
        result = avatar_service.speak_in_session(
            db,
            session_id=runtime.session.session_id,
            text=payload.text,
            language=payload.language,
        )
        avatar_service.close_avatar_session(runtime.session.session_id)
    except (OpenAIConfigurationError, OpenAIServiceError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(
        content=result.audio_bytes,
        media_type=result.audio_content_type,
        headers={"Content-Disposition": "inline; filename=avatar-test.mp3"},
    )
