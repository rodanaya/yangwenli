"""
API router for Investigation Case Generator endpoints.

Provides access to ML-generated investigation cases, dossiers,
and case management operations.
"""

import sqlite3
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path as FilePath
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from datetime import datetime

from ..dependencies import get_db_connection, get_db
from ..config.constants import get_risk_level

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/investigation", tags=["investigation"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class FeatureContribution(BaseModel):
    """Feature contribution from SHAP analysis."""
    feature: str
    contribution: float
    value: Optional[float] = None
    sector_median: Optional[float] = None
    comparison: str


class VendorExplanation(BaseModel):
    """SHAP-based explanation for a vendor's anomaly score."""
    vendor_id: int
    vendor_name: str
    sector_id: int
    ensemble_score: float
    risk_level: str
    top_contributing_features: List[FeatureContribution]
    explanation_text: Optional[str] = None
    shap_values: Optional[Dict[str, float]] = None


class FeatureImportanceItem(BaseModel):
    """Feature importance for a sector."""
    feature: str
    importance: float
    rank: int
    method: str
    calculated_at: Optional[str] = None


class ModelComparisonItem(BaseModel):
    """Model comparison result."""
    model: str
    anomalies_detected: int
    overlap_with_if: Optional[float] = None
    avg_score: float
    max_score: float
    execution_time: float
    parameters: Dict[str, Any]
    calculated_at: Optional[str] = None


class VendorSummary(BaseModel):
    """Vendor summary in a case."""
    vendor_id: int
    name: str
    rfc: Optional[str] = None
    role: str
    contract_count: Optional[int] = None
    contract_value_mxn: Optional[float] = None
    avg_risk_score: Optional[float] = None


class QuestionSummary(BaseModel):
    """Investigation question."""
    id: int
    question_type: str
    question_text: str
    priority: int
    supporting_evidence: Optional[List[str]] = None


class CaseListItem(BaseModel):
    """Case list item (summary view)."""
    id: int
    case_id: str
    case_type: str
    sector_id: int
    sector_name: str
    suspicion_score: float
    anomaly_score: Optional[float] = None
    confidence: float
    title: str
    total_contracts: int
    total_value_mxn: float
    estimated_loss_mxn: float
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    priority: int
    is_reviewed: bool
    validation_status: str
    vendor_count: int
    signals_triggered: List[str]


class CaseDetail(CaseListItem):
    """Full case detail with narrative and vendors."""
    summary: Optional[str] = None
    narrative: Optional[str] = None
    risk_factor_counts: Dict[str, Any]
    vendors: List[VendorSummary]
    questions: List[QuestionSummary]
    external_sources: List[Dict[str, str]]
    generated_at: str


class CaseListResponse(BaseModel):
    """Response for case listing."""
    data: List[CaseListItem]
    pagination: Dict[str, Any]


class CaseStatsResponse(BaseModel):
    """Summary statistics for cases."""
    total_cases: int
    by_sector: Dict[str, int]
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    total_value_mxn: float
    total_estimated_loss_mxn: float
    avg_suspicion_score: float
    critical_cases: int
    high_cases: int


class RunAnalysisRequest(BaseModel):
    """Request to run new analysis."""
    sector_ids: List[int] = Field(default=[1, 3], description="Sector IDs to analyze")
    min_score: float = Field(default=0.5, ge=0, le=1, description="Minimum suspicion score")
    regenerate: bool = Field(default=False, description="Regenerate existing cases")


class RunAnalysisResponse(BaseModel):
    """Response from running analysis."""
    success: bool
    message: str
    cases_generated: int
    execution_time_seconds: float


class ReviewRequest(BaseModel):
    """Request to update case review status."""
    validation_status: str = Field(..., description="pending, corroborated, refuted, inconclusive")
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None


class EvidenceItem(BaseModel):
    """External evidence item to attach to a case."""
    source_url: str
    source_title: str
    source_type: str = Field(default="news", description="news, asf_audit, legal, investigative")
    summary: str
    date_published: Optional[str] = None
    credibility: str = Field(default="medium", description="high, medium, low")


class AddEvidenceRequest(BaseModel):
    """Request to add external evidence to a case."""
    evidence: List[EvidenceItem]
    update_status: Optional[str] = Field(None, description="Optionally update validation_status")


class PromoteRequest(BaseModel):
    """Request to promote a case to ground truth."""
    case_name: str = Field(..., description="Name for the ground truth case")
    case_type: str = Field(default="procurement_fraud", description="estafa_maestra, bribery, ghost_company, bid_rigging, embezzlement, procurement_fraud")
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    confidence_level: str = Field(default="medium", description="high, medium, low")
    notes: Optional[str] = None


class DashboardSummaryResponse(BaseModel):
    """Combined dashboard summary for investigation intelligence."""
    total_cases: int
    corroborated_cases: int
    pending_cases: int
    total_value_at_risk: float
    hit_rate: Dict[str, Any]
    top_corroborated: List[Dict[str, Any]]
    validation_funnel: Dict[str, int]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/cases", response_model=CaseListResponse)
async def list_cases(
    sector_id: Optional[int] = Query(None, description="Filter by sector ID"),
    case_type: Optional[str] = Query(None, description="Filter by case type"),
    min_score: Optional[float] = Query(None, ge=0, le=1, description="Minimum suspicion score"),
    validation_status: Optional[str] = Query(None, description="Filter by validation status"),
    priority: Optional[int] = Query(None, ge=1, le=5, description="Filter by priority"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List investigation cases with filtering and pagination.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Build WHERE clause
        where_clauses = []
        params = []

        if sector_id is not None:
            where_clauses.append("ic.primary_sector_id = ?")
            params.append(sector_id)

        if case_type:
            where_clauses.append("ic.case_type = ?")
            params.append(case_type)

        if min_score is not None:
            where_clauses.append("ic.suspicion_score >= ?")
            params.append(min_score)

        if validation_status:
            where_clauses.append("ic.validation_status = ?")
            params.append(validation_status)

        if priority is not None:
            where_clauses.append("ic.priority = ?")
            params.append(priority)

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM investigation_cases ic {where_sql}
        """, params)
        total = cursor.fetchone()[0]

        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page
        offset = (page - 1) * per_page

        # Get cases
        cursor.execute(f"""
            SELECT
                ic.id, ic.case_id, ic.case_type, ic.primary_sector_id,
                ic.suspicion_score, ic.anomaly_score, ic.confidence,
                ic.title, ic.total_contracts, ic.total_value_mxn,
                ic.estimated_loss_mxn, ic.date_range_start, ic.date_range_end,
                ic.signals_triggered, ic.priority, ic.is_reviewed,
                ic.validation_status,
                s.name_es as sector_name,
                (SELECT COUNT(*) FROM case_vendors cv WHERE cv.case_id = ic.id) as vendor_count
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            {where_sql}
            ORDER BY ic.suspicion_score DESC
            LIMIT ? OFFSET ?
        """, params + [per_page, offset])

        cases = []
        for row in cursor.fetchall():
            signals = json.loads(row['signals_triggered']) if row['signals_triggered'] else []
            cases.append(CaseListItem(
                id=row['id'],
                case_id=row['case_id'],
                case_type=row['case_type'],
                sector_id=row['primary_sector_id'],
                sector_name=row['sector_name'],
                suspicion_score=row['suspicion_score'],
                anomaly_score=row['anomaly_score'],
                confidence=row['confidence'],
                title=row['title'],
                total_contracts=row['total_contracts'],
                total_value_mxn=row['total_value_mxn'],
                estimated_loss_mxn=row['estimated_loss_mxn'],
                date_range_start=row['date_range_start'],
                date_range_end=row['date_range_end'],
                priority=row['priority'],
                is_reviewed=bool(row['is_reviewed']),
                validation_status=row['validation_status'],
                vendor_count=row['vendor_count'],
                signals_triggered=signals,
            ))

        return CaseListResponse(
            data=cases,
            pagination={
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
            }
        )


@router.get("/cases/{case_id}", response_model=CaseDetail)
async def get_case(case_id: str = Path(..., description="Case ID (e.g., CASE-SAL-2026-00001)")):
    """
    Get full case details including narrative, vendors, and questions.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get case
        cursor.execute("""
            SELECT
                ic.*, s.name_es as sector_name
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            WHERE ic.case_id = ?
        """, (case_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        # Get vendors
        cursor.execute("""
            SELECT cv.*, v.name, v.rfc
            FROM case_vendors cv
            JOIN vendors v ON cv.vendor_id = v.id
            WHERE cv.case_id = ?
            ORDER BY cv.contract_value_mxn DESC
        """, (row['id'],))
        vendors = [
            VendorSummary(
                vendor_id=v['vendor_id'],
                name=v['name'],
                rfc=v['rfc'],
                role=v['role'],
                contract_count=v['contract_count'],
                contract_value_mxn=v['contract_value_mxn'],
                avg_risk_score=v['avg_risk_score'],
            )
            for v in cursor.fetchall()
        ]

        # Get questions
        cursor.execute("""
            SELECT id, question_type, question_text, priority, supporting_evidence
            FROM case_questions
            WHERE case_id = ?
            ORDER BY priority DESC, id
        """, (row['id'],))
        questions = [
            QuestionSummary(
                id=q['id'],
                question_type=q['question_type'],
                question_text=q['question_text'],
                priority=q['priority'],
                supporting_evidence=json.loads(q['supporting_evidence']) if q['supporting_evidence'] else None,
            )
            for q in cursor.fetchall()
        ]

        # Parse JSON fields
        signals = json.loads(row['signals_triggered']) if row['signals_triggered'] else []
        risk_factors = json.loads(row['risk_factor_counts']) if row['risk_factor_counts'] else {}
        external_sources = json.loads(row['external_sources']) if row['external_sources'] else []

        return CaseDetail(
            id=row['id'],
            case_id=row['case_id'],
            case_type=row['case_type'],
            sector_id=row['primary_sector_id'],
            sector_name=row['sector_name'],
            suspicion_score=row['suspicion_score'],
            anomaly_score=row['anomaly_score'],
            confidence=row['confidence'],
            title=row['title'],
            summary=row['summary'],
            narrative=row['narrative'],
            total_contracts=row['total_contracts'],
            total_value_mxn=row['total_value_mxn'],
            estimated_loss_mxn=row['estimated_loss_mxn'],
            date_range_start=row['date_range_start'],
            date_range_end=row['date_range_end'],
            priority=row['priority'],
            is_reviewed=bool(row['is_reviewed']),
            validation_status=row['validation_status'],
            vendor_count=len(vendors),
            signals_triggered=signals,
            risk_factor_counts=risk_factors,
            vendors=vendors,
            questions=questions,
            external_sources=external_sources,
            generated_at=row['generated_at'],
        )


@router.get("/cases/{case_id}/export")
async def export_case(
    case_id: str = Path(..., description="Case ID"),
    format: str = Query("markdown", description="Export format: markdown or json"),
):
    """
    Export case dossier in specified format.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT narrative FROM investigation_cases WHERE case_id = ?
        """, (case_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        if format == "json":
            # Return full case as JSON
            case = await get_case(case_id)
            return case
        else:
            # Return markdown narrative
            return {
                "case_id": case_id,
                "format": "markdown",
                "content": row['narrative'] or "No narrative generated."
            }


@router.get("/stats", response_model=CaseStatsResponse)
async def get_stats():
    """
    Get summary statistics for all investigation cases.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Total stats
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(total_value_mxn) as total_value,
                SUM(estimated_loss_mxn) as total_loss,
                AVG(suspicion_score) as avg_score,
                SUM(CASE WHEN suspicion_score >= 0.6 THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN suspicion_score >= 0.4 AND suspicion_score < 0.6 THEN 1 ELSE 0 END) as high
            FROM investigation_cases
        """)
        stats = cursor.fetchone()

        # By sector
        cursor.execute("""
            SELECT s.code, COUNT(*) as cnt
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            GROUP BY ic.primary_sector_id
        """)
        by_sector = {row['code']: row['cnt'] for row in cursor.fetchall()}

        # By type
        cursor.execute("""
            SELECT case_type, COUNT(*) as cnt
            FROM investigation_cases
            GROUP BY case_type
        """)
        by_type = {row['case_type']: row['cnt'] for row in cursor.fetchall()}

        # By status
        cursor.execute("""
            SELECT validation_status, COUNT(*) as cnt
            FROM investigation_cases
            GROUP BY validation_status
        """)
        by_status = {row['validation_status']: row['cnt'] for row in cursor.fetchall()}

        return CaseStatsResponse(
            total_cases=stats['total'] or 0,
            by_sector=by_sector,
            by_type=by_type,
            by_status=by_status,
            total_value_mxn=stats['total_value'] or 0,
            total_estimated_loss_mxn=stats['total_loss'] or 0,
            avg_suspicion_score=stats['avg_score'] or 0,
            critical_cases=stats['critical'] or 0,
            high_cases=stats['high'] or 0,
        )


@router.put("/cases/{case_id}/review")
async def review_case(
    case_id: str = Path(..., description="Case ID"),
    request: ReviewRequest = ...,
):
    """
    Update case review status (for human validation).
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Validate status
        valid_statuses = ['pending', 'corroborated', 'refuted', 'inconclusive']
        if request.validation_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )

        cursor.execute("""
            UPDATE investigation_cases
            SET validation_status = ?,
                is_reviewed = 1,
                review_notes = ?,
                reviewed_by = ?,
                reviewed_at = ?
            WHERE case_id = ?
        """, (
            request.validation_status,
            request.review_notes,
            request.reviewed_by,
            datetime.now().isoformat(),
            case_id
        ))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        conn.commit()

        return {"success": True, "case_id": case_id, "status": request.validation_status}


@router.post("/run", response_model=RunAnalysisResponse)
async def run_analysis(request: RunAnalysisRequest):
    """
    Run the investigation case generator pipeline.

    Note: This is a long-running operation. For production use,
    consider running as a background task.
    """
    import sys
    import time
    sys.path.insert(0, str(FilePath(__file__).parent.parent.parent / "scripts"))

    start_time = time.time()

    try:
        from investigation_feature_extractor import extract_features
        from investigation_anomaly_detector import run_anomaly_detection
        from investigation_case_aggregator import generate_cases
        from investigation_dossier_generator import generate_dossiers

        # Run pipeline
        extract_features(request.sector_ids)
        run_anomaly_detection(request.sector_ids)
        cases_generated = generate_cases(request.sector_ids)
        generate_dossiers(request.sector_ids)

        elapsed = time.time() - start_time

        return RunAnalysisResponse(
            success=True,
            message=f"Successfully generated {cases_generated} investigation cases",
            cases_generated=cases_generated,
            execution_time_seconds=elapsed,
        )
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top/{n}")
async def get_top_cases(
    n: int = Path(..., ge=1, le=50, description="Number of cases to return"),
    sector_id: Optional[int] = Query(None, description="Filter by sector"),
):
    """
    Get top N most suspicious cases (shortcut endpoint).
    """
    with get_db() as conn:
        cursor = conn.cursor()

        where_sql = "WHERE ic.primary_sector_id = ?" if sector_id else ""
        params = [sector_id] if sector_id else []

        cursor.execute(f"""
            SELECT
                ic.case_id, ic.title, ic.case_type,
                s.code as sector, ic.suspicion_score,
                ic.total_contracts, ic.total_value_mxn,
                ic.estimated_loss_mxn
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            {where_sql}
            ORDER BY ic.suspicion_score DESC
            LIMIT ?
        """, params + [n])

        cases = []
        for row in cursor.fetchall():
            cases.append({
                "case_id": row['case_id'],
                "title": row['title'],
                "case_type": row['case_type'],
                "sector": row['sector'],
                "suspicion_score": row['suspicion_score'],
                "total_contracts": row['total_contracts'],
                "total_value_mxn": row['total_value_mxn'],
                "estimated_loss_mxn": row['estimated_loss_mxn'],
            })

        return {"data": cases, "count": len(cases)}


# =============================================================================
# DASHBOARD SUMMARY + EVIDENCE + PROMOTE ENDPOINTS
# =============================================================================

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary():
    """
    Combined endpoint for Dashboard's investigation intelligence section.
    Returns funnel, hit rate, top corroborated cases, and value at risk.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Total stats by status
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN validation_status = 'corroborated' THEN 1 ELSE 0 END) as corroborated,
                SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN validation_status = 'refuted' THEN 1 ELSE 0 END) as refuted,
                SUM(CASE WHEN is_reviewed = 1 THEN 1 ELSE 0 END) as researched,
                SUM(total_value_mxn) as total_value,
                SUM(CASE WHEN validation_status = 'corroborated' THEN total_value_mxn ELSE 0 END) as corroborated_value
            FROM investigation_cases
        """)
        stats = cursor.fetchone()

        total = stats['total'] or 0
        corroborated = stats['corroborated'] or 0
        pending = stats['pending'] or 0
        researched = stats['researched'] or 0

        # Top corroborated cases
        cursor.execute("""
            SELECT
                ic.case_id, ic.title, ic.suspicion_score,
                ic.total_value_mxn, ic.total_contracts,
                s.code as sector_code, s.name_es as sector_name,
                ic.news_hits, ic.review_notes
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            WHERE ic.validation_status = 'corroborated'
            ORDER BY ic.total_value_mxn DESC
            LIMIT 5
        """)
        top_corroborated = []
        for row in cursor.fetchall():
            news = []
            if row['news_hits']:
                try:
                    news = json.loads(row['news_hits'])
                except json.JSONDecodeError:
                    pass
            top_corroborated.append({
                "case_id": row['case_id'],
                "title": row['title'],
                "score": row['suspicion_score'],
                "value": row['total_value_mxn'],
                "contracts": row['total_contracts'],
                "sector_code": row['sector_code'],
                "sector_name": row['sector_name'],
                "news_summary": news[0]['summary'] if news else row['review_notes'],
            })

        # Count promoted to ground truth
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM ground_truth_cases
            WHERE notes LIKE '%promoted from investigation%'
        """)
        promoted = cursor.fetchone()['cnt'] or 0

        return DashboardSummaryResponse(
            total_cases=total,
            corroborated_cases=corroborated,
            pending_cases=pending,
            total_value_at_risk=stats['corroborated_value'] or 0,
            hit_rate={
                "checked": researched,
                "confirmed": corroborated,
                "rate": round(corroborated / max(researched, 1), 2),
            },
            top_corroborated=top_corroborated,
            validation_funnel={
                "detected": total,
                "researched": researched,
                "corroborated": corroborated,
                "promoted_to_gt": promoted,
            },
        )


@router.put("/cases/{case_id}/evidence")
async def add_evidence(
    case_id: str = Path(..., description="Case ID"),
    request: AddEvidenceRequest = ...,
):
    """
    Append external evidence (news articles, ASF audits, legal docs) to a case.
    Optionally updates validation_status.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get existing news_hits
        cursor.execute("""
            SELECT id, news_hits FROM investigation_cases WHERE case_id = ?
        """, (case_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        existing_hits = []
        if row['news_hits']:
            try:
                existing_hits = json.loads(row['news_hits'])
            except json.JSONDecodeError:
                existing_hits = []

        # Append new evidence
        for ev in request.evidence:
            existing_hits.append({
                "source_url": ev.source_url,
                "source_title": ev.source_title,
                "source_type": ev.source_type,
                "summary": ev.summary,
                "date_published": ev.date_published,
                "credibility": ev.credibility,
            })

        # Update case
        if request.update_status:
            valid_statuses = ['pending', 'corroborated', 'refuted', 'inconclusive']
            if request.update_status not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status: {request.update_status}")
            cursor.execute("""
                UPDATE investigation_cases
                SET news_hits = ?, validation_status = ?, is_reviewed = 1, reviewed_at = ?
                WHERE case_id = ?
            """, (json.dumps(existing_hits, ensure_ascii=False), request.update_status,
                  datetime.now().isoformat(), case_id))
        else:
            cursor.execute("""
                UPDATE investigation_cases
                SET news_hits = ?
                WHERE case_id = ?
            """, (json.dumps(existing_hits, ensure_ascii=False), case_id))

        conn.commit()

        return {
            "success": True,
            "case_id": case_id,
            "total_evidence": len(existing_hits),
            "status": request.update_status or "unchanged",
        }


@router.post("/cases/{case_id}/promote-to-ground-truth")
async def promote_to_ground_truth(
    case_id: str = Path(..., description="Case ID"),
    request: PromoteRequest = ...,
):
    """
    Promote a corroborated investigation case to ground_truth_cases + ground_truth_vendors.
    Creates the bridge for retraining the v4.0 risk model.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get case
        cursor.execute("""
            SELECT ic.*, s.code as sector_code
            FROM investigation_cases ic
            JOIN sectors s ON ic.primary_sector_id = s.id
            WHERE ic.case_id = ?
        """, (case_id,))
        case = cursor.fetchone()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        if case['validation_status'] != 'corroborated':
            raise HTTPException(
                status_code=400,
                detail=f"Only corroborated cases can be promoted. Current status: {case['validation_status']}"
            )

        # Check if already promoted
        cursor.execute("""
            SELECT id FROM ground_truth_cases WHERE notes LIKE ?
        """, (f"%investigation:{case_id}%",))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail=f"Case {case_id} already promoted to ground truth")

        # Create ground truth case
        gt_case_id = f"GT-INV-{case['primary_sector_id']:02d}-{case['id']:04d}"
        cursor.execute("""
            INSERT INTO ground_truth_cases (
                case_id, case_name, case_type,
                year_start, year_end,
                estimated_fraud_mxn,
                source_news, confidence_level, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            gt_case_id, request.case_name, request.case_type,
            request.year_start, request.year_end,
            case['estimated_loss_mxn'],
            case['news_hits'],
            request.confidence_level,
            f"Promoted from investigation:{case_id}. {request.notes or ''}".strip(),
        ))
        gt_db_id = cursor.lastrowid

        # Get case vendors and create ground truth vendor entries
        cursor.execute("""
            SELECT cv.vendor_id, v.name, v.rfc, cv.role
            FROM case_vendors cv
            JOIN vendors v ON cv.vendor_id = v.id
            WHERE cv.case_id = ?
        """, (case['id'],))

        vendors_promoted = 0
        for vendor in cursor.fetchall():
            cursor.execute("""
                INSERT INTO ground_truth_vendors (
                    case_id, vendor_id, vendor_name_source, rfc_source,
                    role, evidence_strength, match_method, match_confidence, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                gt_db_id, vendor['vendor_id'], vendor['name'], vendor['rfc'],
                vendor['role'] or 'beneficiary', request.confidence_level,
                'investigation_pipeline', 0.9,
                f"Promoted from {case_id}",
            ))
            vendors_promoted += 1

        conn.commit()

        return {
            "success": True,
            "investigation_case_id": case_id,
            "ground_truth_case_id": gt_case_id,
            "ground_truth_db_id": gt_db_id,
            "vendors_promoted": vendors_promoted,
            "message": f"Case promoted to ground truth. Retrain v4.0 to incorporate {vendors_promoted} vendors.",
        }


# =============================================================================
# ML EXPLAINABILITY ENDPOINTS
# =============================================================================

@router.get("/vendors/{vendor_id}/explanation", response_model=VendorExplanation)
async def get_vendor_explanation(
    vendor_id: int = Path(..., description="Vendor ID"),
    sector_id: int = Query(..., description="Sector ID for context"),
):
    """
    Get SHAP-based explanation for why a vendor was flagged as anomalous.

    Returns the top contributing features with their SHAP values and
    comparisons to sector averages.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Get vendor features and SHAP values
        cursor.execute("""
            SELECT
                vf.vendor_id, v.name as vendor_name, vf.sector_id,
                vf.ensemble_score, vf.shap_values, vf.top_features,
                vf.explanation
            FROM vendor_investigation_features vf
            JOIN vendors v ON vf.vendor_id = v.id
            WHERE vf.vendor_id = ? AND vf.sector_id = ?
        """, (vendor_id, sector_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No features found for vendor {vendor_id} in sector {sector_id}"
            )

        # Parse SHAP values
        shap_values = None
        if row['shap_values']:
            try:
                shap_values = json.loads(row['shap_values'])
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse SHAP values for vendor {row['vendor_id']}")

        # Parse top features
        top_features = []
        if row['top_features']:
            try:
                top_features_raw = json.loads(row['top_features'])
                for tf in top_features_raw:
                    top_features.append(FeatureContribution(
                        feature=tf.get('feature', ''),
                        contribution=tf.get('contribution', 0),
                        value=tf.get('value'),
                        sector_median=tf.get('sector_median'),
                        comparison=tf.get('comparison', '')
                    ))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse top features for vendor {row['vendor_id']}")

        # Determine risk level
        score = row['ensemble_score'] or 0
        risk_level = get_risk_level(score).upper()

        return VendorExplanation(
            vendor_id=row['vendor_id'],
            vendor_name=row['vendor_name'],
            sector_id=row['sector_id'],
            ensemble_score=row['ensemble_score'] or 0,
            risk_level=risk_level,
            top_contributing_features=top_features,
            explanation_text=row['explanation'],
            shap_values=shap_values
        )


@router.get("/feature-importance", response_model=List[FeatureImportanceItem])
async def get_feature_importance(
    sector_id: int = Query(..., description="Sector ID"),
    method: str = Query("shap", description="Method: 'shap', 'permutation', or 'variance'"),
    limit: int = Query(21, ge=1, le=50, description="Number of features to return"),
):
    """
    Get global feature importance for a sector.

    Shows which features contribute most to anomaly detection across all vendors.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT feature_name, importance, rank, method, calculated_at
            FROM feature_importance
            WHERE sector_id = ? AND method = ?
            ORDER BY rank
            LIMIT ?
        """, (sector_id, method, limit))

        results = [
            FeatureImportanceItem(
                feature=row['feature_name'],
                importance=row['importance'],
                rank=row['rank'],
                method=row['method'],
                calculated_at=row['calculated_at']
            )
            for row in cursor.fetchall()
        ]

        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"No feature importance found for sector {sector_id} with method {method}. Run investigation_feature_importance.py first."
            )

        return results


@router.get("/model-comparison", response_model=List[ModelComparisonItem])
async def get_model_comparison(
    sector_id: int = Query(..., description="Sector ID"),
):
    """
    Get model comparison results for a sector.

    Shows how different anomaly detection algorithms perform and their overlap
    with Isolation Forest (the primary model).
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT model_name, anomalies_detected, overlap_with_if,
                   avg_score, max_score, execution_time_seconds,
                   parameters, calculated_at
            FROM model_comparison
            WHERE sector_id = ?
            ORDER BY model_name
        """, (sector_id,))

        results = [
            ModelComparisonItem(
                model=row['model_name'],
                anomalies_detected=row['anomalies_detected'],
                overlap_with_if=row['overlap_with_if'],
                avg_score=row['avg_score'],
                max_score=row['max_score'],
                execution_time=row['execution_time_seconds'],
                parameters=json.loads(row['parameters']) if row['parameters'] else {},
                calculated_at=row['calculated_at']
            )
            for row in cursor.fetchall()
        ]

        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"No model comparison found for sector {sector_id}. Run investigation_model_comparison.py first."
            )

        return results


@router.get("/top-anomalous-vendors")
async def get_top_anomalous_vendors(
    sector_id: Optional[int] = Query(None, description="Filter by sector"),
    limit: int = Query(20, ge=1, le=100, description="Number of vendors to return"),
    include_explanation: bool = Query(True, description="Include SHAP explanations"),
):
    """
    Get top anomalous vendors with optional SHAP explanations.

    Returns vendors sorted by ensemble score with their top contributing features.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        where_sql = "WHERE vf.sector_id = ?" if sector_id else ""
        params = [sector_id] if sector_id else []

        cursor.execute(f"""
            SELECT
                vf.vendor_id, v.name as vendor_name, vf.sector_id,
                s.code as sector_code, s.name_es as sector_name,
                vf.ensemble_score, vf.isolation_forest_score,
                vf.total_contracts, vf.total_value_mxn,
                vf.single_bid_ratio, vf.direct_award_ratio,
                vf.high_conf_hypothesis_count,
                vf.top_features, vf.explanation
            FROM vendor_investigation_features vf
            JOIN vendors v ON vf.vendor_id = v.id
            JOIN sectors s ON vf.sector_id = s.id
            {where_sql}
            ORDER BY vf.ensemble_score DESC
            LIMIT ?
        """, params + [limit])

        vendors = []
        for row in cursor.fetchall():
            vendor_data = {
                "vendor_id": row['vendor_id'],
                "vendor_name": row['vendor_name'],
                "sector_id": row['sector_id'],
                "sector_code": row['sector_code'],
                "sector_name": row['sector_name'],
                "ensemble_score": row['ensemble_score'],
                "isolation_forest_score": row['isolation_forest_score'],
                "total_contracts": row['total_contracts'],
                "total_value_mxn": row['total_value_mxn'],
                "single_bid_ratio": row['single_bid_ratio'],
                "direct_award_ratio": row['direct_award_ratio'],
                "price_anomalies": row['high_conf_hypothesis_count'],
            }

            if include_explanation and row['top_features']:
                try:
                    top_features = json.loads(row['top_features'])
                    vendor_data["top_features"] = top_features[:3]  # Top 3 only
                    vendor_data["explanation"] = row['explanation']
                except json.JSONDecodeError:
                    vendor_data["top_features"] = []
                    vendor_data["explanation"] = None
            else:
                vendor_data["top_features"] = None
                vendor_data["explanation"] = None

            vendors.append(vendor_data)

        return {"data": vendors, "count": len(vendors)}
