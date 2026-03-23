"""
Validation of Contratos_CompraNet2024.csv from ComprasMX.
Focus: overlap with existing DB, new records, flagged amounts, RFC coverage.
"""
import csv
import sqlite3
from collections import Counter
from pathlib import Path

FILE = Path(__file__).parent.parent / "data/comprasmx/Contratos_CompraNet2024.csv"
DB   = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

MAX_AMOUNT  = 100_000_000_000
FLAG_AMOUNT =  10_000_000_000


def main():
    print(f"\n{'='*60}")
    print("COMPRASMX 2024 DATA VALIDATION")
    print(f"{'='*60}")
    print(f"File : {FILE}")
    print(f"Size : {FILE.stat().st_size / 1_000_000:.1f} MB\n")

    rows = []
    for enc in ("latin-1", "utf-8-sig", "utf-8"):
        try:
            with open(FILE, encoding=enc, errors="strict") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                headers = reader.fieldnames or []
            print(f"Encoding : {enc}")
            break
        except UnicodeDecodeError:
            continue

    print(f"Columns  : {len(headers)}")
    print(f"Rows     : {len(rows):,}")

    amount_col = next((c for c in headers if "Importe" in c and "DRC" in c), None)
    rfc_col    = next((c for c in headers if c.strip().lower() == "rfc"), None)
    gov_col    = next((c for c in headers if "Orden" in c and "gobierno" in c), None)
    date_col   = next((c for c in headers if "publicaci" in c.lower()), None)
    vendor_col = next((c for c in headers if "Proveedor" in c and "contratista" in c), None)
    inst_col   = next((c for c in headers if c.strip() == "Institución"), None)
    tipo_col   = next((c for c in headers if "Tipo" in c and "Procedimiento" in c), None)
    contrato_col = next((c for c in headers if "Núm" in c and "contrato" in c), None)
    if not contrato_col:
        contrato_col = next((c for c in headers if "contrato" in c.lower() and "núm" in c.lower()), None)

    # ── Orden de gobierno ───────────────────────────────────────────
    print("\n── Orden de Gobierno ──")
    if gov_col:
        gov_counts = Counter(r[gov_col].strip() for r in rows)
        for gov, cnt in gov_counts.most_common(10):
            print(f"  {gov or '(blank)':30s} {cnt:>7,}  ({cnt*100/len(rows):.1f}%)")
        apf_rows = [r for r in rows if r[gov_col].strip().upper() == "APF"]
        print(f"\n  -> APF federal rows: {len(apf_rows):,} / {len(rows):,} ({len(apf_rows)*100/len(rows):.1f}%)")
    else:
        apf_rows = rows

    # ── Amounts ─────────────────────────────────────────────────────
    print("\n── Amount Analysis (all rows) ──")
    amounts = []
    parse_errors = 0
    flagged_rows = []
    rejected_rows = []
    if amount_col:
        for r in rows:
            raw = r[amount_col].replace(",", "").strip()
            try:
                val = float(raw)
                amounts.append(val)
                if val > MAX_AMOUNT:
                    rejected_rows.append(r)
                elif val > FLAG_AMOUNT:
                    flagged_rows.append(r)
            except ValueError:
                parse_errors += 1

    if amounts:
        amounts_sorted = sorted(amounts)
        n = len(amounts)
        total = sum(amounts)
        print(f"  Parsed      : {n:,}  (errors: {parse_errors})")
        print(f"  Total value : {total/1e9:,.1f}B MXN")
        print(f"  Mean        : {total/n/1e6:,.2f}M MXN")
        print(f"  Median      : {amounts_sorted[n//2]/1e6:,.2f}M MXN")
        print(f"  Max         : {max(amounts)/1e9:,.3f}B MXN")
        print(f"\n  REJECT (>100B) : {len(rejected_rows):,}")
        print(f"  FLAG   (>10B)  : {len(flagged_rows):,}")

        if rejected_rows:
            print("\n  --- REJECTED RECORDS ---")
            for r in rejected_rows[:5]:
                amt = float(r[amount_col].replace(",",""))
                vendor = r.get(vendor_col, "?")[:50] if vendor_col else "?"
                inst = r.get(inst_col, "?")[:40] if inst_col else "?"
                print(f"    {amt/1e9:.1f}B MXN | {vendor} | {inst}")

        if flagged_rows:
            print("\n  --- FLAGGED RECORDS (>10B) ---")
            for r in sorted(flagged_rows, key=lambda x: float(x[amount_col].replace(",","")), reverse=True):
                amt = float(r[amount_col].replace(",",""))
                vendor = r.get(vendor_col, "?")[:50] if vendor_col else "?"
                inst = r.get(inst_col, "?")[:40] if inst_col else "?"
                rfc = r.get(rfc_col, "?") if rfc_col else "?"
                print(f"    {amt/1e9:.2f}B MXN | RFC: {rfc} | {vendor} | {inst}")

    # ── RFC coverage ────────────────────────────────────────────────
    print("\n── RFC Coverage ──")
    if rfc_col:
        with_rfc = sum(1 for r in rows if r[rfc_col].strip())
        print(f"  RFC populated : {with_rfc:,} / {len(rows):,} ({with_rfc*100/len(rows):.1f}%)")

    # ── Date / month coverage ───────────────────────────────────────
    print("\n── Month Coverage ──")
    if date_col:
        months: Counter = Counter()
        for r in rows:
            d = r[date_col].strip()[:7]
            if d:
                months[d] += 1
        for ym in sorted(months):
            print(f"  {ym}  {months[ym]:>6,}")

    # ── Procedure types ─────────────────────────────────────────────
    if tipo_col:
        print("\n── Procedure Types ──")
        tipo_counts = Counter(r[tipo_col].strip() for r in rows)
        total_proc = len(rows)
        for t, cnt in tipo_counts.most_common(10):
            print(f"  {(t or '(blank)')[:55]:55s} {cnt:>6,}  ({cnt*100/total_proc:.1f}%)")
        da_count = sum(cnt for t, cnt in tipo_counts.items() if "ADJUDICACI" in t.upper())
        lp_count = sum(cnt for t, cnt in tipo_counts.items() if "LICITACI" in t.upper())
        print(f"\n  -> Direct award total : {da_count:,} ({da_count*100/total_proc:.1f}%)")
        print(f"  -> Open tender total  : {lp_count:,} ({lp_count*100/total_proc:.1f}%)")

    # ── DB Overlap ──────────────────────────────────────────────────
    print("\n── DB Overlap Check ──")
    try:
        conn = sqlite3.connect(DB)
        existing_2024 = conn.execute(
            "SELECT COUNT(*) FROM contracts WHERE contract_year = 2024"
        ).fetchone()[0]

        # Check by procedure number if column available
        proc_col = next((c for c in headers if "Número" in c and "procedimiento" in c.lower()), None)
        if proc_col:
            file_procs = {r[proc_col].strip() for r in rows if r[proc_col].strip()}
            sample_procs = list(file_procs)[:500]
            placeholders = ",".join("?" * len(sample_procs))
            matched = conn.execute(
                f"SELECT COUNT(DISTINCT procedure_number) FROM contracts "
                f"WHERE procedure_number IN ({placeholders})",
                sample_procs
            ).fetchone()[0]
            match_rate = matched / len(sample_procs) * 100
            print(f"  Sample procedure match rate : {match_rate:.1f}% ({matched}/{len(sample_procs)} sampled)")

        conn.close()
        print(f"  Existing 2024 rows in DB : {existing_2024:,}")
        print(f"  New file rows            : {len(rows):,}")
        diff = len(rows) - existing_2024
        print(f"  -> Delta (file - DB)     : {diff:+,}")
        if diff > 0:
            print(f"  -> Potentially {diff:,} new/updated records worth investigating")
        else:
            print(f"  -> DB has MORE rows than file (DB may include corrections or extra sources)")
    except Exception as e:
        print(f"  DB check failed: {e}")

    print(f"\n{'='*60}")
    print("VALIDATION COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
