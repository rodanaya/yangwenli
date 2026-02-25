"""
Load SFP (Secretaria de la Funcion Publica) sanctioned providers data.

SFP maintains a registry of companies sanctioned from government contracting.
Data source: datos.gob.mx — Proveedores y Contratistas Sancionados

Usage:
    python -m scripts.load_sfp_sanctions [--url URL] [--dry-run]

Note: If the primary URL fails, the script exits cleanly. Run manually
with --url to provide an updated download link.
"""
import argparse
import csv
import io
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Primary URL — SFP datosabiertos portal (updated daily, verified Feb 2026)
DEFAULT_URL = "https://datosabiertos.funcionpublica.gob.mx/datosabiertos/sanc/proveedores_sancionados.csv"

COLUMN_MAP = {
    # Possible Spanish column name variations
    "rfc": ["rfc", "RFC", "rfc_proveedor"],
    "company_name": ["nombre", "razon_social", "nombre_razon_social", "empresa"],
    "sanction_type": ["tipo_sancion", "tipo", "sancion"],
    "sanction_start": ["fecha_inicio", "fecha_inicio_sancion"],
    "sanction_end": ["fecha_fin", "fecha_fin_sancion"],
    "amount_mxn": ["monto", "monto_sancion", "importe"],
    "authority": ["autoridad", "institucion"],
}


def _find_col(header: list[str], candidates: list[str]) -> Optional[int]:
    """Find column index by trying multiple candidate names."""
    for candidate in candidates:
        for i, h in enumerate(header):
            if h.strip().lower() == candidate.lower():
                return i
    return None


def download_and_parse(url: str) -> list[dict]:
    """Download CSV from URL and return list of sanitized dicts."""
    try:
        import httpx
        logger.info(f"Downloading SFP sanctions from {url}")
        resp = httpx.get(url, timeout=60.0, follow_redirects=True)
        resp.raise_for_status()
        content = resp.text
    except Exception as e:
        logger.warning(f"Failed to download SFP data: {e}")
        return []

    records = []
    reader = csv.reader(io.StringIO(content))
    header = next(reader, None)
    if not header:
        logger.warning("Empty CSV — no header row")
        return []

    col_idx = {field: _find_col(header, candidates) for field, candidates in COLUMN_MAP.items()}
    logger.info(f"Column mapping: {col_idx}")

    for row in reader:
        if not any(row):
            continue
        def get(field):
            idx = col_idx.get(field)
            return row[idx].strip() if idx is not None and idx < len(row) else None

        amount = None
        raw_amount = get("amount_mxn")
        if raw_amount:
            try:
                amount = float(raw_amount.replace(",", "").replace("$", ""))
            except ValueError:
                pass

        records.append({
            "rfc": get("rfc"),
            "company_name": get("company_name") or "Unknown",
            "sanction_type": get("sanction_type") or "sanction",
            "sanction_start": get("sanction_start"),
            "sanction_end": get("sanction_end"),
            "amount_mxn": amount,
            "authority": get("authority"),
            "source_url": url,
        })

    logger.info(f"Parsed {len(records)} records")
    return records


def save_to_db(records: list[dict], db_path: Path = DB_PATH) -> int:
    if not records:
        return 0
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA busy_timeout = 30000")
        cursor = conn.cursor()
        # Ensure table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sfp_sanctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rfc TEXT,
                company_name TEXT NOT NULL,
                sanction_type TEXT,
                sanction_start TEXT,
                sanction_end TEXT,
                amount_mxn REAL,
                authority TEXT,
                source_url TEXT,
                loaded_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sfp_sanctions_rfc ON sfp_sanctions(rfc)")
        inserted = 0
        loaded_at = datetime.now().isoformat()
        for rec in records:
            cursor.execute("""
                INSERT INTO sfp_sanctions
                    (rfc, company_name, sanction_type, sanction_start, sanction_end,
                     amount_mxn, authority, source_url, loaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rec["rfc"], rec["company_name"], rec["sanction_type"],
                rec["sanction_start"], rec["sanction_end"], rec["amount_mxn"],
                rec["authority"], rec["source_url"], loaded_at,
            ))
            inserted += 1
        conn.commit()
        logger.info(f"Saved {inserted} SFP sanction records")
        return inserted
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Load SFP sanctioned providers")
    parser.add_argument("--url", default=DEFAULT_URL, help="CSV download URL")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    records = download_and_parse(args.url)
    if not records:
        logger.warning("No records parsed — check URL or run with --url")
        return

    if args.dry_run:
        logger.info(f"Dry run: {len(records)} records would be saved")
        for r in records[:3]:
            logger.info(f"  {r}")
    else:
        save_to_db(records)


if __name__ == "__main__":
    main()
