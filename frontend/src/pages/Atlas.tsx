/**
 * El Observatorio — full-viewport exploration of the procurement universe.
 * (Internal symbol names — Atlas component, ATLAS_STORIES, atlasMode — keep
 * the legacy "atlas" prefix; renaming them is pure churn. The route also
 * stays /atlas to preserve URL identity and the rubli_atlas_visited_v1
 * localStorage flag. /observatorio and /observatory are added as route
 * aliases that redirect to /atlas — see App.tsx.)
 *
 * The dashboard's § 1 constellation at 220px is the elevator pitch. This
 * page is the walking tour: same constellation engine at full size, with
 * two extra axes the dashboard doesn't have:
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, ChevronLeft, ChevronRight, X, ArrowUpRight, Sparkles, Pin, PinOff, Layers, Search, NotebookPen, BookOpen, Square, Link2, Check, RotateCcw, SkipForward, FileText } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ATLAS_STORIES, type Story, type StoryChapter } from '@/lib/atlas-stories'
import { analysisApi, ariaApi } from '@/api/client'
import type { RiskDistribution, YearOverYearChange } from '@/api/types'
import {
  ConcentrationConstellation,
  buildPatternMeta,
  buildSectorMeta,
  buildSexenioMeta,
  type ConstellationMode,
  type ConstellationRiskRow,
  type ClusterMeta,
  type NamedVendorDot,
} from '@/components/charts/ConcentrationConstellation'
import { formatNumber, cn } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
// atlas-C-P1: three-pane investigator console shell
import { AtlasContextProvider, useAtlasState, useAtlasDispatch, type AtlasState } from '@/components/atlas/AtlasContext'
import { AtlasShell } from '@/components/atlas/AtlasShell'
import { AtlasLeftRail } from '@/components/atlas/AtlasLeftRail'
// atlas-C-P2: zoom state machine
import { AtlasZoomLayer } from '@/components/atlas/AtlasZoomLayer'
import { Z1SectorMap } from '@/components/atlas/Z1SectorMap'
import { SECTORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { AtlasMasthead } from '@/components/atlas/AtlasMasthead'
import { AtlasToolbar } from '@/components/atlas/AtlasToolbar'
// atlas-C-P5: URL state encode/decode
import { hasAtlasCParams } from '@/lib/atlas/url-state'
// omega-N: story-chart binding + named-outlier data hook
import { AtlasStoryBinding } from '@/components/atlas/AtlasStoryBinding'
import { useTopVendorsForCluster } from '@/lib/atlas/use-top-vendors'

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
  { query: 'MAYPO',                displayName: 'Farmacéuticos Maypo',           pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'Pharma cartel · 4-vendor 328.6B concentration', es: 'Cártel farmacéutico · concentración 4 proveedores 328.6B' } },
  { query: 'DIMM',                 displayName: 'DIMM',                          pattern: 'P5', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'Pharma cartel member · IMSS supplier', es: 'Miembro del cártel · proveedor IMSS' } },
  { query: 'BIRMEX',               displayName: 'BIRMEX',                        pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS pharma supplier', es: 'Proveedor farmacéutico IMSS' } },
  { query: 'COMPHARMA',            displayName: 'COMPHARMA',                     pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS DA capture (GT case)', es: 'Captura DA IMSS (caso GT)' } },
  { query: 'PIHCSA',               displayName: 'PIHCSA',                        pattern: 'P6', sector: 'salud',           category: 'medicamentos',  blurb: { en: 'IMSS pharma capture', es: 'Captura farmacéutica IMSS' } },
  // P3 intermediaries — pass-through signatures (5.3B avg ticket each)
  { query: 'ARHNOS',               displayName: 'Constructora ARHNOS',           pattern: 'P3', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: '32B / 6 contracts · 5.3B avg ticket', es: '32 mil M / 6 contratos · 5.3 mil M ticket promedio' } },
  { query: 'PROMOTORA',            displayName: 'Promotora y Desarrolladora MX', pattern: 'P3', sector: 'salud',           category: 'obra_publica',  blurb: { en: '21.1B / 3 IMSS contracts · 7B avg ticket', es: '21.1 mil M / 3 contratos IMSS · 7 mil M ticket' } },
  { query: 'CAABSA',               displayName: 'CAABSA Constructora',           pattern: 'P3', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: '9.2B / 3 CDMX contracts · pass-through', es: '9.2 mil M / 3 contratos CDMX · firma de paso' } },
  { query: 'GX2',                  displayName: 'GX2 Desarrollos',               pattern: 'P3', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: '5.9B / 2 Sinaloa contracts · risk 0.84', es: '5.9 mil M / 2 contratos Sinaloa · riesgo 0.84' } },
  { query: 'TECNICAS REUNIDAS',    displayName: 'Técnicas Reunidas (ES)',        pattern: 'P3', sector: 'energia',         category: 'serv_petroleros', blurb: { en: '7.2B / 2 PEMEX · legitimate sole-source', es: '7.2 mil M / 2 PEMEX · única fuente legítima' } },
  { query: 'PRIDE INTERNATIONAL',  displayName: 'Pride International (US)',      pattern: 'P3', sector: 'energia',         category: 'serv_petroleros', blurb: { en: '5.5B PEMEX offshore · sole-source spec', es: '5.5 mil M PEMEX costa afuera · única fuente' } },
  // Tech license direct-award cluster (≥95% DA, defensible sole-source)
  { query: 'MICROSOFT',            displayName: 'Microsoft (Corp / Licensing / Mexico)', pattern: 'P5', sector: 'tecnologia',     category: 'tic',           blurb: { en: '24.1B · 97-99% DA · proprietary tech', es: '24.1 mil M · 97-99% AD · tech propietaria' } },
  { query: 'ORACLE',               displayName: 'Oracle México',                 pattern: 'P5', sector: 'tecnologia',      category: 'tic',           blurb: { en: '8.3B · 98.4% DA · DB licensing', es: '8.3 mil M · 98.4% AD · licencia BD' } },
  { query: 'IBM',                  displayName: 'IBM México',                    pattern: 'P5', sector: 'tecnologia',      category: 'tic',           blurb: { en: '8.0B · 95.4% DA · enterprise license', es: '8.0 mil M · 95.4% AD · licencia empresarial' } },
  // Government media buys (red — routed without competition)
  { query: 'TELEVISA',             displayName: 'Televisa',                      pattern: 'P5', sector: 'gobernacion',     category: 'serv_prof',     blurb: { en: '7.1B · 99.7% DA · gov media buy', es: '7.1 mil M · 99.7% AD · gasto en medios' } },
  { query: 'AZTECA',               displayName: 'Estudios Azteca',               pattern: 'P5', sector: 'gobernacion',     category: 'serv_prof',     blurb: { en: '5.8B · 99.8% DA · gov media buy', es: '5.8 mil M · 99.8% AD · gasto en medios' } },
  // DICONSA staple-commodity supply chain
  { query: 'MOLINOS AZTECA',       displayName: 'Molinos Azteca',                pattern: 'P5', sector: 'agricultura',     category: 'alimentos',     blurb: { en: '7.6B · 99.9% DA · DICONSA flour', es: '7.6 mil M · 99.9% AD · harina DICONSA' } },
  { query: 'NESTLE',               displayName: 'Marcas Nestlé',                 pattern: 'P5', sector: 'agricultura',     category: 'alimentos',     blurb: { en: '4.4B · 99.9% DA · DICONSA dairy', es: '4.4 mil M · 99.9% AD · lácteos DICONSA' } },
  // Voucher cluster (welfare-program payment-card monopolies)
  { query: 'EFECTIVALE',           displayName: 'Efectivale',                    pattern: 'P5', sector: 'hacienda',        category: 'vales',         blurb: { en: '2,210 single-bid wins · 19.6B', es: '2,210 victorias oferta única · 19.6 mil M' } },
  { query: 'SODEXO',               displayName: 'Sodexo',                        pattern: 'P5', sector: 'hacienda',        category: 'vales',         blurb: { en: '658 single-bid wins · 5.2B', es: '658 victorias oferta única · 5.2 mil M' } },
  { query: 'SEGALMEX',             displayName: 'Seguridad Alimentaria Mexicana', pattern: 'P5', sector: 'agricultura',    category: 'alimentos',     blurb: { en: '1,014 single-bid · 5.3B at risk 0.94', es: '1,014 oferta única · 5.3 mil M riesgo 0.94' } },
  // Infrastructure
  { query: 'CICSA',                displayName: 'CICSA · Grupo Carso',           pattern: 'P1', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: 'Slim infrastructure conglomerate', es: 'Grupo Slim infraestructura' } },
  { query: 'CONDUMEX',             displayName: 'Condumex · Grupo Carso',        pattern: 'P1', sector: 'energia',         category: 'electricidad',  blurb: { en: 'Cables monopoly', es: 'Monopolio de cables' } },
  { query: 'ICA',                  displayName: 'ICA Constructora',              pattern: 'P5', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: '41.8B · 3 contracts · Tren Maya', es: '41.8 mil M · 3 contratos · Tren Maya' } },
  { query: 'ALSTOM',               displayName: 'Alstom Transport',              pattern: 'P5', sector: 'infraestructura', category: 'obra_publica',  blurb: { en: '37.9B · 2 contracts · Tren Maya · risk 0.92', es: '37.9 mil M · 2 contratos · Tren Maya · riesgo 0.92' } },
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
// Atlas-density category meta — 32 categories. Positions are hand-tuned in a
// 6×6-ish field so they distribute without overlap. T1 weighting is calibrated
// against ARIA pattern memberships per category.
// ─────────────────────────────────────────────────────────────────────────────
function buildAtlasCategoriesMeta(isEs: boolean): ClusterMeta[] {
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
// ClusterDetailPanel — REMOVED in M-OBS Phase 2.
// Replaced by <ClusterFloatingCard> (mounted inside the canvas via
// AtlasZoomLayer) and a future bottom drawer (<AtlasVendorDrawer>).
// The notes state (useClusterNotes hook) is preserved for reuse.
// ─────────────────────────────────────────────────────────────────────────────
function _ClusterDetailPanel_REMOVED({ meta, mode, pinnedCode, note, yearLabel, yearDeltaT1, yearDeltaPct, topVendors, onNoteChange, onTogglePin, onClose, lang }: {
  meta: ClusterMeta | null
  mode: ConstellationMode
  pinnedCode: string | null
  note: string
  yearLabel?: number
  yearDeltaT1?: number
  yearDeltaPct?: number
  topVendors?: NamedVendorDot[]
  onNoteChange: (text: string) => void
  onTogglePin: () => void
  onClose: () => void
  lang: 'en' | 'es'
}) {
  const navigate = useNavigate()
  const isPinned = !!meta && pinnedCode === meta.code

  const investigateLink = useMemo(() => {
    if (!meta) return '/aria'
    if (mode === 'patterns') return `/patterns/${meta.code}`
    if (mode === 'sectors')  return `/sectors?sector=${meta.code}`
    if (mode === 'categories') return `/sectors?view=categories&category=${meta.code}`
    return '/administrations'
  }, [meta, mode])

  return (
    <AnimatePresence>
      {meta && (
        <motion.aside
          key="cluster-panel"
          className="surface-card border-l-2 flex flex-col overflow-y-auto"
          style={{ width: '100%', height: '100%', borderLeftColor: meta.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
              <h2 className="font-serif font-extrabold text-[16px] leading-[1.15] tracking-[-0.01em] text-text-primary"
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

            {/* Top vendor list — shows top 3 critical vendors for this cluster */}
            {topVendors && topVendors.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-2">
                  {lang === 'en' ? 'TOP RISK VENDORS' : 'PROVEEDORES DE MAYOR RIESGO'}
                </div>
                <div className="space-y-0.5">
                  {topVendors.map((v) => {
                    const level = getRiskLevelFromScore(v.riskScore)
                    return (
                      <Link
                        key={v.vendorId}
                        to={`/thread/${v.vendorId}`}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm transition-colors group"
                        style={{ background: 'var(--color-background)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-mono text-text-secondary group-hover:text-text-primary truncate transition-colors">
                          {formatVendorName(v.name)}
                        </span>
                        <span className="text-[10px] font-mono font-bold tabular-nums shrink-0" style={{ color: RISK_COLORS[level] }}>
                          {(v.riskScore * 100).toFixed(0)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Year-delta indicator (V5) — shown when scrubbing years */}
            {yearLabel !== undefined && (yearDeltaT1 !== undefined || yearDeltaPct !== undefined) && (
              <div className="rounded-sm p-3 flex items-center gap-3" style={{ background: 'rgba(160,104,32,0.08)' }}>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted flex-shrink-0">
                  {lang === 'en' ? 'VS PREV. YEAR' : 'VS AÑO ANT.'}
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                  {yearDeltaT1 !== undefined && (
                    <span className="font-mono text-[12px] font-bold tabular-nums inline-flex items-center gap-1"
                      style={{ color: yearDeltaT1 >= 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                      {yearDeltaT1 >= 0 ? '↑' : '↓'} {Math.abs(yearDeltaT1)}
                      <span className="text-[8px] font-normal opacity-70 uppercase tracking-[0.08em]">T1</span>
                    </span>
                  )}
                  {yearDeltaPct !== undefined && (
                    <span className="font-mono text-[12px] font-bold tabular-nums inline-flex items-center gap-1"
                      style={{ color: yearDeltaPct >= 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                      {yearDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(yearDeltaPct).toFixed(1)}
                      <span className="text-[8px] font-normal opacity-70">{lang === 'en' ? 'pp' : 'pp'}</span>
                      <span className="text-[8px] font-normal opacity-70 uppercase tracking-[0.08em]">{lang === 'en' ? 'risk' : 'riesgo'}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

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
                  <NotebookPen className="h-3 w-3" aria-hidden="true" />
                  {lang === 'en' ? 'YOUR NOTES' : 'TUS NOTAS'}
                </div>
                {note && (
                  <span className="text-[8px] font-mono uppercase tracking-[0.1em]" style={{ color: 'var(--color-accent)' }}>
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
                className="w-full text-[12px] leading-[1.55] p-2.5 rounded-sm font-sans resize-y focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 transition-colors"
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
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
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
            style={{ color: 'var(--color-accent)', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 }}
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
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
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

      {/* M-OBS Phase 1 (FALCO): KEY EVENT annotation row deleted — it ate
          ~40px of vertical chrome below every YearScrubber and duplicated
          the editorial story copy on the page. */}

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
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'en' ? 'Find a vendor (Toka, Edenred, IMSS…)' : 'Buscar proveedor (Toka, Edenred…)'}
          className="w-full pl-8 pr-3 py-1.5 text-[11px] font-mono rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
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
                  <span className="text-[8px] font-mono font-bold uppercase tracking-[0.1em] flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
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
// atlas-C-P5: AtlasUrlSync
//
// Lives inside AtlasContextProvider so it can read context (zoom, selection).
// Two jobs:
//   1. Mount: dispatch hydrate-from-url for zoom + select params (which live
//      only in context, not in Atlas.tsx's local useState hooks).
//   2. Debounced URL-write: watches both local state (via props) and context
//      state to produce the full URLSearchParams and call setSearchParams.
//      Replaces Atlas.tsx's inline URL-write effect for context-owned fields.
//
// The local-state fields (lens, year, pin, floor, compare) are still written
// here too, so the two effects don't race. The old inline URL-write effect
// in Atlas() watches [mode, yearIndex, pinnedCode, compareMode, yearIndexB,
// riskFloor, setSearchParams] — that effect is kept as-is to avoid
// double-removal risk; both writing the same keys with { replace: true } is
// idempotent (last write wins within the 250ms window). In practice the
// context state dispatch happens slightly after mount so AtlasUrlSync wins.
// ─────────────────────────────────────────────────────────────────────────────
interface AtlasUrlSyncProps {
  mode: ConstellationMode
  yearIndex: number
  pinnedCode: string | null
  riskFloor: 'all' | 'medium' | 'high' | 'critical'
  compareMode: boolean
  yearIndexB: number
  /** Ref containing initial zoom code parsed from URL at mount time */
  initialZoomRef: React.RefObject<string | null>
  /** Ref containing initial vendor-id selection parsed from URL at mount time */
  initialSelectRef: React.RefObject<string[]>
}

function AtlasUrlSync({
  mode,
  yearIndex,
  pinnedCode,
  riskFloor,
  compareMode,
  yearIndexB,
  initialZoomRef,
  initialSelectRef,
}: AtlasUrlSyncProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  // Job 1: on mount, dispatch hydrate-from-url for context-only fields (zoom + select).
  // Local-state fields (lens, year, pin, floor) are handled by the parent Atlas()
  // mount effect which runs before context is initialized.
  useEffect(() => {
    const zoomCode = initialZoomRef.current
    const selIds = initialSelectRef.current

    const hasZoom = zoomCode && zoomCode.length > 0
    const hasSel = selIds && selIds.length > 0

    if (hasZoom || hasSel) {
      const partial: Partial<Pick<AtlasState, 'lens' | 'yearIndex' | 'riskFloor' | 'pinnedCode' | 'view' | 'selection'>> = {}
      if (hasZoom) {
        partial.view = { kind: 'zoomed-cluster', code: zoomCode! }
        partial.pinnedCode = zoomCode!
      }
      if (hasSel) {
        partial.selection = new Set(selIds)
      }
      dispatch({ type: 'hydrate-from-url', partial })
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Job 2: debounced URL-write watching all relevant state.
  // Writes context-owned fields (zoom, select) in addition to local state fields.
  const zoomedCode = state.view.kind === 'zoomed-cluster' ? state.view.code : null
  const selectionIds = useMemo(() => [...state.selection].sort(), [state.selection])

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams()
      // Local-state fields
      if (mode !== 'patterns') params.set('lens', mode)
      const curYear = YEAR_SNAPSHOTS[yearIndex]?.year
      if (curYear && curYear !== YEAR_SNAPSHOTS[YEAR_SNAPSHOTS.length - 1].year) {
        params.set('year', String(curYear))
      }
      // Context-owned: zoom takes precedence over pin
      if (zoomedCode) {
        params.set('zoom', zoomedCode)
      } else if (pinnedCode) {
        params.set('pin', pinnedCode)
      }
      if (compareMode && YEAR_SNAPSHOTS[yearIndexB]) {
        params.set('compare', String(YEAR_SNAPSHOTS[yearIndexB].year))
      }
      if (riskFloor !== 'all') params.set('floor', riskFloor)
      if (selectionIds.length > 0) params.set('select', selectionIds.join(','))
      // Preserve ?story= param if present (don't evict active story deep-link)
      const storyParam = searchParams.get('story')
      if (storyParam) params.set('story', storyParam)
      // 2026-05-09: also preserve ?z1=true so the spatial-nav feature flag
      // doesn't get evicted by the URL-state writer 250ms after the user
      // navigates with the flag set. Without this, /atlas?z1=true was
      // collapsing to /atlas?lens=... and the Z1 drill-in never fired.
      const z1Param = searchParams.get('z1')
      if (z1Param) params.set('z1', z1Param)
      setSearchParams(params, { replace: true })
    }, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, yearIndex, pinnedCode, riskFloor, compareMode, yearIndexB, zoomedCode, selectionIds.join(','), setSearchParams])

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// atlas-C-FIX: Context-to-local bridge
// AtlasLeftRail dispatches into AtlasContext (state.lens, state.yearIndex,
// state.riskFloor, state.pinnedCode), but the constellation reads Atlas.tsx's
// LOCAL state (mode, yearIndex, ...). Without this bridge, clicking the lens
// in the left rail updates context but the constellation doesn't re-render.
// React's setState dedupes by reference equality, so calling unconditionally
// is a no-op when values haven't changed.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Z1Overlay — renders the spatial-nav Z1 sub-constellation when the user
 * has drilled into a sector via the ?z1=true flag. Sits as an absolute
 * overlay above the AtlasZoomLayer so the legacy CSS-scale zoom is still
 * available behind it and we can A/B between them during iteration.
 */
function Z1Overlay({ lang }: { lang: 'en' | 'es' }) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()
  const navigate = useNavigate()
  if (state.view.kind !== 'zoomed-sector') return null
  const view = state.view
  return (
    <div
      className="absolute inset-0 z-10"
      style={{ background: 'var(--color-background, #faf9f6)' }}
    >
      <div className="relative h-full">
        <Z1SectorMap
          sectorId={view.sectorId}
          sectorCode={view.sectorCode}
          lang={lang}
          onInstitutionClick={(institutionId, institutionName) => {
            // Phase 1.3: institution click deep-links to the legacy
            // /institutions/:id page until Z2 lands. This proves the
            // navigation primitive end-to-end without committing to the
            // Z2 sub-constellation render in this commit.
            dispatch({ type: 'drill-into-institution', institutionId, institutionName })
            navigate(`/institutions/${institutionId}`)
          }}
        />
        {/* Back button — top-right, always visible */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'escape-zoom' })}
          className="absolute top-2 right-2 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm hover:bg-background-elevated transition-colors"
          style={{
            color: 'var(--color-accent)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background-card)',
          }}
        >
          {lang === 'en' ? '← Zoom out' : '← Alejar'}
        </button>
      </div>
    </div>
  )
}

function AtlasContextBridge({
  setMode,
  setYearIndex,
  setRiskFloor,
  setPinnedCode,
}: {
  setMode: (m: ConstellationMode) => void
  setYearIndex: (i: number) => void
  setRiskFloor: (f: 'all' | 'medium' | 'high' | 'critical') => void
  setPinnedCode: (c: string | null) => void
}) {
  const state = useAtlasState()
  useEffect(() => { setMode(state.lens) }, [state.lens, setMode])
  useEffect(() => { setYearIndex(state.yearIndex) }, [state.yearIndex, setYearIndex])
  useEffect(() => { setRiskFloor(state.riskFloor) }, [state.riskFloor, setRiskFloor])
  useEffect(() => { setPinnedCode(state.pinnedCode) }, [state.pinnedCode, setPinnedCode])
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// atlas-C-P4: Selection count badge
// Floats above the constellation while the user has vendors selected.
// Reads selection size from AtlasContext; renders nothing when empty.
// ─────────────────────────────────────────────────────────────────────────────
function SelectionBadge({ lang }: { lang: 'en' | 'es' }) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()
  const count = state.selection.size
  if (count === 0) return null
  return (
    <div className="mb-2 inline-flex items-center gap-2 rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-accent">
      <span className="font-bold">{count}</span>
      <span>{lang === 'en' ? 'selected' : 'seleccionados'}</span>
      <button
        type="button"
        onClick={() => dispatch({ type: 'clear-selection' })}
        className="ml-1 rounded-sm border border-accent/30 px-1.5 py-0.5 text-[9px] hover:bg-accent/20"
        aria-label={lang === 'en' ? 'Clear selection' : 'Limpiar selección'}
      >
        {lang === 'en' ? 'Clear' : 'Limpiar'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Atlas page
// ─────────────────────────────────────────────────────────────────────────────
export default function Atlas() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'
  const navigate = useNavigate()

  // 2026-05-11: redirect /atlas?z1=true → /explore. The ?z1=true experimental
  // flag was the abandoned in-Atlas attempt at spatial-nav drill; the
  // production version now lives at /explore (Phase 7). Preserve any
  // sector/year params so deep-links still land on the right place.
  // Harness was getting 4 nav errors per hour on /atlas?z1=true&lens=sectors.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('z1') === 'true') {
      const next = new URLSearchParams()
      // Map ?lens=sectors → no-op (Z0 is the system view), ?lens=patterns
      // also goes to Z0 since the new /explore is sector-first.
      // Preserve year if present.
      const year = params.get('year')
      if (year) next.set('year', year)
      const replace = next.toString() ? `/explore?${next}` : '/explore'
      navigate(replace, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Read URL params synchronously so AtlasContextProvider.initialState is correct
  // on first render. Without this, the left rail shows "Patterns" active even when
  // ?lens=sectors is in the URL (context initializes before the mount useEffect fires).
  const [mode, setMode] = useState<ConstellationMode>(() => {
    const p = new URLSearchParams(window.location.search)
    const l = p.get('lens') as ConstellationMode | null
    return (l && ['patterns', 'sectors', 'categories', 'sexenios'].includes(l)) ? l : 'patterns'
  })
  const [yearIndex, setYearIndex] = useState<number>(() => {
    const p = new URLSearchParams(window.location.search)
    const year = p.get('year')
    if (year) {
      const yi = YEAR_SNAPSHOTS.findIndex((s) => String(s.year) === year)
      if (yi >= 0) return yi
    }
    return YEAR_SNAPSHOTS.length - 1
  })
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [selectedClusterCode, setSelectedClusterCode] = useState<string | null>(null)
  const [pinnedCode, setPinnedCode] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get('zoom') || p.get('pin') || null
  })
  // Most recently picked vendor — shown as a "Found X" badge near the toolbar.
  const [foundVendor, setFoundVendor] = useState<VendorLookup | null>(null)
  // Personal notes per cluster — localStorage-backed
  const { notes, setNote, notesCount } = useClusterNotes()
  // V6: long-form stories (replaces brief tours). A story is paused by
  // default when the user opens it; pressing Play autoplays through chapters.
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [activeChapter, setActiveChapter] = useState<number>(0)
  const [storyPlaying, setStoryPlaying] = useState<boolean>(false)
  const [storyEnded, setStoryEnded] = useState<boolean>(false)
  // omega-N N2: cluster codes to highlight (driven by AtlasStoryBinding)
  const [highlightedClusterCodes, setHighlightedClusterCodes] = useState<string[]>([])
  const [storiesMenuOpen, setStoriesMenuOpen] = useState<boolean>(false)
  // URL-state sharing
  const [searchParams, setSearchParams] = useSearchParams()
  const [shareJustCopied, setShareJustCopied] = useState<boolean>(false)
  // Risk-floor filter — when set, dots below the floor are dropped from the
  // population; remaining levels redistribute proportionally so the field
  // re-densifies around the focused band.
  const [riskFloor, setRiskFloor] = useState<'all' | 'medium' | 'high' | 'critical'>(() => {
    const p = new URLSearchParams(window.location.search)
    const f = p.get('floor')
    return (f && ['all', 'medium', 'high', 'critical'].includes(f)) ? f as 'all' | 'medium' | 'high' | 'critical' : 'all'
  })
  // Compare mode — when true, render a second constellation card with its own year
  const [compareMode, setCompareMode] = useState<boolean>(false)
  // Year B defaults to a contrasting year vs year A — Peña 2014 vs COVID 2020
  const [yearIndexB, setYearIndexB] = useState<number>(
    YEAR_SNAPSHOTS.findIndex((s) => s.year === 2014),
  )
  const [isPlayingB, setIsPlayingB] = useState<boolean>(false)

  // atlas-C-P5: refs for URL-decoded zoom/select — populated by mount effect,
  // consumed by AtlasUrlSync (which lives inside the context provider).
  const initialZoomRef = useRef<string | null>(null)
  const initialSelectRef = useRef<string[]>([])

  // Auto-play loop — advance year every 1.6s
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setYearIndex((y) => (y >= YEAR_SNAPSHOTS.length - 1 ? 0 : y + 1))
    }, 2400)
    return () => clearInterval(id)
  }, [isPlaying])

  // Auto-play loop for compare mode's second canvas
  useEffect(() => {
    if (!isPlayingB || !compareMode) return
    const id = setInterval(() => {
      setYearIndexB((y) => (y >= YEAR_SNAPSHOTS.length - 1 ? 0 : y + 1))
    }, 2400)
    return () => clearInterval(id)
  }, [isPlayingB, compareMode])

  // Sync interactive state back to URL so shareable links stay current after
  // the user switches lens, year, pin, or risk floor.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    p.set('lens', mode)
    const year = YEAR_SNAPSHOTS[yearIndex]?.year
    if (year && yearIndex < YEAR_SNAPSHOTS.length - 1) p.set('year', String(year))
    else p.delete('year')
    if (pinnedCode) p.set('pin', pinnedCode); else p.delete('pin')
    if (riskFloor !== 'all') p.set('floor', riskFloor); else p.delete('floor')
    window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`)
  }, [mode, yearIndex, pinnedCode, riskFloor])

  // ─── STORY playback ──────────────────────────────────────────────────────
  // Each chapter applies (mode, year, pin) and either auto-advances after
  // its dwellMs (when storyPlaying) or waits for the user to hit Continue.
  // The chart is interactive during a chapter — clicking clusters opens the
  // side panel without breaking the story.
  useEffect(() => {
    if (!activeStory) return
    const chapter = activeStory.chapters[activeChapter]
    if (!chapter) return
    // Apply chapter state
    setMode(chapter.state.mode)
    const yi = YEAR_SNAPSHOTS.findIndex((s) => s.year === chapter.state.year)
    if (yi >= 0) setYearIndex(yi)
    setPinnedCode(chapter.state.pinnedCode)
    setIsPlaying(false) // pause normal year-autoplay during a story
    setStoryEnded(false)
    // Don't auto-clear selectedClusterCode — let reader keep panel open.
  }, [activeStory, activeChapter])

  // Auto-advance chapters when storyPlaying is true
  useEffect(() => {
    if (!activeStory || !storyPlaying) return
    const chapter = activeStory.chapters[activeChapter]
    if (!chapter) return
    const id = setTimeout(() => {
      if (activeChapter + 1 < activeStory.chapters.length) {
        setActiveChapter(activeChapter + 1)
      } else {
        setStoryPlaying(false)
        setStoryEnded(true)
      }
    }, chapter.dwellMs)
    return () => clearTimeout(id)
  }, [activeStory, activeChapter, storyPlaying])

  // ─── URL STATE: read params on mount, push state on change ──────────────
  // This lets users share a link to a specific atlas view.
  // ?lens=patterns&year=2020&pin=P5&compare=2014&floor=critical&zoom=P5&select=id1,id2
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
    // zoom takes precedence over pin in the URL
    const zoom = searchParams.get('zoom')
    if (zoom && zoom.length > 0 && zoom.length <= 32) {
      // Store in ref; AtlasUrlSync dispatches zoom-into-cluster on mount
      initialZoomRef.current = zoom
      setPinnedCode(zoom) // also pin so initial state is consistent
    } else if (pin) {
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
    // atlas-C-P5: parse select param → initialSelectRef (consumed by AtlasUrlSync)
    const selectRaw = searchParams.get('select')
    if (selectRaw && selectRaw.length > 0) {
      const ids = selectRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500)
      if (ids.length > 0) initialSelectRef.current = ids
    }
    // ?story=<id> auto-launches an Observatory tour. Used by the long-form
    // /stories pages to deep-link readers from the analytical article into
    // the visual trailer. Suppresses the first-visit auto-tour if present.
    const storyId = searchParams.get('story')
    if (storyId) {
      const story = ATLAS_STORIES.find((s) => s.id === storyId)
      if (story) {
        setActiveStory(story)
        setActiveChapter(0)
        setStoryPlaying(true)
        setStoryEnded(false)
      }
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
      // 2026-05-09: preserve z1 flag (see same fix in the other URL writer above)
      const z1Param = searchParams.get('z1')
      if (z1Param) params.set('z1', z1Param)
      setSearchParams(params, { replace: true })
    }, 250)
    return () => clearTimeout(id)
  }, [mode, yearIndex, pinnedCode, compareMode, yearIndexB, riskFloor, setSearchParams])

  // V5: first-visit auto-tour. Launch "The Pharmaceutical Cartel" automatically
  // the first time a user lands on /atlas with no URL state. Subsequent visits
  // skip auto-tour. Set `rubli_atlas_visited_v1` localStorage flag once played.
  // ?story=<id> arrivals also count as "visited" — the explicit story param
  // means the reader is being deep-linked from a long-form page and the
  // auto-tour would compete with their intended story.
  // atlas-C-P5: also skip if URL contains any Atlas-C params (zoom, select,
  // floor, lens, pin) — the user has a specific view they want to restore.
  useEffect(() => {
    const VISITED_KEY = 'rubli_atlas_visited_v1'
    // D-048: read the flag synchronously from localStorage AND from the
    // current URL (not the React searchParams closure, which may not be
    // populated on the very first render). The auto-tour must fire at
    // most once per browser, never re-fire on lens/year/mode changes.
    let visited = false
    try { visited = window.localStorage.getItem(VISITED_KEY) === '1' } catch {}
    if (visited) {
      // Already visited — never auto-launch again, period.
      return
    }
    // Read URL state directly from window.location so we don't depend on
    // the router's async population of searchParams.
    const rawSearch = typeof window !== 'undefined' ? window.location.search : ''
    const hasUrlState = rawSearch.length > 1 // accounts for the leading "?"
    const liveParams = new URLSearchParams(rawSearch)
    const hasSharedState = hasAtlasCParams(liveParams)
    // 2026-05-08 audit fix: on phones (<768px) the chapter card pushes the
    // constellation off-screen — suppress the first-visit auto-launch on
    // mobile; the user can still tap "Play story" explicitly. Don't set the
    // visited flag so they still get the tour when they later open the same
    // URL on desktop.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (!hasUrlState && !hasSharedState && !isMobile) {
      // Wait briefly for the page to settle before launching
      const id = setTimeout(() => {
        // V6: launch a long-form story for first-time visitors
        setActiveStory(ATLAS_STORIES[0])
        setActiveChapter(0)
        setStoryPlaying(true)
        try { window.localStorage.setItem(VISITED_KEY, '1') } catch {}
      }, 1200)
      return () => clearTimeout(id)
    }
    // Mark as visited if arriving via ?story= or any Atlas-C shared state
    if (liveParams.get('story') || hasSharedState) {
      try { window.localStorage.setItem(VISITED_KEY, '1') } catch {}
    }
    // intentionally only on mount — do NOT include searchParams in deps,
    // otherwise the effect re-evaluates when lens/year/mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Re-key the constellation per MODE only — year changes within a mode
  // smoothly interpolate dot positions via CSS transitions instead of
  // full remount. Mode changes still unmount + retrigger the cinematic reveal
  // because the meta arrays / attractor positions change entirely.
  const constellationKey = mode

  // atlas-C-P2: the full meta array the constellation uses — needed by
  // AtlasZoomLayer to look up attractor coords for semantic zoom.
  // Mirrors the activeMeta logic inside ConcentrationConstellation.tsx.
  const activeConstellationMeta: ClusterMeta[] = useMemo(() => {
    if (atlasMeta && atlasMeta.length > 0) return atlasMeta
    const isEs = lang === 'es'
    if (mode === 'sectors')    return buildSectorMeta(isEs)
    if (mode === 'sexenios')   return buildSexenioMeta(isEs)
    if (mode === 'categories') return buildAtlasCategoriesMeta(isEs)
    return buildPatternMeta(isEs)
  }, [mode, lang, atlasMeta])

  // omega-N-FIX2: named outliers ONLY when a cluster is selected.
  // Macro view stays clean (anonymous dots only); zoom into a cluster to
  // see its top 3 named vendors. selectedClusterCode is set on cluster
  // click via the existing handleClusterClick path.
  const namedVendors = useTopVendorsForCluster(mode, selectedClusterCode)

  const handleClusterClick = (clusterCode: string) => {
    setSelectedClusterCode(clusterCode)
  }
  // 2026-05-09 spatial-nav Phase 1.3 — feature flag for the Z1 sub-
  // constellation render. When set on /atlas?z1=true AND the user is on
  // the sectors lens, AtlasZoomLayer additionally dispatches
  // drill-into-sector and the AtlasContextBridge mounts <Z1SectorMap>
  // as an overlay on the zoomed view.
  const z1Enabled = searchParams.get('z1') === 'true'

  const totalContractsForYear = snapshot.totalContracts

  // ─── atlas-C-P1: bridge callbacks for left rail ──────────────────────────
  // The left rail dispatches into AtlasContext AND calls these bridge
  // callbacks to keep Atlas.tsx's existing useState hooks in sync.
  // When P2-P5 progressively migrate state into context, these callbacks
  // will be removed one by one.
  const handleRailYearChange = (idx: number) => setYearIndex(idx)
  const handleRailPlayChange = (playing: boolean) => setIsPlaying(playing)
  const handleRailVendorSearch = (query: string): string | null => {
    // Proxy into the existing VendorSearchBox logic by finding a match.
    // Returns the cluster code so the rail can auto-zoom into it (M-OBS P5).
    const matches = searchKnownVendors(query)
    if (!matches[0]) return null
    if (mode === 'sexenios') setMode('patterns')
    const code = vendorToClusterCode(matches[0], mode === 'sexenios' ? 'patterns' : mode)
    setPinnedCode(code)
    setFoundVendor(matches[0])
    setSelectedClusterCode(code)
    return code
  }
  const handleRailStoryOpen = (storyId: string) => {
    const story = ATLAS_STORIES.find((s) => s.id === storyId)
    if (story) {
      setActiveStory(story)
      setActiveChapter(0)
      setStoryPlaying(true)
      setStoryEnded(false)
    }
  }
  const handleRailReset = () => {
    setMode('patterns')
    setYearIndex(YEAR_SNAPSHOTS.length - 1)
    setIsPlaying(false)
    setPinnedCode(null)
    setRiskFloor('all')
    setSelectedClusterCode(null)
    setFoundVendor(null)
  }

  return (
    <AtlasContextProvider
      initialState={{
        lens: mode,
        yearIndex,
        riskFloor,
        pinnedCode,
      }}
    >
      {/* atlas-C-P5: URL sync component — must live inside AtlasContextProvider
          so it can read/write context state (zoom, selection). Renders null. */}
      <AtlasContextBridge
        setMode={setMode}
        setYearIndex={setYearIndex}
        setRiskFloor={setRiskFloor}
        setPinnedCode={setPinnedCode}
      />
      <AtlasUrlSync
        mode={mode}
        yearIndex={yearIndex}
        pinnedCode={pinnedCode}
        riskFloor={riskFloor}
        compareMode={compareMode}
        yearIndexB={yearIndexB}
        initialZoomRef={initialZoomRef}
        initialSelectRef={initialSelectRef}
      />
      {/* omega-N N2: story-chart binding — headless, renders null.
          Wires active chapter's pinnedCode to zoom dispatch + highlight state.
          Ref: NYT "How the Virus Got Out" + ICIJ Pandora Papers. */}
      <AtlasStoryBinding
        activeStory={activeStory}
        activeChapterIndex={activeChapter}
        onHighlightChange={setHighlightedClusterCodes}
      />
      <AtlasShell
        leftRail={
          <AtlasLeftRail
            lang={lang}
            yearSnapshots={YEAR_SNAPSHOTS}
            isPlaying={isPlaying}
            onYearChange={handleRailYearChange}
            onPlayChange={handleRailPlayChange}
            onVendorSearchPick={handleRailVendorSearch}
            onStoryOpen={handleRailStoryOpen}
            onReset={handleRailReset}
          />
        }
        center={
          // 2026-05-09: bumped max-w 1200→1680 + py-6/8→py-3/4 so the
          // constellation canvas fills more of the viewport. User
          // feedback: "make it bigger… you can barely see shit".
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-3 sm:py-4 relative">
      {/* ── folio-skin: paper-grain texture overlay ─────────────────────────
          A very low-opacity SVG fractal noise sits behind the page content
          so the entire atlas surface reads as a printed plate, not a glossy
          screen. Pointer-events:none so it never blocks interaction. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="atlas-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#atlas-paper-grain)" />
      </svg>
      {/* All page content sits above the grain overlay */}
      <div className="relative" style={{ zIndex: 1 }}>
      {/* ── Hero header ─ folio aesthetic ──────────────────────────────────
          Eyebrow becomes an archival index line: Folio·IX · Atlas of contracting.
          Headline is set as a small-caps EB Garamond italic display — feels
          closer to a bound atlas plate than a generic dashboard title.
          Lede sits in a narrower measure with EB Garamond regular italic for
          the inline emphasis tokens. */}
      {/* M-OBS Phase 1 (FALCO): compressed 56px masthead replaces the
          ~250px FOLIO·IX hero. See designs/M-OBS-spec.md · Replacement 1. */}
      <AtlasMasthead lang={lang} />

      {/* M-OBS Phase 1 (FALCO): consolidated 36px toolbar replaces the
          vendor-search row + Stories button + Share + Compare-Years toggle
          + the RISK FLOOR chip row. See designs/M-OBS-spec.md · Replacement 2. */}
      <AtlasToolbar
        lang={lang}
        mode={mode}
        setMode={setMode}
        yearIndex={yearIndex}
        setYearIndex={setYearIndex}
        years={YEAR_SNAPSHOTS.map((s) => s.year)}
        riskFloor={riskFloor}
        setRiskFloor={setRiskFloor}
        onStoriesOpen={() => setStoriesMenuOpen(true)}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
      />

      {/* M-OBS Phase 1 (FALCO): Stories popover — anchored to the toolbar
          BookOpen icon via fixed-position overlay. State controlled by
          `storiesMenuOpen` which AtlasToolbar opens via `onStoriesOpen`. */}
      {storiesMenuOpen && (
        <>
          {/* Backdrop click-out */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setStoriesMenuOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[120px] right-6 surface-card rounded-sm shadow-2xl overflow-hidden z-30"
            style={{ border: '1px solid var(--color-border-hover)', width: 380, maxWidth: '90vw' }}
          >
              <div className="px-4 py-3 border-b border-border/50" style={{ background: 'var(--color-border)' }}>
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mb-0.5">
                  {lang === 'en' ? 'INVESTIGATIVE STORIES' : 'HISTORIAS DE INVESTIGACIÓN'}
                </div>
                <div className="text-[11px] text-text-secondary leading-[1.5]">
                  {lang === 'en'
                    ? 'Multi-chapter narratives told by the constellation. Pause, explore, resume.'
                    : 'Narrativas de varios capítulos contadas por la constelación. Pausa, explora, reanuda.'}
                </div>
              </div>
              {ATLAS_STORIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveStory(s)
                    setActiveChapter(0)
                    setStoryPlaying(true)
                    setStoriesMenuOpen(false)
                    setStoryEnded(false)
                  }}
                  className="w-full text-left px-4 py-3 transition-colors block hover:bg-background-elevated/40"
                  style={{ borderBottom: '1px solid var(--color-border)', borderLeft: `3px solid ${s.accent}` }}
                >
                  <div
                    className="font-extrabold text-[16px] leading-[1.15] text-text-primary mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {s.title[lang]}
                  </div>
                  <div className="text-[10px] text-text-secondary leading-[1.5] mb-1.5">
                    {s.subtitle[lang]}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.08em] flex items-center gap-2" style={{ color: s.accent }}>
                    <span>{s.chapters.length} {lang === 'en' ? 'chapters' : 'capítulos'}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{s.duration}</span>
                  </div>
                </button>
              ))}
              {activeStory && (
                <button
                  onClick={() => {
                    setActiveStory(null)
                    setActiveChapter(0)
                    setStoryPlaying(false)
                    setStoryEnded(false)
                    setStoriesMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-[0.1em] font-bold transition-colors"
                  style={{ background: 'var(--color-border)', color: 'var(--color-risk-critical)' }}
                >
                  <Square className="h-3 w-3 inline mr-1.5" aria-hidden="true" />
                  {lang === 'en' ? 'Close story' : 'Cerrar historia'}
                </button>
              )}
              {/* Cross-surface link into Newsroom — context-aware. When the
                  Observatory has a pattern (P1–P7) or sector pinned, deep-
                  links the Newsroom dossier with that lens pre-filtered. */}
              <button
                onClick={() => {
                  setStoriesMenuOpen(false)
                  const params = new URLSearchParams()
                  if (mode === 'patterns' && pinnedCode && /^P[1-7]$/.test(pinnedCode)) {
                    params.set('pattern', pinnedCode)
                  } else if (mode === 'sectors' && pinnedCode) {
                    params.set('sector', pinnedCode)
                  }
                  const qs = params.toString()
                  navigate(`/journalists${qs ? '?' + qs : ''}`)
                }}
                className="w-full text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.1em] font-bold text-text-secondary hover:bg-background-elevated/40 transition-colors flex items-center justify-between border-t border-border/50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {(() => {
                    if (mode === 'patterns' && pinnedCode && /^P[1-7]$/.test(pinnedCode)) {
                      return lang === 'en'
                        ? `Long-form investigations · ${pinnedCode}`
                        : `Investigaciones de fondo · ${pinnedCode}`
                    }
                    if (mode === 'sectors' && pinnedCode) {
                      return lang === 'en'
                        ? `Long-form investigations · ${pinnedCode}`
                        : `Investigaciones de fondo · ${pinnedCode}`
                    }
                    return lang === 'en'
                      ? 'All long-form investigations'
                      : 'Todas las investigaciones'
                  })()}
                </span>
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </button>
          </motion.div>
        </>
      )}

      {/* Found-vendor pill — surfaced when VendorSearchBox elsewhere picks
          a vendor. Search box itself is queued for re-entry to Phase 2 of M-OBS. */}
      {foundVendor && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm mt-2 mx-3"
          style={{ background: 'rgba(160,104,32,0.10)', color: 'var(--color-accent)' }}
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
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

      {/* ── STORY READER — replaces brief tour narration with rich chapter UI ─── */}
      <AnimatePresence mode="wait">
        {activeStory && !storyEnded && activeStory.chapters[activeChapter] && (() => {
          const chapter: StoryChapter = activeStory.chapters[activeChapter]
          const isLastChapter = activeChapter === activeStory.chapters.length - 1
          const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
          const romanCh = romanNumerals[activeChapter] ?? `${activeChapter + 1}`
          return (
            <motion.div
              key={`story-${activeStory.id}-${activeChapter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="surface-card rounded-sm mb-4 overflow-hidden"
              style={{ borderLeft: `3px solid ${activeStory.accent}` }}
            >
              {/* ── Story banner (story-level chrome) ── */}
              <div
                className="px-5 py-2.5 flex items-center justify-between gap-3"
                style={{ background: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-[8px] font-mono font-bold uppercase tracking-[0.16em] flex-shrink-0"
                    style={{ color: activeStory.accent }}
                  >
                    ◆ {lang === 'en' ? 'STORY' : 'HISTORIA'}
                  </span>
                  <span className="font-mono text-[11px] text-text-primary truncate font-semibold">
                    {activeStory.title[lang]}
                  </span>
                  {/* Long-form deep-link — only when the tour has a paired
                      /stories slug. Lets the reader jump from the playing
                      tour to the analytical article without waiting for
                      the end-card. New tab so the tour state persists. */}
                  {activeStory.longformSlug && (
                    <Link
                      to={`/stories/${activeStory.longformSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono font-bold uppercase tracking-[0.12em] hover:opacity-80 transition-opacity"
                      style={{
                        color: activeStory.accent,
                        border: `1px solid ${activeStory.accent}55`,
                        background: `${activeStory.accent}0d`,
                      }}
                      aria-label={lang === 'en' ? 'Read the full long-form investigation in a new tab' : 'Leer la investigación completa en una pestaña nueva'}
                      title={lang === 'en' ? 'Read full investigation' : 'Leer investigación completa'}
                    >
                      <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{lang === 'en' ? 'FULL' : 'COMPLETA'}</span>
                    </Link>
                  )}
                </div>
                {/* Chapter progress dots */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {activeStory.chapters.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveChapter(i)}
                      className="rounded-full transition-all hover:opacity-90"
                      style={{
                        width: i === activeChapter ? 16 : 6,
                        height: 5,
                        background: i <= activeChapter ? activeStory.accent : 'var(--color-border-hover)',
                        cursor: 'pointer',
                      }}
                      aria-label={`${lang === 'en' ? 'Go to chapter' : 'Ir al capítulo'} ${i + 1}`}
                    />
                  ))}
                </div>
                {/* Story controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setStoryPlaying(!storyPlaying)}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={storyPlaying ? (lang === 'en' ? 'Pause story' : 'Pausar historia') : (lang === 'en' ? 'Play story' : 'Reproducir historia')}
                    title={storyPlaying ? (lang === 'en' ? 'Pause' : 'Pausar') : (lang === 'en' ? 'Play' : 'Reproducir')}
                  >
                    {storyPlaying
                      ? <Pause className="h-3.5 w-3.5" style={{ color: activeStory.accent }} />
                      : <Play className="h-3.5 w-3.5" style={{ color: activeStory.accent }} />
                    }
                  </button>
                  <button
                    onClick={() => {
                      if (isLastChapter) { setStoryPlaying(false); setStoryEnded(true) }
                      else setActiveChapter(activeChapter + 1)
                    }}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={lang === 'en' ? 'Next chapter' : 'Siguiente capítulo'}
                    title={lang === 'en' ? 'Next' : 'Siguiente'}
                  >
                    <SkipForward className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => { setActiveStory(null); setActiveChapter(0); setStoryPlaying(false); setStoryEnded(false) }}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={lang === 'en' ? 'Close story' : 'Cerrar historia'}
                    title={lang === 'en' ? 'Close' : 'Cerrar'}
                  >
                    <X className="h-3.5 w-3.5 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* ── Chapter content ── */}
              <div className="px-5 py-5 md:px-7 md:py-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span
                    className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]"
                    style={{ color: activeStory.accent }}
                  >
                    {lang === 'en' ? 'CHAPTER' : 'CAPÍTULO'} {romanCh}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    {chapter.yearLabel[lang]}
                  </span>
                </div>
                <h2
                  className="font-extrabold text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.01em] text-text-primary mb-3 text-balance"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {chapter.title[lang]}
                </h2>
                <p
                  className="text-[14px] md:text-[15px] leading-[1.7] text-text-secondary text-pretty"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {chapter.body[lang]}
                </p>

                {/* Optional pull-stat callout */}
                {chapter.pull && (
                  <div
                    className="mt-4 pt-4 border-t flex items-baseline gap-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="font-extrabold tabular-nums leading-none flex-shrink-0"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        color: activeStory.accent,
                        fontSize: 32,
                      }}
                    >
                      {chapter.pull.value[lang]}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted leading-[1.5] uppercase tracking-[0.06em]">
                      {chapter.pull.caption[lang]}
                    </div>
                  </div>
                )}

                {/* Continue / autoplay hint footer */}
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[10px] font-mono text-text-muted">
                    {storyPlaying
                      ? (lang === 'en' ? `auto-advancing in ${(chapter.dwellMs / 1000).toFixed(0)}s · pause to read & explore` : `avanza en ${(chapter.dwellMs / 1000).toFixed(0)}s · pausa para leer y explorar`)
                      : (lang === 'en' ? 'paused · click ▶ to resume or use → to advance' : 'pausado · clic ▶ para reanudar o → para avanzar')
                    }
                  </div>
                  {!isLastChapter && (
                    <button
                      onClick={() => setActiveChapter(activeChapter + 1)}
                      className="text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                      style={{ background: activeStory.accent, color: 'white' }}
                    >
                      {lang === 'en' ? 'Continue' : 'Continuar'}
                      <ArrowUpRight className="h-3 w-3 rotate-45" aria-hidden="true" />
                    </button>
                  )}
                  {isLastChapter && (
                    <button
                      onClick={() => { setStoryPlaying(false); setStoryEnded(true) }}
                      className="text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                      style={{ background: activeStory.accent, color: 'white' }}
                    >
                      {lang === 'en' ? 'End of story' : 'Fin de la historia'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* End-of-story closing card */}
        {activeStory && storyEnded && (
          <motion.div
            key={`story-end-${activeStory.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45 }}
            className="surface-card rounded-sm mb-4 overflow-hidden"
            style={{ borderLeft: `3px solid ${activeStory.accent}` }}
          >
            <div className="px-5 py-2.5" style={{ background: 'var(--color-border)' }}>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.16em]" style={{ color: activeStory.accent }}>
                ◆ {lang === 'en' ? 'FIN' : 'FIN'} · {activeStory.title[lang]}
              </span>
            </div>
            <div className="px-5 py-6 md:px-7 md:py-7">
              <h2
                className="font-extrabold text-[26px] md:text-[34px] leading-[1.05] tracking-[-0.015em] text-text-primary mb-3 text-balance"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {activeStory.closing.headline[lang]}
              </h2>
              <p
                className="text-[14px] md:text-[15px] leading-[1.7] text-text-secondary text-pretty mb-5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {activeStory.closing.body[lang]}
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/50">
                {/* Primary CTA: read the full long-form investigation. Only
                    rendered when the tour has a paired /stories slug —
                    orphan tours (e.g. covid_year) skip this affordance. */}
                {activeStory.longformSlug && (
                  <button
                    onClick={() => navigate(`/stories/${activeStory.longformSlug}`)}
                    className="text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                    style={{ background: activeStory.accent, color: 'white' }}
                  >
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    {lang === 'en' ? 'Read the full investigation' : 'Leer la investigación completa'}
                  </button>
                )}
                <button
                  onClick={() => { setActiveChapter(0); setStoryPlaying(true); setStoryEnded(false) }}
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors inline-flex items-center gap-1.5',
                    activeStory.longformSlug
                      ? 'hover:bg-background-elevated/40'
                      : 'hover:opacity-90',
                  )}
                  style={
                    activeStory.longformSlug
                      ? { border: '1px solid var(--color-border)', color: activeStory.accent }
                      : { background: activeStory.accent, color: 'white' }
                  }
                >
                  <RotateCcw className="h-3 w-3" />
                  {lang === 'en' ? 'Replay' : 'Repetir'}
                </button>
                {ATLAS_STORIES.filter((s) => s.id !== activeStory.id).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStory(s); setActiveChapter(0); setStoryPlaying(true); setStoryEnded(false) }}
                    className="text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors hover:bg-background-elevated/40 inline-flex items-center gap-1.5"
                    style={{ border: '1px solid var(--color-border)', color: s.accent }}
                  >
                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                    {s.title[lang]}
                  </button>
                ))}
                <button
                  onClick={() => { setActiveStory(null); setActiveChapter(0); setStoryPlaying(false); setStoryEnded(false) }}
                  className="text-[10px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors hover:bg-background-elevated/40 inline-flex items-center gap-1.5 text-text-muted ml-auto"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <X className="h-3 w-3" />
                  {lang === 'en' ? 'Continue exploring' : 'Seguir explorando'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Constellation canvas A (always shown) ──────────────────────── */}
      {compareMode && (
        <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1.5 inline-flex items-center gap-1.5">
          <span className="font-bold" style={{ color: 'var(--color-accent)' }}>● {lang === 'en' ? 'YEAR A' : 'AÑO A'}</span>
          <span>·</span>
          <span>{snapshot.year}</span>
        </div>
      )}
      {/* ── atlas-C-P4: Selection count badge ──────────────────────────── */}
      <SelectionBadge lang={lang} />

      <PlateFrame
        lens={mode}
        year={snapshot.year}
        clusterCount={activeConstellationMeta.length}
        totalContracts={totalContractsForYear}
        lang={lang}
        /* M-OBS Phase 1 (FALCO): suppress PlateFrame's own folio header
           strip — AtlasMasthead above carries the FOLIO·IX kicker. */
        minimal
      >
        {/* omega-N: chapter strip overlay — pinned over the chart while a story is playing.
            Cites NYT "How the Virus Got Out" — the camera follows the narrative, with a
            persistent chapter indicator so the reader never loses orientation. */}
        {activeStory && !storyEnded && activeStory.chapters[activeChapter] && (
          <div
            className="absolute top-2 left-2 z-10 inline-flex items-center gap-2 rounded-sm px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em]"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>▶</span>
            <span className="font-bold">
              {lang === 'en' ? 'Ch' : 'Cap'} {activeChapter + 1}/{activeStory.chapters.length}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span className="truncate max-w-[280px]" style={{ color: 'var(--color-text-primary)' }}>
              {activeStory.title[lang]}
            </span>
          </div>
        )}
        {/* atlas-C-P2: ConcentrationConstellation is now wrapped in AtlasZoomLayer
            which owns the semantic zoom transform. omega-N: engine itself was
            modified (named outliers + dim layers + bigger labels) per user
            authorization to break the sacred-engine rule.
            folio-skin: PlateFrame above gives this card investigative-folio
            chrome (corner crops, archival folio number, italic plate caption). */}
        <AtlasZoomLayer
          key={constellationKey}
          mode={mode}
          rows={rows.length > 0 ? rows : fallbackRows}
          totalContracts={totalContractsForYear}
          metaOverride={atlasMeta}
          /* Seed depends ONLY on mode — dots stay in place across years
             so CSS transitions can morph their fill-opacity smoothly as the
             critical/high/medium/low pcts shift per year. */
          seedOverride={mode === 'patterns' ? 31415 : mode === 'sectors' ? 27182 : mode === 'categories' ? 14142 : 16180}
          pinnedCode={pinnedCode}
          lang={lang}
          activeMeta={activeConstellationMeta}
          onClusterClickBridge={handleClusterClick}
          namedVendors={namedVendors}
          highlightedClusterCodes={highlightedClusterCodes}
          z1Enabled={z1Enabled}
          resolveSectorId={(code) => SECTORS.find((s) => s.code === code)?.id ?? null}
        />
        {/* 2026-05-09 spatial-nav Phase 1.3 — Z1 sub-constellation overlay.
            Renders institutions as bodies in space when the user has
            drilled into a sector. Only mounted when ?z1=true so the
            existing /atlas behavior is preserved. */}
        {z1Enabled && <Z1Overlay lang={lang} />}
      </PlateFrame>

      {/* M-OBS Phase 1 (FALCO): bottom YearScrubber deleted — year stepper
          lives in AtlasToolbar (◆ ←/→). KEY EVENT annotation row is gone with it
          (was rendered inside the YearScrubber component). */}

      {/* ── COMPARE MODE: second canvas + scrubber ─────────────────── */}
      {compareMode && (() => {
        const snapshotB = effectiveSnapshot(yearIndexB)
        const rowsB = applyRiskFloor(snapshotToRows(snapshotB))
        const totalContractsB = snapshotB.totalContracts
        // Same morph philosophy as canvas A — only re-key on mode changes
        const constellationKeyB = `B-${mode}`
        return (
          <>
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-6 mb-1.5 inline-flex items-center gap-1.5">
              <span className="font-bold" style={{ color: 'var(--color-risk-critical)' }}>● {lang === 'en' ? 'YEAR B' : 'AÑO B'}</span>
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
                /* Different seed than canvas A so the two views don't share
                   dot positions even at identical years — but stable across
                   year changes within compare mode. */
                seedOverride={(mode === 'patterns' ? 31415 : mode === 'sectors' ? 27182 : mode === 'categories' ? 14142 : 16180) + 999}
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

      {/* M-OBS Phase 1 (FALCO): far-bottom editorial methodology footer
          deleted — promotional copy that pushed the canvas off-screen.
          Methodology lives at /methodology. */}

          </div>{/* /folio-skin content wrapper */}
          </div>
        }
      />
    </AtlasContextProvider>
  )
}
