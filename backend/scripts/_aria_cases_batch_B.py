"""
ARIA Investigation Batch B: 5 vendors investigated.
Dispositions: 1 confirmed_corrupt, 1 false_positive, 3 needs_review.
Run: cd backend && python scripts/_aria_cases_batch_B.py
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3, json
from pathlib import Path

DB = Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'
DATA = Path(__file__).parent / '_batch_B_aria_data.json'

conn = sqlite3.connect(str(DB))
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('PRAGMA busy_timeout=60000')

with open(DATA, 'r', encoding='utf-8') as f:
    payload = json.load(f)

gt_cases = payload['gt_cases']
aria_updates = payload['aria_updates']

# Get next case ID
row = conn.execute('SELECT MAX(id) FROM ground_truth_cases').fetchone()
next_id = (row[0] or 0) + 1
print(f'Starting from case ID {next_id}')

# Insert GT cases
for i, c in enumerate(gt_cases):
    cid = f'CASE-{next_id + i:04d}'
    c['cid'] = cid
    conn.execute(
        'INSERT OR REPLACE INTO ground_truth_cases '
        '(id, case_id, case_name, case_type, confidence_level, sector, notes, estimated_fraud_mxn, year_start, year_end) '
        'VALUES (?,?,?,?,?,?,?,?,?,?)',
        (next_id + i, cid, c['name'], c['type'], c['conf'], c['sector'],
         c['notes'], c['fraud'], c['ys'], c['ye']))
    vid = c['vid']
    nm = c['name']
    print(f'  Inserted GT case {cid}: {nm}')

# Insert GT vendors
for c in gt_cases:
    conn.execute(
        'INSERT OR IGNORE INTO ground_truth_vendors '
        '(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) '
        'VALUES (?,?,?,?,?)',
        (c['cid'], c['vid'], c['vname'], c['ev'], 'aria_investigation'))
    vid = c['vid']
    print(f'  Inserted GT vendor v={vid}')

# Tag contracts for GT cases
tagged = 0
for c in gt_cases:
    rows = conn.execute('SELECT id FROM contracts WHERE vendor_id = ?', (c['vid'],)).fetchall()
    for row in rows:
        conn.execute(
            'INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)',
            (c['cid'], row[0]))
        tagged += 1
print(f'  Tagged {tagged} contracts')

# Update ARIA queue for GT cases
for c in gt_cases:
    conn.execute(
        'UPDATE aria_queue SET in_ground_truth=1, review_status=?, memo_text=? WHERE vendor_id=?',
        (c['disposition'], c.get('memo', ''), c['vid']))
    vid = c['vid']
    disp = c['disposition']
    print(f'  ARIA v={vid}: {disp}')

# Update ARIA queue for non-GT vendors
for u in aria_updates:
    conn.execute(
        'UPDATE aria_queue SET review_status=?, memo_text=? WHERE vendor_id=?',
        (u['disposition'], u.get('memo', ''), u['vid']))
    vid = u['vid']
    disp = u['disposition']
    if u.get('fp_patent_exception'):
        conn.execute('UPDATE aria_queue SET fp_patent_exception=1 WHERE vendor_id=?', (vid,))
        print(f'  ARIA v={vid}: {disp} + fp_patent_exception')
    elif u.get('new_vendor_risk_fix') is not None:
        nv = u['new_vendor_risk_fix']
        conn.execute('UPDATE aria_queue SET new_vendor_risk=? WHERE vendor_id=?', (nv, vid))
        print(f'  ARIA v={vid}: {disp} + new_vendor_risk={nv}')
    else:
        print(f'  ARIA v={vid}: {disp}')

conn.commit()
print('Committed.')

# Verify
print('--- VERIFICATION ---')
for vid in [277243, 313628, 294526, 259101, 239570]:
    r = conn.execute(
        'SELECT vendor_id, review_status, fp_patent_exception, in_ground_truth, new_vendor_risk '
        'FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if r:
        print(f'  v={r[0]}: status={r[1]}, fp_patent={r[2]}, gt={r[3]}, new_v={r[4]}')

r = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()
print(f'Total GT cases: {r[0]}')
r = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()
print(f'Total GT vendors: {r[0]}')

conn.close()
print('Done.')