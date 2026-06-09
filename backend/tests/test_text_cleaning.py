from app.services.text_cleaning_service import clean_text, estimate_token_count, normalize_whitespace


def test_normalize_whitespace():
    assert normalize_whitespace("hello   world\n\n\n\nfoo") == "hello world\n\nfoo"


def test_clean_text_removes_boilerplate():
    text = "Skip to content\n\nCompany Info\n\nWe help customers."
    result = clean_text(text)
    assert "Skip to content" not in result
    assert "Company Info" in result


def test_estimate_token_count():
    assert estimate_token_count("hello world test") >= 1
