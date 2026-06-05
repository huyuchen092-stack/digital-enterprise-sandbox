from fastapi import APIRouter

from app.services.rule_engine import ConfirmedParameterSet, LinePlan, ProductPlan, RuleEngine, SimulationResult

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.get("/demo", response_model=SimulationResult)
def demo_simulation() -> SimulationResult:
    params = ConfirmedParameterSet(
        values={
            "finance.initial_cash": "600",
            "finance.initial_equity": "300",
            "loan.multiplier": "3",
            "loan.short_rate": "0.05",
            "production.group_count": "8",
        }
    )
    return RuleEngine(params).simulate(
        line_plan=LinePlan(
            line_type="智能线",
            count=4,
            base_output=10,
            senior_workers=2,
            senior_efficiency=1.0,
            junior_efficiency_sum=4,
            shift_bonus=1,
        ),
        product_plan=ProductPlan(product="P2", unit_margin=18, target_market_capacity=120),
    )
