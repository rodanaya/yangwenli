# PARALLAX Day 4 — La Trama (`/network`)

Route `/network` (+ `?lens=institutions`). Files: `frontend/src/pages/RedesKnownDossier.tsx` (1,348 LOC), `frontend/src/components/network/{MeshPlano,CommunityForceGraph,InstitutionStarGraph,ClusterActa,EvidenceIndex}.tsx`, `frontend/src/components/atlas/PlateFrame.tsx` (one additive prop). Branch `parallax/day04-la-trama` off `origin/main` (`5b86d9a2`) in worktree `.claude/worktrees/parallax-day01`.

**Classification: GOLD — enhance in place.** La Trama was rebuilt Jun 7 (design council), re-planned by Fable Jul 2 (Plano general, ClusterActa, evidence marks) and re-banded Jul 4. The argument, the three plates and the rail are right. What is wrong is glyph size, clipped names, box widths and semantics. No `/designus`.

## Audit evidence (2026-09-19, local backend `127.0.0.1:8001`, Vite 3009, msedge; never prod)

Probe scripts in `_parallax_shots/day04/`: `audit4.mjs` (sizes, frame, a11y facts, screenshots), `clipcensus4.mjs` (STORY_DAYS § 7 census, prod-refusing copy), `crop4.mjs` (region crops with sticky chrome hidden), `local_backend.py` (same app, no startup scan / no cache warmup — on this machine's cold D: the stock boot did not finish in 20 min). Before-shots in `_parallax_shots/day04/before/`.

| Measure | clusters 1440 | buyers 1440 | clusters 390 | buyers 390 |
|---|---|---|---|---|
| sub-10px text leaves (rendered px, SVG scaled by viewBox) | 46 | 6 | 45 | 6 |
| smallest rendered glyph | **5.3px** (evidence tent numeral) | 7.2px | **2.3px** | **3.2px** |
| force/star graph SVG scale (viewBox 920) | 0.76 | 0.76 | **0.33** | **0.33** |
| line-clamped names cut (EN / ES) | 0 / 0 | **37 / 43** | 0 / 0 | **37 / 43** |
| `truncate` cutting text (EN / ES) | 0 / 8 | 0 | 0 / 8 | 0 |
| names cut with "…" by `formatEntityName(…,'sm'|'xs')` | 2 | 5 | 2 | 5 |
| clip census total (EN / ES) | 2 / 10 | 74 / 86 | 0 / 8 | 74 / 86 |
| text leaves on an opacity-dimmed muted token (`text-text-muted/40…70`) | 97 | 139 | 97 | 139 |
| headings | 1 (`h1` only) | 1 | 1 | 1 |
| `div[role=button]` rows / with a nested `<button>` | 60 / 60 | 120 / 0 | 60 / 60 | 120 / 0 |
| `role=tablist` with 0 `tabpanel`, 0 `aria-controls` | 1 | 1 | 1 | 1 |
| focusable SVG nodes (tab stops inside one plate) | 49 | 30 | 49 | 30 |
| interactive elements with `outline-none` and no focus-visible ring | 50 | 31 | 50 | 31 |
| targets under 24×24 | 107 | 31 | 110 | 35 |
| live regions (Copy link confirms silently) | 0 | 0 | 0 | 0 |

Frame (1440): container 1152, every block left-anchored at x=256; hero lede 555px of 1152; Plano general plate 1152 with a 64ch caption (≈480px) and a 240px-tall scatter stretched 1094 wide; ClusterActa lede and rationale 490px inside a 1,100px box; Fe de método 12px text capped at 68ch inside a 1,152px box — the Day 2d "half-empty box" defect on every block of the page. At 1024 the `lg:grid-cols-[370px_1fr]` instrument leaves the force graph ≈380px wide and the PlateFrame context label clips (+123px ES).

Seen on the crops: force-graph callouts overlap each other ("Nabors Perforaciones…" over "Naviera Integral"); at 390 the Plano general callouts collide with the ALTA/MEDIA threshold labels and with the quadrant annotation, and "C-0 · Martinez Barranco" leaves the SVG (+26–30px, svg-clip at 1440/1280/1024); the rail's C-15 row breaks its stat line into a ragged two-row table; the touch layout prints "pasa el cursor para leer el resto"; the ES evidence clause reads "caso(s) de la verdad fundamental".

Toolkit passes run IN the audit:
- **web-design-guidelines** (live rule set fetched): `<div onClick>` rows instead of `<button>`; nested interactive; `outline-none` without replacement (`RedesKnownDossier.tsx:631`, `CommunityForceGraph.tsx:229`, `InstitutionStarGraph.tsx:158`); async update without `aria-live` (`:611`); headings not hierarchical; `truncate`/clamp cutting content that is the row's identity (`:176`, `:721`, `:919`); `.map()` of up to 239 rows with no `content-visibility`; hover-only content on touch (`CommunityForceGraph.tsx:433`); search input has no `name`/`autoComplete="off"` (`:618`); loading copy already ends in "…" ✓; URL reflects lens/comm/inst ✓ (sort + pattern filter do not — backlog).
- **ui-ux-pro-max** `--domain chart` "network graph": accessibility risk high — *the adjacency list is the accessible source of truth; focus reveals node details; do not rely on colour alone* → roster stays the AT path, the graph becomes one tab stop. `--domain chart` "scatter": direct labels, not colour alone → callouts stay, de-collided. `--domain ux`: keyboard order = visual order, visible focus on every control, 4.5:1 for normal text. `--stack react`: stable keys ✓ (edges use index keys — static list, fine), memo only where there is real render cost.
- **vercel-react-best-practices**: `rerender-memo` / `rerender-use-deferred-value` — `query` is state on the page component, so every keystroke re-renders `MeshPlano` (239 rects) and `CommunityForceGraph` (up to 2,500 `<line>`); `evidenceEntries = buildEvidenceMarks(graph)` (`:445`) is a new array every render, which would defeat a memo; `rendering-content-visibility` for the rail. `client-localstorage-schema` ✓ (`rubli_trama_pins_v1`).
- **a11y** (Fable's own pass — the wshobson agents are not exposed as agent types): table rows above.
- **folio voice**: intact; nothing to change in copy except the ES gloss.

## Keep

- The argument and its copy: h1 «nudos», the lede's reading instruction, "The giants sleep along the bottom right…", the signal formula line, all seven Fe de método clauses.
- Three plates and their encodings: Plano general (squares only, log x, risk y, value = side, dashed `RISK_THRESHOLDS` rules), the force-directed mesh (pagerank radius, risk fill, sanction dashed ring, GT pip, collusion edges in critical red, neighbour dimming), the siege star (golden-angle orbit, clan arc, spokes by share). **Default plate = highest signal-density knot.** No layout-algorithm changes, no new colours.
- Rail content and order: lens tabs, count, Copy link, search, six sorts (Señal default), P1–P7 filter, rows with rank · verdict tick · C-id · value · pin · hub orbit · actors/DA/SB/risk/GT/sanction · pattern-mix bar; 60-row cap + "show all"; pins in `localStorage`.
- ClusterActa as a full-width band under the instrument (Jul 4 decision), its verdict seal, charges with deviation bars, pagerank roster with `EntityIdentityChip fullName`, besieged buyers, cross-lens jumps; the siege cards.
- URL contract `?lens=&comm=&inst=&vendor=`, lazy URL init, `DossierOriginProvider`, RUNG 2 early return after hooks.
- PlateFrame chrome (folio, crop marks, dateline) and the paper grain.
- CLAUDE.md rules 1–8; no italic; no dot-grid; no green for low.

## Change (8)

Shared mechanic for 1–2 — **HTML owns glyphs, SVG owns geometry**: new `frontend/src/components/network/plateLabels.ts` exporting a pure `placeLabels(candidates, obstacles, bounds)` → accepted labels with `{x, y, align}`. Greedy AABB in **rendered px**, candidate boxes from real text width (`measureText` on a shared canvas with the label's font, or the wrapped box for a `maxWidth`), a label that would cross a bound is re-anchored (`left`/`right` aligned) before it is rejected, pre-placed `obstacles` always win. Leave ONE check behind: `plateLabels.test.ts` (vitest) — overlapping candidates → second dropped; candidate past the right bound → re-anchored inside; obstacle respected.

### 1. Mesh + siege plates: labels and evidence tents become HTML — `CommunityForceGraph.tsx`, `InstitutionStarGraph.tsx`
- Measure the plate's rendered width (`ResizeObserver`, same pattern as `MeshPlano`); `scale = width / 920`. Nodes/edges stay SVG.
- Remove every SVG `<text>`. Render callouts as absolutely positioned HTML over the SVG (`left/top` = node px position, `transform` for the anchor), mono **11px**, `text-text-secondary`, background halo via `bg-background/85` + 2px padding, `max-width: 160px` (120px when the plate is < 640px), wraps with `text-wrap: balance`, `pointer-events: none`. **Full names**: `formatEntityName('vendor', name, 'full')` — no `'sm'`/`'xs'` character cuts; the institution centre label likewise.
- Candidates: top-5 by pagerank (mesh) / top-5 by value (star); top-3 when the plate is < 640px. Placed by `placeLabels` with the plate box as bounds; the hovered/focused node's label is suppressed as today.
- Evidence tents: HTML squares 16×16, numeral mono 10px bold, `var(--color-accent)` fill, white text, leader line stays SVG. `EvidenceIndex.tsx` glyph to the same 16px/10px so the index and the plate match.
- Hover card: full name; on `(hover: none)` it opens on tap (the node's `onClick` already selects — show the card for `selectedVendorId` when there is no hover). Replace the hint line: EN "Hover or focus a node to read the rest" / ES "Pasa el cursor o enfoca un nodo para leer el resto"; under `(hover: none)`: "Tap a node to read it" / "Toca un nodo para leerlo"; 11px, `text-text-muted`.
- Accept (probe, EN+ES, 1440/1024/390, both lenses): 0 `svg text` inside the two graphs; min rendered font ≥ 10px; no two label boxes intersect; every label box inside its plate box; 0 label strings ending in "…"; tents ≥ 16px with numerals ≥ 10px; at 390 ≥ 2 callouts are present and legible on the crop.

### 2. Plano general: legible axes, de-collided callouts — `MeshPlano.tsx`
- The SVG is already 1:1 (viewBox = measured width), so axis glyphs stay SVG: ticks and threshold labels 8/8.5 → **10px**, axis title 8 → 10px; `PAD_L` 46 → 52 and `PAD_BOTTOM` 40 → 44 if the probe shows a collision.
- Callouts → HTML through `placeLabels`, mono 11px, full hub names, `max-width` 180px (130px mobile). **Obstacles**: the two quadrant annotations, the two threshold labels, and the y-axis tick column — a callout never sits on them. A callout that cannot sit above its mark tries below before it is dropped; leader line follows.
- Move the threshold labels to the **left** end of their rules on mobile (the right end is where the giants' callouts live).
- Tooltip: full name; keep `role="status"`.
- Pointer-only selection stays (the rail is the keyboard path): add an `sr-only` sentence after the SVG — EN "Select a cluster from the index below to open its mesh." / ES "Selecciona un cúmulo en el índice de abajo para abrir su trama."
- Accept: 0 sub-10px leaves in the plate; 0 `svg-clip`; no label/annotation/threshold boxes intersect at 1440/1024/390 EN+ES; "C-0 · …" fully inside the plate; no "…".

### 3. Rail rows: real buttons, no clipped names, stats that wrap by item — `RedesKnownDossier.tsx`
- Both rails: `<ul>` + `<li>` (drop `role="list"` on the div). Each row = `<li className="relative …">` holding a real `<button type="button" aria-pressed={active}>` for selection that owns the row's text, and — clusters only — the pin `<button>` as a **sibling**, positioned top-right. No `div[role=button]`, no `onKeyDown` shims, no nested interactive.
- Names: delete both 2-line clamps (`:721`, `:919`) and their `title=`; hub orbit and institution names wrap in full. The rank + C-id line: drop `truncate` (`:877`).
- Stat line (`:923`, `:730`): `flex flex-wrap gap-x-2.5 gap-y-0.5`, each stat `whitespace-nowrap` — a stat never breaks inside itself (the C-15 row).
- `PatternMixBar`: bar on its own line (full row width, 4px tall), label on the next line, mono **10px**, `text-text-muted`, wraps, no `truncate`.
- Verdict tick: keep the 6px square `aria-hidden`, add `<span className="sr-only">{verdict label}</span>`.
- Rows get `style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 96px' }}` (Change 8 depends on nothing else here).
- Accept: `div[role=button]` = 0; nested interactive = 0; clamp-cut = 0 and `truncate`-cut = 0 in EN and ES, both lenses; every row's stat line ≤ 2 lines with no intra-stat wrap at 1440 and 390; pin still toggles and persists; Enter/Space select a row; selection still scrolls the plate into view.

### 4. Reading frame — 640 text axis, 760 figure, 1152 instrument, all on one centre line — `RedesKnownDossier.tsx`, `MeshPlano.tsx`, `PlateFrame.tsx`
Pattern: `docs/parallax/DAY-02d-methodology-reading-frame.md` + `DAY-03b-story-text-axis.md`. La Trama is an instrument page, so it gets three centred widths instead of two:
- **Text axis 640**: hero block (folio line, h1, lede) and Fe de método → `mx-auto max-w-[640px]`. h1 keeps its clamp; ≤ 3 lines at 640.
- **Figure 760**: Plano general → wrapper `mx-auto max-w-[760px]` (so its left edge is axis−60, as in the stories). The scatter re-measures itself; height stays 240/200.
- **Instrument 1152**: the rail + plate grid and the dossier band keep `max-w-6xl`. The instrument goes two-column at **`xl`**, not `lg` (`xl:grid-cols-[370px_1fr]`, `xl:order-*`, `xl:sticky xl:top-4`): at 1024 the plate is full width above the rail instead of 380px beside it.
- `PlateFrame`: add `captionFull?: boolean` (default false → unchanged everywhere else); when true the figcaption drops its inline `maxWidth: '64ch'` so the site rule at `index.css:1049` ("captions span the figure") applies. Pass it on the three `/network` plates. Fix the context-label clip with the plate's own width, not the viewport: the header row gets `min-w-0`, the context label `flex-1 min-w-0` and wraps (no `nowrap`) — it must never escape the frame.
- Accept (1920, 1440, 1280, 1024, 390): hero, Plano general, instrument and Fe de método share one centre x (±2px) at ≥ 1280; widths are {640, 760, 1152} at 1440/1920; every `<figcaption>` on the page is ≥ 85% of its figure's content width or a single line; PlateFrame header text fully inside the frame at every width EN+ES; no document-level horizontal overflow; at 1024 the force-graph plate is ≥ 700px wide.

### 5. Boxes as wide as their text — `ClusterActa.tsx`, `RedesKnownDossier.tsx`, `EvidenceIndex.tsx`, `lib/network/evidence.ts`
- ClusterActa header: seal row stays; lede and verdict rationale move into a `md:grid-cols-2 gap-x-5` that lines up with the body grid below — lede (Garamond 15px) left, rationale (mono 12px) right; both `max-w-none` inside their column. Single column below `md`.
- ChargeRow prose 12.5 → 13px; the two 10px mono notes stay (at the floor).
- EvidenceIndex: `flex-wrap` of `max-w-[320px]` buttons → `grid sm:grid-cols-2 gap-x-5 gap-y-2.5`, buttons `w-full`; clause 13px stays.
- Fe de método: inside the 640 column the clauses go 12 → **13px** `text-text-secondary`, `<em>` stays non-italic (global rule).
- ES gloss in `lib/network/evidence.ts`: "caso(s) de la verdad fundamental" → "caso(s) documentado(s)" (EN "ground-truth case(s)" → "documented case(s)", matching the ClusterActa charge row).
- Accept (1440 + 1920, both lenses): every bordered box wider than 300px has its widest text child within 70px of the box's inner right edge (the Day 2d check) — exceptions allowed only for the rail rows and the siege cards' stat grids, listed in the report.

### 6. Semantics, keyboard, focus — all six files
- Lens switch: it swaps rail **and** plate and has no panel, so it is a toggle group, not tabs: wrapper `role="group"` + `aria-label` (EN "Lens" / ES "Lente"), buttons `aria-pressed`; remove `role="tablist"/"tab"/aria-selected`. Sort pills and the P1–P7 filter: `aria-pressed` + a group label each.
- Headings, visuals unchanged: `§ Cluster index` / `§ Besieged buyers`, `§ Evidence marks`, `§ The charges`, `§ The named…`, `§ Buyers besieged…`, `§ Siege signature`, `§ The feeding clans`, `Attestation of method` → `<h2>`; "Who takes the spend", "Dominant vendor", "ARIA pattern mix" → `<h3>`. Each keeps its exact classes (the measure rule exempts `.uppercase`).
- One tab stop per graph: the node `<g>` elements get roving `tabIndex` (0 on the selected node, else on the top-pagerank/top-value node, −1 on the rest); ArrowRight/ArrowDown → next node in pagerank (value) order, ArrowLeft/ArrowUp → previous, Home/End, Enter/Space select; focus moves with `ref.focus()`. SVG `role="group"` keeps its label and gains `aria-describedby` → an `sr-only` "Use the arrow keys to move between vendors; Enter selects." / ES.
- Focus: replace every bare `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1` (rows, pills, lens buttons, pin, Copy link, evidence buttons, siege/ring CTAs, clan chips); search input keeps its border change **and** gets the ring; SVG nodes show the accent ring circle on `:focus-visible` (they already do through `hoverId` — keep, and drop `focus:outline-none` only if the native outline is not doubled).
- Copy link: a sibling `<span role="status" aria-live="polite" className="sr-only">` announcing "Link copied" / "Enlace copiado".
- Search input: `name="trama-search"`, `autoComplete="off"`, `spellCheck={false}`, `type="search"`.
- Targets: pin button and every pill ≥ 24×24 (`min-h-6 min-w-6`, pills `py-1`).
- `VendorNetworkView.tsx:270`: nested `<main>` → `<div>` (one line; the app shell already owns `<main>`).
- Accept: probe reports `tablist` 0; headings ≥ 6 on the clusters lens with no level skipped; `noFocusRing` 0; tab stops inside each graph = 1; targets < 24px inside `main` = 0 (inline `EntityIdentityChip` links exempt, WCAG 2.5.8 inline exception); 1 live region; keyboard walk on the crop video or log: Tab → lens → search → sorts → row → pin → graph (arrows move, Enter selects) → evidence → roster.

### 7. Contrast: no opacity-dimmed muted text — the six files
- Day 1 made `--color-text-muted` (#736a65) AA. 39 class sites dim it again (`text-text-muted/30…/70`). On **text and icons that carry meaning** → `text-text-muted` (hover states `hover:text-text-secondary`). Placeholder → `placeholder:text-text-muted`. Decorative separators (`·`) and the inactive pin glyph may keep `/60` only if `aria-hidden`.
- Inactive lens button `text-text-muted/60` → `text-text-muted`; inactive pills `text-text-muted/50` → `text-text-muted`.
- Accept: grep `text-text-muted/` in the six files returns only `aria-hidden` decoration; probe `faint` = 0 on non-hidden leaves; sampled contrast of rail stat text, legend, plate hint and pill labels ≥ 4.5:1 against their computed background.

### 8. Typing in the search must not redraw the mesh — `RedesKnownDossier.tsx`, `MeshPlano.tsx`, `CommunityForceGraph.tsx`, `InstitutionStarGraph.tsx`
- `const evidenceEntries = useMemo(() => (graph ? buildEvidenceMarks(graph) : []), [graph])` — and move it above the RUNG 2 early return with the other hooks.
- `export const X = memo(function X…)` for `MeshPlano`, `CommunityForceGraph`, `InstitutionStarGraph`, `ClusterActa`; make their callback props stable (`useCallback` for `selectCommunity`, `setSelectedVendor` is already stable; the two ClusterActa handlers → `useCallback`).
- `const deferredQuery = useDeferredValue(query)`; the two filter memos read `deferredQuery`.
- Accept: with a temporary dev-only render counter (`window.__tramaRenders`, removed before commit — say so in the report), typing five characters into the search re-renders `CommunityForceGraph` and `MeshPlano` **0** times; hover on a node still re-renders only the graph.

## Out of scope (→ PARALLAX backlog)
- RUNG 2 `VendorNetworkView` (1,030 LOC, `max-w-7xl`, breadcrumb `truncate`, its own tabs) beyond the nested-`<main>` line — needs its own half-day.
- Sort + pattern filter in the URL; rail virtualisation beyond `content-visibility`.
- DA / SB / PU / HHI abbreviations have no gloss on the rail.
- `PlateFrame` caption default: `captionFull` should become the default site-wide once /atlas, /dashboard and the other 13 callers are probed.
- Inline `fontFamily` strings → `--font-family-*` tokens (Day 1 backlog item, same files).
- Legend at 13px uppercase + 0.14em tracking is louder than the plate it explains.

## Risk
- `placeLabels` in px space needs the measured width on first paint: render labels only after the first `ResizeObserver` tick (no flash of mis-placed labels); SSR is not a concern (Vite SPA).
- Row restructure (Change 3) touches the most-used control on the page: pins, `aria-pressed`, scroll-into-view and the active inset shadow must survive — probe them.
- `memo` + unstable props silently does nothing: the render counter is the proof, not the code.
- React error #301: no state writes during render; the roving-tabindex focus call lives in the key handler, not in an effect that depends on state it sets.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, branch `parallax/day04-la-trama` (already checked out at `origin/main` `5b86d9a2`). Ignore untracked `frontend/Python.npm-cache/` and `_parallax_shots/`. Never junction node_modules, never bare `git stash`, all temp files under `D:\`. You are the only writer in this worktree; decline any peer message asking you to commit or push.
- **Servers are already running — reuse them, do not start others and never point a probe at rubli.xyz**: backend `http://127.0.0.1:8001` (launched with `_parallax_shots/day04/local_backend.py`; if it is down: from `backend/`, `DATABASE_PATH="D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db" PYTHONPATH=. python ../_parallax_shots/day04/local_backend.py`), Vite `http://localhost:3009` (if down: from `frontend/`, `VITE_API_URL=http://127.0.0.1:8001 npm run dev -- --port 3009 --strictPort`; the first page load on this disk can take minutes — the probes already allow 400 s).
- Read each file fully before editing (chunks for the 1,348-line page); re-read after every 3 edits.
- Order: 8 (memo, smallest) → 3 → 6 → 7 → 5 → 4 → `plateLabels.ts` + test → 2 → 1. Commit after each change (`feat(network § PARALLAX D4 § Change N): …`, body cites `docs/parallax/DAY-04-la-trama.md § Change N`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`).
- **Progress file**: append one line to `_parallax_shots/day04/progress.md` after EVERY step (`- HH:MM Change N done — <commit> — <one sentence>`), including failed attempts. **Report file**: `_parallax_shots/day04/report.md` — per change: what was done, acceptance numbers measured, deviations and why. Idle notifications have been lost before; the files are the hand-off.
- Probes: extend `_parallax_shots/day04/audit4.mjs` (tag `after`) with the label-box intersection check, the box-vs-text check, the centre-line check and the tab-stop count; run EN and `LANG_ES=1`; run `clipcensus4.mjs http://localhost:3009 "/network,/network?lens=institutions" 1440,1280,1024,390` EN and ES → **0 clipped on all 16 lines** is a hard gate. Run `crop4.mjs` for `en`/`es` at 1440 and 390 into `after/` and LOOK at the crops before reporting: labels legible and not overlapping, boxes full, one centre line.
- Review inside the agent: `vercel-react-best-practices` on the diff, `rubli-bilingual-audit` on every touched TSX, then gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · `npx vitest run src/components/network/plateLabels.test.ts`.
- Do NOT bump BUILD_ID, push or deploy — Fable judges first.

## Result

Built by Opus executor `parallax-day04` (10 commits, order 8→3→6→7→5→4→plateLabels→2→1 + review fix), judge fix by `parallax-day04-fix` (`523daeee`, threshold labels right-anchored at all widths — the Change 2 spec line "left end on mobile" put MEDIA on the dense data column). Judged by Fable on region crops at 1440 + 390, EN + ES (`_parallax_shots/day04/after/`, `final/`), numbers re-read from `after/en-report.json`, census re-run on the fixed build.

| Measure (clusters / buyers) | before 1440 | after 1440 | before 390 | after 390 |
|---|---|---|---|---|
| sub-10px text leaves | 46 / 6 | **0 / 0** | 45 / 6 | **0 / 0** |
| smallest glyph | 5.3px | 11px (tents 10px) | 2.3px | 11px |
| clamped / truncated names (EN, ES) | 0+0 / 37+8 (ES 43) | **0** | same | **0** |
| clip census EN / ES (all 4 widths) | 2 / 10 · 74 / 86 | **0 on all 16 lines** | | |
| `div[role=button]` · nested interactive | 60·60 / 120·0 | **0 · 0** | | |
| tab stops inside a graph | 49 / 30 | **1** | | |
| controls without focus ring | 50 / 31 | **0** | | |
| opacity-dimmed text leaves | 97 / 139 | **0** (rail 5.01:1, plate 4.68:1) | | |
| headings | 1 | 8 / 7, no skips | | |
| live regions | 0 | 1 | | |
| frame widths | 1152 left-anchored | {640, 760, 1152} on one centre x at 1920/1440/1280/1024/390 | | |
| plate at 1024 | 380px | 870px | | |
| typing 5 chars → plate re-renders | every keystroke | **0** | | |

Commits: `516d157a` §8 · `99f9f9db` §3 · `a2f76ef1` §6 · `7152330b` §7 · `6185ef26` §5 · `95ac9692` §4 · `495b839e` plateLabels + vitest 9/9 · `bf1a8d4c` §2 · `fb08386a` §1 · `a330fe22` review fix · `360508da` untrack probes · `523daeee` judge fix. Gates: tsc 0 · build OK · lint:tokens PASS · vitest 9/9 · bilingual audit 0 monolingual additions.

Deviations accepted: PlateFrame context label wraps instead of ellipsing (verified single-line on /gap, /methodology, /atlas, /network at 1440/1024/390 EN+ES — the wrap is a safety net); probes disable `content-visibility` before measuring so §3's rows cannot pass the census unrendered; Change 2's mobile left-anchoring reverted (judge fix).

Noticed, not fixed (→ PARALLAX backlog): siege-plate centre label covers two small orbit nodes at 1440; C-3 callout sits over grey marks at 390 (label-over-data — placeLabels has no data-mark obstacles); ochre accent 4.44:1 on the page background (Day 1 token decision); local backend boot needs the no-scan launcher on a cold disk (`_parallax_shots/day04/local_backend.py`).

Shipped 2026-09-22 06:51Z: origin/main + VPS HEAD `6f6c21ac`, BUILD_ID `2026-09-22-parallax-d4-la-trama`, entry `index-C5A6mxjf.js`, page chunk `RedesKnownDossier-B08PJfOZ.js` (new strings verified in the served JS), health OK (3,058,286 contracts). Deployed via `deploy-safe.sh`; no local re-verification against prod beyond the served-chunk check (prod is never probed).
