"""
API router for investigation report endpoints.

Provides comprehensive reports for journalists and investigators:
- Vendor Deep-Dive: Complete vendor profile with risk analysis
- Institution Spotlight: Institution procurement patterns and red flags
- Sector Summary: Sector-level corruption indicators
- Thematic Investigations: COVID, elections, year-end, threshold splitting
"""

import sqlite3
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


# =============================================================================
# ENUMS AND RESPONSE MODELS
# =============================================================================

class ThemeType(str, Enum):
    """Thematic investigation types."""
    covid = "covid"
    election = "election"
    year_end = "year_end"
    threshold_splitting = "threshold_splitting"


class RiskFactorBreakdown(BaseModel):
    """Risk factor breakdown."""
    factor: str
    count: int
    percentage: float


class ContractSummary(BaseModel):
    """Summary of contracts."""
    total_count: int
    total_value_mxn: float
    avg_value_mxn: float
    avg_risk_score: float
    by_risk_level: Dict[str, int]
    by_year: Dict[int, int]


class PriceHypothesisSummary(BaseModel):
    """Price hypothesis summary."""
    total_hypotheses: int
    by_type: Dict[str, int]
    avg_confidence: float
    high_confidence_count: int


class TopVendor(BaseModel):
    """Top vendor item."""
    vendor_id: int
    name: str
    rfc: Optional[str]
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float


class TopContract(BaseModel):
    """Notable contract."""
    contract_id: int
    title: Optional[str]
    amount_mxn: float
    vendor_name: str
    contract_date: Optional[str]
    risk_score: float
    risk_factors: Optional[str]


# =============================================================================
# VENDOR DEEP-DIVE REPORT
# =============================================================================

class VendorReportProfile(BaseModel):
    """Vendor profile information."""
    vendor_id: int
    name: str
    rfc: Optional[str]
    name_normalized: Optional[str]
    first_contract_date: Optional[str]
    last_contract_date: Optional[str]
    years_active: int
    size_stratification: Optional[str]
    is_verified: bool


class VendorReportContracts(BaseModel):
    """Vendor contract statistics."""
    total_count: int
    total_value_mxn: float
    avg_value_mxn: float
    by_sector: Dict[str, int]
    by_year: Dict[int, int]
    by_procedure_type: Dict[str, int]


class VendorReportRisk(BaseModel):
    """Vendor risk profile."""
    avg_risk_score: float
    max_risk_score: float
    by_risk_level: Dict[str, int]
    risk_factors_breakdown: List[RiskFactorBreakdown]
    single_bid_count: int
    single_bid_pct: float
    direct_award_count: int
    direct_award_pct: float


class VendorReportHypotheses(BaseModel):
    """Vendor price hypotheses."""
    total_count: int
    by_type: Dict[str, int]
    avg_confidence: float
    top_hypotheses: List[Dict[str, Any]]


class VendorReportNetwork(BaseModel):
    """Vendor network connections."""
    institution_count: int
    top_institutions: List[Dict[str, Any]]
    co_bidder_count: int
    sector_concentration: Dict[str, float]


class VendorReportRedFlags(BaseModel):
    """Red flags summary."""
    flags: List[str]
    severity: str  # low, medium, high, critical


class VendorReport(BaseModel):
    """Complete vendor deep-dive report."""
    report_type: str = "vendor_deep_dive"
    generated_at: str
    profile: VendorReportProfile
    contracts: VendorReportContracts
    risk: VendorReportRisk
    price_hypotheses: VendorReportHypotheses
    network: VendorReportNetwork
    red_flags: VendorReportRedFlags


@router.get("/vendor/{vendor_id}", response_model=VendorReport)
async def get_vendor_report(
    vendor_id: int = Path(..., ge=1, description="Vendor ID"),
):
    """
    Generate comprehensive vendor deep-dive report.

    Returns complete vendor profile with:
    - Basic information and verification status
    - Contract history by sector, year, and procedure type
    - Risk profile with factor breakdown
    - Price hypotheses from outlier detection
    - Network connections (institutions, co-bidders)
    - Red flags summary
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get vendor profile
            cursor.execute("""
                SELECT id, name, rfc, name_normalized, size_stratification,
                       is_verified_sat, first_contract_date, last_contract_date,
                       total_contracts, total_amount_mxn
                FROM vendors WHERE id = ?
            """, (vendor_id,))
            vendor = cursor.fetchone()

            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            # Calculate years active
            first_date = vendor['first_contract_date']
            last_date = vendor['last_contract_date']
            years_active = 0
            if first_date and last_date:
                try:
                    first_year = int(first_date[:4]) if first_date else 0
                    last_year = int(last_date[:4]) if last_date else 0
                    years_active = max(1, last_year - first_year + 1)
                except (ValueError, TypeError, IndexError):
                    years_active = 1

            profile = VendorReportProfile(
                vendor_id=vendor['id'],
                name=vendor['name'],
                rfc=vendor['rfc'],
                name_normalized=vendor['name_normalized'],
                first_contract_date=first_date,
                last_contract_date=last_date,
                years_active=years_active,
                size_stratification=vendor['size_stratification'],
                is_verified=bool(vendor['is_verified_sat'])
            )

            # Get contract statistics
            cursor.execute("""
                SELECT
                    COUNT(*) as total_count,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(amount_mxn), 0) as avg_value
                FROM contracts WHERE vendor_id = ?
            """, (vendor_id,))
            contract_stats = cursor.fetchone()

            # By sector
            cursor.execute("""
                SELECT s.name_es, COUNT(*) as cnt
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                WHERE c.vendor_id = ?
                GROUP BY s.id ORDER BY cnt DESC
            """, (vendor_id,))
            by_sector = {row['name_es']: row['cnt'] for row in cursor.fetchall()}

            # By year
            cursor.execute("""
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts WHERE vendor_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year ORDER BY contract_year
            """, (vendor_id,))
            by_year = {row['contract_year']: row['cnt'] for row in cursor.fetchall()}

            # By procedure type
            cursor.execute("""
                SELECT
                    CASE
                        WHEN is_direct_award = 1 THEN 'Adjudicacion Directa'
                        WHEN procedure_type_normalized = 'licitacion' THEN 'Licitacion Publica'
                        WHEN procedure_type_normalized = 'invitacion' THEN 'Invitacion'
                        ELSE 'Otro'
                    END as proc_type,
                    COUNT(*) as cnt
                FROM contracts WHERE vendor_id = ?
                GROUP BY proc_type ORDER BY cnt DESC
            """, (vendor_id,))
            by_procedure = {row['proc_type']: row['cnt'] for row in cursor.fetchall()}

            contracts = VendorReportContracts(
                total_count=contract_stats['total_count'],
                total_value_mxn=contract_stats['total_value'],
                avg_value_mxn=contract_stats['avg_value'],
                by_sector=by_sector,
                by_year=by_year,
                by_procedure_type=by_procedure
            )

            # Get risk profile
            cursor.execute("""
                SELECT
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    COALESCE(MAX(risk_score), 0) as max_risk,
                    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award,
                    COUNT(*) as total
                FROM contracts WHERE vendor_id = ?
            """, (vendor_id,))
            risk_stats = cursor.fetchone()

            # Risk factors breakdown
            cursor.execute("""
                SELECT risk_factors, COUNT(*) as cnt
                FROM contracts
                WHERE vendor_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
                GROUP BY risk_factors ORDER BY cnt DESC LIMIT 10
            """, (vendor_id,))

            factors_breakdown = []
            total_with_factors = sum(row['cnt'] for row in cursor.fetchall())
            cursor.execute("""
                SELECT risk_factors, COUNT(*) as cnt
                FROM contracts
                WHERE vendor_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
                GROUP BY risk_factors ORDER BY cnt DESC LIMIT 10
            """, (vendor_id,))
            for row in cursor.fetchall():
                factors_breakdown.append(RiskFactorBreakdown(
                    factor=row['risk_factors'],
                    count=row['cnt'],
                    percentage=100.0 * row['cnt'] / total_with_factors if total_with_factors > 0 else 0
                ))

            total = risk_stats['total'] or 1
            risk = VendorReportRisk(
                avg_risk_score=risk_stats['avg_risk'],
                max_risk_score=risk_stats['max_risk'],
                by_risk_level={
                    'critical': risk_stats['critical'] or 0,
                    'high': risk_stats['high'] or 0,
                    'medium': risk_stats['medium'] or 0,
                    'low': risk_stats['low'] or 0
                },
                risk_factors_breakdown=factors_breakdown,
                single_bid_count=risk_stats['single_bid'] or 0,
                single_bid_pct=100.0 * (risk_stats['single_bid'] or 0) / total,
                direct_award_count=risk_stats['direct_award'] or 0,
                direct_award_pct=100.0 * (risk_stats['direct_award'] or 0) / total
            )

            # Price hypotheses
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    AVG(confidence) as avg_conf
                FROM price_hypotheses WHERE vendor_id = ?
            """, (vendor_id,))
            hyp_stats = cursor.fetchone()

            cursor.execute("""
                SELECT hypothesis_type, COUNT(*) as cnt
                FROM price_hypotheses WHERE vendor_id = ?
                GROUP BY hypothesis_type
            """, (vendor_id,))
            hyp_by_type = {row['hypothesis_type']: row['cnt'] for row in cursor.fetchall()}

            cursor.execute("""
                SELECT hypothesis_id, hypothesis_type, confidence, explanation, amount_mxn
                FROM price_hypotheses
                WHERE vendor_id = ?
                ORDER BY confidence DESC LIMIT 5
            """, (vendor_id,))
            top_hypotheses = [dict(row) for row in cursor.fetchall()]

            price_hypotheses = VendorReportHypotheses(
                total_count=hyp_stats['total'] or 0,
                by_type=hyp_by_type,
                avg_confidence=hyp_stats['avg_conf'] or 0,
                top_hypotheses=top_hypotheses
            )

            # Network connections
            cursor.execute("""
                SELECT COUNT(DISTINCT institution_id) as inst_count
                FROM contracts WHERE vendor_id = ?
            """, (vendor_id,))
            inst_count = cursor.fetchone()['inst_count']

            cursor.execute("""
                SELECT i.id, i.name, COUNT(*) as contract_count, SUM(c.amount_mxn) as total_value
                FROM contracts c
                JOIN institutions i ON c.institution_id = i.id
                WHERE c.vendor_id = ?
                GROUP BY i.id ORDER BY total_value DESC LIMIT 10
            """, (vendor_id,))
            top_institutions = [dict(row) for row in cursor.fetchall()]

            # Sector concentration
            cursor.execute("""
                SELECT s.code, SUM(c.amount_mxn) as value
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                WHERE c.vendor_id = ?
                GROUP BY s.id
            """, (vendor_id,))
            sector_values = {row['code']: row['value'] or 0 for row in cursor.fetchall()}
            total_value = sum(sector_values.values()) or 1
            sector_concentration = {k: 100.0 * v / total_value for k, v in sector_values.items()}

            network = VendorReportNetwork(
                institution_count=inst_count,
                top_institutions=top_institutions,
                co_bidder_count=0,  # Would need procedure-level data
                sector_concentration=sector_concentration
            )

            # Red flags
            flags = []
            severity = "low"

            if risk.single_bid_pct > 50:
                flags.append(f"High single-bid rate: {risk.single_bid_pct:.1f}%")
                severity = "high"
            elif risk.single_bid_pct > 30:
                flags.append(f"Elevated single-bid rate: {risk.single_bid_pct:.1f}%")
                if severity == "low":
                    severity = "medium"

            if risk.direct_award_pct > 80:
                flags.append(f"Very high direct award rate: {risk.direct_award_pct:.1f}%")
                severity = "high"
            elif risk.direct_award_pct > 60:
                flags.append(f"High direct award rate: {risk.direct_award_pct:.1f}%")
                if severity == "low":
                    severity = "medium"

            if price_hypotheses.total_count > 10:
                flags.append(f"Multiple price anomalies detected: {price_hypotheses.total_count}")
                if severity == "low":
                    severity = "medium"

            if risk.by_risk_level.get('critical', 0) > 0:
                flags.append(f"Has {risk.by_risk_level['critical']} critical-risk contracts")
                severity = "critical"
            elif risk.by_risk_level.get('high', 0) > 5:
                flags.append(f"Has {risk.by_risk_level['high']} high-risk contracts")
                severity = "high"

            # Concentration flag
            max_sector_conc = max(sector_concentration.values()) if sector_concentration else 0
            if max_sector_conc > 80:
                flags.append(f"High sector concentration: {max_sector_conc:.1f}% in one sector")

            if not flags:
                flags.append("No significant red flags detected")

            red_flags = VendorReportRedFlags(flags=flags, severity=severity)

            return VendorReport(
                report_type="vendor_deep_dive",
                generated_at=datetime.now().isoformat(),
                profile=profile,
                contracts=contracts,
                risk=risk,
                price_hypotheses=price_hypotheses,
                network=network,
                red_flags=red_flags
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating vendor report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# INSTITUTION SPOTLIGHT REPORT
# =============================================================================

class InstitutionReportProfile(BaseModel):
    """Institution profile."""
    institution_id: int
    name: str
    siglas: Optional[str]
    institution_type: Optional[str]
    sector: Optional[str]
    gobierno_nivel: Optional[str]


class InstitutionReport(BaseModel):
    """Institution spotlight report."""
    report_type: str = "institution_spotlight"
    generated_at: str
    profile: InstitutionReportProfile
    contracts: ContractSummary
    top_vendors: List[TopVendor]
    year_over_year: Dict[int, Dict[str, Any]]
    price_hypotheses: PriceHypothesisSummary
    red_flags: List[str]


@router.get("/institution/{institution_id}", response_model=InstitutionReport)
async def get_institution_report(
    institution_id: int = Path(..., ge=1, description="Institution ID"),
):
    """
    Generate institution spotlight report.

    Returns institution profile with:
    - Procurement patterns and trends
    - Top vendors by value and contract count
    - Year-over-year spending changes
    - Price anomalies and risk indicators
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get institution profile
            cursor.execute("""
                SELECT i.id, i.name, i.siglas, i.institution_type, i.gobierno_nivel,
                       s.name_es as sector_name
                FROM institutions i
                LEFT JOIN sectors s ON i.sector_id = s.id
                WHERE i.id = ?
            """, (institution_id,))
            inst = cursor.fetchone()

            if not inst:
                raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

            profile = InstitutionReportProfile(
                institution_id=inst['id'],
                name=inst['name'],
                siglas=inst['siglas'],
                institution_type=inst['institution_type'],
                sector=inst['sector_name'],
                gobierno_nivel=inst['gobierno_nivel']
            )

            # Contract summary
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(amount_mxn), 0) as avg_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low
                FROM contracts WHERE institution_id = ?
            """, (institution_id,))
            stats = cursor.fetchone()

            cursor.execute("""
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts
                WHERE institution_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year
            """, (institution_id,))
            by_year = {row['contract_year']: row['cnt'] for row in cursor.fetchall()}

            contracts = ContractSummary(
                total_count=stats['total'],
                total_value_mxn=stats['total_value'],
                avg_value_mxn=stats['avg_value'],
                avg_risk_score=stats['avg_risk'],
                by_risk_level={
                    'critical': stats['critical'] or 0,
                    'high': stats['high'] or 0,
                    'medium': stats['medium'] or 0,
                    'low': stats['low'] or 0
                },
                by_year=by_year
            )

            # Top vendors
            cursor.execute("""
                SELECT v.id, v.name, v.rfc,
                       COUNT(*) as contract_count,
                       SUM(c.amount_mxn) as total_value,
                       AVG(c.risk_score) as avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.institution_id = ?
                GROUP BY v.id
                ORDER BY total_value DESC
                LIMIT 10
            """, (institution_id,))
            top_vendors = [
                TopVendor(
                    vendor_id=row['id'],
                    name=row['name'],
                    rfc=row['rfc'],
                    contract_count=row['contract_count'],
                    total_value_mxn=row['total_value'] or 0,
                    avg_risk_score=row['avg_risk'] or 0
                )
                for row in cursor.fetchall()
            ]

            # Year-over-year
            cursor.execute("""
                SELECT
                    contract_year,
                    COUNT(*) as contracts,
                    SUM(amount_mxn) as value,
                    AVG(risk_score) as avg_risk,
                    COUNT(DISTINCT vendor_id) as vendors
                FROM contracts
                WHERE institution_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year
                ORDER BY contract_year
            """, (institution_id,))
            yoy = {}
            for row in cursor.fetchall():
                yoy[row['contract_year']] = {
                    'contracts': row['contracts'],
                    'value': row['value'] or 0,
                    'avg_risk': row['avg_risk'] or 0,
                    'vendors': row['vendors']
                }

            # Price hypotheses
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    AVG(ph.confidence) as avg_conf,
                    SUM(CASE WHEN ph.confidence >= 0.85 THEN 1 ELSE 0 END) as high_conf
                FROM price_hypotheses ph
                JOIN contracts c ON ph.contract_id = c.id
                WHERE c.institution_id = ?
            """, (institution_id,))
            hyp = cursor.fetchone()

            cursor.execute("""
                SELECT ph.hypothesis_type, COUNT(*) as cnt
                FROM price_hypotheses ph
                JOIN contracts c ON ph.contract_id = c.id
                WHERE c.institution_id = ?
                GROUP BY ph.hypothesis_type
            """, (institution_id,))
            hyp_by_type = {row['hypothesis_type']: row['cnt'] for row in cursor.fetchall()}

            price_hypotheses = PriceHypothesisSummary(
                total_hypotheses=hyp['total'] or 0,
                by_type=hyp_by_type,
                avg_confidence=hyp['avg_conf'] or 0,
                high_confidence_count=hyp['high_conf'] or 0
            )

            # Red flags
            flags = []
            if stats['avg_risk'] > 0.3:
                flags.append(f"High average risk score: {stats['avg_risk']:.3f}")
            if stats['critical'] and stats['critical'] > 0:
                flags.append(f"Has {stats['critical']} critical-risk contracts")
            if price_hypotheses.total_hypotheses > 50:
                flags.append(f"High number of price anomalies: {price_hypotheses.total_hypotheses}")

            if not flags:
                flags.append("No significant red flags detected")

            return InstitutionReport(
                report_type="institution_spotlight",
                generated_at=datetime.now().isoformat(),
                profile=profile,
                contracts=contracts,
                top_vendors=top_vendors,
                year_over_year=yoy,
                price_hypotheses=price_hypotheses,
                red_flags=flags
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating institution report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# SECTOR SUMMARY REPORT
# =============================================================================

class SectorReport(BaseModel):
    """Sector corruption summary report."""
    report_type: str = "sector_summary"
    generated_at: str
    sector_id: int
    sector_name: str
    sector_code: str
    contracts: ContractSummary
    top_vendors: List[TopVendor]
    top_risky_contracts: List[TopContract]
    risk_factor_distribution: List[RiskFactorBreakdown]
    price_hypotheses: PriceHypothesisSummary
    year_trends: Dict[int, Dict[str, Any]]
    notable_findings: List[str]


@router.get("/sector/{sector_id}", response_model=SectorReport)
async def get_sector_report(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Generate sector corruption summary report.

    Returns sector-level analysis with:
    - Contract overview and risk distribution
    - Top vendors (by value and risk)
    - Most suspicious contracts
    - Risk factor patterns
    - Year-over-year trends
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get sector info
            cursor.execute("SELECT id, code, name_es FROM sectors WHERE id = ?", (sector_id,))
            sector = cursor.fetchone()
            if not sector:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Contract summary
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(amount_mxn), 0) as avg_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low
                FROM contracts WHERE sector_id = ?
            """, (sector_id,))
            stats = cursor.fetchone()

            cursor.execute("""
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts WHERE sector_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year
            """, (sector_id,))
            by_year = {row['contract_year']: row['cnt'] for row in cursor.fetchall()}

            contracts = ContractSummary(
                total_count=stats['total'],
                total_value_mxn=stats['total_value'],
                avg_value_mxn=stats['avg_value'],
                avg_risk_score=stats['avg_risk'],
                by_risk_level={
                    'critical': stats['critical'] or 0,
                    'high': stats['high'] or 0,
                    'medium': stats['medium'] or 0,
                    'low': stats['low'] or 0
                },
                by_year=by_year
            )

            # Top vendors by value
            cursor.execute("""
                SELECT v.id, v.name, v.rfc,
                       COUNT(*) as contract_count,
                       SUM(c.amount_mxn) as total_value,
                       AVG(c.risk_score) as avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.sector_id = ?
                GROUP BY v.id
                ORDER BY total_value DESC
                LIMIT 10
            """, (sector_id,))
            top_vendors = [
                TopVendor(
                    vendor_id=row['id'],
                    name=row['name'],
                    rfc=row['rfc'],
                    contract_count=row['contract_count'],
                    total_value_mxn=row['total_value'] or 0,
                    avg_risk_score=row['avg_risk'] or 0
                )
                for row in cursor.fetchall()
            ]

            # Top risky contracts
            cursor.execute("""
                SELECT c.id, c.title, c.amount_mxn, v.name as vendor_name,
                       c.contract_date, c.risk_score, c.risk_factors
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.sector_id = ? AND c.risk_score IS NOT NULL
                ORDER BY c.risk_score DESC
                LIMIT 10
            """, (sector_id,))
            top_risky = [
                TopContract(
                    contract_id=row['id'],
                    title=row['title'],
                    amount_mxn=row['amount_mxn'] or 0,
                    vendor_name=row['vendor_name'],
                    contract_date=row['contract_date'],
                    risk_score=row['risk_score'] or 0,
                    risk_factors=row['risk_factors']
                )
                for row in cursor.fetchall()
            ]

            # Risk factor distribution
            cursor.execute("""
                SELECT risk_factors, COUNT(*) as cnt
                FROM contracts
                WHERE sector_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
                GROUP BY risk_factors
                ORDER BY cnt DESC
                LIMIT 15
            """, (sector_id,))
            total_with_factors = sum(row['cnt'] for row in cursor.fetchall())

            cursor.execute("""
                SELECT risk_factors, COUNT(*) as cnt
                FROM contracts
                WHERE sector_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
                GROUP BY risk_factors
                ORDER BY cnt DESC
                LIMIT 15
            """, (sector_id,))
            risk_factors = [
                RiskFactorBreakdown(
                    factor=row['risk_factors'],
                    count=row['cnt'],
                    percentage=100.0 * row['cnt'] / total_with_factors if total_with_factors > 0 else 0
                )
                for row in cursor.fetchall()
            ]

            # Price hypotheses
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    AVG(confidence) as avg_conf,
                    SUM(CASE WHEN confidence >= 0.85 THEN 1 ELSE 0 END) as high_conf
                FROM price_hypotheses WHERE sector_id = ?
            """, (sector_id,))
            hyp = cursor.fetchone()

            cursor.execute("""
                SELECT hypothesis_type, COUNT(*) as cnt
                FROM price_hypotheses WHERE sector_id = ?
                GROUP BY hypothesis_type
            """, (sector_id,))
            hyp_by_type = {row['hypothesis_type']: row['cnt'] for row in cursor.fetchall()}

            price_hypotheses = PriceHypothesisSummary(
                total_hypotheses=hyp['total'] or 0,
                by_type=hyp_by_type,
                avg_confidence=hyp['avg_conf'] or 0,
                high_confidence_count=hyp['high_conf'] or 0
            )

            # Year trends
            cursor.execute("""
                SELECT
                    contract_year,
                    COUNT(*) as contracts,
                    SUM(amount_mxn) as value,
                    AVG(risk_score) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                    COUNT(DISTINCT vendor_id) as vendors
                FROM contracts
                WHERE sector_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year
                ORDER BY contract_year
            """, (sector_id,))
            year_trends = {}
            for row in cursor.fetchall():
                year_trends[row['contract_year']] = {
                    'contracts': row['contracts'],
                    'value': row['value'] or 0,
                    'avg_risk': row['avg_risk'] or 0,
                    'direct_awards': row['direct_awards'],
                    'direct_award_pct': 100.0 * row['direct_awards'] / row['contracts'] if row['contracts'] > 0 else 0,
                    'vendors': row['vendors']
                }

            # Notable findings
            findings = []
            if stats['critical'] and stats['critical'] > 0:
                findings.append(f"Contains {stats['critical']} critical-risk contracts requiring investigation")
            if stats['avg_risk'] > 0.25:
                findings.append(f"Average risk score ({stats['avg_risk']:.3f}) above median")
            if price_hypotheses.total_hypotheses > 1000:
                findings.append(f"High volume of price anomalies: {price_hypotheses.total_hypotheses:,}")
            if top_vendors and top_vendors[0].total_value_mxn > stats['total_value'] * 0.2:
                findings.append(f"Top vendor concentration: {top_vendors[0].name} holds >{20}% of sector value")

            if not findings:
                findings.append("No major anomalies detected in this sector")

            return SectorReport(
                report_type="sector_summary",
                generated_at=datetime.now().isoformat(),
                sector_id=sector_id,
                sector_name=sector['name_es'],
                sector_code=sector['code'],
                contracts=contracts,
                top_vendors=top_vendors,
                top_risky_contracts=top_risky,
                risk_factor_distribution=risk_factors,
                price_hypotheses=price_hypotheses,
                year_trends=year_trends,
                notable_findings=findings
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating sector report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# THEMATIC INVESTIGATION REPORT
# =============================================================================

class ThematicReport(BaseModel):
    """Thematic investigation report."""
    report_type: str = "thematic_investigation"
    generated_at: str
    theme: str
    theme_title: str
    methodology: str
    affected_contracts: ContractSummary
    top_vendors: List[TopVendor]
    comparison_to_baseline: Dict[str, Any]
    case_examples: List[TopContract]
    key_findings: List[str]


@router.get("/thematic/{theme}", response_model=ThematicReport)
async def get_thematic_report(
    theme: ThemeType = Path(..., description="Theme type"),
):
    """
    Generate thematic investigation report.

    Available themes:
    - covid: COVID-19 emergency spending (2020-2021)
    - election: Election year patterns (2018, 2021, 2024)
    - year_end: December spending spikes
    - threshold_splitting: Contracts just below tender thresholds
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Theme-specific queries
            if theme == ThemeType.covid:
                title = "COVID-19 Emergency Procurement"
                methodology = """Analysis of contracts during 2020-2021 pandemic period,
                focusing on emergency procedures and health sector spending."""
                where_clause = "contract_year IN (2020, 2021)"
                baseline_clause = "contract_year IN (2018, 2019)"

            elif theme == ThemeType.election:
                title = "Election Year Procurement Patterns"
                methodology = """Comparison of procurement patterns during federal election
                years (2018, 2021, 2024) vs non-election years."""
                where_clause = "contract_year IN (2018, 2021, 2024)"
                baseline_clause = "contract_year IN (2017, 2019, 2022, 2023)"

            elif theme == ThemeType.year_end:
                title = "Year-End Spending Surge Analysis"
                methodology = """Analysis of December contracts to detect budget exhaustion
                patterns and rushed procurement decisions."""
                where_clause = "is_year_end = 1"
                baseline_clause = "is_year_end = 0"

            elif theme == ThemeType.threshold_splitting:
                title = "Threshold Splitting Detection"
                methodology = """Detection of potential threshold splitting through same-day
                contracts to same vendor/institution combinations."""
                # Contracts where risk_factors contains 'split'
                where_clause = "risk_factors LIKE '%split%'"
                baseline_clause = "risk_factors NOT LIKE '%split%' OR risk_factors IS NULL"

            # Get affected contracts summary
            cursor.execute(f"""
                SELECT
                    COUNT(*) as total,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(amount_mxn), 0) as avg_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low
                FROM contracts WHERE {where_clause}
            """)
            stats = cursor.fetchone()

            cursor.execute(f"""
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts WHERE {where_clause} AND contract_year IS NOT NULL
                GROUP BY contract_year
            """)
            by_year = {row['contract_year']: row['cnt'] for row in cursor.fetchall()}

            affected = ContractSummary(
                total_count=stats['total'] or 0,
                total_value_mxn=stats['total_value'] or 0,
                avg_value_mxn=stats['avg_value'] or 0,
                avg_risk_score=stats['avg_risk'] or 0,
                by_risk_level={
                    'critical': stats['critical'] or 0,
                    'high': stats['high'] or 0,
                    'medium': stats['medium'] or 0,
                    'low': stats['low'] or 0
                },
                by_year=by_year
            )

            # Top vendors in theme
            cursor.execute(f"""
                SELECT v.id, v.name, v.rfc,
                       COUNT(*) as contract_count,
                       SUM(c.amount_mxn) as total_value,
                       AVG(c.risk_score) as avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE {where_clause}
                GROUP BY v.id
                ORDER BY total_value DESC
                LIMIT 10
            """)
            top_vendors = [
                TopVendor(
                    vendor_id=row['id'],
                    name=row['name'],
                    rfc=row['rfc'],
                    contract_count=row['contract_count'],
                    total_value_mxn=row['total_value'] or 0,
                    avg_risk_score=row['avg_risk'] or 0
                )
                for row in cursor.fetchall()
            ]

            # Baseline comparison
            cursor.execute(f"""
                SELECT
                    COUNT(*) as total,
                    COALESCE(AVG(amount_mxn), 0) as avg_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*) as direct_pct
                FROM contracts WHERE {baseline_clause}
            """)
            baseline = cursor.fetchone()

            theme_direct_pct = 0
            if stats['total'] and stats['total'] > 0:
                cursor.execute(f"""
                    SELECT 100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*)
                    FROM contracts WHERE {where_clause}
                """)
                theme_direct_pct = cursor.fetchone()[0] or 0

            comparison = {
                'theme_avg_value': stats['avg_value'] or 0,
                'baseline_avg_value': baseline['avg_value'] or 0,
                'value_change_pct': 100.0 * ((stats['avg_value'] or 0) - (baseline['avg_value'] or 0)) / (baseline['avg_value'] or 1),
                'theme_avg_risk': stats['avg_risk'] or 0,
                'baseline_avg_risk': baseline['avg_risk'] or 0,
                'risk_change_pct': 100.0 * ((stats['avg_risk'] or 0) - (baseline['avg_risk'] or 0)) / (baseline['avg_risk'] or 0.001),
                'theme_direct_award_pct': theme_direct_pct,
                'baseline_direct_award_pct': baseline['direct_pct'] or 0,
            }

            # Case examples
            cursor.execute(f"""
                SELECT c.id, c.title, c.amount_mxn, v.name as vendor_name,
                       c.contract_date, c.risk_score, c.risk_factors
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE {where_clause} AND c.risk_score IS NOT NULL
                ORDER BY c.risk_score DESC, c.amount_mxn DESC
                LIMIT 5
            """)
            cases = [
                TopContract(
                    contract_id=row['id'],
                    title=row['title'],
                    amount_mxn=row['amount_mxn'] or 0,
                    vendor_name=row['vendor_name'],
                    contract_date=row['contract_date'],
                    risk_score=row['risk_score'] or 0,
                    risk_factors=row['risk_factors']
                )
                for row in cursor.fetchall()
            ]

            # Key findings
            findings = []
            if comparison['risk_change_pct'] > 10:
                findings.append(f"Average risk {comparison['risk_change_pct']:.1f}% higher than baseline")
            if comparison['value_change_pct'] > 20:
                findings.append(f"Average contract value {comparison['value_change_pct']:.1f}% higher than baseline")
            if stats['critical'] and stats['critical'] > 0:
                findings.append(f"Contains {stats['critical']} critical-risk contracts")
            if theme_direct_pct > baseline['direct_pct'] + 10:
                findings.append(f"Direct award rate elevated: {theme_direct_pct:.1f}% vs {baseline['direct_pct']:.1f}% baseline")

            if not findings:
                findings.append("No significant deviations from baseline detected")

            return ThematicReport(
                report_type="thematic_investigation",
                generated_at=datetime.now().isoformat(),
                theme=theme.value,
                theme_title=title,
                methodology=methodology,
                affected_contracts=affected,
                top_vendors=top_vendors,
                comparison_to_baseline=comparison,
                case_examples=cases,
                key_findings=findings
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating thematic report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# REPORT SUMMARY ENDPOINT
# =============================================================================

class ReportTypeSummary(BaseModel):
    """Available report types."""
    report_type: str
    endpoint: str
    description: str
    parameters: List[str]


@router.get("/", response_model=List[ReportTypeSummary])
async def list_report_types():
    """List available report types and their endpoints."""
    return [
        ReportTypeSummary(
            report_type="vendor_deep_dive",
            endpoint="/reports/vendor/{vendor_id}",
            description="Comprehensive vendor investigation with risk profile, contracts, and red flags",
            parameters=["vendor_id (required)"]
        ),
        ReportTypeSummary(
            report_type="institution_spotlight",
            endpoint="/reports/institution/{institution_id}",
            description="Institution procurement patterns, top vendors, and year-over-year trends",
            parameters=["institution_id (required)"]
        ),
        ReportTypeSummary(
            report_type="sector_summary",
            endpoint="/reports/sector/{sector_id}",
            description="Sector-level corruption indicators and risk analysis",
            parameters=["sector_id (required, 1-12)"]
        ),
        ReportTypeSummary(
            report_type="thematic_investigation",
            endpoint="/reports/thematic/{theme}",
            description="Themed investigation (covid, election, year_end, threshold_splitting)",
            parameters=["theme (required: covid|election|year_end|threshold_splitting)"]
        ),
    ]
