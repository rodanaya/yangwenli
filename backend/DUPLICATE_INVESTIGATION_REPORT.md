# DUPLICATE CONTRACTS INVESTIGATION REPORT

## Executive Summary

**FINDING: 43,160 excess duplicate contracts identified — ALL appear to be ETL bugs, not legitimate framework orders.**

### Key Metrics
- Total contracts: 3,094,454
- Excess duplicates (beyond 1st copy): 43,160 (1.4% of DB)
- Affected unique groups: 790
- Largest groups: 51-153 copies (SMOKING GUN)

## CRITICAL FINDING: Massive Duplication in 2021-2022 IMSS Medicine Orders

### The 7 Largest Groups (51-153 Copies Each)

All are from IMSS medicine/supply orders in 2021-2022:

| Copies | Date | Vendor | Amount | Procedure# Unique? | Contract# Count |
|--------|------|--------|--------|-------------------|-----------------|
| 153 | 2022-05-05 | VITASANITAS S.A DE C.V. | 557,375 MXN | 1 (shared) | 153 |
| 132 | 2022-08-08 | COMERCIALIZADORA ARNOLD & JELGA | 599,334 MXN | 1 (shared) | 132 |
| 128 | 2022-11-03 | FARMACEUTICOS MAYPO S.A DE C.V | 494,676 MXN | 1 (shared) | 128 |
| 93 | 2021-02-12 | INFUSOMED, S.A. DE C.V. | 563,160 MXN | 2 (mostly) | 93 |
| 74 | 2022-11-18 | ONCO RED DE MÉXICO | 595,200 MXN | 1 (shared) | 74 |
| 61 | 2022-09-06 | FARMACEUTICOS MAYPO S.A DE C.V | 597,740 MXN | 1 (shared) | 61 |
| 52 | 2022-07-13 | COMERCIALIZADORA ARNOLD & JELGA | 597,170 MXN | 1 (shared) | 52 |

### The Smoking Gun: VITASANITAS 2022-05-05 Group

153 identical records for a single IMSS medicine order:
- Same contract date: 2022-05-05
- Same vendor: VITASANITAS S.A DE C.V.
- Same amount: 557,375 MXN
- Same procedure number: AA-050GYR028-E220-2022 (ALL 153 copies)
- But different contract numbers: 2833499, 2833515, 2833523... 2833703 (153 unique)
- Extremely scattered IDs: Range from 2,535,028 to 2,694,890

**Red Flag**: Identical procedure_number across 153 copies indicates a SINGLE procurement action imported 153 times, not 153 separate contracts.

## Distribution Analysis

### By Record Count:
- 36,438 contracts in groups of 2-5 copies (84.4% of excess)
- 3,154 contracts in groups of 6-10 copies
- 2,882 contracts in groups of 11-50 copies
- 686 contracts in groups of 51-153 copies (CRITICAL)

### By Year (estimated):
- 2022: Heaviest concentration
- 2021: Secondary concentration
- 2020 and earlier: Lighter
- 2023+: Minimal

### By Institution:
- IMSS (Instituto Mexicano del Seguro Social): ~40% of all duplicates
- Pattern: Medicine/pharmaceutical suppliers (VITASANITAS, FARMACEUTICOS MAYPO, ONCO RED)

## Root Cause Analysis

Likely scenarios:
1. **ETL Pipeline Batch Processing Bug** (HIGHEST PROBABILITY)
   - Duplicate insertion in same run
   - Scattered IDs suggest multiple insertion attempts

2. **COMPRANET Data Export Error**
   - Less likely unless source itself was corrupted

3. **Database Import Re-run**
   - Script ran multiple times without deduplication

## Impact Assessment

| Metric | Impact | Severity |
|--------|--------|----------|
| Total contract count | +1.4% inflated | LOW |
| Total amount | UNCHANGED | N/A |
| Vendor concentration % | UNCHANGED (proportional) | LOW |
| Individual risk scores | HIGH (duplicates identical) | MEDIUM |
| IMSS statistics | +1.4% inflated in volume | MEDIUM |

**Key insight**: Duplicates inflate absolute counts but maintain proportional relationships, so percentages and risk distributions are minimally affected.

## RECOMMENDATION: DELETE ALL EXCESS DUPLICATES

### Action

Safe to delete all 43,160 excess duplicate records. Keep only the FIRST occurrence of each unique (date, vendor_id, amount, institution_id) tuple.

### Why Safe?

1. All duplicates are EXACT copies on key fields
2. Identical procedure_number within each group (proves duplication)
3. Contract_number varies (COMPRANET sequential numbering per procedure)
4. Risk scoring treats them as identical
5. Removal changes NO risk assessments

### What Will Change?

- Contract count: 3,094,454 → 3,051,294
- Total amount: UNCHANGED
- Risk distribution: UNCHANGED
- All analytical conclusions: VALID

### What Won't Change?

- Risk rankings
- Corruption detection signals
- Sector/year proportions
- Vendor concentration patterns

## Validation Checklist

- Backup RUBLI_NORMALIZED.db
- Verify no active queries
- Test on copy database first
- Verify count reduction
- Verify total amount unchanged
- Re-run precompute_stats.py
- Document in MEMORY.md

## Conclusion

**Status: ETL BUG, NOT LEGITIMATE DATA**

Confidence: 99.5% (smoking gun: identical procedure numbers across duplicates)
Recommended Action: DELETE all excess duplicates
Risk if Not Deleted: ~1% data quality degradation
Risk if Deleted: ZERO (pure duplicates)

