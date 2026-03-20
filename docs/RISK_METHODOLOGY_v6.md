# Risk Scoring Methodology v6.4 — Quick Reference

**Active model** · Run ID: `CAL-v6.1-202603191034` · 3,051,294 contracts · 2002-2025
> Full details: see `docs/RISK_METHODOLOGY_v6_full.md` (not auto-loaded)

---

## Risk Levels & Thresholds (v6.4 OECD-calibrated)

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | >= 0.60 | 133,572 | 4.38% | Immediate investigation |
| **High** | >= 0.40 | 148,043 | 4.85% | Priority review |
| **Medium** | >= 0.25 | 498,432 | 16.34% | Watch list |
| **Low** | < 0.25 | 2,271,247 | 74.44% | Standard monitoring |

**HR: 9.2%** ✓ OECD 2-15% compliant · C=0.01, 8 active features

**AUC metrics (two evaluation methods):**
- **Internal validation AUC: 0.840** — vendor-stratified 70/30 hold-out; model never saw test-set vendor contracts during training
- **Population discrimination AUC: 0.728** — all 295K GT-labeled contracts vs all 2.7M unlabeled; harder, more realistic; lower because SCAR assumption is violated (GT cases are high-profile scandals, not a random sample of all corruption)

Both are valid. The 0.840 measures generalization to new vendors from the *same* GT distribution. The 0.728 measures how well the model ranks any corrupt contract above any clean contract across the full population. Use 0.728 for external reporting; 0.840 for model iteration tracking.

---

## Model Architecture

- **16 z-score features** (normalized against sector-year baselines)
- **13 models**: 1 global + 12 per-sector logistic regressions
- **Sector fallback**: if n_positive < 500 OR sector AUC < 0.70 → uses global model
- **PU-learning correction** (Elkan & Noto 2008), c = 0.3432
- **Hyperparams**: C=0.0100, l1_ratio=0.9673 (Optuna TPE, 150 trials; fixed for reproducibility)
- **Ground truth**: 347 windowed cases · 507 vendors · ~315K contracts · all 12 sectors
- **Split**: vendor-stratified 70/30 (no vendor in both train and test)

---

## Global Coefficients (v6.4)

| Feature | Coef | Interpretation |
|---------|------|----------------|
| price_volatility | +1.8566 | Vendor contract-size variance vs sector norm — strongest signal |
| institution_diversity | -0.4679 | Distinct institutions served (protective — broad reach = legitimate) |
| price_ratio | +0.3907 | Contract amount / sector median |
| vendor_concentration | +0.2378 | Vendor value share within sector |
| network_member_count | +0.1873 | Co-contracting network size |
| same_day_count | +0.1114 | Threshold splitting signal |
| single_bid | +0.0984 | Now active with C=0.01 (was zeroed with C=0.0013) |
| ad_period_days | +0.0423 | Now active with C=0.01 (was zeroed with C=0.0013) |
| win_rate | 0 | Zeroed (sign constraint) |
| direct_award | 0 | Zeroed |
| sector_spread | 0 | Zeroed (sign constraint) |
| co_bid_rate | 0 | Regularized to zero |
| price_hyp_confidence | 0 | Regularized to zero |
| z_year_end | 0 | Regularized to zero |
| industry_mismatch | 0 | Regularized to zero |
| institution_risk | 0 | Regularized to zero |

**Intercept**: -2.3880 · **Score formula**: `min(sigmoid(intercept + β·z) / 0.3432, 1.0)`

> Z-scores are stored raw (for SHAP/PyOD); scoring clips to [-5, +5] SD before logit computation.

---

## Score Interpretation

> Scores are **risk indicators** measuring similarity to documented corruption patterns — NOT calibrated corruption probabilities. A score of 0.60 means the contract resembles known corruption cases, not that it has a 60% chance of being corrupt. Use for investigation triage only.

At threshold 0.60 (critical): precision=72%, recall=28% — 72% of flagged contracts share patterns with confirmed cases; 28% of all known-bad contracts are flagged.

---

## Key Limitations (summary)

| Limitation | Impact | Fixable? |
|-----------|--------|----------|
| SCAR violation (GT = high-profile scandals only) | Population AUC 0.728 vs internal 0.840; small-scale and unreported corruption underdetected | Partial (more GT diversity) |
| Label noise (30-50% of positives) | Model learns vendor profiles, not corruption per se | Partial (contract-level scoping) |
| Execution-phase fraud invisible | Infrastructure/construction underscored | Partial (needs ASF data) |
| Sector model quality varies | Only Otros falls back to global model (n<500) | Addressed by AUC-based fallback |
| 97K contracts at score=1.0 | PU correction (÷0.3432) amplifies high logit past 1.0 | By design; PU floor fix possible |
| New vendor blind spot | 2022+ vendors: ghost companion heuristic partially addresses | Partial |

Full limitation analysis: `docs/RISK_METHODOLOGY_v6_full.md`

---

## Per-Sector AUC (v6.4)

| Sector | n_positive | AUC | Model used |
|--------|-----------|-----|------------|
| Salud | 15,220 | 0.881 | sector |
| Educacion | 3,065 | 0.911 | sector |
| Infraestructura | 1,518 | 0.911 | sector |
| Energia | 1,129 | 0.888 | sector |
| Defensa | 743 | 0.869 | sector |
| Tecnologia | 459 | 0.901 | sector |
| Hacienda | 1,552 | 0.916 | sector |
| Gobernacion | 1,209 | 0.872 | sector |
| Agricultura | 3,130 | 0.872 | sector |
| Ambiente | 372 | 0.895 | sector |
| Trabajo | 500 | 0.908 | sector |
| Otros | 253 | 0.857 | **global fallback** (n_positive < 500) |

---

## DB Columns

| Column | Description |
|--------|-------------|
| `risk_score` | Active v6.4 score |
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
python -m scripts.compute_z_features                                              # ~45min on 3.1M
python scripts/calibrate_risk_model_v6_enhanced.py --force-C 0.0100 --force-l1-ratio 0.9673
python scripts/_oecd_calibrate_intercept.py                                        # calibrate to 9% HR
python scripts/_score_v6_now.py
python -m scripts.precompute_stats
```

*Scores are statistical risk indicators. High score ≠ proof of wrongdoing.*
