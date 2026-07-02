"""
precompute_concentration.py — Build the institution_vendor_concentration table.

The /analysis/patterns/concentration endpoint needs, per (institution, vendor),
the vendor's share of the institution's total procurement VALUE. Computing that
live is a GROUP BY over the 3M-row contracts table (~30s). This precomputes the
candidate pairs once (value share >= 10%, a superset of the endpoint's
min_share floor) so the endpoint reads a few-thousand-row table instantly.

Correctness note: unlike institution_top_vendors (ranked by contract COUNT, which
would drop a vendor holding one huge-value/low-count contract), this is computed
on VALUE share directly, so it cannot miss a value-concentration case.

Run at deploy time alongside the other precompute steps:
    python -m scripts.precompute_concentration
"""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject decimal-error outliers
INST_MIN_CONTRACTS = 10               # endpoint min_contracts floor (Query ge=10)
SHARE_FLOOR = 10.0                    # endpoint min_share floor (Query ge=10)


def main() -> int:
    here = Path(__file__).resolve()
    db = os.environ.get("DATABASE_PATH", str(here.parents[1] / "RUBLI_NORMALIZED.db"))
    if not os.path.exists(db):
        print(f"ERROR: DB not found: {db}", file=sys.stderr)
        return 2
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS institution_vendor_concentration")
    cur.execute(
        """
        CREATE TABLE institution_vendor_concentration AS
        WITH inst_totals AS (
            SELECT institution_id,
                   COUNT(*) AS total_contracts,
                   SUM(amount_mxn) AS total_value
            FROM contracts
            WHERE institution_id IS NOT NULL AND amount_mxn > 0 AND amount_mxn < ?
            GROUP BY institution_id
            HAVING total_contracts >= ?
        ),
        vendor_shares AS (
            SELECT c.institution_id,
                   c.vendor_id,
                   COUNT(*) AS vendor_contracts,
                   SUM(c.amount_mxn) AS vendor_value,
                   AVG(CASE WHEN c.risk_score IS NOT NULL THEN c.risk_score END) AS avg_risk_score,
                   t.total_contracts,
                   t.total_value
            FROM contracts c
            JOIN inst_totals t ON c.institution_id = t.institution_id
            WHERE c.vendor_id IS NOT NULL AND c.amount_mxn > 0
            GROUP BY c.institution_id, c.vendor_id
        )
        SELECT institution_id, vendor_id, vendor_contracts, vendor_value, avg_risk_score,
               total_contracts, total_value,
               CAST(vendor_value AS REAL) / total_value * 100 AS value_share
        FROM vendor_shares
        WHERE total_value > 0 AND CAST(vendor_value AS REAL) / total_value * 100 >= ?
        """,
        (MAX_CONTRACT_VALUE, INST_MIN_CONTRACTS, SHARE_FLOOR),
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ivc_share "
        "ON institution_vendor_concentration(value_share DESC, total_contracts)"
    )
    conn.commit()
    n = cur.execute("SELECT COUNT(*) FROM institution_vendor_concentration").fetchone()[0]
    conn.close()
    print(f"institution_vendor_concentration: {n} pairs (value share >= {SHARE_FLOOR}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
