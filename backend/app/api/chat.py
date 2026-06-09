from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db_session
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.models.chat import ChatMessage, ChatSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.chat_logs import ChatMessageLog, ChatSessionDetail
from app.services.chat_service import process_chat_message

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db_session),
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


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db_session),
) -> ChatResponse:
    session_id = None
    if payload.session_id:
        try:
            session_id = UUID(payload.session_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid session_id") from exc

    try:
        session, assistant_msg, rag = process_chat_message(
            db,
            message=payload.message,
            session_id=session_id,
            language=payload.language,
        )
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ChatResponse(
        session_id=str(session.id),
        message_id=str(assistant_msg.id),
        reply=rag.answer,
        language=rag.language,
        had_context=rag.had_context,
        fallback_used=rag.fallback_used,
    )
