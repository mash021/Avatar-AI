from pydantic import BaseModel, Field


class STTResponse(BaseModel):
    text: str
    language: str


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: str = "auto"
    voice_id: str | None = None


class TTSResponse(BaseModel):
    cache_hit: bool
    content_type: str = "audio/mpeg"
