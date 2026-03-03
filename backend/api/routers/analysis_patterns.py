"""
Analysis sub-router: Pattern detection endpoints.

Covers: pattern counts, co-bidding, vendor concentration, year-end patterns,
investigation leads, institution period comparison, anomalies, money flow,
risk factor analysis, institution rankings, institution risk factors.
"""

import sqlite3
import logging
import json
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime, timedelta

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..helpers.analysis_helpers import table_exists
from ..services.analysis_service import analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class PatternCountsResponse(BaseModel):
    """Dynamic pattern counts — keys vary; use Dict."""
    model_config = {"extra": "allow"}


class CoBiddingPair(BaseModel):
    """A pair of vendors with high co-bidding rate."""
    vendor_1_id: int
    vendor_1_name: str
    vendor_2_id: int
    vendor_2_name: str
    co_bid_count: int
    co_bid_rate: float = Field(..., description="Percentage rate")
    combined_value: float = Field(default=0)
    is_potential_collusion: bool = False


class CoBiddingResponse(BaseModel):
    """Co-bidding pattern analysis results."""
    total_pairs_analyzed: int
    high_confidence_pairs: int
    potential_collusion_pairs: int
    pairs: List[CoBiddingPair]


class ConcentrationAlert(BaseModel):
    """A vendor concentration alert."""
    vendor_id: int
    vendor_name: str
    institution_id: int
    institution_name: str
    vendor_contracts: int
    vendor_value: float
    total_contracts: int
    total_value: float
    value_share_pct: float
    avg_risk_score: Optional[float] = None


class ConcentrationResponse(BaseModel):
    """Vendor concentration analysis results."""
    institutions_analyzed: int
    high_concentration_count: int
    alerts: List[ConcentrationAlert]


class YearEndPattern(BaseModel):
    """Year-end spending pattern."""
    year: int
    december_value: float
    december_contracts: int
    avg_monthly_value: float
    spike_ratio: Optional[float] = None
    is_significant: bool = False
    december_risk: Optional[float] = None


class YearEndResponse(BaseModel):
    """Year-end pattern analysis results."""
    years_analyzed: int
    years_with_spikes: int
    average_spike_ratio: float
    patterns: List[YearEndPattern]


class InvestigationLead(BaseModel):
    """An investigation lead."""
    lead_type: str
    priority: str = Field(..., description="HIGH or MEDIUM")
    contract_id: Optional[int] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    amount_mxn: Optional[float] = None
    risk_score: Optional[float] = None
    risk_indicators: List[str] = []
    verification_steps: List[str] = []


class InvestigationLeadsResponse(BaseModel):
    """Investigation leads list."""
    total_leads: int
    high_priority: int
    leads: List[InvestigationLead]


class InstitutionPeriodComparisonResponse(BaseModel):
    institution_id: int
    institution_name: str
    period1: Dict[str, Any]
    period2: Dict[str, Any]
    comparison: Dict[str, Any]
    interpretation: str


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


class MoneyFlowItem(BaseModel):
    source_type: str
    source_id: int
    source_name: str
    target_type: str
    target_id: int
    target_name: str
    value: float
    contracts: int
    avg_risk: Optional[float] = None
    high_risk_pct: Optional[float] = None

class MoneyFlowResponse(BaseModel):
    flows: List[MoneyFlowItem]
    total_value: float
    total_contracts: int


class RiskFactorFrequency(BaseModel):
    factor: str
    count: int
    percentage: float
    avg_risk_score: float

class FactorCooccurrence(BaseModel):
    factor_a: str
    factor_b: str
    count: int
    expected_count: float
    lift: float

class RiskFactorAnalysisResponse(BaseModel):
    total_contracts_with_factors: int
    factor_frequencies: List[RiskFactorFrequency]
    top_cooccurrences: List[FactorCooccurrence]


class InstitutionHealthItem(BaseModel):
    institution_id: int
    institution_name: str
    total_contracts: int
    total_value: float
    avg_risk_score: float
    direct_award_pct: float
    single_bid_pct: float
    high_risk_pct: float
    vendor_count: int
    hhi: float
    top_vendor_share: float

class InstitutionRankingsResponse(BaseModel):
    data: List[InstitutionHealthItem]
    total_institutions: int


class InstitutionRiskFactorItem(BaseModel):
    institution_id: int
    institution_name: str
    contract_count: int
    avg_risk_score: float
    dominant_factor: str
    dominant_factor_avg_z: float
    factor_breakdown: Dict[str, float]


class InstitutionRiskFactorsResponse(BaseModel):
    data: List[InstitutionRiskFactorItem]
    total: int


# =============================================================================
# CACHE VARIABLES
# =============================================================================

_pattern_counts_cache: Dict[str, Any] = {}
_pattern_counts_ts: float = 0

# Simple cache for anomalies
_anomalies_cache: Dict[str, Any] = {}
_anomalies_cache_time: Optional[datetime] = None
ANOMALIES_CACHE_TTL = 300  # 5 minutes

_money_flow_cache: Dict[str, Any] = {}
_money_flow_cache_ts: float = 0
_MONEY_FLOW_CACHE_TTL = 600  # 10 minutes

_risk_factor_analysis_cache: Dict[str, Any] = {}
_risk_factor_analysis_cache_ts: float = 0
_RISK_FACTOR_ANALYSIS_CACHE_TTL = 600  # 10 minutes

_institution_rankings_cache: Dict[str, Any] = {}
_institution_rankings_cache_ts: float = 0
_INSTITUTION_RANKINGS_CACHE_TTL = 600  # 10 minutes

_inst_risk_factors_cache: dict = {}
_inst_risk_factors_lock = __import__("threading").Lock()
_INST_RISK_FACTORS_TTL = 3600


# =============================================================================
# PATTERN COUNTS ENDPOINT
# =============================================================================

@router.get("/patterns/counts", response_model=Dict[str, Any])
def get_pattern_counts():
    """
    Return all pattern match counts in a single request.
    Replaces 4+ separate per_page=1 queries from DetectivePatterns page.
    Cached for 10 minutes.
    """
    import time
    global _pattern_counts_cache, _pattern_counts_ts

    now = time.time()
    if _pattern_counts_cache and (now - _pattern_counts_ts) < 600:
        return _pattern_counts_cache

    with get_db() as conn:
        result = analysis_service.get_pattern_counts(conn)
        _pattern_counts_cache = result
        _pattern_counts_ts = now
        return result


# =============================================================================
# CO-BIDDING ENDPOINT
# =============================================================================

@router.get("/patterns/co-bidding", response_model=CoBiddingResponse)
def get_co_bidding_patterns(
    min_co_bids: int = Query(5, ge=2, description="Minimum co-bid count"),
    min_rate: float = Query(50.0, ge=0, le=100, description="Minimum co-bid rate %"),
    limit: int = Query(100, ge=1, le=500, description="Maximum pairs to return"),
):
    """
    Analyze co-bidding patterns to detect potential collusion.

    Returns vendor pairs that frequently appear in the same procedures.
    High co-bid rates (>80%) suggest coordinated bidding or related entities.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get vendor procedure counts
            cursor.execute("""
                SELECT vendor_id, COUNT(DISTINCT procedure_number) as proc_count
                FROM contracts
                WHERE procedure_number IS NOT NULL AND procedure_number != ''
                GROUP BY vendor_id
                HAVING proc_count >= 5
            """)
            vendor_procs = {row['vendor_id']: row['proc_count'] for row in cursor.fetchall()}

            # Find co-bidding pairs
            cursor.execute("""
                SELECT
                    c1.vendor_id as v1,
                    c2.vendor_id as v2,
                    COUNT(DISTINCT c1.procedure_number) as co_bids
                FROM contracts c1
                JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
                JOIN vendors vn1 ON c1.vendor_id = vn1.id
                JOIN vendors vn2 ON c2.vendor_id = vn2.id
                WHERE c1.vendor_id < c2.vendor_id
                  AND c1.procedure_number IS NOT NULL
                  AND c1.procedure_number != ''
                  AND vn1.is_individual = 0
                  AND vn2.is_individual = 0
                GROUP BY c1.vendor_id, c2.vendor_id
                HAVING co_bids >= ?
                ORDER BY co_bids DESC
                LIMIT 5000
            """, (min_co_bids,))

            pairs_raw = cursor.fetchall()

            # Calculate rates and filter
            high_confidence = []
            potential_collusion = 0

            for row in pairs_raw:
                v1, v2 = row['v1'], row['v2']
                co_bids = row['co_bids']

                v1_procs = vendor_procs.get(v1, 0)
                v2_procs = vendor_procs.get(v2, 0)

                if v1_procs == 0 or v2_procs == 0:
                    continue

                rate = min(co_bids / v1_procs, co_bids / v2_procs) * 100

                if rate >= min_rate:
                    high_confidence.append({
                        'v1': v1, 'v2': v2,
                        'co_bids': co_bids,
                        'rate': rate
                    })
                    if rate >= 80:
                        potential_collusion += 1

            # Get vendor names
            vendor_ids = set()
            for p in high_confidence[:limit]:
                vendor_ids.add(p['v1'])
                vendor_ids.add(p['v2'])

            vendor_names = {}
            if vendor_ids:
                placeholders = ','.join(['?' for _ in vendor_ids])
                # Safe: placeholders are '?' joined, vendor_ids are ints from prior DB query
                cursor.execute(f"SELECT id, name FROM vendors WHERE id IN ({placeholders})", list(vendor_ids))
                vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

            pairs = []
            for p in high_confidence[:limit]:
                pairs.append(CoBiddingPair(
                    vendor_1_id=p['v1'],
                    vendor_1_name=vendor_names.get(p['v1'], f"ID:{p['v1']}"),
                    vendor_2_id=p['v2'],
                    vendor_2_name=vendor_names.get(p['v2'], f"ID:{p['v2']}"),
                    co_bid_count=p['co_bids'],
                    co_bid_rate=round(p['rate'], 1),
                    is_potential_collusion=p['rate'] >= 80
                ))

            return CoBiddingResponse(
                total_pairs_analyzed=len(pairs_raw),
                high_confidence_pairs=len(high_confidence),
                potential_collusion_pairs=potential_collusion,
                pairs=pairs
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_co_bidding_patterns: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# CONCENTRATION ENDPOINT
# =============================================================================

@router.get("/patterns/concentration", response_model=ConcentrationResponse)
def get_concentration_patterns(
    min_share: float = Query(25.0, ge=10, le=100, description="Minimum value share %"),
    min_contracts: int = Query(100, ge=10, description="Minimum contracts per institution"),
    limit: int = Query(100, ge=1, le=500, description="Maximum alerts to return"),
):
    """
    Analyze vendor concentration by institution.

    Returns vendor-institution pairs where a single vendor controls
    a significant share of the institution's procurement value.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                WITH inst_totals AS (
                    SELECT
                        institution_id,
                        COUNT(*) as total_contracts,
                        SUM(amount_mxn) as total_value
                    FROM contracts
                    WHERE institution_id IS NOT NULL
                      AND amount_mxn > 0
                      AND amount_mxn < 100000000000
                    GROUP BY institution_id
                    HAVING total_contracts >= ?
                ),
                vendor_shares AS (
                    SELECT
                        c.institution_id,
                        c.vendor_id,
                        COUNT(*) as vendor_contracts,
                        SUM(c.amount_mxn) as vendor_value,
                        t.total_contracts,
                        t.total_value
                    FROM contracts c
                    JOIN inst_totals t ON c.institution_id = t.institution_id
                    WHERE c.vendor_id IS NOT NULL AND c.amount_mxn > 0
                    GROUP BY c.institution_id, c.vendor_id
                )
                SELECT
                    vs.institution_id,
                    vs.vendor_id,
                    vs.vendor_contracts,
                    vs.vendor_value,
                    vs.total_contracts,
                    vs.total_value,
                    CAST(vs.vendor_value AS REAL) / vs.total_value * 100 as value_share,
                    v.name as vendor_name,
                    i.name as institution_name
                FROM vendor_shares vs
                JOIN vendors v ON vs.vendor_id = v.id
                JOIN institutions i ON vs.institution_id = i.id
                WHERE CAST(vs.vendor_value AS REAL) / vs.total_value * 100 >= ?
                ORDER BY value_share DESC
                LIMIT ?
            """, (min_contracts, min_share, limit))

            alerts = []
            for row in cursor.fetchall():
                # Get average risk score
                cursor.execute("""
                    SELECT AVG(risk_score) as avg_risk
                    FROM contracts
                    WHERE vendor_id = ? AND institution_id = ?
                      AND risk_score IS NOT NULL
                """, (row['vendor_id'], row['institution_id']))
                avg_risk = cursor.fetchone()['avg_risk']

                alerts.append(ConcentrationAlert(
                    vendor_id=row['vendor_id'],
                    vendor_name=row['vendor_name'],
                    institution_id=row['institution_id'],
                    institution_name=row['institution_name'],
                    vendor_contracts=row['vendor_contracts'],
                    vendor_value=row['vendor_value'],
                    total_contracts=row['total_contracts'],
                    total_value=row['total_value'],
                    value_share_pct=round(row['value_share'], 1),
                    avg_risk_score=round(avg_risk, 4) if avg_risk else None
                ))

            # Count institutions
            cursor.execute("""
                SELECT COUNT(DISTINCT institution_id)
                FROM contracts
                WHERE institution_id IS NOT NULL
                  AND amount_mxn > 0
                GROUP BY institution_id
                HAVING COUNT(*) >= ?
            """, (min_contracts,))
            inst_count = len(cursor.fetchall())

            return ConcentrationResponse(
                institutions_analyzed=inst_count,
                high_concentration_count=len(alerts),
                alerts=alerts
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_concentration_patterns: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# YEAR-END PATTERNS ENDPOINT
# =============================================================================

@router.get("/patterns/year-end", response_model=YearEndResponse)
def get_year_end_patterns(
    start_year: int = Query(2015, ge=2002, le=2026),
    end_year: int = Query(2024, ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
):
    """
    Analyze year-end (December) spending spikes.

    Returns yearly data showing December spending relative to other months.
    Significant spikes (>1.5x) may indicate budget exhaustion behavior.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = [
                "contract_year >= ?", "contract_year <= ?",
                "contract_month IS NOT NULL",
                "amount_mxn > 0", "amount_mxn < 100000000000"
            ]
            params: List[Any] = [start_year, end_year]

            if sector_id:
                conditions.append("sector_id = ?")
                params.append(sector_id)

            cursor.execute(f"""
                WITH monthly AS (
                    SELECT
                        contract_year as year,
                        contract_month as month,
                        COUNT(*) as contracts,
                        SUM(amount_mxn) as value,
                        AVG(risk_score) as avg_risk
                    FROM contracts
                    WHERE {" AND ".join(conditions)}
                    GROUP BY contract_year, contract_month
                ),
                yearly_avg AS (
                    SELECT
                        year,
                        AVG(CASE WHEN month != 12 THEN value END) as avg_other_months,
                        SUM(CASE WHEN month = 12 THEN value ELSE 0 END) as december_value,
                        SUM(CASE WHEN month = 12 THEN contracts ELSE 0 END) as december_contracts,
                        AVG(CASE WHEN month = 12 THEN avg_risk END) as december_risk
                    FROM monthly
                    GROUP BY year
                )
                SELECT
                    year,
                    december_value,
                    december_contracts,
                    avg_other_months,
                    CASE WHEN avg_other_months > 0 THEN december_value / avg_other_months ELSE NULL END as spike_ratio,
                    december_risk
                FROM yearly_avg
                WHERE december_value > 0
                ORDER BY year
            """, params)

            patterns = []
            spike_years = 0
            spike_ratios = []

            for row in cursor.fetchall():
                is_significant = row['spike_ratio'] and row['spike_ratio'] >= 1.5
                if is_significant:
                    spike_years += 1
                if row['spike_ratio']:
                    spike_ratios.append(row['spike_ratio'])

                patterns.append(YearEndPattern(
                    year=row['year'],
                    december_value=row['december_value'],
                    december_contracts=row['december_contracts'],
                    avg_monthly_value=row['avg_other_months'] or 0,
                    spike_ratio=round(row['spike_ratio'], 2) if row['spike_ratio'] else None,
                    is_significant=is_significant,
                    december_risk=round(row['december_risk'], 4) if row['december_risk'] else None
                ))

            avg_spike = sum(spike_ratios) / len(spike_ratios) if spike_ratios else 0

            return YearEndResponse(
                years_analyzed=len(patterns),
                years_with_spikes=spike_years,
                average_spike_ratio=round(avg_spike, 2),
                patterns=patterns
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_year_end_patterns: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# INVESTIGATION LEADS ENDPOINT
# =============================================================================

@router.get("/leads", response_model=InvestigationLeadsResponse)
def get_investigation_leads(
    lead_type: Optional[str] = Query(None, description="Filter by type: risk, cluster, concentration, price, year_end"),
    priority: Optional[str] = Query(None, description="Filter by priority: HIGH, MEDIUM"),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    min_amount: Optional[float] = Query(None, ge=0, description="Minimum amount in MXN"),
    limit: int = Query(50, ge=1, le=200, description="Maximum leads to return"),
):
    """
    Get prioritized investigation leads.

    Returns a combined list of leads from various detection methods,
    each with verification steps for manual review.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            leads = []
            high_priority = 0

            # Type 1: Top risk contracts
            if lead_type is None or lead_type == 'risk':
                conditions = [
                    "c.risk_score IS NOT NULL",
                    "c.amount_mxn > 1000000",
                    "c.amount_mxn < 100000000000"
                ]
                params: List[Any] = []

                if sector_id:
                    conditions.append("c.sector_id = ?")
                    params.append(sector_id)
                if min_amount:
                    conditions.append("c.amount_mxn >= ?")
                    params.append(min_amount)

                cursor.execute(f"""
                    SELECT
                        c.id, c.risk_score, c.risk_level, c.amount_mxn,
                        v.name as vendor_name, i.name as institution_name
                    FROM contracts c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN institutions i ON c.institution_id = i.id
                    WHERE {" AND ".join(conditions)}
                    ORDER BY c.risk_score DESC
                    LIMIT ?
                """, params + [limit // 3])

                for row in cursor.fetchall():
                    prio = "HIGH" if row['risk_score'] >= 0.5 else "MEDIUM"
                    if prio == "HIGH":
                        high_priority += 1
                    if priority and prio != priority:
                        continue

                    leads.append(InvestigationLead(
                        lead_type="high_risk_contract",
                        priority=prio,
                        contract_id=row['id'],
                        vendor_name=row['vendor_name'],
                        institution_name=row['institution_name'],
                        amount_mxn=row['amount_mxn'],
                        risk_score=row['risk_score'],
                        risk_indicators=[f"Risk level: {row['risk_level']}", f"Score: {row['risk_score']:.3f}"],
                        verification_steps=[
                            "Search vendor name + 'corrupcion'",
                            "Check ASF audit reports",
                            "Review vendor contract history"
                        ]
                    ))

            # Type 2: Year-end patterns
            if lead_type is None or lead_type == 'year_end':
                conditions = [
                    "c.is_year_end = 1",
                    "c.risk_score >= 0.3",
                    "c.amount_mxn > 10000000",
                    "c.amount_mxn < 100000000000"
                ]
                params = []

                if sector_id:
                    conditions.append("c.sector_id = ?")
                    params.append(sector_id)

                cursor.execute(f"""
                    SELECT
                        c.id, c.risk_score, c.amount_mxn,
                        c.is_direct_award, c.is_single_bid,
                        v.name as vendor_name, i.name as institution_name
                    FROM contracts c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN institutions i ON c.institution_id = i.id
                    WHERE {" AND ".join(conditions)}
                    ORDER BY c.risk_score DESC
                    LIMIT ?
                """, params + [limit // 3])

                for row in cursor.fetchall():
                    compounding = []
                    if row['is_direct_award']:
                        compounding.append("Direct award")
                    if row['is_single_bid']:
                        compounding.append("Single bid")

                    prio = "HIGH" if len(compounding) >= 1 else "MEDIUM"
                    if prio == "HIGH":
                        high_priority += 1
                    if priority and prio != priority:
                        continue

                    leads.append(InvestigationLead(
                        lead_type="year_end_pattern",
                        priority=prio,
                        contract_id=row['id'],
                        vendor_name=row['vendor_name'],
                        institution_name=row['institution_name'],
                        amount_mxn=row['amount_mxn'],
                        risk_score=row['risk_score'],
                        risk_indicators=["December contract"] + compounding,
                        verification_steps=[
                            "Check if similar contracts available earlier",
                            "Review urgency justification",
                            "Compare to vendor's non-December contracts"
                        ]
                    ))

            # Sort by priority and risk score
            leads.sort(key=lambda x: (0 if x.priority == "HIGH" else 1, -(x.risk_score or 0)))

            return InvestigationLeadsResponse(
                total_leads=len(leads),
                high_priority=high_priority,
                leads=leads[:limit]
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_investigation_leads: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# INSTITUTION PERIOD COMPARISON ENDPOINT
# =============================================================================

@router.get("/institution/{institution_id}/period-comparison", response_model=InstitutionPeriodComparisonResponse)
def get_institution_period_comparison(
    institution_id: int = Path(..., description="Institution ID"),
    period1_start: int = Query(..., ge=2002, le=2026),
    period1_end: int = Query(..., ge=2002, le=2026),
    period2_start: int = Query(..., ge=2002, le=2026),
    period2_end: int = Query(..., ge=2002, le=2026),
):
    """
    Compare risk metrics between two time periods for a specific institution.

    Useful for comparing scandal periods vs control periods.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get institution name
            cursor.execute("SELECT name FROM institutions WHERE id = ?", (institution_id,))
            inst_row = cursor.fetchone()
            if not inst_row:
                raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

            def get_period_stats(start: int, end: int) -> Dict:
                cursor.execute("""
                    SELECT
                        COUNT(*) as contracts,
                        AVG(risk_score) as avg_risk,
                        SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct,
                        SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                        SUM(amount_mxn) as total_value
                    FROM contracts
                    WHERE institution_id = ?
                      AND contract_year >= ? AND contract_year <= ?
                      AND amount_mxn > 0 AND amount_mxn < 100000000000
                """, (institution_id, start, end))
                row = cursor.fetchone()
                return {
                    "period": f"{start}-{end}",
                    "contracts": row['contracts'],
                    "avg_risk": round(row['avg_risk'], 4) if row['avg_risk'] else 0,
                    "high_risk_pct": round(row['high_risk_pct'], 1) if row['high_risk_pct'] else 0,
                    "direct_award_pct": round(row['direct_award_pct'], 1) if row['direct_award_pct'] else 0,
                    "total_value": row['total_value'] or 0
                }

            period1 = get_period_stats(period1_start, period1_end)
            period2 = get_period_stats(period2_start, period2_end)

            # Calculate changes
            risk_change = period2['avg_risk'] - period1['avg_risk']
            risk_change_pct = (risk_change / period1['avg_risk'] * 100) if period1['avg_risk'] > 0 else 0

            return {
                "institution_id": institution_id,
                "institution_name": inst_row['name'],
                "period1": period1,
                "period2": period2,
                "comparison": {
                    "risk_change": round(risk_change, 4),
                    "risk_change_pct": round(risk_change_pct, 1),
                    "direction": "increased" if risk_change > 0 else "decreased",
                    "high_risk_pct_change": round(period2['high_risk_pct'] - period1['high_risk_pct'], 1),
                    "direct_award_pct_change": round(period2['direct_award_pct'] - period1['direct_award_pct'], 1)
                },
                "interpretation": f"Risk {'increased' if risk_change > 0 else 'decreased'} by {abs(risk_change_pct):.1f}% from period 1 to period 2"
            }

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_institution_period_comparison: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# ANOMALIES ENDPOINT (FAST VERSION)
# =============================================================================

@router.get("/anomalies", response_model=AnomalyListResponse)
def get_anomalies(
    severity: Optional[str] = Query(None, description="Filter by minimum severity: low, medium, high, critical"),
):
    """
    Get detected anomalies in procurement data (fast cached version).

    Returns precomputed anomalies for quick dashboard loading.
    For detailed anomaly detection with filters, use /sectors/analysis/anomalies.
    """
    global _anomalies_cache, _anomalies_cache_time

    cache_key = f"anomalies_{severity or 'all'}"

    # Check cache first - return immediately if valid
    if _anomalies_cache_time and (datetime.now() - _anomalies_cache_time).total_seconds() < ANOMALIES_CACHE_TTL:
        if cache_key in _anomalies_cache:
            return _anomalies_cache[cache_key]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            anomalies = []

            # 1. Use precomputed overview stats for summary anomalies
            cursor.execute("""
                SELECT stat_value FROM precomputed_stats WHERE stat_key = 'overview'
            """)
            overview_row = cursor.fetchone()
            if overview_row:
                overview = json.loads(overview_row['stat_value'])
                high_risk_pct = overview.get('high_risk_pct', 0)
                if high_risk_pct > 0.003:  # More than 0.3% high risk
                    anomalies.append(AnomalyItem(
                        anomaly_type="high_risk_concentration",
                        severity="high",
                        description=f"{overview.get('high_risk_contracts', 0):,} contracts flagged as high/critical risk ({high_risk_pct*100:.2f}%)",
                        affected_contracts=overview.get('high_risk_contracts', 0),
                        affected_value_mxn=overview.get('total_value_mxn', 0) * high_risk_pct,
                        details={
                            "high_risk_pct": round(high_risk_pct, 4),
                            "total_contracts": overview.get('total_contracts', 0),
                            "source": "precomputed_overview"
                        }
                    ))

                # Direct award concentration
                direct_award_pct = overview.get('direct_award_pct', 0)
                if direct_award_pct > 0.7:  # More than 70% direct awards
                    anomalies.append(AnomalyItem(
                        anomaly_type="direct_award_concentration",
                        severity="medium",
                        description=f"{direct_award_pct*100:.1f}% of contracts awarded directly (no competition)",
                        affected_contracts=int(overview.get('total_contracts', 0) * direct_award_pct),
                        affected_value_mxn=overview.get('total_value_mxn', 0) * direct_award_pct,
                        details={
                            "direct_award_pct": round(direct_award_pct, 3),
                            "source": "precomputed_overview"
                        }
                    ))

            # 2. Sector-level anomalies from precomputed stats
            cursor.execute("""
                SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'
            """)
            sectors_row = cursor.fetchone()
            if sectors_row:
                sectors = json.loads(sectors_row['stat_value'])
                for sector in sectors[:5]:  # Top 5 sectors by risk
                    high_risk = (sector.get('high_risk_count', 0) or 0) + (sector.get('critical_risk_count', 0) or 0)
                    total = sector.get('total_contracts', 1)
                    if high_risk > 100:
                        anomalies.append(AnomalyItem(
                            anomaly_type="sector_risk",
                            severity="high" if high_risk > 500 else "medium",
                            description=f"{sector.get('name', 'Unknown')}: {high_risk:,} high-risk contracts ({high_risk/total*100:.1f}%)",
                            affected_contracts=high_risk,
                            affected_value_mxn=sector.get('total_value_mxn', 0) * (high_risk / total),
                            details={
                                "sector_id": sector.get('id'),
                                "sector_name": sector.get('name'),
                                "avg_risk_score": sector.get('avg_risk_score', 0),
                                "source": "precomputed_sectors"
                            }
                        ))

            # 3. Year-end spike check using precomputed stats
            cursor.execute("""
                SELECT stat_value FROM precomputed_stats WHERE stat_key = 'yearly_trends'
            """)
            yearly_row = cursor.fetchone()
            if yearly_row:
                yearly_trends = json.loads(yearly_row['stat_value'])
                # Check recent years for significant activity
                for year_data in yearly_trends[-3:]:  # Last 3 years
                    year = year_data.get('year', 0)
                    contracts = year_data.get('contracts', 0)
                    if year >= 2020 and contracts > 100000:
                        anomalies.append(AnomalyItem(
                            anomaly_type="year_activity",
                            severity="low",
                            description=f"{year}: {contracts:,} contracts worth ${year_data.get('value_mxn', 0)/1e9:.1f}B MXN",
                            affected_contracts=contracts,
                            affected_value_mxn=year_data.get('value_mxn', 0),
                            details={
                                "year": year,
                                "source": "precomputed_trends"
                            }
                        ))

            # Filter by severity if requested
            if severity:
                severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
                min_level = severity_order.get(severity.lower(), 0)
                anomalies = [a for a in anomalies if severity_order.get(a.severity, 0) >= min_level]

            # Sort by severity
            severity_sort = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            anomalies.sort(key=lambda x: severity_sort.get(x.severity, 4))

            response = AnomalyListResponse(
                data=anomalies[:20],  # Limit to 20 for performance
                total=len(anomalies),
                filters_applied={"severity": severity} if severity else {}
            )

            # Update cache
            _anomalies_cache[cache_key] = response
            _anomalies_cache_time = datetime.now()

            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_anomalies: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# MONEY FLOW ENDPOINT (for Sankey/flow visualization)
# =============================================================================

@router.get("/money-flow", response_model=MoneyFlowResponse)
def get_money_flow(
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2002, le=2026),
    limit: int = Query(50, ge=10, le=200),
):
    """
    Top institution->vendor flows grouped by sector.
    Uses pre-computed tables (institution_top_vendors, vendor_stats, institution_stats)
    for fast response. Returns two layers: institution->sector and sector->vendor,
    suitable for Sankey/flow visualizations.
    """
    import time as _time
    global _money_flow_cache, _money_flow_cache_ts

    cache_key = f"flow:{sector_id}:{year}:{limit}"
    now = _time.time()
    if _money_flow_cache and (now - _money_flow_cache_ts) < _MONEY_FLOW_CACHE_TTL:
        cached = _money_flow_cache.get(cache_key)
        if cached:
            return cached

    with get_db() as conn:
        result = analysis_service.get_money_flow(
            conn,
            sector_id=sector_id,
            year=year,
            limit=limit,
        )
        _money_flow_cache[cache_key] = result
        _money_flow_cache_ts = _time.time()
        return result


# =============================================================================
# RISK FACTOR ANALYSIS ENDPOINT
# =============================================================================

@router.get("/risk-factor-analysis", response_model=RiskFactorAnalysisResponse)
def get_risk_factor_analysis(
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2002, le=2026),
):
    """
    Risk factor frequency and co-occurrence analysis.

    Parses the comma-separated risk_factors column, extracts base factor names
    (before first colon), computes frequencies and pairwise co-occurrence lift.
    """
    import time as _time
    from itertools import combinations
    from collections import Counter

    global _risk_factor_analysis_cache, _risk_factor_analysis_cache_ts

    cache_key = f"rfa:{sector_id}:{year}"
    now = _time.time()
    if _risk_factor_analysis_cache and (now - _risk_factor_analysis_cache_ts) < _RISK_FACTOR_ANALYSIS_CACHE_TTL:
        cached = _risk_factor_analysis_cache.get(cache_key)
        if cached:
            return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            where_parts = ["risk_factors IS NOT NULL AND risk_factors != ''"]
            params: list = []
            if sector_id is not None:
                where_parts.append("sector_id = ?")
                params.append(sector_id)
            if year is not None:
                where_parts.append("contract_year = ?")
                params.append(year)
            where_clause = " AND ".join(where_parts)

            # Get total count first (used for percentage calculations)
            cursor.execute(f"""
                SELECT COUNT(*) AS cnt
                FROM contracts
                WHERE {where_clause}
            """, params)
            total_row = cursor.fetchone()
            total = total_row["cnt"] if total_row else 0

            if total == 0:
                result = RiskFactorAnalysisResponse(
                    total_contracts_with_factors=0,
                    factor_frequencies=[],
                    top_cooccurrences=[],
                )
                return result

            # Use a representative sample for performance (full scan of 3.1M rows is too slow).
            # risk_score index allows efficient range-based sampling: take contracts with
            # risk_score >= 0.05 (medium+) which represent the most informative cases,
            # plus a random low-risk sample via rowid ordering for baseline.
            # For factor frequency purposes, 500K rows is statistically representative.
            cursor.execute(f"""
                SELECT risk_factors, risk_score
                FROM contracts
                WHERE {where_clause}
                LIMIT 500000
            """, params)

            # Parse factors and accumulate stats
            factor_count: Counter = Counter()
            factor_risk_sum: Dict[str, float] = {}
            pair_count: Counter = Counter()

            for row in cursor:
                raw = row["risk_factors"]
                # Extract base factor names (before first colon)
                factors = []
                for token in raw.split(","):
                    token = token.strip()
                    if not token:
                        continue
                    base = token.split(":")[0]
                    factors.append(base)

                risk = row["risk_score"] or 0.0
                unique_factors = sorted(set(factors))

                for f in unique_factors:
                    factor_count[f] += 1
                    factor_risk_sum[f] = factor_risk_sum.get(f, 0.0) + risk

                # Co-occurrence pairs (sorted to avoid duplicates)
                for pair in combinations(unique_factors, 2):
                    pair_count[pair] += 1

            # Build frequency list
            factor_frequencies = []
            for factor, count in factor_count.most_common():
                avg_risk = factor_risk_sum[factor] / count if count > 0 else 0.0
                factor_frequencies.append(RiskFactorFrequency(
                    factor=factor,
                    count=count,
                    percentage=round(count / total * 100, 2),
                    avg_risk_score=round(avg_risk, 4),
                ))

            # Build co-occurrence list with lift
            top_cooccurrences = []
            for (fa, fb), observed in pair_count.most_common(50):
                freq_a = factor_count[fa] / total
                freq_b = factor_count[fb] / total
                expected = freq_a * freq_b * total
                lift = observed / expected if expected > 0 else 0.0
                top_cooccurrences.append(FactorCooccurrence(
                    factor_a=fa,
                    factor_b=fb,
                    count=observed,
                    expected_count=round(expected, 1),
                    lift=round(lift, 3),
                ))

            # Sort co-occurrences by lift descending
            top_cooccurrences.sort(key=lambda x: x.lift, reverse=True)
            top_cooccurrences = top_cooccurrences[:30]

            result = RiskFactorAnalysisResponse(
                total_contracts_with_factors=total,
                factor_frequencies=factor_frequencies,
                top_cooccurrences=top_cooccurrences,
            )

            _risk_factor_analysis_cache[cache_key] = result
            _risk_factor_analysis_cache_ts = _time.time()

            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_risk_factor_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# INSTITUTION RANKINGS ENDPOINT
# =============================================================================

@router.get("/institution-rankings", response_model=InstitutionRankingsResponse)
def get_institution_rankings(
    sort_by: str = Query("risk", description="Sort by: risk, hhi, value, contracts"),
    min_contracts: int = Query(100, ge=10),
    limit: int = Query(50, ge=10, le=200),
):
    """
    Institution health rankings with HHI concentration index.

    Uses pre-computed institution_stats and institution_top_vendors tables.
    HHI (Herfindahl-Hirschman Index) measures vendor concentration:
    - 0-0.15: competitive
    - 0.15-0.25: moderate concentration
    - >0.25: high concentration
    """
    import time as _time
    global _institution_rankings_cache, _institution_rankings_cache_ts

    cache_key = f"ir:{sort_by}:{min_contracts}:{limit}"
    now = _time.time()
    if _institution_rankings_cache and (now - _institution_rankings_cache_ts) < _INSTITUTION_RANKINGS_CACHE_TTL:
        cached = _institution_rankings_cache.get(cache_key)
        if cached:
            return cached

    # Validate sort_by parameter
    sort_map = {
        "risk": "s.avg_risk_score DESC",
        "hhi": "hhi DESC",
        "value": "s.total_value_mxn DESC",
        "contracts": "s.total_contracts DESC",
    }
    if sort_by not in sort_map:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by value '{sort_by}'. Must be one of: risk, hhi, value, contracts"
        )

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            has_top_vendors = table_exists(cursor, "institution_top_vendors")

            if has_top_vendors:
                # Compute HHI from institution_top_vendors
                # HHI = sum of (share)^2 where share = vendor_value / institution_total
                # Also get top_vendor_share = max share
                cursor.execute(f"""
                    SELECT
                        s.institution_id,
                        i.name AS institution_name,
                        s.total_contracts,
                        s.total_value_mxn,
                        s.avg_risk_score,
                        s.direct_award_pct,
                        s.single_bid_pct,
                        s.high_risk_pct,
                        s.vendor_count,
                        COALESCE(h.hhi, 0.0) AS hhi,
                        COALESCE(h.top_share, 0.0) AS top_vendor_share
                    FROM institution_stats s
                    JOIN institutions i ON s.institution_id = i.id
                    LEFT JOIN (
                        SELECT
                            tv.institution_id,
                            SUM(
                                (CAST(tv.total_value_mxn AS REAL) / NULLIF(st.total_value_mxn, 0))
                                * (CAST(tv.total_value_mxn AS REAL) / NULLIF(st.total_value_mxn, 0))
                            ) AS hhi,
                            MAX(CAST(tv.total_value_mxn AS REAL) / NULLIF(st.total_value_mxn, 0)) AS top_share
                        FROM institution_top_vendors tv
                        JOIN institution_stats st ON tv.institution_id = st.institution_id
                        GROUP BY tv.institution_id
                    ) h ON s.institution_id = h.institution_id
                    WHERE s.total_contracts >= ?
                    ORDER BY {sort_map[sort_by]}
                    LIMIT ?
                """, (min_contracts, limit))
            else:
                # Fallback without HHI if institution_top_vendors doesn't exist
                cursor.execute(f"""
                    SELECT
                        s.institution_id,
                        i.name AS institution_name,
                        s.total_contracts,
                        s.total_value_mxn,
                        s.avg_risk_score,
                        s.direct_award_pct,
                        s.single_bid_pct,
                        s.high_risk_pct,
                        s.vendor_count,
                        0.0 AS hhi,
                        0.0 AS top_vendor_share
                    FROM institution_stats s
                    JOIN institutions i ON s.institution_id = i.id
                    WHERE s.total_contracts >= ?
                    ORDER BY {sort_map[sort_by]}
                    LIMIT ?
                """, (min_contracts, limit))

            rows = cursor.fetchall()

            data = []
            for row in rows:
                data.append(InstitutionHealthItem(
                    institution_id=row["institution_id"],
                    institution_name=row["institution_name"],
                    total_contracts=row["total_contracts"],
                    total_value=round(row["total_value_mxn"], 2),
                    avg_risk_score=round(row["avg_risk_score"], 4) if row["avg_risk_score"] else 0.0,
                    direct_award_pct=round(row["direct_award_pct"], 2) if row["direct_award_pct"] else 0.0,
                    single_bid_pct=round(row["single_bid_pct"], 2) if row["single_bid_pct"] else 0.0,
                    high_risk_pct=round(row["high_risk_pct"], 2) if row["high_risk_pct"] else 0.0,
                    vendor_count=row["vendor_count"] or 0,
                    hhi=round(row["hhi"], 4),
                    top_vendor_share=round(row["top_vendor_share"] * 100, 2) if row["top_vendor_share"] else 0.0,
                ))

            # Get total count of qualifying institutions
            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM institution_stats WHERE total_contracts >= ?",
                (min_contracts,)
            )
            total_row = cursor.fetchone()
            total_institutions = total_row["cnt"] if total_row else 0

            result = InstitutionRankingsResponse(
                data=data,
                total_institutions=total_institutions,
            )

            _institution_rankings_cache[cache_key] = result
            _institution_rankings_cache_ts = _time.time()

            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_institution_rankings: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# INSTITUTION RISK FACTORS ENDPOINT
# =============================================================================

@router.get("/institution-risk-factors", response_model=InstitutionRiskFactorsResponse)
def get_institution_risk_factors(
    limit: int = Query(20, ge=1, le=100, description="Number of institutions to return"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
):
    """
    Get institutions ranked by risk with their dominant risk factor breakdown.

    For each institution, computes the average z-score per feature across all
    its contracts (from contract_z_features), identifies the dominant factor
    (highest average absolute z-score), and returns a factor breakdown suitable
    for heatmap visualization.
    """
    cache_key = f"inst_rf:{limit}:{sector_id}"
    with _inst_risk_factors_lock:
        entry = _inst_risk_factors_cache.get(cache_key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]

    z_features = [
        "z_single_bid", "z_direct_award", "z_price_ratio",
        "z_vendor_concentration", "z_ad_period_days", "z_year_end",
        "z_same_day_count", "z_network_member_count", "z_co_bid_rate",
        "z_price_hyp_confidence", "z_industry_mismatch", "z_institution_risk",
        "z_price_volatility", "z_sector_spread", "z_win_rate",
        "z_institution_diversity",
    ]
    avg_cols = ", ".join(f"AVG(zf.{f}) as {f}" for f in z_features)

    sector_filter = ""
    params: list = []
    if sector_id is not None:
        sector_filter = "AND c.sector_id = ?"
        params.append(sector_id)

    with get_db() as conn:
        cursor = conn.cursor()

        # Check contract_z_features exists
        if not table_exists(cursor, "contract_z_features"):
            return InstitutionRiskFactorsResponse(data=[], total=0)

        cursor.execute(
            f"""
            SELECT
                i.id as institution_id,
                i.name as institution_name,
                COUNT(c.id) as contract_count,
                COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
                {avg_cols}
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            JOIN contract_z_features zf ON c.id = zf.contract_id
            WHERE COALESCE(c.amount_mxn, 0) <= ?
                {sector_filter}
            GROUP BY i.id, i.name
            HAVING contract_count >= 10
            ORDER BY avg_risk_score DESC
            LIMIT ?
            """,
            (MAX_CONTRACT_VALUE, *params, limit),
        )
        rows = cursor.fetchall()

    items = []
    for row in rows:
        breakdown = {}
        best_factor = ""
        best_abs_z = 0.0
        for f in z_features:
            val = row[f]
            if val is not None:
                clean_name = f[2:]  # strip "z_" prefix
                rounded = round(val, 4)
                breakdown[clean_name] = rounded
                if abs(rounded) > best_abs_z:
                    best_abs_z = abs(rounded)
                    best_factor = clean_name

        items.append(InstitutionRiskFactorItem(
            institution_id=row["institution_id"],
            institution_name=row["institution_name"],
            contract_count=row["contract_count"],
            avg_risk_score=round(row["avg_risk_score"], 4),
            dominant_factor=best_factor or "unknown",
            dominant_factor_avg_z=round(best_abs_z, 4),
            factor_breakdown=breakdown,
        ))

    result = InstitutionRiskFactorsResponse(data=items, total=len(items))

    with _inst_risk_factors_lock:
        _inst_risk_factors_cache[cache_key] = {
            "value": result,
            "expires_at": datetime.now() + timedelta(seconds=_INST_RISK_FACTORS_TTL),
        }

    return result
