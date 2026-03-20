#!/usr/bin/env python3
"""
Ground Truth Mining - Batch PPP
Investigation of 4 vendors: v35247 (JERB), v3580 (Maquinado), v12045 (Baher), v66692 (Corporacion)
Result: All SKIP cases (no corruption indicators found)
Session: 2026-03-20 GT analysis
"""

import sqlite3
import sys
from datetime import datetime

DB_PATH = "RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    
    # Get current max case_id
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max case_id: {max_id}")
    
    if max_id < 888:
        print("ERROR: max_id < 888. Aborting to prevent ID collision.")
        conn.close()
        sys.exit(1)
    
    # No new cases to add, only skips
    skip_vendors = [
        {
            "vendor_id": 35247,
            "vendor_name": "DISTRIBUIDORA COMPUTACIONAL JERB S.A. DE C.V.",
            "reason": "Dispersed across 20+ institutions (SCT, PRONOSTICOS, UPN, etc). No single institution dominance. 48% DA but no capture concentration. Max contract (0.14B SCT) is single-bid competitive. Lacks institutional capture pattern."
        },
        {
            "vendor_id": 3580,
            "vendor_name": "MAQUINADO DE MADERAS DIANA S.A. DE C.V.",
            "reason": "Legitimate school furniture/woodwork supplier. 0% DA rate (all 64 contracts competitive). Concentrated in CONAFE (13c 0.18B) which is expected for rural education furniture. No direct award abuse. Historical records 2002-2017 (inactive)."
        },
        {
            "vendor_id": 12045,
            "vendor_name": "GRUPO CONSTRUCTOR BAHER DE MEXICO S.A. DE C.V.",
            "reason": "Insufficient contract volume (11c total). 2 CONAGUA contracts (0.23B = 96% of total) with one single-bid competitive (0.17B) and one DA (0.06B). Only 2 contracts at one institution does not meet capture pattern threshold. Needs >=5-7 contracts for evidence."
        },
        {
            "vendor_id": 66692,
            "vendor_name": "CORPORACION DE INSTALACION Y SERVICIOS I...",
            "reason": "Highly dispersed IT installation services vendor. 224 contracts across 20+ institutions with max 31c at SAT (11% of value). No single institution dominance (max ~4-5% per institution). 32% DA, 40% SB - mixed normal pattern. No concentration signal."
        }
    ]
    
    # Mark vendors as skipped
    for vendor_info in skip_vendors:
        vid = vendor_info["vendor_id"]
        reason = vendor_info["reason"]
        
        # Update aria_queue to mark as skipped
        conn.execute(
            """UPDATE aria_queue 
               SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
               WHERE vendor_id=?""",
            (reason, vid)
        )
        print(f"SKIP v{vid}: {vendor_info['vendor_name']}")
    
    conn.commit()
    
    print(f"\n{'='*70}")
    print(f"Summary: 4 vendors marked as SKIP")
    print(f"No new GT cases added")
    print(f"{'='*70}")
    
    conn.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
