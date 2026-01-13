"""API router for classification statistics endpoints."""
from fastapi import APIRouter

from ..dependencies import get_db
from ..models.stats import (
    ClassificationStatsResponse,
    IndustryCoverage,
    SectorCoverage,
)

router = APIRouter(prefix="/stats", tags=["statistics"])

# Sector name mapping
SECTOR_NAMES = {
    1: "salud",
    2: "educacion",
    3: "infraestructura",
    4: "energia",
    5: "defensa",
    6: "tecnologia",
    7: "hacienda",
    8: "gobernacion",
    9: "agricultura",
    10: "ambiente",
    11: "trabajo",
    12: "otros",
}


@router.get("/classifications", response_model=ClassificationStatsResponse)
async def get_classification_stats():
    """
    Get comprehensive classification statistics.

    Returns coverage metrics, breakdown by industry, and sector mappings.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Total vendors
        cursor.execute("SELECT COUNT(*) as count FROM vendors")
        total_vendors = cursor.fetchone()["count"]

        # Verified vendors
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM vendor_classifications
            WHERE industry_source = 'verified_online'
        """)
        verified_vendors = cursor.fetchone()["count"]

        # Unverified (have classification record but not verified)
        unverified_vendors = total_vendors - verified_vendors

        # Coverage percentage
        coverage_percentage = (verified_vendors / total_vendors * 100) if total_vendors > 0 else 0

        # Top industries by vendor count
        cursor.execute("""
            SELECT
                vi.id as industry_id,
                vi.code as industry_code,
                vi.name_es as industry_name,
                COUNT(vc.vendor_id) as vendor_count
            FROM vendor_industries vi
            LEFT JOIN vendor_classifications vc
                ON vi.id = vc.industry_id
                AND vc.industry_source = 'verified_online'
            GROUP BY vi.id
            HAVING vendor_count > 0
            ORDER BY vendor_count DESC
            LIMIT 10
        """)

        top_industries = []
        for row in cursor.fetchall():
            pct = (row["vendor_count"] / verified_vendors * 100) if verified_vendors > 0 else 0
            top_industries.append(
                IndustryCoverage(
                    industry_id=row["industry_id"],
                    industry_code=row["industry_code"],
                    industry_name=row["industry_name"],
                    vendor_count=row["vendor_count"],
                    percentage_of_verified=round(pct, 2)
                )
            )

        # Sector coverage (vendors mapped to sectors via industry affinity)
        cursor.execute("""
            SELECT
                vi.sector_affinity as sector_id,
                COUNT(DISTINCT vc.vendor_id) as verified_vendor_count,
                COUNT(DISTINCT vi.id) as industries_mapped
            FROM vendor_industries vi
            JOIN vendor_classifications vc
                ON vi.id = vc.industry_id
                AND vc.industry_source = 'verified_online'
            WHERE vi.sector_affinity IS NOT NULL
            GROUP BY vi.sector_affinity
            ORDER BY vi.sector_affinity
        """)

        sector_coverage = [
            SectorCoverage(
                sector_id=row["sector_id"],
                sector_name=SECTOR_NAMES.get(row["sector_id"], "unknown"),
                verified_vendor_count=row["verified_vendor_count"],
                industries_mapped=row["industries_mapped"]
            )
            for row in cursor.fetchall()
        ]

        return ClassificationStatsResponse(
            total_vendors=total_vendors,
            verified_vendors=verified_vendors,
            unverified_vendors=unverified_vendors,
            coverage_percentage=round(coverage_percentage, 2),
            total_patterns=5000,
            total_industries=35,
            top_industries=top_industries,
            sector_coverage=sector_coverage,
            methodology_version="1.0"
        )
