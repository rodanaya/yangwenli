#!/usr/bin/env python3
"""
Ground Truth Case Insertion: ARIA Queue Batch T (4 vendors)

Investigates 4 vendors flagged in ARIA queue for potential corruption:
1. v2195 - TRANSFORMADORES Y TECNOLOGIA (CFE energy, SKIP — structural monopoly)
2. v25488 - COMBUSTIBLES BAJA SUR (EXPORTADORA DE SAL, SINGLE INST, ADD — institutional capture)
3. v1527 - DEGASA (IMSS pharma, SKIP — legitimate distributor)
4. v7574 - PRODUCTOS ROLMEX (CFE/PEMEX energy, SKIP — structural monopoly)

Decision:
- v25488: ADD as case (CASE-757) — institutional_capture / single_bid_capture
  * 92.3% contracts to single institution (EXPORTADORA DE SAL)
  * 61.5% single-bid rate in competitive procedures
  * 2.9B MXN value over 20 years (1 contract in 2025: 748M MXN, anomalous)
  * Fraud period: 2019-2025 (cluster of contracts)
  * Confidence: MEDIUM (pattern match, no official finding)

- v2195, v1527, v7574: SKIP with FP classification
  * v2195: Structural energy monopoly (CFE procurement, legitimate grid equipment)
  * v1527: Legitimate pharmaceutical intermediary (DEGASA widely known)
  * v7574: Energy infrastructure (CFE/PEMEX fuel, structural)

Database state: Assumes max(id) from ground_truth_cases >= 890.
Created: 2026-03-20 | Runtime: ~5 seconds
"""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def main():
    """Execute GT insertion for v25488 (institutional_capture), skip others."""
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Safety check: ensure GT table has data
        c.execute("SELECT MAX(id) FROM ground_truth_cases")
        max_id = c.fetchone()[0]
        
        if max_id is None or max_id < 890:
            print(f"ERROR: max(ground_truth_cases.id) = {max_id}, expected >= 890")
            print("Aborting to prevent ID collision")
            return 1
        
        next_case_id = max_id + 1
        
        # =================================================================
        # CASE 757: v25488 — COMBUSTIBLES BAJA SUR (INSTITUTIONAL CAPTURE)
        # =================================================================
        
        case_id = next_case_id
        case_name = "COMBUSTIBLES BAJA SUR — EXPORTADORA DE SAL Monopoly"
        case_type = "institutional_capture"
        confidence_level = "medium"
        year_start = 2019
        year_end = 2025
        estimated_fraud = 1_100_000_000  # ~1.1B MXN of suspicious contracts (2019-2025)
        
        notes = (
            "Vendor 25488 shows strong institutional capture pattern at "
            "EXPORTADORA DE SAL (92.3% of 26 contracts). Single-bid rate 61.5% "
            "in competitive procedures. Value concentration in 2019-2025 cluster "
            "(19 of 26 contracts). Anomalous 748M spike in 2025. Pattern suggests "
            "exclusive fuel/salt distribution agreement, but single-bid behavior "
            "and institutional concentration warrant investigation. Fuel distributors "
            "often have legitimate regional monopolies, but competitive procedure "
            "single-bids indicate potential rigging."
        )
        
        c.execute(
            """
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, 
             year_start, year_end, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (case_id, f"CASE-{case_id}", case_name, case_type, 
             confidence_level, year_start, year_end, notes, estimated_fraud)
        )
        
        c.execute(
            """
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)
            """,
            (case_id, 25488, "COMBUSTIBLES BAJA SUR SA DE CV", "medium", "aria_queue_ranking")
        )
        
        # Mark contracts for this case
        c.execute(
            """
            INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            SELECT ?, id FROM contracts WHERE vendor_id = 25488
            """,
            (case_id,)
        )
        
        # Update ARIA queue
        c.execute(
            """
            UPDATE aria_queue 
            SET in_ground_truth = 1, review_status = 'confirmed', 
                reviewer_notes = ?
            WHERE vendor_id = 25488
            """,
            ("Added as GT case 757 — institutional_capture @ EXPORTADORA DE SAL",)
        )
        
        # =================================================================
        # SKIP: v2195 — Structural Energy Monopoly (CFE)
        # =================================================================
        
        c.execute(
            """
            UPDATE aria_queue 
            SET review_status = 'skipped', in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = 2195
            """,
            ("SKIP: Structural energy monopoly. 96.9% CFE, grid equipment vendor. "
             "Single-bid rate 50.7% but 9.3% DA low. Historical 2002-2017 pattern "
             "reflects CFE procurement structure, not fraud. Legitimate transformer "
             "supplier to Mexico's electrical grid.",)
        )
        
        # =================================================================
        # SKIP: v1527 — Legitimate Pharmaceutical Intermediary
        # =================================================================
        
        c.execute(
            """
            UPDATE aria_queue 
            SET review_status = 'skipped', in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = 1527
            """,
            ("SKIP: Legitimate pharmaceutical distributor. DEGASA is widely known "
             "health supply intermediary. 52.5% IMSS, 53.4% DA, 3237 contracts. "
             "Multi-sector, multi-institution pattern indicates genuine supplier. "
             "Low single-bid rate (1.5%). No concentration anomaly. Legitimately "
             "serves major health institutions.",)
        )
        
        # =================================================================
        # SKIP: v7574 — Structural Energy/Fuel Monopoly (CFE/PEMEX)
        # =================================================================
        
        c.execute(
            """
            UPDATE aria_queue 
            SET review_status = 'skipped', in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = 7574
            """,
            ("SKIP: Structural energy monopoly. 71.9% CFE + 21.9% PEMEX Refining. "
             "Single-bid rate 50%, but 12.5% DA. Fuel/chemicals supplier to Mexico's "
             "energy infrastructure (CFE grid, PEMEX refining). Pattern reflects "
             "specialized equipment/fuel procurement, not fraud. Historical 2002-2022, "
             "with concentration in 2012-2014 major contracts (likely infrastructure "
             "projects).",)
        )
        
        conn.commit()
        print(f"[OK] Inserted GT case {case_id}: COMBUSTIBLES BAJA SUR")
        print(f"[OK] Skipped v2195 (structural CFE monopoly)")
        print(f"[OK] Skipped v1527 (legitimate pharma distributor)")
        print(f"[OK] Skipped v7574 (structural energy monopoly)")
        print(f"[OK] Updated ARIA queue for 4 vendors")
        return 0
        
    except Exception as e:
        print(f"ERROR: {e}")
        conn.rollback()
        return 1
    finally:
        conn.close()

if __name__ == "__main__":
    sys.exit(main())
