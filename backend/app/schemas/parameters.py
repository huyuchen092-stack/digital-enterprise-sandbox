from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.parameter_rules import is_critical_parameter_key


PARAMETER_CONFIRMATION_CONFIDENCE_THRESHOLD = 0.85


class ParameterStatus(StrEnum):
    CANDIDATE = "candidate"
    REQUIRES_CONFIRMATION = "requires_confirmation"
    CONFIRMED = "confirmed"
    CONFLICT = "conflict"
    REJECTED = "rejected"


class ParameterCandidate(BaseModel):
    key: str
    label: str
    value: str
    unit: str | None = None
    source_file: str
    source_location: str
    confidence: float = Field(ge=0, le=1)
    impact: str
    critical: bool = True
    status: ParameterStatus | None = None

    @field_validator("key", "label", "source_file", "source_location", "impact")
    @classmethod
    def reject_blank_strings(cls, value: str, info):
        if not value.strip():
            raise ValueError(f"{info.field_name} must not be blank")
        return value

    @model_validator(mode="after")
    def assign_status(self):
        self.critical = is_critical_parameter_key(self.key, self.critical)
        if self.critical and self.confidence < PARAMETER_CONFIRMATION_CONFIDENCE_THRESHOLD:
            self.status = ParameterStatus.REQUIRES_CONFIRMATION
        elif self.status is None:
            self.status = ParameterStatus.CANDIDATE
        return self


class ConfirmParameterRequest(BaseModel):
    key: str
    confirmed_value: str
    confirmed_by: str = "user"

    @field_validator("key", "confirmed_value", "confirmed_by")
    @classmethod
    def reject_blank_strings(cls, value: str, info):
        if not value.strip():
            raise ValueError(f"{info.field_name} must not be blank")
        return value
