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
 * Segments are buttons: clicking one filters the docket (?status=...).
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
        style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
      >
        <span>
          {lang === 'es'
            ? `Resolución judicial de ${total} casos`
            : `Judicial outcome of ${total} cases`}
        </span>
        <span className="hidden sm:inline">
          {lang === 'es' ? 'clic en un segmento para filtrar' : 'click a segment to filter'}
        </span>
      </div>

      {/* The band */}
      <div className="flex w-full" style={{ height: 18, gap: 1 }}>
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
              className="relative transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
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
              aria-label={`${label} · ${n}`}
              aria-pressed={active}
              title={`${label} · ${n}`}
            />
          )
        })}
      </div>

      {/* Legend line — only statuses present, counts inline */}
      <figcaption
        className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono uppercase"
        style={{ fontSize: 9.5, letterSpacing: '0.14em' }}
      >
        {ordered.map((status) => {
          const meta = dispositionFor(status)
          const n = byStatus.get(status) ?? 0
          return (
            <span key={status} className="inline-flex items-center gap-1.5">
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
              <span style={{ color: meta.ink, fontWeight: 600 }}>
                {dispositionLabel(status, lang)}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{n}</span>
            </span>
          )
        })}
        {convictedCount === 1 && (
          <span
            className="inline-flex items-center gap-1"
            style={{ color: 'var(--color-accent)', fontWeight: 600, fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.02em', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 12 }}
          >
            ← {lang === 'es' ? 'la única condena' : 'the lone conviction'}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
