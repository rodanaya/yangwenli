/**
 * Intersection — the RUBLI-vs-regulators contradiction surface.
 *
 * This is the pitch page: what does our model see that SAT EFOS / SFP /
 * ground-truth corpus have missed, and vice versa? Three quadrants:
 *
 *  • Novelty   — RUBLI High+ risk, zero external registry hits
 *  • Confirmed — RUBLI High+ risk AND at least one external registry hit
 *  • Blind spot — RUBLI Low risk BUT at least one external registry hit
 *
 * The fourth quadrant (both clean) is just a number — no editorial
 * interest in a ranked list of unsuspicious vendors.
 */

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, type IntersectionVendor } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { ChevronRight, AlertTriangle } from 'lucide-react'

function RegistryBadges({ v }: { v: IntersectionVendor }) {
  const badges: Array<{ label: string; color: string; title: string }> = []
  if (v.is_efos_definitivo) badges.push({
    label: 'EFOS',
    color: '#dc2626',
    title: 'SAT-confirmed ghost company (Art. 69-B definitivo)',
  })
  if (v.is_sfp_sanctioned) badges.push({
    label: 'SFP',
    color: '#ea580c',
    title: 'Federal comptroller sanction',
  })
  if (v.in_ground_truth) badges.push({
    label: 'GT',
    color: '#a06820',
    title: 'Party to a documented corruption case',
  })
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1 flex-shrink-0">
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
          style={{
            color: b.color,
            background: `${b.color}14`,
            border: `1px solid ${b.color}33`,
          }}
        >
          {b.label}
        </span>
      ))}
    </span>
  )
}

function VendorRow({
  v,
  rank,
  showSecondaryMetric,
  lang,
}: {
  v: IntersectionVendor
  rank: number
  showSecondaryMetric: 'ips' | 'risk' | 'value'
  lang: string
}) {
  const sectorColor = v.primary_sector_name
    ? SECTOR_COLORS[v.primary_sector_name.toLowerCase()] ?? '#64748b'
    : '#64748b'
  const secondary =
    showSecondaryMetric === 'ips'
      ? `IPS ${(v.ips_final * 100).toFixed(0)}`
      : showSecondaryMetric === 'risk'
        ? `${(v.avg_risk_score * 100).toFixed(0)}/100`
        : formatCompactMXN(v.total_value_mxn)
  return (
    <Link
      to={`/vendors/${v.vendor_id}`}
      className="group flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors text-left"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-text-primary truncate group-hover:text-[color:var(--color-accent)] transition-colors">
            {v.vendor_name}
          </span>
          <RegistryBadges v={v} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-text-muted">
          {v.primary_sector_name && (
            <span className="uppercase tracking-wider">{v.primary_sector_name}</span>
          )}
          <span>·</span>
          <span className="tabular-nums">
            {formatNumber(v.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}
          </span>
          {v.primary_pattern && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider">{v.primary_pattern}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <div className="font-mono text-sm font-bold tabular-nums text-text-primary">
          {secondary}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0 group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}

function QuadrantCard({
  eyebrow,
  title,
  deck,
  count,
  accent,
  rows,
  showSecondaryMetric,
  lang,
  ctaLabel,
  ctaTo,
}: {
  eyebrow: string
  title: React.ReactNode
  deck: React.ReactNode
  count: number
  accent: string
  rows: IntersectionVendor[]
  showSecondaryMetric: 'ips' | 'risk' | 'value'
  lang: string
  ctaLabel: string
  ctaTo: string
}) {
  return (
    <section
      className="rounded-sm border border-border bg-background-card overflow-hidden"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p
            className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </p>
          <p className="font-mono tabular-nums text-[11px] text-text-muted">
            {formatNumber(count)} {lang === 'es' ? 'proveedores' : 'vendors'}
          </p>
        </div>
        <h2
          className="mt-1 text-text-primary leading-tight"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-prose">
          {deck}
        </p>
      </header>
      {rows.length > 0 ? (
        <div>
          {rows.map((v, i) => (
            <VendorRow
              key={v.vendor_id}
              v={v}
              rank={i + 1}
              showSecondaryMetric={showSecondaryMetric}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-text-muted">
          {lang === 'es' ? 'Sin datos.' : 'No data.'}
        </div>
      )}
      {count > rows.length && (
        <Link
          to={ctaTo}
          className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border text-[11px] font-mono tracking-[0.12em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <span>{ctaLabel}</span>
          <span>
            {count - rows.length > 0
              ? `+${formatNumber(count - rows.length)} ${lang === 'es' ? 'más' : 'more'}`
              : ''}{' '}
            →
          </span>
        </Link>
      )}
    </section>
  )
}

export default function Intersection() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data, isLoading } = useQuery({
    queryKey: ['intersection', 'summary', 10],
    queryFn: () => intersectionApi.getSummary(10),
    staleTime: 10 * 60 * 1000,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Utility header — same pattern as the rest of the redesign sweep. */}
      <header className="mb-5 pb-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {data && !isLoading ? (
                <>
                  {lang === 'es' ? 'RUBLI señala ' : 'RUBLI flags '}
                  <span style={{ color: 'var(--color-risk-critical)' }}>{formatNumber(data.counts.novelty)}</span>
                  {lang === 'es' ? ' proveedores que los reguladores aún no.' : ' vendors regulators haven\'t.'}
                </>
              ) : (lang === 'es' ? 'Modelo contra reguladores' : 'Model versus regulators')}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
              {lang === 'es' ? 'RUBLI · LA INTERSECCIÓN' : 'RUBLI · THE INTERSECTION'}
            </p>
          </div>
          {!isLoading && data && (
            <div className="flex items-baseline gap-5">
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--color-risk-critical)' }}>
                  {formatNumber(data.counts.novelty)}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {lang === 'es' ? 'Novedad' : 'Novelty'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--color-accent)' }}>
                  {formatNumber(data.counts.confirmed)}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {lang === 'es' ? 'Confirmado' : 'Confirmed'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                  {formatNumber(data.counts.blindspot)}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {lang === 'es' ? 'Punto ciego' : 'Blind spot'}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <div>
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-sm border border-border bg-background-card p-5">
                <Skeleton className="h-3 w-32 mb-3" />
                <Skeleton className="h-6 w-96 mb-2" />
                <Skeleton className="h-4 w-full max-w-prose mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* Methodology caveat — ensures any reader lands on the framing
                before drawing defamation-adjacent conclusions from the
                ranked lists. */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm border border-border bg-background-elevated">
              <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-[1.6] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Los cuadrantes son señales de investigación, no veredictos. Un proveedor en "novedad" coincide con patrones de corrupción documentados pero no aparece en registros externos — eso justifica revisión, no acusación. Umbrales: {(data.thresholds.rubli_flags * 100).toFixed(0)}% = alto riesgo; {(data.thresholds.rubli_clean * 100).toFixed(0)}% = bajo riesgo; ≥ {data.thresholds.min_contracts} contratos.
                  </>
                ) : (
                  <>
                    Quadrants are investigation signals, not verdicts. A vendor in "novelty" matches documented corruption patterns but does not appear on external registries — that warrants review, not accusation. Thresholds: {(data.thresholds.rubli_flags * 100).toFixed(0)}% = high risk; {(data.thresholds.rubli_clean * 100).toFixed(0)}% = low risk; ≥ {data.thresholds.min_contracts} contracts.
                  </>
                )}
              </p>
            </div>

            {/* NOVELTY — the pitch quadrant */}
            <QuadrantCard
              eyebrow={lang === 'es' ? 'Cuadrante I · Novedad' : 'Quadrant I · Novelty'}
              accent="var(--color-risk-critical)"
              count={data.counts.novelty}
              title={
                lang === 'es'
                  ? <>Proveedores que coinciden con patrones de corrupción — sin marca externa.</>
                  : <>Vendors matching corruption patterns — not on any external registry.</>
              }
              deck={
                lang === 'es'
                  ? <>Esta es la razón de ser del modelo: <strong className="text-text-primary">{formatNumber(data.counts.novelty)}</strong> proveedores con score alto (≥ 40/100) cuyos RFC no aparecen en SAT EFOS, ni tienen sanción SFP, ni están en el corpus de casos documentados. Ordenados por IPS — prioridad integrada.</>
                  : <>This is the model's reason to exist: <strong className="text-text-primary">{formatNumber(data.counts.novelty)}</strong> vendors with high pattern-match (≥ 40/100) whose RFCs do not appear on SAT EFOS, carry no SFP sanction, and are absent from the documented-case corpus. Ranked by IPS (integrated priority score).</>
              }
              rows={data.rankings.novelty}
              showSecondaryMetric="ips"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los proveedores de novedad' : 'View all novelty vendors'}
              ctaTo="/intersection/novelty"
            />

            {/* CONFIRMED — triangulation */}
            <QuadrantCard
              eyebrow={lang === 'es' ? 'Cuadrante II · Confirmado' : 'Quadrant II · Confirmed'}
              accent="var(--color-accent)"
              count={data.counts.confirmed}
              title={
                lang === 'es'
                  ? <>Ambas señales coinciden — modelo y reguladores de acuerdo.</>
                  : <>Both signals agree — model and regulators converge.</>
              }
              deck={
                lang === 'es'
                  ? <>Triangulación: <strong className="text-text-primary">{formatNumber(data.counts.confirmed)}</strong> proveedores con score alto que además aparecen en al menos un registro externo. Cuando métodos independientes convergen, la confianza en cada uno crece.</>
                  : <>Triangulation: <strong className="text-text-primary">{formatNumber(data.counts.confirmed)}</strong> vendors with high pattern-match that also appear on at least one external registry. When independent methods converge, confidence in each grows.</>
              }
              rows={data.rankings.confirmed}
              showSecondaryMetric="risk"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los confirmados' : 'View all confirmed'}
              ctaTo="/intersection/confirmed"
            />

            {/* BLIND SPOT — humility */}
            <QuadrantCard
              eyebrow={lang === 'es' ? 'Cuadrante III · Punto ciego' : 'Quadrant III · Blind spot'}
              accent="var(--color-text-muted)"
              count={data.counts.blindspot}
              title={
                lang === 'es'
                  ? <>Lo que los reguladores vieron y el modelo no.</>
                  : <>What regulators saw and the model didn't.</>
              }
              deck={
                lang === 'es'
                  ? <>Honestidad metodológica: <strong className="text-text-primary">{formatNumber(data.counts.blindspot)}</strong> proveedores con bajo score RUBLI (&lt; 25/100) que sí aparecen en un registro externo. Ordenados por valor total de contratos — los puntos ciegos más grandes primero.</>
                  : <>Methodological honesty: <strong className="text-text-primary">{formatNumber(data.counts.blindspot)}</strong> vendors with low RUBLI score (&lt; 25/100) that do appear on an external registry. Sorted by total contract value — largest blind spots first.</>
              }
              rows={data.rankings.blindspot}
              showSecondaryMetric="value"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los puntos ciegos' : 'View all blind spots'}
              ctaTo="/intersection/blindspot"
            />

            {/* Methodology footer */}
            <div className="mt-4 pt-6 border-t border-border">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'es' ? 'Metodología' : 'Methodology'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Los cuadrantes se computan sobre aria_queue (318K proveedores federales). Puntaje RUBLI = score v0.6.5 calibrado OCDE por sector (ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>). Registros externos: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (sanciones firmes del comptroller federal, 544 registros), <span className="font-mono">Corpus RUBLI</span> (1,363 casos de verdad fundamental con 911 proveedores vinculados).
                  </>
                ) : (
                  <>
                    Quadrants computed over aria_queue (318K federal vendors). RUBLI score = v0.6.5 OECD-calibrated per-sector (see <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>). External registries: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (final federal-comptroller sanctions, 544 records), <span className="font-mono">RUBLI corpus</span> (1,363 ground-truth cases covering 911 vendors).
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
