from pydantic import BaseModel, Field

from app.models.parameter import ParameterEvidence
from app.schemas.parameter_rules import is_critical_parameter_key
from app.schemas.parameters import ParameterStatus


JUNIOR_EFFICIENCY_DIVISOR = 4


class UnconfirmedCriticalParameterError(RuntimeError):
    pass


class MissingSimulationInputError(RuntimeError):
    pass


class ConfirmedParameterSet(BaseModel):
    values: dict[str, str]
    unconfirmed_critical: list[str] = Field(default_factory=list)

    @classmethod
    def from_evidence(cls, evidence_records: list[ParameterEvidence]) -> "ConfirmedParameterSet":
        values: dict[str, str] = {}
        unconfirmed_critical: list[str] = []

        for evidence in evidence_records:
            is_critical = is_critical_parameter_key(evidence.key, evidence.critical)
            if evidence.status == ParameterStatus.CONFIRMED.value:
                values[evidence.key] = evidence.confirmed_value or evidence.value
                continue

            values[evidence.key] = evidence.value
            if is_critical:
                unconfirmed_critical.append(evidence.key)

        return cls(values=values, unconfirmed_critical=unconfirmed_critical)

    def require_float(self, key: str) -> float:
        if key not in self.values:
            raise KeyError(key)

        return float(self.values[key])


class LinePlan(BaseModel):
    line_type: str
    count: int
    base_output: float
    senior_workers: int
    senior_efficiency: float
    junior_efficiency_sum: float
    shift_bonus: float


class ProductPlan(BaseModel):
    product: str
    unit_margin: float
    target_market_capacity: float


class QuarterAction(BaseModel):
    quarter: str
    actions: list[str]
    cash_checks: list[str]


class SimulationResult(BaseModel):
    rule_bound: bool
    total_y1_capacity: float
    expected_gross_profit: float
    y1_quarters: list[QuarterAction]
    y2_y4_strategy: list[str]
    risk_checks: list[str]


class RuleEngine:
    def __init__(self, params: ConfirmedParameterSet):
        self.params = params

    def _assert_rule_ready(self) -> None:
        if self.params.unconfirmed_critical:
            missing_keys = ", ".join(self.params.unconfirmed_critical)
            raise UnconfirmedCriticalParameterError(
                f"Critical parameters must be confirmed before simulation: {missing_keys}"
            )

    def _assert_simulation_inputs(
        self,
        line_plan: LinePlan | None,
        product_plan: ProductPlan | None,
    ) -> None:
        missing_inputs: list[str] = []
        if line_plan is None:
            missing_inputs.append("line_plan")
        if product_plan is None:
            missing_inputs.append("product_plan")
        if missing_inputs:
            raise MissingSimulationInputError(
                f"Missing simulation input(s): {', '.join(missing_inputs)}"
            )

    def calculate_capacity(self, plan: LinePlan) -> float:
        return (
            plan.count
            * plan.base_output
            * (
                1
                + plan.junior_efficiency_sum / JUNIOR_EFFICIENCY_DIVISOR
                + plan.senior_workers * plan.senior_efficiency
            )
            * plan.shift_bonus
        )

    def simulate(
        self,
        line_plan: LinePlan | None = None,
        product_plan: ProductPlan | None = None,
    ) -> SimulationResult:
        self._assert_rule_ready()
        self._assert_simulation_inputs(line_plan=line_plan, product_plan=product_plan)

        total_capacity = self.calculate_capacity(line_plan)
        sellable_capacity = min(total_capacity, product_plan.target_market_capacity)
        expected_gross_profit = sellable_capacity * product_plan.unit_margin

        return SimulationResult(
            rule_bound=True,
            total_y1_capacity=total_capacity,
            expected_gross_profit=expected_gross_profit,
            y1_quarters=[
                QuarterAction(
                    quarter="Y1Q1",
                    actions=["确认研发、市场、产线和融资参数后启动年度计划"],
                    cash_checks=["检查初始现金、贷款上限和短贷利率"],
                ),
                QuarterAction(
                    quarter="Y1Q2",
                    actions=["按规则引擎产能计算结果执行生产准备"],
                    cash_checks=["复核季度现金流和到期负债"],
                ),
                QuarterAction(
                    quarter="Y1Q3",
                    actions=["按可销售产能匹配市场投放"],
                    cash_checks=["复核广告、材料和人工支出"],
                ),
                QuarterAction(
                    quarter="Y1Q4",
                    actions=["按市场容量上限核算交付和毛利"],
                    cash_checks=["复核年度结算和下一年现金缺口"],
                ),
            ],
            y2_y4_strategy=[
                "Y2-Y4策略必须继续使用已确认参数和规则引擎输出滚动计算",
            ],
            risk_checks=["研发和市场动作必须基于已确认参数"],
        )
