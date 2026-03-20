#!/usr/bin/env python3
"""
Batch GT case insertion: v6829 (PRODUCTOS STANTON)

Investigation Summary:
======================
Vendor: PRODUCTOS STANTON, S.A. DE C.V. (v6829)
- Total: 2.66B MXN across 631 contracts (2002-2025)
- IMSS concentration: 66.0% of value, 499 of 631 contracts
- Direct award rate: 72.4% (peak 2017-2023)
- Single bid rate: 7.9%
- Pattern: Institutional capture at IMSS health procurement
- Fraud window: 2017-2023 (high DA concentration + IMSS peak)

Decision: ADD as institutional_capture case
Confidence: high
Estimated fraud value: ~1.26B MXN (1.75B IMSS value × 72.4% DA exposure)

Key Evidence:
- 499 IMSS contracts concentrated with 72.4% direct award rate
- Peak activity 2020-2022 (post-COVID emergency procurements)
- DA rate 72.4% significantly above sector baseline for medical supplies
- Long vendor history (2002-2025) but pattern concentrated in 2017-2023

Structural Considerations:
- IMSS legitimately sources medical/pharmaceutical supplies
- Single supplier for some items is normal (patents, certifications)
- However 72.4% DA rate across 500+ contracts suggests capture
- Not ruled out as FP due to institutional concentration >70% + DA >70% criteria

Expected Model Detection: HIGH
- v6.4 model should flag 85%+ of IMSS contracts as high/critical
- price_volatility + institution_diversity features drive detection
- IMSS is major federal health institution (legitimate large buyer)
"""

import sqlite3
import sys
import os
sys.stdout.reconfigure(encoding="utf-8")
from datetime import datetime

# Constants
DB_PATH = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
CASE_ID_START = None  # Will be set dynamically

def get_max_case_id(conn):
    """Get the highest case_id from ground_truth_cases."""
    cursor = conn.execute("SELECT MAX(id) FROM ground_truth_cases")
    result = cursor.fetchone()
    return result[0] if result[0] is not None else 0

def insert_case_stanton(conn):
    """Insert PRODUCTOS STANTON case and related vendor records."""
    
    # Get next case ID
    max_id = get_max_case_id(conn)
    if max_id is None or max_id < 890:
        print(f"ERROR: max_id={max_id} is below safety threshold (890)")
        return False
    
    case_id = max_id + 1
    case_id_str = f"CASE-{case_id}"
    vendor_id = 6829
    
    print(f"Inserting case {case_id_str} for vendor {vendor_id}")
    print(f"  Case type: institutional_capture")
    print(f"  Confidence: high")
    print(f"  Fraud period: 2017-2023")
    
    try:
        # Insert into ground_truth_cases
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level,
             year_start, year_end, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id,
            case_id_str,
            "PRODUCTOS STANTON — IMSS Medical Supply Institutional Capture (2017-2023)",
            "institutional_capture",
            "high",
            2017,
            2023,
            ("Pharmaceutical/medical distributor with 66% IMSS concentration and 72.4% direct award rate "
             "across 631 contracts. Peak capture period 2017-2023 with highest DA concentration. "
             "Evidence of institutional capture through direct awards to single supplier."),
            1260000000  # 1.26B MXN estimated (1.75B IMSS × 72.4% DA exposure)
        ))
        
        # Insert vendor record
        vendor_name = "PRODUCTOS STANTON, S.A. DE C.V."
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)
        """, (
            case_id,
            vendor_id,
            vendor_name,
            "high",
            "RFC_exact_match"
        ))
        
        # Insert contracts into ground_truth_contracts (IMSS institutional capture window)
        # Query all IMSS contracts from 2017-2023 for this vendor
        cursor = conn.execute("""
            SELECT c.id
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = ?
            AND i.name LIKE '%INSTITUTO MEXICANO DEL SEGURO SOCIAL%'
            AND c.contract_year >= 2017
            AND c.contract_year <= 2023
        """, (vendor_id,))
        
        contract_ids = [row[0] for row in cursor.fetchall()]
        print(f"  Inserting {len(contract_ids)} IMSS contracts (2017-2023)")
        
        for contract_id in contract_ids:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts
                (case_id, contract_id)
                VALUES (?, ?)
            """, (case_id, contract_id))
        
        # Update aria_queue to mark vendor as in_ground_truth
        conn.execute("""
            UPDATE aria_queue
            SET in_ground_truth = 1, review_status = 'confirmed'
            WHERE vendor_id = ?
        """, (vendor_id,))
        
        conn.commit()
        print(f"OK Case {case_id_str} inserted successfully")
        print(f"  Vendor {vendor_id} marked as in_ground_truth")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"ERROR inserting case: {e}")
        return False

def skip_vendors(conn):
    """Mark excluded vendors as skipped with reasoning."""
    
    skipped = [
        (2278, "Utility meter manufacturer (CFE exclusive service). "
               "Structural monopoly due to technical certification requirements. "
               "Not procurement fraud pattern."),
        (8218, "Maritime services to PEMEX oil exploration. "
               "Specialized energy infrastructure work. Structural PEMEX service dependency. "
               "Data is old (2002-2008) and vendor likely defunct."),
        (793, "SEMEX animal breeding genetics supplier. "
              "Legitimate biological commodity monopoly with limited suppliers. "
              "High single-bid rate reflects specialized genetics product (patent-protected). "
              "Not procurement fraud pattern.")
    ]
    
    for vendor_id, reason in skipped:
        try:
            conn.execute("""
                UPDATE aria_queue
                SET review_status = 'skipped',
                    in_ground_truth = 0,
                    reviewer_notes = ?
                WHERE vendor_id = ?
            """, (reason, vendor_id))
            conn.commit()
            print(f"OK Vendor {vendor_id} marked as skipped")
        except Exception as e:
            print(f"ERROR skipping vendor {vendor_id}: {e}")
            conn.rollback()

def main():
    """Main entry point."""
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        
        # Verify max_id safety threshold
        max_id = get_max_case_id(conn)
        if max_id is None or max_id < 890:
            print(f"ERROR: max_id={max_id} below minimum (890)")
            print("Aborting to prevent case ID collision.")
            return False
        
        print(f"Starting batch UUU — max case ID in DB: {max_id}")
        print()
        
        # Insert the single GT case
        success = insert_case_stanton(conn)
        if not success:
            return False
        
        print()
        
        # Mark other vendors as skipped
        skip_vendors(conn)
        
        print()
        print("Batch UUU complete — 1 case inserted, 3 vendors skipped")
        return True
        
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
