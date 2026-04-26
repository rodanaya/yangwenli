# RUBLI Site Information Architecture

> **The navigation + journeys layer.** Sits on top of `SITE_SKELETON.md` (what exists) and `VENDOR_DOSSIER_SCHEME.md` (deep entity view). This document defines HOW users move through the platform and where every URL lives.

---

## The three-doc blueprint

| Doc | Defines | Status |
|---|---|---|
| `VENDOR_DOSSIER_SCHEME.md` | One entity's 10-section template | ✅ approved |
| `SITE_SKELETON.md` | All 9 dossier types + 5 macro landings + 3 tools | ✅ approved |
| `SITE_IA.md` (this doc) | URL scheme + navigation + user journeys + persistent UI | ← THIS |

---

## URL scheme (the canonical sitemap)

Every URL in RUBLI falls into one of 4 patterns:

### 1. Macro landings — single page each, no parameter
```
/                         Inteligencia Nacional (national brief)
/aria                     La Cola (priority queue)
/journalists              Sala de Redacción (newsroom)
/explore                  El Buscador (faceted search)
/executive                Brief Ejecutivo (funder summary)
```

### 2. Entity dossiers — `/:type` index + `/:type/:id` deep view
```
/vendors                  Vendor index → redirects to /explore?tab=vendors
/vendors/:id              Vendor Dossier (structured, 10 sections)
/thread/:id               Vendor Dossier (narrative, 6-chapter scroll) — same data

/institutions             Institution index (League view)
/institutions/:id         Institution Dossier
/institutions/compare     Institution A-vs-B compare

/sectors                  Sectors index (12-grid landing)
/sectors/:id              Sector Dossier

/categories               Categories index (91-card grid, sortable)
/categories/:id           Category Dossier ← THE LANDMARK

/cases                    Case Library (filtered by sector/era/status)
/cases/:slug              Case Dossier

/patterns                 Patterns index (P1-P7 cards)
/patterns/:code           Pattern Dossier

/network                  Network landing (community list)
/network/community/:id    Network Dossier

/investigation            User's investigation index
/investigation/:id        Investigation Dossier

/stories                  Story index (already merged into /journalists)
/stories/:slug            Story Dossier (scroll narrative)
```

### 3. Tools — single page each
```
/workspace                Watchlist + Dossiers + Saved Searches
/methodology              Model documentation + transparency
/captura                  Captura Heatmap (institution × sector capture map)
```

### 4. Records (the data inspector view)
```
/contracts                Filtered contracts table (with ?vendor_id=, ?institution_id=, ?category_id= facets)
/contracts/:id            Contract Detail page
```

### Auth + system
```
/login                    Login
/register                 Register
/settings                 User settings
/privacy                  Privacy policy
/terms                    Terms of service
/api-explorer             API explorer (developer)
/not-found                404
```

---

## Primary navigation (sidebar) — proposed restructure

The current sidebar (4 sections / 10 items) was a marathon compromise. It misses Categories, Patterns, Stories, Workspace, Executive. The new IA reflects the 9-dossier + 5-landing + 3-tool model.

### Proposed sidebar (5 sections / 14 items)

```
DESCUBRIR (Discover)                        — macro landings, what's new
  • Inteligencia Nacional      /
  • Sala de Redacción          /journalists  [stories badge]
  • Brief Ejecutivo            /executive

INVESTIGAR (Investigate)                    — priority + active leads
  • La Cola (ARIA)             /aria         [T1 count badge]
  • Mi Espacio                 /workspace    [watchlist badge]
  • Casos                      /cases        [case-count badge]

EXPLORAR (Explore by entity)                — the 9 entity types
  • Categorías                 /categories   ← NEW NAV ENTRY (the landmark)
  • Sectores                   /sectors
  • Instituciones              /institutions
  • Patrones                   /patterns     ← NEW
  • Red                        /network

ANÁLISIS (Cross-cutting analysis)
  • Captura                    /captura
  • Administraciones           /administrations
  • Buscador                   /explore

PLATAFORMA
  • Metodología                /methodology
```

**Sidebar collapsed state** (icon-only): same 5 sections, vertical icon column.

**Mobile bottom nav** (5 most-used): Inteligencia · ARIA · Categorías · Espacio · Buscador.

---

## Secondary navigation (header)

The header is consistent across every page:

```
[hamburger (mobile)] [editorial dateline] [breadcrumb] ............. [⌘K search] [alerts] [DQ grade] [live] [user menu]
```

Breadcrumb examples per route:
```
/                              Inteligencia Nacional
/categories                    Categorías
/categories/20                 Categorías / Medicamentos y Farmacéuticos
/vendors/29277                 Vendor / Grupo Fármacos Especializados
/thread/29277                  Vendor / Grupo Fármacos Especializados / Thread
/cases/grufesa-pharma-oligo    Casos / Pharma Oligopoly
```

---

## Cross-linking rules between dossiers

Every dossier links systematically to others via `<EntityIdentityChip>`. The cross-reference graph (from `SITE_SKELETON.md`):

```
Vendor § 2  ──→ Institution Dossier   (top buyer)
Vendor § 3  ──→ Pattern Dossier        (primary_pattern)
Vendor § 4  ──→ Network Dossier        (community membership)
Vendor § 7  ──→ Case Dossier           (GT case anchor)

Institution § 2 ──→ Category Dossier   ← THE NEW LANDMARK CONNECTION
Institution § 3 ──→ Vendor Dossier
Institution § 5 ──→ Case Dossier

Sector § 2 ──→ Category
Sector § 3 ──→ Vendor
Sector § 4 ──→ Institution
Sector § 7 ──→ Pattern

Category § 2 ──→ Institution
Category § 3 ──→ Vendor
Category § 7 ──→ Pattern
Category § 9 ──→ Sister Categories

Case        ──→ Vendor + Institution + Pattern + Network
Network     ──→ Vendor (members)
Story       ──→ Case + Vendor (sources)
Pattern     ──→ Vendor (instances)
```

**Rule:** every entity mention outside its own dossier MUST render via `<EntityIdentityChip>`. Plain `<Link>` to entity routes is forbidden.

---

## The 5 user journeys

### 1. Curiosity journey (lurker / first-time visitor)

```
/  Inteligencia Nacional
   ↓ scroll, see "Top categorías esta semana"
   ↓ click Medicamentos chip
/categories/20
   ↓ § 3 La Oferta — see GRUFESA chip
/vendors/29277
   ↓ § 7 Los Signos — see Case 36 chip
/cases/grufesa-pharma-oligo
   ↓ scroll, see related stories
/stories/imss-pharma-cartel
```

**Goal:** discovery hooks → 4-5 dossier hops → emotional understanding. Average 7 minutes.

### 2. Investigation journey (working journalist)

```
/aria  La Cola
   ↓ filter Tier=T1, Pattern=P1, Sector=salud
   ↓ click vendor row
/vendors/29277
   ↓ § 1 Lede + § 7 Signos — confirm interesting
   ↓ click "Add to Investigation"
/investigation/123 (own)
   ↓ accumulate 5-10 entities
   ↓ Generate press copy
   ↓ Download evidence pack
```

**Goal:** triage → confirm → collect → publish. Average 30-90 minutes per investigation.

### 3. Reference journey (regulator / academic)

```
⌘K → "GRUFESA"
/vendors/29277
   ↓ skim § 0-1
   ↓ § 10 footer → click Methodology link
/methodology
   ↓ § 7 Limitations
   ↓ confirm scope
   ↓ back to vendor
/vendors/29277
   ↓ Download evidence pack (JSON + CSV + memo .md)
```

**Goal:** verify scope, methodology, citations → cite in own report. Average 5-15 minutes.

### 4. Workspace journey (returning power user)

```
/workspace
   ↓ Watchlist tab — alert: "Vendor X risk +0.12 since last week"
/vendors/X
   ↓ scroll change-log
   ↓ status: "needs investigation"
   ↓ Add to Dossier "Q2 Pharma Investigation"
/workspace
   ↓ Dossier tab — open Q2 Pharma
   ↓ Generate report
   ↓ Share with editor
```

**Goal:** track changes over time, accumulate evidence, export. Average 10-20 minutes per session.

### 5. Demo journey (funder / stakeholder)

```
/executive  Brief Ejecutivo
   ↓ see model accuracy, coverage, cost-to-detect
   ↓ click "Top dossiers ejemplares"
/categories/20  (or canonical example)
   ↓ scan § 1 lede + § 8 verdict
/vendors/29277
   ↓ scan dossier
   ↓ § 10 download evidence pack to inspect
   ↓ back to /executive
```

**Goal:** verify the platform delivers what it claims → fund or refer. Average 5-10 minutes.

---

## Persistent UI

### Sidebar (left, collapsible)
- Always present (md+); overlay on mobile
- 5 sections, 14 items (defined above)
- T1 count + watchlist alert + case count badges
- Footer: User → ReportIssueDialog · Language toggle · Collapse arrow

### Header (top, sticky h-11)
- Hamburger (mobile only)
- Editorial dateline (lg+)
- Breadcrumb / page title
- ⌘K search trigger (lg+, icon-only mobile)
- Alerts indicator (anomaly count)
- DQ grade pill (sm+)
- Live signal (sm+)
- User menu / Sign in

### Footer (bottom, h-auto)
- Brand · tagline · stats line (md+)
- About data line (always)
- Legal links: privacy · terms

### Mobile bottom nav (md-)
- 5 icons + "More" (which opens sidebar)
- Defined items: Inteligencia · ARIA · Categorías · Espacio · Buscador

### Command palette (⌘K, modal)
- Type-filtered search across vendors / institutions / categories / cases / patterns / sectors
- Results render as `<EntityIdentityChip>` rows (consistent grammar)
- Keyboard navigation (↑ ↓ Enter)
- Saved searches strip at top

---

## Search architecture

ONE search component (`<CommandPalette>`) handles ALL discovery. No per-page search boxes.

Searchable entity types and their match fields:
```
vendor       name + RFC + alternative names
institution  name + abbreviation
sector       name + code
category     name_es + name_en + keywords
case         case_name + case_id + sector
pattern      code + label
network      community_label + top members
story        title + slug
```

Result row format (always):
```
<EntityIdentityChip type=... id=... name=... [signals] />
```

---

## Tab patterns within dossiers

Two formats per dossier:

**Structured (default for `/{type}/:id`):**
- 10 sections rendered as anchored tabs OR scrollable single-page
- Section anchors visible in URL: `/vendors/29277#§4-la-red`
- Sticky tab strip at top scrolls to section

**Narrative (vendor only, `/thread/:id`):**
- 6 chapters as scroll-driven pages
- Same data as structured view, presented cinematically
- Right-edge chapter dots for navigation

Both render the same `useEntity('vendor', id)` data.

---

## What changes from current state

### Routes that need to be ADDED
- `/categories` — index page (currently no entry)
- `/categories/:id` — Category Dossier (currently exists as `/categories/:id` but not in nav)
- `/patterns` — Patterns index (P1-P7 cards) (NEW)
- `/patterns/:code` — Pattern Dossier (NEW)
- `/executive` — Brief Ejecutivo landing (already exists, needs nav entry)
- `/journalists` — Sala de Redacción (already exists, needs nav entry rename)
- `/workspace` — confirm exists, add nav entry

### Routes that need to be RENAMED/MERGED
- `/capture` → `/captura` (Spanish-first, matches editorial bible)
- `/intersection` → consider merging into Categories (it's a category-style cross-cut)
- `/explore?tab=vendors` → keep as the canonical vendor index

### Sidebar restructure
- 4 sections / 10 items → 5 sections / 14 items
- Add: Categorías, Patrones, Sala de Redacción, Brief Ejecutivo, Mi Espacio
- Move: Capture (rename to Captura)
- Same icons + same i18n grammar

---

## Implementation in IA terms

The IA changes are mostly **additive** — we don't break anything in the current sidebar, we just add the missing entries. The big work is:

1. **Add 5 new sidebar entries** (Categorías, Patrones, Sala de Redacción, Brief Ejecutivo, Mi Espacio) — 30 min
2. **Rename `/capture` → `/captura`** with redirect — 10 min
3. **Wire `<EntityIdentityChip>` into the existing pages** that show entity lists — 4-6 hours across 12 high-traffic surfaces
4. **Build the 3 missing index pages** (`/categories`, `/patterns`, refresh `/journalists`) — 1-2 days
5. **Build out the new dossier templates** following the 10-section scheme — 1 week per template

The IA layer is the **roadmap commitment**. The skeleton is the **what**. The dossier scheme is the **how**. With all three locked, every commit going forward references which doc it implements.

---

*This is the third and final layer of the blueprint. The site has structure now — every URL has a defined purpose, every page has a defined role, every navigation hop is documented. We crunch from here.*
