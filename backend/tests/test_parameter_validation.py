import pytest

from app.models.document import Document
from app.models.parameter import ParameterEvidence
from app.models.project import Project
from app.models.simulation import SimulationRun
from app.schemas.parameters import ConfirmParameterRequest
from app.schemas.parameters import ParameterCandidate, ParameterStatus


def test_low_confidence_critical_parameter_requires_confirmation():
    candidate = ParameterCandidate(
        key="loan.short_rate",
        label="短贷利率",
        value="0.05",
        unit="ratio",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="影响季度现金流和到期本息",
        critical=True,
    )

    assert candidate.status == ParameterStatus.REQUIRES_CONFIRMATION


def test_high_confidence_noncritical_parameter_can_be_candidate():
    candidate = ParameterCandidate(
        key="document.note",
        label="备注",
        value="市场说明",
        unit=None,
        source_file="market.docx",
        source_location="paragraph 2",
        confidence=0.93,
        impact="辅助解释",
        critical=False,
    )

    assert candidate.status == ParameterStatus.CANDIDATE


def test_parameter_without_source_is_rejected():
    with pytest.raises(ValueError, match="source_file"):
        ParameterCandidate(
            key="market.capacity.y1.p2",
            label="Y1 P2 容量",
            value="120",
            unit="unit",
            source_file="",
            source_location="page 1",
            confidence=0.9,
            impact="影响广告和产能",
            critical=True,
        )


def test_explicit_confirmed_low_confidence_critical_parameter_requires_confirmation():
    candidate = ParameterCandidate(
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        unit="ratio",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=True,
        status=ParameterStatus.CONFIRMED,
    )

    assert candidate.status == ParameterStatus.REQUIRES_CONFIRMATION


def test_explicit_candidate_low_confidence_critical_parameter_requires_confirmation():
    candidate = ParameterCandidate(
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        unit="ratio",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=True,
        status=ParameterStatus.CANDIDATE,
    )

    assert candidate.status == ParameterStatus.REQUIRES_CONFIRMATION


def test_known_critical_candidate_cannot_be_downgraded_by_model_flag():
    candidate = ParameterCandidate(
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        unit="ratio",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=False,
    )

    assert candidate.critical is True
    assert candidate.status == ParameterStatus.REQUIRES_CONFIRMATION


@pytest.mark.parametrize(
    ("field", "request_data"),
    [
        (
            "key",
            {
                "key": " ",
                "confirmed_value": "0.05",
                "confirmed_by": "user",
            },
        ),
        (
            "confirmed_value",
            {
                "key": "loan.short_rate",
                "confirmed_value": " ",
                "confirmed_by": "user",
            },
        ),
        (
            "confirmed_by",
            {
                "key": "loan.short_rate",
                "confirmed_value": "0.05",
                "confirmed_by": " ",
            },
        ),
    ],
)
def test_confirm_parameter_request_rejects_blank_fields(field, request_data):
    with pytest.raises(ValueError, match=field):
        ConfirmParameterRequest(**request_data)


def test_new_model_timestamps_are_timezone_aware_utc():
    records = [
        Project(name="Scenario A"),
        Document(
            project_id=1,
            filename="rules.pdf",
            content_type="application/pdf",
            stored_path="/tmp/rules.pdf",
        ),
        ParameterEvidence(
            project_id=1,
            key="loan.short_rate",
            label="Short loan rate",
            value="0.05",
            source_file="rules.pdf",
            source_location="page 3",
            confidence=0.9,
            impact="Affects cash flow",
        ),
        SimulationRun(project_id=1, status="created", result_json="{}"),
    ]

    for record in records:
        assert record.created_at.tzinfo is not None
        assert record.created_at.utcoffset().total_seconds() == 0


def test_parameter_evidence_from_low_confidence_critical_candidate_requires_confirmation():
    candidate = ParameterCandidate(
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        unit="ratio",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=True,
    )

    evidence = ParameterEvidence.from_candidate(project_id=1, candidate=candidate)

    assert evidence.status == "requires_confirmation"


def test_direct_low_confidence_critical_parameter_evidence_requires_confirmation():
    evidence = ParameterEvidence(
        project_id=1,
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=True,
    )

    assert evidence.status == "requires_confirmation"


def test_direct_high_confidence_critical_parameter_evidence_can_remain_candidate():
    evidence = ParameterEvidence(
        project_id=1,
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.95,
        impact="Affects quarterly cash flow",
        critical=True,
    )

    assert evidence.status == "candidate"


def test_direct_confirmed_low_confidence_critical_parameter_evidence_requires_confirmation():
    evidence = ParameterEvidence(
        project_id=1,
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        source_file="rules.pdf",
        source_location="page 3",
        confidence=0.55,
        impact="Affects quarterly cash flow",
        critical=True,
        status="confirmed",
    )

    assert evidence.status == "requires_confirmation"


def test_model_validate_confirmed_low_confidence_critical_parameter_evidence_requires_confirmation():
    evidence = ParameterEvidence.model_validate(
        {
            "project_id": 1,
            "key": "loan.short_rate",
            "label": "Short loan rate",
            "value": "0.05",
            "source_file": "rules.pdf",
            "source_location": "page 3",
            "confidence": 0.55,
            "impact": "Affects quarterly cash flow",
            "critical": True,
            "status": "confirmed",
        }
    )

    assert evidence.status == "requires_confirmation"


def test_model_validate_string_confidence_low_confidence_critical_evidence_requires_confirmation():
    evidence = ParameterEvidence.model_validate(
        {
            "project_id": 1,
            "key": "loan.short_rate",
            "label": "Short loan rate",
            "value": "0.05",
            "source_file": "rules.pdf",
            "source_location": "page 3",
            "confidence": "0.55",
            "impact": "Affects quarterly cash flow",
            "critical": True,
            "status": "confirmed",
        }
    )

    assert evidence.status == "requires_confirmation"


def test_known_critical_evidence_cannot_be_downgraded_by_string_false_flag():
    evidence = ParameterEvidence.model_validate(
        {
            "project_id": 1,
            "key": "loan.short_rate",
            "label": "Short loan rate",
            "value": "0.05",
            "source_file": "rules.pdf",
            "source_location": "page 3",
            "confidence": "0.55",
            "impact": "Affects quarterly cash flow",
            "critical": "false",
            "status": "confirmed",
        }
    )

    assert evidence.critical is True
    assert evidence.status == "requires_confirmation"


def test_unknown_noncritical_evidence_can_remain_confirmed_with_string_false_flag():
    evidence = ParameterEvidence.model_validate(
        {
            "project_id": 1,
            "key": "document.note",
            "label": "Document note",
            "value": "Market description",
            "source_file": "rules.pdf",
            "source_location": "page 3",
            "confidence": "0.55",
            "impact": "Context only",
            "critical": "false",
            "status": "confirmed",
        }
    )

    assert evidence.critical is False
    assert evidence.status == "confirmed"


def test_direct_string_confidence_low_confidence_critical_evidence_requires_confirmation():
    evidence = ParameterEvidence(
        project_id=1,
        key="loan.short_rate",
        label="Short loan rate",
        value="0.05",
        source_file="rules.pdf",
        source_location="page 3",
        confidence="0.55",
        impact="Affects quarterly cash flow",
        critical=True,
        status="confirmed",
    )

    assert evidence.status == "requires_confirmation"
