"""
API router for watchlist management.

Provides CRUD operations for tracking suspicious vendors, contracts, and institutions.
"""

import sqlite3
import logging
import time as _time
from typing import Optional, List, Dict, Any
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
    risk_score_at_creation: Optional[float] = Field(None, description="Risk score when item was added to watchlist")
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
            risk_score_at_creation REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(item_type, item_id)
        )
    """)

    # Add risk_score_at_creation column to existing tables that predate this migration
    try:
        cursor.execute("ALTER TABLE watchlist_items ADD COLUMN risk_score_at_creation REAL")
        conn.commit()
    except Exception:
        pass  # Column already exists

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
            SELECT v.name, s.avg_risk_score as risk
            FROM vendors v
            LEFT JOIN vendor_stats s ON v.id = s.vendor_id
            WHERE v.id = ?
        """, (item_id,))
    elif item_type == 'institution':
        cursor.execute("""
            SELECT i.name, s.avg_risk_score as risk
            FROM institutions i
            LEFT JOIN institution_stats s ON i.id = s.institution_id
            WHERE i.id = ?
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


def batch_load_names_and_risks(conn: sqlite3.Connection, rows: list) -> dict:
    """Batch-load names and risk scores for all watchlist items, avoiding N+1 queries."""
    vendor_ids = [r["item_id"] for r in rows if r["item_type"] == "vendor"]
    institution_ids = [r["item_id"] for r in rows if r["item_type"] == "institution"]
    contract_ids = [r["item_id"] for r in rows if r["item_type"] == "contract"]

    vendors_map = {}
    if vendor_ids:
        placeholders = ",".join("?" * len(vendor_ids))
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT v.id, v.name, s.avg_risk_score FROM vendors v LEFT JOIN vendor_stats s ON v.id = s.vendor_id WHERE v.id IN ({placeholders})",
            vendor_ids,
        )
        vendors_map = {r[0]: (r[1], r[2]) for r in cursor.fetchall()}

    institutions_map = {}
    if institution_ids:
        placeholders = ",".join("?" * len(institution_ids))
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT i.id, i.name, s.avg_risk_score FROM institutions i LEFT JOIN institution_stats s ON i.id = s.institution_id WHERE i.id IN ({placeholders})",
            institution_ids,
        )
        institutions_map = {r[0]: (r[1], r[2]) for r in cursor.fetchall()}

    contracts_map = {}
    if contract_ids:
        placeholders = ",".join("?" * len(contract_ids))
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, COALESCE(contract_number, 'Contract ' || id), risk_score FROM contracts WHERE id IN ({placeholders})",
            contract_ids,
        )
        contracts_map = {r[0]: (r[1], r[2]) for r in cursor.fetchall()}

    lookup = {}
    lookup["vendor"] = vendors_map
    lookup["institution"] = institutions_map
    lookup["contract"] = contracts_map
    return lookup


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=WatchlistResponse)
def list_watchlist_items(
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

            all_rows = cursor.fetchall()

            # Batch-load names and risk scores (replaces N+1 get_item_name_and_risk calls)
            lookup = batch_load_names_and_risks(conn, all_rows)

            items = []
            for row in all_rows:
                type_map = lookup.get(row["item_type"], {})
                name_risk = type_map.get(row["item_id"])
                name = name_risk[0] if name_risk else None
                risk = name_risk[1] if name_risk else None
                rsc = row["risk_score_at_creation"] if "risk_score_at_creation" in row.keys() else None
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
                    risk_score_at_creation=round(rsc, 4) if rsc else None,
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
def add_watchlist_item(item: WatchlistItemCreate):
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

            # Capture risk score at creation time
            risk_score_at_creation = None
            if item.item_type == 'vendor':
                row = cursor.execute(
                    "SELECT avg_risk_score FROM vendor_stats WHERE vendor_id = ?", (item.item_id,)
                ).fetchone()
                if row:
                    risk_score_at_creation = row[0]
            elif item.item_type == 'institution':
                row = cursor.execute(
                    "SELECT avg_risk_score FROM institution_stats WHERE institution_id = ?", (item.item_id,)
                ).fetchone()
                if row:
                    risk_score_at_creation = row[0]
            elif item.item_type == 'contract':
                row = cursor.execute(
                    "SELECT risk_score FROM contracts WHERE id = ?", (item.item_id,)
                ).fetchone()
                if row:
                    risk_score_at_creation = row[0]

            # Insert
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO watchlist_items
                (item_type, item_id, reason, priority, notes, alert_threshold, risk_score_at_creation, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (item.item_type, item.item_id, item.reason, item.priority,
                  item.notes, item.alert_threshold, risk_score_at_creation, now, now))

            conn.commit()
            _invalidate_watchlist_stats_cache()
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
                risk_score_at_creation=round(risk_score_at_creation, 4) if risk_score_at_creation else None,
                created_at=now,
                updated_at=now
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in add_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


_watchlist_stats_cache: Dict[str, Any] = {}
_watchlist_stats_cache_ts: float = 0.0
_WATCHLIST_STATS_CACHE_TTL = 300  # 5 minutes


def _invalidate_watchlist_stats_cache():
    """Clear the stats cache after mutations."""
    global _watchlist_stats_cache, _watchlist_stats_cache_ts
    _watchlist_stats_cache = {}
    _watchlist_stats_cache_ts = 0.0


@router.get("/stats", response_model=WatchlistStatsResponse)
def get_watchlist_stats():
    """Get watchlist statistics."""
    global _watchlist_stats_cache, _watchlist_stats_cache_ts

    now = _time.time()
    if _watchlist_stats_cache and (now - _watchlist_stats_cache_ts) < _WATCHLIST_STATS_CACHE_TTL:
        return _watchlist_stats_cache

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

            result = WatchlistStatsResponse(
                total=row["total"] or 0,
                watching=row["watching"] or 0,
                investigating=row["investigating"] or 0,
                resolved=row["resolved"] or 0,
                high_priority=row["high_priority"] or 0,
                with_alerts=row["with_alerts"] or 0
            )

            _watchlist_stats_cache = result
            _watchlist_stats_cache_ts = now
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_watchlist_stats: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{watchlist_id}", response_model=WatchlistItem)
def get_watchlist_item(watchlist_id: int = Path(..., description="Watchlist item ID")):
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
            rsc = row["risk_score_at_creation"] if "risk_score_at_creation" in row.keys() else None

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
                risk_score_at_creation=round(rsc, 4) if rsc else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{watchlist_id}/changes")
def get_watchlist_changes(watchlist_id: int = Path(..., description="Watchlist item ID")):
    """
    Returns current risk score vs score at creation, and recent contract activity.

    Enables change-tracking: see whether a vendor's risk has risen or fallen
    since they were added to the watchlist.
    """
    try:
        with get_db() as conn:
            ensure_watchlist_table(conn)

            item = conn.execute(
                "SELECT * FROM watchlist_items WHERE id = ?", (watchlist_id,)
            ).fetchone()
            if not item:
                raise HTTPException(status_code=404, detail="Watchlist item not found")

            current_risk = None
            recent_contracts = []

            if item["item_type"] == "vendor":
                row = conn.execute(
                    "SELECT avg_risk_score FROM vendor_stats WHERE vendor_id = ?", (item["item_id"],)
                ).fetchone()
                if row:
                    current_risk = row[0]
                recent_contracts = conn.execute("""
                    SELECT id, amount_mxn, risk_score, contract_date, sector_id
                    FROM contracts WHERE vendor_id = ? ORDER BY contract_date DESC LIMIT 5
                """, (item["item_id"],)).fetchall()
            elif item["item_type"] == "institution":
                row = conn.execute(
                    "SELECT avg_risk_score FROM institution_stats WHERE institution_id = ?", (item["item_id"],)
                ).fetchone()
                if row:
                    current_risk = row[0]
            elif item["item_type"] == "contract":
                row = conn.execute(
                    "SELECT risk_score FROM contracts WHERE id = ?", (item["item_id"],)
                ).fetchone()
                if row:
                    current_risk = row[0]

            rsc = item["risk_score_at_creation"] if "risk_score_at_creation" in item.keys() else None
            risk_change = None
            if current_risk is not None and rsc is not None:
                risk_change = round(current_risk - rsc, 3)

            return {
                "watchlist_id": watchlist_id,
                "item_type": item["item_type"],
                "item_id": item["item_id"],
                "risk_score_at_creation": round(rsc, 4) if rsc else None,
                "current_risk_score": round(current_risk, 4) if current_risk else None,
                "risk_change": risk_change,
                "recent_contracts": [dict(c) for c in recent_contracts],
            }

    except sqlite3.Error as e:
        logger.error(f"Database error in get_watchlist_changes: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.patch("/{watchlist_id}", response_model=WatchlistItem)
def update_watchlist_item(
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
                _invalidate_watchlist_stats_cache()

            # Fetch updated record
            cursor.execute("SELECT * FROM watchlist_items WHERE id = ?", (watchlist_id,))
            row = cursor.fetchone()

            name, risk = get_item_name_and_risk(conn, row["item_type"], row["item_id"])
            rsc = row["risk_score_at_creation"] if "risk_score_at_creation" in row.keys() else None

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
                risk_score_at_creation=round(rsc, 4) if rsc else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in update_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.delete("/{watchlist_id}")
def delete_watchlist_item(watchlist_id: int = Path(..., description="Watchlist item ID")):
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
            _invalidate_watchlist_stats_cache()

            return {"message": "Item removed from watchlist", "id": watchlist_id}

    except sqlite3.Error as e:
        logger.error(f"Database error in delete_watchlist_item: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
