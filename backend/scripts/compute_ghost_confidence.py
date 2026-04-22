"""
compute_ghost_confidence.py — Multi-signal ghost company confidence scorer

Scores all ARIA P2 vendors (6,034) across 11 independent signals to produce
a ranked investigation queue with three confidence tiers:

  Tier I   confirmed   — externally verified (EFOS definitivo, SFP sanctioned)
  Tier II  multi_signal — 3+ independent signals converging, no external proof
  Tier III behavioral   — P2 pattern only; structural ghost indicators

Run:
    cd backend && python -m scripts.compute_ghost_confidence

Output table: ghost_confidence_scores
"""

import json
import logging
import sqlite3
from datetime import date, timedelta
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ---------------------------------------------------------------------------
# Signal weights
# ---------------------------------------------------------------------------
WEIGHTS = {
    "efos_definitivo":  4.0,   # SAT Art.69-B confirmed shell
    "sfp_sanctioned":   3.0,   # Federal sanctions registry
    "efos_soft":        2.0,   # SAT presunto / favorecido (under review)
    "p7_intersection":  2.0,   # P2 + P7 Intermediary overlap
    "disappeared":      2.0,   # Vendor vanished from market
    "invalid_rfc":      2.0,   # Malformed RFC (not just absent)
    "young_company":    1.0,   # Company <2yr old at first contract
    "high_risk":        1.0,   # max_risk_score >= 0.50
    "temporal_burst":   1.0,   # ≥50% of contracts in any 90-day window
    "ultra_micro":      0.5,   # ≤3 lifetime contracts
    "short_lived":      0.5,   # ≤1 year active
}

# ---------------------------------------------------------------------------
# Tier thresholds
# ---------------------------------------------------------------------------
def _tier(row: dict) -> str:
    if row["sig_efos_definitivo"] or row["sig_sfp_sanctioned"]:
        return "confirmed"
    if row["ghost_signal_count"] >= 3:
        return "multi_signal"
    return "behavioral"


# ---------------------------------------------------------------------------
# Temporal burst — compute per vendor from contracts table
# ---------------------------------------------------------------------------
def _compute_burst(conn: sqlite3.Connection, vendor_ids: list[int]) -> set[int]:
    """Return set of vendor_ids that show temporal burst (≥50% of contracts
    in any 90-day rolling window, minimum 3 contracts in window)."""
    log.info("Computing temporal burst for %d P2 vendors …", len(vendor_ids))
    burst_vendors: set[int] = set()

    # Fetch all contract dates grouped by vendor in a single query
    placeholders = ",".join("?" * len(vendor_ids))
    rows = conn.execute(
        f"""
        SELECT vendor_id, contract_date
        FROM contracts
        WHERE vendor_id IN ({placeholders})
          AND contract_date IS NOT NULL
        ORDER BY vendor_id, contract_date
        """,
        vendor_ids,
    ).fetchall()

    # Group by vendor
    from collections import defaultdict
    vendor_dates: dict[int, list[str]] = defaultdict(list)
    for vid, cd in rows:
        vendor_dates[vid].append(cd)

    window = timedelta(days=90)

    for vid, dates_raw in vendor_dates.items():
        total = len(dates_raw)
        if total < 3:
            continue
        # Parse dates — some may be "YYYY-MM-DD" or "YYYY/MM/DD"
        parsed: list[date] = []
        for d in dates_raw:
            if not d:
                continue
            try:
                clean = str(d)[:10].replace("/", "-")
                parsed.append(date.fromisoformat(clean))
            except (ValueError, TypeError):
                pass
        if len(parsed) < 3:
            continue
        parsed.sort()

        # Sliding window: for each start date, count contracts within 90 days
        max_in_window = 0
        j = 0
        for i, start in enumerate(parsed):
            end = start + window
            while j < len(parsed) and parsed[j] <= end:
                j += 1
            max_in_window = max(max_in_window, j - i)

        if max_in_window >= 3 and max_in_window / total >= 0.5:
            burst_vendors.add(vid)

    log.info("Temporal burst: %d vendors flagged", len(burst_vendors))
    return burst_vendors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def run() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # ── Fetch all P2 vendors with their ARIA + company_registry signals ──────
    log.info("Loading P2 vendors from aria_queue …")
    p2_rows = conn.execute(
        """
        SELECT
            aq.vendor_id,
            aq.vendor_name,
            aq.total_contracts,
            aq.total_value_mxn,
            aq.years_active,
            aq.avg_risk_score,
            aq.max_risk_score,
            aq.is_efos_definitivo,
            aq.is_sfp_sanctioned,
            aq.is_disappeared,
            aq.primary_sector_name,
            aq.top_institution,
            aq.pattern_confidences,
            cr.shell_flags,
            cr.efos_stage,
            cr.rfc_age_years
        FROM aria_queue aq
        LEFT JOIN company_registry cr ON cr.vendor_id = aq.vendor_id
        WHERE aq.primary_pattern = 'P2'
        """
    ).fetchall()

    vendor_ids = [r["vendor_id"] for r in p2_rows]
    log.info("Found %d P2 vendors", len(vendor_ids))

    # ── Temporal burst (computed separately from contracts table) ────────────
    burst_set = _compute_burst(conn, vendor_ids)

    # ── Score each vendor ─────────────────────────────────────────────────────
    log.info("Scoring vendors …")
    results: list[dict] = []
    for r in p2_rows:
        vid = r["vendor_id"]
        shell_flags: str = r["shell_flags"] or ""
        efos_stage: str = r["efos_stage"] or ""
        pattern_conf: dict = {}
        try:
            pattern_conf = json.loads(r["pattern_confidences"] or "{}")
        except (json.JSONDecodeError, TypeError):
            pass

        sigs = {
            "efos_definitivo":  int(r["is_efos_definitivo"] or 0),
            "sfp_sanctioned":   int(r["is_sfp_sanctioned"] or 0),
            "efos_soft":        int(efos_stage in ("presunto", "favorecido")),
            "p7_intersection":  int(float(pattern_conf.get("P7", 0)) > 0),
            "disappeared":      int(r["is_disappeared"] or 0),
            "invalid_rfc":      int("INVALID_RFC" in shell_flags),
            "young_company":    int(
                "YOUNG_COMPANY_2yr" in shell_flags
                or "NEW_COMPANY" in shell_flags
                or (r["rfc_age_years"] is not None and r["rfc_age_years"] < 2)
            ),
            "high_risk":        int(float(r["max_risk_score"] or 0) >= 0.50),
            "temporal_burst":   int(vid in burst_set),
            "ultra_micro":      int((r["total_contracts"] or 0) <= 3),
            "short_lived":      int((r["years_active"] or 0) <= 1),
        }

        score = sum(WEIGHTS[k] * v for k, v in sigs.items())
        signal_count = sum(1 for v in sigs.values() if v)

        rec = {
            "vendor_id":            vid,
            "vendor_name":          r["vendor_name"],
            "ghost_signal_count":   signal_count,
            "ghost_confidence_score": round(score, 2),
            "ghost_confidence_tier": None,  # filled below
            "sig_efos_definitivo":  sigs["efos_definitivo"],
            "sig_efos_soft":        sigs["efos_soft"],
            "sig_sfp_sanctioned":   sigs["sfp_sanctioned"],
            "sig_disappeared":      sigs["disappeared"],
            "sig_p7_intersection":  sigs["p7_intersection"],
            "sig_invalid_rfc":      sigs["invalid_rfc"],
            "sig_young_company":    sigs["young_company"],
            "sig_high_risk":        sigs["high_risk"],
            "sig_ultra_micro":      sigs["ultra_micro"],
            "sig_short_lived":      sigs["short_lived"],
            "sig_temporal_burst":   sigs["temporal_burst"],
            "total_contracts":      r["total_contracts"],
            "total_value_mxn":      r["total_value_mxn"],
            "years_active":         r["years_active"],
            "avg_risk_score":       r["avg_risk_score"],
            "primary_sector_name":  r["primary_sector_name"],
            "top_institution":      r["top_institution"],
            "shell_flags":          shell_flags,
            "efos_stage":           efos_stage or None,
        }
        rec["ghost_confidence_tier"] = _tier(rec)
        results.append(rec)

    # ── Write to DB ────────────────────────────────────────────────────────────
    log.info("Writing ghost_confidence_scores table …")
    conn.execute("DROP TABLE IF EXISTS ghost_confidence_scores")
    conn.execute(
        """
        CREATE TABLE ghost_confidence_scores (
            vendor_id               INTEGER PRIMARY KEY,
            vendor_name             TEXT,
            ghost_signal_count      INTEGER DEFAULT 0,
            ghost_confidence_score  REAL    DEFAULT 0.0,
            ghost_confidence_tier   TEXT,
            sig_efos_definitivo     INTEGER DEFAULT 0,
            sig_efos_soft           INTEGER DEFAULT 0,
            sig_sfp_sanctioned      INTEGER DEFAULT 0,
            sig_disappeared         INTEGER DEFAULT 0,
            sig_p7_intersection     INTEGER DEFAULT 0,
            sig_invalid_rfc         INTEGER DEFAULT 0,
            sig_young_company       INTEGER DEFAULT 0,
            sig_high_risk           INTEGER DEFAULT 0,
            sig_ultra_micro         INTEGER DEFAULT 0,
            sig_short_lived         INTEGER DEFAULT 0,
            sig_temporal_burst      INTEGER DEFAULT 0,
            total_contracts         INTEGER,
            total_value_mxn         REAL,
            years_active            INTEGER,
            avg_risk_score          REAL,
            primary_sector_name     TEXT,
            top_institution         TEXT,
            shell_flags             TEXT,
            efos_stage              TEXT,
            computed_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        "CREATE INDEX idx_gcs_tier ON ghost_confidence_scores(ghost_confidence_tier)"
    )
    conn.execute(
        "CREATE INDEX idx_gcs_score ON ghost_confidence_scores(ghost_confidence_score DESC)"
    )

    cols = [
        "vendor_id", "vendor_name", "ghost_signal_count", "ghost_confidence_score",
        "ghost_confidence_tier", "sig_efos_definitivo", "sig_efos_soft",
        "sig_sfp_sanctioned", "sig_disappeared", "sig_p7_intersection",
        "sig_invalid_rfc", "sig_young_company", "sig_high_risk",
        "sig_ultra_micro", "sig_short_lived", "sig_temporal_burst",
        "total_contracts", "total_value_mxn", "years_active", "avg_risk_score",
        "primary_sector_name", "top_institution", "shell_flags", "efos_stage",
    ]
    placeholders = ",".join("?" * len(cols))
    conn.executemany(
        f"INSERT INTO ghost_confidence_scores ({','.join(cols)}) VALUES ({placeholders})",
        [[rec[c] for c in cols] for rec in results],
    )
    conn.commit()
    conn.close()

    # ── Summary ────────────────────────────────────────────────────────────────
    confirmed   = sum(1 for r in results if r["ghost_confidence_tier"] == "confirmed")
    multi       = sum(1 for r in results if r["ghost_confidence_tier"] == "multi_signal")
    behavioral  = sum(1 for r in results if r["ghost_confidence_tier"] == "behavioral")

    log.info("─" * 60)
    log.info("Ghost confidence scoring complete — %d P2 vendors", len(results))
    log.info("  Tier I  confirmed    : %d", confirmed)
    log.info("  Tier II multi_signal : %d", multi)
    log.info("  Tier III behavioral  : %d", behavioral)

    # Top 10 multi-signal for spot-check
    top = sorted(
        [r for r in results if r["ghost_confidence_tier"] in ("confirmed", "multi_signal")],
        key=lambda r: r["ghost_confidence_score"],
        reverse=True,
    )[:10]
    log.info("Top 10 by score:")
    for r in top:
        sigs = [k[4:] for k in cols if k.startswith("sig_") and r[k]]
        log.info(
            "  %-40s  score=%.1f tier=%-12s sigs=%s",
            (r["vendor_name"] or "")[:40],
            r["ghost_confidence_score"],
            r["ghost_confidence_tier"],
            ",".join(sigs),
        )
    log.info("─" * 60)


if __name__ == "__main__":
    run()
