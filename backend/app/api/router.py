from fastapi import APIRouter

from app.api import (
    admin_avatar,
    admin_chat_logs,
    admin_dashboard,
    admin_documents,
    admin_jobs,
    admin_knowledge,
    admin_overrides,
    admin_urls,
    auth,
    avatar,
    chat,
    health,
    voice,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(voice.router)
api_router.include_router(avatar.router)
api_router.include_router(admin_avatar.router)
api_router.include_router(admin_urls.router)
api_router.include_router(admin_documents.router)
api_router.include_router(admin_jobs.router)
api_router.include_router(admin_dashboard.router)
api_router.include_router(admin_knowledge.router)
api_router.include_router(admin_chat_logs.router)
api_router.include_router(admin_overrides.router)
