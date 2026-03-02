"""
Complete the v5.1 rollback for the remaining ~1.57M mismatched rows.
Uses range-based UPDATE with 50K batch size.
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-131072")  # 128MB cache

    # Quick count
    mismatched = conn.execute(
        "SELECT COUNT(*) FROM contracts WHERE ABS(risk_score - risk_score_v5) > 0.0001"
    ).fetchone()[0]
    print(f"Rows needing rollback: {mismatched:,}")

    if mismatched == 0:
        print("Nothing to do — all rows already match v5.1.")
        conn.close()
        return

    max_id = conn.execute("SELECT MAX(id) FROM contracts").fetchone()[0]
    print(f"Max contract ID: {max_id:,}")

    BATCH = 50_000
    t0 = time.time()
    total_fixed = 0
    num_batches = (max_id // BATCH) + 1

    for i in range(num_batches):
        lo = i * BATCH + 1
        hi = (i + 1) * BATCH
        cur = conn.execute(
            """UPDATE contracts SET
               risk_score=risk_score_v5,
               risk_level=CASE WHEN risk_score_v5>=0.50 THEN 'critical'
                               WHEN risk_score_v5>=0.30 THEN 'high'
                               WHEN risk_score_v5>=0.10 THEN 'medium'
                               ELSE 'low' END,
               risk_model_version='v5.1'
               WHERE id BETWEEN ? AND ? AND ABS(risk_score - risk_score_v5) > 0.0001""",
            (lo, hi)
        )
        conn.commit()

        if cur.rowcount > 0:
            total_fixed += cur.rowcount
            elapsed = time.time() - t0
            remaining = mismatched - total_fixed
            rate = total_fixed / elapsed if elapsed > 0 else 1
            eta = remaining / rate if rate > 0 else 0
            pct = total_fixed / mismatched * 100
            print(
                f"  [{pct:.0f}%] batch {i+1}/{num_batches}: +{cur.rowcount:,} "
                f"({total_fixed:,} total, {rate:.0f}/s, ETA {eta:.0f}s)"
            )

    # Final verification
    r = conn.execute(
        "SELECT risk_level, COUNT(*) FROM contracts WHERE risk_level IS NOT NULL GROUP BY risk_level"
    ).fetchall()
    tc = sum(x[1] for x in r)
    hr = sum(x[1] for x in r if x[0] in ("critical", "high"))
    print(f"\nFinal distribution (total {tc:,}):")
    for row in sorted(r, key=lambda x: -x[1]):
        print(f"  {row[0]}: {row[1]:,} ({row[1]/tc*100:.1f}%)")
    print(f"HR rate: {hr/tc*100:.2f}% (target: ~10.6%)")

    still_mismatched = conn.execute(
        "SELECT COUNT(*) FROM contracts WHERE ABS(risk_score - risk_score_v5) > 0.0001"
    ).fetchone()[0]
    print(f"Remaining mismatched: {still_mismatched:,}")

    conn.close()

if __name__ == "__main__":
    run()
