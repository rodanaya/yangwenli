"""Pydantic models for industry taxonomy endpoints."""
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime


class IndustryResponse(BaseModel):
    """Single industry in the taxonomy."""

    id: int = Field(..., description="Industry ID (1001-1035)")
    code: str = Field(..., description="Industry code (e.g., 'farmaceutico')")
    name_es: str = Field(..., description="Spanish name")
    name_en: str = Field(..., description="English name")
    sector_affinity: Optional[int] = Field(
        None, description="Expected sector_id for this industry"
    )
    description: Optional[str] = Field(None, description="Industry description")
    vendor_count: int = Field(0, description="Number of verified vendors in this industry")
    total_contract_value: Optional[float] = Field(
        None, description="Total contract value for vendors in this industry"
    )

    model_config = ConfigDict(from_attributes=True)


class IndustryListResponse(BaseModel):
    """Response for listing all industries."""

    data: List[IndustryResponse]
    total_industries: int = Field(..., description="Total number of industries")
    total_verified_vendors: int = Field(
        ..., description="Total vendors with verified classifications"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)
