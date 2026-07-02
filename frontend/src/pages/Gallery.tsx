/**
 * Gallery — "La Galería" (2026-06-27).
 *
 * A grid of every long-form story rendered as a watchable, auto-playing motion
 * explainer (≤ 2:40 each). The player is data-driven from story-content.ts, so
 * all 13 work; El Apagón is the tuned showcase.
 *
 *   /gallery        → the grid
 *   /gallery/:slug  → the animated player for one story
 */
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play, ArrowLeft } from 'lucide-react'
import { STORIES, type StoryDef, type StoryOutlet } from '@/lib/story-content'
import { localizeAmount } from '@/lib/utils'
import { StoryAnimationPlayer } from '@/components/gallery/StoryAnimationPlayer'
import { StoryFilm } from '@/components/gallery/StoryFilm'
import { FILMS, type FilmDef } from '@/lib/gallery/films'

const OUTLET_LABEL: Partial<Record<StoryOutlet, { en: string; es: string }>> = {
  investigative: { en: 'Investigation', es: 'Investigación' },
  data_analysis: { en: 'Data analysis', es: 'Análisis de datos' },
}

function outletLabel(outlet: StoryOutlet, lang: 'en' | 'es'): string {
  return OUTLET_LABEL[outlet]?.[lang] ?? outlet.replace('_', ' ')
}

function storyHeadline(s: StoryDef, lang: 'en' | 'es'): string {
  return (lang === 'es' ? s.headline_es : s.headline) ?? s.headline
}

function StoryCard({ s, lang }: { s: StoryDef; lang: 'en' | 'es' }) {
  const label = lang === 'es' ? (s.leadStat.label_es ?? s.leadStat.label) : s.leadStat.label
  return (
    <Link
      to={`/gallery/${s.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-text-muted"
    >
      <div className="h-1 w-full" style={{ backgroundColor: s.leadStat.color }} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted">
          <span>{outletLabel(s.outlet, lang)}</span>
          <span>
            {s.chapters.length} {lang === 'es' ? 'cap.' : 'ch.'} · ≤2:40
          </span>
        </div>
        <h3 className="mt-2 line-clamp-3 font-serif text-base font-bold leading-snug text-text-primary">
          {storyHeadline(s, lang)}
        </h3>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div className="min-w-0">
            <div
              className="text-2xl leading-none tabular-nums"
              style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontStyle: 'italic', fontWeight: 800, color: s.leadStat.color }}
            >
              {localizeAmount(s.leadStat.value, lang)}
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-text-muted">{label}</div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary transition-colors group-hover:border-text-muted group-hover:text-text-primary">
            <Play className="h-3 w-3" /> {lang === 'es' ? 'Ver' : 'Watch'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function FilmCard({ f, lang }: { f: FilmDef; lang: 'en' | 'es' }) {
  return (
    <Link to={`/gallery/${f.slug}`} className="group flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-text-muted">
      <div className="h-1 w-full" style={{ backgroundColor: f.palette.accent }} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: f.palette.accent }}>
          <span>{lang === 'es' ? 'Reportaje · película' : 'Animated film'}</span>
          <span className="text-text-muted">{f.beats.length} {lang === 'es' ? 'cap.' : 'ch.'} · ≤2:40</span>
        </div>
        <h3 className="mt-2 font-serif text-lg font-bold leading-snug text-text-primary">{lang === 'es' ? f.title.es : f.title.en}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-muted">{lang === 'es' ? f.subtitle.es : f.subtitle.en}</p>
        <div className="mt-auto flex items-center justify-end pt-4">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ backgroundColor: f.palette.accent, color: 'white' }}>
            <Play className="h-3 w-3" /> {lang === 'es' ? 'Ver' : 'Watch'}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function Gallery() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'

  const story = useMemo(() => (slug ? STORIES.find((s) => s.slug === slug) : undefined), [slug])
  const filmDef = useMemo(() => (slug ? FILMS[slug] : undefined), [slug])

  // ── Player view ──
  if (slug) {
    if (!story && !filmDef) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-text-secondary">{lang === 'es' ? 'Reportaje no encontrado.' : 'Story not found.'}</p>
          <Link to="/gallery" className="mt-4 inline-block font-mono text-xs text-accent hover:underline">
            ← {lang === 'es' ? 'Volver a La Galería' : 'Back to the Gallery'}
          </Link>
        </div>
      )
    }
    const others = STORIES.filter((s) => s.slug !== slug).slice(0, 3)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Link
          to="/gallery"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {lang === 'es' ? 'La Galería' : 'The Gallery'}
        </Link>

        {filmDef ? (
          <StoryFilm
            key={slug}
            film={filmDef}
            lang={lang}
            onOpenFull={story ? () => navigate(`/stories/${story.slug}`) : undefined}
          />
        ) : story ? (
          <StoryAnimationPlayer
            key={slug}
            story={story}
            lang={lang}
            onClose={() => navigate('/gallery')}
            onOpenFull={() => navigate(`/stories/${story.slug}`)}
          />
        ) : null}

        <div className="mt-8">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">
            {lang === 'es' ? 'Sigue viendo' : 'Keep watching'}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {others.map((s) => (
              <StoryCard key={s.slug} s={s} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Grid view ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-border pb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">
          {lang === 'es' ? 'Reportajes animados · ≤ 2:40' : 'Animated reports · ≤ 2:40'}
        </div>
        <h1
          className="mt-2 text-text-primary"
          style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 800, fontSize: 'clamp(1.9rem, 5vw, 3rem)', lineHeight: 1.05 }}
        >
          {lang === 'es' ? 'La Galería' : 'The Gallery'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          {lang === 'es'
            ? 'Cada investigación, convertida en un reportaje animado que se sigue fácil — texto y cifras en movimiento, menos de dos minutos y cuarenta segundos. Toca cualquiera para verlo; abre el reportaje completo cuando quieras leer todo.'
            : 'Every investigation, turned into an animated report that’s easy to follow — text and figures in motion, under two minutes forty. Tap any to watch; open the full story whenever you want the whole read.'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(FILMS).filter((f) => !STORIES.some((s) => s.slug === f.slug)).map((f) => (
          <FilmCard key={f.slug} f={f} lang={lang} />
        ))}
        {STORIES.map((s) => (
          <StoryCard key={s.slug} s={s} lang={lang} />
        ))}
      </div>
    </div>
  )
}
