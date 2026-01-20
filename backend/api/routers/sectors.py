"""
Sector and Analysis API endpoints.

Provides sector statistics, trends, and cross-cutting analysis.
"""
import sqlite3
import logging
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path

from ..dependencies import get_db
from ..models.sector import (
    SectorBase,
    SectorStatistics,
    SectorTrend,
    SectorDetailResponse,
    SectorListResponse,
    SectorComparisonItem,
    RiskDistribution,
    YearOverYearChange,
    AnalysisOverview,
    SectorTrendListResponse,
    RiskDistributionListResponse,
    YearOverYearListResponse,
    SectorComparisonListResponse,
    AnomalyItem,
    AnomalyListResponse,
)

# Amount validation thresholds (from CLAUDE.md data validation rules)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this

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
async def list_sectors(
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
):
    """
    List all sectors with statistics.

    Returns the 12-sector taxonomy with contract counts, values, and risk metrics.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            year_filter = "AND c.contract_year = ?" if year else ""
            params = [year] if year else []

            query = f"""
                SELECT
                    s.id,
                    s.code,
                    s.name,
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
                GROUP BY s.id, s.code, s.name
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

            return SectorListResponse(
                data=sectors,
                total_contracts=total_contracts,
                total_value_mxn=total_value,
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in list_sectors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}", response_model=SectorDetailResponse)
async def get_sector(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID (1-12)"),
):
    """
    Get detailed information for a specific sector.

    Returns sector metadata, statistics, and year-over-year trends.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get sector info
            cursor.execute("SELECT id, code, name FROM sectors WHERE id = ?", (sector_id,))
            sector_row = cursor.fetchone()

            if not sector_row:
                raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")

            # Get statistics
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

            # Get year-over-year trends
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

            return SectorDetailResponse(
                id=sector_row[0],
                code=sector_row[1],
                name=sector_row[2],
                color=SECTOR_COLORS.get(sector_id, "#64748b"),
                statistics=statistics,
                trends=trends,
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/sectors/{sector_id}/trends", response_model=SectorTrendListResponse)
async def get_sector_trends(
    sector_id: int = Path(..., ge=1, le=12, description="Sector ID"),
    start_year: Optional[int] = Query(None, ge=2002, description="Start year"),
    end_year: Optional[int] = Query(None, le=2026, description="End year"),
):
    """Get year-over-year trends for a sector."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = ["sector_id = ?", "contract_year IS NOT NULL"]
            params = [sector_id]

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

            return SectorTrendListResponse(data=trends)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_sector_trends: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# =============================================================================
# ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/analysis/overview", response_model=AnalysisOverview)
async def get_analysis_overview():
    """
    Get high-level analysis overview.

    Returns aggregate statistics across all contracts, vendors, and institutions.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Main statistics
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

            # Top sector by value
            cursor.execute("""
                SELECT s.name
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                GROUP BY c.sector_id
                ORDER BY SUM(c.amount_mxn) DESC
                LIMIT 1
            """)
            top_value_row = cursor.fetchone()

            # Top sector by risk
            cursor.execute("""
                SELECT s.name
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                GROUP BY c.sector_id
                ORDER BY AVG(c.risk_score) DESC
                LIMIT 1
            """)
            top_risk_row = cursor.fetchone()

            total = main_row[0] or 0
            high_risk = main_row[5] or 0

            return AnalysisOverview(
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

    except sqlite3.Error as e:
        logger.error(f"Database error in get_analysis_overview: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/risk-distribution", response_model=RiskDistributionListResponse)
async def get_risk_distribution(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
):
    """
    Get risk score distribution.

    Returns counts and percentages for each risk level.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            conditions = []
            params = []

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

            # Get total for percentages
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

            return RiskDistributionListResponse(data=distribution)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_risk_distribution: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/year-over-year", response_model=YearOverYearListResponse)
async def get_year_over_year(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
):
    """
    Get year-over-year comparison.

    Returns annual statistics with change percentages.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            sector_filter = "AND sector_id = ?" if sector_id else ""
            params = [sector_id] if sector_id else []

            query = f"""
                SELECT
                    contract_year,
                    COUNT(*) as contracts,
                    COALESCE(SUM(amount_mxn), 0) as value,
                    COALESCE(AVG(risk_score), 0) as avg_risk
                FROM contracts
                WHERE contract_year IS NOT NULL {sector_filter}
                GROUP BY contract_year
                ORDER BY contract_year
            """
            cursor.execute(query, params)
            rows = cursor.fetchall()

            results = []
            prev_contracts = None
            prev_value = None

            for row in rows:
                contracts_change = None
                value_change = None

                if prev_contracts is not None and prev_contracts > 0:
                    contracts_change = round((row[1] - prev_contracts) / prev_contracts * 100, 2)

                if prev_value is not None and prev_value > 0:
                    value_change = round((row[2] - prev_value) / prev_value * 100, 2)

                results.append(YearOverYearChange(
                    year=row[0],
                    contracts=row[1],
                    value_mxn=row[2],
                    avg_risk=round(row[3], 4),
                    contracts_change_pct=contracts_change,
                    value_change_pct=value_change,
                ))

                prev_contracts = row[1]
                prev_value = row[2]

            return YearOverYearListResponse(data=results)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_year_over_year: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/vendor-concentration", response_model=SectorComparisonListResponse)
async def get_vendor_concentration(
    top_n: int = Query(10, ge=1, le=50, description="Number of top vendors"),
):
    """
    Get vendor concentration analysis.

    Returns sectors ranked by concentration of contracts among top vendors.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # For each sector, calculate what % of contracts go to top N vendors
            query = """
                WITH sector_totals AS (
                    SELECT sector_id, COUNT(*) as total
                    FROM contracts
                    GROUP BY sector_id
                ),
                top_vendor_contracts AS (
                    SELECT
                        c.sector_id,
                        SUM(vendor_contracts) as top_vendor_total
                    FROM (
                        SELECT
                            sector_id,
                            vendor_id,
                            COUNT(*) as vendor_contracts,
                            ROW_NUMBER() OVER (PARTITION BY sector_id ORDER BY COUNT(*) DESC) as rn
                        FROM contracts
                        GROUP BY sector_id, vendor_id
                    ) c
                    WHERE c.rn <= ?
                    GROUP BY c.sector_id
                )
                SELECT
                    s.id,
                    s.name,
                    ROUND(COALESCE(t.top_vendor_total * 100.0 / st.total, 0), 2) as concentration_pct
                FROM sectors s
                LEFT JOIN sector_totals st ON s.id = st.sector_id
                LEFT JOIN top_vendor_contracts t ON s.id = t.sector_id
                ORDER BY concentration_pct DESC
            """
            cursor.execute(query, (top_n,))
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

            return SectorComparisonListResponse(data=items)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_vendor_concentration: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/direct-award-rate", response_model=SectorComparisonListResponse)
async def get_direct_award_rate():
    """
    Get direct award rate by sector.

    Returns sectors ranked by percentage of direct awards.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    s.id,
                    s.name,
                    ROUND(SUM(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as rate
                FROM sectors s
                LEFT JOIN contracts c ON s.id = c.sector_id
                GROUP BY s.id, s.name
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

            return SectorComparisonListResponse(data=items)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_direct_award_rate: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/single-bid-rate", response_model=SectorComparisonListResponse)
async def get_single_bid_rate():
    """
    Get single bid rate by sector.

    Returns sectors ranked by percentage of single-bid contracts
    (competitive procedures with only one bidder).
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    s.id,
                    s.name,
                    ROUND(SUM(CASE WHEN c.is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as rate
                FROM sectors s
                LEFT JOIN contracts c ON s.id = c.sector_id
                GROUP BY s.id, s.name
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

            return SectorComparisonListResponse(data=items)

    except sqlite3.Error as e:
        logger.error(f"Database error in get_single_bid_rate: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/analysis/anomalies", response_model=AnomalyListResponse)
async def detect_anomalies(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    min_severity: Optional[str] = Query(None, description="Minimum severity: low, medium, high, critical"),
):
    """
    Detect statistical anomalies in procurement data.

    Identifies potential issues such as:
    - Price outliers (contracts significantly above sector median)
    - Timing clusters (multiple contracts same day to same vendor)
    - Vendor concentration (dominant vendors in sector)
    - Year-end spending spikes (December rush)
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            anomalies = []

            # Build base filter
            base_conditions = ["(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
            base_params = [MAX_CONTRACT_VALUE]

            if sector_id is not None:
                base_conditions.append("c.sector_id = ?")
                base_params.append(sector_id)

            if year is not None:
                base_conditions.append("c.contract_year = ?")
                base_params.append(year)

            base_where = " AND ".join(base_conditions)

            # 1. Price outliers - contracts > 3x sector median
            price_query = f"""
                WITH sector_medians AS (
                    SELECT
                        sector_id,
                        (SELECT amount_mxn FROM contracts
                         WHERE sector_id = c.sector_id
                         AND amount_mxn > 0
                         AND (amount_mxn IS NULL OR amount_mxn <= ?)
                         ORDER BY amount_mxn
                         LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM contracts WHERE sector_id = c.sector_id AND amount_mxn > 0)
                        ) as median_amount
                    FROM contracts c
                    WHERE {base_where}
                    GROUP BY sector_id
                )
                SELECT
                    c.sector_id,
                    s.name as sector_name,
                    COUNT(*) as outlier_count,
                    SUM(c.amount_mxn) as outlier_value
                FROM contracts c
                JOIN sector_medians sm ON c.sector_id = sm.sector_id
                JOIN sectors s ON c.sector_id = s.id
                WHERE {base_where}
                AND c.amount_mxn > sm.median_amount * 3
                AND sm.median_amount > 0
                GROUP BY c.sector_id, s.name
                HAVING outlier_count >= 5
            """
            cursor.execute(price_query, [MAX_CONTRACT_VALUE] + base_params + base_params)
            for row in cursor.fetchall():
                anomalies.append(AnomalyItem(
                    anomaly_type="price_outlier",
                    severity="high" if row["outlier_count"] > 50 else "medium",
                    description=f"{row['outlier_count']} contracts in {row['sector_name']} exceed 3x sector median",
                    affected_contracts=row["outlier_count"],
                    affected_value_mxn=row["outlier_value"] or 0,
                    details={
                        "sector_id": row["sector_id"],
                        "sector_name": row["sector_name"],
                        "threshold_multiplier": 3,
                    }
                ))

            # 2. Timing clusters - multiple contracts same day to same vendor
            timing_query = f"""
                SELECT
                    contract_date,
                    vendor_id,
                    v.name as vendor_name,
                    COUNT(*) as contract_count,
                    SUM(c.amount_mxn) as total_value
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE {base_where}
                AND c.contract_date IS NOT NULL
                GROUP BY c.contract_date, c.vendor_id, v.name
                HAVING contract_count >= 5
                ORDER BY contract_count DESC
                LIMIT 20
            """
            cursor.execute(timing_query, base_params)
            for row in cursor.fetchall():
                severity = "critical" if row["contract_count"] >= 10 else "high"
                anomalies.append(AnomalyItem(
                    anomaly_type="timing_cluster",
                    severity=severity,
                    description=f"{row['contract_count']} contracts to '{row['vendor_name']}' on {row['contract_date']}",
                    affected_contracts=row["contract_count"],
                    affected_value_mxn=row["total_value"] or 0,
                    details={
                        "vendor_id": row["vendor_id"],
                        "vendor_name": row["vendor_name"],
                        "contract_date": str(row["contract_date"]),
                    }
                ))

            # 3. Vendor concentration - single vendor >30% of sector
            concentration_query = f"""
                WITH sector_totals AS (
                    SELECT sector_id, COUNT(*) as total, SUM(amount_mxn) as total_value
                    FROM contracts
                    WHERE {base_where}
                    GROUP BY sector_id
                ),
                vendor_sector AS (
                    SELECT
                        c.sector_id,
                        c.vendor_id,
                        v.name as vendor_name,
                        COUNT(*) as vendor_contracts,
                        SUM(c.amount_mxn) as vendor_value
                    FROM contracts c
                    JOIN vendors v ON c.vendor_id = v.id
                    WHERE {base_where}
                    GROUP BY c.sector_id, c.vendor_id, v.name
                )
                SELECT
                    vs.sector_id,
                    s.name as sector_name,
                    vs.vendor_id,
                    vs.vendor_name,
                    vs.vendor_contracts,
                    vs.vendor_value,
                    ROUND(vs.vendor_contracts * 100.0 / st.total, 2) as pct_contracts,
                    ROUND(vs.vendor_value * 100.0 / st.total_value, 2) as pct_value
                FROM vendor_sector vs
                JOIN sector_totals st ON vs.sector_id = st.sector_id
                JOIN sectors s ON vs.sector_id = s.id
                WHERE vs.vendor_contracts * 100.0 / st.total > 30
                OR vs.vendor_value * 100.0 / NULLIF(st.total_value, 0) > 30
                ORDER BY pct_contracts DESC
                LIMIT 20
            """
            cursor.execute(concentration_query, base_params + base_params)
            for row in cursor.fetchall():
                pct = row["pct_contracts"] or 0
                severity = "critical" if pct > 50 else "high" if pct > 40 else "medium"
                anomalies.append(AnomalyItem(
                    anomaly_type="vendor_concentration",
                    severity=severity,
                    description=f"'{row['vendor_name']}' has {pct}% of {row['sector_name']} contracts",
                    affected_contracts=row["vendor_contracts"],
                    affected_value_mxn=row["vendor_value"] or 0,
                    details={
                        "sector_id": row["sector_id"],
                        "sector_name": row["sector_name"],
                        "vendor_id": row["vendor_id"],
                        "vendor_name": row["vendor_name"],
                        "pct_contracts": pct,
                        "pct_value": row["pct_value"],
                    }
                ))

            # 4. Year-end spending spike - December has >15% of annual contracts
            yearend_query = f"""
                WITH yearly_stats AS (
                    SELECT
                        contract_year,
                        COUNT(*) as total_contracts,
                        SUM(amount_mxn) as total_value
                    FROM contracts
                    WHERE {base_where}
                    AND contract_year IS NOT NULL
                    GROUP BY contract_year
                ),
                december_stats AS (
                    SELECT
                        contract_year,
                        COUNT(*) as dec_contracts,
                        SUM(amount_mxn) as dec_value
                    FROM contracts
                    WHERE {base_where}
                    AND strftime('%m', contract_date) = '12'
                    GROUP BY contract_year
                )
                SELECT
                    y.contract_year,
                    d.dec_contracts,
                    d.dec_value,
                    ROUND(d.dec_contracts * 100.0 / y.total_contracts, 2) as dec_pct
                FROM yearly_stats y
                JOIN december_stats d ON y.contract_year = d.contract_year
                WHERE d.dec_contracts * 100.0 / y.total_contracts > 15
                ORDER BY y.contract_year DESC
                LIMIT 10
            """
            cursor.execute(yearend_query, base_params + base_params)
            for row in cursor.fetchall():
                pct = row["dec_pct"]
                severity = "high" if pct > 25 else "medium"
                anomalies.append(AnomalyItem(
                    anomaly_type="year_end_spike",
                    severity=severity,
                    description=f"{pct}% of {row['contract_year']} contracts were in December",
                    affected_contracts=row["dec_contracts"],
                    affected_value_mxn=row["dec_value"] or 0,
                    details={
                        "year": row["contract_year"],
                        "december_percentage": pct,
                    }
                ))

            # Filter by minimum severity if requested
            severity_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
            if min_severity and min_severity.lower() in severity_order:
                min_level = severity_order[min_severity.lower()]
                anomalies = [a for a in anomalies if severity_order.get(a.severity, 0) >= min_level]

            # Sort by severity (critical first)
            anomalies.sort(key=lambda x: severity_order.get(x.severity, 0), reverse=True)

            # Track filters
            filters_applied = {}
            if sector_id:
                filters_applied["sector_id"] = sector_id
            if year:
                filters_applied["year"] = year
            if min_severity:
                filters_applied["min_severity"] = min_severity

            return AnomalyListResponse(
                data=anomalies,
                total=len(anomalies),
                filters_applied=filters_applied,
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in detect_anomalies: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
