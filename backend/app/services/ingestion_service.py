import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentStatus, FileType
from app.models.ingestion_job import IngestionJob, JobStatus, SourceType
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.models.website_url import UrlStatus, WebsiteUrl
from app.services.language_service import detect_language
from app.services.parser import ParsedSection
from app.services.parser.docx_parser import parse_docx
from app.services.parser.pdf_parser import parse_pdf
from app.services.parser.xlsx_parser import parse_xlsx
from app.services.scraper_service import scrape_website
from app.services.chunking_service import chunk_text
from app.services.embedding_service import embed_chunks_for_source
from app.services.kb_version_service import bump_kb_version
from app.services.text_cleaning_service import clean_text, estimate_token_count

logger = logging.getLogger(__name__)


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _delete_chunks_for_source(
    db: Session,
    source_type: ChunkSourceType,
    source_id: UUID,
) -> None:
    db.query(KnowledgeChunk).filter(
        KnowledgeChunk.source_type == source_type,
        KnowledgeChunk.source_id == source_id,
    ).delete()
    db.flush()


def _store_sections(
    db: Session,
    source_type: ChunkSourceType,
    source_id: UUID,
    sections: list[ParsedSection],
    source_url: str | None = None,
) -> int:
    stored = 0
    seen_hashes: set[str] = set()

    for section in sections:
        cleaned = clean_text(section.text)
        if not cleaned or len(cleaned) < 20:
            continue

        text_chunks = chunk_text(cleaned)
        for part_index, part in enumerate(text_chunks):
            part_cleaned = clean_text(part)
            if not part_cleaned or len(part_cleaned) < 20:
                continue

            content_hash = _content_hash(part_cleaned)
            if content_hash in seen_hashes:
                continue
            seen_hashes.add(content_hash)

            metadata = dict(section.metadata)
            metadata["part_index"] = part_index

            chunk = KnowledgeChunk(
                source_type=source_type,
                source_id=source_id,
                source_url=source_url,
                source_page=section.source_page,
                content=part_cleaned,
                content_hash=content_hash,
                token_count=estimate_token_count(part_cleaned),
                language=detect_language(part_cleaned),
                chunk_metadata=metadata,
            )
            db.add(chunk)
            stored += 1

    return stored


def _parse_document(document: Document) -> list[ParsedSection]:
    path = document.file_path
    if document.file_type == FileType.pdf:
        return parse_pdf(path)
    if document.file_type == FileType.docx:
        return parse_docx(path)
    if document.file_type == FileType.xlsx:
        return parse_xlsx(path)
    raise ValueError(f"Unsupported file type: {document.file_type}")


def _mark_job_processing(db: Session, job: IngestionJob) -> None:
    job.status = JobStatus.processing
    job.started_at = datetime.now(timezone.utc)
    job.progress_pct = 10
    db.commit()


def _mark_job_completed(db: Session, job: IngestionJob, chunks_created: int) -> None:
    job.status = JobStatus.completed
    job.progress_pct = 100
    job.chunks_created = chunks_created
    job.completed_at = datetime.now(timezone.utc)
    job.error_message = None
    db.commit()


def _mark_job_failed(db: Session, job: IngestionJob, error: str) -> None:
    job.status = JobStatus.failed
    job.error_message = error[:2000]
    job.completed_at = datetime.now(timezone.utc)
    db.commit()


def process_document_job(db: Session, job_id: UUID) -> None:
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise ValueError(f"Job not found: {job_id}")

    document = db.query(Document).filter(Document.id == job.source_id).first()
    if not document:
        _mark_job_failed(db, job, "Document not found")
        return

    try:
        _mark_job_processing(db, job)
        document.status = DocumentStatus.processing
        db.commit()

        if not Path(document.file_path).exists():
            raise FileNotFoundError(f"File not found: {document.file_path}")

        sections = _parse_document(document)
        _delete_chunks_for_source(db, ChunkSourceType.document, document.id)

        chunks_created = _store_sections(
            db,
            ChunkSourceType.document,
            document.id,
            sections,
        )

        document.status = DocumentStatus.indexed
        document.page_count = len(sections)
        document.error_message = None
        db.flush()

        embed_chunks_for_source(db, source_id=document.id)
        bump_kb_version(db)
        _mark_job_completed(db, job, chunks_created)
        db.commit()
    except Exception as exc:
        logger.exception("Document ingestion failed for job %s", job_id)
        document.status = DocumentStatus.failed
        document.error_message = str(exc)[:2000]
        _mark_job_failed(db, job, str(exc))
        db.commit()


def process_url_job(db: Session, job_id: UUID) -> None:
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise ValueError(f"Job not found: {job_id}")

    website_url = db.query(WebsiteUrl).filter(WebsiteUrl.id == job.source_id).first()
    if not website_url:
        _mark_job_failed(db, job, "Website URL not found")
        return

    try:
        _mark_job_processing(db, job)
        website_url.status = UrlStatus.active
        db.commit()

        sections = scrape_website(website_url.url, depth=website_url.scrape_depth)
        _delete_chunks_for_source(db, ChunkSourceType.url, website_url.id)

        chunks_created = _store_sections(
            db,
            ChunkSourceType.url,
            website_url.id,
            sections,
            source_url=website_url.url,
        )

        if chunks_created == 0:
            raise ValueError("No content extracted from website")

        website_url.last_scraped_at = datetime.now(timezone.utc)
        website_url.status = UrlStatus.active
        db.flush()

        embed_chunks_for_source(db, source_id=website_url.id)
        bump_kb_version(db)
        _mark_job_completed(db, job, chunks_created)
        db.commit()
    except Exception as exc:
        logger.exception("URL ingestion failed for job %s", job_id)
        website_url.status = UrlStatus.error
        _mark_job_failed(db, job, str(exc))
        db.commit()


def create_document_ingestion_job(db: Session, document_id: UUID) -> IngestionJob:
    job = IngestionJob(
        source_type=SourceType.document,
        source_id=document_id,
        status=JobStatus.queued,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def create_url_ingestion_job(db: Session, url_id: UUID) -> IngestionJob:
    job = IngestionJob(
        source_type=SourceType.url,
        source_id=url_id,
        status=JobStatus.queued,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
