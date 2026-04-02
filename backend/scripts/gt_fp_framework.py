"""
GT False-Positive Framework
============================
Adds is_false_positive + fp_tier + fp_reason columns to ground_truth_vendors.
Classifies all GT vendors into 4 tiers:

  Tier 1 — Structural Market FP (EXCLUDE from training)
    Real companies in markets with 1-2 global suppliers. Government MUST buy from
    them. High DA rate reflects lack of market competition, not bribery.
    evidence_strength='low', case_type='monopoly', known structural market.
    → is_false_positive=1, curriculum_weight=0.0

  Tier 2 — Beneficiary, Low Evidence (keep, low weight)
    Real companies that received contracts from a corrupt official, may not be
    actively complicit. Could be brand monopoly (only Nestlé cornstarch), or
    government travel (Aeromexico), or IT (HP). Low evidence, many alternatives
    exist but company didn't seek the corrupt arrangement.
    → is_false_positive=0, curriculum_weight=0.1

  Tier 3 — Captured Participant, Medium Evidence (keep, medium weight)
    Real companies with 100% DA rates in coordinated rings, or confirmed
    institutional capture where the company clearly benefited and likely participated.
    Pepsico 100% DA Ring, La Corona DICONSA Ring.
    → is_false_positive=0, curriculum_weight=0.3

  Tier 4 — Active Perpetrator (keep, full weight)
    Ghost companies, EFOS-listed, documented bribery, court findings.
    → is_false_positive=0, curriculum_weight=0.8–1.0

Usage:
    # Step 1: Run the migration (adds columns)
    python -m scripts.gt_fp_framework --migrate

    # Step 2: Run detection (classifies vendors, writes report — default is dry-run)
    python -m scripts.gt_fp_framework --detect

    # Step 3: Review backend/reports/gt_fp_review.csv, then apply
    python -m scripts.gt_fp_framework --detect --apply

    # Step 4: Show summary
    python -m scripts.gt_fp_framework --summary
"""

import argparse
import csv
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
REPORT_PATH = Path(__file__).parent.parent / "reports" / "gt_fp_review.csv"

# ──────────────────────────────────────────────────────────────────────────────
# TIER 1: Structural Market FPs — hardcoded list with rationale
# These are companies where the market has 1–3 global suppliers.
# The government buys from them because there IS no one else.
# Labeling them as "corrupt" trains the model to flag any market-dominant
# legitimate supplier.
# ──────────────────────────────────────────────────────────────────────────────
STRUCTURAL_FP_VENDOR_IDS = {
    # Industrial / medical oxygen (INFRA is Mexico's dominant supplier;
    # Praxair/Linde is the only multinational competitor)
    1378:  "structural_market_monopoly:industrial_oxygen",   # INFRA SA DE CV 41.8B
    1486:  "structural_market_monopoly:industrial_gas",      # PRAXAIR MEXICO 17.8B

    # Peritoneal dialysis / hemodialysis — Baxter + Fresenius are literally the
    # only two manufacturers of peritoneal dialysis fluid in the world at scale.
    # IMSS cannot competitively bid what doesn't exist.
    5319:  "structural_market_monopoly:peritoneal_dialysis", # BAXTER SA DE CV 28.1B
    4726:  "structural_market_monopoly:hemodialysis",        # FRESENIUS MEDICAL CARE 12.4B
}

# ──────────────────────────────────────────────────────────────────────────────
# TIER 2: Beneficiaries with Low Evidence
# Real companies that received inflated/direct-award contracts because a corrupt
# official favored them, but whose own active participation is unproven (low evidence).
# Keep in training at weight=0.1 — they represent a real but weak signal.
# ──────────────────────────────────────────────────────────────────────────────
LOW_EVIDENCE_BENEFICIARY_IDS = {
    19493: "beneficiary_low_evidence:brand_monopoly_diconsa",  # MARCAS NESTLE 5.2B
    3723:  "beneficiary_low_evidence:it_vendor_capture",       # HP MEXICO 10.4B
    45460: "beneficiary_low_evidence:govt_travel_capture",     # AEROMEXICO 5.8B
    4335:  "beneficiary_low_evidence:pharma_in_ghost_network", # LABORATORIOS PISA 55.6B
                                                               # (in IMSS ghost case with low evidence)
}

# Evidence strength → curriculum weight mapping
EVIDENCE_WEIGHT_MAP = {
    "confirmed_corrupt": 1.0,
    "direct":            1.0,
    "strong":            0.8,
    "high":              0.8,
    "medium":            0.5,
    "low":               0.2,
    "circumstantial":    0.15,
    "statistical":       0.1,
    "weak":              0.05,
}

# FP tier → curriculum weight override
FP_TIER_WEIGHT = {
    1: 0.0,   # Structural FP — exclude
    2: 0.1,   # Beneficiary low evidence
    3: 0.3,   # Captured participant medium evidence
    4: None,  # Active perpetrator — use evidence_strength map
}


def verify_gt_insert(conn, expected_case_id: str) -> bool:
    """
    H3 helper — call this immediately after INSERT OR IGNORE into ground_truth_cases.

    Checks whether expected_case_id now exists in ground_truth_cases.
    Prints a WARNING if the row is missing (silent INSERT OR IGNORE duplicate drop).
    Returns True if the case exists, False if it was silently dropped.

    Example usage in batch scripts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_cases (...) VALUES (...)")
        conn.commit()
        verify_gt_insert(conn, 'CASE-XYZ')
    """
    import logging
    _log = logging.getLogger(__name__)
    row = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_cases WHERE case_id = ?",
        (expected_case_id,)
    ).fetchone()
    exists = row[0] > 0
    if not exists:
        _log.warning(
            "INSERT OR IGNORE silently dropped case_id='%s' — "
            "a row with this case_id already exists or the INSERT violated a constraint.",
            expected_case_id,
        )
        print(f"[WARNING] verify_gt_insert: case_id='{expected_case_id}' NOT found after insert — possible silent duplicate drop.")
    else:
        print(f"[OK] verify_gt_insert: case_id='{expected_case_id}' confirmed in ground_truth_cases.")
    return exists


def assert_not_structural_fp(vendor_id: int, conn) -> None:
    """
    Guard — call before adding a vendor to ground_truth_vendors as an active
    perpetrator (tier 3/4).  Raises ValueError if the vendor is in the
    STRUCTURAL_FP_VENDOR_IDS list, which would contaminate training data.

    Structural FPs (BAXTER, FRESENIUS, INFRA SA DE CV, PRAXAIR MEXICO and
    others listed in STRUCTURAL_FP_VENDOR_IDS) must NEVER be inserted as
    positive training examples.  Their is_false_positive flag must stay 1 and
    their curriculum_weight must stay 0.0 unconditionally — not derived from
    evidence_strength.

    Example usage in batch scripts:
        assert_not_structural_fp(vendor_id, conn)
        conn.execute("INSERT OR IGNORE INTO ground_truth_vendors ...")
    """
    if vendor_id in STRUCTURAL_FP_VENDOR_IDS:
        reason = STRUCTURAL_FP_VENDOR_IDS[vendor_id]
        raise ValueError(
            f"vendor_id={vendor_id} is a structural FP ({reason}) and must not be "
            f"inserted as a positive training example. "
            f"curriculum_weight for structural FPs is always 0.0."
        )
    # Also check whether it's already tagged is_false_positive=1 in the DB
    row = conn.execute(
        "SELECT is_false_positive FROM ground_truth_vendors WHERE vendor_id = ? LIMIT 1",
        (vendor_id,)
    ).fetchone()
    if row is not None and row[0] == 1:
        raise ValueError(
            f"vendor_id={vendor_id} is already marked is_false_positive=1 in "
            f"ground_truth_vendors. Do not add it as a positive training example."
        )


def get_conn():
    return sqlite3.connect(DB_PATH)


def migrate(conn):
    """Add is_false_positive, fp_tier, fp_reason, curriculum_weight columns."""
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(ground_truth_vendors)")}

    added = []
    for col, defn in [
        ("is_false_positive", "INTEGER NOT NULL DEFAULT 0"),
        ("fp_tier",           "INTEGER"),          # 1-4
        ("fp_reason",         "VARCHAR"),
        ("fp_reviewed",       "INTEGER NOT NULL DEFAULT 0"),
        ("curriculum_weight", "REAL"),             # NULL = use evidence_strength map
    ]:
        if col not in existing:
            cur.execute(f"ALTER TABLE ground_truth_vendors ADD COLUMN {col} {defn}")
            added.append(col)

    conn.commit()
    if added:
        print(f"[migrate] Added columns: {', '.join(added)}")
    else:
        print("[migrate] Columns already exist — schema up to date.")


def detect(conn, dry_run=True):
    """
    Classify all GT vendors into tiers. Returns list of (vendor_id, case_id, tier, reason).
    """
    cur = conn.cursor()

    rows = cur.execute("""
        SELECT gtv.id, gtv.vendor_id, gtv.case_id, gtv.evidence_strength,
               v.name, v.is_ghost_company, v.ghost_probability,
               gtc.case_type, gtc.case_name, gtc.year_start, gtc.year_end,
               COALESCE(gtv.is_false_positive, 0) as current_fp,
               COALESCE(gtv.fp_tier, 0) as current_tier
        FROM ground_truth_vendors gtv
        JOIN vendors v ON v.id = gtv.vendor_id
        JOIN ground_truth_cases gtc ON gtc.id = gtv.case_id
        WHERE gtv.vendor_id IS NOT NULL
    """).fetchall()

    classifications = []
    for (row_id, vendor_id, case_id, evidence, vname,
         is_ghost, ghost_prob, case_type, case_name,
         yr_start, yr_end, cur_fp, cur_tier) in rows:

        # ── Tier 1: Structural Market FP ──────────────────────────────────
        # curriculum_weight is ALWAYS 0.0 for structural FPs — never derived
        # from evidence_strength, regardless of what the DB contains.
        if vendor_id in STRUCTURAL_FP_VENDOR_IDS:
            tier = 1
            is_fp = 1
            reason = STRUCTURAL_FP_VENDOR_IDS[vendor_id]
            weight = 0.0  # unconditional — do not change

        # ── Tier 2: Beneficiary, Low Evidence ─────────────────────────────
        elif vendor_id in LOW_EVIDENCE_BENEFICIARY_IDS:
            tier = 2
            is_fp = 0
            reason = LOW_EVIDENCE_BENEFICIARY_IDS[vendor_id]
            weight = 0.1

        # ── Tier 1 (rule-based): Ghost company = definitely not FP ─────────
        elif is_ghost == 1 or ghost_prob > 0.5:
            tier = 4
            is_fp = 0
            reason = "confirmed_ghost_company"
            weight = 1.0

        # ── Tier 3: Medium evidence, captured participant ──────────────────
        elif evidence in ("medium", "strong", "direct", "confirmed_corrupt", "high"):
            tier = 4 if evidence in ("confirmed_corrupt", "direct", "strong") else 3
            is_fp = 0
            reason = f"active_or_captured:{evidence}"
            weight = EVIDENCE_WEIGHT_MAP.get(evidence, 0.5)

        # ── Tier 2: Low/statistical evidence, non-ghost, monopoly case ─────
        elif evidence in ("low", "statistical", "circumstantial", "weak"):
            # Extra check: if case_type is monopoly AND low evidence → structural suspect
            if case_type in ("monopoly", "concentrated_monopoly") and evidence == "low":
                tier = 2
                is_fp = 0  # Keep, but note as potential structural
                reason = f"potential_structural_monopoly:{case_type}"
                weight = 0.1
            else:
                tier = 2
                is_fp = 0
                reason = f"beneficiary_low_evidence:{evidence}"
                weight = 0.1
        else:
            tier = 3
            is_fp = 0
            reason = f"default_medium:{evidence}"
            weight = EVIDENCE_WEIGHT_MAP.get(evidence, 0.3)

        classifications.append({
            "row_id": row_id,
            "vendor_id": vendor_id,
            "case_id": case_id,
            "vendor_name": vname,
            "case_name": case_name,
            "case_type": case_type,
            "evidence_strength": evidence,
            "tier": tier,
            "is_false_positive": is_fp,
            "fp_reason": reason,
            "curriculum_weight": weight,
            "year_start": yr_start,
            "year_end": yr_end,
            "changed": (is_fp != cur_fp or tier != cur_tier),
        })

    # ── Write report ───────────────────────────────────────────────────────
    REPORT_PATH.parent.mkdir(exist_ok=True)
    with open(REPORT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "vendor_id", "vendor_name", "case_id", "case_name", "case_type",
            "evidence_strength", "tier", "is_false_positive", "fp_reason",
            "curriculum_weight", "year_start", "year_end", "changed"
        ])
        writer.writeheader()
        for c in classifications:
            writer.writerow({k: v for k, v in c.items() if k != "row_id"})

    # ── Summary ────────────────────────────────────────────────────────────
    by_tier = {1: [], 2: [], 3: [], 4: []}
    for c in classifications:
        by_tier[c["tier"]].append(c)

    print("\n=== GT FP CLASSIFICATION SUMMARY ===")
    tier_labels = {
        1: "Structural FP (EXCLUDE)",
        2: "Beneficiary low evidence (weight=0.1)",
        3: "Captured participant (weight=0.3-0.5)",
        4: "Active perpetrator (weight=0.8-1.0)",
    }
    for t in range(1, 5):
        vendors = by_tier[t]
        fps = sum(1 for v in vendors if v["is_false_positive"])
        total_bn = sum(
            0 for v in vendors  # would need total_amount from join, skipping here
        )
        print(f"  Tier {t} — {tier_labels[t]}: {len(vendors)} vendor-case pairs, {fps} marked is_fp=1")

    changed = [c for c in classifications if c["changed"]]
    print(f"\n  Total changes: {len(changed)} vendor-case pairs")
    print(f"  Report written to: {REPORT_PATH}")

    # ── Apply ──────────────────────────────────────────────────────────────
    if not dry_run:
        cur2 = conn.cursor()
        for c in classifications:
            cur2.execute("""
                UPDATE ground_truth_vendors
                SET is_false_positive = ?,
                    fp_tier = ?,
                    fp_reason = ?,
                    curriculum_weight = ?,
                    fp_reviewed = 1
                WHERE id = ?
            """, (c["is_false_positive"], c["tier"], c["fp_reason"],
                  c["curriculum_weight"], c["row_id"]))
        conn.commit()
        print(f"\n  [apply] Updated {len(classifications)} rows in ground_truth_vendors.")
    else:
        print("\n  [dry-run] No changes written. Run with --apply to commit.")

    return classifications


def summary(conn):
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT
          fp_tier,
          is_false_positive,
          COUNT(*) as cnt,
          ROUND(AVG(COALESCE(curriculum_weight, 0.5)), 3) as avg_weight
        FROM ground_truth_vendors
        WHERE vendor_id IS NOT NULL AND fp_reviewed = 1
        GROUP BY fp_tier, is_false_positive
        ORDER BY fp_tier
    """).fetchall()

    if not rows:
        print("No classified rows found. Run --detect --apply first.")
        return

    print("\n=== GT FP FRAMEWORK STATUS ===")
    print(f"  {'Tier':<6} {'FP':>4} {'Count':>8} {'Avg Weight':>12}")
    print(f"  {'-'*40}")
    for tier, is_fp, cnt, avg_w in rows:
        print(f"  {tier or '?':<6} {'YES' if is_fp else 'no':>4} {cnt:>8} {avg_w:>12.3f}")

    # Training set impact
    excl = cur.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE is_false_positive=1 AND vendor_id IS NOT NULL"
    ).fetchone()[0]
    total = cur.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL"
    ).fetchone()[0]
    print(f"\n  Excluded from training: {excl}/{total} vendor-case pairs ({100*excl/total:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description="GT False-Positive Framework")
    parser.add_argument("--migrate",  action="store_true", help="Add schema columns")
    parser.add_argument("--detect",   action="store_true", help="Classify all vendors")
    parser.add_argument("--apply",    action="store_true", help="Write to DB (default: dry-run)")
    parser.add_argument("--summary",  action="store_true", help="Show classification summary")
    args = parser.parse_args()

    conn = get_conn()

    if args.migrate:
        migrate(conn)

    if args.detect:
        dry_run = not args.apply
        detect(conn, dry_run=dry_run)

    if args.summary:
        summary(conn)

    if not any([args.migrate, args.detect, args.summary]):
        parser.print_help()

    conn.close()


if __name__ == "__main__":
    main()
