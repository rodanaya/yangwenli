"""
Pattern Detection endpoints for the RUBLI analysis API.

Extracted from analysis.py (lines 1923–2551).
Covers: co-bidding patterns, vendor concentration, year-end spending patterns,
investigation leads, and institution period comparisons.
"""

import sqlite3
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Request
from pydantic import BaseModel, Field

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Rate limiting (graceful degradation if slowapi missing)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    _patterns_limiter = Limiter(key_func=get_remote_address)
except ImportError:
    _patterns_limiter = None


def _rate_limit(limit_string: str):
    """Rate limit decorator that degrades gracefully if slowapi is missing."""
    if _patterns_limiter:
        return _patterns_limiter.limit(limit_string)
    return lambda f: f


# =============================================================================
# RESPONSE MODELS
# =============================================================================

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


class InstitutionPeriodComparison(BaseModel):
    """Institution period comparison result."""
    name: str
    scandal_period: tuple
    control_period: tuple
    scandal_mean_risk: float
    control_mean_risk: float
    difference_pct: float
    is_significant: bool
    effect_size: str


class InstitutionPeriodResponse(BaseModel):
    """Institution period validation results."""
    institution_id: int
    institution_name: str
    analyses: List[InstitutionPeriodComparison]


class InstitutionPeriodComparisonResponse(BaseModel):
    institution_id: int
    institution_name: str
    period1: Dict[str, Any]
    period2: Dict[str, Any]
    comparison: Dict[str, Any]
    interpretation: str


# =============================================================================
# PATTERN DETECTION ENDPOINTS
# =============================================================================

@router.get("/patterns/co-bidding", response_model=CoBiddingResponse)
@_rate_limit("30/minute")
def get_co_bidding_patterns(
    request: Request,
    min_co_bids: int = Query(5, ge=2, description="Minimum co-bid count"),
    min_rate: float = Query(50.0, ge=0, le=100, description="Minimum co-bid rate %"),
    limit: int = Query(100, ge=1, le=500, description="Maximum pairs to return"),
):
    """
    Analyze co-bidding patterns to detect potential collusion.

    Returns vendor pairs that frequently appear in the same procedures.
    High co-bid rates (>80%) suggest coordinated bidding or related entities.
    Reads from precomputed co_bidding_stats table (run scripts/precompute_cobidding.py to refresh).
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if precomputed table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='co_bidding_stats'"
            )
            if not cursor.fetchone():
                logger.warning("co_bidding_stats table not found. Run: python -m scripts.precompute_cobidding")
                return CoBiddingResponse(
                    total_pairs_analyzed=0,
                    high_confidence_pairs=0,
                    potential_collusion_pairs=0,
                    pairs=[]
                )

            # Read from precomputed table with filters
            cursor.execute("""
                SELECT vendor_id_a, vendor_id_b, shared_procedures,
                       co_bid_rate, is_potential_collusion
                FROM co_bidding_stats
                WHERE shared_procedures >= ? AND co_bid_rate >= ?
                ORDER BY shared_procedures DESC
                LIMIT ?
            """, (min_co_bids, min_rate, limit))

            rows = cursor.fetchall()

            # Count totals for response metadata
            cursor.execute(
                "SELECT COUNT(*) FROM co_bidding_stats WHERE shared_procedures >= ?",
                (min_co_bids,)
            )
            total_analyzed = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM co_bidding_stats WHERE shared_procedures >= ? AND co_bid_rate >= ?",
                (min_co_bids, min_rate)
            )
            high_confidence_count = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM co_bidding_stats WHERE shared_procedures >= ? AND is_potential_collusion = 1",
                (min_co_bids,)
            )
            potential_collusion = cursor.fetchone()[0]

            # Get vendor names in batch
            vendor_ids = set()
            for row in rows:
                vendor_ids.add(row['vendor_id_a'])
                vendor_ids.add(row['vendor_id_b'])

            vendor_names = {}
            if vendor_ids:
                placeholders = ','.join(['?' for _ in vendor_ids])
                # Safe: placeholders are '?' joined, vendor_ids are ints from prior DB query
                cursor.execute(
                    f"SELECT id, name FROM vendors WHERE id IN ({placeholders})",
                    list(vendor_ids)
                )
                vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

            pairs = []
            for row in rows:
                pairs.append(CoBiddingPair(
                    vendor_1_id=row['vendor_id_a'],
                    vendor_1_name=vendor_names.get(row['vendor_id_a'], f"ID:{row['vendor_id_a']}"),
                    vendor_2_id=row['vendor_id_b'],
                    vendor_2_name=vendor_names.get(row['vendor_id_b'], f"ID:{row['vendor_id_b']}"),
                    co_bid_count=row['shared_procedures'],
                    co_bid_rate=round(row['co_bid_rate'], 1),
                    is_potential_collusion=bool(row['is_potential_collusion'])
                ))

            return CoBiddingResponse(
                total_pairs_analyzed=total_analyzed,
                high_confidence_pairs=high_confidence_count,
                potential_collusion_pairs=potential_collusion,
                pairs=pairs
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_co_bidding_patterns: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


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
                      AND amount_mxn < ?
                    GROUP BY institution_id
                    HAVING total_contracts >= ?
                ),
                vendor_shares AS (
                    SELECT
                        c.institution_id,
                        c.vendor_id,
                        COUNT(*) as vendor_contracts,
                        SUM(c.amount_mxn) as vendor_value,
                        AVG(CASE WHEN c.risk_score IS NOT NULL THEN c.risk_score END) as avg_risk_score,
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
                    vs.avg_risk_score,
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
            """, (MAX_CONTRACT_VALUE, min_contracts, min_share, limit))

            alerts = []
            for row in cursor.fetchall():
                avg_risk = row['avg_risk_score']

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
                "amount_mxn > 0", "amount_mxn < ?"
            ]
            params: List[Any] = [start_year, end_year, MAX_CONTRACT_VALUE]

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


@router.get("/leads", response_model=InvestigationLeadsResponse)
@_rate_limit("30/minute")
def get_investigation_leads(
    request: Request,
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
                    "c.amount_mxn < ?"
                ]
                params: List[Any] = [MAX_CONTRACT_VALUE]

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
                    "c.amount_mxn < ?"
                ]
                params = [MAX_CONTRACT_VALUE]

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
                      AND amount_mxn > 0 AND amount_mxn < ?
                """, (institution_id, start, end, MAX_CONTRACT_VALUE))
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
