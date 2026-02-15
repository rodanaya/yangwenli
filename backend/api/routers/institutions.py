"""API router for institution endpoints."""
import math
import logging
from fastapi import APIRouter, HTTPException, Query, Path
from typing import Optional

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
from ..services.institution_service import institution_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/institutions", tags=["institutions"])

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
        )


@router.get("/{institution_id:int}/risk-profile", response_model=InstitutionRiskProfile)
def get_institution_risk_profile(institution_id: int):
    """
    Get detailed risk profile for an institution.

    Returns risk breakdown by factors and contract risk distribution.
    """
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

        return InstitutionRiskProfile(
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
            avg_risk_score=avg_risk_row["avg_risk"] if avg_risk_row else None
        )


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

        return InstitutionTopListResponse(
            data=institutions,
            metric=by,
            total=len(institutions),
        )


@router.get("/hierarchy", response_model=InstitutionHierarchyResponse)
def get_institution_hierarchy():
    """
    Get institution hierarchy by type.

    Returns institutions grouped by type with aggregate statistics.
    """
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

        return InstitutionHierarchyResponse(
            data=hierarchy,
            total_institutions=total_institutions,
            total_types=len(hierarchy),
        )


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
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
):
    """
    Get vendors that an institution has contracted with.

    Returns vendors ranked by contract value with this institution.
    """
    with get_db() as conn:
        result = institution_service.get_institution_vendors(
            conn, institution_id, limit=limit,
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
