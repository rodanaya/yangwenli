"""
Precompute the category-dossier enrichment payloads that are too slow to compute
live (each is a multi-second-to-30s aggregation over the 3.1M-row contracts
table). Mirrors the sector-dossier precompute scripts.

Produces:
  1. TABLE category_vendor_institution_topn — top-12 vendor x institution capture
     pairs per category (so the dossier renders them INSTANTLY instead of hiding
     them behind a ~14s "Load capture pairs" button).
  2. precomputed_stats['category_largest_contracts'] = {cat_id: [up to 8 named,
     datable, clickable contracts]} — mirrors sector_largest_contracts.
  3. precomputed_stats['category_top_institutions'] = {cat_id: [up to 6 buying
     institutions by value, with share]} — who SPENDS in the category.
  4. precomputed_stats['category_price_distribution'] = {cat_id: {p25/p50/p75,
     mean, mean_median_ratio, outlier_count/value, mega (>=1B) share, n}}.

Pure stdlib (sqlite3/json) — runs with bare host Python too. Idempotent.

Run: python -m scripts._precompute_category_enrichments [DB_PATH]
"""
import json
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject ceiling
MEGA_THRESHOLD = 1_000_000_000        # 1B MXN — "mega-contract"
PAIRS_TOP_N = 12
CONTRACTS_TOP_N = 8
INSTITUTIONS_TOP_N = 6


def _resolve_db_path() -> Path:
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 0:
            return p
    raise FileNotFoundError(f"No DB found at {base}/RUBLI_*.db")


def _set_stat(cur, key: str, payload: dict) -> None:
    cur.execute(
        "INSERT INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?) "
        "ON CONFLICT (stat_key) DO UPDATE SET stat_value = excluded.stat_value, updated_at = excluded.updated_at",
        (key, json.dumps(payload), datetime.now().isoformat()),
    )


# ── 1. Capture pairs (vendor x institution) ──────────────────────────────────
def build_capture_pairs(cur) -> None:
    print("[1/4] capture pairs -> category_vendor_institution_topn ...")
    t0 = time.time()
    cur.execute("DROP TABLE IF EXISTS category_vendor_institution_topn")
    cur.execute("""
        CREATE TABLE category_vendor_institution_topn (
            category_id      INTEGER NOT NULL,
            rank             INTEGER NOT NULL,
            vendor_id        INTEGER NOT NULL,
            vendor_name      TEXT    NOT NULL,
            institution_id   INTEGER NOT NULL,
            institution_name TEXT    NOT NULL,
            contract_count   INTEGER NOT NULL,
            total_value      REAL    NOT NULL,
            avg_risk         REAL,
            max_risk         REAL,
            direct_award_pct REAL,
            single_bid_pct   REAL,
            PRIMARY KEY (category_id, rank)
        )
    """)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_cvit_category ON category_vendor_institution_topn(category_id)"
    )
    cur.execute(f"""
        INSERT INTO category_vendor_institution_topn
        WITH agg AS (
            SELECT c.category_id, c.vendor_id, c.institution_id,
                   COUNT(*)                                  AS cnt,
                   SUM(c.amount_mxn)                         AS val,
                   AVG(c.risk_score)                         AS ar,
                   MAX(c.risk_score)                         AS mr,
                   SUM(c.is_direct_award) * 100.0 / COUNT(*) AS da,
                   SUM(c.is_single_bid)   * 100.0 / COUNT(*) AS sb
            FROM contracts c
            WHERE c.category_id IS NOT NULL
              AND c.vendor_id IS NOT NULL
              AND c.institution_id IS NOT NULL
              AND c.amount_mxn IS NOT NULL
            GROUP BY c.category_id, c.vendor_id, c.institution_id
        ),
        ranked AS (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY val DESC) AS rn
            FROM agg
        )
        SELECT r.category_id, r.rn, r.vendor_id, v.name, r.institution_id,
               COALESCE(i.siglas, i.name), r.cnt, ROUND(r.val, 2),
               ROUND(r.ar, 4), ROUND(r.mr, 4), ROUND(r.da, 1), ROUND(r.sb, 1)
        FROM ranked r
        JOIN vendors v      ON v.id = r.vendor_id
        JOIN institutions i ON i.id = r.institution_id
        WHERE r.rn <= {PAIRS_TOP_N}
    """)
    n = cur.execute("SELECT COUNT(*) FROM category_vendor_institution_topn").fetchone()[0]
    print(f"      {n} pairs in {time.time()-t0:.1f}s")


# ── 2. Largest contracts ──────────────────────────────────────────────────────
def build_largest_contracts(cur, cat_ids) -> None:
    print("[2/4] largest contracts -> precomputed_stats[category_largest_contracts] ...")
    t0 = time.time()
    out: dict = {}
    for cid in cat_ids:
        rows = cur.execute(
            """
            SELECT ct.id AS contract_id, ct.amount_mxn, ct.contract_year,
                   ct.risk_level, ct.risk_score, ct.title,
                   ct.vendor_id, v.name AS vendor_name,
                   ct.institution_id, i.name AS institution_name, i.siglas
            FROM contracts ct
            LEFT JOIN vendors v ON v.id = ct.vendor_id
            LEFT JOIN institutions i ON i.id = ct.institution_id
            WHERE ct.category_id = ? AND ct.amount_mxn IS NOT NULL
              AND ct.amount_mxn > 0 AND ct.amount_mxn <= ?
            ORDER BY ct.amount_mxn DESC
            LIMIT ?
            """,
            (cid, MAX_CONTRACT_VALUE, CONTRACTS_TOP_N),
        ).fetchall()
        out[str(cid)] = [
            {
                "contract_id": r["contract_id"],
                "amount_mxn": r["amount_mxn"] or 0,
                "year": r["contract_year"],
                "risk_level": r["risk_level"],
                "risk_score": round(r["risk_score"], 4) if r["risk_score"] is not None else None,
                "vendor_id": r["vendor_id"],
                "vendor_name": r["vendor_name"],
                "institution_id": r["institution_id"],
                "institution_name": r["siglas"] or r["institution_name"],
                "title": (r["title"] or "")[:160] or None,
            }
            for r in rows
        ]
    _set_stat(cur, "category_largest_contracts", out)
    print(f"      {len(out)} categories in {time.time()-t0:.1f}s")


# ── 3. Top buying institutions ────────────────────────────────────────────────
def build_top_institutions(cur, cat_totals) -> None:
    print("[3/4] top institutions -> precomputed_stats[category_top_institutions] ...")
    t0 = time.time()
    rows = cur.execute(
        f"""
        WITH agg AS (
            SELECT c.category_id, c.institution_id,
                   COUNT(*)          AS cnt,
                   SUM(c.amount_mxn) AS spend,
                   AVG(c.risk_score) AS ar
            FROM contracts c
            WHERE c.amount_mxn IS NOT NULL AND c.amount_mxn > 0 AND c.amount_mxn < ?
              AND c.category_id IS NOT NULL AND c.institution_id IS NOT NULL
            GROUP BY c.category_id, c.institution_id
        ),
        ranked AS (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY spend DESC) AS rn
            FROM agg
        )
        SELECT r.category_id, r.institution_id, i.name, i.siglas,
               r.cnt, r.spend, r.ar
        FROM ranked r
        JOIN institutions i ON i.id = r.institution_id
        WHERE r.rn <= {INSTITUTIONS_TOP_N}
        ORDER BY r.category_id, r.spend DESC
        """,
        (MAX_CONTRACT_VALUE,),
    ).fetchall()
    out: dict = {}
    for r in rows:
        cid = r["category_id"]
        total = cat_totals.get(cid) or 0
        spend = float(r["spend"] or 0)
        out.setdefault(str(cid), []).append({
            "institution_id": r["institution_id"],
            "name": r["siglas"] or r["name"],
            "full_name": r["name"],
            "contract_count": r["cnt"],
            "value_mxn": spend,
            "share_pct": round(spend / total * 100, 1) if total > 0 else 0.0,
            "avg_risk": round(r["ar"], 4) if r["ar"] is not None else None,
        })
    _set_stat(cur, "category_top_institutions", out)
    print(f"      {len(out)} categories in {time.time()-t0:.1f}s")


# ── 4. Price distribution / outliers ──────────────────────────────────────────
def build_price_distribution(cur, cat_ids) -> None:
    print("[4/4] price distribution -> precomputed_stats[category_price_distribution] ...")
    t0 = time.time()
    out: dict = {}
    for cid in cat_ids:
        amts = [
            r[0]
            for r in cur.execute(
                """
                SELECT amount_mxn FROM contracts
                WHERE category_id = ? AND amount_mxn > 0 AND amount_mxn < ?
                ORDER BY amount_mxn
                """,
                (cid, MAX_CONTRACT_VALUE),
            ).fetchall()
        ]
        n = len(amts)
        if n == 0:
            out[str(cid)] = {"n": 0}
            continue
        total = sum(amts)
        p25 = amts[max(0, n // 4)]
        p50 = amts[max(0, n // 2)]
        p75 = amts[max(0, (3 * n) // 4)]
        mean = total / n
        iqr = p75 - p25
        fence = p75 + 1.5 * iqr
        out_n = 0
        out_v = 0.0
        mega_n = 0
        mega_v = 0.0
        # amts is sorted asc — walk from the top for the two tail cuts.
        for a in reversed(amts):
            if a > fence:
                out_n += 1
                out_v += a
            if a >= MEGA_THRESHOLD:
                mega_n += 1
                mega_v += a
            elif a < fence:
                # below both cuts and amounts only shrink from here
                break
        out[str(cid)] = {
            "n": n,
            "p25": round(p25),
            "p50": round(p50),
            "p75": round(p75),
            "mean": round(mean),
            "iqr": round(iqr),
            "mean_median_ratio": round(mean / p50, 2) if p50 > 0 else None,
            "outlier_count": out_n,
            "outlier_value": round(out_v),
            "outlier_value_pct": round(out_v / total * 100, 1) if total > 0 else 0.0,
            "mega_count": mega_n,
            "mega_value": round(mega_v),
            "mega_value_pct": round(mega_v / total * 100, 1) if total > 0 else 0.0,
            "total_value": round(total),
        }
    _set_stat(cur, "category_price_distribution", out)
    print(f"      {len(out)} categories in {time.time()-t0:.1f}s")


def run(db_path: str) -> None:
    t_all = time.time()
    conn = sqlite3.connect(db_path, timeout=600)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA wal_autocheckpoint=0")
    cur = conn.cursor()
    print(f"DB: {db_path}")

    cat_ids = [r["category_id"] for r in cur.execute(
        "SELECT category_id FROM category_stats ORDER BY category_id"
    ).fetchall()]
    cat_totals = {r["category_id"]: r["total_value"] for r in cur.execute(
        "SELECT category_id, total_value FROM category_stats"
    ).fetchall()}
    print(f"{len(cat_ids)} categories")

    build_capture_pairs(cur)
    conn.commit()
    build_largest_contracts(cur, cat_ids)
    conn.commit()
    build_top_institutions(cur, cat_totals)
    conn.commit()
    build_price_distribution(cur, cat_ids)
    conn.commit()
    conn.close()
    print(f"\n==> all category enrichments written ({time.time()-t_all:.1f}s total).")


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else str(_resolve_db_path()))
