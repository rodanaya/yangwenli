"""
Executive Summary endpoint — consolidated data for the flagship report page.

Returns all data needed for the Executive Summary in a single call,
using precomputed tables for speed. Cached 10 minutes.
"""

import json
import logging
import threading
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/executive", tags=["executive"])

# In-memory cache (thread-safe)
_cache: dict = {"data": None, "expires": 0}
_cache_lock = threading.Lock()
CACHE_TTL = 600  # 10 minutes


@router.get("/summary")
def get_executive_summary():
    """Return consolidated executive summary data.

    Uses precomputed_stats table for fast reads, with supplementary queries
    for administration breakdown and top vendors/institutions.
    Cached for 10 minutes.
    """
    now = time.time()
    if _cache["data"] and now < _cache["expires"]:
        return _cache["data"]

    try:
        with get_db() as conn:
            result = _build_summary(conn)
        with _cache_lock:
            _cache["data"] = result
            _cache["expires"] = now + CACHE_TTL
        return result
    except Exception as e:
        logger.error(f"Executive summary error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate executive summary")


def _query_top_vendors(cur) -> list[dict]:
    """Query top vendors by value, merging duplicates via vendor_canonical_map if available."""
    try:
        # Check if the dedup table exists
        cur.execute("SELECT 1 FROM vendor_canonical_map LIMIT 1")
        cur.fetchone()
        # Cluster-aware query: group by canonical_id, sum contracts/value, weighted avg risk
        cur.execute("""
            SELECT
                COALESCE(vcm.canonical_id, v.id) AS canonical_id,
                MAX(v.name) AS name,
                SUM(vs.total_contracts) AS total_contracts,
                SUM(vs.total_value_mxn) AS total_value_mxn,
                CASE WHEN SUM(vs.total_contracts) > 0
                     THEN SUM(vs.avg_risk_score * vs.total_contracts) / SUM(vs.total_contracts)
                     ELSE 0 END AS avg_risk_score
            FROM vendor_stats vs
            JOIN vendors v ON v.id = vs.vendor_id
            LEFT JOIN vendor_canonical_map vcm ON vcm.vendor_id = v.id
            GROUP BY COALESCE(vcm.canonical_id, v.id)
            ORDER BY total_value_mxn DESC
            LIMIT 10
        """)
    except Exception:
        # Fallback: no dedup table, use simple query
        cur.execute("""
            SELECT v.id AS canonical_id, v.name,
                   vs.total_contracts, vs.total_value_mxn, vs.avg_risk_score
            FROM vendor_stats vs
            JOIN vendors v ON v.id = vs.vendor_id
            ORDER BY vs.total_value_mxn DESC
            LIMIT 10
        """)

    return [
        {
            "id": row["canonical_id"],
            "name": row["name"],
            "contracts": row["total_contracts"],
            "value_billions": round((row["total_value_mxn"] or 0) / 1e9, 1),
            "avg_risk": round(row["avg_risk_score"] or 0, 4),
        }
        for row in cur.fetchall()
    ]


def _build_summary(conn) -> dict:
    """Build the full executive summary from precomputed + live data."""
    cur = conn.cursor()

    # 1. Load precomputed stats (4 JSON blobs — fast)
    precomputed = {}
    cur.execute("SELECT stat_key, stat_value FROM precomputed_stats")
    for row in cur.fetchall():
        precomputed[row["stat_key"]] = json.loads(row["stat_value"])

    overview = precomputed.get("overview", {})
    sectors_raw = precomputed.get("sectors", [])
    risk_dist_raw = precomputed.get("risk_distribution", [])
    yearly_raw = precomputed.get("yearly_trends", [])

    # 2. Headline
    headline = {
        "total_contracts": overview.get("total_contracts", 0),
        "total_value": overview.get("total_value_mxn", 0),
        "total_vendors": overview.get("total_vendors", 0),
        "total_institutions": overview.get("total_institutions", 0),
        "min_year": 2002,
        "max_year": 2025,
    }

    # 3. Risk breakdown
    risk_map = {r["risk_level"]: r for r in risk_dist_raw}
    critical = risk_map.get("critical", {})
    high = risk_map.get("high", {})
    medium = risk_map.get("medium", {})
    low = risk_map.get("low", {})
    total_v = headline["total_value"] or 1
    total_c = headline["total_contracts"] or 1

    value_at_risk = critical.get("total_value_mxn", 0) + high.get("total_value_mxn", 0)

    risk = {
        "critical_count": critical.get("count", 0),
        "critical_value": critical.get("total_value_mxn", 0),
        "critical_pct": critical.get("percentage", 0),
        "high_count": high.get("count", 0),
        "high_value": high.get("total_value_mxn", 0),
        "high_pct": high.get("percentage", 0),
        "medium_count": medium.get("count", 0),
        "medium_value": medium.get("total_value_mxn", 0),
        "medium_pct": medium.get("percentage", 0),
        "low_count": low.get("count", 0),
        "low_value": low.get("total_value_mxn", 0),
        "low_pct": low.get("percentage", 0),
        "value_at_risk": value_at_risk,
        "value_at_risk_pct": round(value_at_risk / total_v * 100, 1) if total_v else 0,
        "high_risk_rate": round(
            (critical.get("count", 0) + high.get("count", 0)) / total_c * 100, 1
        ),
    }

    # 4. Procedures
    procedures = {
        "direct_award_pct": overview.get("direct_award_pct", 0),
        "single_bid_pct": overview.get("single_bid_pct", 0),
    }

    # 5. Sectors (all 12, enriched with high-risk pct)
    sectors = []
    for s in sectors_raw:
        t = s.get("total_contracts", 1) or 1
        hp = (s.get("high_risk_count", 0) + s.get("critical_risk_count", 0)) / t
        sectors.append({
            "code": s.get("code", ""),
            "name": s.get("name", ""),
            "contracts": s.get("total_contracts", 0),
            "value": s.get("total_value_mxn", 0),
            "avg_risk": round(s.get("avg_risk_score", 0), 4),
            "high_plus_pct": round(hp * 100, 1),
        })

    # 6. Top institutions by value (from materialized table)
    cur.execute("""
        SELECT ist.institution_id, i.name,
               ist.total_contracts, ist.total_value_mxn, ist.avg_risk_score
        FROM institution_stats ist
        JOIN institutions i ON i.id = ist.institution_id
        ORDER BY ist.total_value_mxn DESC
        LIMIT 10
    """)
    top_institutions = [
        {
            "name": row["name"],
            "contracts": row["total_contracts"],
            "value": row["total_value_mxn"] or 0,
            "avg_risk": round(row["avg_risk_score"] or 0, 4),
        }
        for row in cur.fetchall()
    ]

    # 7. Top vendors by value (cluster-aware if vendor_canonical_map exists)
    top_vendors = _query_top_vendors(cur)

    # 8. Administration breakdown (from precomputed_stats — was 90s live query)
    administrations = precomputed.get("administrations", [])

    # 9. Yearly trends (filtered to meaningful years)
    yearly_trends = [
        {
            "year": y["year"],
            "contracts": y["contracts"],
            "value_billions": round(y.get("value_mxn", 0) / 1e9, 1),
            "avg_risk": y.get("avg_risk", 0),
        }
        for y in yearly_raw
        if 2002 <= y.get("year", 0) <= 2025 and y.get("contracts", 0) > 100
    ]

    # 10. Ground truth validation (hardcoded — stable between retraining)
    # Updated to v5.0: 15 cases, 27 vendors, 26,582 contracts
    ground_truth = {
        "cases": 15,
        "vendors": 27,
        "contracts": 26582,
        "detection_rate": 99.8,
        "high_plus_rate": 93.0,
        "auc": 0.960,
        "train_auc": 0.967,
        "case_details": [
            {"name": "IMSS Ghost Companies", "type": "Ghost companies",
             "contracts": 9366, "high_plus_pct": 99.0, "avg_score": 0.977, "sector": "salud"},
            {"name": "Segalmex Food Distribution", "type": "Procurement fraud",
             "contracts": 6326, "high_plus_pct": 89.3, "avg_score": 0.664, "sector": "agricultura"},
            {"name": "COVID-19 Emergency Procurement", "type": "Embezzlement",
             "contracts": 5371, "high_plus_pct": 84.9, "avg_score": 0.821, "sector": "salud"},
            {"name": "Edenred Voucher Monopoly", "type": "Monopoly",
             "contracts": 2939, "high_plus_pct": 96.7, "avg_score": 0.884, "sector": "energia"},
            {"name": "Toka IT Monopoly", "type": "Monopoly",
             "contracts": 1954, "high_plus_pct": 100.0, "avg_score": 0.964, "sector": "tecnologia"},
            {"name": "Infrastructure Fraud Network", "type": "Overpricing",
             "contracts": 191, "high_plus_pct": 99.5, "avg_score": 0.962, "sector": "infraestructura"},
            {"name": "SAT SixSigma Tender Rigging", "type": "Tender rigging",
             "contracts": 147, "high_plus_pct": 87.8, "avg_score": 0.756, "sector": "hacienda"},
            {"name": "Cyber Robotic IT", "type": "Overpricing",
             "contracts": 139, "high_plus_pct": 14.4, "avg_score": 0.249, "sector": "tecnologia"},
            {"name": "PEMEX-Cotemar Irregularities", "type": "Procurement fraud",
             "contracts": 51, "high_plus_pct": 100.0, "avg_score": 1.000, "sector": "energia"},
            {"name": "IPN Cartel de la Limpieza", "type": "Bid rigging",
             "contracts": 48, "high_plus_pct": 64.6, "avg_score": 0.551, "sector": "educacion"},
            {"name": "Odebrecht-PEMEX Bribery", "type": "Bribery",
             "contracts": 35, "high_plus_pct": 97.1, "avg_score": 0.915, "sector": "energia"},
            {"name": "La Estafa Maestra", "type": "Ghost companies",
             "contracts": 10, "high_plus_pct": 0.0, "avg_score": 0.179, "sector": "gobernacion"},
            {"name": "Grupo Higa / Casa Blanca", "type": "Conflict of interest",
             "contracts": 3, "high_plus_pct": 33.3, "avg_score": 0.359, "sector": "infraestructura"},
            {"name": "Oceanografia PEMEX", "type": "Invoice fraud",
             "contracts": 2, "high_plus_pct": 0.0, "avg_score": 0.152, "sector": "energia"},
        ],
    }

    # 11. Model info (hardcoded — v5.0 per-sector calibrated)
    model = {
        "version": "v5.0",
        "features": 16,
        "sub_models": 13,
        "auc": 0.960,
        "train_auc": 0.967,
        "brier": 0.060,
        "lift": 4.04,
        "pu_correction": 0.887,
        "top_predictors": [
            {"name": "price_volatility", "beta": 1.219, "direction": "positive"},
            {"name": "institution_diversity", "beta": -0.848, "direction": "negative"},
            {"name": "win_rate", "beta": 0.727, "direction": "positive"},
            {"name": "vendor_concentration", "beta": 0.428, "direction": "positive"},
            {"name": "sector_spread", "beta": -0.374, "direction": "negative"},
            {"name": "industry_mismatch", "beta": 0.305, "direction": "positive"},
            {"name": "same_day_count", "beta": 0.222, "direction": "positive"},
            {"name": "direct_award", "beta": 0.182, "direction": "positive"},
            {"name": "ad_period_days", "beta": -0.104, "direction": "negative"},
        ],
        "counterintuitive": [
            "Institution diversity is protective — vendors serving many institutions are less suspicious.",
            "Sector spread reduces risk — genuinely diversified vendors operate across sectors.",
            "Price volatility is the #1 predictor — vendors with wildly varying contract sizes are most suspicious.",
        ],
    }

    return {
        "headline": headline,
        "risk": risk,
        "procedures": procedures,
        "sectors": sectors,
        "top_institutions": top_institutions,
        "top_vendors": top_vendors,
        "administrations": administrations,
        "yearly_trends": yearly_trends,
        "ground_truth": ground_truth,
        "model": model,
        "generated_at": datetime.utcnow().isoformat(),
    }
