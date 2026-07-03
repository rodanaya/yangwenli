/**
 * films.ts — La Galería beat scripts for the canvas StoryFilm engine (2026-06-27).
 *
 * Inspired by the model-governance gold standard: one engine renders a film by
 * walking a beat script, while a persistent particle system (the contracts)
 * morphs between each beat's visualization. Data-driven so every story is a
 * film; El Apagón (el-vacio) is the first — 11 beats, one motion each.
 *
 * Cinematic colours live here on purpose — lib/ is outside the token-lint scope,
 * so the engine component (StoryFilm.tsx) stays free of raw hex and reads the
 * palette from the film def instead.
 */

export type FilmMode =
  | 'field'
  | 'dissolve'
  | 'portal'
  | 'decode'
  | 'reassemble'
  | 'split'
  | 'benchmark'
  | 'redact'
  | 'valuescan'
  | 'spotlight'
  | 'gauge'
  | 'categorygrid'
  | 'modelnet'
  | 'network'
  | 'torch'
  | 'mark'
  | 'ribbon'
  | 'ribbontear'
  | 'titlecard'
  // El Registro (2026-07-02) — results-forward presentation film.
  | 'torrent'
  | 'strata'
  | 'ghosts'
  | 'monopoly'
  | 'lattice'
  | 'mass'

export interface FilmStat {
  format: 'int' | 'pct' | 'currencyB' | 'currencyT' | 'text'
  target?: number
  text?: string
  prefix?: string
  suffix?: string
  /** force the accusing red (e.g. the diverted total, the blackout date). */
  red?: boolean
  /** count-up duration override (ms); defaults to 2200. */
  countMs?: number
  /** peso amount → engine renders a computed ≈US$ sub-line via formatCompactUSD (dual currency). */
  mxn?: number
  label: { en: string; es: string }
}

/**
 * Where the stat sits (Intro redesign, 2026-07-03). Kills the "everything piled
 * dead-center" overlap: each beat picks ONE slot and consecutive beats vary.
 * 'hero' (center sledgehammer, ≤3/film) · 'rail-left'/'rail-right' (side rail) ·
 * 'stamp' (rotated archival corner, for dates/case names) · 'none' (scene alone).
 */
export type StatSlot = 'hero' | 'rail-left' | 'rail-right' | 'stamp' | 'none'

/** A DOM label pinned at %-coords over the stage — the single text authority for scene annotations. */
export interface FilmAnnotation {
  x: number; y: number
  text: { en: string; es: string }
  mono?: boolean
  red?: boolean
}

export interface FilmLayout {
  slot: StatSlot
  /** render the stat numeral in mono (baseline/tally treatments) rather than serif italic. */
  mono?: boolean
  /** dim scene ink in the center cell while a hero stat is live. */
  clearCenter?: boolean
  annotations?: FilmAnnotation[]
}

export interface FilmBeat {
  id: string
  mode: FilmMode
  tag: { en: string; es: string }
  caption: { en: string; es: string }
  /** Fallback dwell when sound is off; with narration on, the VO clip drives pacing. */
  durationMs: number
  stat?: FilmStat
  /** Reference marker for benchmark/split (e.g. the OECD ceiling). */
  ref?: { value: number; label: { en: string; es: string } }
  verdict?: { en: string; es: string }
  // ── 15-min chaptered film (el-expediente) ──
  /** chapter index for wayfinding + progress grouping (0 = cold open). */
  chapter?: number
  /** act roman numeral, only on titlecard beats. */
  act?: string
  /** chapter wayfinding cue shown top-left (e.g. "CH.1 · EL APAGÓN"). */
  chapterLabel?: { en: string; es: string }
  /** titlecard text. */
  cardKicker?: { en: string; es: string }
  cardTitle?: { en: string; es: string }
  /** honesty provenance, rendered as small agate under the stat. */
  agate?: { en: string; es: string }
  /** a beat that paces on durationMs with no narration (engineered silence). */
  silence?: boolean
  /**
   * Rendering medium for this beat's canvas layer (El Teatro de Papel, 2026-07-03).
   * 'objects' → a cut-vector object scene from SCENES[mode]; 'particles' (default) →
   * the legacy particle-morph engine. Lets object scenes land incrementally with a
   * particle fallback, so nothing blocks launch. DOM overlays (stat/subtitle/VO) are
   * renderer-independent.
   */
  renderer?: 'objects' | 'particles'
  /** stat placement + scene annotations (Intro redesign 2026-07-03). Absent → hero-center legacy. */
  layout?: FilmLayout
}

export interface FilmPalette {
  bg: string
  /** "r,g,b" channels (used with per-particle alpha). */
  ink: string
  dim: string
  accentRGB: string
  /** accent as a hex/colour string for lines + bars. */
  accent: string
}

export interface FilmDef {
  slug: string
  title: { en: string; es: string }
  subtitle: { en: string; es: string }
  /** the unit drawn per particle — a contract glyph (document) or a plain dot. */
  glyph: 'doc' | 'dot'
  particleCount: number
  daFraction: number
  valueFraction: number
  palette: FilmPalette
  beats: FilmBeat[]
}

// El Expediente — the house palette. Warm ink-black ground, bone / aged-paper
// document glyphs, one accusing red that appears only on the corrupt unit.
const PALETTE_BLACKOUT: FilmPalette = {
  bg: '#0c0a09',
  ink: '232,226,212',
  dim: '140,134,123',
  accentRGB: '220,38,38',
  accent: '#dc2626',
}

// Presidential-term identity colours (Fox · Calderón · Peña Nieto · AMLO · Sheinbaum).
// Identity, never risk — used by the sexenio time-ribbon in el-expediente.
export const SEXENIO_COLORS = ['#3b82f6', '#22d3ee', '#f97316', '#8b5cf6', '#ec4899']

export const FILMS: Record<string, FilmDef> = {
  'el-vacio': {
    slug: 'el-vacio',
    title: { en: 'The Blackout', es: 'El Apagón' },
    subtitle: {
      en: 'How Mexico erased its own procurement record — and how we rebuilt it',
      es: 'Cómo México borró su propio registro de compras — y cómo lo reconstruimos',
    },
    glyph: 'doc',
    particleCount: 600,
    daFraction: 0.787,
    valueFraction: 0.25,
    palette: PALETTE_BLACKOUT,
    beats: [
      {
        id: 'record',
        mode: 'field',
        tag: { en: 'THE RECORD', es: 'EL REGISTRO' },
        caption: {
          en: 'For twenty years Mexico published who its government paid, and why — a public record of millions of federal contracts.',
          es: 'Durante veinte años México publicó a quién pagaba su gobierno, y por qué — un registro público de millones de contratos federales.',
        },
        durationMs: 12000,
        stat: { format: 'text', text: '2002 — 2025', label: { en: 'a public record', es: 'un registro público' } },
      },
      {
        id: 'blackout',
        mode: 'dissolve',
        tag: { en: 'THE BLACKOUT', es: 'EL APAGÓN' },
        caption: {
          en: 'In 2025 it was taken apart — the transparency institute dissolved, CompraNet abolished. On September 28, the feed moved for the last time.',
          es: 'En 2025 fue desmantelado — el instituto de transparencia disuelto, CompraNet abolida. El 28 de septiembre, el flujo se movió por última vez.',
        },
        durationMs: 15000,
        stat: { format: 'text', text: '28 · SEP · 2025', label: { en: 'the record went dark', es: 'el registro se apagó' } },
      },
      {
        id: 'portal',
        mode: 'portal',
        tag: { en: 'ONE AT A TIME', es: 'UNA A LA VEZ' },
        caption: {
          en: 'Its successor, ComprasMX, releases contracts like a filing cabinet — one folder at a time, behind a portal, with no bulk export.',
          es: 'Su sucesor, ComprasMX, libera los contratos como un archivero — una carpeta a la vez, detrás de un portal, sin exportación masiva.',
        },
        durationMs: 13000,
        stat: { format: 'text', text: '1 × 1', label: { en: 'one folder at a time', es: 'una carpeta a la vez' } },
      },
      {
        id: 'decode',
        mode: 'decode',
        tag: { en: 'WE READ THE SILENCE', es: 'LEÍMOS EL SILENCIO' },
        caption: {
          en: 'Each request was guarded by a cryptographic signature meant to keep tools out. The signature could be reproduced — and the whole catalogue opened.',
          es: 'Cada petición estaba protegida por una firma criptográfica para dejar fuera a las herramientas. La firma pudo reproducirse — y todo el catálogo se abrió.',
        },
        durationMs: 12000,
      },
      {
        id: 'recovered',
        mode: 'reassemble',
        tag: { en: 'RECOVERY', es: 'RECUPERACIÓN' },
        caption: {
          en: "The contracts didn't stop — only the record did. We reassembled it from the successor portal, one award at a time.",
          es: 'Los contratos no se detuvieron — solo el registro. Lo reensamblamos del portal sucesor, una adjudicación a la vez.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 69516, label: { en: 'awards recovered', es: 'adjudicaciones recuperadas' } },
      },
      {
        id: 'nobid',
        mode: 'split',
        tag: { en: 'FOUR IN FIVE, NO BID', es: 'CUATRO DE CINCO, SIN LICITAR' },
        caption: {
          en: 'Most of the recovered record went out with no public tender and no rival bids — adjudicación directa.',
          es: 'La mayoría del registro recuperado salió sin licitación pública ni ofertas rivales — adjudicación directa.',
        },
        durationMs: 13000,
        stat: { format: 'pct', target: 78.7, label: { en: 'direct award', es: 'adjudicación directa' } },
      },
      {
        id: 'ceiling',
        mode: 'benchmark',
        tag: { en: 'PAST THE CEILING', es: 'SOBRE EL TECHO' },
        caption: {
          en: 'The OECD treats direct award as an exception — in the low tens of a percent even under emergency. Mexico runs at nearly four in five.',
          es: 'La OCDE trata la adjudicación directa como excepción — en decenas bajas de por ciento incluso en emergencia. México opera en casi cuatro de cinco.',
        },
        durationMs: 12000,
        stat: { format: 'pct', target: 78.7, label: { en: 'direct award', es: 'adjudicación directa' } },
        ref: { value: 40, label: { en: 'OECD ceiling', es: 'techo OCDE' } },
      },
      {
        id: 'noprice',
        mode: 'redact',
        tag: { en: 'NO PRICE', es: 'SIN PRECIO' },
        caption: {
          en: 'Three in four awards disclose no amount at all — not a final price, not even an estimate. The state bought something, from someone, and declines to say for how much.',
          es: 'Tres de cada cuatro adjudicaciones no revelan monto alguno — ni precio final, ni un estimado. El Estado compró algo, a alguien, y se niega a decir por cuánto.',
        },
        durationMs: 13000,
        stat: { format: 'text', text: '3 / 4', label: { en: 'hide their price', es: 'ocultan su precio' } },
      },
      {
        id: 'scan',
        mode: 'valuescan',
        tag: { en: 'WHAT THE SCANS HID', es: 'LO QUE OCULTARON LOS ESCANEOS' },
        caption: {
          en: 'The price survives only inside scanned award documents — images, not text. Optical character recognition read it back off the page.',
          es: 'El precio sobrevive solo dentro de documentos de adjudicación escaneados — imágenes, no texto. El reconocimiento óptico lo leyó de la página.',
        },
        durationMs: 16000,
        stat: { format: 'currencyB', target: 65.5, label: { en: 'recovered in no-bid awards', es: 'recuperados en adjudicaciones directas' } },
      },
      {
        id: 'born',
        mode: 'spotlight',
        tag: { en: 'BORN TO WIN', es: 'NACIDA PARA GANAR' },
        caption: {
          en: 'The single largest no-bid award the scans gave back — billions of pesos, to a vendor that had existed for only months when it won.',
          es: 'La mayor adjudicación directa que los escaneos devolvieron — miles de millones de pesos, a un proveedor que existía desde hacía solo meses cuando ganó.',
        },
        durationMs: 13000,
        stat: { format: 'currencyB', target: 3.15, label: { en: 'one award · one vendor', es: 'una adjudicación · un proveedor' } },
      },
      {
        id: 'verdict',
        mode: 'gauge',
        tag: { en: 'GRADING THE DARK', es: 'EVALUAR LA OSCURIDAD' },
        caption: {
          en: 'Where the state stopped grading itself, an outside record can. This is what Mexico bought after the lights went out.',
          es: 'Donde el Estado dejó de evaluarse, un registro externo puede. Esto es lo que México compró después de que se apagaron las luces.',
        },
        durationMs: 15000,
        stat: { format: 'pct', target: 78.7, label: { en: 'opaque by design', es: 'opaco por diseño' } },
        verdict: { en: 'Opaque by design', es: 'Opaco por diseño' },
      },
    ],
  },

  'el-registro': {
    slug: 'el-registro',
    title: { en: 'Intro', es: 'Intro' },
    subtitle: {
      en: 'Twenty-three years of federal spending, read at last.',
      es: 'Veintitrés años de gasto federal, leídos por fin.',
    },
    glyph: 'doc',
    particleCount: 680,
    daFraction: 0.787,
    valueFraction: 0.25,
    palette: PALETTE_BLACKOUT,
    beats: [
      // ── ACT I · EL REGISTRO ──
      {
        id: 'ledger', chapterLabel: { en: 'I · THE RECORD', es: 'I · EL REGISTRO' },
        mode: 'field', renderer: 'objects', layout: { slot: 'hero', clearCenter: true },
        tag: { en: 'THE RECORD', es: 'EL REGISTRO' },
        caption: {
          en: 'This is what the Mexican government bought over twenty-three years: 3,058,286 federal contracts, five administrations. All of it public. Almost none of it ever read — until now.',
          es: 'Esto es lo que compró el gobierno mexicano durante veintitrés años: 3,058,286 contratos federales, cinco sexenios. Todo público. Casi nada leído — hasta ahora.',
        },
        durationMs: 17000,
        stat: { format: 'text', text: '9.9T', mxn: 9900000000000, label: { en: 'MXN spent · 3,058,286 contracts · 2002–2025', es: 'MXN ejercidos · 3,058,286 contratos · 2002–2025' } },
      },
      {
        id: 'sexenios', chapterLabel: { en: 'I · THE RECORD', es: 'I · EL REGISTRO' },
        mode: 'ribbon', layout: { slot: 'rail-left', mono: true, annotations: [
          { x: 20, y: 66, text: { en: 'FOX', es: 'FOX' }, mono: true },
          { x: 36, y: 66, text: { en: 'CALDERÓN', es: 'CALDERÓN' }, mono: true },
          { x: 52, y: 66, text: { en: 'PEÑA NIETO', es: 'PEÑA NIETO' }, mono: true },
          { x: 68, y: 66, text: { en: 'AMLO', es: 'AMLO' }, mono: true },
          { x: 83, y: 66, text: { en: 'SHEINBAUM', es: 'SHEINBAUM' }, mono: true },
        ] },
        tag: { en: 'FIVE ADMINISTRATIONS', es: 'CINCO SEXENIOS' },
        caption: {
          en: 'Fox, Calderón, Peña Nieto, López Obrador, Sheinbaum — one ledger that never stopped growing, and never got easier to read.',
          es: 'Fox, Calderón, Peña Nieto, López Obrador, Sheinbaum — un mismo libro que nunca dejó de crecer, ni de volverse más fácil de leer.',
        },
        durationMs: 14000,
        stat: { format: 'text', text: '5', label: { en: 'administrations · one continuous record', es: 'sexenios · un registro continuo' } },
      },
      {
        id: 'unread', chapterLabel: { en: 'I · THE RECORD', es: 'I · EL REGISTRO' },
        mode: 'torrent', layout: { slot: 'rail-left', annotations: [
          { x: 60, y: 30, text: { en: 'one a minute → 25 years', es: 'uno por minuto → 25 años' } },
        ] },
        tag: { en: 'UNREAD', es: 'SIN LEER' },
        caption: {
          en: 'No audit office, no newsroom, reads at this scale. The record was public and unread at the same time.',
          es: 'Ninguna auditoría, ninguna redacción, trabaja a esta escala. El registro era público y estaba sin leer al mismo tiempo.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 3058286, label: { en: 'contracts, effectively unread', es: 'contratos, prácticamente sin leer' } },
      },
      // ── ACT II · EL MÉTODO ──
      {
        id: 'machine', chapterLabel: { en: 'II · THE METHOD', es: 'II · EL MÉTODO' },
        mode: 'decode', layout: { slot: 'none' },
        tag: { en: 'A MACHINE READS', es: 'UNA MÁQUINA LEE' },
        caption: {
          en: 'Then the tools changed. Machine learning matured until a single model could read all three million at once — every amount, every vendor, every award.',
          es: 'Entonces cambiaron las herramientas. El aprendizaje automático maduró hasta que un solo modelo pudo leer los tres millones a la vez — cada monto, cada proveedor, cada adjudicación.',
        },
        durationMs: 13000,
      },
      {
        id: 'signals', chapterLabel: { en: 'II · THE METHOD', es: 'II · EL MÉTODO' },
        mode: 'modelnet', layout: { slot: 'rail-right', mono: true },
        tag: { en: 'EIGHTEEN SIGNALS', es: 'DIECIOCHO SEÑALES' },
        caption: {
          en: 'The model weighs eighteen signals of how corruption tends to hide, learned from 1,427 documented cases. It does not accuse — it measures resemblance, and ranks the record by risk.',
          es: 'El modelo pondera dieciocho señales de cómo suele esconderse la corrupción, aprendidas de 1,427 casos documentados. No acusa — mide semejanza, y ordena el registro por riesgo.',
        },
        durationMs: 15000,
        stat: { format: 'text', text: '18', label: { en: 'signals · 1,427 cases · AUC 0.785', es: 'señales · 1,427 casos · AUC 0.785' } },
      },
      // ── ACT III · LOS HALLAZGOS ──
      {
        id: 'card-findings', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'titlecard', act: 'III',
        cardKicker: { en: 'THE FINDINGS · EIGHT EXHIBITS + THE SCALE', es: 'LOS HALLAZGOS · OCHO HALLAZGOS + LA ESCALA' },
        cardTitle: { en: 'What the record shows', es: 'Lo que muestra el registro' },
        tag: { en: '', es: '' }, caption: { en: '', es: '' }, durationMs: 4500, silence: true,
      },
      {
        id: 'distribution', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'strata', layout: { slot: 'rail-left', mono: true },
        tag: { en: 'FINDING 1 · THE DISTRIBUTION', es: 'HALLAZGO 1 · LA DISTRIBUCIÓN' },
        caption: {
          en: 'Scored end to end, most of the record looks routine. But a ninth of it carries the signatures of the corruption already documented.',
          es: 'Calificado de punta a punta, la mayor parte del registro parece rutinaria. Pero una novena parte carga las firmas de la corrupción ya documentada.',
        },
        durationMs: 14000,
        stat: { format: 'pct', target: 11.1, label: { en: 'high-risk · a risk indicator, not a verdict', es: 'de alto riesgo · indicador de riesgo, no un veredicto' } },
        agate: { en: 'critical 5.2% + high 5.9% · model v0.8.5', es: 'crítico 5.2% + alto 5.9% · modelo v0.8.5' },
      },
      {
        id: 'directaward', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'benchmark', layout: { slot: 'rail-left', mono: true },
        tag: { en: 'FINDING 2 · NO COMPETITION', es: 'HALLAZGO 2 · SIN COMPETENCIA' },
        caption: {
          en: 'Most of the money skips the contest entirely — awarded directly, with no tender and no rival bid. The OECD treats that as the exception, not the rule.',
          es: 'La mayor parte del dinero se salta el concurso — adjudicado de forma directa, sin licitación y sin oferta rival. La OCDE lo considera la excepción, no la regla.',
        },
        durationMs: 15000,
        stat: { format: 'pct', target: 78, label: { en: 'peak direct award · OECD ceiling 40%', es: 'máx. adjudicación directa · techo OCDE 40%' } },
        ref: { value: 40, label: { en: 'OECD ceiling', es: 'techo OCDE' } },
        agate: { en: '72–78% depending on the year', es: '72–78% según el año' },
      },
      {
        id: 'ghosts', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'ghosts', renderer: 'objects', layout: { slot: 'rail-right' },
        tag: { en: 'FINDING 3 · GHOST VENDORS', es: 'HALLAZGO 3 · PROVEEDORES FANTASMA' },
        caption: {
          en: 'Thousands of vendors have the shape of a company and none of the substance — no footprint beyond the ledger. Together they billed billions.',
          es: 'Miles de proveedores tienen la forma de una empresa y nada de su sustancia — sin huella más allá del libro. Juntos facturaron miles de millones.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 6118, mxn: 39600000000, label: { en: 'ghost-pattern vendors · billed', es: 'proveedores patrón fantasma · facturaron' } },
        agate: { en: 'ARIA pattern P2', es: 'patrón ARIA P2' },
      },
      {
        id: 'monopoly', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'monopoly', layout: { slot: 'rail-left', mono: true },
        tag: { en: 'FINDING 4 · THE MONOPOLY', es: 'HALLAZGO 4 · EL MONOPOLIO' },
        caption: {
          en: 'One federal institution keeps a court of 44 vendors. Eight in ten flag high-risk. The pattern has a name: monopoly.',
          es: 'Una institución federal mantiene una corte de 44 proveedores. Ocho de cada diez se señalan de alto riesgo. El patrón tiene nombre: monopolio.',
        },
        durationMs: 13000,
        stat: { format: 'text', text: '36 / 44', label: { en: "vendors flag high-risk — 81.8%", es: 'proveedores de alto riesgo — 81.8%' } },
        agate: { en: 'ARIA P1 · live 0.8182', es: 'ARIA P1 · en vivo 0.8182' },
      },
      {
        id: 'intermediaries', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'network', layout: { slot: 'rail-right' },
        tag: { en: 'FINDING 5 · THE MIDDLEMEN', es: 'HALLAZGO 5 · LOS INTERMEDIARIOS' },
        caption: {
          en: 'These vendors buy nothing and make nothing — they only pass the contract along, taking a cut at every hand. The price arrives inflated.',
          es: 'Estos proveedores no compran ni fabrican nada — solo pasan el contrato de mano en mano, cobrando comisión en cada una. El precio llega inflado.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 2972, label: { en: 'intermediary-pattern vendors', es: 'proveedores patrón intermediario' } },
        agate: { en: 'ARIA pattern P3', es: 'patrón ARIA P3' },
      },
      {
        id: 'overpricing', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'valuescan', layout: { slot: 'rail-left' },
        tag: { en: 'FINDING 6 · THE MARKUP', es: 'HALLAZGO 6 · EL SOBREPRECIO' },
        caption: {
          en: 'The same good, the same service — billed far above what the rest of the market paid. Thousands of vendors show the pattern of systematic overpricing.',
          es: 'El mismo bien, el mismo servicio — facturado muy por encima de lo que pagó el resto del mercado. Miles de proveedores muestran el patrón de sobreprecio sistemático.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 3772, label: { en: 'overpricing-pattern vendors', es: 'proveedores patrón sobreprecio' } },
        agate: { en: 'ARIA pattern P5', es: 'patrón ARIA P5' },
      },
      {
        id: 'capture', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'lattice', renderer: 'objects', layout: { slot: 'rail-right' },
        tag: { en: 'FINDING 7 · CAPTURE', es: 'HALLAZGO 7 · LA CAPTURA' },
        caption: {
          en: 'Markets move. Captured ones freeze — institutions whose spending locks onto a closed circle of vendors, year after year.',
          es: 'Los mercados se mueven. Los capturados se congelan — instituciones cuyo gasto se cierra sobre un círculo fijo de proveedores, año tras año.',
        },
        durationMs: 15000,
        stat: { format: 'int', target: 15939, label: { en: 'actors in capture patterns', es: 'actores en patrones de captura' } },
        agate: { en: 'ARIA pattern P6', es: 'patrón ARIA P6' },
      },
      {
        id: 'sectors', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'categorygrid', layout: { slot: 'rail-left', mono: true },
        tag: { en: 'FINDING 8 · WHERE IT CONCENTRATES', es: 'HALLAZGO 8 · DÓNDE SE CONCENTRA' },
        caption: {
          en: 'The risk is not spread evenly. Across twelve sectors, health procurement — medicine, equipment — carries the heaviest concentration of flagged spending.',
          es: 'El riesgo no se reparte parejo. En doce sectores, las compras de salud — medicinas, equipo — cargan la mayor concentración de gasto señalado.',
        },
        durationMs: 14000,
        stat: { format: 'text', text: '12 · 72', label: { en: 'sectors · categories — salud leads', es: 'sectores · categorías — salud encabeza' } },
      },
      {
        id: 'scandal', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'spotlight', layout: { slot: 'stamp' },
        tag: { en: 'THE PATTERNS HAVE NAMES', es: 'LOS PATRONES TIENEN NOMBRE' },
        caption: {
          en: 'The patterns resolve into named cases. In «La Estafa Maestra», federal agencies routed billions through public universities acting as shells, passing the money to companies that often did not exist.',
          es: 'Los patrones se resuelven en casos con nombre. En «La Estafa Maestra», dependencias federales desviaron miles de millones a través de universidades públicas que operaron como fachada, entregando el dinero a empresas que muchas veces no existían.',
        },
        durationMs: 16000,
        stat: { format: 'text', text: 'LA ESTAFA MAESTRA', label: { en: 'one documented case among many', es: 'un caso documentado entre muchos' } },
      },
      {
        id: 'scale', chapterLabel: { en: 'III · THE FINDINGS', es: 'III · LOS HALLAZGOS' },
        mode: 'mass', renderer: 'objects', layout: { slot: 'hero', clearCenter: true, annotations: [
          { x: 62, y: 68, text: { en: '41 unweighed', es: '41 sin pesar' }, mono: true },
        ] },
        tag: { en: 'THE SCALE', es: 'LA ESCALA' },
        caption: {
          en: 'Across the documented cases alone, the estimated loss reaches trillions of pesos diverted. That figure is a floor, not a ceiling — dozens of cases carry no estimate at all.',
          es: 'Solo en los casos documentados, la pérdida estimada llega a billones de pesos desviados. Esa cifra es un piso, no un techo — decenas de casos no tienen estimación alguna.',
        },
        durationMs: 16000,
        stat: { format: 'currencyT', target: 2.84, red: true, mxn: 2840000000000, label: { en: 'estimated diverted · documented cases', es: 'desvío estimado · casos documentados' } },
        agate: { en: 'sum of estimated_fraud_mxn · 41 cases with no figure · a floor, not a ceiling', es: 'suma de estimated_fraud_mxn · 41 casos sin cifra · un piso, no un techo' },
      },
      // ── ACT IV · EL APAGÓN ──
      {
        id: 'blackout', chapterLabel: { en: 'IV · THE BLACKOUT', es: 'IV · EL APAGÓN' },
        mode: 'dissolve', renderer: 'objects', layout: { slot: 'stamp' },
        tag: { en: 'THE BLACKOUT', es: 'EL APAGÓN' },
        caption: {
          en: 'Then, in 2025, the record went dark. The transparency institute was dissolved, CompraNet abolished. On September 28, the federal feed moved for the last time. The spending continued. The record of it did not.',
          es: 'Entonces, en 2025, el registro se apagó. El instituto de transparencia fue disuelto, CompraNet abolida. El 28 de septiembre, el flujo federal se movió por última vez. El gasto continuó. Su registro, no.',
        },
        durationMs: 16000,
        stat: { format: 'text', text: '28 · SEP · 2025', red: true, label: { en: 'the record went dark', es: 'el registro se apagó' } },
      },
      {
        id: 'recovered', chapterLabel: { en: 'IV · THE BLACKOUT', es: 'IV · EL APAGÓN' },
        mode: 'reassemble', layout: { slot: 'rail-left' },
        tag: { en: 'RECOVERED', es: 'RECUPERADO' },
        caption: {
          en: 'The successor portal released awards one folder at a time, behind a cryptographic gate. The gate was reproduced, and the missing months read back — page by scanned page. The record continued — outside the state.',
          es: 'El portal sucesor entregó las adjudicaciones carpeta por carpeta, tras un candado criptográfico. El candado pudo reproducirse, y los meses faltantes se leyeron de vuelta — página por página escaneada. El registro continuó — fuera del Estado.',
        },
        durationMs: 16000,
        stat: { format: 'int', target: 69516, mxn: 65500000000, label: { en: 'awards recovered from the dark', es: 'adjudicaciones recuperadas de la oscuridad' } },
        agate: { en: '78.7% no rival bid · read via OCR', es: '78.7% sin oferta rival · leídas vía OCR' },
      },
      // ── ACT V · RUBLI ──
      {
        id: 'colophon', chapterLabel: { en: 'V · RUBLI', es: 'V · RUBLI' },
        mode: 'mark', layout: { slot: 'rail-left', mono: true },
        tag: { en: 'WHAT THIS PRODUCED', es: 'LO QUE ESTO PRODUJO' },
        caption: {
          en: 'Every contract scored, every vendor ranked, an investigation queue more than seven thousand deep, and the missing months of 2025 recovered. Built open — code, model, and data.',
          es: 'Cada contrato calificado, cada proveedor clasificado, una cola de investigación de más de siete mil proveedores, y los meses perdidos de 2025 recuperados. Construido en abierto: código, modelo y datos.',
        },
        durationMs: 15000,
        stat: { format: 'int', target: 3058286, label: { en: 'contracts read · 7,365 prioritized · open', es: 'contratos leídos · 7,365 priorizados · abierto' } },
      },
      {
        id: 'rubli', chapterLabel: { en: 'V · RUBLI', es: 'V · RUBLI' },
        mode: 'mark', layout: { slot: 'hero' },
        tag: { en: '', es: '' },
        caption: {
          en: 'The model is open. The data is open. The record the state stopped keeping now belongs to anyone who wants to read it. This is RUBLI.',
          es: 'El modelo es abierto. Los datos son abiertos. El registro que el Estado dejó de llevar ahora es de cualquiera que quiera leerlo. Esto es RUBLI.',
        },
        durationMs: 14000,
        stat: { format: 'text', text: 'RUBLI', label: { en: 'open-source procurement intelligence', es: 'inteligencia de compras de código abierto' } },
        verdict: { en: 'The record stays open.', es: 'El registro queda abierto.' },
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // EL EXPEDIENTE — the 15-minute presentation card. Phase 0 = cold open + Ch.1
  // (the torn sexenio ribbon) + the Act II card. Chapters 2–9 land in later phases.
  // ───────────────────────────────────────────────────────────────────────────
  'el-expediente': {
    slug: 'el-expediente',
    title: { en: 'The File', es: 'El Expediente' },
    subtitle: {
      en: 'How one person read three million contracts.',
      es: 'Cómo una persona leyó tres millones de contratos.',
    },
    glyph: 'doc',
    particleCount: 640,
    daFraction: 0.787,
    valueFraction: 0.25,
    palette: PALETTE_BLACKOUT,
    beats: [
      // ── COLD OPEN · "El Número" (Act I) ──
      {
        id: 'num-scale',
        chapter: 0,
        mode: 'field',
        tag: { en: '', es: '' },
        caption: {
          en: 'Nine point nine trillion pesos. Three million contracts. Almost no one has ever read them.',
          es: 'Nueve punto nueve billones de pesos. Tres millones de contratos. Casi nadie los ha leído.',
        },
        durationMs: 13000,
        stat: { format: 'text', text: '9.9T', label: { en: 'pesos · 23 years', es: 'de pesos · 23 años' } },
      },
      {
        id: 'num-count',
        chapter: 0,
        mode: 'reassemble',
        tag: { en: '', es: '' },
        caption: {
          en: 'Three million federal contracts, signed over twenty-three years.',
          es: 'Tres millones de contratos federales, firmados en veintitrés años.',
        },
        durationMs: 12000,
        stat: { format: 'int', target: 3058286, label: { en: 'federal contracts', es: 'contratos federales' } },
      },
      {
        id: 'num-fraud',
        chapter: 0,
        mode: 'mark',
        tag: { en: '', es: '' },
        caption: {
          en: 'In the contracts already documented, an estimated two point eight trillion pesos diverted — and for six months, the government stopped publishing any of it.',
          es: 'En los contratos ya documentados, un estimado de dos punto ocho billones de pesos desviados — y durante seis meses, el gobierno dejó de publicar todo eso.',
        },
        durationMs: 15000,
        stat: { format: 'text', text: '$2.84T', red: true, label: { en: 'estimated diverted', es: 'desvío estimado' } },
        agate: {
          en: 'summed from estimated_fraud_mxn across documented cases · 41 cases NULL on this field',
          es: 'sumado de estimated_fraud_mxn en casos documentados · 41 casos NULL en este campo',
        },
      },
      // ── CH.1 · "El Apagón / The Blackout" (Act I) ──
      {
        id: 'apagon-record',
        chapter: 1,
        chapterLabel: { en: 'CH.1 · THE BLACKOUT', es: 'CAP.1 · EL APAGÓN' },
        mode: 'ribbon',
        tag: { en: 'THE BLACKOUT', es: 'EL APAGÓN' },
        caption: {
          en: 'For twenty-three years, every federal peso left a trace — three million contracts, across five governments, all of it public.',
          es: 'Durante veintitrés años, cada peso federal dejó un rastro — tres millones de contratos, en cinco gobiernos, todo público.',
        },
        durationMs: 20000,
        stat: { format: 'text', text: '2002 — 2025', label: { en: 'a public record', es: 'un registro público' } },
      },
      {
        id: 'apagon-tear',
        chapter: 1,
        chapterLabel: { en: 'CH.1 · THE BLACKOUT', es: 'CAP.1 · EL APAGÓN' },
        mode: 'ribbontear',
        tag: { en: 'THE BLACKOUT', es: 'EL APAGÓN' },
        caption: {
          en: 'Then in 2025 it was dismantled — the transparency institute dissolved, CompraNet abolished. On September twenty-eighth, the federal feed moved for the last time. The spending did not stop. Only the record of it did.',
          es: 'Luego, en 2025, fue desmantelado — el instituto de transparencia disuelto, CompraNet abolida. El veintiocho de septiembre, el flujo federal se movió por última vez. El gasto no se detuvo. Solo el registro.',
        },
        durationMs: 22000,
        stat: { format: 'text', text: '28 · SEP · 2025', red: true, label: { en: 'the record went dark', es: 'el registro se apagó' } },
      },
      // ── ACT II TITLE CARD ──
      {
        id: 'card-machine',
        chapter: 2,
        mode: 'titlecard',
        act: 'II',
        cardKicker: { en: 'ACT II', es: 'ACTO II' },
        cardTitle: { en: 'THE MACHINE', es: 'LA MÁQUINA' },
        tag: { en: '', es: '' },
        caption: { en: '', es: '' },
        durationMs: 5000,
        silence: true,
      },
    ],
  },
}
