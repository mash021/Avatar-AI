from app.config import get_settings

settings = get_settings()

CHARS_PER_TOKEN = 4


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[str]:
    size = chunk_size or settings.rag_chunk_size
    overlap_tokens = overlap or settings.rag_chunk_overlap

    char_size = size * CHARS_PER_TOKEN
    char_overlap = overlap_tokens * CHARS_PER_TOKEN

    if _estimate_tokens(text) <= size:
        return [text]

    chunks: list[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + char_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= text_len:
            break
        start = end - char_overlap

    return chunks
