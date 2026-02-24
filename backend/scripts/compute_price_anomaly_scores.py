"""
Compute Multi-Feature Price Anomaly Scores
==========================================
Uses Isolation Forest (multi-dimensional) to detect price anomalies at the
contract level, upgrading the existing univariate IQR-based approach.

For each sector (1-12):
  1. Load contracts joined with contract_z_features
  2. Fit an Isolation Forest on 6 price-relevant z-score features
  3. Compute anomaly scores for all contracts in that sector
  4. Write top 50 anomalies per sector to contract_ml_anomalies table
  5. Update price_hypotheses.ml_anomaly_score for matching contracts

Features used:
  z_price_ratio            - price relative to sector/year median
  z_vendor_concentration   - vendor's share of sector value
  z_ad_period_days         - advertisement period (shortened = suspicious)
  z_year_end               - year-end timing signal
  z_same_day_count         - threshold-splitting indicator
  z_price_hyp_confidence   - IQR outlier confidence signal

Algorithm:
  Isolation Forest (n_estimators=100, contamination=0.05, random_state=42)
  Scores inverted so that 1.0 = most anomalous, 0.0 = most normal.

Usage:
    python -m scripts.compute_price_anomaly_scores
    python -m scripts.compute_price_anomaly_scores --sectors 1 3 6
    python -m scripts.compute_price_anomaly_scores --top-n 100

Author: RUBLI Project
Date: 2026-02-23
"""

import sys
import sqlite3
import argparse
import logging
from pathlib import Path
from datetime import datetime

import numpy as np

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("WARNING: scikit-learn not found. Using fallback z-score anomaly detection.")

# =============================================================================
# CONFIGURATION
# =============================================================================

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Isolation Forest hyper-parameters (fixed for reproducibility)
IF_N_ESTIMATORS = 100
IF_CONTAMINATION = 0.05
IF_RANDOM_STATE = 42

# Number of top anomalies per sector to persist
DEFAULT_TOP_N = 50

# Max contracts to load per sector (prevents OOM on large sectors)
MAX_SAMPLE_SIZE = 200_000

# Z-score features to use for price anomaly detection.
# These are the 6 most relevant to price manipulation.
PRICE_FEATURES = [
    "z_price_ratio",
    "z_vendor_concentration",
    "z_ad_period_days",
    "z_year_end",
    "z_same_day_count",
    "z_price_hyp_confidence",
]

# All 16 available z-feature columns (for fallback existence check)
ALL_Z_FEATURES = [
    "z_single_bid",
    "z_direct_award",
    "z_price_ratio",
    "z_vendor_concentration",
    "z_ad_period_days",
    "z_year_end",
    "z_same_day_count",
    "z_network_member_count",
    "z_co_bid_rate",
    "z_price_hyp_confidence",
    "z_industry_mismatch",
    "z_institution_risk",
    "z_price_volatility",
    "z_sector_spread",
    "z_win_rate",
    "z_institution_diversity",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# =============================================================================
# SCHEMA
# =============================================================================

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS contract_ml_anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    sector_id INTEGER NOT NULL,
    anomaly_score REAL NOT NULL,
    iqr_flagged INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_id)
)
"""

CREATE_INDEX_CONTRACT_SQL = """
CREATE INDEX IF NOT EXISTS idx_ml_anomalies_contract
ON contract_ml_anomalies (contract_id)
"""

CREATE_INDEX_SECTOR_SQL = """
CREATE INDEX IF NOT EXISTS idx_ml_anomalies_sector_score
ON contract_ml_anomalies (sector_id, anomaly_score DESC)
"""

ADD_ML_SCORE_COLUMN_SQL = """
ALTER TABLE price_hypotheses ADD COLUMN ml_anomaly_score REAL
"""


# =============================================================================
# HELPERS
# =============================================================================

def ensure_schema(cursor: sqlite3.Cursor) -> None:
    """Create contract_ml_anomalies table and add ml_anomaly_score column if absent."""
    cursor.execute(CREATE_TABLE_SQL)
    cursor.execute(CREATE_INDEX_CONTRACT_SQL)
    cursor.execute(CREATE_INDEX_SECTOR_SQL)

    # Add ml_anomaly_score column to price_hypotheses if not already present
    cursor.execute("PRAGMA table_info(price_hypotheses)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "ml_anomaly_score" not in existing_cols:
        try:
            cursor.execute(ADD_ML_SCORE_COLUMN_SQL)
            logger.info("Added ml_anomaly_score column to price_hypotheses")
        except sqlite3.OperationalError as exc:
            # Column may have been added by a concurrent run; harmless
            logger.debug("ml_anomaly_score column already present or could not be added: %s", exc)


def detect_available_features(cursor: sqlite3.Cursor) -> list[str]:
    """Return the subset of PRICE_FEATURES that actually exist in contract_z_features."""
    cursor.execute("PRAGMA table_info(contract_z_features)")
    available = {row[1] for row in cursor.fetchall()}
    found = [f for f in PRICE_FEATURES if f in available]
    missing = [f for f in PRICE_FEATURES if f not in available]
    if missing:
        logger.warning("Z-feature columns not found in contract_z_features: %s", missing)
    logger.info("Using %d features: %s", len(found), found)
    return found


def normalize_scores(raw_scores: np.ndarray) -> np.ndarray:
    """
    Invert and normalize IF decision_function scores to [0, 1].
    Isolation Forest: more negative raw score = more anomalous.
    We return 1.0 for the most anomalous, 0.0 for the most normal.
    """
    lo, hi = raw_scores.min(), raw_scores.max()
    if hi == lo:
        return np.zeros_like(raw_scores)
    return 1.0 - (raw_scores - lo) / (hi - lo)


def fallback_anomaly_scores(X: np.ndarray) -> np.ndarray:
    """
    Pure-numpy fallback when sklearn is unavailable.
    Uses mean absolute z-score as a simple anomaly proxy.
    """
    means = np.mean(X, axis=0)
    stds = np.std(X, axis=0) + 1e-10
    z = np.abs((X - means) / stds)
    scores = np.mean(z, axis=1)
    max_s = scores.max()
    return scores / max_s if max_s > 0 else scores


def run_isolation_forest(X: np.ndarray) -> np.ndarray:
    """
    Fit Isolation Forest and return normalized anomaly scores (0-1, higher = more anomalous).
    Falls back to z-score method if sklearn is unavailable.
    """
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    if not HAS_SKLEARN:
        return fallback_anomaly_scores(X)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    clf = IsolationForest(
        n_estimators=IF_N_ESTIMATORS,
        contamination=IF_CONTAMINATION,
        random_state=IF_RANDOM_STATE,
        n_jobs=1,
    )
    clf.fit(X_scaled)
    raw = clf.decision_function(X_scaled)
    return normalize_scores(raw)


# =============================================================================
# SECTOR PROCESSING
# =============================================================================

def process_sector(
    conn: sqlite3.Connection,
    sector_id: int,
    features: list[str],
    top_n: int,
) -> int:
    """
    Run Isolation Forest for one sector and persist top_n anomalies.

    Returns:
        Number of anomaly records written.
    """
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # 1. Fetch sector name for logging
    # ------------------------------------------------------------------
    cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
    row = cursor.fetchone()
    sector_name = row[0] if row else f"sector_{sector_id}"
    logger.info("Processing sector %d (%s)", sector_id, sector_name)

    # ------------------------------------------------------------------
    # 2. Load contracts + z-features for this sector
    # ------------------------------------------------------------------
    feat_cols = ", ".join(f"zf.{f}" for f in features)
    cursor.execute(
        f"""
        SELECT
            c.id          AS contract_id,
            c.amount_mxn,
            {feat_cols}
        FROM contracts c
        JOIN contract_z_features zf ON zf.contract_id = c.id
        WHERE c.sector_id = ?
          AND c.amount_mxn > 0
          AND c.amount_mxn <= 100000000000
        """,
        (sector_id,),
    )
    rows = cursor.fetchall()

    if not rows:
        logger.warning("  No contracts with z-features found for sector %d", sector_id)
        return 0

    n_contracts = len(rows)
    logger.info("  Loaded %d contracts", n_contracts)

    # Random sample to avoid OOM on large sectors
    if n_contracts > MAX_SAMPLE_SIZE:
        rng = np.random.default_rng(42)
        indices = rng.choice(n_contracts, size=MAX_SAMPLE_SIZE, replace=False)
        rows = [rows[i] for i in sorted(indices)]
        logger.info("  Sampled down to %d contracts (OOM guard)", MAX_SAMPLE_SIZE)

    # ------------------------------------------------------------------
    # 3. Build feature matrix
    # ------------------------------------------------------------------
    contract_ids = [r[0] for r in rows]
    # Feature columns start at index 2 (after contract_id, amount_mxn)
    X = np.array([[float(r[i + 2] or 0) for i in range(len(features))] for r in rows])

    # ------------------------------------------------------------------
    # 4. Run Isolation Forest
    # ------------------------------------------------------------------
    scores = run_isolation_forest(X)
    logger.info(
        "  Anomaly scores: min=%.4f  max=%.4f  mean=%.4f",
        scores.min(), scores.max(), scores.mean(),
    )

    # ------------------------------------------------------------------
    # 5. Identify top_n anomalies
    # ------------------------------------------------------------------
    # argsort ascending; last top_n are highest scores
    top_indices = np.argsort(scores)[-top_n:][::-1]
    top_contract_ids = {contract_ids[i] for i in top_indices}

    # ------------------------------------------------------------------
    # 6. Find which top contracts are already in price_hypotheses (IQR)
    # ------------------------------------------------------------------
    if top_contract_ids:
        placeholders = ",".join("?" * len(top_contract_ids))
        cursor.execute(
            f"SELECT DISTINCT contract_id FROM price_hypotheses WHERE contract_id IN ({placeholders})",
            list(top_contract_ids),
        )
        iqr_flagged_ids = {r[0] for r in cursor.fetchall()}
    else:
        iqr_flagged_ids = set()

    # ------------------------------------------------------------------
    # 7. Upsert into contract_ml_anomalies
    # ------------------------------------------------------------------
    n_written = 0
    for idx in top_indices:
        cid = contract_ids[idx]
        score = float(scores[idx])
        iqr_flag = 1 if cid in iqr_flagged_ids else 0

        cursor.execute(
            """
            INSERT INTO contract_ml_anomalies (contract_id, sector_id, anomaly_score, iqr_flagged)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(contract_id) DO UPDATE SET
                sector_id    = excluded.sector_id,
                anomaly_score = excluded.anomaly_score,
                iqr_flagged  = excluded.iqr_flagged,
                created_at   = CURRENT_TIMESTAMP
            """,
            (cid, sector_id, score, iqr_flag),
        )
        n_written += 1

    conn.commit()

    # ------------------------------------------------------------------
    # 8. Update price_hypotheses.ml_anomaly_score for matching contracts
    # ------------------------------------------------------------------
    # Build a mapping: contract_id -> anomaly_score for ALL contracts (not just top_n)
    # Use len(contract_ids) not n_contracts — they differ after sampling
    score_map: dict[int, float] = {contract_ids[i]: float(scores[i]) for i in range(len(contract_ids))}

    # Fetch contract_ids from price_hypotheses in this sector
    cursor.execute(
        "SELECT DISTINCT contract_id FROM price_hypotheses WHERE sector_id = ?",
        (sector_id,),
    )
    hyp_contract_ids = [r[0] for r in cursor.fetchall()]

    # Batch update via executemany — ~100x faster than individual UPDATEs
    updates = [
        (score_map[cid], cid, sector_id)
        for cid in hyp_contract_ids
        if cid in score_map
    ]
    updated_hyp = len(updates)
    if updates:
        cursor.executemany(
            "UPDATE price_hypotheses SET ml_anomaly_score = ? WHERE contract_id = ? AND sector_id = ?",
            updates,
        )

    conn.commit()

    logger.info(
        "  Wrote %d ML anomaly records; updated %d price_hypotheses rows",
        n_written,
        updated_hyp,
    )
    return n_written


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compute multi-feature Isolation Forest price anomaly scores per sector."
    )
    parser.add_argument(
        "--sectors",
        nargs="+",
        type=int,
        default=list(range(1, 13)),
        metavar="SECTOR_ID",
        help="Sector IDs to process (default: all 12 sectors).",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=DEFAULT_TOP_N,
        metavar="N",
        help=f"Top N anomalies to persist per sector (default: {DEFAULT_TOP_N}).",
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("PRICE ANOMALY SCORER — Isolation Forest")
    logger.info("=" * 60)
    logger.info("Timestamp : %s", datetime.now().isoformat())
    logger.info("Database  : %s", DB_PATH)
    logger.info("Sectors   : %s", args.sectors)
    logger.info("Top-N     : %d", args.top_n)
    logger.info("sklearn   : %s", HAS_SKLEARN)
    logger.info("Features  : %s", PRICE_FEATURES)
    logger.info("")

    if not DB_PATH.exists():
        logger.error("Database not found: %s", DB_PATH)
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Performance pragmas (mirrors api/dependencies.py)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA cache_size = -200000")
    conn.execute("PRAGMA synchronous = NORMAL")

    cursor = conn.cursor()

    # Ensure schema exists
    ensure_schema(cursor)
    conn.commit()

    # Detect which features are actually available
    available_features = detect_available_features(cursor)
    if not available_features:
        logger.error(
            "No PRICE_FEATURES columns found in contract_z_features. "
            "Run compute_z_features.py first."
        )
        conn.close()
        sys.exit(1)

    # Validate sector IDs
    valid_sectors = list(range(1, 13))
    sectors_to_process = [s for s in args.sectors if s in valid_sectors]
    invalid = [s for s in args.sectors if s not in valid_sectors]
    if invalid:
        logger.warning("Ignoring invalid sector IDs: %s", invalid)
    if not sectors_to_process:
        logger.error("No valid sector IDs to process.")
        conn.close()
        sys.exit(1)

    # Process each sector
    total_written = 0
    start_time = datetime.now()

    for sector_id in sectors_to_process:
        written = process_sector(conn, sector_id, available_features, args.top_n)
        total_written += written

    elapsed = (datetime.now() - start_time).total_seconds()

    logger.info("")
    logger.info("=" * 60)
    logger.info("COMPLETED")
    logger.info("=" * 60)
    logger.info("Total ML anomaly records written : %d", total_written)
    logger.info("Elapsed time                     : %.1f s", elapsed)

    # Summary query
    cursor.execute(
        """
        SELECT
            COUNT(*)          AS total,
            SUM(iqr_flagged)  AS iqr_overlap,
            COUNT(*) - SUM(iqr_flagged) AS new_detections
        FROM contract_ml_anomalies
        """
    )
    row = cursor.fetchone()
    if row and row[0]:
        logger.info("Total in table  : %d", row[0])
        logger.info("IQR overlap     : %d", row[1] or 0)
        logger.info("New (ML-only)   : %d", row[2] or 0)

    conn.close()
    logger.info("Done.")


if __name__ == "__main__":
    main()
