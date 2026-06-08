#!/usr/bin/env python3
"""Precompute institution Money-at-Risk (value flowing through risky contracts).

Adds institution_stats.high_critical_value_mxn = Σ amount_mxn over contracts
with risk_score >= 0.40 (high + critical), capped at the 100B data-error
threshold. This is the EXPOSURE axis — distinct from the integrity score —
that surfaces the billion-peso outliers (GACM/NAICM, INSABI, Banco del
Bienestar) the transparency pillars structurally cannot rank.

Mirrors the sector VaR field pattern (high_critical_value_mxn) from M3v2.
"""
import sqlite3
import sys

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — data-error reject threshold
HIGH_RISK_FLOOR = 0.40                # high + critical (v0.8.5 thresholds)

DB = sys.argv[1] if len(sys.argv) > 1 else r"D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB, timeout=60)
    conn.execute("PRAGMA busy_timeout = 30000")
    cur = conn.cursor()

    cols = [c[1] for c in cur.execute("PRAGMA table_info(institution_stats)").fetchall()]
    if "high_critical_value_mxn" not in cols:
        cur.execute("ALTER TABLE institution_stats ADD COLUMN high_critical_value_mxn REAL DEFAULT 0")
        print("added column institution_stats.high_critical_value_mxn")

    print("aggregating value-at-risk per institution (single contracts pass) ...")
    rows = cur.execute(
        """
        SELECT institution_id, SUM(amount_mxn) AS var_value
        FROM contracts
        WHERE risk_score >= ?
          AND institution_id IS NOT NULL
          AND COALESCE(amount_mxn, 0) > 0
          AND amount_mxn <= ?
        GROUP BY institution_id
        """,
        (HIGH_RISK_FLOOR, MAX_CONTRACT_VALUE),
    ).fetchall()

    cur.execute("UPDATE institution_stats SET high_critical_value_mxn = 0")
    cur.executemany(
        "UPDATE institution_stats SET high_critical_value_mxn = ? WHERE institution_id = ?",
        [(float(v or 0), iid) for iid, v in rows],
    )
    conn.commit()
    print("wrote high_critical_value_mxn for %d institutions" % len(rows))

    # Sanity: top federal exposures
    top = cur.execute(
        """
        SELECT i.name, ist.high_critical_value_mxn v, ist.total_contracts nc
        FROM institution_stats ist JOIN institutions i ON i.id = ist.institution_id
        WHERE i.is_federal = 1
        ORDER BY ist.high_critical_value_mxn DESC LIMIT 10
        """
    ).fetchall()
    print("\nTop-10 federal Money-at-Risk:")
    for name, v, nc in top:
        print("  %8.1fB  nc=%-7s %s" % ((v or 0) / 1e9, nc, name.encode("ascii", "replace").decode()[:46]))
    conn.close()


if __name__ == "__main__":
    main()
