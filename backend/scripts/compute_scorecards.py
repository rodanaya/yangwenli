#!/usr/bin/env python3
"""
Compute Procurement Integrity Scores for institutions and vendors.

Institution Procurement Integrity Score (IPIS) — 0 to 100, 5 pillars of 0-20:
  1. Openness (0-20)          : competitive rate, single-bid penalty
  2. Price Integrity (0-20)   : risk-flagged rate, year-end rush, splitting
  3. Vendor Independence (0-20): HHI concentration, vendor diversity ratio
  4. Process Transparency (0-20): ad-period adequacy, short-ad rate
  5. External Flags (0-20)    : EFOS vendors used, ARIA T1/T2 vendors contracted

Vendor Integrity Score (VIS) — 0 to 100, higher = cleaner:
  1. Risk Signal (0-25)       : ML avg risk score, inverted
  2. Conduct (0-20)           : direct-award rate vs sector norm
  3. Institutional Spread (0-20): institution capture indicator
  4. Behavioral Patterns (0-20): high-risk pct, single-bid pct
  5. External Flags (0-15)    : EFOS, SFP, ARIA tier, GT confirmation

Grade tiers (10 bands for maximum distribution diversity):
  90-100: S   Modelo           #10b981
  80-89:  A   Sólido           #22c55e
  70-79:  B+  Sobresaliente    #84cc16
  60-69:  B   Adecuado         #eab308
  50-59:  C+  Atención         #f59e0b
  40-49:  C   Preocupante      #f97316
  30-39:  D   Alto Riesgo      #ef4444
  20-29:  D-  Grave            #dc2626
  10-19:  F   Crítico          #991b1b
   0-9:   F-  Bandera Roja     #450a0a
"""

import json
import logging
import math
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

GRADE_TIERS = [
    (90, "S",  "Modelo",        "#10b981"),
    (80, "A",  "Sólido",        "#22c55e"),
    (70, "B+", "Sobresaliente", "#84cc16"),
    (60, "B",  "Adecuado",      "#eab308"),
    (50, "C+", "Atención",      "#f59e0b"),
    (40, "C",  "Preocupante",   "#f97316"),
    (30, "D",  "Alto Riesgo",   "#ef4444"),
    (20, "D-", "Grave",         "#dc2626"),
    (10, "F",  "Crítico",       "#991b1b"),
    (0,  "F-", "Bandera Roja",  "#450a0a"),
]


def get_grade(score: float) -> tuple[str, str, str]:
    for threshold, code, label, color in GRADE_TIERS:
        if score >= threshold:
            return code, label, color
    return "F-", "Bandera Roja", "#450a0a"


# ---------------------------------------------------------------------------
# INSTITUTIONS
# ---------------------------------------------------------------------------

def _load_institution_base(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("""
        SELECT
            i.id,
            i.name,
            COALESCE(i.sector_id, 12) as sector_id,
            i.institution_type,
            ist.total_contracts,
            ist.total_value_mxn,
            ist.avg_risk_score,
            ist.high_risk_pct,
            ist.direct_award_pct,
            ist.single_bid_pct,
            ist.vendor_count
        FROM institutions i
        JOIN institution_stats ist ON i.id = ist.institution_id
        WHERE ist.total_contracts >= 10
    """).fetchall()
    cols = ["id", "name", "sector_id", "inst_type",
            "total_contracts", "total_value", "avg_risk",
            "high_risk_pct", "da_pct", "single_pct", "vendor_count"]
    return [dict(zip(cols, r)) for r in rows]


def _load_contract_metrics(conn: sqlite3.Connection) -> dict[int, dict]:
    # Split-rate proxy: same vendor+institution+contract_date having >=3 contracts
    rows = conn.execute("""
        SELECT
            institution_id,
            AVG(CAST(is_year_end AS REAL))                                             AS year_end_rate,
            AVG(CASE WHEN publication_delay_days < 15 AND is_direct_award = 0
                     THEN 1.0 ELSE 0.0 END)                                           AS short_ad_rate,
            AVG(CASE WHEN is_direct_award = 0 AND publication_delay_days BETWEEN 0 AND 365
                     THEN CAST(publication_delay_days AS REAL) ELSE NULL END)         AS avg_ad_days
        FROM contracts
        GROUP BY institution_id
    """).fetchall()

    # Splitting proxy: vendor with >=3 contracts to same institution on same day
    split_rows = conn.execute("""
        SELECT institution_id,
               CAST(SUM(is_split) AS REAL) / COUNT(*) AS split_rate
        FROM (
            SELECT institution_id,
                   CASE WHEN grp_cnt >= 3 THEN 1 ELSE 0 END AS is_split
            FROM (
                SELECT institution_id, vendor_id, contract_date,
                       COUNT(*) OVER (PARTITION BY institution_id, vendor_id, contract_date) AS grp_cnt
                FROM contracts
                WHERE contract_date IS NOT NULL
            )
        )
        GROUP BY institution_id
    """).fetchall()
    split_map = {r[0]: r[1] or 0.0 for r in split_rows}

    return {
        r[0]: {
            "year_end_rate": r[1] or 0.0,
            "split_rate":    split_map.get(r[0], 0.0),
            "short_ad_rate": r[2] or 0.0,
            # NULL avg_ad_days means no competitive procedures → treat as 0 (worst case),
            # not 15.0 (which was giving free points to fully-DA institutions).
            "avg_ad_days":   r[3] if r[3] is not None else 0.0,
        }
        for r in rows
    }


def _load_institution_hhi(conn: sqlite3.Connection) -> dict[int, float]:
    rows = conn.execute("""
        WITH vv AS (
            SELECT institution_id, vendor_id, SUM(amount_mxn) AS vtotal
            FROM contracts
            WHERE amount_mxn > 0
            GROUP BY institution_id, vendor_id
        ),
        it AS (
            SELECT institution_id, SUM(vtotal) AS itotal
            FROM vv GROUP BY institution_id
        )
        SELECT vv.institution_id,
               SUM((vv.vtotal * vv.vtotal) / (it.itotal * it.itotal)) AS hhi
        FROM vv JOIN it ON vv.institution_id = it.institution_id
        GROUP BY vv.institution_id
    """).fetchall()
    return {r[0]: min(1.0, r[1] or 0.5) for r in rows}


def _load_institution_efos(conn: sqlite3.Connection) -> dict[int, int]:
    try:
        rows = conn.execute("""
            SELECT c.institution_id, COUNT(DISTINCT v.id)
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.id
            JOIN sat_efos_vendors se ON v.rfc = se.rfc AND se.stage = 'definitivo'
            GROUP BY c.institution_id
        """).fetchall()
        return {r[0]: r[1] for r in rows}
    except Exception:
        return {}


def _load_institution_aria(conn: sqlite3.Connection) -> dict[int, dict]:
    try:
        rows = conn.execute("""
            SELECT c.institution_id,
                   SUM(CASE WHEN aq.ips_tier = 1 THEN 1 ELSE 0 END) AS t1,
                   SUM(CASE WHEN aq.ips_tier = 2 THEN 1 ELSE 0 END) AS t2
            FROM contracts c
            JOIN aria_queue aq ON c.vendor_id = aq.vendor_id
            GROUP BY c.institution_id
        """).fetchall()
        return {r[0]: {"t1": r[1] or 0, "t2": r[2] or 0} for r in rows}
    except Exception:
        return {}


def score_institution(inst: dict, cm: dict, hhi: float,
                      efos_count: int, aria: dict) -> dict:
    avg_risk     = inst["avg_risk"]  or 0.0
    da_pct       = inst["da_pct"]    or 0.0
    single_pct   = inst["single_pct"] or 0.0
    high_risk    = inst["high_risk_pct"] or 0.0
    vendor_count = inst["vendor_count"] or 0
    total_c      = inst["total_contracts"] or 1

    year_end     = cm.get("year_end_rate", 0.0)
    split_rate   = cm.get("split_rate",    0.0)
    short_ad     = cm.get("short_ad_rate", 0.0)
    avg_ad       = cm.get("avg_ad_days",   15.0)

    # Pillar 1: OPENNESS (0-20)
    competitive  = 1.0 - da_pct
    base_open    = min(14.0, max(0.0, (competitive - 0.05) / 0.55 * 14.0))
    single_pts   = max(0.0, 6.0 - single_pct * 30.0)
    p_openness   = min(20.0, base_open + single_pts)

    # Pillar 2: PRICE INTEGRITY (0-20)
    risk_pts     = max(0.0, 10.0 - high_risk * 40.0)   # 25%+ = 0
    yearend_pts  = max(0.0, 5.0 - max(0.0, year_end - 0.10) * 25.0)
    split_pts    = max(0.0, 5.0 - split_rate * 25.0)
    p_price      = min(20.0, risk_pts + yearend_pts + split_pts)

    # Pillar 3: VENDOR INDEPENDENCE (0-20)
    # Log-transform HHI: linear gives no discrimination in normal 0.01–0.10 range.
    # Formula maps HHI=0→10, HHI=0.10→7.2, HHI=0.30→4.3, HHI=1.0→0
    hhi_log      = 1.0 - math.log(1.0 + hhi * 9.0) / math.log(10.0)
    hhi_pts      = min(10.0, max(0.0, hhi_log * 10.0))
    vd_ratio     = min(1.0, vendor_count / total_c)
    diversity_pt = min(10.0, vd_ratio * 20.0)
    p_vendors    = min(20.0, hhi_pts + diversity_pt)

    # Pillar 4: PROCESS TRANSPARENCY (0-20)
    ad_pts       = min(10.0, max(0.0, (avg_ad - 5.0) / 25.0 * 10.0))
    shortad_pts  = max(0.0, 10.0 - short_ad * 50.0)
    p_process    = min(20.0, ad_pts + shortad_pts)

    # Pillar 5: EXTERNAL FLAGS (0-20)
    # avg_risk drives most of the signal (>0.15 starts costing; >0.55 = -10 pts max)
    risk_pen     = min(10.0, max(0.0, (avg_risk - 0.15) / 0.40 * 10.0))
    efos_pen     = min(8.0,  efos_count * 2.0)
    t1_pen       = min(5.0,  aria["t1"] * 1.5)
    t2_pen       = min(3.0,  aria["t2"] * 0.75)
    p_external   = max(0.0, 20.0 - risk_pen - efos_pen - t1_pen - t2_pen)

    total = p_openness + p_price + p_vendors + p_process + p_external
    code, label, color = get_grade(total)

    # Identify worst driver (normalized to 0-1 scale)
    pillars = {
        "Apertura y Competencia":       p_openness / 20.0,
        "Integridad de Precios":        p_price    / 20.0,
        "Independencia de Proveedores": p_vendors  / 20.0,
        "Transparencia de Proceso":     p_process  / 20.0,
        "Alertas Externas":             p_external / 20.0,
    }
    worst = min(pillars, key=pillars.get)

    key_metrics = {
        "competitive_rate": round(competitive, 3),
        "single_bid_pct":   round(single_pct, 3),
        "high_risk_pct":    round(high_risk, 3),
        "year_end_rate":    round(year_end, 3),
        "hhi":              round(hhi, 3),
        "vendor_count":     vendor_count,
        "efos_vendors":     efos_count,
        "aria_t1_vendors":  aria["t1"],
        "aria_t2_vendors":  aria["t2"],
        "avg_ad_days":      round(avg_ad, 1),
    }

    return {
        "institution_id":  inst["id"],
        "total_score":     round(total, 1),
        "grade":           code,
        "grade_label":     label,
        "grade_color":     color,
        "pillar_openness": round(p_openness, 1),
        "pillar_price":    round(p_price, 1),
        "pillar_vendors":  round(p_vendors, 1),
        "pillar_process":  round(p_process, 1),
        "pillar_external": round(p_external, 1),
        "top_risk_driver": worst,
        "key_metrics":     json.dumps(key_metrics),
    }


def compute_institution_scorecards(conn: sqlite3.Connection) -> list[dict]:
    log.info("Loading institution base data …")
    base     = _load_institution_base(conn)
    log.info("  %d institutions (≥10 contracts)", len(base))

    log.info("Loading contract metrics …")
    cm_map   = _load_contract_metrics(conn)

    log.info("Computing vendor HHI per institution (slow query) …")
    hhi_map  = _load_institution_hhi(conn)

    log.info("Loading EFOS vendor counts per institution …")
    efos_map = _load_institution_efos(conn)

    log.info("Loading ARIA tier counts per institution …")
    aria_map = _load_institution_aria(conn)

    results = []
    for inst in base:
        iid = inst["id"]
        rec = score_institution(
            inst,
            cm_map.get(iid, {}),
            hhi_map.get(iid, 0.5),
            efos_map.get(iid, 0),
            aria_map.get(iid, {"t1": 0, "t2": 0}),
        )
        results.append(rec)

    # Compute percentiles
    scores  = sorted([r["total_score"] for r in results])
    n       = len(scores)
    score_to_pct = {s: (i + 1) / n for i, s in enumerate(scores)}

    for r in results:
        r["national_percentile"] = round(score_to_pct.get(r["total_score"], 0.5), 3)

    return results


# ---------------------------------------------------------------------------
# VENDORS
# ---------------------------------------------------------------------------

def _load_vendor_base(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("""
        SELECT
            vs.vendor_id,
            vs.avg_risk_score,
            vs.high_risk_pct,
            vs.direct_award_pct,
            vs.single_bid_pct,
            vs.total_contracts,
            vs.total_value_mxn,
            vs.first_contract_year,
            vs.last_contract_year,
            vs.sector_count,
            vs.institution_count,
            COALESCE(aq.ips_tier, 4)           AS aria_tier,
            COALESCE(aq.direct_award_rate, vs.direct_award_pct) AS da_rate,
            COALESCE(aq.is_efos_definitivo, 0) AS is_efos,
            COALESCE(aq.is_sfp_sanctioned, 0)  AS is_sfp,
            COALESCE(aq.review_status, '')     AS review_status,
            COALESCE(aq.fp_structural_monopoly, 0) AS is_structural_fp,
            COALESCE(aq.primary_sector_id, 12) AS sector_id
        FROM vendor_stats vs
        LEFT JOIN aria_queue aq ON vs.vendor_id = aq.vendor_id
        WHERE vs.total_contracts >= 3
    """).fetchall()
    cols = [
        "vendor_id", "avg_risk", "high_risk_pct", "da_pct", "single_pct",
        "total_contracts", "total_value", "first_year", "last_year",
        "sector_count", "institution_count",
        "aria_tier", "da_rate", "is_efos", "is_sfp", "review_status",
        "is_structural_fp", "sector_id",
    ]
    return [dict(zip(cols, r)) for r in rows]


def _load_sector_da_norms(conn: sqlite3.Connection) -> dict[int, float]:
    """Sector-average direct-award rate from aria_queue."""
    rows = conn.execute("""
        SELECT primary_sector_id, AVG(direct_award_rate)
        FROM aria_queue
        WHERE primary_sector_id IS NOT NULL
        GROUP BY primary_sector_id
    """).fetchall()
    national = 0.70
    norms = {r[0]: r[1] for r in rows if r[1] is not None}
    return norms


def score_vendor(v: dict, sector_da_norm: float) -> dict:
    avg_risk   = v["avg_risk"]        or 0.0
    high_risk  = v["high_risk_pct"]   or 0.0
    da_rate    = v["da_rate"]         or v["da_pct"] or 0.0
    single_pct = v["single_pct"]      or 0.0
    inst_count = v["institution_count"] or 1
    sec_count  = v["sector_count"]    or 1
    first_year = v["first_year"]      or 2002
    last_year  = v["last_year"]       or 2025
    aria_tier  = v["aria_tier"]       or 4
    is_efos    = bool(v["is_efos"])
    is_sfp     = bool(v["is_sfp"])
    is_gt_confirmed = v["review_status"] == "confirmed_corrupt"
    is_structural_fp = bool(v["is_structural_fp"])

    # Structural monopolies (Gilead, Sanofi, etc.) — exempt concentration penalty
    structural_exempt = is_structural_fp

    # Pillar 1: RISK SIGNAL (0-25) — ML model, inverted
    # Steeper nonlinear curve: avg_risk=0→25, 0.20→12.5, 0.40→0 pts
    p_risk = min(25.0, max(0.0, 25.0 * (1.0 - min(1.0, avg_risk * 2.5))))

    # Pillar 2: CONDUCT (0-20) — DA rate vs sector norm
    # Excess above sector norm penalised; structural FPs exempt.
    # Removed +0.05 buffer (was masking mildly-excessive DA rates).
    # Increased multiplier 40→60 for steeper slope.
    if structural_exempt:
        p_conduct = 20.0
    else:
        da_excess = max(0.0, da_rate - sector_da_norm)
        p_conduct = max(0.0, 20.0 - da_excess * 60.0)

    # Pillar 3: INSTITUTIONAL SPREAD (0-20) — capture indicator
    if structural_exempt:
        p_spread = 20.0
    else:
        years_active = max(1, last_year - first_year + 1)
        inst_norm    = min(1.0, inst_count / max(1, years_active * 3))
        inst_pts     = min(12.0, inst_norm * 12.0)
        sec_pts      = min(8.0,  (sec_count - 1) * 2.0)
        p_spread     = min(20.0, inst_pts + sec_pts)

    # Pillar 4: BEHAVIORAL PATTERNS (0-20) — high-risk pct, single-bid
    behavior_pts  = 20.0 * (1.0 - min(1.0, high_risk * 2.0))
    single_pen    = min(5.0, single_pct * 10.0)
    p_behavior    = max(0.0, min(20.0, behavior_pts - single_pen))

    # Pillar 5: EXTERNAL FLAGS (0-15)
    if is_gt_confirmed:
        p_flags = 0.0
    else:
        base = 15.0
        if is_efos:                  base -= 10.0
        if is_sfp:                   base -= 8.0
        if aria_tier == 1:           base -= 10.0
        elif aria_tier == 2:         base -= 7.0
        elif aria_tier == 3:         base -= 3.0
        p_flags = max(0.0, base)

    total = p_risk + p_conduct + p_spread + p_behavior + p_flags
    code, label, color = get_grade(total)

    pillars = {
        "Señal de Riesgo ML":          p_risk     / 25.0,
        "Conducta de Mercado":         p_conduct  / 20.0,
        "Diversificación Institucional": p_spread / 20.0,
        "Patrones de Comportamiento":  p_behavior / 20.0,
        "Alertas Externas":            p_flags    / 15.0,
    }
    worst = min(pillars, key=pillars.get)

    key_metrics = {
        "avg_risk_score": round(avg_risk, 3),
        "high_risk_pct":  round(high_risk, 3),
        "da_rate":        round(da_rate, 3),
        "sector_da_norm": round(sector_da_norm, 3),
        "single_pct":     round(single_pct, 3),
        "inst_count":     inst_count,
        "sector_count":   sec_count,
        "aria_tier":      aria_tier,
        "is_efos":        is_efos,
        "is_sfp":         is_sfp,
        "structural_fp":  is_structural_fp,
    }

    return {
        "vendor_id":          v["vendor_id"],
        "total_score":        round(total, 1),
        "grade":              code,
        "grade_label":        label,
        "grade_color":        color,
        "pillar_risk_signal": round(p_risk, 1),
        "pillar_conduct":     round(p_conduct, 1),
        "pillar_spread":      round(p_spread, 1),
        "pillar_behavior":    round(p_behavior, 1),
        "pillar_flags":       round(p_flags, 1),
        "top_risk_driver":    worst,
        "key_metrics":        json.dumps(key_metrics),
    }


def compute_vendor_scorecards(conn: sqlite3.Connection) -> list[dict]:
    log.info("Loading vendor base data …")
    base         = _load_vendor_base(conn)
    log.info("  %d vendors (≥3 contracts)", len(base))

    log.info("Loading sector DA norms …")
    da_norms     = _load_sector_da_norms(conn)

    results = []
    for v in base:
        norm = da_norms.get(v["sector_id"], 0.70)
        results.append(score_vendor(v, norm))

    # Percentile within sector
    from collections import defaultdict
    by_sector: dict[int, list] = defaultdict(list)
    for i, (v, r) in enumerate(zip(base, results)):
        by_sector[v["sector_id"]].append((r["total_score"], i))

    sector_pcts = {}
    for sid, items in by_sector.items():
        items_sorted = sorted(items, key=lambda x: x[0])
        ns = len(items_sorted)
        for rank, (_, orig_idx) in enumerate(items_sorted):
            sector_pcts[orig_idx] = round((rank + 1) / ns, 3)

    scores      = sorted([r["total_score"] for r in results])
    n           = len(scores)
    nat_pct_map = {s: round((i + 1) / n, 3) for i, s in enumerate(scores)}

    for i, r in enumerate(results):
        r["sector_percentile"]   = sector_pcts.get(i, 0.5)
        r["national_percentile"] = nat_pct_map.get(r["total_score"], 0.5)

    return results


# ---------------------------------------------------------------------------
# DB WRITE
# ---------------------------------------------------------------------------

def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS institution_scorecards (
            institution_id       INTEGER PRIMARY KEY,
            total_score          REAL    NOT NULL DEFAULT 0,
            grade                TEXT    NOT NULL DEFAULT 'F-',
            grade_label          TEXT    NOT NULL DEFAULT 'Bandera Roja',
            grade_color          TEXT    NOT NULL DEFAULT '#450a0a',
            pillar_openness      REAL    NOT NULL DEFAULT 0,
            pillar_price         REAL    NOT NULL DEFAULT 0,
            pillar_vendors       REAL    NOT NULL DEFAULT 0,
            pillar_process       REAL    NOT NULL DEFAULT 0,
            pillar_external      REAL    NOT NULL DEFAULT 0,
            national_percentile  REAL,
            top_risk_driver      TEXT,
            key_metrics          TEXT,
            computed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_isc_score ON institution_scorecards(total_score);
        CREATE INDEX IF NOT EXISTS idx_isc_grade ON institution_scorecards(grade);

        CREATE TABLE IF NOT EXISTS vendor_scorecards (
            vendor_id            INTEGER PRIMARY KEY,
            total_score          REAL    NOT NULL DEFAULT 0,
            grade                TEXT    NOT NULL DEFAULT 'F-',
            grade_label          TEXT    NOT NULL DEFAULT 'Bandera Roja',
            grade_color          TEXT    NOT NULL DEFAULT '#450a0a',
            pillar_risk_signal   REAL    NOT NULL DEFAULT 0,
            pillar_conduct       REAL    NOT NULL DEFAULT 0,
            pillar_spread        REAL    NOT NULL DEFAULT 0,
            pillar_behavior      REAL    NOT NULL DEFAULT 0,
            pillar_flags         REAL    NOT NULL DEFAULT 0,
            sector_percentile    REAL,
            national_percentile  REAL,
            top_risk_driver      TEXT,
            key_metrics          TEXT,
            computed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_vsc_score ON vendor_scorecards(total_score);
        CREATE INDEX IF NOT EXISTS idx_vsc_grade ON vendor_scorecards(grade);
    """)
    conn.commit()


def upsert_institutions(conn: sqlite3.Connection, rows: list[dict]) -> None:
    conn.execute("DELETE FROM institution_scorecards")
    conn.executemany("""
        INSERT INTO institution_scorecards
            (institution_id, total_score, grade, grade_label, grade_color,
             pillar_openness, pillar_price, pillar_vendors, pillar_process,
             pillar_external, national_percentile, top_risk_driver, key_metrics)
        VALUES
            (:institution_id, :total_score, :grade, :grade_label, :grade_color,
             :pillar_openness, :pillar_price, :pillar_vendors, :pillar_process,
             :pillar_external, :national_percentile, :top_risk_driver, :key_metrics)
    """, rows)
    conn.commit()
    log.info("  Saved %d institution scorecards", len(rows))


def upsert_vendors(conn: sqlite3.Connection, rows: list[dict]) -> None:
    conn.execute("DELETE FROM vendor_scorecards")
    # Batch insert in chunks to avoid excessive memory
    CHUNK = 5000
    for i in range(0, len(rows), CHUNK):
        conn.executemany("""
            INSERT INTO vendor_scorecards
                (vendor_id, total_score, grade, grade_label, grade_color,
                 pillar_risk_signal, pillar_conduct, pillar_spread, pillar_behavior,
                 pillar_flags, sector_percentile, national_percentile,
                 top_risk_driver, key_metrics)
            VALUES
                (:vendor_id, :total_score, :grade, :grade_label, :grade_color,
                 :pillar_risk_signal, :pillar_conduct, :pillar_spread, :pillar_behavior,
                 :pillar_flags, :sector_percentile, :national_percentile,
                 :top_risk_driver, :key_metrics)
        """, rows[i : i + CHUNK])
    conn.commit()
    log.info("  Saved %d vendor scorecards", len(rows))


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse
    p = argparse.ArgumentParser(description="Compute Procurement Integrity Scorecards")
    p.add_argument("--institutions-only", action="store_true")
    p.add_argument("--vendors-only",      action="store_true")
    p.add_argument("--db",                default=str(DB_PATH))
    args = p.parse_args()

    conn = sqlite3.connect(args.db, timeout=60)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 30000")

    log.info("Creating / verifying tables …")
    create_tables(conn)

    if not args.vendors_only:
        log.info("=== Computing Institution Scorecards ===")
        i_rows = compute_institution_scorecards(conn)
        upsert_institutions(conn, i_rows)
        # Print distribution
        grade_dist: dict[str, int] = {}
        for r in i_rows:
            grade_dist[r["grade"]] = grade_dist.get(r["grade"], 0) + 1
        log.info("Institution grade distribution: %s", dict(sorted(grade_dist.items())))

    if not args.institutions_only:
        log.info("=== Computing Vendor Scorecards ===")
        v_rows = compute_vendor_scorecards(conn)
        upsert_vendors(conn, v_rows)
        grade_dist2: dict[str, int] = {}
        for r in v_rows:
            grade_dist2[r["grade"]] = grade_dist2.get(r["grade"], 0) + 1
        log.info("Vendor grade distribution: %s", dict(sorted(grade_dist2.items())))

    conn.close()
    log.info("Done.")


if __name__ == "__main__":
    main()
