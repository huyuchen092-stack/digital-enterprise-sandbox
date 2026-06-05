from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    filename: str
    content_type: str
    stored_path: str
    status: str = "uploaded"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
