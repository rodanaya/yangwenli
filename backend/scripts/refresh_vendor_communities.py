"""
refresh_vendor_communities.py — Lightweight Louvain Community Refresh

Re-runs Louvain community detection on the existing co-bidding edge list
without rebuilding the full vendor_graph_features table from scratch.
Use this after new data ingestion to refresh community IDs and community
average risk scores without the full 3–5 min graph computation.

Prerequisites:
    vendor_graph_features must exist (run build_vendor_graph.py first)
    contracts table with up-to-date risk_score

Output:
    Updates vendor_graph_features.community_id, community_size,
    community_avg_risk for all vendors in the graph.

Usage:
    python -m scripts.refresh_vendor_communities
    python -m scripts.refresh_vendor_communities --resolution 1.0
"""

import sys
import sqlite3
import argparse
from collections import defaultdict
from itertools import combinations
from pathlib import Path
from datetime import datetime

try:
    import networkx as nx
    import community as community_louvain  # python-louvain
    HAS_GRAPH = True
except ImportError:
    HAS_GRAPH = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Cap vendors per procedure to avoid star-topology distortion
MAX_VENDORS_PER_PROC = 50


def build_graph_from_db(conn: sqlite3.Connection) -> tuple:
    """Rebuild co-bidding graph from DB (edge list only, no centrality).

    Returns (G, vendor_risk_dict)
    """
    cursor = conn.cursor()

    print("Loading competitive procedures with 2+ vendors...")
    cursor.execute("""
        SELECT procedure_number, vendor_id
        FROM contracts
        WHERE is_direct_award = 0
          AND vendor_id IS NOT NULL
          AND procedure_number IS NOT NULL
        ORDER BY procedure_number
    """)
    rows = cursor.fetchall()
    print(f"  Loaded {len(rows):,} contract rows")

    # Group vendors per procedure
    proc_vendors: dict[str, list[int]] = defaultdict(list)
    for proc_num, vendor_id in rows:
        if proc_num and vendor_id:
            proc_vendors[proc_num].append(vendor_id)

    # Build edge weights
    edge_weights: dict[tuple[int, int], int] = defaultdict(int)
    for vendors in proc_vendors.values():
        unique_vendors = list(set(vendors))
        if len(unique_vendors) < 2 or len(unique_vendors) > MAX_VENDORS_PER_PROC:
            continue
        for a, b in combinations(sorted(unique_vendors), 2):
            edge_weights[(a, b)] += 1

    print(f"  {len(edge_weights):,} edges, {len(proc_vendors):,} procedures")

    # Load vendor average risk scores
    cursor.execute("""
        SELECT vendor_id, AVG(risk_score) AS avg_risk
        FROM contracts
        WHERE vendor_id IS NOT NULL AND risk_score IS NOT NULL
        GROUP BY vendor_id
    """)
    vendor_risk = {row[0]: float(row[1]) for row in cursor.fetchall()}

    # Build NetworkX graph
    G = nx.Graph()
    for (a, b), weight in edge_weights.items():
        G.add_edge(a, b, weight=weight)

    print(f"  Graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges")
    return G, vendor_risk


def run_louvain(G: 'nx.Graph', resolution: float = 1.0) -> dict:
    """Run Louvain community detection.

    Returns {vendor_id: community_id}
    """
    print(f"\nRunning Louvain (resolution={resolution})...")
    partition = community_louvain.best_partition(G, weight='weight', resolution=resolution)
    n_communities = len(set(partition.values()))
    print(f"  Found {n_communities:,} communities across {len(partition):,} vendors")
    return partition


def update_communities(conn: sqlite3.Connection, partition: dict,
                       vendor_risk: dict, batch_size: int = 10000):
    """Update community_id, community_size, community_avg_risk in vendor_graph_features."""
    cursor = conn.cursor()

    # Check table exists
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='vendor_graph_features'")
    if cursor.fetchone()[0] == 0:
        print("ERROR: vendor_graph_features table not found.")
        print("Run: python -m scripts.build_vendor_graph first")
        return 0

    # Compute community stats
    community_members: dict[int, list[int]] = defaultdict(list)
    for vendor_id, comm_id in partition.items():
        community_members[comm_id].append(vendor_id)

    community_sizes: dict[int, int] = {c: len(members) for c, members in community_members.items()}
    community_avg_risk: dict[int, float] = {}
    for comm_id, members in community_members.items():
        risks = [vendor_risk.get(v, 0.0) for v in members]
        community_avg_risk[comm_id] = float(sum(risks) / len(risks)) if risks else 0.0

    # Batch update
    ts = datetime.now().isoformat()
    updates = []
    for vendor_id, comm_id in partition.items():
        updates.append((
            comm_id,
            community_sizes[comm_id],
            community_avg_risk[comm_id],
            ts,
            vendor_id,
        ))

    updated = 0
    for start in range(0, len(updates), batch_size):
        batch = updates[start:start + batch_size]
        cursor.executemany("""
            UPDATE vendor_graph_features
            SET community_id = ?,
                community_size = ?,
                community_avg_risk = ?,
                updated_at = ?
            WHERE vendor_id = ?
        """, batch)
        conn.commit()
        updated += len(batch)
        if updated % 50000 == 0:
            print(f"  Updated {updated:,}/{len(updates):,} vendors")

    return updated


def main():
    parser = argparse.ArgumentParser(description='Louvain Community Refresh v5.2')
    parser.add_argument('--resolution', type=float, default=1.0,
                        help='Louvain resolution parameter (default: 1.0). '
                             'Higher → smaller communities.')
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI v5.2: Louvain Vendor Community Refresh")
    print("=" * 60)

    if not HAS_GRAPH:
        print("ERROR: networkx and python-louvain required.")
        print("  pip install networkx python-louvain")
        return 1

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-200000")
    conn.execute("PRAGMA synchronous=NORMAL")

    try:
        start = datetime.now()

        # Check prerequisite
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM vendor_graph_features")
        n_existing = cursor.fetchone()[0]
        if n_existing == 0:
            print("ERROR: vendor_graph_features is empty.")
            print("Run: python -m scripts.build_vendor_graph first")
            return 1
        print(f"Found {n_existing:,} vendors in vendor_graph_features")

        # Build graph
        G, vendor_risk = build_graph_from_db(conn)

        if G.number_of_nodes() == 0:
            print("ERROR: Empty graph — no co-bidding data found")
            return 1

        # Run Louvain
        partition = run_louvain(G, resolution=args.resolution)

        # Update DB
        print("\nUpdating vendor_graph_features...")
        updated = update_communities(conn, partition, vendor_risk)

        elapsed = (datetime.now() - start).total_seconds()

        n_communities = len(set(partition.values()))
        sizes = [
            sum(1 for c in partition.values() if c == cid)
            for cid in set(partition.values())
        ]
        sizes.sort(reverse=True)

        print(f"\n{'=' * 60}")
        print("COMMUNITY REFRESH COMPLETE")
        print(f"{'=' * 60}")
        print(f"Vendors updated:   {updated:,}")
        print(f"Communities found: {n_communities:,}")
        print(f"Largest 5:         {sizes[:5]}")
        print(f"Time: {elapsed:.1f}s")

    except Exception as e:
        print(f"\nFATAL: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
