# Changelog

All notable changes to the Yang Wen-li Procurement Analysis Platform.

## [0.4.0] - 2026-01-15

### Phase 4: Risk Scoring Enhancement

Enhanced the 10-factor IMF CRI-aligned risk scoring model by implementing 3 previously missing factors.

#### New Risk Factors Implemented

**Factor 5: Short Advertisement Period (10% weight)**
- Detects contracts with suspiciously short time between publication and contract date
- Thresholds: <5 days (full risk), <15 days (70%), <30 days (30%)
- Triggering rate: 416,278 contracts (13.4%)
- Data source: `publication_date` and `contract_date` columns

**Factor 9: Threshold Splitting (5% weight)**
- Detects potential contract splitting to avoid tender thresholds
- Pattern: Same vendor + same institution + same day = suspicious
- 114,224 splitting patterns detected in database
- Thresholds: 5+ contracts (full risk), 3-4 (60%), 2 (30%)
- Triggering rate: 341,631 contracts (11.0%)

**Factor 10: Network Risk (5% weight)**
- Leverages Phase 3 vendor deduplication results
- Vendors in same vendor_group have network exposure
- 11,774 vendors in 4,536 groups have network risk
- Thresholds: 5+ members (full risk), 3-4 (60%), 2 (30%)
- Triggering rate: 257,970 contracts (8.3%)

#### Risk Distribution Improvement

| Level | Before | After | Change |
|-------|--------|-------|--------|
| Low | 87.8% | 79.6% | -8.2% |
| Medium | 12.2% | 20.3% | +8.1% |
| High | 0.003% (81) | 0.08% (2,405) | **30x increase** |
| Critical | 0% | 0% | - |

#### Files Modified
- `backend/scripts/calculate_risk_scores.py` - Added 3 new factors, helper functions

---

## [0.3.0] - 2026-01-15

### Phase 3: Vendor Deduplication (Splink Implementation)

Implemented probabilistic record linkage using UK Ministry of Justice's Splink library for vendor deduplication.

#### Results
- **4,536 vendor groups** created
- **11,774 vendors deduplicated** (8.67% deduplication rate)
- **0 RFC conflicts** (tax ID validation enforced)
- Quality over quantity approach

#### Technical Implementation

**Splink Framework** (`backend/hyperion/splink/`)
- `framework.py` - Main deduplication orchestrator using Fellegi-Sunter model
- `config.py` - Configuration with generic token blocklists, subsidiary indicators
- `validator.py` - Quality validation with strict false positive prevention
- `reporter.py` - Persistence and markdown report generation

**Validation Rules (Strict False Positive Prevention)**
1. RFC Conflict Detection - Different tax IDs = reject
2. Personal/Company Mixing - "MARIA DE LAS MERCEDES" vs "MERCEDES BENZ" = reject
3. Subsidiary Detection - "PEMEX EXPLORACION" vs "PEMEX REFINACION" = reject
4. Generic Name Validation - "GRUPO ALFA" vs "GRUPO BETA" without RFC = reject
5. Name Length Mismatch - Significant length differences = reject

**Generic First Token Blocklist**
```
GRUPO, CONSTRUCTORA, CONSTRUCCIONES, COMERCIALIZADORA,
SERVICIOS, DISTRIBUIDORA, PROMOTORA, INMOBILIARIA,
OPERADORA, CONSULTORIA, PROVEEDORA, ADMINISTRADORA,
CORPORATIVO, INDUSTRIAL, EMPRESA, COMPANIA
```

#### Database Schema
- `vendor_groups` - Canonical vendor information
- `vendor_aliases` - Mapping of vendor_id to group_id

#### Files Added
- `backend/hyperion/splink/` - Complete Splink implementation
- `docs/DESIGN_VENDOR_DEDUPLICATION.md` - Technical design document

---

## [0.2.0] - 2026-01-08

### Vendor Classification System

#### Results
- 37,372 verified vendor industry classifications
- 74 industry categories mapped to 12 sectors
- Industry-sector mismatch detection (+3% risk bonus)

#### Files Added
- `backend/scripts/verified_vendor_data.py` - 5,000+ classification patterns
- `backend/scripts/apply_verified_classifications.py` - Classification application

---

## [0.1.0] - 2026-01-05

### Initial ETL Pipeline

#### Features
- Complete ETL pipeline for COMPRANET data (2002-2025)
- 3,110,017 contracts processed
- 4 data structures (A/B/C/D) normalized
- 12-sector taxonomy with ramo code mapping
- Data quality validation (100B MXN max, 10B MXN flag threshold)

#### Files Added
- `backend/scripts/etl_pipeline.py` - Main ETL orchestrator
- `backend/scripts/etl_create_schema.py` - Schema creation
- `backend/scripts/etl_classify.py` - Sector classification

---

## Risk Scoring Model Reference

### 10-Factor Model (IMF CRI Aligned)

| # | Factor | Weight | Status | Data Source |
|---|--------|--------|--------|-------------|
| 1 | Single Bidding | 15% | Active | `is_single_bid` |
| 2 | Non-Open Procedure | 15% | Active | `is_direct_award` |
| 3 | Price Anomaly | 15% | Active | `amount_mxn` vs sector mean |
| 4 | Vendor Concentration | 10% | Active | Calculated |
| 5 | Short Ad Period | 10% | **Active (v0.4.0)** | `publication_date` |
| 6 | Short Decision Period | 10% | Inactive | No data |
| 7 | Year-End Timing | 5% | Active | `is_year_end` |
| 8 | Contract Modification | 10% | Inactive | No data |
| 9 | Threshold Splitting | 5% | **Active (v0.4.0)** | Pattern detection |
| 10 | Network Risk | 5% | **Active (v0.4.0)** | `vendor_groups` |

### Additional Factors
- Industry-Sector Mismatch: +3% (bonus, not part of base 100%)

### Risk Levels
- **Critical**: >= 0.6
- **High**: >= 0.4
- **Medium**: >= 0.2
- **Low**: < 0.2
