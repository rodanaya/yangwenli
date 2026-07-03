/**
 * AdminSectorDeviation — §II LA DESVIACIÓN SECTORIAL / THE SECTOR DEVIATION
 *
 * Replaces both the old dot-strip sector footprint and the 48-cell TARJETA
 * SECTORIAL heatmap with ONE FT "deviation from benchmark" stack (the
 * BenchmarkRow primitive). Answers "which sectors ran hotter than this
 * president's OWN average, and by how much" — sector risk shown exactly
 * once, with an argument. FT Visual Vocabulary deviation-bar pattern:
 * crimson right of the term's own average, zinc left — never green.
 *
 * The component renders the section BODY only (named-outlier callout + bar
 * stack + footnote + optional export control). The integrator supplies the
 * outer ChapterKicker wrapper + h3 title, per the AdminBuyersSection
 * precedent (`frontend/src/components/administrations/AdminBuyersSection.tsx`).
 *
 * .claude/designs/administrations-2026-07-02-spec.md § II
 */
import { BenchmarkRow } from '@/components/editorial/BenchmarkRow'
import { TableExportButton } from '@/components/TableExportButton'

export interface SectorDeviationRow {
  sectorId: number
  name: string
  color: string
  hrFraction: number
  daPct: number
  contracts: number
}

export interface AdminSectorDeviationProps {
  rows: SectorDeviationRow[]
  termBenchmarkFraction: number
  isEs: boolean
  onExport?: () => void
}

// Sectors with fewer term contracts than this drop to a footnote count line
// instead of drawing a bar — avoids garbage deviations on tiny partial terms
// (matters for Sheinbaum's in-progress sexenio).
const MIN_CONTRACTS = 30

export function AdminSectorDeviation({ rows, termBenchmarkFraction, isEs, onExport }: AdminSectorDeviationProps) {
  const omitted = rows.filter((r) => r.contracts < MIN_CONTRACTS)

  const sorted = rows
    .filter((r) => r.contracts >= MIN_CONTRACTS)
    .map((r) => ({ ...r, delta: r.hrFraction - termBenchmarkFraction }))
    .sort((a, b) => b.delta - a.delta)

  const maxAbsDelta = sorted.reduce((max, r) => Math.max(max, Math.abs(r.delta)), 0)
  const maxDelta = Math.max(0.15, Math.ceil((maxAbsDelta * 1.2) / 0.05) * 0.05)

  const benchmarkLabel = isEs ? 'promedio del sexenio' : 'term average'

  // Named top-deviator callout — the same benchmark denominator means delta
  // order and value/benchmark order agree whenever the benchmark is positive.
  const top = sorted[0]
  const topMultiple = top && termBenchmarkFraction > 0 ? top.hrFraction / termBenchmarkFraction : null

  const exportData = sorted.map((r) => ({
    sector: r.name,
    [isEs ? 'alto_riesgo_pct' : 'high_risk_pct']: (r.hrFraction * 100).toFixed(1),
    [isEs ? 'adj_directa_pct' : 'direct_award_pct']: r.daPct.toFixed(1),
    [isEs ? 'contratos' : 'contracts']: r.contracts,
    [isEs ? 'desviacion_pp' : 'deviation_pp']: (r.delta * 100).toFixed(1),
  }))

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-text-muted py-4 text-center">
        {isEs
          ? 'Sin sectores con suficientes contratos en este periodo.'
          : 'No sectors with enough contracts in this term.'}
      </div>
    )
  }

  return (
    <div>
      {/* Named-outlier callout + optional export control */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {top && topMultiple !== null && (
          <p
            className="text-[15px] leading-snug"
            style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'italic' }}
          >
            {isEs ? (
              <>
                {top.name} corrió a{' '}
                <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 600 }}>
                  {topMultiple.toFixed(1)}×
                </span>{' '}
                el promedio del sexenio.
              </>
            ) : (
              <>
                {top.name} ran at{' '}
                <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 600 }}>
                  {topMultiple.toFixed(1)}×
                </span>{' '}
                the term average.
              </>
            )}
          </p>
        )}
        {onExport && (
          <div onClick={onExport} className="shrink-0">
            <TableExportButton
              data={exportData}
              filename="rubli-administraciones-desviacion-sectorial"
              className="shrink-0"
            />
          </div>
        )}
      </div>

      {/* Deviation stack — crimson right / zinc left is the primitive's own
          encoding; never overridden, never green. */}
      <div className="space-y-0.5">
        {sorted.map((r) => (
          <BenchmarkRow
            key={r.sectorId}
            label={`${r.name} · AD ${Math.round(r.daPct)}%`}
            value={r.hrFraction}
            benchmark={termBenchmarkFraction}
            benchmarkLabel={benchmarkLabel}
            maxDelta={maxDelta}
          />
        ))}
      </div>

      {/* Footnote — sectors dropped for insufficient sample */}
      {omitted.length > 0 && (
        <p className="text-[10px] font-mono text-text-muted/70 mt-2">
          {isEs
            ? `${omitted.length} sectores con <30 contratos omitidos.`
            : `${omitted.length} sectors with <30 contracts omitted.`}
        </p>
      )}
    </div>
  )
}
