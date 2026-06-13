"""
Refresh category_stats.avg_risk from the CURRENT risk_score (Day-10 /categories
QA, audit I1).

The prod RUBLI_DEPLOY.db has a STALE category_stats.avg_risk: high_risk_pct and
total_contracts were refreshed (_backfill_category_high_risk.py) after the last
rescore, but avg_risk was not. The two columns drifted — e.g. cat 64 "Material
de Limpieza" stored avg_risk 0.4531 while the live AVG(risk_score) is 0.2071 and
only 1% of its contracts are high-risk. That stale value corrupts the dossier
verdict seal AND the index risk ranking / § THE BALANCE / HIGHEST-RISK finding /
El Concentrado sort (all key off category_stats.avg_risk).

This is a MECHANICAL data refresh, NOT a rescore — the per-contract risk_score
and risk_level are already consistent; only the precomputed aggregate is stale.
No intercept/c_pu involved, so the CLAUDE.md scoring guards do not apply.

Recomputes avg_risk = AVG(risk_score) per category (one indexed pass each, via
the composite index on contracts(category_id, ...)). Idempotent. Reports the
rows it moved.

Usage:
    python -m scripts._refresh_category_avg_risk [DB_PATH]
    DB_PATH defaults to RUBLI_DEPLOY.db (run dir = backend/).
"""
import sqlite3
import sys

DRIFT_REPORT_THRESHOLD = 0.02


def refresh(db_path: str) -> None:
    print(f"Refreshing category_stats.avg_risk in: {db_path}")
    conn = sqlite3.connect(db_path, timeout=600)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout=600000")

    # Live AVG(risk_score) per category, vs the stored (possibly stale) value.
    before = {
        r["category_id"]: (r["stored"], r["live"])
        for r in cur.execute(
            """
            SELECT cs.category_id,
                   cs.avg_risk AS stored,
                   (SELECT AVG(c.risk_score) FROM contracts c
                     WHERE c.category_id = cs.category_id
                       AND c.risk_score IS NOT NULL) AS live
            FROM category_stats cs
            """
        ).fetchall()
    }
    drifted = [
        (cid, st, lv)
        for cid, (st, lv) in before.items()
        if st is not None and lv is not None and abs(st - lv) > DRIFT_REPORT_THRESHOLD
    ]
    drifted.sort(key=lambda t: -abs((t[1] or 0) - (t[2] or 0)))
    print(f"  categories with stale avg_risk (>|{DRIFT_REPORT_THRESHOLD}|): {len(drifted)}")
    for cid, st, lv in drifted[:12]:
        print(f"    cat {cid:>3}: stored {st:.4f} -> live {lv:.4f}  (drift {st - lv:+.4f})")

    cur.execute("BEGIN IMMEDIATE")
    cur.execute(
        """
        UPDATE category_stats
           SET avg_risk = COALESCE((
               SELECT ROUND(AVG(c.risk_score), 4) FROM contracts c
                WHERE c.category_id = category_stats.category_id
                  AND c.risk_score IS NOT NULL
           ), avg_risk)
        """
    )
    moved = cur.rowcount
    conn.commit()
    print(f"  category_stats rows touched: {moved}")

    # Verify nothing remains drifted.
    remaining = cur.execute(
        """
        SELECT COUNT(*) FROM category_stats cs
        WHERE ABS(cs.avg_risk - COALESCE((
              SELECT AVG(c.risk_score) FROM contracts c
               WHERE c.category_id = cs.category_id AND c.risk_score IS NOT NULL), cs.avg_risk)) > ?
        """,
        (DRIFT_REPORT_THRESHOLD,),
    ).fetchone()[0]
    print(f"  remaining drifted (expect 0): {remaining}")
    conn.close()


if __name__ == "__main__":
    refresh(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_DEPLOY.db")
