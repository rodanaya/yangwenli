"""
API router for risk feedback (False Positive Feedback Loop — feature 4.7).

Allows analysts to mark vendors, institutions, or contracts as
not_suspicious / confirmed_suspicious / needs_review so that
manual judgments can be tracked alongside AI risk scores.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3
import logging
from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])

VALID_ENTITY_TYPES = {"vendor", "institution", "contract"}
VALID_FEEDBACK_TYPES = {"not_suspicious", "confirmed_suspicious", "needs_review"}


def _ensure_table(conn: sqlite3.Connection) -> None:
    """Create risk_feedback table if it does not yet exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS risk_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('vendor', 'institution', 'contract')),
            entity_id INTEGER NOT NULL,
            feedback_type TEXT NOT NULL CHECK(feedback_type IN ('not_suspicious', 'confirmed_suspicious', 'needs_review')),
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(entity_type, entity_id)
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feedback_entity ON risk_feedback(entity_type, entity_id)"
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class FeedbackIn(BaseModel):
    entity_type: str   # vendor | institution | contract
    entity_id: int
    feedback_type: str  # not_suspicious | confirmed_suspicious | needs_review
    reason: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    feedback_type: str
    reason: Optional[str]
    created_at: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=FeedbackOut, status_code=201)
def submit_feedback(body: FeedbackIn):
    """
    Submit (or update) feedback for a vendor, institution, or contract.

    Uses UPSERT semantics: if feedback already exists for this entity it is
    overwritten with the new values.
    """
    if body.entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"entity_type must be one of {sorted(VALID_ENTITY_TYPES)}"
        )
    if body.feedback_type not in VALID_FEEDBACK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"feedback_type must be one of {sorted(VALID_FEEDBACK_TYPES)}"
        )

    try:
        with get_db() as conn:
            _ensure_table(conn)
            conn.execute(
                """
                INSERT INTO risk_feedback (entity_type, entity_id, feedback_type, reason)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                    feedback_type = excluded.feedback_type,
                    reason        = excluded.reason,
                    created_at    = CURRENT_TIMESTAMP
                """,
                (body.entity_type, body.entity_id, body.feedback_type, body.reason),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM risk_feedback WHERE entity_type = ? AND entity_id = ?",
                (body.entity_type, body.entity_id),
            ).fetchone()
            return dict(row)
    except sqlite3.Error as e:
        logger.error(f"Database error in submit_feedback: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("", response_model=Optional[FeedbackOut])
def get_feedback(entity_type: str, entity_id: int):
    """
    Retrieve existing feedback for a specific entity, or null if none.
    """
    try:
        with get_db() as conn:
            _ensure_table(conn)
            row = conn.execute(
                "SELECT * FROM risk_feedback WHERE entity_type = ? AND entity_id = ?",
                (entity_type, entity_id),
            ).fetchone()
            return dict(row) if row else None
    except sqlite3.Error as e:
        logger.error(f"Database error in get_feedback: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.delete("")
def delete_feedback(entity_type: str, entity_id: int):
    """Remove feedback for a specific entity."""
    try:
        with get_db() as conn:
            _ensure_table(conn)
            conn.execute(
                "DELETE FROM risk_feedback WHERE entity_type = ? AND entity_id = ?",
                (entity_type, entity_id),
            )
            conn.commit()
            return {"deleted": True}
    except sqlite3.Error as e:
        logger.error(f"Database error in delete_feedback: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
