from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.database import engine, Base
from app.domain.schemas import HealthResponse, ErrorResponse, ErrorDetail
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up engine on shutdown
    await engine.dispose()


app = FastAPI(
    title="YOUR-PRINTS API",
    description="Digital Footprint Intelligence Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Ensure HTTPExceptions conform to standard ErrorResponse schema."""
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
            }
        },
    )


# Mount API routers
app.include_router(api_v1_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def healthcheck():
    """System health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
    )
