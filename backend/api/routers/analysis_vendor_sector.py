"""
Vendor & Sector Analytics endpoints for the RUBLI analysis API.

Extracted from analysis.py (lines 3973–5187).
Covers: institution risk factor breakdown, value concentration, flash vendors,
industry risk clusters, seasonal risk, monthly risk summary, procedure risk
comparison, top-by-period, sector growth, and year summary.
"""

import sqlite3
import logging
import threading
import time as _time
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..helpers.analysis_helpers import table_exists

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

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


class ValueConcentrationItem(BaseModel):
    """A vendor-institution pair with disproportionate value concentration."""
    vendor_id: int
    vendor_name: str
    institution_id: int
    institution_name: str
    vendor_value: float
    institution_total_value: float
    value_share_pct: float
    contract_count: int
    avg_risk_score: float


class ValueConcentrationResponse(BaseModel):
    data: List[ValueConcentrationItem]
    total: int
    min_pct: float


class FlashVendorItem(BaseModel):
    """A vendor that operated briefly but at significant scale."""
    vendor_id: int
    vendor_name: str
    total_value: float
    contract_count: int
    min_year: int
    max_year: int
    active_years: int
    avg_risk_score: float
    primary_institution: Optional[str]
    is_currently_active: bool


class FlashVendorsResponse(BaseModel):
    data: List[FlashVendorItem]
    total: int
    max_active_years: int
    min_value: float


class IndustryRiskClusterItem(BaseModel):
    """Risk cluster statistics for a single sector group of vendors."""
    sector_id: int
    sector_name: str
    vendor_count: int
    total_value: float
    avg_risk_score: float
    high_risk_vendor_count: int
    top_vendor_name: Optional[str] = None
    top_vendor_value: Optional[float] = None
    top_vendor_risk: Optional[float] = None


class IndustryRiskClustersResponse(BaseModel):
    """Response for /analysis/industry-risk-clusters."""
    data: List[IndustryRiskClusterItem]
    total: int
    min_contracts: int


class SeasonalRiskItem(BaseModel):
    sector_id: int
    sector_name: str
    month_risk: float = Field(..., description="Avg risk score for contracts in the given month")
    other_risk: float = Field(..., description="Avg risk score for contracts in all other months")
    risk_premium_pct: float = Field(..., description="((month_risk - other_risk) / other_risk) * 100")
    month_value: float = Field(..., description="Total contract value in given month")
    month_count: int
    other_count: int


class SeasonalRiskResponse(BaseModel):
    month: int
    data: List[SeasonalRiskItem]


class MonthlyRiskSummaryItem(BaseModel):
    month: int = Field(..., ge=1, le=12, description="Month number (1-12)")
    month_name: str
    avg_risk: float = Field(..., description="Average risk score across all years")
    overall_avg_risk: float = Field(..., description="Overall average risk score (all months)")
    risk_premium_pct: float = Field(..., description="(avg_risk - overall_avg) / overall_avg * 100")
    contract_count: int


class MonthlyRiskSummaryResponse(BaseModel):
    data: List[MonthlyRiskSummaryItem]
    overall_avg_risk: float


class ProcedureRiskItem(BaseModel):
    sector_id: int
    sector_name: str
    year: int
    direct_award_risk: Optional[float] = Field(None, description="Avg risk for direct-award contracts")
    competitive_risk: Optional[float] = Field(None, description="Avg risk for competitive contracts")
    ratio: Optional[float] = Field(None, description="direct_award_risk / competitive_risk")


class ProcedureRiskResponse(BaseModel):
    data: List[ProcedureRiskItem]
    total: int


# =============================================================================
# MODULE-LEVEL CACHES
# =============================================================================

_inst_risk_factors_cache: dict = {}
_inst_risk_factors_lock = threading.Lock()
_INST_RISK_FACTORS_TTL = 3600

_industry_clusters_cache: Dict[str, Any] = {}
_industry_clusters_lock = threading.Lock()
_INDUSTRY_CLUSTERS_TTL = 3600  # 1 hour

_seasonal_risk_cache: Dict[str, Any] = {}
_SEASONAL_RISK_TTL = 3600  # 1 hour

_monthly_risk_summary_cache: Dict[str, Any] = {}
_MONTHLY_RISK_SUMMARY_TTL = 3600  # 1 hour

_proc_risk_cache: Dict[str, Any] = {}
_PROC_RISK_TTL = 3600  # 1 hour

_top_period_cache: Dict[str, Any] = {}
_TOP_PERIOD_TTL = 86400  # 24 hours

_sector_growth_cache: Dict[str, Any] = {}
_SECTOR_GROWTH_TTL = 86400  # 24 hours

_year_summary_cache: Dict[str, Any] = {}
_YEAR_SUMMARY_TTL = 86400  # 24 hours

_MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


# =============================================================================
# INSTITUTION RISK FACTOR BREAKDOWN
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


# =============================================================================
# VALUE CONCENTRATION ENDPOINT
# =============================================================================

@router.get("/value-concentration", response_model=ValueConcentrationResponse)
def get_value_concentration(
    min_pct: float = Query(10.0, ge=1.0, le=100.0, description="Minimum share percentage (1-100)"),
    limit: int = Query(20, ge=1, le=200, description="Maximum records to return"),
):
    """
    Return vendor-institution pairs where a vendor's contracts represent
    at least min_pct% of that institution's total procurement value.

    Identifies market concentration and potential lock-in situations.
    """
    try:
        min_share = min_pct / 100.0
        with get_db() as conn:
            cursor = conn.cursor()
            rows = cursor.execute(
                """
                WITH institution_totals AS (
                    SELECT institution_id, SUM(amount_mxn) AS institution_total
                    FROM contracts
                    WHERE amount_mxn > 0 AND amount_mxn <= ?
                    GROUP BY institution_id
                ),
                vendor_institution AS (
                    SELECT
                        c.vendor_id,
                        c.institution_id,
                        SUM(c.amount_mxn)     AS vendor_value,
                        COUNT(*)              AS contract_count,
                        AVG(c.risk_score)     AS avg_risk_score
                    FROM contracts c
                    WHERE c.amount_mxn > 0 AND c.amount_mxn <= ?
                    GROUP BY c.vendor_id, c.institution_id
                )
                SELECT
                    vi.vendor_id,
                    COALESCE(v.vendor_name, CAST(vi.vendor_id AS TEXT)) AS vendor_name,
                    vi.institution_id,
                    COALESCE(i.institution_name, CAST(vi.institution_id AS TEXT)) AS institution_name,
                    vi.vendor_value,
                    it.institution_total                                 AS institution_total_value,
                    ROUND(vi.vendor_value * 100.0 / it.institution_total, 2) AS value_share_pct,
                    vi.contract_count,
                    ROUND(COALESCE(vi.avg_risk_score, 0.0), 4)          AS avg_risk_score
                FROM vendor_institution vi
                JOIN institution_totals it ON it.institution_id = vi.institution_id
                LEFT JOIN vendors      v  ON v.id              = vi.vendor_id
                LEFT JOIN institutions i  ON i.id              = vi.institution_id
                WHERE vi.vendor_value * 1.0 / it.institution_total >= ?
                ORDER BY value_share_pct DESC
                LIMIT ?
                """,
                (MAX_CONTRACT_VALUE, MAX_CONTRACT_VALUE, min_share, limit),
            ).fetchall()

        items = [
            ValueConcentrationItem(
                vendor_id=row["vendor_id"],
                vendor_name=row["vendor_name"],
                institution_id=row["institution_id"],
                institution_name=row["institution_name"],
                vendor_value=row["vendor_value"],
                institution_total_value=row["institution_total_value"],
                value_share_pct=row["value_share_pct"],
                contract_count=row["contract_count"],
                avg_risk_score=row["avg_risk_score"],
            )
            for row in rows
        ]
        return ValueConcentrationResponse(data=items, total=len(items), min_pct=min_pct)

    except sqlite3.OperationalError as e:
        logger.error(f"DB error in get_value_concentration: {e}")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error(f"Unexpected error in get_value_concentration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# FLASH VENDORS ENDPOINT
# =============================================================================

@router.get("/flash-vendors", response_model=FlashVendorsResponse)
def get_flash_vendors(
    max_active_years: int = Query(3, ge=1, le=10, description="Maximum window between first and last contract year"),
    min_value: float = Query(500_000_000.0, ge=0.0, description="Minimum total contract value (MXN)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
):
    """
    Return vendors that appeared briefly (within max_active_years) yet won
    contracts totalling at least min_value MXN — a common ghost-company pattern.

    is_currently_active = True when the vendor's last contract year >= 2024.
    primary_institution is the institution that awarded the most contracts to that vendor.
    Results are sorted by avg_risk_score DESC.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            rows = cursor.execute(
                """
                WITH vendor_agg AS (
                    SELECT
                        c.vendor_id,
                        MIN(c.contract_year)           AS min_year,
                        MAX(c.contract_year)           AS max_year,
                        SUM(c.amount_mxn)              AS total_value,
                        COUNT(*)                       AS contract_count,
                        AVG(c.risk_score)              AS avg_risk_score
                    FROM contracts c
                    WHERE c.amount_mxn > 0 AND c.amount_mxn <= ?
                    GROUP BY c.vendor_id
                    HAVING (MAX(c.contract_year) - MIN(c.contract_year)) <= ?
                       AND SUM(c.amount_mxn) >= ?
                ),
                primary_inst AS (
                    SELECT
                        c.vendor_id,
                        COALESCE(i.institution_name, CAST(c.institution_id AS TEXT)) AS institution_name,
                        COUNT(*) AS cnt,
                        ROW_NUMBER() OVER (
                            PARTITION BY c.vendor_id
                            ORDER BY COUNT(*) DESC
                        ) AS rn
                    FROM contracts c
                    LEFT JOIN institutions i ON i.id = c.institution_id
                    WHERE c.amount_mxn > 0 AND c.amount_mxn <= ?
                    GROUP BY c.vendor_id, c.institution_id
                )
                SELECT
                    va.vendor_id,
                    COALESCE(v.vendor_name, CAST(va.vendor_id AS TEXT)) AS vendor_name,
                    va.total_value,
                    va.contract_count,
                    va.min_year,
                    va.max_year,
                    (va.max_year - va.min_year)  AS active_years,
                    ROUND(COALESCE(va.avg_risk_score, 0.0), 4) AS avg_risk_score,
                    pi.institution_name          AS primary_institution,
                    CASE WHEN va.max_year >= 2024 THEN 1 ELSE 0 END AS is_currently_active
                FROM vendor_agg va
                LEFT JOIN vendors      v  ON v.id         = va.vendor_id
                LEFT JOIN primary_inst pi ON pi.vendor_id = va.vendor_id AND pi.rn = 1
                ORDER BY avg_risk_score DESC
                LIMIT ?
                """,
                (MAX_CONTRACT_VALUE, max_active_years, min_value, MAX_CONTRACT_VALUE, limit),
            ).fetchall()

        items = [
            FlashVendorItem(
                vendor_id=row["vendor_id"],
                vendor_name=row["vendor_name"],
                total_value=row["total_value"],
                contract_count=row["contract_count"],
                min_year=row["min_year"],
                max_year=row["max_year"],
                active_years=row["active_years"],
                avg_risk_score=row["avg_risk_score"],
                primary_institution=row["primary_institution"],
                is_currently_active=bool(row["is_currently_active"]),
            )
            for row in rows
        ]
        return FlashVendorsResponse(
            data=items,
            total=len(items),
            max_active_years=max_active_years,
            min_value=min_value,
        )

    except sqlite3.OperationalError as e:
        logger.error(f"DB error in get_flash_vendors: {e}")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error(f"Unexpected error in get_flash_vendors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# INDUSTRY RISK CLUSTERS
# =============================================================================

@router.get("/industry-risk-clusters", response_model=IndustryRiskClustersResponse)
def get_industry_risk_clusters(
    sector_id: Optional[int] = Query(None, description="Filter to a single sector"),
    min_contracts: int = Query(100, ge=1, description="Minimum contracts per vendor to include"),
):
    """
    Group vendors by primary sector and compute aggregate risk statistics.

    Returns one row per sector with: vendor count, total value, average risk score,
    high-risk vendor count (avg_risk_score >= 0.30), and the top vendor by value.
    Sorted by avg_risk_score descending.
    """
    cache_key = f"{sector_id}:{min_contracts}"
    with _industry_clusters_lock:
        cached = _industry_clusters_cache.get(cache_key)
        if cached and datetime.now() < cached["expires_at"]:
            return cached["value"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # vendor_stats.primary_sector_id is not populated in this DB.
            # Derive each vendor's primary sector as the sector_id with the most
            # contracts in the contracts table, then aggregate at sector level.
            #
            # Two-step approach avoids a slow correlated subquery per vendor:
            #  1. vendor_sector_counts: count contracts per (vendor_id, sector_id).
            #  2. vendor_primary: keep the top sector_id per vendor.
            #  3. Join to vendor_stats for aggregate stats; filter by min_contracts.

            # Build optional sector filter for the sector_agg CTE only.
            # vendor_sector_counts is computed once across all vendors; the
            # WHERE clause in sector_agg restricts which sectors are returned.
            sector_filter = ""
            params: list = [min_contracts]
            if sector_id is not None:
                sector_filter = "WHERE q.primary_sector = ?"
                params.append(sector_id)

            # Single-pass consolidated query:
            #  1. vendor_sector_counts  – GROUP BY (vendor_id, sector_id) once.
            #  2. vendor_primary        – each vendor's dominant sector (ties → lowest id).
            #  3. qualified             – inner join to vendor_stats + min_contracts filter.
            #  4. sector_agg            – aggregate stats per sector.
            #  5. top_vendor            – ROW_NUMBER() picks #1 by value per sector.
            # Final SELECT joins sector_agg with top_vendor — no Python loop needed.
            cursor.execute(f"""
                WITH vendor_sector_counts AS (
                    SELECT
                        c.vendor_id,
                        c.sector_id,
                        COUNT(*) AS n
                    FROM contracts c
                    WHERE c.vendor_id IS NOT NULL
                      AND c.sector_id IS NOT NULL
                    GROUP BY c.vendor_id, c.sector_id
                ),
                vendor_primary AS (
                    SELECT
                        vendor_id,
                        sector_id AS primary_sector
                    FROM vendor_sector_counts vsc1
                    WHERE n = (
                        SELECT MAX(n) FROM vendor_sector_counts vsc2
                        WHERE vsc2.vendor_id = vsc1.vendor_id
                    )
                    GROUP BY vendor_id   -- break ties: keep lowest sector_id
                ),
                qualified AS (
                    SELECT
                        vp.vendor_id,
                        vp.primary_sector,
                        vs.total_value_mxn,
                        vs.avg_risk_score,
                        vs.total_contracts
                    FROM vendor_primary vp
                    JOIN vendor_stats vs ON vp.vendor_id = vs.vendor_id
                    WHERE vs.total_contracts >= ?
                ),
                sector_agg AS (
                    SELECT
                        q.primary_sector                                        AS sector_id,
                        s.name_es                                               AS sector_name,
                        COUNT(*)                                                AS vendor_count,
                        COALESCE(SUM(q.total_value_mxn), 0)                    AS total_value,
                        COALESCE(AVG(q.avg_risk_score), 0)                     AS avg_risk_score,
                        SUM(CASE WHEN q.avg_risk_score >= 0.30 THEN 1 ELSE 0 END)
                                                                                AS high_risk_vendor_count
                    FROM qualified q
                    JOIN sectors s ON q.primary_sector = s.id
                    {sector_filter}
                    GROUP BY q.primary_sector, s.name_es
                ),
                top_vendor AS (
                    SELECT
                        q.primary_sector,
                        vnd.name                    AS top_vendor_name,
                        q.total_value_mxn           AS top_vendor_value,
                        q.avg_risk_score            AS top_vendor_risk,
                        ROW_NUMBER() OVER (
                            PARTITION BY q.primary_sector
                            ORDER BY q.total_value_mxn DESC
                        )                           AS rn
                    FROM qualified q
                    JOIN vendors vnd ON q.vendor_id = vnd.id
                )
                SELECT
                    sa.sector_id,
                    sa.sector_name,
                    sa.vendor_count,
                    sa.total_value,
                    sa.avg_risk_score,
                    sa.high_risk_vendor_count,
                    tv.top_vendor_name,
                    tv.top_vendor_value,
                    tv.top_vendor_risk
                FROM sector_agg sa
                LEFT JOIN top_vendor tv
                       ON sa.sector_id = tv.primary_sector AND tv.rn = 1
                ORDER BY sa.avg_risk_score DESC
            """, params)

            rows = cursor.fetchall()

            items: List[IndustryRiskClusterItem] = [
                IndustryRiskClusterItem(
                    sector_id=row["sector_id"],
                    sector_name=row["sector_name"],
                    vendor_count=row["vendor_count"],
                    total_value=round(row["total_value"], 2),
                    avg_risk_score=round(row["avg_risk_score"], 4),
                    high_risk_vendor_count=row["high_risk_vendor_count"],
                    top_vendor_name=row["top_vendor_name"],
                    top_vendor_value=round(row["top_vendor_value"], 2) if row["top_vendor_value"] is not None else None,
                    top_vendor_risk=round(row["top_vendor_risk"], 4) if row["top_vendor_risk"] is not None else None,
                )
                for row in rows
            ]

            result = IndustryRiskClustersResponse(
                data=items,
                total=len(items),
                min_contracts=min_contracts,
            )

            with _industry_clusters_lock:
                _industry_clusters_cache[cache_key] = {
                    "value": result,
                    "expires_at": datetime.now() + timedelta(seconds=_INDUSTRY_CLUSTERS_TTL),
                }

            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_industry_risk_clusters: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# SEASONAL RISK ENDPOINT
# =============================================================================

@router.get("/seasonal-risk", response_model=SeasonalRiskResponse)
def get_seasonal_risk(
    month: int = Query(..., ge=1, le=12, description="Month number (1-12)"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter to a single sector"),
):
    """
    Compare average risk score for contracts awarded in a given month vs all other months,
    grouped by sector.  Sorted by risk_premium_pct DESC.
    """
    cache_key = "seasonal:{}:{}".format(month, sector_id)
    cached = _seasonal_risk_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _SEASONAL_RISK_TTL:
        return cached["data"]

    month_str = "{:02d}".format(month)
    sector_filter = "AND c.sector_id = ?" if sector_id else ""

    month_cond = "strftime('%m', c.contract_date)"
    sql = (
        "SELECT c.sector_id, s.name_es AS sector_name,"
        " AVG(CASE WHEN {mc} = ? THEN c.risk_score END) AS month_risk,"
        " AVG(CASE WHEN {mc} != ? THEN c.risk_score END) AS other_risk,"
        " COALESCE(SUM(CASE WHEN {mc} = ? THEN c.amount_mxn ELSE 0 END), 0) AS month_value,"
        " COUNT(CASE WHEN {mc} = ? THEN 1 END) AS month_count,"
        " COUNT(CASE WHEN {mc} != ? THEN 1 END) AS other_count"
        " FROM contracts c"
        " LEFT JOIN sectors s ON c.sector_id = s.id"
        " WHERE c.risk_score IS NOT NULL"
        "   AND COALESCE(c.amount_mxn, 0) <= ?"
        "   AND c.contract_date IS NOT NULL"
        "   {sf}"
        " GROUP BY c.sector_id, s.name_es"
        " HAVING month_count > 0 AND other_count > 0"
    ).format(mc=month_cond, sf=sector_filter)

    query_params = [month_str, month_str, month_str, month_str, month_str, 100_000_000_000]
    if sector_id:
        query_params.append(sector_id)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, query_params)
            rows = cursor.fetchall()

        items: List[SeasonalRiskItem] = []
        for row in rows:
            mr = row["month_risk"] or 0.0
            orisk = row["other_risk"] or 0.0
            premium = ((mr - orisk) / orisk * 100) if orisk else 0.0
            items.append(SeasonalRiskItem(
                sector_id=row["sector_id"] or 12,
                sector_name=row["sector_name"] or "otros",
                month_risk=round(mr, 4),
                other_risk=round(orisk, 4),
                risk_premium_pct=round(premium, 2),
                month_value=round(row["month_value"] or 0.0, 2),
                month_count=row["month_count"] or 0,
                other_count=row["other_count"] or 0,
            ))
        items.sort(key=lambda x: x.risk_premium_pct, reverse=True)

        result = SeasonalRiskResponse(month=month, data=items)
        _seasonal_risk_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_seasonal_risk: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_seasonal_risk: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# MONTHLY RISK SUMMARY ENDPOINT — all 12 months, cross-year averages
# =============================================================================

@router.get("/monthly-risk-summary", response_model=MonthlyRiskSummaryResponse)
def get_monthly_risk_summary(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter to a single sector"),
):
    """
    Return average risk score per calendar month (1-12) aggregated across all years.
    Includes risk_premium_pct = deviation from the overall mean.
    """
    cache_key = "monthly_risk_summary:{}".format(sector_id)
    cached = _monthly_risk_summary_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _MONTHLY_RISK_SUMMARY_TTL:
        return cached["data"]

    sector_filter = "AND sector_id = ?" if sector_id else ""
    params: List[Any] = []
    if sector_id:
        params.append(sector_id)

    sql = (
        "SELECT"
        " CAST(strftime('%m', contract_date) AS INTEGER) AS month,"
        " AVG(risk_score) AS avg_risk,"
        " COUNT(*) AS contract_count"
        " FROM contracts"
        " WHERE risk_score IS NOT NULL"
        "   AND contract_date IS NOT NULL"
        "   AND COALESCE(amount_mxn, 0) <= 100000000000"
        "   " + sector_filter +
        " GROUP BY month"
        " ORDER BY month"
    )

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        month_data: Dict[int, dict] = {}
        for row in rows:
            m = row["month"]
            if m and 1 <= m <= 12:
                month_data[m] = {
                    "avg_risk": row["avg_risk"] or 0.0,
                    "contract_count": row["contract_count"] or 0,
                }

        # Overall average across all months (weighted by contract count)
        total_contracts = sum(v["contract_count"] for v in month_data.values())
        if total_contracts > 0:
            overall_avg = sum(
                v["avg_risk"] * v["contract_count"] for v in month_data.values()
            ) / total_contracts
        else:
            overall_avg = 0.0

        items: List[MonthlyRiskSummaryItem] = []
        for m in range(1, 13):
            if m in month_data:
                avg_r = month_data[m]["avg_risk"]
                cnt = month_data[m]["contract_count"]
            else:
                avg_r = overall_avg
                cnt = 0
            premium = ((avg_r - overall_avg) / overall_avg * 100) if overall_avg else 0.0
            items.append(MonthlyRiskSummaryItem(
                month=m,
                month_name=_MONTH_NAMES_SHORT[m - 1],
                avg_risk=round(avg_r, 6),
                overall_avg_risk=round(overall_avg, 6),
                risk_premium_pct=round(premium, 2),
                contract_count=cnt,
            ))

        result = MonthlyRiskSummaryResponse(
            data=items,
            overall_avg_risk=round(overall_avg, 6),
        )
        _monthly_risk_summary_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_monthly_risk_summary: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_monthly_risk_summary: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# PROCEDURE RISK COMPARISON ENDPOINT
# =============================================================================

@router.get("/procedure-risk-comparison", response_model=ProcedureRiskResponse)
def get_procedure_risk_comparison(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter to a single sector"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter to a specific year"),
):
    """
    Compare average risk score between direct-award and competitive procedures,
    grouped by sector and year.  Returns ratio = direct_award_risk / competitive_risk.
    """
    cache_key = "proc:{}:{}".format(sector_id, year)
    cached = _proc_risk_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _PROC_RISK_TTL:
        return cached["data"]

    conditions = ["c.risk_score IS NOT NULL", "COALESCE(c.amount_mxn, 0) <= ?"]
    params = [100_000_000_000]
    if sector_id:
        conditions.append("c.sector_id = ?")
        params.append(sector_id)
    if year:
        conditions.append("c.contract_year = ?")
        params.append(year)

    where_clause = " AND ".join(conditions)

    sql = (
        "SELECT c.sector_id, s.name_es AS sector_name, c.contract_year AS year,"
        " AVG(CASE WHEN c.is_direct_award = 1 THEN c.risk_score END) AS direct_award_risk,"
        " AVG(CASE WHEN c.is_direct_award = 0 THEN c.risk_score END) AS competitive_risk"
        " FROM contracts c"
        " LEFT JOIN sectors s ON c.sector_id = s.id"
        " WHERE " + where_clause +
        " GROUP BY c.sector_id, s.name_es, c.contract_year"
        " HAVING direct_award_risk IS NOT NULL OR competitive_risk IS NOT NULL"
        " ORDER BY c.sector_id, c.contract_year"
    )

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        items: List[ProcedureRiskItem] = []
        for row in rows:
            da = row["direct_award_risk"]
            comp = row["competitive_risk"]
            ratio: Optional[float] = None
            if da is not None and comp is not None and comp > 0:
                ratio = round(da / comp, 4)
            items.append(ProcedureRiskItem(
                sector_id=row["sector_id"] or 12,
                sector_name=row["sector_name"] or "otros",
                year=row["year"] or 0,
                direct_award_risk=round(da, 4) if da is not None else None,
                competitive_risk=round(comp, 4) if comp is not None else None,
                ratio=ratio,
            ))

        result = ProcedureRiskResponse(data=items, total=len(items))
        _proc_risk_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_procedure_risk_comparison: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_procedure_risk_comparison: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# TOP BY PERIOD ENDPOINT
# =============================================================================

@router.get("/top-by-period")
def get_top_by_period(
    start_year: int = Query(..., ge=2002, le=2025),
    end_year: int = Query(..., ge=2002, le=2025),
    entity: str = Query("vendor", pattern="^(vendor|institution)$"),
    by: str = Query("value", pattern="^(value|count)$"),
    limit: int = Query(20, ge=5, le=100),
):
    """
    Return top vendors or institutions for a given year range, ranked by
    total contract value or count.  Results are cached for 24 hours.
    """
    if start_year > end_year:
        raise HTTPException(
            status_code=422,
            detail="start_year must be less than or equal to end_year",
        )

    cache_key = f"top_period_{start_year}_{end_year}_{entity}_{by}_{limit}"
    cached = _top_period_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _TOP_PERIOD_TTL:
        return cached["data"]

    order_col = "total_value_mxn" if by == "value" else "total_contracts"

    if entity == "vendor":
        sql = f"""
            SELECT
                COALESCE(v.name, c.vendor_id) AS name,
                COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                              THEN c.amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                COUNT(*) AS total_contracts,
                COALESCE(AVG(c.risk_score), 0) AS avg_risk_score
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            WHERE c.contract_year BETWEEN ? AND ?
              AND c.vendor_id IS NOT NULL
            GROUP BY c.vendor_id
            ORDER BY {order_col} DESC
            LIMIT ?
        """
        params_q = [start_year, end_year, limit]
    else:
        sql = f"""
            SELECT
                COALESCE(i.name, CAST(c.institution_id AS TEXT)) AS name,
                COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                              THEN c.amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                COUNT(*) AS total_contracts,
                COALESCE(AVG(c.risk_score), 0) AS avg_risk_score
            FROM contracts c
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE c.contract_year BETWEEN ? AND ?
              AND c.institution_id IS NOT NULL
            GROUP BY c.institution_id
            ORDER BY {order_col} DESC
            LIMIT ?
        """
        params_q = [start_year, end_year, limit]

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params_q)
            rows = cursor.fetchall()

        data = [
            {
                "name": row["name"],
                "total_value_mxn": round(row["total_value_mxn"], 2),
                "total_contracts": row["total_contracts"],
                "avg_risk_score": round(row["avg_risk_score"], 4),
            }
            for row in rows
        ]

        result = {
            "entity": entity,
            "start_year": start_year,
            "end_year": end_year,
            "by": by,
            "data": data,
        }
        _top_period_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_top_by_period: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_top_by_period: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# SECTOR GROWTH ENDPOINT
# =============================================================================

@router.get("/sector-growth")
def get_sector_growth(year: int = Query(..., ge=2003, le=2025)):
    """
    Return year-over-year growth for each sector comparing the requested year
    against the prior year.  Results are cached for 24 hours.
    """
    cache_key = f"sector_growth_{year}"
    cached = _sector_growth_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _SECTOR_GROWTH_TTL:
        return cached["data"]

    sql = """
        WITH current_year AS (
            SELECT
                c.sector_id,
                COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                              THEN c.amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                COUNT(*) AS total_contracts
            FROM contracts c
            WHERE c.contract_year = ?
            GROUP BY c.sector_id
        ),
        prior_year AS (
            SELECT
                c.sector_id,
                COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                              THEN c.amount_mxn ELSE 0 END), 0) AS prior_year_value,
                COUNT(*) AS prior_year_contracts
            FROM contracts c
            WHERE c.contract_year = ?
            GROUP BY c.sector_id
        )
        SELECT
            s.id AS sector_id,
            s.code AS sector_code,
            s.name_es,
            s.name_en,
            COALESCE(cy.total_value_mxn, 0) AS total_value_mxn,
            COALESCE(py.prior_year_value, 0) AS prior_year_value,
            COALESCE(cy.total_contracts, 0) AS total_contracts,
            COALESCE(py.prior_year_contracts, 0) AS prior_year_contracts
        FROM sectors s
        LEFT JOIN current_year cy ON s.id = cy.sector_id
        LEFT JOIN prior_year py ON s.id = py.sector_id
        WHERE s.is_active = 1
        ORDER BY total_value_mxn DESC
    """

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, [year, year - 1])
            rows = cursor.fetchall()

        data = []
        for row in rows:
            cur_val = row["total_value_mxn"] or 0
            prior_val = row["prior_year_value"] or 0
            cur_cnt = row["total_contracts"] or 0
            prior_cnt = row["prior_year_contracts"] or 0

            value_growth_pct = (
                round((cur_val - prior_val) / prior_val * 100, 2)
                if prior_val > 0 else None
            )
            contracts_growth_pct = (
                round((cur_cnt - prior_cnt) / prior_cnt * 100, 2)
                if prior_cnt > 0 else None
            )

            data.append({
                "sector_id": row["sector_id"],
                "sector_code": row["sector_code"],
                "name_es": row["name_es"],
                "name_en": row["name_en"],
                "total_value_mxn": round(cur_val, 2),
                "prior_year_value": round(prior_val, 2),
                "value_growth_pct": value_growth_pct,
                "total_contracts": cur_cnt,
                "prior_year_contracts": prior_cnt,
                "contracts_growth_pct": contracts_growth_pct,
            })

        result = {"year": year, "prior_year": year - 1, "data": data}
        _sector_growth_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_sector_growth: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_sector_growth: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# YEAR SUMMARY ENDPOINT
# =============================================================================

@router.get("/year-summary/{year}")
def get_year_summary(year: int = Path(..., ge=2002, le=2026)):
    """
    Return a comprehensive summary for a given year: totals, risk breakdown,
    top vendors, top institutions, and year-over-year deltas.
    Cached for 24 hours.
    """
    cache_key = f"year_summary_{year}"
    cached = _year_summary_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _YEAR_SUMMARY_TTL:
        return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # -- Main year aggregates ------------------------------------------
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_contracts,
                    COALESCE(SUM(CASE WHEN COALESCE(amount_mxn, 0) <= 100000000000
                                  THEN amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END)
                        AS high_risk_contracts,
                    COALESCE(AVG(risk_score), 0) AS avg_risk_score,
                    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) AS cnt_critical,
                    SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) AS cnt_high,
                    SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) AS cnt_medium,
                    SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) AS cnt_low
                FROM contracts
                WHERE contract_year = ?
                """,
                [year],
            )
            row = cursor.fetchone()
            total_contracts = row["total_contracts"] or 0
            total_value_mxn = round(row["total_value_mxn"] or 0, 2)
            high_risk_contracts = row["high_risk_contracts"] or 0
            avg_risk_score = round(row["avg_risk_score"] or 0, 4)
            high_risk_pct = (
                round(high_risk_contracts / total_contracts * 100, 2)
                if total_contracts > 0 else 0.0
            )
            risk_level_counts = {
                "critical": row["cnt_critical"] or 0,
                "high": row["cnt_high"] or 0,
                "medium": row["cnt_medium"] or 0,
                "low": row["cnt_low"] or 0,
            }

            # -- Prior year for deltas -----------------------------------------
            vs_prior_year = None
            if year > 2002:
                cursor.execute(
                    """
                    SELECT
                        COUNT(*) AS total_contracts,
                        COALESCE(SUM(CASE WHEN COALESCE(amount_mxn, 0) <= 100000000000
                                      THEN amount_mxn ELSE 0 END), 0) AS total_value_mxn
                    FROM contracts
                    WHERE contract_year = ?
                    """,
                    [year - 1],
                )
                prior = cursor.fetchone()
                prior_contracts = prior["total_contracts"] or 0
                prior_value = prior["total_value_mxn"] or 0

                value_change_pct = (
                    round((total_value_mxn - prior_value) / prior_value * 100, 2)
                    if prior_value > 0 else None
                )
                contracts_change_pct = (
                    round((total_contracts - prior_contracts) / prior_contracts * 100, 2)
                    if prior_contracts > 0 else None
                )
                vs_prior_year = {
                    "value_change_pct": value_change_pct,
                    "contracts_change_pct": contracts_change_pct,
                }

            # -- Top 5 vendors ------------------------------------------------
            cursor.execute(
                """
                SELECT
                    COALESCE(v.name, CAST(c.vendor_id AS TEXT)) AS name,
                    COUNT(*) AS total_contracts,
                    COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                                  THEN c.amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                    COALESCE(AVG(c.risk_score), 0) AS avg_risk_score
                FROM contracts c
                LEFT JOIN vendors v ON c.vendor_id = v.id
                WHERE c.contract_year = ? AND c.vendor_id IS NOT NULL
                GROUP BY c.vendor_id
                ORDER BY total_value_mxn DESC
                LIMIT 5
                """,
                [year],
            )
            top_vendors = [
                {
                    "name": r["name"],
                    "total_contracts": r["total_contracts"],
                    "total_value_mxn": round(r["total_value_mxn"], 2),
                    "avg_risk_score": round(r["avg_risk_score"], 4),
                }
                for r in cursor.fetchall()
            ]

            # -- Top 5 institutions -------------------------------------------
            cursor.execute(
                """
                SELECT
                    COALESCE(i.name, CAST(c.institution_id AS TEXT)) AS name,
                    COUNT(*) AS total_contracts,
                    COALESCE(SUM(CASE WHEN COALESCE(c.amount_mxn, 0) <= 100000000000
                                  THEN c.amount_mxn ELSE 0 END), 0) AS total_value_mxn,
                    COALESCE(AVG(c.risk_score), 0) AS avg_risk_score
                FROM contracts c
                LEFT JOIN institutions i ON c.institution_id = i.id
                WHERE c.contract_year = ? AND c.institution_id IS NOT NULL
                GROUP BY c.institution_id
                ORDER BY total_value_mxn DESC
                LIMIT 5
                """,
                [year],
            )
            top_institutions = [
                {
                    "name": r["name"],
                    "total_contracts": r["total_contracts"],
                    "total_value_mxn": round(r["total_value_mxn"], 2),
                    "avg_risk_score": round(r["avg_risk_score"], 4),
                }
                for r in cursor.fetchall()
            ]

        result = {
            "year": year,
            "total_contracts": total_contracts,
            "total_value_mxn": total_value_mxn,
            "high_risk_contracts": high_risk_contracts,
            "high_risk_pct": high_risk_pct,
            "avg_risk_score": avg_risk_score,
            "vs_prior_year": vs_prior_year,
            "top_vendors": top_vendors,
            "top_institutions": top_institutions,
            "risk_level_counts": risk_level_counts,
        }
        _year_summary_cache[cache_key] = {"ts": _time.time(), "data": result}
        return result

    except sqlite3.OperationalError as e:
        logger.error("DB error in get_year_summary: %s", e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        logger.error("Error in get_year_summary: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
