/**
 * DotStrip — RUBLI's signature data visualization (bible §4).
 *
 * Replaces bar charts throughout the platform. Each dot represents one
 * discrete unit (stated in legend). Canonical parameters:
 *   N = 50 dots, R = 3px, GAP = 8px, stagger 0.008s
 *
 * Orientation rule (bible §4):
 *   horizontal = ranked quantities / shares
 *   vertical   = time series / columns
 *
 * Variants:
 *   - `rows` prop for multi-row display (vendor list, sector ranking)
 *   - `oecdMark` prop for cyan benchmark line
 *   - `valueLabel` prop for mono number at the right
 */

import { motion } from 'framer-motion'
import { CHART_TOKENS, tokenColor, type ColorToken } from './tokens'

export interface DotStripRow {
  /** Left-side label (entity / sector / year) */
  label: string
  /** 0–1 fraction, controls how many dots are filled */
  fraction: number
  /** Semantic color for filled dots. Preferred over colorRaw. */
  colorToken?: ColorToken
  /**
   * Escape hatch: raw CSS color (hex or var()). Used by the legacy DotStrip
   * adapter and by callers that resolve colors from external lookup tables.
   * Prefer colorToken; this exists so adapters don't need to maintain a
   * separate hex→token mapping. If both are set, colorRaw wins.
   */
  colorRaw?: string
  /** Mono value rendered at right (e.g. "81.9%", "5.2B") */
  valueLabel?: string
  /** Optional href — the whole row becomes clickable */
  href?: string
  /** Optional annotation shown below the label (small mono grey) */
  sublabel?: string
}

export interface DotStripProps {
  rows: DotStripRow[]
  /** Override default N=50 (bible canonical). Rare; prefer default. */
  N?: number
  /** Horizontal (default) or vertical columns */
  orientation?: 'horizontal' | 'vertical'
  /** OECD cyan mark at this fraction (0–1). Renders as dashed vertical rule. */
  oecdMark?: { fraction: number; label?: string }
  /** If true, empty dots use dark-context fill (for dark cards/modals) */
  darkContext?: boolean
  /** Row height in px (default 24) */
  rowHeight?: number
  /** Width of left label column (default 160) */
  labelWidth?: number
  /** Disable animation for static/print contexts */
  staticMode?: boolean
}

export function DotStrip({
  rows,
  N = CHART_TOKENS.dotMatrix.N,
  orientation = 'horizontal',
  oecdMark,
  darkContext = false,
  rowHeight = 24,
  labelWidth = 160,
  staticMode = false,
}: DotStripProps) {
  const R = CHART_TOKENS.dotMatrix.R
  const GAP = CHART_TOKENS.dotMatrix.GAP
  const emptyFill = darkContext
    ? CHART_TOKENS.dotMatrix.emptyFillDarkContext
    : CHART_TOKENS.dotMatrix.emptyFill
  const emptyStroke = darkContext
    ? CHART_TOKENS.dotMatrix.emptyStrokeDarkContext
    : CHART_TOKENS.dotMatrix.emptyStroke

  if (orientation === 'vertical') {
    return <DotColumns rows={rows} N={N} darkContext={darkContext} staticMode={staticMode} />
  }

  const dotsWidth = N * GAP
  const oecdX = oecdMark ? oecdMark.fraction * dotsWidth : null

  return (
    <div className="w-full">
      <ul className="divide-y divide-border/40" role="list">
        {rows.map((row, rowIdx) => {
          const filled = Math.round(row.fraction * N)
          const filledColor = row.colorRaw ?? tokenColor(row.colorToken ?? 'neutral')
          const RowEl: React.ElementType = row.href ? 'a' : 'div'
          const rowProps = row.href
            ? { href: row.href, className: 'hover:bg-background-elevated transition-colors' }
            : {}
          return (
            <li key={rowIdx}>
              <RowEl
                {...rowProps}
                className={[
                  'flex items-center gap-4 py-1',
                  row.href ? 'hover:bg-background-elevated transition-colors' : '',
                ].join(' ')}
                style={{ minHeight: rowHeight }}
              >
                <div
                  className="flex-shrink-0 text-right"
                  style={{ width: labelWidth }}
                >
                  <div className="text-[12px] text-text-primary truncate leading-[1.3]">
                    {row.label}
                  </div>
                  {row.sublabel && (
                    <div className="text-[10px] font-mono text-text-muted truncate leading-[1.3]">
                      {row.sublabel}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <svg
                    width={dotsWidth}
                    height={R * 2 + 2}
                    viewBox={`0 0 ${dotsWidth} ${R * 2 + 2}`}
                    role="img"
                    aria-label={`${row.label}: ${row.valueLabel ?? Math.round(row.fraction * 100) + '%'}`}
                  >
                    {oecdX !== null && (
                      <line
                        x1={oecdX}
                        x2={oecdX}
                        y1={0}
                        y2={R * 2 + 2}
                        stroke={CHART_TOKENS.oecd.stroke}
                        strokeWidth={CHART_TOKENS.oecd.strokeWidth}
                        strokeDasharray={CHART_TOKENS.oecd.strokeDasharray}
                      />
                    )}
                    {Array.from({ length: N }, (_, i) => {
                      const isFilled = i < filled
                      return (
                        <motion.circle
                          key={i}
                          cx={i * GAP + R}
                          cy={R + 1}
                          r={R}
                          fill={isFilled ? filledColor : emptyFill}
                          stroke={isFilled ? 'none' : emptyStroke}
                          strokeWidth={isFilled ? 0 : 1}
                          initial={staticMode ? undefined : { opacity: 0 }}
                          animate={staticMode ? undefined : { opacity: 1 }}
                          transition={
                            staticMode
                              ? undefined
                              : {
                                  delay: (rowIdx * N + i) * CHART_TOKENS.dotMatrix.staggerSec,
                                  duration: CHART_TOKENS.dotMatrix.fadeInSec,
                                }
                          }
                        />
                      )
                    })}
                  </svg>
                </div>
                {row.valueLabel && (
                  <div className="flex-shrink-0 text-right w-[64px]">
                    <span
                      className="text-[12px] font-mono font-medium tabular-nums"
                      style={{ color: filledColor }}
                    >
                      {row.valueLabel}
                    </span>
                  </div>
                )}
              </RowEl>
            </li>
          )
        })}
      </ul>
      {oecdMark && (
        <div className="text-[10px] font-mono text-[color:var(--color-oecd)] mt-1.5">
          {oecdMark.label ?? `OCDE · ${Math.round(oecdMark.fraction * 100)}%`}
        </div>
      )}
    </div>
  )
}

// Vertical columns variant — used for time series (bible §4)
interface DotColumnsProps {
  rows: DotStripRow[]
  N: number
  darkContext: boolean
  staticMode: boolean
}

function DotColumns({ rows, N, darkContext, staticMode }: DotColumnsProps) {
  const R = CHART_TOKENS.dotMatrix.R
  const GAP = CHART_TOKENS.dotMatrix.GAP
  const emptyFill = darkContext
    ? CHART_TOKENS.dotMatrix.emptyFillDarkContext
    : CHART_TOKENS.dotMatrix.emptyFill
  const emptyStroke = darkContext
    ? CHART_TOKENS.dotMatrix.emptyStrokeDarkContext
    : CHART_TOKENS.dotMatrix.emptyStroke

  const height = N * GAP
  const colWidth = R * 2 + 12

  return (
    <div className="flex items-end gap-3 w-full overflow-x-auto">
      {rows.map((row, colIdx) => {
        const filled = Math.round(row.fraction * N)
        const filledColor = row.colorRaw ?? tokenColor(row.colorToken ?? 'neutral')
        return (
          <div key={colIdx} className="flex flex-col items-center gap-1">
            <svg
              width={colWidth}
              height={height}
              viewBox={`0 0 ${colWidth} ${height}`}
              role="img"
              aria-label={`${row.label}: ${row.valueLabel ?? ''}`}
            >
              {Array.from({ length: N }, (_, i) => {
                const isFilled = i >= N - filled
                const y = i * GAP + R
                return (
                  <motion.circle
                    key={i}
                    cx={colWidth / 2}
                    cy={y}
                    r={R}
                    fill={isFilled ? filledColor : emptyFill}
                    stroke={isFilled ? 'none' : emptyStroke}
                    strokeWidth={isFilled ? 0 : 1}
                    initial={staticMode ? undefined : { opacity: 0 }}
                    animate={staticMode ? undefined : { opacity: 1 }}
                    transition={
                      staticMode
                        ? undefined
                        : {
                            delay: (colIdx * N + i) * CHART_TOKENS.dotMatrix.staggerSec,
                            duration: CHART_TOKENS.dotMatrix.fadeInSec,
                          }
                    }
                  />
                )
              })}
            </svg>
            <div className="text-[10px] font-mono text-text-muted text-center">
              {row.label}
            </div>
            {row.valueLabel && (
              <div
                className="text-[11px] font-mono font-medium tabular-nums"
                style={{ color: filledColor }}
              >
                {row.valueLabel}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
