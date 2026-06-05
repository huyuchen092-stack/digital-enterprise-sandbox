from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class SimulationRun(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    status: str
    result_json: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
