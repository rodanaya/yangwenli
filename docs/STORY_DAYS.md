# STORY DAYS — remaking the 13 investigations' graphics (Sep 2026)

> User (2026-09-18, after PARALLAX Day 3): "this story barely has any graphs and it looks empty. there is no innovation and good graphs here. take a look at each one of these stories and then remake them using ui pro max with fable and with some react elements in it."
> Invoke a day with **"do story day N"**. One story per day. Fable designs the figure plan (ui-ux-pro-max `--domain chart` per data shape, folio aesthetic), Opus builds, Fable judges on crops, ship, `/rinse`.

## Principles

1. **Every chapter gets one figure that advances the argument.** No chapter is prose + a quote tile.
2. **Live over typed.** Where the platform already has an API-backed plate for the subject (`/gap`, `/administrations`, `/captura`, `/sectors`, vendor dossier), the story embeds that React component, fed by the same endpoint, with links into the dossiers. Typed numbers in `story-content.ts` stay only where no endpoint exists — and then they are checked against the live cut.
3. **One scrolly per story** where there is a sequence to walk: a figure that steps as the reader scrolls (vertical, single column — it must work inside the 640/760 reading frame at every width).
4. **Interaction that means something**: hover reveals the entity, a toggle switches the lens, a slider moves a threshold. No decoration.
5. **Folio chrome**: every figure wears `ChartCard` (eyebrow · title · anchor · annotation · stamp), 760 wide, on the story's text axis (PARALLAX Day 3b). Dot-grid banned, no italic, no green for low, HTML owns glyphs.
6. **Honesty**: a live figure that fails to load says so in one mono line; nothing is faked. Numbers in prose that a figure also shows must agree with the figure.

## Ritual (per day)

```
1. AUDIT  (Fable) — read the story's chapters; list each chapter's claim, its current figure, the data behind it, the live component/endpoint that could carry it; census figures.
2. DESIGN (Fable) — ui-ux-pro-max --domain chart for each data shape; write docs/story-days/SD-NN-<slug>.md: Keep · Figures (one per chapter: form, data source, interaction, acceptance) · Number refresh list · Out of scope.
3. BUILD  (Opus subagent, worktree parallax-day01, branch story/day-NN-<slug> off origin/main)
4. REVIEW (Opus: rubli-bilingual-audit, vercel-react-best-practices; gates tsc/build/lint:tokens; backend tests if an endpoint is touched)
5. JUDGE  (Fable: crops at 1440 + 390 per chapter; numbers vs API)
6. SHIP   (rubli-prod-deploy; verify by served chunk string)
7. CLOSE  (/rinse "Story Day NN+1: <slug>")
```

## Schedule — weakest first (figures per chapter, Sep 18 inventory)

| Day | Story | Ch | Figures now | Plan | Status |
|---|---|---|---|---|---|
| 1 | `el-vacio` | 5 | 2 → 7 | live `/gap` plates: blackout scrolly · recovery funnel · exception catalog · buyers ledger + counterparty · structural grade; number refresh to the live cut (69,516 → 94,899 …) · `e6a51551`+`950efa06`+`00bd33fc`, BUILD_ID `2026-09-18-story-d1-el-vacio` — `docs/story-days/SD-01-el-vacio.md` | ✅ Sep 18 |
| 2 | `el-ano-de-la-emergencia` | 3 | 1 | 2020 same-day-award calendar heatmap with the decree marked · monthly DA rate scrolly · HEMOSER award strip · emergency spend treemap | ⬜ |
| 3 | `el-cartel-de-los-vales` | 3 | 1 | 2002–2025 market-share stream of the three vendors with tenure bands · single-bid waffle · live vendor chips | ⬜ |
| 4 | `captura-institucional` | 5 | 2 | `/captura` La Línea trajectories (IMSS · CFE · PEMEX) · capture funnel · money sledgehammer | ⬜ |
| 5 | `la-industria-del-intermediario` | 4 | 2 | agency → intermediary → supplier Sankey · sector swimlane · chips | ⬜ |
| 6 | `el-ejercito-fantasma` | 4 | 2 | appear-win-vanish lifecycle strip · 6,118-ghost beeswarm · Two-Worlds match ledger | ⬜ |
| 7 | `el-umbral-de-los-300k` | 3 | 2 | interactive threshold histogram (draggable line) · per-institution small multiples | ⬜ |
| 8 | `la-ilusion-competitiva` | 5 | 3 | live sector competition slope · single-bidder waffle per year | ⬜ |
| 9 | `marea-de-adjudicaciones` | 5 | 4 | DA tide scrolly with sexenio shading + seam strip · sector deviation small multiples | ⬜ |
| 10 | `el-sexenio-del-riesgo` | 5 | 3 | Survivors slope + per-administration grade cards from `/administrations` | ⬜ |
| 11 | `el-gran-precio` · `el-monopolio-invisible` · `volatilidad-el-precio-del-riesgo` | — | 3–5 | keep; entity chips where a vendor is named | ⬜ |

`/journalists` is not in the queue (the Guardian list stays).

## Day files

`docs/story-days/SD-NN-<slug>.md` — written by Fable at DESIGN, updated with commit + BUILD_ID at SHIP.
