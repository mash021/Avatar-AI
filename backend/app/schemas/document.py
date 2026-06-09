from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size_bytes: int
    status: str
    error_message: str | None
    page_count: int | None
    created_at: datetime
    updated_at: datetime
    job_id: str | None = None

    model_config = {"from_attributes": True}
