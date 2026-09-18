"""
Rebuild RUBLI's gap_contracts from the ComprasMX staging table.

REBUILD, never upsert: gap_contracts is a pure derivation of staging_rubli, and a
DROP + CREATE AS SELECT + UNIQUE(uuid_procedimiento) is the simplest dedup guard.
Run grade_gap.py afterwards (adds the 8 grade columns + their indexes).

  python load_gap.py                     # -> backend/RUBLI_NORMALIZED.db
  python load_gap.py path/to/other.db    # -> any RUBLI db (e.g. RUBLI_DEPLOY.db)
"""
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
STAGING = HERE / "comprasmx_gap.db"
TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "backend" / "RUBLI_NORMALIZED.db"


def main():
    c = sqlite3.connect(str(TARGET), timeout=120)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("ATTACH DATABASE ? AS g", (str(STAGING),))
    n_stage = c.execute("SELECT COUNT(*) FROM g.staging_rubli").fetchone()[0]
    c.execute("DROP TABLE IF EXISTS gap_contracts")
    c.execute("CREATE TABLE gap_contracts AS SELECT * FROM g.staging_rubli")
    c.execute("CREATE UNIQUE INDEX ux_gap_uuid ON gap_contracts(uuid_procedimiento)")
    c.execute("CREATE INDEX ix_gap_rfc ON gap_contracts(vendor_rfc)")
    c.execute("CREATE INDEX ix_gap_da ON gap_contracts(is_direct_award)")
    c.execute("CREATE INDEX ix_gap_sector ON gap_contracts(sector_id)")
    c.commit()
    c.execute("DETACH DATABASE g")

    n, nd = c.execute("SELECT COUNT(*), COUNT(DISTINCT uuid_procedimiento) FROM gap_contracts").fetchone()
    assert n == nd == n_stage, (n, nd, n_stage)
    overlap = c.execute("""SELECT COUNT(*) FROM gap_contracts
        WHERE procedure_number IN (SELECT procedure_number FROM contracts)""").fetchone()[0]
    assert overlap == 0, f"{overlap} procedure_numbers collide with the federal corpus"
    mx = c.execute("SELECT MAX(CAST(amount_mxn_best AS REAL)) FROM gap_contracts").fetchone()[0] or 0
    assert mx < 1e11, f"amount {mx} exceeds the 100B reject ceiling"
    print(f"gap_contracts rebuilt: {n:,} rows (unique uuid OK, 0 corpus overlap, max amount {mx/1e9:.2f}B)")
    for src, k in c.execute("SELECT amount_source, COUNT(*) FROM gap_contracts GROUP BY 1"):
        print(f"  {k:>7,}  {src}")
    print("window:", c.execute("SELECT MIN(substr(publication_date,1,10)), MAX(substr(publication_date,1,10)) FROM gap_contracts").fetchone())
    c.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    c.close()


if __name__ == "__main__":
    main()
