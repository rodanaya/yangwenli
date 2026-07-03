import { Link } from 'react-router-dom'
import type { Story } from '@/lib/atlas-stories'

interface CartaItinerariosProps {
  stories: Story[]
  activeStoryId: string | null
  onOpen: (storyId: string) => void
  lang: 'en' | 'es'
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

export function CartaItinerarios({ stories, activeStoryId, onOpen, lang }: CartaItinerariosProps) {
  return (
    <section
      className="py-5"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div
        className="font-mono uppercase tracking-[0.18em] text-text-muted mb-3"
        style={{ fontSize: '12px' }}
      >
        {lang === 'en'
          ? '§ THE ITINERARIES · THREE GUIDED ROUTES ACROSS THE SURVEY'
          : '§ LOS ITINERARIOS · TRES RECORRIDOS GUIADOS POR LA CARTA'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stories.map((story, i) => {
          const isActive = activeStoryId === story.id
          const roman = ROMAN[i] ?? String(i + 1)
          const chapterWord =
            lang === 'en'
              ? `${story.chapters.length} chapters`
              : `${story.chapters.length} capítulos`

          return (
            <button
              key={story.id}
              type="button"
              onClick={() => onOpen(story.id)}
              aria-pressed={isActive}
              aria-label={
                lang === 'en'
                  ? `Play itinerary: ${story.title.en}`
                  : `Reproducir itinerario: ${story.title.es}`
              }
              className="text-left p-3 transition-shadow hover:shadow-md"
              style={{
                border: '1px solid var(--color-border)',
                borderLeft: `2px solid ${story.accent}`,
                background: 'var(--color-surface, transparent)',
              }}
            >
              <div className="font-mono mb-1.5" style={{ fontSize: '13px' }}>
                <span style={{ color: story.accent }}>
                  {lang === 'en' ? `ITINERARY ${roman}` : `ITINERARIO ${roman}`}
                </span>
                <span className="text-text-muted">
                  {' · '}
                  {chapterWord}
                  {' · '}
                  {story.duration}
                </span>
              </div>

              <div
                className="mb-1.5 text-text-primary"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontWeight: 600,
                  fontSize: '17px',
                  lineHeight: 1.25,
                }}
              >
                {story.title[lang]}
              </div>

              <div
                className="font-mono text-text-muted mb-2"
                style={{
                  fontSize: '9.5px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {story.blurb[lang]}
              </div>

              <div className="font-mono" style={{ fontSize: '9.5px', color: story.accent }}>
                {isActive
                  ? lang === 'en'
                    ? '● playing'
                    : '● en curso'
                  : lang === 'en'
                    ? 'Play the route →'
                    : 'Reproducir recorrido →'}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-right">
        <Link
          to="/journalists"
          className="font-mono text-text-muted hover:text-text-primary"
          style={{ fontSize: '9.5px' }}
        >
          {lang === 'en'
            ? 'the long-form investigations →'
            : 'las investigaciones de fondo →'}
        </Link>
      </div>
    </section>
  )
}
