"""
build_vendor_graph.py — Co-bidding graph construction + community detection (A1).

Builds a weighted undirected vendor co-bidding graph from competitive procurement
procedures. Two vendors share an edge if they appeared in the same procedure.
Edge weight = number of shared procedures.

Computes per-vendor graph metrics and runs Louvain community detection.
Results are stored in vendor_graph_features table.

Runtime: ~3-5 min on 3.1M contract DB.
"""
from __future__ import annotations

import sqlite3
import sys
import time
from collections import defaultdict
from itertools import combinations
from pathlib import Path

import networkx as nx
import community as community_louvain  # python-louvain

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Cap vendors per procedure to avoid star-topology distortion in pathological cases
MAX_VENDORS_PER_PROC = 50
# Approximate betweenness centrality with k random pivots (exact is O(n*m))
BETWEENNESS_K = 500


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")  # 200 MB
    return conn


# ---------------------------------------------------------------------------
# Step 1: Create table
# ---------------------------------------------------------------------------

def create_table(conn: sqlite3.Connection) -> None:
    conn.execute("DROP TABLE IF EXISTS vendor_graph_features")
    conn.execute("""
        CREATE TABLE vendor_graph_features (
            vendor_id               INTEGER PRIMARY KEY,
            pagerank                REAL DEFAULT 0,
            betweenness_centrality  REAL DEFAULT 0,
            clustering_coefficient  REAL DEFAULT 0,
            community_id            INTEGER DEFAULT 0,
            community_size          INTEGER DEFAULT 1,
            community_avg_risk      REAL DEFAULT 0,
            degree                  INTEGER DEFAULT 0,
            weighted_degree         REAL DEFAULT 0,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_vgf_community ON vendor_graph_features(community_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_vgf_pagerank ON vendor_graph_features(pagerank DESC)")
    conn.commit()
    print("✓ Created vendor_graph_features table")


# ---------------------------------------------------------------------------
# Step 2: Build co-bidding edge list from competitive procedures
# ---------------------------------------------------------------------------

def build_edge_list(conn: sqlite3.Connection) -> tuple[dict[tuple, int], dict[int, float]]:
    """
    Returns:
      edge_weights: {(vendor_a, vendor_b): shared_procedure_count}  (a < b)
      vendor_risk:  {vendor_id: avg_risk_score}
    """
    cursor = conn.cursor()

    print("Loading competitive procedures with ≥2 vendors…")
    t0 = time.time()

    cursor.execute("""
        SELECT procedure_number, vendor_id
        FROM contracts
        WHERE is_direct_award = 0
          AND procedure_number IS NOT NULL
          AND procedure_number != ''
        ORDER BY procedure_number
    """)

    # Group by procedure_number
    proc_vendors: dict[str, list[int]] = defaultdict(list)
    for row in cursor:
        proc_vendors[row[0]].append(row[1])

    print(f"  Loaded {len(proc_vendors):,} procedures in {time.time()-t0:.1f}s")

    # Build edge weights — only for procedures with ≥2 vendors
    edge_weights: dict[tuple, int] = defaultdict(int)
    skipped = 0
    multi_count = 0

    for vendors in proc_vendors.values():
        unique = list(set(vendors))
        if len(unique) < 2:
            continue
        if len(unique) > MAX_VENDORS_PER_PROC:
            skipped += 1
            continue
        multi_count += 1
        for a, b in combinations(sorted(unique), 2):
            edge_weights[(a, b)] += 1

    print(f"  Multi-vendor procedures: {multi_count:,}  (skipped {skipped} with >{MAX_VENDORS_PER_PROC} vendors)")
    print(f"  Unique co-bidding edges: {len(edge_weights):,}")

    # Vendor average risk scores
    print("Loading vendor risk scores…")
    cursor.execute("""
        SELECT vendor_id, AVG(risk_score) as avg_risk
        FROM contracts
        WHERE risk_score IS NOT NULL
        GROUP BY vendor_id
    """)
    vendor_risk = {row[0]: row[1] for row in cursor}

    return dict(edge_weights), vendor_risk


# ---------------------------------------------------------------------------
# Step 3: Build NetworkX graph and compute metrics
# ---------------------------------------------------------------------------

def build_graph(edge_weights: dict[tuple, int]) -> nx.Graph:
    print("Building NetworkX graph…")
    t0 = time.time()
    G = nx.Graph()
    for (a, b), w in edge_weights.items():
        G.add_edge(a, b, weight=w)
    print(f"  Nodes: {G.number_of_nodes():,}  Edges: {G.number_of_edges():,}  ({time.time()-t0:.1f}s)")
    return G


def compute_metrics(G: nx.Graph) -> dict[int, dict]:
    """Compute all per-node metrics. Returns {vendor_id: {metric: value}}."""
    metrics: dict[int, dict] = {n: {} for n in G.nodes()}

    # PageRank
    print("Computing PageRank…")
    t0 = time.time()
    pr = nx.pagerank(G, weight="weight")
    for n, v in pr.items():
        metrics[n]["pagerank"] = v
    print(f"  Done in {time.time()-t0:.1f}s")

    # Approximate betweenness centrality (k=500 random pivots)
    print(f"Computing betweenness centrality (k={BETWEENNESS_K})…")
    t0 = time.time()
    bc = nx.betweenness_centrality(G, k=BETWEENNESS_K, weight="weight", normalized=True, seed=42)
    for n, v in bc.items():
        metrics[n]["betweenness_centrality"] = v
    print(f"  Done in {time.time()-t0:.1f}s")

    # Clustering coefficient
    print("Computing clustering coefficients…")
    t0 = time.time()
    cc = nx.clustering(G, weight="weight")
    for n, v in cc.items():
        metrics[n]["clustering_coefficient"] = v
    print(f"  Done in {time.time()-t0:.1f}s")

    # Degree and weighted degree
    for n in G.nodes():
        metrics[n]["degree"] = G.degree(n)
        metrics[n]["weighted_degree"] = G.degree(n, weight="weight")

    return metrics


# ---------------------------------------------------------------------------
# Step 4: Louvain community detection
# ---------------------------------------------------------------------------

def detect_communities(G: nx.Graph, vendor_risk: dict[int, float]) -> dict[int, dict]:
    """
    Returns {vendor_id: {community_id, community_size, community_avg_risk}}.
    """
    print("Running Louvain community detection…")
    t0 = time.time()

    # Louvain needs the largest connected component if you want a connected result,
    # but it works fine on the full graph — isolated nodes each get their own community.
    partition = community_louvain.best_partition(G, weight="weight", random_state=42)

    print(f"  Detected {len(set(partition.values())):,} communities in {time.time()-t0:.1f}s")

    # Compute community stats
    community_members: dict[int, list[int]] = defaultdict(list)
    for vendor_id, comm_id in partition.items():
        community_members[comm_id].append(vendor_id)

    community_stats: dict[int, dict] = {}
    for comm_id, members in community_members.items():
        risks = [vendor_risk.get(m, 0) for m in members]
        community_stats[comm_id] = {
            "size": len(members),
            "avg_risk": sum(risks) / len(risks) if risks else 0,
        }

    # Sort community IDs by size descending, then reassign sequential IDs
    # (community 0 = largest, 1 = second largest, etc.)
    sorted_comms = sorted(community_stats.keys(), key=lambda c: -community_stats[c]["size"])
    comm_remap = {old: new for new, old in enumerate(sorted_comms)}

    result: dict[int, dict] = {}
    for vendor_id, old_comm in partition.items():
        new_comm = comm_remap[old_comm]
        result[vendor_id] = {
            "community_id": new_comm,
            "community_size": community_stats[old_comm]["size"],
            "community_avg_risk": community_stats[old_comm]["avg_risk"],
        }

    # Report top communities
    top = sorted(community_stats.items(), key=lambda x: -x[1]["size"])[:10]
    print("  Top 10 communities by size:")
    for old_id, stats in top:
        new_id = comm_remap[old_id]
        print(f"    Community {new_id:4d}: {stats['size']:6,} vendors  avg_risk={stats['avg_risk']:.3f}")

    return result


# ---------------------------------------------------------------------------
# Step 5: Write results to DB
# ---------------------------------------------------------------------------

def write_results(
    conn: sqlite3.Connection,
    metrics: dict[int, dict],
    communities: dict[int, dict],
    vendor_risk: dict[int, float],
) -> None:
    print("Writing results to vendor_graph_features…")
    t0 = time.time()

    rows = []
    all_vendors = set(metrics.keys()) | set(communities.keys())
    for vendor_id in all_vendors:
        m = metrics.get(vendor_id, {})
        c = communities.get(vendor_id, {})
        rows.append((
            vendor_id,
            m.get("pagerank", 0),
            m.get("betweenness_centrality", 0),
            m.get("clustering_coefficient", 0),
            c.get("community_id", -1),
            c.get("community_size", 1),
            c.get("community_avg_risk", vendor_risk.get(vendor_id, 0)),
            m.get("degree", 0),
            m.get("weighted_degree", 0),
        ))

    BATCH = 10_000
    for i in range(0, len(rows), BATCH):
        conn.executemany("""
            INSERT OR REPLACE INTO vendor_graph_features
              (vendor_id, pagerank, betweenness_centrality, clustering_coefficient,
               community_id, community_size, community_avg_risk, degree, weighted_degree)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rows[i:i + BATCH])
        conn.commit()
        if (i // BATCH) % 5 == 0:
            print(f"  Wrote {min(i+BATCH, len(rows)):,}/{len(rows):,}")

    print(f"  Done: {len(rows):,} vendors written in {time.time()-t0:.1f}s")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("A1: Vendor Co-Bidding Graph Builder")
    print("=" * 60)
    t_start = time.time()

    conn = get_connection()

    create_table(conn)
    edge_weights, vendor_risk = build_edge_list(conn)

    if not edge_weights:
        print("ERROR: No co-bidding edges found. Check DB.")
        sys.exit(1)

    G = build_graph(edge_weights)
    metrics = compute_metrics(G)
    communities = detect_communities(G, vendor_risk)
    write_results(conn, metrics, communities, vendor_risk)

    conn.close()

    total = time.time() - t_start
    print(f"\n✓ A1 complete in {total/60:.1f} min")
    print(f"  Graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges")
    print(f"  Communities: {len(set(c['community_id'] for c in communities.values())):,}")


if __name__ == "__main__":
    main()
