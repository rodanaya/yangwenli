/**
 * CaptureRegister — § LA PELÍCULA · Lámina XIV·a
 *
 * The 13 monotonic captures as an FT-dumbbell register on one shared 0–100%
 * axis: origin dot (earliest share) → value-sized peak dot → vigencia mark
 * (holds vs receded, from the payload's latest_share_pct — rendered for the
 * first time). Rows expand in place into a ProPublica-style docket: the
 * year-by-year money ledger (timeline[].value_mxn), a lazy ARIA cross-light,
 * and the institution's place in the full field.
 *
 * Action surface → no PlateFrame (canon decision tree); the caution sentence
 * survives as the standfirst (box died, words didn't).
 */

import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ariaApi,
  institutionApi,
  type CaptureItem,
  type CaptureTopResponse,
  type CaptureLandscapeResponse,
} from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { Skeleton } from '@/components/ui/skeleton'
import { AxisTicks, ThresholdRules } from './captureAxis'

type SortKey = 'fuerza' | 'pico' | 'valor' | 'vigencia'
const SORT_KEYS: SortKey[] = ['fuerza', 'pico', 'valor', 'vigencia']

const SORT_LABEL: Record<SortKey, { es: string; en: string }> = {
  fuerza: { es: 'Fuerza', en: 'Strength' },
  pico: { es: 'Pico', en: 'Peak' },
  valor: { es: 'Valor', en: 'Value' },
  vigencia: { es: 'Vigencia', en: 'Persistence' },
}

const RISK_WORD: Record<string, { es: string; en: string }> = {
  critical: { es: 'crítico', en: 'critical' },
  high: { es: 'alto', en: 'high' },
  medium: { es: 'medio', en: 'medium' },
  low: { es: 'bajo', en: 'low' },
}

interface Props {
  data: CaptureItem[]
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
  lang: 'en' | 'es'
}

export function CaptureRegister({ data, thresholds, landscape, lang }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = (SORT_KEYS as string[]).includes(searchParams.get('sort') ?? '')
    ? (searchParams.get('sort') as SortKey)
    : 'fuerza'
  const openKey = searchParams.get('abrir')

  const maxCum = useMemo(
    () => Math.max(1, ...data.map((c) => c.cumulative_value_mxn)),
    [data],
  )

  const sorted = useMemo(() => {
    const rows = [...data]
    const ceil = thresholds.ceil_share_pct
    if (sort === 'pico') rows.sort((a, b) => b.peak_share_pct - a.peak_share_pct)
    else if (sort === 'valor') rows.sort((a, b) => b.cumulative_value_mxn - a.cumulative_value_mxn)
    else if (sort === 'vigencia')
      rows.sort((a, b) => {
        const ah = a.latest_share_pct >= ceil ? 1 : 0
        const bh = b.latest_share_pct >= ceil ? 1 : 0
        return bh - ah || b.latest_share_pct - a.latest_share_pct
      })
    return rows // 'fuerza' = server score order
  }, [data, sort, thresholds.ceil_share_pct])

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  return (
    <section id="la-pelicula" aria-labelledby="pelicula-heading">
      <p
        id="pelicula-heading"
        className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2"
      >
        {lang === 'en'
          ? '§ THE FILM · PLATE XIV·a — THIRTEEN MONOTONIC CLIMBS'
          : '§ LA PELÍCULA · LÁMINA XIV·a — TRECE ASCENSOS MONÓTONOS'}
      </p>
      {/* Standfirst — the legal-honesty sentence, demoted from box to prose */}
      <p
        className="mb-5"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'en'
          ? 'Institutional capture is not proof of wrongdoing. Some legitimate concentrations emerge from technical certification, regional exclusivity, or single-source regulatory dependency. Each line of the register warrants investigation — not accusation.'
          : 'La captura institucional no es prueba de irregularidad. Algunas concentraciones legítimas emergen de certificación técnica, exclusividad regional, o dependencia regulatoria de proveedor único. Cada línea del registro merece investigación — no acusación.'}
      </p>

      {/* Sort control */}
      <div className="flex items-center gap-3 mb-3 overflow-x-auto">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted flex-shrink-0">
          {lang === 'en' ? 'Order' : 'Ordenar'}
        </span>
        {SORT_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setParam('sort', k === 'fuerza' ? null : k)}
            aria-pressed={sort === k}
            className={`flex-shrink-0 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              sort === k
                ? 'underline underline-offset-4'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            style={sort === k ? { color: 'var(--color-accent)' } : undefined}
          >
            {SORT_LABEL[k][lang]}
          </button>
        ))}
      </div>

      {/* Shared axis header (desktop aligns with the track column) */}
      <div className="hidden md:grid grid-cols-[28px_300px_1fr] gap-x-4 px-1">
        <div />
        <div />
        <div className="relative h-9">
          <AxisTicks className="absolute inset-x-0 top-0" />
          <ThresholdRules
            floor={thresholds.floor_share_pct}
            ceil={thresholds.ceil_share_pct}
            lang={lang}
            labeled
            labelAt="bottom"
          />
        </div>
      </div>
      {/* Mobile axis */}
      <div className="md:hidden relative h-6 px-1">
        <AxisTicks className="absolute inset-x-0 top-0" />
      </div>

      <div className="rounded-sm border border-border bg-background-card overflow-hidden">
        {sorted.map((c, i) => (
          <RegisterRow
            key={`${c.institution_id}-${c.vendor_id}`}
            c={c}
            rank={i + 1}
            lang={lang}
            thresholds={thresholds}
            landscape={landscape}
            maxCum={maxCum}
            expanded={openKey === `${c.institution_id}-${c.vendor_id}`}
            onToggle={() =>
              setParam(
                'abrir',
                openKey === `${c.institution_id}-${c.vendor_id}`
                  ? null
                  : `${c.institution_id}-${c.vendor_id}`,
              )
            }
          />
        ))}
      </div>
    </section>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function RegisterRow({
  c,
  rank,
  lang,
  thresholds,
  landscape,
  maxCum,
  expanded,
  onToggle,
}: {
  c: CaptureItem
  rank: number
  lang: 'en' | 'es'
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
  maxCum: number
  expanded: boolean
  onToggle: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const sector = SECTORS.find((s) => s.id === c.institution_sector_id)
  const sectorColor = sector ? SECTOR_COLORS[sector.code] : '#64748b'
  const ceil = thresholds.ceil_share_pct
  const holds = c.latest_share_pct >= ceil
  const delta = c.peak_share_pct - c.earliest_share_pct
  // r = 4 + 5·√(v/max): dot SCALES with captured value (not strictly ∝ — the
  // +4 floor keeps small captures visible)
  const peakD = 2 * (4 + 5 * Math.sqrt(c.cumulative_value_mxn / maxCum))

  useEffect(() => {
    if (expanded && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return // inner chips keep their own navigation
    onToggle()
  }

  // sr-only sentence — the old prose template survives as the accessible name
  const srSentence =
    lang === 'en'
      ? `From ${c.earliest_share_pct}% in ${c.earliest_year} to ${c.peak_share_pct}% in ${c.peak_year} — +${delta.toFixed(1)} points over ${c.years_observed} years. Value captured: ${formatCompactMXN(c.cumulative_value_mxn)}. Today ${holds ? 'holds' : 'fell to'} ${c.latest_share_pct}%.`
      : `De ${c.earliest_share_pct}% en ${c.earliest_year} a ${c.peak_share_pct}% en ${c.peak_year} — +${delta.toFixed(1)} puntos en ${c.years_observed} años. Valor capturado: ${formatCompactMXN(c.cumulative_value_mxn)}. Hoy ${holds ? 'sostiene' : 'cayó a'} ${c.latest_share_pct}%.`

  return (
    <article ref={rowRef} className="border-b border-border last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(e)
          }
        }}
        className="grid grid-cols-1 md:grid-cols-[28px_300px_1fr] gap-x-4 gap-y-2 px-4 py-4 cursor-pointer hover:bg-background-elevated transition-colors focus:outline-none focus:ring-1 focus:ring-text-muted focus:ring-inset"
        style={{ borderLeft: `4px solid ${sectorColor}` }}
        aria-label={srSentence}
      >
        <span className="hidden md:block font-mono text-[11px] font-bold text-text-muted tabular-nums pt-1">
          {String(rank).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <div className="flex md:hidden items-baseline gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-text-muted tabular-nums">
              {String(rank).padStart(2, '0')}
            </span>
          </div>
          <EntityIdentityChip
            type="vendor"
            id={c.vendor_id}
            name={c.vendor_name}
            size="sm"
            className="max-w-full"
          />
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
              {lang === 'en' ? 'captured' : 'capturó'}
            </span>
            <EntityIdentityChip
              type="institution"
              id={c.institution_id}
              name={c.institution_name}
              size="sm"
              className="min-w-0"
            />
          </div>
        </div>
        {/* Track — shared 0–100% axis */}
        <div className="relative h-11 self-center" aria-hidden="true">
          <ThresholdRules
            floor={thresholds.floor_share_pct}
            ceil={thresholds.ceil_share_pct}
            lang={lang}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          {/* climb bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full"
            style={{
              left: `${c.earliest_share_pct}%`,
              width: `${Math.max(0, c.peak_share_pct - c.earliest_share_pct)}%`,
              background: 'var(--color-risk-critical)',
              opacity: 0.75,
            }}
          />
          {/* retreat line (receded only) */}
          {!holds && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-px"
              style={{
                left: `${Math.min(c.latest_share_pct, c.peak_share_pct)}%`,
                width: `${Math.abs(c.peak_share_pct - c.latest_share_pct)}%`,
                backgroundImage:
                  'repeating-linear-gradient(to right, #71717a 0 3px, transparent 3px 6px)',
              }}
            />
          )}
          {/* origin dot */}
          <span
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
            style={{
              left: `${c.earliest_share_pct}%`,
              width: 8,
              height: 8,
              background: '#71717a',
            }}
          />
          {/* peak dot — scales with captured MXN */}
          <span
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
            style={{
              left: `${c.peak_share_pct}%`,
              width: peakD,
              height: peakD,
              background: 'var(--color-risk-critical)',
              boxShadow: '0 0 0 1px var(--color-background-card)',
            }}
          />
          {/* vigencia mark */}
          {holds ? (
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `${c.latest_share_pct}%`,
                width: 6,
                height: 6,
                background: 'var(--color-text-primary)',
              }}
            />
          ) : (
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
              style={{
                left: `${c.latest_share_pct}%`,
                width: 7,
                height: 7,
                border: '1.5px solid #71717a',
                background: 'var(--color-background-card)',
              }}
            />
          )}
        </div>
        {/* Agate line */}
        <div className="md:col-start-2 md:col-span-2 flex items-center gap-3 flex-wrap font-mono text-[10px] tracking-wider uppercase text-text-muted tabular-nums">
          <span>
            {c.earliest_year}–{c.peak_year}
          </span>
          <span>·</span>
          <span>+{delta.toFixed(1)} pp</span>
          <span>·</span>
          <span>
            {formatCompactMXN(c.cumulative_value_mxn)}{' '}
            {lang === 'en' ? 'of' : 'de'} {formatCompactMXN(c.institution_total_window)}
          </span>
          <span>·</span>
          <span
            style={{
              color: holds ? 'var(--color-risk-critical)' : undefined,
              fontWeight: holds ? 700 : 400,
            }}
          >
            {holds
              ? `${lang === 'en' ? 'HOLDS' : 'SOSTIENE'} ${c.latest_share_pct}%`
              : `${lang === 'en' ? 'FELL TO' : 'CAYÓ A'} ${c.latest_share_pct}%`}
          </span>
          <span
            className="ml-auto transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
            aria-hidden="true"
          >
            ▸
          </span>
        </div>
      </div>
      {expanded && (
        <RowDocket c={c} lang={lang} thresholds={thresholds} landscape={landscape} />
      )}
    </article>
  )
}

// ─── Docket — the expanded pair file ─────────────────────────────────────────

function RowDocket({
  c,
  lang,
  thresholds,
  landscape,
}: {
  c: CaptureItem
  lang: 'en' | 'es'
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
}) {
  const { data: ariaEntry, isLoading: ariaLoading } = useQuery({
    queryKey: ['aria', 'entry', c.vendor_id],
    queryFn: () => ariaApi.getAriaQueueEntry(c.vendor_id),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
  const { data: instDetail } = useQuery({
    queryKey: ['institution', 'detail', c.institution_id],
    queryFn: () => institutionApi.getById(c.institution_id),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  // Place in the field: cumulative share + percentile from the landscape
  const fieldFacts = useMemo(() => {
    if (!landscape) return null
    const idx = landscape.ticks.findIndex((t) => t[0] === c.institution_id)
    if (idx === -1) return null
    const share = landscape.ticks[idx][3]
    const below = landscape.qualifying_count - idx - 1
    const pct = Math.round((100 * below) / landscape.qualifying_count)
    return { share, pct }
  }, [landscape, c.institution_id])

  const riskLevel =
    ariaEntry != null ? getRiskLevelFromScore(ariaEntry.avg_risk_score) : null
  const flags = ariaEntry
    ? ([
        ...(ariaEntry.in_ground_truth ? ['gt'] : []),
        ...(ariaEntry.is_efos_definitivo ? ['efos'] : []),
        ...(ariaEntry.is_sfp_sanctioned ? ['sfp'] : []),
      ] as Array<'gt' | 'efos' | 'sfp'>)
    : []

  const bandTitle = 'text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted mb-2'

  return (
    <div
      role="region"
      className="px-5 py-4 bg-background-elevated grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-x-6 gap-y-5"
      style={{ borderTop: '1px solid rgba(160, 104, 32, 0.25)' }}
    >
      {/* Band A — year-by-year receipts */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ The full trajectory' : '§ La trayectoria completa'}
        </p>
        <DocketTimeline c={c} ceil={thresholds.ceil_share_pct} lang={lang} />
      </div>

      {/* Band B — model cross-light, lazy */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ Model cross-light' : '§ Contraluz del modelo'}
        </p>
        <p
          className="mb-2.5"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
          }}
        >
          {lang === 'en'
            ? 'The arithmetic leads; the model only comments.'
            : 'La aritmética manda; el modelo solo opina.'}
        </p>
        {ariaLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : ariaEntry ? (
          <div className="space-y-2">
            <EntityIdentityChip
              type="vendor"
              id={c.vendor_id}
              name={c.vendor_name}
              size="sm"
              ariaTier={ariaEntry.ips_tier}
              flags={flags}
              className="max-w-full"
            />
            {riskLevel && (
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-secondary">
                {lang === 'en' ? 'risk indicator' : 'indicador de riesgo'}:{' '}
                <span
                  style={{
                    color:
                      riskLevel === 'low'
                        ? 'var(--color-text-muted)'
                        : `var(--color-risk-${riskLevel})`,
                    fontWeight: 700,
                  }}
                >
                  {RISK_WORD[riskLevel][lang]} {ariaEntry.avg_risk_score.toFixed(2)}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="font-mono text-[10.5px] text-text-muted">
            {lang === 'en'
              ? 'No ARIA file — the arithmetic stands alone.'
              : 'Sin expediente ARIA — la aritmética habla sola.'}
          </p>
        )}
      </div>

      {/* Band C — the institution in the record */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ The institution on record' : '§ La institución en el registro'}
        </p>
        <div className="space-y-1.5 font-mono text-[10.5px] text-text-secondary tabular-nums">
          {fieldFacts && (
            <p>
              {lang === 'en'
                ? `№1 vendor holds ${fieldFacts.share}% of the record — more concentrated than ${fieldFacts.pct}% of the field`
                : `El №1 acumula ${fieldFacts.share}% del registro — más concentrada que el ${fieldFacts.pct}% del campo`}
            </p>
          )}
          {instDetail && (
            <>
              {instDetail.direct_award_rate != null && (
                <p>
                  {lang === 'en' ? 'direct award' : 'adjudicación directa'}{' '}
                  {instDetail.direct_award_rate.toFixed(1)}%
                </p>
              )}
              {instDetail.single_bid_pct != null && (
                <p>
                  {lang === 'en' ? 'single bid' : 'oferta única'}{' '}
                  {instDetail.single_bid_pct.toFixed(1)}%
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <EntityIdentityChip
            type="institution"
            id={c.institution_id}
            name={c.institution_name}
            size="sm"
          />
          <EntityIdentityChip
            type="pattern"
            id="P6"
            name={lang === 'en' ? 'Capture pattern (P6)' : 'Patrón de captura (P6)'}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Docket timeline — enlarged, calendar axis, dashed after the peak ────────

function DocketTimeline({
  c,
  ceil,
  lang,
}: {
  c: CaptureItem
  ceil: number
  lang: 'en' | 'es'
}) {
  const W = 420
  const H = 96
  const PLOT_H = 64
  const years = c.timeline.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = Math.max(1, maxYear - minYear)
  const x = (year: number) => 8 + ((year - minYear) / span) * (W - 16)
  const y = (share: number) => 6 + (1 - share / 100) * (PLOT_H - 12)
  const peakIdx = c.timeline.findIndex((p) => p.share_pct === c.peak_share_pct)
  const solid = c.timeline.slice(0, peakIdx + 1)
  const dashed = c.timeline.slice(peakIdx)
  const toPath = (pts: typeof c.timeline) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year).toFixed(1)} ${y(p.share_pct).toFixed(1)}`).join(' ')
  const maxVal = Math.max(1, ...c.timeline.map((p) => p.value_mxn))

  return (
    <div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label={
          lang === 'en'
            ? `Share of institution spend by year, ${minYear}–${maxYear}`
            : `Participación del gasto institucional por año, ${minYear}–${maxYear}`
        }
      >
        {/* 50% ceiling */}
        <line
          x1={8}
          x2={W - 8}
          y1={y(ceil)}
          y2={y(ceil)}
          stroke="var(--color-risk-critical)"
          strokeWidth="0.75"
          strokeDasharray="3 3"
          opacity="0.45"
        />
        <path
          d={toPath(solid)}
          fill="none"
          stroke="var(--color-risk-critical)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dashed.length > 1 && (
          <path
            d={toPath(dashed)}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.3"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
        )}
        {c.timeline.map((p) => (
          <circle
            key={p.year}
            cx={x(p.year)}
            cy={y(p.share_pct)}
            r={p.share_pct >= ceil ? 2.4 : 1.8}
            fill={p.share_pct >= ceil ? 'var(--color-risk-critical)' : '#71717a'}
          />
        ))}
        {c.timeline.map((p) => (
          <text
            key={`y-${p.year}`}
            x={x(p.year)}
            y={PLOT_H + 8}
            textAnchor="middle"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--color-text-muted)"
          >
            {String(p.year).slice(2)}
          </text>
        ))}
        {/* per-year value bars — the money ledger, drawn */}
        {c.timeline.map((p) => {
          const bh = 2 + 16 * (p.value_mxn / maxVal)
          return (
            <rect
              key={`v-${p.year}`}
              x={x(p.year) - 3}
              y={H - 2 - bh}
              width={6}
              height={bh}
              fill="var(--color-text-muted)"
              opacity={0.5}
            >
              <title>{`${p.year} · ${p.share_pct}% · ${formatCompactMXN(p.value_mxn)}`}</title>
            </rect>
          )
        })}
      </svg>
      <p className="font-mono text-[9.5px] text-text-muted mt-1 tabular-nums">
        {lang === 'en' ? 'peak year' : 'año pico'} {c.peak_year} ·{' '}
        {formatCompactMXN(
          c.timeline.find((p) => p.year === c.peak_year)?.value_mxn ?? 0,
        )}{' '}
        · {lang === 'en' ? 'bars = MXN per year' : 'barras = MXN por año'}
      </p>
    </div>
  )
}
