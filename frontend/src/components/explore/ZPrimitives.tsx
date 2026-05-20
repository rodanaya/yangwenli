/**
 * ZPrimitives — shared editorial chrome + animation foundations for /explore
 * Z0 through Z4. Built on the Z0 canon (commit e67a5110):
 *
 *   - One easing family across the whole canvas (`Z_EASE`)
 *   - Layout transitions reserved for "data was re-asked a different question"
 *   - Arrival is opacity. Change is transform. Truth is layout.
 *   - Sort toggle is the platform's signature investigative gesture.
 *
 * Z1-Z4 import from this module so the heartbeat stays identical at every
 * zoom level — no level redefines a duration or easing curve.
 */

import { motion, type Variants, type Transition } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SECTOR_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ─── Animation canon (Z0-locked, exported for Z1-Z4) ────────────────────────

/** Single easing curve for all layout/transform transitions. ExpoOut. */
export const Z_EASE = [0.16, 1, 0.3, 1] as const

/** "Data was re-asked a different question" — sort toggle, filter, re-pivot. */
export const Z_LAYOUT_DURATION_S = 0.72

/** Per-cell entrance (opacity + tiny scale). */
export const Z_CELL_ENTRANCE_S = 0.42

/** Header band entrance (kicker, stat row). */
export const Z_BAND_S = 0.32

/** ~120ms between header cascade bands. */
export const Z_CASCADE_STEP_S = 0.12

/** 6ms light-sweep stagger inside the treemap. */
export const Z_CELL_STAGGER_S = 0.006

/** Treemap waits for header cascade before staggering its children. */
export const Z_TREEMAP_DELAY_S = 0.24

/** Z4 drawer slide — chrome motion (not data motion), slightly faster. */
export const Z_DRAWER_S = 0.56

// ─── trans() factory ────────────────────────────────────────────────────────

/**
 * Build a framer-motion Transition that respects prefers-reduced-motion.
 * Reader has opted out → return `{ duration: 0 }` so the property still
 * animates but instantly. Otherwise the canonical Z_EASE curve at the
 * requested duration, with optional delay.
 *
 * Usage:
 *   const prefersReduced = useReducedMotion() ?? false
 *   const trans = useZTrans(prefersReduced)
 *   <motion.div transition={trans(Z_BAND_S)}> ... </motion.div>
 */
export function useZTrans(prefersReducedMotion: boolean) {
  return (duration: number, delay = 0): Transition =>
    prefersReducedMotion
      ? { duration: 0 }
      : { duration, delay, ease: Z_EASE }
}

// ─── Header cascade variants ────────────────────────────────────────────────

/**
 * Returns the canonical band variants: opacity + 8px lift (or opacity-only
 * under reduced-motion). Each band caller passes `custom={index}` where
 * index 0 = first band, index 1 = second, etc. Cascade step is
 * Z_CASCADE_STEP_S between consecutive bands.
 */
export function useBandVariants(prefersReducedMotion: boolean): Variants {
  return {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: Z_BAND_S, delay: custom * Z_CASCADE_STEP_S, ease: Z_EASE },
    }),
  }
}

// ─── ZBreadcrumb — the where-am-I affordance for Z1+ ────────────────────────

export type CrumbSegment = {
  /** Display label for this segment (sector name, institution name, etc.). */
  label: string
  /** Optional sector code — drives the 2px sector-color underline at this segment. */
  sectorCode?: string
  /** Click handler — typically dispatches a `pop-to-*` exploration action. */
  onClick?: () => void
}

/**
 * 28px sticky breadcrumb strip — replaces the "Z1 · INSTITUTIONS" debug
 * kicker that used to live at the top of Z1/Z2/Z3. Each segment is
 * clickable; the last one is rendered bold to indicate current location.
 * The sector segment (segments[0]) carries the sector-color underline.
 *
 * Esc-key hint is shown at the right edge as a passive affordance —
 * actual Esc handling is owned by the explore reducer.
 */
export function ZBreadcrumb({
  segments,
  lang,
}: {
  segments: CrumbSegment[]
  lang: 'en' | 'es'
}) {
  return (
    <div
      className="px-4 sm:px-6 flex items-center gap-1.5 sticky top-0 z-[2]"
      style={{
        height: 28,
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {segments.map((s, i) => {
        const isLast = i === segments.length - 1
        const accent = s.sectorCode ? SECTOR_COLORS[s.sectorCode] : undefined
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span
                className="font-mono text-[10px]"
                style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
                aria-hidden="true"
              >
                ▸
              </span>
            )}
            <button
              type="button"
              onClick={s.onClick}
              disabled={isLast || !s.onClick}
              className={cn(
                'font-mono uppercase tracking-[0.12em] truncate transition-opacity',
                isLast ? 'cursor-default' : 'hover:opacity-70 cursor-pointer'
              )}
              style={{
                fontSize: 10,
                fontWeight: isLast ? 700 : 500,
                color: 'var(--color-text-primary)',
                borderBottom: accent ? `2px solid ${accent}` : undefined,
                paddingBottom: 1,
                background: 'none',
                border: 'none',
                maxWidth: 220,
              }}
              aria-current={isLast ? 'page' : undefined}
            >
              {s.label}
            </button>
          </span>
        )
      })}
      <span
        className="ml-auto font-mono text-[9px] tracking-[0.14em]"
        style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
      >
        {lang === 'en' ? 'ESC ↩' : 'ESC ↩'}
      </span>
    </div>
  )
}

// ─── ZKickerBand — editorial section eyebrow + headline ─────────────────────

/**
 * The header band at the top of each Z-level panel. Animates as cascade
 * band 0 (or whatever `custom` index the caller provides). Carries the
 * § KICKER + Playfair headline + optional stat line.
 *
 * Visually matches Z0's editorial chrome so the four levels feel like
 * chapters of the same investigation, not four separate dashboards.
 */
export function ZKickerBand({
  kicker,
  headline,
  stat,
  custom = 0,
  variants,
}: {
  kicker: string
  headline: React.ReactNode
  stat?: React.ReactNode
  custom?: number
  variants: Variants
}) {
  return (
    <motion.div
      variants={variants}
      custom={custom}
      className="px-4 sm:px-6 pt-4 pb-3"
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5"
        style={{ color: 'var(--color-accent)' }}
      >
        {kicker}
      </div>
      <h1
        className="font-serif text-text-primary leading-[1.1]"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
          letterSpacing: '-0.015em',
        }}
      >
        {headline}
      </h1>
      {stat && (
        <div
          className="font-mono text-[10px] uppercase tracking-[0.12em] mt-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {stat}
        </div>
      )}
    </motion.div>
  )
}

// ─── ZPullLine — single-sentence editorial finding ──────────────────────────

/**
 * The pull-line under main content — one sentence in Playfair italic that
 * names the finding the content surface reveals. e.g. "IMSS alone manages
 * 38% — more than the next six institutions combined."
 *
 * Animates with the same band variant the caller's other bands use. Pass
 * `custom` for cascade ordering.
 */
export function ZPullLine({
  children,
  custom = 3,
  variants,
}: {
  children: React.ReactNode
  custom?: number
  variants: Variants
}) {
  return (
    <motion.div
      variants={variants}
      custom={custom}
      className="px-4 sm:px-6 py-3 flex-shrink-0"
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-background-elevated)',
      }}
    >
      <div className="flex items-start gap-3 max-w-3xl">
        <span
          className="inline-block self-stretch w-[3px] flex-shrink-0 rounded-sm"
          style={{ background: 'var(--color-accent)' }}
          aria-hidden="true"
        />
        <p
          className="text-text-secondary leading-snug"
          style={{
            fontSize: 13,
            fontFamily: "'Source Serif Pro', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          {children}
        </p>
      </div>
    </motion.div>
  )
}

// ─── ZFooterLink — outbound continuity to canonical dossier routes ──────────

/**
 * Each Z-level footer has one "Ver ficha completa" link out to the
 * canonical destination dossier:
 *   Z1 → /sectors/:code
 *   Z2 → /institutions/:id
 *   Z3 → /vendors/:id   (or /thread/:vendorId for T1/T2)
 *   Z4 → /contracts/:id
 *
 * /explore is the entry instrument; dossiers are the destinations.
 */
export function ZFooterLink({
  href,
  label,
  lang,
}: {
  href: string
  label?: string
  lang: 'en' | 'es'
}) {
  const navigate = useNavigate()
  const text = label ?? (lang === 'en' ? 'Open full dossier' : 'Ver ficha completa')
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
      style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <span>{text}</span>
      <span aria-hidden="true">↗</span>
    </button>
  )
}

// ─── ZSortToggle — the canonical SPEND ↔ RISK pivot ─────────────────────────

/**
 * The platform's signature investigative gesture. Z0 has it. Z1, Z2, Z3
 * also have it — at Z3 with the alternate TIME ↔ RISK semantics. Behavior
 * is identical across levels: clicking the inactive mode flips the active
 * mode; cells/cards rearrange via framer-motion `layout` with
 * Z_LAYOUT_DURATION_S / Z_EASE.
 *
 * The button itself uses the sector-accent or risk-critical color depending
 * on which mode is active. No drop-shadow, no rounded-full, no "fun" UI —
 * just two flat segments inside a thin border.
 */
export function ZSortToggle<TMode extends string>({
  modes,
  active,
  onChange,
  riskMode,
  label,
}: {
  modes: readonly [TMode, TMode]
  active: TMode
  onChange: (next: TMode) => void
  /** Which mode value should render the risk-critical accent (vs. plain accent). */
  riskMode: TMode
  /** Optional uppercased label (e.g. SORT, ORDENAR) shown above the toggle. */
  label?: string
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      {label && (
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
      )}
      <div className="flex rounded-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {modes.map((m) => {
          const isActive = m === active
          const isRisk = m === riskMode
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className="font-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 transition-colors"
              style={{
                background: isActive ? (isRisk ? 'var(--color-risk-critical)' : 'var(--color-accent)') : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {m.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
