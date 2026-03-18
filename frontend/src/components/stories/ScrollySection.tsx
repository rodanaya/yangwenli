import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ScrollyChapter {
  id: string
  prose: React.ReactNode
  chartHighlight?: string
}

interface ScrollySectionProps {
  chapters: ScrollyChapter[]
  chartComponent: React.ReactNode
  activeChapter?: string
  onChapterChange?: (id: string) => void
  chartPosition?: 'left' | 'right'
  className?: string
}

export default function ScrollySection({
  chapters,
  chartComponent,
  activeChapter: controlledActive,
  onChapterChange,
  chartPosition = 'left',
  className,
}: ScrollySectionProps) {
  const [internalActive, setInternalActive] = useState(chapters[0]?.id || '')
  const activeId = controlledActive ?? internalActive
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  const setChapterRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      chapterRefs.current.set(id, el)
    } else {
      chapterRefs.current.delete(id)
    }
  }, [])

  // IntersectionObserver to detect which chapter is in viewport
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    chapters.forEach(({ id }) => {
      const el = chapterRefs.current.get(id)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setInternalActive(id)
            onChapterChange?.(id)
          }
        },
        {
          threshold: [0.3, 0.5],
          rootMargin: '-20% 0px -40% 0px',
        }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [chapters, onChapterChange])

  const chartPanel = (
    <div
      className="hidden lg:block lg:w-[40%] relative"
      aria-live="polite"
      aria-label="Visualizacion interactiva"
    >
      <div className="sticky top-20 h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            initial={{ opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.6, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full"
          >
            {chartComponent}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  const prosePanel = (
    <div className="w-full lg:w-[60%] relative">
      {/* Mobile: chart at top */}
      <div className="lg:hidden mb-8 px-4">
        <div className="h-64 rounded-lg overflow-hidden bg-zinc-900/40">
          {chartComponent}
        </div>
      </div>

      {/* Chapter prose blocks */}
      {chapters.map(({ id, prose }) => (
        <div
          key={id}
          ref={(el) => setChapterRef(id, el)}
          className={cn(
            'min-h-[70vh] pt-16 pb-12 px-4 md:px-8 transition-all duration-500',
            activeId === id
              ? 'opacity-100'
              : 'opacity-40'
          )}
          style={{
            borderLeft: activeId === id ? '2px solid rgba(220,38,38,0.5)' : '2px solid transparent',
          }}
          data-chapter={id}
        >
          {prose}
        </div>
      ))}
    </div>
  )

  return (
    <section
      ref={containerRef}
      className={cn('relative flex flex-col lg:flex-row gap-0', className)}
      aria-label="Seccion narrativa con visualizacion"
    >
      {chartPosition === 'left' ? (
        <>
          {chartPanel}
          {prosePanel}
        </>
      ) : (
        <>
          {prosePanel}
          {chartPanel}
        </>
      )}
    </section>
  )
}
