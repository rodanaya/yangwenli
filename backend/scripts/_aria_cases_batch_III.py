#!/usr/bin/env python3
"""
Ground truth case insertion: batch III
Vendors investigated: HOSPITALES ANGELES, Interconecta, CONSORCIO ADPER, ALESTRA
Result: 1 case added (CONSORCIO ADPER), 3 skipped

Author: Ground Truth Analyst (Yang Wen-li ARIA v1.1)
Date: 2026-03-20
"""

import os
import sys
import sqlite3
from pathlib import Path

# Output encoding for Spanish text
sys.stdout.reconfigure(encoding="utf-8")

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

def main():
    """Insert ground truth cases from batch III investigation."""
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA synchronous=NORMAL")
    c = conn.cursor()
    
    try:
        # Safety check: verify max case ID
        c.execute("SELECT MAX(id) FROM ground_truth_cases")
        max_id = c.fetchone()[0]
        if max_id is None:
            max_id = 0
        
        print(f"[INFO] Current max case ID: {max_id}")
        
        # Guard: cases 880-881 were just inserted by batch HHH
        if max_id < 881:
            print("[ERROR] Safety check failed: max_id < 881")
            print("[ERROR] batch HHH may not have completed. Aborting.")
            conn.close()
            return 1
        
        # Next case ID
        c0 = max_id + 1
        print(f"[INFO] Starting from case ID: {c0}")
        
        # ===== CASE 882: CONSORCIO ADPER (v128027) - INTERMEDIARY PATTERN =====
        print("\n[CASE 882] CONSORCIO EMPRESARIAL ADPER SA DE CV (Infrastructure Intermediary)")
        
        c.execute("""
        INSERT OR IGNORE INTO ground_truth_cases 
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c0,
            f"CASE-{c0}",
            "CONSORCIO EMPRESARIAL ADPER - Infrastructure Intermediary Network",
            "intermediary",
            "medium",
            2014,
            2018,
            "P3 Intermediary pattern (ARIA flagged). Extreme concentration in 2015: 2 mega-contracts (Banco Ahorro 1.68B, AICM 625M). Ultra-sparse activity (8 contracts over 5 years). Consortium structure masks underlying vendors. Infrastructure/financial projects suggest middleman role. Fraud period aligns with sexenio start (Pena Nieto 2012-2018).",
            2500000000
        ))
        
        # Link vendors to case
        c.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
        """, (
            c0,
            128027,
            "CONSORCIO EMPRESARIAL ADPER SA DE CV",
            "high",
            "exact_vendor_id"
        ))
        
        # Update ARIA queue: mark as GT and confirmed
        c.execute("""
        UPDATE aria_queue 
        SET in_ground_truth=1, review_status='confirmed'
        WHERE vendor_id=128027
        """)
        
        print(f"  -> Inserted case {c0} (CONSORCIO ADPER)")
        print(f"  -> Linked vendor 128027")
        print(f"  -> Updated ARIA queue")
        
        # ===== SKIP: HOSPITALES ANGELES (v46145) =====
        print("\n[SKIP] HOSPITALES ANGELES (v46145)")
        print("  Reason: Legitimate healthcare contractor")
        print("  Evidence: 445 contracts at IMSS (50.6% DA) + ISSSTE (60.5% DA)")
        print("  Pattern: Referral contracts for private hospital treatment of IMSS beneficiaries")
        print("  Verdict: No institutional capture, distributed 2010-2025, normal healthcare procurement")
        
        c.execute("""
        UPDATE aria_queue 
        SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
        WHERE vendor_id=46145
        """, (
            "Legitimate healthcare contractor: Grupo Angeles operates Mexico's largest private hospital network. Contracts represent IMSS/ISSSTE referrals for specialized treatment. No capture pattern detected.",
        ))
        
        # ===== SKIP: Interconecta (v111122) =====
        print("\n[SKIP] Interconecta (v111122)")
        print("  Reason: Dispersed across institutions, no capture pattern")
        print("  Evidence: 46 contracts, highly scattered (PROSPERA, @prende, CNCE, INAPEC)")
        print("  Pattern: IT/software services with erratic temporal activity (2013, 2017-2018)")
        print("  Verdict: Dispersion is protective signal, no concentrated DA abuse")
        
        c.execute("""
        UPDATE aria_queue 
        SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
        WHERE vendor_id=111122
        """, (
            "Dispersed IT services vendor across 12+ institutions over 12 years. No institutional concentration. Erratic temporal pattern (2013 burst, 2014-2015 quiet, 2017-2018 return). High risk score driven by diversity metrics, not concentration.",
        ))
        
        # ===== SKIP: ALESTRA (v3387) =====
        print("\n[SKIP] ALESTRA (v3387)")
        print("  Reason: Legitimate telecom services vendor")
        print("  Evidence: 450 contracts at SAT (telecom procurement), historical 2002-2018")
        print("  Pattern: AT&T subsidiary, distributed across multiple institutions")
        print("  Verdict: Established vendor, declining activity (not capture), normal telecom services")
        
        c.execute("""
        UPDATE aria_queue 
        SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
        WHERE vendor_id=3387
        """, (
            "Legitimate telecom services: AT&T Mexico subsidiary. Primary customer = SAT. Contracts span 2002-2018 (established vendor). Heavy 2008 activity (1.2B) reflects government IT modernization. Declining 2011-2018 trend indicates completion/contract end. Multiple institutions, normal telecom distribution.",
        ))
        
        # Commit transaction
        conn.commit()
        
        print("\n" + "="*80)
        print("[SUCCESS] Batch III complete")
        print(f"  Cases inserted: 1 (CONSORCIO ADPER)")
        print(f"  Cases skipped: 3 (HOSPITALES ANGELES, Interconecta, ALESTRA)")
        print("="*80)
        
        return 0
        
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        conn.rollback()
        return 1
        
    finally:
        conn.close()

if __name__ == "__main__":
    sys.exit(main())
