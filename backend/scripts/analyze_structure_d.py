"""
Detailed analysis of Structure D (2023-2025) to complete the picture
"""

import pandas as pd
from pathlib import Path

ORIGINAL_DATA_DIR = Path(r"D:\Python\yangwenli\original_data")

print("="*80)
print("STRUCTURE D (2023-2025) DETAILED ANALYSIS")
print("="*80)

# Analyze 2024 CSV
print("\n2024 CSV File Analysis:")
df = pd.read_csv(ORIGINAL_DATA_DIR / "Contratos_CompraNet2024.csv", nrows=50000, encoding='latin-1', low_memory=False)

print(f"\nTotal rows loaded: {len(df):,}")
print(f"\nColumn count: {len(df.columns)}")

print("\nAll columns:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {col}")

# Procedure type
if 'Tipo Procedimiento' in df.columns:
    print("\nProcedure Type Distribution:")
    proc_counts = df['Tipo Procedimiento'].value_counts()
    total = len(df)
    for proc, count in proc_counts.head(15).items():
        pct = count / total * 100
        print(f"  {proc}: {count:,} ({pct:.1f}%)")

# Character (Nacional/Internacional)
if 'Carácter' in df.columns:
    print("\nCarácter Distribution:")
    char_counts = df['Carácter'].value_counts()
    for char, count in char_counts.items():
        pct = count / total * 100
        print(f"  {char}: {count:,} ({pct:.1f}%)")

# Check for direct award exception articles
if 'Artículo de excepción' in df.columns:
    print("\nException Article Distribution (Direct Awards):")
    art_counts = df['Artículo de excepción'].value_counts()
    non_null = df['Artículo de excepción'].notna().sum()
    print(f"  Records with exception article: {non_null:,} ({non_null/total*100:.1f}%)")
    for art, count in art_counts.head(10).items():
        pct = count / total * 100
        print(f"    {art}: {count:,} ({pct:.1f}%)")

# Vendor info
if 'Siglas de la Institución' in df.columns:
    print("\nTop 15 Institutions by contract count:")
    inst_counts = df['Siglas de la Institución'].value_counts()
    for inst, count in inst_counts.head(15).items():
        pct = count / total * 100
        print(f"  {inst}: {count:,} ({pct:.1f}%)")

# RFC presence
rfc_col = None
for col in ['RFC', 'Rfc', 'rfc']:
    if col in df.columns:
        rfc_col = col
        break

if rfc_col:
    rfc_present = df[rfc_col].notna().sum()
    print(f"\nRFC presence: {rfc_present:,} / {total:,} ({rfc_present/total*100:.1f}%)")
else:
    print("\nRFC column not found in Structure D")

# Partida Especifica
if 'Partida específica' in df.columns:
    partida_present = df['Partida específica'].notna().sum()
    print(f"Partida Específica presence: {partida_present:,} / {total:,} ({partida_present/total*100:.1f}%)")

# Amount analysis
amount_col = None
for col in ['Importe del contrato', 'Importe', 'IMPORTE_CONTRATO']:
    if col in df.columns:
        amount_col = col
        break

if amount_col:
    print(f"\nAmount analysis (column: {amount_col}):")
    amounts = pd.to_numeric(df[amount_col], errors='coerce')
    valid_amounts = amounts[amounts > 0]

    print(f"  Valid amounts: {len(valid_amounts):,}")
    print(f"  Mean: {valid_amounts.mean():,.2f} MXN")
    print(f"  Median: {valid_amounts.median():,.2f} MXN")
    print(f"  Max: {valid_amounts.max():,.2f} MXN")
    print(f"  Min: {valid_amounts.min():,.2f} MXN")

    # Check for critical threshold violations
    critical = valid_amounts[valid_amounts > 100_000_000_000]
    if len(critical) > 0:
        print(f"\n  CRITICAL WARNING: {len(critical)} contracts > 100B MXN!")
        for amt in critical.head(10):
            print(f"    {amt:,.2f} MXN")

    flagged = valid_amounts[(valid_amounts > 10_000_000_000) & (valid_amounts <= 100_000_000_000)]
    if len(flagged) > 0:
        print(f"\n  WARNING: {len(flagged)} contracts between 10B-100B MXN (should be flagged)")

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)
