"""API router for industry taxonomy endpoints."""
import threading
import time

from fastapi import APIRouter, HTTPException
from typing import Optional

from ..dependencies import get_db
from ..models.industry import IndustryResponse, IndustryListResponse

router = APIRouter(prefix="/industries", tags=["industries"])

# Cache for the full industry list (rarely changes)
_industry_cache: dict = {"data": None, "expires": 0}
_industry_cache_lock = threading.Lock()
INDUSTRY_CACHE_TTL = 3600  # 1 hour


@router.get("", response_model=IndustryListResponse)
def list_industries(include_stats: bool = True):
    """
    List all industry categories with optional statistics.

    Returns the 35-industry taxonomy (codes 1001-1035) with vendor counts
    and total contract values when include_stats=True.
    """
    # Return cached result if available (stats query is expensive)
    if include_stats:
        now = time.time()
        if _industry_cache["data"] and now < _industry_cache["expires"]:
            return _industry_cache["data"]

    with get_db() as conn:
        cursor = conn.cursor()

        if include_stats:
            cursor.execute("""
                SELECT
                    vi.id,
                    vi.code,
                    vi.name_es,
                    vi.name_en,
                    vi.sector_affinity,
                    vi.description,
                    COALESCE(ist.vendor_count, 0) as vendor_count,
                    COALESCE(ist.total_contract_value, 0) as total_contract_value
                FROM vendor_industries vi
                LEFT JOIN industry_stats ist ON vi.id = ist.industry_id
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

        cursor.execute("""
            SELECT COUNT(*) as count
            FROM vendor_classifications
            WHERE industry_source = 'verified_online'
        """)
        total_verified = cursor.fetchone()["count"]

        result = IndustryListResponse(
            data=industries,
            total_industries=len(industries),
            total_verified_vendors=total_verified
        )

        # Cache if stats were included
        if include_stats:
            with _industry_cache_lock:
                _industry_cache["data"] = result
                _industry_cache["expires"] = time.time() + INDUSTRY_CACHE_TTL

        return result


@router.get("/{industry_id}", response_model=IndustryResponse)
def get_industry(industry_id: int):
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
                COALESCE(ist.vendor_count, 0) as vendor_count,
                COALESCE(ist.total_contract_value, 0) as total_contract_value
            FROM vendor_industries vi
            LEFT JOIN industry_stats ist ON vi.id = ist.industry_id
            WHERE vi.id = ?
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
