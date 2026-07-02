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
  label: { en: string; es: string }
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
    title: { en: 'The Record', es: 'El Registro' },
    subtitle: {
      en: 'Three million contracts. One reading. This is what the record shows.',
      es: 'Tres millones de contratos. Una lectura. Esto es lo que muestra el registro.',
    },
    glyph: 'doc',
    particleCount: 680,
    daFraction: 0.787,
    valueFraction: 0.25,
    palette: PALETTE_BLACKOUT,
    beats: [
      // ── ACT I · THE LEDGER ──
      {
        id: 'ledger',
        chapterLabel: { en: 'I · THE LEDGER', es: 'I · EL LIBRO MAYOR' },
        mode: 'field',
        tag: { en: 'THE LEDGER', es: 'EL LIBRO MAYOR' },
        caption: {
          en: 'Over twenty-three years, the Mexican federal government signed three million contracts — nine point nine trillion pesos. All of it, by law, public record.',
          es: 'A lo largo de veintitrés años, el gobierno federal mexicano firmó tres millones de contratos — nueve punto nueve billones de pesos. Todo, por ley, registro público.',
        },
        durationMs: 13000,
        stat: { format: 'text', text: '9.9T', label: { en: 'pesos · 23 years · public record', es: 'de pesos · 23 años · registro público' } },
      },
      {
        id: 'unread',
        chapterLabel: { en: 'I · THE LEDGER', es: 'I · EL LIBRO MAYOR' },
        mode: 'torrent',
        tag: { en: 'UNREAD', es: 'SIN LEER' },
        caption: {
          en: 'Public — but unread. At one contract a minute, eight hours a day, the record takes twenty-five years to finish. No audit office, no newsroom, works at that scale.',
          es: 'Público — pero sin leer. A un contrato por minuto, ocho horas al día, terminar el registro toma veinticinco años. Ninguna auditoría, ninguna redacción, trabaja a esa escala.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 3058286, label: { en: 'contracts, largely unread', es: 'contratos, casi sin leer' } },
      },
      // ── ACT II · THE METHOD ──
      {
        id: 'machine',
        chapterLabel: { en: 'II · THE METHOD', es: 'II · EL MÉTODO' },
        mode: 'decode',
        tag: { en: 'A MACHINE READS', es: 'UNA MÁQUINA LEE' },
        caption: {
          en: 'Then the tools changed. Machine learning matured until a model could read all three million at once — every amount, every vendor, every award, in a single pass.',
          es: 'Entonces cambiaron las herramientas. El aprendizaje automático maduró hasta que un modelo pudo leer los tres millones a la vez — cada monto, cada proveedor, cada adjudicación, en una sola pasada.',
        },
        durationMs: 12000,
      },
      {
        id: 'signals',
        chapterLabel: { en: 'II · THE METHOD', es: 'II · EL MÉTODO' },
        mode: 'modelnet',
        tag: { en: 'EIGHTEEN SIGNALS', es: 'DIECIOCHO SEÑALES' },
        caption: {
          en: 'The model reads eighteen signals of how corruption tends to hide — trained on one thousand four hundred twenty-seven documented cases. It does not accuse. It measures resemblance, and ranks the record by risk.',
          es: 'El modelo lee dieciocho señales de cómo suele esconderse la corrupción — entrenado con mil cuatrocientos veintisiete casos documentados. No acusa. Mide semejanza, y ordena el registro por riesgo.',
        },
        durationMs: 15000,
        stat: { format: 'text', text: 'AUC 0.785', label: { en: '18 signals · 1,427 documented cases', es: '18 señales · 1,427 casos documentados' } },
      },
      // ── ACT III · THE BLACKOUT ──
      {
        id: 'blackout',
        chapterLabel: { en: 'III · THE BLACKOUT', es: 'III · EL APAGÓN' },
        mode: 'dissolve',
        tag: { en: 'THE BLACKOUT', es: 'EL APAGÓN' },
        caption: {
          en: 'Then, just as an outside audit became possible, the record went dark. In twenty twenty-five the transparency institute was dissolved and CompraNet abolished. On September twenty-eighth, the federal feed moved for the last time. The spending continued. The record of it did not.',
          es: 'Entonces, justo cuando una auditoría externa se volvía posible, el registro se apagó. En dos mil veinticinco el instituto de transparencia fue disuelto y CompraNet, abolida. El veintiocho de septiembre, el flujo federal se movió por última vez. El gasto continuó. Su registro, no.',
        },
        durationMs: 16000,
        stat: { format: 'text', text: '28 · SEP · 2025', red: true, label: { en: 'the record went dark', es: 'el registro se apagó' } },
      },
      {
        id: 'recovered',
        chapterLabel: { en: 'III · THE BLACKOUT', es: 'III · EL APAGÓN' },
        mode: 'reassemble',
        tag: { en: 'RECOVERED', es: 'RECUPERADO' },
        caption: {
          en: 'The successor portal releases awards one folder at a time, behind a cryptographic gate. The gate could be reproduced — and the missing months read back. Sixty-nine thousand five hundred sixteen awards, recovered.',
          es: 'El portal sucesor entrega las adjudicaciones carpeta por carpeta, tras un candado criptográfico. El candado pudo reproducirse — y los meses faltantes se leyeron de vuelta. Sesenta y nueve mil quinientas dieciséis adjudicaciones, recuperadas.',
        },
        durationMs: 15000,
        stat: { format: 'int', target: 69516, label: { en: 'awards recovered', es: 'adjudicaciones recuperadas' } },
      },
      // ── ACT IV · THE FINDINGS ──
      {
        id: 'card-findings',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'titlecard',
        act: 'IV',
        cardKicker: { en: 'THE FINDINGS', es: 'LOS HALLAZGOS' },
        cardTitle: { en: 'What the record shows', es: 'Lo que muestra el registro' },
        tag: { en: '', es: '' },
        caption: { en: '', es: '' },
        durationMs: 4500,
        silence: true,
      },
      {
        id: 'distribution',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'strata',
        tag: { en: 'THE DISTRIBUTION', es: 'LA DISTRIBUCIÓN' },
        caption: {
          en: 'Scored end to end, the record sorts itself. Most contracts look routine. Eleven point one percent do not — they carry the signatures of the corruption already documented.',
          es: 'Calificado de punta a punta, el registro se ordena solo. La mayoría de los contratos parece rutinaria. El once punto uno por ciento, no — carga las firmas de la corrupción ya documentada.',
        },
        durationMs: 14000,
        stat: { format: 'pct', target: 11.1, label: { en: 'flagged high-risk · a risk indicator, not a verdict', es: 'señalados de alto riesgo · indicador de riesgo, no un veredicto' } },
        agate: { en: 'critical 5.2% + high 5.9% · model v0.8.5', es: 'crítico 5.2% + alto 5.9% · modelo v0.8.5' },
      },
      {
        id: 'ghosts',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'ghosts',
        tag: { en: 'GHOST VENDORS', es: 'PROVEEDORES FANTASMA' },
        caption: {
          en: 'Inside the flagged record: six thousand one hundred eighteen vendors with the shape of a company and none of the substance — no footprint beyond the ledger. Together they billed nearly forty billion pesos.',
          es: 'Dentro del registro señalado: seis mil ciento dieciocho proveedores con la forma de una empresa y nada de la sustancia — sin huella más allá del libro. Juntos facturaron casi cuarenta mil millones de pesos.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 6118, label: { en: 'ghost-pattern vendors · 39.6B MXN', es: 'proveedores patrón fantasma · 39,600 MDP' } },
        agate: { en: 'ARIA pattern P2 · each ring ≈ 90 vendors', es: 'patrón ARIA P2 · cada anillo ≈ 90 proveedores' },
      },
      {
        id: 'monopoly',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'monopoly',
        tag: { en: 'THE MONOPOLY', es: 'EL MONOPOLIO' },
        caption: {
          en: 'One federal institution keeps a court of forty-four vendors. Thirty-six of them — eight in ten — flag high-risk. The pattern has a name: monopoly.',
          es: 'Una institución federal mantiene una corte de cuarenta y cuatro proveedores. Treinta y seis — ocho de cada diez — se señalan de alto riesgo. El patrón tiene nombre: monopolio.',
        },
        durationMs: 13000,
        stat: { format: 'pct', target: 81.8, label: { en: "of one institution's vendors flag high-risk", es: 'de los proveedores de una institución, de alto riesgo' } },
        agate: { en: '36 of 44 vendors · ARIA pattern P1 · live 0.8182', es: '36 de 44 proveedores · patrón ARIA P1 · en vivo 0.8182' },
      },
      {
        id: 'capture',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'lattice',
        tag: { en: 'CAPTURE', es: 'LA CAPTURA' },
        caption: {
          en: 'Markets move. Captured ones freeze. Across the record, fifteen thousand nine hundred thirty-nine actors sit inside capture patterns — institutions whose spending locks onto a closed circle of vendors, year after year.',
          es: 'Los mercados se mueven. Los capturados se congelan. En todo el registro, quince mil novecientos treinta y nueve actores aparecen en patrones de captura — instituciones cuyo gasto se cierra sobre un círculo fijo de proveedores, año tras año.',
        },
        durationMs: 14000,
        stat: { format: 'int', target: 15939, label: { en: 'actors in capture patterns', es: 'actores en patrones de captura' } },
        agate: { en: 'ARIA pattern P6', es: 'patrón ARIA P6' },
      },
      {
        id: 'darkness',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'benchmark',
        tag: { en: 'THE PRICE OF DARKNESS', es: 'EL PRECIO DE LA OSCURIDAD' },
        caption: {
          en: 'And in the recovered months — the spending after the blackout — seventy-eight point seven percent of awards went out with no competing bid. Nearly double the ceiling the OECD calls an exception. Sixty-five and a half billion pesos, read back off scanned pages.',
          es: 'Y en los meses recuperados — el gasto tras el apagón — el setenta y ocho punto siete por ciento de las adjudicaciones salió sin oferta rival. Casi el doble del techo que la OCDE considera excepción. Sesenta y cinco mil quinientos millones de pesos, leídos de páginas escaneadas.',
        },
        durationMs: 16000,
        stat: { format: 'pct', target: 78.7, label: { en: 'direct award, post-blackout record', es: 'adjudicación directa, registro tras el apagón' } },
        ref: { value: 40, label: { en: 'OECD ceiling', es: 'techo OCDE' } },
        agate: { en: '69,516 recovered awards · $65.5B read via OCR', es: '69,516 adjudicaciones recuperadas · 65,500 MDP leídos vía OCR' },
      },
      {
        id: 'scale',
        chapterLabel: { en: 'IV · THE FINDINGS', es: 'IV · LOS HALLAZGOS' },
        mode: 'mass',
        tag: { en: 'THE SCALE', es: 'LA ESCALA' },
        caption: {
          en: 'The documented cases alone put the loss at an estimated two point eight four trillion pesos diverted. That figure is a floor, not a ceiling — forty-one cases carry no estimate at all.',
          es: 'Solo los casos documentados sitúan la pérdida en un estimado de dos punto ochenta y cuatro billones de pesos desviados. Esa cifra es un piso, no un techo — cuarenta y un casos no tienen estimación alguna.',
        },
        durationMs: 14000,
        stat: { format: 'currencyT', target: 2.84, red: true, label: { en: 'estimated diverted · documented cases', es: 'desvío estimado · casos documentados' } },
        agate: { en: 'summed from estimated_fraud_mxn · 41 cases NULL on this field', es: 'suma de estimated_fraud_mxn · 41 casos NULL en este campo' },
      },
      // ── ACT V · RUBLI ──
      {
        id: 'rubli',
        chapterLabel: { en: 'V · RUBLI', es: 'V · RUBLI' },
        mode: 'mark',
        tag: { en: '', es: '' },
        caption: {
          en: "The model is open. The data is open. The record the state stopped keeping is now anyone's to read. This is RUBLI.",
          es: 'El modelo es abierto. Los datos son abiertos. El registro que el Estado dejó de llevar ahora lo puede leer cualquiera. Esto es RUBLI.',
        },
        durationMs: 13000,
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
