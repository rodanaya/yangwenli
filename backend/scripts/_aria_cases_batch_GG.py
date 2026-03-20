#!/usr/bin/env python3
"""
GT Mining Batch GG — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v43279   CORPORATIVO MS SISTEMAS MEDICOS SA DE CV     → SKIP (legitimate medical distributor, 20 institutions, 14 years, competitive LP wins)
  v55923   CAMSA INFRAESTRUCTURA S A P I DE CV          → ADD  (single_bid_capture at SCT, 75% SB, 807M in 3 years)
  v70277   QUIMICA APOLLO                               → ADD  (institutional_capture at CFE, 3B+ value, sector mismatch)

Cases added: 2  |  Vendors skipped: 1
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 813:
        print(f"ERROR: max_id={max_id}, expected >= 813. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v55923 — SCT single-bid capture
    c2 = max_id + 2  # v70277 — CFE institutional capture

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v55923 — SCT Single-Bid Infrastructure Capture ──────────
    # CAMSA INFRAESTRUCTURA S A P I DE CV
    # 8 contracts 2010-2013, 822M MXN total. SCT = 88% of value (807M).
    # 75% single-bid rate overall — competitive procedures with only 1 bidder.
    # Two massive single-bid contracts at SCT in 2011 (286M + 204M).
    # Also 2 direct awards at SCT in 2012 (163M). Only other institution is
    # CFE with 1 contract (15M). Short 3-year window consistent with
    # sexenio-aligned infrastructure capture (Calderon → Peña Nieto transition).
    # P3 intermediary flag in ARIA. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "SCT Single-Bid Infrastructure Capture — CAMSA",
            "single_bid_capture",
            2010,
            2013,
            "medium",
            807_000_000,
            "ARIA T3 queue pattern analysis",
            "CAMSA INFRAESTRUCTURA won 807M MXN at SCT over 2010-2013 with 75% "
            "single-bid rate. Two massive SB contracts in 2011 (286M + 204M), "
            "then 2 direct awards in 2012 (163M). Only 2 institutions total "
            "(SCT 88%, CFE 12%). Short 3-year window aligned with sexenio "
            "transition. P3 intermediary flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 55923, "CAMSA INFRAESTRUCTURA S A P I DE CV", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v70277 — CFE Institutional Capture (Quimica Apollo) ─────
    # QUIMICA APOLLO
    # 26 contracts 2010-2019, 3,427M MXN total. CFE = 88% of value (3,025M).
    # 35% DA, 35% SB at CFE. Massive individual contracts: 1,064M (2014),
    # 856M SB (2013), 399M SB (2010). Won 399M SB at AICM (airport) in 2019
    # for electrical substation construction. Name "Quimica Apollo" suggests
    # chemical company but contracts are for electrical substation construction
    # and rehabilitation — sector mismatch. Value concentrated in 2010-2014
    # window (2,946M of 3,025M at CFE = 97%). Activity collapsed after 2015
    # (78M total 2015-2017). P6 institutional capture flag. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "CFE Electrical Substation Capture — Quimica Apollo",
            "institutional_capture",
            2010,
            2017,
            "medium",
            3_025_000_000,
            "ARIA T3 queue pattern analysis",
            "QUIMICA APOLLO won 3,025M MXN at CFE over 2010-2017 with 35% DA and "
            "35% SB rates. Massive contracts: 1,064M (2014), 856M SB (2013), "
            "399M SB (2010). Also 399M SB at AICM airport (2019) for electrical "
            "substation work. Sector mismatch: 'Quimica' name but contracts are "
            "for electrical substation construction/rehabilitation. Value "
            "concentrated in 2010-2014 (97% of CFE total). Activity collapsed "
            "after 2015. P6 institutional capture flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 70277, "QUIMICA APOLLO", "medium", "aria_queue_t3"),
    )

    # ── Link contracts to GT ────────────────────────────────────────────
    cases_vendors = [
        (c1, 55923, 2010, 2013),
        (c2, 70277, 2010, 2019),  # Include 2019 AICM contract
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in cases_vendors:
        rows = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
            (vendor_id, yr_start, yr_end),
        ).fetchall()
        for (cid,) in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
        total_linked += len(rows)
        print(f"  Case {case_id} (v{vendor_id}): linked {len(rows)} contracts ({yr_start}-{yr_end})")

    # ── ARIA queue updates ──────────────────────────────────────────────
    # Confirmed vendors
    for vid in [55923, 70277]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendor
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: legitimate medical equipment distributor — 20 distinct institutions over 14 years, competitive LP wins constitute majority of IMSS value (492M LP vs 279M DA). DA rate differential IMSS (56%) vs others (50%) is marginal. Gradual growth pattern, not capture.'
        WHERE vendor_id=?""",
        (43279,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v43279 CORPORATIVO MS SISTEMAS MEDICOS (legitimate medical distributor)")


if __name__ == "__main__":
    main()
