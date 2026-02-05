"""
Sector Baselines Calculator

Calculates per-sector thresholds for contextual risk scoring.
What's "normal" varies by sector - Energia naturally has higher vendor concentration,
Salud has more direct awards for emergency medical supplies, etc.

Creates sector_baselines table with percentile-based thresholds.

Usage:
    python -m scripts.calculate_sector_baselines
"""

import sys
import sqlite3
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def ensure_sector_baselines_table(conn: sqlite3.Connection):
    """Create sector_baselines table if it doesn't exist."""
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sector_baselines (
            id INTEGER PRIMARY KEY,
            sector_id INTEGER NOT NULL,
            metric_name VARCHAR(50) NOT NULL,
            percentile_25 REAL,
            percentile_50 REAL,  -- median
            percentile_75 REAL,
            percentile_90 REAL,
            percentile_95 REAL,
            mean_value REAL,
            std_dev REAL,
            red_flag_threshold REAL,  -- Context-specific threshold
            sample_count INTEGER,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sector_id, metric_name)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_sector_baselines_sector
        ON sector_baselines(sector_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_sector_baselines_metric
        ON sector_baselines(sector_id, metric_name)
    """)

    conn.commit()
    print("Sector baselines table ready")


def percentile(sorted_values: list, p: float) -> float:
    """Calculate percentile from sorted values."""
    if not sorted_values:
        return 0.0
    n = len(sorted_values)
    idx = int(p * n / 100)
    if idx >= n:
        idx = n - 1
    return sorted_values[idx]


def calculate_contract_amount_baselines(conn: sqlite3.Connection) -> dict:
    """Calculate contract amount distributions per sector."""
    cursor = conn.cursor()

    print("\nCalculating contract amount baselines...")

    # Get amounts by sector (exclude invalid amounts)
    cursor.execute("""
        SELECT sector_id, amount_mxn
        FROM contracts
        WHERE sector_id IS NOT NULL
          AND amount_mxn > 0
          AND amount_mxn <= 100000000000  -- Exclude data errors (>100B)
        ORDER BY sector_id, amount_mxn
    """)

    sector_amounts = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, amount = row
        sector_amounts[sector_id].append(amount)

    results = {}
    for sector_id, amounts in sector_amounts.items():
        amounts.sort()
        n = len(amounts)
        mean = sum(amounts) / n if n > 0 else 0
        variance = sum((x - mean) ** 2 for x in amounts) / n if n > 0 else 0
        std_dev = variance ** 0.5

        p50 = percentile(amounts, 50)
        p75 = percentile(amounts, 75)
        p90 = percentile(amounts, 90)

        # IQR-based red flag threshold (Q3 + 1.5 * IQR)
        p25 = percentile(amounts, 25)
        iqr = p75 - p25
        red_flag = p75 + 1.5 * iqr

        results[sector_id] = {
            'metric': 'contract_amount',
            'p25': p25,
            'p50': p50,
            'p75': p75,
            'p90': p90,
            'p95': percentile(amounts, 95),
            'mean': mean,
            'std_dev': std_dev,
            'red_flag': red_flag,
            'count': n
        }

        print(f"  Sector {sector_id}: median={p50/1e6:.1f}M, red_flag={red_flag/1e9:.2f}B ({n:,} contracts)")

    return results


def calculate_vendor_concentration_baselines(conn: sqlite3.Connection) -> dict:
    """Calculate vendor concentration distributions per sector."""
    cursor = conn.cursor()

    print("\nCalculating vendor concentration baselines...")

    # Get vendor concentration by sector
    cursor.execute("""
        WITH vendor_sector_share AS (
            SELECT
                c.vendor_id,
                c.sector_id,
                SUM(c.amount_mxn) as vendor_value,
                (SELECT SUM(amount_mxn) FROM contracts WHERE sector_id = c.sector_id) as sector_total
            FROM contracts c
            WHERE c.vendor_id IS NOT NULL
              AND c.sector_id IS NOT NULL
              AND c.amount_mxn > 0
            GROUP BY c.vendor_id, c.sector_id
        )
        SELECT
            sector_id,
            CASE WHEN sector_total > 0 THEN vendor_value * 1.0 / sector_total ELSE 0 END as concentration
        FROM vendor_sector_share
        WHERE sector_total > 0
        ORDER BY sector_id, concentration
    """)

    sector_conc = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, conc = row
        sector_conc[sector_id].append(conc)

    results = {}
    for sector_id, concentrations in sector_conc.items():
        concentrations.sort()
        n = len(concentrations)
        mean = sum(concentrations) / n if n > 0 else 0

        p50 = percentile(concentrations, 50)
        p75 = percentile(concentrations, 75)
        p90 = percentile(concentrations, 90)
        p95 = percentile(concentrations, 95)

        # Red flag = 90th percentile (sector-specific)
        red_flag = p90

        results[sector_id] = {
            'metric': 'vendor_concentration',
            'p25': percentile(concentrations, 25),
            'p50': p50,
            'p75': p75,
            'p90': p90,
            'p95': p95,
            'mean': mean,
            'std_dev': 0,  # Not critical for concentration
            'red_flag': red_flag,
            'count': n
        }

        print(f"  Sector {sector_id}: median={p50*100:.2f}%, red_flag={red_flag*100:.2f}% ({n:,} vendors)")

    return results


def calculate_direct_award_baselines(conn: sqlite3.Connection) -> dict:
    """Calculate direct award rate distributions per sector."""
    cursor = conn.cursor()

    print("\nCalculating direct award rate baselines...")

    # Get institution-level direct award rates by sector
    cursor.execute("""
        SELECT
            c.sector_id,
            c.institution_id,
            SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as da_rate
        FROM contracts c
        WHERE c.sector_id IS NOT NULL
          AND c.institution_id IS NOT NULL
        GROUP BY c.sector_id, c.institution_id
        HAVING COUNT(*) >= 10  -- Minimum sample size
        ORDER BY c.sector_id, da_rate
    """)

    sector_rates = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, inst_id, rate = row
        sector_rates[sector_id].append(rate)

    results = {}
    for sector_id, rates in sector_rates.items():
        rates.sort()
        n = len(rates)
        mean = sum(rates) / n if n > 0 else 0

        p50 = percentile(rates, 50)
        p75 = percentile(rates, 75)
        p90 = percentile(rates, 90)

        # Red flag = above 90th percentile for the sector
        red_flag = p90

        results[sector_id] = {
            'metric': 'direct_award_rate',
            'p25': percentile(rates, 25),
            'p50': p50,
            'p75': p75,
            'p90': p90,
            'p95': percentile(rates, 95),
            'mean': mean,
            'std_dev': 0,
            'red_flag': red_flag,
            'count': n
        }

        print(f"  Sector {sector_id}: median={p50*100:.1f}%, red_flag={p90*100:.1f}% ({n:,} institutions)")

    return results


def calculate_single_bid_baselines(conn: sqlite3.Connection) -> dict:
    """Calculate single bid rate distributions per sector."""
    cursor = conn.cursor()

    print("\nCalculating single bid rate baselines...")

    # Get institution-level single bid rates by sector
    cursor.execute("""
        SELECT
            c.sector_id,
            c.institution_id,
            SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN c.is_direct_award = 0 THEN 1 ELSE 0 END), 0) as sb_rate
        FROM contracts c
        WHERE c.sector_id IS NOT NULL
          AND c.institution_id IS NOT NULL
        GROUP BY c.sector_id, c.institution_id
        HAVING SUM(CASE WHEN c.is_direct_award = 0 THEN 1 ELSE 0 END) >= 5  -- Minimum competitive procedures
        ORDER BY c.sector_id, sb_rate
    """)

    sector_rates = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, inst_id, rate = row
        if rate is not None:
            sector_rates[sector_id].append(rate)

    results = {}
    for sector_id, rates in sector_rates.items():
        rates.sort()
        n = len(rates)
        if n == 0:
            continue

        mean = sum(rates) / n
        p50 = percentile(rates, 50)
        p75 = percentile(rates, 75)
        p90 = percentile(rates, 90)

        # Red flag = above 90th percentile for the sector
        red_flag = p90

        results[sector_id] = {
            'metric': 'single_bid_rate',
            'p25': percentile(rates, 25),
            'p50': p50,
            'p75': p75,
            'p90': p90,
            'p95': percentile(rates, 95),
            'mean': mean,
            'std_dev': 0,
            'red_flag': red_flag,
            'count': n
        }

        print(f"  Sector {sector_id}: median={p50*100:.1f}%, red_flag={p90*100:.1f}% ({n:,} institutions)")

    return results


def calculate_ad_period_baselines(conn: sqlite3.Connection) -> dict:
    """Calculate advertisement period distributions per sector."""
    cursor = conn.cursor()

    print("\nCalculating advertisement period baselines...")

    # Get ad period (publication to contract date) by sector
    cursor.execute("""
        SELECT
            sector_id,
            CAST(julianday(contract_date) - julianday(publication_date) AS INTEGER) as ad_days
        FROM contracts
        WHERE sector_id IS NOT NULL
          AND publication_date IS NOT NULL
          AND contract_date IS NOT NULL
          AND publication_date != ''
          AND contract_date != ''
          AND julianday(contract_date) >= julianday(publication_date)
          AND julianday(contract_date) - julianday(publication_date) <= 365  -- Reasonable range
        ORDER BY sector_id, ad_days
    """)

    sector_days = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, days = row
        if days is not None and days >= 0:
            sector_days[sector_id].append(days)

    results = {}
    for sector_id, days_list in sector_days.items():
        days_list.sort()
        n = len(days_list)
        if n == 0:
            continue

        mean = sum(days_list) / n
        p10 = percentile(days_list, 10)
        p25 = percentile(days_list, 25)
        p50 = percentile(days_list, 50)

        # Red flag = below 10th percentile (too short)
        red_flag = p10

        results[sector_id] = {
            'metric': 'ad_period_days',
            'p25': p25,
            'p50': p50,
            'p75': percentile(days_list, 75),
            'p90': percentile(days_list, 90),
            'p95': percentile(days_list, 95),
            'mean': mean,
            'std_dev': 0,
            'red_flag': red_flag,  # NOTE: For ad period, below threshold is suspicious
            'count': n
        }

        print(f"  Sector {sector_id}: median={p50:.0f} days, red_flag={red_flag:.0f} days ({n:,} contracts)")

    return results


def save_baselines(conn: sqlite3.Connection, all_baselines: list):
    """Save all baseline metrics to database."""
    cursor = conn.cursor()

    print("\nSaving baselines to database...")

    # Clear existing baselines
    cursor.execute("DELETE FROM sector_baselines")

    # Insert new baselines
    insert_sql = """
        INSERT INTO sector_baselines
        (sector_id, metric_name, percentile_25, percentile_50, percentile_75,
         percentile_90, percentile_95, mean_value, std_dev, red_flag_threshold, sample_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    count = 0
    for baselines in all_baselines:
        for sector_id, data in baselines.items():
            cursor.execute(insert_sql, (
                sector_id,
                data['metric'],
                data['p25'],
                data['p50'],
                data['p75'],
                data['p90'],
                data['p95'],
                data['mean'],
                data['std_dev'],
                data['red_flag'],
                data['count']
            ))
            count += 1

    conn.commit()
    print(f"  Saved {count} baseline records")


def print_summary(conn: sqlite3.Connection):
    """Print summary of sector baselines."""
    cursor = conn.cursor()

    print("\n" + "=" * 70)
    print("SECTOR BASELINES SUMMARY")
    print("=" * 70)

    # Get sector names
    cursor.execute("SELECT id, code, name_es FROM sectors")
    sectors = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    # Get baselines
    cursor.execute("""
        SELECT sector_id, metric_name, percentile_50, red_flag_threshold, sample_count
        FROM sector_baselines
        ORDER BY sector_id, metric_name
    """)

    current_sector = None
    for row in cursor.fetchall():
        sector_id, metric, median, red_flag, count = row

        if sector_id != current_sector:
            current_sector = sector_id
            code, name = sectors.get(sector_id, ('?', 'Unknown'))
            print(f"\n{name} ({code}):")

        # Format based on metric type
        if metric == 'contract_amount':
            print(f"  {metric}: median={median/1e6:.1f}M MXN, flag={red_flag/1e9:.2f}B MXN ({count:,} samples)")
        elif metric in ('vendor_concentration', 'direct_award_rate', 'single_bid_rate'):
            print(f"  {metric}: median={median*100:.1f}%, flag={red_flag*100:.1f}% ({count:,} samples)")
        elif metric == 'ad_period_days':
            print(f"  {metric}: median={median:.0f} days, flag={red_flag:.0f} days ({count:,} samples)")
        else:
            print(f"  {metric}: median={median:.2f}, flag={red_flag:.2f} ({count:,} samples)")


def main():
    """Main entry point."""
    print("=" * 70)
    print("SECTOR BASELINES CALCULATOR")
    print("=" * 70)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"\nDatabase: {DB_PATH}")

        # Ensure table exists
        ensure_sector_baselines_table(conn)

        # Calculate all baselines
        start_time = datetime.now()

        amount_baselines = calculate_contract_amount_baselines(conn)
        concentration_baselines = calculate_vendor_concentration_baselines(conn)
        direct_award_baselines = calculate_direct_award_baselines(conn)
        single_bid_baselines = calculate_single_bid_baselines(conn)
        ad_period_baselines = calculate_ad_period_baselines(conn)

        # Save all baselines
        save_baselines(conn, [
            amount_baselines,
            concentration_baselines,
            direct_award_baselines,
            single_bid_baselines,
            ad_period_baselines
        ])

        # Print summary
        print_summary(conn)

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\nTotal time: {elapsed:.1f} seconds")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        if conn:
            conn.close()

    print("\n" + "=" * 70)
    print("Sector baselines calculation complete!")
    print("=" * 70)

    return 0


if __name__ == '__main__':
    sys.exit(main())
