from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecordingResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    file_path: str
    original_filename: str
    duration: Optional[float]
    transcript_text: Optional[str]
    summary_text: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordingList(BaseModel):
    """Lighter schema for list views - omits large text fields."""
    id: int
    user_id: int
    title: Optional[str]
    original_filename: str
    duration: Optional[float]
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordingUpdate(BaseModel):
    title: Optional[str] = None


class RecordingListPage(BaseModel):
    items: list[RecordingList]
    total: int
    page: int
    page_size: int
    pages: int
