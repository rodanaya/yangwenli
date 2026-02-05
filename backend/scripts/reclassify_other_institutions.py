"""
Reclassify "other" institutions using enhanced pattern matching.

This script addresses the 486 institutions currently classified as "other" by:
1. Classifying single-word uppercase names as municipalities
2. Matching INSTITUTO, SISTEMA, CONSEJO, COMISION patterns
3. Flagging vendor-like records (S.A., C.V.) as data quality issues
4. Keeping truly unclassifiable records as "other"

Usage:
    python -m backend.scripts.reclassify_other_institutions [--dry-run]
"""

import sqlite3
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Reclassification rules: (pattern, new_type, type_id, confidence, notes)
RECLASSIFICATION_RULES = [
    # State women's institutes
    (r'INSTITUTO.*(?:DE LA|PARA LA)?\s*MUJER|INSTITUTO ESTATAL.*MUJER|'
     r'INSTITUTO.*MUJER.*(?:ESTADO|ESTATAL)|INMUJERES',
     'social_program', 9, 0.85, 'women_institute'),

    # State DIF systems
    (r'SISTEMA.*DESARROLLO INTEGRAL.*FAMILIA|'
     r'SISTEMA DIF|^DIF\s|DIF\s+(?:ESTATAL|MUNICIPAL)|'
     r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA',
     'social_program', 9, 0.90, 'dif_system'),

    # Comisiones nacionales (federal)
    (r'COMISI[OÓ]N NACIONAL DE (?:BIO[EÉ]TICA|ARBITRAJE|AVAL[UÚ]OS|'
     r'LIBROS DE TEXTO|DERECHOS HUMANOS|'
     r'PROTECCI[OÓ]N SOCIAL EN SALUD)',
     'federal_agency', 2, 0.85, 'national_commission'),

    # Comisiones estatales
    (r'COMISI[OÓ]N ESTATAL|COMISI[OÓ]N DE DERECHOS HUMANOS.*ESTADO|'
     r'COMISI[OÓ]N.*AGUA.*ESTADO',
     'state_agency', 12, 0.80, 'state_commission'),

    # Consejos estatales
    (r'CONSEJO ESTATAL|CONSEJO DE (?:CIENCIA|CULTURA|URBANIZACI[OÓ]N)',
     'state_agency', 12, 0.80, 'state_council'),

    # Consejos nacionales (federal)
    (r'CONSEJO NACIONAL (?:DE|PARA)',
     'federal_agency', 2, 0.85, 'national_council'),

    # Educational institutions - CECyT, CONALEP, etc.
    (r'COLEGIO DE ESTUDIOS CIENT[IÍ]FICOS|CECyT|'
     r'CONALEP|COLEGIO NACIONAL DE EDUCACI[OÓ]N PROFESIONAL|'
     r'INSTITUTO TECNOL[OÓ]GICO|UNIVERSIDAD TECNOL[OÓ]GICA|'
     r'TECNOL[OÓ]GICO DESCENTRALIZADO|CECYTE',
     'educational', 18, 0.85, 'technical_education'),

    # State education systems
    (r'SISTEMA EDUCATIVO.*ESTADO|SECRETAR[IÍ]A DE EDUCACI[OÓ]N.*ESTADO',
     'state_agency', 12, 0.80, 'state_education'),

    # Instituto patterns - state agencies
    (r'INSTITUTO (?:ESTATAL|DEL ESTADO|DE LA VIVIENDA|DE CAPACITACI[OÓ]N|'
     r'REGISTRAL|DE DESARROLLO|DE PLANEACI[OÓ]N)',
     'state_agency', 12, 0.75, 'state_institute'),

    # Specific institute patterns - social programs
    (r'INSTITUTO.*(?:JUVENTUD|J[OÓ]VENES|DEPORTE|CULTURA|ARTES)',
     'social_program', 9, 0.75, 'social_institute'),

    # Fomento/Fondo patterns
    (r'FOMENTO (?:METROPOLITANO|ECON[OÓ]MICO|INDUSTRIAL)|'
     r'FONDO DE FOMENTO',
     'state_agency', 12, 0.70, 'development_agency'),

    # Previsiones y Aportaciones (federal budget line)
    (r'PREVISIONES Y APORTACIONES|APORTACIONES.*SISTEMAS DE',
     'federal_agency', 2, 0.70, 'budget_provision'),

    # ENTIDADES NO SECTORIZADAS - keep as other
    (r'ENTIDADES NO SECTORIZADAS',
     'other', 19, 0.50, 'unsectorized'),
]

# Vendor detection pattern (data quality issue)
VENDOR_PATTERN = re.compile(
    r'(?:^|[,\s])S\.?\s*A\.?\s*(?:DE\s*)?C\.?\s*V\.?(?:\s*|$)|'
    r'S\.?\s*A\.?\s*P\.?\s*I\.?\s*(?:DE\s*)?C\.?\s*V\.?|'
    r'S\.?\s*DE\s*R\.?\s*L\.?|'
    r'S\.?\s*A\.?\s*B\.?|'
    r'\bLTDA\.?\b',
    re.IGNORECASE
)

# Single-word municipality pattern (uppercase, 4+ chars, no special chars)
MUNICIPALITY_PATTERN = re.compile(r'^[A-ZÁÉÍÓÚÑÜ]{4,30}$')


def classify_single_word_municipalities(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Classify single-word uppercase names as municipalities."""
    cursor = conn.cursor()
    stats = {'matched': 0, 'examples': []}

    # Get single-word "other" institutions
    cursor.execute("""
        SELECT id, name, name_normalized, total_contracts
        FROM institutions
        WHERE institution_type = 'other'
        AND name_normalized NOT LIKE '% %'
        AND length(name_normalized) >= 4
    """)
    candidates = cursor.fetchall()

    updates = []
    for inst_id, name, name_norm, contracts in candidates:
        search_name = (name_norm or name or '').strip()
        if MUNICIPALITY_PATTERN.match(search_name):
            updates.append((inst_id, name, contracts))
            if len(stats['examples']) < 10:
                stats['examples'].append(f"{name} ({contracts} contracts)")

    stats['matched'] = len(updates)

    if not dry_run and updates:
        cursor.executemany("""
            UPDATE institutions
            SET institution_type = 'municipal',
                institution_type_id = 13,
                classification_confidence = 0.60,
                classification_method = 'pattern_single_word_municipal',
                updated_at = ?
            WHERE id = ?
        """, [(datetime.now().isoformat(), u[0]) for u in updates])
        conn.commit()

    return stats


def flag_vendor_records(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Flag records that appear to be vendors, not institutions."""
    cursor = conn.cursor()
    stats = {'flagged': 0, 'examples': []}

    # Get "other" institutions with vendor-like names
    cursor.execute("""
        SELECT id, name, name_normalized, total_contracts
        FROM institutions
        WHERE institution_type = 'other'
    """)
    candidates = cursor.fetchall()

    flagged = []
    for inst_id, name, name_norm, contracts in candidates:
        search_name = (name_norm or name or '').upper()
        if VENDOR_PATTERN.search(search_name):
            flagged.append((inst_id, name, contracts))
            if len(stats['examples']) < 10:
                stats['examples'].append(f"{name[:50]} ({contracts} contracts)")

    stats['flagged'] = len(flagged)

    if not dry_run and flagged:
        # Mark these with a special classification method for review
        cursor.executemany("""
            UPDATE institutions
            SET classification_method = 'DATA_QUALITY_FLAG_VENDOR',
                classification_confidence = 0.0,
                updated_at = ?
            WHERE id = ?
        """, [(datetime.now().isoformat(), f[0]) for f in flagged])
        conn.commit()

    return stats


def apply_reclassification_rules(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Apply pattern-based reclassification rules."""
    cursor = conn.cursor()
    stats = {rule[4]: {'matched': 0, 'examples': []} for rule in RECLASSIFICATION_RULES}

    # Get remaining "other" institutions (excluding already flagged vendors)
    cursor.execute("""
        SELECT id, name, name_normalized, total_contracts
        FROM institutions
        WHERE institution_type = 'other'
        AND (classification_method IS NULL OR classification_method != 'DATA_QUALITY_FLAG_VENDOR')
    """)
    candidates = cursor.fetchall()

    updates = []
    for inst_id, name, name_norm, contracts in candidates:
        search_name = (name_norm or name or '').upper()

        for pattern, new_type, type_id, confidence, rule_name in RECLASSIFICATION_RULES:
            if re.search(pattern, search_name, re.IGNORECASE):
                updates.append((new_type, type_id, confidence, f'pattern_{rule_name}', inst_id))
                stats[rule_name]['matched'] += 1
                if len(stats[rule_name]['examples']) < 3:
                    stats[rule_name]['examples'].append(f"{name[:40]}")
                break  # First match wins

    if not dry_run and updates:
        cursor.executemany("""
            UPDATE institutions
            SET institution_type = ?,
                institution_type_id = ?,
                classification_confidence = ?,
                classification_method = ?,
                updated_at = ?
            WHERE id = ?
        """, [(u[0], u[1], u[2], u[3], datetime.now().isoformat(), u[4]) for u in updates])
        conn.commit()

    return stats


def fix_remaining_decentralized(conn: sqlite3.Connection, dry_run: bool = False) -> int:
    """Fix the 1 remaining 'decentralized' institution."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, name_normalized
        FROM institutions
        WHERE institution_type = 'decentralized'
    """)
    remaining = cursor.fetchall()

    if not remaining:
        return 0

    # Apply more aggressive matching
    fixed = 0
    for inst_id, name, name_norm in remaining:
        search_name = (name_norm or name or '').upper()

        # Try each split rule from migrate_institutions_v2.py
        # If nothing matches, classify as 'other'
        new_type = 'other'
        type_id = 19
        confidence = 0.30

        if not dry_run:
            cursor.execute("""
                UPDATE institutions
                SET institution_type = ?,
                    institution_type_id = ?,
                    classification_confidence = ?,
                    classification_method = 'fallback_decentralized',
                    updated_at = ?
                WHERE id = ?
            """, (new_type, type_id, confidence, datetime.now().isoformat(), inst_id))
            fixed += 1

    if fixed and not dry_run:
        conn.commit()

    return fixed


def print_summary(conn: sqlite3.Connection) -> None:
    """Print summary of institution distribution after reclassification."""
    cursor = conn.cursor()

    print("\n" + "=" * 60)
    print("RECLASSIFICATION SUMMARY")
    print("=" * 60)

    # Distribution by type
    cursor.execute("""
        SELECT institution_type, COUNT(*) as cnt
        FROM institutions
        GROUP BY institution_type
        ORDER BY cnt DESC
    """)
    print("\nDistribution by type:")
    for row in cursor.fetchall():
        print(f"  {row[0]:<30} {row[1]:>5}")

    # Check for remaining issues
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE institution_type = 'other'")
    other_count = cursor.fetchone()[0]
    print(f"\nRemaining 'other': {other_count}")

    cursor.execute("SELECT COUNT(*) FROM institutions WHERE institution_type = 'decentralized'")
    decentralized = cursor.fetchone()[0]
    print(f"Remaining 'decentralized': {decentralized}")

    cursor.execute("""
        SELECT COUNT(*) FROM institutions
        WHERE classification_method = 'DATA_QUALITY_FLAG_VENDOR'
    """)
    flagged = cursor.fetchone()[0]
    print(f"Flagged as potential vendors: {flagged}")

    # Size tier and autonomy coverage
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE size_tier IS NOT NULL")
    size_tier = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE autonomy_level IS NOT NULL")
    autonomy = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM institutions")
    total = cursor.fetchone()[0]

    print(f"\nsize_tier populated: {size_tier}/{total} ({100*size_tier/total:.1f}%)")
    print(f"autonomy_level populated: {autonomy}/{total} ({100*autonomy/total:.1f}%)")


def main():
    """Run the reclassification."""
    dry_run = '--dry-run' in sys.argv

    print(f"Database: {DB_PATH}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Step 1: Flag vendor-like records
        print("\n1. Flagging vendor-like records...")
        vendor_stats = flag_vendor_records(conn, dry_run)
        print(f"   Flagged: {vendor_stats['flagged']}")
        for ex in vendor_stats['examples'][:5]:
            print(f"     - {ex}")

        # Step 2: Classify single-word municipalities
        print("\n2. Classifying single-word municipalities...")
        muni_stats = classify_single_word_municipalities(conn, dry_run)
        print(f"   Matched: {muni_stats['matched']}")
        for ex in muni_stats['examples'][:5]:
            print(f"     - {ex}")

        # Step 3: Apply pattern-based rules
        print("\n3. Applying pattern-based rules...")
        rule_stats = apply_reclassification_rules(conn, dry_run)
        total_rules = 0
        for rule_name, stats in rule_stats.items():
            if stats['matched'] > 0:
                print(f"   {rule_name}: {stats['matched']} matched")
                for ex in stats['examples']:
                    print(f"     - {ex}")
                total_rules += stats['matched']
        print(f"   Total from rules: {total_rules}")

        # Step 4: Fix remaining decentralized
        print("\n4. Fixing remaining 'decentralized'...")
        fixed = fix_remaining_decentralized(conn, dry_run)
        print(f"   Fixed: {fixed}")

        # Print summary
        if not dry_run:
            print_summary(conn)

        print("\n" + "=" * 60)
        print(f"Reclassification {'simulation' if dry_run else 'complete'}!")
        print("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
