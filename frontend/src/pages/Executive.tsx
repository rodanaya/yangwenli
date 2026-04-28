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

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, ArrowUpRight, Shield, Clock } from 'lucide-react'
import { analysisApi, contractApi, ariaApi, caseLibraryApi, categoriesApi } from '@/api/client'
import type { ContractListItem, ContractListResponse } from '@/api/types'
import { useQuery } from '@tanstack/react-query'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ─────────────────────────────────────────────────────────────────────────────
// § 2 La Lente — micro-stat tile used in the platform self-portrait grid
// ─────────────────────────────────────────────────────────────────────────────
function LenteStat({
  value, label, context, color, href,
}: { value: string; label: string; context: string; color: string; href?: string }) {
  const inner = (
    <>
      <div
        className="font-mono font-bold text-[24px] leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-2">
        {label}
      </div>
      <div className="text-[10px] text-text-muted mt-1 leading-[1.4]">
        {context}
      </div>
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        className="block group hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
      >
        {inner}
      </a>
    )
  }
  return <div>{inner}</div>
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
    contracts: '6,303', value: '$133.2B MXN',
    kicker: { en: 'PHARMA OLIGOPOLY · IMSS CAPTURE', es: 'OLIGOPOLIO FARMACÉUTICO · CAPTURA IMSS' },
    lede: {
      en: '$133.2B MXN in IMSS medicines over 14 years — 60% of the entire pharma category. A single distributor holding a majority of Mexico\'s public drug supply, 79% awarded without competitive bidding.',
      es: '$133.2B MXN en medicamentos al IMSS en 14 años — 60% de toda la categoría farmacéutica. Un solo distribuidor con la mayoría del suministro de medicamentos públicos de México, 79% sin licitación.',
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
      es: 'Paraestatal al centro de un escándalo de MX$15B en distribución de alimentos. Fondos desviados de un programa que alimenta a los hogares más pobres de México — tortillas, leche y frijoles que nunca llegaron.',
    },
    detected: {
      en: 'Anchor GT case · avg risk score 0.66 · P6 capture pattern · 90%+ direct-award rate · network links to shell intermediaries',
      es: 'Caso GT ancla · puntaje de riesgo promedio 0.66 · patrón de captura P6 · 90%+ adjudicación directa · vínculos con intermediarios fantasma',
    },
    outcome: {
      en: 'MX$15B diverted from food subsidies · FGR criminal investigation ongoing since 2022 · parastatal placed under federal intervention',
      es: 'MX$15B desviados de subsidios alimentarios · investigación penal FGR en curso desde 2022 · paraestatal sometida a intervención federal',
    },
  },
  {
    vendorId: 6038,
    name: 'HEMOSER, S.A. DE C.V.',
    risk: 0.85, tier: 1, flags: ['gt'],
    contracts: '~400', value: '$17.2B MXN',
    kicker: { en: 'COVID MEDICAL SUPPLY · SAME-DAY IMSS', es: 'INSUMOS COVID · MISMO DÍA IMSS' },
    lede: {
      en: '$17.2B MXN in IMSS medical supplies awarded during COVID emergency — many contracts signed and fulfilled the same day, a pattern that is physically impossible under normal procurement.',
      es: '$17.2B MXN en insumos médicos al IMSS adjudicados durante la emergencia COVID — muchos contratos firmados y cumplidos el mismo día, un patrón físicamente imposible en contratación normal.',
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
// Numbered markers eliminate label collision in the 2018–2023 cluster.
// ─────────────────────────────────────────────────────────────────────────────
const ERA_BANDS = [
  { label: 'Fox',         start: 2000, end: 2006, color: '#64748b' },
  { label: 'Calderón',    start: 2006, end: 2012, color: '#8b5cf6' },
  { label: 'Peña Nieto',  start: 2012, end: 2018, color: '#f97316' },
  { label: 'AMLO',        start: 2018, end: 2024, color: '#dc2626' },
  { label: 'Sheinbaum',   start: 2024, end: 2026, color: '#10b981' },
]

function CaseTimeline({ lang }: { lang: 'en' | 'es' }) {
  const SVG_W = 820
  const SVG_H = 190
  const AXIS_Y = 130
  const YEAR_MIN = 2002
  const YEAR_MAX = 2025
  const PAD_X = 24

  const yearToX = (year: number) =>
    PAD_X + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (SVG_W - PAD_X * 2)

  const SPIKE_CRIT = 82
  const SPIKE_HIGH = 46
  const BAR_W = 7

  const TICK_YEARS = [2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024]

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Timeline of documented corruption cases 2002–2025"
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
// TopCategoriesChart — top 8 spending categories by total value + risk overlay
// "Where the money goes" — spend concentration + which categories look suspicious
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

function TopCategoriesChart({ lang }: { lang: 'en' | 'es' }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['executive', 'categories-top-spend'],
    queryFn: async () => {
      const result = await categoriesApi.getSummary() as { data: CategorySummaryItem[] }
      const sorted = [...(result?.data ?? [])].sort((a, b) => b.total_value - a.total_value)
      return sorted.slice(0, 8)
    },
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-background-elevated/40 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError || !data?.length) return null

  const maxValue = data[0].total_value
  const totalShown = data.reduce((s, c) => s + c.total_value, 0)

  const getRiskColor = (risk: number) => {
    if (risk >= 0.60) return '#dc2626'
    if (risk >= 0.40) return '#f59e0b'
    if (risk >= 0.25) return '#a06820'
    return 'var(--color-text-muted)'
  }

  return (
    <div>
      <div className="space-y-2">
        {data.map((cat, idx) => {
          const name = lang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es
          const sectorColor = SECTOR_COLORS[cat.sector_code] ?? '#64748b'
          const barPct = maxValue > 0 ? (cat.total_value / maxValue) * 100 : 0
          const riskColor = getRiskColor(cat.avg_risk)
          const riskPct = Math.round(cat.avg_risk * 100)
          const daDisplay = cat.direct_award_pct != null
            ? `${Math.round(cat.direct_award_pct)}% DA`
            : null

          return (
            <div key={cat.category_id} className="flex items-center gap-2 group">
              {/* Rank */}
              <span className="text-[9px] font-mono text-text-muted w-4 text-right flex-shrink-0">
                {idx + 1}
              </span>

              {/* Sector dot */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: sectorColor }}
              />

              {/* Category name */}
              <span
                className="text-[11px] font-mono text-text-secondary flex-shrink-0 truncate"
                style={{ width: '11rem' }}
                title={name}
              >
                {name}
              </span>

              {/* Spend bar */}
              <div className="flex-1 relative h-[14px] rounded-sm overflow-hidden"
                style={{ background: 'var(--color-border)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: sectorColor,
                    opacity: 0.55,
                  }}
                />
                {/* Spend label inside bar */}
                <span
                  className="absolute inset-y-0 left-2 flex items-center text-[9px] font-mono tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCompactMXN(cat.total_value)}
                </span>
              </div>

              {/* Risk % */}
              <span
                className="text-[10px] font-mono font-bold w-8 text-right flex-shrink-0 tabular-nums"
                style={{ color: riskColor }}
                title={daDisplay ?? undefined}
              >
                {riskPct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend row */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[9px] font-mono text-text-muted">
          {lang === 'en' ? 'Bar width = total spend · Right % = avg risk score' : 'Ancho barra = gasto total · % derecha = puntaje de riesgo promedio'}
        </span>
        <span className="text-[9px] font-mono text-text-muted">
          {lang === 'en'
            ? `top 8 = ${formatCompactMXN(totalShown)} of MX$9.9T total`
            : `top 8 = ${formatCompactMXN(totalShown)} del total MX$9.9B`}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MacroArc — 23-year direct award rate per administration vs. OECD ceiling
// The opening visualization: structural failure at scale, not a single vendor.
// ─────────────────────────────────────────────────────────────────────────────
interface AdminArcEntry {
  name: string; years: string; party: string; color: string
  spendB: number; da: number; partial?: boolean
}
const ADMIN_ARC: AdminArcEntry[] = [
  { name: 'Fox',       years: '01–06', party: 'PAN',    color: '#1a5276', spendB: 614.4, da: 62 },
  { name: 'Calderón',  years: '07–12', party: 'PAN',    color: '#1a5276', spendB: 1600,  da: 72 },
  { name: 'Peña N.',   years: '13–18', party: 'PRI',    color: '#c41e3a', spendB: 2000,  da: 78 },
  { name: 'AMLO',      years: '19–24', party: 'MORENA', color: '#7b2d8b', spendB: 1900,  da: 76 },
  { name: 'Sheinbaum', years: '25–',  party: 'MORENA', color: '#7b2d8b', spendB: 557.1, da: 74, partial: true },
]

function MacroArc({ lang }: { lang: 'en' | 'es' }) {
  const SVG_W = 820
  const SVG_H = 220
  const PAD_L = 38
  const PAD_R = 60
  const PAD_TOP = 24
  const PAD_BOT = 56
  const CHART_H = SVG_H - PAD_TOP - PAD_BOT
  const CHART_W = SVG_W - PAD_L - PAD_R
  const N = ADMIN_ARC.length
  const COL_W = CHART_W / N
  const BAR_W = COL_W * 0.52
  const OECD_CEILING = 30

  const daToY = (pct: number) => PAD_TOP + CHART_H * (1 - pct / 100)
  const OECD_Y = daToY(OECD_CEILING)
  const AXIS_Y = PAD_TOP + CHART_H

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Direct award rate per administration versus OECD ceiling"
      >
        {/* OECD safe zone — below the ceiling */}
        <rect x={PAD_L} y={OECD_Y} width={CHART_W} height={AXIS_Y - OECD_Y}
          fill="#10b981" opacity={0.05} />
        {/* OECD ceiling line */}
        <line x1={PAD_L} x2={SVG_W - PAD_R} y1={OECD_Y} y2={OECD_Y}
          stroke="#10b981" strokeWidth={1.2} strokeDasharray="5 3" opacity={0.6} />
        <text x={SVG_W - PAD_R + 5} y={OECD_Y + 4}
          fontSize={8} fill="#10b981" opacity={0.75}
          fontFamily="var(--font-family-mono, monospace)" fontWeight="600">
          OECD
        </text>
        <text x={SVG_W - PAD_R + 5} y={OECD_Y + 13}
          fontSize={8} fill="#10b981" opacity={0.75}
          fontFamily="var(--font-family-mono, monospace)">
          30%
        </text>

        {/* Y-axis ticks */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = daToY(pct)
          return (
            <g key={pct}>
              <line x1={PAD_L - 3} x2={PAD_L} y1={y} y2={y}
                stroke="var(--color-border)" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 3} textAnchor="end"
                fontSize={7} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {pct}%
              </text>
            </g>
          )
        })}

        {/* Axis base */}
        <line x1={PAD_L} x2={SVG_W - PAD_R} y1={AXIS_Y} y2={AXIS_Y}
          stroke="var(--color-border-hover)" strokeWidth={1.5} />

        {/* Admin columns */}
        {ADMIN_ARC.map((admin, i) => {
          const cx = PAD_L + COL_W * i + COL_W / 2
          const barX = cx - BAR_W / 2
          const barTop = daToY(admin.da)
          const barH = AXIS_Y - barTop

          return (
            <g key={admin.name}>
              {/* Party band */}
              <rect x={barX} y={PAD_TOP} width={BAR_W} height={CHART_H}
                fill={admin.color} opacity={0.04} />
              {/* DA% fill bar */}
              <rect x={barX} y={barTop} width={BAR_W} height={barH}
                fill={admin.color} opacity={admin.partial ? 0.28 : 0.55} rx={2} />
              {/* Top bright cap */}
              <rect x={barX} y={barTop} width={BAR_W} height={3}
                fill={admin.color} opacity={admin.partial ? 0.55 : 0.9} rx={1} />
              {/* DA% label above bar */}
              <text x={cx} y={barTop - 7} textAnchor="middle"
                fontSize={14} fontWeight="700" fill={admin.color}
                fontFamily="var(--font-family-mono, monospace)">
                {admin.da}%
              </text>
              {/* Admin name */}
              <text x={cx} y={AXIS_Y + 13} textAnchor="middle"
                fontSize={9} fontWeight="600" fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans, sans-serif)">
                {admin.name}
              </text>
              {/* Years */}
              <text x={cx} y={AXIS_Y + 23} textAnchor="middle"
                fontSize={7.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {admin.years}
              </text>
              {/* Spend */}
              <text x={cx} y={AXIS_Y + 35} textAnchor="middle"
                fontSize={7.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {admin.spendB >= 1000
                  ? `${(admin.spendB / 1000).toFixed(1)}T MXN`
                  : `${admin.spendB.toFixed(0)}B MXN`}
              </text>
              {admin.partial && (
                <text x={cx} y={AXIS_Y + 46} textAnchor="middle"
                  fontSize={7} fill="var(--color-text-muted)" fontStyle="italic"
                  fontFamily="var(--font-family-mono, monospace)">
                  partial
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <p className="text-[10px] font-mono text-text-muted mt-2 text-center leading-[1.5]">
        {lang === 'en'
          ? 'Direct award rate = share of contracts bypassing competitive tender. OECD recommended maximum: 25–30%. Sources: COMPRANET 2001–2025; OECD Government at a Glance.'
          : 'Tasa de adjudicación directa = contratos sin licitación. Máximo recomendado OCDE: 25–30%. Fuentes: COMPRANET 2001–2025; OCDE Government at a Glance.'}
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

  // ─── KPI tiles (2x2 grid) ──────────────────────────────────────────────────
  const kpis = [
    {
      value: '9.9T MXN',
      label: lang === 'en' ? 'TOTAL ANALYZED SPEND' : 'GASTO TOTAL ANALIZADO',
      context: lang === 'en' ? 'COMPRANET 2002–2025 · post-outlier exclusion' : 'COMPRANET 2002–2025 · excluyendo valores atípicos',
      color: '#a06820',
    },
    {
      value: '~75%',
      label: lang === 'en' ? 'DIRECT AWARD RATE' : 'TASA ADJ. DIRECTA',
      context: lang === 'en' ? 'OECD maximum: 25–30%  ·  2.5× the ceiling' : 'Máximo OCDE: 25–30%  ·  2.5× el umbral',
      color: '#dc2626',
    },
    {
      value: formatNumber(stats.highCriticalCount),
      label: lang === 'en' ? 'HIGH + CRITICAL' : 'ALTO + CRÍTICO',
      context: lang === 'en' ? 'Contracts flagged for priority review' : 'Contratos señalados para revisión prioritaria',
      color: '#f59e0b',
    },
    {
      value: '0.828',
      label: lang === 'en' ? 'MODEL AUC' : 'AUC DEL MODELO',
      context: lang === 'en' ? 'Vendor-stratified · v0.6.5' : 'Estratif. por vendor · v0.6.5',
      color: 'var(--color-text-muted)',
    },
  ]

  // ─── Signal cards (top 3 model predictors) ───────────────────────────────────
  // Written for general readers: headline is a real detection outcome, not a
  // model coefficient. Each card shows WHAT the pattern looks like, WHERE it was
  // caught in a real case, and HOW the model sees it.
  const signals = [
    {
      num: '01',
      stat: '99.9%',
      statLabel:
        lang === 'en'
          ? 'of IMSS ghost-company contracts detected'
          : 'de contratos de empresas fantasma IMSS detectados',
      name: lang === 'en' ? 'Price Volatility' : 'Volatilidad de Precio',
      headline:
        lang === 'en'
          ? 'Same vendor, wildly different prices — the ghost company\'s billing fingerprint.'
          : 'Mismo proveedor, precios radicalmente distintos — la huella de la empresa fantasma.',
      caseTag:
        lang === 'en'
          ? 'Case: IMSS ghost network · 9,366 flagged contracts · SAT officially confirmed only 42'
          : 'Caso: Red fantasma IMSS · 9,366 contratos señalados · SAT confirmó solo 42 oficialmente',
      body:
        lang === 'en'
          ? 'A legitimate vendor charges similar amounts for the same item across agencies. Ghost companies don\'t — they bill erratically to obscure the trail. The model spots this across all 3.1M contracts at once; a human auditor cannot.'
          : 'Un proveedor legítimo cobra montos similares por el mismo artículo en distintas instituciones. Las empresas fantasma no — facturan erráticamente para ocultar el rastro. El modelo detecta esto en 3.1M contratos a la vez; un auditor humano no puede.',
      color: '#dc2626',
    },
    {
      num: '02',
      stat: '100%',
      statLabel:
        lang === 'en'
          ? 'of Toka IT monopoly contracts scored critical'
          : 'de contratos del monopolio TIC Toka marcados como críticos',
      name: lang === 'en' ? 'Vendor Concentration' : 'Concentración de Proveedor',
      headline:
        lang === 'en'
          ? 'One vendor locks one institution\'s entire budget — year after year.'
          : 'Un proveedor acapara todo el presupuesto de una institución — año tras año.',
      caseTag:
        lang === 'en'
          ? 'Cases: Toka IT monopoly · 1,954 contracts · Edenred voucher cartel · 2,939 contracts at 97%'
          : 'Casos: Monopolio TIC Toka · 1,954 contratos · Cartel vales Edenred · 2,939 contratos al 97%',
      body:
        lang === 'en'
          ? 'Healthy procurement spreads contracts across multiple vendors. When one supplier captures 80-100% of a category budget inside one institution for five-plus years, competition has effectively been eliminated — whether through bribery, favoritism, or technical lock-in.'
          : 'Una contratación sana distribuye contratos entre múltiples proveedores. Cuando un proveedor captura el 80–100% del presupuesto de una categoría dentro de una institución por cinco o más años, la competencia ha sido eliminada — sea por soborno, favoritismo o dependencia técnica.',
      color: '#f59e0b',
    },
    {
      num: '03',
      stat: '100%',
      statLabel:
        lang === 'en'
          ? 'of PEMEX offshore contracts scored critical'
          : 'de contratos offshore PEMEX marcados como críticos',
      name: lang === 'en' ? 'Price Ratio' : 'Razón de Precio',
      headline:
        lang === 'en'
          ? 'Charging 3× the going rate — consistently, across years.'
          : 'Cobrar 3× la tarifa del mercado — de forma consistente, año tras año.',
      caseTag:
        lang === 'en'
          ? 'Cases: PEMEX-Cotemar offshore · 51 contracts all critical · Segalmex food distribution · avg risk 0.66'
          : 'Casos: PEMEX-Cotemar offshore · 51 contratos todos críticos · Distribución alimentos Segalmex · riesgo promedio 0.66',
      body:
        lang === 'en'
          ? 'The model adjusts each contract amount for sector, year, and size — then measures how far above the expected price it sits. A vendor who is 3× above the norm every single year is not just expensive: they have captured the pricing mechanism itself.'
          : 'El modelo ajusta cada monto por sector, año y tamaño — luego mide cuánto supera el precio esperado. Un proveedor que está 3× por encima de la norma cada año no es solo caro: ha capturado el mecanismo de fijación de precios.',
      color: '#a06820',
    },
  ]

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

      <div className="executive-page max-w-[900px] mx-auto px-6 py-8">
        {/* ─── Header / Dateline ─── */}
        <motion.header
          className="mb-10"
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

          <p className="text-base leading-[1.7] text-text-secondary max-w-[68ch]">
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
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 max-w-[68ch]">
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

        {/* ─── KPI Grid (2x2) ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? 'Headline Numbers' : 'Cifras Clave'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((k, idx) => (
              <motion.div
                key={k.label}
                className="surface-card p-5 border-l-2 rounded-sm"
                style={{ borderLeftColor: k.color }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.06 }}
              >
                <div
                  className="font-mono font-bold text-[32px] leading-none tabular-nums"
                  style={{ color: k.color }}
                >
                  {k.value}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3">
                  {k.label}
                </div>
                <div className="text-xs text-text-muted mt-1 leading-[1.5]">
                  {k.context}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── KEY FINDINGS — specific discoveries with animated visualizations ─── */}
        <section className="mb-12" aria-labelledby="findings-title">
          <div id="findings-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'What the analysis found' : 'Lo que encontró el análisis'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-5 max-w-[68ch]">
            {lang === 'en'
              ? 'Four findings that only became visible at scale — impossible to see by auditing contracts one by one.'
              : 'Cuatro hallazgos que solo se volvieron visibles a escala — imposibles de detectar auditando contrato por contrato.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Finding 01 — Ghost Economy: compare-gap animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2"
              style={{ borderLeftColor: '#dc2626' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 01 · GHOST ECONOMY' : 'HALLAZGO 01 · ECONOMÍA FANTASMA'}
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
              className="surface-card rounded-sm p-5 border-l-2"
              style={{ borderLeftColor: '#f59e0b' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 02 · AUDIT BLINDSPOT' : 'HALLAZGO 02 · PUNTO CIEGO DE AUDITORÍA'}
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
                        MX$1.25T
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1.5"
                        style={{ color: '#f59e0b', opacity: 0.7 }}
                      >
                        {lang === 'en' ? '95% never audited' : '95% sin auditar'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'MX$1.25 trillion above 5B MXN — zero audit coverage.' : 'MX$1.25 billones sobre 5B MXN — sin cobertura de auditoría.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'ASF reviews ~5% of contracts above MX$5B annually. At that rate, a high-value contract waits ~25 years for review — long after the money is gone and the vendor dissolved.'
                  : 'La ASF revisa ~5% de contratos sobre MX$5B al año. A ese ritmo, un contrato de alto valor espera ~25 años para ser revisado — mucho después de que el dinero desapareció.'}
              </p>
            </motion.article>

            {/* Finding 03 — Threshold Gaming: two-bar comparison */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2"
              style={{ borderLeftColor: '#8b5cf6' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 03 · THRESHOLD GAMING' : 'HALLAZGO 03 · JUEGO DE UMBRALES'}
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
              className="surface-card rounded-sm p-5 border-l-2"
              style={{ borderLeftColor: '#a06820' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 04 · INSTITUTIONAL CAPTURE' : 'HALLAZGO 04 · CAPTURA INSTITUCIONAL'}
              </div>
              <div className="flex items-end gap-3 mb-4">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#a06820' }}>15,923</span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.35]">{lang === 'en' ? 'vendors show P6\ncapture pattern' : 'proveedores con\npatrón captura P6'}</span>
              </div>
              {/* Budget allocation matrix — healthy competition vs. monopoly capture */}
              <div className="mb-4">
                {(
                  [
                    { label: 'INST 1', pcts: [30, 25, 20, 15, 10], captured: false },
                    { label: 'INST 2', pcts: [35, 27, 22, 16],     captured: false },
                    { label: 'INST 3', pcts: [91, 9],              captured: true  },
                    { label: 'INST 4', pcts: [28, 26, 24, 22],     captured: false },
                    { label: 'INST 5', pcts: [32, 24, 20, 14, 10], captured: false },
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
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 max-w-[68ch]">
            {lang === 'en'
              ? 'Every peso in COMPRANET classified into one of 91 spending categories — automatically, at 99.7% coverage. The top 8 account for the majority of federal spend. Risk scores vary sharply by category, revealing where irregularities concentrate.'
              : 'Cada peso en COMPRANET clasificado en una de 91 categorías de gasto — automáticamente, con 99.7% de cobertura. Las 8 principales concentran la mayoría del gasto federal. Los puntajes de riesgo varían considerablemente por categoría, revelando dónde se concentran las irregularidades.'}
          </p>
          <div className="surface-card rounded-sm p-5">
            <TopCategoriesChart lang={lang} />
          </div>
        </section>

        {/* ─── How we found it: ML methodology ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'How the model detects these patterns' : 'Cómo el modelo detecta estos patrones'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 max-w-[68ch]">
            {lang === 'en'
              ? 'Three statistical signals — learned from 1,363 documented corruption cases — that appear consistently across ghost companies, monopolies, and overpricing schemes.'
              : 'Tres señales estadísticas — aprendidas de 1,363 casos documentados — que aparecen consistentemente en empresas fantasma, monopolios y esquemas de sobreprecio.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signals.map((s, idx) => (
              <motion.article
                key={s.num}
                className="surface-card border-l-2 rounded-sm p-5"
                style={{ borderLeftColor: s.color }}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                    {lang === 'en' ? 'SIGNAL' : 'SEÑAL'} {s.num}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted opacity-50">
                    {s.name}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="font-mono font-bold text-[38px] tabular-nums leading-none block" style={{ color: s.color }}>
                    {s.stat}
                  </span>
                  <p className="text-[10px] text-text-muted mt-1 leading-[1.4]">{s.statLabel}</p>
                </div>
                <h3 className="font-semibold text-[13px] leading-[1.35] text-text-primary mb-2.5">{s.headline}</h3>
                <div
                  className="rounded-sm px-2.5 py-2 mb-3 text-[9px] font-mono leading-[1.5]"
                  style={{ background: 'var(--color-border)', color: s.color }}
                >
                  {s.caseTag}
                </div>
                <p className="text-xs text-text-secondary leading-[1.6]">{s.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ─── § 2 LA LENTE — what RUBLI uniquely sees (platform self-portrait) ─── */}
        <section className="mb-12" aria-labelledby="la-lente-title">
          <div id="la-lente-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? '§ 2 · The Lens — what RUBLI uniquely sees' : '§ 2 · La Lente — lo que RUBLI ve de manera única'}
          </div>
          <div className="surface-card p-6 rounded-sm">
            <p className="text-sm leading-[1.7] text-text-secondary max-w-[68ch] mb-6">
              {lang === 'en' ? (
                <>
                  Beyond the headline numbers, RUBLI maintains an <strong className="text-text-primary">automated investigative infrastructure</strong>:
                  a 4-tier priority queue (Tier 1 currently <em>anchored on the documented GT corpus</em> — model-discovery uplift in active calibration);
                  LLM-narrative + templated investigation memos for ~440 hand-curated vendors plus broader auto-coverage;
                  a ground-truth corpus growing across all 12 sectors; and a per-sector calibrated risk model with vendor-stratified validation.
                  See the <a href="/methodology" className="text-accent hover:underline">methodology</a> for honest scope and limits.
                </>
              ) : (
                <>
                  Más allá de las cifras titulares, RUBLI mantiene una <strong className="text-text-primary">infraestructura de investigación automatizada</strong>:
                  una cola priorizada en 4 niveles (Tier 1 actualmente <em>anclado al corpus GT documentado</em> — el descubrimiento puro del modelo está en calibración);
                  memos LLM-narrativa + plantillados para ~440 proveedores curados manualmente más cobertura automatizada amplia;
                  un corpus de casos documentados creciente en los 12 sectores; y un modelo de riesgo calibrado por sector con validación estratificada por proveedor.
                  Consulta la <a href="/methodology" className="text-accent hover:underline">metodología</a> para alcance y límites honestos.
                </>
              )}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-border/40">
              <LenteStat
                value={formatNumber(ariaStats?.latest_run?.tier1_count ?? 320)}
                label={lang === 'en' ? 'TIER 1 LEADS' : 'LÍDERES TIER 1'}
                context={lang === 'en' ? 'Highest priority' : 'Máxima prioridad'}
                color="var(--color-risk-critical)"
                href="/aria"
              />
              <LenteStat
                value={formatNumber((ariaStats?.latest_run?.tier2_count ?? 1234) + (ariaStats?.latest_run?.tier3_count ?? 5016))}
                label={lang === 'en' ? 'TIER 2-3 LEADS' : 'LÍDERES TIER 2-3'}
                context={lang === 'en' ? 'Watch list' : 'Lista de vigilancia'}
                color="var(--color-risk-high)"
                href="/aria"
              />
              <LenteStat
                value={formatNumber(1843)}
                label={lang === 'en' ? 'INVESTIGATIVE MEMOS' : 'MEMOS DE INVESTIGACIÓN'}
                context={lang === 'en' ? 'Per-vendor LLM dossiers' : 'Dossiers LLM por proveedor'}
                color="var(--color-accent)"
                href="/aria"
              />
              <LenteStat
                value={formatNumber(caseStats?.total_cases ?? 1380)}
                label={lang === 'en' ? 'GT CASES' : 'CASOS DOCUMENTADOS'}
                context={lang === 'en' ? 'Mexican corruption corpus' : 'Corpus mexicano'}
                color="var(--color-accent)"
                href="/cases"
              />
              <LenteStat
                value="91"
                label={lang === 'en' ? 'CATEGORIES' : 'CATEGORÍAS'}
                context={lang === 'en' ? 'Auto-classified' : 'Auto-clasificadas'}
                color="var(--color-accent)"
                href="/sectors?view=categories"
              />
              <LenteStat
                value="0.828"
                label={lang === 'en' ? 'TEST AUC' : 'AUC PRUEBA'}
                context={lang === 'en' ? 'Vendor-stratified · v0.6.5' : 'Estratif. por vendor · v0.6.5'}
                color="var(--color-text-muted)"
                href="/methodology"
              />
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
            {lang === 'en' ? 'Documented corruption cases · 2002–2025' : 'Casos documentados de corrupción · 2002–2025'}
          </div>
          <p className="text-sm text-text-secondary leading-[1.6] mb-4 max-w-[68ch]">
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
            <p className="text-sm text-text-secondary leading-[1.6] mb-4 max-w-[68ch]">
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
