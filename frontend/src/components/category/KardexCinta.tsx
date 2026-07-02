/**
 * KardexCinta — § I "LA CINTA KARDEX" of the category dossier (spec § 4,
 * Bundle C). Replaces the SectorSexenioStrip section on CategoryDossier.
 *
 * A kardex is the Mexican accounting-office ledger card: one line per
 * movement, nothing omitted, gaps as informative as entries. This renders
 * the category's already-fetched yearly trend (`categoryTrends`,
 * CategoryDossier.tsx:238-248) as exactly that — one row per year,
 * 2002–2025, every year present even when the category moved nothing.
 *
 * Named precedent: ProPublica *Bailout Tracker* accountability-ledger rows
 * × Reuters accumulating-events timeline annotations.
 *
 * Per-year row: year | √-scaled valor bar (accent fill) | valor readout |
 * entradas (contract count) | ticket implícito (valor ÷ entradas, flagged
 * † ochre when ≥ 2× the category's median yearly ticket — a classic
 * procurement repricing tell, computed live, never hardcoded) | risk stamp
 * (getRiskLevelFromScore → RISK_COLORS via the shared intensityColor helper;
 * low never renders green — Bible §3.10; null avg_risk → muted "s/d"/"n/a").
 *
 * Sexenio separators (thin rule + president label, from @/lib/administrations)
 * mark every administration change, clamped to the 2002–2025 data window so
 * Fox doesn't imply pre-2002 coverage and Sheinbaum doesn't imply post-2025.
 *
 * A structure-ruler footer (A/B/C/D, RFC coverage %) is the honesty
 * instrument that keeps the 24-year tape from over-claiming — mirrors the
 * /methodology data-sources framing.
 *
 * Hex colours ONLY via style={{}} (className hex is silently stripped).
 */
import { useMemo } from 'react'
import { getAdministrationByYear, type Administration } from '@/lib/administrations'
import { intensityColor } from '@/components/categories/types'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

const YEAR_START = 2002
const YEAR_END = 2025

export interface KardexYearPoint {
  year: number
  total_value: number
  total_contracts: number
  avg_risk: number | null
}

export interface KardexCintaProps {
  trend: KardexYearPoint[]
  accent: string
  lang: 'en' | 'es'
}

interface YearRow {
  year: number
  totalValue: number
  totalContracts: number
  avgRisk: number | null
  ticket: number | null
  flagged: boolean
  isZero: boolean
  adminSeparator: Administration | null
}

// COMPRANET structure bands — the data-quality honesty ruler. Widths below are
// proportional to each band's year span (flex-grow), not pixel-exact.
const STRUCTURE_BANDS: { code: string; yearStart: number; yearEnd: number; rfc: number }[] = [
  { code: 'A', yearStart: 2002, yearEnd: 2010, rfc: 0.1 },
  { code: 'B', yearStart: 2010, yearEnd: 2017, rfc: 15.7 },
  { code: 'C', yearStart: 2018, yearEnd: 2022, rfc: 30.3 },
  { code: 'D', yearStart: 2023, yearEnd: 2025, rfc: 47.4 },
]

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── ValorBar — √-scaled proportional bar, fixed-width track that narrows on
//     mobile (never a flex-stretching FullBar — the sqrt ratio needs a stable
//     reference frame to read as a scale, not just a proportion of viewport). ──
function ValorBar({ ratio, color }: { ratio: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ratio * 100))
  return (
    <div
      className="relative overflow-hidden shrink-0 w-full max-w-[64px] sm:max-w-[110px] md:max-w-[170px] lg:max-w-[220px]"
      style={{ height: 9, background: 'var(--color-border)', borderRadius: 2 }}
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

// ─── RiskStamp — 8px square via the shared intensityColor helper (never green
//     for low). Null avg_risk renders a muted "s/d"/"n/a" label instead of a
//     square — a thin-data year gets a word, not a fabricated color. ─────────
function RiskStamp({ avgRisk, isEs }: { avgRisk: number | null; isEs: boolean }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: 20 }}>
      {avgRisk == null ? (
        <span
          className="font-mono"
          style={{ fontSize: 8, color: 'var(--color-text-muted)' }}
          title={isEs ? 'Sin datos de riesgo' : 'No risk data'}
        >
          {isEs ? 's/d' : 'n/a'}
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: 1.5, background: intensityColor(avgRisk), display: 'inline-block' }}
          title={`${Math.round(avgRisk * 100)}%`}
        />
      )}
    </span>
  )
}

export function KardexCinta({ trend, accent, lang }: KardexCintaProps) {
  const isEs = lang === 'es'

  const rows = useMemo<YearRow[]>(() => {
    const byYear = new Map(trend.map((p) => [p.year, p]))
    const filled: YearRow[] = []
    let prevAdminKey: string | null = null
    for (let y = YEAR_START; y <= YEAR_END; y++) {
      const p = byYear.get(y)
      const totalValue = p?.total_value ?? 0
      const totalContracts = p?.total_contracts ?? 0
      const avgRisk = p?.avg_risk ?? null
      const ticket = totalContracts > 0 ? totalValue / totalContracts : null
      const admin = getAdministrationByYear(y) ?? null
      const adminSeparator = admin && admin.key !== prevAdminKey ? admin : null
      if (admin) prevAdminKey = admin.key
      filled.push({
        year: y,
        totalValue,
        totalContracts,
        avgRisk,
        ticket,
        flagged: false,
        isZero: totalContracts === 0,
        adminSeparator,
      })
    }
    const ticketValues = filled.filter((r) => r.ticket != null).map((r) => r.ticket as number)
    const med = median(ticketValues)
    if (med > 0) {
      for (const r of filled) {
        if (r.ticket != null && r.ticket >= med * 2) r.flagged = true
      }
    }
    return filled
  }, [trend])

  const maxValue = useMemo(() => Math.max(1, ...rows.map((r) => r.totalValue)), [rows])
  const hasFlag = rows.some((r) => r.flagged)

  return (
    <div
      className="font-mono"
      role="table"
      aria-label={isEs ? 'Cinta kardex de movimientos anuales, 2002 a 2025' : 'Kardex tape of yearly movements, 2002 to 2025'}
    >
      {rows.map((r) => {
        const ratio = Math.sqrt(r.totalValue) / Math.sqrt(maxValue)
        return (
          <div key={r.year}>
            {r.adminSeparator && (
              <div className="flex items-center gap-2 pt-3 pb-1" aria-hidden="true">
                <span
                  className="uppercase"
                  style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {r.adminSeparator.long}
                </span>
                <span className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
                <span className="tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                  {Math.max(r.adminSeparator.yearStart, YEAR_START)}–{Math.min(r.adminSeparator.yearEnd, YEAR_END)}
                </span>
              </div>
            )}

            <div
              role="row"
              className="flex items-center gap-2 sm:gap-3 py-1.5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span className="tabular-nums shrink-0" style={{ width: 36, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {r.year}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--color-border)' }}>│</span>

              {r.isZero ? (
                <span className="italic flex-1" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'sin movimientos' : 'no movements'}
                </span>
              ) : (
                <>
                  <ValorBar ratio={ratio} color={accent} />
                  <span
                    className="tabular-nums shrink-0 text-right"
                    style={{ fontSize: 11, minWidth: 68, color: 'var(--color-text-secondary)' }}
                  >
                    {formatCompactMXN(r.totalValue)}
                  </span>
                  <span aria-hidden="true" className="hidden md:inline" style={{ color: 'var(--color-border)' }}>│</span>
                  <span
                    className="tabular-nums shrink-0 hidden md:inline text-right"
                    style={{ fontSize: 10.5, minWidth: 88, color: 'var(--color-text-muted)' }}
                  >
                    {formatNumber(r.totalContracts)} {isEs ? 'entradas' : 'entries'}
                  </span>
                  <span aria-hidden="true" className="hidden md:inline" style={{ color: 'var(--color-border)' }}>│</span>
                  <span
                    className="tabular-nums shrink-0 hidden md:inline text-right"
                    style={{ fontSize: 10.5, minWidth: 104, color: r.flagged ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  >
                    {/* "ticket" is an accepted loanword in Mexican procurement Spanish — same word both languages */}
                    ticket {formatCompactMXN(r.ticket ?? 0)}{r.flagged ? ' †' : ''}
                  </span>
                  <span className="ml-auto md:ml-0" />
                  <RiskStamp avgRisk={r.avgRisk} isEs={isEs} />
                </>
              )}
            </div>

            {!r.isZero && (
              <div className="md:hidden flex items-center gap-3 pb-1.5 pl-11">
                <span className="tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {formatNumber(r.totalContracts)} {isEs ? 'entradas' : 'entries'}
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 10, color: r.flagged ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                  ticket {formatCompactMXN(r.ticket ?? 0)}{r.flagged ? ' †' : ''}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {hasFlag && (
        <p className="mt-2" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
          {isEs
            ? '† reprecio: ticket implícito ≥ 2× la mediana anual de esta categoría — el ticket es valor ÷ entradas, no una observación de precio.'
            : '† repricing: implied ticket ≥ 2× this category’s median yearly ticket — the ticket is value ÷ entries, not a price observation.'}
        </p>
      )}

      {/* Structure ruler footer — the honesty instrument */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex" style={{ height: 15 }} aria-hidden="true">
          {STRUCTURE_BANDS.map((b, i) => (
            <div
              key={b.code}
              className="flex items-center justify-center overflow-hidden whitespace-nowrap"
              style={{
                flex: b.yearEnd - b.yearStart + 1,
                background: 'var(--color-border)',
                borderRight: i < STRUCTURE_BANDS.length - 1 ? '1px solid var(--color-background)' : undefined,
                color: 'var(--color-text-muted)',
                fontSize: 8.5,
              }}
            >
              {b.code} · {b.rfc}%
            </div>
          ))}
        </div>
        <p className="mt-1.5" style={{ fontSize: 9.5, lineHeight: 1.4, color: 'var(--color-text-muted)' }}>
          {isEs
            ? 'La clasificación por Partida es completa solo desde 2023 (Estructura D); los años previos pueden subcontar este anaquel.'
            : 'Partida-code classification is complete only from 2023 onward (Structure D); earlier years may undercount this shelf.'}
        </p>
      </div>
    </div>
  )
}
