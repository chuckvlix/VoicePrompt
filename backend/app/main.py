import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers.history import router as history_router
from app.routers.improve import router as improve_router
from app.routers.transcribe import router as transcribe_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("voiceprompt")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing VoicePrompt database at %s...", settings.sqlite_db_path)
    init_db()
    yield
    logger.info("VoicePrompt backend shutting down...")


app = FastAPI(
    title="VoicePrompt API",
    description="Backend API for speech-to-text dictation and LLM-powered tone refinement.",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router bundle
api_router = APIRouter(prefix="/api")


@api_router.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "VoicePrompt API"}


api_router.include_router(transcribe_router)
api_router.include_router(improve_router)
api_router.include_router(history_router)

app.include_router(api_router)
