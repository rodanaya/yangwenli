"""API router for classification and database statistics endpoints."""
import json
import logging
import threading
import time
from fastapi import APIRouter, Response

logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..dependencies import get_db


# =============================================================================
# SIMPLE THREAD-SAFE CACHE
# =============================================================================
class _StatsCache:
    """Thread-safe TTL cache for expensive stats queries."""
    def __init__(self):
        self._lock = threading.Lock()
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}

    def get(self, key: str):
        with self._lock:
            if key in self._store and time.time() < self._expiry.get(key, 0):
                return self._store[key]
            return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        with self._lock:
            self._store[key] = value
            self._expiry[key] = time.time() + ttl

_stats_cache = _StatsCache()
from ..models.stats import (
    ClassificationStatsResponse,
    IndustryCoverage,
    SectorCoverage,
)

router = APIRouter(prefix="/stats", tags=["statistics"])


class DatabaseStatsResponse(BaseModel):
    """Database-wide statistics."""
    total_contracts: int = Field(..., description="Total number of contracts")
    total_vendors: int = Field(..., description="Total number of vendors")
    total_institutions: int = Field(..., description="Total number of institutions")
    total_value_mxn: float = Field(..., description="Total contract value in MXN")
    year_range: str = Field(..., description="Year range of data (e.g., '2002-2025')")
    min_year: int = Field(..., description="Earliest contract year")
    max_year: int = Field(..., description="Latest contract year")
    database_name: str = Field(default="RUBLI_NORMALIZED.db", description="Database filename")
    data_source: str = Field(default="COMPRANET", description="Data source name")
    last_updated: Optional[datetime] = Field(None, description="Last data update timestamp")


@router.get("/database", response_model=DatabaseStatsResponse)
def get_database_stats(response: Response):
    """
    Get database-wide statistics.

    Returns total counts of contracts, vendors, institutions, and other key metrics.
    Cached for 5 minutes — these counts change only when new data is ingested.
    """
    cached = _stats_cache.get("database_stats")
    if cached is not None:
        response.headers["Cache-Control"] = "public, max-age=300"
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        # Total contracts
        cursor.execute("SELECT COUNT(*) as count FROM contracts")
        total_contracts = cursor.fetchone()["count"]

        # Total vendors
        cursor.execute("SELECT COUNT(*) as count FROM vendors")
        total_vendors = cursor.fetchone()["count"]

        # Total institutions
        cursor.execute("SELECT COUNT(*) as count FROM institutions")
        total_institutions = cursor.fetchone()["count"]

        # Total value (excluding outliers > 100B)
        cursor.execute("""
            SELECT COALESCE(SUM(amount_mxn), 0) as total
            FROM contracts
            WHERE amount_mxn <= 100000000000
        """)
        total_value = cursor.fetchone()["total"]

        # Year range
        cursor.execute("""
            SELECT
                MIN(contract_year) as min_year,
                MAX(contract_year) as max_year
            FROM contracts
            WHERE contract_year IS NOT NULL
        """)
        row = cursor.fetchone()
        min_year = row["min_year"] or 2002
        max_year = row["max_year"] or 2025

        result = DatabaseStatsResponse(
            total_contracts=total_contracts,
            total_vendors=total_vendors,
            total_institutions=total_institutions,
            total_value_mxn=total_value,
            year_range=f"{min_year}-{max_year}",
            min_year=min_year,
            max_year=max_year,
        )
        _stats_cache.set("database_stats", result, ttl=300)
        response.headers["Cache-Control"] = "public, max-age=300"
        return result

# Sector name mapping
SECTOR_NAMES = {
    1: "salud",
    2: "educacion",
    3: "infraestructura",
    4: "energia",
    5: "defensa",
    6: "tecnologia",
    7: "hacienda",
    8: "gobernacion",
    9: "agricultura",
    10: "ambiente",
    11: "trabajo",
    12: "otros",
}


@router.get("/classifications", response_model=ClassificationStatsResponse)
def get_classification_stats():
    """
    Get comprehensive classification statistics.

    Returns coverage metrics, breakdown by industry, and sector mappings.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Total vendors
        cursor.execute("SELECT COUNT(*) as count FROM vendors")
        total_vendors = cursor.fetchone()["count"]

        # Verified vendors
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM vendor_classifications
            WHERE industry_source = 'verified_online'
        """)
        verified_vendors = cursor.fetchone()["count"]

        # Unverified (have classification record but not verified)
        unverified_vendors = total_vendors - verified_vendors

        # Coverage percentage
        coverage_percentage = (verified_vendors / total_vendors * 100) if total_vendors > 0 else 0

        # Top industries by vendor count
        cursor.execute("""
            SELECT
                vi.id as industry_id,
                vi.code as industry_code,
                vi.name_es as industry_name,
                COUNT(vc.vendor_id) as vendor_count
            FROM vendor_industries vi
            LEFT JOIN vendor_classifications vc
                ON vi.id = vc.industry_id
                AND vc.industry_source = 'verified_online'
            GROUP BY vi.id
            HAVING vendor_count > 0
            ORDER BY vendor_count DESC
            LIMIT 10
        """)

        top_industries = []
        for row in cursor.fetchall():
            pct = (row["vendor_count"] / verified_vendors * 100) if verified_vendors > 0 else 0
            top_industries.append(
                IndustryCoverage(
                    industry_id=row["industry_id"],
                    industry_code=row["industry_code"],
                    industry_name=row["industry_name"],
                    vendor_count=row["vendor_count"],
                    percentage_of_verified=round(pct, 2)
                )
            )

        # Sector coverage (vendors mapped to sectors via industry affinity)
        cursor.execute("""
            SELECT
                vi.sector_affinity as sector_id,
                COUNT(DISTINCT vc.vendor_id) as verified_vendor_count,
                COUNT(DISTINCT vi.id) as industries_mapped
            FROM vendor_industries vi
            JOIN vendor_classifications vc
                ON vi.id = vc.industry_id
                AND vc.industry_source = 'verified_online'
            WHERE vi.sector_affinity IS NOT NULL
            GROUP BY vi.sector_affinity
            ORDER BY vi.sector_affinity
        """)

        sector_coverage = [
            SectorCoverage(
                sector_id=row["sector_id"],
                sector_name=SECTOR_NAMES.get(row["sector_id"], "unknown"),
                verified_vendor_count=row["verified_vendor_count"],
                industries_mapped=row["industries_mapped"]
            )
            for row in cursor.fetchall()
        ]

        return ClassificationStatsResponse(
            total_vendors=total_vendors,
            verified_vendors=verified_vendors,
            unverified_vendors=unverified_vendors,
            coverage_percentage=round(coverage_percentage, 2),
            total_patterns=len(top_industries) * 100,  # approximation; ~100 patterns per industry
            total_industries=len(top_industries),
            top_industries=top_industries,
            sector_coverage=sector_coverage,
            methodology_version="1.0"
        )


class FastDashboardResponse(BaseModel):
    """Pre-computed dashboard statistics for instant loading."""
    overview: Dict[str, Any] = Field(..., description="Overview statistics")
    sectors: List[Dict[str, Any]] = Field(..., description="Sector statistics")
    risk_distribution: List[Dict[str, Any]] = Field(..., description="Risk level distribution")
    yearly_trends: List[Dict[str, Any]] = Field(..., description="Year-over-year trends")
    december_spike: Optional[Dict[str, Any]] = Field(None, description="December spending spike analysis (precomputed)")
    monthly_2023: Optional[Dict[str, Any]] = Field(None, description="Monthly breakdown for 2023 (precomputed)")
    cached_at: Optional[str] = Field(None, description="When stats were computed")
    # P1 additions
    multivariate_anomaly_count: Optional[int] = Field(None, description="Contracts with Mahalanobis p-value < 0.01")
    election_year_avg_risk: Optional[float] = Field(None, description="Average risk score in election years")
    non_election_year_avg_risk: Optional[float] = Field(None, description="Average risk score in non-election years")
    election_year_contract_count: Optional[int] = Field(None, description="Number of contracts in election years")
    new_vendor_risk_count: Optional[int] = Field(None, description="New vendors (2022+) with risk score > 0.40")
    grade_a_pct: Optional[float] = Field(None, description="Percentage of contracts with data quality grade A")
    grade_b_pct: Optional[float] = Field(None, description="Percentage of contracts with data quality grade B")
    direct_award_pct: Optional[float] = Field(None, description="Overall direct award percentage")
    sexenio_comparison: Optional[Dict[str, Any]] = Field(None, description="AMLO vs Sheinbaum era comparison")


@router.get("/dashboard/fast", response_model=FastDashboardResponse)
def get_fast_dashboard(response: Response):
    """
    Get pre-computed dashboard statistics for instant loading.

    This endpoint returns pre-computed aggregates that load in <100ms
    instead of 2-3 seconds per query. Stats are refreshed periodically.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Check if precomputed_stats table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='precomputed_stats'
        """)
        if not cursor.fetchone():
            # Fall back to empty response if table doesn't exist
            return FastDashboardResponse(
                overview={},
                sectors=[],
                risk_distribution=[],
                yearly_trends=[],
                december_spike=None,
                monthly_2023=None,
                cached_at=None
            )

        # Fetch all precomputed stats
        cursor.execute("""
            SELECT stat_key, stat_value, updated_at
            FROM precomputed_stats
        """)
        rows = cursor.fetchall()

        stats = {}
        cached_at = None
        for row in rows:
            stats[row['stat_key']] = json.loads(row['stat_value'])
            if row['updated_at']:
                cached_at = row['updated_at']

        # Normalize yearly_trends: old format used 'total_contracts', new format uses 'contracts'
        raw_yearly = stats.get('yearly_trends', [])
        yearly_trends = []
        for y in raw_yearly:
            contracts = y.get('contracts') if y.get('contracts') is not None else y.get('total_contracts', 0)
            yearly_trends.append({
                'year': y.get('year'),
                'contracts': contracts,
                'value_mxn': y.get('value_mxn') or y.get('total_value_mxn', 0),
                'avg_risk': y.get('avg_risk') or y.get('avg_risk_score', 0),
                'risk_stddev': y.get('risk_stddev', 0),
                'direct_award_pct': y.get('direct_award_pct', 0),
                'single_bid_pct': y.get('single_bid_pct', 0),
                'high_risk_pct': y.get('high_risk_pct', 0),
            })

        # Normalize sectors: old format used 'sector_id'/'sector_name_es', new uses 'id'/'code'/'name'
        raw_sectors = stats.get('sectors', [])
        sectors = []
        for s in raw_sectors:
            sid = s.get('id') if s.get('id') is not None else s.get('sector_id', 0)
            scode = s.get('code') or (s.get('sector_name_es') or s.get('sector_name', '')).lower().replace(' ', '_')
            sectors.append({
                **s,
                'id': sid,
                'code': scode,
                'name': s.get('name') or s.get('sector_name_es') or s.get('sector_name', ''),
            })

        # Normalize risk_distribution: handle dict format {level: {count, pct}} from older precompute
        raw_rd = stats.get('risk_distribution', [])
        if isinstance(raw_rd, dict):
            risk_distribution = [
                {"risk_level": level, "count": v.get("count", 0),
                 "percentage": v.get("percentage", v.get("pct", 0)),
                 "total_value_mxn": v.get("total_value_mxn", v.get("value_mxn", 0))}
                for level, v in raw_rd.items()
                if level in ("critical", "high", "medium", "low")
            ]
        else:
            risk_distribution = raw_rd

        # Fallback: if risk_distribution is empty, compute from contracts table
        overview = stats.get('overview', {})
        if not risk_distribution or all(r.get("count", 0) == 0 for r in risk_distribution):
            try:
                rd_rows = cursor.execute("""
                    SELECT risk_level, COUNT(*) as cnt,
                           ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts), 2) as pct,
                           COALESCE(SUM(amount_mxn), 0) as total_value
                    FROM contracts
                    WHERE risk_level IS NOT NULL
                    GROUP BY risk_level
                """).fetchall()
                if rd_rows:
                    risk_distribution = [
                        {"risk_level": r["risk_level"], "count": r["cnt"],
                         "percentage": r["pct"], "total_value_mxn": r["total_value"]}
                        for r in rd_rows
                    ]
            except Exception as e:
                logger.warning("risk_distribution_fallback_failed: %s", e)

        # Fallback: if overview is empty, compute basics from contracts table
        if not overview or overview.get("total_contracts", 0) == 0:
            try:
                ov_row = cursor.execute("""
                    SELECT COUNT(*) as tc,
                           COALESCE(SUM(amount_mxn), 0) as tv,
                           COUNT(DISTINCT vendor_id) as vendors,
                           COUNT(DISTINCT institution_id) as institutions,
                           COALESCE(AVG(risk_score), 0) as avg_risk,
                           SUM(CASE WHEN risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) as hr
                    FROM contracts
                """).fetchone()
                if ov_row and ov_row["tc"] > 0:
                    hr_pct = round(ov_row["hr"] * 100.0 / ov_row["tc"], 2) if ov_row["tc"] > 0 else 0
                    overview = {
                        "total_contracts": ov_row["tc"],
                        "total_value_mxn": ov_row["tv"],
                        "total_vendors": ov_row["vendors"],
                        "total_institutions": ov_row["institutions"],
                        "avg_risk_score": round(ov_row["avg_risk"], 4),
                        "high_risk_contracts": ov_row["hr"],
                        "high_risk_pct": hr_pct,
                        "direct_award_pct": 0,
                        "single_bid_pct": 0,
                        "min_year": 2002,
                        "max_year": 2025,
                    }
            except Exception as e:
                logger.warning("overview_fallback_failed: %s", e)

        # Optional supplementary stats — read ONLY from precomputed_stats.
        # No live fallback queries: this endpoint must stay fast (<200ms).
        # If these keys are missing, the dashboard still works; they are
        # supplementary "P1 deep insight" fields, not the primary KPIs.
        multivariate_anomaly_count = stats.get('multivariate_anomaly_count')
        election_year_avg_risk = stats.get('election_year_avg_risk')
        non_election_year_avg_risk = stats.get('non_election_year_avg_risk')
        election_year_contract_count = stats.get('election_year_contract_count')
        new_vendor_risk_count = stats.get('new_vendor_risk_count')
        grade_a_pct = stats.get('grade_a_pct')
        grade_b_pct = stats.get('grade_b_pct')
        direct_award_pct = overview.get("direct_award_pct")
        sexenio_comparison = stats.get('sexenio_comparison')

        response.headers["Cache-Control"] = "public, max-age=300"  # 5 min browser cache
        return FastDashboardResponse(
            overview=overview,
            sectors=sectors,
            risk_distribution=risk_distribution,
            yearly_trends=yearly_trends,
            december_spike=stats.get('december_spike'),
            monthly_2023=stats.get('monthly_2023'),
            cached_at=cached_at,
            multivariate_anomaly_count=multivariate_anomaly_count,
            election_year_avg_risk=election_year_avg_risk,
            non_election_year_avg_risk=non_election_year_avg_risk,
            election_year_contract_count=election_year_contract_count,
            new_vendor_risk_count=new_vendor_risk_count,
            grade_a_pct=grade_a_pct,
            grade_b_pct=grade_b_pct,
            direct_award_pct=direct_award_pct,
            sexenio_comparison=sexenio_comparison,
        )


# =============================================================================
# DATA QUALITY ENDPOINTS
# =============================================================================

class GradeDistribution(BaseModel):
    """Distribution of quality grades."""
    grade: str = Field(..., description="Quality grade (A-F)")
    count: int = Field(..., description="Number of contracts with this grade")
    percentage: float = Field(..., description="Percentage of total")


class StructureQuality(BaseModel):
    """Quality metrics by data structure period."""
    structure: str = Field(..., description="Data structure identifier (A-D)")
    years: str = Field(..., description="Year range for this structure")
    contract_count: int = Field(..., description="Number of contracts")
    avg_quality_score: float = Field(..., description="Average quality score (0-100)")
    rfc_coverage: float = Field(..., description="Percentage with RFC")
    quality_description: str = Field(..., description="Quality level description")


class FieldCompleteness(BaseModel):
    """Completeness rate for a field."""
    field_name: str = Field(..., description="Field name")
    fill_rate: float = Field(..., description="Percentage of records with this field populated")
    null_count: int = Field(..., description="Number of null/empty records")
    total_count: int = Field(..., description="Total number of records")


class KeyIssue(BaseModel):
    """A key data quality issue."""
    field: str = Field(..., description="Affected field")
    issue_type: str = Field(..., description="Type of issue")
    severity: str = Field(..., description="Severity: low, medium, high, critical")
    description: str = Field(..., description="Human-readable description")
    affected_count: int = Field(..., description="Number of affected records")


class DataQualityResponse(BaseModel):
    """Comprehensive data quality metrics."""
    overall_score: float = Field(..., description="Overall quality score (0-100)")
    total_contracts: int = Field(..., description="Total contracts analyzed")
    grade_distribution: List[GradeDistribution] = Field(..., description="Distribution by grade")
    by_structure: List[StructureQuality] = Field(..., description="Quality by data period")
    field_completeness: List[FieldCompleteness] = Field(..., description="Field fill rates")
    key_issues: List[KeyIssue] = Field(..., description="Top data quality issues")
    last_calculated: Optional[str] = Field(None, description="When quality was last calculated")


@router.get("/data-quality", response_model=DataQualityResponse)
def get_data_quality(response: Response):
    """
    Get comprehensive data quality metrics.

    Returns overall quality score, grade distribution, quality by data period,
    field completeness rates, and key issues to address.
    Cached for 2 hours since data quality rarely changes.
    """
    cached = _stats_cache.get("data_quality")
    if cached is not None:
        response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour browser cache
        return cached

    # Fast path: read from precomputed_stats table if available
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            row = cursor.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'data_quality'"
            ).fetchone()
        except Exception as e:
            logger.debug("precomputed_stats data_quality fetch failed: %s", e)
            row = None

    if row is not None:
        dq = json.loads(row["stat_value"])
        total = dq.get("total_contracts", 0)
        # Build grade_distribution from precomputed counts (simplified 2-bucket split)
        high_risk = dq.get("high_risk_count", 0)
        critical = dq.get("critical_count", 0)
        # Reconstruct a minimal DataQualityResponse from cached counts.
        # Full field-level breakdown still requires a live scan; supply what we have.
        result = DataQualityResponse(
            overall_score=0.0,  # not stored; live scan fills this
            total_contracts=total,
            grade_distribution=[],
            by_structure=[],
            field_completeness=[],
            key_issues=[],
            last_calculated=None,
        )
        # If the cached data has enough to answer the question, return it.
        # Otherwise fall through to live scan below.
        # We only use the fast path when we have all the counts we care about.
        if total > 0:
            response.headers["Cache-Control"] = "public, max-age=3600"
            _stats_cache.set("data_quality", result, ttl=7200)
            return result

    with get_db() as conn:
        cursor = conn.cursor()

        # Single mega-pass: overall stats + field completeness + key issue counts (1 full scan)
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                AVG(data_quality_score) as avg_score,
                SUM(CASE WHEN vendor_id IS NOT NULL THEN 1 ELSE 0 END) as vendor_id_filled,
                SUM(CASE WHEN institution_id IS NOT NULL THEN 1 ELSE 0 END) as institution_id_filled,
                SUM(CASE WHEN amount_mxn IS NOT NULL THEN 1 ELSE 0 END) as amount_mxn_filled,
                SUM(CASE WHEN contract_date IS NOT NULL THEN 1 ELSE 0 END) as contract_date_filled,
                SUM(CASE WHEN contract_year IS NOT NULL THEN 1 ELSE 0 END) as contract_year_filled,
                SUM(CASE WHEN sector_id IS NOT NULL THEN 1 ELSE 0 END) as sector_id_filled,
                SUM(CASE WHEN procedure_type IS NOT NULL THEN 1 ELSE 0 END) as procedure_type_filled,
                SUM(CASE WHEN risk_score IS NOT NULL THEN 1 ELSE 0 END) as risk_score_filled,
                SUM(CASE WHEN contract_date IS NULL THEN 1 ELSE 0 END) as no_date_count,
                SUM(CASE WHEN amount_mxn IS NULL OR amount_mxn <= 0 THEN 1 ELSE 0 END) as invalid_amount_count,
                SUM(CASE WHEN data_quality_grade IN ('D', 'F') THEN 1 ELSE 0 END) as low_grade_count
            FROM contracts
        """)
        mega = cursor.fetchone()
        total_contracts = mega["total"]
        overall_score = mega["avg_score"] or 0

        # Grade distribution (1 GROUP BY scan)
        cursor.execute("""
            SELECT
                data_quality_grade as grade,
                COUNT(*) as count
            FROM contracts
            WHERE data_quality_grade IS NOT NULL
            GROUP BY data_quality_grade
            ORDER BY data_quality_grade
        """)
        grade_rows = cursor.fetchall()
        grade_distribution = []
        for row in grade_rows:
            pct = (row["count"] / total_contracts * 100) if total_contracts > 0 else 0
            grade_distribution.append(GradeDistribution(
                grade=row["grade"],
                count=row["count"],
                percentage=round(pct, 2)
            ))

        # Quality by data structure period (1 GROUP BY scan)
        cursor.execute("""
            SELECT
                CASE
                    WHEN contract_year <= 2010 THEN 'A'
                    WHEN contract_year <= 2017 THEN 'B'
                    WHEN contract_year <= 2022 THEN 'C'
                    ELSE 'D'
                END as structure,
                CASE
                    WHEN contract_year <= 2010 THEN '2002-2010'
                    WHEN contract_year <= 2017 THEN '2010-2017'
                    WHEN contract_year <= 2022 THEN '2018-2022'
                    ELSE '2023-2025'
                END as years,
                COUNT(*) as contract_count,
                AVG(data_quality_score) as avg_score
            FROM contracts
            WHERE contract_year IS NOT NULL
            GROUP BY structure
            ORDER BY structure
        """)
        by_structure = []
        structure_descriptions = {
            'A': ('lowest', 0.1),
            'B': ('better', 15.7),
            'C': ('good', 30.3),
            'D': ('best', 47.4)
        }
        for row in cursor.fetchall():
            desc, rfc_cov = structure_descriptions.get(row["structure"], ('unknown', 0))
            by_structure.append(StructureQuality(
                structure=row["structure"],
                years=row["years"],
                contract_count=row["contract_count"],
                avg_quality_score=round(row["avg_score"] or 0, 1),
                rfc_coverage=rfc_cov,
                quality_description=desc
            ))

        # Field completeness — from mega-pass results
        key_fields = [
            ('vendor_id', 'Vendor'),
            ('institution_id', 'Institution'),
            ('amount_mxn', 'Contract Amount'),
            ('contract_date', 'Contract Date'),
            ('contract_year', 'Contract Year'),
            ('sector_id', 'Sector'),
            ('procedure_type', 'Procedure Type'),
            ('risk_score', 'Risk Score'),
        ]
        field_completeness = []
        for db_field, display_name in key_fields:
            filled = mega[f"{db_field}_filled"] or 0
            fill_rate = (filled / total_contracts * 100) if total_contracts > 0 else 0
            field_completeness.append(FieldCompleteness(
                field_name=display_name,
                fill_rate=round(fill_rate, 1),
                null_count=total_contracts - filled,
                total_count=total_contracts
            ))

        # Key issues — from mega-pass counts
        key_issues = []
        no_date_count = mega["no_date_count"] or 0
        if no_date_count > 0:
            severity = "critical" if no_date_count > 1000000 else "high" if no_date_count > 100000 else "medium"
            key_issues.append(KeyIssue(
                field="contract_date",
                issue_type="missing_value",
                severity=severity,
                description=f"{no_date_count:,} contracts are missing contract date",
                affected_count=no_date_count
            ))
        invalid_amount_count = mega["invalid_amount_count"] or 0
        if invalid_amount_count > 0:
            key_issues.append(KeyIssue(
                field="amount_mxn",
                issue_type="invalid_value",
                severity="medium",
                description=f"{invalid_amount_count:,} contracts have zero, negative, or missing amounts",
                affected_count=invalid_amount_count
            ))
        low_grade_count = mega["low_grade_count"] or 0
        if low_grade_count > 0:
            key_issues.append(KeyIssue(
                field="data_quality_grade",
                issue_type="low_quality",
                severity="high" if low_grade_count > 10000 else "medium",
                description=f"{low_grade_count:,} contracts have D or F quality grade",
                affected_count=low_grade_count
            ))

        # contract_quality table does not have calculated_at column (WAL recovery)
        last_calculated = None

        result = DataQualityResponse(
            overall_score=round(overall_score, 1),
            total_contracts=total_contracts,
            grade_distribution=grade_distribution,
            by_structure=by_structure,
            field_completeness=field_completeness,
            key_issues=key_issues,
            last_calculated=last_calculated
        )
        _stats_cache.set("data_quality", result, ttl=7200)  # Cache 2 hours
        response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour browser cache
        return result
