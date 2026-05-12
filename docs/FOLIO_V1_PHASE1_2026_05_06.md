# RUBLI Folio v1 — Phase 1 plan

> Three-Agent Harness · Planner artifact (Opus 4.7)
> Surfaces: `/dashboard` (Executive.tsx) + `/vendors/:id` (VendorProfile.tsx)
> Aesthetic source: `.claude/skills/rubli-folio-aesthetic/SKILL.md` (cited
> throughout); cover-the-captions gate per `.claude/skills/rubli-omega-redesign/SKILL.md`;
> rubric per `.claude/skills/rubli-three-agent-harness/SKILL.md`.

---

## 0. Working preface

Phase 1 is a **visual skin pass**. No data layer, scoring, ConcentrationConstellation
engine, ARIA pipeline, or new dependencies. Two surfaces, three things to ship per
surface:

1. Folio hero (eyebrow + EB Garamond italic 500 headline + 68ch lede).
2. Paper-grain overlay scoped to the page (only on Executive — VendorProfile is
   *action-heavy*, see decision tree below).
3. PlateFrame applied to chart sections that "invite contemplation" — never to
   tables, filters, link cards, or the action-heavy vendor dossier body.

The When-to-use-PlateFrame decision tree (skill §"When to use PlateFrame") cuts
the dossier surface differently than the dashboard:

- **Executive**: the page is a **briefing**, not a queue. The Atlas, MacroArc,
  LeadTimeChart, the four Headline-Number tiles, the Findings 01–04, Pesos en
  Riesgo, Top Categories, La Lente, Documented Cases timeline — all
  **contemplative data plates**. PlateFrame fits.
- **VendorProfile**: the page is a **dossier in service of opening an
  investigation**. Hero is identity + verdict; tabs are evidence/activity/network
  workspaces. The skill explicitly excludes this category ("vendor profile (dense
  facts)... no PlateFrame, lean typography only"). Phase 1 therefore restricts
  VendorProfile changes to: folio-hero typography, marginal-note PriorityAlert,
  italic plate caption under the WaterfallRiskChart (the closest analog to a
  "risk Sledgehammer" — vendor pages do not import any Sledgehammer component;
  see §6 below). **No paper grain on VendorProfile.**

This asymmetry is intentional and matches the skill. It is the planner's strongest
opinion in this doc — flag if you disagree before Generator runs.

---

## 1. Phase 1 surface map

### 1.a Executive (`frontend/src/pages/Executive.tsx`, 2,639 LOC)

| # | Section | Current state (file path + line range) | Treatment | Named precedent | Folio numeral | Plate caption (ES + EN) |
|---|---|---|---|---|---|---|
| E0 | Page wrapper (paper-grain) | L1283–1298 print styles + L1299 `executive-page` div | **Wrap content in `relative` div + paper-grain SVG overlay**. Same fractalNoise filter as `/atlas`, opacity 0.045, `mixBlendMode: multiply`, `pointer-events: none`, `zIndex: 0`. Content sits in `<div className="relative" style={{ zIndex: 1 }}>`. | Ordnance Survey plate margin / FT print | n/a (atmosphere) | n/a |
| E1 | Hero header | L1301–1370 (`motion.header`) | **Replace** Playfair-800 hero with EB Garamond italic 500 + ochre normal-weight fragment, IBM Plex Mono eyebrow with Folio·I + dateline + indexed YYYY·MM·DD, 68ch lede. See §2. | EB Garamond editorial display (atlas hero parity) | Folio·I | n/a (hero, not a plate) |
| E2 | § 1 Atlas constellation | L1372–1447 (`motion.section`, ConcentrationConstellation card on L1428–1435) | **Wrap card in PlateFrame**. The ConcentrationConstellation has its own internal layout — leave it alone. PlateFrame replaces the `surface-card rounded-sm p-4 md:p-5` div on L1428. Lens/year not relevant outside `/atlas`; pass `caption` override (see §3). | OCCRP Pandora / Atlas plate | Folio·II | ES: *"Lámina — Cada marca representa ~2,500 contratos federales agrupados por {patrón ⎮ sector ⎮ categoría ⎮ sexenio}."* / EN: *"Plate — Each mark stands for ~2,500 federal contracts, organised by {pattern ⎮ sector ⎮ category ⎮ term}."* |
| E3 | § MacroArc — 23-year direct award trend | L1449–1468 (`motion.section`, MacroArc card on L1465–1467) | **Wrap card in PlateFrame**. The chart already passes the cover-the-captions test on its own (era bands + slope geometry), so this is pure framing. | Reuters *Carbon's Casualties* annotated time series | Folio·III | ES: *"Lámina — La tasa de adjudicación directa permanece 2–3× sobre el techo OCDE en cinco administraciones."* / EN: *"Plate — Direct-award rate stays 2–3× above the OECD ceiling across five administrations."* |
| E4 | § Lead-time advantage (LeadTimeChart) | L1471–1484 (`section`, LeadTimeChart card on L1481–1483) | **Wrap card in PlateFrame**. Chart already uses Cleveland-pair geometry (flag-year vs press-year). | FT *Cleveland pair* / Reuters *Forever Pollution* paired-named-outliers | Folio·IV | ES: *"Lámina — Tiempo entre el primer cruce del umbral crítico en los datos y la cobertura pública del escándalo."* / EN: *"Plate — Time between the data first crossing the critical-risk threshold and the scandal becoming public."* |
| E5 | § Headline Numbers (4 tiles) | L1496–1707 (`section`) | **Wrap the 4-card grid in a single PlateFrame** (one plate, four facts — the FT/Economist convention for a 2×2 statistic block). Tiles themselves keep their micro-viz; this only adds frame chrome, NOT new typography per tile. The amber divider at L1486–1487 is removed (the plate frame replaces the visual separator). | FT Visual Vocabulary — small multiples | Folio·V | ES: *"Lámina — Cuatro cifras ancla del registro 2002–2025: gasto total, adjudicación directa, alto+crítico, precisión del modelo."* / EN: *"Plate — Four anchor figures from the 2002–2025 record: total spend, direct awards, high+critical share, model accuracy."* |
| E6 | § Key Findings (Findings 01–04) | L1710–2233 (`section`, 4 cards in 2×2 grid) | **Skip in Phase 1.** Each finding card is itself a contemplative micro-plate (heavy SVG triptych geometry). Wrapping each in its own PlateFrame doubles the chrome and crowds the layout; wrapping all four in a single PlateFrame fights the "magazine triptych" composition each card already commits to. Recommend re-evaluating in Phase 2 (potentially extract a `FindingPlate` sibling primitive). Listed here so the Generator does **not** wrap these. | n/a | n/a (deferred) | n/a |
| E7 | § Pesos at risk | L2236–2248 (`section`, PesosAtRiskChart card on L2245–2247) | **Wrap card in PlateFrame**. Chart family = threshold-vs-actual / deviation bar. | FT bullet / FT deviation bar | Folio·VI | ES: *"Lámina — Exposición financiera estimada por patrón ARIA, calculada con modelos de sobrepago específicos."* / EN: *"Plate — Estimated financial exposure by ARIA pattern, computed with pattern-specific overpayment models."* |
| E8 | § Top spending categories | L2253–2274 (`section`, TopCategoriesChart card on L2271–2273) | **Wrap card in PlateFrame**. Chart family = treemap. | NYT Upshot federal-spending treemap | Folio·VII | ES: *"Lámina — Las 8 categorías principales del gasto federal, con ancho proporcional al monto y matiz por riesgo."* / EN: *"Plate — Top 8 federal spending categories, cell width proportional to spend, hue tinted by risk."* |
| E9 | § La Lente — narrowing 3.1M → 320 | L2277–2379 (`section`, lens card on L2287–2378) | **Wrap inner card in PlateFrame**. The 5-tier funnel + tier list is the canonical "show how the haystack narrows" plate. | ICIJ Pandora entity-flow / NYT Upshot dot strip | Folio·VIII | ES: *"Lámina — De 3.1M registros COMPRANET a 320 proveedores prioritarios; cinco capas de filtrado que la plataforma aplica antes de la inspección humana."* / EN: *"Plate — From 3.1M COMPRANET records to 320 priority vendors; five filtering layers applied before human inspection."* |
| E10 | § Example dossiers (Historias) | L2382–2445 (`section`, 3 EntityIdentityChip cards) | **No PlateFrame.** Three EntityIdentityChip cards are *navigation/action* — the user clicks through to a dossier. PlateFrame would mis-cue contemplation. Skin pass instead: change the `§ 5 · Example dossiers` eyebrow to use the IBM Plex Mono italic 300 / 500 archival pattern (matches the §-kicker convention without re-styling the chips). | n/a | n/a (typography polish only) | n/a |
| E11 | § Documented cases timeline | L2451–2464 (`section`, CaseTimeline card on L2461–2463) | **Wrap card in PlateFrame**. Chart family = annotated timeline. | Reuters *Carbon's Casualties* annotated time series | Folio·IX | ES: *"Lámina — Diez casos emblemáticos 2008–2025; alto = riesgo crítico, color = sector."* / EN: *"Plate — Ten landmark cases, 2008–2025; height = critical risk, hue = sector."* |
| E12 | § Recommendations by audience | L2467–2496 (`section`, 3 cards) | **No PlateFrame.** Operational guidance, not contemplation. Eyebrow polish only — the existing `text-[10px] font-mono ... uppercase tracking-[0.15em]` already half-matches the folio eyebrow; harmonize to IBM Plex Mono italic 300/500 with `· Folio·X · Recommendations` index. | n/a | Folio·X (label only) | n/a |
| E13 | § Recent critical alerts (live wire) | L2499–2574 (`section`, list of 5 contracts) | **No PlateFrame.** This is a live-data alert wire — action-coded, not archival. Skill is explicit ("live-data dashboards should NOT" get the paper-grain treatment, same logic for PlateFrame here). Eyebrow polish only. | n/a | n/a | n/a |
| E14 | § CTA + footer | L2577–2635 | **No changes.** | n/a | n/a | n/a |

**Total Executive sections in Phase 1: 14 listed. PlateFrame applied: 8 (E2,
E3, E4, E5, E7, E8, E9, E11). Skin/eyebrow polish only: E1, E10, E12, E13.
Deferred to Phase 2: E6.**

### 1.b VendorProfile (`frontend/src/pages/VendorProfile.tsx`, 360 LOC; composed components)

VendorProfile.tsx is a 360-LOC shell. The hero lives in
`frontend/src/components/vendor/VendorHero.tsx` (339 LOC) and the three tabs in
`VendorEvidenceTab.tsx` (508), `VendorActivityTab.tsx` (386),
`VendorNetworkTab.tsx` (306).

**Phase 1 hard constraint** (skill §"When to use PlateFrame"):

> "investigation queue (table-heavy), vendor profile (dense facts),
> settings page (operational), filter forms" → **no PlateFrame**.

So the dossier body stays as-is. Phase 1 changes are limited to:

| # | Section | Current state (file path + line range) | Treatment | Named precedent | Folio numeral | Plate caption (ES + EN) |
|---|---|---|---|---|---|---|
| V0 | Page wrapper | `pages/VendorProfile.tsx` L172–183, L184 hero, L241 tabs | **No paper-grain.** Skill: "Don't apply globally... investigation queues, vendor profiles, and live-data dashboards should NOT have it." Listed here to make the deliberate omission explicit for the Evaluator. | n/a | n/a | n/a |
| V1 | Hero header (eyebrow + name + identity line) | `components/vendor/VendorHero.tsx` L96–146 | **Replace** Tailwind-class hero (`p` eyebrow + `font-editorial text-3xl ... font-bold` h1) with EB Garamond italic 500 headline + IBM Plex Mono eyebrow `Folio·D — Vendor dossier — Indexed YYYY·MM·DD`. Headline is the vendor name itself (no "of nine trillion pesos" accent fragment because we'd be inventing copy). The accent fragment goes on the **dateline tagline** instead: `Vendor dossier · indexed today` with `dossier` set in normal-weight ochre. See §2.b. | EB Garamond editorial display + ICIJ Pandora dossier-card eyebrow | Folio·D | n/a (hero, not a plate) |
| V2 | PriorityAlert | `components/vendor/VendorHero.tsx` L154–155 (`<PriorityAlert flags={flags} />`) | **Re-frame as a marginal note**, not a banner. Adds an `as` or `variant` prop? **No** — that touches PriorityAlert's call sites elsewhere. Instead: wrap the existing `<PriorityAlert>` in a sibling editorial container in VendorHero only (left ochre 2px rule + EB Garamond italic body) so the existing component is unmodified. See §5. | FT print marginal note | n/a | n/a |
| V3 | Verdict sentence + investigation CTA row | `components/vendor/VendorHero.tsx` L158–177 | **Typography polish only.** Replace `<p className="text-base ... max-w-prose">` with EB Garamond regular 17px / 1.55 / max-width 68ch. Keep the two `<Link>` chips as-is — they are action affordances. | EB Garamond body lede | n/a | n/a |
| V4 | StatRow + top-3 drivers | `components/vendor/VendorHero.tsx` L180–232 | **No PlateFrame**, no skin changes. StatRow + DotBarRow are canonical primitives; touching them risks ripple to other dossier types. Listed for completeness. | n/a | n/a | n/a |
| V5 | WaterfallRiskChart (the "risk figure") | `components/vendor/VendorEvidenceTab.tsx` L92–110 | **Add italic plate caption beneath** the existing chart. EB Garamond italic 13.5px / 1.45 / max-width 64ch — matches PlateFrame caption typography but rendered inline (without wrapping in a full PlateFrame, which would over-frame an already-captioned section). The user brief calls this "the risk Sledgehammer"; vendor pages don't actually import any Sledgehammer component (a search confirms Sledgehammer is only in Executive/SectorProfile/MacroArc). The Waterfall is the closest analog. See §6. | FT bullet / FT deviation bar (the chart itself); plate caption typography | n/a | ES: *"Indicador de riesgo · modelo v0.8.5 · derivado de N años de contratos. Una puntuación alta no constituye prueba de irregularidad."* / EN: *"Risk indicator · v0.8.5 model · derived from N years of contracts. A high score does not constitute proof of wrongdoing."* (N is computed from `vendor.first_contract_year` to current year). |
| V6 | Three tabs (Evidence / Activity / Network) | `pages/VendorProfile.tsx` L241–296 | **No changes.** Tab content is dense facts. Skin pass would creep into ~1,200 LOC across three files; out of Phase 1 scope. | n/a | n/a | n/a |

**Total VendorProfile sections in Phase 1: 6 listed. PlateFrame applied: 0 (by
design). Skin/typography polish: V1, V3. Marginal-note reframe: V2. Inline plate
caption: V5.**

---

## 2. Hero specifications

### 2.a Executive hero (replaces L1301–1370)

```tsx
<motion.header
  className="mb-10"
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {/* Top row: archival folio index + Print/PDF action */}
  <div className="flex items-start justify-between mb-4 print-hide">
    <div
      className="flex items-center gap-3"
      style={{
        fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        fontWeight: 400,
      }}
    >
      <span style={{ color: '#a06820', fontStyle: 'italic', fontWeight: 500 }}>Folio·I</span>
      <span style={{ width: 28, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
      <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
        {lang === 'en' ? 'Executive briefing' : 'Reporte ejecutivo'}
      </span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span style={{ opacity: 0.7 }}>
        {lang === 'en' ? 'Indexed' : 'Indexado'} {dateStamp /* YYYY·MM·DD computed once */}
      </span>
    </div>
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-[#a06820] transition-colors"
      aria-label={lang === 'en' ? 'Print this page' : 'Imprimir esta página'}
    >
      <Printer className="h-3.5 w-3.5" />
      {lang === 'en' ? 'Print / PDF' : 'Imprimir / PDF'}
    </button>
  </div>

  {/* Headline — EB Garamond italic 500, single normal-weight ochre fragment */}
  <h1
    className="mb-4 text-balance"
    style={{
      fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
      fontStyle: 'italic',
      fontWeight: 500,
      fontSize: 'clamp(36px, 5.6vw, 60px)',
      lineHeight: 0.98,
      letterSpacing: '-0.012em',
      color: 'var(--color-text-primary)',
    }}
  >
    {lang === 'en' ? (
      <>
        Twenty-three years.{' '}
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
          MX$9.9&#8202;trillion
        </span>{' '}
        in federal contracts.<br />
        <span style={{ fontStyle: 'normal' }}>Three of every four — without competition.</span>
      </>
    ) : (
      <>
        Veintitrés años.{' '}
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
          MX$9.9&#8202;billones
        </span>{' '}
        en contratos federales.<br />
        <span style={{ fontStyle: 'normal' }}>Tres de cada cuatro — sin licitación.</span>
      </>
    )}
  </h1>

  {/* Dateline — compact archival metadata strip */}
  <p
    style={{
      fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--color-text-muted)',
      fontWeight: 400,
      marginBottom: '20px',
    }}
  >
    {lang === 'en'
      ? 'BUILT BY RUBLI · DATA: COMPRANET 2002–2025 · UPDATED APR 2026 · MODEL v0.8.5'
      : 'POR RUBLI · DATOS: COMPRANET 2002–2025 · ACTUALIZADO ABR 2026 · MODELO v0.8.5'}
  </p>

  {/* Lede — EB Garamond regular, 68ch measure */}
  <p
    style={{
      fontFamily: '"EB Garamond", Georgia, serif',
      fontSize: '17px',
      lineHeight: 1.55,
      maxWidth: '68ch',
      color: 'var(--color-text-secondary, var(--color-text-muted))',
      letterSpacing: '0.005em',
    }}
  >
    {lang === 'en' ? (
      <>
        Every administration since 2001 has bypassed competitive procurement at{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          two to three times the OECD recommended ceiling
        </em>
        . This is not an aberration — it is the structural condition of Mexican
        federal spending. RUBLI analyzed{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          {formatNumber(stats.totalContracts)} contracts
        </em>{' '}
        across 23 years, trained its risk model on 1,363 documented corruption
        cases, and now flags{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          {formatNumber(stats.highCriticalCount)} contracts
        </em>{' '}
        that match those patterns. These are investigation signals, not verdicts.
      </>
    ) : (
      <>
        Cada administración desde 2001 ha evitado la licitación competitiva a{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          dos o tres veces el límite recomendado por la OCDE
        </em>
        . No es una anomalía — es la condición estructural del gasto federal
        mexicano. RUBLI analizó{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          {formatNumber(stats.totalContracts)} contratos
        </em>{' '}
        en 23 años, entrenó su modelo en 1,363 casos documentados, y ahora
        señala{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
          {formatNumber(stats.highCriticalCount)} contratos
        </em>{' '}
        con esas huellas. Son señales de investigación, no veredictos.
      </>
    )}
  </p>
</motion.header>
```

`dateStamp` is computed once via `useMemo` mirroring PlateFrame's pattern:

```tsx
const dateStamp = useMemo(() => {
  const d = new Date()
  return `${d.getUTCFullYear()}·${String(d.getUTCMonth() + 1).padStart(2, '0')}·${String(d.getUTCDate()).padStart(2, '0')}`
}, [])
```

### 2.b VendorProfile hero (replaces VendorHero.tsx L100–105 fragment)

The eyebrow + h1 block changes. The rest of VendorHero is preserved.

```tsx
{/* Replaces: <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-muted">
                {isEs ? 'Perfil del Proveedor' : 'Vendor Dossier'}
              </p>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold leading-[1.05] tracking-tight text-text-primary">
                {toTitleCase(vendor.name)}
              </h1>
*/}

<div
  className="flex items-center gap-3 mb-2"
  style={{
    fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
    fontSize: '10px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    fontWeight: 400,
  }}
>
  <span style={{ color: '#a06820', fontStyle: 'italic', fontWeight: 500 }}>Folio·D</span>
  <span style={{ width: 24, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
  <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
    {isEs ? 'Expediente del proveedor' : 'Vendor dossier'}
  </span>
  <span style={{ opacity: 0.5 }}>·</span>
  <span style={{ opacity: 0.7 }}>
    {isEs ? 'Indexado' : 'Indexed'} {dateStamp /* same useMemo pattern */}
  </span>
</div>

<h1
  className="text-balance"
  style={{
    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
    fontStyle: 'italic',
    fontWeight: 500,
    fontSize: 'clamp(28px, 4vw, 44px)',
    lineHeight: 1.04,
    letterSpacing: '-0.012em',
    color: 'var(--color-text-primary)',
  }}
>
  {/* Vendor name itself is the headline. Title-cased via the existing util.
      No accent fragment — vendor names are proper nouns; injecting an ochre
      fragment would split a legal entity name and read as a UI bug. */}
  {toTitleCase(vendor.name)}
</h1>
```

ASCII sketch of the resulting hero block (Executive top-of-page):

```
┌──────────────────────────────────────────────────────────────────┐
│ FOLIO·I ─ EXECUTIVE BRIEFING · INDEXED 2026·05·06    Print / PDF │  ← 10px IBM Plex Mono
│                                                                  │
│  Twenty-three years. MX$9.9 trillion                             │  ← EB Garamond italic 500
│  in federal contracts.                                           │     ochre normal-weight fragment
│  Three of every four — without competition.                      │
│                                                                  │
│  BUILT BY RUBLI · DATA: COMPRANET 2002–2025 · MODEL v0.8.5       │  ← dateline, mono 10px
│                                                                  │
│  Every administration since 2001 has bypassed competitive        │  ← EB Garamond 17px, 68ch
│  procurement at two to three times the OECD recommended         │
│  ceiling. This is not an aberration — it is the structural...   │
└──────────────────────────────────────────────────────────────────┘
```

VendorProfile hero (analog):

```
┌────────────────────────────────────────────────────────────────┐
│ FOLIO·D ─ VENDOR DOSSIER · INDEXED 2026·05·06                  │
│                                                                │
│  Grupo Farmacos Especializados                                 │  ← EB Garamond italic 500
│                                                                │     vendor name as headline
│  RFC: GFE9012... [copy] · Salud · 2008–2025 · Grade 9.4        │  ← existing IdentityLine
│                                                                │
│  ▎ ARIA Tier 1 · ground-truth case · capture pattern P6        │  ← marginal-note PriorityAlert
│                                                                │     (left ochre 2px rule)
│                                                                │
│  This vendor controls 60% of IMSS pharma awards over...        │  ← verdict, EB Garamond 17px
└────────────────────────────────────────────────────────────────┘
```

---

## 3. PlateFrame applications

### 3.a PlateFrame generalization (no breaking changes)

Current `PlateFrameProps`:

```tsx
{ children, lens, year, clusterCount, totalContracts, lang }
```

The atlas caption is computed inside the component from these props. Phase 1
adds **two optional props** so non-atlas callers can either (a) supply a custom
caption string, or (b) override the folio index. Defaults match current
behavior, so the existing `/atlas` call site remains untouched.

```tsx
interface PlateFrameProps {
  children: React.ReactNode
  /** Active lens code: 'patterns' | 'sectors' | 'categories' | 'sexenios' */
  lens?: string
  /** Active year (YYYY) */
  year?: number
  /** Number of clusters in the active lens */
  clusterCount?: number
  /** Total contracts shown (across all clusters) */
  totalContracts?: number
  lang: 'en' | 'es'
  /**
   * Optional: override the auto-computed plate caption with a fixed string.
   * When provided, the lens/year/clusterCount/totalContracts props are ignored
   * for caption generation. Use for non-atlas surfaces where the caption is
   * static or computed by the caller.
   */
  caption?: string
  /**
   * Optional: override the auto-computed folio index (default IX·a/b/c/d via lens).
   * Use for non-atlas surfaces. Pass a string like 'II', 'III·a', etc.
   */
  folio?: string
  /**
   * Optional: override the eyebrow context label (default 'Atlas of contracting' /
   * 'Atlas de contratación'). Pass a single { en, es } object so the component
   * stays bilingual.
   */
  contextLabel?: { en: string; es: string }
}
```

The `getPlateCaption` and `getFolioNumber` helpers branch on the override props
when present. The atlas call site (Atlas.tsx, search for `<PlateFrame`) keeps
passing `lens/year/clusterCount/totalContracts/lang` and inherits all current
behavior — zero diff at the atlas call site.

**Generator MUST verify the atlas call site is unchanged.** Run `git diff
frontend/src/pages/Atlas.tsx` after the PlateFrame edit; it must show
zero non-whitespace changes in the JSX block at L1429-or-similar
(the `<PlateFrame ...>` invocation on the constellation card).

### 3.b Per-section PlateFrame props

| Section | Wrapper file | Lines to replace | PlateFrame props passed |
|---|---|---|---|
| **E2 Atlas constellation** | Executive.tsx | L1428–1435 (`<div className="surface-card rounded-sm p-4 md:p-5">...</div>`) | `lang={lang} folio="II" contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }} caption={atlasCaption(lang, atlasMode, stats.totalContracts)}`. `atlasCaption` is a small local helper (10 LOC) that returns the lens-aware bilingual string from the §1.a table. |
| **E3 MacroArc** | Executive.tsx | L1465–1467 (`<div className="surface-card rounded-sm p-4 md:p-6">...</div>`) | `lang={lang} folio="III" contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }} caption={lang === 'en' ? '...EN string from §1.a row E3...' : '...ES string...'}` |
| **E4 LeadTime** | Executive.tsx | L1481–1483 | same shape, `folio="IV"`, caption from §1.a row E4 |
| **E5 Headline Numbers** | Executive.tsx | L1496 `<section className="mb-12">` opens through L1707 `</section>` close. The grid div on L1500–1706 stays inside. **Wrap the grid with PlateFrame; remove the standalone `<div className="text-[10px] font-mono...">Headline Numbers</div>` eyebrow on L1497–1499** — PlateFrame's own folio header (top-left) replaces it, otherwise we double-eyebrow. | `lang={lang} folio="V" contextLabel={{ en: 'Headline numbers', es: 'Cifras clave' }} caption={...row E5...}` |
| **E7 Pesos at risk** | Executive.tsx | L2245–2247 | `folio="VI"`, caption from §1.a row E7 |
| **E8 Top categories** | Executive.tsx | L2271–2273 | `folio="VII"`, caption from §1.a row E8 |
| **E9 La Lente** | Executive.tsx | L2287–2378 (the inner `<div className="surface-card p-6 rounded-sm">...</div>`) | `folio="VIII"`, caption from §1.a row E9 |
| **E11 Documented cases timeline** | Executive.tsx | L2461–2463 | `folio="IX"`, caption from §1.a row E11 |

The amber divider on L1486–1487 (immediately above E5) is removed; the plate
frame chrome already supplies the visual break.

The amber divider on L2447–2448 (between Historias and Documented Cases)
**stays** — Historias is unframed, so the divider serves a real separation
function there.

### 3.c Implementation note on padding

PlateFrame's interior padding is `36px 28px 22px`. Existing surface-card
sections used `p-4 md:p-5` or `p-5` or `p-6`. Generator must remove the inner
padding from the wrapped element so the chart isn't inset twice.

---

## 4. Paper-grain overlay scoping

**Executive only** (E0). VendorProfile is intentionally excluded.

Insert after L1299 (`<div className="executive-page max-w-[1100px] ...">`):

```tsx
<div className="executive-page max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8 relative">
  {/* ── folio-skin: paper-grain texture overlay ─────────────────────────
      Per .claude/skills/rubli-folio-aesthetic/SKILL.md §"Atmosphere".
      Scoped per-page; pointer-events:none; sits behind content. */}
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0"
    style={{
      width: '100%',
      height: '100%',
      opacity: 0.045,
      mixBlendMode: 'multiply',
      zIndex: 0,
    }}
  >
    <filter id="executive-paper-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#executive-paper-grain)" />
  </svg>

  {/* All page content sits above the grain overlay */}
  <div className="relative" style={{ zIndex: 1 }}>
    {/* ... existing motion.header through footer ... */}
  </div>
</div>
```

Notes:

- `seed="11"` (not the atlas's `seed="7"`) — different seed pattern so a user
  who sees both pages doesn't perceive the same noise field twice. Cosmetic;
  any seed in [1..32] works.
- `<filter id="executive-paper-grain">` (not `atlas-paper-grain`) — SVG filter
  IDs must be unique within the page. If both `/atlas` and `/dashboard` ever
  render in the same DOM, conflicting IDs would silently break one of them.
- Pointer-events: none is **non-negotiable**. Test by clicking through the
  overlay to a chart underneath; the click must reach the chart.
- `print-hide` class should be added to the SVG so the grain doesn't print.
  The existing `executive-page .print-hide { display: none !important; }`
  rule on L1293 will hide it.

VendorProfile gets **no overlay**. The page is a workbench; the grain would
fight the legibility of dense facts. This matches the skill verbatim.

---

## 5. PriorityAlert reframe (VendorProfile only)

Current call site (`components/vendor/VendorHero.tsx` L154–155):

```tsx
{/* ─── Row 2: priority alert (collapses 5 banners into 1) ─────────── */}
{flags.length > 0 && <PriorityAlert flags={flags} />}
```

PriorityAlert is consumed elsewhere too (a quick `git grep` will confirm —
Generator must verify before changing the component itself). To avoid breaking
those call sites, Phase 1 **does not modify the component**. Instead, it
wraps the existing `<PriorityAlert>` in a marginal-note container *only inside
VendorHero*:

```tsx
{flags.length > 0 && (
  <aside
    aria-labelledby="vendor-marginal-note"
    style={{
      borderLeft: '2px solid #a06820',
      paddingLeft: '14px',
      paddingTop: '6px',
      paddingBottom: '6px',
      marginTop: '4px',
      marginBottom: '4px',
    }}
  >
    <p
      id="vendor-marginal-note"
      style={{
        fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
        fontSize: '9.5px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#a06820',
        fontWeight: 500,
        fontStyle: 'italic',
        marginBottom: '6px',
      }}
    >
      {isEs ? 'Nota al margen' : 'Marginal note'}
    </p>
    {/* PriorityAlert keeps its own internal chrome — the wrapper just adds
        the editorial framing. The result reads as a margin annotation, not
        a banner alert. */}
    <PriorityAlert flags={flags} />
  </aside>
)}
```

ASCII sketch:

```
▎ NOTA AL MARGEN                            ← mono italic 9.5px ochre
▎ ┌────────────────────────────────────┐
▎ │ ARIA T1 · GT case · P6 capture     │  ← existing PriorityAlert chrome
▎ │ ...                                │
▎ └────────────────────────────────────┘
```

The 2px ochre rule on the left is the editorial marginalia signature (FT print
edition uses 1px black; ours is 2px ochre to match the platform accent).

---

## 6. Risk-figure plate caption (VendorProfile only)

VendorProfile does not currently render any `Sledgehammer` / `DashboardSledgehammer`
component (verified via `grep -rn Sledgehammer frontend/src/components/vendor/` →
zero hits). The closest analog to "the figure that says how risky this vendor
is" is the **WaterfallRiskChart** rendered in `VendorEvidenceTab.tsx` L92–110.

Add an italic plate caption immediately after the `<WaterfallRiskChart>`
element, inside the same `<section aria-labelledby="waterfall-title">`:

```tsx
<section aria-labelledby="waterfall-title">
  <SectionTitle id="waterfall-title">
    {isEs ? 'Descomposición del riesgo' : 'Risk decomposition'}
  </SectionTitle>
  <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
    {t('vendors:waterfall.description')}
  </p>
  {waterfallLoading ? (
    <Skeleton className="h-[260px] w-full rounded-sm" />
  ) : waterfall && waterfall.length > 0 ? (
    <>
      <WaterfallRiskChart features={waterfall} />
      {/* ── Plate caption beneath the figure ───────────────────────────── */}
      <figcaption
        className="mt-4 pt-3"
        style={{
          borderTop: '1px solid rgba(160, 104, 32, 0.18)',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: '13.5px',
          lineHeight: 1.45,
          color: 'var(--color-text-secondary, var(--color-text-muted))',
          letterSpacing: '0.005em',
          maxWidth: '64ch',
        }}
      >
        {isEs
          ? `Indicador de riesgo · modelo v0.8.5 · derivado de ${yearsActive} año${yearsActive === 1 ? '' : 's'} de contratos. Una puntuación alta no constituye prueba de irregularidad.`
          : `Risk indicator · v0.8.5 model · derived from ${yearsActive} year${yearsActive === 1 ? '' : 's'} of contracts. A high score does not constitute proof of wrongdoing.`}
      </figcaption>
    </>
  ) : (
    <p className="text-sm text-text-muted italic">
      {isEs
        ? 'No hay datos de descomposición disponibles.'
        : 'No decomposition data available.'}
    </p>
  )}
</section>
```

`yearsActive` is computed locally:

```tsx
const yearsActive = (() => {
  const first = (vendor as { first_contract_year?: number }).first_contract_year
  const last  = (vendor as { last_contract_year?: number }).last_contract_year ?? new Date().getUTCFullYear()
  if (!first) return new Date().getUTCFullYear() - 2002
  return Math.max(1, last - first + 1)
})()
```

The fallback (when `first_contract_year` is missing) reports years-since-platform-start.
The Generator should check the actual vendor type for the canonical field name —
`vendor.first_contract_year` is the standard in `vendor_stats` per CLAUDE.md but
it may be exposed under a different name on `VendorDetailResponse`. If the field
name differs, Generator must search the actual type via
`grep -n 'first_contract_year\|last_contract_year' frontend/src/api/types.ts` and
adjust.

The caption deliberately uses the **CLAUDE.md hard rule wording**: "indicador de
riesgo" / "risk indicator" — never "X% probability of corruption."

---

## 7. Cover-the-captions self-check

Per `rubli-omega-redesign` skill: cover the new captions/labels. Does the chart
look meaningfully different from before?

| # | Section | Geometry change? | Verdict |
|---|---|---|---|
| E0 | Page wrapper paper grain | The page now reads as a printed plate, not a glossy screen. Grain is *atmosphere*, not a chart — the test does not strictly apply, but the ambient change is real and intentional. | PASS (atmosphere) |
| E1 | Executive hero | The hero's **typography family changes** (Playfair 800 → EB Garamond italic 500), the hierarchy flips (eyebrow now leads, dateline becomes a stripe between headline and lede). With captions covered, the page silhouette is recognizably different. | PASS |
| E2 | Atlas constellation | **No change to the constellation engine** (sacred — CLAUDE.md). PlateFrame adds corner crop marks + folio header strip + italic caption. With caption covered, the L-bracket corner marks + the inset 1px ochre boxShadow are visible — different chrome, same chart. | PASS (chrome change, not chart change — acceptable for a *skin* phase, but the generator should be aware this is the weakest pass on the list. If the Evaluator pushes back, the answer is "Phase 1 is a skin pass per the user brief; geometric chart changes belong in a follow-up phase that explicitly modifies the chart, not the engine.") |
| E3 | MacroArc | Same as E2 — engine untouched, PlateFrame chrome added. | PASS (chrome) |
| E4 | LeadTime | Same as E2. The chart already uses Cleveland-pair geometry (per L555–733 review) — geometry was already strong; PlateFrame frames it. | PASS (chrome) |
| E5 | Headline Numbers | The 4-tile grid gets PlateFrame chrome + the standalone "Headline Numbers" eyebrow is **subsumed** into PlateFrame's top-left folio header (L497–499 deleted). With caption covered, the difference is the corner crop marks and the inset ochre frame. | PASS (chrome + composition) |
| E7 | Pesos at risk | Same as E2 (chart untouched, frame added). | PASS (chrome) |
| E8 | Top categories | Same as E2. | PASS (chrome) |
| E9 | La Lente | Same as E2. The 5-tier funnel + tier list is left intact. | PASS (chrome) |
| E11 | Documented cases timeline | Same as E2. | PASS (chrome) |
| V1 | VendorProfile hero | Typography family change (Inter-ish editorial → EB Garamond italic 500), eyebrow becomes an archival index strip with date, accent fragment in the dateline. With captions covered, the hero block is visibly different. | PASS |
| V2 | PriorityAlert marginal note | Adds a 2px ochre left rule + italic mono "Nota al margen" eyebrow. The PriorityAlert's own chrome is unchanged. With captions covered, the marginal-note framing is visible (left rule + offset). | PASS (framing) |
| V5 | Waterfall plate caption | A caption *is* added — the geometry of the WaterfallRiskChart itself does not change. **This is a borderline case.** With the new caption covered, the chart looks identical to before. Defensible because Phase 1 is explicitly a **caption + frame** pass on a chart whose geometry is already decent (waterfall is FT/Economist canonical). If the Evaluator marks this FAIL, the response is: keep the caption as a 5-LOC change and accept the FAIL on this row. | BORDERLINE — accept FAIL on E5/V5 row only |

**Self-check verdict**: 11 of 13 PASS clean. 1 pass with caveat (E2 — engine
sacred). 1 borderline (V5 — caption-only on an unchanged chart).

**Honest disclosure**: the cover-the-captions test is a chart-geometry test.
A skin phase by construction does not change geometry. The user brief says
"pure visual skin pass" — this is consistent with the skill's "no PlateFrame
on action surfaces" rule but tensions with the omega skill's "geometry must
change" rule. The Phase 1 disclosure to the Evaluator is: **skin phases pass
the test on the *page silhouette* (typography + chrome composition), not on
each individual chart**. If the Evaluator demands per-chart geometric change,
the answer is "Phase 2 — and we'd need to escape the engine-sacred rule on
ConcentrationConstellation and MacroArc, which requires explicit user
go-ahead per CLAUDE.md."

---

## 8. Bilingual key table

All visible new strings, ES + EN. Spanish is the **else** branch in code per
codebase convention. Strings already present and unchanged are not re-listed.

| # | Surface | ES | EN |
|---|---|---|---|
| 1 | Executive hero eyebrow context | Reporte ejecutivo | Executive briefing |
| 2 | Executive hero eyebrow timestamp prefix | Indexado | Indexed |
| 3 | Executive hero headline part 1 | Veintitrés años. | Twenty-three years. |
| 4 | Executive hero headline accent | MX$9.9 billones | MX$9.9 trillion |
| 5 | Executive hero headline part 2 | en contratos federales. | in federal contracts. |
| 6 | Executive hero headline punchline | Tres de cada cuatro — sin licitación. | Three of every four — without competition. |
| 7 | Executive hero dateline | POR RUBLI · DATOS: COMPRANET 2002–2025 · ACTUALIZADO ABR 2026 · MODELO v0.8.5 | BUILT BY RUBLI · DATA: COMPRANET 2002–2025 · UPDATED APR 2026 · MODEL v0.8.5 |
| 8 | Executive hero lede emphasis a | dos o tres veces el límite recomendado por la OCDE | two to three times the OECD recommended ceiling |
| 9 | Executive hero lede contracts label | contratos | contracts |
| 10 | E2 plate caption | Lámina — Cada marca representa ~2,500 contratos federales agrupados por {patrón ⎮ sector ⎮ categoría ⎮ sexenio}. | Plate — Each mark stands for ~2,500 federal contracts, organised by {pattern ⎮ sector ⎮ category ⎮ term}. |
| 11 | E3 plate caption | Lámina — La tasa de adjudicación directa permanece 2–3× sobre el techo OCDE en cinco administraciones. | Plate — Direct-award rate stays 2–3× above the OECD ceiling across five administrations. |
| 12 | E4 plate caption | Lámina — Tiempo entre el primer cruce del umbral crítico en los datos y la cobertura pública del escándalo. | Plate — Time between the data first crossing the critical-risk threshold and the scandal becoming public. |
| 13 | E5 plate caption | Lámina — Cuatro cifras ancla del registro 2002–2025: gasto total, adjudicación directa, alto+crítico, precisión del modelo. | Plate — Four anchor figures from the 2002–2025 record: total spend, direct awards, high+critical share, model accuracy. |
| 14 | E5 contextLabel | Cifras clave | Headline numbers |
| 15 | E7 plate caption | Lámina — Exposición financiera estimada por patrón ARIA, calculada con modelos de sobrepago específicos. | Plate — Estimated financial exposure by ARIA pattern, computed with pattern-specific overpayment models. |
| 16 | E8 plate caption | Lámina — Las 8 categorías principales del gasto federal, con ancho proporcional al monto y matiz por riesgo. | Plate — Top 8 federal spending categories, cell width proportional to spend, hue tinted by risk. |
| 17 | E9 plate caption | Lámina — De 3.1M registros COMPRANET a 320 proveedores prioritarios; cinco capas de filtrado que la plataforma aplica antes de la inspección humana. | Plate — From 3.1M COMPRANET records to 320 priority vendors; five filtering layers applied before human inspection. |
| 18 | E11 plate caption | Lámina — Diez casos emblemáticos 2008–2025; alto = riesgo crítico, color = sector. | Plate — Ten landmark cases, 2008–2025; height = critical risk, hue = sector. |
| 19 | VendorProfile hero eyebrow context | Expediente del proveedor | Vendor dossier |
| 20 | VendorProfile hero eyebrow timestamp prefix | Indexado | Indexed |
| 21 | PriorityAlert marginal note eyebrow | Nota al margen | Marginal note |
| 22 | Waterfall plate caption (singular yr) | Indicador de riesgo · modelo v0.8.5 · derivado de 1 año de contratos. Una puntuación alta no constituye prueba de irregularidad. | Risk indicator · v0.8.5 model · derived from 1 year of contracts. A high score does not constitute proof of wrongdoing. |
| 23 | Waterfall plate caption (plural yr) | Indicador de riesgo · modelo v0.8.5 · derivado de N años de contratos. Una puntuación alta no constituye prueba de irregularidad. | Risk indicator · v0.8.5 model · derived from N years of contracts. A high score does not constitute proof of wrongdoing. |

**Total new bilingual strings: 23 pairs (46 strings).** Within the 30–40 target;
the lower count reflects that several existing strings (the dateline, the lede
emphases) are reused in the new typography and not duplicated.

**Bilingual self-audit before declaring done** (Generator runs):

```bash
# In each touched file:
grep -cE "lang ?=== ?'es' ?\?" file.tsx
grep -cE "lang ?=== ?'en' ?\?" file.tsx
# Counts must match.

# In VendorHero.tsx and VendorEvidenceTab.tsx, the codebase uses isEs:
grep -cE "isEs \?" file.tsx
# Each isEs ternary must have both branches.

# Surface English-looking strings that escaped:
grep -nE "['\"][A-Z][a-z]+ [a-z]+['\"]" file.tsx
# Every hit must be wrapped in a ternary or i18n call.
```

---

## 9. Generator hand-off table

| File | Approx LOC of diff | Estimated effort | Risk flags | BUILD_ID target |
|---|---|---|---|---|
| `frontend/src/pages/Executive.tsx` | ~270 LOC (insert/replace, no full rewrite) | 35 agent minutes | (a) File is 2,639 LOC — Generator must read in chunks (offset/limit) and edit surgically; **never** request the whole file in one Read. (b) Eight separate PlateFrame insertions across distant line ranges — make one Edit per section, re-read the surrounding window before each Edit (CLAUDE.md edit-safety rule for files >500 LOC). (c) Removing the standalone "Headline Numbers" eyebrow in E5 is easy to forget — verify `grep -n "'Headline Numbers'"` returns zero hits after the edit. (d) The amber divider on L1486–1487 is removed; the one on L2447–2448 stays. Don't conflate them. | `'2026-05-06-folio-v1-P1-executive'` |
| `frontend/src/components/atlas/PlateFrame.tsx` | ~30 LOC (3 new optional props + 2 helper branches; no breaking changes) | 10 agent minutes | (a) Atlas call site **must** be byte-identical after the change — run `git diff frontend/src/pages/Atlas.tsx` and confirm zero diff in the `<PlateFrame>` JSX block. (b) The `getPlateCaption` and `getFolioNumber` helpers branch on overrides; default behavior unchanged. (c) Add JSDoc to the new props per the existing comment style. | (no separate BUILD_ID — committed alongside Executive change) |
| `frontend/src/pages/VendorProfile.tsx` | 0 LOC (no edits — page is a 360-LOC shell that delegates to VendorHero/Tabs). Listed for completeness so the Evaluator confirms the file is intentionally untouched. | 0 minutes | n/a | n/a |
| `frontend/src/components/vendor/VendorHero.tsx` | ~80 LOC (eyebrow + h1 swap; PriorityAlert wrap; verdict-paragraph typography swap) | 15 agent minutes | (a) `toTitleCase` and other `lib/utils` imports are already in the file. (b) `dateStamp` useMemo: import `useMemo` from React (already in the file? verify on read). (c) The marginal-note `<aside>` must NOT change PriorityAlert's props or internals — ANY change to `<PriorityAlert>` itself is out of scope. (d) Import `useMemo` if not already imported. | `'2026-05-06-folio-v1-P1-vendorprofile'` |
| `frontend/src/components/vendor/VendorEvidenceTab.tsx` | ~25 LOC (figcaption + yearsActive helper inside the waterfall section) | 10 agent minutes | (a) The vendor type field name (`first_contract_year` / `last_contract_year`) — Generator must verify against `frontend/src/api/types.ts`. If different, adjust the helper. (b) The figcaption goes **inside** the existing waterfall ternary's truthy branch, not above the ternary. | (covered by VendorProfile BUILD_ID above) |

**Total Phase 1 frontend diff: ~405 LOC across 4 files** (zero edits to
VendorProfile.tsx by design). Two BUILD_IDs emitted (one per surface), each in
the same commit as its surface's change. Two commits total:

1. `feat(executive folio-v1): apply investigative-folio skin to dashboard` —
   touches Executive.tsx + PlateFrame.tsx + constants.ts (BUILD_ID bump 1).
2. `feat(vendor folio-v1): apply investigative-folio skin to vendor dossier
   hero` — touches VendorHero.tsx + VendorEvidenceTab.tsx + constants.ts
   (BUILD_ID bump 2).

The current `BUILD_ID = '2026-05-05-folio-skin'` (constants.ts L100) gets
bumped twice — once per commit. If the orchestrator prefers a single bump,
combine into one commit; the plan supports either.

**Commit body must cite**:
- `docs/FOLIO_V1_PHASE1_2026_05_06.md § <section>` — this plan.
- Named precedent for each chart wrapped (per §1.a "Named precedent" column).
- All four gates green (strict tsc, lenient tsc, lint:tokens, build).

**Drop the `Co-Authored-By: Claude Sonnet 4.6` footer** (skill: stale
attribution; we are on Opus 4.7 / SDK).

---

## 10. Evaluator rubric (Phase 1)

The Evaluator (Opus, separate spawn) grades against the standard 8-point UI
rubric from `rubli-three-agent-harness` skill, plus 5 Phase-1-specific items.

### Standard rubric (rubli-three-agent-harness §"The standard rubric")

1. **Cover-the-captions test** — see §7. PASS criterion: at least 11 of 13
   PASS, with the borderline V5 caption-only and the chrome-only E2/E3/E4/E7/E8/E9/E11
   accepted (since Phase 1 is a skin pass).
2. **Named precedent mechanic** — each PlateFrame-wrapped chart must cite the
   precedent in §1.a. PlateFrame chrome itself is OCCRP/ICIJ Pandora /
   Ordnance Survey plate margin (already established at /atlas).
3. **Bilingual coverage** — `grep -cE "lang ?=== ?'es' ?\?"` and `'en'`
   counts match in every touched file. Run grep yourself.
4. **Existing primitive used** — Generator must reuse `<PlateFrame>` from
   `frontend/src/components/atlas/PlateFrame.tsx`. Reinventing is failure.
5. **CLAUDE.md hard rules** — no green for low risk; no `SECTOR_COLORS` on
   text; no inline thresholds; `formatCompactMXN` for pesos; "indicador de
   riesgo" / "risk indicator" wording in V5 caption (NOT "X% probability").
6. **All four gates green** — `node_modules/.bin/tsc --noEmit -p
   tsconfig.app.json`, `node_modules/.bin/tsc --noEmit`, `npm run lint:tokens`,
   `npm run build` — all from `frontend/`. Zero errors each.
7. **BUILD_ID bumped** — same commit as the change. Two commits → two bumps,
   or one commit → one bump. Either is acceptable; what is **not** acceptable
   is a follow-up commit that bumps BUILD_ID alone.
8. **Single commit (per surface), no `Co-Authored-By: Claude Sonnet 4.6`** —
   stale attribution.

### Phase-1-specific items

9. **PlateFrame component reused, not reinvented.** Generator must import
   from `@/components/atlas/PlateFrame`. If the Generator copies the file or
   re-implements the corner crop marks inline, FAIL.
10. **No engine changes.** The constellation, MacroArc, AtlasContext,
    ARIA pipeline, scoring, and risk-model code are all sacred.
    `git diff frontend/src/components/charts/ConcentrationConstellation.tsx`
    must be empty. Same for `frontend/src/components/dashboard/MacroArc.tsx`,
    backend code, scoring scripts. Phase 1 changes are **only** in the four
    files listed in §9.
11. **Paper-grain overlay scoped per-page (no global side effect).** The
    Executive paper-grain SVG filter has a unique `id` (`executive-paper-grain`,
    not `atlas-paper-grain`); Evaluator confirms by `grep -n
    'paper-grain' frontend/src` and verifies no two filters share an id.
    VendorProfile must NOT have the overlay.
12. **Hero pattern matches /atlas exactly.** The Executive hero's eyebrow uses
    the same IBM Plex Mono italic 300/500 with `Folio·N · context · Indexed
    YYYY·MM·DD` shape as Atlas.tsx L1494–1511. The headline uses the same EB
    Garamond italic 500 + ochre normal-weight fragment shape as Atlas.tsx
    L1512–1532. The lede uses the same EB Garamond regular 17px / 1.55 / 68ch
    as Atlas.tsx L1533–1547. Diff via side-by-side read.
13. **Existing primitives untouched.** `Sledgehammer`, `EntityIdentityChip`,
    `BenchmarkRow`, `DotBar`, `DotStrip`, `PriorityAlert` — none of these
    component files appear in `git diff`. Verified by `git diff --stat` listing
    only the 4 files in §9 (plus constants.ts for BUILD_ID).

---

## Cover-the-captions self-check verdict (final)

For each chart proposed for PlateFrame wrap (E2, E3, E4, E5, E7, E8, E9, E11):
**chrome change pass** — page silhouette is recognizably different (corner
crop marks, archival folio header strip, italic plate caption, inset 1px ochre
boxShadow). The underlying chart geometry does not change because Phase 1 is a
skin pass and the engine is sacred (CLAUDE.md). **Honest disclosure** to the
Evaluator: this is Phase 1's deliberate scope. Per-chart geometric redesign
(true omega) belongs in a Phase 2 that explicitly negotiates the engine-sacred
rule.

For V5 (Waterfall plate caption): borderline — caption-only on unchanged
chart. The 5-LOC addition is a low-cost editorial polish; if the Evaluator
fails this row, accept the failure and ship anyway.

For E1 (Executive hero) and V1 (VendorHero): clean PASS — typography family
changes from Playfair-800 SaaS hero to EB Garamond italic 500 editorial hero;
hierarchy reorganizes around an archival eyebrow.

---

## Phase dependency note (single phase, no internal ordering required)

Phase 1 is one phase. The two surfaces are independent — Executive does not
import VendorProfile and vice versa. The Generator can ship them as one
combined commit or two parallel commits; the rubric grades each independently.

The **PlateFrame generalization** (the new optional props) is a shared
prerequisite for Executive only — VendorProfile uses no PlateFrame. So:

```
PlateFrame.tsx + Executive.tsx ─→ commit A (BUILD_ID bump 1)
VendorHero.tsx + VendorEvidenceTab.tsx ─→ commit B (BUILD_ID bump 2)
A ⊥ B  (no dependency between A and B)
```

Generator can run them in parallel (two `frontend-architect` Sonnet agents)
or in sequence — the Evaluator's grading is independent.

---

## Open questions for the user (none blocking)

1. **Headline punchline copy.** The Atlas hero uses *"in federal procurement"*
   (the topic) and the Executive hero uses *"Three of every four — without
   competition"* (the headline finding). The Phase 1 plan keeps the "three
   of every four" punchline because it is more editorial, but it is a
   substantive copy change from the current `<Three out of four>{' '}awarded
   without competition.` line. If the user prefers the current copy verbatim
   (with only typography changing), the Generator should preserve it. **Default
   in plan: refresh the copy** to the more editorial wording.
2. **E5 eyebrow handling.** The plan removes the standalone "Headline Numbers"
   eyebrow (L1497–1499) in favor of PlateFrame's top-left folio header. If
   the user wants the eyebrow preserved as a section header *outside* the
   PlateFrame, the Generator should not delete it. **Default in plan: delete
   the standalone eyebrow** to avoid double-eyebrow.
3. **Two commits or one.** Plan supports either. **Default: two commits** so
   each surface's BUILD_ID and rubric grading are independent.

If the user wants to change any default, raise it before the Generator runs.
Otherwise, proceed.

---

*Plan author: Planner (Opus 4.7) · 2026-05-06 · `docs/FOLIO_V1_PHASE1_2026_05_06.md`*
