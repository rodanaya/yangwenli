# Risk Scoring Methodology v6.0

**Last Updated:** March 13, 2026 | **Contracts:** 3,051,294 | **Years:** 2002-2025

> **Active model**: v6.0 (Run ID: `CAL-v6.1-202603131522`). Supersedes v5.1. Previous v5.1 scores are preserved in the `risk_score_v5` column for comparison.

---

## Quick Reference

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.50 | 448,074 | 14.7% | Immediate investigation |
| **High** | >= 0.30 | 322,609 | 10.6% | Priority review |
| **Medium** | >= 0.10 | 1,341,725 | 44.0% | Watch list |
| **Low** | < 0.10 | 938,886 | 30.8% | Standard monitoring |

**High-risk rate: 25.3%** (above OECD 2-15% core benchmark; within extended range for transparent risk-indicator systems per OECD 2023 Annex B)

**Average risk score:** 0.260

**Validation:** Train AUC = 0.849, Test AUC = 0.842 (vendor-stratified 70/30), PU c = 0.434

> **Score Interpretation Note**: Risk scores are statistical risk indicators measuring similarity to documented corruption patterns -- not calibrated probabilities of corruption. The Positive-Unlabeled learning framework estimates similarity to *known* corruption cases (selected from high-profile documented scandals). A score of 0.50 does not mean a 50% probability of corruption; it means the contract's procurement characteristics closely resemble those from known cases. Use scores for investigation triage, not as probabilistic estimates.

---

## Overview: What Changed from v5.1

v6.0 is a major ground truth expansion and methodological honesty upgrade. The model uses the same 16 z-score features and 1+12 model architecture as v5.1, but with fundamentally different training data construction, validation strategy, and PU correction.

| Property | v5.1 | v6.0 |
|----------|------|------|
| Ground truth cases | 22 | **~390** |
| Ground truth vendors | 27 | **~725** |
| Ground truth contracts | 26,582 | **~320,725** |
| Fraud time-window filtering | No | **Yes (15 cases with explicit windows)** |
| Per-vendor contract cap | No | **Yes (100 max in training)** |
| Negative sampling | Fixed 10K random | **Sector-proportional, 10:1 ratio** |
| Train/test split | Temporal (<=2020 / >=2021) | **Vendor-stratified 70/30** |
| Hyperparameter search | Grid CV (12 trials) | **Optuna TPE (150 trials)** |
| PU correction c | 0.882 | **0.434** |
| Test AUC | 0.957* | **0.842** |
| High-risk rate | 9.0% | **25.3%** |
| GT detection (high+) | 93.0% | **64.7%** |
| GT detection (medium+) | 99.8% | **94.2%** |

\* v5.1's Test AUC of 0.957 was inflated by two factors: (1) the temporal split allowed the same vendor's contracts in both train and test sets, and (2) vendor-aggregate features were computed using full 2002-2025 history, leaking future information. v6.0's vendor-stratified split is a more honest evaluation -- no vendor appears in both train and test -- though temporal feature leakage persists (see Section 10.1).

**Why AUC decreased and why that is progress**: The v6.0 AUC of 0.842 is *lower* than v5.1's 0.957 because the evaluation is more honest, not because the model is worse. In v5.1, contracts from the same vendor appeared in both the training and test sets (the split was by year, not by vendor). The model could memorize vendor-level patterns during training and exploit them at test time. v6.0 ensures no vendor appears in both sets, forcing the model to generalize to entirely unseen vendors. The AUC drop of 0.115 is the price of honest evaluation and a massively expanded, more heterogeneous ground truth.

**Why GT detection decreased**: v5.1 trained on 27 vendors with ~27K contracts and detected 93% at high+. v6.0 trains on ~725 vendors spanning ~320K contracts across 390 cases. Many newly added vendors represent smaller, more ambiguous fraud patterns (single-institution capture, shell companies with few contracts, procurement irregularities without confirmed criminal proceedings). The model correctly assigns moderate rather than extreme scores to these heterogeneous cases. The per-vendor cap of 100 further prevents mega-vendors (IMSS Ghost Companies, Segalmex) from dominating the learned coefficients.

---

## 1. Ground Truth Expansion

### v5.1: 22 Cases, 27 Vendors

v5.1 trained on 22 documented corruption cases with 27 matched vendors. Three mega-cases (IMSS Ghost Companies, Segalmex, COVID-19) contributed ~79% of all positive training contracts. The model learned a narrow corruption pattern: large vendor + high concentration + single institution + health/agriculture sector.

### v6.0: ~390 Cases, ~725 Vendors

v6.0 expands the ground truth by an order of magnitude through systematic investigation of COMPRANET procurement patterns, cross-referencing with ASF (Auditoria Superior de la Federacion) audit reports, COFECE rulings, SFP sanctions, SAT EFOS listings, and investigative journalism.

| Case Type | Count |
|-----------|-------|
| Procurement fraud | 136 |
| Monopoly / concentrated monopoly | 95 |
| Overpricing | 64 |
| Institution capture | 23 |
| Ghost company | 15 |
| Bid rigging | 8 |
| Other (bribery, conflict of interest, data anomaly, intermediary) | 49 |

**Coverage by sector**: All 12 sectors are now represented in the ground truth, though the distribution remains uneven. Salud and Agricultura together account for a disproportionate share of positive training contracts due to the large IMSS, Segalmex, and DICONSA/LICONSA ecosystems.

### Fraud Time-Window Filtering

v5.1 labeled **all contracts** from a ground truth vendor as positive, regardless of when the fraud occurred. A vendor documented for IMSS fraud during 2015-2019 had their 2003 hospital supply contracts and their 2024 routine deliveries all labeled as corrupt training examples.

v6.0 introduces the `CASE_WINDOWS` dictionary, which scopes positive labels to the documented fraud period for 15 major cases:

| Case ID | Case | Window |
|---------|------|--------|
| 1 | IMSS Ghost Companies | 2012-2019 |
| 2 | Segalmex | 2019-2023 |
| 3 | COVID-19 Procurement | 2020-2021 |
| 4 | IT Overpricing | 2013-2018 |
| 5 | Odebrecht-PEMEX | 2010-2014 |
| 6 | La Estafa Maestra | 2013-2014 |
| 7 | Grupo Higa / Casa Blanca | 2012-2015 |
| 8 | Oceanografia PEMEX | 2008-2014 |
| 10 | IPN Cartel de la Limpieza | 2010-2017 |
| 11 | Infrastructure Fraud Network | 2010-2018 |
| 12 | Toka IT Monopoly | 2015-2023 |
| 13 | PEMEX-Cotemar | 2010-2020 |
| 14 | SAT SixSigma Tender Rigging | 2014-2019 |
| 15 | Edenred Voucher Monopoly | 2010-2023 |
| 22 | SAT EFOS Definitivo | 2010-2023 |

Contracts outside the documented fraud window are excluded from the positive training set. The remaining ~375 cases without explicit windows use a default window of 2002-2025 (all contracts labeled positive).

**Impact**: Time-window filtering reduces label noise for the 15 scoped cases but does not eliminate it -- many contracts within the fraud window may still be legitimate. For the ~375 unscoped cases, the full-history labeling issue persists (see Section 10.3).

### Per-Vendor Contract Cap

v5.1 had no cap on contracts per vendor. IMSS Ghost Companies contributed ~9,366 contracts, Segalmex ~6,326, and COVID-19 ~5,371 -- together comprising 79% of all positive training data. The model learned the business profile of these three vendor clusters rather than corruption indicators per se.

v6.0 caps each vendor at **100 contracts** in the training set. Vendors with more than 100 contracts within their fraud window have 100 randomly sampled (seeded for reproducibility). This prevents any single vendor from dominating the learned coefficients.

**Training data composition after cap and time-window filtering:**
- Positive training set: ~18,756 contracts (from ~725 vendors, 70% vendor split)
- Negative training set: ~183,874 contracts (10:1 ratio, sector-proportional)
- Total training: ~202,630

---

## 2. Vendor-Stratified Train/Test Split

### v5.1: Temporal Split with Vendor Leakage

v5.1 split by time: contracts with `contract_year <= 2020` for training, `>= 2021` for testing. This allowed the same vendor's contracts to appear in both sets. A vendor like Laboratorios Pisa with contracts spanning 2005-2024 had training-era contracts teaching the model Pisa's procurement characteristics, then testing-era contracts from the same vendor being "predicted" -- an easy task for the model since it had already learned Pisa's pattern.

### v6.0: No Vendor in Both Sets

v6.0 splits at the **vendor level**: 70% of ground truth vendors (and their contracts) go to training, 30% to testing. No vendor appears in both sets. The model must generalize to vendors it has never seen during training.

```
Ground truth vendors (~725)
  |-- 70% → Training vendors (~508)
  |      |-- Their contracts (with time-window + per-vendor cap) → Positive training
  |      |-- Sector-proportional unlabeled contracts → Negative training
  |
  |-- 30% → Test vendors (~217)
         |-- Their contracts → Positive test
         |-- Proportional unlabeled contracts → Negative test
```

Negative (unlabeled) vendors are independently split 70/30 to prevent negative vendor leakage.

**This is a harder evaluation task.** The model must detect corruption patterns in vendors whose specific procurement profiles were never observed during training. The AUC drop from 0.957 to 0.842 reflects this increased difficulty and the massively expanded, more heterogeneous ground truth, not model degradation.

---

## 3. Optuna Hyperparameter Search

### v5.1: 12-Trial Grid Search

v5.1 searched over C in {0.01, 0.1, 1.0, 10.0} and l1_ratio in {0.0, 0.25, 0.5} using 5-fold cross-validation. Best: C=10.0, l1_ratio=0.25 (predominantly L2).

### v6.0: 150-Trial Bayesian Optimization

v6.0 uses Optuna's Tree-structured Parzen Estimator (TPE) to search a continuous hyperparameter space:

| Parameter | Search Range | Best Value |
|-----------|-------------|------------|
| C | [0.001, 50.0] (log-uniform) | **1.281** |
| l1_ratio | [0.0, 1.0] (uniform) | **0.961** |

The near-pure L1 regularization (l1_ratio = 0.961) means the model performs aggressive feature selection, driving uninformative features to exactly zero. This contrasts sharply with v5.1's predominantly L2 solution (l1_ratio = 0.25) which retained all features with small coefficients.

**Objective function**: The Optuna objective maximizes AUC on a carved-out validation set (20% of training data) while penalizing false alarm rates above 15% and GT detection rates below 85%. The test set is held strictly off-limits during hyperparameter search.

**Consequence of near-L1 regularization**: Two features (`co_bid_rate` and `price_hyp_confidence`) are regularized to exactly zero in all 13 models. Several other features have substantially smaller coefficients compared to v5.1. The model is sparser but more robust to overfitting.

---

## 4. Model Architecture

### Structure: 1 Global + 12 Per-Sector

The architecture is unchanged from v5.1: one global logistic regression trained on all sectors, plus 12 dedicated logistic regressions trained on sector-specific subsets. Each contract is scored by its sector-specific model when available; the global model serves as fallback for sectors without a dedicated model.

### PU-Learning Correction

Following Elkan & Noto (2008):

```
P(corrupt | x) = P(labeled = 1 | x) / c
score(x) = min(sigma(beta_0 + beta^T z(x)) / c, 1.0)
```

where c = P(labeled = 1 | corrupt) is estimated from held-out test positives.

**v6.0 c = 0.434**. The holdout estimate reflects the ground truth heterogeneity: many newly added vendors have few contracts, ambiguous fraud windows, or patterns that differ from the dominant mega-cases. The model assigns average predicted probability ~43% to known positive contracts in the test set. This reflects the heterogeneity of the expanded ground truth: many newly added vendors have few contracts, ambiguous fraud windows, or patterns that differ from the dominant mega-cases. The floor clamp at 0.50 prevents excessive score inflation.

**Practical effect**: With c = 0.434, the PU correction is equivalent to a ~2.3x linear rescaling of logistic outputs, capped at 1.0:

```
final_score = min(sigmoid(beta_0 + beta^T z(x)) / 0.434, 1.0)
```

Any raw sigmoid output >= 0.434 receives a final score of 1.0, which destroys ordinal discrimination at the upper end.

### Score Formula

```
logit(x) = -1.7036 + beta^T z(x)
score(x) = min(sigmoid(logit(x)) / 0.434, 1.0)
```

where the intercept (-1.70) implies a baseline probability of ~15.4% before feature contributions.

---

## 5. Global Model Coefficients (16 Features)

Features are z-score normalized against sector-year baselines: `z_i = (x_i - mu(s,t)) / sigma(s,t)`.

| # | Factor | v5.1 | v6.0 | 95% CI | Interpretation |
|---|--------|------|------|--------|----------------|
| 1 | price_volatility | +1.219 | **+1.156** | [+1.109, +1.212] | Vendor's contract-size variance vs. sector norm |
| 2 | vendor_concentration | +0.428 | **+0.863** | [+0.804, +0.931] | Vendor's value share within sector |
| 3 | institution_diversity | -0.848 | **-0.436** | [-0.466, -0.407] | Distinct institutions served (protective) |
| 4 | price_ratio | -0.015 | **+0.201** | [+0.166, +0.239] | Contract amount / sector median |
| 5 | network_member_count | +0.064 | **+0.199** | [+0.189, +0.214] | Size of vendor's co-contracting network |
| 6 | direct_award | +0.182 | **+0.132** | [+0.107, +0.154] | Awarded without competitive process |
| 7 | sector_spread | -0.374 | **+0.117** | [+0.096, +0.140] | Sectors vendor operates across |
| 8 | same_day_count | +0.222 | **+0.107** | [+0.096, +0.118] | Same-day contracts (splitting signal) |
| 9 | ad_period_days | -0.104 | **+0.079** | [+0.058, +0.102] | Days between publication and award |
| 10 | single_bid | +0.013 | **-0.065** | [-0.092, -0.045] | Only one bidder in competitive procedure |
| 11 | win_rate | +0.727 | **-0.056** | [-0.093, -0.025] | Win rate vs. sector baseline |
| 12 | year_end | +0.059 | **+0.029** | [+0.008, +0.047] | Contract signed in December |
| 13 | institution_risk | +0.057 | **-0.016** | [-0.032, -0.001] | Institution-type baseline risk |
| 14 | industry_mismatch | +0.305 | **+0.012** | [-0.006, +0.030] | Primary sector differs from contract sector |
| 15 | co_bid_rate | 0.000 | **0.000** | [0.000, 0.000] | Regularized to zero |
| 16 | price_hyp_confidence | +0.001 | **0.000** | [0.000, 0.000] | Regularized to zero |

### Key Changes from v5.1

**1. price_volatility remains dominant (+1.156, was +1.219)**: Vendors with wildly varying contract sizes remain the strongest single predictor. The coefficient decreased slightly due to L1 regularization but remains by far the largest.

**2. vendor_concentration doubled (+0.863, was +0.428)**: With more diverse ground truth cases (many involving concentrated vendors across all sectors), concentration's role strengthened. The per-vendor cap prevents this from being driven solely by the three mega-cases.

**3. price_ratio flipped positive (+0.201, was -0.015)**: In v5.1, price_ratio was near zero. With expanded ground truth including overpricing cases (64 cases), contracts priced above sector median now correctly increase risk.

**4. network_member_count tripled (+0.199, was +0.064)**: Network membership is now a meaningful positive predictor, reflecting the inclusion of intermediary and network-based fraud cases.

**5. sector_spread flipped positive (+0.117, was -0.374)**: In v5.1, cross-sector operation was protective. In v6.0, large GT vendors like Edenred and Toka operate across multiple sectors, causing the model to associate sector spread with corruption. This is a **labeling artifact** -- see Section 10.5.

**6. win_rate flipped negative (-0.056, was +0.727)**: The strongest sign reversal. In v5.1 (trained on 27 concentrated vendors), high win rates increased risk. In v6.0 (725 diverse vendors), many GT vendors actually have lower formal win rates because they receive direct awards rather than winning competitive procedures. The model learned "low win rate = GT vendor," which is a confound rather than a genuine corruption signal -- see Section 10.5.

**7. single_bid turned negative (-0.065, was +0.013)**: Known-bad vendors tend to win through direct awards rather than single-bid competitive procedures. This contradicts OECD guidance but reflects the empirical pattern in Mexican federal procurement.

**8. Two features regularized to zero**: `co_bid_rate` (zero in both v5.1 and v6.0) and `price_hyp_confidence` (near-zero in v5.1, zero in v6.0) were eliminated by the near-L1 regularization. Co-bidding patterns do not discriminate in the current ground truth.

### Per-Sector Model Highlights

| Sector | Train AUC | Test AUC | Intercept | Top Feature | n_pos (train) |
|--------|-----------|----------|-----------|-------------|---------------|
| Salud (1) | 0.943 | 0.953 | -2.712 | price_volatility (+1.635) | 9,105 |
| Educacion (2) | 0.981 | 0.971 | -3.993 | vendor_concentration | 1,773 |
| Infraestructura (3) | 0.955 | 0.962 | -4.432 | vendor_concentration | 1,279 |
| Energia (4) | 0.950 | 0.918 | -4.093 | industry_mismatch | 880 |
| Defensa (5) | 0.915 | **0.786** | -3.182 | institution_diversity (-1.508) | 671 |
| Tecnologia (6) | 0.937 | 0.915 | -4.064 | network_member_count | 250 |
| Hacienda (7) | 0.935 | 0.926 | -3.456 | network_member_count | 861 |
| Gobernacion (8) | 0.903 | 0.870 | -3.554 | vendor_concentration | 769 |
| Agricultura (9) | 0.885 | 0.941 | -2.489 | price_volatility (+1.078) | 2,466 |
| Ambiente (10) | 0.940 | 0.953 | -3.802 | vendor_concentration | 342 |
| Trabajo (11) | 0.897 | 0.900 | -3.458 | vendor_concentration | 257 |
| Otros (12) | 0.856 | **0.843** | -3.025 | network_member_count | 103 |

**Sectors requiring caution**: Defensa (Test AUC 0.786) and Otros (0.843) have substantially weaker discrimination. Defensa's lower AUC reflects both limited ground truth (671 positive training contracts) and structural monopoly patterns (security clearance requirements legally limit competition). Five sectors (Otros, Tecnologia, Trabajo, Ambiente, Defensa) have fewer than 700 positive training contracts -- below the recommended Events Per Variable threshold for stable 16-feature logistic regression.

---

## 6. Risk Distribution

### By Risk Level

| Level | v5.1 Count | v5.1 % | v6.0 Count | v6.0 % | Change |
|-------|-----------|--------|-----------|--------|--------|
| Critical | 190,132 | 6.1% | 448,074 | 14.7% | +8.6pp |
| High | 88,728 | 2.9% | 322,609 | 10.6% | +7.7pp |
| Medium | 408,836 | 13.2% | 1,341,725 | 44.0% | +30.8pp |
| Low | 2,363,598 | 77.8% | 938,886 | 30.8% | -47.0pp |

The high-risk rate increased from 9.0% to 25.3%, reflecting the model's stronger concentration signal, expanded ground truth, and lower PU correction factor (c=0.434 vs 0.882). The 25.3% rate exceeds the OECD 2-15% core benchmark but falls within the extended range for transparent risk-indicator systems (OECD 2023 Annex B). The higher rate is driven by the intercept shift (-1.70 vs -2.35 in v5.1) and the ~2.3x PU rescaling.

### By Data Quality Period

| Structure | Years | Contracts | Avg Score | HR% |
|-----------|-------|-----------|-----------|-----|
| A | 2002-2009 | 358,919 | 0.131 | 9.7% |
| B | 2010-2017 | 1,367,293 | 0.136 | 12.0% |
| C | 2018-2022 | 928,736 | 0.152 | 12.3% |
| D | 2023-2025 | 396,326 | 0.146 | 12.0% |

The lower high-risk rate for Structure A (9.7% vs. 12.0-12.3% for later periods) likely reflects data quality limitations (0.1% RFC coverage) rather than lower corruption prevalence.

### By Sector

| Sector | Contracts | High-Risk Rate | Notes |
|--------|-----------|----------------|-------|
| Agricultura | 446,648 | 17.0% | Highest -- Segalmex/DICONSA GT dominance |
| Defensa | 78,701 | 16.2% | Structural concentration + limited GT |
| Trabajo | 48,155 | 14.8% | |
| Ambiente | 91,938 | 12.6% | |
| Energia | 313,005 | 12.5% | |
| Salud | 1,084,780 | 12.4% | |
| Tecnologia | 51,946 | 12.1% | |
| Otros | 28,340 | 11.9% | |
| Hacienda | 134,065 | 11.8% | |
| Gobernacion | 118,875 | 10.7% | |
| Infraestructura | 321,731 | 7.2% | Under-flagged -- execution fraud invisible |
| Educacion | 333,110 | 5.9% | Under-flagged |

### By Contract Size

| Contract Size | Contracts | High-Risk % |
|---------------|-----------|-------------|
| < 100K MXN | 1,286,810 | 9.3% |
| 100K-1M | 1,177,463 | 11.8% |
| 1M-10M | 480,906 | 14.2% |
| 10M-100M | 93,482 | 29.1% |
| 100M-1B | 10,534 | 69.4% |
| > 1B | 793 | 87.5% |

The monotonic increase in high-risk rate with contract size is a known systematic bias. The model's reliance on `vendor_concentration` and `price_volatility` (both correlated with contract size) means large contracts are flagged regardless of corruption indicators. The value-weighted high-risk rate is 57.2% -- not credible as a corruption estimate. See Section 10.6 for discussion.

---

## 7. Risk Level Thresholds

Thresholds are unchanged from v5.1 and v4.0:

| Level | Threshold | Meaning |
|-------|-----------|---------|
| **Critical** | >= 0.50 | Strongest similarity to documented corruption patterns |
| **High** | >= 0.30 | Strong similarity to documented corruption patterns |
| **Medium** | >= 0.10 | Moderate similarity to documented corruption patterns |
| **Low** | < 0.10 | Low similarity to documented corruption patterns |

---

## 8. Confidence Intervals

Bootstrap confidence intervals are computed for all 13 models (1 global + 12 per-sector) using 200 resamples for the global model and up to 100 resamples for sector models:

```
SE(logit) = sqrt(sum_i (z_i * SE(beta_i))^2)
CI_lower = sigma(beta_0 + beta^T z - 1.96 * SE(logit)) / c
CI_upper = sigma(beta_0 + beta^T z + 1.96 * SE(logit)) / c
```

**Known limitation**: The 200-iteration bootstrap count is below the publication standard of 500-1000 iterations. CI estimates have non-trivial Monte Carlo variance.

---

## 9. Detection Performance

### Overall Ground Truth Detection

Evaluated on all contracts linked to ground truth vendors (full population, not limited to train/test split):

| Metric | v5.1 (n=26,582) | v6.0 (n=320,725) | Notes |
|--------|-----------------|-------------------|-------|
| Detection rate (medium+) | 99.8% | **94.2%** | Expanded GT is more heterogeneous |
| High+ rate | 93.0% | **64.7%** | Many new cases score moderate, not extreme |
| Critical rate | 84.7% | **49.6%** | Per-vendor cap prevents score inflation |
| False negatives (low) | 0.2% | **5.8%** | Some GT vendors have few/ambiguous contracts |
| Mean score (known bad) | 0.853 | **0.587** | Reflects honest scoring of diverse GT |

**Why detection rates decreased**: The comparison is between fundamentally different populations. v5.1 evaluated 26,582 contracts from 27 vendors -- mostly large, concentrated vendors from well-documented mega-cases that scored very high. v6.0 evaluates 320,725 contracts from ~725 vendors spanning cases ranging from confirmed criminal proceedings (IMSS Ghost Companies) to procurement irregularities with ambiguous evidence (single-institution capture patterns identified through procurement data analysis). The lower detection rates reflect the genuine difficulty of scoring diverse corruption patterns, not a weaker model.

### Temporal Generalization Gap

GT detection varies between contracts from the training era and later periods:

| Era | High+ Detection |
|-----|-----------------|
| Training-era contracts | 68.6% |
| Post-training-era contracts | 57.3% |
| **Gap** | **11.3pp** |

This 11.3 percentage point gap suggests the model's true deployment performance on incoming new contracts will be lower than the overall 64.7% figure.

---

## 10. Limitations

> See also: `/limitations` page in the RUBLI platform for the full interactive version with workarounds.

### 10.1 Temporal Feature Leakage -- UNFIXED

**Severity: Critical**

Five vendor-level features (price_volatility, vendor_concentration, institution_diversity, sector_spread, win_rate) are computed using full 2002-2025 contract history. A contract from 2015 has its vendor's concentration computed using 2016-2025 activity that did not exist at that time. These five features account for approximately 70% of model signal.

The `vendor_rolling_stats` table (designed to provide point-in-time features) was never populated. The `compute_z_features.py` script falls back to all-time aggregates for all contracts.

**Impact on reported AUC**: The Test AUC of 0.842 is a **retrospective** metric, not a prospective one. Estimated true prospective AUC: 0.75-0.82, based on the temporal generalization gap and the degree of feature leakage.

**Required for publication**: Run `compute_vendor_rolling_stats.py`, recompute z-features with point-in-time features, recalibrate, and report the resulting AUC as the prospective estimate.

### 10.2 PU Correction Factor Is a Floor Clamp, Not a Data-Derived Estimate

The Elkan & Noto holdout estimate of c = 0.434 reflects the ground truth heterogeneity -- many labeled positive contracts are outside the actual fraud window or from vendors with ambiguous evidence. The model correctly assigns moderate scores to these, pulling down the average predicted probability on positives to ~43%.

**Score capping consequence**: Contracts with raw sigmoid output >= 0.434 are capped at exactly 1.0, destroying ordinal discrimination at the upper end.

**Root cause**: The low c reflects that many newly added GT vendors have few contracts, ambiguous fraud windows, or patterns that differ from the dominant mega-cases.

### 10.3 Label Noise -- 30-50% of Positive Training Contracts

Of the ~390 ground truth cases, only 15 have explicit fraud time-window filtering. The remaining ~375 cases label **all contracts** from their vendors as positive regardless of the fraud period. Estimated 30-50% of positive training contracts are legitimate transactions from vendors who committed fraud only during specific periods, at specific institutions, or through specific contract types.

The per-vendor cap of 100 mitigates but does not eliminate this. The model still learns vendor *profiles* rather than *corruption indicators per se*.

**The low PU factor (c = 0.434) is a direct consequence of this label noise.** The model correctly assigns low scores to many "positive" contracts that are, in fact, clean.

### 10.4 Procurement-Phase Only -- Execution Fraud Is Invisible

RUBLI analyzes contract **award** data from COMPRANET. It cannot detect fraud during contract execution: cost overruns, ghost workers, material substitution, inflated invoicing, or kickbacks. This is why Infraestructura (7.2% HR) and Educacion (5.9% HR) are under-flagged -- major scandals in these sectors (Odebrecht, Grupo Higa, Tren Maya) involved execution-phase mechanisms invisible to procurement records.

**Workaround**: Cross-reference with ASF audit reports, which cover execution-phase irregularities.

### 10.5 Coefficient Sign Inversions -- Labeling Artifacts

Three features have signs that contradict domain expertise:

| Feature | v6.0 Sign | Expected Sign | Root Cause |
|---------|-----------|---------------|------------|
| win_rate | **Negative** (-0.056) | Positive | GT vendors receive direct awards (not formal "wins") |
| single_bid | **Negative** (-0.065) | Positive | GT vendors win through DA, not single-bid |
| sector_spread | **Positive** (+0.117) | Negative | Large GT vendors (Edenred, Toka) operate across sectors |

These inversions are systemic labeling artifacts. Large GT vendors like LICONSA and Pisa have lower formal win rates (because they receive direct awards) and operate across multiple sectors (because they are large enterprises). The model learned "low win rate + multi-sector = GT vendor" which is a confound, not a corruption signal.

**Not fixable by retraining** without contract-level fraud scoping that narrows positive labels to specific institutions, time periods, and contract types.

### 10.6 Contract Size Bias

Risk scores increase monotonically with contract size: 87.5% of contracts above 1 billion MXN are flagged as high-risk regardless of corruption indicators. This reflects the model's reliance on `vendor_concentration` and `price_volatility`, both of which scale with contract value. A 2 billion MXN legitimate infrastructure project scores higher than a 500K MXN fraudulent ghost company contract.

The value-weighted high-risk rate far exceeds the count-weighted rate (25.3%) and is not credible as a corruption prevalence estimate. Any published output for contracts above 100M MXN should carry the caveat: "Score reflects vendor concentration patterns; individual contract investigation required."

### 10.7 New Vendor Blind Spot

Vendors entering the market after 2022 score 3.6x lower than established vendors (2.9% HR vs. 20.2% for pre-2010 established vendors). The model requires years of contract history before detecting concentrated or volatile vendors. A new shell company with 3 overpriced direct-award contracts in 2025 will score approximately 0.06 (low risk). Ghost companies created fresh are effectively invisible.

### 10.8 Co-Bidding Signal -- Regularized to Zero

`co_bid_rate` was regularized to exactly 0.000 in all 13 models (global and all 12 sectors), unchanged from v5.1. Co-bidding patterns do not discriminate between corrupt and clean vendors in the current ground truth.

**Not detected by the risk score**:
- Cover bidding (partner bids high to let the winner win)
- Bid rotation (vendors take turns winning)
- Market allocation by geography or institution

The Vendor Profile collusion detection module provides a separate heuristic analysis but does not feed into the contract-level risk score.

### 10.9 SCAR Assumption Violation

The Elkan & Noto (2008) PU correction assumes labeled positives are **Selected Completely At Random** (SCAR) from all corrupt contracts. The RUBLI ground truth consists of publicly documented, high-profile scandals selected because they attracted media attention, regulatory action, or journalistic investigation. Selection probability is correlated with vendor size, sector prominence, and political salience.

The correction factor c = 0.434 estimates detection coverage for *similar high-profile scandals*, not true corruption prevalence. Coverage of undiscovered, small-scale, or non-media-visible fraud is unknown and likely far lower (estimated 10-30% based on OECD prevalence surveys).

### 10.10 Vendor Deduplication -- Unsolved

The same company appears under multiple name variations across 23 years of COMPRANET data. RFC-based deduplication provides partial coverage (0.1% for 2002-2010, up to 47.4% for 2023-2025). True vendor concentration is systematically underestimated for pre-2018 data.

### 10.11 Structural Concentration -- Legitimate Monopolies

Some high-scoring vendors are legitimate monopolies driven by patents, regulation, or market structure:
- **Patented pharmaceuticals**: Gilead Sciences (HIV/HepC), Sanofi Pasteur (vaccines) -- legally mandated direct award under LAASSP Art. 41
- **Regulated markets**: Edenred/Sodexo (meal vouchers), government insurance carriers
- **Security clearance**: Defensa sector vendors with legally limited competition

The ARIA pipeline maintains `fp_structural_monopoly` flags for 52 known legitimate monopoly vendors, but this flag is not incorporated into the scoring model itself.

### 10.12 Data Quality by Period

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002-2010 | 0.1% | Lowest -- encoding issues, missing fields, unreliable z-scores |
| B | 2010-2017 | 15.7% | Better -- UPPERCASE text, ~72% direct award rate |
| C | 2018-2022 | 30.3% | Good -- mixed case, ~78% direct award rate |
| D | 2023-2025 | 47.4% | Best -- 100% Partida codes, most complete |

Risk scores for 2002-2010 contracts are directional estimates with wider implicit confidence bands.

### 10.13 Temporal Stationarity

The model assumes corruption patterns are relatively stable across 2002-2025. The stable high-risk rates (9.7%-12.3%) across periods suggest reasonable temporal stability in detectable patterns, but this does not rule out the emergence of novel undetectable fraud mechanisms under new administrations.

### 10.14 Correlation Is Not Causation

A risk score of 0.85 means: *"This contract has statistical characteristics similar to contracts from documented corruption cases."* It does not mean the contract is corrupt. A legitimate bulk medicine purchase by IMSS from a major pharmaceutical supplier scores high for the same reasons a fraudulent one does -- large amount, concentrated vendor, same institution. Scores are **investigation triage**, not verdicts.

### 10.15 Sector Disparity

Four sectors violate the EEOC-inspired 4/5 fairness benchmark (all groups within 0.80x-1.25x of the overall rate):

| Sector | High-Risk % | Ratio vs. 25.3% | Direction |
|--------|-------------|------------------|-----------|
| Agricultura | 17.0% | 0.67x | Under-flagged vs. average |
| Defensa | 16.2% | 0.64x | Under-flagged vs. average |
| Infraestructura | 7.2% | 0.28x | Severely under-flagged |
| Educacion | 5.9% | 0.23x | Severely under-flagged |

Agricultura is over-flagged because Segalmex/LICONSA/DICONSA cases dominate the ground truth. Infraestructura and Educacion are under-flagged because infrastructure fraud occurs during execution (invisible to COMPRANET).

### Summary

| Limitation | Impact | Fixable? |
|-----------|--------|----------|
| **Temporal feature leakage (C1)** | **AUC inflated; true prospective AUC ~0.75-0.82** | **Yes (vendor_rolling_stats pipeline)** |
| **PU c = 0.434** | Score ~2.3x rescaling, upper scores capped at 1.0 | Partial (better label scoping) |
| **Label noise (30-50%)** | Model learns vendor profiles, not corruption | Yes (contract-level fraud scoping) |
| Execution-phase fraud invisible | Infrastructure/construction underscored | Partial (needs ASF data) |
| Coefficient sign inversions | win_rate, single_bid, sector_spread have wrong signs | No (labeling artifact) |
| Contract size bias | 87.5% HR for >1B MXN contracts | Partial (size normalization) |
| New vendor blind spot | 2.9% HR for 2022+ vendors | Partial (companion heuristic rules) |
| Co-bidding signal = zero | Bid rotation not in risk score | Yes (needs collusion GT) |
| SCAR violation | c does not estimate true corruption prevalence | Partial (better labeled data) |
| Vendor deduplication unsolved | True concentration understated pre-2018 | Partial (RFC blocking) |
| Structural concentration | Some sectors over-flagged | Yes (sector-specific priors) |
| Pre-2010 data quality | 12% of records less reliable | No (structural COMPRANET limit) |
| Temporal stationarity | New fraud patterns may be missed | Yes (periodic retraining) |
| Sector disparity | Agricultura 1.44x over, Educacion 0.50x under | Partial (GT balancing) |
| Correlation != causation | Scores require follow-up investigation | No (by design) |

---

## 11. Pipeline Execution

```bash
# Full v6.0 pipeline
cd backend

# 1-3: Feature computation (skip if already done)
python -m scripts.compute_factor_baselines
python -m scripts.compute_z_features       # ~45min on 3.1M contracts
python -m scripts.compute_mahalanobis

# 4: Calibrate model with Optuna
python -m scripts.calibrate_risk_model_v6_enhanced \
    --use-optuna --optuna-trials 150 \
    --neg-ratio 10 --max-per-vendor 100 \
    --n-bootstrap 200

# 5: Score all contracts
python scripts/_score_v6_now.py

# 6: Regenerate stats
python -m scripts.precompute_stats
```

### Key Scripts

| Script | Purpose |
|--------|---------|
| `calibrate_risk_model_v6_enhanced.py` | Optuna HPO, vendor-stratified split, per-vendor cap, sector models |
| `_score_v6_now.py` | Per-sector model routing, batch scoring with CI propagation |
| `compute_z_features.py` | Z-score computation (16 features, sector-year baselines) |
| `compute_factor_baselines.py` | Sector-year mean/stddev for z-score normalization |

### Database Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `factor_baselines` | ~3,500 | Per-factor mean/stddev by sector/year |
| `contract_z_features` | ~3.1M | Z-score vector + Mahalanobis per contract |
| `model_calibration` | 13 | 1 global + 12 sector models for v6.0 |
| `ground_truth_cases` | ~390 | Documented corruption cases |
| `ground_truth_vendors` | ~725 | Known-bad vendor records |

### Columns on `contracts`

| Column | Type | Description |
|--------|------|-------------|
| `risk_score` | REAL | Active v6.0 risk indicator score |
| `risk_score_v3` | REAL | Preserved v3.3 checklist scores |
| `risk_score_v4` | REAL | Preserved v4.0 scores |
| `risk_score_v5` | REAL | Preserved v5.1 scores |
| `risk_level` | VARCHAR | critical/high/medium/low |
| `risk_confidence_lower` | REAL | Lower bound of 95% CI |
| `risk_confidence_upper` | REAL | Upper bound of 95% CI |
| `mahalanobis_distance` | REAL | Multivariate anomaly score |
| `risk_model_version` | VARCHAR(10) | 'v6.0' |

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| **6.0.0** | 2026-03-13 | Massive GT expansion (~390 cases, ~725 vendors, ~320K contracts). Vendor-stratified 70/30 split (no vendor in both train and test). Optuna TPE (150 trials, C=1.28, l1_ratio=0.961). Per-vendor cap (100). Fraud time-window filtering (15 cases). Sector-proportional negative sampling (5:1). PU c=0.434. Train AUC 0.849, Test AUC 0.842. HR 25.3%. v5.1 preserved in risk_score_v5. |
| 5.2.0 | 2026-03-07 | Analytical enrichment layer. SHAP explanations, PyOD ensemble anomaly, vendor drift detection. v5.1 scores unchanged. |
| 5.1.0 | 2026-02-27 | Case 22 (SAT EFOS, 38 vendors). EFOS avg score 0.028 to 0.283. |
| 5.0.0 | 2026-02-14 | Per-sector sub-models, 15 cases, temporal split, Elkan & Noto PU correction. Test AUC 0.957 (inflated). |
| 4.0.2 | 2026-02-09 | Dampened coefficients, OECD-compliant thresholds. AUC 0.942. |
| 4.0.0 | 2026-02-06 | Statistical framework: z-scores, Mahalanobis, Bayesian calibration. |
| 3.3.0 | 2026-02-06 | 8 base factors, interaction effects. AUC 0.584. |

---

## Key Sources

- **Elkan, C. & Noto, K.** (2008). Learning classifiers from only positive and unlabeled data. *Proceedings of the 14th ACM SIGKDD*, 213-220.
- **IMF** (2022). Assessing Vulnerabilities to Corruption in Public Procurement. *Working Paper WP/2022/094*.
- **OECD** (2023). *Government at a Glance 2023: Public Procurement Performance*. OECD Publishing.
- **World Bank INT** (2019). *Warning Signs of Fraud and Corruption in Procurement*.
- **Gallego, J., Rivero, G., & Martinez, J.** (2022). Preventing rather than punishing: An early warning model of malfeasance in public procurement. *International Journal of Forecasting*, 38(3), 826-843.
- **Mitchell, M., Wu, S., Zaldivar, A., et al.** (2019). Model Cards for Model Reporting. *Proceedings of FAT\* 2019*, 220-229.
- **Peduzzi, P., Concato, J., Kemper, E., et al.** (1996). A simulation study of the number of events per variable in logistic regression analysis. *Journal of Clinical Epidemiology*, 49(12), 1373-1379.
- **Mahalanobis, P.C.** (1936). On the generalized distance in statistics. *Proceedings of the National Institute of Sciences of India*, 2(1), 49-55.
- **Ledoit, O. & Wolf, M.** (2004). A well-conditioned estimator for large-dimensional covariance matrices. *Journal of Multivariate Analysis*, 88(2), 365-411.
- EU ARACHNE: Risk scoring methodology for EU structural funds. European Commission.

---

*Risk scores are statistical risk indicators measuring similarity to documented corruption patterns. A high score does not constitute proof of wrongdoing -- it indicates the contract's procurement characteristics closely resemble those from known corruption cases. Scores must not be used as the sole basis for any administrative, legal, or investigative action.*
