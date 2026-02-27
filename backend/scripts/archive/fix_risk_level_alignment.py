"""
Fix risk_level / risk_score misalignment.

The risk_level column was computed using old thresholds (critical>=0.40, high>=0.14, medium>=0.05)
but needs to match the documented v4.0 thresholds (critical>=0.50, high>=0.30, medium>=0.10).

This script:
1. Shows current state (before)
2. Updates risk_level based on risk_score using correct v4.0 thresholds
3. Shows new state (after)
4. Verifies alignment

Run from backend/ directory:
    python scripts/fix_risk_level_alignment.py
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Documented v4.0 thresholds (from RISK_METHODOLOGY_v4.md and constants.py)
THRESHOLDS = {
    'critical': 0.50,
    'high': 0.30,
    'medium': 0.10,
}


def main():
    print("=" * 60)
    print("FIX RISK_LEVEL / RISK_SCORE ALIGNMENT")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Thresholds: critical>={THRESHOLDS['critical']}, "
          f"high>={THRESHOLDS['high']}, medium>={THRESHOLDS['medium']}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Show current state
    print("\n--- BEFORE ---")
    cursor.execute("""
        SELECT risk_level,
               COUNT(*) as cnt,
               ROUND(AVG(risk_score), 4) as avg_score,
               ROUND(MIN(risk_score), 4) as min_score,
               ROUND(MAX(risk_score), 4) as max_score
        FROM contracts
        GROUP BY risk_level
        ORDER BY avg_score DESC
    """)
    for row in cursor.fetchall():
        print(f"  {row['risk_level']:>10}: {row['cnt']:>10,} contracts "
              f"(avg={row['avg_score']}, range=[{row['min_score']}, {row['max_score']}])")

    # 2. Update risk_level
    print("\nUpdating risk_level based on v4.0 thresholds...")
    start = time.time()
    cursor.execute("""
        UPDATE contracts SET risk_level = CASE
            WHEN risk_score >= ? THEN 'critical'
            WHEN risk_score >= ? THEN 'high'
            WHEN risk_score >= ? THEN 'medium'
            ELSE 'low'
        END
    """, (THRESHOLDS['critical'], THRESHOLDS['high'], THRESHOLDS['medium']))
    updated = cursor.rowcount
    conn.commit()
    elapsed = time.time() - start
    print(f"  Updated {updated:,} rows in {elapsed:.1f}s")

    # 3. Show new state
    print("\n--- AFTER ---")
    cursor.execute("""
        SELECT risk_level,
               COUNT(*) as cnt,
               ROUND(AVG(risk_score), 4) as avg_score,
               ROUND(MIN(risk_score), 4) as min_score,
               ROUND(MAX(risk_score), 4) as max_score
        FROM contracts
        GROUP BY risk_level
        ORDER BY avg_score DESC
    """)
    for row in cursor.fetchall():
        print(f"  {row['risk_level']:>10}: {row['cnt']:>10,} contracts "
              f"(avg={row['avg_score']}, range=[{row['min_score']}, {row['max_score']}])")

    # 4. Verify alignment: averages should be within threshold bands
    print("\n--- VERIFICATION ---")
    cursor.execute("""
        SELECT risk_level,
               MIN(risk_score) as min_score,
               MAX(risk_score) as max_score
        FROM contracts
        GROUP BY risk_level
    """)
    ok = True
    for row in cursor.fetchall():
        level = row['risk_level']
        min_s, max_s = row['min_score'], row['max_score']
        if level == 'critical' and min_s < THRESHOLDS['critical']:
            print(f"  FAIL: critical min={min_s} < {THRESHOLDS['critical']}")
            ok = False
        elif level == 'high' and (min_s < THRESHOLDS['high'] or max_s >= THRESHOLDS['critical']):
            print(f"  FAIL: high range [{min_s}, {max_s}] not in [{THRESHOLDS['high']}, {THRESHOLDS['critical']})")
            ok = False
        elif level == 'medium' and (min_s < THRESHOLDS['medium'] or max_s >= THRESHOLDS['high']):
            print(f"  FAIL: medium range [{min_s}, {max_s}] not in [{THRESHOLDS['medium']}, {THRESHOLDS['high']})")
            ok = False
        elif level == 'low' and max_s >= THRESHOLDS['medium']:
            print(f"  FAIL: low max={max_s} >= {THRESHOLDS['medium']}")
            ok = False

    if ok:
        print("  ALL LEVELS ALIGNED CORRECTLY")
    else:
        print("  WARNING: Misalignment detected!")

    conn.close()
    print("\n" + "=" * 60)
    print("Done.")


if __name__ == "__main__":
    main()
