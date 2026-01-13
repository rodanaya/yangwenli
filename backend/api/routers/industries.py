"""API router for industry taxonomy endpoints."""
from fastapi import APIRouter, HTTPException
from typing import Optional

from ..dependencies import get_db
from ..models.industry import IndustryResponse, IndustryListResponse

router = APIRouter(prefix="/industries", tags=["industries"])


@router.get("", response_model=IndustryListResponse)
async def list_industries(include_stats: bool = True):
    """
    List all industry categories with optional statistics.

    Returns the 35-industry taxonomy (codes 1001-1035) with vendor counts
    and total contract values when include_stats=True.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get industry taxonomy with vendor counts
        if include_stats:
            cursor.execute("""
                SELECT
                    vi.id,
                    vi.code,
                    vi.name_es,
                    vi.name_en,
                    vi.sector_affinity,
                    vi.description,
                    COUNT(vc.vendor_id) as vendor_count,
                    COALESCE(SUM(vs.total_value), 0) as total_contract_value
                FROM vendor_industries vi
                LEFT JOIN vendor_classifications vc
                    ON vi.id = vc.industry_id
                    AND vc.industry_source = 'verified_online'
                LEFT JOIN (
                    SELECT vendor_id, SUM(amount_mxn) as total_value
                    FROM contracts
                    GROUP BY vendor_id
                ) vs ON vc.vendor_id = vs.vendor_id
                GROUP BY vi.id
                ORDER BY vi.id
            """)
        else:
            cursor.execute("""
                SELECT
                    id,
                    code,
                    name_es,
                    name_en,
                    sector_affinity,
                    description,
                    0 as vendor_count,
                    0 as total_contract_value
                FROM vendor_industries
                ORDER BY id
            """)

        rows = cursor.fetchall()

        industries = [
            IndustryResponse(
                id=row["id"],
                code=row["code"],
                name_es=row["name_es"],
                name_en=row["name_en"],
                sector_affinity=row["sector_affinity"],
                description=row["description"],
                vendor_count=row["vendor_count"],
                total_contract_value=row["total_contract_value"]
            )
            for row in rows
        ]

        # Get total verified vendors
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM vendor_classifications
            WHERE industry_source = 'verified_online'
        """)
        total_verified = cursor.fetchone()["count"]

        return IndustryListResponse(
            data=industries,
            total_industries=len(industries),
            total_verified_vendors=total_verified
        )


@router.get("/{industry_id}", response_model=IndustryResponse)
async def get_industry(industry_id: int):
    """
    Get details for a specific industry by ID.

    Industry IDs range from 1001 to 1035.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                vi.id,
                vi.code,
                vi.name_es,
                vi.name_en,
                vi.sector_affinity,
                vi.description,
                COUNT(vc.vendor_id) as vendor_count,
                COALESCE(SUM(vs.total_value), 0) as total_contract_value
            FROM vendor_industries vi
            LEFT JOIN vendor_classifications vc
                ON vi.id = vc.industry_id
                AND vc.industry_source = 'verified_online'
            LEFT JOIN (
                SELECT vendor_id, SUM(amount_mxn) as total_value
                FROM contracts
                GROUP BY vendor_id
            ) vs ON vc.vendor_id = vs.vendor_id
            WHERE vi.id = ?
            GROUP BY vi.id
        """, (industry_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Industry {industry_id} not found"
            )

        return IndustryResponse(
            id=row["id"],
            code=row["code"],
            name_es=row["name_es"],
            name_en=row["name_en"],
            sector_affinity=row["sector_affinity"],
            description=row["description"],
            vendor_count=row["vendor_count"],
            total_contract_value=row["total_contract_value"]
        )
