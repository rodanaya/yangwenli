"""Session startup script — run at the beginning of any GT mining session.
Fixes WAL persistence bug: re-applies fp_structural_monopoly flags and syncs in_ground_truth.
Usage: cd backend && python scripts/_session_startup.py
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('PRAGMA synchronous=FULL')

print(f'RUBLI Session Startup — {datetime.now().isoformat()}')
print()

# ── Fix 1: Sync in_ground_truth for all GT vendors ────────────────────────────
r = conn.execute('''
    UPDATE aria_queue SET in_ground_truth=1
    WHERE vendor_id IN (SELECT DISTINCT vendor_id FROM ground_truth_vendors)
      AND in_ground_truth=0
''')
print(f'in_ground_truth synced: {r.rowcount} rows updated')

# ── Fix 1b: Sync is_false_positive flags to aria_queue ────────────────────────
# Propagates is_false_positive=1 from ground_truth_vendors to aria_queue and
# vendor_stats so the scoring pipeline excludes them correctly.
aq_cols = {row[1] for row in conn.execute('PRAGMA table_info(aria_queue)')}
if 'is_false_positive' in aq_cols:
    r_fp = conn.execute('''
        UPDATE aria_queue SET is_false_positive=1
        WHERE vendor_id IN (
            SELECT DISTINCT vendor_id FROM ground_truth_vendors
            WHERE is_false_positive=1 AND vendor_id IS NOT NULL
        )
          AND is_false_positive=0
    ''')
    print(f'is_false_positive synced to aria_queue: {r_fp.rowcount} rows updated')
else:
    print('aria_queue.is_false_positive column not present — skipping')

# Sync to vendor_stats if the column exists
vs_cols = {row[1] for row in conn.execute('PRAGMA table_info(vendor_stats)')}
if 'is_false_positive' in vs_cols:
    r_vs = conn.execute('''
        UPDATE vendor_stats SET is_false_positive=1
        WHERE vendor_id IN (
            SELECT DISTINCT vendor_id FROM ground_truth_vendors
            WHERE is_false_positive=1 AND vendor_id IS NOT NULL
        )
          AND is_false_positive=0
    ''')
    print(f'is_false_positive synced to vendor_stats: {r_vs.rowcount} rows updated')
else:
    print('vendor_stats.is_false_positive column not present — skipping')

# ── Fix 2: Re-apply all structural FP flags ───────────────────────────────────
STRUCTURAL_FPS = {
    # === PATENTED PHARMA MANUFACTURERS ===
    17718:  'SANOFI PASTEUR - vaccine manufacturer (MMR, meningococcal, flu)',
    248385: 'BOEHRINGER INGELHEIM MEXICO - patented pharma OEM',
    136276: 'PRODUCTOS ROCHE - patented pharma OEM (cancer, immunology)',
    165306: 'ASTRAZENECA - patented pharma OEM (oncology, cardiovascular)',
    246212: 'NOVARTIS FARMACEUTICA - patented pharma OEM',
    4941:   'BAYER DE MEXICO - patented pharma OEM',
    174942: 'MERCK SHARP & DOHME COMERCIALIZADORA - pharma commercial arm',
    244438: 'NOVO NORDISK MEXICO - insulin/diabetes OEM',
    244373: 'JANSSEN-CILAG DE MEXICO - J&J patented pharma',
    250878: 'AMGEN MEXICO - biotechnology/biosimilar OEM',
    120605: 'TAKEDA MEXICO - patented pharma (oncology, GI)',
    101593: 'ABBVIE FARMACEUTICOS - patented pharma (Humira)',
    31020:  'SANOFI AVENTIS DE MEXICO - patented pharma OEM',
    177833: 'CSL BEHRING - blood plasma products',
    248822: 'ELI LILLY Y CIA - patented pharma OEM',
    101611: 'MERCK SHARP & DOHME (manufacturer entity)',
    124470: 'SANOFI-AVENTIS WINTHROP - patented pharma subsidiary',
    257992: 'RECORDATI RARE DISEASES - orphan drugs OEM',
    249276: 'CHIESI MEXICO - specialty pharma OEM',
    251212: 'SHIRE PHARMACEUTICALS MEXICO - rare disease pharma',
    # === MEDICAL DEVICE OEMs ===
    42644:  'SIEMENS HEALTHCARE DIAGNOSTICS - medical imaging/lab OEM',
    19921:  'MEDTRONIC - cardiac devices OEM',
    4425:   'JOHNSON & JOHNSON MEDICAL MEXICO - medical device OEM',
    176922: 'PHILIPS MEXICO COMMERCIAL - medical imaging OEM',
    5355:   'BOSTON SCIENTIFIC DE MEXICO - coronary/vascular devices OEM',
    278284: 'ASTELLAS FARMA MEXICO - pharma/urology OEM',
    7328:   '3M MEXICO - medical/industrial OEM',
    43072:  'ELEVADORES OTIS - elevator maintenance OEM',
    2502:   'GENERAL ELECTRIC INTERNATIONAL - GE medical/industrial OEM',
    259128: 'BECKMAN LABORATORIES DE MEXICO - Danaher/Beckman Coulter lab OEM',
    2155:   'SIEMENS SA - industrial/electrical OEM',
    2260:   'ABB MEXICO - industrial/electrical OEM',
    # === STATE UTILITIES ===
    45048:  'COMISION FEDERAL DE ELECTRICIDAD - state electricity utility',
    14912:  'GAS METROPOLITANO - natural gas distribution utility',
    5801:   'INFRA DEL SUR - industrial gas',
    # === FINANCIAL/INSURANCE ===
    17192:  'SEGUROS ATLAS - insurance (regulated market)',
    # === TELECOMS/IT OEMs ===
    33794:  'T-SYSTEMS MEXICO - Deutsche Telekom IT subsidiary',
    3387:   'ALESTRA SA DE RL - AT&T Mexico telecoms subsidiary',
    # === SPECIALTY SERVICES ===
    48101:  'COMPANIA MEXICANA DE TRASLADO DE VALORES - armored cash transport',
    46145:  'OPERADORA DE HOSPITALES ANGELES - private hospital subrogation',
    148090: 'ETN TURISTAR LUJO - migrant transport, LP-dominant',
    200238: 'SILODISA - LP-dominant ISSSTE logistics',
    128027: 'CONSORCIO EMPRESARIAL ADPER - low contract count, ambiguous',
    # === BIOTECH/BLOOD PRODUCTS ===
    4389:   'FRESENIUS KABI - IV solutions/clinical nutrition OEM',
    246753: 'KEDRION MEXICANA - blood plasma products OEM',
    1506:   'BECTON DICKINSON - medical devices (syringes/lab) OEM',
    4489:   'GRIFOLS MEXICO - blood plasma OEM',
    5212:   'PROBIOMED - biosimilar/biologic manufacturer',
    # === RETAIL/CONSUMER (LP-dominant large contracts) ===
    35078:  'TIENDAS SORIANA - supermarket chain, LP-dominant large contracts',
    25627:  'GRUPO INDUSTRIAL VIDA - Diconsa small food supply, LP-clean large',
    111122: 'INTERCONECTA - LP-dominant large contracts (PROSPERA, @prende.mx)',
    # === ADDITIONAL PHARMA/DEVICE OEMs ===
    238348: 'BIOGEN MEXICO - patented MS drugs OEM (Tecfidera, Avonex, Vumerity)',
    1381:   'CARL ZEISS DE MEXICO - surgical optics/microscopes OEM (brand-exclusive maintenance)',
    313628: 'BMRN MEXICO - BioMarin ultra-orphan enzyme replacement therapies (patent-protected)',
    248392: 'IPSEN MEXICO - Ipsen oncology/rare disease OEM (Decapeptyl, Dysport brand-exclusive)',
    294211: 'GEDEON RICHTER MEXICO - branded generics OEM (Cabergolina, hormonal drugs)',
    184360: 'ELEKTA MEDICAL - radiation therapy equipment OEM (brand-exclusive servicing)',
}

gt_vids = set(r2[0] for r2 in conn.execute('SELECT DISTINCT vendor_id FROM ground_truth_vendors').fetchall())
fp_updated = 0
fp_skipped = 0

for vid, reason in STRUCTURAL_FPS.items():
    if vid in gt_vids:
        fp_skipped += 1
        continue
    r2 = conn.execute(
        'UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=? AND in_ground_truth=0',
        (vid,)
    )
    if r2.rowcount > 0:
        fp_updated += 1

conn.commit()
conn.execute('PRAGMA wal_checkpoint(FULL)')
conn.commit()

print(f'fp_structural_monopoly re-applied: {fp_updated} rows ({fp_skipped} skipped as GT-protected)')

# ── Summary ───────────────────────────────────────────────────────────────────
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
total_fp = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE fp_structural_monopoly=1').fetchone()[0]
gt_linked = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
pending = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE ips_tier<=2 AND in_ground_truth=0 AND fp_structural_monopoly=0 AND review_status IN ('pending','needs_review')").fetchone()[0]

print()
print(f'GT Database: {total_cases} cases | {total_vendors} vendors | {total_contracts:,} contracts')
print(f'ARIA Queue:  {gt_linked} GT-linked | {total_fp} structural FPs | {pending} unclassified Tier1/2')
print()
print('Ready for GT mining session.')

# ── H3: Validate GT row counts (detects silently dropped INSERT OR IGNORE) ────
# Print current counts so that after any batch insert script the user can
# compare and detect rows that were silently skipped by INSERT OR IGNORE.
_cases_now   = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
_vendors_now = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
print(f'[H3 validation] ground_truth_cases: {_cases_now} rows')
print(f'[H3 validation] ground_truth_vendors: {_vendors_now} rows')
print('Compare these counts to the expected totals after any batch insert to detect')
print('silently dropped duplicates from INSERT OR IGNORE.')

conn.close()
