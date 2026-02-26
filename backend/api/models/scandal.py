"""
Pydantic models for procurement scandals (Case Library).
"""
from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel


class KeyActor(BaseModel):
    name: str
    role: str  # vendor | official | institution | journalist
    title: Optional[str] = None
    note: Optional[str] = None


class ScandalSource(BaseModel):
    title: str
    outlet: str
    date: Optional[str] = None
    type: str  # journalism | audit | legal | academic | official
    url: Optional[str] = None


class ScandalListItem(BaseModel):
    id: int
    name_en: str
    name_es: str
    slug: str
    fraud_type: str
    administration: str
    sector_id: Optional[int] = None
    sector_ids: List[int] = []
    contract_year_start: Optional[int] = None
    contract_year_end: Optional[int] = None
    discovery_year: Optional[int] = None
    amount_mxn_low: Optional[float] = None
    amount_mxn_high: Optional[float] = None
    severity: int
    legal_status: str
    compranet_visibility: str
    summary_en: str
    is_verified: int
    ground_truth_case_id: Optional[int] = None


class ScandalDetail(ScandalListItem):
    amount_note: Optional[str] = None
    legal_status_note: Optional[str] = None
    compranet_note: Optional[str] = None
    summary_es: Optional[str] = None
    key_actors: List[KeyActor] = []
    sources: List[ScandalSource] = []
    investigation_case_ids: List[int] = []


class ScandalStats(BaseModel):
    total_cases: int
    total_amount_mxn_low: float
    cases_by_fraud_type: List[dict]
    cases_by_administration: List[dict]
    cases_by_legal_status: List[dict]
    cases_by_severity: List[dict]
    gt_linked_count: int
    compranet_visible_count: int


class CaseLibraryParams(BaseModel):
    fraud_type: Optional[str] = None
    administration: Optional[str] = None
    sector_id: Optional[int] = None
    legal_status: Optional[str] = None
    severity_min: Optional[int] = None
    compranet_visibility: Optional[str] = None
    search: Optional[str] = None
