"""
Precompute the three slow per-category "signal" endpoints into precomputed_stats
(Day-10 /categories QA): competition / seasonality / patterns.

These power the dossier's § I «La Competencia» (ProcedureSplit) and § III «Las
Señales» (SeasonalityTell + AriaFingerprint). Run live they each do multi-scan
per-category aggregations over `contracts` (patterns also joins aria_queue via a
`vendor_id IN (SELECT … WHERE category_id=?)` subquery) and TIME OUT on the 5 GB
deploy DB (>12s → Caddy 504), so both sections silently never render. This writes
one precomputed_stats row per category per signal; categories.py reads them O(1)
(precompute-first, live query as fallback).

The output dicts MUST match the endpoint return shapes in
api/routers/categories.py (get_category_{competition,seasonality,patterns}) —
keep them in sync if those queries change. Idempotent (INSERT OR REPLACE).

Usage:
    python -m scripts._precompute_category_signals [DB_PATH]
    DB_PATH defaults to RUBLI_DEPLOY.db (run dir = backend/).
"""
import json
import sqlite3
import sys
import time
from datetime import datetime

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
PATTERN_META = {
    "P1": {"label_es": "Monopolio estructural", "label_en": "Structural monopoly",   "color": "#f87171"},
    "P2": {"label_es": "Empresa fantasma",      "label_en": "Ghost company",         "color": "#fb923c"},
    "P3": {"label_es": "Intermediario",         "label_en": "Intermediary",          "color": "#fbbf24"},
    "P4": {"label_es": "Red coordinada",        "label_en": "Coordinated network",   "color": "#a78bfa"},
    "P5": {"label_es": "Fraccionamiento",       "label_en": "Threshold splitting",   "color": "#60a5fa"},
    "P6": {"label_es": "Captura institucional", "label_en": "Institutional capture", "color": "#34d399"},
    "P7": {"label_es": "Patrón mixto",          "label_en": "Mixed pattern",         "color": "#94a3b8"},
}


def compute_competition(cur, cid, cat_name):
    cur.execute("""
        SELECT COALESCE(procedure_type_normalized, 'desconocido') AS proc_type,
               COUNT(*) AS cnt, COALESCE(SUM(amount_mxn), 0) AS val
        FROM contracts WHERE category_id = ?
        GROUP BY procedure_type_normalized ORDER BY cnt DESC
    """, (cid,))
    proc_rows = cur.fetchall()
    total_cnt = sum(r["cnt"] for r in proc_rows) or 1
    total_val = sum(r["val"] for r in proc_rows) or 1.0
    procedure_breakdown = [
        {"type": r["proc_type"], "count": r["cnt"],
         "pct_contracts": round(r["cnt"] * 100.0 / total_cnt, 1),
         "value": round(r["val"], 2), "pct_value": round(r["val"] * 100.0 / total_val, 1)}
        for r in proc_rows
    ]
    cur.execute("""
        SELECT contract_year AS year, COUNT(*) AS contracts,
               SUM(is_direct_award) * 100.0 / COUNT(*) AS da_pct,
               SUM(is_single_bid)   * 100.0 / COUNT(*) AS sb_pct
        FROM contracts
        WHERE category_id = ? AND contract_year BETWEEN 2010 AND 2025
        GROUP BY contract_year ORDER BY contract_year
    """, (cid,))
    yearly_trend = [
        {"year": r["year"], "contracts": r["contracts"],
         "da_pct": round(r["da_pct"] or 0, 1), "sb_pct": round(r["sb_pct"] or 0, 1)}
        for r in cur.fetchall()
    ]
    cur.execute("SELECT sector_id FROM category_stats WHERE category_id = ?", (cid,))
    sr = cur.fetchone()
    sector_id = sr["sector_id"] if sr else None
    sector_da_avg = sector_sb_avg = None
    if sector_id:
        cur.execute("""
            SELECT AVG(direct_award_pct) AS da_avg, AVG(single_bid_pct) AS sb_avg
            FROM category_stats WHERE sector_id = ? AND total_contracts >= 100
        """, (sector_id,))
        bm = cur.fetchone()
        if bm and bm["da_avg"] is not None:
            sector_da_avg = round(bm["da_avg"], 1)
            sector_sb_avg = round(bm["sb_avg"] or 0, 1)
    return {
        "category_id": cid, "category_name": cat_name, "sector_id": sector_id,
        "total_contracts": total_cnt, "procedure_breakdown": procedure_breakdown,
        "yearly_trend": yearly_trend, "sector_da_avg": sector_da_avg, "sector_sb_avg": sector_sb_avg,
    }


def compute_seasonality(cur, cid, cat_name):
    cur.execute("""
        SELECT contract_month AS month, COUNT(*) AS contracts,
               COALESCE(SUM(amount_mxn), 0) AS value
        FROM contracts
        WHERE category_id = ? AND contract_month BETWEEN 1 AND 12
          AND amount_mxn IS NOT NULL AND amount_mxn < 10000000000
        GROUP BY contract_month ORDER BY contract_month
    """, (cid,))
    rows = cur.fetchall()
    cur.execute("""
        SELECT contract_year AS year,
               SUM(CASE WHEN contract_month = 12 THEN amount_mxn ELSE 0 END) AS dec_val,
               SUM(amount_mxn) AS total_val, COUNT(*) AS total_cnt,
               SUM(CASE WHEN contract_month = 12 THEN 1 ELSE 0 END) AS dec_cnt
        FROM contracts
        WHERE category_id = ? AND contract_month BETWEEN 1 AND 12
          AND contract_year BETWEEN 2010 AND 2025
          AND amount_mxn IS NOT NULL AND amount_mxn < 10000000000
        GROUP BY contract_year ORDER BY contract_year
    """, (cid,))
    year_rows = cur.fetchall()
    total_val = sum(r["value"] for r in rows) or 1.0
    total_cnt = sum(r["contracts"] for r in rows) or 1
    monthly = [
        {"month": r["month"], "month_name": MONTH_NAMES[r["month"] - 1],
         "contracts": r["contracts"], "value": round(r["value"], 2),
         "pct_contracts": round(r["contracts"] * 100.0 / total_cnt, 1),
         "pct_value": round(r["value"] * 100.0 / total_val, 1)}
        for r in rows
    ]
    present = {r["month"] for r in rows}
    for m in range(1, 13):
        if m not in present:
            monthly.append({"month": m, "month_name": MONTH_NAMES[m - 1], "contracts": 0,
                            "value": 0.0, "pct_contracts": 0.0, "pct_value": 0.0})
    monthly.sort(key=lambda x: x["month"])
    dec_row = next((r for r in monthly if r["month"] == 12), None)
    dec_pct_value = dec_row["pct_value"] if dec_row else 0.0
    december_index = round(dec_pct_value / 8.33, 2) if dec_pct_value else 0.0
    yearly_dec = [
        {"year": r["year"],
         "dec_pct": round(r["dec_val"] * 100.0 / r["total_val"], 1) if r["total_val"] else 0.0,
         "dec_cnt_pct": round(r["dec_cnt"] * 100.0 / r["total_cnt"], 1) if r["total_cnt"] else 0.0}
        for r in year_rows if r["total_val"] and r["total_val"] > 0
    ]
    return {"category_id": cid, "category_name": cat_name, "monthly": monthly,
            "december_pct_value": dec_pct_value, "december_index": december_index,
            "yearly_december": yearly_dec}


def compute_patterns(cur, cid, cat_name):
    cur.execute("SELECT COUNT(DISTINCT vendor_id) AS tv FROM contracts WHERE category_id = ?", (cid,))
    total_vendors = cur.fetchone()["tv"] or 1
    cur.execute("""
        SELECT aq.primary_pattern, COUNT(DISTINCT aq.vendor_id) AS vendor_count,
               AVG(COALESCE(aq.pattern_confidence, 0)) AS avg_confidence,
               SUM(CASE WHEN aq.ips_tier IN (1,2) THEN 1 ELSE 0 END) AS high_tier_count
        FROM aria_queue aq
        WHERE aq.vendor_id IN (SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?)
          AND aq.primary_pattern IS NOT NULL
        GROUP BY aq.primary_pattern ORDER BY vendor_count DESC
    """, (cid,))
    pattern_rows = cur.fetchall()
    cur.execute("""
        SELECT aq.ips_tier, COUNT(*) AS cnt FROM aria_queue aq
        WHERE aq.vendor_id IN (SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?)
        GROUP BY aq.ips_tier ORDER BY aq.ips_tier
    """, (cid,))
    tier_rows = cur.fetchall()
    cur.execute("""
        SELECT COUNT(DISTINCT aq.vendor_id) AS in_aria FROM aria_queue aq
        WHERE aq.vendor_id IN (SELECT DISTINCT vendor_id FROM contracts WHERE category_id = ?)
    """, (cid,))
    in_aria = cur.fetchone()["in_aria"] or 0
    patterns = []
    for r in pattern_rows:
        code = r["primary_pattern"]
        meta = PATTERN_META.get(code, {"label_es": code, "label_en": code, "color": "#94a3b8"})
        patterns.append({"pattern": code, "label_es": meta["label_es"], "label_en": meta["label_en"],
                         "color": meta["color"], "vendor_count": r["vendor_count"],
                         "pct_of_aria": round(r["vendor_count"] * 100.0 / max(in_aria, 1), 1),
                         "avg_confidence": round(r["avg_confidence"] or 0, 2),
                         "high_tier_count": r["high_tier_count"]})
    tier_dist = [{"tier": r["ips_tier"], "count": r["cnt"]} for r in tier_rows]
    dominant = patterns[0] if patterns else None
    return {"category_id": cid, "category_name": cat_name, "total_vendors": total_vendors,
            "vendors_in_aria": in_aria, "patterns": patterns, "tier_distribution": tier_dist,
            "dominant_pattern": dominant["pattern"] if dominant else None}


def run(db_path: str) -> None:
    print(f"Precomputing category signals (competition/seasonality/patterns) in: {db_path}")
    conn = sqlite3.connect(db_path, timeout=600)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=600000")
    cur = conn.cursor()

    cats = cur.execute("SELECT id, name_es FROM categories WHERE id IN (SELECT category_id FROM category_stats) ORDER BY id").fetchall()
    print(f"  {len(cats)} active categories")
    t_all = time.time()
    written = 0
    for c in cats:
        cid, name = c["id"], c["name_es"]
        t0 = time.time()
        payloads = {
            f"category_competition:{cid}": compute_competition(cur, cid, name),
            f"category_seasonality:{cid}": compute_seasonality(cur, cid, name),
            f"category_patterns:{cid}":    compute_patterns(cur, cid, name),
        }
        now = datetime.now().isoformat()
        cur.execute("BEGIN IMMEDIATE")
        for key, val in payloads.items():
            cur.execute(
                "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(val), now),
            )
        conn.commit()
        written += 3
        print(f"   cat {cid:>3} {name[:24]:24} {time.time() - t0:5.1f}s")

    print(f"\n==> {written} precomputed_stats rows written ({time.time() - t_all:.1f}s total).")
    # quick verify on cat 26
    v = cur.execute("SELECT stat_value FROM precomputed_stats WHERE stat_key='category_competition:26'").fetchone()
    if v:
        d = json.loads(v["stat_value"])
        print(f"Verify cat26 competition: {len(d.get('procedure_breakdown', []))} proc types, {len(d.get('yearly_trend', []))} years")
    conn.close()


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_DEPLOY.db")
