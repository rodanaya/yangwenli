"""
Check if numeric vendor ID problem actually exists in the database
"""
import sqlite3
from pathlib import Path

db_path = Path(r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db")

if not db_path.exists():
    print("=" * 80)
    print("DATABASE DOES NOT EXIST YET")
    print("=" * 80)
    print(f"Path checked: {db_path}")
    print("\nThe numeric vendor ID issue may have been reported based on a different")
    print("database or project. Let's verify the source data is clean.")
    exit(0)

print("=" * 80)
print("CHECKING FOR NUMERIC VENDOR IDs IN DATABASE")
print("=" * 80)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check total vendors
cursor.execute("SELECT COUNT(*) FROM vendors")
total_vendors = cursor.fetchone()[0]
print(f"\nTotal vendors in database: {total_vendors:,}")

# Check for numeric-only vendor names
# SQLite GLOB: Use character classes to check for alphabetic characters
cursor.execute("""
    SELECT
        COUNT(*) as numeric_only_count
    FROM vendors
    WHERE name NOT GLOB '*[A-Za-z]*'
    AND LENGTH(name) > 0
""")

numeric_count = cursor.fetchone()[0]
print(f"Vendors with numeric-only names: {numeric_count:,} ({numeric_count/total_vendors*100:.2f}%)")

if numeric_count > 0:
    print("\nPROBLEM CONFIRMED: Numeric vendor IDs exist in database")
    print("\nTop 20 numeric vendors by contract count:")

    cursor.execute("""
        SELECT
            id,
            name,
            rfc,
            contract_count
        FROM vendors
        WHERE name NOT GLOB '*[A-Za-z]*'
        AND LENGTH(name) > 0
        ORDER BY contract_count DESC
        LIMIT 20
    """)

    print(f"\n{'ID':>8} {'Vendor Name':>15} {'RFC':>15} {'Contracts':>12}")
    print("-" * 80)
    for row in cursor.fetchall():
        vendor_id, name, rfc, count = row
        print(f"{vendor_id:>8} {name:>15} {rfc or 'NULL':>15} {count or 0:>12,}")

    # Check which years these come from
    cursor.execute("""
        SELECT
            c.source_year,
            c.source_structure,
            COUNT(DISTINCT v.id) as numeric_vendors,
            COUNT(c.id) as contracts
        FROM contracts c
        JOIN vendors v ON c.vendor_id = v.id
        WHERE v.name NOT GLOB '*[A-Za-z]*'
        AND LENGTH(v.name) > 0
        GROUP BY c.source_year, c.source_structure
        ORDER BY c.source_year
    """)

    print("\n" + "=" * 80)
    print("NUMERIC VENDORS BY YEAR AND STRUCTURE")
    print("=" * 80)
    print(f"{'Year':>6} {'Structure':>10} {'Numeric Vendors':>20} {'Contracts':>15}")
    print("-" * 80)

    for row in cursor.fetchall():
        year, structure, vendor_count, contract_count = row
        print(f"{year:>6} {structure:>10} {vendor_count:>20,} {contract_count:>15,}")

else:
    print("\nNO PROBLEM FOUND: All vendors have text names")
    print("The source data is clean. The issue may have been based on")
    print("a misunderstanding or a different database.")

conn.close()
