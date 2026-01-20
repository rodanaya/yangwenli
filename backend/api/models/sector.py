"""
Pydantic models for sector endpoints.
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class SectorBase(BaseModel):
    """Base sector model."""
    id: int
    code: str
    name: str
    color: str


class SectorStatistics(BaseModel):
    """Statistics for a single sector."""
    sector_id: int
    sector_code: str
    sector_name: str
    color: str

    # Counts
    total_contracts: int
    total_value_mxn: float
    total_vendors: int
    total_institutions: int

    # Averages
    avg_contract_value: float
    avg_risk_score: float

    # Risk breakdown
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int
    high_risk_pct: float

    # Procedure breakdown
    direct_award_count: int
    direct_award_pct: float
    single_bid_count: int
    single_bid_pct: float


class SectorTrend(BaseModel):
    """Year-over-year trend for a sector."""
    year: int
    total_contracts: int
    total_value_mxn: float
    avg_risk_score: float
    direct_award_pct: float
    single_bid_pct: float


class SectorDetailResponse(SectorBase):
    """Detailed sector response with statistics."""
    statistics: SectorStatistics
    trends: List[SectorTrend] = Field(default_factory=list)


class SectorListResponse(BaseModel):
    """List of all sectors with basic stats."""
    data: List[SectorStatistics]
    total_contracts: int
    total_value_mxn: float


class SectorComparisonItem(BaseModel):
    """Sector comparison metrics."""
    sector_id: int
    sector_name: str
    color: str
    metric_value: float
    rank: int


class RiskDistribution(BaseModel):
    """Risk score distribution."""
    risk_level: str
    count: int
    percentage: float
    total_value_mxn: float


class YearOverYearChange(BaseModel):
    """Year-over-year comparison."""
    year: int
    contracts: int
    value_mxn: float
    avg_risk: float
    contracts_change_pct: Optional[float] = None
    value_change_pct: Optional[float] = None


class AnalysisOverview(BaseModel):
    """High-level analysis overview."""
    total_contracts: int
    total_value_mxn: float
    total_vendors: int
    total_institutions: int

    # Risk metrics
    avg_risk_score: float
    high_risk_contracts: int
    high_risk_value_mxn: float
    high_risk_pct: float

    # Procedure metrics
    direct_award_pct: float
    single_bid_pct: float

    # Data coverage
    years_covered: int
    min_year: int
    max_year: int

    # Sector breakdown
    sectors_count: int
    top_sector_by_value: str
    top_sector_by_risk: str


# Wrapper response models for list endpoints (standardized envelope)
class SectorTrendListResponse(BaseModel):
    """Wrapper for sector trends list."""
    data: List[SectorTrend]


class RiskDistributionListResponse(BaseModel):
    """Wrapper for risk distribution list."""
    data: List[RiskDistribution]


class YearOverYearListResponse(BaseModel):
    """Wrapper for year-over-year list."""
    data: List[YearOverYearChange]


class SectorComparisonListResponse(BaseModel):
    """Wrapper for sector comparison list."""
    data: List[SectorComparisonItem]


class AnomalyItem(BaseModel):
    """A detected anomaly in procurement data."""
    anomaly_type: str = Field(..., description="Type: price_outlier, timing_cluster, concentration, etc.")
    severity: str = Field(..., description="Severity: low, medium, high, critical")
    description: str
    affected_contracts: int
    affected_value_mxn: float
    details: dict = Field(default_factory=dict)


class AnomalyListResponse(BaseModel):
    """List of detected anomalies."""
    data: List[AnomalyItem]
    total: int
    filters_applied: dict = Field(default_factory=dict)
