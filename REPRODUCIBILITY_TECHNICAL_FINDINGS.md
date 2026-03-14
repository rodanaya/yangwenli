# Technical Findings: v6.0 Reproducibility Deep Dive

---

## Finding 1: SQLite RANDOM() Non-Determinism

### Severity: CRITICAL

### Code Location
- `calibrate_risk_model_v6_enhanced.py:178` (negative sampling in load_enhanced_data)
- `calibrate_risk_model_v6_enhanced.py:483` (population simulation)

### Root Cause
SQLite's `RANDOM()` function is **not seeded**. Each invocation produces a different random permutation of contracts, leading to different training samples across runs.

### Observed Impact
Running the same calibration twice:
- Run 1: ~265,000 negative contracts sampled
- Run 2: Different ~265,000 negative contracts sampled
- Result: Different training data → different learned coefficients

### Demonstration (Python code that reproduces the issue)

```python
import sqlite3
import numpy as np

conn = sqlite3.connect("backend/RUBLI_NORMALIZED.db")

# First sample
sample1 = conn.execute("""
    SELECT contract_id FROM contracts
    WHERE vendor_id NOT IN (SELECT vendor_id FROM ground_truth_vendors)
    ORDER BY RANDOM() LIMIT 10
""").fetchall()

# Second sample
sample2 = conn.execute("""
    SELECT contract_id FROM contracts
    WHERE vendor_id NOT IN (SELECT vendor_id FROM ground_truth_vendors)
    ORDER BY RANDOM() LIMIT 10
""").fetchall()

# Compare
set1 = {row[0] for row in sample1}
set2 = {row[0] for row in sample2}

if set1 != set2:
    print(f"DIFFERENT SAMPLES (as expected)")
    print(f"Only in sample 1: {set1 - set2}")
    print(f"Only in sample 2: {set2 - set1}")
else:
    print("Samples are identical (unlikely without seeding)")
```

### Expected Output
```
DIFFERENT SAMPLES (as expected)
Only in sample 1: {12345, 67890, ...}
Only in sample 2: {54321, 98765, ...}
```

### Mitigation Strategy

**Option A: Use Python RNG (Recommended)**
```python
# Load ALL negative contracts in deterministic order
cursor.execute("""
    SELECT contract_id FROM contracts
    WHERE vendor_id NOT IN (?, ?, ...)
    AND sector_id = ?
    ORDER BY contract_id  -- Deterministic!
""", gt_vendor_ids + [sector_id])

all_neg_ids = [row[0] for row in cursor.fetchall()]

# Use seeded Python RNG
rng = np.random.RandomState(42)
sampled_ids = rng.choice(
    all_neg_ids,
    size=min(sector_neg_target, len(all_neg_ids)),
    replace=False
)
```

**Cost:** ~2-3x slower (two-pass query), but reproducible

**Option B: Use SQLite Hash-Based Ordering**
```python
# SQLite 3.34+: Use hash-based but deterministic ordering
ORDER BY ABS(CAST(contract_id AS REAL)) % 1000
```

Less standard, but avoids Python round-trip.

---

## Finding 2: Optuna Study Not Persisted

### Severity: CRITICAL

### Code Location
`calibrate_risk_model_v6_enhanced.py:262-308` (optuna_search function)

### Issue
The Optuna study is created, optimized, then immediately discarded:

```python
def optuna_search(data, n_trials=100):
    ...
    study = optuna.create_study(direction='maximize', sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    best = study.best_params
    # ← Study object is now garbage collected
    return best  # Only the "best" params returned, not the full history
```

### What This Means
- **100 trials were run**, but we only see the 1 best result
- No way to verify the other 99 trials were legitimate
- No way to check if the optimizer converged
- No way to inspect the trial history
- Impossible for reviewers to verify optimality

### What Should Be Stored
```
Trial#  C           l1_ratio   AUC    Penalty  False_Alarm  GT_Detection
1       0.001       0.500      0.621  0.340    0.250        0.650
2       0.005       0.250      0.642  0.320    0.240        0.670
...
100     0.349       0.996      0.918  0.012    0.120        0.950
```

Only the last row (best) is retained.

### Peer Review Impact
Reviewer comment:
> "You claim C=0.3499 is optimal based on Optuna TPE search over 100 trials. Can you provide the trial history so we can verify convergence?"

**Current answer:** "No, we didn't save it." ❌

### Fix: Use Optuna Storage

```python
import optuna
from optuna.storages import RDBStorage
from datetime import datetime

run_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
db_url = f'sqlite:///optuna_studies/v6_study_{run_timestamp}.db'

study = optuna.create_study(
    direction='maximize',
    sampler=optuna.samplers.TPESampler(seed=42),
    storage=db_url,  # ← Persist to disk!
    study_name=f'v6_calibration_{run_timestamp}'
)

study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

# Export trial history
trials_df = study.trials_dataframe()
trials_df.to_csv(f'optuna_trials_v6_{run_timestamp}.csv', index=False)
print(f"Trials exported to optuna_trials_v6_{run_timestamp}.csv")
```

### Cost
- Disk: ~50KB per 100 trials (~5MB for 10k trials)
- Time: Negligible (SQLite writes are fast)

### Benefit
- Reviewers can inspect all 100 trials
- Can verify AUC improved monotonically with better hyperparameters
- Can check for convergence plateaus
- Can replicate the exact search

---

## Finding 3: Incomplete Hyperparameter Documentation

### Severity: HIGH

### Current Storage
```json
{
  "C": 0.349937358809444,
  "l1_ratio": 0.9957545889226931,
  "split": "vendor-stratified",
  "neg_ratio": 10.0,
  "n_pos_train": 18756,
  "n_pos_test": 7543,
  "n_train": 202630,
  "n_test": 86689
}
```

### Missing Critical Parameters
1. **Random seed (42)** — Not documented
   - Reproducers won't know to set seed=42

2. **Negative sampling method** — Not documented
   - Future runs might use RANDOM() instead of Python RNG

3. **Max per vendor (200)** — Not documented
   - Different cap changes data composition

4. **Bootstrap parameters (n_bootstrap=200)** — Not documented
   - CI widths depend on this

5. **Ground truth version** — Not versioned
   - If GT vendors change, training data changes
   - No checksum to detect this

6. **Solver parameters** — Not documented
   - `max_iter=3000`, `solver='saga'` hidden in code

7. **Z-score epsilon (0.001)** — Not documented
   - Affects feature normalization

8. **Case windows** — Not documented
   - Which contracts are labeled "positive"?

### Impact Example
Suppose a researcher downloads the code 6 months later:

```python
# They run calibration
python -m scripts.calibrate_risk_model_v6_enhanced --use-optuna

# They get different results because:
# 1. Ground truth vendors may have changed (new cases added)
# 2. Max per vendor might be inferred incorrectly
# 3. Negative ratio might be different
# 4. They don't know to use seed=42
```

They say: "I cannot reproduce the published coefficients."

**We say:** "You need to set seed=42 and use neg_ratio=10.0 and..."

**Problem:** They had no way to know these settings existed.

### Solution: Expanded hyperparameters JSON

```json
{
  "model_version": "v6.0",
  "trained_date": "2026-03-10T17:09:02Z",
  "random_seed": 42,
  "cv_method": "vendor-stratified",
  "cv_split_ratio": 0.70,

  "positive_data": {
    "source": "ground_truth_vendors",
    "cases_included": [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 22],
    "cases_excluded": [16, 19, 20, 21],
    "case_windows": {
      "1": [2012, 2019],
      "2": [2019, 2023],
      ...
    },
    "n_vendors_total": 489,
    "n_contracts_before_window_filter": 314738,
    "n_contracts_after_window_filter": 26299,
    "n_contracts_after_per_vendor_cap": 26299,
    "per_vendor_contract_limit": 200,
    "vendors_capped": 0
  },

  "negative_data": {
    "source": "non_ground_truth_vendors",
    "sampling_method": "stratified_sector_proportional",
    "sampling_seed": 42,
    "sampling_order": "deterministic_python_rng",
    "neg_ratio": 10.0,
    "n_negatives_total": 265000
  },

  "training": {
    "n_train": 202630,
    "n_pos_train": 18756,
    "n_neg_train": 183874,
    "n_test": 86689,
    "n_pos_test": 7543,
    "n_neg_test": 79146
  },

  "model_hyperparameters": {
    "solver": "saga",
    "max_iter": 3000,
    "C": 0.349937358809444,
    "l1_ratio": 0.9957545889226931,
    "penalty": "elasticnet"
  },

  "optuna_search": {
    "enabled": true,
    "n_trials": 100,
    "sampler": "TPESampler",
    "seed": 42,
    "direction": "maximize",
    "study_db": "optuna_studies/v6_study_20260310_170900.db"
  },

  "bootstrap": {
    "n_iterations": 200,
    "seed": 42,
    "ci_percentiles": [2.5, 97.5]
  },

  "z_score_normalization": {
    "epsilon": 0.001,
    "method": "sector_year_baseline",
    "baseline_source": "factor_baselines_table"
  },

  "pu_correction": {
    "method": "Elkan & Noto (2008)",
    "holdout_estimation": true,
    "c_estimate": 0.50123
  }
}
```

---

## Finding 4: Test Coverage Gaps

### Severity: HIGH

### What's Tested
✅ `test_risk.py` (88 lines) — v3.3 checklist model only
- Weight configuration
- Risk level boundaries (thresholds)
- Factor accumulation

### What's NOT Tested
❌ Sigmoid function
❌ Logistic regression training
❌ PU correction estimation
❌ Z-feature loading
❌ Per-sector model routing
❌ Risk level boundaries for v6.0
❌ Confidence interval computation
❌ Bootstrap sampling

### Critical Test Gaps

**Test 1: Sigmoid correctness**
```python
def test_sigmoid():
    """Sigmoid should match sklearn's implementation."""
    from scripts._score_v6_now import sigmoid
    import numpy as np

    # Test boundary conditions
    assert sigmoid(np.array([-100.0]))[0] < 1e-10
    assert sigmoid(np.array([100.0]))[0] > 1.0 - 1e-10

    # Test middle
    assert abs(sigmoid(np.array([0.0]))[0] - 0.5) < 1e-6

    # Compare to sklearn
    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression()
    model.fit([[0], [1]], [0, 1])
    sklearn_proba = model.predict_proba([[0]])[0, 1]

    custom_logit = model.intercept_[0]
    custom_proba = sigmoid(np.array([custom_logit]))[0]

    np.testing.assert_almost_equal(custom_proba, sklearn_proba, decimal=10)
```

**Test 2: Risk level boundaries**
```python
def test_risk_level_v6():
    """Verify v6.0 risk level boundaries."""
    from scripts._score_v6_now import get_risk_level

    assert get_risk_level(0.0) == 'low'
    assert get_risk_level(0.09) == 'low'
    assert get_risk_level(0.10) == 'medium'  # Boundary
    assert get_risk_level(0.29) == 'medium'
    assert get_risk_level(0.30) == 'high'   # Boundary
    assert get_risk_level(0.49) == 'high'
    assert get_risk_level(0.50) == 'critical'  # Boundary
    assert get_risk_level(1.0) == 'critical'
```

**Test 3: PU correction bounds**
```python
def test_pu_correction_estimation():
    """PU correction should be in [0.50, 0.99]."""
    # Create synthetic data
    X = np.random.randn(1000, 16)
    y = np.random.binomial(1, 0.1, 1000)  # ~10% positive

    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression(random_state=42)
    model.fit(X, y)

    X_test_pos = X[y == 1]
    c = model.predict_proba(X_test_pos)[:, 1].mean()

    assert 0.50 <= c <= 0.99, f"PU c={c} outside expected range"
```

---

## Finding 5: Coefficient Reconstruction Risk

### Severity: MEDIUM

### Issue
The scoring script (`_score_v6_now.py`) manually reconstructs risk scores from stored coefficients:

```python
def load_all_calibrations(conn):
    coef_vec = np.array([coefs.get(f, 0.0) for f in FACTOR_NAMES])
    # ...
    return models

def main():
    scores = np.zeros(len(ids))
    for sid in set(sectors):
        m = models.get(int(sid), g)
        logits = m['intercept'] + Z[mask] @ m['coef_vec']
        raw_p = sigmoid(logits)
        s = np.minimum(raw_p / m['pu_c'], 1.0)
        scores[mask] = s
```

### Risk
If sklearn's internal implementation changes (e.g., feature scaling), the reconstructed score will differ from what the original training produced.

### Example
If sklearn 2.0 introduces L-BFGS-B improvements, the trained model might apply implicit scaling that we don't know about. When we manually compute `intercept + Z @ coef_vec`, we get wrong scores.

### Solution
Serialize the full model object:

```python
import pickle

# During calibration
pickle.dump({
    'global_model': global_model,
    'sector_models': {f'sector_{sid}': model for sid, model in ...},
    'metadata': {...}
}, open(f'models/v6_models_{run_id}.pkl', 'wb'))

# During scoring
loaded = pickle.load(open(f'models/v6_models_{run_id}.pkl', 'rb'))
global_model = loaded['global_model']

scores = np.minimum(global_model.predict_proba(X)[:, 1] / pu_c, 1.0)
```

### Cost
- Disk: ~5MB per model set
- Compatibility: Python 3.8+ needed for unpickling

### Benefit
- Exact reproduction guaranteed
- Immune to sklearn changes
- Single source of truth

---

## Finding 6: Data Contamination via Vendor ID Shuffling

### Severity: MEDIUM

### Issue
The vendor shuffle uses the global RNG(42), but if any other operation in the data loading modifies the RNG state, the shuffle becomes non-deterministic:

```python
rng = np.random.RandomState(seed)

# Line 107
rng.shuffle(gt_vendor_ids)  # Uses RNG

# Lines 146-150: Vendor capping
for vid, rows in positive_by_vendor.items():
    if len(rows) > max_per_vendor:
        sampled = [rows[i] for i in rng.choice(len(rows), ...)]  # Uses SAME RNG

# Line 201: Negative vendor shuffle
neg_vendors = list({row[-1] for row in negative_rows})
rng.shuffle(neg_vendors)  # RNG has advanced...
```

If the number of vendors capped changes (due to different ground truth), the RNG state when reaching line 201 is different, producing different train/test split.

### Scenario
```
Run 1 (original GT):
- 20 vendors capped
- RNG state: X
- Negative vendor shuffle uses state X
- Train/test split: 70%/30% of negatives A, B, C, ...

Run 2 (GT + 1 new case):
- 25 vendors capped
- RNG state: Y (different)
- Negative vendor shuffle uses state Y
- Train/test split: 70%/30% of negatives D, E, F, ... (different!)
```

### Solution
Use independent RNG for each operation:

```python
rng_split = np.random.RandomState(42)  # GT vendor split
rng_sample = np.random.RandomState(42)  # Per-vendor sampling
rng_neg_split = np.random.RandomState(42)  # Negative vendor split

# Now each operation is independent
rng_split.shuffle(gt_vendor_ids)
...
for vid, rows in positive_by_vendor.items():
    sampled = [rows[i] for i in rng_sample.choice(...)]
...
rng_neg_split.shuffle(neg_vendors)
```

---

## Finding 7: Silent Failures in Bootstrap

### Severity: LOW

### Issue (Line 353-354)
```python
for b in range(n_bootstrap):
    idx = rng.choice(len(X_train), len(X_train), replace=True)
    try:
        m = train_model(X_train[idx], y_train[idx], C=C, l1_ratio=l1_ratio)
        boot_coefs[b] = m.coef_[0]
    except Exception:
        boot_coefs[b] = coefs  # Silent fallback!
```

If training fails on a bootstrap sample, it silently uses the original coefficients. This can happen if a bootstrap sample contains only 1 class.

### Problem
- **No logging of failures** — we don't know how many times this happened
- **Biased confidence intervals** — repeated intercepts due to fallback
- **Silent data quality issues** — suggests problems we don't see

### Fix
```python
boot_coefs = np.zeros((n_bootstrap, len(FACTOR_NAMES)))
n_failed = 0

for b in range(n_bootstrap):
    idx = rng.choice(len(X_train), len(X_train), replace=True)
    try:
        m = train_model(X_train[idx], y_train[idx], C=C, l1_ratio=l1_ratio)
        boot_coefs[b] = m.coef_[0]
    except Exception as e:
        n_failed += 1
        logger.warning(f"Bootstrap {b} failed: {e}")
        # Don't silently use original coefs
        # Either: re-raise, or resample
        raise

if n_failed > 0:
    logger.warning(f"Bootstrap: {n_failed}/{n_bootstrap} resamples failed")
```

---

## Summary Table

| Finding | Severity | Reproducibility Impact | Fix Effort | Recommendation |
|---------|----------|------------------------|------------|-----------------|
| SQLite RANDOM() | 🔴 CRITICAL | Cannot reproduce training set | 2 hours | FIX BEFORE PUBLICATION |
| Optuna study not saved | 🔴 CRITICAL | Cannot verify hyperparameter search | 1 hour | FIX BEFORE PUBLICATION |
| Incomplete hyperparams | 🟠 HIGH | Researchers don't know input parameters | 1 hour | FIX BEFORE PUBLICATION |
| No test coverage (v6.0) | 🟠 HIGH | Cannot verify correctness | 3 hours | FIX BEFORE PUBLICATION |
| Model reconstruction risk | 🟡 MEDIUM | Fragile w.r.t. sklearn changes | 2 hours | FIX BEFORE PUBLICATION |
| RNG state contamination | 🟡 MEDIUM | Train/test split unstable | 1 hour | FIX BEFORE SUBMISSION |
| Silent bootstrap failures | 🔵 LOW | CIs may be biased | 30 min | FIX BEFORE SUBMISSION |

---

*Technical audit completed by Claude Code ML Reproducibility Agent*
