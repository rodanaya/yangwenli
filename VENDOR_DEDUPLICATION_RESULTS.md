# Vendor Deduplication Results - Quality Control Report

**Generated:** 2026-01-14
**Database:** RUBLI_NORMALIZED.db
**Total Vendors:** 320,429

---

## Summary (After Quality Control)

| Metric | Initial Run | After QC Fix |
|--------|-------------|--------------|
| Total Vendors | 320,429 | 320,429 |
| Normalization Coverage | 100% | 100% |
| Vendor Groups Created | 4,921 | 1,235 |
| Vendors in Groups | 14,482 (4.5%) | 5,087 (1.6%) |
| Deduplication Rate | 3.0% | 1.2% |
| Corporate Group Errors (individuals) | 20,000+ | 0 |

---

## Quality Control Findings

### Issue 1: Overly Broad Corporate Group Patterns

The `verified_vendor_data.py` contains 5,000 SQL LIKE patterns for corporate groups. Many patterns were too broad:

| Pattern | Intended Match | Actual Matches |
|---------|----------------|----------------|
| `%INTEL%` | Intel Corporation | INTELIGENCIA, INTELTECH, INTELLEGO |
| `%LEGO%` | LEGO Group | RALEGO, GALLEGOS |
| `%DE LA ROSA%` | Dulces De La Rosa | People named "DE LA ROSA" |
| `%ZEP%` | Zep Inc | ZEPEDA (common surname) |
| `%ROSA%` | Various | 20,000+ false matches |

**Impact:** 45,539 vendors were initially assigned corporate groups, but 20,000+ were individuals incorrectly matched.

**Fix Applied:** Created `fix_corporate_groups.py` to:
- Skip 20 problematic corporate groups entirely
- Skip 48 problematic patterns
- Apply only to companies (is_individual=0)
- Result: 3,568 vendors with clean corporate group assignments

### Issue 2: RFC Uniqueness

RFC (Registro Federal de Contribuyentes) is Mexico's unique tax ID:
- 57,915 vendors have RFC
- 45,996 have valid RFC (≥10 characters)
- **0 RFC groups with 2+ vendors** - each RFC is unique

**Conclusion:** RFC-based deduplication yields no duplicates because RFC is already unique. Vendors with different RFCs are genuinely different legal entities.

### Issue 3: Individual Over-Merging (Fixed)

Initial run grouped individuals by common names:
- 329 "JORGE HERNANDEZ AGUIRRE"
- 215 "MARCO ANTONIO LOPEZ PEREZ"

**Fix:** Enhanced clustering now excludes individuals from name-based grouping.

---

## Final Clustering Results

| Phase | Clusters Created |
|-------|------------------|
| Corporate Group | 361 |
| RFC Match | 0 |
| Company Name Match | 952 |
| **Total Groups** | **1,235** |

---

## Why Deduplication Rate is Low (1.2%)

1. **RFC is Unique**: Mexican tax IDs ensure legal entity uniqueness
2. **Pattern Quality**: Corporate group patterns need refinement
3. **Data Quality**: Most vendors are genuinely unique entities
4. **Conservative Approach**: Avoiding false positives

**The 320,429 vendors represent mostly unique legal entities.** The expected 15-25% deduplication rate was based on name variations, but:
- Name normalization is already applied during ETL
- Most variations are already consolidated
- RFC ensures legal uniqueness

---

## Scripts Created

| Script | Purpose |
|--------|---------|
| `apply_corporate_groups.py` | Apply corporate groups from verified data |
| `fix_corporate_groups.py` | Fix overly broad patterns |
| `cluster_vendors_enhanced.py` | Enhanced clustering with corporate groups |

---

## Recommendations

1. **Improve Pattern Quality**: The 5,000 patterns in `verified_vendor_data.py` need manual review to fix overly broad matches
2. **Use Word Boundaries**: Change patterns from `%INTEL%` to `% INTEL %` or use regex
3. **Focus on Companies**: Individual vendors should only be grouped by RFC match
4. **Accept Low Deduplication**: The 1.2% rate may be accurate given RFC uniqueness

---

## Rollback Information

Backup: `RUBLI_NORMALIZED.db.backup_vendordedup`

```sql
-- Clear corporate groups
UPDATE vendors SET corporate_group = NULL;

-- Reset vendor groups
DELETE FROM vendor_aliases;
DELETE FROM vendor_groups;
```
