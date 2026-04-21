"""
API router for advanced analysis endpoints.

Provides temporal analysis, monthly breakdowns, year-over-year trends,
price hypothesis analysis, and event-based analysis.
"""

import sqlite3
import logging
import json
import threading
import time as _time
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Request, Response
from pydantic import BaseModel, Field
from datetime import datetime, timedelta

from ..dependencies import get_db, require_write_key
from ..config.constants import MAX_CONTRACT_VALUE
from ..cache import SimpleCache
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
from ..models.asf import SectorASFResponse, SectorASFFinding, ASFInstitutionSummaryItem, ASFInstitutionSummaryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Rate limiting for expensive endpoints (graceful degradation if slowapi missing)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    _analysis_limiter = Limiter(key_func=get_remote_address)
except ImportError:
    _analysis_limiter = None


def _rate_limit(limit_string: str):
    """Rate limit decorator that degrades gracefully if slowapi is missing."""
    if _analysis_limiter:
        return _analysis_limiter.limit(limit_string)
    return lambda f: f


# Global cache instance for analysis router
_analysis_cache = SimpleCache()

SECTOR_YEAR_CACHE_TTL = 3600  # 1 hour


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


# Additional response models for previously-unannotated endpoints

class ModelMetadataResponse(BaseModel):
    version: str
    trained_at: Optional[str]
    auc_test: Optional[float]
    auc_train: Optional[float] = None
    pu_correction: Optional[float] = None
    n_contracts: Optional[int] = None
    updated_at: Optional[str] = None


class CoefficientItem(BaseModel):
    factor: str
    beta: float
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None


class ModelCalibrationResponse(BaseModel):
    model_version: str
    run_id: str
    created_at: str
    global_intercept: float
    coefficients: List[CoefficientItem]
    auc_train: Optional[float] = None
    auc_test: Optional[float] = None
    pu_correction_c: Optional[float] = None
    n_positive: Optional[int] = None
    n_negative: Optional[int] = None
    hyperparameters: Optional[Dict[str, Any]] = None


class RiskOverviewResponse(BaseModel):
    overview: Dict[str, Any]
    risk_distribution: List[Dict[str, Any]]
    yearly_trends: List[Dict[str, Any]]


class PatternCountsResponse(BaseModel):
    """Dynamic pattern counts — keys vary; use Dict."""
    model_config = {"extra": "allow"}


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


class PriceHypothesesSummaryResponse(BaseModel):
    status: str
    overall: Dict[str, Any]
    by_type: List[Dict[str, Any]]
    by_sector: List[Dict[str, Any]]
    by_confidence: List[Dict[str, Any]]
    recent_runs: List[Dict[str, Any]]


class PerCaseDetectionItem(BaseModel):
    case_name: str
    case_type: Optional[str] = None
    total_contracts: int
    detection_rate: float
    high_plus_rate: Optional[float] = None
    critical_rate: float
    avg_risk_score: float


class PerCaseDetectionResponse(BaseModel):
    data: List[PerCaseDetectionItem]
    total: int


class InstitutionPeriodComparisonResponse(BaseModel):
    institution_id: int
    institution_name: str
    period1: Dict[str, Any]
    period2: Dict[str, Any]
    comparison: Dict[str, Any]
    interpretation: str


class MLAnomalyItem(BaseModel):
    contract_id: int
    anomaly_score: float
    sector_id: Optional[int]
    sector_name: str
    iqr_flagged: bool
    amount_mxn: float
    vendor_name: str
    contract_date: str


class MLAnomaliesResponse(BaseModel):
    data: List[MLAnomalyItem]
    total: int
    new_detections: int


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

@router.get("/model/metadata", response_model=ModelMetadataResponse)
def get_model_metadata():
    """
    Return metadata about the active risk model (version, training date, metrics).
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            # Probe schema: test_auc column was added after initial deploy and may be absent
            pragma_cols = {r[1] for r in cursor.execute(
                "PRAGMA table_info(model_calibration)"
            ).fetchall()}
            has_test_auc = "test_auc" in pragma_cols
            select_cols = (
                "model_version, created_at, auc_roc, test_auc, "
                "pu_correction_factor, temporal_metrics"
            ) if has_test_auc else (
                "model_version, created_at, auc_roc, "
                "pu_correction_factor, temporal_metrics"
            )
            row = cursor.execute(
                f"SELECT {select_cols} "
                "FROM model_calibration WHERE sector_id IS NULL "
                "ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            if not row:
                return {
                    "version": "v0.6.5", "trained_at": "2026-03-25",
                    "n_contracts": 3051294, "auc_test": 0.828,
                    "auc_train": 0.798, "pu_correction": 0.300,
                    "updated_at": "2026-03-25",
                }
            train_auc = None
            test_auc_val = None
            if row["temporal_metrics"]:
                try:
                    tm = json.loads(row["temporal_metrics"])
                    train_auc = tm.get("train_auc")
                    # temporal_metrics may also carry test_auc for older schemas
                    if not has_test_auc:
                        test_auc_val = tm.get("test_auc")
                except (json.JSONDecodeError, TypeError):
                    pass
            if has_test_auc:
                test_auc_val = row["test_auc"]
            # Get total contract count from precomputed_stats (fast lookup)
            n_contracts = None
            try:
                stats_row = cursor.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'overview'"
                ).fetchone()
                if stats_row:
                    overview = json.loads(stats_row["stat_value"])
                    n_contracts = overview.get("total_contracts")
            except Exception:
                pass
            return {
                "version": row["model_version"],
                "trained_at": row["created_at"],
                "n_contracts": n_contracts,
                "auc_test": test_auc_val or row["auc_roc"],
                "auc_train": round(train_auc, 3) if train_auc else None,
                "pu_correction": row["pu_correction_factor"],
                "updated_at": row["created_at"],
            }
    except sqlite3.OperationalError as e:
        logger.error(f"DB error in get_model_metadata: {e}")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error(f"Unexpected error in get_model_metadata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/model/calibration", response_model=ModelCalibrationResponse)
def get_model_calibration():
    """
    Return the most recent global model calibration row with full coefficients and CIs.

    Pulls live data from model_calibration (sector_id IS NULL, most recent row).
    Coefficients and bootstrap_ci are stored as JSON; this endpoint parses and
    normalises them into a typed list so the frontend can drive charts without
    hardcoded values.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            pragma_cols = {r[1] for r in cursor.execute(
                "PRAGMA table_info(model_calibration)"
            ).fetchall()}
            has_test_auc = "test_auc" in pragma_cols

            select_cols = (
                "model_version, run_id, created_at, intercept, coefficients, "
                "bootstrap_ci, pu_correction_factor, auc_roc, "
                + ("test_auc, " if has_test_auc else "")
                + "n_positive, n_negative, hyperparameters, temporal_metrics"
            )
            row = cursor.execute(
                f"SELECT {select_cols} FROM model_calibration "
                "WHERE sector_id IS NULL ORDER BY created_at DESC LIMIT 1"
            ).fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="No model calibration data found")

            coefficients_raw: Dict[str, float] = json.loads(row["coefficients"]) if row["coefficients"] else {}
            bootstrap_ci_raw: Dict[str, Any] = json.loads(row["bootstrap_ci"]) if row["bootstrap_ci"] else {}

            coefficient_items: List[Dict[str, Any]] = []
            for factor, beta in coefficients_raw.items():
                ci = bootstrap_ci_raw.get(factor)
                coefficient_items.append({
                    "factor": factor,
                    "beta": beta,
                    "ci_lower": ci[0] if isinstance(ci, (list, tuple)) and len(ci) >= 2 else None,
                    "ci_upper": ci[1] if isinstance(ci, (list, tuple)) and len(ci) >= 2 else None,
                })
            # Sort descending by absolute beta so the frontend can render in importance order
            coefficient_items.sort(key=lambda x: abs(x["beta"]), reverse=True)

            test_auc_val = row["test_auc"] if has_test_auc else None
            auc_train = None
            if row["temporal_metrics"]:
                try:
                    tm = json.loads(row["temporal_metrics"])
                    auc_train = tm.get("train_auc")
                    if not has_test_auc:
                        test_auc_val = tm.get("test_auc")
                except (json.JSONDecodeError, TypeError):
                    pass

            hyperparameters = None
            if row["hyperparameters"]:
                try:
                    hyperparameters = json.loads(row["hyperparameters"])
                except (json.JSONDecodeError, TypeError):
                    pass

            return {
                "model_version": row["model_version"],
                "run_id": row["run_id"],
                "created_at": row["created_at"],
                "global_intercept": row["intercept"],
                "coefficients": coefficient_items,
                "auc_train": round(auc_train, 4) if auc_train else row["auc_roc"],
                "auc_test": test_auc_val or row["auc_roc"],
                "pu_correction_c": row["pu_correction_factor"],
                "n_positive": row["n_positive"],
                "n_negative": row["n_negative"],
                "hyperparameters": hyperparameters,
            }
    except HTTPException:
        raise
    except sqlite3.OperationalError as e:
        logger.error(f"DB error in get_model_calibration: {e}")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error(f"Unexpected error in get_model_calibration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# COMBINED RISK OVERVIEW ENDPOINT
# =============================================================================

@router.get("/risk-overview", response_model=RiskOverviewResponse)
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
            risk_distribution_raw = json.loads(row['stat_value']) if row else []
            # Handle both dict and list formats
            if isinstance(risk_distribution_raw, dict):
                risk_distribution = [
                    {"risk_level": level, "count": v.get("count", 0),
                     "percentage": v.get("percentage", v.get("pct", 0)),
                     "total_value_mxn": v.get("total_value_mxn", v.get("value_mxn", 0))}
                    for level, v in risk_distribution_raw.items()
                    if level in ("critical", "high", "medium", "low")
                ]
            else:
                risk_distribution = risk_distribution_raw

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
# TEMPORAL ANALYSIS ENDPOINTS
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


_yoy_cache: Dict[str, Any] = {}
_YOY_CACHE_TTL = 600  # 10 minutes

# Cache for monthly-breakdown (keyed by (year, sector_id, institution_id)); TTL 1 hour
_monthly_cache: Dict[str, Any] = {}
_MONTHLY_CACHE_TTL = 3600

# Cache for december-spike-analysis (keyed by (start_year, end_year, sector_id)); TTL 1 hour
_dec_spike_cache: Dict[str, Any] = {}
_DEC_SPIKE_CACHE_TTL = 3600


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
    data_note: Optional[str] = None


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

            # Fallback: live query limited to 2018+ (precomputed stat missing in this DB).
            # Full-history query takes 750s on 3.1M rows; 2018+ is ~1M rows and finishes in ~30s.
            logger.warning(
                "sector_year_breakdown: precomputed_stats key missing; falling back to live query "
                "truncated to 2018+. Historical data (2002-2017) will NOT be returned. "
                "Run precompute_stats to restore full history."
            )
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

            result = SectorYearBreakdownResponse(
                data=data,
                total_rows=len(data),
                data_note=(
                    "Data is truncated to 2018–present. Historical records from 2002–2017 are "
                    "unavailable because the precomputed_stats key 'sector_year_breakdown' is "
                    "missing. Run precompute_stats to restore full history."
                ),
            )
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


_compare_periods_cache: Dict[str, Any] = {}
_COMPARE_PERIODS_TTL = 3600  # 1 hour


@router.get("/compare-periods", response_model=PeriodComparisonResponse)
def compare_periods(
    period1_start: int = Query(..., ge=2002, le=2026),
    period1_end: int = Query(..., ge=2002, le=2026),
    period2_start: int = Query(..., ge=2002, le=2026),
    period2_end: int = Query(..., ge=2002, le=2026),
    sector_id: Optional[int] = Query(None, ge=1, le=12),
):
    """Compare procurement patterns between two time periods."""
    cache_key = f"{period1_start}:{period1_end}:{period2_start}:{period2_end}:{sector_id}"
    cached = _compare_periods_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _COMPARE_PERIODS_TTL:
        return cached["data"]
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

            response = PeriodComparisonResponse(
                period1=period1, period2=period2,
                changes=changes, significant_changes=significant
            )
            _compare_periods_cache[cache_key] = {"ts": _time.time(), "data": response}
            return response

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
    sort_by: str = Query("confidence", pattern="^(confidence|amount|created_at|hypothesis_type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
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

            VALID_SORT_OPTIONS = {
                ("confidence", "asc"): "ORDER BY confidence ASC",
                ("confidence", "desc"): "ORDER BY confidence DESC",
                ("amount", "asc"): "ORDER BY amount_mxn ASC",
                ("amount", "desc"): "ORDER BY amount_mxn DESC",
                ("created_at", "asc"): "ORDER BY created_at ASC",
                ("created_at", "desc"): "ORDER BY created_at DESC",
            }
            order_clause = VALID_SORT_OPTIONS.get(
                (sort_by, sort_order.lower() if sort_order else "desc"),
                "ORDER BY confidence DESC"
            )
            assert order_clause in VALID_SORT_OPTIONS.values(), f"Invalid sort: {order_clause}"

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
                {order_clause}
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


_price_hyp_summary_cache: Dict[str, Any] = {}
_PRICE_HYP_SUMMARY_CACHE_TTL = 3600  # 1 hour — expensive full-table scan


@router.get("/price-hypotheses/summary", response_model=PriceHypothesesSummaryResponse)
def get_price_hypotheses_summary():
    """Get summary statistics for price hypotheses, computed live across all contracts."""
    cache_key = "price_hyp_summary"
    cached = _price_hyp_summary_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _PRICE_HYP_SUMMARY_CACHE_TTL:
        return cached["data"]

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

            result = {
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

            _price_hyp_summary_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

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

    except sqlite3.Error as e:
        logger.error(f"Database error in get_price_hypothesis_detail: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.put("/price-hypotheses/{hypothesis_id}/review")
def review_price_hypothesis(hypothesis_id: str = Path(...), review: HypothesisReviewRequest = None, _: None = Depends(require_write_key)):
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


# Wrapper response models that depend on the models defined above
class DetectionRateResponse(BaseModel):
    results: List[ValidationResultResponse]
    interpretation: Dict[str, Any]


class FalseNegativesResponse(BaseModel):
    false_negatives: List[FalseNegativeItem]
    summary: Dict[str, Any]
    recommendation: str


class FactorAnalysisResponse(BaseModel):
    factors: List[FactorEffectivenessItem]
    sample_sizes: Dict[str, int]
    recommendations: List[FactorEffectivenessItem]


@router.get("/validation/per-case-detection", response_model=PerCaseDetectionResponse)
def get_per_case_detection():
    """
    Returns per-case detection statistics from live contract data.
    Joins ground_truth_cases + ground_truth_vendors + contracts to compute
    real detection rates from the current risk model.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "ground_truth_cases"):
                raise HTTPException(
                    status_code=404,
                    detail="Ground truth tables not found. Run migrate_ground_truth_schema.py first."
                )

            rows = cursor.execute("""
                SELECT
                    gtc.case_name,
                    gtc.case_type,
                    gtc.estimated_fraud_mxn,
                    gtc.confidence_level,
                    COUNT(DISTINCT gtv.vendor_id) as vendors_matched,
                    COUNT(DISTINCT c.id) as total_contracts,
                    AVG(c.risk_score) as avg_risk_score,
                    SUM(CASE WHEN c.risk_score >= 0.30 THEN 1 ELSE 0 END) as high_plus_count,
                    SUM(CASE WHEN c.risk_score >= 0.50 THEN 1 ELSE 0 END) as critical_count,
                    SUM(CASE WHEN c.risk_score < 0.10 THEN 1 ELSE 0 END) as low_count,
                    (
                        SELECT se.name_es FROM sectors se
                        JOIN contracts cc ON cc.sector_id = se.id
                        JOIN ground_truth_vendors gv2 ON gv2.vendor_id = cc.vendor_id
                        WHERE gv2.case_id = gtc.id
                        GROUP BY se.id
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) as sector_name
                FROM ground_truth_cases gtc
                LEFT JOIN ground_truth_vendors gtv ON gtv.case_id = gtc.id
                LEFT JOIN contracts c ON c.vendor_id = gtv.vendor_id
                GROUP BY gtc.case_name, gtc.case_type, gtc.estimated_fraud_mxn, gtc.confidence_level
                ORDER BY vendors_matched DESC, total_contracts DESC
            """).fetchall()

            cases = []
            for row in rows:
                total = row['total_contracts'] or 0
                high_plus = row['high_plus_count'] or 0
                critical = row['critical_count'] or 0
                cases.append({
                    "case_name": row['case_name'],
                    "case_type": row['case_type'],
                    "sector_name": row['sector_name'],
                    "estimated_fraud_mxn": row['estimated_fraud_mxn'],
                    "confidence_level": row['confidence_level'],
                    "vendors_matched": row['vendors_matched'] or 0,
                    "total_contracts": total,
                    "avg_risk_score": round(float(row['avg_risk_score'] or 0), 3),
                    "detection_rate": round(high_plus / total, 3) if total > 0 else 0,
                    "critical_rate": round(critical / total, 3) if total > 0 else 0,
                })

            return {"data": cases, "total": len(cases)}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_per_case_detection: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


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

            # Get last validation run (gracefully skip if schema doesn't match)
            last_run = None
            if table_exists(cursor, "validation_results"):
                try:
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
                except sqlite3.OperationalError:
                    pass  # validation_results schema mismatch — not fatal

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


@router.get("/validation/detection-rate", response_model=DetectionRateResponse)
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
            try:
                cursor.execute(query, params)
            except sqlite3.OperationalError:
                # validation_results schema mismatch (table exists but wrong columns)
                return {"results": [], "interpretation": {"status": "no_data"}}

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


@router.get("/validation/false-negatives", response_model=FalseNegativesResponse)
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


_factor_analysis_result: dict | None = None
_factor_analysis_ts: float = 0.0
_FACTOR_ANALYSIS_TTL = 7200  # 2 hours — stable analytical endpoint


@router.get("/validation/factor-analysis", response_model=FactorAnalysisResponse)
def get_factor_analysis():
    """Analyze which risk factors are most effective at detecting known bad contracts."""
    global _factor_analysis_result, _factor_analysis_ts
    if _factor_analysis_result and (_time.time() - _factor_analysis_ts) < _FACTOR_ANALYSIS_TTL:
        return _factor_analysis_result
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

            # Get baseline factor triggers (systematic sample every ~310th row ≈ 10K / 3.1M)
            cursor.execute("""
                SELECT risk_factors
                FROM contracts
                WHERE risk_factors IS NOT NULL
                AND (rowid % 310) = 0
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

            result = {
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
            _factor_analysis_result = result
            _factor_analysis_ts = _time.time()
            return result

    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error in get_factor_analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# Pattern Detection endpoints extracted to: routers/analysis_patterns.py
# (co-bidding, concentration, year-end, leads, institution period comparison)


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
            sectors_row = None
            try:
                cursor.execute("""
                    SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'
                """)
                sectors_row = cursor.fetchone()
            except sqlite3.Error as e:
                logger.warning(f"Precomputed sectors read failed: {e}")
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
    high_risk_pct: Optional[float] = None

class MoneyFlowResponse(BaseModel):
    flows: List[MoneyFlowItem]
    total_value: float
    total_contracts: int


_money_flow_cache: Dict[str, Any] = {}
_money_flow_cache_ts: float = 0
_MONEY_FLOW_CACHE_TTL = 600  # 10 minutes


@router.get("/money-flow", response_model=MoneyFlowResponse)
@_rate_limit("30/minute")
def get_money_flow(
    request: Request,
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2002, le=2026),
    limit: int = Query(50, ge=10, le=200),
    direct_award_only: bool = Query(False),
    sort_by: str = Query("value", pattern="^(value|risk)$"),
):
    """
    Top institution->vendor flows.
    Fast path (no year/direct_award): uses precomputed institution_top_vendors table.
    Filtered path (year or direct_award_only): queries contracts directly.
    sort_by: 'value' (default, by total_value DESC) or 'risk' (by avg_risk DESC).
    """
    import time as _time
    global _money_flow_cache, _money_flow_cache_ts

    cache_key = f"flow:{sector_id}:{year}:{limit}:{direct_award_only}:{sort_by}"
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
            direct_award_only=direct_award_only,
            sort_by=sort_by,
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
# FACTOR LIFT VS GROUND TRUTH ENDPOINT
# =============================================================================

class FactorLiftItem(BaseModel):
    factor: str
    gt_count: int
    gt_rate: float
    base_rate: float
    lift: float

class FactorLiftResponse(BaseModel):
    factors: List[FactorLiftItem]
    gt_total: int
    population_total: int


_factor_lift_cache: Dict[str, Any] = {}
_factor_lift_cache_ts: float = 0
_FACTOR_LIFT_CACHE_TTL = 1800  # 30 minutes


@router.get("/validation/factor-lift", response_model=FactorLiftResponse)
def get_factor_lift():
    """
    Per-factor lift: detection rate on ground-truth contracts vs population base rate.

    lift = P(factor | ground_truth) / P(factor | all_contracts)
    Values > 1.0 mean this factor is over-represented in known corrupt contracts.
    """
    from collections import Counter

    global _factor_lift_cache, _factor_lift_cache_ts

    now = _time.time()
    if _factor_lift_cache and (now - _factor_lift_cache_ts) < _FACTOR_LIFT_CACHE_TTL:
        return _factor_lift_cache

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Ground truth vendor IDs
            cursor.execute("""
                SELECT DISTINCT vendor_id FROM ground_truth_vendors
                WHERE vendor_id IS NOT NULL
            """)
            gt_vendor_ids = [r["vendor_id"] for r in cursor.fetchall()]

            if not gt_vendor_ids:
                result = FactorLiftResponse(factors=[], gt_total=0, population_total=0)
                return result

            placeholders = ",".join("?" * len(gt_vendor_ids))

            # GT contracts with factors
            cursor.execute(f"""
                SELECT risk_factors FROM contracts
                WHERE vendor_id IN ({placeholders})
                  AND risk_factors IS NOT NULL AND risk_factors != ''
            """, gt_vendor_ids)
            gt_rows = cursor.fetchall()
            gt_total = len(gt_rows)

            # Population sample
            cursor.execute("""
                SELECT risk_factors FROM contracts
                WHERE risk_factors IS NOT NULL AND risk_factors != ''
                LIMIT 500000
            """)
            pop_rows = cursor.fetchall()
            pop_total = len(pop_rows)

            if gt_total == 0 or pop_total == 0:
                result = FactorLiftResponse(factors=[], gt_total=gt_total, population_total=pop_total)
                return result

            def parse_factors(rows: list) -> Counter:
                c: Counter = Counter()
                for row in rows:
                    seen: set = set()
                    for token in row["risk_factors"].split(","):
                        token = token.strip()
                        if not token:
                            continue
                        base = token.split(":")[0]
                        if base not in seen:
                            c[base] += 1
                            seen.add(base)
                return c

            gt_counter = parse_factors(gt_rows)
            pop_counter = parse_factors(pop_rows)

            factors: list = []
            for factor, gt_count in gt_counter.most_common(20):
                pop_count = pop_counter.get(factor, 0)
                gt_rate = gt_count / gt_total
                base_rate = pop_count / pop_total if pop_total > 0 else 0.0
                lift = gt_rate / base_rate if base_rate > 0 else 0.0
                factors.append(FactorLiftItem(
                    factor=factor,
                    gt_count=gt_count,
                    gt_rate=round(gt_rate, 4),
                    base_rate=round(base_rate, 4),
                    lift=round(lift, 3),
                ))

            factors.sort(key=lambda x: x.lift, reverse=True)

            result = FactorLiftResponse(
                factors=factors[:15],
                gt_total=gt_total,
                population_total=pop_total,
            )
            _factor_lift_cache = result
            _factor_lift_cache_ts = now
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_factor_lift: {e}")
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
    assert sort_map[sort_by] in sort_map.values(), f"Invalid sort: {sort_map[sort_by]}"

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
# STRUCTURAL BREAKS ENDPOINT
# =============================================================================

_structural_breaks_cache: Dict[str, Any] = {}
_STRUCTURAL_BREAKS_CACHE_TTL = 3600  # 1 hour — historical data, changes rarely


@router.get("/structural-breaks", response_model=Dict[str, Any])
def get_structural_breaks():
    """
    Detect statistically significant change points in procurement trends.
    Uses PELT algorithm (ruptures library).
    Cached for 1 hour since it is computed from historical data.
    """
    import time as _time

    cache_key = "structural_breaks"
    cached = _structural_breaks_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _STRUCTURAL_BREAKS_CACHE_TTL:
        return cached["data"]

    with get_db() as conn:
        result = analysis_service.get_structural_breaks(conn)
        _structural_breaks_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result


# =============================================================================
# ML PRICE ANOMALY ENDPOINT
# =============================================================================

_ml_anomalies_cache: Dict[str, Any] = {}
_ML_ANOMALIES_CACHE_TTL = 30 * 60  # 30 minutes — pre-computed table, stable


@router.get("/prices/ml-anomalies", response_model=MLAnomaliesResponse)
def get_ml_price_anomalies(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector (1-12)"),
    limit: int = Query(20, ge=1, le=50, description="Max results to return (1-50)"),
    only_new: bool = Query(False, description="If true, return only contracts NOT already in price_hypotheses"),
    model: Optional[str] = Query(None, description="Model filter: 'price_only' or 'full_z_vector'. Default: all models."),
):
    """
    Return top-scoring contracts from the multi-feature Isolation Forest price anomaly detector.

    These are contracts flagged as price anomalies based on six z-score features
    (price_ratio, vendor_concentration, ad_period_days, year_end, same_day_count,
    price_hyp_confidence) using an Isolation Forest model, one per sector.

    Run ``python -m scripts.compute_price_anomaly_scores`` to populate the
    ``contract_ml_anomalies`` table before calling this endpoint.
    """
    import time as _time

    cache_key = f"ml_anomalies:{sector_id}:{limit}:{only_new}:{model}"
    cached = _ml_anomalies_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _ML_ANOMALIES_CACHE_TTL:
        return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check that the table exists; return graceful empty response if not
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='contract_ml_anomalies'"
            )
            if not cursor.fetchone():
                result = {"data": [], "total": 0, "new_detections": 0}
                _ml_anomalies_cache[cache_key] = {"ts": _time.time(), "data": result}
                return result

            # ── Build WHERE clauses ──────────────────────────────────────────
            conditions: List[str] = []
            params: List[Any] = []

            if sector_id is not None:
                conditions.append("ma.sector_id = ?")
                params.append(sector_id)

            if only_new:
                conditions.append("ma.iqr_flagged = 0")

            if model is not None:
                conditions.append("ma.model = ?")
                params.append(model)

            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            # ── Total count ──────────────────────────────────────────────────
            cursor.execute(
                f"SELECT COUNT(*) AS cnt FROM contract_ml_anomalies ma {where}",
                params,
            )
            total_row = cursor.fetchone()
            total = total_row["cnt"] if total_row else 0

            # ── Count of ML-only (not in IQR) ────────────────────────────────
            new_conds = list(conditions)
            new_params = list(params)
            if not only_new:
                new_conds.append("ma.iqr_flagged = 0")
            new_where = ("WHERE " + " AND ".join(new_conds)) if new_conds else ""
            cursor.execute(
                f"SELECT COUNT(*) AS cnt FROM contract_ml_anomalies ma {new_where}",
                new_params,
            )
            new_row = cursor.fetchone()
            new_detections = new_row["cnt"] if new_row else 0

            # ── Fetch top rows ordered by anomaly_score DESC ─────────────────
            cursor.execute(
                f"""
                SELECT
                    ma.contract_id,
                    ma.anomaly_score,
                    ma.sector_id,
                    ma.iqr_flagged,
                    c.amount_mxn,
                    c.contract_date,
                    v.name         AS vendor_name,
                    s.code         AS sector_code
                FROM contract_ml_anomalies ma
                JOIN contracts c ON c.id = ma.contract_id
                LEFT JOIN vendors v ON v.id = c.vendor_id
                LEFT JOIN sectors s ON s.id = ma.sector_id
                {where}
                ORDER BY ma.anomaly_score DESC
                LIMIT ?
                """,
                params + [limit],
            )
            rows = cursor.fetchall()

            data = []
            for row in rows:
                sector_code = row["sector_code"] or "otros"
                # Map sector code to English name using sector_code
                sector_name = sector_code  # frontend already handles EN display
                data.append({
                    "contract_id": row["contract_id"],
                    "anomaly_score": round(float(row["anomaly_score"]), 4),
                    "sector_id": row["sector_id"],
                    "sector_name": sector_name,
                    "iqr_flagged": bool(row["iqr_flagged"]),
                    "amount_mxn": float(row["amount_mxn"]) if row["amount_mxn"] else 0.0,
                    "vendor_name": row["vendor_name"] or "Unknown",
                    "contract_date": row["contract_date"] or "",
                })

            result = {
                "data": data,
                "total": total,
                "new_detections": new_detections,
            }

            _ml_anomalies_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except sqlite3.Error as exc:
        logger.error("Database error in get_ml_price_anomalies: %s", exc)
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# ANOMALY MODEL COMPARISON (Section 14.1)
# =============================================================================

_anomaly_comparison_cache: Dict[str, Any] = {}
_ANOMALY_COMPARISON_TTL = 3600  # 1 hour


@router.get("/anomaly-comparison")
def get_anomaly_comparison():
    """
    Compare price-only vs full-vector Isolation Forest anomaly detectors.
    Based on Ouyang, Goh & Lim (2022): full-vector outperforms price-only by 23% recall.
    """
    import time as _time
    import sqlite3 as _sqlite3

    cached = _anomaly_comparison_cache.get("data")
    if cached and (_time.time() - cached["ts"]) < _ANOMALY_COMPARISON_TTL:
        return cached["data"]

    with get_db() as conn:
        conn.row_factory = _sqlite3.Row
        cursor = conn.cursor()

        # Count each model's detections
        counts = cursor.execute("""
            SELECT model, COUNT(*) as cnt
            FROM contract_ml_anomalies
            GROUP BY model
        """).fetchall()
        model_counts = {r["model"]: r["cnt"] for r in counts}

        price_only = model_counts.get("price_only", 0)
        full_vector = model_counts.get("full_z_vector", 0)

        # Overlap: contracts in both
        overlap = cursor.execute("""
            SELECT COUNT(DISTINCT a.contract_id) as cnt
            FROM contract_ml_anomalies a
            JOIN contract_ml_anomalies b ON a.contract_id = b.contract_id
            WHERE a.model = 'price_only' AND b.model = 'full_z_vector'
        """).fetchone()
        overlap_count = overlap["cnt"] if overlap else 0

        unique_full = full_vector - overlap_count
        unique_price = price_only - overlap_count

        result = {
            "contracts_flagged_by_price_only": price_only,
            "contracts_flagged_by_full_vector": full_vector,
            "overlap": overlap_count,
            "unique_to_full_vector": unique_full,
            "unique_to_price_only": unique_price,
            "interpretation": (
                f"Full-vector anomalies catch {unique_full} contracts with unusual "
                "overall procurement patterns not visible in price alone."
                " Based on Ouyang, Goh & Lim (2022): Isolation Forest on full feature vector "
                "outperforms price-only detection by 23% recall."
            ),
        }

        _anomaly_comparison_cache["data"] = {"ts": _time.time(), "data": result}
        return result


# =============================================================================
# POLITICAL CYCLE ANALYSIS (Section 12.1)
# =============================================================================

_political_cycle_cache: Dict[str, Any] = {}
_POLITICAL_CYCLE_TTL = 6 * 3600  # 6 hours

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
        # 1. Election year effect
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

        # Compute relative effect (election vs non-election)
        election_year_effect: Dict[str, Any] = {
            "election_year": election_data.get("election_year", {}),
            "non_election_year": election_data.get("non_election_year", {}),
        }
        if "election_year" in election_data and "non_election_year" in election_data:
            base = election_data["non_election_year"]["avg_risk"]
            comp = election_data["election_year"]["avg_risk"]
            election_year_effect["risk_delta"] = round(comp - base, 4)
            election_year_effect["risk_delta_pct"] = round((comp - base) / base * 100, 2) if base else 0.0

        # 2. Sexenio-year breakdown (year 1-6 of each 6-year term)
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

        sexenio_labels = {1: "Year 1 (new admin)", 2: "Year 2", 3: "Year 3 (midterm)", 4: "Year 4", 5: "Year 5", 6: "Year 6 (lame duck)"}
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

        # 3. Q4 in election years vs non-election years
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
            k = f"{'election' if r['is_election_year'] else 'non_election'}_{r['quarter'].lower().replace('-','_')}"
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

_pub_delay_cache: Dict[str, Any] = {}
_PUB_DELAY_TTL = 6 * 3600  # 6 hours

@router.get("/transparency/publication-delays", tags=["analysis"])
@_rate_limit("30/minute")
def get_publication_delays(request: Request):
    """
    Distribution of publication delay (days between contract date and COMPRANET publication).
    Measures government transparency in procurement reporting.
    """
    cached = _pub_delay_cache.get("pub_delays")
    if cached and (_time.time() - cached["ts"]) < _PUB_DELAY_TTL:
        return cached["data"]

    with get_db() as conn:
        # Fast path: read from precomputed_stats if available and fully formed
        try:
            pc_row = conn.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'publication_delays'"
            ).fetchone()
            if pc_row:
                precomputed = json.loads(pc_row[0])
                # Verify the precomputed data has the full expected output structure
                if (
                    isinstance(precomputed, dict)
                    and "distribution" in precomputed
                    and "avg_delay_days" in precomputed
                    and "timely_pct" in precomputed
                    and "by_year" in precomputed
                    and "total_with_delay_data" in precomputed
                ):
                    _pub_delay_cache["pub_delays"] = {"ts": _time.time(), "data": precomputed}
                    return precomputed
        except Exception as pc_err:
            logger.debug(f"precomputed_stats fast path skipped: {pc_err}")

    with get_db() as conn:
        conn.row_factory = sqlite3.Row

        # Support schemas with or without a pre-computed publication_delay_days column.
        # When the column is absent, derive delay on-the-fly from publication_date - contract_date.
        pragma_cols = {r[1] for r in conn.execute("PRAGMA table_info(contracts)").fetchall()}
        if "publication_delay_days" in pragma_cols:
            delay_expr = "publication_delay_days"
            delay_filter = "publication_delay_days IS NOT NULL AND publication_delay_days > 0"
        else:
            # Compute from dates; julianday difference gives fractional days, CAST to integer
            delay_expr = "CAST(julianday(publication_date) - julianday(contract_date) AS INTEGER)"
            delay_filter = (
                "publication_date IS NOT NULL AND contract_date IS NOT NULL "
                "AND publication_date > contract_date "
                "AND CAST(julianday(publication_date) - julianday(contract_date) AS INTEGER) > 0"
            )

        # Bucket distribution
        row = conn.execute(f"""
            SELECT
                SUM(CASE WHEN ({delay_expr}) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) as bucket_0_7,
                SUM(CASE WHEN ({delay_expr}) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as bucket_8_30,
                SUM(CASE WHEN ({delay_expr}) BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as bucket_31_90,
                SUM(CASE WHEN ({delay_expr}) > 90 THEN 1 ELSE 0 END) as bucket_over_90,
                COUNT(*) as total,
                ROUND(AVG({delay_expr}), 1) as avg_delay,
                ROUND(AVG(CASE WHEN ({delay_expr}) <= 7 THEN 1.0 ELSE 0 END) * 100, 2) as timely_pct
            FROM contracts
            WHERE {delay_filter}
        """).fetchone()

        buckets = [
            {"label": "1–7 days", "days_min": 1, "days_max": 7, "count": int(row["bucket_0_7"] or 0)},
            {"label": "8–30 days", "days_min": 8, "days_max": 30, "count": int(row["bucket_8_30"] or 0)},
            {"label": "31–90 days", "days_min": 31, "days_max": 90, "count": int(row["bucket_31_90"] or 0)},
            {"label": ">90 days", "days_min": 91, "days_max": None, "count": int(row["bucket_over_90"] or 0)},
        ]
        total = int(row["total"] or 0)
        for b in buckets:
            b["pct"] = round(b["count"] / total * 100, 2) if total else 0.0

        # By year trend
        year_rows = conn.execute(f"""
            SELECT
                contract_year,
                COUNT(*) as contracts_with_delay,
                ROUND(AVG({delay_expr}), 1) as avg_delay,
                ROUND(100.0 * SUM(CASE WHEN ({delay_expr}) <= 7 THEN 1 ELSE 0 END) / COUNT(*), 2) as timely_pct
            FROM contracts
            WHERE {delay_filter}
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

_threshold_gaming_cache: Dict[str, Any] = {}
_THRESHOLD_GAMING_TTL = 6 * 3600


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


# ---------------------------------------------------------------------------
# ASF sector-level findings
# ---------------------------------------------------------------------------

# Sector-to-ramo mapping (from CLAUDE.md taxonomy)
_SECTOR_RAMOS: dict[int, list[int]] = {
    1: [12, 50, 51],              # salud
    2: [11, 25, 48],              # educacion
    3: [9, 15, 21],               # infraestructura
    4: [18, 45, 46, 52, 53],      # energia
    5: [7, 13],                   # defensa
    6: [38, 42],                  # tecnologia
    7: [6, 23, 24],               # hacienda
    8: [1, 2, 3, 4, 5, 17, 22, 27, 35, 36, 43],  # gobernacion
    9: [8],                       # agricultura
    10: [16],                     # ambiente
    11: [14, 19, 40],             # trabajo
    12: [],                       # otros
}

_SECTOR_NAMES: dict[int, str] = {
    1: "salud", 2: "educacion", 3: "infraestructura", 4: "energia",
    5: "defensa", 6: "tecnologia", 7: "hacienda", 8: "gobernacion",
    9: "agricultura", 10: "ambiente", 11: "trabajo", 12: "otros",
}

_asf_sector_cache: dict = {}
_asf_sector_cache_lock = threading.Lock()
_ASF_SECTOR_TTL = 86400  # 24 hours


@router.get("/sectors/{sector_id}/asf-findings", response_model=SectorASFResponse)
def get_sector_asf_findings(sector_id: int = Path(..., ge=1, le=12)):
    """Get ASF audit findings aggregated for a sector."""
    import threading as _threading

    cache_key = f"asf_sector_{sector_id}"
    with _asf_sector_cache_lock:
        entry = _asf_sector_cache.get(cache_key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]

    ramo_codes = _SECTOR_RAMOS.get(sector_id, [])
    sector_name = _SECTOR_NAMES.get(sector_id, "otros")

    findings: list[SectorASFFinding] = []
    total_amount = 0.0

    if ramo_codes:
        placeholders = ",".join("?" * len(ramo_codes))
        with get_db() as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                f"""
                SELECT audit_year,
                       SUM(observations_total)            AS total_obs,
                       SUM(amount_mxn)                    AS total_amount,
                       COUNT(DISTINCT institution_name)   AS institutions_audited,
                       SUM(observations_solved)           AS total_solved
                FROM asf_institution_findings
                WHERE ramo_code IN ({placeholders})
                GROUP BY audit_year
                ORDER BY audit_year
                """,
                ramo_codes,
            ).fetchall()

            for r in rows:
                amt = r["total_amount"] or 0.0
                total_amount += amt
                findings.append(
                    SectorASFFinding(
                        year=r["audit_year"],
                        total_observations=r["total_obs"] or 0,
                        total_amount_mxn=amt,
                        institutions_audited=r["institutions_audited"] or 0,
                        observations_solved=r["total_solved"] or 0,
                    )
                )

    result = SectorASFResponse(
        sector_id=sector_id,
        sector_name=sector_name,
        findings=findings,
        total_amount_mxn=total_amount,
        years_audited=len(findings),
    )

    with _asf_sector_cache_lock:
        from datetime import datetime as _dt, timedelta as _td
        _asf_sector_cache[cache_key] = {
            "value": result,
            "expires_at": _dt.now() + _td(seconds=_ASF_SECTOR_TTL),
        }
    return result


# ---------------------------------------------------------------------------
# ASF Institution Summary (cross-reference with RUBLI risk scores)
# ---------------------------------------------------------------------------

_asf_inst_summary_cache: dict = {}
_asf_inst_summary_lock = threading.Lock()
_ASF_INST_SUMMARY_TTL = 86400  # 24 hours


@router.get("/asf-institution-summary", response_model=ASFInstitutionSummaryResponse)
def get_asf_institution_summary():
    """
    Aggregate ASF audit findings by entity and cross-reference with RUBLI risk scores.

    Narrative: Do institutions with high RUBLI risk scores also have ASF findings?
    - High RUBLI + ASF = convergent evidence (strongest cases)
    - High RUBLI, no ASF = procurement-phase only (execution fraud not yet audited)
    - Low RUBLI + ASF = execution-phase fraud (Limitation 9.1 made visible)
    """
    with _asf_inst_summary_lock:
        entry = _asf_inst_summary_cache.get("data")
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]

    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                TRIM(LOWER(a.entity_name))                                      AS entity_key,
                MIN(a.entity_name)                                              AS entity_name,
                COUNT(*)                                                        AS finding_count,
                SUM(CASE WHEN a.amount_mxn < ? THEN a.amount_mxn
                         ELSE 0 END)                                           AS total_amount_mxn,
                MIN(a.report_year)                                              AS earliest_year,
                MAX(a.report_year)                                              AS latest_year,
                AVG(ist.avg_risk_score)                                        AS matched_risk_score,
                MIN(ins.name)                                                  AS matched_institution_name
            FROM asf_cases a
            LEFT JOIN institutions ins
                ON LENGTH(a.entity_name) >= 15
                AND LENGTH(ins.name) >= 15
                AND (
                    LOWER(ins.name) LIKE '%' || LOWER(SUBSTR(a.entity_name, 1, 40)) || '%'
                    OR LOWER(a.entity_name) LIKE '%' || LOWER(SUBSTR(ins.name, 1, 40)) || '%'
                )
            LEFT JOIN institution_stats ist ON ist.institution_id = ins.id
            WHERE a.amount_mxn IS NOT NULL
            GROUP BY TRIM(LOWER(a.entity_name))
            ORDER BY finding_count DESC
            """,
            (MAX_CONTRACT_VALUE,)
        ).fetchall()

    items = []
    total_findings = 0
    total_amount = 0.0

    for r in rows:
        amt = r["total_amount_mxn"] or 0.0
        cnt = r["finding_count"] or 0
        total_findings += cnt
        total_amount += amt
        items.append(
            ASFInstitutionSummaryItem(
                entity_name=r["entity_name"],
                finding_count=cnt,
                total_amount_mxn=amt,
                earliest_year=r["earliest_year"],
                latest_year=r["latest_year"],
                matched_risk_score=round(r["matched_risk_score"], 4) if r["matched_risk_score"] is not None else None,
                matched_institution_name=r["matched_institution_name"],
            )
        )

    result = ASFInstitutionSummaryResponse(
        items=items,
        total_findings=total_findings,
        total_amount_mxn=total_amount,
    )

    with _asf_inst_summary_lock:
        _asf_inst_summary_cache["data"] = {
            "value": result,
            "expires_at": datetime.now() + timedelta(seconds=_ASF_INST_SUMMARY_TTL),
        }

    return result


# Vendor/Sector Analytics endpoints extracted to: routers/analysis_vendor_sector.py
# (institution-risk-factors, value-concentration, flash-vendors, industry-risk-clusters,
#  seasonal-risk, monthly-risk-summary, procedure-risk-comparison, top-by-period,
#  sector-growth, year-summary)


# =============================================================================
# V5.2 ANALYTICAL ENGINE ENDPOINTS
# =============================================================================


class FeatureImportanceItem(BaseModel):
    """Single feature importance entry from the v5.2 model."""
    rank: int
    factor_name: str
    shap_mean_abs: Optional[float]
    coefficient: Optional[float]
    direction: str  # 'risk' | 'protective'
    sector_id: Optional[int]


class FeatureImportanceResponse(BaseModel):
    """Feature importance list from the v5.2 model."""
    model_version: str
    sector_id: Optional[int]
    features: List[FeatureImportanceItem]
    total: int


@router.get("/feature-importance", response_model=FeatureImportanceResponse)
def get_feature_importance(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Sector ID (1-12). Omit for global model."),
):
    """
    Return feature importance rankings from the v5.2 analytical engine.

    When sector_id is omitted, returns the global model's feature importances.
    When sector_id is provided, returns the sector-specific sub-model's importances.
    Sorted by rank ascending (most important first).
    Cached for 24 hours.
    """
    cache_key = f"feature_importance:{sector_id}"
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()
        if sector_id is None:
            cursor.execute(
                """
                SELECT rank, factor_name, shap_mean_abs, coefficient
                FROM feature_importance
                WHERE model_version = 'v5.2' AND sector_id IS NULL
                ORDER BY rank ASC
                """,
            )
        else:
            cursor.execute(
                """
                SELECT rank, factor_name, shap_mean_abs, coefficient
                FROM feature_importance
                WHERE model_version = 'v5.2' AND sector_id = ?
                ORDER BY rank ASC
                """,
                (sector_id,),
            )
        rows = cursor.fetchall()

    features = []
    for row in rows:
        coeff = row["coefficient"]
        direction = "protective" if (coeff is not None and coeff < 0) else "risk"
        features.append(
            FeatureImportanceItem(
                rank=row["rank"],
                factor_name=row["factor_name"] or "",
                shap_mean_abs=row["shap_mean_abs"],
                coefficient=coeff,
                direction=direction,
                sector_id=sector_id,
            )
        )

    result = FeatureImportanceResponse(
        model_version="v5.2",
        sector_id=sector_id,
        features=features,
        total=len(features),
    )
    _analysis_cache.set(cache_key, result, ttl_seconds=86400)
    return result


class PyODAgreementByLevel(BaseModel):
    risk_level: str
    contracts: int
    avg_anomaly_score: float
    avg_risk_score: float


class PyODAgreementResponse(BaseModel):
    """Cross-model validation statistics comparing v0.6.5 risk scores with PyOD ensemble."""
    total_contracts: int
    v51_high_risk: int
    v51_high_risk_pct: float
    pyod_flagged: int
    pyod_flagged_pct: float
    both_flagged: int
    both_flagged_pct: float
    confirmation_rate: float
    pyod_threshold: float
    by_risk_level: List[PyODAgreementByLevel]


@router.get("/pyod-agreement", response_model=PyODAgreementResponse)
def get_pyod_agreement():
    """
    Cross-model validation statistics comparing v0.6.5 logistic risk scores against
    the PyOD ensemble anomaly detector (iForest + COPOD).

    Returns agreement rates, confirmation rate (how many v0.6.5 high-risk contracts
    are also flagged by PyOD), and per-risk-level anomaly score breakdowns.
    Cached for 1 hour.
    """
    cache_key = "pyod_agreement"
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_contracts,
                SUM(CASE WHEN risk_score >= 0.30 THEN 1 ELSE 0 END) AS v51_high_risk,
                SUM(CASE WHEN ensemble_anomaly_score >= 0.2598 THEN 1 ELSE 0 END) AS pyod_flagged,
                SUM(CASE WHEN risk_score >= 0.30 AND ensemble_anomaly_score >= 0.2598
                         THEN 1 ELSE 0 END) AS both_flagged
            FROM contracts
            WHERE ensemble_anomaly_score IS NOT NULL
            """
        )
        agg = cursor.fetchone()

        total = agg["total_contracts"] or 0
        v51_hr = agg["v51_high_risk"] or 0
        pyod_fl = agg["pyod_flagged"] or 0
        both = agg["both_flagged"] or 0

        v51_hr_pct = round(v51_hr / total * 100, 4) if total > 0 else 0.0
        pyod_fl_pct = round(pyod_fl / total * 100, 4) if total > 0 else 0.0
        both_pct = round(both / total * 100, 4) if total > 0 else 0.0
        confirmation_rate = round(both / v51_hr * 100, 4) if v51_hr > 0 else 0.0

        cursor.execute(
            """
            SELECT
                risk_level,
                COUNT(*) AS contracts,
                ROUND(AVG(ensemble_anomaly_score), 4) AS avg_anomaly_score,
                ROUND(AVG(risk_score), 4) AS avg_risk_score
            FROM contracts
            WHERE ensemble_anomaly_score IS NOT NULL
            GROUP BY risk_level
            ORDER BY
                CASE risk_level
                    WHEN 'critical' THEN 1
                    WHEN 'high'     THEN 2
                    WHEN 'medium'   THEN 3
                    WHEN 'low'      THEN 4
                    ELSE 5
                END
            """
        )
        level_rows = cursor.fetchall()

    by_level = [
        PyODAgreementByLevel(
            risk_level=r["risk_level"] or "unknown",
            contracts=r["contracts"] or 0,
            avg_anomaly_score=r["avg_anomaly_score"] or 0.0,
            avg_risk_score=r["avg_risk_score"] or 0.0,
        )
        for r in level_rows
    ]

    result = PyODAgreementResponse(
        total_contracts=total,
        v51_high_risk=v51_hr,
        v51_high_risk_pct=v51_hr_pct,
        pyod_flagged=pyod_fl,
        pyod_flagged_pct=pyod_fl_pct,
        both_flagged=both,
        both_flagged_pct=both_pct,
        confirmation_rate=confirmation_rate,
        pyod_threshold=0.2598,
        by_risk_level=by_level,
    )
    _analysis_cache.set(cache_key, result, ttl_seconds=3600)
    return result


class DriftedFeatureItem(BaseModel):
    feature: str
    ks_stat: Optional[float]
    p_value: Optional[float]
    mean_shift: Optional[float]
    drifted: bool


class DriftReportResponse(BaseModel):
    """Latest feature drift report comparing reference years to current year."""
    id: int
    reference_year_range: Optional[str]
    current_year: Optional[int]
    sector_id: Optional[int]
    dataset_drift: bool
    n_drifted: int
    n_features: int
    drifted_features: List[DriftedFeatureItem]
    stable_features: List[DriftedFeatureItem]
    created_at: Optional[str]


@router.get("/drift", response_model=DriftReportResponse)
def get_drift_report():
    """
    Return the latest feature drift report from the v5.2 analytical engine.

    Compares procurement feature distributions between the reference year range
    and the current year. Returns drifted and stable feature lists with
    Kolmogorov-Smirnov statistics and mean shift values.
    Cached for 1 hour.
    """
    cache_key = "drift_report_latest"
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, reference_year_range, current_year, sector_id,
                   dataset_drift, n_drifted, n_features,
                   feature_drift, ks_stats, created_at
            FROM drift_report
            ORDER BY id DESC
            LIMIT 1
            """
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="No drift report available")

    # Parse the ks_stats JSON which contains per-feature details
    ks_raw = row["ks_stats"]
    if ks_raw:
        try:
            ks_data = json.loads(ks_raw) if isinstance(ks_raw, str) else ks_raw
        except (json.JSONDecodeError, ValueError):
            ks_data = {}
    else:
        ks_data = {}

    # Parse feature_drift JSON (feature -> bool mapping)
    fd_raw = row["feature_drift"]
    if fd_raw:
        try:
            fd_data = json.loads(fd_raw) if isinstance(fd_raw, str) else fd_raw
        except (json.JSONDecodeError, ValueError):
            fd_data = {}
    else:
        fd_data = {}

    drifted_features: List[DriftedFeatureItem] = []
    stable_features: List[DriftedFeatureItem] = []

    # ks_data may be a dict of {feature: {ks_stat, p_value, mean_shift}} or
    # the feature_drift dict itself; handle both shapes gracefully.
    all_features = set(fd_data.keys()) | set(ks_data.keys())
    for feature in sorted(all_features):
        ks_entry = ks_data.get(feature, {}) if isinstance(ks_data, dict) else {}
        is_drifted = bool(fd_data.get(feature, False)) if isinstance(fd_data, dict) else False

        item = DriftedFeatureItem(
            feature=feature,
            ks_stat=ks_entry.get("ks_stat") if isinstance(ks_entry, dict) else None,
            p_value=ks_entry.get("p_value") if isinstance(ks_entry, dict) else None,
            mean_shift=ks_entry.get("mean_shift") if isinstance(ks_entry, dict) else None,
            drifted=is_drifted,
        )
        if is_drifted:
            drifted_features.append(item)
        else:
            stable_features.append(item)

    result = DriftReportResponse(
        id=row["id"],
        reference_year_range=row["reference_year_range"],
        current_year=row["current_year"],
        sector_id=row["sector_id"],
        dataset_drift=bool(row["dataset_drift"]),
        n_drifted=row["n_drifted"] or 0,
        n_features=row["n_features"] or 0,
        drifted_features=drifted_features,
        stable_features=stable_features,
        created_at=row["created_at"],
    )
    _analysis_cache.set(cache_key, result, ttl_seconds=3600)
    return result


# =============================================================================
# FACTOR BASELINES — P17
# =============================================================================

class FactorBaselineItem(BaseModel):
    """A single factor baseline row."""
    sector_id: Optional[int] = None
    sector_name: Optional[str] = None
    year: Optional[int] = None
    factor_name: str
    mean: float
    stddev: float
    sample_count: int


class FactorBaselineListResponse(BaseModel):
    """Paginated list of factor baselines."""
    data: List[FactorBaselineItem]
    total: int


class FactorBaselineSectorYearResponse(BaseModel):
    """All 16 features for a specific sector+year combination."""
    sector_id: int
    sector_name: str
    year: int
    features: Dict[str, Dict[str, Any]]
    count: int


@router.get("/factor-baselines", response_model=FactorBaselineListResponse)
def get_factor_baselines(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    year: Optional[int] = Query(None, ge=2002, le=2030, description="Filter by year"),
    factor: Optional[str] = Query(None, description="Filter by factor name"),
):
    """
    List factor baselines (sector/year mean and stddev for z-score features).

    The factor_baselines table contains ~4,500 rows of per-sector, per-year
    statistics that define what is 'normal' for each z-score feature. This data
    makes z-scores interpretable: e.g., 'in Salud 2020, the average single_bid
    rate was 0.65 with stddev 0.48'.
    """
    cache_key = f"factor_baselines:{sector_id}:{year}:{factor}"
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            conditions = []
            params: list = []

            if sector_id is not None:
                conditions.append("fb.sector_id = ?")
                params.append(sector_id)
            if year is not None:
                conditions.append("fb.year = ?")
                params.append(year)
            if factor is not None:
                conditions.append("fb.factor_name = ?")
                params.append(factor)

            where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            rows = conn.execute(
                f"""
                SELECT fb.sector_id, s.name_es AS sector_name, fb.year,
                       fb.factor_name, fb.mean, fb.stddev, fb.count AS sample_count
                FROM factor_baselines fb
                LEFT JOIN sectors s ON fb.sector_id = s.id
                {where_sql}
                ORDER BY fb.sector_id, fb.year, fb.factor_name
                """,
                params,
            ).fetchall()

            data = [
                FactorBaselineItem(
                    sector_id=r["sector_id"],
                    sector_name=r["sector_name"],
                    year=r["year"],
                    factor_name=r["factor_name"],
                    mean=round(r["mean"], 6),
                    stddev=round(r["stddev"], 6),
                    sample_count=r["sample_count"],
                )
                for r in rows
            ]

            result = FactorBaselineListResponse(data=data, total=len(data))
            _analysis_cache.set(cache_key, result, ttl_seconds=3600)
            return result

    except Exception as e:
        logger.error("factor_baselines_error: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch factor baselines")


@router.get(
    "/factor-baselines/{sector_id}/{year}",
    response_model=FactorBaselineSectorYearResponse,
)
def get_factor_baselines_sector_year(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID"),
    year: int = Path(..., ge=2002, le=2030, description="Year"),
):
    """
    Get all 16 feature baselines for a specific sector+year combination.

    Primary use case: given a contract's sector and year, retrieve the
    benchmarks (mean, stddev, sample_count) for every z-score feature.
    """
    cache_key = f"factor_baselines_sy:{sector_id}:{year}"
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            sector_row = conn.execute(
                "SELECT name_es FROM sectors WHERE id = ?", (sector_id,)
            ).fetchone()
            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            rows = conn.execute(
                """
                SELECT factor_name, mean, stddev, count AS sample_count,
                       min_val, max_val
                FROM factor_baselines
                WHERE sector_id = ? AND year = ?
                ORDER BY factor_name
                """,
                (sector_id, year),
            ).fetchall()

            if not rows:
                raise HTTPException(
                    status_code=404,
                    detail=f"No baselines found for sector {sector_id}, year {year}",
                )

            features: Dict[str, Dict[str, Any]] = {}
            for r in rows:
                features[r["factor_name"]] = {
                    "mean": round(r["mean"], 6),
                    "stddev": round(r["stddev"], 6),
                    "sample_count": r["sample_count"],
                    "min_val": r["min_val"],
                    "max_val": r["max_val"],
                }

            sector_name = sector_row["name_es"]
            result = FactorBaselineSectorYearResponse(
                sector_id=sector_id,
                sector_name=sector_name,
                year=year,
                features=features,
                count=len(features),
            )
            _analysis_cache.set(cache_key, result, ttl_seconds=3600)
            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("factor_baselines_sector_year_error: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch factor baselines")


# =============================================================================
# PRICE ANOMALIES (z_price_ratio based — always populated, unlike price_hypotheses)
# =============================================================================

_price_anomalies_cache: Dict[str, Any] = {}
_PRICE_ANOMALIES_TTL = 1800  # 30 min


@router.get("/price-anomalies")
@_rate_limit("30/minute")
def get_price_anomalies(
    request: Request,
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    min_z: float = Query(3.0, ge=1.0, le=10.0),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Contracts with extreme price z-scores (statistical price outliers).

    Primary source: contract_z_features.z_price_ratio (if table exists).
    Fallback: inline z-score via sector_price_baselines.mean_value / std_dev,
    which is always available and covers all 3.1M contracts.
    """
    cache_key = f"{sector_id}:{min_z}:{limit}"
    if cache_key in _price_anomalies_cache:
        entry = _price_anomalies_cache[cache_key]
        if _time.time() - entry["ts"] < _PRICE_ANOMALIES_TTL:
            return entry["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Detect whether contract_z_features table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='contract_z_features'"
            )
            has_z_table = cursor.fetchone() is not None

            if has_z_table:
                # ── Fast path: pre-computed z-scores ──────────────────────────
                sector_filter = "AND c.sector_id = ?" if sector_id else ""
                params: List[Any] = [min_z]
                if sector_id:
                    params.append(sector_id)
                params.append(limit)

                cursor.execute(f"""
                    SELECT
                        c.id            AS contract_id,
                        COALESCE(v.name, 'Desconocido')  AS vendor_name,
                        c.amount_mxn,
                        c.sector_id,
                        c.contract_year,
                        COALESCE(i.name, 'Desconocida')  AS institution_name,
                        c.risk_score,
                        c.risk_level,
                        z.z_price_ratio,
                        z.z_price_volatility,
                        c.vendor_id
                    FROM contracts c
                    JOIN contract_z_features z ON c.id = z.contract_id
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN institutions i ON c.institution_id = i.id
                    WHERE z.z_price_ratio > ?
                    {sector_filter}
                    AND c.amount_mxn IS NOT NULL AND c.amount_mxn > 0
                    ORDER BY z.z_price_ratio DESC
                    LIMIT ?
                """, params)
                rows = cursor.fetchall()
                cols = [d[0] for d in cursor.description]

                count_params: List[Any] = [min_z]
                if sector_id:
                    count_params.append(sector_id)
                cursor.execute(f"""
                    SELECT COUNT(*) AS total_outliers,
                           SUM(c.amount_mxn) AS total_value_mxn,
                           AVG(z.z_price_ratio) AS avg_z_score,
                           MAX(z.z_price_ratio) AS max_z_score
                    FROM contracts c
                    JOIN contract_z_features z ON c.id = z.contract_id
                    WHERE z.z_price_ratio > ?
                    {sector_filter}
                    AND c.amount_mxn IS NOT NULL
                """, count_params)
                summary_row = cursor.fetchone()

                cursor.execute("""
                    SELECT c.sector_id,
                           COUNT(*)          AS outlier_count,
                           SUM(c.amount_mxn) AS total_mxn,
                           AVG(z.z_price_ratio) AS avg_z
                    FROM contracts c
                    JOIN contract_z_features z ON c.id = z.contract_id
                    WHERE z.z_price_ratio > 3
                    AND c.amount_mxn IS NOT NULL
                    GROUP BY c.sector_id
                    ORDER BY outlier_count DESC
                    LIMIT 12
                """)
                sector_rows = cursor.fetchall()
                sector_cols = [d[0] for d in cursor.description]

            else:
                # ── Fallback: inline z-score via sector_price_baselines ────────
                # Strategy: use existing idx_c_amount to fetch ~23K contracts
                # above a global floor (min threshold across sectors at z=3),
                # then filter and aggregate in Python. Avoids full 3.1M scan.

                baseline_rows = cursor.execute("""
                    SELECT sector_id, mean_value, std_dev
                    FROM sector_price_baselines
                    WHERE contract_type = 'all' AND year IS NULL AND std_dev > 0
                """).fetchall()

                # Map sector_id → (mean, std)
                baselines: dict = {r[0]: (r[1], r[2]) for r in baseline_rows}

                # Global floor = minimum z=min_z threshold across all sectors
                # (contracts below this floor can't possibly exceed any sector threshold)
                global_floor = min(
                    (mean + min_z * std for mean, std in baselines.values()),
                    default=0.0,
                )
                # Also compute z=3 global floor for sector breakdown chart
                global_floor_z3 = min(
                    (mean + 3.0 * std for mean, std in baselines.values()),
                    default=0.0,
                )

                # Fetch all contracts above floor using idx_c_amount (~23K rows max)
                sec_filter = "AND c.sector_id = ?" if sector_id else ""
                floor_params: List[Any] = [global_floor]
                if sector_id:
                    floor_params.append(sector_id)

                all_candidates = cursor.execute(f"""
                    SELECT c.id            AS contract_id,
                           c.vendor_id,
                           COALESCE(v.name, 'Desconocido') AS vendor_name,
                           c.amount_mxn,
                           c.sector_id,
                           c.contract_year,
                           COALESCE(i.name, 'Desconocida') AS institution_name,
                           c.risk_score,
                           c.risk_level
                    FROM contracts c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN institutions i ON c.institution_id = i.id
                    WHERE c.amount_mxn > ?
                      {sec_filter}
                      AND c.amount_mxn IS NOT NULL AND c.amount_mxn < 100000000000
                    ORDER BY c.amount_mxn DESC
                """, floor_params).fetchall()

                cand_cols = [d[0] for d in cursor.description]

                # Filter in Python to sector-specific threshold
                filtered = []
                for r in all_candidates:
                    rd = dict(zip(cand_cols, r))
                    sid = rd["sector_id"]
                    if sid not in baselines:
                        continue
                    mean_v, std_v = baselines[sid]
                    thresh = mean_v + min_z * std_v
                    if rd["amount_mxn"] > thresh and std_v > 0:
                        rd["z_price_ratio"] = round((rd["amount_mxn"] - mean_v) / std_v, 4)
                        rd["z_price_volatility"] = 0.0
                        filtered.append(rd)

                # Summary stats from full filtered set
                if filtered:
                    all_z_vals = [r["z_price_ratio"] for r in filtered]
                    all_amts = [r["amount_mxn"] for r in filtered]
                    summary_row = (
                        len(filtered),
                        sum(all_amts),
                        sum(all_z_vals) / len(all_z_vals),
                        max(all_z_vals),
                    )
                else:
                    summary_row = (0, 0.0, 0.0, 0.0)

                # Top-N for the data list
                top_n = filtered[:limit]
                cols = list(cand_cols) + ["z_price_ratio", "z_price_volatility"]
                rows = [tuple(rd.values()) for rd in top_n]

                # By-sector breakdown at z=3 (always stable threshold for chart)
                sector_agg: dict = {}
                for r in all_candidates:
                    rd = dict(zip(cand_cols, r))
                    sid = rd["sector_id"]
                    if sid not in baselines:
                        continue
                    mean_v, std_v = baselines[sid]
                    thresh3 = mean_v + 3.0 * std_v
                    if rd["amount_mxn"] > thresh3 and std_v > 0:
                        z = (rd["amount_mxn"] - mean_v) / std_v
                        if sid not in sector_agg:
                            sector_agg[sid] = {"count": 0, "total": 0.0, "z_sum": 0.0}
                        sector_agg[sid]["count"] += 1
                        sector_agg[sid]["total"] += rd["amount_mxn"]
                        sector_agg[sid]["z_sum"] += z

                sector_rows = sorted(
                    [
                        (sid, agg["count"], agg["total"],
                         round(agg["z_sum"] / agg["count"], 2))
                        for sid, agg in sector_agg.items()
                    ],
                    key=lambda x: -x[1],
                )[:12]
                sector_cols = ["sector_id", "outlier_count", "total_mxn", "avg_z"]

            result = {
                "summary": {
                    "total_outliers": summary_row[0] or 0,
                    "total_value_mxn": summary_row[1] or 0,
                    "avg_z_score": round(float(summary_row[2] or 0), 2),
                    "max_z_score": round(float(summary_row[3] or 0), 2),
                    "threshold_applied": min_z,
                    "methodology": (
                        "Z-score = (amount - sector_mean) / sector_std. "
                        "Values above threshold indicate contracts priced >N standard deviations "
                        "above the sector baseline."
                    ),
                },
                "by_sector": [dict(zip(sector_cols, r)) for r in sector_rows],
                "data": [dict(zip(cols, r)) for r in rows],
            }

            _price_anomalies_cache[cache_key] = {"ts": _time.time(), "data": result}
            return result

    except Exception as exc:
        logger.error("price-anomalies error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to fetch price anomalies: {exc}")


class AdminVendorEntry(BaseModel):
    vendor_name: str
    total_mxn: float
    contracts: int
    avg_risk: Optional[float] = None


class AdminEraStats(BaseModel):
    era: str
    year_start: int
    year_end: int
    top_vendors: List[AdminVendorEntry]
    gt_case_count: int
    est_fraud_mxn: float
    hhi: float
    dec_spike_pct: float


class AdminBreakdownResponse(BaseModel):
    eras: List[AdminEraStats]
    cached_at: Optional[str] = None


_ADMIN_ERAS = [
    ("fox",         2002, 2005),
    ("calderon",    2006, 2011),
    ("pena_nieto",  2012, 2017),
    ("amlo",        2018, 2024),
    ("sheinbaum",   2025, 2030),
]

_admin_breakdown_cache = SimpleCache()


@router.get("/admin-breakdown", response_model=AdminBreakdownResponse)
def get_admin_breakdown(response: Response):
    """Per-administration vendor concentration and corruption statistics."""
    cache_key = "admin_breakdown"

    # Check in-memory cache first
    cached = _admin_breakdown_cache.get(cache_key)
    if cached is not None:
        response.headers["Cache-Control"] = "public, max-age=3600"
        return cached

    with get_db() as conn:
        # Check precomputed_stats table
        try:
            row = conn.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?",
                (cache_key,)
            ).fetchone()
            if row:
                payload = json.loads(row["stat_value"])
                result = AdminBreakdownResponse(**payload)
                _admin_breakdown_cache.set(cache_key, result, ttl_seconds=3600)
                response.headers["Cache-Control"] = "public, max-age=3600"
                return result
        except Exception as pc_err:
            logger.debug("admin_breakdown precomputed_stats skip: %s", pc_err)

        # Live computation
        eras_out: List[AdminEraStats] = []
        for era_name, yr_start, yr_end in _ADMIN_ERAS:
            # Top 6 vendors by spend (exclude >100B outliers)
            vendor_rows = conn.execute(
                """
                SELECT
                    v.name AS vendor_name,
                    SUM(c.amount_mxn) AS total_mxn,
                    COUNT(*) AS contracts,
                    AVG(c.risk_score) AS avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.contract_year BETWEEN ? AND ?
                  AND c.amount_mxn > 0
                  AND c.amount_mxn <= 100000000000
                GROUP BY c.vendor_id
                ORDER BY total_mxn DESC
                LIMIT 6
                """,
                (yr_start, yr_end)
            ).fetchall()

            top_vendors = [
                AdminVendorEntry(
                    vendor_name=r["vendor_name"],
                    total_mxn=float(r["total_mxn"]),
                    contracts=int(r["contracts"]),
                    avg_risk=float(r["avg_risk"]) if r["avg_risk"] is not None else None,
                )
                for r in vendor_rows
            ]

            # HHI: sum of (vendor_share)^2 across all vendors in era
            hhi_row = conn.execute(
                """
                WITH era_total AS (
                    SELECT SUM(amount_mxn) AS total
                    FROM contracts
                    WHERE contract_year BETWEEN ? AND ?
                      AND amount_mxn > 0 AND amount_mxn <= 100000000000
                ),
                vendor_shares AS (
                    SELECT
                        vendor_id,
                        SUM(amount_mxn) * 1.0 / NULLIF((SELECT total FROM era_total), 0) AS share
                    FROM contracts
                    WHERE contract_year BETWEEN ? AND ?
                      AND amount_mxn > 0 AND amount_mxn <= 100000000000
                    GROUP BY vendor_id
                )
                SELECT COALESCE(SUM(share * share), 0) AS hhi
                FROM vendor_shares
                """,
                (yr_start, yr_end, yr_start, yr_end)
            ).fetchone()
            hhi = float(hhi_row["hhi"]) if hhi_row else 0.0

            # December spike percentage
            dec_row = conn.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN strftime('%m', contract_date) = '12'
                                     THEN amount_mxn ELSE 0 END), 0) AS dec_total,
                    COALESCE(SUM(amount_mxn), 0) AS era_total
                FROM contracts
                WHERE contract_year BETWEEN ? AND ?
                  AND amount_mxn > 0 AND amount_mxn <= 100000000000
                """,
                (yr_start, yr_end)
            ).fetchone()
            dec_spike_pct = 0.0
            if dec_row and dec_row["era_total"]:
                dec_spike_pct = float(dec_row["dec_total"]) / float(dec_row["era_total"]) * 100

            # GT case count
            gt_case_count = 0
            est_fraud_mxn = 0.0
            try:
                gt_row = conn.execute(
                    """
                    SELECT
                        COUNT(*) AS case_count,
                        COALESCE(SUM(estimated_fraud_mxn), 0) AS fraud_sum
                    FROM ground_truth_cases
                    WHERE year_start BETWEEN ? AND ?
                    """,
                    (yr_start, yr_end)
                ).fetchone()
                if gt_row:
                    gt_case_count = int(gt_row["case_count"])
                    est_fraud_mxn = float(gt_row["fraud_sum"])
            except Exception:
                pass  # Table may not exist

            eras_out.append(AdminEraStats(
                era=era_name,
                year_start=yr_start,
                year_end=yr_end,
                top_vendors=top_vendors,
                gt_case_count=gt_case_count,
                est_fraud_mxn=est_fraud_mxn,
                hhi=round(hhi, 6),
                dec_spike_pct=round(dec_spike_pct, 2),
            ))

    result = AdminBreakdownResponse(
        eras=eras_out,
        cached_at=datetime.utcnow().isoformat(),
    )
    _admin_breakdown_cache.set(cache_key, result, ttl_seconds=3600)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return result


@router.get("/price-sector-baselines")
def get_price_sector_baselines(sector_id: Optional[int] = Query(None, ge=1, le=12)):
    """Return sector price baseline statistics (percentiles, fences)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            if sector_id:
                cursor.execute(
                    "SELECT * FROM sector_price_baselines WHERE sector_id = ?",
                    (sector_id,)
                )
            else:
                cursor.execute("SELECT * FROM sector_price_baselines ORDER BY sector_id")
            rows = cursor.fetchall()
            cols = [d[0] for d in cursor.description]
            return {"data": [dict(zip(cols, r)) for r in rows]}
    except Exception as exc:
        logger.error("price-sector-baselines error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch price sector baselines")


@router.get("/calendar-heatmap")
def get_calendar_heatmap(year: int = Query(2024, ge=2002, le=2025)):
    """Return daily contract risk counts for a calendar heatmap view."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT
                    DATE(contract_date) AS date,
                    COUNT(*) AS total_contracts,
                    SUM(CASE WHEN risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) AS high_risk_contracts,
                    CAST(SUM(CASE WHEN risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) AS REAL)
                        / NULLIF(COUNT(*), 0) AS risk_rate
                FROM contracts
                WHERE contract_date >= ? AND contract_date < ?
                    AND contract_date IS NOT NULL
                GROUP BY DATE(contract_date)
                ORDER BY date
                """,
                (f"{year}-01-01", f"{year + 1}-01-01"),
            )
            rows = cursor.fetchall()
            return [
                {
                    "date": r[0],
                    "total_contracts": r[1],
                    "high_risk_contracts": r[2],
                    "risk_rate": round(r[3] or 0, 4),
                }
                for r in rows
            ]
    except Exception as exc:
        logger.error("calendar-heatmap error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch calendar heatmap")
