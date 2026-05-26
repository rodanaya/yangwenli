/**
 * SpotlightCard — focal element of the M-CLUSTER P5 Spotlight pattern.
 *
 * When the user clicks a cluster, the galaxy dims and a SpotlightCard
 * appears AT the cluster's spatial position (not centered, not at a
 * corner — preserves the "I clicked THERE" memory).
 *
 * P5b (2026-05-26) editorial-brief upgrade. The card moved from
 * "summary panel" to "newsroom-style brief" — research showed that at
 * the decision moment ("is this cluster worth my time?") the user
 * needs narrative ink, not just data ink (Tufte / Bertin). Added:
 *
 *   • Editorial LEDE under the title (Playfair italic, sources meta.desc)
 *   • Hairline rule between title and lede (print-newspaper "rule")
 *   • Risk distribution mini-bar — 4-segment stacked bar computed
 *     from the actual vendor list (real data, not decoration)
 *   • CTAs demoted from heavy filled-color button to editorial links
 *     (Playfair italic chevron-link for primary, mono+arrow for secondary)
 *   • Lucide X icon replaces fat Unicode ✕
 *
 * Card layout (top → bottom):
 *   ┌─────────────────────────────┐
 *   │ ▎P3 · PATTERN          X    │  kicker + close
 *   │ Single-Use Intermediary     │  Playfair italic title
 *   │ ────                        │  hairline rule (NEW)
 *   │ A burst of contracts        │  LEDE (NEW)
 *   │ and a quiet exit.           │
 *   │  2,974   26   44%           │  3 stats
 *   │  VENDORS T1   HIGH+         │
 *   │  [pattern signature]        │  PatternSignature (kept — pattern identity)
 *   │ RISK DISTRIBUTION           │  (NEW)
 *   │ █▓▓░░░░░░░░░░░░░░           │
 *   │ crit 5 · high 12 · med 28 · low 55
 *   │ TOP                         │
 *   │ Acme · Beta · Gamma         │
 *   │ › Browse this cluster        │  link (Playfair italic, primary)
 *   │ → Open full dossier         │  link (mono, secondary)
 *   └─────────────────────────────┘
 *
 * Two CTAs:
 *   - "Browse this cluster" → calls onBrowse() → Atlas.tsx flips
 *     spotlightBrowsing=true, fly-to-cluster fires, full dock renders.
 *   - "Open full dossier →" → calls onOpenDossier() → navigates to
 *     /patterns/:code (for pattern lens) or /aria?pattern=:code otherwise.
 *
 * Cluster paginator lives at the bottom of the dimmer (rendered as a
 * sibling by Atlas.tsx), not inside the card — preserves the "compare
 * adjacent clusters" flow without crowding the card body.
 */

import * as React from 'react'
import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import type { ClusterMeta, NamedVendorDot } from '@/components/charts/ConcentrationConstellation'
import { formatVendorName } from '@/lib/vendor/formatName'
import { PatternSignature } from './PatternSignature'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { getExemplarFor } from '@/lib/atlas/pattern-exemplars'

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
const CARD_H_APPROX = 460  // bumped from 320 — added lede + risk bar

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
    riskDist: 'Risk distribution',
    critical: 'crit',
    high: 'high',
    medium: 'med',
    low: 'low',
    knownAs: 'Known as',
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
    riskDist: 'Distribución de riesgo',
    critical: 'crít',
    high: 'alto',
    medium: 'med',
    low: 'bajo',
    knownAs: 'Caso conocido',
    browse: 'Explorar este clúster',
    dossier: 'Abrir expediente completo',
    close: 'Cerrar',
  },
} as const

function kindLabel(code: string, lang: 'en' | 'es'): string {
  const t = COPY[lang]
  if (/^P\d$/.test(code)) return t.pattern
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

  // Compute screen-pixel position of the cluster's attractor.
  const cx = meta.fx * wrapperWidth
  const cy = meta.fy * wrapperHeight

  // Clamp so the card stays fully on-screen.
  const halfW = CARD_W / 2
  const halfH = CARD_H_APPROX / 2
  const MARGIN = 16
  const clampedX = Math.max(halfW + MARGIN, Math.min(wrapperWidth - halfW - MARGIN, cx))
  // Vertical: shift slightly below cluster (so card never sits ON the dots)
  const idealY = cy + halfH * 0.35
  const clampedY = Math.max(halfH + MARGIN, Math.min(wrapperHeight - halfH - MARGIN, idealY))

  const isPattern = /^P\d$/.test(meta.code)
  const top3 = (topVendors ?? []).slice(0, 3)
  const highPct = Math.round((meta.highRiskPct ?? 0) * 100)

  // P5b — Risk distribution computed from the actual vendor list.
  const dist = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const v of topVendors) {
      const level = getRiskLevelFromScore(v.riskScore)
      counts[level]++
    }
    const total = Math.max(1, topVendors.length)
    return {
      counts,
      pct: {
        critical: counts.critical / total,
        high: counts.high / total,
        medium: counts.medium / total,
        low: counts.low / total,
      },
      total,
    }
  }, [topVendors])

  // Editorial lede — sourced from meta.desc (existing) or fall back to the
  // raw description sans dash-delimited stats.
  const lede = meta.desc?.split(' — ')[0] ?? meta.desc ?? ''

  // P7 — Named exemplar (one well-known case per P1..P7 that anchors the
  // pattern in concrete reality). Null for non-pattern lenses.
  const exemplar = getExemplarFor(meta.code)
  const exemplarName = exemplar ? (lang === 'en' ? exemplar.name_en : exemplar.name_es) : null

  // P7b — Keyboard shortcuts in spotlight:
  //   B → Browse this cluster (in-page expansion)
  //   D → Open full dossier (subpage navigation)
  // Skipped when focus is inside an input/textarea (vendor search,
  // personal notes, etc.) to avoid hijacking text entry.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        onBrowse()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        onOpenDossier()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBrowse, onOpenDossier])

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
        border: '1px solid var(--color-border)',
        borderTop: `2px solid ${meta.color}`,
        borderRadius: 4,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        padding: 18,
        animation: 'spotlight-card-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <style>{`
        @keyframes spotlight-card-in {
          from { opacity: 0; transform: translate(-50%, -42%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Close × — top-right (lucide, finer than Unicode ✕) */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute hover:opacity-100"
        style={{
          top: 8,
          right: 8,
          padding: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          opacity: 0.7,
          borderRadius: 2,
          lineHeight: 0,
        }}
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
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

      {/* Hairline rule — print-style accent under title */}
      <div
        style={{
          height: 1,
          width: 36,
          background: meta.color,
          opacity: 0.6,
          marginTop: 10,
          marginBottom: 10,
        }}
        aria-hidden="true"
      />

      {/* Editorial lede — Playfair italic body */}
      {lede && (
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1.45,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
          }}
        >
          {lede}
        </div>
      )}

      {/* P7 — Named exemplar: one famous case per pattern. Anchors the
          abstract pattern in concrete history. Rendered between lede and
          stats so the eye reads narrative → anchor case → numbers. */}
      {exemplar && exemplarName && (
        <div
          className="mb-3"
          title={lang === 'en' ? exemplar.context_en ?? '' : exemplar.context_es ?? ''}
          style={{
            borderLeft: `2px solid ${meta.color}`,
            paddingLeft: 9,
            opacity: 0.95,
            cursor: (exemplar.context_en || exemplar.context_es) ? 'help' : undefined,
          }}
        >
          <div
            className="font-mono uppercase"
            style={{ fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--color-text-muted)', marginBottom: 1 }}
          >
            {t.knownAs}
          </div>
          <div
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.2,
              color: 'var(--color-text-primary)',
            }}
          >
            {exemplarName}
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginTop: 1 }}
          >
            {exemplar.period}
          </div>
        </div>
      )}

      {/* Stats — 3 cells */}
      <div className="grid grid-cols-3 gap-2">
        <StatCell value={meta.vendors.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.vendors} />
        <StatCell value={meta.t1.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.t1} />
        <StatCell value={`${highPct}%`} label={t.highPlus} />
      </div>

      {/* Pattern signature mini-viz (P1..P7 only) — pattern identity */}
      {isPattern && (
        <div className="mt-2">
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

      {/* Risk distribution stacked bar — actual cluster data */}
      {topVendors.length > 0 && (
        <div className="mt-3">
          <div
            className="font-mono uppercase"
            style={{ fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--color-text-muted)', marginBottom: 5 }}
          >
            {t.riskDist}
          </div>
          <div
            role="img"
            aria-label={`Critical ${Math.round(dist.pct.critical * 100)}%, High ${Math.round(dist.pct.high * 100)}%, Medium ${Math.round(dist.pct.medium * 100)}%, Low ${Math.round(dist.pct.low * 100)}%`}
            style={{
              display: 'flex',
              height: 6,
              borderRadius: 1,
              overflow: 'hidden',
              background: 'var(--color-border)',
            }}
          >
            {(['critical', 'high', 'medium', 'low'] as const).map(level => (
              dist.pct[level] > 0 ? (
                <div
                  key={level}
                  style={{
                    width: `${dist.pct[level] * 100}%`,
                    background: RISK_COLORS[level],
                  }}
                />
              ) : null
            ))}
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <span><span style={{ color: RISK_COLORS.critical, fontWeight: 700 }}>{t.critical}</span> {Math.round(dist.pct.critical * 100)}%</span>
            <span><span style={{ color: RISK_COLORS.high, fontWeight: 700 }}>{t.high}</span> {Math.round(dist.pct.high * 100)}%</span>
            <span><span style={{ color: RISK_COLORS.medium, fontWeight: 700 }}>{t.medium}</span> {Math.round(dist.pct.medium * 100)}%</span>
            <span><span style={{ color: RISK_COLORS.low, fontWeight: 700 }}>{t.low}</span> {Math.round(dist.pct.low * 100)}%</span>
          </div>
        </div>
      )}

      {/* Top 3 vendors */}
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

      {/* CTAs — editorial links, not heavy buttons */}
      <div className="mt-4 flex flex-col" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
        <button
          type="button"
          onClick={onBrowse}
          className="text-left hover:underline transition-colors"
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 15,
            color: meta.color,
            background: 'transparent',
            border: 'none',
            padding: '6px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13 }}>›</span>
          <span style={{ flex: 1 }}>{t.browse}</span>
          <KeyHint label="B" />
        </button>
        <button
          type="button"
          onClick={onOpenDossier}
          className="text-left hover:underline transition-colors"
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            padding: '6px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <span style={{ flex: 1 }}>{t.dossier} <span>→</span></span>
          <KeyHint label="D" />
        </button>
      </div>
    </div>
  )
}

function KeyHint({ label }: { label: string }) {
  return (
    <kbd
      className="font-mono"
      style={{
        background: 'var(--color-border)',
        color: 'var(--color-text-muted)',
        padding: '1px 5px',
        borderRadius: 2,
        fontSize: 9,
        letterSpacing: '0.05em',
        fontWeight: 600,
        textTransform: 'uppercase',
        lineHeight: 1.3,
        flexShrink: 0,
      }}
    >
      {label}
    </kbd>
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
