from langdetect import DetectorFactory, LangDetectException, detect

DetectorFactory.seed = 0

ARABIC_RANGE = range(0x0600, 0x06FF)


def _has_arabic_chars(text: str) -> bool:
    return any(ord(char) in ARABIC_RANGE for char in text)


def detect_language(text: str) -> str:
    if not text or not text.strip():
        return "mixed"

    sample = text[:2000]
    has_arabic = _has_arabic_chars(sample)
    has_latin = any(char.isascii() and char.isalpha() for char in sample)

    if has_arabic and has_latin:
        return "mixed"
    if has_arabic:
        return "ar"

    try:
        code = detect(sample)
        if code == "ar":
            return "ar"
        if code == "en":
            return "en"
    except LangDetectException:
        pass

    return "en" if has_latin else "mixed"
