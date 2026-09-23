/**
 * CaseTimeline — the impunity arc. Reuters *Time of Evidence* precedent:
 * accumulating events on a single horizontal year spine.
 *
 *   contract span (solid band, sector ink) → discovery (critical tick) →
 *   today (dashed open segment + "N años sin condena" bracket when the case
 *   is still open; solid terminus with the disposition word when closed).
 *
 * Gap formula (one precise definition, captioned): years elapsed from the
 * discovery year (or the contract end when discovery is unrecorded) to the
 * current year, while no final disposition exists.
 *
 * Degrades: no discovery → 2-node arc from the contract span; a single year
 * → single milestone. Renders nothing (null) when no year field exists.
 *
 * PARALLAX D5 § Change 6 — "HTML owns glyphs, SVG owns geometry". The viewBox
 * is the figure's MEASURED width, so one SVG unit is one rendered pixel and
 * the year ticks stand at their nominal 12px instead of the 5.6px the audit
 * found at 390. The three caps labels and the bracket sentence are absolutely
 * positioned HTML: inside the SVG they rendered at 3.9px on a phone.
 */
import { useRef } from 'react'
import { RISK_COLORS } from '@/lib/constants'
import { measureLabel } from '@/lib/plateLabels'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import {
  CURRENT_YEAR,
  dispositionFor,
  dispositionLabel,
  impunityGap,
  type Lang,
} from './casesVocab'
import type { ScandalDetail } from '@/api/types'

const H = 116
const PAD_L = 24
const PAD_R = 56
const AXIS_Y = 62
const MIN_W = 280

/** Caps labels: mono, 10.5px — the 10px floor plus a hair for the tracking. */
const CAP_FS = 10.5
const CAP_LH = 13
const CAP_FONT = `${CAP_FS}px "JetBrains Mono", monospace`

export function CaseTimeline({
  scandal,
  sectorAccent,
  lang,
}: {
  scandal: ScandalDetail
  sectorAccent: string
  lang: Lang
}) {
  const figureRef = useRef<HTMLElement>(null)
  const measured = useMeasuredWidth(figureRef)

  const start = scandal.contract_year_start ?? null
  const end = scandal.contract_year_end ?? start
  const discovery = scandal.discovery_year ?? null
  if (start == null && discovery == null) return null

  const meta = dispositionFor(scandal.legal_status)
  const gap = impunityGap(scandal)

  // viewBox width == rendered width, so 1 unit == 1px and nothing is scaled.
  const W = Math.max(MIN_W, measured || 720)

  const minYear = Math.min(...[start, discovery].filter((y): y is number => y != null)) - 1
  const maxYear = CURRENT_YEAR + 1
  const x = (year: number) =>
    PAD_L + ((year - minYear) / (maxYear - minYear)) * (W - PAD_L - PAD_R)

  const anchorYear = discovery ?? end ?? start!
  const graphite = 'var(--color-text-muted)'
  const ink = 'var(--color-text-secondary)'

  const labelContract = lang === 'es' ? 'CONTRATOS' : 'CONTRACTS'
  const labelDiscovery = lang === 'es' ? 'DESCUBRIMIENTO' : 'DISCOVERY'
  const labelToday = lang === 'es' ? 'HOY' : 'TODAY'

  const bracketText = gap
    ? meta.isOpen
      ? lang === 'es'
        ? `${gap.years} años sin condena`
        : `${gap.years} years without a conviction`
      : lang === 'es'
        ? `${dispositionLabel(scandal.legal_status, lang).toLowerCase()} · ${gap.years} años después`
        : `${dispositionLabel(scandal.legal_status, lang).toLowerCase()} · ${gap.years} years on`
    : null

  // Year ticks: start, end (if distinct), discovery (if distinct), today.
  const tickYears = Array.from(
    new Set(
      [start, end, discovery, CURRENT_YEAR].filter((y): y is number => y != null),
    ),
  ).sort((a, b) => a - b)

  // TODAY sits to the right of the arrowhead unless that would leave the
  // plate, in which case it flips to the left of it.
  const todayX = x(CURRENT_YEAR)
  const todayW = measured > 0 ? measureLabel(labelToday, CAP_FONT, W, CAP_LH).width : 0
  const todayFlips = measured > 0 && todayX + 6 + todayW > W

  // Glyphs are measured, so they wait for the first ResizeObserver tick.
  const showLabels = measured > 0

  const capStyle = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: CAP_FS,
    lineHeight: `${CAP_LH}px`,
    letterSpacing: '0.14em',
  } as const

  return (
    <figure ref={figureRef} className="mt-2 relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={
          lang === 'es'
            ? `Línea de tiempo del caso: contratos ${start ?? '—'}–${end ?? '—'}, descubrimiento ${discovery ?? 'no registrado'}, ${bracketText ?? ''}`
            : `Case timeline: contracts ${start ?? '—'}–${end ?? '—'}, discovery ${discovery ?? 'unrecorded'}, ${bracketText ?? ''}`
        }
        style={{ display: 'block' }}
      >
        {/* Axis */}
        <line x1={PAD_L} y1={AXIS_Y} x2={W - PAD_R + 28} y2={AXIS_Y} stroke={'var(--color-border)'} strokeWidth={1} />

        {/* Year ticks + labels — the only text left in the SVG, now 1:1 */}
        {tickYears.map((y) => (
          <g key={y}>
            <line x1={x(y)} y1={AXIS_Y - 3} x2={x(y)} y2={AXIS_Y + 3} stroke={graphite} strokeWidth={1} opacity={0.6} />
            <text
              x={x(y)}
              y={AXIS_Y + 18}
              textAnchor="middle"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fill: ink }}
              className="tabular-nums"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Contract span band */}
        {start != null && end != null && (
          <rect
            x={x(start)}
            y={AXIS_Y - 5}
            width={Math.max(4, x(end) - x(start))}
            height={10}
            fill={sectorAccent}
            opacity={0.8}
          />
        )}

        {/* Discovery tick */}
        {discovery != null && (
          <g>
            <line
              x1={x(discovery)}
              y1={AXIS_Y - 18}
              x2={x(discovery)}
              y2={AXIS_Y + 8}
              stroke={RISK_COLORS.critical}
              strokeWidth={2}
            />
            <circle cx={x(discovery)} cy={AXIS_Y} r={4} fill={RISK_COLORS.critical} />
          </g>
        )}

        {/* Open segment to today (dashed) or closed terminus */}
        {meta.isOpen ? (
          <g>
            <line
              x1={x(anchorYear)}
              y1={AXIS_Y}
              x2={todayX}
              y2={AXIS_Y}
              stroke={meta.fill}
              strokeWidth={2.5}
              strokeDasharray="2 5"
            />
            {/* open arrowhead */}
            <path d={`M ${todayX} ${AXIS_Y} l -7 -4.5 v 9 z`} fill={meta.fill} />
          </g>
        ) : (
          <line
            x1={x(anchorYear)}
            y1={AXIS_Y - 7}
            x2={x(anchorYear)}
            y2={AXIS_Y + 7}
            stroke={ink}
            strokeWidth={2.5}
          />
        )}

        {/* Impunity bracket rule (the sentence under it is HTML) */}
        {bracketText && gap && meta.isOpen && (
          <path
            d={`M ${x(anchorYear)} ${AXIS_Y + 26} v 5 H ${todayX} v -5`}
            fill="none"
            stroke={graphite}
            strokeWidth={1}
          />
        )}
      </svg>

      {/* ── HTML glyph layer — decoration for AT; the svg aria-label speaks ── */}
      {showLabels && (
        <div aria-hidden="true" className="contents">
          {start != null && end != null && (
            <span
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                ...capStyle,
                color: ink,
                left: (x(start) + Math.max(x(end), x(start) + 4)) / 2,
                top: AXIS_Y - 24,
                transform: 'translateX(-50%)',
              }}
            >
              {labelContract}
            </span>
          )}

          {discovery != null && (
            <span
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                ...capStyle,
                color: RISK_COLORS.critical,
                fontWeight: 700,
                left: x(discovery),
                top: AXIS_Y - 38,
                transform: 'translateX(-50%)',
              }}
            >
              {labelDiscovery} {discovery}
            </span>
          )}

          {meta.isOpen && (
            <span
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                ...capStyle,
                color: ink,
                left: todayFlips ? undefined : todayX + 6,
                right: todayFlips ? W - todayX + 6 : undefined,
                top: AXIS_Y - 20,
              }}
            >
              {labelToday}
            </span>
          )}

          {bracketText && gap && meta.isOpen && (
            <span
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'normal',
                fontSize: 14,
                lineHeight: '18px',
                color: 'var(--color-text-primary)',
                left: (x(anchorYear) + todayX) / 2,
                top: AXIS_Y + 34,
                transform: 'translateX(-50%)',
              }}
            >
              {bracketText}
            </span>
          )}

          {bracketText && !meta.isOpen && (
            <span
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'normal',
                fontSize: 13,
                lineHeight: '17px',
                color: ink,
                left: x(anchorYear),
                top: AXIS_Y + 28,
                transform: 'translateX(-50%)',
              }}
            >
              {bracketText}
            </span>
          )}
        </div>
      )}

      <figcaption
        className="mt-1 font-mono"
        style={{
          fontSize: 12.5,
          lineHeight: 1.45,
          color: 'var(--color-text-muted)',
        }}
      >
        {lang === 'es'
          ? `La brecha se mide desde ${gap?.anchor === 'discovery' ? 'el año de descubrimiento' : 'el fin de los contratos'} hasta ${CURRENT_YEAR}, mientras el caso siga sin resolución firme.`
          : `The gap is measured from ${gap?.anchor === 'discovery' ? 'the discovery year' : 'the end of the contract window'} to ${CURRENT_YEAR}, while the case lacks a final disposition.`}
      </figcaption>
    </figure>
  )
}
