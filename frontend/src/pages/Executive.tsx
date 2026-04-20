/**
 * Executive Summary — Newspaper-style 1-pager for decision-makers
 *
 * Designed to be consumed in 90 seconds by senators, NGO directors,
 * embassy staff, and prosecutors. Editorial weight over data density.
 *
 * Composition:
 *   1. Dateline + headline (Playfair Display 800)
 *   2. Lede paragraph
 *   3. Risk gauge — SVG arc, 13.49% vs OECD 2-15%
 *   4. Five numbered key findings
 *   5. Documented cases timeline (2002-2025 dot-strip)
 *   6. Single CTA — "Investigate a vendor"
 *   7. Credibility strip
 *   8. Print button (hides sidebar)
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, ArrowUpRight, Shield, Clock } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

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

const SECTOR_COLORS: Record<TimelineCase['sector'], string> = {
  salud: '#dc2626',
  agricultura: '#22c55e',
  infraestructura: '#ea580c',
  energia: '#eab308',
  tecnologia: '#8b5cf6',
  gobernacion: '#be123c',
  hacienda: '#16a34a',
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskGauge — Circular arc showing 13.49% vs OECD 2-15% range
// ─────────────────────────────────────────────────────────────────────────────
function RiskGauge({ value, oecdMin = 2, oecdMax = 15 }: { value: number; oecdMin?: number; oecdMax?: number }) {
  const size = 220
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2

  // Arc goes from 180deg (left) to 0deg (right) — semicircle on top
  const arcRange = 180
  const startAngle = 180

  const polar = (pct: number) => {
    const angle = startAngle - (Math.min(pct, 25) / 25) * arcRange
    const rad = (angle * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) }
  }

  // Background arc (full)
  const bgStart = polar(0)
  const bgEnd = polar(25)

  // OECD zone (2-15%)
  const oecdStart = polar(oecdMin)
  const oecdEnd = polar(oecdMax)

  // Value arc (0 to value)
  const valStart = polar(0)
  const valEnd = polar(value)

  // Needle tip
  const needle = polar(value)

  const valueColor = value > oecdMax ? '#dc2626' : value > oecdMin ? '#f59e0b' : '#71717a'

  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 24}`} className="w-full max-w-[320px] mx-auto" aria-label={`Risk rate ${value}%`}>
      {/* Background arc */}
      <path
        d={`M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`}
        fill="none"
        stroke="#e2ddd6"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
      {/* OECD compliant zone (2-15%) in cyan */}
      <path
        d={`M ${oecdStart.x} ${oecdStart.y} A ${radius} ${radius} 0 0 1 ${oecdEnd.x} ${oecdEnd.y}`}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={strokeWidth}
        strokeOpacity={0.35}
        strokeLinecap="butt"
      />
      {/* Value arc */}
      <motion.path
        d={`M ${valStart.x} ${valStart.y} A ${radius} ${radius} 0 ${value > 12.5 ? 1 : 0} 1 ${valEnd.x} ${valEnd.y}`}
        fill="none"
        stroke={valueColor}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
      />
      {/* Tick marks at 2%, 15%, 25% */}
      {[0, 2, 15, 25].map((tick) => {
        const p = polar(tick)
        const pInner = {
          x: cx + (radius - strokeWidth / 2 - 2) * Math.cos((polar(tick) === p ? (startAngle - (tick / 25) * arcRange) : 0) * Math.PI / 180),
          y: cy - (radius - strokeWidth / 2 - 2) * Math.sin((startAngle - (tick / 25) * arcRange) * Math.PI / 180),
        }
        const pOuter = {
          x: cx + (radius + strokeWidth / 2 + 2) * Math.cos((startAngle - (tick / 25) * arcRange) * Math.PI / 180),
          y: cy - (radius + strokeWidth / 2 + 2) * Math.sin((startAngle - (tick / 25) * arcRange) * Math.PI / 180),
        }
        return (
          <g key={tick}>
            <line x1={pInner.x} y1={pInner.y} x2={pOuter.x} y2={pOuter.y} stroke="#9c9490" strokeWidth={1} />
            <text
              x={pOuter.x}
              y={pOuter.y + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#6b6560"
              fontFamily="JetBrains Mono, monospace"
            >
              {tick}%
            </text>
          </g>
        )
      })}
      {/* Needle */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        stroke="#1a1714"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.3 }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#1a1714" />
      {/* Value label */}
      <text
        x={cx}
        y={cy - 22}
        textAnchor="middle"
        fontSize={28}
        fontWeight={700}
        fill={valueColor}
        fontFamily="JetBrains Mono, monospace"
      >
        {value.toFixed(2)}%
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline — Horizontal dot-strip 2002-2025
// ─────────────────────────────────────────────────────────────────────────────
function CaseTimeline({ lang }: { lang: 'en' | 'es' }) {
  const YEAR_MIN = 2002
  const YEAR_MAX = 2025
  const years = YEAR_MAX - YEAR_MIN

  return (
    <div className="py-4">
      <div className="relative h-[120px]">
        {/* Baseline */}
        <div className="absolute left-0 right-0 top-[60px] h-px bg-[#e2ddd6]" />
        {/* Year ticks */}
        {[2002, 2006, 2012, 2018, 2024].map((y) => {
          const pct = ((y - YEAR_MIN) / years) * 100
          return (
            <div
              key={y}
              className="absolute top-[56px] h-2 w-px bg-[#9c9490]"
              style={{ left: `${pct}%` }}
            >
              <div className="absolute top-4 -translate-x-1/2 text-[10px] font-mono text-text-muted">
                {y}
              </div>
            </div>
          )
        })}
        {/* Cases */}
        {TIMELINE_CASES.map((c, idx) => {
          const pct = ((c.year - YEAR_MIN) / years) * 100
          const color = SECTOR_COLORS[c.sector]
          const above = idx % 2 === 0
          const top = above ? 40 : 72
          const labelTop = above ? -4 : 88
          return (
            <motion.div
              key={c.year + c.label.en}
              className="absolute"
              style={{ left: `${pct}%`, top: `${top}px` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <div
                className="h-3 w-3 -translate-x-1/2 rounded-full border-2"
                style={{
                  backgroundColor: c.severity === 'critical' ? color : '#faf9f6',
                  borderColor: color,
                }}
                aria-label={c.label[lang]}
                title={c.label[lang]}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-text-secondary pointer-events-none"
                style={{ top: `${labelTop}px` }}
              >
                {c.label[lang]}
              </div>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
          {lang === 'en' ? 'Critical' : 'Crítico'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-[#dc2626] bg-[#faf9f6]" />
          {lang === 'en' ? 'High' : 'Alto'}
        </span>
        <span className="text-text-muted">
          {lang === 'en' ? 'Color = sector · Position = year of discovery' : 'Color = sector · Posición = año de descubrimiento'}
        </span>
      </div>
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

  const stats = useMemo(() => {
    const d = dashboard
    const totalContracts = d?.overview?.total_contracts ?? 3_051_294
    const totalValue = d?.overview?.total_value_mxn ?? 9_881_000_000_000
    const highCriticalRate = 13.49
    const valueAtRisk = totalValue * 0.139 // approx based on high+critical share of value
    // risk_distribution is an array of {risk_level, count, ...}
    const rd = Array.isArray(d?.risk_distribution) ? d!.risk_distribution : []
    const highCriticalCount =
      rd.reduce(
        (sum, r) =>
          r.risk_level === 'critical' || r.risk_level === 'high' ? sum + (r.count ?? 0) : sum,
        0,
      ) || 412_845
    return {
      totalContracts,
      totalValue,
      highCriticalRate,
      valueAtRisk,
      highCriticalCount,
    }
  }, [dashboard])

  const handlePrint = () => window.print()

  const findings = [
    {
      key: 'f1',
      stat: `${stats.highCriticalRate.toFixed(2)}%`,
      label: t('keyFindings5.f1.statLabel'),
      headline: t('keyFindings5.f1.headline'),
      body: t('keyFindings5.f1.body'),
      color: '#dc2626',
    },
    {
      key: 'f2',
      stat: formatCompactMXN(stats.valueAtRisk),
      label: t('keyFindings5.f2.statLabel'),
      headline: t('keyFindings5.f2.headline'),
      body: t('keyFindings5.f2.body'),
      color: '#ea580c',
    },
    {
      key: 'f3',
      stat: '320',
      label: t('keyFindings5.f3.statLabel'),
      headline: t('keyFindings5.f3.headline'),
      body: t('keyFindings5.f3.body'),
      color: '#f59e0b',
    },
    {
      key: 'f4',
      stat: '21,957',
      label: t('keyFindings5.f4.statLabel'),
      headline: t('keyFindings5.f4.headline'),
      body: t('keyFindings5.f4.body'),
      color: '#a16207',
    },
    {
      key: 'f5',
      stat: '+15%',
      label: t('keyFindings5.f5.statLabel'),
      headline: t('keyFindings5.f5.headline'),
      body: t('keyFindings5.f5.body'),
      color: '#be123c',
    },
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
            className="font-serif font-extrabold text-[40px] md:text-[56px] leading-[1.02] tracking-[-0.02em] text-text-primary mb-5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {lang === 'en'
              ? <>1 in 7 pesos of federal spending carries <span style={{ color: '#dc2626' }}>indicators of corruption</span>.</>
              : <>1 de cada 7 pesos del gasto federal tiene <span style={{ color: '#dc2626' }}>indicadores de corrupción</span>.</>
            }
          </h1>

          <p className="text-base leading-[1.7] text-text-secondary max-w-[68ch]">
            {lang === 'en'
              ? `RUBLI analyzed ${formatNumber(stats.totalContracts)} federal contracts totaling ${formatCompactMXN(stats.totalValue)} awarded between 2002 and 2025. A sector-calibrated risk model (AUC 0.828, validated against 748 documented corruption cases) flags ${stats.highCriticalRate.toFixed(2)}% as high or critical risk — an estimated ${formatCompactMXN(stats.valueAtRisk)} in potentially irregular spending. These are statistical signals that warrant investigation, not verdicts.`
              : `RUBLI analizó ${formatNumber(stats.totalContracts)} contratos federales por un valor de ${formatCompactMXN(stats.totalValue)} adjudicados entre 2002 y 2025. Un modelo de riesgo calibrado por sector (AUC 0.828, validado contra 748 casos documentados de corrupción) señala el ${stats.highCriticalRate.toFixed(2)}% como riesgo alto o crítico — un valor estimado de ${formatCompactMXN(stats.valueAtRisk)} en gasto potencialmente irregular. Son señales estadísticas que ameritan investigación, no veredictos.`
            }
          </p>
        </motion.header>

        {/* ─── Amber divider ─── */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a06820] to-transparent opacity-40 mb-10" />

        {/* ─── Risk Gauge ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2">
            {lang === 'en' ? 'Risk Rate · OECD Benchmark' : 'Tasa de Riesgo · Referencia OCDE'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-center bg-background-card border border-border rounded-sm p-6">
            <RiskGauge value={stats.highCriticalRate} />
            <div>
              <p className="text-lg font-semibold text-text-primary leading-[1.4] mb-3">
                {lang === 'en'
                  ? 'Mexico sits at the edge of the OECD compliance band.'
                  : 'México se encuentra al borde del rango de cumplimiento OCDE.'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.6] mb-4">
                {lang === 'en'
                  ? 'The OECD range (2–15%) defines what open procurement systems should look like. At 13.49%, Mexico is inside the upper limit but above the median of 8.5% — and the rate has climbed from 12% (2015) to 18% in peak years.'
                  : 'El rango OCDE (2–15%) define cómo se ve un sistema de contratación abierto. Con 13.49%, México está dentro del límite superior pero por encima de la mediana de 8.5% — y la tasa subió del 12% (2015) al 18% en años pico.'}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="border-l-2 border-[#22d3ee]/60 pl-3">
                  <div className="font-mono font-bold text-text-primary">2–15%</div>
                  <div className="text-text-muted">
                    {lang === 'en' ? 'OECD compliance band' : 'Rango OCDE'}
                  </div>
                </div>
                <div className="border-l-2 border-[#dc2626]/60 pl-3">
                  <div className="font-mono font-bold text-[#dc2626]">13.49%</div>
                  <div className="text-text-muted">
                    {lang === 'en' ? 'Mexico 2025' : 'México 2025'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Key Findings ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {t('keyFindings5.sectionLabel')}
          </div>
          <div className="space-y-5">
            {findings.map((f, idx) => (
              <motion.article
                key={f.key}
                className="grid grid-cols-[48px_1fr] md:grid-cols-[64px_180px_1fr] gap-4 md:gap-6 pb-5 border-b border-border last:border-0"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                {/* Ordinal */}
                <div
                  className="font-mono font-bold text-[32px] md:text-[40px] leading-none tabular-nums"
                  style={{ color: f.color }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </div>

                {/* Stat column (md+) */}
                <div className="hidden md:block">
                  <div
                    className="font-mono font-bold text-[28px] leading-none tabular-nums"
                    style={{ color: f.color }}
                  >
                    {f.stat}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted mt-2 leading-tight">
                    {f.label}
                  </div>
                </div>

                {/* Copy */}
                <div className="col-span-2 md:col-span-1">
                  <h3 className="font-semibold text-[17px] leading-[1.3] text-text-primary mb-1.5">
                    {f.headline}
                  </h3>
                  {/* Mobile stat */}
                  <div className="md:hidden mb-2">
                    <span
                      className="font-mono font-bold text-[22px] tabular-nums"
                      style={{ color: f.color }}
                    >
                      {f.stat}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted ml-2">
                      {f.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-[1.6]">
                    {f.body}
                  </p>
                </div>
              </motion.article>
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
          <div className="bg-background-card border border-border rounded-sm p-6">
            <CaseTimeline lang={lang} />
          </div>
        </section>

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
                className="inline-flex items-center gap-1.5 bg-[#a06820] hover:bg-[#835616] text-white font-medium text-sm px-4 py-2 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#a06820]/40"
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
