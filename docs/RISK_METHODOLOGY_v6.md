# Risk Scoring Methodology v6.0 — Quick Reference

**Active model** · Run ID: `CAL-v6.1-202603131522` · 3,051,294 contracts · 2002-2025
> Full details: see `docs/RISK_METHODOLOGY_v6_full.md` (not auto-loaded)

---

## Risk Levels & Thresholds (v6.2 OECD-calibrated)

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.60 | 266,048 | 8.7% | Immediate investigation |
| **High** | >= 0.40 | 110,163 | 3.6% | Priority review |
| **Medium** | >= 0.15 | 564,758 | 18.5% | Watch list |
| **Low** | < 0.15 | 2,110,325 | 69.2% | Standard monitoring |

**HR: 12.33%** ✓ OECD 2-15% compliant · Train AUC: 0.858 · Test AUC: 0.861 (vendor-stratified)

---

## Model Architecture

- **16 z-score features** (normalized against sector-year baselines)
- **13 models**: 1 global + 12 per-sector logistic regressions
- **PU-learning correction** (Elkan & Noto 2008), c = 0.4517
- **Hyperparams**: C=0.1844, l1_ratio=0.8659 (Optuna TPE, 150 trials, near-L1)
- **Ground truth**: ~390 cases · ~725 vendors · ~320K contracts · all 12 sectors
- **Split**: vendor-stratified 70/30 (no vendor in both train and test)

---

## Global Coefficients

| Feature | Coef | Interpretation |
|---------|------|----------------|
| price_volatility | +1.38 | Vendor contract-size variance vs sector norm |
| vendor_concentration | +0.72 | Vendor value share within sector |
| price_ratio | +0.39 | Contract amount / sector median |
| institution_diversity | -0.43 | Distinct institutions served (protective) |
| network_member_count | +0.23 | Co-contracting network size |
| direct_award | +0.13 | Non-competitive procedure |
| same_day_count | +0.11 | Splitting signal |
| ad_period_days | +0.08 | Days publication → award |
| win_rate | 0 | Zeroed (sign constraint: confound) |
| single_bid | 0 | Zeroed (sign constraint: labeling artifact) |
| sector_spread | 0 | Zeroed (sign constraint: labeling artifact) |
| co_bid_rate | 0 | Regularized to zero |
| price_hyp_confidence | 0 | Regularized to zero |

**Intercept**: -2.1653 · **Score formula**: `min(sigmoid(intercept + β·z) / 0.4517, 1.0)`

---

## Score Interpretation

> Scores are **risk indicators** measuring similarity to documented corruption patterns — NOT calibrated corruption probabilities. A score of 0.60 means the contract resembles known corruption cases, not that it has a 60% chance of being corrupt. Use for investigation triage only.

---

## Key Limitations (summary)

| Limitation | Impact | Fixable? |
|-----------|--------|----------|
| Temporal feature leakage (C1 fixed via vendor_rolling_stats) | AUC was inflated; now ~0.86 | ✓ Fixed |
| Label noise (30-50% of positives) | Model learns vendor profiles, not corruption per se | Partial |
| Execution-phase fraud invisible | Infrastructure/construction underscored | Partial |
| Contract size bias | 87.5% HR for >1B MXN contracts | Partial |
| New vendor blind spot | 2.9% HR for 2022+ vendors | Ghost companion heuristic added |
| Sector disparity | Infraestructura 7.2%, Agricultura 17.0% | Partial |

Full limitation analysis: `docs/RISK_METHODOLOGY_v6_full.md`

---

## DB Columns

| Column | Description |
|--------|-------------|
| `risk_score` | Active v6.0 score |
| `risk_score_v5` | Preserved v5.1 scores |
| `risk_score_v4` | Preserved v4.0 scores |
| `risk_score_v3` | Preserved v3.3 scores |
| `risk_level` | critical/high/medium/low |
| `risk_confidence_lower/upper` | 95% CI bounds |
| `risk_model_version` | 'v6.0' |

---

## Pipeline

```bash
cd backend
python -m scripts.compute_z_features       # ~45min on 3.1M
python -m scripts.calibrate_risk_model_v6_enhanced --force-C 0.1844 --force-l1-ratio 0.8659
python scripts/_score_v6_now.py
python -m scripts.precompute_stats
```

*Scores are statistical risk indicators. High score ≠ proof of wrongdoing.*
