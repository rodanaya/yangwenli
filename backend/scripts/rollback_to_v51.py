"""
One-shot v5.1 rollback script.
Drops risk indexes, updates risk_score/risk_level/risk_model_version from risk_score_v5,
then recreates all indexes.
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

INDEXES_TO_DROP = [
    "idx_contracts_risk_score",
    "idx_contracts_risk_level",
    "idx_contracts_sector_risk",
    "idx_contracts_vendor_risk",
    "idx_contracts_year_risk",
    "idx_contracts_risk_date",
    "idx_contracts_sector_risk_score",
    "idx_contracts_risk_level_risk_score",
    "idx_contracts_sector_risklevel_score",
    "idx_contracts_sector_risk_level",
    "idx_contracts_institution_year_risk",
]

INDEX_CREATE_SQL = [
    "CREATE INDEX idx_contracts_risk_score ON contracts(risk_score)",
    "CREATE INDEX idx_contracts_risk_level ON contracts(risk_level)",
    "CREATE INDEX idx_contracts_sector_risk ON contracts(sector_id, risk_level)",
    "CREATE INDEX idx_contracts_vendor_risk ON contracts(vendor_id, risk_level)",
    "CREATE INDEX idx_contracts_year_risk ON contracts(contract_year, risk_level)",
    "CREATE INDEX idx_contracts_risk_date ON contracts(risk_level, contract_date DESC)",
    "CREATE INDEX idx_contracts_sector_risk_score ON contracts(sector_id, risk_score DESC)",
    "CREATE INDEX idx_contracts_risk_level_risk_score ON contracts(risk_level, risk_score DESC)",
    "CREATE INDEX idx_contracts_sector_risklevel_score ON contracts(sector_id, risk_level, risk_score DESC)",
    "CREATE INDEX idx_contracts_sector_risk_level ON contracts(sector_id, risk_level)",
    "CREATE INDEX idx_contracts_institution_year_risk ON contracts(institution_id, contract_year, risk_level)",
]

def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=300)
    c = conn.cursor()
    c.execute("PRAGMA synchronous=OFF")
    c.execute("PRAGMA journal_mode=WAL")

    total_start = time.time()

    # Step 1: Drop all risk indexes
    print("Step 1: Dropping 11 risk indexes...")
    t = time.time()
    for idx in INDEXES_TO_DROP:
        c.execute(f"DROP INDEX IF EXISTS {idx}")
    conn.commit()
    print(f"  Done in {time.time()-t:.1f}s")

    # Step 2: Full-table UPDATE (no index maintenance now)
    print("Step 2: Updating risk_score, risk_level, risk_model_version...")
    t = time.time()
    c.execute("""
        UPDATE contracts SET
          risk_score = risk_score_v5,
          risk_level = CASE
            WHEN risk_score_v5 >= 0.50 THEN 'critical'
            WHEN risk_score_v5 >= 0.30 THEN 'high'
            WHEN risk_score_v5 >= 0.10 THEN 'medium'
            ELSE 'low'
          END,
          risk_model_version = 'v5.1'
    """)
    conn.commit()
    print(f"  Updated {c.rowcount} rows in {time.time()-t:.1f}s")

    # Step 3: Recreate indexes
    print("Step 3: Recreating 11 indexes...")
    for i, sql in enumerate(INDEX_CREATE_SQL, 1):
        t = time.time()
        idx_name = sql.split("CREATE INDEX ")[1].split(" ON")[0]
        print(f"  [{i}/11] {idx_name}...", end=" ", flush=True)
        c.execute(sql)
        conn.commit()
        print(f"{time.time()-t:.1f}s")

    # Step 4: Verify
    print("\nStep 4: Verifying...")
    c.execute("SELECT COUNT(*), SUM(CASE WHEN risk_level IN ('critical','high') THEN 1 ELSE 0 END), AVG(risk_score) FROM contracts")
    total, high, avg = c.fetchone()
    print(f"  Total: {total:,}")
    print(f"  High+: {high:,} ({high/total*100:.1f}%)")
    print(f"  Avg score: {avg:.4f}")

    conn.close()
    print(f"\nTotal time: {time.time()-total_start:.1f}s")
    print("DONE — v5.1 rollback complete.")

if __name__ == "__main__":
    main()
