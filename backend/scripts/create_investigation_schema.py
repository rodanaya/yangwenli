"""
Investigation Case Generator Schema
===================================
Creates the database schema for the investigation case generator feature.

Tables:
- investigation_cases: Aggregated suspicious patterns for investigation
- case_vendors: Vendors associated with each case
- case_contracts: Contracts associated with each case
- case_questions: Investigation questions for each case

Author: Yang Wen-li Project
Date: 2026-02-03
"""

import sqlite3
import os
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# =============================================================================
# SCHEMA DDL
# =============================================================================

INVESTIGATION_SCHEMA_DDL = """
-- =============================================================================
-- INVESTIGATION CASE GENERATOR SCHEMA
-- Version: 1.0
-- Description: Tables for ML-driven investigation case generation
-- =============================================================================

-- Main investigation cases table
CREATE TABLE IF NOT EXISTS investigation_cases (
    id INTEGER PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,          -- 'CASE-SAL-2024-00001'
    case_type VARCHAR(50) NOT NULL,               -- 'vendor_network', 'single_vendor', 'price_ring', 'corporate_group'
    primary_sector_id INTEGER,                    -- Main sector (1=Salud, 3=Infraestructura)

    -- Scoring
    suspicion_score REAL NOT NULL,                -- 0-1 final ensemble score
    anomaly_score REAL,                           -- Raw Isolation Forest anomaly score
    confidence REAL NOT NULL,                     -- Confidence in the case (0-1)

    -- Summary (qualitative dossier)
    title VARCHAR(500),                           -- Human-readable case title
    summary TEXT,                                 -- 1-2 paragraph executive summary
    narrative TEXT,                               -- Full markdown investigation dossier

    -- Scope metrics
    total_contracts INTEGER,                      -- Number of contracts in the case
    total_value_mxn REAL,                         -- Total contract value in MXN
    estimated_loss_mxn REAL,                      -- Estimated corruption loss
    date_range_start DATE,                        -- Earliest contract date
    date_range_end DATE,                          -- Latest contract date

    -- Signals and risk factors (JSON arrays)
    signals_triggered TEXT,                       -- JSON: ['single_bid', 'price_anomaly', ...]
    risk_factor_counts TEXT,                      -- JSON: {'single_bid': 45, 'direct_award': 123, ...}

    -- Review & Validation
    priority INTEGER DEFAULT 0,                   -- 1-5 (5=highest priority for investigation)
    is_reviewed INTEGER DEFAULT 0,                -- Has human reviewed this case?
    validation_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'corroborated', 'refuted', 'inconclusive'
    review_notes TEXT,                            -- Human reviewer notes
    external_sources TEXT,                        -- JSON: suggested search queries
    news_hits TEXT,                               -- JSON: found news articles

    -- Metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(100),

    FOREIGN KEY (primary_sector_id) REFERENCES sectors(id)
);

-- Case vendors junction table
CREATE TABLE IF NOT EXISTS case_vendors (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,                    -- 'primary_suspect', 'network_member', 'co_bidder', 'corporate_sibling'

    -- Vendor-specific metrics within this case
    contract_count INTEGER,
    contract_value_mxn REAL,
    single_bid_count INTEGER,
    direct_award_count INTEGER,
    avg_risk_score REAL,
    price_hypothesis_count INTEGER,

    -- Network position
    network_centrality REAL,                      -- Centrality score within the case network
    co_bidder_count INTEGER,                      -- Number of co-bidders in the case

    UNIQUE(case_id, vendor_id),
    FOREIGN KEY (case_id) REFERENCES investigation_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Case contracts junction table
CREATE TABLE IF NOT EXISTS case_contracts (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    contract_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,                    -- 'primary_evidence', 'supporting', 'context'

    -- Contract-specific flags within this case
    risk_factors TEXT,                            -- JSON: ['single_bid', 'year_end', ...]
    price_hypothesis_type VARCHAR(50),            -- 'extreme_overpricing', 'statistical_outlier', etc.
    price_hypothesis_confidence REAL,

    UNIQUE(case_id, contract_id),
    FOREIGN KEY (case_id) REFERENCES investigation_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Investigation questions for each case
CREATE TABLE IF NOT EXISTS case_questions (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL,           -- 'pricing', 'relationships', 'timing', 'procedures', 'network'
    question_text TEXT NOT NULL,                  -- The actual investigation question
    supporting_evidence TEXT,                     -- JSON: evidence supporting this question
    priority INTEGER DEFAULT 1,                   -- Question priority (1-5)

    FOREIGN KEY (case_id) REFERENCES investigation_cases(id) ON DELETE CASCADE
);

-- Vendor feature matrix for ML (extracted features per vendor)
CREATE TABLE IF NOT EXISTS vendor_investigation_features (
    id INTEGER PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    sector_id INTEGER NOT NULL,                   -- Features are sector-specific

    -- Volume features
    total_contracts INTEGER,
    total_value_mxn REAL,
    avg_contract_value REAL,
    contract_value_std REAL,
    contract_value_cv REAL,                       -- Coefficient of variation

    -- Risk features
    avg_risk_score REAL,
    max_risk_score REAL,
    high_risk_ratio REAL,                         -- % contracts with risk > 0.4
    critical_risk_ratio REAL,                     -- % contracts with risk > 0.6

    -- Procedure features
    direct_award_ratio REAL,
    single_bid_ratio REAL,
    open_tender_ratio REAL,

    -- Price features
    price_hypothesis_count INTEGER,
    high_conf_hypothesis_count INTEGER,           -- confidence >= 0.85
    max_hypothesis_confidence REAL,
    avg_price_ratio REAL,                         -- avg(contract_value / sector_median)

    -- Temporal features
    december_ratio REAL,                          -- % contracts in December
    q4_ratio REAL,                                -- % contracts in Q4
    contract_velocity REAL,                       -- Contracts per year of activity
    years_active INTEGER,
    sudden_growth_indicator REAL,                 -- Year-over-year growth anomaly

    -- Concentration features
    institution_count INTEGER,
    institution_hhi REAL,                         -- Herfindahl-Hirschman Index for institutions
    top_institution_ratio REAL,                   -- % contracts with top institution
    sector_concentration REAL,                    -- How concentrated in this sector

    -- Network features
    co_bidder_count INTEGER,
    related_vendor_count INTEGER,                 -- Via corporate groups, shared addresses
    network_cluster_size INTEGER,
    network_centrality REAL,

    -- Mismatch features
    sector_mismatch_ratio REAL,                   -- % contracts outside vendor's primary industry

    -- ML scores (filled in by anomaly detector)
    isolation_forest_score REAL,                  -- Raw IF score (-1 to 1)
    anomaly_score REAL,                           -- Normalized 0-1 anomaly score
    ensemble_score REAL,                          -- Final ensemble score

    -- SHAP explainability (filled in by anomaly detector v2)
    shap_values TEXT,                             -- JSON: {feature_name: contribution, ...}
    top_features TEXT,                            -- JSON: [{feature, contribution, value, comparison}, ...]
    explanation TEXT,                             -- Human-readable explanation of why flagged

    -- Metadata
    feature_version VARCHAR(20),                  -- Feature extraction version
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(vendor_id, sector_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Feature importance table (global feature ranking by sector)
CREATE TABLE IF NOT EXISTS feature_importance (
    id INTEGER PRIMARY KEY,
    sector_id INTEGER NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    importance REAL NOT NULL,                     -- Importance value (method-specific)
    rank INTEGER NOT NULL,                        -- Rank within sector (1=most important)
    method VARCHAR(50) NOT NULL,                  -- 'isolation_forest', 'permutation', 'shap'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sector_id, feature_name, method),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Model comparison results
CREATE TABLE IF NOT EXISTS model_comparison (
    id INTEGER PRIMARY KEY,
    sector_id INTEGER NOT NULL,
    model_name VARCHAR(50) NOT NULL,              -- 'isolation_forest', 'lof', 'ocsvm', 'elliptic'
    anomalies_detected INTEGER,
    overlap_with_if REAL,                         -- % overlap with Isolation Forest top anomalies
    avg_score REAL,
    max_score REAL,
    execution_time_seconds REAL,
    parameters TEXT,                              -- JSON: model parameters used
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sector_id, model_name),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_investigation_cases_sector ON investigation_cases(primary_sector_id);
CREATE INDEX IF NOT EXISTS idx_investigation_cases_score ON investigation_cases(suspicion_score DESC);
CREATE INDEX IF NOT EXISTS idx_investigation_cases_type ON investigation_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_investigation_cases_status ON investigation_cases(validation_status);
CREATE INDEX IF NOT EXISTS idx_investigation_cases_priority ON investigation_cases(priority DESC);

CREATE INDEX IF NOT EXISTS idx_case_vendors_case ON case_vendors(case_id);
CREATE INDEX IF NOT EXISTS idx_case_vendors_vendor ON case_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_case_vendors_role ON case_vendors(role);

CREATE INDEX IF NOT EXISTS idx_case_contracts_case ON case_contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_case_contracts_contract ON case_contracts(contract_id);

CREATE INDEX IF NOT EXISTS idx_case_questions_case ON case_questions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_questions_type ON case_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_vendor_features_vendor ON vendor_investigation_features(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_features_sector ON vendor_investigation_features(sector_id);
CREATE INDEX IF NOT EXISTS idx_vendor_features_anomaly ON vendor_investigation_features(anomaly_score DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_features_ensemble ON vendor_investigation_features(ensemble_score DESC);

CREATE INDEX IF NOT EXISTS idx_feature_importance_sector ON feature_importance(sector_id);
CREATE INDEX IF NOT EXISTS idx_feature_importance_method ON feature_importance(method);
CREATE INDEX IF NOT EXISTS idx_feature_importance_rank ON feature_importance(sector_id, rank);

CREATE INDEX IF NOT EXISTS idx_model_comparison_sector ON model_comparison(sector_id);
"""


def create_schema():
    """Create the investigation case schema."""
    print(f"Connecting to database: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Creating investigation case schema...")
        cursor.executescript(INVESTIGATION_SCHEMA_DDL)
        conn.commit()

        # Verify tables were created
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name IN (
                'investigation_cases', 'case_vendors',
                'case_contracts', 'case_questions',
                'vendor_investigation_features',
                'feature_importance', 'model_comparison'
            )
        """)
        tables = [row[0] for row in cursor.fetchall()]

        print(f"\nCreated tables: {', '.join(tables)}")

        # Count indexes
        cursor.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='index' AND name LIKE 'idx_investigation%' OR name LIKE 'idx_case_%' OR name LIKE 'idx_vendor_features%'
        """)
        index_count = cursor.fetchone()[0]
        print(f"Created {index_count} indexes")

        print("\nSchema creation successful!")
        return True

    except Exception as e:
        print(f"ERROR: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def verify_schema():
    """Verify the schema was created correctly."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\n" + "="*60)
    print("SCHEMA VERIFICATION")
    print("="*60)

    tables_to_check = [
        'investigation_cases',
        'case_vendors',
        'case_contracts',
        'case_questions',
        'vendor_investigation_features'
    ]

    for table in tables_to_check:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()

        if columns:
            print(f"\n{table}:")
            for col in columns:
                cid, name, dtype, notnull, default, pk = col
                flags = []
                if pk:
                    flags.append("PK")
                if notnull:
                    flags.append("NOT NULL")
                if default:
                    flags.append(f"DEFAULT {default}")
                flag_str = f" ({', '.join(flags)})" if flags else ""
                print(f"  - {name}: {dtype}{flag_str}")
        else:
            print(f"\n{table}: NOT FOUND!")

    conn.close()


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION CASE GENERATOR - SCHEMA CREATION")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Database: {DB_PATH}")
    print()

    success = create_schema()

    if success:
        verify_schema()
