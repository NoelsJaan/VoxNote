import math
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.recording import Recording
from app.models.user import User
from app.schemas.recording import (
    RecordingList,
    RecordingListPage,
    RecordingResponse,
    RecordingUpdate,
)
from app.tasks.tasks import summarize_recording_task, transcribe_recording_task

router = APIRouter(prefix="/recordings", tags=["recordings"])

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/aac",
    "audio/mp4",
    "audio/x-m4a",
    "video/mp4",  # mp4 files are sometimes detected as video/mp4
    "application/octet-stream",  # fallback for some clients
}


@router.get("/", response_model=RecordingListPage)
def list_recordings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> RecordingListPage:
    """List all recordings belonging to the current user, paginated."""
    total = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .count()
    )
    items = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .order_by(Recording.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = math.ceil(total / page_size) if total > 0 else 1
    return RecordingListPage(
        items=[RecordingList.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecordingResponse:
    """Upload an audio file, save it, create a recording record, and queue transcription."""
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # Read file content (with size limit check)
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    # Determine file extension
    original_filename = file.filename or "recording"
    ext = os.path.splitext(original_filename)[1].lower() or ".audio"

    # Save file with unique name
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create recording record
    recording = Recording(
        user_id=current_user.id,
        file_path=file_path,
        original_filename=original_filename,
        status="uploaded",
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    # Queue transcription task
    transcribe_recording_task.delay(recording.id)

    return RecordingResponse.model_validate(recording)


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(
    recording_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecordingResponse:
    """Get detailed information for a single recording."""
    recording = _get_user_recording(recording_id, current_user.id, db)
    return RecordingResponse.model_validate(recording)


@router.patch("/{recording_id}", response_model=RecordingResponse)
def update_recording(
    recording_id: int,
    update_data: RecordingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecordingResponse:
    """Update the title of a recording."""
    recording = _get_user_recording(recording_id, current_user.id, db)

    if update_data.title is not None:
        recording.title = update_data.title

    db.commit()
    db.refresh(recording)
    return RecordingResponse.model_validate(recording)


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recording(
    recording_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a recording and its associated audio file."""
    recording = _get_user_recording(recording_id, current_user.id, db)

    # Delete the audio file from disk
    if os.path.exists(recording.file_path):
        try:
            os.remove(recording.file_path)
        except OSError:
            pass  # Log but don't fail if file is already gone

    db.delete(recording)
    db.commit()


@router.post("/{recording_id}/summarize", response_model=RecordingResponse)
def request_summary(
    recording_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecordingResponse:
    """Trigger AI summary generation for a transcribed recording."""
    recording = _get_user_recording(recording_id, current_user.id, db)

    if recording.status not in ("transcribed", "summarized"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot summarize a recording with status '{recording.status}'. "
                   "Recording must be in 'transcribed' or 'summarized' state.",
        )

    if not recording.transcript_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording has no transcript text to summarize",
        )

    # Queue summarization task
    summarize_recording_task.delay(recording.id)

    db.refresh(recording)
    return RecordingResponse.model_validate(recording)


@router.get("/{recording_id}/audio")
def stream_audio(
    recording_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    """Stream or download the raw audio file for a recording."""
    recording = _get_user_recording(recording_id, current_user.id, db)

    if not os.path.exists(recording.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found on disk",
        )

    ext = os.path.splitext(recording.file_path)[1].lower()
    media_type_map = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".aac": "audio/aac",
        ".m4a": "audio/mp4",
        ".mp4": "audio/mp4",
        ".webm": "audio/webm",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=recording.file_path,
        media_type=media_type,
        filename=recording.original_filename,
    )


@router.get("/{recording_id}/summary/download")
def download_summary(
    recording_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    """Download the recording summary as a Markdown file."""
    recording = _get_user_recording(recording_id, current_user.id, db)

    if not recording.summary_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary available for this recording",
        )

    # Write summary to a temporary file
    safe_title = (recording.title or f"recording_{recording.id}").replace("/", "_").replace(" ", "_")
    summary_filename = f"{safe_title}_summary.md"
    summary_path = os.path.join(settings.UPLOAD_DIR, f"summary_{recording.id}.md")

    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(recording.summary_text)

    return FileResponse(
        path=summary_path,
        media_type="text/markdown",
        filename=summary_filename,
    )


def _get_user_recording(recording_id: int, user_id: int, db: Session) -> Recording:
    """Helper: fetch a recording by ID, ensuring it belongs to the given user."""
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found",
        )
    if recording.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return recording
