"""
Add missing performance indexes identified in backend audit.
Run once against both RUBLI_NORMALIZED.db and RUBLI_DEPLOY.db.
Safe to run multiple times (uses IF NOT EXISTS).
"""
import sqlite3
import sys
import time
from pathlib import Path

DB_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

INDEXES = [
    # CRITICAL: price outlier queries scan 3.05M rows without this
    ("idx_z_features_price_ratio",
     "CREATE INDEX IF NOT EXISTS idx_z_features_price_ratio ON contract_z_features(z_price_ratio DESC) WHERE z_price_ratio > 0"),
    # HIGH: institution+risk_level queries use wrong index (risk_level → 413K rows vs institution → few hundred)
    ("idx_c_inst_risk",
     "CREATE INDEX IF NOT EXISTS idx_c_inst_risk ON contracts(institution_id, risk_level, amount_mxn DESC)"),
    # HIGH: vendor contract list needs temp B-tree sort eliminated
    ("idx_c_vendor_date",
     "CREATE INDEX IF NOT EXISTS idx_c_vendor_date ON contracts(vendor_id, contract_date DESC)"),
    # MEDIUM: ARIA queue tier+score ordering needs temp B-tree
    ("idx_aria_queue_tier_score",
     "CREATE INDEX IF NOT EXISTS idx_aria_queue_tier_score ON aria_queue(ips_tier, ips_final DESC)"),
]

print(f"DB: {DB_PATH}")
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode=WAL")

for name, sql in INDEXES:
    t0 = time.time()
    print(f"  Creating {name}...", end=" ", flush=True)
    conn.execute(sql)
    conn.commit()
    print(f"done ({time.time()-t0:.1f}s)")

conn.close()
print("All indexes created.")
