"""
ARIA Schema Initializer — creates all ARIA database tables (idempotent).

Run from backend/ directory:
    python -m scripts.aria_init_schema
"""

import os
import sqlite3
import sys
from pathlib import Path

_default_db = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(_default_db)))


DDL_STATEMENTS = [
    # -------------------------------------------------------------------------
    # aria_runs — tracks each pipeline invocation
    # -------------------------------------------------------------------------
    """
    CREATE TABLE IF NOT EXISTS aria_runs (
        id TEXT PRIMARY KEY,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        status TEXT DEFAULT 'running',
        vendors_processed INTEGER DEFAULT 0,
        tier1_count INTEGER DEFAULT 0,
        tier2_count INTEGER DEFAULT 0,
        tier3_count INTEGER DEFAULT 0,
        tier4_count INTEGER DEFAULT 0,
        gt_auto_inserts INTEGER DEFAULT 0,
        gt_flags INTEGER DEFAULT 0,
        error_message TEXT,
        aria_version TEXT DEFAULT '1.0',
        config_snapshot TEXT
    )
    """,

    # -------------------------------------------------------------------------
    # aria_queue — one row per vendor per run (REPLACE for re-runs)
    # -------------------------------------------------------------------------
    """
    CREATE TABLE IF NOT EXISTS aria_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL UNIQUE,
        vendor_name TEXT,
        aria_run_id TEXT NOT NULL,

        -- IPS components
        risk_score_norm REAL,
        mahalanobis_norm REAL,
        ensemble_norm REAL,
        financial_scale_norm REAL,
        external_flags_score REAL,
        ips_raw REAL,
        ips_final REAL,
        ips_tier INTEGER,

        -- Pattern classification
        primary_pattern TEXT,
        pattern_confidence REAL,
        pattern_confidences TEXT,

        -- Intermediary signals
        burst_score REAL,
        activity_span_days INTEGER,
        value_per_contract REAL,
        is_disappeared INTEGER DEFAULT 0,

        -- External flags
        is_efos_definitivo INTEGER DEFAULT 0,
        is_sfp_sanctioned INTEGER DEFAULT 0,
        in_ground_truth INTEGER DEFAULT 0,
        efos_rfc TEXT,
        sfp_sanction_type TEXT,

        -- False positive screening
        fp_patent_exception INTEGER DEFAULT 0,
        fp_data_error INTEGER DEFAULT 0,
        fp_structural_monopoly INTEGER DEFAULT 0,
        fp_penalty REAL DEFAULT 0.0,

        -- Vendor profile (denormalised for fast API access)
        total_contracts INTEGER,
        total_value_mxn REAL,
        avg_risk_score REAL,
        max_risk_score REAL,
        primary_sector_id INTEGER,
        primary_sector_name TEXT,
        years_active INTEGER,
        direct_award_rate REAL,
        single_bid_rate REAL,
        top_institution TEXT,
        top_institution_ratio REAL,

        -- LLM memo (Phase 3)
        memo_text TEXT,
        memo_generated_at TIMESTAMP,

        -- Review workflow
        review_status TEXT DEFAULT 'pending',
        reviewer_name TEXT,
        reviewer_notes TEXT,
        reviewed_at TIMESTAMP,

        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    )
    """,

    # -------------------------------------------------------------------------
    # aria_gt_updates — ground truth auto-insert / flag log
    # -------------------------------------------------------------------------
    """
    CREATE TABLE IF NOT EXISTS aria_gt_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        vendor_name TEXT,
        action TEXT NOT NULL,
        confidence_level TEXT,
        match_confidence REAL,
        source TEXT NOT NULL,
        evidence_detail TEXT,
        review_status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        review_notes TEXT,
        aria_run_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,

    # -------------------------------------------------------------------------
    # aria_web_evidence — web search results (Phase 2+)
    # -------------------------------------------------------------------------
    """
    CREATE TABLE IF NOT EXISTS aria_web_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        aria_run_id TEXT NOT NULL,
        query TEXT NOT NULL,
        source_name TEXT,
        source_url TEXT,
        snippet TEXT,
        published_date TEXT,
        relevance_score REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    )
    """,
]

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_aria_queue_tier    ON aria_queue (ips_tier)",
    "CREATE INDEX IF NOT EXISTS idx_aria_queue_run     ON aria_queue (aria_run_id)",
    "CREATE INDEX IF NOT EXISTS idx_aria_queue_pattern ON aria_queue (primary_pattern)",
    "CREATE INDEX IF NOT EXISTS idx_aria_queue_efos    ON aria_queue (is_efos_definitivo)",
    "CREATE INDEX IF NOT EXISTS idx_aria_queue_gt      ON aria_queue (in_ground_truth)",
    "CREATE INDEX IF NOT EXISTS idx_aria_gt_vendor     ON aria_gt_updates (vendor_id)",
    "CREATE INDEX IF NOT EXISTS idx_aria_gt_run        ON aria_gt_updates (aria_run_id)",
    "CREATE INDEX IF NOT EXISTS idx_aria_web_vendor    ON aria_web_evidence (vendor_id)",
    "CREATE INDEX IF NOT EXISTS idx_aria_web_run       ON aria_web_evidence (aria_run_id)",
    "CREATE INDEX IF NOT EXISTS idx_aria_runs_status   ON aria_runs (status)",
]


def init_schema(db_path: Path = DB_PATH) -> None:
    if not db_path.exists():
        print(f"ERROR: Database not found: {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=300000")

    try:
        for ddl in DDL_STATEMENTS:
            conn.execute(ddl)

        for idx in INDEXES:
            conn.execute(idx)

        conn.commit()
    finally:
        conn.close()

    print("ARIA schema initialized.")


if __name__ == "__main__":
    init_schema()
