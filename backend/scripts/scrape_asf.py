"""
Scrape ASF (Auditoria Superior de la Federacion) audit findings.

Usage:
    python -m scripts.scrape_asf [--year YEAR] [--max-records N]

The ASF publishes audit reports at:
    https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones.asp

This script:
1. Fetches the ASF investigations database page
2. Extracts entity names, finding types, amounts, and report URLs
3. Stores results in the asf_cases table
4. Rate limits to 1 request/second

Note: If the ASF website structure changes, update the CSS selectors below.
"""
import argparse
import logging
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
ASF_BASE_URL = "https://www.asf.gob.mx"
ASF_INVESTIGATIONS_URL = f"{ASF_BASE_URL}/Trans/Investigaciones/dbInvestigaciones.asp"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RUBLI/1.0; +https://github.com/rodanaya/yangwenli)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
}


def scrape_asf(year: int | None = None, max_records: int = 200) -> list[dict]:
    """
    Scrape ASF investigation records.
    Returns list of dicts with keys matching asf_cases columns.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed. Run: pip install beautifulsoup4 lxml")
        return []

    records = []
    params = {}
    if year:
        params["anio"] = str(year)

    logger.info(f"Fetching ASF investigations (year={year}, max={max_records})")

    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
            response = client.get(ASF_INVESTIGATIONS_URL, params=params)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # ASF uses a table with class 'tabla' or similar -- adapt to actual structure
        table = (
            soup.find("table", {"class": "tabla"})
            or soup.find("table", {"id": "tblInvestigaciones"})
            or soup.find("table")
        )

        if not table:
            logger.warning("No table found on ASF page -- site structure may have changed")
            return []

        rows = table.find_all("tr")[1:]  # Skip header row
        logger.info(f"Found {len(rows)} rows")

        for i, row in enumerate(rows[:max_records]):
            if i > 0 and i % 10 == 0:
                time.sleep(1.0)  # Rate limit

            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            cell_texts = [c.get_text(strip=True) for c in cells]

            # Extract link if present
            link = row.find("a")
            report_url = None
            if link and link.get("href"):
                href = link["href"]
                report_url = href if href.startswith("http") else f"{ASF_BASE_URL}/{href.lstrip('/')}"

            record = {
                "asf_report_id": cell_texts[0] if len(cell_texts) > 0 else None,
                "entity_name": cell_texts[1] if len(cell_texts) > 1 else "Unknown",
                "finding_type": cell_texts[2] if len(cell_texts) > 2 else "observation",
                "amount_mxn": _parse_amount(cell_texts[3]) if len(cell_texts) > 3 else None,
                "report_year": year or _extract_year(cell_texts[0] if cell_texts else ""),
                "report_url": report_url,
                "summary": cell_texts[-1] if len(cell_texts) > 4 else None,
                "scraped_at": datetime.now().isoformat(),
            }
            records.append(record)

    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching ASF: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)

    logger.info(f"Scraped {len(records)} ASF records")
    return records


def _parse_amount(text: str) -> float | None:
    """Parse amount like '$1,234,567.89' or '1234567' into float."""
    if not text:
        return None
    cleaned = text.replace("$", "").replace(",", "").replace(" ", "").strip()
    try:
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def _extract_year(text: str) -> int | None:
    """Extract 4-digit year from text like 'ASFPEF 2022-1'."""
    match = re.search(r"\b(20\d{2})\b", text)
    return int(match.group(1)) if match else None


def save_to_db(records: list[dict], db_path: Path = DB_PATH) -> int:
    """Insert scraped records into asf_cases table. Returns count inserted."""
    if not records:
        return 0

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA busy_timeout = 30000")
        cursor = conn.cursor()
        inserted = 0
        for rec in records:
            try:
                cursor.execute(
                    """
                    INSERT INTO asf_cases
                        (asf_report_id, entity_name, vendor_name, vendor_rfc,
                         finding_type, amount_mxn, report_year, report_url, summary, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rec.get("asf_report_id"),
                        rec.get("entity_name", "Unknown"),
                        rec.get("vendor_name"),
                        rec.get("vendor_rfc"),
                        rec.get("finding_type", "observation"),
                        rec.get("amount_mxn"),
                        rec.get("report_year"),
                        rec.get("report_url"),
                        rec.get("summary"),
                        rec.get("scraped_at", datetime.now().isoformat()),
                    ),
                )
                inserted += 1
            except sqlite3.Error as e:
                logger.warning(f"Failed to insert record: {e}")
        conn.commit()
        logger.info(f"Saved {inserted} records to asf_cases")
        return inserted
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Scrape ASF audit findings")
    parser.add_argument("--year", type=int, help="Report year to scrape (e.g. 2024)")
    parser.add_argument("--max-records", type=int, default=200, help="Max records per run")
    parser.add_argument("--dry-run", action="store_true", help="Scrape but don't save to DB")
    args = parser.parse_args()

    records = scrape_asf(year=args.year, max_records=args.max_records)
    if not args.dry_run:
        saved = save_to_db(records)
        logger.info(f"Done: {saved} records saved")
    else:
        logger.info(f"Dry run: {len(records)} records would be saved")
        for r in records[:5]:
            logger.info(f"  {r}")


if __name__ == "__main__":
    main()
