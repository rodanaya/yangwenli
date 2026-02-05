#!/usr/bin/env python3
"""
HYPERION-ATLAS: Transitive Clustering

Phase 3 improvement (3F): Find and merge vendor chains where:
- A is 90% similar to B
- B is 90% similar to C
- A and C are only 80% similar (below threshold)
- But A, B, C should all be in the same cluster!

This script finds these chains and merges them using Union-Find
with transitive closure.

Usage:
    python backend/scripts/transitive_merge.py
"""

import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime
from itertools import combinations

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
    'SIMILARITY_THRESHOLD': 0.85,  # Threshold for chain links
    'MAX_CHAIN_LENGTH': 5,         # Maximum chain length to consider
    'MAX_CLUSTER_SIZE': 100,       # Don't expand clusters beyond this
    'SAMPLE_SIZE': 50000,          # Number of vendor pairs to analyze
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

    def get_clusters(self):
        clusters = defaultdict(set)
        for x in self.parent:
            clusters[self.find(x)].add(x)
        return clusters


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


def find_transitive_clusters():
    """Find and report transitive clustering opportunities."""

    print("=" * 60)
    print("HYPERION-ATLAS: Transitive Clustering Analysis")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Get vendors that are already in groups but might have chain connections
    cursor.execute("""
        SELECT v.id, v.normalized_name, v.group_id, vg.member_count
        FROM vendors v
        LEFT JOIN vendor_groups vg ON v.group_id = vg.id
        WHERE v.is_individual = 0
        AND v.normalized_name IS NOT NULL
        AND v.phonetic_code IS NOT NULL
        ORDER BY v.total_amount_mxn DESC
        LIMIT ?
    """, (CONFIG['SAMPLE_SIZE'],))

    vendors = cursor.fetchall()
    print(f"\nVendors to analyze: {len(vendors):,}")

    # Build similarity graph for vendors sharing phonetic codes
    print("\nBuilding similarity graph...")

    # Group by phonetic code for blocking
    phonetic_groups = defaultdict(list)
    for v_id, v_name, v_group, member_count in vendors:
        # Get phonetic code
        cursor.execute("SELECT phonetic_code FROM vendors WHERE id = ?", (v_id,))
        row = cursor.fetchone()
        if row and row[0]:
            phonetic_groups[row[0]].append((v_id, v_name, v_group))

    # Find all pairs above threshold within phonetic groups
    edges = []  # (v1_id, v2_id, similarity)
    pairs_checked = 0

    print(f"  Phonetic groups: {len(phonetic_groups)}")

    for phonetic_code, group_vendors in phonetic_groups.items():
        if len(group_vendors) < 2 or len(group_vendors) > 200:
            continue

        for i, (v1_id, v1_name, v1_group) in enumerate(group_vendors):
            for v2_id, v2_name, v2_group in group_vendors[i + 1:]:
                pairs_checked += 1

                # Skip if already in same group
                if v1_group and v1_group == v2_group:
                    continue

                sim = calculate_similarity(v1_name, v2_name)

                if sim >= CONFIG['SIMILARITY_THRESHOLD']:
                    edges.append((v1_id, v2_id, sim))

    print(f"  Pairs checked: {pairs_checked:,}")
    print(f"  Edges found: {len(edges):,}")

    # Build Union-Find from edges
    uf = UnionFind()
    for v1_id, v2_id, sim in edges:
        uf.union(v1_id, v2_id)

    # Analyze clusters
    clusters = uf.get_clusters()
    multi_clusters = {k: v for k, v in clusters.items() if len(v) >= 2}

    print(f"\nTransitive clusters found: {len(multi_clusters)}")

    # Find clusters that span existing groups (merge opportunities)
    cross_group_clusters = []

    for cluster_root, member_ids in multi_clusters.items():
        # Get group info for members
        member_list = list(member_ids)
        placeholders = ','.join(['?' for _ in member_list])

        cursor.execute(f"""
            SELECT id, normalized_name, group_id
            FROM vendors
            WHERE id IN ({placeholders})
        """, member_list)

        members = cursor.fetchall()
        groups_in_cluster = set(m[2] for m in members if m[2])

        # If cluster spans multiple existing groups, it's a merge opportunity
        if len(groups_in_cluster) > 1:
            cross_group_clusters.append({
                'members': members,
                'existing_groups': len(groups_in_cluster),
            })
        elif len(groups_in_cluster) == 0 and len(members) >= 2:
            # All ungrouped - new clustering opportunity
            cross_group_clusters.append({
                'members': members,
                'existing_groups': 0,
            })

    # Summary
    print("\n" + "=" * 60)
    print("TRANSITIVE MERGE OPPORTUNITIES")
    print("=" * 60)

    print(f"\nClusters spanning multiple existing groups: {len([c for c in cross_group_clusters if c['existing_groups'] > 1])}")
    print(f"New clusters from ungrouped vendors: {len([c for c in cross_group_clusters if c['existing_groups'] == 0])}")

    # Show examples
    print("\nExample merge opportunities:")
    for i, cluster in enumerate(cross_group_clusters[:10], 1):
        print(f"\n{i}. Cluster with {len(cluster['members'])} vendors " +
              f"(spans {cluster['existing_groups']} existing groups):")
        for v_id, v_name, v_group in cluster['members'][:5]:
            group_str = f" [group {v_group}]" if v_group else " [ungrouped]"
            print(f"   - {v_name[:45]}{group_str}")

    conn.close()

    print("\n" + "=" * 60)
    print("Transitive analysis complete!")
    print("=" * 60)

    return {
        'edges': len(edges),
        'clusters': len(multi_clusters),
        'cross_group_opportunities': len(cross_group_clusters),
    }


if __name__ == "__main__":
    find_transitive_clusters()
