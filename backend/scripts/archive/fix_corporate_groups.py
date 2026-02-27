#!/usr/bin/env python3
"""
Fix Corporate Group Assignments

This script fixes the over-broad pattern matching that incorrectly
assigned corporate groups to individuals and unrelated companies.

Strategy:
1. Clear ALL corporate_group assignments
2. Re-apply ONLY to companies (is_individual = 0)
3. Use stricter patterns (exclude patterns that match too many individuals)
4. Skip obviously problematic patterns

Usage:
    python backend/scripts/fix_corporate_groups.py
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Import verified vendor data
import sys
sys.path.insert(0, str(Path(__file__).parent))
from verified_vendor_data import VERIFIED_VENDORS

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Patterns to SKIP - they match too many unrelated records
SKIP_PATTERNS = [
    # Patterns that match common surnames
    '%REYES%', '%ROSA%', '%CISCO%', '%LEGO%', '%ZEP%',
    '%MEDELLIN%', '%AVILA%', '%LUNA%', '%POSADAS%',
    '%MOCTEZUMA%', '%OSEL%', '%BASURTO%', '%ELISEO%',
    '%ELISA%', '%CELIS%', '%GALLEGOS%', '%GRACIELA%',
    # Patterns that are too generic
    '%VARIOUS%', '%AUTOBUSES%', '%TRANSPORTE%', '%INMOBILIA%',
    '%INFRA%', '%EY %', '%E&Y%', '%ERNST%',
    # Patterns that match Mexican corporate suffixes or common words
    '%SAP%',      # matches SAPI (Sociedad Anonima Promotora de Inversion)
    '%LTH%',      # matches HEALTH and other words
    '%HERMA%',    # matches HERMANOS surname
    '%DICO%',     # matches DIAGNOSTICO, MEDICO, etc.
    '%ISS %',     # matches too many
    '%MODERN%',   # matches MODERNA (common word)
    '%UPL%',      # matches SUPLIMEX,UPLE, etc.
    '%CIE%',      # matches CIELO, CIENCIA, GRACIE, etc.
    '%GENER%',    # matches GENERACION (common word)
    '%COMEX%',    # matches *COMEX suffix (SWECOMEX, ARQCOMEX, etc.)
    '%INTEL%MEXICO%',  # matches INTELIGENTE companies
    '%PPG%',      # too short
    '%OCESA%',    # matches prOCESAdos (processed)
    '%FAG%',      # matches INFAGON, ALFAGAMA, etc.
    '%INTERCONTINENTAL%',  # too common word
    '%ORKIN%',    # matches other words
    '%ABB%',      # matches ABBANZA, ABBER, CABBAR (ABB only 4 chars)
    '%IBEROAMERICANA%',  # common word in Mexico
    '%ROCHE%',    # matches ROCHER, ROCHESTER, PROCHEM
    '%UPS%',      # matches LUPSA, GROUPS, UPSSALA
    '%IDEAL%',    # matches many IDEAL companies
    '%ANAHUAC%',  # common place/company name in Mexico
    '%IBERO%',    # matches many IBERO* companies
    '%FLEXI%',    # matches many FLEXI* companies
    '%PISA %',    # matches *PISA companies (SPISA, CEPISA, etc.)
    '%DIMESA%',   # false positive in PiSA
    '%3M%',       # matches J3MA, R3M, 3ME
    '%KIA%',      # matches *KIA* embedded in names
    '%MABE%',     # matches *MABE* embedded (too short)
    # Single word patterns without legal suffix
]

# Corporate groups to SKIP entirely
SKIP_CORP_GROUPS = [
    'Autobuses de Oriente SA de CV',
    'Ernst & Young Global Limited',
    'Cisco Systems',
    'Volkswagen AG',
    'Elis SA',
    'Lego Group',
    'Zep Inc',
    'Various',
    'Linde plc',
    'Pinturas Osel',
    'Dell Technologies',
    'Corporacion Moctezuma',
    'Inmobilia',
    'Contemporary Amperex Technology',
    'ASUR',
    'Grupo Posadas SAB de CV',
    'Mars Incorporated',
    'Infra SA de CV',
    'De La Rosa',
    'Coca-Cola FEMSA',
    # Added to fix false positives found during QC
    'SAP SE',           # %SAP% matches SAPI corporate suffix
    'Clarios LLC',      # %LTH% matches HEALTH words
    'HERMA',            # %HERMA% matches HERMANOS surname
    'Grupo Dico',       # %DICO% matches DIAGNOSTICO
    'ISS A/S',          # %ISS% matches too many words
    'Moderna Inc',      # %MODERN% matches MODERNA (common word)
    'UPL Limited',      # %UPL% matches SUPLIMEX, etc.
    'Live Nation/Grupo CIE',  # %CIE% matches CIELO, CIENCIA
    'Generac',          # %GENER% matches GENERACION
    'Continental AG',   # %CONTI% matches CONTINENTAL (common word)
    'PPG Industries',   # %COMEX% matches *COMEX suffix
    'Intel Corporation',  # %INTEL%MEXICO% matches INTELIGENTE
    'Live Nation Entertainment Inc',  # duplicate entry for CIE
    'Live Nation Entertainment',  # %OCESA% matches prOCESAdos
    'Schaeffler Group',  # %FAG% matches INFAGON, ALFAGAMA
    'IHG Hotels & Resorts',  # %INTERCONTINENTAL% too common
    'Rollins Inc.',      # %ORKIN% matches other words
    'ABB Ltd',           # %ABB% too short
    'Universidad Iberoamericana',  # %IBEROAMERICANA% too common
    'F. Hoffmann-La Roche AG',  # %ROCHE% matches many words
    'UPS Inc',           # %UPS% matches many words
    'Impulsora del Desarrollo y el Empleo en America Latina',  # %IDEAL% too common
    'Red de Universidades Anahuac',  # %ANAHUAC% common place name
    'Compania de Jesus',  # %IBERO% too common
    'Grupo Flexi',        # %FLEXI% too common
    'Laboratorios PiSA',  # patterns too broad
    '3M Company',         # %3M% too short
    'Kia Corp',           # %KIA% embedded in names
    'Mabe',               # %MABE% too short
]


def fix_corporate_groups():
    """Fix corporate group assignments with stricter matching."""

    print("=" * 60)
    print("HYPERION-ATLAS: Fix Corporate Group Assignments")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Get current state
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    before_count = cursor.fetchone()[0]
    print(f"\nVendors with corporate_group before: {before_count:,}")

    # Clear ALL corporate group assignments
    print("\nClearing all corporate_group assignments...")
    cursor.execute("UPDATE vendors SET corporate_group = NULL")
    conn.commit()

    # Track statistics
    stats = {
        'patterns_processed': 0,
        'patterns_skipped': 0,
        'corp_groups_skipped': 0,
        'vendors_updated': 0,
        'vendors_by_group': defaultdict(int)
    }

    # Process each verified vendor pattern with stricter rules
    print("\nProcessing verified vendor patterns (companies only)...")

    for pattern in VERIFIED_VENDORS:
        stats['patterns_processed'] += 1

        vendor_pattern = pattern.get('vendor_pattern')
        corporate_group = pattern.get('corporate_group')

        if not vendor_pattern or not corporate_group:
            continue

        # Skip problematic corporate groups
        if corporate_group in SKIP_CORP_GROUPS:
            stats['corp_groups_skipped'] += 1
            continue

        # Skip problematic patterns
        skip = False
        for skip_pattern in SKIP_PATTERNS:
            if skip_pattern.replace('%', '').lower() in vendor_pattern.lower():
                skip = True
                break

        if skip:
            stats['patterns_skipped'] += 1
            continue

        # Apply ONLY to companies (not individuals)
        cursor.execute("""
            UPDATE vendors
            SET corporate_group = ?
            WHERE name LIKE ?
            AND is_individual = 0
            AND corporate_group IS NULL
        """, (corporate_group, vendor_pattern))

        updated = cursor.rowcount
        if updated > 0:
            stats['vendors_updated'] += updated
            stats['vendors_by_group'][corporate_group] += updated

        # Progress indicator
        if stats['patterns_processed'] % 1000 == 0:
            print(f"  Processed {stats['patterns_processed']:,} patterns, "
                  f"updated {stats['vendors_updated']:,} vendors...")

    conn.commit()

    # Get final state
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    final_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT corporate_group) FROM vendors WHERE corporate_group IS NOT NULL")
    unique_groups = cursor.fetchone()[0]

    # Verify no individuals got assigned
    cursor.execute("""
        SELECT COUNT(*) FROM vendors
        WHERE corporate_group IS NOT NULL AND is_individual = 1
    """)
    individual_errors = cursor.fetchone()[0]

    # Show top corporate groups by vendor count
    cursor.execute("""
        SELECT corporate_group, COUNT(*) as cnt
        FROM vendors
        WHERE corporate_group IS NOT NULL
        GROUP BY corporate_group
        ORDER BY cnt DESC
        LIMIT 20
    """)
    top_groups = cursor.fetchall()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nPatterns processed: {stats['patterns_processed']:,}")
    print(f"Patterns skipped: {stats['patterns_skipped']:,}")
    print(f"Corp groups skipped: {stats['corp_groups_skipped']:,}")
    print(f"Vendors updated: {stats['vendors_updated']:,}")
    print(f"Unique corporate groups: {unique_groups}")
    print(f"\nIndividuals with corporate_group (errors): {individual_errors}")

    print("\nTop 20 Corporate Groups by Vendor Count:")
    for group, count in top_groups:
        print(f"  {count:5d}: {group}")

    conn.close()

    print("\n" + "=" * 60)
    print("Corporate group fix complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    fix_corporate_groups()
