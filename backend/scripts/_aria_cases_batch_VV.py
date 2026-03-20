"""
Batch VV: ARIA T3 vendor investigation results
Vendors investigated: v44244, v2428, v2264, v28430
Result: ALL 4 are structural skips (legitimate specialized/multinational vendors)

Run: cd backend && python scripts/_aria_cases_batch_VV.py
"""
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    # Guard: ensure we have expected GT state
    max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    assert max_id >= 851, f"Expected max_id >= 851, got {max_id}"

    skips = [
        (44244, "SKIP: Prolec-GE joint venture (Xignux+GE), one of world's largest power transformer manufacturers. "
                "100% CFE but 8% DA, 25% SB. Multiple name variants + competitors in transformer market. "
                "Legitimate structural concentration in specialized heavy equipment."),
        (2428,  "SKIP: Hydromechanical equipment manufacturer (turbines, gates for hydroelectric plants). "
                "93% CFE value but serves Luz y Fuerza, PEMEX, state water systems too. "
                "45% SB reflects limited competition in niche industrial equipment, not capture. DA only 28%."),
        (2264,  "SKIP: Regional electrical contractor in Baja California serving CFE. "
                "84% value at CFE, 54% DA reflects small maintenance/emergency contracts (avg <1M each). "
                "DA rate rose post-2010 consistent with shift to maintenance work. Total only 243M over 15 years."),
        (28430, "SKIP: Indra Sistemas (Spain) multinational, 40K+ employees, Madrid stock exchange. "
                "Only 2 contracts: 299M SRE (passport/consular IT systems) + 5.6M SEGOB. "
                "100% SB but legitimate global IT/defense provider. Structural multinational."),
    ]

    updated = 0
    for vendor_id, notes in skips:
        cur.execute("""
            UPDATE aria_queue
            SET review_status = 'reviewed',
                reviewer_name = 'claude-gt-agent',
                reviewer_notes = ?,
                reviewed_at = datetime('now')
            WHERE vendor_id = ?
              AND review_status = 'pending'
        """, (notes, vendor_id))
        if cur.rowcount > 0:
            updated += 1
            print(f"  SKIP v{vendor_id}: marked as reviewed")
        else:
            print(f"  v{vendor_id}: already reviewed or not found")

    conn.commit()
    conn.close()
    print(f"\nDone. Updated {updated} vendors as structural skips.")

if __name__ == "__main__":
    main()
