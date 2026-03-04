import openai

from app.config import settings


async def generate_summary(transcript: str, title: str) -> str:
    """
    Generate a structured Markdown summary of a recording transcript using GPT-4o-mini.

    The summary includes:
    - A main title heading
    - A brief overview (Samenvatting)
    - Key points (Belangrijke punten)
    - Action items (Actiepunten)

    Returns:
        A Markdown-formatted string.
    """
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert at summarizing spoken conversations and audio recordings. "
                    "You always respond in the same language as the transcript. "
                    "Create structured Markdown summaries with the following sections:\n\n"
                    "# {title}\n\n"
                    "## Samenvatting\n"
                    "A concise 2-4 sentence overview of the main topic and content.\n\n"
                    "## Belangrijke punten\n"
                    "A bullet list of the most important points discussed.\n\n"
                    "## Actiepunten\n"
                    "A bullet list of any action items, follow-ups, or decisions made. "
                    "If there are none, write 'Geen actiepunten geïdentificeerd.'\n\n"
                    "Use the exact section headers as shown above."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Please summarize the following transcript of a recording titled '{title}':\n\n"
                    f"{transcript}"
                ),
            },
        ],
        max_tokens=1500,
        temperature=0.3,
    )

    summary = response.choices[0].message.content or ""
    return summary.strip()
