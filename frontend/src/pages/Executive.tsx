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
// Timeline — Horizontal dot-strip 2002-2025 (expanded to 200px)
// ─────────────────────────────────────────────────────────────────────────────
function CaseTimeline({ lang }: { lang: 'en' | 'es' }) {
  const YEAR_MIN = 2002
  const YEAR_MAX = 2025
  const years = YEAR_MAX - YEAR_MIN

  return (
    <div className="py-4">
      <div className="relative h-[200px]">
        {/* Baseline — centered vertically */}
        <div className="absolute left-0 right-0 top-[100px] h-px bg-[#e2ddd6]" />
        {/* Year ticks */}
        {[2002, 2006, 2012, 2018, 2024].map((y) => {
          const pct = ((y - YEAR_MIN) / years) * 100
          return (
            <div
              key={y}
              className="absolute top-[96px] h-2 w-px bg-[#9c9490]"
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
          // Dot sits on baseline (top: 100), labels alternate above (60) / below (140)
          const dotTop = 94
          const labelTop = above ? -46 : 18
          return (
            <motion.div
              key={c.year + c.label.en}
              className="absolute"
              style={{ left: `${pct}%`, top: `${dotTop}px` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              {/* Connector line from dot to label */}
              <div
                className="absolute left-1/2 w-px -translate-x-1/2 bg-[#d4cfc7]"
                style={{
                  top: above ? `-40px` : `12px`,
                  height: '40px',
                }}
              />
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
                className="absolute left-1/2 w-[140px] -translate-x-1/2 text-center text-[10px] font-medium leading-[1.3] text-text-secondary pointer-events-none"
                style={{ top: `${labelTop}px` }}
              >
                <span className="font-mono text-text-muted">{c.year}</span>
                <br />
                <span>{c.label[lang]}</span>
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

  // ─── KPI tiles (2x2 grid) ──────────────────────────────────────────────────
  const kpis = [
    {
      value: `${stats.highCriticalRate.toFixed(2)}%`,
      label: lang === 'en' ? 'HIGH-RISK RATE' : 'TASA DE ALTO RIESGO',
      context: lang === 'en' ? 'OECD range: 2–15%' : 'Rango OCDE: 2–15%',
      color: '#dc2626',
    },
    {
      value: formatCompactMXN(stats.valueAtRisk),
      label: lang === 'en' ? 'VALUE AT RISK' : 'VALOR EN RIESGO',
      context: lang === 'en' ? 'Est. in high+critical contracts' : 'Est. en contratos de riesgo alto+crítico',
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
      color: '#71717a',
    },
  ]

  // ─── Signal cards (top 3 model predictors, replaces 5 findings) ─────────────
  const signals = [
    {
      num: '01',
      coef: 'β = +0.534',
      name: lang === 'en' ? 'Price Volatility' : 'Volatilidad de Precio',
      body:
        lang === 'en'
          ? 'Vendors with wildly varying contract amounts — the strongest single predictor. IMSS ghost company network: 9,366 contracts, 99.9% detection.'
          : 'Proveedores con montos de contrato altamente variables — el predictor individual más fuerte. Red de empresas fantasma IMSS: 9,366 contratos, 99.9% de detección.',
      color: '#dc2626',
    },
    {
      num: '02',
      coef: 'β = +0.375',
      name: lang === 'en' ? 'Vendor Concentration' : 'Concentración de Proveedor',
      body:
        lang === 'en'
          ? 'Dominant vendors capturing outsized market share. Toka IT Monopoly, Edenred Voucher Monopoly.'
          : 'Proveedores dominantes capturando una cuota de mercado desproporcionada. Monopolio TIC Toka, Monopolio de Vales Edenred.',
      color: '#f59e0b',
    },
    {
      num: '03',
      coef: 'β = +0.235',
      name: lang === 'en' ? 'Price Ratio' : 'Razón de Precio',
      body:
        lang === 'en'
          ? 'Contract amounts far above sector median. Segalmex, PEMEX-Cotemar.'
          : 'Montos de contrato muy por encima de la mediana del sector. Segalmex, PEMEX-Cotemar.',
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

        {/* ─── KPI Grid (2x2) ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? 'Headline Numbers' : 'Cifras Clave'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {lang === 'en' ? 'Top Fraud Signals · Model Coefficients' : 'Principales Señales de Fraude · Coeficientes del Modelo'}
          </div>
          <div className="space-y-4">
            {signals.map((s, idx) => (
              <motion.article
                key={s.num}
                className="surface-card border-l-2 rounded-sm p-5 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6"
                style={{ borderLeftColor: s.color }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
                    {lang === 'en' ? 'SIGNAL' : 'SEÑAL'} {s.num}
                  </div>
                  <div
                    className="font-mono font-bold text-[22px] mt-2 tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.coef}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[17px] leading-[1.3] text-text-primary mb-1.5">
                    {s.name}
                  </h3>
                  <p className="text-sm text-text-secondary leading-[1.6]">
                    {s.body}
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
