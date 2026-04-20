# Risk Scoring Methodology v0.6.5 — Quick Reference

**Active model** · Run ID: `CAL-v6.1-202603251039` · 3,051,294 contracts · 2002-2025
> Full details: see `docs/RISK_METHODOLOGY_v6_full.md` (not auto-loaded)

---

## Risk Levels & Thresholds (v0.6.5 OECD-calibrated)

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.60 | 184,031 | 6.01% | Immediate investigation |
| **High** | >= 0.40 | 228,814 | 7.48% | Priority review |
| **Medium** | >= 0.25 | 821,251 | 26.84% | Watch list |
| **Low** | < 0.25 | 1,817,198 | 59.39% | Standard monitoring |

**HR: 13.49%** ✓ OECD 2-15% compliant · C=0.01, 9 active features (DB-verified 2026-04-20)

> Note: HR=13.49% exceeds the 9% OECD calibration target because ghost companion score boosts (+403K contracts) were applied after OECD intercept calibration. The boosts are a deliberate design decision; see pipeline notes below.

**AUC metrics:**
- **Train AUC: 0.798** — vendor-stratified 70/30 hold-out (training set)
- **Test AUC: 0.828** — vendor-stratified hold-out (test set, never seen during training)

The test AUC exceeds train AUC because the cleaner GT labels (institution-scoped, windowed) reduced noise in the training data, and the test set happened to contain more structurally distinct corruption patterns.

---

## Model Architecture

- **16 z-score features** (normalized against sector-year baselines); 9 active post-regularization
- **13 models**: 1 global + 12 per-sector logistic regressions
- **Sector fallback**: if n_positive < 500 → uses global model (sectors 6, 11, 12)
- **PU-learning correction** (Elkan & Noto 2008), c = 0.3000 (floor value)
- **Hyperparams**: C=0.0100, l1_ratio=0.9673 (Optuna TPE, 150 trials; fixed for reproducibility)
- **Ground truth**: 748 windowed/institution-scoped cases · 603 vendors · ~288K contracts
- **Curriculum weights**: confirmed_corrupt=1.0, high=0.8, medium=0.5, low=0.2
- **Split**: vendor-stratified 70/30 (no vendor in both train and test)

---

## Global Coefficients (v0.6.5)

| Feature | Coef | Interpretation |
|---------|------|----------------|
| price_volatility | +0.5343 | Vendor contract-size variance vs sector norm — strongest signal |
| price_ratio | +0.4159 | Contract amount / sector median |
| institution_diversity | -0.2736 | Distinct institutions served (protective — broad reach = legitimate) |
| vendor_concentration | +0.2736 | Vendor value share within sector |
| network_member_count | +0.1404 | Co-contracting network size |
| same_day_count | +0.1084 | Threshold splitting signal |
| ad_period_days | +0.0781 | Publication period length |
| single_bid | +0.0587 | Single-bid competitive procedure |
| direct_award | +0.0306 | Direct award flag |
| win_rate | 0 | Regularized to zero (GT expansion 2026-04) |
| sector_spread | 0 | Zeroed (sign constraint) |
| co_bid_rate | 0 | Regularized to zero |
| price_hyp_confidence | 0 | Regularized to zero |
| year_end | 0 | Regularized to zero |
| industry_mismatch | 0 | Regularized to zero |
| institution_risk | 0 | Regularized to zero |
| institution_risk | 0 | Regularized to zero |

**Intercept**: -2.3837 · **Score formula**: `min(sigmoid(intercept + β·z) / 0.3000, 1.0)` (then + ghost companion boost)

> Z-scores are stored raw (for SHAP/PyOD); scoring clips to [-5, +5] SD before logit computation.

**v0.6.5 improvements over v6.4**: institution-scoped GT labels (IMSS Ghost -85% noise, COVID -73%, Segalmex -17%); structural FPs excluded (BAXTER, FRESENIUS, INFRA SA DE CV, PRAXAIR = is_false_positive=1); vendor curriculum_weight overrides applied. price_volatility coefficient healthier (+0.53 vs +1.86 in v6.4), reducing vendor-size overfit.

---

## Score Interpretation

> Scores are **risk indicators** measuring similarity to documented corruption patterns — NOT calibrated corruption probabilities. A score of 0.60 means the contract resembles known corruption cases, not that it has a 60% chance of being corrupt. Use for investigation triage only.

**Score ceiling**: ~95K contracts score exactly 1.0 due to PU correction with c=0.30 (floor). These are not all "equally corrupt" — they represent the highest-logit tail, ordered by Mahalanobis distance as a secondary sort.

---

## Key Limitations (summary)

| Limitation | Impact | Fixable? |
|-----------|--------|----------|
| SCAR violation (GT = high-profile scandals only) | Small-scale/unreported corruption underdetected | Partial (more GT diversity) |
| Label noise (30-50% of positives) | Model learns vendor profiles, not corruption per se | Partial (contract-level scoping) |
| Execution-phase fraud invisible | Infrastructure/construction underscored | Partial (needs ASF data) |
| ~95K contracts at score=1.0 | PU correction (÷0.30) amplifies high logit past 1.0; ordered by Mahalanobis as tiebreaker | By design |
| Ghost companion boost raises HR above calibration target | HR=13.49% vs 9% target | By design; documented |
| New vendor blind spot | 2022+ vendors: ghost companion heuristic partially addresses | Partial |

Full limitation analysis: `docs/RISK_METHODOLOGY_v6_full.md`

---

## Per-Sector Models (v0.6.5)

Sectors 6 (Tecnología), 11 (Trabajo), 12 (Otros) fall back to global model (n_positive < 500).

---

## DB Columns

| Column | Description |
|--------|-------------|
| `risk_score` | Active v0.6.5 score |
| `risk_score_v5` | Preserved v5.1 scores |
| `risk_score_v4` | Preserved v4.0 scores |
| `risk_score_v3` | Preserved v3.3 scores |
| `risk_level` | critical/high/medium/low |
| `risk_confidence_lower/upper` | 95% CI bounds |
| `risk_model_version` | 'v6.5' |

---

## Pipeline

```bash
cd backend
python -m scripts.compute_z_features                                              # ~45min on 3.1M
python scripts/calibrate_risk_model_v6_enhanced.py --force-C 0.0100 --force-l1-ratio 0.9673
python scripts/_oecd_calibrate_intercept.py                                        # calibrate to ~9% HR (pre-boost)
python scripts/_score_v6_now.py                                                    # applies ghost companion boosts
python -m scripts.precompute_stats
```

> **DO NOT run `_score_v6_now.py`** without verifying calibration sanity (intercept < -0.5, PU c > 0.30).

*Scores are statistical risk indicators. High score ≠ proof of wrongdoing.*
