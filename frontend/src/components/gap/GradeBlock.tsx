/**
 * GradeBlock — «El Nivel de Alerta Estructural» (gap redesign, 2026-07-03).
 *
 * The four-band distribution of the 0–100 structural red-flag indicator, with the
 * methodology caption the backend ships alongside it. Extracted verbatim out of
 * `pages/Gap.tsx` (Story Day 1 § F5 STEP 0) so the el-vacio story can render the
 * same plate from the same endpoint instead of forking a second grade chart.
 * Markup, props and colors are unchanged — `/gap` renders identically.
 *
 * Bible §3.10: `low` is zinc at 0.4 opacity, never green.
 */
import { ShieldAlert } from 'lucide-react'
import type { GapSummaryResponse } from '@/api/types'
import { RISK_COLORS } from '@/lib/constants'
import { cn, formatNumber } from '@/lib/utils'

export function GradeBlock({ summary, lang, bare = false }: {
  summary: GapSummaryResponse
  lang: string
  /** Set true when an outer card (the el-vacio story's ChartCard) already
   *  supplies the frame and the title — drops the border, the padding and the
   *  header row so the plate isn't a box inside a box with two headings. */
  bare?: boolean
}) {
  const { by_risk_level, grade_methodology } = summary
  const total =
    by_risk_level.critical + by_risk_level.high + by_risk_level.medium + by_risk_level.low
  if (total === 0) return null

  const levels: Array<{ key: keyof typeof by_risk_level; label_es: string; label_en: string }> = [
    { key: 'critical', label_es: 'Crítico', label_en: 'Critical' },
    { key: 'high', label_es: 'Alto', label_en: 'High' },
    { key: 'medium', label_es: 'Medio', label_en: 'Medium' },
    { key: 'low', label_es: 'Bajo', label_en: 'Low' },
  ]

  return (
    <div className={bare ? 'space-y-4' : 'border border-border rounded-sm bg-surface p-5 space-y-4'}>
      {!bare && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono mb-1">
              {lang === 'es'
                ? 'Indicador de banderas estructurales'
                : 'Structural red-flag indicator'}
            </div>
            <div className="font-serif text-lg font-bold text-text-primary">
              {lang === 'es'
                ? 'Nivel de alerta estructural'
                : 'Structural alert grade'}
            </div>
          </div>
          <ShieldAlert className="w-6 h-6 shrink-0 text-text-muted mt-1" />
        </div>
      )}

      {/* distribution bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {levels.map(({ key }) => {
            const count = by_risk_level[key]
            const pct = total > 0 ? (count / total) * 100 : 0
            if (pct < 0.5) return null
            const isLow = key === 'low'
            const color = isLow ? '#71717a' : RISK_COLORS[key as keyof typeof RISK_COLORS]
            return (
              <div
                key={key}
                title={`${lang === 'es' ? levels.find((l) => l.key === key)?.label_es : levels.find((l) => l.key === key)?.label_en}: ${formatNumber(count)}`}
                style={{ width: `${pct}%`, backgroundColor: color, opacity: isLow ? 0.4 : 1 }}
              />
            )
          })}
        </div>
        {/* legend */}
        <div className="flex flex-wrap gap-3">
          {levels.map(({ key, label_es, label_en }) => {
            const count = by_risk_level[key]
            const pct = total > 0 ? (count / total) * 100 : 0
            const isLow = key === 'low'
            const color = isLow ? undefined : RISK_COLORS[key as keyof typeof RISK_COLORS]
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isLow ? '#71717a' : color,
                    opacity: isLow ? 0.4 : 1,
                  }}
                />
                <span
                  className={cn(
                    'text-xs font-mono',
                    isLow ? 'text-text-muted' : 'text-text-secondary'
                  )}
                  style={!isLow && color ? { color } : undefined}
                >
                  {lang === 'es' ? label_es : label_en}
                </span>
                <span className="text-xs font-mono text-text-muted tabular-nums">
                  {formatNumber(count)} ({pct.toFixed(0)}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* methodology caption */}
      <div className="border-t border-border pt-3 text-[10px] text-text-muted font-mono leading-relaxed">
        <strong className="text-text-secondary">
          {lang === 'es' ? 'Nota metodológica: ' : 'Methodological note: '}
        </strong>
        {grade_methodology
          ? grade_methodology
          : lang === 'es'
          ? 'Este indicador refleja señales estructurales observables (sin licitación, monto no revelado, excepción de fuente única, proveedor EFOS, concentración, magnitud) — no es el modelo de riesgo v0.8.5. Los datos post-horizonte carecen de las 18 características del modelo histórico.'
          : 'This indicator reflects observable structural signals (no-bid, undisclosed amount, sole-source exception, EFOS vendor, concentration, magnitude) — not the v0.8.5 risk model. Post-horizon data lacks the 18 features of the historical model.'}
      </div>
    </div>
  )
}
