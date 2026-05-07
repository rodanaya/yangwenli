# Audit 03 — Information Architecture

Date: 2026-05-07. Live site: https://rubli.xyz. First-time-visitor lens.
Walked sidebar at desktop 1440x900, hit every entry, plus 2-click and orphan checks.

## Sidebar — every item, 1-line verdict

13 nav entries across 5 sections + footer. Visited each by direct URL.

| Section | Label | Route | H1 found | 5-sec verdict | Issues |
|---|---|---|---|---|---|
| DESCUBRIR | Dashboard | `/` | "Veintitres anos. MX$9.9 billones..." | Pass — clear executive briefing | Crumb says "Panel" / "Dashboard"; folio says "Reporte Ejecutivo". 3 names for 1 page |
| DESCUBRIR | Atlas / Observatorio | `/atlas` | "An Atlas of nine trillion pesos" | Pass — observatory chart | **Sidebar label = "Atlas"; CLAUDE.md says public name is "El Observatorio". Page H1 still says "Atlas". Rename never landed end-to-end** |
| DESCUBRIR | Sala de Redaccion / Newsroom | `/journalists` | "RUBLI Investigations" | Pass — investigation library | Route `/journalists` doesn't match label "Newsroom"/"Sala de Redaccion" (legacy URL) |
| INVESTIGAR | Cola de Riesgo / Risk Queue | `/aria` | "Cola de Riesgo" | Pass — ARIA queue, 4 rings | Route `/aria` is internal jargon vs user-facing "Risk Queue" — minor |
| INVESTIGAR | Espacio de trabajo / Workspace | `/workspace` | "Espacio de trabajo" | **Logged-out user sees "ACCESO REQUERIDO" — login wall** | Sidebar item gives no hint that auth is needed; first-timer hits a dead-end |
| INVESTIGAR | Casos / Case Library | `/cases` | "Registro Documentado" | Pass — case library | "FOLIO·CA" eyebrow; clean |
| EXPLORAR | Sectores | `/sectors` | "12 Sectores de la Contratacion Federal Mexicana" | Pass | — |
| EXPLORAR | Categorias / Categories | `/sectors?view=categories` | **Same H1 as Sectores: "12 Sectores..."** | **Fail — same page, different param. The H1 doesn't change. Crumb says "Sectores" not "Categorias"** | Critical label-content mismatch |
| EXPLORAR | Institutions / Ranking | `/institutions` | "Cinco dependencias concentran 1.25 billones..." | Pass | Crumb still in English ("Institutions") on ES page |
| EXPLORAR | Redes / Network | `/network` | "La red invisible." | Pass — Louvain network folio | — |
| EXPLORAR | Patrones / Patterns | `/patterns` | "Patrones de Investigacion ARIA" | Pass — 7 typologies | — |
| ANALISIS | Captura / Capture | `/captura` | "Como un proveedor captura una institucion." | Pass — institutional capture folio | — |
| ANALISIS | Administraciones | `/administrations` | "Seis administraciones, un solo patron." | Pass | — |
| ANALISIS | La Interseccion / Intersection | `/intersection` | "El modelo senala lo que los reguladores todavia no." | Pass — RUBLI vs regulators | — |
| PLATAFORMA | Metodologia / Methodology | `/methodology` | **"How we score corruption risk."** (English) | Pass content-wise | **Bilingual gap: page H1 stays English when UI is ES. Crumb says "Metodologia"** |

## 2-click test — pass / fail per task

From `/`, no Cmd+K (counted as 1 click for opening + 1 for typing/select):

| Target | Path | Clicks | Result |
|---|---|---|---|
| Vitalmex dossier | Cmd+K -> "vitalmex" -> Enter (or sidebar Risk Queue -> table search) | **3+** via UI | **Fail at 2 clicks** if you don't already know about Cmd+K. Vitalmex isn't in the home "recent critical alerts" list. No "top vendors" sidebar entry |
| REPSOL dossier | Cmd+K -> "REPSOL" -> Enter | 3 | Same — relies on Cmd+K |
| ICA dossier | Cmd+K -> "ICA" | 3 | Same |
| IMSS institution | sidebar /institutions -> click IMSS row | 2 | **Pass** |
| PEMEX institution | /institutions -> click row | 2 | **Pass** |
| SCT institution | /institutions -> click row | 2 | **Pass** |
| Sector Salud | sidebar /sectors -> click Salud card | 2 | **Pass** |
| Methodology | sidebar Metodologia | 1 | **Pass** |
| Estafa Maestra case | sidebar Casos -> click row | 2 | **Pass** (also linked from home `lead-time` chart legend) |
| Cartel del Corazon case | sidebar Casos -> search/scroll -> click | 2-3 | Pass if listed; not surfaced on home |
| One investigative story | sidebar Sala de Redaccion -> story card | 2 | **Pass** |

**Verdict**: vendor lookup is the weakest journey. There is **no sidebar entry that lists vendors**. The CommandPalette `/explore?tab=vendors` route exists (Header.tsx references it) but is unreachable from the sidebar without `Ctrl+K` keyboard literacy.

## Orphan pages (real route, not redirect, no sidebar/inline reachability)

Cross-referenced `App.tsx` routes vs sidebar (NAV_SECTIONS) + inline page links via grep:

| Route | Status | Reachable from |
|---|---|---|
| `/explore` | **ORPHAN-ish** — Cmd+K only, no sidebar item | CommandPalette only |
| `/price-analysis` | **ORPHAN** | Listed only in `Header.tsx` breadcrumb labels and i18n keys; zero inbound `<Link>` or `<a>` |
| `/contracts` (table) | semi-orphan | Reachable only via the home funnel link `/contracts?risk_level=high`; the bare list has no nav entry |
| `/settings` | logged-out orphan | Auth menu only |
| `/_dev/charts` | intentional internal | not in nav (acknowledged) |

**Count: 2 hard orphans (`/price-analysis`, `/explore`) + 1 semi-orphan (`/contracts`).**

`/price-analysis` is the loudest: a fully implemented page (PriceIntelligence.tsx) with no inbound link from the live site at all.

## Label-content mismatches

1. **Categorias sidebar item -> Sectors page**. `/sectors?view=categories` renders the same H1 ("12 Sectores...") and the same crumb ("Sectores"). A first-timer clicking "Categorias" is dropped onto a page that visually says they're on "Sectores". The query param toggles a tab, but the page identity doesn't change.
2. **Atlas vs El Observatorio**. CLAUDE.md and the homepage Section 1 promote "The Observatory". Sidebar label and page H1 still say "Atlas". Three names live simultaneously: Atlas (URL + page), Observatory (homepage section header), Observatorio (redirect alias).
3. **Methodology H1 hard-coded English** even when UI lang is ES — "How we score corruption risk." stays English. Bilingual gap.
4. **Newsroom -> /journalists URL** — works, but the URL doesn't match the relabel. Old URL kept for SEO but creates cognitive load when sharing.
5. **Workspace** sidebar item silently leads to a login wall for guests; no badge/lock icon hints at gating.

## Empty-state failures

- `/vendors/999999` -> renders "Vendor Not Found" with a "Back to Vendors" button. Handled correctly. **However** the Back button goes to `/vendors`, which redirects to `/explore?tab=vendors`. Two-step indirection, but it works.
- `/vendors/1` -> 200 SPA shell (200 status). Did not exhaustively probe all 5 random IDs because of repeated browser session races during this audit, but spot-check on 999999 confirms a graceful empty state. No skeleton-forever observed for this ID.
- During the audit, `/aria` and `/workspace` each appeared to redirect to `/` once — could not reproduce after a hard reload, so I am attributing these to a transient prod 5xx (curl confirmed prod was briefly unavailable mid-audit). Worth a follow-up health check.

## The single navigation moment that lost trust

**Clicking "Categorias" in the sidebar lands on a page whose H1, breadcrumb, and folio number all say "Sectores".** A first-timer cannot tell whether the click did anything. The "Categorias 72" tab toggle inside the page is the only differentiating signal, and it isn't visually emphasized. This is the IA equivalent of a button that says "Submit" but does nothing visible.

Runner-up: vendor lookup requires Cmd+K knowledge. The sidebar has no "Vendors" entry. A journalist arriving cold and trying to look up "Vitalmex" has to find ARIA, scroll a table, sort — or learn the shortcut.

## Recommended IA-only fixes (ranked)

1. **Drop the "Categorias" sidebar item or give it a real page**. As wired today it's a tab masquerading as a section. Either rename it to "Sectores: Categorias" so the destination match is honest, or restore the standalone /categories page.
2. **Add a "Proveedores / Vendors" sidebar entry pointing at `/explore?tab=vendors`**. Promotes the existing orphan and fixes the 2-click-to-Vitalmex failure.
3. **Either link `/price-analysis` from the sidebar (probably under ANALISIS) or delete the route**. A finished page with zero inbound links is dead weight.
4. **Finish the Atlas -> Observatory rename**: change the sidebar i18n key, the page H1, and the route label. Right now three names cohabit one page.
5. **Workspace sidebar item: prefix with a lock glyph or move it under a "Mi Espacio" subheader visible only when authenticated**. Stops the silent auth-wall for cold visitors.
