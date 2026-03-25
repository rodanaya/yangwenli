"""
Temporal analysis endpoints — monthly breakdowns, year-over-year trends,
sector-year cross-tabulation, period comparisons, and December spike analysis.
"""

import sqlite3
import logging
import json
import time as _time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Request
from pydantic import BaseModel, Field

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..cache import SimpleCache
from ..config.temporal_events import TEMPORAL_EVENTS
from ..helpers.analysis_helpers import build_where_clause, pct_change
from ..services.analysis_service import analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Rate limiting (graceful degradation if slowapi missing)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    _limiter = Limiter(key_func=get_remote_address)
except ImportError:
    _limiter = None


def _rate_limit(limit_string: str):
    """Rate limit decorator that degrades gracefully if slowapi is missing."""
    if _limiter:
        return _limiter.limit(limit_string)
    return lambda f: f


# Global cache instance
_analysis_cache = SimpleCache()
SECTOR_YEAR_CACHE_TTL = 3600  # 1 hour


# =============================================================================
# RESPONSE MODELS
# =============================================================================

MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]


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


class YearEndSpikeYear(BaseModel):
    year: int
    december_value: float
    december_contracts: int
    avg_monthly_value: float
    spike_ratio: Optional[float]
    is_significant: bool


class DecemberSpikeResponse(BaseModel):
    years: List[YearEndSpikeYear]
    average_spike_ratio: float
    years_with_significant_spike: int
    total_years_analyzed: int
    pattern_detected: bool
    description: str


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


# =============================================================================
# CACHES
# =============================================================================

_monthly_cache: Dict[str, Any] = {}
_MONTHLY_CACHE_TTL = 3600

_yoy_cache: Dict[str, Any] = {}
_YOY_CACHE_TTL = 600  # 10 minutes

_dec_spike_cache: Dict[str, Any] = {}
_DEC_SPIKE_CACHE_TTL = 3600


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/monthly-breakdown/{year}", response_model=MonthlyBreakdownResponse)
def get_monthly_breakdown(
    year: int = Path(..., ge=2002, le=2026, description="Year to analyze"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
):
    """Get monthly breakdown of contracts for a specific year."""
    _cache_key = f"{year}:{sector_id}:{institution_id}"
    _cached = _monthly_cache.get(_cache_key)
    if _cached and (_time.time() - _cached["ts"]) < _MONTHLY_CACHE_TTL:
        return _cached["data"]

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

            response = MonthlyBreakdownResponse(
                year=year, months=months, total_contracts=total_contracts,
                total_value=total_value, avg_risk=round(avg_risk, 4),
                december_spike=december_spike
            )
            _monthly_cache[_cache_key] = {"ts": _time.time(), "data": response}
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_monthly_breakdown: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


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
        # Fast path for unfiltered case: use precomputed yearly_trends
        if sector_id is None and start_year is None and end_year is None:
            row = conn.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'yearly_trends'"
            ).fetchone()
            if row:
                raw = json.loads(row[0])
                data = [
                    {
                        "year": r["year"],
                        "contracts": r.get("contracts") or r.get("total_contracts", 0),
                        "total_value": r.get("value_mxn") or r.get("total_value_mxn", 0),
                        "avg_risk": r.get("avg_risk") or r.get("avg_risk_score", 0),
                        "direct_award_pct": r.get("direct_award_pct", 0),
                        "single_bid_pct": r.get("single_bid_pct", 0),
                        "high_risk_pct": r.get("high_risk_pct", 0),
                        "vendor_count": r.get("vendor_count") or r.get("unique_vendors", 0),
                        "institution_count": r.get("institution_count", 0),
                    }
                    for r in raw
                ]
                years = [d["year"] for d in data]
                result = {
                    "data": data,
                    "total_years": len(data),
                    "min_year": min(years) if years else 2002,
                    "max_year": max(years) if years else 2025,
                }
                _yoy_cache[cache_key] = {"ts": _time.time(), "data": result}
                return result

        result = analysis_service.get_year_over_year(
            conn,
            sector_id=sector_id,
            start_year=start_year,
            end_year=end_year,
        )
        _yoy_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


@router.get("/sector-year-breakdown", response_model=SectorYearBreakdownResponse)
@_rate_limit("30/minute")
def get_sector_year_breakdown(request: Request):
    """Get sector x year cross-tabulation for administration analysis."""
    try:
        cache_key = "sector_year_all"
        cached = _analysis_cache.get(cache_key)
        if cached is not None:
            return cached

        with get_db() as conn:
            cursor = conn.cursor()

            # Fast path: use precomputed sector_year_breakdown stat
            pc_row = cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sector_year_breakdown'"
            ).fetchone()
            if pc_row:
                raw = json.loads(pc_row[0])
                if isinstance(raw, list) and raw and "sector_id" in raw[0]:
                    data = [SectorYearItem(
                        year=r["year"],
                        sector_id=r["sector_id"],
                        contracts=r.get("contracts", 0),
                        total_value=r.get("total_value", 0),
                        avg_risk=r.get("avg_risk", 0),
                        direct_award_pct=r.get("direct_award_pct", 0),
                        single_bid_pct=r.get("single_bid_pct"),
                        high_risk_pct=r.get("high_risk_pct", 0),
                        vendor_count=r.get("vendor_count", 0),
                        institution_count=r.get("institution_count", 0),
                    ) for r in raw]
                    result = SectorYearBreakdownResponse(data=data, total_rows=len(data))
                    _analysis_cache.set(cache_key, result, ttl_seconds=SECTOR_YEAR_CACHE_TTL)
                    return result

            # Fallback: live query limited to 2018+
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
                  AND contract_year >= 2018
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
            _analysis_cache.set(cache_key, result, ttl_seconds=SECTOR_YEAR_CACHE_TTL)
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


@router.get("/december-spike-analysis", response_model=DecemberSpikeResponse)
def get_december_spike_analysis(
    start_year: int = Query(2015, ge=2002, le=2026),
    end_year: int = Query(2024, ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
):
    """Analyze year-end spending spikes across multiple years."""
    _spike_key = f"{start_year}:{end_year}:{sector_id}"
    _spike_cached = _dec_spike_cache.get(_spike_key)
    if _spike_cached and (_time.time() - _spike_cached["ts"]) < _DEC_SPIKE_CACHE_TTL:
        return _spike_cached["data"]

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

            result = {
                "years": years_data,
                "average_spike_ratio": round(avg_spike, 2),
                "years_with_significant_spike": sum(1 for y in years_data if y["is_significant"]),
                "total_years_analyzed": len(years_data),
                "pattern_detected": avg_spike > 1.3,
                "description": f"December spending averages {avg_spike:.1f}x other months" if avg_spike > 1 else "No significant December spike pattern"
            }
            _dec_spike_cache[_spike_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_december_spike_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
