"""
rollback_v5_scores.py
Restore risk_score/risk_level/risk_model_version from risk_score_v5 column.
Uses cursor-based batching with executemany for speed.
Run from backend/: python -m scripts.rollback_v5_scores
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'
BATCH_SIZE = 100_000


def risk_level(score: float) -> str:
    if score >= 0.50:
        return 'critical'
    elif score >= 0.30:
        return 'high'
    elif score >= 0.10:
        return 'medium'
    return 'low'


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=180)
    conn.execute('PRAGMA busy_timeout = 180000')
    conn.execute('PRAGMA synchronous = OFF')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Count how many need updating
    cur.execute('''
        SELECT COUNT(*) FROM contracts
        WHERE risk_score_v5 IS NOT NULL
          AND ABS(COALESCE(risk_score, -1) - risk_score_v5) > 0.001
    ''')
    total = cur.fetchone()[0]
    print(f'Contracts needing rollback: {total:,}')

    if total == 0:
        print('Nothing to do.')
        conn.close()
        return

    done = 0
    last_id = 0

    while True:
        # Cursor-based pagination (avoids OFFSET O(n) scan)
        cur.execute('''
            SELECT id, risk_score_v5
            FROM contracts
            WHERE id > ?
              AND risk_score_v5 IS NOT NULL
              AND ABS(COALESCE(risk_score, -1) - risk_score_v5) > 0.001
            ORDER BY id
            LIMIT ?
        ''', (last_id, BATCH_SIZE))
        rows = cur.fetchall()
        if not rows:
            break

        batch = [
            (row['risk_score_v5'], risk_level(row['risk_score_v5']), 'v5.1', row['id'])
            for row in rows
        ]
        last_id = rows[-1]['id']

        for attempt in range(30):
            try:
                conn.execute('BEGIN IMMEDIATE')
                conn.executemany(
                    'UPDATE contracts SET risk_score=?, risk_level=?, risk_model_version=? WHERE id=?',
                    batch
                )
                conn.execute('COMMIT')
                done += len(batch)
                break
            except sqlite3.OperationalError as e:
                conn.execute('ROLLBACK')
                if attempt < 29:
                    time.sleep(0.5)
                else:
                    print(f'  FAILED after 30 attempts at id {last_id}: {e}')
                    raise

        print(f'  {done:,}/{total:,} ({100*done/total:.1f}%)', end='\r', flush=True)

    print(f'\nDone. {done:,} contracts restored to v5.1.')

    # Verify
    cur.execute("SELECT risk_level, COUNT(*) FROM contracts GROUP BY risk_level")
    dist = {row[0]: row[1] for row in cur.fetchall()}
    cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_level IN ('critical','high')")
    high = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_level IS NOT NULL")
    total_scored = cur.fetchone()[0]
    print(f'\nPost-rollback distribution:')
    for lvl in ['critical', 'high', 'medium', 'low']:
        print(f'  {lvl}: {dist.get(lvl, 0):,}')
    print(f'High-risk rate: {100*high/total_scored:.1f}%')

    conn.close()


if __name__ == '__main__':
    run()
