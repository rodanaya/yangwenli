"""
Executive Summary endpoint — consolidated data for the flagship report page.

Returns all data needed for the Executive Summary in a single call,
using precomputed tables for speed. Cached 10 minutes.
"""

import json
import logging
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/executive", tags=["executive"])

# In-memory cache
_cache: dict = {"data": None, "expires": 0}
CACHE_TTL = 600  # 10 minutes


@router.get("/summary")
async def get_executive_summary():
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
        _cache["data"] = result
        _cache["expires"] = now + CACHE_TTL
        return result
    except Exception as e:
        logger.error(f"Executive summary error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate executive summary")


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

    # 7. Top vendors by value (from materialized table)
    cur.execute("""
        SELECT v.id, v.name, vs.total_contracts, vs.total_value_mxn, vs.avg_risk_score
        FROM vendor_stats vs
        JOIN vendors v ON v.id = vs.vendor_id
        ORDER BY vs.total_value_mxn DESC
        LIMIT 10
    """)
    top_vendors = [
        {
            "id": row["id"],
            "name": row["name"],
            "contracts": row["total_contracts"],
            "value_billions": round((row["total_value_mxn"] or 0) / 1e9, 1),
            "avg_risk": round(row["avg_risk_score"] or 0, 4),
        }
        for row in cur.fetchall()
    ]

    # 8. Administration breakdown (live query — indexed on contract_year)
    cur.execute("""
        SELECT
            CASE
                WHEN contract_year BETWEEN 2001 AND 2006 THEN 'Fox'
                WHEN contract_year BETWEEN 2007 AND 2012 THEN 'Calderon'
                WHEN contract_year BETWEEN 2013 AND 2018 THEN 'Pena Nieto'
                WHEN contract_year BETWEEN 2019 AND 2024 THEN 'AMLO'
                WHEN contract_year >= 2025 THEN 'Sheinbaum'
            END as admin,
            COUNT(*) as contracts,
            SUM(amount_mxn) as total_value,
            ROUND(AVG(risk_score), 4) as avg_risk,
            ROUND(100.0 * SUM(CASE WHEN risk_score >= 0.30 THEN 1 ELSE 0 END)
                  / COUNT(*), 1) as high_risk_pct,
            ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END)
                  / COUNT(*), 1) as direct_award_pct
        FROM contracts
        WHERE contract_year >= 2001 AND contract_year <= 2025
        GROUP BY admin
        ORDER BY MIN(contract_year)
    """)
    admin_meta = {
        "Fox": ("Vicente Fox", "2001-2006", "PAN"),
        "Calderon": ("Felipe Calderon", "2007-2012", "PAN"),
        "Pena Nieto": ("Enrique Pena Nieto", "2013-2018", "PRI"),
        "AMLO": ("Andres Manuel Lopez Obrador", "2019-2024", "MORENA"),
        "Sheinbaum": ("Claudia Sheinbaum", "2025-present", "MORENA"),
    }
    administrations = []
    for row in cur.fetchall():
        name = row["admin"]
        full, years, party = admin_meta.get(name, (name, "", ""))
        administrations.append({
            "name": name,
            "full_name": full,
            "years": years,
            "party": party,
            "contracts": row["contracts"],
            "value": row["total_value"] or 0,
            "avg_risk": row["avg_risk"] or 0,
            "high_risk_pct": row["high_risk_pct"] or 0,
            "direct_award_pct": row["direct_award_pct"] or 0,
        })

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
    ground_truth = {
        "cases": 9,
        "vendors": 17,
        "contracts": 21252,
        "detection_rate": 90.6,
        "auc": 0.942,
        "case_details": [
            {"name": "IMSS Ghost Companies", "type": "Ghost companies",
             "contracts": 9366, "high_plus_pct": 99.0, "avg_score": 0.962, "sector": "salud"},
            {"name": "Segalmex Food Distribution", "type": "Procurement fraud",
             "contracts": 6326, "high_plus_pct": 94.3, "avg_score": 0.828, "sector": "agricultura"},
            {"name": "COVID-19 Emergency Procurement", "type": "Embezzlement",
             "contracts": 5371, "high_plus_pct": 91.8, "avg_score": 0.863, "sector": "salud"},
            {"name": "Cyber Robotic IT", "type": "Overpricing",
             "contracts": 139, "high_plus_pct": 43.2, "avg_score": 0.261, "sector": "tecnologia"},
            {"name": "Odebrecht-PEMEX Bribery", "type": "Bribery",
             "contracts": 35, "high_plus_pct": 68.6, "avg_score": 0.314, "sector": "energia"},
            {"name": "La Estafa Maestra", "type": "Ghost companies",
             "contracts": 10, "high_plus_pct": 70.0, "avg_score": 0.205, "sector": "gobernacion"},
            {"name": "Grupo Higa / Casa Blanca", "type": "Conflict of interest",
             "contracts": 3, "high_plus_pct": 33.3, "avg_score": 0.268, "sector": "infraestructura"},
            {"name": "Oceanografia PEMEX", "type": "Invoice fraud",
             "contracts": 2, "high_plus_pct": 100.0, "avg_score": 0.354, "sector": "energia"},
        ],
    }

    # 11. Model info (hardcoded)
    model = {
        "version": "v4.0",
        "auc": 0.942,
        "brier": 0.065,
        "lift": 4.04,
        "top_predictors": [
            {"name": "vendor_concentration", "beta": 1.0, "direction": "positive"},
            {"name": "industry_mismatch", "beta": 0.214, "direction": "positive"},
            {"name": "same_day_count", "beta": 0.142, "direction": "positive"},
            {"name": "institution_risk", "beta": 0.119, "direction": "positive"},
            {"name": "single_bid", "beta": 0.100, "direction": "positive"},
            {"name": "direct_award", "beta": -0.197, "direction": "negative"},
            {"name": "ad_period_days", "beta": -0.222, "direction": "negative"},
        ],
        "counterintuitive": [
            "Direct awards carry a negative coefficient — they are less risky, not more.",
            "Longer ad periods correlate with higher risk — corrupt vendors operate through normal timelines.",
            "Co-bidding rate was regularized to zero — no signal in current ground truth.",
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
