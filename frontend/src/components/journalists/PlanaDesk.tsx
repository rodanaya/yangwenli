// ---------------------------------------------------------------------------
// PlanaDesk — the desk: one ruled list of the remaining stories.
//
// The user's constitution for this page is "just list the stories, like the
// Guardian front page." This is that list, given front-page dress: a § kicker,
// section-color left rules, Playfair headlines, agate rubrics. Ordered by the
// status ladder (advanced cases first, raw data leads last) so the rubric reads
// top-to-bottom — an ORDER, not an invented taxonomy (no sub-headers). Every
// row is a whole-card <Link> to /stories/:slug; nothing is a chart.
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom'
import { AgateRubric, PlanaTourBadge, type PlanaStory } from './plana-parts'

export function PlanaDesk({
  stories,
  lang,
  filtered = false,
}: {
  stories: PlanaStory[]
  lang: 'en' | 'es'
  filtered?: boolean
}) {
  if (stories.length === 0) return null
  const isEs = lang === 'es'
  const n = stories.length
  const word = isEs ? (n === 1 ? 'INVESTIGACIÓN' : 'INVESTIGACIONES') : n === 1 ? 'INVESTIGATION' : 'INVESTIGATIONS'
  const kicker = filtered
    ? `§ ${n} ${word}`
    : isEs
      ? `§ EL SUMARIO · ${n} ${word}`
      : `§ THE DESK · ${n} ${word}`

  return (
    <section className="mt-12 border-t border-text-primary/15 pt-9">
      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-7">{kicker}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {stories.map((s) => (
          <Link
            key={s.slug}
            to={`/stories/${s.slug}`}
            className="group block"
            style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: '16px' }}
          >
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] mb-2" style={{ color: s.color }}>
              {s.typeLabel}
            </div>
            <h3
              className="text-text-primary group-hover:underline decoration-1 underline-offset-[4px]"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: '20px',
                fontWeight: 700,
                lineHeight: 1.18,
                letterSpacing: '-0.01em',
              }}
            >
              {s.headline}
            </h3>
            <p
              className="mt-2 text-text-secondary line-clamp-3"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '15px', lineHeight: 1.45 }}
            >
              {s.brief}
            </p>
            <AgateRubric story={s} />
            <PlanaTourBadge slug={s.slug} accent={s.color} lang={lang} className="mt-3" />
          </Link>
        ))}
      </div>
    </section>
  )
}
