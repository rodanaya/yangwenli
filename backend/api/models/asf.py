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


# ---------------------------------------------------------------------------
# Institution-level ASF findings (from asf_institution_findings table)
# ---------------------------------------------------------------------------

class ASFInstitutionFinding(BaseModel):
    """A single year's ASF audit findings for an institution."""

    year: int
    observations_total: Optional[int] = None
    amount_mxn: Optional[float] = None
    observations_solved: Optional[int] = None
    finding_type: Optional[str] = None
    recovery_rate: Optional[float] = None  # computed: observations_solved / observations_total


class ASFInstitutionResponse(BaseModel):
    """ASF findings for a specific institution over all audited years."""

    institution_id: int
    ramo_code: Optional[int] = None
    findings: List[ASFInstitutionFinding]
    total_amount_mxn: float
    years_audited: int


# ---------------------------------------------------------------------------
# Sector-level ASF findings (aggregated across ramo codes per sector)
# ---------------------------------------------------------------------------

class SectorASFFinding(BaseModel):
    """Aggregated ASF findings for a sector for a single year."""

    year: int
    total_observations: int
    total_amount_mxn: float
    institutions_audited: int
    observations_solved: int


class SectorASFResponse(BaseModel):
    """Aggregated ASF findings for all years for a sector."""

    sector_id: int
    sector_name: str
    findings: List[SectorASFFinding]
    total_amount_mxn: float
    years_audited: int


# ---------------------------------------------------------------------------
# Cross-reference: ASF cases aggregated by entity + matched to RUBLI scores
# ---------------------------------------------------------------------------

class ASFInstitutionSummaryItem(BaseModel):
    """ASF audit findings for one entity, with optional RUBLI risk score match."""

    entity_name: str
    finding_count: int
    total_amount_mxn: float
    earliest_year: Optional[int] = None
    latest_year: Optional[int] = None
    matched_risk_score: Optional[float] = None
    matched_institution_name: Optional[str] = None


class ASFInstitutionSummaryResponse(BaseModel):
    """All ASF entities with their RUBLI risk score cross-reference."""

    items: List[ASFInstitutionSummaryItem]
    total_findings: int
    total_amount_mxn: float
