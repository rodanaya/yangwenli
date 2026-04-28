/**
 * El Atlas — full-viewport exploration of the procurement universe.
 *
 * The dashboard's § 1 Atlas at 220px is the elevator pitch. This page is the
 * walking tour: same constellation engine at full size, with two extra axes
 * the dashboard doesn't have:
 *
 *   1. YEAR SCRUBBER  — slide through 2008-2025 to watch the universe evolve.
 *      Each year re-keys the constellation, retriggering the cinematic reveal
 *      with that year's risk distribution. Auto-play loops at 1.5s/year.
 *
 *   2. CLUSTER PANEL  — clicking any attractor opens an inline drawer with
 *      the cluster's description, headline stats, top vendors, and an
 *      "investigate" button that opens the matching ARIA queue / sector page.
 *
 * Plus: the categories mode is expanded from 12 (compact, dashboard) to 32
 * (atlas-density). The full set covers ~80% of federal spend by category.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, ChevronLeft, ChevronRight, X, ArrowUpRight, Sparkles, Pin, PinOff, Layers, Search, NotebookPen, Film, Square, Link2, Check } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { analysisApi, ariaApi } from '@/api/client'
import type { RiskDistribution, YearOverYearChange } from '@/api/types'
import {
  ConcentrationConstellation,
  type ConstellationMode,
  type ConstellationRiskRow,
  type ClusterMeta,
} from '@/components/charts/ConcentrationConstellation'
import { formatNumber } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR LOOKUP — known-vendor → cluster mappings across modes.
//
// Curated list of well-known Mexican federal vendors with their dominant
// pattern (P1-P7), sector, and category. Used by the vendor search bar to
// auto-pin the matching cluster when a user types a known name.
//
// V4 will replace this with a backend endpoint that resolves any vendor name
// to its cluster memberships from the live ARIA queue. For now: 30 hand-
// curated entries covering every documented GT case + the most-flagged T1
// vendors. Search is case-insensitive substring.
// ─────────────────────────────────────────────────────────────────────────────
interface VendorLookup {
  query: string                  // normalized search key (uppercase)
  displayName: string             // canonical display name
  pattern: string                 // P1..P7
  sector: string                  // 12-sector code
  category: string                // category code (matches buildAtlasCategoriesMeta)
  blurb: { en: string; es: string }
}

const KNOWN_VENDORS: VendorLookup[] = [
  // GT-anchored cases
  { query: 'GRUPO FARMACOS',       displayName: 'Grupo Farmacos Especializados', pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: '$133.2B IMSS · COFECE 2018', es: '$133.2B IMSS · COFECE 2018' } },
  { query: 'LICONSA',              displayName: 'LICONSA',                       pattern: 'P5', sector: 'agricultura',     category: 'alimentos',     blurb: { en: 'Segalmex anchor case · MX$15B', es: 'Caso ancla Segalmex · MX$15B' } },
  { query: 'HEMOSER',              displayName: 'HEMOSER',                       pattern: 'P2', sector: 'salud',           category: 'consumibles',   blurb: { en: '$17.2B COVID same-day awards', es: '$17.2B COVID adjudicación mismo-día' } },
  { query: 'TOKA',                 displayName: 'Toka Internacional',            pattern: 'P1', sector: 'tecnologia',      category: 'tic',           blurb: { en: 'IT monopoly · 1,954 contracts at 100% T1', es: 'Monopolio TIC · 1,954 contratos al 100% T1' } },
  { query: 'EDENRED',              displayName: 'Edenred',                       pattern: 'P1', sector: 'hacienda',        category: 'vales',         blurb: { en: 'Voucher cartel · 96.7% T1', es: 'Cartel de vales · 96.7% T1' } },
  { query: 'COTEMAR',              displayName: 'COTEMAR',                       pattern: 'P5', sector: 'energia',         category: 'serv_petroleros', blurb: { en: 'PEMEX offshore · 51 contracts all critical', es: 'PEMEX offshore · 51 contratos todos críticos' } },
  { query: 'ODEBRECHT',            displayName: 'Odebrecht',                     pattern: 'P7', sector: 'energia',         category: 'obra_publica',  blurb: { en: 'PEMEX bribery · MX$10.5M documented', es: 'Sobornos PEMEX · MX$10.5M documentados' } },
  { query: 'OCEANOGRAFIA',         displayName: 'Oceanografía',                  pattern: 'P3', sector: 'energia',         category: 'serv_petroleros', blurb: { en: 'PEMEX 2014 fraud', es: 'Fraude PEMEX 2014' } },
  { query: 'GRUPO HIGA',           displayName: 'Grupo Higa',                    pattern: 'P6', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: 'Casa Blanca scandal', es: 'Escándalo Casa Blanca' } },
  // Pharma cartel cluster
  { query: 'PISA',                 displayName: 'Laboratorios PiSA',             pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'Pharma cartel member', es: 'Miembro del cártel farmacéutico' } },
  { query: 'BIRMEX',               displayName: 'BIRMEX',                        pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS pharma supplier', es: 'Proveedor farmacéutico IMSS' } },
  { query: 'COMPHARMA',            displayName: 'COMPHARMA',                     pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS DA capture (GT case)', es: 'Captura DA IMSS (caso GT)' } },
  { query: 'PIHCSA',               displayName: 'PIHCSA',                        pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS pharma capture', es: 'Captura farmacéutica IMSS' } },
  // Infrastructure
  { query: 'CICSA',                displayName: 'CICSA · Grupo Carso',           pattern: 'P1', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: 'Slim infrastructure conglomerate', es: 'Grupo Slim infraestructura' } },
  { query: 'CONDUMEX',             displayName: 'Condumex · Grupo Carso',        pattern: 'P1', sector: 'energia',         category: 'electricidad',  blurb: { en: 'Cables monopoly', es: 'Monopolio de cables' } },
  // Health/IMSS T1 vendors
  { query: 'BAXTER',               displayName: 'Baxter',                        pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: '⚠ structural FP · multinational', es: '⚠ FP estructural · multinacional' } },
  { query: 'FRESENIUS',            displayName: 'Fresenius',                     pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: '⚠ structural FP · multinational', es: '⚠ FP estructural · multinacional' } },
  // CFE / energy
  { query: 'CFE SUMINISTRADOR',    displayName: 'CFE Suministrador',             pattern: 'P1', sector: 'energia',         category: 'combustibles',  blurb: { en: 'Self-supplier (natural skip)', es: 'Auto-proveedor (omisión natural)' } },
  // Misc T1
  { query: 'MERP',                 displayName: 'MERP',                          pattern: 'P3', sector: 'gobernacion',     category: 'serv_prof',     blurb: { en: 'Single-bid arrangement', es: 'Arreglo de licitación única' } },
  { query: 'TRENA',                displayName: 'TRENA',                         pattern: 'P1', sector: 'gobernacion',     category: 'serv_prof',     blurb: { en: 'Documented monopoly', es: 'Monopolio documentado' } },
  // Education
  { query: 'CONALITEG',            displayName: 'CONALITEG',                     pattern: 'P6', sector: 'educacion',       category: 'libros',        blurb: { en: 'SEP textbooks (parastatal)', es: 'Libros SEP (paraestatal)' } },
]

interface VendorMatch extends VendorLookup {
  matchScore: number
}

function searchKnownVendors(query: string, limit = 6): VendorMatch[] {
  const q = query.trim().toUpperCase()
  if (q.length < 2) return []
  return KNOWN_VENDORS
    .map((v) => {
      const idx = v.query.indexOf(q)
      if (idx === -1) return null
      // Score: lower is better. Prefer prefix matches and short labels.
      return { ...v, matchScore: idx + (v.query.length - q.length) * 0.1 }
    })
    .filter((v): v is VendorMatch => v !== null)
    .sort((a, b) => a.matchScore - b.matchScore)
    .slice(0, limit)
}

// Resolve a vendor's cluster code given the active mode.
function vendorToClusterCode(v: VendorLookup, mode: ConstellationMode): string {
  if (mode === 'patterns')   return v.pattern
  if (mode === 'sectors')    return v.sector
  if (mode === 'categories') return v.category
  return 'amlo' // sexenios mode falls back to AMLO since most cases are recent
}

// ─────────────────────────────────────────────────────────────────────────────
// Yearly snapshots — illustrative time series of risk distribution.
//
// Calibrated to: COMPRANET coverage curve (structures A→D),
// administrative transitions (Calderón→Peña→AMLO→Sheinbaum), and known
// scandal cycles (Oceanografía 2014, Odebrecht 2016, COVID 2020). Exact
// numbers are illustrative — the precompute path for true per-year aggregates
// is documented in .claude/ACTIVE_WORK.md.
// ─────────────────────────────────────────────────────────────────────────────
interface YearSnapshot {
  year: number
  totalContracts: number
  criticalPct: number
  highPct: number
  mediumPct: number
  lowPct: number
  highlight?: { en: string; es: string }
}

const YEAR_SNAPSHOTS: YearSnapshot[] = [
  { year: 2008, totalContracts:  82_000, criticalPct: 4.5, highPct: 5.2, mediumPct: 22.0, lowPct: 68.3, highlight: { en: 'IMSS ghost-company network begins', es: 'inicia red fantasma IMSS' } },
  { year: 2009, totalContracts:  98_000, criticalPct: 4.8, highPct: 5.5, mediumPct: 22.5, lowPct: 67.2 },
  { year: 2010, totalContracts: 110_000, criticalPct: 5.0, highPct: 5.8, mediumPct: 23.0, lowPct: 66.2, highlight: { en: 'La Estafa Maestra origins', es: 'orígenes Estafa Maestra' } },
  { year: 2011, totalContracts: 125_000, criticalPct: 5.2, highPct: 6.0, mediumPct: 23.5, lowPct: 65.3 },
  { year: 2012, totalContracts: 140_000, criticalPct: 5.5, highPct: 6.4, mediumPct: 24.5, lowPct: 63.6, highlight: { en: 'Calderón → Peña Nieto transition', es: 'transición Calderón → Peña Nieto' } },
  { year: 2013, totalContracts: 152_000, criticalPct: 5.8, highPct: 6.8, mediumPct: 25.2, lowPct: 62.2 },
  { year: 2014, totalContracts: 161_000, criticalPct: 6.5, highPct: 7.1, mediumPct: 25.8, lowPct: 60.6, highlight: { en: 'Oceanografía-PEMEX, Casa Blanca', es: 'Oceanografía-PEMEX, Casa Blanca' } },
  { year: 2015, totalContracts: 168_000, criticalPct: 6.7, highPct: 7.3, mediumPct: 26.2, lowPct: 59.8 },
  { year: 2016, totalContracts: 174_000, criticalPct: 7.0, highPct: 7.5, mediumPct: 26.5, lowPct: 59.0, highlight: { en: 'Odebrecht-PEMEX bribery surfaces', es: 'sobornos Odebrecht-PEMEX' } },
  { year: 2017, totalContracts: 178_000, criticalPct: 6.8, highPct: 7.4, mediumPct: 26.8, lowPct: 59.0, highlight: { en: 'Estafa Maestra published', es: 'Estafa Maestra publicada' } },
  { year: 2018, totalContracts: 175_000, criticalPct: 6.5, highPct: 7.2, mediumPct: 26.5, lowPct: 59.8, highlight: { en: 'Peña Nieto → AMLO transition', es: 'transición Peña → AMLO' } },
  { year: 2019, totalContracts: 188_000, criticalPct: 7.5, highPct: 7.8, mediumPct: 27.0, lowPct: 57.7, highlight: { en: 'Segalmex begins; AMLO pharma veto', es: 'Segalmex inicia; veto farmacéutico AMLO' } },
  { year: 2020, totalContracts: 215_000, criticalPct: 9.5, highPct: 9.0, mediumPct: 28.5, lowPct: 53.0, highlight: { en: 'COVID emergency procurement spike (87% DA)', es: 'pico compras emergencia COVID (87% AD)' } },
  { year: 2021, totalContracts: 205_000, criticalPct: 8.0, highPct: 8.2, mediumPct: 27.8, lowPct: 56.0 },
  { year: 2022, totalContracts: 198_000, criticalPct: 7.0, highPct: 7.6, mediumPct: 27.2, lowPct: 58.2, highlight: { en: 'Edenred voucher cartel surfaces', es: 'cartel vales Edenred sale a luz' } },
  { year: 2023, totalContracts: 202_000, criticalPct: 6.5, highPct: 7.4, mediumPct: 27.0, lowPct: 59.1, highlight: { en: 'Toka IT monopoly investigation', es: 'investigación monopolio TIC Toka' } },
  { year: 2024, totalContracts: 195_000, criticalPct: 6.0, highPct: 7.4, mediumPct: 26.8, lowPct: 59.8, highlight: { en: 'AMLO → Sheinbaum transition', es: 'transición AMLO → Sheinbaum' } },
  { year: 2025, totalContracts:  85_000, criticalPct: 5.8, highPct: 7.2, mediumPct: 26.5, lowPct: 60.5, highlight: { en: 'Sheinbaum year 1 (partial year)', es: 'Año 1 Sheinbaum (año parcial)' } },
]

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY TOURS — preset narrated sequences through (mode, year, pin) states.
// Each tour is a story that the page tells itself, with a narration line that
// updates per step. Click a tour, watch the universe re-form to match.
// ─────────────────────────────────────────────────────────────────────────────
interface TourStep {
  mode: ConstellationMode
  year: number               // actual year value (we resolve to index at runtime)
  pinnedCode: string | null
  narration: { en: string; es: string }
  durationMs: number
}
interface Tour {
  id: string
  title: { en: string; es: string }
  blurb: { en: string; es: string }
  accent: string
  steps: TourStep[]
}

const ATLAS_TOURS: Tour[] = [
  {
    id: 'covid_spike',
    title: { en: 'The COVID Spike', es: 'El Pico COVID' },
    blurb: { en: 'Watch the critical-risk bloom in 2020', es: 'Observa el bloom crítico de 2020' },
    accent: '#dc2626',
    steps: [
      { mode: 'patterns', year: 2019, pinnedCode: null,  narration: { en: 'Pre-pandemic — the field looks like every other year. AMLO\'s first full year.', es: 'Pre-pandemia — el campo se ve como cualquier otro año. Primer año pleno de AMLO.' }, durationMs: 3200 },
      { mode: 'patterns', year: 2020, pinnedCode: 'P5',  narration: { en: 'COVID emergency procurement. Direct-award rate jumps to 87%. P5 (Systematic Overpricing) blooms.', es: 'Compras COVID. Adjudicación directa salta a 87%. P5 (Sobreprecio) florece.' }, durationMs: 4500 },
      { mode: 'patterns', year: 2021, pinnedCode: 'P5',  narration: { en: '2021 stays elevated. The "emergency" never fully ended.', es: '2021 sigue elevado. La "emergencia" nunca terminó del todo.' }, durationMs: 3500 },
      { mode: 'patterns', year: 2022, pinnedCode: 'P5',  narration: { en: 'Levels begin to recede — but the new baseline is higher than 2018.', es: 'Niveles bajan — pero la nueva base es mayor que 2018.' }, durationMs: 3500 },
    ],
  },
  {
    id: 'pharma_cartel',
    title: { en: 'The Pharma Cartel', es: 'El Cártel Farmacéutico' },
    blurb: { en: 'COFECE 2018 → AMLO veto 2019', es: 'COFECE 2018 → veto AMLO 2019' },
    accent: '#dc2626',
    steps: [
      { mode: 'categories', year: 2017, pinnedCode: 'medicamentos', narration: { en: 'Medicamentos category — IMSS pharma supply at full opacity.', es: 'Categoría Medicamentos — suministro IMSS a opacidad plena.' }, durationMs: 3500 },
      { mode: 'categories', year: 2018, pinnedCode: 'medicamentos', narration: { en: 'COFECE opens cartel investigation against the pharma distributors.', es: 'COFECE abre investigación de cártel contra distribuidores.' }, durationMs: 3500 },
      { mode: 'patterns',   year: 2019, pinnedCode: 'P5',           narration: { en: 'Switch lens: P5 (Systematic Overpricing) — where Grupo Farmacos lives. AMLO publicly vetoes the cartel.', es: 'Cambio de lente: P5 (Sobreprecio) — donde vive Grupo Farmacos. AMLO veta públicamente al cártel.' }, durationMs: 4500 },
      { mode: 'patterns',   year: 2020, pinnedCode: 'P5',           narration: { en: 'COVID emergency procurement keeps pharma channels active despite the veto.', es: 'Compras COVID mantienen canales farmacéuticos activos pese al veto.' }, durationMs: 3500 },
    ],
  },
  {
    id: 'edenred',
    title: { en: 'The Voucher Cartel', es: 'El Cártel de Vales' },
    blurb: { en: 'Edenred 96.7% T1 across federal vouchers', es: 'Edenred 96.7% T1 en vales federales' },
    accent: '#16a34a',
    steps: [
      { mode: 'categories', year: 2018, pinnedCode: 'vales',        narration: { en: 'Vouchers (Vales y Monederos) — small category, high concentration even in 2018.', es: 'Vales y Monederos — categoría pequeña, alta concentración ya en 2018.' }, durationMs: 3500 },
      { mode: 'categories', year: 2020, pinnedCode: 'vales',        narration: { en: 'COVID-era voucher disbursement scales — the captured channel runs hot.', es: 'Vales en pandemia escalan — el canal capturado se calienta.' }, durationMs: 3500 },
      { mode: 'patterns',   year: 2022, pinnedCode: 'P1',           narration: { en: 'P1 (Concentrated Monopoly) lens — Edenred cartel surfaces in the press.', es: 'Lente P1 (Monopolio Concentrado) — cartel Edenred sale a la prensa.' }, durationMs: 4500 },
      { mode: 'patterns',   year: 2023, pinnedCode: 'P1',           narration: { en: 'Investigations open. The cluster doesn\'t shrink — it just becomes documented.', es: 'Se abren investigaciones. El cúmulo no se encoge — solo se vuelve documentado.' }, durationMs: 3500 },
    ],
  },
  {
    id: 'sexenios',
    title: { en: 'Five Administrations', es: 'Cinco Sexenios' },
    blurb: { en: 'Constellation evolves through 5 presidents', es: 'Constelación a través de 5 presidentes' },
    accent: '#a06820',
    steps: [
      { mode: 'sexenios', year: 2010, pinnedCode: 'calderon',  narration: { en: 'Calderón era — drug war, SEDENA contracts escalate. Critical clusters small.', es: 'Sexenio Calderón — narco-guerra, contratos SEDENA escalan. Cúmulos críticos pequeños.' }, durationMs: 3500 },
      { mode: 'sexenios', year: 2014, pinnedCode: 'pena',      narration: { en: 'Peña Nieto — Estafa Maestra origins, Casa Blanca, Oceanografía-PEMEX. Constellation thickens.', es: 'Peña Nieto — orígenes Estafa Maestra, Casa Blanca, Oceanografía. La constelación se espesa.' }, durationMs: 4000 },
      { mode: 'sexenios', year: 2020, pinnedCode: 'amlo',      narration: { en: 'AMLO — Segalmex, Tren Maya, COVID emergency. Highest sustained T1 concentration.', es: 'AMLO — Segalmex, Tren Maya, emergencia COVID. Mayor concentración T1 sostenida.' }, durationMs: 4000 },
      { mode: 'sexenios', year: 2025, pinnedCode: 'sheinbaum', narration: { en: 'Sheinbaum year 1 — partial. Early signs of continuity in direct-award practice.', es: 'Año 1 Sheinbaum — parcial. Señales tempranas de continuidad en adjudicación directa.' }, durationMs: 3500 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Atlas-density category meta — 32 categories. Positions are hand-tuned in a
// 6×6-ish field so they distribute without overlap. T1 weighting is calibrated
// against ARIA pattern memberships per category.
// ─────────────────────────────────────────────────────────────────────────────
function buildAtlasCategoriesMeta(isEs: boolean): ClusterMeta[] {
  // Category positions: spread across (fx, fy) in [0..1]². Grouped loosely by
  // sector to give the constellation natural sector "neighborhoods".
  return [
    // Health (top-left cluster)
    { code: 'medicamentos',   label: isEs ? 'Medicamentos' : 'Pharmaceuticals',     desc: isEs ? '1.1B MXN · IMSS captura · Grupo Farmacos cartel' : '1.1B MXN · IMSS capture · Grupo Farmacos cartel',          color: '#dc2626', vendors: 8200,  t1: 42, highRiskPct: 0.55, fx: 0.10, fy: 0.16 },
    { code: 'equipo_medico',  label: isEs ? 'Equipo Médico' : 'Medical Equipment',  desc: isEs ? '380B MXN · IMSS/ISSSTE · sobreprecio histórico' : '380B MXN · IMSS/ISSSTE · historical overpricing',           color: '#dc2626', vendors: 4500,  t1: 22, highRiskPct: 0.52, fx: 0.20, fy: 0.10 },
    { code: 'consumibles',    label: isEs ? 'Consumibles Médicos' : 'Medical Consumables', desc: isEs ? '180B MXN · suturas, gasas, jeringas' : '180B MXN · sutures, gauze, syringes',                          color: '#dc2626', vendors: 6100,  t1: 14, highRiskPct: 0.48, fx: 0.32, fy: 0.10 },
    { code: 'serv_salud',     label: isEs ? 'Servicios de Salud' : 'Health Services', desc: isEs ? '160B MXN · subrogación, traslados' : '160B MXN · subcontracting, transfers',                                color: '#dc2626', vendors: 1900,  t1: 9,  highRiskPct: 0.43, fx: 0.42, fy: 0.06 },

    // Energy (top-center)
    { code: 'combustibles',   label: isEs ? 'Combustibles' : 'Fuel & Energy',       desc: isEs ? '980B MXN · PEMEX/CFE · monopolio estructural' : '980B MXN · PEMEX/CFE · structural monopoly',                color: '#eab308', vendors: 1400,  t1: 18, highRiskPct: 0.42, fx: 0.55, fy: 0.10 },
    { code: 'serv_petroleros', label: isEs ? 'Servicios Petroleros' : 'Oil Services', desc: isEs ? '420B MXN · Cotemar · 100% T1' : '420B MXN · Cotemar · 100% T1',                                              color: '#eab308', vendors: 280,   t1: 21, highRiskPct: 0.78, fx: 0.66, fy: 0.06 },
    { code: 'electricidad',   label: isEs ? 'Equipo Eléctrico' : 'Electrical Equipment', desc: isEs ? '210B MXN · transformadores, cables' : '210B MXN · transformers, cables',                                  color: '#eab308', vendors: 950,   t1: 8,  highRiskPct: 0.40, fx: 0.76, fy: 0.10 },
    { code: 'energias_renov', label: isEs ? 'Energías Renovables' : 'Renewable Energy', desc: isEs ? '85B MXN · solar, eólica · alto crecimiento' : '85B MXN · solar, wind · high growth',                       color: '#eab308', vendors: 380,   t1: 4,  highRiskPct: 0.35, fx: 0.86, fy: 0.06 },

    // Tech (top-right)
    { code: 'tic',            label: isEs ? 'Tecnología (TIC)' : 'IT Services',     desc: isEs ? '620B MXN · Toka, Mainbit · monopolios documentados' : '620B MXN · Toka, Mainbit · documented monopolies',     color: '#8b5cf6', vendors: 3100,  t1: 29, highRiskPct: 0.68, fx: 0.92, fy: 0.20 },
    { code: 'telecom',        label: isEs ? 'Telecomunicaciones' : 'Telecommunications', desc: isEs ? '210B MXN · enlaces, internet, datos' : '210B MXN · links, internet, data',                                color: '#8b5cf6', vendors: 950,   t1: 9,  highRiskPct: 0.49, fx: 0.94, fy: 0.32 },
    { code: 'software',       label: isEs ? 'Software y Licencias' : 'Software & Licensing', desc: isEs ? '95B MXN · ERP, ofimática, especializado' : '95B MXN · ERP, productivity, specialized',                color: '#8b5cf6', vendors: 1200,  t1: 6,  highRiskPct: 0.44, fx: 0.92, fy: 0.46 },

    // Infrastructure (middle band)
    { code: 'obra_publica',   label: isEs ? 'Obra Pública' : 'Public Works',        desc: isEs ? '870B MXN · SCT · fraude ejecución invisible' : '870B MXN · SCT · invisible execution fraud',                  color: '#ea580c', vendors: 6800,  t1: 36, highRiskPct: 0.51, fx: 0.16, fy: 0.32 },
    { code: 'materiales',     label: isEs ? 'Materiales de Construcción' : 'Construction Materials', desc: isEs ? '320B MXN · cemento, acero, agregados' : '320B MXN · cement, steel, aggregates',                color: '#ea580c', vendors: 3200,  t1: 12, highRiskPct: 0.42, fx: 0.28, fy: 0.30 },
    { code: 'vehiculos',      label: isEs ? 'Vehículos y Transporte' : 'Vehicles & Transport', desc: isEs ? '410B MXN · ambulancias, autobuses' : '410B MXN · ambulances, buses',                                color: '#ea580c', vendors: 2900,  t1: 14, highRiskPct: 0.46, fx: 0.40, fy: 0.34 },
    { code: 'maquinaria',     label: isEs ? 'Maquinaria Pesada' : 'Heavy Machinery', desc: isEs ? '195B MXN · grúas, excavadoras, perforadoras' : '195B MXN · cranes, excavators, drills',                       color: '#ea580c', vendors: 720,   t1: 6,  highRiskPct: 0.39, fx: 0.51, fy: 0.30 },
    { code: 'mantenimiento',  label: isEs ? 'Mantenimiento' : 'Maintenance Services', desc: isEs ? '275B MXN · servicios continuos, hidráulico' : '275B MXN · ongoing services, hydraulic',                       color: '#ea580c', vendors: 4100,  t1: 18, highRiskPct: 0.45, fx: 0.62, fy: 0.34 },
    { code: 'agua',           label: isEs ? 'Agua y Drenaje' : 'Water & Sewerage',   desc: isEs ? '140B MXN · CONAGUA · contratos rotativos' : '140B MXN · CONAGUA · rotating contracts',                          color: '#10b981', vendors: 1100,  t1: 8,  highRiskPct: 0.51, fx: 0.74, fy: 0.30 },

    // Government services (middle-right)
    { code: 'serv_prof',      label: isEs ? 'Servicios Profesionales' : 'Professional Services', desc: isEs ? '540B MXN · Estafa Maestra origen' : '540B MXN · Estafa Maestra origin',                            color: '#be123c', vendors: 12000, t1: 31, highRiskPct: 0.59, fx: 0.85, fy: 0.62 },
    { code: 'consultoria',    label: isEs ? 'Consultoría Jurídica' : 'Legal Consulting', desc: isEs ? '180B MXN · litigio, fiscal' : '180B MXN · litigation, fiscal',                                              color: '#be123c', vendors: 2400,  t1: 7,  highRiskPct: 0.44, fx: 0.92, fy: 0.74 },
    { code: 'publicidad',     label: isEs ? 'Publicidad Oficial' : 'Official Publicity', desc: isEs ? '95B MXN · medios, propaganda' : '95B MXN · media, propaganda',                                              color: '#be123c', vendors: 1800,  t1: 9,  highRiskPct: 0.55, fx: 0.86, fy: 0.84 },
    { code: 'imprenta',       label: isEs ? 'Imprenta' : 'Printing',                  desc: isEs ? '38B MXN · oficial, electoral' : '38B MXN · official, electoral',                                                color: '#be123c', vendors: 950,   t1: 4,  highRiskPct: 0.41, fx: 0.93, fy: 0.92 },

    // Other / commercial
    { code: 'vales',          label: isEs ? 'Vales y Monederos' : 'Vouchers & E-cards', desc: isEs ? '240B MXN · Edenred 96.7% · monopolio' : '240B MXN · Edenred 96.7% · monopoly',                              color: '#16a34a', vendors: 80,    t1: 6,  highRiskPct: 0.71, fx: 0.10, fy: 0.50 },
    { code: 'seguros',        label: isEs ? 'Seguros' : 'Insurance',                  desc: isEs ? '125B MXN · de bienes, gastos médicos' : '125B MXN · property, medical',                                        color: '#16a34a', vendors: 240,   t1: 3,  highRiskPct: 0.32, fx: 0.20, fy: 0.50 },
    { code: 'arrendamiento',  label: isEs ? 'Arrendamiento' : 'Leasing',              desc: isEs ? '180B MXN · vehicular, equipo TI' : '180B MXN · vehicle, IT equipment',                                          color: '#16a34a', vendors: 540,   t1: 5,  highRiskPct: 0.40, fx: 0.30, fy: 0.50 },
    { code: 'limpieza',       label: isEs ? 'Limpieza y Vigilancia' : 'Cleaning & Security', desc: isEs ? '180B MXN · servicios bajo escrutinio' : '180B MXN · low-scrutiny services',                              color: '#64748b', vendors: 5600,  t1: 11, highRiskPct: 0.43, fx: 0.40, fy: 0.50 },
    { code: 'papeleria',      label: isEs ? 'Papelería y Oficina' : 'Office Supplies', desc: isEs ? '95B MXN · alta volumen, baja revisión' : '95B MXN · high volume, low scrutiny',                                color: '#64748b', vendors: 7200,  t1: 8,  highRiskPct: 0.38, fx: 0.50, fy: 0.50 },
    { code: 'mobiliario',     label: isEs ? 'Mobiliario' : 'Furniture',               desc: isEs ? '52B MXN · escolar, oficina, hospital' : '52B MXN · school, office, hospital',                                  color: '#64748b', vendors: 1900,  t1: 4,  highRiskPct: 0.35, fx: 0.60, fy: 0.50 },
    { code: 'uniformes',      label: isEs ? 'Uniformes y Textiles' : 'Uniforms & Textiles', desc: isEs ? '68B MXN · escolar, militar, médico' : '68B MXN · school, military, medical',                              color: '#64748b', vendors: 1450,  t1: 5,  highRiskPct: 0.37, fx: 0.70, fy: 0.50 },

    // Bottom row — agriculture / education
    { code: 'alimentos',      label: isEs ? 'Alimentos' : 'Food & Distribution',     desc: isEs ? '290B MXN · Segalmex · MX$15B desviados' : '290B MXN · Segalmex · MX$15B diverted',                              color: '#22c55e', vendors: 1800,  t1: 17, highRiskPct: 0.66, fx: 0.10, fy: 0.84 },
    { code: 'agric_insumos',  label: isEs ? 'Insumos Agrícolas' : 'Agricultural Inputs', desc: isEs ? '110B MXN · fertilizantes, semillas' : '110B MXN · fertilizers, seeds',                                      color: '#22c55e', vendors: 920,   t1: 6,  highRiskPct: 0.46, fx: 0.22, fy: 0.86 },
    { code: 'libros',         label: isEs ? 'Libros y Textos' : 'Textbooks',         desc: isEs ? '78B MXN · SEP · concentración alta' : '78B MXN · SEP · high concentration',                                    color: '#3b82f6', vendors: 380,   t1: 5,  highRiskPct: 0.49, fx: 0.36, fy: 0.86 },
    { code: 'becas',          label: isEs ? 'Becas y Subsidios' : 'Scholarships & Subsidies', desc: isEs ? '210B MXN · transferencias directas' : '210B MXN · direct transfers',                                  color: '#3b82f6', vendors: 220,   t1: 2,  highRiskPct: 0.28, fx: 0.50, fy: 0.86 },
    { code: 'capacitacion',   label: isEs ? 'Capacitación' : 'Training Services',    desc: isEs ? '54B MXN · talleres, certificación' : '54B MXN · workshops, certification',                                     color: '#3b82f6', vendors: 1600,  t1: 3,  highRiskPct: 0.34, fx: 0.62, fy: 0.86 },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Build risk-distribution rows from a year snapshot.
// ─────────────────────────────────────────────────────────────────────────────
function snapshotToRows(s: YearSnapshot): ConstellationRiskRow[] {
  const total = s.totalContracts
  const cCount = Math.round(total * s.criticalPct / 100)
  const hCount = Math.round(total * s.highPct / 100)
  const mCount = Math.round(total * s.mediumPct / 100)
  const lCount = total - cCount - hCount - mCount
  return [
    { level: 'critical', count: cCount, pct: s.criticalPct },
    { level: 'high',     count: hCount, pct: s.highPct },
    { level: 'medium',   count: mCount, pct: s.mediumPct },
    { level: 'low',      count: lCount, pct: s.lowPct },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// ClusterDetailPanel — slides in from the right when a cluster is clicked.
// ─────────────────────────────────────────────────────────────────────────────
interface ClusterDetailPanelProps {
  meta: ClusterMeta | null
  mode: ConstellationMode
  pinnedCode: string | null
  note: string
  onNoteChange: (text: string) => void
  onTogglePin: () => void
  onClose: () => void
  lang: 'en' | 'es'
}

function ClusterDetailPanel({ meta, mode, pinnedCode, note, onNoteChange, onTogglePin, onClose, lang }: ClusterDetailPanelProps) {
  const navigate = useNavigate()
  const isPinned = !!meta && pinnedCode === meta.code

  const investigateLink = useMemo(() => {
    if (!meta) return '/aria'
    if (mode === 'patterns') return `/clusters#${meta.code}`
    if (mode === 'sectors')  return `/sectors?sector=${meta.code}`
    if (mode === 'categories') return `/sectors?view=categories&category=${meta.code}`
    return '/administrations'
  }, [meta, mode])

  return (
    <AnimatePresence>
      {meta && (
        <motion.aside
          key="cluster-panel"
          className="fixed top-0 right-0 h-full z-50 surface-card border-l-2 shadow-2xl flex flex-col"
          style={{ width: 'min(420px, 92vw)', borderLeftColor: meta.color }}
          initial={{ x: 440, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 440, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label={`${meta.label} — cluster details`}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border/60">
            <div className="min-w-0 pr-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-1" style={{ color: meta.color }}>
                {mode === 'patterns'   && (lang === 'en' ? `${meta.code} · PATTERN`     : `${meta.code} · PATRÓN`)}
                {mode === 'sectors'    && (lang === 'en' ? 'SECTOR'                      : 'SECTOR')}
                {mode === 'categories' && (lang === 'en' ? 'SPENDING CATEGORY'           : 'CATEGORÍA DE GASTO')}
                {mode === 'sexenios'   && (lang === 'en' ? 'PRESIDENTIAL TERM'           : 'SEXENIO')}
              </div>
              <h2 className="font-serif font-extrabold text-[24px] leading-[1.05] tracking-[-0.01em] text-text-primary"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {meta.label}
              </h2>
              {meta.kicker && (
                <div className="text-[11px] font-mono text-text-muted mt-1">{meta.kicker}</div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onTogglePin}
                className="p-1 rounded-sm hover:bg-background-elevated/60 transition-colors"
                aria-label={isPinned ? (lang === 'en' ? 'Unpin cluster' : 'Despinear cúmulo') : (lang === 'en' ? 'Pin cluster' : 'Pinear cúmulo')}
                title={isPinned ? (lang === 'en' ? 'Pinned — click to unpin' : 'Pineado — clic para despinear') : (lang === 'en' ? 'Pin to keep highlighted across modes' : 'Pinear para destacar entre modos')}
              >
                {isPinned
                  ? <PinOff className="h-4 w-4" style={{ color: meta.color }} />
                  : <Pin className="h-4 w-4 text-text-muted" />
                }
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-sm hover:bg-background-elevated/60 transition-colors"
                aria-label={lang === 'en' ? 'Close cluster details' : 'Cerrar detalles'}
              >
                <X className="h-4 w-4 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Description */}
            <p className="text-sm leading-[1.7] text-text-secondary">
              {meta.desc}
            </p>

            {/* Stat grid */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {lang === 'en' ? 'VENDORS' : 'PROVEEDORES'}
                </div>
                <div className="font-mono font-bold text-[20px] leading-none mt-1 tabular-nums text-text-primary">
                  {formatNumber(meta.vendors)}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {lang === 'en' ? 'T1 LEADS' : 'LÍDERES T1'}
                </div>
                <div className="font-mono font-bold text-[20px] leading-none mt-1 tabular-nums" style={{ color: meta.color }}>
                  {meta.t1}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {lang === 'en' ? 'HIGH+CRIT' : 'ALTO+CRIT'}
                </div>
                <div className="font-mono font-bold text-[20px] leading-none mt-1 tabular-nums" style={{ color: meta.color }}>
                  {(meta.highRiskPct * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Risk band visualization */}
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-2">
                {lang === 'en' ? 'HIGH-RISK SHARE' : 'PROPORCIÓN DE ALTO RIESGO'}
              </div>
              <div className="relative h-[14px] rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{ background: meta.color, opacity: 0.85 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${meta.highRiskPct * 100}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                />
              </div>
            </div>

            {/* Why it matters / what to look for */}
            <div className="rounded-sm p-3" style={{ background: 'var(--color-border)' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1">
                {lang === 'en' ? 'WHAT TO LOOK FOR' : 'QUÉ BUSCAR'}
              </div>
              <p className="text-[11px] text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? `Click below to open the ${mode === 'patterns' ? 'investigation queue filtered to this pattern' : mode === 'sectors' ? 'sector profile' : mode === 'categories' ? 'category profile' : 'administrations comparison'} — the platform's surface for hand-investigating these vendors.`
                  : `Haz clic abajo para abrir ${mode === 'patterns' ? 'la cola de investigación filtrada por este patrón' : mode === 'sectors' ? 'el perfil del sector' : mode === 'categories' ? 'el perfil de la categoría' : 'la comparación de administraciones'} — la superficie de la plataforma para investigar estos proveedores a mano.`
                }
              </p>
            </div>

            {/* Personal notes (localStorage) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted inline-flex items-center gap-1.5">
                  <NotebookPen className="h-3 w-3" />
                  {lang === 'en' ? 'YOUR NOTES' : 'TUS NOTAS'}
                </div>
                {note && (
                  <span className="text-[8px] font-mono uppercase tracking-[0.1em]" style={{ color: '#a06820' }}>
                    {lang === 'en' ? 'saved locally' : 'guardado local'}
                  </span>
                )}
              </div>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder={lang === 'en'
                  ? 'What did you find when you investigated this cluster? Notes save automatically to your browser.'
                  : '¿Qué encontraste al investigar este cúmulo? Las notas se guardan automáticamente en tu navegador.'
                }
                className="w-full text-[12px] leading-[1.55] p-2.5 rounded-sm font-sans resize-y focus:outline-none transition-colors"
                style={{
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  minHeight: 70,
                  maxHeight: 200,
                }}
                aria-label={lang === 'en' ? 'Personal notes for this cluster' : 'Notas personales para este cúmulo'}
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="border-t border-border/60 p-4">
            <button
              onClick={() => navigate(investigateLink)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-mono uppercase tracking-[0.1em] text-[11px] font-bold transition-opacity hover:opacity-90"
              style={{ background: meta.color, color: 'var(--color-background)' }}
            >
              {lang === 'en' ? 'Investigate' : 'Investigar'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Year Scrubber — slider + autoplay control + year highlight annotation
// ─────────────────────────────────────────────────────────────────────────────
interface YearScrubberProps {
  yearIndex: number
  setYearIndex: (i: number) => void
  isPlaying: boolean
  setIsPlaying: (b: boolean) => void
  lang: 'en' | 'es'
}

function YearScrubber({ yearIndex, setYearIndex, isPlaying, setIsPlaying, lang }: YearScrubberProps) {
  const snapshot = YEAR_SNAPSHOTS[yearIndex]
  const minYear = YEAR_SNAPSHOTS[0].year
  const maxYear = YEAR_SNAPSHOTS[YEAR_SNAPSHOTS.length - 1].year

  return (
    <div className="surface-card rounded-sm p-3 sm:p-4">
      {/* Mobile: stack year-display + slider above the controls. Desktop: single row. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">

        {/* Year + slider — first on mobile, in middle on desktop */}
        <div className="flex items-center gap-3 min-w-0 sm:flex-1 sm:order-2">
          <div
            className="font-mono font-extrabold text-[22px] leading-none tabular-nums flex-shrink-0"
            style={{ color: '#a06820', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 }}
          >
            {snapshot.year}
          </div>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={YEAR_SNAPSHOTS.length - 1}
              value={yearIndex}
              onChange={(e) => setYearIndex(parseInt(e.target.value, 10))}
              className="w-full h-[6px] rounded-full cursor-pointer atlas-year-slider"
              aria-label={lang === 'en' ? 'Year scrubber' : 'Selector de año'}
            />
            <div className="flex items-center justify-between mt-1.5 px-1 text-[8px] font-mono text-text-muted">
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>
          </div>
          {/* Contracts pill — beside slider on mobile, separate column on desktop */}
          <div className="text-right flex-shrink-0 sm:hidden">
            <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
              {lang === 'en' ? 'CONTRACTS' : 'CONTRATOS'}
            </div>
            <div className="font-mono font-bold text-[14px] leading-none mt-1 tabular-nums text-text-primary">
              {formatNumber(snapshot.totalContracts)}
            </div>
          </div>
        </div>

        {/* Controls row — second on mobile, first on desktop */}
        <div className="flex items-center gap-2 sm:order-1">
          <button
            onClick={() => setYearIndex(Math.max(0, yearIndex - 1))}
            disabled={yearIndex === 0}
            className="p-1.5 rounded-sm hover:bg-background-elevated/60 disabled:opacity-30 transition-colors"
            aria-label={lang === 'en' ? 'Previous year' : 'Año anterior'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono uppercase tracking-[0.1em] text-[10px] font-bold transition-colors"
            style={{
              background: isPlaying ? '#dc2626' : 'var(--color-border)',
              color: isPlaying ? 'white' : 'var(--color-text-primary)',
            }}
            aria-label={isPlaying ? (lang === 'en' ? 'Pause' : 'Pausar') : (lang === 'en' ? 'Play' : 'Reproducir')}
          >
            {isPlaying
              ? <><Pause className="h-3 w-3" /> {lang === 'en' ? 'Pause' : 'Pausar'}</>
              : <><Play className="h-3 w-3" /> {lang === 'en' ? 'Autoplay' : 'Reproducir'}</>
            }
          </button>

          <button
            onClick={() => setYearIndex(Math.min(YEAR_SNAPSHOTS.length - 1, yearIndex + 1))}
            disabled={yearIndex === YEAR_SNAPSHOTS.length - 1}
            className="p-1.5 rounded-sm hover:bg-background-elevated/60 disabled:opacity-30 transition-colors"
            aria-label={lang === 'en' ? 'Next year' : 'Siguiente año'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Total contracts pill — desktop only (mobile shows it next to slider) */}
        <div className="text-right flex-shrink-0 hidden sm:block sm:order-3">
          <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {lang === 'en' ? 'CONTRACTS' : 'CONTRATOS'}
          </div>
          <div className="font-mono font-bold text-[14px] leading-none mt-1 tabular-nums text-text-primary">
            {formatNumber(snapshot.totalContracts)}
          </div>
        </div>
      </div>

      {/* Year highlight annotation */}
      <div className="border-t border-border/60 pt-2.5 min-h-[24px]">
        <AnimatePresence mode="wait">
          {snapshot.highlight ? (
            <motion.div
              key={snapshot.year}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2"
            >
              <span
                className="font-mono font-bold text-[10px] uppercase tracking-[0.14em] flex-shrink-0"
                style={{ color: '#dc2626' }}
              >
                ◆ {lang === 'en' ? 'KEY EVENT' : 'EVENTO CLAVE'}
              </span>
              <span className="text-[12px] text-text-secondary leading-tight">
                {snapshot.highlight[lang]}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key={`empty-${snapshot.year}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-text-muted"
            >
              <span style={{ color: '#a06820' }}>—</span> {lang === 'en' ? 'no major documented case this year' : 'sin caso documentado mayor este año'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom slider styling */}
      <style>{`
        .atlas-year-slider {
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(
            to right,
            #a06820 0%,
            #a06820 ${(yearIndex / (YEAR_SNAPSHOTS.length - 1)) * 100}%,
            var(--color-border) ${(yearIndex / (YEAR_SNAPSHOTS.length - 1)) * 100}%,
            var(--color-border) 100%
          );
        }
        .atlas-year-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
          border: 2px solid var(--color-background);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
          transition: transform 120ms ease;
        }
        .atlas-year-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .atlas-year-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
          border: 2px solid var(--color-background);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// useClusterNotes — localStorage-backed personal notes, keyed by cluster code.
// V3 lite annotation layer. V4 will move this to a backend table with per-user
// auth so notes can be shared across the team.
// ─────────────────────────────────────────────────────────────────────────────
const NOTES_STORAGE_KEY = 'rubli_atlas_notes_v1'

function loadNotes(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveNotes(notes: Record<string, string>) {
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // localStorage full or blocked — silently degrade
  }
}

function useClusterNotes(): {
  notes: Record<string, string>
  setNote: (code: string, text: string) => void
  deleteNote: (code: string) => void
  notesCount: number
} {
  const [notes, setNotes] = useState<Record<string, string>>(() => loadNotes())

  const setNote = (code: string, text: string) => {
    setNotes((cur) => {
      const next = { ...cur }
      const trimmed = text.trim()
      if (trimmed) next[code] = trimmed
      else delete next[code]
      saveNotes(next)
      return next
    })
  }

  const deleteNote = (code: string) => {
    setNotes((cur) => {
      const next = { ...cur }
      delete next[code]
      saveNotes(next)
      return next
    })
  }

  const notesCount = Object.keys(notes).length

  return { notes, setNote, deleteNote, notesCount }
}

// ─────────────────────────────────────────────────────────────────────────────
// VendorSearchBox — fuzzy typeahead across the curated KNOWN_VENDORS list.
// On select, calls onPick(vendor) which auto-pins the vendor's cluster code
// in the active mode.
// ─────────────────────────────────────────────────────────────────────────────
interface VendorSearchBoxProps {
  onPick: (v: VendorLookup) => void
  lang: 'en' | 'es'
}

function VendorSearchBox({ onPick, lang }: VendorSearchBoxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const matches = useMemo(() => searchKnownVendors(query), [query])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && matches[activeIdx]) {
      e.preventDefault()
      onPick(matches[activeIdx])
      setQuery('')
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" style={{ minWidth: 220 }}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'en' ? 'Find a vendor (Toka, Edenred, IMSS…)' : 'Buscar proveedor (Toka, Edenred…)'}
          className="w-full pl-8 pr-3 py-1.5 text-[11px] font-mono rounded-sm transition-colors focus:outline-none"
          style={{
            background: 'var(--color-background-elevated, var(--color-border))',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          aria-label={lang === 'en' ? 'Vendor search' : 'Buscar proveedor'}
        />
      </div>

      {open && matches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-[calc(100%+4px)] left-0 right-0 surface-card rounded-sm shadow-xl overflow-hidden z-30"
          style={{ border: '1px solid var(--color-border-hover)' }}
          role="listbox"
        >
          {matches.map((v, i) => {
            const isActive = i === activeIdx
            return (
              <button
                key={v.query}
                onMouseDown={(e) => { e.preventDefault(); onPick(v); setQuery(''); setOpen(false) }}
                onMouseEnter={() => setActiveIdx(i)}
                className="w-full text-left px-3 py-2 transition-colors block"
                style={{
                  background: isActive ? 'rgba(160,104,32,0.10)' : 'transparent',
                  borderBottom: i < matches.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
                role="option"
                aria-selected={isActive}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono font-bold text-[11px] text-text-primary truncate">
                    {v.displayName}
                  </span>
                  <span className="text-[8px] font-mono font-bold uppercase tracking-[0.1em] flex-shrink-0" style={{ color: '#a06820' }}>
                    {v.pattern} · {v.sector}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-text-muted truncate">
                  {v.blurb[lang]}
                </div>
              </button>
            )
          })}
          <div className="px-3 py-1.5 text-[8px] font-mono text-text-muted uppercase tracking-[0.1em]" style={{ background: 'var(--color-border)' }}>
            {lang === 'en' ? '↑↓ navigate · ↵ select · curated set of 21 vendors' : '↑↓ navegar · ↵ seleccionar · 21 proveedores curados'}
          </div>
        </motion.div>
      )}

      {open && query.length >= 2 && matches.length === 0 && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 right-0 surface-card rounded-sm shadow-xl px-3 py-2 z-30"
          style={{ border: '1px solid var(--color-border-hover)' }}
        >
          <div className="text-[10px] font-mono text-text-muted">
            {lang === 'en' ? `No curated match for "${query}". V4 will search all 320k vendors.` : `Sin coincidencias curadas para "${query}". V4 buscará en los 320k proveedores.`}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Atlas page
// ─────────────────────────────────────────────────────────────────────────────
export default function Atlas() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  const [mode, setMode] = useState<ConstellationMode>('patterns')
  const [yearIndex, setYearIndex] = useState<number>(YEAR_SNAPSHOTS.length - 1) // default to most recent
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [selectedClusterCode, setSelectedClusterCode] = useState<string | null>(null)
  const [pinnedCode, setPinnedCode] = useState<string | null>(null)
  // Most recently picked vendor — shown as a "Found X" badge near the toolbar.
  const [foundVendor, setFoundVendor] = useState<VendorLookup | null>(null)
  // Personal notes per cluster — localStorage-backed
  const { notes, setNote, notesCount } = useClusterNotes()
  // Replay tours
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [activeStep, setActiveStep] = useState<number>(0)
  const [toursMenuOpen, setToursMenuOpen] = useState<boolean>(false)
  // URL-state sharing
  const [searchParams, setSearchParams] = useSearchParams()
  const [shareJustCopied, setShareJustCopied] = useState<boolean>(false)
  // Risk-floor filter — when set, dots below the floor are dropped from the
  // population; remaining levels redistribute proportionally so the field
  // re-densifies around the focused band.
  const [riskFloor, setRiskFloor] = useState<'all' | 'medium' | 'high' | 'critical'>('all')
  // Compare mode — when true, render a second constellation card with its own year
  const [compareMode, setCompareMode] = useState<boolean>(false)
  // Year B defaults to a contrasting year vs year A — Peña 2014 vs COVID 2020
  const [yearIndexB, setYearIndexB] = useState<number>(
    YEAR_SNAPSHOTS.findIndex((s) => s.year === 2014),
  )
  const [isPlayingB, setIsPlayingB] = useState<boolean>(false)

  // Auto-play loop — advance year every 1.6s
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setYearIndex((y) => (y >= YEAR_SNAPSHOTS.length - 1 ? 0 : y + 1))
    }, 1600)
    return () => clearInterval(id)
  }, [isPlaying])

  // Auto-play loop for compare mode's second canvas
  useEffect(() => {
    if (!isPlayingB || !compareMode) return
    const id = setInterval(() => {
      setYearIndexB((y) => (y >= YEAR_SNAPSHOTS.length - 1 ? 0 : y + 1))
    }, 1600)
    return () => clearInterval(id)
  }, [isPlayingB, compareMode])

  // ─── REPLAY TOUR autoplay ──────────────────────────────────────────────
  // Each step applies (mode, year, pin) and waits its durationMs before
  // advancing. End of tour clears state.
  useEffect(() => {
    if (!activeTour) return
    const step = activeTour.steps[activeStep]
    if (!step) {
      setActiveTour(null)
      setActiveStep(0)
      return
    }
    // Apply step state
    setMode(step.mode)
    const yi = YEAR_SNAPSHOTS.findIndex((s) => s.year === step.year)
    if (yi >= 0) setYearIndex(yi)
    setPinnedCode(step.pinnedCode)
    setIsPlaying(false) // pause normal autoplay during a tour
    setSelectedClusterCode(null)

    const id = setTimeout(() => {
      if (activeStep + 1 < activeTour.steps.length) {
        setActiveStep(activeStep + 1)
      } else {
        setActiveTour(null)
        setActiveStep(0)
      }
    }, step.durationMs)
    return () => clearTimeout(id)
  }, [activeTour, activeStep])

  // ─── URL STATE: read params on mount, push state on change ──────────────
  // This lets users share a link to a specific atlas view.
  // ?lens=patterns&year=2020&pin=P5&compare=2014&floor=critical
  useEffect(() => {
    const lens = searchParams.get('lens') as ConstellationMode | null
    const year = searchParams.get('year')
    const pin = searchParams.get('pin')
    const compare = searchParams.get('compare')
    const floor = searchParams.get('floor') as typeof riskFloor | null

    if (lens && ['patterns', 'sectors', 'categories', 'sexenios'].includes(lens)) {
      setMode(lens)
    }
    if (year) {
      const yi = YEAR_SNAPSHOTS.findIndex((s) => String(s.year) === year)
      if (yi >= 0) setYearIndex(yi)
    }
    if (pin) {
      setPinnedCode(pin)
    }
    if (compare) {
      const yi = YEAR_SNAPSHOTS.findIndex((s) => String(s.year) === compare)
      if (yi >= 0) {
        setYearIndexB(yi)
        setCompareMode(true)
      }
    }
    if (floor && ['all', 'medium', 'high', 'critical'].includes(floor)) {
      setRiskFloor(floor)
    }
    // intentionally only on mount — searchParams reads should not loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL when state changes (debounced — avoids history spam during scrub)
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams()
      if (mode !== 'patterns') params.set('lens', mode)
      const curYear = YEAR_SNAPSHOTS[yearIndex]?.year
      if (curYear && curYear !== YEAR_SNAPSHOTS[YEAR_SNAPSHOTS.length - 1].year) {
        params.set('year', String(curYear))
      }
      if (pinnedCode) params.set('pin', pinnedCode)
      if (compareMode && YEAR_SNAPSHOTS[yearIndexB]) {
        params.set('compare', String(YEAR_SNAPSHOTS[yearIndexB].year))
      }
      if (riskFloor !== 'all') params.set('floor', riskFloor)
      setSearchParams(params, { replace: true })
    }, 250)
    return () => clearTimeout(id)
  }, [mode, yearIndex, pinnedCode, compareMode, yearIndexB, riskFloor, setSearchParams])

  // Live ARIA stats — used to show current T1 count in the toolbar
  const { data: ariaStats } = useQuery({
    queryKey: ['atlas', 'aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  // Pull live dashboard data — feeds yearly_trends overrides and risk fallback
  const { data: dashboard } = useQuery({
    queryKey: ['atlas', 'dashboard'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // Look up live yearly aggregates by year (when dashboard.yearly_trends is
  // present). When a real entry exists we use real contract counts AND scale
  // the snapshot's risk distribution by the real high_risk_pct — closer to
  // honest data, with snapshot pcts as the prior.
  const liveYearMap = useMemo(() => {
    const trends = (dashboard?.yearly_trends ?? []) as YearOverYearChange[]
    const m: Record<number, YearOverYearChange> = {}
    for (const t of trends) {
      if (t && typeof t.year === 'number') m[t.year] = t
    }
    return m
  }, [dashboard])

  // Track whether the current visible year has real data behind it (for caption).
  const usingLiveData = useMemo(() => {
    return liveYearMap[YEAR_SNAPSHOTS[yearIndex].year] !== undefined
  }, [liveYearMap, yearIndex])

  // Build effective snapshot for a given year — overrides totalContracts and
  // (when available) reshapes pcts using real high_risk_pct.
  const effectiveSnapshot = (yi: number): YearSnapshot => {
    const base = YEAR_SNAPSHOTS[yi]
    const live = liveYearMap[base.year]
    if (!live) return base

    const total = live.contracts && live.contracts > 0 ? live.contracts : base.totalContracts

    // If live high_risk_pct is provided, rescale critical+high pcts so their sum
    // matches it, while preserving the snapshot's critical:high ratio.
    let { criticalPct, highPct, mediumPct, lowPct } = base
    if (typeof live.high_risk_pct === 'number' && live.high_risk_pct > 0 && live.high_risk_pct < 100) {
      const baseHigh = base.criticalPct + base.highPct || 1
      const ratio = live.high_risk_pct / baseHigh
      criticalPct = base.criticalPct * ratio
      highPct = base.highPct * ratio
      const remaining = Math.max(0, 100 - criticalPct - highPct)
      const baseLow = base.mediumPct + base.lowPct || 1
      mediumPct = remaining * (base.mediumPct / baseLow)
      lowPct = remaining * (base.lowPct / baseLow)
    }

    return {
      year: base.year,
      totalContracts: total,
      criticalPct,
      highPct,
      mediumPct,
      lowPct,
      highlight: base.highlight,
    }
  }

  // Apply the risk floor by suppressing levels below the threshold and
  // proportionally redistributing the remaining percentages to sum to 100.
  // Counts stay as-is (informational); pcts are renormalized so the
  // constellation re-densifies around the focused band.
  const applyRiskFloor = (rs: ConstellationRiskRow[]): ConstellationRiskRow[] => {
    if (riskFloor === 'all') return rs
    const ORDER: ConstellationRiskRow['level'][] = ['critical', 'high', 'medium', 'low']
    const floorIdx = ORDER.indexOf(riskFloor as ConstellationRiskRow['level'])
    const allowed = new Set(ORDER.slice(0, floorIdx + 1))
    const filtered = rs.filter((r) => allowed.has(r.level))
    const totalPct = filtered.reduce((s, r) => s + r.pct, 0) || 1
    return filtered.map((r) => ({
      level: r.level,
      count: r.count,
      pct: (r.pct / totalPct) * 100,
    }))
  }

  // Current year's snapshot → constellation data (with live overrides if available)
  const snapshot = effectiveSnapshot(yearIndex)
  const rows = useMemo(() => applyRiskFloor(snapshotToRows(snapshot)), [snapshot, riskFloor])

  // Atlas-density category meta (32 entries) — only used in categories mode
  const atlasMeta: ClusterMeta[] | undefined = useMemo(() => {
    if (mode !== 'categories') return undefined
    return buildAtlasCategoriesMeta(lang === 'es')
  }, [mode, lang])

  // Fallback rows from /stats/dashboard/fast risk_distribution (already
  // fetched above for yearly_trends — reuse the same query).
  const fallbackRows: ConstellationRiskRow[] = useMemo(() => {
    const rd: RiskDistribution[] = Array.isArray(dashboard?.risk_distribution)
      ? (dashboard!.risk_distribution as RiskDistribution[])
      : []
    if (rd.length >= 4) {
      return rd.map((r) => ({
        level: r.risk_level as ConstellationRiskRow['level'],
        count: r.count,
        pct: r.percentage,
      }))
    }
    return rows
  }, [dashboard, rows])

  // Re-key the constellation per (mode, year) so each combination retriggers
  // the cinematic dot reveal animation.
  const constellationKey = `${mode}-${snapshot.year}`

  // Resolve selected cluster meta from the active meta set
  const selectedMeta: ClusterMeta | null = useMemo(() => {
    if (!selectedClusterCode) return null
    if (mode === 'categories' && atlasMeta) {
      return atlasMeta.find((m) => m.code === selectedClusterCode) ?? null
    }
    // For other modes the meta lives inside the constellation component;
    // we intentionally don't replicate that lookup here. The panel still
    // navigates correctly via mode + clusterCode.
    return {
      code: selectedClusterCode,
      label: selectedClusterCode.toUpperCase(),
      desc: lang === 'en' ? 'Open the dedicated page for full details.' : 'Abre la página dedicada para detalles completos.',
      color: '#a06820',
      vendors: 0,
      t1: 0,
      highRiskPct: 0,
      fx: 0.5,
      fy: 0.5,
    }
  }, [selectedClusterCode, mode, atlasMeta, lang])

  const handleClusterClick = (clusterCode: string) => {
    setSelectedClusterCode(clusterCode)
  }

  const totalContractsForYear = snapshot.totalContracts

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header className="mb-6">
        <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          {lang === 'en' ? 'PLATFORM · EXPLORATION' : 'PLATAFORMA · EXPLORACIÓN'}
        </div>
        <h1
          className="font-serif font-extrabold text-[32px] sm:text-[44px] md:text-[56px] leading-[1.02] tracking-[-0.02em] text-text-primary mb-3 text-balance"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {lang === 'en' ? <>El Atlas. <span style={{ color: '#a06820' }}>Every contract</span> in the universe.</> : <>El Atlas. <span style={{ color: '#a06820' }}>Cada contrato</span> en el universo.</>}
        </h1>
        <p className="text-base leading-[1.7] text-text-secondary max-w-[68ch] text-pretty">
          {lang === 'en'
            ? <>Each dot is a slice of Mexican federal procurement. Toggle the <strong className="text-text-primary">lens</strong> to re-organize them around patterns, sectors, categories, or presidential terms. Drag the <strong className="text-text-primary">year scrubber</strong> below — or hit autoplay — to watch the universe evolve through 18 years of contracts. Click any cluster to open its investigation surface.</>
            : <>Cada punto es una porción de la contratación federal mexicana. Cambia la <strong className="text-text-primary">lente</strong> para reorganizar el campo por patrones, sectores, categorías o sexenios. Arrastra el <strong className="text-text-primary">selector de año</strong> debajo — o pulsa reproducir — para ver el universo evolucionar a través de 18 años de contratos. Haz clic en cualquier cúmulo para abrir su superficie de investigación.</>
          }
        </p>
      </header>

      {/* ── Vendor search row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <VendorSearchBox
          lang={lang}
          onPick={(v) => {
            // If active mode is sexenios, switch to patterns since most known
            // vendors map cleanly to a pattern code.
            if (mode === 'sexenios') setMode('patterns')
            const code = vendorToClusterCode(v, mode === 'sexenios' ? 'patterns' : mode)
            setPinnedCode(code)
            setFoundVendor(v)
            setSelectedClusterCode(code)
          }}
        />

        {/* Tours menu */}
        <div className="relative">
          <button
            onClick={() => setToursMenuOpen(!toursMenuOpen)}
            className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm transition-colors uppercase tracking-[0.1em] font-bold"
            style={{
              background: activeTour ? '#dc2626' : 'transparent',
              color: activeTour ? 'white' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
            }}
            aria-expanded={toursMenuOpen}
            aria-label={lang === 'en' ? 'Replay tours' : 'Tours guiados'}
          >
            <Film className="h-3 w-3" />
            {activeTour
              ? (lang === 'en' ? `Tour: ${activeTour.title.en}` : `Tour: ${activeTour.title.es}`)
              : (lang === 'en' ? 'Tours' : 'Tours')
            }
          </button>
          {toursMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+4px)] left-0 surface-card rounded-sm shadow-xl overflow-hidden z-30"
              style={{ border: '1px solid var(--color-border-hover)', minWidth: 280 }}
              onMouseLeave={() => setToursMenuOpen(false)}
            >
              {ATLAS_TOURS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTour(t)
                    setActiveStep(0)
                    setToursMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2.5 transition-colors block hover:bg-background-elevated/40"
                  style={{ borderBottom: '1px solid var(--color-border)', borderLeft: `2px solid ${t.accent}` }}
                >
                  <div className="font-mono font-bold text-[11px] text-text-primary mb-0.5">
                    {t.title[lang]}
                  </div>
                  <div className="text-[9px] font-mono text-text-muted">
                    {t.blurb[lang]} · {t.steps.length} {lang === 'en' ? 'steps' : 'pasos'}
                  </div>
                </button>
              ))}
              {activeTour && (
                <button
                  onClick={() => { setActiveTour(null); setActiveStep(0); setToursMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-[0.1em] font-bold transition-colors"
                  style={{ background: 'var(--color-border)', color: '#dc2626' }}
                >
                  <Square className="h-3 w-3 inline mr-1.5" />
                  {lang === 'en' ? 'Stop current tour' : 'Detener tour'}
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Share link */}
        <button
          onClick={() => {
            const url = window.location.href
            navigator.clipboard?.writeText(url).then(() => {
              setShareJustCopied(true)
              setTimeout(() => setShareJustCopied(false), 2000)
            }).catch(() => {})
          }}
          className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm transition-colors uppercase tracking-[0.1em] font-bold"
          style={{
            background: shareJustCopied ? '#16a34a' : 'transparent',
            color: shareJustCopied ? 'white' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          aria-label={lang === 'en' ? 'Copy share link' : 'Copiar enlace'}
          title={lang === 'en' ? 'Copy a link to this exact view' : 'Copiar enlace a esta vista'}
        >
          {shareJustCopied
            ? <><Check className="h-3 w-3" /> {lang === 'en' ? 'Copied' : 'Copiado'}</>
            : <><Link2 className="h-3 w-3" /> {lang === 'en' ? 'Share view' : 'Compartir'}</>
          }
        </button>

        {foundVendor && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
            style={{ background: 'rgba(160,104,32,0.10)', color: '#a06820' }}
          >
            <Sparkles className="h-3 w-3" />
            <span className="opacity-80 uppercase tracking-[0.1em]">
              {lang === 'en' ? 'Found' : 'Encontrado'}:
            </span>
            <span className="font-bold">{foundVendor.displayName}</span>
            <span className="opacity-70">→ {foundVendor.pattern}</span>
            <button
              onClick={() => setFoundVendor(null)}
              className="ml-1 hover:opacity-70 transition-opacity"
              aria-label={lang === 'en' ? 'Clear' : 'Limpiar'}
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Toolbar: mode toggle + active stats ─────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div
          className="flex items-center text-[10px] font-mono uppercase tracking-[0.1em] rounded-sm overflow-hidden"
          role="tablist"
          aria-label={lang === 'en' ? 'Atlas lens' : 'Lente del Atlas'}
          style={{ border: '1px solid var(--color-border)' }}
        >
          {(
            [
              { id: 'patterns',   en: 'PATTERNS',   es: 'PATRONES' },
              { id: 'sectors',    en: 'SECTORS',    es: 'SECTORES' },
              { id: 'categories', en: 'CATEGORIES', es: 'CATEGORÍAS' },
              { id: 'sexenios',   en: 'TERMS',      es: 'SEXENIOS' },
            ] as Array<{ id: ConstellationMode; en: string; es: string }>
          ).map((m, i, arr) => {
            const isActive = mode === m.id
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setMode(m.id); setSelectedClusterCode(null) }}
                className="px-3.5 py-2 transition-colors"
                style={{
                  background: isActive ? '#a06820' : 'transparent',
                  color: isActive ? 'var(--color-background)' : 'var(--color-text-muted)',
                  borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {lang === 'en' ? m.en : m.es}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Pinned cluster badge */}
          {pinnedCode && (
            <button
              onClick={() => setPinnedCode(null)}
              className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-opacity hover:opacity-80"
              style={{ background: 'rgba(160,104,32,0.18)', color: '#a06820' }}
              title={lang === 'en' ? 'Click to unpin' : 'Clic para despinear'}
            >
              <Pin className="h-3 w-3" />
              <span className="font-bold uppercase tracking-[0.1em]">{lang === 'en' ? 'Pinned' : 'Pineado'}</span>
              <span className="opacity-90">{pinnedCode.slice(0, 14)}</span>
            </button>
          )}

          {/* Compare-mode toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm transition-colors uppercase tracking-[0.1em] font-bold"
            style={{
              background: compareMode ? '#a06820' : 'transparent',
              color: compareMode ? 'var(--color-background)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
            }}
            aria-pressed={compareMode}
          >
            <Layers className="h-3 w-3" />
            {lang === 'en' ? 'Compare years' : 'Comparar años'}
          </button>

          {/* Notes count badge */}
          {notesCount > 0 && (
            <div
              className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2 py-1 rounded-sm"
              style={{ background: 'rgba(160,104,32,0.10)', color: '#a06820' }}
              title={lang === 'en' ? 'Personal notes — saved in your browser' : 'Notas personales — guardadas en tu navegador'}
            >
              <NotebookPen className="h-3 w-3" />
              <span className="font-bold">{notesCount}</span>
              <span className="opacity-70">{lang === 'en' ? (notesCount === 1 ? 'note' : 'notes') : 'notas'}</span>
            </div>
          )}

          {/* Live T1 count */}
          <div className="text-[10px] font-mono text-text-muted inline-flex items-center gap-2">
            <span className="rounded-full" style={{ width: 6, height: 6, background: '#dc2626' }} />
            <span>{formatNumber(ariaStats?.latest_run?.tier1_count ?? 320)}</span>
            <span className="opacity-70">{lang === 'en' ? 'T1 · live' : 'T1 · en vivo'}</span>
          </div>
        </div>
      </div>

      {/* ── Risk-floor filter row ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
          {lang === 'en' ? 'X-RAY' : 'RAYOS X'}
        </span>
        <div
          className="flex items-center text-[9px] font-mono uppercase tracking-[0.08em] rounded-sm overflow-hidden"
          role="group"
          aria-label={lang === 'en' ? 'Risk floor filter' : 'Filtro mínimo de riesgo'}
          style={{ border: '1px solid var(--color-border)' }}
        >
          {(
            [
              { id: 'all',      en: 'all',         es: 'todos',     color: 'var(--color-text-muted)' },
              { id: 'medium',   en: 'medium+',     es: 'medio+',    color: '#a06820' },
              { id: 'high',     en: 'high+',       es: 'alto+',     color: '#f59e0b' },
              { id: 'critical', en: 'critical',    es: 'crítico',   color: '#dc2626' },
            ] as Array<{ id: typeof riskFloor; en: string; es: string; color: string }>
          ).map((f, i, arr) => {
            const isActive = riskFloor === f.id
            return (
              <button
                key={f.id}
                onClick={() => setRiskFloor(f.id)}
                className="px-2.5 py-1 transition-colors flex items-center gap-1.5"
                style={{
                  background: isActive ? f.color : 'transparent',
                  color: isActive ? (f.id === 'all' ? 'var(--color-background)' : 'white') : 'var(--color-text-muted)',
                  borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                }}
                aria-pressed={isActive}
              >
                {!isActive && (
                  <span className="rounded-full" style={{ width: 5, height: 5, background: f.color }} />
                )}
                {lang === 'en' ? f.en : f.es}
              </button>
            )
          })}
        </div>
        {riskFloor !== 'all' && (
          <span className="text-[9px] font-mono text-text-muted">
            {lang === 'en'
              ? 'showing only this band — dots redistribute to fill the field'
              : 'mostrando solo esta banda — puntos se redistribuyen'}
          </span>
        )}
      </div>

      {/* ── Tour narration overlay ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTour && activeTour.steps[activeStep] && (
          <motion.div
            key={`tour-${activeTour.id}-${activeStep}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="surface-card rounded-sm p-3 mb-3 border-l-2"
            style={{ borderLeftColor: activeTour.accent }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[8px] font-mono font-bold uppercase tracking-[0.14em]"
                    style={{ color: activeTour.accent }}
                  >
                    ◆ {lang === 'en' ? 'TOUR' : 'TOUR'} · {activeTour.title[lang]}
                  </span>
                  <span className="text-[8px] font-mono text-text-muted">
                    {activeStep + 1} / {activeTour.steps.length} · {YEAR_SNAPSHOTS[YEAR_SNAPSHOTS.findIndex((s) => s.year === activeTour.steps[activeStep].year)]?.year}
                  </span>
                </div>
                <p className="text-[12px] text-text-primary leading-[1.55] text-pretty">
                  {activeTour.steps[activeStep].narration[lang]}
                </p>
              </div>
              {/* Step progress dots + stop */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <div className="flex items-center gap-1">
                  {activeTour.steps.map((_, i) => (
                    <span
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width: i === activeStep ? 14 : 6,
                        height: 4,
                        background: i <= activeStep ? activeTour.accent : 'var(--color-border-hover)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { setActiveTour(null); setActiveStep(0) }}
                  className="p-1 rounded-sm hover:bg-background-elevated/60 transition-colors"
                  aria-label={lang === 'en' ? 'Stop tour' : 'Detener tour'}
                  title={lang === 'en' ? 'Stop tour' : 'Detener'}
                >
                  <Square className="h-3 w-3" style={{ color: activeTour.accent }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Constellation canvas A (always shown) ──────────────────────── */}
      {compareMode && (
        <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1.5 inline-flex items-center gap-1.5">
          <span className="font-bold" style={{ color: '#a06820' }}>● {lang === 'en' ? 'YEAR A' : 'AÑO A'}</span>
          <span>·</span>
          <span>{snapshot.year}</span>
        </div>
      )}
      <div className="surface-card rounded-sm p-3 md:p-4 mb-4">
        <ConcentrationConstellation
          key={constellationKey}
          rows={rows.length > 0 ? rows : fallbackRows}
          totalContracts={totalContractsForYear}
          mode={mode}
          metaOverride={atlasMeta}
          seedOverride={snapshot.year * 13 + (mode === 'patterns' ? 1 : mode === 'sectors' ? 2 : mode === 'categories' ? 3 : 4)}
          pinnedCode={pinnedCode}
          onClusterClick={handleClusterClick}
        />
      </div>

      {/* ── Year scrubber A ─────────────────────────────────────────── */}
      <YearScrubber
        yearIndex={yearIndex}
        setYearIndex={setYearIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        lang={lang}
      />

      {/* ── COMPARE MODE: second canvas + scrubber ─────────────────── */}
      {compareMode && (() => {
        const snapshotB = effectiveSnapshot(yearIndexB)
        const rowsB = applyRiskFloor(snapshotToRows(snapshotB))
        const totalContractsB = snapshotB.totalContracts
        const constellationKeyB = `B-${mode}-${snapshotB.year}`
        return (
          <>
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-6 mb-1.5 inline-flex items-center gap-1.5">
              <span className="font-bold" style={{ color: '#dc2626' }}>● {lang === 'en' ? 'YEAR B' : 'AÑO B'}</span>
              <span>·</span>
              <span>{snapshotB.year}</span>
            </div>
            <div className="surface-card rounded-sm p-3 md:p-4 mb-4">
              <ConcentrationConstellation
                key={constellationKeyB}
                rows={rowsB}
                totalContracts={totalContractsB}
                mode={mode}
                metaOverride={atlasMeta}
                seedOverride={snapshotB.year * 13 + 999 + (mode === 'patterns' ? 1 : mode === 'sectors' ? 2 : mode === 'categories' ? 3 : 4)}
                pinnedCode={pinnedCode}
                onClusterClick={handleClusterClick}
              />
            </div>
            <YearScrubber
              yearIndex={yearIndexB}
              setYearIndex={setYearIndexB}
              isPlaying={isPlayingB}
              setIsPlaying={setIsPlayingB}
              lang={lang}
            />
          </>
        )
      })()}

      {/* ── Editorial footer / methodology footnote ──────────────────── */}
      <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-text-muted leading-[1.6] text-pretty">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm mr-2 align-middle"
          style={{
            background: usingLiveData ? 'rgba(160,104,32,0.12)' : 'var(--color-border)',
            color: usingLiveData ? '#a06820' : 'var(--color-text-muted)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span
            className="rounded-full"
            style={{ width: 5, height: 5, background: usingLiveData ? '#16a34a' : 'var(--color-text-muted)' }}
          />
          {usingLiveData
            ? (lang === 'en' ? 'live · contracts + risk-pct from yearly_trends' : 'en vivo · contratos + riesgo desde yearly_trends')
            : (lang === 'en' ? 'illustrative snapshot' : 'instantánea ilustrativa')}
        </span>
        {lang === 'en'
          ? <>Categories lens shows 32 of 91 active spending categories — covers ~80% of federal spend by value. Vendor search uses a curated list of 21 known cases (V4 will search all 320k vendors). Personal notes save to your browser. See <a href="/methodology" className="text-[#a06820] hover:underline">methodology</a> for scope and limits.</>
          : <>La lente de categorías muestra 32 de 91 categorías activas — cubre ~80% del gasto federal por valor. La búsqueda de proveedor usa una lista curada de 21 casos (V4 buscará en los 320k). Las notas personales se guardan en tu navegador. Consulta la <a href="/methodology" className="text-[#a06820] hover:underline">metodología</a> para alcance y límites.</>
        }
      </div>

      {/* ── Cluster detail side panel ────────────────────────────────── */}
      <ClusterDetailPanel
        meta={selectedMeta}
        mode={mode}
        pinnedCode={pinnedCode}
        note={selectedMeta ? (notes[selectedMeta.code] ?? '') : ''}
        onNoteChange={(text) => {
          if (selectedMeta) setNote(selectedMeta.code, text)
        }}
        onTogglePin={() => {
          if (!selectedMeta) return
          setPinnedCode((cur) => (cur === selectedMeta.code ? null : selectedMeta.code))
        }}
        onClose={() => setSelectedClusterCode(null)}
        lang={lang}
      />
    </div>
  )
}
