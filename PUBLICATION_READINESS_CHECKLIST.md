# Publication Readiness Checklist: RUBLI v6.0 Risk Model

**Current Status:** ❌ NOT READY FOR PUBLICATION
**Estimated Readiness:** 3-4 days of focused work

---

## Critical Blockers (MUST FIX)

### ❌ 1. Non-Deterministic Negative Sampling
- **Issue:** SQLite `ORDER BY RANDOM()` is not seeded
- **Impact:** Different training data every run → different coefficients
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:178, 483`
- **Effort:** 2 hours
- **Test:** Run calibration twice, compare coefficients (should be identical)
- **Status:** NOT STARTED

### ❌ 2. Optuna Study Not Archived
- **Issue:** Hyperparameter optimization history is discarded
- **Impact:** Cannot verify hyperparameters are optimal
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:262-308`
- **Effort:** 1 hour
- **Test:** Check that `optuna_studies/` directory contains `.db` files
- **Status:** NOT STARTED

### ❌ 3. Incomplete Hyperparameter Logging
- **Issue:** Only 8 of 15+ parameters documented in DB
- **Impact:** Researchers can't know what settings to use
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:550-558` (hyperparams JSON)
- **Effort:** 1 hour
- **Test:** Dump `model_calibration.hyperparameters` for v6.0 global model, verify 15+ keys present
- **Status:** NOT STARTED

### ❌ 4. No Reproducibility Tests
- **Issue:** Zero tests for v6.0 scoring logic
- **Impact:** Cannot catch regressions or verify correctness
- **Files to create:** `backend/tests/test_v6_reproducibility.py` (NEW)
- **Effort:** 3 hours
- **Test:** Run pytest, all tests pass
- **Status:** NOT STARTED

### ❌ 5. Model Coefficients Not Serialized
- **Issue:** Only coefficients stored, model object discarded
- **Impact:** Fragile reconstruction, vulnerable to sklearn changes
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:529+`, `_score_v6_now.py:26`
- **Effort:** 2 hours
- **Test:** Pickle and unpickle a model, verify scores unchanged
- **Status:** NOT STARTED

---

## High Priority Issues (SHOULD FIX BEFORE SUBMISSION)

### ⚠️ 6. Dependency Versions Not Pinned
- **Issue:** `requirements.txt` uses >= ranges (sklearn>=1.3.0)
- **Impact:** Reviewers use different versions, get different results
- **Files to fix:** `backend/requirements.txt`
- **Effort:** 30 min
- **Test:** Pin to exact versions, re-run calibration, verify same coefficients
- **Status:** NOT STARTED

### ⚠️ 7. RNG State Contamination Risk
- **Issue:** Single RNG(42) used for multiple operations
- **Impact:** Adding new operations changes RNG sequence
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:91, 107, 148, 201`
- **Effort:** 1 hour
- **Test:** Run with different operations added, verify train/test split unchanged
- **Status:** NOT STARTED

### ⚠️ 8. Silent Bootstrap Failures
- **Issue:** Bootstrap failures silently use original coefficients (line 354)
- **Impact:** Confidence intervals may be biased
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:350-354`
- **Effort:** 30 min
- **Test:** Verify no warnings in log about bootstrap failures
- **Status:** NOT STARTED

---

## Medium Priority Issues (RECOMMENDED FOR PUBLICATION)

### ℹ️ 9. Ground Truth Version Not Tracked
- **Issue:** Ground truth vendors queried fresh, not versioned
- **Impact:** Changing GT causes different training data with no way to detect
- **Files to fix:** `calibrate_risk_model_v6_enhanced.py:94-103` (add hash check)
- **Effort:** 1 hour
- **Test:** Verify hyperparameters.json includes gt_vendor_ids_hash
- **Status:** NOT STARTED

### ℹ️ 10. Documentation Gap: Methods Section
- **Issue:** Paper methods incomplete (missing hyperparameter values, case windows, etc.)
- **Impact:** Methods not reproducible from paper alone
- **Files to create:** Supplementary table of hyperparameters
- **Effort:** 2 hours
- **Test:** Reviewer can reproduce from paper + supplementary material
- **Status:** NOT STARTED

### ℹ️ 11. Utility Functions Duplicated
- **Issue:** `sigmoid()` and `get_risk_level()` defined in two files
- **Impact:** Single source of truth missing
- **Files to create:** `backend/scripts/risk_model_utils.py` (NEW)
- **Effort:** 1 hour
- **Test:** Both modules import from utils, tests pass
- **Status:** NOT STARTED

---

## Implementation Plan (Recommended Order)

### Phase 1: Critical Fixes (1.5 days)

#### Day 1, Morning (3 hours)
1. **Fix negative sampling** (2h)
   - Replace `ORDER BY RANDOM()` with Python RNG
   - Test: Run calibration twice, compare coefficients
   ```bash
   python -m scripts.calibrate_risk_model_v6_enhanced --dry-run > run1.log
   python -m scripts.calibrate_risk_model_v6_enhanced --dry-run > run2.log
   diff run1.log run2.log  # Should be identical
   ```

2. **Fix Optuna persistence** (1h)
   - Add storage= parameter to create_study()
   - Export trials_dataframe to CSV
   - Test: Check `optuna_studies/*.db` exists

#### Day 1, Afternoon (4 hours)
3. **Expand hyperparameter logging** (1h)
   - Add 15+ parameters to hyperparameters JSON
   - Include gt_vendor_ids, case_windows, solver params, etc.
   - Test: Query DB and verify all fields present

4. **Create reproducibility tests** (3h)
   - Write test_sigmoid_correctness()
   - Write test_get_risk_level_boundaries()
   - Write test_pu_correction_bounds()
   - Write test_calibration_deterministic()
   - Test: `pytest backend/tests/test_v6_reproducibility.py -v`

#### Day 2, Morning (2 hours)
5. **Serialize model objects** (2h)
   - Pickle trained models to disk
   - Update _score_v6_now.py to load pickled models
   - Test: Score same contracts with pickle vs manual, compare

### Phase 2: High Priority Fixes (1 day)

#### Day 2, Afternoon (3 hours)
6. **Pin dependency versions** (30 min)
   - Update requirements.txt with exact versions
   - Test: `pip install -r requirements.txt`, verify versions

7. **Separate RNG instances** (1h)
   - Use separate RandomState for each operation
   - Test: Verify train/test split stable

8. **Fix bootstrap error handling** (30 min)
   - Remove silent fallback, add logging
   - Test: Verify no bootstrap warnings in log

### Phase 3: Documentation (0.5 days)

#### Day 3, Morning (2 hours)
9. **Create reproducibility appendix** (2h)
   - Document all hyperparameters in supplementary table
   - Include exact replication instructions
   - Include environment specification
   - Test: Follow instructions exactly, verify reproduction

---

## Pre-Submission Verification Checklist

### Code Quality
- [ ] All tests pass: `pytest backend/tests/ -v`
- [ ] No linting errors: `pylint backend/scripts/calibrate_risk_model_v6_enhanced.py`
- [ ] Type hints correct: `mypy backend/scripts/`
- [ ] Zero warnings in calibration log

### Reproducibility
- [ ] Calibration run twice produces identical coefficients
- [ ] `optuna_studies/` directory contains study database
- [ ] Hyperparameters JSON has 15+ keys
- [ ] Model pickle files exist in `backend/models/`
- [ ] Dependency versions pinned in `requirements.txt`
- [ ] Reproducibility tests all pass

### Documentation
- [ ] RISK_METHODOLOGY_v6.md exists and is complete
- [ ] Supplementary table includes all hyperparameters
- [ ] Replication instructions provided
- [ ] Environment specification documented
- [ ] Case windows specified for all ground truth cases
- [ ] Ground truth vendor IDs checksum included

### External Review
- [ ] Have external researcher run code independently
  - [ ] Can they reproduce coefficients?
  - [ ] Can they understand all parameters?
  - [ ] Can they replicate score distribution?

---

## File Changes Summary

### Files to Modify

```
backend/scripts/calibrate_risk_model_v6_enhanced.py
  Line 80-228:   Rewrite load_enhanced_data() for deterministic sampling
  Line 262-308:  Add Optuna storage and trial export
  Line 345-358:  Fix bootstrap error handling
  Line 550-558:  Expand hyperparameters JSON logging
  Line 529+:     Add model serialization to save_to_db()

backend/scripts/_score_v6_now.py
  Line 26-54:    Update load_all_calibrations() to use pickled models
  Line 56-161:   Update main() for model loading

backend/requirements.txt
  (pin all versions)

backend/.gitignore
  (add optuna_studies/, models/)
```

### Files to Create

```
backend/scripts/risk_model_utils.py (NEW)
  - Shared sigmoid(), get_risk_level(), constants

backend/tests/test_v6_reproducibility.py (NEW)
  - test_sigmoid_correctness()
  - test_get_risk_level_boundaries()
  - test_pu_correction_bounds()
  - test_calibration_deterministic()
  - test_model_loading()

backend/tests/conftest.py (UPDATE)
  - Add fixtures for v6.0 models

docs/RISK_METHODOLOGY_v6.md (NEW)
  - Hyperparameter table
  - Case window specifications
  - Ground truth summary

SUPPLEMENTARY_MATERIAL.md (NEW)
  - Reproducibility appendix
  - Replication instructions
  - Environment specification
```

---

## Acceptance Criteria

A manuscript can be submitted when ALL of the following are true:

### Manuscript
- [ ] Methods section includes exact hyperparameters
- [ ] Methods section specifies random seed
- [ ] Methods section defines risk level thresholds
- [ ] Results section matches v6.0 risk distribution from DB
- [ ] Supplementary material includes all parameters

### Code
- [ ] All critical blockers fixed
- [ ] All tests pass
- [ ] Calibration is deterministic (run twice, identical results)
- [ ] No warnings or errors in logs

### Verification
- [ ] External researcher can reproduce coefficients
- [ ] External researcher can reproduce score distribution
- [ ] All dependencies installed from requirements.txt

### Documentation
- [ ] README includes replication instructions
- [ ] Appendix includes trial history (Optuna)
- [ ] Appendix includes case specifications (ground truth)

---

## Risk Assessment

### If We Submit WITHOUT These Fixes
- **Probability of rejection:** 85%
- **Reviewer comments likely:**
  > "Reproducibility concerns. How can we verify your coefficients are optimal if the hyperparameter search isn't archived? How do we reproduce your results if random sampling isn't seeded?"
- **Timeline to resubmit:** 4-6 weeks (after fixes)
- **Reputation risk:** Medium (suggests sloppy research)

### If We Submit WITH These Fixes
- **Probability of acceptance:** 75%
- **Remaining issues:** Minor (presentation, sample size, etc.)
- **Timeline to publication:** 3-4 weeks (normal review cycle)
- **Reputation benefit:** High (thorough, reproducible work)

---

## Success Metrics

**When publication is ready:**
1. ✅ Calibration is deterministic (bit-for-bit identical across runs)
2. ✅ Optuna trials are archived and reproducible
3. ✅ All hyperparameters are logged and documented
4. ✅ Test coverage includes all v6.0 functions
5. ✅ External researcher can reproduce without asking for help
6. ✅ No unresolved warnings or errors in logs

---

## Timeline Estimate

| Phase | Duration | Date Range |
|-------|----------|-----------|
| Critical fixes | 1.5 days | Mar 13-14 |
| High priority fixes | 1 day | Mar 14 |
| Documentation | 0.5 days | Mar 14 |
| **Total** | **3 days** | **Mar 13-14** |
| External verification | 2-3 days | Mar 15-17 |
| Revisions | 1-2 days | Mar 18 |
| **Ready for submission** | — | **~Mar 18** |

---

## Sign-Off

- [ ] Audit reviewed by project lead
- [ ] Implementation plan approved
- [ ] Resources allocated
- [ ] Timeline confirmed

**Next step:** Run `python -m scripts.calibrate_risk_model_v6_enhanced --dry-run` and capture baseline before making changes (for before/after comparison).

---

*Prepared by: Claude Code ML Audit Agent*
*Date: March 13, 2026*
*Reproducibility Assessment: CRITICAL (5.8/10)*
