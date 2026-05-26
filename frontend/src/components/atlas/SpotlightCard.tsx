/**
 * SpotlightCard — focal element of the M-CLUSTER P5 Spotlight pattern.
 *
 * When the user clicks a cluster, the galaxy dims and a SpotlightCard
 * appears AT the cluster's spatial position (not centered, not at a
 * corner — preserves the "I clicked THERE" memory). The card hosts:
 *
 *   ┌─────────────────────────────┐
 *   │ P3 · PATTERN                │ kicker
 *   │ Single-Use Intermediary     │ Playfair italic
 *   │  2,974    26    44%         │ 3 stats (Playfair)
 *   │ VENDORS · T1 · HIGH+        │ mono labels
 *   │ [pattern signature viz]     │ 240×40 inline
 *   │                             │
 *   │ Top: Acme · Beta · Gamma    │ first 3 vendor names
 *   │                             │
 *   │ [ Browse this cluster   ⌄ ] │ → in-page expansion (URL: ?browse=1)
 *   │ [ Open full dossier     →]  │ → /patterns/:code route
 *   └─────────────────────────────┘
 *
 * Card is positioned at the cluster's screen coordinates (fx, fy fractions
 * of the wrapper's bounding box) with translate(-50%, -50%) so it appears
 * centered on the attractor. The card's max-width is bounded so it never
 * overflows the canvas; if a cluster sits near an edge, the card is
 * clamped to stay fully on screen.
 *
 * Two CTAs:
 *   - "Browse this cluster"  → calls onBrowse() — Atlas.tsx flips
 *     spotlightOnly false, fly-to-cluster fires, full dock renders.
 *   - "Open full dossier →"  → calls onOpenDossier() — navigates to
 *     /patterns/:code (for pattern lens) or /aria?pattern=:code otherwise.
 *
 * Cluster paginator lives at the bottom of the dimmer (rendered as a
 * sibling by Atlas.tsx), not inside the card — preserves the "compare
 * adjacent clusters" flow without crowding the card body.
 */

import * as React from 'react'
import type { ClusterMeta, NamedVendorDot } from '@/components/charts/ConcentrationConstellation'
import { formatVendorName } from '@/lib/vendor/formatName'
import { PatternSignature } from './PatternSignature'

export interface SpotlightCardProps {
  /** Currently-focused cluster's metadata. */
  meta: ClusterMeta
  /** Top vendors in this cluster (first 3 are shown inline). */
  topVendors: NamedVendorDot[]
  /** Wrapper width in CSS pixels (for clamping card position to stay on-screen). */
  wrapperWidth: number
  /** Wrapper height in CSS pixels. */
  wrapperHeight: number
  /** Expand the spotlight into the full ClusterDock (in-page expansion). */
  onBrowse: () => void
  /** Navigate to the deep dossier subpage. */
  onOpenDossier: () => void
  /** Close the spotlight entirely (escape cluster zoom). */
  onClose: () => void
  /** UI language. */
  lang: 'en' | 'es'
}

const CARD_W = 320
const CARD_H_APPROX = 320

const COPY = {
  en: {
    pattern: 'PATTERN',
    sector: 'SECTOR',
    term: 'PRES. TERM',
    category: 'CATEGORY',
    vendors: 'VENDORS',
    t1: 'T1 LEADS',
    highPlus: 'HIGH+',
    top: 'Top',
    browse: 'Browse this cluster',
    dossier: 'Open full dossier',
    close: 'Close',
  },
  es: {
    pattern: 'PATRÓN',
    sector: 'SECTOR',
    term: 'SEXENIO',
    category: 'CATEGORÍA',
    vendors: 'PROVEEDORES',
    t1: 'LÍDERES T1',
    highPlus: 'ALTO+',
    top: 'Top',
    browse: 'Explorar este clúster',
    dossier: 'Abrir expediente completo',
    close: 'Cerrar',
  },
} as const

function kindLabel(code: string, lang: 'en' | 'es'): string {
  const t = COPY[lang]
  if (/^P\d$/.test(code)) return t.pattern
  // Sectors / sexenios / categories — best-effort discrimination
  if (['salud', 'educacion', 'infraestructura', 'energia', 'defensa', 'tecnologia', 'hacienda', 'gobernacion', 'agricultura', 'ambiente', 'trabajo', 'otros'].includes(code)) return t.sector
  if (['zedillo', 'fox', 'calderon', 'pena', 'amlo', 'sheinbaum'].includes(code)) return t.term
  return t.category
}

export function SpotlightCard({
  meta,
  topVendors,
  wrapperWidth,
  wrapperHeight,
  onBrowse,
  onOpenDossier,
  onClose,
  lang,
}: SpotlightCardProps): React.ReactElement {
  const t = COPY[lang]

  // Compute screen-pixel position of the cluster's attractor
  const cx = meta.fx * wrapperWidth
  const cy = meta.fy * wrapperHeight

  // Clamp the card so it stays fully on-screen.
  // Card is positioned with translate(-50%, -50%); compute the clamped
  // center so the card's left/right/top/bottom edges stay inside the wrapper.
  const halfW = CARD_W / 2
  const halfH = CARD_H_APPROX / 2
  const MARGIN = 16
  const clampedX = Math.max(halfW + MARGIN, Math.min(wrapperWidth - halfW - MARGIN, cx))
  // For vertical: prefer the card NEAR the cluster but with bottom-bias
  // (cluster centers tend to be in middle; we'd rather have the card
  // appear below the cluster than overlap it).
  const idealY = cy + halfH * 0.35  // shift slightly below cluster
  const clampedY = Math.max(halfH + MARGIN, Math.min(wrapperHeight - halfH - MARGIN, idealY))

  const isPattern = /^P\d$/.test(meta.code)
  const top3 = (topVendors ?? []).slice(0, 3)
  const highPct = Math.round((meta.highRiskPct ?? 0) * 100)

  return (
    <div
      role="dialog"
      aria-label={`${meta.code} · ${meta.label}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute z-30"
      style={{
        left: clampedX,
        top: clampedY,
        transform: 'translate(-50%, -50%)',
        width: CARD_W,
        background: 'var(--color-background-card)',
        border: `1px solid var(--color-border)`,
        borderTop: `2px solid ${meta.color}`,
        borderRadius: 4,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        padding: 16,
        animation: 'spotlight-card-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <style>{`
        @keyframes spotlight-card-in {
          from { opacity: 0; transform: translate(-50%, -42%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Close × — top-right */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute"
        style={{
          top: 6,
          right: 6,
          padding: '4px 6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 14,
          lineHeight: 1,
          borderRadius: 2,
        }}
      >
        ✕
      </button>

      {/* Kicker — CODE · KIND */}
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: '0.14em',
          color: meta.color,
          fontWeight: 700,
        }}
      >
        {meta.code} · {kindLabel(meta.code, lang)}
      </div>

      {/* Title — Playfair italic */}
      <div
        className="break-words mt-1"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 22,
          lineHeight: 1.15,
          color: 'var(--color-text-primary)',
        }}
      >
        {meta.label}
      </div>

      {/* Stats — 3 cells */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCell value={meta.vendors.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.vendors} />
        <StatCell value={meta.t1.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.t1} />
        <StatCell value={`${highPct}%`} label={t.highPlus} />
      </div>

      {/* Pattern signature mini-viz (P1..P7 only) */}
      {isPattern && (
        <div className="mt-3">
          <PatternSignature
            code={meta.code}
            topVendors={top3.map(v => ({ vendorId: v.vendorId, riskScore: v.riskScore }))}
            totalVendors={meta.vendors}
            t1={meta.t1}
            highRiskPct={meta.highRiskPct ?? 0}
            lang={lang}
          />
        </div>
      )}

      {/* Top 3 vendors — brief preview */}
      {top3.length > 0 && (
        <div className="mt-3">
          <div
            className="font-mono uppercase"
            style={{ fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            {t.top}
          </div>
          <ul className="space-y-0.5" role="list">
            {top3.map(v => (
              <li
                key={v.vendorId}
                className="truncate font-mono"
                style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.3 }}
                title={formatVendorName(v.name, 80)}
              >
                {formatVendorName(v.name, 36)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Two CTAs */}
      <div className="mt-4 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onBrowse}
          className="text-left transition-colors"
          style={{
            background: meta.color,
            color: '#fff',
            border: 'none',
            padding: '8px 12px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.browse} ⌄
        </button>
        <button
          type="button"
          onClick={onOpenDossier}
          className="text-left hover:underline transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-border)',
            padding: '8px 12px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.dossier} →
        </button>
      </div>
    </div>
  )
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 18,
          lineHeight: 1.1,
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
      <div
        className="font-mono uppercase mt-0.5"
        style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
    </div>
  )
}
