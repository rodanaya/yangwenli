"""Pydantic models for institution endpoints."""
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
from .common import PaginationMeta


class InstitutionTypeResponse(BaseModel):
    """Institution type definition from lookup table."""

    id: int = Field(..., description="Type ID")
    code: str = Field(..., description="Type code (e.g., 'municipal', 'federal_secretariat')")
    name_es: str = Field(..., description="Name in Spanish")
    name_en: Optional[str] = Field(None, description="Name in English")
    description: Optional[str] = Field(None, description="Description")
    is_legally_decentralized: bool = Field(..., description="Legal status as organismo descentralizado")
    default_sector: Optional[str] = Field(None, description="Default sector code")
    risk_baseline: float = Field(..., description="Risk baseline (0.10-0.35)")

    model_config = ConfigDict(from_attributes=True)


class SizeTierResponse(BaseModel):
    """Size tier definition from lookup table."""

    id: int = Field(..., description="Tier ID")
    code: str = Field(..., description="Tier code (mega, large, medium, small, micro)")
    name_es: str = Field(..., description="Name in Spanish")
    name_en: Optional[str] = Field(None, description="Name in English")
    min_contracts: int = Field(..., description="Minimum contracts for this tier")
    max_contracts: Optional[int] = Field(None, description="Maximum contracts (-1 = unlimited)")
    risk_adjustment: float = Field(..., description="Risk adjustment applied to base score")

    model_config = ConfigDict(from_attributes=True)


class AutonomyLevelResponse(BaseModel):
    """Autonomy level definition from lookup table."""

    id: int = Field(..., description="Level ID")
    code: str = Field(..., description="Level code")
    name_es: str = Field(..., description="Name in Spanish")
    name_en: Optional[str] = Field(None, description="Name in English")
    description: Optional[str] = Field(None, description="Description")
    risk_baseline: float = Field(..., description="Risk baseline for this autonomy level")

    model_config = ConfigDict(from_attributes=True)


class InstitutionResponse(BaseModel):
    """Institution details."""

    id: int = Field(..., description="Institution ID")
    name: str = Field(..., description="Institution name")
    name_normalized: Optional[str] = Field(None, description="Normalized name")
    siglas: Optional[str] = Field(None, description="Acronym/abbreviation")
    institution_type: Optional[str] = Field(None, description="Institution type code")
    institution_type_id: Optional[int] = Field(None, description="Institution type ID")
    size_tier: Optional[str] = Field(None, description="Size tier code")
    autonomy_level: Optional[str] = Field(None, description="Autonomy level code")
    is_legally_decentralized: Optional[bool] = Field(None, description="Legal decentralized status")
    sector_id: Optional[int] = Field(None, description="Sector ID")
    state_code: Optional[str] = Field(None, description="State code (for state/municipal)")
    geographic_scope: Optional[str] = Field(None, description="Geographic scope")
    total_contracts: Optional[int] = Field(None, description="Total contracts")
    total_amount_mxn: Optional[float] = Field(None, description="Total contract value (MXN)")
    avg_risk_score: Optional[float] = Field(None, description="Average risk score")
    high_risk_pct: Optional[float] = Field(None, description="Percentage of high/critical risk contracts (0-100)")
    direct_award_pct: Optional[float] = Field(None, description="Percentage of direct awards (0-100)")
    single_bid_pct: Optional[float] = Field(None, description="Percentage of single-bid contracts (0-100)")
    vendor_count: Optional[int] = Field(None, description="Number of unique vendors")
    classification_confidence: Optional[float] = Field(None, description="Classification confidence")
    data_quality_grade: Optional[str] = Field(None, description="Data quality grade (A-F)")

    model_config = ConfigDict(from_attributes=True)


class InstitutionDetailResponse(InstitutionResponse):
    """Extended institution details with risk profile."""

    risk_baseline: Optional[float] = Field(None, description="Institution risk baseline")
    size_risk_adjustment: Optional[float] = Field(None, description="Size tier risk adjustment")
    autonomy_risk_baseline: Optional[float] = Field(None, description="Autonomy level risk baseline")
    avg_contract_value: Optional[float] = Field(None, description="Average contract value")
    high_risk_contract_count: Optional[int] = Field(None, description="Count of high/critical risk contracts")
    high_risk_percentage: Optional[float] = Field(None, description="Percentage of contracts that are high risk")
    avg_risk_score: Optional[float] = Field(None, description="Average risk score of contracts")
    direct_award_rate: Optional[float] = Field(None, description="Percentage of direct award contracts")
    direct_award_count: Optional[int] = Field(None, description="Count of direct award contracts")


class InstitutionRiskProfile(BaseModel):
    """Risk profile for an institution."""

    institution_id: int
    institution_name: str
    institution_type: Optional[str]
    risk_baseline: float = Field(..., description="Base risk from institution type")
    size_tier: Optional[str]
    size_risk_adjustment: float = Field(0.0, description="Risk adjustment from size tier")
    autonomy_level: Optional[str]
    autonomy_risk_baseline: float = Field(0.25, description="Risk baseline from autonomy level")
    effective_risk: float = Field(..., description="Combined effective risk score")

    # Contract statistics
    total_contracts: int
    total_value: float
    contracts_by_risk_level: dict = Field(
        default_factory=dict,
        description="Contract counts by risk level"
    )
    avg_risk_score: Optional[float] = Field(None, description="Average risk score of contracts")


class InstitutionListResponse(BaseModel):
    """Paginated list of institutions."""

    data: List[InstitutionResponse]
    pagination: PaginationMeta
    filters_applied: dict = Field(
        default_factory=dict, description="Filters that were applied"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionTypeListResponse(BaseModel):
    """List of institution types."""

    data: List[InstitutionTypeResponse]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SizeTierListResponse(BaseModel):
    """List of size tiers."""

    data: List[SizeTierResponse]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class AutonomyLevelListResponse(BaseModel):
    """List of autonomy levels."""

    data: List[AutonomyLevelResponse]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionVendorItem(BaseModel):
    """Vendor that an institution has contracted with."""

    vendor_id: int
    vendor_name: str
    rfc: Optional[str] = None
    contract_count: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = None
    first_year: Optional[int] = None
    last_year: Optional[int] = None


class InstitutionVendorListResponse(BaseModel):
    """List of vendors for an institution."""

    institution_id: int
    institution_name: str
    data: List[InstitutionVendorItem]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionTopItem(BaseModel):
    """Institution in top list."""

    rank: int
    institution_id: int
    institution_name: str
    institution_type: Optional[str] = None
    metric_value: float = Field(..., description="The metric value used for ranking")
    total_contracts: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = None


class InstitutionTopListResponse(BaseModel):
    """List of top institutions."""

    data: List[InstitutionTopItem]
    metric: str = Field(..., description="Metric used for ranking: spending, contracts, risk")
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionHierarchyItem(BaseModel):
    """Institution hierarchy node."""

    institution_type: str
    institution_type_name: Optional[str] = None
    count: int = 0
    total_contracts: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = None
    children: List["InstitutionHierarchyItem"] = []


class InstitutionHierarchyResponse(BaseModel):
    """Institution hierarchy tree."""

    data: List[InstitutionHierarchyItem]
    total_institutions: int
    total_types: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionSearchResult(BaseModel):
    """Search result item."""

    id: int
    name: str
    siglas: Optional[str] = None
    institution_type: Optional[str] = None
    sector_id: Optional[int] = None
    total_contracts: Optional[int] = None
    match_type: str = Field(..., description="Match type: name, siglas, normalized")


class InstitutionSearchResponse(BaseModel):
    """Search results."""

    data: List[InstitutionSearchResult]
    query: str
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class InstitutionComparisonItem(BaseModel):
    """Institution data optimized for comparison view."""

    id: int
    name: str
    siglas: Optional[str] = None
    institution_type: Optional[str] = None
    sector_id: Optional[int] = None
    total_contracts: int = 0
    total_value_mxn: float = 0
    avg_risk_score: Optional[float] = Field(None, description="Average risk score of contracts")
    direct_award_rate: Optional[float] = Field(None, description="Percentage of direct award contracts")
    direct_award_count: int = 0
    high_risk_count: int = Field(0, description="Count of high/critical risk contracts")
    high_risk_percentage: Optional[float] = Field(None, description="Percentage of high risk contracts")
    single_bid_rate: Optional[float] = Field(None, description="Percentage of single-bid contracts")
    avg_contract_value: Optional[float] = Field(None, description="Average contract value")


class InstitutionComparisonResponse(BaseModel):
    """Response for institution comparison."""

    data: List[InstitutionComparisonItem]
    total: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)
