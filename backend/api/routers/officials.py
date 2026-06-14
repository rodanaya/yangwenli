"""
Officials API — Responsables de la Unidad Compradora (signing officers of record).

Reads the precomputed `official_risk_profiles` table (one row per
(official, institution), populated from contracts.responsible_uc, 2018+ window)
— so both endpoints are fast (no 3.1M-row scan). All risk values are an
indicador de riesgo del modelo, NOT an accusation: thin-n homonyms are a known
hazard, so both endpoints floor on contract volume and never lead with a raw
risk ranking of named individuals.
"""
import sqlite3
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Path, Query

from ..dependencies import get_db

router = APIRouter(prefix="/officials", tags=["officials"])

_MOVERS_NOTE = (
    "Responsables de la Unidad Compradora que firmaron en más de una institución "
    "· 2018+ (COMPRANET Estructura C/D). Indicador de riesgo del modelo — no es una acusación."
)
_PROFILE_NOTE = (
    "Responsable de la Unidad Compradora · 2018+ (COMPRANET Estructura C/D). "
    "Indicador de riesgo del modelo — no es una acusación."
)


# NOTE: /movers MUST be declared before /{name} so FastAPI matches the literal
# path first (otherwise "movers" is captured as a name).
@router.get("/movers")
def get_official_movers(
    limit: int = Query(40, ge=1, le=200, description="Max movers to return"),
    min_contracts: int = Query(50, ge=1, description="Minimum total contracts (volume floor — suppresses thin-n homonyms)"),
):
    """Officials who signed at MORE THAN ONE institution — the cross-institution
    rotation signal no single-entity surface can express. Volume-floored + sorted
    by institution count then volume (never a raw risk ranking)."""
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT official_name,
                       COUNT(DISTINCT institution_id)                                AS institution_count,
                       SUM(total_contracts)                                          AS total_contracts,
                       SUM(COALESCE(total_value_mxn, 0))                             AS total_value_mxn,
                       SUM(direct_award_pct * total_contracts) / SUM(total_contracts) AS direct_award_pct,
                       SUM(single_bid_pct  * total_contracts) / SUM(total_contracts) AS single_bid_pct,
                       SUM(avg_risk_score  * total_contracts) / SUM(total_contracts) AS avg_risk_score,
                       MIN(first_contract_year)                                      AS first_contract_year,
                       MAX(last_contract_year)                                       AS last_contract_year
                FROM official_risk_profiles
                GROUP BY official_name
                HAVING COUNT(DISTINCT institution_id) > 1 AND SUM(total_contracts) >= ?
                ORDER BY institution_count DESC, total_contracts DESC
                LIMIT ?
                """,
                (min_contracts, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []

        movers = [
            {
                "official_name": r["official_name"],
                "institution_count": r["institution_count"],
                "total_contracts": r["total_contracts"],
                "total_value_mxn": r["total_value_mxn"],
                "direct_award_pct": round(r["direct_award_pct"] or 0, 1),
                "single_bid_pct": round(r["single_bid_pct"] or 0, 1),
                "avg_risk_score": round(r["avg_risk_score"] or 0, 4),
                "first_contract_year": r["first_contract_year"],
                "last_contract_year": r["last_contract_year"],
            }
            for r in rows
        ]
        return {"movers": movers, "note": _MOVERS_NOTE, "data_available": len(movers) > 0}


@router.get("/{name}")
def get_official_profile(
    name: str = Path(..., description="Official name (responsible_uc — any case/accents; URL-encoded)"),
):
    """Per-institution rollup for one official across all their buying units —
    the aggregate the /contracts/:id OfficialCard links into."""
    decoded = unquote(name).strip()
    if not decoded:
        raise HTTPException(status_code=404, detail="Official name required")

    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT o.official_name, o.institution_id, i.name AS institution_name,
                       o.total_contracts, o.total_value_mxn, o.single_bid_pct,
                       o.direct_award_pct, o.avg_risk_score, o.vendor_diversity,
                       o.hhi_vendors, o.first_contract_year, o.last_contract_year
                FROM official_risk_profiles o
                LEFT JOIN institutions i ON i.id = o.institution_id
                WHERE UPPER(TRIM(o.official_name)) = UPPER(TRIM(?))
                ORDER BY o.total_contracts DESC
                """,
                (decoded,),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []

        if not rows:
            raise HTTPException(status_code=404, detail="Official not found or below the contract floor")

        institutions = [
            {
                "institution_id": r["institution_id"],
                "institution_name": r["institution_name"],
                "total_contracts": r["total_contracts"],
                "total_value_mxn": r["total_value_mxn"],
                "direct_award_pct": round(r["direct_award_pct"] or 0, 1),
                "single_bid_pct": round(r["single_bid_pct"] or 0, 1),
                "avg_risk_score": round(r["avg_risk_score"] or 0, 4),
                "vendor_diversity": r["vendor_diversity"],
                "hhi_vendors": round(r["hhi_vendors"] or 0, 1),
                "first_contract_year": r["first_contract_year"],
                "last_contract_year": r["last_contract_year"],
            }
            for r in rows
        ]

        total_contracts = sum(i["total_contracts"] or 0 for i in institutions)
        total_value = sum(i["total_value_mxn"] or 0 for i in institutions)
        first_years = [i["first_contract_year"] for i in institutions if i["first_contract_year"] is not None]
        last_years = [i["last_contract_year"] for i in institutions if i["last_contract_year"] is not None]

        def _weighted(field):
            if total_contracts == 0:
                return 0.0
            return sum((i[field] or 0) * (i["total_contracts"] or 0) for i in institutions) / total_contracts

        summary = {
            "total_contracts": total_contracts,
            "total_value_mxn": total_value,
            "institution_count": len(institutions),
            "direct_award_pct": round(_weighted("direct_award_pct"), 1),
            "single_bid_pct": round(_weighted("single_bid_pct"), 1),
            "avg_risk_score": round(_weighted("avg_risk_score"), 4),
            "first_contract_year": min(first_years) if first_years else None,
            "last_contract_year": max(last_years) if last_years else None,
        }

        return {
            "official_name": rows[0]["official_name"],
            "summary": summary,
            "institutions": institutions,
            "note": _PROFILE_NOTE,
        }
