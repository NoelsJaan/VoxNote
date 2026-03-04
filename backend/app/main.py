import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, recordings
from app.config import settings

app = FastAPI(
    title="VoxNote API",
    version="1.0.0",
    description="Voice recording transcription and summarization API",
)

# CORS middleware - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(recordings.router)


@app.on_event("startup")
async def startup_event() -> None:
    """Ensure required directories exist on startup."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
