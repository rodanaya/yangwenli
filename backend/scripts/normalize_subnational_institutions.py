"""
normalize_subnational_institutions.py
Phase 1: Fill NULL state_code and gobierno_nivel for state/municipal institutions.

Strategy:
  1. unidecode() all institution names to strip encoding corruption
  2. Apply 7 regex patterns in priority order to extract state name
  3. Map state name → state_code (2-5 char code)
  4. Fill gobierno_nivel from institution_type where missing
  5. Report coverage improvement

Run from backend/:
    python -m scripts.normalize_subnational_institutions
"""

import re
import sqlite3
import logging
from pathlib import Path
from collections import defaultdict

try:
    from unidecode import unidecode
except ImportError:
    def unidecode(s):
        """Fallback: manual accent stripping for common Mexican Spanish chars."""
        replacements = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
            'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
            # Latin-1 misread as UTF-8 variants (common in COMPRANET)
            'Ã³': 'o', 'Ã©': 'e', 'Ã¡': 'a', 'Ã­': 'i', 'Ãº': 'u',
            'Ã\x93': 'O', 'Ã\x89': 'E', 'Ã\x81': 'A',
        }
        for k, v in replacements.items():
            s = s.replace(k, v)
        return s


logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'

# ============================================================================
# State lookup tables
# ============================================================================

# code → full name (canonical)
STATE_CODES: dict[str, str] = {
    'AGS':  'Aguascalientes',
    'BC':   'Baja California',
    'BCS':  'Baja California Sur',
    'CAMP': 'Campeche',
    'CHIS': 'Chiapas',
    'CHIH': 'Chihuahua',
    'COAH': 'Coahuila',
    'COL':  'Colima',
    'CDMX': 'Ciudad de Mexico',
    'DGO':  'Durango',
    'GTO':  'Guanajuato',
    'GRO':  'Guerrero',
    'HGO':  'Hidalgo',
    'JAL':  'Jalisco',
    'MEX':  'Mexico',
    'MICH': 'Michoacan',
    'MOR':  'Morelos',
    'NAY':  'Nayarit',
    'NL':   'Nuevo Leon',
    'OAX':  'Oaxaca',
    'PUE':  'Puebla',
    'QRO':  'Queretaro',
    'QROO': 'Quintana Roo',
    'SLP':  'San Luis Potosi',
    'SIN':  'Sinaloa',
    'SON':  'Sonora',
    'TAB':  'Tabasco',
    'TAMPS':'Tamaulipas',
    'TLAX': 'Tlaxcala',
    'VER':  'Veracruz',
    'YUC':  'Yucatan',
    'ZAC':  'Zacatecas',
}

# normalized name → code (for extracting from institution name text)
_NAME_TO_CODE: dict[str, str] = {
    'aguascalientes':       'AGS',
    'baja california sur':  'BCS',
    'baja california':      'BC',
    'campeche':             'CAMP',
    'chiapas':              'CHIS',
    'chihuahua':            'CHIH',
    'coahuila':             'COAH',
    'colima':               'COL',
    'ciudad de mexico':     'CDMX',
    'distrito federal':     'CDMX',
    'durango':              'DGO',
    'guanajuato':           'GTO',
    'guerrero':             'GRO',
    'hidalgo':              'HGO',
    'jalisco':              'JAL',
    'estado de mexico':     'MEX',
    'michoacan':            'MICH',
    'morelos':              'MOR',
    'nayarit':              'NAY',
    'nuevo leon':           'NL',
    'oaxaca':               'OAX',
    'puebla':               'PUE',
    'queretaro':            'QRO',
    'quintana roo':         'QROO',
    'san luis potosi':      'SLP',
    'sinaloa':              'SIN',
    'sonora':               'SON',
    'tabasco':              'TAB',
    'tamaulipas':           'TAMPS',
    'tlaxcala':             'TLAX',
    'veracruz':             'VER',
    'yucatan':              'YUC',
    'zacatecas':            'ZAC',
}

# Sorted longest-first so "baja california sur" matches before "baja california"
_NAME_SORTED = sorted(_NAME_TO_CODE.keys(), key=len, reverse=True)

# gobierno_nivel inference from institution_type
_TYPE_TO_NIVEL: dict[str, str] = {
    'federal_secretariat':         'APF',
    'federal_agency':              'APF',
    'social_security':             'APF',
    'state_enterprise_energy':     'APF',
    'regulatory_agency':           'APF',
    'military':                    'APF',
    'legislative':                 'APF',
    'judicial':                    'APF',
    'autonomous_constitutional':   'APF',
    'social_program':              'APF',
    'research_education':          'APF',
    'state_agency':                'GE',
    'state_government':            'GE',
    'state_enterprise_infra':      'GE',
    'state_enterprise_finance':    'GE',
    'educational':                 'GE',
    'health_institution':          'GE',
    'municipal':                   'GM',
}


# ============================================================================
# Name normalization & state extraction
# ============================================================================

def _clean(name: str) -> str:
    """Unidecode + uppercase + collapse whitespace."""
    return re.sub(r'\s+', ' ', unidecode(name).upper()).strip()


def _name_to_code(fragment: str) -> str | None:
    """Map a (possibly dirty) state name fragment to a state code."""
    cleaned = re.sub(r'\s+', ' ', unidecode(fragment).lower()).strip()
    # Exact match first (longest-first order handles baja california sur)
    for name in _NAME_SORTED:
        if cleaned == name or cleaned.startswith(name + ' ') or cleaned.endswith(' ' + name):
            return _NAME_TO_CODE[name]
    # Substring match fallback
    for name in _NAME_SORTED:
        if name in cleaned:
            return _NAME_TO_CODE[name]
    return None


def extract_state_code(raw_name: str) -> tuple[str | None, str]:
    """
    Try all 7 patterns in priority order.
    Returns (state_code | None, pattern_name_used).
    """
    name = _clean(raw_name)

    # Pattern 1: CODE- or CODE_ prefix  e.g. "AGS-Instituto de Salud"
    m = re.match(r'^([A-Z]{2,5})[-_](.+)$', name)
    if m:
        code = m.group(1)
        if code in STATE_CODES:
            return code, 'prefix_code'

    # Pattern 2: Q ROO prefix (special case — two-word code)
    if name.startswith('Q ROO'):
        return 'QROO', 'prefix_qroo'

    # Pattern 3: "DEL ESTADO DE {STATE}" anywhere in name
    m = re.search(r'DEL ESTADO DE ([A-Z\s]+?)(?:\s*$|[,.(])', name)
    if m:
        code = _name_to_code(m.group(1))
        if code:
            return code, 'del_estado_de'

    # Pattern 4: "DE {STATE}" after comma  e.g. "...DE MANZANILLO, GUERRERO"
    m = re.search(r',\s*([A-Z\s]+)$', name)
    if m:
        code = _name_to_code(m.group(1))
        if code:
            return code, 'comma_state'

    # Pattern 5: "_Gobierno del Estado de {STATE}"
    m = re.match(r'^_?GOBIERNO DEL ESTADO DE (.+)$', name)
    if m:
        code = _name_to_code(m.group(1))
        if code:
            return code, 'gobierno_estado'

    # Pattern 6: "H. AYUNTAMIENTO ... DE {MUNICIPALITY}, {STATE}"
    m = re.search(r'H\.?\s*AYUNTAMIENTO.*DE\s+[^,]+,\s*([A-Z\s]+)$', name)
    if m:
        code = _name_to_code(m.group(1))
        if code:
            return code, 'ayuntamiento'

    # Pattern 7: State name appears anywhere (last resort)
    for state_name in _NAME_SORTED:
        if state_name.upper() in name:
            return _NAME_TO_CODE[state_name], 'name_contains'

    return None, 'no_match'


# ============================================================================
# Main normalization
# ============================================================================

def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.execute('PRAGMA busy_timeout = 120000')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.isolation_level = None  # autocommit — avoids long-held write lock
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Target: subnational institutions missing state_code OR gobierno_nivel
    cur.execute('''
        SELECT id, name, state_code, gobierno_nivel, institution_type
        FROM institutions
        WHERE gobierno_nivel IN ('GE','GM','GEM')
           OR institution_type IN (
               'state_agency','state_government','municipal',
               'state_enterprise_infra','state_enterprise_finance',
               'educational','health_institution'
           )
    ''')
    rows = cur.fetchall()
    log.info(f'Found {len(rows):,} subnational institutions to process')

    stats: dict[str, int] = defaultdict(int)
    updates: list[tuple] = []

    for row in rows:
        inst_id = row['id']
        raw_name = row['name'] or ''
        curr_code = row['state_code']
        curr_nivel = row['gobierno_nivel']
        inst_type = row['institution_type'] or ''

        new_code = curr_code
        new_nivel = curr_nivel
        changed = False

        # Fill state_code if missing
        if not curr_code:
            inferred_code, pattern = extract_state_code(raw_name)
            if inferred_code:
                new_code = inferred_code
                stats[f'state_filled_via_{pattern}'] += 1
                changed = True
            else:
                stats['state_no_match'] += 1
        else:
            stats['state_already_set'] += 1

        # Fill gobierno_nivel if missing
        if not curr_nivel:
            inferred_nivel = _TYPE_TO_NIVEL.get(inst_type)
            if inferred_nivel:
                new_nivel = inferred_nivel
                stats['nivel_filled_via_type'] += 1
                changed = True
            else:
                stats['nivel_no_match'] += 1
        else:
            stats['nivel_already_set'] += 1

        if changed:
            updates.append((new_code, new_nivel, inst_id))

    log.info(f'Applying {len(updates):,} updates one-by-one (WAL-safe)...')

    import time
    done = 0
    for state_code, nivel, inst_id in updates:
        for attempt in range(20):
            try:
                cur.execute('BEGIN')
                cur.execute(
                    'UPDATE institutions SET state_code=?, gobierno_nivel=? WHERE id=?',
                    (state_code, nivel, inst_id)
                )
                cur.execute('COMMIT')
                done += 1
                break
            except sqlite3.OperationalError:
                cur.execute('ROLLBACK')
                time.sleep(0.05)
        if done % 100 == 0:
            log.info(f'  {done}/{len(updates)}...')
    log.info(f'  Done: {done}/{len(updates)} updated')

    # ── Post-run summary ──────────────────────────────────────────────────
    log.info('\n=== NORMALIZATION RESULTS ===')
    for k, v in sorted(stats.items()):
        log.info(f'  {k}: {v:,}')

    cur.execute('''
        SELECT
            SUM(CASE WHEN state_code IS NULL OR state_code='' THEN 1 ELSE 0 END) as null_code,
            SUM(CASE WHEN gobierno_nivel IS NULL THEN 1 ELSE 0 END) as null_nivel,
            COUNT(*) as total
        FROM institutions
        WHERE gobierno_nivel IN ('GE','GM','GEM')
           OR institution_type IN (
               'state_agency','state_government','municipal',
               'state_enterprise_infra','state_enterprise_finance',
               'educational','health_institution'
           )
    ''')
    r = cur.fetchone()
    log.info(f'\nPost-run: {r["null_code"]:,}/{r["total"]:,} still missing state_code '
             f'({100*r["null_code"]/r["total"]:.1f}%)')
    log.info(f'Post-run: {r["null_nivel"]:,}/{r["total"]:,} still missing gobierno_nivel '
             f'({100*r["null_nivel"]/r["total"]:.1f}%)')

    # Top 5 remaining no-matches (to tune patterns)
    log.info('\nSample unmatched institutions (no state_code extracted):')
    cur.execute('''
        SELECT name, institution_type, COUNT(c.id) as contracts
        FROM institutions i
        LEFT JOIN contracts c ON c.institution_id = i.id
        WHERE (i.gobierno_nivel IN ('GE','GM','GEM')
            OR i.institution_type IN ('state_agency','state_government','municipal'))
          AND (i.state_code IS NULL OR i.state_code = '')
        GROUP BY i.id
        ORDER BY contracts DESC
        LIMIT 15
    ''')
    for row in cur.fetchall():
        log.info(f'  [{row["contracts"]:4d} contracts] {row["name"][:70]}')

    conn.close()
    log.info('\nPhase 1 complete.')


if __name__ == '__main__':
    run()
