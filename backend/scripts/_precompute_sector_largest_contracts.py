"""
Precompute `sector_largest_contracts`: the top-10 single contracts by amount in
each sector (the named, datable, clickable artifacts a journalist files a PNT
request against).

A live `ORDER BY amount_mxn DESC` over a sector's ~1M rows takes ~17s and locks
SQLite — so the ranking is precomputed into one precomputed_stats row:

  sector_largest_contracts = {
    "<sector_id>": [ {contract_id, amount_mxn, year, risk_level, risk_score,
                      vendor_id, vendor_name, institution_id, institution_name,
                      title}, ... up to 10 ],
    ...
  }

Amounts are filtered to <= 100B MXN (the platform reject ceiling — contracts
above that are decimal-point data errors, per the data-validation rules).

Idempotent. Usage:
    python -m scripts._precompute_sector_largest_contracts [DB_PATH]
    DB_PATH defaults to RUBLI_NORMALIZED.db (run dir = backend/).
"""
import json
import sqlite3
import sys
import time
from datetime import datetime

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject ceiling
TOP_N = 10


def precompute(db_path: str) -> None:
    print(f"Precomputing sector_largest_contracts in: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout=60000")

    sector_ids = [r["id"] for r in cur.execute("SELECT id FROM sectors ORDER BY id").fetchall()]
    out: dict = {}
    t_all = time.time()
    for sid in sector_ids:
        t0 = time.time()
        rows = cur.execute(
            """
            SELECT ct.id AS contract_id, ct.amount_mxn, ct.contract_year,
                   ct.risk_level, ct.risk_score, ct.title,
                   ct.vendor_id, v.name AS vendor_name,
                   ct.institution_id, i.name AS institution_name, i.siglas
            FROM contracts ct
            LEFT JOIN vendors v ON v.id = ct.vendor_id
            LEFT JOIN institutions i ON i.id = ct.institution_id
            WHERE ct.sector_id = ? AND ct.amount_mxn IS NOT NULL
              AND ct.amount_mxn <= ?
            ORDER BY ct.amount_mxn DESC
            LIMIT ?
            """,
            (sid, MAX_CONTRACT_VALUE, TOP_N),
        ).fetchall()
        out[str(sid)] = [
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
        print(f"   sector {sid}: {len(rows)} rows in {time.time() - t0:.1f}s")

    cur.execute("BEGIN IMMEDIATE")
    cur.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
        ("sector_largest_contracts", json.dumps(out), datetime.now().isoformat()),
    )
    conn.commit()
    print(f"\n==> sector_largest_contracts written ({time.time() - t_all:.1f}s total).")
    s1 = out.get("1", [])
    if s1:
        top = s1[0]
        print(f"Verify salud top: {top['amount_mxn'] / 1e9:,.2f}B · {top['year']} · {top['vendor_name']}")
    conn.close()


if __name__ == "__main__":
    precompute(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db")
