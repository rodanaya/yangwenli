#!/usr/bin/env python3
"""
GT Batch EEE: Infrastructure road contractors — all structural FPs

Investigated 2026-03-20 against SCT/CAPUFE baseline (87.2% system-wide SB):
  v10148 OBRAS Y PAVIMENTOS FERHEC SA DE CV        -- SKIP: 84.4% SCT/CAPUFE, baseline
  v9952  RIVERA Y RIVERA SA DE CV                  -- SKIP: 87.4% SCT/CAPUFE, at baseline
  v10268 CAMINOS Y DESARROLLOS URBANOS SA DE CV    -- SKIP: 97.9% SCT/CAPUFE, pure road
  v10174 CONSTRUCTORA SANTOS CHISUM SA DE CV       -- SKIP: 91.6% SCT/CAPUFE, baseline

Cases added: 0  |  Vendors skipped: 4 (structural FP)

REASONING: Prior investigation (batch AAA) established SCT/CAPUFE has 87.2% SB rate
system-wide across 78,566 LP contracts. All top 20 road contractors show ~100% SB.
High SB at SCT is structural, not vendor-specific capture. None of these vendors show
anomalous patterns beyond the SCT/CAPUFE baseline.

Run: cd backend && python scripts/_aria_cases_batch_EEE.py
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
    if max_id is None or max_id < 877:
        print(f"ERROR: max_id={max_id}, expected >= 877. Aborting.")
        conn.close()
        return

    print(f"Max GT case id: {max_id}")
    print("Batch EEE: all 4 road contractors are structural FPs (SCT/CAPUFE baseline)\n")

    skip_decisions = [
        (
            10148,
            "SKIP: OBRAS Y PAVIMENTOS FERHEC SA DE CV. 103 contracts, 3.156B MXN, 99% SB. "
            "84.4% concentrated at SCT/CAPUFE. SCT system-wide SB baseline is 87.2% across "
            "78,566 LP contracts -- all top road contractors show ~100% SB. No anomalous "
            "pattern beyond structural SCT/CAPUFE procurement. Structural FP."
        ),
        (
            9952,
            "SKIP: RIVERA Y RIVERA SA DE CV. 198 contracts, 2.629B MXN, 97% SB. "
            "87.4% SCT/CAPUFE (exactly at system baseline). Has 23 Zacatecas contracts "
            "(2013-2016) but only 2.6% of total value (69M MXN). Fresnillo municipality "
            "divides work among 200+ vendors -- no market dominance. Pattern consistent "
            "with local political networking, not corruption. Structural FP."
        ),
        (
            10268,
            "SKIP: CAMINOS Y DESARROLLOS URBANOS SA DE CV. 137 contracts, 2.643B MXN, 97% SB. "
            "97.9% SCT/CAPUFE -- near-pure SCT road contractor. Only 4 non-SCT contracts (2.1%), "
            "none suspicious. Structural SCT/CAPUFE procurement pattern. Structural FP."
        ),
        (
            10174,
            "SKIP: CONSTRUCTORA SANTOS CHISUM SA DE CV. 191 contracts, 2.466B MXN, 92% SB. "
            "91.6% SCT/CAPUFE baseline. Minimal non-SCT diversification. Pattern within "
            "structural SCT/CAPUFE SB norm. Structural FP."
        ),
    ]

    for vendor_id, reason in skip_decisions:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', reviewer_notes=?, "
            "in_ground_truth=0 WHERE vendor_id=?",
            (reason, vendor_id),
        )
        print(f"  v{vendor_id} -> skipped (SCT/CAPUFE structural FP)")

    conn.commit()
    conn.close()

    print("\nDone. 4 vendors marked as structural FP skips. 0 GT cases added.")


if __name__ == "__main__":
    main()
