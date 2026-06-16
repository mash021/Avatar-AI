"""Tests for the chat orchestration service.

`chat_service` ties together session handling, language detection and the RAG
pipeline. To keep these tests deterministic we inject a fake LLM provider so no
network/OpenAI calls happen, and rely on the autouse embedding mock from
conftest.py for vector generation.
"""

import uuid

from app.db.session import SessionLocal
from app.models.chat import ChatMessage, MessageRole
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.providers.llm.base import LLMProvider
from app.services.chat_service import get_or_create_session, process_chat_message
from app.services.embedding_service import embed_chunks_for_source


class MockLLM(LLMProvider):
    """Deterministic LLM stand-in so answers don't depend on OpenAI."""

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        return "The company was founded in 2010."


def _seed_chunk(db, content: str) -> KnowledgeChunk:
    # Insert a knowledge chunk plus its embedding so retrieval has something to
    # match against during process_chat_message.
    chunk = KnowledgeChunk(
        source_type=ChunkSourceType.document,
        source_id=uuid.uuid4(),
        content=content,
        content_hash="chathash" + uuid.uuid4().hex,
        token_count=20,
        language="en",
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    embed_chunks_for_source(db, source_id=chunk.source_id)
    return chunk


def test_get_or_create_session_creates_new_session():
    db = SessionLocal()
    try:
        # No session_id provided -> a brand new session with a random token.
        session = get_or_create_session(db, session_id=None, language="en")
        assert session.id is not None
        assert session.language == "en"
        assert len(session.session_token) > 0
    finally:
        db.close()


def test_get_or_create_session_returns_existing_session():
    db = SessionLocal()
    try:
        created = get_or_create_session(db, language="en")
        # Passing a known id back should return the same row, not a new one.
        fetched = get_or_create_session(db, session_id=created.id)
        assert fetched.id == created.id
    finally:
        db.close()


def test_get_or_create_session_unknown_id_creates_new():
    db = SessionLocal()
    try:
        # A random, non-existent id must not crash; it falls back to creating
        # a fresh session instead.
        random_id = uuid.uuid4()
        session = get_or_create_session(db, session_id=random_id)
        assert session.id != random_id
    finally:
        db.close()


def test_process_chat_message_persists_user_and_assistant_messages():
    db = SessionLocal()
    try:
        _seed_chunk(
            db,
            "The company was founded in 2010 and builds bilingual AI assistants.",
        )

        session, assistant_msg, rag_response = process_chat_message(
            db,
            message="When was the company founded?",
            language="en",
            llm=MockLLM(),
        )

        # Both the user's question and the assistant reply should be stored.
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .all()
        )
        roles = {m.role for m in messages}
        assert MessageRole.user in roles
        assert MessageRole.assistant in roles

        # The returned assistant message must mirror the RAG answer.
        assert assistant_msg.content == rag_response.answer
        assert assistant_msg.role == MessageRole.assistant
    finally:
        db.close()


def test_process_chat_message_auto_detects_language():
    db = SessionLocal()
    try:
        # With language="auto" the service should detect Arabic from the text and
        # tag the stored user message accordingly.
        session, _assistant_msg, _rag = process_chat_message(
            db,
            message="مرحباً، متى تأسست الشركة؟",
            language="auto",
            llm=MockLLM(),
        )

        user_msg = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.session_id == session.id,
                ChatMessage.role == MessageRole.user,
            )
            .first()
        )
        assert user_msg is not None
        assert user_msg.language == "ar"
    finally:
        db.close()
