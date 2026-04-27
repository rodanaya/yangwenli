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
import { analysisApi, contractApi, ariaApi, caseLibraryApi } from '@/api/client'
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
}

const EXAMPLE_DOSSIERS: ExampleDossier[] = [
  {
    vendorId: 29277,
    name: 'GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.',
    risk: 0.99, tier: 1, flags: ['gt'],
    contracts: '6,303', value: '$133.2B MXN',
    kicker: { en: 'PHARMA OLIGOPOLY · IMSS CAPTURE', es: 'OLIGOPOLIO FARMACÉUTICO · CAPTURA IMSS' },
    lede: {
      en: 'Distributed $133.2B MXN in medicines to IMSS over 14 years (60% of vendor value). 79% direct-award. COFECE investigated 2018, AMLO veto 2019, SFP sanctioned.',
      es: 'Distribuyó $133.2B MXN en medicamentos al IMSS en 14 años (60% del valor del vendor). 79% adjudicación directa. COFECE investigó 2018, veto AMLO 2019, SFP sancionó.',
    },
  },
  {
    vendorId: 31655,
    name: 'LICONSA S.A. DE C.V.',
    risk: 0.92, tier: 1, flags: ['gt'],
    contracts: '~3,000', value: 'multi-billion MXN',
    kicker: { en: 'SEGALMEX FOOD FRAUD', es: 'FRAUDE SEGALMEX' },
    lede: {
      en: 'Government parastatal at the center of the Segalmex food-distribution scandal. One of the platform\'s anchor GT cases for the v0.6.5 model training.',
      es: 'Paraestatal gubernamental al centro del escándalo de distribución de alimentos Segalmex. Uno de los casos GT ancla para el entrenamiento del modelo v0.6.5.',
    },
  },
  {
    vendorId: 6038,
    name: 'HEMOSER, S.A. DE C.V.',
    risk: 0.85, tier: 1, flags: ['gt'],
    contracts: '~17B contracts', value: '$17.2B MXN',
    kicker: { en: 'COVID MEDICAL SUPPLY · SAME-DAY IMSS', es: 'INSUMOS COVID · MISMO DÍA IMSS' },
    lede: {
      en: '$17.2B MXN in COVID-era IMSS medical supplies. Same-day-award pattern flagged by ARIA as Tier 1. Documented case in the GT corpus.',
      es: '$17.2B MXN en insumos médicos al IMSS durante COVID. Patrón de adjudicación mismo-día detectado por ARIA Tier 1. Caso documentado en el corpus GT.',
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
  // Headlines use the model coefficient (β) rather than a detection-rate
  // percentage because three saturated percentages (99.9% / 100% / 100%)
  // read as cherry-picked and carry zero ranking information. β values are
  // inherently different magnitudes AND hierarchize the signals: price
  // volatility (0.53) is more than 2× stronger than price ratio (0.23).
  const signals = [
    {
      num: '01',
      finding: '+0.53',
      findingLabel:
        lang === 'en'
          ? 'model coefficient · strongest signal'
          : 'coeficiente del modelo · señal más fuerte',
      detection:
        lang === 'en'
          ? '99.9% detection on IMSS ghost network (9,366 contracts)'
          : '99.9% de detección en la red fantasma del IMSS (9,366 contratos)',
      name: lang === 'en' ? 'Price Volatility' : 'Volatilidad de Precio',
      body:
        lang === 'en'
          ? 'Vendors whose contract amounts swing wildly across institutions and years. This is the model\'s single strongest predictor — capturing the erratic billing signature of shell and ghost-company networks.'
          : 'Proveedores cuyos montos de contrato varían drásticamente entre instituciones y años. Este es el predictor individual más fuerte del modelo — capturando la firma de facturación errática de redes de empresas fantasma.',
      color: '#dc2626',
    },
    {
      num: '02',
      finding: '+0.37',
      findingLabel:
        lang === 'en'
          ? 'model coefficient · 2nd strongest'
          : 'coeficiente del modelo · 2ª más fuerte',
      detection:
        lang === 'en'
          ? '100% on Toka IT monopoly (1,954); 96.7% on Edenred (2,939)'
          : '100% en el monopolio TIC Toka (1,954); 96.7% en Edenred (2,939)',
      name: lang === 'en' ? 'Vendor Concentration' : 'Concentración de Proveedor',
      body:
        lang === 'en'
          ? 'A vendor capturing an outsized share of spending within a single sector. Monopoly suppliers consistently score critical or high — regardless of whether they operate through competitive tenders or direct awards.'
          : 'Un proveedor que captura una proporción desproporcionada del gasto en un sector. Los proveedores monopolísticos puntúan consistentemente en riesgo crítico o alto, independientemente de si operan mediante licitaciones o adjudicaciones directas.',
      color: '#f59e0b',
    },
    {
      num: '03',
      finding: '+0.23',
      findingLabel:
        lang === 'en'
          ? 'model coefficient · 3rd strongest'
          : 'coeficiente del modelo · 3ª más fuerte',
      detection:
        lang === 'en'
          ? '100% critical on PEMEX-Cotemar (51); Segalmex avg 0.66'
          : '100% crítico en PEMEX-Cotemar (51); Segalmex promedio 0.66',
      name: lang === 'en' ? 'Price Ratio' : 'Razón de Precio',
      body:
        lang === 'en'
          ? 'Contract amounts that consistently exceed the sector median — normalized by year so inflation and sector size cannot explain the gap. Overpricing at scale leaves a clear statistical trace.'
          : 'Montos de contrato que consistentemente superan la mediana del sector, normalizados por año para que la inflación o el tamaño sectorial no expliquen la brecha. El sobreprecio a escala deja una huella estadística clara.',
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

        {/* ─── Signal Cards (top 3 predictors) ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? 'Three AI fingerprints — patterns invisible without machine learning' : 'Tres huellas de IA — patrones invisibles sin aprendizaje automático'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signals.map((s, idx) => (
              <motion.article
                key={s.num}
                className="surface-card border-l-2 rounded-sm p-5"
                style={{ borderLeftColor: s.color }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                    {lang === 'en' ? 'SIGNAL' : 'SEÑAL'} {s.num}
                  </span>
                </div>
                <div className="mb-3">
                  <span
                    className="font-mono font-bold text-[34px] tabular-nums leading-none block"
                    style={{ color: s.color }}
                  >
                    β {s.finding}
                  </span>
                  <p className="text-[10px] text-text-muted mt-1 leading-[1.4]">
                    {s.findingLabel}
                  </p>
                </div>
                <h3 className="font-semibold text-[14px] leading-[1.3] text-text-primary mb-1">
                  {s.name}
                </h3>
                <p className="text-[10px] font-mono text-text-muted leading-[1.5] mb-3">
                  {s.detection}
                </p>
                <p className="text-xs text-text-secondary leading-[1.6]">
                  {s.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ─── KEY FINDINGS — specific discoveries, not just methodology ─── */}
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

            {/* Finding 1 — Ghost economy */}
            <article className="surface-card rounded-sm p-5 border-l-2" style={{ borderLeftColor: '#dc2626' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 01 · GHOST ECONOMY' : 'HALLAZGO 01 · ECONOMÍA FANTASMA'}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#dc2626' }}>
                  6,034
                </span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.3]">
                  {lang === 'en' ? 'probable ghost\ncompanies detected' : 'empresas fantasma\ndetectadas'}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-text-primary leading-[1.3] mb-2">
                {lang === 'en'
                  ? 'SAT officially confirmed 42. RUBLI found 143× more.'
                  : 'SAT confirmó 42 oficialmente. RUBLI encontró 143× más.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'Pattern P2: vendors with no digital footprint, burst activity, RFC anomalies, and shared addresses. The 97% detection gap means most ghost-company fraud goes unregistered — and unrecovered.'
                  : 'Patrón P2: proveedores sin huella digital, actividad en ráfaga, anomalías RFC y domicilios compartidos. La brecha del 97% significa que la mayoría del fraude fantasma no se registra — y no se recupera.'}
              </p>
            </article>

            {/* Finding 2 — Audit blindspot */}
            <article className="surface-card rounded-sm p-5 border-l-2" style={{ borderLeftColor: '#f59e0b' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 02 · AUDIT BLINDSPOT' : 'HALLAZGO 02 · PUNTO CIEGO DE AUDITORÍA'}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#f59e0b' }}>
                  95%
                </span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.3]">
                  {lang === 'en' ? 'of high-value contracts\nnever audited' : 'de contratos de alto valor\nnunca auditados'}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-text-primary leading-[1.3] mb-2">
                {lang === 'en'
                  ? 'MX$1.25 trillion above 5B MXN — zero audit coverage.'
                  : 'MX$1.25 billones sobre 5B MXN — sin cobertura de auditoría.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'ASF reviews roughly 5% of contracts above MX$5B annually. At that rate, a high-value contract waits ~25 years for review — long after the money is gone and the vendor dissolved.'
                  : 'La ASF revisa aproximadamente 5% de contratos sobre MX$5B al año. A ese ritmo, un contrato de alto valor espera ~25 años para ser revisado — mucho después de que el dinero desapareció y el proveedor se disolvió.'}
              </p>
            </article>

            {/* Finding 3 — Threshold splitting */}
            <article className="surface-card rounded-sm p-5 border-l-2" style={{ borderLeftColor: '#8b5cf6' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 03 · THRESHOLD GAMING' : 'HALLAZGO 03 · JUEGO DE UMBRALES'}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#8b5cf6' }}>
                  75%
                </span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.3]">
                  {lang === 'en' ? 'of threshold-cluster\ncontracts — direct award' : 'de contratos en umbral\n— adjudicación directa'}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-text-primary leading-[1.3] mb-2">
                {lang === 'en'
                  ? 'Contracts cluster statistically just below competitive-tender thresholds.'
                  : 'Los contratos se agrupan estadísticamente justo debajo de los umbrales de licitación.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'A large single contract is split into multiple awards just below the legal threshold that would trigger a public tender. The density spike is detectable only when you can see all 3.1M contracts at once.'
                  : 'Un contrato grande se divide en múltiples adjudicaciones justo por debajo del umbral que requeriría licitación pública. El pico de densidad solo es detectable cuando se ven los 3.1M contratos a la vez.'}
              </p>
            </article>

            {/* Finding 4 — Institutional capture */}
            <article className="surface-card rounded-sm p-5 border-l-2" style={{ borderLeftColor: '#a06820' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                {lang === 'en' ? 'FINDING 04 · INSTITUTIONAL CAPTURE' : 'HALLAZGO 04 · CAPTURA INSTITUCIONAL'}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: '#a06820' }}>
                  15,923
                </span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.3]">
                  {lang === 'en' ? 'vendors show P6\ncapture pattern' : 'proveedores con patrón\nde captura P6'}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-text-primary leading-[1.3] mb-2">
                {lang === 'en'
                  ? 'A single vendor locks a single institution — year after year, no competition.'
                  : 'Un solo proveedor captura una sola institución — año tras año, sin competencia.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'Institutional capture (P6) is distinct from national monopoly: one vendor dominates one specific agency\'s spending with abnormal concentration and above-threshold risk. Detectable only through cross-institution comparison.'
                  : 'La captura institucional (P6) es distinta del monopolio nacional: un proveedor domina el gasto de una sola agencia con concentración anormal y riesgo superior al umbral. Solo detectable mediante comparación entre instituciones.'}
              </p>
            </article>

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
                <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
                  <span>{d.contracts} contratos</span>
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
