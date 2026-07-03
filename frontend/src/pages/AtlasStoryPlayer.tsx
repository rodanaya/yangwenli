/**
 * AtlasStoryPlayer — dedicated story player route.
 * URL: /atlas/stories/:slug
 *
 * UX-3 from the Atlas fix queue. Stories no longer play on top of the full
 * galaxy — they get a dedicated two-panel layout where the constellation IS
 * the main content, locked to the chapter's cluster state.
 *
 * Layout: [1fr canvas | 380px story panel] on desktop. Single column on mobile.
 * The chart zone follows NYT Upshot style — chart IS the evidence, chapter
 * body provides context.
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  ConcentrationConstellation,
  type ConstellationRiskRow,
} from '@/components/charts/ConcentrationConstellation'
import { AtlasContextProvider } from '@/components/atlas/AtlasContext'
import { ATLAS_STORIES } from '@/lib/atlas-stories'

// Fixed risk rows — representative v0.8.5 distribution
const STATIC_ROWS: ConstellationRiskRow[] = [
  { level: 'critical', count: 162648,  pct: 5.2  },
  { level: 'high',     count: 184177,  pct: 5.9  },
  { level: 'medium',   count: 506748,  pct: 16.2 },
  { level: 'low',      count: 2197721, pct: 72.7 },
]

export function AtlasStoryPlayer() {
  const { slug } = useParams<{ slug: string }>()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()

  const story = useMemo(() => ATLAS_STORIES.find((s) => s.id === slug), [slug])
  const [chapterIdx, setChapterIdx] = useState(0)

  if (!story) {
    return (
      <div className="flex items-center justify-center h-64">
        <p
          className="font-mono text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Story not found: {slug}
        </p>
      </div>
    )
  }

  const chapter = story.chapters[chapterIdx]
  // StoryChapter stores the pinned cluster code in chapter.state.pinnedCode
  const pinnedCode = chapter?.state?.pinnedCode ?? null
  const highlightedCodes: string[] = pinnedCode ? [pinnedCode] : []

  return (
    <AtlasContextProvider
      initialState={{
        lens: chapter?.state?.mode ?? 'patterns',
        yearIndex: 17,
        riskFloor: 'all',
        pinnedCode,
      }}
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_380px]"
        style={{
          height: 'calc(100vh - var(--topbar-h, 64px))',
          background: 'var(--color-background)',
        }}
      >
        {/* Constellation canvas */}
        <div
          className="relative overflow-hidden border-r border-border min-h-[300px]"
        >
          <ConcentrationConstellation
            mode={chapter?.state?.mode ?? 'patterns'}
            rows={STATIC_ROWS}
            totalContracts={3051294}
            highlightedClusterCodes={highlightedCodes}
            pinnedCode={pinnedCode}
          />

          {/* Chapter kicker overlay */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div
              className="text-[13px] font-mono uppercase tracking-[0.18em] mb-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {lang === 'en'
                ? `Chapter ${chapterIdx + 1} of ${story.chapters.length}`
                : `Capítulo ${chapterIdx + 1} de ${story.chapters.length}`}
            </div>
            {chapter && (
              <div
                className="text-[13px] font-serif font-bold leading-tight"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--color-text-primary)',
                  maxWidth: 300,
                }}
              >
                {lang === 'en' ? chapter.title.en : chapter.title.es}
              </div>
            )}
          </div>
        </div>

        {/* Story panel */}
        <aside
          className="flex flex-col overflow-hidden"
          style={{ background: 'var(--color-background-card)' }}
        >
          {/* Story header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div
                  className="text-[13px] font-mono uppercase tracking-[0.16em] mb-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {lang === 'en' ? 'INVESTIGATIVE STORY' : 'HISTORIA DE INVESTIGACIÓN'}
                </div>
                <h1
                  className="font-serif font-extrabold text-[16px] leading-[1.2]"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {lang === 'en' ? story.title.en : story.title.es}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigate('/atlas')}
                className="flex-shrink-0 p-1.5 rounded-sm transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={lang === 'en' ? 'Close story' : 'Cerrar historia'}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Chapter progress dots */}
            <div className="flex items-center gap-1.5 mt-3">
              {story.chapters.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChapterIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === chapterIdx ? 16 : 6,
                    height: 6,
                    background:
                      i === chapterIdx
                        ? story.accent
                        : 'var(--color-border)',
                  }}
                  aria-label={
                    lang === 'en' ? `Chapter ${i + 1}` : `Capítulo ${i + 1}`
                  }
                  aria-current={i === chapterIdx ? 'true' : undefined}
                />
              ))}
            </div>
          </div>

          {/* Chapter content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {chapter && (
              <>
                {/* Year label */}
                <div
                  className="font-mono text-[12px] uppercase tracking-[0.15em] mb-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {lang === 'en' ? chapter.yearLabel.en : chapter.yearLabel.es}
                </div>

                <h2
                  className="font-serif font-bold text-[18px] leading-[1.2] mb-3"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {lang === 'en' ? chapter.title.en : chapter.title.es}
                </h2>

                {/* Pull stat (optional) */}
                {chapter.pull && (
                  <div
                    className="mb-4 p-3 border-l-2"
                    style={{
                      borderLeftColor: story.accent,
                      background: 'var(--color-background)',
                    }}
                  >
                    <div
                      className="font-serif font-extrabold text-[32px] tabular-nums leading-none"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontWeight: 800,
                        fontStyle: 'normal',
                        color: story.accent,
                      }}
                    >
                      {lang === 'en' ? chapter.pull.value.en : chapter.pull.value.es}
                    </div>
                    <div
                      className="text-[13px] mt-1 font-mono"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {lang === 'en' ? chapter.pull.caption.en : chapter.pull.caption.es}
                    </div>
                  </div>
                )}

                {/* Body */}
                <p
                  className="text-[13px] leading-relaxed"
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body, system-ui)',
                  }}
                >
                  {lang === 'en' ? chapter.body.en : chapter.body.es}
                </p>
              </>
            )}
          </div>

          {/* Chapter navigation */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
              disabled={chapterIdx === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-mono uppercase tracking-[0.1em] disabled:opacity-40"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'en' ? 'Prev' : 'Anterior'}
            </button>

            <span
              className="text-[12px] font-mono tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {chapterIdx + 1} / {story.chapters.length}
            </span>

            {chapterIdx < story.chapters.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setChapterIdx((i) =>
                    Math.min(story.chapters.length - 1, i + 1),
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-mono uppercase tracking-[0.1em]"
                style={{
                  background: story.accent,
                  color: 'var(--color-background)',
                  border: `1px solid ${story.accent}`,
                }}
              >
                {lang === 'en' ? 'Next' : 'Siguiente'}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <Link
                to="/atlas"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-mono uppercase tracking-[0.1em]"
                style={{
                  background: story.accent,
                  color: 'var(--color-background)',
                }}
              >
                {lang === 'en' ? 'Explore' : 'Explorar'}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </AtlasContextProvider>
  )
}

export default AtlasStoryPlayer
