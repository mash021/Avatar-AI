from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.ingestion_job import IngestionJob
from app.models.user import User
from app.schemas.job import JobResponse

router = APIRouter(prefix="/admin/jobs", tags=["admin-jobs"])


def _to_job_response(job: IngestionJob) -> JobResponse:
    return JobResponse(
        id=str(job.id),
        source_type=job.source_type.value,
        source_id=str(job.source_id),
        status=job.status.value,
        progress_pct=job.progress_pct,
        chunks_created=job.chunks_created,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
    )


@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[JobResponse]:
    jobs = db.query(IngestionJob).order_by(IngestionJob.created_at.desc()).all()
    return [_to_job_response(job) for job in jobs]


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> JobResponse:
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_job_response(job)
