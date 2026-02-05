#!/usr/bin/env python3
"""
HYPERION-ATLAS: Multi-Token Phonetic Enhancement

Phase 3 improvement (3C): Generate phonetic codes for multiple tokens
instead of just the first token. This catches reordered names like:

- "CONSTRUCTORA DEL NORTE" -> ["C365", "N630"]
- "NORTE CONSTRUCTORA" -> ["N630", "C365"]
- These now MATCH because they share phonetic tokens!

Usage:
    python backend/scripts/enhance_phonetic_codes.py
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

# Add HYPERION to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "hyperion"))

try:
    from phonetic import SpanishSoundex
    PHONETIC = SpanishSoundex()
    HAS_PHONETIC = True
except ImportError:
    HAS_PHONETIC = False
    print("Warning: HYPERION phonetic not available")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Stop words to exclude from phonetic encoding
STOP_WORDS = {
    'DE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'Y', 'E', 'EN', 'CON', 'POR',
    'PARA', 'AL', 'A', 'SA', 'CV', 'SC', 'AC', 'SRL', 'SAPI', 'SAB',
    'MEXICO', 'MEXICANA', 'MEXICANO', 'NACIONAL', 'INTERNACIONAL',
}

# Minimum token length for phonetic encoding
MIN_TOKEN_LENGTH = 4


def generate_phonetic_tokens(name: str) -> list[str]:
    """
    Generate phonetic codes for significant tokens in a name.

    Args:
        name: Normalized vendor name

    Returns:
        List of phonetic codes for significant tokens
    """
    if not name or not HAS_PHONETIC:
        return []

    tokens = name.upper().split()
    phonetic_codes = []

    for token in tokens:
        # Skip short tokens and stop words
        if len(token) < MIN_TOKEN_LENGTH:
            continue
        if token in STOP_WORDS:
            continue

        # Generate phonetic code
        code = PHONETIC.encode(token)
        if code and code not in phonetic_codes:
            phonetic_codes.append(code)

    # Limit to first 5 significant tokens
    return phonetic_codes[:5]


def enhance_phonetic_codes():
    """Add multi-token phonetic codes to vendors table."""

    print("=" * 60)
    print("HYPERION-ATLAS: Multi-Token Phonetic Enhancement")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print(f"Phonetic module: {'HYPERION' if HAS_PHONETIC else 'Not available'}")

    if not HAS_PHONETIC:
        print("\nERROR: HYPERION phonetic module required")
        return None

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Check if column exists, add if not
    cursor.execute("PRAGMA table_info(vendors)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'phonetic_tokens' not in columns:
        print("\nAdding phonetic_tokens column...")
        cursor.execute("ALTER TABLE vendors ADD COLUMN phonetic_tokens TEXT")
        conn.commit()

    # Get all company vendors
    cursor.execute("""
        SELECT id, normalized_name
        FROM vendors
        WHERE is_individual = 0
        AND normalized_name IS NOT NULL
    """)
    vendors = cursor.fetchall()
    print(f"\nCompany vendors to process: {len(vendors):,}")

    # Generate phonetic tokens
    updates = []
    stats = {
        'processed': 0,
        'with_tokens': 0,
        'avg_tokens': 0,
        'total_tokens': 0,
    }

    print("\nGenerating multi-token phonetic codes...")
    for vendor_id, name in vendors:
        stats['processed'] += 1

        tokens = generate_phonetic_tokens(name)
        if tokens:
            stats['with_tokens'] += 1
            stats['total_tokens'] += len(tokens)
            updates.append((json.dumps(tokens), vendor_id))

        if stats['processed'] % 50000 == 0:
            print(f"  Processed {stats['processed']:,} vendors...")

    # Batch update
    print(f"\nUpdating {len(updates):,} vendor records...")
    batch_size = 10000
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        cursor.executemany("""
            UPDATE vendors SET phonetic_tokens = ?
            WHERE id = ?
        """, batch)
        conn.commit()

    # Calculate statistics
    if stats['with_tokens'] > 0:
        stats['avg_tokens'] = stats['total_tokens'] / stats['with_tokens']

    # Create index for faster matching
    print("\nCreating index on phonetic_tokens...")
    try:
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_vendors_phonetic_tokens
            ON vendors(phonetic_tokens)
        """)
    except sqlite3.OperationalError:
        pass  # Index might already exist

    conn.commit()

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nVendors processed: {stats['processed']:,}")
    print(f"Vendors with tokens: {stats['with_tokens']:,} ({100*stats['with_tokens']/stats['processed']:.1f}%)")
    print(f"Average tokens per vendor: {stats['avg_tokens']:.2f}")

    # Sample output
    cursor.execute("""
        SELECT name, phonetic_tokens
        FROM vendors
        WHERE phonetic_tokens IS NOT NULL
        AND LENGTH(phonetic_tokens) > 10
        LIMIT 10
    """)
    samples = cursor.fetchall()

    print("\nSample phonetic tokens:")
    for name, tokens_json in samples:
        tokens = json.loads(tokens_json)
        print(f"  {name[:40]}")
        print(f"    -> {tokens}")

    conn.close()

    print("\n" + "=" * 60)
    print("Multi-token phonetic enhancement complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    enhance_phonetic_codes()
