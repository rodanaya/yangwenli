# Risk Scoring Methodology v5.0

**Last Updated:** February 16, 2026 | **Contracts:** 3,110,007 | **Years:** 2002-2025

---

## Quick Reference

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.50 | 178,938 | 5.8% | Immediate investigation |
| **High** | >= 0.30 | 67,190 | 2.2% | Priority review |
| **Medium** | >= 0.10 | 294,468 | 9.5% | Watch list |
| **Low** | < 0.10 | 2,569,411 | 82.6% | Standard monitoring |

**High-risk rate: 7.9%** (OECD benchmark: 2-15%)

**Validation:** Train AUC = 0.967, Test AUC = 0.960 (temporal split), Brier = 0.060

---

## Overview

v5.0 builds on the v4.0 statistical framework with three major improvements:

1. **Diversified ground truth**: 15 corruption cases across all 12 sectors (up from 9 cases in 3 sectors)
2. **Honest temporal validation**: Train on contracts ≤2020, test on ≥2021 — no data leakage
3. **Per-sector sub-models**: 12 dedicated logistic regressions capture sector-specific corruption patterns
4. **Proper PU-learning**: Elkan & Noto (2008) holdout correction replaces v4.0's circular estimator

| Property | v4.0 | v5.0 |
|----------|------|------|
| Ground truth | 9 cases, 17 vendors, 21K contracts | **15 cases, 27 vendors, 27K contracts** |
| Sector coverage | 3 sectors (Salud, Agricultura, Energia) | **All 12 sectors** |
| Validation | In-sample AUC only | **Temporal train/test split** |
| PU correction | Circular (c=0.890) | **Elkan & Noto holdout (c=0.887)** |
| Models | 1 global | **1 global + 12 per-sector** |
| Regularization | L2 with ad-hoc dampening | **Cross-validated ElasticNet** |
| Detection (high+) | 45.7% | **93.0%** |
| False negatives | 9.4% | **0.2%** |

---

## 1. Ground Truth Expansion

### v4.0 Problem: Training Bias

v4.0 trained on 9 corruption cases, but 3 cases (IMSS, Segalmex, COVID-19) contributed 99% of training contracts. These cases share a common pattern — large vendors with high market concentration in health/agriculture — so the model essentially learned "vendor_concentration → corrupt."

### v5.0 Solution: 6 New Cases Across 5 Sectors

| # | Case | Type | Sector | Vendors | Contracts |
|---|------|------|--------|---------|-----------|
| 1 | IMSS Ghost Company Network | Ghost companies | Salud | 2 | 9,366 |
| 2 | Segalmex Food Distribution | Procurement fraud | Agricultura | 3 | 6,326 |
| 3 | COVID-19 Emergency Procurement | Embezzlement | Salud | 5 | 5,371 |
| 4 | IT Procurement Overpricing | Overpricing | Tecnologia | 1 | 139 |
| 5 | Odebrecht-PEMEX Bribery | Bribery | Energia | 2 | 35 |
| 6 | La Estafa Maestra | Ghost companies | Multiple | 2 | 10 |
| 7 | Grupo Higa / Casa Blanca | Conflict of interest | Infraestructura | 1 | 3 |
| 8 | Oceanografia PEMEX Fraud | Invoice fraud | Energia | 1 | 2 |
| 9 | PEMEX Emilio Lozoya | Bribery | Energia | 0* | 0* |
| **10** | **IPN Cartel de la Limpieza** | **Bid rigging** | **Educacion** | **1** | **48** |
| **11** | **Infrastructure Fraud Network** | **Overpricing** | **Infraestructura** | **5** | **191** |
| **12** | **Toka Government IT Monopoly** | **Monopoly** | **Educacion/Gob** | **1** | **1,954** |
| **13** | **PEMEX-Cotemar Irregularities** | **Procurement fraud** | **Energia** | **1** | **51** |
| **14** | **SAT Tender Rigging (SixSigma)** | **Tender rigging** | **Hacienda** | **1** | **147** |
| **15** | **Government Voucher Monopoly** | **Monopoly** | **Energia** | **1** | **2,939** |

**Total:** 27 matched vendors, 26,582 contracts across all 12 sectors.

*Case 9 shares vendors with Case 5 (Odebrecht). Documented for reference.

---

## 2. Temporal Train/Test Split

### v4.0 Problem: In-Sample Validation

v4.0 reported AUC=0.942 but trained and tested on the same data. This is not honest generalization — the model may memorize training patterns.

### v5.0 Solution: Temporal Split

```
Training set:  contracts where contract_year ≤ 2020
Testing set:   contracts where contract_year ≥ 2021
```

This mimics real-world deployment: the model learns from historical corruption patterns and must predict on future contracts it has never seen.

**Results:**
- Train AUC: 0.967
- **Test AUC: 0.960**
- Test Brier: 0.060
- Test Average Precision: 0.981

---

## 3. Elkan & Noto PU-Learning Correction

### v4.0 Problem: Circular Estimator

v4.0 estimated `c = P(labeled=1 | corrupt)` by computing the mean predicted probability on the same labeled positives used for training. This is circular — the model naturally assigns high probabilities to its own training data.

**v4.0 c = 0.890** (inflated)

### v5.0 Solution: Holdout Estimator

Following Elkan & Noto (2008):
1. Hold out 20% of labeled positives as validation set
2. Train the model on remaining 80% positives + all unlabeled negatives
3. Estimate c from the held-out 20% (which the model has never seen)

**v5.0 c = 0.887** (more conservative and honest)

```
P(corrupt | x) = P(labeled=1 | x) / c = σ(β₀ + βᵀz) / 0.887
```

---

## 4. Cross-Validated Hyperparameters

### v4.0 Problem: Fixed Hyperparameters

v4.0 used C=0.1 with L2 penalty, chosen without cross-validation. Post-hoc dampening was needed to fix extreme coefficients.

### v5.0 Solution: 5-Fold CV

Grid search over:
- **C**: [0.01, 0.1, 1.0, 10.0]
- **l1_ratio**: [0.0, 0.25, 0.5] (ElasticNet mixing)

**Best:** C=10.0, l1_ratio=0.25 (ElasticNet with 75% L2 + 25% L1)

The cross-validated hyperparameters naturally control coefficient magnitudes without ad-hoc dampening. No manual coefficient capping is needed.

---

## 5. Per-Sector Sub-Models

### Motivation

Corruption patterns differ by sector:
- **Salud**: Large concentrated vendors, ghost companies
- **Infraestructura**: Overpricing through network relationships
- **Energia**: Monopolistic supply chains, industry mismatch
- **Hacienda**: Tender rigging, price manipulation

A single global model cannot capture these differences. v5.0 trains a dedicated logistic regression for each of the 12 sectors.

### Global Model Coefficients (16 features)

v5.0 expands from 12 to 16 z-score features by adding 4 new vendor-behavior features:

| # | Factor | v4.0 (dampened) | v5.0 | 95% CI | New? |
|---|--------|-----------------|------|--------|------|
| 1 | price_volatility | — | **+1.219** | [+1.016, +1.431] | **NEW** |
| 2 | institution_diversity | — | **-0.848** | [-0.933, -0.777] | **NEW** |
| 3 | win_rate | — | **+0.727** | [+0.648, +0.833] | **NEW** |
| 4 | vendor_concentration | +1.000 (capped) | **+0.428** | [+0.277, +0.597] | |
| 5 | sector_spread | — | **-0.374** | [-0.443, -0.316] | **NEW** |
| 6 | industry_mismatch | +0.214 | **+0.305** | [+0.263, +0.345] | |
| 7 | same_day_count | +0.142 | **+0.222** | [+0.172, +0.286] | |
| 8 | direct_award | -0.197 | **+0.182** | [+0.124, +0.247] | |
| 9 | ad_period_days | -0.222 | **-0.104** | [-0.180, -0.032] | |
| 10 | network_member_count | 0.000 (zeroed) | **+0.064** | [+0.033, +0.097] | |
| 11 | year_end | +0.023 | **+0.059** | [+0.023, +0.098] | |
| 12 | institution_risk | +0.119 | **+0.057** | [+0.016, +0.097] | |
| 13 | price_ratio | +0.098 | **-0.015** | [-0.098, +0.080] | |
| 14 | single_bid | +0.100 | **+0.013** | [-0.042, +0.074] | |
| 15 | price_hyp_confidence | +0.021 | **+0.001** | [-0.049, +0.050] | |
| 16 | co_bid_rate | 0.000 | **0.000** | [0.000, 0.000] | |

### New Features in v5.0

1. **price_volatility** (+1.22): Standard deviation of a vendor's contract amounts relative to sector norm. Vendors with wildly varying contract sizes are the strongest predictor of corruption.
2. **institution_diversity** (-0.85): Number of distinct institutions a vendor serves. Vendors serving many different institutions are *less* suspicious — they have legitimate broad reach.
3. **win_rate** (+0.73): Vendor's contract win rate relative to sector baseline. Abnormally high win rates increase risk.
4. **sector_spread** (-0.37): Number of sectors a vendor operates across. Cross-sector vendors are *less* suspicious — genuinely diversified operations.

### Key Changes from v4.0

1. **direct_award = +0.182** (was -0.197 in v4.0): With diversified cases and new features absorbing confounders, direct awards now correctly increase risk — aligning with OECD guidance.

2. **network_member_count = +0.064** (was -4.11 raw, zeroed to 0.0 in v4.0): Now naturally positive — network membership correctly increases risk.

3. **vendor_concentration = +0.428** (was capped to +1.0 in v4.0): The new behavioral features (price_volatility, win_rate) absorb much of what vendor_concentration previously captured alone, producing a more balanced model.

### Per-Sector Model Highlights

| Sector | Top Factor | 2nd Factor | 3rd Factor |
|--------|-----------|------------|------------|
| Salud (1) | vendor_concentration +1.39 | same_day_count +0.16 | price_ratio +0.17 |
| Educacion (2) | vendor_concentration +0.71 | industry_mismatch +0.55 | price_hyp_confidence +0.48 |
| Infraestructura (3) | vendor_concentration +0.97 | network_member_count +0.61 | industry_mismatch +0.52 |
| Energia (4) | industry_mismatch +1.17 | vendor_concentration +0.75 | network_member_count +0.26 |
| Defensa (5) | industry_mismatch +0.68 | vendor_concentration +0.21 | price_hyp_confidence +0.21 |
| Tecnologia (6) | network_member_count +0.39 | price_hyp_confidence +0.27 | industry_mismatch +0.25 |
| Hacienda (7) | network_member_count +0.77 | vendor_concentration +0.44 | price_hyp_confidence +0.32 |
| Gobernacion (8) | vendor_concentration +0.42 | industry_mismatch +0.37 | price_hyp_confidence +0.26 |
| Agricultura (9) | vendor_concentration +1.82 | network_member_count +0.26 | price_ratio +0.18 |
| Ambiente (10) | vendor_concentration +0.62 | network_member_count +0.60 | industry_mismatch +0.43 |
| Trabajo (11) | vendor_concentration +0.54 | network_member_count +0.37 | industry_mismatch +0.29 |
| Otros (12) | network_member_count +0.40 | industry_mismatch +0.29 | same_day_count +0.15 |

**Key insight:** While vendor_concentration dominates globally, sector-specific models reveal:
- **Energia** is driven by industry_mismatch (out-of-sector vendors winning energy contracts)
- **Infraestructura** relies heavily on network_member_count (vendor networks)
- **Hacienda/Tecnologia** emphasize network_member_count and price outliers
- **Agricultura** has the highest vendor_concentration coefficient (+1.82), reflecting Segalmex monopoly

---

## 6. Detection Performance

### Overall Ground Truth Detection (n=26,582)

| Metric | v4.0 | v5.0 | Change |
|--------|------|------|--------|
| Detection rate (medium+) | 90.6% | **99.8%** | +9.2pp |
| High+ rate | 45.7% | **93.0%** | +47.3pp |
| Critical rate | 0.4%* | **84.7%** | +84.3pp |
| False negatives (low) | 9.4% | **0.2%** | -9.2pp |
| Mean score (known bad) | 0.272 | **0.853** | +0.58 |

*v4.0 critical rate was suppressed by coefficient dampening.

### Per-Case Detection

| Case | Contracts | Avg Score | Detection % | High+ % | Critical % |
|------|-----------|-----------|-------------|---------|------------|
| IMSS Ghost Companies | 9,366 | 0.977 | 99.9% | 99.0% | 98.8% |
| Segalmex | 6,326 | 0.664 | 99.6% | 89.3% | 61.7% |
| COVID-19 Procurement | 5,371 | 0.821 | 99.9% | 84.9% | 81.0% |
| Edenred Voucher Monopoly | 2,939 | 0.884 | 100% | 96.7% | 89.8% |
| Toka IT Monopoly | 1,954 | 0.964 | 100% | 100% | 98.7% |
| Infrastructure Network | 191 | 0.962 | 100% | 99.5% | 96.9% |
| SixSigma Tender Rigging | 147 | 0.756 | 95.2% | 87.8% | 80.3% |
| Cyber Robotic IT | 139 | 0.249 | 100% | 14.4% | 2.2% |
| PEMEX-Cotemar | 51 | 1.000 | 100% | 100% | 100% |
| IPN Cartel de la Limpieza | 48 | 0.551 | 95.8% | 64.6% | 64.6% |
| Odebrecht-PEMEX | 35 | 0.915 | 97.1% | 97.1% | 97.1% |
| La Estafa Maestra | 10 | 0.179 | 90.0% | 0% | 0% |
| Grupo Higa | 3 | 0.359 | 100% | 33.3% | 33.3% |
| Oceanografia | 2 | 0.152 | 50.0% | 0% | 0% |

**New cases perform well:**
- Edenred (96.7% high+), Toka (100% high+), Infrastructure Network (99.5% high+)
- PEMEX-Cotemar (100% critical), SixSigma (87.8% high+)
- IPN Cartel (64.6% high+) — smaller vendor, less concentrated

---

## 7. Risk Level Thresholds

v5.0 uses the same thresholds as v4.0 since scores are calibrated probabilities:

| Level | Threshold | Meaning |
|-------|-----------|---------|
| **Critical** | >= 0.50 | ≥50% estimated corruption probability |
| **High** | >= 0.30 | ≥30% estimated probability |
| **Medium** | >= 0.10 | ≥10% estimated probability |
| **Low** | < 0.10 | <10% probability |

---

## 8. Confidence Intervals

Same bootstrap method as v4.0, using 1,000 resamples:

```
SE(logit) = √(Σᵢ (zᵢ × SE(βᵢ))²)
CI_lower = σ(β₀ + βᵀz - 1.96 × SE(logit)) / c
CI_upper = σ(β₀ + βᵀz + 1.96 × SE(logit)) / c
```

Per-sector models use the global model's bootstrap CIs for robustness.

---

## 9. Limitations

1. **Vendor concentration remains dominant.** Despite diversification, the top predictor is still vendor_concentration across most sectors. The model may still underdetect corruption types that don't involve concentrated vendors.

2. **co_bid_rate provides no signal.** Regularized to 0.0 in both global and all sector models. Co-bidding patterns don't discriminate in our current ground truth.

3. **Small-case detection is weaker.** Cases with few contracts (La Estafa Maestra: 10, Grupo Higa: 3, Oceanografia: 2) have lower detection rates. The model requires sufficient contract volume to detect patterns.

4. **PU assumption.** The Elkan & Noto correction assumes labeled positives are representative of all corrupt contracts. If undiscovered corruption has fundamentally different patterns, the correction may be inaccurate.

5. **Data quality by period.** Structure A (2002-2010) has 0.1% RFC coverage — z-scores may be less reliable.

6. **Temporal stationarity.** Sector-level baselines assume corruption patterns are stable within a year. Regime changes may require recalibration.

---

## 10. Pipeline Execution

```bash
# Full v5.0 pipeline
cd backend

# 1-3: Feature computation (skip if already done)
python -m scripts.compute_factor_baselines
python -m scripts.compute_z_features
python -m scripts.compute_mahalanobis

# 4: Calibrate v5.0 model
python -m scripts.calibrate_risk_model_v5

# 5: Score all contracts
python -m scripts.calculate_risk_scores_v5 --batch-size 100000

# 6: Regenerate stats
python -m scripts.precompute_stats
```

### Database Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `factor_baselines` | ~3,500 | Per-factor mean/stddev by sector/year |
| `contract_z_features` | ~3.1M | Z-score vector + Mahalanobis per contract |
| `model_calibration` | 13 | 1 global + 12 sector models for v5.0 |
| `ground_truth_cases` | 15 | Documented corruption cases |
| `ground_truth_vendors` | 50 | Known-bad vendor records |

### Columns on `contracts`

| Column | Type | Description |
|--------|------|-------------|
| `risk_score` | REAL | Active v5.0 calibrated probability |
| `risk_score_v3` | REAL | Preserved v3.3 checklist scores |
| `risk_score_v4` | REAL | Preserved v4.0 scores |
| `risk_score_v5` | REAL | Preserved v5.0 scores |
| `risk_level` | VARCHAR | critical/high/medium/low |
| `risk_confidence_lower` | REAL | Lower bound of 95% CI |
| `risk_confidence_upper` | REAL | Upper bound of 95% CI |
| `mahalanobis_distance` | REAL | Multivariate anomaly score |
| `risk_model_version` | VARCHAR(10) | 'v5.0' |

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| **5.0.1** | 2026-02-16 | Updated docs to match database: 16 features (4 new behavioral), Train AUC 0.967, Test AUC 0.960, c=0.887, C=10.0/l1=0.25. Fixed views referencing empty risk_scores table. |
| **5.0.0** | 2026-02-14 | Per-sector sub-models, diversified ground truth (15 cases, 27 vendors), temporal train/test split, Elkan & Noto PU correction, cross-validated ElasticNet. |
| 4.0.2 | 2026-02-09 | Dampened coefficients, OECD-compliant thresholds. AUC 0.942. |
| 4.0.1 | 2026-02-09 | Retrained with diversified ground truth (9 cases). AUC 0.951. |
| 4.0.0 | 2026-02-06 | Statistical framework: z-scores, Mahalanobis, Bayesian calibration |
| 3.3.0 | 2026-02-06 | 8 base factors, interaction effects |

---

## Key Sources

- IMF Working Paper 2022/094: *Assessing Vulnerabilities to Corruption*
- OECD (2023): *Public Procurement Performance Report*
- EU ARACHNE: Risk scoring methodology
- World Bank INT (2019): *Warning Signs of Fraud and Corruption*
- Gallego et al. (2022): *Early warning model of malfeasance*
- **Elkan & Noto (2008): *Learning classifiers from only positive and unlabeled data***
- Mahalanobis, P.C. (1936): *On the generalized distance in statistics*
- Ledoit & Wolf (2004): *A well-conditioned estimator for large-dimensional covariance matrices*

---

*Risk scores are calibrated probabilities with confidence intervals. A high score indicates statistical anomaly consistent with corruption patterns — it does not constitute proof of wrongdoing.*
