# RUBLI PAGE CHARTER

> **Status: ACTIVE** · Adopted 2026-06-09 · DESIGNUS panel synthesis (winning skeleton + grafted exhibit discipline and folio voice)
> **Authority:** This charter supersedes the *section-structure* guidance in `docs/VENDOR_DOSSIER_SCHEME.md` and `docs/SITE_SKELETON.md` wherever they conflict. The trust-manifest invariants from those documents survive unchanged in §IV.
> **The spec is live code.** The four shipped operational dossiers — `VendorDossier`, `InstitutionDossier`, `SectorDossier`, `CategoryDossier` — already agree on a grammar. Every other page converges to them. They are never churned to match new naming: no kicker renames on compliant pages, no hero collapses (`InstitutionDossier`'s DualSeal two-lens hero is intentional and stays).

**Reader contract — every page answers four questions in 5 seconds:** *Where am I? What entity is this? What does RUBLI claim? Where do I go next?* A page that cannot answer all four fails review.

---

## I. THE THREE ARCHETYPES

Every routed surface maps to exactly one archetype. §V assigns all routes.

### Archetype A — DOSSIER (`/vendors/:id`, `/institutions/:id`, `/sectors/:id`, `/categories/:id`, `/cases/:slug`, `/patterns/:code`, `/contracts/:id`)

The entity-answering machine. Locked order:

| Slot | § Kicker | Job (reader question) |
|---|---|---|
| **A0 · Spine** | *(none)* | "Where am I?" — `WayfindingSpine`: breadcrumb up-link + sibling stepper (prev/next · N de M) + origin-row restore |
| **A1 · Cabecera** | *(none)* | "What entity?" — `formatEntityName` title (Playfair 700), RFC/years, badges |
| **A2 · El Veredicto** | *(rides in hero)* | "So what?" — ≤12-word verdict + ONE anchor number, **above the fold**. The charter's central move: the verdict travels with the hero, never deferred to §8 |
| **A3 · El Lede** | `§ · EL LEDE` | 80-word synthesized "why this matters" |
| **A4 · El Tablero** | `§ I · …` | StatStrip (3–5 anchor numbers) + DiagnosticGrid |
| **A5–An · Exhibits** | `§ II…N · [SPANISH KICKER]` | entity-specific deep-dive — one finding per exhibit, cross-linked |
| **An+1 · La Coda** | `§ · ADÓNDE IR` | exit ramps: ≥1 investigate CTA + ≥2 `EntityIdentityChip` |
| **A∞ · Procedencia** | *(footer)* | `ProvenanceFooter` — freshness, methodology link, dateline |

### Archetype B — INDEX / LANDING (`/dashboard`, `/aria`, `/sectors`, `/categories`, `/institutions`, `/cases`, `/journalists`, `/captura`)

An index is **a finding plus a ledger — never a bare grid**. Canonical kicker strings apply to NEW and MIGRATED pages only; never force renames on already-shipped compliant pages.

| Slot | § Kicker | Job |
|---|---|---|
| **B0 · Folio** | *(none)* | Surface nameplate: Playfair title + one-line dek + dateline. **NO verdict seal** — a section has no single verdict |
| **B1 · El Saldo** | `§ EL SALDO` | **Required.** The collection's single most important finding **as a sentence with numbers — NOT a KPI grid**. 1–3 computed leads (`FindingsBand`). Kills the folio→table dead jump |
| **B2 · El Filtro** | *(controls)* | Tier/sector/sort controls — ONE unified header, never two competing |
| **B3 · El Registro** | `§ EL REGISTRO` | The ranked ledger — every row routes via `EntityIdentityChip` |
| **B4 · La Síntesis** | *(optional)* | Treemap / distribution disclosure below the register |
| **B∞ · Procedencia** | *(footer)* | `ProvenanceFooter` |

An optional `§ HALLAZGOS` card row (2–4 finding cards: claim + number + reference point) may sit between B1 and B3.

### Archetype C — NARRATIVE / TOOL (`/stories/:slug`, `/atlas`, `/` + `/explore` → SpatialMap, `/network`, `/administrations`, `/methodology`)

| Slot | § Kicker | Job |
|---|---|---|
| **C0 · Spine** | *(none)* | Breadcrumb up-link; stories add prev/next article nav |
| **C1 · Banner** | *(masthead)* | Outlet/dateline/author OR instrument masthead — tools MUST name their controls (lens, scrubber, drill) here |
| **C2 · Capítulos / Exhibits** | per-chapter | Variant layout engine (stories) or instrumented interactive canvas (tools) |
| **C3 · La Coda** | `§ · ADÓNDE IR` | Investigate CTA + related-entity chips (stories link Case+Vendor; methodology links Sectores/Patrones/La Cola) |
| **C∞ · Procedencia** | *(footer)* | `ProvenanceFooter`, or a provenance microline in fixed chrome for full-viewport tools |

§ kicker styling everywhere: `text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted`, Spanish-first, English via i18n.

---

## II. SECTION GRAMMAR

**Heroes (A1+A2 fused).** Identity line in Playfair 600/700 via `formatEntityName(type, name, size)`. The verdict seal sits IN the hero block. Verdict copy ≤12 words, paired with the page's single most important number contextualized against a reference point (OECD 25% DA limit, sector mean, HR 11%). Risk color exclusively from `getRiskLevelFromScore(score)` — never an inline ladder. One anchor number, Playfair Display Italic 800 `tabular-nums`, colored via `style={{ color: hex }}` — **never hex-as-className** (it is silently stripped; the April 2026 audit found this bug on all 10 story heros). Hero currency = `formatDualCurrency`. Where `ctx` is available, verdict text routes through `getVerdictFor(type, ctx)` (4 buckets); the four shipped heroes satisfy the contract visually and are NOT refactored to prove it.

**Seal discipline.** A seal renders **one badge max**: risk pill OR ARIA tier, mutually exclusive. Index folios and `FindingsBand` carry **no seal at all** — nobody bolts a fake verdict onto `/sectors`.

**Verdict copy.** Always "indicador de riesgo" / "risk indicator" — never "X% probability of corruption."

**Ledes.** `getLedeFor(type, ctx)` from `@/lib/entity/lede`, ≤80 words, ARIA `memo_text` truncated, template fallback if NULL.

**Exhibits — the claim→exhibit binding.** One exhibit answers exactly one claim type. **Pick by claim, not by reflex:**

| Claim type | Canonical exhibit | Component |
|---|---|---|
| Share-of-total / "how concentrated" | Concentration ribbon / proportion bar | `ConcentrationExhibit` · `DotBar` (single, N=22) |
| Ranked comparison ("who's biggest/worst") | Ledger of ranked dots | `DotStrip` (multi-row, N=50/R=3/gap=8, from `@/components/charts/editorial`) |
| Trend over time | Term/year sparkline | `EditorialSparkline` · `AdminCycleSmallMultiples` |
| Distribution vs threshold | Threshold / era template | `DataPullquote` threshold/era family |
| Single anchor number | Playfair Italic 800 stat | `StatRow` · `ProseStat` · `DataPullquote` |
| Two-cohort split | Dumbbell / swimlane | `CategoryCaptureDumbbell` · `CategorySectorSwimlane` |

An agent can flag "sparkline used for a share-of-total claim" mechanically. Four exhibit rules:
1. **Headline states the finding, not the topic** — "81.9% directo — 3.3× el límite OCDE", never "Adjudicaciones". Every exhibit § header contains a number or comparator (digit, ×, %, "vs", OCDE, promedio, histórico) — regex-checkable.
2. **Every number carries a reference point** (OECD / sector avg / historical / HR 11%).
3. **Density rhythm**: anchor number → exhibit → register row, repeated; never a wall of equal-weight cards.
4. **Decoration-kill**: an exhibit that doesn't change a reader's belief is decoration — **cut it**. (This is charter law for the lessons of the Intersection retirement and the Confounded Ledger rebuild: CumulativeRibbon/line-soup leftovers die on sight.)

Dots only through `DotBar` / `DotStrip`. No inline `<circle>`, no `w-full` SVG stretch, no `preserveAspectRatio="none"`. Sector colors via `SECTOR_COLORS`; semantic via `colorToken`; external lookup palettes via `colorRaw`.

**Hover-dossiers.** Focusable (`<button>`/`tabIndex`), edge-flip near viewport bounds, native `title` fallback, content = §1 lede summary + "Abrir dossier →". This is the `EntityIdentityChip` hover contract; **any custom hover register must match it** (the June ConcentrationExhibit/ConfoundPlate standard).

**Registers.** Each row routes through `EntityIdentityChip`. Sortable columns use `SortHeaderTh` (with `aria-sort`). Names via `formatEntityName`. Low risk = `text-text-muted`, never green.

**Codas.** Mandatory exit ramp on every dossier, story, and index. Minimum: one investigate CTA (amber, mono, uppercase) + 2–4 related-entity chips drawn from the cross-link graph (Vendor→Institution/Pattern/Network/Case/Peer; Category→Institution/Vendor/Pattern/Sister; Case→Vendor/Institution/Pattern). **A page with no coda is a dead end and fails review.**

**Currency by surface.** Hero/anchor/pull-quote → `formatDualCurrency`. Table cell/axis/tooltip/chip → `formatCompactMXN`. Standalone USD sub-line → `formatCompactUSD`. Year-specific conversion → `formatCompactUSDByYear`. Never `"B MXN"` in Spanish strings (MDP / billones / mil millones). Never blanket-replace — fixed-width cells break when USD is shoved in.

---

## III. COMPONENT MAPPING

| Anatomical slot | Fills it (existing) |
|---|---|
| A0/C0 Spine | `WayfindingSpine` (`@/components/nav/WayfindingSpine`) — **already on Vendor/Institution/Sector/Category dossiers; extend to Contract, Pattern, Case** |
| A1 Cabecera | `{Vendor,Institution,Sector,Category}Hero` + `formatEntityName` |
| A2 Veredicto | verdict seal in hero; `getVerdictFor` + `getRiskLevelFromScore` where ctx exists |
| A3 Lede | `getLedeFor` → `LedeParagraph` |
| A4 Tablero | `{Type}StatStrip` + `{Type}DiagnosticGrid` + `StatRow` |
| A5+ Exhibits | per claim→exhibit table (§II) |
| B1 El Saldo | **`FindingsBand`** (extract from the CategoriesIndex hand-rolled band) |
| Register rows | `EntityIdentityChip` + `SortHeaderTh` |
| Coda | `EntityIdentityChip` cluster + investigate `<Link>` (amber mono) |
| Footer | `ProvenanceFooter` |
| Stacked flags | `PriorityAlert` |
| Story chapters | `ChapterShell` / 7-variant engine / `DataPullquote` / `InlineCharts` |

**Extraction plan (STEP 0, one cleanup commit, do first):**
1. **`<FindingsBand>` — THE one new primitive.** The computed 1–3-lead index hero that CategoriesIndex already hand-rolls. Extract to `@/components/dossier/FindingsBand.tsx` so Aria/Cases/Captura/Dashboard get the same finding-first rhythm — and so invariant #12 becomes checkable by import-presence. Spec: 1–3 leads, each = claim sentence + anchor number + reference point; **no verdict seal**.
2. **Hoist the copy-pasted chrome.** `ProvenanceFooter` is duplicated in 7 page files (`VendorDossier`, `InstitutionDossier`, `SectorDossier`, `CategoryDossier`, `ContractDossier`, `CaseDossier`, `VendorProfile`) and `DossierSectionHeader` in 4 (+`CategoryDossierSections`). Promote both into `@/components/dossier/`, re-point imports. No visual change.
3. **Promote and extend `WayfindingSpine`** — do NOT wrap it in a new component; it already is the A0 primitive post-El-Hilo. Add it to `ContractDossier`, `PatternDossier` (P1→P7 siblings), `CaseDossier`.

Until STEP 0 lands, per-page missions may hand-compose the B1 band following the CategoriesIndex pattern.

---

## IV. HARD INVARIANTS

### A. The eight standing hard rules (unchanged — every commit)

1. `<EntityIdentityChip>` is the **only** way to render an entity outside its own dossier. Plain `<Link to={`/vendors/${id}`}>{name}</Link>` is forbidden.
2. Risk thresholds via `getRiskLevelFromScore` from `@/lib/constants` (0.60 / 0.40 / 0.25). No inline ladders.
3. Vendor names through `formatVendorName` or `formatEntityName(type, name, size)`. No raw `{vendor.name}` or `toTitleCase(vendor.name)`.
4. Canonical data sources: `vendor_stats.*` / `category_stats.*` / `institution_stats.*`. Never raw `vendors.avg_risk_score`.
5. Risk copy: "indicador de riesgo" / "risk indicator" — never "X% probability of corruption".
6. Spanish § kickers for editorial sections (English fallback via i18n).
7. No green for low risk (Bible §3.10). `low` → `text-text-muted`.
8. Commit messages cite doc + § — now: `feat(charter §V): AriaQueue saldo+coda`.

### B. Charter invariants (mechanically checkable)

9. **Spine present** — every Archetype-A page imports `WayfindingSpine` (grep import-presence).
10. **Verdict above fold** — the verdict claim + anchor render inside the hero component, not below § II.
11. **One anchor number** — exactly one Playfair-Italic-800 anchor in the hero; color via `style={{color}}`, never className. Seal = one badge max; no seal on index folios.
12. **Index lede exists** — every Archetype-B page imports `FindingsBand` OR contains the `EL SALDO` kicker before its first table.
13. **Coda exists** — every dossier, story, and index ends with `ADÓNDE IR` containing ≥1 investigate CTA + ≥2 `EntityIdentityChip` (grep kicker string + chip count).
14. **Finding headlines** — every exhibit § header matches `/[0-9]|×|%|vs|OCDE|promedio/`; a topic noun alone fails.
15. **Surface-correct currency** — hero/anchor = `formatDualCurrency`; table/axis = `formatCompactMXN` (review check; lint can't see this).
16. **No inline `<circle>` dot strips** — `DotBar`/`DotStrip` only.
17. **Single header per section** — one § kicker per exhibit; no double headers.
18. **`ProvenanceFooter` on every page** (or provenance microline in fixed chrome for full-viewport tools) — import-presence.
19. **Hover contract** — any hover register is focusable, edge-flips, has `title` fallback, links "Abrir dossier →".
20. **Decoration-kill** — an exhibit with no falsifiable finding gets deleted, not restyled.
21. **Token gate** — `npm run lint:tokens` clean; build gate `npx tsc --noEmit` AND `npm run build`, 0 errors.

---

## V. PER-PAGE COMPLIANCE NOTES

Status as of 2026-06-09. "HOLD" = shipped within 48h — do not touch this cycle.

| Route | File (`frontend/src/pages/`) | Archetype | Status · outstanding |
|---|---|---|---|
| `/` · `/explore` | `SpatialMap.tsx` | C tool | Partial — inspector lacks chips entirely; no provenance line. Touch ONLY the inspector drawer + chrome, never drill/zoom logic |
| `/dashboard` | `Executive.tsx` | B (sanctioned hybrid masthead) | Partial — no coda; signal cards not chip-routed; hero currency audit |
| `/atlas` | `Atlas.tsx` | C tool | Near — drawer chip-routing + provenance microline; story codas already exist |
| `/journalists` | `Journalists.tsx` | B | HOLD (Jun 9). `INVESTIGATIONS[]` is **static by design** — no journalism endpoint exists in `backend/api/routers`; documenting it as static IS compliance. Next pass: `§ EL SALDO` |
| `/aria` | `AriaQueue.tsx` | B | Partial — two competing headers (violates #17); no coda |
| `/cases` | `CaseLibrary.tsx` | B | Partial — inline `FRAUD_TYPE_LEFT`/`LEGAL_STATUS_STYLE` hex tables (violates color sourcing); no B1 lede |
| `/cases/:slug` | `CaseDossier.tsx` | A narrative | Near — no coda; El Daño header is a topic noun |
| `/sectors` | `Sectors.tsx` | B | HOLD (Confounded Ledger, Jun 9). Next pass: coda |
| `/sectors/:id` | `SectorDossier.tsx` | A | **SPEC** — reference implementation |
| `/institutions` | `InstitutionLeague.tsx` (+`InstitutionScorecards.tsx`) | B | HOLD (Steel & Ember, Jun 8–9). Next pass: B1 band |
| `/institutions/:id` | `InstitutionDossier.tsx` | A | **SPEC** — DualSeal is intentional, never collapse |
| `/categories` | `CategoriesIndex.tsx` | B | HOLD (Jun 9) — source pattern for `FindingsBand` |
| `/categories/:id` | `CategoryDossier.tsx` | A | HOLD (Jun 9) — **SPEC** |
| `/vendors/:id` | `VendorDossier.tsx` | A | Near — only the coda is missing; cheapest full exemplar |
| `/contracts/:id` | `ContractDossier.tsx` | A minimal | Partial — no coda; SHAP header is a topic noun; no spine |
| `/patterns/:code` | `PatternDossier.tsx` | A editorial | Partial — promised "§ Cómo investigar" absent; no sibling stepper (7 enumerable siblings); no coda |
| `/network` | `RedesKnownDossier.tsx` | C tool | HOLD (Jun 7–8) |
| `/administrations` | `Administrations.tsx` | C | HOLD (Jun 9) |
| `/captura` | `Relationships.tsx` | B analysis | Partial — rows have chips, but no B1 lede, no footer, no coda. NOTE: `CapturaHeatmap.tsx` is UNROUTED (v1.0 cut) — do not migrate it |
| `/stories/:slug` | `StoryNarrative.tsx` | C narrative | Near — 41 lazy charts render empty slots on first paint; coda chip audit |
| `/methodology` | `Methodology.tsx` | C essay | Partial — the trust document is a black hole: no footer, no coda, no breadcrumb |

**Out of scope:** unrouted legacy files (`VendorProfile`, `CategoryProfile`, `InstitutionProfile`, `SectorProfile`, `Investigation`, `CapturaHeatmap`, `CaseDetail`, `ContractDetail`, `pages/explore/` legacy) — never migrate dead code; delete-on-sight is a separate cleanup decision.

**Sequencing.** STEP 0 (the §III extraction commit) first; it converts invariants #9/#12/#18 into import-presence checks and shrinks every downstream mission. Then fan out per-page missions — each touches ONE page, uses existing endpoints only, and passes `tsc --noEmit` + `build` + `lint:tokens` before commit.

**Files of record:** `frontend/src/pages/*` per the table above · `frontend/src/components/nav/WayfindingSpine.tsx` · `frontend/src/components/ui/{EntityIdentityChip,DotBar,StatRow,PriorityAlert,SortHeaderTh}.tsx` · `frontend/src/components/charts/editorial` · `frontend/src/components/dossier/` (extraction target) · `frontend/src/lib/entity/{format,lede,verdict}.ts` · `frontend/src/lib/{constants,utils,tiers}.ts`.

---

*Charter logic in one line: **Folio tells you the section, Cabecera tells you the entity, Lede tells you why, Exhibits prove it, Register lets you dig, Colofón tells you to trust it.** Every page, every night, no exceptions.*
