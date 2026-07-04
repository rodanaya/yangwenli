/**
 * CasesShared — small primitives shared between El Padrón (/cases) and
 * El Expediente (/cases/:slug). DESIGNUS synthesis 2026-06-10.
 *
 *   DispositionSeal — mono-stamped legal-status seal; the shared spine glyph
 *                     the reader learns on the index and meets again on the
 *                     dossier rail (ARCHIVO).
 *   FeatureSection  — tight left-aligned section wrapper (py-10 + § kicker).
 *                     Replaces ChapterShell/ChapterHeading on the case dossier
 *                     only — the centered 120px numerals were the dead-air bug.
 *   MarginNote      — ochre-ruled set note for the three DB note fields
 *                     (amount_note / legal_status_note / compranet_note).
 *   SeverityScale   — this-case-vs-the-archive severity distribution strip.
 *   PaperGrain      — page-scoped archival grain (dossier only).
 */
import { DotBar } from '@/components/ui/DotBar'
import {
  dispositionFor,
  dispositionLabel,
  severityColor,
  SEVERITY_MAX,
  type Lang,
} from './casesVocab'

// ─── DispositionSeal ────────────────────────────────────────────────────────

export function DispositionSeal({
  status,
  lang,
  size = 'sm',
}: {
  status: string | undefined | null
  lang: Lang
  size?: 'sm' | 'md'
}) {
  const meta = dispositionFor(status)
  const label = dispositionLabel(status, lang).toUpperCase()
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono uppercase"
      style={{
        fontSize: size === 'md' ? 10 : 9,
        letterSpacing: '0.16em',
        fontWeight: 700,
        color: meta.ink,
        border: `1px solid ${meta.fill}55`,
        background: `${meta.fill}0d`,
        padding: size === 'md' ? '3px 8px' : '2px 6px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: meta.ring ? 'transparent' : meta.fill,
          border: meta.ring ? '1.5px solid var(--color-accent)' : 'none',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  )
}

// ─── FeatureSection ─────────────────────────────────────────────────────────

export function FeatureSection({
  id,
  numeral,
  title,
  meta,
  lang,
  children,
}: {
  id: string
  numeral: string
  title: { en: string; es: string }
  /** Optional right-aligned mono meta fragment. */
  meta?: string
  lang: Lang
  children: React.ReactNode
}) {
  return (
    <section id={id} className="py-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <p
          className="font-mono"
          style={{
            fontSize: 12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>§ {numeral}</span>
          <span className="mx-2 opacity-50">·</span>
          {lang === 'es' ? title.es : title.en}
        </p>
        {meta && (
          <p
            className="font-mono tabular-nums"
            style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
          >
            {meta}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── MarginNote ─────────────────────────────────────────────────────────────

export function MarginNote({
  kicker,
  children,
}: {
  kicker: string
  children: React.ReactNode
}) {
  return (
    <aside
      className="mt-5"
      style={{
        borderLeft: '2px solid rgba(160,104,32,0.45)',
        paddingLeft: 14,
        maxWidth: '52ch',
      }}
    >
      <p
        className="font-mono mb-1"
        style={{
          fontSize: 13,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
          fontWeight: 600,
        }}
      >
        ▎{kicker}
      </p>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
        }}
      >
        {children}
      </p>
    </aside>
  )
}

// ─── SeverityScale — this case against the whole archive ────────────────────

export function SeverityScale({
  severity,
  distribution,
  lang,
}: {
  severity: number
  /** counts per severity level 1..4, from the full case list. */
  distribution: Record<number, number>
  lang: Lang
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  if (!total) return null
  const graver = Object.entries(distribution)
    .filter(([lvl]) => Number(lvl) > severity)
    .reduce((a, [, n]) => a + n, 0)
  const sentence =
    lang === 'es'
      ? graver === 0
        ? `Gravedad ${severity} de ${SEVERITY_MAX} — entre los más graves de ${total} casos documentados.`
        : `Gravedad ${severity} de ${SEVERITY_MAX} — ${graver} de ${total} casos documentados son más graves.`
      : graver === 0
        ? `Severity ${severity} of ${SEVERITY_MAX} — among the gravest of ${total} documented cases.`
        : `Severity ${severity} of ${SEVERITY_MAX} — ${graver} of ${total} documented cases are graver.`

  return (
    <div className="mt-5">
      <div
        className="flex w-full"
        style={{ height: 16, gap: 2 }}
        role="img"
        aria-label={sentence}
      >
        {[1, 2, 3, 4].map((lvl) => {
          const n = distribution[lvl] ?? 0
          if (n === 0) return null
          const isThis = lvl === severity
          return (
            <div
              key={lvl}
              className="relative flex items-center justify-center"
              style={{
                width: `${(n / total) * 100}%`,
                background: severityColor(lvl),
                opacity: isThis ? 0.95 : 0.18,
                outline: isThis ? '1px solid var(--color-accent)' : 'none',
                outlineOffset: 1,
              }}
            >
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: 8.5,
                  letterSpacing: '0.08em',
                  color: isThis ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: isThis ? 700 : 400,
                }}
              >
                S{lvl}·{n}
              </span>
            </div>
          )
        })}
      </div>
      <p
        className="mt-2"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
        }}
      >
        {sentence}
      </p>
    </div>
  )
}

// ─── Severity dots (canonical DotBar, 4-point scale) ────────────────────────

export function SeverityDots({
  severity,
  lang,
  className,
}: {
  severity: number
  lang: Lang
  className?: string
}) {
  return (
    <DotBar
      value={severity}
      max={SEVERITY_MAX}
      dots={SEVERITY_MAX}
      dotR={2.5}
      dotGap={9}
      color={severityColor(severity)}
      ariaLabel={
        lang === 'es'
          ? `Gravedad ${severity} de ${SEVERITY_MAX}`
          : `Severity ${severity} of ${SEVERITY_MAX}`
      }
      className={className}
    />
  )
}

// ─── PaperGrain — dossier-only archival atmosphere ──────────────────────────

export function PaperGrain() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
    >
      <filter id="case-paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#case-paper-grain)" />
    </svg>
  )
}
