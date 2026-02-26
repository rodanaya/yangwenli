"""
Porter-Zona Bid Distribution Test
==================================
Porter & Zona (1993, 1999): In competitive markets, bid distributions are
symmetric and independent. In collusive markets, cover bidders show higher
bids with less variance relative to cost.

Conley & Decarolis (2016): Within-community bid variance is lower for
colluding rings vs. cross-community bids.

For each vendor pair (A, B) appearing in ≥min_procedures common procedures:
  1. Collect A's and B's bids in those procedures
  2. Compute CV (std/mean) for each
  3. Compute Spearman rank correlation of bid ranks
  4. Flag cover bidder patterns (A always wins, B high-variance loser)
  5. Compute community-level within-group bid variance ratio

Output: community_porter_zona table

Usage:
    python -m scripts.compute_porter_zona [--min-procedures 5] [--top-pairs 50000]
"""

import sqlite3
import sys
import math
import argparse
from pathlib import Path
from datetime import datetime

DB_PATH = Path("RUBLI_NORMALIZED.db")


def create_table(cur: sqlite3.Cursor) -> None:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS community_porter_zona (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_a_id             INTEGER NOT NULL,
            vendor_b_id             INTEGER NOT NULL,
            vendor_a_name           TEXT,
            vendor_b_name           TEXT,
            shared_procedures       INTEGER NOT NULL,
            a_cv                    REAL,       -- Coefficient of variation: std/mean
            b_cv                    REAL,
            a_win_rate              REAL,       -- Fraction of shared procs A wins
            b_win_rate              REAL,
            rank_corr               REAL,       -- Spearman rank correlation of bid amounts
            cover_bid_score         REAL,       -- 0-1: how much B looks like a cover bidder for A
            suspicion_score         REAL,       -- Combined suspicion score 0-1
            pattern_label           TEXT,       -- 'cover_bidding', 'bid_rotation', 'normal', 'insufficient_data'
            community_id_a          INTEGER,    -- Louvain community (if available)
            community_id_b          INTEGER,
            same_community          INTEGER,    -- 1 if A and B in same community
            computed_at             TEXT
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pz_vendor_a ON community_porter_zona(vendor_a_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pz_vendor_b ON community_porter_zona(vendor_b_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pz_suspicion ON community_porter_zona(suspicion_score DESC)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pz_community ON community_porter_zona(community_id_a, community_id_b)")


def spearman_rank_corr(a_vals: list[float], b_vals: list[float]) -> float | None:
    """Compute Spearman rank correlation between two equal-length lists."""
    n = len(a_vals)
    if n < 3:
        return None

    def ranks(vals):
        sorted_idx = sorted(range(n), key=lambda i: vals[i])
        r = [0.0] * n
        for rank, idx in enumerate(sorted_idx):
            r[idx] = rank + 1
        return r

    ra = ranks(a_vals)
    rb = ranks(b_vals)
    d2 = sum((ra[i] - rb[i]) ** 2 for i in range(n))
    rho = 1.0 - (6 * d2) / (n * (n * n - 1))
    return rho


def coefficient_of_variation(vals: list[float]) -> float | None:
    """Compute CV = std / mean. Returns None if mean is 0 or insufficient data."""
    n = len(vals)
    if n < 2:
        return None
    mean = sum(vals) / n
    if mean <= 0:
        return None
    variance = sum((v - mean) ** 2 for v in vals) / (n - 1)
    return math.sqrt(variance) / mean


def compute_cover_bid_score(
    a_wins: int, b_wins: int, n_procs: int,
    b_cv: float | None, rank_corr: float | None
) -> float:
    """
    Cover bid score: how much B looks like it's deliberately losing to A.
    Cover bidding pattern: A almost always wins, B always second, B has HIGH cv (random-looking bids).
    High score = suspicious cover bidding.
    """
    if n_procs < 3:
        return 0.0

    a_win_rate = a_wins / n_procs
    b_win_rate = b_wins / n_procs

    # A always wins, B never wins — suspicious
    dominance_score = a_win_rate * (1 - b_win_rate)

    # Cover bidders have HIGH variance (to avoid detection but still lose)
    cv_score = 0.0
    if b_cv is not None:
        # High B_CV with low A_CV is the classic cover bid pattern
        cv_score = min(b_cv, 2.0) / 2.0  # Normalize to 0-1

    # Rank correlation: cover bidders tend to consistently rank just above winner
    # (negative rank corr = B bids high when A bids low = suspicious)
    corr_score = 0.0
    if rank_corr is not None:
        # Negative correlation is MORE suspicious for cover bidding
        corr_score = max(0.0, -rank_corr) * 0.5

    cover_score = 0.4 * dominance_score + 0.4 * cv_score + 0.2 * corr_score
    return min(cover_score, 1.0)


def classify_pattern(
    a_win_rate: float, b_win_rate: float,
    cover_bid_score: float, rank_corr: float | None
) -> str:
    if cover_bid_score >= 0.6:
        return "cover_bidding"
    if abs(a_win_rate - 0.5) <= 0.15 and abs(b_win_rate - 0.5) <= 0.15:
        if rank_corr is not None and rank_corr < -0.3:
            return "bid_rotation"
    return "normal"


def load_community_map(cur: sqlite3.Cursor) -> dict[int, int]:
    """Load vendor_id -> community_id from vendor_graph_features."""
    rows = cur.execute(
        "SELECT vendor_id, community_id FROM vendor_graph_features WHERE community_id IS NOT NULL"
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def load_vendor_names(cur: sqlite3.Cursor) -> dict[int, str]:
    rows = cur.execute("SELECT id, name FROM vendors").fetchall()
    return {r[0]: r[1] for r in rows}


def main(min_procedures: int = 5, top_pairs: int = 50000) -> None:
    print(f"[Porter-Zona] Starting bid variance analysis (min_procedures={min_procedures})")
    conn = sqlite3.connect(DB_PATH, timeout=120)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-100000")
    cur = conn.cursor()

    create_table(cur)
    conn.commit()

    # Load community map and vendor names
    community_map = load_community_map(cur)
    vendor_names = load_vendor_names(cur)
    print(f"[Porter-Zona] Loaded {len(community_map):,} vendor community assignments")

    # Step 1: Get all competitive procedures with bids (amount per vendor per procedure)
    print("[Porter-Zona] Loading competitive procedure bids...")
    bids_sql = """
        SELECT procedure_number, vendor_id, amount_mxn
        FROM contracts
        WHERE is_direct_award = 0
          AND procedure_number IS NOT NULL
          AND procedure_number != ''
          AND amount_mxn > 0
          AND amount_mxn < 100000000000
        ORDER BY procedure_number, amount_mxn ASC
    """
    rows = cur.execute(bids_sql).fetchall()
    print(f"[Porter-Zona] Loaded {len(rows):,} bids from competitive procedures")

    # Group by procedure: procedure_number -> list of (vendor_id, amount)
    procedures: dict[str, list[tuple[int, float]]] = {}
    for proc_num, vendor_id, amount in rows:
        if proc_num not in procedures:
            procedures[proc_num] = []
        procedures[proc_num].append((vendor_id, amount))

    # Keep only procedures with exactly 2+ vendors
    multi_bidder_procs = {k: v for k, v in procedures.items() if len(v) >= 2}
    print(f"[Porter-Zona] {len(multi_bidder_procs):,} procedures with 2+ bidders")

    # Step 2: Find vendor pairs and the procedures they share
    print("[Porter-Zona] Building vendor pair co-occurrence map...")
    # pair (min_id, max_id) -> list of procedures
    pair_procs: dict[tuple[int, int], list[str]] = {}

    for proc_num, bids in multi_bidder_procs.items():
        vendor_ids = list({b[0] for b in bids})
        for i in range(len(vendor_ids)):
            for j in range(i + 1, len(vendor_ids)):
                pair = (min(vendor_ids[i], vendor_ids[j]), max(vendor_ids[i], vendor_ids[j]))
                if pair not in pair_procs:
                    pair_procs[pair] = []
                pair_procs[pair].append(proc_num)

    # Filter to pairs with ≥ min_procedures
    eligible_pairs = [(pair, procs) for pair, procs in pair_procs.items() if len(procs) >= min_procedures]
    eligible_pairs.sort(key=lambda x: -len(x[1]))  # Sort by shared procedure count desc

    print(f"[Porter-Zona] {len(eligible_pairs):,} vendor pairs with ≥{min_procedures} shared procedures")

    if not eligible_pairs:
        print("[Porter-Zona] No eligible pairs found. Try lowering --min-procedures.")
        conn.close()
        return

    # Limit to top pairs by shared procedures
    if len(eligible_pairs) > top_pairs:
        print(f"[Porter-Zona] Limiting to top {top_pairs:,} pairs by shared procedure count")
        eligible_pairs = eligible_pairs[:top_pairs]

    # Step 3: For each eligible pair, compute statistics
    print(f"[Porter-Zona] Computing statistics for {len(eligible_pairs):,} pairs...")

    # Build procedure -> {vendor_id: amount} lookup for fast access
    proc_bid_map: dict[str, dict[int, float]] = {}
    for proc_num, bids in multi_bidder_procs.items():
        proc_bid_map[proc_num] = {}
        # Winner = vendor with lowest bid (typical procurement: lowest bid wins)
        sorted_bids = sorted(bids, key=lambda x: x[1])
        # For simplicity, mark winner as lowest bidder
        proc_bid_map[proc_num] = {b[0]: b[1] for b in bids}

    # Also compute winner per procedure
    proc_winner: dict[str, int] = {}
    for proc_num, bids in multi_bidder_procs.items():
        sorted_bids = sorted(bids, key=lambda x: x[1])
        proc_winner[proc_num] = sorted_bids[0][0]  # lowest bid = winner

    now_str = datetime.now().isoformat()
    inserted = 0
    batch = []

    for (vid_a, vid_b), shared_procs in eligible_pairs:
        a_bids = []
        b_bids = []
        a_wins = 0
        b_wins = 0

        for proc_num in shared_procs:
            bmap = proc_bid_map.get(proc_num, {})
            if vid_a not in bmap or vid_b not in bmap:
                continue
            a_amt = bmap[vid_a]
            b_amt = bmap[vid_b]
            a_bids.append(a_amt)
            b_bids.append(b_amt)
            winner = proc_winner.get(proc_num)
            if winner == vid_a:
                a_wins += 1
            elif winner == vid_b:
                b_wins += 1

        n_valid = len(a_bids)
        if n_valid < min_procedures:
            continue

        a_cv = coefficient_of_variation(a_bids)
        b_cv = coefficient_of_variation(b_bids)
        rank_corr = spearman_rank_corr(a_bids, b_bids)

        a_win_rate = a_wins / n_valid
        b_win_rate = b_wins / n_valid

        # Cover bid score: A is always the winner, B is the cover
        cover_score_a = compute_cover_bid_score(a_wins, b_wins, n_valid, b_cv, rank_corr)
        # Also check reversed (B is winner, A is cover)
        cover_score_b = compute_cover_bid_score(b_wins, a_wins, n_valid, a_cv, rank_corr)
        cover_bid_score = max(cover_score_a, cover_score_b)

        # Overall suspicion score: combines cover_bid_score and bid correlation anomalies
        # High rank correlation = bids move together = suspicious coordination
        corr_contribution = 0.0
        if rank_corr is not None:
            corr_contribution = abs(rank_corr) * 0.3

        suspicion_score = min(0.7 * cover_bid_score + corr_contribution, 1.0)

        pattern = classify_pattern(a_win_rate, b_win_rate, cover_bid_score, rank_corr)

        comm_a = community_map.get(vid_a)
        comm_b = community_map.get(vid_b)
        same_community = 1 if comm_a is not None and comm_a == comm_b else 0

        batch.append((
            vid_a, vid_b,
            vendor_names.get(vid_a), vendor_names.get(vid_b),
            n_valid,
            a_cv, b_cv,
            a_win_rate, b_win_rate,
            rank_corr,
            cover_bid_score,
            suspicion_score,
            pattern,
            comm_a, comm_b,
            same_community,
            now_str
        ))

        if len(batch) >= 5000:
            cur.executemany("""
                INSERT OR REPLACE INTO community_porter_zona (
                    vendor_a_id, vendor_b_id, vendor_a_name, vendor_b_name,
                    shared_procedures, a_cv, b_cv,
                    a_win_rate, b_win_rate, rank_corr,
                    cover_bid_score, suspicion_score, pattern_label,
                    community_id_a, community_id_b, same_community,
                    computed_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, batch)
            conn.commit()
            inserted += len(batch)
            print(f"  ... {inserted:,} pairs computed")
            batch.clear()

    if batch:
        cur.executemany("""
            INSERT OR REPLACE INTO community_porter_zona (
                vendor_a_id, vendor_b_id, vendor_a_name, vendor_b_name,
                shared_procedures, a_cv, b_cv,
                a_win_rate, b_win_rate, rank_corr,
                cover_bid_score, suspicion_score, pattern_label,
                community_id_a, community_id_b, same_community,
                computed_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, batch)
        conn.commit()
        inserted += len(batch)

    print(f"\n[Porter-Zona] Complete. {inserted:,} pairs written to community_porter_zona")

    # Summary stats
    stats = cur.execute("""
        SELECT pattern_label, COUNT(*) as cnt,
               ROUND(AVG(suspicion_score), 3) as avg_suspicion,
               ROUND(AVG(shared_procedures), 1) as avg_procs
        FROM community_porter_zona
        GROUP BY pattern_label
        ORDER BY cnt DESC
    """).fetchall()
    print("\n--- Pattern Distribution ---")
    for label, cnt, avg_sus, avg_procs in stats:
        print(f"  {label:20s}: {cnt:7,} pairs  |  avg_suspicion={avg_sus}  avg_procs={avg_procs}")

    # Top 10 most suspicious pairs
    top = cur.execute("""
        SELECT vendor_a_name, vendor_b_name, shared_procedures,
               ROUND(suspicion_score, 3) as suspicion,
               ROUND(cover_bid_score, 3) as cover,
               ROUND(a_win_rate, 2) as a_wins, ROUND(b_win_rate, 2) as b_wins,
               pattern_label
        FROM community_porter_zona
        ORDER BY suspicion_score DESC
        LIMIT 10
    """).fetchall()
    print("\n--- Top 10 Most Suspicious Pairs ---")
    print(f"  {'Vendor A':30s} {'Vendor B':30s} {'Procs':5s} {'Suspicion':9s} {'Pattern':15s}")
    for row in top:
        a_name = (row[0] or "?")[:28]
        b_name = (row[1] or "?")[:28]
        print(f"  {a_name:30s} {b_name:30s} {row[2]:5d} {row[3]:9.3f} {row[7]:15s}")

    conn.close()
    print("\n[Porter-Zona] Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Porter-Zona bid variance test")
    parser.add_argument("--min-procedures", type=int, default=5,
                        help="Minimum shared procedures to include a pair (default: 5)")
    parser.add_argument("--top-pairs", type=int, default=50000,
                        help="Maximum number of pairs to analyze (default: 50000)")
    args = parser.parse_args()
    main(min_procedures=args.min_procedures, top_pairs=args.top_pairs)
