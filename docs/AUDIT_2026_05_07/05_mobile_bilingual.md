# Audit 05 — Mobile + Bilingual

Live URL: https://rubli.xyz · Audit date 2026-05-07 · Viewport 390×844 (iPhone 14) · Session lang ES (default `i18nextLng=es` is honored after first toggle)

---

## Part A — Mobile (390px)

The platform appears to have **no mobile breakpoints below ~1280px**. Every page renders at its desktop minimum (≥1434px) and the user is left with horizontal scroll plus a fixed 56px sidebar overlapping content. `document.documentElement.scrollWidth` reports 1434–1440 on every surface despite a 390 viewport.

| Surface | Verdict | Worst issue | Severity |
|---|---|---|---|
| `/` Dashboard | broken | Page content is 1434px wide; horizontal scroll on every section; "Headline numbers" rail clips | blocker |
| `/atlas` | broken | 1200-dot canvas + scrubber assume desktop width; `text` SVG nodes overflow (553 vs 387 visible); auto-tour narrative panel covers chart | blocker |
| `/aria` | broken | Risk Queue table with 8 columns (Tier · Pattern · Sector · Contracts · Years · Score · Flags · GT) does not collapse — every row needs a 1080px swipe | blocker |
| `/sectors` | broken | 12-sector tile grid (4 columns at desktop) renders 4-up at 390 → tiles compress to ~80px each, numbers truncate | blocker |
| `/sectors/salud` | broken | Same as `/sectors` plus inline DotStrip charts force-render at 800px (overflow) | blocker |
| `/vendors/29819` (redirects to `/vendors/4325`) | broken | VendorHero metric row (Contracts/Value/Direct/Institutions) overflows; Evidence/Activity/Network tab strip gets a horizontal scroll | blocker |
| `/institutions` (redirects to `/vendors/1` after console error storm) | broken | Routing bug: page 404s into `/vendors/1`, console floods with 23+ errors | blocker (broken navigation) |
| `/cases` | degraded | Loads but filter chip rail (`TIPO · ADMIN · ESTADO`) wraps weirdly; large MXN figures wrap mid-token | degraded |
| `/methodology` | broken | Redirects to `/vendors/4325` — page is unreachable from this URL | blocker |
| `/stories/el-ejercito-fantasma` | degraded | Hero figure pull-stat (`6,034`) renders at Playfair 4.75rem = ~76px and pushes into the right margin; chapter switcher overlaps text on first paint | degraded |

**Mobile-blocker surfaces: 7 of 10.**

### Top 3 mobile failures

1. **Global no-mobile-CSS bug.** The shell (`<aside class="fixed left-0 top-0 ... w-14">`) plus a content area built around the desktop column grid means **every** page has a 1434px floor. The 14px sliver of horizontal scroll on `/` is the symptom; on `/aria` it's a 1080px swipe to see the risk score column. Screenshots: `m01_dashboard.png` (404 × 11669, captured at the actual mobile width before subsequent navigations forced 1440), `m02_atlas.png`, `m03_aria.png`.
2. **Atlas constellation is unusable.** 1,200-dot Halton canvas + chapter rail + lens toggles need ≥1024px to be readable. At 390 the dots collapse to a single noisy band, the lens toggle (`PATTERNS / SECTORS / CATEGORIES / TERMS`) wraps to two rows, and the auto-tour narrative panel covers the chart it's narrating.
3. **Vendor profile metric row fragments.** `VendorHero.tsx` renders four KPI cards in a single flex row at 390 — they each get ~80px and the values (`32,038 MDP` / `42%` / `17` / `999`) collide with their captions.

---

## Part B — Bilingual leaks

Tested on ES locale (`localStorage.i18nextLng=es`). Snapshots saved via `mcp__playwright__browser_snapshot`.

| Surface | English strings found in ES session | Severity |
|---|---|---|
| Header / shell (every page) | `THU · MAY 7 · 2026` (story page only — top bar is bilingual on others, EN locks back on `/stories/*`); `SIGN IN`, `LIVE` (vs `EN VIVO`, `INICIAR SESIÓN` — inconsistent across routes); `Search vendors, cases...` (placeholder ES on most, EN on stories) | blocker |
| `/` Dashboard | `WHO Sectores 12 / WHAT Categorías —` (toggle labels), `TOTAL SPEND` (next to ES `TOTAL DE CONTRATOS`) | high |
| `/atlas` | Lens labels `PATTERNS / SECTORS / CATEGORIES / TERMS` plus chapter pull-stats `critical · 4.97% / high · 5.95% / low · 72.69%` — the dot legend never localizes | high |
| `/aria` Risk Queue | Sector chips render English uppercase (`HEALTH`, `INFRASTRUCTURE`, `EDUCATION`, `ENERGY`, `TREASURY`) on 314 visible T1 rows; pluralization bug `1 contratos` (no singular form) | blocker |
| `/sectors` | `TOTAL SPEND` headline tile; sub-toggle `WHO Sectores 12 / WHAT Categorías` | high |
| `/sectors/salud` | (redirected to dashboard in test — same dashboard leaks apply) | high |
| `/vendors/4325` (proxy for 29819) | Breadcrumb `VENDORS / Vendor Profile`; primary action button `Generate Report`; feature label `Factor principal: Price Volatility`; tab descriptions still rely on EN feature names (`network_member_count`) | blocker |
| `/cases` | `ADMINISTRATIONS.MULTIPLE` (untranslated **i18n key** leaking to UI); `$208.4B MXN` (English-loan, should be `208.4 MDP` or `0.21 billones MXN`) | blocker |
| `/methodology` | unreachable; redirects | n/a |
| `/stories/el-ejercito-fantasma` | **Entire story is monolingual English** in ES locale: hero "The Ghost Army", chapter titles "What the Algorithm Sees / The Signature of Nothing", body prose "Empresas fantasma — ghost companies — are the single most efficient form of procurement fraud ever documented in Mexico…", header strip flips to `Skip to main content / THU · MAY 7 · 2026 / Search vendors, cases... / SIGN IN`. The localStorage flag is still `es`. | blocker |

**Surfaces with bilingual leaks: 9 of 10.**

### Notable leaks (specific strings, where they appear)

- `Generate Report` — `VendorHero.tsx` header action button, never wrapped in `t(...)`; sits next to ES `Compartir` and `Hilo`. Found on every vendor dossier.
- `Price Volatility` — vendor profile "Factor principal" inline text. The 18 active features in `RISK_METHODOLOGY` carry their English ML-paper names through the UI.
- Sector uppercase chips (`HEALTH`, `EDUCATION`, `ENERGY`, `INFRASTRUCTURE`, `TREASURY`) — `aria_queue` rows. Should map through the 12-sector taxonomy table to ES (`SALUD`, `EDUCACIÓN`, `ENERGÍA`, `INFRAESTRUCTURA`, `HACIENDA`).
- `ADMINISTRATIONS.MULTIPLE` — raw i18n key. `Cases.tsx` left a `t('administrations.multiple')` lookup uppercase by accident, and the ES bundle has no entry, so i18next echoes the key.
- `$208.4B MXN` — `formatCompactMXN()` applied without locale, on `/cases` headline. Project rule explicitly forbids `B MXN` in ES (must be `MDP` or `billones`); the helper exists but isn't wired here.
- Story page `Skip to main content / SIGN IN / LIVE / THU · MAY 7 · 2026` — the entire shell flips to EN on `/stories/*`. Every story page is effectively English-only despite the language toggle.
- Date format on the `/stories/*` shell: `THU · MAY 7 · 2026` (en-US). Other pages render `JUE · 7 DE MAY DE 2026`. Two formatters live in the codebase.
- Pluralization: `1 contratos`, `1 caso(s)` — Spanish never uses `(s)`; should be `1 contrato`. Same on vendor profile "Este proveedor aparece en 3 caso(s)".

---

## The single moment that would make a Spanish-speaking phone user bounce

A reporter in Mexico City taps a tweet linking to `/stories/el-ejercito-fantasma`. The page opens at 1434 px wide rendered into a 390 px iPhone — they swipe right just to read the headline. The headline is in English. The chrome around it (`SIGN IN / Search vendors / THU · MAY 7 · 2026`) is in English. The story is in English. The localStorage is `es`. They close the tab in under five seconds. **Twitter is the largest entry-point for journalists, the story narratives are the marquee surface, and that surface is unreadable on phones and untranslated.**

## Recommended fixes (ranked)

1. **Add a mobile breakpoint at 768px and below.** Single-column shell, slide-in sidebar, dot-strip charts that respect `container-type: inline-size`. This is the only fix that unblocks 7 of 10 surfaces.
2. **Translate `/stories/*` content end-to-end.** Story bodies in `lib/atlas-stories.ts` need `{ es, en }` shape; the `StoryNarrative` shell needs to read `i18n.language` and skip the EN-only chrome. Without this, marquee surface stays unusable for the target audience.
3. **Localize sector chip labels** in `aria_queue` rendering — map `HEALTH → SALUD`, `INFRASTRUCTURE → INFRAESTRUCTURA`, etc., through the 12-sector taxonomy. ~10 lines.
4. **Wire `formatCompactMXN()` through `i18n.language`** everywhere it's called (audit `Cases.tsx`, `Dashboard.tsx`, vendor cards). Spanish should never show `B MXN` — only `MDP` or `billones`.
5. **Translate the `Generate Report`, `Price Volatility`, `Vendor Profile`, `VENDORS` breadcrumb** — vendor dossier is the most-visited investigation surface and four hardcoded EN strings sit on it.
6. **Fix `ADMINISTRATIONS.MULTIPLE` i18n key leak** on `/cases`. Add the missing ES bundle entry and any sibling keys; spot-check the bundle for other UPPERCASE.MULTIPLE patterns.
7. **Repair routing bugs** found during audit: `/institutions` 404→`/vendors/1` with console error flood, `/methodology` and `/atlas` redirecting to vendor profiles. These are pre-mobile bugs but break the mobile audit too.

---

*Word count: ~860. Brutal verdict: ship a mobile pass and a stories-i18n pass before any Twitter launch — they're independent and each is one-day work.*
