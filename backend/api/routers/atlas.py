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


class ClusterVendorsBatchResponse(BaseModel):
    """Bulk variant of ClusterVendorsResponse — one entry per requested code.

    Used by the Observatory galaxy view to fetch all cluster cohorts in a
    single HTTP round-trip instead of N parallel TLS handshakes (see
    Atlas P6 vetting 2026-05-21: 27ms internal vs 1,687ms per-request
    over TLS for the 7-cluster patterns lens).
    """
    lens: str
    clusters: list[ClusterVendorsResponse]


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


@router.get("/cluster-vendors-batch", response_model=ClusterVendorsBatchResponse)
def get_cluster_vendors_batch(
    lens: str = Query(..., description="Lens type: patterns, sectors, categories, terms"),
    codes: str = Query(..., description="Comma-separated cluster codes, e.g. 'P1,P2,P3,P4,P5,P6,P7'"),
    limit: int = Query(10, ge=1, le=50, description="Top-N vendors per cluster"),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return top vendors for MULTIPLE clusters in a single response.

    Replaces N parallel /cluster-vendors calls with one round-trip. The galaxy
    view of the Observatory uses this to populate all 7 patterns / 12 sectors
    / 32 categories in one shot — avoiding 7+ TLS handshakes whose latency
    dominated the per-call cost over the public edge.

    Returns the same per-cluster response shape as /cluster-vendors, wrapped
    in a `{ lens, clusters: [...] }` envelope.
    """
    if lens not in _VALID_LENSES:
        return ClusterVendorsBatchResponse(lens=lens, clusters=[])

    # Cap the comma list to a defensive maximum so a malicious caller can't
    # request 1000 codes and exhaust DB connections.
    code_list = [c.strip() for c in codes.split(",") if c.strip()][:50]
    if not code_list:
        return ClusterVendorsBatchResponse(lens=lens, clusters=[])

    results: list[ClusterVendorsResponse] = []
    for code in code_list:
        if lens == "patterns":
            r = _query_patterns(conn, code, limit, 0, None)
        elif lens == "sectors":
            r = _query_sectors(conn, code, limit, 0, None)
        elif lens == "categories":
            r = _query_categories(conn, code, limit, 0, None)
        else:  # lens == "terms"
            r = _query_terms(conn, code)
        results.append(r)

    return ClusterVendorsBatchResponse(lens=lens, clusters=results)


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


# ============================================================================
# Spatial nav — Z1 (sector → institutions sub-constellation)
#
# 2026-05-09 (docs/SPATIAL_NAV_PLAN.md):
# When the user is on Atlas with lens=sectors and clicks a sector cluster,
# this endpoint provides the institutions inside that sector with a
# pre-computed (fx, fy) layout in 0..1 normalised coords. The frontend
# Z1 sub-constellation renders them as bodies in space, sized by
# total_amount_mxn and colored by avg_risk_score.
#
# Layout strategy: Halton (2,3) scatter inside a unit square, with the
# scatter centre at (0.5, 0.5). The frontend will compose this with the
# parent attractor offset so each Z1 sub-constellation is anchored at
# the position of its sector cluster on the Z0 map.
# ============================================================================


def _halton(i: int, b: int) -> float:
    """1D Halton sequence — same algorithm the frontend uses for Z0 dot lattice."""
    f = 1.0
    r = 0.0
    n = i + 1
    while n > 0:
        f /= b
        r += f * (n % b)
        n //= b
    return r


class SpatialInstitution(BaseModel):
    institution_id: int
    name: str
    institution_type: Optional[str] = None
    fx: float = Field(..., description="0..1 x position inside the sector sub-constellation")
    fy: float = Field(..., description="0..1 y position inside the sector sub-constellation")
    size: float = Field(..., description="0..1 normalised body size — sqrt(total_amount/max_amount)")
    risk: float = Field(..., description="0..1 avg risk score for sizing color encoding")
    total_contracts: int
    total_amount_mxn: float
    direct_award_pct: Optional[float] = None
    high_risk_pct: Optional[float] = None


class SectorInstitutionsSpatialResponse(BaseModel):
    sector_id: int
    sector_code: str
    sector_name_es: str
    sector_name_en: str
    total: int
    institutions: list[SpatialInstitution]


@router.get("/sector-institutions", response_model=SectorInstitutionsSpatialResponse)
def get_sector_institutions_spatial(
    sector_id: int = Query(..., ge=1, le=12, description="Sector id 1..12"),
    limit: int = Query(60, ge=10, le=200, description="Max institutions to return"),
    min_contracts: int = Query(50, ge=0, description="Lower-bound on total_contracts"),
    db: sqlite3.Connection = Depends(get_db_dep),
):
    """
    Returns institutions inside a sector with computed spatial coordinates
    so the frontend can render them as a sub-constellation when the user
    drills from Z0 (sector cluster) into Z1 (institutions in that sector).

    Layout: Halton(2, 3) scatter inside the unit square. Heaviest spenders
    rendered first so they sit closer to the visual centre. Frontend
    composes with the parent sector attractor (fx, fy on the Z0 map) to
    anchor the cluster spatially.
    """
    cursor = db.cursor()
    sector_row = cursor.execute(
        "SELECT id, code, name_es, name_en FROM sectors WHERE id = ?",
        (sector_id,),
    ).fetchone()
    if not sector_row:
        return SectorInstitutionsSpatialResponse(
            sector_id=sector_id,
            sector_code="otros",
            sector_name_es="Otros",
            sector_name_en="Other",
            total=0,
            institutions=[],
        )

    rows = cursor.execute(
        """
        SELECT
            i.id, i.name, i.institution_type,
            ist.total_contracts,
            COALESCE(ist.total_value_mxn, 0) AS total_amount_mxn,
            ROUND(ist.avg_risk_score, 4) AS avg_risk,
            ROUND(ist.direct_award_pct, 4) AS direct_award_pct,
            ROUND(ist.high_risk_count * 100.0 / NULLIF(ist.total_contracts, 0), 2) AS high_risk_pct
        FROM institution_stats ist
        JOIN institutions i ON i.id = ist.institution_id
        WHERE i.sector_id = ?
          AND ist.total_contracts >= ?
        ORDER BY ist.total_value_mxn DESC NULLS LAST, ist.total_contracts DESC
        LIMIT ?
        """,
        (sector_id, min_contracts, limit),
    ).fetchall()

    if not rows:
        return SectorInstitutionsSpatialResponse(
            sector_id=sector_id,
            sector_code=sector_row["code"],
            sector_name_es=sector_row["name_es"] or sector_row["code"],
            sector_name_en=sector_row["name_en"] or sector_row["code"],
            total=0,
            institutions=[],
        )

    max_amount = max((r["total_amount_mxn"] or 0) for r in rows) or 1.0

    institutions: list[SpatialInstitution] = []
    for i, r in enumerate(rows):
        # Spiral-out Halton: heaviest spenders nearer centre.
        u = _halton(i + 1, 2)
        v = _halton(i + 1, 3)
        # Centred coordinates in [-0.5, 0.5] then nudged toward (0.5, 0.5)
        # with a smaller radius for index 0, larger for tail.
        radius = 0.10 + (i / max(len(rows) - 1, 1)) * 0.40  # 0.10 .. 0.50
        angle = u * 2.0 * 3.14159265
        # Polar to cartesian, biased so the seed is reproducible by index.
        fx = 0.5 + radius * (v - 0.5) * 1.8
        fy = 0.5 + radius * (u - 0.5) * 1.8
        # Clamp to keep all bodies inside the unit square.
        fx = max(0.04, min(0.96, fx))
        fy = max(0.04, min(0.96, fy))
        size = (float(r["total_amount_mxn"] or 0) / max_amount) ** 0.5
        risk = float(r["avg_risk"] or 0)
        institutions.append(
            SpatialInstitution(
                institution_id=r["id"],
                name=r["name"],
                institution_type=r["institution_type"],
                fx=round(fx, 4),
                fy=round(fy, 4),
                size=round(max(0.18, min(1.0, size)), 4),
                risk=round(max(0.0, min(1.0, risk)), 4),
                total_contracts=int(r["total_contracts"] or 0),
                total_amount_mxn=float(r["total_amount_mxn"] or 0),
                direct_award_pct=float(r["direct_award_pct"]) if r["direct_award_pct"] is not None else None,
                high_risk_pct=float(r["high_risk_pct"]) if r["high_risk_pct"] is not None else None,
            )
        )
        # angle preserved on the variable line for clarity; not used in the
        # final placement but kept so a future revision can switch to true
        # polar layout without reorganising the loop.
        _ = angle

    return SectorInstitutionsSpatialResponse(
        sector_id=sector_id,
        sector_code=sector_row["code"],
        sector_name_es=sector_row["name_es"] or sector_row["code"],
        sector_name_en=sector_row["name_en"] or sector_row["code"],
        total=len(institutions),
        institutions=institutions,
    )
