from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.chunk_embedding import ChunkEmbedding
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.response_override import ResponseOverride
from app.providers.llm.base import LLMProvider
from app.providers.llm.openai_provider import OpenAILLMProvider
from app.services.embedding_service import embed_texts
from app.services.language_service import detect_language

settings = get_settings()

SYSTEM_PROMPT = """You are a company assistant. Answer ONLY using the provided context.
- If the context does not contain enough information, respond with:
  EN: "I'm sorry, I don't have that information in our company knowledge base."
  AR: "عذراً، لا تتوفر لدي هذه المعلومات في قاعدة معرفة الشركة."
- Do not use outside knowledge. Do not guess or hallucinate.
- Respond in the same language as the user's question.
- Be concise, professional, and helpful.
- Do not mention that you are reading from "context" or "documents"."""

FALLBACK_EN = "I'm sorry, I don't have that information in our company knowledge base."
FALLBACK_AR = "عذراً، لا تتوفر لدي هذه المعلومات في قاعدة معرفة الشركة."


@dataclass
class RetrievedChunk:
    chunk_id: str
    content: str
    similarity_score: float
    rank: int
    source_url: str | None
    source_page: int | None


@dataclass
class RAGResponse:
    answer: str
    language: str
    had_context: bool
    fallback_used: bool
    sources: list[RetrievedChunk]


def _fallback_message(language: str) -> str:
    if language == "ar":
        return FALLBACK_AR
    return FALLBACK_EN


def retrieve_chunks(db: Session, query: str, top_k: int | None = None) -> list[RetrievedChunk]:
    k = top_k or settings.rag_top_k
    query_vector = embed_texts([query])[0]

    distance_expr = ChunkEmbedding.embedding.cosine_distance(query_vector)

    stmt = (
        select(KnowledgeChunk, ChunkEmbedding, distance_expr.label("distance"))
        .join(ChunkEmbedding, ChunkEmbedding.chunk_id == KnowledgeChunk.id)
        .where(KnowledgeChunk.is_active.is_(True))
        .order_by(distance_expr)
        .limit(k)
    )

    results = db.execute(stmt).all()
    retrieved: list[RetrievedChunk] = []

    for rank, (chunk, _embedding, distance) in enumerate(results, start=1):
        similarity = 1.0 - float(distance)
        if similarity < settings.rag_similarity_threshold:
            continue
        retrieved.append(
            RetrievedChunk(
                chunk_id=str(chunk.id),
                content=chunk.content,
                similarity_score=similarity,
                rank=rank,
                source_url=chunk.source_url,
                source_page=chunk.source_page,
            )
        )

    return retrieved


def _get_relevant_overrides(db: Session, query: str) -> list[str]:
    overrides = (
        db.query(ResponseOverride)
        .filter(ResponseOverride.is_active.is_(True))
        .order_by(ResponseOverride.created_at.desc())
        .limit(50)
        .all()
    )
    query_words = {word.lower() for word in query.split() if len(word) > 2}
    if not query_words:
        return []

    scored: list[tuple[int, str]] = []
    for override in overrides:
        content_lower = override.improved_content.lower()
        score = sum(1 for word in query_words if word in content_lower)
        if score > 0:
            scored.append((score, override.improved_content))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [content for _, content in scored[:3]]


def _build_context(chunks: list[RetrievedChunk], overrides: list[str] | None = None) -> str:
    parts = []
    for chunk in chunks:
        header = f"[Source {chunk.rank}"
        if chunk.source_page:
            header += f", page {chunk.source_page}"
        header += "]"
        parts.append(f"{header}\n{chunk.content}")

    if overrides:
        for idx, override in enumerate(overrides, start=1):
            parts.append(f"[Admin Refined Answer {idx}]\n{override}")

    return "\n\n---\n\n".join(parts)


def generate_answer(
    db: Session,
    query: str,
    language: str = "auto",
    llm: LLMProvider | None = None,
) -> RAGResponse:
    detected = detect_language(query) if language == "auto" else language
    chunks = retrieve_chunks(db, query)
    overrides = _get_relevant_overrides(db, query)

    if not chunks and not overrides:
        return RAGResponse(
            answer=_fallback_message(detected),
            language=detected,
            had_context=False,
            fallback_used=True,
            sources=[],
        )

    context = _build_context(chunks, overrides)
    provider = llm or OpenAILLMProvider()
    user_prompt = f"Context:\n{context}\n\nQuestion: {query}"

    try:
        answer = provider.generate(SYSTEM_PROMPT, user_prompt)
    except Exception:
        return RAGResponse(
            answer=_fallback_message(detected),
            language=detected,
            had_context=True,
            fallback_used=True,
            sources=chunks,
        )

    if not answer.strip():
        return RAGResponse(
            answer=_fallback_message(detected),
            language=detected,
            had_context=True,
            fallback_used=True,
            sources=chunks,
        )

    return RAGResponse(
        answer=answer.strip(),
        language=detected,
        had_context=True,
        fallback_used=False,
        sources=chunks,
    )
