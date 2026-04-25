/**
 * CinematicComponents.tsx
 *
 * Fern-level cinematic UI primitives for the RUBLI platform.
 * Brutally bold, confident, high-production animations.
 *
 * All components respect prefers-reduced-motion via Framer Motion's
 * useReducedMotion() hook --- falling back to instant/static rendering.
 */

import {
  type HTMLMotionProps,
  type Variants,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
} from 'framer-motion'
import {
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   1. GlowCard --- Animated conic-gradient glow border on hover
   ============================================================ */

interface GlowCardProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  children: ReactNode
  className?: string
  glowColor?: string
  style?: CSSProperties
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ children, className, glowColor = '#dc2626', style, ...rest }, ref) => {
    const reduced = useReducedMotion()
    const uniqueId = useId()
    const varName = `--glow-angle-${uniqueId.replace(/:/g, '')}`

    // Rotate the conic gradient angle continuously
    const angle = useMotionValue(0)
    useEffect(() => {
      if (reduced) return
      const ctrl = animate(angle, 360, {
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      })
      return () => ctrl.stop()
    }, [angle, reduced])

    // Map angle to CSS custom property
    const angleStr = useTransform(angle, (v) => `${v}deg`)

    return (
      <motion.div
        ref={ref}
        className={cn('group relative rounded-sm p-[1px]', className)}
        style={
          {
            ...style,
            [varName]: angleStr,
            background: reduced
              ? `linear-gradient(135deg, ${glowColor}33, transparent)`
              : `conic-gradient(from var(${varName}), transparent 40%, ${glowColor} 50%, transparent 60%)`,
          } as CSSProperties
        }
        whileHover={reduced ? {} : { scale: 1.005 }}
        transition={{ duration: 0.2 }}
        {...rest}
      >
        {/* Outer glow pulse on hover */}
        <div
          className="pointer-events-none absolute inset-0 rounded-sm opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            boxShadow: `0 0 40px 4px ${glowColor}40, 0 0 80px 8px ${glowColor}20`,
          }}
        />
        {/* Inner content container */}
        <div className="relative z-10 rounded-[11px] bg-surface/95 backdrop-blur-sm">
          {children}
        </div>
      </motion.div>
    )
  }
)
GlowCard.displayName = 'GlowCard'


/* ============================================================
   2. CountUp --- Animated number counter with Intl formatting
   ============================================================ */

interface CountUpProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function CountUp({
  value,
  duration = 2.5,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: CountUpProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, {
    duration: duration * 1000,
    bounce: 0,
  })
  const [display, setDisplay] = useState('0')

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals]
  )

  useEffect(() => {
    if (!isInView) return
    if (reduced) {
      setDisplay(formatter.format(value))
      return
    }
    motionVal.set(0)
    const ctrl = animate(motionVal, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => ctrl.stop()
  }, [isInView, value, duration, reduced, motionVal, formatter])

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setDisplay(formatter.format(v))
    })
    return unsub
  }, [spring, formatter])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}


/* ============================================================
   3. SplitText --- Staggered word/char entrance animation
   ============================================================ */

interface SplitTextProps {
  text: string
  className?: string
  staggerChildren?: number
  mode?: 'words' | 'chars'
}

const splitContainer: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger, delayChildren: 0.05 },
  }),
}

const splitChild: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

export function SplitText({
  text,
  className,
  staggerChildren = 0.04,
  mode = 'words',
}: SplitTextProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })

  const segments = useMemo(() => {
    if (mode === 'chars') return text.split('')
    return text.split(' ')
  }, [text, mode])

  if (reduced) {
    return <span className={className}>{text}</span>
  }

  return (
    <motion.span
      ref={ref}
      className={cn('inline-flex flex-wrap', className)}
      variants={splitContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      custom={staggerChildren}
      aria-label={text}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          variants={splitChild}
          className="inline-block"
          style={{ marginRight: mode === 'words' ? '0.25em' : undefined }}
          aria-hidden="true"
        >
          {segment}
        </motion.span>
      ))}
    </motion.span>
  )
}


/* ============================================================
   4. MarqueeBanner --- Infinite horizontal ticker
   ============================================================ */

interface MarqueeBannerProps {
  items: string[]
  speed?: number
  direction?: 'left' | 'right'
  separator?: string
  className?: string
}

export function MarqueeBanner({
  items,
  speed = 40,
  direction = 'left',
  separator = ' \u2022 ',
  className,
}: MarqueeBannerProps) {
  const reduced = useReducedMotion()
  const joined = items.join(separator) + separator
  const animDir = direction === 'left' ? 'normal' : 'reverse'

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-background py-3 text-sm font-medium tracking-wide',
        className
      )}
      aria-label={`Scrolling information: ${items.join(', ')}`}
      role="marquee"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />

      <div
        className="flex whitespace-nowrap"
        style={{
          animation: reduced
            ? 'none'
            : `cinematic-marquee ${speed}s linear infinite`,
          animationDirection: animDir,
        }}
      >
        <span className="text-red-500/90">{joined}</span>
        <span className="text-red-500/90">{joined}</span>
        <span className="text-red-500/90">{joined}</span>
      </div>

      <style>{`
        @keyframes cinematic-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}


/* ============================================================
   5. ScrollReveal --- Viewport-triggered reveal wrapper
   ============================================================ */

interface ScrollRevealProps {
  children: ReactNode
  direction?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  className?: string
}

const revealVariants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 60, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  },
  left: {
    hidden: { opacity: 0, x: -60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  },
  right: {
    hidden: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.85, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
    },
  },
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  className,
}: ScrollRevealProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={revealVariants[direction]}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}


/* ============================================================
   6. GradientOrb --- Blurred background ambience orb
   ============================================================ */

interface GradientOrbProps {
  color: string
  size?: number
  className?: string
  animate?: boolean
}

export function GradientOrb({
  color,
  size = 400,
  className,
  animate: shouldAnimate = true,
}: GradientOrbProps) {
  const reduced = useReducedMotion()
  const doDrift = shouldAnimate && !reduced

  return (
    <motion.div
      className={cn('pointer-events-none absolute rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}40 0%, ${color}10 40%, transparent 70%)`,
        filter: `blur(${size * 0.3}px)`,
      }}
      animate={
        doDrift
          ? {
              x: [0, 30, -20, 10, 0],
              y: [0, -25, 15, -10, 0],
              scale: [1, 1.05, 0.97, 1.02, 1],
            }
          : {}
      }
      transition={
        doDrift
          ? {
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
      aria-hidden="true"
    />
  )
}


/* ============================================================
   7. PulseRing --- Animated concentric pulse rings
   ============================================================ */

interface PulseRingProps {
  color?: string
  size?: number
  label?: string
  className?: string
}

export function PulseRing({
  color = '#dc2626',
  size = 12,
  label,
  className,
}: PulseRingProps) {
  const reduced = useReducedMotion()

  const ringBase: CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    border: `1.5px solid ${color}`,
  }

  return (
    <span
      className={cn('relative inline-flex items-center gap-2', className)}
      role="status"
      aria-label={label ?? 'Live indicator'}
    >
      <span
        className="relative inline-block"
        style={{ width: size, height: size }}
      >
        {/* Core dot */}
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
        />

        {/* Three expanding rings */}
        {!reduced &&
          [0, 0.6, 1.2].map((ringDelay, i) => (
            <motion.span
              key={i}
              style={{ ...ringBase, width: size, height: size }}
              animate={{
                width: [size, size * 3],
                height: [size, size * 3],
                opacity: [0.7, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: ringDelay,
                ease: 'easeOut',
              }}
            />
          ))}
      </span>
      {label && (
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  )
}


/* ============================================================
   8. ProgressReveal --- Spring-animated progress bar
   ============================================================ */

interface ProgressRevealProps {
  value: number
  color?: string
  height?: number
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressReveal({
  value,
  color = '#dc2626',
  height = 6,
  label,
  showValue = false,
  className,
}: ProgressRevealProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })

  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
          {label && <span>{label}</span>}
          {showValue && (
            <span className="font-mono tabular-nums font-medium" style={{ color }}>
              {clamped.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Progress: ${clamped}%`}
      >
        {(() => {
          const N = 30, DR = 3, DG = 8
          const target = isInView || reduced ? clamped : 0
          const filled = Math.max(target > 0 ? 1 : 0, Math.round((target / 100) * N))
          return (
            <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: Math.max(Number(height) || 10, 10) }} preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: N }).map((_, k) => (
                <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                  fill={k < filled ? color : 'var(--color-background-elevated)'}
                  stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                  strokeWidth={k < filled ? 0 : 0.5}
                  fillOpacity={k < filled ? 0.85 : 1}
                />
              ))}
            </svg>
          )
        })()}
      </div>
    </div>
  )
}


/* ============================================================
   9. TextShimmer --- Text with sweeping highlight effect
   ============================================================ */

interface TextShimmerProps {
  children: ReactNode
  className?: string
  duration?: number
}

export function TextShimmer({
  children,
  className,
  duration = 3,
}: TextShimmerProps) {
  const reduced = useReducedMotion()

  return (
    <span
      className={cn('relative inline-block', className)}
      style={
        reduced
          ? {}
          : {
              backgroundImage:
                'linear-gradient(90deg, currentColor 0%, currentColor 40%, #fca5a5 50%, currentColor 60%, currentColor 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: `cinematic-shimmer ${duration}s ease-in-out infinite`,
            }
      }
    >
      {children}
      {!reduced && (
        <style>{`
          @keyframes cinematic-shimmer {
            0%, 100% { background-position: 200% center; }
            50% { background-position: -200% center; }
          }
        `}</style>
      )}
    </span>
  )
}


/* ============================================================
   10. NoiseOverlay --- SVG feTurbulence noise texture
   ============================================================ */

export function NoiseOverlay() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[9999] h-full w-full"
      style={{ opacity: 0.04 }}
      aria-hidden="true"
    >
      <filter id="cinematic-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.80"
          numOctaves="4"
          stitchTiles="stitch"
        />
      </filter>
      <rect
        width="100%"
        height="100%"
        filter="url(#cinematic-noise)"
      />
    </svg>
  )
}
