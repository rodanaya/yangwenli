/**
 * GapRecoveryPanel — "El Apagón" recovery-data supplement (Option C · 2026-06-27).
 *
 * Surfaces the post-CompraNet (Sep 2025+) awards recovered from ComprasMX across
 * the platform's analytical tabs, ALWAYS as a clearly-labeled separate data tier:
 * counts + partial OCR amounts, explicitly WITHOUT the v0.8.5 risk model (post-
 * horizon rows lack its features, so the scored corpus is never contaminated).
 * The gap data window (2025-09-28 .. 2026-06) lies entirely within the Sheinbaum
 * term, so on /administrations this only renders for that administration.
 *
 * Reads /api/v1/gap/summary (gapApi.getSummary). Renders nothing if the gap
 * staging table is unavailable (e.g. a DB build without it).
 *
 *   variant="full"    — editorial section (Sexenios, Sectors)
 *   variant="compact" — clickable callout tile (Dashboard)
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileSearch, ArrowRight } from 'lucide-react'
import { gapApi } from '@/api/client'
import { cn, formatCompactMXN } from '@/lib/utils'
import { getSectorName, SECTOR_COLORS } from '@/lib/constants'

interface GapRecoveryPanelProps {
  isEs: boolean
  variant?: 'full' | 'compact'
  className?: string
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div
        className="text-[18px] leading-none tabular-nums text-text-primary"
        style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'normal', fontWeight: 700 }}
      >
        {value}
      </div>
      <div className="text-[12px] text-text-muted font-mono mt-1 tracking-wide leading-tight">{label}</div>
    </div>
  )
}

export function GapRecoveryPanel({ isEs, variant = 'full', className }: GapRecoveryPanelProps) {
  const { data } = useQuery({
    queryKey: ['gap-summary'],
    queryFn: () => gapApi.getSummary(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  if (!data || !data.available) return null

  const locale = isEs ? 'es-MX' : 'en-US'
  const count = data.total_contracts.toLocaleString(locale)
  const value = formatCompactMXN(data.best_available_sum_mxn)
  const daPct = `${data.direct_award_pct.toFixed(0)}%`
  const tierTag = isEs
    ? 'DATOS DE RECUPERACIÓN · SIN PUNTUACIÓN DE RIESGO'
    : 'RECOVERY DATA · NO RISK SCORE'

  const stats = (
    <>
      <StatBlock value={count} label={isEs ? 'adjudicaciones recuperadas' : 'recovered awards'} />
      <StatBlock value={value} label={isEs ? 'valor recuperado · parcial' : 'recovered value · partial'} />
      <StatBlock value={daPct} label={isEs ? 'adjudicación directa' : 'direct award'} />
    </>
  )

  // ── compact callout (dashboard) ──
  if (variant === 'compact') {
    return (
      <Link
        to="/gap"
        className={cn(
          'group block rounded-sm border border-border bg-surface-2/40 p-3 transition-colors hover:bg-surface-2/70',
          className,
        )}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-text-muted">
            <FileSearch className="h-3 w-3" />
            {isEs ? 'EL APAGÓN · POST-COMPRANET' : 'THE BLACKOUT · POST-COMPRANET'}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-text-muted transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="grid grid-cols-3 gap-3">{stats}</div>
        <div className="mt-2.5 font-mono text-[8.5px] tracking-wide text-text-muted/70">{tierTag}</div>
      </Link>
    )
  }

  // ── full editorial section (sexenios / sectors) ──
  const topSectors = data.by_sector.slice(0, 6)
  const sectorMax = Math.max(1, ...topSectors.map((s) => s.count))

  return (
    <div className={cn('border-t border-border/40 px-4 py-4 sm:px-5', className)}>
      <div className="flex items-center gap-2 font-mono text-[13px] font-bold uppercase tracking-[0.22em] text-text-muted">
        <FileSearch className="h-3 w-3" />
        {isEs ? '§ EL APAGÓN — DATOS RECUPERADOS' : '§ THE BLACKOUT — RECOVERED DATA'}
      </div>

      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-secondary">
        {isEs
          ? 'El 28 de septiembre de 2025 el feed masivo de CompraNet se congeló tras la abolición legal del sistema. Estas adjudicaciones se recuperaron de su sucesor, ComprasMX —fuera del registro público consolidado—. Se muestran como conteos y montos OCR, sin la puntuación del modelo de riesgo v0.8.5: los datos posteriores al horizonte carecen de sus variables.'
          : 'On September 28 2025 the CompraNet bulk feed froze after the system was legally abolished. These awards were recovered from its successor, ComprasMX — outside the consolidated public record. They are shown as counts and OCR amounts, without the v0.8.5 risk score: post-horizon data lacks its features.'}
      </p>

      <div className="mt-4 grid max-w-lg grid-cols-3 gap-4">{stats}</div>

      <p className="mt-3 max-w-2xl font-mono text-[13px] leading-relaxed tracking-[0.12em] text-text-muted/70">
        {tierTag}
        {' · '}
        {isEs
          ? 'monto disponible solo para las adjudicaciones de mayor valor (OCR); el resto sin monto público.'
          : 'amount available only for the highest-value awards (OCR); the rest have no public amount.'}
      </p>

      {topSectors.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
            {isEs ? 'POR SECTOR · CONTEO RECUPERADO' : 'BY SECTOR · RECOVERED COUNT'}
          </div>
          <div className="max-w-md space-y-1.5">
            {topSectors.map((s) => {
              const color = SECTOR_COLORS[s.sector] ?? 'var(--color-text-muted)'
              return (
                <div key={s.sector_id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-[13px] text-text-secondary">
                    {getSectorName(s.sector, isEs ? 'es' : 'en')}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(s.count / sectorMax) * 100}%`, backgroundColor: color }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[12px] tabular-nums text-text-muted">
                    {s.count.toLocaleString(locale)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Link
        to="/gap"
        className="group mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline"
      >
        {isEs ? 'Ver el registro completo de El Apagón' : 'See the full El Apagón register'}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
