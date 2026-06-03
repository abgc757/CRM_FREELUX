"""
Unit tests for the core price calculation logic.
"""

import pytest
from app.services.price_management import calculate_price
from app.schemas.price_management import PriceParams


def test_calculate_price_basic():
    """Basic price calculation with default parameters."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0, factor_logistico=1.0, impuestos_pct=0.0)
    new_price, margin = calculate_price(
        costo_mxn=58.55,
        peso_kg=2.06,
        params=params,
        margin_override=0.20,
    )
    expected_c_prime = 58.55 + (2.06 * 25.0)  # = 110.05
    expected_c_double = 110.05 * 1.0 * 1.0  # = 110.05
    expected_price = round(110.05 * 1.20, 2)  # = 132.06
    assert new_price == expected_price
    assert margin == 0.20


def test_calculate_price_with_logistics_and_tax():
    """Price calculation with logistics factor and taxes."""
    params = PriceParams(precio_acero_mxn_per_kg=30.0, factor_logistico=1.15, impuestos_pct=0.16)
    new_price, margin = calculate_price(
        costo_mxn=100.0,
        peso_kg=5.0,
        params=params,
        margin_override=0.25,
    )
    c_prime = 100.0 + (5.0 * 30.0)  # 250.0
    c_double = 250.0 * 1.15 * 1.16  # 333.5
    expected = round(333.5 * 1.25, 2)  # 416.88
    assert new_price == expected
    assert margin == 0.25


def test_calculate_price_with_default_margin():
    """Price calculation using product's own margin (no override)."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    new_price, margin = calculate_price(
        costo_mxn=50.0,
        peso_kg=2.0,
        params=params,
        margin_override=None,
        current_margin=0.15,
    )
    c_prime = 50.0 + (2.0 * 25.0)  # 100.0
    expected = round(100.0 * 1.15, 2)  # 115.0
    assert new_price == expected
    assert margin == 0.15


def test_calculate_price_zero_weight():
    """Should raise ValueError for zero weight."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    with pytest.raises(ValueError, match="peso_kg must be > 0"):
        calculate_price(costo_mxn=100.0, peso_kg=0.0, params=params)


def test_calculate_price_negative_weight():
    """Should raise ValueError for negative weight."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    with pytest.raises(ValueError, match="peso_kg must be > 0"):
        calculate_price(costo_mxn=100.0, peso_kg=-1.0, params=params)


def test_calculate_price_negative_cost():
    """Should raise ValueError for negative cost."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    with pytest.raises(ValueError, match="costo_mxn must be >= 0"):
        calculate_price(costo_mxn=-10.0, peso_kg=2.0, params=params)


def test_calculate_price_below_cost():
    """Should raise ValueError if calculated price is below cost."""
    params = PriceParams(precio_acero_mxn_per_kg=0.0, factor_logistico=1.0, impuestos_pct=0.0)
    with pytest.raises(ValueError, match="Calculated price.*is below cost"):
        # Price would be 0 * (1+0) = 0 which is < cost
        calculate_price(costo_mxn=100.0, peso_kg=10.0, params=params, margin_override=-1.0)


def test_calculate_price_large_values():
    """Price calculation with large values to ensure no overflow."""
    params = PriceParams(precio_acero_mxn_per_kg=1000.0, factor_logistico=2.0, impuestos_pct=0.5)
    new_price, margin = calculate_price(
        costo_mxn=10000.0,
        peso_kg=500.0,
        params=params,
        margin_override=0.30,
    )
    c_prime = 10000.0 + (500.0 * 1000.0)  # 510000.0
    c_double = 510000.0 * 2.0 * 1.5  # 1530000.0
    expected = round(1530000.0 * 1.30, 2)  # 1989000.0
    assert new_price == expected


def test_calculate_price_rounding():
    """Price should be rounded to 2 decimal places."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0, factor_logistico=1.3333, impuestos_pct=0.0)
    new_price, margin = calculate_price(
        costo_mxn=10.0,
        peso_kg=1.0,
        params=params,
        margin_override=0.20,
    )
    c_prime = 10.0 + (1.0 * 25.0)  # 35.0
    c_double = 35.0 * 1.3333  # 46.6655
    expected = round(46.6655 * 1.20, 2)  # 55.9986 -> 56.00
    assert new_price == expected
    assert isinstance(new_price, float)


def test_calculate_price_high_margin():
    """Price calculation with a high margin."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    new_price, margin = calculate_price(
        costo_mxn=100.0,
        peso_kg=2.0,
        params=params,
        margin_override=0.90,
    )
    c_prime = 100.0 + (2.0 * 25.0)  # 150.0
    expected = round(150.0 * 1.90, 2)  # 285.0
    assert new_price == expected
    assert margin == 0.90


def test_calculate_price_no_override_uses_current():
    """When margin_override is None, use current_margin."""
    params = PriceParams(precio_acero_mxn_per_kg=25.0)
    new_price, margin = calculate_price(
        costo_mxn=100.0,
        peso_kg=2.0,
        params=params,
        margin_override=None,
        current_margin=0.35,
    )
    c_prime = 100.0 + (2.0 * 25.0)  # 150.0
    expected = round(150.0 * 1.35, 2)  # 202.5
    assert new_price == expected
    assert margin == 0.35
