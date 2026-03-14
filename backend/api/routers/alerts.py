"""
Alert feed endpoint.

GET /api/v1/alerts/feed
Returns recent critical-risk contracts as an investigation alert feed.
"""
import logging
import sqlite3
from typing import Optional, List
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertItem(BaseModel):
    type: str
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    risk_score: Optional[float] = None
    amount_mxn: Optional[float] = None
    contract_date: Optional[str] = None
    sector_name: Optional[str] = None
    contract_id: int


class AlertFeedResponse(BaseModel):
    alerts: List[AlertItem]
    total: int


@router.get("/feed", response_model=AlertFeedResponse)
def get_alert_feed(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    limit: int = Query(20, ge=1, le=100, description="Maximum alerts to return"),
):
    """
    Get recent critical-risk contracts as an alert feed.

    Returns contracts with risk_level='critical' that were awarded within
    the specified look-back window, ordered by risk_score descending.
    Useful for real-time investigation dashboards.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT
                    c.id AS contract_id,
                    c.vendor_id,
                    v.name AS vendor_name,
                    c.risk_score,
                    c.amount_mxn,
                    c.contract_date,
                    s.name_es AS sector_name
                FROM contracts c
                LEFT JOIN vendors v ON v.id = c.vendor_id
                LEFT JOIN sectors s ON s.id = c.sector_id
                WHERE c.risk_level = 'critical'
                  AND c.contract_date >= date('now', '-' || ? || ' days')
                ORDER BY c.risk_score DESC, c.amount_mxn DESC
                LIMIT ?
                """,
                (days, limit),
            )
            rows = cursor.fetchall()

            alerts = [
                AlertItem(
                    type="critical_contract",
                    contract_id=row["contract_id"],
                    vendor_id=row["vendor_id"],
                    vendor_name=row["vendor_name"],
                    risk_score=round(row["risk_score"], 4) if row["risk_score"] else None,
                    amount_mxn=row["amount_mxn"],
                    contract_date=row["contract_date"],
                    sector_name=row["sector_name"],
                )
                for row in rows
            ]

            return AlertFeedResponse(alerts=alerts, total=len(alerts))

    except sqlite3.Error as e:
        logger.error(f"Database error in get_alert_feed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Database error occurred")
