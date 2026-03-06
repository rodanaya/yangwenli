"""
User issue reporting endpoint.

Allows any visitor to submit bug reports, wrong-data alerts, or feature
requests.  Reports are stored in the user_issues table and reviewable
via GET /api/v1/issues.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import sqlite3
import logging

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/issues", tags=["issues"])

VALID_CATEGORIES = {"bug", "wrong_data", "feature_request", "other"}
VALID_STATUSES = {"open", "in_progress", "resolved", "dismissed"}

_table_ready = False


def _ensure_table(conn: sqlite3.Connection) -> None:
    global _table_ready
    if _table_ready:
        return
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_issues (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            category    TEXT    NOT NULL DEFAULT 'other',
            subject     TEXT    NOT NULL,
            description TEXT    NOT NULL,
            page_url    TEXT,
            email       TEXT,
            status      TEXT    NOT NULL DEFAULT 'open',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issues_status  ON user_issues(status)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_issues_created ON user_issues(created_at)"
    )
    conn.commit()
    _table_ready = True


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class IssueIn(BaseModel):
    category: str = "other"
    subject: str
    description: str
    page_url: Optional[str] = None
    email: Optional[str] = None


class IssueOut(BaseModel):
    id: int
    category: str
    subject: str
    description: str
    page_url: Optional[str]
    email: Optional[str]
    status: str
    created_at: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=IssueOut, status_code=201)
def submit_issue(body: IssueIn):
    """Submit a new issue report (bug, wrong data, feature request, other)."""
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"category must be one of {sorted(VALID_CATEGORIES)}",
        )
    if not body.subject.strip():
        raise HTTPException(status_code=400, detail="subject is required")
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="description is required")

    try:
        with get_db() as conn:
            _ensure_table(conn)
            cursor = conn.execute(
                """
                INSERT INTO user_issues (category, subject, description, page_url, email)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    body.category,
                    body.subject.strip(),
                    body.description.strip(),
                    body.page_url,
                    body.email,
                ),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM user_issues WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return dict(row)
    except sqlite3.Error as e:
        logger.error(f"Database error in submit_issue: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("", response_model=list[IssueOut])
def list_issues(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """List submitted issues (admin view)."""
    try:
        with get_db() as conn:
            _ensure_table(conn)
            conditions: list[str] = []
            params: list = []
            if status:
                conditions.append("status = ?")
                params.append(status)
            if category:
                conditions.append("category = ?")
                params.append(category)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            params.append(limit)
            rows = conn.execute(
                f"SELECT * FROM user_issues {where} ORDER BY created_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [dict(r) for r in rows]
    except sqlite3.Error as e:
        logger.error(f"Database error in list_issues: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.patch("/{issue_id}/status", response_model=IssueOut)
def update_issue_status(issue_id: int, status: str):
    """Update an issue's status (admin action)."""
    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of {sorted(VALID_STATUSES)}",
        )
    try:
        with get_db() as conn:
            _ensure_table(conn)
            conn.execute(
                "UPDATE user_issues SET status = ? WHERE id = ?",
                (status, issue_id),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM user_issues WHERE id = ?", (issue_id,)
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Issue not found")
            return dict(row)
    except sqlite3.Error as e:
        logger.error(f"Database error in update_issue_status: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
