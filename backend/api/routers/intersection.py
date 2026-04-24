"""
Intersection — the model-vs-regulators contradiction surface.

This router answers the single question that makes RUBLI not-replaceable:
"What does our model flag that external regulators haven't?" and its
inverse "What do regulators catch that our model missed?"

Cross-joins aria_queue (which already pre-aggregates vendor-level risk
scores, pattern flags, and external-registry hits — EFOS, SFP, ground
truth) into four quadrants. The novelty quadrant (model flags, no
regulator hit) is the pitch; the blind-spot quadrant (regulator flags,
model doesn't) is the humility.

v1 ships with registry-axis only (Axis A). Axes B (PyOD × logistic) and
C (drift) require precomputed vendor-level aggregates that don't yet
exist as DB tables — planned for v2.
"""

import logging
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..cache import app_cache
from ..dependencies import get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intersection", tags=["intersection"])

# Risk thresholds aligned with v0.6.5 (see docs/RISK_METHODOLOGY_v6.md):
# Critical >= 0.60, High >= 0.40, Medium >= 0.25, Low < 0.25.
# For the intersection we use High+ as "RUBLI flags" and < Medium as
# "RUBLI doesn't flag." Medium is a fuzzy middle we keep out of the
# editorial narrative — the quadrant story is strongest at the edges.
_RUBLI_FLAGS_THRESHOLD = 0.40   # High+ (Critical + High)
_RUBLI_CLEAN_THRESHOLD = 0.25   # below Medium
_MIN_CONTRACTS = 5              # exclude one-off vendors from rankings


def _vendor_row(r: sqlite3.Row) -> dict:
    """Project an aria_queue row into the intersection DTO shape."""
    return {
        "vendor_id": r["vendor_id"],
        "vendor_name": r["vendor_name"],
        "avg_risk_score": r["avg_risk_score"],
        "ips_final": r["ips_final"],
        "ips_tier": r["ips_tier"],
        "primary_pattern": r["primary_pattern"],
        "total_contracts": r["total_contracts"],
        "total_value_mxn": r["total_value_mxn"],
        "primary_sector_id": r["primary_sector_id"],
        "primary_sector_name": r["primary_sector_name"],
        "is_efos_definitivo": bool(r["is_efos_definitivo"]),
        "is_sfp_sanctioned": bool(r["is_sfp_sanctioned"]),
        "in_ground_truth": bool(r["in_ground_truth"]),
    }


@router.get("/summary")
def get_intersection_summary(
    top_n_per_quadrant: int = Query(10, ge=1, le=50, description="Vendors to return per quadrant"),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """
    Registry-axis intersection: RUBLI risk × any external-registry hit.

    Returns four quadrants as counts plus top-N rankings:

    - **novelty** — RUBLI High+ AND no registry hit (the pitch: "we caught
      vendors regulators haven't")
    - **confirmed** — RUBLI High+ AND any registry hit (triangulation:
      "both methods agree")
    - **blindspot** — RUBLI Low AND any registry hit ("regulators saw
      something we didn't")
    - **clean_count** — RUBLI Low AND no registry hit (just a number; no
      list returned)

    "Any registry hit" = is_efos_definitivo OR is_sfp_sanctioned OR
    in_ground_truth. EFOS = SAT Art. 69-B definitive-status ghost
    companies. SFP = federal comptroller sanctions. in_ground_truth =
    vendor is party to a documented corruption case in RUBLI's training
    corpus.
    """
    conn.row_factory = sqlite3.Row

    # Cache the full response for 10 minutes. The underlying aria_queue only
    # refreshes when `scripts/aria_pipeline.py` runs (weekly at most), so
    # a short TTL is plenty and shields cold requests from the ~10s scan.
    cache_key = f"summary:{top_n_per_quadrant}"
    cached = app_cache.get("intersection", cache_key)
    if cached is not None:
        return cached

    registry_hit = "(is_efos_definitivo=1 OR is_sfp_sanctioned=1 OR in_ground_truth=1)"
    no_registry_hit = "(is_efos_definitivo=0 AND is_sfp_sanctioned=0 AND in_ground_truth=0)"

    # Single aggregate pass for all four quadrant counts — one full-table
    # CASE aggregate is 3–4× faster than four separate COUNTs each with
    # their own filter. aria_queue is 318K rows so full-table is ~0.5s.
    counts_row = conn.execute(
        f"""
        SELECT
            SUM(CASE WHEN avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} AND {no_registry_hit}
                          AND total_contracts >= {_MIN_CONTRACTS} THEN 1 ELSE 0 END) AS novelty,
            SUM(CASE WHEN avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} AND {registry_hit}
                     THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN avg_risk_score < {_RUBLI_CLEAN_THRESHOLD} AND {registry_hit}
                     THEN 1 ELSE 0 END) AS blindspot,
            SUM(CASE WHEN avg_risk_score < {_RUBLI_CLEAN_THRESHOLD} AND {no_registry_hit}
                     THEN 1 ELSE 0 END) AS clean
        FROM aria_queue
        """
    ).fetchone()
    counts = {k: counts_row[k] for k in ("novelty", "confirmed", "blindspot", "clean")}

    # Rankings: top-N per quadrant (excluding clean — no editorial interest)
    base_cols = (
        "vendor_id, vendor_name, avg_risk_score, ips_final, ips_tier, "
        "primary_pattern, total_contracts, total_value_mxn, "
        "primary_sector_id, primary_sector_name, "
        "is_efos_definitivo, is_sfp_sanctioned, in_ground_truth"
    )

    rankings = {}

    # Novelty: rank by IPS (which balances risk + anomaly + scale + external).
    # Within the no-registry-hit subset, IPS becomes a pure "what did the
    # model see?" signal.
    rankings["novelty"] = [
        _vendor_row(r) for r in conn.execute(
            f"SELECT {base_cols} FROM aria_queue "
            f"WHERE avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} "
            f"AND {no_registry_hit} "
            f"AND total_contracts >= {_MIN_CONTRACTS} "
            f"ORDER BY ips_final DESC "
            f"LIMIT ?",
            (top_n_per_quadrant,),
        ).fetchall()
    ]

    # Confirmed: small set (~30). Rank by avg_risk_score — want the
    # strongest model-to-regulator agreement at the top.
    rankings["confirmed"] = [
        _vendor_row(r) for r in conn.execute(
            f"SELECT {base_cols} FROM aria_queue "
            f"WHERE avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} "
            f"AND {registry_hit} "
            f"ORDER BY avg_risk_score DESC "
            f"LIMIT ?",
            (top_n_per_quadrant,),
        ).fetchall()
    ]

    # Blind spot: rank by total_value_mxn so the most expensive regulator-
    # confirmed misses surface first — those are the most investigable
    # model weaknesses.
    rankings["blindspot"] = [
        _vendor_row(r) for r in conn.execute(
            f"SELECT {base_cols} FROM aria_queue "
            f"WHERE avg_risk_score < {_RUBLI_CLEAN_THRESHOLD} "
            f"AND {registry_hit} "
            f"ORDER BY total_value_mxn DESC "
            f"LIMIT ?",
            (top_n_per_quadrant,),
        ).fetchall()
    ]

    # Which registries drive the hits? (Transparency — shows the reader
    # where the external signal actually comes from.)
    registry_breakdown = conn.execute(
        f"""
        SELECT
            SUM(CASE WHEN is_efos_definitivo=1 THEN 1 ELSE 0 END) AS efos_hits,
            SUM(CASE WHEN is_sfp_sanctioned=1 THEN 1 ELSE 0 END) AS sfp_hits,
            SUM(CASE WHEN in_ground_truth=1 THEN 1 ELSE 0 END) AS gt_hits
        FROM aria_queue
        WHERE {registry_hit}
        """
    ).fetchone()

    response = {
        "thresholds": {
            "rubli_flags": _RUBLI_FLAGS_THRESHOLD,
            "rubli_clean": _RUBLI_CLEAN_THRESHOLD,
            "min_contracts": _MIN_CONTRACTS,
        },
        "counts": counts,
        "rankings": rankings,
        "registry_breakdown": {
            "efos_definitivo": registry_breakdown["efos_hits"],
            "sfp_sanctioned": registry_breakdown["sfp_hits"],
            "in_ground_truth": registry_breakdown["gt_hits"],
        },
    }
    app_cache.set("intersection", cache_key, response, maxsize=8, ttl=600)
    return response


@router.get("/quadrant/{quadrant}")
def get_quadrant_page(
    quadrant: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """
    Paginated drill-down into any single quadrant. Valid quadrant names:
    novelty, confirmed, blindspot.
    """
    conn.row_factory = sqlite3.Row

    registry_hit = "(is_efos_definitivo=1 OR is_sfp_sanctioned=1 OR in_ground_truth=1)"
    no_registry_hit = "(is_efos_definitivo=0 AND is_sfp_sanctioned=0 AND in_ground_truth=0)"

    if quadrant == "novelty":
        where_clause = (
            f"avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} "
            f"AND {no_registry_hit} "
            f"AND total_contracts >= {_MIN_CONTRACTS}"
        )
        order = "ORDER BY ips_final DESC"
    elif quadrant == "confirmed":
        where_clause = f"avg_risk_score >= {_RUBLI_FLAGS_THRESHOLD} AND {registry_hit}"
        order = "ORDER BY avg_risk_score DESC"
    elif quadrant == "blindspot":
        where_clause = f"avg_risk_score < {_RUBLI_CLEAN_THRESHOLD} AND {registry_hit}"
        order = "ORDER BY total_value_mxn DESC"
    else:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Unknown quadrant '{quadrant}'. Valid: novelty, confirmed, blindspot.",
        )

    params: list = []
    if sector_id is not None:
        where_clause += " AND primary_sector_id = ?"
        params.append(sector_id)

    total = conn.execute(
        f"SELECT COUNT(*) FROM aria_queue WHERE {where_clause}",
        params,
    ).fetchone()[0]

    offset = (page - 1) * per_page
    cols = (
        "vendor_id, vendor_name, avg_risk_score, ips_final, ips_tier, "
        "primary_pattern, total_contracts, total_value_mxn, "
        "primary_sector_id, primary_sector_name, "
        "is_efos_definitivo, is_sfp_sanctioned, in_ground_truth"
    )
    rows = conn.execute(
        f"SELECT {cols} FROM aria_queue WHERE {where_clause} {order} LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()

    return {
        "quadrant": quadrant,
        "data": [_vendor_row(r) for r in rows],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }
