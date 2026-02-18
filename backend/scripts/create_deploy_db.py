"""
Create a deployment-optimized copy of the database.

Shrinks the 5.8GB development DB to under 3GB by:
1. Dropping tables not needed at runtime (z-features, price hypotheses, quality audit, etc.)
2. NULLing out heavy text columns not needed for web display (url, source_file)
3. Dropping legacy/redundant columns (risk_score_v3/v4/v5, price_hypothesis_*)
4. Dropping redundant indexes (37 → ~15 essential ones)
5. VACUUMing to reclaim all freed space

The original database is NEVER modified.
"""

import shutil
import sqlite3
import os
import sys
import time
from pathlib import Path

# Paths
SRC_DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DEPLOY_DB = Path(__file__).parent.parent / "RUBLI_DEPLOY.db"


def fmt_size(b: int) -> str:
    if b >= 1 << 30:
        return f"{b / (1 << 30):.2f} GB"
    return f"{b / (1 << 20):.0f} MB"


def step(msg: str):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def run():
    if not SRC_DB.exists():
        print(f"ERROR: Source DB not found: {SRC_DB}")
        sys.exit(1)

    src_size = os.path.getsize(SRC_DB)
    print(f"Source database: {fmt_size(src_size)} ({SRC_DB})")
    print(f"Target: {DEPLOY_DB}")

    # ── Step 1: Copy ──
    step("Step 1/7: Copying database")
    if DEPLOY_DB.exists():
        os.remove(DEPLOY_DB)
    t0 = time.time()
    shutil.copy2(SRC_DB, DEPLOY_DB)
    print(f"  Copied in {time.time() - t0:.1f}s")

    conn = sqlite3.connect(str(DEPLOY_DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-200000")  # 200MB cache
    cur = conn.cursor()

    # ── Step 2: Drop large non-essential tables ──
    step("Step 2/7: Dropping non-essential tables")

    tables_to_drop = [
        # Large computation tables (can be recomputed from pipeline)
        "contract_z_features",        # ~964 MB, 3.1M rows, 22 cols
        "price_hypotheses",           # ~373 MB, 390K rows
        "contract_quality",           # ~222 MB, 3.1M rows
        "vendor_investigation_features",  # ~119 MB, 59K rows
        "vendor_price_profiles",      # ~50 MB, 167K rows

        # Empty or near-empty legacy tables
        "risk_scores",                # 0 rows (legacy, scores live on contracts)
        "data_quality_audit",         # 0 rows
        "model_comparison",           # 0 rows
        "feature_importance",         # 0 rows
        "financial_metrics",          # 0 rows
        "vendor_merges",              # 0 rows
        "case_contracts",             # 0 rows

        # Metadata tables not needed at runtime
        "validation_results",         # 6 rows
        "field_profiles",             # 36 rows
        "hypothesis_runs",            # 1 row
        "sqlite_stat1",              # ANALYZE stats (will re-ANALYZE later)
    ]

    for tbl in tables_to_drop:
        try:
            cur.execute(f"DROP TABLE IF EXISTS [{tbl}]")
            print(f"  Dropped: {tbl}")
        except Exception as e:
            print(f"  WARN: Could not drop {tbl}: {e}")
    conn.commit()

    # Also drop the v_contracts_full view (references financial_metrics)
    cur.execute("DROP VIEW IF EXISTS v_contracts_full")
    conn.commit()
    print("  Dropped view: v_contracts_full")

    # ── Step 3: Slim down contracts table ──
    step("Step 3/7: Rebuilding contracts table (dropping columns + NULLing text)")

    # We need to recreate the table to actually remove columns.
    # Keep only columns used by the API.
    keep_columns = [
        "id", "source_structure", "source_year",
        "vendor_id", "institution_id", "contracting_unit_id",
        "sector_id", "sub_sector_id", "category_id", "ramo_id",
        "contract_number", "procedure_number", "expedient_code",
        "title", "description",
        "partida_especifica",
        "procedure_type", "procedure_type_normalized",
        "contract_type", "contract_type_normalized",
        "procedure_character", "participation_form",
        "contract_date", "start_date", "end_date", "award_date", "publication_date",
        "amount_mxn", "amount_original", "currency",
        "contract_year", "contract_month",
        "is_direct_award", "is_single_bid", "is_framework",
        "is_consolidated", "is_multiannual", "is_high_value", "is_year_end",
        "contract_status",
        "risk_score", "risk_level", "risk_factors",
        "risk_confidence_lower", "risk_confidence_upper",
        "mahalanobis_distance", "risk_model_version",
        "data_quality_score", "data_quality_grade",
    ]

    # Columns being DROPPED (not in keep_columns):
    # - source_file (~90MB), url (~305MB)
    # - risk_score_v3 (~13MB), risk_score_v4 (~23MB), risk_score_v5 (~23MB)
    # - risk_confidence (old), price_hypothesis_confidence, price_hypothesis_type
    # - created_at
    # Total savings: ~470MB from column data + row overhead

    cols_str = ", ".join(keep_columns)

    print(f"  Keeping {len(keep_columns)} of 58 columns")
    print(f"  Dropping: source_file, url, risk_score_v3/v4/v5, price_hypothesis_*, created_at, risk_confidence")

    # Save view definitions so we can recreate them after table rebuild
    cur.execute("SELECT name, sql FROM sqlite_master WHERE type = 'view'")
    views = [(name, sql) for name, sql in cur.fetchall() if sql]
    for vname, _ in views:
        cur.execute(f"DROP VIEW IF EXISTS [{vname}]")
    conn.commit()
    print(f"  Temporarily dropped {len(views)} views")

    t0 = time.time()
    cur.execute(f"""
        CREATE TABLE contracts_new AS
        SELECT {cols_str} FROM contracts
    """)
    conn.commit()
    print(f"  Created contracts_new in {time.time() - t0:.1f}s")

    # Drop old, rename new
    cur.execute("DROP TABLE contracts")
    cur.execute("ALTER TABLE contracts_new RENAME TO contracts")
    conn.commit()
    print("  Renamed contracts_new -> contracts")

    # Recreate views (skip v_contracts_full which references dropped financial_metrics)
    for vname, vsql in views:
        if "financial_metrics" in vsql:
            print(f"  Skipping view {vname} (references dropped table)")
            continue
        try:
            cur.execute(vsql)
            print(f"  Recreated view: {vname}")
        except Exception as e:
            print(f"  WARN: Could not recreate {vname}: {e}")
    conn.commit()

    # ── Step 4: Recreate essential indexes ──
    step("Step 4/7: Creating essential indexes only")

    essential_indexes = [
        # Primary lookup
        ("idx_c_vendor_id", "contracts(vendor_id)"),
        ("idx_c_institution_id", "contracts(institution_id)"),
        ("idx_c_sector_id", "contracts(sector_id)"),
        ("idx_c_year", "contracts(contract_year)"),
        ("idx_c_date", "contracts(contract_date)"),

        # Common compound queries
        ("idx_c_sector_year", "contracts(sector_id, contract_year)"),
        ("idx_c_vendor_year", "contracts(vendor_id, contract_year)"),
        ("idx_c_inst_year", "contracts(institution_id, contract_year)"),

        # Risk filtering
        ("idx_c_risk_level", "contracts(risk_level)"),
        ("idx_c_risk_score", "contracts(risk_score)"),
        ("idx_c_sector_risk", "contracts(sector_id, risk_level, risk_score)"),

        # Amount filtering
        ("idx_c_amount", "contracts(amount_mxn)"),

        # Procedure filtering
        ("idx_c_direct_award", "contracts(is_direct_award)"),
        ("idx_c_single_bid", "contracts(is_single_bid)"),
        ("idx_c_procedure", "contracts(procedure_number)"),

        # Category
        ("idx_c_category", "contracts(category_id)"),
    ]

    for idx_name, idx_def in essential_indexes:
        cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
        print(f"  Created: {idx_name}")
    conn.commit()

    # ── Step 5: Drop redundant indexes on other tables ──
    step("Step 5/7: Cleaning up other indexes")

    # Get all remaining indexes
    cur.execute("""
        SELECT name, tbl_name FROM sqlite_master
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE 'idx_c_%'
    """)
    other_indexes = cur.fetchall()

    # Keep indexes on small reference tables, drop ones on dropped tables
    dropped_tables = {t.lower() for t in tables_to_drop}
    for idx_name, tbl_name in other_indexes:
        if tbl_name.lower() in dropped_tables:
            try:
                cur.execute(f"DROP INDEX IF EXISTS [{idx_name}]")
            except:
                pass
    conn.commit()
    print(f"  Cleaned orphaned indexes from dropped tables")

    # ── Step 6: Run ANALYZE ──
    step("Step 6/7: Running ANALYZE for query planner")
    t0 = time.time()
    cur.execute("ANALYZE")
    conn.commit()
    print(f"  ANALYZE completed in {time.time() - t0:.1f}s")

    # ── Step 7: VACUUM ──
    step("Step 7/7: VACUUMing to reclaim space")
    conn.close()

    # VACUUM needs to be on a fresh connection (not in WAL mode for best results)
    conn = sqlite3.connect(str(DEPLOY_DB))
    conn.execute("PRAGMA journal_mode=DELETE")

    t0 = time.time()
    print("  Running VACUUM (this takes a while)...")
    conn.execute("VACUUM")
    conn.close()
    print(f"  VACUUM completed in {time.time() - t0:.1f}s")

    # ── Report ──
    final_size = os.path.getsize(DEPLOY_DB)
    savings = src_size - final_size
    pct = (savings / src_size) * 100

    print(f"\n{'='*60}")
    print(f"  DEPLOYMENT DATABASE READY")
    print(f"{'='*60}")
    print(f"  Source:  {fmt_size(src_size)}")
    print(f"  Deploy:  {fmt_size(final_size)}")
    print(f"  Saved:   {fmt_size(savings)} ({pct:.1f}%)")
    print(f"  Target:  {'PASS' if final_size < 3 * (1 << 30) else 'FAIL'} (< 3 GB)")
    print(f"  Output:  {DEPLOY_DB}")
    print()

    if final_size >= 3 * (1 << 30):
        print("  WARNING: Still over 3 GB. Additional trimming needed.")
        print("  Options:")
        print("    - NULL out description column (~159 MB)")
        print("    - NULL out risk_factors column (~131 MB)")
        print("    - Truncate title to 100 chars")
    else:
        print("  Database is ready for deployment!")


if __name__ == "__main__":
    run()
