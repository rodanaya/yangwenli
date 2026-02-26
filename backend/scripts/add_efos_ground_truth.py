"""
Add SAT EFOS Art. 69-B definitivo vendors as ground truth case 22.

SAT's blacklist of confirmed ghost companies (empresas fantasma) that issued
fraudulent invoices (CFDI) to government agencies. These are *legally confirmed*
by the SAT under Art. 69-B of the Código Fiscal — the highest-confidence
external validation available.

This case fills a critical gap in v5.0 training data: the model was trained on
large, concentrated vendors. EFOS definitivo vendors are small shell companies
with few contracts — a different corruption pattern the model currently misses
entirely (avg risk score: 0.028).

After inserting ground truth, runs the full v5 calibration + scoring pipeline.

Usage:
    python -m scripts.add_efos_ground_truth [--dry-run] [--skip-scoring]
"""
import argparse
import logging
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
SCRIPTS_DIR = Path(__file__).parent

CASE_ID_STR = "SAT_EFOS_DEFINITIVO_GHOST_NETWORK"
CASE_NAME = "SAT EFOS Art. 69-B Definitivo Ghost Company Network"


def get_efos_vendors(conn: sqlite3.Connection) -> list[dict]:
    """Return all EFOS definitivo vendors that match a RUBLI vendor by RFC."""
    rows = conn.execute("""
        SELECT e.rfc, v.id AS vendor_id, e.company_name, e.dof_date,
               COUNT(c.id) AS contracts,
               ROUND(SUM(c.amount_mxn) / 1e6, 2) AS value_mm
        FROM sat_efos_vendors e
        JOIN vendors v ON v.rfc = e.rfc
        JOIN contracts c ON c.vendor_id = v.id
        WHERE e.stage = 'definitivo'
        GROUP BY e.rfc
        ORDER BY contracts DESC
    """).fetchall()
    return [
        {
            "rfc": r[0],
            "vendor_id": r[1],
            "company_name": r[2],
            "dof_date": r[3],
            "contracts": r[4],
            "value_mm": r[5],
        }
        for r in rows
    ]


def insert_case(cursor: sqlite3.Cursor) -> int:
    """Insert the EFOS ground truth case. Return its id."""
    # Check if already exists
    existing = cursor.execute(
        "SELECT id FROM ground_truth_cases WHERE case_id = ?", (CASE_ID_STR,)
    ).fetchone()
    if existing:
        logger.info(f"Case '{CASE_ID_STR}' already exists (id={existing[0]})")
        return existing[0]

    cursor.execute("""
        INSERT INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, source_asf, source_news, source_legal,
             confidence_level, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        CASE_ID_STR,
        CASE_NAME,
        "ghost_company",
        2014,  # Art. 69-B mechanism enacted 2014
        2026,
        None,  # actual fraud amounts unknown (invoiced amounts, not contracts)
        None,
        "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm",
        "Art. 69-B Código Fiscal de la Federación — SAT resolución definitiva",
        "high",  # SAT legal resolution = highest confidence
        (
            "Vendors confirmed by SAT as Empresas Fantasma (ghost companies) that issued "
            "fraudulent CFDIs to government agencies. Matched to RUBLI by exact RFC. "
            "These represent small-shell-company invoice fraud — a pattern distinct from "
            "the large concentrated vendors in v5.0 training data. "
            "Source: SAT datos abiertos, Listado_Completo_69_articulo69B.csv, Jan 2026 edition."
        ),
    ))
    case_db_id = cursor.lastrowid
    logger.info(f"Inserted ground truth case id={case_db_id}: {CASE_NAME}")
    return case_db_id


def insert_vendors(cursor: sqlite3.Cursor, case_db_id: int, vendors: list[dict]) -> int:
    """Insert vendor records. Skip any already linked to this case."""
    existing_vendor_ids = {
        r[0] for r in cursor.execute(
            "SELECT vendor_id FROM ground_truth_vendors WHERE case_id = ?",
            (case_db_id,)
        ).fetchall()
    }

    inserted = 0
    for v in vendors:
        if v["vendor_id"] in existing_vendor_ids:
            continue
        cursor.execute("""
            INSERT INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, rfc_source,
                 role, evidence_strength, match_method, match_confidence, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_db_id,
            v["vendor_id"],
            v["company_name"],
            v["rfc"],
            "shell_company",
            "high",  # SAT resolution definitiva = high evidence
            "rfc_exact",
            1.0,
            f"{v['contracts']} contracts, {v['value_mm']} M MXN. DOF: {v['dof_date'] or 'unknown'}",
        ))
        inserted += 1

    return inserted


def flag_ghost_vendors(cursor: sqlite3.Cursor, vendors: list[dict]) -> int:
    """Set vendors.is_ghost_company = 1 for all matched EFOS definitivo vendors."""
    vendor_ids = [v["vendor_id"] for v in vendors]
    cursor.executemany(
        "UPDATE vendors SET is_ghost_company = 1 WHERE id = ?",
        [(vid,) for vid in vendor_ids],
    )
    return len(vendor_ids)


def run_pipeline(skip_scoring: bool):
    """Run calibrate → score → precompute_stats."""
    backend_dir = DB_PATH.parent

    steps = [
        ("Calibrating v5 model", [sys.executable, "-m", "scripts.calibrate_risk_model_v5"]),
    ]
    if not skip_scoring:
        steps += [
            ("Scoring all contracts", [sys.executable, "-m", "scripts.calculate_risk_scores_v5", "--batch-size", "100000"]),
            ("Precomputing stats", [sys.executable, "-m", "scripts.precompute_stats"]),
        ]

    for label, cmd in steps:
        logger.info(f"--- {label} ---")
        result = subprocess.run(cmd, cwd=str(backend_dir))
        if result.returncode != 0:
            logger.error(f"Step failed: {label}")
            sys.exit(1)
        logger.info(f"  Done.")


def main():
    parser = argparse.ArgumentParser(description="Add EFOS definitivo ground truth and retrain v5")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be inserted without writing")
    parser.add_argument("--skip-scoring", action="store_true", help="Insert ground truth but skip model retraining")
    args = parser.parse_args()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA journal_mode = WAL")

    vendors = get_efos_vendors(conn)
    total_contracts = sum(v["contracts"] for v in vendors)
    total_value = sum(v["value_mm"] for v in vendors)

    logger.info(f"EFOS definitivo vendors matched to RUBLI: {len(vendors)}")
    logger.info(f"  Total contracts: {total_contracts}")
    logger.info(f"  Total value: {total_value:.1f} M MXN")
    logger.info("  Top vendors by contract count:")
    for v in vendors[:5]:
        logger.info(f"    {v['company_name'][:50]:50s} | {v['contracts']:3d} contracts | {v['value_mm']:8.2f} M MXN")

    if args.dry_run:
        logger.info("Dry run — no writes")
        conn.close()
        return

    cursor = conn.cursor()
    case_db_id = insert_case(cursor)
    n_vendors = insert_vendors(cursor, case_db_id, vendors)
    n_flagged = flag_ghost_vendors(cursor, vendors)
    conn.commit()

    logger.info(f"Inserted {n_vendors} vendor records into ground_truth_vendors")
    logger.info(f"Flagged {n_flagged} vendors as is_ghost_company=1")

    # Verify totals
    gt_count = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id = ?", (case_db_id,)
    ).fetchone()[0]
    logger.info(f"Total ground_truth_vendors for this case: {gt_count}")

    conn.close()

    if not args.skip_scoring:
        logger.info("Running model retraining pipeline...")
        run_pipeline(skip_scoring=False)
    else:
        logger.info("--skip-scoring set — ground truth inserted, model not retrained")
        logger.info("To retrain manually:")
        logger.info("  python -m scripts.calibrate_risk_model_v5")
        logger.info("  python -m scripts.calculate_risk_scores_v5 --batch-size 100000")
        logger.info("  python -m scripts.precompute_stats")


if __name__ == "__main__":
    main()
