# ATLAS-C — Three-Pane Investigator Console

> Plan author: design-visionary (Opus 4.7) · 2026-05-06
> Branch: `claude/lucid-edison-ad6469`
> Targets: `frontend/src/pages/Atlas.tsx` (1,946 LOC), the surrounding chrome.
> Out of scope: `ConcentrationConstellation.tsx` dot generation, halo
>   rendering, edge drawing, and `cluster-glyphs.tsx`. The constellation
>   engine is *sacred geometry* — only the wrapping transform, hit-testing,
>   and surrounding panes are in play.
> Out of scope: `atlas-stories.ts` content (the multi-chapter narratives).
>   We expose them via a "Saved investigations" affordance in the left rail
>   and via the existing `?story=` URL parameter — no edits to the data file.

## 0. Why this redesign now

The current `/atlas` is a single-pane page: 840×220 constellation banner,
year scrubber and lens toggles laid horizontally above and below, a
right-side modal `<ClusterDetailPanel>` that slides over the chart when
a reader clicks a cluster. The page reads as a *publication*, not an
*instrument*.

The brief from the user (option C) reframes Atlas as the **investigator
console** — the surface a journalist opens for a 45-minute working
session, not the brochure they read once. That demands:

- A persistent **command rail** (left, 240px) for the shaping controls
  (lens, year, risk floor, vendor search) so the chart is never covered
  when the reader is changing the filter.
- A persistent **context panel** (right, 320px) that *always* shows
  something meaningful: global stats at rest, cluster summary on hover,
  vendor list when zoomed, selection summary when multi-selecting.
- A center pane that supports **semantic zoom** — clicking a cluster
  doesn't open a modal, it *zooms the constellation* until the reader
  sees individual vendors as dots and edges between them. ESC zooms back.
- Multi-select via Cmd/Ctrl-click and lasso, with bulk actions
  ("Open all in ARIA", "Export CSV", "Save as investigation").
- Shareable URL state (`?lens=patterns&zoom=P5&select=v1234,v5678`) so
  one journalist can hand a working view to another.

**Reference vocabulary** (cited by name in each section below, never
Pudding for this surface):

- **Bloomberg Terminal** — the three-pane investigator chrome with
  multi-pane sync; the rail-driven command grammar.
- **ICIJ Aleph** (Pandora/Panama Papers explorer) — semantic zoom into
  entity clusters; entity-centric drill where each "expand" reveals the
  connected sub-graph.
- **OCCRP Aleph / Linkurious / Neo4j Bloom** — saved views and
  investigation perspectives (the "Saved investigations" left-rail item).
- **OpenCorporates Hierarchy / Sayari Graph** — the breadcrumb-back
  drill metaphor that makes "where am I in this hierarchy" answerable.
- **FT Bond Vigilantes** — full-bleed center with persistent left rail;
  the chart can scroll inside the rail's frame.
- **Reuters "Fentanyl Express" coordinated views** — when one pane
  highlights, the other panes reflect that highlight without modal
  takeover.
- **NYT "How One Family Looted Half a Country" (Sacklers)** — the
  relationship-explorer pattern of clicking a node and seeing
  connected entities materialize in the same view.
- **Mapbox semantic zoom + LOD tiles** — the actual zoom mechanic
  (transform animation; LOD swap of the rendered geometry as the user
  zooms past a threshold).
- **Tableau lasso zoom + Figma marquee select** — the drag-rectangle
  multi-select mechanic.

## 1. Architecture

### 1.1 Layout grid

```
┌────────────────────────────────────────────────────────────────────┐
│  AtlasShell (page root)                                             │
│  ┌────────┬──────────────────────────────────────────┬─────────┐    │
│  │  Left  │       Center: AtlasZoomLayer             │  Right  │    │
│  │  Rail  │       wraps ConcentrationConstellation   │  Panel  │    │
│  │  240px │       (untouched)                          │  320px  │    │
│  │        │                                          │         │    │
│  │ sticky │  fluid (1fr) — letterboxed inside the    │ sticky  │    │
│  │ top-0  │  available width, min height 560px       │ top-0   │    │
│  └────────┴──────────────────────────────────────────┴─────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

Tailwind grid declaration on `AtlasShell`:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px]
                gap-0 min-h-[calc(100vh-var(--topbar-h))]">
```

- `grid-cols-1` at < 1024px (mobile fallback, see §8).
- `lg:grid-cols-[240px_1fr_320px]` at ≥ 1024px (Tailwind `lg` breakpoint).
- At ≥ 1536px (`2xl`) the center pane has its own internal max-width
  cap so the constellation doesn't stretch into a thin band — center
  becomes `[1fr_minmax(640px,1100px)_1fr]` with the chart letterboxed.

This is the **Bloomberg Terminal grammar**: rails do not change width
when the user scrubs the year or pivots the lens, so the user's spatial
muscle memory holds across a 45-minute session. The chart is the only
thing that re-renders in response to commands.

### 1.2 Where existing Atlas.tsx code goes

| Current Atlas.tsx region | LoC | New home |
|---|---|---|
| `KNOWN_VENDORS` const + `searchKnownVendors` + `vendorToClusterCode` | 67–148 | `lib/atlas/vendor-lookup.ts` (extracted module — pure data + pure functions, no React) |
| `YEAR_SNAPSHOTS` const | 169–188 | `lib/atlas/year-snapshots.ts` (extracted) |
| `buildAtlasCategoriesMeta` | 195–244 | `lib/atlas/categories-meta.ts` (extracted) |
| `snapshotToRows` | 249–261 | `lib/atlas/year-snapshots.ts` |
| `<ClusterDetailPanel>` | 266–483 | DELETED. Replaced by states inside `AtlasRightPanel` (§4) |
| `<YearScrubber>` | 487–662 | Moved into `AtlasLeftRail` (§3), simplified |
| `useClusterNotes` hook | 668–719 | `lib/atlas/use-cluster-notes.ts` (extracted) |
| `<VendorSearchBox>` | 731–837 | Moved into `AtlasLeftRail` (§3) — no internal change |
| Mode-toggle pill row (currently inside Atlas component body) | scattered | Moved into `AtlasLeftRail` as a vertical lens list |
| Risk-floor segmented control | scattered | Moved into `AtlasLeftRail` |
| Compare-mode toggle / second canvas | scattered | DEFERRED — compare mode is hidden in atlas-C-P1 and re-introduced in a follow-up ticket as a "Pin a snapshot" feature inside the right panel. Reason: compare splits the center pane; semantic zoom on a split pane is two zoom states to track. Re-introduce only after P5 lands. |
| Story playback (activeStory, activeChapter, dwell timer) | scattered | Stays in `Atlas.tsx` orchestrator. UI surface for opening stories moves to a "Saved investigations / Stories" section in the left rail. The chapter overlay over the chart stays. |
| URL state read/write | 935–995 | Becomes the single hook `useAtlasUrlState()` in `lib/atlas/use-atlas-url-state.ts` — covers lens, year, pin, floor, AND new params (`zoom`, `select`) |
| `useQuery` for `ariaApi.getStats`, `analysisApi.getFastDashboard` | 1029–1041 | Stays in `Atlas.tsx`. The right panel reads via shared context (§1.4). |

Atlas.tsx after refactor: ~600 LOC orchestrator (state, effects, story
playback, URL sync), down from 1,946.

### 1.3 New component decomposition (5 files)

| File | Responsibility | Props |
|---|---|---|
| `frontend/src/components/atlas/AtlasShell.tsx` | The grid container. Mounts the `<AtlasContext.Provider>`, applies the responsive grid, slots the three panes. | `children` (rail / center / panel slot pattern) |
| `frontend/src/components/atlas/AtlasLeftRail.tsx` | Lens list, vendor search, year scrubber, risk-floor segmented control, "Saved investigations / Stories" section, breadcrumb-back when zoomed. Reads + writes via `useAtlasContext`. | none — fully context-driven |
| `frontend/src/components/atlas/AtlasZoomLayer.tsx` | Wraps `<ConcentrationConstellation>`. Owns the SVG transform `(tx, ty, scale)` for semantic zoom. Owns lasso drag detection and renders the marquee rectangle. Owns vendor-level dot rendering when zoomed in. Surfaces click events as `(clusterCode \| vendorId)` to context. | `mode`, `rows`, `totalContracts`, `metaOverride`, `seedOverride`, `pinnedCode` (passes most through) |
| `frontend/src/components/atlas/AtlasRightPanel.tsx` | Renders one of four contextual states (idle / hover-cluster / zoomed-cluster / selecting). Reads everything from context. Exposes the bulk-action menu and the "Open in ARIA" / "Export CSV" / "Save as investigation" actions. | none — context-driven |
| `frontend/src/components/atlas/AtlasContext.tsx` | The `AtlasContext` + `useAtlasContext` hook + the `useReducer` state machine for `(view, hoveredCluster, zoomedCluster, selection, lens, year, riskFloor, pinnedCode)`. Exports the action creators (`hoverCluster`, `zoomIntoCluster`, `escapeZoom`, `toggleSelection`, `clearSelection`, …). | `children`, `initialState` |

Plus three small extracted lib files (no UI):

- `lib/atlas/vendor-lookup.ts` — `KNOWN_VENDORS`, `searchKnownVendors`,
  `vendorToClusterCode`. Future home for the V4 backend resolver.
- `lib/atlas/year-snapshots.ts` — `YEAR_SNAPSHOTS`, `snapshotToRows`.
- `lib/atlas/categories-meta.ts` — `buildAtlasCategoriesMeta`.

Three new lib hooks:

- `lib/atlas/use-cluster-notes.ts` — moved as-is from Atlas.tsx.
- `lib/atlas/use-atlas-url-state.ts` — single hook reading + writing
  the URL params with debounce. Subscribes to context state, dispatches
  on URL change.
- `lib/atlas/use-vendor-level-dots.ts` — stub hook returning a
  deterministic-mock array of `(vendorId, x, y, riskScore, sectorColor)`
  for a given cluster code. P3 (right panel) can read this; P2 (zoom
  state) can render it. See §2.4 for the data-source decision.

### 1.4 State management — Context + useReducer (NOT Zustand)

**Choice**: `React.createContext` + `useReducer`.

**Rationale**:

- The state graph is *small and tightly coupled*: 9 fields, ~12
  actions. Zustand shines when (a) state is consumed by many
  off-tree components, (b) the page lives across route changes, or
  (c) selectors need fine-grained subscriptions. None apply: every
  consumer of Atlas state is inside the `AtlasShell` subtree, the
  state resets on route change, and the consumer count is three
  (rail, center, right panel).
- React DevTools introspect `useReducer` actions natively; debugging
  the zoom state machine reads cleanly as a list of dispatched
  actions, vs Zustand's "everything is one big store" view.
- One fewer dependency in the bundle. `npm run build` already runs
  ~18s; we don't need to grow it.
- The reducer file (`AtlasContext.tsx`) becomes the single source of
  truth for the state machine, easy to test in isolation later.

**Trade-off acknowledged**: `useContext` re-renders all subscribers on
any state change. We mitigate by (a) splitting into two contexts —
`AtlasStateContext` (the data) and `AtlasDispatchContext` (the
dispatch fn, which never changes), so components that only dispatch
(left rail buttons) don't re-render on state changes, and (b) memoizing
the right panel's heavy children (`<EntityIdentityChip>` lists) on the
selection set identity. Same pattern Bloomberg's web terminal uses.

### 1.5 Reducer skeleton

```tsx
type AtlasView =
  | { kind: 'idle' }
  | { kind: 'hover-cluster'; code: string }
  | { kind: 'zoomed-cluster'; code: string }
  | { kind: 'selecting'; ids: string[] }

interface AtlasState {
  lens: ConstellationMode
  yearIndex: number
  riskFloor: 'all' | 'medium' | 'high' | 'critical'
  pinnedCode: string | null
  view: AtlasView
  selection: Set<string>          // vendor IDs
  hoveredCluster: string | null   // ephemeral; cleared on mouseleave
  // (story playback state stays in Atlas.tsx — separate concern)
}

type AtlasAction =
  | { type: 'set-lens'; lens: ConstellationMode }
  | { type: 'set-year'; index: number }
  | { type: 'set-risk-floor'; floor: AtlasState['riskFloor'] }
  | { type: 'pin-cluster'; code: string | null }
  | { type: 'hover-cluster'; code: string | null }
  | { type: 'zoom-into-cluster'; code: string }
  | { type: 'escape-zoom' }
  | { type: 'toggle-vendor-selection'; id: string }
  | { type: 'lasso-select'; ids: string[]; mode: 'replace' | 'union' }
  | { type: 'clear-selection' }
  | { type: 'hydrate-from-url'; partial: Partial<AtlasState> }
```

The reducer enforces the state-machine transitions in §2.

## 2. Zoom state machine (the core mechanic)

### 2.1 States

The `view` discriminated union has four kinds. Per ICIJ Aleph's
"explore → drill → contextualize → act" loop, each kind corresponds to
one stage of the investigator's working flow:

| State | When | What the reader sees |
|---|---|---|
| `idle` | Default, after ESC, after a fresh page load with no `?zoom=` param | Whole-constellation view at scale 1; right panel shows global stats; hover-arming is enabled |
| `hover-cluster` | Cursor is over an attractor's hit target (already exists in current code at `safeHover`) | Tooltip floats over the chart (existing behaviour stays); right panel switches to "cluster summary" card |
| `zoomed-cluster` | Reader clicked a cluster (or arrived via `?zoom=P5`) | SVG transform animates: `translate(-cx*Δ, -cy*Δ) scale(2.4)`; vendor-level dots fade in around the attractor; non-cluster dots fade to 12% opacity; breadcrumb appears in left rail; right panel switches to "vendor list" |
| `selecting` | Reader is mid-lasso OR has Cmd-clicked at least one vendor dot | Marquee rectangle drawn over chart; selected dots gain a 1.5px ring; right panel switches to "selection summary" |

### 2.2 Transitions

```
              click cluster
   IDLE  ──────────────────────►  ZOOMED_CLUSTER
    ▲                                   │
    │                                   │  ESC, breadcrumb-back, click-outside
    │                                   ▼
    │                                  IDLE
    │
    │  cursor over attractor
    ├────────────►  HOVER_CLUSTER  ──── cursor leaves ────►  IDLE
    │
    │  Cmd+click vendor dot OR mousedown+drag (lasso)
    └────────────►  SELECTING  ────── ESC OR clear ───────►  IDLE
                       │
                       │  click cluster while selection non-empty
                       ▼
                  ZOOMED_CLUSTER (selection persists, visible as ringed dots)
```

The transitions are encoded in the reducer; no component "owns" them.
Components only dispatch. This is the **OCCRP Aleph perspective
switcher** mechanic: one dispatch = one perspective change.

### 2.3 The SVG transform

`AtlasZoomLayer` wraps the existing `<svg>` from
`ConcentrationConstellation` in an outer `<g>` that owns the transform:

```tsx
// AtlasZoomLayer.tsx (sketch)
const { view, lens } = useAtlasContext()
const target = view.kind === 'zoomed-cluster'
  ? activeMeta.find((m) => m.code === view.code)
  : null

const transform = useMemo(() => {
  if (!target) return { tx: 0, ty: 0, s: 1 }
  // Convert fractional attractor coords to viewport-space.
  const cx = PAD_L + target.fx * FIELD_W
  const cy = PAD_T + target.fy * FIELD_H
  const s = 2.4
  // Centre the target under the chart's centre after scaling.
  const tx = SVG_W / 2 - cx * s
  const ty = SVG_H / 2 - cy * s
  return { tx, ty, s }
}, [target])

// Render:
<g
  style={{
    transform: `translate(${transform.tx}px, ${transform.ty}px)
                scale(${transform.s})`,
    transformOrigin: '0 0',
    transition: 'transform 600ms cubic-bezier(0.32, 0.72, 0, 1)',
    // Apple system spring; matches Mapbox's flyTo feel.
  }}
>
  <ConcentrationConstellation {...passThroughProps} />
  {/* vendor-level overlay (§2.4) sits on top, NOT scaled by parent
      since it's already drawn at the post-zoom coordinates */}
</g>
```

The 600ms duration + Apple system spring curve matches **Mapbox's
default `flyTo`** feel — fast enough that the reader doesn't get
impatient (the brief explicitly forbids >800ms), slow enough that the
spatial relationship is preserved (the reader's eye tracks the cluster
as it grows).

While zooming, `pointer-events: none` is applied to the vendor-level
overlay so a click-through during the animation doesn't accidentally
re-zoom into a different cluster.

### 2.4 Vendor-level dots when zoomed

**Data source decision** (BLOCKER for backend):

For atlas-C-P1 ship, we render **deterministic mock vendor dots**
generated client-side via the same `halton(2,3)` + cluster attractor
math the constellation engine uses. The mock generator (in
`lib/atlas/use-vendor-level-dots.ts`) takes `(clusterCode, count)` and
returns `{ id, x, y, riskScore, sectorColor }[]`. Counts are taken
from `meta.t1` (so P5 generates 180 dots, P7 generates 56, etc.).

Layout: dots are placed in a tighter Halton(2,3) lattice inside a
circle of radius 60px around the attractor (in original viewport
coords, then scaled by the zoom transform), so when zoomed at 2.4×
they spread across roughly half the chart. Risk score drives radius
(Critical=2.4px, High=1.7px, Medium=1.2px, Low=0.7px) and fill
opacity (matches existing `DOT_STYLE`).

For the top 10 vendors of each cluster, the mock generator
hard-codes IDs that match KNOWN_VENDORS so the right panel can show
real names + blurbs without a backend round-trip. The other (count-10)
dots get synthetic IDs (`mock-P5-12`, `mock-P5-13`, …) and a
"Click for vendor profile" tooltip that opens `/vendors/<id>` in a new
tab where the user is gracefully shown a 404 → "vendor not found,
maybe you meant…" page (separate ticket).

**BLOCKER flagged for backend**: a real implementation requires a new
endpoint `GET /api/v1/atlas/cluster-vendors?lens=patterns&code=P5&limit=200`
returning `{ vendor_id, name, risk_score, sector_id, t1_tier }[]`. The
endpoint should be cheap (the data is already in `aria_queue` joined
with `vendor_stats`). Filing this as **api-designer** task
`atlas-cluster-vendors-endpoint`. The `useVendorLevelDots` hook is
designed to swap mock → real with no UI change: same return shape,
same `useQuery` key pattern.

For atlas-C-P1 we ship the mock so the rest of the console can be
built and reviewed without waiting on the API. P3+ silently swap to
real data once the endpoint lands.

### 2.5 ESC, click-outside, breadcrumb-back

All three converge on the same dispatch: `{ type: 'escape-zoom' }`.

- ESC: a global `useEffect` keydown listener inside `AtlasShell` that
  inspects `view.kind` and dispatches if zoomed or selecting. Same
  ESC key clears selection BEFORE escaping zoom (two presses to fully
  reset — mirrors VS Code, Figma).
- Click-outside: the `AtlasZoomLayer` background `<rect>` (the field
  border, currently a hairline rect) gets a `onClick` that dispatches
  escape-zoom when `view.kind === 'zoomed-cluster'`.
- Breadcrumb: when zoomed, the left rail header swaps from
  "OBSERVATORIO" to a back-button `← P5 SOBREPRECIO` styled as a
  monospace breadcrumb. Click dispatches escape-zoom. Pure
  **OpenCorporates Hierarchy** vocabulary.

## 3. Left rail spec (240px wide)

### 3.1 Anatomy (top to bottom)

```
┌──────────────────────────────┐
│ OBSERVATORIO          ↺      │  ← header. ↺ = "reset all filters"
│ 3.06M contratos · 2002–2025  │  ← supporting line, mono 9px
├──────────────────────────────┤
│ ─ LENTE ────────────────     │  ← section overline
│  ◉ Patrones                  │  ← lens 1 of 4 (radio-style)
│  ○ Sectores                  │
│  ○ Categorías                │
│  ○ Sexenios                  │
├──────────────────────────────┤
│ ─ AÑO ──────────────────     │
│  2025                         │  ← Playfair Italic 800 number, 28px
│  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱   ▶︎      │  ← horizontal scrubber + autoplay btn
│  2008          2025           │
│  ─────────────                │
│  ◆ EVENTO CLAVE              │  ← if year has highlight
│  Año 1 Sheinbaum (parcial)   │
├──────────────────────────────┤
│ ─ PISO DE RIESGO ────────    │
│  [Todo][Med+][Alto+][Crit]   │  ← segmented control
├──────────────────────────────┤
│ ─ BUSCAR PROVEEDOR ──────    │
│  🔎 Toka, Edenred, IMSS…     │  ← (existing VendorSearchBox)
├──────────────────────────────┤
│ ─ INVESTIGACIONES ───────    │
│  ▸ El Cártel Farmacéutico    │  ← saved investigations / stories list
│  ▸ La Estafa Maestra         │     (each row opens an ATLAS_STORIES
│  ▸ El Año COVID              │      narrative on click)
│  ─────────────                │
│  + Guardar vista actual      │  ← creates a new local saved view
│    from current state          │     (localStorage, future: backend)
└──────────────────────────────┘
```

Sticky to viewport top via `position: sticky; top: var(--topbar-h);
height: calc(100vh - var(--topbar-h)); overflow-y: auto;`. Internal
scroll only if the saved investigations list overflows.

### 3.2 Lens system — vertical list, NOT horizontal tabs

Justification: at 240px wide, a 4-tab horizontal layout has < 50px per
tab — labels truncate (`Categ…`). A vertical list gives each label its
full width and reads as a *menu*, the right grammar for a
command-rail. Reference: **Bloomberg Terminal's left-rail function
list** is vertical for the same reason.

Each row is a button:

```tsx
<button
  onClick={() => dispatch({ type: 'set-lens', lens: 'patterns' })}
  className={cn(
    'w-full text-left px-3 py-2 text-[12px] font-mono',
    'flex items-center gap-2 transition-colors',
    isActive
      ? 'bg-background-elevated text-text-primary font-bold'
      : 'text-text-secondary hover:bg-background-elevated/40'
  )}
  style={isActive ? { borderLeft: `2px solid ${ACCENT}` } : undefined}
>
  <span className="w-1.5 h-1.5 rounded-full"
        style={{ background: isActive ? ACCENT : 'transparent',
                 border: isActive ? 'none' : '1px solid var(--color-border-hover)' }} />
  {lensLabel(lens, lang)}
  <span className="ml-auto text-[9px] opacity-60">{lens === 'patterns' ? '7' : lens === 'sectors' ? '12' : lens === 'categories' ? '32' : '6'}</span>
</button>
```

The trailing count number (7 patterns / 12 sectors / 32 categories /
6 sexenios) is a **FT Visual Vocabulary** convention — quantify the
choice before the user commits.

### 3.3 Year scrubber — horizontal

Justification: a vertical scrubber 2008–2025 in a 240px rail competes
for vertical space with the lens list and the saved-investigations
list. A horizontal scrubber (the existing one, simplified) sits in
~80px of vertical space and the year-display number sits above it
where the eye lands first. Vertical scrubbers also break the
left-to-right time-flow convention readers absorb from every other
chart on the platform.

The scrubber is the existing `<YearScrubber>` component, simplified to
fit 240px:

- Drop the "CONTRATOS" pill (the count moves to the right panel, where
  it belongs).
- Drop the prev/next year arrows (they're redundant with the keyboard
  arrow keys, which we wire up globally).
- Keep the play/pause autoplay button.
- Keep the highlight annotation under the slider.

### 3.4 Risk-floor segmented control

```
[ Todo · 100% ][ Med+ · 41% ][ Alto+ · 13% ][ Crit · 6% ]
```

Each segment shows the % of dots that survive the floor for the
current year — readers see the cost of each filter before clicking.
This is the **FT slope-chart annotation** convention.

### 3.5 Saved investigations — Aleph vocabulary

Three system-curated entries (the existing `ATLAS_STORIES`):

```
▸ El Cártel Farmacéutico    6 cap · 55s · pin P5
▸ La Estafa Maestra         6 cap · 55s · pin gobernacion
▸ El Año COVID              5 cap · 45s · pin AMLO
```

Plus, separated by a hairline rule, user-saved views in localStorage
(`rubli_atlas_saved_views_v1`):

```
+ Guardar vista actual
  ─────
  ▸ "Pharma 2018-2020"          P5 · 2018→2020
  ▸ "Tren Maya watchers"         infraestructura · 2024
```

Click on a saved view:

- For ATLAS_STORIES: dispatches `set-active-story` (story playback
  stays in Atlas.tsx), starts the chapter sequence over the chart.
- For user-saved views: dispatches a single `hydrate-from-url`-style
  action that restores `(lens, year, pin, floor, zoom, selection)` from
  the saved view's serialized state.

The "+ Guardar vista actual" button serializes the current
`AtlasState` into a row with a user-typed label (small inline input
appears on click). Pure **OCCRP Aleph perspective** mechanic.

## 4. Right panel spec (320px wide)

The panel is *always* visible and *always* shows something meaningful.
This is the **Reuters "Fentanyl Express" coordinated view** principle:
the rightmost pane is never blank; it always reflects the current
focus.

### 4.1 IDLE state — global stats

Headline: the most-important-thing-the-reader-should-know, NYT-style.

```
─ EL OBSERVATORIO ────────
GLOBAL · TODOS LOS AÑOS

3.06M
contratos analizados
$9.88T MXN gasto validado

─ DISTRIBUCIÓN DE RIESGO ─
▰▰▰▰▰▰▰▱▱▱  CRÍTICO       6.0%   183K
▰▰▰▰▰▰▰▰▱▱  ALTO          7.5%   229K
▰▰▰▰▰▰▰▰▰▰  MEDIO         26.8%  819K
─────────────  BAJO          59.7%  1.83M
                                    ↑ OECD: bandera ≥15%

─ PRINCIPALES PATRONES ───
P5 · Sobreprecio Sistemático       180 T1
P7 · Red de Contratistas             56 T1
P6 · Captura Institucional           31 T1

─ EQUIPO DE INVESTIGACIÓN ──
314 vendedores T1 priorizados
984 verificaciones CENTINELA listas
1,401 casos GT documentados

→ Abrir cola de investigación (ARIA)
```

Implementation notes:

- Headline number `3.06M` rendered in **Playfair Display Italic 800**
  with `tabular-nums`, color via `style={{ color: '#a06820' }}`. Per
  the dashboard "Headline Numbers" tile rhythm cited in CLAUDE.md.
- Risk distribution rows use `<DotBar>` from `@/components/ui/DotBar`
  (canonical dot strip primitive).
- Pattern list uses `<EntityIdentityChip type="pattern" />` for each
  row — the chip already encodes the kicker ("180 T1") and the click
  routes to `/clusters#P5`.
- "OECD bandera ≥15%" is the editorial-context anchor that turns 7.5%
  from a number into a finding (Economist principle from the
  design-visionary system prompt).

### 4.2 HOVER_CLUSTER state — cluster summary card

Triggers when `hoveredCluster !== null`. Replaces the IDLE content
with a single card; doesn't take over the chart's existing floating
tooltip (that one stays for in-chart context).

```
─ P5 · PATRÓN ────────────
SOBREPRECIO SISTEMÁTICO

Precios 2σ sobre promedio sectorial
en 3,985 proveedores. 180 son T1
priorizados.

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
              62% alto + crítico

3,985        180        62%
proveedores  T1 leads   alto+crit

  click para entrar al cúmulo →
```

The "click to drill in" copy is the **ICIJ Aleph drill prompt** — the
right panel teaches the user the next gesture without overlay
chrome. The visual cue is a subtle pulsing border around the panel.

### 4.3 ZOOMED_CLUSTER state — vendor list

Triggers on `view.kind === 'zoomed-cluster'`. The MOST important
state — this is where investigation actually happens.

```
─ P5 · CÚMULO ────────────
SOBREPRECIO SISTEMÁTICO

← Volver al cielo completo

180 T1 · ordenados por riesgo

[All] [Critical only] [GT-anchored only]

█ Microsoft Mexico        0.94
  $24.1B · 97% AD · TIC
  → Ver dossier · → ARIA

█ Grupo Farmacos Esp.     0.92
  $133.2B · IMSS · COFECE
  → Ver dossier · → ARIA

█ ICA Constructora        0.91
  $41.8B · 3 contratos
  → Ver dossier · → ARIA

█ Alstom Transport        0.92
  $37.9B · Tren Maya
  → Ver dossier · → ARIA

…7 más

────────────────────────
□ Seleccionar todos (10)
[ Abrir 10 en ARIA ]
[ Exportar CSV ]
[ Guardar como vista ]
```

Each row is an `<EntityIdentityChip type="vendor" />` plus a
`<RiskLevelPill score={...} />`. The "→ Ver dossier" routes to
`/vendors/<id>`, "→ ARIA" routes to the ARIA tier-1 page filtered to
that vendor. Both are existing surfaces — we're routing the reader
*out* of the Atlas console into a deeper investigation surface, then
they come back via browser-back.

The list is virtualized via `react-window` if `meta.t1 > 50` (P5 has
180 T1, would be slow without virtualization). Otherwise plain
`.map()`.

The "All / Critical only / GT-anchored only" filter chips are local
state in the right panel (don't pollute the URL). The "GT-anchored
only" chip is special: it filters to vendors whose IDs appear in the
`ground_truth_vendors` table — surfaces the documented cases, hides
the model-discovery tail.

### 4.4 SELECTING state — selection summary

Triggers when `selection.size > 0`.

```
─ SELECCIÓN ──────────────
12 PROVEEDORES

  Microsoft Mexico         0.94
  Grupo Farmacos Esp.      0.92
  ICA Constructora         0.91
  Alstom Transport         0.92
  Toka Internacional       0.97
  Edenred                  0.96
  + 6 más  ▼

────────────────────────
SUMA RIESGO MEDIO     0.93
SECTORES TOCADOS         5
PATRONES TOCADOS         3
GASTO COMBINADO  $287B MXN

────────────────────────
[ Abrir 12 en ARIA ]
[ Abrir 12 expedientes ]
[ Exportar 12 a CSV ]
[ Guardar como investigación ]
[ Limpiar selección ]
```

The aggregates (avg risk, sectors touched, patterns touched, combined
spend) are the **Bloomberg Terminal multi-select aggregator** mechanic
— the moment you select more than one, the panel computes the cohort
stats so the reader sees the *shape* of their selection, not just a
list. Calculated client-side from the already-fetched vendor data.

The "Abrir N expedientes" action opens N tabs to `/vendors/<id>`;
guard with a `confirm()` if N > 5 so we don't accidentally tab-bomb
the user.

### 4.5 Sticky behaviour

Same as the left rail: `position: sticky; top: var(--topbar-h);
height: calc(100vh - var(--topbar-h)); overflow-y: auto;`. The vendor
list (4.3) and selection summary (4.4) can both internal-scroll
without losing the action buttons at the bottom (sticky footer
within the panel).

## 5. Center pane — the constellation

### 5.1 Sacred surface

The center pane renders `<AtlasZoomLayer>` which renders
`<ConcentrationConstellation>`. The constellation's:

- Halton(2,3) dot generation
- DOT_STYLE radii / opacities / halos
- Cluster attractor weighted-Halton placement
- Critical-dot edge rendering (nearest-2-neighbor)
- The mode-keyed `<g key={`atlas-${mode}`}>` re-mount cascade
- The `<defs><style>` keyframe animations
- Margin annotations + caption strip

…all stay byte-identical. **Do not propose changes to
ConcentrationConstellation.tsx.**

### 5.2 What changes around the constellation

Three things get added:

1. The outer `<g>` transform layer (§2.3).
2. A new SVG `<g class="atlas-vendor-dots">` overlay rendered AFTER
   the constellation when `view.kind === 'zoomed-cluster'`. This
   overlay holds the 10–180 vendor-level dots fetched/mocked by
   `useVendorLevelDots`. Each dot is a `<circle>` with a
   `data-vendor-id` attribute and a `pointer-events: all` so it can
   receive clicks. Hover surfaces the vendor name in the existing
   tooltip slot. Cmd/Ctrl-click toggles selection; plain click opens
   the dossier in a new tab.
3. A new SVG `<rect class="atlas-marquee">` rendered when the user is
   mid-lasso. Drawn semi-transparent (`fill: rgba(160, 104, 32, 0.12)`,
   `stroke: #a06820`, `stroke-dasharray: '3 3'`).

### 5.3 Click-on-cluster routing

The current `<ConcentrationConstellation>` already exposes
`onClusterClick(clusterCode)`. The new wiring:

- In `AtlasZoomLayer`, the click handler dispatches
  `{ type: 'zoom-into-cluster', code }` instead of the current
  `setSelectedClusterCode` (which opened the modal). The modal
  is gone.
- The right panel reacts via context — no prop-drilling, no shared
  state outside the AtlasContext.

### 5.4 Lasso drag

Implementation in `AtlasZoomLayer`:

- `onMouseDown` on the SVG records `(x, y)` and sets
  `lassoActive=true` only if Shift is held (so plain drag still
  scrolls the page on touchpads). At least: Shift+drag for lasso,
  Cmd-click for individual select.
- `onMouseMove` while `lassoActive` updates the marquee rect.
- `onMouseUp` computes which vendor-level dots fall inside the
  rect (only relevant when `view.kind === 'zoomed-cluster'`), then
  dispatches `{ type: 'lasso-select', ids, mode: 'union' }`. Clears
  `lassoActive` and the marquee rect.
- ESC during a drag cancels without selecting.

Reference: **Tableau lasso zoom** for the visual vocabulary,
**Figma marquee select** for the Shift-modifier convention.

## 6. URL state encoding

Single param schema, encoded by `useAtlasUrlState`:

| Param | Value | Default (omitted) | Example |
|---|---|---|---|
| `lens` | `patterns` \| `sectors` \| `categories` \| `sexenios` | `patterns` | `?lens=sectors` |
| `year` | 4-digit year | latest year | `?year=2020` |
| `pin` | cluster code | none | `?pin=P5` |
| `floor` | `medium` \| `high` \| `critical` | `all` | `?floor=critical` |
| `zoom` | cluster code | none | `?zoom=P5` |
| `select` | comma-separated vendor IDs | none | `?select=v1234,v5678` |
| `compare` | 4-digit year | none | `?compare=2014` (deferred — see §1.2) |
| `story` | story ID | none | `?story=pharma-cartel` |

Read on mount via `useAtlasUrlState` → dispatches
`hydrate-from-url`. Write on every state change debounced 250ms via
the same hook (replaces the current 250ms debounce in Atlas.tsx).

Browser back/forward navigation: by using `setSearchParams(..., {
replace: false })` for the *initial* hydration only and `replace:
true` for subsequent debounced syncs, we get sensible back-button
semantics: the back button restores the previous URL state, but
intermediate scrubbing doesn't pollute history. Same compromise NYT
uses on its election pages.

## 7. Multi-select + bulk actions

### 7.1 Selection mechanics (recap from §5.4)

- **Plain click** on a vendor dot (when `view.kind ===
  'zoomed-cluster'`): opens `/vendors/<id>` in a new tab. NOT a
  selection action — selection is opt-in.
- **Cmd/Ctrl + click** on a vendor dot: toggles that vendor in the
  selection set. If selection was empty, view transitions to
  `selecting`.
- **Shift + drag** anywhere on the chart (when zoomed): lasso. On
  release, all enclosed vendor dots are added to selection.
- **Esc**: clears selection if non-empty; otherwise escapes zoom.

### 7.2 Visual treatment

A selected vendor dot gets:

- A 1.5px ring outline in `#a06820` (the platform's accent amber).
- Stays at full opacity even when other dots dim during a drill.
- The ring persists across mode changes (ICIJ Aleph "carry your
  selection across views" mechanic).

### 7.3 Bulk actions (right panel, §4.4)

| Action | Implementation |
|---|---|
| Open N in ARIA | `navigate('/aria?ids=' + ids.join(','))` — requires ARIA to support multi-ID filter (existing? confirm in P4) |
| Open N expedientes | `ids.forEach(id => window.open('/vendors/' + id, '_blank'))` with a `confirm()` if N > 5 |
| Export N to CSV | Client-side CSV blob: `id, name, risk_score, sector, pattern, t1_tier`. Triggered by a `<a download>` synthetic click. |
| Save as investigation | Serializes `(lens, year, floor, ids, label)` into `rubli_atlas_saved_views_v1` localStorage; new entry appears in the left rail (§3.5) |
| Clear selection | Dispatches `clear-selection` |

## 8. Mobile fallback (< 1024px)

The grid collapses to a single column. Shape:

```
┌──────────────────────────┐
│  Top action bar           │  ← was the left rail; now horizontal,
│  [Lens▾][Año▾][Riesgo▾]   │     compressed to dropdowns
│  🔎 search                 │
├──────────────────────────┤
│                           │
│  Center: full-width        │
│  constellation chart       │
│  (~360px tall, no zoom     │
│   on mobile — touch-pan    │
│   future ticket)           │
│                           │
├──────────────────────────┤
│  Bottom drawer (slides up) │
│  when a cluster is tapped: │
│  vendor list + actions     │
└──────────────────────────┘
```

### 8.1 Mobile-specific decisions

- **Lens / year / floor become dropdowns** (`<select>`-styled-as-button
  trigger → bottom sheet on tap). The vertical lens list doesn't fit
  in a top action bar.
- **Vendor search collapses to a magnifier icon** that expands to
  full-width when tapped.
- **Saved investigations / stories** become a single sheet accessible
  via a "Stories" pill in the action bar.
- **No semantic zoom on mobile in atlas-C-P1**. Tapping a cluster
  opens the bottom drawer (right panel content) directly, mimicking
  the current `<ClusterDetailPanel>` slide-over. Add zoom in a
  follow-up phase once we have touch-pinch-zoom mechanics designed.
- **No lasso on mobile**. Multi-select is via a long-press to enter
  selection mode, then tap to add/remove (iOS Photos pattern). Defer
  to follow-up.
- Bottom drawer height: 60vh max, with a drag handle at top. Tapping
  the chart background closes the drawer.

The single-column breakpoint is `< lg` (Tailwind 1024px). Between
1024px and 1280px, the rails use slightly tighter padding
(`px-2.5` instead of `px-4`).

## 9. Bilingual rigor

Every visible string in the new chrome must exist in BOTH ES and EN.
i18n key plan (using existing `useTranslation()` pattern; we *don't*
introduce a new namespace JSON file — Atlas already has inline
ternaries via the `lang` variable, and consistency wins over
purity here).

| Surface | i18n key (or inline ternary) | EN | ES |
|---|---|---|---|
| Shell header | `atlas.shell.title` | Observatorio | Observatorio (untranslated by intent — proper noun for the product) |
| Shell subline | inline | 3.06M contracts · 2002–2025 | 3.06M contratos · 2002–2025 |
| Reset all button | inline | Reset filters | Restablecer filtros |
| Lens section overline | inline | LENS | LENTE |
| Lens labels | already in `buildPatternMeta` etc. (existing) | (existing) | (existing) |
| Year section overline | inline | YEAR | AÑO |
| Year highlight kicker | inline | KEY EVENT | EVENTO CLAVE |
| Risk floor overline | inline | RISK FLOOR | PISO DE RIESGO |
| Risk floor labels | inline | All / Med+ / High+ / Crit | Todo / Med+ / Alto+ / Crít |
| Vendor search overline | inline | FIND A VENDOR | BUSCAR PROVEEDOR |
| Saved investigations overline | inline | INVESTIGATIONS | INVESTIGACIONES |
| Save current view button | inline | + Save current view | + Guardar vista actual |
| Save view label prompt | inline | Name this view: | Nombra esta vista: |
| Right panel — IDLE eyebrow | inline | OBSERVATORY · ALL YEARS | EL OBSERVATORIO · TODOS LOS AÑOS |
| Right panel — IDLE summary | inline | contracts analyzed | contratos analizados |
| Right panel — IDLE distribution | inline | RISK DISTRIBUTION | DISTRIBUCIÓN DE RIESGO |
| Right panel — IDLE OECD anchor | inline | OECD: flag ≥15% | OCDE: bandera ≥15% |
| Right panel — IDLE patterns | inline | TOP PATTERNS | PRINCIPALES PATRONES |
| Right panel — IDLE team box | inline | INVESTIGATION DESK | EQUIPO DE INVESTIGACIÓN |
| Right panel — IDLE T1 line | inline | T1-prioritized vendors | vendedores T1 priorizados |
| Right panel — IDLE CENTINELA line | inline | CENTINELA verifications ready | verificaciones CENTINELA listas |
| Right panel — IDLE GT line | inline | GT cases documented | casos GT documentados |
| Right panel — IDLE CTA | inline | → Open investigation queue (ARIA) | → Abrir cola de investigación (ARIA) |
| Right panel — HOVER eyebrow | inline | (cluster code) · PATTERN/SECTOR/CATEGORY/TERM | (cluster code) · PATRÓN/SECTOR/CATEGORÍA/SEXENIO |
| Right panel — HOVER drill prompt | inline | click to drill in → | click para entrar al cúmulo → |
| Right panel — HOVER stat labels | inline | vendors / T1 leads / high+crit | proveedores / T1 leads / alto+crit |
| Right panel — ZOOMED back link | inline | ← Back to whole sky | ← Volver al cielo completo |
| Right panel — ZOOMED ordered-by | inline | ordered by risk | ordenados por riesgo |
| Right panel — ZOOMED filter chips | inline | All / Critical only / GT-anchored only | Todos / Solo críticos / Solo anclados GT |
| Right panel — ZOOMED row CTAs | inline | → View dossier · → ARIA | → Ver dossier · → ARIA |
| Right panel — ZOOMED more pill | inline | …N more | …N más |
| Right panel — ZOOMED select-all | inline | □ Select all (N) | □ Seleccionar todos (N) |
| Right panel — SELECTING title | inline | SELECTION | SELECCIÓN |
| Right panel — SELECTING aggregate labels | inline | AVG RISK / SECTORS / PATTERNS / COMBINED SPEND | RIESGO MEDIO / SECTORES / PATRONES / GASTO COMBINADO |
| Right panel — SELECTING actions | inline | Open N in ARIA / Open N dossiers / Export N to CSV / Save as investigation / Clear selection | Abrir N en ARIA / Abrir N expedientes / Exportar N a CSV / Guardar como investigación / Limpiar selección |
| Right panel — SELECTING tab-bomb confirm | inline | Open N tabs? This will open N browser tabs. | ¿Abrir N pestañas? Esto abrirá N pestañas del navegador. |
| Marquee aria-label | inline | Lasso selection in progress | Selección por lazo en curso |
| ESC hint (first time) | inline | Press ESC to exit | Presiona ESC para salir |

Per the omega workflow rule (cite-by-name, bilingual completeness):
the bilingual audit before P1 ships must run

```bash
grep -nE "['\"][A-Z][a-z]+ [a-z]+" frontend/src/components/atlas/*.tsx
```

and confirm every English string is wrapped in a `lang === 'es' ? '…' : '…'`
ternary.

## 10. Anti-patterns to avoid

- **Don't reach for a graph library.** Cytoscape, Sigma.js, vis-network
  all want to own the render loop. The constellation engine works.
  We add ~250 lines of SVG transform + lasso + vendor-overlay.
- **Don't use Zustand.** §1.4 spelled out why; the trade-off is
  acknowledged.
- **Don't add a data-table sub-view at the right panel.** RUBLI has
  `/aria` for that. The right panel's vendor list is a *triage* view
  (max 10 rows visible without scroll), not a working table.
- **Don't auto-zoom on hover.** Hover only updates the right panel
  to "cluster summary" mode. Zoom is committed via click. (Reference:
  Mapbox, Aleph, Linkurious all use click-to-drill, not hover-to-drill;
  hover-zoom feels twitchy in a 45-minute session.)
- **Don't animate transforms longer than 800ms.** The 600ms target is
  already at the upper end of "investigator-tolerable".
- **Don't render vendor-level dots while idle.** The 1,200-dot field is
  already the visual story at scale 1; layering 180 vendor-level dots
  on top would clutter the field. Vendor dots only render when
  `view.kind === 'zoomed-cluster'`.
- **Don't break the existing `<ClusterDetailPanel>` modal silently.**
  Delete it in atlas-C-P3 (when the right panel takes over its
  responsibilities), not P1. Until P3, the modal stays — the new right
  panel renders below/around it without conflict.
- **Don't double-fetch ARIA stats.** The `useQuery(['atlas',
  'aria-stats'])` lives at the Atlas.tsx level and is exposed via
  context. The right panel reads from context; doesn't re-fetch.
- **Don't let the breadcrumb-back live in two places.** Either it's in
  the left rail header OR it's a chip floating over the chart; pick
  one. We pick the left rail — keeps the chart clean.
- **Don't put the pin button in two places.** The pin is currently in
  the cluster panel. After atlas-C-P3 it's in the right panel header.
  Remove from anywhere else.

## 11. Implementation phases

Five PR-sized phases. Each ships independently. Dependency arrows
between them are explicit.

### atlas-C-P1 — Three-pane layout shell, no zoom yet

**Scope**:

- Create `AtlasShell.tsx`, `AtlasLeftRail.tsx`, `AtlasRightPanel.tsx`,
  `AtlasContext.tsx` (without the zoom-related state — just `lens`,
  `year`, `riskFloor`, `pinnedCode`).
- Extract `vendor-lookup.ts`, `year-snapshots.ts`, `categories-meta.ts`,
  `use-cluster-notes.ts`, `use-atlas-url-state.ts`.
- Refactor `Atlas.tsx` to mount `<AtlasShell>` and pass children. The
  existing `<ConcentrationConstellation>` renders in the center pane;
  the existing `<ClusterDetailPanel>` MODAL stays for now.
- Left rail: lens list, year scrubber, risk-floor segmented, vendor
  search, saved-investigations stub list (no save action yet).
- Right panel: IDLE state only (global stats card). When user clicks
  a cluster, the OLD modal still slides over the right panel — we
  haven't replaced it yet. Visual ugly-but-shipping; review before P3.
- Mobile fallback: top action bar + center chart + tap → modal (the
  modal was already mobile-friendly).

**Cover-the-captions test**: Cover the right panel's text. The page
is now visibly THREE columns instead of one — the rails frame the
chart with persistent context. The reader recognizes a Bloomberg-style
console at first glance. Result: visibly different from current
single-pane layout.

**Effort**: 1 day (refactor-heavy but no new mechanics).

**Dependency**: none. P1 can ship in isolation.

### atlas-C-P2 — Zoom state machine + ESC + breadcrumb

**Scope**:

- Add the `view` reducer field + `zoom-into-cluster`, `escape-zoom`
  actions to `AtlasContext`.
- Create `AtlasZoomLayer.tsx`. Wraps `<ConcentrationConstellation>`,
  owns the SVG `<g transform>`. Animates 600ms cubic-bezier.
- Wire the breadcrumb-back chip into `AtlasLeftRail` header.
- Wire ESC keyboard handler in `AtlasShell`.
- Wire click-outside on the field-border rect in
  `AtlasZoomLayer`.
- Render `useVendorLevelDots(cluster, count)` overlay when zoomed —
  **mock data** per §2.4. Each dot has a hover tooltip showing
  vendor name + risk score. Click opens `/vendors/<id>` in new tab.
- The OLD `<ClusterDetailPanel>` modal still exists but is now NOT
  triggered by cluster click (that triggers zoom instead). Move the
  modal trigger to a single dev-mode keyboard shortcut for now to
  preserve behaviour for tests.

**Cover-the-captions test**: Click P5. The chart now ZOOMS into the
cluster — the cluster grows to fill the chart, vendor-level dots
materialize around the attractor. Press ESC: the chart zooms back
out. Without reading any caption, the reader has experienced a
**semantic zoom drill** they couldn't experience before.

**Effort**: 1 day.

**Dependency**: P1.

### atlas-C-P3 — Right panel contextual rendering

**Scope**:

- Implement HOVER_CLUSTER state in `AtlasRightPanel`.
- Implement ZOOMED_CLUSTER state in `AtlasRightPanel` — the vendor
  list, the All/Critical-only/GT-anchored-only chips, the row CTAs.
- Implement SELECTING state in `AtlasRightPanel`.
- DELETE `<ClusterDetailPanel>` from Atlas.tsx — its responsibilities
  are now in the right panel. The pin button moves to the right panel
  header. The personal notes textarea moves to the right panel
  ZOOMED_CLUSTER state.
- Add the "→ Open in ARIA" / "→ View dossier" CTAs.

**Cover-the-captions test**: Hover a cluster. The right panel changes
visibly — global stats are replaced by a cluster card with risk
distribution bar and counts. Click into the cluster. The right panel
changes visibly again — the card is replaced by a list of vendor
identity chips. Three states, three visibly different right-panel
shapes, no caption-reading required.

**Effort**: 1.5 days (most UX detail lives here).

**Dependency**: P2.

### atlas-C-P4 — Multi-select + lasso + bulk actions

**Scope**:

- Add `selection` Set + `toggle-vendor-selection`, `lasso-select`,
  `clear-selection` actions to AtlasContext.
- Wire Cmd/Ctrl-click on vendor-level dots in `AtlasZoomLayer`.
- Wire Shift+drag lasso in `AtlasZoomLayer`. Render the marquee rect.
- Render the selection ring (1.5px outline) on selected dots.
- Implement the SELECTING state UX in `AtlasRightPanel` (the cohort
  aggregator, the bulk action buttons).
- Implement the four bulk actions:
  - Open N in ARIA (single navigation)
  - Open N dossiers (window.open per ID, with confirm if > 5)
  - Export N to CSV (client-side blob)
  - Save as investigation (writes localStorage)
- Wire ESC to clear selection first, then escape zoom.

**Cover-the-captions test**: Zoom into P5. Shift+drag a rectangle
across the cluster. Released dots gain a ring. The right panel
changes — shows cohort aggregates and a bulk-actions menu. Press ESC:
selection clears. Press ESC again: zoom escapes. The reader has
performed a multi-step investigator workflow without reading any
caption.

**Effort**: 1 day.

**Dependency**: P3.

### atlas-C-P5 — URL state encoding + saved investigations

**Scope**:

- Extend `useAtlasUrlState` to handle `zoom`, `select` params.
- Wire the "+ Save current view" button in left rail. Inline label
  input. Writes to `rubli_atlas_saved_views_v1`.
- Render user-saved views in the left rail (§3.5).
- Click a saved view → dispatches `hydrate-from-url`-style action
  that restores `(lens, year, floor, pin, zoom, selection, label)`.
- Saved view row supports rename + delete via a hover menu (small
  pencil + trash icons).
- Browser back/forward navigation tested: scrub year (no history
  entry), then change lens (history entry), then back-button
  restores previous lens.

**Cover-the-captions test**: Open the page. Set lens=sectors,
year=2020, zoom=salud, lasso 5 vendors, click "Save as
investigation", name it "COVID Salud T1". Reload the page. The
saved view appears in the left rail. Click it: the page restores
all five state dimensions instantly. The reader has experienced
*persistence of an investigation* — a working primitive of an
analyst tool.

**Effort**: 1 day.

**Dependency**: P4.

**Total effort**: 5.5 days of focused work, shipped as 5 commits on
the same branch. No backend dependency for P1–P5 if the mock vendor
generator is acceptable. The real backend endpoint
(`/api/v1/atlas/cluster-vendors`) lands as a separate
**api-designer** ticket in parallel and is hot-swapped in P3 when
ready.

## 12. Cover-the-captions verification matrix

| Phase | Visible-without-captions diff |
|---|---|
| P1 | Three columns instead of one. Rails frame the chart with persistent shaping controls (left) and persistent context (right). |
| P2 | Click a cluster → chart zooms into it. ESC zooms out. Vendor-level dots materialize at zoom. No modal. |
| P3 | Right panel changes shape three times depending on hover/zoom/selecting. No modal anywhere. |
| P4 | Shift+drag draws a marquee. Released dots get rings. Right panel becomes a cohort aggregator with action buttons. |
| P5 | Saved investigations appear as named rows in the left rail. Click restores everything: lens, year, zoom, selection. |

## 13. BLOCKER summary (for the parent agent / api-designer)

- **`GET /api/v1/atlas/cluster-vendors`** endpoint is needed by atlas-C-P3
  to swap the mock vendor generator for real data. Shape:
  `{ vendor_id, name, risk_score, sector_id, t1_tier, total_value_mxn,
  top_pattern, gt_anchored: boolean }[]`. Query params: `lens`,
  `code`, `limit` (default 200), `risk_floor` (optional).
  Source tables: `aria_queue` JOIN `vendor_stats` JOIN
  `ground_truth_vendors`. Should be cheap (< 100ms) since
  `aria_queue` is pre-aggregated. File as separate ticket.
- **`GET /api/v1/aria/queue?ids=…`** must accept a comma-separated
  vendor ID filter for the "Open N in ARIA" bulk action. Confirm
  this exists before P4; if not, file as a small backend ticket.
- **No other backend dependencies.** Story playback, year snapshots,
  vendor lookup all stay client-side / mock for the console redesign.

## 14. Primitives reused (no new building blocks)

Per the omega primitive-first rule, these existing primitives already
fit and must be used (not re-implemented):

| Primitive | Used in | Why it fits |
|---|---|---|
| `<EntityIdentityChip>` | Right panel vendor rows, pattern list | Canonical entity rendering, type-discriminated |
| `<RiskLevelPill>` | Right panel vendor rows, IDLE distribution | Canonical risk visualization |
| `<DotBar>` | Right panel risk distribution, IDLE summary, HOVER cluster | Canonical inline dot strip |
| `getRiskLevelFromScore` | Vendor-list color thresholds | Risk threshold canonical source |
| `formatCompactMXN` | Spend amounts in vendor rows, cohort aggregator | Mexican locale formatting |
| `formatEntityName` | Vendor names everywhere | Canonical name formatter |
| `SECTOR_TEXT_COLORS` | Sector chips in vendor rows | Canonical sector text color (NOT `SECTOR_COLORS`) |
| `<MetodologiaTooltip>` | Risk floor segmented control hint | Canonical methodology hint |
| Existing `<YearScrubber>` | Left rail year section (slimmed) | Re-use the slider styling, just trim chrome |
| Existing `<VendorSearchBox>` | Left rail vendor section | Already perfect, just relocate |

No new primitives are introduced. The five new files in §1.3 are
*compositions* of these primitives, not replacements.

---

## Appendix A — File-touch summary

| File | Action | Approx LoC |
|---|---|---|
| `frontend/src/pages/Atlas.tsx` | Refactor (orchestrator only) | 1,946 → ~600 |
| `frontend/src/components/atlas/AtlasShell.tsx` | NEW | ~80 |
| `frontend/src/components/atlas/AtlasLeftRail.tsx` | NEW | ~340 |
| `frontend/src/components/atlas/AtlasRightPanel.tsx` | NEW | ~520 |
| `frontend/src/components/atlas/AtlasZoomLayer.tsx` | NEW | ~280 |
| `frontend/src/components/atlas/AtlasContext.tsx` | NEW | ~180 |
| `frontend/src/lib/atlas/vendor-lookup.ts` | EXTRACT | ~110 (moved) |
| `frontend/src/lib/atlas/year-snapshots.ts` | EXTRACT | ~30 (moved) |
| `frontend/src/lib/atlas/categories-meta.ts` | EXTRACT | ~55 (moved) |
| `frontend/src/lib/atlas/use-cluster-notes.ts` | EXTRACT | ~55 (moved) |
| `frontend/src/lib/atlas/use-atlas-url-state.ts` | NEW | ~120 |
| `frontend/src/lib/atlas/use-vendor-level-dots.ts` | NEW (mock first) | ~90 |
| `frontend/src/components/charts/ConcentrationConstellation.tsx` | UNTOUCHED | 894 |
| `frontend/src/components/charts/cluster-glyphs.tsx` | UNTOUCHED | (untouched) |
| `frontend/src/lib/atlas-stories.ts` | UNTOUCHED | 442 |

Net: ~+1,000 LoC of new console infrastructure, ~−1,300 LoC removed
from `Atlas.tsx`. Bundle delta should be neutral-to-negative
(extracted modules tree-shake more aggressively).

## Appendix B — Out-of-scope follow-ups (file as separate tickets)

1. **Compare mode** in the new console (split center pane). Re-introduce
   after P5 lands once the zoom mechanics are battle-tested.
2. **Touch-pinch zoom on mobile**. Requires its own design pass.
3. **Lasso on touch devices** via long-press to enter selection mode.
4. **Backend endpoint** `/api/v1/atlas/cluster-vendors` (already
   flagged §13).
5. **Server-persisted saved investigations**. Currently localStorage;
   a `users.investigations` table + auth-aware API would let teams
   share views.
6. **A/B telemetry** to measure whether the new console actually
   reduces "time to first vendor profile open" — the implicit KPI of
   the redesign.

---

*End of plan. Total: 13 sections + 2 appendices. Cite this doc in
phase commits as: `feat(atlas atlas-C-P<n>): <what> (docs/ATLAS_C_CONSOLE_PLAN.md § <section>)`.*
