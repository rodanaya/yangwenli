"""Scorecard API router — institution and vendor 0-100 integrity grades."""
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scorecards", tags=["scorecards"])


# ─── Pydantic models ──────────────────────────────────────────────────────────

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


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=ScorecardSummary)
def get_scorecard_summary():
    """Overall scorecard statistics."""
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


@router.get("/institutions", response_model=InstitutionScorecardListResponse)
def list_institution_scorecards(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = Query("total_score", pattern="^(total_score|grade|national_percentile|institution_name|pillar_openness|pillar_price|pillar_vendors|pillar_process|pillar_external)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    grade: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
):
    """Ranked list of institution scorecards."""
    with get_db() as conn:
        where_clauses = ["1=1"]
        params: list = []

        if grade:
            where_clauses.append("s.grade = ?")
            params.append(grade)
        if sector:
            where_clauses.append("LOWER(sec.sector_name) = LOWER(?)")
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
                   sec.sector_name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile,
                   s.pillar_openness, s.pillar_price, s.pillar_vendors,
                   s.pillar_process, s.pillar_external,
                   s.top_risk_driver
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
            national_percentile=round(r[8], 3),
            pillar_openness=round(r[9], 1), pillar_price=round(r[10], 1),
            pillar_vendors=round(r[11], 1), pillar_process=round(r[12], 1),
            pillar_external=round(r[13], 1),
            top_risk_driver=r[14],
        )
        for r in rows
    ]

    return InstitutionScorecardListResponse(
        data=items, total=total, page=page, per_page=per_page,
        total_pages=max(1, -(-total // per_page)),
        grade_distribution=grade_dist,
    )


@router.get("/institutions/{institution_id}", response_model=InstitutionScorecardResponse)
def get_institution_scorecard(institution_id: int = Path(..., ge=1)):
    """Full scorecard for a single institution."""
    with get_db() as conn:
        row = conn.execute("""
            SELECT s.institution_id, i.name, i.ramo_id,
                   sec.sector_name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile,
                   s.pillar_openness, s.pillar_price, s.pillar_vendors,
                   s.pillar_process, s.pillar_external,
                   s.top_risk_driver, s.key_metrics
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
        national_percentile=round(row[8], 3),
        pillar_openness=round(row[9], 1), pillar_price=round(row[10], 1),
        pillar_vendors=round(row[11], 1), pillar_process=round(row[12], 1),
        pillar_external=round(row[13], 1),
        top_risk_driver=row[14], key_metrics=metrics,
    )


@router.get("/vendors", response_model=VendorScorecardListResponse)
def list_vendor_scorecards(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = Query("total_score", pattern="^(total_score|grade|national_percentile|vendor_name|pillar_risk_signal|pillar_conduct|pillar_spread|pillar_behavior|pillar_flags)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    grade: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
):
    """Ranked list of vendor scorecards."""
    with get_db() as conn:
        where_clauses = ["1=1"]
        params: list = []

        if grade:
            where_clauses.append("s.grade = ?")
            params.append(grade)
        if min_score is not None:
            where_clauses.append("s.total_score >= ?")
            params.append(min_score)
        if max_score is not None:
            where_clauses.append("s.total_score <= ?")
            params.append(max_score)
        if search:
            where_clauses.append("v.name LIKE ?")
            params.append(f"%{search}%")

        where_sql = " AND ".join(where_clauses)
        # vendor_name sort maps to vendors.name alias
        if sort_by == "vendor_name":
            order_sql = f"v.name {'DESC' if order == 'desc' else 'ASC'}"
        else:
            order_sql = f"s.{sort_by} {'DESC' if order == 'desc' else 'ASC'}"

        total = conn.execute(f"""
            SELECT COUNT(*)
            FROM vendor_scorecards s
            JOIN vendors v ON s.vendor_id = v.id
            WHERE {where_sql}
        """, params).fetchone()[0]

        offset = (page - 1) * per_page
        rows = conn.execute(f"""
            SELECT s.vendor_id, v.name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile, s.sector_percentile,
                   s.pillar_risk_signal, s.pillar_conduct, s.pillar_spread,
                   s.pillar_behavior, s.pillar_flags,
                   s.top_risk_driver
            FROM vendor_scorecards s
            JOIN vendors v ON s.vendor_id = v.id
            WHERE {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
        """, params + [per_page, offset]).fetchall()

        where_no_grade = " AND ".join([c for c in where_clauses if "s.grade" not in c])
        filter_params_no_grade = [p for p, w in zip(params, where_clauses[1:]) if "s.grade" not in w]
        dist_rows = conn.execute(f"""
            SELECT s.grade, COUNT(*)
            FROM vendor_scorecards s
            JOIN vendors v ON s.vendor_id = v.id
            WHERE {where_no_grade}
            GROUP BY s.grade
        """, filter_params_no_grade).fetchall()
        grade_dist = {r[0]: r[1] for r in dist_rows}

    items = [
        VendorScorecardListItem(
            vendor_id=r[0], vendor_name=r[1],
            total_score=round(r[2], 1),
            grade=r[3], grade_label=r[4], grade_color=r[5],
            national_percentile=round(r[6], 3),
            sector_percentile=round(r[7], 3),
            pillar_risk_signal=round(r[8], 1),
            pillar_conduct=round(r[9], 1),
            pillar_spread=round(r[10], 1),
            pillar_behavior=round(r[11], 1),
            pillar_flags=round(r[12], 1),
            top_risk_driver=r[13],
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
    with get_db() as conn:
        row = conn.execute("""
            SELECT s.vendor_id, v.name,
                   s.total_score, s.grade, s.grade_label, s.grade_color,
                   s.national_percentile, s.sector_percentile,
                   s.pillar_risk_signal, s.pillar_conduct, s.pillar_spread,
                   s.pillar_behavior, s.pillar_flags,
                   s.top_risk_driver, s.key_metrics
            FROM vendor_scorecards s
            JOIN vendors v ON s.vendor_id = v.id
            WHERE s.vendor_id = ?
        """, (vendor_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Vendor scorecard not found")

    metrics = json.loads(row[14]) if row[14] else {}
    return VendorScorecardResponse(
        vendor_id=row[0], vendor_name=row[1],
        total_score=round(row[2], 1),
        grade=row[3], grade_label=row[4], grade_color=row[5],
        national_percentile=round(row[6], 3),
        sector_percentile=round(row[7], 3),
        pillar_risk_signal=round(row[8], 1),
        pillar_conduct=round(row[9], 1),
        pillar_spread=round(row[10], 1),
        pillar_behavior=round(row[11], 1),
        pillar_flags=round(row[12], 1),
        top_risk_driver=row[13], key_metrics=metrics,
    )
