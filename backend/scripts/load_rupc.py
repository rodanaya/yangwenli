"""
Load RUPC (Registro Unico de Proveedores y Contratistas) data.

The RUPC is Mexico's unified registry of government suppliers with
compliance grades indicating performance history.

Data source: datos.gob.mx or CompraNet data portal

Usage:
    python -m scripts.load_rupc [--url URL] [--dry-run]
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

# NOTE (Feb 2026): CompraNet was abolished April 10, 2025. The standalone RUPC CSV
# is no longer published as open data. The RUPC query interface moved to:
#   https://comprasmx.buengobierno.gob.mx/rupc  (web only, no bulk download)
# Historical RUPC data (pre-2025) may be obtainable from:
#   https://www.gob.mx/compranet/acciones-y-programas/registro-unico-de-proveedores-y-contratistas-rupc-baja20240618
# Run with --url <direct_csv_link> if a bulk export becomes available again.
DEFAULT_URL = "https://www.gob.mx/compranet/acciones-y-programas/registro-unico-de-proveedores-y-contratistas-rupc-baja20240618"

COLUMN_MAP = {
    "rfc": ["rfc", "RFC"],
    "company_name": ["nombre", "razon_social", "nombre_empresa"],
    "compliance_grade": ["grado_cumplimiento", "calificacion", "grado"],
    "status": ["estatus", "estado", "situacion"],
    "registered_date": ["fecha_registro", "fecha_inscripcion"],
    "expiry_date": ["fecha_vencimiento", "vigencia"],
}


def _find_col(header: list[str], candidates: list[str]) -> Optional[int]:
    for candidate in candidates:
        for i, h in enumerate(header):
            if h.strip().lower() == candidate.lower():
                return i
    return None


def download_and_parse(url: str) -> list[dict]:
    try:
        import httpx
        logger.info(f"Downloading RUPC data from {url}")
        resp = httpx.get(url, timeout=60.0, follow_redirects=True)
        resp.raise_for_status()
        content = resp.text
    except Exception as e:
        logger.warning(f"Failed to download RUPC data: {e}")
        return []

    records = []
    reader = csv.reader(io.StringIO(content))
    header = next(reader, None)
    if not header:
        return []

    col_idx = {field: _find_col(header, candidates) for field, candidates in COLUMN_MAP.items()}

    for row in reader:
        if not any(row):
            continue
        def get(field):
            idx = col_idx.get(field)
            return row[idx].strip() if idx is not None and idx < len(row) else None

        records.append({
            "rfc": get("rfc"),
            "company_name": get("company_name") or "Unknown",
            "compliance_grade": get("compliance_grade"),
            "status": get("status"),
            "registered_date": get("registered_date"),
            "expiry_date": get("expiry_date"),
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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rupc_vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rfc TEXT UNIQUE,
                company_name TEXT NOT NULL,
                compliance_grade TEXT,
                status TEXT,
                registered_date TEXT,
                expiry_date TEXT,
                loaded_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rupc_rfc ON rupc_vendors(rfc)")
        inserted = 0
        loaded_at = datetime.now().isoformat()
        for rec in records:
            if not rec.get("rfc"):
                continue
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO rupc_vendors
                        (rfc, company_name, compliance_grade, status, registered_date, expiry_date, loaded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    rec["rfc"], rec["company_name"], rec["compliance_grade"],
                    rec["status"], rec["registered_date"], rec["expiry_date"], loaded_at,
                ))
                inserted += 1
            except sqlite3.Error as e:
                logger.warning(f"Insert error: {e}")
        conn.commit()
        logger.info(f"Saved {inserted} RUPC vendor records")
        return inserted
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Load RUPC vendor registry")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    records = download_and_parse(args.url)
    if not records:
        logger.warning("No records — check URL or try --url with a direct CSV link")
        return

    if args.dry_run:
        logger.info(f"Dry run: {len(records)} records would be saved")
    else:
        save_to_db(records)


if __name__ == "__main__":
    main()
