/**
 * Dossier editorial primitives — shared across vendor + institution
 * dossier chapters. Established by ChapterSubject (DESIGNUS round 6,
 * 2026-05-22); reused by Timeline, Network, Money, Pattern, Verdict
 * and the institution dossier's Suppliers/Spending/Risk sections.
 *
 * Five visual primitives + one motion wrapper:
 *
 *   ChapterHeading    — big Playfair Italic roman numeral + serif
 *                       uppercase title + italic subtitle, centered
 *                       magazine-cover composition
 *   SubheadRule       — hairline-flanked uppercase label (matches the
 *                       hero "ON THIS PAGE" pattern for cohesion)
 *   ScaleBlock        — framed number with MXN + USD companion lines,
 *                       sector-accent border
 *   EquivalenceList   — three ≈-prefixed prose lines (no bullets)
 *   SignatureBar      — horizontal proportion bar with reference
 *                       value tick OR reference band
 *   FadeIn            — single opacity entrance on scroll-into-view
 *
 * Two-color discipline preserved: sector accent (architecture) +
 * risk-tier color (only where the value IS a risk signal). No third
 * color introduced anywhere here.
 */

import { motion } from 'framer-motion'
import { RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'

// ─── ChapterShell ───────────────────────────────────────────────────────────

/**
 * Chapter container — provides id anchor (matches TOC anchor in hero)
 * and width constraint. All narrative chapters use this.
 */
export function ChapterShell({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="py-20 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

// ─── ChapterHeading ─────────────────────────────────────────────────────────

/**
 * Chapter heading — the magazine-cover composition. Big Playfair Italic
 * roman numeral in sector accent, serif uppercase title, italic
 * subtitle. Centered. Reusable across all six narrative chapters; only
 * the numeral, title, and subtitle change.
 */
export function ChapterHeading({
  numeral,
  title,
  subtitle,
  sectorAccent,
}: {
  numeral: string
  title: string
  subtitle: string
  sectorAccent: string
}) {
  return (
    <header className="text-center">
      <div
        aria-hidden="true"
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 'clamp(72px, 9vw, 120px)',
          lineHeight: 0.85,
          color: sectorAccent,
          letterSpacing: '-0.04em',
          marginBottom: 24,
        }}
      >
        {numeral}.
      </div>
      <h2
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: '0.30em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          marginBottom: 10,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 15,
          color: 'var(--color-text-muted)',
          maxWidth: '32ch',
          margin: '0 auto',
          lineHeight: 1.45,
        }}
      >
        {subtitle}
      </p>
    </header>
  )
}

// ─── SubheadRule ────────────────────────────────────────────────────────────

/**
 * Subhead rule — hairline-flanked uppercase label. Matches the
 * "ON THIS PAGE" pattern from the hero. Used as section dividers
 * within a chapter.
 */
export function SubheadRule({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        aria-hidden="true"
        style={{ height: 1, width: 60, background: 'var(--color-border)' }}
      />
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{ height: 1, width: 60, background: 'var(--color-border)' }}
      />
    </div>
  )
}

// ─── LedeParagraph ──────────────────────────────────────────────────────────

/**
 * Lede paragraph — Source Serif italic 18px with sector-accent left rule.
 * The opening editorial sentence of a chapter. No drop cap — that's
 * reserved for the hero. Pass the children as a string; numbers and
 * named entities can be wrapped in <strong> by the caller for emphasis.
 */
export function LedeParagraph({
  children,
  sectorAccent,
  maxWidth = '64ch',
}: {
  children: React.ReactNode
  sectorAccent: string
  maxWidth?: string
}) {
  return (
    <p
      style={{
        fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
        fontStyle: 'italic',
        fontSize: 18,
        lineHeight: 1.55,
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.005em',
        maxWidth,
        borderLeft: `2px solid ${sectorAccent}`,
        paddingLeft: 20,
      }}
    >
      {children}
    </p>
  )
}

// ─── ScaleBlock ─────────────────────────────────────────────────────────────

/**
 * Scale block — framed number with MXN unit + USD companion. The
 * chapter's central visual anchor when a single hero number carries
 * the argument.
 */
export function ScaleBlock({
  mxn,
  sectorAccent,
  lang,
}: {
  mxn: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const formatted = formatCompactMXN(mxn)
  const numberPart = formatted.replace(/\s*MXN\s*$/i, '').trim()
  const usd = formatCompactUSD(mxn)

  return (
    <div
      style={{
        border: `1px solid ${sectorAccent}55`,
        padding: '32px 48px',
        background: `${sectorAccent}06`,
        textAlign: 'center',
        minWidth: 280,
        maxWidth: 480,
      }}
    >
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 'clamp(56px, 8vw, 88px)',
          lineHeight: 1,
          color: sectorAccent,
          letterSpacing: '-0.025em',
        }}
      >
        {numberPart}
      </div>
      <div
        aria-hidden="true"
        className="mx-auto my-4"
        style={{ height: 1, width: 60, background: `${sectorAccent}55` }}
      />
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {lang === 'es' ? 'Pesos mexicanos' : 'Mexican pesos'}
      </div>
      <div
        className="font-mono tabular-nums"
        style={{
          fontSize: 12,
          letterSpacing: '0.05em',
          color: 'var(--color-text-secondary)',
        }}
      >
        ≈ {usd}
      </div>
    </div>
  )
}

// ─── EquivalenceList ────────────────────────────────────────────────────────

/**
 * Equivalence list — N lines of "≈ {phrase}". Source Serif italic
 * with the ≈ glyph in sector accent. No bullets — the glyph carries it.
 */
export function EquivalenceList({
  items,
  sectorAccent,
}: {
  items: string[]
  sectorAccent: string
}) {
  return (
    <ul
      className="mt-7 max-w-2xl mx-auto space-y-3 list-none p-0"
      style={{ textAlign: 'left' }}
    >
      {items.map((text, i) => (
        <li
          key={i}
          className="flex items-baseline gap-3"
          style={{
            fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: sectorAccent,
              fontWeight: 600,
              fontSize: 18,
              flexShrink: 0,
              minWidth: 16,
              fontStyle: 'normal',
            }}
          >
            ≈
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

// ─── SignatureBar ───────────────────────────────────────────────────────────

/**
 * Signature bar — horizontal proportion bar with inline reference.
 * Used for procurement-pathology stats (Chapter I) and for political-
 * cycle breakdowns (Chapter II — pass colorOverride to use admin
 * color instead of sector accent).
 *
 * Supports either:
 *   - referenceValue: single tick at one percentage (national norm)
 *   - referenceBandMin/Max: shaded band across a percentage range (OECD)
 *
 * If highRiskTint, fill becomes risk-critical (used for the
 * high-risk-contracts bar in Chapter I when value > 15%).
 */
export function SignatureBar({
  label,
  value,
  sectorAccent,
  colorOverride,
  highRiskTint,
  referenceValue,
  referenceBandMin,
  referenceBandMax,
  referenceLabel,
}: {
  label: string
  value: number
  sectorAccent: string
  colorOverride?: string
  highRiskTint?: boolean
  referenceValue?: number
  referenceBandMin?: number
  referenceBandMax?: number
  referenceLabel?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const fillColor = colorOverride
    ?? (highRiskTint ? RISK_COLORS.critical : sectorAccent)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 22,
            color: fillColor,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {Math.round(value)}
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              fontStyle: 'normal',
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              marginLeft: 4,
            }}
          >
            %
          </span>
        </span>
      </div>

      {/* The bar itself */}
      <div
        className="relative w-full"
        style={{
          height: 6,
          background: 'var(--color-background-elevated)',
          border: '1px solid var(--color-border)',
        }}
        aria-hidden="true"
      >
        {/* Reference band (if provided) — drawn behind the fill */}
        {referenceBandMin != null && referenceBandMax != null && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${referenceBandMin}%`,
              width: `${referenceBandMax - referenceBandMin}%`,
              background: 'var(--color-border)',
              opacity: 0.6,
              borderRight: `1px dashed var(--color-text-muted)`,
              borderLeft: `1px dashed var(--color-text-muted)`,
            }}
          />
        )}
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${clamped}%`,
            background: fillColor,
            opacity: 0.92,
          }}
        />
        {/* Reference value tick (single) */}
        {referenceValue != null && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${referenceValue}%`,
              width: 1,
              background: 'var(--color-text-muted)',
              opacity: 0.6,
            }}
          >
            <div
              className="absolute"
              style={{
                top: -3,
                bottom: -3,
                left: 0,
                width: 1,
                background: 'var(--color-text-muted)',
                opacity: 0.6,
              }}
            />
          </div>
        )}
      </div>

      {/* Reference annotation below the bar */}
      {referenceLabel && (
        <div
          className="mt-1.5 flex items-baseline gap-1.5"
          style={{
            fontFamily: '"Source Serif Pro", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
        >
          <span aria-hidden="true" style={{ fontFamily: 'inherit', fontStyle: 'normal' }}>▎</span>
          <span>{referenceLabel}</span>
        </div>
      )}
    </div>
  )
}

// ─── FadeIn ─────────────────────────────────────────────────────────────────

/**
 * FadeIn wrapper — single opacity + tiny y entrance on scroll-into-view.
 * Replaces per-block staggers so each chapter section arrives as a
 * single editorial unit.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
