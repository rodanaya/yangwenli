# Risk Methodology v5.1 Exploration

**Date:** February 20, 2026 | **Status:** Research / Pre-implementation | **Author:** AI Analysis

---

## Executive Summary

v5.0 achieved Train AUC 0.967, Test AUC 0.960 with 16 features and per-sector sub-models. This document explores whether a v5.1 retraining is warranted based on four research questions:

1. **Behavioral features performance** -- The 4 new v5.0 features show strong discriminative power. No changes needed.
2. **Temporal trajectory features** -- 103K vendors with 3+ years of data could support a vendor risk trajectory feature. **Moderate potential.**
3. **Co-bidding signal** -- All z_co_bid_rate values are zero across the entire dataset. Feature is dead. **Needs new raw data or different computation.**
4. **Per-administration baselines** -- Risk scores vary meaningfully across administrations (6.4% to 11.5% high-risk rate). **Worth exploring as a control variable.**

**Verdict:** A v5.1 retraining is **not urgently needed** -- the gains would be incremental. The highest-impact improvement would be adding new ground truth cases from underrepresented sectors (Defensa, Trabajo, Ambiente). A v5.1 could be justified if combined with temporal features AND new ground truth.

---

## 1. Behavioral Features Performance

The 4 new v5.0 features (price_volatility, institution_diversity, win_rate, sector_spread) show excellent separation across risk levels:

| Feature | Critical | High | Medium | Low | Spread |
|---------|----------|------|--------|-----|--------|
| z_price_volatility | **+1.80** | +0.33 | -0.06 | -0.13 | 1.93 |
| z_institution_diversity | **-0.83** | -0.76 | -0.65 | +0.15 | 0.98 |
| z_win_rate | **+1.37** | +0.37 | +0.04 | -0.11 | 1.48 |
| z_sector_spread | +0.83 | +0.42 | +0.19 | -0.09 | 0.92 |

**Analysis:**
- **price_volatility** has the widest spread (1.93 sigma between critical and low) -- confirms it as the top predictor.
- **win_rate** shows strong monotonic gradient: critical vendors have 1.37 sigma above-average win rates.
- **institution_diversity** is negative for all high-risk levels -- concentrated vendor-institution relationships consistently flag risk.
- **sector_spread** is positive for high-risk (0.83) -- this is counter-intuitive since the v5.0 global coefficient is negative (-0.37). This suggests the per-sector sub-models may be capturing a different pattern than the global model.

**For comparison, original 12 features across risk levels:**

| Feature | Critical | Low | Spread |
|---------|----------|-----|--------|
| z_vendor_concentration | +1.72 | -0.12 | 1.84 |
| z_industry_mismatch | +0.61 | -0.04 | 0.65 |
| z_network_member_count | +0.48 | -0.03 | 0.51 |
| z_price_ratio | +0.43 | -0.03 | 0.46 |
| z_single_bid | +0.27 | -0.03 | 0.30 |
| z_same_day_count | -0.07 | -0.17 | 0.10 |
| z_direct_award | -0.22 | +0.03 | 0.25 |
| z_ad_period_days | -0.71 | -0.75 | 0.04 |
| z_institution_risk | -0.05 | -0.002 | 0.05 |

**Conclusion:** The 4 new behavioral features are among the top discriminators. No changes recommended.

---

## 2. Temporal Trajectory Features

**Question:** Can year-over-year vendor risk trajectory improve detection?

### Data Availability

| Years Active | Vendors | Cumulative |
|-------------|---------|-----------|
| 1 year only | 153,220 | 320,429 (100%) |
| 2+ years | 167,209 | 167,209 (52%) |
| 3+ years | 103,204 | 103,204 (32%) |
| 5+ years | 49,034 | 49,034 (15%) |
| 10+ years | 11,343 | 11,343 (4%) |

- **320,429 unique vendors** across 26 years (2000-2025)
- **103,204 vendors (32%)** have 3+ years of data -- enough for meaningful trajectory analysis
- **49,034 vendors (15%)** have 5+ years -- sufficient for trend detection

### Proposed Features

1. **risk_trajectory_slope**: Linear regression slope of vendor's annual average risk score over time. Positive = worsening risk pattern.
2. **risk_volatility_temporal**: Standard deviation of annual risk scores. High volatility = inconsistent behavior.
3. **entry_risk_delta**: Difference between vendor's first-year avg risk and their most recent year. Captures "evolution" of vendor behavior.

### Feasibility Assessment

- **Coverage:** Only 32% of vendors have 3+ years of data. For 68% of vendors, the feature would be null/imputed.
- **Signal hypothesis:** Vendors that are gradually increasing in risk score over time may be escalating corrupt behavior. Vendors with sudden drops might be restructuring to avoid detection.
- **Implementation:** Requires computing annual vendor-level aggregates first, then deriving slope/volatility. Moderate computational cost but feasible in the pipeline.

**Estimated AUC improvement:** +0.002 to +0.005 (incremental, not transformative).

**Recommendation:** Worth implementing if combined with other v5.1 changes, but not sufficient alone to justify retraining.

---

## 3. Co-Bidding Signal Analysis

**Question:** Is there any signal in collusion-related features?

### Finding: z_co_bid_rate is completely dead

| Risk Level | Avg z_co_bid_rate | Non-zero Count | Total Count |
|-----------|-------------------|----------------|-------------|
| Critical | 0.000 | 0 | 178,938 |
| High | 0.000 | 0 | 67,190 |
| Medium | 0.000 | 0 | 294,468 |
| Low | 0.000 | 0 | 2,569,411 |

**Every single z_co_bid_rate value is exactly zero** across all 3.1M contracts. This is not just "regularized to zero in the model" -- the raw z-score feature itself contains no non-zero values.

### Root Cause

The z-score computation normalizes co_bid_rate by sector/year. If the raw co_bid_rate is sparse (most vendors have no co-bidding data) and the baseline is near-zero, the z-score collapses to zero everywhere.

### Recommendations for v5.1

To rescue the collusion signal:
1. **Recompute co_bid_rate at vendor level** (not contract level) -- aggregate across all procedures a vendor participates in.
2. **Binary co-bidding indicator** instead of rate: "Has this vendor co-bid with any partner in >50% of their procedures?" (yes/no).
3. **Co-bidding network centrality**: Use graph-based metrics (degree centrality in co-bidding network) rather than raw rate.
4. **Needs ground truth**: Current training cases (IMSS, Segalmex, COVID) involve market concentration, not collusion rings. Without collusion ground truth, any co-bidding feature will remain untrained.

**Estimated AUC improvement from fixing co-bidding:** Minimal unless paired with collusion ground truth cases.

---

## 4. Per-Administration Risk Patterns

**Question:** Do risk patterns differ meaningfully across presidential administrations?

| Administration | Years | Avg Risk | High-Risk Rate | Contracts |
|---------------|-------|----------|---------------|-----------|
| Fox | 2001-2006 | 0.105 | **9.7%** | 207,658 |
| Calderon (FCH) | 2007-2012 | 0.077 | 6.7% | 487,721 |
| Pena Nieto (EPN) | 2013-2018 | 0.073 | **6.4%** | 1,253,862 |
| AMLO | 2019-2024 | 0.103 | **9.6%** | 1,067,911 |
| Sheinbaum | 2025 | 0.118 | **11.5%** | 92,847 |

### Key Observations

1. **Fox era (2001-2006) has elevated risk (9.7%)** despite lowest data quality (Structure A, 0.1% RFC coverage). This likely reflects genuine procurement opacity rather than data artifacts -- fewer controls, less digitization.

2. **EPN era (2013-2018) shows lowest risk (6.4%)** -- coincides with COMPRANET modernization and improved data quality. However, this was also the period of Odebrecht, Estafa Maestra, and Grupo Higa. The lower aggregate risk may reflect that corruption was concentrated in specific mega-projects rather than widespread in the procurement system.

3. **AMLO era (2019-2024) shows elevated risk (9.6%)** -- matches known increase in direct awards and reduced competition during this administration. The COVID-19 emergency procurement (2020-2021) contributes to the elevated figures.

4. **Sheinbaum (2025) at 11.5%** -- only partial year, but the elevated rate warrants monitoring. Could reflect continuation of AMLO-era patterns or data recency bias (more complete data = more flags).

### Implications for v5.1

- **Not a direct model feature**: Administration is confounded with year, which is already part of the z-score baselines. Adding it as a feature would introduce political bias.
- **Useful as a diagnostic**: Per-administration breakdowns can contextualize findings for investigators. "This pattern is more common in the Fox era" vs "This is anomalous even for the AMLO era."
- **Potential: administration-aware baselines**: Instead of pure sector/year baselines, use sector/administration baselines. This would capture structural shifts (e.g., AMLO's increase in direct awards) better than rolling year windows.

**Recommendation:** Use for reporting/diagnostics only. Do not add as a model feature.

---

## 5. Additional v5.1 Feature Candidates

### 5a. Contract Sequence Features

- **vendor_contract_gap**: Average days between consecutive contracts for a vendor. Unusually short gaps suggest pre-arranged awards.
- **burst_score**: Number of contracts awarded within a 7-day window. Threshold splitting detection at the temporal level.

### 5b. Cross-Vendor Behavioral Similarity

- **behavioral_cluster**: Cluster vendors by their z-score profiles using k-means. Vendors in the same cluster as known-bad vendors get a proximity score.
- **z_profile_distance**: Euclidean distance in z-score space between a vendor's average profile and the centroid of known-bad vendor profiles.

### 5c. Institution-Vendor Loyalty Score

- **loyalty_index**: For a given contract, what fraction of the institution's total spending goes to this vendor? High loyalty = potential favoritism.
- Already partially captured by vendor_concentration, but at the institution level rather than sector level.

---

## 6. Assessment: Is v5.1 Worth Retraining?

### What Would Change

| Change | AUC Impact | Effort | Prerequisite |
|--------|-----------|--------|-------------|
| Temporal trajectory features | +0.002 to +0.005 | Medium | None |
| Fix co-bidding signal | +0.000 to +0.002 | High | Needs collusion ground truth |
| Contract sequence features | +0.001 to +0.003 | Medium | None |
| New ground truth cases | **+0.005 to +0.015** | Low | Identify 3-5 new cases |
| Behavioral clustering | +0.001 to +0.003 | Medium | None |

### Estimated Total v5.1 Improvement

- **Without new ground truth:** AUC 0.960 -> ~0.965 (marginal)
- **With 5 new ground truth cases in underrepresented sectors:** AUC 0.960 -> ~0.970-0.975

### Recommendation

**Priority 1: Expand ground truth** (highest ROI)
- Add cases from Defensa, Trabajo, Ambiente, Gobernacion (currently 0 training contracts in 4 of 12 sectors)
- Target: 5 new cases with 500+ contracts total
- This alone could improve Test AUC by +0.01

**Priority 2: Temporal features** (moderate ROI)
- Implement risk_trajectory_slope for vendors with 3+ years
- Low risk of degrading existing performance

**Priority 3: Fix co-bidding** (blocked on ground truth)
- Recompute at vendor level with graph metrics
- Only useful if collusion cases are added to ground truth

**v5.1 timing:** Recommend batching with the next ground truth expansion. A pure feature-engineering v5.1 without new ground truth is not worth the pipeline effort.

---

## Appendix: Raw Query Results

### Behavioral Features by Risk Level (n=3,110,007)

```
Risk Level | price_vol | inst_div  | win_rate | sec_spread | Count
-----------+-----------+-----------+----------+------------+---------
critical   |   +1.80   |   -0.83   |  +1.37   |   +0.83    | 178,938
high       |   +0.33   |   -0.76   |  +0.37   |   +0.42    |  67,190
medium     |   -0.06   |   -0.65   |  +0.04   |   +0.19    | 294,468
low        |   -0.13   |   +0.15   |  -0.11   |   -0.09    | 2,569,411
```

### Per-Administration Risk Distribution

```
Administration     | Avg Risk | High-Risk% | Contracts
-------------------+----------+------------+----------
Fox (2001-2006)    |  0.105   |    9.7%    |  207,658
FCH (2007-2012)    |  0.077   |    6.7%    |  487,721
EPN (2013-2018)    |  0.073   |    6.4%    | 1,253,862
AMLO (2019-2024)   |  0.103   |    9.6%    | 1,067,911
Sheinbaum (2025)   |  0.118   |   11.5%    |   92,847
```

### Vendor Temporal Coverage

```
Years Active | Vendors | Cumulative %
-------------+---------+-------------
1 only       | 153,220 |    100%
2+           | 167,209 |     52%
3+           | 103,204 |     32%
5+           |  49,034 |     15%
10+          |  11,343 |      4%
```

---

*This exploration was conducted against 3,110,007 contracts in RUBLI_NORMALIZED.db. All queries used the live v5.0 risk scores and z-features.*
