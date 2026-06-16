"""Tests for the embedding service.

The real OpenAI call is replaced by the autouse `mock_embeddings` fixture in
conftest.py, so these tests focus on the surrounding logic: the empty-input
short-circuit and the "embed only what's new" idempotency in
`embed_chunks_for_source`.
"""

import uuid

from app.db.session import SessionLocal
from app.models.chunk_embedding import ChunkEmbedding
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.services.embedding_service import embed_chunks_for_source, embed_texts


def _seed_chunk(db, content: str) -> KnowledgeChunk:
    chunk = KnowledgeChunk(
        source_type=ChunkSourceType.document,
        source_id=uuid.uuid4(),
        content=content,
        content_hash="embedhash" + uuid.uuid4().hex,
        token_count=10,
        language="en",
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


def test_embed_texts_empty_returns_empty():
    # No inputs means no work and (crucially) no client/network call.
    assert embed_texts([]) == []


def test_embed_chunks_for_source_creates_embedding():
    db = SessionLocal()
    try:
        chunk = _seed_chunk(db, "Knowledge content that needs an embedding.")

        count = embed_chunks_for_source(db, source_id=chunk.source_id)

        # Exactly one chunk was new, so one embedding should have been written.
        assert count == 1
        embedding = (
            db.query(ChunkEmbedding)
            .filter(ChunkEmbedding.chunk_id == chunk.id)
            .first()
        )
        assert embedding is not None
        # The mock returns 1536-dim vectors (text-embedding-3-small size).
        assert len(embedding.embedding) == 1536
    finally:
        db.close()


def test_embed_chunks_for_source_is_idempotent():
    db = SessionLocal()
    try:
        chunk = _seed_chunk(db, "Content embedded once, then re-run unchanged.")

        first = embed_chunks_for_source(db, source_id=chunk.source_id)
        # Second run with unchanged content should skip the already-embedded
        # chunk and report zero new embeddings.
        second = embed_chunks_for_source(db, source_id=chunk.source_id)

        assert first == 1
        assert second == 0
    finally:
        db.close()
