# RUBLI Editorial Design System

> Single source of truth for chart vocabulary, primitives, and conventions.
> If something contradicts this doc, this doc wins. Last updated 2026-05-04.

---

## Editorial primitives (use these; don't reinvent)

### `frontend/src/components/sectors/`
| Component | Vocabulary | Self-fetches? | Use for |
|---|---|---|---|
| `SectorTreemap` | FT/NYT squarified treemap (area = spend, fill saturation = risk) | ✓ | Spend × risk overview at the 12-sector level |
| `CompetitionSlopeChart` | FT slope chart 2015→2025 with OECD reference line + COVID band | ✓ | Multi-year DA% trajectory across 12 sectors |
| `RiskSpendBeeswarm` | Pudding-style scatter, log(spend) × risk, PRIORIDAD quadrant | ✓ | Investigation map at the sector level |
| `CategorySectorSwimlane` | Pudding "Where Slang Comes From" swimlane scatter | ✓ | 72 categories grouped into 12 sector lanes |
| `CategoryCaptureDumbbell` | FT/Pudding Cleveland dot-pair | ✓ | #1 vs #2 vendor share by category |
| `SectorSledgehammer` | Pudding "30 Years of American Anxieties" giant number hero | ✓ | Sector dossier page anchor |
| `VendorRiskSpendBeeswarm` | Beeswarm scoped to one sector's vendors | takes `vendors` prop | Top Vendors tab on sector dossier |

### `frontend/src/components/editorial/`
| Component | Vocabulary | Use for |
|---|---|---|
| `DashboardSledgehammer` | Pudding giant Playfair-Italic-800 number | Page-anchor hero (Dashboard, Administrations) |
| `EditorialDistribution` | KDE density-ridge with 0.25 / 0.40 / 0.60 risk threshold rules | Risk-score distributions (ARIA, Methodology, Vendor) |
| `EditorialTimeline` | Vertical NYT-style event timeline with sexenio bands | Vendor histories, case timelines |
| `BenchmarkRow` | FT bullet row (target / actual / threshold) | Vendor metrics vs OECD limits, per-sector procurement patterns |
| `FeaturedFinding` | Editorial lede with kicker + headline + meta + accent color | Top-of-page editorial finding (Sectors, Categories) |

### `frontend/src/components/charts/editorial/` (legacy, still in use)
- `EditorialLineChart`, `EditorialAreaChart`, `EditorialComposedChart`, `EditorialScatterChart`, `EditorialHeatmap`, `EditorialSparkline`, `DotStrip`, `ChartFrame` — keep using; they predate the sectors/ family but follow the same conventions.

---

## Anti-patterns — never ship these again

1. **Pie / donut charts** — no exceptions. Replace with capped horizontal bar (3 segments max) or `DotStrip`.
2. **Radar / spider charts** for cross-time comparisons — they fail at comparison; use slope chart instead.
3. **Sunburst** — never readable at our sizes. Replace with treemap or slope.
4. **5+ category bar charts** — slope chart or beeswarm wins every time.
5. **Stacked bars with > 3 segments** — hides the gap that's usually the editorial story.
6. **Recharts default tooltip** — always custom-style with editorial annotation.
7. **Line chart legends** — always direct-label at the right edge instead.
8. **Hex codes used as text fill** — use `SECTOR_TEXT_COLORS`, never raw `SECTOR_COLORS` on `<text>` or `style={{ color: ... }}`.
9. **Fake-geographic choropleths** (e.g., the deleted MexicoChoropleth state grid) — either ship a real TopoJSON map or no map at all.
10. **Decorative motion that delays the data** — first frame must show the answer.

---

## Color rules

```ts
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
```

- **`SECTOR_COLORS`** — vivid Tailwind-500 palette. Use ONLY for fills, strokes ≥ 1.5px, lane stripe backgrounds.
- **`SECTOR_TEXT_COLORS`** — darker Tailwind-800 variants. Use for ALL text colored by sector (`<text fill={...}>`, `<span style={{ color: ... }}>`). Yellow / light green / emerald / orange-500 fail WCAG AA on the warm-white background; the dark variants pass.
- **`RISK_COLORS`** — critical / high / medium / low palette. The `low` color is **zinc**, never green. Green over-claims safety on a corruption platform.
- **Thresholds** — `getRiskLevelFromScore(score)` returns `'critical' | 'high' | 'medium' | 'low'` using the canonical 0.60 / 0.40 / 0.25 ladder. **Never hard-code thresholds.**

---

## Editorial copy conventions

- **§ kickers** in `font-mono uppercase tracking-[0.15em] text-text-muted` above each section. Spanish primary, English fallback via i18n.
- **Risk model in copy** = `v0.8.5`. Never v0.6.5 or older.
- **Risk language** — "indicador de riesgo" / "risk indicator". **Never** "X% probability of corruption".
- **Honest pitch matrix** (CLAUDE.md) — never overclaim "$2.84T fraud" without the GT-link disclaimer (41 cases NULL on this field).
- **Spanish currency** — always use `formatCompactMXN`, never English-loaned "B MXN" in Spanish UI. Spanish output is "MDP" / "billones" / "mil millones".

---

## Helpers (always route through these)

```ts
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName, formatEntityName } from '@/lib/entity/format'
import { getRiskLevelFromScore } from '@/lib/constants'
```

- **Entity references** — always `<EntityIdentityChip type=... id=... name=...>` from `@/components/ui/EntityIdentityChip`. Never raw `<Link to={\`/vendors/${id}\`}>`.
- **Vendor names** — `formatVendorName(name, size)` or `formatEntityName(type, name, size)`.
- **Pesos** — `formatCompactMXN(value)` (locale-aware Spanish/English).

---

## Story chart pipeline

The 5 sector chart components are registered in `StoryNarrative.tsx` `CHART_REGISTRY`:

```
'editorial-slope'    → CompetitionSlopeChart
'editorial-treemap'  → SectorTreemap
'editorial-beeswarm' → RiskSpendBeeswarm
'editorial-swimlane' → CategorySectorSwimlane
'editorial-dumbbell' → CategoryCaptureDumbbell
'vendor-price-trajectory' → VendorPriceTrajectory  (Volatilidad story ch.2)
'venn-convergence'        → VennConvergence        (Volatilidad story ch.4)
```

A story chapter requests them via `chartConfig: { type: 'editorial-slope' }`. The 5 sector charts self-fetch their data — chapters need only the type identifier.

---

## CI gates (all 3 must pass before commit)

```
cd frontend
node_modules/.bin/tsc --noEmit -p tsconfig.app.json   # 0 errors (strict mode)
npm run lint:tokens                                    # PASS, 0 forbidden patterns
npm run build                                          # 0 errors
```

The token linter catches forbidden patterns re-entering `src/pages` / `src/components` / `src/hooks`: `text-red-400`, `bg-emerald-*`, raw hex outside `SECTOR_COLORS` / `RISK_COLORS` lookups, etc.

---

## Pending follow-ups

| Phase | Surface | Status |
|---|---|---|
| `sp-P2` wire-in | SectorProfile Overview tab | `SectorMoneyFlowSankey` component exists, not yet inserted |
| `admins-P1.5` wire-in | Administrations top hero | `AdminsSledgehammer` component exists, not yet inserted |
| `sp-P5` Sexenio timeline | SectorProfile By-Administration tab | Not started |
| `o-P1 + o-P2` | Atlas/Observatory MONEY + CASES lenses | Not started (prior attempt reverted) |
| `d-P4` LeadTimeWall redraw | Dashboard | Component still in inline form |

For execution context, the historical plan docs live in `docs/archive/2026-05-04/`.

---

*One source of truth. If you're tempted to ship a chart not in the primitives table, ask whether you're inventing or whether an existing primitive fits.*
