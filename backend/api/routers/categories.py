"""
Spending Categories API endpoints.

Provides category-level statistics, contract lists, and yearly trends
based on the Mexican government's partida-especifica classification.
"""
import json
import logging
import time as _time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query, HTTPException

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories"])

# 1h cache for /{id}/top-vendors. The biggest categories (Medicamentos,
# Alimentos y Viveres, Mantenimiento General) take 25-30+ seconds to
# aggregate uncached — well past the 30s axios timeout. Vendor shares per
# category only change with new ETL, so stale-but-fast is the right tradeoff.
_top_vendors_cache: Dict[str, Any] = {}
_TOP_VENDORS_TTL = 3600


def _table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    return cur.fetchone() is not None


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists on a table (used to stay backward-compatible
    with deploy DBs that predate a column backfill — e.g. high_risk_pct)."""
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cur.fetchall())


def _read_precomputed_signal(cur, key: str):
    """Return a precomputed JSON signal from precomputed_stats by stat_key, or
    None if absent/unreadable. The /{id}/{competition,seasonality,patterns}
    endpoints run multi-scan per-category aggregations that time out live on the
    5 GB deploy DB (>12s → 504); scripts/_precompute_category_signals.py writes
    one row per category so these read O(1). The live query below stays as the
    fallback when the precompute is missing (e.g. a fresh DB)."""
    try:
        cur.execute(
            "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?", (key,)
        )
        row = cur.fetchone()
        if row and row["stat_value"]:
            return json.loads(row["stat_value"])
    except Exception:
        pass
    return None


@router.get("/summary")
def get_categories_summary():
    """Return all categories with aggregated stats, sorted by total_value desc."""
    with get_db() as conn:
        if not _table_exists(conn, "category_stats"):
            return {"data": [], "total": 0}
        # high_risk_pct was added after the original category_stats schema; fall
        # back to NULL on deploy DBs that predate the backfill so /summary never 500s.
        has_hrp = _column_exists(conn, "category_stats", "high_risk_pct")
        hrp_select = "cs.high_risk_pct" if has_hrp else "NULL"
        cur = conn.cursor()
        cur.execute(f"""
            SELECT
                cs.category_id,
                cs.category_name,
                cs.category_name_en,
                cs.sector_id,
                s.code as sector_code,
                cs.total_contracts,
                cs.total_value,
                cs.avg_risk,
                {hrp_select} as high_risk_pct,
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
                "high_risk_pct": round(r["high_risk_pct"], 1) if r["high_risk_pct"] is not None else None,
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


# Audit Fix E (Issue #001) — institution_type values that are clearly
# state-level / municipal / regional and should be EXCLUDED from a
# "federal" scope ranking. Federal-tier types stay in by omission.
# State-level types here have ~3,000+ rows total; federal-tier types
# total ~325. Without this filter, any "top institutions" ranking is
# mathematically dominated by state institutions despite tiny per-
# institution contract counts. See docs/RUBLI_v1.0_HONEST_AUDIT.md §4.
NON_FEDERAL_INSTITUTION_TYPES = (
    "state_agency",
    "state_government",
    "state_enterprise_finance",
    "state_enterprise_energy",
    "state_enterprise_infra",
    "municipal",
    "other",
)


@router.get("/{category_id}/vendor-institution")
def get_category_vendor_institution(
    category_id: int,
    limit: int = Query(25, ge=1, le=50),
    scope: str = Query("federal", pattern="^(federal|all)$"),
):
    """Return top vendor-institution pairs for a category by total value.

    `scope` (Audit Fix E, 2026-05-07):
      - `federal` (default): excludes state, municipal, and state-enterprise
        institutions whose tiny denominators dominate the ranking and mislead
        readers comparing federal procurement.
      - `all`: legacy behavior — every institution type included.
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Fast path: serve from the precomputed capture-pairs table if present
        # (built by _precompute_category_enrichments.py — top-N vendor×institution
        # pairs by value, all scopes). This is what lets the dossier render the
        # pairs INSTANTLY instead of behind a ~14s "Load" button. The live
        # aggregation below remains the fallback for deploy DBs that predate it.
        if _table_exists(conn, "category_vendor_institution_topn"):
            prows = cur.execute("""
                SELECT vendor_id, vendor_name, institution_id, institution_name,
                       contract_count, total_value, avg_risk, max_risk,
                       direct_award_pct, single_bid_pct
                FROM category_vendor_institution_topn
                WHERE category_id = ?
                ORDER BY rank
                LIMIT ?
            """, (category_id, limit)).fetchall()
            if prows:
                return {
                    "category_id": category_id,
                    "category_name": cat["name_es"],
                    "scope": "all",
                    "precomputed": True,
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
                        for r in prows
                    ],
                    "total": len(prows),
                }

        scope_filter = ""
        params: list = [category_id]
        if scope == "federal":
            placeholders = ", ".join(["?"] * len(NON_FEDERAL_INSTITUTION_TYPES))
            scope_filter = f"AND i.institution_type NOT IN ({placeholders})"
            params.extend(NON_FEDERAL_INSTITUTION_TYPES)
        params.append(limit)

        cur.execute(f"""
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
              {scope_filter}
            GROUP BY c.vendor_id, c.institution_id
            ORDER BY total_value DESC
            LIMIT ?
        """, params)
        rows = cur.fetchall()

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "scope": scope,
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


@router.get("/{category_id}/patterns")
def get_category_patterns(category_id: int):
    """ARIA fraud-pattern concentration for vendors active in this category."""
    PATTERN_META = {
        "P1": {"label_es": "Monopolio estructural", "label_en": "Structural monopoly",   "color": "#f87171"},
        "P2": {"label_es": "Empresa fantasma",      "label_en": "Ghost company",         "color": "#fb923c"},
        "P3": {"label_es": "Intermediario",         "label_en": "Intermediary",          "color": "#fbbf24"},
        "P4": {"label_es": "Red coordinada",        "label_en": "Coordinated network",   "color": "#a78bfa"},
        "P5": {"label_es": "Fraccionamiento",       "label_en": "Threshold splitting",   "color": "#60a5fa"},
        "P6": {"label_es": "Captura institucional", "label_en": "Institutional capture", "color": "#34d399"},
        "P7": {"label_es": "Patrón mixto",          "label_en": "Mixed pattern",         "color": "#94a3b8"},
    }

    with get_db() as conn:
        cur = conn.cursor()
        pre = _read_precomputed_signal(cur, f"category_patterns:{category_id}")
        if pre is not None:
            return pre
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Total distinct vendors in this category
        cur.execute("""
            SELECT COUNT(DISTINCT vendor_id) AS total_vendors
            FROM contracts WHERE category_id = ?
        """, (category_id,))
        total_vendors = cur.fetchone()["total_vendors"] or 1

        # ARIA pattern distribution for those vendors
        cur.execute("""
            SELECT
                aq.primary_pattern,
                COUNT(DISTINCT aq.vendor_id)                          AS vendor_count,
                AVG(COALESCE(aq.pattern_confidence, 0))               AS avg_confidence,
                SUM(CASE WHEN aq.ips_tier IN (1,2) THEN 1 ELSE 0 END) AS high_tier_count
            FROM aria_queue aq
            WHERE aq.vendor_id IN (
                SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?
            )
            AND aq.primary_pattern IS NOT NULL
            GROUP BY aq.primary_pattern
            ORDER BY vendor_count DESC
        """, (category_id,))
        pattern_rows = cur.fetchall()

        # Tier distribution
        cur.execute("""
            SELECT aq.ips_tier, COUNT(*) AS cnt
            FROM aria_queue aq
            WHERE aq.vendor_id IN (
                SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?
            )
            GROUP BY aq.ips_tier ORDER BY aq.ips_tier
        """, (category_id,))
        tier_rows = cur.fetchall()

        # ARIA vendor count
        cur.execute("""
            SELECT COUNT(DISTINCT aq.vendor_id) AS in_aria
            FROM aria_queue aq
            WHERE aq.vendor_id IN (
                SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?
            )
        """, (category_id,))
        in_aria = cur.fetchone()["in_aria"] or 0

    patterns = []
    for r in pattern_rows:
        code = r["primary_pattern"]
        meta = PATTERN_META.get(code, {"label_es": code, "label_en": code, "color": "#94a3b8"})
        patterns.append({
            "pattern": code,
            "label_es": meta["label_es"],
            "label_en": meta["label_en"],
            "color": meta["color"],
            "vendor_count": r["vendor_count"],
            "pct_of_aria": round(r["vendor_count"] * 100.0 / max(in_aria, 1), 1),
            "avg_confidence": round(r["avg_confidence"] or 0, 2),
            "high_tier_count": r["high_tier_count"],
        })

    tier_dist = [{"tier": r["ips_tier"], "count": r["cnt"]} for r in tier_rows]

    dominant = patterns[0] if patterns else None

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "total_vendors": total_vendors,
        "vendors_in_aria": in_aria,
        "patterns": patterns,
        "tier_distribution": tier_dist,
        "dominant_pattern": dominant["pattern"] if dominant else None,
    }


@router.get("/{category_id}/seasonality")
def get_category_seasonality(category_id: int):
    """Monthly spend distribution — surface the December rush pattern."""
    MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    with get_db() as conn:
        cur = conn.cursor()
        pre = _read_precomputed_signal(cur, f"category_seasonality:{category_id}")
        if pre is not None:
            return pre
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        cur.execute("""
            SELECT contract_month AS month,
                   COUNT(*)                   AS contracts,
                   COALESCE(SUM(amount_mxn), 0) AS value
            FROM contracts
            WHERE category_id = ?
              AND contract_month BETWEEN 1 AND 12
              AND amount_mxn IS NOT NULL
              AND amount_mxn < 10000000000
            GROUP BY contract_month
            ORDER BY contract_month
        """, (category_id,))
        rows = cur.fetchall()

        # Q4 (Oct-Dec) rush — compare vs Q1+Q2 baseline
        cur.execute("""
            SELECT contract_year AS year,
                   SUM(CASE WHEN contract_month = 12 THEN amount_mxn ELSE 0 END) AS dec_val,
                   SUM(amount_mxn) AS total_val,
                   COUNT(*) AS total_cnt,
                   SUM(CASE WHEN contract_month = 12 THEN 1 ELSE 0 END) AS dec_cnt
            FROM contracts
            WHERE category_id = ?
              AND contract_month BETWEEN 1 AND 12
              AND contract_year BETWEEN 2010 AND 2025
              AND amount_mxn IS NOT NULL
              AND amount_mxn < 10000000000
            GROUP BY contract_year
            ORDER BY contract_year
        """, (category_id,))
        year_rows = cur.fetchall()

    total_val = sum(r["value"] for r in rows) or 1.0
    total_cnt = sum(r["contracts"] for r in rows) or 1

    monthly = []
    for r in rows:
        m = r["month"]
        monthly.append({
            "month": m,
            "month_name": MONTH_NAMES[m - 1],
            "contracts": r["contracts"],
            "value": round(r["value"], 2),
            "pct_contracts": round(r["contracts"] * 100.0 / total_cnt, 1),
            "pct_value": round(r["value"] * 100.0 / total_val, 1),
        })

    # Pad missing months with zeros
    present = {r["month"] for r in rows}
    for m in range(1, 13):
        if m not in present:
            monthly.append({
                "month": m, "month_name": MONTH_NAMES[m - 1],
                "contracts": 0, "value": 0.0,
                "pct_contracts": 0.0, "pct_value": 0.0,
            })
    monthly.sort(key=lambda x: x["month"])

    dec_row = next((r for r in monthly if r["month"] == 12), None)
    dec_pct_value = dec_row["pct_value"] if dec_row else 0.0
    # Expected share if uniform = 8.33%
    december_index = round(dec_pct_value / 8.33, 2) if dec_pct_value else 0.0

    yearly_dec = [
        {
            "year": r["year"],
            "dec_pct": round(r["dec_val"] * 100.0 / r["total_val"], 1) if r["total_val"] else 0.0,
            "dec_cnt_pct": round(r["dec_cnt"] * 100.0 / r["total_cnt"], 1) if r["total_cnt"] else 0.0,
        }
        for r in year_rows if r["total_val"] and r["total_val"] > 0
    ]

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "monthly": monthly,
        "december_pct_value": dec_pct_value,
        "december_index": december_index,   # >1 = above expected
        "yearly_december": yearly_dec,
    }


@router.get("/{category_id}/competition")
def get_category_competition(category_id: int):
    """Return competition metrics: procedure breakdown, DA/single-bid trends, sector benchmark."""
    with get_db() as conn:
        cur = conn.cursor()
        pre = _read_precomputed_signal(cur, f"category_competition:{category_id}")
        if pre is not None:
            return pre
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Procedure type breakdown
        cur.execute("""
            SELECT
                COALESCE(procedure_type_normalized, 'desconocido') AS proc_type,
                COUNT(*)           AS cnt,
                COALESCE(SUM(amount_mxn), 0) AS val
            FROM contracts
            WHERE category_id = ?
            GROUP BY procedure_type_normalized
            ORDER BY cnt DESC
        """, (category_id,))
        proc_rows = cur.fetchall()
        total_cnt = sum(r["cnt"] for r in proc_rows) or 1
        total_val = sum(r["val"] for r in proc_rows) or 1.0

        procedure_breakdown = [
            {
                "type": r["proc_type"],
                "count": r["cnt"],
                "pct_contracts": round(r["cnt"] * 100.0 / total_cnt, 1),
                "value": round(r["val"], 2),
                "pct_value": round(r["val"] * 100.0 / total_val, 1),
            }
            for r in proc_rows
        ]

        # Direct-award & single-bid trend by year
        cur.execute("""
            SELECT
                contract_year                                  AS year,
                COUNT(*)                                       AS contracts,
                SUM(is_direct_award) * 100.0 / COUNT(*)       AS da_pct,
                SUM(is_single_bid)   * 100.0 / COUNT(*)       AS sb_pct
            FROM contracts
            WHERE category_id = ? AND contract_year BETWEEN 2010 AND 2025
            GROUP BY contract_year
            ORDER BY contract_year
        """, (category_id,))
        trend_rows = cur.fetchall()
        yearly_trend = [
            {
                "year": r["year"],
                "contracts": r["contracts"],
                "da_pct": round(r["da_pct"] or 0, 1),
                "sb_pct": round(r["sb_pct"] or 0, 1),
            }
            for r in trend_rows
        ]

        # Sector benchmark — avg direct_award_pct across all categories in same sector
        cur.execute("""
            SELECT cs.sector_id
            FROM category_stats cs WHERE cs.category_id = ?
        """, (category_id,))
        sector_row = cur.fetchone()
        sector_id = sector_row["sector_id"] if sector_row else None

        sector_da_avg = None
        sector_sb_avg = None
        if sector_id:
            cur.execute("""
                SELECT AVG(cs.direct_award_pct) AS da_avg,
                       AVG(cs.single_bid_pct)   AS sb_avg
                FROM category_stats cs
                WHERE cs.sector_id = ? AND cs.total_contracts >= 100
            """, (sector_id,))
            bm = cur.fetchone()
            if bm and bm["da_avg"] is not None:
                sector_da_avg = round(bm["da_avg"], 1)
                sector_sb_avg = round(bm["sb_avg"] or 0, 1)

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "sector_id": sector_id,
        "total_contracts": total_cnt,
        "procedure_breakdown": procedure_breakdown,
        "yearly_trend": yearly_trend,
        "sector_da_avg": sector_da_avg,
        "sector_sb_avg": sector_sb_avg,
    }


@router.get("/{category_id}/price-distribution")
def get_category_price_distribution(category_id: int):
    """Return contract-amount distribution: P25/P50/P75, mean, skew ratio, outlier count.

    Fast path: served from precomputed_stats['category_price_distribution'] when
    present (the live percentile scan over a category's rows takes >30s and was
    why this section was previously omitted). Live compute is the fallback.
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")

        if _table_exists(conn, "precomputed_stats"):
            pre = cur.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'category_price_distribution'"
            ).fetchone()
            if pre:
                try:
                    entry = json.loads(pre[0]).get(str(category_id))
                except (json.JSONDecodeError, AttributeError):
                    entry = None
                if entry and entry.get("n", 0) > 0:
                    return {
                        "category_id": category_id,
                        "category_name": cat["name_es"],
                        "precomputed": True,
                        "n": entry["n"],
                        "p25": entry.get("p25"),
                        "p50": entry.get("p50"),
                        "p75": entry.get("p75"),
                        "mean": entry.get("mean"),
                        "iqr": entry.get("iqr"),
                        "mean_median_ratio": entry.get("mean_median_ratio"),
                        "outlier_count": entry.get("outlier_count", 0),
                        "outlier_value": entry.get("outlier_value", 0),
                        "outlier_value_pct": entry.get("outlier_value_pct", 0.0),
                        "mega_count": entry.get("mega_count", 0),
                        "mega_value": entry.get("mega_value", 0),
                        "mega_value_pct": entry.get("mega_value_pct", 0.0),
                        "total_value": entry.get("total_value", 0),
                        "yearly_trend": [],
                    }

        # Total valid count
        cur.execute("""
            SELECT COUNT(*) AS n
            FROM contracts
            WHERE category_id = ? AND amount_mxn > 0 AND amount_mxn < 10000000000
        """, (category_id,))
        n = cur.fetchone()["n"] or 0

        p25 = p50 = p75 = mean_val = None
        iqr = None
        outlier_count = 0
        outlier_value = 0.0

        if n > 0:
            def _percentile(q_offset: int):
                cur.execute("""
                    SELECT amount_mxn
                    FROM contracts
                    WHERE category_id = ? AND amount_mxn > 0 AND amount_mxn < 10000000000
                    ORDER BY amount_mxn
                    LIMIT 1 OFFSET ?
                """, (category_id, q_offset))
                row = cur.fetchone()
                return row["amount_mxn"] if row else None

            p25 = _percentile(max(0, n // 4))
            p50 = _percentile(max(0, n // 2))
            p75 = _percentile(max(0, 3 * n // 4))

            cur.execute("""
                SELECT AVG(amount_mxn) AS mean_val
                FROM contracts
                WHERE category_id = ? AND amount_mxn > 0 AND amount_mxn < 10000000000
            """, (category_id,))
            mean_row = cur.fetchone()
            mean_val = mean_row["mean_val"] if mean_row else None

            if p25 is not None and p75 is not None:
                iqr = p75 - p25
                fence = p75 + 1.5 * iqr
                cur.execute("""
                    SELECT COUNT(*) AS cnt, COALESCE(SUM(amount_mxn), 0) AS total_val
                    FROM contracts
                    WHERE category_id = ?
                      AND amount_mxn > ?
                      AND amount_mxn < 10000000000
                """, (category_id, fence))
                out_row = cur.fetchone()
                outlier_count = out_row["cnt"] or 0
                outlier_value = out_row["total_val"] or 0.0

        mean_median_ratio = None
        if p50 and p50 > 0 and mean_val:
            mean_median_ratio = round(mean_val / p50, 2)

        # Yearly median trend (last 10 years)
        cur.execute("""
            SELECT
                CAST(strftime('%Y', contract_date) AS INTEGER) AS yr,
                COUNT(*) AS cnt,
                AVG(amount_mxn) AS avg_val
            FROM contracts
            WHERE category_id = ?
              AND amount_mxn > 0
              AND amount_mxn < 10000000000
              AND contract_date IS NOT NULL
              AND CAST(strftime('%Y', contract_date) AS INTEGER) >= 2015
            GROUP BY yr
            ORDER BY yr
        """, (category_id,))
        yearly_rows = cur.fetchall()
        yearly_trend = [
            {"year": r["yr"], "count": r["cnt"], "avg_value": round(r["avg_val"] or 0)}
            for r in yearly_rows
        ]

    return {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "n": n,
        "p25": round(p25) if p25 is not None else None,
        "p50": round(p50) if p50 is not None else None,
        "p75": round(p75) if p75 is not None else None,
        "mean": round(mean_val) if mean_val is not None else None,
        "iqr": round(iqr) if iqr is not None else None,
        "mean_median_ratio": mean_median_ratio,
        "outlier_count": outlier_count,
        "outlier_value": round(outlier_value),
        "yearly_trend": yearly_trend,
    }


@router.get("/{category_id}/top-vendors")
def get_category_top_vendors(
    category_id: int,
    limit: int = Query(15, ge=1, le=30),
    scope: str = Query("federal", pattern="^(federal|all)$"),
):
    """Return top vendors in a category with market share and HHI concentration.

    `scope` (Audit Fix E, Issue #001):
      - `federal` (default): counts only contracts placed by federal institutions,
        excluding state, municipal, and state-enterprise institution types whose
        tiny denominators skew the ranking.
      - `all`: legacy behavior — every institution type included.
    """
    cache_key = f"tv:{category_id}:{limit}:{scope}"
    cached = _top_vendors_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _TOP_VENDORS_TTL:
        return cached["data"]
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        scope_join = ""
        scope_filter = ""
        totals_params: list = [category_id]
        vendors_params: list = [category_id]
        if scope == "federal":
            placeholders = ", ".join(["?"] * len(NON_FEDERAL_INSTITUTION_TYPES))
            scope_join = "JOIN institutions i ON i.id = c.institution_id"
            scope_filter = f"AND i.institution_type NOT IN ({placeholders})"
            totals_params.extend(NON_FEDERAL_INSTITUTION_TYPES)
            vendors_params.extend(NON_FEDERAL_INSTITUTION_TYPES)

        cur.execute(f"""
            SELECT COALESCE(SUM(amount_mxn), 0) AS total_value,
                   COUNT(*) AS total_contracts
            FROM contracts c
            {scope_join}
            WHERE c.category_id = ? AND c.amount_mxn IS NOT NULL
            {scope_filter}
        """, totals_params)
        totals = cur.fetchone()
        cat_total_value = totals["total_value"] or 1.0
        cat_total_contracts = totals["total_contracts"] or 0

        vendors_params.append(limit)
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
            {scope_join}
            WHERE c.category_id = ? AND c.amount_mxn IS NOT NULL
            {scope_filter}
            GROUP BY c.vendor_id
            ORDER BY vendor_value DESC
            LIMIT ?
        """, vendors_params)
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

    result = {
        "category_id": category_id,
        "category_name": cat["name_es"],
        "scope": scope,
        "total_value": round(cat_total_value, 2),
        "total_contracts": cat_total_contracts,
        "hhi": round(hhi, 4),
        "concentration_label": concentration_label,
        "top3_share_pct": round(top3_share, 1),
        "data": vendors,
    }
    _top_vendors_cache[cache_key] = {"ts": _time.time(), "data": result}
    return result


@router.get("/{category_id}/top-vendors-fast")
def get_category_top_vendors_fast(
    category_id: int,
    limit: int = Query(5, ge=1, le=10),
):
    """O(1) top-vendors read from precomputed category_vendor_topn table.

    Falls back to the slow /top-vendors endpoint if the table hasn't been
    precomputed yet. Populated by scripts/_precompute_category_top_vendors.py.
    """
    with get_db() as conn:
        cur = conn.cursor()
        if not _table_exists(conn, "category_vendor_topn"):
            # Graceful fallback: redirect to slow endpoint
            raise HTTPException(
                status_code=503,
                detail="Precomputed vendor stats not yet available. Run scripts/_precompute_category_top_vendors.py first."
            )

        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        # Risk fields were backfilled into category_vendor_topn on 2026-06-09 so
        # the dossier's vendor-register Risk column is populated. Stay
        # backward-compatible with deploy DBs that predate the backfill.
        has_risk = _column_exists(conn, "category_vendor_topn", "avg_risk")
        risk_cols = ", avg_risk, max_risk, direct_award_pct, single_bid_pct" if has_risk else ""
        rows = cur.execute(f"""
            SELECT vendor_id, vendor_name, contract_count, vendor_value,
                   category_total_value, market_share_pct{risk_cols}
            FROM category_vendor_topn
            WHERE category_id = ?
            ORDER BY rank
            LIMIT ?
        """, (category_id, limit)).fetchall()

        if not rows:
            return {
                "category_id": category_id,
                "category_name": cat["name_es"],
                "total_value": 0.0,
                "total_contracts": 0,
                "hhi": 0.0,
                "concentration_label": "unknown",
                "top3_share_pct": 0.0,
                "data": [],
            }

        cat_total = rows[0]["category_total_value"]
        vendors = [
            {
                "vendor_id": r["vendor_id"],
                "vendor_name": r["vendor_name"],
                "contract_count": r["contract_count"],
                "vendor_value": r["vendor_value"],
                "market_share_pct": r["market_share_pct"],
                "avg_risk": (r["avg_risk"] if has_risk else None),
                "max_risk": (r["max_risk"] if has_risk else None),
                "direct_award_pct": (r["direct_award_pct"] if has_risk else None),
                "single_bid_pct": (r["single_bid_pct"] if has_risk else None),
            }
            for r in rows
        ]
        hhi = sum((v["market_share_pct"] / 100) ** 2 for v in vendors)
        top3_share = sum(v["market_share_pct"] for v in vendors[:3])

        return {
            "category_id": category_id,
            "category_name": cat["name_es"],
            "scope": "all",
            "total_value": round(cat_total, 2),
            "total_contracts": 0,
            "hhi": round(hhi, 4),
            "concentration_label": (
                "highly_concentrated" if hhi >= 0.25
                else "moderately_concentrated" if hhi >= 0.15
                else "competitive"
            ),
            "top3_share_pct": round(top3_share, 1),
            "data": vendors,
        }


@router.get("/{category_id}/top-contracts")
def get_category_top_contracts(category_id: int, limit: int = Query(8, ge=1, le=10)):
    """Largest single contracts in a category — the named, datable, clickable
    artifacts (megaprojects). Served from precomputed_stats['category_largest_contracts']
    (a live ORDER BY over a category's rows takes seconds and locks SQLite).
    Amounts pre-filtered to <= 100B MXN. Mirrors /sectors/{id}/top-contracts."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        contracts = []
        if _table_exists(conn, "precomputed_stats"):
            row = cur.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'category_largest_contracts'"
            ).fetchone()
            if row:
                try:
                    contracts = json.loads(row[0]).get(str(category_id), [])[:limit]
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.warning(f"category_largest_contracts parse failed: {e}")

        return {"category_id": category_id, "category_name": cat["name_es"], "contracts": contracts}


@router.get("/{category_id}/top-institutions")
def get_category_top_institutions(category_id: int, limit: int = Query(6, ge=1, le=10)):
    """Top buying institutions in a category (who SPENDS here) by value, with each
    institution's share of the category. Served from
    precomputed_stats['category_top_institutions']."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_es FROM categories WHERE id = ?", (category_id,))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")

        institutions = []
        if _table_exists(conn, "precomputed_stats"):
            row = cur.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'category_top_institutions'"
            ).fetchone()
            if row:
                try:
                    institutions = json.loads(row[0]).get(str(category_id), [])[:limit]
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.warning(f"category_top_institutions parse failed: {e}")

        return {"category_id": category_id, "category_name": cat["name_es"], "institutions": institutions}


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
