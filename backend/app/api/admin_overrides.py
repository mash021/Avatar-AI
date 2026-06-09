from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.chat import ChatMessage
from app.models.response_override import ResponseOverride
from app.models.user import User
from app.schemas.chat_logs import ResponseOverrideCreate, ResponseOverrideResponse
from app.services.kb_version_service import bump_kb_version

router = APIRouter(prefix="/admin/overrides", tags=["admin-overrides"])


@router.get("", response_model=list[ResponseOverrideResponse])
def list_overrides(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[ResponseOverrideResponse]:
    overrides = (
        db.query(ResponseOverride)
        .order_by(ResponseOverride.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        ResponseOverrideResponse(
            id=str(o.id),
            original_message_id=str(o.original_message_id),
            improved_content=o.improved_content,
            notes=o.notes,
            is_active=o.is_active,
            created_at=o.created_at,
        )
        for o in overrides
    ]


@router.post("", response_model=ResponseOverrideResponse, status_code=201)
def create_override(
    payload: ResponseOverrideCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ResponseOverrideResponse:
    try:
        message_id = UUID(payload.original_message_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid message ID") from exc

    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    override = ResponseOverride(
        original_message_id=message_id,
        improved_content=payload.improved_content,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(override)
    bump_kb_version(db)
    db.commit()
    db.refresh(override)

    return ResponseOverrideResponse(
        id=str(override.id),
        original_message_id=str(override.original_message_id),
        improved_content=override.improved_content,
        notes=override.notes,
        is_active=override.is_active,
        created_at=override.created_at,
    )
