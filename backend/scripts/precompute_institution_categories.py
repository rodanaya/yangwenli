"""Precompute per-institution category spend for the dossier's «What they buy».

`GET /institutions/{id}/top-categories` groups an institution's contracts by
the canonical `categories` taxonomy. For IMSS that is a 662K-row walk on every
cold request, so the endpoint reads this small table first and only falls back
to the live GROUP BY when the table is absent (test fixture) or a year filter
is asked for.

Idempotent: CREATE TABLE IF NOT EXISTS + DELETE + INSERT in one transaction.
Amounts above MAX_CONTRACT_VALUE (100B MXN, data errors) are excluded.

    cd backend && python -m scripts.precompute_institution_categories [db_path]

PARALLAX Day 9 § Change 1 (docs/parallax/DAY-09-institutions.md).
"""
import sqlite3
import sys
import time

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject above (data-validation rule)

DDL = """
CREATE TABLE IF NOT EXISTS institution_category_stats (
    institution_id   INTEGER NOT NULL,
    category_id      INTEGER NOT NULL,
    contract_count   INTEGER NOT NULL,
    total_value_mxn  REAL    NOT NULL,
    avg_risk_score   REAL,
    direct_award_pct REAL,
    high_risk_count  INTEGER NOT NULL,
    computed_at      TEXT    NOT NULL,
    PRIMARY KEY (institution_id, category_id)
)
"""

FILL = """
INSERT INTO institution_category_stats
SELECT
    c.institution_id,
    c.category_id,
    COUNT(*),
    SUM(COALESCE(c.amount_mxn, 0)),
    AVG(c.risk_score),
    ROUND(100.0 * SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 1),
    SUM(CASE WHEN c.risk_level IN ('high', 'critical') THEN 1 ELSE 0 END),
    datetime('now')
FROM contracts c
WHERE c.institution_id IS NOT NULL
  AND c.category_id IS NOT NULL
  AND COALESCE(c.amount_mxn, 0) <= ?
GROUP BY c.institution_id, c.category_id
"""


def main(db_path: str) -> None:
    t0 = time.time()
    conn = sqlite3.connect(db_path, timeout=60)
    try:
        conn.execute("BEGIN")
        conn.execute(DDL)
        conn.execute("DELETE FROM institution_category_stats")
        conn.execute(FILL, (MAX_CONTRACT_VALUE,))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    n, insts = conn.execute(
        "SELECT COUNT(*), COUNT(DISTINCT institution_id) FROM institution_category_stats"
    ).fetchone()
    conn.close()
    print(f"institution_category_stats: {n} rows, {insts} institutions, {time.time() - t0:.1f}s -> {db_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db")
