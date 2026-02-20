"""
API router for advanced analysis endpoints.

Provides temporal analysis, monthly breakdowns, year-over-year trends,
price hypothesis analysis, and event-based analysis.
"""

import sqlite3
import logging
import json
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..config.temporal_events import TEMPORAL_EVENTS, TemporalEventData
from ..helpers.analysis_helpers import (
    build_where_clause,
    parse_json_evidence,
    row_to_hypothesis_dict,
    table_exists,
    calculate_pagination,
    pct_change,
)
from ..services.analysis_service import analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class MonthlyDataPoint(BaseModel):
    """Monthly breakdown data point."""
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    month_name: str = Field(..., description="Month name")
    contracts: int = Field(..., description="Number of contracts")
    value: float = Field(..., description="Total contract value")
    avg_risk: float = Field(..., description="Average risk score")
    direct_award_count: int = Field(default=0)
    single_bid_count: int = Field(default=0)
    is_year_end: bool = Field(default=False, description="True for December")


class MonthlyBreakdownResponse(BaseModel):
    """Monthly breakdown for a year."""
    year: int
    months: List[MonthlyDataPoint]
    total_contracts: int
    total_value: float
    avg_risk: float
    december_spike: Optional[float] = Field(None, description="December vs monthly average ratio")


class YearlyTrendItem(BaseModel):
    """Year-over-year trend item."""
    year: int
    contracts: int
    total_value: float
    avg_risk: float
    direct_award_pct: float
    single_bid_pct: float
    high_risk_pct: float
    vendor_count: int
    institution_count: int


class YearOverYearResponse(BaseModel):
    """Year-over-year trends."""
    data: List[YearlyTrendItem]
    total_years: int
    min_year: int
    max_year: int


class TemporalEvent(BaseModel):
    """A significant event affecting procurement."""
    id: str
    date: str = Field(..., description="Date in YYYY-MM format")
    year: int
    month: Optional[int] = None
    type: str = Field(..., description="Event type: election, budget, audit, anomaly, milestone, crisis")
    title: str
    description: str
    impact: str = Field(default="medium", description="Impact level: high, medium, low")
    source: Optional[str] = None


class TemporalEventsResponse(BaseModel):
    """List of temporal events."""
    events: List[TemporalEvent]
    total: int


class PeriodComparisonResponse(BaseModel):
    """Comparison between two time periods."""
    period1: Dict[str, Any]
    period2: Dict[str, Any]
    changes: Dict[str, float] = Field(..., description="Percentage changes")
    significant_changes: List[str] = Field(..., description="Notable differences")


# Price hypothesis models
class PriceHypothesisItem(BaseModel):
    """A price manipulation hypothesis."""
    id: int
    hypothesis_id: str
    contract_id: int
    hypothesis_type: str
    confidence: float = Field(..., ge=0, le=1)
    confidence_level: str
    explanation: str
    supporting_evidence: List[Dict[str, Any]]
    recommended_action: str
    literature_reference: str
    sector_id: Optional[int] = None
    vendor_id: Optional[int] = None
    amount_mxn: Optional[float] = None
    is_reviewed: bool = False
    is_valid: Optional[bool] = None
    review_notes: Optional[str] = None
    created_at: str


class PriceHypothesesResponse(BaseModel):
    """List of price hypotheses with pagination."""
    data: List[PriceHypothesisItem]
    pagination: Dict[str, int]
    summary: Dict[str, Any]


class PriceHypothesisDetailResponse(BaseModel):
    """Detailed price hypothesis with contract context."""
    hypothesis: PriceHypothesisItem
    contract: Dict[str, Any]
    sector_baseline: Optional[Dict[str, Any]] = None
    vendor_profile: Optional[Dict[str, Any]] = None
    similar_contracts: List[Dict[str, Any]] = []


class ContractPriceAnalysisResponse(BaseModel):
    """Price analysis for a specific contract."""
    contract_id: int
    amount_mxn: float
    sector_id: Optional[int]
    sector_name: Optional[str]
    sector_comparison: Optional[Dict[str, Any]]
    vendor_comparison: Optional[Dict[str, Any]]
    hypotheses: List[PriceHypothesisItem]
    price_percentile: Optional[float] = None
    is_outlier: bool = False
    outlier_type: Optional[str] = None


class SectorPriceBaselineResponse(BaseModel):
    """Sector price baseline statistics."""
    sector_id: int
    sector_name: Optional[str]
    contract_type: str
    percentile_10: float
    percentile_25: float
    percentile_50: float
    percentile_75: float
    percentile_90: float
    percentile_95: float
    mean_value: float
    std_dev: float
    iqr: float
    upper_fence: float
    extreme_fence: float
    sample_count: int


class HypothesisReviewRequest(BaseModel):
    """Request to review/validate a hypothesis."""
    is_valid: bool = Field(..., description="True if confirmed, False if dismissed")
    review_notes: Optional[str] = Field(None, description="Reviewer notes")


# =============================================================================
# MONTH NAMES CONSTANT
# =============================================================================

MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]




# =============================================================================
# MODEL METADATA ENDPOINT
# =============================================================================

@router.get("/model/metadata")
def get_model_metadata():
    """
    Return metadata about the active risk model (version, training date, metrics).
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            row = cursor.execute(
                "SELECT model_version, created_at, auc_roc, pu_correction_factor FROM model_calibration ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            if not row:
                return {"version": "v5.0", "trained_at": "2026-02-14", "n_contracts": 3110007, "auc_test": 0.960}
            return {
                "version": row["model_version"],
                "trained_at": row["created_at"],
                "auc_test": row["auc_roc"],
                "pu_correction": row["pu_correction_factor"],
            }
    except Exception as e:
        logger.error(f"Error in get_model_metadata: {e}")
        return {"version": "v5.0", "trained_at": "2026-02-14", "n_contracts": 3110007, "auc_test": 0.960}


# =============================================================================
# COMBINED RISK OVERVIEW ENDPOINT
# =============================================================================

@router.get("/risk-overview")
def get_risk_overview():
    """
    Combined risk analysis data for the Risk Analysis page.
    Returns overview + risk distribution + yearly trends in one request.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get overview from precomputed_stats
            cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'overview'")
            row = cursor.fetchone()
            overview = json.loads(row['stat_value']) if row else {}

            # Get risk distribution from precomputed_stats
            cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'risk_distribution'")
            row = cursor.fetchone()
            risk_distribution = json.loads(row['stat_value']) if row else []

            # Get yearly trends from precomputed_stats
            cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'yearly_trends'")
            row = cursor.fetchone()
            yearly_trends = json.loads(row['stat_value']) if row else []

            return {
                "overview": overview,
                "risk_distribution": risk_distribution,
                "yearly_trends": yearly_trends,
            }
    except Exception as e:
        logger.error(f"Error in get_risk_overview: {e}")
        raise HTTPException(status_code=500, detail="Database error")


# =============================================================================
# PATTERN COUNTS ENDPOINT (for DetectivePatterns page)
# =============================================================================

_pattern_counts_cache: Dict[str, Any] = {}
_pattern_counts_ts: float = 0

@router.get("/patterns/counts")
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
# TEMPORAL ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/monthly-breakdown/{year}", response_model=MonthlyBreakdownResponse)
def get_monthly_breakdown(
    year: int = Path(..., ge=2002, le=2026, description="Year to analyze"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
):
    """Get monthly breakdown of contracts for a specific year."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = ["contract_year = ?", "COALESCE(amount_mxn, 0) <= ?"]
            params: List[Any] = [year, MAX_CONTRACT_VALUE]

            where_clause, params = build_where_clause(
                conditions, params,
                sector_id=sector_id,
                institution_id=institution_id
            )

            cursor.execute(f"""
                SELECT
                    CAST(strftime('%m', contract_date) AS INTEGER) as month,
                    COUNT(*) as contracts,
                    COALESCE(SUM(amount_mxn), 0) as value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count
                FROM contracts
                WHERE {where_clause}
                AND contract_date IS NOT NULL
                AND strftime('%m', contract_date) IS NOT NULL
                GROUP BY month
                ORDER BY month
            """, params)

            # Initialize all months
            monthly_data = {i: {
                'month': i,
                'month_name': MONTH_NAMES[i-1],
                'contracts': 0, 'value': 0, 'avg_risk': 0,
                'direct_award_count': 0, 'single_bid_count': 0,
                'is_year_end': i == 12
            } for i in range(1, 13)}

            for row in cursor.fetchall():
                m = row["month"]
                if m and 1 <= m <= 12:
                    monthly_data[m].update({
                        'contracts': row["contracts"],
                        'value': row["value"],
                        'avg_risk': round(row["avg_risk"], 4) if row["avg_risk"] else 0,
                        'direct_award_count': row["direct_award_count"] or 0,
                        'single_bid_count': row["single_bid_count"] or 0,
                    })

            months = [MonthlyDataPoint(**monthly_data[i]) for i in range(1, 13)]
            total_contracts = sum(m.contracts for m in months)
            total_value = sum(m.value for m in months)
            avg_risk = sum(m.avg_risk * m.contracts for m in months) / max(1, total_contracts)

            # December spike calculation
            other_months_avg = sum(monthly_data[i]['value'] for i in range(1, 12)) / 11
            december_spike = None
            if other_months_avg > 0:
                december_spike = round(monthly_data[12]['value'] / other_months_avg, 2)

            return MonthlyBreakdownResponse(
                year=year, months=months, total_contracts=total_contracts,
                total_value=total_value, avg_risk=round(avg_risk, 4),
                december_spike=december_spike
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_monthly_breakdown: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


_yoy_cache: Dict[str, Any] = {}
_YOY_CACHE_TTL = 600  # 10 minutes


@router.get("/year-over-year", response_model=YearOverYearResponse)
def get_year_over_year(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    start_year: Optional[int] = Query(None, ge=2002, le=2026, description="Start year"),
    end_year: Optional[int] = Query(None, ge=2002, le=2026, description="End year"),
):
    """Get year-over-year trends."""
    import time as _time
    cache_key = f"yoy:{sector_id}:{start_year}:{end_year}"
    cached = _yoy_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _YOY_CACHE_TTL:
        return cached["data"]

    with get_db() as conn:
        result = analysis_service.get_year_over_year(
            conn,
            sector_id=sector_id,
            start_year=start_year,
            end_year=end_year,
        )
        _yoy_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


# -- Sector-Year Breakdown (for Administration Analysis page) ----------------

class SectorYearItem(BaseModel):
    """Single sector-year data point."""
    year: int
    sector_id: int
    contracts: int
    total_value: float
    avg_risk: float
    direct_award_pct: float
    single_bid_pct: Optional[float] = None
    high_risk_pct: float
    vendor_count: int
    institution_count: int


class SectorYearBreakdownResponse(BaseModel):
    """Sector x Year cross-tabulation."""
    data: List[SectorYearItem]
    total_rows: int


_sector_year_cache: Dict[str, Any] = {}
_SECTOR_YEAR_CACHE_TTL = 600  # 10 minutes


@router.get("/sector-year-breakdown", response_model=SectorYearBreakdownResponse)
def get_sector_year_breakdown():
    """Get sector x year cross-tabulation for administration analysis."""
    try:
        import time as _time
        cache_key = "sector_year_all"
        cached = _sector_year_cache.get(cache_key)
        if cached and (_time.time() - cached["ts"]) < _SECTOR_YEAR_CACHE_TTL:
            return cached["data"]

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    contract_year as year, sector_id,
                    COUNT(*) as contracts,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 /
                        NULLIF(SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END), 0) as single_bid_pct,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct,
                    COUNT(DISTINCT vendor_id) as vendor_count,
                    COUNT(DISTINCT institution_id) as institution_count
                FROM contracts
                WHERE contract_year IS NOT NULL AND sector_id IS NOT NULL
                GROUP BY contract_year, sector_id
                ORDER BY contract_year, sector_id
            """)

            data = [SectorYearItem(
                year=row["year"], sector_id=row["sector_id"],
                contracts=row["contracts"],
                total_value=row["total_value"],
                avg_risk=round(row["avg_risk"], 4) if row["avg_risk"] else 0,
                direct_award_pct=round(row["direct_award_pct"], 1) if row["direct_award_pct"] else 0,
                single_bid_pct=round(row["single_bid_pct"], 1) if row["single_bid_pct"] else None,
                high_risk_pct=round(row["high_risk_pct"], 2) if row["high_risk_pct"] else 0,
                vendor_count=row["vendor_count"],
                institution_count=row["institution_count"]
            ) for row in cursor.fetchall()]

            result = SectorYearBreakdownResponse(data=data, total_rows=len(data))
            _sector_year_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_year_breakdown: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/temporal-events", response_model=TemporalEventsResponse)
def get_temporal_events(
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    event_type: Optional[str] = Query(None, description="Filter by type"),
    impact: Optional[str] = Query(None, description="Filter by impact"),
):
    """Get significant temporal events affecting procurement."""
    events = [
        TemporalEvent(
            id=e.id, date=e.date, year=e.year, month=e.month,
            type=e.type, title=e.title, description=e.description,
            impact=e.impact, source=e.source
        )
        for e in TEMPORAL_EVENTS
        if (year is None or e.year == year)
        and (event_type is None or e.type == event_type)
        and (impact is None or e.impact == impact)
    ]
    events.sort(key=lambda e: e.date, reverse=True)
    return TemporalEventsResponse(events=events, total=len(events))


@router.get("/compare-periods", response_model=PeriodComparisonResponse)
def compare_periods(
    period1_start: int = Query(..., ge=2002, le=2026),
    period1_end: int = Query(..., ge=2002, le=2026),
    period2_start: int = Query(..., ge=2002, le=2026),
    period2_end: int = Query(..., ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
):
    """Compare procurement patterns between two time periods."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            def get_period_stats(start: int, end: int) -> dict:
                conditions = [
                    "contract_year >= ?", "contract_year <= ?",
                    "COALESCE(amount_mxn, 0) <= ?"
                ]
                params: List[Any] = [start, end, MAX_CONTRACT_VALUE]
                if sector_id:
                    conditions.append("sector_id = ?")
                    params.append(sector_id)

                cursor.execute(f"""
                    SELECT
                        COUNT(*) as contracts,
                        COALESCE(SUM(amount_mxn), 0) as total_value,
                        COALESCE(AVG(amount_mxn), 0) as avg_value,
                        COALESCE(AVG(risk_score), 0) as avg_risk,
                        SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                        SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 /
                            NULLIF(SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END), 0) as single_bid_pct,
                        SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct,
                        COUNT(DISTINCT vendor_id) as unique_vendors,
                        COUNT(DISTINCT institution_id) as unique_institutions
                    FROM contracts
                    WHERE {" AND ".join(conditions)}
                """, params)

                row = cursor.fetchone()
                return {
                    "period": f"{start}-{end}",
                    "contracts": row["contracts"],
                    "total_value": row["total_value"],
                    "avg_contract_value": round(row["avg_value"], 2) if row["avg_value"] else 0,
                    "avg_risk_score": round(row["avg_risk"], 4) if row["avg_risk"] else 0,
                    "direct_award_pct": round(row["direct_award_pct"], 1) if row["direct_award_pct"] else 0,
                    "single_bid_pct": round(row["single_bid_pct"], 1) if row["single_bid_pct"] else 0,
                    "high_risk_pct": round(row["high_risk_pct"], 2) if row["high_risk_pct"] else 0,
                    "unique_vendors": row["unique_vendors"],
                    "unique_institutions": row["unique_institutions"]
                }

            period1 = get_period_stats(period1_start, period1_end)
            period2 = get_period_stats(period2_start, period2_end)

            changes = {
                "contracts": pct_change(period1["contracts"], period2["contracts"]),
                "total_value": pct_change(period1["total_value"], period2["total_value"]),
                "avg_contract_value": pct_change(period1["avg_contract_value"], period2["avg_contract_value"]),
                "avg_risk_score": pct_change(period1["avg_risk_score"] * 100, period2["avg_risk_score"] * 100),
                "direct_award_pct": period2["direct_award_pct"] - period1["direct_award_pct"],
                "single_bid_pct": period2["single_bid_pct"] - period1["single_bid_pct"],
                "high_risk_pct": period2["high_risk_pct"] - period1["high_risk_pct"],
                "unique_vendors": pct_change(period1["unique_vendors"], period2["unique_vendors"]),
            }

            significant = []
            if abs(changes["contracts"]) > 20:
                dir_ = "increased" if changes["contracts"] > 0 else "decreased"
                significant.append(f"Contract count {dir_} by {abs(changes['contracts']):.1f}%")
            if abs(changes["total_value"]) > 20:
                dir_ = "increased" if changes["total_value"] > 0 else "decreased"
                significant.append(f"Total value {dir_} by {abs(changes['total_value']):.1f}%")
            if abs(changes["direct_award_pct"]) > 5:
                dir_ = "increased" if changes["direct_award_pct"] > 0 else "decreased"
                significant.append(f"Direct award rate {dir_} by {abs(changes['direct_award_pct']):.1f} points")
            if abs(changes["single_bid_pct"]) > 5:
                dir_ = "increased" if changes["single_bid_pct"] > 0 else "decreased"
                significant.append(f"Single bid rate {dir_} by {abs(changes['single_bid_pct']):.1f} points")
            if abs(changes["avg_risk_score"]) > 10:
                dir_ = "worsened" if changes["avg_risk_score"] > 0 else "improved"
                significant.append(f"Average risk {dir_} by {abs(changes['avg_risk_score']):.1f}%")

            return PeriodComparisonResponse(
                period1=period1, period2=period2,
                changes=changes, significant_changes=significant
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in compare_periods: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/december-spike-analysis")
def get_december_spike_analysis(
    start_year: int = Query(2015, ge=2002, le=2026),
    end_year: int = Query(2024, ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
):
    """Analyze year-end spending spikes across multiple years."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = [
                "contract_year >= ?", "contract_year <= ?",
                "COALESCE(amount_mxn, 0) <= ?",
                "contract_date IS NOT NULL"
            ]
            params: List[Any] = [start_year, end_year, MAX_CONTRACT_VALUE]

            if sector_id:
                conditions.append("sector_id = ?")
                params.append(sector_id)

            cursor.execute(f"""
                WITH monthly AS (
                    SELECT contract_year as year,
                           CAST(strftime('%m', contract_date) AS INTEGER) as month,
                           COUNT(*) as contracts,
                           COALESCE(SUM(amount_mxn), 0) as value
                    FROM contracts
                    WHERE {" AND ".join(conditions)}
                    GROUP BY contract_year, month
                ),
                yearly_avg AS (
                    SELECT year,
                           AVG(CASE WHEN month != 12 THEN value END) as avg_other_months,
                           SUM(CASE WHEN month = 12 THEN value ELSE 0 END) as december_value,
                           SUM(CASE WHEN month = 12 THEN contracts ELSE 0 END) as december_contracts
                    FROM monthly
                    GROUP BY year
                )
                SELECT year, december_value, december_contracts, avg_other_months,
                       CASE WHEN avg_other_months > 0 THEN december_value / avg_other_months ELSE NULL END as spike_ratio
                FROM yearly_avg WHERE december_value > 0 ORDER BY year
            """, params)

            years_data = [{
                "year": row["year"],
                "december_value": row["december_value"],
                "december_contracts": row["december_contracts"],
                "avg_monthly_value": round(row["avg_other_months"], 2) if row["avg_other_months"] else 0,
                "spike_ratio": round(row["spike_ratio"], 2) if row["spike_ratio"] else None,
                "is_significant": row["spike_ratio"] and row["spike_ratio"] > 1.5
            } for row in cursor.fetchall()]

            spike_ratios = [y["spike_ratio"] for y in years_data if y["spike_ratio"]]
            avg_spike = sum(spike_ratios) / len(spike_ratios) if spike_ratios else 0

            return {
                "years": years_data,
                "average_spike_ratio": round(avg_spike, 2),
                "years_with_significant_spike": sum(1 for y in years_data if y["is_significant"]),
                "total_years_analyzed": len(years_data),
                "pattern_detected": avg_spike > 1.3,
                "description": f"December spending averages {avg_spike:.1f}x other months" if avg_spike > 1 else "No significant December spike pattern"
            }

    except sqlite3.Error as e:
        logger.error(f"Database error in get_december_spike_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# PRICE HYPOTHESIS ENDPOINTS
# =============================================================================

@router.get("/price-hypotheses", response_model=PriceHypothesesResponse)
def list_price_hypotheses(
    hypothesis_type: Optional[str] = Query(None),
    confidence_level: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None, ge=0, le=1),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    is_reviewed: Optional[bool] = Query(None),
    is_valid: Optional[bool] = Query(None),
    sort_by: str = Query("confidence"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    """List price manipulation hypotheses with filtering and pagination."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "price_hypotheses"):
                return PriceHypothesesResponse(
                    data=[],
                    pagination={"page": page, "per_page": per_page, "total": 0, "total_pages": 0},
                    summary={"message": "Run price_hypothesis_engine.py first."}
                )

            conditions = ["1=1"]
            params: List[Any] = []

            where_clause, params = build_where_clause(
                conditions, params,
                sector_id=sector_id,
                hypothesis_type=hypothesis_type,
                confidence_level=confidence_level,
                min_confidence=min_confidence,
                is_reviewed=is_reviewed,
                is_valid=is_valid
            )

            sort_map = {"confidence": "confidence", "amount": "amount_mxn", "created_at": "created_at"}
            sort_col = sort_map.get(sort_by, "confidence")
            sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"

            cursor.execute(f"SELECT COUNT(*) FROM price_hypotheses WHERE {where_clause}", params)
            total = cursor.fetchone()[0]

            offset = (page - 1) * per_page
            cursor.execute(f"""
                SELECT id, hypothesis_id, contract_id, hypothesis_type, confidence,
                       confidence_level, explanation, supporting_evidence,
                       recommended_action, literature_reference, sector_id,
                       vendor_id, amount_mxn, is_reviewed, is_valid, review_notes, created_at
                FROM price_hypotheses
                WHERE {where_clause}
                ORDER BY {sort_col} {sort_dir}
                LIMIT ? OFFSET ?
            """, params + [per_page, offset])

            data = [PriceHypothesisItem(**row_to_hypothesis_dict(row)) for row in cursor.fetchall()]

            cursor.execute(f"""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN confidence_level = 'very_high' THEN 1 ELSE 0 END) as very_high,
                       SUM(CASE WHEN confidence_level = 'high' THEN 1 ELSE 0 END) as high,
                       SUM(CASE WHEN confidence_level = 'medium' THEN 1 ELSE 0 END) as medium,
                       SUM(CASE WHEN confidence_level = 'low' THEN 1 ELSE 0 END) as low,
                       SUM(CASE WHEN is_reviewed = 1 THEN 1 ELSE 0 END) as reviewed,
                       SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as confirmed,
                       COALESCE(SUM(amount_mxn), 0) as total_value
                FROM price_hypotheses WHERE {where_clause}
            """, params)

            sr = cursor.fetchone()
            summary = {
                "total_hypotheses": sr[0],
                "by_confidence": {"very_high": sr[1], "high": sr[2], "medium": sr[3], "low": sr[4]},
                "reviewed_count": sr[5], "confirmed_count": sr[6],
                "total_flagged_value": sr[7]
            }

            return PriceHypothesesResponse(
                data=data,
                pagination=calculate_pagination(total, page, per_page),
                summary=summary
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in list_price_hypotheses: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/price-hypotheses/summary")
def get_price_hypotheses_summary():
    """Get summary statistics for price hypotheses, computed live across all contracts."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # --- Live analysis: compute outliers from ALL contracts using sector baselines ---
            cursor.execute("""
                SELECT
                    SUM(CASE WHEN c.amount_mxn > b.extreme_fence THEN 1 ELSE 0 END) AS extreme_overpricing,
                    SUM(CASE WHEN c.amount_mxn > b.upper_fence
                              AND c.amount_mxn <= b.extreme_fence THEN 1 ELSE 0 END) AS statistical_outlier,
                    SUM(CASE WHEN c.amount_mxn > b.upper_fence THEN 1 ELSE 0 END) AS total_flagged,
                    COALESCE(SUM(CASE WHEN c.amount_mxn > b.upper_fence THEN c.amount_mxn ELSE 0 END), 0) AS flagged_value,
                    COUNT(*) AS total_analyzed
                FROM contracts c
                JOIN sector_price_baselines b
                  ON c.sector_id = b.sector_id
                  AND b.contract_type = 'all'
                  AND b.year IS NULL
                WHERE c.amount_mxn > 0
            """)
            live = cursor.fetchone()
            live_extreme = live["extreme_overpricing"] or 0
            live_outlier = live["statistical_outlier"] or 0
            live_total_flagged = live["total_flagged"] or 0
            live_flagged_value = live["flagged_value"] or 0
            live_total_analyzed = live["total_analyzed"] or 0

            cursor.execute("""
                SELECT
                    c.sector_id,
                    s.name_es AS sector_name,
                    SUM(CASE WHEN c.amount_mxn > b.extreme_fence THEN 1 ELSE 0 END) AS extreme_overpricing,
                    SUM(CASE WHEN c.amount_mxn > b.upper_fence
                              AND c.amount_mxn <= b.extreme_fence THEN 1 ELSE 0 END) AS statistical_outlier,
                    SUM(CASE WHEN c.amount_mxn > b.upper_fence THEN 1 ELSE 0 END) AS total_flagged,
                    COALESCE(SUM(CASE WHEN c.amount_mxn > b.upper_fence THEN c.amount_mxn ELSE 0 END), 0) AS flagged_value
                FROM contracts c
                JOIN sector_price_baselines b
                  ON c.sector_id = b.sector_id
                  AND b.contract_type = 'all'
                  AND b.year IS NULL
                JOIN sectors s ON c.sector_id = s.id
                WHERE c.amount_mxn > 0
                GROUP BY c.sector_id, s.name_es
                ORDER BY total_flagged DESC
            """)
            live_by_sector = [
                {
                    "sector_id": r["sector_id"],
                    "sector_name": r["sector_name"],
                    "count": r["total_flagged"],
                    "total_value": r["flagged_value"],
                }
                for r in cursor.fetchall()
            ]

            by_type = [
                {"type": "extreme_overpricing", "count": live_extreme, "avg_confidence": 0.95, "total_value": 0},
                {"type": "statistical_outlier", "count": live_outlier, "avg_confidence": 0.75, "total_value": 0},
            ]

            # --- Review workflow stats (from pre-computed price_hypotheses table) ---
            pending_review = confirmed = dismissed = 0
            avg_confidence = 0.0
            by_confidence: list = []
            recent_runs: list = []

            if table_exists(cursor, "price_hypotheses"):
                cursor.execute("""
                    SELECT
                        SUM(CASE WHEN is_reviewed = 0 THEN 1 ELSE 0 END) as pending_review,
                        SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as confirmed,
                        SUM(CASE WHEN is_valid = 0 THEN 1 ELSE 0 END) as dismissed,
                        AVG(confidence) as avg_confidence
                    FROM price_hypotheses
                """)
                ph = cursor.fetchone()
                if ph:
                    pending_review = ph["pending_review"] or 0
                    confirmed = ph["confirmed"] or 0
                    dismissed = ph["dismissed"] or 0
                    avg_confidence = round(ph["avg_confidence"], 3) if ph["avg_confidence"] else 0

                cursor.execute("""
                    SELECT confidence_level, COUNT(*) as count FROM price_hypotheses
                    GROUP BY confidence_level
                    ORDER BY CASE confidence_level
                        WHEN 'very_high' THEN 1 WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
                """)
                by_confidence = [{"level": r[0], "count": r[1]} for r in cursor.fetchall()]

            if table_exists(cursor, "hypothesis_runs"):
                cursor.execute("""
                    SELECT run_id, started_at, completed_at, contracts_analyzed, hypotheses_generated, status
                    FROM hypothesis_runs ORDER BY started_at DESC LIMIT 5
                """)
                recent_runs = [
                    {"run_id": r[0], "started_at": r[1], "completed_at": r[2],
                     "contracts_analyzed": r[3], "hypotheses_generated": r[4], "status": r[5]}
                    for r in cursor.fetchall()
                ]

            return {
                "status": "active",
                "overall": {
                    "total_hypotheses": live_total_flagged,
                    "pending_review": pending_review,
                    "confirmed": confirmed,
                    "dismissed": dismissed,
                    "total_flagged_value": live_flagged_value,
                    "avg_confidence": avg_confidence,
                    "total_analyzed": live_total_analyzed,
                },
                "by_type": by_type,
                "by_sector": live_by_sector,
                "by_confidence": by_confidence,
                "recent_runs": recent_runs,
            }

    except sqlite3.Error as e:
        logger.error(f"Database error in get_price_hypotheses_summary: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/price-hypotheses/{hypothesis_id}", response_model=PriceHypothesisDetailResponse)
def get_price_hypothesis_detail(hypothesis_id: str = Path(...)):
    """Get detailed information about a specific price hypothesis."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, hypothesis_id, contract_id, hypothesis_type, confidence,
                       confidence_level, explanation, supporting_evidence,
                       recommended_action, literature_reference, sector_id,
                       vendor_id, amount_mxn, is_reviewed, is_valid, review_notes, created_at
                FROM price_hypotheses WHERE hypothesis_id = ?
            """, (hypothesis_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")

            hypothesis = PriceHypothesisItem(**row_to_hypothesis_dict(row))
            contract_id, sector_id, vendor_id = row[2], row[10], row[11]

            # Get contract details
            cursor.execute("""
                SELECT c.id, c.numero_procedimiento, c.titulo, c.amount_mxn,
                       c.contract_date, c.contract_year, c.sector_id,
                       c.is_direct_award, c.is_single_bid, c.risk_score, c.risk_level,
                       s.name_es as sector_name, v.name as vendor_name, i.name as institution_name
                FROM contracts c
                LEFT JOIN sectors s ON c.sector_id = s.id
                LEFT JOIN vendors v ON c.vendor_id = v.id
                LEFT JOIN institutions i ON c.institution_id = i.id
                WHERE c.id = ?
            """, (contract_id,))

            cr = cursor.fetchone()
            contract = {
                "id": cr[0], "numero_procedimiento": cr[1], "titulo": cr[2],
                "amount_mxn": cr[3], "contract_date": cr[4], "contract_year": cr[5],
                "sector_id": cr[6], "is_direct_award": bool(cr[7]), "is_single_bid": bool(cr[8]),
                "risk_score": cr[9], "risk_level": cr[10], "sector_name": cr[11],
                "vendor_name": cr[12], "institution_name": cr[13]
            } if cr else {}

            # Get sector baseline
            sector_baseline = None
            if sector_id:
                cursor.execute("""
                    SELECT sector_id, percentile_50, percentile_75, percentile_95,
                           upper_fence, extreme_fence, mean_value, std_dev, sample_count
                    FROM sector_price_baselines
                    WHERE sector_id = ? AND contract_type = 'all' AND year IS NULL
                """, (sector_id,))
                br = cursor.fetchone()
                if br:
                    sector_baseline = {
                        "sector_id": br[0], "median": br[1], "p75": br[2], "p95": br[3],
                        "upper_fence": br[4], "extreme_fence": br[5],
                        "mean": br[6], "std_dev": br[7], "sample_count": br[8]
                    }

            # Get vendor profile
            vendor_profile = None
            if vendor_id:
                cursor.execute("""
                    SELECT vendor_id, avg_contract_value, median_contract_value,
                           min_contract_value, max_contract_value, std_dev,
                           contract_count, price_trend, trend_coefficient
                    FROM vendor_price_profiles WHERE vendor_id = ? AND sector_id = ?
                """, (vendor_id, sector_id))
                vr = cursor.fetchone()
                if vr:
                    vendor_profile = {
                        "vendor_id": vr[0], "avg_contract_value": vr[1],
                        "median_contract_value": vr[2], "min_contract_value": vr[3],
                        "max_contract_value": vr[4], "std_dev": vr[5],
                        "contract_count": vr[6], "price_trend": vr[7], "trend_coefficient": vr[8]
                    }

            # Get similar contracts
            similar_contracts = []
            if sector_id and hypothesis.amount_mxn:
                amount = hypothesis.amount_mxn
                cursor.execute("""
                    SELECT c.id, c.titulo, c.amount_mxn, c.contract_date,
                           v.name as vendor_name, c.risk_score
                    FROM contracts c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    WHERE c.sector_id = ? AND c.amount_mxn BETWEEN ? AND ? AND c.id != ?
                    ORDER BY ABS(c.amount_mxn - ?) ASC LIMIT 5
                """, (sector_id, amount * 0.8, amount * 1.2, contract_id, amount))
                similar_contracts = [
                    {"id": r[0], "titulo": r[1], "amount_mxn": r[2],
                     "contract_date": r[3], "vendor_name": r[4], "risk_score": r[5]}
                    for r in cursor.fetchall()
                ]

            return PriceHypothesisDetailResponse(
                hypothesis=hypothesis, contract=contract,
                sector_baseline=sector_baseline, vendor_profile=vendor_profile,
                similar_contracts=similar_contracts
            )

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_price_hypothesis_detail: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.put("/price-hypotheses/{hypothesis_id}/review")
def review_price_hypothesis(hypothesis_id: str = Path(...), review: HypothesisReviewRequest = None):
    """Review and validate a price hypothesis."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM price_hypotheses WHERE hypothesis_id = ?", (hypothesis_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")

            cursor.execute("""
                UPDATE price_hypotheses
                SET is_reviewed = 1, is_valid = ?, review_notes = ?, reviewed_at = ?
                WHERE hypothesis_id = ?
            """, (1 if review.is_valid else 0, review.review_notes, datetime.now().isoformat(), hypothesis_id))

            conn.commit()
            return {"success": True, "hypothesis_id": hypothesis_id,
                    "is_valid": review.is_valid, "review_notes": review.review_notes}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in review_price_hypothesis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/contracts/{contract_id}/price-analysis", response_model=ContractPriceAnalysisResponse)
def get_contract_price_analysis(contract_id: int = Path(...)):
    """Get price analysis for a specific contract."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT c.id, c.amount_mxn, c.sector_id, c.vendor_id, s.name_es as sector_name
                FROM contracts c
                LEFT JOIN sectors s ON c.sector_id = s.id
                WHERE c.id = ?
            """, (contract_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

            amount, sector_id, vendor_id, sector_name = row[1] or 0, row[2], row[3], row[4]

            # Sector comparison
            sector_comparison = None
            price_percentile = None
            is_outlier = False
            outlier_type = None

            if sector_id and amount > 0:
                cursor.execute("""
                    SELECT percentile_50, percentile_75, percentile_95, upper_fence, extreme_fence, sample_count
                    FROM sector_price_baselines
                    WHERE sector_id = ? AND contract_type = 'all' AND year IS NULL
                """, (sector_id,))

                bl = cursor.fetchone()
                if bl:
                    median, p75, p95, upper_fence, extreme_fence = bl[0], bl[1], bl[2], bl[3], bl[4]
                    ratio = amount / median if median > 0 else 0

                    sector_comparison = {
                        "median": median, "p75": p75, "p95": p95,
                        "upper_fence": upper_fence, "extreme_fence": extreme_fence,
                        "ratio_to_median": round(ratio, 2), "sample_count": bl[5]
                    }

                    # Calculate percentile
                    if amount <= median:
                        price_percentile = 50 * (amount / median) if median > 0 else 0
                    elif amount <= p75:
                        price_percentile = 50 + 25 * ((amount - median) / (p75 - median)) if p75 > median else 75
                    elif amount <= p95:
                        price_percentile = 75 + 20 * ((amount - p75) / (p95 - p75)) if p95 > p75 else 95
                    else:
                        price_percentile = 95 + 4.9 * min(1, (amount - p95) / p95) if p95 > 0 else 99
                    price_percentile = round(min(99.9, price_percentile), 1)

                    if amount > extreme_fence:
                        is_outlier, outlier_type = True, "extreme"
                    elif amount > upper_fence:
                        is_outlier, outlier_type = True, "mild"

            # Vendor comparison
            vendor_comparison = None
            if vendor_id:
                cursor.execute("""
                    SELECT avg_contract_value, median_contract_value, std_dev, contract_count, price_trend
                    FROM vendor_price_profiles WHERE vendor_id = ? AND sector_id = ?
                """, (vendor_id, sector_id))

                vp = cursor.fetchone()
                if vp and vp[3] >= 3:
                    vendor_median = vp[1] or vp[0]
                    vendor_comparison = {
                        "avg_contract_value": vp[0], "median_contract_value": vp[1],
                        "std_dev": vp[2], "contract_count": vp[3], "price_trend": vp[4],
                        "ratio_to_vendor_median": round(amount / vendor_median, 2) if vendor_median > 0 else 0
                    }

            # Get hypotheses
            hypotheses = []
            if table_exists(cursor, "price_hypotheses"):
                cursor.execute("""
                    SELECT id, hypothesis_id, contract_id, hypothesis_type, confidence,
                           confidence_level, explanation, supporting_evidence,
                           recommended_action, literature_reference, sector_id,
                           vendor_id, amount_mxn, is_reviewed, is_valid, review_notes, created_at
                    FROM price_hypotheses WHERE contract_id = ? ORDER BY confidence DESC
                """, (contract_id,))
                hypotheses = [PriceHypothesisItem(**row_to_hypothesis_dict(r)) for r in cursor.fetchall()]

            return ContractPriceAnalysisResponse(
                contract_id=contract_id, amount_mxn=amount,
                sector_id=sector_id, sector_name=sector_name,
                sector_comparison=sector_comparison, vendor_comparison=vendor_comparison,
                hypotheses=hypotheses, price_percentile=price_percentile,
                is_outlier=is_outlier, outlier_type=outlier_type
            )

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_contract_price_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/price-baselines", response_model=List[SectorPriceBaselineResponse])
def get_price_baselines(sector_id: Optional[int] = Query(None, ge=1, le=12)):
    """Get sector price baselines."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "sector_price_baselines"):
                raise HTTPException(status_code=404, detail="Run price_hypothesis_engine.py --calculate-baselines first.")

            query = """
                SELECT b.sector_id, s.name_es, b.contract_type,
                       b.percentile_10, b.percentile_25, b.percentile_50,
                       b.percentile_75, b.percentile_90, b.percentile_95,
                       b.mean_value, b.std_dev, b.iqr,
                       b.upper_fence, b.extreme_fence, b.sample_count
                FROM sector_price_baselines b
                LEFT JOIN sectors s ON b.sector_id = s.id
                WHERE b.year IS NULL
            """
            params = []
            if sector_id:
                query += " AND b.sector_id = ?"
                params.append(sector_id)
            query += " ORDER BY b.sector_id"

            cursor.execute(query, params)

            return [SectorPriceBaselineResponse(
                sector_id=r[0], sector_name=r[1], contract_type=r[2] or "all",
                percentile_10=r[3] or 0, percentile_25=r[4] or 0, percentile_50=r[5] or 0,
                percentile_75=r[6] or 0, percentile_90=r[7] or 0, percentile_95=r[8] or 0,
                mean_value=r[9] or 0, std_dev=r[10] or 0, iqr=r[11] or 0,
                upper_fence=r[12] or 0, extreme_fence=r[13] or 0, sample_count=r[14] or 0
            ) for r in cursor.fetchall()]

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_price_baselines: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# GROUND TRUTH VALIDATION ENDPOINTS
# =============================================================================

class GroundTruthCase(BaseModel):
    """A known corruption case."""
    id: int
    case_id: str
    case_name: str
    case_type: str
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    estimated_fraud_mxn: Optional[float] = None
    confidence_level: str = "medium"
    vendors_matched: int = 0
    institutions_matched: int = 0


class ValidationSummaryResponse(BaseModel):
    """Summary of ground truth validation status."""
    total_cases: int
    total_vendors: int
    total_institutions: int
    vendors_matched: int
    institutions_matched: int
    cases: List[GroundTruthCase]
    last_validation_run: Optional[Dict[str, Any]] = None


class ValidationResultResponse(BaseModel):
    """Results from a validation run."""
    run_id: str
    model_version: str
    run_date: str
    total_known_bad_contracts: int
    detection_rate: float
    critical_detection_rate: float
    false_negative_count: int
    risk_distribution: Dict[str, int]
    factor_triggers: Dict[str, int]
    baseline_detection_rate: float
    lift: float


class FalseNegativeItem(BaseModel):
    """A contract that should be flagged but isn't."""
    contract_id: int
    vendor_id: Optional[int]
    vendor_name: Optional[str]
    institution_id: Optional[int]
    institution_name: Optional[str]
    amount_mxn: Optional[float]
    year: Optional[int]
    risk_score: float
    risk_level: str
    case_name: Optional[str] = None


class FactorEffectivenessItem(BaseModel):
    """Effectiveness of a risk factor."""
    factor_name: str
    trigger_rate_known_bad: float
    trigger_rate_baseline: float
    lift: float
    effectiveness_score: float


@router.get("/validation/summary", response_model=ValidationSummaryResponse)
def get_validation_summary():
    """Get summary of ground truth data and validation status."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if tables exist
            if not table_exists(cursor, "ground_truth_cases"):
                raise HTTPException(
                    status_code=404,
                    detail="Ground truth tables not found. Run migrate_ground_truth_schema.py first."
                )

            # Get case summary
            cursor.execute("""
                SELECT
                    gtc.id, gtc.case_id, gtc.case_name, gtc.case_type,
                    gtc.year_start, gtc.year_end, gtc.estimated_fraud_mxn,
                    gtc.confidence_level,
                    (SELECT COUNT(*) FROM ground_truth_vendors gtv
                     WHERE gtv.case_id = gtc.id AND gtv.vendor_id IS NOT NULL) as vendors_matched,
                    (SELECT COUNT(*) FROM ground_truth_institutions gti
                     WHERE gti.case_id = gtc.id AND gti.institution_id IS NOT NULL) as institutions_matched
                FROM ground_truth_cases gtc
                ORDER BY gtc.year_start DESC
            """)

            cases = [GroundTruthCase(
                id=r[0], case_id=r[1], case_name=r[2], case_type=r[3],
                year_start=r[4], year_end=r[5], estimated_fraud_mxn=r[6],
                confidence_level=r[7], vendors_matched=r[8], institutions_matched=r[9]
            ) for r in cursor.fetchall()]

            # Get totals
            cursor.execute("SELECT COUNT(*) FROM ground_truth_cases")
            total_cases = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*), SUM(CASE WHEN vendor_id IS NOT NULL THEN 1 ELSE 0 END) FROM ground_truth_vendors")
            r = cursor.fetchone()
            total_vendors, vendors_matched = r[0], r[1] or 0

            cursor.execute("SELECT COUNT(*), SUM(CASE WHEN institution_id IS NOT NULL THEN 1 ELSE 0 END) FROM ground_truth_institutions")
            r = cursor.fetchone()
            total_institutions, institutions_matched = r[0], r[1] or 0

            # Get last validation run
            last_run = None
            if table_exists(cursor, "validation_results"):
                cursor.execute("""
                    SELECT run_id, model_version, run_date, detection_rate, lift
                    FROM validation_results
                    ORDER BY run_date DESC LIMIT 1
                """)
                r = cursor.fetchone()
                if r:
                    last_run = {
                        "run_id": r[0],
                        "model_version": r[1],
                        "run_date": r[2],
                        "detection_rate": r[3],
                        "lift": r[4]
                    }

            return ValidationSummaryResponse(
                total_cases=total_cases,
                total_vendors=total_vendors,
                total_institutions=total_institutions,
                vendors_matched=vendors_matched,
                institutions_matched=institutions_matched,
                cases=cases,
                last_validation_run=last_run
            )

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_validation_summary: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/validation/detection-rate")
def get_detection_rate(model_version: Optional[str] = Query(None)):
    """Get detection rate metrics from validation runs."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "validation_results"):
                raise HTTPException(
                    status_code=404,
                    detail="No validation results found. Run validate_risk_model.py first."
                )

            query = """
                SELECT
                    run_id, model_version, run_date,
                    total_known_bad_contracts, total_known_bad_vendors,
                    flagged_critical, flagged_high, flagged_medium, flagged_low,
                    detection_rate, critical_detection_rate, false_negative_count,
                    factor_trigger_counts, baseline_detection_rate, lift
                FROM validation_results
            """
            params = []
            if model_version:
                query += " WHERE model_version = ?"
                params.append(model_version)

            query += " ORDER BY run_date DESC LIMIT 10"
            cursor.execute(query, params)

            results = []
            for r in cursor.fetchall():
                factor_triggers = {}
                if r[12]:
                    try:
                        factor_triggers = json.loads(r[12])
                    except json.JSONDecodeError:
                        pass

                results.append(ValidationResultResponse(
                    run_id=r[0],
                    model_version=r[1],
                    run_date=r[2],
                    total_known_bad_contracts=r[3],
                    detection_rate=r[9] or 0,
                    critical_detection_rate=r[10] or 0,
                    false_negative_count=r[11] or 0,
                    risk_distribution={
                        "critical": r[5] or 0,
                        "high": r[6] or 0,
                        "medium": r[7] or 0,
                        "low": r[8] or 0
                    },
                    factor_triggers=factor_triggers,
                    baseline_detection_rate=r[13] or 0,
                    lift=r[14] or 0
                ))

            return {
                "results": results,
                "interpretation": {
                    "detection_rate_target": 80.0,
                    "lift_target": 2.0,
                    "status": "needs_improvement" if results and results[0].detection_rate < 50 else "acceptable"
                }
            }

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_detection_rate: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/validation/false-negatives")
def get_false_negatives(
    limit: int = Query(50, ge=1, le=200),
    min_amount: Optional[float] = Query(None, description="Minimum contract amount")
):
    """Get contracts from known bad vendors that have low risk scores."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "ground_truth_vendors"):
                raise HTTPException(
                    status_code=404,
                    detail="Ground truth tables not found."
                )

            query = """
                SELECT DISTINCT
                    c.id, c.vendor_id, v.name as vendor_name,
                    c.institution_id, i.name as institution_name,
                    c.amount_mxn, c.contract_year,
                    c.risk_score, c.risk_level,
                    gtc.case_name
                FROM contracts c
                JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
                JOIN ground_truth_cases gtc ON gtv.case_id = gtc.id
                LEFT JOIN vendors v ON c.vendor_id = v.id
                LEFT JOIN institutions i ON c.institution_id = i.id
                WHERE gtv.vendor_id IS NOT NULL
                AND (c.risk_level = 'low' OR c.risk_score < 0.2)
            """
            params = []

            if min_amount:
                query += " AND c.amount_mxn >= ?"
                params.append(min_amount)

            query += " ORDER BY c.amount_mxn DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)

            false_negatives = [FalseNegativeItem(
                contract_id=r[0],
                vendor_id=r[1],
                vendor_name=r[2],
                institution_id=r[3],
                institution_name=r[4],
                amount_mxn=r[5],
                year=r[6],
                risk_score=r[7] or 0,
                risk_level=r[8] or "unknown",
                case_name=r[9]
            ) for r in cursor.fetchall()]

            # Get summary stats
            cursor.execute("""
                SELECT COUNT(*), COALESCE(SUM(c.amount_mxn), 0)
                FROM contracts c
                JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
                WHERE gtv.vendor_id IS NOT NULL
                AND (c.risk_level = 'low' OR c.risk_score < 0.2)
            """)
            r = cursor.fetchone()
            total_count, total_value = r[0], r[1]

            return {
                "false_negatives": false_negatives,
                "summary": {
                    "total_false_negatives": total_count,
                    "total_value_mxn": total_value,
                    "showing": len(false_negatives)
                },
                "recommendation": "Review these contracts to identify missing risk patterns"
            }

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_false_negatives: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/validation/factor-analysis")
def get_factor_analysis():
    """Analyze which risk factors are most effective at detecting known bad contracts."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "ground_truth_vendors"):
                raise HTTPException(
                    status_code=404,
                    detail="Ground truth tables not found."
                )

            # Get factor triggers for known bad contracts
            cursor.execute("""
                SELECT c.risk_factors
                FROM contracts c
                JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
                WHERE gtv.vendor_id IS NOT NULL
                AND c.risk_factors IS NOT NULL
            """)

            known_bad_factors = {}
            known_bad_count = 0
            for r in cursor.fetchall():
                known_bad_count += 1
                try:
                    factors = json.loads(r[0]) if r[0] else []
                    for f in factors:
                        known_bad_factors[f] = known_bad_factors.get(f, 0) + 1
                except (json.JSONDecodeError, TypeError):
                    pass

            # Get baseline factor triggers (random sample)
            cursor.execute("""
                SELECT risk_factors
                FROM contracts
                WHERE risk_factors IS NOT NULL
                ORDER BY RANDOM()
                LIMIT 10000
            """)

            baseline_factors = {}
            baseline_count = 0
            for r in cursor.fetchall():
                baseline_count += 1
                try:
                    factors = json.loads(r[0]) if r[0] else []
                    for f in factors:
                        baseline_factors[f] = baseline_factors.get(f, 0) + 1
                except (json.JSONDecodeError, TypeError):
                    pass

            # Calculate effectiveness
            all_factors = set(known_bad_factors.keys()) | set(baseline_factors.keys())
            effectiveness = []

            for factor in all_factors:
                known_bad_rate = (known_bad_factors.get(factor, 0) / known_bad_count * 100) if known_bad_count > 0 else 0
                baseline_rate = (baseline_factors.get(factor, 0) / baseline_count * 100) if baseline_count > 0 else 0
                lift = known_bad_rate / baseline_rate if baseline_rate > 0 else 0
                score = lift * (known_bad_rate / 100)  # Combine lift with coverage

                effectiveness.append(FactorEffectivenessItem(
                    factor_name=factor,
                    trigger_rate_known_bad=round(known_bad_rate, 2),
                    trigger_rate_baseline=round(baseline_rate, 2),
                    lift=round(lift, 2),
                    effectiveness_score=round(score, 4)
                ))

            # Sort by effectiveness
            effectiveness.sort(key=lambda x: x.effectiveness_score, reverse=True)

            return {
                "factors": effectiveness,
                "sample_sizes": {
                    "known_bad_contracts": known_bad_count,
                    "baseline_contracts": baseline_count
                },
                "recommendations": [
                    f for f in effectiveness
                    if f.lift > 1.5 and f.trigger_rate_known_bad > 10
                ][:5]
            }

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_factor_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# PATTERN DETECTION ENDPOINTS
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
    scandal_period: Tuple[int, int]
    control_period: Tuple[int, int]
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


@router.get("/institution/{institution_id}/period-comparison")
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


# Simple cache for anomalies
_anomalies_cache: Dict[str, Any] = {}
_anomalies_cache_time: Optional[datetime] = None
ANOMALIES_CACHE_TTL = 300  # 5 minutes


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

class MoneyFlowResponse(BaseModel):
    flows: List[MoneyFlowItem]
    total_value: float
    total_contracts: int


_money_flow_cache: Dict[str, Any] = {}
_money_flow_cache_ts: float = 0
_MONEY_FLOW_CACHE_TTL = 600  # 10 minutes


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


_risk_factor_analysis_cache: Dict[str, Any] = {}
_risk_factor_analysis_cache_ts: float = 0
_RISK_FACTOR_ANALYSIS_CACHE_TTL = 600  # 10 minutes


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

            # Stream rows without loading all into memory at once
            cursor.execute(f"""
                SELECT risk_factors, risk_score
                FROM contracts
                WHERE {where_clause}
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


_institution_rankings_cache: Dict[str, Any] = {}
_institution_rankings_cache_ts: float = 0
_INSTITUTION_RANKINGS_CACHE_TTL = 600  # 10 minutes


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