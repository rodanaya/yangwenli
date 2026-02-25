"""
Refresh ComprasMX 2025 contract data.

CompraNet was abolished April 10, 2025. ComprasMX launched April 18, 2025.
The 2025 CSV is updated periodically at the same URL pattern.

AUDIT FINDINGS (2026-02-25):
  - Contratos_CompraNet2025.csv already ingested: 90,895 contracts (Structure D)
  - Coverage confirmed through Aug/Sep 2025; sharp drop-off after Sept
  - Post-ComprasMX contracts (Apr 18 onward): 50,806 already in DB
  - Estimated gap: Oct 2025 – Feb 2026 (~5 months, ~50K contracts)
  - Structure: SAME as Structure D — no ETL code changes needed
  - Detection markers confirmed: 'Clave Ramo', 'Partida específica' both present

REFRESH PROCEDURE:
  1. Download latest CSV (see URL below)
  2. Replace original_data/Contratos_CompraNet2025.csv
  3. Run ETL: python -m scripts.etl_pipeline
     - Existing contract_hash index ensures zero duplicates on re-ingest
     - Only new contracts (Oct 2025 onward) will be inserted
  4. Run post-ETL scripts:
       python -m scripts.compute_factor_baselines  (if new sector/year combinations)
       python -m scripts.compute_z_features
       python -m scripts.calculate_risk_scores_v5 --batch-size 100000
       python -m scripts.precompute_stats

DATA SOURCE:
  URL: https://upcp-compranet.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2025.csv
  Alt: https://comprasmx.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2025.csv
  Updated: Monthly (typically mid-month)

STRUCTURE VERIFICATION:
  Run this after downloading to confirm Structure D compatibility:
    python -m scripts.refresh_comprasmx_2025 --verify path/to/Contratos_CompraNet2025.csv

Usage:
    python -m scripts.refresh_comprasmx_2025 --verify <csv_path>
    python -m scripts.refresh_comprasmx_2025 --stats
"""

import argparse
import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA_DIR = Path(__file__).parent.parent.parent / "original_data"

# Structure D detection markers (same as etl_pipeline.detect_structure)
STRUCTURE_D_MARKERS = [
    "Clave Ramo",
    "Partida específica",
    "Partida especifica",
    "Descripción Ramo",
    "Descripcion Ramo",
]

# Critical Structure D fields we expect
STRUCTURE_D_REQUIRED = {
    "institution": ["Institución", "Institucion"],
    "vendor": ["Proveedor o contratista"],
    "amount": ["Importe DRC", "Monto sin imp./mínimo", "Monto sin imp./minimo"],
    "procedure": ["Tipo Procedimiento"],
    "ramo": ["Clave Ramo"],
}

COMPRASMX_LAUNCH = "2025-04-18"


def verify_structure(csv_path: Path) -> bool:
    """
    Read the CSV header and verify it matches Structure D.
    Returns True if compatible, False if new Structure E mapping is needed.
    """
    try:
        import pandas as pd
    except ImportError:
        logger.error("pandas not installed — run: pip install pandas")
        return False

    logger.info(f"Reading header from {csv_path.name}...")
    try:
        for encoding in ("latin-1", "utf-8", "cp1252"):
            try:
                df = pd.read_csv(csv_path, nrows=5, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            logger.error("Could not decode file with any supported encoding")
            return False
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return False

    cols = set(df.columns)
    logger.info(f"Column count: {len(cols)}")
    logger.info(f"First 10 columns: {list(df.columns)[:10]}")

    # Check Structure D markers
    found_markers = [m for m in STRUCTURE_D_MARKERS if m in cols]
    if not found_markers:
        logger.error("STRUCTURE D MARKERS NOT FOUND — possible new Structure E format!")
        logger.error("ETL pipeline changes may be required before ingestion.")
        logger.error(f"Columns in file: {sorted(cols)}")
        return False

    logger.info(f"Structure D markers found: {found_markers}")

    # Check required column groups
    missing_groups = []
    for group, candidates in STRUCTURE_D_REQUIRED.items():
        if not any(c in cols for c in candidates):
            missing_groups.append(group)

    if missing_groups:
        logger.warning(f"Missing required groups: {missing_groups}")
        logger.warning("ETL will proceed with caution — validate output carefully")
    else:
        logger.info("All required column groups present — Structure D COMPATIBLE")

    # Check for new unknown columns (potential Structure E additions)
    known_d_columns = {
        "Orden de gobierno", "Clave Ramo", "Descripción Ramo", "Descripcion Ramo",
        "Tipo de Institución", "Tipo de Institucion", "Clave Institución", "Clave Institucion",
        "Siglas de la Institución", "Siglas de la Institucion", "Institución", "Institucion",
        "Clave de la UC", "Nombre de la UC", "Código del expediente", "Codigo del expediente",
        "Referencia del expediente", "Título del expediente", "Titulo del expediente",
        "Partida específica", "Partida especifica", "Ley", "Tipo Procedimiento",
        "Artículo de excepción", "Articulo de excepcion", "Contrato marco",
        "Compra consolidada", "Número de procedimiento", "Numero de procedimiento",
        "Tipo de contratación", "Tipo de contratacion", "Carácter del procedimiento",
        "Caracter del procedimiento", "Forma de participación", "Forma de participacion",
        "Fecha de publicación", "Fecha de publicacion", "Fecha de apertura",
        "Fecha de fallo", "Código del contrato", "Codigo del contrato",
        "Núm. del contrato", "Num. del contrato", "Título del contrato", "Titulo del contrato",
        "Descripción del contrato", "Descripcion del contrato", "Contrato plurianual",
        "Fecha de inicio del contrato", "Fecha de fin del contrato",
        "Fecha de firma del contrato", "Importe DRC", "Moneda", "Estatus Contrato",
        "Tipo de contrato", "Monto sin imp./mínimo", "Monto sin imp./minimo",
        "Monto sin imp./máximo", "Monto sin imp./maximo", "rfc", "RFC",
        "Proveedor o contratista", "Folio en el RUPC", "País de la empresa",
        "Pais de la empresa", "Nacionalidad proveedor o contratista",
        "Estratificación", "Estratificacion", "Dirección del anuncio",
        "Direccion del anuncio",
    }
    new_columns = cols - known_d_columns
    if new_columns:
        logger.warning(f"NEW COLUMNS NOT IN STRUCTURE D MAPPING ({len(new_columns)}):")
        for c in sorted(new_columns):
            logger.warning(f"  + {c!r}")
        logger.warning("These will be silently ignored by the ETL. Add to MAPPING_D if needed.")
    else:
        logger.info("No new columns detected — full Structure D compatibility confirmed")

    return len(missing_groups) == 0


def show_db_stats() -> None:
    """Show current 2025 coverage in the database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        # Coverage by month
        rows = conn.execute("""
            SELECT
                SUBSTR(COALESCE(award_date, publication_date), 1, 7) as month,
                COUNT(*) as n
            FROM contracts
            WHERE contract_year = 2025
              AND SUBSTR(COALESCE(award_date, publication_date), 1, 4) = '2025'
            GROUP BY month
            ORDER BY month
        """).fetchall()

        logger.info("=== 2025 CONTRACT COVERAGE IN DATABASE ===")
        for r in rows:
            bar = "█" * min(30, r["n"] // 400)
            logger.info(f"  {r['month']}  {r['n']:>6,}  {bar}")

        # Post-ComprasMX count
        post = conn.execute("""
            SELECT COUNT(*) as n, ROUND(SUM(amount_mxn)/1e9, 1) as bn
            FROM contracts
            WHERE contract_year = 2025
              AND award_date >= ?
        """, (COMPRASMX_LAUNCH,)).fetchone()
        logger.info(f"\nPost-ComprasMX ({COMPRASMX_LAUNCH} onward): {post['n']:,} contracts / {post['bn']} B MXN")

        # Latest record
        latest = conn.execute("""
            SELECT MAX(award_date) as latest FROM contracts WHERE contract_year = 2025
        """).fetchone()
        logger.info(f"Latest award_date in DB: {latest['latest']}")
        logger.info(f"\nRefresh URL: https://upcp-compranet.buengobierno.gob.mx/"
                    f"cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet2025.csv")

    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="ComprasMX 2025 data refresh utility")
    parser.add_argument("--verify", metavar="CSV_PATH",
                        help="Verify CSV header is Structure D compatible before ETL")
    parser.add_argument("--stats", action="store_true",
                        help="Show current 2025 coverage in the database")
    args = parser.parse_args()

    if args.verify:
        csv_path = Path(args.verify)
        if not csv_path.exists():
            logger.error(f"File not found: {csv_path}")
            return
        compatible = verify_structure(csv_path)
        if compatible:
            logger.info("\nREADY FOR ETL — run: python -m scripts.etl_pipeline")
        else:
            logger.error("\nDO NOT RUN ETL until column mapping is updated in etl_pipeline.py")

    elif args.stats:
        show_db_stats()

    else:
        parser.print_help()
        print("\nQuick start:")
        print("  1. Download: https://upcp-compranet.buengobierno.gob.mx/cnetassets/"
              "datos_abiertos_contratos_expedientes/Contratos_CompraNet2025.csv")
        print("  2. Verify:   python -m scripts.refresh_comprasmx_2025 --verify /path/to/file.csv")
        print("  3. Replace:  cp /path/to/file.csv original_data/Contratos_CompraNet2025.csv")
        print("  4. Ingest:   python -m scripts.etl_pipeline")


if __name__ == "__main__":
    main()
