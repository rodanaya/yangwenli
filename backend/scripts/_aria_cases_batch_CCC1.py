#!/usr/bin/env python3
import sys
import sqlite3
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"

def main():
    print("")
    print("=" * 80)
    print("ARIA GT Batch CCC1: Vendor Investigation & GT Insertion")
    print("=" * 80)
    print("")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT MAX(id) FROM ground_truth_cases")
        max_id_row = cursor.fetchone()
        max_id = max_id_row[0] if max_id_row[0] is not None else 0

        if max_id is None or max_id < 908:
            print("ERROR: ground_truth_cases table appears corrupted or empty.")
            print(f"  Current max(id): {max_id}")
            print("  Expected: >= 908 (as of Mar 19, 2026)")
            conn.close()
            return

        print(f"Current max ground_truth_cases.id: {max_id}")
        print("")

        vendors_to_skip = [
            (309930, "OXIDROGENO SA DE CV", "Only 2 contracts, insufficient evidence. Industrial gas supplier to IMSS (specialized/legitimate sector)."),
            (40393, "PRODUCTOS E INSUMOS PARA LA SALUD SA DE CV", "Established pharmaceutical/health distributor across 10+ institutions. 443 contracts, 1.4% SB rate, diversified. Legitimate multinational supplier."),
            (10831, "INDUSTRIAL DE CONSTRUCCIONES MEXICANAS SA DE CV", "Construction vendor 2002-2020 (inactive). 100% SB but across 8 institutions (SCT, highways, states), 0% DA. Regional specialist in competitive market."),
            (8190, "CONSTRUCCION Y SERVICIOS INTEGRALES SIGMA SA DE CV", "Infrastructure vendor 2002-2008 (old/inactive). 97.7% SB but highly dispersed: PEMEX 29.5%, SCT, CFE, state entities. Below GT concentration threshold (40%+). Competitive procedures.")
        ]

        print("INVESTIGATION RESULTS:")
        print("")

        for vendor_id, vendor_name, reason in vendors_to_skip:
            print(f"VENDOR {vendor_id}: {vendor_name}")
            print(f"  Decision: SKIP")
            print(f"  Reason: {reason}")
            print("")

        print("")
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Vendors to INSERT: 0")
        print(f"Vendors to SKIP: 4")
        print("")
        print("Rationale:")
        print("  - v309930: Insufficient data (2 contracts only)")
        print("  - v40393: Legitimate established distributor, diversified institutions")
        print("  - v10831: Old inactive vendor, dispersed SB across 8 institutions")
        print("  - v8190: Old inactive vendor, dispersed SB + low top-inst concentration")
        print("")
        print("All four vendors lack the concentrated+single-institution pattern needed")
        print("to meet GT ADD criteria (topInst>60% + DA>50% OR SB>70% + topInst>40%).")
        print("Most have old contract histories (2002-2017 range) and are likely")
        print("legitimate regional specialists in their sectors.")
        print("")

        for vendor_id, vendor_name, reason in vendors_to_skip:
            cursor.execute(
                "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
                (reason, vendor_id)
            )
            print("SKIPPED v" + str(vendor_id) + " in aria_queue")

        conn.commit()
        print("")
        print("All 4 vendors marked skipped in aria_queue. Committed.")

        conn.close()
        print("=" * 80)
        print("BATCH CCC1 COMPLETE: No insertions. All 4 vendors SKIPPED.")
        print("=" * 80)
        print("")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.close()
        sys.exit(1)

if __name__ == "__main__":
    main()
