import openai

from app.config import settings


async def transcribe_audio(file_path: str) -> tuple[str, float]:
    """
    Transcribe an audio file using the OpenAI Whisper API.

    Returns:
        A tuple of (transcript_text, duration_in_seconds).
    """
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
        )

    transcript_text: str = response.text
    duration: float = getattr(response, "duration", 0.0) or 0.0

    return transcript_text, duration


async def generate_title(transcript: str) -> str:
    """
    Generate a concise title (max 60 characters) from a transcript using GPT-4o-mini.
    Uses only the first 500 characters of the transcript to keep the prompt short.
    """
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    excerpt = transcript[:500]

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You generate concise, descriptive titles for audio recordings. "
                    "Respond with ONLY the title - no quotes, no explanation, no punctuation at the end. "
                    "Maximum 60 characters."
                ),
            },
            {
                "role": "user",
                "content": f"Generate a title for this audio recording transcript:\n\n{excerpt}",
            },
        ],
        max_tokens=30,
        temperature=0.3,
    )

    title = response.choices[0].message.content or "Untitled Recording"
    # Trim to 60 chars as a hard limit
    return title.strip()[:60]
