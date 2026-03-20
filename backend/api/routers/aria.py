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
from ..dependencies import get_db_dep

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
    except Exception:
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
    min_ips: Optional[float] = Query(None, ge=0, le=1),
    status: Optional[str] = Query(None),
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
    if min_ips is not None:
        conditions.append("q.ips_final >= ?")
        params.append(min_ips)
    if status is not None:
        conditions.append("q.review_status = ?")
        params.append(status)

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
               q.primary_pattern, q.pattern_confidence, q.total_contracts,
               q.total_value_mxn, q.avg_risk_score, q.is_efos_definitivo,
               q.is_sfp_sanctioned, q.in_ground_truth, q.fp_penalty,
               q.burst_score, COALESCE(q.review_status, 'pending') as review_status, q.primary_sector_name,
               q.primary_sector_id, q.years_active, q.direct_award_rate,
               q.computed_at, COALESCE(q.new_vendor_risk, 0) as new_vendor_risk
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
        _bool_fields(d, "is_efos_definitivo", "is_sfp_sanctioned", "in_ground_truth", "new_vendor_risk")
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

    return {
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
        "run_summary": run_summary,
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

    if _table_exists(conn, "aria_queue"):
        queue_total_row = conn.execute("SELECT COUNT(*) FROM aria_queue").fetchone()
        queue_total = queue_total_row[0] if queue_total_row else 0

        status_rows = conn.execute(
            """
            SELECT review_status, COUNT(*) as cnt
            FROM aria_queue
            GROUP BY review_status
            """
        ).fetchall()
        for sr in status_rows:
            s = sr["review_status"] or "pending"
            if s in review_stats:
                review_stats[s] = sr["cnt"]

        try:
            nv_row = conn.execute(
                "SELECT COUNT(*) FROM aria_queue WHERE new_vendor_risk = 1"
            ).fetchone()
            new_vendor_count = nv_row[0] if nv_row else 0
        except Exception:
            new_vendor_count = 0

        # Pattern counts and external flag counts
        pattern_counts: dict = {}
        external_counts: dict = {"efos": 0, "sfp": 0}
        try:
            pattern_rows = conn.execute(
                """
                SELECT primary_pattern, COUNT(*) as cnt
                FROM aria_queue
                WHERE primary_pattern IS NOT NULL
                GROUP BY primary_pattern
                ORDER BY cnt DESC
                """
            ).fetchall()
            for pr in pattern_rows:
                if pr["primary_pattern"]:
                    pattern_counts[pr["primary_pattern"]] = pr["cnt"]
            efos_row = conn.execute(
                "SELECT COUNT(*) FROM aria_queue WHERE is_efos_definitivo = 1"
            ).fetchone()
            sfp_row = conn.execute(
                "SELECT COUNT(*) FROM aria_queue WHERE is_sfp_sanctioned = 1"
            ).fetchone()
            external_counts["efos"] = efos_row[0] if efos_row else 0
            external_counts["sfp"] = sfp_row[0] if sfp_row else 0
        except Exception:
            pass

        # Total value at elevated risk (T1+T2)
        elevated_value = 0.0
        try:
            ev_row = conn.execute(
                "SELECT SUM(total_value_mxn) FROM aria_queue WHERE ips_tier IN (1, 2)"
            ).fetchone()
            elevated_value = float(ev_row[0] or 0)
        except Exception:
            pass

    else:
        pattern_counts = {}
        external_counts = {"efos": 0, "sfp": 0}
        elevated_value = 0.0

    result = {
        "latest_run": latest_run,
        "review_stats": review_stats,
        "queue_total": queue_total,
        "new_vendor_count": new_vendor_count,
        "pattern_counts": pattern_counts,
        "external_counts": external_counts,
        "elevated_value_mxn": elevated_value,
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
