"""Batch G: ARIA T3 investigation - 4 vendors, 2 ADD, 2 SKIP."""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = os.environ.get('DATABASE_PATH',
    os.path.join(os.path.dirname(__file__), '..', 'RUBLI_NORMALIZED.db'))


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=60000')

    max_id = conn.execute('SELECT MAX(id) FROM ground_truth_cases').fetchone()[0]
    print(f'Current max GT case ID: {max_id}')
    if max_id < 755:
        print(f'ERROR: max_id={max_id} < 755 -- aborting.')
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    # CASE 1: VIAJES INTERNACIONALES MONARCA (vendor 55640)
    case1_id = next_id
    print(f'\n--- Case {case1_id}: VIAJES INTERNACIONALES MONARCA (55640) ---')

    conn.execute(
        'INSERT OR IGNORE INTO ground_truth_cases'
        ' (id, case_id, case_name, case_type, year_start, year_end,'
        ' estimated_fraud_mxn, confidence_level, source_news, notes)'
        ' VALUES (?,?,?,?,?,?,?,?,?,?)',
        (case1_id, f'CASE-{case1_id}',
         'Viajes Internacionales Monarca -- Travel Services SB Capture',
         'single_bid_capture', 2011, 2025, 771_000_000.0, 'medium',
         'ARIA T3 investigation -- persistent single-bid pattern across multiple institutions',
         'Travel agency winning 467 contracts (771M MXN) with 60-83% single-bid rate every year '
         '2011-2025. IMSS top client (333M, 67.5% SB), plus dozens of research centers '
         '(COMIMSA 90% SB, Colegio de la Frontera Norte 100% SB, SCT 100% SB, IMPI 100% SB). '
         'Pattern consistent with intermediary capturing travel service tenders as sole bidder '
         'on competitive procedures across federal institutions.'))

    conn.execute(
        'INSERT OR IGNORE INTO ground_truth_vendors'
        ' (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)'
        ' VALUES (?,?,?,?,?,?)',
        (case1_id, 55640, 'VIAJES INTERNACIONALES MONARCA', 'medium', 'aria_queue',
         'SB rate 68.1% overall; IMSS 67.5% SB on 206 contracts; research centers 75-100% SB'))

    conn.execute(
        'UPDATE aria_queue SET in_ground_truth=1, review_status=?, reviewer_notes=? WHERE vendor_id=55640',
        ('reviewed', 'ADD: GT case -- persistent SB capture at IMSS + research centers'))

    print(f'  Inserted case {case1_id} + vendor 55640')
    # CASE 2: DIBITER (vendor 13287)
    case2_id = next_id + 1
    print(f'\n--- Case {case2_id}: DIBITER (13287) ---')

    conn.execute(
        'INSERT OR IGNORE INTO ground_truth_cases'
        ' (id, case_id, case_name, case_type, year_start, year_end,'
        ' estimated_fraud_mxn, confidence_level, source_news, notes)'
        ' VALUES (?,?,?,?,?,?,?,?,?,?)',
        (case2_id, f'CASE-{case2_id}',
         'DIBITER -- IMSS/ISSSTE Pharma DA Concentration',
         'direct_award_capture', 2011, 2020, 4_200_000_000.0, 'medium',
         'ARIA T3 investigation -- IMSS pharma vendor with escalating DA dependency',
         'Medical supplies vendor, 705 contracts totaling 4.56B MXN. IMSS dominant (3.51B, 77%) '
         'with 43.8% DA rate, ISSSTE second (702M). DA rate escalated from 0% (2003-2008) to '
         '50-63% (2011-2016) to 82-93% (2019-2020). Avg risk score 0.417 with 238 critical-level '
         'contracts (2.34B MXN). Activity ceased after 2020. Pattern consistent with IMSS pharma '
         'DA saturation -- vendor initially competitive, then increasingly awarded directly.'))

    conn.execute(
        'INSERT OR IGNORE INTO ground_truth_vendors'
        ' (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)'
        ' VALUES (?,?,?,?,?,?)',
        (case2_id, 13287, 'DIBITER, S.A. DE C.V.', 'medium', 'aria_queue',
         'IMSS 77% of value (3.51B), DA rate escalating 0%->93% over 2003-2020; avg risk 0.417'))

    conn.execute(
        'UPDATE aria_queue SET in_ground_truth=1, review_status=?, reviewer_notes=? WHERE vendor_id=13287',
        ('reviewed', 'ADD: GT case -- IMSS/ISSSTE pharma DA concentration, escalating DA dependency'))

    print(f'  Inserted case {case2_id} + vendor 13287')
    # SKIP: QUIMAE (vendor 2402)
    print('\n--- SKIP: QUIMAE (vendor 2402) ---')
    conn.execute(
        'UPDATE aria_queue SET review_status=?, reviewer_notes=? WHERE vendor_id=2402',
        ('reviewed',
         'SKIP: Structural energy sector chemical supplier. Only 61 contracts, '
         '91% at CFE via LP. SB rate 50.9% within normal for specialized chemicals. '
         'Inactive since 2017. Not institutional capture.'))
    print('  Marked as reviewed/skip')

    # SKIP: CRYOINFRA (vendor 8657)
    print('\n--- SKIP: CRYOINFRA (vendor 8657) ---')
    conn.execute(
        'UPDATE aria_queue SET review_status=?, reviewer_notes=? WHERE vendor_id=8657',
        ('reviewed',
         'SKIP: Structural industrial/medical gas supplier. PEMEX 87% of value (3.22B) '
         'via LP. Industrial gas market has natural monopoly characteristics. '
         'SB reflects limited qualified suppliers, not procurement capture.'))
    print('  Marked as reviewed/skip')

    # Commit and verify
    conn.commit()

    for cid in [case1_id, case2_id]:
        row = conn.execute(
            'SELECT id, case_name, confidence_level FROM ground_truth_cases WHERE id=?',
            (cid,)).fetchone()
        if row:
            print(f'\n  VERIFIED case {row[0]}: {row[1]} [{row[2]}]')
        else:
            print(f'\n  WARNING: case {cid} not found after insert!')

    for vid in [55640, 13287]:
        row = conn.execute(
            'SELECT review_status, in_ground_truth FROM aria_queue WHERE vendor_id=?',
            (vid,)).fetchone()
        print(f'  aria_queue vendor {vid}: status={row[0]}, in_gt={row[1]}')

    for vid in [2402, 8657]:
        row = conn.execute(
            'SELECT review_status, in_ground_truth FROM aria_queue WHERE vendor_id=?',
            (vid,)).fetchone()
        print(f'  aria_queue vendor {vid}: status={row[0]}, in_gt={row[1]}')

    conn.close()
    print('\nBatch G complete: 2 cases added, 2 vendors skipped.')


if __name__ == '__main__':
    main()
