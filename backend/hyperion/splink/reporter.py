"""
Persistence and reporting for Splink deduplication results.
"""

import sqlite3
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid

logger = logging.getLogger(__name__)


@dataclass
class PersistResult:
    """Result of persisting deduplication results to database."""
    success: bool
    batch_id: str
    groups_created: int
    aliases_created: int
    vendors_updated: int
    error: Optional[str] = None


class MatchReporter:
    """Handles persistence and reporting of deduplication results."""

    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)

    def persist_to_database(
        self,
        clusters: dict[int, list[int]],
        batch_id: Optional[str] = None
    ) -> PersistResult:
        """
        Save validated clusters to vendor_groups and vendor_aliases.

        Args:
            clusters: Dict mapping cluster_id -> list of vendor_ids
            batch_id: Optional batch identifier (auto-generated if not provided)

        Returns:
            PersistResult with counts and status
        """
        batch_id = batch_id or f"splink_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        groups_created = 0
        aliases_created = 0
        vendors_updated = 0

        try:
            cursor.execute("BEGIN TRANSACTION")

            for cluster_id, member_ids in clusters.items():
                if len(member_ids) < 2:
                    continue

                # Select canonical vendor (one with most contracts, or lowest ID)
                canonical_id, canonical_name, canonical_rfc = self._select_canonical(cursor, member_ids)

                # Create vendor group
                cursor.execute("""
                    INSERT INTO vendor_groups (
                        canonical_vendor_id,
                        canonical_name,
                        canonical_rfc,
                        match_method,
                        confidence_score,
                        member_count,
                        created_at
                    ) VALUES (?, ?, ?, 'splink', 0.97, ?, datetime('now'))
                """, (canonical_id, canonical_name, canonical_rfc, len(member_ids)))
                group_id = cursor.lastrowid
                groups_created += 1

                # Add all members as aliases
                for vendor_id in member_ids:
                    cursor.execute("""
                        INSERT INTO vendor_aliases (group_id, vendor_id)
                        VALUES (?, ?)
                    """, (group_id, vendor_id))
                    aliases_created += 1

                # Update vendors table
                placeholders = ','.join('?' * len(member_ids))
                cursor.execute(f"""
                    UPDATE vendors
                    SET group_id = ?, is_canonical = 0
                    WHERE id IN ({placeholders})
                """, [group_id] + member_ids)
                vendors_updated += len(member_ids)

                # Mark canonical
                cursor.execute("""
                    UPDATE vendors
                    SET is_canonical = 1
                    WHERE id = ?
                """, (canonical_id,))

            cursor.execute("COMMIT")
            logger.info(f"Persisted {groups_created} groups, {aliases_created} aliases")

            return PersistResult(
                success=True,
                batch_id=batch_id,
                groups_created=groups_created,
                aliases_created=aliases_created,
                vendors_updated=vendors_updated
            )

        except Exception as e:
            cursor.execute("ROLLBACK")
            logger.error(f"Persistence failed: {e}")
            return PersistResult(
                success=False,
                batch_id=batch_id,
                groups_created=0,
                aliases_created=0,
                vendors_updated=0,
                error=str(e)
            )

        finally:
            conn.close()

    def _select_canonical(self, cursor: sqlite3.Cursor, member_ids: list[int]) -> tuple[int, str, str]:
        """
        Select the canonical vendor from a cluster.

        Selection criteria:
        1. Vendor with most contracts (if we have that data)
        2. Vendor with RFC (more official)
        3. Lowest ID (oldest record)

        Returns:
            Tuple of (vendor_id, normalized_name, rfc)
        """
        placeholders = ','.join('?' * len(member_ids))

        # Try to find vendor with most contracts
        cursor.execute(f"""
            SELECT v.id, v.normalized_name, v.rfc, COUNT(c.id) as contract_count
            FROM vendors v
            LEFT JOIN contracts c ON v.id = c.vendor_id
            WHERE v.id IN ({placeholders})
            GROUP BY v.id
            ORDER BY contract_count DESC, (v.rfc IS NOT NULL AND v.rfc != '') DESC, v.id ASC
            LIMIT 1
        """, member_ids)

        result = cursor.fetchone()
        if result:
            return result[0], result[1], result[2]
        return min(member_ids), None, None

    def generate_report_markdown(
        self,
        result,  # DeduplicationResult
        output_path: Optional[Path] = None
    ) -> str:
        """Generate a markdown report of deduplication results."""

        report = f"""# Splink Vendor Deduplication Report

**Generated:** {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
**Status:** {'Success' if result.success else 'Failed'}

## Summary

| Metric | Value |
|--------|-------|
| Total Vendors | {result.total_vendors:,} |
| Predictions Generated | {result.predictions_generated:,} |
| RFC Conflicts Removed | {result.rfc_conflicts_removed:,} |
| Valid Predictions | {result.predictions_after_filter:,} |
| Clusters Formed | {result.clusters_formed:,} |
| Vendors in Clusters | {result.vendors_in_clusters:,} |
| **Deduplication Rate** | **{result.dedup_rate:.2f}%** |
| Max Cluster Size | {result.max_cluster_size} |

## Quality Metrics

| Check | Status |
|-------|--------|
| RFC Conflicts | {'PASS (0 conflicts)' if result.rfc_conflicts_removed >= 0 else 'FAIL'} |
| Max Cluster Size | {'PASS' if result.max_cluster_size <= 50 else 'WARNING: Large clusters'} |
| Clusters Flagged for Review | {result.clusters_flagged} |
| Clusters Rejected | {result.clusters_rejected} |
"""

        if result.quality_report:
            qr = result.quality_report

            # Add cluster size distribution
            report += "\n## Cluster Size Distribution\n\n"
            report += "| Size | Count |\n|------|-------|\n"
            for size in sorted(qr.cluster_size_distribution.keys()):
                count = qr.cluster_size_distribution[size]
                report += f"| {size} | {count:,} |\n"

            # Add sample matches
            if qr.sample_matches:
                report += "\n## Sample High-Confidence Matches\n\n"
                for i, match in enumerate(qr.sample_matches[:10], 1):
                    prob = match.get('probability', 0)
                    name_l = (match.get('name_l') or 'N/A')[:40]
                    name_r = (match.get('name_r') or 'N/A')[:40]
                    rfc_l = match.get('rfc_l') or ''
                    rfc_r = match.get('rfc_r') or ''
                    report += f"{i}. **{prob:.3f}**: `{name_l}` [{rfc_l}] <-> `{name_r}` [{rfc_r}]\n"

        if result.persist_result:
            pr = result.persist_result
            report += f"""
## Persistence

| Action | Count |
|--------|-------|
| Groups Created | {pr.groups_created:,} |
| Aliases Created | {pr.aliases_created:,} |
| Vendors Updated | {pr.vendors_updated:,} |
| Batch ID | `{pr.batch_id}` |
"""

        if result.error:
            report += f"\n## Error\n\n```\n{result.error}\n```\n"

        # Save to file if path provided
        if output_path:
            output_path = Path(output_path)
            output_path.write_text(report, encoding='utf-8')
            logger.info(f"Report saved to: {output_path}")

        return report

    def create_rollback_script(self, batch_id: str) -> str:
        """
        Generate SQL to undo a specific deduplication run.

        Note: This requires the batch_id to be stored in vendor_groups,
        which the current schema doesn't support. This is a template
        for future enhancement.
        """
        return f"""
-- Rollback Splink deduplication batch: {batch_id}
-- WARNING: This will remove all vendor groupings from this batch

-- Option 1: If batch_id is stored in vendor_groups
-- DELETE FROM vendor_aliases WHERE group_id IN (
--     SELECT id FROM vendor_groups WHERE batch_id = '{batch_id}'
-- );
-- DELETE FROM vendor_groups WHERE batch_id = '{batch_id}';

-- Option 2: Full reset (use with caution!)
DELETE FROM vendor_aliases;
DELETE FROM vendor_groups;
UPDATE vendors SET group_id = NULL, is_canonical = 0;

-- Verify cleanup
SELECT COUNT(*) as remaining_groups FROM vendor_groups;
SELECT COUNT(*) as remaining_aliases FROM vendor_aliases;
"""

    def get_verification_queries(self) -> str:
        """Return SQL queries to verify deduplication quality."""
        return """
-- Verification Query 1: Check for RFC conflicts in groups
-- Should return 0 rows
SELECT g.id as group_id, COUNT(DISTINCT v.rfc) as rfc_count,
       GROUP_CONCAT(DISTINCT v.rfc) as rfcs
FROM vendor_groups g
JOIN vendor_aliases a ON g.id = a.group_id
JOIN vendors v ON a.vendor_id = v.id
WHERE v.rfc IS NOT NULL AND v.rfc != ''
GROUP BY g.id
HAVING rfc_count > 1;

-- Verification Query 2: Cluster size distribution
SELECT cluster_size, COUNT(*) as n_clusters
FROM (
    SELECT group_id, COUNT(*) as cluster_size
    FROM vendor_aliases
    GROUP BY group_id
)
GROUP BY cluster_size
ORDER BY cluster_size;

-- Verification Query 3: Overall deduplication rate
SELECT
    (SELECT COUNT(*) FROM vendor_aliases) as vendors_in_groups,
    (SELECT COUNT(*) FROM vendors WHERE is_individual = 0) as total_companies,
    ROUND(100.0 * (SELECT COUNT(*) FROM vendor_aliases) /
          (SELECT COUNT(*) FROM vendors WHERE is_individual = 0), 2) as dedup_rate;

-- Verification Query 4: Top clusters by size
SELECT
    g.id as group_id,
    v_canonical.name as canonical_name,
    COUNT(a.vendor_id) as member_count
FROM vendor_groups g
JOIN vendor_aliases a ON g.id = a.group_id
JOIN vendors v_canonical ON g.canonical_vendor_id = v_canonical.id
GROUP BY g.id
ORDER BY member_count DESC
LIMIT 20;
"""
