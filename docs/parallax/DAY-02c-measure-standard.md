# PARALLAX Day 2c — The measure directive (text width + alignment standard)

Trigger: user, 2026-09-18, after the Day 2b deploy — "spacing and text alignment is not standardized: sometimes left and not justified, sometimes centered/justified, the text boxes only stretch so far and sometimes they don't. Standardize this." Site-wide, not a page day. Designed and applied by Fable (CSS only, no TSX beyond one class).

## What the census found (prod, 1440, 18 routes, `_parallax_shots/align/align-1440.json`)

Alignment was almost uniform already: every running-text block left-aligned except one justified headline (`/dashboard` h1, `md:text-justify`) and centered blocks that are legitimately centered (empty/error states, stat tiles, table cells, one story pull-quote).

**Line length was the flaw.** Blocks with no cap stretched to the container; blocks with an inline cap stopped at 46–68ch. Same page, both behaviours:

| Route | p/li median | p75 | max | over 80ch |
|---|---|---|---|---|
| `/methodology` | 122ch | 135 | 188 | 60 % |
| `/dashboard` | 132 | 175 | 175 | 63 % |
| `/cases` | 140 | 140 | 172 | 72 % |
| `/sectors` | 136 | 162 | 185 | 58 % |
| `/aria` | 134 | 161 | 265 | 100 % |
| `/stories/:slug` | 73 | 95 | 152 | 32 % |
| `/vendors/:id` | 74 | 74 | 181 | 23 % |

Readability norm (ui-ux-pro-max `Container Width`: "limit text to 65–75ch"; folio aesthetic skill: "68ch max width is intentional — beyond that the eye loses the line").

## The standard

1. **Running text** (`p, li, dd, dt, figcaption, blockquote`): max **68ch**, left-aligned, ragged right, `text-wrap: pretty`.
2. **Headlines**: `h1` max **32ch**, `h2/h3` max **44ch**, `text-wrap: balance`. Left-aligned.
3. **Justified text is banned** — `lint:tokens` fails on `text-justify` / `textAlign: 'justify'`.
4. **Centered text** only where it is a box, not a paragraph: stat tiles, table cells, empty/error states, auth pages, story pull-quotes. Those keep their own width.
5. **Explicit widths win**: any `max-w-*` utility or inline `maxWidth` overrides the directive (`:where()` = zero specificity), so deliberate narrower measures (deks at 60ch, story columns, `measure-headline` 36rem) are untouched.
6. Plates, tables and figures may be wider than the text column (editorial overhang, NYT/FT convention). Page containers stay per surface (`max-w-screen-xl` data pages, `max-w-6xl` dossiers); the four outliers (`/dashboard` 1100, `/cases` 1180, `/administrations` 1600, `/captura` 1024) are backlog, not this pass.

## Implementation (one place)

`frontend/src/index.css` — after the one-footer rule:

```css
main :where(p, li, dd, dt, figcaption, blockquote) { max-width: 68ch; text-wrap: pretty; }
main :where(h1) { max-width: 32ch; text-wrap: balance; }
main :where(h2, h3) { max-width: 44ch; text-wrap: balance; }
main :where(table, .text-center, [style*="text-align: center"]) :where(p, li, dd, dt, h1, h2, h3) { max-width: none; }
```

`frontend/src/pages/Executive.tsx:283` — `md:text-justify` removed (gold page, one class). `frontend/scripts/lint-tokens.mjs` — new `fail` pattern for justified text.

## Result

Dev-server census after the rule (same 18 routes, 1440): every route's p/li max = 68ch (the estimator reads it as 86 because it assumes 0.5em glyphs); medians 65–86 on the estimator, i.e. 52–68 real ch. Alignment counts unchanged except `/dashboard` justify 1 → 0. Screens checked: `/methodology` Part I/II/V, `/dashboard` hero, `/cases`, `/gap`, `/stories/the-ghost-army`, `/vendors/29277` — no broken layout, tables and tiles intact.

Gates: tsc 0 · build OK · lint:tokens PASS (new rule live). Shipped: _(filled at deploy)_.

## Backlog

- Normalize the four page-container outliers to `max-w-screen-xl` / `max-w-6xl`.
- `.text-deck` has no measure of its own (relies on the p rule at 68ch); consider 60ch to match `.lede-paragraph`.
- Mono captions under plates at 12px hit 68ch ≈ 500px — fine, but review on Day 7/8 plates.
