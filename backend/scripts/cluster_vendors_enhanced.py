#!/usr/bin/env python3
"""
Enhanced Vendor Clustering with Corporate Groups

This script improves vendor deduplication by:
1. Using verified corporate group data as primary grouping criterion
2. Adding RFC-based matching
3. Using name similarity for companies only (not individuals)
4. Preventing over-merging of common individual names

Usage:
    python backend/scripts/cluster_vendors_enhanced.py
"""

import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration
CONFIG = {
    'MIN_CORP_GROUP_SIZE': 2,      # Minimum vendors to form a corporate group cluster
    'MAX_CORP_GROUP_SIZE': 500,    # Max size for a corporate group (prevent over-merging)
    'SIMILARITY_THRESHOLD': 0.92,  # For fuzzy name matching
    'EXCLUDE_GENERIC_GROUPS': [    # Corporate groups that are too generic
        'Various', 'Independent', 'Multiple', 'N/A', 'Unknown', None
    ]
}


class UnionFind:
    """Union-Find (Disjoint Set) data structure for clustering."""

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


def cluster_vendors_enhanced():
    """Enhanced vendor clustering using corporate groups and smart matching."""

    print("=" * 60)
    print("HYPERION-ATLAS: Enhanced Vendor Clustering")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA journal_mode = WAL")
    cursor = conn.cursor()

    # Get statistics before
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"\nTotal vendors: {total_vendors:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    with_corp_group = cursor.fetchone()[0]
    print(f"Vendors with corporate_group: {with_corp_group:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE rfc IS NOT NULL AND rfc != ''")
    with_rfc = cursor.fetchone()[0]
    print(f"Vendors with RFC: {with_rfc:,}")

    # Clear existing vendor groups
    print("\nClearing existing vendor groups...")
    cursor.execute("DELETE FROM vendor_aliases")
    cursor.execute("DELETE FROM vendor_groups")
    cursor.execute("UPDATE vendors SET group_id = NULL, is_canonical = NULL, match_confidence = NULL")
    conn.commit()

    # Initialize Union-Find
    uf = UnionFind()
    stats = {
        'corp_group_clusters': 0,
        'rfc_clusters': 0,
        'name_clusters_companies': 0,
        'vendors_clustered': 0
    }

    # ==================== PHASE 1: Corporate Group Clustering ====================
    print("\nPhase 1: Clustering by Corporate Group...")

    cursor.execute("""
        SELECT corporate_group, COUNT(*) as cnt
        FROM vendors
        WHERE corporate_group IS NOT NULL
        AND corporate_group NOT IN ('Various', 'Independent', 'Multiple', 'N/A', 'Unknown')
        GROUP BY corporate_group
        HAVING cnt >= ? AND cnt <= ?
    """, (CONFIG['MIN_CORP_GROUP_SIZE'], CONFIG['MAX_CORP_GROUP_SIZE']))

    valid_corp_groups = cursor.fetchall()
    print(f"  Valid corporate groups: {len(valid_corp_groups)}")

    for corp_group, count in valid_corp_groups:
        cursor.execute("""
            SELECT id FROM vendors WHERE corporate_group = ?
        """, (corp_group,))
        vendor_ids = [row[0] for row in cursor.fetchall()]

        if len(vendor_ids) >= 2:
            # Union all vendors in this corporate group
            first_id = vendor_ids[0]
            for vid in vendor_ids[1:]:
                uf.union(first_id, vid)
            stats['corp_group_clusters'] += 1

    print(f"  Corporate group clusters created: {stats['corp_group_clusters']}")

    # ==================== PHASE 2: RFC-based Clustering ====================
    print("\nPhase 2: Clustering by RFC (exact match)...")

    cursor.execute("""
        SELECT rfc, GROUP_CONCAT(id) as vendor_ids, COUNT(*) as cnt
        FROM vendors
        WHERE rfc IS NOT NULL AND rfc != '' AND LENGTH(rfc) >= 10
        GROUP BY rfc
        HAVING cnt >= 2
    """)

    rfc_groups = cursor.fetchall()
    for rfc, vendor_ids_str, count in rfc_groups:
        vendor_ids = [int(x) for x in vendor_ids_str.split(',')]
        first_id = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(first_id, vid)
        stats['rfc_clusters'] += 1

    print(f"  RFC clusters created: {stats['rfc_clusters']}")

    # ==================== PHASE 3: Name-based Clustering (Companies Only) ====================
    print("\nPhase 3: Clustering by normalized name (companies only)...")

    cursor.execute("""
        SELECT normalized_name, GROUP_CONCAT(id) as vendor_ids, COUNT(*) as cnt
        FROM vendors
        WHERE normalized_name IS NOT NULL
        AND is_individual = 0
        GROUP BY normalized_name
        HAVING cnt >= 2 AND cnt <= 50
    """)

    name_groups = cursor.fetchall()
    for name, vendor_ids_str, count in name_groups:
        vendor_ids = [int(x) for x in vendor_ids_str.split(',')]
        first_id = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(first_id, vid)
        stats['name_clusters_companies'] += 1

    print(f"  Company name clusters created: {stats['name_clusters_companies']}")

    # ==================== PHASE 4: Create Vendor Groups ====================
    print("\nPhase 4: Creating vendor groups from clusters...")

    clusters = uf.get_clusters()
    multi_member_clusters = {k: v for k, v in clusters.items() if len(v) >= 2}
    print(f"  Multi-member clusters: {len(multi_member_clusters)}")

    # Get vendor info for canonical selection
    cursor.execute("""
        SELECT id, name, corporate_group, total_contracts, total_amount_mxn
        FROM vendors
    """)
    vendor_info = {row[0]: {
        'name': row[1],
        'corporate_group': row[2],
        'total_contracts': row[3] or 0,
        'total_amount_mxn': row[4] or 0
    } for row in cursor.fetchall()}

    group_id = 0
    aliases_to_insert = []
    groups_to_insert = []
    vendor_updates = []

    for cluster_root, member_ids in multi_member_clusters.items():
        group_id += 1

        # Select canonical vendor (highest contract count)
        members = [(vid, vendor_info.get(vid, {})) for vid in member_ids]
        members.sort(key=lambda x: (x[1].get('total_contracts', 0), x[1].get('total_amount_mxn', 0)), reverse=True)
        canonical_id = members[0][0]
        canonical_info = members[0][1]

        # Get corporate group if any
        corp_group = None
        for vid, info in members:
            if info.get('corporate_group'):
                corp_group = info['corporate_group']
                break

        # Insert vendor group
        groups_to_insert.append((
            group_id,
            canonical_info.get('name', ''),
            corp_group,
            len(member_ids),
            sum(m[1].get('total_contracts', 0) for m in members),
            sum(m[1].get('total_amount_mxn', 0) for m in members)
        ))

        # Insert aliases and update vendors
        for vid, info in members:
            is_canonical = 1 if vid == canonical_id else 0
            aliases_to_insert.append((group_id, vid, is_canonical, 1.0))
            vendor_updates.append((group_id, is_canonical, 1.0, vid))

        stats['vendors_clustered'] += len(member_ids)

    # Batch insert
    print(f"\n  Inserting {len(groups_to_insert)} vendor groups...")
    cursor.executemany("""
        INSERT INTO vendor_groups (id, canonical_name, corporate_group, member_count, total_contracts, total_value)
        VALUES (?, ?, ?, ?, ?, ?)
    """, groups_to_insert)

    print(f"  Inserting {len(aliases_to_insert)} vendor aliases...")
    cursor.executemany("""
        INSERT INTO vendor_aliases (group_id, vendor_id, is_canonical, similarity_score)
        VALUES (?, ?, ?, ?)
    """, aliases_to_insert)

    print(f"  Updating {len(vendor_updates)} vendor records...")
    cursor.executemany("""
        UPDATE vendors SET group_id = ?, is_canonical = ?, match_confidence = ?
        WHERE id = ?
    """, vendor_updates)

    conn.commit()

    # ==================== Summary ====================
    cursor.execute("SELECT COUNT(*) FROM vendor_groups")
    final_groups = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT vendor_id) FROM vendor_aliases")
    final_grouped = cursor.fetchone()[0]

    # Check largest clusters
    cursor.execute("""
        SELECT vg.canonical_name, vg.corporate_group, vg.member_count
        FROM vendor_groups vg
        ORDER BY vg.member_count DESC
        LIMIT 15
    """)
    largest = cursor.fetchall()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nVendor groups created: {final_groups:,}")
    print(f"Vendors in groups: {final_grouped:,} ({100*final_grouped/total_vendors:.1f}%)")
    print(f"Deduplication rate: {100*(final_grouped - final_groups)/total_vendors:.1f}%")

    print(f"\nCluster breakdown:")
    print(f"  Corporate group clusters: {stats['corp_group_clusters']}")
    print(f"  RFC clusters: {stats['rfc_clusters']}")
    print(f"  Company name clusters: {stats['name_clusters_companies']}")

    print("\nLargest clusters (check for over-merging):")
    for name, corp_group, count in largest:
        corp_str = f" [{corp_group}]" if corp_group else ""
        print(f"  {count:5d}: {name[:50]}{corp_str}")

    conn.close()

    print("\n" + "=" * 60)
    print("Enhanced clustering complete!")
    print("=" * 60)


if __name__ == "__main__":
    cluster_vendors_enhanced()
