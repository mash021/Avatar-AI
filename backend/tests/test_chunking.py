from app.services.chunking_service import chunk_text


def test_chunk_text_short():
    text = "Short text that fits in one chunk."
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_splits_long_content():
    text = "word " * 2000
    chunks = chunk_text(text, chunk_size=100, overlap=20)
    assert len(chunks) > 1
