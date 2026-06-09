import io
import uuid
from unittest.mock import patch

import fitz
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.chunk_embedding import ChunkEmbedding
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.providers.llm.base import LLMProvider
from app.services.embedding_service import embed_chunks_for_source
from app.services.rag_service import FALLBACK_EN, generate_answer, retrieve_chunks


class MockLLM(LLMProvider):
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        return "Our company provides excellent services to customers."


def _create_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _seed_chunk(db: Session, content: str) -> KnowledgeChunk:
    chunk = KnowledgeChunk(
        source_type=ChunkSourceType.document,
        source_id=uuid.uuid4(),
        content=content,
        content_hash="testhash" + str(uuid.uuid4()),
        token_count=50,
        language="en",
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    embed_chunks_for_source(db, source_id=chunk.source_id)
    return chunk


def test_retrieve_chunks_with_context():
    db = SessionLocal()
    try:
        content = (
            "Our company provides excellent cloud services and customer support "
            "for enterprise clients worldwide with 24/7 availability."
        )
        _seed_chunk(db, content)
        results = retrieve_chunks(db, "What services does the company provide?")
        assert len(results) >= 1
        assert results[0].similarity_score >= 0
    finally:
        db.close()


def test_generate_answer_fallback_without_context():
    db = SessionLocal()
    try:
        with patch("app.services.rag_service.retrieve_chunks", return_value=[]):
            response = generate_answer(
                db, "What is the CEO's favorite color?", llm=MockLLM()
            )
        assert response.fallback_used is True
        assert response.answer == FALLBACK_EN
    finally:
        db.close()


def test_generate_answer_with_mock_llm():
    db = SessionLocal()
    try:
        content = (
            "Company business hours are Monday to Friday 9 AM to 5 PM. "
            "We are closed on weekends and public holidays."
        )
        _seed_chunk(db, content)
        response = generate_answer(
            db,
            "What are the business hours?",
            llm=MockLLM(),
        )
        assert response.had_context is True
        assert "excellent services" in response.answer or response.fallback_used is False
    finally:
        db.close()


def test_chat_endpoint(client):
    db = SessionLocal()
    try:
        content = (
            "The company was founded in 2010 and specializes in AI solutions "
            "for bilingual customer support in Arabic and English."
        )
        _seed_chunk(db, content)
    finally:
        db.close()

    response = client.post(
        "/api/v1/chat",
        json={"message": "When was the company founded?", "language": "en"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "reply" in data


def test_chat_endpoint_missing_openai_key(client, monkeypatch):
    from app.exceptions import OpenAIConfigurationError

    def raise_missing_key(texts):
        raise OpenAIConfigurationError(
            "OPENAI_API_KEY is not configured. Add your API key to backend/.env"
        )

    monkeypatch.setattr("app.services.rag_service.embed_texts", raise_missing_key)

    response = client.post(
        "/api/v1/chat",
        json={"message": "Hello", "language": "en"},
    )
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_chat_endpoint_arabic_fallback(client, monkeypatch):
    monkeypatch.setattr("app.services.rag_service.retrieve_chunks", lambda db, query: [])

    response = client.post(
        "/api/v1/chat",
        json={"message": "ما هو لون المكتب؟", "language": "ar"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fallback_used"] is True


def test_document_upload_with_embeddings(client, auth_headers):
    text = (
        "Product catalog: Widget Pro costs 500 dollars and includes premium support "
        "with installation and training for all enterprise customers."
    )
    files = {"file": ("catalog.pdf", io.BytesIO(_create_pdf_bytes(text)), "application/pdf")}
    response = client.post(
        "/api/v1/admin/documents",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 201

    db = SessionLocal()
    try:
        count = db.query(ChunkEmbedding).count()
        assert count >= 1
    finally:
        db.close()
