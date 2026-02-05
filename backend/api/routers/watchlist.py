"""
API router for watchlist management.

Provides CRUD operations for tracking suspicious vendors, contracts, and institutions.
"""

import sqlite3
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class WatchlistItemCreate(BaseModel):
    """Request model for creating a watchlist item."""
    item_type: str = Field(..., description="Type: vendor, institution, or contract")
    item_id: int = Field(..., description="ID of the entity to track")
    reason: str = Field(..., description="Reason for adding to watchlist")
    priority: str = Field(default="medium", description="Priority: high, medium, low")
    notes: Optional[str] = Field(None, description="Additional notes")
    alert_threshold: Optional[float] = Field(None, ge=0, le=1, description="Risk threshold for alerts")


class WatchlistItemUpdate(BaseModel):
    """Request model for updating a watchlist item."""
    status: Optional[str] = Field(None, description="Status: watching, investigating, resolved")
    priority: Optional[str] = Field(None, description="Priority: high, medium, low")
    notes: Optional[str] = Field(None, description="Additional notes")
    alert_threshold: Optional[float] = Field(None, ge=0, le=1, description="Risk threshold for alerts")
    alerts_enabled: Optional[bool] = Field(None, description="Enable/disable alerts")


class WatchlistItem(BaseModel):
    """A watchlist item."""
    id: int
    item_type: str
    item_id: int
    item_name: str = Field(..., description="Name of the entity")
    reason: str
    priority: str
    status: str
    notes: Optional[str]
    alert_threshold: Optional[float]
    alerts_enabled: bool
    risk_score: Optional[float] = Field(None, description="Current risk score if available")
    created_at: str
    updated_at: str


class WatchlistResponse(BaseModel):
    """Watchlist list response."""
    data: List[WatchlistItem]
    total: int
    by_status: dict = Field(..., description="Count by status")
    by_priority: dict = Field(..., description="Count by priority")
    high_priority_count: int


class WatchlistStatsResponse(BaseModel):
    """Watchlist statistics."""
    total: int
    watching: int
    investigating: int
    resolved: int
    high_priority: int
    with_alerts: int


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def ensure_watchlist_table(conn: sqlite3.Connection):
    """Create watchlist table if it doesn't exist."""
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('vendor', 'institution', 'contract')),
            item_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
            status VARCHAR(15) NOT NULL DEFAULT 'watching' CHECK (status IN ('watching', 'investigating', 'resolved')),
            notes TEXT,
            alert_threshold REAL,
            alerts_enabled INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(item_type, item_id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_watchlist_type ON watchlist_items(item_type)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist_items(status)
    """)

    conn.commit()


def get_item_name_and_risk(conn: sqlite3.Connection, item_type: str, item_id: int) -> tuple:
    """Get the name and current risk score for a watchlist item."""
    cursor = conn.cursor()

    if item_type == 'vendor':
        cursor.execute("""
            SELECT v.name,
                   (SELECT AVG(risk_score) FROM contracts WHERE vendor_id = v.id) as risk
            FROM vendors v WHERE v.id = ?
        """, (item_id,))
    elif item_type == 'institution':
        cursor.execute("""
            SELECT i.name,
                   (SELECT AVG(risk_score) FROM contracts WHERE institution_id = i.id) as risk
            FROM institutions i WHERE i.id = ?
        """, (item_id,))
    elif item_type == 'contract':
        cursor.execute("""
            SELECT COALESCE(c.contract_number, 'Contract ' || c.id) as name, c.risk_score as risk
            FROM contracts c WHERE c.id = ?
        """, (item_id,))
    else:
        return None, None

    row = cursor.fetchone()
    if row:
        return row[0], row[1]
    return None, None


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=WatchlistResponse)
async def list_watchlist_items(
    status: Optional[str] = Query(None, description="Filter by status"),
    item_type: Optional[str] = Query(None, description="Filter by type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
):
    """
    List all watchlist items.

    Returns items with current risk scores and entity names.
    """
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            # Build conditions
            conditions = ["1=1"]
            params = []

            if status:
                conditions.append("status = ?")
                params.append(status)

            if item_type:
                conditions.append("item_type = ?")
                params.append(item_type)

            if priority:
                conditions.append("priority = ?")
                params.append(priority)

            where_clause = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT * FROM watchlist_items
                WHERE {where_clause}
                ORDER BY
                    CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                    CASE status WHEN 'investigating' THEN 1 WHEN 'watching' THEN 2 ELSE 3 END,
                    updated_at DESC
            """, params)

            items = []
            for row in cursor.fetchall():
                name, risk = get_item_name_and_risk(conn, row["item_type"], row["item_id"])
                items.append(WatchlistItem(
                    id=row["id"],
                    item_type=row["item_type"],
                    item_id=row["item_id"],
                    item_name=name or f"Unknown {row['item_type']}",
                    reason=row["reason"],
                    priority=row["priority"],
                    status=row["status"],
                    notes=row["notes"],
                    alert_threshold=row["alert_threshold"],
                    alerts_enabled=bool(row["alerts_enabled"]),
                    risk_score=round(risk, 4) if risk else None,
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                ))

            # Get counts by status and priority
            cursor.execute("""
                SELECT
                    SUM(CASE WHEN status = 'watching' THEN 1 ELSE 0 END) as watching,
                    SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
                    SUM(CASE WHEN priority = 'high' AND status != 'resolved' THEN 1 ELSE 0 END) as high_active
                FROM watchlist_items
            """)
            counts = cursor.fetchone()

            return WatchlistResponse(
                data=items,
                total=len(items),
                by_status={
                    "watching": counts["watching"] or 0,
                    "investigating": counts["investigating"] or 0,
                    "resolved": counts["resolved"] or 0
                },
                by_priority={
                    "high": counts["high"] or 0,
                    "medium": counts["medium"] or 0,
                    "low": counts["low"] or 0
                },
                high_priority_count=counts["high_active"] or 0
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in list_watchlist_items: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.post("", response_model=WatchlistItem)
async def add_watchlist_item(item: WatchlistItemCreate):
    """
    Add an item to the watchlist.

    The item type must be 'vendor', 'institution', or 'contract'.
    """
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            # Validate item type
            if item.item_type not in ('vendor', 'institution', 'contract'):
                raise HTTPException(status_code=400, detail="Invalid item_type. Must be vendor, institution, or contract")

            # Verify the entity exists
            name, risk = get_item_name_and_risk(conn, item.item_type, item.item_id)
            if not name:
                raise HTTPException(status_code=404, detail=f"{item.item_type.title()} {item.item_id} not found")

            # Check if already on watchlist
            cursor.execute("""
                SELECT id FROM watchlist_items
                WHERE item_type = ? AND item_id = ?
            """, (item.item_type, item.item_id))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail=f"This {item.item_type} is already on the watchlist")

            # Insert
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO watchlist_items
                (item_type, item_id, reason, priority, notes, alert_threshold, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (item.item_type, item.item_id, item.reason, item.priority,
                  item.notes, item.alert_threshold, now, now))

            conn.commit()
            item_id = cursor.lastrowid

            return WatchlistItem(
                id=item_id,
                item_type=item.item_type,
                item_id=item.item_id,
                item_name=name,
                reason=item.reason,
                priority=item.priority,
                status="watching",
                notes=item.notes,
                alert_threshold=item.alert_threshold,
                alerts_enabled=True,
                risk_score=round(risk, 4) if risk else None,
                created_at=now,
                updated_at=now
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in add_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/stats", response_model=WatchlistStatsResponse)
async def get_watchlist_stats():
    """Get watchlist statistics."""
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'watching' THEN 1 ELSE 0 END) as watching,
                    SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN priority = 'high' AND status != 'resolved' THEN 1 ELSE 0 END) as high_priority,
                    SUM(CASE WHEN alerts_enabled = 1 THEN 1 ELSE 0 END) as with_alerts
                FROM watchlist_items
            """)
            row = cursor.fetchone()

            return WatchlistStatsResponse(
                total=row["total"] or 0,
                watching=row["watching"] or 0,
                investigating=row["investigating"] or 0,
                resolved=row["resolved"] or 0,
                high_priority=row["high_priority"] or 0,
                with_alerts=row["with_alerts"] or 0
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_watchlist_stats: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{watchlist_id}", response_model=WatchlistItem)
async def get_watchlist_item(watchlist_id: int = Path(..., description="Watchlist item ID")):
    """Get a specific watchlist item."""
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM watchlist_items WHERE id = ?", (watchlist_id,))
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Watchlist item {watchlist_id} not found")

            name, risk = get_item_name_and_risk(conn, row["item_type"], row["item_id"])

            return WatchlistItem(
                id=row["id"],
                item_type=row["item_type"],
                item_id=row["item_id"],
                item_name=name or f"Unknown {row['item_type']}",
                reason=row["reason"],
                priority=row["priority"],
                status=row["status"],
                notes=row["notes"],
                alert_threshold=row["alert_threshold"],
                alerts_enabled=bool(row["alerts_enabled"]),
                risk_score=round(risk, 4) if risk else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.patch("/{watchlist_id}", response_model=WatchlistItem)
async def update_watchlist_item(
    watchlist_id: int = Path(..., description="Watchlist item ID"),
    update: WatchlistItemUpdate = None
):
    """Update a watchlist item."""
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            # Check exists
            cursor.execute("SELECT * FROM watchlist_items WHERE id = ?", (watchlist_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Watchlist item {watchlist_id} not found")

            # Build update
            updates = []
            params = []

            if update.status is not None:
                if update.status not in ('watching', 'investigating', 'resolved'):
                    raise HTTPException(status_code=400, detail="Invalid status")
                updates.append("status = ?")
                params.append(update.status)

            if update.priority is not None:
                if update.priority not in ('high', 'medium', 'low'):
                    raise HTTPException(status_code=400, detail="Invalid priority")
                updates.append("priority = ?")
                params.append(update.priority)

            if update.notes is not None:
                updates.append("notes = ?")
                params.append(update.notes)

            if update.alert_threshold is not None:
                updates.append("alert_threshold = ?")
                params.append(update.alert_threshold)

            if update.alerts_enabled is not None:
                updates.append("alerts_enabled = ?")
                params.append(1 if update.alerts_enabled else 0)

            if updates:
                updates.append("updated_at = ?")
                params.append(datetime.utcnow().isoformat())
                params.append(watchlist_id)

                cursor.execute(f"""
                    UPDATE watchlist_items
                    SET {', '.join(updates)}
                    WHERE id = ?
                """, params)
                conn.commit()

            # Fetch updated record
            cursor.execute("SELECT * FROM watchlist_items WHERE id = ?", (watchlist_id,))
            row = cursor.fetchone()

            name, risk = get_item_name_and_risk(conn, row["item_type"], row["item_id"])

            return WatchlistItem(
                id=row["id"],
                item_type=row["item_type"],
                item_id=row["item_id"],
                item_name=name or f"Unknown {row['item_type']}",
                reason=row["reason"],
                priority=row["priority"],
                status=row["status"],
                notes=row["notes"],
                alert_threshold=row["alert_threshold"],
                alerts_enabled=bool(row["alerts_enabled"]),
                risk_score=round(risk, 4) if risk else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in update_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.delete("/{watchlist_id}")
async def delete_watchlist_item(watchlist_id: int = Path(..., description="Watchlist item ID")):
    """Remove an item from the watchlist."""
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM watchlist_items WHERE id = ?", (watchlist_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Watchlist item {watchlist_id} not found")

            cursor.execute("DELETE FROM watchlist_items WHERE id = ?", (watchlist_id,))
            conn.commit()

            return {"message": "Item removed from watchlist", "id": watchlist_id}

    except sqlite3.Error as e:
        logger.error(f"Database error in delete_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
