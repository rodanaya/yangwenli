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
  const inViewRef = useRef(false)

  // When target transitions from 0 to a real value (async data arrives),
  // reset startedRef so the animation re-fires. If the element is already
  // visible, kick off the animation directly without waiting for another
  // IntersectionObserver callback (it won't fire again after disconnect).
  if (target > 0 && prevTargetRef.current === 0) {
    startedRef.current = false
  }
  prevTargetRef.current = target

  useEffect(() => {
    // If target is still 0 (data not loaded), skip — don't start a 0→0 animation
    if (target === 0) return
    const el = ref.current
    if (!el) return

    // Helper that runs the count-up rAF loop
    function runAnimation() {
      if (startedRef.current) return
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

    // If the element is already in view (e.g. data loaded after mount while
    // element was visible), run immediately instead of waiting for observer.
    if (inViewRef.current) {
      return runAnimation()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          runAnimation()
          observer.disconnect()
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

// AnimatedFill — dot-matrix strip (was: animated bar)
export function AnimatedFill({ pct, color, delay = 0, height: _height = 'h-4' }: {
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
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    let t3: ReturnType<typeof setTimeout>
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          t1 = setTimeout(() => {
            setWidth(Math.min(pct * 1.03, 100)) // overshoot 3%
            t2 = setTimeout(() => {
              setWidth(pct) // settle back
              t3 = setTimeout(() => setShowShimmer(true), 300)
            }, 600)
          }, delay)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => { observer.disconnect(); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pct, delay])
  // Consume showShimmer to avoid unused-var warnings (dot-matrix has no shimmer)
  void showShimmer
  // Slim continuous progress bar. The dot-strip rewrite of this used:
  //   1. preserveAspectRatio="none" -> circles stretched to ovals
  //   2. fill='#2d2926' (forbidden dark-mode hex) -> black dots on cream
  //   3. Math.max(1, …) floor -> 1 dot for any sub-3% input, meaningless
  // For sub-percent stats like "0.7% officially detected" a continuous
  // bar reads the proportion against the empty track. Discrete dots only
  // make sense when the user can count to ~22 of 30; below that the
  // visual lies.
  const widthPct = Math.max(0, Math.min(100, width))
  // Sub-pixel slivers disappear; ensure at least 0.5% renders so the
  // value is visible. Number itself remains accurate via the label.
  const visualPct = widthPct > 0 && widthPct < 0.5 ? 0.5 : widthPct
  void showShimmer
  return (
    <div ref={ref} className="flex-1 relative w-full overflow-hidden rounded-full bg-[var(--color-border)]" style={{ height: 6 }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${visualPct}%`,
          backgroundColor: color,
          transition: `width 800ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      />
    </div>
  )
}

// AnimatedSegment — width-proportional dot group (was: flex segment for stacked bars)
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
  const N_TOTAL = 40
  const mySlice = Math.max(1, Math.round((width / 100) * N_TOTAL))
  const DR = 3, DG = 8
  return (
    <div
      ref={ref}
      className="h-full relative"
      style={{
        flexBasis: `${width}%`,
        minWidth: width > 0 ? '8px' : '0',
        transition: `flex-basis 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
      }}
    >
      <svg
        viewBox={`0 0 ${mySlice * DG} 10`}
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {Array.from({ length: mySlice }).map((_, i) => (
          <circle key={i} cx={i * DG + DR} cy={5} r={DR} fill={color} fillOpacity={0.85} />
        ))}
      </svg>
    </div>
  )
}
