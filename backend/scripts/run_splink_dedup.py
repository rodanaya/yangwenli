#!/usr/bin/env python3
"""
CLI entry point for Splink vendor deduplication.

Usage:
    # Dry run (default, safe)
    python run_splink_dedup.py

    # With custom threshold
    python run_splink_dedup.py --threshold 0.95

    # Actually persist results
    python run_splink_dedup.py --no-dry-run

    # Generate report
    python run_splink_dedup.py --report dedup_report.md
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hyperion.splink import (
    SplinkDeduplicationFramework,
    SplinkConfig,
    QualityThresholds,
)
from hyperion.splink.reporter import MatchReporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Default database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def main():
    parser = argparse.ArgumentParser(
        description="Splink-based vendor deduplication framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run with default threshold (0.97)
  python run_splink_dedup.py

  # Test with lower threshold (more matches, more risk)
  python run_splink_dedup.py --threshold 0.90

  # Persist results to database
  python run_splink_dedup.py --no-dry-run

  # Generate markdown report
  python run_splink_dedup.py --report results.md
        """
    )

    parser.add_argument(
        '--threshold',
        type=float,
        default=0.97,
        help='Match probability threshold (default: 0.97)'
    )

    parser.add_argument(
        '--max-cluster',
        type=int,
        default=50,
        help='Maximum cluster size (default: 50)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        default=True,
        help='Run without persisting results (default)'
    )

    parser.add_argument(
        '--no-dry-run',
        action='store_true',
        help='Actually persist results to database'
    )

    parser.add_argument(
        '--db',
        type=Path,
        default=DB_PATH,
        help='Path to SQLite database'
    )

    parser.add_argument(
        '--report',
        type=Path,
        help='Output path for markdown report'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Determine dry_run mode
    dry_run = not args.no_dry_run

    # Validate database exists
    if not args.db.exists():
        logger.error(f"Database not found: {args.db}")
        sys.exit(1)

    # Create configuration
    config = SplinkConfig(
        match_probability_threshold=args.threshold,
    )

    quality_config = QualityThresholds(
        max_cluster_size=args.max_cluster,
        min_match_probability=args.threshold,
    )

    # Initialize framework
    framework = SplinkDeduplicationFramework(
        db_path=args.db,
        config=config,
        quality_config=quality_config
    )

    # Run deduplication
    logger.info(f"Starting deduplication (dry_run={dry_run})")
    result = framework.run(dry_run=dry_run)

    # Generate report
    if args.report or result.success:
        reporter = MatchReporter(args.db)
        report = reporter.generate_report_markdown(result, args.report)

        if not args.report:
            print("\n" + "=" * 70)
            print("REPORT")
            print("=" * 70)
            print(report)

    # Exit with appropriate code
    if result.success:
        logger.info("Deduplication completed successfully")
        if dry_run:
            print("\n[DRY RUN] No changes made. Use --no-dry-run to persist.")
        sys.exit(0)
    else:
        logger.error(f"Deduplication failed: {result.error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
