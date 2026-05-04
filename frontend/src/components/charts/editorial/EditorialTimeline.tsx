/**
 * EditorialTimeline — vertical event timeline with amount-encoded dots
 * and sexenio (admin-era) wash bands.
 *
 * Part C / prim-P3 of FULL_SITE_GRAPHICS_AUDIT.md.
 * Replaces VendorContractTimeline (#52), CaseDetail timeline (#78),
 * RedThread ch.2, ProcurementCalendar spike strip — currently 4+
 * separate bespoke implementations.
 *
 * Encoding:
 *   - Vertical spine down the left third of the chart.
 *   - Each event = dot on spine + card to the right.
 *   - Dot radius = clamp(4, sqrt(amount / 1e7), 14) if amount provided;
 *     flat 6px otherwise.
 *   - Dot fill = RISK_COLORS[riskLevel] → SECTOR_COLORS[sectorCode] → muted.
 *   - Sexenio bands: faint horizontal stripes labeled at left of band.
 *   - Dates in text-[11px] font-mono.
 *   - Click on card navigates to href if provided.
 *
 * Critical rule: this primitive renders strings only. Consumers must
 * wrap entity names with <EntityIdentityChip> before passing as `title`.
 */

import { useMemo } from 'react'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { ADMINISTRATIONS, type Administration } from '@/lib/administrations'
import { formatCompactMXN } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EditorialTimelineEvent {
  id: string | number
  /** ISO date string (YYYY-MM-DD or YYYY-MM or YYYY). */
  date: string
  /** Contract / transaction amount in MXN — encodes dot radius. */
  amount?: number
  /** Event headline text. */
  title: string
  /** Smaller secondary text shown below the title. */
  subtitle?: string
  /** Dot color from risk tier. */
  riskLevel?: 'critical' | 'high' | 'medium' | 'low'
  /** Click destination. */
  href?: string
  /** Sector code — used for dot color when riskLevel is absent. */
  sectorCode?: string
  /** Small chip text rendered on the card row. */
  badge?: string
}

export interface EditorialTimelineProps {
  events: EditorialTimelineEvent[]
  /** Render sexenio wash bands. Default true. */
  showSexenios?: boolean
  /** Total height in px. Defaults to auto (computed from event count). */
  height?: number
  /** Shown when events is empty. */
  emptyState?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Dot radius from amount. */
function dotRadius(amount: number | undefined): number {
  if (amount == null || amount <= 0) return 6
  return Math.min(14, Math.max(4, Math.sqrt(amount / 1e7)))
}

/** Resolve dot fill color in priority order. */
function dotColor(event: EditorialTimelineEvent): string {
  if (event.riskLevel) return RISK_COLORS[event.riskLevel]
  if (event.sectorCode && SECTOR_COLORS[event.sectorCode]) {
    return SECTOR_COLORS[event.sectorCode]
  }
  return '#94a3b8' // slate-400 — text-text-muted equivalent
}

/** Parse year from an ISO-ish date string. */
function parseYear(date: string): number {
  return parseInt(date.slice(0, 4), 10)
}

/** Format a date string for display. */
function formatEventDate(date: string): string {
  // Support YYYY-MM-DD, YYYY-MM, YYYY
  const parts = date.split('-')
  if (parts.length >= 3) {
    const d = new Date(date + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }
  if (parts.length === 2) {
    const d = new Date(date + '-01T00:00:00')
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })
    }
  }
  return date
}

// ─── Sexenio bands ───────────────────────────────────────────────────────────

interface SexenioBand {
  admin: Administration
  yStart: number
  yEnd: number
}

/** Alternate muted fill so adjacent bands visually separate. */
const BAND_FILLS = ['rgba(148,163,184,0.06)', 'rgba(148,163,184,0.14)']

// ─── Layout constants ─────────────────────────────────────────────────────────

const SPINE_X = 56           // px from left — spine column
const CARD_LEFT = SPINE_X + 20
const ROW_HEIGHT = 68        // px per event row
const BAND_LABEL_X = 4
const SVG_WIDTH = 520

// ─── Component ───────────────────────────────────────────────────────────────

export function EditorialTimeline({
  events,
  showSexenios = true,
  height,
  emptyState = 'Sin eventos registrados',
}: EditorialTimelineProps) {
  // Sort events chronologically
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  )

  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: height ?? 120 }}
      >
        <span
          className="text-[12px] font-mono"
          style={{ color: '#94a3b8' }}
        >
          {emptyState}
        </span>
      </div>
    )
  }

  const topPad = 24
  const bottomPad = 24
  const totalH = height ?? topPad + sorted.length * ROW_HEIGHT + bottomPad

  // Map each event row to a Y center position
  const rowY = (i: number) => topPad + i * ROW_HEIGHT + ROW_HEIGHT / 2

  // Sexenio bands — compute pixel extents based on year range of events
  const minYear = parseYear(sorted[0].date)
  const maxYear = parseYear(sorted[sorted.length - 1].date)
  const yearSpan = Math.max(maxYear - minYear, 1)

  // Map a year to y-pixel within the plot
  const yearToY = (year: number) =>
    topPad + ((year - minYear) / yearSpan) * (totalH - topPad - bottomPad)

  const sexenioBands: SexenioBand[] = useMemo(() => {
    if (!showSexenios) return []
    return ADMINISTRATIONS
      .filter((a) => a.yearEnd >= minYear && a.yearStart <= maxYear)
      .map((a) => ({
        admin: a,
        yStart: yearToY(Math.max(a.yearStart, minYear)),
        yEnd: yearToY(Math.min(a.yearEnd + 1, maxYear + 1)),
      }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSexenios, minYear, maxYear, totalH])

  return (
    <figure className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${totalH}`}
        width="100%"
        style={{ height: totalH }}
        role="list"
        aria-label="Línea de tiempo de eventos"
      >
        {/* ── Sexenio wash bands ── */}
        {sexenioBands.map((band, bi) => (
          <g key={band.admin.key}>
            <rect
              x={0}
              y={band.yStart}
              width={SVG_WIDTH}
              height={Math.max(0, band.yEnd - band.yStart)}
              fill={BAND_FILLS[bi % 2]}
            />
            <text
              x={BAND_LABEL_X}
              y={band.yStart + 10}
              fontSize={8}
              fontFamily="ui-monospace, monospace"
              fill="#94a3b8"
              opacity={0.85}
            >
              {band.admin.short}
            </text>
          </g>
        ))}

        {/* ── Vertical spine ── */}
        <line
          x1={SPINE_X}
          y1={topPad}
          x2={SPINE_X}
          y2={totalH - bottomPad}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* ── Events ── */}
        {sorted.map((evt, i) => {
          const cy = rowY(i)
          const r = dotRadius(evt.amount)
          const fill = dotColor(evt)

          return (
            <g key={evt.id} role="listitem" aria-label={evt.title}>
              {/* Connector tick from spine to dot */}
              <line
                x1={SPINE_X}
                y1={cy}
                x2={SPINE_X - 8}
                y2={cy}
                stroke="#e2e8f0"
                strokeWidth={0.5}
              />

              {/* Amount-encoded dot */}
              <circle
                cx={SPINE_X}
                cy={cy}
                r={r}
                fill={fill}
                fillOpacity={0.85}
                stroke="white"
                strokeWidth={1}
              />

              {/* Risk ring for critical events */}
              {evt.riskLevel === 'critical' && (
                <circle
                  cx={SPINE_X}
                  cy={cy}
                  r={r + 4}
                  fill="none"
                  stroke={RISK_COLORS.critical}
                  strokeWidth={0.75}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}

              {/* Date label left of spine */}
              <text
                x={SPINE_X - 12}
                y={cy}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fill="#94a3b8"
              >
                {formatEventDate(evt.date)}
              </text>

              {/* Card body (foreignObject for HTML text wrapping) */}
              {evt.href ? (
                <a href={evt.href} aria-label={evt.title}>
                  <EventCard
                    evt={evt}
                    cardLeft={CARD_LEFT}
                    cy={cy}
                    cardWidth={SVG_WIDTH - CARD_LEFT - 8}
                  />
                </a>
              ) : (
                <EventCard
                  evt={evt}
                  cardLeft={CARD_LEFT}
                  cy={cy}
                  cardWidth={SVG_WIDTH - CARD_LEFT - 8}
                />
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

// ─── EventCard helper ─────────────────────────────────────────────────────────

interface EventCardProps {
  evt: EditorialTimelineEvent
  cardLeft: number
  cy: number
  cardWidth: number
}

function EventCard({ evt, cardLeft, cy, cardWidth }: EventCardProps) {
  const cardH = ROW_HEIGHT - 8
  const cardTop = cy - cardH / 2

  return (
    <g>
      {/* Card background */}
      <rect
        x={cardLeft}
        y={cardTop}
        width={cardWidth}
        height={cardH}
        rx={3}
        fill="white"
        fillOpacity={0.04}
        stroke="#e2e8f0"
        strokeWidth={0.5}
      />

      {/* Title */}
      <text
        x={cardLeft + 8}
        y={cy - (evt.subtitle || evt.amount ? 8 : 0)}
        dominantBaseline="middle"
        fontSize={11}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={500}
        fill="#1e293b"
      >
        {evt.title.length > 52 ? evt.title.slice(0, 52) + '…' : evt.title}
      </text>

      {/* Subtitle */}
      {evt.subtitle && (
        <text
          x={cardLeft + 8}
          y={cy + 8}
          dominantBaseline="middle"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fill="#94a3b8"
        >
          {evt.subtitle.length > 60 ? evt.subtitle.slice(0, 60) + '…' : evt.subtitle}
        </text>
      )}

      {/* Amount readout */}
      {evt.amount != null && evt.amount > 0 && (
        <text
          x={cardLeft + cardWidth - 8}
          y={cy - (evt.subtitle ? 8 : 0)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fill="#475569"
        >
          {formatCompactMXN(evt.amount)}
        </text>
      )}

      {/* Badge chip */}
      {evt.badge && (
        <g>
          <rect
            x={cardLeft + 8}
            y={cy + 16}
            width={evt.badge.length * 5.5 + 8}
            height={12}
            rx={2}
            fill="#f1f5f9"
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
          <text
            x={cardLeft + 12}
            y={cy + 22}
            dominantBaseline="middle"
            fontSize={7}
            fontFamily="ui-monospace, monospace"
            fontWeight={600}
            fill="#64748b"
            letterSpacing="0.04em"
            style={{ textTransform: 'uppercase' }}
          >
            {evt.badge}
          </text>
        </g>
      )}

      {/* Arrow for clickable items */}
      {evt.href && (
        <text
          x={cardLeft + cardWidth - 8}
          y={cy + (evt.subtitle ? 8 : 0)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={10}
          fill="#94a3b8"
        >
          →
        </text>
      )}
    </g>
  )
}
