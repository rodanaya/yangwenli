# RUBLI Frontend v3.0 — Execution Plan

> **The "v3.0 Dossiers" release.** Consolidates the 3 blueprint docs into a sequenced execution plan. Designed to be picked up by Sonnet (cheaper / faster) for the legwork after Opus locked the design.

**Started:** 2026-04-26
**Target ship:** rolling — every commit deploys via the auto-deploy GitHub Action (just fixed)
**Version:** 2.1.0 → **3.0.0** (major: full IA restructure, 9-entity dossier model, unified primitive)

---

## What v3.0 IS

The transformation from "28 disconnected vendor surfaces" to "one coherent dossier-driven hypertext platform." Built on the 3-doc blueprint:

1. **`VENDOR_DOSSIER_SCHEME.md`** — 10-section editorial template + 5 trust-manifest invariants
2. **`SITE_SKELETON.md`** — 9 dossier templates + 5 macro landings + 3 tools + cross-reference graph
3. **`SITE_IA.md`** — URL scheme + nav restructure + 5 user journeys + persistent UI

---

## The 5 visible v3.0 outcomes (what users will see)

1. **Categorías nav entry + Category Dossiers go live.** The 91 auto-classified spending categories become first-class — searchable, browsable, dossiered. (The user-flagged "landmark.")
2. **`<EntityIdentityChip>` everywhere.** 28 surfaces get one consistent vendor/institution/category cell with the same name, same risk encoding, same hover-card.
3. **The buried 5,800-char ARIA memo surfaces** on every Vendor Dossier as `§ 1 Lede` + structured `§ 7 Signos`.
4. **5 new sidebar entries** (Categorías · Patrones · Sala de Redacción · Brief Ejecutivo · Mi Espacio).
5. **Trust manifest invariants enforced** — same vendor reads same risk + same numbers across all 28 surfaces.

---

## Phased crunch — 4 phases, agent-friendly

Every milestone is a single commit with a clear gate. **Each task can be picked up by Sonnet without context** — the design is locked, the file paths are explicit, the success criteria are measurable.

### Phase 1 — Glue layer (1 day · 5 commits)

| # | Task | Files | Effort | Status |
|---|---|---|---|---|
| P1.1 | `formatEntityName` per type | `lib/entity/format.ts` | 1h | ✅ shipped (4111b9a) |
| P1.2 | `<EntityIdentityChip>` primitive | `components/ui/EntityIdentityChip.tsx` | 4h | ✅ shipped (4111b9a) |
| P1.3 | `lib/entity/lede.ts` — `getLedeFor(type, data)` returns 80-word synth | NEW | 2h | TODO |
| P1.4 | `lib/entity/verdict.ts` — `getVerdictFor(type, data)` returns 4-bucket classification | NEW | 2h | TODO |
| P1.5 | `hooks/useEntity.ts` — universal data fetcher with shared cache key | NEW | 1h | TODO |

**Sonnet handoff for P1.3-P1.5:** read `VENDOR_DOSSIER_SCHEME.md § 1 Lede`. Build the lede synthesizer reading from `aria_queue.memo_text` first (truncate to ~80 words), template fallback otherwise. Verdict reads `ground_truth_vendors.fp_reason` for vendors, `category_stats.direct_award_pct + concentration` for categories. `useEntity(type, id)` is one TanStack hook with key `['entity', type, id]` — replaces the per-page `useQuery` calls for vendors / institutions / categories.

### Phase 2 — Visible IA changes (1 day · 6 commits)

| # | Task | Files | Effort | Status |
|---|---|---|---|---|
| P2.1 | Add 5 sidebar entries (Categorías · Patrones · Sala de Redacción · Brief Ejecutivo · Mi Espacio) | `components/layout/Sidebar.tsx` + `i18n/locales/{en,es}/nav.json` | 30m | TODO |
| P2.2 | Rename `/capture` → `/captura` with redirect | `App.tsx` + i18n | 10m | TODO |
| P2.3 | Wire `<EntityIdentityChip>` into AriaQueue rows (highest-traffic surface) | `pages/AriaQueue.tsx` | 1h | TODO |
| P2.4 | Wire `<EntityIdentityChip>` into Watchlist + ResultsTable + CommandPalette | 3 files | 2h | TODO |
| P2.5 | Render `aria_queue.memo_text` on VendorEvidenceTab as `§ 1 Lede` | `components/vendor/VendorEvidenceTab.tsx` | 30m | TODO |
| P2.6 | Add "Build Investigation Thread →" CTA to VendorHero | `components/vendor/VendorHero.tsx` | 5m | TODO |

**Sonnet handoff for P2:** read `SITE_IA.md` for sidebar restructure (5 sections / 14 items). Read `SITE_SKELETON.md` for the 9 entity types and which pages call which entity. The chip swap is mechanical: find `<Link to={`/vendors/${id}`}>{name}</Link>` patterns and replace with `<EntityIdentityChip type="vendor" id={id} name={name} riskScore={r} ariaTier={t} />`.

### Phase 3 — The 3 highest-leverage dossiers (1 week · 15-20 commits)

| Dossier | Why first | Effort |
|---|---|---|
| **Category Dossier** (NEW) | The user-flagged landmark; needs full build | 3 days |
| **Vendor Dossier** (complete the 10 sections) | Highest reader volume; partial today | 2 days |
| **Institution Dossier** (§ 2 Categorías) | Cross-link target for Category — both must ship together | 2 days |

**Build order per dossier (same template):**
1. Backend endpoint + data shape (review if exists)
2. Page component + § 0 Cabecera + § 1 Lede
3. § 2-9 sections one at a time
4. § 10 Acciones + Procedencia footer
5. Cross-link `<EntityIdentityChip>` rendering

**Sonnet handoff for P3:** read `VENDOR_DOSSIER_SCHEME.md` for section template. For Category, see worked example. Each section is a self-contained component. Build `Category20Hero.tsx`, `CategoryDemandSection.tsx`, etc. then compose them.

### Phase 4 — Remaining 6 dossiers + macro refresh (2 weeks)

| Item | Effort |
|---|---|
| Sector Dossier | 2 days |
| Case Dossier | 2 days |
| Pattern Dossier (NEW) | 2 days |
| Network Dossier | 2 days |
| Investigation Dossier | 2 days |
| Story Dossier (refresh existing) | 1 day |
| Refresh `/` (Inteligencia Nacional) to surface dossier chips | 1 day |
| Refresh `/aria` to use chips + tier badges consistently | 1 day |
| Refresh `/explore` faceted search → all results as chips | 1 day |
| Refresh `/journalists` (Sala de Redacción) | 1 day |
| Refresh `/executive` (Brief Ejecutivo) | 1 day |

---

## Hard rules (every commit must respect)

These are extracted from the trust manifest in `VENDOR_DOSSIER_SCHEME.md`:

1. **`<EntityIdentityChip>` is the ONLY way** to render an entity outside its own dossier. Plain `<Link to={\`/vendors/${id}\`}>{name}</Link>` is forbidden.
2. **Risk thresholds via `getRiskLevelFromScore`** from `@/lib/constants`. No inline ladders. v0.6.5 thresholds (0.60/0.40/0.25).
3. **Vendor names through `formatVendorName`** (or `formatEntityName(type, name, size)`). No raw `{vendor.name}` or `toTitleCase(vendor.name)`.
4. **Canonical data sources**: `vendor_stats.*` for vendor numbers, `category_stats.*` for categories, `institution_stats.*` for institutions. Deprecate raw `vendors.avg_risk_score` (3-source disagreement).
5. **Risk copy**: "indicador de riesgo" / "risk indicator" — never "X% probability of corruption".
6. **Spanish § kickers** for editorial sections. English fallback via i18n.
7. **No green for low risk** (Bible §3.10). `low` renders as `text-text-muted`.
8. **Token gate must pass**: `npm run lint:tokens && npx tsc --noEmit && npm run build` before every commit.
9. **Every commit message cites which doc + section it implements**: e.g. `feat(dossier P3 § 2): Category Dossier La Demanda section`.
10. **Backend invariants unchanged**: 691/691 tests pass.

---

## Sonnet handoff template

When a Sonnet session picks up this work, the prompt should include:

```
You are continuing the RUBLI Frontend v3.0 build. The design is locked
in 4 docs (read in order):
1. docs/FRONTEND_V3_PLAN.md  ← THE EXECUTION PLAN (this doc)
2. docs/VENDOR_DOSSIER_SCHEME.md  ← the 10-section editorial template
3. docs/SITE_SKELETON.md  ← 9 dossiers + 5 landings + 3 tools
4. docs/SITE_IA.md  ← URL scheme + nav + journeys

Your job today: ship task [P2.1] from FRONTEND_V3_PLAN.md.

Hard rules: see "Hard rules" section in FRONTEND_V3_PLAN.md.
Don't redesign anything. Don't refactor adjacent code. Don't add features
not in the spec. Just ship the task, run gates (npm run lint:tokens
&& npx tsc --noEmit && npm run build), commit with the convention
"feat(skeleton P2.1): ...", and push (auto-deploys via GitHub Action).
```

---

## Version bump

`frontend/package.json`: 2.1.0 → 3.0.0
`frontend/src/components/layout/AppBanner.tsx`: "RUBLI v2.1" → "RUBLI v3.0" + new localStorage key `rubli_banner_v30`
`docs/MARATHON_FINAL.md`: append v3.0 section as the next chapter

---

## What this DOES NOT do

- Backend changes (separate concern; backend is at 691/691 tests, stable)
- Database migrations (no schema changes needed for v3.0; everything reads from existing tables)
- Model changes (v0.6.5 is locked)
- Auth changes (already shipped Apr 20)

If a Phase 3 dossier section needs a new endpoint, that's a separate backend PR with its own approval gate.

---

## What "v3.0 done" looks like

Open `https://rubli.xyz`. Sidebar has 5 sections / 14 items including Categorías. Click Categorías → grid of 91 chips. Click Medicamentos y Farmacéuticos chip → Category Dossier opens with § 0-10 in order, Spanish kickers, real data. § 3 La Oferta shows GRUFESA as `<EntityIdentityChip>` with risk dot + T1 badge + GT flag. Click GRUFESA → Vendor Dossier opens with the 5,800-char ARIA memo synthesized into § 1 Lede + structured § 7 Signos. § 7 has clickable Case 36 chip. Click Case 36 → Case Dossier. Three clicks, four dossiers, one coherent story.

That's the bar.

---

*End of plan. Hand off to Sonnet.*
