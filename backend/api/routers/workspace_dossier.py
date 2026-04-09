import time as _time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List

from ..dependencies import get_db, require_write_key

router = APIRouter(prefix="/workspace/dossiers", tags=["dossiers"])

# ── Models ──────────────────────────────────────────────────────────────────

class DossierIn(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: str = "active"
    color: str = Field(default="#64748b", pattern=r'^#[0-9A-Fa-f]{6}$')

class DossierOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    color: str
    item_count: int
    created_at: str
    updated_at: str
    highest_risk_score: Optional[float] = None
    highest_risk_name: Optional[str] = None

class DossierItemIn(BaseModel):
    item_type: str  # vendor | institution | contract | note
    item_id: Optional[int] = None
    item_name: str = Field(..., max_length=200)
    annotation: Optional[str] = Field(default=None, max_length=2000)
    color: str = Field(default="#64748b", pattern=r'^#[0-9A-Fa-f]{6}$')

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
def list_dossiers(status: Optional[str] = None, _: None = Depends(require_write_key)):
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

        dossiers = [dict(r) for r in rows]
        dossier_ids = [d["id"] for d in dossiers]

        # Compute highest risk score per dossier from vendor/contract items
        risk_map: dict = {}
        if dossier_ids:
            placeholders = ",".join("?" * len(dossier_ids))
            # Vendors: use avg_risk_score from vendors table
            vendor_rows = conn.execute(f"""
                SELECT di.dossier_id, v.avg_risk_score, v.name
                FROM dossier_items di
                JOIN vendors v ON di.item_id = v.id
                WHERE di.dossier_id IN ({placeholders})
                    AND di.item_type = 'vendor'
                    AND v.avg_risk_score IS NOT NULL
            """, dossier_ids).fetchall()
            for r in vendor_rows:
                did = r["dossier_id"]
                score = r["avg_risk_score"] or 0
                if did not in risk_map or score > risk_map[did][0]:
                    risk_map[did] = (score, r["name"])

            # Contracts: use risk_score from contracts table
            contract_rows = conn.execute(f"""
                SELECT di.dossier_id, c.risk_score, c.title
                FROM dossier_items di
                JOIN contracts c ON di.item_id = c.id
                WHERE di.dossier_id IN ({placeholders})
                    AND di.item_type = 'contract'
                    AND c.risk_score IS NOT NULL
            """, dossier_ids).fetchall()
            for r in contract_rows:
                did = r["dossier_id"]
                score = r["risk_score"] or 0
                name = r["title"] or "Contract"
                if did not in risk_map or score > risk_map[did][0]:
                    risk_map[did] = (score, name)

        for d in dossiers:
            did = d["id"]
            if did in risk_map:
                d["highest_risk_score"] = round(risk_map[did][0], 4)
                d["highest_risk_name"] = risk_map[did][1]

        return dossiers

@router.post("", response_model=DossierOut, status_code=201)
def create_dossier(body: DossierIn, _: None = Depends(require_write_key)):
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
def get_dossier(dossier_id: int, _: None = Depends(require_write_key)):
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
def update_dossier(dossier_id: int, body: DossierIn, _: None = Depends(require_write_key)):
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
def delete_dossier(dossier_id: int, _: None = Depends(require_write_key)):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM investigation_dossiers WHERE id=?", (dossier_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Dossier not found")
        conn.execute("DELETE FROM investigation_dossiers WHERE id=?", (dossier_id,))
        conn.commit()

# ── Dossier Items ─────────────────────────────────────────────────────────────

@router.get("/{dossier_id}/items", response_model=List[DossierItemOut])
def list_items(dossier_id: int, _: None = Depends(require_write_key)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM dossier_items WHERE dossier_id=? ORDER BY created_at",
            (dossier_id,)
        ).fetchall()
        return [dict(r) for r in rows]

@router.post("/{dossier_id}/items", response_model=DossierItemOut, status_code=201)
def add_item(dossier_id: int, body: DossierItemIn, _: None = Depends(require_write_key)):
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
def remove_item(dossier_id: int, item_id: int, _: None = Depends(require_write_key)):
    with get_db() as conn:
        conn.execute("DELETE FROM dossier_items WHERE id=? AND dossier_id=?", (item_id, dossier_id))
        conn.execute("UPDATE investigation_dossiers SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (dossier_id,))
        conn.commit()

@router.get("/{dossier_id}/export")
def export_dossier(dossier_id: int, _: None = Depends(require_write_key)):
    """Export dossier with all items as a JSON file download."""
    with get_db() as conn:
        dossier = conn.execute(
            "SELECT * FROM investigation_dossiers WHERE id = ?", (dossier_id,)
        ).fetchone()
        if not dossier:
            raise HTTPException(status_code=404, detail="Dossier not found")
        items = conn.execute(
            "SELECT * FROM dossier_items WHERE dossier_id = ? ORDER BY created_at",
            (dossier_id,)
        ).fetchall()

    export_data = {
        "dossier": dict(dossier),
        "items": [dict(i) for i in items],
        "exported_at": _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()),
        "platform": "RUBLI",
    }
    safe_name = dossier["name"].replace(" ", "-").replace("/", "-")
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}-report.json"',
            "Content-Type": "application/json",
        },
    )
