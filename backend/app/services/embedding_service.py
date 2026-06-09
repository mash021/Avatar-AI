import logging

from openai import OpenAI
from sqlalchemy.orm import Session

from openai import APIConnectionError, AuthenticationError, OpenAIError, RateLimitError

from app.config import get_settings
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.models.chunk_embedding import ChunkEmbedding
from app.models.knowledge_chunk import KnowledgeChunk

logger = logging.getLogger(__name__)
settings = get_settings()

BATCH_SIZE = 100


def _get_client() -> OpenAI:
    if not settings.openai_api_key.strip():
        raise OpenAIConfigurationError(
            "OPENAI_API_KEY is not configured. Add your API key to backend/.env"
        )
    return OpenAI(api_key=settings.openai_api_key)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    client = _get_client()
    try:
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=texts,
        )
    except AuthenticationError as exc:
        raise OpenAIConfigurationError(
            "OPENAI_API_KEY is invalid. Check your API key in backend/.env"
        ) from exc
    except RateLimitError as exc:
        if "insufficient_quota" in str(exc).lower():
            raise OpenAIServiceError(
                "OpenAI account has no remaining quota. Add billing/credits at platform.openai.com"
            ) from exc
        raise OpenAIServiceError("OpenAI rate limit reached. Please try again later.") from exc
    except (APIConnectionError, OpenAIError) as exc:
        raise OpenAIServiceError("Unable to reach OpenAI embedding service") from exc
    return [item.embedding for item in response.data]


def embed_chunks_for_source(db: Session, source_id=None) -> int:
    query = db.query(KnowledgeChunk).filter(KnowledgeChunk.is_active.is_(True))
    if source_id is not None:
        query = query.filter(KnowledgeChunk.source_id == source_id)

    chunks = query.all()
    embedded_count = 0

    to_embed: list[KnowledgeChunk] = []
    for chunk in chunks:
        existing = (
            db.query(ChunkEmbedding)
            .filter(
                ChunkEmbedding.chunk_id == chunk.id,
                ChunkEmbedding.content_hash == chunk.content_hash,
                ChunkEmbedding.model == settings.openai_embedding_model,
            )
            .first()
        )
        if existing:
            continue
        to_embed.append(chunk)

    for i in range(0, len(to_embed), BATCH_SIZE):
        batch = to_embed[i : i + BATCH_SIZE]
        try:
            vectors = embed_texts([c.content for c in batch])
        except Exception:
            logger.exception("Embedding batch failed")
            raise

        for chunk, vector in zip(batch, vectors):
            existing = (
                db.query(ChunkEmbedding)
                .filter(ChunkEmbedding.chunk_id == chunk.id)
                .first()
            )
            if existing:
                existing.embedding = vector
                existing.content_hash = chunk.content_hash
                existing.model = settings.openai_embedding_model
            else:
                db.add(
                    ChunkEmbedding(
                        chunk_id=chunk.id,
                        embedding=vector,
                        model=settings.openai_embedding_model,
                        content_hash=chunk.content_hash,
                    )
                )
            embedded_count += 1

    db.commit()
    return embedded_count
