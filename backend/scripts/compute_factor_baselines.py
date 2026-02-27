"""
Compute Factor Baselines for Z-Score Normalization (Risk Model v5.0 Pipeline, 16 features)

For each (factor, sector_id, year) combination, computes:
  μ(s,t) = mean of factor values
  σ(s,t) = standard deviation
  n(s,t) = sample count

Fallback hierarchy:
  1. (factor, sector, year) if n >= 30
  2. (factor, sector) if n >= 100
  3. (factor, global)

Creates table: factor_baselines
  ~16 factors × 12 sectors × 24 years ≈ 4,608 rows + sector/global fallbacks

Usage:
    python -m scripts.compute_factor_baselines [--min-sector-year 30] [--min-sector 100]
"""

import sys
import sqlite3
import argparse
import math
from pathlib import Path
from datetime import datetime
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# The 12 factors we compute baselines for
FACTORS = [
    'single_bid',           # binary: is_single_bid
    'direct_award',         # binary: is_direct_award
    'price_ratio',          # continuous: amount_mxn / sector_median
    'vendor_concentration', # continuous: vendor sector share (0-1)
    'ad_period_days',       # continuous: days between publication and contract
    'year_end',             # binary: is_year_end
    'same_day_count',       # discrete: threshold splitting count
    'network_member_count', # discrete: vendor group size
    'co_bid_rate',          # continuous: max co-bid rate (0-1)
    'price_hyp_confidence', # continuous: price hypothesis confidence (0-1)
    'industry_mismatch',    # binary: sector affinity != contract sector
    'institution_risk',     # continuous: institution type baseline (0-0.35)
    'price_volatility',     # continuous: vendor price stddev / sector median (catches overpricing)
    'sector_spread',        # continuous: distinct sectors per vendor (catches shell companies)
    'win_rate',             # continuous: vendor competitive contract share in sector (catches bid-rigging)
    'institution_diversity', # continuous: HHI of vendor's institution distribution (catches favoritism)
]


def create_baselines_table(conn: sqlite3.Connection):
    """Create factor_baselines table."""
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS factor_baselines")
    cursor.execute("""
        CREATE TABLE factor_baselines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            factor_name VARCHAR(50) NOT NULL,
            sector_id INTEGER,
            year INTEGER,
            scope VARCHAR(20) NOT NULL,  -- 'sector_year', 'sector', 'global'
            mean REAL NOT NULL,
            stddev REAL NOT NULL,
            count INTEGER NOT NULL,
            min_val REAL,
            max_val REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX idx_baselines_lookup
        ON factor_baselines(factor_name, sector_id, year)
    """)
    conn.commit()
    print("Created factor_baselines table")


def compute_binary_stats(values):
    """Compute mean (=proportion) and stddev for binary (Bernoulli) data."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0, n
    p = sum(values) / n
    # Bernoulli stddev = sqrt(p * (1-p))
    sigma = math.sqrt(p * (1 - p)) if 0 < p < 1 else 0.001
    return p, sigma, n


def compute_continuous_stats(values):
    """Compute mean and stddev for continuous data."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0, n
    mean = sum(values) / n
    if n < 2:
        return mean, 0.001, n
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    sigma = math.sqrt(variance) if variance > 0 else 0.001
    return mean, sigma, n


def load_factor_data(conn: sqlite3.Connection) -> dict:
    """Load raw factor values grouped by (sector_id, year).

    Returns: dict[factor_name] -> dict[(sector_id, year)] -> list[float]
    """
    cursor = conn.cursor()
    data = defaultdict(lambda: defaultdict(list))

    print("\nLoading factor data from contracts...")

    # Load sector price medians for price_ratio computation
    cursor.execute("""
        SELECT sector_id, AVG(amount_mxn) as median_approx
        FROM contracts
        WHERE amount_mxn > 0 AND amount_mxn < 100000000000
          AND sector_id IS NOT NULL
        GROUP BY sector_id
    """)
    sector_medians = {r[0]: r[1] for r in cursor.fetchall()}

    # Try IQR baselines if available
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sector_price_baselines'")
    if cursor.fetchone():
        cursor.execute("""
            SELECT sector_id, percentile_50
            FROM sector_price_baselines
            WHERE contract_type = 'all' AND year IS NULL AND percentile_50 > 0
        """)
        for r in cursor.fetchall():
            sector_medians[r[0]] = r[1]

    # Load vendor concentration
    print("  Loading vendor concentration...")
    cursor.execute("""
        SELECT vendor_id, sector_id,
               SUM(amount_mxn) as vendor_value
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
          AND amount_mxn > 0
        GROUP BY vendor_id, sector_id
    """)
    vendor_sector_value = {}
    sector_total_value = defaultdict(float)
    for r in cursor.fetchall():
        vendor_sector_value[(r[0], r[1])] = r[2]
        sector_total_value[r[1]] += r[2]

    # Load vendor network groups
    print("  Loading vendor network groups...")
    cursor.execute("SELECT vendor_id, group_id FROM vendor_aliases")
    vendor_group = {}
    for r in cursor.fetchall():
        vendor_group[r[0]] = r[1]

    cursor.execute("""
        SELECT group_id, COUNT(*) as cnt FROM vendor_aliases GROUP BY group_id
    """)
    group_sizes = {r[0]: r[1] for r in cursor.fetchall()}

    # Load co-bidding rates (pre-computed in vendor_stats or compute inline)
    print("  Loading co-bidding data...")
    co_bid_rates = {}
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_co_bidding'")
    if cursor.fetchone():
        cursor.execute("""
            SELECT vendor_id, MAX(co_bid_rate) as max_rate
            FROM vendor_co_bidding
            WHERE co_bid_rate >= 0.0
            GROUP BY vendor_id
        """)
        co_bid_rates = {r[0]: r[1] for r in cursor.fetchall()}

    # Load institution types
    print("  Loading institution types...")
    sys.path.insert(0, str(Path(__file__).parent))
    from calculate_risk_scores import INSTITUTION_RISK_BASELINES
    cursor.execute("SELECT id, institution_type FROM institutions WHERE institution_type IS NOT NULL")
    inst_baselines = {}
    for r in cursor.fetchall():
        inst_baselines[r[0]] = INSTITUTION_RISK_BASELINES.get(r[1], 0.25)

    # Load vendor industries for mismatch detection
    print("  Loading vendor industries...")
    cursor.execute("""
        SELECT vc.vendor_id, vi.sector_affinity
        FROM vendor_classifications vc
        JOIN vendor_industries vi ON vc.industry_id = vi.id
        WHERE vc.industry_source = 'verified_online'
    """)
    vendor_affinity = {r[0]: r[1] for r in cursor.fetchall()}

    # Load threshold splitting patterns
    print("  Loading threshold splitting patterns...")
    cursor.execute("""
        SELECT vendor_id, institution_id, contract_date, COUNT(*) as cnt
        FROM contracts
        WHERE vendor_id IS NOT NULL AND institution_id IS NOT NULL
          AND contract_date IS NOT NULL
        GROUP BY vendor_id, institution_id, contract_date
        HAVING COUNT(*) >= 2
    """)
    splitting = {}
    for r in cursor.fetchall():
        splitting[(r[0], r[1], r[2])] = r[3]

    # Load price volatility: per (vendor, sector) stddev of amounts
    print("  Loading vendor price volatility...")
    cursor.execute("""
        SELECT vendor_id, sector_id,
               AVG(amount_mxn) as avg_amt,
               AVG(amount_mxn * amount_mxn) as avg_amt_sq,
               COUNT(*) as cnt
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
          AND amount_mxn > 0 AND amount_mxn < 100000000000
        GROUP BY vendor_id, sector_id
        HAVING COUNT(*) >= 3
    """)
    vendor_price_vol = {}
    for r in cursor.fetchall():
        vid, sid, avg_amt, avg_amt_sq, cnt = r
        variance = max(avg_amt_sq - avg_amt * avg_amt, 0)
        stddev = math.sqrt(variance) if variance > 0 else 0
        median = sector_medians.get(sid, 1)
        vendor_price_vol[(vid, sid)] = stddev / median if median > 0 else 0

    # Load sector spread: distinct sectors per vendor
    print("  Loading vendor sector spread...")
    cursor.execute("""
        SELECT vendor_id, COUNT(DISTINCT sector_id) as sector_count
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
        GROUP BY vendor_id
    """)
    vendor_sector_count = {r[0]: r[1] for r in cursor.fetchall()}

    # Load competitive win rate: vendor share of competitive contracts per sector
    print("  Loading vendor competitive win rates...")
    cursor.execute("""
        SELECT vendor_id, sector_id, COUNT(*) as comp_wins
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
          AND is_direct_award = 0
        GROUP BY vendor_id, sector_id
    """)
    vendor_comp_wins = {}
    for r in cursor.fetchall():
        vendor_comp_wins[(r[0], r[1])] = r[2]

    cursor.execute("""
        SELECT sector_id, COUNT(*) as total_comp
        FROM contracts
        WHERE sector_id IS NOT NULL AND is_direct_award = 0
        GROUP BY sector_id
    """)
    sector_comp_totals = {r[0]: r[1] for r in cursor.fetchall()}

    # Load institution diversity: HHI per vendor
    print("  Loading vendor institution diversity (HHI)...")
    cursor.execute("""
        SELECT vendor_id, institution_id, COUNT(*) as cnt
        FROM contracts
        WHERE vendor_id IS NOT NULL AND institution_id IS NOT NULL
        GROUP BY vendor_id, institution_id
    """)
    vendor_inst_counts = defaultdict(dict)
    vendor_total_contracts = defaultdict(int)
    for r in cursor.fetchall():
        vendor_inst_counts[r[0]][r[1]] = r[2]
        vendor_total_contracts[r[0]] += r[2]

    vendor_inst_hhi = {}
    for vid, inst_map in vendor_inst_counts.items():
        total = vendor_total_contracts[vid]
        if total > 0:
            hhi = sum((cnt / total) ** 2 for cnt in inst_map.values())
            vendor_inst_hhi[vid] = hhi
        else:
            vendor_inst_hhi[vid] = 1.0

    # Now iterate all contracts
    print("  Processing contracts...")
    batch_size = 100000
    offset = 0

    cursor.execute("SELECT COUNT(*) FROM contracts")
    total = cursor.fetchone()[0]

    while offset < total:
        cursor.execute("""
            SELECT id, vendor_id, institution_id, sector_id,
                   amount_mxn, is_direct_award, is_single_bid,
                   is_year_end, publication_date, contract_date,
                   contract_year, price_hypothesis_confidence
            FROM contracts
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (batch_size, offset))

        rows = cursor.fetchall()
        if not rows:
            break

        for r in rows:
            (cid, vendor_id, inst_id, sector_id, amount,
             is_da, is_sb, is_ye, pub_date, con_date,
             year, phc) = r

            if not sector_id or not year:
                continue

            key = (sector_id, year)

            # Binary factors
            data['single_bid'][key].append(1 if is_sb else 0)
            data['direct_award'][key].append(1 if is_da else 0)
            data['year_end'][key].append(1 if is_ye else 0)

            # Price ratio
            amount = amount or 0
            if amount > 0 and amount < 100_000_000_000 and sector_id in sector_medians:
                median = sector_medians[sector_id]
                if median > 0:
                    data['price_ratio'][key].append(amount / median)

            # Vendor concentration
            if vendor_id and sector_id:
                vs_val = vendor_sector_value.get((vendor_id, sector_id), 0)
                st_val = sector_total_value.get(sector_id, 1)
                conc = vs_val / st_val if st_val > 0 else 0
                data['vendor_concentration'][key].append(conc)

            # Ad period days
            if pub_date and con_date and pub_date != '' and con_date != '':
                try:
                    from datetime import datetime as dt
                    p = dt.strptime(pub_date, '%Y-%m-%d')
                    c = dt.strptime(con_date, '%Y-%m-%d')
                    days = (c - p).days
                    if 0 <= days <= 365:
                        data['ad_period_days'][key].append(days)
                except (ValueError, TypeError):
                    pass

            # Same-day count (threshold splitting)
            if vendor_id and inst_id and con_date:
                sdc = splitting.get((vendor_id, inst_id, con_date), 1)
                data['same_day_count'][key].append(sdc)

            # Network member count
            if vendor_id and vendor_id in vendor_group:
                gid = vendor_group[vendor_id]
                data['network_member_count'][key].append(group_sizes.get(gid, 1))
            else:
                data['network_member_count'][key].append(1)

            # Co-bid rate
            if vendor_id:
                data['co_bid_rate'][key].append(co_bid_rates.get(vendor_id, 0.0))

            # Price hypothesis confidence
            data['price_hyp_confidence'][key].append(phc if phc is not None else 0.0)

            # Industry mismatch (binary)
            if vendor_id and vendor_id in vendor_affinity:
                expected = vendor_affinity[vendor_id]
                data['industry_mismatch'][key].append(1 if expected != sector_id else 0)
            else:
                data['industry_mismatch'][key].append(0)

            # Institution risk
            data['institution_risk'][key].append(inst_baselines.get(inst_id, 0.25) if inst_id else 0.25)

            # Price volatility (vendor price stddev / sector median)
            if vendor_id and sector_id:
                data['price_volatility'][key].append(
                    vendor_price_vol.get((vendor_id, sector_id), 0.0))
            else:
                data['price_volatility'][key].append(0.0)

            # Sector spread (distinct sectors per vendor)
            if vendor_id:
                data['sector_spread'][key].append(
                    float(vendor_sector_count.get(vendor_id, 1)))
            else:
                data['sector_spread'][key].append(1.0)

            # Win rate (vendor competitive contract share in sector)
            if vendor_id and sector_id:
                comp_wins = vendor_comp_wins.get((vendor_id, sector_id), 0)
                comp_total = sector_comp_totals.get(sector_id, 1)
                data['win_rate'][key].append(comp_wins / comp_total if comp_total > 0 else 0.0)
            else:
                data['win_rate'][key].append(0.0)

            # Institution diversity (HHI of vendor's institution distribution)
            if vendor_id:
                data['institution_diversity'][key].append(
                    vendor_inst_hhi.get(vendor_id, 1.0))
            else:
                data['institution_diversity'][key].append(1.0)

        offset += batch_size
        print(f"    {min(offset, total):,}/{total:,} contracts processed")

    return data


def compute_baselines(data: dict, min_sector_year: int = 30, min_sector: int = 100):
    """Compute baselines at three scopes with fallback hierarchy.

    Returns list of (factor, sector_id, year, scope, mean, stddev, count, min_val, max_val)
    """
    binary_factors = {'single_bid', 'direct_award', 'year_end', 'industry_mismatch'}
    rows = []

    for factor in FACTORS:
        factor_data = data.get(factor, {})
        if not factor_data:
            print(f"  WARNING: No data for factor '{factor}'")
            continue

        compute_fn = compute_binary_stats if factor in binary_factors else compute_continuous_stats

        # Aggregate by sector and global
        sector_agg = defaultdict(list)
        global_agg = []

        for (sector_id, year), values in factor_data.items():
            sector_agg[sector_id].extend(values)
            global_agg.extend(values)

            # Sector-year level
            if len(values) >= min_sector_year:
                mean, sigma, n = compute_fn(values)
                rows.append((factor, sector_id, year, 'sector_year',
                             mean, sigma, n,
                             min(values) if values else None,
                             max(values) if values else None))

        # Sector level
        for sector_id, values in sector_agg.items():
            if len(values) >= min_sector:
                mean, sigma, n = compute_fn(values)
                rows.append((factor, sector_id, None, 'sector',
                             mean, sigma, n,
                             min(values) if values else None,
                             max(values) if values else None))

        # Global level
        if global_agg:
            mean, sigma, n = compute_fn(global_agg)
            rows.append((factor, None, None, 'global',
                         mean, sigma, n,
                         min(global_agg) if global_agg else None,
                         max(global_agg) if global_agg else None))

        sy_count = sum(1 for r in rows if r[0] == factor and r[3] == 'sector_year')
        s_count = sum(1 for r in rows if r[0] == factor and r[3] == 'sector')
        print(f"  {factor}: {sy_count} sector-year, {s_count} sector, 1 global baselines")

    return rows


def main():
    parser = argparse.ArgumentParser(
        description='Compute factor baselines for z-score normalization'
    )
    parser.add_argument('--min-sector-year', type=int, default=30,
                        help='Minimum contracts for sector-year baseline (default: 30)')
    parser.add_argument('--min-sector', type=int, default=100,
                        help='Minimum contracts for sector baseline (default: 100)')
    args = parser.parse_args()

    print("=" * 60)
    print("RISK MODEL v5.0: Compute Factor Baselines")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Min sector-year: {args.min_sector_year}")
    print(f"Min sector: {args.min_sector}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()

        # Create table
        create_baselines_table(conn)

        # Load data
        data = load_factor_data(conn)

        # Compute baselines
        print("\nComputing baselines...")
        rows = compute_baselines(data, args.min_sector_year, args.min_sector)

        # Insert
        print(f"\nInserting {len(rows):,} baseline rows...")
        cursor = conn.cursor()
        cursor.executemany("""
            INSERT INTO factor_baselines
                (factor_name, sector_id, year, scope, mean, stddev, count, min_val, max_val)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rows)
        conn.commit()

        # Summary
        cursor.execute("SELECT COUNT(*) FROM factor_baselines")
        total = cursor.fetchone()[0]

        cursor.execute("""
            SELECT scope, COUNT(*) FROM factor_baselines GROUP BY scope
        """)
        scope_counts = {r[0]: r[1] for r in cursor.fetchall()}

        elapsed = (datetime.now() - start).total_seconds()

        print(f"\n{'='*60}")
        print(f"BASELINES COMPLETE")
        print(f"{'='*60}")
        print(f"Total rows: {total:,}")
        for scope in ['sector_year', 'sector', 'global']:
            print(f"  {scope}: {scope_counts.get(scope, 0):,}")
        print(f"Time: {elapsed:.1f}s")

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
