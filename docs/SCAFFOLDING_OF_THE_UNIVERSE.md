# Scaffolding of the Universe

> Drafted 2026-05-11 (Mon). 32 days until launch (Fri 2026-06-12).
> Concrete punch list for turning `/explore` from a Z0–Z2 demo into a
> continuous spatial universe with no dead-ends, no leaky page-route
> escape hatches, and a single set of entity primitives that work at
> every zoom level.
>
> Companion to `docs/SPATIAL_NAV_PLAN.md` (the *concept*). This doc
> names the *structure* — the framing studs the whole universe hangs on.

## What "scaffolding" means in this doc

Three structural layers that have to exist for the spatial metaphor to
hold together:

1. **Vertical scaffolding** — the Z0 → Z3 zoom chain has no missing
   rungs. Every body the user sees at every level is clickable, every
   click drills deeper *inside the canvas*, and the universe never
   spits the user out to a legacy page route mid-exploration.
2. **Horizontal scaffolding** — the same persistent controls (year,
   lens, risk floor, search, pin, breadcrumbs) live at every zoom
   level. They don't reset on transition.
3. **Identity scaffolding** — wherever an entity appears (briefing
   panel, breadcrumbs, search result, pin chip, legacy page redirect,
   audit-doc link), it renders the same chip, the same name format,
   the same risk indicator, the same lede. Bible §3.10 + the
   EntityIdentityChip contract.

The current `/explore` has most of (1) and (2). It has none of (3) in
a load-bearing way — `BriefingPanel` reimplements entity chrome
locally instead of composing `EntityIdentityChip`.

## Inventory of what's already standing

| Piece | File | State |
|---|---|---|
| Focus-stack state machine (Z0–Z4) | `components/explore/ExploreState.tsx` | ✅ shipped |
| SVG canvas with drag-pan + wheel-zoom | `components/explore/ExploreCanvas.tsx` | ✅ shipped (Z0 + Z1 + Z2 placeholder) |
| Polymorphic briefing panel (4 entity kinds) | `components/explore/BriefingPanel.tsx` | ✅ shipped — local chrome, not yet on EntityIdentityChip |
| Year scrubber + risk-floor toggle | `components/explore/CanvasControls.tsx` | ✅ shipped |
| Search-with-camera-focus | `components/explore/SearchOverlay.tsx` | ✅ shipped |
| URL state sync (`?s=&i=&v=`) | (in `ExplorePage.tsx` + reducer) | ✅ shipped — confirmed by commit `55f07b5` |
| Cinematic fly-in zoom | `ExploreCanvas` motion layer | ✅ shipped (commit `4063c16`) |

## The gaps — the framing studs that aren't there yet

### Gap 1 — Z3 contracts-in-space (Phase 5)

**Status:** missing. Z2 currently dispatches `navigate('/thread/:id')` as
a placeholder when a vendor is clicked, breaking the spatial metaphor.

**Build:**
- New layout function `z3ContractBodies(vendor, year)` — radial
  arrangement of the vendor's contracts. Angle = procurement month
  (Jan → Dec around the dial). Radius = log10(amount). Color = risk
  level via `RISK_COLORS`.
- New reducer action `drill-into-contract` already declared in the
  state machine — wire it.
- New `ContractBriefing` block in `BriefingPanel` for `focus.kind === 'contract'`.
- New API call: vendor contracts endpoint (already exists at
  `/api/v1/vendors/{id}/contracts`, just paginate/filter).

**Acceptance:** a journalist on Z2 clicks any vendor dot, lands on Z3
inside the canvas (no route change), sees ~20–50 contract dots arranged
by month around the year axis, clicks one to see the contract briefing
in the right rail. Esc pops back to Z2.

**Estimate:** 2 sessions.

### Gap 2 — Page-route demotion (Phase 5 of SPATIAL_NAV_PLAN)

**Status:** missing. `/vendors/12345` still loads the legacy
`VendorProfile` page; clicking a vendor in `/explore` (Z3 placeholder)
dumps the user onto that page, severing the camera state.

**Build:**
- `/vendors/:id` → redirect to `/explore?s=<sector>&i=<inst>&v=<id>`
  *unless* the visitor asks for the printable view via `?print=1`.
- Same for `/institutions/:id`, `/sectors/:code`.
- Keep the legacy components mounted at `/print/vendors/:id` etc. for
  the report-card export use case.
- Deep-link landings: hitting `/explore?v=12345` cold should hydrate
  the focus stack by looking up the vendor's parent institution and
  parent sector, then animate from Z0 → Z3 in three quick beats.

**Acceptance:** zero unprefixed `/vendors/`, `/institutions/`,
`/sectors/:code` survives outside the canvas. Every shared link
deep-links into the universe.

**Estimate:** 1 session for the redirects + reverse-lookup
hydration; 0.5 session to migrate any in-codebase `<Link
to={`/vendors/...`}>` to deep links.

### Gap 3 — EntityIdentityChip composition

**Status:** `BriefingPanel` reimplements entity chrome with raw spans
and inline color styles. The Vendor v3.0 Bible names
`EntityIdentityChip` as the *only* legal way to render an entity
outside its own dossier (CLAUDE.md §"Frontend v3.0 — Hard rules" #1).

**Build:**
- Refactor `BriefingPanel` → each entity kind composes
  `<EntityIdentityChip type=... name=... size="lg" />` for the
  identity row, `getRiskLevelFromScore(score)` for the color, the
  stat-grid stays local.
- Same for the breadcrumbs row — chips not text.
- Hover-pin and pinned overlays use the same chip.

**Acceptance:** grep `<EntityIdentityChip` count in `components/explore/`
goes from 0 to ~6. No raw `vendor.name` literal in this directory.

**Estimate:** 1 session.

### Gap 4 — Pin & compare across zoom

**Status:** missing entirely from `/explore`. The legacy `/atlas` had
pin and compare; the new canvas doesn't.

**Build:**
- Add `pinned: Focus | null` to `ExploreState`.
- Pinned entity gets a pulsing-ring overlay at *every* zoom level
  (if it's a vendor, it's still pulsing when we're on Z0 — drawn as
  a marker on its sector cluster).
- "Compare" splits the canvas into two states side by side, same
  lens, same year. Each side has its own focus stack.

**Acceptance:** pin a vendor at Z3, zoom out to Z0, the pin survives
and shows as an annotation on the vendor's home sector body. Compare
mode renders two canvases that scroll-zoom independently.

**Estimate:** 2 sessions (pin) + 1 session (compare).

### Gap 5 — Mobile gestures (Phase 6)

**Status:** missing. Drag-pan + wheel-zoom are mouse-only.

**Build:**
- Single-finger drag → pan.
- Two-finger pinch → zoom continuously.
- Two-finger pan → pan (disambiguate from pinch by initial finger
  spread).
- Tap a body → focus (briefing slides up as bottom sheet instead of
  right rail).
- Bottom-sheet pattern: 30% height pinned, drag up to 90% for full
  briefing, drag down to dismiss back to map.

**Acceptance:** open `/explore` on a 390×844 viewport, can drill Z0
→ Z1 → Z2 → Z3 entirely via touch. Briefing readable. No horizontal
scroll bug.

**Estimate:** 2 sessions.

### Gap 6 — Lens system parity

**Status:** lens toggle was a key feature on the legacy `/atlas`
(PATTERNS / SECTORS / CATEGORIES / TERMS). `/explore` has a single
default lens; no toggle.

**Build:**
- 5 lenses at Z0: PATTERNS · SECTORS · CATEGORIES · TERMS · RISK FLOOR.
- Each lens is a coloring + clustering function over the same bodies.
- Lens persists across zoom transitions (you stay in CATEGORIES lens
  when you drill into a sector, the sector's institutions are
  category-tinted).
- URL state field `?lens=patterns`.

**Acceptance:** five-button row at the top of the canvas, click cycles
the lens, all bodies recolor + recluster smoothly. Pin survives lens
changes.

**Estimate:** 2 sessions.

### Gap 7 — Empty / loading / error universal pattern

**Status:** each zoom level reimplements its own loading + empty + error
state in the briefing panel. Some are blank, some are spinners, some
just show "—".

**Build:**
- One `<BriefingShell state="loading | empty | error | ready">` wrapper.
- Loading = skeleton mimicking the layout (not a spinner).
- Empty = honest line ("No vendors in this sector for 2018", with
  a "broaden year" CTA).
- Error = error + retry button + Sentry tag.
- Same shell for each kind of briefing.

**Acceptance:** every briefing has all four states defined; no
component-local "if (loading) return <Spinner />".

**Estimate:** 1 session.

## The order

```
Week of 2026-05-11 (this week — 4 sessions left)
├─ Mon ●  this doc + audit agent + scaffolding survey            (today)
├─ Tue ●  Gap 1 — Z3 contracts-in-space layout + briefing
├─ Wed ●  Gap 1 — Z3 polish + reducer wiring + URL state
├─ Thu ●  Gap 2 — page-route demotion + deep-link hydration
└─ Fri ●  Gap 3 — EntityIdentityChip refactor

Week of 2026-05-18 (8 sessions)
├─ Gap 4 — pin (3 sessions)
├─ Gap 6 — lens system parity (2 sessions)
├─ Gap 7 — briefing shell (1 session)
└─ Buffer / soak (2 sessions)

Week of 2026-05-25 (8 sessions)
├─ Gap 5 — mobile gestures (2 sessions)
├─ Story chart bilingual sweep — 12 charts (4 sessions)
└─ Buffer (2 sessions)

Week of 2026-06-01 (8 sessions)
├─ Methodology body i18n
├─ /institutions/:id rework
├─ /vendors/:id rework (now under the redirect umbrella)
├─ /administrations chart simplification
└─ Final smoke run

Week of 2026-06-08 (5 sessions before launch)
├─ Mon — pre-launch checklist (uptime, errors, backups, rate limits)
├─ Tue–Wed — bug fix only
├─ Thu — final smoke + announcement draft
└─ Fri 2026-06-12 — LAUNCH
```

## Hard rules during this push

- **Gap-first, polish-last.** Don't shave a yak in Gap 3 if Gap 2 still
  has the user falling out of the canvas. The user feedback from May 11
  was explicit: "anything below A is trash" + "i dont see this total
  scrutiny that we need." Gaps are A-grade; polish on shipped Gaps is
  B-grade and waits.
- **One Gap per commit minimum.** No multi-gap commits. Each commit
  has to be reviewable on its own.
- **Bible §3.10 + Hard Rules in CLAUDE.md still apply.** Use
  `EntityIdentityChip`, `getRiskLevelFromScore`, `formatVendorName`,
  no green for low risk, no inline hex.
- **No new pages.** Every Gap is structural; if a Gap requires a new
  route, the route is a redirect destination (`/print/vendors/:id`),
  not a new surface.
- **No regression on what's shipped.** `ExploreState` reducer is the
  one place state changes — extending it is fine; reaching around it
  is not.
- **Every Gap closes with a screenshot.** Drop into
  `data/audit_runs/scaffolding/` so we have a paper trail for the
  launch announcement.

## What this doc is NOT

- Not the audit report (that's the parallel agent's job, landing in
  `data/audit_runs/20260511_live_audit/AUDIT.md`).
- Not the v1.0 launch plan (that's `docs/RUBLI_v1.0_LAUNCH_PLAN.md`).
- Not a vision doc (that's `docs/SPATIAL_NAV_PLAN.md`).
- Not a backlog. Every item here is in the 32-day window. Anything
  longer is on the v1.1 candidate list at the end of the launch plan.

## Open questions for the user

1. Z3 layout — radial (month-as-angle) vs. linear timeline strip vs.
   force-directed? Radial preserves the "celestial body" metaphor but
   linear is more journalist-legible.
2. Compare mode (Gap 4) — keep, defer, or cut? It's the heaviest piece
   of Gap 4 and could fall to v1.1 if Gaps 1–3 + 5 slip.
3. Cases / Stories — do they live in the universe as overlay
   annotations (a Case is a constellation of vendors), or stay as
   sidebar surfaces? `SPATIAL_NAV_PLAN` says sidebar; this is consistent
   but worth re-asking now that Gaps 1–3 are concrete.
