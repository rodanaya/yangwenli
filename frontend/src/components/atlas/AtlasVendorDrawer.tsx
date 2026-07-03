/**
 * AtlasVendorDrawer — unified cluster dock (M-CLUSTER P4 refactor).
 *
 * Single bottom dock replacing the old ClusterFloatingCard (top-right) +
 * standalone ClusterPaginator (bottom-14). One dock, three columns:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ‹ P6   P3 · SINGLE-USE INTERMEDIARY   P5 ›              ⌃ ✕ │ header
 *   ├──────────┬──────────────────────────┬───────────────────────┤
 *   │  STATS   │ TOP VENDORS BY RISK      │ ACTIONS               │ body
 *   │  + sig   │ (DotBar rows, scrollable)│ (investigate + dist)  │
 *   └──────────┴──────────────────────────┴───────────────────────┘
 *
 * Auto-opens on desktop when a cluster is selected; collapses to the 40px
 * header on click. Click row → /vendors/{vendorId} (vendor profile).
 *
 * Behaviour replaces three earlier surfaces:
 *   - ClusterFloatingCard (top-right glance card) — DELETED from render
 *   - ClusterPaginator (bottom-14 standalone strip) — DELETED from render
 *   - Old AtlasVendorDrawer (this file, pre-refactor) — UPGRADED in place
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type {
  ClusterMeta,
  NamedVendorDot,
} from '@/components/charts/ConcentrationConstellation'
import { formatVendorName } from '@/lib/vendor/formatName'
import { DotBar } from '@/components/ui/DotBar'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { PatternSignature } from './PatternSignature'

interface AtlasVendorDrawerProps {
  /** Currently focused cluster. */
  meta: ClusterMeta
  /** All clusters in the active lens, used for prev/next paginator order. */
  clusters: ClusterMeta[]
  /** Vendors in the focused cluster (sorted internally by risk desc). */
  vendors: NamedVendorDot[]
  /** Fly to another cluster (paginator + jump dots). */
  onJumpToCluster: (code: string) => void
  /** Exit cluster zoom entirely (✕ button). */
  onClose: () => void
  /** Open the dossier route for the current pattern. */
  onInvestigate: () => void
  lang: 'en' | 'es'
}

export function AtlasVendorDrawer({
  meta,
  clusters,
  vendors,
  onJumpToCluster,
  onClose,
  onInvestigate,
  lang,
}: AtlasVendorDrawerProps) {
  const navigate = useNavigate()

  // Default OPEN on desktop, COLLAPSED on narrow. Same UX as before refactor.
  const isDesktop = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(min-width: 1024px)').matches
  const [open, setOpen] = useState(isDesktop)

  // Esc collapses (when expanded). Does NOT escape zoom.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  // Reset open state on cluster change — re-expand consistently on desktop.
  useEffect(() => {
    const desktopNow = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(min-width: 1024px)').matches
    setOpen(desktopNow)
  }, [meta.code])

  const idx = clusters.findIndex(c => c.code === meta.code)
  const prev = idx >= 0 ? clusters[(idx - 1 + clusters.length) % clusters.length] : null
  const next = idx >= 0 ? clusters[(idx + 1) % clusters.length] : null

  const count = vendors.length
  const sorted = [...vendors].sort((a, b) => b.riskScore - a.riskScore)
  const highPct = Math.round((meta.highRiskPct ?? 0) * 100)
  const isPattern = /^P\d$/.test(meta.code)

  // Risk distribution counts (for ACTIONS column)
  const dist = sorted.reduce(
    (acc, v) => {
      const lv = getRiskLevelFromScore(v.riskScore)
      acc[lv]++
      return acc
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<'critical' | 'high' | 'medium' | 'low', number>,
  )

  const txt = {
    en: {
      vendorsIn: 'Vendors in',
      stats: 'Stats',
      vendors: 'Vendors',
      t1: 'T1 leads',
      highPlus: 'High+',
      topVendorsByRisk: 'Top vendors by risk',
      actions: 'Actions',
      investigate: 'Open as queue →',
      patternDossier: 'Pattern dossier →',
      riskDist: 'Risk distribution',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      close: 'Exit cluster',
      prevC: (c: string) => `Previous: ${c}`,
      nextC: (c: string) => `Next: ${c}`,
      pickList: 'Pick a cluster',
    },
    es: {
      vendorsIn: 'Proveedores en',
      stats: 'Estadísticas',
      vendors: 'Proveedores',
      t1: 'Líderes T1',
      highPlus: 'Alto+',
      topVendorsByRisk: 'Proveedores por riesgo',
      actions: 'Acciones',
      investigate: 'Abrir como cola →',
      patternDossier: 'Expediente del patrón →',
      riskDist: 'Distribución de riesgo',
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
      close: 'Salir del clúster',
      prevC: (c: string) => `Anterior: ${c}`,
      nextC: (c: string) => `Siguiente: ${c}`,
      pickList: 'Elige un clúster',
    },
  }[lang]

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      style={{
        background: 'var(--color-background-card)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* ─── HEADER (40px) — paginator + close, always visible ─── */}
      <div
        className="h-10 px-3 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {/* Prev cluster button */}
        {prev && (
          <button
            type="button"
            onClick={() => onJumpToCluster(prev.code)}
            className="hover:opacity-80 transition-opacity"
            style={{ color: prev.color, fontWeight: 600, padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title={txt.prevC(prev.label)}
            aria-label={txt.prevC(prev.label)}
          >
            ‹ {prev.code}
          </button>
        )}

        {/* Center — current cluster name (Playfair) + jump dots */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
          <span
            className="truncate"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'normal',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: 'normal',
              textTransform: 'none',
              color: 'var(--color-text-primary)',
            }}
          >
            <span style={{ color: meta.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 6 }}>
              {meta.code}
            </span>
            {meta.label}
          </span>
          {/* Jump dots */}
          {clusters.length <= 12 && (
            <span className="hidden sm:flex items-center gap-1" role="navigation" aria-label={txt.pickList}>
              {clusters.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onJumpToCluster(c.code)}
                  aria-label={c.label}
                  title={c.label}
                  className="hover:scale-110 transition-transform"
                  style={{
                    width: 9, height: 9, borderRadius: 999,
                    background: c.code === meta.code ? c.color : 'transparent',
                    border: `1.5px solid ${c.color}`,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </span>
          )}
        </div>

        {/* Next cluster button */}
        {next && (
          <button
            type="button"
            onClick={() => onJumpToCluster(next.code)}
            className="hover:opacity-80 transition-opacity"
            style={{ color: next.color, fontWeight: 600, padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title={txt.nextC(next.label)}
            aria-label={txt.nextC(next.label)}
          >
            {next.code} ›
          </button>
        )}

        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse dock' : 'Expand dock'}
          className="hover:bg-background-elevated/60 transition-colors"
          style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: 2 }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {/* Close (exit cluster) */}
        <button
          type="button"
          onClick={onClose}
          aria-label={txt.close}
          title={txt.close}
          className="hover:bg-background-elevated/60 transition-colors"
          style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: 2 }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ─── BODY (expandable) — 3 columns on desktop, stacked on mobile ─── */}
      {open && vendors.length > 0 && (
        <div
          className="grid gap-0 lg:grid-cols-[220px_1fr_220px] grid-cols-1"
          style={{
            maxHeight: '40vh',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-background)',
          }}
        >
          {/* ── STATS column ───────────────────────────────────────── */}
          <div className="px-3 py-3 lg:border-r lg:border-border" style={{ borderRightColor: 'var(--color-border)' }}>
            <div
              className="font-mono uppercase mb-2"
              style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
            >
              {txt.stats}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCell value={meta.vendors.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={txt.vendors} />
              <StatCell value={meta.t1.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={txt.t1} />
              <StatCell value={`${highPct}%`} label={txt.highPlus} />
            </div>
            {isPattern && (
              <div className="mt-2">
                <PatternSignature
                  code={meta.code}
                  topVendors={sorted.slice(0, 10).map(v => ({ vendorId: v.vendorId, riskScore: v.riskScore }))}
                  totalVendors={meta.vendors}
                  t1={meta.t1}
                  highRiskPct={meta.highRiskPct ?? 0}
                  lang={lang}
                />
              </div>
            )}
          </div>

          {/* ── VENDORS column ─────────────────────────────────────── */}
          <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
            <div
              className="font-mono uppercase px-3 pt-3 pb-1 sticky top-0"
              style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-muted)', background: 'var(--color-background)' }}
            >
              {txt.topVendorsByRisk} · {count}
            </div>
            <ul role="list">
              {sorted.map((v) => {
                const level = getRiskLevelFromScore(v.riskScore)
                const riskColor = RISK_COLORS[level]
                const pct = Math.round(v.riskScore * 100)
                return (
                  <li key={v.vendorId}>
                    <button
                      type="button"
                      onClick={() => navigate(`/vendors/${v.vendorId}`)}
                      className="w-full h-7 px-3 flex items-center gap-3 hover:bg-background-elevated/60 transition-colors text-left"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      title={formatVendorName(v.name, 80)}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: riskColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="font-mono text-[13px] truncate flex-1 min-w-0"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {formatVendorName(v.name, 50)}
                      </span>
                      <span style={{ flexShrink: 0 }}>
                        <DotBar
                          value={v.riskScore}
                          max={1}
                          color={riskColor}
                          ariaLabel={`${pct}% risk`}
                        />
                      </span>
                      <span
                        className="font-mono text-[13px] tabular-nums w-8 text-right flex-shrink-0"
                        style={{ color: riskColor, fontWeight: 600 }}
                      >
                        {pct}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── ACTIONS column ─────────────────────────────────────── */}
          <div className="px-3 py-3 lg:border-l lg:border-border" style={{ borderLeftColor: 'var(--color-border)' }}>
            <div
              className="font-mono uppercase mb-2"
              style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
            >
              {txt.actions}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={onInvestigate}
                className="font-mono text-[13px] uppercase text-left hover:underline transition-colors"
                style={{
                  color: 'var(--color-accent)',
                  letterSpacing: '0.08em',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 0',
                  cursor: 'pointer',
                }}
              >
                {isPattern ? txt.patternDossier : txt.investigate}
              </button>
            </div>

            <div
              className="font-mono uppercase mt-4 mb-2"
              style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
            >
              {txt.riskDist}
            </div>
            <div className="space-y-1">
              {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                <div key={level} className="flex items-center gap-2 font-mono text-[13px]">
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: RISK_COLORS[level],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="flex-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {txt[level]}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                  >
                    {dist[level]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small stat cell for the STATS column ────────────────────────────────
function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'normal',
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
