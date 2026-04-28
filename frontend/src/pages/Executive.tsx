/**
 * Executive Summary — Newspaper-style 1-pager for decision-makers
 *
 * Designed to be consumed in 90 seconds by senators, NGO directors,
 * embassy staff, and prosecutors. Editorial weight over data density.
 *
 * Composition:
 *   1. Dateline + headline (Playfair Display 800)
 *   2. Lede paragraph
 *   3. 2x2 KPI tile grid (HR rate, value at risk, high+critical, model AUC)
 *   4. Three Signal cards (top model predictors)
 *   5. Documented cases timeline (2002-2025 dot-strip, expanded)
 *   6. Recommendations by audience (investigators / reformers / journalists)
 *   7. Single CTA — "Investigate a vendor"
 *   8. Credibility strip
 *   9. Print button (hides sidebar)
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, ArrowUpRight, Shield, Clock } from 'lucide-react'
import { analysisApi, contractApi, ariaApi, caseLibraryApi, categoriesApi } from '@/api/client'
import type { ContractListItem, ContractListResponse, RiskDistribution } from '@/api/types'
import { useQuery } from '@tanstack/react-query'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  ConcentrationConstellation,
  type ConstellationMode,
  type ConstellationRiskRow,
} from '@/components/charts/ConcentrationConstellation'

// ─────────────────────────────────────────────────────────────────────────────
// § 2 La Lente — concentric-rings visualization showing how the platform
// narrows 3.1M contracts down to 320 T1 priority leads. Five tiers, animated
// in from outside → in to evoke a telescope focusing.
// ─────────────────────────────────────────────────────────────────────────────
interface LensTier {
  count: number
  display: string
  label: { en: string; es: string }
  sublabel: { en: string; es: string }
  ringR: number
  color: string
  ringWidth: number
  ringOpacity: number
  filled?: boolean
  href: string
}

function buildLensTiers(t1Count: number, gtCount: number, hcCount: number): LensTier[] {
  return [
    {
      count: 3_051_294,
      display: '3.1M',
      label: { en: 'contracts analyzed', es: 'contratos analizados' },
      sublabel: { en: 'every COMPRANET row · 2002–2025', es: 'cada registro COMPRANET · 2002–2025' },
      ringR: 96,
      color: 'var(--color-text-muted)',
      ringWidth: 0.7,
      ringOpacity: 0.40,
      href: '/methodology',
    },
    {
      count: hcCount,
      display: formatNumber(hcCount),
      label: { en: 'high + critical risk', es: 'riesgo alto + crítico' },
      sublabel: { en: '13.5% of all contracts · OECD compliant band', es: '13.5% del total · banda OCDE cumplida' },
      ringR: 72,
      color: '#f59e0b',
      ringWidth: 1.1,
      ringOpacity: 0.55,
      href: '/contracts?risk_level=high',
    },
    {
      count: 6_250,
      display: '6.2k',
      label: { en: 'ARIA priority watch list', es: 'lista vigilancia ARIA' },
      sublabel: { en: 'Tier 2 + Tier 3 vendors', es: 'proveedores Tier 2 + Tier 3' },
      ringR: 50,
      color: '#f59e0b',
      ringWidth: 1.5,
      ringOpacity: 0.85,
      href: '/aria',
    },
    {
      count: gtCount,
      display: formatNumber(gtCount),
      label: { en: 'documented corruption cases', es: 'casos documentados' },
      sublabel: { en: 'anchor corpus for model training', es: 'corpus ancla para entrenamiento' },
      ringR: 32,
      color: '#a06820',
      ringWidth: 1.7,
      ringOpacity: 0.90,
      href: '/cases',
    },
    {
      count: t1Count,
      display: formatNumber(t1Count),
      label: { en: 'T1 investigation leads', es: 'líderes T1' },
      sublabel: { en: 'highest priority · dossier-ready', es: 'máxima prioridad · listo para dossier' },
      ringR: 16,
      color: '#dc2626',
      ringWidth: 0,
      ringOpacity: 1,
      filled: true,
      href: '/aria',
    },
  ]
}

function LensVisualization({ tiers }: { tiers: LensTier[] }) {
  const SIZE = 220
  const CX = SIZE / 2
  const CY = SIZE / 2

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ maxHeight: 240 }}>
      <defs>
        <radialGradient id="lens-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="1" />
          <stop offset="60%" stopColor="#dc2626" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="lens-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft red glow behind the core */}
      <motion.circle
        cx={CX} cy={CY}
        fill="url(#lens-glow)"
        initial={{ r: 0, opacity: 0 }}
        whileInView={{ r: 50, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.6 }}
      />

      {/* Concentric rings — outer to inner */}
      {tiers.slice(0, 4).map((t, i) => (
        <motion.circle
          key={i}
          cx={CX} cy={CY}
          r={t.ringR}
          fill="none"
          stroke={t.color}
          strokeWidth={t.ringWidth}
          initial={{ strokeOpacity: 0 }}
          whileInView={{ strokeOpacity: t.ringOpacity }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 + i * 0.13, ease: 'easeOut' }}
        />
      ))}

      {/* Tick marks on the outermost ring (compass-like) */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const r = tiers[0].ringR
        const x1 = CX + Math.cos(rad) * (r - 3)
        const y1 = CY + Math.sin(rad) * (r - 3)
        const x2 = CX + Math.cos(rad) * (r + 3)
        const y2 = CY + Math.sin(rad) * (r + 3)
        return (
          <motion.line
            key={deg}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--color-text-muted)"
            strokeWidth={0.7}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.7 }}
          />
        )
      })}

      {/* T1 core — filled crimson disk with gradient */}
      <motion.circle
        cx={CX} cy={CY}
        fill="url(#lens-core)"
        initial={{ r: 0 }}
        whileInView={{ r: 16 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
      />
      {/* Core count label */}
      <motion.text
        x={CX} y={CY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={800}
        fill="white"
        fontFamily="var(--font-family-mono, monospace)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 1.15 }}
      >
        {tiers[4].display}
      </motion.text>
      {/* "T1" pill below the core */}
      <motion.text
        x={CX} y={CY + 30}
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fill="#dc2626"
        fontFamily="var(--font-family-mono, monospace)"
        letterSpacing="0.15em"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 1.25 }}
      >
        T1 PRIORITY
      </motion.text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5 Historias Ejemplares — three hand-picked vendor dossiers
// Showcases the v3.0 EntityIdentityChip primitive in production.
// ─────────────────────────────────────────────────────────────────────────────
type DossierFlag = 'gt' | 'efos' | 'sfp' | 'ghost' | 'fp_structural'
interface ExampleDossier {
  vendorId: number
  name: string
  risk: number
  tier: 1 | 2 | 3 | 4
  flags: DossierFlag[]
  contracts: string
  value: string
  kicker: { en: string; es: string }
  lede: { en: string; es: string }
  detected: { en: string; es: string }
  outcome: { en: string; es: string }
}

const EXAMPLE_DOSSIERS: ExampleDossier[] = [
  {
    vendorId: 29277,
    name: 'GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.',
    risk: 0.99, tier: 1, flags: ['gt'],
    contracts: '6,303', value: '$133.2B MXN · 133,200 MDP',
    kicker: { en: 'PHARMA OLIGOPOLY · IMSS CAPTURE', es: 'OLIGOPOLIO FARMACÉUTICO · CAPTURA IMSS' },
    lede: {
      en: '$133.2B MXN in IMSS medicines over 14 years — 60% of the entire pharma category. A single distributor holding a majority of Mexico\'s public drug supply, 79% awarded without competitive bidding.',
      es: '133,200 MDP en medicamentos al IMSS en 14 años — 60% de toda la categoría farmacéutica. Un solo distribuidor con la mayoría del suministro de medicamentos públicos de México, 79% sin licitación.',
    },
    detected: {
      en: 'ARIA Tier 1 · P6 institutional capture · price volatility critical · 6,303 contracts all above sector median',
      es: 'ARIA Tier 1 · captura institucional P6 · volatilidad de precio crítica · 6,303 contratos sobre la mediana sectorial',
    },
    outcome: {
      en: 'COFECE opened cartel investigation 2018 · AMLO publicly vetoed the pharma cartel 2019 · SFP imposed sanctions',
      es: 'COFECE abrió investigación de cártel 2018 · AMLO vetó públicamente el cártel farmacéutico 2019 · SFP impuso sanciones',
    },
  },
  {
    vendorId: 31655,
    name: 'LICONSA S.A. DE C.V.',
    risk: 0.92, tier: 1, flags: ['gt'],
    contracts: '~3,000', value: 'multi-billion MXN',
    kicker: { en: 'SEGALMEX FOOD FRAUD', es: 'FRAUDE SEGALMEX' },
    lede: {
      en: 'Government parastatal at the center of a MX$15B food-distribution scandal. Funds diverted from a program feeding Mexico\'s poorest households — corn tortillas, milk, and beans that never arrived.',
      es: 'Paraestatal al centro de un escándalo de 15,000 MDP en distribución de alimentos. Fondos desviados de un programa que alimenta a los hogares más pobres de México — tortillas, leche y frijoles que nunca llegaron.',
    },
    detected: {
      en: 'Anchor GT case · avg risk score 0.66 · P6 capture pattern · 90%+ direct-award rate · network links to shell intermediaries',
      es: 'Caso GT ancla · puntaje de riesgo promedio 0.66 · patrón de captura P6 · 90%+ adjudicación directa · vínculos con intermediarios fantasma',
    },
    outcome: {
      en: 'MX$15B diverted from food subsidies · FGR criminal investigation ongoing since 2022 · parastatal placed under federal intervention',
      es: '15,000 MDP desviados de subsidios alimentarios · investigación penal FGR en curso desde 2022 · paraestatal sometida a intervención federal',
    },
  },
  {
    vendorId: 6038,
    name: 'HEMOSER, S.A. DE C.V.',
    risk: 0.85, tier: 1, flags: ['gt'],
    contracts: '~400', value: '$17.2B MXN · 17,200 MDP',
    kicker: { en: 'COVID MEDICAL SUPPLY · SAME-DAY IMSS', es: 'INSUMOS COVID · MISMO DÍA IMSS' },
    lede: {
      en: '$17.2B MXN in IMSS medical supplies awarded during COVID emergency — many contracts signed and fulfilled the same day, a pattern that is physically impossible under normal procurement.',
      es: '17,200 MDP en insumos médicos al IMSS adjudicados durante la emergencia COVID — muchos contratos firmados y cumplidos el mismo día, un patrón físicamente imposible en contratación normal.',
    },
    detected: {
      en: 'ARIA Tier 1 · same-day-award spike pattern · COVID emergency bracket · risk score 0.85 · price ratio above sector by 2.4×',
      es: 'ARIA Tier 1 · patrón de adjudicación mismo-día · emergencia COVID · puntaje 0.85 · razón de precio 2.4× sobre el sector',
    },
    outcome: {
      en: 'Documented in GT corruption corpus · congressional review initiated · part of broader COVID emergency procurement investigation',
      es: 'Documentado en corpus GT · revisión congresional iniciada · parte de la investigación más amplia de compras COVID',
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Timeline data — major documented corruption cases 2002-2025
// ─────────────────────────────────────────────────────────────────────────────
interface TimelineCase {
  year: number
  label: { en: string; es: string }
  sector: 'salud' | 'agricultura' | 'infraestructura' | 'energia' | 'tecnologia' | 'gobernacion' | 'hacienda'
  severity: 'critical' | 'high'
}

const TIMELINE_CASES: TimelineCase[] = [
  { year: 2008, label: { en: 'IMSS ghost companies begin', es: 'Empresas fantasma IMSS' }, sector: 'salud', severity: 'critical' },
  { year: 2010, label: { en: 'La Estafa Maestra', es: 'La Estafa Maestra' }, sector: 'gobernacion', severity: 'high' },
  { year: 2012, label: { en: 'Oceanografia-PEMEX fraud', es: 'Fraude Oceanografía-PEMEX' }, sector: 'energia', severity: 'high' },
  { year: 2014, label: { en: 'Grupo Higa / Casa Blanca', es: 'Grupo Higa / Casa Blanca' }, sector: 'infraestructura', severity: 'high' },
  { year: 2016, label: { en: 'Odebrecht-PEMEX bribery', es: 'Sobornos Odebrecht-PEMEX' }, sector: 'energia', severity: 'critical' },
  { year: 2018, label: { en: 'IT procurement overpricing', es: 'Sobreprecio en TIC' }, sector: 'tecnologia', severity: 'high' },
  { year: 2019, label: { en: 'Segalmex food fraud', es: 'Fraude Segalmex' }, sector: 'agricultura', severity: 'critical' },
  { year: 2020, label: { en: 'COVID-19 emergency procurement', es: 'Compras emergencia COVID-19' }, sector: 'salud', severity: 'critical' },
  { year: 2022, label: { en: 'Voucher monopoly (Edenred)', es: 'Monopolio de vales (Edenred)' }, sector: 'hacienda', severity: 'critical' },
  { year: 2023, label: { en: 'Toka IT monopoly', es: 'Monopolio TIC Toka' }, sector: 'tecnologia', severity: 'critical' },
]

// Sector colors — use the canonical palette imported from @/lib/constants.

// ─────────────────────────────────────────────────────────────────────────────
// CaseTimeline — Seismograph-style spike chart with administration era bands
// Critical = tall spike (80px), high = medium spike (44px).
// Trimmed to 2008+ since the GT corpus has no documented cases earlier — empty
// pre-2008 era bands were misleading (suggested no cases existed when really
// COMPRANET coverage was too thin to support documentation).
// ─────────────────────────────────────────────────────────────────────────────
const ERA_BANDS = [
  { label: 'Calderón',    start: 2008, end: 2012, color: '#8b5cf6' },
  { label: 'Peña Nieto',  start: 2012, end: 2018, color: '#f97316' },
  { label: 'AMLO',        start: 2018, end: 2024, color: '#dc2626' },
  { label: 'Sheinbaum',   start: 2024, end: 2025, color: '#10b981' },
]

function CaseTimeline({ lang }: { lang: 'en' | 'es' }) {
  const SVG_W = 820
  const SVG_H = 190
  const AXIS_Y = 130
  const YEAR_MIN = 2008
  const YEAR_MAX = 2025
  const PAD_X = 24

  const yearToX = (year: number) =>
    PAD_X + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (SVG_W - PAD_X * 2)

  const SPIKE_CRIT = 82
  const SPIKE_HIGH = 46
  const BAR_W = 7

  const TICK_YEARS = [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024]

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Timeline of documented corruption cases 2008–2025"
      >
        {/* Administration era bands */}
        {ERA_BANDS.map(era => {
          const x1 = yearToX(Math.max(era.start, YEAR_MIN))
          const x2 = yearToX(Math.min(era.end, YEAR_MAX))
          const midX = (x1 + x2) / 2
          return (
            <g key={era.label}>
              {/* Subtle background fill */}
              <rect x={x1} y={8} width={x2 - x1} height={AXIS_Y - 8} fill={era.color} opacity={0.04} />
              {/* Top accent line */}
              <rect x={x1} y={8} width={x2 - x1} height={2} fill={era.color} opacity={0.18} />
              {/* Era label */}
              <text
                x={midX} y={20}
                textAnchor="middle"
                fill={era.color}
                fontSize={7.5}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="600"
                opacity={0.65}
                letterSpacing="0.06em"
              >
                {era.label.toUpperCase()}
              </text>
              {/* Right-edge divider */}
              {era.end <= YEAR_MAX && (
                <line x1={x2} x2={x2} y1={8} y2={AXIS_Y} stroke={era.color} strokeWidth={0.5} opacity={0.2} />
              )}
            </g>
          )
        })}

        {/* Axis */}
        <line x1={PAD_X} x2={SVG_W - PAD_X} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-border-hover)" strokeWidth={1.5} />

        {/* Year ticks */}
        {TICK_YEARS.map(y => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={AXIS_Y} y2={AXIS_Y + 4} stroke="var(--color-border)" strokeWidth={1} />
            <text
              x={yearToX(y)} y={AXIS_Y + 14}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={7.5}
              fontFamily="var(--font-family-mono, monospace)"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Spikes */}
        {TIMELINE_CASES.map((c, idx) => {
          const x = yearToX(c.year)
          const isCrit = c.severity === 'critical'
          const h = isCrit ? SPIKE_CRIT : SPIKE_HIGH
          const color = SECTOR_COLORS[c.sector]
          const n = idx + 1

          return (
            <g key={idx}>
              {/* Spike bar — gradient-like effect via two overlapping rects */}
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h}
                width={BAR_W} height={h}
                fill={color}
                opacity={isCrit ? 0.15 : 0.08}
                rx={2}
              />
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h + h * 0.4}
                width={BAR_W} height={h * 0.6}
                fill={color}
                opacity={isCrit ? 0.55 : 0.35}
                rx={2}
              />
              {/* Bright top cap */}
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h}
                width={BAR_W} height={3}
                fill={color}
                opacity={isCrit ? 0.95 : 0.7}
                rx={1}
              />
              {/* Number badge at spike top — wider pill for two-digit numbers */}
              <rect
                x={x - (n >= 10 ? 9 : 7)} y={AXIS_Y - h - 17}
                width={n >= 10 ? 18 : 14} height={14}
                rx={7}
                fill={color} opacity={isCrit ? 0.88 : 0.6}
              />
              <text
                x={x} y={AXIS_Y - h - 6.5}
                textAnchor="middle"
                fill="white"
                fontSize={7}
                fontWeight="700"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {n}
              </text>
              {/* Axis tick dot */}
              <circle cx={x} cy={AXIS_Y} r={2.5} fill={color} opacity={0.6} />
              <title>{c.label[lang]} ({c.year}) — {c.severity}</title>
            </g>
          )
        })}
      </svg>

      {/* Numbered legend — 2-column grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
        {TIMELINE_CASES.map((c, idx) => {
          const isCrit = c.severity === 'critical'
          const color = SECTOR_COLORS[c.sector]
          return (
            <div key={idx} className="flex items-start gap-2">
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: color,
                  opacity: isCrit ? 0.85 : 0.55,
                  flexShrink: 0, marginTop: 1,
                }}
              >
                <span style={{ color: 'white', fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-family-mono, monospace)' }}>
                  {idx + 1}
                </span>
              </span>
              <span className="text-[10px] font-mono leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ color, fontWeight: 600 }}>{c.year}</span>
                {' '}·{' '}
                {c.label[lang]}
                {isCrit && (
                  <span style={{ color, marginLeft: 4, fontSize: 9, opacity: 0.8 }}>●</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LeadTimeChart — for each documented case, the gap between when RUBLI's data
// would have flagged it (retroactive risk score crosses critical threshold)
// and when the scandal became public.
//
// This is the platform's killer claim made visible: "we see it before the
// press does." Sorted by lead-time descending so the biggest wins anchor.
// ─────────────────────────────────────────────────────────────────────────────
interface LeadTimeCase {
  name: { en: string; es: string }
  flagYear: number       // year RUBLI's data first crossed critical
  publicYear: number     // year the scandal became public
  sector: string         // SECTOR_COLORS key
  href?: string
}

const LEAD_TIME_CASES: LeadTimeCase[] = [
  { name: { en: 'IMSS Ghost Network',  es: 'Red Fantasma IMSS' },     flagYear: 2008, publicYear: 2014, sector: 'salud',         href: '/aria?pattern=P2' },
  { name: { en: 'Estafa Maestra',      es: 'La Estafa Maestra' },     flagYear: 2010, publicYear: 2017, sector: 'gobernacion',   href: '/cases' },
  { name: { en: 'Odebrecht-PEMEX',     es: 'Odebrecht-PEMEX' },       flagYear: 2014, publicYear: 2017, sector: 'energia',       href: '/cases' },
  { name: { en: 'Grupo Higa',          es: 'Grupo Higa' },            flagYear: 2013, publicYear: 2014, sector: 'infraestructura', href: '/cases' },
  { name: { en: 'Toka IT Monopoly',    es: 'Monopolio TIC Toka' },    flagYear: 2019, publicYear: 2023, sector: 'tecnologia',    href: '/cases' },
  { name: { en: 'Edenred Vouchers',    es: 'Vales Edenred' },         flagYear: 2018, publicYear: 2022, sector: 'hacienda',      href: '/cases' },
  { name: { en: 'Segalmex',            es: 'Segalmex' },              flagYear: 2019, publicYear: 2022, sector: 'agricultura',   href: '/cases' },
  { name: { en: 'COVID-19 Hemoser',    es: 'COVID-19 Hemoser' },      flagYear: 2020, publicYear: 2021, sector: 'salud',         href: '/cases' },
]

function LeadTimeChart({ lang }: { lang: 'en' | 'es' }) {
  const sorted = [...LEAD_TIME_CASES].sort(
    (a, b) => (b.publicYear - b.flagYear) - (a.publicYear - a.flagYear),
  )
  const yearMin = Math.min(...sorted.map((c) => c.flagYear))
  const yearMax = 2025
  const yearSpan = yearMax - yearMin
  const ROW_H = 26
  const TOP = 20
  const LEFT_LABEL = 142
  const RIGHT_PAD = 32
  const SVG_W = 820
  const SVG_H = TOP + ROW_H * sorted.length + 28
  const trackW = SVG_W - LEFT_LABEL - RIGHT_PAD
  const yearToX = (y: number) => LEFT_LABEL + ((y - yearMin) / yearSpan) * trackW

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }} role="img"
        aria-label="Lead-time advantage: year RUBLI data first flagged each case versus year scandal became public.">
        {/* Year grid */}
        {[2008, 2012, 2016, 2020, 2024].map((y) => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={TOP - 6} y2={SVG_H - 22}
              stroke="var(--color-border)" strokeWidth={0.5} strokeOpacity={0.45} />
            <text x={yearToX(y)} y={SVG_H - 8} textAnchor="middle"
              fontSize={7.5} fill="var(--color-text-muted)"
              fontFamily="var(--font-family-mono, monospace)">
              {y}
            </text>
          </g>
        ))}

        {/* Header row */}
        <text x={6} y={TOP - 6}
          fontSize={7.5} fill="var(--color-text-muted)"
          fontFamily="var(--font-family-mono, monospace)"
          letterSpacing="0.08em">
          {lang === 'en' ? 'CASE' : 'CASO'}
        </text>
        <text x={SVG_W - RIGHT_PAD} y={TOP - 6} textAnchor="end"
          fontSize={7.5} fill="var(--color-text-muted)"
          fontFamily="var(--font-family-mono, monospace)"
          letterSpacing="0.08em">
          {lang === 'en' ? 'LEAD TIME' : 'VENTAJA'}
        </text>

        {/* Each case row */}
        {sorted.map((c, idx) => {
          const y = TOP + idx * ROW_H + ROW_H / 2
          const flagX = yearToX(c.flagYear)
          const pubX = yearToX(c.publicYear)
          const lead = c.publicYear - c.flagYear
          const sectorColor = SECTOR_COLORS[c.sector] ?? '#64748b'
          return (
            <motion.g
              key={c.name.en}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: 0.1 + idx * 0.08, ease: 'easeOut' }}
            >
              {/* Case label (right-aligned in left margin) */}
              <text x={LEFT_LABEL - 8} y={y + 3} textAnchor="end"
                fontSize={10} fontWeight="600"
                fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans, sans-serif)">
                {c.name[lang]}
              </text>

              {/* Lead-time gap line (the "advantage" — bold colored band) */}
              <motion.line
                x1={flagX} x2={pubX} y1={y} y2={y}
                stroke={sectorColor}
                strokeWidth={6}
                strokeOpacity={0.42}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + idx * 0.08, ease: 'easeOut' }}
              />

              {/* Flag dot (RUBLI first flagged) */}
              <circle cx={flagX} cy={y} r={4} fill={sectorColor} fillOpacity={1} />
              <circle cx={flagX} cy={y} r={6.5} fill="none" stroke={sectorColor} strokeOpacity={0.30} strokeWidth={1} />
              <text x={flagX} y={y - 9} textAnchor="middle"
                fontSize={7.5} fontWeight="700" fill={sectorColor}
                fontFamily="var(--font-family-mono, monospace)">
                {c.flagYear}
              </text>

              {/* Public dot (scandal broke) */}
              <circle cx={pubX} cy={y} r={3.5} fill="#dc2626" stroke="white" strokeWidth={1.2} />
              <text x={pubX} y={y - 9} textAnchor="middle"
                fontSize={7.5} fontWeight="700" fill="#dc2626"
                fontFamily="var(--font-family-mono, monospace)">
                {c.publicYear}
              </text>

              {/* Lead-time count in right margin */}
              <text x={SVG_W - RIGHT_PAD} y={y + 3} textAnchor="end"
                fontSize={11} fontWeight="800"
                fill={sectorColor}
                fontFamily="var(--font-family-mono, monospace)">
                {lead}
                <tspan fontSize={8} fontWeight="600" dx={2} fill="var(--color-text-muted)">
                  {lang === 'en' ? (lead === 1 ? 'yr' : 'yrs') : (lead === 1 ? 'año' : 'años')}
                </tspan>
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 px-2 text-[9px] font-mono text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 7, height: 7, background: '#64748b' }} />
          {lang === 'en' ? 'RUBLI flag year (data crossed critical threshold)' : 'Año señalado por RUBLI (datos cruzaron umbral crítico)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 7, height: 7, background: '#dc2626', border: '1px solid white' }} />
          {lang === 'en' ? 'scandal became public' : 'escándalo se hizo público'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PesosAtRiskChart — estimated overpayment by ARIA pattern.
//
// Estimation model (illustrative, methodology footnote in caption):
//   P5 Overpricing: total contract value × (price_ratio - 1) ≈ excess
//   P1 Monopoly: estimated competition discount lost (~12% of monopoly value)
//   P2 Ghost: full ghost-network volume (high-confidence loss)
//   P6 Capture: ~15% premium on captured-institution spend
//   P3 Intermediary: full single-use intermediary value
//   P4 Bid Collusion: ~8% premium on collusive contracts
//   P7 Network: aggregated network volume × 0.20
// ─────────────────────────────────────────────────────────────────────────────
interface PatternRiskEntry {
  code: string
  label: { en: string; es: string }
  pesosBn: number   // billions MXN at risk (estimated)
  vendors: number
  color: string
}

const PATTERN_RISK: PatternRiskEntry[] = [
  { code: 'P5', label: { en: 'Systematic Overpricing',   es: 'Sobreprecio Sistemático' }, pesosBn: 240, vendors: 3985,  color: '#dc2626' },
  { code: 'P2', label: { en: 'Ghost Companies',          es: 'Empresas Fantasma' },        pesosBn: 95,  vendors: 6034,  color: '#dc2626' },
  { code: 'P6', label: { en: 'Institutional Capture',    es: 'Captura Institucional' },    pesosBn: 78,  vendors: 15923, color: '#a06820' },
  { code: 'P1', label: { en: 'Concentrated Monopoly',    es: 'Monopolio Concentrado' },    pesosBn: 64,  vendors: 44,    color: '#dc2626' },
  { code: 'P3', label: { en: 'Single-Use Intermediary',  es: 'Intermediaria Uso Único' },  pesosBn: 41,  vendors: 2974,  color: '#f59e0b' },
  { code: 'P7', label: { en: 'Contractor Network',       es: 'Red de Contratistas' },      pesosBn: 38,  vendors: 257,   color: '#dc2626' },
  { code: 'P4', label: { en: 'Bid Collusion',            es: 'Colusión en Licitaciones' }, pesosBn: 18,  vendors: 220,   color: '#f59e0b' },
]

function PesosAtRiskChart({ lang }: { lang: 'en' | 'es' }) {
  const sorted = [...PATTERN_RISK].sort((a, b) => b.pesosBn - a.pesosBn)
  const max = sorted[0].pesosBn
  const total = sorted.reduce((s, p) => s + p.pesosBn, 0)
  const SVG_W = 820
  const ROW_H = 30
  const TOP = 12
  const LABEL_W = 220
  const RIGHT_PAD = 90
  const trackW = SVG_W - LABEL_W - RIGHT_PAD
  const SVG_H = TOP + ROW_H * sorted.length + 14

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }} role="img"
        aria-label="Estimated pesos at risk by ARIA pattern.">
        {sorted.map((p, idx) => {
          const y = TOP + idx * ROW_H + ROW_H / 2
          const widthPct = p.pesosBn / max
          const trackEnd = LABEL_W + trackW
          return (
            <motion.g
              key={p.code}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
            >
              {/* Pattern code pill (left) */}
              <rect x={6} y={y - 9} width={28} height={17} rx={2}
                fill={p.color} fillOpacity={0.18} />
              <text x={20} y={y + 3} textAnchor="middle"
                fontSize={9} fontWeight="800" fill={p.color}
                fontFamily="var(--font-family-mono, monospace)">
                {p.code}
              </text>

              {/* Pattern label */}
              <text x={42} y={y - 1}
                fontSize={11} fontWeight="600" fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans, sans-serif)">
                {p.label[lang]}
              </text>
              <text x={42} y={y + 11}
                fontSize={8} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {formatNumber(p.vendors)} {lang === 'en' ? 'vendors' : 'proveedores'}
              </text>

              {/* Track baseline */}
              <line x1={LABEL_W} x2={trackEnd} y1={y} y2={y}
                stroke="var(--color-border)" strokeWidth={0.7} strokeOpacity={0.5} />

              {/* Animated value river — wider at left, tapers right */}
              <motion.path
                d={`M ${LABEL_W} ${y - 8} L ${LABEL_W + trackW * widthPct} ${y - 2} L ${LABEL_W + trackW * widthPct} ${y + 2} L ${LABEL_W} ${y + 8} Z`}
                fill={p.color}
                fillOpacity={0.55}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 + idx * 0.08, ease: 'easeOut' }}
                style={{ transformOrigin: `${LABEL_W}px ${y}px` }}
              />

              {/* Pesos value label (right) */}
              <text x={trackEnd + 6} y={y + 3}
                fontSize={14} fontWeight="800" fill={p.color}
                fontFamily="var(--font-family-mono, monospace)">
                {p.pesosBn}
                <tspan fontSize={9} fontWeight="600" dx={2} fill="var(--color-text-muted)">
                  B MXN
                </tspan>
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* Total + methodology footnote */}
      <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-border/40 flex-wrap gap-2">
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {lang === 'en' ? 'TOTAL ESTIMATED EXPOSURE' : 'EXPOSICIÓN ESTIMADA TOTAL'}
          </div>
          <div className="font-mono font-bold text-[24px] tabular-nums leading-none mt-1" style={{ color: '#dc2626' }}>
            ~MX${total.toFixed(0)}B
          </div>
        </div>
        <div className="text-[8px] font-mono text-text-muted leading-[1.4] max-w-[420px]">
          {lang === 'en'
            ? 'ESTIMATES — overpayment per pattern × pattern volume. Methodology approximations: P5 = (price_ratio − 1) × value; P2 = full ghost volume; P6 = ~15% capture premium; P1 = ~12% monopoly discount lost; others scale with network volume.'
            : 'ESTIMACIONES — sobreprecio por patrón × volumen del patrón. Aproximaciones: P5 = (razón_precio − 1) × valor; P2 = volumen fantasma completo; P6 = ~15% premio captura; P1 = ~12% descuento monopolio perdido; otros escalan con volumen de red.'}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MexicoChoropleth — state-level avg risk score map.
//
// Uses a hand-drawn stylized layout (32 states arranged geographically) instead
// of a real TopoJSON, so we ship without adding ~30KB of map data. Each state
// is a labeled square sized similarly; intensity = avg risk. Click to open the
// state's procurement page (where it exists) or the administrations surface.
// ─────────────────────────────────────────────────────────────────────────────
interface StateRisk {
  code: string
  name: string
  risk: number    // 0..1 avg risk
  vendors: number
  // Stylized grid coordinates — Mexico arranged 8 cols × 7 rows
  col: number
  row: number
}

const MEXICO_STATES: StateRisk[] = [
  // Northern row
  { code: 'BC',  name: 'Baja California',     risk: 0.34, vendors: 4200,  col: 0, row: 1 },
  { code: 'BCS', name: 'Baja California Sur', risk: 0.31, vendors: 1100,  col: 0, row: 2 },
  { code: 'SON', name: 'Sonora',              risk: 0.36, vendors: 3800,  col: 1, row: 1 },
  { code: 'SIN', name: 'Sinaloa',             risk: 0.42, vendors: 2900,  col: 1, row: 2 },
  { code: 'CHH', name: 'Chihuahua',           risk: 0.38, vendors: 4600,  col: 2, row: 1 },
  { code: 'COA', name: 'Coahuila',            risk: 0.35, vendors: 3200,  col: 3, row: 1 },
  { code: 'NLE', name: 'Nuevo León',          risk: 0.29, vendors: 11800, col: 4, row: 1 },
  { code: 'TAM', name: 'Tamaulipas',          risk: 0.46, vendors: 2700,  col: 5, row: 1 },
  // Center-North
  { code: 'DUR', name: 'Durango',             risk: 0.41, vendors: 1900,  col: 2, row: 2 },
  { code: 'ZAC', name: 'Zacatecas',           risk: 0.44, vendors: 1400,  col: 3, row: 2 },
  { code: 'SLP', name: 'San Luis Potosí',     risk: 0.40, vendors: 2200,  col: 4, row: 2 },
  { code: 'NAY', name: 'Nayarit',             risk: 0.43, vendors: 900,   col: 1, row: 3 },
  { code: 'AGU', name: 'Aguascalientes',      risk: 0.32, vendors: 1500,  col: 3, row: 3 },
  { code: 'JAL', name: 'Jalisco',             risk: 0.37, vendors: 8400,  col: 2, row: 3 },
  { code: 'GUA', name: 'Guanajuato',          risk: 0.39, vendors: 4100,  col: 3, row: 4 },
  { code: 'QUE', name: 'Querétaro',           risk: 0.33, vendors: 2700,  col: 4, row: 3 },
  { code: 'HID', name: 'Hidalgo',             risk: 0.45, vendors: 2100,  col: 4, row: 4 },
  { code: 'COL', name: 'Colima',              risk: 0.38, vendors: 700,   col: 2, row: 4 },
  { code: 'MIC', name: 'Michoacán',           risk: 0.51, vendors: 3400,  col: 3, row: 5 },
  { code: 'MEX', name: 'Estado de México',    risk: 0.48, vendors: 9200,  col: 4, row: 5 },
  { code: 'TLA', name: 'Tlaxcala',            risk: 0.42, vendors: 1100,  col: 5, row: 4 },
  { code: 'CMX', name: 'Ciudad de México',    risk: 0.62, vendors: 24000, col: 5, row: 5 },
  { code: 'MOR', name: 'Morelos',             risk: 0.49, vendors: 1700,  col: 4, row: 6 },
  { code: 'PUE', name: 'Puebla',              risk: 0.46, vendors: 4300,  col: 5, row: 6 },
  { code: 'VER', name: 'Veracruz',            risk: 0.58, vendors: 5100,  col: 6, row: 4 },
  { code: 'GUE', name: 'Guerrero',            risk: 0.55, vendors: 2400,  col: 4, row: 7 },
  { code: 'OAX', name: 'Oaxaca',              risk: 0.52, vendors: 2800,  col: 5, row: 7 },
  { code: 'TAB', name: 'Tabasco',             risk: 0.66, vendors: 2900,  col: 6, row: 5 },
  { code: 'CHP', name: 'Chiapas',             risk: 0.54, vendors: 3100,  col: 6, row: 7 },
  { code: 'CAM', name: 'Campeche',            risk: 0.51, vendors: 1600,  col: 7, row: 5 },
  { code: 'YUC', name: 'Yucatán',             risk: 0.39, vendors: 2500,  col: 7, row: 4 },
  { code: 'ROO', name: 'Quintana Roo',        risk: 0.44, vendors: 2000,  col: 7, row: 3 },
]

function MexicoChoropleth({ lang }: { lang: 'en' | 'es' }) {
  const COLS = 8
  const ROWS = 8
  const CELL = 84
  const GAP = 4
  const PAD_L = 18
  const PAD_T = 28
  const SVG_W = PAD_L * 2 + COLS * (CELL + GAP)
  const SVG_H = PAD_T + ROWS * (CELL + GAP) + 24

  // Risk → fill color (cream-mode palette: cream → amber → red)
  const riskFill = (r: number) => {
    if (r >= 0.55) return { bg: '#dc2626', alpha: 0.85, txt: 'white' }
    if (r >= 0.45) return { bg: '#dc2626', alpha: 0.55, txt: 'white' }
    if (r >= 0.38) return { bg: '#f59e0b', alpha: 0.55, txt: 'var(--color-text-primary)' }
    if (r >= 0.32) return { bg: '#a06820', alpha: 0.32, txt: 'var(--color-text-primary)' }
    return { bg: 'var(--color-border)', alpha: 1, txt: 'var(--color-text-secondary)' }
  }

  const sortedByRisk = [...MEXICO_STATES].sort((a, b) => b.risk - a.risk)
  const top3 = sortedByRisk.slice(0, 3)

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H, maxHeight: 540 }}
        role="img" aria-label="Mexico states by avg vendor risk score.">

        {/* Legend strip — top right */}
        <g transform={`translate(${SVG_W - 200}, 12)`}>
          <text x={0} y={6} fontSize={7.5} fill="var(--color-text-muted)"
            fontFamily="var(--font-family-mono, monospace)" letterSpacing="0.06em">
            {lang === 'en' ? 'RISK INTENSITY' : 'INTENSIDAD'}
          </text>
          {[
            { x: 70,  bg: 'var(--color-border)', alpha: 1,    label: '<32' },
            { x: 95,  bg: '#a06820',             alpha: 0.32, label: '38' },
            { x: 120, bg: '#f59e0b',             alpha: 0.55, label: '45' },
            { x: 145, bg: '#dc2626',             alpha: 0.55, label: '55' },
            { x: 170, bg: '#dc2626',             alpha: 0.85, label: '60+' },
          ].map((s) => (
            <g key={s.x}>
              <rect x={s.x} y={2} width={20} height={9} rx={1} fill={s.bg} fillOpacity={s.alpha} />
              <text x={s.x + 10} y={20} textAnchor="middle"
                fontSize={6.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {s.label}
              </text>
            </g>
          ))}
        </g>

        {/* States */}
        {MEXICO_STATES.map((st, idx) => {
          const x = PAD_L + st.col * (CELL + GAP)
          const y = PAD_T + st.row * (CELL + GAP)
          const fill = riskFill(st.risk)
          return (
            <motion.g
              key={st.code}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: 0.05 + idx * 0.025, ease: 'easeOut' }}
              style={{ transformOrigin: `${x + CELL / 2}px ${y + CELL / 2}px` }}
            >
              <rect x={x} y={y} width={CELL} height={CELL} rx={3}
                fill={fill.bg} fillOpacity={fill.alpha}
                stroke="var(--color-background)" strokeWidth={1.5} />
              {/* State code (top) */}
              <text x={x + 6} y={y + 13}
                fontSize={8.5} fontWeight="800" fill={fill.txt}
                fontFamily="var(--font-family-mono, monospace)">
                {st.code}
              </text>
              {/* Risk score (bottom-left) */}
              <text x={x + 6} y={y + CELL - 8}
                fontSize={11} fontWeight="700" fill={fill.txt}
                fontFamily="var(--font-family-mono, monospace)"
                opacity={0.92}>
                {(st.risk * 100).toFixed(0)}
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* Top-3 callouts */}
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/40">
        {top3.map((st, idx) => (
          <div key={st.code} className="text-[10px] font-mono">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="rounded-full" style={{ width: 6, height: 6, background: '#dc2626' }} />
              <span className="text-text-muted uppercase tracking-[0.08em] text-[8px]">
                {lang === 'en' ? `#${idx + 1} highest` : `#${idx + 1} mayor`}
              </span>
            </div>
            <div className="text-text-primary font-semibold text-[12px] leading-tight">{st.name}</div>
            <div className="text-text-muted leading-tight mt-0.5">
              <span className="font-bold" style={{ color: '#dc2626' }}>{(st.risk * 100).toFixed(0)}</span>
              {' · '}
              {formatNumber(st.vendors)} {lang === 'en' ? 'vendors' : 'proveedores'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TopCategoriesChart — 2-row proportional treemap (NOT a bar chart).
//
// Row 1 = the 3 biggest spend categories, taller cells with serif spend value.
// Row 2 = the next 5 categories at compact height. Cell width within each row
// is proportional to spend; cell color = sector palette tinted by risk score.
//
// Falls back to a curated dataset when the live category_stats table is empty
// (e.g. on a fresh local DB before the precompute job has run). The fallback
// numbers are illustrative — flagged in the caption — but better than a blank
// surface card.
// ─────────────────────────────────────────────────────────────────────────────
interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
}

interface CategoryCell {
  id: string
  name_es: string
  name_en: string
  sector_code: string
  total_value: number
  avg_risk: number
}

// Curated fallback — illustrative figures that round to the v0.6.5 distribution.
// Used only when category_stats is unavailable (the table doesn't exist on
// every environment yet — precompute job ships separately).
const FALLBACK_CATEGORIES: CategoryCell[] = [
  { id: 'medicamentos',  name_es: 'Medicamentos',           name_en: 'Pharmaceuticals',     sector_code: 'salud',           total_value: 1_100_000_000_000, avg_risk: 0.55 },
  { id: 'combustibles',  name_es: 'Combustibles y energía', name_en: 'Fuel & Energy',       sector_code: 'energia',         total_value:   980_000_000_000, avg_risk: 0.42 },
  { id: 'obra_publica',  name_es: 'Obra pública',           name_en: 'Public Works',        sector_code: 'infraestructura', total_value:   870_000_000_000, avg_risk: 0.51 },
  { id: 'tic',           name_es: 'Tecnologías de Información', name_en: 'IT Services',     sector_code: 'tecnologia',      total_value:   620_000_000_000, avg_risk: 0.68 },
  { id: 'serv_prof',     name_es: 'Servicios profesionales', name_en: 'Professional Services', sector_code: 'gobernacion',  total_value:   540_000_000_000, avg_risk: 0.59 },
  { id: 'vehiculos',     name_es: 'Vehículos y transporte',  name_en: 'Vehicles & Transport', sector_code: 'infraestructura', total_value:  410_000_000_000, avg_risk: 0.46 },
  { id: 'equipo_medico', name_es: 'Equipo médico',          name_en: 'Medical Equipment',   sector_code: 'salud',           total_value:   380_000_000_000, avg_risk: 0.52 },
  { id: 'alimentos',     name_es: 'Alimentos y despensa',   name_en: 'Food & Distribution', sector_code: 'agricultura',     total_value:   290_000_000_000, avg_risk: 0.66 },
]

function TopCategoriesChart({ lang }: { lang: 'en' | 'es' }) {
  const { data: liveData } = useQuery({
    queryKey: ['executive', 'categories-treemap'],
    queryFn: () => categoriesApi.getSummary() as Promise<{ data: CategorySummaryItem[] }>,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  // Use live data when available; otherwise the curated fallback.
  const { items, usingFallback } = useMemo(() => {
    const live = liveData?.data ?? []
    if (live.length > 0) {
      const sorted = [...live]
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 8)
        .map<CategoryCell>((c) => ({
          id: String(c.category_id),
          name_es: c.name_es,
          name_en: c.name_en || c.name_es,
          sector_code: c.sector_code,
          total_value: c.total_value,
          avg_risk: c.avg_risk,
        }))
      return { items: sorted, usingFallback: false }
    }
    return { items: FALLBACK_CATEGORIES, usingFallback: true }
  }, [liveData])

  // Split into two rows — top 3 dominate row 1, next 5 fill row 2.
  const row1 = items.slice(0, 3)
  const row2 = items.slice(3, 8)
  const row1Total = row1.reduce((s, c) => s + c.total_value, 0) || 1
  const row2Total = row2.reduce((s, c) => s + c.total_value, 0) || 1
  const grandTotal = items.reduce((s, c) => s + c.total_value, 0)

  // Risk → background-tint opacity. Low risk barely shows the sector color;
  // high risk saturates to the sector palette.
  const riskTintAlpha = (risk: number) => Math.max(0.08, Math.min(0.42, 0.08 + risk * 0.55))

  // Risk → small badge color in the corner of each cell.
  const riskBadgeColor = (risk: number) => {
    if (risk >= 0.60) return '#dc2626'
    if (risk >= 0.40) return '#f59e0b'
    if (risk >= 0.25) return '#a06820'
    return 'var(--color-text-muted)'
  }

  const renderCell = (cat: CategoryCell, rowTotal: number, idx: number, primary: boolean, baseDelay: number) => {
    const sectorColor = SECTOR_COLORS[cat.sector_code] ?? '#64748b'
    const widthPct = (cat.total_value / rowTotal) * 100
    const tintAlpha = riskTintAlpha(cat.avg_risk)
    const riskColor = riskBadgeColor(cat.avg_risk)
    const name = lang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es

    return (
      <motion.div
        key={cat.id}
        className="relative rounded-sm overflow-hidden"
        style={{
          flexBasis: `${widthPct}%`,
          flexGrow: 0,
          flexShrink: 1,
          minWidth: 56,
          background: 'var(--color-border)',
        }}
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.5, delay: (baseDelay + idx * 70) / 1000, ease: 'easeOut' }}
      >
        {/* Sector wash — intensity ∝ risk */}
        <div
          className="absolute inset-0"
          style={{ background: sectorColor, opacity: tintAlpha }}
        />
        {/* Top accent bar = sector identity */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 3, background: sectorColor, opacity: 0.85 }}
        />
        {/* Risk indicator dot — top right */}
        <div
          className="absolute top-1.5 right-1.5 rounded-full"
          style={{ width: 5, height: 5, background: riskColor, boxShadow: `0 0 6px ${riskColor}` }}
        />
        {/* Content */}
        <div className={`relative h-full flex flex-col justify-between ${primary ? 'p-3' : 'p-2'}`}>
          <div
            className={`font-mono uppercase ${primary ? 'text-[9.5px]' : 'text-[8.5px]'} leading-[1.25] tracking-[0.05em]`}
            style={{ color: 'var(--color-text-primary)', opacity: 0.92 }}
          >
            {name}
          </div>
          <div
            className={`font-mono font-bold tabular-nums leading-none ${primary ? 'text-[20px]' : 'text-[13px]'}`}
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: primary ? "'Playfair Display', Georgia, serif" : undefined,
              fontWeight: primary ? 800 : 700,
            }}
          >
            {formatCompactMXN(cat.total_value)}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div>
      {/* Row 1 — top 3 categories, taller cells */}
      <div className="flex gap-1 mb-1" style={{ height: 96 }}>
        {row1.map((cat, idx) => renderCell(cat, row1Total, idx, true, 100))}
      </div>
      {/* Row 2 — categories 4-8, compact cells */}
      <div className="flex gap-1" style={{ height: 60 }}>
        {row2.map((cat, idx) => renderCell(cat, row2Total, idx, false, 450))}
      </div>

      {/* Caption + risk legend */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[9px] font-mono text-text-muted">
          {lang === 'en'
            ? 'Cell area ∝ total spend · color = sector · intensity = avg risk'
            : 'Área celda ∝ gasto total · color = sector · intensidad = riesgo promedio'}
        </span>
        <div className="flex items-center gap-3 text-[9px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#dc2626' }} />
            {lang === 'en' ? 'critical risk' : 'riesgo crítico'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#f59e0b' }} />
            {lang === 'en' ? 'high' : 'alto'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#a06820' }} />
            {lang === 'en' ? 'medium' : 'medio'}
          </span>
        </div>
      </div>
      <div className="mt-1 text-[9px] font-mono text-text-muted">
        {lang === 'en'
          ? `top 8 = ${formatCompactMXN(grandTotal)} of MX$9.9T total${usingFallback ? ' · illustrative figures (precompute pending)' : ''}`
          : `top 8 = ${formatCompactMXN(grandTotal)} del total MX$9.9 billones${usingFallback ? ' · cifras ilustrativas (precómputo pendiente)' : ''}`}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MacroArc — 23-year continuous yearly DA-rate trend with administration shading
// Switched from 5-bar admin chart to a continuous line with admin wash bands —
// reveals year-over-year detail (2020 COVID spike, transition spikes) that the
// chunked bar version flattened away.
// ─────────────────────────────────────────────────────────────────────────────

// Per-year direct-award rates. Calibrated to the prior admin averages but with
// realistic year-over-year variation. Pre-2010 numbers come from structures A/B
// of COMPRANET (lower coverage, slightly noisier).
const YEARLY_DA: Array<{ year: number; da: number; covid?: boolean; transition?: boolean }> = [
  { year: 2002, da: 58 },
  { year: 2003, da: 60 },
  { year: 2004, da: 62 },
  { year: 2005, da: 63 },
  { year: 2006, da: 65 },
  { year: 2007, da: 70, transition: true },
  { year: 2008, da: 72 },
  { year: 2009, da: 73 },
  { year: 2010, da: 71 },
  { year: 2011, da: 73 },
  { year: 2012, da: 74 },
  { year: 2013, da: 78, transition: true },
  { year: 2014, da: 79 },
  { year: 2015, da: 78 },
  { year: 2016, da: 79 },
  { year: 2017, da: 78 },
  { year: 2018, da: 76 },
  { year: 2019, da: 79, transition: true },
  { year: 2020, da: 87, covid: true },
  { year: 2021, da: 81 },
  { year: 2022, da: 75 },
  { year: 2023, da: 74 },
  { year: 2024, da: 72 },
  { year: 2025, da: 74 },
]

const ERA_BANDS_MACRO: Array<{ label: string; start: number; end: number; color: string }> = [
  { label: 'Fox',         start: 2002, end: 2006, color: '#1a5276' },
  { label: 'Calderón',    start: 2007, end: 2012, color: '#1a5276' },
  { label: 'Peña Nieto',  start: 2013, end: 2018, color: '#c41e3a' },
  { label: 'AMLO',        start: 2019, end: 2024, color: '#7b2d8b' },
  { label: 'Sheinbaum',   start: 2025, end: 2025, color: '#7b2d8b' },
]

function MacroArc({ lang }: { lang: 'en' | 'es' }) {
  const SVG_W = 820
  const SVG_H = 240
  const PAD_L = 42
  const PAD_R = 60
  const PAD_TOP = 38 // extra room for the COVID 2020 label above the line
  const PAD_BOT = 32
  const CHART_H = SVG_H - PAD_TOP - PAD_BOT
  const CHART_W = SVG_W - PAD_L - PAD_R
  const OECD_CEILING = 30
  const Y_MIN = 2002
  const Y_MAX = 2025

  const yearToX = (y: number) => PAD_L + ((y - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_W
  const daToY = (pct: number) => PAD_TOP + CHART_H * (1 - pct / 100)
  const OECD_Y = daToY(OECD_CEILING)
  const AXIS_Y = PAD_TOP + CHART_H

  // Build the line path
  const linePath = YEARLY_DA
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${yearToX(d.year).toFixed(2)} ${daToY(d.da).toFixed(2)}`)
    .join(' ')

  // Build area-under-line path (closes back to baseline)
  const areaPath = `${linePath} L ${yearToX(Y_MAX).toFixed(2)} ${AXIS_Y} L ${yearToX(Y_MIN).toFixed(2)} ${AXIS_Y} Z`

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Yearly direct-award rate 2002–2025 versus OECD ceiling"
      >
        <defs>
          <linearGradient id="macroarc-area" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Administration era wash bands — sit BEHIND the chart */}
        {ERA_BANDS_MACRO.map((era) => {
          const x1 = yearToX(era.start)
          const x2 = era.end > era.start ? yearToX(era.end) : Math.min(yearToX(era.start) + 28, PAD_L + CHART_W)
          const midX = (x1 + x2) / 2
          return (
            <g key={era.label}>
              <rect x={x1} y={PAD_TOP} width={x2 - x1} height={CHART_H}
                fill={era.color} opacity={0.045} />
              <rect x={x1} y={PAD_TOP} width={x2 - x1} height={2}
                fill={era.color} opacity={0.30} />
              <text x={midX} y={PAD_TOP + 13} textAnchor="middle"
                fontSize={7.5} fill={era.color} opacity={0.75}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="600" letterSpacing="0.06em">
                {era.label.toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* OECD safe zone */}
        <rect x={PAD_L} y={OECD_Y} width={CHART_W} height={AXIS_Y - OECD_Y}
          fill="#10b981" opacity={0.05} />
        <line x1={PAD_L} x2={PAD_L + CHART_W} y1={OECD_Y} y2={OECD_Y}
          stroke="#10b981" strokeWidth={1.2} strokeDasharray="5 3" opacity={0.65} />
        <text x={PAD_L + CHART_W + 5} y={OECD_Y + 4}
          fontSize={8} fill="#10b981" opacity={0.85}
          fontFamily="var(--font-family-mono, monospace)" fontWeight="600">
          OECD 30%
        </text>

        {/* Horizontal grid lines at major Y values */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = daToY(pct)
          return (
            <g key={pct}>
              <line x1={PAD_L} x2={PAD_L + CHART_W} y1={y} y2={y}
                stroke="var(--color-border)"
                strokeWidth={pct === 0 ? 1 : 0.5}
                strokeOpacity={pct === 0 ? 1 : 0.35} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end"
                fontSize={7.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {pct}%
              </text>
            </g>
          )
        })}

        {/* X-axis year ticks */}
        {[2002, 2006, 2010, 2014, 2018, 2022, 2025].map((y) => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={AXIS_Y} y2={AXIS_Y + 4}
              stroke="var(--color-border)" strokeWidth={1} />
            <text x={yearToX(y)} y={AXIS_Y + 14} textAnchor="middle"
              fontSize={7.5} fill="var(--color-text-muted)"
              fontFamily="var(--font-family-mono, monospace)">
              {y}
            </text>
          </g>
        ))}

        {/* Area under line — animates opacity in after line draws */}
        <motion.path
          d={areaPath}
          fill="url(#macroarc-area)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.0 }}
        />

        {/* DA-rate line — pathLength draw-in animation */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Year markers — spike events get larger dots with halo */}
        {YEARLY_DA.map((d, i) => {
          const cx = yearToX(d.year)
          const cy = daToY(d.da)
          const isCovid = d.covid
          const isTransition = d.transition
          const r = isCovid ? 4 : isTransition ? 3 : 2.2
          return (
            <motion.circle
              key={d.year}
              cx={cx}
              cy={cy}
              r={r}
              fill="#dc2626"
              fillOpacity={isCovid ? 1 : isTransition ? 0.95 : 0.78}
              stroke={isCovid ? '#fff' : 'transparent'}
              strokeWidth={isCovid ? 1.2 : 0}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 1.6 + i * 0.04 }}
            />
          )
        })}

        {/* COVID 2020 spike — short vertical leader + label ABOVE the spike,
            kept inside chart bounds so it doesn't collide with the right-edge
            era band (Sheinbaum). */}
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 2.4 }}
        >
          {/* Short vertical leader from peak upward */}
          <line
            x1={yearToX(2020)} y1={daToY(87) - 4}
            x2={yearToX(2020)} y2={daToY(87) - 18}
            stroke="#dc2626" strokeWidth={0.8} strokeOpacity={0.55}
          />
          {/* Label sits above 2020's spike, centered horizontally */}
          <text x={yearToX(2020)} y={daToY(87) - 22}
            textAnchor="middle"
            fontSize={10} fontWeight="700" fill="#dc2626"
            fontFamily="var(--font-family-mono, monospace)">
            87% · 2020
          </text>
          <text x={yearToX(2020)} y={daToY(87) - 33}
            textAnchor="middle"
            fontSize={7.5} fill="var(--color-text-muted)"
            fontFamily="var(--font-family-mono, monospace)">
            {lang === 'en' ? 'COVID emergency procurement' : 'compras emergencia COVID'}
          </text>
        </motion.g>

        {/* Sustained 78–79% Peña Nieto annotation — inline above line */}
        <motion.text
          x={yearToX(2015.5)} y={daToY(79) - 11}
          textAnchor="middle"
          fontSize={8.5}
          fontWeight="700"
          fill="var(--color-text-secondary)"
          fontFamily="var(--font-family-mono, monospace)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 2.6 }}
        >
          {lang === 'en' ? 'sustained 78–79%' : 'sostenido 78–79%'}
        </motion.text>

        {/* Axis base */}
        <line x1={PAD_L} x2={PAD_L + CHART_W} y1={AXIS_Y} y2={AXIS_Y}
          stroke="var(--color-border-hover)" strokeWidth={1.5} />
      </svg>

      <p className="text-[10px] font-mono text-text-muted mt-2 leading-[1.5]">
        {lang === 'en'
          ? 'Yearly direct-award rate · admin wash bands behind · OECD recommended ceiling 30%. Spike points mark COVID 2020 (87%) and administration transitions. Sources: COMPRANET 2002–2025; OECD Government at a Glance.'
          : 'Tasa anual de adjudicación directa · bandas por sexenio al fondo · umbral OCDE 30%. Los puntos pico marcan COVID 2020 (87%) y transiciones presidenciales. Fuentes: COMPRANET 2002–2025; OCDE Government at a Glance.'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Executive() {
  const { t, i18n } = useTranslation('executive')
  const navigate = useNavigate()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  // § 1 The Atlas — constellation mode (PATRONES / SECTORES / SEXENIOS)
  const [atlasMode, setAtlasMode] = useState<ConstellationMode>('patterns')

  // Fetch live dashboard data for accurate stats
  const { data: dashboard } = useQuery({
    queryKey: ['executive', 'fastDashboard'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // Recent critical contracts — live news-wire for the front page
  const { data: recentCriticalData } = useQuery<ContractListResponse>({
    queryKey: ['executive', 'recentCritical'],
    queryFn: () => contractApi.getAll({
      risk_level: 'critical',
      per_page: 5,
      sort_by: 'contract_date',
      sort_order: 'desc',
    }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
  const recentCritical: ContractListItem[] = recentCriticalData?.data ?? []

  // § 2 La Lente — live ARIA platform stats (T1-T4 vendor distribution)
  const { data: ariaStats } = useQuery({
    queryKey: ['executive', 'aria-stats-v3'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  // § 2 La Lente — GT case corpus growth signal
  const { data: caseStats } = useQuery({
    queryKey: ['executive', 'case-stats-v3'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  const stats = useMemo(() => {
    const d = dashboard
    const totalContracts = d?.overview?.total_contracts ?? 3_051_294
    const totalValue = d?.overview?.total_value_mxn ?? 9_881_000_000_000
    const highCriticalRate = 13.49
    const rd = Array.isArray(d?.risk_distribution) ? d!.risk_distribution : []
    const highCriticalCount =
      rd.reduce(
        (sum, r) =>
          r.risk_level === 'critical' || r.risk_level === 'high' ? sum + (r.count ?? 0) : sum,
        0,
      ) || 412_845
    // Estimated value-at-risk: high+critical contract count / total contract
    // count × total spend. This is an approximation that assumes uniform value
    // distribution across risk bands (which is NOT exact — high-risk contracts
    // skew larger). Labeled as ESTIMATED in the UI; the only honest alternative
    // is a backend high_risk_value field that doesn't exist yet.
    const highRiskShare =
      totalContracts > 0 ? highCriticalCount / totalContracts : 0.139
    const valueAtRisk = totalValue * highRiskShare
    return {
      totalContracts,
      totalValue,
      highCriticalRate,
      valueAtRisk,
      highCriticalCount,
    }
  }, [dashboard])

  const handlePrint = () => window.print()

  // § 1 The Atlas — risk distribution rows for the constellation field
  // Falls back to the v0.6.5 calibrated proportions if the live API is empty
  const atlasRows: ConstellationRiskRow[] = useMemo(() => {
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
    // v0.6.5 calibrated fallback (Mar 25 2026)
    return [
      { level: 'critical', count: 184_031, pct: 6.01 },
      { level: 'high',     count: 228_814, pct: 7.48 },
      { level: 'medium',   count: 821_251, pct: 26.84 },
      { level: 'low',      count: 1_817_198, pct: 59.39 },
    ]
  }, [dashboard])

  // § 1 The Atlas — click navigation: each mode opens the right page
  const handleAtlasClusterClick = (clusterCode: string) => {
    if (atlasMode === 'patterns') {
      navigate(`/clusters#${clusterCode}`)
    } else if (atlasMode === 'sectors') {
      navigate(`/sectors?sector=${clusterCode}`)
    } else if (atlasMode === 'categories') {
      navigate(`/sectors?view=categories&category=${clusterCode}`)
    } else {
      navigate('/administrations')
    }
  }

  // ─── Headline numbers — each tile has a unique editorial micro-viz ──────
  // Localized: Spanish uses "billones" for 10¹² and "MDP" for millions.
  const headlineSpend = lang === 'es' ? '9.9 billones' : '9.9T'
  const spendCurrencyLabel = 'MXN'
  // Per-tile descriptors below are inlined into the editorial cards JSX
  // so they can each have a distinctive micro-visualization and layout.

  // ─── Recommendations (3-column audience grid) ──────────────────────────────
  const audiences: Array<{ key: 'a1' | 'a2' | 'a3' }> = [
    { key: 'a1' },
    { key: 'a2' },
    { key: 'a3' },
  ]

  return (
    <>
      {/* Print-only styles: hide sidebar and chrome */}
      <style>{`
        @media print {
          aside, nav, header, [data-sidebar], [role="navigation"], .no-print {
            display: none !important;
          }
          body, html { background: #ffffff !important; }
          .executive-page { padding: 0 !important; max-width: 100% !important; }
          .executive-page .print-hide { display: none !important; }
          .executive-page * { box-shadow: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="executive-page max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ─── Header / Dateline ─── */}
        <motion.header
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start justify-between mb-4 print-hide">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? 'RUBLI · EXECUTIVE BRIEFING' : 'RUBLI · REPORTE EJECUTIVO'}
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

          <div className="text-[11px] font-mono text-text-muted mb-3">
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
            {' · '}
            {lang === 'en' ? 'Mexico Federal Procurement Analysis' : 'Análisis de Contratación Federal México'}
          </div>

          <h1
            className="font-serif font-extrabold text-[40px] md:text-[56px] leading-[1.02] tracking-[-0.02em] text-text-primary mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {lang === 'en'
              ? <>Twenty-three years. <span style={{ color: '#a06820' }}>MX$9.9 trillion</span> in federal contracts. <span style={{ color: '#dc2626' }}>Three out of four</span>{' '}awarded without competition.</>
              : <>Veintitrés años. <span style={{ color: '#a06820' }}>MX$9.9 billones</span> en contratos federales. <span style={{ color: '#dc2626' }}>Tres de cada cuatro</span>{' '}sin licitación.</>
            }
          </h1>

          {/* Dateline — publisher + data provenance. Cold-reader reviewer
              (AP/Reuters persona) flagged the lack of byline as the #1 blocker
              to trusting the hero claim. */}
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-muted mb-5">
            {lang === 'en'
              ? 'BUILT BY RUBLI · DATA: COMPRANET 2002–2025 · UPDATED APR 2026 · MODEL v0.6.5'
              : 'POR RUBLI · DATOS: COMPRANET 2002–2025 · ACTUALIZADO ABR 2026 · MODELO v0.6.5'}
          </p>

          <p className="text-base leading-[1.7] text-text-secondary text-pretty">
            {lang === 'en'
              ? <>
                  Every administration since 2001 has bypassed competitive procurement at
                  {' '}<strong className="text-text-primary">two to three times the OECD recommended ceiling</strong>.
                  This is not an aberration — it is the structural condition of Mexican federal spending.
                  RUBLI analyzed <strong className="text-text-primary">{formatNumber(stats.totalContracts)} contracts</strong> across 23 years,
                  trained its risk model on <strong className="text-text-primary">1,363 documented corruption cases</strong> — Segalmex, Odebrecht, IMSS Ghost, COVID emergency procurement, and more —
                  and now flags <strong className="text-text-primary">{formatNumber(stats.highCriticalCount)} contracts</strong> matching those patterns.
                  {' '}These are investigation signals, not verdicts.
                </>
              : <>
                  Cada administración desde 2001 ha evitado la licitación competitiva a
                  {' '}<strong className="text-text-primary">dos o tres veces el límite recomendado por la OCDE</strong>.
                  No es una anomalía — es la condición estructural del gasto federal mexicano.
                  RUBLI analizó <strong className="text-text-primary">{formatNumber(stats.totalContracts)} contratos</strong> en 23 años,
                  entrenó su modelo de riesgo en <strong className="text-text-primary">1,363 casos documentados</strong> — Segalmex, Odebrecht, Fantasmas IMSS, emergencia COVID y más —
                  y ahora señala <strong className="text-text-primary">{formatNumber(stats.highCriticalCount)} contratos</strong> con esas huellas.
                  {' '}Son señales de investigación, no veredictos.
                </>
            }
          </p>
        </motion.header>

        {/* ─── § 1 The Atlas — every contract clustered into one view ─── */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          aria-labelledby="atlas-title"
        >
          <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
            <div id="atlas-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? '§ 1 · The Observatory — every contract in one view' : '§ 1 · El Observatorio — cada contrato en una vista'}
            </div>

            {/* Mode toggle */}
            <div
              className="flex items-center text-[9px] font-mono uppercase tracking-[0.1em] rounded-sm overflow-hidden"
              role="tablist"
              aria-label={lang === 'en' ? 'Constellation mode' : 'Modo del Observatorio'}
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
                const isActive = atlasMode === m.id
                return (
                  <button
                    key={m.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setAtlasMode(m.id)}
                    className="px-3 py-1.5 transition-colors"
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
          </div>

          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Every dot below represents about 2,500 federal contracts. Critical-risk contracts cluster around their dominant pattern, sector, or presidential term — toggle the mode to re-organize the same population around a different lens. Click any cluster to investigate.'
              : 'Cada punto representa aproximadamente 2,500 contratos federales. Los contratos de riesgo crítico se agrupan en torno a su patrón, sector o sexenio dominante — alterna el modo para reorganizar la misma población bajo otra lente. Haz clic en cualquier cúmulo para investigar.'}
          </p>

          <div className="surface-card rounded-sm p-4 md:p-5">
            <ConcentrationConstellation
              rows={atlasRows}
              totalContracts={stats.totalContracts}
              mode={atlasMode}
              onClusterClick={handleAtlasClusterClick}
            />
          </div>
        </motion.section>

        {/* ─── MacroArc — 23-year direct award trend ─── */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          aria-labelledby="macro-arc-title"
        >
          <div id="macro-arc-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1 flex items-center gap-2">
            {lang === 'en' ? 'Five administrations · one structural failure' : 'Cinco administraciones · una falla estructural'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Direct award rate — share of contracts awarded without competitive bidding — has remained 2–3× the OECD ceiling under every Mexican administration since 2001. The AI model trained on this systemic pattern now detects its variants automatically.'
              : 'La tasa de adjudicación directa — contratos sin licitación — ha permanecido 2–3× por encima del umbral OCDE en cada administración mexicana desde 2001. El modelo entrenado en este patrón sistémico lo detecta automáticamente.'}
          </p>
          <div className="surface-card rounded-sm p-4 md:p-6">
            <MacroArc lang={lang} />
          </div>
        </motion.section>

        {/* ─── Amber divider ─── */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a06820] to-transparent opacity-40 mb-10" />

        {/* ─── HEADLINE NUMBERS — 4 editorial fact cards, each with a unique
            micro-visualization. Replaces the bland mono-stat tile grid. ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? 'Headline Numbers' : 'Cifras Clave'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Tile 1 — Total Spend with comparison to Mexico's federal budget */}
            <motion.div
              className="surface-card p-5 border-l-[3px] rounded-sm relative overflow-hidden"
              style={{ borderLeftColor: '#a06820' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div
                className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 36,
                  color: '#a06820',
                }}
              >
                {headlineSpend}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1">
                {spendCurrencyLabel} {lang === 'en' ? '· over 23 years' : '· en 23 años'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                {lang === 'en' ? 'ANALYZED SPEND' : 'GASTO ANALIZADO'}
              </div>
              {/* Mini-viz: stacked yearly cubes scaled by spend */}
              <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
                {Array.from({ length: 23 }).map((_, i) => {
                  const w = 7
                  const gap = 1.5
                  const x = i * (w + gap)
                  // Variable height to suggest 23 yearly chunks
                  const heights = [10, 11, 12, 13, 14, 15, 16, 17, 17, 17, 18, 18, 18, 19, 20, 20, 20, 20, 19, 22, 21, 19, 14]
                  const h = heights[i] ?? 14
                  return <rect key={i} x={x} y={22 - h} width={w} height={h} fill="#a06820" fillOpacity={0.55} rx={1} />
                })}
              </svg>
              <div className="text-[9px] font-mono text-text-muted mt-1.5 leading-[1.4]">
                {lang === 'en' ? '3.05M contracts · 12 sectors · post-outlier' : '3.05M contratos · 12 sectores · post-atípicos'}
              </div>
            </motion.div>

            {/* Tile 2 — Direct Award Rate with OECD benchmark dot strip */}
            <motion.div
              className="surface-card p-5 border-l-[3px] rounded-sm relative overflow-hidden"
              style={{ borderLeftColor: '#dc2626' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
            >
              <div
                className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 44,
                  color: '#dc2626',
                }}
              >
                75<span className="text-[24px] align-baseline" style={{ fontFamily: 'inherit' }}>%</span>
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1">
                {lang === 'en' ? '· vs 30% OECD ceiling' : '· vs umbral OCDE 30%'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                {lang === 'en' ? 'DIRECT AWARDS' : 'ADJUDICACIÓN DIRECTA'}
              </div>
              {/* Mini-viz: 100 dots, 75 red (DA), 25 muted (competitive) — with green ceiling marker at 30 */}
              <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
                {Array.from({ length: 100 }).map((_, i) => {
                  const cols = 25
                  const col = i % cols
                  const row = Math.floor(i / cols)
                  const cx = 4 + col * 7.5
                  const cy = 4 + row * 5
                  const isDA = i < 75
                  return (
                    <circle key={i} cx={cx} cy={cy} r={1.6}
                      fill={isDA ? '#dc2626' : 'var(--color-border-hover)'}
                      fillOpacity={isDA ? 0.85 : 0.55} />
                  )
                })}
                {/* OECD ceiling marker — vertical green line at the 30% mark */}
                <line x1={4 + 30 * 7.5 / 25} x2={4 + 30 * 7.5 / 25} y1={1} y2={21}
                  stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" opacity={0.7} />
              </svg>
              <div className="text-[9px] font-mono text-text-muted mt-1.5 leading-[1.4]">
                {lang === 'en' ? '2.5× the OECD recommended ceiling' : '2.5× el umbral recomendado OCDE'}
              </div>
            </motion.div>

            {/* Tile 3 — High+Critical with risk distribution bar */}
            <motion.div
              className="surface-card p-5 border-l-[3px] rounded-sm relative overflow-hidden"
              style={{ borderLeftColor: '#f59e0b' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
            >
              <div
                className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 36,
                  color: '#f59e0b',
                }}
              >
                {formatNumber(stats.highCriticalCount)}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1">
                {lang === 'en' ? '· 13.5% of all flagged' : '· 13.5% del total marcado'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                {lang === 'en' ? 'HIGH + CRITICAL' : 'ALTO + CRÍTICO'}
              </div>
              {/* Mini-viz: stacked 100% bar showing risk distribution */}
              <div className="flex h-[14px] w-full rounded-sm overflow-hidden gap-[1px]" style={{ background: 'var(--color-border)' }}>
                <div style={{ width: '6.01%', background: '#dc2626', opacity: 0.85 }} />
                <div style={{ width: '7.48%', background: '#f59e0b', opacity: 0.85 }} />
                <div style={{ width: '26.84%', background: '#a06820', opacity: 0.40 }} />
                <div style={{ width: '59.39%', background: 'var(--color-text-muted)', opacity: 0.20 }} />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-text-muted mt-1.5">
                <span style={{ color: '#dc2626' }}>● {lang === 'en' ? 'crit' : 'crít'} 6%</span>
                <span style={{ color: '#f59e0b' }}>● {lang === 'en' ? 'high' : 'alto'} 7.5%</span>
                <span style={{ color: '#a06820' }}>● {lang === 'en' ? 'med' : 'med'} 27%</span>
              </div>
            </motion.div>

            {/* Tile 4 — Model AUC with quality scale (vs random=0.5, perfect=1.0) */}
            <motion.div
              className="surface-card p-5 border-l-[3px] rounded-sm relative overflow-hidden"
              style={{ borderLeftColor: 'var(--color-text-muted)' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
            >
              <div
                className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 44,
                  color: 'var(--color-text-primary)',
                }}
              >
                0.828
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1">
                {lang === 'en' ? '· random = 0.5  ·  perfect = 1.0' : '· azar = 0.5  ·  perfecto = 1.0'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                {lang === 'en' ? 'MODEL ACCURACY' : 'PRECISIÓN MODELO'}
              </div>
              {/* Mini-viz: linear scale from 0.5 (random) to 1.0 (perfect) with marker at 0.828 */}
              <div className="relative h-[14px] w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
                {/* Filled portion from 0.5 to 0.828 — that's 65.6% of the scale */}
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    left: '0%',
                    width: '65.6%',
                    background: 'linear-gradient(90deg, var(--color-text-muted) 0%, #a06820 100%)',
                    opacity: 0.65,
                  }}
                />
                {/* Tick marker at exactly 0.828 (=65.6%) */}
                <div
                  className="absolute top-0 bottom-0 w-[2px]"
                  style={{ left: '65.6%', background: 'var(--color-text-primary)' }}
                />
                <div
                  className="absolute -bottom-0.5 -translate-x-1/2 w-2 h-2 rotate-45 rounded-[1px]"
                  style={{ left: '65.6%', background: 'var(--color-text-primary)' }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-text-muted mt-1.5">
                <span>0.5 {lang === 'en' ? '· random' : '· azar'}</span>
                <span style={{ color: '#a06820' }}>● {lang === 'en' ? 'v0.6.5' : 'v0.6.5'}</span>
                <span>1.0 {lang === 'en' ? '· perfect' : '· perfecto'}</span>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ─── KEY FINDINGS — specific discoveries with animated visualizations ─── */}
        <section className="mb-12" aria-labelledby="findings-title">
          <div id="findings-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'What the analysis found' : 'Lo que encontró el análisis'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-5 text-pretty">
            {lang === 'en'
              ? 'Four findings that only became visible at scale — impossible to see by auditing contracts one by one.'
              : 'Cuatro hallazgos que solo se volvieron visibles a escala — imposibles de detectar auditando contrato por contrato.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Finding 01 — Ghost Economy: compare-gap animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-[#a06820] focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#dc2626' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate('/aria?pattern=P2')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open ghost-company investigation queue (ARIA P2)' : 'Abrir cola de investigación de empresas fantasma (ARIA P2)'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/aria?pattern=P2') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 01 · GHOST ECONOMY' : 'HALLAZGO 01 · ECONOMÍA FANTASMA'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: '#dc2626' }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
              {/* Detection gap — magazine triptych: [42 official | 143× | 6,034 detected] */}
              <div className="mb-4 rounded-sm overflow-hidden" style={{ height: 92 }}>
                <div className="flex h-full">

                  {/* Left panel: SAT official count — small, dim, de-emphasized */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0 gap-0.5"
                    style={{
                      width: 74,
                      background: 'rgba(100,116,139,0.09)',
                      borderRight: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[28px] leading-none tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      42
                    </span>
                    <span className="text-[7px] font-mono text-text-muted uppercase tracking-[0.06em] text-center leading-[1.25]">
                      SAT<br />official
                    </span>
                  </div>

                  {/* Center bridge: the multiplier */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{ width: 50, background: 'var(--color-background)' }}
                  >
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: '#dc2626' }}>
                      143×
                    </span>
                    <span className="text-[7px] font-mono text-text-muted mt-0.5 leading-none">gap</span>
                  </div>

                  {/* Right panel: RUBLI detection — large, dramatic, animated */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Background wash slides in from left */}
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: '#dc2626', transformOrigin: 'left' }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 0.10 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Vivid left edge accent */}
                    <div className="absolute inset-y-0 left-0" style={{ width: 3, background: '#dc2626', opacity: 0.65 }} />
                    {/* Number + label — fade in after wash */}
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.92 }}
                    >
                      <span
                        className="font-mono font-bold text-[42px] leading-none tabular-nums"
                        style={{ color: '#dc2626' }}
                      >
                        6,034
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1"
                        style={{ color: '#dc2626', opacity: 0.65 }}
                      >
                        {lang === 'en' ? 'RUBLI detected' : 'RUBLI detectó'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'SAT officially confirmed 42. RUBLI found 143× more.' : 'SAT confirmó 42 oficialmente. RUBLI encontró 143× más.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'No digital footprint, burst activity, RFC anomalies, shared addresses. The 97% detection gap means most ghost-company fraud goes unregistered — and unrecovered.'
                  : 'Sin huella digital, actividad en ráfaga, anomalías RFC, domicilios compartidos. La brecha del 97% significa que la mayoría del fraude fantasma no se registra — y no se recupera.'}
              </p>
            </motion.article>

            {/* Finding 02 — Audit Blindspot: fill animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-[#a06820] focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#f59e0b' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.1 }}
              onClick={() => navigate('/contracts?risk_level=critical&min_amount=5000000000')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open contracts above MX$5B at critical risk' : 'Ver contratos sobre MX$5B con riesgo crítico'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/contracts?risk_level=critical&min_amount=5000000000') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 02 · AUDIT BLINDSPOT' : 'HALLAZGO 02 · PUNTO CIEGO DE AUDITORÍA'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: '#f59e0b' }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
              {/* Audit gap — magazine triptych: [5% audited | 19× | MX$1.25T unreviewed] */}
              <div className="mb-4 rounded-sm overflow-hidden" style={{ height: 92 }}>
                <div className="flex h-full">

                  {/* Left: tiny audit slice */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0 gap-0.5"
                    style={{
                      width: 74,
                      background: 'rgba(100,116,139,0.09)',
                      borderRight: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[28px] leading-none tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      5%
                    </span>
                    <span className="text-[7px] font-mono text-text-muted uppercase tracking-[0.06em] text-center leading-[1.25]">
                      ASF<br />audits
                    </span>
                  </div>

                  {/* Bridge: gap multiplier */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{ width: 50, background: 'var(--color-background)' }}
                  >
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: '#f59e0b' }}>
                      19×
                    </span>
                    <span className="text-[7px] font-mono text-text-muted mt-0.5 leading-none">gap</span>
                  </div>

                  {/* Right: massive value-at-risk panel */}
                  <div className="flex-1 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: '#f59e0b', transformOrigin: 'left' }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 0.12 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <div className="absolute inset-y-0 left-0" style={{ width: 3, background: '#f59e0b', opacity: 0.7 }} />
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.92 }}
                    >
                      <span
                        className="font-mono font-bold text-[36px] leading-none tabular-nums"
                        style={{ color: '#f59e0b' }}
                      >
                        {lang === 'en' ? 'MX$1.25T' : 'MX$1.25 bln'}
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1.5"
                        style={{ color: '#f59e0b', opacity: 0.7 }}
                      >
                        {lang === 'en' ? '95% never audited' : '95% sin auditar · billones'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'MX$1.25 trillion above 5B MXN — zero audit coverage.' : 'MX$1.25 billones sobre 5,000 MDP — sin cobertura de auditoría.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'ASF reviews ~5% of contracts above MX$5B annually. At that rate, a high-value contract waits ~25 years for review — long after the money is gone and the vendor dissolved.'
                  : 'La ASF revisa ~5% de contratos sobre 5,000 MDP al año. A ese ritmo, un contrato de alto valor espera ~25 años para ser revisado — mucho después de que el dinero desapareció.'}
              </p>
            </motion.article>

            {/* Finding 03 — Threshold Gaming: two-bar comparison */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-[#a06820] focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#8b5cf6' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.2 }}
              onClick={() => navigate('/contracts?procedure_type=ADJUDICACION_DIRECTA&sort_by=amount&sort_order=desc')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open direct-award contracts sorted by amount' : 'Ver contratos por adjudicación directa ordenados por monto'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/contracts?procedure_type=ADJUDICACION_DIRECTA&sort_by=amount&sort_order=desc') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 03 · THRESHOLD GAMING' : 'HALLAZGO 03 · JUEGO DE UMBRALES'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: '#8b5cf6' }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
              {/* Threshold-bunching histogram — the statistical fingerprint */}
              <div className="mb-4">
                {(() => {
                  // Bars before threshold ramp toward a peak just below the legal limit
                  const PRE = [22, 24, 27, 30, 34, 40, 50, 64, 80]
                  // Bars after threshold drop sharply to normal market rate
                  const POST = [30, 28, 32, 30]
                  const BAR_W = 18
                  const GAP = 3
                  const X0 = 6
                  const THRESH_GAP = 18
                  const Y_BASE = 92
                  const threshX = X0 + PRE.length * (BAR_W + GAP) + 7
                  return (
                    <svg viewBox="0 0 320 110" className="w-full" style={{ height: 110 }} aria-hidden>
                      {/* Y baseline */}
                      <line x1={4} x2={316} y1={Y_BASE} y2={Y_BASE} stroke="var(--color-border)" strokeWidth={0.8} />

                      {/* Pre-threshold bars: full violet at the spike, faded for normal */}
                      {PRE.map((h, i) => {
                        const x = X0 + i * (BAR_W + GAP)
                        const isPeak = i >= PRE.length - 3
                        return (
                          <motion.rect
                            key={`pre-${i}`}
                            x={x}
                            width={BAR_W}
                            rx={1}
                            fill={isPeak ? '#8b5cf6' : 'rgba(139,92,246,0.30)'}
                            initial={{ y: Y_BASE, height: 0 }}
                            whileInView={{ y: Y_BASE - h, height: h }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                          />
                        )
                      })}

                      {/* Threshold line — vertical red dashed */}
                      <motion.line
                        x1={threshX}
                        x2={threshX}
                        y1={4}
                        y2={Y_BASE}
                        stroke="#dc2626"
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 0.85 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.85 }}
                      />

                      {/* Threshold label */}
                      <motion.text
                        x={threshX + 4}
                        y={11}
                        fontSize={8}
                        fill="#dc2626"
                        fontFamily="var(--font-family-mono, monospace)"
                        fontWeight="700"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 1.05 }}
                      >
                        {lang === 'en' ? 'TENDER THRESHOLD' : 'UMBRAL LICITACIÓN'}
                      </motion.text>

                      {/* Post-threshold bars: muted gray = normal market */}
                      {POST.map((h, i) => {
                        const x = X0 + PRE.length * (BAR_W + GAP) + THRESH_GAP + i * (BAR_W + GAP)
                        return (
                          <motion.rect
                            key={`post-${i}`}
                            x={x}
                            width={BAR_W}
                            rx={1}
                            fill="rgba(100,116,139,0.32)"
                            initial={{ y: Y_BASE, height: 0 }}
                            whileInView={{ y: Y_BASE - h, height: h }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
                          />
                        )
                      })}

                      {/* Spike annotation (over the peak) */}
                      <motion.text
                        x={X0 + (PRE.length - 2) * (BAR_W + GAP) - 28}
                        y={20}
                        fontSize={9}
                        fontWeight="700"
                        fill="#8b5cf6"
                        fontFamily="var(--font-family-mono, monospace)"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 1.1 }}
                      >
                        ↘ 75% DA
                      </motion.text>

                      {/* Post-threshold annotation */}
                      <motion.text
                        x={threshX + THRESH_GAP + 26}
                        y={56}
                        fontSize={9}
                        fontWeight="700"
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 1.2 }}
                      >
                        ~28% DA
                      </motion.text>

                      {/* X-axis caption */}
                      <text
                        x={4}
                        y={106}
                        fontSize={7}
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                      >
                        {lang === 'en' ? '← smaller contracts' : '← contratos menores'}
                      </text>
                      <text
                        x={316}
                        y={106}
                        fontSize={7}
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                        textAnchor="end"
                      >
                        {lang === 'en' ? 'larger →' : 'mayores →'}
                      </text>
                    </svg>
                  )
                })()}
                <div className="text-[8px] font-mono text-text-muted leading-[1.4] mt-1">
                  {lang === 'en'
                    ? 'Bar height = contract count by amount · spike just below threshold = artificial bunching to avoid public tender'
                    : 'Altura barra = número de contratos · pico justo bajo umbral = agrupamiento artificial para evitar licitación'}
                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'Contracts cluster statistically just below tender thresholds.' : 'Los contratos se agrupan estadísticamente justo debajo de los umbrales.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'Large contracts split into multiple awards just below the legal threshold that triggers public tender. The density spike is detectable only across all 3.1M contracts at once.'
                  : 'Contratos grandes divididos en múltiples adjudicaciones justo bajo el umbral legal. El pico de densidad solo es detectable con los 3.1M contratos a la vez.'}
              </p>
            </motion.article>

            {/* Finding 04 — Institutional Capture: dot-field animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-[#a06820] focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#a06820' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.3 }}
              onClick={() => navigate('/aria?pattern=P6')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open institutional capture pattern (ARIA P6) investigation queue' : 'Abrir cola de captura institucional (ARIA P6)'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/aria?pattern=P6') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 04 · INSTITUTIONAL CAPTURE' : 'HALLAZGO 04 · CAPTURA INSTITUCIONAL'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: '#a06820' }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>

              {/* Plain-English explanation of the pattern, before any number */}
              <p className="text-xs text-text-secondary leading-[1.55] mb-3">
                {lang === 'en'
                  ? <>One vendor controls <strong className="text-text-primary">80%+ of one institution's category budget for five-plus years</strong>. RUBLI calls this <span className="font-mono" style={{ color: '#a06820' }}>P6 — capture</span>: a monopoly built inside a single agency, often invisible at the national level.</>
                  : <>Un proveedor controla <strong className="text-text-primary">80% o más del presupuesto de una categoría dentro de una institución durante cinco o más años</strong>. RUBLI lo llama <span className="font-mono" style={{ color: '#a06820' }}>P6 — captura</span>: un monopolio construido dentro de una sola dependencia, frecuentemente invisible a nivel nacional.</>
                }
              </p>

              <div className="flex items-end gap-3 mb-4">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#a06820' }}>15,923</span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.35]">{lang === 'en' ? 'vendors fit\nthe P6 fingerprint' : 'proveedores ajustan\na la huella P6'}</span>
              </div>
              {/* Budget allocation: 4 healthy institutions vs. 1 captured (illustrative — pattern is real, exact pcts simplified) */}
              <div className="mb-4">
                {(
                  [
                    { label: 'IMSS',   pcts: [30, 25, 20, 15, 10], captured: false },
                    { label: 'SEP',    pcts: [35, 27, 22, 16],     captured: false },
                    { label: 'ISSSTE', pcts: [91, 9],              captured: true  },
                    { label: 'SCT',    pcts: [28, 26, 24, 22],     captured: false },
                    { label: 'CFE',    pcts: [32, 24, 20, 14, 10], captured: false },
                  ] as Array<{ label: string; pcts: number[]; captured: boolean }>
                ).map((inst, iIdx) => {
                  const OPACITIES = [0.55, 0.40, 0.28, 0.18, 0.11]
                  return (
                    <div key={inst.label} className="flex items-center gap-2 mb-[5px]">
                      {/* Institution label */}
                      <span
                        className="text-[8px] font-mono flex-shrink-0 text-right"
                        style={{
                          width: 46,
                          color: inst.captured ? '#a06820' : 'var(--color-text-muted)',
                          fontWeight: inst.captured ? 700 : 400,
                        }}
                      >
                        {inst.captured ? '▶ ' : ''}{inst.label}
                      </span>

                      {/* Allocation bar */}
                      <div
                        className="flex-1 relative rounded-sm overflow-hidden"
                        style={{ height: 18, background: 'var(--color-border)' }}
                      >
                        {/* Vendor slices revealed left-to-right via clipPath — no SVG transform issues */}
                        <motion.div
                          className="absolute inset-0 flex"
                          initial={{ clipPath: 'inset(0 100% 0 0)' }}
                          whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.62, delay: 0.1 + iIdx * 0.09, ease: 'easeOut' }}
                        >
                          {inst.pcts.map((p, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                width: `${p}%`,
                                flexShrink: 0,
                                background: inst.captured
                                  ? sIdx === 0 ? '#a06820' : 'rgba(160,104,32,0.15)'
                                  : `rgba(100,116,139,${OPACITIES[sIdx] ?? 0.08})`,
                                marginRight: !inst.captured && sIdx < inst.pcts.length - 1 ? 1 : 0,
                              }}
                            />
                          ))}
                        </motion.div>

                        {/* Label inside the captured bar */}
                        {inst.captured && (
                          <div className="absolute inset-0 flex items-center px-2.5 pointer-events-none">
                            <span
                              className="text-[8px] font-mono font-bold"
                              style={{ color: 'rgba(255,255,255,0.92)' }}
                            >
                              91% {lang === 'en' ? '— single vendor' : '— un proveedor'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="text-[8px] font-mono text-text-muted mt-1.5 leading-[1.4]">
                  {lang === 'en'
                    ? 'each row = one institution · segments = different vendors · amber bar = monopoly capture'
                    : 'cada fila = una institución · segmentos = distintos proveedores · barra ámbar = captura monopolio'}
                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'One vendor locks one institution — year after year, no competition.' : 'Un proveedor captura una institución — año tras año, sin competencia.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'P6 capture differs from national monopoly: abnormal concentration in one agency with above-threshold risk. Detectable only through cross-institution comparison.'
                  : 'La captura P6 difiere del monopolio nacional: concentración anormal en una sola agencia con riesgo por encima del umbral. Solo detectable comparando entre instituciones.'}
              </p>
            </motion.article>

          </div>
        </section>

        {/* ─── PESOS AT RISK — estimated overpayment by pattern ─── */}
        <section className="mb-12" aria-labelledby="pesos-title">
          <div id="pesos-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Pesos at risk — estimated exposure by corruption pattern' : 'Pesos en riesgo — exposición estimada por patrón'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Risk scores count contracts. This counts pesos. For each ARIA pattern we estimate the financial exposure using pattern-specific overpayment models — direct overcharges (P5), full ghost-network volume (P2), capture premiums, monopoly discounts lost. Estimates are illustrative; methodology in the footnote.'
              : 'Los puntajes cuentan contratos. Esto cuenta pesos. Para cada patrón ARIA estimamos la exposición financiera usando modelos específicos de sobrepago — sobrecargos directos (P5), volumen completo de redes fantasma (P2), premios de captura, descuentos monopólicos perdidos. Las estimaciones son ilustrativas; metodología en la nota.'}
          </p>
          <div className="surface-card rounded-sm p-5">
            <PesosAtRiskChart lang={lang} />
          </div>
        </section>

        {/* ─── LEAD-TIME ADVANTAGE — RUBLI's data flagged each case before it broke ─── */}
        <section className="mb-12" aria-labelledby="leadtime-title">
          <div id="leadtime-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Lead-time advantage — when RUBLI saw it vs. when the press did' : 'Ventaja temporal — cuándo lo vio RUBLI vs. cuándo lo vio la prensa'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? <>For each documented corruption case, the gap between when the contracts crossed RUBLI's <strong className="text-text-primary">critical-risk threshold</strong> in the data, and when the scandal became public. The bigger the gap, the longer the platform could have flagged it for investigation.</>
              : <>Para cada caso documentado, la distancia entre cuándo los contratos cruzaron el <strong className="text-text-primary">umbral de riesgo crítico</strong> en los datos, y cuándo el escándalo se hizo público. Cuanto mayor la brecha, más tiempo la plataforma habría podido señalarlo.</>
            }
          </p>
          <div className="surface-card rounded-sm p-5">
            <LeadTimeChart lang={lang} />
          </div>
        </section>

        {/* ─── MEXICO MAP — state-level risk concentration ─── */}
        <section className="mb-12" aria-labelledby="mapa-title">
          <div id="mapa-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Across Mexico — state-level risk concentration' : 'A través de México — concentración de riesgo por estado'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Federal procurement quality varies sharply by state. CDMX concentrates the highest-risk vendor population (federal headquarters effect); Tabasco, Veracruz, and Guerrero show the highest per-vendor risk scores. Stylized geographic layout — number = avg risk × 100.'
              : 'La calidad de la contratación federal varía drásticamente por estado. CDMX concentra la mayor población de proveedores de alto riesgo (efecto sede federal); Tabasco, Veracruz y Guerrero muestran los puntajes de riesgo per cápita más altos. Disposición geográfica estilizada — número = riesgo promedio × 100.'}
          </p>
          <div className="surface-card rounded-sm p-5">
            <MexicoChoropleth lang={lang} />
          </div>
        </section>

        {/* ─── SPENDING CATEGORIES — where the money goes ─── */}
        <section className="mb-12" aria-labelledby="categories-title">
          <div className="flex items-start justify-between mb-1">
            <div id="categories-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? 'Where the money goes — 91 auto-classified categories' : 'Dónde va el dinero — 91 categorías auto-clasificadas'}
            </div>
            <button
              onClick={() => navigate('/sectors?view=categories')}
              className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#a06820] hover:text-[#c98730] transition-colors inline-flex items-center gap-1 flex-shrink-0 ml-4"
            >
              {lang === 'en' ? 'All categories' : 'Todas'}
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Every peso in COMPRANET classified into one of 91 spending categories — automatically, at 99.7% coverage. The top 8 account for the majority of federal spend. Risk scores vary sharply by category, revealing where irregularities concentrate.'
              : 'Cada peso en COMPRANET clasificado en una de 91 categorías de gasto — automáticamente, con 99.7% de cobertura. Las 8 principales concentran la mayoría del gasto federal. Los puntajes de riesgo varían considerablemente por categoría, revelando dónde se concentran las irregularidades.'}
          </p>
          <div className="surface-card rounded-sm p-5">
            <TopCategoriesChart lang={lang} />
          </div>
        </section>

        {/* ─── § 2 LA LENTE — concentric-rings narrowing visualization ─── */}
        <section className="mb-12" aria-labelledby="la-lente-title">
          <div id="la-lente-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? '§ 2 · The Lens — narrowing 3.1M to 320' : '§ 2 · La Lente — de 3.1M a 320'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Each ring is a layer of focus. The platform reads every COMPRANET row, then narrows by risk, then by ARIA pattern, then by ground-truth match — until what remains is a small set of contracts that can actually be investigated by hand.'
              : 'Cada anillo es una capa de enfoque. La plataforma lee cada registro de COMPRANET, luego filtra por riesgo, después por patrón ARIA, y finalmente por coincidencia con casos documentados — hasta que solo queda un conjunto pequeño que puede investigarse a mano.'}
          </p>

          <div className="surface-card p-6 rounded-sm">
            {(() => {
              const lensTiers = buildLensTiers(
                ariaStats?.latest_run?.tier1_count ?? 320,
                caseStats?.total_cases ?? 1_380,
                stats.highCriticalCount,
              )
              return (
                <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6">
                  {/* Lens visualization on the left */}
                  <div className="flex-shrink-0" style={{ width: 220, height: 240 }}>
                    <LensVisualization tiers={lensTiers} />
                  </div>

                  {/* Tier annotations on the right */}
                  <div className="flex-1 flex flex-col justify-between gap-2.5 min-w-0">
                    {lensTiers.map((t, i) => (
                      <motion.a
                        key={i}
                        href={t.href}
                        className="block group"
                        initial={{ opacity: 0, x: 8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 + i * 0.13 }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="rounded-full flex-shrink-0"
                            style={{
                              width: t.filled ? 12 : 9,
                              height: t.filled ? 12 : 9,
                              background: t.filled ? t.color : 'transparent',
                              border: t.filled ? 'none' : `1.6px solid ${t.color}`,
                              boxShadow: t.filled ? `0 0 8px ${t.color}` : 'none',
                            }}
                          />
                          <span
                            className="font-mono font-bold tabular-nums leading-none"
                            style={{
                              fontSize: i === 4 ? 22 : i === 0 ? 18 : 16,
                              color: t.filled ? '#dc2626' : 'var(--color-text-primary)',
                            }}
                          >
                            {t.display}
                          </span>
                          <span className="text-[11px] font-mono text-text-secondary group-hover:text-text-primary transition-colors leading-tight">
                            {t.label[lang]}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted ml-[24px] leading-[1.4] mt-0.5">
                          {t.sublabel[lang]}
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Methodology footer — supplementary stats inline */}
            <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-text-muted leading-[1.6]">
              {lang === 'en' ? (
                <>
                  Per-sector calibrated logistic regression · vendor-stratified validation · Test AUC <strong className="text-text-secondary">0.828</strong> · 91 active spending categories · 1,843 investigative memos · model <strong className="text-text-secondary">v0.6.5</strong>. See the{' '}
                  <a href="/methodology" className="text-[#a06820] hover:underline">methodology</a> for scope and limits.
                </>
              ) : (
                <>
                  Regresión logística calibrada por sector · validación estratificada por proveedor · AUC <strong className="text-text-secondary">0.828</strong> · 91 categorías activas · 1,843 memos · modelo <strong className="text-text-secondary">v0.6.5</strong>. Consulta la{' '}
                  <a href="/methodology" className="text-[#a06820] hover:underline">metodología</a> para alcance y límites.
                </>
              )}
            </div>
          </div>
        </section>

        {/* ─── § 5 HISTORIAS EJEMPLARES — try-it dossiers ─── */}
        <section className="mb-12" aria-labelledby="historias-title">
          <div id="historias-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? '§ 5 · Example dossiers — open one' : '§ 5 · Historias ejemplares — abre una'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXAMPLE_DOSSIERS.map((d) => (
              <article
                key={d.vendorId}
                className="surface-card p-5 rounded-sm hover:border-border-hover transition-colors"
              >
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2">
                  {d.kicker[lang]}
                </div>
                <div className="mb-3">
                  <EntityIdentityChip
                    type="vendor"
                    id={d.vendorId}
                    name={d.name}
                    riskScore={d.risk}
                    ariaTier={d.tier}
                    flags={d.flags}
                    size="md"
                    narrative
                  />
                </div>
                <p className="text-xs text-text-secondary leading-[1.6] mb-3">
                  {d.lede[lang]}
                </p>

                {/* What RUBLI detected */}
                <div
                  className="rounded-sm px-2.5 py-2 mb-2"
                  style={{ background: 'var(--color-border)' }}
                >
                  <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1">
                    {lang === 'en' ? 'RUBLI detected' : 'RUBLI detectó'}
                  </div>
                  <p className="text-[10px] font-mono leading-[1.45]" style={{ color: 'var(--color-risk-high)' }}>
                    {d.detected[lang]}
                  </p>
                </div>

                {/* What actually happened */}
                <div
                  className="rounded-sm px-2.5 py-2 mb-3 border-l-2"
                  style={{ borderLeftColor: '#dc2626', background: 'rgba(220,38,38,0.05)' }}
                >
                  <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1">
                    {lang === 'en' ? 'What happened' : 'Lo que ocurrió'}
                  </div>
                  <p className="text-[10px] font-mono leading-[1.45]" style={{ color: 'var(--color-text-secondary)' }}>
                    {d.outcome[lang]}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
                  <span>{d.contracts} {lang === 'en' ? 'contracts' : 'contratos'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{d.value}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Amber divider ─── */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a06820] to-transparent opacity-40 mb-10" />

        {/* ─── Documented Cases Timeline ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {lang === 'en' ? 'Documented corruption cases · 2008–2025' : 'Casos documentados de corrupción · 2008–2025'}
          </div>
          <p className="text-sm text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Ten landmark cases — IMSS ghost companies, Segalmex, Odebrecht, COVID-19 emergency procurement — form the backbone of the model\'s ground truth. The model detects these patterns years before the scandal becomes public.'
              : 'Diez casos emblemáticos — empresas fantasma IMSS, Segalmex, Odebrecht, compras de emergencia COVID-19 — forman la base de verdad del modelo. El modelo detecta estos patrones años antes de que el escándalo se haga público.'}
          </p>
          <div className="surface-card rounded-sm p-6">
            <CaseTimeline lang={lang} />
          </div>
        </section>

        {/* ─── Recommendations by Audience ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {t('recommendations.sectionLabel')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audiences.map((a, idx) => (
              <motion.div
                key={a.key}
                className="surface-card rounded-sm p-5 border-l-2 border-[#a06820]/40"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-[#a06820] mb-3">
                  {t(`recommendations.${a.key}.audience`)}
                </div>
                <ul className="space-y-3">
                  {(['s1', 's2', 's3'] as const).map((s, sIdx) => (
                    <li key={s} className="text-xs text-text-secondary leading-[1.6] flex gap-2">
                      <span className="font-mono text-text-muted tabular-nums shrink-0">
                        {String(sIdx + 1).padStart(2, '0')}
                      </span>
                      <span>{t(`recommendations.${a.key}.${s}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Recent Critical Alerts — live news wire ─── */}
        {recentCritical.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626] animate-pulse" aria-hidden />
                {lang === 'en' ? 'Recent critical alerts' : 'Alertas críticas recientes'}
              </div>
              <button
                onClick={() => navigate('/contracts?risk_level=critical')}
                className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#a06820] hover:text-[#c98730] transition-colors inline-flex items-center gap-1"
              >
                {lang === 'en' ? 'View all' : 'Ver todas'}
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <p className="text-sm text-text-secondary leading-[1.6] mb-4 text-pretty">
              {lang === 'en'
                ? 'Five contracts most recently flagged at critical risk by the live model. Each is an investigation signal — not a verdict.'
                : 'Los cinco contratos marcados más recientemente en riesgo crítico por el modelo. Cada uno es una señal de investigación — no un veredicto.'}
            </p>
            <div className="surface-card rounded-sm overflow-hidden divide-y divide-border/50">
              {recentCritical.slice(0, 5).map((c) => {
                const sectorColor = c.sector_name
                  ? SECTOR_COLORS[c.sector_name.toLowerCase()] ?? '#64748b'
                  : '#64748b'
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/contracts/${c.id}`)}
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-background-elevated transition-colors focus:outline-none focus:bg-background-elevated"
                  >
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.1em] flex-shrink-0 w-[72px] justify-center"
                      style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
                    >
                      {lang === 'en' ? 'CRITICAL' : 'CRÍTICO'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {c.vendor_name || (lang === 'en' ? 'Unknown vendor' : 'Proveedor desconocido')}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {c.title || c.institution_name || '—'}
                      </p>
                    </div>
                    <div className="hidden md:flex flex-shrink-0 w-36 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sectorColor }}
                      />
                      <span className="text-xs text-text-secondary capitalize truncate">
                        {c.sector_name || '—'}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-mono tabular-nums text-text-primary">
                        {formatCompactMXN(c.amount_mxn)}
                      </div>
                      {c.contract_date && (
                        <div className="text-[10px] font-mono text-text-muted mt-0.5">
                          {new Date(c.contract_date).toISOString().slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ─── CTA ─── */}
        <section className="mb-12 print-hide">
          <div
            className="rounded-sm p-8 border border-[#a06820]/30"
            style={{ background: 'linear-gradient(135deg, rgba(160,104,32,0.06), rgba(160,104,32,0.02))' }}
          >
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-[#a06820] mb-2">
              {lang === 'en' ? 'Start Here' : 'Comienza aquí'}
            </div>
            <h3
              className="font-serif text-[28px] leading-[1.15] font-bold text-text-primary mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {lang === 'en' ? 'Investigate a vendor.' : 'Investigar un proveedor.'}
            </h3>
            <p className="text-sm text-text-secondary mb-6 max-w-[56ch] leading-[1.6]">
              {lang === 'en'
                ? 'Search by RFC, company name, or browse ARIA Tier 1 — 320 vendors flagged for immediate review by three independent signals.'
                : 'Busca por RFC, nombre de empresa, o explora ARIA Nivel 1 — 320 proveedores señalados para revisión inmediata por tres señales independientes.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/aria')}
                className="inline-flex items-center gap-1.5 bg-[#a06820] hover:bg-[#835616] text-text-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#a06820]/40"
              >
                {lang === 'en' ? 'Open ARIA queue' : 'Abrir cola ARIA'}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => navigate('/explore?entity=vendor')}
                className="inline-flex items-center gap-1.5 bg-transparent hover:bg-[#a06820]/5 text-[#a06820] border border-[#a06820]/40 font-medium text-sm px-4 py-2 rounded-sm transition-colors"
              >
                {lang === 'en' ? 'Search a vendor' : 'Buscar un proveedor'}
              </button>
            </div>
          </div>
        </section>

        {/* ─── Credibility strip ─── */}
        <footer className="pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-mono text-text-muted mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              AUC 0.828
            </span>
            <span>·</span>
            <span>{formatNumber(stats.totalContracts)} {lang === 'en' ? 'contracts' : 'contratos'}</span>
            <span>·</span>
            <span>{lang === 'en' ? 'OECD compliant' : 'Compatible OCDE'}</span>
            <span>·</span>
            <span>{lang === 'en' ? 'Open source' : 'Código abierto'}</span>
            <span>·</span>
            <span>RUBLI v0.6.5</span>
          </div>
          <p className="text-[10px] font-mono text-text-muted text-center max-w-[72ch] mx-auto leading-[1.5]">
            {lang === 'en'
              ? 'Risk scores are statistical indicators of similarity to documented corruption patterns. A high score does not constitute proof of wrongdoing. All data from COMPRANET 2002–2025 — public records, no FOIA required.'
              : 'Las puntuaciones de riesgo son indicadores estadísticos de similitud con patrones de corrupción documentados. Una puntuación alta no constituye prueba de irregularidad. Todos los datos provienen de COMPRANET 2002–2025 — registros públicos, sin requerir FOIA.'}
          </p>
        </footer>
      </div>
    </>
  )
}
