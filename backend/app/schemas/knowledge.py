from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class KnowledgeChunkResponse(BaseModel):
    id: str
    source_type: str
    source_id: str
    source_url: str | None
    source_page: int | None
    content: str
    content_hash: str
    token_count: int
    language: str
    metadata: dict[str, Any]
    is_active: bool
    has_embedding: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeChunkUpdate(BaseModel):
    content: str | None = None
    is_active: bool | None = None


class KnowledgeChunkEdit(BaseModel):
    content: str = Field(min_length=20)
