from pydantic import BaseModel

from app.schemas.job import JobResponse


class IngestionTriggerResponse(BaseModel):
    job: JobResponse
    message: str
