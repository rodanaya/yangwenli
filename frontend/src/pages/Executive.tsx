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
import { analysisApi, contractApi } from '@/api/client'
import type { ContractListItem, ContractListResponse } from '@/api/types'
import { useQuery } from '@tanstack/react-query'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'

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
// Timeline — Vertical list 2002-2025 (replaces horizontal dot-strip)
// ─────────────────────────────────────────────────────────────────────────────
// SVG horizontal dot-strip timeline 2002–2025.
// Dots colored by sector; filled = critical, outlined = high.
// Labels alternate above/below the axis to avoid overlap.
function CaseTimeline({ lang }: { lang: 'en' | 'es' }) {
  const SVG_W = 820
  const SVG_H = 220
  const AXIS_Y = 110
  const YEAR_MIN = 2002
  const YEAR_MAX = 2025
  const AXIS_X0 = 16
  const AXIS_X1 = SVG_W - 16

  const yearToX = (year: number) =>
    AXIS_X0 + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (AXIS_X1 - AXIS_X0)

  const TICK_YEARS = [2002, 2006, 2010, 2014, 2018, 2022, 2025]

  // Short labels to avoid overlap in the dense 2018-2023 cluster
  const SHORT: Record<string, { en: string; es: string }> = {
    '2008-salud':           { en: 'IMSS ghost',    es: 'IMSS fantasma' },
    '2010-gobernacion':     { en: 'Estafa Maestra', es: 'Estafa Maestra' },
    '2012-energia':         { en: 'Oceanografía',  es: 'Oceanografía' },
    '2014-infraestructura': { en: 'Grupo Higa',    es: 'Grupo Higa' },
    '2016-energia':         { en: 'Odebrecht',     es: 'Odebrecht' },
    '2018-tecnologia':      { en: 'IT overpricing', es: 'Sobreprecio TIC' },
    '2019-agricultura':     { en: 'Segalmex',      es: 'Segalmex' },
    '2020-salud':           { en: 'COVID-19',      es: 'COVID-19' },
    '2022-hacienda':        { en: 'Edenred',       es: 'Edenred' },
    '2023-tecnologia':      { en: 'Toka',          es: 'Toka' },
  }

  const DOT_R_CRIT = 7
  const DOT_R_HIGH = 5

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Timeline of documented corruption cases 2002–2025"
      >
        {/* Main axis */}
        <line x1={AXIS_X0} x2={AXIS_X1} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-border-hover)" strokeWidth={1.5} />

        {/* Tick marks and year labels */}
        {TICK_YEARS.map(y => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={AXIS_Y - 4} y2={AXIS_Y + 4} stroke="var(--color-border)" strokeWidth={1} />
            <text
              x={yearToX(y)} y={AXIS_Y + 16}
              textAnchor="middle" fill="var(--color-text-muted)"
              fontSize={9} fontFamily="var(--font-family-mono, monospace)"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Case dots + labels */}
        {TIMELINE_CASES.map((c, idx) => {
          const key = `${c.year}-${c.sector}`
          const shortLabel = SHORT[key]?.[lang] ?? c.label[lang]
          const x = yearToX(c.year)
          const above = idx % 2 === 0
          const color = SECTOR_COLORS[c.sector]
          const isCrit = c.severity === 'critical'
          const r = isCrit ? DOT_R_CRIT : DOT_R_HIGH
          const lineY1 = above ? AXIS_Y - r - 3 : AXIS_Y + r + 3
          const lineY2 = above ? AXIS_Y - r - 32 : AXIS_Y + r + 32
          const yearLabelY = above ? lineY2 - 14 : lineY2 + 10
          const nameLabelY = above ? lineY2 - 3 : lineY2 + 22

          return (
            <g key={`${c.year}-${idx}`}>
              {/* Vertical connector */}
              <line
                x1={x} x2={x} y1={lineY1} y2={lineY2}
                stroke={color} strokeWidth={0.7} strokeDasharray="2 2" opacity={0.45}
              />
              {/* Dot */}
              <circle
                cx={x} cy={AXIS_Y} r={r}
                fill={isCrit ? color : 'transparent'}
                stroke={color} strokeWidth={isCrit ? 0 : 1.5}
                fillOpacity={isCrit ? 0.85 : 1}
              />
              {/* Year number */}
              <text
                x={x} y={yearLabelY}
                textAnchor="middle"
                fill={color} opacity={0.9}
                fontSize={9} fontWeight="bold"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {c.year}
              </text>
              {/* Short case name */}
              <text
                x={x} y={nameLabelY}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize={8}
                fontFamily="var(--font-family-sans, sans-serif)"
              >
                {shortLabel}
              </text>
              <title>{c.label[lang]} ({c.year}) — {c.severity}</title>
            </g>
          )
        })}
      </svg>

      {/* Legend strip */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {TIMELINE_CASES.map((c, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                backgroundColor: c.severity === 'critical' ? SECTOR_COLORS[c.sector] : 'transparent',
                border: `1.5px solid ${SECTOR_COLORS[c.sector]}`,
                flexShrink: 0,
              }}
            />
            <span className="text-[10px] font-mono text-text-muted">
              {c.year} · {c.label[lang]}
            </span>
          </div>
        ))}
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
      value: `${stats.highCriticalRate.toFixed(2)}%`,
      label: lang === 'en' ? 'HIGH-RISK RATE' : 'TASA DE ALTO RIESGO',
      context: lang === 'en' ? 'OECD range: 2–15%' : 'Rango OCDE: 2–15%',
      color: '#dc2626',
    },
    {
      value: `~${formatCompactMXN(stats.valueAtRisk)}`,
      label: lang === 'en' ? 'VALUE AT RISK (EST.)' : 'VALOR EN RIESGO (EST.)',
      context: lang === 'en'
        ? 'High+critical contract share × total spend'
        : 'Proporción de alto+crítico × gasto total',
      color: '#f59e0b',
    },
    {
      value: formatNumber(stats.highCriticalCount),
      label: lang === 'en' ? 'HIGH + CRITICAL' : 'ALTO + CRÍTICO',
      context: lang === 'en' ? 'Contracts flagged for priority review' : 'Contratos señalados para revisión prioritaria',
      color: '#a06820',
    },
    {
      value: '0.828',
      label: lang === 'en' ? 'MODEL AUC' : 'AUC DEL MODELO',
      context: lang === 'en' ? 'Vendor-stratified validation' : 'Validación estratificada por proveedor',
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
              ? <>One vendor took <span style={{ color: '#dc2626' }}>133.2 billion pesos</span> from IMSS. <span className="text-text-secondary">320 more match the pattern.</span></>
              : <>Un proveedor tomó <span style={{ color: '#dc2626' }}>133.2 mil millones de pesos</span> del IMSS. <span className="text-text-secondary">Otros 320 coinciden con el patrón.</span></>
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
                  <strong className="text-text-primary">Grupo Farmacos Especializados</strong> won 6,303 federal health contracts over fourteen years.
                  Seventy-nine percent were awarded without competitive bidding — 3× the OECD ceiling.
                  RUBLI's model — trained on <strong className="text-text-primary">Segalmex, Odebrecht, IMSS Ghost, COVID emergency procurement</strong>, and 18 other prosecuted scandals — now flags <strong className="text-text-primary">{formatNumber(stats.highCriticalCount)} contracts</strong> with the same fingerprint.
                  Together they represent an estimated <strong className="text-text-primary">~{formatCompactMXN(stats.valueAtRisk)} MXN</strong> in flagged spend (high+critical contract share × total spend; assumes uniform value distribution across risk bands).
                  These are investigation signals, not verdicts.
                </>
              : <>
                  <strong className="text-text-primary">Grupo Farmacos Especializados</strong> ganó 6,303 contratos federales de salud en catorce años.
                  El 79% fueron adjudicaciones directas — 3× el umbral OCDE.
                  El modelo de RUBLI — entrenado con <strong className="text-text-primary">Segalmex, Odebrecht, Fantasmas del IMSS, compras de emergencia COVID</strong> y 18 escándalos más ya procesados — ahora señala <strong className="text-text-primary">{formatNumber(stats.highCriticalCount)} contratos</strong> con la misma huella.
                  Juntos representan un estimado de <strong className="text-text-primary">~{formatCompactMXN(stats.valueAtRisk)} MXN</strong> en gasto señalado (proporción alto+crítico × gasto total; asume distribución uniforme de valor entre niveles).
                  Son señales de investigación, no veredictos.
                </>
            }
          </p>
        </motion.header>

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
            {lang === 'en' ? 'Three fraud fingerprints — what the data reveals' : 'Tres huellas de fraude — lo que revelan los datos'}
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
