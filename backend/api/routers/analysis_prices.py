"""
Price hypothesis and price analysis endpoints for the analysis API.

Covers: price hypotheses list/summary/detail/review, contract price analysis,
price baselines, ML anomalies, anomaly comparison.
"""

import sqlite3
import logging
import time as _time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime

from ..dependencies import get_db
from ..helpers.analysis_helpers import (
    build_where_clause,
    row_to_hypothesis_dict,
    table_exists,
    calculate_pagination,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class PriceHypothesisItem(BaseModel):
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
    data: List[PriceHypothesisItem]
    pagination: Dict[str, int]
    summary: Dict[str, Any]


class PriceHypothesisDetailResponse(BaseModel):
    hypothesis: PriceHypothesisItem
    contract: Dict[str, Any]
    sector_baseline: Optional[Dict[str, Any]] = None
    vendor_profile: Optional[Dict[str, Any]] = None
    similar_contracts: List[Dict[str, Any]] = []


class ContractPriceAnalysisResponse(BaseModel):
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
    is_valid: bool
    review_notes: Optional[str] = None


class PriceHypothesesSummaryResponse(BaseModel):
    status: str
    overall: Dict[str, Any]
    by_type: List[Dict[str, Any]]
    by_sector: List[Dict[str, Any]]
    by_confidence: List[Dict[str, Any]]
    recent_runs: List[Dict[str, Any]]


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
# CACHE VARIABLES (defined before all functions that use them)
# =============================================================================

_price_hyp_summary_cache: Dict[str, Any] = {}
_PRICE_HYP_SUMMARY_CACHE_TTL = 3600  # 1 hour

_ml_anomalies_cache: Dict[str, Any] = {}
_ML_ANOMALIES_CACHE_TTL = 30 * 60  # 30 minutes

_anomaly_comparison_cache: Dict[str, Any] = {}
_ANOMALY_COMPARISON_TTL = 3600  # 1 hour


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
# ML PRICE ANOMALY ENDPOINT
# =============================================================================

@router.get("/prices/ml-anomalies", response_model=MLAnomaliesResponse)
def get_ml_price_anomalies(
    sector_id: Optional[int] = Query(None, ge=1, le=12),
    limit: int = Query(20, ge=1, le=50),
    only_new: bool = Query(False),
    model: Optional[str] = Query(None),
):
    """
    Return top-scoring contracts from the multi-feature Isolation Forest price anomaly detector.

    Run ``python -m scripts.compute_price_anomaly_scores`` to populate the
    ``contract_ml_anomalies`` table before calling this endpoint.
    """
    cache_key = f"ml_anomalies:{sector_id}:{limit}:{only_new}:{model}"
    cached = _ml_anomalies_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _ML_ANOMALIES_CACHE_TTL:
        return cached["data"]

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='contract_ml_anomalies'"
            )
            if not cursor.fetchone():
                result = {"data": [], "total": 0, "new_detections": 0}
                _ml_anomalies_cache[cache_key] = {"ts": _time.time(), "data": result}
                return result

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

            cursor.execute(
                f"SELECT COUNT(*) AS cnt FROM contract_ml_anomalies ma {where}",
                params,
            )
            total_row = cursor.fetchone()
            total = total_row["cnt"] if total_row else 0

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
                data.append({
                    "contract_id": row["contract_id"],
                    "anomaly_score": round(float(row["anomaly_score"]), 4),
                    "sector_id": row["sector_id"],
                    "sector_name": sector_code,
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

@router.get("/anomaly-comparison")
def get_anomaly_comparison():
    """
    Compare price-only vs full-vector Isolation Forest anomaly detectors.
    Based on Ouyang, Goh & Lim (2022): full-vector outperforms price-only by 23% recall.
    """
    import sqlite3 as _sqlite3

    cached = _anomaly_comparison_cache.get("data")
    if cached and (_time.time() - cached["ts"]) < _ANOMALY_COMPARISON_TTL:
        return cached["data"]

    with get_db() as conn:
        conn.row_factory = _sqlite3.Row
        cursor = conn.cursor()

        counts = cursor.execute("""
            SELECT model, COUNT(*) as cnt
            FROM contract_ml_anomalies
            GROUP BY model
        """).fetchall()
        model_counts = {r["model"]: r["cnt"] for r in counts}

        price_only = model_counts.get("price_only", 0)
        full_vector = model_counts.get("full_z_vector", 0)

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
