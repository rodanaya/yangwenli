# Ground Truth Quality Report

**Generated:** 2026-03-25 | **Database:** RUBLI_NORMALIZED.db

---

## 1. Executive Summary

The RUBLI ground truth system contains **1,363 cases** documenting corruption
patterns in Mexican federal procurement. Key structural issues:

| Metric | Value | Assessment |
|--------|-------|------------|
| Total cases | 1,363 | Substantial |
| Cases with matched vendors | 716 (52.5%) | **47.5% unmatched** |
| Unique matched vendor IDs | 823 | |
| Total GT training contracts | 382,062 | |
| Overall label noise rate | 9.6% | Moderate |
| Salud + Agricultura contracts | 86.5% of training | **Severe concentration** |
| Top 15 vendors share | 34.0% of training | Top-heavy |
| Cases missing year windows | 45 (3.3%) | Minor |
| Cases with fraud_institution_ids | 0 (0%) | **No institution scoping** |

**Key finding:** Temporal noise (9.6%) is lower than previously estimated (30-50%)
because 96.7% of cases have year windows. The critical issue is **sector concentration**:
86.5% of training contracts come from Salud (52.8%) and Agricultura (33.7%).

---

## 2. Sector Distribution of GT Training Contracts

| Sector | Vendors | Cases | Contracts | % Training | Value (Bn MXN) |
|--------|---------|-------|-----------|------------|----------------|
| Salud | 484 | 465 | 201,675 | 52.8% | 1,639.73 |
| Agricultura | 228 | 180 | 128,682 | 33.7% | 142.66 |
| Educacion | 247 | 223 | 10,940 | 2.9% | 107.19 |
| Energia | 275 | 269 | 10,787 | 2.8% | 398.19 |
| Infraestructura | 372 | 351 | 7,401 | 1.9% | 635.83 |
| Hacienda | 255 | 241 | 5,577 | 1.5% | 207.11 |
| Defensa | 284 | 279 | 5,386 | 1.4% | 91.75 |
| Gobernacion | 320 | 289 | 4,967 | 1.3% | 97.88 |
| Medio Ambiente | 191 | 183 | 2,026 | 0.5% | 47.46 |
| Tecnologia | 143 | 139 | 2,023 | 0.5% | 18.88 |
| Trabajo | 116 | 104 | 1,910 | 0.5% | 32.76 |
| Otros | 131 | 120 | 688 | 0.2% | 9.97 |
| **TOTAL** | | | **382,062** | **100%** | |

**Imbalance ratio**: Salud has 293x more training contracts than Otros.

---

## 3. Matched vs Unmatched Cases

| Category | Count | % |
|----------|-------|---|
| Cases with >= 1 matched vendor | 716 | 52.5% |
| Cases with ZERO vendor rows | 641 | 47.0% |
| Cases with vendor rows but vendor_id=NULL | 10 | 0.7% |

**641 cases (47%)** have no vendor rows at all. These represent cases identified
during ARIA mining sessions where the vendor name was embedded in the case_name
but never linked to the vendors table.

### Unmatched Cases by Type

| Case Type | Unmatched Count |
|-----------|------------------|
| procurement_fraud | 292 |
| institutional_capture | 138 |
| ghost_company | 101 |
| single_bid_capture | 91 |
| institution_capture | 12 |
| other types | 7 |

### Fuzzy Matching Results

Keyword search on vendor names embedded in case_name:
- 613 of 641 (95.6%) had at least one candidate vendor match
- Many are false positives (shared keywords like GRUPO, COMERCIALIZADORA)
- Estimated true matchable: ~400-500 cases (need manual review)
- 28 cases had no keyword matches at all

---

## 4. Year Window Coverage

| Metric | Count | % |
|--------|-------|---|
| Has year_start + year_end | 1,318 | 96.7% |
| Missing both windows | 45 | 3.3% |
| Has fraud_year_start (narrower) | 347 | 25.5% |
| Has fraud_institution_ids | 0 | 0% |

The fraud_institution_ids column is completely unpopulated. No institution-level
scoping is possible.

---

## 5. Label Noise Analysis

### Overall Temporal Noise

| Metric | Value |
|--------|-------|
| Total GT contracts (windowed cases) | 375,333 |
| In-window contracts | 346,496 (92.3%) |
| Out-of-window contracts | 28,837 (7.7%) |

### Top 10 Highest-Noise Cases (Priority Fix List)

| Rank | ID | Case Name | Window | Total | Out-Win | Noise% | Priority |
|------|----|-----------|--------|-------|---------|--------|----------|
| 1 | 3 | IMSS Ghost Company Network | 2012-2018 | 9,257 | 7,151 | 77.2% | CRITICAL |
| 2 | 1 | COVID-19 Emergency Procurement | 2020-2021 | 5,472 | 5,254 | 96.0% | CRITICAL |
| 3 | 5 | Segalmex Food Distribution | 2019-2023 | 6,991 | 4,756 | 68.0% | CRITICAL |
| 4 | 119 | Efectivale - Guardia Nacional | 2019-2025 | 1,150 | 1,150 | 100% | HIGH |
| 5 | 181 | Farmacos Especializados CENSIDA | 2010-2013 | 1,384 | 1,082 | 78.2% | HIGH |
| 6 | 87 | Grupo Jacaric - IMSS | 2019-2022 | 1,140 | 500 | 43.9% | MEDIUM |
| 7 | 854 | Interbiol - CENAPRECE | 2019-2020 | 502 | 484 | 96.4% | MEDIUM |
| 8 | 15 | Edenred Voucher Monopoly | 2010-2024 | 2,898 | 459 | 15.8% | LOW |
| 9 | 848 | ARTIMEDICA IMSS Capture | 2013-2025 | 1,579 | 451 | 28.6% | MEDIUM |
| 10 | 757 | DIBITER IMSS/ISSSTE Pharma | 2011-2020 | 705 | 355 | 50.4% | MEDIUM |

**Fixing just the top 3 cases would eliminate 17,161 noisy contracts (59% of all noise).**

---

## 6. Confidence Level Distribution

| Level | Count | % |
|-------|-------|---|
| confirmed_corrupt | 15 | 1.1% |
| high | 877 | 64.3% |
| medium | 417 | 30.6% |
| low | 54 | 4.0% |

Only 15 cases (1.1%) have official verdicts.

---

## 7. Top 15 GT Vendors by Contract Count

| Vendor ID | Name | Contracts | Value (Bn) |
|-----------|------|-----------|------------|
| 2873 | FARMACEUTICOS MAYPO SA DE CV | 18,216 | 86.24 |
| 45050 | ALEN DEL NORTE SA DE CV | 13,829 | 1.77 |
| 44985 | FABRICA DE JABON LA CORONA SA DE CV | 10,817 | 2.68 |
| 132864 | MOLINOS AZTECA SA DE CV | 10,685 | 7.90 |
| 19493 | MARCAS NESTLE SA DE CV | 10,477 | 5.14 |
| 45219 | MOLINERA DE MEXICO SA DE CV | 9,748 | 2.95 |
| 4335 | LABORATORIOS PISA SA DE CV | 9,173 | 55.38 |
| 44997 | COMERCIALIZADORA PEPSICO MEXICO | 6,890 | 1.82 |
| 127800 | SERVICIOS DE FARMACIA PREFARMA | 6,493 | 4.30 |
| 29277 | GRUPO FARMACOS ESPECIALIZADOS | 6,303 | 133.17 |
| 10775 | LICONSA SA DE CV | 5,858 | 4.22 |
| 80346 | CUETARA DISTRIBUCION SA DE CV | 5,560 | 1.98 |
| 45117 | MINSA SA DE CV | 5,333 | 1.73 |
| 45086 | GRUPO INDUSTRIAL MASECA SAB | 5,210 | 2.59 |
| 1544 | RALCA SA DE CV | 5,198 | 25.08 |

**Top 15 vendors: 129,790 contracts (34.0% of all GT training data).**

---

## 8. Recommendations

### P1: Fix Top 3 Noisy Cases (Impact: -17K noisy contracts)

Cases 1 (COVID), 3 (IMSS Ghost), 5 (Segalmex) contribute 59% of all noise.
Narrow year windows, populate fraud_institution_ids, consider contract-level scoping.

### P2: Match 641 Unmatched Cases (Impact: +400 vendors)

Semi-automated matching pipeline: extract vendor name from case_name, search by
keyword + RFC, present candidates for manual confirmation.

### P3: Populate fraud_institution_ids (Impact: largest noise reduction)

Zero cases have institution scoping. For the 309 institutional_capture cases,
the suspect institution is typically in the case_name.

### P4: Diversify Sector Coverage

| Sector | Current | Target | Action |
|--------|---------|--------|--------|
| Tecnologia | 0.5% | 5% | Need 10x more cases |
| Trabajo | 0.5% | 3% | Need 6x more |
| Medio Ambiente | 0.5% | 3% | Need 6x more |
| Otros | 0.2% | 2% | Need 10x more |
| Gobernacion | 1.3% | 5% | Need 4x more |

### P5: Audit Agriculture GT Vendors

The 33.7% Agricultura share is driven by DICONSA/Segalmex supply chain vendors.
Many may be legitimate food suppliers. Audit each for genuine corruption evidence.

---

## 9. Files Generated

| File | Description |
|------|-------------|
| `backend/reports/gt_windowed_label_report.csv` | Per-vendor noise analysis (883 rows) |
| `backend/reports/gt_quality_report.md` | This report |
| `backend/scripts/apply_windowed_gt_labels.py` | Analysis script (re-runnable) |

---

*Risk scores are statistical indicators. This report identifies GT data quality
issues to improve model training, not to make corruption determinations.*
