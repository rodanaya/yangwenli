from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from ..dependencies import get_db

router = APIRouter(prefix="/api/v1/workspace/dossiers", tags=["dossiers"])

# ── Models ──────────────────────────────────────────────────────────────────

class DossierIn(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    color: str = "#64748b"

class DossierOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    color: str
    item_count: int
    created_at: str
    updated_at: str

class DossierItemIn(BaseModel):
    item_type: str  # vendor | institution | contract | note
    item_id: Optional[int] = None
    item_name: str
    annotation: Optional[str] = None
    color: str = "#64748b"

class DossierItemOut(BaseModel):
    id: int
    dossier_id: int
    item_type: str
    item_id: Optional[int]
    item_name: str
    annotation: Optional[str]
    color: str
    created_at: str

# ── Dossier CRUD ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[DossierOut])
def list_dossiers(status: Optional[str] = None):
    with get_db() as conn:
        where = "WHERE d.status = ?" if status else ""
        params = (status,) if status else ()
        rows = conn.execute(f"""
            SELECT d.*, COUNT(di.id) as item_count
            FROM investigation_dossiers d
            LEFT JOIN dossier_items di ON di.dossier_id = d.id
            {where}
            GROUP BY d.id
            ORDER BY d.updated_at DESC
        """, params).fetchall()
        return [dict(r) for r in rows]

@router.post("", response_model=DossierOut, status_code=201)
def create_dossier(body: DossierIn):
    valid_statuses = {"active", "archived", "closed"}
    if body.status not in valid_statuses:
        raise HTTPException(400, f"status must be one of {valid_statuses}")
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO investigation_dossiers (name, description, status, color) VALUES (?,?,?,?)",
            (body.name, body.description, body.status, body.color)
        )
        conn.commit()
        row = conn.execute(
            "SELECT d.*, 0 as item_count FROM investigation_dossiers d WHERE d.id = ?",
            (cur.lastrowid,)
        ).fetchone()
        return dict(row)

@router.get("/{dossier_id}", response_model=DossierOut)
def get_dossier(dossier_id: int):
    with get_db() as conn:
        row = conn.execute("""
            SELECT d.*, COUNT(di.id) as item_count
            FROM investigation_dossiers d
            LEFT JOIN dossier_items di ON di.dossier_id = d.id
            WHERE d.id = ?
            GROUP BY d.id
        """, (dossier_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Dossier not found")
        return dict(row)

@router.patch("/{dossier_id}", response_model=DossierOut)
def update_dossier(dossier_id: int, body: DossierIn):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM investigation_dossiers WHERE id=?", (dossier_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Dossier not found")
        conn.execute(
            "UPDATE investigation_dossiers SET name=?, description=?, status=?, color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (body.name, body.description, body.status, body.color, dossier_id)
        )
        conn.commit()
        row = conn.execute("""
            SELECT d.*, COUNT(di.id) as item_count
            FROM investigation_dossiers d
            LEFT JOIN dossier_items di ON di.dossier_id = d.id
            WHERE d.id = ?
            GROUP BY d.id
        """, (dossier_id,)).fetchone()
        return dict(row)

@router.delete("/{dossier_id}", status_code=204)
def delete_dossier(dossier_id: int):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM investigation_dossiers WHERE id=?", (dossier_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Dossier not found")
        conn.execute("DELETE FROM investigation_dossiers WHERE id=?", (dossier_id,))
        conn.commit()

# ── Dossier Items ─────────────────────────────────────────────────────────────

@router.get("/{dossier_id}/items", response_model=List[DossierItemOut])
def list_items(dossier_id: int):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM dossier_items WHERE dossier_id=? ORDER BY created_at",
            (dossier_id,)
        ).fetchall()
        return [dict(r) for r in rows]

@router.post("/{dossier_id}/items", response_model=DossierItemOut, status_code=201)
def add_item(dossier_id: int, body: DossierItemIn):
    valid_types = {"vendor", "institution", "contract", "note"}
    if body.item_type not in valid_types:
        raise HTTPException(400, f"item_type must be one of {valid_types}")
    with get_db() as conn:
        dossier = conn.execute("SELECT id FROM investigation_dossiers WHERE id=?", (dossier_id,)).fetchone()
        if not dossier:
            raise HTTPException(404, "Dossier not found")
        cur = conn.execute(
            "INSERT INTO dossier_items (dossier_id, item_type, item_id, item_name, annotation, color) VALUES (?,?,?,?,?,?)",
            (dossier_id, body.item_type, body.item_id, body.item_name, body.annotation, body.color)
        )
        conn.execute("UPDATE investigation_dossiers SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (dossier_id,))
        conn.commit()
        row = conn.execute("SELECT * FROM dossier_items WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)

@router.delete("/{dossier_id}/items/{item_id}", status_code=204)
def remove_item(dossier_id: int, item_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM dossier_items WHERE id=? AND dossier_id=?", (item_id, dossier_id))
        conn.execute("UPDATE investigation_dossiers SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (dossier_id,))
        conn.commit()
