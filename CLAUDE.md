# Yang Wen-li: Mexican Government Procurement Analysis

> *"There are things that cannot be measured in terms of victory or defeat."* - Yang Wen-li
>
> AI-Powered Corruption Detection Platform for Mexican Government Procurement

---

## Quick Reference

| Item | Value |
|------|-------|
| **Database** | `backend/RUBLI_NORMALIZED.db` |
| **Records** | ~3.1M contracts (2002-2025) |
| **Validated Value** | ~6-8T MXN (after outlier removal) |
| **Sectors** | 12 main sectors |
| **Backend Port** | 8001 |
| **Frontend Port** | 3009 |

---

## Data Quality Rules

### Amount Validation (CRITICAL)

```python
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review
```

| Value Range | Action |
|-------------|--------|
| > 100B MXN | **REJECT** - Set to 0, exclude from analytics |
| > 10B MXN | **FLAG** - Include but mark for manual review |
| <= 10B MXN | Accept normally |

**Why**: The previous project (ogulin) had 7 contracts with TRILLION peso values in 2002-2003 that skewed all analytics. These are clearly decimal point errors in the original COMPRANET data.

### Single Bid Calculation

Single bid = competitive procedure (not direct award) with only 1 vendor

```sql
UPDATE contracts SET is_single_bid = 1
WHERE procedure_number IN (
    SELECT procedure_number FROM contracts
    WHERE is_direct_award = 0
    GROUP BY procedure_number
    HAVING COUNT(DISTINCT vendor_id) = 1
)
AND is_direct_award = 0;
```

---

## Data Sources

### COMPRANET Data (2002-2025)

| Structure | Years | Columns | Format | Key Differences |
|-----------|-------|---------|--------|-----------------|
| A | 2002-2010 | 13 | XLSX | Basic fields, no RFC |
| B | 2010-2017 | 45 | XLSX | Full detail, UPPERCASE |
| C | 2018-2022 | 45 | XLSX | Mixed case, SAT verification |
| D | 2023-2025 | 73 | CSV | Ramo codes, Partida Especifica |

### Data Coverage Warnings

| Field | A (2002-2010) | B (2010-2017) | C (2018-2022) | D (2023-2025) |
|-------|---------------|---------------|---------------|---------------|
| RFC | 0.1% | 15.7% | 30.3% | 47.4% |
| Partida | 0% | 0% | 0% | **100%** |
| Ramo | 0% | 0% | 0% | 71.6% |
| Direct Award | 0% | 72.2% | 78.4% | 77.7% |

**Key Limitation**: Structure A (2002-2010) has lowest data quality - risk scores may be underestimated for this period.

### File Locations

```
original_data/
├── 2002.xlsx ... 2022.xlsx      # Historical XLSX files (~700MB)
├── Contratos_CompraNet2023.csv  # 188MB
├── Contratos_CompraNet2024.csv  # 168MB
└── Contratos_CompraNet2025.csv  # 110MB
```

---

## 12-Sector Taxonomy

| ID | Code | Name | Ramo Codes | Color |
|----|------|------|------------|-------|
| 1 | salud | Salud | 12, 50, 51 | #dc2626 |
| 2 | educacion | Educacion | 11, 25, 48 | #3b82f6 |
| 3 | infraestructura | Infraestructura | 09, 15, 21 | #ea580c |
| 4 | energia | Energia | 18, 45, 46, 52, 53 | #eab308 |
| 5 | defensa | Defensa | 07, 13 | #1e3a5f |
| 6 | tecnologia | Tecnologia | 38, 42 | #8b5cf6 |
| 7 | hacienda | Hacienda | 06, 23, 24 | #16a34a |
| 8 | gobernacion | Gobernacion | 01-05, 17, 22, 27, 35, 36, 43 | #be123c |
| 9 | agricultura | Agricultura | 08 | #22c55e |
| 10 | ambiente | Medio Ambiente | 16 | #10b981 |
| 11 | trabajo | Trabajo | 14, 19, 40 | #f97316 |
| 12 | otros | Otros | (default) | #64748b |

---

## Risk Scoring Model

### 10-Factor Model (IMF CRI Aligned)

| Factor | Weight | Source |
|--------|--------|--------|
| Single bidding | 15% | OECD, EU ARACHNE |
| Non-open procedure | 15% | UNCITRAL |
| Price anomaly | 15% | World Bank INT |
| Vendor concentration | 10% | G20 |
| Short ad period | 10% | EU Directive 2014/24 |
| Short decision period | 10% | IMF CRI |
| Year-end timing | 5% | IMCO Mexico |
| Contract modification | 10% | UNODC |
| Threshold splitting | 5% | ISO 37001 |
| Network risk | 5% | OCDS |

### Risk Levels

| Level | Score | Color |
|-------|-------|-------|
| Critical | >= 0.6 | Red |
| High | 0.4 - 0.6 | Orange |
| Medium | 0.2 - 0.4 | Amber |
| Low | < 0.2 | Green |

---

## ETL Pipeline

### Running the Pipeline

```bash
cd backend/scripts
python etl_pipeline.py
```

This will:
1. Create database schema (12 sectors, sub-sectors, ramos)
2. Process XLSX files (2002-2022) with validation
3. Process CSV files (2023-2025) with validation
4. Calculate single_bid indicators
5. Update aggregate statistics

### Key Scripts

| Script | Purpose |
|--------|---------|
| `etl_pipeline.py` | Main unified pipeline with validation |
| `etl_create_schema.py` | Schema + seed data |
| `etl_classify.py` | Sector classification |

---

## Quick Commands

```bash
# Start backend
cd backend && uvicorn main:app --reload --port 8001

# Start frontend
cd frontend && npm run dev

# Run ETL pipeline
cd backend/scripts && python etl_pipeline.py
```

---

## Lessons from Previous Project (ogulin)

1. **ALWAYS validate amounts** before ingestion - reject > 100B MXN
2. **Calculate single_bid** during ETL, not after
3. **Data quality varies by structure** - older data has fewer flags
4. **Verify totals** make sense before building analytics

See `D:\Python\ogulin\ARCHIVE_TAKEAWAYS.md` for full post-mortem.

---

*Named after Yang Wen-li from Legend of the Galactic Heroes - the pragmatic historian who valued transparency and democratic institutions over blind ambition.*
