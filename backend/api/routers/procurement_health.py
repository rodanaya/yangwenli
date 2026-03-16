"""
Procurement Health Index (PHI) — Rule-based risk indicators.

Based on IMF CRI (WP/2022/094), OECD Government at a Glance,
and EU Single Market Scoreboard methodologies.

No ML. Every indicator is internationally recognized, simple,
and verifiable from raw COMPRANET data.
"""
import sqlite3
import json
import logging
import threading
import time
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/procurement-health", tags=["procurement-health"])

# ---------------------------------------------------------------------------
# Thresholds — sourced from OECD, EU Scoreboard, DOJ/FTC
# ---------------------------------------------------------------------------

THRESHOLDS = {
    "competition_rate": {
        # % of contracts awarded competitively (not direct award)
        # OECD avg competitive rate ~70-85% in advanced economies
        "green": 60,   # >=60% competitive
        "yellow": 35,  # 35-60%
        # <35% = red
        "unit": "%",
        "direction": "higher_is_better",
        "source": "OECD Government at a Glance 2025",
    },
    "single_bid_rate": {
        # % of competitive procedures with only 1 bidder
        # EU Scoreboard: green <=10%, red >20%
        "green": 10,
        "yellow": 20,
        # >20% = red
        "unit": "%",
        "direction": "lower_is_better",
        "source": "EU Single Market Scoreboard; ECA SR-2023-28",
    },
    "avg_bidders": {
        # Average number of bidders in competitive procedures
        # OECD recommends minimum 3 for genuine competition
        "green": 3.0,
        "yellow": 2.0,
        # <2.0 = red
        "unit": "bidders",
        "direction": "higher_is_better",
        "source": "OECD Public Procurement Performance Report 2023",
    },
    "hhi": {
        # Herfindahl-Hirschman Index of vendor concentration
        # DOJ/FTC: <1000 = unconcentrated, 1000-1800 = moderate, >1800 = highly concentrated
        "green": 1000,
        "yellow": 1800,
        # >1800 = red
        "unit": "HHI",
        "direction": "lower_is_better",
        "source": "US DOJ/FTC 2023 Merger Guidelines",
    },
    "short_ad_rate": {
        # % of competitive procedures with <15 days advertisement
        # LAASSP requires 15+ days for national, 20+ for international
        "green": 10,
        "yellow": 20,
        # >20% = red
        "unit": "%",
        "direction": "lower_is_better",
        "source": "LAASSP Art. 32; EU Directive 2014/24",
    },
    "amendment_rate": {
        # % of contracts with contract modifications (convenio modificatorio)
        # EU average: ~10-15%. High rates suggest poor planning or scope creep.
        "green": 10,
        "yellow": 20,
        # >20% = red
        "unit": "%",
        "direction": "lower_is_better",
        "source": "EU Court of Auditors SR-2023-28; OECD 2023",
    },
}

# Grade mapping
def _grade(greens: int, total: int) -> str:
    """Map green-indicator count to letter grade."""
    if total == 0:
        return "N/A"
    ratio = greens / total
    if ratio >= 0.8:
        return "A"
    elif ratio >= 0.6:
        return "B"
    elif ratio >= 0.4:
        return "C"
    elif ratio >= 0.2:
        return "D"
    else:
        return "F"


def _traffic_light(indicator: str, value: float) -> str:
    """Return 'green', 'yellow', or 'red' for an indicator value."""
    t = THRESHOLDS[indicator]
    if t["direction"] == "higher_is_better":
        if value >= t["green"]:
            return "green"
        elif value >= t["yellow"]:
            return "yellow"
        else:
            return "red"
    else:  # lower_is_better
        if value <= t["green"]:
            return "green"
        elif value <= t["yellow"]:
            return "yellow"
        else:
            return "red"


# ---------------------------------------------------------------------------
# Core computation
# ---------------------------------------------------------------------------

def _compute_sector_phi(conn: sqlite3.Connection, sector_id: Optional[int] = None,
                        year_min: Optional[int] = None, year_max: Optional[int] = None) -> Dict[str, Any]:
    """Compute PHI indicators for a sector (or all sectors)."""

    where_clauses = ["c.amount_mxn > 0"]
    params: list = []

    if sector_id is not None:
        where_clauses.append("c.sector_id = ?")
        params.append(sector_id)
    if year_min is not None:
        where_clauses.append("c.contract_year >= ?")
        params.append(year_min)
    if year_max is not None:
        where_clauses.append("c.contract_year <= ?")
        params.append(year_max)

    where = " AND ".join(where_clauses)

    # 1. Competition rate + direct award stats
    row = conn.execute(f"""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
            SUM(amount_mxn) as total_value,
            SUM(CASE WHEN is_direct_award = 1 THEN amount_mxn ELSE 0 END) as da_value
        FROM contracts c
        WHERE {where}
    """, params).fetchone()

    total = row["total"] or 0
    if total == 0:
        return {"error": "No contracts found for this filter"}

    direct_awards = row["direct_awards"] or 0
    competition_rate = round((1 - direct_awards / total) * 100, 1)
    da_rate_value = round((row["da_value"] or 0) / (row["total_value"] or 1) * 100, 1)

    # 2. Single bidding rate (among competitive procedures only)
    sb_row = conn.execute(f"""
        SELECT
            COUNT(*) as competitive,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids
        FROM contracts c
        WHERE {where} AND is_direct_award = 0
    """, params).fetchone()

    competitive = sb_row["competitive"] or 0
    single_bids = sb_row["single_bids"] or 0
    single_bid_rate = round(single_bids / max(competitive, 1) * 100, 1)

    # 3. Average bidders in competitive procedures
    bidder_row = conn.execute(f"""
        SELECT AVG(bidder_count) as avg_bidders
        FROM (
            SELECT procedure_number, COUNT(DISTINCT vendor_id) as bidder_count
            FROM contracts c
            WHERE {where} AND is_direct_award = 0
                AND procedure_number IS NOT NULL
            GROUP BY procedure_number
        )
    """, params).fetchone()

    avg_bidders = round(bidder_row["avg_bidders"] or 0, 2)

    # 4. HHI — vendor concentration
    # HHI = sum of squared market shares (in percentage points)
    hhi_rows = conn.execute(f"""
        SELECT vendor_id, SUM(amount_mxn) as vendor_total
        FROM contracts c
        WHERE {where} AND vendor_id IS NOT NULL
        GROUP BY vendor_id
    """, params).fetchall()

    total_value = row["total_value"] or 1
    hhi = 0
    for hr in hhi_rows:
        share_pct = (hr["vendor_total"] / total_value) * 100
        hhi += share_pct ** 2
    hhi = round(hhi, 1)

    # 5. Short ad period rate (using publication_delay_days as proxy)
    ad_row = conn.execute(f"""
        SELECT
            COUNT(*) as with_ad,
            SUM(CASE WHEN publication_delay_days < 15 THEN 1 ELSE 0 END) as short_ads
        FROM contracts c
        WHERE {where} AND is_direct_award = 0 AND publication_delay_days > 0
    """, params).fetchone()

    with_ad = ad_row["with_ad"] or 0
    short_ads = ad_row["short_ads"] or 0
    short_ad_rate = round(short_ads / max(with_ad, 1) * 100, 1)

    # 6. Amendment rate (convenio modificatorio)
    amend_row = conn.execute(f"""
        SELECT
            COUNT(*) as total_with_data,
            SUM(CASE WHEN has_amendment = 1 THEN 1 ELSE 0 END) as amendments
        FROM contracts c
        WHERE {where} AND has_amendment IS NOT NULL
    """, params).fetchone()

    amend_total = amend_row["total_with_data"] or 0
    amendments = amend_row["amendments"] or 0
    amendment_rate = round(amendments / max(amend_total, 1) * 100, 1)

    # Build indicators
    indicators = {
        "competition_rate": {
            "value": competition_rate,
            "light": _traffic_light("competition_rate", competition_rate),
            "label": "Competition Rate",
            "description": f"{competition_rate}% of contracts awarded competitively",
            "benchmark": "OECD avg: 70-85%",
        },
        "single_bid_rate": {
            "value": single_bid_rate,
            "light": _traffic_light("single_bid_rate", single_bid_rate),
            "label": "Single Bidding Rate",
            "description": f"{single_bid_rate}% of competitive procedures had only 1 bidder",
            "benchmark": "EU threshold: ≤10% green, >20% red",
        },
        "avg_bidders": {
            "value": avg_bidders,
            "light": _traffic_light("avg_bidders", avg_bidders),
            "label": "Average Bidders",
            "description": f"{avg_bidders} average bidders per competitive procedure",
            "benchmark": "OECD minimum: 3.0",
        },
        "hhi": {
            "value": hhi,
            "light": _traffic_light("hhi", hhi),
            "label": "Vendor Concentration (HHI)",
            "description": f"HHI = {hhi} (0 = perfect competition, 10000 = monopoly)",
            "benchmark": "DOJ/FTC: <1000 unconcentrated, >1800 highly concentrated",
        },
        "short_ad_rate": {
            "value": short_ad_rate,
            "light": _traffic_light("short_ad_rate", short_ad_rate),
            "label": "Short Ad Period Rate",
            "description": f"{short_ad_rate}% of procedures had <15 days advertisement",
            "benchmark": "LAASSP requires 15+ days",
        },
        "amendment_rate": {
            "value": amendment_rate,
            "light": _traffic_light("amendment_rate", amendment_rate),
            "label": "Contract Amendment Rate",
            "description": f"{amendment_rate}% of contracts have modifications (convenio modificatorio)",
            "benchmark": "EU avg: ~10-15%; >20% indicates poor planning",
        },
    }

    # Grade
    greens = sum(1 for ind in indicators.values() if ind["light"] == "green")
    grade = _grade(greens, len(indicators))

    return {
        "total_contracts": total,
        "total_value_mxn": round(row["total_value"] or 0, 0),
        "direct_award_rate_by_value": da_rate_value,
        "competitive_contracts": competitive,
        "indicators": indicators,
        "grade": grade,
        "greens": greens,
        "yellows": sum(1 for ind in indicators.values() if ind["light"] == "yellow"),
        "reds": sum(1 for ind in indicators.values() if ind["light"] == "red"),
        "total_indicators": len(indicators),
    }


# ---------------------------------------------------------------------------
# Precomputed data helpers
# ---------------------------------------------------------------------------

_METHODOLOGY = {
    "name": "Procurement Health Index (PHI)",
    "version": "1.0",
    "based_on": [
        "IMF Working Paper WP/2022/094",
        "OECD Government at a Glance 2025",
        "EU Single Market Scoreboard (ECA SR-2023-28)",
        "US DOJ/FTC HHI Guidelines 2023",
    ],
    "indicators": len(THRESHOLDS),
    "description": (
        "Rule-based procurement health assessment using internationally "
        "recognized indicators. No machine learning. Every number is "
        "verifiable from raw COMPRANET data."
    ),
}

_GRADE_ORDER = {"F": 0, "D": 1, "C": 2, "B": 3, "A": 4, "N/A": 5}

# In-memory fallback cache — prevents the 538s live computation from running on every request
_phi_cache: dict = {"data": None, "expires": 0}
_phi_lock = threading.Lock()


def _load_precomputed(conn: sqlite3.Connection, key: str):
    """Return parsed JSON from precomputed_stats, or None if missing."""
    row = conn.execute(
        "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?", (key,)
    ).fetchone()
    if row is None:
        return None
    try:
        return json.loads(row["stat_value"])
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/sectors")
async def phi_all_sectors(
    year_min: Optional[int] = Query(None, description="Filter: minimum year"),
    year_max: Optional[int] = Query(None, description="Filter: maximum year"),
):
    """PHI report card for all 12 sectors. Served from precomputed data (<100ms)."""
    with get_db() as conn:
        # Fast path: precomputed all-time data (no year filter)
        if year_min is None and year_max is None:
            cached = _load_precomputed(conn, "phi_sectors")
            if cached is not None:
                results = cached["sectors"]
                results.sort(key=lambda x: _GRADE_ORDER.get(x.get("grade", "N/A"), 5))
                return {
                    "methodology": _METHODOLOGY,
                    "thresholds": THRESHOLDS,
                    "national": cached["national"],
                    "sectors": results,
                    "source": "precomputed",
                }

        # Fallback: live computation (year-filtered or cache miss)
        # Guard: only compute if not already cached (prevents 538s on every request)
        cache_key = f"{year_min}_{year_max}"
        now = time.time()
        with _phi_lock:
            cached_result = _phi_cache.get("data")
            if cached_result and _phi_cache.get("key") == cache_key and now < _phi_cache.get("expires", 0):
                return cached_result

        logger.warning("PHI /sectors falling back to live computation (year_min=%s year_max=%s)",
                       year_min, year_max)
        sectors = conn.execute(
            "SELECT id, name_en as name FROM sectors ORDER BY id"
        ).fetchall()
        results = []
        for s in sectors:
            phi = _compute_sector_phi(conn, sector_id=s["id"],
                                      year_min=year_min, year_max=year_max)
            results.append({"sector_id": s["id"], "sector_name": s["name"], **phi})
        results.sort(key=lambda x: _GRADE_ORDER.get(x.get("grade", "N/A"), 5))
        national = _compute_sector_phi(conn, year_min=year_min, year_max=year_max)
        result = {
            "methodology": _METHODOLOGY,
            "thresholds": THRESHOLDS,
            "national": {"sector_name": "National (all sectors)", **national},
            "sectors": results,
            "source": "live",
        }
        with _phi_lock:
            _phi_cache["data"] = result
            _phi_cache["key"] = cache_key
            _phi_cache["expires"] = time.time() + 3600  # cache 1 hour
        return result


@router.get("/sectors/{sector_id}")
async def phi_sector_detail(
    sector_id: int,
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
):
    """PHI detail for a single sector with year-over-year trend."""
    with get_db() as conn:
        sector = conn.execute(
            "SELECT id, name_en as name, code FROM sectors WHERE id = ?", (sector_id,)
        ).fetchone()
        if not sector:
            raise HTTPException(status_code=404, detail="Sector not found")

        # Fast path: precomputed all-time data (no year filter)
        if year_min is None and year_max is None:
            cached = _load_precomputed(conn, f"phi_sector_detail_{sector_id}")
            if cached is not None:
                return {**cached, "source": "precomputed"}

        # Fallback: live computation
        logger.warning("PHI /sectors/%d falling back to live computation", sector_id)
        phi = _compute_sector_phi(conn, sector_id=sector_id,
                                  year_min=year_min, year_max=year_max)
        trend = []
        for year in range(2015, 2026):
            year_phi = _compute_sector_phi(conn, sector_id=sector_id,
                                           year_min=year, year_max=year)
            if year_phi.get("total_contracts", 0) > 0:
                trend.append({
                    "year": year,
                    "competition_rate": year_phi["indicators"]["competition_rate"]["value"],
                    "single_bid_rate": year_phi["indicators"]["single_bid_rate"]["value"],
                    "avg_bidders": year_phi["indicators"]["avg_bidders"]["value"],
                    "grade": year_phi["grade"],
                    "total_contracts": year_phi["total_contracts"],
                })
        return {
            "sector_id": sector["id"],
            "sector_name": sector["name"],
            **phi,
            "trend": trend,
            "source": "live",
        }


@router.get("/trend")
async def phi_national_trend():
    """National PHI trend over time. Served from precomputed data."""
    with get_db() as conn:
        cached = _load_precomputed(conn, "phi_trend")
        if cached is not None:
            return {
                "description": (
                    "National procurement health trend — how Mexico's procurement "
                    "transparency has evolved over 15 years"
                ),
                "years": cached,
                "source": "precomputed",
            }

        # Fallback: live computation
        logger.warning("PHI /trend falling back to live computation")
        results = []
        for year in range(2010, 2026):
            phi = _compute_sector_phi(conn, year_min=year, year_max=year)
            if phi.get("total_contracts", 0) > 100:
                results.append({
                    "year": year,
                    "grade": phi["grade"],
                    "greens": phi["greens"],
                    "reds": phi["reds"],
                    "competition_rate": phi["indicators"]["competition_rate"]["value"],
                    "single_bid_rate": phi["indicators"]["single_bid_rate"]["value"],
                    "avg_bidders": phi["indicators"]["avg_bidders"]["value"],
                    "da_rate_by_value": phi["direct_award_rate_by_value"],
                    "total_contracts": phi["total_contracts"],
                    "total_value_mxn": phi["total_value_mxn"],
                })
        return {
            "description": (
                "National procurement health trend — how Mexico's procurement "
                "transparency has evolved over 15 years"
            ),
            "years": results,
            "source": "live",
        }


@router.get("/ml-correlation")
async def phi_ml_correlation():
    """Correlation between PHI indicators and ML risk scores. Served from precomputed data."""
    with get_db() as conn:
        cached = _load_precomputed(conn, "phi_ml_correlation")
        if cached is not None:
            # Compute live queries to supplement precomputed sector data
            da_risk = conn.execute("""
                SELECT CASE WHEN is_direct_award = 1 THEN 'Direct Award' ELSE 'Competitive' END as method,
                       COUNT(*) as contracts,
                       ROUND(AVG(risk_score), 4) as avg_risk,
                       ROUND(SUM(amount_mxn)/1e9, 1) as value_billion
                FROM contracts WHERE amount_mxn > 0 GROUP BY is_direct_award
            """).fetchall()
            sb_risk = conn.execute("""
                SELECT CASE WHEN is_single_bid = 1 THEN 'Single Bid'
                            WHEN is_direct_award = 0 THEN 'Multiple Bids'
                            ELSE 'Direct Award' END as category,
                       COUNT(*) as contracts,
                       ROUND(AVG(risk_score), 4) as avg_risk
                FROM contracts WHERE amount_mxn > 0
                GROUP BY category ORDER BY avg_risk DESC
            """).fetchall()
            agreement = conn.execute("""
                SELECT COUNT(*) as total_high_risk,
                       SUM(CASE WHEN is_direct_award = 1 OR is_single_bid = 1 THEN 1 ELSE 0 END) as also_phi_flagged,
                       ROUND(SUM(CASE WHEN is_direct_award = 1 OR is_single_bid = 1 THEN 1.0 ELSE 0.0 END)
                             / COUNT(*) * 100, 1) as agreement_pct
                FROM contracts WHERE risk_score >= 0.30 AND amount_mxn > 0
            """).fetchone()
            correlations = {
                "by_procedure_type": [dict(r) for r in da_risk],
                "by_competition": [dict(r) for r in sb_risk],
                "sector_comparison": cached.get("sectors", []),
                "ml_phi_agreement": {
                    "high_risk_contracts": agreement["total_high_risk"],
                    "also_flagged_by_phi": agreement["also_phi_flagged"],
                    "agreement_rate": agreement["agreement_pct"],
                    "interpretation": (
                        "Percentage of ML high-risk contracts that also trigger "
                        "at least one simple PHI red flag (direct award or single bid)"
                    ),
                },
            }
            return {
                "description": (
                    "Correlation between simple PHI indicators and ML risk scores. "
                    "When both approaches flag the same contracts, confidence increases."
                ),
                "correlations": correlations,
                "source": "precomputed",
            }

        # Fallback: live computation
        logger.warning("PHI /ml-correlation falling back to live computation")
        correlations: Dict[str, Any] = {}
        da_risk = conn.execute("""
            SELECT
                CASE WHEN is_direct_award = 1 THEN 'Direct Award' ELSE 'Competitive' END as method,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk,
                ROUND(SUM(amount_mxn)/1e9, 1) as value_billion
            FROM contracts WHERE amount_mxn > 0
            GROUP BY is_direct_award
        """).fetchall()
        correlations["by_procedure_type"] = [dict(r) for r in da_risk]

        sb_risk = conn.execute("""
            SELECT
                CASE WHEN is_single_bid = 1 THEN 'Single Bid'
                     WHEN is_direct_award = 0 THEN 'Multiple Bids'
                     ELSE 'Direct Award' END as category,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk
            FROM contracts WHERE amount_mxn > 0
            GROUP BY category ORDER BY avg_risk DESC
        """).fetchall()
        correlations["by_competition"] = [dict(r) for r in sb_risk]

        sector_comparison = conn.execute("""
            SELECT s.name_es as sector,
                   COUNT(*) as contracts,
                   ROUND(AVG(CASE WHEN c.is_direct_award = 0 THEN 1.0 ELSE 0.0 END) * 100, 1) as competition_rate,
                   ROUND(AVG(c.risk_score), 4) as avg_ml_risk
            FROM contracts c JOIN sectors s ON c.sector_id = s.id
            WHERE c.amount_mxn > 0
            GROUP BY s.id ORDER BY avg_ml_risk DESC
        """).fetchall()
        correlations["sector_comparison"] = [dict(r) for r in sector_comparison]

        agreement = conn.execute("""
            SELECT COUNT(*) as total_high_risk,
                   SUM(CASE WHEN is_direct_award = 1 OR is_single_bid = 1 THEN 1 ELSE 0 END) as also_phi_flagged,
                   ROUND(SUM(CASE WHEN is_direct_award = 1 OR is_single_bid = 1 THEN 1.0 ELSE 0.0 END)
                         / COUNT(*) * 100, 1) as agreement_pct
            FROM contracts WHERE risk_score >= 0.30 AND amount_mxn > 0
        """).fetchone()
        correlations["ml_phi_agreement"] = {
            "high_risk_contracts": agreement["total_high_risk"],
            "also_flagged_by_phi": agreement["also_phi_flagged"],
            "agreement_rate": agreement["agreement_pct"],
            "interpretation": (
                "Percentage of ML high-risk contracts that also trigger "
                "at least one simple PHI red flag (direct award or single bid)"
            ),
        }
        return {
            "description": (
                "Correlation between simple PHI indicators and ML risk scores. "
                "When both approaches flag the same contracts, confidence increases."
            ),
            "correlations": correlations,
            "source": "live",
        }
