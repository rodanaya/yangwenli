/**
 * AtlasVendorDrawer — collapsible bottom drawer listing all vendors in the
 * active cluster (M-OBS Phase 3).
 *
 * Default: collapsed (32px handle only). Click handle → expands to ~40vh
 * scrollable list. Each row uses DotBar-equivalent density. Click row →
 * navigate to /thread/{vendorId}.
 *
 * Design spec: designs/M-OBS-spec.md · Replacement 3B.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { NamedVendorDot } from '@/components/charts/ConcentrationConstellation'
import { formatVendorName } from '@/lib/vendor/formatName'
import { DotBar } from '@/components/ui/DotBar'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

interface AtlasVendorDrawerProps {
  clusterCode: string
  clusterLabel: string
  vendors: NamedVendorDot[]
  lang: 'en' | 'es'
}

export function AtlasVendorDrawer({
  clusterCode,
  clusterLabel,
  vendors,
  lang,
}: AtlasVendorDrawerProps) {
  const navigate = useNavigate()
  // 2026-05-21 — Default OPEN on desktop, COLLAPSED on narrow screens.
  // User feedback: "too many clicks to see the vendors". Cluster zoom now
  // surfaces the vendor list immediately on desktop, while mobile still
  // gets a handle so the small canvas isn't dominated.
  const isDesktop = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(min-width: 1024px)').matches
  const [open, setOpen] = useState(isDesktop)

  // Esc collapses the drawer (when expanded). Does NOT escape zoom.
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

  // Reset open state whenever the cluster changes — match the initial-mount
  // default so cluster switches consistently re-expand on desktop.
  useEffect(() => {
    const desktopNow = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(min-width: 1024px)').matches
    setOpen(desktopNow)
  }, [clusterCode])

  if (vendors.length === 0) return null

  const count = vendors.length
  const sorted = [...vendors].sort((a, b) => b.riskScore - a.riskScore)

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      style={{
        background: 'var(--color-background-card)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Handle — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full h-8 px-3 flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-background-elevated/60 transition-colors"
        style={{
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span className="truncate">
          {open
            ? <ChevronDown className="inline h-3 w-3 align-[-2px] mr-1" />
            : <ChevronUp className="inline h-3 w-3 align-[-2px] mr-1" />}
          {lang === 'en' ? 'Vendors in' : 'Proveedores en'}{' '}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {clusterCode}
          </span>{' '}
          · {clusterLabel}
          <span style={{ color: 'var(--color-text-muted)' }}> ({count})</span>
        </span>
      </button>

      {/* Expanded list */}
      {open && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: '40vh', borderTop: '1px solid var(--color-border)' }}
        >
          <ul role="list">
            {sorted.map((v) => {
              const level = getRiskLevelFromScore(v.riskScore)
              const riskColor = RISK_COLORS[level]
              const pct = Math.round(v.riskScore * 100)
              return (
                <li key={v.vendorId}>
                  <button
                    type="button"
                    onClick={() => navigate(`/thread/${v.vendorId}`)}
                    className="w-full h-7 px-3 flex items-center gap-3 hover:bg-background-elevated/60 transition-colors text-left"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
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
                      className="font-mono text-[11px] truncate flex-1 min-w-0"
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
                      className="font-mono text-[11px] tabular-nums w-8 text-right flex-shrink-0"
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
      )}
    </div>
  )
}
