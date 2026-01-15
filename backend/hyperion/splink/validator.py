"""
Quality validation for Splink match predictions.

Handles RFC conflict filtering, cluster validation, and quality reporting.
Now includes strict checks for generic names, subsidiaries, and personal names.
"""

import sqlite3
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import pandas as pd

from .config import (
    QualityThresholds,
    GENERIC_FIRST_TOKENS,
    SUBSIDIARY_INDICATORS,
    PERSONAL_NAME_PATTERNS,
    BRAND_CONFUSION_RISK,
)

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of validating a single cluster."""
    valid: bool
    reason: Optional[str] = None
    flagged: bool = False
    details: dict = field(default_factory=dict)


@dataclass
class QualityReport:
    """Comprehensive quality report for a deduplication run."""
    total_predictions: int
    predictions_after_rfc_filter: int
    rfc_conflicts_removed: int

    total_clusters: int
    valid_clusters: int
    flagged_clusters: int
    rejected_clusters: int

    cluster_size_distribution: dict[int, int]
    max_cluster_size: int

    sample_matches: list[dict]
    sample_rejections: list[dict]


class QualityValidator:
    """Post-processing validation for Splink match predictions."""

    def __init__(self, config: QualityThresholds, db_path: Path):
        self.config = config
        self.db_path = db_path

    # =========================================================================
    # STRICT VALIDATION HELPERS
    # =========================================================================

    def _has_generic_first_token(self, name: str) -> bool:
        """Check if name starts with a generic business token."""
        if not name:
            return False
        first_token = name.split()[0] if name.split() else ''
        return first_token.upper() in GENERIC_FIRST_TOKENS

    def _has_personal_name_pattern(self, name: str) -> bool:
        """Check if name contains patterns suggesting a person's name."""
        if not name:
            return False
        upper_name = name.upper()
        return any(pattern in upper_name for pattern in PERSONAL_NAME_PATTERNS)

    def _has_subsidiary_indicator(self, name: str) -> bool:
        """Check if name contains tokens indicating a corporate subsidiary."""
        if not name:
            return False
        tokens = set(name.upper().split())
        return bool(tokens & SUBSIDIARY_INDICATORS)

    def _has_brand_confusion_risk(self, name: str) -> bool:
        """Check if name contains brand names that risk false positive confusion."""
        if not name:
            return False
        tokens = set(name.upper().split())
        return bool(tokens & BRAND_CONFUSION_RISK)

    def _names_are_different_subsidiaries(self, names: list[str]) -> bool:
        """
        Check if names suggest different subsidiaries of same parent.
        e.g., PEMEX EXPLORACION vs PEMEX REFINACION should NOT be merged.
        """
        subsidiary_tokens_per_name = []
        for name in names:
            if name:
                tokens = set(name.upper().split())
                subs = tokens & SUBSIDIARY_INDICATORS
                if subs:
                    subsidiary_tokens_per_name.append(subs)

        # If multiple names have DIFFERENT subsidiary indicators, reject
        if len(subsidiary_tokens_per_name) >= 2:
            all_tokens = set()
            for tokens in subsidiary_tokens_per_name:
                all_tokens.update(tokens)
            if len(all_tokens) > 1:
                return True

        return False

    def _cluster_mixes_personal_and_company(self, names: list[str]) -> bool:
        """Check if cluster incorrectly mixes personal names with company names."""
        has_personal = any(self._has_personal_name_pattern(n) for n in names if n)
        has_company = any(not self._has_personal_name_pattern(n) for n in names if n)
        return has_personal and has_company

    def filter_rfc_conflicts(self, predictions_df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
        """
        Remove pairs where both vendors have different non-null RFCs.

        This is critical - we should NEVER merge vendors with different
        RFC (tax ID) numbers, as they are legally distinct entities.

        Returns:
            Tuple of (filtered_df, count_of_conflicts_removed)
        """
        initial_count = len(predictions_df)

        # Build mask: keep pairs where RFCs are either:
        # - Both NULL
        # - One is NULL
        # - Both are equal
        mask = ~(
            (predictions_df['rfc_l'].notna()) &
            (predictions_df['rfc_r'].notna()) &
            (predictions_df['rfc_l'] != predictions_df['rfc_r'])
        )

        filtered_df = predictions_df[mask].copy()
        conflicts_removed = initial_count - len(filtered_df)

        if conflicts_removed > 0:
            logger.info(f"Removed {conflicts_removed:,} pairs with RFC conflicts")

        return filtered_df, conflicts_removed

    def validate_cluster(
        self,
        cluster_id: int,
        member_ids: list[int],
        member_data: Optional[pd.DataFrame] = None
    ) -> ValidationResult:
        """
        Validate a single cluster meets quality standards.

        Strict validation includes:
        - RFC conflict detection
        - Personal name / company mixing detection
        - Different subsidiary detection (PEMEX EXPLORACION vs PEMEX REFINACION)
        - Generic name without RFC validation
        - Brand confusion risk flagging

        Args:
            cluster_id: Unique identifier for this cluster
            member_ids: List of vendor IDs in the cluster
            member_data: Optional DataFrame with vendor details for validation

        Returns:
            ValidationResult indicating if cluster passes quality gates
        """
        # Check cluster size
        cluster_size = len(member_ids)

        if cluster_size > self.config.max_cluster_size:
            return ValidationResult(
                valid=False,
                reason="cluster_too_large",
                details={"size": cluster_size, "max": self.config.max_cluster_size}
            )

        # If we have member data, do deeper validation
        if member_data is not None:
            # Check RFC consistency
            rfcs = member_data['rfc'].dropna().unique()
            rfcs = [r for r in rfcs if r and r.strip()]

            if len(rfcs) > 1:
                return ValidationResult(
                    valid=False,
                    reason="rfc_conflict",
                    details={"rfcs": list(rfcs)}
                )

            # Get names for pattern checks
            names = member_data['normalized_name'].tolist()
            names = [n for n in names if n]

            if names:
                # =========================================================
                # STRICT CHECK 1: Personal name / company mixing
                # e.g., MERCEDES BENZ vs MARIA DE LAS MERCEDES = REJECT
                # =========================================================
                if self.config.block_personal_names:
                    if self._cluster_mixes_personal_and_company(names):
                        return ValidationResult(
                            valid=False,
                            reason="personal_company_mix",
                            details={"names": names[:5]}  # First 5 for readability
                        )

                # =========================================================
                # STRICT CHECK 2: Different subsidiaries
                # e.g., PEMEX EXPLORACION vs PEMEX REFINACION = REJECT
                # =========================================================
                if self.config.block_subsidiaries:
                    if self._names_are_different_subsidiaries(names):
                        return ValidationResult(
                            valid=False,
                            reason="different_subsidiaries",
                            details={"names": names[:5]}
                        )

                # =========================================================
                # STRICT CHECK 3: Generic first token without RFC
                # e.g., GRUPO X vs GRUPO Y without RFC = REJECT
                # =========================================================
                if self.config.require_rfc_for_generic_names:
                    has_generic = any(self._has_generic_first_token(n) for n in names)
                    has_rfc = len(rfcs) > 0

                    if has_generic and not has_rfc:
                        # For generic names, we need RFC to validate the match
                        return ValidationResult(
                            valid=False,
                            reason="generic_name_no_rfc",
                            details={"names": names[:5], "generic_detected": True}
                        )

                # =========================================================
                # Check name length similarity
                # SKIP if RFC matches (RFC is definitive proof of same entity)
                # =========================================================
                has_matching_rfc = len(rfcs) == 1  # All non-null RFCs are identical

                if not has_matching_rfc:
                    lengths = [len(n) for n in names if n]
                    if lengths:
                        min_len, max_len = min(lengths), max(lengths)
                        if min_len > 0:
                            length_ratio = (max_len - min_len) / max_len
                            if length_ratio > self.config.max_length_diff_ratio:
                                return ValidationResult(
                                    valid=False,
                                    reason="name_length_mismatch",
                                    details={"min_len": min_len, "max_len": max_len}
                                )

        # Check if cluster should be flagged for review
        flagged = cluster_size > self.config.flag_cluster_size

        # Also flag clusters with brand confusion risk
        if member_data is not None and not flagged:
            names = member_data['normalized_name'].tolist()
            if any(self._has_brand_confusion_risk(n) for n in names if n):
                flagged = True

        return ValidationResult(
            valid=True,
            flagged=flagged,
            details={"size": cluster_size}
        )

    def validate_clusters_batch(
        self,
        clusters: dict[int, list[int]],
        conn: Optional[sqlite3.Connection] = None
    ) -> tuple[dict[int, list[int]], dict[int, list[int]], list[dict]]:
        """
        Validate all clusters in a batch.

        Args:
            clusters: Dict mapping cluster_id -> list of vendor_ids
            conn: Optional database connection for fetching vendor details

        Returns:
            Tuple of (valid_clusters, flagged_clusters, rejection_details)
        """
        valid_clusters = {}
        flagged_clusters = {}
        rejections = []

        # Load vendor data in batches to avoid SQLite variable limit
        vendor_data = None
        if conn is not None:
            all_vendor_ids = []
            for members in clusters.values():
                all_vendor_ids.extend(members)

            if all_vendor_ids:
                # Batch fetch to avoid SQLite limit (usually 999 variables)
                BATCH_SIZE = 500
                all_data = []

                for i in range(0, len(all_vendor_ids), BATCH_SIZE):
                    batch_ids = all_vendor_ids[i:i + BATCH_SIZE]
                    placeholders = ','.join('?' * len(batch_ids))
                    query = f"""
                        SELECT id, rfc, normalized_name
                        FROM vendors
                        WHERE id IN ({placeholders})
                    """
                    batch_df = pd.read_sql_query(query, conn, params=batch_ids)
                    all_data.append(batch_df)

                if all_data:
                    vendor_data = pd.concat(all_data, ignore_index=True)
                    vendor_data = vendor_data.set_index('id')

        for cluster_id, member_ids in clusters.items():
            # Get member data for this cluster if available
            member_df = None
            if vendor_data is not None:
                member_df = vendor_data.loc[vendor_data.index.isin(member_ids)].reset_index()

            result = self.validate_cluster(cluster_id, member_ids, member_df)

            if result.valid:
                if result.flagged:
                    flagged_clusters[cluster_id] = member_ids
                else:
                    valid_clusters[cluster_id] = member_ids
            else:
                rejections.append({
                    "cluster_id": cluster_id,
                    "reason": result.reason,
                    "members": member_ids,
                    "details": result.details
                })

        logger.info(
            f"Validation complete: {len(valid_clusters):,} valid, "
            f"{len(flagged_clusters):,} flagged, {len(rejections):,} rejected"
        )

        return valid_clusters, flagged_clusters, rejections

    def check_rfc_conflicts_in_db(self, conn: sqlite3.Connection) -> list[dict]:
        """
        Check for RFC conflicts in existing vendor_groups.

        This is a verification query to ensure no RFC conflicts exist
        in the database after deduplication.

        Returns:
            List of groups with RFC conflicts (should be empty)
        """
        query = """
            SELECT
                g.id as group_id,
                COUNT(DISTINCT v.rfc) as rfc_count,
                GROUP_CONCAT(DISTINCT v.rfc) as rfcs
            FROM vendor_groups g
            JOIN vendor_aliases a ON g.id = a.group_id
            JOIN vendors v ON a.vendor_id = v.id
            WHERE v.rfc IS NOT NULL AND v.rfc != ''
            GROUP BY g.id
            HAVING rfc_count > 1
        """
        cursor = conn.execute(query)
        conflicts = [
            {"group_id": row[0], "rfc_count": row[1], "rfcs": row[2]}
            for row in cursor.fetchall()
        ]

        if conflicts:
            logger.error(f"Found {len(conflicts)} groups with RFC conflicts!")

        return conflicts

    def generate_quality_report(
        self,
        predictions_count: int,
        filtered_count: int,
        rfc_conflicts: int,
        valid_clusters: dict,
        flagged_clusters: dict,
        rejections: list,
        sample_matches: list
    ) -> QualityReport:
        """Generate comprehensive quality report."""

        all_valid = {**valid_clusters, **flagged_clusters}

        # Calculate cluster size distribution
        size_dist = {}
        for members in all_valid.values():
            size = len(members)
            size_dist[size] = size_dist.get(size, 0) + 1

        max_size = max(len(m) for m in all_valid.values()) if all_valid else 0

        return QualityReport(
            total_predictions=predictions_count,
            predictions_after_rfc_filter=filtered_count,
            rfc_conflicts_removed=rfc_conflicts,
            total_clusters=len(all_valid) + len(rejections),
            valid_clusters=len(valid_clusters),
            flagged_clusters=len(flagged_clusters),
            rejected_clusters=len(rejections),
            cluster_size_distribution=size_dist,
            max_cluster_size=max_size,
            sample_matches=sample_matches[:20],
            sample_rejections=rejections[:10]
        )
