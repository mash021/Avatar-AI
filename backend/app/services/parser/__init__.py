from dataclasses import dataclass, field
from typing import Any


@dataclass
class ParsedSection:
    text: str
    source_page: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
