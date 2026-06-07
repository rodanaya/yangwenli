/**
 * PlateFrame — investigative-folio framing for Atlas constellation and other
 * contemplative data sections on the Executive briefing.
 *
 * Aesthetic direction: "Procurement Atlas as a classified investigative folio."
 * Reference vocabulary: OCCRP / ICIJ Pandora Papers, Bureau of Investigative
 * Journalism, Reuters Graphics archival, FT print edition, Ordnance Survey
 * map plates. Anti-pattern: generic dashboard chrome.
 *
 * The frame wraps a chart / data section with:
 *   - Four corner crop marks (thin L-brackets) like a film cell or map plate
 *   - Top-left tag: FOLIO·N · context label · in IBM Plex Mono italic 300
 *   - Top-right tag: file-stamp date + bilingual classification
 *   - Bottom plate caption: italic EB Garamond — context-aware copy
 *   - A measured rule above the caption (not a generic divider)
 *
 * For /atlas: the caption updates with the active lens + year + cluster count
 * so the reader always sees a concrete plate index, not abstract chart chrome.
 * For non-atlas surfaces (Executive sections): pass `caption` and `folio`
 * overrides to supply static bilingual text without touching the /atlas call site.
 *
 * No images, no SVG decorative shapes — just typography + 1px rules.
 * Easy to revert: this is purely a visual wrapper around `children`.
 */

import React from 'react'

interface PlateFrameProps {
  children: React.ReactNode
  /** Active lens code: 'patterns' | 'sectors' | 'categories' | 'sexenios' */
  lens?: string
  /** Active year (YYYY) */
  year?: number
  /** Number of clusters in the active lens */
  clusterCount?: number
  /** Total contracts shown (across all clusters) */
  totalContracts?: number
  lang: 'en' | 'es'
  /**
   * Optional: override the auto-computed plate caption with a fixed string.
   * When provided, the lens/year/clusterCount/totalContracts props are ignored
   * for caption generation. Use for non-atlas surfaces where the caption is
   * static or computed by the caller.
   */
  caption?: string
  /**
   * Optional: override the auto-computed folio index (default IX·a/b/c/d via lens).
   * Use for non-atlas surfaces. Pass a string like 'II', 'III', etc.
   */
  folio?: string
  /**
   * Optional: override the eyebrow context label (default 'Atlas of contracting' /
   * 'Atlas de contratación'). Pass a { en, es } object so the component
   * stays bilingual.
   */
  contextLabel?: { en: string; es: string }
  /**
   * Optional (M-OBS Phase 1): when true, suppresses the top folio header strip
   * (Folio·N · context · date stamp). Bottom plate caption and crop marks stay.
   * Used by /atlas to claim back ~30px of vertical space inside the canvas.
   */
  minimal?: boolean
  /**
   * Executive briefing surfaces: extend the frame into the column gutters so
   * interior text aligns to the editorial column grid. Safe for containers with
   * ≥24px horizontal padding at sm+.
   *
   * When true: the <figure> gains sm:-ml-[24px] sm:-mr-[24px] negative margins
   * and interior padding narrows from 28px to 23px, so text lands exactly on
   * the column grid (−24 margin + 1 border + 23 padding = 0 offset vs grid).
   * Below sm there is no bleed — mobile keeps the padded inset.
   * Default false — Atlas.tsx and CaptureCreep.tsx call sites render pixel-identical.
   */
  bleed?: boolean
}

/** Plate caption — bilingual, lens-aware (atlas default). */
function getAtlasCaption(
  lens: string,
  year: number,
  clusterCount: number,
  totalContracts: number,
  lang: 'en' | 'es',
): string {
  const lensLabels: Record<string, { en: string; es: string }> = {
    patterns:   { en: 'corruption patterns',  es: 'patrones de corrupción' },
    sectors:    { en: 'federal sectors',       es: 'sectores federales' },
    categories: { en: 'spending categories',   es: 'categorías de gasto' },
    sexenios:   { en: 'presidential terms',    es: 'sexenios presidenciales' },
  }
  const lensLabel = lensLabels[lens]?.[lang] ?? lens
  const formatN = (n: number) => new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US').format(n)
  if (lang === 'en') {
    return `Plate — A constellation of ${formatN(totalContracts)} federal contracts, organised across ${clusterCount} ${lensLabel}, year ${year}.`
  }
  return `Lámina — Una constelación de ${formatN(totalContracts)} contratos federales, ordenados en ${clusterCount} ${lensLabel}, año ${year}.`
}

/** Folio number — derived from lens so each lens has its own catalog index. */
function getAtlasFolioNumber(lens: string): string {
  const folioMap: Record<string, string> = {
    patterns:   'IX·a',
    sectors:    'IX·b',
    categories: 'IX·c',
    sexenios:   'IX·d',
  }
  return folioMap[lens] ?? 'IX'
}

export function PlateFrame({
  children,
  lens,
  year,
  clusterCount,
  totalContracts,
  lang,
  caption: captionOverride,
  folio: folioOverride,
  contextLabel,
  minimal = false,
  bleed = false,
}: PlateFrameProps) {
  // Use overrides when provided (non-atlas surfaces); fall back to atlas defaults.
  const folio = folioOverride ?? getAtlasFolioNumber(lens ?? 'patterns')
  const caption = captionOverride ?? getAtlasCaption(
    lens ?? 'patterns',
    year ?? new Date().getUTCFullYear(),
    clusterCount ?? 0,
    totalContracts ?? 0,
    lang,
  )
  const contextLabelText = contextLabel
    ? (lang === 'en' ? contextLabel.en : contextLabel.es)
    : (lang === 'en' ? 'Atlas of contracting' : 'Atlas de contratación')

  // Date stamp — render once on mount; YYYY·MM·DD in archival monospace.
  const dateStamp = React.useMemo(() => {
    const d = new Date()
    return `${d.getUTCFullYear()}·${String(d.getUTCMonth() + 1).padStart(2, '0')}·${String(d.getUTCDate()).padStart(2, '0')}`
  }, [])

  return (
    <figure
      className={bleed ? 'relative sm:-ml-[24px] sm:-mr-[24px]' : 'relative'}
      style={{
        // Generous interior margin so the chart breathes within the frame.
        // When `minimal`, drop the top header strip — the canvas claims its space.
        // When `bleed`, reduce horizontal padding from 28px to 23px so interior
        // text lands on the column grid: −24px margin + 1px border + 23px = 0.
        padding: minimal ? `14px ${bleed ? '23px' : '28px'} 22px` : `36px ${bleed ? '23px' : '28px'} 22px`,
        background: 'var(--color-background-elevated, var(--color-background))',
        border: '1px solid var(--color-border)',
        // Slight inset shadow so the plate feels tactile — like a printed page
        // sitting on a desk. Not a generic card drop-shadow.
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
      }}
    >
      {/* ── Corner crop marks (4 × L-brackets) ─────────────────────────────
          Each bracket is 14×14px, 1px stroke, ochre amber to echo the
          dashboard accent. Inset 12px from the frame border. */}
      <CropMark position="tl" />
      <CropMark position="tr" />
      <CropMark position="bl" />
      <CropMark position="br" />

      {/* ── Folio header strip ──────────────────────────────────────────────
          Two columns: catalog index left, archival date stamp right.
          IBM Plex Mono italic 300 / 400 — quiet, archival, never shouting.
          Suppressed when `minimal` — Atlas surfaces its own masthead/toolbar. */}
      {!minimal && (<div
        className={bleed
          ? 'absolute top-3 left-[23px] right-[23px] flex items-center justify-between pointer-events-none'
          : 'absolute top-3 left-7 right-7 flex items-center justify-between pointer-events-none'
        }
        style={{
          fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
          fontSize: '9.5px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 400,
        }}
      >
        <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·{folio}</span>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
          <span>{contextLabelText}</span>
        </span>
        <span>
          <span style={{ opacity: 0.55 }}>{lang === 'en' ? 'Indexed' : 'Indexado'} </span>
          <span style={{ fontWeight: 500 }}>{dateStamp}</span>
        </span>
      </div>)}

      {/* ── The chart itself ───────────────────────────────────────────── */}
      <div className="relative">{children}</div>

      {/* ── Plate caption — italic serif, kept brief and concrete ───── */}
      <figcaption
        className="mt-4 pt-3"
        style={{
          borderTop: '1px solid rgba(160, 104, 32, 0.18)',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: '13.5px',
          lineHeight: 1.45,
          color: 'var(--color-text-secondary, var(--color-text-muted))',
          letterSpacing: '0.005em',
          maxWidth: '64ch',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  )
}

// ── Corner crop mark ─────────────────────────────────────────────────────────
type CropPos = 'tl' | 'tr' | 'bl' | 'br'

function CropMark({ position }: { position: CropPos }) {
  // 14 × 14 px L-bracket. Inset 8px from frame edge.
  const inset = 8
  const size = 14
  const stroke = 'rgba(160, 104, 32, 0.55)'
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
  }
  const positions: Record<CropPos, React.CSSProperties> = {
    tl: { top: inset, left: inset, borderTop: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    tr: { top: inset, right: inset, borderTop: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
    bl: { bottom: inset, left: inset, borderBottom: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    br: { bottom: inset, right: inset, borderBottom: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
  }
  return <span aria-hidden="true" style={{ ...baseStyle, ...positions[position] }} />
}
