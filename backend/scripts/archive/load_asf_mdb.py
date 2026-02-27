"""
Load ASF (Auditoría Superior de la Federación) MDB (Informe de Resultados)
institution-level findings into the asf_institution_findings table.

Usage:
    python -m scripts.load_asf_mdb --year 2023 --pdf /path/to/report.pdf
    python -m scripts.load_asf_mdb --year 2022 --pdf https://asf.gob.mx/.../informe.pdf
    python -m scripts.load_asf_mdb --year 2023 --pdf /path/to/data.csv
    python -m scripts.load_asf_mdb --dry-run  # Try default years without saving

The ASF publishes annual "Informe de Resultados" PDFs at:
    https://www.asf.gob.mx/Section/47_Informes_de_Resultados

Expected PDF table columns (order may vary by year):
    Ramo | Institution | Observations | Amount questioned (MXN) | Solved | Finding type

Falls back to CSV if PDF parsing fails or a .csv path is provided.
CSV columns: ramo_code, institution_name, observations_total, amount_mxn,
             observations_solved, finding_type
"""
import argparse
import csv
import io
import logging
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Default ASF informe URLs by year (update as new reports are published)
# Format: year -> URL for the main findings summary PDF
ASF_PDF_URLS: dict[int, str] = {
    2024: "https://www.asf.gob.mx/Trans/Informes/IR2024i/Docs/Auditorias/Resumen_Ejecutivo.pdf",
    2023: "https://www.asf.gob.mx/Trans/Informes/IR2023i/Docs/Auditorias/Resumen_Ejecutivo.pdf",
    2022: "https://www.asf.gob.mx/Trans/Informes/IR2022i/Docs/Auditorias/Resumen_Ejecutivo.pdf",
    2021: "https://www.asf.gob.mx/Trans/Informes/IR2021i/Docs/Auditorias/Resumen_Ejecutivo.pdf",
    2020: "https://www.asf.gob.mx/Trans/Informes/IR2020i/Docs/Auditorias/Resumen_Ejecutivo.pdf",
}

DEFAULT_YEARS = [2020, 2021, 2022, 2023, 2024]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RUBLI/1.0; +https://github.com/rodanaya/yangwenli)",
    "Accept": "application/pdf,*/*;q=0.8",
}


# ---------------------------------------------------------------------------
# PDF / CSV download helpers
# ---------------------------------------------------------------------------

def _download_pdf(url: str) -> bytes:
    """Download a PDF from a URL, ignoring SSL errors."""
    logger.info(f"Downloading PDF from {url}")
    with httpx.Client(verify=False, timeout=60.0, headers=HEADERS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
    logger.info(f"Downloaded {len(resp.content):,} bytes")
    return resp.content


def _read_local_file(path: Path) -> bytes:
    logger.info(f"Reading local file {path}")
    return path.read_bytes()


def _get_content(source: str) -> bytes:
    """Return raw bytes from URL or local path."""
    if source.startswith("http://") or source.startswith("https://"):
        return _download_pdf(source)
    return _read_local_file(Path(source))


# ---------------------------------------------------------------------------
# PDF parsing
# ---------------------------------------------------------------------------

def _parse_ramo_code(text: str) -> Optional[int]:
    """Extract integer ramo code from cell text like '12', '012', 'Ramo 12'."""
    if not text:
        return None
    cleaned = text.strip()
    # Try plain integer
    try:
        val = int(cleaned)
        if 1 <= val <= 99:
            return val
    except ValueError:
        pass
    # Try "Ramo 12" or "12 - Nombre"
    m = re.search(r"\b(\d{1,2})\b", cleaned)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 99:
            return val
    return None


def _parse_amount(text: str) -> Optional[float]:
    """Parse amount like '$1,234,567.89' or '1 234 567' into float."""
    if not text:
        return None
    cleaned = re.sub(r"[$,\s]", "", text.strip())
    # Handle parentheses as negative
    cleaned = cleaned.replace("(", "-").replace(")", "")
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_int(text: str) -> Optional[int]:
    """Parse integer from cell text."""
    if not text:
        return None
    cleaned = re.sub(r"[,\s]", "", text.strip())
    try:
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None


def _extract_rows_from_table(table_data: list[list]) -> list[dict]:
    """
    Try to extract structured rows from a pdfplumber table.
    Returns list of dicts with keys: ramo_code, institution_name,
    observations_total, amount_mxn, observations_solved, finding_type.
    Returns empty list if table structure is unrecognised.
    """
    if not table_data or len(table_data) < 2:
        return []

    # Flatten None cells to ""
    rows = [[str(c or "").strip() for c in row] for row in table_data]
    header = rows[0]
    n_cols = len(header)

    # Heuristic: we need at least 3 columns and the first column should
    # contain numeric-looking values (ramo codes) in data rows.
    if n_cols < 3:
        return []

    records = []
    for row in rows[1:]:
        if len(row) < 3:
            continue
        # Skip rows that are clearly totals/headers repeated inside the table
        first = row[0].lower()
        if any(kw in first for kw in ("ramo", "total", "subtotal", "no.", "#")):
            continue

        ramo = _parse_ramo_code(row[0])
        if ramo is None:
            continue  # Not a data row

        # Column assignment heuristic:
        # Col 0: ramo code
        # Col 1: institution name
        # Col 2: observations_total  (or amount, depending on report layout)
        # Col 3: amount_mxn (or observations_total)
        # Col 4: observations_solved (optional)
        # Col 5: finding_type (optional)

        institution = row[1] if n_cols > 1 else ""

        # Detect if col 2 looks like an amount (large number or contains $)
        col2_text = row[2] if n_cols > 2 else ""
        col3_text = row[3] if n_cols > 3 else ""

        col2_is_amount = "$" in col2_text or (
            _parse_amount(col2_text) is not None and _parse_amount(col2_text) > 10_000
        )

        if col2_is_amount:
            amount = _parse_amount(col2_text)
            obs_total = _parse_int(col3_text)
        else:
            obs_total = _parse_int(col2_text)
            amount = _parse_amount(col3_text)

        obs_solved = _parse_int(row[4]) if n_cols > 4 else None
        finding_type = row[5].strip() if n_cols > 5 and row[5].strip() else "observation"

        records.append(
            {
                "ramo_code": ramo,
                "institution_name": institution,
                "observations_total": obs_total,
                "amount_mxn": amount,
                "observations_solved": obs_solved,
                "finding_type": finding_type,
            }
        )

    return records


def parse_pdf(pdf_bytes: bytes, year: int) -> list[dict]:
    """
    Extract ASF findings from a PDF using pdfplumber.
    Returns list of row dicts for insertion into asf_institution_findings.
    Falls back to empty list on failure.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed. Run: pip install pdfplumber")
        return []

    all_records: list[dict] = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            logger.info(f"PDF has {len(pdf.pages)} page(s)")
            for page_num, page in enumerate(pdf.pages, 1):
                time.sleep(0.05)  # light rate limit between pages
                tables = page.extract_tables()
                if not tables:
                    continue
                for table in tables:
                    rows = _extract_rows_from_table(table)
                    if rows:
                        logger.debug(
                            f"Page {page_num}: extracted {len(rows)} rows from table"
                        )
                    all_records.extend(rows)
    except Exception as exc:
        logger.error(f"PDF parsing failed: {exc}", exc_info=True)
        return []

    logger.info(f"Total rows extracted from PDF: {len(all_records)}")
    return all_records


# ---------------------------------------------------------------------------
# CSV fallback
# ---------------------------------------------------------------------------

def parse_csv(content: bytes) -> list[dict]:
    """
    Parse a CSV file with columns:
        ramo_code, institution_name, observations_total, amount_mxn,
        observations_solved, finding_type
    Column order is flexible; matched by header name.
    """
    records = []
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    # Normalise header names: lowercase, strip spaces
    for row in reader:
        normalised = {k.lower().strip(): v for k, v in row.items()}

        ramo = _parse_ramo_code(
            normalised.get("ramo_code") or normalised.get("ramo") or ""
        )
        if ramo is None:
            continue

        records.append(
            {
                "ramo_code": ramo,
                "institution_name": normalised.get("institution_name") or normalised.get("institution", ""),
                "observations_total": _parse_int(
                    normalised.get("observations_total") or normalised.get("observations", "")
                ),
                "amount_mxn": _parse_amount(
                    normalised.get("amount_mxn") or normalised.get("amount", "")
                ),
                "observations_solved": _parse_int(
                    normalised.get("observations_solved") or normalised.get("solved", "")
                ),
                "finding_type": normalised.get("finding_type") or normalised.get("type", "observation"),
            }
        )

    logger.info(f"Parsed {len(records)} rows from CSV")
    return records


# ---------------------------------------------------------------------------
# Database insertion
# ---------------------------------------------------------------------------

def save_findings(
    records: list[dict],
    year: int,
    source_pdf: str,
    db_path: Path = DB_PATH,
) -> int:
    """Insert records into asf_institution_findings and update asf_ramo_crosswalk."""
    if not records:
        logger.warning("No records to save")
        return 0

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA busy_timeout = 30000")
    try:
        cursor = conn.cursor()
        inserted = 0
        crosswalk_pairs: set[tuple] = set()

        for rec in records:
            ramo_code = rec["ramo_code"]
            institution_name = rec.get("institution_name") or ""

            try:
                cursor.execute(
                    """
                    INSERT INTO asf_institution_findings
                        (ramo_code, institution_name, audit_year, finding_type,
                         amount_mxn, observations_total, observations_solved,
                         source_pdf, loaded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ramo_code,
                        institution_name,
                        year,
                        rec.get("finding_type") or "observation",
                        rec.get("amount_mxn"),
                        rec.get("observations_total"),
                        rec.get("observations_solved"),
                        source_pdf,
                        datetime.now().isoformat(),
                    ),
                )
                inserted += 1
                if institution_name:
                    crosswalk_pairs.add((ramo_code, institution_name))
            except sqlite3.Error as exc:
                logger.warning(f"Failed to insert row (ramo={ramo_code}): {exc}")

        # Populate asf_ramo_crosswalk (upsert by institution_name)
        for ramo_code, institution_name in crosswalk_pairs:
            try:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO asf_ramo_crosswalk
                        (ramo_code, institution_name)
                    VALUES (?, ?)
                    """,
                    (ramo_code, institution_name),
                )
            except sqlite3.Error as exc:
                logger.debug(f"Crosswalk upsert skipped (ramo={ramo_code}): {exc}")

        conn.commit()
        logger.info(
            f"Saved {inserted} findings for year {year}; "
            f"{len(crosswalk_pairs)} crosswalk entries updated"
        )
        return inserted
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def load_year(year: int, pdf_source: Optional[str], dry_run: bool) -> int:
    """Load ASF findings for a single year. Returns count of rows processed."""
    if pdf_source is None:
        pdf_source = ASF_PDF_URLS.get(year)
        if pdf_source is None:
            logger.warning(f"No PDF URL known for year {year} — skipping")
            return 0

    logger.info(f"Loading ASF findings for year {year} from: {pdf_source}")

    try:
        content = _get_content(pdf_source)
    except Exception as exc:
        logger.error(f"Failed to fetch source for year {year}: {exc}")
        return 0

    # Route to CSV or PDF parser
    source_lower = pdf_source.lower()
    if source_lower.endswith(".csv") or (not source_lower.endswith(".pdf") and b"ramo" in content[:2000].lower()):
        records = parse_csv(content)
    else:
        records = parse_pdf(content, year)
        if not records:
            logger.info("PDF parsing returned no rows; attempting CSV fallback")
            records = parse_csv(content)

    if dry_run:
        logger.info(f"[DRY RUN] Would insert {len(records)} rows for year {year}")
        for r in records[:5]:
            logger.info(f"  {r}")
        return len(records)

    return save_findings(records, year, pdf_source)


def main():
    parser = argparse.ArgumentParser(
        description="Load ASF institution-level findings from PDF or CSV into RUBLI DB"
    )
    parser.add_argument(
        "--year",
        type=int,
        help="Audit year to load (e.g. 2023). If omitted, tries all default years.",
    )
    parser.add_argument(
        "--pdf",
        dest="pdf",
        metavar="PATH_OR_URL",
        help="Local PDF/CSV path or URL. If omitted, uses built-in URL for the year.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse but do not write to DB",
    )
    args = parser.parse_args()

    if args.year:
        years = [args.year]
    else:
        years = DEFAULT_YEARS

    total = 0
    for year in years:
        pdf_source = args.pdf if args.year else None
        count = load_year(year, pdf_source, args.dry_run)
        total += count
        if not args.year:
            time.sleep(1.0)  # rate limit between years

    action = "would insert" if args.dry_run else "inserted"
    logger.info(f"Done: {action} {total} rows across {len(years)} year(s)")


if __name__ == "__main__":
    main()
