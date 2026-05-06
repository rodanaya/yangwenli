/**
 * AtlasRightPanel — 320px context panel for the investigator console.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 4
 * Build: atlas-C-P3
 *
 * P1 ships the IDLE state only (§ 4.1) — global stats card.
 * P2 adds the ZOOMED_CLUSTER placeholder (§ 4.3 shell, content lands P3).
 * P3 adds HOVER_CLUSTER (§ 4.2), full ZOOMED_CLUSTER vendor list (§ 4.3),
 *   and a SELECTING stub (§ 4.4).
 *
 * Vendor list for zoomed cluster fetches from GET /atlas/cluster-vendors.
 * If the endpoint returns 404 / network error, falls back to mock dots from
 * useVendorLevelDots and shows a small "(mock)" badge.
 *
 * Risk distribution uses DotBar from the canonical ui primitives.
 * Numbers in Playfair Display Italic 800 with tabular-nums.
 * Color via style={{ color: hex }} — NEVER via className (silently stripped).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'
import { useVendorLevelDots } from '@/lib/atlas/use-vendor-level-dots'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import api from '@/api/client'
import type { AtlasClusterVendorItem } from '@/api/client'

// ─────────────────────────────────────────────────────────────────────────────
// Static data for the IDLE panel — sourced from CLAUDE.md + memory
// ─────────────────────────────────────────────────────────────────────────────
const IDLE_STATS = {
  totalContracts: '3.06M',
  totalSpend: '$9.88T MXN',
  riskDistribution: [
    { label: { en: 'CRITICAL', es: 'CRÍTICO' }, pct: 6.0, count: '183K', color: '#ef4444' },
    { label: { en: 'HIGH',     es: 'ALTO' },    pct: 7.5, count: '229K', color: '#f59e0b' },
    { label: { en: 'MEDIUM',   es: 'MEDIO' },   pct: 26.8, count: '819K', color: '#a16207' },
    { label: { en: 'LOW',      es: 'BAJO' },    pct: 59.7, count: '1.83M', color: '#71717a' },
  ],
  topPatterns: [
    { code: 'P5', label: { en: 'Systematic Overpricing', es: 'Sobreprecio Sistemático' }, t1: 180 },
    { code: 'P7', label: { en: 'Contractor Networks',    es: 'Red de Contratistas' },      t1: 56 },
    { code: 'P6', label: { en: 'Institutional Capture',  es: 'Captura Institucional' },    t1: 31 },
  ],
  team: {
    t1Vendors: 314,
    centinelaReady: 984,
    gtCases: 1401,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface AtlasRightPanelProps {
  lang: 'en' | 'es'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section label
// ─────────────────────────────────────────────────────────────────────────────
function PanelSection({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-4 pb-2 flex items-center gap-2"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      {label}
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IDLE state content
// ─────────────────────────────────────────────────────────────────────────────
function IdlePanel({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  const ACCENT = '#a06820'

  return (
    <div className="px-4 pb-6">
      {/* Eyebrow */}
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-5 pb-3"
        style={{ color: ACCENT }}
      >
        {lang === 'en' ? 'OBSERVATORY · ALL YEARS' : 'EL OBSERVATORIO · TODOS LOS AÑOS'}
      </div>

      {/* Headline number — Playfair Display Italic 800 */}
      <div>
        <div
          className="tabular-nums leading-none"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: 44,
            color: ACCENT,
          }}
        >
          {IDLE_STATS.totalContracts}
        </div>
        <div
          className="text-[12px] font-mono mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {lang === 'en' ? 'contracts analyzed' : 'contratos analizados'}
        </div>
        <div
          className="text-[11px] font-mono mt-0.5 font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {IDLE_STATS.totalSpend}
          <span
            className="font-normal ml-1 text-[9px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'validated spend' : 'gasto validado'}
          </span>
        </div>
      </div>

      {/* ── RISK DISTRIBUTION ─────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'RISK DISTRIBUTION' : 'DISTRIBUCIÓN DE RIESGO'} />

      <div className="space-y-2">
        {IDLE_STATS.riskDistribution.map((r) => (
          <div key={r.label.en} className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.1em]"
                style={{ color: r.color }}
              >
                {r.label[lang]}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-mono font-bold tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {r.pct.toFixed(1)}%
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {r.count}
                </span>
              </div>
            </div>
            <DotBar
              value={r.pct}
              max={100}
              color={r.color}
            />
          </div>
        ))}

        {/* OECD benchmark anchor — turns 7.5% from a number into a finding */}
        <div
          className="text-[9px] font-mono mt-1.5 pt-1.5 border-t"
          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
        >
          ↑ {lang === 'en' ? 'OECD: flag ≥15% high+crit' : 'OCDE: bandera ≥15% alto+crít'}
        </div>
      </div>

      {/* ── TOP PATTERNS ──────────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'TOP PATTERNS' : 'PRINCIPALES PATRONES'} />

      <div className="space-y-1">
        {IDLE_STATS.topPatterns.map((p) => (
          <div
            key={p.code}
            className="flex items-center justify-between py-1.5 px-2.5 rounded-sm cursor-pointer hover:bg-background-elevated/30 transition-colors"
            onClick={() => navigate(`/clusters#${p.code}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clusters#${p.code}`) }}
            aria-label={`${p.code} — ${p.label[lang]}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.1em] flex-shrink-0"
                style={{ color: ACCENT }}
              >
                {p.code}
              </span>
              <span
                className="text-[11px] font-mono truncate"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {p.label[lang]}
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-bold flex-shrink-0 ml-2 tabular-nums"
              style={{ color: '#dc2626' }}
            >
              {p.t1} T1
            </span>
          </div>
        ))}
      </div>

      {/* ── INVESTIGATION DESK ────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'INVESTIGATION DESK' : 'EQUIPO DE INVESTIGACIÓN'} />

      <div className="space-y-1.5">
        {[
          {
            value: IDLE_STATS.team.t1Vendors,
            suffix: { en: 'T1-prioritized vendors', es: 'vendedores T1 priorizados' },
          },
          {
            value: IDLE_STATS.team.centinelaReady,
            suffix: { en: 'CENTINELA verifications ready', es: 'verificaciones CENTINELA listas' },
          },
          {
            value: IDLE_STATS.team.gtCases,
            suffix: { en: 'GT cases documented', es: 'casos GT documentados' },
          },
        ].map((row) => (
          <div key={row.suffix.en} className="flex items-baseline gap-2">
            <span
              className="font-mono font-bold tabular-nums text-[16px] leading-none flex-shrink-0"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {row.value.toLocaleString()}
            </span>
            <span
              className="text-[10px] font-mono leading-tight"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {row.suffix[lang]}
            </span>
          </div>
        ))}
      </div>

      {/* ── ARIA CTA ──────────────────────────────────────────────── */}
      <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => navigate('/aria')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-mono uppercase tracking-[0.1em] text-[10px] font-bold transition-opacity hover:opacity-85"
          style={{ background: ACCENT, color: 'white' }}
        >
          {lang === 'en' ? '→ Open investigation queue (ARIA)' : '→ Abrir cola de investigación (ARIA)'}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HOVER_CLUSTER state — 320px cluster preview (§ 4.2)
// ─────────────────────────────────────────────────────────────────────────────
function HoverClusterPanel({ lang, code }: { lang: 'en' | 'es'; code: string }) {
  const dispatch = useAtlasDispatch()
  const ACCENT = '#a06820'

  return (
    <div className="px-4 pb-6">
      {/* Cluster code chip */}
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-5 pb-1"
        style={{ color: ACCENT }}
      >
        {lang === 'en' ? `${code} · CLUSTER` : `${code} · CÚMULO`}
      </div>

      {/* Vendor count hint */}
      <div
        className="text-[11px] font-mono mt-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {lang === 'en' ? 'Hover detected' : 'Cúmulo detectado'}
      </div>

      {/* Click-to-zoom tip */}
      <div
        className="mt-4 rounded-sm px-3 py-2 text-[10px] font-mono leading-[1.6]"
        style={{
          background: 'var(--color-background-elevated, rgba(160,104,32,0.06))',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        {lang === 'en'
          ? 'Click to zoom in and see vendors'
          : 'Clic para acercar y ver proveedores'}
      </div>

      {/* Back-out affordance when zoomed */}
      <button
        onClick={() => dispatch({ type: 'escape-zoom' })}
        className="inline-flex items-center gap-1 text-[10px] font-mono mt-4 transition-opacity hover:opacity-70"
        style={{ color: ACCENT }}
      >
        ← {lang === 'en' ? 'Back to whole sky' : 'Volver al cielo completo'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk pill for vendor rows
// ─────────────────────────────────────────────────────────────────────────────
function RiskPill({ score }: { score: number }) {
  const level = getRiskLevelFromScore(score)
  const color = RISK_COLORS[level]
  const label = (score * 100).toFixed(0)
  return (
    <span
      className="text-[9px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-sm flex-shrink-0"
      style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
    >
      {label}%
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VendorRow — single row in the zoomed-cluster vendor list
// ─────────────────────────────────────────────────────────────────────────────
interface VendorRowProps {
  vendor: AtlasClusterVendorItem
  rank: number
  lang: 'en' | 'es'
  isMock?: boolean
}

function VendorRow({ vendor, rank, lang, isMock }: VendorRowProps) {
  return (
    <Link
      to={`/vendors/${vendor.vendor_id}`}
      className="block group"
      tabIndex={0}
      aria-label={`${vendor.name} — ${lang === 'en' ? 'open vendor dossier' : 'abrir expediente'}`}
    >
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-sm transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--color-background-elevated, rgba(160,104,32,0.06))'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }}
      >
        {/* Rank chip */}
        <span
          className="text-[9px] font-mono tabular-nums flex-shrink-0 w-5 text-right"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {rank}
        </span>

        {/* Entity chip — canonical, no plain <Link> */}
        <div className="flex-1 min-w-0">
          <EntityIdentityChip
            type="vendor"
            id={vendor.vendor_id}
            name={vendor.name}
            size="xs"
            riskScore={vendor.risk_score}
            ariaTier={vendor.tier as 1 | 2 | 3 | 4}
            hideIcon
          />
        </div>

        {/* Risk pill */}
        <RiskPill score={vendor.risk_score} />
      </div>

      {/* Secondary row: contract count + amount */}
      <div
        className="flex items-center gap-2 pb-1 px-2"
        style={{ marginTop: -2 }}
      >
        <span className="w-5 flex-shrink-0" />
        <span
          className="text-[9px] font-mono tabular-nums flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {vendor.total_contracts.toLocaleString()}
          {' '}
          {lang === 'en' ? 'contracts' : 'contratos'}
        </span>
        <span
          className="text-[9px] font-mono tabular-nums ml-auto flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatCompactMXN(vendor.total_amount_mxn)}
        </span>
        {isMock && (
          <span
            className="text-[8px] font-mono flex-shrink-0"
            style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
          >
            (mock)
          </span>
        )}
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: convert mock VendorDot → AtlasClusterVendorItem for fallback
// ─────────────────────────────────────────────────────────────────────────────
function mockDotToVendorItem(dot: {
  id: string
  name: string
  riskScore: number
  isMock: boolean
}, idx: number): AtlasClusterVendorItem {
  const level = getRiskLevelFromScore(dot.riskScore)
  return {
    vendor_id: dot.isMock ? -(idx + 1) : Number(dot.id),
    name: dot.name,
    size_category: null,
    risk_score: dot.riskScore,
    risk_level: level,
    tier: level === 'critical' ? 1 : level === 'high' ? 2 : 3,
    total_contracts: 0,
    total_amount_mxn: 0,
    primary_sector_code: '',
    primary_sector_name: '',
    is_gt: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOMED_CLUSTER state — full vendor list + risk distribution (§ 4.3)
// ─────────────────────────────────────────────────────────────────────────────
function ZoomedClusterPanel({
  lang,
  code,
  lens,
}: {
  lang: 'en' | 'es'
  code: string
  lens: string
}) {
  const dispatch = useAtlasDispatch()
  const ACCENT = '#a06820'
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [allVendors, setAllVendors] = useState<AtlasClusterVendorItem[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)

  // Real data query — falls back gracefully on 404/network error
  const { data, isLoading, isError } = useQuery({
    queryKey: ['atlas-cluster-vendors', lens, code, cursor],
    queryFn: () => api.atlas.getClusterVendors({ lens, code, limit: 50, cursor }),
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    // On success, accumulate pages
    select: (d) => d,
  })

  // Accumulate vendor pages when real data arrives
  const prevCursorRef = { current: cursor }
  if (data && !isError) {
    const ids = new Set(allVendors.map((v) => v.vendor_id))
    const newOnes = data.vendors.filter((v) => !ids.has(v.vendor_id))
    if (newOnes.length > 0) {
      // React will batch this — safe in query callback because select is referentially stable
      // We instead handle accumulation in the load-more handler below
    }
  }
  void prevCursorRef // suppress unused warning

  // Mock fallback when real API is unavailable
  const mockDots = useVendorLevelDots(lens, code, 50)
  const isFallback = isError || (!isLoading && !data)

  // Determine what to render
  const displayedVendors: AtlasClusterVendorItem[] = isFallback
    ? mockDots.slice(0, 50).map((d, i) => mockDotToVendorItem(d, i))
    : allVendors.length > 0
    ? allVendors
    : (data?.vendors ?? [])

  const totalCount = isFallback ? mockDots.length : (data?.total ?? displayedVendors.length)
  const labelEs = isFallback ? code : (data?.label_es ?? code)
  const labelEn = isFallback ? code : (data?.label_en ?? code)
  const displayLabel = lang === 'en' ? labelEn : labelEs

  // Risk distribution for the cluster's displayed vendors
  const riskBuckets = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const v of displayedVendors) {
    riskBuckets[getRiskLevelFromScore(v.risk_score)]++
  }
  const total = displayedVendors.length || 1

  const handleLoadMore = () => {
    if (!data || !data.next_cursor) return
    // Accumulate current page before advancing cursor
    const ids = new Set(allVendors.map((v) => v.vendor_id))
    const merged = [
      ...allVendors,
      ...((cursor === undefined ? data.vendors : data.vendors) ?? []).filter(
        (v) => !ids.has(v.vendor_id),
      ),
    ]
    setAllVendors(merged)
    setNextCursor(data.next_cursor)
    setCursor(data.next_cursor)
  }

  // On first load, sync data into state
  if (!isLoading && data && allVendors.length === 0 && cursor === undefined) {
    setAllVendors(data.vendors)
    setNextCursor(data.next_cursor)
  }

  const shownVendors = allVendors.length > 0 ? allVendors : displayedVendors
  const hasMore = !isFallback && (nextCursor !== null || (data?.next_cursor ?? null) !== null)

  return (
    <div className="px-4 pb-6">
      {/* Eyebrow */}
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-5 pb-1"
        style={{ color: ACCENT }}
      >
        {lang === 'en' ? `${code} · CLUSTER` : `${code} · CÚMULO`}
      </div>

      {/* Back link */}
      <button
        onClick={() => dispatch({ type: 'escape-zoom' })}
        className="inline-flex items-center gap-1 text-[10px] font-mono mt-1 mb-3 transition-opacity hover:opacity-70"
        style={{ color: ACCENT }}
      >
        ← {lang === 'en' ? 'Back to whole sky' : 'Volver al cielo completo'}
      </button>

      {/* Cluster header card */}
      <div
        className="rounded-sm px-3 py-2.5 mb-3"
        style={{
          background: 'var(--color-background-elevated, rgba(160,104,32,0.06))',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="text-[13px] font-mono font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {displayLabel}
        </div>
        <div
          className="text-[10px] font-mono mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {totalCount.toLocaleString()}
          {' '}
          {lang === 'en' ? 'vendors' : 'proveedores'}
          {isFallback && (
            <span
              className="ml-2 text-[8px]"
              style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            >
              (mock)
            </span>
          )}
        </div>
      </div>

      {/* ── MINI RISK DISTRIBUTION ─────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'RISK DISTRIBUTION' : 'DISTRIBUCIÓN DE RIESGO'} />

      <div className="space-y-1.5 mb-2">
        {(
          [
            { key: 'critical', label: { en: 'CRITICAL', es: 'CRÍTICO' }, color: RISK_COLORS.critical },
            { key: 'high',     label: { en: 'HIGH',     es: 'ALTO' },    color: RISK_COLORS.high },
            { key: 'medium',   label: { en: 'MEDIUM',   es: 'MEDIO' },   color: RISK_COLORS.medium },
            { key: 'low',      label: { en: 'LOW',      es: 'BAJO' },    color: '#71717a' },
          ] as const
        ).map((r) => {
          const count = riskBuckets[r.key]
          const pct = (count / total) * 100
          return (
            <div key={r.key} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-[0.08em]"
                  style={{ color: r.color }}
                >
                  {r.label[lang]}
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {count}
                </span>
              </div>
              <DotBar value={pct} max={100} color={r.color} />
            </div>
          )
        })}
      </div>

      {/* ── VENDOR LIST ───────────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'TOP VENDORS' : 'PRINCIPALES PROVEEDORES'} />

      {isLoading && allVendors.length === 0 ? (
        <div
          className="text-[10px] font-mono py-4 text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {lang === 'en' ? 'Loading…' : 'Cargando…'}
        </div>
      ) : shownVendors.length === 0 ? (
        <div
          className="text-[10px] font-mono py-4 text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {lang === 'en'
            ? 'No vendors match this cluster'
            : 'Sin proveedores en este grupo'}
        </div>
      ) : (
        <div className="space-y-0">
          {shownVendors.map((vendor, idx) => (
            <VendorRow
              key={vendor.vendor_id}
              vendor={vendor}
              rank={idx + 1}
              lang={lang}
              isMock={isFallback}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="w-full mt-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.1em] rounded-sm transition-opacity hover:opacity-75"
          style={{
            border: '1px solid var(--color-border)',
            color: ACCENT,
            background: 'transparent',
          }}
        >
          {lang === 'en' ? '↓ Load more vendors' : '↓ Cargar más proveedores'}
        </button>
      )}

      {/* ESC hint */}
      <div
        className="mt-4 text-[9px] font-mono"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {lang === 'en' ? 'Press ESC or click background to zoom out' : 'Presiona ESC o haz clic en el fondo para alejar'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTING state — P4 placeholder (§ 4.4)
// ─────────────────────────────────────────────────────────────────────────────
function SelectingPanel({ lang, selectedCount }: { lang: 'en' | 'es'; selectedCount: number }) {
  return (
    <div className="px-4 pb-6 pt-5">
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pb-3"
        style={{ color: 'var(--color-text-muted)' }}
      >
        P4 {lang === 'en' ? 'placeholder' : 'marcador'}
        {' · '}
        {selectedCount}
        {' '}
        {lang === 'en' ? 'selected' : 'seleccionados'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AtlasRightPanel — routes to the correct state view
// ─────────────────────────────────────────────────────────────────────────────
export function AtlasRightPanel({ lang }: AtlasRightPanelProps) {
  const state = useAtlasState()
  const view = state.view

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {view.kind === 'idle' ? (
        <IdlePanel lang={lang} />
      ) : view.kind === 'hover-cluster' ? (
        <HoverClusterPanel lang={lang} code={view.code} />
      ) : view.kind === 'zoomed-cluster' ? (
        <ZoomedClusterPanel lang={lang} code={view.code} lens={state.lens} />
      ) : view.kind === 'selecting' ? (
        <SelectingPanel lang={lang} selectedCount={view.ids.length} />
      ) : (
        <IdlePanel lang={lang} />
      )}
    </div>
  )
}
