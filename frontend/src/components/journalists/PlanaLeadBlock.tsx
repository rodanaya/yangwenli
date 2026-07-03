// ---------------------------------------------------------------------------
// PlanaLeadBlock — the A1 lead and the off-lead, straight off a broadsheet.
//
// Lead (8 of 12 cols): 4px section-color left rule, big Playfair headline.
// Off-lead (4 of 12 cols): separated by a single 1px column hairline — no
// second color rule (the kicker carries the color). Stacks under the lead on
// narrow viewports behind a horizontal hairline. Each block is a whole-card
// <Link> to /stories/:slug; the tour badge nests inside and stops propagation.
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom'
import { AgateRubric, PlanaTourBadge, type PlanaStory } from './plana-parts'

export function PlanaLeadBlock({
  lead,
  offLead,
  lang,
}: {
  lead: PlanaStory
  offLead: PlanaStory | null
  lang: 'en' | 'es'
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-10 pt-8 sm:pt-10">
      {/* LEAD */}
      <Link
        to={`/stories/${lead.slug}`}
        className={`group block ${offLead ? 'lg:col-span-8' : 'lg:col-span-12'}`}
        style={{ borderLeft: `4px solid ${lead.color}`, paddingLeft: 'clamp(20px, 3vw, 36px)' }}
      >
        <div
          className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: lead.color }}
        >
          {lead.typeLabel}
        </div>
        <h2
          className="text-text-primary group-hover:underline decoration-1 underline-offset-[6px]"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(30px, 4.2vw, 50px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {lead.headline}
        </h2>
        <p
          className="mt-4 max-w-3xl text-text-secondary"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(18px, 1.6vw, 21px)', lineHeight: 1.5 }}
        >
          {lead.brief}
        </p>
        <AgateRubric story={lead} />
        <PlanaTourBadge slug={lead.slug} accent={lead.color} lang={lang} className="mt-4" />
      </Link>

      {/* OFF-LEAD */}
      {offLead && (
        <Link
          to={`/stories/${offLead.slug}`}
          className="group block lg:col-span-4 border-t border-border pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border lg:pl-8"
        >
          <div
            className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: offLead.color }}
          >
            {offLead.typeLabel}
          </div>
          <h3
            className="text-text-primary group-hover:underline decoration-1 underline-offset-[5px]"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(22px, 2.2vw, 26px)',
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
            }}
          >
            {offLead.headline}
          </h3>
          <p
            className="mt-3 text-text-secondary line-clamp-4"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '15px', lineHeight: 1.5 }}
          >
            {offLead.brief}
          </p>
          <AgateRubric story={offLead} />
          <PlanaTourBadge slug={offLead.slug} accent={offLead.color} lang={lang} className="mt-4" />
        </Link>
      )}
    </div>
  )
}
