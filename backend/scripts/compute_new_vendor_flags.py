"""
New Vendor Risk Flags — Companion heuristic for ghost company detection.

The ML risk model has a structural blind spot: vendors with <3 years of
contract history score 2.9% HR vs 20.2% for established vendors. A fresh
shell company with 3 overpriced direct-award contracts in 2024 scores ~0.06.

This script applies rule-based heuristics on top of the ML score to flag
genuinely suspicious new vendors that the model cannot detect.

Rules applied (any 2+ triggers → new_vendor_risk=1):
  R1. Vendor age < 3 years (at time of first contract)
  R2. Direct award rate >= 85%
  R3. No RFC on record
  R4. First contract value >= 5M MXN (large contract immediately)
  R5. Single institution (all contracts to one buyer)
  R6. < 10 total contracts (low volume, high specificity)
  R7. ML risk_score < 0.10 despite suspicious pattern (model blind spot)

Output: updates aria_queue.new_vendor_risk (0/1) and adds
        vendor_stats.new_vendor_risk_score (0.0-1.0 heuristic confidence).

Usage:
    cd backend && python -m scripts.compute_new_vendor_flags
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Thresholds — narrow ghost company / new suspicious vendor fingerprint.
# Design intent: flag vendors the ML model structurally CANNOT detect (new/few contracts)
# but that show high-value, non-competitive, concentrated procurement patterns.
MIN_AGE_YEARS = 4          # R1: vendor's active span < 4 years
DA_RATE_THRESH = 0.95      # R2: 95%+ direct award (anchor — must trigger)
MIN_TOTAL_VALUE_MXN = 10_000_000   # R_VAL: must have >= 10M total to matter
SINGLE_INST_THRESHOLD = 1  # R5: only 1 institution (captured buyer)
MAX_CONTRACTS = 8          # R6: very few contracts despite significant value
MIN_DEBUT_YEAR = 2018      # R_NEW: only flag vendors that debuted 2018+ (no old data gap)
ML_BLIND_SCORE = 0.08      # R7: ML score very low despite suspicious pattern
SUPPORTING_TRIGGER_COUNT = 2  # need R2+R_VAL anchors + this many supporting rules


def ensure_columns(conn):
    """Add new_vendor_risk column to aria_queue and vendor_stats if not present."""
    cur = conn.cursor()
    # Check aria_queue
    cur.execute("PRAGMA table_info(aria_queue)")
    cols = {r[1] for r in cur.fetchall()}
    if 'new_vendor_risk' not in cols:
        cur.execute("ALTER TABLE aria_queue ADD COLUMN new_vendor_risk INTEGER DEFAULT 0")
        print("  Added aria_queue.new_vendor_risk column")
    # Check vendor_stats
    cur.execute("PRAGMA table_info(vendor_stats)")
    cols = {r[1] for r in cur.fetchall()}
    if 'new_vendor_risk_score' not in cols:
        cur.execute("ALTER TABLE vendor_stats ADD COLUMN new_vendor_risk_score REAL DEFAULT 0.0")
        print("  Added vendor_stats.new_vendor_risk_score column")
    if 'new_vendor_risk_triggers' not in cols:
        cur.execute("ALTER TABLE vendor_stats ADD COLUMN new_vendor_risk_triggers TEXT DEFAULT ''")
        print("  Added vendor_stats.new_vendor_risk_triggers column")
    conn.commit()


def compute_flags(conn):
    """Compute new vendor risk flags for all vendors.

    Uses precomputed columns from vendor_stats, vendors, aria_queue — no
    slow correlated subqueries on the 3.1M-row contracts table.
    """
    cur = conn.cursor()

    print("  Loading vendor data (using precomputed tables)...")
    # All data comes from already-aggregated tables: fast even on 320K vendors
    cur.execute("""
        SELECT
            vs.vendor_id,
            COALESCE(aq.vendor_name, v.name) as vendor_name,
            vs.total_contracts,
            vs.total_value_mxn,
            vs.direct_award_pct,
            vs.first_contract_year,
            vs.last_contract_year,
            vs.institution_count,
            COALESCE(aq.avg_risk_score, vs.avg_risk_score, 0.0) as ml_score,
            COALESCE(aq.in_ground_truth, 0) as in_gt,
            COALESCE(aq.fp_structural_monopoly, 0) as is_structural_fp,
            COALESCE(aq.fp_patent_exception, 0) as is_patent_fp,
            COALESCE(v.rfc, '') as rfc,
            COALESCE(v.total_amount_mxn / NULLIF(v.total_contracts, 0), 0) as avg_contract_value
        FROM vendor_stats vs
        LEFT JOIN aria_queue aq ON vs.vendor_id = aq.vendor_id
        LEFT JOIN vendors v ON vs.vendor_id = v.id
        WHERE vs.first_contract_year IS NOT NULL
          AND vs.total_contracts > 0
    """)
    vendors = cur.fetchall()
    print(f"  Processing {len(vendors):,} vendors...")

    current_year = 2025
    flagged = []
    scores = []

    for row in vendors:
        (vendor_id, vendor_name, total_contracts, total_value,
         da_pct, first_year, last_year, n_inst, ml_score,
         in_gt, is_structural_fp, is_patent_fp,
         rfc, avg_contract_value) = row

        # Skip GT vendors and structural FPs
        if in_gt or is_structural_fp or is_patent_fp:
            continue

        # Hard anchors — BOTH must be true to be flagged
        # R2: 95%+ direct award rate (never competes)
        r2 = (da_pct or 0) >= DA_RATE_THRESH * 100
        # R_VAL: meaningful total procurement value (not a tiny vendor)
        r_val = (total_value or 0) >= MIN_TOTAL_VALUE_MXN
        # R_NEW: debuted in the modern era (no old data quality excuse)
        r_new = (first_year or 0) >= MIN_DEBUT_YEAR

        # All three anchors must fire for this vendor to be a candidate
        if not (r2 and r_val and r_new):
            scores.append((vendor_id, 0, 0.0, ''))
            continue

        # Supporting signals (need >= SUPPORTING_TRIGGER_COUNT of these)
        # R1: Short active span (< 4 years total)
        age = (last_year or current_year) - (first_year or current_year) + 1
        r1 = age < MIN_AGE_YEARS

        # R3: No RFC
        r3 = not rfc or rfc.strip() == ''

        # R5: Single institution (captured buyer)
        r5 = (n_inst or 0) <= SINGLE_INST_THRESHOLD and (total_contracts or 0) >= 2

        # R6: Very few contracts for significant value (high concentration)
        r6 = (total_contracts or 0) <= MAX_CONTRACTS and (total_contracts or 0) >= 2

        # R7: ML model completely missed it (very low score despite DA pattern)
        r7 = ml_score < ML_BLIND_SCORE

        supporting = [r for r, flag in [('R1_short_span', r1), ('R3_no_rfc', r3),
                                         ('R5_single_inst', r5), ('R6_few_contracts', r6),
                                         ('R7_ml_blind', r7)] if flag]
        trigger_count = 3 + len(supporting)  # 3 anchors + supporting
        heuristic_score = min((len(supporting) + 3) / 8.0, 1.0)

        triggers = ['R2_high_da', 'R_VAL_significant', 'R_NEW_modern'] + supporting

        if len(supporting) >= SUPPORTING_TRIGGER_COUNT:
            flagged.append((vendor_id, 1, heuristic_score, ','.join(triggers)))
        else:
            scores.append((vendor_id, 0, heuristic_score, ','.join(triggers)))

    print(f"  Flagged {len(flagged):,} new/suspicious vendors "
          f"({len(flagged)/(len(vendors) or 1)*100:.1f}% of all vendors)")

    # Update aria_queue
    print("  Updating aria_queue...")
    conn.execute("PRAGMA synchronous=OFF")
    all_updates = flagged + scores
    cur.executemany(
        "UPDATE aria_queue SET new_vendor_risk=? WHERE vendor_id=?",
        [(f[1], f[0]) for f in all_updates]
    )

    # Update vendor_stats
    print("  Updating vendor_stats...")
    cur.executemany(
        """UPDATE vendor_stats
           SET new_vendor_risk_score=?, new_vendor_risk_triggers=?
           WHERE vendor_id=?""",
        [(f[2], f[3], f[0]) for f in all_updates]
    )
    conn.commit()

    # Stats breakdown
    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE new_vendor_risk=1")
    aq_flagged = cur.fetchone()[0]
    print(f"  aria_queue.new_vendor_risk=1: {aq_flagged:,} vendors")

    # Trigger distribution for flagged
    all_triggers_flat = [t for f in flagged for t in f[3].split(',') if t]
    from collections import Counter
    trigger_counts = Counter(all_triggers_flat)
    print("\n  Trigger breakdown:")
    for trig, cnt in sorted(trigger_counts.items(), key=lambda x: -x[1]):
        print(f"    {trig}: {cnt:,}")

    return len(flagged)


def add_api_endpoint_note():
    """Print reminder about exposing new_vendor_risk in API."""
    print("\n  NOTE: To expose new_vendor_risk in the API:")
    print("    GET /aria/queue now includes new_vendor_risk field automatically")
    print("    Add filter: ?new_vendor_risk=1 to ARIA queue endpoint")
    print("    Frontend: add 'New Vendor' badge to ARIA queue rows where new_vendor_risk=1")


def main():
    print("=" * 60)
    print("NEW VENDOR RISK FLAGS — Ghost Company Companion Heuristic")
    print("=" * 60)
    print(f"  DB: {DB_PATH}")
    print(f"  Thresholds: age<{MIN_AGE_YEARS}yr, DA>={DA_RATE_THRESH*100:.0f}%, "
          f"min_value>={MIN_TOTAL_VALUE_MXN/1e6:.0f}M, debut>={MIN_DEBUT_YEAR}, "
          f"R2+R_VAL+R_NEW anchors + {SUPPORTING_TRIGGER_COUNT} supporting signals")

    conn = sqlite3.connect(DB_PATH, timeout=120)
    conn.execute("PRAGMA busy_timeout=120000")

    try:
        print("\n[1/3] Ensuring schema columns...")
        ensure_columns(conn)

        print("\n[2/3] Computing flags...")
        n_flagged = compute_flags(conn)

        print("\n[3/3] Done.")
        add_api_endpoint_note()
        print(f"\n  Total flagged: {n_flagged:,} new/suspicious vendors")
        print(f"  Timestamp: {datetime.now().isoformat()}")
        return 0

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()


if __name__ == '__main__':
    sys.exit(main())
