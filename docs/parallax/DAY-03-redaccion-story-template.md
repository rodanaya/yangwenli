# PARALLAX Day 3 — Sala de Redacción + story template

Routes: `/journalists` · `/stories/:slug` (13 stories)
Files: `frontend/src/pages/Journalists.tsx`, `frontend/src/components/journalists/{PlanaMasthead,PlanaLeadBlock,PlanaDesk,PlanaColofon,plana-parts}.tsx`, `frontend/src/pages/StoryNarrative.tsx`, `frontend/src/components/stories/{ChapterBanner,InlineCharts,VendorPriceTrajectory,VennConvergence}.tsx`, `frontend/src/components/stories/charts/*` (STEP 0)
Audited: 2026-09-18 against **origin/main `d36b87dc`** (= prod BUILD_ID `2026-09-18-parallax-d2d-reading-frame`) on the worktree dev server (port 3011, `VITE_API_URL=https://rubli.xyz`), msedge, 1440×900 + 390×844, EN + ES. Probe + shots in `_parallax_shots/day03/before/` (untracked); crops in `…/before/crops/`.

## Classification: GOLD — enhance-in-place. No `/designus`.

`/journalists` is «La Primera Plana» (Jun 23, the Guardian-list the user approved after three rejections — the list IS the design). `/stories/:slug` is the variant-aware chapter template (hero / feature / data-spotlight / quote-spotlight / connective / closing / standard) with the 13 remade newsroom-voice stories (Jun 26). Every defect below is measurable: text under the floor, live italics, a stale dateline, five different centered widths on one page, SVG glyphs at 4.5px on phones, a nested `<a>`, a fixed nav printing over the column, and 7,000 lines of chart code no story references.

## Audit evidence (dev server = origin/main, 2026-09-18)

| Route | sub-10px leaves | italic | stale | footers (DOM) | widths at 1440 | other |
|---|---|---|---|---|---|---|
| `/journalists` | **45** (all 9px: PlanaMasthead edition line ×2, AgateRubric ×43) | **5** (thesis `fontStyle:'italic'` PlanaMasthead:91; four colophon clauses PlanaColofon:70 at **13px Garamond italic**) | 0 | 2 (`main:has(.page-footer) + footer` hides the colophon; DOM still has both — verify visibility, not count) | container 1152 (`max-w-6xl`) | React warns `<a> cannot be a descendant of <a>`: `PlanaTourBadge` (a `Link`) nests inside the whole-card `Link` in PlanaLeadBlock (×2) and PlanaDesk. Invalid HTML, nested link for AT. |
| `/stories/el-sexenio-del-riesgo` | 0 desktop · **72 SVG text nodes at 4.5–5.7px at 390** (mirror ledger, cleveland, bars — fixed viewBoxes scaled to 318px) | 0 | 1 ("Analysis as of May 2026" / "Análisis a mayo de 2026", StoryNarrative:1697 — a build date on a frozen record; comment still says March 25 2026) | 1 | Act I 1152 · hero title 1024 · feature grid 1024 · charts 1024/1152/656 · StoryHero 896 · quote/closing/dramatis 896 · era strip 768 · prose 656 | ChapterNav (fixed `right-6`) prints the active chapter label over the feature aside and the closing column at 1440 (`crops/*-desk-feature-grid.png`, `*-desk-closing.png`). ChapterBanner is a 1120px band whose text stops 274–719px short (half-empty box, the Day 2d complaint). ChapterBanner h2 is sans while hero/closing/connective titles are Playfair. Hero kicker numerals render mono (`.tabular-nums` forces `--font-family-mono`, index.css:193) while the lead-stat and every pullquote number are Playfair. |
| `/stories/el-ejercito-fantasma` | 0 desktop · 8 SVG at 5.7–6.2px at 390 (cleveland pair) | 0 | 1 | 1 | same | — |
| `/stories/el-vacio` | **3** (InlineCharts:264 stamp `fontSize: 8.5` ×2, InlineCharts:667 "OECD ~15%" `fontSize={8.5}`) · 9 SVG at 3.9–5.9px at 390 | 0 | 1 | 1 | same | — |

Dead code (verified): `story-content.ts` has 34 `chartConfig`s, all of type `inline-*` / `editorial-{threshold,thermometer,cleveland-pair}` / `vendor-price-trajectory` / `venn-convergence`. **None** resolves through `CHART_REGISTRY` / `TYPE_TO_CHART_ID` — the 41 lazy components in `components/stories/charts/` (6,982 lines, 17 of them with 7–8.5px SVG text) have exactly one importer (the registry) and never render. `KeyFactsStrip` (StoryNarrative:561) is exported and unused. `/model` resolves (redirect to `/methodology`).

Not defects: the ES "stale" hit "As of April 2026 it holds 13,960 entities" is prose fact, not a dateline. `HeroArtwork` background dots are a decorative backdrop, not the banned dot-grid chart (`inline-dot-grid` has zero content references — it goes with STEP 0 only if unused; it is in `INLINE_CHART_MAP`, keep the map entry).

## Keep (do not touch)

- `/journalists`: the Guardian-list constitution — masthead (Playfair nameplate, computed thesis with the ochre «none has reached prosecution», Scotch rule, standing-edition dateline "DATA CUT 2025·09·28"), lead + off-lead 8/4 split, the desk as one ruled 3-column list ordered by the status ladder, section-color left rules, agate rubric by ink weight, the ARIA wire ticker, the Atlas band, Fe de plana clauses, all copy, `max-w-6xl` broadsheet width (a front page is not a reading page), all bilingual strings, `EntityIdentityChip` usage.
- `/stories/:slug`: the seven chapter variants and `pickChapterVariant`, drop caps, chapter dividers (incl. the sexenio era strip), DataPullquote roles, ClosingCoda (charter C3: Atlas CTA + ≥2 chips), Dramatis Personae roster, Methodology / Platform / Related acts, reading-progress bar, `ScrollReveal` motion, all story copy and chart data, the InlineCharts compositions (desktop crops must match), `localizeAmount`, `INLINE_CHART_MAP`.

## Change (8)

Acceptance = `_parallax_shots/day03/audit3.mjs` (extend in place; keep `before/` untouched; run as `node _parallax_shots/day03/audit3.mjs http://localhost:3011 after`) AND Fable judges the after-crops (`clip3.mjs`, chart selector fixed to `figure[role=img]`).

### 0. STEP 0 — delete the dead story-chart registry (own commit, first) — `StoryNarrative.tsx`, `components/stories/charts/*`
- `git rm -r frontend/src/components/stories/charts/` (41 components + `index.ts`). Remove from `StoryNarrative.tsx`: `lazyChart`, `CHART_REGISTRY`, `TYPE_TO_CHART_ID`, `ChartSkeleton` + `CHART_SKELETON_HEIGHT`, the registry branch at the end of `renderChartBlock` (keep the `cfg.data` inline branch and the multi-series / network / stacked branches; the fallthrough when no inline renderer matches keeps the existing `role="img"` placeholder), the now-unused `Suspense`/`lazy` imports, and `KeyFactsStrip` (exported, zero importers). Keep `components/sectors/CompetitionSlopeChart` + `EditorialSectorStoryCharts` (used by `/sectors`) — only their registry entries go.
- Before deleting, prove it: `rg -n "chartId: '" frontend/src/lib/story-content.ts` ids must all be inline-data keys (none equal a registry key); `rg -l "stories/charts" frontend/src` must return only `StoryNarrative.tsx`.
- Accept: `tsc -p tsconfig.app.json` 0 errors; all 13 stories render every chapter chart at 1440 (probe counts `figure[role=img]` per story after == before); `npm run build` emits no `charts/*` chunks.

### 1. `/journalists` 10px floor + kill the five italics — `PlanaMasthead.tsx`, `plana-parts.tsx`, `PlanaColofon.tsx`
- `PlanaMasthead.tsx:61` edition line `text-[9px]` → `text-[10.5px]`; `:91` remove `fontStyle: 'italic'` (the accent span's `fontStyle: 'normal'` becomes redundant — remove it too).
- `plana-parts.tsx:83` AgateRubric `text-[9px]` → `text-[10.5px]`; `:80` `'text-text-muted italic'` → `'text-text-muted'` (the utility is neutralised site-wide; the class is dead).
- `PlanaColofon.tsx:70` remove `fontStyle: 'italic'`; `fontSize: '13px'` → `'15px'` (Day 2d clause-prose size; Garamond at 13px is the smallest serif on the site). Keep `max-w-3xl` (the 68ch rule caps the line).
- Accept: probe on `/journalists` 1440 + 390, EN + ES: `sub10` = 0; `italic` = 0 for leaves AND for every `p` (add a `pItalic` count = `p` elements whose computed `font-style` is italic); the masthead crop still reads thesis → Scotch rule → lead.

### 2. `/journalists` valid whole-card links — `PlanaLeadBlock.tsx`, `PlanaDesk.tsx`, `plana-parts.tsx`
- The card stays a whole-card click, but the HTML becomes valid: outer element `<article className="group relative …">` (was `<Link>`), the headline `<h2>/<h3>` wraps a `<Link to={/stories/slug} className="… after:absolute after:inset-0 after:content-['']">` (stretched link — the `::after` covers the card so the brief and rubric are still clickable), and `PlanaTourBadge` stays a `Link` rendered **outside** that headline link as a sibling with `relative z-10` (drop the `onClick stopPropagation`; no longer nested). Hover underline: keep `group-hover:underline` on the headline link.
- Three sites: lead + off-lead (PlanaLeadBlock), desk row (PlanaDesk). Border-left / paddingLeft styles move to the `<article>`.
- Accept: probe: `main a a` = 0 on `/journalists`; 0 console errors on the route (the `cannot be a descendant` warning is gone); Playwright click on the lead's brief paragraph navigates to `/stories/el-sexenio-del-riesgo`; click on the lead's tour badge navigates to `/atlas?story=…`; Tab order reaches headline link then badge; `a[href^="/stories/"]` count unchanged (13).

### 3. The story reading frame — `StoryNarrative.tsx`, `ChapterBanner.tsx`
Day 2d mechanic, no rail: **frame 1010 · text 640 · figures 760**, all centered. Below `lg` everything stays full-width as today.
- Frame `max-w-[1010px]`: Act I outer (2357, was `max-w-6xl`), Act II (2386) + Act III (2393) (were `max-w-4xl`), Act IV (2402, was `max-w-5xl`), sticky bar inner (2335, was `max-w-4xl`), FeatureChapter grid (972, was `max-w-5xl`; 7/12 ≈ 566px prose ≤ 640, 5/12 ≈ 404px aside — DataPullquote's container queries already handle 383–480), RelatedSection (2106, was `max-w-5xl`).
- Text `max-w-[640px]`: every `max-w-prose` in chapter bodies and closers (912, 1045, 1081, 1089, 1123, 1188, 1207, 1342, 1423, 1482, 2022, 2167, 2217), ConnectiveChapter `max-w-[55ch]` (1232 — one measure, the smaller marker carries the rhythm), hero subtitle `max-w-3xl` (904) and StoryHero deck `max-w-2xl` (1646).
- Figures `max-w-[760px]`: hero chart — move the chart out of the prose div into its own `max-w-[760px] mx-auto px-4 sm:px-0 my-10` wrapper and drop the `-mx-4 sm:mx-[-10%] md:mx-[-15%]` bleed (941); feature chart (1017, was 5xl); data-spotlight chart (1065, was 6xl); standard chart — move `renderChartBlock` (1501) out of the prose div into a 760 wrapper, then the pullquote back in a 640 wrapper; closing pullquote (1443) + chart (1451); quote-spotlight figure (1137); Dramatis (1892); era-strip divider (748, was 3xl); ChapterBanner wrapper → `max-w-[760px] mx-auto` (the band is a figure; its text was stopping 274–719px short of the box).
- Headline blocks `max-w-[760px]`: StoryHero container (1604, was 4xl), hero chapter title block (865, was 5xl; the watermark numeral stays `right-2 sm:right-8` inside it), closing title (1402, was 4xl).
- ChapterBanner h2 (ChapterBanner.tsx:47): add `style={{ fontFamily: "'Playfair Display', Georgia, serif" }}` — hero, closing and connective titles are Playfair; this was the only sans chapter title.
- Accept (probe at 1920, 1440, 1024, 390 on 3 stories EN): Act I container width = 1010 and centered in `main` (left margin == right ± 2px) at ≥ 1300; every chapter `p` width ≤ 640 at 1440; every `figure[role=img]`, `section[id^=chapter-] > div[role],` ChapterBanner box, quote `figure`, dramatis box = 760 ± 2 at 1440 (when not inside the feature grid); set of distinct centered container widths at 1440 ⊆ {640, 760, 1010}; ChapterBanner slack (box inner-right − widest text right) ≤ 120px; no document-level horizontal overflow at 390 / 1024 / 1440 / 1920; the desktop crops (`hero`, `banner`, `feature-grid`, `closing`) read as one centered column with figures overhanging 60px each side.

### 4. Story hero: honest dateline + Playfair numerals — `StoryNarrative.tsx` 1685–1698, 1736–1747
- Replace the "Analysis as of May 2026" span with the front page's standing dateline: `lang === 'en' ? 'DATA CUT 2025·09·28' : 'CORTE DE DATOS 28·09·2025'`, `text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted tabular-nums`; `title` → EN "Stories are static analyses of the COMPRANET record, which froze on 28 Sep 2025. Live data updates in the Atlas and the ARIA queue, not in the story body." / ES "Las historias son análisis estáticos del registro de CompraNet, congelado el 28 de septiembre de 2025. Los datos en vivo se actualizan en El Atlas y en la cola ARIA, no en el cuerpo del artículo." Rewrite the comment (drop "March 25 2026").
- Kicker-stat number span (1736): add `fontFamily: "'Playfair Display', Georgia, serif"` to its inline style (`.tabular-nums` forces mono via index.css:193; the leadStat fallback at 1776 already overrides inline, so the two hero paths now match each other and every pullquote number).
- Accept: probe `stale` = 0 on all 13 stories EN + ES; the dateline leaf reads `DATA CUT 2025·09·28` / `CORTE DE DATOS 28·09·2025`; on `/stories/el-sexenio-del-riesgo` the kicker numeral computed `font-family` contains `Playfair`; hero crop at 1440 shows serif numerals.

### 5. ChapterNav stops printing over the column — `StoryNarrative.tsx` 1824–1874
- Labels show only on hover / focus-visible: active label class `opacity-100` → `opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100`; keep `aria-current="step"` and `aria-label` so AT still knows the active chapter. Add `motion-safe:` nothing — no motion involved.
- Accept: at 1440 on `/stories/el-sexenio-del-riesgo` no ChapterNav label has computed opacity > 0 without hover; the nav's dot column left edge ≥ the frame's right edge (`main` center + 505) at 1440 and 1920 (with the 1010 frame the dots sit in the margin); focusing a nav link (Tab) shows its label; the `feature-grid` and `closing` after-crops have no stray label text.

### 6. Story charts at 390: glyphs ≥ 10px — `InlineCharts.tsx` (+ `VendorPriceTrajectory.tsx`, `VennConvergence.tsx` if the probe flags them)
- The 12 live inline renderers scale fixed viewBoxes (W ≈ 800–900) down to ~318px on phones, so 13px SVG text renders at 4.5–6px. `useMeasuredWidth` (InlineCharts:188) already exists and is used by the register bar (538) and ThresholdDistribution (2073). Preferred fix per renderer: `W = Math.max(measured, MIN_W)` with `viewBox={0 0 ${W} ${H}}` so 1 unit = 1px, inside `<div ref={ref} className="w-full overflow-x-auto overscroll-x-contain">`; layouts that already derive from `W` need nothing else. Where a renderer's composition cannot survive a narrow `W` (dense labels), set `MIN_W` (≥ 600) so it scrolls inside its frame — the Day 2b fallback — and add the `sm:hidden` mono `text-[11px] text-text-muted` hint used by the `/gap` register ("← desliza para ver más →" / "← scroll for more →") above that figure only.
- Floor sweep: InlineCharts:264 stamp `fontSize: 8.5` → `10.5`; :667 `fontSize={8.5}` → `10.5`.
- Desktop compositions must not change: crops of the same charts at 1440 before/after are compared by Fable.
- Accept: probe at 390 (EN) on **all 13 story slugs**: `svg text` inside `figure` with on-screen size (`fontSize × renderedWidth / viewBoxWidth`) < 10px = 0; HTML `sub10` = 0 on every story; no document-level overflow at 390; at 1440 `svgSmall` = 0 and every `figure[role=img]` width is unchanged vs before (760 after Change 3).

### 7. Landmarks and headings — `StoryNarrative.tsx` 1596, `ChapterBanner.tsx` 22–27
- `StoryHero` `<header role="banner">` → drop `role="banner"` (MainLayout's header is the page banner; two banners fail the landmark rule).
- `ChapterBanner` wrapper `role="heading" aria-level={2} aria-label=…` → remove all three; the inner `<h2>` is the heading (the wrapper role made subtitle + era pill part of the heading text and made the inner h2 presentational).
- Accept: probe: `main [role=banner]` = 0; `[role=heading]` elements containing an `h1–h4` = 0; heading outline on a story = `h1` → `h2` per chapter → `h3` (chart titles, Methodology, Related) with no level skips; every `main a[href^="/"]` on 3 stories resolves to a route in `App.tsx` (executor greps the hrefs).

### 8. Bilingual + review + gates
- `rubli-bilingual-audit` on every touched TSX (new strings: dateline + title in Change 4, scroll hint in Change 6). `vercel-react-best-practices` + `ecc:react-reviewer` on the diff. Gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`. No backend touched → no pytest.

## Toolkit review (run after the plan, folded into Changes 5/7/8 via executor addendum)

- `web-design-guidelines` (Vercel rule set, fetched 2026-09-18) on the 8 files: StoryNarrative ChapterNav dot + progress bar use `transition-all` → explicit properties; chapter anchors lack `scroll-margin-top` under the sticky story bar; `ChapterSources` toggle lacks `aria-controls`; the nested-`<a>` (Change 2) and duplicate `role="banner"` (Change 7) confirmed. Everything else passes (focus-visible global, reduced motion via Day 1 MotionConfig, `text-balance` on headlines, tabular-nums, no images, no forms).
- `vercel-react-best-practices`: `setScrollPct` at the StoryNarrative root re-renders the whole story tree on every scroll frame (`rerender-use-ref-transient-values`) → extract `ReadingProgress`; scroll listener already passive; lazy chart registry removed in STEP 0 (bundle).
- `ui-ux-pro-max --domain ux/typography/chart`: line length 65–75ch and 1.5–1.75 line-height confirmed by the 640px column + `leading-[1.75]`; "fixed nav must not obscure content" backs Change 5; sunburst/heatmap results confirm the deleted registry charts were the wrong forms anyway; no database match for nested links or SVG mobile legibility (Change 2 and 6 rest on the HTML spec and the Day 2b precedent).

## Out of scope (backlog → `docs/PARALLAX.md`)

- `/journalists` colophon + Atlas band at the 1152 broadsheet width — the front page keeps its width; if the user wants the 1010 frame here too it is one class.
- `.tabular-nums { font-family: mono }` (index.css:193) silently re-fonts every numeral that does not override inline — a site-wide decision, not a Day-3 edit.
- Story `MethodologySection` prose is `text-sm` (14px) under 17px chapter prose; `PlatformLinks` descriptions 12px. Revisit with the 15px clause-prose convention if the user flags it.
- `HeroArtwork` cluster backdrop (70 decorative circles) on every story hero — sanctioned decoration, but the dot-grid ban makes it worth a look on the graphics-remake track (#4).
- `ChapterSources` toggle lacks `aria-controls`.
- InlineCharts full "HTML owns glyphs" rewrite (graphics remake #4+) — Day 3 only makes the SVG text legible at 390.

## Risk

- STEP 0 removes 6,982 lines the stories never reach; `tsc` + a per-story `figure` count before/after prove nothing rendered from them. Reversible by one revert.
- Change 3 changes widths only; copy, order and chart data are untouched. The feature grid at 1010 narrows the prose column from 587 to ~566px — inside the measure.
- Change 6 touches 12 renderers in a 3,744-line file. Executor: one renderer at a time, re-run the 390 probe after each, keep desktop crops identical. If a renderer resists, the min-width + scroll fallback is acceptable for Day 3.
- Change 2 restructures three card links; the click test in the acceptance is the guard.

## Build notes for the executor

- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, branch **`parallax/day-03-redaccion`** (already checked out at `d36b87dc` = origin/main). Ignore untracked `frontend/Python.npm-cache/` and `_parallax_shots/`. Never junction node_modules, never bare `git stash`, temp files under `D:\`.
- Read fully before editing: `Journalists.tsx`, the five `components/journalists/*`, `StoryNarrative.tsx` (chunks of ≤ 500 lines), `ChapterBanner.tsx`, `InlineCharts.tsx` (chunks). Re-read after each edit; never batch > 3 edits on one file without re-reading.
- Dev server: port 3011 already serves this worktree (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/journalists` → 200); if it is gone: `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` from `frontend/` (`VITE_API_URL`, not `VITE_API_BASE_URL`).
- Probes (Playwright, `channel: 'msedge'`, `createRequire('D:/Python/yangwenli/frontend/package.json')`): `_parallax_shots/day03/audit3.mjs` (extend in place with the checks above: `pItalic`, nested-anchor count, container-width set, banner slack, ChapterNav label opacity + geometry, per-story `figure` count, 390 SVG glyph size over all 13 slugs, landmark/heading checks, click tests) and `_parallax_shots/day03/clip3.mjs` (fix `chart` selector to `figure[role=img]`; add a `nav` crop). Output to `_parallax_shots/day03/after/`. Story slugs: `el-sexenio-del-riesgo el-vacio captura-institucional el-cartel-de-los-vales el-monopolio-invisible el-ano-de-la-emergencia la-ilusion-competitiva marea-de-adjudicaciones el-ejercito-fantasma el-gran-precio la-industria-del-intermediario el-umbral-de-los-300k volatilidad-el-precio-del-riesgo`. App language = `localStorage.i18nextLng` only.
- Look at your own after-crops before reporting: the story must read as one centered column with figures overhanging 60px each side, no half-empty boxes, no label printed over the column; the front page must look identical apart from upright colophon text and slightly larger agate.
- Commits (cite this file): first `chore(stories § PARALLAX D3 § Change 0 STEP 0): remove dead lazy chart registry (41 components, 6,982 lines) + KeyFactsStrip`; then `feat(journalists+stories § PARALLAX D3): reading frame 1010/640/760, honest dateline, 10px floor, italics out, valid card links, chapter nav, legible SVG at 390, landmarks` with a body listing `docs/parallax/DAY-03-redaccion-story-template.md § Change 1–8`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do **not** bump BUILD_ID, push, or deploy — Fable judges first.
- Report back: per-change PASS/FAIL with probe numbers (sub10, italic/pItalic, nested anchors, stale, width set, banner slack, nav geometry, 390 SVG count per story, landmarks, link resolution), gate outputs, commit hashes, and the after-crop list.
