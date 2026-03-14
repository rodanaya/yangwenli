# Model Card: RUBLI Risk Scoring Model v6.1

**Following:** Mitchell et al. (2019), "Model Cards for Model Reporting"

**Date:** March 13, 2026
**Version:** v6.1 (Run ID: `CAL-v6.1-202603101709`)
**Organization:** RUBLI Project (Open Source)
**Contact:** github.com/rodanaya/yangwenli

---

## 1. Model Details

### 1.1 Overview

RUBLI v6.1 is a **Positive-Unlabeled (PU) ElasticNet logistic regression** model that produces contract-level risk indicator scores for Mexican federal procurement data (COMPRANET, 2002--2025). It estimates the similarity of each contract's procurement characteristics to those observed in documented corruption cases.

### 1.2 Architecture

- **1 global model** + **12 per-sector sub-models** (one per sector in the RUBLI taxonomy)
- Each sub-model is an independent L1/L2-regularized logistic regression fitted on sector-specific training data
- Contracts are scored by their sector-specific model when available; the global model serves as fallback
- **16 z-score input features** normalized against sector-year baselines (see Section 4.3)

### 1.3 Training Procedure

| Property | Value |
|----------|-------|
| **Optimization** | Optuna TPE (Tree-structured Parzen Estimator), 150 trials |
| **Best C** | 0.3499 |
| **Best l1_ratio** | 0.9958 (near-pure L1 / Lasso) |
| **Solver** | `saga` (scikit-learn LogisticRegression) |
| **Train/test split** | Vendor-stratified 70/30 (no vendor appears in both train and test) |
| **Per-vendor cap** | 100 contracts maximum per vendor in training set |
| **Negative sampling** | 10:1 ratio (negatives : positives), sector-proportional |
| **PU correction** | Elkan & Noto (2008) holdout estimator, floor-clamped at c = 0.50 |
| **Bootstrap CIs** | 1,000 resamples for coefficient confidence intervals |

### 1.4 PU-Learning Correction

The model operates in a Positive-Unlabeled (PU) learning framework (Elkan & Noto, 2008). Only contracts linked to documented corruption cases are labeled positive; the remaining 3M+ contracts are unlabeled (not necessarily clean). The correction is:

```
P(corrupt | x) = P(labeled = 1 | x) / c
```

where `c = P(labeled = 1 | corrupt)` is estimated from a held-out set of labeled positives.

**Estimated c = 0.50** (floor-clamped). This is conservative: the raw holdout estimate fell below 0.50, meaning the model assigns average predicted probability < 50% to known positive contracts. This reflects the heterogeneity of the ground truth -- many labeled contracts are outside the actual fraud window (see Section 6.2). The floor clamp prevents score inflation.

### 1.5 Intercept and Score Formula

```
logit(x) = -2.8209 + beta^T * z(x)
score(x) = min(1.0, sigma(logit(x)) / 0.50)
```

where `sigma` is the logistic sigmoid and `z(x)` is the 16-dimensional z-score vector for contract `x`.

---

## 2. Intended Use

### 2.1 Primary Intended Use

**Investigation triage** for Mexican federal procurement oversight. The model ranks contracts by their statistical similarity to documented corruption patterns, enabling investigators to prioritize limited audit resources.

### 2.2 Primary Intended Users

- Government oversight bodies (ASF, SFP, COFECE)
- Investigative journalists covering public procurement
- Academic researchers studying procurement integrity
- Civil society organizations (e.g., MCCI, IMCO, Transparencia Mexicana)

### 2.3 Out-of-Scope Uses

The following uses are **explicitly out of scope** and the model is not designed for them:

| Use | Why Out of Scope |
|-----|------------------|
| **Proof of corruption** | Scores measure statistical similarity, not guilt |
| **Criminal proceedings** | No evidentiary standard is met |
| **Automated vendor exclusion** | Risk of false positives affecting legitimate businesses |
| **Subnational procurement** | Trained exclusively on federal COMPRANET data |
| **Real-time fraud prevention** | Retrospective batch model, not streaming |
| **Cross-country comparison** | Calibrated to Mexican procurement patterns only |

---

## 3. Factors

### 3.1 Relevant Factors

The model's performance varies along the following dimensions:

#### 3.1.1 Sector (12-category taxonomy)

| ID | Sector | Contracts | High-Risk Rate | Test AUC |
|----|--------|-----------|----------------|----------|
| 1 | Salud | 1,084,780 | 12.4% | 0.953 |
| 2 | Educacion | 333,110 | 5.9% | 0.971 |
| 3 | Infraestructura | 321,731 | 7.2% | 0.962 |
| 4 | Energia | 313,005 | 12.5% | 0.918 |
| 5 | Defensa | 78,701 | 16.2% | 0.786 |
| 6 | Tecnologia | 51,946 | 12.1% | 0.915 |
| 7 | Hacienda | 134,065 | 11.8% | 0.926 |
| 8 | Gobernacion | 118,875 | 10.7% | 0.870 |
| 9 | Agricultura | 446,648 | 17.0% | 0.941 |
| 10 | Ambiente | 91,938 | 12.6% | 0.953 |
| 11 | Trabajo | 48,155 | 14.8% | 0.900 |
| 12 | Otros | 28,340 | 11.9% | 0.843 |

**Notable disparities:** Defensa (AUC = 0.786) and Otros (AUC = 0.843) have substantially weaker discrimination. Defensa's lower AUC reflects both limited ground truth (671 positive training contracts) and structural monopoly patterns (security clearance requirements legally limit competition). Agricultura's high-risk rate (17.0%) reflects the concentration of Segalmex/DICONSA/LICONSA cases in the ground truth.

#### 3.1.2 Data Quality Period

| Structure | Years | Contracts | Avg Score | HR% | Notes |
|-----------|-------|-----------|-----------|-----|-------|
| A | 2002--2009 | 358,919 | 0.1310 | 9.7% | 0.1% RFC coverage; lowest quality |
| B | 2010--2017 | 1,367,293 | 0.1355 | 12.0% | 15.7% RFC; UPPERCASE text |
| C | 2018--2022 | 928,736 | 0.1523 | 12.3% | 30.3% RFC; mixed case |
| D | 2023--2025 | 396,326 | 0.1460 | 12.0% | 47.4% RFC; best quality |

The lower high-risk rate for Structure A (9.7% vs. 12.0--12.3% for later periods) likely reflects data quality limitations rather than genuinely lower corruption prevalence. Z-score features computed from incomplete data are less discriminative.

#### 3.1.3 Vendor Size

The model exhibits systematic **large-vendor bias**. The three largest ground truth cases (IMSS Ghost Companies, Segalmex, COVID-19 procurement) account for a disproportionate share of positive training data. These cases involve vendors with thousands of contracts and high market concentration. Small-vendor corruption (shell companies with few contracts per entity) is systematically underdetected (see Section 6.3).

---

## 4. Metrics

### 4.1 Summary Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Train AUC-ROC** | 0.921 | On 70% vendor-stratified training set |
| **Test AUC-ROC** | 0.934 | On 30% vendor-stratified holdout |
| **Brier Score** | 0.0503 | Lower = better calibration (0 = perfect) |
| **Population high-risk rate** | 11.8% | Critical (7.6%) + High (4.2%); OECD benchmark: 2--15% |
| **Contracts scored** | 3,051,294 | Full COMPRANET 2002--2025 corpus |
| **Score range** | [0.000024, 1.000000] | After PU correction and clipping |

### 4.2 Ground Truth Detection

Evaluated on all 417,221 contracts linked to ground truth vendors (not the training/test split -- this is the full population figure):

| Threshold | Count | Rate |
|-----------|-------|------|
| Critical (>= 0.50) | 216,950 | 52.0% |
| High+ (>= 0.30) | 270,051 | 64.7% |
| Medium+ (>= 0.10) | 384,172 | 92.1% |
| Low / False Negative (< 0.10) | 33,049 | 7.9% |
| **Mean score** | -- | **0.587** |

**Interpretation:** 64.7% of contracts from ground truth vendors score as high or critical risk. The 7.9% false negative rate represents contracts from known-bad vendors that the model scores as low risk. Many of these are likely legitimate contracts from vendors who committed fraud only during specific periods or at specific institutions (see Section 6.2 on label noise).

### 4.3 Input Features (16 z-score features)

Features are standardized against sector-year baselines: `z_i = (x_i - mu(s,t)) / sigma(s,t)`.

| # | Feature | Global beta | 95% CI | Interpretation |
|---|---------|------------|--------|----------------|
| 1 | price_volatility | **+1.156** | [+1.109, +1.212] | Vendor's contract-size variance vs. sector norm |
| 2 | vendor_concentration | **+0.863** | [+0.804, +0.931] | Vendor's value share within sector |
| 3 | institution_diversity | **-0.436** | [-0.466, -0.407] | Count of distinct institutions served (protective) |
| 4 | price_ratio | **+0.201** | [+0.166, +0.239] | Contract amount / sector median |
| 5 | network_member_count | **+0.199** | [+0.189, +0.214] | Size of vendor's co-contracting network |
| 6 | direct_award | **+0.132** | [+0.107, +0.154] | Binary: awarded without competitive process |
| 7 | sector_spread | **+0.117** | [+0.096, +0.140] | Number of sectors vendor operates across |
| 8 | same_day_count | **+0.107** | [+0.096, +0.118] | Same-day contracts to same vendor (splitting signal) |
| 9 | ad_period_days | **+0.079** | [+0.058, +0.102] | Days between publication and award |
| 10 | single_bid | **-0.065** | [-0.092, -0.045] | Only one bidder in competitive procedure |
| 11 | win_rate | **-0.056** | [-0.093, -0.025] | Vendor's win rate vs. sector baseline |
| 12 | year_end | **+0.029** | [+0.008, +0.047] | Contract signed in December |
| 13 | institution_risk | **-0.016** | [-0.032, -0.001] | Institution-type baseline risk |
| 14 | industry_mismatch | **+0.012** | [-0.006, +0.030] | Vendor's primary sector differs from contract sector |
| 15 | co_bid_rate | **0.000** | [0.000, 0.000] | Co-bidding frequency (regularized to zero) |
| 16 | price_hyp_confidence | **0.000** | [0.000, 0.000] | IQR outlier confidence (regularized to zero) |

**Features regularized to zero:** `co_bid_rate` and `price_hyp_confidence` were driven to exactly zero by the near-L1 regularization (l1_ratio = 0.996). Co-bidding does not discriminate between corrupt and non-corrupt vendors in the current ground truth, which is dominated by market-concentration patterns rather than collusion rings.

**Counterintuitive signs:**
- `single_bid` is **negative** (-0.065): known-bad vendors in the ground truth tend to win through repeated direct awards rather than single-bid competitive procedures. This contradicts OECD guidance but reflects the empirical pattern in Mexican federal procurement.
- `win_rate` is **negative** (-0.056): ground truth vendors often have lower formal win rates because they receive direct awards (which do not count as "wins" in competitive procedures). This is a labeling artifact.
- `institution_diversity` is **negative** (-0.436): vendors serving many institutions are less suspicious -- they have legitimate broad reach. The ground truth is dominated by vendors captured by a single institution (e.g., IMSS, DICONSA).

### 4.4 Risk Level Thresholds

| Level | Threshold | Count | Percentage | Intended Action |
|-------|-----------|-------|------------|-----------------|
| **Critical** | >= 0.50 | 233,351 | 7.6% | Immediate investigation |
| **High** | >= 0.30 | 127,995 | 4.2% | Priority review |
| **Medium** | >= 0.10 | 534,246 | 17.5% | Watch list |
| **Low** | < 0.10 | 2,155,702 | 70.6% | Standard monitoring |

Thresholds are identical to v5.1. The 11.8% high-risk rate (critical + high) falls within the OECD (2023) benchmark range of 2--15% for procurement anomaly detection systems.

---

## 5. Training Data

### 5.1 Dataset Composition

| Component | Count | Source |
|-----------|-------|--------|
| **Ground truth cases** | 390 | Documented corruption cases from ASF audits, journalistic investigations, COFECE rulings, SFP sanctions, SAT EFOS listings |
| **Matched vendors** | 725 | Vendors linked to cases via RFC or name matching |
| **Contracts from GT vendors** | 417,221 | All contracts in COMPRANET from matched vendors |
| **Positive training set** | 18,756 | After per-vendor cap (100 max) and 70/30 vendor split |
| **Negative training set** | 183,874 | Unlabeled contracts, 10:1 ratio, sector-proportional |
| **Positive test set** | 7,543 | 30% vendor holdout |
| **Total training rows** | 202,630 | Positive + negative training |
| **Total test rows** | 86,659 | Positive test + proportional negatives |

### 5.2 Ground Truth Case Types

| Case Type | Count |
|-----------|-------|
| Procurement fraud | 136 |
| Monopoly | 68 |
| Overpricing | 64 |
| Concentrated monopoly | 27 |
| Institution capture | 23 |
| Ghost company | 15 |
| Bid rigging | 8 |
| Other (bribery, conflict of interest, data anomaly, intermediary, etc.) | 49 |

### 5.3 Known Training Data Biases

**CRITICAL: Three cases dominate the positive training data.**

| Case | Vendors | GT Contracts | Share of Positives |
|------|---------|-------------|-------------------|
| IMSS Ghost Company Network | 2 | 9,257 | ~2.2% of all GT contracts |
| Segalmex Food Distribution | 22 | 6,986 | ~1.7% |
| DICONSA Ring ecosystem | ~20 | ~80,000+ | ~19%+ |

The DICONSA/LICONSA/Segalmex ecosystem of food distribution cases collectively represents the largest single cluster in the ground truth. The model has learned that "large vendor + high concentration + food/agriculture sector + single institution" is the dominant corruption pattern. This is empirically accurate for the documented cases but creates blind spots for other corruption mechanisms.

---

## 6. Caveats and Recommendations

### 6.1 Score Interpretation

**Scores are NOT calibrated probabilities of corruption.** A score of 0.50 does not mean there is a 50% probability the contract is corrupt. Scores measure the statistical similarity of a contract's procurement characteristics to those observed in documented corruption cases. They should be used exclusively for investigation triage and prioritization, never as standalone evidence.

### 6.2 Label Noise (~30--50% of positive training contracts)

The model labels **all contracts** from a ground truth vendor as positive. This is a deliberate simplification required by the PU framework but introduces substantial label noise:

- A vendor documented for fraud at IMSS during 2018--2020 has all their contracts (2002--2025, across all institutions) labeled as positive
- Estimated 30--50% of positive training contracts are outside the actual fraud window
- The per-vendor cap of 100 mitigates but does not eliminate this: the model still learns vendor *profiles* rather than *corruption indicators per se*

**The floor-clamped PU factor (c = 0.50) is a direct consequence of this label noise.** The model correctly assigns low scores to many "positive" contracts that are, in fact, clean.

### 6.3 Temporal Feature Leakage

Vendor-level features (`vendor_concentration`, `win_rate`, `price_volatility`, `institution_diversity`, `sector_spread`) are computed using **full-history aggregates** (2002--2025). A contract from 2015 has its vendor's concentration computed using 2016--2025 activity. This constitutes indirect information leakage.

**Impact:** The reported Test AUC of 0.934 is likely **inflated** relative to true prospective performance. The vendor-stratified split prevents direct leakage (no vendor in both train and test), but the feature computation still uses future data for all contracts.

**NEEDS VALIDATION BEFORE PUBLICATION:** A point-in-time feature computation experiment (features for year T use only data from years <= T-1) would establish the true prospective AUC. This has not been conducted.

### 6.4 SCAR Assumption Violation

The Elkan & Noto (2008) PU correction assumes labeled positives are **Selected Completely At Random** (SCAR) from all corrupt contracts. This assumption is **structurally violated**:

- Labeled cases are selected because they attracted media attention, regulatory action, or journalistic investigation
- Selection probability is correlated with vendor size, sector prominence, and political salience
- Small-vendor corruption, distributed fraud, and corruption in low-visibility sectors are systematically underrepresented
- The correction factor c = 0.50 reflects detection of cases *similar to known scandals*, not coverage of all corruption

**True corruption coverage is unknown but likely far lower than 50%** (estimated 10--30% based on OECD prevalence surveys).

### 6.5 Structural Monopoly Blind Spot

Some high-scoring vendors are legitimate monopolies driven by patents, regulation, or market structure:

- **Patented pharmaceuticals**: Gilead Sciences (HIV/HepC), Sanofi Pasteur (vaccines) -- legally mandated direct award under LAASSP Art. 41
- **Regulated markets**: Edenred/Sodexo (meal vouchers), government insurance carriers
- **Security clearance**: Defensa sector vendors with legally limited competition

The ARIA pipeline maintains a `fp_structural_monopoly` flag for 52 known legitimate monopoly vendors, but this flag is not incorporated into the scoring model itself.

### 6.6 Execution-Phase Fraud Is Invisible

COMPRANET contains only contract **award** data. The model cannot detect:

- Cost overruns and change orders during execution
- Ghost workers or material substitution
- Inflated invoicing or kickbacks
- Quality deficiencies in delivered goods/services

This is the primary reason why infrastructure/construction contracts are systematically underscored. Major scandals (Odebrecht, Grupo Higa, Tren Maya) involved execution-phase mechanisms invisible to award data.

### 6.7 Pre-2010 Data Quality

Structure A data (2002--2009, 358,919 contracts) has 0.1% RFC coverage. Vendor-level features are less reliable because vendor deduplication depends on name matching rather than unique tax identifiers. Risk scores for this period should be treated as **directional estimates** with wider implicit confidence bands.

### 6.8 Co-Bidding Signal Absent

Both `co_bid_rate` and `price_hyp_confidence` were regularized to exactly zero. The model **cannot detect**:

- Cover bidding (partner bids high to let the predetermined winner win)
- Bid rotation (vendors take turns winning)
- Market allocation by geography or institution

These patterns require dedicated collusion detection algorithms (available separately in the RUBLI platform's Vendor Profile module) but do not contribute to the contract-level risk score.

### 6.9 Temporal Stationarity Assumption

The model assumes corruption patterns are relatively stable across the 2002--2025 period. If new administrations introduce fundamentally different fraud mechanisms, the model may be slow to detect them. The stable high-risk rates across periods (9.7%--12.3%) suggest reasonable temporal stability in **detectable** patterns, but this does not rule out the emergence of novel undetectable patterns.

### 6.10 Vendor Deduplication Unsolved

The same legal entity may appear under multiple name variations across 23 years of COMPRANET data. RFC-based deduplication is partial (0.1%--47.4% coverage by period). True vendor concentration is systematically **underestimated** for pre-2018 data.

---

## 7. Quantitative Analyses

### 7.1 Disaggregated Performance by Sector

| Sector | Train AUC | Test AUC | Intercept | Top Feature | n_pos (train) |
|--------|-----------|----------|-----------|-------------|---------------|
| Salud (1) | 0.943 | 0.953 | -2.712 | price_volatility (+1.635) | 9,105 |
| Educacion (2) | 0.981 | 0.971 | -3.993 | (high AUC, limited GT) | 1,773 |
| Infraestructura (3) | 0.955 | 0.962 | -4.432 | (concentration pattern) | 1,279 |
| Energia (4) | 0.950 | 0.918 | -4.093 | (industry mismatch) | 880 |
| Defensa (5) | 0.915 | **0.786** | -3.182 | institution_diversity (-1.508) | 671 |
| Tecnologia (6) | 0.937 | 0.915 | -4.064 | (limited GT) | 250 |
| Hacienda (7) | 0.935 | 0.926 | -3.456 | (network signal) | 861 |
| Gobernacion (8) | 0.903 | 0.870 | -3.554 | (limited GT) | 769 |
| Agricultura (9) | 0.885 | 0.941 | -2.489 | price_volatility (+1.078) | 2,466 |
| Ambiente (10) | 0.940 | 0.953 | -3.802 | (limited GT) | 342 |
| Trabajo (11) | 0.897 | 0.900 | -3.458 | (limited GT) | 257 |
| Otros (12) | 0.856 | **0.843** | -3.025 | (fewest cases) | 103 |

**Sectors requiring caution:** Defensa (Test AUC 0.786) and Otros (0.843) have test AUCs below 0.90. Scores in these sectors should be interpreted with additional caution. Both sectors have limited ground truth representation (671 and 103 positive training contracts, respectively).

### 7.2 Temporal Stability

| Period | Contracts | Mean Score | High-Risk Rate |
|--------|-----------|------------|----------------|
| 2002--2009 | 358,919 | 0.131 | 9.7% |
| 2010--2017 | 1,367,293 | 0.136 | 12.0% |
| 2018--2022 | 928,736 | 0.152 | 12.3% |
| 2023--2025 | 396,326 | 0.146 | 12.0% |

The high-risk rate is stable at 12.0 +/- 0.3% for 2010--2025 data, with a lower rate (9.7%) for the pre-2010 period. The lower rate for Structure A data is likely an artifact of data quality limitations rather than genuine temporal variation.

### 7.3 Comparison to Previous Versions

| Metric | v3.3 | v4.0 | v5.1 | **v6.1** |
|--------|------|------|------|----------|
| AUC-ROC (test) | 0.584 | 0.942* | 0.957** | **0.934*** |
| High-risk rate | 2.0% | 11.0% | 9.0% | **11.8%** |
| GT cases | 9 | 9 | 22 | **390** |
| GT vendors | 17 | 17 | 27 | **725** |
| Validation | Lift only | In-sample | Temporal | **Vendor-stratified** |
| PU c | -- | 0.890 | 0.882 | **0.500** |

\* In-sample AUC (no train/test split)
\** Temporal split with vendor data leakage (features use full history; same vendor may appear in both train and test)
\*** Vendor-stratified split (no vendor in both train and test); still has temporal feature leakage

**Why v6.1 AUC is lower than v5.1:** The v5.1 AUC of 0.957 was inflated by two factors: (1) temporal split allowed the same vendor's contracts in both train and test, and (2) vendor-aggregate features computed on full history leaked future information. v6.1's vendor-stratified split is a more honest evaluation but still suffers from temporal feature leakage (see Section 6.3). The true prospective AUC is estimated at 0.80--0.90.

**Why v6.1 PU c is lower:** With 390 cases and 725 vendors (vs. 22 cases, 27 vendors in v5.1), the ground truth is far more diverse but also noisier. Many newly added vendors have few contracts or ambiguous fraud windows. The model correctly assigns moderate-to-low scores to many of these "positive" contracts, pushing the holdout estimate of c below 0.50 (floor-clamped).

---

## 8. Ethical Considerations

### 8.1 Risk of False Positives

With 361,346 contracts scored as high-risk or critical (11.8%), a substantial number are legitimate transactions from vendors whose procurement characteristics resemble corruption patterns. False positives can:

- Damage the reputation of legitimate vendors
- Waste investigative resources on non-issues
- Create a "crying wolf" effect that erodes trust in the system
- Disproportionately affect sectors with structural concentration (Defensa, Energia)

**Mitigation:** Scores are presented alongside confidence intervals and feature-level explanations (SHAP). The ARIA pipeline provides additional contextual screening (structural monopoly flags, EFOS cross-referencing, pattern classification) before any vendor reaches human reviewers.

### 8.2 Risk of False Negatives

The 7.9% false negative rate on ground truth contracts means some contracts from known-corrupt vendors score as low risk. More concerning, the model systematically underdetects:

- Small-vendor corruption (new shell companies, few contracts)
- Execution-phase fraud (invisible to award data)
- Collusion rings (co-bidding signal regularized to zero)
- Corruption in under-represented sectors (Defensa, Otros)

**False negatives are more dangerous than false positives** in an anti-corruption context: they provide false assurance that a contract is clean when it may not be.

### 8.3 Decision Authority

The model produces **recommendations for human review**, not automated decisions. Investigation decisions must remain with qualified human reviewers who can:

- Assess contextual factors not captured in COMPRANET data
- Cross-reference with external sources (ASF audits, press reports, SFP sanctions)
- Apply proportionality principles (not all high scores warrant the same response)
- Exercise judgment about sector-specific structural factors

No contract should be flagged, investigated, or cleared based solely on its risk score.

### 8.4 Data Privacy

The model processes publicly available COMPRANET data. However, vendor RFCs (Mexican tax identifiers) are personally identifiable information for *persona fisica* vendors (individuals). The platform does not display RFCs in public-facing interfaces.

### 8.5 Transparency and Reproducibility

- All model code, training data labels, and calibration parameters are stored in the project repository
- Per-contract SHAP explanations are available via the API (`vendor_shap_v52` table)
- The `model_calibration` table stores all fitted coefficients, intercepts, AUC metrics, and bootstrap CIs
- The calibration run ID (`CAL-v6.1-202603101709`) uniquely identifies the exact model version

---

## 9. References

1. **Elkan, C. & Noto, K.** (2008). Learning classifiers from only positive and unlabeled data. *Proceedings of the 14th ACM SIGKDD*, 213--220.
2. **Mitchell, M., Wu, S., Zaldivar, A., et al.** (2019). Model Cards for Model Reporting. *Proceedings of FAT\* 2019*, 220--229.
3. **OECD** (2023). *Government at a Glance 2023: Public Procurement Performance*. OECD Publishing.
4. **IMF** (2022). Assessing Vulnerabilities to Corruption in Public Procurement. *Working Paper WP/2022/094*.
5. **World Bank INT** (2019). *Warning Signs of Fraud and Corruption in Procurement*.
6. **Gallego, J., Rivero, G., & Martinez, J.** (2022). Preventing rather than punishing: An early warning model of malfeasance in public procurement. *International Journal of Forecasting*, 38(3), 826--843.
7. **Mahalanobis, P.C.** (1936). On the generalized distance in statistics. *Proceedings of the National Institute of Sciences of India*, 2(1), 49--55.
8. **Ledoit, O. & Wolf, M.** (2004). A well-conditioned estimator for large-dimensional covariance matrices. *Journal of Multivariate Analysis*, 88(2), 365--411.
9. **EU ARACHNE**. Risk scoring tool for EU structural funds. European Commission.

---

## Appendix A: Items Requiring Validation Before Publication

The following claims or metrics should be independently verified before this model card is published:

| Item | Current Status | Validation Needed |
|------|---------------|-------------------|
| Test AUC = 0.934 | Reported from calibration script | Independent reproduction on fresh vendor split |
| Temporal feature leakage impact | Acknowledged but unquantified | Point-in-time feature experiment |
| Label noise estimate (30--50%) | Heuristic based on fraud window analysis | Contract-level fraud scoping study |
| True prospective AUC estimate (0.80--0.90) | Informal estimate | Prospective holdout on 2024--2025 data |
| Structural FP list completeness | 52 vendors flagged | Systematic review with sector experts |
| Per-sector model utility | 12 sectors, some with <300 training positives | Power analysis for small-sector models |
| PU c = 0.50 floor clamp justification | Conservative choice | Sensitivity analysis on c values [0.30, 0.70] |
| Bootstrap CI coverage | 1,000 resamples | Empirical coverage probability check |

---

*This model card was generated on March 13, 2026. Risk scores are statistical indicators measuring similarity to documented corruption patterns. They do not constitute proof of wrongdoing and must not be used as the sole basis for any administrative, legal, or investigative action.*
