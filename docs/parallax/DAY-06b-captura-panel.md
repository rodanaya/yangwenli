# PARALLAX Day 6b — Captura: the four-perspective judgment

Follow-up to `DAY-06-captura.md` (shipped `380a8719`, BUILD_ID `2026-09-22-parallax-d6-captura`). After the ship the user asked for a four-perspective evaluation on Fable: **editorial reader** (72/100), **UI architect** (82), **accessibility auditor** (78), **data-viz critic** (71). Mean **75.75**. All four were read-only against the branch on the local stack; their evidence lives in `_parallax_shots/day06/panel/{reader,a11y,dataviz}/`. Every finding below was re-verified by Fable in code or in the measurement file cited.

## Verdict in one paragraph

The mechanics Day 6 set out to fix are fixed and no judge disputes them (1:1 film, disclosures, ledger fit, frame, focus, headings, census). What the panel found is one level up: the page still prints **non-words for 7 of its 13 captured institutions** ("Spf", "Inai", "Afac", "Siap", "Fnd", "Cij", "Agn") because a site-wide axios interceptor title-cases `institution_name` before any sigla guard can see it; the card **crossing-year labels sit on the red line in 11 of 12 cards** (measured, `panel/dataviz/callout-collisions.json`) — Fable had waved this through as "minor" from the crop; and the opened Exhibit A puts **two contradictory shares (70.01% and 5.9%) 300px apart** with no qualifier. Around those three: copy that over-claims ("federal institutions", "13 candidates", "holds X% today" for series that end in 2023), trajectories that bridge missing years and end on a partial 2025 without saying so, a log-scaled funnel with no scale note, an HHI column on a different basis than the share beside it, and a handful of architecture seams (cross-domain hook import, a one-key URL writer, a URL vocabulary that departs from the platform's).

## Evidence (each line re-verified)

| # | Finding | Judge(s) | Evidence | Root cause |
|---|---|---|---|---|
| B1 | Siglas title-cased: "CAPTURED Spf", "Siap", "Afac", "Fnd", "Cij", "Inai", "Agn", "Loteria" on the film + lead; ledger prints "PUE" correctly because it reads `name` | reader | `after/en-exhibitA-closed-1440.png`, `en-row-captive-1440.png` | `api/client.ts:270-277` `normaliseName` runs `toTitleCase` on every `institution_name`/`vendor_name`; `toTitleCase` (`lib/utils.ts:316-`) has a mixed-case guard but no sigla guard, so `formatInstitutionName`'s guard (`format.ts:51`) never sees ALL CAPS. **Site-wide, pre-existing.** |
| B2 | Card callouts through the line: 11/12 cards have a segment inside the label bbox, 10/12 on the dot | dataviz | `panel/dataviz/callout-collisions.json`, `card-08/09/11.png`; visible in `after/en-row-fell-1440.png` | `CaptureTrajectory.tsx:144-148, :234` — cards centre the short label on the crossing-year dot at `y(ceil)-4`; every fell-card peak is 52–57%, 1–5px above that row |
| B3 | "holds 70.01% today" vs "№1 vendor holds 5.9% of the record" in the same open exhibit | reader, dataviz | `after/en-exhibitA-open-1440.png` | `CaptureExpand.tsx:201` prints the landscape's cumulative 2002–2025 share under "on record" with no qualifier |
| S1 | Trajectory bridges missing years as a clean climb (AGN 2018→2021 through two absent years; 6/13 series have gaps) | dataviz | `panel/dataviz/card-08.png` | backend drops vendor-years < 1M MXN; `CaptureTrajectory.tsx:77-96` draws a continuous segment |
| S2 | 2025 endpoint is a partial year (horizon Sep 28) — Exhibit A's peak AND crossing are 2025, 6/13 series end there; nothing marks it | dataviz | `after/en-exhibitA-closed-1440.png`, `panel/dataviz/receipts-edenred@2x.png` | no partial-year encoding |
| S3 | Funnel bars are log-scaled (100 / 66 / 35 % of width for 100 / 8.4 / 0.9 %); only a code comment says so | reader, dataviz | `after/en-funnel-1440.png` | `FunnelStrip.tsx:34-37` |
| S4 | Ledger HHI is `latest_hhi` (one year) beside a cumulative share; 20/119 rows have HHI < 2,500 with share ≥ 50 %; `conc.` fires on 99/119 rows; nothing defines HHI/conc.; numeric columns left-aligned | dataviz, reader | `after/en-ledger-12-1440.png` row 012 (98.3 %, HHI 3,136) | `CaptureNowLedger.tsx` HHI cell + header |
| S5 | Copy over-claims: "federal institutions" (field = every COMPRANET buyer, incl. PUE/NL/VER); "Computed over 13 candidates" (`total_unfiltered` = result count on the precomputed path); sledgehammer "ONE VENDOR HOLDS THE MAJORITY OF … of recorded spend" (reads as one vendor across all 119; AT reads "majority of of" because the number is `aria-hidden`); "holds X% today" for series whose latest year is 2023/2024; "308.6M captured" is the window total, not the above-ceiling money; "peaked 70.01% … holds 70.01% today" | reader, dataviz, a11y | crops of funnel, methodology, sledgehammer, Exhibit A | `Relationships.tsx:60-61, :172-182, :221`; `CaptureFilm.tsx:388-389` |
| S6 | Chip suffix casing newly exposed by `fullName`: "S.a. De C.v.", "A.c.", "Secretaría De Salud Del Estado De México" | reader | `after/en-ledger-12-1440.png` rows 002/007 | `format.ts:42` suffix regex misses period forms; `:53` naive capitalise ignores particles — should route through `toTitleCase` |
| S7 | Keyboard: "See all 119" unmounts under focus (activeElement → body); `#la-pelicula` lands under the 44px sticky header (`scroll-mt-6`); the 12 card buttons' accessible names contain no vendor/institution (chips are siblings) | a11y | `panel/a11y/{en,es}-followup.json`, `en-anchor-jump.png`, CDP AX names | `CaptureNowLedger.tsx:235`, `CaptureFilm.tsx:106, :291` |
| S8 | Contrast: placeholder 3.98:1; the dashed 50 % ceiling line `#ef4444@.5` = 1.98:1 (a meaningful non-text mark); receipts bars 1.89 / 2.88:1 and their per-year MXN only in `title`; chip flag badges GT/T1 3.33:1 (shared, Day 5b backlog); ochre 12px labels 4.44 ×4 (Day 1 backlog) | a11y | `panel/a11y/{en,es}-report.json` (304 leaves incl. SVG `fill`) | `CaptureNowLedger.tsx:117`, `CaptureTrajectory.tsx:189`, `CaptureExpand.tsx:102-108`, `EntityIdentityChip.tsx:118` |
| S9 | Facet heads wrap as two independent columns at 390 ("STILL CAPTIVE / TODAY · LATEST SHARE ≥ / 50%") | reader | `after/en-row-captive-390.png` | `CaptureFilm.tsx:268` flex without wrap-by-phrase |
| S10 | Architecture: `components/capture` imports `useMeasuredWidth` from `components/cases/` while `stories/InlineCharts.tsx:188` carries a second incompatible copy; `makeSetParam` is a one-key writer that the ledger's two-key `onSort` already bypasses, and it closes over render-time `searchParams` (two writes in a tick clobber); URL keys `abrir/registro/todas/dir` vs the platform's English `sort/sort_order/page/q`; `ceilCrossX` is the first upward pierce anywhere, `crossYear` the first year ≥ ceil — they can disagree on a dip-and-recross series; `<button>` wraps a `<div>` and a `<p>` (phrasing-content model); `CaptureExpand` `id` optional; `?todas=1` has no undo | architect | code read | `CaptureTrajectory.tsx:18, :76-92, :143`; `captureParams.ts:13-24`; `CaptureNowLedger.tsx:46-51, :77-86`; `CaptureFilm.tsx:69-72, :295, :304` |
| N | Nits: "277.0B MXN" trailing zero + missing "≈" on the USD sub-line; two-decimal "70.01%"; "(P6)" internal id in labels; orphaned "·" at line ends in the legend; "#" renumbers under a non-share sort; "Busque…" tú/usted mix; `th` without `scope`; nested "The funnel" regions; sector dots without `title`; raw `#71717a` ×4 | all | — | as cited by each judge |

## Keep (all four judges agree)

The § order as an argument; the 1:1 trajectories with one ceiling row per facet, split recolour at the true crossing, AFAC's double crossing, edge ticks anchored start/end (dataviz: "the best thing on the page"); the lead's side-stepping callout rule (0 hits); ink/mark discipline through `RISK_TEXT_COLORS`; the disclosure restructure (architect: "no duplicated toggling"); `table-fixed` + colgroup, no scroller at 1440, the hint at 390; `?registro=value&dir=asc` verified; ES currency (MDP everywhere, USD sub-line EN only); STEP 0 first; class-only `SortHeaderTh` change; "What this plate can't tell you" and "The arithmetic leads; the model only comments".

## Change (8) — GOLD, enhance in place

### 1. Siglas keep their capitals — `lib/utils.ts` (`toTitleCase`), `lib/entity/format.ts` (`formatInstitutionName`)
- `toTitleCase`: before the lowercase pass, a single token (no space) of ≤ 8 characters that is ASCII all-caps returns unchanged (IMSS, PEMEX, CFE, SPF, INAI, AGN, CIJ, FND, AFAC, SIAP). Multi-word ALL-CAPS names keep today's behaviour.
- `formatInstitutionName`: the ALL-CAPS branch routes through `toTitleCase` (particles + period suffixes handled once); delete the naive split-and-capitalise and the `\b`-terminated suffix regex.
- **Shared change → site-wide probe** (Day 5b process rule): before/after on `/captura`, `/cases`, `/cases/oceanografia-pemex-fraud`, `/institutions`, `/aria`, `/vendors/44372`, `/network`: dump every `EntityIdentityChip` text; assert no chip text changed except tokens that were single all-caps siglas (list them) and suffix/particle casing (`S.a. De C.v.` → `SA de CV`, `De Salud Del` → `de Salud del`). Vitest: extend the nearest `utils`/`format` test with `SPF → SPF`, `SECRETARÍA DE SALUD DEL ESTADO DE MÉXICO → Secretaría de Salud del Estado de México`, `TRANSPORTADORA DE SAL, S.A. DE C.V. → … SA de CV`.
- Accept: film crops show "CAPTURED SPF / SIAP / AFAC / FND / CIJ / INAI / AGN"; the site-wide chip diff contains only the two allowed classes; vitest green.

### 2. Card callouts step off the line — `CaptureTrajectory.tsx`
- Cards adopt the lead's rule: anchor on the geometric pierce, `end` at `−6` when the pierce is right of `W/2`, else `start` at `+6` **and dropped below the ceiling** (`y(ceil) + 12`) because on the right of a rising pierce the path is above the line (architect's correction); the pierce is the segment whose `b.year === crossYear` (not the first pierce anywhere); when `crossYear` is the first year there is no pierce and `x(crossYear)` is the anchor; drop the dead `?? minYear`.
- Accept: re-run `panel/dataviz` collision probe (copy it to `day06b/`): **0 line hits and 0 dot hits on 13/13** svgs at 1440 and 390, EN + ES; `svgClip` 0; the two facet-row crops re-read.

### 3. Honest lines — `CaptureTrajectory.tsx`, `CaptureFilm.tsx` (legend), `FunnelStrip.tsx`
- Segments whose `b.year − a.year > 1` render `strokeDasharray="2 4"` at opacity 0.55 (crossing split kept).
- `year ≥ 2025` dot is hollow (fill = card ground, stroke = its side's colour) and its tick reads `'25*` / `2025*`; the legend sentence appends `· * 2025 partial, to Sep 28` / `· * 2025 parcial, al 28 sep`.
- Ceiling line: drop `opacity={0.5}` (1.98:1 → 3.76:1 as a non-text mark).
- FunnelStrip: one mono 12px caption under the strip: EN `bar length log-scaled for legibility · the counts are the measure` / ES `largo en escala logarítmica · las cifras son la medida`.
- Accept: crops of AGN and ASIPONA cards show dashed bridges; Exhibit A shows a hollow 2025 dot and `2025*`; legend + funnel caption read in EN and ES at 1440/390; `smallCount` 0; census 0.

### 4. Copy that matches the figure — `Relationships.tsx`, `CaptureFilm.tsx`, `CaptureExpand.tsx`, `MoneySledgehammer.tsx`
- Funnel tier 1: drop "federal" (EN "institutions with over 100M MXN on record" / ES "instituciones con más de 100M MXN en el registro").
- Methodology: "Screened {landscape.qualifying_count} institutions; {total_captures} (institution, vendor) pairs passed: ≥ {min_years} years of data, floor {floor}%, ceiling {ceil}%" (ES equivalent). No more "13 candidates".
- Sledgehammer eyebrow: EN "ACROSS THESE 119 INSTITUTIONS, A SINGLE VENDOR EACH HOLDS THE MAJORITY OF" / ES "EN ESTAS 119 INSTITUCIONES, UN SOLO PROVEEDOR EN CADA UNA CONCENTRA LA MAYORÍA DE"; deck "in recorded spend — …" / "del gasto registrado — …" (no doubled "of"); the number loses `aria-hidden` (the group label already states it — drop the label's number instead) ; value `≈${formatCompactUSD}` for the sub-line; strip a trailing `.0` in the hero via `formatCompactMXN` behaviour check (if the helper prints `277.0B`, leave it and log as platform backlog — do not fork the formatter).
- Exhibit A sentence: `peaked {peak.toFixed(1)}% in {peak_year} · {holds ? `holds ${latest.toFixed(1)}% as of ${latest_year}` : `fell to …`} · {MXN} over the window`; when `peak_year === latest_year`: "holds X% as of YYYY, its peak". Cards' `+pp` stay integers.
- CaptureExpand band C: "Across the full 2002–2025 record, the №1 vendor holds {share}% — more concentrated than {pct}% of the field" / ES "En todo el registro 2002–2025, el №1 acumula …"; receipts caption appends `· tallest = {formatCompactMXN(maxVal)} ({year})`; each bar gets an `sr-only` span with its title string and the bars drop the 0.5 / 0.85 opacity.
- Labels: "VENDOR FINGERPRINTS (P6)" → "VENDOR FINGERPRINTS" / "HUELLAS DE PROVEEDOR"; the pattern chip name "Capture pattern" / "Patrón de captura" (chip id stays `P6`).
- Accept: `rubli-bilingual-audit` clean; the reader's sentences re-read on the crops; AT snapshot of the sledgehammer reads "…MAJORITY OF 277.0B MXN in recorded spend…"; `usdInEs` 0.

### 5. The ledger's numbers on one basis — `CaptureNowLedger.tsx`
- HHI header → "HHI · latest yr" / "HHI · último año"; **drop** the `conc.` tag (it fires on 99 of 119 rows, so it flags the norm) and add one mono legend line under the table: "HHI ≥ 2,500 = concentrated (US DOJ/FTC line) · latest year, not the record" / ES equivalent. `HHI_CONCENTRATED` moves to `lib/constants.ts` beside the integrity lines and `RedesKnownDossier.tsx` imports it (backlog item, one line each).
- Recorded and HHI headers + cells `text-right`; `th scope="col"` ×6; sector dot `title={sector.name}`; placeholder `placeholder:text-text-secondary`, ES "Busca…"; "#" header → "row" / "fila" when the sort is not share (or keep the share rank — pick the smaller diff, state it).
- "See all" → after the click, focus the table wrapper (`id`, `tabIndex={-1}`); render a "Show 12" / "Ver 12" twin when `?todas=1`.
- Accept: `activeElement` after Enter on "See all" is the wrapper; `?todas=1` shows the twin and `?todas` clears on it; contrast probe: placeholder ≥ 4.5; legend line present EN/ES; `aria-sort` walk still correct.

### 6. Film accessibility and wrap — `CaptureFilm.tsx`, `CaptureExpand.tsx`, `Relationships.tsx`
- Each card button starts with `<span className="sr-only">{vendor_name} · {institution_name}: </span>` (AX name begins with the entity); button children become `<span className="block">` (phrasing content); `CaptureExpand` `id` required.
- `#la-pelicula` `scroll-mt-6` → `scroll-mt-14`; the funnel anchor target is then clear of the 44px header.
- Facet head: `flex flex-wrap items-baseline gap-x-2 gap-y-0.5` so each phrase wraps whole; the legend sentence puts each `·` in a `whitespace-nowrap` span with the following term.
- Drop the outer `aria-label` on the funnel `<section>` (FunnelStrip names itself).
- Accept: CDP AX names of the 12 buttons start with the vendor; anchor jump leaves "§ Exhibit A" fully visible below the header (probe `panel/a11y/a11y6b.mjs`); 390 crops of both facet heads read as two whole phrases; nested regions 0.

### 7. Architecture seams — `hooks/useMeasuredWidth.ts` (new home), `components/stories/InlineCharts.tsx`, `CaptureFilm.tsx`, `CaptureNowLedger.tsx`, delete `captureParams.ts`
- Move `components/cases/useMeasured.ts` → `hooks/useMeasuredWidth.ts` (both exports); update the four importers (`CasesShared`, `CaseTimeline`, `DossierBlocks`, `CaptureTrajectory`); `InlineCharts.tsx:188` `useMeasuredWidth` delegates to it while keeping its `{ ref, width }` shape (six callers untouched).
- URL state through nuqs `useQueryStates` (already wrapped by `NuqsAdapter`, used on `/cases`): film `{ sort: parseAsStringLiteral(SORT_KEYS).withDefault('cruce'), open: parseAsString }`, ledger `{ ledger: parseAsStringLiteral(['share','value','hhi']).withDefault('share'), ledger_order: parseAsStringLiteral(['asc','desc']).withDefault('desc'), all: parseAsBoolean.withDefault(false) }`, `history: 'replace'`, `clearOnDefault: true`. Keys renamed to the platform vocabulary **now** (`abrir → open`, `registro → ledger`, `dir → ledger_order`, `todas → all`) while the old ones are one day old; no redirect shim. `captureParams.ts` deleted; `keyOf` / `panelId` hoisted to module level; one `toggle` shared by facets and lead.
- Accept: tsc/eslint clean; `/captura?open=1340-44372`, `?ledger=value&ledger_order=asc`, `?all=1` reproduce the Day 6 states; defaults never written to the URL; the Day 6 probe routes updated; no importer of `captureParams` remains (`git grep`).

### 8. Inks (approved by the user 2026-09-22 with the panel findings) — `Relationships.tsx`, `FunnelStrip.tsx`, `CaptureFilm.tsx`, `CaptureNowLedger.tsx`, `components/ui/EntityIdentityChip.tsx`
- The four 12px ochre labels on `/captura` (Folio·XIV, "see the film ↓", active sort, "See all") → `var(--color-accent-hover)` (#835616, 6.3:1), as CrossSeal already does. This is the Day 1 backlog decision applied to one page; if approved, the same rule becomes the site standard for accent type ≤ 13px.
- Chip flag badges GT / T1 (`EntityIdentityChip.tsx:118` `FLAG_TONE`): badge text ink → `RISK_TEXT_COLORS.critical` (fill stays). Shared → site-wide contrast probe on the same seven routes as Change 1.
- Accept: `failingContrast` on every `/captura` state = **0** (first surface on the site at zero); site-wide probe shows no badge below 4.5.

## Out of scope (→ PARALLAX backlog)
- Data garbles from source ("Asiponaacapulco", "Scontinuidad Latam", "Netafim Exico", "ASIPONA- Salina Cruz"); institutions whose only name is a state code (11 ledger chips: NL, VER, TLAX, PUE, QRO, APAST, ZAC) — DB, not UI.
- `formatCompactMXN` prints `277.0B` — trailing-zero rule is platform-wide.
- `document.title` never set per page (site-wide, 2.4.2).
- Search input border 1.28:1 (site token).
- Scroller release keyed to `lg` viewport rather than the container (a persisted-open sidebar at 1024 leaves ~696px) → `@container` on the wrapper.
- `PageFooter` separators orphan at line ends (shared).
- `captureAxis.tsx` react-refresh errors; raw `#71717a` ×4 → one constant.

## Risk
- Change 1 is shared by every page that renders `institution_name`/`vendor_name` — the site-wide chip diff is the gate; any changed token outside the two allowed classes is a stop.
- Change 7 renames public URL keys one day after they shipped; do it in the same day as Change 2 so a single BUILD_ID carries both.
- Change 3's hollow-dot + dashed-segment encodings must not touch the ceiling row or the split recolour (the "Keep" list).
- Change 8 waits for the user's call on the ochre standard.

## Build notes for the executor
Same stack and rules as `DAY-06-captura.md § Build notes`: worktree `parallax-day01`, new branch `parallax/day06b-captura-panel` off `origin/main`, servers running on 8001/3009, ≤ 2 browsers, `MSYS_NO_PATHCONV=1`, progress file `_parallax_shots/day06b/progress.md`, report `_parallax_shots/day06b/report.md`, probes copied from `day06/audit6.mjs` + `day06/panel/dataviz` (collision) + `day06/panel/a11y/a11y6b.mjs` (anchor + AX names) + a new site-wide chip-diff probe for Change 1; crops re-taken for every region the judges cited. One commit per change; `rubli-bilingual-audit`; gates tsc · build · lint:tokens · eslint · vitest. Do NOT bump BUILD_ID, push or deploy — Fable judges first.

## Result

Built by Opus executor `parallax-day06b` (8 changes + 3 verification follow-ups, 11 commits `b5bbe120`…`38890ac7`), judged by Fable on the `after/` crops at 1440 + 390, EN + ES (facet rows, Exhibit A closed/open, funnel, sledgehammer, ledger head, 390 table at three scroll positions) and on a re-run of `audit6b.mjs` + `collisions6b.mjs` against the executor's HEAD (`judge/`). No judge fix needed.

| Check | before (Day 6) | after (`38890ac7`) |
|---|---|---|
| siglas on the film + lead | "Spf", "Siap", "Afac", "Fnd", "Cij", "Inai", "Agn", "Loteria" | SPF, SIAP, AFAC, FND, CIJ, INAI, AGN, LOTERIA |
| site-wide chip diff (7 routes, EN + ES, before dump taken on the untouched build) | — | 143 rows; 12 strings changed: 8 siglas restored + 4 particle/suffix recasings ("Secretaría de Salud del Estado de México", "PEMEX Exploración y Producción"…); 0 outside the two allowed classes; `utils.test.ts` 24/24 |
| card callouts with a line or dot hit (13 svgs, 1440 + 390, EN + ES) | 11 / 13 (19 line hits, 10 dot hits) | 0 / 13 (0 / 0); `svgClip` 0 |
| gap bridges / partial 2025 | continuous lines; nothing marks 2025 | dashed bridges on AGN, INAI, ASIPONA, CONADE, INAPAM; hollow dot + `'25*` / `2025*`; legend note; ceiling rule 1.98 → 3.76 |
| funnel scale | code comment only | mono caption EN/ES under the strip |
| Exhibit A sentence | "peaked 70.01% in 2025 · holds 70.01% today · 308.6M MXN captured" | "holds 70.0% as of 2025, its peak · 308.6M MXN over the window" |
| open exhibit, band C | "№1 vendor holds 5.9% of the record" beside "holds 70.01%" | "Across the full 2002–2025 record, the №1 vendor holds 5.9% …"; receipts caption "· tallest = 150.4M MXN (2025)" |
| copy | "federal institutions", "13 candidates", "ONE VENDOR HOLDS THE MAJORITY OF … of", "(P6)" | "institutions with over 100M MXN on record"; "Screened 1,424 institutions; 13 pairs passed…"; "A SINGLE VENDOR EACH HOLDS THE MAJORITY OF … in recorded spend"; labels without the id |
| ledger | HHI beside a cumulative share, `conc.` on 12/12 rows, no legend, left-aligned numbers, no `scope` | "HHI · latest yr", tag dropped, legend line EN/ES, right-aligned, `scope="col"` ×6, placeholder 3.98 → 5.74, focus → table wrapper after See all, "Show 12" twin |
| card button accessible names | "Vendor share of institution spend…" | "Toka Internacional · CIJ: Vendor share…" |
| anchor jump `#la-pelicula` | h2 under the 44px header | clear (`scroll-mt-14`) |
| architecture | `components/cases/useMeasured.ts` imported cross-domain; `captureParams.ts`; keys `abrir/registro/todas/dir` | `hooks/useMeasuredWidth.ts` (InlineCharts delegates); nuqs `useQueryStates`; keys `open`, `ledger`, `ledger_order`, `all`; `captureParams` deleted (0 importers) |
| failing contrast on `/captura`, every state, EN + ES | 5 leaves at 4.44 (+2 badges at 3.33 open) | 0 AA failures — the two listed leaves are large text (68px hero number 3.76, 48px h1 span 4.44, both ≥ 3:1) |
| clip census `/captura` + `?all=1` at 1440/1280/1024/768/390, EN + ES | 0 | 0; `/stories/captura-institucional` unchanged |
| sub-10px / nested / no-focus / small targets / heading skips / ellipsis | 0 | 0 |

Gates (Fable re-run): tsc 0 · build OK (38 s) · lint:tokens PASS · vitest utils 24/24 (executor); executor: eslint clean on touched files, bilingual audit clean. Branch −230 / +456 lines over 20 files.

Deviations accepted: the legend's `·` separators use NBSP joins rather than nowrap spans; the hidden HHI column is not rendered at all at 390 (`01f253fa`) and the Spanish HHI header was shortened to fit one line (`38890ac7`); callout placement is scored once per card (`8f3360b6`); the ledger legend line is a `<p>` and wraps at the 68ch measure under the 944px table (readable, two lines — noted, not changed).

Noticed, not fixed (→ backlog): the lead's peak label "▲ 70.0% (2025)" registers one bbox hit against its own hollow end dot (visually clear on the crops); DB-level names for state-code institutions; `277.0B` trailing zero; per-page `document.title`.

Executor deviations (from its final report): the shared title-caser yields "S.A. de C.V.", not "SA de CV" — the test asserts the real output rather than forking the suffix table; the callout rule alone left two rise-and-fall cards hit, so placement is scored against the marks it must avoid; legend separators join with NBSP (nowrap spans clipped at 390); the row header reads "Row" / "Fila" in every order; Change 8 also touched the tier-badge map (six call sites) — zero AA failures was unreachable without it; nuqs' boolean parser reads only `true`, so `?all=` uses a custom parser reading `1|true` and writing `1`; the full vitest suite shows 5 pre-existing Sidebar failures (identical on `origin/main`). Also noticed: `/cases` renders some entity links without `EntityIdentityChip` (CLAUDE.md rule 1) → backlog.

Shipped 2026-09-22 14:29Z: origin/main + VPS HEAD `d99212d0`, BUILD_ID `2026-09-22-parallax-d6b-captura-panel`, entry `index-DatjKwuR.js` → `index-Cnw6uhcs.js` (BUILD_ID string verified in the served entry), health OK (3,058,286 contracts), deployed via `deploy-safe.sh`. One prod screenshot (`_parallax_shots/day06b/prod/captura-1440.png`): the film's institution chips read SPF, LOTERIA, SIAP, AFAC, FND, CIJ, INAI, AGN; frame 1,010, 13 disclosure buttons, ledger 944.
