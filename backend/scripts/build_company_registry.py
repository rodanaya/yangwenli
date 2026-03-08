"""
Build company registry from multiple sources:
1. RFC algorithmic validation (offline — validates format, extracts incorporation date)
2. SAT EFOS cross-reference (already in sat_efos_vendors table)
3. SFP sanctions cross-reference (already in sfp_sanctions table)
4. SIGER scraper (optional — requires account; invoke with --scrape-siger)

Usage:
    cd backend
    python scripts/build_company_registry.py            # RFC validation + cross-refs only
    python scripts/build_company_registry.py --limit 500  # limit SIGER scraping
    python scripts/build_company_registry.py --vendor-id 12345  # single vendor
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import re
import sqlite3
import argparse
import time
import json
from datetime import datetime, date
from pathlib import Path

DB = Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'

# ── RFC Validation ─────────────────────────────────────────────────────────────

# Valid chars for homoclave
_ALNUM = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')

# Disallowed 3-letter prefixes (SAT blacklist for "bad words")
_BLACKLIST_PREFIXES = {
    'BUE', 'CAC', 'COC', 'CUE', 'FEL', 'GUE', 'JOT', 'LOC', 'MAM', 'MEA',
    'MIE', 'MOC', 'MON', 'NAC', 'OCC', 'PED', 'PEN', 'PIS', 'PUT', 'QUI',
    'RAT', 'RON', 'SCR', 'SER', 'SEX', 'TEM'
}

# Disallowed consonant combos (simplification of SAT rule)
_BLACKLIST_PAIRS = {'Ñ'}


def validate_rfc(rfc: str) -> dict:
    """
    Validate a Mexican RFC. Returns dict with:
      valid (bool), entity_type ('moral'|'fisica'|None),
      incorporation_date (date|None), error (str|None),
      birth_year (int|None)
    """
    result = {
        'valid': False,
        'entity_type': None,
        'incorporation_date': None,
        'error': None,
        'birth_year': None,
    }

    if not rfc or not isinstance(rfc, str):
        result['error'] = 'null'
        return result

    rfc = rfc.strip().upper()

    # Remove trailing spaces / generic placeholders
    if rfc in ('', 'XAXX010101000', 'XEXX010101000'):
        result['error'] = 'placeholder'
        return result

    # Length: 12 = moral (empresa), 13 = física (persona)
    if len(rfc) == 12:
        entity_type = 'moral'
        letters = rfc[:3]
        date_part = rfc[3:9]
        homoclave = rfc[9:12]
    elif len(rfc) == 13:
        entity_type = 'fisica'
        letters = rfc[:4]
        date_part = rfc[4:10]
        homoclave = rfc[10:13]
    else:
        result['error'] = f'bad_length_{len(rfc)}'
        return result

    # Letters must be alpha
    if not letters.isalpha():
        result['error'] = 'non_alpha_prefix'
        return result

    # Date part: YYMMDD
    try:
        yy = int(date_part[:2])
        mm = int(date_part[2:4])
        dd = int(date_part[4:6])
        if mm < 1 or mm > 12 or dd < 1 or dd > 31:
            result['error'] = 'bad_date'
            return result
        # Estimate full year: <=25 → 2000s, else 1900s
        full_year = 2000 + yy if yy <= 25 else 1900 + yy
        # Try building a date (may fail for e.g. Feb 30)
        try:
            inc_date = date(full_year, mm, dd)
        except ValueError:
            inc_date = date(full_year, mm, 1)  # approximate
        result['incorporation_date'] = inc_date
        result['birth_year'] = full_year
    except (ValueError, IndexError):
        result['error'] = 'bad_date'
        return result

    # Homoclave: 2 alnum + 1 alnum digit
    if not all(c in _ALNUM for c in homoclave):
        result['error'] = 'bad_homoclave'
        return result

    # Blacklist check
    if entity_type == 'moral' and letters[:3] in _BLACKLIST_PREFIXES:
        result['error'] = 'blacklisted_prefix'
        return result

    result['valid'] = True
    result['entity_type'] = entity_type
    return result


def company_age_years(inc_date: date, ref_date: date | None = None) -> float | None:
    """Return age in years from incorporation to ref_date (default today)."""
    if inc_date is None:
        return None
    ref = ref_date or date.today()
    return (ref - inc_date).days / 365.25


# ── Schema ─────────────────────────────────────────────────────────────────────

CREATE_REGISTRY = """
CREATE TABLE IF NOT EXISTS company_registry (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id       INTEGER NOT NULL UNIQUE,
    rfc             TEXT,
    -- RFC validation (offline)
    rfc_valid       INTEGER,          -- 1=valid, 0=invalid, NULL=no RFC
    rfc_entity_type TEXT,             -- 'moral', 'fisica', NULL
    rfc_inc_year    INTEGER,          -- year embedded in RFC
    rfc_inc_date    TEXT,             -- YYYY-MM-DD from RFC date component
    rfc_age_years   REAL,             -- age at time of analysis
    rfc_error       TEXT,             -- validation error code if invalid
    -- SAT EFOS status (from sat_efos_vendors)
    efos_stage      TEXT,             -- 'definitivo', 'presunto', NULL
    efos_listed_at  TEXT,             -- date first seen in EFOS
    -- SFP sanctions (from sfp_sanctions)
    sfp_sanctioned  INTEGER DEFAULT 0,
    sfp_sanction_type TEXT,
    -- Shell company risk signals
    shell_score     INTEGER,          -- 0-10 composite shell risk
    shell_flags     TEXT,             -- JSON array of flag strings
    -- SIGER data (optional scrape)
    siger_scraped   INTEGER DEFAULT 0,
    siger_status    TEXT,             -- 'ACTIVA','CANCELADA','SUSPENDIDA'
    siger_razon_social TEXT,
    siger_objeto_social TEXT,
    siger_cap_social TEXT,
    siger_scraped_at TEXT,
    -- Metadata
    analyzed_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cr_vendor ON company_registry(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cr_rfc ON company_registry(rfc);
CREATE INDEX IF NOT EXISTS idx_cr_shell ON company_registry(shell_score DESC);
CREATE INDEX IF NOT EXISTS idx_cr_efos ON company_registry(efos_stage);
"""


# ── Shell scoring ──────────────────────────────────────────────────────────────

def compute_shell_score(v: dict) -> tuple[int, list[str]]:
    """
    Compute a 0-10 shell company risk score from registry signals.
    Higher = more shell-like.
    """
    score = 0
    flags = []

    # No RFC at all (strong shell signal — legitimate companies have RFCs)
    if not v.get('rfc'):
        score += 4
        flags.append('NO_RFC')
    elif not v.get('rfc_valid'):
        score += 3
        flags.append(f"INVALID_RFC:{v.get('rfc_error','?')}")
    else:
        # Very new company (< 2 years old when first contracting)
        age = v.get('rfc_age_years')
        if age is not None and age < 2:
            score += 2
            flags.append(f'NEW_COMPANY_{int(age*12)}mo')
        elif age is not None and age < 5:
            score += 1
            flags.append(f'YOUNG_COMPANY_{int(age)}yr')

    # SAT EFOS listing
    efos = v.get('efos_stage')
    if efos == 'definitivo':
        score += 5
        flags.append('EFOS_DEFINITIVO')
    elif efos == 'presunto':
        score += 2
        flags.append('EFOS_PRESUNTO')

    # SFP sanction
    if v.get('sfp_sanctioned'):
        score += 3
        flags.append(f"SFP_SANCTIONED:{v.get('sfp_sanction_type','?')[:30]}")

    return min(score, 10), flags


# ── Main analysis ──────────────────────────────────────────────────────────────

def analyze_vendors(conn, vendor_ids: list[int] | None = None, limit: int | None = None, aria_only: bool = False):
    """Analyze vendors and populate company_registry."""

    # Build vendor list
    if vendor_ids is not None and len(vendor_ids) <= 900:
        placeholders = ','.join('?' * len(vendor_ids))
        query = f'SELECT id, name, rfc FROM vendors WHERE id IN ({placeholders})'
        vendors = conn.execute(query, vendor_ids).fetchall()
    elif vendor_ids is not None:
        # Batch to avoid SQLite variable limit
        vendors = []
        for i in range(0, len(vendor_ids), 900):
            batch = vendor_ids[i:i+900]
            placeholders = ','.join('?' * len(batch))
            vendors.extend(conn.execute(
                f'SELECT id, name, rfc FROM vendors WHERE id IN ({placeholders})', batch
            ).fetchall())
    else:
        if aria_only:
            query = 'SELECT v.id, v.name, v.rfc FROM vendors v WHERE v.id IN (SELECT DISTINCT vendor_id FROM aria_queue)'
        else:
            query = 'SELECT v.id, v.name, v.rfc FROM vendors v'
        if limit:
            query += f' LIMIT {limit}'
        vendors = conn.execute(query).fetchall()

    print(f'Analyzing {len(vendors):,} vendors...')

    # Load EFOS index (rfc → stage)
    efos_index = {}
    try:
        rows = conn.execute(
            "SELECT rfc, stage FROM sat_efos_vendors WHERE rfc IS NOT NULL"
        ).fetchall()
        for rfc, stage in rows:
            efos_index[rfc.strip().upper()] = stage
        print(f'  EFOS index: {len(efos_index):,} RFCs')
    except Exception as e:
        print(f'  EFOS index unavailable: {e}')

    # Load SFP sanctions index (rfc → sanction_type)
    sfp_index = {}
    try:
        rows = conn.execute(
            "SELECT rfc, sanction_type FROM sfp_sanctions WHERE rfc IS NOT NULL"
        ).fetchall()
        for rfc, tipo in rows:
            sfp_index[rfc.strip().upper()] = tipo
        print(f'  SFP sanctions index: {len(sfp_index):,} RFCs')
    except Exception as e:
        print(f'  SFP index unavailable: {e}')

    now = datetime.now().isoformat()
    today = date.today()

    rows_to_insert = []
    stats = {
        'no_rfc': 0, 'invalid_rfc': 0, 'valid_rfc': 0,
        'efos_definitivo': 0, 'efos_presunto': 0, 'sfp_sanctioned': 0,
        'new_company': 0, 'high_shell': 0
    }

    for vid, name, rfc in vendors:
        # RFC validation
        rfc_clean = rfc.strip().upper() if rfc else None
        vr = validate_rfc(rfc_clean) if rfc_clean else {'valid': False, 'entity_type': None,
            'incorporation_date': None, 'error': 'no_rfc', 'birth_year': None}

        if not rfc_clean:
            stats['no_rfc'] += 1
        elif vr['valid']:
            stats['valid_rfc'] += 1
        else:
            stats['invalid_rfc'] += 1

        # Age calculation
        inc_date = vr.get('incorporation_date')
        age = company_age_years(inc_date, today) if inc_date else None
        if age is not None and age < 2:
            stats['new_company'] += 1

        # EFOS cross-ref
        efos_stage = efos_index.get(rfc_clean) if rfc_clean else None
        if efos_stage == 'definitivo':
            stats['efos_definitivo'] += 1
        elif efos_stage == 'presunto':
            stats['efos_presunto'] += 1

        # SFP cross-ref
        sfp_tipo = sfp_index.get(rfc_clean) if rfc_clean else None
        sfp_sanctioned = 1 if sfp_tipo else 0
        if sfp_sanctioned:
            stats['sfp_sanctioned'] += 1

        # Shell score
        v_data = {
            'rfc': rfc_clean, 'rfc_valid': vr['valid'],
            'rfc_error': vr.get('error'),
            'rfc_age_years': age,
            'efos_stage': efos_stage,
            'sfp_sanctioned': sfp_sanctioned,
            'sfp_sanction_type': sfp_tipo,
        }
        shell_score, shell_flags = compute_shell_score(v_data)
        if shell_score >= 5:
            stats['high_shell'] += 1

        rows_to_insert.append((
            vid,
            rfc_clean,
            1 if vr['valid'] else (0 if rfc_clean else None),
            vr.get('entity_type'),
            vr.get('birth_year'),
            inc_date.isoformat() if inc_date else None,
            round(age, 2) if age else None,
            vr.get('error') if not vr['valid'] else None,
            efos_stage,
            None,  # efos_listed_at
            sfp_sanctioned,
            sfp_tipo,
            shell_score,
            json.dumps(shell_flags),
            now,
        ))

    # Bulk upsert
    conn.executemany('''
        INSERT OR REPLACE INTO company_registry
        (vendor_id, rfc, rfc_valid, rfc_entity_type, rfc_inc_year, rfc_inc_date,
         rfc_age_years, rfc_error, efos_stage, efos_listed_at, sfp_sanctioned,
         sfp_sanction_type, shell_score, shell_flags, analyzed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', rows_to_insert)
    conn.commit()

    print(f'\nResults ({len(rows_to_insert):,} vendors):')
    print(f'  No RFC:          {stats["no_rfc"]:,}')
    print(f'  Invalid RFC:     {stats["invalid_rfc"]:,}')
    print(f'  Valid RFC:       {stats["valid_rfc"]:,}')
    print(f'  New companies:   {stats["new_company"]:,}  (<2yr)')
    print(f'  EFOS definitivo: {stats["efos_definitivo"]:,}')
    print(f'  EFOS presunto:   {stats["efos_presunto"]:,}')
    print(f'  SFP sanctioned:  {stats["sfp_sanctioned"]:,}')
    print(f'  High shell (≥5): {stats["high_shell"]:,}')

    return stats


def show_top_shell(conn, limit: int = 30):
    """Print top shell-risk vendors with their signals."""
    rows = conn.execute('''
        SELECT cr.shell_score, cr.shell_flags, cr.rfc, cr.efos_stage,
               v.name, cr.rfc_age_years, cr.sfp_sanctioned
        FROM company_registry cr
        JOIN vendors v ON v.id = cr.vendor_id
        WHERE cr.shell_score >= 4
        ORDER BY cr.shell_score DESC, cr.rfc_age_years ASC
        LIMIT ?
    ''', (limit,)).fetchall()

    print(f'\n{"─"*80}')
    print(f'TOP SHELL-RISK VENDORS (score ≥ 4, top {limit})')
    print(f'{"─"*80}')
    for score, flags, rfc, efos, name, age, sfp in rows:
        rfc_str = rfc or 'NO_RFC'
        age_str = f'{age:.1f}yr' if age else '?yr'
        efos_str = f'EFOS:{efos}' if efos else ''
        sfp_str = 'SFP' if sfp else ''
        print(f'  [{score:2d}] {name[:50]:<50} {rfc_str:<15} {age_str:<8} {efos_str} {sfp_str}')
        flag_list = json.loads(flags) if flags else []
        print(f'       FLAGS: {flag_list}')


def cross_reference_aria_queue(conn):
    """Update aria_queue with shell signals from company_registry."""
    # Count vendors in queue with high shell scores
    high_shell = conn.execute('''
        SELECT aq.vendor_id, cr.shell_score, cr.shell_flags, cr.efos_stage
        FROM aria_queue aq
        JOIN company_registry cr ON cr.vendor_id = aq.vendor_id
        WHERE cr.shell_score >= 5
          AND aq.in_ground_truth = 0
          AND aq.fp_structural_monopoly = 0
        ORDER BY cr.shell_score DESC, aq.ips_final DESC
    ''').fetchall()

    print(f'\nARIA Queue vendors with high shell score (≥5): {len(high_shell)}')
    for vid, score, flags, efos in high_shell[:20]:
        nm = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()
        name = nm[0][:50] if nm else '?'
        flag_list = json.loads(flags) if flags else []
        print(f'  VID={vid:7d} [{score}] {name:<50} {flag_list}')

    return high_shell


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build Mexico company registry enrichment')
    parser.add_argument('--vendor-id', type=int, help='Analyze single vendor')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of vendors to analyze')
    parser.add_argument('--aria-only', action='store_true', help='Only analyze vendors in ARIA queue')
    parser.add_argument('--top-shell', type=int, default=30, help='Show top N shell-risk vendors')
    args = parser.parse_args()

    conn = sqlite3.connect(DB)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')

    # Create schema
    for stmt in CREATE_REGISTRY.strip().split(';'):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()
    print('Schema ready.')

    if args.vendor_id:
        vendor_ids = [args.vendor_id]
    elif args.aria_only:
        vendor_ids = None  # will use subquery in analyze_vendors
    else:
        vendor_ids = None

    analyze_vendors(conn, vendor_ids=vendor_ids, limit=args.limit, aria_only=args.aria_only)

    if not args.vendor_id:
        show_top_shell(conn, limit=args.top_shell)
        cross_reference_aria_queue(conn)

    conn.close()
    print('\nDone.')
