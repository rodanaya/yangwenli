# Database Schema Documentation

> Complete reference for the RUBLI_NORMALIZED.db SQLite database.

---

## Overview

| Property | Value |
|----------|-------|
| **Database** | `backend/RUBLI_NORMALIZED.db` |
| **Engine** | SQLite 3.x |
| **Records** | ~3.1M contracts (2002-2025) |
| **Size** | ~1.5 GB |

---

## Entity Relationship Diagram

```
                    ┌─────────────┐
                    │   sectors   │
                    ├─────────────┤
                    │ id (PK)     │
                    │ code        │
                    │ name_es     │
                    └──────┬──────┘
                           │
                           │ 1:N
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   vendors   │     │  contracts  │     │institutions │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ vendor_id   │────►│ id (PK)     │
│ name        │     │ institution │     │ name        │
│ rfc         │     │ sector_id   │     │ abbreviation│
│ ...         │     │ amount_mxn  │     │ inst_type   │
└─────────────┘     │ risk_score  │     └─────────────┘
                    │ ...         │
                    └─────────────┘
```

---

## Tables

### contracts

Primary table containing all procurement contracts.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | Yes (PK) |
| `contract_number` | TEXT | Official contract identifier | Yes |
| `procedure_number` | TEXT | Tender procedure identifier | Yes |
| `title` | TEXT | Contract title/description | No |
| `description` | TEXT | Full description | No |
| `amount_mxn` | REAL | Contract value in MXN | Yes |
| `currency` | TEXT | Original currency (MXN, USD, EUR) | No |
| `contract_date` | DATE | Date of contract signing | Yes |
| `contract_year` | INTEGER | Extracted year for filtering | Yes |
| `start_date` | DATE | Contract start date | No |
| `end_date` | DATE | Contract end date | No |
| `sector_id` | INTEGER | FK to sectors | Yes |
| `vendor_id` | INTEGER | FK to vendors | Yes |
| `institution_id` | INTEGER | FK to institutions | Yes |
| `procedure_type` | TEXT | Type of procurement procedure | No |
| `contract_type` | TEXT | Type of contract | No |
| `is_direct_award` | INTEGER | 1 if direct award, 0 otherwise | Yes |
| `is_single_bid` | INTEGER | 1 if only one bidder | Yes |
| `risk_score` | REAL | Calculated risk score (0-1) | Yes |
| `risk_level` | TEXT | low/medium/high/critical | Yes |
| `risk_factors` | TEXT | JSON array of triggered factors | No |
| `data_structure` | TEXT | Source structure (A/B/C/D) | No |

**Indexes:**
```sql
CREATE INDEX idx_contracts_sector ON contracts(sector_id);
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_institution ON contracts(institution_id);
CREATE INDEX idx_contracts_year ON contracts(contract_year);
CREATE INDEX idx_contracts_risk ON contracts(risk_level);
CREATE INDEX idx_contracts_amount ON contracts(amount_mxn);
```

### vendors

All vendors/suppliers who have received government contracts.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | Yes (PK) |
| `name` | TEXT | Original vendor name | Yes |
| `name_normalized` | TEXT | Normalized/cleaned name | Yes |
| `rfc` | TEXT | Mexican tax ID (RFC) | Yes |
| `industry_id` | INTEGER | FK to industries | No |
| `is_verified` | INTEGER | Manual verification flag | No |
| `phonetic_code` | TEXT | Soundex/metaphone code | Yes |
| `first_token` | TEXT | First word of name | Yes |

**Indexes:**
```sql
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_normalized ON vendors(name_normalized);
CREATE INDEX idx_vendors_rfc ON vendors(rfc);
CREATE INDEX idx_vendors_phonetic ON vendors(phonetic_code);
```

### institutions

Government institutions that award contracts.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | Yes (PK) |
| `name` | TEXT | Full institution name | Yes |
| `abbreviation` | TEXT | Common abbreviation (IMSS, CFE) | Yes |
| `institution_type` | TEXT | Type from 19-type taxonomy | Yes |
| `ramo_code` | INTEGER | Budget classification code | No |
| `is_federal` | INTEGER | 1 if federal, 0 if state/local | No |

### sectors

12-sector taxonomy for contract classification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (1-12) |
| `code` | TEXT | Sector code (salud, educacion, etc.) |
| `name_es` | TEXT | Spanish name |
| `name_en` | TEXT | English name |
| `ramo_codes` | TEXT | JSON array of mapped ramo codes |

**Sector Mapping:**

| ID | Code | Ramo Codes |
|----|------|------------|
| 1 | salud | 12, 50, 51 |
| 2 | educacion | 11, 25, 48 |
| 3 | infraestructura | 09, 15, 21 |
| 4 | energia | 18, 45, 46, 52, 53 |
| 5 | defensa | 07, 13 |
| 6 | tecnologia | 38, 42 |
| 7 | hacienda | 06, 23, 24 |
| 8 | gobernacion | 01-05, 17, 22, 27, 35, 36, 43 |
| 9 | agricultura | 08 |
| 10 | ambiente | 16 |
| 11 | trabajo | 14, 19, 40 |
| 12 | otros | (default fallback) |

### vendor_stats

Pre-computed vendor statistics for dashboard performance.

| Column | Type | Description |
|--------|------|-------------|
| `vendor_id` | INTEGER | FK to vendors (PK) |
| `total_contracts` | INTEGER | Lifetime contract count |
| `total_value_mxn` | REAL | Lifetime contract value |
| `avg_risk_score` | REAL | Average risk across contracts |
| `first_contract_year` | INTEGER | Earliest contract year |
| `last_contract_year` | INTEGER | Most recent contract year |
| `primary_sector_id` | INTEGER | Most common sector |
| `institution_count` | INTEGER | Distinct institutions served |

---

## Data Quality Notes

### Amount Validation

| Value Range | Action |
|-------------|--------|
| > 100B MXN | REJECT - Data error |
| > 10B MXN | FLAG - Manual review |
| <= 10B MXN | Accept normally |

### Data Structures by Year

| Structure | Years | RFC Coverage | Key Limitation |
|-----------|-------|--------------|----------------|
| A | 2002-2010 | 0.1% | Lowest quality |
| B | 2010-2017 | 15.7% | UPPERCASE text |
| C | 2018-2022 | 30.3% | Mixed case |
| D | 2023-2025 | 47.4% | Best quality |

---

## Common Queries

### Count contracts by sector
```sql
SELECT s.name_es, COUNT(*) as count
FROM contracts c
JOIN sectors s ON c.sector_id = s.id
GROUP BY s.id
ORDER BY count DESC;
```

### Top vendors by value
```sql
SELECT v.name, SUM(c.amount_mxn) as total_value
FROM contracts c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.amount_mxn <= 100000000000  -- Exclude data errors
GROUP BY v.id
ORDER BY total_value DESC
LIMIT 20;
```

### High-risk contracts
```sql
SELECT *
FROM contracts
WHERE risk_level IN ('high', 'critical')
AND amount_mxn > 1000000000  -- > 1B MXN
ORDER BY risk_score DESC;
```

### Single-bid rate by year
```sql
SELECT
    contract_year,
    COUNT(*) as total,
    SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids,
    ROUND(SUM(CASE WHEN is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as pct
FROM contracts
WHERE is_direct_award = 0  -- Only competitive procedures
GROUP BY contract_year
ORDER BY contract_year;
```

---

## Migration History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial schema |
| 1.1.0 | 2024-06 | Added risk_score, risk_level |
| 2.0.0 | 2025-01 | Added vendor_stats, institution types |

---

*Last updated: January 2026*
