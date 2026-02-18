# Schema Decisions: RUBLI

> *"Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat."* - Sun Tzu
>
> Our schema is our strategy. These decisions shape everything that follows.

---

## Decision Log

| Date | Decision | Rationale | Trade-off Accepted |
|------|----------|-----------|-------------------|
| 2026-01-06 | Separate `risk_scores` table | Model versioning, recalculation flexibility | Extra JOIN per risk query |
| 2026-01-06 | Separate `financial_metrics` table | Clean separation, easier updates | Extra JOIN per financial query |
| 2026-01-06 | Remove vendor aggregates | Vendors need ML curation first | Slower vendor stats (must aggregate) |

---

## Decision 1: Separate Risk Scores Table

### What We Decided
Create a separate `risk_scores` table instead of embedding scores in `contracts`.

### Why This Is Smart

```
BEFORE (embedded):                 AFTER (separated):
┌─────────────────────┐           ┌─────────────────────┐
│      contracts      │           │      contracts      │
├─────────────────────┤           ├─────────────────────┤
│ id                  │           │ id                  │
│ amount_mxn          │           │ amount_mxn          │
│ risk_score       ───┼──X        │ ...                 │
│ price_anomaly    ───┼──X        └─────────────────────┘
│ temporal_anomaly ───┼──X                  │
│ vendor_risk      ───┼──X                  │ 1:1
│ ...                 │                     ▼
└─────────────────────┘           ┌─────────────────────┐
                                  │    risk_scores      │
                                  ├─────────────────────┤
                                  │ contract_id (FK)    │
                                  │ model_version       │
                                  │ calculated_at       │
                                  │ risk_score          │
                                  │ single_bid_score    │
                                  │ direct_award_score  │
                                  │ price_anomaly_score │
                                  │ temporal_score      │
                                  │ vendor_risk_score   │
                                  │ network_risk_score  │
                                  └─────────────────────┘
```

**Benefits**:
1. **Model Versioning**: Can track which model version generated scores
2. **Recalculation**: Can regenerate scores without touching contracts
3. **A/B Testing**: Can compare different models side-by-side
4. **Audit Trail**: `calculated_at` shows when scores were computed

**Cost**: One extra JOIN. Mitigation: Create a VIEW that joins them for convenience.

---

## Decision 2: Separate Financial Metrics Table

### What We Decided
Create a separate `financial_metrics` table for USD conversion and inflation adjustment.

### Why This Is Smart

```
┌─────────────────────┐           ┌─────────────────────┐
│      contracts      │           │  financial_metrics  │
├─────────────────────┤           ├─────────────────────┤
│ id                  │◄──────────│ contract_id (FK)    │
│ amount_mxn          │           │ amount_usd          │
│ amount_original     │           │ amount_mxn_2024     │
│ currency            │           │ amount_usd_2024     │
└─────────────────────┘           │ estimated_loss_mxn  │
                                  │ estimated_loss_usd  │
                                  │ exchange_rate_used  │
                                  │ inpc_factor         │
                                  │ cpi_factor          │
                                  │ calculated_at       │
                                  └─────────────────────┘
```

**Benefits**:
1. **Single Responsibility**: Contracts = raw data, financial = derived
2. **Recalculation**: New exchange rates? Regenerate without touching contracts
3. **Transparency**: Clear audit trail of what rates were used
4. **Extensibility**: Easy to add new financial metrics later

---

## Decision 3: Normalize Vendors (Remove Aggregates)

### What We Decided
Remove `total_contracts`, `total_amount_mxn`, `avg_risk_score` from vendors table. Vendor deduplication will be a separate, curated process using ML + rules.

### Why This Is Smart

**Current Problem**: The vendors table has 320K+ entries, many of which are duplicates:
- "EMPRESA ABC SA DE CV"
- "EMPRESA ABC, S.A. DE C.V."
- "EMPRESA ABC S.A. DE C.V"
- All the same vendor!

**Solution Architecture**:

```
Phase 1: Raw Vendors (now)          Phase 2: Curated Vendors (later)
┌─────────────────────┐             ┌─────────────────────┐
│ vendors_raw         │             │ vendors_canonical   │
├─────────────────────┤             ├─────────────────────┤
│ id                  │──────┐      │ id                  │
│ rfc                 │      │      │ rfc_primary         │
│ name                │      │      │ name_canonical      │
│ name_normalized     │      │      │ cluster_id          │
└─────────────────────┘      │      │ confidence_score    │
                             │      │ is_verified         │
                             │      └─────────────────────┘
                             │                 ▲
                             │                 │
                             │      ┌──────────┴──────────┐
                             │      │ vendor_clusters     │
                             │      ├─────────────────────┤
                             └─────►│ canonical_id (FK)   │
                                    │ raw_vendor_id (FK)  │
                                    │ match_method        │
                                    │ match_score         │
                                    └─────────────────────┘
```

**Deduplication Methods** (to be implemented):
1. **Exact RFC match**: Same RFC = same vendor (100% confidence)
2. **Fuzzy name matching**: Levenshtein distance, Jaro-Winkler
3. **Address clustering**: Same address = likely same entity
4. **Behavioral clustering**: Same bidding patterns, same institutions

---

## Updated Schema Design

### New Tables to Add

```sql
-- Risk Scores (separate from contracts)
CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER NOT NULL UNIQUE,
    model_version VARCHAR(20) DEFAULT 'v1.0',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Overall score
    risk_score REAL DEFAULT 0.0,
    risk_level VARCHAR(20),  -- 'low', 'medium', 'high', 'critical'

    -- Factor breakdown (10-factor model)
    single_bid_score REAL DEFAULT 0.0,
    direct_award_score REAL DEFAULT 0.0,
    price_anomaly_score REAL DEFAULT 0.0,
    vendor_concentration_score REAL DEFAULT 0.0,
    short_ad_period_score REAL DEFAULT 0.0,
    short_decision_score REAL DEFAULT 0.0,
    year_end_score REAL DEFAULT 0.0,
    modification_score REAL DEFAULT 0.0,
    threshold_split_score REAL DEFAULT 0.0,
    network_risk_score REAL DEFAULT 0.0,

    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Financial Metrics (separate from contracts)
CREATE TABLE IF NOT EXISTS financial_metrics (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER NOT NULL UNIQUE,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- USD conversion
    amount_usd REAL,
    exchange_rate_used REAL,
    exchange_rate_date DATE,

    -- Inflation adjustment
    amount_mxn_2024 REAL,
    amount_usd_2024 REAL,
    inpc_factor REAL,
    cpi_factor REAL,

    -- Loss estimation
    estimated_loss_mxn REAL,
    estimated_loss_usd REAL,
    loss_rate_applied REAL,

    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Exchange Rates Reference
CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    mxn_usd_fix REAL,
    mxn_inpc REAL,
    us_cpi REAL,
    source VARCHAR(100),
    UNIQUE(year, month)
);
```

### Columns to Remove from contracts

```sql
-- These will be in risk_scores:
-- risk_score, price_anomaly_score, temporal_anomaly_score, vendor_risk_score

-- These will be in financial_metrics:
-- (none currently in contracts, but we won't add them there)
```

### Columns to Remove from vendors

```sql
-- Remove these aggregates (will compute on demand):
-- total_contracts, total_amount_mxn, avg_risk_score
```

---

## Views for Convenience

```sql
-- Unified view that joins contracts with risk and financial data
CREATE VIEW v_contracts_full AS
SELECT
    c.*,
    r.risk_score,
    r.risk_level,
    r.single_bid_score,
    r.direct_award_score,
    f.amount_usd,
    f.amount_mxn_2024,
    f.estimated_loss_mxn
FROM contracts c
LEFT JOIN risk_scores r ON c.id = r.contract_id
LEFT JOIN financial_metrics f ON c.id = f.contract_id;

-- Vendor stats (computed, not stored)
CREATE VIEW v_vendor_stats AS
SELECT
    v.id,
    v.rfc,
    v.name,
    COUNT(c.id) as total_contracts,
    SUM(c.amount_mxn) as total_amount_mxn,
    AVG(r.risk_score) as avg_risk_score,
    MIN(c.contract_date) as first_contract,
    MAX(c.contract_date) as last_contract
FROM vendors v
LEFT JOIN contracts c ON v.id = c.vendor_id
LEFT JOIN risk_scores r ON c.id = r.contract_id
GROUP BY v.id;
```

---

## Learning Resources

### Database Design
- [Database Normalization Explained](https://www.guru99.com/database-normalization.html) - Visual guide to 1NF, 2NF, 3NF
- [Star Schema vs Snowflake Schema](https://www.guru99.com/star-snowflake-data-warehousing.html) - Data warehouse patterns
- [SQLite Best Practices](https://www.sqlite.org/np1queryprob.html) - Avoiding N+1 queries

### Entity Resolution (Vendor Deduplication)
- [Record Linkage Tutorial](https://recordlinkage.readthedocs.io/en/latest/) - Python library
- [Dedupe.io Documentation](https://docs.dedupe.io/en/latest/) - ML-based deduplication
- [Fuzzy Matching with Python](https://www.datacamp.com/tutorial/fuzzy-string-python) - String similarity algorithms

---

## Next Steps

1. Update `etl_create_schema.py` with new tables
2. Create migration for existing data (if any)
3. Update ETL pipeline to populate new tables
4. Create views for convenience

---

*"A person without data is just another person with an opinion."* - W. Edwards Deming
