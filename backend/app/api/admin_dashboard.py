from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.document import Document
from app.models.ingestion_job import IngestionJob, JobStatus
from app.models.user import User
from app.models.website_url import WebsiteUrl
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> DashboardStats:
    return DashboardStats(
        total_urls=db.query(WebsiteUrl).count(),
        total_documents=db.query(Document).count(),
        active_jobs=db.query(IngestionJob)
        .filter(IngestionJob.status.in_([JobStatus.queued, JobStatus.processing]))
        .count(),
        failed_jobs=db.query(IngestionJob)
        .filter(IngestionJob.status == JobStatus.failed)
        .count(),
        completed_jobs=db.query(IngestionJob)
        .filter(IngestionJob.status == JobStatus.completed)
        .count(),
    )
