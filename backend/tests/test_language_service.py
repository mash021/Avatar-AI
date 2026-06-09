from app.services.language_service import detect_language


def test_detect_english():
    assert detect_language("Hello, this is an English sentence about our company.") == "en"


def test_detect_arabic():
    text = "مرحباً، هذه شركة تقدم خدمات ممتازة للعملاء في المنطقة."
    assert detect_language(text) == "ar"


def test_detect_mixed():
    text = "Welcome مرحباً to our bilingual company page."
    assert detect_language(text) == "mixed"
