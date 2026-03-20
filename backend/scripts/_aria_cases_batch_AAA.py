#!/usr/bin/env python3
"""
ARIA Cases Batch AAA: T3 Infrastructure/Energy Investigation (4 vendors)

DECISION: All 4 vendors skipped -- structural FPs (systemic single-bid patterns).

Vendors investigated:
- v10025 CONSTRUCTORA MAYRAN DE SAN PEDRO SA DE CV (140 contracts, 4.22B MXN, 97% SB) -> SKIP: Structural
- v22738 INDUSTRIAL DE ASFALTOS Y PAVIMENTOS SA DE CV (144 contracts, 3.54B MXN, 97% SB) -> SKIP: Structural
- v8353 CONSTRUCCIONES MARITIMAS MEXICANAS SA DE CV (6 contracts, 3.96B MXN, 100% SB) -> SKIP: Structural
- v39217 ENERGIA OCCIDENTE DE MEXICO S DE RL DE CV (1 contract, 3.93B MXN, 100% SB) -> SKIP: Below min threshold

INVESTIGATION NOTES:

v10025 + v22738: Both are Coahuila-based road construction companies winning at SCT (Secretaria
de Comunicaciones y Transportes) and CAPUFE across 2002-2025. Both show ~97% single-bid rates.
However, the overall SCT/CAPUFE LP single-bid rate is 87.2% across 78,566 competitive contracts.
The top 20 road contractors at SCT ALL show ~100% SB. This is a systemic structural pattern in
Mexican federal road construction procurement, not vendor-specific capture. The two vendors share
10 overlapping institutions (SCT, CAPUFE, Coahuila state agencies, CONAGUA) but never co-bid --
could indicate regional market allocation but insufficient evidence at medium+ confidence.

v8353: Offshore marine construction at PEMEX Exploracion y Produccion, 2002-2006 only. 6 large LP
contracts (total 3.96B). PEMEX PEP has 53.5% SB rate overall in that period, and other large PEP
contractors (Halliburton, Schlumberger, Cotemar) show similar patterns. Specialized marine EPC is
a structurally concentrated market. No activity after 2006 -- project-based work.

v39217: Single 3.93B LP contract at CFE in 2009 for Adquisiciones (energy supply, not construction).
Only contract ever. Below minimum viable case threshold (need >= 3 contracts). Likely a one-off
large energy supply deal (gas or electricity purchase).
"""

import sqlite3
import sys
import os
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verify DB state
    max_id = cursor.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current MAX(ground_truth_cases.id) = {max_id}")

    if max_id < 865:
        print(f"ABORT: max_id={max_id}, expected >= 865")
        sys.exit(1)

    vendor_skip_decisions = [
        (
            10025,
            "v10025: CONSTRUCTORA MAYRAN DE SAN PEDRO SA DE CV - Structural FP. "
            "Road construction at SCT/CAPUFE, 140 contracts (4.22B MXN), 97% SB. "
            "SCT/CAPUFE has 87.2% SB rate system-wide across 78K LP contracts. "
            "All top 20 road contractors show ~100% SB. Systemic procurement "
            "pattern, not vendor-specific capture. Coahuila-based."
        ),
        (
            22738,
            "v22738: INDUSTRIAL DE ASFALTOS Y PAVIMENTOS SA DE CV - Structural FP. "
            "Asphalt/paving at SCT/CAPUFE, 144 contracts (3.54B MXN), 97% SB. "
            "Same systemic SCT/CAPUFE single-bid pattern as v10025. Both from "
            "Coahuila/La Laguna region, overlapping institutions but no co-bidding. "
            "Insufficient evidence for market allocation at medium+ confidence."
        ),
        (
            8353,
            "v8353: CONSTRUCCIONES MARITIMAS MEXICANAS SA DE CV - Structural FP. "
            "Marine construction at PEMEX E&P, 6 contracts (3.96B MXN) 2002-2006, "
            "100% SB. PEP SB rate is 53.5% in that period. Specialized offshore "
            "EPC is structurally concentrated (cf. Halliburton, Schlumberger). "
            "No activity post-2006 -- project-based marine construction."
        ),
        (
            39217,
            "v39217: ENERGIA OCCIDENTE DE MEXICO S DE RL DE CV - Below minimum "
            "viable case threshold. Single 3.93B LP contract at CFE in 2009 for "
            "Adquisiciones (energy supply). Only contract ever. Need >= 3 contracts "
            "for low confidence GT case."
        ),
    ]

    print()
    print("=" * 80)
    print("ARIA CASES BATCH AAA: UPDATE ARIA_QUEUE (all 4 skipped - structural FPs)")
    print("=" * 80)

    for vendor_id, reason in vendor_skip_decisions:
        cursor.execute(
            """UPDATE aria_queue
               SET review_status = 'skipped',
                   reviewer_notes = ?,
                   in_ground_truth = 0
               WHERE vendor_id = ?
            """,
            (reason, vendor_id),
        )
        rows = cursor.rowcount
        print(f"  v{vendor_id:5d} -> review_status='skipped' (rows updated: {rows})")

    conn.commit()

    # Verify updates
    print()
    print("Verification:")
    for vendor_id, _ in vendor_skip_decisions:
        r = cursor.execute(
            "SELECT review_status, in_ground_truth FROM aria_queue WHERE vendor_id = ?",
            (vendor_id,),
        ).fetchone()
        if r:
            print(f"  v{vendor_id}: review_status={r[0]}, in_ground_truth={r[1]}")
        else:
            print(f"  v{vendor_id}: NOT FOUND in aria_queue")

    print()
    print("Summary:")
    print(f"  Vendors investigated: 4")
    print(f"  GT cases added:       0")
    print(f"  Vendors skipped:      4 (structural FP / below threshold)")
    print(f"  Timestamp:            {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
