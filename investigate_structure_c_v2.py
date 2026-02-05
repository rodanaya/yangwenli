"""
Investigation of Structure C (2018-2022) Vendor ID Issue - Part 2
Checking all years for numeric vendor IDs
"""
import pandas as pd
import numpy as np
from pathlib import Path
import sqlite3

data_dir = Path(r"D:\Python\yangwenli\original_data")
db_path = Path(r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db")

print("="*80)
print("STRUCTURE C: CHECKING ALL YEARS FOR NUMERIC VENDOR IDS")
print("="*80)

structure_c_years = [2018, 2019, 2020, 2021, 2022]

for year in structure_c_years:
    print(f"\n{'='*80}")
    print(f"YEAR: {year}")
    print(f"{'='*80}")

    file_path = data_dir / f"{year}.xlsx"

    if not file_path.exists():
        print(f"File not found: {file_path}")
        continue

    # Read sample
    df = pd.read_excel(file_path, nrows=5000)

    print(f"Rows in sample: {len(df)}")

    # Find vendor column
    vendor_col = None
    for col in df.columns:
        if 'proveedor' in col.lower() and 'contratista' in col.lower():
            vendor_col = col
            break

    if not vendor_col:
        print("ERROR: Could not find vendor column!")
        continue

    print(f"Vendor column: {vendor_col}")

    # Analyze vendor names
    vendor_names = df[vendor_col].dropna()

    print(f"\nTotal vendors (non-null): {len(vendor_names)}")
    print(f"Unique vendors: {vendor_names.nunique()}")

    # Check how many are numeric-only
    numeric_pattern = vendor_names.astype(str).str.match(r'^\d+$')
    numeric_count = numeric_pattern.sum()
    numeric_pct = (numeric_count / len(vendor_names)) * 100

    print(f"\nNumeric-only vendor names: {numeric_count}/{len(vendor_names)} ({numeric_pct:.1f}%)")

    # Show sample of numeric vendors
    if numeric_count > 0:
        numeric_vendors = vendor_names[numeric_pattern]
        print(f"\nSample numeric vendor IDs (first 20):")
        for idx, vendor_id in enumerate(numeric_vendors.head(20)):
            print(f"  {idx+1:2d}. {vendor_id}")

        # Check ID range
        try:
            numeric_ids = numeric_vendors.astype(int)
            print(f"\nNumeric ID statistics:")
            print(f"  Min: {numeric_ids.min():,}")
            print(f"  Max: {numeric_ids.max():,}")
            print(f"  Mean: {numeric_ids.mean():,.0f}")
            print(f"  Median: {numeric_ids.median():,.0f}")
        except:
            print("Could not convert to integers for statistics")

    # Show sample of text vendors
    text_vendors = vendor_names[~numeric_pattern]
    if len(text_vendors) > 0:
        print(f"\nSample text vendor names (first 20):")
        for idx, vendor_name in enumerate(text_vendors.head(20)):
            print(f"  {idx+1:2d}. {vendor_name}")

    # Check RFC coverage
    rfc_col = None
    for col in df.columns:
        if col.strip().upper() == 'RFC':
            rfc_col = col
            break

    if rfc_col:
        rfc_coverage = (1 - df[rfc_col].isnull().sum() / len(df)) * 100
        print(f"\nRFC coverage: {rfc_coverage:.1f}%")

        # Check RFC coverage for numeric vs text vendors
        df_with_vendor = df[[vendor_col, rfc_col]].copy()
        df_with_vendor['is_numeric'] = df_with_vendor[vendor_col].astype(str).str.match(r'^\d+$')

        numeric_rfc_coverage = (1 - df_with_vendor[df_with_vendor['is_numeric']][rfc_col].isnull().sum() /
                                len(df_with_vendor[df_with_vendor['is_numeric']])) * 100 if df_with_vendor['is_numeric'].sum() > 0 else 0
        text_rfc_coverage = (1 - df_with_vendor[~df_with_vendor['is_numeric']][rfc_col].isnull().sum() /
                             len(df_with_vendor[~df_with_vendor['is_numeric']])) * 100 if (~df_with_vendor['is_numeric']).sum() > 0 else 0

        print(f"  RFC coverage for numeric vendor IDs: {numeric_rfc_coverage:.1f}%")
        print(f"  RFC coverage for text vendor names: {text_rfc_coverage:.1f}%")

print("\n" + "="*80)
print("CHECKING STRUCTURE D (2023-2025) FOR COMPARISON")
print("="*80)

# Try different encodings for Structure D
for year in [2023, 2024, 2025]:
    print(f"\n--- {year} ---")
    file_path = data_dir / f"Contratos_CompraNet{year}.csv"

    if not file_path.exists():
        print(f"File not found: {file_path}")
        continue

    # Try latin-1 encoding (common for Spanish data)
    try:
        df = pd.read_csv(file_path, encoding='latin-1', nrows=1000)
        print(f"Successfully read with latin-1 encoding")
        print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

        # Find vendor columns
        vendor_cols = [col for col in df.columns if 'proveedor' in col.lower() or 'contratista' in col.lower()]
        print(f"Vendor columns: {vendor_cols}")

        if vendor_cols:
            vendor_col = vendor_cols[0]
            print(f"\nSample vendor names from {vendor_col}:")
            for idx, name in enumerate(df[vendor_col].head(20)):
                print(f"  {idx+1:2d}. {name}")

            # Check if any are numeric
            vendor_names = df[vendor_col].dropna()
            numeric_pattern = vendor_names.astype(str).str.match(r'^\d+$')
            numeric_count = numeric_pattern.sum()
            print(f"\nNumeric vendor names: {numeric_count}/{len(vendor_names)} ({numeric_count/len(vendor_names)*100:.1f}%)")

        # Check for ID columns
        id_cols = [col for col in df.columns if 'id' in col.lower() and 'proveedor' in col.lower()]
        print(f"\nProvider ID columns: {id_cols}")

        if id_cols:
            for col in id_cols:
                print(f"\n  Column: {col}")
                print(f"  Sample values:")
                for idx, val in enumerate(df[col].head(10)):
                    print(f"    {idx+1:2d}. {val}")

    except Exception as e:
        print(f"Error reading file: {e}")

print("\n" + "="*80)
print("CHECKING DATABASE FOR NUMERIC VENDOR PATTERNS")
print("="*80)

if db_path.exists():
    conn = sqlite3.connect(db_path)

    # Check for purely numeric vendor names
    query = """
    SELECT
        COUNT(*) as total_vendors,
        SUM(CASE WHEN name GLOB '*[A-Za-z]*' THEN 0 ELSE 1 END) as numeric_only_names,
        SUM(CASE WHEN rfc IS NOT NULL AND rfc != '' THEN 1 ELSE 0 END) as vendors_with_rfc
    FROM vendors
    """

    result = pd.read_sql_query(query, conn)
    print("\nVendor table statistics:")
    print(result.to_string(index=False))

    # Get sample of numeric vendors
    query = """
    SELECT id, name, rfc, contract_count
    FROM vendors
    WHERE name NOT GLOB '*[A-Za-z]*'
    AND LENGTH(name) > 0
    ORDER BY contract_count DESC
    LIMIT 30
    """

    numeric_vendors = pd.read_sql_query(query, conn)
    if len(numeric_vendors) > 0:
        print(f"\nTop {len(numeric_vendors)} vendors with numeric-only names:")
        print(numeric_vendors.to_string(index=False))

        # Check their RFCs
        vendors_with_rfc = numeric_vendors[numeric_vendors['rfc'].notna()]
        print(f"\nNumeric vendors WITH RFC: {len(vendors_with_rfc)}/{len(numeric_vendors)}")

        if len(vendors_with_rfc) > 0:
            print("\nSample numeric vendors with RFCs:")
            print(vendors_with_rfc.head(10).to_string(index=False))

    conn.close()
else:
    print(f"Database not found at {db_path}")

print("\n" + "="*80)
print("INVESTIGATION COMPLETE")
print("="*80)
