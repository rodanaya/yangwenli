"""
ARIA Investigate — Unified investigation pipeline.

Runs the full ARIA investigation loop in a single command:
  1. Session startup (sync GT + FP flags)
  2. Centinela refresh (stale registries only)
  3. ARIA pipeline (recompute IPS)
  4. Memo generation (top uninvestigated vendors)
  5. Summary report

Usage:
    cd backend
    python -m scripts.aria_investigate                    # Full pipeline, 10 memos
    python -m scripts.aria_investigate --limit 20         # Generate 20 memos
    python -m scripts.aria_investigate --skip-centinela   # Skip registry refresh
    python -m scripts.aria_investigate --skip-memos       # Skip LLM memo generation
    python -m scripts.aria_investigate --dry-run          # Report only, no writes
"""

import argparse
import logging
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
logger = logging.getLogger("aria_investigate")

TIER_THRESHOLDS = {1: 0.80, 2: 0.60, 3: 0.40}


def step_session_startup(dry_run: bool = False) -> dict:
    """Step 1: Run _session_startup.py to sync GT + FP flags."""
    logger.info("=" * 60)
    logger.info("STEP 1: Session Startup (sync GT + FP flags)")
    logger.info("=" * 60)

    startup_script = Path(__file__).parent / "_session_startup.py"
    if not startup_script.exists():
        logger.warning("_session_startup.py not found — skipping")
        return {"skipped": True, "reason": "script not found"}

    if dry_run:
        logger.info("[DRY RUN] Would run _session_startup.py")
        return {"skipped": True, "reason": "dry_run"}

    result = subprocess.run(
        [sys.executable, str(startup_script)],
        cwd=str(Path(__file__).parent.parent),
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        logger.error("Session startup failed: %s", result.stderr[-500:] if result.stderr else "unknown")
        return {"success": False, "error": result.stderr[-200:] if result.stderr else ""}

    logger.info("Session startup completed")
    # Parse output for summary
    lines = (result.stdout or "").strip().split("\n")
    return {"success": True, "output_lines": len(lines), "last_line": lines[-1] if lines else ""}


def step_centinela_refresh(dry_run: bool = False) -> dict:
    """Step 2: Refresh stale external registries via Centinela."""
    logger.info("=" * 60)
    logger.info("STEP 2: Centinela Registry Refresh (stale only)")
    logger.info("=" * 60)

    try:
        from scripts.centinela import get_registry_status
    except ImportError:
        logger.warning("centinela module not importable — skipping")
        return {"skipped": True, "reason": "import error"}

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        statuses = get_registry_status(conn)
        stale = [s for s in statuses if s.get("is_stale") and s.get("records", 0) > 0]
        fresh = [s for s in statuses if not s.get("is_stale")]
    except Exception as e:
        logger.warning("Could not check freshness: %s", e)
        conn.close()
        return {"skipped": True, "reason": str(e)}
    conn.close()

    if not stale:
        logger.info("All registries are fresh — no refresh needed")
        for s in fresh:
            logger.info("  %s: %d records, %s days old", s["name"], s.get("records", 0), s.get("days_old", "?"))
        return {"refreshed": 0, "stale_registries": [], "fresh_count": len(fresh)}

    stale_names = [s["name"] for s in stale]
    logger.info("Stale registries: %s", ", ".join(stale_names))

    if dry_run:
        logger.info("[DRY RUN] Would refresh: %s", ", ".join(stale_names))
        return {"refreshed": 0, "stale_registries": stale_names, "dry_run": True}

    # Run centinela --stale-only
    result = subprocess.run(
        [sys.executable, "-m", "scripts.centinela", "--stale-only"],
        cwd=str(Path(__file__).parent.parent),
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        logger.warning("Centinela refresh had issues: %s", result.stderr[-200:] if result.stderr else "")

    return {"refreshed": len(stale_names), "stale_registries": stale_names}


def step_aria_pipeline(dry_run: bool = False) -> dict:
    """Step 3: Run ARIA pipeline to recompute IPS scores."""
    logger.info("=" * 60)
    logger.info("STEP 3: ARIA Pipeline (recompute IPS)")
    logger.info("=" * 60)

    try:
        from scripts.aria_pipeline import run_pipeline
    except ImportError:
        logger.error("aria_pipeline module not importable")
        return {"skipped": True, "reason": "import error"}

    t0 = time.time()
    try:
        run_id, stats = run_pipeline(dry_run=dry_run)
        elapsed = time.time() - t0
        logger.info("ARIA pipeline completed in %.1fs (run_id=%s)", elapsed, run_id)
        return {
            "run_id": run_id,
            "vendors_processed": stats.get("vendors_processed", 0),
            "elapsed_s": round(elapsed, 1),
        }
    except Exception as e:
        logger.error("ARIA pipeline failed: %s", e)
        return {"success": False, "error": str(e)}


def step_generate_memos(limit: int = 10, dry_run: bool = False) -> dict:
    """Step 4: Generate investigation memos for top uninvestigated Tier 1 vendors."""
    logger.info("=" * 60)
    logger.info("STEP 4: Generate Investigation Memos (limit=%d)", limit)
    logger.info("=" * 60)

    try:
        from scripts.aria_generate_memos import run_memo_generation
    except ImportError:
        logger.error("aria_generate_memos module not importable")
        return {"skipped": True, "reason": "import error"}

    t0 = time.time()
    try:
        run_memo_generation(tier=1, limit=limit, dry_run=dry_run, use_web_search=False)
        elapsed = time.time() - t0
        logger.info("Memo generation completed in %.1fs", elapsed)
        return {"generated": limit, "elapsed_s": round(elapsed, 1), "tier": 1}
    except Exception as e:
        logger.error("Memo generation failed: %s", e)
        return {"success": False, "error": str(e)}


def step_summary_report() -> dict:
    """Step 5: Print investigation status summary."""
    logger.info("=" * 60)
    logger.info("STEP 5: Investigation Status Summary")
    logger.info("=" * 60)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    summary = {}

    # Queue stats by tier
    tier_rows = cur.execute("""
        SELECT
            CASE WHEN ips_final >= 0.80 THEN 1
                 WHEN ips_final >= 0.60 THEN 2
                 WHEN ips_final >= 0.40 THEN 3
                 ELSE 4 END AS tier,
            COUNT(*) AS total,
            SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN review_status = 'needs_review' THEN 1 ELSE 0 END) AS needs_review,
            SUM(CASE WHEN review_status = 'confirmed_corrupt' THEN 1 ELSE 0 END) AS confirmed
        FROM aria_queue
        WHERE in_ground_truth = 0 AND fp_patent_exception = 0
          AND fp_structural_monopoly = 0 AND fp_data_error = 0
        GROUP BY tier ORDER BY tier
    """).fetchall()
    summary["tiers"] = [dict(r) for r in tier_rows]

    # GT stats
    gt_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    gt_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL").fetchone()[0]
    gt_unmatched = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NULL").fetchone()[0]
    summary["ground_truth"] = {
        "cases": gt_cases,
        "matched_vendors": gt_vendors,
        "unmatched_vendors": gt_unmatched,
    }

    # Memo stats
    with_memos = cur.execute(
        "SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL AND memo_text != ''"
    ).fetchone()[0]
    summary["memos"] = with_memos

    # GT auto-updates pending
    gt_updates = cur.execute(
        "SELECT COUNT(*) FROM aria_gt_updates WHERE review_status = 'pending'"
    ).fetchone()[0]
    summary["gt_updates_pending"] = gt_updates

    # FP counts
    fp_patent = cur.execute("SELECT COUNT(*) FROM aria_queue WHERE fp_patent_exception = 1").fetchone()[0]
    fp_structural = cur.execute("SELECT COUNT(*) FROM aria_queue WHERE fp_structural_monopoly = 1").fetchone()[0]
    summary["false_positives"] = {"patent_exception": fp_patent, "structural_monopoly": fp_structural}

    conn.close()

    # Print summary
    print("\n" + "=" * 60)
    print("ARIA INVESTIGATION STATUS")
    print("=" * 60)

    print("\nInvestigation Queue (excluding GT + FP):")
    for t in summary["tiers"]:
        tier = t["tier"]
        label = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}.get(tier, f"T{tier}")
        print(f"  Tier {tier} ({label:>8}): {t['total']:>6} total | {t['pending']:>6} pending | "
              f"{t['needs_review']:>4} needs_review | {t['confirmed']:>4} confirmed")

    print(f"\nGround Truth: {summary['ground_truth']['cases']} cases, "
          f"{summary['ground_truth']['matched_vendors']} matched vendors, "
          f"{summary['ground_truth']['unmatched_vendors']} unmatched")
    print(f"Investigation Memos: {summary['memos']}")
    print(f"GT Auto-Updates Pending: {summary['gt_updates_pending']}")
    print(f"False Positives: {summary['false_positives']['patent_exception']} patent, "
          f"{summary['false_positives']['structural_monopoly']} structural")

    # Next action recommendations
    print("\nRecommended Next Actions:")
    for t in summary["tiers"]:
        if t["tier"] <= 2 and t["pending"] > 0:
            print(f"  - {t['pending']} Tier {t['tier']} vendors still pending investigation")
    if summary["ground_truth"]["unmatched_vendors"] > 0:
        print(f"  - {summary['ground_truth']['unmatched_vendors']} GT vendors need vendor_id matching")
    if summary["gt_updates_pending"] > 0:
        print(f"  - {summary['gt_updates_pending']} GT auto-updates awaiting human review")

    print("=" * 60 + "\n")

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="ARIA Investigate — Unified investigation pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scripts.aria_investigate                    # Full pipeline, 10 memos
  python -m scripts.aria_investigate --limit 20         # Generate 20 memos
  python -m scripts.aria_investigate --skip-centinela   # Skip registry refresh
  python -m scripts.aria_investigate --skip-memos       # Skip LLM memo generation
  python -m scripts.aria_investigate --report-only      # Just print status
  python -m scripts.aria_investigate --dry-run          # Report only, no writes
        """,
    )
    parser.add_argument("--limit", type=int, default=10, help="Max memos to generate (default: 10)")
    parser.add_argument("--skip-centinela", action="store_true", help="Skip registry refresh")
    parser.add_argument("--skip-memos", action="store_true", help="Skip LLM memo generation")
    parser.add_argument("--skip-pipeline", action="store_true", help="Skip ARIA pipeline recompute")
    parser.add_argument("--report-only", action="store_true", help="Only print status report")
    parser.add_argument("--dry-run", action="store_true", help="Run all steps in dry-run mode")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    t_start = time.time()
    results = {}

    if args.report_only:
        results["summary"] = step_summary_report()
        return

    # Step 1: Session startup
    results["startup"] = step_session_startup(dry_run=args.dry_run)

    # Step 2: Centinela refresh
    if not args.skip_centinela:
        results["centinela"] = step_centinela_refresh(dry_run=args.dry_run)
    else:
        logger.info("Skipping Centinela refresh (--skip-centinela)")

    # Step 3: ARIA pipeline
    if not args.skip_pipeline:
        results["pipeline"] = step_aria_pipeline(dry_run=args.dry_run)
    else:
        logger.info("Skipping ARIA pipeline (--skip-pipeline)")

    # Step 4: Memo generation
    if not args.skip_memos:
        results["memos"] = step_generate_memos(limit=args.limit, dry_run=args.dry_run)
    else:
        logger.info("Skipping memo generation (--skip-memos)")

    # Step 5: Summary report
    results["summary"] = step_summary_report()

    elapsed = time.time() - t_start
    logger.info("Full pipeline completed in %.1fs", elapsed)


if __name__ == "__main__":
    main()
