from pydantic import BaseModel


class MarketOrder(BaseModel):
    year: int
    market: str
    product: str
    capacity: float
    average_price: float
    account_period: int


class ProductCost(BaseModel):
    product: str
    material_cost: float


class MarketAnalysisRow(BaseModel):
    year: int
    market: str
    product: str
    capacity: float
    average_price: float
    account_period: int
    group_average_capacity: float
    unit_cost: float | None
    unit_margin: float | None
    margin_rate: float | None


class MarketAnalysisResult(BaseModel):
    rows: list[MarketAnalysisRow]
    best_by_year: dict[int, str]
    warnings: list[str]


def analyze_market(
    orders: list[MarketOrder],
    costs: dict[str, ProductCost],
    group_count: int,
) -> MarketAnalysisResult:
    if group_count <= 0:
        raise ValueError("group_count must be greater than 0")

    rows: list[MarketAnalysisRow] = []
    warnings: list[str] = []

    for order in orders:
        group_average_capacity = order.capacity / group_count
        cost = costs.get(order.product)

        if cost is None:
            unit_cost = None
            unit_margin = None
            margin_rate = None
            warnings.append(f"{order.product} 缺少单位成本，无法计算毛利")
        else:
            unit_cost = cost.material_cost
            unit_margin = order.average_price - unit_cost
            margin_rate = unit_margin / order.average_price if order.average_price else None

        rows.append(
            MarketAnalysisRow(
                year=order.year,
                market=order.market,
                product=order.product,
                capacity=order.capacity,
                average_price=order.average_price,
                account_period=order.account_period,
                group_average_capacity=group_average_capacity,
                unit_cost=unit_cost,
                unit_margin=unit_margin,
                margin_rate=margin_rate,
            )
        )

    best_by_year: dict[int, str] = {}
    best_margin_by_year: dict[int, float] = {}
    for row in rows:
        if row.unit_margin is None:
            continue

        current_best_margin = best_margin_by_year.get(row.year)
        if current_best_margin is None or row.unit_margin > current_best_margin:
            best_by_year[row.year] = row.product
            best_margin_by_year[row.year] = row.unit_margin

    return MarketAnalysisResult(rows=rows, best_by_year=best_by_year, warnings=warnings)
