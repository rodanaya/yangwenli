// ---------------------------------------------------------------------------
// PlanaLeadBlock — the A1 lead and the off-lead, straight off a broadsheet.
//
// Lead (8 of 12 cols): 4px section-color left rule, big Playfair headline.
// Off-lead (4 of 12 cols): separated by a single 1px column hairline — no
// second color rule (the kicker carries the color). Stacks under the lead on
// narrow viewports behind a horizontal hairline. Each block is an <article>
// whose headline carries a stretched <Link> to /stories/:slug — its ::after
// covers the card, so the brief and rubric stay clickable while the markup
// stays valid. The tour badge is a sibling of that link, not a descendant.
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
      <article
        className={`group relative block ${offLead ? 'lg:col-span-8' : 'lg:col-span-12'}`}
        style={{ borderLeft: `4px solid ${lead.color}`, paddingLeft: 'clamp(20px, 3vw, 36px)' }}
      >
        <div
          className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: lead.color }}
        >
          {lead.typeLabel}
        </div>
        <h2
          className="text-text-primary"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(30px, 4.2vw, 50px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          <Link
            to={`/stories/${lead.slug}`}
            className="group-hover:underline decoration-1 underline-offset-[6px] after:absolute after:inset-0 after:content-['']"
          >
            {lead.headline}
          </Link>
        </h2>
        <p
          className="mt-4 max-w-3xl text-text-secondary"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(18px, 1.6vw, 21px)', lineHeight: 1.5 }}
        >
          {lead.brief}
        </p>
        <AgateRubric story={lead} />
        <PlanaTourBadge slug={lead.slug} accent={lead.color} lang={lang} className="mt-4 relative z-10" />
      </article>

      {/* OFF-LEAD */}
      {offLead && (
        <article
          className="group relative block lg:col-span-4 border-t border-border pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border lg:pl-8"
        >
          <div
            className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: offLead.color }}
          >
            {offLead.typeLabel}
          </div>
          <h3
            className="text-text-primary"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(22px, 2.2vw, 26px)',
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
            }}
          >
            <Link
              to={`/stories/${offLead.slug}`}
              className="group-hover:underline decoration-1 underline-offset-[5px] after:absolute after:inset-0 after:content-['']"
            >
              {offLead.headline}
            </Link>
          </h3>
          <p
            className="mt-3 text-text-secondary line-clamp-4"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '15px', lineHeight: 1.5 }}
          >
            {offLead.brief}
          </p>
          <AgateRubric story={offLead} />
          <PlanaTourBadge slug={offLead.slug} accent={offLead.color} lang={lang} className="mt-4 relative z-10" />
        </article>
      )}
    </div>
  )
}
