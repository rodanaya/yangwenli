#!/usr/bin/env python3
import sqlite3
import sys
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db'

VENDOR_NAMES = {
    20119: 'SOPORTE MEDICO INTEGRAL SA DE CV',
    86812: 'COSUIS CONSTRUCTORA Y SUPERVISORA SA DE CV',
    54697: 'MERP EDIFICACIONES Y TERRACERIAS SA DE CV',
    11906: 'CONSTRUCTORA ARRENDADORA Y MATERIALES SA DE CV',
}

CASE_NAMES = {
    20119: 'Soporte Medico Integral IMSS Direct Award Capture 2005-2025',
    54697: 'MERP Edificaciones SCT Single-Bid Capture 2012-2018',
    11906: 'Constructora Arrendadora SCT Single-Bid Capture 2003-2010',
}

def main():
    print("=== ARIA Cases Batch BBB1 ===")
    print("Investigating 4 vendors from T3 queue")
    print("")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('SELECT MAX(id) FROM ground_truth_cases')
        max_id = cursor.fetchone()[0]

        if max_id is None or max_id < 908:
            print("ERROR: Could not determine next case ID. Current max:", str(max_id))
            conn.close()
            return

        print("Current max case ID:", max_id)
        print("")

        case_assignments = {
            20119: ('ADD', 'institutional_capture', 'IMSS direct award abuse 2005-2025: 2212 contracts, 93.2% DA, 98.6% IMSS concentration'),
            86812: ('SKIP', None, 'Only 24 contracts, distributed institutions (57% BANOBRAS), low confidence for capture pattern'),
            54697: ('ADD', 'single_bid_capture', 'SCT single-bid ring 2012-2018: 63 contracts, 95.2% SB, 47.6% SCT concentration'),
            11906: ('ADD', 'single_bid_capture', 'SCT single-bid ring 2003-2010: 23 contracts, 100% SB, 73.9% SCT concentration'),
        }

        vendor_data = VENDOR_NAMES

        next_case_id = max_id + 1
        add_count = 0

        for vendor_id, (decision, case_type, reason) in case_assignments.items():
            vendor_name = vendor_data.get(vendor_id, 'UNKNOWN')

            if decision == 'ADD':
                case_id_int = next_case_id
                case_id_str = f'CASE-{case_id_int}'

                cursor.execute('SELECT COUNT(*) FROM contracts WHERE vendor_id = ?', (vendor_id,))
                contract_count = cursor.fetchone()[0]

                cursor.execute('SELECT SUM(amount_mxn) FROM contracts WHERE vendor_id = ?', (vendor_id,))
                total_value = cursor.fetchone()[0] or 0

                cursor.execute('SELECT MIN(contract_year), MAX(contract_year) FROM contracts WHERE vendor_id = ?', (vendor_id,))
                year_start, year_end = cursor.fetchone()

                print(f"ADD: {vendor_id} ({vendor_name})")
                print(f"  Type: {case_type}")
                print(f"  Contracts: {contract_count}, Value: {total_value:.0f} MXN")
                print(f"  Period: {year_start}-{year_end}")
                print("")

                cursor.execute("""
                INSERT OR IGNORE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    case_id_int,
                    case_id_str,
                    CASE_NAMES.get(vendor_id, vendor_name),
                    case_type,
                    'high',
                    year_start,
                    year_end,
                    reason,
                    int(total_value)
                ))

                cursor.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?, ?, ?, ?, ?)
                """, (
                    case_id_int,
                    vendor_id,
                    vendor_name,
                    'strong',
                    'rfc_match'
                ))

                cursor.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
                SELECT ?, id FROM contracts WHERE vendor_id = ?
                """, (case_id_int, vendor_id))

                cursor.execute("""
                UPDATE aria_queue
                SET in_ground_truth = 1, review_status = 'confirmed'
                WHERE vendor_id = ?
                """, (vendor_id,))

                next_case_id += 1
                add_count += 1

            elif decision == 'SKIP':
                skip_reason = reason
                print(f"SKIP: {vendor_id} ({vendor_name})")
                print(f"  Reason: {skip_reason}")
                print("")

                cursor.execute("""
                UPDATE aria_queue
                SET review_status = 'skipped', in_ground_truth = 0, reviewer_notes = ?
                WHERE vendor_id = ?
                """, (skip_reason, vendor_id))

        conn.commit()
        print(f"\nResults: {add_count} cases added, {4 - add_count} skipped")
        print("All updates committed.")

        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
