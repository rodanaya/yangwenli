"""API router for vendor classification endpoints."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..dependencies import get_db
from ..models.vendor import (
    VendorClassificationResponse,
    VerifiedVendorResponse,
    VerifiedVendorListResponse,
)
from ..models.common import PaginationMeta

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("/{vendor_id}/classification", response_model=VendorClassificationResponse)
async def get_vendor_classification(vendor_id: int):
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
async def list_verified_vendors(
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
