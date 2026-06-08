"""
Intersection — the model-vs-official-record reconciliation surface.

This router answers the one question that makes RUBLI not-replaceable:
"What does our model see that the official registries didn't?" — but it
answers it HONESTLY, which the v1 ("contradiction quadrants") version did
not. Three corrections are baked in here:

  1. The hero is the GHOST SIGNATURE, not raw high-risk. Raw "high risk +
     no registry" is dominated by legitimate scale (Halliburton, the
     national insurers) that trips price_volatility / vendor_concentration.
     We surface only the ghost/intermediary patterns (P2/P3), cleaned of
     fp_* structural flags — vendors carrying the SAME fingerprint SAT's
     Art. 69-B registry uses, that the registry never listed. That is an
     apples-to-apples "the list missed these" claim.

  2. CORROBORATION is split honestly. "Both methods agree" was ~93%
     self-confirmation: the model is trained on the ground-truth corpus, so
     of course it scores those vendors high. We separate genuine external
     corroboration (SAT EFOS / SFP) from self-documented (our own GT) so the
     reader sees the circularity instead of being sold past it.

  3. The old "blind spot = what the model missed" was the model working as
     designed (structural-FP suppression at risk≈0.05). It is reframed as
     the SET-ASIDE list — shown for auditability, not as a failure.

Reads aria_queue (≈249K federal vendors), which already pre-aggregates
vendor-level risk, pattern flags, fp_* structural flags, and external-
registry hits (EFOS, SFP, ground truth).
"""

import json
import logging
import sqlite3
import threading

from fastapi import APIRouter, Depends, HTTPException, Query

from ..cache import app_cache
from ..dependencies import get_db, get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intersection", tags=["intersection"])

_intersection_lock = threading.Lock()

# Risk thresholds aligned with the active model (see docs/RISK_METHODOLOGY_v6.md):
# Critical >= 0.60, High >= 0.40, Medium >= 0.25, Low < 0.25.
# High+ = "RUBLI flags"; < Medium = "RUBLI doesn't flag."
_RUBLI_FLAGS_THRESHOLD = 0.40   # High+ (Critical + High)
_RUBLI_CLEAN_THRESHOLD = 0.25   # below Medium (used by the drill-down)
_MIN_CONTRACTS = 5              # exclude one-off vendors from the ledger

# The ghost fingerprint: shell-company (P2) and intermediary (P3) patterns.
# These are the patterns that are apples-to-apples with SAT's Art. 69-B
# definition. P5/P6 (network/capture) and P1 dominate by VALUE but are full
# of legitimate scale — they belong in the "other uncorroborated" remainder,
# not in the headline "the registry missed these" claim.
_GHOST_PATTERNS = ("P2", "P3")
_ghost_in = ", ".join(f"'{p}'" for p in _GHOST_PATTERNS)

# Structural-scale set-aside: the model rates these high on market-structure
# features, not corruption. fp_* flags are aria_queue's own structural-FP
# markers; a value floor catches the legit majors that carry no fp_* flag
# (oilfield services, the national insurers) but obviously aren't ghosts.
_FP_CLEAN = (
    "fp_structural_monopoly=0 AND fp_patent_exception=0 "
    "AND fp_data_error=0 AND fp_penalty=0"
)
_SET_ASIDE_VALUE_FLOOR = 5_000_000_000  # 5B MXN — above this, "ghost" is implausible

# Pharma/medical-gas OEM structural FPs not yet caught by fp_* flags.
_STRUCTURAL_FP_NAMES = (
    'SANOFI', 'ASTRAZENECA', 'BOEHRINGER', 'ROCHE', 'NOVARTIS',
    'GILEAD', 'JANSSEN', 'AMGEN', 'TAKEDA', 'BAYER', 'KEDRION',
    'GRIFOLS', 'NOVO NORDISK', 'PFIZER', 'WYETH', 'MERCK', 'GLAXO',
    'ABBVIE', 'LILLY',
)
# Public-sector entities that occasionally receive contracts (inter-agency
# transfers) and trip the ghost/intermediary patterns — a police force or
# ministry is not a shell company. Tokens are ASCII-prefix-safe: SQLite
# UPPER/LIKE is ASCII-only, so 'POLIC' (not 'POLICÍA') matches "Policía …".
_PUBLIC_ENTITY_NAMES = (
    'POLIC', 'GUARDIA NACIONAL', 'GOBIERNO DE', 'MUNICIPIO',
    'AYUNTAMIENTO', 'PODER JUDICIAL',
)
# Module-level constants only (not user input) — f-string interpolation is safe.
_no_structural_fp = " AND ".join(
    f"UPPER(vendor_name) NOT LIKE '%{name}%'" for name in _STRUCTURAL_FP_NAMES
)
_no_public_entity = " AND ".join(
    f"UPPER(vendor_name) NOT LIKE '%{name}%'" for name in _PUBLIC_ENTITY_NAMES
)

# SQL fragments — module constants only.
_REG = "(is_efos_definitivo=1 OR is_sfp_sanctioned=1)"               # genuine external
_NOREG = "(is_efos_definitivo=0 AND is_sfp_sanctioned=0 AND in_ground_truth=0)"

_BASE_COLS = (
    "vendor_id, vendor_name, avg_risk_score, ips_final, ips_tier, "
    "primary_pattern, total_contracts, total_value_mxn, "
    "primary_sector_id, primary_sector_name, "
    "is_efos_definitivo, is_sfp_sanctioned, in_ground_truth, "
    "direct_award_rate, single_bid_rate, is_disappeared"
)


def _vendor_row(r: sqlite3.Row) -> dict:
    """Project an aria_queue row into the intersection DTO shape (with WHY fields)."""
    return {
        "vendor_id": r["vendor_id"],
        "vendor_name": r["vendor_name"],
        "avg_risk_score": r["avg_risk_score"],
        "ips_final": r["ips_final"],
        "ips_tier": r["ips_tier"],
        "primary_pattern": r["primary_pattern"],
        "total_contracts": r["total_contracts"],
        "total_value_mxn": r["total_value_mxn"],
        "primary_sector_id": r["primary_sector_id"],
        "primary_sector_name": r["primary_sector_name"],
        "is_efos_definitivo": bool(r["is_efos_definitivo"]),
        "is_sfp_sanctioned": bool(r["is_sfp_sanctioned"]),
        "in_ground_truth": bool(r["in_ground_truth"]),
        # WHY fields — turn a row into a mini-case, not an anonymous score.
        "direct_award_rate": r["direct_award_rate"],
        "single_bid_rate": r["single_bid_rate"],
        "is_disappeared": bool(r["is_disappeared"]),
    }


@router.get("/summary")
def get_intersection_summary(
    top_n: int = Query(20, ge=1, le=60, description="Ghost-ledger rows to return"),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """
    The Corroboration Ladder + the Ghost Ledger.

    Response:

    - **high_risk_total** — vendors at RUBLI risk ≥ 0.40 (the model-flag census).
    - **ladder** — that census split three honest ways:
        - `external_corroborated` — also on SAT EFOS or SFP (genuine outside match)
        - `self_documented` — only in RUBLI's own ground-truth corpus (circular:
          the model trained on these)
        - `uncorroborated` — on no registry at all
    - **ghost** — the pitch: `{count, vendors}`. Uncorroborated vendors carrying
      the ghost/intermediary fingerprint (patterns P2/P3), cleaned of structural
      FPs, ranked by IPS. The claim: "the registry never listed these."
    - **set_aside** — `{count, sample}`. Uncorroborated high-risk vendors set aside
      as legitimate scale (fp_* flags or value > 5B). Shown so the reader can audit
      what we excluded.
    - **external_sample** — what genuine external corroboration looks like (top
      EFOS/SFP hits).
    - **registry_breakdown** — where the external signal comes from.
    """
    conn.row_factory = sqlite3.Row

    cache_key = f"summary_v3:{top_n}"
    cached = app_cache.get("intersection", cache_key)
    if cached is not None:
        return cached

    # Persistent fallback: survives container restarts (the full scan is ~10-20s cold).
    db_key = f"intersection_summary_v3_{top_n}"
    try:
        row = conn.execute(
            "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?", (db_key,)
        ).fetchone()
        if row and row["stat_value"]:
            persisted = json.loads(row["stat_value"])
            app_cache.set("intersection", cache_key, persisted, maxsize=8, ttl=600)
            return persisted
    except Exception:
        pass

    # Mutex: only one worker runs the scans; others wait and re-check.
    with _intersection_lock:
        cached2 = app_cache.get("intersection", cache_key)
        if cached2 is not None:
            return cached2

        flags = _RUBLI_FLAGS_THRESHOLD

        # ── The ladder: one pass over the high-risk census ──────────────────
        ladder_row = conn.execute(
            f"""
            SELECT
                SUM(CASE WHEN {_REG} THEN 1 ELSE 0 END) AS external_corroborated,
                SUM(CASE WHEN in_ground_truth=1 AND NOT {_REG} THEN 1 ELSE 0 END) AS self_documented,
                SUM(CASE WHEN {_NOREG} THEN 1 ELSE 0 END) AS uncorroborated,
                COUNT(*) AS high_risk_total
            FROM aria_queue
            WHERE avg_risk_score >= {flags}
            """
        ).fetchone()
        ladder = {
            "external_corroborated": ladder_row["external_corroborated"] or 0,
            "self_documented": ladder_row["self_documented"] or 0,
            "uncorroborated": ladder_row["uncorroborated"] or 0,
        }
        high_risk_total = ladder_row["high_risk_total"] or 0

        # ── The Ghost Ledger: the pitch ─────────────────────────────────────
        ghost_where = (
            f"avg_risk_score >= {flags} AND {_NOREG} "
            f"AND total_contracts >= {_MIN_CONTRACTS} "
            f"AND primary_pattern IN ({_ghost_in}) "
            f"AND {_FP_CLEAN} AND {_no_structural_fp} AND {_no_public_entity}"
        )
        ghost_count = conn.execute(
            f"SELECT COUNT(*) FROM aria_queue WHERE {ghost_where}"
        ).fetchone()[0]
        ghost_vendors = [
            _vendor_row(r)
            for r in conn.execute(
                f"SELECT {_BASE_COLS} FROM aria_queue WHERE {ghost_where} "
                f"ORDER BY ips_final DESC LIMIT ?",
                (top_n,),
            ).fetchall()
        ]

        # ── Set-aside: legitimate scale we excluded (auditability) ──────────
        set_aside_where = (
            f"avg_risk_score >= {flags} AND {_NOREG} "
            f"AND (NOT ({_FP_CLEAN}) OR total_value_mxn > {_SET_ASIDE_VALUE_FLOOR})"
        )
        set_aside_count = conn.execute(
            f"SELECT COUNT(*) FROM aria_queue WHERE {set_aside_where}"
        ).fetchone()[0]
        set_aside_sample = [
            _vendor_row(r)
            for r in conn.execute(
                f"SELECT {_BASE_COLS} FROM aria_queue WHERE {set_aside_where} "
                f"ORDER BY total_value_mxn DESC LIMIT 6"
            ).fetchall()
        ]

        # ── External sample: what genuine corroboration looks like ──────────
        external_sample = [
            _vendor_row(r)
            for r in conn.execute(
                f"SELECT {_BASE_COLS} FROM aria_queue "
                f"WHERE avg_risk_score >= {flags} AND {_REG} "
                f"ORDER BY avg_risk_score DESC, total_value_mxn DESC LIMIT 6"
            ).fetchall()
        ]

        # ── Registry breakdown (transparency) ───────────────────────────────
        rb = conn.execute(
            """
            SELECT
                SUM(CASE WHEN is_efos_definitivo=1 THEN 1 ELSE 0 END) AS efos_hits,
                SUM(CASE WHEN is_sfp_sanctioned=1 THEN 1 ELSE 0 END) AS sfp_hits,
                SUM(CASE WHEN in_ground_truth=1 THEN 1 ELSE 0 END) AS gt_hits
            FROM aria_queue
            WHERE (is_efos_definitivo=1 OR is_sfp_sanctioned=1 OR in_ground_truth=1)
            """
        ).fetchone()

        response = {
            "thresholds": {
                "rubli_flags": _RUBLI_FLAGS_THRESHOLD,
                "rubli_clean": _RUBLI_CLEAN_THRESHOLD,
                "min_contracts": _MIN_CONTRACTS,
                "ghost_patterns": list(_GHOST_PATTERNS),
                "set_aside_value_floor": _SET_ASIDE_VALUE_FLOOR,
            },
            "high_risk_total": high_risk_total,
            "ladder": ladder,
            "ghost": {"count": ghost_count, "vendors": ghost_vendors},
            "set_aside": {"count": set_aside_count, "sample": set_aside_sample},
            "external_sample": external_sample,
            "registry_breakdown": {
                "efos_definitivo": rb["efos_hits"] or 0,
                "sfp_sanctioned": rb["sfp_hits"] or 0,
                "in_ground_truth": rb["gt_hits"] or 0,
            },
        }
        app_cache.set("intersection", cache_key, response, maxsize=8, ttl=600)

    # Persist outside the lock so a slow disk write doesn't block waiters.
    try:
        with get_db() as wconn:
            wconn.execute(
                "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at)"
                " VALUES(?, ?, datetime('now'))",
                (db_key, json.dumps(response, default=str)),
            )
            wconn.commit()
    except Exception as e:
        logger.warning("intersection_summary persist failed: %s", e)

    return response


@router.get("/quadrant/{quadrant}")
def get_quadrant_page(
    quadrant: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sector_id: int | None = Query(None, ge=1, le=12),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """
    Paginated drill-down. Valid quadrants:
      - **ghost** — the ghost-signature ledger (the pitch)
      - **uncorroborated** — all high-risk vendors on no registry
      - **set_aside** — legitimate-scale vendors excluded from the ledger
    """
    conn.row_factory = sqlite3.Row
    flags = _RUBLI_FLAGS_THRESHOLD

    if quadrant == "ghost":
        where_clause = (
            f"avg_risk_score >= {flags} AND {_NOREG} "
            f"AND total_contracts >= {_MIN_CONTRACTS} "
            f"AND primary_pattern IN ({_ghost_in}) "
            f"AND {_FP_CLEAN} AND {_no_structural_fp} AND {_no_public_entity}"
        )
        order = "ORDER BY ips_final DESC"
    elif quadrant == "uncorroborated":
        where_clause = f"avg_risk_score >= {flags} AND {_NOREG}"
        order = "ORDER BY ips_final DESC"
    elif quadrant == "set_aside":
        where_clause = (
            f"avg_risk_score >= {flags} AND {_NOREG} "
            f"AND (NOT ({_FP_CLEAN}) OR total_value_mxn > {_SET_ASIDE_VALUE_FLOOR})"
        )
        order = "ORDER BY total_value_mxn DESC"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown quadrant '{quadrant}'. Valid: ghost, uncorroborated, set_aside.",
        )

    params: list = []
    if sector_id is not None:
        where_clause += " AND primary_sector_id = ?"
        params.append(sector_id)

    total = conn.execute(
        f"SELECT COUNT(*) FROM aria_queue WHERE {where_clause}", params
    ).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(
        f"SELECT {_BASE_COLS} FROM aria_queue WHERE {where_clause} {order} LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()

    return {
        "quadrant": quadrant,
        "data": [_vendor_row(r) for r in rows],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }
