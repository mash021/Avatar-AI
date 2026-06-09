from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class UrlCreate(BaseModel):
    url: HttpUrl
    label: str = Field(min_length=1, max_length=255)
    scrape_depth: int = Field(default=1, ge=1, le=5)


class UrlUpdate(BaseModel):
    url: HttpUrl | None = None
    label: str | None = Field(default=None, min_length=1, max_length=255)
    scrape_depth: int | None = Field(default=None, ge=1, le=5)
    status: str | None = None


class UrlResponse(BaseModel):
    id: str
    url: str
    label: str
    scrape_depth: int
    last_scraped_at: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
