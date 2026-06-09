import secrets
import uuid

from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession, MessageRole, MessageSource
from app.providers.llm.base import LLMProvider
from app.services.language_service import detect_language
from app.services.rag_service import RAGResponse, generate_answer


def get_or_create_session(
    db: Session,
    session_id: uuid.UUID | None = None,
    language: str = "auto",
) -> ChatSession:
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            return session

    session = ChatSession(
        session_token=secrets.token_hex(32),
        language=language,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def process_chat_message(
    db: Session,
    message: str,
    session_id: uuid.UUID | None = None,
    language: str = "auto",
    llm: LLMProvider | None = None,
) -> tuple[ChatSession, ChatMessage, RAGResponse]:
    session = get_or_create_session(db, session_id, language)
    detected = detect_language(message) if language == "auto" else language

    user_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.user,
        content=message,
        language=detected,
    )
    db.add(user_msg)
    db.flush()

    rag_response = generate_answer(db, message, language=language, llm=llm)

    assistant_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.assistant,
        content=rag_response.answer,
        language=rag_response.language,
        had_context=rag_response.had_context,
        fallback_used=rag_response.fallback_used,
    )
    db.add(assistant_msg)
    db.flush()

    for source in rag_response.sources:
        db.add(
            MessageSource(
                message_id=assistant_msg.id,
                chunk_id=uuid.UUID(source.chunk_id),
                similarity_score=source.similarity_score,
                rank=source.rank,
            )
        )

    session.language = rag_response.language
    db.commit()
    db.refresh(session)
    db.refresh(assistant_msg)

    return session, assistant_msg, rag_response
