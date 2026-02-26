"""
Load SAT Article 69-B EFOS/EDOS (Ghost Companies) list.

Mexico's Servicio de Administración Tributaria (SAT) publishes a list of
companies presumed to issue fraudulent invoices (Empresas Fantasma / EFOS).
This list is published under Article 69-B of the Código Fiscal de la Federación.

Stages:
    presunto    — under review (presumed ghost company)
    definitivo  — confirmed ghost company (blacklisted)
    favorecido  — received invoices from a ghost company
    desvirtuado — successfully challenged classification

Data source:
    http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm
    CSV published monthly in Diario Oficial de la Federación, coverage from 2014.

Usage:
    python -m scripts.load_sat_efos [--url URL] [--dry-run]
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

# SAT datos abiertos — Article 69-B cumulative list (updated monthly)
DEFAULT_URL = "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Listado_Completo_69_articulo69.csv"

# Stage normalization map — SAT uses inconsistent Spanish terms across years
STAGE_MAP = {
    "presunto": "presunto",
    "definitivo": "definitivo",
    "favorable": "favorecido",
    "favorecido": "favorecido",
    "desvirtuado": "desvirtuado",
    "aclarado": "desvirtuado",
    "publicado": "definitivo",
    "sentencia favorable": "desvirtuado",
}

# Possible column name variations across SAT CSV versions
COLUMN_MAP = {
    "rfc": ["rfc", "RFC", "rfc_contribuyente"],
    "company_name": [
        "nombre", "razon_social", "nombre_contribuyente",
        "nombre_o_razon_social", "contribuyente",
        "razón social", "raz\u00f3n social",  # accent variants
        "nombre del contribuyente",           # Azure Blob format
    ],
    "stage": [
        "situacion", "estado", "situacion_contribuyente",
        "tipo", "estatus",
        "supuesto", "SUPUESTO",              # current SAT CSV header
        "situaci\u00f3n del contribuyente",  # Azure Blob format (accented)
        "situacion del contribuyente",        # Azure Blob format (unaccented)
    ],
    "dof_date": [
        "fecha_dof", "fecha_publicacion_dof", "fecha",
        "fecha_primera_publicacion", "publicacion_dof",
        "fechas de primera publicacion",      # current SAT CSV header
        "publicaci\u00f3n p\u00e1gina sat presuntos",  # Azure Blob format
        "publicacion pagina sat presuntos",
    ],
}


def _find_col(header: list[str], candidates: list[str]) -> Optional[int]:
    """Return column index matching any candidate name (case-insensitive)."""
    for candidate in candidates:
        for i, h in enumerate(header):
            if h.strip().lower() == candidate.lower():
                return i
    return None


def _normalize_stage(raw: Optional[str]) -> str:
    """Normalize SAT stage string to one of the 4 canonical values."""
    if not raw:
        return "presunto"
    normalized = raw.strip().lower()
    for key, value in STAGE_MAP.items():
        if key in normalized:
            return value
    return "presunto"  # Conservative default


def download_and_parse(url: str) -> list[dict]:
    """Download SAT 69-B CSV and return normalized records."""
    try:
        import httpx
        logger.info(f"Downloading SAT EFOS list from {url}")
        # SAT uses HTTP (not HTTPS) on some endpoints
        resp = httpx.get(url, timeout=120.0, follow_redirects=True, verify=False)
        resp.raise_for_status()
        # SAT files are often Latin-1 / Windows-1252 encoded
        for encoding in ("utf-8-sig", "latin-1", "cp1252", "utf-8"):
            try:
                content = resp.content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            logger.warning("Could not decode response with any known encoding")
            return []
    except Exception as e:
        logger.warning(f"Failed to download SAT EFOS data: {e}")
        return []

    records = []
    reader = csv.reader(io.StringIO(content))
    header = next(reader, None)
    if not header:
        logger.warning("Empty CSV — no header row")
        return []

    logger.info(f"Header columns: {header[:8]}")
    col_idx = {field: _find_col(header, candidates) for field, candidates in COLUMN_MAP.items()}
    logger.info(f"Column mapping: {col_idx}")

    missing_required = [f for f in ("rfc", "company_name") if col_idx.get(f) is None]
    if missing_required:
        logger.warning(f"Required columns not found: {missing_required}. Columns: {header}")
        return []

    for row in reader:
        if not any(row):
            continue

        def get(field: str) -> Optional[str]:
            idx = col_idx.get(field)
            if idx is not None and idx < len(row):
                return row[idx].strip() or None
            return None

        rfc = get("rfc")
        if not rfc or len(rfc) < 10:
            continue  # Skip rows with invalid RFC

        records.append({
            "rfc": rfc.upper(),
            "company_name": get("company_name") or "Unknown",
            "stage": _normalize_stage(get("stage")),
            "dof_date": get("dof_date"),
        })

    logger.info(f"Parsed {len(records)} SAT EFOS records")
    return records


def save_to_db(records: list[dict], db_path: Path = DB_PATH) -> dict:
    """Upsert records into sat_efos_vendors. Returns insert/replace counts."""
    if not records:
        return {"inserted": 0, "replaced": 0}

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA busy_timeout = 30000")
        conn.execute("PRAGMA journal_mode = WAL")
        cursor = conn.cursor()

        # Table and indexes already created via MCP; CREATE IF NOT EXISTS is safe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sat_efos_vendors (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                rfc         TEXT NOT NULL,
                company_name TEXT NOT NULL,
                stage       TEXT NOT NULL,
                dof_date    TEXT,
                loaded_at   TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_sat_efos_rfc ON sat_efos_vendors(rfc)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_sat_efos_stage ON sat_efos_vendors(stage)"
        )

        inserted = 0
        replaced = 0
        loaded_at = datetime.now().isoformat()

        for rec in records:
            existing = cursor.execute(
                "SELECT id FROM sat_efos_vendors WHERE rfc = ?", (rec["rfc"],)
            ).fetchone()

            cursor.execute("""
                INSERT OR REPLACE INTO sat_efos_vendors
                    (rfc, company_name, stage, dof_date, loaded_at)
                VALUES (?, ?, ?, ?, ?)
            """, (rec["rfc"], rec["company_name"], rec["stage"], rec["dof_date"], loaded_at))

            if existing:
                replaced += 1
            else:
                inserted += 1

        conn.commit()
        logger.info(f"SAT EFOS: {inserted} inserted, {replaced} replaced/updated")
        return {"inserted": inserted, "replaced": replaced}
    finally:
        conn.close()


def print_stage_summary(records: list[dict]) -> None:
    """Log a breakdown by stage."""
    from collections import Counter
    counts = Counter(r["stage"] for r in records)
    for stage, count in sorted(counts.items(), key=lambda x: -x[1]):
        logger.info(f"  {stage:>15}: {count:>7,}")


def load_from_file(path: str) -> list[dict]:
    """Load CSV from a local file path (Latin-1 / UTF-8)."""
    p = Path(path)
    if not p.exists():
        logger.error(f"File not found: {p.resolve()}")
        return []
    logger.info(f"Reading SAT EFOS from local file: {p.resolve()}")
    for encoding in ("utf-8-sig", "latin-1", "cp1252"):
        try:
            content = p.read_text(encoding=encoding)
            # Skip leading metadata lines until we hit the RFC header
            lines = content.split("\n")
            for i, line in enumerate(lines[:10]):
                if "RFC" in line and "Nombre" in line:
                    content = "\n".join(lines[i:])
                    break
            records = []
            reader = csv.reader(io.StringIO(content))
            header = [h.strip() for h in next(reader, [])]
            if not header:
                continue
            logger.info(f"Header columns: {header[:8]}")
            col_idx = {field: _find_col(header, candidates) for field, candidates in COLUMN_MAP.items()}
            logger.info(f"Column mapping: {col_idx}")
            for row in reader:
                if not any(row):
                    continue
                def get(field):
                    idx = col_idx.get(field)
                    if idx is not None and idx < len(row):
                        return row[idx].strip() or None
                    return None
                rfc = get("rfc")
                if not rfc or len(rfc) < 10:
                    continue
                records.append({
                    "rfc": rfc.upper(),
                    "company_name": get("company_name") or "Unknown",
                    "stage": _normalize_stage(get("stage")),
                    "dof_date": get("dof_date"),
                })
            if records:
                logger.info(f"Parsed {len(records)} records from {p.name}")
                return records
        except UnicodeDecodeError:
            continue
    logger.error("Could not parse file")
    return []


def main():
    parser = argparse.ArgumentParser(description="Load SAT Art. 69-B EFOS/EDOS ghost company list")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--url", default=None, help="Direct CSV download URL from SAT")
    source.add_argument("--file", help="Local CSV file path")
    parser.add_argument("--dry-run", action="store_true", help="Parse but do not write to DB")
    parser.add_argument("--show-sample", action="store_true", help="Print first 5 records")
    args = parser.parse_args()

    if args.file:
        records = load_from_file(args.file)
    else:
        records = download_and_parse(args.url or DEFAULT_URL)
    if not records:
        logger.warning("No records parsed — check URL or network access")
        logger.info(
            "Manual fallback: download the CSV from\n"
            "  http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm\n"
            "then run: python -m scripts.load_sat_efos --url file:///path/to/file.csv"
        )
        return

    print_stage_summary(records)

    if args.show_sample:
        for r in records[:5]:
            logger.info(f"  Sample: {r}")

    if args.dry_run:
        logger.info(f"Dry run — would save {len(records)} records")
    else:
        result = save_to_db(records)
        logger.info(f"Done: {result}")


if __name__ == "__main__":
    main()
