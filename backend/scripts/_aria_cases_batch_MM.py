#!/usr/bin/env python3
"""
Ground Truth Insertion Script: Batch MM
Vendors: v42990 (COMERLAT), v35501 (LA CIMA), v53089 (MEXTYPSA), v10229 (CANTERAS)
Decision: All 4 SKIPPED - legitimate infrastructure/materials suppliers
Status: Not added to ground truth
"""

import sys
import sqlite3
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DATABASE_PATH = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"

def main():
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Query max case id to ensure proper sequencing
        c.execute("SELECT MAX(id) as max_id FROM ground_truth_cases")
        result = c.fetchone()
        max_id = result['max_id'] if result and result['max_id'] else 0
        
        if max_id is None or max_id < 901:
            print("ERROR: Could not get valid ground_truth_cases max_id")
            return
        
        print(f"Ground truth state: {max_id} cases exist")
        print()
        
        # Decision decisions for all 4 vendors
        vendors_to_skip = [
            {
                'vendor_id': 42990,
                'vendor_name': 'COMERLAT SA DE CV',
                'reason': 'Legitimate pharmaceutical/medical distributor. High DA (86.7%) and concentration at IMSS/ISSSTE (96.2%) is normal for health sector suppliers. Risk score 0.068. No corruption indicators.'
            },
            {
                'vendor_id': 35501,
                'vendor_name': 'LA CIMA TERRACEROS SA DE CV',
                'reason': 'Specialized infrastructure contractor (earth-moving). 100% single-bid rate in competitive procedures is normal for specialized services. All contracts via SCT for highway work. Risk score 0.173.'
            },
            {
                'vendor_id': 53089,
                'vendor_name': 'MEXTYPSA SA DE CV',
                'reason': 'Infrastructure specialist with high single-bid rate (87.5%) in competitive procedures. 62.5% concentrated at SCT but multi-year, multi-project pattern. Risk score 0.128.'
            },
            {
                'vendor_id': 10229,
                'vendor_name': 'CANTERAS PENINSULARES SA DE CV',
                'reason': 'Construction materials supplier (quarries/gravel). 87.8% single-bid rate but distributed across multiple state institutions and regions (not concentrated at one institution). No concentration signal. Inactive since 2023. Risk score 0.171.'
            }
        ]
        
        # Update aria_queue to mark as reviewed/skipped
        for vendor in vendors_to_skip:
            vid = vendor['vendor_id']
            vname = vendor['vendor_name']
            reason = vendor['reason']
            
            c.execute("""
                UPDATE aria_queue
                SET review_status = 'skipped',
                    in_ground_truth = 0,
                    reviewer_notes = ?
                WHERE vendor_id = ?
            """, (reason, vid))
            
            print(f"SKIP: v{vid} {vname}")
            print(f"  Reason: {reason}")
            print()
        
        conn.commit()
        print(f"Completed: All 4 vendors marked as skipped in aria_queue")
        print(f"No ground truth cases added (all are legitimate suppliers)")
        
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise


if __name__ == '__main__':
    main()
