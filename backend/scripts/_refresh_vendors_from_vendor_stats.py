"""
S.6 — Sync vendors.* from vendor_stats (canonical source).

vendor_stats is computed from raw contracts by the ETL pipeline.
vendors.total_contracts / total_amount_mxn / avg_risk_score can drift
after incremental ETL runs. This script backfills them from vendor_stats.

Runs on RUBLI_NORMALIZED.db (deploy DB does not have vendors table).
"""
import sqlite3, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

DB = "RUBLI_NORMALIZED.db"

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=OFF")
c = conn.cursor()

# Sync total_contracts
c.execute("""
    UPDATE vendors
    SET total_contracts = (
        SELECT vs.total_contracts FROM vendor_stats vs WHERE vs.vendor_id = vendors.id
    )
    WHERE id IN (
        SELECT v.id FROM vendors v
        JOIN vendor_stats vs ON vs.vendor_id = v.id
        WHERE ABS(CAST(v.total_contracts AS REAL) - vs.total_contracts) > 0.001 * vs.total_contracts
        AND vs.total_contracts > 10
    )
""")
contracts_updated = c.rowcount
print(f"total_contracts synced: {contracts_updated:,}")

# Sync total_amount_mxn
c.execute("""
    UPDATE vendors
    SET total_amount_mxn = (
        SELECT vs.total_value_mxn FROM vendor_stats vs WHERE vs.vendor_id = vendors.id
    )
    WHERE id IN (
        SELECT v.id FROM vendors v
        JOIN vendor_stats vs ON vs.vendor_id = v.id
        WHERE vs.total_value_mxn IS NOT NULL
        AND ABS(COALESCE(v.total_amount_mxn, 0) - vs.total_value_mxn) > 0.001 * vs.total_value_mxn
        AND vs.total_value_mxn > 1000000
    )
""")
amount_updated = c.rowcount
print(f"total_amount_mxn synced: {amount_updated:,}")

# Sync avg_risk_score from vendor_stats (v0.8.5 canonical)
c.execute("""
    UPDATE vendors
    SET avg_risk_score = (
        SELECT vs.avg_risk_score FROM vendor_stats vs WHERE vs.vendor_id = vendors.id
    )
    WHERE id IN (
        SELECT v.id FROM vendors v
        JOIN vendor_stats vs ON vs.vendor_id = v.id
        WHERE vs.avg_risk_score IS NOT NULL
        AND ABS(COALESCE(v.avg_risk_score, 0) - vs.avg_risk_score) > 0.005
    )
""")
risk_updated = c.rowcount
print(f"avg_risk_score synced: {risk_updated:,}")

conn.commit()
conn.close()

print("\nVerification:")
conn2 = sqlite3.connect(DB)
c2 = conn2.cursor()
c2.execute("""
    SELECT COUNT(*) FROM vendors v
    JOIN vendor_stats vs ON vs.vendor_id = v.id
    WHERE ABS(CAST(v.total_contracts AS REAL) - vs.total_contracts) > 0.001 * vs.total_contracts
    AND vs.total_contracts > 10
""")
remaining = c2.fetchone()[0]
print(f"Vendors still with >0.1% drift: {remaining:,}")
conn2.close()
print("Done.")
