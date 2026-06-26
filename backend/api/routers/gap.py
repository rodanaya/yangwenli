"""Post-CompraNet gap API — the 2025-2026 awards recovered by scraping ComprasMX
after the federal bulk feed froze (Sep 28 2025). Served from the `gap_contracts`
staging table (NOT the scored corpus): procedure-level for all, OCR-recovered
vendor + real amount for the top-value direct awards."""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
import sqlite3

from ..dependencies import get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gap", tags=["gap"])

SECTOR_NAMES = {1: "salud", 2: "educacion", 3: "infraestructura", 4: "energia",
                5: "defensa", 6: "tecnologia", 7: "hacienda", 8: "gobernacion",
                9: "agricultura", 10: "ambiente", 11: "trabajo", 12: "otros"}


def _has_table(db: sqlite3.Connection) -> bool:
    return db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='gap_contracts'").fetchone() is not None


@router.get("/summary")
def gap_summary(db: sqlite3.Connection = Depends(get_db_dep)) -> Dict[str, Any]:
    if not _has_table(db):
        return {"available": False}
    r = db.execute("""
        SELECT COUNT(*) total,
          SUM(CASE WHEN CAST(amount_mxn_recovered AS REAL)>0 THEN 1 ELSE 0 END) recovered_n,
          COALESCE(SUM(CAST(amount_mxn_recovered AS REAL)),0) recovered_sum,
          SUM(CASE WHEN CAST(is_direct_award AS INT)=1 THEN 1 ELSE 0 END) da_n,
          SUM(CASE WHEN CAST(is_young_vendor AS INT)=1 THEN 1 ELSE 0 END) young_n,
          SUM(CASE WHEN CAST(efos_flag AS INT)=1 THEN 1 ELSE 0 END) efos_n,
          COALESCE(SUM(CAST(amount_mxn_best AS REAL)),0) best_sum
        FROM gap_contracts""").fetchone()
    total = r["total"] or 1
    by_exc = [{"article": x["exception_article"], "count": x["n"]}
              for x in db.execute("""SELECT exception_article, COUNT(*) n FROM gap_contracts
                WHERE exception_article IS NOT NULL AND exception_article<>''
                GROUP BY 1 ORDER BY 2 DESC LIMIT 8""")]
    by_sector = [{"sector_id": int(x["sector_id"]) if x["sector_id"] else 12,
                  "sector": SECTOR_NAMES.get(int(x["sector_id"]) if x["sector_id"] else 12, "otros"),
                  "count": x["n"]}
                 for x in db.execute("""SELECT sector_id, COUNT(*) n FROM gap_contracts
                   GROUP BY 1 ORDER BY 2 DESC LIMIT 12""")]
    by_risk = {x["gap_risk_level"]: x["n"]
               for x in db.execute("""SELECT gap_risk_level, COUNT(*) n FROM gap_contracts
                 WHERE gap_risk_level IS NOT NULL GROUP BY 1""")}
    worst = [{"siglas": x["institution_siglas"], "avg_score": round(x["a"], 1), "count": x["n"]}
             for x in db.execute("""SELECT institution_siglas, AVG(gap_risk_score) a, COUNT(*) n
               FROM gap_contracts WHERE institution_siglas IS NOT NULL AND gap_risk_score IS NOT NULL
               GROUP BY 1 HAVING n>=50 ORDER BY a DESC LIMIT 10""")]
    return {
        "available": True,
        "total_contracts": r["total"],
        "direct_award_count": r["da_n"],
        "direct_award_pct": round(100.0 * r["da_n"] / total, 1),
        "recovered_count": r["recovered_n"],
        "recovered_sum_mxn": r["recovered_sum"],
        "best_available_sum_mxn": r["best_sum"],
        "young_vendor_count": r["young_n"],
        "efos_count": r["efos_n"],
        "by_exception_article": by_exc,
        "by_sector": by_sector,
        "by_risk_level": {k: by_risk.get(k, 0) for k in ("critical", "high", "medium", "low")},
        "worst_institutions": worst,
        "grade_methodology": (
            "Structural red-flag indicator (0-100), NOT the v0.8.5 corruption model — "
            "post-horizon data lacks its features. Built from observable flags: "
            "no-competition, undisclosed amount, discretionary sole-source exception "
            "(Art.54 fr.I/II/III/V/VII), ghost vendor (<3yr), SAT 69-B (EFOS), vendor "
            "concentration, and magnitude. Art.55 low-value threshold scores lower."
        ),
        "data_window": "2025-09-28 .. 2026-06",
        "source": "ComprasMX (post-CompraNet) — staging, not scored",
    }


@router.get("/contracts")
def gap_contracts(
    db: sqlite3.Connection = Depends(get_db_dep),
    direct_award: Optional[int] = Query(None, ge=0, le=1),
    sector_id: Optional[int] = Query(None),
    recovered_only: bool = Query(False),
    young_only: bool = Query(False),
    q: Optional[str] = Query(None, max_length=120),
    sort: str = Query("risk", pattern="^(amount|date|risk)$"),
    risk_level: Optional[str] = Query(None, pattern="^(critical|high|medium|low)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
) -> Dict[str, Any]:
    if not _has_table(db):
        return {"data": [], "pagination": {"page": 1, "per_page": per_page, "total": 0, "total_pages": 0}}
    where, params = ["1=1"], []
    if direct_award is not None:
        where.append("CAST(is_direct_award AS INT)=?"); params.append(direct_award)
    if sector_id is not None:
        where.append("CAST(sector_id AS INT)=?"); params.append(sector_id)
    if recovered_only:
        where.append("CAST(amount_mxn_recovered AS REAL)>0")
    if young_only:
        where.append("CAST(is_young_vendor AS INT)=1")
    if risk_level:
        where.append("gap_risk_level=?"); params.append(risk_level)
    if q:
        where.append("(title LIKE ? OR vendor LIKE ? OR institution_name LIKE ? OR institution_siglas LIKE ?)")
        like = f"%{q}%"; params += [like, like, like, like]
    wsql = " AND ".join(where)
    total = db.execute(f"SELECT COUNT(*) n FROM gap_contracts WHERE {wsql}", params).fetchone()["n"]
    order = ("gap_risk_score DESC" if sort == "risk"
             else "CAST(amount_mxn_best AS REAL) DESC" if sort == "amount"
             else "publication_date DESC")
    rows = db.execute(f"""
        SELECT procedure_number, title, institution_name, institution_siglas, sector_id,
               procedure_type, is_direct_award, exception_article, cucop_primary,
               vendor, vendor_rfc, vendor_incorp_year, is_young_vendor, efos_flag,
               amount_mxn_recovered, amount_mxn_best, amount_source, publication_date,
               procedure_character, award_contract_number,
               gap_risk_score, gap_risk_level, flag_no_amount, flag_big_amount, flag_concentration
        FROM gap_contracts WHERE {wsql}
        ORDER BY {order} LIMIT ? OFFSET ?""",
        params + [per_page, (page - 1) * per_page]).fetchall()
    data: List[Dict[str, Any]] = []
    for x in rows:
        sid = int(x["sector_id"]) if x["sector_id"] else 12
        data.append({
            "procedure_number": x["procedure_number"],
            "title": x["title"],
            "institution": x["institution_name"],
            "institution_siglas": x["institution_siglas"],
            "sector_id": sid, "sector": SECTOR_NAMES.get(sid, "otros"),
            "procedure_type": x["procedure_type"],
            "is_direct_award": bool(int(x["is_direct_award"] or 0)),
            "exception_article": x["exception_article"],
            "cucop": x["cucop_primary"],
            "vendor": x["vendor"],
            "vendor_rfc": x["vendor_rfc"],
            "vendor_incorp_year": x["vendor_incorp_year"],
            "is_young_vendor": bool(int(x["is_young_vendor"] or 0)),
            "efos_flag": bool(int(x["efos_flag"] or 0)),
            "amount_recovered": float(x["amount_mxn_recovered"]) if x["amount_mxn_recovered"] else None,
            "amount_best": float(x["amount_mxn_best"]) if x["amount_mxn_best"] else None,
            "amount_source": x["amount_source"],
            "publication_date": x["publication_date"],
            "character": x["procedure_character"],
            "contract_number": x["award_contract_number"],
            "risk_score": float(x["gap_risk_score"]) if x["gap_risk_score"] is not None else None,
            "risk_level": x["gap_risk_level"],
            "flag_no_amount": bool(int(x["flag_no_amount"] or 0)),
            "flag_big_amount": bool(int(x["flag_big_amount"] or 0)),
            "flag_concentration": bool(int(x["flag_concentration"] or 0)),
        })
    return {
        "data": data,
        "pagination": {"page": page, "per_page": per_page, "total": total,
                       "total_pages": (total + per_page - 1) // per_page},
    }
