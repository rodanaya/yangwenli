"""
Sector and Analysis API endpoints.

Provides sector statistics, trends, and cross-cutting analysis.
"""
import sqlite3
import json
import logging
from typing import Optional, List, Any, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, HTTPException, Path, Request

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..cache import SimpleCache


# Global cache instance
_cache = SimpleCache()

# Cache TTL constants
SECTORS_CACHE_TTL = 7200      # 2 hours for sector statistics
ANALYSIS_CACHE_TTL = 3600     # 1 hour for analysis overview
CONCENTRATION_CACHE_TTL = 7200  # 2 hours for vendor concentration

# Optional rate limiting - gracefully degrade if not available
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_ENABLED = True
except ImportError:
    limiter = None
    RATE_LIMITING_ENABLED = False


def rate_limit(limit_string: str):
    """Decorator factory for rate limiting. Returns no-op if slowapi not installed."""
    if RATE_LIMITING_ENABLED and limiter:
        return limiter.limit(limit_string)
    else:
        def noop_decorator(func):
            return func
        return noop_decorator
from ..models.sector import (
    SectorBase,
    SectorStatistics,
    SectorTrend,
    SectorDetailResponse,
    SectorListResponse,
    SectorComparisonItem,
    RiskDistribution,
    AnalysisOverview,
    SectorTrendListResponse,
    RiskDistributionListResponse,
    SectorComparisonListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sectors"])

# Sector color mapping (from CLAUDE.md)
SECTOR_COLORS = {
    1: "#dc2626",   # salud
    2: "#3b82f6",   # educacion
    3: "#ea580c",   # infraestructura
    4: "#eab308",   # energia
    5: "#1e3a5f",   # defensa
    6: "#8b5cf6",   # tecnologia
    7: "#16a34a",   # hacienda
    8: "#be123c",   # gobernacion
    9: "#22c55e",   # agricultura
    10: "#10b981",  # ambiente
    11: "#f97316",  # trabajo
    12: "#64748b",  # otros
}


@router.get("/sectors", response_model=SectorListResponse)
def list_sectors(
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
):
    """
    List all sectors with statistics.

    Returns the 12-sector taxonomy with contract counts, values, and risk metrics.
    Uses precomputed_stats for the default (all-years) case for instant response.
    Falls back to live query when filtering by year.
    """
    cache_key = f"sectors_list:{year or 'all'}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Fast path: use precomputed_stats for all-years case
            if year is None:
                cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'")
                row = cursor.fetchone()
                if row:
                    import json
                    sector_data = json.loads(row[0])
                    sectors = []
                    total_contracts = 0
                    total_value = 0

                    for s in sector_data:
                        total = s.get("total_contracts", 0)
                        total_contracts += total
                        val = s.get("total_value_mxn", 0)
                        total_value += val
                        high_risk = (s.get("high_risk_count", 0) or 0) + (s.get("critical_risk_count", 0) or 0)

                        # Support both new format (id/code/name) and old precomputed format (sector_id/sector_name_es)
                        sid = s.get("id") or s.get("sector_id", 0)
                        scode = s.get("code") or str(sid)
                        sname = s.get("name") or s.get("sector_name_es") or s.get("sector_name", "")

                        sectors.append(SectorStatistics(
                            sector_id=sid,
                            sector_code=scode,
                            sector_name=sname,
                            color=SECTOR_COLORS.get(sid, "#64748b"),
                            total_contracts=total,
                            total_value_mxn=val,
                            total_vendors=s.get("total_vendors", 0),
                            total_institutions=s.get("total_institutions", 0),
                            avg_contract_value=round(val / total, 2) if total > 0 else 0,
                            avg_risk_score=round(s.get("avg_risk_score", 0) or 0, 4),
                            low_risk_count=s.get("low_risk_count", 0) or 0,
                            medium_risk_count=s.get("medium_risk_count", 0) or 0,
                            high_risk_count=s.get("high_risk_count", 0) or 0,
                            critical_risk_count=s.get("critical_risk_count", 0) or 0,
                            high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                            direct_award_count=s.get("direct_award_count", 0) or 0,
                            direct_award_pct=round((s.get("direct_award_count", 0) or 0) / total * 100, 2) if total > 0 else 0,
                            single_bid_count=s.get("single_bid_count", 0) or 0,
                            single_bid_pct=round((s.get("single_bid_count", 0) or 0) / total * 100, 2) if total > 0 else 0,
                        ))

                    response = SectorListResponse(
                        data=sectors,
                        total_contracts=total_contracts,
                        total_value_mxn=total_value,
                    )
                    _cache.set(cache_key, response, SECTORS_CACHE_TTL)
                    return response

            # Slow path: live query when filtering by year
            # safe: year_filter is a hardcoded SQL fragment, year value is parameterized
            year_filter = "AND c.contract_year = ?" if year else ""
            params = [year] if year else []

            query = f"""
                SELECT
                    s.id,
                    s.code,
                    s.name_es as name,
                    COUNT(c.id) as total_contracts,
                    COALESCE(SUM(c.amount_mxn), 0) as total_value,
                    COUNT(DISTINCT c.vendor_id) as total_vendors,
                    COUNT(DISTINCT c.institution_id) as total_institutions,
                    COALESCE(AVG(c.amount_mxn), 0) as avg_value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk,
                    SUM(CASE WHEN c.risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
                    SUM(CASE WHEN c.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                    SUM(CASE WHEN c.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                    SUM(CASE WHEN c.risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk,
                    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                    SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids
                FROM sectors s
                LEFT JOIN contracts c ON s.id = c.sector_id {year_filter}
                GROUP BY s.id, s.code, s.name_es
                ORDER BY total_contracts DESC
            """

            cursor.execute(query, params)
            rows = cursor.fetchall()

            sectors = []
            total_contracts = 0
            total_value = 0

            for row in rows:
                total = row[3] or 0
                total_contracts += total
                total_value += row[4] or 0

                high_risk = (row[11] or 0) + (row[12] or 0)

                sectors.append(SectorStatistics(
                    sector_id=row[0],
                    sector_code=row[1],
                    sector_name=row[2],
                    color=SECTOR_COLORS.get(row[0], "#64748b"),
                    total_contracts=total,
                    total_value_mxn=row[4] or 0,
                    total_vendors=row[5] or 0,
                    total_institutions=row[6] or 0,
                    avg_contract_value=row[7] or 0,
                    avg_risk_score=round(row[8] or 0, 4),
                    low_risk_count=row[9] or 0,
                    medium_risk_count=row[10] or 0,
                    high_risk_count=row[11] or 0,
                    critical_risk_count=row[12] or 0,
                    high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                    direct_award_count=row[13] or 0,
                    direct_award_pct=round((row[13] or 0) / total * 100, 2) if total > 0 else 0,
                    single_bid_count=row[14] or 0,
                    single_bid_pct=round((row[14] or 0) / total * 100, 2) if total > 0 else 0,
                ))

            response = SectorListResponse(
                data=sectors,
                total_contracts=total_contracts,
                total_value_mxn=total_value,
            )

            _cache.set(cache_key, response, SECTORS_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in list_sectors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/statistics", response_model=SectorListResponse)
def get_sectors_statistics():
    """
    Get aggregated statistics for all sectors.

    Alias for GET /sectors (no year filter). Returns the 12-sector breakdown
    with contract counts, risk scores, and procedure metrics from precomputed_stats.
    This endpoint exists separately so that /sectors/{sector_id} does not shadow it.
    """
    return list_sectors(year=None)


@router.get("/sectors/{sector_id}", response_model=SectorDetailResponse)
def get_sector(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Get detailed information for a specific sector.

    Returns sector metadata, statistics, and year-over-year trends.
    Uses precomputed_stats for instant stats; only year-trend query hits contracts table.
    """
    cache_key = f"sector_detail:{sector_id}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get sector info
            cursor.execute("SELECT id, code, name_es as name FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()

            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Fast path: use precomputed_stats sectors key
            s = None
            cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'")
            ps_row = cursor.fetchone()
            if ps_row:
                sector_data = json.loads(ps_row[0])
                for item in sector_data:
                    sid = item.get("id") or item.get("sector_id", 0)
                    if sid == sector_id:
                        s = item
                        break

            if s:
                total = s.get("total_contracts", 0) or 0
                high_risk = (s.get("high_risk_count", 0) or 0) + (s.get("critical_risk_count", 0) or 0)
                statistics = SectorStatistics(
                    sector_id=sector_row[0],
                    sector_code=sector_row[1],
                    sector_name=sector_row[2],
                    color=SECTOR_COLORS.get(sector_id, "#64748b"),
                    total_contracts=total,
                    total_value_mxn=s.get("total_value_mxn", 0) or 0,
                    total_vendors=s.get("total_vendors", 0) or 0,
                    total_institutions=s.get("total_institutions", 0) or 0,
                    avg_contract_value=round((s.get("total_value_mxn", 0) or 0) / total, 2) if total > 0 else 0,
                    avg_risk_score=round(s.get("avg_risk_score", 0) or 0, 4),
                    low_risk_count=s.get("low_risk_count", 0) or 0,
                    medium_risk_count=s.get("medium_risk_count", 0) or 0,
                    high_risk_count=s.get("high_risk_count", 0) or 0,
                    critical_risk_count=s.get("critical_risk_count", 0) or 0,
                    high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                    direct_award_count=s.get("direct_award_count", 0) or 0,
                    direct_award_pct=round((s.get("direct_award_count", 0) or 0) / total * 100, 2) if total > 0 else 0,
                    single_bid_count=s.get("single_bid_count", 0) or 0,
                    single_bid_pct=round((s.get("single_bid_count", 0) or 0) / total * 100, 2) if total > 0 else 0,
                )
            else:
                # Fallback: live query (slow but correct)
                stats_query = """
                    SELECT
                        COUNT(*) as total_contracts,
                        COALESCE(SUM(amount_mxn), 0) as total_value,
                        COUNT(DISTINCT vendor_id) as total_vendors,
                        COUNT(DISTINCT institution_id) as total_institutions,
                        COALESCE(AVG(amount_mxn), 0) as avg_value,
                        COALESCE(AVG(risk_score), 0) as avg_risk,
                        SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
                        SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                        SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                        SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk,
                        SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                        SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids
                    FROM contracts
                    WHERE sector_id = ?
                """
                cursor.execute(stats_query, (sector_id,))
                stats_row = cursor.fetchone()
                total = stats_row[0] or 0
                high_risk = (stats_row[8] or 0) + (stats_row[9] or 0)

                statistics = SectorStatistics(
                    sector_id=sector_row[0],
                    sector_code=sector_row[1],
                    sector_name=sector_row[2],
                    color=SECTOR_COLORS.get(sector_id, "#64748b"),
                    total_contracts=total,
                    total_value_mxn=stats_row[1] or 0,
                    total_vendors=stats_row[2] or 0,
                    total_institutions=stats_row[3] or 0,
                    avg_contract_value=stats_row[4] or 0,
                    avg_risk_score=round(stats_row[5] or 0, 4),
                    low_risk_count=stats_row[6] or 0,
                    medium_risk_count=stats_row[7] or 0,
                    high_risk_count=stats_row[8] or 0,
                    critical_risk_count=stats_row[9] or 0,
                    high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                    direct_award_count=stats_row[10] or 0,
                    direct_award_pct=round((stats_row[10] or 0) / total * 100, 2) if total > 0 else 0,
                    single_bid_count=stats_row[11] or 0,
                    single_bid_pct=round((stats_row[11] or 0) / total * 100, 2) if total > 0 else 0,
                )

            # Get year-over-year trends — use precomputed sector_year_breakdown if available
            trends: list = []
            cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sector_year_breakdown'")
            syb_row = cursor.fetchone()
            if syb_row:
                try:
                    syb = json.loads(syb_row[0])
                    # Format: list of {sector_id, year, total_contracts, total_value_mxn, avg_risk_score, ...}
                    yr_items = [r for r in syb if r.get("sector_id") == sector_id]
                    if yr_items:
                        trends = [
                            SectorTrend(
                                year=r["year"],
                                total_contracts=r.get("total_contracts", 0),
                                total_value_mxn=r.get("total_value_mxn", 0),
                                avg_risk_score=round(r.get("avg_risk_score", 0) or 0, 4),
                                direct_award_pct=r.get("direct_award_pct", 0) or 0,
                                single_bid_pct=r.get("single_bid_pct", 0) or 0,
                            )
                            for r in sorted(yr_items, key=lambda x: x["year"])
                        ]
                except Exception:
                    pass

            if not trends:
                # Fallback: live trends query — limit to last 10 years to keep it fast
                trends_query = """
                    SELECT
                        contract_year,
                        COUNT(*) as total_contracts,
                        COALESCE(SUM(amount_mxn), 0) as total_value,
                        COALESCE(AVG(risk_score), 0) as avg_risk,
                        ROUND(SUM(CASE WHEN is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as direct_pct,
                        ROUND(SUM(CASE WHEN is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as single_pct
                    FROM contracts
                    WHERE sector_id = ? AND contract_year IS NOT NULL
                      AND contract_year >= 2015
                    GROUP BY contract_year
                    ORDER BY contract_year
                """
                cursor.execute(trends_query, (sector_id,))
                trends_rows = cursor.fetchall()
                trends = [
                    SectorTrend(
                        year=row[0],
                        total_contracts=row[1],
                        total_value_mxn=row[2],
                        avg_risk_score=round(row[3], 4),
                        direct_award_pct=row[4] or 0,
                        single_bid_pct=row[5] or 0,
                    )
                    for row in trends_rows
                ]

            response = SectorDetailResponse(
                id=sector_row[0],
                code=sector_row[1],
                name=sector_row[2],
                color=SECTOR_COLORS.get(sector_id, "#64748b"),
                statistics=statistics,
                trends=trends,
            )
            _cache.set(cache_key, response, SECTORS_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}/timeline")
def get_sector_timeline(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Get yearly timeline for a sector with contract counts, values, and risk metrics.

    Returns one entry per year with total contracts, total value, high-risk count,
    and average risk score. Useful for temporal trend visualizations.
    """
    cache_key = f"sector_timeline:{sector_id}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()
            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Fast path: use precomputed sector_year_breakdown (instant, no contracts scan)
            cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sector_year_breakdown'",
            )
            precomp_row = cursor.fetchone()
            if precomp_row:
                all_breakdown = json.loads(precomp_row[0])
                sector_rows = sorted(
                    [r for r in all_breakdown if r["sector_id"] == sector_id],
                    key=lambda r: r["year"],
                )
                years = [
                    {
                        "year": r["year"],
                        "contracts": r["contracts"],
                        "total_value": r["total_value"],
                        "high_risk_count": round(
                            r.get("high_risk_pct", 0) / 100 * r["contracts"]
                        ),
                        "avg_risk": r.get("avg_risk", 0),
                    }
                    for r in sector_rows
                ]
                result = {"sector_id": sector_id, "years": years}
                _cache.set(cache_key, result, SECTORS_CACHE_TTL)
                return result

            # Fallback: live query — ensure index on sector_id is used; cap to 2010+ to limit scan
            # idx_c_sector_vendor (sector_id, vendor_id) or idx_c_sector_risk (sector_id, risk_level)
            # allow the planner to seek into this sector's rows.
            cursor.execute(
                """
                SELECT
                    contract_year AS year,
                    COUNT(*) AS contracts,
                    COALESCE(SUM(amount_mxn), 0) AS total_value,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) AS high_risk_count,
                    ROUND(COALESCE(AVG(risk_score), 0), 4) AS avg_risk
                FROM contracts
                WHERE sector_id = ? AND contract_year IS NOT NULL AND contract_year >= 2010
                GROUP BY contract_year
                ORDER BY contract_year
                """,
                (sector_id,),
            )
            years = [
                {
                    "year": row[0],
                    "contracts": row[1],
                    "total_value": row[2],
                    "high_risk_count": row[3],
                    "avg_risk": row[4],
                }
                for row in cursor.fetchall()
            ]

            result = {"sector_id": sector_id, "years": years}
            _cache.set(cache_key, result, SECTORS_CACHE_TTL)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_timeline: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}/trends", response_model=SectorTrendListResponse)
def get_sector_trends(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID"),
    start_year: Optional[int] = Query(None, ge=2002, description="Start year"),
    end_year: Optional[int] = Query(None, le=2026, description="End year"),
):
    """Get year-over-year trends for a sector."""
    cache_key = f"sector_trends:{sector_id}:{start_year}:{end_year}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Fast path: use precomputed sector_year_breakdown when no date filters
            if not start_year and not end_year:
                cursor.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sector_year_breakdown'"
                )
                precomp_row = cursor.fetchone()
                if precomp_row:
                    all_breakdown = json.loads(precomp_row[0])
                    sector_rows = sorted(
                        [r for r in all_breakdown if r.get("sector_id") == sector_id],
                        key=lambda r: r["year"],
                    )
                    trends = [
                        SectorTrend(
                            year=r["year"],
                            total_contracts=r["contracts"],
                            total_value_mxn=r["total_value"],
                            avg_risk_score=round(r.get("avg_risk", 0) or 0, 4),
                            direct_award_pct=r.get("direct_award_pct", 0) or 0,
                            single_bid_pct=r.get("single_bid_pct", 0) or 0,
                        )
                        for r in sector_rows
                    ]
                    result = SectorTrendListResponse(data=trends)
                    _cache.set(cache_key, result, SECTORS_CACHE_TTL)
                    return result

            # safe: conditions list contains only hardcoded column names, values are parameterized
            conditions = ["sector_id = ?", "contract_year IS NOT NULL"]
            params: list = [sector_id]

            if start_year:
                conditions.append("contract_year >= ?")
                params.append(start_year)

            if end_year:
                conditions.append("contract_year <= ?")
                params.append(end_year)

            query = f"""
                SELECT
                    contract_year,
                    COUNT(*) as total_contracts,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    ROUND(SUM(CASE WHEN is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2),
                    ROUND(SUM(CASE WHEN is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2)
                FROM contracts
                WHERE {' AND '.join(conditions)}
                GROUP BY contract_year
                ORDER BY contract_year
            """
            cursor.execute(query, params)
            rows = cursor.fetchall()

            trends = [
                SectorTrend(
                    year=row[0],
                    total_contracts=row[1],
                    total_value_mxn=row[2],
                    avg_risk_score=round(row[3], 4),
                    direct_award_pct=row[4] or 0,
                    single_bid_pct=row[5] or 0,
                )
                for row in rows
            ]

            result = SectorTrendListResponse(data=trends)
            _cache.set(cache_key, result, SECTORS_CACHE_TTL)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_trends: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/analysis/overview", response_model=AnalysisOverview)
@rate_limit("30/minute")
def get_analysis_overview(request: Request):
    """
    Get high-level analysis overview.

    Returns aggregate statistics across all contracts, vendors, and institutions.
    Response is cached for 1 hour to improve performance.
    """
    # Check cache first
    cache_key = "analysis_overview"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Fast path: use precomputed stats (avoids 3 × full 3.1M-row table scans)
            ov_row = cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'overview'"
            ).fetchone()
            sec_row = cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'"
            ).fetchone()

            if ov_row and sec_row:
                ov = json.loads(ov_row[0])
                sectors_data = json.loads(sec_row[0])
                total = ov.get("total_contracts", 0)
                high_risk = ov.get("high_risk_contracts", 0)
                top_by_value = max(sectors_data, key=lambda s: s.get("total_value_mxn", 0))
                top_by_risk = max(sectors_data, key=lambda s: s.get("avg_risk_score", 0))
                response = AnalysisOverview(
                    total_contracts=total,
                    total_value_mxn=ov.get("total_value_mxn", 0),
                    total_vendors=ov.get("total_vendors", 0),
                    total_institutions=ov.get("total_institutions", 0),
                    avg_risk_score=ov.get("avg_risk_score", 0),
                    high_risk_contracts=high_risk,
                    high_risk_value_mxn=ov.get("high_risk_value_mxn", 0),
                    high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                    direct_award_pct=ov.get("direct_award_pct", 0),
                    single_bid_pct=ov.get("single_bid_pct", 0),
                    min_year=ov.get("min_year", 2002),
                    max_year=ov.get("max_year", 2025),
                    years_covered=(ov.get("max_year", 2025) - ov.get("min_year", 2002) + 1),
                    sectors_count=12,
                    top_sector_by_value=top_by_value.get("name") or top_by_value.get("code", "Unknown"),
                    top_sector_by_risk=top_by_risk.get("name") or top_by_risk.get("code", "Unknown"),
                )
                _cache.set(cache_key, response, ANALYSIS_CACHE_TTL)
                return response

            # Fallback: live queries (used only if precomputed_stats is empty)
            cursor.execute("""
                SELECT
                    COUNT(*) as total_contracts,
                    COALESCE(SUM(amount_mxn), 0) as total_value,
                    COUNT(DISTINCT vendor_id) as total_vendors,
                    COUNT(DISTINCT institution_id) as total_institutions,
                    COALESCE(AVG(risk_score), 0) as avg_risk,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_count,
                    SUM(CASE WHEN risk_level IN ('high', 'critical') THEN amount_mxn ELSE 0 END) as high_risk_value,
                    ROUND(SUM(CASE WHEN is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as direct_pct,
                    ROUND(SUM(CASE WHEN is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as single_pct,
                    MIN(contract_year) as min_year,
                    MAX(contract_year) as max_year
                FROM contracts
            """)
            main_row = cursor.fetchone()

            cursor.execute("""
                SELECT s.name_es
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                GROUP BY c.sector_id
                ORDER BY SUM(c.amount_mxn) DESC
                LIMIT 1
            """)
            top_value_row = cursor.fetchone()

            cursor.execute("""
                SELECT s.name_es
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                GROUP BY c.sector_id
                ORDER BY AVG(c.risk_score) DESC
                LIMIT 1
            """)
            top_risk_row = cursor.fetchone()

            total = main_row[0] or 0
            high_risk = main_row[5] or 0

            response = AnalysisOverview(
                total_contracts=total,
                total_value_mxn=main_row[1] or 0,
                total_vendors=main_row[2] or 0,
                total_institutions=main_row[3] or 0,
                avg_risk_score=round(main_row[4] or 0, 4),
                high_risk_contracts=high_risk,
                high_risk_value_mxn=main_row[6] or 0,
                high_risk_pct=round(high_risk / total * 100, 2) if total > 0 else 0,
                direct_award_pct=main_row[7] or 0,
                single_bid_pct=main_row[8] or 0,
                min_year=main_row[9] or 2002,
                max_year=main_row[10] or 2025,
                years_covered=(main_row[10] or 2025) - (main_row[9] or 2002) + 1,
                sectors_count=12,
                top_sector_by_value=top_value_row[0] if top_value_row else "Unknown",
                top_sector_by_risk=top_risk_row[0] if top_risk_row else "Unknown",
            )
            _cache.set(cache_key, response, ANALYSIS_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_analysis_overview: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/risk-distribution", response_model=RiskDistributionListResponse)
def get_risk_distribution(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
):
    """
    Get risk score distribution.

    Returns counts and percentages for each risk level.
    Uses precomputed_stats for the default (no-filter) case.
    """
    cache_key = f"risk_distribution:{sector_id}:{year}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Fast path: use precomputed data when no filters
            if sector_id is None and year is None:
                cursor.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key = 'risk_distribution'")
                row = cursor.fetchone()
                if row:
                    dist_data = json.loads(row[0])
                    # Handle both dict and list formats from precomputed_stats
                    if isinstance(dist_data, dict):
                        dist_data = [
                            {"risk_level": level, "count": v.get("count", 0),
                             "percentage": v.get("percentage", v.get("pct", 0)),
                             "total_value_mxn": v.get("total_value_mxn", v.get("value_mxn", 0))}
                            for level, v in dist_data.items()
                            if level in ("critical", "high", "medium", "low")
                        ]
                    # Sort by risk level order
                    level_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
                    dist_data.sort(key=lambda x: level_order.get(x.get("risk_level", ""), 5))
                    distribution = [
                        RiskDistribution(
                            risk_level=d["risk_level"],
                            count=d["count"],
                            percentage=d["percentage"],
                            total_value_mxn=d.get("total_value_mxn", 0),
                        )
                        for d in dist_data
                    ]
                    result = RiskDistributionListResponse(data=distribution)
                    _cache.set(cache_key, result, ttl_seconds=7200)
                    return result

            # Per-sector fast path: use precomputed sectors key (has risk level counts)
            if sector_id is not None and year is None:
                cursor.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'"
                )
                sec_ps_row = cursor.fetchone()
                if sec_ps_row:
                    sector_data = json.loads(sec_ps_row[0])
                    s = next(
                        (
                            item for item in sector_data
                            if (item.get("id") or item.get("sector_id")) == sector_id
                        ),
                        None,
                    )
                    if s:
                        total = s.get("total_contracts", 0) or 0
                        counts = {
                            "low": s.get("low_risk_count", 0) or 0,
                            "medium": s.get("medium_risk_count", 0) or 0,
                            "high": s.get("high_risk_count", 0) or 0,
                            "critical": s.get("critical_risk_count", 0) or 0,
                        }
                        distribution = [
                            RiskDistribution(
                                risk_level=lvl,
                                count=cnt,
                                percentage=round(cnt / total * 100, 2) if total > 0 else 0,
                                total_value_mxn=0,
                            )
                            for lvl, cnt in [
                                ("low", counts["low"]),
                                ("medium", counts["medium"]),
                                ("high", counts["high"]),
                                ("critical", counts["critical"]),
                            ]
                        ]
                        result = RiskDistributionListResponse(data=distribution)
                        _cache.set(cache_key, result, ttl_seconds=7200)
                        return result

            # Slow path: live query with filters
            # safe: conditions list contains only hardcoded column names, values are parameterized
            conditions = []
            params: list = []

            if sector_id:
                conditions.append("sector_id = ?")
                params.append(sector_id)

            if year:
                conditions.append("contract_year = ?")
                params.append(year)

            where_clause = " AND ".join(conditions) if conditions else "1=1"

            query = f"""
                SELECT
                    risk_level,
                    COUNT(*) as count,
                    SUM(amount_mxn) as total_value
                FROM contracts
                WHERE {where_clause}
                GROUP BY risk_level
                ORDER BY
                    CASE risk_level
                        WHEN 'low' THEN 1
                        WHEN 'medium' THEN 2
                        WHEN 'high' THEN 3
                        WHEN 'critical' THEN 4
                        ELSE 5
                    END
            """
            cursor.execute(query, params)
            rows = cursor.fetchall()

            cursor.execute(f"SELECT COUNT(*) FROM contracts WHERE {where_clause}", params)
            total = cursor.fetchone()[0]

            distribution = [
                RiskDistribution(
                    risk_level=row[0] or "unknown",
                    count=row[1],
                    percentage=round(row[1] / total * 100, 2) if total > 0 else 0,
                    total_value_mxn=row[2] or 0,
                )
                for row in rows
            ]

            result = RiskDistributionListResponse(data=distribution)
            _cache.set(cache_key, result, ttl_seconds=7200)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_risk_distribution: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/vendor-concentration", response_model=SectorComparisonListResponse)
def get_vendor_concentration(
    top_n: int = Query(10, ge=1, le=50, description="Number of top vendors"),
):
    """
    Get vendor concentration analysis.

    Returns sectors ranked by concentration of contracts among top vendors.
    Response is cached for 2 hours to improve performance.
    Uses per-sector queries instead of a single window function for speed.
    """
    # Check cache first
    cache_key = f"vendor_concentration:{top_n}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get all sectors
            cursor.execute("SELECT id, name_es FROM sectors ORDER BY id")
            sector_rows = cursor.fetchall()

            items = []
            for sector_row in sector_rows:
                sid = sector_row["id"]
                sname = sector_row["name_es"]

                # Get total contracts for this sector
                cursor.execute(
                    "SELECT COUNT(*) as total FROM contracts WHERE sector_id = ?",
                    (sid,),
                )
                total = cursor.fetchone()["total"]
                if total == 0:
                    items.append(SectorComparisonItem(
                        sector_id=sid, sector_name=sname,
                        color=SECTOR_COLORS.get(sid, "#64748b"),
                        metric_value=0, rank=0,
                    ))
                    continue

                # Get top N vendors' contract counts for this sector
                cursor.execute("""
                    SELECT SUM(cnt) as top_total FROM (
                        SELECT COUNT(*) as cnt
                        FROM contracts
                        WHERE sector_id = ?
                        GROUP BY vendor_id
                        ORDER BY cnt DESC
                        LIMIT ?
                    )
                """, (sid, top_n))
                top_total_row = cursor.fetchone()
                top_total = top_total_row["top_total"] if top_total_row and top_total_row["top_total"] else 0

                concentration_pct = round(top_total * 100.0 / total, 2)
                items.append(SectorComparisonItem(
                    sector_id=sid, sector_name=sname,
                    color=SECTOR_COLORS.get(sid, "#64748b"),
                    metric_value=concentration_pct, rank=0,
                ))

            # Sort by concentration descending and assign ranks
            items.sort(key=lambda x: x.metric_value, reverse=True)
            for i, item in enumerate(items):
                item.rank = i + 1

            response = SectorComparisonListResponse(data=items)

            # Cache the response for 2 hours
            _cache.set(cache_key, response, CONCENTRATION_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_concentration: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/direct-award-rate", response_model=SectorComparisonListResponse)
def get_direct_award_rate():
    """
    Get direct award rate by sector.

    Returns sectors ranked by percentage of direct awards.
    """
    cache_key = "direct_award_rate"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    s.id,
                    s.name_es,
                    ROUND(SUM(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as rate
                FROM sectors s
                LEFT JOIN contracts c ON s.id = c.sector_id
                GROUP BY s.id, s.name_es
                ORDER BY rate DESC
            """
            cursor.execute(query)
            rows = cursor.fetchall()

            items = [
                SectorComparisonItem(
                    sector_id=row[0],
                    sector_name=row[1],
                    color=SECTOR_COLORS.get(row[0], "#64748b"),
                    metric_value=row[2] or 0,
                    rank=i + 1,
                )
                for i, row in enumerate(rows)
            ]

            response = SectorComparisonListResponse(data=items)
            _cache.set(cache_key, response, SECTORS_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_direct_award_rate: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/single-bid-rate", response_model=SectorComparisonListResponse)
def get_single_bid_rate():
    """
    Get single bid rate by sector.

    Returns sectors ranked by percentage of single-bid contracts
    (competitive procedures with only one bidder).
    """
    cache_key = "single_bid_rate"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    s.id,
                    s.name_es,
                    ROUND(SUM(CASE WHEN c.is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as rate
                FROM sectors s
                LEFT JOIN contracts c ON s.id = c.sector_id
                GROUP BY s.id, s.name_es
                ORDER BY rate DESC
            """
            cursor.execute(query)
            rows = cursor.fetchall()

            items = [
                SectorComparisonItem(
                    sector_id=row[0],
                    sector_name=row[1],
                    color=SECTOR_COLORS.get(row[0], "#64748b"),
                    metric_value=row[2] or 0,
                    rank=i + 1,
                )
                for i, row in enumerate(rows)
            ]

            response = SectorComparisonListResponse(data=items)
            _cache.set(cache_key, response, SECTORS_CACHE_TTL)
            return response

    except sqlite3.Error as e:
        logger.error(f"Database error in get_single_bid_rate: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# SECTOR CONCENTRATION HISTORY
# =============================================================================

def _gini(values: list) -> float:
    """Compute Gini coefficient for a list of non-negative values."""
    n = len(values)
    if n == 0:
        return 0.0
    values = sorted(values)
    cum = 0
    for i, v in enumerate(values):
        cum += (2 * (i + 1) - n - 1) * v
    total = sum(values)
    return cum / (n * total) if total > 0 else 0.0


@router.get("/sectors/{sector_id}/concentration-history")
def get_sector_concentration_history(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Get per-year Gini coefficient of contract value concentration among vendors
    for a sector.

    Gini = 0 means perfectly equal distribution; Gini = 1 means one vendor
    holds all contract value. Also returns top_vendor_share (share of the
    single largest vendor), total value, and vendor count per year.

    Response is cached for 2 hours.
    """
    cache_key = f"concentration_history:{sector_id}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify sector exists
            cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()
            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")
            sector_name = sector_row[0]

            # Fast path: use factor_baselines (vendor_concentration max_val = top vendor share)
            # and sector_year_breakdown for total_value and vendor_count.
            # This avoids scanning the contracts table entirely.
            cursor.execute("""
                SELECT year, mean, stddev, max_val
                FROM factor_baselines
                WHERE factor_name = 'vendor_concentration'
                  AND sector_id = ?
                  AND scope = 'sector_year'
                  AND year IS NOT NULL
                ORDER BY year
            """, (sector_id,))
            fb_rows = cursor.fetchall()

            # Load sector_year_breakdown for total_value and vendor_count
            cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sector_year_breakdown'",
            )
            precomp_row = cursor.fetchone()
            syb_lookup: dict = {}
            if precomp_row:
                for r in json.loads(precomp_row[0]):
                    if r["sector_id"] == sector_id:
                        syb_lookup[r["year"]] = r

            history = []
            for row in fb_rows:
                year = row[0]
                mean_conc = row[1] or 0.0
                std_conc = row[2] or 0.0
                max_conc = row[3] or 0.0
                syb = syb_lookup.get(year, {})
                total_value = syb.get("total_value", 0.0)
                vendor_count = syb.get("vendor_count", 0)
                # Approximate Gini from CV of vendor_concentration distribution
                # For a right-skewed distribution: Gini ≈ 1 - 1/(1 + CV) where CV = stddev/mean
                cv = (std_conc / mean_conc) if mean_conc > 0 else 0.0
                gini_approx = min(round(cv / (1 + cv), 4), 1.0)
                history.append({
                    "year": year,
                    "gini": gini_approx,
                    "top_vendor_share": round(max_conc, 4),
                    "total_value": round(total_value, 2),
                    "vendor_count": vendor_count,
                })

            result = {
                "sector_id": sector_id,
                "sector_name": sector_name,
                "history": history,
            }
            _cache.set(cache_key, result, CONCENTRATION_CACHE_TTL)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_concentration_history: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}/model-coefficients")
def get_sector_model_coefficients(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Get v0.6.5 model coefficients for a sector.

    Returns the logistic regression coefficients for the sector-specific model
    (or the global model if this sector falls back to it).
    """
    cache_key = f"sector_model_coefs:{sector_id}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()
            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Try sector-specific model first, then fall back to global
            cursor.execute(
                """
                SELECT sector_id, intercept, coefficients, pu_correction_factor,
                       auc_roc, test_auc, model_version, run_id
                FROM model_calibration
                WHERE sector_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (sector_id,),
            )
            row = cursor.fetchone()
            uses_global = False
            if not row:
                # Fall back to global model (sector_id IS NULL)
                cursor.execute(
                    """
                    SELECT sector_id, intercept, coefficients, pu_correction_factor,
                           auc_roc, test_auc, model_version, run_id
                    FROM model_calibration
                    WHERE sector_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                )
                row = cursor.fetchone()
                uses_global = True

            if not row:
                raise HTTPException(status_code=404, detail="Model calibration data not found")

            coefficients = json.loads(row[2]) if isinstance(row[2], str) else (row[2] or {})
            # Sort by absolute value descending
            sorted_coefs = sorted(
                [{"feature": k, "coefficient": v} for k, v in coefficients.items()],
                key=lambda x: abs(x["coefficient"]),
                reverse=True,
            )

            result = {
                "sector_id": sector_id,
                "sector_name": sector_row[0],
                "uses_global_model": uses_global,
                "model_version": row[6],
                "run_id": row[7],
                "intercept": round(row[1], 6) if row[1] is not None else None,
                "pu_correction_factor": round(row[3], 4) if row[3] is not None else None,
                "auc_roc": round(row[4], 4) if row[4] is not None else None,
                "test_auc": round(row[5], 4) if row[5] is not None else None,
                "coefficients": sorted_coefs,
            }
            _cache.set(cache_key, result, SECTORS_CACHE_TTL)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_model_coefficients: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}/temporal-anomaly")
def get_sector_temporal_anomaly(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Year to analyze"),
):
    """
    Get temporal anomaly scores for a sector in a given year.

    Returns how the sector's z-score features compare to the historical baseline,
    identifying which years had anomalous procurement patterns.
    """
    cache_key = f"sector_temporal_anomaly:{sector_id}:{year or 'all'}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()
            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Use factor_baselines to compute year-over-year anomaly for key features
            # Compare each year's mean to the sector-wide mean (z-score of means)
            cursor.execute(
                """
                SELECT year, factor_name, mean, stddev
                FROM factor_baselines
                WHERE sector_id = ?
                  AND scope = 'sector_year'
                  AND year IS NOT NULL
                  AND factor_name IN (
                    'price_volatility', 'vendor_concentration', 'price_ratio',
                    'single_bid', 'direct_award', 'same_day_count'
                  )
                ORDER BY year, factor_name
                """,
                (sector_id,),
            )
            rows = cursor.fetchall()

            # Group by year
            from collections import defaultdict
            year_features: dict = defaultdict(dict)
            for row in rows:
                if year is None or row[0] == year:
                    year_features[row[0]][row[1]] = {"mean": row[2], "stddev": row[3]}

            # Also pull sector-level baselines for comparison
            cursor.execute(
                """
                SELECT factor_name, mean, stddev
                FROM factor_baselines
                WHERE sector_id = ? AND scope = 'sector' AND year IS NULL
                  AND factor_name IN (
                    'price_volatility', 'vendor_concentration', 'price_ratio',
                    'single_bid', 'direct_award', 'same_day_count'
                  )
                """,
                (sector_id,),
            )
            sector_baselines = {row[0]: {"mean": row[1], "stddev": row[2]} for row in cursor.fetchall()}

            anomalies = []
            for yr in sorted(year_features.keys()):
                features = year_features[yr]
                anomaly_scores = {}
                for fname, vals in features.items():
                    baseline = sector_baselines.get(fname)
                    if baseline and baseline["stddev"] and baseline["stddev"] > 0:
                        z = (vals["mean"] - baseline["mean"]) / baseline["stddev"]
                        anomaly_scores[fname] = round(z, 3)
                    else:
                        anomaly_scores[fname] = 0.0

                overall = round(
                    sum(abs(v) for v in anomaly_scores.values()) / max(len(anomaly_scores), 1),
                    3,
                )
                anomalies.append({
                    "year": yr,
                    "overall_anomaly_score": overall,
                    "feature_scores": anomaly_scores,
                })

            result = {
                "sector_id": sector_id,
                "sector_name": sector_row[0],
                "year_filter": year,
                "anomalies": anomalies,
            }
            _cache.set(cache_key, result, SECTORS_CACHE_TTL)
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_temporal_anomaly: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# NOTE: /analysis/anomalies endpoint removed from sectors router to avoid
# duplicate route conflict with analysis.py router (which has cached version)
