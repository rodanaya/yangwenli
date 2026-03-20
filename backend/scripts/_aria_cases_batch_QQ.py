"""
GT Batch QQ: Cases 844-846 from T3 ARIA mining session (Mar 20, 2026)
Vendors: GRUPO BORSEN, DESPENSAS Y PROVISIONES, DEISY LIZZETH REYES PACHECO
Skip: VANGENT MEXICO (legitimate US multinational IT outsourcing)

Run: cd backend && python scripts/_aria_cases_batch_QQ.py
"""
import sqlite3
import os

DB = os.path.join(os.path.dirname(__file__), '..', 'RUBLI_NORMALIZED.db')

def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    assert max_id >= 843, f"Expected max_id >= 843, got {max_id} -- DB may be stale"

    c0 = max_id + 1  # 844: GRUPO BORSEN CDMX Obras capture
    c1 = max_id + 2  # 845: DESPENSAS Y PROVISIONES state food supply
    c2 = max_id + 3  # 846: DEISY LIZZETH natural person CFE

    cases = [
        # (id, case_id_str, name, type, confidence, notes, fraud_est, yr_start, yr_end)
        (c0, f'CASE-{c0}',
         'GRUPO BORSEN CDMX Obras Capture',
         'institutional_capture',
         'medium',
         'Construction company 100% concentrated at CDMX Secretaria de Obras y Servicios 2015-2018. '
         '987M single contract via restricted tender (Invitacion a Cuando Menos 3 Personas). '
         '57% single-bid rate. Post-earthquake reconstruction period. '
         'P3 intermediary pattern, institutional capture at single CDMX agency.',
         1064600000, 2015, 2018),

        (c1, f'CASE-{c1}',
         'DESPENSAS y Provisiones State Food Supply SB',
         'single_bid_capture',
         'medium',
         'Food supply company winning 925M across Coahuila and Guerrero state finance secretariats. '
         '100% single-bid on all 3 contracts (public tender with no competition). '
         'Classic food-basket distribution capture pattern at state level. '
         'Avg risk score 0.406 (high). No RFC, no EFOS match.',
         924500000, 2016, 2018),

        (c2, f'CASE-{c2}',
         'DEISY LIZZETH Natural Person CFE Direct Award',
         'ghost_company',
         'medium',
         'Natural person (persona fisica) receiving 401M direct award from CFE in 2014. '
         'Additional 3 tiny contracts (0.3-0.43M) at CFE/ISSSTE. '
         'Extreme value disparity (401M vs 0.3M avg on other contracts). '
         '75% concentrated at CFE. Natural person with 400M+ DA is classic shell/front pattern.',
         402600000, 2014, 2017),
    ]

    vendors = [
        # (case_id_int, vendor_id, vendor_name, evidence, method)
        (c0, 171645, 'GRUPO BORSEN SA DE CV',
         'medium', 'aria_queue'),
        (c1, 183288, 'DESPENSAS Y PROVISIONES DE ALIMENTOS SA DE CV',
         'medium', 'aria_queue'),
        (c2, 145583, 'DEISY LIZZETH REYES PACHECO',
         'medium', 'aria_queue'),
    ]

    # Insert cases
    for case in cases:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes,
             estimated_fraud_mxn, year_start, year_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, case)
        print(f"  Case {case[0]}: {case[2]}")

    # Insert vendors
    for v in vendors:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)
        """, v)
        print(f"  Vendor {v[1]}: {v[2]}")

    # Update aria_queue for added vendors
    for v in vendors:
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth = 1,
                review_status = 'reviewed',
                reviewer_notes = 'GT batch QQ - added as case'
            WHERE vendor_id = ?
        """, (v[1],))

    # Mark VANGENT as skip (legitimate multinational)
    conn.execute("""
        UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Vangent is a legitimate US IT outsourcing multinational (acquired by General Dynamics 2011). 3 contracts across 3 institutions via public tender. SB reflects specialized IT market, not capture.'
        WHERE vendor_id = 36329
    """)
    print("  Skip v36329: VANGENT MEXICO (legitimate multinational)")

    conn.commit()

    # Verify
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    gt_count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    vendor_count = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"\nDone. Cases: {gt_count} (max_id={new_max}), Vendors: {vendor_count}")

    conn.close()

if __name__ == '__main__':
    main()
