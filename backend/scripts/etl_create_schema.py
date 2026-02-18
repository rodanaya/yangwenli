"""
Yang Wen-li: Normalized Database Schema Creation
=================================================
Creates the RUBLI_NORMALIZED.db with a 3-level sector taxonomy
optimized for fraud detection analytics.

Schema Design Decisions (documented in docs/SCHEMA_DECISIONS.md):
1. risk_scores: Separate table for model versioning
2. financial_metrics: Separate table for USD/inflation adjustments
3. vendors: Normalized, aggregates computed via views

Tables:
- sectors: 12 main government sectors
- sub_sectors: ~40 sub-sector classifications
- categories: Partida-based granular categories
- ramos: Government branch reference
- vendors: Normalized vendor entities (no aggregates)
- institutions: Normalized government institutions
- contracting_units: Contracting unit entities
- contracts: Main fact table (no risk scores)
- risk_scores: Model-versioned risk calculations
- financial_metrics: USD conversion and inflation data
- exchange_rates: Reference table for rates

Author: Yang Wen-li Project
Date: 2026-01-06
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Optional

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')
DATA_DIR = os.path.join(BACKEND_DIR, 'data')

# =============================================================================
# SCHEMA DDL
# =============================================================================

SCHEMA_DDL = """
-- =============================================================================
-- RUBLI_NORMALIZED.db - Normalized Procurement Database Schema
-- Version: 1.0
-- Description: Multi-level sector taxonomy with analytics-first design
-- =============================================================================

-- =============================================================================
-- REFERENCE TABLES (Lookup/Dimension Tables)
-- =============================================================================

-- Level 1: Main Sectors (12 sectors)
CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    acronym VARCHAR(10),
    color VARCHAR(7),
    description_es TEXT,
    description_en TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Level 2: Sub-Sectors
CREATE TABLE IF NOT EXISTS sub_sectors (
    id INTEGER PRIMARY KEY,
    sector_id INTEGER NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    color VARCHAR(7),
    description_es TEXT,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Level 3: Categories (Partida Especifica mappings)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    sub_sector_id INTEGER,
    sector_id INTEGER NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    partida_pattern VARCHAR(20),
    name_es VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sub_sector_id) REFERENCES sub_sectors(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Ramo (Government Branch) Reference Table
CREATE TABLE IF NOT EXISTS ramos (
    id INTEGER PRIMARY KEY,
    clave VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    sector_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- =============================================================================
-- BILINGUAL LOOKUP TABLES (Spanish/English translations)
-- =============================================================================

-- Procedure Types (Tipo de Procedimiento)
CREATE TABLE IF NOT EXISTS procedure_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_es TEXT,
    description_en TEXT,
    is_direct_award INTEGER DEFAULT 0,
    is_competitive INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contract Types (Tipo de Contrato)
CREATE TABLE IF NOT EXISTS contract_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_es TEXT,
    description_en TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status Codes (Estatus del Contrato)
CREATE TABLE IF NOT EXISTS status_codes (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_es TEXT,
    description_en TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INSTITUTION CLASSIFICATION TABLES (18-Type Taxonomy v2.0)
-- =============================================================================

-- Institution Types (19 types including 'other')
-- Aligned with IMF CRI and OECD corruption risk baselines
CREATE TABLE IF NOT EXISTS institution_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_es TEXT,
    description_en TEXT,
    risk_baseline REAL DEFAULT 0.25,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Size Tiers (based on procurement volume)
-- Risk adjustments based on oversight capacity vs. procurement volume
CREATE TABLE IF NOT EXISTS size_tiers (
    id INTEGER PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_es VARCHAR(50) NOT NULL,
    name_en VARCHAR(50),
    min_contracts INTEGER,
    max_contracts INTEGER,
    risk_adjustment REAL DEFAULT 0.0,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Autonomy Levels (budget independence)
-- Based on Mexican constitutional/legal structure
CREATE TABLE IF NOT EXISTS autonomy_levels (
    id INTEGER PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_es TEXT,
    description_en TEXT,
    risk_baseline REAL DEFAULT 0.20,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENTITY TABLES (Normalized Vendors and Institutions)
-- =============================================================================

-- Normalized Vendors Table
-- NOTE: Aggregates also computed via v_vendor_stats view for real-time queries
-- These columns are updated by ETL for performance on large result sets
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY,
    rfc VARCHAR(13),
    name VARCHAR(500) NOT NULL,
    name_normalized VARCHAR(500),
    size_stratification VARCHAR(50),
    country_code VARCHAR(5) DEFAULT 'MX',
    is_verified_sat INTEGER DEFAULT 0,
    is_ghost_company INTEGER DEFAULT 0,
    ghost_probability REAL DEFAULT 0.0,
    -- Aggregate columns (updated by ETL pipeline)
    total_contracts INTEGER DEFAULT 0,
    total_amount_mxn REAL DEFAULT 0.0,
    first_contract_date DATE,
    last_contract_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Normalized Institutions Table
-- Enhanced with 18-type taxonomy v2.0 dimensions
CREATE TABLE IF NOT EXISTS institutions (
    id INTEGER PRIMARY KEY,
    siglas VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    name_normalized VARCHAR(500),
    tipo VARCHAR(100),
    ramo_id INTEGER,
    sector_id INTEGER,
    clave_institucion VARCHAR(20),
    gobierno_nivel VARCHAR(50),

    -- Institution Classification (v2.0 taxonomy)
    institution_type_id INTEGER,           -- FK to institution_types (19 types)
    institution_type VARCHAR(30),          -- Denormalized code for fast queries
    size_tier_id INTEGER,                  -- FK to size_tiers
    size_tier VARCHAR(20),                 -- Denormalized code for fast queries
    autonomy_level_id INTEGER,             -- FK to autonomy_levels
    autonomy_level VARCHAR(30),            -- Denormalized code for fast queries
    is_legally_decentralized INTEGER DEFAULT 0,  -- Mexican legal "organismo descentralizado"
    classification_method VARCHAR(100),    -- How classification was determined
    classification_confidence REAL DEFAULT 0.0,  -- Confidence score 0.0-1.0

    -- Aggregate stats (updated by ETL pipeline)
    total_contracts INTEGER DEFAULT 0,
    total_amount_mxn REAL DEFAULT 0.0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ramo_id) REFERENCES ramos(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id),
    FOREIGN KEY (institution_type_id) REFERENCES institution_types(id),
    FOREIGN KEY (size_tier_id) REFERENCES size_tiers(id),
    FOREIGN KEY (autonomy_level_id) REFERENCES autonomy_levels(id)
);

-- Contracting Units (UC) Table
CREATE TABLE IF NOT EXISTS contracting_units (
    id INTEGER PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    clave_uc VARCHAR(20),
    nombre VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- =============================================================================
-- MAIN CONTRACTS TABLE (Fact Table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY,

    -- Source tracking
    source_file VARCHAR(100),
    source_structure CHAR(1),
    source_year INTEGER,

    -- Foreign Keys (normalized)
    vendor_id INTEGER,
    institution_id INTEGER,
    contracting_unit_id INTEGER,
    sector_id INTEGER,
    sub_sector_id INTEGER,
    category_id INTEGER,
    ramo_id INTEGER,

    -- Contract identification
    contract_number VARCHAR(200),
    procedure_number VARCHAR(200),
    expedient_code VARCHAR(200),

    -- Contract details
    title VARCHAR(1000),
    description TEXT,
    partida_especifica VARCHAR(20),

    -- Procedure information
    procedure_type VARCHAR(100),
    procedure_type_normalized VARCHAR(50),
    contract_type VARCHAR(100),
    contract_type_normalized VARCHAR(50),
    procedure_character VARCHAR(100),
    participation_form VARCHAR(100),

    -- Dates
    contract_date DATE,
    start_date DATE,
    end_date DATE,
    award_date DATE,
    publication_date DATE,

    -- Financial
    amount_mxn REAL,
    amount_original REAL,
    currency VARCHAR(10) DEFAULT 'MXN',

    -- Contract year (computed for fast filtering)
    contract_year INTEGER,
    contract_month INTEGER,

    -- Flags
    is_direct_award INTEGER DEFAULT 0,
    is_single_bid INTEGER DEFAULT 0,
    is_framework INTEGER DEFAULT 0,
    is_consolidated INTEGER DEFAULT 0,
    is_multiannual INTEGER DEFAULT 0,
    is_high_value INTEGER DEFAULT 0,
    is_year_end INTEGER DEFAULT 0,

    -- NOTE: Risk scores moved to separate risk_scores table
    -- This enables model versioning, A/B testing, and recalculation

    -- Deduplication
    contract_hash VARCHAR(64),

    -- Metadata
    url VARCHAR(1000),
    contract_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (contracting_unit_id) REFERENCES contracting_units(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id),
    FOREIGN KEY (sub_sector_id) REFERENCES sub_sectors(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (ramo_id) REFERENCES ramos(id)
);

-- =============================================================================
-- RISK SCORES TABLE (Separate for model versioning)
-- =============================================================================

CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER NOT NULL UNIQUE,
    model_version VARCHAR(20) DEFAULT 'v1.0',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Overall score
    risk_score REAL DEFAULT 0.0,
    risk_level VARCHAR(20),  -- 'low', 'medium', 'high', 'critical'

    -- 10-factor breakdown (IMF CRI aligned)
    single_bid_score REAL DEFAULT 0.0,        -- 15%: Competitive with 1 bidder
    direct_award_score REAL DEFAULT 0.0,      -- 15%: Non-open procedure
    price_anomaly_score REAL DEFAULT 0.0,     -- 15%: Z-score deviation
    vendor_concentration_score REAL DEFAULT 0.0,  -- 10%: Vendor dominance
    short_ad_period_score REAL DEFAULT 0.0,   -- 10%: < 15 day advertisement
    short_decision_score REAL DEFAULT 0.0,    -- 10%: Quick award decision
    year_end_score REAL DEFAULT 0.0,          -- 5%: Nov/Dec spending surge
    modification_score REAL DEFAULT 0.0,      -- 10%: Contract amendments
    threshold_split_score REAL DEFAULT 0.0,   -- 5%: Just-under threshold
    network_risk_score REAL DEFAULT 0.0,      -- 5%: Relationship patterns

    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- =============================================================================
-- FINANCIAL METRICS TABLE (Separate for recalculation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS financial_metrics (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER NOT NULL UNIQUE,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- USD conversion
    amount_usd REAL,
    exchange_rate_used REAL,
    exchange_rate_date DATE,

    -- Inflation adjustment (to 2024 base)
    amount_mxn_2024 REAL,       -- Inflation-adjusted MXN
    amount_usd_2024 REAL,       -- Inflation-adjusted USD
    inpc_factor REAL,           -- INEGI INPC multiplier
    cpi_factor REAL,            -- US CPI multiplier (for USD)

    -- Loss estimation (based on risk score)
    estimated_loss_mxn REAL,
    estimated_loss_usd REAL,
    loss_rate_applied REAL,     -- Risk-based loss rate

    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- =============================================================================
-- EXCHANGE RATES REFERENCE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    -- Banxico FIX rate (MXN per USD)
    mxn_usd_fix REAL,

    -- INEGI INPC (Mexico Consumer Price Index, base Dec 2024 = 100)
    mxn_inpc REAL,

    -- US BLS CPI (for USD inflation, base Dec 2024 = 100)
    us_cpi REAL,

    source VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(year, month)
);

-- =============================================================================
-- VENDOR STATS TABLE (Pre-computed aggregates for fast vendor queries)
-- =============================================================================

-- Physical vendor_stats table for O(1) vendor list queries
-- Replaces slow v_vendor_stats view that recalculates across 3.1M contracts
CREATE TABLE IF NOT EXISTS vendor_stats (
    vendor_id INTEGER PRIMARY KEY,
    total_contracts INTEGER DEFAULT 0,
    total_value_mxn REAL DEFAULT 0.0,
    avg_risk_score REAL DEFAULT 0.0,
    high_risk_pct REAL DEFAULT 0.0,
    direct_award_pct REAL DEFAULT 0.0,
    single_bid_pct REAL DEFAULT 0.0,
    first_contract_year INTEGER,
    last_contract_year INTEGER,
    sector_count INTEGER DEFAULT 0,
    institution_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Indexes for fast sorting and filtering on vendor_stats
CREATE INDEX IF NOT EXISTS idx_vendor_stats_contracts ON vendor_stats(total_contracts);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_value ON vendor_stats(total_value_mxn);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_risk ON vendor_stats(avg_risk_score);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_high_risk ON vendor_stats(high_risk_pct);

-- =============================================================================
-- INDEXES FOR FAST ANALYTICS
-- =============================================================================

-- Primary dimension indexes
CREATE INDEX IF NOT EXISTS idx_contracts_sector ON contracts(sector_id);
CREATE INDEX IF NOT EXISTS idx_contracts_sub_sector ON contracts(sub_sector_id);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_institution ON contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_contracts_ramo ON contracts(ramo_id);

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_contracts_year ON contracts(contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_year_month ON contracts(contract_year, contract_month);
CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date);

-- Deduplication index
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_hash ON contracts(contract_hash);

-- Analytical indexes
CREATE INDEX IF NOT EXISTS idx_contracts_amount ON contracts(amount_mxn);
CREATE INDEX IF NOT EXISTS idx_contracts_direct_award ON contracts(is_direct_award);
CREATE INDEX IF NOT EXISTS idx_contracts_single_bid ON contracts(is_single_bid);
CREATE INDEX IF NOT EXISTS idx_contracts_high_value ON contracts(is_high_value);

-- Risk scores indexes
CREATE INDEX IF NOT EXISTS idx_risk_scores_contract ON risk_scores(contract_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON risk_scores(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_version ON risk_scores(model_version);

-- Financial metrics indexes
CREATE INDEX IF NOT EXISTS idx_financial_contract ON financial_metrics(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_loss ON financial_metrics(estimated_loss_mxn);

-- Exchange rates indexes
CREATE INDEX IF NOT EXISTS idx_exchange_year_month ON exchange_rates(year, month);

-- Risk level indexes (for fast filtering by risk)
CREATE INDEX IF NOT EXISTS idx_contracts_risk_level ON contracts(risk_level);
CREATE INDEX IF NOT EXISTS idx_contracts_sector_risk ON contracts(sector_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_risk ON contracts(vendor_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_contracts_year_risk ON contracts(contract_year, risk_level);
CREATE INDEX IF NOT EXISTS idx_contracts_risk_score ON contracts(risk_score);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contracts_sector_year ON contracts(sector_id, contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_year ON contracts(vendor_id, contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_institution_year ON contracts(institution_id, contract_year);

-- Vendor analytics (no avg_risk_score - computed via view)
CREATE INDEX IF NOT EXISTS idx_vendors_ghost ON vendors(ghost_probability);
CREATE INDEX IF NOT EXISTS idx_vendors_rfc ON vendors(rfc);
CREATE INDEX IF NOT EXISTS idx_vendors_name_normalized ON vendors(name_normalized);

-- Institution analytics
CREATE INDEX IF NOT EXISTS idx_institutions_sector ON institutions(sector_id);
CREATE INDEX IF NOT EXISTS idx_institutions_ramo ON institutions(ramo_id);
CREATE INDEX IF NOT EXISTS idx_institutions_name_normalized ON institutions(name_normalized);

-- Institution classification indexes (v2.0 taxonomy)
CREATE INDEX IF NOT EXISTS idx_institutions_type ON institutions(institution_type);
CREATE INDEX IF NOT EXISTS idx_institutions_type_id ON institutions(institution_type_id);
CREATE INDEX IF NOT EXISTS idx_institutions_size_tier ON institutions(size_tier);
CREATE INDEX IF NOT EXISTS idx_institutions_autonomy ON institutions(autonomy_level);
CREATE INDEX IF NOT EXISTS idx_institutions_type_sector ON institutions(institution_type, sector_id);
CREATE INDEX IF NOT EXISTS idx_institutions_decentralized ON institutions(is_legally_decentralized);

-- Sub-sector indexes
CREATE INDEX IF NOT EXISTS idx_sub_sectors_sector ON sub_sectors(sector_id);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_sector ON categories(sector_id);
CREATE INDEX IF NOT EXISTS idx_categories_sub_sector ON categories(sub_sector_id);
CREATE INDEX IF NOT EXISTS idx_categories_partida ON categories(partida_pattern);

-- =============================================================================
-- GROUND TRUTH VALIDATION TABLES (v3.2 - Risk Model Validation)
-- =============================================================================

-- Known corruption cases for model validation
-- Sources: ASF Cuenta Publica, DOJ filings, FGR investigations, media investigations
CREATE TABLE IF NOT EXISTS ground_truth_cases (
    id INTEGER PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    case_name VARCHAR(200) NOT NULL,
    case_type VARCHAR(50) NOT NULL,              -- estafa_maestra, bribery, ghost_company, bid_rigging, embezzlement
    year_start INTEGER,
    year_end INTEGER,
    estimated_fraud_mxn REAL,
    source_asf TEXT,                             -- ASF audit report reference
    source_news TEXT,                            -- News/media source
    source_legal TEXT,                           -- Legal/court documents
    confidence_level VARCHAR(20) DEFAULT 'medium', -- high, medium, low (based on evidence quality)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Known bad vendors linked to corruption cases
CREATE TABLE IF NOT EXISTS ground_truth_vendors (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    vendor_id INTEGER,                           -- FK to vendors table (after matching)
    vendor_name_source VARCHAR(500) NOT NULL,    -- Name as reported in source
    rfc_source VARCHAR(13),                      -- RFC if available from source
    role VARCHAR(50),                            -- beneficiary, shell_company, intermediary, co-conspirator
    evidence_strength VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    match_method VARCHAR(50),                    -- rfc_exact, name_exact, name_fuzzy, manual
    match_confidence REAL,                       -- 0-1 confidence score
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Known bad institutions linked to corruption cases
CREATE TABLE IF NOT EXISTS ground_truth_institutions (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    institution_id INTEGER,                      -- FK to institutions table (after matching)
    institution_name_source VARCHAR(500) NOT NULL, -- Name as reported in source
    role VARCHAR(50),                            -- source, awarding_entity, co-conspirator
    evidence_strength VARCHAR(20) DEFAULT 'medium',
    match_method VARCHAR(50),
    match_confidence REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- Known bad contracts from corruption cases (for precise validation)
CREATE TABLE IF NOT EXISTS ground_truth_contracts (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    contract_id INTEGER,                         -- FK to contracts table (after matching)
    contract_number_source VARCHAR(200),         -- Contract number from source
    procedure_number_source VARCHAR(200),        -- Procedure number from source
    amount_source REAL,                          -- Amount reported in source
    year_source INTEGER,                         -- Year from source
    evidence_strength VARCHAR(20) DEFAULT 'medium',
    match_method VARCHAR(50),
    match_confidence REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Validation run results for model performance tracking
CREATE TABLE IF NOT EXISTS validation_results (
    id INTEGER PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Detection metrics
    total_known_bad_contracts INTEGER,
    total_known_bad_vendors INTEGER,
    flagged_critical INTEGER,                    -- risk_level = 'critical'
    flagged_high INTEGER,                        -- risk_level = 'high'
    flagged_medium INTEGER,                      -- risk_level = 'medium'
    flagged_low INTEGER,                         -- risk_level = 'low'

    -- Key rates
    detection_rate REAL,                         -- % of known bad flagged medium+
    critical_detection_rate REAL,                -- % flagged critical or high
    false_negative_count INTEGER,                -- Known bad with low risk

    -- Factor analysis (JSON)
    factor_trigger_counts TEXT,                  -- JSON: {factor: count triggered on known bad}
    factor_effectiveness TEXT,                   -- JSON: {factor: precision/recall/F1}

    -- Comparison to baseline
    baseline_detection_rate REAL,                -- Detection rate on random sample
    lift REAL,                                   -- Model lift over baseline

    notes TEXT
);

-- Indexes for ground truth tables
CREATE INDEX IF NOT EXISTS idx_gt_cases_type ON ground_truth_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_gt_cases_years ON ground_truth_cases(year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_gt_vendors_case ON ground_truth_vendors(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_vendors_vendor ON ground_truth_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_gt_institutions_case ON ground_truth_institutions(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_institutions_inst ON ground_truth_institutions(institution_id);
CREATE INDEX IF NOT EXISTS idx_gt_contracts_case ON ground_truth_contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_contracts_contract ON ground_truth_contracts(contract_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_version ON validation_results(model_version);
CREATE INDEX IF NOT EXISTS idx_validation_results_date ON validation_results(run_date);
"""

# =============================================================================
# VIEWS DDL
# =============================================================================

VIEWS_DDL = """
-- =============================================================================
-- VIEWS FOR COMMON ANALYTICS
-- =============================================================================

-- Unified Contracts View (risk scores now live on contracts table since v5.0)
CREATE VIEW IF NOT EXISTS v_contracts_full AS
SELECT
    c.*,
    f.amount_usd,
    f.amount_mxn_2024,
    f.amount_usd_2024,
    f.estimated_loss_mxn,
    f.estimated_loss_usd
FROM contracts c
LEFT JOIN financial_metrics f ON c.id = f.contract_id;

-- Vendor Stats View (computed aggregates, not stored)
CREATE VIEW IF NOT EXISTS v_vendor_stats AS
SELECT
    v.id,
    v.rfc,
    v.name,
    v.name_normalized,
    COUNT(c.id) as total_contracts,
    SUM(c.amount_mxn) as total_amount_mxn,
    AVG(c.risk_score) as avg_risk_score,
    MIN(c.contract_date) as first_contract,
    MAX(c.contract_date) as last_contract,
    COUNT(DISTINCT c.sector_id) as sector_count,
    COUNT(DISTINCT c.institution_id) as institution_count
FROM vendors v
LEFT JOIN contracts c ON v.id = c.vendor_id
GROUP BY v.id, v.rfc, v.name, v.name_normalized;

-- Sector Summary View
CREATE VIEW IF NOT EXISTS v_sector_summary AS
SELECT
    s.id as sector_id,
    s.code as sector_code,
    s.name_es as sector_name,
    s.color as sector_color,
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
    SUM(CASE WHEN c.risk_score >= 0.5 THEN 1 ELSE 0 END) as high_risk_count,
    COUNT(DISTINCT c.vendor_id) as unique_vendors,
    COUNT(DISTINCT c.institution_id) as unique_institutions,
    MIN(c.contract_year) as earliest_year,
    MAX(c.contract_year) as latest_year
FROM sectors s
LEFT JOIN contracts c ON s.id = c.sector_id
GROUP BY s.id, s.code, s.name_es, s.color;

-- Vendor Risk Profile View
CREATE VIEW IF NOT EXISTS v_vendor_risk_profile AS
SELECT
    v.id as vendor_id,
    v.rfc,
    v.name,
    v.name_normalized,
    v.size_stratification,
    v.is_ghost_company,
    v.ghost_probability,
    COUNT(c.id) as contract_count,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.amount_mxn), 0) as avg_contract_value,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    COALESCE(MAX(c.risk_score), 0) as max_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
    COUNT(DISTINCT c.institution_id) as institution_count,
    COUNT(DISTINCT c.sector_id) as sector_count,
    MIN(c.contract_year) as first_year,
    MAX(c.contract_year) as last_year
FROM vendors v
LEFT JOIN contracts c ON v.id = c.vendor_id
GROUP BY v.id, v.rfc, v.name, v.name_normalized, v.size_stratification,
         v.is_ghost_company, v.ghost_probability;

-- Year-over-Year Trends View
CREATE VIEW IF NOT EXISTS v_yearly_trends AS
SELECT
    c.contract_year,
    c.sector_id,
    COUNT(*) as contract_count,
    SUM(c.amount_mxn) as total_amount_mxn,
    AVG(c.risk_score) as avg_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
    ROUND(100.0 * SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct,
    SUM(CASE WHEN c.risk_score >= 0.5 THEN 1 ELSE 0 END) as high_risk_count
FROM contracts c
WHERE c.contract_year IS NOT NULL
GROUP BY c.contract_year, c.sector_id
ORDER BY c.contract_year, c.sector_id;

-- Institution Summary View (includes v2.0 taxonomy classification)
CREATE VIEW IF NOT EXISTS v_institution_summary AS
SELECT
    i.id as institution_id,
    i.siglas,
    i.name,
    i.name_normalized,
    i.tipo,
    i.gobierno_nivel,
    -- v2.0 Taxonomy Classification
    i.institution_type,
    it.name_es as institution_type_name,
    it.risk_baseline as type_risk_baseline,
    i.size_tier,
    st.risk_adjustment as size_risk_adjustment,
    i.autonomy_level,
    al.risk_baseline as autonomy_risk_baseline,
    i.is_legally_decentralized,
    i.classification_method,
    i.classification_confidence,
    -- Sector/Ramo info
    s.code as sector_code,
    s.name_es as sector_name,
    rm.clave as ramo_clave,
    rm.descripcion as ramo_descripcion,
    -- Aggregates
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    COUNT(DISTINCT c.vendor_id) as unique_vendors,
    MIN(c.contract_year) as first_year,
    MAX(c.contract_year) as last_year
FROM institutions i
LEFT JOIN institution_types it ON i.institution_type_id = it.id
LEFT JOIN size_tiers st ON i.size_tier_id = st.id
LEFT JOIN autonomy_levels al ON i.autonomy_level_id = al.id
LEFT JOIN sectors s ON i.sector_id = s.id
LEFT JOIN ramos rm ON i.ramo_id = rm.id
LEFT JOIN contracts c ON i.id = c.institution_id
GROUP BY i.id, i.siglas, i.name, i.name_normalized, i.tipo, i.gobierno_nivel,
         i.institution_type, it.name_es, it.risk_baseline,
         i.size_tier, st.risk_adjustment,
         i.autonomy_level, al.risk_baseline,
         i.is_legally_decentralized, i.classification_method, i.classification_confidence,
         s.code, s.name_es, rm.clave, rm.descripcion;

-- Sub-Sector Summary View
CREATE VIEW IF NOT EXISTS v_sub_sector_summary AS
SELECT
    ss.id as sub_sector_id,
    ss.code as sub_sector_code,
    ss.name_es as sub_sector_name,
    s.code as sector_code,
    s.name_es as sector_name,
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    COUNT(DISTINCT c.vendor_id) as unique_vendors
FROM sub_sectors ss
JOIN sectors s ON ss.sector_id = s.id
LEFT JOIN contracts c ON ss.id = c.sub_sector_id
GROUP BY ss.id, ss.code, ss.name_es, s.code, s.name_es;

-- Data Quality View
CREATE VIEW IF NOT EXISTS v_data_quality AS
SELECT
    source_structure,
    contract_year,
    COUNT(*) as contracts,
    SUM(CASE WHEN amount_mxn > 10e9 THEN 1 ELSE 0 END) as flagged_high_value,
    SUM(CASE WHEN amount_mxn = 0 OR amount_mxn IS NULL THEN 1 ELSE 0 END) as rejected_outliers
FROM contracts
GROUP BY source_structure, contract_year;
"""

# =============================================================================
# SEED DATA
# =============================================================================

SECTORS_DATA = [
    {"id": 1, "code": "salud", "name_es": "Salud", "name_en": "Health", "acronym": "SAL", "color": "#dc2626", "description_es": "Sector salud incluyendo hospitales, farmaceuticos y equipo medico", "display_order": 1},
    {"id": 2, "code": "educacion", "name_es": "Educacion", "name_en": "Education", "acronym": "EDU", "color": "#3b82f6", "description_es": "Sector educativo desde basica hasta superior", "display_order": 2},
    {"id": 3, "code": "infraestructura", "name_es": "Infraestructura", "name_en": "Infrastructure", "acronym": "INF", "color": "#ea580c", "description_es": "Obras publicas, carreteras, edificios gubernamentales", "display_order": 3},
    {"id": 4, "code": "energia", "name_es": "Energia", "name_en": "Energy", "acronym": "ENE", "color": "#eab308", "description_es": "Petroleo, electricidad, energias renovables", "display_order": 4},
    {"id": 5, "code": "defensa", "name_es": "Defensa", "name_en": "Defense", "acronym": "DEF", "color": "#1e3a5f", "description_es": "Defensa nacional y marina", "display_order": 5},
    {"id": 6, "code": "tecnologia", "name_es": "Tecnologia", "name_en": "Technology", "acronym": "TEC", "color": "#8b5cf6", "description_es": "Sistemas informaticos, software, servicios tecnologicos", "display_order": 6},
    {"id": 7, "code": "hacienda", "name_es": "Hacienda", "name_en": "Treasury", "acronym": "HAC", "color": "#16a34a", "description_es": "Hacienda y credito publico", "display_order": 7},
    {"id": 8, "code": "gobernacion", "name_es": "Gobernacion", "name_en": "Interior", "acronym": "GOB", "color": "#be123c", "description_es": "Gobernacion, seguridad publica, procuraduria", "display_order": 8},
    {"id": 9, "code": "agricultura", "name_es": "Agricultura", "name_en": "Agriculture", "acronym": "AGR", "color": "#22c55e", "description_es": "Agricultura, ganaderia, pesca", "display_order": 9},
    {"id": 10, "code": "ambiente", "name_es": "Medio Ambiente", "name_en": "Environment", "acronym": "AMB", "color": "#10b981", "description_es": "Medio ambiente y recursos naturales", "display_order": 10},
    {"id": 11, "code": "trabajo", "name_es": "Trabajo", "name_en": "Labor", "acronym": "TRA", "color": "#f97316", "description_es": "Trabajo y prevision social", "display_order": 11},
    {"id": 12, "code": "otros", "name_es": "Otros", "name_en": "Other", "acronym": "OTR", "color": "#64748b", "description_es": "Otros sectores no clasificados", "display_order": 12},
]

# =============================================================================
# INSTITUTION CLASSIFICATION SEED DATA (v2.0 Taxonomy)
# =============================================================================

# 19 Institution Types - Aligned with IMF CRI and OECD corruption risk baselines
INSTITUTION_TYPES_DATA = [
    {"id": 1, "code": "federal_secretariat", "name_es": "Secretaria Federal", "name_en": "Federal Secretariat",
     "description_es": "Secretaria de estado del gabinete federal", "description_en": "Cabinet ministry",
     "risk_baseline": 0.15, "display_order": 1},
    {"id": 2, "code": "federal_agency", "name_es": "Agencia Federal", "name_en": "Federal Agency",
     "description_es": "Comision, consejo o agencia federal", "description_en": "Federal commission/council/agency",
     "risk_baseline": 0.20, "display_order": 2},
    {"id": 3, "code": "autonomous_constitutional", "name_es": "Organismo Autonomo Constitucional", "name_en": "Constitutional Autonomous Body",
     "description_es": "Autonomia constitucional con presupuesto propio", "description_en": "Constitutional autonomy with own budget",
     "risk_baseline": 0.10, "display_order": 3},
    {"id": 4, "code": "social_security", "name_es": "Seguridad Social", "name_en": "Social Security",
     "description_es": "Sistemas de seguridad social (IMSS, ISSSTE)", "description_en": "Social security systems",
     "risk_baseline": 0.25, "display_order": 4},
    {"id": 5, "code": "state_enterprise_energy", "name_es": "Empresa Estatal de Energia", "name_en": "State Energy Enterprise",
     "description_es": "Empresas productivas del estado en sector energetico", "description_en": "State energy enterprises (PEMEX, CFE)",
     "risk_baseline": 0.28, "display_order": 5},
    {"id": 6, "code": "state_enterprise_finance", "name_es": "Banca de Desarrollo", "name_en": "Development Bank",
     "description_es": "Banca de desarrollo y financieras estatales", "description_en": "Development banks and state financial entities",
     "risk_baseline": 0.22, "display_order": 6},
    {"id": 7, "code": "state_enterprise_infra", "name_es": "Empresa Estatal de Infraestructura", "name_en": "State Infrastructure Enterprise",
     "description_es": "Empresas de infraestructura y servicios publicos", "description_en": "Infrastructure and public service enterprises",
     "risk_baseline": 0.25, "display_order": 7},
    {"id": 8, "code": "research_education", "name_es": "Investigacion y Educacion", "name_en": "Research & Education",
     "description_es": "Centros de investigacion y universidades publicas", "description_en": "Research centers and public universities",
     "risk_baseline": 0.18, "display_order": 8},
    {"id": 9, "code": "social_program", "name_es": "Programa Social", "name_en": "Social Program",
     "description_es": "Programas de distribucion y bienestar social", "description_en": "Social distribution and welfare programs",
     "risk_baseline": 0.30, "display_order": 9},
    {"id": 10, "code": "regulatory_agency", "name_es": "Agencia Reguladora", "name_en": "Regulatory Agency",
     "description_es": "Reguladores sectoriales con autonomia tecnica", "description_en": "Sector regulators with technical autonomy",
     "risk_baseline": 0.15, "display_order": 10},
    {"id": 11, "code": "state_government", "name_es": "Gobierno Estatal", "name_en": "State Government",
     "description_es": "Ejecutivo estatal y dependencias directas", "description_en": "State executive and direct dependencies",
     "risk_baseline": 0.30, "display_order": 11},
    {"id": 12, "code": "state_agency", "name_es": "Dependencia Estatal", "name_en": "State Agency",
     "description_es": "Secretarias y organismos estatales", "description_en": "State secretariats and agencies",
     "risk_baseline": 0.30, "display_order": 12},
    {"id": 13, "code": "municipal", "name_es": "Municipal", "name_en": "Municipal",
     "description_es": "Ayuntamientos y gobiernos municipales", "description_en": "Municipalities and local governments",
     "risk_baseline": 0.35, "display_order": 13},
    {"id": 14, "code": "judicial", "name_es": "Judicial", "name_en": "Judicial",
     "description_es": "Poder judicial y tribunales", "description_en": "Judiciary and courts",
     "risk_baseline": 0.10, "display_order": 14},
    {"id": 15, "code": "legislative", "name_es": "Legislativo", "name_en": "Legislative",
     "description_es": "Poder legislativo federal y estatal", "description_en": "Federal and state legislature",
     "risk_baseline": 0.15, "display_order": 15},
    {"id": 16, "code": "military", "name_es": "Defensa", "name_en": "Military/Defense",
     "description_es": "Secretarias de defensa y marina", "description_en": "Defense and navy secretariats",
     "risk_baseline": 0.15, "display_order": 16},
    {"id": 17, "code": "health_institution", "name_es": "Institucion de Salud", "name_en": "Health Institution",
     "description_es": "Hospitales, institutos nacionales de salud", "description_en": "Hospitals, national health institutes",
     "risk_baseline": 0.25, "display_order": 17},
    {"id": 18, "code": "decentralized_legacy", "name_es": "Descentralizado (Legado)", "name_en": "Decentralized (Legacy)",
     "description_es": "Organismo descentralizado no clasificado en nueva taxonomia", "description_en": "Decentralized entity not yet classified in new taxonomy",
     "risk_baseline": 0.25, "display_order": 18},
    {"id": 19, "code": "other", "name_es": "Otro", "name_en": "Other",
     "description_es": "Institucion no clasificada", "description_en": "Unclassified institution",
     "risk_baseline": 0.25, "display_order": 99},
]

# Size Tiers - Based on procurement volume with risk adjustments
SIZE_TIERS_DATA = [
    {"id": 1, "code": "mega", "name_es": "Mega (>100K contratos)", "name_en": "Mega (>100K contracts)",
     "min_contracts": 100000, "max_contracts": None, "risk_adjustment": 0.05,
     "description": "Massive procurement volume overwhelms oversight capacity", "display_order": 1},
    {"id": 2, "code": "large", "name_es": "Grande (10K-100K)", "name_en": "Large (10K-100K)",
     "min_contracts": 10000, "max_contracts": 99999, "risk_adjustment": 0.02,
     "description": "High volume requires significant oversight resources", "display_order": 2},
    {"id": 3, "code": "medium", "name_es": "Mediano (1K-10K)", "name_en": "Medium (1K-10K)",
     "min_contracts": 1000, "max_contracts": 9999, "risk_adjustment": 0.00,
     "description": "Baseline oversight capacity", "display_order": 3},
    {"id": 4, "code": "small", "name_es": "Pequeno (100-1K)", "name_en": "Small (100-1K)",
     "min_contracts": 100, "max_contracts": 999, "risk_adjustment": -0.02,
     "description": "Lower volume allows more scrutiny per contract", "display_order": 4},
    {"id": 5, "code": "micro", "name_es": "Micro (<100)", "name_en": "Micro (<100)",
     "min_contracts": 0, "max_contracts": 99, "risk_adjustment": -0.05,
     "description": "Very low volume enables detailed review", "display_order": 5},
]

# Autonomy Levels - Based on budget independence and oversight structure
AUTONOMY_LEVELS_DATA = [
    {"id": 1, "code": "full_autonomy", "name_es": "Autonomia Plena", "name_en": "Full Autonomy",
     "description_es": "Autonomia constitucional con presupuesto propio", "description_en": "Constitutional autonomy with own budget",
     "risk_baseline": 0.10, "display_order": 1},
    {"id": 2, "code": "technical_autonomy", "name_es": "Autonomia Tecnica", "name_en": "Technical Autonomy",
     "description_es": "Autonomia tecnica pero presupuesto federal", "description_en": "Technical autonomy but federal budget",
     "risk_baseline": 0.15, "display_order": 2},
    {"id": 3, "code": "operational_autonomy", "name_es": "Autonomia Operativa", "name_en": "Operational Autonomy",
     "description_es": "Autonomia operativa con supervision sectorial", "description_en": "Operational autonomy with sector oversight",
     "risk_baseline": 0.20, "display_order": 3},
    {"id": 4, "code": "dependent", "name_es": "Dependiente", "name_en": "Dependent",
     "description_es": "Dependencia directa del ejecutivo federal", "description_en": "Directly dependent on federal executive",
     "risk_baseline": 0.25, "display_order": 4},
    {"id": 5, "code": "subnational", "name_es": "Subnacional", "name_en": "Subnational",
     "description_es": "Presupuesto estatal o municipal", "description_en": "State or municipal budget",
     "risk_baseline": 0.30, "display_order": 5},
]

SUB_SECTORS_DATA = [
    # SALUD sub-sectors
    {"sector_id": 1, "code": "salud_hospitales", "name_es": "Hospitales", "name_en": "Hospitals", "keywords": "hospital,clinica,centro medico"},
    {"sector_id": 1, "code": "salud_farmaceutica", "name_es": "Farmaceutica", "name_en": "Pharmaceuticals", "keywords": "medicamento,farmaco,laboratorio"},
    {"sector_id": 1, "code": "salud_equipo_medico", "name_es": "Equipo Medico", "name_en": "Medical Equipment", "keywords": "equipo medico,instrumental,dispositivo"},
    {"sector_id": 1, "code": "salud_servicios", "name_es": "Servicios Medicos", "name_en": "Medical Services", "keywords": "servicio medico,consulta,diagnostico"},
    {"sector_id": 1, "code": "salud_emergencias", "name_es": "Emergencias", "name_en": "Emergency Services", "keywords": "emergencia,urgencia,ambulancia"},

    # EDUCACION sub-sectors
    {"sector_id": 2, "code": "edu_basica", "name_es": "Educacion Basica", "name_en": "Basic Education", "keywords": "primaria,secundaria,escuela"},
    {"sector_id": 2, "code": "edu_media", "name_es": "Educacion Media", "name_en": "Secondary Education", "keywords": "preparatoria,bachillerato,cbtis"},
    {"sector_id": 2, "code": "edu_superior", "name_es": "Educacion Superior", "name_en": "Higher Education", "keywords": "universidad,tecnologico,unam,ipn"},
    {"sector_id": 2, "code": "edu_infraestructura", "name_es": "Infraestructura Educativa", "name_en": "Educational Infrastructure", "keywords": "construccion escuela,aula,laboratorio"},
    {"sector_id": 2, "code": "edu_materiales", "name_es": "Materiales Educativos", "name_en": "Educational Materials", "keywords": "libro,material didactico,uniforme"},

    # INFRAESTRUCTURA sub-sectors
    {"sector_id": 3, "code": "infra_carreteras", "name_es": "Carreteras", "name_en": "Roads", "keywords": "carretera,autopista,pavimento"},
    {"sector_id": 3, "code": "infra_puentes", "name_es": "Puentes", "name_en": "Bridges", "keywords": "puente,viaducto,paso elevado"},
    {"sector_id": 3, "code": "infra_edificios", "name_es": "Edificios Publicos", "name_en": "Public Buildings", "keywords": "edificio,oficinas,construccion"},
    {"sector_id": 3, "code": "infra_agua", "name_es": "Agua y Saneamiento", "name_en": "Water & Sanitation", "keywords": "agua,drenaje,alcantarillado"},
    {"sector_id": 3, "code": "infra_transporte", "name_es": "Transporte", "name_en": "Transportation", "keywords": "metro,transporte,aeropuerto,puerto"},

    # ENERGIA sub-sectors
    {"sector_id": 4, "code": "energia_petroleo", "name_es": "Petroleo y Gas", "name_en": "Oil & Gas", "keywords": "petroleo,gas,refineria,pemex"},
    {"sector_id": 4, "code": "energia_electricidad", "name_es": "Electricidad", "name_en": "Electricity", "keywords": "electricidad,cfe,generacion,transmision"},
    {"sector_id": 4, "code": "energia_renovable", "name_es": "Energias Renovables", "name_en": "Renewable Energy", "keywords": "solar,eolica,renovable"},
    {"sector_id": 4, "code": "energia_combustibles", "name_es": "Combustibles", "name_en": "Fuels", "keywords": "combustible,gasolina,diesel"},

    # DEFENSA sub-sectors
    {"sector_id": 5, "code": "defensa_ejercito", "name_es": "Ejercito", "name_en": "Army", "keywords": "ejercito,sedena,militar"},
    {"sector_id": 5, "code": "defensa_marina", "name_es": "Marina", "name_en": "Navy", "keywords": "marina,semar,naval"},
    {"sector_id": 5, "code": "defensa_equipo", "name_es": "Equipo Militar", "name_en": "Military Equipment", "keywords": "armamento,vehiculo militar,equipo tactico"},

    # TECNOLOGIA sub-sectors
    {"sector_id": 6, "code": "tec_software", "name_es": "Software", "name_en": "Software", "keywords": "software,sistema,aplicacion,desarrollo"},
    {"sector_id": 6, "code": "tec_hardware", "name_es": "Hardware", "name_en": "Hardware", "keywords": "computadora,servidor,equipo computo"},
    {"sector_id": 6, "code": "tec_comunicaciones", "name_es": "Comunicaciones", "name_en": "Communications", "keywords": "telecomunicacion,red,internet,fibra"},
    {"sector_id": 6, "code": "tec_consultoria", "name_es": "Consultoria TI", "name_en": "IT Consulting", "keywords": "consultoria,asesoria,implementacion"},

    # HACIENDA sub-sectors
    {"sector_id": 7, "code": "hacienda_sat", "name_es": "SAT", "name_en": "Tax Administration", "keywords": "sat,impuesto,fiscal"},
    {"sector_id": 7, "code": "hacienda_banca", "name_es": "Banca de Desarrollo", "name_en": "Development Banking", "keywords": "banco,nafin,banobras"},

    # GOBERNACION sub-sectors
    {"sector_id": 8, "code": "gob_seguridad", "name_es": "Seguridad Publica", "name_en": "Public Security", "keywords": "policia,seguridad,vigilancia"},
    {"sector_id": 8, "code": "gob_procuraduria", "name_es": "Procuraduria", "name_en": "Attorney General", "keywords": "procuraduria,fiscalia,justicia"},
    {"sector_id": 8, "code": "gob_electoral", "name_es": "Electoral", "name_en": "Electoral", "keywords": "ine,electoral,eleccion"},

    # AGRICULTURA sub-sectors
    {"sector_id": 9, "code": "agri_produccion", "name_es": "Produccion Agricola", "name_en": "Agricultural Production", "keywords": "cultivo,cosecha,semilla"},
    {"sector_id": 9, "code": "agri_ganaderia", "name_es": "Ganaderia", "name_en": "Livestock", "keywords": "ganado,bovino,porcino"},
    {"sector_id": 9, "code": "agri_pesca", "name_es": "Pesca", "name_en": "Fisheries", "keywords": "pesca,acuacultura,marisco"},

    # AMBIENTE sub-sectors
    {"sector_id": 10, "code": "amb_conservacion", "name_es": "Conservacion", "name_en": "Conservation", "keywords": "conservacion,area natural,biodiversidad"},
    {"sector_id": 10, "code": "amb_agua", "name_es": "Recursos Hidricos", "name_en": "Water Resources", "keywords": "conagua,cuenca,acuifero"},

    # TRABAJO sub-sectors
    {"sector_id": 11, "code": "trabajo_empleo", "name_es": "Empleo", "name_en": "Employment", "keywords": "empleo,capacitacion,laboral"},
    {"sector_id": 11, "code": "trabajo_seguridad_social", "name_es": "Seguridad Social", "name_en": "Social Security", "keywords": "imss,issste,pension"},

    # OTROS sub-sectors
    {"sector_id": 12, "code": "otros_general", "name_es": "General", "name_en": "General", "keywords": "otro,varios,general"},
]

RAMOS_DATA = [
    {"clave": "01", "descripcion": "Poder Legislativo", "sector_id": 8},
    {"clave": "02", "descripcion": "Oficina de la Presidencia de la Republica", "sector_id": 8},
    {"clave": "03", "descripcion": "Poder Judicial", "sector_id": 8},
    {"clave": "04", "descripcion": "Gobernacion", "sector_id": 8},
    {"clave": "05", "descripcion": "Relaciones Exteriores", "sector_id": 8},
    {"clave": "06", "descripcion": "Hacienda y Credito Publico", "sector_id": 7},
    {"clave": "07", "descripcion": "Defensa Nacional", "sector_id": 5},
    {"clave": "08", "descripcion": "Agricultura y Desarrollo Rural", "sector_id": 9},
    {"clave": "09", "descripcion": "Comunicaciones y Transportes", "sector_id": 3},
    {"clave": "10", "descripcion": "Economia", "sector_id": 12},
    {"clave": "11", "descripcion": "Educacion Publica", "sector_id": 2},
    {"clave": "12", "descripcion": "Salud", "sector_id": 1},
    {"clave": "13", "descripcion": "Marina", "sector_id": 5},
    {"clave": "14", "descripcion": "Trabajo y Prevision Social", "sector_id": 11},
    {"clave": "15", "descripcion": "Desarrollo Agrario Territorial y Urbano", "sector_id": 3},
    {"clave": "16", "descripcion": "Medio Ambiente y Recursos Naturales", "sector_id": 10},
    {"clave": "17", "descripcion": "Procuraduria General de la Republica", "sector_id": 8},
    {"clave": "18", "descripcion": "Energia", "sector_id": 4},
    {"clave": "19", "descripcion": "Aportaciones a Seguridad Social", "sector_id": 11},
    {"clave": "20", "descripcion": "Bienestar", "sector_id": 12},
    {"clave": "21", "descripcion": "Turismo", "sector_id": 3},
    {"clave": "22", "descripcion": "Instituto Nacional Electoral", "sector_id": 8},
    {"clave": "23", "descripcion": "Provisiones Salariales y Economicas", "sector_id": 7},
    {"clave": "24", "descripcion": "Deuda Publica", "sector_id": 7},
    {"clave": "25", "descripcion": "Previsiones y Aportaciones para Sistemas de Educacion", "sector_id": 2},
    {"clave": "27", "descripcion": "Funcion Publica", "sector_id": 8},
    {"clave": "35", "descripcion": "Comision Nacional de los Derechos Humanos", "sector_id": 8},
    {"clave": "36", "descripcion": "Seguridad y Proteccion Ciudadana", "sector_id": 8},
    {"clave": "38", "descripcion": "Consejo Nacional de Ciencia y Tecnologia", "sector_id": 6},
    {"clave": "40", "descripcion": "INFONAVIT", "sector_id": 11},
    {"clave": "41", "descripcion": "Comision Federal de Competencia Economica", "sector_id": 12},
    {"clave": "42", "descripcion": "Instituto Federal de Telecomunicaciones", "sector_id": 6},
    {"clave": "43", "descripcion": "Instituto Federal de Acceso a la Informacion", "sector_id": 8},
    {"clave": "44", "descripcion": "Instituto Nacional de Estadistica y Geografia", "sector_id": 12},
    {"clave": "45", "descripcion": "Comision Reguladora de Energia", "sector_id": 4},
    {"clave": "46", "descripcion": "Comision Nacional de Hidrocarburos", "sector_id": 4},
    {"clave": "47", "descripcion": "Entidades no Sectorizadas", "sector_id": 12},
    {"clave": "48", "descripcion": "Cultura", "sector_id": 2},
    {"clave": "50", "descripcion": "IMSS", "sector_id": 1},
    {"clave": "51", "descripcion": "ISSSTE", "sector_id": 1},
    {"clave": "52", "descripcion": "PEMEX", "sector_id": 4},
    {"clave": "53", "descripcion": "CFE", "sector_id": 4},
]

CATEGORIES_DATA = [
    # Partida-based categories for SALUD
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_medicamentos", "partida_pattern": "253%", "name_es": "Medicamentos", "name_en": "Medications"},
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_vacunas", "partida_pattern": "254%", "name_es": "Vacunas", "name_en": "Vaccines"},
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_reactivos", "partida_pattern": "255%", "name_es": "Reactivos y Laboratorio", "name_en": "Lab Reagents"},
    {"sector_id": 1, "sub_sector_id": 3, "code": "cat_equipo_medico", "partida_pattern": "531%", "name_es": "Equipo Medico", "name_en": "Medical Equipment"},
    {"sector_id": 1, "sub_sector_id": 3, "code": "cat_instrumental", "partida_pattern": "532%", "name_es": "Instrumental Medico", "name_en": "Medical Instruments"},

    # Partida-based categories for TECNOLOGIA
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_servicios_ti", "partida_pattern": "339%", "name_es": "Servicios de TI", "name_en": "IT Services"},
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_software", "partida_pattern": "337%", "name_es": "Software", "name_en": "Software"},
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_equipo_computo", "partida_pattern": "515%", "name_es": "Equipo de Computo", "name_en": "Computing Equipment"},

    # Partida-based categories for INFRAESTRUCTURA
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_construccion", "partida_pattern": "611%", "name_es": "Construccion", "name_en": "Construction"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_carreteras", "partida_pattern": "614%", "name_es": "Carreteras y Puentes", "name_en": "Roads and Bridges"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_agua", "partida_pattern": "616%", "name_es": "Obras Hidraulicas", "name_en": "Water Works"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_mantenimiento", "partida_pattern": "35%", "name_es": "Mantenimiento", "name_en": "Maintenance"},

    # Partida-based categories for ENERGIA
    {"sector_id": 4, "sub_sector_id": None, "code": "cat_combustibles", "partida_pattern": "261%", "name_es": "Combustibles", "name_en": "Fuels"},
    {"sector_id": 4, "sub_sector_id": None, "code": "cat_lubricantes", "partida_pattern": "262%", "name_es": "Lubricantes", "name_en": "Lubricants"},

    # General categories
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_materiales_oficina", "partida_pattern": "21%", "name_es": "Materiales de Oficina", "name_en": "Office Supplies"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_servicios_basicos", "partida_pattern": "31%", "name_es": "Servicios Basicos", "name_en": "Basic Services"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_arrendamientos", "partida_pattern": "32%", "name_es": "Arrendamientos", "name_en": "Leases"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_servicios_prof", "partida_pattern": "33%", "name_es": "Servicios Profesionales", "name_en": "Professional Services"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_vehiculos", "partida_pattern": "541%", "name_es": "Vehiculos", "name_en": "Vehicles"},
]

# =============================================================================
# BILINGUAL LOOKUP SEED DATA
# =============================================================================

PROCEDURE_TYPES_DATA = [
    {
        "code": "directa",
        "name_es": "Adjudicacion Directa",
        "name_en": "Direct Award",
        "description_es": "Contratacion sin competencia, asignada directamente a un proveedor",
        "description_en": "Non-competitive procurement, directly assigned to a vendor",
        "is_direct_award": 1,
        "is_competitive": 0,
        "display_order": 1
    },
    {
        "code": "licitacion",
        "name_es": "Licitacion Publica",
        "name_en": "Public Tender",
        "description_es": "Procedimiento abierto con convocatoria publica",
        "description_en": "Open procedure with public announcement",
        "is_direct_award": 0,
        "is_competitive": 1,
        "display_order": 2
    },
    {
        "code": "licitacion_nacional",
        "name_es": "Licitacion Publica Nacional",
        "name_en": "National Public Tender",
        "description_es": "Licitacion abierta solo para proveedores nacionales",
        "description_en": "Open tender for domestic vendors only",
        "is_direct_award": 0,
        "is_competitive": 1,
        "display_order": 3
    },
    {
        "code": "licitacion_internacional",
        "name_es": "Licitacion Publica Internacional",
        "name_en": "International Public Tender",
        "description_es": "Licitacion abierta para proveedores nacionales e internacionales",
        "description_en": "Open tender for domestic and international vendors",
        "is_direct_award": 0,
        "is_competitive": 1,
        "display_order": 4
    },
    {
        "code": "invitacion",
        "name_es": "Invitacion a Cuando Menos 3 Personas",
        "name_en": "Restricted Tender",
        "description_es": "Procedimiento restringido con invitacion a minimo 3 proveedores",
        "description_en": "Restricted procedure with invitation to at least 3 vendors",
        "is_direct_award": 0,
        "is_competitive": 1,
        "display_order": 5
    },
    {
        "code": "otro",
        "name_es": "Otro",
        "name_en": "Other",
        "description_es": "Otro tipo de procedimiento no clasificado",
        "description_en": "Other unclassified procedure type",
        "is_direct_award": 0,
        "is_competitive": 0,
        "display_order": 99
    },
    {
        "code": "desconocido",
        "name_es": "Desconocido",
        "name_en": "Unknown",
        "description_es": "Tipo de procedimiento no especificado en los datos originales",
        "description_en": "Procedure type not specified in original data",
        "is_direct_award": 0,
        "is_competitive": 0,
        "display_order": 100
    },
]

CONTRACT_TYPES_DATA = [
    {
        "code": "adquisicion",
        "name_es": "Adquisiciones",
        "name_en": "Procurement",
        "description_es": "Compra de bienes y productos",
        "description_en": "Purchase of goods and products",
        "display_order": 1
    },
    {
        "code": "servicio",
        "name_es": "Servicios",
        "name_en": "Services",
        "description_es": "Contratacion de servicios profesionales o generales",
        "description_en": "Contracting of professional or general services",
        "display_order": 2
    },
    {
        "code": "obra_publica",
        "name_es": "Obra Publica",
        "name_en": "Public Works",
        "description_es": "Construccion, remodelacion o mantenimiento de infraestructura",
        "description_en": "Construction, remodeling, or infrastructure maintenance",
        "display_order": 3
    },
    {
        "code": "servicio_obra",
        "name_es": "Servicios Relacionados con Obra",
        "name_en": "Works-Related Services",
        "description_es": "Servicios de consultoria, diseno o supervision de obra",
        "description_en": "Consulting, design, or construction supervision services",
        "display_order": 4
    },
    {
        "code": "arrendamiento",
        "name_es": "Arrendamiento",
        "name_en": "Leasing",
        "description_es": "Renta de bienes muebles o inmuebles",
        "description_en": "Rental of movable or immovable property",
        "display_order": 5
    },
    {
        "code": "otro",
        "name_es": "Otro",
        "name_en": "Other",
        "description_es": "Otro tipo de contrato no clasificado",
        "description_en": "Other unclassified contract type",
        "display_order": 99
    },
]

STATUS_CODES_DATA = [
    {
        "code": "activo",
        "name_es": "Activo",
        "name_en": "Active",
        "description_es": "Contrato en ejecucion",
        "description_en": "Contract in execution",
        "is_active": 1,
        "display_order": 1
    },
    {
        "code": "terminado",
        "name_es": "Terminado",
        "name_en": "Completed",
        "description_es": "Contrato finalizado satisfactoriamente",
        "description_en": "Contract completed successfully",
        "is_active": 0,
        "display_order": 2
    },
    {
        "code": "cancelado",
        "name_es": "Cancelado",
        "name_en": "Cancelled",
        "description_es": "Contrato cancelado antes de su conclusion",
        "description_en": "Contract cancelled before completion",
        "is_active": 0,
        "display_order": 3
    },
    {
        "code": "en_proceso",
        "name_es": "En Proceso",
        "name_en": "In Progress",
        "description_es": "Procedimiento de contratacion en curso",
        "description_en": "Procurement procedure in progress",
        "is_active": 1,
        "display_order": 4
    },
    {
        "code": "adjudicado",
        "name_es": "Adjudicado",
        "name_en": "Awarded",
        "description_es": "Contrato adjudicado pero no iniciado",
        "description_en": "Contract awarded but not yet started",
        "is_active": 1,
        "display_order": 5
    },
    {
        "code": "suspendido",
        "name_es": "Suspendido",
        "name_en": "Suspended",
        "description_es": "Contrato temporalmente suspendido",
        "description_en": "Contract temporarily suspended",
        "is_active": 0,
        "display_order": 6
    },
    {
        "code": "desconocido",
        "name_es": "Desconocido",
        "name_en": "Unknown",
        "description_es": "Estatus no especificado en los datos originales",
        "description_en": "Status not specified in original data",
        "is_active": 0,
        "display_order": 100
    },
]

# =============================================================================
# SCHEMA CREATION FUNCTIONS
# =============================================================================

def create_schema(conn: sqlite3.Connection) -> None:
    """Create all tables and indexes."""
    print("Creating database schema...")
    cursor = conn.cursor()

    # Execute schema DDL
    cursor.executescript(SCHEMA_DDL)
    conn.commit()
    print("  Tables and indexes created")

    # Execute views DDL
    cursor.executescript(VIEWS_DDL)
    conn.commit()
    print("  Views created")


def seed_sectors(conn: sqlite3.Connection) -> None:
    """Insert sector reference data."""
    print("Seeding sectors...")
    cursor = conn.cursor()

    for sector in SECTORS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO sectors
            (id, code, name_es, name_en, acronym, color, description_es, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            sector["id"], sector["code"], sector["name_es"], sector["name_en"],
            sector["acronym"], sector["color"], sector["description_es"], sector["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(SECTORS_DATA)} sectors")


def seed_institution_types(conn: sqlite3.Connection) -> None:
    """Insert institution type reference data (v2.0 taxonomy)."""
    print("Seeding institution types (v2.0 taxonomy)...")
    cursor = conn.cursor()

    for it in INSTITUTION_TYPES_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO institution_types
            (id, code, name_es, name_en, description_es, description_en, risk_baseline, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            it["id"], it["code"], it["name_es"], it["name_en"],
            it.get("description_es"), it.get("description_en"),
            it["risk_baseline"], it["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(INSTITUTION_TYPES_DATA)} institution types")


def seed_size_tiers(conn: sqlite3.Connection) -> None:
    """Insert size tier reference data."""
    print("Seeding size tiers...")
    cursor = conn.cursor()

    for st in SIZE_TIERS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO size_tiers
            (id, code, name_es, name_en, min_contracts, max_contracts, risk_adjustment, description, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            st["id"], st["code"], st["name_es"], st["name_en"],
            st["min_contracts"], st.get("max_contracts"),
            st["risk_adjustment"], st.get("description"), st["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(SIZE_TIERS_DATA)} size tiers")


def seed_autonomy_levels(conn: sqlite3.Connection) -> None:
    """Insert autonomy level reference data."""
    print("Seeding autonomy levels...")
    cursor = conn.cursor()

    for al in AUTONOMY_LEVELS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO autonomy_levels
            (id, code, name_es, name_en, description_es, description_en, risk_baseline, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            al["id"], al["code"], al["name_es"], al["name_en"],
            al.get("description_es"), al.get("description_en"),
            al["risk_baseline"], al["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(AUTONOMY_LEVELS_DATA)} autonomy levels")


def seed_sub_sectors(conn: sqlite3.Connection) -> None:
    """Insert sub-sector reference data."""
    print("Seeding sub-sectors...")
    cursor = conn.cursor()

    for i, ss in enumerate(SUB_SECTORS_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO sub_sectors
            (id, sector_id, code, name_es, name_en, keywords, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            i, ss["sector_id"], ss["code"], ss["name_es"],
            ss.get("name_en"), ss.get("keywords"), i
        ))

    conn.commit()
    print(f"  Inserted {len(SUB_SECTORS_DATA)} sub-sectors")


def seed_ramos(conn: sqlite3.Connection) -> None:
    """Insert ramo reference data."""
    print("Seeding ramos (government branches)...")
    cursor = conn.cursor()

    for i, ramo in enumerate(RAMOS_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO ramos
            (id, clave, descripcion, sector_id)
            VALUES (?, ?, ?, ?)
        """, (i, ramo["clave"], ramo["descripcion"], ramo["sector_id"]))

    conn.commit()
    print(f"  Inserted {len(RAMOS_DATA)} ramos")


def seed_categories(conn: sqlite3.Connection) -> None:
    """Insert category reference data."""
    print("Seeding categories...")
    cursor = conn.cursor()

    for i, cat in enumerate(CATEGORIES_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO categories
            (id, sector_id, sub_sector_id, code, partida_pattern, name_es, name_en, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            i, cat["sector_id"], cat.get("sub_sector_id"), cat["code"],
            cat["partida_pattern"], cat["name_es"], cat.get("name_en")
        ))

    conn.commit()
    print(f"  Inserted {len(CATEGORIES_DATA)} categories")


def seed_procedure_types(conn: sqlite3.Connection) -> None:
    """Insert bilingual procedure type reference data."""
    print("Seeding procedure types (bilingual)...")
    cursor = conn.cursor()

    for i, pt in enumerate(PROCEDURE_TYPES_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO procedure_types
            (id, code, name_es, name_en, description_es, description_en,
             is_direct_award, is_competitive, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            i, pt["code"], pt["name_es"], pt["name_en"],
            pt.get("description_es"), pt.get("description_en"),
            pt["is_direct_award"], pt["is_competitive"], pt["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(PROCEDURE_TYPES_DATA)} procedure types")


def seed_contract_types(conn: sqlite3.Connection) -> None:
    """Insert bilingual contract type reference data."""
    print("Seeding contract types (bilingual)...")
    cursor = conn.cursor()

    for i, ct in enumerate(CONTRACT_TYPES_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO contract_types
            (id, code, name_es, name_en, description_es, description_en, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            i, ct["code"], ct["name_es"], ct["name_en"],
            ct.get("description_es"), ct.get("description_en"), ct["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(CONTRACT_TYPES_DATA)} contract types")


def seed_status_codes(conn: sqlite3.Connection) -> None:
    """Insert bilingual status code reference data."""
    print("Seeding status codes (bilingual)...")
    cursor = conn.cursor()

    for i, sc in enumerate(STATUS_CODES_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO status_codes
            (id, code, name_es, name_en, description_es, description_en,
             is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            i, sc["code"], sc["name_es"], sc["name_en"],
            sc.get("description_es"), sc.get("description_en"),
            sc["is_active"], sc["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(STATUS_CODES_DATA)} status codes")


def verify_schema(conn: sqlite3.Connection) -> None:
    """Verify schema was created correctly."""
    print("\nVerifying schema...")
    cursor = conn.cursor()

    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"  Tables ({len(tables)}): {', '.join(tables)}")

    # Verify expected tables exist
    expected_tables = [
        'sectors', 'sub_sectors', 'categories', 'ramos',
        'procedure_types', 'contract_types', 'status_codes',
        'institution_types', 'size_tiers', 'autonomy_levels',  # v2.0 taxonomy tables
        'vendors', 'institutions', 'contracting_units', 'contracts',
        'risk_scores', 'financial_metrics', 'exchange_rates',
        # v3.2 validation tables
        'ground_truth_cases', 'ground_truth_vendors', 'ground_truth_institutions',
        'ground_truth_contracts', 'validation_results'
    ]
    missing = [t for t in expected_tables if t not in tables]
    if missing:
        print(f"  WARNING: Missing tables: {', '.join(missing)}")

    # Check reference data counts
    for table in ['sectors', 'sub_sectors', 'ramos', 'categories',
                  'procedure_types', 'contract_types', 'status_codes',
                  'institution_types', 'size_tiers', 'autonomy_levels']:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table}: {count} records")

    # Check views
    cursor.execute("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name")
    views = [row[0] for row in cursor.fetchall()]
    print(f"  Views ({len(views)}): {', '.join(views)}")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main entry point."""
    print("=" * 70)
    print("YANG WEN-LI: NORMALIZED DATABASE SCHEMA CREATION")
    print("=" * 70)
    print(f"\nDatabase path: {DB_PATH}")

    # Remove existing database if exists
    if os.path.exists(DB_PATH):
        print(f"\nRemoving existing database...")
        os.remove(DB_PATH)

    # Create database connection
    conn = sqlite3.connect(DB_PATH)

    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        # Create schema
        create_schema(conn)

        # Seed reference data
        seed_sectors(conn)
        seed_sub_sectors(conn)
        seed_ramos(conn)
        seed_categories(conn)

        # Seed institution classification tables (v2.0 taxonomy)
        seed_institution_types(conn)
        seed_size_tiers(conn)
        seed_autonomy_levels(conn)

        # Seed bilingual lookup tables
        seed_procedure_types(conn)
        seed_contract_types(conn)
        seed_status_codes(conn)

        # Verify
        verify_schema(conn)

        print("\n" + "=" * 70)
        print("SCHEMA CREATION COMPLETE")
        print("=" * 70)
        print(f"\nDatabase ready at: {DB_PATH}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
