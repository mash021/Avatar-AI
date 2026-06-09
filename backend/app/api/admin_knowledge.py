import hashlib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.chunk_embedding import ChunkEmbedding
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.user import User
from app.schemas.knowledge import KnowledgeChunkEdit, KnowledgeChunkResponse
from app.services.embedding_service import embed_chunks_for_source
from app.services.kb_version_service import bump_kb_version
from app.services.language_service import detect_language
from app.services.text_cleaning_service import clean_text, estimate_token_count

router = APIRouter(prefix="/admin/knowledge", tags=["admin-knowledge"])


def _to_chunk_response(db: Session, chunk: KnowledgeChunk) -> KnowledgeChunkResponse:
    has_embedding = (
        db.query(ChunkEmbedding).filter(ChunkEmbedding.chunk_id == chunk.id).first()
        is not None
    )
    return KnowledgeChunkResponse(
        id=str(chunk.id),
        source_type=chunk.source_type.value,
        source_id=str(chunk.source_id),
        source_url=chunk.source_url,
        source_page=chunk.source_page,
        content=chunk.content,
        content_hash=chunk.content_hash,
        token_count=chunk.token_count,
        language=chunk.language,
        metadata=chunk.chunk_metadata or {},
        is_active=chunk.is_active,
        has_embedding=has_embedding,
        created_at=chunk.created_at,
    )


@router.get("", response_model=list[KnowledgeChunkResponse])
def list_knowledge_chunks(
    search: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[KnowledgeChunkResponse]:
    query = db.query(KnowledgeChunk).order_by(KnowledgeChunk.created_at.desc())

    if source_type:
        query = query.filter(KnowledgeChunk.source_type == source_type)
    if search:
        query = query.filter(KnowledgeChunk.content.ilike(f"%{search}%"))

    chunks = query.limit(200).all()
    return [_to_chunk_response(db, chunk) for chunk in chunks]


@router.put("/{chunk_id}", response_model=KnowledgeChunkResponse)
def update_knowledge_chunk(
    chunk_id: UUID,
    payload: KnowledgeChunkEdit,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> KnowledgeChunkResponse:
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    cleaned = clean_text(payload.content)
    chunk.content = cleaned
    chunk.content_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
    chunk.token_count = estimate_token_count(cleaned)
    chunk.language = detect_language(cleaned)

    db.query(ChunkEmbedding).filter(ChunkEmbedding.chunk_id == chunk.id).delete()
    db.flush()
    embed_chunks_for_source(db, source_id=chunk.source_id)
    bump_kb_version(db)
    db.commit()
    db.refresh(chunk)

    return _to_chunk_response(db, chunk)


@router.delete("/{chunk_id}", status_code=204)
def delete_knowledge_chunk(
    chunk_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> None:
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    chunk.is_active = False
    bump_kb_version(db)
    db.commit()
