"""Write ARIA investigation memos for GT cases 202-207."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    (31377, 'EQUIMED DEL CENTRO — IMSS Pharma Ring 69.7%DA (6.03B)',
     'IMSS pharma distributor ring member. 109 IMSS contracts 2007-2015 at 69.7%DA (4.40B). '
     'Simultaneously LP-clean at ISSSTE (3.9%DA, 1.63B) — confirms IMSS-specific institutional '
     'capture. No RFC. This is the definitive dual-institution IMSS ring signal: high DA at '
     'IMSS, competitive LP at ISSSTE, same vendor, same period. '
     'RECOMMENDED ACTION: Cross-check IMSS Delegaciones receiving Equimed contracts 2007-2015; '
     'ASF Cuenta Publica 2010-2015 IMSS supply audits.'),

    (101951, 'DISTRIBUIDORA QUIMICA Y HOSPITALARIA GAP — IMSS Lab Chemicals 72.2%DA (1.33B)',
     'IMSS lab reagents ring member. 18 contracts 2013-2020 at 72.2%DA (1.14B) for '
     'PCR reagents, lab consumables (Group 379), chemical products. '
     'Simultaneous operation with Vanquish (Case 192, 92.8%DA IMSS) and Comercializadora '
     'Reactivos (Case 193, 85.6%DA IMSS) — three distributors with 72-93%DA at IMSS '
     'for lab reagents confirms coordinated supply ring. No RFC. '
     'RECOMMENDED ACTION: Verify PCR reagent contract quantities vs IMSS lab throughput '
     '(inflated quantities = overpricing mechanism).'),

    (149783, 'LABORATORIOS SOLFRAN — IMSS/ISSSTE Consolidated Medicines DA 55.6% (2.77B)',
     'IMSS/ISSSTE medicine ring member. 9 IMSS contracts 2015-2025 at 55.6%DA (1.86B) '
     'for consolidated medicines (Groups 010/030). SSISSSTE 60%DA (0.40B). '
     'Dual-institution capture at IMSS+ISSSTE simultaneously. '
     'LP-clean at Coahuila state (0%DA, 0.30B) confirms no market monopoly. No RFC. '
     'RECOMMENDED ACTION: Verify IMSS AA-050GYR034-E16-2020 DA tender for Group 010/030 '
     'medicines — check quantity and unit pricing vs reference prices.'),

    (80366, 'METRO NET — Federal IT Data Center 100%DA Monopoly (2.65B)',
     'IT data center monopoly across federal agencies. SEP: 1.08B at 100%DA '
     '("CENTRO DE DATOS SEP 2020", cloud on-demand). INFONACOT: 0.59B at 100%DA. '
     'SEGOB: 0.44B at 100%DA. All DA. But LP-clean at STPS (0.44B, 0%DA) — confirming '
     'no monopoly justification. No RFC. Same pattern as Cases 12 (Toka) and 19 (Mainbit). '
     'RECOMMENDED ACTION: Cross-check SEP Centro de Datos 2020 contract with ASF IT audits; '
     'verify INFONACOT data center DA justifications. Suspected DA for non-exclusive IT services.'),

    (4421, 'MEDICAL DIMEGAR — IMSS Medical Consumables "Brand DA" Ring 54%DA (2.30B)',
     'IMSS medical device consumables ring member. 883 IMSS contracts 2002-2025 at 54%DA (1.32B). '
     'Products: intraocular lenses, VAC therapy, phacoemulsification cartridges, wound care. '
     'Contracts explicitly cite "ADJUDICACION DIRECTA POR MARCA DETERMINADA" — the IMSS '
     'brand-specific DA classification used to bypass LP for branded consumables. '
     'SEDENA 14.3%DA and ISSSTE 22.4%DA (both LP-dominant) confirm IMSS-specific capture. '
     'No RFC for a 23-year specialized medical consumables distributor. '
     'RECOMMENDED ACTION: Verify brand exclusivity claims for VAC therapy and phacoemulsification '
     '— multiple manufacturers exist for these product categories.'),

    (205212, 'SAVARE MEDIKA — ISSSTE Medical Imaging 66.7%DA (1.95B)',
     'ISSSTE medical imaging equipment ring. 6 ISSSTE contracts 2017-2022 at 66.7%DA (1.67B): '
     '3T MRI scanners, fluoroscopic X-ray systems. Average contract: ~280M MXN. '
     'Equipment at this value requires competitive international bidding under LAASSP. '
     'IMSS 36.4%DA (lower) suggests ISSSTE-specific institutional capture. No RFC. '
     'RECOMMENDED ACTION: Verify ISSSTE Direccion de Recursos Materiales imaging contracts '
     '2017-2022 in ASF Cuenta Publica. Check MRI/X-ray market pricing vs contract amounts.'),
]

updated = 0
for vid, title, memo in memos:
    # Get aria_queue row
    row = conn.execute('SELECT id, in_ground_truth FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if not row:
        print(f'VID={vid} NOT IN aria_queue — skipping')
        continue
    full_memo = f'[ARIA AUTO-MEMO — GT CONFIRMED]\n\n{title}\n\n{memo}\n\nGenerated: {now}'
    conn.execute('''UPDATE aria_queue SET
        memo_text=?, memo_generated_at=?, review_status="needs_review"
        WHERE vendor_id=?''', (full_memo, now, vid))
    conn.commit()
    print(f'VID={vid}: memo written ({len(full_memo)} chars)')
    updated += 1

# Summary
gt_linked = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nARIA Summary: {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review')
print(f'Memos written: {updated}')
conn.close()
