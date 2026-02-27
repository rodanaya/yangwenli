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
