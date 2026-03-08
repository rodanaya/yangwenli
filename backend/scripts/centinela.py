#!/usr/bin/env python3
"""
CENTINELA — Unified External Registry Scraper & Monitor

"The sentinel who watches while others sleep." — Yang Wen-li

Coordinates scraping and loading of all external Mexican government registries
that cross-reference with RUBLI procurement data. Uses Playwright for web-only
portals and httpx for direct CSV/API downloads.

Registries monitored:
    1. SAT EFOS Art. 69-B     — Ghost company blacklist (CSV + web fallback)
    2. SFP Sanctions           — Barred vendor list (CSV)
    3. RUPC                    — Vendor compliance registry (web-only since 2025)
    4. ASF Cuenta Pública      — Audit findings (Wayback PDFs)
    5. ComprasMX               — New procurement portal (web-only)

Usage:
    # Run all registries
    python -m scripts.centinela --all

    # Run specific registry
    python -m scripts.centinela --registry efos
    python -m scripts.centinela --registry sfp
    python -m scripts.centinela --registry rupc

    # Dry run (no DB writes)
    python -m scripts.centinela --all --dry-run

    # Check freshness only (how stale is our data?)
    python -m scripts.centinela --status

    # Use Playwright for web-only registries (RUPC, ComprasMX)
    python -m scripts.centinela --registry rupc --use-playwright
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import argparse
import json
import logging
import sqlite3
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CENTINELA] %(levelname)s %(message)s",
)
logger = logging.getLogger("centinela")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# Registry Definitions
# ──────────────────────────────────────────────────────────────────────────────

REGISTRIES = {
    "efos": {
        "name": "SAT EFOS Art. 69-B",
        "description": "Ghost company blacklist (Empresas Fantasma)",
        "table": "sat_efos_vendors",
        "freshness_days": 30,  # Updated monthly by SAT
        "method": "csv",
        "url": "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm",
        "csv_url": "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Listado_Completo_69_articulo69.csv",
    },
    "sfp": {
        "name": "SFP Sanctioned Providers",
        "description": "Vendors barred from government contracting",
        "table": "sfp_sanctions",
        "freshness_days": 7,  # Updated weekly
        "method": "csv",
        "url": "https://datosabiertos.funcionpublica.gob.mx/datosabiertos/sanc/proveedores_sancionados.csv",
    },
    "rupc": {
        "name": "RUPC Vendor Registry",
        "description": "Vendor compliance grades (web-only since Apr 2025)",
        "table": "rupc_vendors",
        "freshness_days": 90,  # Quarterly refresh
        "method": "playwright",
        "url": "https://comprasmx.buengobierno.gob.mx/rupc",
    },
    "asf": {
        "name": "ASF Audit Findings",
        "description": "Auditoría Superior de la Federación (via Wayback)",
        "table": "asf_cases",
        "freshness_days": 180,  # Annual reports
        "method": "wayback_pdf",
    },
    "rfc": {
        "name": "RFC Validation & Shell Scoring",
        "description": "Offline RFC validator + EFOS/SFP cross-ref → company_registry",
        "table": "company_registry",
        "freshness_days": 30,  # Rebuild monthly or after EFOS/SFP refresh
        "method": "offline",
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Status & Freshness
# ──────────────────────────────────────────────────────────────────────────────

def get_registry_status(conn: sqlite3.Connection) -> list[dict]:
    """Check freshness of each registry table."""
    statuses = []
    for key, reg in REGISTRIES.items():
        table = reg["table"]
        try:
            row = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
            count = row[0] if row else 0
        except sqlite3.OperationalError:
            count = 0

        # Find most recent load timestamp
        last_loaded = None
        for col in ("loaded_at", "scraped_at", "analyzed_at"):
            try:
                row = conn.execute(
                    f"SELECT MAX({col}) FROM {table}"
                ).fetchone()
                if row and row[0]:
                    last_loaded = row[0]
                    break
            except sqlite3.OperationalError:
                continue

        days_old = None
        is_stale = True
        if last_loaded:
            try:
                dt = datetime.fromisoformat(last_loaded.replace("Z", "+00:00"))
                days_old = (datetime.now() - dt.replace(tzinfo=None)).days
                is_stale = days_old > reg["freshness_days"]
            except (ValueError, TypeError):
                pass

        statuses.append({
            "key": key,
            "name": reg["name"],
            "records": count,
            "last_loaded": last_loaded,
            "days_old": days_old,
            "freshness_target": reg["freshness_days"],
            "is_stale": is_stale,
            "method": reg["method"],
        })
    return statuses


def print_status(statuses: list[dict]) -> None:
    """Pretty-print registry freshness status."""
    print("\n" + "=" * 72)
    print("  CENTINELA — External Registry Status")
    print("=" * 72)
    for s in statuses:
        icon = "STALE" if s["is_stale"] else "  OK "
        age = f"{s['days_old']}d old" if s["days_old"] is not None else "never loaded"
        target = f"(target: {s['freshness_target']}d)"
        print(f"  {icon} {s['name']:<30} {s['records']:>8,} records | {age:<15} {target}")
    print("=" * 72 + "\n")


# ──────────────────────────────────────────────────────────────────────────────
# Registry-specific scrapers
# ──────────────────────────────────────────────────────────────────────────────

def refresh_efos(dry_run: bool = False) -> dict:
    """Refresh SAT EFOS ghost company list."""
    logger.info("Refreshing SAT EFOS Art. 69-B ...")

    # Try existing loader
    from scripts.load_sat_efos import download_and_parse, load_from_file, save_to_db, print_stage_summary

    # Try local files first (more reliable than SAT servers)
    local_files = sorted(DATA_DIR.glob("efos_*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    records = []
    for f in local_files:
        if "global" in f.name or "completo" in f.name:
            records = load_from_file(str(f))
            if records:
                logger.info(f"Loaded {len(records)} records from local file: {f.name}")
                break

    if not records:
        # Try download
        records = download_and_parse(REGISTRIES["efos"]["csv_url"])

    if not records:
        logger.warning("EFOS: No records obtained. SAT servers may be down.")
        return {"status": "failed", "records": 0}

    print_stage_summary(records)

    if dry_run:
        logger.info(f"EFOS dry run: {len(records)} records would be saved")
        return {"status": "dry_run", "records": len(records)}

    result = save_to_db(records)
    return {"status": "ok", **result}


def refresh_sfp(dry_run: bool = False) -> dict:
    """Refresh SFP sanctions list."""
    logger.info("Refreshing SFP Sanctioned Providers ...")

    from scripts.load_sfp_sanctions import load_from_url, save_to_db

    records = load_from_url(REGISTRIES["sfp"]["url"])
    if not records:
        logger.warning("SFP: No records obtained.")
        return {"status": "failed", "records": 0}

    if dry_run:
        logger.info(f"SFP dry run: {len(records)} records would be saved")
        return {"status": "dry_run", "records": len(records)}

    count = save_to_db(records)
    return {"status": "ok", "records": count}


def refresh_rupc(dry_run: bool = False, use_playwright: bool = False) -> dict:
    """
    Refresh RUPC vendor registry.
    Since CompraNet was abolished (Apr 2025), RUPC is web-only.
    Uses Playwright to scrape the web interface.
    """
    logger.info("Refreshing RUPC Vendor Registry ...")

    if not use_playwright:
        # Try the old URL first (may still work for cached/archived data)
        from scripts.load_rupc import download_and_parse, save_to_db
        records = download_and_parse(REGISTRIES["rupc"]["url"])
        if records:
            if dry_run:
                return {"status": "dry_run", "records": len(records)}
            count = save_to_db(records)
            return {"status": "ok", "records": count}

        logger.info("RUPC CSV unavailable (expected since Apr 2025). Use --use-playwright to scrape web portal.")
        return {"status": "skipped", "records": 0, "reason": "web-only, needs --use-playwright"}

    # Playwright-based scraping
    return _scrape_rupc_playwright(dry_run)


def _scrape_rupc_playwright(dry_run: bool = False) -> dict:
    """Scrape RUPC via Playwright browser automation."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("playwright not installed. Run: pip install playwright && playwright install chromium")
        return {"status": "failed", "reason": "playwright not installed"}

    records = []
    logger.info("Launching Playwright browser for RUPC scraping ...")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                locale="es-MX",
            )
            page = context.new_page()

            # Navigate to RUPC search
            page.goto(REGISTRIES["rupc"]["url"], wait_until="networkidle", timeout=30000)
            logger.info(f"Page loaded: {page.title()}")

            # The RUPC interface typically has a search form
            # We'll search for common vendor patterns and paginate
            # This is a best-effort scraper — the portal may require
            # specific search terms (no bulk listing available)

            # Try to find the search form and results table
            page.wait_for_timeout(3000)

            # Check if there's a search/query interface
            snapshot = page.content()
            if "buscar" in snapshot.lower() or "search" in snapshot.lower():
                logger.info("RUPC search form detected. Performing sample queries ...")

                # Search by common letters to enumerate vendors
                # This is a pragmatic approach since bulk download is unavailable
                search_terms = ["SA DE CV", "SC", "SPR"]
                for term in search_terms:
                    try:
                        # Look for search input
                        search_input = page.query_selector(
                            'input[type="text"], input[name*="busca"], input[placeholder*="Buscar"]'
                        )
                        if search_input:
                            search_input.fill(term)
                            # Submit
                            submit_btn = page.query_selector(
                                'button[type="submit"], input[type="submit"], button:has-text("Buscar")'
                            )
                            if submit_btn:
                                submit_btn.click()
                                page.wait_for_timeout(3000)

                            # Extract table rows
                            rows = page.query_selector_all("table tbody tr")
                            for row in rows:
                                cells = row.query_selector_all("td")
                                if len(cells) >= 3:
                                    records.append({
                                        "rfc": (cells[0].inner_text() or "").strip(),
                                        "company_name": (cells[1].inner_text() or "").strip(),
                                        "compliance_grade": (cells[2].inner_text() or "").strip() if len(cells) > 2 else None,
                                        "status": (cells[3].inner_text() or "").strip() if len(cells) > 3 else None,
                                    })
                            logger.info(f"  '{term}': found {len(rows)} rows")
                    except Exception as e:
                        logger.warning(f"  Search for '{term}' failed: {e}")
                    time.sleep(2)  # Rate limit

            browser.close()

    except Exception as e:
        logger.error(f"Playwright RUPC scrape failed: {e}")
        return {"status": "failed", "reason": str(e)}

    # Deduplicate by RFC
    seen = set()
    unique = []
    for r in records:
        if r["rfc"] and r["rfc"] not in seen:
            seen.add(r["rfc"])
            unique.append(r)
    records = unique

    logger.info(f"RUPC: scraped {len(records)} unique vendor records")

    if dry_run:
        return {"status": "dry_run", "records": len(records)}

    if records:
        from scripts.load_rupc import save_to_db
        count = save_to_db(records)
        return {"status": "ok", "records": count}

    return {"status": "ok", "records": 0}


def refresh_asf(dry_run: bool = False, year: int = 2021) -> dict:
    """Refresh ASF audit findings via Wayback Machine."""
    logger.info(f"Refreshing ASF Cuenta Pública (FY{year}) via Wayback ...")

    # Delegate to existing wayback scraper
    cmd = [sys.executable, "-m", "scripts.scrape_asf_wayback", "--year", str(year), "--limit", "100"]
    if dry_run:
        cmd.append("--dry-run")

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600, cwd=str(DB_PATH.parent)
        )
        if result.returncode == 0:
            logger.info(f"ASF scrape completed:\n{result.stdout[-500:]}")
            return {"status": "ok"}
        else:
            logger.warning(f"ASF scrape failed: {result.stderr[-500:]}")
            return {"status": "failed", "reason": result.stderr[-200:]}
    except subprocess.TimeoutExpired:
        logger.warning("ASF scrape timed out (10 min limit)")
        return {"status": "timeout"}


# ──────────────────────────────────────────────────────────────────────────────
# Cross-reference: match new registry entries to existing vendors
# ──────────────────────────────────────────────────────────────────────────────

def cross_reference_new_entries(conn: sqlite3.Connection) -> dict:
    """
    After refreshing registries, cross-reference new entries against
    existing RUBLI vendors by RFC to find matches.
    """
    results = {}

    # EFOS → vendors (by RFC)
    try:
        efos_matches = conn.execute("""
            SELECT COUNT(DISTINCT v.id)
            FROM vendors v
            JOIN sat_efos_vendors e ON UPPER(v.rfc) = UPPER(e.rfc)
            WHERE e.stage = 'definitivo'
        """).fetchone()[0]
        results["efos_vendor_matches"] = efos_matches
    except sqlite3.OperationalError:
        results["efos_vendor_matches"] = 0

    # SFP → vendors (by RFC)
    try:
        sfp_matches = conn.execute("""
            SELECT COUNT(DISTINCT v.id)
            FROM vendors v
            JOIN sfp_sanctions s ON UPPER(v.rfc) = UPPER(s.rfc)
            WHERE s.rfc IS NOT NULL
        """).fetchone()[0]
        results["sfp_vendor_matches"] = sfp_matches
    except sqlite3.OperationalError:
        results["sfp_vendor_matches"] = 0

    logger.info(f"Cross-reference results: {results}")
    return results


# ──────────────────────────────────────────────────────────────────────────────
# Freshness log
# ──────────────────────────────────────────────────────────────────────────────

def log_run(conn: sqlite3.Connection, registry: str, status: str, records: int) -> None:
    """Log a scrape run to centinela_log table."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS centinela_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            registry TEXT NOT NULL,
            status TEXT NOT NULL,
            records_processed INTEGER DEFAULT 0,
            run_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute(
        "INSERT INTO centinela_log (registry, status, records_processed) VALUES (?, ?, ?)",
        (registry, status, records),
    )
    conn.commit()


# ──────────────────────────────────────────────────────────────────────────────
# RFC Validation + Shell Scoring (offline, no network required)
# ──────────────────────────────────────────────────────────────────────────────

_ALNUM = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
_RFC_BLACKLIST = {
    'BUE','CAC','COC','CUE','FEL','GUE','JOT','LOC','MAM','MEA',
    'MIE','MOC','MON','NAC','OCC','PED','PEN','PIS','PUT','QUI',
    'RAT','RON','SCR','SER','SEX','TEM'
}
_RFC_PLACEHOLDERS = {'XAXX010101000', 'XEXX010101000'}

from datetime import date as _date


def _validate_rfc(rfc: str) -> dict:
    """Validate Mexican RFC. Returns dict: valid, entity_type, inc_date, error, birth_year."""
    r = {'valid': False, 'entity_type': None, 'inc_date': None, 'error': None, 'birth_year': None}
    if not rfc:
        r['error'] = 'no_rfc'; return r
    rfc = rfc.strip().upper()
    if rfc in _RFC_PLACEHOLDERS:
        r['error'] = 'placeholder'; return r
    if len(rfc) == 12:
        entity, letters, date_part, hclave = 'moral', rfc[:3], rfc[3:9], rfc[9:12]
    elif len(rfc) == 13:
        entity, letters, date_part, hclave = 'fisica', rfc[:4], rfc[4:10], rfc[10:13]
    else:
        r['error'] = f'bad_length_{len(rfc)}'; return r
    if not letters.isalpha():
        r['error'] = 'non_alpha_prefix'; return r
    if entity == 'moral' and letters[:3] in _RFC_BLACKLIST:
        r['error'] = 'blacklisted_prefix'; return r
    if not all(c in _ALNUM for c in hclave):
        r['error'] = 'bad_homoclave'; return r
    try:
        yy, mm, dd = int(date_part[:2]), int(date_part[2:4]), int(date_part[4:6])
        if not (1 <= mm <= 12 and 1 <= dd <= 31):
            r['error'] = 'bad_date'; return r
        full_year = 2000 + yy if yy <= 25 else 1900 + yy
        try:
            inc = _date(full_year, mm, dd)
        except ValueError:
            inc = _date(full_year, mm, 1)
        r['inc_date'] = inc
        r['birth_year'] = full_year
    except (ValueError, IndexError):
        r['error'] = 'bad_date'; return r
    r['valid'] = True
    r['entity_type'] = entity
    return r


_COMPANY_REGISTRY_DDL = """
CREATE TABLE IF NOT EXISTS company_registry (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id       INTEGER NOT NULL UNIQUE,
    rfc             TEXT,
    rfc_valid       INTEGER,
    rfc_entity_type TEXT,
    rfc_inc_year    INTEGER,
    rfc_inc_date    TEXT,
    rfc_age_years   REAL,
    rfc_error       TEXT,
    efos_stage      TEXT,
    sfp_sanctioned  INTEGER DEFAULT 0,
    sfp_sanction_type TEXT,
    shell_score     INTEGER,
    shell_flags     TEXT,
    siger_scraped   INTEGER DEFAULT 0,
    siger_status    TEXT,
    siger_razon_social TEXT,
    siger_objeto_social TEXT,
    siger_cap_social TEXT,
    siger_scraped_at TEXT,
    analyzed_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cr_vendor  ON company_registry(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cr_rfc     ON company_registry(rfc);
CREATE INDEX IF NOT EXISTS idx_cr_shell   ON company_registry(shell_score DESC);
CREATE INDEX IF NOT EXISTS idx_cr_efos    ON company_registry(efos_stage);
"""


def refresh_rfc(dry_run: bool = False, conn_override: sqlite3.Connection | None = None) -> dict:
    """
    Build/refresh company_registry via offline RFC validation + EFOS/SFP cross-reference.
    Safe to rerun — uses INSERT OR REPLACE (idempotent).
    """
    logger.info("Rebuilding company_registry (RFC validation + cross-refs) ...")
    conn = conn_override or sqlite3.connect(str(DB_PATH))

    # Create schema
    for stmt in _COMPANY_REGISTRY_DDL.strip().split(';'):
        s = stmt.strip()
        if s:
            conn.execute(s)
    conn.commit()

    # Load cross-ref indices
    efos_idx: dict[str, str] = {}
    try:
        for rfc, stage in conn.execute("SELECT rfc, stage FROM sat_efos_vendors WHERE rfc IS NOT NULL"):
            efos_idx[rfc.strip().upper()] = stage
        logger.info(f"  EFOS index: {len(efos_idx):,}")
    except sqlite3.OperationalError:
        logger.warning("  sat_efos_vendors unavailable")

    sfp_idx: dict[str, str] = {}
    try:
        for rfc, tipo in conn.execute("SELECT rfc, sanction_type FROM sfp_sanctions WHERE rfc IS NOT NULL"):
            sfp_idx[rfc.strip().upper()] = tipo
        logger.info(f"  SFP index: {len(sfp_idx):,}")
    except sqlite3.OperationalError:
        logger.warning("  sfp_sanctions unavailable")

    today = _date.today()
    now = datetime.now().isoformat()

    vendors = conn.execute("SELECT id, rfc FROM vendors").fetchall()
    logger.info(f"  Processing {len(vendors):,} vendors ...")

    stats = dict(no_rfc=0, invalid=0, valid=0, efos=0, sfp=0, shell_high=0)
    rows = []

    for vid, rfc in vendors:
        rfc_clean = rfc.strip().upper() if rfc else None
        v = _validate_rfc(rfc_clean) if rfc_clean else {'valid': False, 'error': 'no_rfc',
            'entity_type': None, 'inc_date': None, 'birth_year': None}

        if not rfc_clean: stats['no_rfc'] += 1
        elif v['valid']: stats['valid'] += 1
        else: stats['invalid'] += 1

        inc = v.get('inc_date')
        age = round((today - inc).days / 365.25, 2) if inc else None

        efos = efos_idx.get(rfc_clean) if rfc_clean else None
        sfp_tipo = sfp_idx.get(rfc_clean) if rfc_clean else None
        if efos: stats['efos'] += 1
        if sfp_tipo: stats['sfp'] += 1

        # Shell score
        score = 0
        flags = []
        if not rfc_clean:
            score += 4; flags.append('NO_RFC')
        elif not v['valid']:
            score += 3; flags.append(f"INVALID_RFC:{v.get('error','?')}")
        elif age is not None:
            if age < 2: score += 2; flags.append(f'NEW_COMPANY_{int(age*12)}mo')
            elif age < 5: score += 1; flags.append(f'YOUNG_COMPANY_{int(age)}yr')
        if efos == 'definitivo': score += 5; flags.append('EFOS_DEFINITIVO')
        elif efos == 'presunto': score += 2; flags.append('EFOS_PRESUNTO')
        if sfp_tipo: score += 3; flags.append(f'SFP:{sfp_tipo[:20]}')
        score = min(score, 10)
        if score >= 5: stats['shell_high'] += 1

        rows.append((
            vid, rfc_clean,
            1 if v['valid'] else (0 if rfc_clean else None),
            v.get('entity_type'), v.get('birth_year'),
            inc.isoformat() if inc else None, age,
            v.get('error') if not v['valid'] else None,
            efos, sfp_tipo is not None, sfp_tipo,
            score, json.dumps(flags), now,
        ))

    if dry_run:
        logger.info(f"Dry run: {len(rows):,} rows would be upserted")
        return {"status": "dry_run", "records": len(rows)}

    conn.executemany('''
        INSERT OR REPLACE INTO company_registry
        (vendor_id, rfc, rfc_valid, rfc_entity_type, rfc_inc_year, rfc_inc_date,
         rfc_age_years, rfc_error, efos_stage, sfp_sanctioned, sfp_sanction_type,
         shell_score, shell_flags, analyzed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', rows)
    conn.commit()

    logger.info(
        f"company_registry: {len(rows):,} upserted | "
        f"no_rfc={stats['no_rfc']:,} invalid={stats['invalid']:,} valid={stats['valid']:,} | "
        f"efos={stats['efos']} sfp={stats['sfp']} shell_high={stats['shell_high']}"
    )

    if not conn_override:
        conn.close()

    return {"status": "ok", "records": len(rows), **stats}


# ──────────────────────────────────────────────────────────────────────────────
# Main orchestrator
# ──────────────────────────────────────────────────────────────────────────────

REFRESH_FNS = {
    "efos": refresh_efos,
    "sfp": refresh_sfp,
    "rfc": refresh_rfc,
    "rupc": refresh_rupc,
    "asf": refresh_asf,
}


def main():
    parser = argparse.ArgumentParser(
        description="CENTINELA — Unified External Registry Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scripts.centinela --status          # Check freshness
  python -m scripts.centinela --all             # Refresh all registries
  python -m scripts.centinela --registry efos   # Refresh just EFOS
  python -m scripts.centinela --registry rupc --use-playwright  # Web scraping
        """,
    )
    parser.add_argument("--status", action="store_true", help="Show registry freshness status")
    parser.add_argument("--all", action="store_true", help="Refresh all registries")
    parser.add_argument("--registry", choices=list(REGISTRIES.keys()), help="Refresh specific registry")
    parser.add_argument("--stale-only", action="store_true", help="Only refresh stale registries")
    parser.add_argument("--dry-run", action="store_true", help="Parse but don't write to DB")
    parser.add_argument("--use-playwright", action="store_true", help="Use Playwright for web-only registries")
    parser.add_argument("--cross-ref", action="store_true", help="Run cross-reference after refresh")
    parser.add_argument("--trigger-aria", action="store_true",
                        help="Re-run ARIA pipeline after refreshing (updates IPS with fresh external data)")
    args = parser.parse_args()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 30000")

    if args.status or (not args.all and not args.registry):
        statuses = get_registry_status(conn)
        print_status(statuses)
        conn.close()
        return

    # Determine which registries to refresh
    targets = []
    if args.all:
        targets = list(REGISTRIES.keys())
    elif args.registry:
        targets = [args.registry]

    if args.stale_only:
        statuses = get_registry_status(conn)
        stale_keys = {s["key"] for s in statuses if s["is_stale"]}
        targets = [t for t in targets if t in stale_keys]
        logger.info(f"Stale registries: {stale_keys}")

    # Execute refreshes
    results = {}
    for key in targets:
        logger.info(f"\n{'─' * 60}")
        logger.info(f"Refreshing: {REGISTRIES[key]['name']}")
        logger.info(f"{'─' * 60}")

        fn = REFRESH_FNS[key]
        kwargs = {"dry_run": args.dry_run}
        if key == "rupc":
            kwargs["use_playwright"] = args.use_playwright

        try:
            result = fn(**kwargs)
            results[key] = result
            if not args.dry_run:
                log_run(conn, key, result.get("status", "unknown"), result.get("records", 0))
        except Exception as e:
            logger.error(f"Failed to refresh {key}: {e}", exc_info=True)
            results[key] = {"status": "error", "reason": str(e)}
            if not args.dry_run:
                log_run(conn, key, "error", 0)

    # Cross-reference
    if args.cross_ref and not args.dry_run:
        logger.info("\nRunning cross-reference ...")
        xref = cross_reference_new_entries(conn)
        results["cross_reference"] = xref

    # Summary
    print("\n" + "=" * 60)
    print("  CENTINELA Run Summary")
    print("=" * 60)
    for key, result in results.items():
        status = result.get("status", "unknown")
        records = result.get("records", "—")
        icon = {"ok": "OK", "dry_run": "~", "skipped": "--", "failed": "!!", "error": "!!"}.get(status, "?")
        name = REGISTRIES.get(key, {}).get("name", key)
        print(f"  {icon} {name:<30} {status:<10} {records} records")
    print("=" * 60)

    conn.close()


if __name__ == "__main__":
    main()
