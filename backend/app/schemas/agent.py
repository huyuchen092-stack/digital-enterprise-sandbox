from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.documents import ExtractedFragment
from app.schemas.parameters import ParameterCandidate


AgentTask = Literal[
    "first_year_plan",
    "market_analysis",
    "four_year_strategy",
    "product_analysis",
    "line_analysis",
    "advertising_strategy",
    "cashflow_check",
    "budget_check",
    "line_replacement",
    "general_question",
]


class AgentChatRequest(BaseModel):
    question: str = Field(min_length=1)
    project_id: int | None = None
    fragments: list[ExtractedFragment] = Field(default_factory=list)
    parameters: list[ParameterCandidate] = Field(default_factory=list)
    market_rows: list[dict[str, Any]] = Field(default_factory=list)
    rule_summary: dict[str, Any] = Field(default_factory=dict)
    max_context_chars: int = Field(default=28000, ge=4000, le=80000)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        question = value.strip()
        if not question:
            raise ValueError("question must not be blank")
        return question


class AgentChatResponse(BaseModel):
    task: AgentTask
    answer: str
    model: str
    warnings: list[str] = Field(default_factory=list)
    context_summary: list[str] = Field(default_factory=list)
