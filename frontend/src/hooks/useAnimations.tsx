import { useRef, useEffect, useState } from 'react'

// Scroll reveal hook
export function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ScrollReveal component — wraps any content with fade+slide+blur reveal
export function ScrollReveal({ children, delay = 0, direction = 'up', className }: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'fade'
  className?: string
}) {
  const { ref, visible } = useReveal()
  const transforms: Record<string, string> = {
    up: 'translateY(36px)',
    left: 'translateX(-36px)',
    right: 'translateX(36px)',
    fade: 'translateY(0)',
  }
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionProperty: 'opacity, transform, filter',
        transitionDuration: '700ms',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) translateX(0)' : transforms[direction],
        filter: visible ? 'blur(0px)' : 'blur(4px)',
      }}
    >
      {children}
    </div>
  )
}

// Count-up hook — animates a number from 0 to target on scroll-into-view
export function useCountUp(target: number, duration = 1400, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          let startTime: number
          let frame: number
          const animate = (ts: number) => {
            if (!startTime) startTime = ts
            const progress = Math.min((ts - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(parseFloat((target * eased).toFixed(decimals)))
            if (progress < 1) frame = requestAnimationFrame(animate)
            else setValue(target)
          }
          frame = requestAnimationFrame(animate)
          return () => cancelAnimationFrame(frame)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, decimals])
  return { ref, value }
}

// AnimatedFill — bar that fills from 0 to pct% on scroll-into-view
export function AnimatedFill({ pct, color, delay = 0, height = 'h-4' }: {
  pct: number
  color: string
  delay?: number
  height?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(pct), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pct, delay])
  return (
    <div ref={ref} className={`flex-1 ${height} bg-surface-raised rounded overflow-hidden`}>
      <div
        className="h-full rounded relative overflow-hidden"
        style={{
          width: `${width}%`,
          background: color,
          transition: `width 900ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  )
}

// AnimatedSegment — animated flex segment, used for stacked bars
export function AnimatedSegment({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(pct), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pct, delay])
  return (
    <div
      ref={ref}
      className="h-full relative overflow-hidden rounded-sm"
      style={{
        width: `${width}%`,
        background: color,
        transition: `width 900ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        minWidth: width > 0 ? '2px' : '0',
      }}
    />
  )
}
