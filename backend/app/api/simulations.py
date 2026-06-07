from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.services.rule_engine import ConfirmedParameterSet, LinePlan, ProductPlan, RuleEngine, SimulationResult
from app.services.opening_strategy import (
    OpeningPlanRequest,
    OpeningPlanResult,
    generate_opening_plans,
    load_opening_rules_from_excel,
)
from app.services.budget_simulator import (
    BudgetSimulationRequest,
    BudgetSimulationResult,
    simulate_budget,
)

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


@router.post("/opening-plan", response_model=OpeningPlanResult)
def opening_plan(request: OpeningPlanRequest) -> OpeningPlanResult:
    if request.excel_path is None:
        raise HTTPException(status_code=400, detail="excel_path is required")

    excel_path = Path(request.excel_path)
    if not excel_path.exists():
        raise HTTPException(status_code=404, detail="excel_path not found")

    rules = load_opening_rules_from_excel(excel_path)
    return generate_opening_plans(
        rules=rules,
        target_products=request.target_products,
        max_lines=request.max_lines,
        market_demand=request.market_demand,
        competitor_capacities=request.competitor_capacities,
        loan_usage_rate=request.loan_usage_rate,
        include_mixed_lines=request.include_mixed_lines,
    )


@router.post("/budget-check", response_model=BudgetSimulationResult)
def budget_check(request: BudgetSimulationRequest) -> BudgetSimulationResult:
    return simulate_budget(request)
