from datetime import UTC, datetime

from pydantic import model_validator
from sqlmodel import Field, SQLModel

from app.schemas.parameter_rules import coerce_bool, is_critical_parameter_key
from app.schemas.parameters import PARAMETER_CONFIRMATION_CONFIDENCE_THRESHOLD
from app.schemas.parameters import ParameterCandidate, ParameterStatus


class ParameterEvidence(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    key: str = Field(index=True)
    label: str
    value: str
    unit: str | None = None
    source_file: str
    source_location: str
    confidence: float
    impact: str
    critical: bool = True
    status: str = ParameterStatus.CANDIDATE.value
    confirmed_value: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def __init__(self, **data):
        super().__init__(**data)
        self._enforce_confirmation_status()

    @model_validator(mode="before")
    @classmethod
    def enforce_confirmation_status(cls, data):
        if isinstance(data, dict):
            data = data.copy()
            key = str(data.get("key", ""))
            data["critical"] = is_critical_parameter_key(
                key=key,
                supplied_critical=data.get("critical", True),
            )
            if cls._requires_confirmation(
                critical=data.get("critical", True),
                confidence=data.get("confidence"),
            ):
                data["status"] = ParameterStatus.REQUIRES_CONFIRMATION.value
        return data

    def _enforce_confirmation_status(self) -> None:
        self.critical = is_critical_parameter_key(self.key, self.critical)
        if self._requires_confirmation(self.critical, self.confidence):
            self.status = ParameterStatus.REQUIRES_CONFIRMATION.value

    @staticmethod
    def _requires_confirmation(critical: object, confidence: object) -> bool:
        parsed_critical = coerce_bool(critical)
        parsed_confidence = ParameterEvidence._coerce_float(confidence)
        return (
            parsed_critical
            and parsed_confidence is not None
            and parsed_confidence < PARAMETER_CONFIRMATION_CONFIDENCE_THRESHOLD
        )

    @staticmethod
    def _coerce_float(value: object) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def from_candidate(
        cls, project_id: int, candidate: ParameterCandidate
    ) -> "ParameterEvidence":
        return cls(
            project_id=project_id,
            key=candidate.key,
            label=candidate.label,
            value=candidate.value,
            unit=candidate.unit,
            source_file=candidate.source_file,
            source_location=candidate.source_location,
            confidence=candidate.confidence,
            impact=candidate.impact,
            critical=candidate.critical,
            status=candidate.status.value,
        )
