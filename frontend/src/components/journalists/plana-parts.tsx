// ---------------------------------------------------------------------------
// La Primera Plana — shared front-page parts
//
// Voice sibling of «Fe de arqueo» / «Fe de carta» / «El Croquis»: the newsroom
// index read as an actual investigative front page. These are the two shared
// micro-parts every plate uses — the Atlas tour badge and the agate rubric —
// plus the one story shape the page maps into.
//
// Discipline: NO dot-grids, NO charts, NO SVG, NO stat-meters. Section colors
// arrive pre-resolved as hex props and are applied ONLY through `style` (lint
// flags hex in className, never in style). Status is shown by INK WEIGHT, never
// color — there is no green anywhere (§3.10).
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom'
import { findStoryByLongformSlug } from '@/lib/atlas-stories'

/** One localized story, pre-shaped by the page so the parts are pure renderers. */
export interface PlanaStory {
  slug: string
  headline: string
  brief: string
  color: string // getNewsTypeColor(type) — a hex, applied via style only
  typeLabel: string // localized, sentence-case (uppercased in CSS)
  statusLabel: string // t(`status.${status}`) — PROSECUTED / REPORTED / DATA LEAD …
  statusRank: 'consequence' | 'reported' | 'lead' // drives the ink-weight ladder
  eraLabel: string // t(`eraLabel.${era}`) — carries its own year range
  contractsLabel: string | null // "1,049,729 CONTRACTS" — lead/off-lead only
}

// ---------------------------------------------------------------------------
// PlanaTourBadge — surfaces the matching Atlas tour (revived; renders nothing
// unless the slug binds a longform tour). It is a SIBLING of the headline's
// stretched story link, never a descendant of it — an <a> inside an <a> is
// invalid HTML and gives assistive tech a link it cannot reach. Call sites
// pass `relative z-10` so the badge sits above the stretched link's ::after
// overlay and takes its own clicks without needing stopPropagation.
// ---------------------------------------------------------------------------

export function PlanaTourBadge({
  slug,
  accent,
  lang,
  className,
}: {
  slug: string
  accent: string
  lang: 'en' | 'es'
  className?: string
}) {
  const tour = findStoryByLongformSlug(slug)
  if (!tour) return null
  return (
    <Link
      to={`/atlas?story=${tour.id}`}
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] text-[10px] font-mono font-bold tracking-[0.12em] rounded-sm border transition-opacity hover:opacity-80${className ? ' ' + className : ''}`}
      style={{ borderColor: `${accent}55`, color: accent, background: `${accent}0d` }}
      aria-label={
        lang === 'en'
          ? `${tour.duration} Atlas tour: ${tour.title.en}`
          : `Tour de ${tour.duration} en El Atlas: ${tour.title.es}`
      }
    >
      <span aria-hidden="true">◆</span>
      <span>{lang === 'en' ? `${tour.duration} TOUR · ATLAS` : `TOUR ${tour.duration} · ATLAS`}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// AgateRubric — one line of agate type under each story: the reporting status
// (distance-to-consequence, shown in ink weight), the era, and — on the lead
// and off-lead only — the contract count. No axis, no fill, no color-coding.
// ---------------------------------------------------------------------------

export function AgateRubric({ story }: { story: PlanaStory }) {
  const statusCls =
    story.statusRank === 'consequence'
      ? 'text-text-primary font-bold'
      : story.statusRank === 'reported'
        ? 'text-text-secondary font-normal'
        : 'text-text-muted'
  const dot = <span className="text-text-muted opacity-40" aria-hidden="true">·</span>
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-mono uppercase tracking-[0.14em] tabular-nums">
      <span className={statusCls}>{story.statusLabel}</span>
      {dot}
      <span className="text-text-muted">{story.eraLabel}</span>
      {story.contractsLabel && (
        <>
          {dot}
          <span className="text-text-muted">{story.contractsLabel}</span>
        </>
      )}
    </div>
  )
}
