"""Active risk-model resolution for read-path SHAP / metadata surfaces.

The active model (v0.8.5) stores its GLOBAL calibration row with
``sector_id = 0`` and coefficients as parallel arrays
``{"names": [...], "values": [...]}``. Older models (v6.0, v5.0) used
``sector_id IS NULL`` and a flat ``{name: value}`` dict.

The legacy ``WHERE sector_id IS NULL`` loaders therefore silently served the
superseded **v6.0** betas to every risk-factor / waterfall / model-info
surface, while the contract scores themselves used v0.8.5 — so the
"why is this risky" breakdowns disagreed with the score they explained
(3 sign flips incl. direct_award, 4 features missing). Resolve the active
global row by recency across BOTH sector_id conventions, and normalize BOTH
coefficient shapes here so every read-path surface agrees with the score.

Read-only: never writes; never touches ``contracts.risk_score_v8``.
"""
import json
from typing import Any, Dict

# Most-recent global calibration row, tolerant of the sector_id=0 (v0.8.5+)
# vs sector_id IS NULL (<= v6.0) convention change. created_at DESC makes the
# active model win: v0.8.5 (2026-05-02) > v6.0 (2026-05-01) > v6.5 > v5.0.
_ACTIVE_GLOBAL_SQL = (
    "SELECT model_version, intercept, coefficients FROM model_calibration "
    "WHERE sector_id = 0 OR sector_id IS NULL "
    "ORDER BY created_at DESC, id DESC LIMIT 1"
)


def normalize_coefficients(raw: Any) -> Dict[str, float]:
    """Normalize either stored coefficient shape into a flat ``{name: value}`` dict.

    Handles the v0.8.5 ``{"names": [...], "values": [...]}`` parallel-array
    layout and the older flat ``{name: value}`` dict. Accepts a JSON string or
    an already-parsed object. Returns ``{}`` for empty/unrecognized input.
    """
    if not raw:
        return {}
    data = json.loads(raw) if isinstance(raw, str) else raw
    if isinstance(data, dict) and "names" in data and "values" in data:
        return {str(n): float(v) for n, v in zip(data["names"], data["values"])}
    if isinstance(data, dict):
        return {str(k): float(v) for k, v in data.items()}
    return {}


def load_active_global_model(conn) -> Dict[str, Any]:
    """Return ``{model_version, intercept, coefficients}`` for the active global model.

    ``conn`` must yield ``sqlite3.Row`` rows (the API's standard connection).
    """
    row = conn.execute(_ACTIVE_GLOBAL_SQL).fetchone()
    if not row:
        return {"model_version": None, "intercept": 0.0, "coefficients": {}}
    intercept = row["intercept"]
    return {
        "model_version": row["model_version"],
        "intercept": float(intercept) if intercept is not None else 0.0,
        "coefficients": normalize_coefficients(row["coefficients"]),
    }


def load_active_global_coefficients(conn) -> Dict[str, float]:
    """Convenience: the normalized coefficient dict for the active global model."""
    return load_active_global_model(conn)["coefficients"]
