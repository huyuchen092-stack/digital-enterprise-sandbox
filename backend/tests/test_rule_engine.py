import pytest
from pydantic import ValidationError

from app.models.parameter import ParameterEvidence
from app.schemas.parameters import ParameterStatus
from app.services.rule_engine import (
    ConfirmedParameterSet,
    LinePlan,
    MissingSimulationInputError,
    ProductPlan,
    RuleEngine,
    UnconfirmedCriticalParameterError,
)


def test_rule_engine_rejects_unconfirmed_critical_parameters():
    params = ConfirmedParameterSet(
        values={"loan.short_rate": "0.05"},
        unconfirmed_critical=["market.capacity.y1.p2"],
    )

    with pytest.raises(UnconfirmedCriticalParameterError, match="market.capacity.y1.p2"):
        RuleEngine(params).simulate()


def test_confirmed_parameter_set_derives_unconfirmed_critical_from_evidence():
    params = ConfirmedParameterSet.from_evidence(
        [
            ParameterEvidence(
                project_id=1,
                key="loan.short_rate",
                label="Short loan rate",
                value="0.05",
                source_file="rules.pdf",
                source_location="page 3",
                confidence=0.55,
                impact="Affects quarterly cash flow",
                critical=False,
            )
        ]
    )

    assert params.unconfirmed_critical == ["loan.short_rate"]
    with pytest.raises(UnconfirmedCriticalParameterError, match="loan.short_rate"):
        RuleEngine(params).simulate(
            line_plan=LinePlan(
                line_type="smart",
                count=4,
                base_output=10,
                senior_workers=2,
                senior_efficiency=1.0,
                junior_efficiency_sum=4,
                shift_bonus=1,
            ),
            product_plan=ProductPlan(product="P2", unit_margin=18, target_market_capacity=120),
        )


def test_confirmed_parameter_set_uses_confirmed_values_from_evidence():
    params = ConfirmedParameterSet.from_evidence(
        [
            ParameterEvidence(
                project_id=1,
                key="loan.short_rate",
                label="Short loan rate",
                value="0.04",
                source_file="rules.pdf",
                source_location="page 3",
                confidence=0.95,
                impact="Affects quarterly cash flow",
                critical=True,
                status=ParameterStatus.CONFIRMED.value,
                confirmed_value="0.05",
            )
        ]
    )

    assert params.values["loan.short_rate"] == "0.05"
    assert params.unconfirmed_critical == []


def test_rule_engine_calculates_capacity_and_y1_actions():
    params = ConfirmedParameterSet(
        values={
            "finance.initial_cash": "600",
            "finance.initial_equity": "300",
            "loan.multiplier": "3",
            "loan.short_rate": "0.05",
            "production.group_count": "8",
        },
        unconfirmed_critical=[],
    )
    engine = RuleEngine(params)
    result = engine.simulate(
        line_plan=LinePlan(
            line_type="smart",
            count=4,
            base_output=10,
            senior_workers=2,
            senior_efficiency=1.0,
            junior_efficiency_sum=4,
            shift_bonus=1,
        ),
        product_plan=ProductPlan(product="P2", unit_margin=18, target_market_capacity=120),
    )

    assert result.rule_bound is True
    assert result.y1_quarters[0].quarter == "Y1Q1"
    assert result.total_y1_capacity == 160
    assert "已确认参数" in result.risk_checks[0]


def test_rule_engine_rejects_missing_line_and_product_plans():
    params = ConfirmedParameterSet(values={"loan.short_rate": "0.05"}, unconfirmed_critical=[])

    with pytest.raises(MissingSimulationInputError) as exc_info:
        RuleEngine(params).simulate()

    message = str(exc_info.value)
    assert "line_plan" in message
    assert "product_plan" in message


def test_rule_engine_rejects_missing_product_plan():
    params = ConfirmedParameterSet(values={"loan.short_rate": "0.05"}, unconfirmed_critical=[])
    line_plan = LinePlan(
        line_type="smart",
        count=4,
        base_output=10,
        senior_workers=2,
        senior_efficiency=1.0,
        junior_efficiency_sum=4,
        shift_bonus=1,
    )

    with pytest.raises(MissingSimulationInputError, match="product_plan"):
        RuleEngine(params).simulate(line_plan=line_plan)


def test_line_plan_requires_capacity_affecting_inputs():
    with pytest.raises(ValidationError) as exc_info:
        LinePlan(line_type="smart", count=4, base_output=10)

    message = str(exc_info.value)
    assert "senior_workers" in message
    assert "senior_efficiency" in message
    assert "junior_efficiency_sum" in message
    assert "shift_bonus" in message


def test_rule_engine_explicit_zero_junior_efficiency_sum_contributes_zero_capacity_bonus():
    params = ConfirmedParameterSet(values={}, unconfirmed_critical=[])
    engine = RuleEngine(params)

    capacity = engine.calculate_capacity(
        LinePlan(
            line_type="smart",
            count=4,
            base_output=10,
            senior_workers=2,
            senior_efficiency=1.0,
            junior_efficiency_sum=0,
            shift_bonus=1,
        )
    )

    assert capacity == 120
