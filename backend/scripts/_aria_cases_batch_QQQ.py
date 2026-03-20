#!/usr/bin/env python3
"""
GT Mining Batch QQQ — ARIA T3 education-sector investigation (4 vendors)

Investigated 2026-03-20:
  v46338   LA CRONICA DIARIA, S.A. DE C.V.                      -> SKIP (government media/PNCE vendor, 100% DA across 75 institutions, dispersed not captured)
  v43542   EDUTELSA                                              -> SKIP (education/military tech vendor, 84% competitive, normal SB rate for specialized services)
  v20976   TELECOMUNICACIONES VG Y ASOCIADOS, S.A. DE C.V.       -> SKIP (telecom vendor IPN specialist, 77% competitive, 36% SB consistent with technical contracts)
  v43625   INGENIERIA Y DESARROLLO DE PROYECTOS DIDACTICOS      -> SKIP (legitimate education engineering vendor, 92% competitive at SEP, minimal DA)

Cases added: 0  |  Vendors skipped: 4
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 888:
        print(f"ERROR: max_id={max_id}, expected >= 888. Aborting.")
        conn.close()
        return

    print(f"Max GT case id: {max_id}")
    print("\n=== SKIPPING 4 VENDORS (NO CASES ADDED) ===\n")

    skip_vendors = [
        (46338, "LA CRONICA DIARIA, S.A. DE C.V.", "Government PNCE media vendor, 100% DA dispersed across 75 institutions (not captured, legitimate government advertising)"),
        (43542, "EDUTELSA", "Education/military tech vendor, 84.3% competitive, 23.5% SB normal for specialized services, dispersed across 45 institutions"),
        (20976, "TELECOMUNICACIONES VG Y ASOCIADOS, S.A. DE C.V.", "Telecom specialist at IPN, 77.3% competitive, 36.4% SB consistent with technical contracts, no concentration"),
        (43625, "INGENIERIA Y DESARROLLO DE PROYECTOS DIDACTICOS", "Legitimate education engineering vendor concentrated at SEP (0% DA), 92.2% competitive, minimal fraud signal"),
    ]

    for vendor_id, vendor_name, notes in skip_vendors:
        print(f"Skipping v{vendor_id}: {vendor_name}")
        print(f"  Reason: {notes}\n")

        # Update aria_queue to mark as skipped (reviewed, but not a GT case)
        conn.execute(
            """UPDATE aria_queue
            SET review_status = 'skipped',
                in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = ?""",
            (notes, vendor_id)
        )

    conn.commit()

    print(f"\nTotal skipped: {len(skip_vendors)}")
    print("All vendors marked as reviewed (review_status='skipped', in_ground_truth=0)")

    conn.close()


if __name__ == "__main__":
    main()
