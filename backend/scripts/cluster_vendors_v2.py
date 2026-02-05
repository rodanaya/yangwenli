#!/usr/bin/env python3
"""
Integrated Multi-Signal Vendor Clustering (Version 2)

This script combines multiple matching signals for vendor deduplication:
1. RFC exact match (100% confidence)
2. Corporate group match (95% confidence)
3. Phonetic + name similarity (tiered thresholds)
4. High-confidence name-only matching (92% threshold)

Key improvements over v1:
- Tiered similarity thresholds based on context
- Multi-signal scoring
- Better individual handling
- Size limits to prevent over-merging

Usage:
    python backend/scripts/cluster_vendors_v2.py
"""

import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Try to import HYPERION similarity
try:
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "hyperion"))
    from similarity import SimilarityMetrics
    SIMILARITY = SimilarityMetrics()
    HAS_SIMILARITY = True
except ImportError:
    HAS_SIMILARITY = False
    print("Warning: HYPERION similarity not available, using basic matching")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration
CONFIG = {
    'MIN_GROUP_SIZE': 2,
    'MAX_GROUP_SIZE': 500,
    'THRESHOLDS': {
        'rfc_match': 0.70,      # Low threshold when RFC matches
        'corp_group': 0.80,     # When corporate groups match
        'phonetic': 0.88,       # When phonetic codes match (increased from 0.85)
        'name_only': 0.92,      # Name similarity alone
        'large_vendor': 0.95,   # Vendors with >100 contracts
    },
    'EXCLUDE_GENERIC_GROUPS': [
        'Various', 'Independent', 'Multiple', 'N/A', 'Unknown', None,
        'Various Mexican companies',
    ],
    # Common business types that require higher similarity (prevent over-merging)
    'GENERIC_BUSINESS_TYPES': [
        'LLANTERA', 'FARMACIA', 'RESTAURANTE', 'HOTEL', 'TALLER', 'TORTILLERIA',
        'PANADERIA', 'CARNICERIA', 'FERRETERIA', 'PAPELERIA', 'CONSULTORIO',
        'LABORATORIO', 'CLINICA', 'CONSTRUCTORA', 'TRANSPORTES', 'FUMIGACIONES',
        'LITOGRAFIA', 'LITOGRAFICA', 'IMPRENTA', 'IMPRESORA', 'BANQUETES',
        'GASTRONOMICA', 'AUTOSERVICIO', 'MUEBLERIA', 'EXCAVACIONES', 'ILUMINACION',
        'RECUBRIMIENTOS', 'BIOMEDICA', 'BIOMEDICAL', 'MOBILIARIO', 'VALVULAS',
        'MENSAJERIA', 'REACTIVOS', 'CAPITAL NEWS',
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


def calculate_similarity(name1: str, name2: str) -> float:
    """Calculate name similarity using available methods."""
    if HAS_SIMILARITY:
        # Weighted combination
        jw = SIMILARITY.jaro_winkler(name1, name2)
        token = SIMILARITY.token_set(name1, name2)
        return 0.4 * jw + 0.6 * token
    else:
        # Simple ratio fallback
        from difflib import SequenceMatcher
        return SequenceMatcher(None, name1, name2).ratio()


def should_merge(v1: dict, v2: dict) -> tuple:
    """
    Determine if two vendors should be merged.

    Returns:
        Tuple of (should_merge: bool, confidence: float, reason: str)
    """
    # Never merge if both have RFC and they differ
    if v1['rfc'] and v2['rfc']:
        if v1['rfc'] == v2['rfc']:
            return (True, 1.0, 'RFC_MATCH')
        else:
            return (False, 0.0, 'RFC_DIFFER')

    # Never merge individuals based on name alone
    if v1['is_individual'] or v2['is_individual']:
        return (False, 0.0, 'INDIVIDUAL')

    # Calculate name similarity
    name_sim = calculate_similarity(v1['normalized_name'], v2['normalized_name'])

    # Check corporate group match
    if (v1['corporate_group'] and v2['corporate_group'] and
        v1['corporate_group'] == v2['corporate_group'] and
        v1['corporate_group'] not in CONFIG['EXCLUDE_GENERIC_GROUPS']):
        if name_sim >= CONFIG['THRESHOLDS']['corp_group']:
            return (True, 0.95, 'CORP_GROUP')

    # Check phonetic match
    if v1['phonetic_code'] and v1['phonetic_code'] == v2['phonetic_code']:
        if name_sim >= CONFIG['THRESHOLDS']['phonetic']:
            return (True, 0.90, 'PHONETIC')

    # High-confidence name-only match (for companies only)
    if name_sim >= CONFIG['THRESHOLDS']['name_only']:
        # Extra caution for large vendors
        max_contracts = max(v1.get('total_contracts', 0), v2.get('total_contracts', 0))
        if max_contracts > 100:
            if name_sim >= CONFIG['THRESHOLDS']['large_vendor']:
                return (True, 0.85, 'NAME_HIGH')
        else:
            return (True, 0.85, 'NAME_HIGH')

    return (False, 0.0, 'NO_MATCH')


def cluster_vendors_v2():
    """Enhanced vendor clustering with multi-signal matching."""

    print("=" * 60)
    print("HYPERION-ATLAS: Multi-Signal Vendor Clustering v2")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print(f"Similarity module: {'HYPERION' if HAS_SIMILARITY else 'Basic'}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA journal_mode = WAL")
    cursor = conn.cursor()

    # Get statistics
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"\nTotal vendors: {total_vendors:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    with_corp = cursor.fetchone()[0]
    print(f"With corporate_group: {with_corp:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE is_individual = 0")
    companies = cursor.fetchone()[0]
    print(f"Companies: {companies:,}")

    # Clear existing groups
    print("\nClearing existing vendor groups...")
    cursor.execute("DELETE FROM vendor_aliases")
    cursor.execute("DELETE FROM vendor_groups")
    cursor.execute("UPDATE vendors SET group_id = NULL, is_canonical = NULL, match_confidence = NULL")
    conn.commit()

    # Initialize Union-Find
    uf = UnionFind()
    stats = {
        'rfc_merges': 0,
        'corp_group_merges': 0,
        'phonetic_merges': 0,
        'name_merges': 0,
        'pairs_checked': 0,
    }

    # ==================== PHASE 1: Corporate Group Clustering ====================
    print("\nPhase 1: Corporate Group Clustering...")

    cursor.execute("""
        SELECT corporate_group, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
        FROM vendors
        WHERE corporate_group IS NOT NULL
        AND corporate_group NOT IN ('Various', 'Various Mexican companies', 'Independent')
        AND is_individual = 0
        GROUP BY corporate_group
        HAVING cnt >= 2 AND cnt <= ?
    """, (CONFIG['MAX_GROUP_SIZE'],))

    corp_groups = cursor.fetchall()
    print(f"  Valid corporate groups: {len(corp_groups)}")

    for corp_group, ids_str, count in corp_groups:
        vendor_ids = [int(x) for x in ids_str.split(',')]
        first_id = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(first_id, vid)
        stats['corp_group_merges'] += count - 1

    print(f"  Corporate group merges: {stats['corp_group_merges']}")

    # ==================== PHASE 2: RFC Clustering ====================
    print("\nPhase 2: RFC Clustering...")

    cursor.execute("""
        SELECT rfc, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
        FROM vendors
        WHERE rfc IS NOT NULL AND rfc != '' AND LENGTH(rfc) >= 10
        GROUP BY rfc
        HAVING cnt >= 2
    """)

    rfc_groups = cursor.fetchall()
    for rfc, ids_str, count in rfc_groups:
        vendor_ids = [int(x) for x in ids_str.split(',')]
        first_id = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(first_id, vid)
        stats['rfc_merges'] += count - 1

    print(f"  RFC merges: {stats['rfc_merges']}")

    # ==================== PHASE 3: Phonetic + Similarity Clustering ====================
    print("\nPhase 3: Phonetic + Similarity Clustering (companies only)...")

    # Get companies grouped by phonetic code
    cursor.execute("""
        SELECT phonetic_code, GROUP_CONCAT(id || ':' || normalized_name || ':' || COALESCE(corporate_group, ''), '|||') as data
        FROM vendors
        WHERE phonetic_code IS NOT NULL
        AND is_individual = 0
        GROUP BY phonetic_code
        HAVING COUNT(*) BETWEEN 2 AND 50
    """)

    phonetic_groups = cursor.fetchall()
    print(f"  Phonetic groups to check: {len(phonetic_groups)}")

    for phonetic_code, data_str in phonetic_groups:
        vendors = []
        for item in data_str.split('|||'):
            parts = item.split(':')
            if len(parts) >= 2:
                vendors.append({
                    'id': int(parts[0]),
                    'normalized_name': parts[1],
                    'corporate_group': parts[2] if len(parts) > 2 else None,
                })

        # Compare pairs within phonetic group
        for i, v1 in enumerate(vendors):
            for v2 in vendors[i+1:]:
                stats['pairs_checked'] += 1
                sim = calculate_similarity(v1['normalized_name'], v2['normalized_name'])

                # Use higher threshold for generic business types
                threshold = CONFIG['THRESHOLDS']['phonetic']
                for biz_type in CONFIG['GENERIC_BUSINESS_TYPES']:
                    if biz_type in v1['normalized_name'] or biz_type in v2['normalized_name']:
                        threshold = 0.92  # Require higher similarity for generic types
                        break

                if sim >= threshold:
                    if uf.union(v1['id'], v2['id']):
                        stats['phonetic_merges'] += 1

    print(f"  Phonetic merges: {stats['phonetic_merges']}")
    print(f"  Pairs checked: {stats['pairs_checked']:,}")

    # ==================== PHASE 4: Name-only High-confidence Clustering ====================
    print("\nPhase 4: Name-only High-confidence Clustering...")

    cursor.execute("""
        SELECT normalized_name, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
        FROM vendors
        WHERE normalized_name IS NOT NULL
        AND is_individual = 0
        GROUP BY normalized_name
        HAVING cnt >= 2 AND cnt <= 20
    """)

    name_groups = cursor.fetchall()
    for name, ids_str, count in name_groups:
        vendor_ids = [int(x) for x in ids_str.split(',')]
        first_id = vendor_ids[0]
        for vid in vendor_ids[1:]:
            uf.union(first_id, vid)
        stats['name_merges'] += count - 1

    print(f"  Exact name merges: {stats['name_merges']}")

    # ==================== PHASE 5: Create Vendor Groups ====================
    print("\nPhase 5: Creating vendor groups...")

    clusters = uf.get_clusters()
    multi_clusters = {k: v for k, v in clusters.items() if len(v) >= 2}
    print(f"  Multi-member clusters: {len(multi_clusters)}")

    # Get vendor info for canonical selection
    cursor.execute("""
        SELECT id, name, corporate_group, total_contracts, total_amount_mxn
        FROM vendors
    """)
    vendor_info = {row[0]: {
        'name': row[1],
        'corporate_group': row[2],
        'total_contracts': row[3] or 0,
        'total_amount_mxn': row[4] or 0,
    } for row in cursor.fetchall()}

    groups_to_insert = []
    aliases_to_insert = []
    vendor_updates = []

    for group_id, (cluster_root, member_ids) in enumerate(multi_clusters.items(), 1):
        members = [(vid, vendor_info.get(vid, {})) for vid in member_ids]
        members.sort(key=lambda x: (x[1].get('total_contracts', 0), x[1].get('total_amount_mxn', 0)), reverse=True)

        canonical_id = members[0][0]
        canonical_info = members[0][1]

        # Get corporate group
        corp_group = None
        for vid, info in members:
            if info.get('corporate_group'):
                corp_group = info['corporate_group']
                break

        groups_to_insert.append((
            group_id,
            canonical_info.get('name', ''),
            corp_group,
            len(member_ids),
            sum(m[1].get('total_contracts', 0) for m in members),
            sum(m[1].get('total_amount_mxn', 0) for m in members),
        ))

        for vid, info in members:
            is_canonical = 1 if vid == canonical_id else 0
            aliases_to_insert.append((group_id, vid, is_canonical, 0.90))
            vendor_updates.append((group_id, is_canonical, 0.90, vid))

    # Batch insert
    print(f"  Inserting {len(groups_to_insert)} vendor groups...")
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

    cursor.execute("""
        SELECT canonical_name, corporate_group, member_count
        FROM vendor_groups
        ORDER BY member_count DESC
        LIMIT 15
    """)
    largest = cursor.fetchall()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nVendor groups created: {final_groups:,}")
    print(f"Vendors in groups: {final_grouped:,} ({100*final_grouped/total_vendors:.1f}%)")
    print(f"Deduplication rate: {100*(final_grouped - final_groups)/total_vendors:.2f}%")

    print(f"\nMerge breakdown:")
    print(f"  Corporate group: {stats['corp_group_merges']}")
    print(f"  RFC match: {stats['rfc_merges']}")
    print(f"  Phonetic similarity: {stats['phonetic_merges']}")
    print(f"  Exact name: {stats['name_merges']}")

    print("\nLargest clusters:")
    for name, corp, count in largest:
        corp_str = f" [{corp}]" if corp else ""
        print(f"  {count:5d}: {name[:45]}{corp_str}")

    conn.close()

    print("\n" + "=" * 60)
    print("Multi-signal clustering complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    cluster_vendors_v2()
