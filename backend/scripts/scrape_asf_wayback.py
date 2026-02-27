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

# Known functional group names that may appear standalone (without "Grupo Funcional" prefix)
# Some PDFs omit the prefix, especially Gasto Federalizado audits
KNOWN_GRUPOS = {
    "Desarrollo Social",
    "Gobierno",
    "Desarrollo Económico",
    "Gasto Federalizado",
    "Deuda",
    "Bienestar",
    "Seguridad Nacional",
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
                # Functional group — two structural variants:
                # 1) "Grupo Funcional Desarrollo Social" (standard)
                # 2) "Gasto Federalizado" alone (some audits omit the prefix)
                # Note: OCR sometimes produces "Grupo Funciona" (missing trailing 'l')
                if re.match(r"Grupo\s+Funcional?", line, re.IGNORECASE):
                    functional_group = re.sub(r"Grupo\s+Funcional?\s*", "", line, flags=re.IGNORECASE).strip()
                elif functional_group is None and any(
                    g.lower() in line.lower() for g in KNOWN_GRUPOS
                ):
                    functional_group = line.strip()
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

            # Pattern B (checked first): Muestra Auditada / Universo Seleccionado
            # These are specific and reliable for investment/physical audits
            for pattern in [r"Muestra\s+Auditada\s+([\d,]+\.\d+)",
                             r"Muestra\s+Auditada\s+([\d,]+)",
                             r"Universo\s+Seleccionado\s+([\d,]+\.\d+)",
                             r"Universo\s+Seleccionado\s+([\d,]+)"]:
                m_sample = re.search(pattern, all_pages_text, re.IGNORECASE)
                if m_sample:
                    raw = m_sample.group(1).replace(",", "")
                    try:
                        amount_mxn = float(raw) * 1_000  # thousands → pesos
                    except ValueError:
                        pass
                    break

            # Pattern A: "Total X Y" — two decimal amounts (Importe Ejercido + Importe Revisado)
            # Uses decimal-required format to avoid matching count columns like "Total 285 159 ..."
            if amount_mxn is None:
                m_total = re.search(
                    r"Total\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)",
                    all_pages_text,
                    re.IGNORECASE,
                )
                if m_total:
                    raw = m_total.group(2).replace(",", "")
                    try:
                        amount_mxn = float(raw) * 1_000  # thousands → pesos
                    except ValueError:
                        pass

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
    parser.add_argument("--delay", type=float, default=1.2, help="Seconds between PDF downloads (default: 1.2)")
    parser.add_argument("--dry-run", action="store_true", help="Parse but don't write to DB")
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path to write JSONL results file (default: auto-generated in script dir)"
    )
    args = parser.parse_args()

    # Output JSONL file — written incrementally, DB insert happens at end
    if args.output:
        out_path = Path(args.output)
    else:
        out_path = Path(__file__).parent / f"asf_scraped_{args.year}.jsonl"

    logger.info(f"Output file: {out_path}")

    # Load already-scraped URLs from DB + existing JSONL to skip duplicates
    # Uses report_url (always present) rather than asf_report_id (complex format)
    already_scraped: set[str] = set()
    if not args.dry_run:
        import json as _json_skip
        try:
            conn_check = sqlite3.connect(str(DB_PATH))
            conn_check.execute("PRAGMA busy_timeout = 5000")
            rows = conn_check.execute(
                "SELECT DISTINCT report_url FROM asf_cases WHERE report_url IS NOT NULL"
            ).fetchall()
            already_scraped.update(r[0] for r in rows)
            conn_check.close()
            logger.info(f"Already in DB: {len(already_scraped)} URLs")
        except sqlite3.Error as e:
            logger.warning(f"Could not load DB URLs (DB busy?): {e}")
        # Also load from existing JSONL (crash recovery — don't re-scrape what's been parsed)
        if out_path.exists():
            try:
                with open(out_path, encoding="utf-8") as f_skip:
                    for line in f_skip:
                        line = line.strip()
                        if line:
                            try:
                                rec_skip = _json_skip.loads(line)
                                if rec_skip.get("report_url"):
                                    already_scraped.add(rec_skip["report_url"])
                            except ValueError:
                                pass
                logger.info(f"Total URLs to skip (DB + JSONL): {len(already_scraped)}")
            except Exception as e:
                logger.warning(f"Could not load JSONL skip URLs: {e}")

    # Step 1: Discover archived PDF URLs
    pdf_urls = get_archived_urls(args.year, limit=args.limit * 2)

    session = requests.Session()
    session.headers.update(HEADERS)

    processed = 0
    parsed = 0
    failed = 0
    skipped = 0
    records: list[dict] = []

    # Open JSONL file for incremental writes
    jsonl_file = None if args.dry_run else open(out_path, "a", encoding="utf-8")

    try:
        import json as _json

        for timestamp, original_url in pdf_urls:
            if processed >= args.limit:
                break

            # Skip if URL already in DB or current JSONL
            if original_url in already_scraped:
                skipped += 1
                continue

            processed += 1
            logger.info(f"[{processed}/{args.limit}] {original_url}")

            # Download PDF
            pdf_bytes = fetch_pdf_bytes(timestamp, original_url, session)
            if not pdf_bytes:
                failed += 1
                time.sleep(args.delay)
                continue

            # Parse PDF
            rec = parse_audit_pdf(pdf_bytes, original_url)
            if not rec:
                logger.warning(f"  Parse failed: {original_url}")
                failed += 1
                time.sleep(args.delay)
                continue

            amount_str = f"{rec['amount_mxn']:,.0f} MXN" if rec.get("amount_mxn") else "N/A"
            logger.info(
                f"  [{rec['finding_type'][:30]}] {rec['entity_name'][:50]} | "
                f"ID: {rec['asf_report_id']} | {amount_str}"
            )
            parsed += 1

            if not args.dry_run and jsonl_file:
                jsonl_file.write(_json.dumps(rec, ensure_ascii=False) + "\n")
                jsonl_file.flush()
            else:
                records.append(rec)

            time.sleep(args.delay)

        logger.info(f"Scrape done: parsed={parsed}, failed={failed}, skipped={skipped}")

    finally:
        if jsonl_file:
            jsonl_file.close()

    # Step 3: Bulk-insert from JSONL into DB (single connection, short lock)
    if args.dry_run:
        logger.info(f"Dry run — {parsed} records parsed, no DB writes")
        return

    if not out_path.exists():
        logger.info("No output file to insert")
        return

    import json as _json

    # Read all JSONL records
    all_records: list[dict] = []
    with open(out_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    all_records.append(_json.loads(line))
                except ValueError:
                    pass

    if not all_records:
        logger.info("No records in JSONL file to insert")
        return

    logger.info(f"Inserting {len(all_records)} records from JSONL into DB ...")
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 60000")
    conn.execute("PRAGMA synchronous = NORMAL")
    inserted = 0
    skipped_dup = 0
    total = 0
    try:
        conn.execute("BEGIN IMMEDIATE")
        for rec in all_records:
            try:
                conn.execute(
                    """INSERT OR IGNORE INTO asf_cases
                       (asf_report_id, entity_name, vendor_name, vendor_rfc,
                        finding_type, amount_mxn, report_year, report_url, summary, scraped_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (
                        rec.get("asf_report_id"), rec.get("entity_name", "Unknown"),
                        rec.get("vendor_name"), rec.get("vendor_rfc"),
                        rec.get("finding_type", "observation"), rec.get("amount_mxn"),
                        rec.get("report_year"), rec.get("report_url"),
                        rec.get("summary"), rec.get("scraped_at"),
                    ),
                )
                changed = conn.execute("SELECT changes()").fetchone()[0]
                if changed:
                    inserted += 1
                else:
                    skipped_dup += 1
            except sqlite3.Error as e:
                logger.error(f"Insert error {rec.get('asf_report_id')}: {e}")
        conn.commit()
        total = conn.execute("SELECT COUNT(*) FROM asf_cases").fetchone()[0]
    except sqlite3.Error as e:
        logger.error(f"Transaction error: {e}")
        conn.rollback()
    finally:
        conn.close()

    logger.info(f"Inserted {inserted} new, skipped {skipped_dup} duplicates. Total in asf_cases: {total}")
    # Remove JSONL file after successful insert
    if inserted > 0:
        out_path.unlink(missing_ok=True)
        logger.info(f"Deleted JSONL file: {out_path}")


if __name__ == "__main__":
    main()
