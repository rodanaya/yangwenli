"""Bulk flag all structural false positives in aria_queue.
Run this after any ARIA pipeline run to re-apply FP classifications.
These are legitimate companies that appear high-risk due to structural/regulatory monopolies."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'

# ── Complete list of structural FPs with justifications ────────────────────────
STRUCTURAL_FPS = {
    # === PATENTED PHARMA MANUFACTURERS (legal DA under LAASSP Art. 41 frac. IV) ===
    17718:  'SANOFI PASTEUR - vaccine manufacturer (MMR, meningococcal, flu)',
    248385: 'BOEHRINGER INGELHEIM MEXICO - patented pharma OEM (oncology, diabetes)',
    136276: 'PRODUCTOS ROCHE - patented pharma OEM (cancer, immunology)',
    165306: 'ASTRAZENECA - patented pharma OEM (oncology, cardiovascular)',
    246212: 'NOVARTIS FARMACEUTICA - patented pharma OEM (oncology, autoimmune)',
    4941:   'BAYER DE MEXICO - patented pharma OEM (hematology, cardiovascular)',
    174942: 'MERCK SHARP & DOHME COMERCIALIZADORA - pharma commercial arm',
    244438: 'NOVO NORDISK MEXICO - insulin/diabetes OEM (structural monopoly)',
    244373: 'JANSSEN-CILAG DE MEXICO - J&J patented pharma (oncology, hematology)',
    250878: 'AMGEN MEXICO - biotechnology/biosimilar OEM',
    120605: 'TAKEDA MEXICO - patented pharma (oncology, GI)',
    101593: 'ABBVIE FARMACEUTICOS - patented pharma (Humira, immunology)',
    31020:  'SANOFI AVENTIS DE MEXICO - patented pharma OEM',
    177833: 'CSL BEHRING - blood plasma products (albumin, clotting factors)',
    248822: 'ELI LILLY Y CIA - patented pharma OEM (diabetes, oncology)',
    101611: 'MERCK SHARP & DOHME (manufacturer entity) - patented pharma OEM',
    124470: 'SANOFI-AVENTIS WINTHROP - patented pharma subsidiary',
    257992: 'RECORDATI RARE DISEASES - orphan drugs OEM (regulatory monopoly)',
    249276: 'CHIESI MEXICO - Italian specialty pharma OEM (respiratory/rare)',
    251212: 'SHIRE PHARMACEUTICALS MEXICO - rare disease pharma (now Takeda)',
    # === MEDICAL DEVICE OEMs ===
    42644:  'SIEMENS HEALTHCARE DIAGNOSTICS - medical imaging/lab equipment OEM',
    19921:  'MEDTRONIC - cardiac devices, pacemakers, implantables OEM',
    4425:   'JOHNSON & JOHNSON MEDICAL MEXICO - medical device OEM',
    176922: 'PHILIPS MEXICO COMMERCIAL - medical imaging OEM',
    5355:   'BOSTON SCIENTIFIC DE MEXICO - coronary/vascular devices OEM',
    278284: 'ASTELLAS FARMA MEXICO - pharma/urology OEM',
    7328:   '3M MEXICO - medical/industrial OEM (diverse)',
    43072:  'ELEVADORES OTIS - elevator maintenance OEM (sole certified provider)',
    2502:   'GENERAL ELECTRIC INTERNATIONAL - GE medical/industrial OEM',
    259128: 'BECKMAN LABORATORIES DE MEXICO - Danaher/Beckman Coulter lab OEM',
    2155:   'SIEMENS SA - industrial/electrical OEM',
    # === STATE UTILITIES ===
    45048:  'COMISION FEDERAL DE ELECTRICIDAD - state electricity utility',
    14912:  'GAS METROPOLITANO - natural gas distribution utility',
    5801:   'INFRA DEL SUR - industrial gas (structural few-provider market)',
    # === FINANCIAL/INSURANCE ===
    17192:  'SEGUROS ATLAS - insurance (regulated market)',
    # === TELECOMS/IT OEMs ===
    33794:  'T-SYSTEMS MEXICO - Deutsche Telekom IT subsidiary',
    3387:   'ALESTRA SA DE RL - AT&T Mexico telecoms subsidiary',
    # === SPECIALTY SERVICES (legitimate structural concentration) ===
    48101:  'COMPANIA MEXICANA DE TRASLADO DE VALORES - armored cash transport',
    46145:  'OPERADORA DE HOSPITALES ANGELES - private hospital subrogation',
    148090: 'ETN TURISTAR LUJO - migrant transport, LP-dominant',
    200238: 'SILODISA - LP-dominant ISSSTE logistics',
    128027: 'CONSORCIO EMPRESARIAL ADPER - low contract count, ambiguous',
    # === ADDITIONAL PHARMA/DEVICE OEMs ===
    238348: 'BIOGEN MEXICO - patented MS drugs OEM (Tecfidera, Avonex, Vumerity)',
    1381:   'CARL ZEISS DE MEXICO - surgical optics/microscopes OEM',
    # === BIOTECH/BLOOD PRODUCTS ===
    4389:   'FRESENIUS KABI - IV solutions/clinical nutrition OEM',
    246753: 'KEDRION MEXICANA - blood plasma products OEM',
    1506:   'BECTON DICKINSON - medical devices (syringes/lab) OEM',
    4489:   'GRIFOLS MEXICO - blood plasma OEM',
    5212:   'PROBIOMED - biosimilar/biologic manufacturer',
}

conn = sqlite3.connect(DB)
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('PRAGMA synchronous=NORMAL')

# Get current GT vendor IDs to protect them
gt_vids = set(r[0] for r in conn.execute('SELECT DISTINCT vendor_id FROM ground_truth_vendors').fetchall())

print(f'Bulk FP flagging — {len(STRUCTURAL_FPS)} vendors to process')
print(f'GT-protected vendor IDs: {len(gt_vids)}')
print()

updated = 0
skipped_gt = 0
not_in_queue = 0

for vid, reason in sorted(STRUCTURAL_FPS.items()):
    if vid in gt_vids:
        skipped_gt += 1
        continue
    r = conn.execute(
        'UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=? AND in_ground_truth=0',
        (vid,)
    )
    if r.rowcount > 0:
        nm_row = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()
        nm = nm_row[0][:45] if nm_row else '?'
        print(f'  VID={vid:7d} {nm:45s} fp_structural_monopoly=1')
        updated += 1
    else:
        not_in_queue += 1

conn.commit()

# Force WAL checkpoint to ensure durability
conn.execute('PRAGMA wal_checkpoint(TRUNCATE)')
conn.commit()

# Verify
total_fp = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE fp_structural_monopoly=1').fetchone()[0]
total_gt_fp_check = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE fp_structural_monopoly=1 AND in_ground_truth=1').fetchone()[0]

print()
print(f'Summary:')
print(f'  Updated: {updated}')
print(f'  Skipped (in GT): {skipped_gt}')
print(f'  Not in aria_queue: {not_in_queue}')
print(f'  Total fp_structural_monopoly=1 in queue: {total_fp}')
print(f'  GT overlap (should be 0): {total_gt_fp_check}')
print(f'  Timestamp: {datetime.now().isoformat()}')

conn.close()
