"""
Pydantic models for contract endpoints.
"""
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class ContractBase(BaseModel):
    """Base contract model with common fields."""
    id: int
    contract_number: Optional[str] = None
    title: Optional[str] = None
    amount_mxn: float = Field(description="Contract amount in MXN")
    contract_date: Optional[date] = None
    contract_year: Optional[int] = None

    # Classification
    sector_id: Optional[int] = None
    sector_name: Optional[str] = None

    # Risk
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    risk_level: Optional[str] = None

    # Flags
    is_direct_award: bool = False
    is_single_bid: bool = False


class ContractListItem(ContractBase):
    """Contract item for list responses."""
    vendor_name: Optional[str] = None
    institution_name: Optional[str] = None
    procedure_type: Optional[str] = None


class ContractDetail(ContractBase):
    """Full contract detail response."""
    # Identifiers
    procedure_number: Optional[str] = None
    expedient_code: Optional[str] = None

    # Related entities
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_rfc: Optional[str] = None
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None

    # Contract details
    description: Optional[str] = None
    procedure_type: Optional[str] = None
    procedure_type_normalized: Optional[str] = None
    contract_type: Optional[str] = None
    contract_type_normalized: Optional[str] = None
    procedure_character: Optional[str] = None
    participation_form: Optional[str] = None
    partida_especifica: Optional[str] = None

    # Dates
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    award_date: Optional[date] = None
    publication_date: Optional[date] = None

    # Amounts
    amount_original: Optional[float] = None
    currency: Optional[str] = None

    # Flags
    is_framework: bool = False
    is_consolidated: bool = False
    is_multiannual: bool = False
    is_high_value: bool = False
    is_year_end: bool = False

    # Risk details
    risk_factors: Optional[List[str]] = None
    risk_confidence: Optional[str] = None

    # Data quality
    data_quality_score: Optional[float] = None
    data_quality_grade: Optional[str] = None

    # Metadata
    source_structure: Optional[str] = None
    source_year: Optional[int] = None
    url: Optional[str] = None
    contract_status: Optional[str] = None


class ContractRiskBreakdown(BaseModel):
    """Risk score breakdown for a contract."""
    contract_id: int
    risk_score: float
    risk_level: str
    risk_confidence: Optional[str] = None
    factors: List[dict] = Field(default_factory=list)


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    per_page: int
    total: int
    total_pages: int


class ContractListResponse(BaseModel):
    """Paginated contract list response."""
    data: List[ContractListItem]
    pagination: PaginationMeta


class ContractFilterParams(BaseModel):
    """Filter parameters for contract queries."""
    sector_id: Optional[int] = None
    year: Optional[int] = None
    vendor_id: Optional[int] = None
    institution_id: Optional[int] = None
    risk_level: Optional[str] = None
    is_direct_award: Optional[bool] = None
    is_single_bid: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search: Optional[str] = None


class ContractStatistics(BaseModel):
    """Contract statistics summary."""
    total_contracts: int
    total_value_mxn: float
    avg_contract_value: float
    median_contract_value: Optional[float] = None

    # By risk level
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int

    # By procedure type
    direct_award_count: int
    direct_award_pct: float
    single_bid_count: int
    single_bid_pct: float

    # Time range
    min_year: int
    max_year: int
