import pytest

from app.services.market_analysis import MarketOrder, ProductCost, analyze_market


def test_market_analysis_calculates_margin_and_group_capacity():
    orders = [
        MarketOrder(year=1, market="本地", product="P2", capacity=120, average_price=36, account_period=1),
        MarketOrder(year=1, market="区域", product="P3", capacity=80, average_price=48, account_period=2),
    ]
    costs = {
        "P2": ProductCost(product="P2", material_cost=18),
        "P3": ProductCost(product="P3", material_cost=22),
    }

    result = analyze_market(orders=orders, costs=costs, group_count=8)

    assert result.rows[0].unit_margin == 18
    assert result.rows[0].margin_rate == 0.5
    assert result.rows[0].group_average_capacity == 15
    assert result.rows[1].unit_margin == 26
    assert result.best_by_year[1] == "P3"


def test_market_analysis_flags_missing_cost():
    orders = [MarketOrder(year=2, market="国内", product="P4", capacity=60, average_price=66, account_period=2)]

    result = analyze_market(orders=orders, costs={}, group_count=6)

    assert result.rows[0].unit_margin is None
    assert result.warnings == ["P4 缺少单位成本，无法计算毛利"]


@pytest.mark.parametrize("group_count", [0, -1])
def test_market_analysis_rejects_non_positive_group_count(group_count):
    orders = [MarketOrder(year=1, market="本地", product="P2", capacity=120, average_price=36, account_period=1)]
    costs = {"P2": ProductCost(product="P2", material_cost=18)}

    with pytest.raises(ValueError, match="group_count"):
        analyze_market(orders=orders, costs=costs, group_count=group_count)


def test_market_analysis_handles_zero_average_price_with_cost():
    orders = [MarketOrder(year=1, market="本地", product="P2", capacity=120, average_price=0, account_period=1)]
    costs = {"P2": ProductCost(product="P2", material_cost=18)}

    result = analyze_market(orders=orders, costs=costs, group_count=8)

    assert result.rows[0].unit_margin == -18
    assert result.rows[0].margin_rate is None


def test_market_analysis_repeats_missing_product_warnings_in_row_order():
    orders = [
        MarketOrder(year=2, market="国内", product="P4", capacity=60, average_price=66, account_period=2),
        MarketOrder(year=3, market="亚洲", product="P4", capacity=90, average_price=70, account_period=1),
    ]

    result = analyze_market(orders=orders, costs={}, group_count=6)

    assert result.warnings == [
        "P4 缺少单位成本，无法计算毛利",
        "P4 缺少单位成本，无法计算毛利",
    ]
