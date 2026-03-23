"""
Quick validation of Contratos_CompraNet2025.csv from ComprasMX.
Checks: encoding, row count, column schema, amounts, RFC coverage,
Orden de gobierno split, year coverage, and overlap with existing DB.
"""
import csv
import sqlite3
from collections import Counter
from pathlib import Path

FILE = Path(__file__).parent.parent / "data/comprasmx/Contratos_CompraNet2025.csv"
DB   = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

MAX_AMOUNT   = 100_000_000_000   # 100B MXN — reject
FLAG_AMOUNT  =  10_000_000_000   # 10B MXN  — flag

def main():
    print(f"\n{'='*60}")
    print("COMPRASMX 2025 DATA VALIDATION")
    print(f"{'='*60}")
    print(f"File : {FILE}")
    print(f"Size : {FILE.stat().st_size / 1_000_000:.1f} MB\n")

    rows = []
    encoding_used = None
    for enc in ("latin-1", "utf-8-sig", "utf-8"):
        try:
            with open(FILE, encoding=enc, errors="strict") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                headers = reader.fieldnames or []
                encoding_used = enc
            break
        except UnicodeDecodeError:
            continue

    if not rows:
        print("ERROR: Could not decode file with latin-1, utf-8-sig, or utf-8")
        return

    print(f"Encoding   : {encoding_used}")
    print(f"Columns    : {len(headers)}")
    print(f"Rows       : {len(rows):,}")

    # ── Column check ────────────────────────────────────────────────
    expected = ["Clave Ramo", "Proveedor o contratista", "Importe DRC", "Orden de gobierno"]
    print("\n── Column Spot-check ──")
    for col in expected:
        found = col in headers
        print(f"  {'✓' if found else '✗'} {col}")

    # Detect amount column
    amount_col = next((c for c in headers if "Importe" in c and "DRC" in c), None)
    rfc_col    = next((c for c in headers if c.strip().lower() == "rfc"), None)
    gov_col    = next((c for c in headers if "Orden" in c and "gobierno" in c), None)
    date_col   = next((c for c in headers if "publicación" in c or "publicacion" in c.lower()), None)
    if not date_col:
        date_col = next((c for c in headers if "fecha" in c.lower() and "public" in c.lower()), None)

    print(f"\n  Amount col : {amount_col}")
    print(f"  RFC col    : {rfc_col}")
    print(f"  Gov col    : {gov_col}")
    print(f"  Date col   : {date_col}")

    # ── Orden de gobierno ───────────────────────────────────────────
    print("\n── Orden de Gobierno ──")
    if gov_col:
        gov_counts = Counter(r[gov_col].strip() for r in rows)
        for gov, cnt in gov_counts.most_common(10):
            print(f"  {gov or '(blank)':30s} {cnt:>7,}  ({cnt*100/len(rows):.1f}%)")
        apf_count = sum(cnt for g, cnt in gov_counts.items() if g.upper() == "APF")
        print(f"\n  → APF (federal only): {apf_count:,} / {len(rows):,} ({apf_count*100/len(rows):.1f}%)")

    # ── Amounts ─────────────────────────────────────────────────────
    print("\n── Amount Analysis ──")
    amounts = []
    parse_errors = 0
    if amount_col:
        for r in rows:
            raw = r[amount_col].replace(",", "").strip()
            try:
                amounts.append(float(raw))
            except ValueError:
                parse_errors += 1

    if amounts:
        amounts_sorted = sorted(amounts)
        n = len(amounts)
        total = sum(amounts)
        rejected = [a for a in amounts if a > MAX_AMOUNT]
        flagged  = [a for a in amounts if FLAG_AMOUNT < a <= MAX_AMOUNT]

        print(f"  Parsed      : {n:,}  (errors: {parse_errors})")
        print(f"  Total value : {total/1e9:,.1f}B MXN")
        print(f"  Mean        : {total/n/1e6:,.1f}M MXN")
        print(f"  Median      : {amounts_sorted[n//2]/1e6:,.1f}M MXN")
        print(f"  Max         : {max(amounts)/1e9:,.2f}B MXN")
        print(f"  Min         : {min(amounts):,.0f} MXN")
        print(f"\n  🚨 REJECT (>100B)  : {len(rejected):,}")
        print(f"  ⚠️  FLAG  (>10B)   : {len(flagged):,}")
        if rejected:
            print("\n  Top rejected amounts:")
            for a in sorted(rejected, reverse=True)[:5]:
                print(f"    {a/1e9:.1f}B MXN")

    # ── RFC coverage ────────────────────────────────────────────────
    print("\n── RFC Coverage ──")
    if rfc_col:
        with_rfc = sum(1 for r in rows if r[rfc_col].strip())
        print(f"  RFC populated : {with_rfc:,} / {len(rows):,} ({with_rfc*100/len(rows):.1f}%)")

    # ── Date / year coverage ────────────────────────────────────────
    print("\n── Date Coverage ──")
    if date_col:
        months: Counter = Counter()
        for r in rows:
            d = r[date_col].strip()[:7]  # YYYY-MM
            if d:
                months[d] += 1
        for ym in sorted(months):
            print(f"  {ym}  {months[ym]:>6,}")

    # ── Procedure types ─────────────────────────────────────────────
    tipo_col = next((c for c in headers if "Tipo" in c and "Procedimiento" in c), None)
    if tipo_col:
        print("\n── Procedure Types ──")
        tipo_counts = Counter(r[tipo_col].strip() for r in rows)
        for t, cnt in tipo_counts.most_common(10):
            print(f"  {(t or '(blank)')[:55]:55s} {cnt:>6,}  ({cnt*100/len(rows):.1f}%)")

    # ── Overlap check with existing DB ──────────────────────────────
    print("\n── DB Overlap Check ──")
    try:
        conn = sqlite3.connect(DB)
        existing_2025 = conn.execute(
            "SELECT COUNT(*) FROM contracts WHERE contract_year = 2025"
        ).fetchone()[0]
        conn.close()
        print(f"  Existing 2025 rows in DB : {existing_2025:,}")
        print(f"  New file rows            : {len(rows):,}")
        print(f"  → Estimated new records  : ~{max(0, len(rows) - existing_2025):,} (rough, by count)")
    except Exception as e:
        print(f"  DB check failed: {e}")

    print(f"\n{'='*60}")
    print("VALIDATION COMPLETE")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
