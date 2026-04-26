# RUBLI Data Integrity Plan — v3.0 follow-on

> **Synthesizes the 5-agent data audit from 2026-04-26.** Lists every data-quality gap the audit surfaced, ranks by `risk × effort`, and assigns each to either SHIP NOW (this session) or SONNET HANDOFF. Each Sonnet task is self-contained — file paths, SQL queries, success criteria included.
>
> **Goal:** make the platform's external-facing claims match the underlying data. Today the pitch ("320 priority leads · 1,843 LLM memos · 1,380 GT cases") overstates rigor in ways the audit documented. After this plan ships, the pitch is honest AND the underlying data is more trustworthy.

---

## Section 1 — What the 5 agents found (one-line per win/issue)

### Wins (real)
- **Categories taxonomy is a genuine landmark** — 99.73% coverage on 3.05M contracts, healthy Pareto.
- **GT corpus sector-balanced** — top-5 dominance dropped from 99% (v5.0) to 23.5%.
- **`category_stats` reconciles EXACTLY** with raw `contracts` to 4 decimals.
- **Hand-written T1 memos are publishable** (GRUFESA, BIRMEX, URBANISSA, INFRA, PRAXAIR).
- **GT vendor records have ZERO orphans** — all 911 resolve to a case.
- **`direct_award_rate` is reliable** across canonical sources.
- **P1 Monopoly pattern logic is well-calibrated.**

### 🔴 CRITICAL issues
1. **38% of memos (699/1,843) are template strings, not LLM narratives.** "FUENTES" section is a search prompt, not citations. ZERO URLs anywhere in memo corpus.
2. **FP vendors get accusatory templated memos** (SIEMENS, ABB, BECTON DICKINSON marked `fp_structural_monopoly=1` still get "ACCIÓN: REVISAR_URGENTE"). Only 53% have disclaimers. **Defamation risk.**
3. **T1 = ground_truth_vendors lookup.** All 320 T1 vendors are in GT. Remove the +0.20 IPS boost: 0 of 320 stay in T1. Platform's "320 priority leads" is a sorted GT lookup.
4. **LICONSA avg_risk: 0.88 (raw) vs 0.39 (vendors) vs 0.34 (vendor_stats)** — 2.6× spread for the same vendor.
5. **13,462 vendors have stale `vendors.*` data** (worst: +175% contract inflation).
6. **GRUFESA flagship memo has unit errors**: "$106,800 MXN" instead of "$106.8B MXN".
7. **72 vendors share 10 duplicate memo bodies** (SAE Ghost Contractor Ring memo glued onto 28 persona-física vendors).

### 🟠 HIGH issues
8. **641 of 1,380 GT cases (46.5%) are ORPHANS** (case records with zero vendor links).
9. **`aria_queue.top_institution = NULL` for ALL 318,441 rows** while `top_institution_ratio` is correct.
10. **`aria_queue.max_risk_score = 0.0` for 100% of T1+T2** — broken column.
11. **25.7% of GT cases undated.**
12. **27% of memos have NULL `memo_generated_at`.**
13. **18.1% of category spend in catch-all buckets** (Servicios Generales 7.81% alone is too coarse).
14. **Education / Gobernación / Trabajo each have only 1 category.**
15. **P7 "Conflict of Interest" pattern is a GT echo**, not a real signal (returns 0.50 for any GT-or-EFOS vendor).

### 🟡 MEDIUM issues
16. 15 undocumented values in `review_status` (no schema).
17. Evidence strength rubric is vague — "high" could mean court-filed OR statistical inference.
18. Direct-award unit drift: `78.99%` (`pct`) vs `0.7899` (`rate`).
19. 5 per-sector SHAP rows per vendor with no aggregation.
20. Stale model references in memos — citing v5.1 scores after Mar-25 rescore to v0.6.5.

---

## Section 2 — Triaged backlog (priority × effort)

### 2.1 — SHIP NOW (this session, frontend-only, no pipeline runs)

| # | Fix | File | Why now | Effort |
|---|---|---|---|---|
| N.1 | Honest § 2 La Lente wording | `pages/Executive.tsx` | "320 priority leads" → honest framing distinguishing GT-anchored vs model-discovered | 5m |
| N.2 | FP structural disclaimer banner in AriaMemoPanel | `components/widgets/AriaMemoPanel.tsx` | Defamation risk on SIEMENS/ABB/BECTON. Conditional on `is_false_positive=1` | 15m |
| N.3 | Templated-memo provenance disclaimer | `components/widgets/AriaMemoPanel.tsx` | Detect template heuristically (contains "Buscar manualmente"); show "Memo automático: punto de partida" banner | 20m |
| N.4 | Stale-model-reference notice | `components/widgets/AriaMemoPanel.tsx` | Detect `v5.1` mention; show "Memo escrito antes del rescore Mar 25 — score actual puede diferir" | 10m |
| N.5 | Honest pitch in CLAUDE.md "what we claim" matrix | `CLAUDE.md` | Document the 5 honest revised claims so future agents don't overstate | 10m |
| N.6 | Plan doc itself (this file) | `docs/DATA_INTEGRITY_PLAN.md` | Sonnet handoff manifest | 30m |

**Total this session: ~90 min, 1 commit, immediate prod via auto-deploy.**

### 2.2 — SONNET BACKEND, HIGH PRIORITY (1-3 days each)

These need to run on prod DB or backend pipeline. Sonnet picks up via `claude --resume` and reads this doc.

#### S.1 — Fix `aria_queue.top_institution` name lookup *(1 hr backend)*

**Problem:** All 318,441 rows have `top_institution=NULL` while `top_institution_ratio` is correct. Name-resolution JOIN is missing in pipeline.

**Files:**
- `backend/scripts/aria_pipeline.py` — locate where `top_institution_ratio` is computed (~line 1148)
- Add LEFT JOIN to `institutions(id, siglas)` in the same query

**Success criteria:**
```sql
SELECT COUNT(*) FROM aria_queue WHERE top_institution_ratio > 0 AND top_institution IS NULL;
-- Must return 0 after fix
```

**Optional in-place fix** (no pipeline rerun) — backfill script `backend/scripts/_backfill_aria_top_inst.py`:
```python
UPDATE aria_queue SET top_institution = (
  SELECT siglas FROM institutions WHERE institutions.id = aria_queue.top_institution_id
) WHERE top_institution IS NULL AND top_institution_id IS NOT NULL;
```

---

#### S.2 — Fix `aria_queue.max_risk_score = 0` *(1 hr backend)*

**Problem:** 100% of T1+T2 vendors show `max_risk_score = 0.0`, impossible given non-zero `avg_risk_score`.

**Files:** `backend/scripts/aria_pipeline.py` — locate the vendor query around line 1142 that writes `max_risk_score`. Currently sources from a column that's always 0.

**Fix:** include `MAX(c.risk_score) AS max_risk_score` in the JOIN aggregation against `contracts`.

**Backfill alternative:**
```sql
UPDATE aria_queue SET max_risk_score = (
  SELECT MAX(risk_score) FROM contracts WHERE contracts.vendor_id = aria_queue.vendor_id
);
```

**Success criteria:** `SELECT COUNT(*) FROM aria_queue WHERE total_contracts > 0 AND max_risk_score = 0;` returns 0.

---

#### S.3 — Add `memo_provenance` + `memo_status` columns *(2 hr backend + 1 hr frontend)*

**Problem:** No column distinguishes templated-memo vs LLM-narrative vs human-curated. UI can't honestly demote 699 templates.

**Schema migration:**
```sql
ALTER TABLE aria_queue ADD COLUMN memo_provenance VARCHAR(20);  -- template / llm / human
ALTER TABLE aria_queue ADD COLUMN memo_status VARCHAR(20);      -- auto / reviewed / approved / rejected
```

**Backfill script** `backend/scripts/_classify_memo_provenance.py`:
```python
# Classify the 1,843 memos:
# - Contains "Buscar manualmente en" → template
# - Length < 500 → stub (analyst note)
# - GT-anchored + > 1500 chars + cites source name → llm_narrative
# - Else → llm_basic
# Set memo_status = 'auto' for all (no human review yet)
```

**Frontend integration:** when `memo_provenance='template'`, AriaMemoPanel renders the disclaimer banner from N.3.

---

#### S.4 — Add FP-vendor disclaimer + regenerate accusatory FP memos *(1 day)*

**Problem:** SIEMENS, ABB, BECTON DICKINSON (`fp_structural_monopoly=1`) get templated memos with "ACCIÓN: REVISAR_URGENTE" — this is the platform's biggest defamation risk.

**Two-pronged fix:**

a) **Frontend (already covered by N.2)**: render disclaimer banner when `is_false_positive=1` regardless of memo content.

b) **Backend regeneration script** `backend/scripts/_regenerate_fp_memos.py`:
   - SELECT all vendors WHERE is_false_positive=1 AND memo_text IS NOT NULL
   - For each: prepend the canonical FP-banner block to memo_text:
     ```
     ⚠️ MARCADO COMO FALSO POSITIVO ESTRUCTURAL
     Este vendor es un proveedor multinacional o estructural. La concentración
     refleja su posición de mercado, no evidencia de fraude. Este perfil se
     mantiene únicamente para transparencia metodológica.
     Razón: {fp_reason}
     ```
   - Update memo_text in DB.

**Success criteria:** 100% of `is_false_positive=1` memos start with the disclaimer block.

---

#### S.5 — Triage 641 orphan GT cases *(2-3 days mining)*

**Problem:** 46.5% of GT cases have ZERO vendor links. They inflate the corpus count but contribute nothing to model training.

**Plan:**
```sql
SELECT id, case_id, case_name, case_type, notes
FROM ground_truth_cases
WHERE NOT EXISTS (
  SELECT 1 FROM ground_truth_vendors WHERE case_id = ground_truth_cases.id
);
-- ~641 rows
```

For each orphan:
1. Search `vendors` by name fragments from `case_name`
2. Check `notes` for vendor RFCs
3. If matched: INSERT into `ground_truth_vendors`
4. If no match found after 3 attempts: archive (set `case_type='archived_orphan'`) — keeps the record but excludes from training

**Success criteria:** orphan count drops from 641 to <50 in 4 weeks.

---

#### S.6 — Post-ETL refresh + integrity report *(1 day)*

**Problem:** `vendors.total_contracts`, `vendors.total_amount_mxn`, `vendors.avg_risk_score` drift from `vendor_stats` and raw `contracts`. 13,462 vendors carry stale data.

**Files:**
- New `backend/scripts/_refresh_vendors_from_contracts.py`
- Integration in `backend/scripts/etl_pipeline.py` post-ETL hook

**Logic:**
```python
# For every vendor, recompute:
#   total_contracts, total_amount_mxn, avg_risk_score,
#   first_contract_date, last_contract_date
# from raw contracts table.
# Compare to existing vendors.* values.
# If any field drifts > 0.1%: log to data_integrity_report table and FAIL the pipeline.
```

**New table:**
```sql
CREATE TABLE data_integrity_report (
  run_id VARCHAR(64),
  ran_at TIMESTAMP,
  table_name VARCHAR(64),
  field_name VARCHAR(64),
  delta_count INTEGER,
  delta_pct REAL,
  worst_case_id INTEGER,
  notes TEXT
);
```

**Success criteria:** weekly cron run; pipeline fails loudly if drift > 0.1%; UI surfaces "data integrity score" on /executive § 9 Procedencia.

---

### 2.3 — SONNET BACKEND, MEDIUM PRIORITY (1+ week each)

#### S.7 — Remove +0.20 GT boost from IPS *(1 day code + recompute pipeline)*

**Problem:** T1 = sorted GT lookup. The +0.20 IPS boost from `external_flags_score=1.0` for GT vendors guarantees T1 placement. Platform has zero data on its real discovery rate.

**Risk:** rebalances T1/T2/T3/T4 counts and changes the public face of the platform. Needs careful rollout.

**Plan:**
1. Add `gt_overlay BOOLEAN` column to `aria_queue` for display purposes
2. Modify `aria_pipeline.py:84-101` `compute_external_flags_score()`:
   - Old: `if in_gt: return 1.0`
   - New: `return base_external_score`  (don't boost for GT)
3. After re-run: count vendors that REMAIN in T1 by pure-signal IPS
4. Update `/api/v1/aria/discovery-stats` to expose:
   ```json
   { "t1_total": N, "t1_gt_anchored": N1, "t1_model_discovered": N2 }
   ```
5. Frontend update: AriaQueue rows show explicit "GT" vs "Discovery" badge
6. Honest /executive copy: "X T1 leads · Y are documented (GT) · Z are model-discovered"

**Success criteria:** pure-signal T1 count stable across runs; we can finally claim a real discovery rate.

---

#### S.8 — Standardize evidence rubric *(1 week, mostly research)*

**Problem:** "high" evidence_strength label means anything from court-filed to statistical inference.

**New rubric (in `.claude/gt-evidence-rubric.md`):**

| Tier | Label | Evidence type | Weight |
|---|---|---|---|
| 5 | AUDIT_CONFIRMED | ASF / SAT / federal audit citation | 1.0 |
| 4 | COURT_FILED | Court filing, sentence, amparo decision | 1.0 |
| 3 | INVESTIGATIVE | Named publication + date (NYT, Animal Político, ProPublica) | 0.8 |
| 2 | STATISTICAL_ANOMALY | Inferred from price_volatility, concentration, single-bid >80% | 0.5 |
| 1 | UNCONFIRMED | Suspicious but no external corroboration | 0.2 |

Map all 929 GT vendors to one tier. Use as `curriculum_weight` in next model recalibration.

**Success criteria:** every GT vendor has explicit evidence_tier; weights replace the vague `high/medium/low/strong/circumstantial/...` strings.

---

#### S.9 — Add structured citation metadata *(1 day schema + ongoing backfill)*

**Problem:** `notes` column is free-text researcher narrative; 0 of 5 sampled cases had URLs.

**Schema:**
```sql
ALTER TABLE ground_truth_cases ADD COLUMN audit_report_ref VARCHAR(255);    -- "ASF 2021-0234"
ALTER TABLE ground_truth_cases ADD COLUMN court_filing_url VARCHAR(500);
ALTER TABLE ground_truth_cases ADD COLUMN investigation_source VARCHAR(100); -- "Animal Político", "SFP"
ALTER TABLE ground_truth_cases ADD COLUMN media_coverage_urls TEXT;          -- JSON array of URLs
```

**Backfill:** for cases that already cite ASF/SFP in `notes`, extract via regex into structured fields. The rest are manual research over months.

---

### 2.4 — SONNET TAXONOMY WORK (multi-week)

#### S.10 — Split "Servicios Generales" *(2 weeks)*
212K contracts in one bucket. Split into Servicios Profesionales / Limpieza / Administrativos / Diversos. Files: `backend/scripts/etl_classify.py` + `categories` table.

#### S.11 — Expand under-represented sectors *(4 weeks)*
Education / Gobernación / Trabajo each get 5-6 categories instead of 1. Specifically Education needs: Textbooks / School Meals / Student Transportation / Campus Infrastructure / Administration.

#### S.12 — 5 missing top-level categories *(6 weeks)*
Telecomunicaciones · Agua y Saneamiento · Educación Básica · Seguridad Social · Electricidad y Gas Distribución.

#### S.13 — Document keyword taxonomy maintenance SLA *(research, then doc)*
Was the 91-category list ML-clustered, hand-designed, or hybrid? Who maintains keywords? Quarterly review process? — write `docs/CATEGORY_TAXONOMY_PROCESS.md`.

---

### 2.5 — FRONTEND INTEGRATION (after data fixes land)

These wire the new backend integrity into the user-facing surfaces. Each is a 1-2 hour Sonnet task.

| # | Surface | What to show |
|---|---|---|
| F.1 | `/executive` § 9 Procedencia | Live "data integrity score" pulled from `data_integrity_report` (S.6). "Last verified [date]; 0 anchors drifted >0.1%." |
| F.2 | AriaQueue row badge | "GT" vs "Discovery" tag (S.7) |
| F.3 | `/methodology` | Section: "Real ARIA discovery rate" with pre/post GT-boost comparison (S.7) |
| F.4 | VendorHero | Evidence tier badge from new rubric (S.8) — "AUDIT-CONFIRMED" / "COURT-FILED" / etc. |
| F.5 | AriaMemoPanel | When `memo_provenance='template'` → demoted card style + disclaimer (already shipped in N.3, just needs the column) |
| F.6 | `/categories` index page | Catch-all warning: "18.1% of spend in catch-all buckets — see /methodology for taxonomy gaps" |
| F.7 | CaseDetail § 7 Signos | Citation chip per source (S.9) — clickable to URL |

---

## Section 3 — Honest pitch matrix

After the data fixes, the platform's external-facing claims are honest:

| Old claim | Honest version |
|---|---|
| "320 Tier-1 priority leads" | "320 GT-anchored T1 + N model-discovered T1 (after S.7 ships)" |
| "1,843 vendor LLM memos" | "440 LLM-narrative memos · 699 templated search prompts (visually demoted) · 618 analyst stubs" |
| "1,380 documented corruption cases" | "739 cases with vendor evidence · 641 orphan placeholders pending mining (S.5)" |
| "$2.84T MXN estimated fraud" | "$2.84T summed from estimated_fraud_mxn across cases (41 cases NULL on this field)" |
| "91-category auto-classification" | "72 active categories covering 99.73% of contracts. Education/Gobernación/Trabajo each have only 1 category — see roadmap." |
| "Auto ARIA discovery" | "T1 ranked by IPS = 60% risk-model + 20% external (GT/EFOS/SFP) + 20% financial. After S.7: distinguishable as GT-anchored vs Discovery." |

---

## Section 4 — Sonnet handoff template

When a new Sonnet session picks up this work:

```
You are continuing the RUBLI v3.0 data-integrity work. The plan is locked
in docs/DATA_INTEGRITY_PLAN.md. Read it first.

Today's task: [pick ONE from § 2.2 / 2.3 / 2.4 / 2.5]

Hard rules:
1. Don't run scripts that touch the prod DB without confirming the success
   criteria locally first. Use backend/RUBLI_NORMALIZED.db (source) to test.
2. Every backend change ships as a script under backend/scripts/ AND a
   migration entry in backend/scripts/etl_create_schema.py if schema-changing.
3. Every frontend change must pass: npm run lint:tokens && npx tsc --noEmit
   --project tsconfig.app.json && npm run build.
4. Commit message format: "feat(data S.N): brief description" or
   "fix(data S.N): ..." referencing the plan task ID.
5. After commit: git push origin main. Auto-deploy fires via the GitHub
   Action (already fixed in 2906ec1). Verify https://rubli.xyz health.

Stop after one task. Don't chain. Report what you shipped.
```

---

## Section 5 — Success metrics

Run weekly via `scripts/data_health_check.sh` (to be written):

| Metric | Today | 4-week target | 12-week target |
|---|---|---|---|
| GT cases with vendor links | 54% | 90% | 95% |
| Memos with `memo_provenance` set | 0% | 100% | 100% |
| Memos labeled `template` displayed without disclaimer | 100% | 0% | 0% |
| FP vendors with disclaimer banner | 53% | 100% | 100% |
| `aria_queue.top_institution` populated | 0% | 100% | 100% |
| `aria_queue.max_risk_score > 0` for vendors w/ contracts | 0% | 100% | 100% |
| `vendors.*` drift from `contracts` (worst case) | +175% | <0.1% | <0.1% |
| Categories in catch-all buckets (% spend) | 18.1% | 12% | 8% |
| Single-category sectors (Education/Gobernación/Trabajo) | 3 | 0 | 0 |
| ARIA T1 with `gt_overlay` flag | n/a | 100% | 100% |
| Stories cited with structured URLs | 0% | 30% | 70% |

---

## Section 6 — How this connects to the 4 blueprint docs

This plan is the **data-side counterpart** to the frontend-side plan in `FRONTEND_V3_PLAN.md`. Both feed the dossier scheme:

- `VENDOR_DOSSIER_SCHEME.md § 7 Los Signos` — needs S.8 evidence rubric + S.9 structured citations to render real source chips
- `VENDOR_DOSSIER_SCHEME.md § 8 El Veredicto` — needs S.4 FP disclaimer wiring to honestly distinguish "estructural" from "fraude"
- `SITE_SKELETON.md Category Dossier` — needs S.10/S.11/S.12 expanded taxonomy to be a real landmark
- `SITE_IA.md /executive` — needs F.1/F.3 to surface live integrity stats

When all S.* tasks land, the platform's pitch and underlying data are aligned. Until then, the N.* fixes (this session) ship the honesty disclaimers so the platform doesn't overclaim while we close the data gaps.

---

*Plan written: 2026-04-26. Sonnet handoff ready.*
