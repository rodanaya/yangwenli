"""
compute_official_profiles.py
Compute risk profiles for the named procurement officers of record
(Responsable de la Unidad Compradora) in COMPRANET Structures C/D (2018+).

Coviello & Gagliarducci (2017) showed that official tenure is the most predictive
variable for single-bid rates in Italian procurement. Romania and Ukraine both score
individual signing officials.

DATA SOURCE (2026-06-14):
  The field used is `contracts.responsible_uc` — the "Responsable de la Unidad
  Compradora" mapped from the COMPRANET RESPONSABLE / "Responsable de la UC"
  columns by scripts/etl_backfill_new_fields.py. It is the named officer OF RECORD
  for the buying unit, NOT a literal per-contract pen-stroke signer: one name can
  carry tens of thousands of contracts because it is a unit-responsibility role.
  Surface it as "responsable de la unidad compradora", never "who signed".

  This replaces the earlier (never-populated) `oficial_firmante` / 'servidor_publico
  _que_firmo' path, which read a phantom column and always emitted a DATA GAP notice
  — leaving official_risk_profiles empty and the per-institution Officials tab dark.

COVERAGE / HONESTY:
  Restricted to contract_year >= 2018 (COMPRANET Structures C/D), the reliability
  window. responsible_uc is ~59% populated pre-2018 and ~69% from 2018 — the 2018+
  cut is a data-QUALITY choice, not a coverage cliff. avg_risk_score is the active
  display score (`risk_score`, v0.8.5) — an indicador de riesgo, not an accusation;
  thin-n rows are homonym-prone, so callers should floor at >=10 (ideally >=50)
  contracts and prefer a direct-award / concentration sort over a raw risk sort.

Usage:
    python -m scripts.compute_official_profiles [--min-contracts 5]

Runtime: ~10-40s on ~0.92M contracts (2018+).
"""
import argparse
import os
import sqlite3
import time
from pathlib import Path

# Respect DATABASE_PATH so the prod backfill targets the deploy DB in-container
# (docker exec sets DATABASE_PATH=…/RUBLI_DEPLOY.db); falls back to the local
# source DB for dev runs.
DB_PATH = Path(os.environ.get("DATABASE_PATH") or (Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"))

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject above this (data-validation rule)

# Single-pass aggregation. `base` normalizes the official name + validates amounts;
# `vendor_counts` -> `hhi` computes the count-based vendor Herfindahl on a 0-10000
# scale (matches the endpoint's `hhi_vendors > 2500` interpretation); `agg` rolls up
# the per-(official, institution) scalar metrics. institution_id is never NULL in the
# 2018+ responsible_uc set, so the HHI join is a plain equality.
SQL = """
WITH base AS (
    SELECT
        UPPER(TRIM(responsible_uc))                                            AS official_name,
        institution_id,
        CASE WHEN amount_mxn > ? THEN 0 ELSE COALESCE(amount_mxn, 0) END       AS amt,
        COALESCE(is_single_bid, 0)                                             AS sb,
        COALESCE(is_direct_award, 0)                                           AS da,
        vendor_id,
        contract_year,
        COALESCE(risk_score, 0)                                                AS rs
    FROM contracts
    WHERE contract_year >= 2018
      AND responsible_uc IS NOT NULL
      AND TRIM(responsible_uc) != ''
),
vendor_counts AS (
    SELECT official_name, institution_id, vendor_id, COUNT(*) AS cnt
    FROM base
    WHERE vendor_id IS NOT NULL
    GROUP BY official_name, institution_id, vendor_id
),
hhi AS (
    SELECT
        official_name,
        institution_id,
        SUM(cnt * 1.0 * cnt) * 10000.0 / (SUM(cnt) * SUM(cnt)) AS hhi_vendors
    FROM vendor_counts
    GROUP BY official_name, institution_id
),
agg AS (
    SELECT
        official_name,
        institution_id,
        MIN(contract_year)                       AS first_contract_year,
        MAX(contract_year)                       AS last_contract_year,
        COUNT(*)                                 AS total_contracts,
        SUM(amt)                                 AS total_value_mxn,
        AVG(CAST(sb AS FLOAT)) * 100             AS single_bid_pct,
        AVG(CAST(da AS FLOAT)) * 100             AS direct_award_pct,
        AVG(rs)                                  AS avg_risk_score,
        COUNT(DISTINCT vendor_id)                AS vendor_diversity
    FROM base
    GROUP BY official_name, institution_id
    HAVING COUNT(*) >= ?
)
SELECT
    a.official_name,
    a.institution_id,
    a.first_contract_year,
    a.last_contract_year,
    a.total_contracts,
    a.single_bid_pct,
    a.direct_award_pct,
    a.avg_risk_score,
    a.vendor_diversity,
    COALESCE(h.hhi_vendors, 0) AS hhi_vendors,
    a.total_value_mxn
FROM agg a
LEFT JOIN hhi h
    ON a.official_name = h.official_name
   AND a.institution_id = h.institution_id
ORDER BY a.total_contracts DESC
"""


def main(min_contracts: int = 5):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-131072")
    cursor = conn.cursor()

    cols = [c[1] for c in cursor.execute("PRAGMA table_info(contracts)").fetchall()]
    assert "responsible_uc" in cols, "contracts.responsible_uc column missing — run etl_backfill_new_fields.py"

    print("=" * 64)
    print("OFFICIAL RISK PROFILE COMPUTATION  (responsible_uc · 2018+)")
    print(f"Minimum contracts per (official, institution): {min_contracts}")
    print("=" * 64)
    t0 = time.time()

    # Indexes for live drill (raw column; the backfill GROUP BY normalizes with
    # UPPER/TRIM so it scans, but the per-institution endpoint filters by
    # institution_id + total_contracts on the precomputed table, which is tiny).
    print("Step 1/3  Ensuring indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contracts_responsible_uc ON contracts(responsible_uc)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contracts_resp_uc_inst ON contracts(responsible_uc, institution_id)")
    conn.commit()
    print(f"          done  ({time.time() - t0:.1f}s)")

    print("Step 2/3  Aggregating...")
    rows = cursor.execute(SQL, (MAX_CONTRACT_VALUE, min_contracts)).fetchall()
    print(f"          {len(rows):,} (official, institution) profiles  ({time.time() - t0:.1f}s)")

    if not rows:
        print("No officials found — aborting without touching the table.")
        conn.close()
        return

    inserts = [
        (
            r["official_name"],
            r["institution_id"],
            r["first_contract_year"],
            r["last_contract_year"],
            r["total_contracts"],
            round(r["single_bid_pct"] or 0, 2),
            round(r["direct_award_pct"] or 0, 2),
            round(r["avg_risk_score"] or 0, 4),
            r["vendor_diversity"],
            round(r["hhi_vendors"] or 0, 1),
            round(r["total_value_mxn"] or 0, 2),
        )
        for r in rows
    ]

    print("Step 3/3  Writing official_risk_profiles...")
    cursor.execute("DELETE FROM official_risk_profiles")
    cursor.executemany(
        """
        INSERT INTO official_risk_profiles
            (official_name, institution_id, first_contract_year, last_contract_year,
             total_contracts, single_bid_pct, direct_award_pct, avg_risk_score,
             vendor_diversity, hhi_vendors, total_value_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        inserts,
    )
    conn.commit()
    cursor.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.commit()

    elapsed = time.time() - t0
    distinct_officials = cursor.execute(
        "SELECT COUNT(DISTINCT official_name) FROM official_risk_profiles"
    ).fetchone()[0]
    movers = cursor.execute(
        """SELECT COUNT(*) FROM (
               SELECT official_name FROM official_risk_profiles
               GROUP BY official_name HAVING COUNT(DISTINCT institution_id) > 1
           )"""
    ).fetchone()[0]
    print(f"\nWrote {len(inserts):,} profiles · {distinct_officials:,} distinct officials · "
          f"{movers:,} cross-institution movers  ({elapsed:.1f}s)")

    print("\nTop 8 by volume (responsable de la unidad compradora):")
    for r in cursor.execute(
        """SELECT official_name, total_contracts, direct_award_pct, avg_risk_score
           FROM official_risk_profiles ORDER BY total_contracts DESC LIMIT 8"""
    ).fetchall():
        name = r["official_name"][:42]
        print(f"  {name:42} | {r['total_contracts']:>7,} contracts | "
              f"{r['direct_award_pct']:5.1f}% DA | risk {r['avg_risk_score']:.3f}")
    print("=" * 64)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compute official-level risk profiles from responsible_uc")
    parser.add_argument("--min-contracts", type=int, default=5,
                        help="Minimum contracts per (official, institution) pair (default: 5)")
    args = parser.parse_args()
    main(min_contracts=args.min_contracts)
