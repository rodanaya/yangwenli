# RUBLI — Project Locked at v3.0

> **Locked: 2026-04-26.** No more scope expansion. No new features. No new sections. No new pages. The platform IS what it is. From here we ship fixes for things that don't work, and we polish what does.

---

## Why this lock exists

The owner (rod.anaya) has been building this for months and is exhausted. The platform has real, valuable, working pieces — and a tail of half-finished, redirect-only, or broken-link entries that erode trust. This doc draws a line: what's IN, what's OUT, what "done" means.

Anything not in this doc is **out of scope** for v3.0. Anything in `OUT OF SCOPE` is explicitly killed for v3.0 and may return as v3.1 or never.

---

## v3.0 — IN SCOPE (this is the product)

### Pages that exist and work
1. **`/` Inteligencia Nacional** (also called Executive Brief) — the front page. Hero headline + KPIs + § 2 La Lente platform self-portrait + § 5 Historias Ejemplares (3 example dossiers) + 3 Signal Cards + 10-case timeline + recommendations + footer. **One page. No `/executive` duplicate.**
2. **`/aria` La Cola** — priority queue, T1-T4, pattern filter, vendor rows, review workflow.
3. **`/workspace` Mi Espacio** — watchlist + dossiers + saved searches.
4. **`/cases` Casos** — Case Library with documented corruption cases.
5. **`/cases/:slug`** — Case Detail.
6. **`/sectors`** — 12-sector index.
7. **`/sectors/:id`** — Sector Profile.
8. **`/institutions`** — Institution League (ranking).
9. **`/institutions/:id`** — Institution Profile.
10. **`/institutions/compare`** — A-vs-B compare.
11. **`/vendors/:id`** — Vendor Profile (4-tab structured: evidence / activity / network).
12. **`/thread/:id`** — Vendor RedThread (6-chapter narrative). Co-exists with `/vendors/:id`.
13. **`/vendors/compare`** — Vendor A-vs-B.
14. **`/contracts`** — Contracts table (filtered by `?vendor_id=...&institution_id=...&category_id=...`).
15. **`/contracts/:id`** — Contract Detail.
16. **`/network`** — Network landing.
17. **`/captura`** — Captura Heatmap (renamed from `/capture`).
18. **`/journalists` Sala de Redacción** — published stories + drafts.
19. **`/stories/:slug`** — Story Narrative.
20. **`/methodology`** — Model documentation.
21. **`/administrations`** — Sexenio comparison.
22. **`/intersection`** — Cross-cut category × institution.
23. **`/categoryProfile/:id`** (CategoryProfile.tsx exists) — Category drill-in.
24. **`/login` `/register` `/settings` `/privacy` `/terms`** — auth + legal.

### Sidebar (LOCKED at 4 sections / 12 items)
```
DESCUBRIR     Inteligencia Nacional · Sala de Redacción
INVESTIGAR    La Cola (ARIA) · Mi Espacio · Casos
EXPLORAR      Sectores · Instituciones · Red
ANÁLISIS      Captura · Administraciones · La Intersección
PLATAFORMA    Metodología
```
**Every entry leads to a working page. No redirects-to-self. No 404s.**

### Data infrastructure
- **3.05M contracts** classified, scored with v0.6.5 model (AUC 0.828 vendor-stratified)
- **1,380 GT cases** in corpus (739 with vendor links, 641 awaiting mining)
- **318K vendors** in ARIA queue, 4-tier IPS ranking
- **1,843 vendor memos** classified by provenance (524 LLM-narrative · 699 template · 548 stub · 72 duplicate)
- **72 active categories** auto-classified (99.73% spend coverage)
- **Risk model v0.6.5** locked. No more recalibration in scope.

### Design system
- Cream broadsheet aesthetic locked
- 5 unifying primitives: `<DotBar>`, `<StatRow>`, `<PriorityAlert>`, `<SortHeaderTh>`, `<EntityIdentityChip>`
- Token-hygiene CI gate prevents regression
- `getRiskLevelFromScore` from `@/lib/constants` is the only valid risk-threshold path

### Honesty layer (the trust banners)
- FP-structural disclaimer on AriaMemoPanel when `is_false_positive=1`
- Templated-memo demotion banner when `memo_provenance='template'`
- Stale-model-reference notice when memo cites v5.x scores
- Honest pitch matrix in CLAUDE.md prevents future overclaiming

---

## v3.0 — OUT OF SCOPE (explicitly killed)

These were aspirational entries that never landed. They are NOT shipping in v3.0. They are NOT on the roadmap. They are NOT being worked on.

| Killed | Why |
|---|---|
| Standalone `/executive` page | Same content as `/` Inteligencia Nacional. One page. Sidebar duplicate removed. |
| `/categories` index page | CategoryProfile pages exist for individual categories; no top-level index until taxonomy expansion happens (S.10-S.13 — out of scope) |
| `/patterns` index + Pattern Dossier | The 9-dossier scheme included Pattern dossiers; not built; not shipping |
| Network Dossier `/network/community/:id` | Same — concept exists in skeleton doc; no implementation |
| Investigation Dossier `/investigation/:id` | Workspace covers user investigations; separate dossier route not shipping |
| Story Dossier as separate template | Stories already render via `/stories/:slug`; no parallel dossier-template version |
| `<EntityIdentityChip>` rolled out across 28 surfaces | Built and used in § 5 Historias Ejemplares only. The "1 chip everywhere" rollout is multi-day work; not shipping in v3.0. |
| `useEntity()` universal data hook | `useVendorData` is enough. Universal hook out. |
| GT-boost removal from IPS (S.7) | Material change to T1 distribution. Needs deliberate session with go-ahead. Honesty banners cover the gap until then. |
| Backend regenerate FP memos with prepended disclaimer (S.4) | Frontend banner does the work. Backend prepend is belt-and-suspenders. Out. |
| 641 orphan GT case mining (S.5) | 2-3 day mining batch. Out of v3.0; v3.1 candidate. |
| Post-ETL `vendors.*` refresh (S.6) | `vendor_stats` is canonical; raw `vendors.*` is documented as `legacy`. No script for v3.0. |
| Evidence rubric standardization (S.8) | Vague "high/medium/low" labels stay for v3.0. |
| Category taxonomy expansion (S.10-S.13) | 6+ weeks. v3.1 candidate. |

---

## What "v3.0 is done" means (verifiable)

A v3.0 user opening `https://rubli.xyz` on phone or desktop should see:

1. ✅ Sidebar with **only working entries** (no 404, no redirect-to-self)
2. ✅ Landing page (`/`) renders Inteligencia Nacional / Executive Brief with § 2 La Lente platform self-portrait + § 5 Historias Ejemplares chip cards
3. ✅ Click any vendor in any list → Vendor Profile renders. AriaMemoPanel shows the dossier. Templated/FP/stale memos show appropriate disclaimer banners.
4. ✅ Click "Hilo / Thread" CTA on Vendor Profile → opens narrative scroll
5. ✅ ARIA Queue shows real `top_institution` names (not "—") and real `max_risk_score`
6. ✅ Methodology page renders honestly with v0.6.5 details
7. ✅ Backend tests: 691/691 passing
8. ✅ Frontend gates: tokens / tsc / build all PASS
9. ✅ Auto-deploy: `git push origin main` ships to https://rubli.xyz in <5 min

If any of these is NOT true, that's the bug list to close before declaring v3.0 done.

---

## Current state vs the lock (2026-04-26 17:00)

| Lock criterion | Status | Notes |
|---|---|---|
| Sidebar with only working entries | **Just shipped (this commit)** — Brief Ejecutivo, Patrones, Categorías removed |
| `/` renders La Lente + Historias | **Source has it; deploy stale.** Force-rebuild in flight. |
| Vendor Profile shows ARIA memo | **Backend serves now. Frontend deploy pending.** API endpoint fix shipped. |
| AriaQueue real top_institution | **DONE LIVE.** 318,285 rows backfilled. |
| max_risk_score real | **DONE LIVE.** 318,441 rows backfilled. |
| Memo disclaimer banners | **Source has them; deploy stale.** |
| Backend tests pass | **691/691 ✓** |
| Frontend gates pass | **✓** all 3 |
| Auto-deploy works | **Partial** — rsync excludes work, build runs, ps post-step fails cosmetically |

---

## The handoff rule (read this if you're picking up later)

If you're a future Claude session resuming this project:

1. **Read this doc first.** It IS the source of truth for what RUBLI is.
2. **If the user asks for a new page or feature**, point at the OUT OF SCOPE list. Don't start coding. Ask: "this is parked at v3.0 lock — should we reopen scope?"
3. **If a page is broken**, fix it. That's in scope.
4. **If a number is wrong on prod**, fix it. That's in scope.
5. **If a deploy fails**, fix the deploy. That's in scope.
6. **If you're tempted to add a new section to a working page**, don't. Polish the existing sections.

The way to honor the owner's exhaustion is to STOP ADDING and START FINISHING.

---

*Locked. Signed off by Opus 2026-04-26.*
