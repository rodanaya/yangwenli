"""
Scrape ASF (Auditoría Superior de la Federación) audit findings via Wayback Machine.

The ASF website (asf.gob.mx, informe.asf.gob.mx) has a broken TLS handshake on all
subdomains as of 2026. This script uses the Internet Archive Wayback Machine to access
archived PDF copies of individual audit reports (Informe Individual del Resultado de la
Fiscalización Superior de la Cuenta Pública).

Data source:
  Wayback CDX API → informe.asf.gob.mx/Documentos/Auditorias/{YEAR}_{NN}_a.pdf
  Coverage: ~2,050 PDFs for FY2021, ~1,617 for FY2020

PDF structure (page 1):
  Grupo Funcional {Group}         ← functional/thematic group
  {Entity Name}                   ← audited government entity
  {Audit Topic}                   ← program or subject audited
  Auditoría {Type}: {Full Audit ID}  ← type + unique identifier

Amounts (page 2 table):
  "Total  {importe_ejercido}  {importe_revisado}"  ← thousands of MXN

Usage:
    python -m scripts.scrape_asf_wayback [--year 2021] [--limit 500] [--batch 10]

    # Dry run (no DB writes):
    python -m scripts.scrape_asf_wayback --dry-run

    # Resume from where it left off (skips already-inserted audit IDs):
    python -m scripts.scrape_asf_wayback --year 2021
"""
import argparse
import io
import logging
import re
import sqlite3
import time
import warnings
from datetime import datetime
from pathlib import Path

import pdfplumber
import requests

warnings.filterwarnings("ignore", message="Unverified HTTPS")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
WAYBACK_CDX = "http://web.archive.org/cdx/search/cdx"
WAYBACK_BASE = "http://web.archive.org/web"
INFORME_BASE = "informe.asf.gob.mx/Documentos/Auditorias"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

# Map functional group keywords to our sector taxonomy
GRUPO_TO_SECTOR = {
    "Desarrollo Social": "salud",
    "Gobierno": "gobernacion",
    "Desarrollo Económico": "infraestructura",
    "Gasto Federalizado": "otros",
    "Deuda": "hacienda",
}


# ──────────────────────────────────────────────────────────────────────────────
# Wayback discovery
# ──────────────────────────────────────────────────────────────────────────────

def get_archived_urls(year: int, limit: int = 3000) -> list[tuple[str, str]]:
    """
    Returns [(wayback_timestamp, original_url), ...] for all audit PDFs of a
    given fiscal year that are archived in Wayback with HTTP 200.

    Discovery strategy:
    1. Primary: Fetch the archived informe.asf.gob.mx index page (Dec 2022 snapshot),
       extract audit PDF links, then query CDX for each to get a valid timestamp.
    2. Fallback: Use CDX prefix search if primary fails.
    """
    session = requests.Session()
    session.headers.update(HEADERS)

    # ── Strategy 1: Extract audit IDs from archived informe index ──
    logger.info(f"Fetching informe.asf.gob.mx index for FY{year} ...")
    index_audit_ids: list[str] = []
    try:
        from bs4 import BeautifulSoup
        # Known working snapshots of the informe.asf.gob.mx root page
        index_snapshots = {
            2021: "20221204004324",  # Dec 2022 — lists all FY2021 audits
            2020: "20210222231154",  # Feb 2021 — lists all FY2020 audits
        }
        snapshot_ts = index_snapshots.get(year)
        if snapshot_ts:
            index_url = f"{WAYBACK_BASE}/{snapshot_ts}if_/https://informe.asf.gob.mx/"
            r_idx = session.get(index_url, timeout=30)
            if r_idx.ok:
                soup = BeautifulSoup(r_idx.text, "lxml")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    m = re.search(rf"Documentos/Auditorias/({year}_\d+_\w+)\.pdf", href, re.IGNORECASE)
                    if m:
                        index_audit_ids.append(m.group(1))
                index_audit_ids = list(dict.fromkeys(index_audit_ids))  # deduplicate preserving order
                logger.info(f"  Found {len(index_audit_ids)} audit IDs from index page")
    except Exception as e:
        logger.warning(f"  Index fetch failed: {e}")

    # ── Strategy 2: CDX prefix search (fallback or supplement) ──
    cdx_urls: list[tuple[str, str]] = []
    if len(index_audit_ids) < 10:
        logger.info("Falling back to Wayback CDX prefix search ...")
        for attempt in range(3):
            try:
                r_cdx = session.get(
                    WAYBACK_CDX,
                    params={
                        "url": f"{INFORME_BASE}/{year}_",
                        "matchType": "prefix",
                        "output": "json",
                        "limit": min(limit, 500),
                        "fl": "timestamp,original,statuscode",
                        "filter": "statuscode:200",
                        "collapse": "urlkey",
                    },
                    timeout=60,
                )
                rows = r_cdx.json()
                cdx_urls = [(row[0], row[1]) for row in rows[1:]]
                logger.info(f"  CDX found {len(cdx_urls)} URLs")
                break
            except Exception as e:
                logger.warning(f"  CDX attempt {attempt+1}/3 failed: {e}")
                time.sleep(5)

    # ── Build final list ──
    if index_audit_ids:
        # Use a known-good timestamp for each audit ID
        # For FY2021: archived Nov 2022 and Mar 2023
        ts_guess = "20221101173457" if year == 2021 else "20210222231154"
        urls = [
            (ts_guess, f"https://informe.asf.gob.mx/Documentos/Auditorias/{aid}.pdf")
            for aid in index_audit_ids[:limit]
        ]
        # Try to get better (per-file) timestamps from CDX for accuracy
        if cdx_urls:
            cdx_map = {u: ts for ts, u in cdx_urls}
            urls = [
                (cdx_map.get(original, ts_guess), original)
                for ts_guess, original in urls
            ]
        return urls[:limit]

    return cdx_urls[:limit]


# ──────────────────────────────────────────────────────────────────────────────
# PDF download + parse
# ──────────────────────────────────────────────────────────────────────────────

def fetch_pdf_bytes(timestamp: str, original_url: str, session: requests.Session) -> bytes | None:
    """Download PDF from Wayback. Returns raw bytes or None on failure."""
    wayback_url = f"{WAYBACK_BASE}/{timestamp}if_/{original_url}"
    try:
        r = session.get(wayback_url, timeout=60)
        if r.status_code == 200 and r.content[:4] == b"%PDF":
            return r.content
        logger.warning(f"Bad response {r.status_code} for {wayback_url}")
    except requests.Timeout:
        logger.warning(f"Timeout: {original_url}")
    except Exception as e:
        logger.warning(f"Fetch error {original_url}: {e}")
    return None


def parse_audit_pdf(pdf_bytes: bytes, source_url: str) -> dict | None:
    """
    Parse an ASF individual audit PDF and return structured data.

    Returns dict with keys matching asf_cases columns, or None on parse failure.
    """
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            if not pdf.pages:
                return None

            # --- Page 1: header metadata ---
            page1_text = pdf.pages[0].extract_text() or ""
            lines = [l.strip() for l in page1_text.split("\n") if l.strip()]

            functional_group = None
            entity_name = None
            topic = None
            audit_id = None
            finding_type = "observation"

            for i, line in enumerate(lines[:20]):
                # Functional group: "Grupo Funcional Desarrollo Social"
                if line.startswith("Grupo Funcional"):
                    functional_group = line.replace("Grupo Funcional", "").strip()
                # Audit ID line: "Auditoría De Cumplimiento a Inversiones Físicas: 2021-2-13J2Y-22-0002-2022"
                elif re.search(r"Auditor[ií]a", line, re.IGNORECASE) and ":" in line:
                    # Finding type: everything between "Auditoría" and the colon
                    m_type = re.search(r"Auditor[ií]a\s+(.+?):", line, re.IGNORECASE)
                    if m_type:
                        finding_type = m_type.group(1).strip()
                    # Audit ID: alphanumeric segments separated by dashes after the colon
                    m_id = re.search(r":\s*(\d{4}-[\w]+-[\w]+-[\w]+-[\w]+-\d{4})", line)
                    if m_id:
                        audit_id = m_id.group(1)
                # Entity name: first non-empty line after "Grupo Funcional" that isn't an audit line
                elif (
                    functional_group
                    and entity_name is None
                    and not re.search(r"Auditor[ií]a|Grupo Funcional|^\d", line, re.IGNORECASE)
                    and len(line) > 5
                ):
                    entity_name = line
                # Topic: first meaningful line after entity_name
                elif (
                    entity_name
                    and topic is None
                    and not re.search(
                        r"Auditor[ií]a|Modalidad|N[úu]m\.|Criterios|^\d{4}-", line, re.IGNORECASE
                    )
                    and len(line) > 5
                    and line != entity_name
                ):
                    topic = line

            if not entity_name:
                return None

            # Extract ramo code from audit_id: "2021-0-12100-19-0041-2022" → 121
            report_year = None
            if audit_id:
                parts = audit_id.split("-")
                if parts:
                    try:
                        report_year = int(parts[0])
                    except ValueError:
                        pass

            # --- Pages 1-3: amount extraction ---
            # Two patterns depending on audit type:
            # A) "Total  {ejercido}  {revisado}" table (financial/compliance audits)
            # B) "Muestra Auditada  NNN,NNN.N" (investment audits)
            amount_mxn = None
            all_pages_text = page1_text
            for page in pdf.pages[1:4]:
                all_pages_text += "\n" + (page.extract_text() or "")

            # Pattern A: Total with two numbers → use second (Importe Revisado)
            m_total = re.search(
                r"Total\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)",
                all_pages_text,
                re.IGNORECASE,
            )
            if m_total:
                raw = m_total.group(2).replace(",", "")
                try:
                    amount_mxn = float(raw) * 1_000  # thousands → pesos
                except ValueError:
                    pass

            # Pattern B: Muestra Auditada / Universo Seleccionado
            if amount_mxn is None:
                for pattern in [r"Muestra\s+Auditada\s+([\d,]+\.?\d*)",
                                 r"Universo\s+Seleccionado\s+([\d,]+\.?\d*)"]:
                    m_sample = re.search(pattern, all_pages_text, re.IGNORECASE)
                    if m_sample:
                        raw = m_sample.group(1).replace(",", "")
                        try:
                            amount_mxn = float(raw) * 1_000
                        except ValueError:
                            pass
                        break

            return {
                "asf_report_id": audit_id,
                "entity_name": entity_name,
                "vendor_name": None,
                "vendor_rfc": None,
                "finding_type": finding_type,
                "amount_mxn": amount_mxn,
                "report_year": report_year,
                "report_url": source_url,
                "summary": f"[{functional_group}] {topic or ''}".strip(" []"),
                "scraped_at": datetime.now().isoformat(),
            }

    except Exception as e:
        logger.warning(f"PDF parse error: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────────────────────────────────────

def get_already_scraped(conn: sqlite3.Connection) -> set[str]:
    """Return set of asf_report_ids already in the DB."""
    rows = conn.execute(
        "SELECT DISTINCT asf_report_id FROM asf_cases WHERE asf_report_id IS NOT NULL"
    ).fetchall()
    return {r[0] for r in rows}


def insert_record(conn: sqlite3.Connection, rec: dict) -> bool:
    """Insert one record. Returns True if inserted, False if duplicate/error."""
    try:
        conn.execute(
            """
            INSERT OR IGNORE INTO asf_cases
                (asf_report_id, entity_name, vendor_name, vendor_rfc,
                 finding_type, amount_mxn, report_year, report_url, summary, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rec["asf_report_id"],
                rec["entity_name"],
                rec["vendor_name"],
                rec["vendor_rfc"],
                rec["finding_type"],
                rec["amount_mxn"],
                rec["report_year"],
                rec["report_url"],
                rec["summary"],
                rec["scraped_at"],
            ),
        )
        conn.commit()
        return conn.execute("SELECT changes()").fetchone()[0] > 0
    except sqlite3.Error as e:
        logger.error(f"DB error inserting {rec.get('asf_report_id')}: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# Main pipeline
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape ASF audit PDFs via Wayback Machine")
    parser.add_argument("--year", type=int, default=2021, help="Fiscal year (default: 2021)")
    parser.add_argument("--limit", type=int, default=500, help="Max PDFs to process (default: 500)")
    parser.add_argument("--batch", type=int, default=10, help="Save to DB every N PDFs (default: 10)")
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between PDF downloads (default: 1.5)")
    parser.add_argument("--dry-run", action="store_true", help="Parse but don't write to DB")
    args = parser.parse_args()

    conn = None
    already_scraped: set[str] = set()

    if not args.dry_run:
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute("PRAGMA busy_timeout = 30000")
        already_scraped = get_already_scraped(conn)
        logger.info(f"Already in DB: {len(already_scraped)} audit reports")

    # Step 1: Discover archived PDF URLs from Wayback CDX
    pdf_urls = get_archived_urls(args.year, limit=args.limit * 3)  # fetch extra to allow for skips

    session = requests.Session()
    session.headers.update(HEADERS)

    processed = 0
    inserted = 0
    failed = 0
    skipped = 0
    batch: list[dict] = []

    for timestamp, original_url in pdf_urls:
        if processed >= args.limit:
            break

        # Extract audit ID from URL to check if already scraped
        m = re.search(r"/(\d{4}_\d+_\w+)\.pdf$", original_url, re.IGNORECASE)
        url_audit_key = m.group(1) if m else None

        # Skip if already in DB (using URL key as proxy before parsing)
        if url_audit_key and conn:
            # Check if any record matches this year+number pattern
            short_id = url_audit_key.replace("_a", "").replace("_", "-")
            if any(short_id in aid for aid in already_scraped):
                skipped += 1
                continue

        processed += 1
        logger.info(f"[{processed}/{args.limit}] Fetching {original_url} (ts={timestamp})")

        # Step 2: Download PDF
        pdf_bytes = fetch_pdf_bytes(timestamp, original_url, session)
        if not pdf_bytes:
            failed += 1
            time.sleep(args.delay)
            continue

        # Step 3: Parse PDF
        rec = parse_audit_pdf(pdf_bytes, original_url)
        if not rec:
            logger.warning(f"  Could not parse: {original_url}")
            failed += 1
            time.sleep(args.delay)
            continue

        logger.info(f"  Entity: {rec['entity_name'][:60]}")
        logger.info(f"  Type: {rec['finding_type']} | ID: {rec['asf_report_id']} | "
                    f"Amount: {rec['amount_mxn']:,.0f} MXN" if rec['amount_mxn'] else
                    f"  Type: {rec['finding_type']} | ID: {rec['asf_report_id']} | Amount: N/A")

        if args.dry_run:
            inserted += 1
        else:
            batch.append(rec)
            if len(batch) >= args.batch:
                for r in batch:
                    if insert_record(conn, r):
                        inserted += 1
                batch.clear()
                logger.info(f"  Progress: {inserted} inserted, {failed} failed, {skipped} skipped")

        time.sleep(args.delay)

    # Final batch
    if not args.dry_run and batch and conn:
        for r in batch:
            if insert_record(conn, r):
                inserted += 1

    if conn:
        total = conn.execute("SELECT COUNT(*) FROM asf_cases").fetchone()[0]
        conn.close()
        logger.info(f"Done. Inserted: {inserted}, Failed: {failed}, Skipped: {skipped}")
        logger.info(f"Total asf_cases in DB: {total}")
    else:
        logger.info(f"Dry run done. Parsed: {inserted}, Failed: {failed}")


if __name__ == "__main__":
    main()
