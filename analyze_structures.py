"""
COMPRANET Data Structure Analysis
Analyzes the 4 different COMPRANET data structures (2002-2025)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

# File paths
DATA_DIR = Path(r"D:\Python\yangwenli\original_data")

# Representative files from each structure
STRUCTURE_A = DATA_DIR / "2002.xlsx"  # 2002-2010
STRUCTURE_B = DATA_DIR / "2010.xlsx"  # 2010-2017
STRUCTURE_C = DATA_DIR / "2018.xlsx"  # 2018-2022
STRUCTURE_D_2023 = DATA_DIR / "Contratos_CompraNet2023.csv"
STRUCTURE_D_2024 = DATA_DIR / "Contratos_CompraNet2024.csv"

def load_sample(file_path, nrows=10000, file_type='xlsx'):
    """Load a sample of records from a file"""
    print(f"\nLoading {file_path.name}...")
    try:
        if file_type == 'xlsx':
            df = pd.read_excel(file_path, nrows=nrows)
        else:
            # Try different encodings for CSV files
            for encoding in ['latin-1', 'iso-8859-1', 'cp1252', 'utf-8']:
                try:
                    df = pd.read_csv(file_path, nrows=nrows, low_memory=False, encoding=encoding)
                    print(f"  Successfully loaded with encoding: {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Could not decode file with any standard encoding")
        print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
        return df
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def analyze_structure(df, structure_name):
    """Analyze a dataframe structure"""
    print(f"\n{'='*80}")
    print(f"STRUCTURE {structure_name}")
    print(f"{'='*80}")

    results = {
        'name': structure_name,
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'columns': list(df.columns),
        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
        'null_rates': {},
        'unique_counts': {},
        'sample_values': {}
    }

    print(f"\nColumns ({len(df.columns)}):")
    print("-" * 80)

    for col in df.columns:
        null_count = df[col].isna().sum()
        null_rate = (null_count / len(df)) * 100
        unique_count = df[col].nunique()

        results['null_rates'][col] = f"{null_rate:.1f}%"
        results['unique_counts'][col] = unique_count

        # Get sample non-null values (convert to strings to avoid JSON serialization issues)
        sample_vals = [str(v) for v in df[col].dropna().head(3).tolist()]
        results['sample_values'][col] = sample_vals

        print(f"{col[:50]:50} | Null: {null_rate:5.1f}% | Unique: {unique_count:8,} | Type: {df[col].dtype}")

    return results

def analyze_amounts(df, structure_name, amount_col=None):
    """Analyze contract amounts for data quality issues"""
    print(f"\n{'='*80}")
    print(f"AMOUNT ANALYSIS - {structure_name}")
    print(f"{'='*80}")

    # Find amount column
    if amount_col is None:
        amount_cols = [col for col in df.columns if 'IMPORTE' in col.upper() or 'MONTO' in col.upper()]
        if not amount_cols:
            print("WARNING: No amount column found")
            return None
        amount_col = amount_cols[0]

    print(f"\nAmount column: {amount_col}")

    # Clean and convert to numeric
    amounts = pd.to_numeric(df[amount_col], errors='coerce')

    # Statistics
    print(f"\nBasic Statistics:")
    print(f"  Total values: {len(amounts):,}")
    print(f"  Non-null: {amounts.notna().sum():,} ({(amounts.notna().sum()/len(amounts)*100):.1f}%)")
    print(f"  Null/missing: {amounts.isna().sum():,}")
    print(f"  Mean: ${amounts.mean():,.2f} MXN")
    print(f"  Median: ${amounts.median():,.2f} MXN")
    print(f"  Std Dev: ${amounts.std():,.2f} MXN")
    print(f"  Min: ${amounts.min():,.2f} MXN")
    print(f"  Max: ${amounts.max():,.2f} MXN")

    # Percentiles
    print(f"\nPercentiles:")
    for p in [25, 50, 75, 90, 95, 99, 99.9]:
        val = amounts.quantile(p/100)
        print(f"  {p:5.1f}%: ${val:20,.2f} MXN")

    # Critical thresholds
    print(f"\nCritical Threshold Analysis:")
    over_100b = (amounts > 100_000_000_000).sum()
    over_10b = ((amounts > 10_000_000_000) & (amounts <= 100_000_000_000)).sum()
    over_1b = ((amounts > 1_000_000_000) & (amounts <= 10_000_000_000)).sum()

    print(f"  > 100B MXN (REJECT): {over_100b:,} contracts")
    print(f"  > 10B MXN (FLAG): {over_10b:,} contracts")
    print(f"  > 1B MXN: {over_1b:,} contracts")

    if over_100b > 0:
        print(f"\n  ⚠️ CRITICAL: Found {over_100b} contracts > 100B MXN (likely decimal errors)")
        print(f"  Top 10 suspicious values:")
        top_values = amounts.nlargest(10)
        for idx, val in top_values.items():
            print(f"    Row {idx}: ${val:,.2f} MXN")

    # Negative values
    negative = (amounts < 0).sum()
    if negative > 0:
        print(f"\n  ⚠️ WARNING: Found {negative} negative amounts")

    # Zero values
    zero = (amounts == 0).sum()
    print(f"  Zero amounts: {zero:,} ({(zero/len(amounts)*100):.1f}%)")

    # Round number analysis
    round_1m = (amounts % 1_000_000 == 0).sum()
    round_100k = (amounts % 100_000 == 0).sum()
    print(f"\n  Round to 1M: {round_1m:,} ({(round_1m/len(amounts)*100):.1f}%)")
    print(f"  Round to 100K: {round_100k:,} ({(round_100k/len(amounts)*100):.1f}%)")

    return {
        'column': amount_col,
        'total': len(amounts),
        'non_null': amounts.notna().sum(),
        'mean': float(amounts.mean()),
        'median': float(amounts.median()),
        'max': float(amounts.max()),
        'min': float(amounts.min()),
        'over_100b': int(over_100b),
        'over_10b': int(over_10b),
        'negative': int(negative),
        'zero': int(zero)
    }

def analyze_dates(df, structure_name):
    """Analyze date columns"""
    print(f"\n{'='*80}")
    print(f"DATE ANALYSIS - {structure_name}")
    print(f"{'='*80}")

    date_cols = [col for col in df.columns if 'FECHA' in col.upper() or 'DATE' in col.upper()]

    for col in date_cols:
        print(f"\n{col}:")
        print(f"  Non-null: {df[col].notna().sum():,} ({(df[col].notna().sum()/len(df)*100):.1f}%)")

        # Sample values
        sample = df[col].dropna().head(5)
        print(f"  Sample values:")
        for val in sample:
            print(f"    {val}")

        # Try to parse dates
        try:
            dates = pd.to_datetime(df[col], errors='coerce')
            valid_dates = dates.notna().sum()
            print(f"  Parseable dates: {valid_dates:,} ({(valid_dates/len(df)*100):.1f}%)")
            if valid_dates > 0:
                print(f"  Date range: {dates.min()} to {dates.max()}")
        except Exception as e:
            print(f"  Error parsing: {e}")

def analyze_vendors(df, structure_name):
    """Analyze vendor name fields"""
    print(f"\n{'='*80}")
    print(f"VENDOR ANALYSIS - {structure_name}")
    print(f"{'='*80}")

    vendor_cols = [col for col in df.columns if 'PROVEEDOR' in col.upper() or 'VENDOR' in col.upper() or 'RAZÓN' in col.upper()]

    for col in vendor_cols:
        print(f"\n{col}:")
        print(f"  Non-null: {df[col].notna().sum():,} ({(df[col].notna().sum()/len(df)*100):.1f}%)")
        print(f"  Unique vendors: {df[col].nunique():,}")

        # Sample values
        sample = df[col].dropna().head(10)
        print(f"  Sample vendor names:")
        for val in sample:
            print(f"    {val}")

        # Check case patterns
        if df[col].dtype == 'object':
            uppercase = df[col].dropna().str.isupper().sum()
            print(f"  UPPERCASE: {uppercase:,} ({(uppercase/df[col].notna().sum()*100):.1f}%)")

def analyze_rfc(df, structure_name):
    """Analyze RFC (tax ID) field"""
    print(f"\n{'='*80}")
    print(f"RFC ANALYSIS - {structure_name}")
    print(f"{'='*80}")

    rfc_cols = [col for col in df.columns if 'RFC' in col.upper()]

    if not rfc_cols:
        print("  No RFC column found")
        return

    for col in rfc_cols:
        print(f"\n{col}:")
        non_null = df[col].notna().sum()
        print(f"  Non-null: {non_null:,} ({(non_null/len(df)*100):.1f}%)")
        print(f"  Unique RFCs: {df[col].nunique():,}")

        # Sample values
        sample = df[col].dropna().head(10)
        print(f"  Sample RFCs:")
        for val in sample:
            print(f"    {val}")

def compare_columns(structures):
    """Compare columns across structures"""
    print(f"\n{'='*80}")
    print(f"COLUMN COMPARISON ACROSS STRUCTURES")
    print(f"{'='*80}")

    all_columns = set()
    for s in structures.values():
        if s:
            all_columns.update(s['columns'])

    print(f"\nTotal unique columns across all structures: {len(all_columns)}")

    # Common columns (in all structures)
    common = set(structures['A']['columns'])
    for s in structures.values():
        if s:
            common = common.intersection(s['columns'])

    print(f"\nCommon columns (in ALL structures): {len(common)}")
    for col in sorted(common):
        print(f"  - {col}")

    # Structure-specific columns
    print(f"\n{'='*80}")
    print(f"STRUCTURE-SPECIFIC COLUMNS")
    print(f"{'='*80}")

    for name, data in structures.items():
        if data:
            unique = set(data['columns'])
            for other_name, other_data in structures.items():
                if other_name != name and other_data:
                    unique = unique - set(other_data['columns'])

            print(f"\nUnique to Structure {name} ({len(unique)} columns):")
            for col in sorted(unique):
                print(f"  - {col}")

def main():
    """Main analysis function"""
    print("="*80)
    print("COMPRANET DATA STRUCTURE ANALYSIS")
    print("="*80)

    # Load samples from each structure
    df_a = load_sample(STRUCTURE_A, nrows=10000, file_type='xlsx')
    df_b = load_sample(STRUCTURE_B, nrows=10000, file_type='xlsx')
    df_c = load_sample(STRUCTURE_C, nrows=10000, file_type='xlsx')
    df_d_2023 = load_sample(STRUCTURE_D_2023, nrows=10000, file_type='csv')
    df_d_2024 = load_sample(STRUCTURE_D_2024, nrows=10000, file_type='csv')

    # Analyze each structure
    structures = {}

    if df_a is not None:
        structures['A'] = analyze_structure(df_a, "A (2002-2010)")
        analyze_amounts(df_a, "A (2002-2010)")
        analyze_dates(df_a, "A (2002-2010)")
        analyze_vendors(df_a, "A (2002-2010)")
        analyze_rfc(df_a, "A (2002-2010)")

    if df_b is not None:
        structures['B'] = analyze_structure(df_b, "B (2010-2017)")
        analyze_amounts(df_b, "B (2010-2017)")
        analyze_dates(df_b, "B (2010-2017)")
        analyze_vendors(df_b, "B (2010-2017)")
        analyze_rfc(df_b, "B (2010-2017)")

    if df_c is not None:
        structures['C'] = analyze_structure(df_c, "C (2018-2022)")
        analyze_amounts(df_c, "C (2018-2022)")
        analyze_dates(df_c, "C (2018-2022)")
        analyze_vendors(df_c, "C (2018-2022)")
        analyze_rfc(df_c, "C (2018-2022)")

    if df_d_2023 is not None:
        structures['D_2023'] = analyze_structure(df_d_2023, "D (2023)")
        analyze_amounts(df_d_2023, "D (2023)")
        analyze_dates(df_d_2023, "D (2023)")
        analyze_vendors(df_d_2023, "D (2023)")
        analyze_rfc(df_d_2023, "D (2023)")

    if df_d_2024 is not None:
        structures['D_2024'] = analyze_structure(df_d_2024, "D (2024)")
        analyze_amounts(df_d_2024, "D (2024)")
        analyze_dates(df_d_2024, "D (2024)")
        analyze_vendors(df_d_2024, "D (2024)")
        analyze_rfc(df_d_2024, "D (2024)")

    # Compare structures
    compare_columns(structures)

    # Save results
    output_file = Path(r"D:\Python\yangwenli\structure_analysis.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(structures, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*80}")
    print(f"Analysis complete. Results saved to: {output_file}")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
