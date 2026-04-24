"""
ARIA — Automated Risk Investigation Agent

REST API router for the ARIA pipeline: investigation queue, ground truth updates,
run management, and review workflow.
"""
import json
import logging
import math
import sqlite3
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel

from ..cache import app_cache
from ..dependencies import get_db_dep, require_write_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/aria", tags=["aria"])

_STATS_CACHE_KEY = "aria_stats"

# ---------------------------------------------------------------------------
# In-memory run status tracker (lightweight, no DB needed)
# ---------------------------------------------------------------------------

_run_lock = threading.Lock()
_run_status: dict = {
    "running": False,
    "phase": None,       # "pipeline" | "memos_tier1" | "memos_tier2" | None
    "started_at": None,
    "completed_at": None,
    "error": None,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_REVIEW_STATUSES = {"pending", "confirmed", "dismissed", "reviewing"}
_VALID_GT_REVIEW_STATUSES = {"approved", "rejected"}


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    return row is not None


def _decode_json_field(value) -> Optional[dict]:
    """Safely decode a JSON string column. Returns None on failure."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception as e:
        logger.warning(f"Failed to decode JSON field: {e}")
        return None


def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def _bool_fields(d: dict, *fields: str) -> dict:
    """Convert SQLite integer (0/1) columns to Python booleans in-place."""
    for f in fields:
        if f in d and d[f] is not None:
            d[f] = bool(d[f])
    return d


# ---------------------------------------------------------------------------
# GET /aria/queue
# ---------------------------------------------------------------------------

@router.get("/queue")
def get_aria_queue(
    tier: Optional[int] = Query(None, ge=1, le=4),
    pattern: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    efos_only: bool = Query(False),
    new_vendor_only: bool = Query(False),
    novel_only: bool = Query(False, description="When True, exclude vendors already in ground truth"),
    min_ips: Optional[float] = Query(None, ge=0, le=1),
    status: Optional[str] = Query(None),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Scope to a specific sector (1-12)"),
    min_years_active: Optional[int] = Query(None, ge=0, le=30, description="Minimum vendor years active"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """List the ARIA investigation queue with filters and pagination."""
    empty_pagination = {
        "page": page,
        "per_page": per_page,
        "total": 0,
        "total_pages": 0,
    }

    if not _table_exists(conn, "aria_queue"):
        return {
            "data": [],
            "message": "ARIA pipeline has not been run yet.",
            "pagination": empty_pagination,
            "run_summary": None,
        }

    # Build WHERE clause
    conditions = []
    params: list = []

    if tier is not None:
        conditions.append("q.ips_tier = ?")
        params.append(tier)
    if pattern is not None:
        conditions.append("q.primary_pattern = ?")
        params.append(pattern)
    if search is not None:
        conditions.append("q.vendor_name LIKE ?")
        params.append(f"%{search}%")
    if efos_only:
        conditions.append("q.is_efos_definitivo = 1")
    if new_vendor_only:
        conditions.append("q.new_vendor_risk = 1")
    if novel_only:
        conditions.append("q.in_ground_truth = 0")
    if min_ips is not None:
        conditions.append("q.ips_final >= ?")
        params.append(min_ips)
    if status is not None:
        conditions.append("q.review_status = ?")
        params.append(status)
    if sector_id is not None:
        # aria_queue.primary_sector_id is denormalized from vendor activity.
        # Resolves the compliance-officer journey (previously 3/10, no sector scoping).
        conditions.append("q.primary_sector_id = ?")
        params.append(sector_id)
    if min_years_active is not None:
        conditions.append("q.years_active >= ?")
        params.append(min_years_active)

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # Total count
    total = conn.execute(
        f"SELECT COUNT(*) FROM aria_queue q {where_sql}", params
    ).fetchone()[0]

    total_pages = math.ceil(total / per_page) if total > 0 else 0
    offset = (page - 1) * per_page

    rows = conn.execute(
        f"""
        SELECT q.vendor_id, q.vendor_name, q.ips_final, q.ips_raw, q.ips_tier,
               q.primary_pattern, q.pattern_confidence, q.pattern_confidences,
               q.total_contracts, q.total_value_mxn, q.avg_risk_score,
               q.is_efos_definitivo, q.is_sfp_sanctioned, q.in_ground_truth,
               q.fp_penalty, q.fp_patent_exception, q.fp_data_error,
               q.fp_structural_monopoly, q.burst_score,
               COALESCE(q.review_status, 'pending') as review_status,
               q.primary_sector_name, q.primary_sector_id, q.years_active,
               q.direct_award_rate, q.computed_at,
               COALESCE(q.new_vendor_risk, 0) as new_vendor_risk,
               q.risk_score_norm, q.ensemble_norm, q.financial_scale_norm,
               q.external_flags_score, q.is_disappeared,
               q.top_institution, q.top_institution_ratio, q.value_per_contract
        FROM aria_queue q
        {where_sql}
        ORDER BY q.ips_final DESC
        LIMIT ? OFFSET ?
        """,
        params + [per_page, offset],
    ).fetchall()

    data = []
    for row in rows:
        d = _row_to_dict(row)
        _bool_fields(
            d, "is_efos_definitivo", "is_sfp_sanctioned", "in_ground_truth",
            "new_vendor_risk", "fp_patent_exception", "fp_data_error",
            "fp_structural_monopoly", "is_disappeared",
        )
        d["pattern_confidences"] = _decode_json_field(d.get("pattern_confidences"))
        # Compute value_per_contract on the fly when not stored
        if not d.get("value_per_contract") and d.get("total_contracts") and d.get("total_value_mxn"):
            d["value_per_contract"] = d["total_value_mxn"] / d["total_contracts"]
        data.append(d)

    # Latest run summary
    run_summary = None
    if _table_exists(conn, "aria_runs"):
        run_row = conn.execute(
            """
            SELECT id, started_at, completed_at, status, vendors_processed,
                   tier1_count, tier2_count, tier3_count, tier4_count,
                   gt_auto_inserts, gt_flags, error_message, aria_version
            FROM aria_runs
            ORDER BY started_at DESC
            LIMIT 1
            """
        ).fetchone()
        if run_row:
            run_summary = _row_to_dict(run_row)

    # Novel-leads summary (cached 60s — these aggregate 318K rows on every page load)
    summary: dict = app_cache.get(_STATS_CACHE_KEY, "tier_summary") or {}
    if not summary:
        summary = {
            "total_t1": 0,
            "novel_leads_t1": 0,
            "known_gt_t1": 0,
            "novel_leads_t2": 0,
        }
        try:
            t1_row = conn.execute(
                "SELECT COUNT(*), SUM(CASE WHEN in_ground_truth = 1 THEN 1 ELSE 0 END) "
                "FROM aria_queue WHERE ips_tier = 1"
            ).fetchone()
            if t1_row:
                t1_total = t1_row[0] or 0
                t1_gt = t1_row[1] or 0
                summary["total_t1"] = t1_total
                summary["known_gt_t1"] = t1_gt
                summary["novel_leads_t1"] = t1_total - t1_gt
            t2_row = conn.execute(
                "SELECT COUNT(*) - SUM(CASE WHEN in_ground_truth = 1 THEN 1 ELSE 0 END) "
                "FROM aria_queue WHERE ips_tier = 2"
            ).fetchone()
            if t2_row:
                summary["novel_leads_t2"] = t2_row[0] or 0
            app_cache.set(_STATS_CACHE_KEY, "tier_summary", summary, maxsize=16, ttl=60)
        except Exception as e:
            logger.warning(f"Failed to compute ARIA summary stats (novel_leads): {e}")

    return {
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
        "run_summary": run_summary,
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# GET /aria/queue/{vendor_id}
# ---------------------------------------------------------------------------

@router.get("/queue/{vendor_id}")
def get_aria_queue_vendor(
    vendor_id: int,
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Full ARIA detail for a single vendor."""
    if not _table_exists(conn, "aria_queue"):
        raise HTTPException(status_code=404, detail="ARIA pipeline has not been run yet.")

    row = conn.execute(
        """
        SELECT q.*,
               vs.new_vendor_risk_score,
               vs.new_vendor_risk_triggers
        FROM aria_queue q
        LEFT JOIN vendor_stats vs ON q.vendor_id = vs.vendor_id
        WHERE q.vendor_id = ?
        """,
        (vendor_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found in ARIA queue.")

    d = _row_to_dict(row)
    _bool_fields(
        d,
        "is_efos_definitivo",
        "is_sfp_sanctioned",
        "in_ground_truth",
        "is_disappeared",
        "fp_patent_exception",
        "fp_data_error",
        "fp_structural_monopoly",
        "new_vendor_risk",
    )
    # Decode JSON text column
    d["pattern_confidences"] = _decode_json_field(d.get("pattern_confidences"))

    # Include memo if available
    d["memo"] = None
    if _table_exists(conn, "aria_memos"):
        memo_row = conn.execute(
            "SELECT memo_text, memo_type, created_at FROM aria_memos WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 1",
            (vendor_id,),
        ).fetchone()
        if memo_row:
            d["memo"] = {
                "memo_text": memo_row["memo_text"],
                "memo_type": memo_row["memo_type"],
                "created_at": memo_row["created_at"],
            }

    return d


# ---------------------------------------------------------------------------
# PATCH /aria/queue/{vendor_id}/review
# ---------------------------------------------------------------------------

class ReviewUpdate(BaseModel):
    status: str
    reviewer_name: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/queue/{vendor_id}/review")
def patch_aria_review(
    vendor_id: int,
    body: ReviewUpdate,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_write_key),
):
    """Update the review status for a vendor in the ARIA queue."""
    if body.status not in _VALID_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {sorted(_VALID_REVIEW_STATUSES)}",
        )

    if not _table_exists(conn, "aria_queue"):
        raise HTTPException(status_code=404, detail="ARIA pipeline has not been run yet.")

    existing = conn.execute(
        "SELECT vendor_id FROM aria_queue WHERE vendor_id = ?", (vendor_id,)
    ).fetchone()
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found in ARIA queue.")

    conn.execute(
        """
        UPDATE aria_queue
        SET review_status = ?,
            reviewer_name = COALESCE(?, reviewer_name),
            reviewer_notes = COALESCE(?, reviewer_notes),
            reviewed_at = CURRENT_TIMESTAMP
        WHERE vendor_id = ?
        """,
        (body.status, body.reviewer_name, body.notes, vendor_id),
    )
    conn.commit()

    row = conn.execute("SELECT * FROM aria_queue WHERE vendor_id = ?", (vendor_id,)).fetchone()
    d = _row_to_dict(row)
    _bool_fields(
        d,
        "is_efos_definitivo",
        "is_sfp_sanctioned",
        "in_ground_truth",
        "is_disappeared",
        "fp_patent_exception",
        "fp_data_error",
        "fp_structural_monopoly",
    )
    d["pattern_confidences"] = _decode_json_field(d.get("pattern_confidences"))
    return d


# ---------------------------------------------------------------------------
# POST /aria/queue/{vendor_id}/promote-gt
# ---------------------------------------------------------------------------

class PromoteGTRequest(BaseModel):
    case_name: Optional[str] = None
    case_type: str = "procurement_fraud"
    confidence_level: str = "medium"
    notes: Optional[str] = None
    reviewer_name: Optional[str] = None


@router.post("/queue/{vendor_id}/promote-gt")
def promote_to_ground_truth(
    vendor_id: int,
    body: PromoteGTRequest,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_write_key),
):
    """Promote a confirmed ARIA lead to the ground truth corpus."""
    if not _table_exists(conn, "aria_queue"):
        raise HTTPException(status_code=404, detail="ARIA pipeline has not been run yet.")

    vendor_row = conn.execute(
        "SELECT vendor_id, vendor_name, in_ground_truth FROM aria_queue WHERE vendor_id = ?",
        (vendor_id,),
    ).fetchone()
    if vendor_row is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found in ARIA queue.")

    if vendor_row["in_ground_truth"]:
        raise HTTPException(status_code=409, detail="Vendor is already in ground truth.")

    vendor_name = vendor_row["vendor_name"] or f"vendor_{vendor_id}"
    case_name = body.case_name or f"ARIA-Confirmed: {vendor_name}"

    # Find next available case id
    max_id_row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    next_id = (max_id_row[0] or 0) + 1
    case_id_str = f"CASE-{next_id}"

    conn.execute(
        """
        INSERT INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (next_id, case_id_str, case_name, body.case_type, body.confidence_level, body.notes),
    )
    conn.execute(
        """
        INSERT INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
        """,
        (case_id_str, vendor_id, vendor_name, body.confidence_level, "aria_confirmed"),
    )
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed' WHERE vendor_id = ?",
        (vendor_id,),
    )
    if body.reviewer_name:
        conn.execute(
            "UPDATE aria_queue SET reviewer_name = ?, reviewed_at = CURRENT_TIMESTAMP WHERE vendor_id = ?",
            (body.reviewer_name, vendor_id),
        )
    conn.commit()
    app_cache.invalidate("aria", _STATS_CACHE_KEY)

    return {
        "vendor_id": vendor_id,
        "case_id": case_id_str,
        "case_name": case_name,
        "message": f"Vendor {vendor_id} promoted to ground truth as {case_id_str}",
    }


# ---------------------------------------------------------------------------
# GET /aria/stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_aria_stats(conn: sqlite3.Connection = Depends(get_db_dep)):
    """Latest ARIA run summary and queue review statistics."""
    cached = app_cache.get("aria", _STATS_CACHE_KEY)
    if cached is not None:
        return cached

    latest_run = None
    if _table_exists(conn, "aria_runs"):
        run_row = conn.execute(
            """
            SELECT id, started_at, completed_at, status, vendors_processed,
                   tier1_count, tier2_count, tier3_count, tier4_count,
                   gt_auto_inserts, gt_flags, error_message, aria_version
            FROM aria_runs
            ORDER BY started_at DESC
            LIMIT 1
            """
        ).fetchone()
        if run_row:
            latest_run = _row_to_dict(run_row)

    review_stats = {"pending": 0, "confirmed": 0, "dismissed": 0, "reviewing": 0}
    queue_total = 0
    new_vendor_count = 0
    reviewed_count = 0
    confirmed_count = 0
    dismissed_count = 0
    t1_reviewed_count = 0
    pattern_counts: dict = {}
    external_counts: dict = {"efos": 0, "sfp": 0}
    elevated_value = 0.0

    if _table_exists(conn, "aria_queue"):
        # Single consolidated aggregation — replaces 10 sequential full-table scans
        try:
            agg = conn.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN new_vendor_risk = 1 THEN 1 ELSE 0 END) AS new_vendor_count,
                    SUM(CASE WHEN review_status NOT IN ('pending') AND review_status IS NOT NULL
                             THEN 1 ELSE 0 END) AS reviewed_count,
                    SUM(CASE WHEN review_status = 'pending' OR review_status IS NULL
                             THEN 1 ELSE 0 END) AS pending_count,
                    SUM(CASE WHEN review_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
                    SUM(CASE WHEN review_status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed_count,
                    SUM(CASE WHEN review_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing_count,
                    SUM(CASE WHEN ips_tier = 1
                             AND review_status NOT IN ('pending') AND review_status IS NOT NULL
                             THEN 1 ELSE 0 END) AS t1_reviewed_count,
                    SUM(CASE WHEN is_efos_definitivo = 1 THEN 1 ELSE 0 END) AS efos_count,
                    SUM(CASE WHEN is_sfp_sanctioned = 1 THEN 1 ELSE 0 END) AS sfp_count,
                    SUM(CASE WHEN ips_tier IN (1, 2) THEN COALESCE(total_value_mxn, 0) ELSE 0 END)
                        AS elevated_value
                FROM aria_queue
                """
            ).fetchone()
            if agg:
                queue_total = agg["total"] or 0
                new_vendor_count = agg["new_vendor_count"] or 0
                reviewed_count = agg["reviewed_count"] or 0
                confirmed_count = agg["confirmed_count"] or 0
                dismissed_count = agg["dismissed_count"] or 0
                t1_reviewed_count = agg["t1_reviewed_count"] or 0
                elevated_value = float(agg["elevated_value"] or 0)
                review_stats = {
                    "pending": agg["pending_count"] or 0,
                    "confirmed": confirmed_count,
                    "dismissed": dismissed_count,
                    "reviewing": agg["reviewing_count"] or 0,
                }
                external_counts = {
                    "efos": agg["efos_count"] or 0,
                    "sfp": agg["sfp_count"] or 0,
                }
        except Exception:
            pass

        # Pattern breakdown — separate GROUP BY, still one query
        try:
            pattern_rows = conn.execute(
                """
                SELECT primary_pattern, COUNT(*) AS cnt
                FROM aria_queue
                WHERE primary_pattern IS NOT NULL
                GROUP BY primary_pattern
                ORDER BY cnt DESC
                """
            ).fetchall()
            for pr in pattern_rows:
                if pr["primary_pattern"]:
                    pattern_counts[pr["primary_pattern"]] = pr["cnt"]
        except Exception:
            pass

    result = {
        "latest_run": latest_run,
        "review_stats": review_stats,
        "queue_total": queue_total,
        "new_vendor_count": new_vendor_count,
        "pattern_counts": pattern_counts,
        "external_counts": external_counts,
        "elevated_value_mxn": elevated_value,
        "reviewed_count": reviewed_count,
        "confirmed_count": confirmed_count,
        "dismissed_count": dismissed_count,
        "t1_reviewed_count": t1_reviewed_count,
    }
    app_cache.set("aria", _STATS_CACHE_KEY, result, maxsize=4, ttl=300)
    return result


# ---------------------------------------------------------------------------
# GET /aria/gt-updates
# ---------------------------------------------------------------------------

@router.get("/gt-updates")
def get_gt_updates(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Paginated list of ARIA ground truth update proposals."""
    empty_pagination = {
        "page": page,
        "per_page": per_page,
        "total": 0,
        "total_pages": 0,
    }

    if not _table_exists(conn, "aria_gt_updates"):
        return {
            "data": [],
            "pagination": empty_pagination,
        }

    conditions = []
    params: list = []

    if status is not None:
        conditions.append("review_status = ?")
        params.append(status)
    if source is not None:
        conditions.append("source = ?")
        params.append(source)

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = conn.execute(
        f"SELECT COUNT(*) FROM aria_gt_updates {where_sql}", params
    ).fetchone()[0]

    total_pages = math.ceil(total / per_page) if total > 0 else 0
    offset = (page - 1) * per_page

    rows = conn.execute(
        f"""
        SELECT id, vendor_id, vendor_name, action, confidence_level,
               match_confidence, source, evidence_detail, review_status,
               reviewed_by, review_notes, aria_run_id, created_at
        FROM aria_gt_updates
        {where_sql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        params + [per_page, offset],
    ).fetchall()

    data = []
    for row in rows:
        d = _row_to_dict(row)
        d["evidence_detail"] = _decode_json_field(d.get("evidence_detail"))
        data.append(d)

    return {
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ---------------------------------------------------------------------------
# PATCH /aria/gt-updates/{id}/review
# ---------------------------------------------------------------------------

class GTUpdateReview(BaseModel):
    status: str  # approved / rejected
    reviewer_name: Optional[str] = None
    review_notes: Optional[str] = None


@router.patch("/gt-updates/{update_id}/review")
def patch_gt_update_review(
    update_id: int,
    body: GTUpdateReview,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_write_key),
):
    """Approve or reject an ARIA ground truth update proposal."""
    if body.status not in _VALID_GT_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {sorted(_VALID_GT_REVIEW_STATUSES)}",
        )

    if not _table_exists(conn, "aria_gt_updates"):
        raise HTTPException(status_code=404, detail="ARIA pipeline has not been run yet.")

    existing = conn.execute(
        "SELECT id FROM aria_gt_updates WHERE id = ?", (update_id,)
    ).fetchone()
    if existing is None:
        raise HTTPException(status_code=404, detail=f"GT update {update_id} not found.")

    conn.execute(
        """
        UPDATE aria_gt_updates
        SET review_status = ?,
            reviewed_by = COALESCE(?, reviewed_by),
            review_notes = COALESCE(?, review_notes)
        WHERE id = ?
        """,
        (body.status, body.reviewer_name, body.review_notes, update_id),
    )
    conn.commit()

    row = conn.execute("SELECT * FROM aria_gt_updates WHERE id = ?", (update_id,)).fetchone()
    d = _row_to_dict(row)
    d["evidence_detail"] = _decode_json_field(d.get("evidence_detail"))
    return d


# ---------------------------------------------------------------------------
# POST /aria/run
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    dry_run: bool = False
    limit: Optional[int] = None
    generate_memos: bool = True
    memo_tier1_limit: int = 20
    memo_tier2_limit: int = 30


def _run_subprocess(cmd: list, cwd: str) -> subprocess.CompletedProcess:
    """Run a subprocess and return its result."""
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=3600)


def _launch_full_pipeline(
    pipeline_cmd: list,
    cwd: str,
    generate_memos: bool,
    memo_tier1_limit: int,
    memo_tier2_limit: int,
) -> None:
    """Background task: run ARIA pipeline, then optionally generate memos for T1/T2."""
    global _run_status
    with _run_lock:
        _run_status = {
            "running": True,
            "phase": "pipeline",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "error": None,
        }

    try:
        # Phase 1: ARIA pipeline
        result = _run_subprocess(pipeline_cmd, cwd)
        if result.returncode != 0:
            stderr_tail = (result.stderr or "")[-500:]
            logger.error("aria_pipeline_failed rc=%d: %s", result.returncode, stderr_tail)
            with _run_lock:
                _run_status["error"] = f"Pipeline failed (rc={result.returncode})"
                _run_status["running"] = False
                _run_status["completed_at"] = datetime.now(timezone.utc).isoformat()
            return

        # Phase 2: Generate memos for Tier 1
        if generate_memos:
            with _run_lock:
                _run_status["phase"] = "memos_tier1"

            memo_cmd_t1 = [
                sys.executable, "-m", "scripts.aria_generate_memos",
                "--tier", "1", "--limit", str(memo_tier1_limit),
            ]
            result_t1 = _run_subprocess(memo_cmd_t1, cwd)
            if result_t1.returncode != 0:
                stderr_tail = (result_t1.stderr or "")[-500:]
                logger.warning("aria_memos_tier1_failed rc=%d: %s", result_t1.returncode, stderr_tail)

            # Phase 3: Generate memos for Tier 2
            with _run_lock:
                _run_status["phase"] = "memos_tier2"

            memo_cmd_t2 = [
                sys.executable, "-m", "scripts.aria_generate_memos",
                "--tier", "2", "--limit", str(memo_tier2_limit),
            ]
            result_t2 = _run_subprocess(memo_cmd_t2, cwd)
            if result_t2.returncode != 0:
                stderr_tail = (result_t2.stderr or "")[-500:]
                logger.warning("aria_memos_tier2_failed rc=%d: %s", result_t2.returncode, stderr_tail)

    except subprocess.TimeoutExpired:
        logger.error("aria_pipeline_timeout after 3600s")
        with _run_lock:
            _run_status["error"] = "Pipeline timed out after 3600s"
    except Exception as exc:
        logger.error("aria_pipeline_subprocess_failed: %s", str(exc))
        with _run_lock:
            _run_status["error"] = str(exc)
    finally:
        with _run_lock:
            _run_status["running"] = False
            _run_status["phase"] = None
            _run_status["completed_at"] = datetime.now(timezone.utc).isoformat()
        app_cache.invalidate("aria", _STATS_CACHE_KEY)  # invalidate after run


@router.post("/run", status_code=202)
def trigger_aria_run(
    request: RunRequest,
    background_tasks: BackgroundTasks,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_write_key),
):
    """Launch the ARIA pipeline + memo generation as a background subprocess."""
    # Check DB-level run lock
    if _table_exists(conn, "aria_runs"):
        running = conn.execute(
            "SELECT id FROM aria_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1"
        ).fetchone()
        if running:
            raise HTTPException(
                status_code=409,
                detail=f"Run {running['id']} is already in progress.",
            )

    # Check in-memory run lock
    with _run_lock:
        if _run_status["running"]:
            raise HTTPException(
                status_code=409,
                detail="A pipeline run is already in progress.",
            )

    run_id = str(uuid.uuid4())[:8]

    cmd = [sys.executable, "-m", "scripts.aria_pipeline"]
    if request.dry_run:
        cmd.append("--dry-run")
    if request.limit is not None:
        cmd.extend(["--limit", str(request.limit)])

    backend_dir = str(Path(__file__).parent.parent.parent)
    background_tasks.add_task(
        _launch_full_pipeline,
        cmd,
        backend_dir,
        request.generate_memos and not request.dry_run,
        request.memo_tier1_limit,
        request.memo_tier2_limit,
    )

    return {
        "run_id": run_id,
        "status": "queued",
        "message": "ARIA pipeline started in background. Memos will generate after pipeline completes.",
    }


# ---------------------------------------------------------------------------
# GET /aria/run-status
# ---------------------------------------------------------------------------

@router.get("/run-status")
def get_aria_run_status():
    """Check if an ARIA pipeline run is currently in progress."""
    with _run_lock:
        return dict(_run_status)


# ---------------------------------------------------------------------------
# GET /aria/memos/{vendor_id}
# ---------------------------------------------------------------------------

class AriaMemoResponse(BaseModel):
    vendor_id: int
    vendor_name: Optional[str] = None
    memo_text: str
    memo_type: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[str] = None
    case_id: Optional[str] = None


class AriaMemoListItem(BaseModel):
    vendor_id: int
    vendor_name: Optional[str] = None
    memo_type: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[str] = None
    case_id: Optional[str] = None
    memo_text: str
    ips_tier: Optional[int] = None


class AriaMemoListResponse(BaseModel):
    data: list
    pagination: dict


@router.get("/memos/{vendor_id}", response_model=AriaMemoResponse)
def get_aria_memo(
    vendor_id: int,
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Get the ARIA investigation memo for a specific vendor."""
    if not _table_exists(conn, "aria_memos"):
        raise HTTPException(status_code=404, detail="No ARIA memos have been generated yet.")

    row = conn.execute(
        """
        SELECT m.vendor_id, m.memo_text, m.memo_type, m.generated_by,
               m.created_at, m.case_id,
               COALESCE(q.vendor_name, v.name) AS vendor_name
        FROM aria_memos m
        LEFT JOIN aria_queue q ON m.vendor_id = q.vendor_id
        LEFT JOIN vendors v ON m.vendor_id = v.id
        WHERE m.vendor_id = ?
        ORDER BY m.created_at DESC
        LIMIT 1
        """,
        (vendor_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No memo found for vendor {vendor_id}.")

    d = _row_to_dict(row)
    return AriaMemoResponse(**d)


@router.get("/memos", response_model=AriaMemoListResponse)
def list_aria_memos(
    tier: Optional[int] = Query(None, ge=1, le=2, description="Filter by ARIA tier (1 or 2)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """List ARIA investigation memos with pagination, optionally filtered by tier."""
    if not _table_exists(conn, "aria_memos"):
        return AriaMemoListResponse(
            data=[],
            pagination={"limit": limit, "offset": offset, "total": 0},
        )

    conditions = []
    params: list = []

    if tier is not None:
        if not _table_exists(conn, "aria_queue"):
            return AriaMemoListResponse(
                data=[],
                pagination={"limit": limit, "offset": offset, "total": 0},
            )
        conditions.append("q.ips_tier = ?")
        params.append(tier)

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # Join with aria_queue for tier info and vendor name
    join_sql = "LEFT JOIN aria_queue q ON m.vendor_id = q.vendor_id"
    vendor_join = "LEFT JOIN vendors v ON m.vendor_id = v.id"

    total = conn.execute(
        f"SELECT COUNT(*) FROM aria_memos m {join_sql} {where_sql}",
        params,
    ).fetchone()[0]

    rows = conn.execute(
        f"""
        SELECT m.vendor_id, m.memo_text, m.memo_type, m.generated_by,
               m.created_at, m.case_id,
               COALESCE(q.vendor_name, v.name) AS vendor_name,
               q.ips_tier
        FROM aria_memos m
        {join_sql}
        {vendor_join}
        {where_sql}
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    ).fetchall()

    data = [_row_to_dict(r) for r in rows]

    return AriaMemoListResponse(
        data=data,
        pagination={"limit": limit, "offset": offset, "total": total},
    )


# ---------------------------------------------------------------------------
# GET /aria/ghost-suspects
# Ranked investigation queue from ghost_confidence_scores table.
# ---------------------------------------------------------------------------

@router.get("/ghost-suspects")
def get_ghost_suspects(
    tier: Optional[str] = Query(None, description="confirmed | multi_signal | behavioral"),
    min_signals: int = Query(0, ge=0),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Ghost company confidence queue for ARIA P2 vendors.

    Returns vendors ranked by ghost_confidence_score DESC with tier breakdown.
    Signals are independent — each adds evidence without double-counting.
    """
    # Check table exists
    exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ghost_confidence_scores'"
    ).fetchone()
    if not exists:
        raise HTTPException(
            status_code=503,
            detail="Ghost confidence scores not yet computed. Run: python -m scripts.compute_ghost_confidence",
        )

    conditions = ["1=1"]
    params: list = []
    if tier:
        conditions.append("ghost_confidence_tier = ?")
        params.append(tier)
    if min_signals > 0:
        conditions.append("ghost_signal_count >= ?")
        params.append(min_signals)

    where = " AND ".join(conditions)

    total = conn.execute(
        f"SELECT COUNT(*) FROM ghost_confidence_scores WHERE {where}", params
    ).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(
        f"""
        SELECT
            vendor_id, vendor_name,
            ghost_signal_count, ghost_confidence_score, ghost_confidence_tier,
            sig_efos_definitivo, sig_efos_soft, sig_sfp_sanctioned,
            sig_disappeared, sig_p7_intersection, sig_invalid_rfc,
            sig_young_company, sig_high_risk, sig_ultra_micro,
            sig_short_lived, sig_temporal_burst,
            total_contracts, total_value_mxn, years_active,
            avg_risk_score, primary_sector_name, top_institution,
            shell_flags, efos_stage
        FROM ghost_confidence_scores
        WHERE {where}
        ORDER BY ghost_confidence_score DESC, ghost_signal_count DESC
        LIMIT ? OFFSET ?
        """,
        params + [per_page, offset],
    ).fetchall()

    data = []
    for r in rows:
        d = dict(r)
        # Parse shell_flags JSON if present
        if d.get("shell_flags"):
            try:
                d["shell_flags"] = json.loads(d["shell_flags"])
            except (json.JSONDecodeError, TypeError):
                d["shell_flags"] = []
        else:
            d["shell_flags"] = []
        data.append(d)

    # Tier summary stats
    tier_counts = {}
    for t in ("confirmed", "multi_signal", "behavioral"):
        n = conn.execute(
            "SELECT COUNT(*) FROM ghost_confidence_scores WHERE ghost_confidence_tier = ?", (t,)
        ).fetchone()[0]
        tier_counts[t] = n

    return {
        "data": data,
        "tier_summary": tier_counts,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": math.ceil(total / per_page),
        },
    }
