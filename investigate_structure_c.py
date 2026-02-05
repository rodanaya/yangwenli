"""
Investigation of Structure C (2018-2022) Vendor ID Issue
Data Quality Guardian Analysis
"""
import pandas as pd
import numpy as np
from pathlib import Path
import sqlite3

# File paths
data_dir = Path(r"D:\Python\yangwenli\original_data")
db_path = Path(r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db")

print("="*80)
print("STRUCTURE C VENDOR ID INVESTIGATION")
print("="*80)

# ====================
# PART 1: Examine Structure C Files
# ====================
print("\n" + "="*80)
print("PART 1: EXAMINING STRUCTURE C FILES (2018-2022)")
print("="*80)

structure_c_years = [2018, 2019, 2020, 2021, 2022]

for year in structure_c_years:
    print(f"\n--- {year} ---")
    file_path = data_dir / f"{year}.xlsx"

    if not file_path.exists():
        print(f"File not found: {file_path}")
        continue

    # Read first 1000 rows to examine
    df = pd.read_excel(file_path, nrows=1000)

    print(f"Rows in sample: {len(df)}")
    print(f"Total columns: {len(df.columns)}")
    print(f"\nColumn names:")
    for i, col in enumerate(df.columns):
        print(f"  {i+1:2d}. {col}")

    # Look for vendor-related columns
    vendor_cols = [col for col in df.columns if any(keyword in col.lower()
                   for keyword in ['proveedor', 'vendor', 'razon', 'social', 'empresa', 'nombre'])]

    print(f"\nVendor-related columns: {vendor_cols}")

    if vendor_cols:
        for col in vendor_cols:
            print(f"\n  Column: {col}")
            print(f"  Sample values (first 10):")
            for idx, val in enumerate(df[col].head(10)):
                print(f"    {idx+1:2d}. {val}")
            print(f"  Null count: {df[col].isnull().sum()}")
            print(f"  Unique values: {df[col].nunique()}")

            # Check if values are numeric IDs
            non_null_values = df[col].dropna()
            if len(non_null_values) > 0:
                # Check if all are numeric strings
                try:
                    numeric_count = sum(str(val).isdigit() for val in non_null_values)
                    print(f"  Numeric-only values: {numeric_count}/{len(non_null_values)} ({numeric_count/len(non_null_values)*100:.1f}%)")
                except:
                    pass

    # Look for RFC column
    rfc_cols = [col for col in df.columns if 'rfc' in col.lower()]
    print(f"\nRFC columns: {rfc_cols}")

    if rfc_cols:
        for col in rfc_cols:
            print(f"\n  Column: {col}")
            print(f"  Sample values (first 10):")
            for idx, val in enumerate(df[col].head(10)):
                print(f"    {idx+1:2d}. {val}")
            print(f"  Null count: {df[col].isnull().sum()}")
            print(f"  Coverage: {(1 - df[col].isnull().sum()/len(df))*100:.1f}%")

    print("\n" + "-"*80)

    # Only examine first year in detail for now
    break

print("\n" + "="*80)
print("PART 2: CHECKING FOR LOOKUP TABLES IN DATA DIRECTORY")
print("="*80)

# List all files in original_data
all_files = list(data_dir.glob("*"))
print(f"\nAll files in {data_dir}:")
for f in sorted(all_files):
    if f.is_file():
        size_mb = f.stat().st_size / (1024*1024)
        print(f"  {f.name:50s} {size_mb:8.2f} MB")

# Look for catalog files
catalog_keywords = ['catalogo', 'catalog', 'proveedor', 'vendor', 'provider', 'empresa', 'company']
catalog_files = [f for f in all_files if f.is_file() and
                 any(keyword in f.name.lower() for keyword in catalog_keywords)]

if catalog_files:
    print(f"\nPotential catalog files found:")
    for f in catalog_files:
        print(f"  - {f.name}")
else:
    print(f"\nNo obvious catalog files found with keywords: {catalog_keywords}")

print("\n" + "="*80)
print("PART 3: EXAMINING STRUCTURE D FOR COMPARISON")
print("="*80)

# Read Structure D (2023) to see the proper format
print("\n--- 2023.csv (Structure D) ---")
df_2023 = pd.read_csv(data_dir / "Contratos_CompraNet2023.csv", nrows=1000)

print(f"Rows in sample: {len(df_2023)}")
print(f"Total columns: {len(df_2023.columns)}")

vendor_cols_2023 = [col for col in df_2023.columns if any(keyword in col.lower()
                   for keyword in ['proveedor', 'vendor', 'razon', 'social', 'empresa'])]

print(f"\nVendor-related columns in Structure D: {vendor_cols_2023}")

for col in vendor_cols_2023:
    print(f"\n  Column: {col}")
    print(f"  Sample values (first 10):")
    for idx, val in enumerate(df_2023[col].head(10)):
        print(f"    {idx+1:2d}. {val}")

print("\n" + "="*80)
print("PART 4: ANALYZING DATABASE VENDORS TABLE")
print("="*80)

# Check what's in the vendors table
if db_path.exists():
    conn = sqlite3.connect(db_path)

    # Get vendor statistics
    query = """
    SELECT
        COUNT(*) as total_vendors,
        SUM(CASE WHEN name LIKE '%[0-9]%' AND name NOT LIKE '%[A-Za-z]%' THEN 1 ELSE 0 END) as numeric_only_names,
        SUM(CASE WHEN rfc IS NOT NULL THEN 1 ELSE 0 END) as vendors_with_rfc
    FROM vendors
    """

    result = pd.read_sql_query(query, conn)
    print("\nVendor table statistics:")
    print(result.to_string(index=False))

    # Sample some numeric vendors
    query = """
    SELECT id, name, rfc, contract_count
    FROM vendors
    WHERE name NOT LIKE '%[A-Za-z]%'
    AND name LIKE '%[0-9]%'
    ORDER BY contract_count DESC
    LIMIT 20
    """

    numeric_vendors = pd.read_sql_query(query, conn)
    print("\nTop 20 vendors with numeric-only names (by contract count):")
    print(numeric_vendors.to_string(index=False))

    # Check if these numeric IDs appear in Structure D
    if len(numeric_vendors) > 0:
        numeric_ids = "','".join(numeric_vendors['name'].astype(str).tolist()[:10])
        query = f"""
        SELECT
            v.name as vendor_name,
            v.rfc,
            COUNT(c.id) as contracts_in_db
        FROM vendors v
        LEFT JOIN contracts c ON v.id = c.vendor_id
        WHERE v.name IN ('{numeric_ids}')
        GROUP BY v.id, v.name, v.rfc
        """

        print("\nChecking if numeric IDs exist in database:")
        print(pd.read_sql_query(query, conn).to_string(index=False))

    conn.close()
else:
    print(f"Database not found at {db_path}")

print("\n" + "="*80)
print("INVESTIGATION COMPLETE")
print("="*80)
