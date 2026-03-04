import asyncio
import logging
from datetime import datetime

from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(bind=True, max_retries=3)
def transcribe_recording_task(self, recording_id: int) -> None:
    """
    Celery task to transcribe a recording using the OpenAI Whisper API.

    Steps:
    1. Fetch the recording from the database.
    2. Set status to "transcribing".
    3. Call the Whisper API to transcribe the audio file.
    4. Generate a short title from the transcript using GPT-4o-mini.
    5. Update the recording with transcript, title, duration, and status="transcribed".
    6. On any error, set status="error" and store the error message.
    """
    # Import here to avoid circular imports and to allow Celery worker to start cleanly
    from app.database import SessionLocal
    from app.models.recording import Recording
    from app.services.transcription import generate_title, transcribe_audio

    db = SessionLocal()
    try:
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            logger.error(f"Recording {recording_id} not found")
            return

        # Update status to transcribing
        recording.status = "transcribing"
        recording.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Starting transcription for recording {recording_id}: {recording.file_path}")

        # Run async transcription in sync context
        transcript_text, duration = asyncio.run(transcribe_audio(recording.file_path))

        logger.info(f"Transcription complete for recording {recording_id}, generating title...")

        # Generate title from transcript
        title = asyncio.run(generate_title(transcript_text))

        # Update recording with results
        recording.transcript_text = transcript_text
        recording.duration = duration
        recording.title = title
        recording.status = "transcribed"
        recording.error_message = None
        recording.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Recording {recording_id} transcribed successfully. Title: '{title}'")

    except Exception as exc:
        logger.exception(f"Error transcribing recording {recording_id}: {exc}")
        db.rollback()

        # Update recording with error state
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = "error"
            recording.error_message = str(exc)
            recording.updated_at = datetime.utcnow()
            db.commit()

        # Optionally retry with exponential backoff
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for transcription of recording {recording_id}")
    finally:
        db.close()


@celery.task(bind=True, max_retries=3)
def summarize_recording_task(self, recording_id: int) -> None:
    """
    Celery task to generate a structured Markdown summary for a transcribed recording.

    Steps:
    1. Fetch the recording from the database.
    2. Set status to "summarizing".
    3. Call GPT-4o-mini to generate a structured Markdown summary.
    4. Update the recording with summary_text and status="summarized".
    5. On any error, roll back to status="transcribed" and store the error message.
    """
    from app.database import SessionLocal
    from app.models.recording import Recording
    from app.services.summary import generate_summary

    db = SessionLocal()
    try:
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            logger.error(f"Recording {recording_id} not found")
            return

        if not recording.transcript_text:
            logger.error(f"Recording {recording_id} has no transcript text")
            return

        title = recording.title or f"Recording {recording_id}"

        # Update status to summarizing
        recording.status = "summarizing"
        recording.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Starting summarization for recording {recording_id}")

        # Run async summary generation in sync context
        summary_text = asyncio.run(generate_summary(recording.transcript_text, title))

        # Update recording with summary
        recording.summary_text = summary_text
        recording.status = "summarized"
        recording.error_message = None
        recording.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Recording {recording_id} summarized successfully")

    except Exception as exc:
        logger.exception(f"Error summarizing recording {recording_id}: {exc}")
        db.rollback()

        # Roll back to transcribed state on failure
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = "transcribed"
            recording.error_message = f"Summarization failed: {str(exc)}"
            recording.updated_at = datetime.utcnow()
            db.commit()

        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for summarization of recording {recording_id}")
    finally:
        db.close()
