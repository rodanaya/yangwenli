/**
 * CrossPatternComparison — ranked proportional-bar strip across all 7 ARIA
 * typologies (P1–P7), sorted by vendor count.
 *
 * Extracted from the retired /patterns index page (2026-06-07 Patterns/Atlas
 * consolidation). Now lives in the foot of each /patterns/:code dossier as the
 * "Los Siete Patrones" sibling-navigation strip — each row links to its own
 * dossier; the dossier currently being viewed is highlighted.
 *
 * Pattern names are canonical (match docs/ARIA_SPEC.md + PatternDossier):
 * P4 = Bid Rigging, P5 = Overpricing, P7 = Conflict of Interest.
 */
import { Link } from 'react-router-dom'
import type { PatternSpotlight } from '@/api/client'
import { PATTERN_COLORS } from '@/lib/constants'
import { formatNumber, cn } from '@/lib/utils'

const PATTERN_NAMES: Record<string, { en: string; es: string }> = {
  P1: { en: 'Monopoly', es: 'Monopolio' },
  P2: { en: 'Ghost Company', es: 'Empresa Fantasma' },
  P3: { en: 'Intermediary', es: 'Intermediario' },
  P4: { en: 'Bid Rigging', es: 'Manipulación de Ofertas' },
  P5: { en: 'Overpricing', es: 'Sobreprecio' },
  P6: { en: 'Institutional Capture', es: 'Captura Institucional' },
  P7: { en: 'Conflict of Interest', es: 'Conflicto de Interés' },
}

export function CrossPatternComparison({
  patterns,
  currentCode,
  isEs,
}: {
  patterns: PatternSpotlight[]
  currentCode?: string
  isEs: boolean
}) {
  const sorted = [...patterns].sort(
    (a, b) => (b.vendor_count ?? 0) - (a.vendor_count ?? 0)
  )
  const maxVendors = sorted[0]?.vendor_count ?? 1

  return (
    <div className="flex flex-col">
      {sorted.map((p, idx) => {
        const color = PATTERN_COLORS[p.code] ?? '#64748b'
        const names = PATTERN_NAMES[p.code]
        const name = names ? (isEs ? names.es : names.en) : p.code
        const count = p.vendor_count ?? 0
        const pct = maxVendors > 0 ? (count / maxVendors) * 100 : 0
        const isCurrent = p.code === currentCode

        return (
          <Link
            key={p.code}
            to={`/patterns/${p.code}`}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-2 -mx-2 rounded-sm',
              'hover:bg-background-elevated/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors',
              idx > 0 && 'border-t border-border/30',
              isCurrent && 'bg-background-elevated/40'
            )}
            style={isCurrent ? { borderLeft: `2px solid ${color}` } : undefined}
            aria-label={`${p.code} ${name} — ${formatNumber(count)} ${isEs ? 'proveedores' : 'vendors'}`}
          >
            {/* Code badge + name */}
            <div className="flex items-center gap-2 min-w-0 w-[180px]">
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 text-[12px] font-bold font-mono tracking-wider"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {p.code}
              </span>
              <span
                className={cn(
                  'text-[12px] font-mono truncate transition-colors',
                  isCurrent ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                )}
              >
                {name}
              </span>
            </div>

            {/* Proportional bar */}
            <div className="relative h-2 bg-background-elevated/60 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
              />
            </div>

            {/* Vendor count */}
            <div className="flex items-baseline gap-1.5 justify-end min-w-[100px]">
              <span
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  fontSize: '15px',
                  color,
                }}
              >
                {formatNumber(count)}
              </span>
              <span className="text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted">
                {isEs ? 'prov.' : 'vend.'}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
