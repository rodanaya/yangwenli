"""
Ground Truth Batch UU: Cases 852-854
ARIA T3 P6 pharma/capture vendors

v192928 ESPECIALISTAS EN FARMACOS DEL NORTE - IMSS DA capture 2021+
v40425  FARMACEUTICA ALTHOS - ISSSTE DA capture 2015-2022
v4360   INTERBIOL - CNEGSR/CENAPRECE DA capture 2019-2020
v5787   SERVICIOS Y SISTEMAS IMPRESOS - SKIP (legitimate printer)

Run: cd backend && python scripts/_aria_cases_batch_UU.py
"""

import sqlite3
import sys
import os

DB = os.path.join(os.path.dirname(__file__), '..', 'RUBLI_NORMALIZED.db')

def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    # Guard: check max ID
    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0
    if max_id < 851:
        print(f"ERROR: max GT case ID is {max_id}, expected >= 851. Aborting.")
        sys.exit(1)

    c0 = max_id + 1  # 852
    c1 = c0 + 1      # 853
    c2 = c1 + 1      # 854

    print(f"Inserting cases {c0}-{c2} (3 cases, 3 vendors)")

    # ── Case c0: ESPECIALISTAS EN FARMACOS DEL NORTE - IMSS DA capture ──
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0, f'CASE-{c0}',
        'Especialistas en Farmacos del Norte - IMSS DA Capture',
        'institutional_capture',
        'medium',
        2021, 2025,
        'Pharma vendor won IMSS contracts competitively 2016-2019 (LP, 0% DA). '
        'In 2021 shifted to 137 small DA contracts at IMSS (94% DA). '
        '220 of 273 total contracts at IMSS (80%), 92% DA at IMSS. '
        'Outside IMSS wins competitively: SEDENA 0% DA, ISSSTE 50% DA. '
        'Classic post-2020 IMSS DA capture pattern. Fraud period scoped to DA regime 2021-2025.'
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (c0, 192928, 'ESPECIALISTAS EN FARMACOS DEL NORTE SA DE CV', 'medium', 'aria_investigation'))

    # ── Case c1: FARMACEUTICA ALTHOS - ISSSTE DA capture ──
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c1, f'CASE-{c1}',
        'Farmaceutica Althos - ISSSTE DA Capture',
        'institutional_capture',
        'medium',
        2015, 2022,
        'Pharma vendor with 855 contracts at ISSSTE (81% of total), 86% DA at ISSSTE. '
        'DA rate jumped from 18-40% (2009-2014) to 88-93% (2015-2020), clear regime shift. '
        'Outside ISSSTE wins competitively: SEDENA 25% DA, Sec Salud 11% DA. '
        '41 total institutions but ISSSTE dominates by volume. '
        'Classic ISSSTE DA capture during 2015-2022 period.'
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (c1, 40425, 'FARMACEUTICA ALTHOS, S.A. DE C.V.', 'medium', 'aria_investigation'))

    # ── Case c2: INTERBIOL - CNEGSR/CENAPRECE DA capture ──
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c2, f'CASE-{c2}',
        'Interbiol - CNEGSR/CENAPRECE DA Capture',
        'institutional_capture',
        'medium',
        2019, 2020,
        'Pharma vendor with 450 LP contracts at IMSS (16% DA, legitimate competitive supplier 2002-2022). '
        'In 2019-2020 received 604M MXN via 100% DA at CNEGSR (364M) and CENAPRECE (240M). '
        'Largest single DA: 315.8M at CNEGSR in 2020. '
        'A company winning ~15M/year competitively at IMSS suddenly gets 604M via DA at smaller agencies in 2 years. '
        'Classic institution-specific capture. Fraud period scoped to 2019-2020 DA spike.'
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (c2, 4360, 'INTERBIOL, S.A. DE C.V.', 'medium', 'aria_investigation'))

    # ── Update aria_queue: mark added vendors ──
    for vid in [192928, 40425, 4360]:
        cur.execute("UPDATE aria_queue SET in_ground_truth = 1, review_status = 'reviewed' WHERE vendor_id = ?", (vid,))

    # ── SKIP: v5787 SERVICIOS Y SISTEMAS IMPRESOS ──
    cur.execute("""
        UPDATE aria_queue SET review_status = 'reviewed',
        reviewer_notes = 'SKIP: Legitimate specialized printing vendor. 99%% value at IMSS but only 15%% DA (mostly LP/competitive). Name indicates printing services - structural concentration by niche, not capture. 5%% SB not conclusive.'
        WHERE vendor_id = 5787
    """)

    conn.commit()

    # Verify
    cur.execute("SELECT id, case_name, confidence_level, year_start, year_end FROM ground_truth_cases WHERE id >= ?", (c0,))
    for row in cur.fetchall():
        print(f"  Case {row[0]}: {row[1]} [{row[2]}] {row[3]}-{row[4]}")

    cur.execute("SELECT case_id, vendor_id, vendor_name_source FROM ground_truth_vendors WHERE case_id >= ?", (c0,))
    for row in cur.fetchall():
        print(f"  Vendor: case={row[0]}, vid={row[1]}, name={row[2]}")

    cur.execute("SELECT vendor_id, review_status, reviewer_notes FROM aria_queue WHERE vendor_id = 5787")
    row = cur.fetchone()
    print(f"  SKIP: v{row[0]} -> {row[1]}, notes={row[2][:80]}")

    conn.close()
    print(f"\nDone. Inserted {c2 - c0 + 1} cases, 3 vendors. Skipped v5787.")

if __name__ == '__main__':
    main()
