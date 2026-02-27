"""
HYPERION-PROMETHEUS: Vendor Clustering

Clusters detected duplicate vendors into groups using:
1. Union-Find for connected component detection
2. RFC-based exact matches (highest priority)
3. Name-based matches (high confidence)
4. Phonetic matches (medium confidence)

Usage:
    python -m scripts.cluster_vendors [--dry-run]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hyperion.similarity import SimilarityMetrics

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


class UnionFind:
    """Union-Find (Disjoint Set) data structure for clustering."""

    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, x):
        """Find the root of x with path compression."""
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
            return x

        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        """Union two sets by rank."""
        px, py = self.find(x), self.find(y)
        if px == py:
            return False

        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True

    def get_groups(self):
        """Get all groups as dict {root: [members]}."""
        groups = defaultdict(list)
        for x in self.parent:
            groups[self.find(x)].append(x)
        return dict(groups)


def find_rfc_clusters(conn: sqlite3.Connection) -> list[tuple]:
    """Find vendor clusters based on RFC."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT rfc, GROUP_CONCAT(id) as vendor_ids
        FROM vendors
        WHERE rfc IS NOT NULL AND rfc != '' AND LENGTH(rfc) >= 12
        GROUP BY rfc
        HAVING COUNT(*) > 1
    """)

    clusters = []
    for row in cursor.fetchall():
        rfc, ids_str = row
        vendor_ids = [int(x) for x in ids_str.split(',')]
        clusters.append(('RFC_EXACT', rfc, vendor_ids, 1.0))

    return clusters


def find_name_clusters(conn: sqlite3.Connection) -> list[tuple]:
    """Find vendor clusters based on exact normalized name + suffix."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            base_name,
            legal_suffix,
            GROUP_CONCAT(id) as vendor_ids,
            GROUP_CONCAT(COALESCE(rfc, '')) as rfcs
        FROM vendors
        WHERE base_name IS NOT NULL AND base_name != ''
        GROUP BY base_name, legal_suffix
        HAVING COUNT(*) > 1
    """)

    clusters = []
    for row in cursor.fetchall():
        base_name, suffix, ids_str, rfcs_str = row
        vendor_ids = [int(x) for x in ids_str.split(',')]
        rfcs = [r for r in rfcs_str.split(',') if r]

        # Skip if multiple different RFCs
        if len(set(rfcs)) > 1:
            continue

        key = f"{base_name}|{suffix or ''}"
        clusters.append(('NAME_EXACT', key, vendor_ids, 0.95))

    return clusters


def find_phonetic_clusters(
    conn: sqlite3.Connection,
    threshold: float = 0.80  # Lowered from 0.85 to enable WALMART grouping
) -> list[tuple]:
    """Find vendor clusters based on phonetic similarity."""
    cursor = conn.cursor()
    metrics = SimilarityMetrics()

    cursor.execute("""
        SELECT phonetic_code, COUNT(*) as cnt
        FROM vendors
        WHERE phonetic_code IS NOT NULL AND phonetic_code != ''
        AND is_individual = 0
        GROUP BY phonetic_code
        HAVING cnt >= 2 AND cnt <= 100
        ORDER BY cnt DESC
    """)

    phonetic_groups = cursor.fetchall()
    clusters = []

    for phonetic_code, cnt in phonetic_groups:
        cursor.execute("""
            SELECT id, name, base_name, legal_suffix, rfc
            FROM vendors
            WHERE phonetic_code = ?
        """, (phonetic_code,))

        vendors = cursor.fetchall()

        # Compare pairs and find matches
        for i, v1 in enumerate(vendors):
            for v2 in vendors[i + 1:]:
                id1, name1, base1, suffix1, rfc1 = v1
                id2, name2, base2, suffix2, rfc2 = v2

                # Skip if different RFCs
                if rfc1 and rfc2 and rfc1 != rfc2:
                    continue

                # Calculate similarity
                if base1 and base2:
                    sim = metrics.hybrid_score(base1, base2)
                    if sim >= threshold:
                        clusters.append(('PHONETIC', phonetic_code, [id1, id2], sim))

    return clusters


def select_canonical(vendors: list[dict]) -> dict:
    """Select the canonical vendor from a group."""
    # Priority:
    # 1. Has RFC
    # 2. Highest total_contracts
    # 3. Most recent last_contract_date
    # 4. Longest name (most complete)

    def score(v):
        return (
            1 if v.get('rfc') else 0,
            v.get('total_contracts') or 0,
            v.get('last_contract_date') or '',
            len(v.get('name') or '')
        )

    return max(vendors, key=score)


def create_vendor_groups(
    conn: sqlite3.Connection,
    clusters: list[tuple],
    dry_run: bool = False
) -> int:
    """Create vendor groups from clusters."""
    cursor = conn.cursor()

    # Build Union-Find from all clusters
    uf = UnionFind()
    cluster_info = {}  # vendor_id -> best (method, confidence)

    for method, key, vendor_ids, confidence in clusters:
        # Union all vendors in this cluster
        root = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(root, vid)

        # Track best method/confidence per vendor
        for vid in vendor_ids:
            if vid not in cluster_info or cluster_info[vid][1] < confidence:
                cluster_info[vid] = (method, confidence)

    # Get final groups
    groups = uf.get_groups()
    print(f"  Created {len(groups)} groups from {len(cluster_info)} vendors")

    if dry_run:
        print("  DRY RUN - no changes made")
        return len(groups)

    # Process each group
    groups_created = 0
    for root_id, member_ids in groups.items():
        if len(member_ids) < 2:
            continue

        # Get vendor details
        placeholders = ','.join(['?'] * len(member_ids))
        cursor.execute(f"""
            SELECT id, name, rfc, base_name, legal_suffix, is_individual,
                   total_contracts, total_amount_mxn, last_contract_date
            FROM vendors
            WHERE id IN ({placeholders})
        """, member_ids)

        vendors = [dict(zip(
            ['id', 'name', 'rfc', 'base_name', 'legal_suffix', 'is_individual',
             'total_contracts', 'total_amount_mxn', 'last_contract_date'],
            row
        )) for row in cursor.fetchall()]

        # Select canonical vendor
        canonical = select_canonical(vendors)
        method = cluster_info.get(canonical['id'], ('UNKNOWN', 0.5))[0]

        # Aggregate stats
        total_contracts = sum(v.get('total_contracts') or 0 for v in vendors)
        total_value = sum(v.get('total_amount_mxn') or 0 for v in vendors)

        # Create group
        cursor.execute("""
            INSERT INTO vendor_groups (
                canonical_name, canonical_rfc, canonical_vendor_id,
                member_count, total_contracts, total_value,
                is_individual, legal_suffix, match_method, confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            canonical.get('base_name') or canonical['name'],
            canonical.get('rfc'),
            canonical['id'],
            len(vendors),
            total_contracts,
            total_value,
            canonical.get('is_individual', 0),
            canonical.get('legal_suffix'),
            method,
            cluster_info.get(canonical['id'], ('UNKNOWN', 0.5))[1]
        ))

        group_id = cursor.lastrowid

        # Create aliases for all members
        for v in vendors:
            is_canon = 1 if v['id'] == canonical['id'] else 0
            v_method = cluster_info.get(v['id'], ('UNKNOWN', 0.5))[0]
            v_conf = cluster_info.get(v['id'], ('UNKNOWN', 0.5))[1]

            cursor.execute("""
                INSERT INTO vendor_aliases (
                    group_id, vendor_id, alias_name, alias_rfc,
                    match_type, similarity_score, is_canonical
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                group_id, v['id'], v['name'], v.get('rfc'),
                v_method, v_conf, is_canon
            ))

            # Update vendor record
            cursor.execute("""
                UPDATE vendors
                SET group_id = ?, is_canonical = ?, match_confidence = ?
                WHERE id = ?
            """, (group_id, is_canon, v_conf, v['id']))

        groups_created += 1

        # Commit every 1000 groups
        if groups_created % 1000 == 0:
            conn.commit()
            print(f"    Processed {groups_created} groups...")

    conn.commit()
    return groups_created


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='HYPERION-PROMETHEUS Vendor Clustering'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--threshold',
        type=float,
        default=0.85,
        help='Similarity threshold for phonetic matches'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("HYPERION-PROMETHEUS: Vendor Clustering")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Dry run: {args.dry_run}")

    # Clear existing groups if not dry run
    if not args.dry_run:
        cursor = conn.cursor()
        print("\nClearing existing vendor groups...")
        cursor.execute("DELETE FROM vendor_aliases")
        cursor.execute("DELETE FROM vendor_groups")
        cursor.execute("DELETE FROM vendor_merges")
        cursor.execute("UPDATE vendors SET group_id = NULL, is_canonical = 0, match_confidence = NULL")
        conn.commit()

    # Find clusters
    print("\nFinding RFC-based clusters...")
    rfc_clusters = find_rfc_clusters(conn)
    print(f"  Found {len(rfc_clusters)} RFC clusters")

    print("\nFinding name-based clusters...")
    name_clusters = find_name_clusters(conn)
    print(f"  Found {len(name_clusters)} name clusters")

    print(f"\nFinding phonetic clusters (threshold={args.threshold})...")
    phonetic_clusters = find_phonetic_clusters(conn, args.threshold)
    print(f"  Found {len(phonetic_clusters)} phonetic clusters")

    # Combine all clusters
    all_clusters = rfc_clusters + name_clusters + phonetic_clusters
    print(f"\nTotal clusters to process: {len(all_clusters)}")

    # Create groups
    print("\nCreating vendor groups...")
    groups_created = create_vendor_groups(conn, all_clusters, args.dry_run)

    # Summary
    print("\n" + "=" * 60)
    print("Clustering Summary:")
    print("=" * 60)

    if not args.dry_run:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM vendor_groups")
        group_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM vendor_aliases")
        alias_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM vendors WHERE group_id IS NOT NULL")
        grouped_vendors = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM vendors WHERE is_canonical = 1")
        canonical_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM vendors")
        total_vendors = cursor.fetchone()[0]

        print(f"  Vendor groups created:    {group_count:,}")
        print(f"  Vendor aliases created:   {alias_count:,}")
        print(f"  Vendors grouped:          {grouped_vendors:,} / {total_vendors:,} ({100*grouped_vendors/total_vendors:.1f}%)")
        print(f"  Canonical vendors:        {canonical_count:,}")
        print(f"  Estimated duplicates:     {grouped_vendors - canonical_count:,}")
    else:
        print(f"  Would create ~{groups_created} vendor groups")

    conn.close()

    print("\n" + "=" * 60)
    print("HYPERION-PROMETHEUS clustering complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
