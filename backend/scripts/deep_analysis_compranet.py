"""
Deep Analysis of COMPRANET Source Data
Examines vendor variations, institution patterns, amount distributions, dates, and procedures
"""

import pandas as pd
import numpy as np
from pathlib import Path
import re
from collections import Counter
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Data paths
ORIGINAL_DATA_DIR = Path(r"D:\Python\yangwenli\original_data")

def clean_numeric(val):
    """Convert string amounts to numeric"""
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    try:
        # Remove currency symbols, commas, etc
        clean = str(val).replace(',', '').replace('$', '').replace(' ', '').strip()
        return float(clean)
    except:
        return 0.0

def normalize_vendor_name(name):
    """Basic normalization for comparison"""
    if pd.isna(name):
        return ""
    name = str(name).upper().strip()
    # Remove common legal entity suffixes for comparison
    patterns = [
        r'\bS\.?A\.?\s*DE\s*C\.?V\.?',
        r'\bS\.?DE\s*R\.?L\.?',
        r'\bS\.?C\.?',
        r'\,',
        r'\.',
    ]
    for pattern in patterns:
        name = re.sub(pattern, '', name, flags=re.IGNORECASE)
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name).strip()
    return name

print("="*80)
print("COMPRANET DATA DEEP ANALYSIS")
print("="*80)
print()

# ============================================================================
# 1. VENDOR NAME VARIATIONS
# ============================================================================
print("1. VENDOR NAME VARIATIONS ANALYSIS")
print("-"*80)

vendor_samples = []
rfc_coverage = {}

# Sample Structure A (2002-2010)
print("\nStructure A (2002-2010) - Sample vendor names:")
try:
    df_2005 = pd.read_excel(ORIGINAL_DATA_DIR / "2005.xlsx", nrows=10000)
    print(f"  Columns in 2005: {df_2005.columns.tolist()}")

    # Try to find vendor column
    vendor_col = None
    for col in ['PROVEEDOR_CONTRATISTA', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'PROVEEDOR']:
        if col in df_2005.columns:
            vendor_col = col
            break

    if not vendor_col and len(df_2005.columns) > 6:
        vendor_col = df_2005.columns[11]  # Try column 11 for vendor name

    print(f"  Using vendor column: {vendor_col}")

    rfc_col = 'RFC' if 'RFC' in df_2005.columns else None

    if vendor_col:
        sample_vendors = df_2005[vendor_col].dropna().sample(min(20, len(df_2005)), random_state=42).tolist()
        for v in sample_vendors[:10]:
            print(f"  - {v}")
        vendor_samples.extend(df_2005[vendor_col].dropna().tolist())

    if rfc_col:
        rfc_coverage['2005'] = df_2005[rfc_col].notna().sum() / len(df_2005) * 100
    else:
        rfc_coverage['2005'] = 0.0

except Exception as e:
    print(f"  Error loading 2005: {e}")

# Sample Structure B (2010-2017)
print("\nStructure B (2010-2017) - Sample vendor names:")
try:
    df_2015 = pd.read_excel(ORIGINAL_DATA_DIR / "2015.xlsx", nrows=10000)
    vendor_col = 'PROVEEDOR_CONTRATISTA' if 'PROVEEDOR_CONTRATISTA' in df_2015.columns else df_2015.columns[6]
    rfc_col = 'RFC' if 'RFC' in df_2015.columns else None

    sample_vendors = df_2015[vendor_col].dropna().sample(min(20, len(df_2015)), random_state=42).tolist()
    for v in sample_vendors[:10]:
        print(f"  - {v}")

    if rfc_col:
        rfc_coverage['2015'] = df_2015[rfc_col].notna().sum() / len(df_2015) * 100
    else:
        rfc_coverage['2015'] = 0.0

    vendor_samples.extend(df_2015[vendor_col].dropna().tolist())
except Exception as e:
    print(f"  Error loading 2015: {e}")

# Sample Structure C (2018-2022)
print("\nStructure C (2018-2022) - Sample vendor names:")
try:
    df_2020 = pd.read_excel(ORIGINAL_DATA_DIR / "2020.xlsx", nrows=10000)
    vendor_col = 'PROVEEDOR_CONTRATISTA' if 'PROVEEDOR_CONTRATISTA' in df_2020.columns else df_2020.columns[6]
    rfc_col = 'RFC' if 'RFC' in df_2020.columns else None

    sample_vendors = df_2020[vendor_col].dropna().sample(min(20, len(df_2020)), random_state=42).tolist()
    for v in sample_vendors[:10]:
        print(f"  - {v}")

    if rfc_col:
        rfc_coverage['2020'] = df_2020[rfc_col].notna().sum() / len(df_2020) * 100
    else:
        rfc_coverage['2020'] = 0.0

    vendor_samples.extend(df_2020[vendor_col].dropna().tolist())
except Exception as e:
    print(f"  Error loading 2020: {e}")

# Sample Structure D (2023-2025)
print("\nStructure D (2023-2025) - Sample vendor names:")
try:
    df_2024 = pd.read_csv(ORIGINAL_DATA_DIR / "Contratos_CompraNet2024.csv", nrows=10000, encoding='latin-1', low_memory=False)
    vendor_col = 'PROVEEDOR_CONTRATISTA' if 'PROVEEDOR_CONTRATISTA' in df_2024.columns else df_2024.columns[6]
    rfc_col = 'RFC' if 'RFC' in df_2024.columns else None

    sample_vendors = df_2024[vendor_col].dropna().sample(min(20, len(df_2024)), random_state=42).tolist()
    for v in sample_vendors[:10]:
        print(f"  - {v}")

    if rfc_col:
        rfc_coverage['2024'] = df_2024[rfc_col].notna().sum() / len(df_2024) * 100
    else:
        rfc_coverage['2024'] = 0.0

    vendor_samples.extend(df_2024[vendor_col].dropna().tolist())
except Exception as e:
    print(f"  Error loading 2024: {e}")

print("\nRFC Coverage by Year:")
for year, pct in rfc_coverage.items():
    print(f"  {year}: {pct:.2f}%")

# Analyze common legal entity patterns
print("\nCommon Legal Entity Suffix Patterns:")
suffixes = Counter()
for vendor in vendor_samples:
    vendor_str = str(vendor).upper()
    if 'S.A. DE C.V.' in vendor_str or 'SA DE CV' in vendor_str:
        suffixes['SA DE CV'] += 1
    if 'S. DE R.L.' in vendor_str or 'S DE RL' in vendor_str:
        suffixes['S DE RL'] += 1
    if 'S.C.' in vendor_str or 'SC ' in vendor_str:
        suffixes['SC'] += 1
    if 'A.C.' in vendor_str:
        suffixes['AC'] += 1

for suffix, count in suffixes.most_common(10):
    print(f"  {suffix}: {count} occurrences")

# ============================================================================
# 2. INSTITUTION ANALYSIS
# ============================================================================
print("\n\n2. INSTITUTION NAME ANALYSIS")
print("-"*80)

institution_samples = []

print("\nSample institution names from Structure A (2005):")
try:
    df_2005 = pd.read_excel(ORIGINAL_DATA_DIR / "2005.xlsx", nrows=10000)
    inst_col = 'NOMBRE_DE_LA_UC' if 'NOMBRE_DE_LA_UC' in df_2005.columns else df_2005.columns[3]
    sample_inst = df_2005[inst_col].dropna().sample(min(15, len(df_2005)), random_state=42).tolist()
    for inst in sample_inst[:10]:
        print(f"  - {inst}")
    institution_samples.extend(df_2005[inst_col].dropna().tolist())
except Exception as e:
    print(f"  Error: {e}")

print("\nSample institution names from Structure B (2015):")
try:
    df_2015 = pd.read_excel(ORIGINAL_DATA_DIR / "2015.xlsx", nrows=10000)
    inst_col = 'NOMBRE_DE_LA_UC' if 'NOMBRE_DE_LA_UC' in df_2015.columns else df_2015.columns[3]
    sample_inst = df_2015[inst_col].dropna().sample(min(15, len(df_2015)), random_state=42).tolist()
    for inst in sample_inst[:10]:
        print(f"  - {inst}")
    institution_samples.extend(df_2015[inst_col].dropna().tolist())
except Exception as e:
    print(f"  Error: {e}")

print("\nSample institution names from Structure D (2024):")
try:
    df_2024 = pd.read_csv(ORIGINAL_DATA_DIR / "Contratos_CompraNet2024.csv", nrows=10000, encoding='latin-1', low_memory=False)
    inst_col = 'NOMBRE_DE_LA_UC' if 'NOMBRE_DE_LA_UC' in df_2024.columns else df_2024.columns[3]
    sample_inst = df_2024[inst_col].dropna().sample(min(15, len(df_2024)), random_state=42).tolist()
    for inst in sample_inst[:10]:
        print(f"  - {inst}")
    institution_samples.extend(df_2024[inst_col].dropna().tolist())
except Exception as e:
    print(f"  Error: {e}")

# Classify institutions
print("\nInstitution Classification Patterns:")
patterns = {
    'Federal - SECRETARIA': 0,
    'Federal - SUBSECRETARIA': 0,
    'State - GOBIERNO DEL ESTADO': 0,
    'State - SERVICIOS DE SALUD': 0,
    'Municipal - AYUNTAMIENTO': 0,
    'Municipal - MUNICIPIO': 0,
    'Decentralized - IMSS': 0,
    'Decentralized - ISSSTE': 0,
    'Decentralized - PEMEX': 0,
    'Decentralized - CFE': 0,
    'Other': 0
}

for inst in institution_samples:
    inst_upper = str(inst).upper()
    if 'SECRETARIA' in inst_upper and not 'SUBSECRETARIA' in inst_upper:
        patterns['Federal - SECRETARIA'] += 1
    elif 'SUBSECRETARIA' in inst_upper:
        patterns['Federal - SUBSECRETARIA'] += 1
    elif 'GOBIERNO DEL ESTADO' in inst_upper:
        patterns['State - GOBIERNO DEL ESTADO'] += 1
    elif 'SERVICIOS DE SALUD' in inst_upper:
        patterns['State - SERVICIOS DE SALUD'] += 1
    elif 'AYUNTAMIENTO' in inst_upper:
        patterns['Municipal - AYUNTAMIENTO'] += 1
    elif 'MUNICIPIO' in inst_upper:
        patterns['Municipal - MUNICIPIO'] += 1
    elif 'IMSS' in inst_upper:
        patterns['Decentralized - IMSS'] += 1
    elif 'ISSSTE' in inst_upper:
        patterns['Decentralized - ISSSTE'] += 1
    elif 'PEMEX' in inst_upper or 'PETROLEOS MEXICANOS' in inst_upper:
        patterns['Decentralized - PEMEX'] += 1
    elif 'CFE' in inst_upper or 'COMISION FEDERAL DE ELECTRICIDAD' in inst_upper:
        patterns['Decentralized - CFE'] += 1
    else:
        patterns['Other'] += 1

total = sum(patterns.values())
for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
    pct = (count / total * 100) if total > 0 else 0
    print(f"  {pattern}: {count} ({pct:.1f}%)")

# ============================================================================
# 3. AMOUNT DISTRIBUTION
# ============================================================================
print("\n\n3. AMOUNT DISTRIBUTION ANALYSIS")
print("-"*80)

all_amounts = []

# Load amounts from different years
for year_file in ['2005.xlsx', '2015.xlsx', '2020.xlsx']:
    try:
        df = pd.read_excel(ORIGINAL_DATA_DIR / year_file, nrows=50000)
        amount_col = None
        for col in ['IMPORTE_CONTRATO', 'IMPORTE_PESOS', 'PRECIO_TOTAL', 'IMPORTE MN SIN IVA']:
            if col in df.columns:
                amount_col = col
                break

        if amount_col:
            amounts = df[amount_col].apply(clean_numeric)
            valid_amounts = amounts[amounts > 0]
            all_amounts.extend(valid_amounts.tolist())
            print(f"\n{year_file} ({amount_col}): {len(valid_amounts)} valid amounts")
    except Exception as e:
        print(f"  Error loading {year_file}: {e}")

# CSV files
for year_file in ['Contratos_CompraNet2024.csv']:
    try:
        df = pd.read_csv(ORIGINAL_DATA_DIR / year_file, nrows=50000, encoding='latin-1', low_memory=False)
        amount_col = None
        for col in ['IMPORTE_CONTRATO', 'IMPORTE_PESOS', 'PRECIO_TOTAL', 'Importe del contrato', 'Importe']:
            if col in df.columns:
                amount_col = col
                break

        if amount_col:
            amounts = df[amount_col].apply(clean_numeric)
            valid_amounts = amounts[amounts > 0]
            all_amounts.extend(valid_amounts.tolist())
            print(f"\n{year_file} ({amount_col}): {len(valid_amounts)} valid amounts")
    except Exception as e:
        print(f"  Error loading {year_file}: {e}")

if all_amounts:
    amounts_arr = np.array(all_amounts)

    print(f"\nTotal contracts analyzed: {len(amounts_arr):,}")
    print(f"\nDescriptive Statistics:")
    print(f"  Mean: {amounts_arr.mean():,.2f} MXN")
    print(f"  Median: {np.median(amounts_arr):,.2f} MXN")
    print(f"  Std Dev: {amounts_arr.std():,.2f} MXN")
    print(f"  Min: {amounts_arr.min():,.2f} MXN")
    print(f"  Max: {amounts_arr.max():,.2f} MXN")

    print(f"\nPercentiles:")
    for p in [50, 75, 90, 95, 99, 99.5, 99.9]:
        val = np.percentile(amounts_arr, p)
        print(f"  {p}th: {val:,.2f} MXN")

    print(f"\nAmount Range Distribution:")
    ranges = [
        ("< 10K", 0, 10_000),
        ("10K - 100K", 10_000, 100_000),
        ("100K - 1M", 100_000, 1_000_000),
        ("1M - 10M", 1_000_000, 10_000_000),
        ("10M - 100M", 10_000_000, 100_000_000),
        ("100M - 1B", 100_000_000, 1_000_000_000),
        ("1B - 10B", 1_000_000_000, 10_000_000_000),
        ("> 10B (FLAG)", 10_000_000_000, float('inf')),
    ]

    for label, low, high in ranges:
        count = ((amounts_arr >= low) & (amounts_arr < high)).sum()
        pct = count / len(amounts_arr) * 100
        print(f"  {label}: {count:,} ({pct:.2f}%)")

    # Suspicious patterns
    print(f"\nSuspicious Patterns:")

    # Exact round numbers
    exact_1m = (amounts_arr == 1_000_000).sum()
    exact_10m = (amounts_arr == 10_000_000).sum()
    exact_100m = (amounts_arr == 100_000_000).sum()
    exact_1b = (amounts_arr == 1_000_000_000).sum()

    print(f"  Exact 1M: {exact_1m:,}")
    print(f"  Exact 10M: {exact_10m:,}")
    print(f"  Exact 100M: {exact_100m:,}")
    print(f"  Exact 1B: {exact_1b:,}")

    # Contracts > 100B (CRITICAL THRESHOLD)
    critical = amounts_arr[amounts_arr > 100_000_000_000]
    if len(critical) > 0:
        print(f"\n  CRITICAL: {len(critical)} contracts > 100B MXN (SHOULD BE REJECTED)")
        for amt in critical[:10]:
            print(f"    - {amt:,.2f} MXN")

# ============================================================================
# 4. DATE FIELD ANALYSIS
# ============================================================================
print("\n\n4. DATE FIELD ANALYSIS")
print("-"*80)

print("\nStructure A (2005) - Date fields:")
try:
    df_2005 = pd.read_excel(ORIGINAL_DATA_DIR / "2005.xlsx", nrows=10000)
    date_cols = [col for col in df_2005.columns if 'FECHA' in col.upper()]
    print(f"  Date columns found: {date_cols}")
    for col in date_cols:
        non_null = df_2005[col].notna().sum()
        pct = non_null / len(df_2005) * 100
        print(f"    {col}: {non_null}/{len(df_2005)} ({pct:.1f}%)")
except Exception as e:
    print(f"  Error: {e}")

print("\nStructure B (2015) - Date fields:")
try:
    df_2015 = pd.read_excel(ORIGINAL_DATA_DIR / "2015.xlsx", nrows=10000)
    date_cols = [col for col in df_2015.columns if 'FECHA' in col.upper()]
    print(f"  Date columns found: {date_cols}")
    for col in date_cols:
        non_null = df_2015[col].notna().sum()
        pct = non_null / len(df_2015) * 100
        print(f"    {col}: {non_null}/{len(df_2015)} ({pct:.1f}%)")
except Exception as e:
    print(f"  Error: {e}")

print("\nStructure D (2024) - Date fields:")
try:
    df_2024 = pd.read_csv(ORIGINAL_DATA_DIR / "Contratos_CompraNet2024.csv", nrows=10000, encoding='latin-1', low_memory=False)
    date_cols = [col for col in df_2024.columns if 'FECHA' in col.upper()]
    print(f"  Date columns found: {date_cols}")
    for col in date_cols[:10]:  # Limit to first 10
        non_null = df_2024[col].notna().sum()
        pct = non_null / len(df_2024) * 100
        print(f"    {col}: {non_null}/{len(df_2024)} ({pct:.1f}%)")
except Exception as e:
    print(f"  Error: {e}")

# ============================================================================
# 5. PROCEDURE TYPE ANALYSIS
# ============================================================================
print("\n\n5. PROCEDURE TYPE ANALYSIS")
print("-"*80)

print("\nStructure A (2005) - Procedure types:")
try:
    df_2005 = pd.read_excel(ORIGINAL_DATA_DIR / "2005.xlsx", nrows=20000)
    proc_col = None
    for col in ['TIPO_PROCEDIMIENTO', 'PROCEDIMIENTO']:
        if col in df_2005.columns:
            proc_col = col
            break

    if proc_col:
        proc_counts = df_2005[proc_col].value_counts()
        total = len(df_2005)
        for proc, count in proc_counts.head(10).items():
            pct = count / total * 100
            print(f"  {proc}: {count} ({pct:.1f}%)")
    else:
        print(f"  Columns available: {df_2005.columns.tolist()[:15]}")
except Exception as e:
    print(f"  Error: {e}")

print("\nStructure B (2015) - Procedure types:")
try:
    df_2015 = pd.read_excel(ORIGINAL_DATA_DIR / "2015.xlsx", nrows=20000)
    proc_col = None
    for col in ['TIPO_PROCEDIMIENTO', 'PROCEDIMIENTO']:
        if col in df_2015.columns:
            proc_col = col
            break

    if proc_col:
        proc_counts = df_2015[proc_col].value_counts()
        total = len(df_2015)
        for proc, count in proc_counts.head(10).items():
            pct = count / total * 100
            print(f"  {proc}: {count} ({pct:.1f}%)")

    # Check for direct award indicator
    da_col = None
    for col in ['CARACTER', 'TIPO_CONTRATACION']:
        if col in df_2015.columns:
            da_col = col
            break

    if da_col:
        print(f"\n  Direct award indicator ({da_col}):")
        da_counts = df_2015[da_col].value_counts()
        for val, count in da_counts.head(5).items():
            pct = count / total * 100
            print(f"    {val}: {count} ({pct:.1f}%)")
except Exception as e:
    print(f"  Error: {e}")

print("\nStructure D (2024) - Procedure types:")
try:
    df_2024 = pd.read_csv(ORIGINAL_DATA_DIR / "Contratos_CompraNet2024.csv", nrows=20000, encoding='latin-1', low_memory=False)
    print(f"  Columns in 2024 (first 20): {df_2024.columns.tolist()[:20]}")

    proc_col = None
    for col in ['TIPO_PROCEDIMIENTO', 'PROCEDIMIENTO', 'Tipo de Procedimiento', 'Procedimiento']:
        if col in df_2024.columns:
            proc_col = col
            break

    if proc_col:
        proc_counts = df_2024[proc_col].value_counts()
        total = len(df_2024)
        print(f"\n  Procedure types ({proc_col}):")
        for proc, count in proc_counts.head(10).items():
            pct = count / total * 100
            print(f"    {proc}: {count} ({pct:.1f}%)")

    # Check for direct award indicator
    da_col = None
    for col in ['CARACTER', 'TIPO_CONTRATACION', 'Car�cter', 'Tipo de Contrataci�n']:
        if col in df_2024.columns:
            da_col = col
            break

    if da_col:
        print(f"\n  Direct award indicator ({da_col}):")
        da_counts = df_2024[da_col].value_counts()
        for val, count in da_counts.head(5).items():
            pct = count / total * 100
            print(f"    {val}: {count} ({pct:.1f}%)")
except Exception as e:
    print(f"  Error: {e}")

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)
