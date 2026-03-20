"""
GT Batch SS: EAPRO Construcciones IPN institutional capture (1 new case)
BORSEN and DEISY handled by QQ batch -- removed to avoid duplicates.
Skips: MULTI MARKET (legitimate ad agency), VANGENT (already in QQ skip).

Investigated 2026-03-20 from ARIA T3 queue (>=200M, pending).
"""

import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id < 843:
        print(f"ERROR: max GT case id is {max_id}, expected >= 843. Aborting.")
        sys.exit(1)

    c0 = max_id + 1  # EAPRO only

    print(f"Inserting case {c0} (max_id was {max_id})")

    # ---- CASE c0: EAPRO Construcciones - IPN Capture ----
    # v253965 | 17 contracts, 206.7M | 96% value at IPN | 2023-2025
    # RFC ECO1509021S7 (created Sep 2015), first contract 2019, burst in 2023-2024
    # 2024: 165.9M at 71% DA rate. P6 institutional capture.
    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0, f"CASE-{c0}",
        "EAPRO Construcciones - IPN Institutional Capture",
        "institutional_capture", 2023, 2025, "medium", 199200000.0,
        "Construction company with 96% value concentrated at IPN. "
        "RFC created Sep 2015, activity burst 2023-2024 with 165.9M in 2024 at 71% DA. "
        "Consistent with P6 institutional capture pattern at education institution."
    ))

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, rfc_source,
         role, evidence_strength, match_method, match_confidence, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0, 253965, "EAPRO CONSTRUCCIONES SA DE CV", "ECO1509021S7",
        "primary", "medium", "aria_investigation", 0.9,
        "96% value at IPN, 64% DA at IPN, burst 2023-2025. "
        "12th largest vendor at IPN but disproportionate DA rate vs competitors."
    ))

    # BORSEN (v171645) and DEISY (v145583) handled by QQ batch -- not duplicated here

    # ---- Update aria_queue for added vendors ----
    for vid in [253965]:
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth = 1,
                review_status = 'reviewed',
                reviewer_notes = 'Added as GT case (batch SS)'
            WHERE vendor_id = ?
        """, (vid,))

    # ---- Mark skipped vendors ----
    conn.execute("""
        UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: legitimate advertising agency at Consejo de Promocion Turistica alongside Televisa, Starcom, TV Azteca. Not a capture pattern.'
        WHERE vendor_id = 183679
    """)

    conn.execute("""
        UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Vangent Mexico is subsidiary of US outsourcing firm (later General Dynamics). 3 contracts at 3 different institutions (IMSS, SAT, SEDESOL) 2008-2010. Specialized IT services, 100% SB reflects specialization not capture.'
        WHERE vendor_id = 36329
    """)

    conn.commit()

    # Verify
    for cid in [c0]:
        row = conn.execute(
            "SELECT id, case_name, confidence_level FROM ground_truth_cases WHERE id=?",
            (cid,)
        ).fetchone()
        vcount = conn.execute(
            "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?",
            (cid,)
        ).fetchone()[0]
        print(f"  Case {row[0]}: {row[1]} [{row[2]}] -> {vcount} vendor(s)")

    total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"\nGT totals: {total_cases} cases, {total_vendors} vendors")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
