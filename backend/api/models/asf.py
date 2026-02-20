"""Pydantic models for ASF (Auditoria Superior de la Federacion) endpoints."""
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class ASFCase(BaseModel):
    """A single ASF audit finding."""

    id: int
    asf_report_id: Optional[str] = None
    entity_name: str
    vendor_name: Optional[str] = None
    vendor_rfc: Optional[str] = None
    finding_type: str
    amount_mxn: Optional[float] = None
    report_year: Optional[int] = None
    report_url: Optional[str] = None
    summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ASFMatchesResponse(BaseModel):
    """ASF matches for an investigation case."""

    case_id: int
    matches: List[ASFCase]
    total: int
