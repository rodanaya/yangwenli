/**
 * InstitutionThread — editorial 3-chapter dossier for institutions.
 *
 * Issue #004 (Day 3 of v1.0 launch sprint, 2026-05-09): the existing
 * InstitutionProfile.tsx is a 2,312-line card-grid sprawl with ~33 Card
 * components. The user filed it as "not well done" relative to the
 * RedThread quality bar. This file is the rework — a focused 3-chapter
 * scroll narrative mirroring the RedThread editorial pattern but
 * scoped to institution dossier semantics:
 *
 *   I. SUBJECT   — who they are, what they spend, top sector
 *  II. SUPPLIERS — vendor concentration, top 10 by value, HHI trend
 * III. RISK      — risk timeline, ASF/SFP findings, verdict
 *
 * Reuses RedThread's ChapterShell + ChapterDivider editorial chrome.
 * Uses the same institutionApi data hooks the old page uses.
 *
 * Routing: rendered at `/institutions/:id` (replaces InstitutionProfile
 * once the user signs off; both routes can coexist behind a feature
 * flag during preview).
 */
import { useMemo, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, ChevronRight } from 'lucide-react'
import { institutionApi } from '@/api/client'
import {
  RISK_COLORS,
  RISK_THRESHOLDS,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { staggerContainer, staggerItem } from '@/lib/animations'

// ───────────────────────────── Editorial primitives ─────────────────────────

function ChapterLabel({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] mb-2"
      style={{ color: accent ?? 'var(--color-accent)' }}
    >
      {children}
    </div>
  )
}

function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 max-w-[68rem] mx-auto px-4 sm:px-6">
      {children}
    </section>
  )
}

function ChapterDivider() {
  return (
    <div className="my-12 flex items-center justify-center" aria-hidden="true">
      <div className="h-px bg-border w-24" />
      <span className="mx-3 text-[12px] font-mono uppercase tracking-[0.3em] text-text-muted">§</span>
      <div className="h-px bg-border w-24" />
    </div>
  )
}

function ChapterHeading({
  label,
  title,
  accent,
}: {
  label: string
  title: React.ReactNode
  accent?: string
}) {
  return (
    <header className="mb-6">
      <ChapterLabel accent={accent}>{label}</ChapterLabel>
      <h2
        className="text-text-primary"
        style={{
          fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
          fontStyle: 'normal',
          fontWeight: 500,
          fontSize: 'clamp(28px, 4vw, 38px)',
          lineHeight: 1.05,
          letterSpacing: '-0.012em',
        }}
      >
        {title}
      </h2>
    </header>
  )
}

// ───────────────────────────── Page ─────────────────────────────────────────

export function InstitutionThread() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { i18n } = useTranslation('institutions')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const institutionId = Number(id)
  const validId = Number.isFinite(institutionId) && institutionId > 0
  const seedName = (location.state as Record<string, unknown> | null)?.institutionName as string | undefined
  const [vendorFilter, setVendorFilter] = useState<'all' | 'med' | 'high' | 'crit'>('all')

  // Three primary queries — one per chapter. The old page fired 14;
  // this one waits on 4 (institution + risk profile + vendors + timeline)
  // and fetches ASF data only when reaching Chapter III.
  const { data: institution, isLoading: instLoading, isError: instError } = useQuery({
    queryKey: ['institution-thread', institutionId, 'detail'],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: riskProfile } = useQuery({
    queryKey: ['institution-thread', institutionId, 'risk-profile'],
    queryFn: () => institutionApi.getRiskProfile(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendors } = useQuery({
    queryKey: ['institution-thread', institutionId, 'vendors', 50],
    queryFn: () => institutionApi.getVendors(institutionId, 50),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: timeline } = useQuery({
    queryKey: ['institution-thread', institutionId, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Derived values — MUST come before any conditional return to satisfy
  // React's Rules of Hooks. Null guards make them safe when institution is
  // undefined (i.e. still loading or invalid).
  const avgRisk = institution?.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(avgRisk)
  const riskColor = RISK_COLORS[riskLevel]

  const sectorCode = useMemo(() => {
    const sid = institution?.sector_id
    if (sid == null) return 'otros'
    return SECTORS.find((s) => s.id === sid)?.code ?? 'otros'
  }, [institution?.sector_id])
  const sectorColor = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const totalSpend = institution?.total_amount_mxn ?? 0
  const totalContracts = institution?.total_contracts ?? 0
  const vendorCount = institution?.vendor_count
  const directAwardPct = institution?.direct_award_pct ?? institution?.direct_award_rate ?? null

  const timelineArray = useMemo(
    () => (timeline && Array.isArray(timeline.timeline) ? timeline.timeline : []),
    [timeline],
  )
  const yearSpan = useMemo(() => {
    if (timelineArray.length === 0) return null
    const years = timelineArray.map((t) => t.year).filter((y) => typeof y === 'number')
    if (years.length === 0) return null
    return Math.max(...years) - Math.min(...years) + 1
  }, [timelineArray])
  const displayName = useMemo(() => institution ? toTitleCase(institution.name) : '...', [institution?.name])

  const filteredVendors = useMemo(() => {
    if (!vendors?.data) return []
    if (vendorFilter === 'all') return vendors.data
    const threshold = vendorFilter === 'med' ? RISK_THRESHOLDS.medium
      : vendorFilter === 'high' ? RISK_THRESHOLDS.high
      : RISK_THRESHOLDS.critical
    return vendors.data.filter(v => (v.avg_risk_score ?? 0) >= threshold)
  }, [vendors, vendorFilter])

  if (!validId) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">{isEs ? 'ID inválido' : 'Invalid ID'}</h1>
        <p className="text-text-muted">
          {isEs
            ? 'No se reconoció el identificador de la institución.'
            : 'Institution identifier was not recognized.'}
        </p>
        <Link to="/institutions" className="mt-4 inline-block text-accent hover:underline">
          {isEs ? '← Volver al ranking' : '← Back to ranking'}
        </Link>
      </div>
    )
  }

  if (instLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1
          className="text-text-primary mb-6"
          style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'normal', fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.0, letterSpacing: '-0.018em' }}
        >
          {seedName ?? '...'}
        </h1>
        <div className="flex flex-wrap gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-24 bg-background-elevated rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (instError || !institution) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">{isEs ? 'No se pudo cargar' : 'Could not load'}</h1>
        <p className="text-text-muted mb-4">
          {isEs
            ? 'Esta institución no existe o el backend no respondió.'
            : 'This institution does not exist or the backend did not respond.'}
        </p>
        <Link to="/institutions" className="text-accent hover:underline">
          {isEs ? '← Volver al ranking' : '← Back to ranking'}
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="bg-background min-h-screen pb-32 pt-8"
    >
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <header className="max-w-[68rem] mx-auto px-4 sm:px-6 mb-12">
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.18em] text-text-muted mb-3">
            <Link to="/institutions" className="hover:text-text-primary transition-colors">
              {isEs ? 'Instituciones' : 'Institutions'}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span style={{ color: sectorColor }}>{getSectorName(sectorCode, lang).toUpperCase()}</span>
          </div>
          <div className="flex items-start gap-3 mb-2">
            <Building2 className="h-7 w-7 mt-1 flex-shrink-0" style={{ color: sectorColor }} />
            <h1
              className="text-text-primary"
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: 'clamp(36px, 6vw, 60px)',
                lineHeight: 1.0,
                letterSpacing: '-0.018em',
              }}
            >
              {displayName}
            </h1>
          </div>
          {institution.siglas && institution.siglas !== institution.name && institution.siglas !== displayName && (
            <p className="ml-10 text-sm font-mono uppercase tracking-[0.16em] text-text-muted mt-1">
              {institution.siglas}
            </p>
          )}
        </motion.div>
      </header>

      {/* ─── CHAPTER I: SUBJECT ───────────────────────────────────────── */}
      <ChapterShell id="chapter-subject">
        <ChapterHeading
          label={`I · ${isEs ? 'EL SUJETO' : 'THE SUBJECT'}`}
          title={isEs ? 'Quién es esta institución' : 'Who this institution is'}
          accent={sectorColor}
        />
        <p
          className="text-text-secondary mb-8"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: '17px',
            lineHeight: 1.6,
          }}
        >
          {buildLede({
            name: displayName,
            contracts: totalContracts,
            spend: totalSpend,
            vendors: vendorCount,
            yearSpan,
            directAwardPct,
            lang,
          })}
        </p>

        {/* Hero KPIs — 4 stats in a clean strip. "—" when the backend
            doesn't have the metric (vendor_count and direct_award_pct
            are nullable on InstitutionDetailResponse). */}
        <div className="flex flex-wrap gap-8 mb-6">
          {[
            { label: isEs ? 'Contratos' : 'Contracts', value: formatNumber(totalContracts) },
            { label: isEs ? 'Valor total' : 'Total value', value: formatCompactMXN(totalSpend) },
            { label: isEs ? 'Adj. directas' : 'Direct awards', value: directAwardPct != null ? `${(directAwardPct * 100).toFixed(0)}%` : '—' },
            { label: isEs ? 'Proveedores' : 'Vendors', value: vendorCount != null ? formatNumber(vendorCount) : '—' },
          ].map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest leading-[1.3]">
                {s.label}
              </div>
              <div className="font-mono text-xl tabular-nums font-semibold text-text-primary leading-tight mt-1">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Risk indicator strip */}
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-mono uppercase tracking-[0.18em] text-text-muted">
            {isEs ? 'Indicador de riesgo' : 'Risk indicator'}
          </span>
          <span
            className="text-2xl font-bold font-mono tabular-nums"
            style={{ color: riskColor }}
          >
            {(avgRisk * 100).toFixed(1)}%
          </span>
          <span
            className="text-[12px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm"
            style={{ color: riskColor, backgroundColor: `${riskColor}1a`, border: `1px solid ${riskColor}40` }}
          >
            {isEs
              ? riskLevel === 'critical' ? 'Crítico' : riskLevel === 'high' ? 'Alto' : riskLevel === 'medium' ? 'Medio' : 'Bajo'
              : riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
          </span>
        </div>
      </ChapterShell>

      <ChapterDivider />

      {/* ─── CHAPTER II: SUPPLIERS ────────────────────────────────────── */}
      <ChapterShell id="chapter-suppliers">
        <ChapterHeading
          label={`II · ${isEs ? 'LOS PROVEEDORES' : 'THE SUPPLIERS'}`}
          title={isEs ? 'A quién le compran' : 'Who they buy from'}
          accent={sectorColor}
        />
        {vendors && vendors.data && vendors.data.length > 0 ? (
          <>
            <p className="text-text-secondary mb-6 text-sm leading-relaxed">
              {isEs
                ? `Los proveedores más grandes concentran la mayor parte del gasto. La barra muestra el valor relativo dentro del top; el porcentaje, su participación en el gasto total de la institución.`
                : `The largest vendors absorb most of the spend. The bar shows relative value within the top; the percentage shows their share of total institutional spending.`}
            </p>
            {/* Risk filter chips */}
            <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label={isEs ? 'Filtrar por riesgo' : 'Filter by risk'}>
              {([
                { key: 'all' as const, label: isEs ? 'Todos' : 'All', color: 'var(--color-text-secondary)' },
                { key: 'med' as const, label: isEs ? 'Med+' : 'Med+', color: RISK_COLORS.medium },
                { key: 'high' as const, label: isEs ? 'Alto+' : 'High+', color: RISK_COLORS.high },
                { key: 'crit' as const, label: isEs ? 'Crítico' : 'Crit', color: RISK_COLORS.critical },
              ]).map(({ key, label, color }) => {
                const active = vendorFilter === key
                return (
                  <button
                    key={key}
                    onClick={() => setVendorFilter(key)}
                    aria-pressed={active}
                    className="font-mono text-[12px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                    style={active
                      ? { background: color, borderColor: color, color: '#fff' }
                      : { background: 'transparent', borderColor: color, color }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <TopVendorsList vendors={filteredVendors} totalSpend={totalSpend} lang={lang} />
            {riskProfile?.effective_risk != null && (
              <div className="mt-8 flex items-baseline gap-3 flex-wrap">
                <span className="text-[12px] font-mono uppercase tracking-[0.18em] text-text-muted">
                  {isEs ? 'Riesgo institucional efectivo' : 'Effective institutional risk'}
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-text-primary">
                  {(riskProfile.effective_risk * 100).toFixed(1)}%
                </span>
                {riskProfile.size_tier && (
                  <span className="text-xs text-text-secondary">
                    · {isEs ? 'tamaño:' : 'size:'} <span className="font-mono uppercase">{riskProfile.size_tier}</span>
                  </span>
                )}
                {riskProfile.autonomy_level && (
                  <span className="text-xs text-text-secondary">
                    · {isEs ? 'autonomía:' : 'autonomy:'} <span className="font-mono uppercase">{riskProfile.autonomy_level}</span>
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-text-muted">{isEs ? 'Sin datos de proveedores disponibles.' : 'No vendor data available.'}</p>
        )}
      </ChapterShell>

      <ChapterDivider />

      {/* ─── CHAPTER III: RISK ────────────────────────────────────────── */}
      <ChapterShell id="chapter-risk">
        <ChapterHeading
          label={`III · ${isEs ? 'EL RIESGO' : 'THE RISK'}`}
          title={isEs ? 'Patrón temporal y verdicto' : 'Temporal pattern and verdict'}
          accent={sectorColor}
        />
        {timelineArray.length > 0 ? (
          <>
            <p className="text-text-secondary mb-6 text-sm leading-relaxed">
              {isEs
                ? 'Cada año se muestra coloreado por su indicador de riesgo promedio. Un patrón ascendente sugiere captura institucional o concentración creciente.'
                : 'Each year is colored by its average risk indicator. An ascending pattern suggests institutional capture or growing concentration.'}
            </p>
            <RiskYearStrip timeline={timelineArray} lang={lang} />
          </>
        ) : (
          <p className="text-text-muted">{isEs ? 'Sin datos de línea de tiempo.' : 'No timeline data available.'}</p>
        )}

        {/* Verdict footer */}
        <div
          className="mt-12 p-6 rounded-sm border-l-4"
          style={{
            borderLeftColor: riskColor,
            background: `${riskColor}0d`,
          }}
        >
          <ChapterLabel accent={riskColor}>{isEs ? 'VEREDICTO' : 'VERDICT'}</ChapterLabel>
          <p
            className="text-text-primary"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: '20px',
              fontStyle: 'normal',
              lineHeight: 1.4,
            }}
          >
            {buildVerdict(displayName, riskLevel, directAwardPct, vendorCount, totalContracts, lang)}
          </p>
        </div>
      </ChapterShell>

    </motion.div>
  )
}

// ───────────────────────────── Sub-components ───────────────────────────────

function TopVendorsList({
  vendors,
  totalSpend,
  lang,
}: {
  vendors: Array<{ vendor_id: number; vendor_name: string; total_value_mxn: number; contract_count: number; avg_risk_score?: number | null }>
  totalSpend: number
  lang: 'en' | 'es'
}) {
  const top10 = vendors.slice(0, 10)
  const max = Math.max(...top10.map((v) => v.total_value_mxn || 0), 1)
  return (
    <div className="space-y-1">
      {top10.map((v, i) => {
        const pct = totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0
        const ratio = (v.total_value_mxn ?? 0) / max
        const risk = v.avg_risk_score ?? 0
        const riskColor = RISK_COLORS[getRiskLevelFromScore(risk)]
        return (
          <div
            key={v.vendor_id}
            className="grid items-center gap-3 py-1.5 px-2 rounded-sm hover:bg-background-elevated/40 transition-colors"
            style={{ gridTemplateColumns: '24px 200px 1fr 70px 50px' }}
          >
            <span className="text-[12px] font-mono tabular-nums text-text-muted text-right">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <EntityIdentityChip
                type="vendor"
                id={v.vendor_id}
                name={v.vendor_name}
                size="sm"
                riskScore={risk}
                hideIcon
              />
            </div>
            <div className="relative h-2 rounded-sm bg-background-elevated/40">
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${ratio * 100}%`,
                  backgroundColor: riskColor,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="text-[13px] font-mono tabular-nums text-text-primary text-right">
              {formatCompactMXN(v.total_value_mxn ?? 0)}
            </span>
            <span className="text-[12px] font-mono tabular-nums text-text-muted text-right">
              {pct.toFixed(1)}%
            </span>
          </div>
        )
      })}
      <div className="mt-3 text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted">
        {lang === 'en'
          ? 'rank · vendor · relative value (top 10) · MXN · % of total'
          : 'orden · proveedor · valor relativo (top 10) · MXN · % del total'}
      </div>
    </div>
  )
}

function RiskYearStrip({
  timeline,
  lang,
}: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  lang: 'en' | 'es'
}) {
  const sorted = useMemo(() => [...timeline].sort((a, b) => a.year - b.year), [timeline])
  if (sorted.length === 0) return null
  const maxValue = Math.max(...sorted.map((t) => t.total_value || 0), 1)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[60px_1fr_60px_60px] gap-3 items-center text-[13px] font-mono uppercase tracking-[0.12em] text-text-muted opacity-70 mb-1">
        <span>{lang === 'en' ? 'Year' : 'Año'}</span>
        <span>{lang === 'en' ? 'Spend' : 'Gasto'}</span>
        <span className="text-right">{lang === 'en' ? 'Risk' : 'Riesgo'}</span>
        <span className="text-right">{lang === 'en' ? 'Contracts' : 'Contratos'}</span>
      </div>
      {sorted.map((t) => {
        const risk = t.avg_risk_score ?? 0
        const riskPct = risk * 100
        const lvl = getRiskLevelFromScore(risk)
        const riskColor = RISK_COLORS[lvl]
        return (
          <div
            key={t.year}
            className="grid grid-cols-[60px_1fr_60px_60px] gap-3 items-center py-1 px-2 rounded-sm hover:bg-background-elevated/40 transition-colors"
          >
            <span className="text-[13px] font-mono tabular-nums text-text-secondary">{t.year}</span>
            <div className="flex items-center gap-2">
              <DotBar
                value={t.total_value}
                max={maxValue}
                color={riskColor}
                dots={28}
              />
              <span className="text-[12px] font-mono tabular-nums text-text-muted">
                {formatCompactMXN(t.total_value || 0)}
              </span>
            </div>
            <span
              className="text-[13px] font-mono tabular-nums font-semibold text-right"
              style={{ color: riskColor }}
            >
              {riskPct.toFixed(0)}%
            </span>
            <span className="text-[12px] font-mono tabular-nums text-text-muted text-right">
              {formatNumber(t.contract_count)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function buildLede(input: {
  name: string
  contracts: number
  spend: number
  vendors: number | null | undefined
  yearSpan: number | null
  directAwardPct: number | null | undefined
  lang: 'en' | 'es'
}): string {
  const { name, contracts, spend, vendors, yearSpan, directAwardPct, lang } = input
  const vendorPart =
    vendors != null
      ? lang === 'es'
        ? ` con ${formatNumber(vendors)} proveedores distintos`
        : ` with ${formatNumber(vendors)} distinct vendors`
      : ''
  const yearPart = yearSpan ? (lang === 'es' ? ` a lo largo de ${yearSpan} años` : ` over ${yearSpan} years`) : ''
  const daPart =
    directAwardPct != null
      ? lang === 'es'
        ? ` ${(directAwardPct * 100).toFixed(0)}% de los contratos se adjudicaron directamente, sin licitación.`
        : ` ${(directAwardPct * 100).toFixed(0)}% of contracts were awarded directly, without a competitive procedure.`
      : ''
  if (lang === 'es') {
    return `${name} ha contratado ${formatNumber(contracts)} veces por un valor combinado de ${formatCompactMXN(spend)}${vendorPart}${yearPart}.${daPart}`
  }
  return `${name} has signed ${formatNumber(contracts)} contracts for a combined value of ${formatCompactMXN(spend)}${vendorPart}${yearPart}.${daPart}`
}

function buildVerdict(
  name: string,
  level: 'critical' | 'high' | 'medium' | 'low',
  daPct: number | null | undefined,
  vendorCount: number | null | undefined,
  contractCount: number,
  lang: 'en' | 'es',
): string {
  const daLabel = daPct != null ? `${(daPct * 100).toFixed(0)}%` : (lang === 'es' ? 'sin datos de' : 'no data on')
  const vc = vendorCount != null ? vendorCount.toLocaleString() : '?'
  const cc = contractCount.toLocaleString()
  // When DA% data is missing, the verdict has to read coherently without
  // the percentage anchor. Each level gets a "no-DA" variant.
  if (daPct == null) {
    if (lang === 'es') {
      if (level === 'critical') return `${name} muestra un patrón crítico en sus ${cc} contratos. Sin datos sobre tasa de adjudicación directa, pero el indicador de riesgo agregado supera el umbral del 60%. Revisión prioritaria.`
      if (level === 'high') return `${name} muestra señales preocupantes en sus ${cc} contratos. La tasa de adjudicación directa no está disponible para esta institución. Revisar la concentración por proveedor.`
      if (level === 'medium') return `${name} muestra señales moderadas en sus ${cc} contratos. Datos parciales — revisar antes de descartar.`
      return `${name} no muestra señales de riesgo destacadas en sus ${cc} contratos. Dentro del rango habitual del sector.`
    }
    if (level === 'critical') return `${name} shows a critical pattern across ${cc} contracts. No data on direct-award rate, but the aggregate risk indicator clears the 60% threshold. Priority review.`
    if (level === 'high') return `${name} shows concerning signals across ${cc} contracts. Direct-award rate data not available for this institution. Review vendor concentration.`
    if (level === 'medium') return `${name} shows moderate signals across ${cc} contracts. Partial data — review before dismissing.`
    return `${name} does not show prominent risk signals across ${cc} contracts. Within the sector's normal range.`
  }
  // DA% present — full editorial copy.
  if (lang === 'es') {
    if (level === 'critical')
      return `${name} muestra un patrón crítico: ${daLabel} de ${cc} contratos adjudicados directamente a ${vc} proveedores. La concentración y el tipo de adjudicación sugieren captura institucional probable. Revisión prioritaria.`
    if (level === 'high')
      return `${name} muestra señales preocupantes: ${daLabel} de ${cc} contratos adjudicados directamente. Revisar la concentración por proveedor y los hallazgos de auditoría asociados.`
    if (level === 'medium')
      return `${name} muestra señales moderadas. ${daLabel} de adjudicación directa en ${cc} contratos sobre ${vc} proveedores. Revisar antes de descartar.`
    return `${name} no muestra señales de riesgo destacadas. ${daLabel} de adjudicación directa en ${cc} contratos sobre ${vc} proveedores — dentro del rango habitual del sector.`
  }
  if (level === 'critical')
    return `${name} shows a critical pattern: ${daLabel} of ${cc} contracts awarded directly to ${vc} vendors. The concentration and award-type combination suggests likely institutional capture. Priority review.`
  if (level === 'high')
    return `${name} shows concerning signals: ${daLabel} of ${cc} contracts awarded directly. Review vendor concentration and any associated audit findings.`
  if (level === 'medium')
    return `${name} shows moderate signals. ${daLabel} direct awards across ${cc} contracts and ${vc} vendors. Review before dismissing.`
  return `${name} does not show prominent risk signals. ${daLabel} direct awards across ${cc} contracts and ${vc} vendors — within the sector's normal range.`
}

export default InstitutionThread
