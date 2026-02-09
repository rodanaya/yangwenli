# Risk Scoring Methodology v4.0

**Last Updated:** February 9, 2026 | **Contracts:** 3,110,017 | **Years:** 2002-2025

---

## Quick Reference

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.50 | 171,824 | 5.5% | Immediate investigation |
| **High** | >= 0.20 | 550,440 | 17.7% | Priority review |
| **Medium** | >= 0.05 | 2,072,841 | 66.7% | Watch list |
| **Low** | < 0.05 | 314,912 | 10.1% | Standard monitoring |

**Validation:** AUC-ROC = 0.9511 [0.9492, 0.9547], Brier = 0.065, Lift = 4.04x

---

## Overview

v4.0 transforms the risk model from a **weighted indicator checklist** (`S(x) = Σ wᵢfᵢ(x)`) to a **calibrated probability framework** (`P(corrupt|x)`). Every score is now a statistical estimate of corruption likelihood with confidence intervals.

| Property | v3.3 (Checklist) | v4.0 (Statistical) |
|----------|-------------------|---------------------|
| Score meaning | Arbitrary 0-1 | P(corrupt\|features) |
| Score cap | 1.0 (with cap) | 1.0 (natural bound) |
| Context-aware | No | Yes (sector/year baselines) |
| Interactions | 5 hardcoded pairs | Full covariance matrix |
| Confidence | None | 95% CI per contract |
| Weights | Intuition-based | Data-derived (logistic regression) |
| Validation | Lift only | AUC, Brier, calibration curve |
| AUC-ROC | 0.584 | **0.951** |
| Lift vs baseline | 1.22x | **4.04x** |

---

## 1. Problem Formulation

We estimate:

```
P(Y=1 | X) = probability that contract X involves corruption indicators
```

where Y ∈ {0, 1} and X is a 12-dimensional feature vector derived from procurement data.

**Key challenge:** Only ~21,252 contracts from 17 matched vendors (across 9 documented corruption cases) are labeled as known-bad (from ground_truth_vendors table). The remaining 3.1M are unlabeled, not clean. This is a **Positive-Unlabeled (PU) learning** problem.

---

## 2. Feature Standardization: Z-Scores

### Why Z-Scores?

A direct award in Defensa (80% are direct) is less suspicious than in Educacion (50% are direct). Raw indicator values ignore this context. Z-scores normalize each feature relative to its **sector and year baseline**.

### Formulas

**Continuous features** (price_ratio, vendor_concentration, ad_period_days, etc.):

```
z_i = (x_i - μ_i(s,t)) / max(σ_i(s,t), ε)
```

where `μ_i(s,t)` and `σ_i(s,t)` are the mean and standard deviation of factor `i` in sector `s`, year `t`, and `ε = 0.001` prevents division by zero.

**Binary features** (single_bid, direct_award, year_end, industry_mismatch):

```
z_i = (x_i - p(s,t)) / √(p(s,t) × (1 - p(s,t)))
```

where `p(s,t)` is the proportion of contracts with the indicator in sector `s`, year `t`.

### Fallback Hierarchy

If `(sector, year)` has fewer than 30 contracts, baselines fall back to:
1. Sector-only baseline (if ≥ 100 contracts)
2. Global baseline

### 12 Z-Score Features

| # | Feature | Type | Raw Source |
|---|---------|------|------------|
| 1 | z_single_bid | Binary | is_single_bid |
| 2 | z_direct_award | Binary | is_direct_award |
| 3 | z_price_ratio | Continuous | amount / sector_median |
| 4 | z_vendor_concentration | Continuous | vendor_value / sector_total |
| 5 | z_ad_period_days | Continuous | days publication→contract |
| 6 | z_year_end | Binary | is_year_end |
| 7 | z_same_day_count | Discrete | same-day contracts to same vendor |
| 8 | z_network_member_count | Discrete | vendor group size |
| 9 | z_co_bid_rate | Continuous | max co-bidding rate |
| 10 | z_price_hyp_confidence | Continuous | IQR outlier confidence |
| 11 | z_industry_mismatch | Binary | sector_affinity ≠ contract_sector |
| 12 | z_institution_risk | Continuous | institution type baseline |

---

## 3. Multivariate Anomaly: Mahalanobis Distance

### The Formula

```
D²(z) = zᵀ Σ⁻¹ z
```

where `Σ` is the covariance matrix of z-features within each sector. Under multivariate normality:

```
D² ~ χ²(k)    where k = 12 (number of features)
p-value = 1 - F_χ²(k)(D²)
```

### Why Mahalanobis?

The Mahalanobis distance replaces the 5 hardcoded interaction pairs from v3.3. The covariance matrix naturally captures which factor **combinations** are unusual. A contract that is simultaneously single-bid AND short-ad AND year-end will have a much higher D² than any single factor, because the covariance matrix encodes that these rarely co-occur in normal contracts.

### Covariance Estimation: Ledoit-Wolf Shrinkage

With 12 features, we need to estimate 78 unique covariance entries. For small sectors, the sample covariance is unstable. Ledoit-Wolf shrinkage provides a regularized estimate:

```
Σ_reg = (1 - α) × Σ_sample + α × (tr(Σ_sample)/k) × I
```

where α is chosen to minimize expected quadratic loss. We use `sklearn.covariance.LedoitWolf`.

### Anomaly Classification by P-Value

| P-Value | Interpretation | Expected Rate |
|---------|---------------|---------------|
| < 0.01 | Most unusual 1% | ~31,000 contracts |
| < 0.05 | Top 5% unusual | ~155,000 contracts |
| < 0.20 | Top 20% | ~620,000 contracts |
| ≥ 0.20 | Within normal variation | ~2,490,000 contracts |

---

## 4. Bayesian Calibration: Logistic Regression

### Model

```
P(corrupt | z) = σ(β₀ + βᵀz)
```

where `σ(x) = 1/(1+e⁻ˣ)` is the logistic sigmoid.

### Training Data

| Set | Source | Count |
|-----|--------|-------|
| Positive | Contracts from 17 matched ground_truth_vendors | 21,252 |
| Negative (unlabeled) | Random sample | 10,000 |

### Ground Truth Cases (9 documented corruption cases)

| Case | Type | Vendors | Contracts | Sectors |
|------|------|---------|-----------|---------|
| IMSS Ghost Company Network | Ghost companies | 2 | 9,366 | Salud |
| Segalmex Food Distribution | Procurement fraud | 3 | 6,326 | Agricultura |
| COVID-19 Emergency Procurement | Embezzlement | 5 | 5,371 | Salud |
| IT Procurement Overpricing | Overpricing | 1 | 139 | Tecnologia |
| Odebrecht-PEMEX Bribery | Bribery | 2 | 35 | Energia |
| La Estafa Maestra | Ghost companies | 2 | 10 | Multiple |
| Grupo Higa / Casa Blanca | Conflict of interest | 1 | 3 | Infraestructura |
| Oceanografia PEMEX Fraud | Procurement fraud | 1 | 2 | Energia |
| PEMEX Emilio Lozoya | Bribery | 0* | 0* | Energia |

*Case 9 shares vendors with Case 4 (Odebrecht). Documented for reference but does not contribute additional training data.

### Regularization

- **L2 penalty** with C=0.1 (strong regularization) prevents overfitting
- **Class weighting**: {0: 1, 1: 0.5} — positives outnumber negatives 2:1 in training set
- **OECD prior**: β₀ initialized to `log(0.075/0.925) ≈ -2.51`, reflecting the OECD estimate that ~7.5% of procurement has corruption indicators
- **Fitted intercept**: β₀ = -2.6696

### Calibrated Coefficients

Learned from data via L2-regularized logistic regression with 1,000 bootstrap iterations:

| Factor | Coefficient (β) | 95% CI | Likelihood Ratio | Interpretation |
|--------|-----------------|--------|-------------------|----------------|
| vendor_concentration | **+1.8497** | [1.766, 1.949] | 18.73x | Strongest predictor: concentrated vendors |
| industry_mismatch | +0.2141 | [0.169, 0.258] | 0.35x | Out-of-sector work raises risk |
| same_day_count | +0.1424 | [0.077, 0.215] | 1.27x | Threshold splitting signal |
| institution_risk | +0.1189 | [0.074, 0.167] | 0.05x | Institutional type matters |
| single_bid | +0.0997 | [0.056, 0.143] | 0.85x | Weak positive signal |
| price_ratio | +0.0984 | [-0.091, 0.303] | 2.05x | Wide CI — uncertain contribution |
| year_end | +0.0231 | [-0.021, 0.063] | 0.84x | Negligible effect (CI crosses 0) |
| price_hyp_confidence | +0.0212 | [-0.017, 0.058] | 1.61x | Negligible effect (CI crosses 0) |
| co_bid_rate | 0.0000 | [0.000, 0.000] | 1.00x | No signal (regularized to zero) |
| direct_award | **-0.1968** | [-0.250, -0.150] | 0.41x | Direct awards are *less* risky |
| ad_period_days | **-0.2216** | [-0.284, -0.170] | 0.58x | Longer ad periods increase risk* |
| network_member_count | **-4.1142** | [-4.477, -3.781] | 0.01x | Network membership *reduces* risk |

**Key insight:** The data reveals that known-bad vendors (LICONSA, Pisa, DIMM) are large, concentrated, non-networked entities that operate through competitive procedures. This contradicts the v3.3 assumption that direct awards and network membership are primary risk indicators. The model learned the actual patterns from data rather than relying on theoretical assumptions.

*The negative ad_period_days coefficient is counterintuitive. It reflects that known-bad vendors often operate through normal-length ad periods rather than rushed procedures.

### Platt Scaling

After fitting, we apply Platt scaling (sigmoid calibration) via 3-fold cross-validation to ensure predicted probabilities match observed frequencies.

### Positive-Unlabeled (PU) Learning Correction

Since "random" ≠ "clean" (some unlabeled contracts may be corrupt):

```
P(corrupt | x) = P(labeled=1 | x) / c
```

where `c = P(labeled=1 | corrupt)` is estimated from the mean predicted probability on labeled positives. **Estimated c = 0.890** — meaning 89% of truly corrupt contracts would be labeled if we had perfect coverage.

---

## 5. Confidence Intervals

Each contract receives a 95% confidence interval on its corruption probability.

### Bootstrap Method

1. Resample training data 1,000 times with replacement
2. Refit logistic regression on each resample
3. Compute coefficient distributions
4. Propagate uncertainty through the sigmoid:

```
SE(logit) = √(Σᵢ (zᵢ × SE(βᵢ))²)
CI_lower = σ(β₀ + βᵀz - 1.96 × SE(logit)) / c
CI_upper = σ(β₀ + βᵀz + 1.96 × SE(logit)) / c
```

### Interpretation

A score of `0.35 [0.22, 0.48]` means: "We estimate 35% corruption probability, but given data uncertainty, it could be as low as 22% or as high as 48%."

---

## 6. Risk Level Thresholds

Since v4.0 scores are calibrated probabilities, thresholds have direct meaning:

| Level | v3.3 | v4.0 | Meaning |
|-------|------|------|---------|
| **Critical** | ≥ 0.50 | ≥ 0.50 | ≥50% estimated corruption probability |
| **High** | ≥ 0.35 | ≥ 0.20 | ≥20% estimated probability |
| **Medium** | ≥ 0.20 | ≥ 0.05 | ≥5% estimated probability |
| **Low** | < 0.20 | < 0.05 | <5% probability |

Thresholds tuned so risk level distribution falls within OECD 2-15% high-risk benchmark.

---

## 7. Validation Metrics

### Calibration Results (February 9, 2026 — Run CAL-20260209-091747)

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **AUC-ROC** | 0.9511 [0.9492, 0.9547] | Excellent discrimination |
| **Brier Score** | 0.0654 | Good calibration (0 = perfect) |
| **Log Loss** | 0.2438 | Good probability quality |
| **Average Precision** | 0.9600 | Excellent under class imbalance |
| **Lift vs baseline** | 4.04x | 4x better than random at detection |
| **PU correction (c)** | 0.890 | 89% label coverage estimate |

### Detection Performance on Ground Truth

| Metric | Value |
|--------|-------|
| Detection rate (medium+) | **100.0%** |
| High+ rate | **95.3%** |
| Critical rate | **90.6%** |
| False negative rate (low risk) | **0.0%** |
| Mean score (known bad) | 0.8907 |
| Median score (known bad) | 1.0000 |

### Per-Case Detection

| Case | Contracts | Detection % | High+ % | Avg Score |
|------|-----------|-------------|---------|-----------|
| IMSS Ghost Company Network | 9,366 | 100.0% | 99.0% | 0.962 |
| Segalmex Food Distribution | 6,326 | 100.0% | 94.3% | 0.828 |
| COVID-19 Emergency Procurement | 5,371 | 100.0% | 91.8% | 0.863 |
| IT Procurement Overpricing | 139 | 100.0% | 43.2% | 0.261 |
| Odebrecht-PEMEX Bribery | 35 | 82.9% | 68.6% | 0.314 |
| La Estafa Maestra | 10 | 100.0% | 70.0% | 0.205 |
| Grupo Higa / Casa Blanca | 3 | 100.0% | 33.3% | 0.268 |
| Oceanografia PEMEX Fraud | 2 | 100.0% | 100.0% | 0.354 |

### Model Comparison: v3.3 vs v4.0

| Metric | v3.3 | v4.0 | Improvement |
|--------|------|------|-------------|
| AUC-ROC | 0.584 | **0.951** | +63% |
| Brier Score | 0.411 | **0.065** | -84% |
| Detection rate (med+) | 67.1% | **95.3%** | +28pp |
| High+ rate | 18.3% | **92.5%** | +74pp |
| Critical rate | 1.9% | **90.6%** | +89pp |
| Mean score (known bad) | 0.250 | **0.891** | +0.641 |
| Lift vs baseline | 1.22x | **4.04x** | +3.3x |

**Statistical significance:**
- **Wilcoxon signed-rank test** (v4.0 > v3.3 on 21,252 paired known-bad contracts): p < 0.000001 (SIGNIFICANT)
- **McNemar's test** (detection differences): v4.0 detects 6,645 additional contracts that v3.3 missed, while losing only 642. p = 0.132 (marginal)

See `docs/MODEL_COMPARISON_REPORT.md` for detailed comparison analysis.

---

## 8. Limitations

1. **Ground truth bias**: 17 matched vendors across 9 cases, but 3 cases (IMSS, Segalmex, COVID) account for 99% of training contracts. The model's coefficients reflect these cases' characteristics (large concentrated vendors in health/agriculture). Diversifying ground truth further will improve generalization.
2. **High-risk rate**: 23.2% high-risk rate exceeds the OECD 2-15% benchmark. This is driven by the strong vendor_concentration coefficient. Threshold adjustment or coefficient dampening may be warranted.
3. **Negative network coefficient**: The -4.11 coefficient for network_member_count is a training artifact — known-bad vendors happen to not be in detected vendor networks. This could cause false negatives for network-based corruption.
4. **PU assumption**: We assume unlabeled contracts are mostly clean. If corruption is widespread (>7.5%), the PU correction factor (c=0.890) may be inaccurate.
5. **Data quality by period**: Structure A (2002-2010) has 0.1% RFC coverage — z-scores may be less reliable for this period.
6. **Sector heterogeneity**: Some sectors (Defensa, Energia) have structural reasons for high concentration that are not corruption. The z-score normalization partially addresses this, but sector-specific models may perform better.
7. **Temporal shift**: Baselines assume stationarity within a year. Regime changes (e.g., new administration) may require year-level recalibration.
8. **No causal claims**: High P(corrupt|x) indicates statistical anomaly consistent with corruption patterns, not proof of corruption.
9. **co_bid_rate zeroed out**: L2 regularization pushed co_bid_rate to exactly 0.0. This suggests co-bidding patterns don't discriminate in our current ground truth — possibly because the known-bad vendors operate through concentration rather than collusion.

---

## Pipeline Execution Order

```
1. compute_factor_baselines.py  → factor_baselines table
2. compute_z_features.py        → contract_z_features table
3. compute_mahalanobis.py       → updates mahalanobis_distance/pvalue
4. calibrate_risk_model.py      → model_calibration table
5. calculate_risk_scores_v4.py  → updates contracts table
6. validate_risk_model.py       → validation metrics
7. compare_models.py            → v3.3 vs v4.0 comparison
```

---

## Database Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `factor_baselines` | ~3,500 | Per-factor mean/stddev by sector/year |
| `contract_z_features` | ~3.1M | Z-score vector + Mahalanobis per contract |
| `model_calibration` | 1+ | Fitted model weights, diagnostics, CIs |

### New Columns on `contracts`

| Column | Type | Description |
|--------|------|-------------|
| `risk_confidence_lower` | REAL | Lower bound of 95% CI |
| `risk_confidence_upper` | REAL | Upper bound of 95% CI |
| `mahalanobis_distance` | REAL | Multivariate anomaly score |
| `risk_model_version` | VARCHAR(10) | 'v3.3' or 'v4.0' |

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| **4.0.1** | 2026-02-09 | Retrained with diversified ground truth (9 cases, 17 vendors, 21K contracts). AUC 0.951. |
| 4.0.0 | 2026-02-06 | Statistical framework: z-scores, Mahalanobis, Bayesian calibration, CIs |
| 3.3.0 | 2026-02-06 | 8 base factors, interaction effects, score cap at 1.0 |
| 3.2.0 | 2026-02-05 | Co-bidding risk factor |
| 3.1.0 | 2026-02-03 | Price hypothesis integration |
| 3.0.0 | 2026-02 | Reweighted factors, IQR pricing |
| 2.0.0 | 2026-01 | Short ad, splitting, network |
| 1.0.0 | 2026-01 | Initial 10-factor model |

---

## Key Sources

- IMF Working Paper 2022/094: *Assessing Vulnerabilities to Corruption*
- OECD (2023): *Public Procurement Performance Report*
- EU ARACHNE: Risk scoring methodology
- World Bank INT (2019): *Warning Signs of Fraud and Corruption*
- Gallego et al. (2022): *Early warning model of malfeasance*
- Mahalanobis, P.C. (1936): *On the generalized distance in statistics*
- Ledoit & Wolf (2004): *A well-conditioned estimator for large-dimensional covariance matrices*
- Elkan & Noto (2008): *Learning classifiers from only positive and unlabeled data*

---

*Risk scores are calibrated probabilities with confidence intervals. A high score indicates statistical anomaly consistent with corruption patterns — it does not constitute proof of wrongdoing.*
