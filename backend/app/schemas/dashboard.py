from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_urls: int
    total_documents: int
    active_jobs: int
    failed_jobs: int
    completed_jobs: int
