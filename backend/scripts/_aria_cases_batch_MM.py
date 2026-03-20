#!/usr/bin/env python3
"""
GT Mining Batch MM - ARIA T3 investigation (4 vendors: PRODESA, FOJA, DIAGNOQUIM, ULTRASIST)

Investigated 2026-03-20:
  v22992   PRODESA                 -> SKIP (9 contracts, 100% SB but insufficient concentration/value)
  v28510   FOJA INGENIEROS         -> ADD (case 885: single_bid_capture, 53c/1.34B, 98% SB)
  v5678    DIAGNOQUIM              -> SKIP (426 contracts, IMSS pharmaceutical supplier, legitimate)
  v17136   ULTRASIST               -> SKIP (26 contracts, too dispersed across 17 institutions)

Cases added: 1  |  Vendors skipped: 3
"""
import sqlite3
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 884:
        print(f"ERROR: max_id={max_id}, expected >= 884. Aborting.")
        conn.close()
        return

    c0 = max_id + 1

    # ========== CASE 1: FOJA INGENIEROS (v28510) ==========
    print(f"Adding case {c0}: FOJA INGENIEROS (single_bid_capture)")

    conn.execute(
        """
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, 
         year_start, year_end, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            c0,
            f"CASE-{c0}",
            "FOJA INGENIEROS Construction Contracts - Single-Bid Capture",
            "single_bid_capture",
            "high",
            2006,
            2020,
            800_000_000,
            "Construction engineering firm (FOJA INGENIEROS) with 98% single-bid rate across 53 contracts (1.34B MXN) spanning 12 institutions. Legitimate construction firms should have 30-50% SB rates. Nearly all contracts awarded through competitive procedures with only 1 bidder (impossibly no competition). Concentrated in 2006-2020 window. Likely indicates systematic capture of infrastructure procurement at multiple agencies (SCT, CONAGUA, state water boards).",
        ),
    )

    # Add vendor reference for FOJA INGENIEROS
    conn.execute(
        """
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            c0,
            28510,
            "FOJA INGENIEROS CONSTRUCTORES, S.A. DE C.V.",
            "strong",
            "vendor_id_direct_match",
        ),
    )

    # Mark vendor as in ground truth
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?",
        (28510,),
    )

    conn.commit()
    print(f"Case {c0} inserted successfully.")
    print(f"Vendors added to ground truth: 1")
    print(f"Vendors skipped: 3 (v22992 PRODESA, v5678 DIAGNOQUIM, v17136 ULTRASIST)")
    conn.close()


if __name__ == "__main__":
    main()
