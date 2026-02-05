#!/usr/bin/env python3
"""
HYPERION-ATLAS: First-Token Business Type Clustering

Phase 3 improvement (3A): Cluster vendors by their first token (business type).
Companies starting with the same business type word are more likely to be related.

High-value first tokens in the database:
- GRUPO: 7,841 vendors, 491.9B MXN
- CONSTRUCTORA: 4,434 vendors, 326.2B MXN
- COMERCIALIZADORA: 3,380 vendors, 143.7B MXN
- CONSTRUCCIONES: 3,191 vendors, 168.3B MXN
- SERVICIOS: 2,942 vendors, 119.4B MXN

This script applies lower similarity thresholds (0.80-0.85) within
first-token groups since the business type already provides blocking.

Usage:
    python backend/scripts/cluster_by_first_token.py
"""

import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Add HYPERION to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "hyperion"))

try:
    from similarity import SimilarityMetrics
    SIMILARITY = SimilarityMetrics()
    HAS_SIMILARITY = True
except ImportError:
    HAS_SIMILARITY = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration
CONFIG = {
    # High-value business types to cluster
    'BUSINESS_TYPES': [
        'GRUPO', 'CONSTRUCTORA', 'COMERCIALIZADORA', 'CONSTRUCCIONES',
        'SERVICIOS', 'DISTRIBUIDORA', 'PROVEEDORA', 'CONSULTORES',
        'INGENIERIA', 'PROYECTOS', 'SUMINISTROS', 'ABASTECEDORA',
        'PROMOTORA', 'INDUSTRIAL', 'INMOBILIARIA', 'TRANSPORTES',
        'SOLUCIONES', 'SISTEMAS', 'TECNOLOGIA', 'ASESORES',
    ],
    # Threshold for matching within business type groups
    'THRESHOLD': 0.82,
    # Higher threshold for generic types
    'GENERIC_THRESHOLD': 0.90,
    # Generic types requiring higher threshold
    'GENERIC_TYPES': [
        'COMERCIALIZADORA', 'SERVICIOS', 'DISTRIBUIDORA', 'PROVEEDORA',
    ],
    # Maximum group size to process (prevent memory issues)
    'MAX_GROUP_SIZE': 2000,
    # Maximum comparisons per vendor
    'MAX_COMPARISONS': 200,
}


class UnionFind:
    """Union-Find with path compression."""

    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, x):
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True


def calculate_similarity(name1: str, name2: str) -> float:
    """Calculate similarity using 6-metric approach."""
    if not HAS_SIMILARITY:
        from difflib import SequenceMatcher
        return SequenceMatcher(None, name1, name2).ratio()

    if not name1 or not name2:
        return 0.0

    jw = SIMILARITY.jaro_winkler(name1, name2)
    token_set = SIMILARITY.token_set(name1, name2)
    token_sort = SIMILARITY.token_sort(name1, name2)
    partial = SIMILARITY.partial_ratio(name1, name2)
    levenshtein = SIMILARITY.levenshtein_ratio(name1, name2)

    return (0.25 * jw +
            0.25 * token_set +
            0.15 * token_sort +
            0.15 * partial +
            0.20 * levenshtein)


def cluster_by_first_token():
    """Cluster vendors by their first token (business type)."""

    print("=" * 60)
    print("HYPERION-ATLAS: First-Token Business Type Clustering")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Get current state
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE group_id IS NOT NULL")
    already_grouped = cursor.fetchone()[0]
    print(f"\nVendors already in groups: {already_grouped:,}")

    # Initialize stats
    stats = {
        'business_types_processed': 0,
        'pairs_checked': 0,
        'new_merges': 0,
        'by_type': {},
    }

    # Process each business type
    print("\nProcessing business types...")

    for biz_type in CONFIG['BUSINESS_TYPES']:
        # Get vendors starting with this business type
        cursor.execute("""
            SELECT id, normalized_name, group_id
            FROM vendors
            WHERE normalized_name LIKE ? || ' %'
            AND is_individual = 0
            AND LENGTH(normalized_name) > ?
            ORDER BY total_amount_mxn DESC
        """, (biz_type, len(biz_type) + 3))

        vendors = cursor.fetchall()

        if len(vendors) < 2:
            continue
        if len(vendors) > CONFIG['MAX_GROUP_SIZE']:
            vendors = vendors[:CONFIG['MAX_GROUP_SIZE']]

        stats['business_types_processed'] += 1

        # Determine threshold for this type
        threshold = CONFIG['THRESHOLD']
        if biz_type in CONFIG['GENERIC_TYPES']:
            threshold = CONFIG['GENERIC_THRESHOLD']

        # Build Union-Find for this business type
        uf = UnionFind()
        merges_in_type = 0

        # Pre-populate with existing groups
        for v_id, v_name, v_group in vendors:
            if v_group:
                # Find other vendors in same group
                for other_id, _, other_group in vendors:
                    if other_group == v_group and other_id != v_id:
                        uf.union(v_id, other_id)

        # Compare pairs
        for i, (v1_id, v1_name, v1_group) in enumerate(vendors):
            # Limit comparisons per vendor
            compare_count = 0

            for j in range(i + 1, len(vendors)):
                if compare_count >= CONFIG['MAX_COMPARISONS']:
                    break

                v2_id, v2_name, v2_group = vendors[j]

                # Skip if already in same cluster
                if uf.find(v1_id) == uf.find(v2_id):
                    continue

                stats['pairs_checked'] += 1
                compare_count += 1

                sim = calculate_similarity(v1_name, v2_name)

                if sim >= threshold:
                    if uf.union(v1_id, v2_id):
                        merges_in_type += 1
                        stats['new_merges'] += 1

        stats['by_type'][biz_type] = {
            'vendors': len(vendors),
            'merges': merges_in_type,
        }

        if merges_in_type > 0:
            print(f"  {biz_type}: {merges_in_type} merges from {len(vendors)} vendors")

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nBusiness types processed: {stats['business_types_processed']}")
    print(f"Pairs checked: {stats['pairs_checked']:,}")
    print(f"New merges found: {stats['new_merges']}")

    print("\nMerges by business type:")
    sorted_types = sorted(
        stats['by_type'].items(),
        key=lambda x: x[1]['merges'],
        reverse=True
    )
    for biz_type, data in sorted_types[:15]:
        if data['merges'] > 0:
            print(f"  {biz_type}: {data['merges']} merges ({data['vendors']} vendors)")

    conn.close()

    print("\n" + "=" * 60)
    print("First-token clustering analysis complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    cluster_by_first_token()
