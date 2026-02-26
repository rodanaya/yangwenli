"""API router for institution endpoints."""
import math
import logging
import threading
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Path

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..models.institution import (
    InstitutionResponse,
    InstitutionDetailResponse,
    InstitutionListResponse,
    InstitutionRiskProfile,
    InstitutionTypeResponse,
    InstitutionTypeListResponse,
    SizeTierResponse,
    SizeTierListResponse,
    AutonomyLevelResponse,
    AutonomyLevelListResponse,
    InstitutionVendorItem,
    InstitutionVendorListResponse,
    InstitutionTopItem,
    InstitutionTopListResponse,
    InstitutionHierarchyItem,
    InstitutionHierarchyResponse,
    InstitutionSearchResult,
    InstitutionSearchResponse,
    InstitutionComparisonItem,
    InstitutionComparisonResponse,
)
from ..models.common import PaginationMeta
from ..models.contract import ContractListItem, ContractListResponse, PaginationMeta as ContractPaginationMeta
from pydantic import BaseModel
from ..services.institution_service import institution_service
from ..models.asf import ASFInstitutionResponse, ASFInstitutionFinding

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/institutions", tags=["institutions"])

# Simple cache for expensive /top endpoint (avoids full 3.1M-row scan on every call)
_top_cache: Dict[str, Dict[str, Any]] = {}
_top_cache_lock = threading.Lock()
_TOP_CACHE_TTL = 3600  # 1 hour


def _get_top_cache(key: str) -> Any:
    with _top_cache_lock:
        entry = _top_cache.get(key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]
        return None


def _set_top_cache(key: str, value: Any) -> None:
    with _top_cache_lock:
        _top_cache[key] = {"value": value, "expires_at": datetime.now() + timedelta(seconds=_TOP_CACHE_TTL)}

# Risk baselines from taxonomy (duplicated here for API use)
INSTITUTION_RISK_BASELINES = {
    'autonomous_constitutional': 0.10,
    'judicial': 0.10,
    'regulatory_agency': 0.15,
    'federal_secretariat': 0.15,
    'legislative': 0.15,
    'military': 0.15,
    'research_education': 0.18,
    'federal_agency': 0.20,
    'educational': 0.20,
    'state_enterprise_finance': 0.22,
    'health_institution': 0.25,
    'state_enterprise_infra': 0.25,
    'social_security': 0.25,
    'other': 0.25,
    'state_enterprise_energy': 0.28,
    'social_program': 0.30,
    'state_government': 0.30,
    'state_agency': 0.30,
    'municipal': 0.35,
}

SIZE_TIER_ADJUSTMENTS = {
    'mega': 0.05,
    'large': 0.02,
    'medium': 0.00,
    'small': -0.02,
    'micro': -0.05,
}

AUTONOMY_BASELINES = {
    'full_autonomy': 0.10,
    'technical_autonomy': 0.15,
    'operational_autonomy': 0.20,
    'dependent': 0.25,
    'subnational': 0.30,
}


@router.get("", response_model=InstitutionListResponse)
def list_institutions(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    institution_type: Optional[str] = Query(None, description="Filter by institution type code"),
    size_tier: Optional[str] = Query(None, description="Filter by size tier"),
    autonomy_level: Optional[str] = Query(None, description="Filter by autonomy level"),
    sector_id: Optional[int] = Query(None, description="Filter by sector ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code"),
    search: Optional[str] = Query(None, min_length=2, description="Search institution name"),
    min_contracts: Optional[int] = Query(None, ge=0, description="Minimum contract count"),
    is_legally_decentralized: Optional[bool] = Query(None, description="Filter by legal decentralized status"),
    sort_by: str = Query("total_contracts", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    List institutions with pagination, filters, and sorting.

    Supports filtering by type, size, autonomy, sector, state, and search.
    Joins with institution_stats for richer metrics.
    """
    with get_db() as conn:
        result = institution_service.list_institutions(
            conn,
            page=page,
            per_page=per_page,
            institution_type=institution_type,
            size_tier=size_tier,
            autonomy_level=autonomy_level,
            sector_id=sector_id,
            state_code=state_code,
            search=search,
            min_contracts=min_contracts,
            is_legally_decentralized=is_legally_decentralized,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        institutions = [InstitutionResponse(**row) for row in result.data]

        # Track applied filters
        filters_applied = {}
        if institution_type:
            filters_applied["institution_type"] = institution_type
        if size_tier:
            filters_applied["size_tier"] = size_tier
        if autonomy_level:
            filters_applied["autonomy_level"] = autonomy_level
        if sector_id:
            filters_applied["sector_id"] = sector_id
        if state_code:
            filters_applied["state_code"] = state_code
        if search:
            filters_applied["search"] = search
        if min_contracts is not None:
            filters_applied["min_contracts"] = min_contracts
        if is_legally_decentralized is not None:
            filters_applied["is_legally_decentralized"] = is_legally_decentralized

        return InstitutionListResponse(
            data=institutions,
            pagination=PaginationMeta(**result.pagination),
            filters_applied=filters_applied,
        )


@router.get("/{institution_id:int}", response_model=InstitutionDetailResponse)
def get_institution(institution_id: int):
    """
    Get details for a specific institution.

    Returns institution information with risk profile data including
    avg_risk_score, direct_award_rate, and high_risk metrics for comparison.
    """
    with get_db() as conn:
        detail = institution_service.get_institution_detail(conn, institution_id)

        if detail is None:
            raise HTTPException(
                status_code=404,
                detail=f"Institution {institution_id} not found",
            )

        total_contracts = detail["total_contracts"] or 0
        stats = detail.get("stats")

        # Calculate derived metrics from pre-computed stats
        avg_value = None
        if total_contracts > 0 and detail["total_amount_mxn"]:
            avg_value = detail["total_amount_mxn"] / total_contracts

        high_risk_count = stats["high_risk_count"] if stats else 0
        high_risk_pct = stats["high_risk_pct"] if stats else 0.0

        direct_award_count = stats["direct_award_count"] if stats else 0
        direct_award_rate = stats["direct_award_pct"] if stats else 0.0

        avg_risk_score = stats["avg_risk_score"] if stats else None
        if avg_risk_score is not None:
            avg_risk_score = round(avg_risk_score, 4)

        # Longest-tenured vendors at this institution (Coviello & Gagliarducci 2017)
        cursor = conn.cursor()
        tenure_rows = cursor.execute("""
            SELECT vit.vendor_id, v.name AS vendor_name,
                   vit.first_contract_year, vit.last_contract_year,
                   vit.total_contracts,
                   vs.avg_risk_score AS avg_risk
            FROM vendor_institution_tenure vit
            JOIN vendors v ON vit.vendor_id = v.id
            LEFT JOIN vendor_stats vs ON vit.vendor_id = vs.vendor_id
            WHERE vit.institution_id = ?
            ORDER BY (vit.last_contract_year - vit.first_contract_year) DESC, vit.total_contracts DESC
            LIMIT 10
        """, (institution_id,)).fetchall()
        longest_tenured = [
            {
                "vendor_id": r["vendor_id"],
                "vendor_name": r["vendor_name"],
                "first_contract_year": r["first_contract_year"],
                "last_contract_year": r["last_contract_year"],
                "tenure_years": (r["last_contract_year"] - r["first_contract_year"] + 1),
                "total_contracts": r["total_contracts"],
                "avg_risk_score": round(r["avg_risk"], 4) if r["avg_risk"] else None,
            }
            for r in tenure_rows
        ]

        # Supplier diversity: HHI over recent years (Prozorro analytics; Fazekas CRI)
        hhi_rows = cursor.execute("""
            WITH vendor_shares AS (
                SELECT contract_year, vendor_id,
                       SUM(COALESCE(amount_mxn, 0)) AS vendor_value
                FROM contracts
                WHERE institution_id = ? AND vendor_id IS NOT NULL
                  AND contract_year IS NOT NULL AND amount_mxn > 0
                GROUP BY contract_year, vendor_id
            ),
            year_totals AS (
                SELECT contract_year,
                       SUM(vendor_value) AS total_value,
                       COUNT(DISTINCT vendor_id) AS unique_vendors
                FROM vendor_shares GROUP BY contract_year
            )
            SELECT vs.contract_year,
                   ROUND(SUM((vs.vendor_value * 100.0 / yt.total_value) *
                             (vs.vendor_value * 100.0 / yt.total_value)), 1) AS hhi,
                   yt.unique_vendors
            FROM vendor_shares vs
            JOIN year_totals yt ON vs.contract_year = yt.contract_year
            WHERE yt.total_value > 0
            GROUP BY vs.contract_year
            ORDER BY vs.contract_year DESC
            LIMIT 10
        """, (institution_id,)).fetchall()

        supplier_diversity = None
        if hhi_rows:
            hhi_list = [{"year": r["contract_year"], "hhi": float(r["hhi"]), "unique_vendors": int(r["unique_vendors"])} for r in hhi_rows]
            current = hhi_list[0]
            recent_5 = hhi_list[:5]
            hhi_5yr_avg = round(sum(h["hhi"] for h in recent_5) / len(recent_5), 1)

            def _concentration_level(h: float) -> str:
                if h >= 2500: return "high"
                if h >= 1000: return "medium"
                return "low"

            trend = "stable"
            if len(hhi_list) >= 3:
                if hhi_list[0]["hhi"] > hhi_list[2]["hhi"] * 1.1:
                    trend = "increasing"
                elif hhi_list[0]["hhi"] < hhi_list[2]["hhi"] * 0.9:
                    trend = "decreasing"

            supplier_diversity = {
                "hhi_current_year": current["hhi"],
                "hhi_5yr_avg": hhi_5yr_avg,
                "unique_vendors_current_year": current["unique_vendors"],
                "concentration_level": _concentration_level(current["hhi"]),
                "trend": trend,
                "history": hhi_list,
                "prozorro_note": "Ukraine's Prozorro flags institutions with HHI >4000 as concentrated purchasing.",
            }

        return InstitutionDetailResponse(
            id=detail["id"],
            name=detail["name"],
            name_normalized=detail["name_normalized"],
            siglas=detail["siglas"],
            institution_type=detail["institution_type"],
            institution_type_id=detail["institution_type_id"],
            size_tier=detail["size_tier"],
            autonomy_level=detail["autonomy_level"],
            is_legally_decentralized=bool(detail["is_legally_decentralized"]) if detail["is_legally_decentralized"] is not None else None,
            sector_id=detail["sector_id"],
            state_code=detail["state_code"],
            geographic_scope=detail["geographic_scope"],
            total_contracts=total_contracts,
            total_amount_mxn=detail["total_amount_mxn"],
            classification_confidence=detail["classification_confidence"],
            data_quality_grade=detail["data_quality_grade"],
            risk_baseline=detail["type_risk_baseline"],
            size_risk_adjustment=detail["size_risk_adjustment"],
            autonomy_risk_baseline=detail["autonomy_risk_baseline"],
            avg_contract_value=avg_value,
            high_risk_contract_count=high_risk_count,
            high_risk_percentage=round(high_risk_pct, 2),
            avg_risk_score=avg_risk_score,
            direct_award_rate=round(direct_award_rate, 2),
            direct_award_count=direct_award_count,
            longest_tenured_vendors=longest_tenured,
            supplier_diversity=supplier_diversity,
        )


@router.get("/{institution_id:int}/risk-timeline")
def get_institution_risk_timeline(
    institution_id: int = Path(..., description="Institution ID"),
):
    """
    Get year-by-year average risk score for an institution.

    Returns a timeline of average risk scores and contract counts per year.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify institution exists
        cursor.execute("SELECT name FROM institutions WHERE id = ?", (institution_id,))
        institution = cursor.fetchone()
        if not institution:
            raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

        cursor.execute("""
            SELECT
                contract_year as year,
                AVG(risk_score) as avg_risk_score,
                COUNT(*) as contract_count,
                SUM(amount_mxn) as total_value
            FROM contracts
            WHERE institution_id = ?
              AND risk_score IS NOT NULL
              AND contract_year IS NOT NULL
            GROUP BY contract_year
            ORDER BY contract_year
        """, (institution_id,))

        timeline = [
            {
                "year": row["year"],
                "avg_risk_score": round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                "contract_count": row["contract_count"],
                "total_value": row["total_value"] or 0,
            }
            for row in cursor.fetchall()
        ]

        return {
            "institution_id": institution_id,
            "institution_name": institution["name"],
            "timeline": timeline,
        }


@router.get("/{institution_id:int}/risk-profile", response_model=InstitutionRiskProfile)
def get_institution_risk_profile(institution_id: int):
    """
    Get detailed risk profile for an institution.

    Returns risk breakdown by factors and contract risk distribution.
    """
    cache_key = f"risk-profile:{institution_id}"
    cached = _get_top_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        # Get institution info
        cursor.execute("""
            SELECT
                i.id, i.name, i.institution_type, i.size_tier, i.autonomy_level,
                i.total_contracts, i.total_amount_mxn
            FROM institutions i
            WHERE i.id = ?
        """, (institution_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Institution {institution_id} not found"
            )

        # Get risk baselines
        inst_type = row["institution_type"] or "other"
        size_tier = row["size_tier"] or "micro"
        autonomy = row["autonomy_level"] or "dependent"

        risk_baseline = INSTITUTION_RISK_BASELINES.get(inst_type, 0.25)
        size_adjustment = SIZE_TIER_ADJUSTMENTS.get(size_tier, 0.0)
        autonomy_baseline = AUTONOMY_BASELINES.get(autonomy, 0.25)

        # Calculate effective risk (weighted combination)
        # Note: size_adjustment ranges from -0.05 to +0.05, normalized to 0.15-0.25 range
        effective_risk = (risk_baseline * 0.5) + (autonomy_baseline * 0.3) + ((size_adjustment + 0.2) * 0.2)

        # Get contract risk distribution
        cursor.execute("""
            SELECT risk_level, COUNT(*) as count
            FROM contracts
            WHERE institution_id = ?
            GROUP BY risk_level
        """, (institution_id,))

        contracts_by_risk = {}
        for risk_row in cursor.fetchall():
            level = risk_row["risk_level"] or "unknown"
            contracts_by_risk[level] = risk_row["count"]

        # Get average risk score
        cursor.execute("""
            SELECT AVG(risk_score) as avg_risk
            FROM contracts
            WHERE institution_id = ?
        """, (institution_id,))
        avg_risk_row = cursor.fetchone()

        response = InstitutionRiskProfile(
            institution_id=row["id"],
            institution_name=row["name"],
            institution_type=inst_type,
            risk_baseline=risk_baseline,
            size_tier=size_tier,
            size_risk_adjustment=size_adjustment,
            autonomy_level=autonomy,
            autonomy_risk_baseline=autonomy_baseline,
            effective_risk=round(effective_risk, 4),
            total_contracts=row["total_contracts"] or 0,
            total_value=row["total_amount_mxn"] or 0.0,
            contracts_by_risk_level=contracts_by_risk,
            avg_risk_score=avg_risk_row["avg_risk"] if avg_risk_row else None,
        )
        _set_top_cache(cache_key, response)
        return response


# =============================================================================
# INSTITUTION HELPER ENDPOINTS
# =============================================================================

@router.get("/search", response_model=InstitutionSearchResponse)
def search_institutions(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
):
    """
    Search institutions by name, acronym, or normalized name.

    Returns institutions matching the query with match type indication.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        search_pattern = f"%{q}%"

        query = """
            SELECT
                id, name, siglas, name_normalized, institution_type, sector_id, total_contracts,
                CASE
                    WHEN siglas LIKE ? THEN 'siglas'
                    WHEN name LIKE ? THEN 'name'
                    ELSE 'normalized'
                END as match_type
            FROM institutions
            WHERE siglas LIKE ? OR name LIKE ? OR name_normalized LIKE ?
            ORDER BY
                CASE WHEN siglas LIKE ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END,
                total_contracts DESC NULLS LAST
            LIMIT ?
        """
        cursor.execute(query, (
            search_pattern, search_pattern,  # CASE
            search_pattern, search_pattern, search_pattern,  # WHERE
            search_pattern, search_pattern,  # ORDER BY
            limit
        ))
        rows = cursor.fetchall()

        results = [
            InstitutionSearchResult(
                id=row["id"],
                name=row["name"],
                siglas=row["siglas"],
                institution_type=row["institution_type"],
                sector_id=row["sector_id"],
                total_contracts=row["total_contracts"],
                match_type=row["match_type"],
            )
            for row in rows
        ]

        return InstitutionSearchResponse(
            data=results,
            query=q,
            total=len(results),
        )


@router.get("/compare", response_model=InstitutionComparisonResponse)
def compare_institutions(
    ids: str = Query(..., description="Comma-separated list of institution IDs to compare"),
):
    """
    Compare multiple institutions side-by-side.

    Returns comprehensive metrics for each institution including:
    - avg_risk_score: Average risk score of all contracts
    - direct_award_rate: Percentage of direct award contracts
    - high_risk_count: Number of high/critical risk contracts
    - single_bid_rate: Percentage of single-bid contracts

    Accepts up to 10 institutions for comparison.
    """
    # Parse institution IDs
    try:
        institution_ids = [int(id.strip()) for id in ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid institution IDs. Must be comma-separated integers.")

    if not institution_ids:
        raise HTTPException(status_code=400, detail="At least one institution ID is required")

    if len(institution_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 institutions can be compared at once")

    with get_db() as conn:
        cursor = conn.cursor()

        # Build placeholders for IN clause
        placeholders = ",".join("?" * len(institution_ids))

        # Get institution info with aggregated metrics in a single efficient query
        query = f"""
            SELECT
                i.id,
                i.name,
                i.siglas,
                i.institution_type,
                i.sector_id,
                i.total_contracts,
                i.total_amount_mxn,
                COALESCE(metrics.avg_risk_score, 0) as avg_risk_score,
                COALESCE(metrics.direct_award_count, 0) as direct_award_count,
                COALESCE(metrics.high_risk_count, 0) as high_risk_count,
                COALESCE(metrics.single_bid_count, 0) as single_bid_count
            FROM institutions i
            LEFT JOIN (
                SELECT
                    institution_id,
                    AVG(risk_score) as avg_risk_score,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_count,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count
                FROM contracts
                WHERE institution_id IN ({placeholders})
                AND COALESCE(amount_mxn, 0) <= ?
                GROUP BY institution_id
            ) metrics ON i.id = metrics.institution_id
            WHERE i.id IN ({placeholders})
        """

        # Parameters: institution_ids for subquery, MAX_CONTRACT_VALUE, institution_ids for main query
        params = institution_ids + [MAX_CONTRACT_VALUE] + institution_ids
        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Build comparison items
        items = []
        for row in rows:
            total_contracts = row["total_contracts"] or 0
            total_value = row["total_amount_mxn"] or 0

            # Calculate rates
            direct_award_rate = (row["direct_award_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            high_risk_pct = (row["high_risk_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            single_bid_rate = (row["single_bid_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            avg_contract_value = (total_value / total_contracts) if total_contracts > 0 else None

            items.append(InstitutionComparisonItem(
                id=row["id"],
                name=row["name"],
                siglas=row["siglas"],
                institution_type=row["institution_type"],
                sector_id=row["sector_id"],
                total_contracts=total_contracts,
                total_value_mxn=total_value,
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                direct_award_rate=round(direct_award_rate, 2),
                direct_award_count=row["direct_award_count"],
                high_risk_count=row["high_risk_count"],
                high_risk_percentage=round(high_risk_pct, 2),
                single_bid_rate=round(single_bid_rate, 2),
                avg_contract_value=round(avg_contract_value, 2) if avg_contract_value else None,
            ))

        # Sort to match input order
        id_order = {id: i for i, id in enumerate(institution_ids)}
        items.sort(key=lambda x: id_order.get(x.id, 999))

        return InstitutionComparisonResponse(
            data=items,
            total=len(items),
        )


@router.get("/top", response_model=InstitutionTopListResponse)
def get_top_institutions(
    by: str = Query("spending", description="Ranking metric: spending, contracts, risk"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    institution_type: Optional[str] = Query(None, description="Filter by institution type"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
):
    """
    Get top institutions by spending, contract count, or risk score.

    Returns institutions ranked by the specified metric with aggregate statistics.
    """
    cache_key = f"top:{by}:{limit}:{institution_type}:{sector_id}"
    cached = _get_top_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        # Build filters
        conditions = ["COALESCE(c.amount_mxn, 0) <= ?"]
        params = [MAX_CONTRACT_VALUE]

        if institution_type is not None:
            conditions.append("i.institution_type = ?")
            params.append(institution_type)

        if sector_id is not None:
            conditions.append("c.sector_id = ?")
            params.append(sector_id)

        where_clause = " AND ".join(conditions)

        # Determine sort expression based on metric
        metric_mapping = {
            "spending": ("SUM(c.amount_mxn)", "DESC"),
            "contracts": ("COUNT(c.id)", "DESC"),
            "risk": ("AVG(c.risk_score)", "DESC"),
        }
        if by not in metric_mapping:
            raise HTTPException(status_code=400, detail=f"Invalid metric '{by}'. Use: spending, contracts, risk")

        sort_expr, sort_dir = metric_mapping[by]

        query = f"""
            SELECT
                i.id,
                i.name,
                i.institution_type,
                {sort_expr} as metric_value,
                COUNT(c.id) as total_contracts,
                COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
                COALESCE(AVG(c.risk_score), 0) as avg_risk_score
            FROM institutions i
            JOIN contracts c ON i.id = c.institution_id
            WHERE {where_clause}
            GROUP BY i.id, i.name, i.institution_type
            HAVING COUNT(c.id) > 0
            ORDER BY metric_value {sort_dir} NULLS LAST
            LIMIT ?
        """
        params.append(limit)
        cursor.execute(query, params)
        rows = cursor.fetchall()

        institutions = [
            InstitutionTopItem(
                rank=i + 1,
                institution_id=row["id"],
                institution_name=row["name"],
                institution_type=row["institution_type"],
                metric_value=row["metric_value"] or 0,
                total_contracts=row["total_contracts"],
                total_value_mxn=row["total_value_mxn"],
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
            )
            for i, row in enumerate(rows)
        ]

        response = InstitutionTopListResponse(
            data=institutions,
            metric=by,
            total=len(institutions),
        )
        _set_top_cache(cache_key, response)
        return response


@router.get("/hierarchy", response_model=InstitutionHierarchyResponse)
def get_institution_hierarchy():
    """
    Get institution hierarchy by type.

    Returns institutions grouped by type with aggregate statistics.
    """
    cached = _get_top_cache("hierarchy")
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT
                i.institution_type,
                it.name_es as institution_type_name,
                COUNT(DISTINCT i.id) as count,
                COALESCE(SUM(i.total_contracts), 0) as total_contracts,
                COALESCE(SUM(i.total_amount_mxn), 0) as total_value_mxn,
                COALESCE(AVG(c.risk_score), 0) as avg_risk_score
            FROM institutions i
            LEFT JOIN institution_types it ON i.institution_type = it.code
            LEFT JOIN contracts c ON i.id = c.institution_id
                AND COALESCE(c.amount_mxn, 0) <= ?
            GROUP BY i.institution_type, it.name_es
            ORDER BY total_contracts DESC
        """
        cursor.execute(query, (MAX_CONTRACT_VALUE,))
        rows = cursor.fetchall()

        hierarchy = [
            InstitutionHierarchyItem(
                institution_type=row["institution_type"] or "unknown",
                institution_type_name=row["institution_type_name"],
                count=row["count"],
                total_contracts=row["total_contracts"],
                total_value_mxn=row["total_value_mxn"],
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
            )
            for row in rows
        ]

        # Get total counts
        cursor.execute("SELECT COUNT(*) FROM institutions")
        total_institutions = cursor.fetchone()[0]

        response = InstitutionHierarchyResponse(
            data=hierarchy,
            total_institutions=total_institutions,
            total_types=len(hierarchy),
        )
        _set_top_cache("hierarchy", response)
        return response


@router.get("/{institution_id:int}/contracts", response_model=ContractListResponse)
def get_institution_contracts(
    institution_id: int = Path(..., description="Institution ID"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    sort_by: str = Query("contract_date", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    Get contracts for a specific institution with pagination.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify institution exists
        cursor.execute("SELECT name FROM institutions WHERE id = ?", (institution_id,))
        institution = cursor.fetchone()
        if not institution:
            raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

        # Build WHERE clause
        conditions = ["c.institution_id = ?", "COALESCE(c.amount_mxn, 0) <= ?"]
        params = [institution_id, MAX_CONTRACT_VALUE]

        if year is not None:
            conditions.append("c.contract_year = ?")
            params.append(year)

        if risk_level is not None:
            conditions.append("c.risk_level = ?")
            params.append(risk_level.lower())

        where_clause = " AND ".join(conditions)

        # Sort field mapping
        SORT_FIELD_MAPPING = {
            "contract_date": "c.contract_date",
            "amount_mxn": "c.amount_mxn",
            "risk_score": "c.risk_score",
        }
        sort_expr = SORT_FIELD_MAPPING.get(sort_by, "c.contract_date")
        order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Count total -- use pre-computed stats when no filters active (fast path)
        if year is None and risk_level is None:
            cursor.execute(
                "SELECT total_contracts FROM institution_stats WHERE institution_id = ?",
                (institution_id,)
            )
            stats_row = cursor.fetchone()
            total = stats_row["total_contracts"] if stats_row else 0
        else:
            cursor.execute(f"SELECT COUNT(*) FROM contracts c WHERE {where_clause}", params)
            total = cursor.fetchone()[0]
        total_pages = math.ceil(total / per_page) if total > 0 else 1

        # Get paginated results
        offset = (page - 1) * per_page
        query = f"""
            SELECT
                c.id, c.contract_number, c.title, c.amount_mxn,
                c.contract_date, c.contract_year, c.sector_id,
                s.name_es as sector_name, c.risk_score, c.risk_level,
                c.is_direct_award, c.is_single_bid,
                v.name as vendor_name, i.name as institution_name,
                c.procedure_type
            FROM contracts c
            LEFT JOIN sectors s ON c.sector_id = s.id
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE {where_clause}
            ORDER BY {sort_expr} {order_direction} NULLS LAST
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, params + [per_page, offset])
        rows = cursor.fetchall()

        contracts = [
            ContractListItem(
                id=row["id"],
                contract_number=row["contract_number"],
                title=row["title"],
                amount_mxn=row["amount_mxn"] or 0,
                contract_date=row["contract_date"],
                contract_year=row["contract_year"],
                sector_id=row["sector_id"],
                sector_name=row["sector_name"],
                risk_score=row["risk_score"],
                risk_level=row["risk_level"],
                is_direct_award=bool(row["is_direct_award"]),
                is_single_bid=bool(row["is_single_bid"]),
                vendor_name=row["vendor_name"],
                institution_name=row["institution_name"],
                procedure_type=row["procedure_type"],
            )
            for row in rows
        ]

        return ContractListResponse(
            data=contracts,
            pagination=ContractPaginationMeta(
                page=page,
                per_page=per_page,
                total=total,
                total_pages=total_pages,
            )
        )


@router.get("/{institution_id:int}/vendors", response_model=InstitutionVendorListResponse)
def get_institution_vendors(
    institution_id: int = Path(..., description="Institution ID"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    Get vendors that an institution has contracted with.

    Returns vendors ranked by contract value with this institution.
    """
    offset = (page - 1) * per_page
    with get_db() as conn:
        result = institution_service.get_institution_vendors(
            conn, institution_id, limit=per_page, offset=offset,
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail=f"Institution {institution_id} not found",
            )

        vendors = [
            InstitutionVendorItem(
                vendor_id=v["vendor_id"],
                vendor_name=v["vendor_name"],
                contract_count=v["contract_count"],
                total_value_mxn=v["total_value"],
                avg_risk_score=v["avg_risk_score"],
                first_year=v["first_year"],
                last_year=v["last_year"],
            )
            for v in result["vendors"]
        ]

        return InstitutionVendorListResponse(
            institution_id=result["institution_id"],
            institution_name=result["institution_name"],
            data=vendors,
            total=result["total_vendors"],
        )


# =============================================================================
# Vendor loyalty heatmap
# =============================================================================

class VendorYearPoint(BaseModel):
    year: int
    contract_count: int
    total_value: float
    avg_risk: Optional[float]

class VendorLoyaltyItem(BaseModel):
    vendor_id: int
    vendor_name: str
    total_value: float
    first_year: int
    last_year: int
    year_count: int
    years: List[VendorYearPoint]

class VendorLoyaltyResponse(BaseModel):
    institution_id: int
    vendors: List[VendorLoyaltyItem]
    year_range: List[int]

_loyalty_cache: Dict[int, Any] = {}
_loyalty_cache_ts: Dict[int, float] = {}
_loyalty_lock = threading.Lock()

@router.get("/{institution_id:int}/vendor-loyalty", response_model=VendorLoyaltyResponse)
def get_vendor_loyalty(
    institution_id: int = Path(...),
    top_n: int = Query(15, ge=5, le=25),
):
    """
    Per-vendor yearly contract activity for an institution.
    Returns top N vendors by total value, with per-year breakdown.
    Useful for detecting long-term capture relationships.
    """
    cache_key = institution_id * 100 + top_n
    with _loyalty_lock:
        ts = _loyalty_cache_ts.get(cache_key, 0)
        if datetime.now().timestamp() - ts < 1800 and cache_key in _loyalty_cache:
            return _loyalty_cache[cache_key]

    with get_db() as conn:
        cur = conn.cursor()
        # Top N vendors by total value at this institution
        cur.execute("""
            SELECT v.id as vendor_id, v.name as vendor_name,
                   SUM(c.amount_mxn) as total_value
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.id
            WHERE c.institution_id = ?
              AND c.amount_mxn > 0
            GROUP BY v.id, v.name
            ORDER BY total_value DESC
            LIMIT ?
        """, (institution_id, top_n))
        top_vendors = cur.fetchall()

        if not top_vendors:
            raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found or has no vendors")

        vendor_ids = [r["vendor_id"] for r in top_vendors]
        placeholder = ",".join("?" * len(vendor_ids))

        # Per-vendor, per-year breakdown
        cur.execute(f"""
            SELECT vendor_id, contract_year,
                   COUNT(*) as contract_count,
                   SUM(amount_mxn) as total_value,
                   AVG(risk_score) as avg_risk
            FROM contracts
            WHERE institution_id = ?
              AND vendor_id IN ({placeholder})
              AND amount_mxn > 0
            GROUP BY vendor_id, contract_year
            ORDER BY vendor_id, contract_year
        """, (institution_id, *vendor_ids))
        rows = cur.fetchall()

    # Build vendor → year map
    by_vendor: Dict[int, Dict[int, dict]] = defaultdict(dict)
    all_years: set = set()
    for r in rows:
        by_vendor[r["vendor_id"]][r["contract_year"]] = {
            "contract_count": r["contract_count"],
            "total_value": r["total_value"],
            "avg_risk": r["avg_risk"],
        }
        all_years.add(r["contract_year"])

    year_range = sorted(all_years)

    vendor_items = []
    for v in top_vendors:
        vid = v["vendor_id"]
        yd = by_vendor.get(vid, {})
        years_with_data = sorted(yd.keys())
        vendor_items.append(VendorLoyaltyItem(
            vendor_id=vid,
            vendor_name=v["vendor_name"],
            total_value=v["total_value"],
            first_year=min(years_with_data) if years_with_data else 0,
            last_year=max(years_with_data) if years_with_data else 0,
            year_count=len(years_with_data),
            years=[
                VendorYearPoint(
                    year=yr,
                    contract_count=yd[yr]["contract_count"],
                    total_value=yd[yr]["total_value"],
                    avg_risk=yd[yr]["avg_risk"],
                )
                for yr in year_range
                if yr in yd
            ],
        ))

    result = VendorLoyaltyResponse(
        institution_id=institution_id,
        vendors=vendor_items,
        year_range=year_range,
    )
    with _loyalty_lock:
        _loyalty_cache[cache_key] = result
        _loyalty_cache_ts[cache_key] = datetime.now().timestamp()
    return result


# =============================================================================
# Institution peer comparison
# =============================================================================

class PeerMetric(BaseModel):
    metric: str
    label: str
    value: float
    peer_min: float
    peer_p25: float
    peer_median: float
    peer_p75: float
    peer_max: float
    percentile: int

class PeerComparisonResponse(BaseModel):
    institution_id: int
    institution_name: str
    institution_type: Optional[str]
    peer_count: int
    metrics: List[PeerMetric]

_peer_cache: Dict[int, Any] = {}
_peer_cache_ts: Dict[int, float] = {}
_peer_lock = threading.Lock()

def _percentile_rank(value: float, values: List[float]) -> int:
    if not values:
        return 50
    below = sum(1 for v in values if v < value)
    return round(below / len(values) * 100)

@router.get("/{institution_id:int}/peer-comparison", response_model=PeerComparisonResponse)
def get_peer_comparison(institution_id: int = Path(...)):
    """
    Compare an institution against peers of the same institution_type.
    Returns percentile ranks and distribution (min/p25/median/p75/max) for
    avg_risk_score, high_risk_pct, and direct_award_pct.
    """
    with _peer_lock:
        ts = _peer_cache_ts.get(institution_id, 0)
        if datetime.now().timestamp() - ts < 3600 and institution_id in _peer_cache:
            return _peer_cache[institution_id]

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.id, i.name, i.institution_type,
                   ist.avg_risk_score, ist.high_risk_pct, ist.direct_award_pct
            FROM institutions i
            JOIN institution_stats ist ON i.id = ist.institution_id
            WHERE i.id = ?
        """, (institution_id,))
        target = cur.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

        itype = target["institution_type"]
        if itype:
            cur.execute("""
                SELECT ist.avg_risk_score, ist.high_risk_pct, ist.direct_award_pct
                FROM institutions i
                JOIN institution_stats ist ON i.id = ist.institution_id
                WHERE i.institution_type = ?
                  AND ist.avg_risk_score IS NOT NULL
                  AND i.id != ?
            """, (itype, institution_id))
        else:
            cur.execute("""
                SELECT ist.avg_risk_score, ist.high_risk_pct, ist.direct_award_pct
                FROM institution_stats ist
                WHERE ist.avg_risk_score IS NOT NULL
                  AND ist.institution_id != ?
            """, (institution_id,))
        peers = cur.fetchall()

    def dist(vals: List[float], value: float) -> PeerMetric:
        return PeerMetric(
            metric="",
            label="",
            value=value,
            peer_min=min(vals) if vals else 0.0,
            peer_p25=sorted(vals)[len(vals)//4] if vals else 0.0,
            peer_median=sorted(vals)[len(vals)//2] if vals else 0.0,
            peer_p75=sorted(vals)[3*len(vals)//4] if vals else 0.0,
            peer_max=max(vals) if vals else 0.0,
            percentile=_percentile_rank(value, vals),
        )

    risk_vals = [p["avg_risk_score"] for p in peers if p["avg_risk_score"] is not None]
    hr_vals   = [p["high_risk_pct"] for p in peers if p["high_risk_pct"] is not None]
    da_vals   = [p["direct_award_pct"] for p in peers if p["direct_award_pct"] is not None]

    def make_metric(key: str, label: str, val: Optional[float], peer_vals: List[float]) -> PeerMetric:
        v = val if val is not None else 0.0
        m = dist(peer_vals, v)
        m.metric = key
        m.label = label
        return m

    metrics = [
        make_metric("avg_risk_score", "Avg Risk Score", target["avg_risk_score"], risk_vals),
        make_metric("high_risk_pct",  "High Risk %",    target["high_risk_pct"],  hr_vals),
        make_metric("direct_award_pct", "Direct Award %", target["direct_award_pct"], da_vals),
    ]

    result = PeerComparisonResponse(
        institution_id=institution_id,
        institution_name=target["name"],
        institution_type=itype,
        peer_count=len(peers),
        metrics=metrics,
    )
    with _peer_lock:
        _peer_cache[institution_id] = result
        _peer_cache_ts[institution_id] = datetime.now().timestamp()
    return result


# =============================================================================
# Lookup table endpoints
# =============================================================================

@router.get("/types", response_model=InstitutionTypeListResponse)
def list_institution_types():
    """
    List all institution types.

    Returns the 19 institution type definitions from taxonomy v2.0.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, code, name_es, name_en, description,
                is_legally_decentralized, default_sector, risk_baseline
            FROM institution_types
            ORDER BY id
        """)

        rows = cursor.fetchall()

        types = [
            InstitutionTypeResponse(
                id=row["id"],
                code=row["code"],
                name_es=row["name_es"],
                name_en=row["name_en"],
                description=row["description"],
                is_legally_decentralized=bool(row["is_legally_decentralized"]),
                default_sector=row["default_sector"],
                risk_baseline=row["risk_baseline"]
            )
            for row in rows
        ]

        return InstitutionTypeListResponse(
            data=types,
            total=len(types)
        )


@router.get("/size-tiers", response_model=SizeTierListResponse)
def list_size_tiers():
    """
    List all size tiers.

    Returns the 5 size tier definitions (mega, large, medium, small, micro).
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, code, name_es, name_en,
                min_contracts, max_contracts, risk_adjustment
            FROM size_tiers
            ORDER BY id
        """)

        rows = cursor.fetchall()

        tiers = [
            SizeTierResponse(
                id=row["id"],
                code=row["code"],
                name_es=row["name_es"],
                name_en=row["name_en"],
                min_contracts=row["min_contracts"],
                max_contracts=row["max_contracts"] if row["max_contracts"] != -1 else None,
                risk_adjustment=row["risk_adjustment"]
            )
            for row in rows
        ]

        return SizeTierListResponse(
            data=tiers,
            total=len(tiers)
        )


@router.get("/autonomy-levels", response_model=AutonomyLevelListResponse)
def list_autonomy_levels():
    """
    List all autonomy levels.

    Returns the 5 autonomy level definitions.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, code, name_es, name_en, description, risk_baseline
            FROM autonomy_levels
            ORDER BY id
        """)

        rows = cursor.fetchall()

        levels = [
            AutonomyLevelResponse(
                id=row["id"],
                code=row["code"],
                name_es=row["name_es"],
                name_en=row["name_en"],
                description=row["description"],
                risk_baseline=row["risk_baseline"]
            )
            for row in rows
        ]

        return AutonomyLevelListResponse(
            data=levels,
            total=len(levels)
        )


# =============================================================================
# CRI SCATTER — Fazekas-style institution risk scatter (Section 12.3)
# =============================================================================

_cri_scatter_cache: Dict[str, Any] = {}
_CRI_SCATTER_TTL = 6 * 3600  # 6 hours

@router.get("/cri-scatter")
def get_cri_scatter(
    sector_id: Optional[int] = Query(None, description="Filter by sector"),
    min_contracts: int = Query(100, ge=10, description="Minimum contracts to include"),
    limit: int = Query(200, ge=10, le=500, description="Max institutions to return"),
):
    """
    Fazekas-style CRI scatter: institutions plotted by direct_award_pct (X)
    vs avg_risk_score (Y), bubble size = total_contracts.
    Used in Sectors.tsx to visualize institutional risk landscape.
    """
    import time as _t
    cache_key = f"cri_{sector_id}_{min_contracts}_{limit}"
    cached = _cri_scatter_cache.get(cache_key)
    if cached and (_t.time() - cached["ts"]) < _CRI_SCATTER_TTL:
        return cached["data"]

    with get_db() as conn:
        import sqlite3
        conn.row_factory = sqlite3.Row

        params: List[Any] = [min_contracts]
        sector_filter = ""
        if sector_id:
            sector_filter = "AND i.sector_id = ?"
            params.append(sector_id)

        rows = conn.execute(f"""
            SELECT
                i.id,
                i.name,
                i.sector_id,
                s.code AS sector_code,
                ist.total_contracts,
                ROUND(ist.avg_risk_score, 4) AS avg_risk,
                ROUND(ist.direct_award_pct, 2) AS direct_award_pct,
                ROUND(ist.single_bid_pct, 2) AS single_bid_pct,
                ROUND(ist.high_risk_count * 100.0 / NULLIF(ist.total_contracts, 0), 2) AS high_risk_pct
            FROM institution_stats ist
            JOIN institutions i ON i.id = ist.institution_id
            JOIN sectors s ON s.id = i.sector_id
            WHERE ist.total_contracts >= ? {sector_filter}
            ORDER BY ist.total_contracts DESC
            LIMIT ?
        """, params + [limit]).fetchall()

        data = [
            {
                "id": r["id"],
                "name": r["name"],
                "sector_id": r["sector_id"],
                "sector_code": r["sector_code"] or "otros",
                "total_contracts": r["total_contracts"],
                "avg_risk": float(r["avg_risk"] or 0),
                "direct_award_pct": float(r["direct_award_pct"] or 0),
                "single_bid_pct": float(r["single_bid_pct"] or 0),
                "high_risk_pct": float(r["high_risk_pct"] or 0),
            }
            for r in rows
        ]

        result = {"data": data, "total": len(data)}
        _cri_scatter_cache[cache_key] = {"ts": _t.time(), "data": result}
        return result


# ---------------------------------------------------------------------------
# Concentration Rankings (HHI-based supplier diversity)
# ---------------------------------------------------------------------------
_hhi_cache: Dict[str, Any] = {}
_HHI_TTL = 7200  # 2 hours


@router.get("/concentration-rankings")
def get_concentration_rankings(
    year: Optional[int] = Query(None, description="Year to compute HHI for. Defaults to most recent."),
    sector_id: Optional[int] = Query(None, description="Filter by sector"),
    limit: int = Query(20, ge=5, le=100, description="Number of institutions to return"),
):
    """
    Institutions ranked by Herfindahl-Hirschman Index (HHI) of vendor concentration.
    HHI = sum of squared market shares (0-10000 scale).
    >2500 = highly concentrated; <1000 = competitive.
    Based on Prozorro (Ukraine) analytics / Fazekas CRI methodology.
    """
    import time as _time
    import sqlite3
    cache_key = f"hhi_{year}_{sector_id}_{limit}"
    cached = _hhi_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _HHI_TTL:
        return cached["data"]

    with get_db() as conn:
        conn.row_factory = sqlite3.Row

        # Determine year to use
        if year is None:
            year = conn.execute("SELECT MAX(contract_year) FROM contracts WHERE contract_year IS NOT NULL").fetchone()[0]

        sector_filter = "AND i.sector_id = ?" if sector_id else ""
        params: List[Any] = [year, year, limit]
        if sector_id:
            params = [year, year, sector_id, limit]

        rows = conn.execute(f"""
            WITH vendor_shares AS (
                SELECT institution_id, vendor_id,
                       SUM(COALESCE(amount_mxn, 0)) AS vendor_value
                FROM contracts
                WHERE contract_year = ? AND institution_id IS NOT NULL
                  AND vendor_id IS NOT NULL AND amount_mxn > 0
                GROUP BY institution_id, vendor_id
            ),
            inst_totals AS (
                SELECT institution_id,
                       SUM(vendor_value) AS total_value,
                       COUNT(DISTINCT vendor_id) AS unique_vendors
                FROM vendor_shares GROUP BY institution_id
            ),
            hhi_calc AS (
                SELECT vs.institution_id,
                       ROUND(SUM((vs.vendor_value * 100.0 / it.total_value) *
                                 (vs.vendor_value * 100.0 / it.total_value)), 1) AS hhi,
                       it.unique_vendors,
                       it.total_value
                FROM vendor_shares vs
                JOIN inst_totals it ON vs.institution_id = it.institution_id
                WHERE it.total_value > 0
                GROUP BY vs.institution_id
            )
            SELECT h.institution_id, h.hhi, h.unique_vendors, h.total_value,
                   i.name AS institution_name, i.siglas, i.sector_id
            FROM hhi_calc h
            JOIN institutions i ON h.institution_id = i.id
            WHERE h.unique_vendors >= 3
            {sector_filter}
            ORDER BY h.hhi DESC
            LIMIT ?
        """, params).fetchall()

        def _concentration_level(hhi: float) -> str:
            if hhi >= 2500: return "high"
            if hhi >= 1000: return "medium"
            return "low"

        most_concentrated = [
            {
                "institution_id": r["institution_id"],
                "name": r["institution_name"],
                "siglas": r["siglas"],
                "sector_id": r["sector_id"],
                "hhi": float(r["hhi"]),
                "unique_vendors": int(r["unique_vendors"]),
                "total_value_mxn": float(r["total_value"]),
                "concentration_level": _concentration_level(float(r["hhi"])),
            }
            for r in rows
        ]

        # Also compute least concentrated (most diverse)
        params_asc: List[Any] = [year, year, limit]
        if sector_id:
            params_asc = [year, year, sector_id, limit]

        rows_asc = conn.execute(f"""
            WITH vendor_shares AS (
                SELECT institution_id, vendor_id,
                       SUM(COALESCE(amount_mxn, 0)) AS vendor_value
                FROM contracts
                WHERE contract_year = ? AND institution_id IS NOT NULL
                  AND vendor_id IS NOT NULL AND amount_mxn > 0
                GROUP BY institution_id, vendor_id
            ),
            inst_totals AS (
                SELECT institution_id,
                       SUM(vendor_value) AS total_value,
                       COUNT(DISTINCT vendor_id) AS unique_vendors
                FROM vendor_shares GROUP BY institution_id
            ),
            hhi_calc AS (
                SELECT vs.institution_id,
                       ROUND(SUM((vs.vendor_value * 100.0 / it.total_value) *
                                 (vs.vendor_value * 100.0 / it.total_value)), 1) AS hhi,
                       it.unique_vendors,
                       it.total_value
                FROM vendor_shares vs
                JOIN inst_totals it ON vs.institution_id = it.institution_id
                WHERE it.total_value > 0
                GROUP BY vs.institution_id
            )
            SELECT h.institution_id, h.hhi, h.unique_vendors, h.total_value,
                   i.name AS institution_name, i.siglas, i.sector_id
            FROM hhi_calc h
            JOIN institutions i ON h.institution_id = i.id
            WHERE h.unique_vendors >= 10
            {sector_filter}
            ORDER BY h.hhi ASC
            LIMIT ?
        """, params_asc).fetchall()

        least_concentrated = [
            {
                "institution_id": r["institution_id"],
                "name": r["institution_name"],
                "siglas": r["siglas"],
                "sector_id": r["sector_id"],
                "hhi": float(r["hhi"]),
                "unique_vendors": int(r["unique_vendors"]),
                "total_value_mxn": float(r["total_value"]),
                "concentration_level": _concentration_level(float(r["hhi"])),
            }
            for r in rows_asc
        ]

        result = {
            "year": year,
            "most_concentrated": most_concentrated,
            "least_concentrated": least_concentrated,
            "note": "HHI >2500 = highly concentrated (few dominant vendors). Based on Prozorro analytics / Fazekas CRI methodology.",
        }
        _hhi_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


@router.get("/{institution_id:int}/officials")
def get_institution_officials(
    institution_id: int = Path(..., description="Institution ID"),
    min_contracts: int = Query(10, ge=1, description="Minimum contracts per official"),
    limit: int = Query(50, ge=1, le=200, description="Max officials to return"),
):
    """
    Risk profiles for signing officials at this institution (2018+ COMPRANET data).

    Based on Coviello & Gagliarducci (2017) who found official tenure is the most
    predictive variable for single-bid rates in procurement.

    NOTE: Requires 'oficial_firmante' field populated via compute_official_profiles.py.
    Returns empty list if field is not available in the database.
    """
    import sqlite3
    with get_db() as conn:
        conn.row_factory = sqlite3.Row

        # Check if table has data for this institution
        officials = conn.execute("""
            SELECT official_name, total_contracts, first_contract_year, last_contract_year,
                   single_bid_pct, direct_award_pct, avg_risk_score,
                   vendor_diversity, hhi_vendors
            FROM official_risk_profiles
            WHERE institution_id = ?
              AND total_contracts >= ?
            ORDER BY avg_risk_score DESC
            LIMIT ?
        """, (institution_id, min_contracts, limit)).fetchall()

        has_oficial_firmante = "oficial_firmante" in [
            c[1] for c in conn.execute("PRAGMA table_info(contracts)").fetchall()
        ]

        def _interpret(r) -> str:
            parts = []
            if r["vendor_diversity"] <= 3:
                parts.append(f"contracted with only {r['vendor_diversity']} unique vendor(s)")
            if r["hhi_vendors"] and r["hhi_vendors"] > 2500:
                parts.append(f"highly concentrated vendors (HHI {r['hhi_vendors']:.0f})")
            if r["single_bid_pct"] > 50:
                parts.append(f"{r['single_bid_pct']:.0f}% single-bid procedures")
            if r["direct_award_pct"] > 80:
                parts.append(f"{r['direct_award_pct']:.0f}% direct awards")
            return ("This official " + ", ".join(parts) + ".") if parts else ""

        return {
            "institution_id": institution_id,
            "officials": [
                {
                    "official_name": r["official_name"],
                    "total_contracts": r["total_contracts"],
                    "first_contract_year": r["first_contract_year"],
                    "last_contract_year": r["last_contract_year"],
                    "single_bid_pct": round(r["single_bid_pct"] or 0, 1),
                    "direct_award_pct": round(r["direct_award_pct"] or 0, 1),
                    "avg_risk_score": round(r["avg_risk_score"] or 0, 4),
                    "vendor_diversity": r["vendor_diversity"],
                    "hhi_vendors": round(r["hhi_vendors"] or 0, 1),
                    "interpretation": _interpret(r),
                }
                for r in officials
            ],
            "note": (
                "Official-level analysis available for 2018+ contracts (COMPRANET Structure C/D). "
                + ("Data not yet populated — run compute_official_profiles.py to enable." if not has_oficial_firmante else "")
            ),
            "data_available": has_oficial_firmante and len(officials) > 0,
        }


# ---------------------------------------------------------------------------
# ASF (Auditoría Superior de la Federación) findings for an institution
# ---------------------------------------------------------------------------

# Simple 24h cache for ASF findings (changes at most annually)
_asf_inst_cache: Dict[str, Any] = {}
_asf_inst_cache_lock = threading.Lock()
_ASF_INST_CACHE_TTL = 86400  # 24 hours


@router.get("/{institution_id:int}/asf-findings", response_model=ASFInstitutionResponse)
def get_institution_asf_findings(institution_id: int = Path(..., ge=1)):
    """Get ASF audit findings for an institution by its ramo_id."""
    import sqlite3 as _sqlite3

    cache_key = f"asf_inst_{institution_id}"
    with _asf_inst_cache_lock:
        entry = _asf_inst_cache.get(cache_key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]

    with get_db() as conn:
        conn.row_factory = _sqlite3.Row
        # Get institution's ramo_id
        inst = conn.execute(
            "SELECT id, ramo_id FROM institutions WHERE id = ?",
            (institution_id,),
        ).fetchone()
        if not inst:
            raise HTTPException(status_code=404, detail="Institution not found")

        ramo_code = inst["ramo_id"]
        findings = []
        if ramo_code:
            rows = conn.execute(
                """
                SELECT audit_year, observations_total, amount_mxn,
                       observations_solved, finding_type
                FROM asf_institution_findings
                WHERE ramo_code = ?
                ORDER BY audit_year
                """,
                (ramo_code,),
            ).fetchall()

            for r in rows:
                obs_total = r["observations_total"] or 0
                obs_solved = r["observations_solved"] or 0
                recovery_rate = (obs_solved / obs_total) if obs_total > 0 else None
                findings.append(
                    ASFInstitutionFinding(
                        year=r["audit_year"],
                        observations_total=r["observations_total"],
                        amount_mxn=r["amount_mxn"],
                        observations_solved=r["observations_solved"],
                        finding_type=r["finding_type"],
                        recovery_rate=round(recovery_rate, 3) if recovery_rate is not None else None,
                    )
                )

        total_amount = sum(f.amount_mxn or 0 for f in findings)
        result = ASFInstitutionResponse(
            institution_id=institution_id,
            ramo_code=ramo_code,
            findings=findings,
            total_amount_mxn=total_amount,
            years_audited=len(findings),
        )

    with _asf_inst_cache_lock:
        _asf_inst_cache[cache_key] = {
            "value": result,
            "expires_at": datetime.now() + timedelta(seconds=_ASF_INST_CACHE_TTL),
        }
    return result
