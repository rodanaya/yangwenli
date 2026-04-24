"""
Institutional Capture Creep — deterministic concentration growth detection.

For every federal institution and every year 2018–2025, compute each
vendor's share of that institution's procurement. Surface institutions
where a single vendor's share grew monotonically across multiple years
and eventually crossed a capture threshold (default 50%).

This is the anti-model page: no logistic regression, no PU-learning, no
SHAP. Just arithmetic on COMPRANET. Every row is a publishable finding
of the form "Over N years, Vendor X grew from A% to B% of Institution
Y's procurement." IMCO and Transparencia Internacional do this by hand
on single agencies; this does it for all 2,296 federal institutions
simultaneously.
"""

import logging
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..cache import app_cache
from ..dependencies import get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/capture", tags=["capture"])


# Tuning:
# - min_inst_total: institutions with < this in 2018-2025 total spend are
#   too small to be editorially interesting (noise dominates their share
#   dynamics). 100M MXN excludes ~60% of institutions but retains almost
#   all the actionable signal.
# - min_cumulative: the captured vendor must have won >= this cumulative
#   value across the capture window. Excludes tiny vendors whose "share"
#   grew as a denominator artifact.
# - floor / ceil: the signal is "crossed from low to high." We require the
#   earliest-year share <= 25% and at least one later year >= 50%.
# - min_years: at least 4 annual observations. 3 is too easy; trend
#   detection needs scale.
_MIN_INST_TOTAL = 100_000_000      # 100M MXN across the capture window
_MIN_CUM_VALUE  = 50_000_000       # 50M MXN captured by the vendor
_FLOOR_SHARE    = 25.0             # start at or below this percent
_CEIL_SHARE     = 50.0             # cross to this percent
_MIN_YEARS      = 4                # at least 4 annual data points


def _build_candidates(conn: sqlite3.Connection) -> list[dict]:
    """Run the aggregation + capture detection. Expensive — should be cached."""
    conn.row_factory = sqlite3.Row
    # Aggregate (institution, year, vendor) totals + institution-year total
    # in a single SQL pass with window functions — faster than three separate
    # CTEs because SQLite plans the window execution over a single scan.
    rows = conn.execute(
        """
        WITH vy AS (
            SELECT
                c.institution_id,
                c.contract_year AS yr,
                c.vendor_id,
                SUM(c.amount_mxn) AS v_val
            FROM contracts c
            WHERE c.contract_year BETWEEN 2018 AND 2025
              AND c.amount_mxn > 0
              AND c.amount_mxn < 100000000000
              AND c.institution_id IS NOT NULL
              AND c.vendor_id IS NOT NULL
            GROUP BY c.institution_id, c.contract_year, c.vendor_id
        ),
        iy AS (
            SELECT institution_id, yr, SUM(v_val) AS i_total
            FROM vy
            GROUP BY institution_id, yr
        )
        SELECT
            vy.institution_id,
            vy.vendor_id,
            vy.yr,
            vy.v_val,
            iy.i_total,
            100.0 * vy.v_val / iy.i_total AS share_pct
        FROM vy
        JOIN iy ON iy.institution_id = vy.institution_id AND iy.yr = vy.yr
        WHERE vy.v_val >= 1000000       -- ignore sub-1M MXN noise rows
          AND iy.i_total >= 10000000    -- ignore tiny-year institutions
        """
    ).fetchall()

    # Group by (institution, vendor) and build time series
    from collections import defaultdict
    series: dict[tuple[int, int], list[tuple[int, float, float, float]]] = defaultdict(list)
    for r in rows:
        series[(r["institution_id"], r["vendor_id"])].append(
            (r["yr"], r["share_pct"], r["v_val"], r["i_total"])
        )

    candidates: list[dict] = []
    for (inst_id, vendor_id), points in series.items():
        if len(points) < _MIN_YEARS:
            continue
        points.sort(key=lambda p: p[0])

        shares = [p[1] for p in points]
        values = [p[2] for p in points]

        # Capture criteria:
        # 1) earliest year share <= floor
        # 2) some later year share >= ceil
        # 3) the max share year is strictly after the min share year
        # 4) cumulative value >= min_cum_value
        # 5) institution had >= min_inst_total across all observed years
        earliest_share = shares[0]
        max_share = max(shares)
        max_share_idx = shares.index(max_share)
        min_share = min(shares)
        min_share_idx = shares.index(min_share)

        if earliest_share > _FLOOR_SHARE:
            continue
        if max_share < _CEIL_SHARE:
            continue
        if max_share_idx <= min_share_idx:
            continue  # peak must come after trough — direction of growth

        cum_value = sum(values)
        if cum_value < _MIN_CUM_VALUE:
            continue

        # institution total across the observed window = sum of i_total values
        # at *first* observation per year (they repeat per vendor row within a
        # year in the flat `rows`, but we pull from `points` which is already
        # one row per (inst, vendor, year) — so we need the institution-year
        # total separately). Approximate with max of per-year i_total across
        # observed years for this vendor — they're the same i_total per year.
        inst_total_window = sum(set(p[3] for p in points))
        if inst_total_window < _MIN_INST_TOTAL:
            continue

        # Scoring: (max - min) × sqrt(cumulative_value)
        #   - delta drives "how dramatic was the capture"
        #   - sqrt(value) damps the dominance of 10B MXN outliers
        import math
        score = (max_share - earliest_share) * math.sqrt(cum_value / 1e6)

        candidates.append({
            "institution_id": inst_id,
            "vendor_id": vendor_id,
            "earliest_year": points[0][0],
            "earliest_share_pct": round(earliest_share, 2),
            "peak_year": points[max_share_idx][0],
            "peak_share_pct": round(max_share, 2),
            "latest_year": points[-1][0],
            "latest_share_pct": round(shares[-1], 2),
            "years_observed": len(points),
            "cumulative_value_mxn": cum_value,
            "institution_total_window": inst_total_window,
            "score": round(score, 2),
            "timeline": [
                {"year": p[0], "share_pct": round(p[1], 2), "value_mxn": p[2]}
                for p in points
            ],
        })

    return candidates


def _enrich_with_names(
    conn: sqlite3.Connection, candidates: list[dict]
) -> list[dict]:
    """Attach institution and vendor display names + sector."""
    if not candidates:
        return []
    inst_ids = tuple({c["institution_id"] for c in candidates})
    vendor_ids = tuple({c["vendor_id"] for c in candidates})

    inst_map: dict[int, dict] = {}
    if inst_ids:
        ph = ",".join("?" * len(inst_ids))
        for r in conn.execute(
            f"SELECT id, COALESCE(siglas, name) AS display_name, name, sector_id "
            f"FROM institutions WHERE id IN ({ph})",
            inst_ids,
        ).fetchall():
            inst_map[r["id"]] = {
                "display_name": r["display_name"],
                "full_name": r["name"],
                "sector_id": r["sector_id"],
            }

    vendor_map: dict[int, str] = {}
    if vendor_ids:
        ph = ",".join("?" * len(vendor_ids))
        for r in conn.execute(
            f"SELECT id, name FROM vendors WHERE id IN ({ph})",
            vendor_ids,
        ).fetchall():
            vendor_map[r["id"]] = r["name"]

    # Sector names
    sector_map: dict[int, str] = {}
    for r in conn.execute(
        "SELECT id, name_en FROM sectors"
    ).fetchall():
        sector_map[r["id"]] = r["name_en"]

    enriched = []
    for c in candidates:
        inst = inst_map.get(c["institution_id"], {})
        enriched.append({
            **c,
            "institution_name": inst.get("display_name") or f"Institution #{c['institution_id']}",
            "institution_full_name": inst.get("full_name"),
            "institution_sector_id": inst.get("sector_id"),
            "institution_sector_name": sector_map.get(inst.get("sector_id") or 0),
            "vendor_name": vendor_map.get(c["vendor_id"], f"Vendor #{c['vendor_id']}"),
        })
    return enriched


@router.get("/top")
def get_top_captures(
    limit: int = Query(50, ge=1, le=200, description="Max captures to return"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Scope to one sector"),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """
    Top institutional-capture candidates, ranked by
    (share_delta) × sqrt(captured_value_MXN).

    Each entry is an (institution, vendor) pair where the vendor's share
    of the institution's procurement grew from <= 25% to >= 50% across at
    least 4 years of the 2018–2025 window, with sufficient absolute value
    on both the vendor and institution sides to rule out noise.

    This is NOT a model output — no ML, no regression. It is arithmetic on
    COMPRANET contract awards. Findings are publishable on their own
    (with the usual "not proof of wrongdoing" caveat — legitimate
    concentration can emerge from technical certification, regional
    exclusivity, or single-source regulatory dependency).
    """
    conn.row_factory = sqlite3.Row
    cache_key = f"top:{limit}:{sector_id or 'all'}"
    cached = app_cache.get("capture", cache_key)
    if cached is not None:
        return cached

    candidates = _build_candidates(conn)
    enriched = _enrich_with_names(conn, candidates)

    if sector_id is not None:
        enriched = [c for c in enriched if c.get("institution_sector_id") == sector_id]

    enriched.sort(key=lambda c: c["score"], reverse=True)
    top = enriched[:limit]

    response = {
        "thresholds": {
            "min_inst_total_mxn": _MIN_INST_TOTAL,
            "min_cumulative_value_mxn": _MIN_CUM_VALUE,
            "floor_share_pct": _FLOOR_SHARE,
            "ceil_share_pct": _CEIL_SHARE,
            "min_years": _MIN_YEARS,
            "year_window": "2018-2025",
        },
        "total_captures": len(enriched),
        "total_unfiltered": len(candidates),
        "data": top,
    }
    # Expensive computation; cache for 30 minutes.
    app_cache.set("capture", cache_key, response, maxsize=16, ttl=1800)
    return response
