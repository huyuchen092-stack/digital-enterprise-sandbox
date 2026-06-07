from __future__ import annotations

from collections import defaultdict
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class LineRule(BaseModel):
    name: str
    purchase_price: float = Field(ge=0)
    install_quarters: int = Field(ge=0)
    production_quarters: int = Field(default=1, ge=0)
    capacity_per_quarter: float = Field(ge=0)
    maintenance_fee: float = Field(default=0, ge=0)


class ProductRule(BaseModel):
    name: str
    sale_price: float = Field(ge=0)
    material_cost: float = Field(ge=0)
    production_fee_per_unit: float = Field(default=0, ge=0)
    material_delivery_quarters: int = Field(default=0, ge=0)
    account_period_quarters: int = Field(default=0, ge=0)
    discount_rate: float = Field(default=0, ge=0)


class LineBuildAction(BaseModel):
    line_type: str
    count: int = Field(ge=1)
    quarter: int = Field(ge=1)


class MaterialOrder(BaseModel):
    product: str
    quantity: float = Field(ge=0)
    order_quarter: int = Field(ge=1)
    emergency: bool = False
    emergency_multiplier: float = Field(default=1, ge=1)


class ProductionAction(BaseModel):
    product: str
    quantity: float = Field(ge=0)
    start_quarter: int = Field(ge=1)
    line_type: str | None = None


class OrderPlan(BaseModel):
    order_id: str
    product: str
    quantity: float = Field(ge=0)
    advertising_quarter: int = Field(ge=1)
    advertising: float = Field(ge=0)
    delivery_quarter: int = Field(ge=1)
    combine_delivery_quarters: list[int] = Field(default_factory=list)
    account_period_quarters: int | None = None
    discount_on_delivery: bool = False
    delivery_before_advertising: bool = False


class FinancingAction(BaseModel):
    quarter: int = Field(ge=1)
    amount: float
    label: str = "融资"


class ShortLoanAction(BaseModel):
    quarter: int = Field(ge=1)
    amount: float = Field(ge=0)
    duration_quarters: int = Field(default=4, ge=1)
    interest_rate: float = Field(default=0, ge=0)
    label: str = "短贷"


class WorkerCostAction(BaseModel):
    quarter: int = Field(ge=1)
    junior_count: int = Field(default=0, ge=0)
    senior_count: int = Field(default=0, ge=0)
    junior_wage_per_quarter: float = Field(default=0, ge=0)
    senior_wage_per_quarter: float = Field(default=0, ge=0)
    repeat_every: int | None = Field(default=None, ge=1)
    end_quarter: int | None = Field(default=None, ge=1)
    label: str = "工资"


class IncentiveAction(BaseModel):
    quarter: int = Field(ge=1)
    worker_type: Literal["junior", "senior", "mixed"] = "mixed"
    count: int = Field(default=0, ge=0)
    amount: float = Field(ge=0)
    label: str = "激励"


class ResearchAction(BaseModel):
    quarter: int = Field(ge=1)
    amount: float = Field(ge=0)
    kind: Literal["market", "iso", "product", "feature", "other"] = "other"
    label: str


class TaxAction(BaseModel):
    quarter: int = Field(ge=1)
    amount: float = Field(ge=0)
    label: str = "所得税"


class FixedCost(BaseModel):
    label: str
    amount: float = Field(ge=0)
    start_quarter: int = Field(ge=1)
    repeat_every: int | None = Field(default=None, ge=1)
    end_quarter: int | None = Field(default=None, ge=1)


class BudgetSimulationRequest(BaseModel):
    initial_cash: float
    quarters: int = Field(default=16, ge=1, le=32)
    line_rules: dict[str, LineRule]
    product_rules: dict[str, ProductRule]
    line_builds: list[LineBuildAction] = Field(default_factory=list)
    material_orders: list[MaterialOrder] = Field(default_factory=list)
    productions: list[ProductionAction] = Field(default_factory=list)
    orders: list[OrderPlan] = Field(default_factory=list)
    financing: list[FinancingAction] = Field(default_factory=list)
    short_loans: list[ShortLoanAction] = Field(default_factory=list)
    worker_costs: list[WorkerCostAction] = Field(default_factory=list)
    incentives: list[IncentiveAction] = Field(default_factory=list)
    research_actions: list[ResearchAction] = Field(default_factory=list)
    taxes: list[TaxAction] = Field(default_factory=list)
    fixed_costs: list[FixedCost] = Field(default_factory=list)
    safety_cash: float = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_references(self) -> "BudgetSimulationRequest":
        missing_lines = {build.line_type for build in self.line_builds if build.line_type not in self.line_rules}
        missing_lines.update(
            production.line_type
            for production in self.productions
            if production.line_type is not None and production.line_type not in self.line_rules
        )
        if missing_lines:
            raise ValueError(f"unknown line type(s): {', '.join(sorted(missing_lines))}")

        referenced_products = {order.product for order in self.orders}
        referenced_products.update(order.product for order in self.material_orders)
        referenced_products.update(production.product for production in self.productions)
        missing_products = referenced_products - set(self.product_rules)
        if missing_products:
            raise ValueError(f"unknown product(s): {', '.join(sorted(missing_products))}")
        return self


class QuarterBudgetResult(BaseModel):
    quarter: int
    beginning_cash: float
    financing: float = 0
    fixed_cost: float = 0
    line_purchase: float = 0
    maintenance: float = 0
    material_payment: float = 0
    production_fee: float = 0
    worker_wage: float = 0
    incentive: float = 0
    research_cost: float = 0
    loan_repayment: float = 0
    loan_interest: float = 0
    tax: float = 0
    ad_cash_before_advertising: float = 0
    advertising: float = 0
    delivered_revenue: float = 0
    discounted_cash: float = 0
    collection: float = 0
    ending_cash: float
    available_lines: dict[str, int] = Field(default_factory=dict)
    inventory: dict[str, float] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class OrderBudgetResult(BaseModel):
    order_id: str
    product: str
    requested_quantity: float
    delivered_quantity: float
    deliverable: bool
    advertising_quarter: int
    advertising: float
    delivery_quarter: int
    coverage_quarters: list[int]
    coverage_cash_ok: bool
    minimum_coverage_cash: float | None
    delivered_revenue: float
    discounted_cash: float
    notes: list[str] = Field(default_factory=list)


class BudgetSimulationResult(BaseModel):
    feasible: bool
    minimum_cash: float
    break_quarters: list[int]
    quarters: list[QuarterBudgetResult]
    orders: list[OrderBudgetResult]
    risk_notes: list[str]
    summary: dict[str, float | int | str | None]


def simulate_budget(request: BudgetSimulationRequest) -> BudgetSimulationResult:
    line_purchase_by_quarter: dict[int, float] = defaultdict(float)
    maintenance_by_quarter: dict[int, float] = defaultdict(float)
    available_lines_by_quarter: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    capacity_by_quarter: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for build in request.line_builds:
        line = request.line_rules[build.line_type]
        line_purchase_by_quarter[build.quarter] += line.purchase_price * build.count
        available_quarter = build.quarter + line.install_quarters
        for quarter in range(available_quarter, request.quarters + 1):
            available_lines_by_quarter[quarter][build.line_type] += build.count
            capacity_by_quarter[quarter][build.line_type] += line.capacity_per_quarter * build.count
        maintenance_quarter = available_quarter + 4
        while maintenance_quarter <= request.quarters:
            maintenance_by_quarter[maintenance_quarter] += line.maintenance_fee * build.count
            maintenance_quarter += 4

    material_arrivals: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    material_payments: dict[int, float] = defaultdict(float)
    for material_order in request.material_orders:
        product = request.product_rules[material_order.product]
        arrival_quarter = material_order.order_quarter + product.material_delivery_quarters
        if arrival_quarter > request.quarters:
            continue
        material_arrivals[arrival_quarter][material_order.product] += material_order.quantity
        material_payments[arrival_quarter] += (
            material_order.quantity * product.material_cost * material_order.emergency_multiplier
        )

    production_by_quarter: dict[int, list[ProductionAction]] = defaultdict(list)
    for production in request.productions:
        production_by_quarter[production.start_quarter].append(production)

    advertising_by_quarter: dict[int, float] = defaultdict(float)
    for order in request.orders:
        advertising_by_quarter[order.advertising_quarter] += order.advertising

    financing_by_quarter: dict[int, float] = defaultdict(float)
    for financing in request.financing:
        financing_by_quarter[financing.quarter] += financing.amount

    loan_repayment_by_quarter: dict[int, float] = defaultdict(float)
    loan_interest_by_quarter: dict[int, float] = defaultdict(float)
    for loan in request.short_loans:
        financing_by_quarter[loan.quarter] += loan.amount
        maturity_quarter = loan.quarter + loan.duration_quarters
        if maturity_quarter <= request.quarters:
            loan_repayment_by_quarter[maturity_quarter] += loan.amount
            loan_interest_by_quarter[maturity_quarter] += loan.amount * loan.interest_rate

    worker_wage_by_quarter: dict[int, float] = defaultdict(float)
    for worker_cost in request.worker_costs:
        quarter = worker_cost.quarter
        while quarter <= request.quarters:
            if worker_cost.end_quarter is not None and quarter > worker_cost.end_quarter:
                break
            worker_wage_by_quarter[quarter] += (
                worker_cost.junior_count * worker_cost.junior_wage_per_quarter
                + worker_cost.senior_count * worker_cost.senior_wage_per_quarter
            )
            if worker_cost.repeat_every is None:
                break
            quarter += worker_cost.repeat_every

    incentive_by_quarter: dict[int, float] = defaultdict(float)
    for incentive in request.incentives:
        incentive_by_quarter[incentive.quarter] += incentive.amount

    research_by_quarter: dict[int, float] = defaultdict(float)
    for research in request.research_actions:
        research_by_quarter[research.quarter] += research.amount

    tax_by_quarter: dict[int, float] = defaultdict(float)
    for tax in request.taxes:
        tax_by_quarter[tax.quarter] += tax.amount

    fixed_cost_by_quarter: dict[int, float] = defaultdict(float)
    for fixed_cost in request.fixed_costs:
        quarter = fixed_cost.start_quarter
        while quarter <= request.quarters:
            if fixed_cost.end_quarter is not None and quarter > fixed_cost.end_quarter:
                break
            fixed_cost_by_quarter[quarter] += fixed_cost.amount
            if fixed_cost.repeat_every is None:
                break
            quarter += fixed_cost.repeat_every

    pending_collections: dict[int, float] = defaultdict(float)
    inventory_arrivals: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    inventory: dict[str, float] = defaultdict(float)
    materials_on_hand: dict[str, float] = defaultdict(float)
    cash = request.initial_cash
    minimum_cash = cash
    break_quarters: list[int] = []
    risk_notes: list[str] = []
    quarter_results: list[QuarterBudgetResult] = []
    order_results_by_id: dict[str, OrderBudgetResult] = {}

    for quarter in range(1, request.quarters + 1):
        beginning_cash = cash
        notes: list[str] = []
        financing = financing_by_quarter[quarter]
        cash += financing

        for product, quantity in material_arrivals.pop(quarter, {}).items():
            materials_on_hand[product] += quantity
        for product, quantity in inventory_arrivals.pop(quarter, {}).items():
            inventory[product] += quantity

        fixed_cost = fixed_cost_by_quarter[quarter]
        line_purchase = line_purchase_by_quarter[quarter]
        maintenance = maintenance_by_quarter[quarter]
        material_payment = material_payments[quarter]
        production_fee = 0.0
        worker_wage = worker_wage_by_quarter[quarter]
        incentive = incentive_by_quarter[quarter]
        research_cost = research_by_quarter[quarter]
        loan_repayment = loan_repayment_by_quarter[quarter]
        loan_interest = loan_interest_by_quarter[quarter]
        tax = tax_by_quarter[quarter]
        advertising = advertising_by_quarter[quarter]
        delivered_revenue = 0.0
        discounted_cash = 0.0
        collection = pending_collections.pop(quarter, 0.0)

        cash += collection
        cash -= (
            fixed_cost
            + line_purchase
            + maintenance
            + material_payment
            + worker_wage
            + incentive
            + research_cost
            + loan_repayment
            + loan_interest
            + tax
        )

        used_capacity: dict[str, float] = defaultdict(float)
        for production in production_by_quarter.get(quarter, []):
            product = request.product_rules[production.product]
            available_material = materials_on_hand.get(production.product, 0.0)
            if available_material < production.quantity:
                notes.append(
                    f"{production.product} material shortfall: need {production.quantity}, have {available_material}"
                )
                risk_notes.append(f"Q{quarter} material shortfall for {production.product}")
            materials_on_hand[production.product] = max(0.0, available_material - production.quantity)

            if production.line_type is not None:
                capacity = capacity_by_quarter[quarter].get(production.line_type, 0.0)
                used_capacity[production.line_type] += production.quantity
                if used_capacity[production.line_type] > capacity:
                    notes.append(
                        f"{production.line_type} capacity shortfall: need {used_capacity[production.line_type]}, have {capacity}"
                    )
                    risk_notes.append(f"Q{quarter} capacity shortfall for {production.line_type}")

            production_fee += production.quantity * product.production_fee_per_unit
            completion_quarter = quarter + _production_cycle(request, production)
            if completion_quarter <= request.quarters:
                inventory_arrivals[completion_quarter][production.product] += production.quantity

        cash -= production_fee
        pre_ad_revenue, pre_ad_cash = _deliver_orders_for_quarter(
            request=request,
            quarter=quarter,
            inventory=inventory,
            pending_collections=pending_collections,
            order_results_by_id=order_results_by_id,
            quarter_results=quarter_results,
            risk_notes=risk_notes,
            delivery_before_advertising=True,
        )
        delivered_revenue += pre_ad_revenue
        discounted_cash += pre_ad_cash
        cash += pre_ad_cash

        ad_cash_before_advertising = cash
        cash -= advertising

        post_ad_revenue, post_ad_cash = _deliver_orders_for_quarter(
            request=request,
            quarter=quarter,
            inventory=inventory,
            pending_collections=pending_collections,
            order_results_by_id=order_results_by_id,
            quarter_results=quarter_results,
            risk_notes=risk_notes,
            delivery_before_advertising=False,
        )
        delivered_revenue += post_ad_revenue
        discounted_cash += post_ad_cash
        cash += post_ad_cash

        ending_cash = cash
        if ending_cash < request.safety_cash:
            break_quarters.append(quarter)
            risk_notes.append(f"Q{quarter} cash is negative or below safety cash")
        minimum_cash = min(minimum_cash, ending_cash)

        quarter_results.append(
            QuarterBudgetResult(
                quarter=quarter,
                beginning_cash=beginning_cash,
                financing=financing,
                fixed_cost=fixed_cost,
                line_purchase=line_purchase,
                maintenance=maintenance,
                material_payment=material_payment,
                production_fee=production_fee,
                worker_wage=worker_wage,
                incentive=incentive,
                research_cost=research_cost,
                loan_repayment=loan_repayment,
                loan_interest=loan_interest,
                tax=tax,
                ad_cash_before_advertising=ad_cash_before_advertising,
                advertising=advertising,
                delivered_revenue=delivered_revenue,
                discounted_cash=discounted_cash,
                collection=collection,
                ending_cash=ending_cash,
                available_lines=dict(available_lines_by_quarter[quarter]),
                inventory=dict(inventory),
                notes=notes,
            )
        )

    all_orders = [order_results_by_id.get(order.order_id) for order in request.orders]
    missing_order_results = [order for order in request.orders if order_results_by_id.get(order.order_id) is None]
    for order in missing_order_results:
        all_orders.append(
            OrderBudgetResult(
                order_id=order.order_id,
                product=order.product,
                requested_quantity=order.quantity,
                delivered_quantity=0,
                deliverable=False,
                advertising_quarter=order.advertising_quarter,
                advertising=order.advertising,
                delivery_quarter=order.delivery_quarter,
                coverage_quarters=sorted(set(order.combine_delivery_quarters or [order.delivery_quarter])),
                coverage_cash_ok=False,
                minimum_coverage_cash=None,
                delivered_revenue=0,
                discounted_cash=0,
                notes=["delivery quarter outside simulation range"],
            )
        )

    orders = [order for order in all_orders if order is not None]
    first_year_profit = _calculate_first_year_profit(quarter_results, request)
    feasible = (
        not break_quarters
        and all(order.deliverable for order in orders)
        and all(order.coverage_cash_ok for order in orders)
        and not any("shortfall" in note for note in risk_notes)
    )

    return BudgetSimulationResult(
        feasible=feasible,
        minimum_cash=minimum_cash,
        break_quarters=break_quarters,
        quarters=quarter_results,
        orders=orders,
        risk_notes=risk_notes,
        summary={
            "first_year_profit": first_year_profit,
            "first_year_advertising": sum(result.advertising for result in quarter_results[:4]),
            "minimum_cash": minimum_cash,
            "break_quarter_count": len(break_quarters),
            "minimum_ad_cash_before_advertising": min(
                (result.ad_cash_before_advertising for result in quarter_results if result.advertising > 0),
                default=None,
            ),
        },
    )


def _deliver_orders_for_quarter(
    *,
    request: BudgetSimulationRequest,
    quarter: int,
    inventory: dict[str, float],
    pending_collections: dict[int, float],
    order_results_by_id: dict[str, OrderBudgetResult],
    quarter_results: list[QuarterBudgetResult],
    risk_notes: list[str],
    delivery_before_advertising: bool,
) -> tuple[float, float]:
    delivered_revenue = 0.0
    discounted_cash = 0.0
    matching_orders = [
        order
        for order in request.orders
        if order.delivery_quarter == quarter and order.delivery_before_advertising is delivery_before_advertising
    ]

    for order in matching_orders:
        product = request.product_rules[order.product]
        available_inventory = inventory.get(order.product, 0.0)
        delivered_quantity = min(order.quantity, available_inventory)
        inventory[order.product] = available_inventory - delivered_quantity
        delivered_revenue_for_order = delivered_quantity * product.sale_price
        delivered_revenue += delivered_revenue_for_order
        order_notes: list[str] = []
        if delivered_quantity < order.quantity:
            order_notes.append(f"delivery shortfall: requested {order.quantity}, delivered {delivered_quantity}")
            risk_notes.append(f"Q{quarter} delivery shortfall for {order.order_id}")

        cash_received = 0.0
        if order.discount_on_delivery:
            discount_rate = product.discount_rate
            cash_received = delivered_revenue_for_order * (1 - discount_rate)
            discounted_cash += cash_received
        else:
            account_period = order.account_period_quarters
            if account_period is None:
                account_period = product.account_period_quarters
            collection_quarter = quarter + account_period
            if collection_quarter <= request.quarters:
                pending_collections[collection_quarter] += delivered_revenue_for_order

        coverage_quarters = sorted(set(order.combine_delivery_quarters or [order.delivery_quarter]))
        coverage_cash_values = [
            result.ending_cash
            for result in quarter_results
            if result.quarter in coverage_quarters and result.quarter < order.delivery_quarter
        ]
        minimum_coverage_cash = min(coverage_cash_values) if coverage_cash_values else None
        coverage_cash_ok = minimum_coverage_cash is None or minimum_coverage_cash >= request.safety_cash

        order_results_by_id[order.order_id] = OrderBudgetResult(
            order_id=order.order_id,
            product=order.product,
            requested_quantity=order.quantity,
            delivered_quantity=delivered_quantity,
            deliverable=delivered_quantity >= order.quantity,
            advertising_quarter=order.advertising_quarter,
            advertising=order.advertising,
            delivery_quarter=order.delivery_quarter,
            coverage_quarters=coverage_quarters,
            coverage_cash_ok=coverage_cash_ok,
            minimum_coverage_cash=minimum_coverage_cash,
            delivered_revenue=delivered_revenue_for_order,
            discounted_cash=cash_received,
            notes=order_notes,
        )

    return delivered_revenue, discounted_cash


def _production_cycle(request: BudgetSimulationRequest, production: ProductionAction) -> int:
    if production.line_type is None:
        return 1
    return request.line_rules[production.line_type].production_quarters


def _calculate_first_year_profit(
    quarter_results: list[QuarterBudgetResult],
    request: BudgetSimulationRequest,
) -> float:
    first_year = quarter_results[:4]
    delivered_revenue = sum(result.delivered_revenue for result in first_year)
    explicit_costs = sum(
        result.fixed_cost
        + result.line_purchase
        + result.maintenance
        + result.material_payment
        + result.production_fee
        + result.worker_wage
        + result.incentive
        + result.research_cost
        + result.loan_interest
        + result.tax
        + result.advertising
        for result in first_year
    )
    financing_cash = sum(result.financing for result in first_year)
    # Financing changes cash but is not operating profit.
    return delivered_revenue - explicit_costs + 0 * financing_cash
