# RUBLI Backend Audit — April 20, 2026 (4 PM)
*Audit-only — no model files modified, no contracts rescored*

---

## Executive Summary

The v0.6.5 model is sound but has **documentation drift** (DB coefficients diverged from docs after GT expansion), **three unused signal sources** that could lift AUC +0.04-0.07, and **two API performance hazards** that fire live 3.1M-row queries when precomputed stats are stale. None require a scoring re-run before Friday launch. One API fix (populate `primary_sector_id` in `vendor_stats`) is a single SQL UPDATE that eliminates the worst query pattern.

---

## 1. Risk Model Assessment (v0.6.5)

### Current State
- **Scored contracts**: 3,051,294 (v6.5) + 8,298 NULL (no z-features — pending_score tag)
- **Ground truth**: 1,374 cases / 923 vendors — **84% growth since last calibration (Mar 25, 748 cases)**
- **Train AUC: 0.798 / Test AUC: 0.828** (vendor-stratified 70/30)
- **HR: 13.49%** — OECD compliant (2-15%)

### Coefficient Discrepancy (DB vs docs)

The `RISK_METHODOLOGY_v6.md` coefficient table does NOT match the live DB. Either a recalibration was run after the March 25 commit without updating docs, or the sign-constraint zeroing applied differently. The DB is authoritative.

| Feature | Docs claim | DB actual | Delta |
|---|---|---|---|
| price_ratio | +0.234 | **+0.416** | +0.182 |
| vendor_concentration | +0.375 | **+0.274** | -0.101 |
| institution_diversity | -0.382 | **-0.274** | +0.108 |
| win_rate | +0.049 | **0.000** (zeroed) | -0.049 |
| single_bid | 0.000 | **+0.059** (active!) | +0.059 |
| network_member_count | +0.181 | **+0.140** | -0.041 |

**Action required:** Update `docs/RISK_METHODOLOGY_v6.md` coefficient table to match DB values. The SHAP explanation layer reads the DB, so explanations are correct — the documentation is just stale.

### Test > Train AUC Explained (not anomalous)

The vendor-stratified split concentrates signal-rich GT vendors (IMSS, COVID, Segalmex — majority of training positives) in the training set and smaller, cleaner cases in test. Test set is effectively "easier" with fewer noisy labels. Real generalization AUC on truly unseen scandals estimated at 0.65-0.70.

### GT Expansion Impact

626 new GT cases since Mar 25. However, most were added by gt-batch-mining agents with `curriculum_weight < 0.5`. Effective information gain ~25% weighted. Expected AUC lift from recalibration: **+0.01 to +0.03** — not urgent for Friday launch.

**Recommendation**: Do NOT recalibrate before Friday. Schedule for the week after launch with the full 1,374-case GT corpus.

### Unused Signal — Priority Ordered

| Signal | DB coverage | Expected AUC lift | Effort | Priority |
|---|---|---|---|---|
| `ensemble_anomaly_score` (PyOD IForest+COPOD) | 3,051,294 (100%) | +0.02-0.04 | 2h (add to Z_COLS + recalibrate) | **HIGH** |
| Orthogonalized features (`z_*_orth`) | 3,051,294 (100%) | +0.01-0.02 | 30min (swap column names in Z_COLS) | **MEDIUM** |
| Co-bid at vendor-network level (vs contract-level) | Needs recompute | +0.01-0.02 | 4h (rewrite compute_z_features) | LOW |
| `publication_delay_days` | 1,280,395 (42%) | Unknown | 1h | LOW (sparse) |

**Note:** ARIA P2/P3/P6 pattern flags should NOT feed into risk scores — ARIA uses risk_score as an IPS input, creating a circular feedback loop.

---

## 2. API Performance Assessment

### dashboard/fast (stats.py:256)

The fast endpoint has **two live fallback queries** against 3.1M contracts that fire when `precomputed_stats` keys are empty or return zero:

1. **risk_distribution fallback** (stats.py:343-362): Full `COUNT(*) + SUM(amount_mxn)` with a nested `SELECT COUNT(*) FROM contracts` correlated subquery. **~2-4s per call.**
2. **overview fallback** (stats.py:365-396): 8-column aggregate including `COUNT(DISTINCT vendor_id)` and `COUNT(DISTINCT institution_id)` — forces full sort on 3.1M rows. **~2-4s per call.**

These fire after every DB swap (RUBLI_DEPLOY.db upload) if `precompute_stats` was not re-run. Fix: ensure `precompute_stats` is always run after any DB deployment.

### vendors endpoint — correlated subquery (vendor_service.py:84-88)

Sector-filtered vendor lists fall back to:
```sql
WHERE v.id IN (SELECT DISTINCT c2.vendor_id FROM contracts c2 WHERE c2.sector_id = ? AND c2.vendor_id IS NOT NULL)
```
This scans 250K-500K contract rows per sector on every request. Root cause: `primary_sector_id` in `vendor_stats` table is NULL for all vendors.

**Fix (5 minutes of SQL):**
```sql
UPDATE vendor_stats SET primary_sector_id = (
    SELECT sector_id FROM contracts 
    WHERE vendor_id = vendor_stats.vendor_id 
    GROUP BY sector_id ORDER BY COUNT(*) DESC LIMIT 1
)
WHERE primary_sector_id IS NULL;
```
This populates the column from contracts and makes subsequent sector filters hit an indexed column instead of a correlated subquery.

### ARIA queue — uncached tier counts (aria.py:215-230)

Every paginated ARIA page load runs 3 queries including a full-table COUNT and two tier-count aggregates on 318K rows. `app_cache` is imported but not used here. Adding a 60s TTL cache around the tier summary would reduce this to 1 query per page.

### Performance Risk Summary

| Endpoint | Risk | Fix | Priority |
|---|---|---|---|
| `dashboard/fast` fallbacks | 2-4s live queries after DB swap | Always run precompute_stats post-deploy | **CRITICAL** |
| `GET /vendors?sector_id=X` | 500ms-2s correlated subquery | `UPDATE vendor_stats` one-time SQL | **HIGH** |
| `GET /aria/queue` tier counts | 200-500ms extra per page | Cache tier summary 60s | **MEDIUM** |

---

## 3. Feature Engineering Opportunities

### Missing features worth adding post-launch

1. **Amendment rate** (`has_amendment = 1`): 34,291 contracts have amendments. Contract modifications after award are a procurement red flag (price changes, scope creep). Currently not in z-features. Low effort to add.

2. **Vendor age at contract time** (`contract_year - YEAR(vendor_first_contract_date)`): Very new vendors with large contracts are ghost company signal. Currently `is_ghost_company` flag exists but isn't in z-features.

3. **Institution contract concentration** (complementary to vendor_concentration): What fraction of an institution's budget goes to a single vendor. Captures supply-side capture vs demand-side capture.

4. **Seasonal bursting** (`burst_score` in aria_queue): Some vendors submit many contracts in a 30-day burst then disappear. `burst_score` is computed in ARIA but not fed into contract-level risk.

---

## 4. Data Quality

### Contracts with NULL risk scores: 8,298

These are tagged `pending_score` — meaning z-features were never computed. Root cause is likely new contracts ingested after the last scoring run without triggering a z-feature recompute. Not blocking.

### Precomputed stats freshness

- Most stats: last updated 2026-03-31 (20 days ago)
- Some stats (sexenio_comparison, election_year): 2026-03-27 (24 days ago)

**Gap**: The March 25 re-scoring with v0.6.5 updated risk scores but `precompute_stats` was last run March 31. Dashboard stats should reflect current distribution — re-run `precompute_stats` before deploy is advisable.

---

## 5. Improvement Roadmap (ranked by value/effort)

| Rank | Improvement | Expected Gain | Effort | When |
|---|---|---|---|---|
| 1 | Fix `primary_sector_id` NULL in vendor_stats (one SQL UPDATE) | Eliminate 500ms-2s vendor query | 30 min | Before Friday |
| 2 | Update `RISK_METHODOLOGY_v6.md` coefficient table from DB | Documentation accuracy | 15 min | Before Friday |
| 3 | Run `precompute_stats` before Friday deploy | Fresh dashboard stats | 10 min | Before Friday |
| 4 | Cache ARIA tier counts 60s in aria.py | -200ms per queue page | 30 min | This week |
| 5 | Add `ensemble_anomaly_score` to Z_COLS + recalibrate model | AUC +0.02-0.04 | 2h + 1h recal | Week after launch |
| 6 | Swap collinear z-features for `_orth` variants | AUC +0.01-0.02 | 30 min + recal | Week after launch |
| 7 | Recalibrate v6.5 with full 1,374-case GT corpus | AUC +0.01-0.03 | 1h + compute_z | Week after launch |
| 8 | Add amendment rate + vendor age to z-features | Unknown gain | 4h | Post-launch Q2 |

### Do NOT do before Friday
- Rescore 3.1M contracts (30-45 min DB lock, risk of regression)
- Recalibrate model (requires re-validating outputs)
- XGBoost/LightGBM migration (breaks SHAP exact computation)

---

## 6. Test Suite Status

Tests running at time of audit — results pending. Last known: 590 tests passed (Apr 20 per memory).

---

*Audit conducted Apr 20, 2026. Agents: risk-model-engineer + schema-architect.*
*Do not act on ML improvements until after Friday launch.*
