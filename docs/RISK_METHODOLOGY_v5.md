# Risk Scoring Methodology v5.0

**Last Updated:** February 14, 2026 | **Contracts:** 3,110,017 | **Years:** 2002-2025

---

## Quick Reference

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.50 | 201,745 | 6.5% | Immediate investigation |
| **High** | >= 0.30 | 126,551 | 4.1% | Priority review |
| **Medium** | >= 0.10 | 1,364,321 | 43.9% | Watch list |
| **Low** | < 0.10 | 1,417,390 | 45.6% | Standard monitoring |

**High-risk rate: 10.6%** (OECD benchmark: 2-15%)

**Validation:** Train AUC = 0.9482, Test AUC = 0.9508 (temporal split), Brier = 0.097

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
| PU correction | Circular (c=0.890) | **Elkan & Noto holdout (c=0.861)** |
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
- Train AUC: 0.9482
- **Test AUC: 0.9508** (≥ train AUC → no overfitting)
- Test Brier: 0.097
- Test Average Precision: 0.971

The test AUC slightly exceeding train AUC confirms the model generalizes well — it does not overfit to historical patterns.

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

**v5.0 c = 0.861** (more conservative and honest)

```
P(corrupt | x) = P(labeled=1 | x) / c = σ(β₀ + βᵀz) / 0.861
```

---

## 4. Cross-Validated Hyperparameters

### v4.0 Problem: Fixed Hyperparameters

v4.0 used C=0.1 with L2 penalty, chosen without cross-validation. Post-hoc dampening was needed to fix extreme coefficients.

### v5.0 Solution: 5-Fold CV

Grid search over:
- **C**: [0.01, 0.1, 1.0, 10.0]
- **l1_ratio**: [0.0, 0.25, 0.5] (ElasticNet mixing)

**Best:** C=0.01, l1_ratio=0.0 (pure L2)

The stronger regularization (C=0.01 vs C=0.1) naturally controls coefficient magnitudes without ad-hoc dampening. No manual coefficient capping is needed.

---

## 5. Per-Sector Sub-Models

### Motivation

Corruption patterns differ by sector:
- **Salud**: Large concentrated vendors, ghost companies
- **Infraestructura**: Overpricing through network relationships
- **Energia**: Monopolistic supply chains, industry mismatch
- **Hacienda**: Tender rigging, price manipulation

A single global model cannot capture these differences. v5.0 trains a dedicated logistic regression for each of the 12 sectors.

### Global Model Coefficients

| Factor | v4.0 (dampened) | v5.0 | Change |
|--------|-----------------|------|--------|
| vendor_concentration | +1.000 (capped) | **+1.795** | Natural, no dampening needed |
| industry_mismatch | +0.214 | **+0.339** | Stronger signal with diversified data |
| same_day_count | +0.142 | **+0.144** | Stable |
| network_member_count | 0.000 (zeroed) | **+0.132** | Fixed! Now positive as expected |
| price_ratio | +0.098 | **+0.108** | Stable |
| price_hyp_confidence | +0.021 | **+0.084** | Stronger with more cases |
| ad_period_days | -0.222 | **-0.061** | Less extreme, closer to neutral |
| year_end | +0.023 | **+0.046** | Slight increase |
| single_bid | +0.100 | **+0.016** | Weaker (known-bad vendors use competitive) |
| institution_risk | +0.119 | **+0.008** | Weakened |
| direct_award | -0.197 | **+0.001** | Fixed! No longer misleadingly negative |
| co_bid_rate | 0.000 | **0.000** | Still zeroed by regularization |

### Key Improvements in Coefficients

1. **network_member_count = +0.132** (was -4.11 raw, zeroed to 0.0 in v4.0): The diversified ground truth includes infrastructure network vendors (ICA, COCONAL, Mota-Engil) that operate in networks. The coefficient is now naturally positive — network membership correctly increases risk.

2. **direct_award ≈ 0.0** (was -0.197 in v4.0): v4.0's negative coefficient was misleading — it suggested direct awards are less risky, which contradicts OECD guidance. With diversified cases, direct_award becomes neutral — neither protective nor risky on its own.

3. **vendor_concentration = +1.795** (was capped to +1.0 in v4.0): The raw coefficient is naturally moderated by C=0.01 regularization. No ad-hoc dampening needed.

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
| **5.0.0** | 2026-02-14 | Per-sector sub-models, diversified ground truth (15 cases, 27 vendors), temporal train/test split, Elkan & Noto PU correction, cross-validated ElasticNet. Test AUC 0.951. |
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
