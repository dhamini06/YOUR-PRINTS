from fastapi import APIRouter
from app.api.v1.investigations import router as investigations_router
from app.api.v1.opt_out import router as opt_out_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(investigations_router)
api_v1_router.include_router(opt_out_router)

__all__ = ["api_v1_router"]
