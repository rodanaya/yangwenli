# RUBLI Risk Scoring — which script does what (READ BEFORE ANY RESCORE)

> **Active model: v0.8.5** (ElasticNet logistic + PU correction, run
> `CAL-v8-202605020212`, May 2 2026). It writes `contracts.risk_score_v8`
> and `risk_level`. Test AUC 0.785 · HR 11.0% · Brier 0.1128 · intercept
> −2.6157 · c_pu 0.32 · 18 features (joins `contract_z_features_v2`).

## ⚠️ The wrong-script hazard (why this file exists)

The v0.8.5 **scorer is not cleanly named** in `backend/scripts/` (flagged by
the 2026-06-11 backend diagnosis). The V6 scorers ARE named — so the easy
mistake is to "rescore" by running a V6 script, which silently overwrites the
active v0.8.5 scores with **v6.0**. Do not.

| Script | Produces | Status |
|---|---|---|
| `_patch_v85_ghost_fp.py` | patches `risk_score_v8` for ghost-FP vendors | v0.8.5 **patch only**, not the full scorer |
| `_score_v6_now.py` | v6.0 scores | ❌ V6 — NOT active (CLAUDE.md "Important Files" mislabels this "Active scoring") |
| `calculate_risk_scores_v6.py` | v6.0 (`WHERE model_version='v6.0'`) | ❌ V6 |
| `calibrate_risk_model_v6_enhanced.py` | `MODEL_VERSION='v6.0'` calibration | ❌ V6 calibrator |
| `calibrate_risk_model_v5.py` / `_v6.py` | v5 / v6 | ❌ superseded |
| **(the full v0.8.5 scorer)** | `risk_score_v8` from the v0.8.5 betas + `contract_z_features_v2` | ⚠️ **NOT located as a named script** — locate / re-create / rename + consolidate before the next rescore (TODO) |

## Hard guardrails — DO NOT accept a rescore that violates any of these
- `intercept < −0.5` (v0.8.5 = −2.6157)
- `c_pu > 0.30` (v0.8.5 = 0.32)
- High-risk rate within OECD **2–15%** (v0.8.5 = 11.0%)
- `Brier ≤ 0.1128` (don't ship worse calibration)
- No temporal/label leakage (v5.1's 0.957 AUC was leakage; v0.8.5 uses a
  vendor-stratified split). AUC-circularity caveat: 989/1,427 GT cases are
  `model_discovery` origin — dedupe + pin the non-model-discovery gold set as
  the held-out anchor before trusting any AUC uplift.

## Provenance of the model artifact
- The calibration row lives in `model_calibration` (`model_version='v0.8.5'`,
  `sector_id=0` — **NOT** `sector_id IS NULL`; the older convention used NULL,
  which silently served v6.0 to read-path SHAP until the 2026-06-11 fix; see
  `backend/api/services/active_model.py`).
- Coefficients are stored as `{"names":[...],"values":[...]}` (v0.8.5),
  vs the older flat `{name:value}` dict.

## If you must rescore
1. Confirm you are running the **v0.8.5** scorer (NOT a V6 script above).
2. Verify the four hard guardrails on the result BEFORE writing.
3. Back up the DB first (`scripts/_wal_checkpoint.py` + copy).
4. Recompute downstream: `vendor_stats`, `institution_stats`,
   `feature_importance` (now `model_version='v0.8.5'`), ARIA queue.

See `docs/ML_MODEL_ANALYSIS_2026-06-11.md` for the full model analysis and the
v0.9 retrain plan (RT-1..5).
