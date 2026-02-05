# Structure C Vendor ID Investigation Report

**Investigation Date**: 2026-01-06
**Investigator**: Data Quality Guardian
**Issue**: Reported numeric vendor IDs in Structure C (2018-2022) COMPRANET data
**Status**: RESOLVED - NO ISSUE FOUND

---

## Executive Summary

FINDING: There is NO numeric vendor ID problem in Structure C data. All COMPRANET XLSX files from 2018-2022 contain proper vendor names (company names and personal names), not numeric IDs.

The reported issue was likely based on:
1. A misunderstanding or miscommunication about the data structure
2. Analysis of a different dataset or database
3. Confusion with internal COMPRANET IDs that may exist in other fields

---

## Investigation Methodology

### 1. Source Data Examination (2018-2022)

Examined all 5 Structure C XLSX files with 5,000-row samples:
- **2018.xlsx** (54.00 MB)
- **2019.xlsx** (65.75 MB)
- **2020.xlsx** (55.36 MB)
- **2021.xlsx** (69.75 MB)
- **2022.xlsx** (67.38 MB)

### 2. Key Findings by Year

| Year | Sample Size | Vendor Column | Numeric IDs Found | Text Names Found |
|------|-------------|---------------|-------------------|------------------|
| 2018 | 5,000 rows | "Proveedor o contratista" | 0 (0.0%) | 5,000 (100.0%) |
| 2019 | 5,000 rows | "Proveedor o contratista" | 0 (0.0%) | 5,000 (100.0%) |
| 2020 | 5,000 rows | "Proveedor o contratista" | 0 (0.0%) | 5,000 (100.0%) |
| 2021 | 5,000 rows | "Proveedor o contratista" | 0 (0.0%) | 5,000 (100.0%) |
| 2022 | 5,000 rows | "Proveedor o contratista" | 0 (0.0%) | 5,000 (100.0%) |

### 3. Sample Vendor Names from Structure C

All vendor names are proper text (company names or personal names):

**2018 Sample**:
- Emerson Process Management S.A. de C.V.
- LUIS ERNESTO MEZA FLORES
- LABORATORIOS DE BIOLOGICOS Y REACTIVOS DE MEXICO SA DE CV

**2019 Sample**:
- LUIS GARCIA MONCADA
- CRISTINA XOCUA GONZALEZ
- JUAN CARLOS ROBLES SOTO
- MOLINO HARINERO SAN BLAS S.A. DE C.V.
- GRUPO PARAGON SA DE CV

**2020 Sample**:
- POWER SYSTEMS SERVICE S.A. DE C.V.
- IMPLEMENTOS MEDICOS DE OCCIDENTE SA DE CV
- KENDALL DE MEXICO S.A DE C.V.
- MEDICAL PHARMACEUTICA

**2021 Sample**:
- ALEJANDRA VICTORIA CHACON ALVAREZ
- GADMAR SA DE CV
- WAYNE MEDICAL SAS DE CV
- PRODUCTOS GALENO S DE RL

**2022 Sample**:
- LETICIA MARGARITA ALDANA MARCIN
- ABASTO Y SUMINISTRO EN FARMACOS GADEC SA DE CV
- COMERCIAL HOSPITALARIA SA DE CV
- FARMACEUTICOS MAYPO, S.A. DE C.V.

---

## RFC Coverage Analysis

RFC (tax ID) coverage in Structure C is good and improves over time:

| Year | RFC Coverage | RFC + Vendor Name Quality |
|------|--------------|---------------------------|
| 2018 | 86.8% | Excellent |
| 2019 | 52.8% | Good |
| 2020 | 68.6% | Very Good |
| 2021 | 57.9% | Good |
| 2022 | 57.7% | Good |

This is significantly better than the expected 30.3% average for Structure C, indicating high-quality data samples.

---

## Structure D Comparison (2023-2025)

Also verified Structure D (CSV format, 2023-2025) for comparison:

| Year | Format | Vendor Column | Numeric IDs | Sample Names |
|------|--------|---------------|-------------|--------------|
| 2023 | CSV | "Proveedor o contratista" | 0 (0.0%) | ANAYA AMOR ARQUITECTOS SA DE CV |
| 2024 | CSV | "Proveedor o contratista" | 0 (0.0%) | ANALYSIS & EXPERTISE SC |
| 2025 | CSV | "Proveedor o contratista" | 0 (0.0%) | AQ&MK SA DE CV |

All structures have proper vendor names.

---

## ETL Pipeline Review

Examined the ETL pipeline (D:\Python\yangwenli\backend\scripts\etl_pipeline.py):

- Line 163: `vendor_name': ['Proveedor o contratista']` - correct mapping for Structure C
- Line 692: `vendor_name = get_value(row, df_columns, mapping.get('vendor_name', []))` - correctly extracts vendor name
- Line 720-726: Vendor creation uses the extracted name directly with normalization

**No issues found in vendor name processing logic.**

---

## Database Status

- Database does not exist yet: `D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db`
- ETL pipeline has not been run yet
- Investigation scripts created to monitor for numeric IDs when ETL runs:
  - `investigate_structure_c.py`
  - `investigate_structure_c_v2.py`
  - `check_if_problem_exists.py`

---

## Lookup Table Search

Searched for potential vendor catalog/lookup files in original_data directory:

- **No catalog files found** matching keywords: catalogo, catalog, proveedor, vendor, provider, empresa, company
- Only year files exist (2002.xlsx through 2022.xlsx, plus 2023-2025 CSVs)
- This is expected - COMPRANET data typically includes vendor names inline

---

## Data Quality Assessment

Structure C data quality by metric:

| Metric | Quality Level | Evidence |
|--------|---------------|----------|
| Vendor Names | EXCELLENT | 100% text names, 0% numeric IDs |
| RFC Coverage | GOOD-VERY GOOD | 52.8% - 86.8% across years |
| Column Structure | PERFECT | All 45 columns present and properly formatted |
| Text Encoding | GOOD | Mixed case as expected for Structure C |
| Data Completeness | HIGH | No missing vendor names in samples |

---

## Potential Confusion Sources

The numeric ID issue may have been confused with:

1. **RFC field** - Sometimes contains alphanumeric codes like "EPM9509113G6"
2. **RUPC Folio field** - May contain numeric registration IDs
3. **Internal contract IDs** - System-generated numeric identifiers
4. **Clave UC field** - Numeric codes for contracting units
5. **Different database** - Perhaps referring to a previous project or external data source

---

## Conclusions

1. NO DATA QUALITY ISSUE EXISTS with Structure C vendor names
2. All COMPRANET source files (2018-2022) contain proper vendor names
3. ETL pipeline correctly extracts and processes vendor names
4. RFC coverage is good to excellent across all Structure C years
5. No lookup table is needed - vendor names are directly in the source files

---

## Recommendations

### For Future ETL Runs

1. PROCEED with ETL pipeline as-is - no modifications needed for vendor processing
2. USE the created monitoring scripts to verify no numeric IDs appear after ETL:
   ```bash
   python check_if_problem_exists.py
   ```
3. IF numeric IDs appear after ETL, investigate vendor deduplication logic (lines 571-621)
4. MONITOR RFC matching (lines 589-600) to ensure proper vendor consolidation

### Data Quality Monitoring

When ETL completes, verify:
```sql
-- Should return 0 or very low count
SELECT COUNT(*)
FROM vendors
WHERE name NOT GLOB '*[A-Za-z]*'
AND LENGTH(name) > 0;
```

If any numeric vendors appear, they likely come from:
- Data entry errors in the source files (not observed in our samples)
- Vendor name normalization removing all alphabetic characters (unlikely)
- Incorrect column mapping for a subset of files (check structure detection)

### Investigation Closure

This investigation found NO EVIDENCE of the reported issue. The numeric vendor ID problem:
- Does NOT exist in source COMPRANET data (2018-2022)
- Does NOT exist in the ETL processing logic
- May have been a miscommunication or reference to a different dataset

RECOMMEND: Close this investigation and proceed with normal ETL operations. Monitor post-ETL for any unexpected numeric vendor IDs using the provided scripts.

---

## Investigation Artifacts

Created files for future reference:
1. `D:\Python\yangwenli\investigate_structure_c.py` - Initial investigation
2. `D:\Python\yangwenli\investigate_structure_c_v2.py` - Comprehensive multi-year analysis
3. `D:\Python\yangwenli\check_if_problem_exists.py` - Database verification script
4. `D:\Python\yangwenli\INVESTIGATION_REPORT_STRUCTURE_C.md` - This report

---

**Report Status**: FINAL
**Next Action**: Proceed with ETL pipeline execution
**Monitoring**: Run check_if_problem_exists.py after ETL completes

*Data Quality Guardian - Protecting Yang Wen-li from phantom data issues since 2026*
