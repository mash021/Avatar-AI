from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1, max_length=4000)
    language: str = "auto"


class ChatResponse(BaseModel):
    session_id: str
    message_id: str
    reply: str
    language: str
    had_context: bool
    fallback_used: bool
