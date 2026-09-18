from fastapi import APIRouter
from app.api.v1.investigations import router as investigations_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(investigations_router)

__all__ = ["api_v1_router"]
