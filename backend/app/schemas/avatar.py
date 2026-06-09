from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AvatarPublicConfig(BaseModel):
    is_enabled: bool
    provider: str
    supports_stream: bool


class AvatarConfigResponse(BaseModel):
    id: str
    provider: str
    is_enabled: bool
    provider_config: dict[str, Any]
    updated_at: datetime
    has_api_key: bool


class AvatarConfigUpdate(BaseModel):
    provider: str = Field(pattern="^(mock|heygen|d-id|none)$")
    is_enabled: bool = False
    provider_config: dict[str, Any] = Field(default_factory=dict)


class AvatarSessionCreate(BaseModel):
    language: str = "auto"


class AvatarSessionResponse(BaseModel):
    session_id: str
    provider: str
    stream_url: str | None
    is_enabled: bool


class AvatarSpeakRequest(BaseModel):
    session_id: str
    text: str = Field(min_length=1, max_length=4000)
    language: str = "auto"


class AvatarSpeakResponse(BaseModel):
    session_id: str
    task_id: str | None
    status: str
    stream_url: str | None
    has_audio: bool


class AvatarStreamResponse(BaseModel):
    session_id: str
    stream_url: str | None
    status: str
    provider: str


class AvatarTestRequest(BaseModel):
    text: str = Field(default="Hello, I am your company assistant.", max_length=500)
    language: str = "en"
