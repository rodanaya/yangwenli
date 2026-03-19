"""
Build RUBLI_DEPLOY.db from RUBLI_NORMALIZED.db.

Strips large analytical tables not needed in production to reduce size from ~6GB to ~2.5GB.
"""

import os
import shutil
import sqlite3
import time
import sys

SOURCE = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")
DEPLOY = os.path.join(os.path.dirname(__file__), "..", "RUBLI_DEPLOY.db")

# Tables to DROP — large analytical/legacy tables not needed in production.
# IMPORTANT: If a table is used by ANY production API endpoint or frontend page,
# it must NOT be in this list. Check api/ routes before adding tables here.
TABLES_TO_DROP = [
    # --- Large analytical tables (retraining/enrichment only) ---
    "contract_anomaly_scores",   # 9.3M rows — PyOD ensemble, analytical only
    "contract_z_features",       # 3M rows — z-score features, needed for retraining only
    "contract_ml_anomalies",     # 1K rows — legacy ML anomalies

    # --- Deduplication/registry tables (not used in prod API) ---
    "vendor_canonical_map",      # 320K rows — dedup map, not used in prod API
    "company_registry",          # 320K rows — shell detection registry
    "vendor_aliases",            # 12K rows — alias data, not used in prod

    # --- Corporate group tables (not surfaced in UI) ---
    "corporate_group_members",   # 6K rows
    "corporate_groups",          # 278 rows

    # --- ARIA internal tables ---
    "aria_gt_updates",           # 6.5K rows — GT update log, not needed in prod

    # --- Temp/scoring tables ---
    "_scoring_temp",             # Temp scoring table
    "risk_scores",               # Empty legacy table

    # --- Empty/unused tables — safe to drop ---
    "contract_quality",
    "contracting_units",
    "exchange_rates",
    "financial_metrics",
    "hypothesis_runs",
    "model_comparison",
    "official_risk_profiles",
    "price_hypotheses",
    "risk_feedback",
    "sidec_complaints",
    "validation_results",
    "vendor_investigation_features",
    "vendor_price_profiles",
    "investigation_folder_items",
    "aria_web_evidence",
    "asf_institution_findings",
    "asf_ramo_crosswalk",
]

# Tables KEPT for production (do NOT add to TABLES_TO_DROP):
# - vendor_classifications (320K) — VendorProfile industry classification
# - vendor_institution_tenure (196K) — VendorProfile tenure display
# - vendor_name_variants (0 rows but schema needed) — VendorProfile name variations
# - vendor_scorecards (138K) — Report Card "Vendors" tab
# - institution_scorecards (2.5K) — Report Card "Institutions" tab
# - vendor_shap_v52 (456K) — SHAP explanations for VendorProfile
# - co_bidding_stats (352K) — co-bidding analysis endpoints
# - institution_top_vendors (628K) — analysis routes (money-flow, institution detail)


def sizeof_fmt(num):
    for unit in ("B", "KB", "MB", "GB"):
        if abs(num) < 1024.0:
            return f"{num:.1f} {unit}"
        num /= 1024.0
    return f"{num:.1f} TB"


def main():
    source = os.path.abspath(SOURCE)
    deploy = os.path.abspath(DEPLOY)

    print(f"Source: {source} ({sizeof_fmt(os.path.getsize(source))})")
    print(f"Deploy: {deploy}")
    print()

    # Step 1: Copy source to deploy
    print("Step 1: Copying source DB to deploy path...")
    t0 = time.time()
    if os.path.exists(deploy):
        os.remove(deploy)
    # Also remove any stale WAL/SHM from old deploy
    for ext in ("-wal", "-shm"):
        p = deploy + ext
        if os.path.exists(p):
            os.remove(p)
    shutil.copy2(source, deploy)
    print(f"  Copied in {time.time() - t0:.1f}s ({sizeof_fmt(os.path.getsize(deploy))})")

    # Step 2: Checkpoint WAL on source (read-only — just in case)
    # Actually we checkpoint on the DEPLOY copy, not source
    print("\nStep 2: Configuring deploy DB...")
    conn = sqlite3.connect(deploy)
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.execute("PRAGMA journal_mode = DELETE")
    conn.execute("PRAGMA synchronous = OFF")
    print("  journal_mode=DELETE, synchronous=OFF")

    # Step 3: Drop tables
    print(f"\nStep 3: Dropping {len(TABLES_TO_DROP)} non-essential tables...")
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing = {r[0] for r in cur.fetchall()}

    dropped = 0
    for table in TABLES_TO_DROP:
        if table in existing:
            t0 = time.time()
            cur.execute(f"DROP TABLE IF EXISTS [{table}]")
            conn.commit()
            elapsed = time.time() - t0
            print(f"  Dropped {table} ({elapsed:.1f}s)")
            dropped += 1
        else:
            print(f"  Skipped {table} (not found)")

    print(f"  Dropped {dropped} tables")
    print(f"  Size before VACUUM: {sizeof_fmt(os.path.getsize(deploy))}")

    # Step 4: VACUUM
    print("\nStep 4: Running VACUUM (this takes a while)...")
    t0 = time.time()
    conn.execute("VACUUM")
    elapsed = time.time() - t0
    conn.close()
    print(f"  VACUUM completed in {elapsed:.1f}s")
    print(f"  Size after VACUUM: {sizeof_fmt(os.path.getsize(deploy))}")

    # Step 5: Verify remaining tables
    print("\nStep 5: Verifying deploy DB...")
    conn = sqlite3.connect(deploy)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    print(f"  {len(tables)} tables remaining:")
    for t in tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM [{t}]")
            count = cur.fetchone()[0]
            print(f"    {t}: {count:,}")
        except Exception as e:
            print(f"    {t}: ERROR - {e}")

    # Quick sanity check
    cur.execute("SELECT COUNT(*) FROM contracts")
    n_contracts = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM vendors")
    n_vendors = cur.fetchone()[0]
    conn.close()

    print(f"\n  Contracts: {n_contracts:,}")
    print(f"  Vendors: {n_vendors:,}")

    # Step 6: Run ghost company companion heuristic (new_vendor_risk flags)
    print("\nStep 6: Computing new_vendor_risk flags (ghost company heuristic)...")
    import subprocess
    script_path = os.path.join(os.path.dirname(__file__), "compute_new_vendor_flags.py")
    if os.path.exists(script_path):
        env = os.environ.copy()
        env["RUBLI_DB_PATH"] = deploy
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True, text=True, env=env
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if any(k in line for k in ["Flagged", "aria_queue", "Done"]):
                    print(f"  {line.strip()}")
        else:
            print(f"  WARNING: compute_new_vendor_flags failed: {result.stderr[:200]}")
    else:
        print("  Skipped (compute_new_vendor_flags.py not found)")

    final_size = os.path.getsize(deploy)
    print(f"\nFinal deploy DB: {sizeof_fmt(final_size)}")
    print("Done!")

    return 0


if __name__ == "__main__":
    sys.exit(main())
