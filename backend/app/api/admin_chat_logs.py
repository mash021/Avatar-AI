from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User
from app.schemas.chat_logs import ChatMessageLog, ChatSessionDetail, ChatSessionSummary

router = APIRouter(prefix="/admin/chat-logs", tags=["admin-chat-logs"])


@router.get("", response_model=list[ChatSessionSummary])
def list_chat_logs(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[ChatSessionSummary]:
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.started_at.desc())
        .limit(limit)
        .all()
    )

    results: list[ChatSessionSummary] = []
    for session in sessions:
        message_count = (
            db.query(func.count(ChatMessage.id))
            .filter(ChatMessage.session_id == session.id)
            .scalar()
        )
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        results.append(
            ChatSessionSummary(
                id=str(session.id),
                session_token=session.session_token[:12] + "...",
                language=session.language,
                message_count=message_count or 0,
                started_at=session.started_at,
                last_message_at=last_msg.created_at if last_msg else None,
            )
        )

    return results


@router.get("/{session_id}", response_model=ChatSessionDetail)
def get_chat_session(
    session_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> ChatSessionDetail:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return ChatSessionDetail(
        id=str(session.id),
        session_token=session.session_token,
        language=session.language,
        started_at=session.started_at,
        messages=[
            ChatMessageLog(
                id=str(msg.id),
                role=msg.role.value,
                content=msg.content,
                language=msg.language,
                had_context=msg.had_context,
                fallback_used=msg.fallback_used,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
    )
