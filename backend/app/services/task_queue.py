from uuid import UUID

from app.workers.ingest_tasks import process_document_task, process_url_task


def enqueue_document_ingestion(job_id: UUID) -> None:
    process_document_task.delay(str(job_id))


def enqueue_url_ingestion(job_id: UUID) -> None:
    process_url_task.delay(str(job_id))
