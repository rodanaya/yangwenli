"""
Centinela — SIGER/RPC Company Registry Scraper
===============================================
Scrapes Mexico's company registry to enrich vendor data.

SIGER = Sistema de Información del Registro Empresarial (Secretaría de Economía)
RPC   = Registro Público de Comercio

Requires centinela_build_registry.py to have been run first (creates schema).

Usage:
    cd backend
    python scripts/centinela_scrape.py --dry-run --from-aria-queue
    python scripts/centinela_scrape.py --from-aria-queue --limit 50
    python scripts/centinela_scrape.py --test-rfc ABC010101ABC
    python scripts/centinela_scrape.py --resume   # continue where left off

Credentials:
    Set env vars:  SIGER_USER, SIGER_PASS
    Or create:     backend/.siger_credentials  (format: user:password, NOT committed)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import os
import re
import json
import time
import sqlite3
import argparse
import random
from pathlib import Path
from datetime import datetime

try:
    import requests
    from requests.adapters import HTTPAdapter
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print('WARNING: requests not installed. Run: pip install requests')

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print('WARNING: beautifulsoup4 not installed. Run: pip install beautifulsoup4')

DB = Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'

# ── Configuration ──────────────────────────────────────────────────────────────

# NOTE: Update these if SIGER changes their URL structure
SIGER_BASE = 'https://siger.economia.gob.mx'
SIGER_SEARCH_PATH = '/Siger/consultant/informacionGeneral.jsf'
SIGER_LOGIN_PATH = '/Siger/Auth/login.jsf'

# Rate limiting — be respectful to avoid getting blocked
MIN_DELAY = 2.0   # seconds between requests
MAX_DELAY = 5.0
BATCH_SIZE = 50   # save to DB every N scraped records

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.8,en-US;q=0.5',
    'Connection': 'keep-alive',
}


# ── Session management ─────────────────────────────────────────────────────────

def get_credentials() -> tuple[str, str] | tuple[None, None]:
    """Load SIGER credentials from env or file."""
    # Try env vars first
    user = os.environ.get('SIGER_USER')
    pwd = os.environ.get('SIGER_PASS')
    if user and pwd:
        return user, pwd

    # Try credentials file
    cred_file = Path(__file__).parent.parent / '.siger_credentials'
    if cred_file.exists():
        with open(cred_file) as f:
            line = f.read().strip()
            if ':' in line:
                parts = line.split(':', 1)
                return parts[0].strip(), parts[1].strip()

    return None, None


def create_session() -> 'requests.Session':
    """Create a requests session with retry logic."""
    session = requests.Session()
    session.headers.update(HEADERS)
    adapter = HTTPAdapter(max_retries=2)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session


def login_siger(session, user: str, pwd: str) -> bool:
    """Attempt to login to SIGER. Returns True if successful."""
    try:
        # Get login page to extract CSRF token / view state
        resp = session.get(f'{SIGER_BASE}{SIGER_LOGIN_PATH}', timeout=15)
        if resp.status_code != 200:
            print(f'  Login page error: {resp.status_code}')
            return False

        if not HAS_BS4:
            print('  Cannot parse login page without beautifulsoup4')
            return False

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Extract JSF ViewState
        viewstate = ''
        vs_input = soup.find('input', {'name': 'javax.faces.ViewState'})
        if vs_input:
            viewstate = vs_input.get('value', '')

        # Extract form action
        form = soup.find('form')
        action = form.get('action', SIGER_LOGIN_PATH) if form else SIGER_LOGIN_PATH

        # Build login payload (adjust field names if SIGER changes their form)
        payload = {
            'javax.faces.ViewState': viewstate,
            'loginForm:username': user,
            'loginForm:password': pwd,
            'loginForm:loginButton': 'Iniciar Sesi\u00f3n',
            'loginForm': 'loginForm',
        }

        resp2 = session.post(f'{SIGER_BASE}{action}', data=payload, timeout=15, allow_redirects=True)
        # Check if login succeeded (look for logout link or dashboard indicator)
        if 'cerrar' in resp2.text.lower() or 'logout' in resp2.text.lower() or 'bienvenido' in resp2.text.lower():
            print('  Login successful.')
            return True
        else:
            print('  Login failed. Check credentials or SIGER may have changed their form.')
            # Save response for debugging
            debug_path = Path(__file__).parent / '_siger_login_debug.html'
            debug_path.write_text(resp2.text, encoding='utf-8')
            print(f'  Login response saved to {debug_path} for debugging.')
            return False
    except Exception as e:
        print(f'  Login error: {e}')
        return False


# ── Scraping ───────────────────────────────────────────────────────────────────

def scrape_by_rfc(session, rfc: str) -> dict | None:
    """
    Search SIGER by RFC. Returns parsed company data or None.
    Falls back to public search (no login) if authenticated search fails.
    """
    if not HAS_REQUESTS or not HAS_BS4:
        return None

    # Try the public consultation endpoint
    # SIGER has a public RFC lookup (no login required for basic info)
    try:
        # Public search URL pattern (adjust if SIGER changes structure)
        url = f'{SIGER_BASE}/Siger/consultant/buscaRFC.jsf'
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, 'html.parser')
        viewstate = ''
        vs_input = soup.find('input', {'name': 'javax.faces.ViewState'})
        if vs_input:
            viewstate = vs_input.get('value', '')

        # Submit RFC search
        payload = {
            'javax.faces.ViewState': viewstate,
            'formBusqueda:rfcEmpresa': rfc,
            'formBusqueda:btnBuscar': 'Buscar',
            'formBusqueda': 'formBusqueda',
        }
        resp2 = session.post(url, data=payload, timeout=20)
        if resp2.status_code != 200:
            return None

        return parse_siger_result(resp2.text, rfc)

    except Exception as e:
        print(f'  SIGER scrape error for {rfc}: {e}')
        return None


def parse_siger_result(html: str, rfc: str) -> dict | None:
    """Parse SIGER search result HTML into a dict."""
    if not HAS_BS4:
        return None

    soup = BeautifulSoup(html, 'html.parser')
    result = {'rfc': rfc, 'raw_found': False}

    # Look for company name (h2, h3, or span with razon social)
    # These selectors may need adjustment based on SIGER's actual HTML structure
    for tag in ['h2', 'h3', 'span.razonSocial', 'td.razonSocial', '.empresa-nombre']:
        el = soup.select_one(tag)
        if el and el.text.strip():
            result['razon_social'] = el.text.strip()
            result['raw_found'] = True
            break

    if not result['raw_found']:
        # Check for "no results" message
        text = soup.get_text().lower()
        if 'no se encontr' in text or 'sin resultados' in text:
            result['status'] = 'NOT_FOUND'
            return result
        return None

    # Extract status
    status_el = soup.select_one('.estatus, .status, [class*="estatus"]')
    if status_el:
        result['status'] = status_el.text.strip().upper()

    # Extract incorporation date
    for label in ['fecha de constituci', 'fecha constituci', 'constituci']:
        el = soup.find(text=re.compile(label, re.IGNORECASE))
        if el:
            parent = el.parent.parent if el.parent else None
            if parent:
                sibling = parent.find_next_sibling()
                if sibling:
                    result['fecha_constitucion'] = sibling.text.strip()

    # Extract objeto social
    for label in ['objeto social', 'giro']:
        el = soup.find(text=re.compile(label, re.IGNORECASE))
        if el:
            parent = el.parent.parent if el.parent else None
            if parent:
                sibling = parent.find_next_sibling()
                if sibling:
                    result['objeto_social'] = sibling.text.strip()[:500]

    # Extract capital social
    cap_el = soup.find(text=re.compile(r'capital social', re.IGNORECASE))
    if cap_el and cap_el.parent:
        sibling = cap_el.parent.find_next_sibling()
        if sibling:
            result['capital_social'] = sibling.text.strip()

    return result


# ── DB operations ──────────────────────────────────────────────────────────────

def save_siger_result(conn, vendor_id: int, data: dict | None):
    """Save SIGER scraping result to company_registry."""
    now = datetime.now().isoformat()

    if data is None:
        conn.execute('''
            UPDATE company_registry SET
                siger_scraped = 1,
                siger_status = 'SCRAPE_FAILED',
                siger_scraped_at = ?
            WHERE vendor_id = ?
        ''', (now, vendor_id))
    elif data.get('status') == 'NOT_FOUND':
        conn.execute('''
            UPDATE company_registry SET
                siger_scraped = 1,
                siger_status = 'NOT_FOUND',
                siger_scraped_at = ?
            WHERE vendor_id = ?
        ''', (now, vendor_id))
    else:
        conn.execute('''
            UPDATE company_registry SET
                siger_scraped = 1,
                siger_status = ?,
                siger_razon_social = ?,
                siger_objeto_social = ?,
                siger_cap_social = ?,
                siger_scraped_at = ?
            WHERE vendor_id = ?
        ''', (
            data.get('status'),
            data.get('razon_social'),
            data.get('objeto_social'),
            data.get('capital_social'),
            now, vendor_id
        ))


def get_vendors_to_scrape(conn, limit: int | None = None, aria_only: bool = False) -> list[tuple]:
    """Get vendors with valid RFCs that haven't been scraped yet."""
    base = '''
        SELECT cr.vendor_id, v.name, cr.rfc
        FROM company_registry cr
        JOIN vendors v ON v.id = cr.vendor_id
        WHERE cr.rfc_valid = 1
          AND cr.siger_scraped = 0
    '''
    if aria_only:
        base += ' AND cr.vendor_id IN (SELECT DISTINCT vendor_id FROM aria_queue)'
    base += ' ORDER BY cr.shell_score DESC, cr.rfc_inc_year DESC'
    if limit:
        base += f' LIMIT {limit}'
    return conn.execute(base).fetchall()


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Scrape SIGER company registry')
    parser.add_argument('--test-rfc', type=str, help='Test scrape a single RFC')
    parser.add_argument('--from-aria-queue', action='store_true', help='Only scrape vendors in ARIA queue')
    parser.add_argument('--limit', type=int, default=50, help='Max vendors to scrape per run')
    parser.add_argument('--resume', action='store_true', help='Skip already-scraped vendors')
    parser.add_argument('--user', type=str, help='SIGER username')
    parser.add_argument('--password', type=str, help='SIGER password')
    parser.add_argument('--no-login', action='store_true', help='Use public search only (no auth)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be scraped, do not request')
    args = parser.parse_args()

    if not HAS_REQUESTS:
        print('ERROR: Install requests: pip install requests beautifulsoup4')
        sys.exit(1)

    conn = sqlite3.connect(DB)
    conn.execute('PRAGMA journal_mode=WAL')

    # Check that company_registry exists
    tbl = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='company_registry'").fetchone()
    if not tbl:
        print('ERROR: Run centinela_build_registry.py first to create the schema and do RFC analysis.')
        sys.exit(1)

    # Setup session
    session = create_session()

    # Login if credentials provided
    logged_in = False
    if not args.no_login:
        user = args.user or os.environ.get('SIGER_USER')
        pwd = args.password or os.environ.get('SIGER_PASS')
        if not user or not pwd:
            # Try credential file
            user, pwd = get_credentials()
        if user and pwd:
            print(f'Attempting SIGER login as {user}...')
            logged_in = login_siger(session, user, pwd)
        else:
            print('No SIGER credentials found. Using public search only.')
            print('  Set SIGER_USER + SIGER_PASS env vars, or create backend/.siger_credentials')
            print('  Or run with --no-login flag to suppress this message.')

    # Test single RFC
    if args.test_rfc:
        rfc = args.test_rfc.strip().upper()
        print(f'Testing scrape for RFC: {rfc}')
        result = scrape_by_rfc(session, rfc)
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
        conn.close()
        return

    # Get vendor list
    vendors = get_vendors_to_scrape(conn, limit=args.limit, aria_only=args.from_aria_queue)
    print(f'\nVendors to scrape: {len(vendors)} (limit={args.limit})')

    if args.dry_run:
        print('\nDRY RUN — would scrape:')
        for vid, name, rfc in vendors[:20]:
            print(f'  VID={vid:7d} {rfc:<15} {name[:50]}')
        conn.close()
        return

    scraped = 0
    found = 0
    not_found = 0
    failed = 0

    for i, (vid, name, rfc) in enumerate(vendors):
        print(f'  [{i+1}/{len(vendors)}] VID={vid} RFC={rfc} {name[:40]}...', end=' ', flush=True)

        result = scrape_by_rfc(session, rfc)

        if result is None:
            print('FAILED')
            failed += 1
        elif result.get('status') == 'NOT_FOUND':
            print('NOT FOUND')
            not_found += 1
        else:
            status = result.get('status', '?')
            razon = (result.get('razon_social') or '')[:30]
            print(f'OK ({status}) {razon}')
            found += 1

        save_siger_result(conn, vid, result)
        scraped += 1

        # Commit every BATCH_SIZE
        if scraped % BATCH_SIZE == 0:
            conn.commit()
            print(f'  [Checkpoint: {scraped} scraped]')

        # Rate limiting
        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        time.sleep(delay)

    conn.commit()

    print(f'\n{"─"*50}')
    print(f'Scraping complete: {scraped} processed')
    print(f'  Found:     {found}')
    print(f'  Not found: {not_found}')
    print(f'  Failed:    {failed}')
    conn.close()


if __name__ == '__main__':
    main()
