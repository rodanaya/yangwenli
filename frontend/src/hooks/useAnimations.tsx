import { useRef, useEffect, useState, useMemo } from 'react'

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

// ScrollReveal component — bold Fern-style reveal with scale + slide + blur
export function ScrollReveal({ children, delay = 0, direction = 'up', className, staggerIndex }: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'fade'
  className?: string
  staggerIndex?: number
}) {
  const { ref, visible } = useReveal()
  const computedDelay = staggerIndex !== undefined ? staggerIndex * 80 : delay
  const transforms: Record<string, string> = {
    up: 'translateY(60px) scale(0.94)',
    left: 'translateX(-60px) scale(0.94)',
    right: 'translateX(60px) scale(0.94)',
    fade: 'translateY(0) scale(0.97)',
  }
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionProperty: 'opacity, transform, filter',
        transitionDuration: '800ms',
        transitionDelay: `${computedDelay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) translateX(0) scale(1)' : transforms[direction],
        filter: visible ? 'blur(0px)' : 'blur(6px)',
      }}
    >
      {children}
    </div>
  )
}

// Count-up hook — animates a number with elastic overshoot easing
export function useCountUp(target: number, duration = 1800, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)
  const prevTargetRef = useRef(0)

  // Reset animation state when target changes from 0 to a real value,
  // so counters animate properly after async data loads.
  if (target > 0 && prevTargetRef.current === 0) {
    startedRef.current = false
  }
  prevTargetRef.current = target

  useEffect(() => {
    // If target is still 0 (data not loaded), skip — don't start a 0→0 animation
    if (target === 0) return
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
            // Elastic overshoot easing: overshoots ~8% then settles
            const c4 = (2 * Math.PI) / 3
            const eased = progress === 0 ? 0
              : progress === 1 ? 1
              : progress < 0.7
                ? 1 - Math.pow(1 - progress / 0.7, 3) * 1.0
                : 1 + Math.sin((progress - 0.7) * c4) * 0.08 * (1 - progress) / 0.3
            setValue(parseFloat((target * Math.min(eased, 1.08)).toFixed(decimals)))
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

// Stagger delay utility — returns an array of delays for N items
export function useStagger(count: number, baseDelay = 0, step = 80) {
  return useMemo(
    () => Array.from({ length: count }, (_, i) => baseDelay + i * step),
    [count, baseDelay, step]
  )
}

// AnimatedNumber — standalone scroll-triggered counter component
export function AnimatedNumber({ value, duration = 1800, decimals = 0, prefix = '', suffix = '', className }: {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const { ref, value: animatedValue } = useCountUp(value, duration, decimals)
  return (
    <span ref={ref} className={className}>
      {prefix}{animatedValue.toLocaleString()}{suffix}
    </span>
  )
}

// AnimatedFill — bar that fills with spring overshoot + shimmer sweep
export function AnimatedFill({ pct, color, delay = 0, height = 'h-4' }: {
  pct: number
  color: string
  delay?: number
  height?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [showShimmer, setShowShimmer] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setWidth(Math.min(pct * 1.03, 100)) // overshoot 3%
            setTimeout(() => {
              setWidth(pct) // settle back
              setTimeout(() => setShowShimmer(true), 300)
            }, 600)
          }, delay)
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
          transition: `width 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {showShimmer && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
              animation: 'shimmerSweep 0.8s ease-out forwards',
            }}
          />
        )}
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
        transition: `width 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        minWidth: width > 0 ? '2px' : '0',
      }}
    />
  )
}
