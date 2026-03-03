"""
Analysis sub-router: Model validation and ASF endpoints.

Covers: model metadata, risk overview, per-case detection, validation summary,
detection rate, false negatives, factor analysis, factor lift,
ASF sector findings, ASF institution summary.
"""

import sqlite3
import logging
import json
import time as _time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime, timedelta

from ..dependencies import get_db
from ..helpers.analysis_helpers import table_exists
from ..models.asf import (
    SectorASFResponse, SectorASFFinding,
    ASFInstitutionSummaryItem, ASFInstitutionSummaryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class ModelMetadataResponse(BaseModel):
    version: str
    trained_at: Optional[str]
    auc_test: Optional[float]
    auc_train: Optional[float] = None
    pu_correction: Optional[float] = None
    n_contracts: Optional[int] = None
    updated_at: Optional[str] = None


class RiskOverviewResponse(BaseModel):
    overview: Dict[str, Any]
    risk_distribution: List[Dict[str, Any]]
    yearly_trends: List[Dict[str, Any]]


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


# =============================================================================
# CACHE VARIABLES
# =============================================================================

_factor_lift_cache: Dict[str, Any] = {}
_factor_lift_cache_ts: float = 0
_FACTOR_LIFT_CACHE_TTL = 1800  # 30 minutes

_asf_sector_cache: dict = {}
_asf_sector_cache_lock = __import__("threading").Lock()
_ASF_SECTOR_TTL = 86400  # 24 hours

_asf_inst_summary_cache: dict = {}
_asf_inst_summary_lock = __import__("threading").Lock()
_ASF_INST_SUMMARY_TTL = 86400  # 24 hours


# =============================================================================
# SECTOR-TO-RAMO MAPPING
# =============================================================================

_SECTOR_RAMOS: dict = {
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

_SECTOR_NAMES: dict = {
    1: "salud", 2: "educacion", 3: "infraestructura", 4: "energia",
    5: "defensa", 6: "tecnologia", 7: "hacienda", 8: "gobernacion",
    9: "agricultura", 10: "ambiente", 11: "trabajo", 12: "otros",
}


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
            row = cursor.execute(
                "SELECT model_version, created_at, auc_roc, test_auc, "
                "pu_correction_factor, temporal_metrics "
                "FROM model_calibration WHERE sector_id IS NULL "
                "ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            if not row:
                return {
                    "version": "v5.1", "trained_at": "2026-02-27",
                    "n_contracts": 3110007, "auc_test": 0.957,
                    "auc_train": 0.964, "pu_correction": 0.882,
                    "updated_at": "2026-02-27",
                }
            train_auc = None
            if row["temporal_metrics"]:
                try:
                    tm = json.loads(row["temporal_metrics"])
                    train_auc = tm.get("train_auc")
                except (json.JSONDecodeError, TypeError):
                    pass
            return {
                "version": row["model_version"],
                "trained_at": row["created_at"],
                "auc_test": row["test_auc"] or row["auc_roc"],
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
# VALIDATION ENDPOINTS
# =============================================================================

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


@router.get("/validation/factor-analysis", response_model=FactorAnalysisResponse)
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
# FACTOR LIFT VS GROUND TRUTH ENDPOINT
# =============================================================================

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
# ASF SECTOR FINDINGS ENDPOINT
# =============================================================================

@router.get("/sectors/{sector_id}/asf-findings", response_model=SectorASFResponse)
def get_sector_asf_findings(sector_id: int = Path(..., ge=1, le=12)):
    """Get ASF audit findings aggregated for a sector."""
    cache_key = f"asf_sector_{sector_id}"
    with _asf_sector_cache_lock:
        entry = _asf_sector_cache.get(cache_key)
        if entry and datetime.now() < entry["expires_at"]:
            return entry["value"]

    ramo_codes = _SECTOR_RAMOS.get(sector_id, [])
    sector_name = _SECTOR_NAMES.get(sector_id, "otros")

    findings: list = []
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
        _asf_sector_cache[cache_key] = {
            "value": result,
            "expires_at": datetime.now() + timedelta(seconds=_ASF_SECTOR_TTL),
        }
    return result


# =============================================================================
# ASF INSTITUTION SUMMARY ENDPOINT
# =============================================================================

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
                SUM(CASE WHEN a.amount_mxn < 100000000000 THEN a.amount_mxn
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
            """
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
