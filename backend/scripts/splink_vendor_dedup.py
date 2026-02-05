#!/usr/bin/env python3
"""
Splink-based Vendor Deduplication

Uses the UK Ministry of Justice's Splink library for probabilistic
record linkage. This approach:
- Uses Fellegi-Sunter probabilistic model
- Adjusts for term frequency (common names get less weight)
- Provides match probabilities, not just yes/no
- Scales to millions of records

Reference: https://moj-analytical-services.github.io/splink/
"""

import sqlite3
import pandas as pd
from datetime import datetime
from pathlib import Path

# Splink imports
from splink import Linker, DuckDBAPI, SettingsCreator, block_on
import splink.comparison_library as cl
import splink.comparison_level_library as cll

# Configuration
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
MIN_MATCH_PROBABILITY = 0.90  # Threshold for considering a match (higher = fewer matches, less memory)


def load_vendor_data() -> pd.DataFrame:
    """Load vendor data from SQLite into pandas DataFrame."""
    conn = sqlite3.connect(DB_PATH)

    query = """
        SELECT
            id as unique_id,
            name,
            normalized_name,
            rfc,
            first_token,
            phonetic_code,
            legal_suffix,
            corporate_group
        FROM vendors
        WHERE is_individual = 0
        AND normalized_name IS NOT NULL
        AND LENGTH(normalized_name) > 3
    """

    df = pd.read_sql_query(query, conn)
    conn.close()

    # Clean up nulls for Splink - use None for proper NULL handling
    # Empty strings cause problems with blocking (all empty RFCs match!)
    df['rfc'] = df['rfc'].replace('', None)
    df['first_token'] = df['first_token'].replace('', None)
    df['phonetic_code'] = df['phonetic_code'].replace('', None)
    df['legal_suffix'] = df['legal_suffix'].replace('', None)
    df['corporate_group'] = df['corporate_group'].replace('', None)

    print(f"Loaded {len(df):,} company records")
    print(f"  - With RFC: {df['rfc'].notna().sum():,}")
    print(f"  - With phonetic_code: {df['phonetic_code'].notna().sum():,}")
    return df


def create_splink_settings():
    """Create Splink settings with comparison rules for vendor matching."""

    settings = SettingsCreator(
        link_type="dedupe_only",

        # Blocking rules - reduce comparisons from O(n^2)
        # Using more selective blocking to reduce memory usage
        blocking_rules_to_generate_predictions=[
            # Block on exact RFC (when available) - NULLs won't match
            block_on("rfc"),
            # Block on first 8 chars of normalized name (more selective)
            "substr(l.normalized_name, 1, 8) = substr(r.normalized_name, 1, 8)",
            # Block on phonetic + first_token combination (very selective)
            "l.phonetic_code = r.phonetic_code AND l.first_token = r.first_token",
        ],

        # Comparison rules - how to compare records
        comparisons=[
            # RFC comparison - exact match is very strong signal
            cl.ExactMatch("rfc").configure(
                term_frequency_adjustments=True  # Common RFCs (if any) get less weight
            ),

            # Normalized name comparison - the main matching field
            cl.JaroWinklerAtThresholds(
                "normalized_name",
                score_threshold_or_thresholds=[0.95, 0.88, 0.80]
            ).configure(
                term_frequency_adjustments=True  # "CONSTRUCTORA" gets less weight than "AZTECA"
            ),

            # First token comparison (business type like CONSTRUCTORA, COMERCIALIZADORA)
            cl.ExactMatch("first_token").configure(
                term_frequency_adjustments=True
            ),

            # Legal suffix comparison
            cl.ExactMatch("legal_suffix"),

            # Corporate group comparison
            cl.ExactMatch("corporate_group").configure(
                term_frequency_adjustments=True
            ),

            # Phonetic code comparison
            cl.ExactMatch("phonetic_code"),
        ],

        # Retain intermediate calculation columns for debugging
        retain_intermediate_calculation_columns=True,
        retain_matching_columns=True,
    )

    return settings


def run_splink_deduplication():
    """Run Splink deduplication pipeline."""

    print("=" * 70)
    print("SPLINK VENDOR DEDUPLICATION")
    print("=" * 70)
    print(f"Timestamp: {datetime.now()}")
    print(f"Database: {DB_PATH}")
    print()

    # Step 1: Load data
    print("Step 1: Loading vendor data...")
    df = load_vendor_data()

    # Step 2: Create Splink settings
    print("\nStep 2: Configuring Splink model...")
    settings = create_splink_settings()

    # Step 3: Initialize Linker with DuckDB backend (fast!)
    print("\nStep 3: Initializing Splink Linker...")
    db_api = DuckDBAPI()
    linker = Linker(df, settings, db_api)

    # Step 4: Estimate probability parameters using unsupervised learning
    print("\nStep 4: Training model (unsupervised)...")

    # Estimate u probabilities (probability of random agreement)
    # Using a random sample for speed
    print("  - Estimating u probabilities...")
    linker.training.estimate_u_using_random_sampling(max_pairs=1e7)

    # Estimate m probabilities (probability of agreement given match)
    # Using blocking rules to find likely matches
    # Note: We use phonetic_code and name prefix blocking since RFC coverage is low

    print("  - Estimating m probabilities (pass 1: phonetic blocking)...")
    linker.training.estimate_parameters_using_expectation_maximisation(
        block_on("phonetic_code"),
        estimate_without_term_frequencies=True
    )

    print("  - Estimating m probabilities (pass 2: name prefix blocking)...")
    linker.training.estimate_parameters_using_expectation_maximisation(
        "substr(l.normalized_name, 1, 8) = substr(r.normalized_name, 1, 8)",
        estimate_without_term_frequencies=True
    )

    print("  - Estimating m probabilities (pass 3: first_token blocking)...")
    linker.training.estimate_parameters_using_expectation_maximisation(
        block_on("first_token"),
        estimate_without_term_frequencies=True
    )

    # Step 5: Get model parameters
    print("\nStep 5: Model trained successfully")

    # Step 6: Generate predictions
    print("\nStep 6: Generating predictions...")
    predictions = linker.inference.predict(threshold_match_probability=MIN_MATCH_PROBABILITY)

    # Get prediction count without loading full dataframe
    print("  - Counting predictions...")
    count_sql = f"SELECT COUNT(*) as cnt FROM {predictions.physical_name}"
    count_result = db_api._con.sql(count_sql).fetchone()
    n_predictions = count_result[0]
    print(f"  - Found {n_predictions:,} potential matches (prob >= {MIN_MATCH_PROBABILITY})")

    # Step 7: Cluster matches - use Splink's native clustering
    print("\nStep 7: Clustering matches...")
    clusters = linker.clustering.cluster_pairwise_predictions_at_threshold(
        predictions,
        threshold_match_probability=MIN_MATCH_PROBABILITY
    )

    # Get cluster stats without loading full dataframe
    print("  - Analyzing clusters...")
    cluster_stats_sql = f"""
        SELECT
            COUNT(DISTINCT cluster_id) as n_clusters,
            COUNT(*) as n_records,
            MAX(cluster_size) as max_size
        FROM (
            SELECT cluster_id, COUNT(*) OVER (PARTITION BY cluster_id) as cluster_size
            FROM {clusters.physical_name}
        )
    """
    stats = db_api._con.sql(cluster_stats_sql).fetchone()
    n_clusters = stats[0]
    n_in_clusters = stats[1]
    max_cluster_size = stats[2]

    print(f"  - Clusters formed: {n_clusters:,}")
    print(f"  - Records in multi-record clusters: {n_in_clusters:,}")

    # Step 8: Analyze results using SQL (no pandas conversion needed)
    print("\nStep 8: Results analysis...")

    # Get cluster size distribution
    size_dist_sql = f"""
        SELECT cluster_size, COUNT(*) as n_clusters
        FROM (
            SELECT cluster_id, COUNT(*) as cluster_size
            FROM {clusters.physical_name}
            GROUP BY cluster_id
        )
        WHERE cluster_size > 1
        GROUP BY cluster_size
        ORDER BY cluster_size
        LIMIT 15
    """
    size_dist = db_api._con.sql(size_dist_sql).fetchall()

    print(f"\n  Cluster size distribution:")
    multi_cluster_count = 0
    for size, count in size_dist:
        print(f"    Size {size}: {count:,} clusters")
        multi_cluster_count += count

    # Calculate deduplication rate
    total_vendors = len(df)
    vendors_in_multi = sum(size * count for size, count in size_dist)
    vendors_deduplicated = vendors_in_multi - multi_cluster_count
    dedup_rate = vendors_deduplicated / total_vendors * 100

    print(f"\n  Summary:")
    print(f"    Total vendors: {total_vendors:,}")
    print(f"    Multi-record clusters: {multi_cluster_count:,}")
    print(f"    Vendors in clusters: {vendors_in_multi:,}")
    print(f"    Deduplication rate: {dedup_rate:.2f}%")
    print(f"    Max cluster size: {max_cluster_size}")

    # Step 9: Show sample high-confidence matches using SQL
    print("\nStep 9: Sample high-confidence matches...")

    top_matches_sql = f"""
        SELECT match_probability, normalized_name_l, normalized_name_r, rfc_l, rfc_r
        FROM {predictions.physical_name}
        ORDER BY match_probability DESC
        LIMIT 15
    """
    top_matches = db_api._con.sql(top_matches_sql).fetchall()

    for prob, name_l, name_r, rfc_l, rfc_r in top_matches:
        name_l = (name_l or 'N/A')[:45]
        name_r = (name_r or 'N/A')[:45]
        rfc_l = rfc_l or ''
        rfc_r = rfc_r or ''
        print(f"\n  Match (prob={prob:.3f}):")
        print(f"    L: {name_l} [{rfc_l}]")
        print(f"    R: {name_r} [{rfc_r}]")

    # Return results for further processing
    return {
        'predictions_table': predictions.physical_name,
        'clusters_table': clusters.physical_name,
        'linker': linker,
        'db_api': db_api,
        'stats': {
            'total_vendors': total_vendors,
            'n_clusters': multi_cluster_count,
            'n_in_clusters': vendors_in_multi,
            'dedup_rate': dedup_rate
        }
    }


def save_results_to_db(results: dict):
    """Save Splink results back to the database."""

    df_clusters = results['clusters']

    # Get multi-record clusters only
    cluster_sizes = df_clusters.groupby('cluster_id').size()
    multi_cluster_ids = cluster_sizes[cluster_sizes > 1].index

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\nSaving results to database...")

    # Clear existing groups (optional - comment out to preserve)
    # cursor.execute("DELETE FROM vendor_groups")
    # cursor.execute("DELETE FROM vendor_aliases")
    # cursor.execute("UPDATE vendors SET group_id = NULL, is_canonical = 0")

    # For now, just report - don't modify DB until verified
    print("  (Results not saved - review first)")

    conn.close()


if __name__ == "__main__":
    try:
        results = run_splink_deduplication()

        print("\n" + "=" * 70)
        print("SPLINK DEDUPLICATION COMPLETE")
        print("=" * 70)

        # Optionally save results
        # save_results_to_db(results)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
