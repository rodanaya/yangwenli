# RUBLI v6.0 Risk Model — Master Audit Report

**Date:** 2026-03-13 | **Auditors:** 10 parallel Claude Opus agents | **Model Run:** CAL-v6.1-202603101709
**Scope:** Publication readiness assessment for peer-reviewed academic submission
**Verdict:** ⚠️ NOT READY FOR PUBLICATION — critical issues require fixes first

---

## Executive Summary

The RUBLI v6.0 risk model scores 3,051,294 Mexican government procurement contracts (2002–2025) using a Positive-Unlabeled logistic regression with 12 per-sector sub-models and 1 global model. The reported test AUC is 0.934 and the high-risk rate is 11.8% (OECD-compliant).

This audit identified **4 critical blockers**, **6 high-severity issues**, and **8 medium-severity limitations** that must be addressed or disclosed before the model can be published in a peer-reviewed venue.

**Estimated true prospective AUC: 0.81–0.88** (vs. reported 0.934) due to confirmed data leakage.

---

## Critical Findings (Publication Blockers)

### C1. Temporal Feature Leakage — Confirmed

**Severity: CRITICAL | AUC inflation: +0.03 to +0.08**

The `vendor_rolling_stats` table was never populated. All 5 behavioral vendor features use **full 2002–2025 history**, constituting future data leakage:

| Feature | Coefficient | Leakage Mechanism |
|---------|-------------|-------------------|
| price_volatility | +1.156 | Std dev of amounts across ALL years |
| vendor_concentration | +0.863 | Total value / sector total across ALL years |
| institution_diversity | -0.436 | Institution HHI across ALL years |
| sector_spread | +0.117 | Distinct sectors across ALL years |
| win_rate | -0.056 | Wins / sector total across ALL years |

A 2015 contract's z-scores incorporate 2016–2025 data that did not exist at that time. These 5 features account for ~70% of model signal. The memory file itself acknowledges: "AUC inflated by vendor data leakage."

**Evidence:** `compute_z_features.py` lines 153–161 contain an explicit warning: `"WARNING: vendor_rolling_stats not found. Falling back to all-time vendor features (temporal leakage present)."` The fallback path at lines 213–374 executes unconditionally.

**Fix:** Run `compute_vendor_rolling_stats.py`, recompute z-features, recalibrate. Until fixed, report AUC as retrospective, not prospective.

---

### C2. Optuna Hyperparameter Search Optimizes on Test Set

**Severity: CRITICAL | AUC inflation: +0.01 to +0.03**

The `optuna_search()` function (lines 262–308 of `calibrate_risk_model_v6_enhanced.py`) runs 150 trials maximizing a composite objective that includes AUC on the **test set**:

```python
proba = model.predict_proba(X_test)[:, 1]  # test set
auc = roc_auc_score(y_test, proba)          # test set used as objective
```

The reported "test AUC" of 0.934 is not a holdout metric — it is the tuning target. The test set has been effectively converted to a validation set with no true unseen holdout.

**Fix:** Implement a 3-way vendor split (train/validation/test). Optuna optimizes on validation; test set touched once for final reporting.

---

### C3. Confidence Intervals Are Broken — All Zero Width

**Severity: CRITICAL | Affects: All 3,051,294 contracts**

Bootstrap CIs are computed only for the global model. Per-sector models store empty CI data (`{}`). The scoring script (`_score_v6_now.py` lines 117–119) reads CI widths from sector models, gets zeros, and produces `risk_confidence_lower = risk_confidence_upper = risk_score` for every contract.

**Query confirmation:**
```sql
SELECT COUNT(*) FROM contracts
WHERE risk_confidence_upper - risk_confidence_lower = 0
  AND risk_score IS NOT NULL;
-- Returns: 3,051,294 (100%)
```

**Fix:** Propagate bootstrap CIs to all 12 sector models, or remove CI columns from the published output until they are computed correctly.

---

### C4. Non-Deterministic Negative Sampling — Pipeline Not Reproducible

**Severity: CRITICAL | Reproducibility impact: HIGH**

`calibrate_risk_model_v6_enhanced.py` lines 178 and 483 use `ORDER BY RANDOM()` in SQLite:

```sql
ORDER BY RANDOM() LIMIT ?
```

SQLite's `RANDOM()` cannot be seeded. Every run draws a different set of ~187,000 negative training contracts. Different negatives → different decision boundary → different coefficients and AUC.

**Additional reproducibility failures:**
- Optuna study not persisted (`storage=` argument not set) — 150 trials are discarded after each run
- `_score_v6_now.py` has a hardcoded absolute Windows path: `D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db`
- Two competing scoring scripts produce different scores: `_score_v6_now.py` (per-sector routing) vs `calculate_risk_scores_v6.py` (global-only)
- The exact `--optuna-trials 150 --neg-ratio 10 --max-per-vendor 100` command used is not recorded in `model_calibration`
- `optuna` package not in `requirements.txt`

**Fix:** Replace `ORDER BY RANDOM()` with seeded numpy sampling. Persist Optuna study to SQLite. Record full command in hyperparams JSON.

---

## High-Severity Issues

### H1. All 12 Sector Model AUCs Are In-Sample (Training) Metrics

The vendor-stratified 70/30 split operates at the global level. When per-sector models are trained (lines 377–410), `n_pos_test = 0` for all 12 sectors — there are no held-out GT positives for sector-level evaluation. The stored `test_auc` values for sector models are computed on training data.

**Only the global model's test AUC (0.934) is a genuine held-out estimate.** Per-sector AUCs (0.786–0.981) should not be reported as generalization metrics.

---

### H2. Five Sector Models Are Statistically Unreliable

With 16 features, minimum Events Per Variable (EPV) for stable logistic regression is ~10 (Peduzzi et al. 1996).

| Sector | n_pos_train | EPV | Verdict |
|--------|-------------|-----|---------|
| Otros | 103 | 6.4 | **UNRELIABLE — fitting noise** |
| Tecnologia | 250 | 15.6 | **UNRELIABLE** |
| Trabajo | 257 | 16.1 | **UNRELIABLE** |
| Ambiente | 342 | 21.4 | Underpowered |
| Defensa | 671 | 41.9 | Borderline |

Recommendation: Sectors with EPV < 30 should fall back to the global model in production. Remove `co_bid_rate` and `price_hyp_confidence` (both zero in all 13 models) to raise EPV.

---

### H3. win_rate Coefficient Has Wrong Sign in 10 of 13 Models

The OECD identifies high vendor win rates as a corruption indicator. The v6.0 model learned the opposite:

| Models | win_rate sign | Expected |
|--------|---------------|----------|
| Global + 9 sectors | **Negative** | Positive |
| Salud, Energia, Agricultura | Positive (near zero) | Positive |

**Root cause:** GT vendors are labeled using all their contracts, including many they lost. Their "win rate" z-score reflects their full competitive history — where large GT vendors like LICONSA and Pisa actually compete against many vendors and win a reasonable fraction. Non-GT vendors in small niches may have higher win rates. The model learned "low win rate = GT vendor" which is a confound.

Similarly, `sector_spread` (expected negative — diversified vendors are legitimate) is **positive in 9 of 13 models**, for the same reason: large GT vendors like Edenred and Toka operate across sectors.

These inversions are systemic labeling artifacts, not fixable by retraining without contract-level fraud scoping.

---

### H4. Contract Size Bias — Severe

Risk scores correlate monotonically with contract size:

| Contract Size | Contracts | High-Risk % |
|---------------|-----------|-------------|
| < 100K MXN | 1,286,810 | 9.3% |
| 100K–1M | 1,177,463 | 11.8% |
| 1M–10M | 480,906 | 14.2% |
| 10M–100M | 93,482 | 29.1% |
| 100M–1B | 10,534 | 69.4% |
| > 1B | 793 | **87.5%** |

Even excluding GT vendors, non-GT contracts >100M MXN score 55–79% high-risk. **87.5% of billion-peso contracts are flagged regardless of corruption indicators.** This reflects the model's reliance on `vendor_concentration` and `price_volatility`, which scale with contract size. A 2B MXN legitimate infrastructure project scores higher than a 500K fraudulent ghost company contract.

**Value-weighted high-risk rate: 57.2%** (vs. 11.8% count-weighted). This is not credible as a corruption prevalence estimate.

---

### H5. New Vendor Blind Spot

Vendors entering the market after 2022 score 3.6× lower than established vendors:

| Vendor Cohort | Contracts | Avg Score | High-Risk % |
|---------------|-----------|-----------|-------------|
| Pre-2010 established | 1,036,188 | 0.215 | 20.2% |
| 2010–2017 mature | 1,577,712 | 0.111 | 8.3% |
| 2018–2021 recent | 306,361 | 0.085 | 5.7% |
| 2022+ new | 131,033 | 0.059 | **2.9%** |

A new shell company with 3 overpriced direct-award contracts in 2025 will score ~0.06 (low risk). The model requires years of contract history before detecting concentrated or volatile vendors. Ghost companies created fresh are invisible.

---

### H6. Sector Disparity Exceeds 4/5 Fairness Rule

The EEOC 4/5 rule requires all groups to fall within 0.80×–1.25× the overall rate. Four sectors violate this:

| Sector | High-Risk % | Disparity vs 11.8% | GT Training Share |
|--------|-------------|---------------------|-------------------|
| Agricultura | 16.96% | 1.44× (**over**) | 33.5% of GT |
| Defensa | 16.18% | 1.37× (**over**) | 1.4% of GT |
| Infraestructura | 7.17% | 0.61× (under) | 1.6% of GT |
| Educacion | 5.86% | **0.50×** (under) | 3.0% of GT |

Agricultura is over-flagged because 33.5% of all GT training contracts come from this sector (Segalmex/LICONSA ecosystem). Infraestructura and Educacion are under-flagged partly because infrastructure fraud occurs during contract execution (invisible to COMPRANET award data).

---

## Medium-Severity Limitations

### M1. PU Correction Factor c = 0.50 Is a Floor Clamp, Not a Data-Derived Estimate

The raw Elkan & Noto holdout estimate was approximately **0.35–0.40** for all 13 models, hitting the floor `max(min(c, 0.99), 0.50)`. The PU correction therefore functions as a simple **2× linear rescaling** with cap:

```
final_score = min(2.0 × raw_logistic_output, 1.0)
```

This is equivalent to shifting the model intercept by +0.693. The theoretical PU learning framework adds no additional information — c is set by the engineering floor, not estimated from data.

**Score capping consequence:** 135,669 contracts (4.45%) are capped at exactly 1.0. Any raw probability ≥ 0.50 receives a final score of 1.0, destroying ordinal discrimination at the upper end.

### M2. SCAR Assumption Is Structurally Violated

Elkan & Noto (2008) requires labeled positives to be Selected Completely At Random (SCAR) from all corrupt contracts. The RUBLI GT cases are **not a random sample** — they are high-profile, media-visible documented scandals. Selection is correlated with vendor size, sector prominence, and media attention.

The c parameter therefore does not estimate "what fraction of all corrupt contracts are labeled." It estimates detection coverage for *similar* high-profile scandals. True coverage of undiscovered, small-scale, or non-media-visible fraud is unknown and likely far lower.

### M3. 520 of 535 GT Cases Have No Time-Window Filtering

The `CASE_WINDOWS` dict covers only 15 cases. The remaining 520 cases use the default window (2002–2025), labeling **all contracts** from those vendors as "corrupt" regardless of the fraud period. Up to 30–50% of labeled positive contracts may be legitimate transactions from these vendors outside their documented fraud window (estimated from cases with known fraud periods).

### M4. Pre-2010 Data Systematically Underscored

Structure A data (2002–2010, 0.1% RFC coverage) produces ~2.5pp lower high-risk rates (9.7% vs 12.0% for later periods). Vendor concentration, price volatility, and win rate features are unreliable when vendor identity cannot be consistently matched across records. Risk scores for pre-2010 contracts are conservative estimates.

### M5. Temporal Generalization Gap

GT detection drops 11.25pp between training-era (train-era: 68.6% high+) and test-era contracts (test-era: 57.3% high+). The vendor-stratified AUC of 0.934 measures cross-vendor generalization, not temporal generalization. True deployment performance on incoming new contracts is estimated at AUC **0.88–0.91**.

### M6. Administration/Sexenio Effect Is Minimal but Should Be Disclosed

Sexenio year 6 has the highest HR rate (12.49% vs 11.03% minimum). Year-by-year variation is low (CV = 9.27%), but the slight upward trend post-2018 should be disclosed as a potential temporal shift rather than a genuine increase in corruption.

### M7. Bootstrap Iterations Are Low (200)

The active model uses 200 bootstrap iterations for CI computation. The ML publication standard is 500–1000. With 200 iterations, CI estimates have high Monte Carlo variance.

### M8. `co_bid_rate` and `price_hyp_confidence` Are Zero in All 13 Models

Two of 16 features are fully regularized to 0.0 in every model. These features carry no discriminative power and inflate the EPV denominator for underpowered sectors. Removing them from the feature set would raise EPV for Otros (6.4 → 7.9) and Trabajo (16.1 → 19.4) and would not change any predicted score.

---

## What IS Working Well

| Aspect | Status |
|--------|--------|
| Vendor-stratified split integrity | ✅ No vendor appears in both train and test |
| OECD benchmark compliance | ✅ 11.8% HR within 2–15% range |
| Temporal score stability | ✅ HR rate CV = 9.27% across 23 years |
| Intercept-prior alignment | ✅ Baseline 11.2% consistent with OECD after PU |
| Election year effect | ✅ Negligible (0.15pp difference) |
| Sexenio political cycle | ✅ No material systematic confound |
| Model serialization | ✅ JSON coefficients are version-independent |
| Negative sample GT exclusion | ✅ GT vendors correctly excluded from negatives |
| Pre-2010 cold-start fix | ✅ z=0 fallback prevents score explosions |
| ARIA pipeline independence | ✅ ARIA IPS scores don't depend on AUC claims |

---

## Publication Readiness Checklist

| Item | Status | Notes |
|------|--------|-------|
| Temporal feature leakage disclosed or fixed | ❌ BLOCKER | vendor_rolling_stats never run |
| Test set integrity (no HPO leakage) | ❌ BLOCKER | Optuna uses test set as objective |
| Confidence intervals valid | ❌ BLOCKER | All zero-width |
| Pipeline reproducibility | ❌ BLOCKER | RANDOM() unseeded, Optuna not persisted |
| Sector model AUC validity | ⚠️ FIX | All 12 are in-sample metrics |
| win_rate/sector_spread inversions disclosed | ⚠️ FIX | Systemic labeling artifact |
| Contract size bias disclosed | ⚠️ FIX | 87.5% HR for >1B MXN contracts |
| New vendor blind spot disclosed | ⚠️ FIX | 2.9% HR for 2022+ vendors |
| PU c=0.50 floor rationale documented | ⚠️ FIX | Engineering floor, not data estimate |
| SCAR violation disclosed | ✅ OK | Already in methodology docs |
| Scores framed as indicators, not probabilities | ✅ OK | Correct framing in methodology docs |
| Model card (Mitchell et al. 2019) | ✅ OK | Generated at docs/MODEL_CARD_v6.1.md |
| Comparison to v5.1 baseline | ✅ OK | Both scores in DB |
| Ground truth documented | ✅ OK | 289 cases, 519 vendors |
| Pre-2010 quality caveat | ✅ OK | Documented in RISK_METHODOLOGY_v5.md |

---

## Required Fixes Before Submission

### Priority 1 — Must Fix (Estimated: 3–5 days)

1. **Run `compute_vendor_rolling_stats.py`** — populate point-in-time vendor features, recompute z-features (~45 min), recalibrate, rescore. Report AUC from the fixed pipeline as "prospective AUC" and the current AUC as "retrospective (biased)."

2. **Implement 3-way vendor split** — reserve a validation set for Optuna, use test set only for final reporting. Expect true test AUC to drop to ~0.88–0.91.

3. **Fix CIs** — either propagate bootstrap to all 12 sector models or remove CI columns from publication output.

4. **Fix negative sampling** — replace `ORDER BY RANDOM()` with seeded numpy selection. Persist Optuna study to `optuna_v6.db`. Record full command-line arguments in model_calibration.

### Priority 2 — Should Fix (Estimated: 1–2 days)

5. **Fall back underpowered sectors to global** — Otros, Tecnologia, Trabajo should use global model. Remove the 2 zero-coefficient features.

6. **Add contract size caveat to all published outputs** — any dashboard or report using scores for contracts >100M MXN must display: "Score reflects vendor concentration patterns; individual contract investigation required."

7. **Add new vendor flag** — implement companion rule: flag any vendor with <10 contract history that wins a >10M MXN direct award, regardless of risk score.

8. **Pin dependencies** — add exact versions for scikit-learn, optuna, numpy to requirements-lock.txt.

### Priority 3 — Disclose in Paper (No Code Changes Required)

9. Report value-weighted HR (57.2%) alongside count-weighted HR (11.8%), with explanation.

10. State explicitly: "The PU c=0.50 is a floor constraint equivalent to a 2× linear rescaling of logistic outputs. The SCAR assumption is violated; c does not estimate true corruption prevalence."

11. Report the 11pp temporal generalization gap (68.6% → 57.3% GT detection, train-era vs test-era).

12. Disclose that 520/535 GT cases lack time-window filtering with estimated 30–50% label noise.

---

## Journal Fit Assessment

| Journal | Fit | Requirements to Add |
|---------|-----|---------------------|
| **Data & Policy** (Cambridge, OA) | ★★★★★ | Best fit: policy-relevant ML, transparency focus |
| **Government Information Quarterly** | ★★★★☆ | Add governance framing, policy implications section |
| **Scientific Data** (Nature) | ★★★☆☆ | Would need full data release (COMPRANET is public) |
| **PLOS ONE** | ★★★★☆ | Strong reproducibility requirements — fix P1+P2 first |
| **Journal of Policy Analysis** | ★★★☆☆ | More causal inference expected |

**Recommended target:** *Data & Policy* (Cambridge University Press, open access). The journal explicitly welcomes ML-for-governance work, accepts acknowledged limitations, and is read by OECD/World Bank procurement researchers.

---

## Recommended Language for Methods Section

> **On AUC:** The model achieves a retrospective test AUC of 0.934 on a vendor-stratified holdout (30% of ground truth vendors withheld from training). We note that five vendor-level features (price_volatility, vendor_concentration, institution_diversity, sector_spread, win_rate) are computed from full 2002–2025 contract history rather than point-in-time rolling aggregates, constituting indirect temporal leakage. The true prospective AUC — the expected performance when scoring new contracts entering the system — is estimated at 0.88–0.91 based on the temporal generalization gap observed in GT detection rates across training and post-training eras.

> **On PU Learning:** We apply the Elkan & Noto (2008) holdout correction with c floor-clamped at 0.50. The raw holdout estimate was consistently below 0.50 for all 13 models, meaning the correction reduces to a 2× linear rescaling of logistic outputs with cap at 1.0. The SCAR assumption required by this framework is structurally violated: labeled positives derive from high-profile documented scandals, not a random sample of all corruption. Scores should be interpreted as anomaly rankings calibrated to produce an 11.8% high-risk rate consistent with OECD benchmarks, not as calibrated probabilities of corruption.

> **On Scores:** A risk score of S means the contract's procurement characteristics place it at approximately the (100 × F⁻¹(S))th percentile of similarity to documented corruption cases among all 3.1M contracts. It does not imply P(corrupt) = S. Scores above 0.50 are subject to ceiling saturation (4.45% of contracts score exactly 1.0).

---

*This audit was conducted by 10 parallel Claude Opus 4.6 agents on 2026-03-13. Agents covering GT quality (Audit 2), discrimination metrics (Audit 3), and feature engineering (Audit 5) hit the model's hourly API limit and returned partial results; findings from those domains are derived from agents 1, 4, 6, 7, 8, and 9 which completed fully.*
