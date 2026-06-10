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
 */
import { RISK_COLORS } from '@/lib/constants'
import {
  CURRENT_YEAR,
  dispositionFor,
  dispositionLabel,
  impunityGap,
  type Lang,
} from './casesVocab'
import type { ScandalDetail } from '@/api/types'

const W = 720
const H = 116
const PAD_L = 24
const PAD_R = 56
const AXIS_Y = 62

export function CaseTimeline({
  scandal,
  sectorAccent,
  lang,
}: {
  scandal: ScandalDetail
  sectorAccent: string
  lang: Lang
}) {
  const start = scandal.contract_year_start ?? null
  const end = scandal.contract_year_end ?? start
  const discovery = scandal.discovery_year ?? null
  if (start == null && discovery == null) return null

  const meta = dispositionFor(scandal.legal_status)
  const gap = impunityGap(scandal)

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

  return (
    <figure className="mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={
          lang === 'es'
            ? `Línea de tiempo del caso: contratos ${start ?? '—'}–${end ?? '—'}, descubrimiento ${discovery ?? 'no registrado'}, ${bracketText ?? ''}`
            : `Case timeline: contracts ${start ?? '—'}–${end ?? '—'}, discovery ${discovery ?? 'unrecorded'}, ${bracketText ?? ''}`
        }
        style={{ display: 'block', maxWidth: 720 }}
      >
        {/* Axis */}
        <line x1={PAD_L} y1={AXIS_Y} x2={W - PAD_R + 28} y2={AXIS_Y} stroke={'var(--color-border)'} strokeWidth={1} />

        {/* Year ticks + labels */}
        {tickYears.map((y) => (
          <g key={y}>
            <line x1={x(y)} y1={AXIS_Y - 3} x2={x(y)} y2={AXIS_Y + 3} stroke={graphite} strokeWidth={1} opacity={0.6} />
            <text
              x={x(y)}
              y={AXIS_Y + 18}
              textAnchor="middle"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: ink }}
              className="tabular-nums"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Contract span band */}
        {start != null && end != null && (
          <g>
            <rect
              x={x(start)}
              y={AXIS_Y - 5}
              width={Math.max(4, x(end) - x(start))}
              height={10}
              fill={sectorAccent}
              opacity={0.8}
            />
            <text
              x={(x(start) + Math.max(x(end), x(start) + 4)) / 2}
              y={AXIS_Y - 14}
              textAnchor="middle"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.14em', fill: ink }}
            >
              {labelContract}
            </text>
          </g>
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
            <text
              x={x(discovery)}
              y={AXIS_Y - 24}
              textAnchor="middle"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.14em', fill: RISK_COLORS.critical, fontWeight: 700 }}
            >
              {labelDiscovery} {discovery}
            </text>
          </g>
        )}

        {/* Open segment to today (dashed) or closed terminus */}
        {meta.isOpen ? (
          <g>
            <line
              x1={x(anchorYear)}
              y1={AXIS_Y}
              x2={x(CURRENT_YEAR)}
              y2={AXIS_Y}
              stroke={meta.fill}
              strokeWidth={2.5}
              strokeDasharray="2 5"
            />
            {/* open arrowhead */}
            <path
              d={`M ${x(CURRENT_YEAR)} ${AXIS_Y} l -7 -4.5 v 9 z`}
              fill={meta.fill}
            />
            <text
              x={x(CURRENT_YEAR) + 6}
              y={AXIS_Y - 8}
              textAnchor="start"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.14em', fill: ink }}
            >
              {labelToday}
            </text>
          </g>
        ) : (
          <g>
            <line
              x1={x(anchorYear)}
              y1={AXIS_Y - 7}
              x2={x(anchorYear)}
              y2={AXIS_Y + 7}
              stroke={ink}
              strokeWidth={2.5}
            />
          </g>
        )}

        {/* Impunity bracket */}
        {bracketText && gap && meta.isOpen && (
          <g>
            <path
              d={`M ${x(anchorYear)} ${AXIS_Y + 26} v 5 H ${x(CURRENT_YEAR)} v -5`}
              fill="none"
              stroke={graphite}
              strokeWidth={1}
            />
            <text
              x={(x(anchorYear) + x(CURRENT_YEAR)) / 2}
              y={AXIS_Y + 46}
              textAnchor="middle"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                fill: 'var(--color-text-primary)',
              }}
            >
              {bracketText}
            </text>
          </g>
        )}
        {bracketText && !meta.isOpen && (
          <text
            x={x(anchorYear)}
            y={AXIS_Y + 40}
            textAnchor="middle"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 13,
              fill: ink,
            }}
          >
            {bracketText}
          </text>
        )}
      </svg>
      <figcaption
        className="mt-1"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          maxWidth: '64ch',
        }}
      >
        {lang === 'es'
          ? `La brecha se mide desde ${gap?.anchor === 'discovery' ? 'el año de descubrimiento' : 'el fin de los contratos'} hasta ${CURRENT_YEAR}, mientras el caso siga sin resolución firme.`
          : `The gap is measured from ${gap?.anchor === 'discovery' ? 'the discovery year' : 'the end of the contract window'} to ${CURRENT_YEAR}, while the case lacks a final disposition.`}
      </figcaption>
    </figure>
  )
}
