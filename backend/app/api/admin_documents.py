import hashlib
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.dependencies import get_current_user, get_db_session
from app.models.document import Document, DocumentStatus, FileType
from app.models.ingestion_job import IngestionJob, JobStatus, SourceType
from app.models.user import User
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.schemas.document import DocumentResponse
from app.schemas.ingestion import IngestionTriggerResponse
from app.schemas.job import JobResponse
from app.services.ingestion_service import create_document_ingestion_job
from app.services.task_queue import enqueue_document_ingestion

router = APIRouter(prefix="/admin/documents", tags=["admin-documents"])

ALLOWED_EXTENSIONS = {".pdf": FileType.pdf, ".docx": FileType.docx, ".xlsx": FileType.xlsx}
settings = get_settings()


def _to_document_response(document: Document, job_id: str | None = None) -> DocumentResponse:
    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        file_type=document.file_type.value,
        file_size_bytes=document.file_size_bytes,
        status=document.status.value,
        error_message=document.error_message,
        page_count=document.page_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
        job_id=job_id,
    )


def _get_file_type(filename: str) -> FileType:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: PDF, DOCX, XLSX",
        )
    return ALLOWED_EXTENSIONS[ext]


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    results = []
    for doc in documents:
        job = (
            db.query(IngestionJob)
            .filter(
                IngestionJob.source_type == SourceType.document,
                IngestionJob.source_id == doc.id,
            )
            .order_by(IngestionJob.created_at.desc())
            .first()
        )
        results.append(_to_document_response(doc, str(job.id) if job else None))
    return results


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    file_type = _get_file_type(file.filename)
    content = await file.read()
    file_size = len(content)
    file_hash = hashlib.sha256(content).hexdigest()

    existing = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing:
        job = (
            db.query(IngestionJob)
            .filter(
                IngestionJob.source_type == SourceType.document,
                IngestionJob.source_id == existing.id,
            )
            .order_by(IngestionJob.created_at.desc())
            .first()
        )
        return _to_document_response(existing, str(job.id) if job else None)

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
        )

    storage_dir = Path(settings.file_storage_path)
    storage_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4()}{Path(file.filename).suffix.lower()}"
    file_path = storage_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(content)

    document = Document(
        filename=file.filename,
        file_path=str(file_path),
        file_type=file_type,
        file_size_bytes=file_size,
        file_hash=file_hash,
        status=DocumentStatus.uploaded,
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.flush()

    job = IngestionJob(
        source_type=SourceType.document,
        source_id=document.id,
        status=JobStatus.queued,
    )
    db.add(job)
    db.commit()
    db.refresh(document)

    enqueue_document_ingestion(job.id)

    return _to_document_response(document, str(job.id))


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


@router.post("/{document_id}/reindex", response_model=IngestionTriggerResponse)
def reindex_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> IngestionTriggerResponse:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    job = create_document_ingestion_job(db, document.id)
    document.status = DocumentStatus.uploaded
    db.commit()

    enqueue_document_ingestion(job.id)
    db.refresh(job)

    return IngestionTriggerResponse(
        job=_to_job_response(job),
        message="Document reindex queued",
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> None:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.query(IngestionJob).filter(
        IngestionJob.source_type == SourceType.document,
        IngestionJob.source_id == document.id,
    ).delete()
    db.query(KnowledgeChunk).filter(
        KnowledgeChunk.source_type == ChunkSourceType.document,
        KnowledgeChunk.source_id == document.id,
    ).delete()

    db.delete(document)
    db.commit()
