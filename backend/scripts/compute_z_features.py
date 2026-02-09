"""
Compute Z-Score Features for Risk Model v4.0

For each contract, computes a 12-dimensional z-score vector using
pre-computed baselines from factor_baselines table.

Continuous:  z_i = (x_i - μ(s,t)) / max(σ(s,t), ε)     where ε = 0.001
Binary:      z_i = (x_i - p(s,t)) / √(p(s,t)(1-p(s,t)))  (Bernoulli z-score)

Creates table: contract_z_features
  3.1M rows × 12 z-columns + mahalanobis_distance (filled later)

Usage:
    python -m scripts.compute_z_features [--batch-size 50000]
"""

import sys
import sqlite3
import argparse
import math
from pathlib import Path
from datetime import datetime
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

EPSILON = 0.001  # Minimum stddev to avoid division by zero

# Factor names matching factor_baselines table
FACTOR_COLS = [
    'z_single_bid',
    'z_direct_award',
    'z_price_ratio',
    'z_vendor_concentration',
    'z_ad_period_days',
    'z_year_end',
    'z_same_day_count',
    'z_network_member_count',
    'z_co_bid_rate',
    'z_price_hyp_confidence',
    'z_industry_mismatch',
    'z_institution_risk',
]

FACTOR_NAMES = [c.replace('z_', '') for c in FACTOR_COLS]


def create_z_features_table(conn: sqlite3.Connection):
    """Create contract_z_features table."""
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS contract_z_features")

    z_cols = ', '.join(f"{col} REAL" for col in FACTOR_COLS)
    cursor.execute(f"""
        CREATE TABLE contract_z_features (
            contract_id INTEGER PRIMARY KEY,
            sector_id INTEGER,
            year INTEGER,
            {z_cols},
            mahalanobis_distance REAL,
            mahalanobis_pvalue REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX idx_z_features_sector_year
        ON contract_z_features(sector_id, year)
    """)
    conn.commit()
    print("Created contract_z_features table")


def load_baselines(conn: sqlite3.Connection) -> dict:
    """Load factor baselines into a fast lookup structure.

    Returns: dict[factor_name][(sector_id, year)] -> (mean, stddev)
    with fallback hierarchy.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT factor_name, sector_id, year, scope, mean, stddev
        FROM factor_baselines
        ORDER BY
            CASE scope
                WHEN 'sector_year' THEN 1
                WHEN 'sector' THEN 2
                WHEN 'global' THEN 3
            END
    """)

    # Build hierarchical lookup
    baselines = defaultdict(dict)  # factor -> {(sector, year): (mean, stddev)}
    sector_baselines = defaultdict(dict)  # factor -> {sector: (mean, stddev)}
    global_baselines = {}  # factor -> (mean, stddev)

    for row in cursor.fetchall():
        factor, sector_id, year, scope, mean, stddev = row
        stddev = max(stddev, EPSILON)

        if scope == 'sector_year' and sector_id and year:
            baselines[factor][(sector_id, year)] = (mean, stddev)
        elif scope == 'sector' and sector_id:
            sector_baselines[factor][sector_id] = (mean, stddev)
        elif scope == 'global':
            global_baselines[factor] = (mean, stddev)

    # Build unified lookup with fallback
    class BaselineLookup:
        def __init__(self, sy, s, g):
            self.sy = sy
            self.s = s
            self.g = g

        def get(self, factor, sector_id, year):
            """Get (mean, stddev) with fallback hierarchy."""
            # Try sector-year
            key = (sector_id, year)
            if factor in self.sy and key in self.sy[factor]:
                return self.sy[factor][key]
            # Try sector
            if factor in self.s and sector_id in self.s[factor]:
                return self.s[factor][sector_id]
            # Global fallback
            if factor in self.g:
                return self.g[factor]
            # Ultimate fallback
            return (0.0, EPSILON)

    total_rows = sum(len(v) for v in baselines.values())
    total_sector = sum(len(v) for v in sector_baselines.values())
    print(f"Loaded baselines: {total_rows} sector-year, {total_sector} sector, {len(global_baselines)} global")

    return BaselineLookup(baselines, sector_baselines, global_baselines)


def load_auxiliary_data(conn: sqlite3.Connection):
    """Load vendor concentration, network, co-bidding, institution, industry data."""
    cursor = conn.cursor()

    # Vendor concentration by sector
    print("  Loading vendor concentration...")
    cursor.execute("""
        SELECT vendor_id, sector_id, SUM(amount_mxn) as val
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL AND amount_mxn > 0
        GROUP BY vendor_id, sector_id
    """)
    vendor_sector_val = {}
    sector_totals = defaultdict(float)
    for r in cursor.fetchall():
        vendor_sector_val[(r[0], r[1])] = r[2]
        sector_totals[r[1]] += r[2]

    # Network groups
    print("  Loading network groups...")
    cursor.execute("SELECT vendor_id, group_id FROM vendor_aliases")
    vendor_group = {r[0]: r[1] for r in cursor.fetchall()}
    cursor.execute("SELECT group_id, COUNT(*) FROM vendor_aliases GROUP BY group_id")
    group_sizes = {r[0]: r[1] for r in cursor.fetchall()}

    # Co-bidding
    print("  Loading co-bidding rates...")
    co_bid_rates = {}
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_co_bidding'")
    if cursor.fetchone():
        cursor.execute("SELECT vendor_id, MAX(co_bid_rate) FROM vendor_co_bidding GROUP BY vendor_id")
        co_bid_rates = {r[0]: r[1] for r in cursor.fetchall()}

    # Institution risk
    print("  Loading institution risk...")
    sys.path.insert(0, str(Path(__file__).parent))
    from calculate_risk_scores import INSTITUTION_RISK_BASELINES
    cursor.execute("SELECT id, institution_type FROM institutions WHERE institution_type IS NOT NULL")
    inst_baselines = {r[0]: INSTITUTION_RISK_BASELINES.get(r[1], 0.25) for r in cursor.fetchall()}

    # Vendor industries
    print("  Loading vendor industries...")
    cursor.execute("""
        SELECT vc.vendor_id, vi.sector_affinity
        FROM vendor_classifications vc
        JOIN vendor_industries vi ON vc.industry_id = vi.id
        WHERE vc.industry_source = 'verified_online'
    """)
    vendor_affinity = {r[0]: r[1] for r in cursor.fetchall()}

    # Threshold splitting
    print("  Loading splitting patterns...")
    cursor.execute("""
        SELECT vendor_id, institution_id, contract_date, COUNT(*)
        FROM contracts
        WHERE vendor_id IS NOT NULL AND institution_id IS NOT NULL
          AND contract_date IS NOT NULL
        GROUP BY vendor_id, institution_id, contract_date
        HAVING COUNT(*) >= 2
    """)
    splitting = {(r[0], r[1], r[2]): r[3] for r in cursor.fetchall()}

    # Sector medians
    print("  Loading sector medians...")
    cursor.execute("""
        SELECT sector_id, AVG(amount_mxn)
        FROM contracts
        WHERE amount_mxn > 0 AND amount_mxn < 100000000000 AND sector_id IS NOT NULL
        GROUP BY sector_id
    """)
    sector_medians = {r[0]: r[1] for r in cursor.fetchall()}

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sector_price_baselines'")
    if cursor.fetchone():
        cursor.execute("""
            SELECT sector_id, percentile_50
            FROM sector_price_baselines
            WHERE contract_type = 'all' AND year IS NULL AND percentile_50 > 0
        """)
        for r in cursor.fetchall():
            sector_medians[r[0]] = r[1]

    return {
        'vendor_sector_val': vendor_sector_val,
        'sector_totals': sector_totals,
        'vendor_group': vendor_group,
        'group_sizes': group_sizes,
        'co_bid_rates': co_bid_rates,
        'inst_baselines': inst_baselines,
        'vendor_affinity': vendor_affinity,
        'splitting': splitting,
        'sector_medians': sector_medians,
    }


def compute_raw_features(row, aux):
    """Extract raw feature values from a contract row.

    Returns dict of factor_name -> raw value.
    """
    (cid, vendor_id, inst_id, sector_id, amount,
     is_da, is_sb, is_ye, pub_date, con_date,
     year, phc) = row

    features = {}
    amount = amount or 0

    # Binary
    features['single_bid'] = 1 if is_sb else 0
    features['direct_award'] = 1 if is_da else 0
    features['year_end'] = 1 if is_ye else 0

    # Price ratio
    if amount > 0 and amount < 100_000_000_000 and sector_id in aux['sector_medians']:
        median = aux['sector_medians'][sector_id]
        features['price_ratio'] = amount / median if median > 0 else 0.0
    else:
        features['price_ratio'] = 0.0

    # Vendor concentration
    if vendor_id and sector_id:
        vs_val = aux['vendor_sector_val'].get((vendor_id, sector_id), 0)
        st_val = aux['sector_totals'].get(sector_id, 1)
        features['vendor_concentration'] = vs_val / st_val if st_val > 0 else 0.0
    else:
        features['vendor_concentration'] = 0.0

    # Ad period days
    features['ad_period_days'] = 0.0
    if pub_date and con_date and pub_date != '' and con_date != '':
        try:
            from datetime import datetime as dt
            p = dt.strptime(pub_date, '%Y-%m-%d')
            c = dt.strptime(con_date, '%Y-%m-%d')
            days = (c - p).days
            if 0 <= days <= 365:
                features['ad_period_days'] = float(days)
        except (ValueError, TypeError):
            pass

    # Same-day count
    if vendor_id and inst_id and con_date:
        features['same_day_count'] = float(aux['splitting'].get(
            (vendor_id, inst_id, con_date), 1))
    else:
        features['same_day_count'] = 1.0

    # Network member count
    if vendor_id and vendor_id in aux['vendor_group']:
        gid = aux['vendor_group'][vendor_id]
        features['network_member_count'] = float(aux['group_sizes'].get(gid, 1))
    else:
        features['network_member_count'] = 1.0

    # Co-bid rate
    features['co_bid_rate'] = aux['co_bid_rates'].get(vendor_id, 0.0) if vendor_id else 0.0

    # Price hypothesis confidence
    features['price_hyp_confidence'] = float(phc) if phc is not None else 0.0

    # Industry mismatch
    if vendor_id and vendor_id in aux['vendor_affinity']:
        expected = aux['vendor_affinity'][vendor_id]
        features['industry_mismatch'] = 1 if expected != sector_id else 0
    else:
        features['industry_mismatch'] = 0

    # Institution risk
    features['institution_risk'] = aux['inst_baselines'].get(inst_id, 0.25) if inst_id else 0.25

    return features


def compute_z_score(raw_value, mean, stddev, is_binary=False):
    """Compute z-score for a single value."""
    if is_binary:
        # Bernoulli z-score: (x - p) / sqrt(p * (1-p))
        p = mean
        denom = math.sqrt(p * (1 - p)) if 0 < p < 1 else EPSILON
        return (raw_value - p) / denom
    else:
        # Standard z-score
        return (raw_value - mean) / max(stddev, EPSILON)


def main():
    parser = argparse.ArgumentParser(
        description='Compute z-score features for all contracts'
    )
    parser.add_argument('--batch-size', type=int, default=50000,
                        help='Batch size for processing (default: 50000)')
    args = parser.parse_args()

    print("=" * 60)
    print("RISK MODEL v4.0: Compute Z-Score Features")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Batch size: {args.batch_size:,}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()

        # Check prerequisites
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM factor_baselines")
        baseline_count = cursor.fetchone()[0]
        if baseline_count == 0:
            print("ERROR: factor_baselines table is empty. Run compute_factor_baselines.py first.")
            return 1
        print(f"Found {baseline_count:,} baselines")

        # Create table
        create_z_features_table(conn)

        # Load baselines and auxiliary data
        baselines = load_baselines(conn)
        print("\nLoading auxiliary data...")
        aux = load_auxiliary_data(conn)

        # Binary factors for z-score computation
        binary_factors = {'single_bid', 'direct_award', 'year_end', 'industry_mismatch'}

        # Process contracts in batches
        cursor.execute("SELECT COUNT(*) FROM contracts")
        total = cursor.fetchone()[0]
        print(f"\nProcessing {total:,} contracts...")

        processed = 0
        offset = 0

        while offset < total:
            cursor.execute("""
                SELECT id, vendor_id, institution_id, sector_id,
                       amount_mxn, is_direct_award, is_single_bid,
                       is_year_end, publication_date, contract_date,
                       contract_year, price_hypothesis_confidence
                FROM contracts
                ORDER BY id
                LIMIT ? OFFSET ?
            """, (args.batch_size, offset))

            rows = cursor.fetchall()
            if not rows:
                break

            batch_results = []
            for row in rows:
                cid = row[0]
                sector_id = row[3]
                year = row[10]

                # Compute raw features
                raw = compute_raw_features(row, aux)

                # Compute z-scores
                z_values = []
                for factor in FACTOR_NAMES:
                    mean, stddev = baselines.get(factor, sector_id, year)
                    is_binary = factor in binary_factors
                    z = compute_z_score(raw[factor], mean, stddev, is_binary)
                    z_values.append(z)

                # Build insert tuple: contract_id, sector_id, year, z_values..., None, None
                batch_results.append(
                    (cid, sector_id, year) + tuple(z_values) + (None, None)
                )

            # Insert batch
            placeholders = ', '.join(['?'] * (3 + len(FACTOR_COLS) + 2))
            cursor.execute("BEGIN IMMEDIATE TRANSACTION")
            cursor.executemany(f"""
                INSERT INTO contract_z_features
                    (contract_id, sector_id, year, {', '.join(FACTOR_COLS)},
                     mahalanobis_distance, mahalanobis_pvalue)
                VALUES ({placeholders})
            """, batch_results)
            cursor.execute("COMMIT")

            processed += len(rows)
            offset += args.batch_size

            elapsed = (datetime.now() - start).total_seconds()
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"  {processed:,}/{total:,} ({100*processed/total:.1f}%) - {rate:.0f}/sec")

        # Summary
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        z_count = cursor.fetchone()[0]

        # Sample z-score statistics
        print(f"\n{'='*60}")
        print("Z-FEATURE SUMMARY")
        print(f"{'='*60}")
        print(f"Total z-feature rows: {z_count:,}")

        for col in FACTOR_COLS[:6]:  # Show first 6 for brevity
            cursor.execute(f"""
                SELECT AVG({col}), MIN({col}), MAX({col}),
                       AVG({col} * {col})
                FROM contract_z_features
            """)
            avg, min_v, max_v, avg_sq = cursor.fetchone()
            # Variance = E[X²] - E[X]²
            var = avg_sq - avg * avg if avg_sq and avg else 0
            std = math.sqrt(var) if var > 0 else 0
            print(f"  {col}: mean={avg:.3f}, std={std:.3f}, min={min_v:.2f}, max={max_v:.2f}")

        elapsed = (datetime.now() - start).total_seconds()
        print(f"\nTotal time: {elapsed:.1f}s")
        print(f"Rate: {total/elapsed:.0f} contracts/sec")

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
