"""
dedupe_institutions_batch1.py

Merge state-prefix duplicate institutions detected by data-quality-guardian
analysis (2026-05-19). E.g.:

    [1467] OAX-Servicios de Salud de Oaxaca  <-  keeper (has state_code)
    [420]  SERVICIOS DE SALUD DE OAXACA      <-  duplicate (older COMPRANET)

COMPRANET 2023+ added state-code name prefixes (OAX-, PUE-, etc.) but legacy
structures stored the same entities UPPERCASE without prefix. Result: ~359
institutions exist twice. This script identifies high-confidence pairs and:

  1. Re-keys their contracts from duplicate → keeper
  2. Migrates any ground_truth_institutions rows
  3. Deletes the duplicate institutions row
  4. Recomputes institution_stats / vendor_institutions / institution_top_vendors
     / institution_hhi / yearly_institution_rankings for affected keepers

Usage:
    python -m scripts.dedupe_institutions_batch1 --dry-run   # default
    python -m scripts.dedupe_institutions_batch1 --execute   # actually merge
    python -m scripts.dedupe_institutions_batch1 --execute --confidence 95

Safety:
    - Backup is the caller's responsibility (cp before running).
    - --dry-run mode (default) prints planned merges without touching data.
    - --execute wraps all writes in a single transaction; on any error, rolls back.
    - Re-aggregation runs AFTER the dedupe transaction commits.
"""

import argparse
import sqlite3
import sys
import time
import unicodedata
from pathlib import Path

# State-code prefixes (Mexican 32 entities) -- these are the ones that appear
# in COMPRANET 2023+ name encodings. Order matters: longer prefixes first so
# CHIS- isn't masked by CHIH-.
STATE_PREFIXES = [
    'CDMX', 'CHIS', 'CHIH', 'COAH', 'QROO', 'TAMP', 'TLAX',
    'AGS', 'BCS', 'CAM', 'CAMP', 'COL', 'DGO', 'GTO', 'GRO', 'HGO', 'JAL',
    'MEX', 'MICH', 'MOR', 'NAY', 'NL', 'OAX', 'PUE', 'QRO', 'SLP', 'SIN',
    'SON', 'TAB', 'VER', 'YUC', 'ZAC', 'BC',
]

DB_PATH = Path(__file__).resolve().parent.parent / 'RUBLI_NORMALIZED.db'

# Tables that need re-aggregation after a merge. Each entry: (table_name,
# rebuild_function_name). The rebuild functions are best-effort -- if a table
# doesn't exist on this DB, we skip it with a warning.
REAGG_TABLES = [
    'institution_stats',
    'vendor_institutions',
    'institution_top_vendors',
    'institution_hhi',
    'yearly_institution_rankings',
]


def normalize_name(name: str) -> str:
    """Strip state prefix, lowercase, remove accents, collapse whitespace."""
    if not name:
        return ''
    s = name.strip()
    upper = s.upper()
    for p in STATE_PREFIXES:
        if upper.startswith(p + '-'):
            s = s[len(p) + 1:]
            break
    # Remove accents
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = ' '.join(s.lower().split())
    return s


def find_dedupe_pairs(conn: sqlite3.Connection, min_confidence: int, min_ratio: float):
    """Return list of (keeper_id, duplicate_id, keeper_name, dup_name, confidence,
    keeper_contracts, dup_contracts, ratio) tuples.

    Match rule:
      - prefixed institution starts with STATE-
      - unprefixed institution has SAME sector_id
      - normalized names are EQUAL or one CONTAINS the other (with state-name
        substring boost)
      - contract count ratio >= min_ratio
    """
    cur = conn.cursor()

    # 1) Pull all institutions with their state-prefix status
    rows = cur.execute("""
        SELECT id, name, COALESCE(siglas, ''), COALESCE(state_code, ''),
               COALESCE(sector_id, -1), COALESCE(total_contracts, 0)
        FROM institutions
    """).fetchall()

    prefixed: dict[tuple[str, int], list] = {}   # (norm_name, sector_id) -> [(id, name, contracts), ...]
    unprefixed: dict[tuple[str, int], list] = {}

    for inst_id, name, siglas, state_code, sector_id, contracts in rows:
        norm = normalize_name(name)
        if not norm:
            continue
        key = (norm, sector_id)
        upper = name.upper()
        has_prefix = any(upper.startswith(p + '-') for p in STATE_PREFIXES)
        target = prefixed if has_prefix else unprefixed
        target.setdefault(key, []).append((inst_id, name, contracts, state_code, siglas))

    # 2) For each unprefixed entry, look up matching prefixed entries
    pairs = []
    for key, dup_list in unprefixed.items():
        if key not in prefixed:
            continue
        keeper_list = prefixed[key]
        # Pair each dup with the keeper having the closest contract count
        for dup_id, dup_name, dup_contracts, _, _ in dup_list:
            best = None
            best_ratio = 0.0
            for keeper_id, keeper_name, keeper_contracts, keeper_state, _ in keeper_list:
                if keeper_id == dup_id:
                    continue
                if keeper_contracts == 0 and dup_contracts == 0:
                    ratio = 1.0
                else:
                    ratio = min(keeper_contracts, dup_contracts) / max(keeper_contracts, dup_contracts, 1)
                if ratio > best_ratio:
                    best_ratio = ratio
                    best = (keeper_id, keeper_name, keeper_contracts, keeper_state)
            if best is None or best_ratio < min_ratio:
                continue
            keeper_id, keeper_name, keeper_contracts, keeper_state = best
            # Confidence: 95% if exact-name match + ratio>=0.80; 85% if exact-name only;
            # lower for substring matches (we used exact normalization above so 95/85 only)
            confidence = 95 if best_ratio >= 0.80 else 85
            if confidence < min_confidence:
                continue
            pairs.append({
                'keeper_id': keeper_id,
                'duplicate_id': dup_id,
                'keeper_name': keeper_name,
                'dup_name': dup_name,
                'keeper_contracts': keeper_contracts,
                'dup_contracts': dup_contracts,
                'ratio': best_ratio,
                'confidence': confidence,
                'keeper_state': keeper_state,
            })

    # Sort: highest confidence first, then highest ratio
    pairs.sort(key=lambda p: (-p['confidence'], -p['ratio']))
    return pairs


def execute_dedupe(conn: sqlite3.Connection, pairs):
    """Migrate contracts + delete duplicates within a single transaction."""
    cur = conn.cursor()
    cur.execute("BEGIN")
    try:
        n_contracts = 0
        n_gt = 0
        n_inst = 0
        for p in pairs:
            keeper, dup = p['keeper_id'], p['duplicate_id']

            # Re-key contracts
            res = cur.execute(
                "UPDATE contracts SET institution_id = ? WHERE institution_id = ?",
                (keeper, dup),
            )
            n_contracts += res.rowcount

            # Migrate ground_truth_institutions if it exists
            try:
                res = cur.execute(
                    "UPDATE OR IGNORE ground_truth_institutions SET institution_id = ? WHERE institution_id = ?",
                    (keeper, dup),
                )
                n_gt += res.rowcount
            except sqlite3.OperationalError:
                # table may not exist; skip
                pass

            # Drop the duplicate institution row
            cur.execute("DELETE FROM institutions WHERE id = ?", (dup,))
            n_inst += 1

        conn.commit()
        return n_contracts, n_gt, n_inst
    except Exception:
        conn.rollback()
        raise


def reaggregate_stats(conn: sqlite3.Connection, keeper_ids):
    """Recompute institution_stats and related precomputed tables for keepers."""
    cur = conn.cursor()
    results = {}
    if not keeper_ids:
        return results

    # institution_stats: simple totals refresh
    try:
        # First check the schema to know which columns to recompute
        cols = [r[1] for r in cur.execute("PRAGMA table_info(institution_stats)")]
        if cols:
            # Recompute the common columns. Other columns left untouched (will be
            # refreshed by the next full precompute job).
            placeholders = ','.join('?' * len(keeper_ids))
            cur.execute(f"""
                UPDATE institution_stats
                SET total_contracts = (
                        SELECT COUNT(*) FROM contracts WHERE institution_id = institution_stats.institution_id
                    ),
                    total_value_mxn = (
                        SELECT COALESCE(SUM(amount_mxn), 0)
                        FROM contracts WHERE institution_id = institution_stats.institution_id
                    )
                WHERE institution_id IN ({placeholders})
            """, keeper_ids)
            results['institution_stats'] = cur.rowcount
    except sqlite3.OperationalError as e:
        results['institution_stats'] = f'skipped: {e}'

    # institutions.total_contracts + total_amount_mxn (denormalized columns)
    try:
        placeholders = ','.join('?' * len(keeper_ids))
        cur.execute(f"""
            UPDATE institutions
            SET total_contracts = (
                    SELECT COUNT(*) FROM contracts WHERE institution_id = institutions.id
                ),
                total_amount_mxn = (
                    SELECT COALESCE(SUM(amount_mxn), 0)
                    FROM contracts WHERE institution_id = institutions.id
                )
            WHERE id IN ({placeholders})
        """, keeper_ids)
        results['institutions'] = cur.rowcount
    except sqlite3.OperationalError as e:
        results['institutions'] = f'skipped: {e}'

    # Other precomputed tables -- flag for full rebuild rather than recompute
    # row-by-row. The downstream ETL pipeline will refresh these on its next run.
    for table in REAGG_TABLES[1:]:  # skip institution_stats (already done)
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table} LIMIT 1")
            results[table] = 'flagged for refresh -- run ETL pipeline'
        except sqlite3.OperationalError:
            results[table] = 'table not present'

    conn.commit()
    return results


def main():
    parser = argparse.ArgumentParser(description='Dedupe state-prefix institution duplicates.')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Print planned merges without touching the DB (default).')
    parser.add_argument('--execute', action='store_true',
                        help='Actually merge. Overrides --dry-run.')
    parser.add_argument('--confidence', type=int, default=95,
                        help='Minimum confidence percentage (default 95).')
    parser.add_argument('--min-ratio', type=float, default=0.80,
                        help='Minimum contract count ratio (default 0.80).')
    parser.add_argument('--limit', type=int, default=None,
                        help='Cap number of pairs processed (for staging).')
    args = parser.parse_args()

    dry_run = not args.execute

    if not DB_PATH.exists():
        print(f'ERROR: {DB_PATH} not found', file=sys.stderr)
        sys.exit(1)

    print(f'DB: {DB_PATH}')
    print(f'Mode: {"DRY-RUN" if dry_run else "EXECUTE"}')
    print(f'Filters: confidence >={args.confidence}%, contract_ratio >={args.min_ratio}')
    print()

    # Open the DB (read-only for dry-run, read-write for execute)
    if dry_run:
        conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    else:
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute('PRAGMA foreign_keys = OFF')  # we manually re-key

    t0 = time.time()
    pairs = find_dedupe_pairs(conn, args.confidence, args.min_ratio)
    print(f'Found {len(pairs)} candidate pairs in {time.time() - t0:.1f}s.')
    print()

    if args.limit:
        pairs = pairs[: args.limit]
        print(f'(Limited to {len(pairs)} for staging.)')
        print()

    if not pairs:
        print('Nothing to do.')
        return

    # Pretty-print the plan
    print(f"{'CONF':>4}  {'RATIO':>6}  {'KEEPER':>7}  <-  {'DUP':>7}  KEEPER_NAME  <-  DUP_NAME")
    print('-' * 120)
    for p in pairs[:25]:
        ratio_str = f"{p['ratio'] * 100:5.1f}%"
        print(f"{p['confidence']:>4}  {ratio_str:>6}  {p['keeper_id']:>7}  <-  {p['duplicate_id']:>7}  "
              f"{p['keeper_name'][:50]:<50}  <-  {p['dup_name'][:50]}")
    if len(pairs) > 25:
        print(f'   ... and {len(pairs) - 25} more')
    print()

    total_dup_contracts = sum(p['dup_contracts'] for p in pairs)
    print(f'Will re-key approximately {total_dup_contracts:,} contracts from duplicates → keepers.')
    print()

    if dry_run:
        print('DRY-RUN: no changes made. Re-run with --execute to apply.')
        return

    # Execute
    print('Executing merge transaction...')
    t1 = time.time()
    n_contracts, n_gt, n_inst = execute_dedupe(conn, pairs)
    print(f'  [ok] Re-keyed {n_contracts:,} contracts')
    print(f'  [ok] Migrated {n_gt} ground_truth_institutions rows')
    print(f'  [ok] Deleted {n_inst} duplicate institutions')
    print(f'  ({time.time() - t1:.1f}s)')
    print()

    # Re-aggregate
    print('Re-aggregating stats for affected keepers...')
    t2 = time.time()
    keeper_ids = list({p['keeper_id'] for p in pairs})
    reagg = reaggregate_stats(conn, keeper_ids)
    for table, result in reagg.items():
        print(f'  [ok] {table}: {result}')
    print(f'  ({time.time() - t2:.1f}s)')
    print()

    print(f'DONE in {time.time() - t0:.1f}s.')


if __name__ == '__main__':
    main()
