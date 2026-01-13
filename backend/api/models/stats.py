"""Pydantic models for classification statistics endpoints."""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class IndustryCoverage(BaseModel):
    """Coverage statistics for a single industry."""

    industry_id: int
    industry_code: str
    industry_name: str
    vendor_count: int
    percentage_of_verified: float


class SectorCoverage(BaseModel):
    """Coverage statistics mapped to sectors."""

    sector_id: int
    sector_name: str
    verified_vendor_count: int
    industries_mapped: int


class ClassificationStatsResponse(BaseModel):
    """Comprehensive classification statistics."""

    # Overall coverage
    total_vendors: int = Field(..., description="Total vendors in database")
    verified_vendors: int = Field(..., description="Vendors with verified classification")
    unverified_vendors: int = Field(..., description="Vendors without classification")
    coverage_percentage: float = Field(..., description="Percentage of vendors classified")

    # Pattern statistics
    total_patterns: int = Field(5000, description="Total verified patterns")
    total_industries: int = Field(35, description="Number of industry categories")

    # Breakdown by industry
    top_industries: List[IndustryCoverage] = Field(
        default_factory=list, description="Top 10 industries by vendor count"
    )

    # Breakdown by sector
    sector_coverage: List[SectorCoverage] = Field(
        default_factory=list, description="Coverage mapped to sectors"
    )

    # Metadata
    last_updated: Optional[datetime] = Field(
        None, description="When classifications were last updated"
    )
    methodology_version: str = Field("1.0", description="Methodology version")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
