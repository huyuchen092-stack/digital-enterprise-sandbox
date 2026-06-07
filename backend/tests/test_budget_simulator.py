from fastapi.testclient import TestClient

from app.main import app
from app.services.budget_simulator import (
    BudgetSimulationRequest,
    FinancingAction,
    FixedCost,
    IncentiveAction,
    LineBuildAction,
    LineRule,
    MaterialOrder,
    OrderPlan,
    ProductRule,
    ProductionAction,
    ResearchAction,
    ShortLoanAction,
    WorkerCostAction,
    simulate_budget,
)


def _base_request(advertising: float = 120_000) -> BudgetSimulationRequest:
    return BudgetSimulationRequest(
        initial_cash=1_000_000,
        quarters=4,
        line_rules={
            "auto": LineRule(
                name="auto",
                purchase_price=100_000,
                install_quarters=1,
                production_quarters=1,
                capacity_per_quarter=100,
                maintenance_fee=20_000,
            )
        },
        product_rules={
            "P1": ProductRule(
                name="P1",
                sale_price=8_000,
                material_cost=2_000,
                production_fee_per_unit=500,
                material_delivery_quarters=1,
                account_period_quarters=1,
                discount_rate=0.03,
            )
        },
        fixed_costs=[FixedCost(label="管理费", amount=20_000, start_quarter=1, repeat_every=1)],
        line_builds=[LineBuildAction(line_type="auto", count=4, quarter=1)],
        material_orders=[MaterialOrder(product="P1", quantity=200, order_quarter=1)],
        productions=[
            ProductionAction(product="P1", quantity=100, start_quarter=2, line_type="auto"),
            ProductionAction(product="P1", quantity=100, start_quarter=3, line_type="auto"),
        ],
        orders=[
            OrderPlan(
                order_id="Y1-P1-1-2",
                product="P1",
                quantity=200,
                advertising_quarter=2,
                advertising=advertising,
                delivery_quarter=4,
                combine_delivery_quarters=[1, 2],
                discount_on_delivery=True,
            )
        ],
        financing=[FinancingAction(quarter=1, amount=300_000, label="短贷")],
    )


def test_budget_simulator_runs_material_production_delivery_and_discounting():
    result = simulate_budget(_base_request())

    assert result.feasible is True
    assert result.minimum_cash >= 0
    assert result.orders[0].deliverable is True
    assert result.orders[0].discounted_cash > 0
    assert result.summary["first_year_advertising"] == 120_000
    assert result.summary["first_year_profit"] > 0

    q1, q2, q3, q4 = result.quarters
    assert q1.line_purchase == 400_000
    assert q2.material_payment == 400_000
    assert q2.advertising == 120_000
    assert q3.production_fee == 50_000
    assert q4.delivered_revenue == 1_600_000
    assert q4.discounted_cash == 1_552_000


def test_budget_simulator_marks_plan_infeasible_when_ad_breaks_cash_before_delivery():
    result = simulate_budget(_base_request(advertising=700_000))

    assert result.feasible is False
    assert result.minimum_cash < 0
    assert any("cash is negative" in note for note in result.risk_notes)
    assert result.orders[0].deliverable is True


def test_budget_simulator_checks_merged_order_coverage_period():
    request = _base_request(advertising=120_000)
    request.orders[0].combine_delivery_quarters = [1, 2, 3]
    request.orders[0].delivery_quarter = 4

    result = simulate_budget(request)

    order = result.orders[0]
    assert order.coverage_quarters == [1, 2, 3]
    assert order.minimum_coverage_cash == min(result.quarters[index - 1].ending_cash for index in [1, 2, 3])
    assert order.coverage_cash_ok is True


def test_budget_simulation_api_returns_feasibility():
    with TestClient(app) as client:
        response = client.post("/api/simulations/budget-check", json=_base_request().model_dump())

    assert response.status_code == 200
    data = response.json()
    assert data["feasible"] is True
    assert data["orders"][0]["deliverable"] is True


def test_budget_simulator_deducts_required_costs_before_ad_cash():
    request = _base_request(advertising=50_000)
    request.financing = []
    request.short_loans = [ShortLoanAction(quarter=1, amount=300_000, duration_quarters=4, interest_rate=0.1)]
    request.worker_costs = [
        WorkerCostAction(
            quarter=2,
            junior_count=4,
            senior_count=4,
            junior_wage_per_quarter=6_000,
            senior_wage_per_quarter=12_000,
            repeat_every=1,
            end_quarter=4,
        )
    ]
    request.incentives = [IncentiveAction(quarter=2, worker_type="senior", count=4, amount=80_000)]
    request.research_actions = [ResearchAction(quarter=1, kind="product", label="P1资质", amount=30_000)]

    result = simulate_budget(request)

    q1, q2, _q3, q4 = result.quarters
    assert q1.research_cost == 30_000
    assert q2.worker_wage == 72_000
    assert q2.incentive == 80_000
    assert q2.ad_cash_before_advertising == 228_000
    assert result.summary["minimum_ad_cash_before_advertising"] == 228_000
    assert q4.loan_repayment == 0


def test_budget_simulator_can_count_delivery_discount_before_advertising():
    request = _base_request(advertising=300_000)
    request.quarters = 5
    request.orders[0].delivery_quarter = 4
    request.orders[0].advertising_quarter = 5
    request.orders[0].delivery_before_advertising = True
    request.orders[0].discount_on_delivery = True

    result = simulate_budget(request)

    q4 = result.quarters[3]
    assert q4.discounted_cash == 1_552_000
    assert q4.ad_cash_before_advertising >= q4.discounted_cash
