"""Regression test for the active-model SHAP serving fix (ML P0, 2026-06-11).

The risk-factor / waterfall / model-info loaders used `WHERE sector_id IS NULL`,
which returned the superseded **v6.0** betas — v0.8.5's global row is
`sector_id=0`, not NULL — and v0.8.5 stores coefficients as
`{"names":[],"values":[]}`, which the old flat-dict parser dropped to nothing.

`active_model.load_active_global_model()` resolves the active global row across
both sector_id conventions (by recency) and normalizes both coefficient shapes,
so every read-path surface agrees with the v0.8.5 score it explains.
"""
import json
import os
import sqlite3
from pathlib import Path

import pytest

from api.services.active_model import (
    normalize_coefficients,
    load_active_global_model,
    load_active_global_coefficients,
)

_default_db = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(_default_db)))


# ---- unit: normalize_coefficients handles both stored shapes -----------------

def test_normalize_names_values_format():
    raw = {"names": ["a", "b", "c"], "values": [0.5, -0.3, 0.0]}
    assert normalize_coefficients(raw) == {"a": 0.5, "b": -0.3, "c": 0.0}


def test_normalize_flat_dict_format():
    assert normalize_coefficients({"a": 0.5, "b": -0.3}) == {"a": 0.5, "b": -0.3}


def test_normalize_accepts_json_string():
    assert normalize_coefficients(json.dumps({"names": ["x"], "values": [1.0]})) == {"x": 1.0}


def test_normalize_empty_inputs():
    assert normalize_coefficients(None) == {}
    assert normalize_coefficients("") == {}
    assert normalize_coefficients("{}") == {}


# ---- integration: serves the active v0.8.5 global model ----------------------

@pytest.fixture(scope="module")
def conn():
    if not DB_PATH.exists():
        pytest.skip(f"DB not found at {DB_PATH}")
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    yield c
    c.close()


def test_serves_active_v085_model(conn):
    m = load_active_global_model(conn)
    assert m["model_version"] == "v0.8.5", (
        f"expected v0.8.5, got {m['model_version']} — the `sector_id IS NULL` bug is back"
    )
    assert abs(m["intercept"] - (-2.6157)) < 1e-3, m["intercept"]


def test_key_betas_match_v085(conn):
    co = load_active_global_coefficients(conn)
    assert co, "coefficients empty — the {names,values} parser dropped the v0.8.5 row"
    assert abs(co["price_volatility"] - 0.5576) < 1e-2, co.get("price_volatility")
    # The sign-flip regression: v0.8.5 direct_award is protective (<0); v6.0
    # served it as risk-raising (+0.018).
    assert co["direct_award"] < 0, f"direct_award should be protective, got {co['direct_award']}"
    # Features that were entirely absent from the v6.0-served vector.
    for f in ("recency_z", "amount_residual_z", "amendment_flag"):
        assert f in co, f"{f} missing — served vector is not v0.8.5"


def test_legacy_query_would_serve_wrong_model(conn):
    """Document the bug: the old `sector_id IS NULL` query returns a non-active row."""
    legacy = conn.execute(
        "SELECT model_version FROM model_calibration WHERE sector_id IS NULL "
        "ORDER BY id DESC LIMIT 1"
    ).fetchone()
    assert load_active_global_model(conn)["model_version"] == "v0.8.5"
    if legacy is not None:
        assert legacy["model_version"] != "v0.8.5", (
            "legacy query now returns v0.8.5 — the convention changed; "
            "revisit active_model resolution"
        )
