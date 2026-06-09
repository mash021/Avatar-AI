from datetime import datetime

from pydantic import BaseModel


class JobResponse(BaseModel):
    id: str
    source_type: str
    source_id: str
    status: str
    progress_pct: int
    chunks_created: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
