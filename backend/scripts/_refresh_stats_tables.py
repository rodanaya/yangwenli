#!/usr/bin/env python3
"""
Refresh institution_stats and vendor_stats from current contracts table.

Run after any risk scoring run to sync derived stats with actual contract scores.
Uses risk_level column (pre-computed) for high-risk counts, and
recalculates all aggregate metrics from scratch.

High-risk thresholds (v6.x): critical >= 0.60, high >= 0.40
high_risk_pct = 100 * (critical + high) / total_contracts  → stored as 0-100
"""

import sqlite3
import logging
from pathlib import Path
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get("DATABASE_PATH", str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")))


def refresh_institution_stats(conn: sqlite3.Connection) -> None:
    log.info("Refreshing institution_stats from current contracts …")
    conn.execute("PRAGMA synchronous = OFF")

    conn.execute("""
        UPDATE institution_stats SET
            total_contracts    = s.tc,
            total_value_mxn    = s.tv,
            avg_risk_score     = s.avg_r,
            high_risk_count    = s.hrc,
            high_risk_pct      = s.hrp,
            direct_award_count = s.dac,
            direct_award_pct   = s.dap,
            single_bid_count   = s.sbc,
            single_bid_pct     = s.sbp,
            vendor_count       = s.vc,
            first_contract_year = s.fcy,
            last_contract_year  = s.lcy,
            updated_at         = CURRENT_TIMESTAMP
        FROM (
            SELECT
                institution_id,
                COUNT(*)                                                                 AS tc,
                SUM(COALESCE(amount_mxn, 0))                                             AS tv,
                AVG(COALESCE(risk_score, 0))                                             AS avg_r,
                SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END)       AS hrc,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) AS hrp,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END)                    AS dac,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS dap,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END)                      AS sbc,
                ROUND(100.0 * SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) / COUNT(*), 2)  AS sbp,
                COUNT(DISTINCT vendor_id)                                                AS vc,
                MIN(CAST(strftime('%Y', contract_date) AS INTEGER))                      AS fcy,
                MAX(CAST(strftime('%Y', contract_date) AS INTEGER))                      AS lcy
            FROM contracts
            WHERE institution_id IS NOT NULL
            GROUP BY institution_id
        ) s
        WHERE institution_stats.institution_id = s.institution_id
    """)
    conn.commit()

    affected = conn.execute("SELECT changes()").fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM institution_stats").fetchone()[0]
    log.info("  institution_stats refreshed: %d rows updated, %d total", affected, total)


def refresh_vendor_stats(conn: sqlite3.Connection) -> None:
    log.info("Refreshing vendor_stats from current contracts …")

    conn.execute("""
        UPDATE vendor_stats SET
            total_contracts     = s.tc,
            total_value_mxn     = s.tv,
            avg_risk_score      = s.avg_r,
            high_risk_pct       = s.hrp,
            direct_award_pct    = s.dap,
            single_bid_pct      = s.sbp,
            sector_count        = s.sc,
            institution_count   = s.ic,
            first_contract_year = s.fcy,
            last_contract_year  = s.lcy,
            updated_at          = CURRENT_TIMESTAMP
        FROM (
            SELECT
                vendor_id,
                COUNT(*)                                                                          AS tc,
                SUM(COALESCE(amount_mxn, 0))                                                      AS tv,
                AVG(COALESCE(risk_score, 0))                                                      AS avg_r,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) AS hrp,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS dap,
                ROUND(100.0 * SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) / COUNT(*), 2)   AS sbp,
                COUNT(DISTINCT sector_id)                                                          AS sc,
                COUNT(DISTINCT institution_id)                                                     AS ic,
                MIN(CAST(strftime('%Y', contract_date) AS INTEGER))                                AS fcy,
                MAX(CAST(strftime('%Y', contract_date) AS INTEGER))                                AS lcy
            FROM contracts
            WHERE vendor_id IS NOT NULL
            GROUP BY vendor_id
        ) s
        WHERE vendor_stats.vendor_id = s.vendor_id
    """)
    conn.commit()

    affected = conn.execute("SELECT changes()").fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM vendor_stats").fetchone()[0]
    log.info("  vendor_stats refreshed: %d rows updated, %d total", affected, total)


def main() -> None:
    import argparse
    p = argparse.ArgumentParser(description="Refresh institution_stats and vendor_stats from contracts")
    p.add_argument("--institutions-only", action="store_true")
    p.add_argument("--vendors-only",      action="store_true")
    p.add_argument("--db",                default=str(DB_PATH))
    args = p.parse_args()

    conn = sqlite3.connect(args.db, timeout=120)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 60000")

    if not args.vendors_only:
        refresh_institution_stats(conn)

    if not args.institutions_only:
        refresh_vendor_stats(conn)

    conn.close()
    log.info("Done.")


if __name__ == "__main__":
    main()
