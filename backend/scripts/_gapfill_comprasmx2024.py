"""
Gap-fill: insert missing 2024 records from ComprasMX into RUBLI_NORMALIZED.db.

Dedup key: procedure_number + vendor_rfc
(RFC is 100% populated in ComprasMX 2024 — reliable unique key.)

Run with --dry-run to preview, then without to insert.
"""
import csv
import sqlite3
import sys
import re
from datetime import datetime
from pathlib import Path

FILE = Path(__file__).parent.parent / "data/comprasmx/Contratos_CompraNet2024.csv"
DB   = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DRY_RUN = "--dry-run" in sys.argv

MAX_AMOUNT = 100_000_000_000

RAMO_SECTOR = {
    12: 1, 50: 1, 51: 1,
    11: 2, 25: 2, 48: 2,
     9: 3, 15: 3, 21: 3,
    18: 4, 45: 4, 46: 4, 52: 4, 53: 4,
     7: 5, 13: 5,
    38: 6, 42: 6,
     6: 7, 23: 7, 24: 7,
     1: 8,  2: 8,  3: 8,  4: 8,
     5: 8, 17: 8, 22: 8, 27: 8, 35: 8, 36: 8, 43: 8,
     8: 9,
    16: 10,
    14: 11, 19: 11, 40: 11,
}


def parse_date(val):
    if not val or not val.strip():
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(val.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_amount(val):
    try:
        return float((val or "0").replace(",", "").strip())
    except ValueError:
        return 0.0


def get(row, *keys):
    for k in keys:
        v = row.get(k, "").strip()
        if v:
            return v
    return None


def main():
    print(f"\n{'='*60}")
    print(f"COMPRASMX 2024 GAP-FILL {'[DRY RUN]' if DRY_RUN else '[LIVE INSERT]'}")
    print(f"{'='*60}\n")

    # ── Load CSV ─────────────────────────────────────────────────────
    print("Loading CSV (latin-1)...")
    with open(FILE, encoding="latin-1", errors="replace") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)
    print(f"  Total rows : {len(all_rows):,}")

    apf_rows = [r for r in all_rows
                if r.get("Orden de gobierno", "").strip().upper() == "APF"]
    print(f"  APF only   : {len(apf_rows):,}")

    # Build (proc_num, rfc) → row map, skip >100B
    file_map = {}
    for r in apf_rows:
        proc = get(r, "Número de procedimiento", "Numero de procedimiento") or ""
        rfc  = get(r, "rfc", "RFC") or ""
        amt  = parse_amount(get(r, "Importe DRC") or "0")
        if amt > MAX_AMOUNT or not proc:
            continue
        file_map[(proc, rfc)] = r
    print(f"  Valid rows  : {len(file_map):,}\n")

    # ── Build DB dedup set ────────────────────────────────────────────
    print("Building DB dedup keys for 2024...")
    conn = sqlite3.connect(DB)

    db_keys = set()
    for proc, rfc in conn.execute("""
        SELECT c.procedure_number, v.rfc
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        WHERE c.contract_year = 2024
          AND c.procedure_number IS NOT NULL
    """):
        db_keys.add((proc or "", rfc or ""))
    print(f"  DB 2024 keys : {len(db_keys):,}")

    # Also add rows where RFC is null but procedure_number matches (conservative)
    db_proc_only = set(conn.execute(
        "SELECT procedure_number FROM contracts WHERE contract_year = 2024 AND procedure_number IS NOT NULL"
    ).fetchall())
    db_proc_only = {r[0] for r in db_proc_only}

    missing = {}
    for (proc, rfc), row in file_map.items():
        if (proc, rfc) not in db_keys and proc not in db_proc_only:
            missing[(proc, rfc)] = row

    print(f"  File keys    : {len(file_map):,}")
    print(f"  Missing      : {len(missing):,}")

    if not missing:
        print("\nDB is already up to date for 2024.")
        conn.close()
        return

    # ── Lookups ───────────────────────────────────────────────────────
    vendors_by_rfc  = {r[0]: r[1] for r in conn.execute(
        "SELECT rfc, id FROM vendors WHERE rfc IS NOT NULL")}
    inst_by_name    = {r[0]: r[1] for r in conn.execute(
        "SELECT name, id FROM institutions WHERE name IS NOT NULL")}
    cu_by_clave     = {r[0]: r[1] for r in conn.execute(
        "SELECT clave_uc, id FROM contracting_units WHERE clave_uc IS NOT NULL")}

    # ── Preview / Insert ──────────────────────────────────────────────
    print(f"\n{'--- PREVIEW (first 10) ---' if DRY_RUN else '--- INSERTING ---'}")
    inserted = skipped = 0

    for i, ((proc, rfc), r) in enumerate(missing.items()):
        vname    = get(r, "Proveedor o contratista") or ""
        amt      = parse_amount(get(r, "Importe DRC") or "0")
        pub_date = parse_date(get(r, "Fecha de publicación", "Fecha de publicacion"))
        start_d  = parse_date(get(r, "Fecha de inicio del contrato"))
        end_d    = parse_date(get(r, "Fecha de fin del contrato"))
        award_d  = parse_date(get(r, "Fecha de fallo"))
        open_d   = parse_date(get(r, "Fecha de apertura"))
        cy       = int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else 2024
        cm_str   = pub_date[5:7] if pub_date and len(pub_date) >= 7 else None
        cm       = int(cm_str) if cm_str and cm_str.isdigit() else None

        ramo_raw = get(r, "Clave Ramo") or "0"
        try:
            ramo_id = int(ramo_raw)
        except ValueError:
            ramo_id = 0
        sector_id = RAMO_SECTOR.get(ramo_id, 12)

        proc_type = get(r, "Tipo Procedimiento") or ""
        is_da     = 1 if "ADJUDICACI" in proc_type.upper() else 0
        is_multi  = 1 if (get(r, "Contrato plurianual") or "").upper() == "SI" else 0
        currency  = get(r, "Moneda") or "MXN"
        inst_name = get(r, "Institución", "Institucion") or ""
        exp_art   = get(r, "Artículo de excepción", "Articulo de excepcion") or ""
        is_cf     = 1 if "FORTUITO" in (get(r, "La contratación es por Caso fortuito o fuerza mayor") or "").upper() else 0

        vendor_id  = vendors_by_rfc.get(rfc)
        inst_id    = inst_by_name.get(inst_name)
        uc_clave   = get(r, "Clave de la UC") or ""
        cu_id      = cu_by_clave.get(uc_clave)

        is_ye = 1 if cm == 12 else 0
        is_hv = 1 if amt > 10_000_000_000 else 0

        if DRY_RUN:
            if i < 10:
                print(f"\n  [{i+1}] {proc}")
                print(f"       Vendor  : {vname[:55]}")
                print(f"       RFC     : {rfc}  |  vendor_id={vendor_id}")
                print(f"       Amount  : {amt/1e6:.3f}M MXN  |  {cy}-{cm:02d}" if cm else
                      f"       Amount  : {amt/1e6:.3f}M MXN  |  {cy}")
                print(f"       Type    : {proc_type[:55]}")
                print(f"       Inst    : {inst_name[:45]}  (id={inst_id})")
            continue

        try:
            conn.execute("""
                INSERT INTO contracts (
                    source_structure, source_year,
                    vendor_id, institution_id, contracting_unit_id,
                    sector_id, ramo_id,
                    procedure_number, procedure_type, contract_year, contract_month,
                    amount_mxn, amount_original, currency,
                    is_direct_award, is_multiannual, is_year_end, is_high_value,
                    publication_date, start_date, end_date, award_date, opening_date,
                    exception_article, caso_fortuito,
                    risk_model_version
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                "D", 2024,
                vendor_id, inst_id, cu_id,
                sector_id, ramo_id,
                proc, proc_type, cy, cm,
                amt, amt, currency,
                is_da, is_multi, is_ye, is_hv,
                pub_date, start_d, end_d, award_d, open_d,
                exp_art, is_cf,
                "pending_score"
            ))
            inserted += 1
        except sqlite3.Error as e:
            skipped += 1
            if skipped <= 5:
                print(f"  SKIP: {e} | {proc}")

    if DRY_RUN:
        print(f"\n[DRY RUN] Would insert {len(missing):,} records.")
        print("Run without --dry-run to execute.")
    else:
        conn.commit()
        print(f"\nInserted : {inserted:,}")
        print(f"Skipped  : {skipped:,}")
        print("\nNOTE: New rows tagged risk_model_version='pending_score'.")
        print("      Run /score-contracts to score when ready.")

    conn.close()


if __name__ == "__main__":
    main()
