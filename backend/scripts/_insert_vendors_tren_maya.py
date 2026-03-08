"""Add vendor matches to Case 21 (Tren Maya) and related cases."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
today = '2026-03-08T00:00:00'

case_id = 'TREN_MAYA_FONATUR_DIRECT_AWARDS'

tren_maya_vendors = [
    # (vendor_id, vendor_name, rfc, role, evidence_strength, notes)
    (267922, 'DESARROLLO DEL SURESTE PLAYA DEL CARMEN TULUM S DE RL DE CV', None, 'primary', 'medium',
     '15,358M MXN | 1 contract | FONATUR | DA=0% (licitacion but restricted consortium) | Tren Maya Tramo PDC-Tulum | risk=1.000'),
    (261595, 'CONSORCIO LAMAT TRAMO 1 SAPI DE CV', 'CLT200422A59', 'primary', 'medium',
     '13,395M MXN | 1 contract | FONATUR | Tren Maya Tramo 1 | risk=0.960'),
    (262680, 'AZVINDI FERROVIARIO SA DE CV', None, 'primary', 'medium',
     '11,063M MXN | 2 contracts | FONATUR | Tren Maya ferroviario section | risk=1.000'),
    (139711, 'ALSTOM TRANSPORT MEXICO SA DE CV', None, 'secondary', 'medium',
     '31,520M MXN FONATUR | 2c | Tren Maya rolling stock (legitimate supplier, elevated by concentration) | risk=1.000'),
    (277750, 'MOTA-ENGIL MEXICO SAPI DE CV', None, 'secondary', 'medium',
     '4,024M MXN | 1 contract FONATUR | Tren Maya contractor | DA=100% | risk=1.000'),
]

for vid, vname, rfc, role, strength, notes in tren_maya_vendors:
    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id,vendor_id,vendor_name_source,rfc_source,role,evidence_strength,match_method,match_confidence,notes,created_at)
        VALUES (?,?,?,?,?,?,'vendor_match','high',?,?)""",
        (case_id, vid, vname, rfc, role, strength, notes, today))

    # Add contracts
    cids = [r[0] for r in conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vid,)).fetchall()]
    for cid in cids:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts
            (case_id,contract_id,evidence_strength,match_method,match_confidence,created_at)
            VALUES (?,?,'medium','vendor_match','high',?)""", (case_id, cid, today))
    print(f'  vid={vid} {vname[:40]}: {len(cids)} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
