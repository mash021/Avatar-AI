import pandas as pd

from app.services.parser import ParsedSection


def parse_xlsx(file_path: str) -> list[ParsedSection]:
    sections: list[ParsedSection] = []
    sheets = pd.read_excel(file_path, sheet_name=None, engine="openpyxl")

    for sheet_index, (sheet_name, df) in enumerate(sheets.items(), start=1):
        if df.empty:
            continue

        df = df.fillna("")
        rows = []
        headers = [str(col) for col in df.columns]
        rows.append(" | ".join(headers))

        for _, row in df.iterrows():
            rows.append(" | ".join(str(value) for value in row.tolist()))

        text = "\n".join(rows)
        if not text.strip():
            continue

        sections.append(
            ParsedSection(
                text=text,
                source_page=sheet_index,
                metadata={"sheet_name": sheet_name},
            )
        )

    return sections
