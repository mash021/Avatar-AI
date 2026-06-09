from pathlib import Path

import fitz

from app.services.parser import ParsedSection


def parse_pdf(file_path: str) -> list[ParsedSection]:
    sections: list[ParsedSection] = []
    doc = fitz.open(file_path)

    try:
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text("text")
            if not text.strip():
                continue
            sections.append(
                ParsedSection(
                    text=text,
                    source_page=page_index + 1,
                    metadata={"page": page_index + 1},
                )
            )
    finally:
        doc.close()

    return sections
