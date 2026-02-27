"""
API router for investigation folders.

Provides CRUD for organizing watchlist items into named folders/collections.
"""
import json
import logging
import sqlite3
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist/folders", tags=["watchlist-folders"])


# =============================================================================
# MODELS
# =============================================================================

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: str = Field(default="#3b82f6", max_length=20)


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)


class FolderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    item_count: int = 0
    created_at: str
    updated_at: str


class FolderExportItem(BaseModel):
    item_type: str
    item_id: int
    item_name: Optional[str] = None
    reason: str
    priority: str
    status: str
    risk_score: Optional[float] = None


class FolderExportResponse(BaseModel):
    folder: FolderResponse
    items: List[FolderExportItem]
    exported_at: str


# =============================================================================
# TABLE SETUP
# =============================================================================

def _ensure_tables(conn: sqlite3.Connection):
    """Create investigation_folders and folder_items tables if needed."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS investigation_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#3b82f6',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS investigation_folder_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER NOT NULL REFERENCES investigation_folders(id) ON DELETE CASCADE,
            watchlist_item_id INTEGER NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(folder_id, watchlist_item_id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON investigation_folder_items(folder_id)")
    conn.commit()


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=List[FolderResponse])
def list_folders():
    """List all investigation folders."""
    with get_db() as conn:
        _ensure_tables(conn)
        rows = conn.execute("""
            SELECT f.*,
                   (SELECT COUNT(*) FROM investigation_folder_items fi WHERE fi.folder_id = f.id) as item_count
            FROM investigation_folders f
            ORDER BY f.updated_at DESC
        """).fetchall()

        return [
            FolderResponse(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                color=r["color"],
                item_count=r["item_count"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]


@router.post("", response_model=FolderResponse, status_code=201)
def create_folder(body: FolderCreate):
    """Create a new investigation folder."""
    with get_db() as conn:
        _ensure_tables(conn)
        now = datetime.utcnow().isoformat()
        cursor = conn.execute(
            "INSERT INTO investigation_folders (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (body.name, body.description, body.color, now, now),
        )
        conn.commit()
        return FolderResponse(
            id=cursor.lastrowid,
            name=body.name,
            description=body.description,
            color=body.color,
            item_count=0,
            created_at=now,
            updated_at=now,
        )


@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
    body: FolderUpdate,
    folder_id: int = Path(..., description="Folder ID"),
):
    """Update an investigation folder."""
    with get_db() as conn:
        _ensure_tables(conn)
        row = conn.execute("SELECT * FROM investigation_folders WHERE id = ?", (folder_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Folder {folder_id} not found")

        updates, params = [], []
        if body.name is not None:
            updates.append("name = ?")
            params.append(body.name)
        if body.description is not None:
            updates.append("description = ?")
            params.append(body.description)
        if body.color is not None:
            updates.append("color = ?")
            params.append(body.color)

        if updates:
            now = datetime.utcnow().isoformat()
            updates.append("updated_at = ?")
            params.append(now)
            params.append(folder_id)
            conn.execute(f"UPDATE investigation_folders SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()

        updated = conn.execute("""
            SELECT f.*,
                   (SELECT COUNT(*) FROM investigation_folder_items fi WHERE fi.folder_id = f.id) as item_count
            FROM investigation_folders f WHERE f.id = ?
        """, (folder_id,)).fetchone()

        return FolderResponse(
            id=updated["id"],
            name=updated["name"],
            description=updated["description"],
            color=updated["color"],
            item_count=updated["item_count"],
            created_at=updated["created_at"],
            updated_at=updated["updated_at"],
        )


@router.delete("/{folder_id}")
def delete_folder(folder_id: int = Path(..., description="Folder ID")):
    """Delete an investigation folder (items are unlinked, not deleted)."""
    with get_db() as conn:
        _ensure_tables(conn)
        row = conn.execute("SELECT id FROM investigation_folders WHERE id = ?", (folder_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Folder {folder_id} not found")

        conn.execute("DELETE FROM investigation_folder_items WHERE folder_id = ?", (folder_id,))
        conn.execute("DELETE FROM investigation_folders WHERE id = ?", (folder_id,))
        conn.commit()
        return {"message": "Folder deleted", "id": folder_id}


@router.get("/export/{folder_id}", response_model=FolderExportResponse)
def export_folder(folder_id: int = Path(..., description="Folder ID")):
    """Export folder watchlist items as a JSON dossier."""
    with get_db() as conn:
        _ensure_tables(conn)

        folder_row = conn.execute("""
            SELECT f.*,
                   (SELECT COUNT(*) FROM investigation_folder_items fi WHERE fi.folder_id = f.id) as item_count
            FROM investigation_folders f WHERE f.id = ?
        """, (folder_id,)).fetchone()
        if not folder_row:
            raise HTTPException(status_code=404, detail=f"Folder {folder_id} not found")

        folder = FolderResponse(
            id=folder_row["id"],
            name=folder_row["name"],
            description=folder_row["description"],
            color=folder_row["color"],
            item_count=folder_row["item_count"],
            created_at=folder_row["created_at"],
            updated_at=folder_row["updated_at"],
        )

        item_rows = conn.execute("""
            SELECT wi.item_type, wi.item_id, wi.reason, wi.priority, wi.status
            FROM investigation_folder_items fi
            JOIN watchlist_items wi ON fi.watchlist_item_id = wi.id
            WHERE fi.folder_id = ?
            ORDER BY wi.priority, wi.updated_at DESC
            LIMIT 100
        """, (folder_id,)).fetchall()

        items = []
        for ir in item_rows:
            # Resolve name and risk
            item_name = None
            risk = None
            if ir["item_type"] == "vendor":
                vr = conn.execute(
                    "SELECT name FROM vendors WHERE id = ?", (ir["item_id"],)
                ).fetchone()
                if vr:
                    item_name = vr["name"]
                rr = conn.execute(
                    "SELECT avg_risk_score FROM vendor_stats WHERE vendor_id = ?", (ir["item_id"],)
                ).fetchone()
                if rr:
                    risk = rr["avg_risk_score"]
            elif ir["item_type"] == "institution":
                inst = conn.execute(
                    "SELECT name FROM institutions WHERE id = ?", (ir["item_id"],)
                ).fetchone()
                if inst:
                    item_name = inst["name"]
            elif ir["item_type"] == "contract":
                cr = conn.execute(
                    "SELECT contract_number, risk_score FROM contracts WHERE id = ?", (ir["item_id"],)
                ).fetchone()
                if cr:
                    item_name = cr["contract_number"] or f"Contract {ir['item_id']}"
                    risk = cr["risk_score"]

            items.append(FolderExportItem(
                item_type=ir["item_type"],
                item_id=ir["item_id"],
                item_name=item_name,
                reason=ir["reason"],
                priority=ir["priority"],
                status=ir["status"],
                risk_score=round(risk, 4) if risk else None,
            ))

        return FolderExportResponse(
            folder=folder,
            items=items,
            exported_at=datetime.utcnow().isoformat(),
        )
