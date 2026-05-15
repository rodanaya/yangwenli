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

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, type IntersectionVendor, type IntersectionSummary } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS, CURRENT_MODEL_VERSION, GROUND_TRUTH_CASE_COUNT_FALLBACK, GROUND_TRUTH_VENDOR_COUNT_FALLBACK, getSectorName } from '@/lib/constants'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PlateFrame } from '@/components/atlas/PlateFrame'

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
      ? `IPS ${(v.ips_final * 100).toFixed(1)}`
      : showSecondaryMetric === 'risk'
        ? `${(v.avg_risk_score * 100).toFixed(0)}/100`
        : formatCompactMXN(v.total_value_mxn)
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" />
          <RegistryBadges v={v} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-text-muted">
          {v.primary_sector_name && (
            // F150/F257 fix: localize sector label so EN UI doesn't
            // show Spanish ("ENERGIA" → "ENERGY" on EN).
            <span className="uppercase tracking-wider">
              {getSectorName(v.primary_sector_name.toLowerCase(), lang === 'es' ? 'es' : 'en')}
            </span>
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
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
    </div>
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

// ─── Quadrant scatter plot ────────────────────────────────────────────────────
// FT/Economist-style 2×2 battlespace matrix. X = RUBLI risk (0–1),
// Y = external registry hits (EFOS + SFP + GT, 0–3). Dot size = √contracts.
// Color encodes the quadrant the vendor falls into. Deterministic jitter
// breaks up the (0-flag, low-risk) "clean" stack at the bottom.

function QuadrantScatterPlot({
  data,
  lang,
}: {
  data: IntersectionSummary
  lang: string
}) {
  const allVendors = useMemo(() => {
    const novelty = data.rankings.novelty.map((v) => ({ ...v, quadrant: 'novelty' as const }))
    const confirmed = data.rankings.confirmed.map((v) => ({ ...v, quadrant: 'confirmed' as const }))
    const blindspot = data.rankings.blindspot.map((v) => ({ ...v, quadrant: 'blindspot' as const }))
    return [...novelty, ...confirmed, ...blindspot]
  }, [data])

  const W = 580
  const H = 320
  const PAD = { top: 20, right: 20, bottom: 32, left: 36 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const toX = (score: number) => PAD.left + Math.max(0, Math.min(1, score)) * plotW
  const toY = (flags: number, jitter = 0) =>
    PAD.top + (1 - Math.max(0, Math.min(3, flags)) / 3) * plotH + jitter

  // Quadrant accent colors (no raw-hex risk palette — these are the
  // canonical sector/risk tokens reused for the scatter dots).
  const COLORS: Record<'novelty' | 'confirmed' | 'blindspot', string> = {
    novelty: '#dc2626', // critical
    confirmed: '#a06820', // dashboard amber
    blindspot: '#64748b', // muted
  }

  // Dividers at 40% (rubli_flags) and at 1.0/3 of Y (any external hit)
  const flagsDividerX = PAD.left + (data.thresholds.rubli_flags ?? 0.4) * plotW
  const flagsDividerY = PAD.top + (1 - 0.5 / 3) * plotH // halfway between 0 and 1 flag

  return (
    <div className="relative rounded-sm border border-border bg-background-card overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          {lang === 'es'
            ? 'Mapa de cuadrantes · modelo vs. registros externos'
            : 'Quadrant map · model vs. external registries'}
        </p>
        <p className="text-[10px] font-mono text-text-muted tabular-nums">
          {formatNumber(allVendors.length)} {lang === 'es' ? 'proveedores trazados' : 'vendors plotted'}
        </p>
      </div>
      <div className="p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-hidden="true"
        >
          {/* Plot frame */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="0.5"
            opacity="0.6"
          />

          {/* Quadrant divider lines */}
          <line
            x1={flagsDividerX}
            y1={PAD.top}
            x2={flagsDividerX}
            y2={PAD.top + plotH}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1={PAD.left}
            y1={flagsDividerY}
            x2={PAD.left + plotW}
            y2={flagsDividerY}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Quadrant labels — placed in each corner */}
          <text
            x={PAD.left + plotW * 0.22}
            y={PAD.top + 16}
            textAnchor="middle"
            fill={COLORS.blindspot}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.12em"
          >
            {lang === 'es' ? 'PUNTO CIEGO' : 'BLIND SPOT'}
          </text>
          <text
            x={PAD.left + plotW * 0.78}
            y={PAD.top + 16}
            textAnchor="middle"
            fill={COLORS.confirmed}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.12em"
          >
            {lang === 'es' ? 'CONFIRMADO' : 'CONFIRMED'}
          </text>
          <text
            x={PAD.left + plotW * 0.78}
            y={PAD.top + plotH - 8}
            textAnchor="middle"
            fill={COLORS.novelty}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.12em"
          >
            {lang === 'es' ? 'NOVEDAD' : 'NOVELTY'}
          </text>
          <text
            x={PAD.left + plotW * 0.22}
            y={PAD.top + plotH - 8}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="400"
            letterSpacing="0.12em"
            opacity="0.5"
          >
            {lang === 'es' ? 'LIMPIO' : 'CLEAN'}
          </text>

          {/* Dots — drawn after labels so they sit on top */}
          {allVendors.map((v, i) => {
            const flags =
              (v.is_efos_definitivo ? 1 : 0) +
              (v.is_sfp_sanctioned ? 1 : 0) +
              (v.in_ground_truth ? 1 : 0)
            // Deterministic pseudo-random jitter to break up integer-flag stacking
            const jitterY = (((i * 7919) % 21) - 10) * 0.7
            const jitterX = (((i * 5237) % 17) - 8) * 0.4
            const r = Math.min(12, Math.max(3, Math.sqrt(v.total_contracts) * 0.4))
            const cx = toX(v.avg_risk_score) + jitterX
            const cy = toY(flags, jitterY)
            const color = COLORS[v.quadrant]
            return (
              <circle
                key={v.vendor_id}
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                fillOpacity={0.55}
                stroke={color}
                strokeWidth="0.5"
                strokeOpacity={0.85}
              />
            )
          })}

          {/* Axis labels */}
          <text
            x={PAD.left + plotW / 2}
            y={H - 6}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.12em"
          >
            {lang === 'es' ? '← RIESGO RUBLI →' : '← RUBLI RISK SCORE →'}
          </text>
          <text
            x={12}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.12em"
            transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}
          >
            {lang === 'es' ? 'REGISTROS EXT. ↑' : 'REGISTRY FLAGS ↑'}
          </text>
        </svg>
      </div>
      <div className="px-5 py-2.5 border-t border-border flex items-center gap-4 flex-wrap">
        {[
          { q: 'novelty', label: lang === 'es' ? 'Novedad' : 'Novelty', color: '#dc2626' },
          { q: 'confirmed', label: lang === 'es' ? 'Confirmado' : 'Confirmed', color: '#a06820' },
          { q: 'blindspot', label: lang === 'es' ? 'Punto ciego' : 'Blind spot', color: '#64748b' },
        ].map(({ q, label, color }) => (
          <div key={q} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-text-muted">{label}</span>
          </div>
        ))}
        <span className="text-[10px] font-mono text-text-muted ml-auto">
          {lang === 'es' ? 'Tamaño = volumen de contratos' : 'Size = contract volume'}
        </span>
      </div>
    </div>
  )
}

export default function Intersection() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['intersection', 'summary', 50],
    queryFn: () => intersectionApi.getSummary(50),
    staleTime: 10 * 60 * 1000,
  })

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page paper-grain — scoped to this contemplative pitch surface.
          Pattern from rubli-folio-aesthetic § "Atmosphere — paper-grain
          overlay". */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="intersection-page-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#intersection-page-paper-grain)" />
      </svg>
      <div className="relative" style={{ zIndex: 1 }}>
      {/* Folio·XIII hero — replaces the prior utility header. EB Garamond
          italic 500 + ochre fragment per rubli-folio-aesthetic. The page
          IS a dumbbell-style comparison (model vs regulators), so the
          named precedent for the framing is FT Visual Vocabulary
          dumbbell, cited in plan docs/FOLIO_V1_PHASE4_2026_05_07.md § 3. */}
      <header className="mb-8 pb-5 border-b border-border">
        <div
          className="flex items-center gap-3 mb-3"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 400,
          }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
            <span style={{ color: '#a06820', fontWeight: 500 }}>Folio·XIII</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>
              {lang === 'es' ? 'Superficie de investigación · Vista completa de cuadrantes' : 'Investigation Surface · Full quadrant view'}
            </span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(28px, 4vw, 48px)',
                lineHeight: 1.04,
                letterSpacing: '-0.012em',
                color: 'var(--color-text-primary)',
              }}
            >
              {lang === 'es' ? (
                <>
                  El modelo señala lo que{' '}
                  <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                    los reguladores todavía no.
                  </span>
                </>
              ) : (
                <>
                  The model flags what{' '}
                  <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                    regulators don't yet.
                  </span>
                </>
              )}
            </h1>
            <p
              className="mt-4"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: '17px',
                lineHeight: 1.55,
                maxWidth: '68ch',
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.005em',
              }}
            >
              {data
                ? lang === 'es'
                  ? <>Dataset completo: <strong style={{ color: 'var(--color-text-primary)' }}>{formatNumber(data.counts.novelty + data.counts.confirmed + data.counts.blindspot)}</strong> proveedores en tres cuadrantes de investigación. Filtra por sector para enfocar tu investigación.</>
                  : <>Full dataset: <strong style={{ color: 'var(--color-text-primary)' }}>{formatNumber(data.counts.novelty + data.counts.confirmed + data.counts.blindspot)}</strong> vendors across three investigation quadrants. Filter by sector to focus your investigation.</>
                : lang === 'es'
                  ? 'Tres cuadrantes triangulan dos métodos independientes: el patrón cuantitativo del modelo y el registro oficial de los reguladores.'
                  : "Three quadrants triangulate two independent methods: the model's quantitative pattern and the regulators' official register."}
            </p>
          </div>
          {!isLoading && data && (
            <div className="flex items-baseline gap-5 flex-shrink-0">
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

            {/* Sector filter chips */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label={lang === 'es' ? 'Filtrar por sector' : 'Filter by sector'}
              style={{ scrollbarWidth: 'none' }}
            >
              <button
                onClick={() => setSelectedSector(null)}
                className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                style={{
                  border: `1px solid ${selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-border)'}`,
                  color: selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  background: selectedSector === null ? 'var(--color-background-elevated)' : 'transparent',
                  fontWeight: selectedSector === null ? 700 : 400,
                }}
                aria-pressed={selectedSector === null}
              >
                {lang === 'es' ? 'Todos' : 'All'}
              </button>
              {SECTORS.map((s) => {
                const active = selectedSector === s.code
                return (
                  <button
                    key={s.code}
                    onClick={() => setSelectedSector(active ? null : s.code)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                    style={{
                      border: `1px solid ${active ? s.color : `${s.color}44`}`,
                      color: active ? s.color : 'var(--color-text-muted)',
                      background: active ? `${s.color}12` : 'transparent',
                      fontWeight: active ? 700 : 400,
                    }}
                    aria-pressed={active}
                  >
                    {getSectorName(s.code, lang === 'es' ? 'es' : 'en')}
                  </button>
                )
              })}
            </div>

            <PlateFrame
              lang={lang}
              folio="XIII"
              contextLabel={{ en: 'Intersection atlas', es: 'Atlas de la intersección' }}
              caption={
                lang === 'es'
                  ? 'Lámina — Tres cuadrantes RUBLI × reguladores. Novedad: alto riesgo del modelo, sin marca externa. Confirmado: ambos métodos coinciden. Punto ciego: el modelo no detecta lo que el regulador sí registró.'
                  : 'Plate — Three RUBLI × regulator quadrants. Novelty: high model risk, no external mark. Confirmed: methods agree. Blind spot: model misses what the regulator registered.'
              }
            >
              <QuadrantScatterPlot data={data} lang={lang} />
              <div className="space-y-6">
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
              rows={selectedSector ? data.rankings.novelty.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.novelty}
              showSecondaryMetric="ips"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los proveedores de novedad' : 'View all novelty vendors'}
              ctaTo="/aria"
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
              rows={selectedSector ? data.rankings.confirmed.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.confirmed}
              showSecondaryMetric="risk"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los confirmados' : 'View all confirmed'}
              ctaTo="/aria"
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
              rows={selectedSector ? data.rankings.blindspot.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.blindspot}
              showSecondaryMetric="value"
              lang={lang}
              ctaLabel={lang === 'es' ? 'Ver todos los puntos ciegos' : 'View all blind spots'}
              ctaTo="/aria"
            />
              </div>
            </PlateFrame>

            {/* Methodology footer */}
            <div className="mt-4 pt-6 border-t border-border">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'es' ? 'Metodología' : 'Methodology'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Los cuadrantes se computan sobre aria_queue (318K proveedores federales). Puntaje RUBLI = score {CURRENT_MODEL_VERSION} calibrado OCDE por sector (ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>). Registros externos: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (sanciones firmes del comptroller federal, 544 registros), <span className="font-mono">Corpus RUBLI</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString('es-MX')} casos de verdad fundamental con {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} proveedores vinculados).
                  </>
                ) : (
                  <>
                    Quadrants computed over aria_queue (318K federal vendors). RUBLI score = {CURRENT_MODEL_VERSION} OECD-calibrated per-sector (see <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>). External registries: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (final federal-comptroller sanctions, 544 records), <span className="font-mono">RUBLI corpus</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString()} ground-truth cases covering {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} vendors).
                  </>
                )}
              </p>
              <p className="mt-3 text-[11px] font-mono text-text-muted">
                {lang === 'es'
                  ? <>Para acceso al dataset completo, consulta la <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología RUBLI</Link>. Datos: contratos federales COMPRANET 2002–2025.</>
                  : <>For full dataset access, see the <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">RUBLI methodology</Link>. Data: COMPRANET federal contracts 2002–2025.</>}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
