/**
 * StoryInfographic — "La Historia en Datos"
 *
 * A 5-slide interactive infographic embedded in the Dashboard.
 * Fern/NYT style: dark panel, Playfair Display serif, animated number
 * reveals, mini data visuals, auto-advance every 8s.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

// ---------------------------------------------------------------------------
// Slide definitions — static data, no API needed
// ---------------------------------------------------------------------------

interface Slide {
  id: string
  chapter: string           // e.g. "01 / 05"
  statRaw: number           // numeric for count-up
  statPrefix?: string
  statSuffix?: string
  statDecimals?: number
  statLabel: string
  headline: string
  body: string
  color: string             // accent color
  visual: 'bar-trend' | 'dot-grid' | 'ring' | 'bar-sector' | 'flag-list'
  visualData?: number[]     // bar heights 0-100, ring pct, etc.
  visualLabels?: string[]
  source: string
}

function getSlides(t: TFunction): Slide[] {
  return [
    {
      id: 'da-record',
      chapter: '01 / 05',
      statRaw: 81.9,
      statSuffix: '%',
      statDecimals: 1,
      statLabel: t('stories.daRecord.statLabel'),
      headline: t('stories.daRecord.headline'),
      body: t('stories.daRecord.body'),
      color: '#ef4444',
      visual: 'bar-trend',
      visualData: [62.7, 68.4, 73.1, 76.2, 77.8, 78.1, 80.0, 79.1, 81.9],
      visualLabels: ["'10", "'13", "'16", "'18", "'19", "'20", "'21", "'22", "'23"],
      source: 'COMPRANET 2002-2025 · RUBLI v0.6.5',
    },
    {
      id: 'ghost-companies',
      chapter: '02 / 05',
      statRaw: 1253,
      statLabel: t('stories.ghostCompanies.statLabel'),
      headline: t('stories.ghostCompanies.headline'),
      body: t('stories.ghostCompanies.body'),
      color: '#f97316',
      visual: 'dot-grid',
      visualData: [1253],
      source: 'Ghost Company Companion · RUBLI heurística',
    },
    {
      id: 'segalmex',
      chapter: '03 / 05',
      statRaw: 15,
      statPrefix: '$',
      statSuffix: 'B',
      statLabel: t('stories.segalmex.statLabel'),
      headline: t('stories.segalmex.headline'),
      body: t('stories.segalmex.body'),
      color: '#eab308',
      visual: 'bar-sector',
      visualData: [93.4, 78.9, 80.0, 71.2, 65.3],
      visualLabels: ['Agric.', 'Salud', 'Gob.', 'Infra.', 'Otros'],
      source: 'ASF · COMPRANET · RUBLI caso #2',
    },
    {
      id: 'efos',
      chapter: '04 / 05',
      statRaw: 13960,
      statLabel: t('stories.efos.statLabel'),
      headline: t('stories.efos.headline'),
      body: t('stories.efos.body'),
      color: '#8b5cf6',
      visual: 'flag-list',
      visualData: [13960, 544, 23704, 692],
      visualLabels: ['EFOS SAT', 'SFP sancionados', 'RUPC excluidos', 'ASF observaciones'],
      source: 'SAT art. 69-B · SFP · RUPC · ASF — marzo 2026',
    },
    {
      id: 'risk-model',
      chapter: '05 / 05',
      statRaw: 412845,
      statLabel: t('stories.riskModel.statLabel'),
      headline: t('stories.riskModel.headline'),
      body: t('stories.riskModel.body'),
      color: '#dc2626',
      visual: 'ring',
      visualData: [6.0, 7.5, 26.8, 59.7],
      visualLabels: ['Crítico 6.0%', 'Alto 7.5%', 'Medio 26.8%', 'Bajo 59.7%'],
      source: 'RUBLI modelo v0.6.5 · 3,051,294 contratos',
    },
  ]
}

const RING_COLORS = ['#dc2626', '#ea580c', '#eab308', '#16a34a']
const AUTO_MS = 8000

// ---------------------------------------------------------------------------
// Mini visuals
// ---------------------------------------------------------------------------

const BAR_MAX_PX = 64  // px height for 100%

function BarTrend({ data, labels, color, active }: { data: number[]; labels: string[]; color: string; active: boolean }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1 w-full" style={{ height: BAR_MAX_PX + 16 }}>
      {data.map((v, i) => {
        const px = Math.round((v / max) * BAR_MAX_PX)
        const isLast = i === data.length - 1
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <motion.div
              className="w-full rounded-t-sm"
              style={{ backgroundColor: isLast ? color : 'rgba(255,255,255,0.18)' }}
              initial={{ height: 0 }}
              animate={{ height: active ? px : 0 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="text-[9px] text-zinc-500 font-mono">{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function DotGrid({ count, color, active }: { count: number; color: string; active: boolean }) {
  // Show up to 200 dots representing the 1253 companies
  const dots = Math.min(count, 200)
  return (
    <div className="flex flex-wrap gap-[3px] content-start h-20 overflow-hidden">
      {Array.from({ length: dots }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[6px] h-[6px] rounded-full"
          style={{ backgroundColor: color }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: active ? 0.85 : 0, scale: active ? 1 : 0 }}
          transition={{ duration: 0.2, delay: active ? i * 0.004 : 0 }}
        />
      ))}
    </div>
  )
}

function BarSector({ data, labels, color, active }: { data: number[]; labels: string[]; color: string; active: boolean }) {
  const max = 100
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-500 font-mono w-9 shrink-0">{labels[i]}</span>
          <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: i === 0 ? color : 'rgba(255,255,255,0.2)' }}
              initial={{ width: 0 }}
              animate={{ width: active ? `${(v / max) * 100}%` : 0 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-[9px] text-zinc-400 font-mono w-8 text-right">{v}%</span>
        </div>
      ))}
    </div>
  )
}

function FlagList({ data, labels, color, active }: { data: number[]; labels: string[]; color: string; active: boolean }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">{labels[i]}</span>
          <motion.span
            className="text-sm font-bold font-mono tabular-nums"
            style={{ color: i === 0 ? color : 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : 8 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            {v.toLocaleString()}
          </motion.span>
        </div>
      ))}
    </div>
  )
}

function RingChart({ data, labels, active }: { data: number[]; labels: string[]; active: boolean }) {
  const size = 80
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  const segments = data.map((pct, i) => {
    const dash = (pct / 100) * circ
    const seg = { pct, dash, offset, color: RING_COLORS[i] }
    offset += dash
    return seg
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        {segments.map((seg, i) => (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
            strokeDashoffset={circ / 4 - seg.offset}
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0 }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        {labels.map((l, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : -6 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RING_COLORS[i] }} />
            <span className="text-[10px] text-zinc-400">{l}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SlideVisual({ slide, active }: { slide: Slide; active: boolean }) {
  const { visual, visualData = [], visualLabels = [], color } = slide
  if (visual === 'bar-trend')  return <BarTrend  data={visualData} labels={visualLabels} color={color} active={active} />
  if (visual === 'dot-grid')   return <DotGrid   count={visualData[0]} color={color} active={active} />
  if (visual === 'bar-sector') return <BarSector data={visualData} labels={visualLabels} color={color} active={active} />
  if (visual === 'flag-list')  return <FlagList  data={visualData} labels={visualLabels} color={color} active={active} />
  if (visual === 'ring')       return <RingChart data={visualData} labels={visualLabels} active={active} />
  return null
}

// ---------------------------------------------------------------------------
// Animated stat number (resets when slide changes)
// ---------------------------------------------------------------------------

function StatNumber({ slide, active }: { slide: Slide; active: boolean }) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!active) { setDisplay(0); return }
    const target = slide.statRaw
    const duration = 1400
    let start: number | null = null

    const tick = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      // ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(parseFloat((target * eased).toFixed(slide.statDecimals ?? 0)))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
      else setDisplay(target)
    }

    // small delay so the slide is visible first
    const timer = setTimeout(() => { frameRef.current = requestAnimationFrame(tick) }, 200)
    return () => { clearTimeout(timer); cancelAnimationFrame(frameRef.current) }
  }, [slide, active])

  const formatted = slide.statDecimals
    ? display.toFixed(slide.statDecimals)
    : Math.round(display).toLocaleString()

  return (
    <span className="font-mono tabular-nums">
      {slide.statPrefix ?? ''}{formatted}{slide.statSuffix ?? ''}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StoryInfographic() {
  const { t } = useTranslation('dashboard')
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [direction, setDirection] = useState(1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slides = useMemo(() => getSlides(t), [t])

  const go = useCallback((next: number) => {
    setDirection(next > idx ? 1 : -1)
    setIdx(next)
  }, [idx])

  const prev = () => go((idx - 1 + slides.length) % slides.length)
  const goNext = useCallback(() => {
    setDirection(1)
    setIdx(i => (i + 1) % slides.length)
  }, [slides.length])

  // auto-advance — goNext uses functional setIdx so interval never needs to reset on idx change
  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(goNext, AUTO_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, goNext])

  const slide = slides[idx]

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-zinc-800 bg-zinc-950"
      style={{ fontFamily: 'var(--font-family-sans)' }}
    >
      {/* Colored top accent line */}
      <motion.div
        className="h-[3px] w-full"
        animate={{ backgroundColor: slide.color }}
        transition={{ duration: 0.5 }}
      />

      <div className="p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-mono">
            {t('storyCarouselTitle')}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPlaying(p => !p)}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label={playing ? t('pauseCarousel') : t('playCarousel')}
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button onClick={prev} className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors" aria-label={t('prevSlide')}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={goNext} className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors" aria-label={t('nextSlide')}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Chapter tag + stat */}
            <div className="mb-3">
              <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">{slide.chapter}</span>
              <div
                className="text-4xl sm:text-5xl font-black leading-none mt-1 mb-1"
                style={{ color: slide.color, fontFamily: 'var(--font-family-serif)' }}
              >
                <StatNumber slide={slide} active={true} />
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">{slide.statLabel}</div>
            </div>

            {/* Headline */}
            <h3
              className="text-base sm:text-lg font-bold text-zinc-100 leading-snug mb-2"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {slide.headline}
            </h3>

            {/* Body */}
            <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
              {slide.body}
            </p>

            {/* Visual */}
            <div className="mb-4">
              <SlideVisual slide={slide} active={true} />
            </div>

            {/* Source */}
            <div className="text-[9px] text-zinc-700 font-mono border-t border-zinc-900 pt-2">
              {t('stories.source')}: {slide.source}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i)}
              aria-label={t('stories.goToSlide', { n: i + 1 })}
              className="relative h-1.5 rounded-full transition-all duration-300 overflow-hidden"
              style={{ width: i === idx ? 24 : 8, backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              {i === idx && playing && (
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: slide.color }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: AUTO_MS / 1000, ease: 'linear' }}
                  key={`${slide.id}-progress`}
                />
              )}
              {i === idx && !playing && (
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: slide.color }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
