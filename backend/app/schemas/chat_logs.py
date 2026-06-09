from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessageLog(BaseModel):
    id: str
    role: str
    content: str
    language: str
    had_context: bool
    fallback_used: bool
    created_at: datetime


class ChatSessionSummary(BaseModel):
    id: str
    session_token: str
    language: str
    message_count: int
    started_at: datetime
    last_message_at: datetime | None


class ChatSessionDetail(BaseModel):
    id: str
    session_token: str
    language: str
    started_at: datetime
    messages: list[ChatMessageLog]


class ResponseOverrideCreate(BaseModel):
    original_message_id: str
    improved_content: str = Field(min_length=10)
    notes: str | None = None


class ResponseOverrideResponse(BaseModel):
    id: str
    original_message_id: str
    improved_content: str
    notes: str | None
    is_active: bool
    created_at: datetime
