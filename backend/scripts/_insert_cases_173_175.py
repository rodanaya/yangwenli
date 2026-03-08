import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

# ── Case definitions ───────────────────────────────────────────────────────────

CASES = [
    {
        'case_id':            'FARMACOS_ESP_CENSIDA_HIV_DA_2350M',
        'case_name':          'Farmacos Especializados CENSIDA HIV Drug Direct Award Monopoly 2.35B',
        'case_type':          'procurement_fraud',
        'year_start':         2010,
        'year_end':           2013,
        'estimated_fraud_mxn': 2350000000,
        'confidence_level':   'medium',
        'notes': (
            'Farmacos Especializados SA de CV (VID=506, sin RFC) received 2.35B MXN across 9 contracts '
            'from CENSIDA (Centro Nacional para la Prevención y Control del VIH y el SIDA) — ALL via '
            'adjudicación directa (100% DA rate to CENSIDA). Largest contracts: 621M DA (2012-04-17), '
            '528M DA (2011-06-06), 450M DA (2010-07-15), 450M DA (2010-10-25), 130M DA (2011-04-29). '
            'The same vendor legitimately supplies IMSS (767c, 3.71B, only 2% DA) and ISSSTE (62c, 3.53B, 8% DA) '
            'via Licitación — confirming FARMACOS ESP is an established pharmaceutical distributor. '
            'The anomaly is CENSIDA: antiretroviral drugs (ARVs) for HIV treatment are high-cost '
            '(thousands USD/patient/year) and should be competitively procured. Mexico has documented '
            'problems with ARV overpricing and distribution irregularities at CENSIDA. 100% DA to a '
            'single distributor for 2.35B in ARV supply without competitive bidding is inconsistent '
            'with LAASSP requirements. FARMACOS ESP also supplies PEMEX Corporativo (216c, 0.96B, 79% DA '
            '— another DA-heavy relationship) and SEDENA (3c, 0.69B, 0% LP). Total vendor value: 12.42B MXN '
            'across 1,399 contracts (2002-2019). Note: separate from GRUPO FARMACOS ESPECIALIZADOS '
            '(VID=29277, 133.36B, already in GT as confirmed_corrupt) — likely related entities. '
            'Medium confidence: DA pattern is clear, but ARV procurement legitimately uses DA for '
            'sole-source patented drugs in some cases. Requires cross-check with SAT EFOS and CENSIDA '
            'procurement records.'
        ),
        'vendor_id':          506,
    },
    {
        'case_id':            'COMERCIALIZADORA_MILENIO_SCT_2014_2015',
        'case_name':          'Comercializadora Milenio SCT Concentrated Procurement 13.97B (2014-2015)',
        'case_type':          'procurement_fraud',
        'year_start':         2014,
        'year_end':           2015,
        'estimated_fraud_mxn': 2000000000,
        'confidence_level':   'low',
        'notes': (
            'Comercializadora Milenio SA de CV (VID=57548, sin RFC) received 13.97B MXN in 39 contracts, '
            'concentrated in 2014-2015 at Secretaría de Comunicaciones y Transportes (SCT): 27 contracts '
            'totaling 13.56B MXN (97% of total). Largest contracts: 3,401M LP (2015-05-19), 1,965M LP '
            '(2014-10-16), 1,072M DA (2015-11-30), 472M LP (x2, 2015-11). Pattern: Multiple LP and DA '
            'contracts to a "comercializadora" (trading company) rather than a specialized contractor, '
            'concentrated in a 2-year window. A trading company receiving 13.56B from SCT '
            '(infrastructure/communications ministry) in 2014-2015 without contract descriptions in '
            'COMPRANET is unusual. The 1.07B DA in November 2015 alongside same-period LP contracts '
            'could indicate threshold-splitting behavior. No RFC registered. LOW confidence: LP contracts '
            'are technically competitive, descriptions unavailable in COMPRANET data (Structure B), and '
            'there may be legitimate explanations for SCT using a trading company as distributor for road '
            'equipment or materials. Document for monitoring; cross-reference with SCT audit records and '
            'investigative press for Comercializadora Milenio SCT.'
        ),
        'vendor_id':          57548,
    },
    {
        'case_id':            'EFECTIVALE_VOUCHER_PREDECESSOR_MONOPOLY_15B',
        'case_name':          'Efectivale SA de CV Government Voucher Predecessor Monopoly 15.25B (2002-2010)',
        'case_type':          'procurement_fraud',
        'year_start':         2002,
        'year_end':           2010,
        'estimated_fraud_mxn': 15250000000,
        'confidence_level':   'medium',
        'notes': (
            'Efectivale SA de CV (VID=64, sin RFC) received 15.25B MXN in 1,151 contracts at 0% direct '
            'award from government agencies in 2002-2010, exclusively via Licitación Pública. Key '
            'contracts: ISSSTE 5,448M LP (2008-12-18), PROFECO 1,076M LP (2008-05-02), Policía Federal '
            '356M LP (2009-12-31), PFP 338M LP (2008-12-30), Estado de México Finanzas 317M LP '
            '(2008-12-17). Efectivale (a brand owned by Edenred/predecessor of Ticket Restaurant Mexico) '
            'is the chronological predecessor to the modern government meal/benefit voucher monopoly '
            'documented in RUBLI GT as Case 15 (Edenred/SI VALE/TOKA ecosystem). Efectivale dominated '
            'the 2002-2010 government social benefit voucher market — the same institutional monopoly '
            'continued under different brand names (Efectivale → SI VALE MEXICO → EDENRED MEXICO → TOKA '
            'INTERNACIONAL). Pattern: While individual contracts are via LP (technically competitive), '
            'ISSSTE paid a single 5.4B LP contract to Efectivale in December 2008 — the largest known '
            'ISSSTE benefit voucher single contract. The 0%DA indicates the COMPRANET data shows '
            'competitive procedures, but the sustained market capture (1,151 contracts over 9 years to '
            'one vendor) reflects the same institutional capture pattern. Medium confidence: The LP '
            'procedures indicate formal competition, but the scale suggests barriers to entry. The '
            'Efectivale entity is part of the same documented voucher monopoly ecosystem as EDENRED '
            '(GT Case 15, GT Case related to Edenred Government Voucher Monopoly).'
        ),
        'vendor_id':          64,
    },
]

# ── Introspect schema: does ground_truth_cases use TEXT or INT for pk? ─────────

def get_cases_pk_col(conn):
    """Return the rowid/pk column name for ground_truth_cases."""
    cur = conn.execute("PRAGMA table_info(ground_truth_cases)")
    cols = {row[1]: row[2] for row in cur.fetchall()}
    # Prefer explicit integer pk named 'id'; fall back to rowid
    if 'id' in cols:
        return 'id'
    return 'rowid'


def get_vendor_pk_col(conn):
    cur = conn.execute("PRAGMA table_info(ground_truth_vendors)")
    cols = {row[1]: row[2] for row in cur.fetchall()}
    if 'id' in cols:
        return 'id'
    return 'rowid'


pk_cases = get_cases_pk_col(conn)

# ── Insert cases ───────────────────────────────────────────────────────────────

print('Inserting ground truth cases...')
for case in CASES:
    conn.execute(
        '''INSERT OR IGNORE INTO ground_truth_cases
           (case_id, case_name, case_type, year_start, year_end,
            estimated_fraud_mxn, confidence_level, notes, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        (
            case['case_id'],
            case['case_name'],
            case['case_type'],
            case['year_start'],
            case['year_end'],
            case['estimated_fraud_mxn'],
            case['confidence_level'],
            case['notes'],
            now,
        ),
    )
    row = conn.execute(
        f'SELECT {pk_cases} FROM ground_truth_cases WHERE case_id=?',
        (case['case_id'],),
    ).fetchone()
    case['_db_id'] = row[0]
    print(f"  Case {case['_db_id']:>5}: {case['case_name'][:60]}")

conn.commit()

# ── Insert vendors ─────────────────────────────────────────────────────────────

print('\nInserting ground truth vendors...')
for case in CASES:
    db_case_id = case['_db_id']
    vendor_id  = case['vendor_id']

    # Look up vendor name from vendors table
    vrow = conn.execute(
        'SELECT name FROM vendors WHERE id=?', (vendor_id,)
    ).fetchone()
    vendor_name_source = vrow[0] if vrow else f'VID_{vendor_id}'

    conn.execute(
        '''INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, rfc_source,
            role, evidence_strength, match_method, match_confidence, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        (
            db_case_id,
            vendor_id,
            vendor_name_source,
            None,          # rfc_source — no RFC for these vendors
            'primary',
            case['confidence_level'],
            'vendor_id_direct',
            0.9 if case['confidence_level'] == 'medium' else 0.7,
            now,
        ),
    )
    print(f"  Vendor {vendor_id}: {vendor_name_source[:55]}")

conn.commit()

# ── Link contracts ─────────────────────────────────────────────────────────────

print('\nLinking contracts...')

# Check if ground_truth_contracts table exists
gtc_exists = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ground_truth_contracts'"
).fetchone()

if gtc_exists:
    for case in CASES:
        db_case_id = case['_db_id']
        vendor_id  = case['vendor_id']

        # Fetch all contract IDs for this vendor
        contract_rows = conn.execute(
            'SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)
        ).fetchall()
        contract_ids = [r[0] for r in contract_rows]

        inserted = 0
        for cid in contract_ids:
            try:
                conn.execute(
                    'INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)',
                    (db_case_id, cid),
                )
                inserted += 1
            except sqlite3.IntegrityError:
                pass

        conn.commit()
        print(f"  VID={vendor_id}: linked {inserted}/{len(contract_ids)} contracts to case {db_case_id}")
else:
    print('  ground_truth_contracts table not found — skipping contract linking')

# ── FP data error fixes ────────────────────────────────────────────────────────

print('\nFlagging data-error vendors in aria_queue...')

aria_exists = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='aria_queue'"
).fetchone()

if aria_exists:
    # Check fp_data_error column exists
    cur = conn.execute("PRAGMA table_info(aria_queue)")
    aria_cols = [row[1] for row in cur.fetchall()]

    if 'fp_data_error' in aria_cols:
        r1 = conn.execute(
            'UPDATE aria_queue SET fp_data_error=1 WHERE vendor_id=8447'
        )
        r2 = conn.execute(
            'UPDATE aria_queue SET fp_data_error=1 WHERE vendor_id=5985'
        )
        conn.commit()
        print(f'  VID=8447 (NALCO): {r1.rowcount} row(s) updated — fp_data_error=1')
        print(f'  VID=5985 (SERVICIO TRANSPORTE): {r2.rowcount} row(s) updated — fp_data_error=1')
    else:
        print('  fp_data_error column not found in aria_queue — skipping FP flags')
else:
    print('  aria_queue table not found — skipping FP flags')

# ── Summary ────────────────────────────────────────────────────────────────────

total_cases     = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors   = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]

if gtc_exists:
    total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
else:
    total_contracts = 0

conn.close()
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
