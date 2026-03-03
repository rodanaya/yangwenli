"""
Temporal analysis endpoints for the analysis API.

Covers: monthly breakdowns, year-over-year trends, temporal events,
period comparison, december spike, structural breaks, political cycle,
publication delays, threshold gaming.
"""

import sqlite3
import logging
import time as _time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from ..dependencies import get_db
from ..config.temporal_events import TEMPORAL_EVENTS, TemporalEventData
from ..helpers.analysis_helpers import pct_change
from ..services.analysis_service import analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class MonthlyDataPoint(BaseModel):
    month: int = Field(..., ge=1, le=12)
    month_name: str
    contracts: int
    value: float
    avg_risk: float
    direct_award_count: int = Field(default=0)
    single_bid_count: int = Field(default=0)
    is_year_end: bool = Field(default=False)


class MonthlyBreakdownResponse(BaseModel):
    year: int
    months: List[MonthlyDataPoint]
    total_contracts: int
    total_value: float
    avg_risk: float
    december_spike: Optional[float] = None


class YearlyTrendItem(BaseModel):
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
    data: List[YearlyTrendItem]
    total_years: int
    min_year: int
    max_year: int


class TemporalEvent(BaseModel):
    id: str
    date: str
    year: int
    month: Optional[int] = None
    type: str
    title: str
    description: str
    impact: str = Field(default="medium")
    source: Optional[str] = None


class TemporalEventsResponse(BaseModel):
    events: List[TemporalEvent]
    total: int


class PeriodComparisonResponse(BaseModel):
    period1: Dict[str, Any]
    period2: Dict[str, Any]
    changes: Dict[str, float]
    significant_changes: List[str]


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


# =============================================================================
# MONTH NAMES CONSTANT
# =============================================================================

MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]


# =============================================================================
# CACHE VARIABLES (defined before all functions that use them)
# =============================================================================

_monthly_cache: Dict[str, Any] = {}
_MONTHLY_CACHE_TTL = 300  # 5 minutes

_yoy_cache: Dict[str, Any] = {}
_YOY_CACHE_TTL = 300  # 5 minutes

_dec_spike_cache: Dict[str, Any] = {}
_DEC_SPIKE_CACHE_TTL = 3600  # 1 hour

_sector_year_cache: Dict[str, Any] = {}
_SECTOR_YEAR_CACHE_TTL = 300  # 5 minutes

_structural_breaks_cache: Dict[str, Any] = {}
_STRUCTURAL_BREAKS_CACHE_TTL = 3600  # 1 hour

_political_cycle_cache: Dict[str, Any] = {}
_POLITICAL_CYCLE_TTL = 6 * 3600  # 6 hours

_pub_delay_cache: Dict[str, Any] = {}
_PUB_DELAY_TTL = 6 * 3600  # 6 hours

_threshold_gaming_cache: Dict[str, Any] = {}
_THRESHOLD_GAMING_TTL = 6 * 3600


# =============================================================================
# TEMPORAL ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/monthly/{year}", response_model=MonthlyBreakdownResponse)
def get_monthly_breakdown(year: int = 2024):
    """Get monthly breakdown for a specific year."""
    global _monthly_cache

    cache_key = f"monthly_{year}"
    if cache_key in _monthly_cache:
        cached = _monthly_cache[cache_key]
        if (_time.time() - cached["ts"]) < _MONTHLY_CACHE_TTL:
            return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    CAST(strftime('%m', contract_date) AS INTEGER) as month,
                    COUNT(*) as contracts,
                    SUM(amount_mxn) as total_value,
                    AVG(risk_score) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count
                FROM contracts
                WHERE contract_year = ?
                AND amount_mxn > 0
                AND amount_mxn < 100000000000
                AND contract_date IS NOT NULL
                GROUP BY month
                ORDER BY month
            """, (year,))

            rows = {r["month"]: r for r in cursor.fetchall()}

            months = []
            total_value = 0
            total_contracts = 0
            risks = []
            dec_value = None

            for m in range(1, 13):
                row = rows.get(m)
                if row:
                    val = row["total_value"] or 0
                    cnt = row["contracts"] or 0
                    risk = row["avg_risk"] or 0
                    total_value += val
                    total_contracts += cnt
                    risks.append(risk)
                    if m == 12:
                        dec_value = val
                    months.append(MonthlyDataPoint(
                        month=m,
                        month_name=MONTH_NAMES[m - 1],
                        contracts=cnt,
                        value=val,
                        avg_risk=round(risk, 4),
                        direct_award_count=row["direct_award_count"] or 0,
                        single_bid_count=row["single_bid_count"] or 0,
                        is_year_end=(m == 12)
                    ))
                else:
                    months.append(MonthlyDataPoint(
                        month=m,
                        month_name=MONTH_NAMES[m - 1],
                        contracts=0,
                        value=0,
                        avg_risk=0,
                        is_year_end=(m == 12)
                    ))

            avg_risk = sum(risks) / len(risks) if risks else 0

            non_dec = [months[i].value for i in range(11)]
            dec_spike = None
            if non_dec and dec_value:
                avg_non_dec = sum(non_dec) / len(non_dec) if non_dec else 0
                dec_spike = round(dec_value / avg_non_dec, 2) if avg_non_dec > 0 else None

            result = MonthlyBreakdownResponse(
                year=year,
                months=months,
                total_contracts=total_contracts,
                total_value=total_value,
                avg_risk=round(avg_risk, 4),
                december_spike=dec_spike
            )

            _monthly_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_monthly_breakdown: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/year-over-year", response_model=YearOverYearResponse)
def get_year_over_year(
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    start_year: Optional[int] = Query(None, ge=2002),
    end_year: Optional[int] = Query(None, le=2026)
):
    """Get year-over-year procurement trends."""
    global _yoy_cache

    cache_key = f"yoy_{sector_id}_{start_year}_{end_year}"
    if cache_key in _yoy_cache:
        cached = _yoy_cache[cache_key]
        if (_time.time() - cached["ts"]) < _YOY_CACHE_TTL:
            return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = ["amount_mxn > 0", "amount_mxn < 100000000000", "contract_year IS NOT NULL"]
            params: List[Any] = []

            if sector_id:
                conditions.append("sector_id = ?")
                params.append(sector_id)
            if start_year:
                conditions.append("contract_year >= ?")
                params.append(start_year)
            if end_year:
                conditions.append("contract_year <= ?")
                params.append(end_year)

            where = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT
                    contract_year as year,
                    COUNT(*) as contracts,
                    SUM(amount_mxn) as total_value,
                    AVG(risk_score) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as single_bid_pct,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct,
                    COUNT(DISTINCT vendor_id) as vendor_count,
                    COUNT(DISTINCT institution_id) as institution_count
                FROM contracts
                WHERE {where}
                GROUP BY contract_year
                ORDER BY contract_year
            """, params)

            trends = []
            for r in cursor.fetchall():
                trends.append(YearlyTrendItem(
                    year=r["year"],
                    contracts=r["contracts"],
                    total_value=r["total_value"] or 0,
                    avg_risk=round(r["avg_risk"] or 0, 4),
                    direct_award_pct=round(r["direct_award_pct"] or 0, 2),
                    single_bid_pct=round(r["single_bid_pct"] or 0, 2),
                    high_risk_pct=round(r["high_risk_pct"] or 0, 2),
                    vendor_count=r["vendor_count"] or 0,
                    institution_count=r["institution_count"] or 0
                ))

            if not trends:
                return YearOverYearResponse(data=[], total_years=0, min_year=0, max_year=0)

            result = YearOverYearResponse(
                data=trends,
                total_years=len(trends),
                min_year=trends[0].year,
                max_year=trends[-1].year
            )

            _yoy_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_year_over_year: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sector-year-breakdown")
def get_sector_year_breakdown(
    sector_id: int = Query(..., ge=1, le=12),
    start_year: int = Query(2010, ge=2002),
    end_year: int = Query(2025, le=2026)
):
    """Get detailed yearly breakdown for a specific sector."""
    global _sector_year_cache

    cache_key = f"syd_{sector_id}_{start_year}_{end_year}"
    if cache_key in _sector_year_cache:
        cached = _sector_year_cache[cache_key]
        if (_time.time() - cached["ts"]) < _SECTOR_YEAR_CACHE_TTL:
            return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    contract_year as year,
                    COUNT(*) as contracts,
                    SUM(amount_mxn) as total_value,
                    AVG(risk_score) as avg_risk,
                    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                    SUM(CASE WHEN is_year_end = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as year_end_pct
                FROM contracts
                WHERE sector_id = ?
                AND contract_year BETWEEN ? AND ?
                AND amount_mxn > 0
                AND amount_mxn < 100000000000
                GROUP BY contract_year
                ORDER BY contract_year
            """, (sector_id, start_year, end_year))

            result = {
                "sector_id": sector_id,
                "start_year": start_year,
                "end_year": end_year,
                "years": [
                    {
                        "year": r["year"],
                        "contracts": r["contracts"],
                        "total_value": r["total_value"] or 0,
                        "avg_risk": round(r["avg_risk"] or 0, 4),
                        "direct_award_pct": round(r["direct_award_pct"] or 0, 2),
                        "year_end_pct": round(r["year_end_pct"] or 0, 2)
                    }
                    for r in cursor.fetchall()
                ]
            }

            _sector_year_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_year_breakdown: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/events", response_model=TemporalEventsResponse)
def get_temporal_events(
    year: Optional[int] = Query(None, ge=2002, le=2026),
    event_type: Optional[str] = Query(None),
    impact: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """Get temporal events that may affect procurement patterns."""
    events = []

    for event_data in TEMPORAL_EVENTS:
        if isinstance(event_data, TemporalEventData):
            event = TemporalEvent(
                id=event_data.id,
                date=event_data.date,
                year=event_data.year,
                month=event_data.month,
                type=event_data.type,
                title=event_data.title,
                description=event_data.description,
                impact=event_data.impact,
                source=event_data.source
            )
        else:
            event = TemporalEvent(**event_data)

        if year and event.year != year:
            continue
        if event_type and event.type != event_type:
            continue
        if impact and event.impact != impact:
            continue

        events.append(event)

    events.sort(key=lambda e: e.date, reverse=True)
    return TemporalEventsResponse(events=events[:limit], total=len(events))


@router.get("/period-comparison", response_model=PeriodComparisonResponse)
def get_period_comparison(
    period1_start: int = Query(..., ge=2002, le=2026),
    period1_end: int = Query(..., ge=2002, le=2026),
    period2_start: int = Query(..., ge=2002, le=2026),
    period2_end: int = Query(..., ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12)
):
    """Compare two time periods for procurement metrics."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            def get_period_stats(start: int, end: int) -> Dict:
                conditions = [
                    "contract_year >= ?", "contract_year <= ?",
                    "amount_mxn > 0", "amount_mxn < 100000000000"
                ]
                params = [start, end]
                if sector_id:
                    conditions.append("sector_id = ?")
                    params.append(sector_id)

                cursor.execute(f"""
                    SELECT
                        COUNT(*) as contracts,
                        SUM(amount_mxn) as total_value,
                        AVG(risk_score) as avg_risk,
                        SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                        SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as single_bid_pct,
                        SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct
                    FROM contracts
                    WHERE {" AND ".join(conditions)}
                """, params)
                r = cursor.fetchone()
                return {
                    "period": f"{start}-{end}",
                    "contracts": r["contracts"] or 0,
                    "total_value": r["total_value"] or 0,
                    "avg_risk": round(r["avg_risk"] or 0, 4),
                    "direct_award_pct": round(r["direct_award_pct"] or 0, 2),
                    "single_bid_pct": round(r["single_bid_pct"] or 0, 2),
                    "high_risk_pct": round(r["high_risk_pct"] or 0, 2)
                }

            p1 = get_period_stats(period1_start, period1_end)
            p2 = get_period_stats(period2_start, period2_end)

            changes = {}
            significant = []

            for key in ["avg_risk", "direct_award_pct", "single_bid_pct", "high_risk_pct"]:
                change = pct_change(p1[key], p2[key])
                changes[key] = change
                if abs(change) > 20:
                    significant.append(f"{key} changed by {change:.1f}%")

            return PeriodComparisonResponse(
                period1=p1,
                period2=p2,
                changes=changes,
                significant_changes=significant
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_period_comparison: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/december-spike", response_model=DecemberSpikeResponse)
def get_december_spike(
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    start_year: Optional[int] = Query(None, ge=2002),
    end_year: Optional[int] = Query(None, le=2026)
):
    """Analyze December spending spike pattern across years."""
    global _dec_spike_cache

    cache_key = f"dec_spike_{sector_id}_{start_year}_{end_year}"
    if cache_key in _dec_spike_cache:
        cached = _dec_spike_cache[cache_key]
        if (_time.time() - cached["ts"]) < _DEC_SPIKE_CACHE_TTL:
            return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = ["amount_mxn > 0", "amount_mxn < 100000000000", "contract_year IS NOT NULL"]
            params: List[Any] = []

            if sector_id:
                conditions.append("sector_id = ?")
                params.append(sector_id)
            if start_year:
                conditions.append("contract_year >= ?")
                params.append(start_year)
            if end_year:
                conditions.append("contract_year <= ?")
                params.append(end_year)

            where = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT
                    contract_year as year,
                    SUM(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) = 12 THEN amount_mxn ELSE 0 END) as december_value,
                    SUM(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) = 12 THEN 1 ELSE 0 END) as december_contracts,
                    AVG(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) != 12 THEN amount_mxn ELSE NULL END) as avg_other_months,
                    CASE
                        WHEN AVG(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) != 12 THEN amount_mxn ELSE NULL END) > 0
                        THEN SUM(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) = 12 THEN amount_mxn ELSE 0 END) /
                             AVG(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) != 12 THEN amount_mxn ELSE NULL END)
                        ELSE NULL
                    END as spike_ratio,
                    AVG(CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) = 12 THEN risk_score ELSE NULL END) as december_risk
                FROM contracts
                WHERE {where} AND contract_date IS NOT NULL
                GROUP BY contract_year
                ORDER BY contract_year
            """, params)

            patterns = []
            spike_years = 0
            spike_ratios = []

            for row in cursor.fetchall():
                is_significant = row["spike_ratio"] is not None and row["spike_ratio"] > 1.5
                if is_significant:
                    spike_years += 1
                if row["spike_ratio"]:
                    spike_ratios.append(row["spike_ratio"])

                patterns.append(YearEndSpikeYear(
                    year=row["year"],
                    december_value=row["december_value"] or 0,
                    december_contracts=row["december_contracts"] or 0,
                    avg_monthly_value=row["avg_other_months"] or 0,
                    spike_ratio=round(row["spike_ratio"], 2) if row["spike_ratio"] else None,
                    is_significant=is_significant
                ))

            avg_spike = sum(spike_ratios) / len(spike_ratios) if spike_ratios else 0
            pattern_detected = avg_spike > 1.3 and spike_years > len(patterns) * 0.4

            result = DecemberSpikeResponse(
                years=patterns,
                average_spike_ratio=round(avg_spike, 2),
                years_with_significant_spike=spike_years,
                total_years_analyzed=len(patterns),
                pattern_detected=pattern_detected,
                description=(
                    f"December spending is {avg_spike:.1f}x average monthly spending. "
                    f"Significant spike detected in {spike_years}/{len(patterns)} years."
                    if patterns else "No data available"
                )
            )

            _dec_spike_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_december_spike: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# STRUCTURAL BREAKS ENDPOINT
# =============================================================================

@router.get("/structural-breaks", response_model=Dict[str, Any])
def get_structural_breaks():
    """
    Detect statistically significant change points in procurement trends.
    Uses PELT algorithm (ruptures library). Cached for 1 hour.
    """
    cache_key = "structural_breaks"
    cached = _structural_breaks_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _STRUCTURAL_BREAKS_CACHE_TTL:
        return cached["data"]

    with get_db() as conn:
        result = analysis_service.get_structural_breaks(conn)
        _structural_breaks_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


# =============================================================================
# POLITICAL CYCLE ANALYSIS (Section 12.1)
# =============================================================================

@router.get("/political-cycle", tags=["analysis"])
def get_political_cycle():
    """
    Analyze procurement patterns relative to Mexico's electoral/budget calendar.
    Returns election-year effect and sexenio-year breakdown.
    """
    cache_key = "political_cycle"
    cached = _political_cycle_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _POLITICAL_CYCLE_TTL:
        return cached["data"]

    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT
                is_election_year,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) as high_risk_pct,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct,
                ROUND(100.0 * SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as single_bid_pct
            FROM contracts
            WHERE contract_year IS NOT NULL
            GROUP BY is_election_year
        """).fetchall()

        election_data = {}
        for r in rows:
            key = "election_year" if r["is_election_year"] else "non_election_year"
            election_data[key] = {
                "contracts": r["contracts"],
                "avg_risk": float(r["avg_risk"] or 0),
                "high_risk_pct": float(r["high_risk_pct"] or 0),
                "direct_award_pct": float(r["direct_award_pct"] or 0),
                "single_bid_pct": float(r["single_bid_pct"] or 0),
            }

        election_year_effect: Dict[str, Any] = {
            "election_year": election_data.get("election_year", {}),
            "non_election_year": election_data.get("non_election_year", {}),
        }
        if "election_year" in election_data and "non_election_year" in election_data:
            base = election_data["non_election_year"]["avg_risk"]
            comp = election_data["election_year"]["avg_risk"]
            election_year_effect["risk_delta"] = round(comp - base, 4)
            election_year_effect["risk_delta_pct"] = round((comp - base) / base * 100, 2) if base else 0.0

        rows2 = conn.execute("""
            SELECT
                sexenio_year,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) as high_risk_pct,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct,
                ROUND(100.0 * SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as single_bid_pct
            FROM contracts
            WHERE sexenio_year IS NOT NULL
            GROUP BY sexenio_year
            ORDER BY sexenio_year
        """).fetchall()

        sexenio_labels = {
            1: "Year 1 (new admin)", 2: "Year 2", 3: "Year 3 (midterm)",
            4: "Year 4", 5: "Year 5", 6: "Year 6 (lame duck)"
        }
        sexenio_breakdown = []
        for r in rows2:
            yr = r["sexenio_year"]
            sexenio_breakdown.append({
                "sexenio_year": yr,
                "label": sexenio_labels.get(yr, f"Year {yr}"),
                "contracts": r["contracts"],
                "avg_risk": float(r["avg_risk"] or 0),
                "high_risk_pct": float(r["high_risk_pct"] or 0),
                "direct_award_pct": float(r["direct_award_pct"] or 0),
                "single_bid_pct": float(r["single_bid_pct"] or 0),
            })

        rows3 = conn.execute("""
            SELECT
                is_election_year,
                CASE WHEN CAST(strftime('%m', contract_date) AS INTEGER) >= 10 THEN 'Q4' ELSE 'Q1-Q3' END as quarter,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk
            FROM contracts
            WHERE contract_year IS NOT NULL AND contract_date IS NOT NULL
            GROUP BY is_election_year, quarter
        """).fetchall()

        q4_interaction = {}
        for r in rows3:
            ey = "election" if r["is_election_year"] else "non_election"
            q = r["quarter"].lower().replace("-", "_")
            k = f"{ey}_{q}"
            q4_interaction[k] = {
                "contracts": r["contracts"],
                "avg_risk": float(r["avg_risk"] or 0),
            }

        result = {
            "election_year_effect": election_year_effect,
            "sexenio_year_breakdown": sexenio_breakdown,
            "q4_election_interaction": q4_interaction,
        }

        _political_cycle_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


# =============================================================================
# PUBLICATION DELAY TRANSPARENCY (Section 12.2)
# =============================================================================

@router.get("/transparency/publication-delays", tags=["analysis"])
def get_publication_delays():
    """
    Distribution of publication delay (days between contract date and COMPRANET publication).
    Measures government transparency in procurement reporting.
    """
    cached = _pub_delay_cache.get("pub_delays")
    if cached and (_time.time() - cached["ts"]) < _PUB_DELAY_TTL:
        return cached["data"]

    with get_db() as conn:
        conn.row_factory = sqlite3.Row

        row = conn.execute("""
            SELECT
                SUM(CASE WHEN publication_delay_days BETWEEN 1 AND 7 THEN 1 ELSE 0 END) as bucket_0_7,
                SUM(CASE WHEN publication_delay_days BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as bucket_8_30,
                SUM(CASE WHEN publication_delay_days BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as bucket_31_90,
                SUM(CASE WHEN publication_delay_days > 90 THEN 1 ELSE 0 END) as bucket_over_90,
                COUNT(*) as total,
                ROUND(AVG(publication_delay_days), 1) as avg_delay,
                ROUND(AVG(CASE WHEN publication_delay_days <= 7 THEN 1.0 ELSE 0 END) * 100, 2) as timely_pct
            FROM contracts
            WHERE publication_delay_days IS NOT NULL AND publication_delay_days > 0
        """).fetchone()

        buckets = [
            {"label": "1\u20137 days", "days_min": 1, "days_max": 7, "count": int(row["bucket_0_7"] or 0)},
            {"label": "8\u201330 days", "days_min": 8, "days_max": 30, "count": int(row["bucket_8_30"] or 0)},
            {"label": "31\u201390 days", "days_min": 31, "days_max": 90, "count": int(row["bucket_31_90"] or 0)},
            {"label": ">90 days", "days_min": 91, "days_max": None, "count": int(row["bucket_over_90"] or 0)},
        ]
        total = int(row["total"] or 0)
        for b in buckets:
            b["pct"] = round(b["count"] / total * 100, 2) if total else 0.0

        year_rows = conn.execute("""
            SELECT
                contract_year,
                COUNT(*) as contracts_with_delay,
                ROUND(AVG(publication_delay_days), 1) as avg_delay,
                ROUND(100.0 * SUM(CASE WHEN publication_delay_days <= 7 THEN 1 ELSE 0 END) / COUNT(*), 2) as timely_pct
            FROM contracts
            WHERE publication_delay_days IS NOT NULL AND publication_delay_days > 0
              AND contract_year IS NOT NULL
            GROUP BY contract_year
            ORDER BY contract_year
        """).fetchall()

        by_year = [
            {
                "year": r["contract_year"],
                "contracts_with_delay": r["contracts_with_delay"],
                "avg_delay": float(r["avg_delay"] or 0),
                "timely_pct": float(r["timely_pct"] or 0),
            }
            for r in year_rows
        ]

        result = {
            "total_with_delay_data": total,
            "avg_delay_days": float(row["avg_delay"] or 0),
            "timely_pct": float(row["timely_pct"] or 0),
            "distribution": buckets,
            "by_year": by_year,
        }

        _pub_delay_cache["pub_delays"] = {"ts": _time.time(), "data": result}
        return result


# ---------------------------------------------------------------------------
# Threshold Gaming Analysis (Coviello, Guglielmo & Spagnolo 2018; Szucs 2023)
# ---------------------------------------------------------------------------

@router.get("/threshold-gaming", tags=["analysis"])
def get_threshold_gaming():
    """
    Contracts clustered just below LAASSP mandatory bidding thresholds.
    Based on Szucs (2023): systematic bunching below thresholds indicates
    threshold gaming to avoid competitive bidding requirements.
    """
    cached = _threshold_gaming_cache.get("tg")
    if cached and (_time.time() - cached["ts"]) < _THRESHOLD_GAMING_TTL:
        return cached["data"]

    with get_db() as conn:
        cursor = conn.cursor()

        row = cursor.execute("""
            SELECT
                COUNT(*) as total_flagged,
                ROUND(SUM(amount_mxn) / 1e9, 2) as total_value_bn,
                COUNT(*) * 100.0 / (
                    SELECT COUNT(*) FROM contracts
                    WHERE is_direct_award = 0 AND amount_mxn > 0
                ) as pct_of_competitive
            FROM contracts
            WHERE is_threshold_gaming = 1
        """).fetchone()

        total = row["total_flagged"] or 0

        sector_rows = cursor.execute("""
            SELECT s.name_es as sector, s.code as sector_code,
                   COUNT(*) as flagged_count,
                   COUNT(*) * 100.0 / (
                       SELECT COUNT(*) FROM contracts c2
                       WHERE c2.sector_id = c.sector_id AND c2.is_direct_award = 0 AND c2.amount_mxn > 0
                   ) as flagged_pct,
                   ROUND(SUM(c.amount_mxn) / 1e9, 2) as value_bn
            FROM contracts c
            JOIN sectors s ON c.sector_id = s.id
            WHERE c.is_threshold_gaming = 1
            GROUP BY c.sector_id
            ORDER BY flagged_count DESC
        """).fetchall()

        by_sector = [
            {
                "sector": r["sector"],
                "sector_code": r["sector_code"],
                "flagged_count": r["flagged_count"],
                "flagged_pct": round(float(r["flagged_pct"] or 0), 2),
                "estimated_value_bn": float(r["value_bn"] or 0),
            }
            for r in sector_rows
        ]

        result = {
            "total_flagged": total,
            "pct_of_competitive_procedures": round(float(row["pct_of_competitive"] or 0), 2),
            "total_value_bn": float(row["total_value_bn"] or 0),
            "by_sector": by_sector,
            "note": (
                "Based on Szucs (2023): contracts clustered just below legal thresholds "
                "indicate systematic threshold gaming to avoid competitive bidding requirements. "
                "Flagged = within 5% below the licitacion publica mandatory threshold."
            ),
        }

        _threshold_gaming_cache["tg"] = {"ts": _time.time(), "data": result}
        return result
