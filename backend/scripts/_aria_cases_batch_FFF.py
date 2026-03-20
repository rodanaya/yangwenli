#!/usr/bin/env python3
"""
Ground Truth Mining Batch FFF
Vendors: OPERADORA CICSA, ICA CONSTRUCTORA
Decision: Both SKIP (structural FP - legitimate specialized infrastructure contractors)
"""

import os
import sys
import sqlite3
from datetime import datetime

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

def main():
    """Process batch FFF: CICSA and ICA CONSTRUCTORA."""
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    cur = conn.cursor()
    
    print("=" * 80)
    print("BATCH FFF: ARIA CASES MINING")
    print("Date:", datetime.now().isoformat())
    print("=" * 80)
    
    # Verify max GT ID
    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0]
    print(f"\nCurrent max GT case ID: {max_id}")
    
    if max_id is None or max_id < 879:
        print("ERROR: max_id < 879. Aborting to prevent ID collision.")
        conn.close()
        sys.exit(1)
    
    vendors_to_skip = [
        {
            "vendor_id": 36961,
            "vendor_name": "OPERADORA CICSA, S.A DE C.V.",
            "reason": "SKIP: Legitimate infrastructure conglomerate. ICA group subsidiary winning mega-projects (airport terminal, trains). 69% SB rate is structural for specialized construction. Real company doing real infrastructure.",
        },
        {
            "vendor_id": 258499,
            "vendor_name": "ICA CONSTRUCTORA SA DE CV",
            "reason": "SKIP: Legitimate specialized construction firm (ICA group). RFC ICO170407UI6 registered. Winning major infrastructure contracts (Tren Saltillo-Nuevo Laredo, Presa Tunal II). 57-100% SB by sector is expected for specialized projects.",
        }
    ]
    
    print("\nProcessing skip decisions...")
    
    for vendor in vendors_to_skip:
        vendor_id = vendor["vendor_id"]
        vendor_name = vendor["vendor_name"]
        reason = vendor["reason"]
        
        print(f"\n  Vendor {vendor_id}: {vendor_name}")
        print(f"    Decision: {reason}")
        
        # Update aria_queue to mark as skipped
        cur.execute("""
            UPDATE aria_queue
            SET review_status = 'skipped',
                in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = ?
        """, (reason, vendor_id))
        
        rows_updated = cur.rowcount
        if rows_updated > 0:
            print(f"    Updated aria_queue: {rows_updated} row(s)")
        else:
            print(f"    WARNING: No aria_queue entry found for vendor_id {vendor_id}")
    
    conn.commit()
    
    print("\n" + "=" * 80)
    print("BATCH FFF COMPLETE")
    print("Total vendors processed: 2")
    print("Skipped (structural FP): 2")
    print("Added to GT: 0")
    print("=" * 80)
    
    conn.close()

if __name__ == "__main__":
    main()
