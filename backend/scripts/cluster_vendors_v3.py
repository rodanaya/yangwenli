#!/usr/bin/env python3
"""
HYPERION-ATLAS: Enhanced Multi-Signal Vendor Clustering v3

Phase 3 improvements over v2:
1. Enhanced 6-metric similarity scoring
2. Transitive clustering via Union-Find
3. First-token clustering for business type grouping
4. Multi-token phonetic matching
5. Lower thresholds for phonetic/corporate group matches

Target: Increase from 3.2% to 15-20% deduplication rate

Usage:
    python backend/scripts/cluster_vendors_v3.py
"""

import sqlite3
import json
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
    print("Warning: HYPERION similarity not available, using basic matching")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration - Phase 3 tuned thresholds
CONFIG = {
    'MIN_GROUP_SIZE': 2,
    'MAX_GROUP_SIZE': 500,
    'THRESHOLDS': {
        'rfc_match': 0.60,        # Very low when RFC matches
        'corp_group': 0.75,       # Lower when corporate groups match
        'phonetic': 0.92,         # High to prevent false positives (was 0.88)
        'first_token': 0.92,      # High for remainder comparison
        'name_only': 0.92,        # High-confidence name-only
        'large_vendor': 0.95,     # Vendors with >100 contracts
    },
    # Business types for first-token clustering
    'BUSINESS_TYPES': [
        'GRUPO', 'CONSTRUCTORA', 'COMERCIALIZADORA', 'CONSTRUCCIONES',
        'SERVICIOS', 'DISTRIBUIDORA', 'PROVEEDORA', 'CONSULTORES',
        'INGENIERIA', 'PROYECTOS', 'SUMINISTROS', 'ABASTECEDORA',
        'PROMOTORA', 'INDUSTRIAL', 'INMOBILIARIA', 'TRANSPORTES',
    ],
    # Generic types requiring higher similarity
    'GENERIC_BUSINESS_TYPES': [
        'LLANTERA', 'FARMACIA', 'RESTAURANTE', 'HOTEL', 'TALLER',
        'TORTILLERIA', 'PANADERIA', 'CARNICERIA', 'FERRETERIA',
        'PAPELERIA', 'CONSULTORIO', 'LABORATORIO', 'CLINICA',
        'FUMIGACIONES', 'LITOGRAFIA', 'IMPRENTA', 'BANQUETES',
    ],
    'EXCLUDE_GENERIC_GROUPS': [
        'Various', 'Independent', 'Multiple', 'N/A', 'Unknown', None,
        'Various Mexican companies',
    ],
}


class UnionFind:
    """Union-Find (Disjoint Set) with path compression and rank."""

    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, x):
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        # Union by rank
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


def calculate_similarity_v3(name1: str, name2: str) -> float:
    """
    Enhanced 6-metric similarity scoring for Phase 3.

    Uses weighted combination of:
    - Jaro-Winkler (25%): Good for prefix/typo matching
    - Token Set (25%): Good for word reordering
    - Token Sort (15%): Handles sorted token comparison
    - Partial Ratio (15%): Good for abbreviations
    - Levenshtein (20%): Good for OCR/typo errors
    """
    if not HAS_SIMILARITY:
        from difflib import SequenceMatcher
        return SequenceMatcher(None, name1, name2).ratio()

    if not name1 or not name2:
        return 0.0

    # Calculate all metrics
    jw = SIMILARITY.jaro_winkler(name1, name2)
    token_set = SIMILARITY.token_set(name1, name2)
    token_sort = SIMILARITY.token_sort(name1, name2)
    partial = SIMILARITY.partial_ratio(name1, name2)
    levenshtein = SIMILARITY.levenshtein_ratio(name1, name2)

    # Weighted combination
    return (0.25 * jw +
            0.25 * token_set +
            0.15 * token_sort +
            0.15 * partial +
            0.20 * levenshtein)


def is_generic_type(name: str) -> bool:
    """Check if name contains generic business type requiring higher threshold."""
    name_upper = name.upper()
    for biz_type in CONFIG['GENERIC_BUSINESS_TYPES']:
        if biz_type in name_upper:
            return True
    return False


def get_threshold(context: str, name1: str = '', name2: str = '') -> float:
    """Get similarity threshold based on context and name characteristics."""
    base_threshold = CONFIG['THRESHOLDS'].get(context, 0.90)

    # Increase threshold for generic business types
    if name1 and name2:
        if is_generic_type(name1) or is_generic_type(name2):
            return min(0.95, base_threshold + 0.05)

    return base_threshold


def cluster_vendors_v3():
    """Enhanced vendor clustering with Phase 3 improvements."""

    print("=" * 70)
    print("HYPERION-ATLAS: Enhanced Multi-Signal Vendor Clustering v3")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print(f"Similarity module: {'HYPERION 6-metric' if HAS_SIMILARITY else 'Basic'}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA journal_mode = WAL")
    cursor = conn.cursor()

    # Get statistics
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"\nTotal vendors: {total_vendors:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE is_individual = 0")
    companies = cursor.fetchone()[0]
    print(f"Companies (non-individual): {companies:,}")

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
        'first_token_merges': 0,
        'name_exact_merges': 0,
        'name_similar_merges': 0,
        'pairs_checked': 0,
    }

    # Load RFC data for conflict prevention (used in all phases)
    # RFC format: 12-13 characters, starts with letters
    cursor.execute("""
        SELECT id, rfc FROM vendors
        WHERE rfc IS NOT NULL
        AND LENGTH(rfc) >= 10
        AND rfc GLOB '[A-Z&]*'
        AND rfc NOT GLOB '*[.]*'
    """)
    vendor_rfcs = {row[0]: row[1] for row in cursor.fetchall()}

    # ==================== PHASE 1: RFC Clustering ====================
    print("\nPhase 1: RFC Clustering...")

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

    # ==================== PHASE 2: Corporate Group Clustering (RFC-aware) ====================
    print("\nPhase 2: Corporate Group Clustering (RFC-aware)...")

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
    rfc_conflicts_corp = 0
    for corp_group, ids_str, count in corp_groups:
        vendor_ids = [int(x) for x in ids_str.split(',')]
        # Build RFC-aware clusters within corporate group
        for i, vid1 in enumerate(vendor_ids):
            for vid2 in vendor_ids[i + 1:]:
                # Check RFC conflict before merging
                rfc1 = vendor_rfcs.get(vid1)
                rfc2 = vendor_rfcs.get(vid2)
                if rfc1 and rfc2 and rfc1 != rfc2:
                    rfc_conflicts_corp += 1
                    continue
                if uf.union(vid1, vid2):
                    stats['corp_group_merges'] += 1

    print(f"  Corporate group merges: {stats['corp_group_merges']}")
    print(f"  RFC conflicts prevented: {rfc_conflicts_corp}")

    # ==================== PHASE 3: Exact Name Clustering (RFC-aware) ====================
    print("\nPhase 3: Exact Name Clustering (RFC-aware)...")

    cursor.execute("""
        SELECT normalized_name, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
        FROM vendors
        WHERE normalized_name IS NOT NULL
        AND is_individual = 0
        GROUP BY normalized_name
        HAVING cnt >= 2 AND cnt <= 50
    """)

    name_groups = cursor.fetchall()
    rfc_conflicts_name = 0
    for name, ids_str, count in name_groups:
        vendor_ids = [int(x) for x in ids_str.split(',')]
        # Build RFC-aware clusters within name group
        for i, vid1 in enumerate(vendor_ids):
            for vid2 in vendor_ids[i + 1:]:
                # Check RFC conflict before merging
                rfc1 = vendor_rfcs.get(vid1)
                rfc2 = vendor_rfcs.get(vid2)
                if rfc1 and rfc2 and rfc1 != rfc2:
                    rfc_conflicts_name += 1
                    continue
                if uf.union(vid1, vid2):
                    stats['name_exact_merges'] += 1

    print(f"  Exact name merges: {stats['name_exact_merges']}")
    print(f"  RFC conflicts prevented: {rfc_conflicts_name}")

    # ==================== PHASE 4: First-Token Clustering (NEW - Fixed) ====================
    # NOTE: Original approach over-merged because business type word dominates similarity.
    # FIX: Compare REMAINDER of name (after first token) with higher threshold.
    print("\nPhase 4: First-Token Business Type Clustering (Fixed)...")

    for biz_type in CONFIG['BUSINESS_TYPES']:
        cursor.execute("""
            SELECT id, normalized_name
            FROM vendors
            WHERE normalized_name LIKE ? || ' %'
            AND is_individual = 0
            AND LENGTH(normalized_name) > ?
        """, (biz_type, len(biz_type) + 5))  # Require more than just business type

        vendors = cursor.fetchall()
        if len(vendors) < 2 or len(vendors) > 5000:
            continue

        # Extract remainder (name after first token) for comparison
        vendors_with_remainder = []
        for v_id, v_name in vendors:
            tokens = v_name.split()
            if len(tokens) >= 2:
                # Remove first token (business type) and compare remainder
                remainder = ' '.join(tokens[1:])
                # Also remove common legal suffixes for cleaner comparison
                for suffix in ['SA DE CV', 'S DE RL DE CV', 'SA', 'SC']:
                    if remainder.endswith(suffix):
                        remainder = remainder[:-len(suffix)].strip()
                if len(remainder) >= 5:  # Ensure meaningful remainder
                    vendors_with_remainder.append((v_id, v_name, remainder))

        if len(vendors_with_remainder) < 2:
            continue

        merged_in_group = 0

        for i in range(len(vendors_with_remainder)):
            for j in range(i + 1, min(i + 50, len(vendors_with_remainder))):
                v1_id, v1_name, v1_remainder = vendors_with_remainder[i]
                v2_id, v2_name, v2_remainder = vendors_with_remainder[j]

                # Skip if already in same cluster
                if uf.find(v1_id) == uf.find(v2_id):
                    continue

                # RFC conflict check
                rfc1 = vendor_rfcs.get(v1_id)
                rfc2 = vendor_rfcs.get(v2_id)
                if rfc1 and rfc2 and rfc1 != rfc2:
                    continue

                stats['pairs_checked'] += 1

                # Compare REMAINDERS with HIGH threshold (0.92)
                # This prevents "CONSTRUCTORA CAYRE" matching "CONSTRUCTORA GUSA"
                sim = calculate_similarity_v3(v1_remainder, v2_remainder)

                if sim >= 0.92:  # High threshold for remainder comparison
                    if uf.union(v1_id, v2_id):
                        stats['first_token_merges'] += 1
                        merged_in_group += 1

        if merged_in_group > 0:
            print(f"  {biz_type}: {merged_in_group} merges from {len(vendors_with_remainder)} vendors")

    print(f"  First-token merges total: {stats['first_token_merges']}")

    # ==================== PHASE 5: Phonetic Clustering (RFC-aware) ====================
    print("\nPhase 5: Phonetic + Similarity Clustering (RFC-aware)...")
    print(f"  Vendors with valid RFC: {len(vendor_rfcs):,}")

    cursor.execute("""
        SELECT phonetic_code,
               GROUP_CONCAT(id || ':' || normalized_name, '|||') as data
        FROM vendors
        WHERE phonetic_code IS NOT NULL
        AND is_individual = 0
        GROUP BY phonetic_code
        HAVING COUNT(*) BETWEEN 2 AND 100
    """)

    phonetic_groups = cursor.fetchall()
    print(f"  Phonetic groups to check: {len(phonetic_groups)}")

    rfc_conflicts_prevented = 0

    for phonetic_code, data_str in phonetic_groups:
        vendors = []
        for item in data_str.split('|||'):
            parts = item.split(':', 1)
            if len(parts) >= 2:
                vendors.append({
                    'id': int(parts[0]),
                    'normalized_name': parts[1],
                })

        # Compare pairs within phonetic group
        threshold = get_threshold('phonetic')

        for i, v1 in enumerate(vendors):
            for v2 in vendors[i + 1:]:
                # Skip if already in same cluster
                if uf.find(v1['id']) == uf.find(v2['id']):
                    continue

                # RFC CONFLICT CHECK: Never merge vendors with different RFCs
                v1_rfc = vendor_rfcs.get(v1['id'])
                v2_rfc = vendor_rfcs.get(v2['id'])
                if v1_rfc and v2_rfc and v1_rfc != v2_rfc:
                    rfc_conflicts_prevented += 1
                    continue  # Different RFCs = different entities

                stats['pairs_checked'] += 1
                sim = calculate_similarity_v3(
                    v1['normalized_name'],
                    v2['normalized_name']
                )

                # Use dynamic threshold
                actual_threshold = get_threshold(
                    'phonetic',
                    v1['normalized_name'],
                    v2['normalized_name']
                )

                if sim >= actual_threshold:
                    if uf.union(v1['id'], v2['id']):
                        stats['phonetic_merges'] += 1

    print(f"  Phonetic merges: {stats['phonetic_merges']}")
    print(f"  RFC conflicts prevented: {rfc_conflicts_prevented:,}")
    print(f"  Total pairs checked: {stats['pairs_checked']:,}")

    # ==================== PHASE 6: Create Vendor Groups ====================
    print("\nPhase 6: Creating vendor groups...")

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
        members.sort(
            key=lambda x: (x[1].get('total_contracts', 0), x[1].get('total_amount_mxn', 0)),
            reverse=True
        )

        canonical_id = members[0][0]
        canonical_info = members[0][1]

        # Get corporate group from any member
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
        LIMIT 20
    """)
    largest = cursor.fetchall()

    # Verify no individuals
    cursor.execute("""
        SELECT COUNT(*) FROM vendors v
        JOIN vendor_aliases va ON v.id = va.vendor_id
        WHERE v.is_individual = 1
    """)
    individual_errors = cursor.fetchone()[0]

    print("\n" + "=" * 70)
    print("PHASE 3 RESULTS")
    print("=" * 70)
    print(f"\nVendor groups created: {final_groups:,}")
    print(f"Vendors in groups: {final_grouped:,} ({100 * final_grouped / total_vendors:.1f}%)")
    print(f"Deduplication rate: {100 * (final_grouped - final_groups) / total_vendors:.2f}%")

    print(f"\nMerge breakdown:")
    print(f"  RFC match: {stats['rfc_merges']:,}")
    print(f"  Corporate group: {stats['corp_group_merges']:,}")
    print(f"  Exact name: {stats['name_exact_merges']:,}")
    print(f"  First-token: {stats['first_token_merges']:,}")
    print(f"  Phonetic similarity: {stats['phonetic_merges']:,}")

    print(f"\nQuality checks:")
    print(f"  Individual errors: {individual_errors} {'PASS' if individual_errors == 0 else 'FAIL'}")

    print("\nLargest clusters:")
    for name, corp, count in largest[:15]:
        corp_str = f" [{corp}]" if corp else ""
        print(f"  {count:5d}: {name[:50]}{corp_str}")

    conn.close()

    print("\n" + "=" * 70)
    print("Phase 3 clustering complete!")
    print("=" * 70)

    return {
        'groups': final_groups,
        'grouped': final_grouped,
        'dedup_rate': 100 * (final_grouped - final_groups) / total_vendors,
        'stats': stats,
    }


if __name__ == "__main__":
    cluster_vendors_v3()
