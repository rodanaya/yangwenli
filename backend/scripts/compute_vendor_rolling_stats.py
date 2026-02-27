"""
Compute Vendor Rolling Stats for Temporal Feature Leakage Fix (C1)

Builds a vendor_rolling_stats table with cumulative vendor-level aggregates
up to each year, so that a contract in year Y uses only data from years <= Y-1.

This prevents temporal feature leakage where vendor features (concentration,
win_rate, price_volatility, institution_diversity, sector_spread) were
previously computed using ALL contracts (2002-2025), meaning a 2019 contract
could see 2020-2025 data.

Schema: vendor_rolling_stats (vendor_id, sector_id, as_of_year, ...)
    One row per (vendor, sector, year) with cumulative stats up to that year.

Usage:
    python -m scripts.compute_vendor_rolling_stats [--batch-size 100000]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def create_rolling_stats_table(conn: sqlite3.Connection):
    """Create vendor_rolling_stats table."""
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS vendor_rolling_stats")
    cursor.execute("""
        CREATE TABLE vendor_rolling_stats (
            vendor_id INTEGER NOT NULL,
            sector_id INTEGER NOT NULL,
            as_of_year INTEGER NOT NULL,
            total_value REAL DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            sum_sq_amount REAL DEFAULT 0,
            comp_wins INTEGER DEFAULT 0,
            comp_total INTEGER DEFAULT 0,
            n_institutions INTEGER DEFAULT 0,
            inst_hhi REAL DEFAULT 1.0,
            n_sectors INTEGER DEFAULT 0,
            PRIMARY KEY (vendor_id, sector_id, as_of_year)
        )
    """)
    # Index for the join in compute_z_features
    cursor.execute("""
        CREATE INDEX idx_vrs_vendor_year
        ON vendor_rolling_stats(vendor_id, as_of_year)
    """)
    conn.commit()
    print("Created vendor_rolling_stats table")


def compute_and_insert_rolling_stats(conn: sqlite3.Connection):
    """Compute cumulative vendor stats using window functions.

    For each (vendor_id, sector_id, year), computes running totals of:
    - total_value: cumulative SUM(amount_mxn) up to this year
    - total_count: cumulative COUNT up to this year
    - sum_sq_amount: cumulative SUM(amount_mxn^2) for rolling stddev
    - comp_wins: cumulative competitive procedure wins
    - comp_total: cumulative competitive procedures in sector (not vendor-specific)
    - n_institutions: distinct institutions served up to this year
    - inst_hhi: institution HHI based on cumulative data
    - n_sectors: distinct sectors the vendor operates in up to this year
    """
    cursor = conn.cursor()

    # Step 1: Compute per-(vendor, sector, year) annual aggregates
    print("\n  Step 1: Computing annual aggregates per (vendor, sector, year)...")
    cursor.execute("""
        CREATE TEMP TABLE _vendor_sector_year_agg AS
        SELECT
            vendor_id,
            sector_id,
            contract_year AS year,
            SUM(CASE WHEN amount_mxn > 0 AND amount_mxn < 100000000000
                     THEN amount_mxn ELSE 0 END) AS annual_value,
            COUNT(*) AS annual_count,
            SUM(CASE WHEN amount_mxn > 0 AND amount_mxn < 100000000000
                     THEN amount_mxn * amount_mxn ELSE 0 END) AS annual_sum_sq,
            SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END) AS annual_comp_wins
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL AND contract_year IS NOT NULL
        GROUP BY vendor_id, sector_id, contract_year
    """)
    cursor.execute("SELECT COUNT(*) FROM _vendor_sector_year_agg")
    agg_count = cursor.fetchone()[0]
    print(f"    {agg_count:,} annual aggregate rows")

    # Step 2: Compute cumulative stats using window functions
    print("  Step 2: Computing cumulative rolling stats...")
    cursor.execute("""
        CREATE TEMP TABLE _vendor_sector_cumulative AS
        SELECT
            vendor_id,
            sector_id,
            year AS as_of_year,
            SUM(annual_value) OVER (
                PARTITION BY vendor_id, sector_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS total_value,
            SUM(annual_count) OVER (
                PARTITION BY vendor_id, sector_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS total_count,
            SUM(annual_sum_sq) OVER (
                PARTITION BY vendor_id, sector_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS sum_sq_amount,
            SUM(annual_comp_wins) OVER (
                PARTITION BY vendor_id, sector_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS comp_wins
        FROM _vendor_sector_year_agg
    """)

    # Step 3: Compute sector-level cumulative competitive totals
    # (total competitive contracts in each sector up to each year)
    print("  Step 3: Computing sector cumulative competitive totals...")
    cursor.execute("""
        CREATE TEMP TABLE _sector_year_comp AS
        SELECT
            sector_id,
            contract_year AS year,
            SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END) AS annual_comp
        FROM contracts
        WHERE sector_id IS NOT NULL AND contract_year IS NOT NULL
        GROUP BY sector_id, contract_year
    """)
    cursor.execute("""
        CREATE TEMP TABLE _sector_cumulative_comp AS
        SELECT
            sector_id,
            year AS as_of_year,
            SUM(annual_comp) OVER (
                PARTITION BY sector_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS comp_total
        FROM _sector_year_comp
    """)

    # Step 4: Compute institution diversity (HHI) and n_institutions per vendor up to each year
    # This requires a more complex approach since HHI needs per-institution counts
    print("  Step 4: Computing institution diversity (HHI) per vendor per year...")

    # First: per (vendor, institution, year) cumulative counts
    cursor.execute("""
        CREATE TEMP TABLE _vendor_inst_year AS
        SELECT
            vendor_id,
            institution_id,
            contract_year AS year,
            COUNT(*) AS annual_count
        FROM contracts
        WHERE vendor_id IS NOT NULL AND institution_id IS NOT NULL
          AND contract_year IS NOT NULL
        GROUP BY vendor_id, institution_id, contract_year
    """)

    cursor.execute("""
        CREATE TEMP TABLE _vendor_inst_cumulative AS
        SELECT
            vendor_id,
            institution_id,
            year AS as_of_year,
            SUM(annual_count) OVER (
                PARTITION BY vendor_id, institution_id ORDER BY year
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cum_count
        FROM _vendor_inst_year
    """)

    # For HHI: need sum(share^2) where share = cum_count / total_cum_count per vendor per year
    # Compute total per vendor per year, then join
    cursor.execute("""
        CREATE TEMP TABLE _vendor_year_inst_hhi AS
        SELECT
            vic.vendor_id,
            vic.as_of_year,
            COUNT(DISTINCT vic.institution_id) AS n_institutions,
            SUM(
                (CAST(vic.cum_count AS REAL) / vt.total_cum) *
                (CAST(vic.cum_count AS REAL) / vt.total_cum)
            ) AS inst_hhi
        FROM _vendor_inst_cumulative vic
        JOIN (
            SELECT vendor_id, as_of_year, SUM(cum_count) AS total_cum
            FROM _vendor_inst_cumulative
            GROUP BY vendor_id, as_of_year
        ) vt ON vic.vendor_id = vt.vendor_id AND vic.as_of_year = vt.as_of_year
        WHERE vt.total_cum > 0
        GROUP BY vic.vendor_id, vic.as_of_year
    """)

    # Step 5: Compute n_sectors per vendor up to each year
    print("  Step 5: Computing sector spread per vendor per year...")
    cursor.execute("""
        CREATE TEMP TABLE _vendor_sector_year_presence AS
        SELECT DISTINCT vendor_id, sector_id, contract_year AS year
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
          AND contract_year IS NOT NULL
    """)

    # For n_sectors: need cumulative distinct count of sectors up to each year
    # Use a self-join approach: for each (vendor, year), count distinct sectors
    # from all years <= that year
    cursor.execute("""
        CREATE TEMP TABLE _vendor_year_nsectors AS
        SELECT
            a.vendor_id,
            a.year AS as_of_year,
            COUNT(DISTINCT b.sector_id) AS n_sectors
        FROM (
            SELECT DISTINCT vendor_id, year FROM _vendor_sector_year_presence
        ) a
        JOIN _vendor_sector_year_presence b
            ON a.vendor_id = b.vendor_id AND b.year <= a.year
        GROUP BY a.vendor_id, a.year
    """)

    # Step 6: Assemble final rolling stats table
    print("  Step 6: Assembling vendor_rolling_stats...")
    cursor.execute("""
        INSERT INTO vendor_rolling_stats (
            vendor_id, sector_id, as_of_year,
            total_value, total_count, sum_sq_amount,
            comp_wins, comp_total,
            n_institutions, inst_hhi, n_sectors
        )
        SELECT
            vsc.vendor_id,
            vsc.sector_id,
            vsc.as_of_year,
            vsc.total_value,
            vsc.total_count,
            vsc.sum_sq_amount,
            vsc.comp_wins,
            COALESCE(scc.comp_total, 0),
            COALESCE(vyih.n_institutions, 0),
            COALESCE(vyih.inst_hhi, 1.0),
            COALESCE(vyns.n_sectors, 1)
        FROM _vendor_sector_cumulative vsc
        LEFT JOIN _sector_cumulative_comp scc
            ON vsc.sector_id = scc.sector_id AND vsc.as_of_year = scc.as_of_year
        LEFT JOIN _vendor_year_inst_hhi vyih
            ON vsc.vendor_id = vyih.vendor_id AND vsc.as_of_year = vyih.as_of_year
        LEFT JOIN _vendor_year_nsectors vyns
            ON vsc.vendor_id = vyns.vendor_id AND vsc.as_of_year = vyns.as_of_year
    """)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM vendor_rolling_stats")
    total_rows = cursor.fetchone()[0]
    print(f"    Inserted {total_rows:,} rows into vendor_rolling_stats")

    # Cleanup temp tables
    for t in ['_vendor_sector_year_agg', '_vendor_sector_cumulative',
              '_sector_year_comp', '_sector_cumulative_comp',
              '_vendor_inst_year', '_vendor_inst_cumulative',
              '_vendor_year_inst_hhi', '_vendor_sector_year_presence',
              '_vendor_year_nsectors']:
        cursor.execute(f"DROP TABLE IF EXISTS {t}")
    conn.commit()

    return total_rows


def main():
    parser = argparse.ArgumentParser(
        description='Compute vendor rolling stats to fix temporal feature leakage'
    )
    parser.add_argument('--batch-size', type=int, default=100000,
                        help='Batch size (unused, kept for CLI consistency)')
    args = parser.parse_args()

    print("=" * 60)
    print("FIX C1: Compute Vendor Rolling Stats")
    print("  Fixes temporal feature leakage in vendor-level features")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=120)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=120000")
    # Use synchronous=NORMAL for reasonable speed without full PRAGMA synchronous=OFF risk
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")  # 200MB cache

    try:
        start = datetime.now()

        # Create table
        create_rolling_stats_table(conn)

        # Compute and insert
        total_rows = compute_and_insert_rolling_stats(conn)

        # Summary statistics
        cursor = conn.cursor()
        cursor.execute("""
            SELECT MIN(as_of_year), MAX(as_of_year), COUNT(DISTINCT vendor_id)
            FROM vendor_rolling_stats
        """)
        min_year, max_year, n_vendors = cursor.fetchone()

        cursor.execute("""
            SELECT as_of_year, COUNT(*) FROM vendor_rolling_stats
            GROUP BY as_of_year ORDER BY as_of_year
        """)
        year_counts = cursor.fetchall()

        elapsed = (datetime.now() - start).total_seconds()

        print(f"\n{'='*60}")
        print("VENDOR ROLLING STATS COMPLETE")
        print(f"{'='*60}")
        print(f"Total rows: {total_rows:,}")
        print(f"Vendors: {n_vendors:,}")
        print(f"Year range: {min_year}-{max_year}")
        print(f"\nRows per year (sample):")
        for yr, cnt in year_counts[:5]:
            print(f"  {yr}: {cnt:,}")
        if len(year_counts) > 5:
            print(f"  ...")
            for yr, cnt in year_counts[-3:]:
                print(f"  {yr}: {cnt:,}")
        print(f"\nTime: {elapsed:.1f}s")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
