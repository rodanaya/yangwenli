"""
Case Library router — documented procurement scandals.

Endpoints:
  GET /cases              List all cases with optional filters
  GET /cases/stats        Aggregate statistics
  GET /cases/{slug}       Full detail for one case
  GET /cases/by-sector/{sector_id}  Cases for a sector
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import get_db
from ..models.scandal import ScandalDetail, ScandalListItem, ScandalStats

router = APIRouter(prefix="/cases", tags=["cases"])

# Simple in-memory cache (cases table is small, rarely changes)
_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL = 3600  # 1 hour


def _get(key: str) -> Any:
    with _cache_lock:
        entry = _cache.get(key)
        if entry and datetime.now() < entry["expires"]:
            return entry["value"]
        return None


def _set(key: str, value: Any) -> None:
    with _cache_lock:
        _cache[key] = {"value": value, "expires": datetime.now() + timedelta(seconds=_CACHE_TTL)}


def _row_to_list_item(row) -> dict:
    return {
        "id": row["id"],
        "name_en": row["name_en"],
        "name_es": row["name_es"] or row["name_en"],
        "slug": row["slug"],
        "fraud_type": row["fraud_type"],
        "administration": row["administration"],
        "sector_id": row["sector_id"],
        "sector_ids": json.loads(row["sector_ids_json"] or "[]"),
        "contract_year_start": row["contract_year_start"],
        "contract_year_end": row["contract_year_end"],
        "discovery_year": row["discovery_year"],
        "amount_mxn_low": row["amount_mxn_low"],
        "amount_mxn_high": row["amount_mxn_high"],
        "severity": row["severity"],
        "legal_status": row["legal_status"],
        "compranet_visibility": row["compranet_visibility"],
        "summary_en": row["summary_en"],
        "is_verified": row["is_verified"],
        "ground_truth_case_id": row["ground_truth_case_id"],
    }


def _row_to_detail(row) -> dict:
    d = _row_to_list_item(row)
    d.update({
        "amount_note": row["amount_note"],
        "legal_status_note": row["legal_status_note"],
        "compranet_note": row["compranet_note"],
        "summary_es": row["summary_es"],
        "key_actors": json.loads(row["key_actors_json"] or "[]"),
        "sources": json.loads(row["sources_json"] or "[]"),
        "investigation_case_ids": json.loads(row["investigation_case_ids_json"] or "[]"),
    })
    return d


@router.get("", response_model=List[ScandalListItem])
def list_cases(
    fraud_type: Optional[str] = Query(None),
    administration: Optional[str] = Query(None),
    sector_id: Optional[int] = Query(None),
    legal_status: Optional[str] = Query(None),
    severity_min: Optional[int] = Query(None, ge=1, le=4),
    compranet_visibility: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
):
    """List documented procurement scandals with optional filters."""
    cache_key = f"list:{fraud_type}:{administration}:{sector_id}:{legal_status}:{severity_min}:{compranet_visibility}:{search}"
    cached = _get(cache_key)
    if cached is not None:
        return cached

    conditions = ["is_verified = 1"]
    params: list = []

    if fraud_type:
        conditions.append("fraud_type = ?")
        params.append(fraud_type)
    if administration:
        conditions.append("administration = ?")
        params.append(administration)
    if sector_id is not None:
        conditions.append("(sector_id = ? OR EXISTS (SELECT 1 FROM json_each(sector_ids_json) WHERE value = ?))")
        params.extend([sector_id, sector_id])
    if legal_status:
        conditions.append("legal_status = ?")
        params.append(legal_status)
    if severity_min is not None:
        conditions.append("severity >= ?")
        params.append(severity_min)
    if compranet_visibility:
        conditions.append("compranet_visibility = ?")
        params.append(compranet_visibility)
    if search:
        pattern = f"%{search}%"
        conditions.append("(name_en LIKE ? OR name_es LIKE ? OR summary_en LIKE ?)")
        params.extend([pattern, pattern, pattern])

    where = "WHERE " + " AND ".join(conditions)
    sql = f"""
        SELECT id, name_en, name_es, slug, fraud_type, administration,
               sector_id, sector_ids_json, contract_year_start, contract_year_end,
               discovery_year, amount_mxn_low, amount_mxn_high,
               severity, legal_status, compranet_visibility,
               summary_en, is_verified, ground_truth_case_id
        FROM procurement_scandals
        {where}
        ORDER BY severity DESC, amount_mxn_low DESC NULLS LAST
    """
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()

    result = [_row_to_list_item(r) for r in rows]
    _set(cache_key, result)
    return result


@router.get("/stats", response_model=ScandalStats)
def get_stats():
    """Aggregate statistics across all verified cases."""
    cached = _get("stats")
    if cached is not None:
        return cached

    with get_db() as conn:
        total_row = conn.execute(
            "SELECT COUNT(*) as n, SUM(COALESCE(amount_mxn_low, 0)) as total FROM procurement_scandals WHERE is_verified=1"
        ).fetchone()

        fraud_rows = conn.execute(
            "SELECT fraud_type, COUNT(*) as n FROM procurement_scandals WHERE is_verified=1 GROUP BY fraud_type ORDER BY n DESC"
        ).fetchall()

        admin_rows = conn.execute(
            "SELECT administration, COUNT(*) as n FROM procurement_scandals WHERE is_verified=1 GROUP BY administration ORDER BY n DESC"
        ).fetchall()

        status_rows = conn.execute(
            "SELECT legal_status, COUNT(*) as n FROM procurement_scandals WHERE is_verified=1 GROUP BY legal_status ORDER BY n DESC"
        ).fetchall()

        sev_rows = conn.execute(
            "SELECT severity, COUNT(*) as n FROM procurement_scandals WHERE is_verified=1 GROUP BY severity ORDER BY severity DESC"
        ).fetchall()

        gt_count = conn.execute(
            "SELECT COUNT(*) FROM procurement_scandals WHERE is_verified=1 AND ground_truth_case_id IS NOT NULL"
        ).fetchone()[0]

        visible_count = conn.execute(
            "SELECT COUNT(*) FROM procurement_scandals WHERE is_verified=1 AND compranet_visibility = 'high'"
        ).fetchone()[0]

    result = {
        "total_cases": total_row["n"],
        "total_amount_mxn_low": total_row["total"] or 0.0,
        "cases_by_fraud_type": [{"fraud_type": r["fraud_type"], "count": r["n"]} for r in fraud_rows],
        "cases_by_administration": [{"administration": r["administration"], "count": r["n"]} for r in admin_rows],
        "cases_by_legal_status": [{"legal_status": r["legal_status"], "count": r["n"]} for r in status_rows],
        "cases_by_severity": [{"severity": r["severity"], "count": r["n"]} for r in sev_rows],
        "gt_linked_count": gt_count,
        "compranet_visible_count": visible_count,
    }
    _set("stats", result)
    return result


@router.get("/by-sector/{sector_id}", response_model=List[ScandalListItem])
def cases_by_sector(sector_id: int):
    """Cases for a given sector (by primary sector_id or sector_ids list)."""
    cache_key = f"sector:{sector_id}"
    cached = _get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, name_en, name_es, slug, fraud_type, administration,
                   sector_id, sector_ids_json, contract_year_start, contract_year_end,
                   discovery_year, amount_mxn_low, amount_mxn_high,
                   severity, legal_status, compranet_visibility,
                   summary_en, is_verified, ground_truth_case_id
            FROM procurement_scandals
            WHERE is_verified=1
              AND (sector_id = ?
                   OR EXISTS (
                       SELECT 1 FROM json_each(sector_ids_json) WHERE value = ?
                   ))
            ORDER BY severity DESC, amount_mxn_low DESC NULLS LAST
            """,
            (sector_id, sector_id),
        ).fetchall()

    result = [_row_to_list_item(r) for r in rows]
    _set(cache_key, result)
    return result


@router.get("/{slug}")
def get_case(slug: str):
    """Full detail for a single scandal case, including linked vendors from ground truth."""
    cache_key = f"detail:{slug}"
    cached = _get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM procurement_scandals WHERE slug = ? AND is_verified = 1",
            (slug,),
        ).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail=f"Case '{slug}' not found")

        result = _row_to_detail(row)

        # Add linked_vendors from ground_truth if this scandal has a ground_truth_case_id
        linked_vendors = []
        gt_case_id = row["ground_truth_case_id"]
        if gt_case_id:
            vendor_rows = conn.execute("""
                SELECT gtv.vendor_id, gtv.vendor_name_source, gtv.role,
                       gtv.evidence_strength, gtv.match_method,
                       v.name as vendor_name,
                       COUNT(c.id) as contract_count,
                       AVG(c.risk_score) as avg_risk_score
                FROM ground_truth_vendors gtv
                LEFT JOIN vendors v ON gtv.vendor_id = v.id
                LEFT JOIN contracts c ON c.vendor_id = gtv.vendor_id
                WHERE gtv.case_id = ?
                GROUP BY gtv.id
                ORDER BY contract_count DESC
                LIMIT 50
            """, (gt_case_id,)).fetchall()

            for vr in vendor_rows:
                linked_vendors.append({
                    "vendor_id": vr["vendor_id"],
                    "vendor_name": vr["vendor_name"] or vr["vendor_name_source"],
                    "role": vr["role"],
                    "evidence_strength": vr["evidence_strength"],
                    "match_method": vr["match_method"],
                    "contract_count": vr["contract_count"] or 0,
                    "avg_risk_score": round(vr["avg_risk_score"], 4) if vr["avg_risk_score"] else None,
                })

        result["linked_vendors"] = linked_vendors

    _set(cache_key, result)
    return result
