"""
Match Ground Truth Entities to Database Records

Attempts to match known bad vendors and institutions from ground truth
to actual entities in the RUBLI database using:
1. RFC exact match (highest confidence)
2. Normalized name exact match (high confidence)
3. Fuzzy name matching (medium confidence)
4. Manual review for uncertain matches

Usage:
    python backend/scripts/match_ground_truth.py [--dry-run] [--auto-match]

Flags:
    --dry-run       Show matches without updating database
    --auto-match    Automatically accept high-confidence matches (RFC or exact name)
    --interactive   Prompt for confirmation on fuzzy matches
"""

import sqlite3
import os
import re
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from difflib import SequenceMatcher

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Matching thresholds
RFC_MATCH_CONFIDENCE = 1.0
EXACT_NAME_CONFIDENCE = 0.95
FUZZY_HIGH_THRESHOLD = 0.85
FUZZY_MEDIUM_THRESHOLD = 0.70
MIN_FUZZY_CONFIDENCE = 0.65


def normalize_name(name: str) -> str:
    """Normalize company name for matching."""
    if not name:
        return ""

    name = name.upper()

    # Remove common suffixes
    suffixes = [
        ' SA DE CV', ' S.A. DE C.V.', ' S.A DE C.V', ' SADE CV',
        ' S DE RL DE CV', ' S.DE R.L. DE C.V.',
        ' SC DE RL', ' S.C.',
        ' AC', ' A.C.'
    ]
    for suffix in suffixes:
        name = name.replace(suffix, '')

    # Remove punctuation and extra spaces
    name = re.sub(r'[.,;:\-\'\"()]', '', name)
    name = re.sub(r'\s+', ' ', name)
    name = name.strip()

    return name


def calculate_similarity(name1: str, name2: str) -> float:
    """Calculate similarity ratio between two names."""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)

    if not norm1 or not norm2:
        return 0.0

    # Exact match after normalization
    if norm1 == norm2:
        return EXACT_NAME_CONFIDENCE

    # Sequence matching
    return SequenceMatcher(None, norm1, norm2).ratio()


def find_vendor_matches(cursor: sqlite3.Cursor, source_name: str,
                        source_rfc: Optional[str] = None,
                        limit: int = 5) -> List[Dict[str, Any]]:
    """
    Find potential vendor matches in the database.

    Returns list of candidates with match details.
    """
    matches = []

    # Try RFC match first (highest confidence)
    if source_rfc:
        cursor.execute("""
            SELECT id, name, rfc, name_normalized, total_contracts, total_amount_mxn
            FROM vendors
            WHERE rfc = ?
        """, (source_rfc,))

        for row in cursor.fetchall():
            matches.append({
                'vendor_id': row[0],
                'name': row[1],
                'rfc': row[2],
                'name_normalized': row[3],
                'total_contracts': row[4],
                'total_amount_mxn': row[5],
                'match_method': 'rfc_exact',
                'confidence': RFC_MATCH_CONFIDENCE
            })

    if matches:
        return matches  # RFC match is definitive

    # Try normalized name exact match
    normalized = normalize_name(source_name)
    cursor.execute("""
        SELECT id, name, rfc, name_normalized, total_contracts, total_amount_mxn
        FROM vendors
        WHERE UPPER(name_normalized) = ? OR UPPER(name) = ?
        LIMIT ?
    """, (normalized, normalized, limit))

    for row in cursor.fetchall():
        matches.append({
            'vendor_id': row[0],
            'name': row[1],
            'rfc': row[2],
            'name_normalized': row[3],
            'total_contracts': row[4],
            'total_amount_mxn': row[5],
            'match_method': 'name_exact',
            'confidence': EXACT_NAME_CONFIDENCE
        })

    if matches:
        return matches

    # Fuzzy matching - search for similar names
    # First, get tokens from source name for targeted search
    tokens = normalized.split()
    if len(tokens) >= 2:
        search_pattern = f"%{tokens[0]}%{tokens[1]}%"
    elif tokens:
        search_pattern = f"%{tokens[0]}%"
    else:
        return []

    cursor.execute("""
        SELECT id, name, rfc, name_normalized, total_contracts, total_amount_mxn
        FROM vendors
        WHERE (name LIKE ? OR name_normalized LIKE ?)
        AND total_contracts > 0
        ORDER BY total_contracts DESC
        LIMIT 100
    """, (search_pattern, search_pattern))

    candidates = cursor.fetchall()

    # Score candidates
    for row in candidates:
        similarity = calculate_similarity(source_name, row[1])
        if similarity >= MIN_FUZZY_CONFIDENCE:
            matches.append({
                'vendor_id': row[0],
                'name': row[1],
                'rfc': row[2],
                'name_normalized': row[3],
                'total_contracts': row[4],
                'total_amount_mxn': row[5],
                'match_method': 'name_fuzzy',
                'confidence': round(similarity, 3)
            })

    # Sort by confidence
    matches.sort(key=lambda x: x['confidence'], reverse=True)
    return matches[:limit]


def find_institution_matches(cursor: sqlite3.Cursor, source_name: str,
                             limit: int = 5) -> List[Dict[str, Any]]:
    """
    Find potential institution matches in the database.
    """
    matches = []
    normalized = normalize_name(source_name)

    # Try exact match on siglas or name
    cursor.execute("""
        SELECT id, name, siglas, name_normalized, total_contracts, total_amount_mxn
        FROM institutions
        WHERE UPPER(siglas) = ? OR UPPER(name) = ? OR UPPER(name_normalized) = ?
        LIMIT ?
    """, (normalized, normalized, normalized, limit))

    for row in cursor.fetchall():
        matches.append({
            'institution_id': row[0],
            'name': row[1],
            'siglas': row[2],
            'name_normalized': row[3],
            'total_contracts': row[4],
            'total_amount_mxn': row[5],
            'match_method': 'name_exact',
            'confidence': EXACT_NAME_CONFIDENCE
        })

    if matches:
        return matches

    # Check for siglas match (e.g., "IMSS", "PEMEX")
    tokens = source_name.upper().split()
    for token in tokens:
        if len(token) >= 3 and len(token) <= 10:
            cursor.execute("""
                SELECT id, name, siglas, name_normalized, total_contracts, total_amount_mxn
                FROM institutions
                WHERE UPPER(siglas) = ?
                LIMIT 1
            """, (token,))

            row = cursor.fetchone()
            if row:
                matches.append({
                    'institution_id': row[0],
                    'name': row[1],
                    'siglas': row[2],
                    'name_normalized': row[3],
                    'total_contracts': row[4],
                    'total_amount_mxn': row[5],
                    'match_method': 'siglas_exact',
                    'confidence': EXACT_NAME_CONFIDENCE
                })
                break

    if matches:
        return matches

    # Fuzzy matching
    search_tokens = normalized.split()[:2]
    if search_tokens:
        search_pattern = f"%{search_tokens[0]}%"
        cursor.execute("""
            SELECT id, name, siglas, name_normalized, total_contracts, total_amount_mxn
            FROM institutions
            WHERE (name LIKE ? OR name_normalized LIKE ?)
            AND total_contracts > 0
            ORDER BY total_contracts DESC
            LIMIT 50
        """, (search_pattern, search_pattern))

        for row in cursor.fetchall():
            similarity = calculate_similarity(source_name, row[1])
            if similarity >= MIN_FUZZY_CONFIDENCE:
                matches.append({
                    'institution_id': row[0],
                    'name': row[1],
                    'siglas': row[2],
                    'name_normalized': row[3],
                    'total_contracts': row[4],
                    'total_amount_mxn': row[5],
                    'match_method': 'name_fuzzy',
                    'confidence': round(similarity, 3)
                })

    matches.sort(key=lambda x: x['confidence'], reverse=True)
    return matches[:limit]


def update_vendor_match(cursor: sqlite3.Cursor, gt_id: int, vendor_id: int,
                        match_method: str, confidence: float) -> None:
    """Update a ground truth vendor record with the matched vendor_id."""
    cursor.execute("""
        UPDATE ground_truth_vendors
        SET vendor_id = ?, match_method = ?, match_confidence = ?
        WHERE id = ?
    """, (vendor_id, match_method, confidence, gt_id))


def update_institution_match(cursor: sqlite3.Cursor, gt_id: int, inst_id: int,
                             match_method: str, confidence: float) -> None:
    """Update a ground truth institution record with the matched institution_id."""
    cursor.execute("""
        UPDATE ground_truth_institutions
        SET institution_id = ?, match_method = ?, match_confidence = ?
        WHERE id = ?
    """, (inst_id, match_method, confidence, gt_id))


def process_vendor_matches(conn: sqlite3.Connection, dry_run: bool = False,
                           auto_match: bool = False) -> Dict[str, int]:
    """Process all unmatched ground truth vendors."""
    cursor = conn.cursor()

    # Get unmatched vendors
    cursor.execute("""
        SELECT gtv.id, gtv.vendor_name_source, gtv.rfc_source, gtv.role,
               gtv.evidence_strength, gtc.case_name
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc ON gtv.case_id = gtc.id
        WHERE gtv.vendor_id IS NULL
    """)

    unmatched = cursor.fetchall()
    stats = {
        'total': len(unmatched),
        'matched_rfc': 0,
        'matched_exact': 0,
        'matched_fuzzy': 0,
        'no_match': 0
    }

    print(f"\nProcessing {len(unmatched)} unmatched vendors...")

    for row in unmatched:
        gt_id, source_name, source_rfc, role, evidence, case_name = row
        print(f"\n  [{gt_id}] {source_name}")
        print(f"      Case: {case_name}, Role: {role}")

        matches = find_vendor_matches(cursor, source_name, source_rfc)

        if not matches:
            print(f"      No matches found")
            stats['no_match'] += 1
            continue

        best = matches[0]
        print(f"      Best match: {best['name']} (ID: {best['vendor_id']})")
        print(f"      Method: {best['match_method']}, Confidence: {best['confidence']:.2f}")
        print(f"      Contracts: {best['total_contracts']}, Value: {best['total_amount_mxn']:,.0f} MXN")

        # Decide whether to accept
        should_accept = False

        if best['match_method'] == 'rfc_exact':
            should_accept = True
            stats['matched_rfc'] += 1
        elif best['match_method'] == 'name_exact':
            should_accept = auto_match
            if should_accept:
                stats['matched_exact'] += 1
        elif best['confidence'] >= FUZZY_HIGH_THRESHOLD and auto_match:
            should_accept = True
            stats['matched_fuzzy'] += 1

        if should_accept and not dry_run:
            update_vendor_match(cursor, gt_id, best['vendor_id'],
                                best['match_method'], best['confidence'])
            print(f"      -> MATCHED")
        elif should_accept:
            print(f"      -> Would match (dry run)")
        else:
            print(f"      -> Needs manual review")
            stats['no_match'] += 1

    if not dry_run:
        conn.commit()

    return stats


def process_institution_matches(conn: sqlite3.Connection, dry_run: bool = False,
                                auto_match: bool = False) -> Dict[str, int]:
    """Process all unmatched ground truth institutions."""
    cursor = conn.cursor()

    # Get unmatched institutions
    cursor.execute("""
        SELECT gti.id, gti.institution_name_source, gti.role,
               gti.evidence_strength, gtc.case_name
        FROM ground_truth_institutions gti
        JOIN ground_truth_cases gtc ON gti.case_id = gtc.id
        WHERE gti.institution_id IS NULL
    """)

    unmatched = cursor.fetchall()
    stats = {
        'total': len(unmatched),
        'matched_exact': 0,
        'matched_siglas': 0,
        'matched_fuzzy': 0,
        'no_match': 0
    }

    print(f"\nProcessing {len(unmatched)} unmatched institutions...")

    for row in unmatched:
        gt_id, source_name, role, evidence, case_name = row
        print(f"\n  [{gt_id}] {source_name}")
        print(f"      Case: {case_name}, Role: {role}")

        matches = find_institution_matches(cursor, source_name)

        if not matches:
            print(f"      No matches found")
            stats['no_match'] += 1
            continue

        best = matches[0]
        print(f"      Best match: {best['name']} ({best['siglas']})")
        print(f"      ID: {best['institution_id']}, Method: {best['match_method']}, Confidence: {best['confidence']:.2f}")
        print(f"      Contracts: {best['total_contracts']}")

        # Decide whether to accept
        should_accept = False

        if best['match_method'] in ('name_exact', 'siglas_exact'):
            should_accept = auto_match
            if best['match_method'] == 'siglas_exact':
                stats['matched_siglas'] += 1
            else:
                stats['matched_exact'] += 1
        elif best['confidence'] >= FUZZY_HIGH_THRESHOLD and auto_match:
            should_accept = True
            stats['matched_fuzzy'] += 1

        if should_accept and not dry_run:
            update_institution_match(cursor, gt_id, best['institution_id'],
                                     best['match_method'], best['confidence'])
            print(f"      -> MATCHED")
        elif should_accept:
            print(f"      -> Would match (dry run)")
        else:
            print(f"      -> Needs manual review")
            stats['no_match'] += 1

    if not dry_run:
        conn.commit()

    return stats


def get_match_summary(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Get summary of current match status."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN vendor_id IS NOT NULL THEN 1 ELSE 0 END) as matched
        FROM ground_truth_vendors
    """)
    vendor_row = cursor.fetchone()

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN institution_id IS NOT NULL THEN 1 ELSE 0 END) as matched
        FROM ground_truth_institutions
    """)
    inst_row = cursor.fetchone()

    return {
        'vendors': {
            'total': vendor_row[0],
            'matched': vendor_row[1],
            'unmatched': vendor_row[0] - vendor_row[1]
        },
        'institutions': {
            'total': inst_row[0],
            'matched': inst_row[1],
            'unmatched': inst_row[0] - inst_row[1]
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description='Match ground truth entities to database records'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show matches without updating database'
    )
    parser.add_argument(
        '--auto-match',
        action='store_true',
        help='Automatically accept high-confidence matches'
    )
    args = parser.parse_args()

    print("=" * 70)
    print("YANG WEN-LI: GROUND TRUTH ENTITY MATCHING")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    if args.dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***")
    if args.auto_match:
        print("*** AUTO-MATCH MODE - High-confidence matches accepted automatically ***")

    if not os.path.exists(DB_PATH):
        print(f"\nERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Show current state
        print("\nCurrent match status:")
        before = get_match_summary(conn)
        print(f"  Vendors: {before['vendors']['matched']}/{before['vendors']['total']} matched")
        print(f"  Institutions: {before['institutions']['matched']}/{before['institutions']['total']} matched")

        # Process vendors
        vendor_stats = process_vendor_matches(conn, args.dry_run, args.auto_match)

        # Process institutions
        inst_stats = process_institution_matches(conn, args.dry_run, args.auto_match)

        # Summary
        print("\n" + "=" * 70)
        print("MATCHING SUMMARY")
        print("=" * 70)

        print(f"\nVendors ({vendor_stats['total']} processed):")
        print(f"  RFC matches: {vendor_stats['matched_rfc']}")
        print(f"  Exact name matches: {vendor_stats['matched_exact']}")
        print(f"  Fuzzy matches: {vendor_stats['matched_fuzzy']}")
        print(f"  No match found: {vendor_stats['no_match']}")

        print(f"\nInstitutions ({inst_stats['total']} processed):")
        print(f"  Exact/siglas matches: {inst_stats['matched_exact'] + inst_stats['matched_siglas']}")
        print(f"  Fuzzy matches: {inst_stats['matched_fuzzy']}")
        print(f"  No match found: {inst_stats['no_match']}")

        if not args.dry_run:
            print("\nFinal match status:")
            after = get_match_summary(conn)
            print(f"  Vendors: {after['vendors']['matched']}/{after['vendors']['total']} matched")
            print(f"  Institutions: {after['institutions']['matched']}/{after['institutions']['total']} matched")

        print("\n" + "=" * 70)
        print("MATCHING COMPLETE")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Review unmatched entities manually if needed")
        print("  2. Run validate_risk_model.py to test detection rates")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
