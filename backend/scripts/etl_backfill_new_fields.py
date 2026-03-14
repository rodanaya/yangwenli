"""
ETL Backfill: Extract new fields from original COMPRANET files.

Adds 5 new columns to contracts table and backfills them from raw data:
  - has_amendment (INT): 1 if convenio modificatorio exists
  - exception_article (TEXT): Legal exception article (Art. 41/42)
  - caso_fortuito (TEXT): Emergency procurement reason
  - opening_date (TEXT): Fecha de apertura de proposiciones
  - responsible_uc (TEXT): Name of responsible UC official

Does NOT re-run full ETL. Matches existing contracts by procedure_number + source_year.

Usage:
    cd backend
    python -m scripts.etl_backfill_new_fields [--dry-run] [--year 2023]
"""
import sqlite3
import pandas as pd
import os
import sys
import logging
import argparse
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('etl_backfill')

SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = PROJECT_DIR / 'original_data'
DB_PATH = BACKEND_DIR / 'RUBLI_NORMALIZED.db'

# ---------------------------------------------------------------------------
# Column mapping per structure for new fields
# ---------------------------------------------------------------------------

# Structure B (2010-2017): UPPERCASE columns
FIELDS_B = {
    'convenio_modificatorio': ['CONVENIO_MODIFICATORIO'],
    'responsible_uc': ['RESPONSABLE'],
}

# Structure C (2018-2022): Mixed case
FIELDS_C = {
    'responsible_uc': ['Responsable de la UC'],
    'rfc_sat_verified': ['RFC verificado en el SAT'],
    'opening_date': ['Fecha de apertura'],
}

# Structure D (2023-2025): Mixed case, 73 columns
FIELDS_D = {
    'convenio_modificatorio': ['Convenio modificatorio'],
    'exception_article': ['Artículo de excepción', 'Articulo de excepcion'],
    'exception_description': ['Descripción excepción', 'Descripcion excepcion'],
    'caso_fortuito': ['La contratación es por Caso fortuito o fuerza mayor',
                      'La contratacion es por Caso fortuito o fuerza mayor'],
    'opening_date': ['Fecha de apertura'],
    'vendor_size_raw': ['Estratificación', 'Estratificacion'],
}

# Procedure number column per structure
PROC_NUM_COL = {
    'B': 'NUMERO_PROCEDIMIENTO',
    'C': 'Número del procedimiento',
    'D': 'Número de procedimiento',
}

YEAR_COL = {
    'B': None,  # from filename
    'C': None,
    'D': None,
}

# ---------------------------------------------------------------------------
# Schema migration
# ---------------------------------------------------------------------------

NEW_COLUMNS = [
    ('has_amendment', 'INTEGER DEFAULT 0'),
    ('exception_article', 'TEXT'),
    ('caso_fortuito', 'TEXT'),
    ('opening_date', 'TEXT'),
    ('responsible_uc', 'TEXT'),
]


def migrate_schema(conn: sqlite3.Connection) -> None:
    """Add new columns if they don't exist."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(contracts)")
    existing = {row[1] for row in cur.fetchall()}

    for col_name, col_def in NEW_COLUMNS:
        if col_name not in existing:
            logger.info(f"Adding column: {col_name} {col_def}")
            cur.execute(f"ALTER TABLE contracts ADD COLUMN {col_name} {col_def}")
        else:
            logger.info(f"Column already exists: {col_name}")

    conn.commit()


# ---------------------------------------------------------------------------
# File reading helpers
# ---------------------------------------------------------------------------

def detect_structure_for_file(filename: str) -> str:
    """Detect structure from filename."""
    name = filename.lower()
    if name.endswith('.csv') and 'compranet' in name:
        return 'D'
    # xlsx files
    year_str = ''.join(c for c in os.path.splitext(filename)[0] if c.isdigit())
    if year_str:
        year = int(year_str[:4])
        if year <= 2010:
            return 'A'
        elif year <= 2017:
            return 'B'
        else:
            return 'C'
    return 'B'


def extract_year_from_filename(filename: str) -> int:
    """Extract year from filename."""
    name = os.path.splitext(filename)[0]
    # Handle "2010-2012" → 2010
    digits = ''.join(c for c in name if c.isdigit() or c == '-')
    if '-' in digits:
        parts = digits.split('-')
        return int(parts[0])
    return int(digits[:4]) if digits else 0


def get_col(df_columns: list, candidates: list) -> str:
    """Find the first matching column name."""
    for c in candidates:
        if c in df_columns:
            return c
    return ''


def read_file(filepath: Path, structure: str) -> pd.DataFrame:
    """Read an xlsx or csv file."""
    if filepath.suffix == '.csv':
        return pd.read_csv(filepath, encoding='latin-1', on_bad_lines='skip',
                           low_memory=False, dtype=str)
    else:
        return pd.read_excel(filepath, dtype=str)


# ---------------------------------------------------------------------------
# Backfill logic
# ---------------------------------------------------------------------------

def backfill_file(conn: sqlite3.Connection, filepath: Path, dry_run: bool = False) -> dict:
    """Backfill new fields from a single file."""
    filename = filepath.name
    structure = detect_structure_for_file(filename)
    source_year = extract_year_from_filename(filename)

    if structure == 'A':
        logger.info(f"Skipping {filename} (Structure A, no new fields)")
        return {'file': filename, 'structure': 'A', 'updated': 0, 'skipped': True}

    logger.info(f"Processing {filename} (Structure {structure}, year {source_year})")

    # Select field mapping
    field_map = {'B': FIELDS_B, 'C': FIELDS_C, 'D': FIELDS_D}[structure]

    # Read file
    df = read_file(filepath, structure)
    cols = list(df.columns)
    logger.info(f"  Read {len(df)} rows, {len(cols)} columns")

    # Find procedure number column
    proc_candidates = {
        'B': ['NUMERO_PROCEDIMIENTO'],
        'C': ['Número del procedimiento', 'Numero del procedimiento'],
        'D': ['Número de procedimiento', 'Numero de procedimiento'],
    }
    proc_col = get_col(cols, proc_candidates[structure])
    if not proc_col:
        logger.warning(f"  No procedure number column found, skipping")
        return {'file': filename, 'structure': structure, 'updated': 0, 'skipped': True}

    # Resolve field columns
    resolved_fields = {}
    for field_name, candidates in field_map.items():
        col = get_col(cols, candidates)
        if col:
            resolved_fields[field_name] = col
            non_null = df[col].notna().sum()
            logger.info(f"  Field {field_name} → column '{col}' ({non_null}/{len(df)} non-null)")

    if not resolved_fields:
        logger.info(f"  No new fields found in {filename}")
        return {'file': filename, 'structure': structure, 'updated': 0, 'skipped': True}

    # Build updates
    cur = conn.cursor()
    updated = 0
    batch = []
    batch_size = 5000

    for idx, row in df.iterrows():
        proc_num = row.get(proc_col)
        if pd.isna(proc_num) or not str(proc_num).strip():
            continue

        proc_num = str(proc_num).strip()

        # Build SET clause values
        updates = {}
        for field_name, col_name in resolved_fields.items():
            val = row.get(col_name)
            if pd.isna(val):
                continue
            val = str(val).strip()
            if not val:
                continue

            if field_name == 'convenio_modificatorio':
                # Convert to boolean: SI/1 = has amendment
                updates['has_amendment'] = 1 if val.upper() in ('SI', 'SÍ', '1', 'YES') else 0
            elif field_name == 'exception_article':
                updates['exception_article'] = val[:200]
            elif field_name == 'caso_fortuito':
                if val.upper() != 'NO':
                    updates['caso_fortuito'] = val[:200]
            elif field_name == 'opening_date':
                updates['opening_date'] = val[:20]
            elif field_name == 'responsible_uc':
                updates['responsible_uc'] = val[:200]

        if not updates:
            continue

        # Build UPDATE
        set_clause = ', '.join(f"{k} = ?" for k in updates)
        values = list(updates.values())
        values.extend([proc_num, source_year])

        batch.append((set_clause, values))

        if len(batch) >= batch_size:
            if not dry_run:
                updated += _flush_batch(cur, batch)
            else:
                updated += len(batch)
            batch = []

    # Flush remaining
    if batch:
        if not dry_run:
            updated += _flush_batch(cur, batch)
        else:
            updated += len(batch)

    if not dry_run:
        conn.commit()

    logger.info(f"  Updated {updated} contracts from {filename}")
    return {'file': filename, 'structure': structure, 'updated': updated, 'skipped': False}


def _flush_batch(cur: sqlite3.Cursor, batch: list) -> int:
    """Execute a batch of updates."""
    updated = 0
    for set_clause, values in batch:
        try:
            cur.execute(
                f"UPDATE contracts SET {set_clause} "
                f"WHERE procedure_number = ? AND source_year = ?",
                values
            )
            updated += cur.rowcount
        except Exception as e:
            logger.debug(f"Update failed: {e}")
    return updated


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Backfill new fields from COMPRANET files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated')
    parser.add_argument('--year', type=int, help='Process only a specific year')
    args = parser.parse_args()

    if not DB_PATH.exists():
        logger.error(f"Database not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA busy_timeout=30000")

    # Step 1: Migrate schema
    logger.info("=== Step 1: Schema migration ===")
    migrate_schema(conn)

    # Step 2: Find files to process
    files = sorted(DATA_DIR.iterdir())
    data_files = [f for f in files if f.suffix in ('.xlsx', '.csv')]
    logger.info(f"=== Step 2: Found {len(data_files)} data files ===")

    if args.year:
        data_files = [f for f in data_files if str(args.year) in f.stem]
        logger.info(f"  Filtered to year {args.year}: {len(data_files)} files")

    # Step 3: Process each file
    logger.info("=== Step 3: Backfilling new fields ===")
    results = []
    total_updated = 0

    for filepath in data_files:
        try:
            result = backfill_file(conn, filepath, dry_run=args.dry_run)
            results.append(result)
            total_updated += result['updated']
        except Exception as e:
            logger.error(f"Error processing {filepath.name}: {e}")
            results.append({'file': filepath.name, 'error': str(e)})

    # Summary
    logger.info("=== Summary ===")
    for r in results:
        if r.get('skipped'):
            logger.info(f"  {r['file']}: skipped")
        elif r.get('error'):
            logger.info(f"  {r['file']}: ERROR - {r['error']}")
        else:
            logger.info(f"  {r['file']}: {r['updated']} contracts updated")

    logger.info(f"\nTotal contracts updated: {total_updated}")
    if args.dry_run:
        logger.info("(DRY RUN — no changes written)")

    # Step 4: Create index for new fields
    if not args.dry_run and total_updated > 0:
        logger.info("=== Step 4: Creating indexes ===")
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_contracts_has_amendment ON contracts(has_amendment)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_contracts_exception_article ON contracts(exception_article)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_contracts_caso_fortuito ON contracts(caso_fortuito)")
            conn.commit()
            logger.info("  Indexes created")
        except Exception as e:
            logger.warning(f"  Index creation failed: {e}")

    conn.close()
    logger.info("Done!")


if __name__ == '__main__':
    main()
