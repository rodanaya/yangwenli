"""
Main Splink deduplication framework.

Orchestrates the full pipeline: data loading, model training,
prediction, validation, and optional persistence.
"""

import sqlite3
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional
import pandas as pd

# Splink imports
from splink import Linker, DuckDBAPI, SettingsCreator, block_on
import splink.comparison_library as cl

from .config import SplinkConfig, QualityThresholds, DeduplicationConfig, GENERIC_FIRST_TOKENS
from .validator import QualityValidator, QualityReport
from .reporter import MatchReporter, PersistResult

logger = logging.getLogger(__name__)


@dataclass
class DeduplicationResult:
    """Results from a deduplication run."""
    success: bool
    timestamp: datetime

    # Counts
    total_vendors: int
    predictions_generated: int
    predictions_after_filter: int
    clusters_formed: int
    vendors_in_clusters: int

    # Rates
    dedup_rate: float
    max_cluster_size: int

    # Quality
    rfc_conflicts_removed: int
    clusters_flagged: int
    clusters_rejected: int

    # References
    quality_report: Optional[QualityReport] = None
    persist_result: Optional[PersistResult] = None
    error: Optional[str] = None


class SplinkDeduplicationFramework:
    """
    Production framework for Splink-based vendor deduplication.

    Features:
    - Configurable thresholds and blocking rules
    - RFC conflict post-filtering
    - Cluster validation and quality gates
    - Dry-run mode for safe testing
    - Comprehensive reporting
    """

    def __init__(
        self,
        db_path: Path,
        config: Optional[SplinkConfig] = None,
        quality_config: Optional[QualityThresholds] = None
    ):
        self.db_path = Path(db_path)
        self.config = config or SplinkConfig()
        self.quality_config = quality_config or QualityThresholds()

        self.validator = QualityValidator(self.quality_config, self.db_path)
        self.reporter = MatchReporter(self.db_path)

        # Splink objects (initialized during run)
        self._linker: Optional[Linker] = None
        self._db_api: Optional[DuckDBAPI] = None

    def run(self, dry_run: bool = True) -> DeduplicationResult:
        """
        Execute full deduplication pipeline.

        Args:
            dry_run: If True, don't persist results to database

        Returns:
            DeduplicationResult with all metrics and quality info
        """
        timestamp = datetime.now()
        logger.info("=" * 70)
        logger.info("SPLINK VENDOR DEDUPLICATION FRAMEWORK")
        logger.info("=" * 70)
        logger.info(f"Timestamp: {timestamp}")
        logger.info(f"Database: {self.db_path}")
        logger.info(f"Threshold: {self.config.match_probability_threshold}")
        logger.info(f"Dry run: {dry_run}")
        logger.info("")

        try:
            # Step 1: Load vendor data
            logger.info("Step 1: Loading vendor data...")
            df = self._load_vendor_data()
            total_vendors = len(df)
            logger.info(f"  Loaded {total_vendors:,} company records")

            # Step 2: Initialize Splink
            logger.info("\nStep 2: Initializing Splink...")
            self._initialize_linker(df)

            # Step 3: Train model
            logger.info("\nStep 3: Training model...")
            self._train_model()

            # Step 4: Generate predictions
            logger.info("\nStep 4: Generating predictions...")
            predictions_table, predictions_count = self._predict()
            logger.info(f"  Generated {predictions_count:,} potential matches")

            # Step 5: Filter RFC conflicts
            logger.info("\nStep 5: Filtering RFC conflicts...")
            filtered_table, rfc_conflicts = self._filter_rfc_conflicts(predictions_table)
            filtered_count = self._count_table(filtered_table)
            logger.info(f"  Removed {rfc_conflicts:,} RFC conflict pairs")
            logger.info(f"  Remaining: {filtered_count:,} valid pairs")

            # Step 5b: Filter generic name pairs (tiered matching)
            logger.info("\nStep 5b: Filtering generic name pairs (stricter rules)...")
            filtered_table, generic_removed = self._filter_generic_name_pairs(filtered_table)
            filtered_count = self._count_table(filtered_table)
            logger.info(f"  Remaining after tiered filtering: {filtered_count:,} pairs")

            # Step 6: Cluster matches
            logger.info("\nStep 6: Clustering matches...")
            clusters = self._cluster_predictions(filtered_table)
            logger.info(f"  Formed {len(clusters):,} clusters")

            # Step 7: Validate clusters
            logger.info("\nStep 7: Validating clusters...")
            conn = sqlite3.connect(self.db_path)
            valid_clusters, flagged_clusters, rejections = self.validator.validate_clusters_batch(
                clusters, conn
            )
            conn.close()

            # Calculate metrics
            all_valid = {**valid_clusters, **flagged_clusters}
            vendors_in_clusters = sum(len(m) for m in all_valid.values())
            dedup_rate = (vendors_in_clusters / total_vendors * 100) if total_vendors > 0 else 0
            max_cluster = max(len(m) for m in all_valid.values()) if all_valid else 0

            # Step 8: Generate sample matches for report
            logger.info("\nStep 8: Generating quality report...")
            sample_matches = self._get_sample_matches(predictions_table, 20)

            quality_report = self.validator.generate_quality_report(
                predictions_count=predictions_count,
                filtered_count=filtered_count,
                rfc_conflicts=rfc_conflicts,
                valid_clusters=valid_clusters,
                flagged_clusters=flagged_clusters,
                rejections=rejections,
                sample_matches=sample_matches
            )

            # Step 9: Persist if not dry run
            persist_result = None
            if not dry_run:
                logger.info("\nStep 9: Persisting to database...")
                persist_result = self.reporter.persist_to_database(all_valid)
                logger.info(f"  Created {persist_result.groups_created:,} groups")
            else:
                logger.info("\nStep 9: [DRY RUN] Skipping persistence")

            # Summary
            logger.info("\n" + "=" * 70)
            logger.info("RESULTS SUMMARY")
            logger.info("=" * 70)
            logger.info(f"Total vendors: {total_vendors:,}")
            logger.info(f"Vendors in clusters: {vendors_in_clusters:,}")
            logger.info(f"Deduplication rate: {dedup_rate:.2f}%")
            logger.info(f"Max cluster size: {max_cluster}")
            logger.info(f"RFC conflicts removed: {rfc_conflicts:,}")
            logger.info(f"Clusters validated: {len(valid_clusters):,}")
            logger.info(f"Clusters flagged: {len(flagged_clusters):,}")
            logger.info(f"Clusters rejected: {len(rejections):,}")

            return DeduplicationResult(
                success=True,
                timestamp=timestamp,
                total_vendors=total_vendors,
                predictions_generated=predictions_count,
                predictions_after_filter=filtered_count,
                clusters_formed=len(all_valid),
                vendors_in_clusters=vendors_in_clusters,
                dedup_rate=dedup_rate,
                max_cluster_size=max_cluster,
                rfc_conflicts_removed=rfc_conflicts,
                clusters_flagged=len(flagged_clusters),
                clusters_rejected=len(rejections),
                quality_report=quality_report,
                persist_result=persist_result
            )

        except Exception as e:
            logger.error(f"Deduplication failed: {e}")
            import traceback
            traceback.print_exc()
            return DeduplicationResult(
                success=False,
                timestamp=timestamp,
                total_vendors=0,
                predictions_generated=0,
                predictions_after_filter=0,
                clusters_formed=0,
                vendors_in_clusters=0,
                dedup_rate=0.0,
                max_cluster_size=0,
                rfc_conflicts_removed=0,
                clusters_flagged=0,
                clusters_rejected=0,
                error=str(e)
            )

    def _load_vendor_data(self) -> pd.DataFrame:
        """Load vendor data from SQLite, preparing for Splink."""
        conn = sqlite3.connect(self.db_path)

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

        # Critical: Replace empty strings with None
        # Empty strings cause blocking issues (all empty RFCs would match!)
        for col in ['rfc', 'first_token', 'phonetic_code', 'legal_suffix', 'corporate_group']:
            df[col] = df[col].replace('', None)

        logger.info(f"  With RFC: {df['rfc'].notna().sum():,}")
        logger.info(f"  With phonetic_code: {df['phonetic_code'].notna().sum():,}")

        return df

    def _initialize_linker(self, df: pd.DataFrame):
        """Initialize Splink linker with DuckDB backend."""
        settings = self._create_settings()
        self._db_api = DuckDBAPI()
        self._linker = Linker(df, settings, self._db_api)

    def _create_settings(self) -> SettingsCreator:
        """Build Splink settings from configuration."""
        return SettingsCreator(
            link_type="dedupe_only",
            blocking_rules_to_generate_predictions=self._build_blocking_rules(),
            comparisons=self._build_comparisons(),
            retain_intermediate_calculation_columns=self.config.retain_debug_columns,
            retain_matching_columns=True,
        )

    def _build_blocking_rules(self) -> list:
        """Build blocking rules for prediction phase."""
        rules = []
        for rule in self.config.blocking.prediction_rules:
            if rule == "rfc":
                rules.append(block_on("rfc"))
            else:
                rules.append(rule)
        return rules

    def _build_comparisons(self) -> list:
        """Build comparison configurations."""
        return [
            # RFC - exact match is very strong signal
            cl.ExactMatch("rfc").configure(
                term_frequency_adjustments=self.config.use_term_frequency
            ),

            # Normalized name - the main matching field
            cl.JaroWinklerAtThresholds(
                "normalized_name",
                score_threshold_or_thresholds=self.config.name_thresholds
            ).configure(
                term_frequency_adjustments=self.config.use_term_frequency
            ),

            # First token (business type like CONSTRUCTORA)
            cl.ExactMatch("first_token").configure(
                term_frequency_adjustments=self.config.use_term_frequency
            ),

            # Legal suffix
            cl.ExactMatch("legal_suffix"),

            # Corporate group
            cl.ExactMatch("corporate_group").configure(
                term_frequency_adjustments=self.config.use_term_frequency
            ),

            # Phonetic code
            cl.ExactMatch("phonetic_code"),
        ]

    def _train_model(self):
        """Train Splink model using expectation maximization."""
        # Estimate u probabilities (random agreement)
        logger.info("  Estimating u probabilities...")
        self._linker.training.estimate_u_using_random_sampling(
            max_pairs=self.config.training_sample_size
        )

        # Estimate m probabilities using multiple blocking passes
        for i, rule in enumerate(self.config.blocking.training_rules):
            logger.info(f"  Estimating m probabilities (pass {i+1}: {rule})...")
            if rule in ["phonetic_code", "first_token"]:
                blocking = block_on(rule)
            else:
                blocking = rule

            self._linker.training.estimate_parameters_using_expectation_maximisation(
                blocking,
                estimate_without_term_frequencies=True
            )

    def _predict(self) -> tuple[str, int]:
        """Generate match predictions."""
        predictions = self._linker.inference.predict(
            threshold_match_probability=self.config.match_probability_threshold
        )

        # Count without loading full dataframe
        count = self._count_table(predictions.physical_name)
        return predictions.physical_name, count

    def _count_table(self, table_name: str) -> int:
        """Count rows in a DuckDB table."""
        result = self._db_api._con.sql(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        return result[0]

    def _filter_rfc_conflicts(self, predictions_table: str) -> tuple[str, int]:
        """Filter out pairs with RFC conflicts using SQL."""
        # Create filtered view
        filtered_table = f"{predictions_table}_filtered"

        self._db_api._con.sql(f"""
            CREATE TABLE {filtered_table} AS
            SELECT *
            FROM {predictions_table}
            WHERE NOT (
                rfc_l IS NOT NULL AND rfc_l != '' AND
                rfc_r IS NOT NULL AND rfc_r != '' AND
                rfc_l != rfc_r
            )
        """)

        original_count = self._count_table(predictions_table)
        filtered_count = self._count_table(filtered_table)
        conflicts = original_count - filtered_count

        return filtered_table, conflicts

    def _filter_generic_name_pairs(self, predictions_table: str) -> tuple[str, int]:
        """
        Apply stricter filtering to pairs with generic first tokens.

        For pairs where BOTH vendors have generic first tokens (GRUPO, CONSTRUCTORA, etc.),
        we require either:
        1. RFC match (validates they're the same entity)
        2. Very high probability (0.995+)

        This prevents false positives like "GRUPO ALFA" matching "GRUPO BETA".
        """
        # Build SQL condition for generic tokens
        generic_tokens_sql = ", ".join(f"'{t}'" for t in GENERIC_FIRST_TOKENS)

        filtered_table = f"{predictions_table}_generic_filtered"

        # Keep pairs where:
        # - At least one vendor does NOT have a generic first token, OR
        # - Both have generic first tokens AND RFC matches, OR
        # - Both have generic first tokens AND probability >= 0.995
        self._db_api._con.sql(f"""
            CREATE TABLE {filtered_table} AS
            SELECT *
            FROM {predictions_table}
            WHERE
                -- Case 1: At least one is not generic (safe to use normal threshold)
                (
                    UPPER(SPLIT_PART(normalized_name_l, ' ', 1)) NOT IN ({generic_tokens_sql})
                    OR UPPER(SPLIT_PART(normalized_name_r, ' ', 1)) NOT IN ({generic_tokens_sql})
                )
                OR
                -- Case 2: Both generic but RFC matches
                (
                    rfc_l IS NOT NULL AND rfc_l != '' AND rfc_l = rfc_r
                )
                OR
                -- Case 3: Both generic, no RFC, but VERY high probability
                (
                    match_probability >= 0.995
                )
        """)

        original_count = self._count_table(predictions_table)
        filtered_count = self._count_table(filtered_table)
        removed = original_count - filtered_count

        if removed > 0:
            logger.info(f"  Removed {removed:,} generic-name pairs without RFC validation")

        return filtered_table, removed

    def _cluster_predictions(self, predictions_table: str) -> dict[int, list[int]]:
        """Cluster predictions using Union-Find."""

        # Get all pairs from the predictions table
        pairs_sql = f"""
            SELECT unique_id_l, unique_id_r
            FROM {predictions_table}
        """
        pairs = self._db_api._con.sql(pairs_sql).fetchall()

        # Use Union-Find for transitive closure
        parent = {}

        def find(x):
            if x not in parent:
                parent[x] = x
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        # Build clusters
        for id_l, id_r in pairs:
            union(id_l, id_r)

        # Group by root
        clusters = {}
        for node in parent:
            root = find(node)
            if root not in clusters:
                clusters[root] = []
            clusters[root].append(node)

        # Filter to multi-member clusters only
        multi_clusters = {k: v for k, v in clusters.items() if len(v) > 1}

        return multi_clusters

    def _get_sample_matches(self, predictions_table: str, limit: int = 20) -> list[dict]:
        """Get sample high-confidence matches for reporting."""
        sql = f"""
            SELECT
                match_probability,
                normalized_name_l,
                normalized_name_r,
                rfc_l,
                rfc_r
            FROM {predictions_table}
            ORDER BY match_probability DESC
            LIMIT {limit}
        """

        results = self._db_api._con.sql(sql).fetchall()
        return [
            {
                "probability": row[0],
                "name_l": row[1],
                "name_r": row[2],
                "rfc_l": row[3],
                "rfc_r": row[4]
            }
            for row in results
        ]
