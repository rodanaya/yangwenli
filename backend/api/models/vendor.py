"""Pydantic models for vendor classification endpoints."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from .common import PaginationMeta


class VendorClassificationResponse(BaseModel):
    """Classification details for a single vendor."""

    vendor_id: int = Field(..., description="Vendor ID")
    vendor_name: str = Field(..., description="Vendor name")
    industry_id: Optional[int] = Field(None, description="Industry ID (1001-1035)")
    industry_code: Optional[str] = Field(None, description="Industry code")
    industry_name: Optional[str] = Field(None, description="Industry name (Spanish)")
    industry_confidence: Optional[float] = Field(
        None, description="Classification confidence (0.0-1.0)"
    )
    industry_source: Optional[str] = Field(
        None, description="Classification source (verified_online)"
    )
    sector_affinity: Optional[int] = Field(
        None, description="Expected sector based on industry"
    )

    class Config:
        from_attributes = True


class VendorListItem(BaseModel):
    """Vendor item for list responses.

    Note: RFC (tax ID) is intentionally excluded from list responses for privacy.
    RFC is only available in VendorDetailResponse when viewing a specific vendor.
    """

    id: int = Field(..., description="Vendor ID")
    name: str = Field(..., description="Vendor name")
    # RFC intentionally excluded from list for privacy - available in detail view
    name_normalized: Optional[str] = Field(None, description="Normalized name")
    total_contracts: int = Field(0, description="Total contract count")
    total_value_mxn: float = Field(0, description="Total contract value (MXN)")
    avg_risk_score: Optional[float] = Field(None, description="Average risk score")
    high_risk_pct: float = Field(0, description="Percentage of high/critical risk contracts")
    direct_award_pct: float = Field(0, description="Percentage of direct awards")
    single_bid_pct: float = Field(0, description="Percentage of single-bid contracts")
    first_contract_year: Optional[int] = Field(None, description="Year of first contract")
    last_contract_year: Optional[int] = Field(None, description="Year of most recent contract")
    primary_sector_id: Optional[int] = Field(None, description="Primary sector ID (1-12)")
    pct_anomalous: Optional[float] = Field(None, description="Percentage of anomalous contracts")

    class Config:
        from_attributes = True


class VendorDetailResponse(BaseModel):
    """Full vendor detail response."""

    id: int = Field(..., description="Vendor ID")
    name: str = Field(..., description="Vendor name")
    rfc: Optional[str] = Field(None, description="RFC (Mexican tax ID)")
    name_normalized: Optional[str] = Field(None, description="Normalized name")
    phonetic_code: Optional[str] = Field(None, description="Phonetic encoding")

    # Classification
    industry_id: Optional[int] = Field(None, description="Industry ID")
    industry_code: Optional[str] = Field(None, description="Industry code")
    industry_name: Optional[str] = Field(None, description="Industry name")
    industry_confidence: Optional[float] = Field(None, description="Classification confidence")
    sector_affinity: Optional[int] = Field(None, description="Expected sector")

    # Group membership
    vendor_group_id: Optional[int] = Field(None, description="Vendor group ID (if grouped)")
    group_name: Optional[str] = Field(None, description="Group name")

    # Contract statistics
    total_contracts: int = Field(0, description="Total contract count")
    total_value_mxn: float = Field(0, description="Total contract value (MXN)")
    avg_contract_value: Optional[float] = Field(None, description="Average contract value")

    # Risk metrics
    avg_risk_score: Optional[float] = Field(None, description="Average risk score")
    high_risk_count: int = Field(0, description="High/critical risk contract count")
    high_risk_pct: float = Field(0, description="Percentage of high/critical risk contracts")

    # Procedure metrics
    direct_award_count: int = Field(0, description="Direct award count")
    direct_award_pct: float = Field(0, description="Direct award percentage")
    single_bid_count: int = Field(0, description="Single bid count")
    single_bid_pct: float = Field(0, description="Single bid percentage")

    # Timeline
    first_contract_year: Optional[int] = Field(None, description="Year of first contract")
    last_contract_year: Optional[int] = Field(None, description="Year of most recent contract")
    years_active: int = Field(0, description="Years with contracts")

    # Sector distribution
    primary_sector_id: Optional[int] = Field(None, description="Primary sector ID")
    primary_sector_name: Optional[str] = Field(None, description="Primary sector name")
    sectors_count: int = Field(0, description="Number of sectors served")

    # Institution metrics
    total_institutions: int = Field(0, description="Number of institutions contracted")

    # Mahalanobis anomaly metrics
    avg_mahalanobis: Optional[float] = Field(None, description="Average Mahalanobis distance across contracts")
    max_mahalanobis: Optional[float] = Field(None, description="Maximum Mahalanobis distance across contracts")
    pct_anomalous: Optional[float] = Field(None, description="Percentage of contracts with Mahalanobis p-value < 0.05 (D² > 21.026 for k=12)")

    class Config:
        from_attributes = True


class VendorRiskProfile(BaseModel):
    """Risk profile breakdown for a vendor."""

    vendor_id: int
    vendor_name: str

    # Overall risk
    avg_risk_score: Optional[float] = Field(None, description="Average risk score across contracts")
    risk_trend: Optional[str] = Field(None, description="Risk trend: improving, stable, worsening")

    # Risk distribution
    contracts_by_risk_level: Dict[str, int] = Field(
        default_factory=dict,
        description="Contract counts by risk level"
    )
    value_by_risk_level: Dict[str, float] = Field(
        default_factory=dict,
        description="Contract value by risk level"
    )

    # Risk factors
    top_risk_factors: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Most common risk factors for this vendor"
    )

    # Comparison
    risk_vs_sector_avg: Optional[float] = Field(
        None,
        description="Risk score compared to sector average (positive = higher risk)"
    )
    risk_percentile: Optional[float] = Field(
        None,
        description="Vendor's risk percentile among all vendors"
    )


class VendorInstitutionItem(BaseModel):
    """Institution that a vendor has contracted with."""

    institution_id: int
    institution_name: str
    institution_type: Optional[str] = None
    contract_count: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = None
    first_year: Optional[int] = None
    last_year: Optional[int] = None


class VendorRelatedItem(BaseModel):
    """Related vendor (same group)."""

    vendor_id: int
    vendor_name: str
    rfc: Optional[str] = None
    relationship_type: str = Field(..., description="Relationship: same_group, similar_name, shared_rfc_root")
    similarity_score: Optional[float] = None
    total_contracts: int = 0
    total_value_mxn: float = 0


class VendorTopItem(BaseModel):
    """Vendor in top list."""

    rank: int
    vendor_id: int
    vendor_name: str
    rfc: Optional[str] = None
    metric_value: float = Field(..., description="The metric value used for ranking")
    total_contracts: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = None


class VendorListResponse(BaseModel):
    """Paginated list of vendors."""

    data: List[VendorListItem]
    pagination: PaginationMeta
    filters_applied: dict = Field(default_factory=dict, description="Filters that were applied")
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VendorInstitutionListResponse(BaseModel):
    """List of institutions for a vendor."""

    vendor_id: int
    vendor_name: str
    data: List[VendorInstitutionItem]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VendorRelatedListResponse(BaseModel):
    """List of related vendors."""

    vendor_id: int
    vendor_name: str
    data: List[VendorRelatedItem]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VendorTopListResponse(BaseModel):
    """List of top vendors."""

    data: List[VendorTopItem]
    metric: str = Field(..., description="Metric used for ranking: value, count, risk")
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VerifiedVendorResponse(BaseModel):
    """Verified vendor with classification details."""

    vendor_id: int = Field(..., description="Vendor ID")
    vendor_name: str = Field(..., description="Vendor name")
    rfc: Optional[str] = Field(None, description="RFC (Mexican tax ID)")
    industry_id: int = Field(..., description="Industry ID")
    industry_code: str = Field(..., description="Industry code")
    industry_name: str = Field(..., description="Industry name (Spanish)")
    industry_confidence: float = Field(..., description="Confidence score")
    sector_affinity: Optional[int] = Field(None, description="Expected sector")
    total_contracts: Optional[int] = Field(None, description="Total contracts")
    total_value: Optional[float] = Field(None, description="Total contract value")

    class Config:
        from_attributes = True


class VerifiedVendorListResponse(BaseModel):
    """Paginated list of verified vendors."""

    data: List[VerifiedVendorResponse]
    pagination: PaginationMeta
    filters_applied: dict = Field(
        default_factory=dict, description="Filters that were applied"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VendorComparisonItem(BaseModel):
    """Vendor data optimized for comparison view."""

    id: int
    name: str
    rfc: Optional[str] = Field(None, description="RFC (tax ID)")
    total_contracts: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = Field(None, description="Average risk score of contracts")
    direct_award_rate: Optional[float] = Field(None, description="Percentage of direct award contracts")
    direct_award_count: int = 0
    high_risk_count: int = Field(0, description="Count of high/critical risk contracts")
    high_risk_percentage: Optional[float] = Field(None, description="Percentage of high risk contracts")
    single_bid_rate: Optional[float] = Field(None, description="Percentage of single-bid contracts")
    avg_contract_value: Optional[float] = Field(None, description="Average contract value")
    first_year: Optional[int] = Field(None, description="Year of first contract")
    last_year: Optional[int] = Field(None, description="Year of last contract")
    institution_count: int = Field(0, description="Number of unique institutions")


class VendorComparisonResponse(BaseModel):
    """Response for vendor comparison."""

    data: List[VendorComparisonItem]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)
