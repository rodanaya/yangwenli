"""
Spending Categories API endpoints.

Provides category-level statistics, contract lists, and yearly trends
based on the Mexican government's partida-especifica classification.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories"])


def _table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    return cur.fetchone() is not None


@router.get("/summary")
def get_categories_summary():
    """Return all categories with aggregated stats, sorted by total_value desc."""
    with get_db() as conn:
        if not _table_exists(conn, "category_stats"):
            return {"data": [], "total": 0}
        cur = conn.cursor()
        cur.execute("""
            SELECT
                cs.category_id,
                cs.category_name,
                cs.category_name_en,
                cs.sector_id,
                s.code as sector_code,
                cs.total_contracts,
                cs.total_value,
                cs.avg_risk,
                cs.direct_award_pct,
                cs.single_bid_pct,
                cs.top_vendor_id,
                cs.top_vendor_name,
                cs.top_institution_id,
                cs.top_institution_name
            FROM category_stats cs
            LEFT JOIN sectors s ON s.id = cs.sector_id
            ORDER BY cs.total_value DESC
        """)
        rows = cur.fetchall()

    return {
        "data": [
            {
                "category_id": r["category_id"],
                "name_es": r["category_name"],
                "name_en": r["category_name_en"],
                "sector_id": r["sector_id"],
                "sector_code": r["sector_code"],
                "total_contracts": r["total_contracts"],
                "total_value": r["total_value"],
                "avg_risk": round(r["avg_risk"] or 0, 4),
                "direct_award_pct": r["direct_award_pct"] or 0,
                "single_bid_pct": r["single_bid_pct"] or 0,
                "top_vendor": {
                    "id": r["top_vendor_id"],
                    "name": r["top_vendor_name"],
                } if r["top_vendor_id"] else None,
                "top_institution": {
                    "id": r["top_institution_id"],
                    "name": r["top_institution_name"],
                } if r["top_institution_id"] else None,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/{category_id}/contracts")
def get_category_contracts(
    category_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = Query("amount_mxn", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    risk_level: Optional[str] = Query(None),
    year: Optional[int] = Query(None, ge=2002, le=2026),
):
    """Return paginated contracts for a specific category."""
    # Whitelist sort_by to prevent SQL injection — only these column names are allowed
    allowed_sorts = {"amount_mxn", "contract_date", "risk_score", "contract_year"}
    if sort_by not in allowed_sorts:
        sort_by = "amount_mxn"
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"
    # safe: sort_by and sort_order are whitelisted above, never raw user input

    with get_db() as conn:
        cur = conn.cursor()

        # Verify category exists
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Build query
        conditions = ["c.category_id = ?"]
        params = [category_id]

        if risk_level:
            conditions.append("c.risk_level = ?")
            params.append(risk_level.lower())
        if year:
            conditions.append("c.contract_year = ?")
            params.append(year)

        # safe: conditions list contains only hardcoded column names, values are parameterized
        where = " AND ".join(conditions)
        offset = (page - 1) * per_page

        # Count
        cur.execute(f"SELECT COUNT(*) FROM contracts c WHERE {where}", params)
        total = cur.fetchone()[0]

        # Fetch page
        cur.execute(f"""
            SELECT c.id, c.title, c.amount_mxn, c.contract_date, c.contract_year,
                   c.risk_score, c.risk_level, c.is_direct_award, c.is_single_bid,
                   v.name as vendor_name, v.id as vendor_id,
                   i.name as institution_name, i.id as institution_id
            FROM contracts c
            LEFT JOIN vendors v ON v.id = c.vendor_id
            LEFT JOIN institutions i ON i.id = c.institution_id
            WHERE {where}
            ORDER BY c.{sort_by} {sort_order}
            LIMIT ? OFFSET ?
        """, params + [per_page, offset])
        rows = cur.fetchall()

    total_pages = (total + per_page - 1) // per_page

    return {
        "data": [
            {
                "id": r["id"],
                "title": r["title"],
                "amount_mxn": r["amount_mxn"],
                "contract_date": r["contract_date"],
                "contract_year": r["contract_year"],
                "risk_score": round(r["risk_score"] or 0, 4),
                "risk_level": r["risk_level"],
                "is_direct_award": bool(r["is_direct_award"]),
                "is_single_bid": bool(r["is_single_bid"]),
                "vendor_name": r["vendor_name"],
                "vendor_id": r["vendor_id"],
                "institution_name": r["institution_name"],
                "institution_id": r["institution_id"],
            }
            for r in rows
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get("/{category_id}/vendor-institution")
def get_category_vendor_institution(
    category_id: int,
    limit: int = Query(25, ge=1, le=50),
):
    """Return top vendor-institution pairs for a category by total value."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        cur.execute("""
            SELECT
                v.id   AS vendor_id,
                v.name AS vendor_name,
                i.id   AS institution_id,
                i.name AS institution_name,
                COUNT(*)                                         AS contract_count,
                SUM(c.amount_mxn)                               AS total_value,
                AVG(c.risk_score)                               AS avg_risk,
                MAX(c.risk_score)                               AS max_risk,
                SUM(c.is_direct_award) * 100.0 / COUNT(*)       AS direct_award_pct,
                SUM(c.is_single_bid)   * 100.0 / COUNT(*)       AS single_bid_pct
            FROM contracts c
            JOIN vendors      v ON v.id = c.vendor_id
            JOIN institutions i ON i.id = c.institution_id
            WHERE c.category_id = ?
            GROUP BY c.vendor_id, c.institution_id
            ORDER BY total_value DESC
            LIMIT ?
        """, (category_id, limit))
        rows = cur.fetchall()

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "data": [
            {
                "vendor_id": r["vendor_id"],
                "vendor_name": r["vendor_name"],
                "institution_id": r["institution_id"],
                "institution_name": r["institution_name"],
                "contract_count": r["contract_count"],
                "total_value": r["total_value"],
                "avg_risk": round(r["avg_risk"] or 0, 4),
                "max_risk": round(r["max_risk"] or 0, 4),
                "direct_award_pct": round(r["direct_award_pct"] or 0, 1),
                "single_bid_pct": round(r["single_bid_pct"] or 0, 1),
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/{category_id}/subcategories")
def get_category_subcategories(category_id: int):
    """Return precomputed subcategory breakdown for a category."""
    with get_db() as conn:
        cur = conn.cursor()

        # Verify category exists
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Check tables exist
        cur.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='subcategory_definitions'"
        )
        if not cur.fetchone():
            return {"data": [], "category_id": category_id, "total": 0}

        cur.execute("""
            SELECT
                sd.id             AS subcategory_id,
                sd.code,
                sd.name_en,
                sd.name_es,
                sd.is_catch_all,
                sd.display_order,
                COALESCE(ss.total_contracts, 0)   AS total_contracts,
                COALESCE(ss.total_value, 0)        AS total_value,
                COALESCE(ss.avg_risk, 0)           AS avg_risk,
                COALESCE(ss.direct_award_pct, 0)   AS direct_award_pct,
                COALESCE(ss.single_bid_pct, 0)     AS single_bid_pct,
                ss.year_min,
                ss.year_max,
                ss.top_vendor_name,
                ss.top_vendor_id,
                ss.example_titles,
                COALESCE(ss.pct_of_category, 0)    AS pct_of_category
            FROM subcategory_definitions sd
            LEFT JOIN subcategory_stats ss ON ss.subcategory_id = sd.id
            WHERE sd.category_id = ?
            ORDER BY COALESCE(ss.total_value, 0) DESC
        """, (category_id,))
        rows = cur.fetchall()

    import json as _json
    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "total": len(rows),
        "data": [
            {
                "subcategory_id": r["subcategory_id"],
                "code": r["code"],
                "name_en": r["name_en"],
                "name_es": r["name_es"],
                "is_catch_all": bool(r["is_catch_all"]),
                "display_order": r["display_order"],
                "total_contracts": r["total_contracts"],
                "total_value": r["total_value"],
                "avg_risk": round(r["avg_risk"] or 0, 4),
                "direct_award_pct": round(r["direct_award_pct"] or 0, 1),
                "single_bid_pct": round(r["single_bid_pct"] or 0, 1),
                "year_min": r["year_min"],
                "year_max": r["year_max"],
                "top_vendor_name": r["top_vendor_name"],
                "top_vendor_id": r["top_vendor_id"],
                "example_titles": _json.loads(r["example_titles"] or "[]"),
                "pct_of_category": round(r["pct_of_category"] or 0, 1),
            }
            for r in rows
        ],
    }


@router.get("/sexenio")
def get_categories_sexenio():
    """Return category spending grouped by Mexican presidential administration."""
    admins = [
        {"name": "Fox",        "years": "2001–06", "year_min": 2001, "year_max": 2006},
        {"name": "Calderón",   "years": "2007–12", "year_min": 2007, "year_max": 2012},
        {"name": "Peña Nieto", "years": "2013–18", "year_min": 2013, "year_max": 2018},
        {"name": "AMLO",       "years": "2019–24", "year_min": 2019, "year_max": 2024},
        {"name": "Sheinbaum",  "years": "2025–",   "year_min": 2025, "year_max": 2099},
    ]

    with get_db() as conn:
        if not _table_exists(conn, "category_yearly_stats"):
            return {"data": [], "administrations": [], "total": 0}
        cur = conn.cursor()
        cur.execute("""
            SELECT
                cys.category_id,
                cs.category_name,
                cs.category_name_en,
                cs.sector_id,
                s.code AS sector_code,
                cs.total_value AS lifetime_value,
                cys.year,
                cys.value,
                cys.contracts,
                cys.avg_risk
            FROM category_yearly_stats cys
            JOIN category_stats cs ON cs.category_id = cys.category_id
            LEFT JOIN sectors s ON s.id = cs.sector_id
            WHERE cys.year >= 2001
            ORDER BY cs.total_value DESC, cys.year
        """)
        rows = cur.fetchall()

    from collections import defaultdict
    cat_meta: dict = {}
    by_cat_admin: dict = defaultdict(
        lambda: defaultdict(lambda: {"value": 0.0, "contracts": 0, "risk_sum": 0.0, "risk_count": 0})
    )

    for r in rows:
        cat_id = r["category_id"]
        if cat_id not in cat_meta:
            cat_meta[cat_id] = {
                "name_es": r["category_name"],
                "name_en": r["category_name_en"],
                "sector_id": r["sector_id"],
                "sector_code": r["sector_code"],
                "lifetime_value": r["lifetime_value"] or 0.0,
            }
        year = r["year"]
        for adm in admins:
            if adm["year_min"] <= year <= adm["year_max"]:
                agg = by_cat_admin[cat_id][adm["name"]]
                agg["value"] += r["value"] or 0.0
                agg["contracts"] += r["contracts"] or 0
                if r["avg_risk"]:
                    agg["risk_sum"] += r["avg_risk"]
                    agg["risk_count"] += 1
                break

    result = []
    for cat_id, meta in cat_meta.items():
        admin_data = {}
        for adm in admins:
            agg = by_cat_admin[cat_id].get(
                adm["name"], {"value": 0.0, "contracts": 0, "risk_sum": 0.0, "risk_count": 0}
            )
            avg_risk = round(agg["risk_sum"] / agg["risk_count"], 4) if agg["risk_count"] > 0 else 0.0
            admin_data[adm["name"]] = {
                "value": round(agg["value"], 2),
                "contracts": agg["contracts"],
                "avg_risk": avg_risk,
            }
        result.append({
            "category_id": cat_id,
            "name_es": meta["name_es"],
            "name_en": meta["name_en"],
            "sector_id": meta["sector_id"],
            "sector_code": meta["sector_code"],
            "lifetime_value": round(meta["lifetime_value"], 2),
            "administrations": admin_data,
        })

    return {
        "data": result,
        "administrations": [{"name": a["name"], "years": a["years"]} for a in admins],
        "total": len(result),
    }


@router.get("/{category_id}/top-vendors")
def get_category_top_vendors(
    category_id: int,
    limit: int = Query(15, ge=1, le=30),
):
    """Return top vendors in a category with market share and HHI concentration."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        cur.execute("""
            SELECT COALESCE(SUM(amount_mxn), 0) AS total_value,
                   COUNT(*) AS total_contracts
            FROM contracts
            WHERE category_id = ? AND amount_mxn IS NOT NULL
        """, (category_id,))
        totals = cur.fetchone()
        cat_total_value = totals["total_value"] or 1.0
        cat_total_contracts = totals["total_contracts"] or 0

        cur.execute(f"""
            SELECT
                v.id   AS vendor_id,
                v.name AS vendor_name,
                COUNT(c.id)                                  AS contract_count,
                SUM(c.amount_mxn)                           AS vendor_value,
                AVG(c.risk_score)                           AS avg_risk,
                SUM(c.is_direct_award) * 100.0 / COUNT(*)  AS direct_award_pct,
                SUM(c.is_single_bid)   * 100.0 / COUNT(*)  AS single_bid_pct
            FROM contracts c
            JOIN vendors v ON v.id = c.vendor_id
            WHERE c.category_id = ? AND c.amount_mxn IS NOT NULL
            GROUP BY c.vendor_id
            ORDER BY vendor_value DESC
            LIMIT ?
        """, (category_id, limit))
        rows = cur.fetchall()

    vendors = []
    hhi = 0.0
    for r in rows:
        share = (r["vendor_value"] or 0.0) / cat_total_value
        hhi += share ** 2
        vendors.append({
            "vendor_id": r["vendor_id"],
            "vendor_name": r["vendor_name"],
            "contract_count": r["contract_count"],
            "vendor_value": round(r["vendor_value"] or 0.0, 2),
            "market_share_pct": round(share * 100, 2),
            "avg_risk": round(r["avg_risk"] or 0.0, 4),
            "direct_award_pct": round(r["direct_award_pct"] or 0.0, 1),
            "single_bid_pct": round(r["single_bid_pct"] or 0.0, 1),
        })

    if hhi >= 0.25:
        concentration_label = "highly_concentrated"
    elif hhi >= 0.15:
        concentration_label = "moderately_concentrated"
    else:
        concentration_label = "competitive"

    top3_share = sum(v["market_share_pct"] for v in vendors[:3])

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "total_value": round(cat_total_value, 2),
        "total_contracts": cat_total_contracts,
        "hhi": round(hhi, 4),
        "concentration_label": concentration_label,
        "top3_share_pct": round(top3_share, 1),
        "data": vendors,
    }


@router.get("/trends")
def get_category_trends(
    year_from: int = Query(2010, ge=2002, le=2025),
    year_to: int = Query(2025, ge=2002, le=2025),
):
    """Return yearly stats per category for trend charts."""
    with get_db() as conn:
        if not _table_exists(conn, "category_yearly_stats"):
            return {"data": [], "total": 0}
        cur = conn.cursor()
        cur.execute("""
            SELECT
                cys.category_id,
                cs.category_name,
                cs.category_name_en,
                cys.year,
                cys.contracts,
                cys.value,
                cys.avg_risk
            FROM category_yearly_stats cys
            JOIN category_stats cs ON cs.category_id = cys.category_id
            WHERE cys.year BETWEEN ? AND ?
            ORDER BY cys.category_id, cys.year
        """, (year_from, year_to))
        rows = cur.fetchall()

    return {
        "data": [
            {
                "category_id": r["category_id"],
                "name_es": r["category_name"],
                "name_en": r["category_name_en"],
                "year": r["year"],
                "contracts": r["contracts"],
                "value": r["value"],
                "avg_risk": round(r["avg_risk"] or 0, 4),
            }
            for r in rows
        ],
        "total": len(rows),
    }
