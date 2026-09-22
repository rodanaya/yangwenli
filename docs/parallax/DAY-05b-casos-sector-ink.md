# PARALLAX Day 5b — Casos: sector ink as text, the conviction clause, figure labels

Follow-up to `DAY-05-casos.md` from Fable's four-perspective judgment (2026-09-22). Three pre-existing defects on `/cases/:slug` that the Day 5 audit missed, plus one skeleton nit. Files: `frontend/src/pages/CaseDossier.tsx`, `frontend/src/components/cases/{CasesShared,DossierBlocks,CaseTimeline,casesVocab}.tsx|ts`, `frontend/src/components/dossier/primitives.tsx` (one optional prop). Branch `parallax/day05b-casos-ink` off `origin/main` (`c5872602`) in worktree `.claude/worktrees/parallax-day01`.

## Evidence (judge re-run on the shipped HEAD, `_parallax_shots/day05/judge/en-report.json`, local backend, never prod)

| Dossier (sector) | text leaves < 4.5:1 | ratio | what |
|---|---|---|---|
| Oceanografía (energía `#eab308`) | **31** | **1.82:1** | "ACT I · THE CHARGE", "▎THE FINDING", the charge emphasis token ("1 convictions", 27px), every § numeral (12px), "The account"/"The implicated" (10px), the **88px** ScaleBlock number (fails even the 3:1 large-text floor), "THIS CASE · 7.8B MXN" callout (11px), rail § numerals (13px) |
| Línea 12 (infraestructura `#ea580c`) | 31 | 3.38:1 | same sites |
| raw sector palette on `#faf9f6` | 7 of 12 fail | salud 4.59 · educación 3.49 · infra 3.38 · energía 1.82 · defensa 10.9 · tecnología 4.02 · hacienda 3.13 · gobernación 5.97 · agricultura 2.16 · ambiente 2.41 · trabajo 2.66 · otros 4.52 | |
| `SECTOR_TEXT_COLORS` (`lib/constants.ts:29`, getter `getSectorTextColor(code)`) | 0 of 12 fail | min **6.51** (energía `#854d0e`), max 10.9 | already documented "USE FOR text, DO NOT USE FOR fills" — 27 call sites elsewhere, **0 on the case dossier** |

Copy: `casesVocab.ts:516–519` builds "one of only **1 convictions** in 43 documented cases" / "una de solo **1 condenas** en 43 casos documentados" for the lone convicted case (Oceanografía) — wrong number agreement, and "one of only 1" is not a sentence a newsroom would print.

Screen readers: the Day 5 HTML glyph layers (CaseTimeline: CONTRACTS / DISCOVERY yyyy / TODAY / bracket sentence; CostInArchive: THIS CASE / THRESHOLD / LARGEST callouts) are not `aria-hidden`, while each `<svg>` already carries an `aria-label` sentence that states the same facts → read twice. SeverityScale's label row IS hidden; the three figures disagree.

## Keep
Everything Day 5 shipped. The vivid `SECTOR_COLORS` stay on every **mark**: the 6px hero spine, the rail's inset spine, ScaleBlock border/wash, FeatureSection rules (`${accent}33`), the charge rule, the timeline contract band, the cost-field dot, the drop cap (aria-hidden, decorative), `LedeParagraph` rule. Only *type* changes ink.

## Change (4)

### 1. Sector ink for text comes from `getSectorTextColor` — `CaseDossier.tsx`, `CasesShared.tsx`, `DossierBlocks.tsx`, `primitives.tsx`
- In `CaseDossier`: `const sectorInk = primarySector ? getSectorTextColor(primarySector.code) : RISK_TEXT_COLORS.critical` (import both from `@/lib/constants`; the fallback mirrors the existing `sectorAccent` fallback). `sectorAccent` (vivid) keeps feeding every mark listed under Keep.
- `FeatureSection`: add `ink?: string` (defaults to `accent`); the movement label (`:102`) and the `§ {numeral}` span (`:120`) use `ink`; the rule (`:106`) keeps `accent`. Every `<FeatureSection accent={sectorAccent}>` on the page also passes `ink={sectorInk}`.
- `CaseCharge`: add `ink: string` prop from `CaseHero` (which gets it from the page); the two kickers (`:158`, `:166`) and `renderChargeClause`'s emphasis span (`:144`) use `ink`; the rule (`:162`) keeps `finding.accentKind`. When `finding.accentKind` is a disposition ink (impunity → `RISK_TEXT_COLORS.critical`) it already passes — keep that: `ink = accentKind === sectorAccent ? sectorInk : accentKind`. Compute once in the page and pass down; do not re-derive in three places.
- `CaseDocketRail`: add `ink: string`; the § index numerals (`:187`) use it; the inset spine (`:71`) keeps `sectorColor`.
- `CostInArchive`: add `ink: string`; the THIS CASE callout colour (`:328`) uses it; the dot fill (`:412`) keeps `accentKind`.
- `ScaleBlock` (`primitives.tsx`): add `ink?: string` (defaults to `sectorAccent` so the vendor/institution/other callers are byte-for-byte unchanged); the big number (`:227`) renders in `ink`; border, wash and hairline keep `sectorAccent`. `CaseDossier` passes `ink`. (Other ScaleBlock callers print the same 88px number in vivid sector ink → PARALLAX backlog, not this day.)
- Accept (probe `audit5.mjs`, EN + ES, 1440 + 390) on **four** dossiers covering the worst inks: `/cases/oceanografia-pemex-fraud` (energía), `/cases/sagarpa-subsidies-diversion` (agricultura), `/cases/linea-12-metro-collapse` (infraestructura), `/cases/imss-ghost-company-network` (salud): `failingContrast` contains **no** leaf whose colour is a sector hex or `getSectorTextColor` value — the only entries allowed are the ochre brand accent at 4.44:1 (Day 1 backlog) and the `— / —` wayfinding stepper placeholder (2.83, shared, out of scope); min contrast of the 88px number ≥ 4.5; crops of the Oceanografía hero + § III at 1440 show the yellow spine/border/dot still vivid and the type in the dark ochre-brown.

### 2. The conviction clause — `casesVocab.ts`
- `n === 1`: EN `the only conviction in ${t} documented cases` with emphasis `only conviction`; ES `la única condena en ${t} casos documentados` with emphasis `única condena`. `n > 1` keeps the current wording (plural agrees). Leave one check behind: extend the nearest existing vitest for `casesVocab` if there is one (`git ls-files | grep -i vocab`), else add `casesVocab.test.ts` with a single case asserting the singular EN + ES strings.
- Accept: Oceanografía hero crop EN reads "the **only conviction** in 43 documented cases", ES "la **única condena** en 43 casos documentados"; vitest green.

### 3. Figure glyph layers are decoration for AT — `CaseTimeline.tsx`, `DossierBlocks.tsx`
- Wrap each figure's HTML label layer in one `<div aria-hidden="true" className="contents">` (or put `aria-hidden` on every absolutely positioned span — pick the smaller diff). The `<svg role="img" aria-label>` sentence stays the single spoken source, as SeverityScale already does.
- Accept: probe `main figure span.absolute:not([aria-hidden])` = 0 on both dossiers; the two `aria-label`s unchanged; the Day 5 label-box checks (no overlap, inside plate) still 0 — the census and `audit5` skip `aria-hidden` nodes, so ALSO re-run the Day 5 `labelAudit` with hidden nodes included (add a flag) to prove geometry did not move.

### 4. Skeleton grid only on `lg` — `CaseDossier.tsx` `DossierSkeleton`
- `grid grid-cols-[210px_1fr] gap-10` → `lg:grid lg:grid-cols-[210px_1fr] lg:gap-10 space-y-8 lg:space-y-0`. One line.
- Accept: at 390 the skeleton stacks; at 1440 unchanged.

## Out of scope (→ backlog)
- ScaleBlock's vivid number on vendor/institution/category dossiers (same defect, other surfaces' days).
- Ochre `--color-accent` as small text at 4.44:1 (Day 1 backlog).
- WayfindingSpine `— / —` placeholder at 2.83:1 (shared).

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, create branch `parallax/day05b-casos-ink` from `origin/main` (`c5872602`; `git fetch` first). Ignore untracked `_parallax_shots/`, `frontend/Python.npm-cache/`. Never bare `git stash`, never junction node_modules, temp under `D:\`, stage explicit paths only.
- Servers already running — reuse: backend `http://127.0.0.1:8001` (`/api/v1`), Vite `http://localhost:3009` (restart recipes in `DAY-05-casos.md § Build notes`). Never probe rubli.xyz. ≤ 2 browsers at once. Git Bash: `MSYS_NO_PATHCONV=1` + `D:/` script paths.
- Read each file fully before editing. One commit per change: `feat(cases § PARALLAX D5b § Change N): …`, body cites `docs/parallax/DAY-05b-casos-sector-ink.md § Change N`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Progress: `_parallax_shots/day05b/progress.md` after every step; report: `_parallax_shots/day05b/report.md`.
- Probes: copy `_parallax_shots/day05/audit5.mjs` → `day05b/audit5b.mjs` with the four dossier routes above (+ `/cases` for regression), tag `after`, EN + `LANG_ES=1`; print for each route the failing-contrast list with the leaf's computed `color`; census (`day04/clipcensus4.mjs`) on the four dossiers × 1440,390 × EN+ES must stay 0. Crops via `day05/crop5.mjs` (adapt routes): Oceanografía hero, § III, rail at 1440 EN; SAGARPA hero at 1440; Oceanografía hero ES. LOOK at them.
- Review: `rubli-bilingual-audit` on touched TSX; gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · `npx vitest run` on the vocab test.
- Do NOT bump BUILD_ID, push, deploy or merge — Fable judges first.
