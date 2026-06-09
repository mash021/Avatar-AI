from docx import Document as DocxDocument

from app.services.parser import ParsedSection


def parse_docx(file_path: str) -> list[ParsedSection]:
    doc = DocxDocument(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    if not paragraphs:
        return []

    text = "\n\n".join(paragraphs)
    return [
        ParsedSection(
            text=text,
            source_page=1,
            metadata={"paragraph_count": len(paragraphs)},
        )
    ]
