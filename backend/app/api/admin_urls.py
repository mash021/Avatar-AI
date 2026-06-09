from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db_session
from app.models.ingestion_job import IngestionJob, SourceType
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
from app.models.user import User
from app.models.website_url import UrlStatus, WebsiteUrl
from app.schemas.ingestion import IngestionTriggerResponse
from app.schemas.job import JobResponse
from app.schemas.url import UrlCreate, UrlResponse, UrlUpdate
from app.services.ingestion_service import create_url_ingestion_job
from app.services.task_queue import enqueue_url_ingestion

router = APIRouter(prefix="/admin/urls", tags=["admin-urls"])


def _to_url_response(url: WebsiteUrl) -> UrlResponse:
    return UrlResponse(
        id=str(url.id),
        url=url.url,
        label=url.label,
        scrape_depth=url.scrape_depth,
        last_scraped_at=url.last_scraped_at,
        status=url.status.value,
        created_at=url.created_at,
        updated_at=url.updated_at,
    )


@router.get("", response_model=list[UrlResponse])
def list_urls(
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> list[UrlResponse]:
    urls = db.query(WebsiteUrl).order_by(WebsiteUrl.created_at.desc()).all()
    return [_to_url_response(url) for url in urls]


@router.post("", response_model=UrlResponse, status_code=status.HTTP_201_CREATED)
def create_url(
    payload: UrlCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UrlResponse:
    url = WebsiteUrl(
        url=str(payload.url),
        label=payload.label,
        scrape_depth=payload.scrape_depth,
        created_by=current_user.id,
    )
    db.add(url)
    db.commit()
    db.refresh(url)
    return _to_url_response(url)


@router.put("/{url_id}", response_model=UrlResponse)
def update_url(
    url_id: UUID,
    payload: UrlUpdate,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> UrlResponse:
    url = db.query(WebsiteUrl).filter(WebsiteUrl.id == url_id).first()
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL not found")

    if payload.url is not None:
        url.url = str(payload.url)
    if payload.label is not None:
        url.label = payload.label
    if payload.scrape_depth is not None:
        url.scrape_depth = payload.scrape_depth
    if payload.status is not None:
        try:
            url.status = UrlStatus(payload.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status value",
            ) from exc

    db.commit()
    db.refresh(url)
    return _to_url_response(url)


@router.post("/{url_id}/scrape", response_model=IngestionTriggerResponse)
def scrape_url(
    url_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> IngestionTriggerResponse:
    url = db.query(WebsiteUrl).filter(WebsiteUrl.id == url_id).first()
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL not found")

    job = create_url_ingestion_job(db, url.id)
    enqueue_url_ingestion(job.id)
    db.refresh(job)

    return IngestionTriggerResponse(
        job=JobResponse(
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
        ),
        message="URL scrape queued",
    )


@router.delete("/{url_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_url(
    url_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> None:
    url = db.query(WebsiteUrl).filter(WebsiteUrl.id == url_id).first()
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL not found")

    db.query(IngestionJob).filter(
        IngestionJob.source_type == SourceType.url,
        IngestionJob.source_id == url.id,
    ).delete()
    db.query(KnowledgeChunk).filter(
        KnowledgeChunk.source_type == ChunkSourceType.url,
        KnowledgeChunk.source_id == url.id,
    ).delete()

    db.delete(url)
    db.commit()
