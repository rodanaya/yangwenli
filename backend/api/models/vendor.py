"""Pydantic models for vendor classification endpoints."""
from pydantic import BaseModel, Field
from typing import List, Optional
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
