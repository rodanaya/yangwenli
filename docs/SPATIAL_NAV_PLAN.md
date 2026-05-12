# RUBLI Spatial Navigation Plan

> The platform is not a CMS of dossier pages. It is a spatial map of the
> Mexican procurement universe that you fly through. Star Fox 64 Lylat
> system — zoom out to see all planets, zoom into one to see its
> surface, drill into a contract. Continuous space. No page reloads.

## Why this is the model

Three failed assumptions buried in the v1.0 plan today:

1. **"Vendors / institutions / sectors are pages."** They are not. They
   are zoom levels of the same map. Treating them as pages destroys the
   spatial metaphor and forces the user into back-button navigation —
   the opposite of exploration.
2. **"Dossiers are the destination."** They are not. The destination is
   *understanding the system*. A dossier is a briefing screen that
   appears when you focus on an entity, the way Star Fox shows a planet
   info card before a mission. It is overlay content, not a route.
3. **"The sidebar is the navigation."** It mostly is not. The map is the
   navigation. The sidebar belongs only to *tools* (ARIA queue,
   Methodology, Stories) — surfaces that don't live on the map.

## Zoom hierarchy

| Z | Name | What's on screen | Atomic unit |
|---|---|---|---|
| **Z0** | System | All 12 sectors as bodies in the constellation field | Sector |
| **Z1** | Sector | All institutions within a sector, clustered by institution_type | Institution |
| **Z2** | Institution | All vendors that institution buys from | Vendor |
| **Z3** | Vendor | All contracts of that vendor, time-arranged | Contract |
| **Z4** | Contract | Single contract detail | Contract attribute |

Each transition is the same primitive: **click → zoom + load next level**.
Drag to pan. Wheel to zoom continuously. Esc to zoom out one level.

## Universal map controls

These exist at every zoom level, always visible:

- **Year scrubber** (2002–2025). Time is a parameter, not a per-page filter.
- **Lens toggle**: PATTERNS / SECTORS / CATEGORIES / TERMS / RISK FLOOR.
  Switches the coloring/clustering of the bodies on screen.
- **Search**: typeahead that *focuses the camera* on a result, not navigates.
- **Pin**: keep a focused entity highlighted across zoom changes.
- **Compare**: split-screen two map states side-by-side.

## What surfaces collapse into the map

These current pages stop being pages:

- `/sectors` → Z0 zoomed to sector lens
- `/sectors/:code` → Z1 (zoomed into that sector)
- `/institutions` → Z0 with institution-density overlay
- `/institutions/:id` → Z2 (zoomed into that institution)
- `/vendors/:id` → Z3 (zoomed into that vendor)
- `/captura` (institutional capture) → Z0 with capture pattern lens
- `/intersection` → Z0 with split-screen + multi-axis lens
- `/network` → Z0 with edges visible (vendor relationships)

## What stays as pages

Tools, not entities:

- `/aria` — investigation queue. A worklist, not a map. List + filters.
- `/methodology` — model card. Long-form prose.
- `/cases` — documented case library. List of articles.
- `/stories/:slug` — long-form narratives. Already correctly page-shaped.
- `/dashboard` — landing/hero. Could become a launcher into the map.
- `/report-card` — printable report. Document, not map.
- `/admin` (workspace, watchlist, settings) — user state.

## The briefing panel (right rail)

When the camera focuses on an entity (hover-pin or click-zoom), a panel
appears on the right showing:

- Entity identity (name, type, sector chip, ARIA tier)
- 4–6 key stats
- Risk indicator + verdict line
- Top relationships (next-level peek without committing to zoom)
- One CTA: **Investigate** = zoom into this entity (Z+1)

This is the briefing screen. It is the only "dossier" surface in the
new model.

## What we already have that's right

- Atlas constellation engine (`ConcentrationConstellation`) — the map.
- `AtlasZoomLayer` — the zoom transform layer.
- Cluster click → zoom transition (Day 2).
- Drag-to-pan + wheel-zoom + reset chip (Day 2).
- Vendor-level dots emerging on zoom (Day 2 D).
- Year scrubber (Atlas).
- Lens toggle (Atlas).
- The right panel infrastructure (`AtlasRightPanel` →
  `ZoomedClusterPanel` is the proto-briefing).

The existing `/atlas` page is roughly the Z0 prototype — but only for
the patterns/sectors/categories/sexenios lenses. It does not yet
support institution or vendor zoom levels, and the briefing panel is
not promoted to a universal pattern.

## What needs to be built

| Phase | Build | Effort |
|---|---|---|
| **0** | Promote Atlas to home (`/`). Demote dashboard to a launcher tile. | 1 session |
| **1** | Z1 — zoom into a sector reveals institutions as bodies. New endpoint: `/api/v1/sectors/{id}/institutions-spatial`. Briefing panel for institution focus. | 2–3 sessions |
| **2** | Z2 — zoom into an institution reveals its vendors. Endpoint exists (`/institutions/:id/vendors`); just needs spatial layout + zoom transition. | 2 sessions |
| **3** | Z3 — zoom into a vendor reveals contracts on a time arrangement. Use existing vendor contracts endpoint. | 2 sessions |
| **4** | Universal briefing panel — make `ZoomedClusterPanel` polymorphic so the same right rail handles sector / institution / vendor / contract focus. | 1 session |
| **5** | Demote/redirect the page-shaped surfaces (`/institutions/:id`, `/vendors/:id`, `/sectors/:code`) to deep-link map URLs (`/#z=2&inst=4`). Keep the legacy pages reachable for printable views. | 1 session |
| **6** | Mobile pass on the spatial canvas — pinch zoom, two-finger pan, smaller briefing panel as bottom sheet. | 2 sessions |

Roughly 11–12 focused sessions. Roughly 3 weeks of substantive frontend
work. The launch on 2026-05-22 (currently 13 days away) is not
realistic for this rebuild AND the existing checklist (story i18n,
mobile, Methodology rework, etc.).

## Recommendation on launch

Two viable scopings:

**Option A — push launch to 2026-06-12.** Three more weeks. Build the
spatial concept properly. Ship a coherent product.

**Option B — keep launch 2026-05-22 but cut scope.** Ship Atlas (Z0 +
limited Z1) as the centerpiece + RedThread + Stories + ARIA + a few
report-card surfaces. The institution / vendor / sector pages stay
as the current page-shaped legacy until v1.1 absorbs them into the
map. Honest framing: "v1.0 is the map for sectors and patterns, plus
investigation tools. v1.1 will absorb institutions and vendors into
the same map."

I recommend **B** because it's truthful about what's done vs what's
emerging, and gives you something to launch on the date you've
already announced.

## Concrete next steps for tonight's session

1. ~~Revert `/institutions/:id` to InstitutionProfile~~ ✓ done
2. Write this plan ✓ done
3. Begin Phase 1 prototype: extend Atlas to support a *sector* lens
   that, when a sector is clicked, transitions to Z1 showing that
   sector's institutions as a sub-constellation.
   - Add `AtlasZoomState` Z0/Z1/Z2 enum to `AtlasContext`.
   - Add `getSectorInstitutionsSpatial(sectorId)` mock endpoint
     (returns institutions with x/y placement based on size + risk).
   - When user clicks a sector cluster (already wired for zoom-into-
     cluster), if the active lens is `sectors`, transition to Z1
     instead of just CSS-scaling.
   - Briefing panel adapts to show institution-list when Z1.

This proves the spatial-zoom concept with one real transition. Then
we either commit to it across the platform (Option A) or scope it
into v1.1 (Option B).
