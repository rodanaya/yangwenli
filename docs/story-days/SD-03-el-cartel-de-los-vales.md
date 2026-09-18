# Story Day 3 — `el-cartel-de-los-vales` («Tres empresas, 240 mil millones de pesos y un mercado de vales que nunca se abre»)

Story: `frontend/src/lib/story-content.ts` slug `el-cartel-de-los-vales` (3 chapters: ch1 "Three Names Hold the Entire Market", ch2 "Two Ways to Keep Competition Out", ch3 "Five Governments Bought From the Same Three Firms"; 1 typed `inline-roster` in ch1; `entities` — check) · front-page entry in `Journalists.tsx` (`el-cartel-de-los-vales`: "The Voucher Cartel: 240 Billion in a Closed Market", sub "Edenred · Efectivale · Si Vale", amount 240, contracts 3000).
Plumbing from Days 1–2: `components/stories/live/*`, `LIVE_CHART_MAP`, `StickyStepFigure`, `ChartCard`, measured-width SVG + HTML glyphs, the zero-clip gate (STORY_DAYS.md § 7).

## Audit (prod, 2026-09-18) — the story's numbers do not survive contact with the data

| Claim in the story | Live data |
|---|---|
| "three vendors: Edenred, Efectivale, Sodexo" (lede) / "Edenred · Efectivale · Si Vale" (card) | `/vendors?search=`: **Edenred México** 44372 (2,898 contracts, 38.6B, DA 39.8%, single-bid 57.9%, risk 0.93, 2010–25) · **Efectivale** 45016 (2,539, 12.1B, DA 52.3%, SB 45.5%, 2010–25) + its pre-2010 entity **64** (1,150, 15.3B, SB 91.7%, 2002–10) + 3403 (120, 0.3B) · **Si Vale** 44362 (932, 15.8B, DA 61.6%, SB 36.6%, 2010–25) · **Sodexo** 474 (1,203, 8.8B, DA 37.9%, SB 54.7%, 2002–24) · **Toka Internacional** 102627 (1,944, **51.8B**, DA 30.6%, SB 66.4%, risk 0.99, 2013–25) — the biggest voucher vendor on the platform is not in the story |
| "240 billion pesos" market | no vouchers category exists (`/categories/summary`, 72 categories); the five vendors sum to ≈143B lifetime. The 240B has no source we can reproduce |
| "Edenred wins 96.7% by direct award · 2,210 contracts" | DA 39.8% on 2,898 contracts |
| "Efectivale won 2,210 single-bid tenders" / "2,868 single-bid wins" (card) | SB 45.5% of 2,539 (+ 91.7% of 1,150 pre-2010) — recompute |
| "P5 · VOUCHER CARTEL" annotations | ARIA P5 = **"Sobreprecio sistemático / Systematic overpricing"** (`/atlas/cluster-stats?lens=patterns`; 3,772 vendors, 4.55T MXN). All five vendors carry P5 as primary pattern (conf 0.5–0.7): Edenred T1 · GT · `confirmed`; Toka T1 · GT · `confirmed`; Si Vale T1 · GT · `needs_review`; Sodexo T1 · GT · `needs_review`; Efectivale T2 · not GT · `needs_review` (`/aria/queue?search=<name>`) |
| "five consecutive administrations" | the year series (`/vendors/:id/risk-timeline`) show a **handoff**: Efectivale/Sodexo dominate 2002–2010, Edenred + Si Vale 2010–2019, **Toka takes the lead from 2019** (6.1 / 6.6 / 8.2 / 4.2 / 11.6B in 2020–24) — a real, unreported story |

Chart forms (ui-ux-pro-max `--domain chart`): composition over time with a handoff → stacked area / stream with a 100% share lens; two rates per entity → paired-dot (dumbbell) or a two-column ledger; ranking with badges → the live roster; share by period across categories → small stacked bars per administration.

## Keep
Three chapters and their order; the newsroom voice; the chapter argument shapes (ch1 who holds the market, ch2 the two mechanisms — direct award and single-bidder tender, ch3 continuity across administrations); ClosingCoda; the folio chrome.

## Change 0 — fact audit and rewrite (EN + ES; every claim traced to an endpoint; before → after list in the commit body)
The executor first builds a **facts ledger** from the endpoints (`/vendors?search=`, `/vendors/:id`, `/vendors/:id/risk-timeline`, `/vendors/:id/timeline` (comp_wins / comp_total per year), `/aria/queue?search=`), then rewrites every sentence whose number or claim is false, keeping the voice (hard concrete ledes, active voice, "matches the pattern" not "is guilty"; ES in idiomatic Mexican Spanish, not literal). Specifically:
- The cast: five firms, not three. Name Toka as the newcomer that overtook the incumbents (verify from the year series before asserting). Efectivale's two legal entities are one firm — say so once.
- The size: replace 240B with the computed five-firm total (`formatCompactMXN`, MDP in ES) and say what it is ("federal contracts won by the five voucher issuers RUBLI tracks, 2002–2025") — never "the entire market".
- The rates: per-vendor direct-award % and single-bid % from the endpoint; the "two doors" claim is now about which vendor uses which door (Edenred and Toka win mostly through **single-bidder tenders**, Si Vale and Efectivale more through **direct award** — verify).
- The pattern: "P5" is systematic overpricing in ARIA; the story may say the five carry ARIA's P5 overpricing signature and that Edenred and Toka are ground-truth confirmed cases; it may NOT call P5 a "voucher cartel". Any collusion claim must rest on ARIA P7 confidences or documented cases — if none, the story says "market structure", not "cartel". Headline and card headline/sub/amount/contracts/brief must follow the data; propose the new headline in the report (EN + ES) — the judge approves it before ship.
- `entities`: the five vendors with `riskScore` and `ariaTier` from ARIA, ordered by value.

## Figures (4) — `components/stories/live/VoucherFigures.tsx`, all `ChartCard`, 760 on the text axis, one lazy chunk, one `useQueries` batch

Shared: `useVendorSeries(ids[])` → risk-timeline per vendor (merge Efectivale 64 + 45016 + 3403 into one series), `useVendorStats(ids[])` → `/vendors/:id`, `useAriaRows(names[])`. Colours: five fixed, no green, no sector palette — Toka `var(--color-risk-critical)`, Edenred `var(--color-accent)`, Si Vale `var(--color-text-primary)` at 70%, Efectivale `var(--color-text-muted)`, Sodexo `var(--color-text-muted)` at 55% with a dashed edge; a printed legend with the lifetime totals.

### F1 · Ch1 (hero, scrolly) «La repartición» — annual value by vendor 2002–2025, stacked, with a SHARE lens (live: `vales-stream`)
- Stacked bars per year (value, B MXN) for the five vendors; toggle `VALUE / SHARE` (100% stack). Administration tenure bands under the x-axis from `lib/administrations.ts` (Fox · Calderón · Peña Nieto · AMLO · Sheinbaum), labels in HTML. Stages (hero paragraphs): 0 = 2002–2010 only (the Efectivale/Sodexo years); 1 = through 2018 (Edenred + Si Vale years); 2 = through 2025 with Toka's rise labelled ("Toka leads from {year}"); 3 = SHARE lens on. Anchor = five-firm total + "won by five voucher issuers, 2002–2025" / ES. Annotation states the merge of Efectivale's entities and that 2025 is partial.
- Accept: 24 year columns; per-vendor totals equal the endpoint sums; the "leads from" year equals the first year Toka's value is the max and stays the max through 2024 (probe recomputes); stages 0→3; zero-clip census.

### F2 · Ch2 «Las dos puertas» — direct award % vs single-bid % per vendor (live: `vales-doors`)
- Five rows, two dots per row (DA % hollow accent, SB % filled critical), connector, both values printed, contracts count and lifetime value in the row's right column; sorted by SB %. Anchor = the vendor with the highest single-bid share + its value. Annotation explains the two doors in one sentence each (DA = no tender; SB = a tender with one bidder).
- Accept: ten values equal `/vendors/:id` fields; row order by SB desc.

### F3 · Ch2 «El registro» — the live roster replaces the typed `inline-roster` (live: `vales-roster`)
- Five rows: rank · `EntityIdentityChip` (type vendor, id, riskScore, ariaTier) · lifetime value · contracts · first–last year · ARIA badge (`T1/T2`, `GT` if `in_ground_truth`, status word only if `confirmed`). No "P5 · VOUCHER CARTEL" strings anywhere.
- Accept: five chips link to `/vendors/:id`; values equal the endpoint; zero-clip at 390 (chips at `size="sm"`, values on their own line below `sm`).

### F4 · Ch3 «Cinco gobiernos» — share of the five-firm total per administration (live: `vales-sexenios`)
- Five stacked 100% bars, one per administration (2002–06 Fox, 06–12 Calderón, 12–18 Peña Nieto, 18–24 AMLO, 24– Sheinbaum partial) from the year series aggregated with `lib/administrations.ts` ranges; each segment printed with its share when ≥ 8%, the leader named under each bar. Anchor = the number of administrations in which the leader changed (computed) + "handoffs in five administrations" / ES. Annotation: the handoff sequence in words, from data.
- Accept: five bars sum to 100 ± 0.5; the leader names equal the max segment per bar.

## Story data changes (`el-cartel-de-los-vales` only)
- ch1 `chartConfig: { type: 'live', live: 'vales-stream', scrolly: true, … }`; ch2 `live: 'vales-doors'`, `live2: 'vales-roster'` (typed roster removed); ch3 `live: 'vales-sexenios'`. Variants unchanged (ch1 hero, ch3 closing).

## Acceptance (`_parallax_shots/story-days/sd03.mjs`, 1440 + 390, EN + ES)
- ≥ 4 live figures; every rendered number equals the probe's recomputation from the same endpoints; none of the retired numbers (240, 96.7, 2,210, 2,868, "VOUCHER CARTEL") appear in EN or ES; Dramatis Personae shows five chips; F1 stages 0→3 and `el-vacio` / `el-ano-de-la-emergencia` scrollies still step; `clipcensus.mjs` = 0 (EN + ES, 1440/1280/1024/390) on the story; figures 760 on the axis; 0 console errors; `/journalists` card matches the story headline.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, new branch `story/day-03-vales` off `origin/main` after Day 2 is merged (fetch first). Same rules as Days 1–2 (read fully, ≤3 edits per file between re-reads, no bare stash, no junction, temp under D:\). Crops with sticky chrome hidden.
- Gates: tsc · build · lint:tokens; `rubli-bilingual-audit`; `vercel-react-best-practices`.
- Commit: `feat(stories § SD-03 el-cartel-de-los-vales): five voucher issuers, live — stacked years scrolly, two doors, roster, sexenio shares; facts rewritten from the endpoints` with the before → after ledger, citing this file. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy — Fable judges first (the new headline explicitly).
