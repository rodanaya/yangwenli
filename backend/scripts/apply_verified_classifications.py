#!/usr/bin/env python3
"""
Apply Verified Vendor Classifications

This script applies ONLY vendor classifications that have been verified
through online research. It does NOT use pattern matching guesses.

Run this script INSTEAD of the mass classification scripts to ensure
only verified data enters the database.
"""

import sqlite3
from pathlib import Path
from datetime import datetime

# Import verified data
from verified_vendor_data import VERIFIED_VENDORS, VERIFIED_CORPORATE_GROUPS

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def apply_verified_classifications():
    """Apply only verified vendor classifications to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 70)
    print("APPLYING VERIFIED VENDOR CLASSIFICATIONS")
    print("=" * 70)
    print(f"Database: {DB_PATH}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    # Ensure vendor_classifications table exists
    cursor.execute('''
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='vendor_classifications'
    ''')
    if not cursor.fetchone():
        print("ERROR: vendor_classifications table does not exist")
        print("Run create_vendor_classification_schema.py first")
        conn.close()
        return

    total_updated = 0
    total_value_updated = 0

    print("Processing verified vendor patterns...")
    print("-" * 70)

    for vendor_data in VERIFIED_VENDORS:
        pattern = vendor_data['vendor_pattern']
        industry_id = vendor_data['industry_id']
        industry_code = vendor_data['industry_code']
        source = vendor_data.get('source', 'online_research')
        notes = vendor_data.get('notes', '')

        # Find matching vendors
        cursor.execute('''
            SELECT v.id, v.name
            FROM vendors v
            JOIN vendor_classifications vc ON v.id = vc.vendor_id
            WHERE UPPER(v.name) LIKE UPPER(?)
        ''', (pattern,))

        matches = cursor.fetchall()

        if matches:
            vendor_ids = [m[0] for m in matches]

            # Update classifications
            cursor.executemany('''
                UPDATE vendor_classifications
                SET industry_id = ?,
                    industry_code = ?,
                    industry_confidence = 0.95,
                    industry_source = 'verified_online',
                    industry_rule = ?,
                    last_updated = datetime('now')
                WHERE vendor_id = ?
            ''', [(industry_id, industry_code, source[:200], vid) for vid in vendor_ids])

            # Get contract value for these vendors
            cursor.execute('''
                SELECT COUNT(*), COALESCE(SUM(amount_mxn), 0)
                FROM contracts
                WHERE vendor_id IN ({})
            '''.format(','.join('?' * len(vendor_ids))), vendor_ids)

            contracts, value = cursor.fetchone()
            total_updated += len(matches)
            total_value_updated += value

            print(f"  {pattern:40} -> {industry_code:20} ({len(matches)} vendors, {contracts:,} contracts, {value/1e9:.2f}B MXN)")

    conn.commit()

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Vendors updated: {total_updated:,}")
    print(f"Contract value covered: {total_value_updated/1e9:.2f}B MXN")

    # Show updated industry distribution
    cursor.execute('''
        SELECT industry_code, COUNT(*) as cnt
        FROM vendor_classifications
        WHERE industry_source = 'verified_online'
        GROUP BY industry_code
        ORDER BY cnt DESC
    ''')

    print()
    print("VERIFIED CLASSIFICATIONS BY INDUSTRY:")
    for code, count in cursor.fetchall():
        print(f"  {code:25}: {count:>6,}")

    conn.close()
    return total_updated, total_value_updated


def apply_verified_corporate_groups():
    """Apply verified corporate group memberships."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print()
    print("=" * 70)
    print("APPLYING VERIFIED CORPORATE GROUPS")
    print("=" * 70)

    # Check if corporate_groups table exists
    cursor.execute('''
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='corporate_groups'
    ''')
    if not cursor.fetchone():
        print("WARNING: corporate_groups table does not exist")
        print("Corporate group updates skipped")
        conn.close()
        return

    total_groups_updated = 0
    total_members_added = 0

    for group_data in VERIFIED_CORPORATE_GROUPS:
        group_name = group_data['name']
        country = group_data['country']
        industry = group_data['industry']
        members = group_data['members']
        source = group_data.get('source', 'online_research')

        # Check if group exists
        cursor.execute('''
            SELECT id FROM corporate_groups WHERE name = ?
        ''', (group_name,))
        row = cursor.fetchone()

        if row:
            group_id = row[0]
        else:
            # Create the group
            cursor.execute('''
                INSERT INTO corporate_groups (name, country, industry_sector, data_source)
                VALUES (?, ?, ?, ?)
            ''', (group_name, country, industry, f'verified: {source}'))
            group_id = cursor.lastrowid
            total_groups_updated += 1
            print(f"  Created group: {group_name} ({country})")

        # Add members
        for member_pattern in members:
            cursor.execute('''
                SELECT id, name FROM vendors
                WHERE UPPER(name) LIKE UPPER(?)
                AND id NOT IN (SELECT vendor_id FROM corporate_group_members WHERE group_id = ?)
            ''', (member_pattern, group_id))

            new_members = cursor.fetchall()
            for vid, vname in new_members:
                cursor.execute('''
                    INSERT OR IGNORE INTO corporate_group_members (group_id, vendor_id, relationship_type, confidence_score)
                    VALUES (?, ?, 'verified', 0.95)
                ''', (group_id, vid))
                total_members_added += 1

    conn.commit()

    print()
    print(f"Corporate groups created/updated: {total_groups_updated}")
    print(f"Members added: {total_members_added}")

    # Show coverage
    cursor.execute('''
        SELECT
            COUNT(DISTINCT cgm.vendor_id) as member_count,
            COALESCE(SUM(c.amount_mxn), 0) as total_value
        FROM corporate_group_members cgm
        LEFT JOIN contracts c ON cgm.vendor_id = c.vendor_id
    ''')
    member_count, total_value = cursor.fetchone()

    cursor.execute('SELECT SUM(amount_mxn) FROM contracts')
    grand_total = cursor.fetchone()[0] or 1

    print()
    print(f"Total vendors in corporate groups: {member_count:,}")
    print(f"Contract value covered: {total_value/1e9:.2f}B MXN ({100*total_value/grand_total:.1f}%)")

    conn.close()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("VERIFIED DATA APPLICATION")
    print("Only applying classifications confirmed through online research")
    print("=" * 70 + "\n")

    apply_verified_classifications()
    apply_verified_corporate_groups()

    print("\n" + "=" * 70)
    print("DONE - Only verified classifications have been applied")
    print("=" * 70)
