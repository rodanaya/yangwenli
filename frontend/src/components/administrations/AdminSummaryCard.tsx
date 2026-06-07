/**
 * AdminSummaryCard — the hero of /administrations.
 *
 * One commanding dossier-cover card that leads the page:
 *   ├─ Switcher rail: 5 administration tabs (surname · party · years)
 *   ├─ Body (selected admin):
 *   │    A — identity: avatar, serif full name, party badge, political context
 *   │    B — procurement fingerprint: 6 stats with deltas vs 24-yr average
 *   │    C — verdict: grade card + high-risk term sparkline + expediente link
 *   └─ Footer strip: data caveats (Fox Structure-A DA, Sheinbaum partial term)
 *
 * Replaces the old sledgehammer hero + selector-card grid + StatCards row +
 * AdminDossierPanel header (2026-06-07 reorganization — "the dossier IS the
 * page": pick a sexenio first, everything below answers to that choice).
 */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { formatCompactMXN, formatDualCurrency, formatNumber } from '@/lib/utils'
import { RISK_COLORS, RISK_TEXT_COLORS } from '@/lib/constants'
import { PresidentAvatar } from './PresidentAvatar'
import { ProcurementGradeCard } from './ProcurementGradeCard'
import { DeltaBadge } from './DeltaBadge'
import { ADMINISTRATIONS, DOSSIER_DATA, PARTY_COLORS, SEVERITY_COLORS } from './data'
import { getAdminVerdict } from './verdict'
import type { AdminAgg, AdminName } from './types'

export interface AdminSummaryCardProps {
  aggs: AdminAgg[]
  selected: AdminName
  onSelect: (name: AdminName) => void
  allTimeAvg: { da: number; sb: number; hr: number; risk: number }
  displayNames: Record<string, string>
  isEs: boolean
  /** Per-era extras for the verdict lede (FALCO passes from the page). */
  eraExtras?: { gtCaseCount?: number; decSpikePct?: number }
  /**
   * When true the card drops its own border/shadow chrome — the parent
   * EXPEDIENTE folder provides the module boundary (M7c cohesion refactor).
   */
  embedded?: boolean
}

/** Tiny inline sparkline — high-risk % across the term's years. */
function TermSparkline({
  years,
  color,
  isEs,
  referencePct,
}: {
  years: Array<{ year: number; high_risk_pct: number }>
  color: string
  isEs: boolean
  /** National-average HR% — dashed reference hrule when within scale. */
  referencePct?: number
}) {
  if (years.length === 0) return null
  const W = 220
  const H = 54
  const PAD = 6
  const max = Math.max(...years.map((y) => y.high_risk_pct), 1) * 1.15
  const x = (i: number) =>
    years.length === 1 ? W / 2 : PAD + (i / (years.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2)
  const lastYear = years[years.length - 1]
  // End-value label y; nudged up to clear the dot. Guard against clipping the top.
  const endValY = Math.max(y(lastYear.high_risk_pct) - 8, 9)
  // End-year label collides with the value if both anchor right at the last point;
  // drop the year a little when the value sits high.
  const endYearY = y(lastYear.high_risk_pct) - 6
  const labelsClose = Math.abs(endValY - endYearY) < 9
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] font-mono text-text-muted mb-1">
        {isEs ? 'Alto riesgo % por año' : 'High-risk % by year'}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={isEs ? 'Tendencia de alto riesgo durante el sexenio' : 'High-risk trend across the term'}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth={1} />
        {referencePct != null && referencePct < max && (
          <line
            x1={PAD}
            y1={y(referencePct)}
            x2={W - PAD}
            y2={y(referencePct)}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        )}
        {years.length > 1 && (
          <polyline
            points={years.map((yr, i) => `${x(i)},${y(yr.high_risk_pct)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {years.map((yr, i) => (
          <circle key={yr.year} cx={x(i)} cy={y(yr.high_risk_pct)} r={2.4} fill={color} />
        ))}
        <text x={PAD} y={H - PAD + 1} dy={-((H - PAD) - y(years[0].high_risk_pct)) - 6} fill="var(--color-text-muted)" fontSize={9} fontFamily="monospace">
          {years[0].year}
        </text>
        {years.length > 1 && (
          <text
            x={W - PAD}
            y={labelsClose ? endYearY + 9 : endYearY}
            fill="var(--color-text-muted)"
            fontSize={9}
            fontFamily="monospace"
            textAnchor="end"
          >
            {lastYear.year}
          </text>
        )}
        {/* End-of-term value label — admin color, mono, anchored right of final dot. */}
        <text
          x={W - PAD}
          y={endValY}
          fill={color}
          fontSize={9}
          fontFamily="monospace"
          fontWeight={600}
          textAnchor="end"
        >
          {lastYear.high_risk_pct.toFixed(1)}%
        </text>
      </svg>
    </div>
  )
}

export function AdminSummaryCard({
  aggs,
  selected,
  onSelect,
  allTimeAvg,
  displayNames,
  isEs,
  eraExtras,
  embedded,
}: AdminSummaryCardProps) {
  const { t } = useTranslation('administrations')
  const meta = ADMINISTRATIONS.find((a) => a.name === selected) ?? ADMINISTRATIONS[0]
  const agg = aggs.find((a) => a.name === selected)
  const dossier = DOSSIER_DATA[selected]
  const partyColor = PARTY_COLORS[meta.party] || '#64748b'
  const isFoxEra = selected === 'Fox'
  const isPartialTerm = selected === 'Sheinbaum'

  const hrColor =
    agg && agg.highRiskPct > 12
      ? RISK_COLORS.critical
      : agg && agg.highRiskPct > 7
        ? RISK_COLORS.high
        : 'var(--color-text-secondary)'

  const verdictSegments = getAdminVerdict({
    adminName: selected,
    agg,
    allAggs: aggs,
    allTimeAvg,
    extras: eraExtras,
    isEs,
  })

  return (
    <section
      aria-label={isEs ? 'Resumen de la administración seleccionada' : 'Selected administration summary'}
      className={
        embedded
          ? 'overflow-hidden' // folder provides border + spine + shadow
          : 'rounded-sm border border-border/50 bg-background-card overflow-hidden'
      }
      style={
        embedded
          ? undefined
          : {
              borderLeftWidth: 4,
              borderLeftColor: partyColor,
              boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
            }
      }
    >
      {/* ── Switcher rail ── */}
      <div
        role="tablist"
        aria-label={isEs ? 'Seleccionar administración' : 'Select administration'}
        className="grid grid-cols-5 border-b border-border/40 bg-background-elevated/30"
      >
        {ADMINISTRATIONS.map((admin) => {
          const isActive = admin.name === selected
          const tabParty = PARTY_COLORS[admin.party] || '#64748b'
          const tabHr = aggs.find((a) => a.name === admin.name)?.highRiskPct
          const tabHrColor =
            tabHr == null
              ? 'var(--color-text-muted)'
              : tabHr > 12
                ? RISK_TEXT_COLORS.critical
                : tabHr > 7
                  ? RISK_TEXT_COLORS.high
                  : 'var(--color-text-muted)'
          return (
            <button
              key={admin.name}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(admin.name)}
              className={
                'relative px-2 py-2 text-center transition-colors min-w-0 ' +
                (isActive ? 'bg-background-card' : 'hover:bg-background-card/60')
              }
              style={{ borderBottom: isActive ? `3px solid ${tabParty}` : '3px solid transparent' }}
            >
              <span
                style={{ fontFamily: 'var(--font-family-serif)' }}
                className={
                  'block text-xs sm:text-sm leading-tight truncate ' +
                  (isActive ? 'font-bold text-text-primary' : 'font-medium text-text-muted')
                }
              >
                {displayNames[admin.name] ?? admin.name}
              </span>
              <span className="block text-[8.5px] sm:text-[9px] font-mono text-text-muted mt-0.5 truncate">
                {admin.party} · {admin.dataStart}–{String(Math.min(admin.end, 2025)).slice(2)}
              </span>
              {aggs.length > 0 && tabHr != null && (
                <span
                  className="hidden sm:block text-[9px] font-mono tabular-nums mt-0.5"
                  style={{ color: tabHrColor }}
                  title={isEs ? 'Alto riesgo' : 'High risk'}
                >
                  {isEs ? 'AR' : 'HR'} {tabHr.toFixed(1)}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Body — animated on switch ── */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="p-5 grid grid-cols-1 lg:grid-cols-[1.15fr_1.5fr_0.95fr] gap-6"
      >
        {/* A — Identity + political context */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <PresidentAvatar
              wikiArticle={meta.wikiArticle}
              fullName={meta.fullName}
              color={meta.color}
              size={56}
            />
            <div className="min-w-0">
              <h2
                style={{ fontFamily: 'var(--font-family-serif)' }}
                className="text-xl sm:text-2xl font-bold text-text-primary leading-tight"
              >
                {meta.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${partyColor}20`,
                    color: partyColor,
                    border: `1px solid ${partyColor}40`,
                  }}
                >
                  {meta.party}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {meta.dataStart}–{Math.min(meta.end, 2025)}
                </span>
              </div>
            </div>
          </div>
          {/* A1 — rule-generated verdict lede (the voice; context demoted below). */}
          {verdictSegments.length > 0 && (
            <p
              style={{ fontFamily: 'var(--font-family-serif)' }}
              className="text-[15px] leading-relaxed text-text-primary mb-2.5 line-clamp-4"
              title={verdictSegments.map((s) => s.text).join('')}
            >
              {verdictSegments.map((s, i) =>
                s.accent ? (
                  <span key={i} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    {s.text}
                  </span>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          )}
          <p
            style={{ fontFamily: 'var(--font-family-serif)' }}
            className="text-[13px] text-text-secondary leading-relaxed"
          >
            {t(`dossier.contexts.${dossier.contextKey}`)}
          </p>
        </div>

        {/* B — Procurement fingerprint */}
        <div className="min-w-0">
          <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-3">
            {t('dossier.procurementFingerprint')}
          </div>
          {agg ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {t('statCards.contracts')}
                </div>
                <div className="font-mono text-xl tabular-nums font-semibold text-text-primary">
                  {formatNumber(agg.contracts)}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {t('statCards.totalValue')}
                </div>
                <div className="font-mono text-lg leading-snug tabular-nums font-semibold text-text-primary">
                  {formatDualCurrency(agg.totalValue)}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {isEs ? 'MXN en riesgo' : 'MXN at risk'}
                </div>
                <div className="font-mono text-xl tabular-nums font-semibold text-text-primary">
                  {formatCompactMXN(agg.valueAtRisk)}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {t('statCards.directAward')}
                </div>
                <div className="font-mono text-xl tabular-nums font-semibold text-text-primary">
                  {agg.directAwardPct.toFixed(1)}%{isFoxEra ? '*' : ''}
                </div>
                <DeltaBadge val={agg.directAwardPct - allTimeAvg.da} unit=" pts" />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {t('statCards.singleBid')}
                </div>
                <div className="font-mono text-xl tabular-nums font-semibold text-text-primary">
                  {agg.singleBidPct.toFixed(1)}%
                </div>
                <DeltaBadge val={agg.singleBidPct - allTimeAvg.sb} unit=" pts" />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-text-muted mb-0.5">
                  {t('statCards.highRisk')}
                </div>
                <div className="font-mono text-xl tabular-nums font-bold" style={{ color: hrColor }}>
                  {agg.highRiskPct.toFixed(1)}%
                </div>
                <DeltaBadge val={agg.highRiskPct - allTimeAvg.hr} unit=" pts" />
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">{t('noData')}</p>
          )}
          <p className="mt-3 text-[10px] font-mono text-text-muted/70">
            {isEs ? 'Deltas vs. promedio 2002–2025' : 'Deltas vs. 2002–2025 average'}
          </p>
        </div>

        {/* C — Verdict: grade + sparkline + expediente link */}
        <div className="min-w-0 space-y-4">
          {agg && <ProcurementGradeCard agg={agg} />}
          {agg && (
            <TermSparkline
              years={agg.years.map((y) => ({ year: y.year, high_risk_pct: y.high_risk_pct }))}
              color={meta.color}
              isEs={isEs}
              referencePct={allTimeAvg.hr}
            />
          )}
          {dossier.scandals.length > 0 ? (
            <a
              href="#expediente"
              className="flex items-center gap-2 text-[11px] font-mono text-text-secondary hover:text-accent transition-colors"
            >
              <span className="flex items-center gap-1" aria-hidden="true">
                {dossier.scandals.slice(0, 5).map((s) => (
                  <span
                    key={s.key}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[s.severity] }}
                  />
                ))}
              </span>
              <span>
                {dossier.scandals.length}{' '}
                {isEs
                  ? `escándalo${dossier.scandals.length === 1 ? '' : 's'} documentado${dossier.scandals.length === 1 ? '' : 's'} · ver expediente ↓`
                  : `documented scandal${dossier.scandals.length === 1 ? '' : 's'} · view case file ↓`}
              </span>
            </a>
          ) : (
            <p className="text-[11px] font-mono text-text-muted italic">
              {t('dossier.noScandals')}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Caveat footer strip ── */}
      {(isFoxEra || isPartialTerm) && (
        <div className="px-5 py-2.5 border-t border-border/30 bg-background-elevated/20 flex items-start gap-2">
          <AlertTriangle className="h-3 w-3 text-text-muted mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-[10px] text-text-muted leading-relaxed">
            {isFoxEra &&
              (isEs
                ? '* Estructura A (2002–2010): la adjudicación directa se registró de forma incompleta — el riesgo está subestimado.'
                : '* Structure A (2002–2010): direct award was recorded incompletely — risk is underestimated.')}
            {isPartialTerm && t('incompleteDatasetDescription')}
          </p>
        </div>
      )}
    </section>
  )
}

export default AdminSummaryCard
