"""Scorecard API router — institution and vendor 0-100 integrity grades."""
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scorecards", tags=["scorecards"])


# --- Pydantic models --------------------------------------------------------

class GradeInfo(BaseModel):
    grade: str
    grade_label: str
    grade_color: str
    total_score: float


class InstitutionScorecardResponse(BaseModel):
    institution_id: int
    institution_name: str
    ramo_code: Optional[int]
    sector_name: Optional[str]
    total_score: float
    grade: str
    grade_label: str
    grade_color: str
    national_percentile: float
    pillar_openness: float
    pillar_price: float
    pillar_vendors: float
    pillar_process: float
    pillar_external: float
    top_risk_driver: Optional[str]
    key_metrics: Dict[str, Any]
    confidence_band: Optional[str] = None
    p90_risk_score: Optional[float] = None
    trend_direction: Optional[str] = None
    peer_percentile_sector: Optional[float] = None
    signal_count_red: Optional[int] = None


class VendorScorecardResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    total_score: float
    grade: str
    grade_label: str
    grade_color: str
    national_percentile: float
    sector_percentile: float
    pillar_risk_signal: float
    pillar_conduct: float
    pillar_spread: float
    pillar_behavior: float
    pillar_flags: float
    top_risk_driver: Optional[str]
    key_metrics: Dict[str, Any]
    confidence_band: Optional[str] = None
    p90_risk_score: Optional[float] = None
    trend_direction: Optional[str] = None
    risk_tier: Optional[str] = None


class InstitutionScorecardListItem(BaseModel):
    institution_id: int
    institution_name: str
    ramo_code: Optional[int]
    sector_name: Optional[str]
    total_score: float
    grade: str
    grade_label: str
    grade_color: str
    national_percentile: float
    pillar_openness: float
    pillar_price: float
    pillar_vendors: float
    pillar_process: float
    pillar_external: float
    top_risk_driver: Optional[str]
    confidence_band: Optional[str] = None
    p90_risk_score: Optional[float] = None
    trend_direction: Optional[str] = None
    peer_percentile_sector: Optional[float] = None
    signal_count_red: Optional[int] = None


class VendorScorecardListItem(BaseModel):
    vendor_id: int
    vendor_name: str
    total_score: float
    grade: str
    grade_label: str
    grade_color: str
    national_percentile: float
    sector_percentile: float
    pillar_risk_signal: float
    pillar_conduct: float
    pillar_spread: float
    pillar_behavior: float
    pillar_flags: float
    top_risk_driver: Optional[str]
    confidence_band: Optional[str] = None
    p90_risk_score: Optional[float] = None
    trend_direction: Optional[str] = None
    risk_tier: Optional[str] = None


class InstitutionScorecardListResponse(BaseModel):
    data: List[InstitutionScorecardListItem]
    total: int
    page: int
    per_page: int
    total_pages: int
    grade_distribution: Dict[str, int]


class VendorScorecardListResponse(BaseModel):
    data: List[VendorScorecardListItem]
    total: int
    page: int
    per_page: int
    total_pages: int
    grade_distribution: Dict[str, int]


class ScorecardSummary(BaseModel):
    institutions_scored: int
    vendors_scored: int
    institution_grade_distribution: Dict[str, int]
    vendor_grade_distribution: Dict[str, int]
    institution_avg_score: float
    vendor_avg_score: float
    computed_at: Optional[str]


# --- Helpers -----------------------------------------------------------------

def _extract_signal_count_red(key_metrics_json: str) -> int:
    """Count red signals from key_metrics JSON."""
    try:
        km = json.loads(key_metrics_json) if key_metrics_json else {}
        return km.get("worst_signal_count", 0)
    except Exception:
        return 0


def _grade_from_risk(avg_risk: float) -> tuple:
    """Fallback: compute grade from avg risk score."""
    if avg_risk < 0.10:
        return ("A", "Solido", "#22c55e")
    elif avg_risk < 0.20:
        return ("B", "Adecuado", "#eab308")
    elif avg_risk < 0.35:
        return ("C", "Preocupante", "#f97316")
    elif avg_risk < 0.50:
        return ("D", "Alto Riesgo", "#ef4444")
    else:
        return ("F", "Critico", "#991b1b")


# --- Routes ------------------------------------------------------------------

@router.get("/summary", response_model=ScorecardSummary)
def get_scorecard_summary():
    """Overall scorecard statistics."""
    try:
        with get_db() as conn:
            i_row = conn.execute("""
                SELECT COUNT(*), AVG(total_score),
                       MAX(computed_at)
                FROM institution_scorecards
            """).fetchone()
            v_row = conn.execute("""
                SELECT COUNT(*), AVG(total_score)
                FROM vendor_scorecards
            """).fetchone()
            i_dist = {r[0]: r[1] for r in conn.execute(
                "SELECT grade, COUNT(*) FROM institution_scorecards GROUP BY grade"
            ).fetchall()}
            v_dist = {r[0]: r[1] for r in conn.execute(
                "SELECT grade, COUNT(*) FROM vendor_scorecards GROUP BY grade"
            ).fetchall()}

        return ScorecardSummary(
            institutions_scored=i_row[0] or 0,
            vendors_scored=v_row[0] or 0,
            institution_grade_distribution=i_dist,
            vendor_grade_distribution=v_dist,
            institution_avg_score=round(i_row[1] or 0, 1),
            vendor_avg_score=round(v_row[1] or 0, 1),
            computed_at=i_row[2],
        )
    except Exception as exc:
        logger.warning("scorecard_summary_fallback: %s", exc)
        try:
            with get_db() as conn:
                i_count = conn.execute("SELECT COUNT(*) FROM institution_stats").fetchone()[0]
                v_count = conn.execute("SELECT COUNT(*) FROM vendor_stats").fetchone()[0]
            return ScorecardSummary(
                institutions_scored=i_count,
                vendors_scored=v_count,
                institution_grade_distribution={},
                vendor_grade_distribution={},
                institution_avg_score=0.0,
                vendor_avg_score=0.0,
                computed_at=None,
            )
        except Exception:
            return ScorecardSummary(
                institutions_scored=0,
                vendors_scored=0,
                institution_grade_distribution={},
                vendor_grade_distribution={},
                institution_avg_score=0.0,
                vendor_avg_score=0.0,
                computed_at=None,
            )


def _fallback_institution_scorecards(
    conn, page: int, per_page: int, sort_by: str, order: str,
    grade: Optional[str], sector: Optional[str],
    min_score: Optional[float], max_score: Optional[float],
    search: Optional[str], federal_only: bool = False,
) -> InstitutionScorecardListResponse:
    """Build institution scorecards from institution_stats when the
    institution_scorecards table is missing."""
    where_clauses = ["1=1"]
    params: list = []

    if federal_only:
        where_clauses.append("i.geographic_scope = 'federal'")
    if search:
        where_clauses.append("i.name LIKE ?")
        params.append(f"%{search}%")
    if sector:
        where_clauses.append("LOWER(sec.name_es) = LOWER(?)")
        params.append(sector)

    where_sql = " AND ".join(where_clauses)
    sort_col = "ist.avg_risk_score"
    if sort_by == "institution_name":
        sort_col = "i.name"
    elif sort_by in ("total_score", "national_percentile"):
        sort_col = "ist.avg_risk_score"

    order_dir = "DESC" if order == "desc" else "ASC"

    total = conn.execute(f"""
        SELECT COUNT(*)
        FROM institution_stats ist
        JOIN institutions i ON i.id = ist.institution_id
        LEFT JOIN sectors sec ON i.sector_id = sec.id
        WHERE {where_sql}
    """, params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(f"""
        SELECT ist.institution_id, i.name, i.ramo_id,
               sec.name_es AS sector_name,
               ist.avg_risk_score, ist.total_contracts,
               ist.high_risk_pct, ist.direct_award_pct, ist.single_bid_pct
        FROM institution_stats ist
        JOIN institutions i ON i.id = ist.institution_id
        LEFT JOIN sectors sec ON i.sector_id = sec.id
        WHERE {where_sql}
        ORDER BY {sort_col} {order_dir}
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()

    items = []
    grade_counts: dict = {}
    for r in rows:
        avg_risk = r[4] or 0
        total_score = round(max(0, (1 - avg_risk)) * 100, 1)
        g, gl, gc = _grade_from_risk(avg_risk)

        if min_score is not None and total_score < min_score:
            continue
        if max_score is not None and total_score > max_score:
            continue
        if grade and g != grade:
            continue

        grade_counts[g] = grade_counts.get(g, 0) + 1

        items.append(InstitutionScorecardListItem(
            institution_id=r[0], institution_name=r[1], ramo_code=r[2],
            sector_name=r[3], total_score=total_score,
            grade=g, grade_label=gl, grade_color=gc,
            national_percentile=0.5,
            pillar_openness=0.0, pillar_price=0.0,
            pillar_vendors=0.0, pillar_process=0.0, pillar_external=0.0,
            top_risk_driver=None,
            confidence_band=None, p90_risk_score=None,
            trend_direction=None, peer_percentile_sector=None,
            signal_count_red=None,
        ))

    filtered_total = len(items) if (grade or min_score is not None or max_score is not None) else total
    return InstitutionScorecardListResponse(
        data=items, total=filtered_total, page=page, per_page=per_page,
        total_pages=max(1, -(-filtered_total // per_page)),
        grade_distribution=grade_counts,
    )


def _fallback_vendor_scorecards(
    conn, page: int, per_page: int, sort_by: str, order: str,
    grade: Optional[str],
    min_score: Optional[float], max_score: Optional[float],
    search: Optional[str],
) -> VendorScorecardListResponse:
    """Build vendor scorecards from vendor_stats when the
    vendor_scorecards table is missing."""
    where_clauses = ["1=1"]
    params: list = []

    if search:
        where_clauses.append("v.name LIKE ?")
        params.append(f"%{search}%")

    where_sql = " AND ".join(where_clauses)
    sort_col = "vs.avg_risk_score"
    if sort_by == "vendor_name":
        sort_col = "v.name"
    elif sort_by in ("total_score", "national_percentile"):
        sort_col = "vs.avg_risk_score"

    order_dir = "DESC" if order == "desc" else "ASC"

    total = conn.execute(f"""
        SELECT COUNT(*)
        FROM vendor_stats vs
        JOIN vendors v ON v.id = vs.vendor_id
        WHERE vs.vendor_id IS NOT NULL AND {where_sql}
    """, params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(f"""
        SELECT vs.vendor_id, v.name,
               vs.avg_risk_score, vs.total_contracts
        FROM vendor_stats vs
        JOIN vendors v ON v.id = vs.vendor_id
        WHERE vs.vendor_id IS NOT NULL AND {where_sql}
        ORDER BY {sort_col} {order_dir}
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()

    items = []
    grade_counts: dict = {}
    for r in rows:
        avg_risk = r[2] or 0
        # Vendor score is now risk-oriented (higher = riskier)
        total_score = round(min(100, avg_risk * 100), 1)
        g, gl, gc = _grade_from_risk(avg_risk)

        if min_score is not None and total_score < min_score:
            continue
        if max_score is not None and total_score > max_score:
            continue
        if grade and g != grade:
            continue

        grade_counts[g] = grade_counts.get(g, 0) + 1

        items.append(VendorScorecardListItem(
            vendor_id=r[0], vendor_name=r[1],
            total_score=total_score,
            grade=g, grade_label=gl, grade_color=gc,
            national_percentile=0.5,
            sector_percentile=0.5,
            pillar_risk_signal=0.0, pillar_conduct=0.0,
            pillar_spread=0.0, pillar_behavior=0.0, pillar_flags=0.0,
            top_risk_driver=None,
            confidence_band=None, p90_risk_score=None,
            trend_direction=None, risk_tier=None,
        ))

    filtered_total = len(items) if (grade or min_score is not None or max_score is not None) else total
    return VendorScorecardListResponse(
        data=items, total=filtered_total, page=page, per_page=per_page,
        total_pages=max(1, -(-filtered_total // per_page)),
        grade_distribution=grade_counts,
    )


@router.get("/institutions", response_model=InstitutionScorecardListResponse)
def list_institution_scorecards(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = Query("total_score", pattern="^(total_score|grade|national_percentile|institution_name|pillar_openness|pillar_price|pillar_vendors|pillar_process|pillar_external)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    grade: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
    federal_only: bool = Query(False),
):
    """Ranked list of institution scorecards."""
    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='institution_scorecards'"
        ).fetchone()
        if not exists:
            return _fallback_institution_scorecards(
                conn, page, per_page, sort_by, order,
                grade, sector, min_score, max_score, search, federal_only,
            )

        where_clauses = ["1=1"]
        params: list = []

        if federal_only:
            where_clauses.append("i.geographic_scope = 'federal'")
        if grade:
            where_clauses.append("s.grade = ?")
            params.append(grade)
        if sector:
            where_clauses.append("LOWER(sec.name_es) = LOWER(?)")
            params.append(sector)
        if min_score is not None:
            where_clauses.append("s.total_score >= ?")
            params.append(min_score)
        if max_score is not None:
            where_clauses.append("s.total_score <= ?")
            params.append(max_score)
        if search:
            where_clauses.append("i.name LIKE ?")
            params.append(f"%{search}%")

        where_sql = " AND ".join(where_clauses)
        order_sql = f"s.{sort_by} {'DESC' if order == 'desc' else 'ASC'}"

        total = conn.execute(f"""
            SELECT COUNT(*)
            FROM institution_scorecards s
            JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN sectors sec ON i.sector_id = sec.id
            WHERE {where_sql}
        """, params).fetchone()[0]

        offset = (page - 1) * per_page
        rows = conn.execute(f"""
            SELECT s.institution_id, i.name, i.ramo_id,
                   sec.name_es AS sector_name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile,
                   s.pillar_openness, s.pillar_price, s.pillar_vendors,
                   s.pillar_process, s.pillar_external,
                   s.top_risk_driver, s.key_metrics,
                   s.confidence_band, s.p90_risk_score,
                   s.trend_direction, s.peer_percentile_sector
            FROM institution_scorecards s
            JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN sectors sec ON i.sector_id = sec.id
            WHERE {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
        """, params + [per_page, offset]).fetchall()

        # Grade distribution for current filter (without grade filter)
        filter_params_no_grade = [p for p, w in zip(params, where_clauses[1:]) if "s.grade" not in w]
        where_no_grade = " AND ".join([c for c in where_clauses if "s.grade" not in c])
        dist_rows = conn.execute(f"""
            SELECT s.grade, COUNT(*)
            FROM institution_scorecards s
            JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN sectors sec ON i.sector_id = sec.id
            WHERE {where_no_grade}
            GROUP BY s.grade
        """, filter_params_no_grade).fetchall()
        grade_dist = {r[0]: r[1] for r in dist_rows}

    items = [
        InstitutionScorecardListItem(
            institution_id=r[0], institution_name=r[1], ramo_code=r[2],
            sector_name=r[3], total_score=round(r[4], 1),
            grade=r[5], grade_label=r[6], grade_color=r[7],
            national_percentile=round(r[8] or 0.5, 3),
            pillar_openness=round(r[9], 1), pillar_price=round(r[10], 1),
            pillar_vendors=round(r[11], 1), pillar_process=round(r[12], 1),
            pillar_external=round(r[13], 1),
            top_risk_driver=r[14],
            confidence_band=r[16],
            p90_risk_score=round(r[17], 3) if r[17] is not None else None,
            trend_direction=r[18],
            peer_percentile_sector=round(r[19], 3) if r[19] is not None else None,
            signal_count_red=_extract_signal_count_red(r[15]),
        )
        for r in rows
    ]

    return InstitutionScorecardListResponse(
        data=items, total=total, page=page, per_page=per_page,
        total_pages=max(1, -(-total // per_page)),
        grade_distribution=grade_dist,
    )


class InstitutionScorecardStats(BaseModel):
    total_scored: int
    median_score: float
    top_institution_id: Optional[int]
    top_institution_name: Optional[str]
    top_institution_score: Optional[float]
    worst_institution_id: Optional[int]
    worst_institution_name: Optional[str]
    worst_institution_score: Optional[float]
    grade_distribution: Dict[str, int]


@router.get("/institutions/stats", response_model=InstitutionScorecardStats)
def get_institution_scorecard_stats():
    """Aggregate statistics across all institution scorecards."""
    with get_db() as conn:
        agg = conn.execute("""
            SELECT COUNT(*), AVG(total_score)
            FROM institution_scorecards
        """).fetchone()
        total_scored = agg[0] or 0

        # Median via NTILE approximation (SQLite has no MEDIAN)
        mid = total_scored // 2
        median_row = conn.execute("""
            SELECT total_score FROM institution_scorecards
            ORDER BY total_score
            LIMIT 1 OFFSET ?
        """, (max(0, mid - 1),)).fetchone()
        median_score = round(median_row[0], 1) if median_row else 0.0

        top_row = conn.execute("""
            SELECT s.institution_id, i.name, s.total_score
            FROM institution_scorecards s
            JOIN institutions i ON i.id = s.institution_id
            ORDER BY s.total_score DESC
            LIMIT 1
        """).fetchone()
        worst_row = conn.execute("""
            SELECT s.institution_id, i.name, s.total_score
            FROM institution_scorecards s
            JOIN institutions i ON i.id = s.institution_id
            ORDER BY s.total_score ASC
            LIMIT 1
        """).fetchone()
        dist_rows = conn.execute(
            "SELECT grade, COUNT(*) FROM institution_scorecards GROUP BY grade"
        ).fetchall()
        grade_dist = {r[0]: r[1] for r in dist_rows}

    return InstitutionScorecardStats(
        total_scored=total_scored,
        median_score=median_score,
        top_institution_id=top_row[0] if top_row else None,
        top_institution_name=top_row[1] if top_row else None,
        top_institution_score=round(top_row[2], 1) if top_row else None,
        worst_institution_id=worst_row[0] if worst_row else None,
        worst_institution_name=worst_row[1] if worst_row else None,
        worst_institution_score=round(worst_row[2], 1) if worst_row else None,
        grade_distribution=grade_dist,
    )


@router.get("/institutions/{institution_id}", response_model=InstitutionScorecardResponse)
def get_institution_scorecard(institution_id: int = Path(..., ge=1)):
    """Full scorecard for a single institution."""
    with get_db() as conn:
        row = conn.execute("""
            SELECT s.institution_id, i.name, i.ramo_id,
                   sec.name_es AS sector_name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile,
                   s.pillar_openness, s.pillar_price, s.pillar_vendors,
                   s.pillar_process, s.pillar_external,
                   s.top_risk_driver, s.key_metrics,
                   s.confidence_band, s.p90_risk_score,
                   s.trend_direction, s.peer_percentile_sector
            FROM institution_scorecards s
            JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN sectors sec ON i.sector_id = sec.id
            WHERE s.institution_id = ?
        """, (institution_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Institution scorecard not found")

    metrics = json.loads(row[15]) if row[15] else {}
    return InstitutionScorecardResponse(
        institution_id=row[0], institution_name=row[1], ramo_code=row[2],
        sector_name=row[3], total_score=round(row[4], 1),
        grade=row[5], grade_label=row[6], grade_color=row[7],
        national_percentile=round(row[8] or 0.5, 3),
        pillar_openness=round(row[9], 1), pillar_price=round(row[10], 1),
        pillar_vendors=round(row[11], 1), pillar_process=round(row[12], 1),
        pillar_external=round(row[13], 1),
        top_risk_driver=row[14], key_metrics=metrics,
        confidence_band=row[16],
        p90_risk_score=round(row[17], 3) if row[17] is not None else None,
        trend_direction=row[18],
        peer_percentile_sector=round(row[19], 3) if row[19] is not None else None,
        signal_count_red=metrics.get("worst_signal_count", 0),
    )


@router.get("/vendors", response_model=VendorScorecardListResponse)
def list_vendor_scorecards(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = Query("total_score", pattern="^(total_score|grade|national_percentile|vendor_name|pillar_risk_signal|pillar_conduct|pillar_spread|pillar_behavior|pillar_flags)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    grade: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
):
    """Ranked list of vendor scorecards."""
    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='vendor_scorecards'"
        ).fetchone()
        if not exists:
            return _fallback_vendor_scorecards(
                conn, page, per_page, sort_by, order,
                grade, min_score, max_score, search,
            )
        s_where: list = ["1=1"]
        s_params: list = []
        needs_join = False

        if grade:
            s_where.append("s.grade = ?")
            s_params.append(grade)
        if min_score is not None:
            s_where.append("s.total_score >= ?")
            s_params.append(min_score)
        if max_score is not None:
            s_where.append("s.total_score <= ?")
            s_params.append(max_score)
        if search:
            s_where.append("v.name LIKE ?")
            s_params.append(f"%{search}%")
            needs_join = True

        where_sql = " AND ".join(s_where)
        if sort_by == "vendor_name":
            order_sql = f"v.name {'DESC' if order == 'desc' else 'ASC'}"
            needs_join = True
        else:
            order_sql = f"s.{sort_by} {'DESC' if order == 'desc' else 'ASC'}"

        if needs_join:
            total = conn.execute(f"""
                SELECT COUNT(*) FROM vendor_scorecards s
                JOIN vendors v ON s.vendor_id = v.id WHERE {where_sql}
            """, s_params).fetchone()[0]
        else:
            total = conn.execute(f"""
                SELECT COUNT(*) FROM vendor_scorecards s WHERE {where_sql}
            """, s_params).fetchone()[0]

        offset = (page - 1) * per_page
        if needs_join:
            rows = conn.execute(f"""
                SELECT s.vendor_id, v.name,
                       s.total_score, s.grade, s.grade_label, s.grade_color,
                       s.national_percentile, s.sector_percentile,
                       s.pillar_risk_signal, s.pillar_conduct, s.pillar_spread,
                       s.pillar_behavior, s.pillar_flags,
                       s.top_risk_driver,
                       s.confidence_band, s.p90_risk_score,
                       s.trend_direction, s.risk_tier
                FROM vendor_scorecards s
                JOIN vendors v ON s.vendor_id = v.id
                WHERE {where_sql}
                ORDER BY {order_sql}
                LIMIT ? OFFSET ?
            """, s_params + [per_page, offset]).fetchall()
        else:
            rows = conn.execute(f"""
                SELECT vs.vendor_id, v.name,
                       vs.total_score, vs.grade, vs.grade_label, vs.grade_color,
                       vs.national_percentile, vs.sector_percentile,
                       vs.pillar_risk_signal, vs.pillar_conduct, vs.pillar_spread,
                       vs.pillar_behavior, vs.pillar_flags,
                       vs.top_risk_driver,
                       vs.confidence_band, vs.p90_risk_score,
                       vs.trend_direction, vs.risk_tier
                FROM (
                    SELECT s.vendor_id, s.total_score, s.grade, s.grade_label, s.grade_color,
                           s.national_percentile, s.sector_percentile,
                           s.pillar_risk_signal, s.pillar_conduct, s.pillar_spread,
                           s.pillar_behavior, s.pillar_flags, s.top_risk_driver,
                           s.confidence_band, s.p90_risk_score,
                           s.trend_direction, s.risk_tier
                    FROM vendor_scorecards AS s
                    WHERE {where_sql}
                    ORDER BY {order_sql}
                    LIMIT ? OFFSET ?
                ) vs
                JOIN vendors v ON vs.vendor_id = v.id
            """, s_params + [per_page, offset]).fetchall()

        where_no_grade = " AND ".join([c for c in s_where if "s.grade" not in c])
        filter_params_no_grade = [p for p, w in zip(s_params, s_where[1:]) if "s.grade" not in w]
        if needs_join:
            dist_rows = conn.execute(f"""
                SELECT s.grade, COUNT(*) FROM vendor_scorecards s
                JOIN vendors v ON s.vendor_id = v.id WHERE {where_no_grade}
                GROUP BY s.grade
            """, filter_params_no_grade).fetchall()
        else:
            dist_rows = conn.execute(f"""
                SELECT s.grade, COUNT(*) FROM vendor_scorecards s
                WHERE {where_no_grade} GROUP BY s.grade
            """, filter_params_no_grade).fetchall()
        grade_dist = {r[0]: r[1] for r in dist_rows}

    items = [
        VendorScorecardListItem(
            vendor_id=r[0], vendor_name=r[1],
            total_score=round(r[2], 1),
            grade=r[3], grade_label=r[4], grade_color=r[5],
            national_percentile=round(r[6] or 0.5, 3),
            sector_percentile=round(r[7] or 0.5, 3),
            pillar_risk_signal=round(r[8], 1),
            pillar_conduct=round(r[9], 1),
            pillar_spread=round(r[10], 1),
            pillar_behavior=round(r[11], 1),
            pillar_flags=round(r[12], 1),
            top_risk_driver=r[13],
            confidence_band=r[14],
            p90_risk_score=round(r[15], 3) if r[15] is not None else None,
            trend_direction=r[16],
            risk_tier=r[17],
        )
        for r in rows
    ]

    return VendorScorecardListResponse(
        data=items, total=total, page=page, per_page=per_page,
        total_pages=max(1, -(-total // per_page)),
        grade_distribution=grade_dist,
    )


@router.get("/vendors/{vendor_id}", response_model=VendorScorecardResponse)
def get_vendor_scorecard(vendor_id: int = Path(..., ge=1)):
    """Full scorecard for a single vendor."""
    try:
        with get_db() as conn:
            row = conn.execute("""
                SELECT s.vendor_id, v.name,
                       s.total_score, s.grade, s.grade_label, s.grade_color,
                       s.national_percentile, s.sector_percentile,
                       s.pillar_risk_signal, s.pillar_conduct, s.pillar_spread,
                       s.pillar_behavior, s.pillar_flags,
                       s.top_risk_driver, s.key_metrics,
                       s.confidence_band, s.p90_risk_score,
                       s.trend_direction, s.risk_tier
                FROM vendor_scorecards s
                JOIN vendors v ON s.vendor_id = v.id
                WHERE s.vendor_id = ?
            """, (vendor_id,)).fetchone()
    except Exception:
        row = None

    if not row:
        raise HTTPException(status_code=404, detail="Vendor scorecard not found")

    metrics = json.loads(row[14]) if row[14] else {}
    return VendorScorecardResponse(
        vendor_id=row[0], vendor_name=row[1],
        total_score=round(row[2], 1),
        grade=row[3], grade_label=row[4], grade_color=row[5],
        national_percentile=round(row[6] or 0.5, 3),
        sector_percentile=round(row[7] or 0.5, 3),
        pillar_risk_signal=round(row[8], 1),
        pillar_conduct=round(row[9], 1),
        pillar_spread=round(row[10], 1),
        pillar_behavior=round(row[11], 1),
        pillar_flags=round(row[12], 1),
        top_risk_driver=row[13], key_metrics=metrics,
        confidence_band=row[15],
        p90_risk_score=round(row[16], 3) if row[16] is not None else None,
        trend_direction=row[17],
        risk_tier=row[18],
    )
