from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.dependencies import get_db_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db_session)) -> dict:
    settings = get_settings()

    db_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": settings.app_name,
        "environment": settings.app_env,
        "database": db_status,
    }
