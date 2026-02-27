"""
API router for vendor endpoints.

Provides vendor listing, details, contracts, institutions, risk profiles,
related vendors, and top vendors analysis.

Thin router — business logic lives in VendorService.
"""
import json
import math
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, HTTPException, Query, Path
from collections import Counter
from pydantic import BaseModel

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..models.vendor import (
    VendorClassificationResponse,
    VerifiedVendorResponse,
    VerifiedVendorListResponse,
    VendorListItem,
    VendorListResponse,
    VendorDetailResponse,
    VendorRiskProfile,
    VendorInstitutionItem,
    VendorInstitutionListResponse,
    VendorRelatedItem,
    VendorRelatedListResponse,
    VendorTopItem,
    VendorTopListResponse,
    VendorTopAllResponse,
    VendorComparisonItem,
    VendorComparisonResponse,
    VendorTenureInstitution,
)
from ..models.asf import ASFCase
from ..models.common import PaginationMeta
from ..models.contract import ContractListItem, ContractListResponse, PaginationMeta as ContractPaginationMeta
from ..services.vendor_service import vendor_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendors", tags=["vendors"])

# Simple TTL cache for expensive aggregate endpoints
_vendor_cache: Dict[str, Dict[str, Any]] = {}
_vendor_cache_lock = threading.Lock()
_VENDOR_CACHE_TTL = 3600  # 1 hour


def _get_vendor_cache(key: str) -> Any:
    with _vendor_cache_lock:
        entry = _vendor_cache.get(key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]
        return None


def _set_vendor_cache(key: str, value: Any) -> None:
    with _vendor_cache_lock:
        _vendor_cache[key] = {"value": value, "expires_at": datetime.now() + timedelta(seconds=_VENDOR_CACHE_TTL)}


class ExternalFlagsResponse(BaseModel):
    vendor_id: int
    sfp_sanctions: List[Dict[str, Any]]
    rupc: Optional[Dict[str, Any]]
    asf_cases: List[Dict[str, Any]]
    sat_efos: Optional[Dict[str, Any]]
    match_method: Optional[str] = None  # 'rfc' | 'name_fuzzy'
    match_confidence: Optional[int] = None  # 0-100


class RiskTimelineEntry(BaseModel):
    year: int
    avg_risk_score: Optional[float]
    contract_count: int
    total_value: float


class VendorRiskTimelineResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    timeline: List[RiskTimelineEntry]


class VendorAISummaryResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    summary: str
    insights: List[str]
    total_contracts: int
    avg_risk_score: Optional[float]
    generated_by: str


# =============================================================================
# VENDOR LIST AND DETAIL ENDPOINTS
# =============================================================================

@router.get("", response_model=VendorListResponse)
def list_vendors(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, min_length=2, description="Search vendor name or RFC"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by primary sector"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: critical, high, medium, low"),
    min_contracts: Optional[int] = Query(None, ge=0, description="Minimum contract count"),
    min_value: Optional[float] = Query(None, ge=0, description="Minimum total contract value"),
    has_rfc: Optional[bool] = Query(None, description="Filter vendors with RFC"),
    sort_by: str = Query("total_contracts", description="Sort field: total_contracts, total_value, avg_risk, name, direct_award_pct, high_risk_pct"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    List vendors with pagination and filters.

    Returns vendors with aggregate statistics from their contracts.
    Supports filtering by search term, sector, contract count, and RFC presence.
    """
    with get_db() as conn:
        result = vendor_service.list_vendors(
            conn,
            page=page,
            per_page=per_page,
            search=search,
            sector_id=sector_id,
            risk_level=risk_level,
            min_contracts=min_contracts,
            min_value=min_value,
            has_rfc=has_rfc,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        vendors = [VendorListItem(**row) for row in result.data]

        # Track applied filters
        filters_applied = {}
        if search:
            filters_applied["search"] = search
        if sector_id is not None:
            filters_applied["sector_id"] = sector_id
        if risk_level is not None:
            filters_applied["risk_level"] = risk_level
        if min_contracts is not None:
            filters_applied["min_contracts"] = min_contracts
        if min_value is not None:
            filters_applied["min_value"] = min_value
        if has_rfc is not None:
            filters_applied["has_rfc"] = has_rfc

        return VendorListResponse(
            data=vendors,
            pagination=PaginationMeta(**result.pagination),
            filters_applied=filters_applied,
        )


@router.get("/compare", response_model=VendorComparisonResponse)
def compare_vendors(
    ids: str = Query(..., description="Comma-separated list of vendor IDs to compare"),
):
    """
    Compare multiple vendors side-by-side.

    Returns comprehensive metrics for each vendor including:
    - avg_risk_score: Average risk score of all contracts
    - direct_award_rate: Percentage of direct award contracts
    - high_risk_count: Number of high/critical risk contracts
    - single_bid_rate: Percentage of single-bid contracts

    Accepts up to 10 vendors for comparison.
    """
    # Parse vendor IDs
    try:
        vendor_ids = [int(id.strip()) for id in ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid vendor IDs. Must be comma-separated integers.")

    if not vendor_ids:
        raise HTTPException(status_code=400, detail="At least one vendor ID is required")
    if len(vendor_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 vendors can be compared at once")

    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join("?" * len(vendor_ids))

        query = f"""
            SELECT
                v.id, v.name, v.rfc,
                COALESCE(metrics.total_contracts, 0) as total_contracts,
                COALESCE(metrics.total_value, 0) as total_value,
                metrics.avg_risk_score,
                COALESCE(metrics.direct_award_count, 0) as direct_award_count,
                COALESCE(metrics.high_risk_count, 0) as high_risk_count,
                COALESCE(metrics.single_bid_count, 0) as single_bid_count,
                metrics.first_year, metrics.last_year,
                COALESCE(metrics.institution_count, 0) as institution_count
            FROM vendors v
            LEFT JOIN (
                SELECT
                    vendor_id,
                    COUNT(*) as total_contracts,
                    SUM(amount_mxn) as total_value,
                    AVG(risk_score) as avg_risk_score,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_count,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
                    MIN(contract_year) as first_year,
                    MAX(contract_year) as last_year,
                    COUNT(DISTINCT institution_id) as institution_count
                FROM contracts
                WHERE vendor_id IN ({placeholders})
                AND COALESCE(amount_mxn, 0) <= ?
                GROUP BY vendor_id
            ) metrics ON v.id = metrics.vendor_id
            WHERE v.id IN ({placeholders})
        """
        cursor.execute(query, vendor_ids + [MAX_CONTRACT_VALUE] + vendor_ids)

        items = []
        for row in cursor.fetchall():
            total_contracts = row["total_contracts"] or 0
            total_value = row["total_value"] or 0
            direct_award_rate = (row["direct_award_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            high_risk_pct = (row["high_risk_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            single_bid_rate = (row["single_bid_count"] / total_contracts * 100) if total_contracts > 0 else 0.0
            avg_contract_value = (total_value / total_contracts) if total_contracts > 0 else None

            items.append(VendorComparisonItem(
                id=row["id"],
                name=row["name"],
                rfc=row["rfc"],
                total_contracts=total_contracts,
                total_value_mxn=total_value,
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                direct_award_rate=round(direct_award_rate, 2),
                direct_award_count=row["direct_award_count"],
                high_risk_count=row["high_risk_count"],
                high_risk_percentage=round(high_risk_pct, 2),
                single_bid_rate=round(single_bid_rate, 2),
                avg_contract_value=round(avg_contract_value, 2) if avg_contract_value else None,
                first_year=row["first_year"],
                last_year=row["last_year"],
                institution_count=row["institution_count"],
            ))

        # Sort to match input order
        id_order = {vid: i for i, vid in enumerate(vendor_ids)}
        items.sort(key=lambda x: id_order.get(x.id, 999))

        return VendorComparisonResponse(data=items, total=len(items))


@router.get("/top-all", response_model=VendorTopAllResponse)
def get_top_vendors_all(
    limit: int = Query(5, ge=1, le=20, description="Number per category"),
):
    """
    Get top vendors by all metrics in a single request.
    Returns top by value, count, and risk in one call (3x fewer requests).
    """
    cache_key = f"top-all:{limit}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        result: dict[str, list] = {}
        # safe: sort_field values are hardcoded in the loop, not from user input
        for metric, sort_field in [("value", "total_amount_mxn"), ("count", "total_contracts")]:
            cursor.execute(f"""
                SELECT id, name, rfc, {sort_field} as metric_value,
                       total_contracts, COALESCE(total_amount_mxn, 0) as total_value_mxn
                FROM vendors
                ORDER BY {sort_field} DESC LIMIT ?
            """, (limit,))
            result[metric] = [
                VendorTopItem(
                    rank=i + 1,
                    vendor_id=row["id"],
                    vendor_name=row["name"],
                    rfc=row["rfc"],
                    metric_value=row["metric_value"] or 0,
                    total_contracts=row["total_contracts"],
                    total_value_mxn=row["total_value_mxn"],
                    avg_risk_score=None,
                )
                for i, row in enumerate(cursor.fetchall())
            ]

        # Risk: use pre-computed avg_risk_score on vendors table
        cursor.execute("""
            SELECT id, name, rfc,
                   avg_risk_score as metric_value,
                   total_contracts,
                   COALESCE(total_amount_mxn, 0) as total_value_mxn,
                   avg_risk_score
            FROM vendors
            WHERE total_contracts >= 5 AND avg_risk_score IS NOT NULL
            ORDER BY avg_risk_score DESC
            LIMIT ?
        """, (limit,))
        result["risk"] = [
            VendorTopItem(
                rank=i + 1,
                vendor_id=row["id"],
                vendor_name=row["name"],
                rfc=row["rfc"],
                metric_value=row["metric_value"] or 0,
                total_contracts=row["total_contracts"],
                total_value_mxn=row["total_value_mxn"],
                avg_risk_score=row["avg_risk_score"],
            )
            for i, row in enumerate(cursor.fetchall())
        ]

        response = VendorTopAllResponse(**result)
        _set_vendor_cache(cache_key, response)
        return response


@router.get("/top", response_model=VendorTopListResponse)
def get_top_vendors(
    by: str = Query("value", description="Ranking metric: value, count, risk"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
):
    """
    Get top vendors by value, contract count, or risk score.

    Returns vendors ranked by the specified metric with aggregate statistics.
    Uses precomputed aggregates when no filters applied for better performance.
    """
    valid_metrics = {"value", "count", "risk"}
    if by not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric '{by}'. Use: value, count, risk")

    cache_key = f"top:{by}:{limit}:{sector_id}:{year}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        valid_metrics = {"value", "count", "risk"}

        # Fast path: use precomputed aggregates when no filters
        if sector_id is None and year is None:
            if by == "risk":
                sort_field = "avg_risk_score"
                where_clause = "WHERE total_contracts >= 5 AND avg_risk_score IS NOT NULL"
            elif by == "value":
                sort_field = "total_amount_mxn"
                where_clause = ""
            else:
                sort_field = "total_contracts"
                where_clause = ""

            cursor.execute(f"""
                SELECT id, name, rfc, {sort_field} as metric_value,
                       total_contracts, COALESCE(total_amount_mxn, 0) as total_value_mxn,
                       avg_risk_score
                FROM vendors {where_clause}
                ORDER BY {sort_field} DESC LIMIT ?
            """, (limit,))

            vendors = [
                VendorTopItem(
                    rank=i + 1, vendor_id=row["id"], vendor_name=row["name"],
                    rfc=row["rfc"], metric_value=row["metric_value"] or 0,
                    total_contracts=row["total_contracts"],
                    total_value_mxn=row["total_value_mxn"],
                    avg_risk_score=row["avg_risk_score"],
                )
                for i, row in enumerate(cursor.fetchall())
            ]
            response = VendorTopListResponse(data=vendors, metric=by, total=len(vendors))
            _set_vendor_cache(cache_key, response)
            return response

        # Slow path: compute aggregates with filters
        conditions = ["COALESCE(c.amount_mxn, 0) <= ?"]
        params = [MAX_CONTRACT_VALUE]
        if sector_id is not None:
            conditions.append("c.sector_id = ?")
            params.append(sector_id)
        if year is not None:
            conditions.append("c.contract_year = ?")
            params.append(year)

        where_clause = " AND ".join(conditions)
        metric_mapping = {
            "value": ("SUM(c.amount_mxn)", "DESC"),
            "count": ("COUNT(c.id)", "DESC"),
            "risk": ("AVG(c.risk_score)", "DESC"),
        }
        sort_expr, sort_dir = metric_mapping[by]

        cursor.execute(f"""
            SELECT v.id, v.name, v.rfc,
                   {sort_expr} as metric_value,
                   COUNT(c.id) as total_contracts,
                   COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
                   COALESCE(AVG(c.risk_score), 0) as avg_risk_score
            FROM vendors v
            JOIN contracts c ON v.id = c.vendor_id
            WHERE {where_clause}
            GROUP BY v.id, v.name, v.rfc
            ORDER BY metric_value {sort_dir} NULLS LAST
            LIMIT ?
        """, params + [limit])

        vendors = [
            VendorTopItem(
                rank=i + 1, vendor_id=row["id"], vendor_name=row["name"],
                rfc=row["rfc"], metric_value=row["metric_value"] or 0,
                total_contracts=row["total_contracts"],
                total_value_mxn=row["total_value_mxn"],
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
            )
            for i, row in enumerate(cursor.fetchall())
        ]
        response = VendorTopListResponse(data=vendors, metric=by, total=len(vendors))
        _set_vendor_cache(cache_key, response)
        return response


@router.get("/{vendor_id:int}", response_model=VendorDetailResponse)
def get_vendor(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get detailed information for a specific vendor.

    Returns vendor details, classification, statistics, and metrics.
    Uses pre-computed vendor_stats for performance.
    """
    with get_db() as conn:
        detail = vendor_service.get_vendor_detail(conn, vendor_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        cursor = conn.cursor()

        # Supplement with classification, group, mahalanobis, and primary sector from precomputed stats
        cursor.execute("""
            SELECT
                v.phonetic_code, v.group_id,
                v.cobid_clustering_coeff, v.cobid_triangle_count,
                vc.industry_id, vc.industry_code, vc.industry_confidence,
                vi.name_es as industry_name, vi.sector_affinity,
                vg.canonical_name as group_name,
                COALESCE(vs.institution_count, 0) as total_institutions,
                vs.avg_mahalanobis, vs.max_mahalanobis,
                vs.primary_sector_id,
                s.name_es as primary_sector_name
            FROM vendors v
            LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
            LEFT JOIN vendor_industries vi ON vc.industry_id = vi.id
            LEFT JOIN vendor_groups vg ON v.group_id = vg.id
            LEFT JOIN vendor_stats vs ON v.id = vs.vendor_id
            LEFT JOIN sectors s ON vs.primary_sector_id = s.id
            WHERE v.id = ?
        """, (vendor_id,))
        extra = cursor.fetchone()

        total_contracts = detail.get("total_contracts", 0) or 0
        total_value = detail.get("total_value_mxn", 0) or 0
        high_risk_pct = detail.get("high_risk_pct", 0) or 0
        direct_award_pct = detail.get("direct_award_pct", 0) or 0
        single_bid_pct = detail.get("single_bid_pct", 0) or 0
        first_year = detail.get("first_contract_year")
        last_year = detail.get("last_contract_year")

        # Fetch name variants (QQW + other sources), excluding internal sentinel rows
        name_variants_rows = cursor.execute(
            """SELECT variant_name, source FROM vendor_name_variants
               WHERE vendor_id = ? AND source NOT IN ('qqw_miss', 'qqw_empty')
               ORDER BY source, variant_name""",
            (vendor_id,),
        ).fetchall()
        name_variants = [{"variant_name": r["variant_name"], "source": r["source"]}
                         for r in name_variants_rows]

        # Fetch top institution tenures (Coviello & Gagliarducci 2017)
        tenure_rows = cursor.execute("""
            SELECT vit.institution_id, i.name AS institution_name,
                   vit.first_contract_year, vit.last_contract_year,
                   vit.total_contracts, COALESCE(vit.total_amount_mxn, 0) AS total_amount_mxn
            FROM vendor_institution_tenure vit
            JOIN institutions i ON vit.institution_id = i.id
            WHERE vit.vendor_id = ?
            ORDER BY (vit.last_contract_year - vit.first_contract_year) DESC, vit.total_contracts DESC
            LIMIT 10
        """, (vendor_id,)).fetchall()
        top_institutions = [
            VendorTenureInstitution(
                institution_id=r["institution_id"],
                institution_name=r["institution_name"],
                first_contract_year=r["first_contract_year"],
                last_contract_year=r["last_contract_year"],
                tenure_years=(r["last_contract_year"] - r["first_contract_year"] + 1),
                total_contracts=r["total_contracts"],
                total_amount_mxn=r["total_amount_mxn"],
            )
            for r in tenure_rows
        ]

        return VendorDetailResponse(
            id=detail["id"],
            name=detail["name"],
            rfc=detail.get("rfc"),
            name_normalized=detail.get("name_normalized"),
            phonetic_code=extra["phonetic_code"] if extra else None,
            industry_id=extra["industry_id"] if extra else None,
            industry_code=extra["industry_code"] if extra else None,
            industry_name=extra["industry_name"] if extra else None,
            industry_confidence=extra["industry_confidence"] if extra else None,
            sector_affinity=extra["sector_affinity"] if extra else None,
            vendor_group_id=extra["group_id"] if extra else None,
            group_name=extra["group_name"] if extra else None,
            total_contracts=total_contracts,
            total_value_mxn=total_value,
            avg_contract_value=(total_value / total_contracts) if total_contracts > 0 else None,
            avg_risk_score=round(detail["avg_risk_score"], 4) if detail.get("avg_risk_score") else None,
            high_risk_count=round(high_risk_pct * total_contracts / 100) if total_contracts > 0 else 0,
            high_risk_pct=round(high_risk_pct, 2),
            direct_award_count=round(direct_award_pct * total_contracts / 100) if total_contracts > 0 else 0,
            direct_award_pct=round(direct_award_pct, 2),
            single_bid_count=round(single_bid_pct * total_contracts / 100) if total_contracts > 0 else 0,
            single_bid_pct=round(single_bid_pct, 2),
            first_contract_year=first_year,
            last_contract_year=last_year,
            years_active=(last_year - first_year + 1) if first_year and last_year else 0,
            primary_sector_id=extra["primary_sector_id"] if extra else None,
            primary_sector_name=extra["primary_sector_name"] if extra else None,
            sectors_count=detail.get("sector_count", 0) or 0,
            total_institutions=extra["total_institutions"] if extra else 0,
            avg_mahalanobis=round(extra["avg_mahalanobis"], 4) if extra and extra["avg_mahalanobis"] else None,
            max_mahalanobis=round(extra["max_mahalanobis"], 4) if extra and extra["max_mahalanobis"] else None,
            pct_anomalous=round(detail["anomalous_pct"], 2) if detail.get("anomalous_pct") else None,
            name_variants=name_variants,
            top_institutions=top_institutions,
            cobid_clustering_coeff=round(extra["cobid_clustering_coeff"], 6) if extra and extra["cobid_clustering_coeff"] else None,
            cobid_triangle_count=extra["cobid_triangle_count"] if extra else None,
        )


@router.get("/{vendor_id:int}/contracts", response_model=ContractListResponse)
def get_vendor_contracts(
    vendor_id: int = Path(..., description="Vendor ID"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    sort_by: str = Query("contract_date", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    Get contracts for a specific vendor with pagination.

    Note: VendorService.get_vendor_contracts provides basic pagination.
    This endpoint extends it with year/sector/risk_level filters and
    JOINed entity names needed by ContractListItem.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify vendor exists
        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        # safe: conditions list contains only hardcoded column names, values are parameterized
        conditions = ["c.vendor_id = ?", "COALESCE(c.amount_mxn, 0) <= ?"]
        params = [vendor_id, MAX_CONTRACT_VALUE]

        if year is not None:
            conditions.append("c.contract_year = ?")
            params.append(year)
        if sector_id is not None:
            conditions.append("c.sector_id = ?")
            params.append(sector_id)
        if risk_level is not None:
            conditions.append("c.risk_level = ?")
            params.append(risk_level.lower())

        where_clause = " AND ".join(conditions)

        # safe: sort_by is mapped through whitelist, never used as raw user input
        sort_map = {
            "contract_date": "c.contract_date",
            "amount_mxn": "c.amount_mxn",
            "risk_score": "c.risk_score",
        }
        sort_expr = sort_map.get(sort_by, "c.contract_date")
        order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Count
        cursor.execute(f"SELECT COUNT(*) FROM contracts c WHERE {where_clause}", params)
        total = cursor.fetchone()[0]

        # Paginated results with JOINed entity names
        offset = (page - 1) * per_page
        query = f"""
            SELECT
                c.id, c.contract_number, c.title, c.amount_mxn,
                c.contract_date, c.contract_year, c.sector_id,
                s.name_es as sector_name, c.risk_score, c.risk_level,
                c.is_direct_award, c.is_single_bid,
                v.name as vendor_name, i.name as institution_name,
                c.procedure_type, c.mahalanobis_distance
            FROM contracts c
            LEFT JOIN sectors s ON c.sector_id = s.id
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE {where_clause}
            ORDER BY {sort_expr} {order_direction} NULLS LAST
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, params + [per_page, offset])

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
                mahalanobis_distance=row["mahalanobis_distance"],
            )
            for row in cursor.fetchall()
        ]

        return ContractListResponse(
            data=contracts,
            pagination=ContractPaginationMeta(
                page=page,
                per_page=per_page,
                total=total,
                total_pages=math.ceil(total / per_page) if total > 0 else 1,
            ),
        )


@router.get("/{vendor_id:int}/institutions", response_model=VendorInstitutionListResponse)
def get_vendor_institutions(
    vendor_id: int = Path(..., description="Vendor ID"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    Get institutions that a vendor has contracted with.

    Returns institutions ranked by contract count with this vendor.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        # Count total
        cursor.execute("""
            SELECT COUNT(DISTINCT i.id)
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = ? AND COALESCE(c.amount_mxn, 0) <= ?
        """, (vendor_id, MAX_CONTRACT_VALUE))
        total = cursor.fetchone()[0]

        offset = (page - 1) * per_page
        cursor.execute("""
            SELECT
                i.id as institution_id, i.name as institution_name,
                i.institution_type,
                COUNT(c.id) as contract_count,
                COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
                COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
                MIN(c.contract_year) as first_year,
                MAX(c.contract_year) as last_year
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = ? AND COALESCE(c.amount_mxn, 0) <= ?
            GROUP BY i.id, i.name, i.institution_type
            ORDER BY contract_count DESC
            LIMIT ? OFFSET ?
        """, (vendor_id, MAX_CONTRACT_VALUE, per_page, offset))

        institutions = [
            VendorInstitutionItem(
                institution_id=row["institution_id"],
                institution_name=row["institution_name"],
                institution_type=row["institution_type"],
                contract_count=row["contract_count"],
                total_value_mxn=row["total_value_mxn"],
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                first_year=row["first_year"],
                last_year=row["last_year"],
            )
            for row in cursor.fetchall()
        ]

        return VendorInstitutionListResponse(
            vendor_id=vendor_id,
            vendor_name=vendor["name"],
            data=institutions,
            total=total,
        )


@router.get("/{vendor_id:int}/risk-profile", response_model=VendorRiskProfile)
def get_vendor_risk_profile(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get detailed risk profile for a vendor.

    Returns risk distribution, common risk factors, and comparison to sector average.
    Optimized: uses vendor_stats for avg_risk/percentile, consolidates contract queries.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Q1: Vendor info + pre-computed stats
        cursor.execute("""
            SELECT v.name, vs.avg_risk_score, vs.total_contracts,
                   vs.primary_sector_id
            FROM vendors v
            LEFT JOIN vendor_stats vs ON v.id = vs.vendor_id
            WHERE v.id = ?
        """, (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        avg_risk = vendor["avg_risk_score"]
        total_contracts = vendor["total_contracts"] or 0

        # Q2: Risk distribution + trend + factors in one pass
        cursor.execute("""
            SELECT risk_level, risk_score, risk_factors, contract_date
            FROM contracts WHERE vendor_id = ?
        """, (vendor_id,))

        contracts_by_level = {}
        factor_counts = Counter()
        scores_with_dates = []

        for row in cursor.fetchall():
            level = row["risk_level"] or "unknown"
            contracts_by_level[level] = contracts_by_level.get(level, 0) + 1
            rf = row["risk_factors"]
            if rf:
                for f in rf.split(","):
                    f = f.strip()
                    if f:
                        factor_counts[f] += 1
            if row["risk_score"] is not None and row["contract_date"]:
                scores_with_dates.append((row["contract_date"], row["risk_score"]))

        # Q3: Value by risk level
        cursor.execute("""
            SELECT risk_level, COALESCE(SUM(amount_mxn), 0) as value
            FROM contracts WHERE vendor_id = ?
            GROUP BY risk_level
        """, (vendor_id,))
        value_by_level = {
            (row["risk_level"] or "unknown"): row["value"]
            for row in cursor.fetchall()
        }

        # Compute risk trend
        risk_trend = None
        if scores_with_dates:
            scores_with_dates.sort(key=lambda x: x[0])
            mid = len(scores_with_dates) // 2
            if mid > 0:
                early_avg = sum(s for _, s in scores_with_dates[:mid]) / mid
                late_avg = sum(s for _, s in scores_with_dates[mid:]) / len(scores_with_dates[mid:])
                diff = late_avg - early_avg
                risk_trend = "worsening" if diff > 0.05 else ("improving" if diff < -0.05 else "stable")

        top_factors = [
            {"factor": f, "count": c, "percentage": round(c / max(total_contracts, 1) * 100, 1)}
            for f, c in factor_counts.most_common(5)
        ]

        # Q4: Sector comparison + percentile
        risk_vs_sector = None
        risk_percentile = None
        primary_sector_id = vendor["primary_sector_id"]

        if avg_risk is not None:
            if primary_sector_id:
                cursor.execute("SELECT avg_risk_score FROM sectors WHERE id = ?", (primary_sector_id,))
                sector_row = cursor.fetchone()
                if sector_row and sector_row["avg_risk_score"]:
                    risk_vs_sector = round(avg_risk - sector_row["avg_risk_score"], 4)

            cursor.execute("""
                SELECT COUNT(*) as total_vendors,
                       SUM(CASE WHEN avg_risk_score < ? THEN 1 ELSE 0 END) as lower_count
                FROM vendor_stats WHERE total_contracts > 0
            """, (avg_risk,))
            pct_row = cursor.fetchone()
            if pct_row["total_vendors"] > 0:
                risk_percentile = round(pct_row["lower_count"] / pct_row["total_vendors"] * 100, 1)

        return VendorRiskProfile(
            vendor_id=vendor_id,
            vendor_name=vendor["name"],
            avg_risk_score=round(avg_risk, 4) if avg_risk else None,
            risk_trend=risk_trend,
            contracts_by_risk_level=contracts_by_level,
            value_by_risk_level=value_by_level,
            top_risk_factors=top_factors,
            risk_vs_sector_avg=risk_vs_sector,
            risk_percentile=risk_percentile,
        )


@router.get("/{vendor_id:int}/related", response_model=VendorRelatedListResponse)
def get_vendor_related(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
):
    """
    Get vendors related to this vendor.

    Returns vendors in the same group, with similar names, or shared RFC roots.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, rfc, group_id, name_normalized
            FROM vendors WHERE id = ?
        """, (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        related = []

        # 1. Same group members
        if vendor["group_id"]:
            cursor.execute("""
                SELECT v.id, v.name, v.rfc,
                       COUNT(c.id) as total_contracts,
                       COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn
                FROM vendors v
                LEFT JOIN contracts c ON v.id = c.vendor_id
                    AND COALESCE(c.amount_mxn, 0) <= ?
                WHERE v.group_id = ? AND v.id != ?
                GROUP BY v.id, v.name, v.rfc
                LIMIT ?
            """, (MAX_CONTRACT_VALUE, vendor["group_id"], vendor_id, limit))

            for row in cursor.fetchall():
                related.append(VendorRelatedItem(
                    vendor_id=row["id"], vendor_name=row["name"], rfc=row["rfc"],
                    relationship_type="same_group", similarity_score=1.0,
                    total_contracts=row["total_contracts"],
                    total_value_mxn=row["total_value_mxn"],
                ))

        # 2. Shared RFC root (first 10 chars)
        if vendor["rfc"] and len(vendor["rfc"]) >= 10:
            rfc_root = vendor["rfc"][:10]
            cursor.execute("""
                SELECT v.id, v.name, v.rfc,
                       COUNT(c.id) as total_contracts,
                       COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn
                FROM vendors v
                LEFT JOIN contracts c ON v.id = c.vendor_id
                    AND COALESCE(c.amount_mxn, 0) <= ?
                WHERE v.rfc LIKE ? AND v.id != ?
                AND v.id NOT IN (SELECT id FROM vendors WHERE group_id = ?)
                GROUP BY v.id, v.name, v.rfc
                LIMIT ?
            """, (MAX_CONTRACT_VALUE, f"{rfc_root}%", vendor_id,
                  vendor["group_id"] or -1, limit - len(related)))

            for row in cursor.fetchall():
                if not any(r.vendor_id == row["id"] for r in related):
                    related.append(VendorRelatedItem(
                        vendor_id=row["id"], vendor_name=row["name"], rfc=row["rfc"],
                        relationship_type="shared_rfc_root", similarity_score=0.9,
                        total_contracts=row["total_contracts"],
                        total_value_mxn=row["total_value_mxn"],
                    ))

        # 3. Similar normalized names
        if len(related) < limit and vendor["name_normalized"]:
            name_parts = vendor["name_normalized"].split()[:2]
            if name_parts:
                name_pattern = " ".join(name_parts) + "%"
                cursor.execute("""
                    SELECT v.id, v.name, v.rfc,
                           COUNT(c.id) as total_contracts,
                           COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn
                    FROM vendors v
                    LEFT JOIN contracts c ON v.id = c.vendor_id
                        AND COALESCE(c.amount_mxn, 0) <= ?
                    WHERE v.name_normalized LIKE ? AND v.id != ?
                    GROUP BY v.id, v.name, v.rfc
                    LIMIT ?
                """, (MAX_CONTRACT_VALUE, name_pattern, vendor_id, limit - len(related)))

                for row in cursor.fetchall():
                    if not any(r.vendor_id == row["id"] for r in related):
                        related.append(VendorRelatedItem(
                            vendor_id=row["id"], vendor_name=row["name"], rfc=row["rfc"],
                            relationship_type="similar_name", similarity_score=0.7,
                            total_contracts=row["total_contracts"],
                            total_value_mxn=row["total_value_mxn"],
                        ))

        return VendorRelatedListResponse(
            vendor_id=vendor_id,
            vendor_name=vendor["name"],
            data=related[:limit],
            total=len(related[:limit]),
        )


# =============================================================================
# ASF AUDIT CASES
# =============================================================================

@router.get("/{vendor_id:int}/asf-cases", response_model=list[ASFCase])
def get_vendor_asf_cases(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Get ASF audit cases matching this vendor by RFC or name."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get vendor RFC and name
        cursor.execute("SELECT name, rfc FROM vendors WHERE id = ?", (vendor_id,))
        vendor_row = cursor.fetchone()
        if not vendor_row:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        vendor_name = vendor_row["name"]
        vendor_rfc = vendor_row["rfc"]

        conditions = []
        params = []

        if vendor_rfc:
            conditions.append("vendor_rfc = ?")
            params.append(vendor_rfc)

        # Fuzzy name match: use LIKE with first 20 chars
        if vendor_name:
            name_prefix = vendor_name[:20].strip()
            conditions.append("vendor_name LIKE ?")
            params.append(f"%{name_prefix}%")

        if not conditions:
            return []

        # safe: column names are hardcoded ('vendor_rfc', 'vendor_name'), not from user input
        where_clause = " OR ".join(conditions)
        rows = cursor.execute(
            f"SELECT * FROM asf_cases WHERE {where_clause} ORDER BY report_year DESC LIMIT 50",
            params,
        ).fetchall()

        return [ASFCase(**dict(row)) for row in rows]


# =============================================================================
# EXTERNAL FLAGS (SFP Sanctions + RUPC + ASF)
# =============================================================================

@router.get("/{vendor_id:int}/external-flags", response_model=ExternalFlagsResponse)
def get_vendor_external_flags(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Get external registry flags: SFP sanctions, RUPC grade, ASF cases."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT name, rfc FROM vendors WHERE id = ?", (vendor_id,))
        vendor_row = cursor.fetchone()
        if not vendor_row:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        vendor_name = vendor_row["name"]
        vendor_rfc = vendor_row["rfc"]

        # Determine match method based on RFC availability
        has_rfc = bool(vendor_rfc)
        result = {
            "vendor_id": vendor_id,
            "sfp_sanctions": [],
            "rupc": None,
            "asf_cases": [],
            "sat_efos": None,
            "match_method": "rfc" if has_rfc else "name_fuzzy",
            "match_confidence": 99 if has_rfc else 75,
        }

        # --- SFP Sanctions ---
        try:
            # safe: column names are hardcoded ('rfc', 'company_name'), not from user input
            conditions, params = [], []
            if vendor_rfc:
                conditions.append("rfc = ?")
                params.append(vendor_rfc)
            if vendor_name:
                conditions.append("company_name LIKE ?")
                params.append(f"%{vendor_name[:20].strip()}%")
            if conditions:
                rows = cursor.execute(
                    f"SELECT id, rfc, company_name, sanction_type, sanction_start, sanction_end, amount_mxn, authority FROM sfp_sanctions WHERE {' OR '.join(conditions)} LIMIT 20",
                    params,
                ).fetchall()
                result["sfp_sanctions"] = [dict(r) for r in rows]
        except Exception:
            pass  # Table may not exist yet

        # --- RUPC grade ---
        if vendor_rfc:
            try:
                row = cursor.execute(
                    "SELECT rfc, company_name, compliance_grade, status, registered_date, expiry_date FROM rupc_vendors WHERE rfc = ?",
                    (vendor_rfc,),
                ).fetchone()
                if row:
                    result["rupc"] = dict(row)
            except Exception:
                pass  # Table may not exist yet

        # --- SAT EFOS ghost company list ---
        if vendor_rfc:
            try:
                row = cursor.execute(
                    "SELECT rfc, company_name, stage, dof_date FROM sat_efos_vendors WHERE rfc = ?",
                    (vendor_rfc,),
                ).fetchone()
                if row:
                    result["sat_efos"] = dict(row)
            except Exception:
                pass  # Table may be empty

        # --- ASF cases (existing table) ---
        try:
            # safe: column names are hardcoded ('vendor_rfc', 'vendor_name'), not from user input
            conditions, params = [], []
            if vendor_rfc:
                conditions.append("vendor_rfc = ?")
                params.append(vendor_rfc)
            if vendor_name:
                conditions.append("vendor_name LIKE ?")
                params.append(f"%{vendor_name[:20].strip()}%")
            if conditions:
                rows = cursor.execute(
                    f"SELECT id, asf_report_id, entity_name, finding_type, amount_mxn, report_year, report_url, summary FROM asf_cases WHERE {' OR '.join(conditions)} ORDER BY report_year DESC LIMIT 20",
                    params,
                ).fetchall()
                result["asf_cases"] = [dict(r) for r in rows]
        except Exception:
            pass  # Table may be empty

        return result


# =============================================================================
# GROUND TRUTH STATUS
# =============================================================================

class GroundTruthCaseInfo(BaseModel):
    case_id: int
    case_name: str
    case_type: str
    role: Optional[str] = None
    evidence_strength: Optional[str] = None


class GroundTruthStatusResponse(BaseModel):
    is_known_bad: bool
    cases: List[GroundTruthCaseInfo] = []


@router.get("/{vendor_id:int}/ground-truth-status", response_model=GroundTruthStatusResponse)
def get_vendor_ground_truth_status(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Returns whether a vendor appears in documented corruption cases."""
    cache_key = f"gt_status:{vendor_id}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM vendors WHERE id = ?", (vendor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        rows = cursor.execute("""
            SELECT gtc.id as case_id, gtc.case_name, gtc.case_type,
                   gtv.role, gtv.evidence_strength
            FROM ground_truth_vendors gtv
            JOIN ground_truth_cases gtc ON gtv.case_id = gtc.id
            WHERE gtv.vendor_id = ?
        """, (vendor_id,)).fetchall()

        cases = [
            GroundTruthCaseInfo(
                case_id=r["case_id"],
                case_name=r["case_name"],
                case_type=r["case_type"],
                role=r["role"],
                evidence_strength=r["evidence_strength"],
            )
            for r in rows
        ]

        result = GroundTruthStatusResponse(is_known_bad=len(cases) > 0, cases=cases)
        _set_vendor_cache(cache_key, result)
        return result


# =============================================================================
# RISK WATERFALL
# =============================================================================

class RiskWaterfallItem(BaseModel):
    feature: str
    z_score: float
    coefficient: float
    contribution: float
    label_en: str


class RiskWaterfallResponse(BaseModel):
    vendor_id: int
    items: List[RiskWaterfallItem]
    total_contracts: int


_FEATURE_LABELS = {
    "single_bid": "Single Bidding",
    "direct_award": "Direct Award",
    "price_ratio": "Price Ratio",
    "vendor_concentration": "Vendor Concentration",
    "ad_period_days": "Ad Period Length",
    "year_end": "Year-End Timing",
    "same_day_count": "Same-Day Contracts",
    "network_member_count": "Network Membership",
    "co_bid_rate": "Co-Bidding Rate",
    "price_hyp_confidence": "Price Outlier Confidence",
    "industry_mismatch": "Industry Mismatch",
    "institution_risk": "Institution Risk",
    "price_volatility": "Price Volatility",
    "sector_spread": "Sector Spread",
    "win_rate": "Win Rate",
    "institution_diversity": "Institution Diversity",
}

_Z_FEATURE_COLS = [
    "z_single_bid", "z_direct_award", "z_price_ratio", "z_vendor_concentration",
    "z_ad_period_days", "z_year_end", "z_same_day_count", "z_network_member_count",
    "z_co_bid_rate", "z_price_hyp_confidence", "z_industry_mismatch", "z_institution_risk",
    "z_price_volatility", "z_sector_spread", "z_win_rate", "z_institution_diversity",
]


def _load_global_coefficients(conn) -> Dict[str, float]:
    """Load global model coefficients from model_calibration."""
    row = conn.execute(
        "SELECT coefficients FROM model_calibration WHERE sector_id IS NULL ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if not row:
        return {}
    return json.loads(row["coefficients"])


def _build_waterfall(conn, filter_col: str, filter_id: int) -> tuple:
    """Build risk waterfall items for a vendor or institution. Returns (items, total_contracts)."""
    avg_cols = ", ".join(f"AVG(czf.{col}) as {col}" for col in _Z_FEATURE_COLS)
    row = conn.execute(f"""
        SELECT {avg_cols}, COUNT(*) as cnt
        FROM contract_z_features czf
        JOIN contracts c ON czf.contract_id = c.id
        WHERE c.{filter_col} = ?
    """, (filter_id,)).fetchone()

    if not row or row["cnt"] == 0:
        return [], 0

    coefficients = _load_global_coefficients(conn)
    if not coefficients:
        return [], row["cnt"]

    items = []
    for z_col in _Z_FEATURE_COLS:
        feature_name = z_col[2:]  # strip "z_" prefix
        z_val = row[z_col] or 0.0
        coeff = coefficients.get(feature_name, 0.0)
        contribution = z_val * coeff
        items.append(RiskWaterfallItem(
            feature=feature_name,
            z_score=round(z_val, 4),
            coefficient=round(coeff, 4),
            contribution=round(contribution, 4),
            label_en=_FEATURE_LABELS.get(feature_name, feature_name),
        ))

    items.sort(key=lambda x: abs(x.contribution), reverse=True)
    return items, row["cnt"]


@router.get("/{vendor_id:int}/risk-waterfall", response_model=RiskWaterfallResponse)
def get_vendor_risk_waterfall(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Returns per-feature risk contributions for a vendor (average across contracts)."""
    cache_key = f"waterfall:{vendor_id}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        if not conn.execute("SELECT id FROM vendors WHERE id = ?", (vendor_id,)).fetchone():
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        items, total = _build_waterfall(conn, "vendor_id", vendor_id)

        result = RiskWaterfallResponse(vendor_id=vendor_id, items=items, total_contracts=total)
        _set_vendor_cache(cache_key, result)
        return result


# =============================================================================
# PEER COMPARISON
# =============================================================================

class PeerComparisonMetric(BaseModel):
    metric: str
    value: Optional[float]
    peer_median: Optional[float]
    percentile: Optional[float]
    label_en: str


class PeerComparisonResponse(BaseModel):
    vendor_id: int
    sector_id: Optional[int]
    metrics: List[PeerComparisonMetric]


@router.get("/{vendor_id:int}/peer-comparison", response_model=PeerComparisonResponse)
def get_vendor_peer_comparison(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Returns vendor metrics vs sector median and percentile."""
    cache_key = f"peer:{vendor_id}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        vs = cursor.execute("""
            SELECT vendor_id, total_contracts, total_value_mxn, avg_risk_score,
                   direct_award_pct, single_bid_pct, primary_sector_id
            FROM vendor_stats WHERE vendor_id = ?
        """, (vendor_id,)).fetchone()
        if not vs:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found or has no stats")

        sector_id = vs["primary_sector_id"]

        metric_defs = [
            ("avg_risk_score", "avg_risk_score", "Average Risk Score"),
            ("total_contracts", "total_contracts", "Total Contracts"),
            ("total_value_mxn", "total_value_mxn", "Total Contract Value (MXN)"),
            ("direct_award_pct", "direct_award_pct", "Direct Award Rate"),
            ("single_bid_pct", "single_bid_pct", "Single Bid Rate"),
        ]

        metrics = []
        for col, _, label in metric_defs:
            vendor_val = vs[col]

            # Get percentile within sector
            if sector_id:
                pct_row = cursor.execute(f"""
                    SELECT
                        (SELECT COUNT(*) FROM vendor_stats WHERE primary_sector_id = ? AND {col} <= ?) * 100.0 /
                        NULLIF((SELECT COUNT(*) FROM vendor_stats WHERE primary_sector_id = ?), 0) as pctile,
                        (SELECT {col} FROM vendor_stats WHERE primary_sector_id = ?
                         ORDER BY {col} LIMIT 1 OFFSET
                         (SELECT COUNT(*) / 2 FROM vendor_stats WHERE primary_sector_id = ?)) as median_val
                """, (sector_id, vendor_val or 0, sector_id, sector_id, sector_id)).fetchone()
            else:
                pct_row = cursor.execute(f"""
                    SELECT
                        (SELECT COUNT(*) FROM vendor_stats WHERE {col} <= ?) * 100.0 /
                        NULLIF((SELECT COUNT(*) FROM vendor_stats), 0) as pctile,
                        (SELECT {col} FROM vendor_stats
                         ORDER BY {col} LIMIT 1 OFFSET
                         (SELECT COUNT(*) / 2 FROM vendor_stats)) as median_val
                """, (vendor_val or 0,)).fetchone()

            metrics.append(PeerComparisonMetric(
                metric=col,
                value=round(vendor_val, 4) if vendor_val is not None else None,
                peer_median=round(pct_row["median_val"], 4) if pct_row and pct_row["median_val"] is not None else None,
                percentile=round(pct_row["pctile"], 1) if pct_row and pct_row["pctile"] is not None else None,
                label_en=label,
            ))

        result = PeerComparisonResponse(vendor_id=vendor_id, sector_id=sector_id, metrics=metrics)
        _set_vendor_cache(cache_key, result)
        return result


# =============================================================================
# LINKED SCANDALS
# =============================================================================

class LinkedScandalItem(BaseModel):
    case_id: int
    case_name: str
    case_type: str
    role: Optional[str] = None
    evidence_strength: Optional[str] = None
    contract_count: int = 0
    avg_risk_score: Optional[float] = None


class LinkedScandalsResponse(BaseModel):
    vendor_id: int
    scandals: List[LinkedScandalItem]


@router.get("/{vendor_id:int}/linked-scandals", response_model=LinkedScandalsResponse)
def get_vendor_linked_scandals(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """Returns documented scandals connected to this vendor with contract details."""
    cache_key = f"scandals:{vendor_id}"
    cached = _get_vendor_cache(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM vendors WHERE id = ?", (vendor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        rows = cursor.execute("""
            SELECT gtc.id as case_id, gtc.case_name, gtc.case_type,
                   gtv.role, gtv.evidence_strength
            FROM ground_truth_vendors gtv
            JOIN ground_truth_cases gtc ON gtv.case_id = gtc.id
            WHERE gtv.vendor_id = ?
        """, (vendor_id,)).fetchall()

        # Get contract counts and avg risk for this vendor
        stats_row = cursor.execute("""
            SELECT COUNT(*) as cnt, AVG(risk_score) as avg_rs
            FROM contracts WHERE vendor_id = ?
        """, (vendor_id,)).fetchone()

        scandals = [
            LinkedScandalItem(
                case_id=r["case_id"],
                case_name=r["case_name"],
                case_type=r["case_type"],
                role=r["role"],
                evidence_strength=r["evidence_strength"],
                contract_count=stats_row["cnt"] if stats_row else 0,
                avg_risk_score=round(stats_row["avg_rs"], 4) if stats_row and stats_row["avg_rs"] else None,
            )
            for r in rows
        ]

        result = LinkedScandalsResponse(vendor_id=vendor_id, scandals=scandals)
        _set_vendor_cache(cache_key, result)
        return result


# =============================================================================
# EXISTING CLASSIFICATION ENDPOINTS (preserved)
# =============================================================================

@router.get("/{vendor_id:int}/risk-timeline", response_model=VendorRiskTimelineResponse)
def get_vendor_risk_timeline(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get year-by-year average risk score for a vendor.

    Returns a timeline of average risk scores and contract counts per year.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify vendor exists
        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        cursor.execute("""
            SELECT
                contract_year as year,
                AVG(risk_score) as avg_risk_score,
                COUNT(*) as contract_count,
                SUM(amount_mxn) as total_value
            FROM contracts
            WHERE vendor_id = ?
              AND risk_score IS NOT NULL
              AND contract_year IS NOT NULL
            GROUP BY contract_year
            ORDER BY contract_year
        """, (vendor_id,))

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
            "vendor_id": vendor_id,
            "vendor_name": vendor["name"],
            "timeline": timeline,
        }


@router.get("/{vendor_id:int}/footprint")
def get_vendor_footprint(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(30, ge=5, le=50),
):
    """
    Vendor footprint: (sector, institution) pairs with contract stats.
    Used for bubble scatter showing geographic/sectoral spread vs concentration.
    """
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT id FROM vendors WHERE id = ?", (vendor_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        cur.execute("""
            SELECT
                c.sector_id,
                COALESCE(sec.name, 'otros') as sector_name,
                c.institution_id,
                COALESCE(i.name, 'Unknown') as institution_name,
                COUNT(*) as contract_count,
                SUM(c.amount_mxn) as total_value,
                AVG(c.risk_score) as avg_risk_score
            FROM contracts c
            LEFT JOIN sectors sec ON c.sector_id = sec.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = ?
              AND c.amount_mxn > 0
            GROUP BY c.sector_id, c.institution_id
            ORDER BY total_value DESC
            LIMIT ?
        """, (vendor_id, limit))
        rows = cur.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found or has no contracts")

    footprint = [
        {
            "sector_id": r["sector_id"],
            "sector_name": r["sector_name"],
            "institution_id": r["institution_id"],
            "institution_name": r["institution_name"],
            "contract_count": r["contract_count"],
            "total_value": r["total_value"],
            "avg_risk_score": r["avg_risk_score"],
        }
        for r in rows
    ]
    return {"vendor_id": vendor_id, "footprint": footprint}


@router.get("/{vendor_id:int}/top-factors")
def get_vendor_top_factors(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(5, ge=1, le=15),
):
    """
    Top risk factors (by frequency) across this vendor's contracts.
    Used by the Watchlist for delta attribution context.
    """
    from collections import Counter

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        cursor.execute("""
            SELECT risk_factors, COUNT(*) AS cnt
            FROM contracts
            WHERE vendor_id = ?
              AND risk_factors IS NOT NULL AND risk_factors != ''
            GROUP BY risk_factors
            ORDER BY cnt DESC
            LIMIT 2000
        """, (vendor_id,))

        factor_counter: Counter = Counter()
        total_contracts = 0
        for row in cursor.fetchall():
            for token in row["risk_factors"].split(","):
                token = token.strip()
                if not token:
                    continue
                base = token.split(":")[0]
                factor_counter[base] += row["cnt"]
            total_contracts += row["cnt"]

        factors = [
            {"factor": f, "count": c, "pct": round(c / total_contracts * 100, 1) if total_contracts > 0 else 0}
            for f, c in factor_counter.most_common(limit)
        ]
        return {"vendor_id": vendor_id, "total_contracts": total_contracts, "factors": factors}


@router.get("/{vendor_id:int}/ai-summary", response_model=VendorAISummaryResponse)
def get_vendor_ai_summary(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get AI-generated pattern analysis summary for a vendor.

    Returns template-generated insights based on the vendor's z-score features
    from the v5.0 risk model.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get vendor name and basic stats
        cursor.execute("""
            SELECT name, total_contracts, COALESCE(total_amount_mxn, 0) as total_value,
                   avg_risk_score
            FROM vendors WHERE id = ?
        """, (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

        # Get avg z-features for this vendor's contracts
        cursor.execute("""
            SELECT
                AVG(czf.z_price_volatility) as price_volatility,
                AVG(czf.z_win_rate) as win_rate,
                AVG(czf.z_institution_diversity) as institution_diversity,
                AVG(czf.z_vendor_concentration) as vendor_concentration,
                AVG(czf.z_industry_mismatch) as industry_mismatch,
                AVG(czf.z_same_day_count) as same_day_count,
                AVG(czf.z_direct_award) as direct_award,
                AVG(czf.z_single_bid) as single_bid,
                AVG(czf.z_sector_spread) as sector_spread
            FROM contract_z_features czf
            JOIN contracts c ON czf.contract_id = c.id
            WHERE c.vendor_id = ?
        """, (vendor_id,))
        z_features = cursor.fetchone()

        insights = []
        if z_features:
            pv = z_features["price_volatility"]
            if pv is not None and pv > 1.0:
                insights.append(f"Price volatility {pv:.2f}\u03c3 above sector average \u2014 a top predictor of corruption risk in the v5.0 model.")
            wr = z_features["win_rate"]
            if wr is not None and wr > 1.0:
                insights.append(f"Win rate {wr:.1f}\u03c3 above sector norm \u2014 abnormally high success rate in competitive procedures.")
            id_val = z_features["institution_diversity"]
            if id_val is not None and id_val < -0.5:
                insights.append("Serves few institutions \u2014 concentrated relationships increase risk per the v5.0 model.")
            vc = z_features["vendor_concentration"]
            if vc is not None and vc > 1.0:
                insights.append(f"Vendor concentration {vc:.2f}\u03c3 above sector norm \u2014 high market dominance in awarded contracts.")
            im = z_features["industry_mismatch"]
            if im is not None and im > 1.0:
                insights.append(f"Industry mismatch {im:.2f}\u03c3 above average \u2014 this vendor wins contracts outside its classified industry.")
            sdc = z_features["same_day_count"]
            if sdc is not None and sdc > 1.5:
                insights.append(f"Same-day contract count {sdc:.2f}\u03c3 above average \u2014 potential threshold splitting pattern.")
            ss = z_features["sector_spread"]
            if ss is not None and ss < -1.0:
                insights.append("Operates in very few sectors \u2014 low diversification increases risk concentration.")

        total_contracts = vendor["total_contracts"] or 0
        avg_risk = vendor["avg_risk_score"]

        summary_parts = []
        if insights:
            summary_parts.append(f"AI pattern analysis identified {len(insights)} risk indicator{'s' if len(insights) != 1 else ''}.")
        else:
            summary_parts.append("No significant risk indicators detected in the v5.0 feature analysis.")

        if avg_risk is not None:
            summary_parts.append(f"Average risk score: {avg_risk:.3f} across {total_contracts} contracts.")

        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor["name"],
            "summary": " ".join(summary_parts),
            "insights": insights,
            "total_contracts": total_contracts,
            "avg_risk_score": round(avg_risk, 4) if avg_risk else None,
            "generated_by": "v5.0 feature analysis",
        }


@router.get("/{vendor_id:int}/classification", response_model=VendorClassificationResponse)
def get_vendor_classification(vendor_id: int):
    """
    Get classification for a specific vendor.

    Returns industry classification if the vendor has been verified,
    or null fields if unclassified.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                v.id as vendor_id,
                v.name as vendor_name,
                vc.industry_id,
                vc.industry_code,
                vi.name_es as industry_name,
                vc.industry_confidence,
                vc.industry_source,
                vi.sector_affinity
            FROM vendors v
            LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
            LEFT JOIN vendor_industries vi ON vc.industry_id = vi.id
            WHERE v.id = ?
        """, (vendor_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Vendor {vendor_id} not found"
            )

        return VendorClassificationResponse(
            vendor_id=row["vendor_id"],
            vendor_name=row["vendor_name"],
            industry_id=row["industry_id"],
            industry_code=row["industry_code"],
            industry_name=row["industry_name"],
            industry_confidence=row["industry_confidence"],
            industry_source=row["industry_source"],
            sector_affinity=row["sector_affinity"]
        )


@router.get("/verified", response_model=VerifiedVendorListResponse)
def list_verified_vendors(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    industry_id: Optional[int] = Query(None, description="Filter by industry ID"),
    industry_code: Optional[str] = Query(None, description="Filter by industry code"),
    search: Optional[str] = Query(None, min_length=3, description="Search vendor name"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum confidence")
):
    """
    List verified vendors with pagination and filters.

    Only returns vendors with industry_source='verified_online'.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Build WHERE clause
        conditions = ["vc.industry_source = 'verified_online'"]
        params = []

        if industry_id:
            conditions.append("vc.industry_id = ?")
            params.append(industry_id)

        if industry_code:
            conditions.append("vc.industry_code = ?")
            params.append(industry_code)

        if search:
            conditions.append("v.name LIKE ?")
            params.append(f"%{search}%")

        if min_confidence:
            conditions.append("vc.industry_confidence >= ?")
            params.append(min_confidence)

        where_clause = " AND ".join(conditions)

        # Count total matching records
        count_sql = f"""
            SELECT COUNT(*) as count
            FROM vendor_classifications vc
            JOIN vendors v ON vc.vendor_id = v.id
            WHERE {where_clause}
        """
        cursor.execute(count_sql, params)
        total = cursor.fetchone()["count"]

        # Get paginated results
        offset = (page - 1) * per_page
        query_sql = f"""
            SELECT
                v.id as vendor_id,
                v.name as vendor_name,
                v.rfc,
                vc.industry_id,
                vc.industry_code,
                vi.name_es as industry_name,
                vc.industry_confidence,
                vi.sector_affinity,
                COALESCE(cs.total_contracts, 0) as total_contracts,
                COALESCE(cs.total_value, 0) as total_value
            FROM vendor_classifications vc
            JOIN vendors v ON vc.vendor_id = v.id
            JOIN vendor_industries vi ON vc.industry_id = vi.id
            LEFT JOIN (
                SELECT vendor_id, COUNT(*) as total_contracts, SUM(amount_mxn) as total_value
                FROM contracts
                GROUP BY vendor_id
            ) cs ON v.id = cs.vendor_id
            WHERE {where_clause}
            ORDER BY vc.industry_confidence DESC, v.name
            LIMIT ? OFFSET ?
        """
        cursor.execute(query_sql, params + [per_page, offset])
        rows = cursor.fetchall()

        vendors = [
            VerifiedVendorResponse(
                vendor_id=row["vendor_id"],
                vendor_name=row["vendor_name"],
                rfc=row["rfc"],
                industry_id=row["industry_id"],
                industry_code=row["industry_code"],
                industry_name=row["industry_name"],
                industry_confidence=row["industry_confidence"],
                sector_affinity=row["sector_affinity"],
                total_contracts=row["total_contracts"],
                total_value=row["total_value"]
            )
            for row in rows
        ]

        # Track applied filters
        filters_applied = {}
        if industry_id:
            filters_applied["industry_id"] = industry_id
        if industry_code:
            filters_applied["industry_code"] = industry_code
        if search:
            filters_applied["search"] = search
        if min_confidence:
            filters_applied["min_confidence"] = min_confidence

        return VerifiedVendorListResponse(
            data=vendors,
            pagination=PaginationMeta.create(page, per_page, total),
            filters_applied=filters_applied
        )
