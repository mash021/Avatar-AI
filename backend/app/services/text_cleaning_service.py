import re
import unicodedata


def normalize_whitespace(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_boilerplate(text: str) -> str:
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            lines.append("")
            continue
        lower = stripped.lower()
        if lower in {"skip to content", "cookie policy", "accept cookies"}:
            continue
        lines.append(stripped)
    return "\n".join(lines)


def clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = remove_boilerplate(text)
    cleaned = normalize_whitespace(cleaned)
    return cleaned


def estimate_token_count(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)
