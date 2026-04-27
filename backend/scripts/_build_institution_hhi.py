"""Precompute per-institution per-year HHI for InstitutionProfile.

The live HHI query in /institutions/{id} took 77s on IMSS (662k contracts).
This precomputes all institutions in one pass and stores them in
institution_hhi (PK: institution_id, contract_year).

Run after each ETL refresh, or whenever vendor/contract data changes.
"""

import sqlite3
import time
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS institution_hhi (
            institution_id INTEGER NOT NULL,
            contract_year  INTEGER NOT NULL,
            hhi            REAL,
            unique_vendors INTEGER,
            total_value    REAL,
            PRIMARY KEY (institution_id, contract_year)
        );
        CREATE INDEX IF NOT EXISTS idx_inst_hhi_inst ON institution_hhi(institution_id);
    """)

    cur = conn.execute("SELECT COUNT(*) FROM institution_hhi").fetchone()[0]
    print(f"existing rows: {cur} (will be replaced)")

    t0 = time.time()
    conn.execute("DELETE FROM institution_hhi")

    # Single-pass query — group all institutions × years at once.
    # vendor_shares: (institution_id, contract_year, vendor_id, vendor_value)
    # year_totals:   (institution_id, contract_year, total_value, unique_vendors)
    # Final: HHI per (institution_id, contract_year)
    conn.execute("""
        INSERT INTO institution_hhi (institution_id, contract_year, hhi, unique_vendors, total_value)
        WITH vendor_shares AS (
            SELECT institution_id, contract_year, vendor_id,
                   SUM(COALESCE(amount_mxn, 0)) AS vendor_value
            FROM contracts
            WHERE institution_id IS NOT NULL
              AND vendor_id IS NOT NULL
              AND contract_year IS NOT NULL
              AND amount_mxn > 0
            GROUP BY institution_id, contract_year, vendor_id
        ),
        year_totals AS (
            SELECT institution_id, contract_year,
                   SUM(vendor_value) AS total_value,
                   COUNT(DISTINCT vendor_id) AS unique_vendors
            FROM vendor_shares
            GROUP BY institution_id, contract_year
        )
        SELECT vs.institution_id, vs.contract_year,
               ROUND(SUM((vs.vendor_value * 100.0 / yt.total_value) *
                         (vs.vendor_value * 100.0 / yt.total_value)), 1) AS hhi,
               yt.unique_vendors,
               yt.total_value
        FROM vendor_shares vs
        JOIN year_totals yt
          ON vs.institution_id = yt.institution_id
         AND vs.contract_year = yt.contract_year
        WHERE yt.total_value > 0
        GROUP BY vs.institution_id, vs.contract_year
    """)
    conn.commit()

    n = conn.execute("SELECT COUNT(*) FROM institution_hhi").fetchone()[0]
    insts = conn.execute("SELECT COUNT(DISTINCT institution_id) FROM institution_hhi").fetchone()[0]
    print(f"populated {n} rows across {insts} institutions in {time.time()-t0:.1f}s")
    conn.close()


if __name__ == "__main__":
    main()
