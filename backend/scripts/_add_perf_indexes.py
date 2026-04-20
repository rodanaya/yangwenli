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
    # NEW: Multivariate anomaly filtering (contract_z_features)
    ("idx_z_features_mahalanobis_pvalue",
     "CREATE INDEX IF NOT EXISTS idx_z_features_mahalanobis_pvalue ON contract_z_features(mahalanobis_pvalue)"),
    # NEW: Election year risk query filtering
    ("idx_contracts_is_election_year",
     "CREATE INDEX IF NOT EXISTS idx_contracts_is_election_year ON contracts(is_election_year)"),
    # NEW: Data quality grade distribution
    ("idx_contracts_data_quality_grade",
     "CREATE INDEX IF NOT EXISTS idx_contracts_data_quality_grade ON contracts(data_quality_grade)"),
    # NEW: New vendor risk score query
    ("idx_vendor_stats_new_vendor_risk_score",
     "CREATE INDEX IF NOT EXISTS idx_vendor_stats_new_vendor_risk_score ON vendor_stats(new_vendor_risk_score)"),
    # CRITICAL (audit Apr-2026): ARIA queue full-scan fix — ORDER BY ips_final DESC without tier filter
    # was causing 30s+ query; this standalone index covers the common no-tier case
    ("idx_aria_queue_ips_final",
     "CREATE INDEX IF NOT EXISTS idx_aria_queue_ips_final ON aria_queue(ips_final DESC)"),
    # HIGH (audit Apr-2026): Covering indexes for collusion pairs endpoint
    ("idx_cobid_collusion_shared",
     "CREATE INDEX IF NOT EXISTS idx_cobid_collusion_shared ON co_bidding_stats(is_potential_collusion, shared_procedures DESC)"),
    ("idx_cobid_collusion_rate",
     "CREATE INDEX IF NOT EXISTS idx_cobid_collusion_rate ON co_bidding_stats(is_potential_collusion, co_bid_rate DESC)"),
]

def table_exists(conn, name):
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


print(f"DB: {DB_PATH}")
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode=WAL")

created = 0
for name, sql in INDEXES:
    # Extract table name from CREATE INDEX ... ON <table>(...)
    table = sql.split(" ON ")[1].split("(")[0].strip()
    if not table_exists(conn, table):
        print(f"  Skipping {name} — table '{table}' not in this DB")
        continue
    t0 = time.time()
    print(f"  Creating {name}...", end=" ", flush=True)
    conn.execute(sql)
    conn.commit()
    print(f"done ({time.time()-t0:.1f}s)")
    created += 1

conn.close()
print(f"Done. {created}/{len(INDEXES)} indexes created.")
