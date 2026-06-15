/**
 * ExpedienteSpine — R3 of the M7b Administrations amplification.
 *
 * A Reuters "Time of Evidence" single chronological spine: documented
 * scandals (DOSSIER_DATA) and key term events (props.events) merged into
 * one year-ordered case-file for a single administration. Replaces the
 * old two-column scandal-cards ∥ events-list split, which left the reader
 * unable to reconstruct the term's narrative arc.
 *
 * The page card supplies the kicker, title, and GT-count stat; this
 * component owns only the spine + the ground-truth footnote.
 */
import type { JSX } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FileText, AlertTriangle, Shield, Activity, ExternalLink } from 'lucide-react'
import { DOSSIER_DATA, SEVERITY_COLORS, SCANDAL_YEARS } from './data'
import type { AdminName } from './types'

export interface ExpedienteSpineProps {
  adminName: AdminName
  isEs: boolean
  gtCaseCount?: number
  events: Array<{
    year: number
    title: string
    titleEs: string
    type: 'reform' | 'scandal' | 'audit' | 'crisis'
    impact: 'high' | 'medium' | 'low'
    /** When set, this curated event restates a DOSSIER_DATA scandal of this
     *  key — it is dropped from the spine when that scandal is present, so the
     *  richer (case-linked) scandal entry is the single source of truth. */
    dupScandal?: string
  }>
}

type EventType = ExpedienteSpineProps['events'][number]['type']
type Severity = keyof typeof SEVERITY_COLORS

/** Same hex map the legacy page used for event-type markers/icons. */
const EVENT_TYPE_COLOR: Record<EventType, string> = {
  reform: '#3b82f6',
  scandal: '#f87171',
  audit: '#fbbf24',
  crisis: '#fb923c',
}

const EVENT_TYPE_ICON: Record<EventType, typeof FileText> = {
  reform: FileText,
  scandal: AlertTriangle,
  audit: Shield,
  crisis: Activity,
}

/** A scandal entry merged from DOSSIER_DATA. */
interface ScandalSpineEntry {
  kind: 'scandal'
  year: number
  severity: Severity
  caseId?: string
  text: string
}

/** An event entry merged from props.events. */
interface EventSpineEntry {
  kind: 'event'
  year: number
  type: EventType
  impact: 'high' | 'medium' | 'low'
  text: string
}

type SpineEntry = ScandalSpineEntry | EventSpineEntry

export function ExpedienteSpine(props: ExpedienteSpineProps): JSX.Element {
  const { adminName, isEs, events } = props
  const { t } = useTranslation('administrations')

  // (b) DOSSIER_DATA scandals → spine entries (year via SCANDAL_YEARS, 9999 fallback)
  const scandals = DOSSIER_DATA[adminName]?.scandals ?? []
  const yearMap = SCANDAL_YEARS[adminName] ?? {}

  // (a) events → spine entries. Drop any curated event that merely restates a
  // scandal present here (dupScandal) — otherwise every major affair renders
  // twice (curated event + GT scandal). The scandal carries the case link, so
  // it wins. DC4.
  const scandalKeys = new Set(scandals.map((s) => s.key))
  const eventEntries: EventSpineEntry[] = events
    .filter((e) => !(e.dupScandal && scandalKeys.has(e.dupScandal)))
    .map((e) => ({
      kind: 'event',
      year: e.year,
      type: e.type,
      impact: e.impact,
      text: isEs ? e.titleEs : e.title,
    }))

  const scandalEntries: ScandalSpineEntry[] = scandals.map((s) => ({
    kind: 'scandal',
    year: yearMap[s.key] ?? 9999,
    severity: s.severity,
    caseId: s.caseId,
    text: t(`dossier.scandals.${s.key}`),
  }))

  // Merge + sort: ascending by year, scandals before events within the same year.
  const entries: SpineEntry[] = [...scandalEntries, ...eventEntries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.kind === b.kind) return 0
    return a.kind === 'scandal' ? -1 : 1
  })

  const groundTruthNote = (
    <p className="mt-3 text-[10px] text-text-muted leading-relaxed">{t('groundTruthNote')}</p>
  )

  // Empty state
  if (entries.length === 0) {
    return (
      <motion.div
        key={adminName}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-w-[70ch]"
      >
        <p className="py-8 text-center text-xs text-text-secondary">{t('eventsNoData')}</p>
        {groundTruthNote}
      </motion.div>
    )
  }

  // Density (M7c whitespace pass): ≥6 entries flow as TWO side-by-side spines
  // at lg — chronology runs down the left rail, then continues on the right.
  // A single 70ch column left ~40% of the folder width empty.
  const split = entries.length >= 5
  const midpoint = Math.ceil(entries.length / 2)
  const halves: SpineEntry[][] = split
    ? [entries.slice(0, midpoint), entries.slice(midpoint)]
    : [entries]

  const renderEntry = (entry: SpineEntry, i: number) => {
          const isScandal = entry.kind === 'scandal'
          const markerColor = isScandal
            ? SEVERITY_COLORS[entry.severity]
            : EVENT_TYPE_COLOR[entry.type]
          const markerSize = isScandal ? 10 : 8
          const yearLabel = entry.year === 9999 ? '—' : String(entry.year)

          // Chip: severity label for scandals, type label for events.
          const chipLabel = isScandal
            ? t(`dossier.severityLabels.${entry.severity}`)
            : t(`eventTypes.${entry.type}`)
          const chipColor = markerColor

          const EventIcon = isScandal ? null : EVENT_TYPE_ICON[entry.type]

          return (
            <li
              key={`${entry.kind}-${entry.year}-${i}`}
              className="relative flex items-start gap-2 py-1 min-h-[30px]"
            >
              {/* Marker dot on the rail */}
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  left: `${-16 - markerSize / 2 + 1}px`,
                  top: '0.75rem',
                  width: `${markerSize}px`,
                  height: `${markerSize}px`,
                  backgroundColor: markerColor,
                }}
              />

              {/* Year */}
              <span
                className="shrink-0 w-10 pt-px font-mono text-[10px] font-bold tabular-nums"
                style={{ color: markerColor }}
              >
                {yearLabel}
              </span>

              {/* Chip */}
              <span
                className="shrink-0 mt-px inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide leading-none"
                style={{
                  color: chipColor,
                  backgroundColor: `${chipColor}33`,
                }}
              >
                {EventIcon ? <EventIcon size={8} strokeWidth={2.5} aria-hidden /> : null}
                {chipLabel}
              </span>

              {/* Text + optional case link */}
              <span className="min-w-0 flex-1">
                <span
                  className={`text-xs leading-snug ${
                    isScandal ? 'text-text-primary font-medium' : 'text-text-secondary'
                  }`}
                >
                  {entry.text}
                </span>
                {isScandal && entry.caseId ? (
                  <>
                    {' '}
                    <Link
                      to={`/cases/${entry.caseId}`}
                      className="inline-flex items-center gap-0.5 align-baseline text-[9px] font-mono text-accent hover:underline"
                    >
                      <ExternalLink size={9} aria-hidden />
                      {t('dossier.linkToCases')}
                    </Link>
                  </>
                ) : null}
              </span>
            </li>
          )
  }

  return (
    <motion.div
      key={adminName}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className={split ? 'grid grid-cols-1 lg:grid-cols-2 gap-x-10' : 'max-w-[70ch]'}>
        {halves.map((half, h) => (
          <ol key={h} className="relative border-l-2 border-border pl-4">
            {half.map((entry, i) => renderEntry(entry, h * midpoint + i))}
          </ol>
        ))}
      </div>
      {groundTruthNote}
    </motion.div>
  )
}

export default ExpedienteSpine
