from uuid import UUID

from app.db.session import SessionLocal
from app.services.ingestion_service import process_document_job, process_url_job
from app.workers.celery_app import celery_app


@celery_app.task(name="ingest.process_document")
def process_document_task(job_id: str) -> None:
    db = SessionLocal()
    try:
        process_document_job(db, UUID(job_id))
    finally:
        db.close()


@celery_app.task(name="ingest.process_url")
def process_url_task(job_id: str) -> None:
    db = SessionLocal()
    try:
        process_url_job(db, UUID(job_id))
    finally:
        db.close()
