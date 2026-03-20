#!/usr/bin/env python3
"""
GT Mining Batch EEE1 -- ARIA T3 single vendor investigation

Investigated 2026-03-20:
  v27749   MEDICAL RECOVERY SA DE CV   -> SKIP (dispersed, 38.3% top-inst, no capture pattern)

Cases added: 0  |  Vendors skipped: 1
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 911:
        print(f"ERROR: max_id={max_id}, expected >= 911. Aborting.")
        conn.close()
        return

    print(f"Max GT case id: {max_id}")
    print("No new cases to insert (vendor 27749 SKIPPED)")

    # -- SKIP: v27749 -- Medical Recovery SA DE CV ------
    # Medical recovery equipment supplier, Salud sector
    # Top institution: IMSS with 77.4% of value (1.18B of 1.53B)
    # DA rate at IMSS: only 47.6% (below 50% capture threshold)
    # Sectors: 95% Salud, 1.3% Energia, 2.7% Defensa (off-sector contracts minor)
    # Active: 2013-2025, 1016 contracts
    # Assessment: Legitimate concentrated distributor, NOT institutional capture.
    # The vendor serves IMSS heavily but IMSS itself does not award via DA for this vendor.
    # ISSSTE is secondary (0.14B, 279 contracts, 81.4% DA) but small relative to IMSS.
    # Does NOT meet IMSS Ring Pattern: require topInst >60% AND DA>50% at that institution.
    # Only first condition met (77.4% > 60%). Second condition NOT met (47.6% < 50%).

    # Mark as reviewed in aria_queue
    conn.execute(
        "UPDATE aria_queue SET review_status=?, reviewer_notes=? "
        "WHERE vendor_id=?",
        (
            "skipped",
            "Legitimate medical recovery distributor. Top inst (IMSS) 77.4%, but DA=47.6% indicates "
            "competitive procurement at IMSS. No institutional capture pattern detected. "
            "Diversified across multiple sectors (Salud 95%, Energia 1.3%, Defensa 2.7%).",
            27749,
        ),
    )

    conn.commit()
    print("aria_queue updated: v27749 marked as reviewed/skipped")
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
