"""
Generic validate + gap-fill for any ComprasMX Structure D CSV.

Usage:
    python _validate_and_gapfill_comprasmx.py <year> [--dry-run] [--validate-only]

Examples:
    python _validate_and_gapfill_comprasmx.py 2023 --dry-run
    python _validate_and_gapfill_comprasmx.py 2023
    python _validate_and_gapfill_comprasmx.py 2022 --validate-only
"""
import csv
import sqlite3
import sys
import re
from datetime import datetime
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python _validate_and_gapfill_comprasmx.py <year> [--dry-run] [--validate-only]")
    sys.exit(1)

YEAR         = sys.argv[1]
DRY_RUN      = "--dry-run" in sys.argv
VALIDATE_ONLY = "--validate-only" in sys.argv
FILE = Path(__file__).parent.parent / f"data/comprasmx/Contratos_CompraNet{YEAR}.csv"
DB   = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

MAX_AMOUNT  = 100_000_000_000
FLAG_AMOUNT =  10_000_000_000

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
    print(f"COMPRASMX {YEAR} — VALIDATE + GAP-FILL")
    mode = "[VALIDATE ONLY]" if VALIDATE_ONLY else ("[DRY RUN]" if DRY_RUN else "[LIVE INSERT]")
    print(f"Mode: {mode}")
    print(f"{'='*60}\n")

    if not FILE.exists():
        print(f"ERROR: File not found: {FILE}")
        sys.exit(1)

    print(f"File : {FILE.name}  ({FILE.stat().st_size/1e6:.1f} MB)")

    # ── Load CSV ─────────────────────────────────────────────────────
    with open(FILE, encoding="latin-1", errors="replace") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)
        headers  = reader.fieldnames or []

    print(f"Encoding : latin-1 | Columns : {len(headers)} | Rows : {len(all_rows):,}")

    apf_rows = [r for r in all_rows
                if r.get("Orden de gobierno", "").strip().upper() == "APF"]

    from collections import Counter
    gov_counts = Counter(r.get("Orden de gobierno","").strip() for r in all_rows)
    print("\n── Orden de Gobierno ──")
    for g, cnt in gov_counts.most_common(8):
        print(f"  {g or '(blank)':30s} {cnt:>7,}  ({cnt*100/len(all_rows):.1f}%)")

    # ── Amounts ──────────────────────────────────────────────────────
    amount_col = next((c for c in headers if "Importe" in c and "DRC" in c), None)
    vendor_col = next((c for c in headers if "Proveedor" in c and "contratista" in c), None)
    inst_col   = next((c for c in headers if c.strip() in ("Institución","Institucion")), None)
    rfc_col    = next((c for c in headers if c.strip().lower() == "rfc"), None)
    date_col   = next((c for c in headers if "publicaci" in c.lower()), None)
    tipo_col   = next((c for c in headers if "Tipo" in c and "Procedimiento" in c), None)

    print("\n── Amounts (APF only) ──")
    amounts, flagged, rejected = [], [], []
    for r in apf_rows:
        a = parse_amount(get(r, amount_col) if amount_col else "0")
        amounts.append(a)
        if a > MAX_AMOUNT:
            rejected.append((a, r))
        elif a > FLAG_AMOUNT:
            flagged.append((a, r))

    if amounts:
        s = sorted(amounts)
        n = len(amounts)
        print(f"  Count       : {n:,}")
        print(f"  Total       : {sum(amounts)/1e9:,.1f}B MXN")
        print(f"  Mean        : {sum(amounts)/n/1e6:,.2f}M MXN")
        print(f"  Median      : {s[n//2]/1e6:,.2f}M MXN")
        print(f"  Max         : {max(amounts)/1e9:,.3f}B MXN")
        print(f"  REJECT >100B: {len(rejected):,}")
        print(f"  FLAG   >10B : {len(flagged):,}")
        if flagged:
            print("\n  Flagged contracts:")
            for amt, r in sorted(flagged, key=lambda x: -x[0])[:5]:
                v = r.get(vendor_col,"?")[:45] if vendor_col else "?"
                ins = r.get(inst_col,"?")[:35] if inst_col else "?"
                print(f"    {amt/1e9:.2f}B MXN | {v} | {ins}")

    # ── RFC Coverage ─────────────────────────────────────────────────
    if rfc_col:
        with_rfc = sum(1 for r in apf_rows if r.get(rfc_col,"").strip())
        print(f"\n── RFC Coverage: {with_rfc:,}/{len(apf_rows):,} ({with_rfc*100/len(apf_rows):.1f}%)")

    # ── Month spread ─────────────────────────────────────────────────
    if date_col:
        months: Counter = Counter()
        for r in apf_rows:
            d = (r.get(date_col) or "")[:7]
            if d: months[d] += 1
        print(f"\n── Month Coverage ({len(months)} months) ──")
        for ym in sorted(months):
            print(f"  {ym}  {months[ym]:>6,}")

    # ── Procedure types ───────────────────────────────────────────────
    if tipo_col:
        tc = Counter(r.get(tipo_col,"").strip() for r in apf_rows)
        da = sum(c for t,c in tc.items() if "ADJUDICACI" in t.upper())
        lp = sum(c for t,c in tc.items() if "LICITACI" in t.upper())
        print(f"\n── Procedure Types ──")
        for t, c in tc.most_common(8):
            print(f"  {(t or '(blank)')[:55]:55s} {c:>6,}  ({c*100/len(apf_rows):.1f}%)")
        print(f"\n  -> Direct award : {da:,} ({da*100/len(apf_rows):.1f}%)")
        print(f"  -> Open tender  : {lp:,} ({lp*100/len(apf_rows):.1f}%)")

    if VALIDATE_ONLY:
        print(f"\n[VALIDATE ONLY] Done.")
        return

    # ── Gap-fill ──────────────────────────────────────────────────────
    print(f"\n{'='*40}")
    print("GAP-FILL PHASE")
    print(f"{'='*40}")

    file_map = {}
    for r in apf_rows:
        proc = get(r, "Número de procedimiento", "Numero de procedimiento") or ""
        rfc  = get(r, rfc_col) if rfc_col else ""
        amt  = parse_amount(get(r, amount_col) if amount_col else "0")
        if amt > MAX_AMOUNT or not proc:
            continue
        file_map[(proc, rfc or "")] = r
    print(f"Valid keyed file rows : {len(file_map):,}")

    conn = sqlite3.connect(DB)
    db_year = int(YEAR)

    db_keys = set()
    for proc, rfc in conn.execute(f"""
        SELECT c.procedure_number, v.rfc
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        WHERE c.contract_year = {db_year}
          AND c.procedure_number IS NOT NULL
    """):
        db_keys.add((proc or "", rfc or ""))

    db_proc_only = {r[0] for r in conn.execute(
        f"SELECT procedure_number FROM contracts WHERE contract_year = {db_year} AND procedure_number IS NOT NULL"
    )}

    missing = {k: v for k, v in file_map.items()
               if k not in db_keys and k[0] not in db_proc_only}
    print(f"DB keys for {YEAR}     : {len(db_keys):,}")
    print(f"Missing               : {len(missing):,}")

    if not missing:
        print(f"\nDB is already up to date for {YEAR}.")
        conn.close()
        return

    # Lookups
    vendors_by_rfc = {r[0]: r[1] for r in conn.execute(
        "SELECT rfc, id FROM vendors WHERE rfc IS NOT NULL")}
    inst_by_name   = {r[0]: r[1] for r in conn.execute(
        "SELECT name, id FROM institutions WHERE name IS NOT NULL")}
    cu_by_clave    = {r[0]: r[1] for r in conn.execute(
        "SELECT clave_uc, id FROM contracting_units WHERE clave_uc IS NOT NULL")}

    if DRY_RUN:
        print(f"\n[DRY RUN] Would insert {len(missing):,} records. Sample:")
        for i, ((proc, rfc), r) in enumerate(list(missing.items())[:5]):
            vname = get(r, "Proveedor o contratista") or ""
            amt   = parse_amount(get(r, amount_col) if amount_col else "0")
            pub   = get(r, date_col) if date_col else ""
            print(f"\n  [{i+1}] {proc}")
            print(f"       {vname[:55]} (RFC:{rfc}) | {amt/1e6:.2f}M MXN | {(pub or '')[:10]}")
        print(f"\nRun without --dry-run to execute.")
        conn.close()
        return

    inserted = skipped = 0
    for (proc, rfc), r in missing.items():
        vname    = get(r, "Proveedor o contratista") or ""
        amt      = parse_amount(get(r, amount_col) if amount_col else "0")
        pub_date = parse_date(get(r, date_col) if date_col else "")
        start_d  = parse_date(get(r, "Fecha de inicio del contrato"))
        end_d    = parse_date(get(r, "Fecha de fin del contrato"))
        award_d  = parse_date(get(r, "Fecha de fallo"))
        open_d   = parse_date(get(r, "Fecha de apertura"))
        cy       = int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else db_year
        cm_s     = pub_date[5:7] if pub_date and len(pub_date) >= 7 else None
        cm       = int(cm_s) if cm_s and cm_s.isdigit() else None

        ramo_raw = get(r, "Clave Ramo") or "0"
        try:    ramo_id = int(ramo_raw)
        except: ramo_id = 0
        sector_id = RAMO_SECTOR.get(ramo_id, 12)

        proc_type = get(r, tipo_col) if tipo_col else ""
        is_da  = 1 if "ADJUDICACI" in (proc_type or "").upper() else 0
        is_multi = 1 if (get(r, "Contrato plurianual") or "").upper() == "SI" else 0
        currency = get(r, "Moneda") or "MXN"
        inst_name = get(r, "Institución", "Institucion") or ""
        exp_art = get(r, "Artículo de excepción", "Articulo de excepcion") or ""
        is_cf = 1 if "FORTUITO" in (get(r, "La contratación es por Caso fortuito o fuerza mayor") or "").upper() else 0

        vendor_id = vendors_by_rfc.get(rfc)
        inst_id   = inst_by_name.get(inst_name)
        uc_clave  = get(r, "Clave de la UC") or ""
        cu_id     = cu_by_clave.get(uc_clave)
        is_ye = 1 if cm == 12 else 0
        is_hv = 1 if amt > FLAG_AMOUNT else 0

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
                "D", db_year,
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

    conn.commit()
    conn.close()
    print(f"\nInserted : {inserted:,}")
    print(f"Skipped  : {skipped:,}")
    print(f"Total pending_score in DB now: run /score-contracts when ready.")


if __name__ == "__main__":
    main()
