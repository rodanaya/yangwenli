/**
 * DispositionBand — the index hero chart: one stacked proportion band of the
 * 43 documented cases by legal disposition, ordered worst → resolved, with
 * the lone-conviction sliver called out by an ochre tick.
 *
 * Precedent: ProPublica *Bailout Tracker* accountability band (disposition-
 * sorted share bar). Cover-the-captions: with every label hidden the reader
 * still sees a band that is overwhelmingly red-and-amber with a hairline
 * neutral sliver at the far end — the geometry IS the argument.
 *
 * The legend is the control (PARALLAX D5 Change 4): each legend item is a
 * button carrying the dot, the label and the count, so the filter is reachable
 * by keyboard and readable without colour. The band's segments stay clickable
 * for the mouse but leave the accessibility tree and the tab order — they are
 * the picture, not the interface.
 */
import {
  DISPOSITION_ORDER,
  dispositionFor,
  dispositionLabel,
  type Lang,
} from './casesVocab'

export interface DispositionCount {
  legal_status: string
  count: number
}

export function DispositionBand({
  counts,
  activeStatus,
  onSelect,
  lang,
}: {
  counts: DispositionCount[]
  activeStatus: string | null
  onSelect: (status: string | null) => void
  lang: Lang
}) {
  const byStatus = new Map(counts.map((c) => [c.legal_status, c.count]))
  const ordered = DISPOSITION_ORDER.filter((s) => (byStatus.get(s) ?? 0) > 0)
  const total = ordered.reduce((a, s) => a + (byStatus.get(s) ?? 0), 0)
  if (!total) return null

  const convictedCount = byStatus.get('convicted') ?? 0

  return (
    <figure className="mt-5 mb-1" aria-label={
      lang === 'es'
        ? `Resolución judicial de ${total} casos documentados`
        : `Judicial outcome of ${total} documented cases`
    }>
      {/* Label row */}
      <div
        className="flex items-baseline justify-between gap-3 mb-2 font-mono uppercase"
        style={{ fontSize: 13, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
      >
        <span>
          {lang === 'es'
            ? `Resolución judicial de ${total} casos`
            : `Judicial outcome of ${total} cases`}
        </span>
        <span style={{ fontSize: 12, letterSpacing: '0.14em' }}>
          {lang === 'es' ? 'elige una resolución para filtrar' : 'select an outcome to filter'}
        </span>
      </div>

      {/* The band */}
      <div className="flex w-full" style={{ height: 24, gap: 2 }} aria-hidden="true">
        {ordered.map((status) => {
          const n = byStatus.get(status) ?? 0
          const meta = dispositionFor(status)
          const active = activeStatus === status
          const label = dispositionLabel(status, lang)
          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelect(active ? null : status)}
              tabIndex={-1}
              aria-hidden="true"
              className="relative transition-opacity"
              style={{
                width: `${(n / total) * 100}%`,
                minWidth: 6,
                background: meta.ring ? 'transparent' : meta.fill,
                border: meta.ring
                  ? '1.5px solid var(--color-accent)'
                  : active
                    ? '1px solid var(--color-text-primary)'
                    : 'none',
                opacity: activeStatus && !active ? 0.35 : 0.92,
                cursor: 'pointer',
              }}
              title={`${label} · ${n}`}
            />
          )
        })}
      </div>

      {/* Legend line — only statuses present, counts inline */}
      <figcaption
        className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono uppercase"
        style={{ fontSize: 13, letterSpacing: '0.14em' }}
      >
        {ordered.map((status) => {
          const meta = dispositionFor(status)
          const n = byStatus.get(status) ?? 0
          const active = activeStatus === status
          // Dim by ink, never by opacity — an opacity-dimmed label drops below
          // the contrast floor (Bible §3.10 / D5 audit).
          const dimmed = activeStatus != null && !active
          const label = dispositionLabel(status, lang)
          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelect(active ? null : status)}
              aria-pressed={active}
              className="inline-flex items-center gap-1.5 min-h-6 px-0.5 uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              style={{
                letterSpacing: 'inherit',
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: meta.ring ? 'transparent' : meta.fill,
                  border: meta.ring ? '1.5px solid var(--color-accent)' : 'none',
                  flexShrink: 0,
                }}
              />
              <span style={{ color: dimmed ? 'var(--color-text-muted)' : meta.ink, fontWeight: 600 }}>
                {label}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{n}</span>
            </button>
          )
        })}
        {convictedCount === 1 && (
          <span
            className="inline-flex items-center gap-1"
            style={{ color: 'var(--color-accent)', fontWeight: 600, fontStyle: 'normal', textTransform: 'none', letterSpacing: '0.02em', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 12 }}
          >
            ← {lang === 'es' ? 'la única condena' : 'the lone conviction'}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
