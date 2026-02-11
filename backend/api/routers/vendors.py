"""
API router for vendor endpoints.

Provides vendor listing, details, contracts, institutions, risk profiles,
related vendors, and top vendors analysis.
"""
import math
import sqlite3
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Path
from collections import Counter

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
    VendorComparisonItem,
    VendorComparisonResponse,
)
from ..models.common import PaginationMeta
from ..models.contract import ContractListItem, ContractListResponse, PaginationMeta as ContractPaginationMeta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendors", tags=["vendors"])


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
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Build WHERE clause
            conditions = ["1=1"]
            params = []

            if search:
                conditions.append("(v.name LIKE ? OR v.name_normalized LIKE ? OR v.rfc LIKE ?)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])

            if has_rfc is not None:
                if has_rfc:
                    conditions.append("v.rfc IS NOT NULL AND v.rfc != ''")
                else:
                    conditions.append("(v.rfc IS NULL OR v.rfc = '')")

            where_clause = " AND ".join(conditions)

            # Sort field mapping - now using pre-computed vendor_stats table
            SORT_FIELD_MAPPING = {
                "total_contracts": "s.total_contracts",
                "total_value": "s.total_value_mxn",
                "total_value_mxn": "s.total_value_mxn",
                "avg_risk": "s.avg_risk_score",
                "avg_risk_score": "s.avg_risk_score",
                "direct_award_pct": "s.direct_award_pct",
                "high_risk_pct": "s.high_risk_pct",
                "single_bid_pct": "s.single_bid_pct",
                "pct_anomalous": "s.anomalous_pct",
                "name": "v.name",
            }
            sort_expr = SORT_FIELD_MAPPING.get(sort_by, "s.total_contracts")
            order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

            # HAVING conditions adapted for pre-computed stats
            stats_conditions = []
            stats_params = []

            if sector_id is not None:
                stats_conditions.append("s.primary_sector_id = ?")
                stats_params.append(sector_id)

            if risk_level is not None:
                risk_thresholds = {
                    "critical": ("s.avg_risk_score >= ?", [0.50]),
                    "high": ("s.avg_risk_score >= ? AND s.avg_risk_score < ?", [0.30, 0.50]),
                    "medium": ("s.avg_risk_score >= ? AND s.avg_risk_score < ?", [0.10, 0.30]),
                    "low": ("s.avg_risk_score < ?", [0.10]),
                }
                if risk_level in risk_thresholds:
                    cond, vals = risk_thresholds[risk_level]
                    stats_conditions.append(cond)
                    stats_params.extend(vals)

            if min_contracts is not None:
                stats_conditions.append("s.total_contracts >= ?")
                stats_params.append(min_contracts)

            if min_value is not None:
                stats_conditions.append("s.total_value_mxn >= ?")
                stats_params.append(min_value)

            stats_where = " AND ".join(stats_conditions) if stats_conditions else "1=1"

            # Count total — fast path when no vendor-table filters (search, has_rfc)
            if not search and has_rfc is None:
                # Count from vendor_stats alone (no JOIN needed)
                count_query = f"""
                    SELECT COUNT(*)
                    FROM vendor_stats s
                    WHERE {stats_where}
                """
                cursor.execute(count_query, stats_params)
            else:
                count_query = f"""
                    SELECT COUNT(*)
                    FROM vendors v
                    JOIN vendor_stats s ON v.id = s.vendor_id
                    WHERE {where_clause} AND {stats_where}
                """
                cursor.execute(count_query, params + stats_params)
            total = cursor.fetchone()[0]
            total_pages = math.ceil(total / per_page) if total > 0 else 1

            # Get paginated results using pre-computed vendor_stats
            offset = (page - 1) * per_page
            query = f"""
                SELECT
                    v.id,
                    v.name,
                    v.rfc,
                    v.name_normalized,
                    s.total_contracts,
                    s.total_value_mxn,
                    s.avg_risk_score,
                    s.high_risk_pct,
                    s.direct_award_pct,
                    s.single_bid_pct,
                    s.first_contract_year,
                    s.last_contract_year,
                    s.primary_sector_id,
                    s.anomalous_pct
                FROM vendors v
                JOIN vendor_stats s ON v.id = s.vendor_id
                WHERE {where_clause} AND {stats_where}
                ORDER BY {sort_expr} {order_direction} NULLS LAST
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + stats_params + [per_page, offset])
            rows = cursor.fetchall()

            vendors = [
                VendorListItem(
                    id=row["id"],
                    name=row["name"],
                    # RFC intentionally excluded from list for privacy (PII protection)
                    name_normalized=row["name_normalized"],
                    total_contracts=row["total_contracts"],
                    total_value_mxn=row["total_value_mxn"],
                    avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                    high_risk_pct=round(row["high_risk_pct"], 2),
                    direct_award_pct=round(row["direct_award_pct"], 2),
                    single_bid_pct=round(row["single_bid_pct"], 2) if row["single_bid_pct"] else 0,
                    first_contract_year=row["first_contract_year"],
                    last_contract_year=row["last_contract_year"],
                    primary_sector_id=row["primary_sector_id"],
                    pct_anomalous=round(row["anomalous_pct"], 2) if row["anomalous_pct"] else None,
                )
                for row in rows
            ]

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
                pagination=PaginationMeta.create(page, per_page, total),
                filters_applied=filters_applied
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in list_vendors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


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
    try:
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

            # Build placeholders for IN clause
            placeholders = ",".join("?" * len(vendor_ids))

            # Get vendor info with aggregated metrics in a single efficient query
            query = f"""
                SELECT
                    v.id,
                    v.name,
                    v.rfc,
                    COALESCE(metrics.total_contracts, 0) as total_contracts,
                    COALESCE(metrics.total_value, 0) as total_value,
                    metrics.avg_risk_score,
                    COALESCE(metrics.direct_award_count, 0) as direct_award_count,
                    COALESCE(metrics.high_risk_count, 0) as high_risk_count,
                    COALESCE(metrics.single_bid_count, 0) as single_bid_count,
                    metrics.first_year,
                    metrics.last_year,
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

            # Parameters: vendor_ids for subquery, MAX_CONTRACT_VALUE, vendor_ids for main query
            params = vendor_ids + [MAX_CONTRACT_VALUE] + vendor_ids
            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Build comparison items
            items = []
            for row in rows:
                total_contracts = row["total_contracts"] or 0
                total_value = row["total_value"] or 0

                # Calculate rates
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
            id_order = {id: i for i, id in enumerate(vendor_ids)}
            items.sort(key=lambda x: id_order.get(x.id, 999))

            return VendorComparisonResponse(
                data=items,
                total=len(items),
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in compare_vendors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")



@router.get("/top-all")
def get_top_vendors_all(
    limit: int = Query(5, ge=1, le=20, description="Number per category"),
):
    """
    Get top vendors by all metrics in a single request.
    Returns top by value, count, and risk in one call (3x fewer requests).
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            result = {}
            for metric, sort_field in [("value", "total_amount_mxn"), ("count", "total_contracts")]:
                cursor.execute(f"""
                    SELECT id, name, rfc, {sort_field} as metric_value,
                           total_contracts, COALESCE(total_amount_mxn, 0) as total_value_mxn
                    FROM vendors
                    ORDER BY {sort_field} DESC LIMIT ?
                """, (limit,))
                result[metric] = [
                    {
                        "rank": i + 1,
                        "vendor_id": row["id"],
                        "vendor_name": row["name"],
                        "rfc": row["rfc"],
                        "metric_value": row["metric_value"] or 0,
                        "total_contracts": row["total_contracts"],
                        "total_value_mxn": row["total_value_mxn"],
                        "avg_risk_score": None,
                    }
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
                {
                    "rank": i + 1,
                    "vendor_id": row["id"],
                    "vendor_name": row["name"],
                    "rfc": row["rfc"],
                    "metric_value": row["metric_value"] or 0,
                    "total_contracts": row["total_contracts"],
                    "total_value_mxn": row["total_value_mxn"],
                    "avg_risk_score": row["avg_risk_score"],
                }
                for i, row in enumerate(cursor.fetchall())
            ]

            return result
    except Exception as e:
        logger.error(f"Error in get_top_vendors_all: {e}")
        raise HTTPException(status_code=500, detail="Database error")


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
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Validate metric
            valid_metrics = {"value", "count", "risk"}
            if by not in valid_metrics:
                raise HTTPException(status_code=400, detail=f"Invalid metric '{by}'. Use: value, count, risk")

            # Fast path: use precomputed aggregates when no filters
            if sector_id is None and year is None:
                # Use precomputed fields in vendors table
                if by == "risk":
                    sort_field = "avg_risk_score"
                elif by == "value":
                    sort_field = "total_amount_mxn"
                else:
                    sort_field = "total_contracts"
                if by == "risk":
                    where_clause = "WHERE total_contracts >= 5 AND avg_risk_score IS NOT NULL"
                else:
                    where_clause = ""  # Index-only scan, top N by sort_field
                query = f"""
                    SELECT
                        id,
                        name,
                        rfc,
                        {sort_field} as metric_value,
                        total_contracts,
                        COALESCE(total_amount_mxn, 0) as total_value_mxn,
                        avg_risk_score
                    FROM vendors
                    {where_clause}
                    ORDER BY {sort_field} DESC
                    LIMIT ?
                """
                cursor.execute(query, (limit,))
                rows = cursor.fetchall()

                vendors = [
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
                    for i, row in enumerate(rows)
                ]

                return VendorTopListResponse(
                    data=vendors,
                    metric=by,
                    total=len(vendors),
                )

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

            # Determine sort expression based on metric
            metric_mapping = {
                "value": ("SUM(c.amount_mxn)", "DESC"),
                "count": ("COUNT(c.id)", "DESC"),
                "risk": ("AVG(c.risk_score)", "DESC"),
            }
            sort_expr, sort_dir = metric_mapping[by]

            query = f"""
                SELECT
                    v.id,
                    v.name,
                    v.rfc,
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
            """
            params.append(limit)
            cursor.execute(query, params)
            rows = cursor.fetchall()

            vendors = [
                VendorTopItem(
                    rank=i + 1,
                    vendor_id=row["id"],
                    vendor_name=row["name"],
                    rfc=row["rfc"],
                    metric_value=row["metric_value"] or 0,
                    total_contracts=row["total_contracts"],
                    total_value_mxn=row["total_value_mxn"],
                    avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                )
                for i, row in enumerate(rows)
            ]

            return VendorTopListResponse(
                data=vendors,
                metric=by,
                total=len(vendors),
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_top_vendors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{vendor_id}", response_model=VendorDetailResponse)
def get_vendor(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get detailed information for a specific vendor.

    Returns vendor details, classification, statistics, and metrics.
    Uses pre-computed vendor_stats for performance.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get vendor basic info with classification + pre-computed stats in ONE query
            cursor.execute("""
                SELECT
                    v.id, v.name, v.rfc, v.name_normalized, v.phonetic_code,
                    v.group_id,
                    vc.industry_id, vc.industry_code, vc.industry_confidence,
                    vi.name_es as industry_name, vi.sector_affinity,
                    vg.canonical_name as group_name,
                    COALESCE(vs.total_contracts, 0) as total_contracts,
                    COALESCE(vs.total_value_mxn, 0) as total_value_mxn,
                    vs.avg_risk_score,
                    COALESCE(vs.high_risk_pct, 0) as high_risk_pct,
                    COALESCE(vs.direct_award_pct, 0) as direct_award_pct,
                    COALESCE(vs.single_bid_pct, 0) as single_bid_pct,
                    vs.first_contract_year,
                    vs.last_contract_year,
                    COALESCE(vs.sector_count, 0) as sectors_count,
                    COALESCE(vs.institution_count, 0) as total_institutions,
                    vs.avg_mahalanobis,
                    vs.max_mahalanobis,
                    vs.anomalous_pct
                FROM vendors v
                LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
                LEFT JOIN vendor_industries vi ON vc.industry_id = vi.id
                LEFT JOIN vendor_groups vg ON v.group_id = vg.id
                LEFT JOIN vendor_stats vs ON v.id = vs.vendor_id
                WHERE v.id = ?
            """, (vendor_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            total_contracts = row["total_contracts"]
            total_value = row["total_value_mxn"]

            # Compute derived values from pre-computed stats
            avg_contract_value = (total_value / total_contracts) if total_contracts > 0 else None
            high_risk_count = round(row["high_risk_pct"] * total_contracts / 100) if total_contracts > 0 else 0
            direct_award_count = round(row["direct_award_pct"] * total_contracts / 100) if total_contracts > 0 else 0
            single_bid_count = round(row["single_bid_pct"] * total_contracts / 100) if total_contracts > 0 else 0

            # Get primary sector (small query, only groups vendor's contracts)
            cursor.execute("""
                SELECT c.sector_id, s.name_es as sector_name, COUNT(*) as cnt
                FROM contracts c
                LEFT JOIN sectors s ON c.sector_id = s.id
                WHERE c.vendor_id = ?
                GROUP BY c.sector_id
                ORDER BY cnt DESC
                LIMIT 1
            """, (vendor_id,))
            primary_sector = cursor.fetchone()

            # Years active from first/last year
            first_year = row["first_contract_year"]
            last_year = row["last_contract_year"]
            years_active = (last_year - first_year + 1) if first_year and last_year else 0

            return VendorDetailResponse(
                id=row["id"],
                name=row["name"],
                rfc=row["rfc"],
                name_normalized=row["name_normalized"],
                phonetic_code=row["phonetic_code"],
                industry_id=row["industry_id"],
                industry_code=row["industry_code"],
                industry_name=row["industry_name"],
                industry_confidence=row["industry_confidence"],
                sector_affinity=row["sector_affinity"],
                vendor_group_id=row["group_id"],
                group_name=row["group_name"],
                total_contracts=total_contracts,
                total_value_mxn=total_value,
                avg_contract_value=avg_contract_value,
                avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
                high_risk_count=high_risk_count,
                high_risk_pct=round(row["high_risk_pct"], 2),
                direct_award_count=direct_award_count,
                direct_award_pct=round(row["direct_award_pct"], 2),
                single_bid_count=single_bid_count,
                single_bid_pct=round(row["single_bid_pct"], 2),
                first_contract_year=first_year,
                last_contract_year=last_year,
                years_active=years_active,
                primary_sector_id=primary_sector["sector_id"] if primary_sector else None,
                primary_sector_name=primary_sector["sector_name"] if primary_sector else None,
                sectors_count=row["sectors_count"],
                total_institutions=row["total_institutions"],
                avg_mahalanobis=round(row["avg_mahalanobis"], 4) if row["avg_mahalanobis"] else None,
                max_mahalanobis=round(row["max_mahalanobis"], 4) if row["max_mahalanobis"] else None,
                pct_anomalous=round(row["anomalous_pct"], 2) if row["anomalous_pct"] else None,
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{vendor_id}/contracts", response_model=ContractListResponse)
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
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify vendor exists
            cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
            vendor = cursor.fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            # Build WHERE clause
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

            # Sort field mapping
            SORT_FIELD_MAPPING = {
                "contract_date": "c.contract_date",
                "amount_mxn": "c.amount_mxn",
                "risk_score": "c.risk_score",
            }
            sort_expr = SORT_FIELD_MAPPING.get(sort_by, "c.contract_date")
            order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

            # Count total
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
                    mahalanobis_distance=row["mahalanobis_distance"],
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

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_contracts: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{vendor_id}/institutions", response_model=VendorInstitutionListResponse)
def get_vendor_institutions(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
):
    """
    Get institutions that a vendor has contracted with.

    Returns institutions ranked by contract count with this vendor.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify vendor exists
            cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
            vendor = cursor.fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            query = """
                SELECT
                    i.id as institution_id,
                    i.name as institution_name,
                    i.institution_type,
                    COUNT(c.id) as contract_count,
                    COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
                    MIN(c.contract_year) as first_year,
                    MAX(c.contract_year) as last_year
                FROM contracts c
                JOIN institutions i ON c.institution_id = i.id
                WHERE c.vendor_id = ?
                AND COALESCE(c.amount_mxn, 0) <= ?
                GROUP BY i.id, i.name, i.institution_type
                ORDER BY contract_count DESC
                LIMIT ?
            """
            cursor.execute(query, (vendor_id, MAX_CONTRACT_VALUE, limit))
            rows = cursor.fetchall()

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
                for row in rows
            ]

            return VendorInstitutionListResponse(
                vendor_id=vendor_id,
                vendor_name=vendor["name"],
                data=institutions,
                total=len(institutions),
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_institutions: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{vendor_id}/risk-profile", response_model=VendorRiskProfile)
def get_vendor_risk_profile(
    vendor_id: int = Path(..., description="Vendor ID"),
):
    """
    Get detailed risk profile for a vendor.

    Returns risk distribution, common risk factors, and comparison to sector average.
    Optimized: uses vendor_stats for avg_risk/percentile, consolidates contract queries.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Q1: Get vendor info + pre-computed stats in one query
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

            # Q2: Single consolidated query for risk distribution + trend + factors
            cursor.execute("""
                SELECT risk_level, risk_score, risk_factors, contract_date
                FROM contracts
                WHERE vendor_id = ?
            """, (vendor_id,))

            contracts_by_level = {}
            value_by_level = {}
            factor_counts = Counter()
            scores_with_dates = []

            for row in cursor.fetchall():
                level = row["risk_level"] or "unknown"
                contracts_by_level[level] = contracts_by_level.get(level, 0) + 1
                # risk_factors processing
                rf = row["risk_factors"]
                if rf:
                    for f in rf.split(","):
                        f = f.strip()
                        if f:
                            factor_counts[f] += 1
                # collect for trend
                if row["risk_score"] is not None and row["contract_date"]:
                    scores_with_dates.append((row["contract_date"], row["risk_score"]))

            # Q3: Get value by risk level (needs SUM which is cheaper as separate aggregate)
            cursor.execute("""
                SELECT risk_level, COALESCE(SUM(amount_mxn), 0) as value
                FROM contracts
                WHERE vendor_id = ?
                GROUP BY risk_level
            """, (vendor_id,))
            for row in cursor.fetchall():
                level = row["risk_level"] or "unknown"
                value_by_level[level] = row["value"]

            # Compute risk trend from collected data (no window function needed)
            risk_trend = None
            if scores_with_dates:
                scores_with_dates.sort(key=lambda x: x[0])
                mid = len(scores_with_dates) // 2
                if mid > 0:
                    early_avg = sum(s for _, s in scores_with_dates[:mid]) / mid
                    late_avg = sum(s for _, s in scores_with_dates[mid:]) / len(scores_with_dates[mid:])
                    diff = late_avg - early_avg
                    if diff > 0.05:
                        risk_trend = "worsening"
                    elif diff < -0.05:
                        risk_trend = "improving"
                    else:
                        risk_trend = "stable"

            top_factors = [
                {"factor": f, "count": c, "percentage": round(c / max(total_contracts, 1) * 100, 1)}
                for f, c in factor_counts.most_common(5)
            ]

            # Q4: Sector comparison + percentile (both use pre-computed tables)
            risk_vs_sector = None
            risk_percentile = None
            primary_sector_id = vendor["primary_sector_id"]

            if avg_risk is not None:
                if primary_sector_id:
                    cursor.execute(
                        "SELECT avg_risk_score FROM sectors WHERE id = ?",
                        (primary_sector_id,)
                    )
                    sector_row = cursor.fetchone()
                    if sector_row and sector_row["avg_risk_score"]:
                        risk_vs_sector = round(avg_risk - sector_row["avg_risk_score"], 4)

                cursor.execute("""
                    SELECT
                        COUNT(*) as total_vendors,
                        SUM(CASE WHEN avg_risk_score < ? THEN 1 ELSE 0 END) as lower_count
                    FROM vendor_stats
                    WHERE total_contracts > 0
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

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_risk_profile: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{vendor_id}/related", response_model=VendorRelatedListResponse)
def get_vendor_related(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
):
    """
    Get vendors related to this vendor.

    Returns vendors in the same group, with similar names, or shared RFC roots.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify vendor exists
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
                    SELECT
                        v.id, v.name, v.rfc,
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
                        vendor_id=row["id"],
                        vendor_name=row["name"],
                        rfc=row["rfc"],
                        relationship_type="same_group",
                        similarity_score=1.0,
                        total_contracts=row["total_contracts"],
                        total_value_mxn=row["total_value_mxn"],
                    ))

            # 2. Shared RFC root (first 10 chars)
            if vendor["rfc"] and len(vendor["rfc"]) >= 10:
                rfc_root = vendor["rfc"][:10]
                cursor.execute("""
                    SELECT
                        v.id, v.name, v.rfc,
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
                            vendor_id=row["id"],
                            vendor_name=row["name"],
                            rfc=row["rfc"],
                            relationship_type="shared_rfc_root",
                            similarity_score=0.9,
                            total_contracts=row["total_contracts"],
                            total_value_mxn=row["total_value_mxn"],
                        ))

            # 3. Similar normalized names (if we have room for more)
            if len(related) < limit and vendor["name_normalized"]:
                # Use first 2 words for matching
                name_parts = vendor["name_normalized"].split()[:2]
                if name_parts:
                    name_pattern = " ".join(name_parts) + "%"
                    cursor.execute("""
                        SELECT
                            v.id, v.name, v.rfc,
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
                                vendor_id=row["id"],
                                vendor_name=row["name"],
                                rfc=row["rfc"],
                                relationship_type="similar_name",
                                similarity_score=0.7,
                                total_contracts=row["total_contracts"],
                                total_value_mxn=row["total_value_mxn"],
                            ))

            return VendorRelatedListResponse(
                vendor_id=vendor_id,
                vendor_name=vendor["name"],
                data=related[:limit],
                total=len(related[:limit]),
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_related: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# EXISTING CLASSIFICATION ENDPOINTS (preserved)
# =============================================================================

@router.get("/{vendor_id}/classification", response_model=VendorClassificationResponse)
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
