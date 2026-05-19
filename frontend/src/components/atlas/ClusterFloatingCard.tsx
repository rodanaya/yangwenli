/**
 * ClusterFloatingCard — compact identity + stats card pinned inside the
 * canvas while a cluster is zoomed.
 *
 * Replaces the old 320px right rail (M-OBS Phase 2): instead of a full-height
 * side panel describing the focused cluster, we render a 280px floating card
 * top-right of the constellation canvas. The canvas becomes the page.
 *
 * Visual contract:
 *   ┌─────────────────────────┐
 *   │ {code} · PATTERN        │  kicker mono 9px uppercase
 *   │ {label}                 │  Playfair italic 18px
 *   │  44      23      85%    │  3 stat cells: Playfair italic 18px
 *   │ VENDORS · T1 · HIGH+    │  mono 8-9px uppercase
 *   │ Top: {v1}/{v2}/{v3}     │  top 3 vendors (formatVendorName)
 *   │ [Investigate →]      ✕  │  link to /aria?pattern={code} + close
 *   └─────────────────────────┘
 *
 * Bilingual; vendor names always through formatVendorName().
 */

import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import type {
  ClusterMeta,
  NamedVendorDot,
} from '@/components/charts/ConcentrationConstellation'
import { formatVendorName } from '@/lib/vendor/formatName'

interface ClusterFloatingCardProps {
  meta: ClusterMeta
  yearLabel?: number
  yearDeltaT1?: number
  yearDeltaPct?: number
  topVendors?: NamedVendorDot[]
  onClose: () => void
  lang: 'en' | 'es'
}

const COPY = {
  en: {
    pattern: 'PATTERN',
    vendors: 'VENDORS',
    t1: 'T1 LEADS',
    highPlus: 'HIGH+',
    top: 'Top',
    investigate: 'Investigate →',
    close: 'Close cluster card',
  },
  es: {
    pattern: 'PATRÓN',
    vendors: 'PROVEEDORES',
    t1: 'LÍDERES T1',
    highPlus: 'ALTO+',
    top: 'Top',
    investigate: 'Investigar →',
    close: 'Cerrar tarjeta de clúster',
  },
} as const

export function ClusterFloatingCard({
  meta,
  yearLabel,
  yearDeltaT1,
  yearDeltaPct,
  topVendors,
  onClose,
  lang,
}: ClusterFloatingCardProps) {
  const navigate = useNavigate()
  const t = COPY[lang]

  const handleInvestigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/aria?pattern=${encodeURIComponent(meta.code)}`)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const top3 = (topVendors ?? []).slice(0, 3)
  const highPct = Math.round((meta.highRiskPct ?? 0) * 100)
  const hasDelta =
    typeof yearLabel === 'number' &&
    (typeof yearDeltaT1 === 'number' || typeof yearDeltaPct === 'number')

  return (
    <div
      className="bg-background-card border border-border rounded-sm shadow-md p-3 w-[320px]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={`${meta.code} · ${meta.label}`}
    >
      {/* Kicker — code · PATTERN */}
      <div
        className="font-mono text-[9px] uppercase text-text-muted"
        style={{ letterSpacing: '0.14em' }}
      >
        {meta.code} · {t.pattern}
      </div>

      {/* Label — editorial title */}
      <div
        className="text-text-primary mt-1"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.15,
        }}
      >
        {meta.label}
      </div>

      {/* Optional year-delta line */}
      {hasDelta && (
        <div
          className="mt-1 font-mono text-[9px] uppercase text-text-muted"
          style={{ letterSpacing: '0.14em' }}
        >
          {yearLabel}
          {typeof yearDeltaT1 === 'number' && (
            <> · ΔT1 {yearDeltaT1 >= 0 ? '+' : ''}{yearDeltaT1}</>
          )}
          {typeof yearDeltaPct === 'number' && (
            <> · {yearDeltaPct >= 0 ? '+' : ''}{yearDeltaPct.toFixed(0)}%</>
          )}
        </div>
      )}

      {/* Stat row — 3 cells */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCell value={meta.vendors.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.vendors} />
        <StatCell value={meta.t1.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} label={t.t1} />
        <StatCell value={`${highPct}%`} label={t.highPlus} />
      </div>

      {/* Top vendors */}
      {top3.length > 0 && (
        <div className="mt-3">
          <div
            className="font-mono text-[9px] uppercase text-text-muted mb-1"
            style={{ letterSpacing: '0.14em' }}
          >
            {t.top}
          </div>
          <ul className="font-mono text-[11px] text-text-secondary space-y-0.5">
            {top3.map((v) => (
              <li key={v.vendorId} className="leading-snug" title={formatVendorName(v.name, 80)}>
                {formatVendorName(v.name, 36)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer — investigate + close */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleInvestigate}
          className="font-mono text-[11px] uppercase hover:underline transition-colors"
          style={{
            color: 'var(--color-accent)',
            letterSpacing: '0.1em',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {t.investigate}
        </button>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.close}
          className="text-text-muted hover:text-text-primary transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            lineHeight: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

interface StatCellProps {
  value: string
  label: string
}

function StatCell({ value, label }: StatCellProps) {
  return (
    <div>
      <div
        className="text-text-primary tabular-nums"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono text-[8px] uppercase text-text-muted mt-0.5"
        style={{ letterSpacing: '0.12em' }}
      >
        {label}
      </div>
    </div>
  )
}
