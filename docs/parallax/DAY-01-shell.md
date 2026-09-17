# PARALLAX Day 1 — Shell + shared primitives

Route: all · Files: `components/layout/*`, `components/ui/EntityIdentityChip.tsx`, `components/ui/DotBar.tsx`, `components/charts/editorial/DotStrip.tsx`, `components/atlas/PlateFrame.tsx`, `components/stories/DataPullquote.tsx`, `components/dossier/primitives.tsx`, `index.css`, `App.tsx`
Audited: 2026-09-17 against **origin/main `ff8f1eb1`** (= prod BUILD_ID `2026-09-17-atlas-tres-alcances`). The local `deploy-sectors-density` checkout is stale (pre Jul-3 legibility sweep) — do not audit or build from it.

## Classification: GOLD — enhance-in-place. No `/designus`.

The folio voice is intact on every route captured (18 routes, 1440 + 390). The shell's problems are measurable defects, not design: contrast, keyboard/ARIA, inline text below the legibility floor, stale copy, and layout overflow. Nothing here needs invention.

## Audit evidence (prod, 2026-09-17)

Method: Playwright (msedge) 1440×900 + 390×844 on `/`, `/aria`, `/stories/the-ghost-army`, `/vendors/29277`, `/dashboard`; 13 more routes at 1440 for the re-rank; WCAG contrast computed from `index.css` tokens; Vercel web-interface-guidelines rule set applied to the six shell files; ui-ux-pro-max `--domain ux` queries (contrast, drawer focus, bottom-nav truncation, reduced motion, sticky header overflow). The wshobson `accessibility-expert` agent is installed/enabled but not exposed in this session; `ecc:a11y-architect` was spawned as substitute and died on a session limit before reporting — Fable's own pass stands.

Contrast (WCAG AA needs 4.5:1; surfaces bg `#faf9f6` · card `#fff` · elevated `#f3f1ec` · sidebar `#f5f2ed`):

| Token | Hex | bg | card | elevated | sidebar |
|---|---|---|---|---|---|
| `--color-text-muted` | #7a716c | 4.53 | 4.77 | **4.22** | **4.27** |
| `--color-text-on-dark-muted` (sidebar section headings, status, version tag) | #9c9490 | **2.83** | **2.98** | **2.64** | **2.67** |
| `--color-text-secondary` | #6b6560 | 5.46 | 5.74 | 5.09 | 5.14 |
| `--color-accent` as text | #a06820 | **4.44** | 4.67 | **4.14** | **4.18** |
| candidate muted | #736a65 | 5.01 | 5.28 | 4.68 | 4.73 |

Live probes:
- Mobile drawer: after tapping "Open menu", `document.activeElement` stays on the hamburger; 25 Tabs land outside the `<aside>` (no trap); **Escape does not close** it; the bottom nav (z-40) paints above the backdrop (z-40) and stays tappable.
- Bottom nav labels clip: "Dashboard", "The Network" (`max-w-[56px]`). El Mapa (the homepage, restored to the sidebar 2026-06-23 because "users couldn't find the map") is absent from the bottom nav; `/` highlights the Dashboard tab instead.
- Story route header at 1440: dateline wraps to 2 lines (37px in a 44px bar), "SIGN IN" wraps; same on `/vendors/:id` at 390.
- Sub-10px text still live because the Jul-3 sweep only rewrote classes, not inline `fontSize`: PlateFrame header strip 9.5px/weight 300 on 14 surfaces; DataPullquote 8 / 9 / 9.5px (chrome, eyebrows, attribution, CEILING/LOW/CRITICAL labels, era rows).
- Stale/English datelines in shared primitives: EditorialPageShell `UPDATED APR 2026` (English-only, on every `/stories/:slug`); DataPullquote `ANALYSIS · MAY 2026` on every boxed tile.
- Two `<footer>`s on `/dashboard`, `/cases`, `/institutions`, `/captura`, `/administrations`, `/journalists`, `/methodology` (MainLayout colophon + page's own PageFooter/footer).
- Framer-motion has no root `MotionConfig`; the CSS reduced-motion rule (`index.css:864`) cannot stop JS-driven animations (DotStrip 50 `motion.circle` per row, dossier `FadeIn`, PageHeader, page transitions).
- ARIA misuse: `aria-label` on role-less `<span>` (chip risk dot, DataPullquote stat number), English-only badge labels ("299 items"), `role="menu"` with no Escape/arrow handling, two `<nav>` landmarks labelled "Main navigation" and "INVESTIGATE".
- 0 page errors on all 18 routes; no horizontal overflow at 390 on any route.

## Keep (do not touch)

- Sidebar IA: 5 sections / 15 items, order, icons, badges, the Velocity Spike logo + shimmer, the `md:w-14` collapse with right-side tooltips, localStorage collapse preference, auto-collapse < 1280.
- Header: live editorial dateline clock and PlateFrame "Indexed YYYY·MM·DD" stamps — **user chose to keep these live** (Day 15 note); the DQ tier chip; the ⌘K pill; LIVE pulse.
- PlateFrame crop marks, amber inset rule, EB Garamond figcaption, `bleed`/`minimal` geometry (pixel-identical call sites).
- EntityIdentityChip grammar (icon · name · badge), `fullName` mode, El Hilo origin state, risk → `text-text-muted` for low (rule 7).
- DotBar / DotStrip geometry (N=22 / N=50, round dots, fixed pixel width), `colorToken` API.
- DataPullquote four roles, six viz families, container queries, Playfair Italic 800 numbers with `style={{color}}`.
- Dossier primitives' typography and two-color discipline.
- Mobile bottom nav as a 4 + More bar with `env(safe-area-inset-bottom)`.

## Change (8)

Each change lists file(s) and its acceptance check. Acceptance = the Playwright probe passes on the worktree dev server (`VITE_API_URL=https://rubli.xyz`, port 3011) AND the visual before/after is judged by Fable.

### 1. Muted tokens meet AA on every surface — `frontend/src/index.css`
- `--color-text-muted: #7a716c` → `#736a65`; `--color-text-on-dark-muted: #9c9490` → `#736a65` (the "on-dark" tokens are, per the CSS comment, no-op aliases on the light sidebar).
- Sidebar `NavSection` heading `font-bold` → `font-medium` so the darker token stays quiet.
- Accept: contrast script (below) reports ≥ 4.5 for both tokens on bg/card/elevated/sidebar; sidebar screenshot shows section headings readable but subordinate to items.

### 2. Mobile drawer is a real dialog — `Sidebar.tsx`, `MainLayout.tsx`
- When `mobileOpen`: `<aside role="dialog" aria-modal="true" aria-label={t('mainNavigation')}>`; Escape closes; on open focus the close button; on close return focus to the element that opened it.
- `MainLayout`: put `inert={mobileSidebarOpen || undefined}` on the main column `<div>` and on the `MobileBottomNav` (React 19 supports boolean `inert`). Backdrop `z-40` → `z-[45]`. Add `overscroll-contain` to the aside.
- While in Sidebar: legal `<a href="/privacy|/terms">` → `<Link>` (full page reload today).
- Accept (probe at 390): after "Open menu", `activeElement` is inside `aside`; 25 Tabs stay inside; Escape closes and `activeElement` is the hamburger again; bottom nav not clickable while open.

### 3. Header never wraps — `Header.tsx`
- Dateline `<span>` gets `whitespace-nowrap`; the right-hand cluster `<div>` gets `flex-shrink-0`; sign-in button `whitespace-nowrap`.
- User menu: Escape closes and returns focus to the trigger (one `onKeyDown` on the wrapper).
- Accept: at 1440 on `/stories/the-ghost-army` and 390 on `/vendors/29277` the header is 44px tall, dateline box ≤ 20px, sign-in single line; title still truncates.

### 4. Bottom nav: El Mapa in, labels whole, honest active state — `MobileBottomNav.tsx`, `nav.json` (en/es)
- Items: `/` (`explore`, Map icon) · `/dashboard` · `/aria` · `/sectors` · More. **Drop `/network`** (the force graph is the least mobile-usable surface; El Mapa is mobile-native since Jun 23). Judgment call — Fable flags it at JUDGE; revert to Dashboard→Map swap if rejected.
- Remove `max-w-[56px]`; keep `truncate` + `px-1`. `touch-manipulation`. Dashboard active only on `/dashboard`; Map active on `/`.
- `aria-label` → new key `nav.quickNavigation` (EN "Quick navigation" / ES "Navegación rápida").
- Accept (probe at 390, EN and ES): no label has `scrollWidth > clientWidth`; `nav[aria-label]` values are distinct; on `/` only the Map tab has `aria-current`.

### 5. Reduced motion for framer — `App.tsx`
- Wrap the tree (inside `QueryClientProvider`) in `<MotionConfig reducedMotion="user">` from `framer-motion`.
- Accept: with `page.emulateMedia({ reducedMotion: 'reduce' })` on `/institutions/1`, every DotStrip `circle` has computed opacity 1 within 100ms of load; without emulation the stagger still runs.

### 6. Shared primitives: frozen-horizon datelines + 10px floor — `EditorialPageShell.tsx`, `DataPullquote.tsx`, `PlateFrame.tsx`
- EditorialPageShell `DEFAULT_DATELINE` → bilingual (read `i18n.language`): EN `BUILT BY RUBLI · DATA: COMPRANET 2002–2025 · DATA THROUGH SEP 2025`, ES `HECHO POR RUBLI · DATOS: COMPRANET 2002–2025 · DATOS HASTA SEP 2025`.
- DataPullquote `dateline` → EN `DATA THROUGH SEP 2025` / ES `DATOS HASTA SEP 2025` (matches the dashboard's Day-15 "Data through Sep 2025" convention; the frozen horizon is the true statement).
- DataPullquote inline sizes: every `fontSize: 8` → `10`, `9` → `10.5`, `9.5` → `10.5`; ThresholdViz limit label `bottom: -14` → `-16` and the threshold `marginTop: 18` → `20` so the bigger label doesn't touch the bar label.
- PlateFrame header strip `fontSize: '9.5px'` → `'11px'`, `fontWeight: 300` → `400` (keep 0.18em tracking, keep the ≥480px date-stamp gate).
- Accept: probe on `/stories/the-ghost-army` and `/dashboard` finds no leaf text < 10px inside `figure` (EN + ES); grep finds no `APR 2026` / `MAY 2026` in the three files; screenshot of a threshold tile shows no overlap.

### 7. ARIA correctness on primitives — `EntityIdentityChip.tsx`, `DataPullquote.tsx`, `Sidebar.tsx`, `nav.json`
- Chip risk dot: `<span role="img" aria-label=…>` with bilingual label (`Risk: critical` / `Riesgo: crítico`, via `i18n.language`); `title` uses the formatted `displayName`, not the raw uppercase name; fix the size inversion `tierSize` xs `text-[13px]` → `text-[12px]`.
- DataPullquote stat number: animated span `aria-hidden="true"` + sibling `<span className="sr-only">{stat} {statLabel}</span>`.
- Sidebar count badge `aria-label` → `t('badgeCount', { count })` (EN "{{count}} entries" / ES "{{count}} registros"); drop the unused `badge`/alert branch strings' English plural.
- Accept: DOM probe on `/aria` and `/vendors/29277`: zero `span[aria-label]:not([role])` inside `main, aside`; in ES the first chip dot's label starts with "Riesgo".

### 8. One footer per page — `index.css` (+ `PageFooter.tsx` marker if needed)
- Preferred: `main:has(footer) + footer { display: none; }` — hides the MainLayout colophon only when the page renders its own footer. Before applying, `git grep '<footer' frontend/src` and list every match in the report; if any is not a page-level colophon (e.g. a card footer), use a `.page-footer` class on `PageFooter`'s `<footer>` and on `Executive.tsx`'s footer (additive className only — gold page) and scope the rule to `main:has(.page-footer) + footer`.
- Accept: probe counts exactly 1 `footer` on `/dashboard`, `/cases`, `/journalists`, `/administrations`, `/methodology`, `/institutions`, `/captura`, and still 1 on `/`, `/sectors`, `/contracts`.

## Out of scope (backlog → `docs/PARALLAX.md`)

- `--color-accent` #a06820 as small text is 4.14:1 on elevated (kickers, Folio labels, DQ chip). Needs a design decision (darker `--color-accent-hover` #835616 for text-only uses?), not a Day-1 token flip.
- Header "alerts" shield button navigates to `/methodology` — label/destination mismatch.
- DotStrip rows with `href` render `<a href>` (full reload) — only `InstitutionProfile.tsx` passes href.
- DotStrip renders 50 `motion.circle` per row (500 motion nodes on a 10-row strip) — consider CSS stagger.
- `ScaleBlock` shows a USD line in Spanish (CLAUDE.md: ES is MXN-only by design in `formatDualCurrency`).
- `Header.getParentPath` English "Home"; Sidebar dead `useAuth()` call; PlateFrame hard-codes font families instead of `--font-family-*` tokens.
- Page-owned defects seen in the sweep (handled on their days): `/dashboard` justified hero leaves word gaps + `UPDATED MAY 2026` + 8/7.5px axis text; `/journalists` 5 live italics (banned); `/gap` 221 sub-10px nodes; story "Analysis as of May 2026".

## Risk

- Change 1 darkens muted text site-wide by one step (≈ +0.5 contrast). Intentional; it is the fix. Check the `/aria` register and El Mapa tiles (dense mono captions) in the after-screenshots.
- Change 5 only changes behaviour when the OS prefers reduced motion. Zero effect otherwise.
- Change 8 uses `:has()` (Chrome 105+, Safari 15.4+, Firefox 121+). Older Firefox keeps the double footer — acceptable degradation.
- Change 4 removes The Network from the bottom nav — reversible one-liner if the user wants it back.

## Build notes for the executor

- Worktree off `origin/main`, branch `parallax/day-01-shell`, dir `.claude/worktrees/parallax-day01`. Real `npm install --legacy-peer-deps` with `npm_config_cache=D:\Python\.npm-cache` — **never junction node_modules** (a `git worktree remove` on a junction wipes the real one).
- Gates: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`. No backend touched → no pytest.
- Verify on `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` (`VITE_API_URL`, not `VITE_API_BASE_URL`). Playwright: `chromium.launch({ channel: 'msedge' })` (no bundled browsers on this box).
- Probe scripts to reuse (point them at `http://localhost:3011`): `C:\Users\ranay\AppData\Local\Temp\claude\D--Python-yangwenli\43af6d84-4bb3-4c6a-b690-f98215775f93\scratchpad\{probe2.mjs,shots.mjs,contrast.mjs}`. Save before/after PNGs under `D:\Python\yangwenli\_parallax_shots\day01\` (untracked).
- Commit message: `feat(shell § PARALLAX D1): AA muted tokens, dialog drawer, header nowrap, bottom-nav Map, MotionConfig, 10px floor, ARIA, one footer` + body citing `docs/parallax/DAY-01-shell.md § Change 1–8`. Do **not** push or deploy — Fable judges first.
- Bilingual audit (`rubli-bilingual-audit`) on every touched TSX before reporting.

## Result

_(filled at SHIP)_ commit · BUILD_ID · bundle · verified strings.
