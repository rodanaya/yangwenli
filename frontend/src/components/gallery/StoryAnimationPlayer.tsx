/**
 * StoryAnimationPlayer — "La Galería" (2026-06-27).
 *
 * Turns a long-form StoryDef into an auto-playing, timed motion explainer: each
 * chapter becomes an animated scene (kicker → Playfair title → the pullquote's
 * big stat counting up → the punch-line quote), the whole thing hard-capped at
 * 2:40. Silent + bilingual; the full prose stays on /stories.
 *
 * Data-driven from story-content.ts chapters, so it works for every story; the
 * prototype tunes El Apagón. Controls: play/pause · prev/next · replay, plus a
 * segmented progress strip and an mm:ss readout. Respects reduced-motion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowRight } from 'lucide-react'
import type { StoryDef, StoryChapterDef } from '@/lib/story-content'
import { localizeAmount } from '@/lib/utils'

const MAX_MS = 160_000 // 2:40 hard cap
const INTRO_MS = 6_500
const MIN_SCENE_MS = 16_000
const MAX_SCENE_MS = 30_000

type Lang = 'en' | 'es'

interface Scene {
  id: string
  marker: string // roman numeral
  title: string
  subtitle?: string
  stat?: string
  statLabel?: string
  quote?: string
  durationMs: number
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

function pick(en: string | undefined, es: string | undefined, lang: Lang): string | undefined {
  if (lang === 'es') return es ?? en
  return en
}

/** Convert a story's chapters into timed scenes that sum to ≤ MAX_MS. */
function buildScenes(story: StoryDef, lang: Lang): Scene[] {
  const chapters = story.chapters
  const budget = MAX_MS - INTRO_MS
  const per = Math.max(MIN_SCENE_MS, Math.min(MAX_SCENE_MS, Math.floor(budget / Math.max(1, chapters.length))))
  return chapters.map((ch: StoryChapterDef, i) => {
    const pq = ch.pullquote
    const statRaw = pq?.stat
    return {
      id: ch.id,
      marker: ROMAN[i] ?? String(i + 1),
      title: pick(ch.title, ch.title_es, lang) ?? '',
      subtitle: pick(ch.subtitle, ch.subtitle_es, lang),
      stat: statRaw ? localizeAmount(statRaw, lang) : undefined,
      statLabel: pick(pq?.statLabel, pq?.statLabel_es, lang),
      quote: pick(pq?.quote, pq?.quote_es, lang),
      durationMs: per,
    }
  })
}

/** Is the stat a number we can count up (vs a date / grade / label)? */
function isCountable(stat: string): boolean {
  return /^\$?\s*\d[\d,.\s]*\s*(%|B|M|K|bn|billones?|mil(?:lones)?|MDP|billion|million)?\.?$/i.test(stat.trim())
}

/** Animate a numeric stat from 0 → target while `active`. Non-numeric passes through. */
function AnimatedStat({ stat, active, color }: { stat: string; active: boolean; color: string }) {
  const reduce = useReducedMotion()
  const countable = useMemo(() => isCountable(stat), [stat])
  const [display, setDisplay] = useState(countable && !reduce ? '' : stat)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !countable || reduce) {
      setDisplay(stat)
      return
    }
    const m = stat.trim().match(/^(\D*?)([\d.,]+)(.*)$/)
    if (!m) {
      setDisplay(stat)
      return
    }
    const [, prefix, numStr, suffix] = m
    const decimals = (numStr.split('.')[1] || '').length
    const target = parseFloat(numStr.replace(/,/g, ''))
    const start = performance.now()
    const DURATION = 1500
    const fmt = (v: number) =>
      v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(`${prefix}${fmt(target * eased)}${suffix}`)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [active, countable, reduce, stat])

  return (
    <span
      className="block tabular-nums leading-[0.95]"
      style={{
        color,
        fontFamily: 'var(--font-family-serif, Georgia, serif)',
        fontStyle: 'italic',
        fontWeight: 800,
        fontSize: 'clamp(2.75rem, 9vw, 6rem)',
      }}
    >
      {display || stat}
    </span>
  )
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function StoryAnimationPlayer({
  story,
  lang,
  onClose,
  onOpenFull,
}: {
  story: StoryDef
  lang: Lang
  onClose?: () => void
  onOpenFull?: () => void
}) {
  const reduce = useReducedMotion()
  const accent = story.leadStat.color
  const scenes = useMemo(() => buildScenes(story, lang), [story, lang])
  const totalMs = useMemo(
    () => INTRO_MS + scenes.reduce((a, s) => a + s.durationMs, 0),
    [scenes],
  )

  // phase: -1 = intro · 0..n-1 = scene · n = end card
  const [phase, setPhase] = useState(-1)
  const [playing, setPlaying] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headline = (lang === 'es' ? story.headline_es : story.headline) ?? story.headline

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  // Drive auto-advance.
  useEffect(() => {
    clear()
    if (!playing) return
    if (phase >= scenes.length) return
    const dur = phase < 0 ? INTRO_MS : scenes[phase].durationMs
    timer.current = setTimeout(() => setPhase((p) => p + 1), dur)
    return clear
  }, [phase, playing, scenes])

  const restart = useCallback(() => {
    setPhase(-1)
    setPlaying(true)
  }, [])
  const next = useCallback(() => setPhase((p) => Math.min(scenes.length, p + 1)), [scenes.length])
  const prev = useCallback(() => setPhase((p) => Math.max(-1, p - 1)), [])

  // Keyboard: space = play/pause, arrows = skip, R = replay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key.toLowerCase() === 'r') restart()
      else if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, restart, onClose])

  const atEnd = phase >= scenes.length
  const scene = phase >= 0 && phase < scenes.length ? scenes[phase] : null

  // Elapsed time (for the readout), summed over completed scenes.
  const elapsedMs =
    phase < 0
      ? 0
      : INTRO_MS + scenes.slice(0, Math.min(phase, scenes.length)).reduce((a, s) => a + s.durationMs, 0)

  const transition = reduce ? { duration: 0 } : { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] as const }

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-sidebar">
      {/* keyframes for the active-segment fill */}
      <style>{`@keyframes galleryFill { from { width: 0% } to { width: 100% } }`}</style>

      {/* stage */}
      <div className="relative flex min-h-[64vh] items-center justify-center px-6 py-12 sm:px-12">
        {/* faint grain / vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              'radial-gradient(120% 120% at 80% 0%, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 45%)',
          }}
        />

        <AnimatePresence mode="wait">
          {/* ── intro ── */}
          {phase < 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -14 }}
              transition={transition}
              className="relative z-10 max-w-3xl text-center"
            >
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-text-on-dark-muted">
                {lang === 'es' ? 'La Galería · Reportaje animado' : 'The Gallery · Animated report'}
              </div>
              <h2
                className="text-text-on-dark-primary"
                style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 800, fontSize: 'clamp(1.75rem, 5vw, 3rem)', lineHeight: 1.05 }}
              >
                {headline}
              </h2>
              <div className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-on-dark-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                {story.chapters.length} {lang === 'es' ? 'capítulos' : 'chapters'} · ≤ 2:40
              </div>
            </motion.div>
          )}

          {/* ── chapter scene ── */}
          {scene && (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -18 }}
              transition={transition}
              className="relative z-10 mx-auto max-w-3xl text-center"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="mb-3 font-mono text-[11px] uppercase tracking-[0.32em]"
                style={{ color: accent }}
              >
                § {scene.marker}
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, ...transition }}
                className="text-text-on-dark-primary"
                style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 700, fontSize: 'clamp(1.5rem, 4.5vw, 2.75rem)', lineHeight: 1.08 }}
              >
                {scene.title}
              </motion.h3>

              {scene.subtitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-on-dark-secondary sm:text-base"
                >
                  {scene.subtitle}
                </motion.p>
              )}

              {scene.stat && (
                <motion.div
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.75, duration: 0.5 }}
                  className="mt-8"
                >
                  <AnimatedStat stat={scene.stat} active={!!scene.stat} color={accent} />
                  {scene.statLabel && (
                    <div className="mx-auto mt-3 max-w-md font-mono text-[11px] uppercase tracking-[0.16em] text-text-on-dark-muted">
                      {scene.statLabel}
                    </div>
                  )}
                </motion.div>
              )}

              {scene.quote && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  className="mx-auto mt-8 max-w-xl text-base italic leading-relaxed text-text-on-dark-secondary sm:text-lg"
                  style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)' }}
                >
                  “{scene.quote}”
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ── end card ── */}
          {atEnd && (
            <motion.div
              key="end"
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
              className="relative z-10 max-w-xl text-center"
            >
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-text-on-dark-muted">
                {lang === 'es' ? 'Fin del reportaje' : 'End of report'}
              </div>
              <h2
                className="text-text-on-dark-primary"
                style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: 1.1 }}
              >
                {headline}
              </h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-text-on-dark-primary transition-colors hover:bg-sidebar-hover"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> {lang === 'es' ? 'Repetir' : 'Replay'}
                </button>
                {onOpenFull && (
                  <button
                    onClick={onOpenFull}
                    className="inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-[0.14em]"
                    style={{ backgroundColor: accent, color: 'white' }}
                  >
                    {lang === 'es' ? 'Leer el reportaje' : 'Read the full story'} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── controls ── */}
      <div className="border-t border-border bg-sidebar px-4 py-3">
        {/* segmented progress */}
        <div className="mb-3 flex items-center gap-1">
          {scenes.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-text-on-dark-muted/20">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: accent,
                  width: phase > i ? '100%' : phase < i ? '0%' : undefined,
                  ...(phase === i
                    ? {
                        animationName: 'galleryFill',
                        animationDuration: `${s.durationMs}ms`,
                        animationTimingFunction: 'linear',
                        animationFillMode: 'forwards',
                        animationPlayState: playing ? 'running' : 'paused',
                      }
                    : {}),
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              aria-label={lang === 'es' ? 'Anterior' : 'Previous'}
              className="rounded-sm p-1.5 text-text-on-dark-muted transition-colors hover:bg-sidebar-hover hover:text-text-on-dark-primary"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => (atEnd ? restart() : setPlaying((p) => !p))}
              aria-label={playing ? 'Pause' : 'Play'}
              className="rounded-sm p-1.5 text-text-on-dark-primary transition-colors hover:bg-sidebar-hover"
            >
              {atEnd ? <RotateCcw className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={next}
              aria-label={lang === 'es' ? 'Siguiente' : 'Next'}
              className="rounded-sm p-1.5 text-text-on-dark-muted transition-colors hover:bg-sidebar-hover hover:text-text-on-dark-primary"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="font-mono text-[11px] tabular-nums tracking-wide text-text-on-dark-muted">
            {fmtTime(Math.min(elapsedMs, totalMs))} / {fmtTime(totalMs)}
          </div>
        </div>
      </div>
    </div>
  )
}
