import { useEffect, useRef, useState } from 'react'
import { getLocale } from '../../lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number        // ms, default 1500
  decimals?: number        // decimal places, default 0
  prefix?: string          // e.g. "$"
  suffix?: string          // e.g. "M"
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inViewRef = useRef(false)
  const prevValueRef = useRef(0)
  const animatingRef = useRef(false)

  // Track value changes so we restart when async data arrives
  const valueChanged = value !== prevValueRef.current
  if (valueChanged) prevValueRef.current = value

  useEffect(() => {
    if (value === 0) return

    function runAnimation() {
      if (animatingRef.current) return
      animatingRef.current = true
      const startTime = performance.now()
      const animate = (time: number) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(eased * value)
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCurrent(value)
          animatingRef.current = false
        }
      }
      requestAnimationFrame(animate)
    }

    // If already in view (value arrived after initial render), run immediately
    if (inViewRef.current) {
      animatingRef.current = false
      runAnimation()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          runAnimation()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration])

  const display = current.toFixed(decimals)
  const formatted = Number(display).toLocaleString(getLocale(), {
    minimumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
