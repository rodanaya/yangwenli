#!/usr/bin/env python3
"""
Ground Truth Batch RR: 4 vendors from T3 ARIA mining session (Mar 20, 2026)

Cases:
  c0: ARTIMEDICA SA DE CV - IMSS capture (DA 0% -> 87-98% post-2013)
  c1: D&P MEXICO SERVICIOS DIGITALES - Intermediary shell (221M DA, vanished 2016)
  c2: COMERCIALIZADORA DICLINSA SA DE CV - IMSS ring (84% DA at IMSS, 28% elsewhere)
  c3: INGENIA AG SAS DE CV - Ghost company stepping-stone (created 2019, 284M single-bid LP 2024)

Decisions:
  ADD: v5256 (ARTIMEDICA), v177420 (D&P MEXICO), v104127 (DICLINSA), v256543 (INGENIA AG)
  SKIP: none
"""

import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    # Guard: max_id must be >= 843
    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0
    if max_id < 843:
        print(f"ERROR: max GT case id = {max_id}, expected >= 843. Aborting.")
        sys.exit(1)

    c0 = max_id + 1
    c1 = max_id + 2
    c2 = max_id + 3
    c3 = max_id + 4

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c0}-{c3}")

    # ── Cases ──────────────────────────────────────────────────────────
    cases = [
        (c0, f"CASE-{c0}", "ARTIMEDICA IMSS Capture",
         "institutional_capture", 2013, 2025, 623_300_000,
         "medium",
         "ARTIMEDICA SA DE CV: 1320 contracts at IMSS worth 623M MXN. "
         "DA rate at IMSS jumped from 0% (2002-2009) to 87-98% (2013-2025). "
         "Non-IMSS DA is only 23% across 31 institutions. "
         "Classic institution-specific capture pattern. Medical instruments and hemodynamics."),

        (c1, f"CASE-{c1}", "D&P Mexico PROSPERA Intermediary Shell",
         "intermediary_shell", 2016, 2016, 221_000_000,
         "medium",
         "D&P MEXICO SERVICIOS DIGITALES SA DE CV: 3 contracts in 2016, all DA, 221M total. "
         "172M to Coordinacion PROSPERA, 36.6M Secretaria de Bienestar, 12.6M UAZ. "
         "Company appeared, received 221M in direct awards, then disappeared. "
         "ARIA: is_disappeared=1, burst_score=0.69, P3 intermediary pattern."),

        (c2, f"CASE-{c2}", "DICLINSA IMSS Pharma Ring",
         "institutional_capture", 2018, 2025, 206_600_000,
         "medium",
         "COMERCIALIZADORA DICLINSA SA DE CV: 160 contracts at IMSS, 84% DA, 206.6M MXN. "
         "Non-IMSS: 32 contracts at 28% DA (262M via competitive procedures at SSA, CENSIDA). "
         "Known pharma distributor competing legitimately elsewhere but captured at IMSS. "
         "Pattern began ~2018 with concentrated DA for material de curacion and meds."),

        (c3, f"CASE-{c3}", "INGENIA AG Ghost Stepping-Stone",
         "ghost_company", 2020, 2024, 287_000_000,
         "medium",
         "INGENIA AG SAS DE CV (RFC IAG190308FH0): Created Mar 2019. "
         "87 micro-contracts at IMSS (2.4M total, 90% DA) for curacion materials (2020-2024). "
         "Then won 284M in hospital equipment at Hidalgo in 2024 via LP -- but both LPs were "
         "single-bid (1 vendor each). New company building credentials via micro-DA, "
         "then winning large single-bid LPs. Ghost stepping-stone pattern."),
    ]

    for c in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, c)

    # ── Vendors ────────────────────────────────────────────────────────
    vendors = [
        # case_id (int FK), vendor_id, vendor_name_source, rfc_source,
        # role, evidence_strength, match_method, match_confidence, notes
        (c0, 5256, "ARTIMEDICA  S.A. DE C.V.", None,
         "primary_beneficiary", "medium", "aria_queue", 1.0,
         "1320 contracts at IMSS, DA jumped to 87-98% from 2013"),

        (c1, 177420, "D&P MEXICO SERVICIOS DIGITALES SA DE CV", None,
         "shell_company", "medium", "aria_queue", 1.0,
         "3 contracts 2016 only, 221M DA, then disappeared"),

        (c2, 104127, "COMERCIALIZADORA DICLINSA SA DE CV", None,
         "primary_beneficiary", "medium", "aria_queue", 1.0,
         "160 IMSS contracts at 84% DA vs 28% DA elsewhere"),

        (c3, 256543, "INGENIA AG SAS DE CV", "IAG190308FH0",
         "ghost_company", "medium", "aria_queue", 1.0,
         "Created 2019, micro-DA at IMSS, then 284M single-bid LP at Hidalgo"),
    ]

    for v in vendors:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, rfc_source,
             role, evidence_strength, match_method, match_confidence, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, v)

    # ── Update aria_queue ──────────────────────────────────────────────
    for vid in [5256, 177420, 104127, 256543]:
        cur.execute("""
            UPDATE aria_queue
            SET in_ground_truth = 1,
                review_status = 'reviewed',
                reviewer_name = 'claude_gt_rr',
                reviewer_notes = 'Added to GT batch RR',
                reviewed_at = datetime('now')
            WHERE vendor_id = ?
        """, (vid,))

    conn.commit()

    # ── Verify ─────────────────────────────────────────────────────────
    cur.execute(f"SELECT id, case_name, confidence_level FROM ground_truth_cases WHERE id BETWEEN {c0} AND {c3}")
    rows = cur.fetchall()
    print(f"\nInserted {len(rows)} cases:")
    for r in rows:
        print(f"  {r[0]}: {r[1]} [{r[2]}]")

    cur.execute(f"SELECT case_id, vendor_id, vendor_name_source FROM ground_truth_vendors WHERE case_id BETWEEN {c0} AND {c3}")
    rows = cur.fetchall()
    print(f"\nInserted {len(rows)} vendors:")
    for r in rows:
        print(f"  case {r[0]}: v{r[1]} {r[2]}")

    cur.execute(f"SELECT vendor_id, review_status FROM aria_queue WHERE vendor_id IN (5256, 177420, 104127, 256543)")
    rows = cur.fetchall()
    print(f"\nUpdated {len(rows)} aria_queue entries:")
    for r in rows:
        print(f"  v{r[0]}: {r[1]}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
