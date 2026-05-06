"""
Atlas cluster-vendor endpoint.

GET /api/v1/atlas/cluster-vendors
Returns top vendors associated with a given constellation lens + cluster code.
Used by the frontend atlas-C-P3 drill-down panel.

Lens mapping:
  patterns   → filter aria_queue.primary_pattern = code (P1–P7)
  sectors    → filter aria_queue.primary_sector_id via sectors.code
  categories → join contracts → categories via categories.code (contracts table)
  terms      → no clean source table; returns empty list with explanatory note
"""
import json
import logging
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..dependencies import get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/atlas", tags=["atlas"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_VALID_LENSES = {"patterns", "sectors", "categories", "terms"}

# Human-readable pattern labels
_PATTERN_LABELS: dict[str, tuple[str, str]] = {
    "P1": ("Monopolio institucional", "Institutional monopoly"),
    "P2": ("Empresa fantasma", "Ghost company"),
    "P3": ("Intermediario", "Intermediary"),
    "P4": ("Licitación ficticia", "Sham bidding"),
    "P5": ("Sobreprecio sistemático", "Systematic overpricing"),
    "P6": ("Captura institucional", "Institutional capture"),
    "P7": ("Red de colusión", "Collusion network"),
}

# Sector code → (name_es, name_en) built at runtime from DB; this is the fallback
_SECTOR_LABEL_FALLBACK: dict[str, tuple[str, str]] = {
    "salud": ("Salud", "Health"),
    "educacion": ("Educación", "Education"),
    "infraestructura": ("Infraestructura", "Infrastructure"),
    "energia": ("Energía", "Energy"),
    "defensa": ("Defensa", "Defense"),
    "tecnologia": ("Tecnología", "Technology"),
    "hacienda": ("Hacienda", "Treasury"),
    "gobernacion": ("Gobernación", "Interior"),
    "agricultura": ("Agricultura", "Agriculture"),
    "ambiente": ("Medio Ambiente", "Environment"),
    "trabajo": ("Trabajo", "Labor"),
    "otros": ("Otros", "Other"),
}


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class VendorClusterItem(BaseModel):
    vendor_id: int
    name: str
    size_category: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    tier: Optional[int] = None
    total_contracts: Optional[int] = None
    total_amount_mxn: Optional[float] = None
    primary_sector_code: Optional[str] = None
    primary_sector_name: Optional[str] = None
    is_gt: bool = False
    primary_pattern: Optional[str] = None
    ghost_score: Optional[float] = None
    capture_score: Optional[float] = None


class ClusterVendorsResponse(BaseModel):
    lens: str
    code: str
    label_es: str
    label_en: str
    total: int
    vendors: list[VendorClusterItem]
    next_cursor: Optional[float] = None
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Risk level helper
# ---------------------------------------------------------------------------

def _risk_level(score: Optional[float]) -> Optional[str]:
    if score is None:
        return None
    if score >= 0.60:
        return "critical"
    if score >= 0.40:
        return "high"
    if score >= 0.25:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/cluster-vendors", response_model=ClusterVendorsResponse)
def get_cluster_vendors(
    lens: str = Query(..., description="Lens type: patterns, sectors, categories, terms"),
    code: str = Query(..., description="Cluster code, e.g. P5, salud, cat_medications"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0, description="Offset for page-based pagination (ignored when cursor is set)"),
    cursor: Optional[float] = Query(None, description="Keyset cursor: last seen risk_score. Returns vendors with risk_score < cursor."),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return top vendors associated with a constellation cluster.

    Keyset pagination via `cursor` (risk_score DESC) is preferred for sequential
    browsing. Offset-based pagination is available for jump-to-page use cases.
    Both parameters are mutually exclusive — cursor takes precedence.
    """
    if lens not in _VALID_LENSES:
        # Return empty with note rather than 422, per spec
        return ClusterVendorsResponse(
            lens=lens,
            code=code,
            label_es=code,
            label_en=code,
            total=0,
            vendors=[],
            note=f"Unknown lens '{lens}'. Valid values: {', '.join(sorted(_VALID_LENSES))}",
        )

    if lens == "patterns":
        return _query_patterns(conn, code, limit, offset, cursor)
    if lens == "sectors":
        return _query_sectors(conn, code, limit, offset, cursor)
    if lens == "categories":
        return _query_categories(conn, code, limit, offset, cursor)
    # lens == "terms"
    return _query_terms(conn, code)


# ---------------------------------------------------------------------------
# Lens-specific query builders
# ---------------------------------------------------------------------------

def _base_vendor_select() -> str:
    """Return the SELECT + FROM + JOIN fragment shared by all lenses.

    Columns returned (in order):
      v.id, v.name, v.size_stratification,
      aq.avg_risk_score, aq.ips_tier, aq.total_contracts, aq.total_value_mxn,
      s.code, s.name_es, s.name_en,
      aq.in_ground_truth, aq.primary_pattern,
      gcs.ghost_confidence_score, aq.pattern_confidences
    """
    return """
        SELECT
            v.id                           AS vendor_id,
            v.name                         AS name,
            v.size_stratification          AS size_category,
            aq.avg_risk_score              AS risk_score,
            aq.ips_tier                    AS tier,
            vs.total_contracts             AS total_contracts,
            vs.total_value_mxn             AS total_amount_mxn,
            s.code                         AS primary_sector_code,
            s.name_es                      AS primary_sector_name_es,
            s.name_en                      AS primary_sector_name_en,
            COALESCE(aq.in_ground_truth, 0) AS is_gt,
            aq.primary_pattern             AS primary_pattern,
            gcs.ghost_confidence_score     AS ghost_score,
            aq.pattern_confidences         AS pattern_confidences
        FROM aria_queue aq
        JOIN vendors v ON v.id = aq.vendor_id
        LEFT JOIN vendor_stats vs ON vs.vendor_id = aq.vendor_id
        LEFT JOIN sectors s ON s.id = aq.primary_sector_id
        LEFT JOIN ghost_confidence_scores gcs ON gcs.vendor_id = aq.vendor_id
    """


def _apply_cursor_or_offset(
    where_clauses: list[str],
    params: list,
    cursor: Optional[float],
    offset: int,
    limit: int,
) -> tuple[str, list]:
    """Append ORDER BY and LIMIT/OFFSET (or keyset cursor) to query fragments."""
    if cursor is not None:
        where_clauses.append("aq.avg_risk_score < ?")
        params.append(cursor)

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    order_sql = "ORDER BY aq.avg_risk_score DESC, vs.total_value_mxn DESC"
    limit_sql = f"LIMIT {limit}"

    if cursor is None:
        limit_sql += f" OFFSET {offset}"

    return where_sql, params


def _build_vendor_items(rows: list[sqlite3.Row]) -> list[VendorClusterItem]:
    items = []
    for row in rows:
        d = dict(row)

        # Parse capture_score from JSON pattern_confidences["P6"]
        capture_score = None
        pc_raw = d.get("pattern_confidences")
        if pc_raw:
            try:
                pc = json.loads(pc_raw) if isinstance(pc_raw, str) else pc_raw
                p6_val = pc.get("P6")
                if p6_val is not None:
                    capture_score = float(p6_val)
            except Exception:
                pass

        risk_score = d.get("risk_score")
        sector_name = d.get("primary_sector_name_es") or d.get("primary_sector_name_en")

        items.append(VendorClusterItem(
            vendor_id=d["vendor_id"],
            name=d["name"] or "",
            size_category=d.get("size_category"),
            risk_score=risk_score,
            risk_level=_risk_level(risk_score),
            tier=d.get("tier"),
            total_contracts=d.get("total_contracts"),
            total_amount_mxn=d.get("total_amount_mxn"),
            primary_sector_code=d.get("primary_sector_code"),
            primary_sector_name=sector_name,
            is_gt=bool(d.get("is_gt", 0)),
            primary_pattern=d.get("primary_pattern"),
            ghost_score=d.get("ghost_score"),
            capture_score=capture_score,
        ))
    return items


def _compute_next_cursor(rows: list[sqlite3.Row], limit: int) -> Optional[float]:
    """Return the risk_score of the last row if a full page was returned."""
    if len(rows) < limit:
        return None
    last = dict(rows[-1])
    return last.get("risk_score")


def _get_total(conn: sqlite3.Connection, count_sql: str, params: list) -> int:
    try:
        row = conn.execute(count_sql, params).fetchone()
        return row[0] if row else 0
    except Exception as e:
        logger.warning("Total count query failed: %s", e)
        return 0


# ---------------------------------------------------------------------------
# lens=patterns
# ---------------------------------------------------------------------------

def _query_patterns(
    conn: sqlite3.Connection,
    code: str,
    limit: int,
    offset: int,
    cursor: Optional[float],
) -> ClusterVendorsResponse:
    label_es, label_en = _PATTERN_LABELS.get(code, (code, code))

    # Total count
    total = _get_total(
        conn,
        "SELECT COUNT(*) FROM aria_queue WHERE primary_pattern = ?",
        [code],
    )

    where_clauses = ["aq.primary_pattern = ?"]
    params: list = [code]
    where_sql, params = _apply_cursor_or_offset(where_clauses, params, cursor, offset, limit)

    sql = f"""
        {_base_vendor_select()}
        {where_sql}
        ORDER BY aq.avg_risk_score DESC, vs.total_value_mxn DESC
        LIMIT {limit}{"" if cursor is not None else f" OFFSET {offset}"}
    """

    rows = conn.execute(sql, params).fetchall()
    vendors = _build_vendor_items(rows)
    next_cursor = _compute_next_cursor(rows, limit)

    return ClusterVendorsResponse(
        lens="patterns",
        code=code,
        label_es=label_es,
        label_en=label_en,
        total=total,
        vendors=vendors,
        next_cursor=next_cursor,
    )


# ---------------------------------------------------------------------------
# lens=sectors
# ---------------------------------------------------------------------------

def _query_sectors(
    conn: sqlite3.Connection,
    code: str,
    limit: int,
    offset: int,
    cursor: Optional[float],
) -> ClusterVendorsResponse:
    # Resolve sector labels from DB
    sector_row = conn.execute(
        "SELECT id, name_es, name_en FROM sectors WHERE code = ?", (code,)
    ).fetchone()

    if sector_row:
        sector_id = sector_row[0]
        label_es = sector_row[1] or code
        label_en = sector_row[2] or code
    else:
        fallback = _SECTOR_LABEL_FALLBACK.get(code, (code, code))
        label_es, label_en = fallback
        # No sector found — return empty
        return ClusterVendorsResponse(
            lens="sectors",
            code=code,
            label_es=label_es,
            label_en=label_en,
            total=0,
            vendors=[],
        )

    total = _get_total(
        conn,
        "SELECT COUNT(*) FROM aria_queue WHERE primary_sector_id = ?",
        [sector_id],
    )

    where_clauses = ["aq.primary_sector_id = ?"]
    params: list = [sector_id]
    where_sql, params = _apply_cursor_or_offset(where_clauses, params, cursor, offset, limit)

    sql = f"""
        {_base_vendor_select()}
        {where_sql}
        ORDER BY aq.avg_risk_score DESC, vs.total_value_mxn DESC
        LIMIT {limit}{"" if cursor is not None else f" OFFSET {offset}"}
    """

    rows = conn.execute(sql, params).fetchall()
    vendors = _build_vendor_items(rows)
    next_cursor = _compute_next_cursor(rows, limit)

    return ClusterVendorsResponse(
        lens="sectors",
        code=code,
        label_es=label_es,
        label_en=label_en,
        total=total,
        vendors=vendors,
        next_cursor=next_cursor,
    )


# ---------------------------------------------------------------------------
# lens=categories
# ---------------------------------------------------------------------------

def _query_categories(
    conn: sqlite3.Connection,
    code: str,
    limit: int,
    offset: int,
    cursor: Optional[float],
) -> ClusterVendorsResponse:
    # Resolve category from code
    cat_row = conn.execute(
        "SELECT id, name_es, name_en FROM categories WHERE code = ?", (code,)
    ).fetchone()

    if not cat_row:
        return ClusterVendorsResponse(
            lens="categories",
            code=code,
            label_es=code,
            label_en=code,
            total=0,
            vendors=[],
            note=f"Category code '{code}' not found.",
        )

    cat_id = cat_row[0]
    label_es = cat_row[1] or code
    label_en = cat_row[2] or code

    # Count distinct vendors in this category (contracts table join)
    total = _get_total(
        conn,
        "SELECT COUNT(DISTINCT vendor_id) FROM contracts WHERE category_id = ? AND vendor_id IS NOT NULL",
        [cat_id],
    )

    # Build a subquery: vendors that appear in this category
    # Filter via aria_queue (only vendors we have risk data for)
    cursor_clause = ""
    cursor_params: list = []
    if cursor is not None:
        cursor_clause = "AND aq.avg_risk_score < ?"
        cursor_params = [cursor]

    offset_clause = "" if cursor is not None else f"OFFSET {offset}"

    sql = f"""
        SELECT
            v.id                           AS vendor_id,
            v.name                         AS name,
            v.size_stratification          AS size_category,
            aq.avg_risk_score              AS risk_score,
            aq.ips_tier                    AS tier,
            vs.total_contracts             AS total_contracts,
            vs.total_value_mxn             AS total_amount_mxn,
            s.code                         AS primary_sector_code,
            s.name_es                      AS primary_sector_name_es,
            s.name_en                      AS primary_sector_name_en,
            COALESCE(aq.in_ground_truth, 0) AS is_gt,
            aq.primary_pattern             AS primary_pattern,
            gcs.ghost_confidence_score     AS ghost_score,
            aq.pattern_confidences         AS pattern_confidences
        FROM (
            SELECT DISTINCT vendor_id
            FROM contracts
            WHERE category_id = ? AND vendor_id IS NOT NULL
        ) cat_vendors
        JOIN aria_queue aq ON aq.vendor_id = cat_vendors.vendor_id
        JOIN vendors v ON v.id = aq.vendor_id
        LEFT JOIN vendor_stats vs ON vs.vendor_id = aq.vendor_id
        LEFT JOIN sectors s ON s.id = aq.primary_sector_id
        LEFT JOIN ghost_confidence_scores gcs ON gcs.vendor_id = aq.vendor_id
        WHERE 1=1 {cursor_clause}
        ORDER BY aq.avg_risk_score DESC, vs.total_value_mxn DESC
        LIMIT {limit} {offset_clause}
    """

    params = [cat_id] + cursor_params
    rows = conn.execute(sql, params).fetchall()
    vendors = _build_vendor_items(rows)
    next_cursor = _compute_next_cursor(rows, limit)

    return ClusterVendorsResponse(
        lens="categories",
        code=code,
        label_es=label_es,
        label_en=label_en,
        total=total,
        vendors=vendors,
        next_cursor=next_cursor,
    )


# ---------------------------------------------------------------------------
# lens=terms
# ---------------------------------------------------------------------------

def _query_terms(conn: sqlite3.Connection, code: str) -> ClusterVendorsResponse:
    """Terms lens: no clean vendor-level source table exists.

    The `partida_especifica` field in contracts is a free-text code present only
    in Structure D (2023+) and has no pre-aggregated vendor mapping. Building
    a live aggregation across 3.1M rows without indexes would be too slow for
    a synchronous request. Return an empty result with a descriptive note.
    """
    return ClusterVendorsResponse(
        lens="terms",
        code=code,
        label_es=code,
        label_en=code,
        total=0,
        vendors=[],
        note=(
            "The 'terms' lens has no pre-aggregated vendor-level data. "
            "partida_especifica is only available in Structure D (2023+) "
            "and requires a dedicated ETL step to produce vendor-term rollups."
        ),
    )
