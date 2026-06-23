/**
 * RedesKnownDossier — /network — "LA TRAMA" (The Mesh)
 *
 * Phase A of the La Trama rebuild (design council wf_7f8821ad, 2026-06-07).
 * The page is the platform's only RELATIONAL instrument: it renders the
 * real co-bidding graph (co_bidding_stats edges + Louvain communities
 * from vendor_graph_features) that no other surface shows. The Atlas
 * draws a constellation metaphor; this page draws the forensic mesh.
 *
 *   RUNG 0  cluster index — ranked real communities (left rail)
 *   RUNG 1  CommunityForceGraph — members + real edges (the plate)
 *   RUNG 2  actor view — VendorNetworkView via ?vendor= (Phase B ladder)
 *
 * Named precedent: ICIJ Aleph entity-flow / OCCRP shell-company
 * diagrams (plate); NYT Upshot annotated ranking (index).
 *
 * URL contract (Graft C): /network?comm=<id>&vendor=<id>
 * Lazy useState initializers read the URL synchronously on mount
 * (Atlas fix c240e4b3 — deep links must not reset).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Network, ShieldAlert, Search, Pin, Building2 } from 'lucide-react'
import { networkApi, type CommunityIndexItem, type InstitutionCaptureItem } from '@/api/client'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  PATTERN_COLORS,
  getRiskLevelFromScore,
  OECD_DIRECT_AWARD_LIMIT,
  OECD_SINGLE_BID_LIMIT,
} from '@/lib/constants'
import { formatEntityName } from '@/lib/entity/format'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { DossierOriginProvider } from '@/lib/nav/wayfinding'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { CommunityForceGraph } from '@/components/network/CommunityForceGraph'
import { InstitutionStarGraph } from '@/components/network/InstitutionStarGraph'
import { VendorNetworkView } from '@/components/network/VendorNetworkView'

const PINS_KEY = 'rubli_trama_pins_v1'

type SortKey = 'value' | 'risk' | 'size' | 'sb' | 'gt'
type LensKey = 'clusters' | 'institutions'
type InstSortKey = 'value' | 'top1_share' | 'hhi' | 'risk'
const HHI_CONCENTRATED = 2500 // DOJ/FTC threshold: highly concentrated market

function readPins(): number[] {
  try {
    const raw = localStorage.getItem(PINS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}

/** Hybrid cluster label (locked decision): "C-333 · órbita de GRUPO X". */
function clusterLabel(c: CommunityIndexItem, isEs: boolean): { code: string; orbit: string } {
  return {
    code: `C-${c.community_id}`,
    orbit: `${isEs ? 'órbita de' : 'orbit of'} ${formatEntityName('vendor', c.hub_vendor_name, 'md')}`,
  }
}

/** Compact FT "deviation from benchmark" row — same grammar as the shared
 *  BenchmarkRow but responsive width and light-folio tokens (the shared
 *  primitive is fixed at ~540px / dark-theme hexes and overflows this card). */
function DeviationRow({
  label,
  value,
  benchmark,
  benchmarkLabel,
  maxDelta,
}: {
  label: string
  value: number
  benchmark: number
  benchmarkLabel: string
  maxDelta: number
}) {
  const delta = value - benchmark
  const isAbove = delta > 0
  const halfPct = Math.min(Math.abs(delta) / maxDelta, 1) * 50
  const fill = isAbove ? RISK_COLORS.critical : 'var(--color-text-muted)'
  // AA-safe variant for small text (RISK_COLORS fail WCAG as numerals)
  const textFill = isAbove ? RISK_TEXT_COLORS.critical : 'var(--color-text-muted)'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[10px] font-mono text-text-secondary">{label}</span>
        <span className="text-[9.5px] font-mono text-text-muted">
          <span style={{ color: textFill, fontWeight: 700 }}>{Math.round(value * 100)}%</span>
          {' · '}
          {benchmarkLabel} {Math.round(benchmark * 100)}%{' '}
          <span style={{ color: textFill }}>
            {isAbove ? '↑' : '↓'}{Math.abs(Math.round(delta * 100))}pp
          </span>
        </span>
      </div>
      <div className="relative h-[5px] w-full rounded-full bg-border/40" aria-hidden="true">
        {/* benchmark tick at center */}
        <span className="absolute left-1/2 top-[-2px] h-[9px] w-px bg-text-muted/60" />
        <span
          className="absolute top-[1px] h-[3px] rounded-full"
          style={{
            background: fill,
            opacity: 0.9,
            left: isAbove ? '50%' : `${50 - halfPct}%`,
            width: `${halfPct}%`,
          }}
        />
      </div>
    </div>
  )
}

/** Well-disc — the institution rail glyph ("El Sitio" graft). Three
 *  channels, cover-the-captions clean: radius = total value, fill = risk
 *  band, arc sweep = top-1 vendor share of the buyer's spend. */
function WellDisc({ inst, maxValue }: { inst: InstitutionCaptureItem; maxValue: number }) {
  const r = 5 + 7 * Math.sqrt(inst.total_value_mxn / Math.max(maxValue, 1))
  const fill = inst.avg_risk_score != null ? RISK_COLORS[getRiskLevelFromScore(inst.avg_risk_score)] : 'var(--color-text-muted)'
  const share = Math.min((inst.top1_share_pct ?? 0) / 100, 1)
  const arcR = r + 2.5
  const circumference = 2 * Math.PI * arcR
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" className="shrink-0" aria-hidden="true">
      <circle cx={15} cy={15} r={r} fill={fill} fillOpacity={0.78} />
      {share > 0 && (
        <circle
          cx={15}
          cy={15}
          r={arcR}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.8}
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform="rotate(-90 15 15)"
        />
      )}
    </svg>
  )
}

/** Pattern-mix micro-bar — the council's best new primitive. Suppressed
 *  below 30% labeled coverage (locked decision). */
function PatternMixBar({ c, isEs }: { c: CommunityIndexItem; isEs: boolean }) {
  const coverage = c.size > 0 ? c.labeled_count / c.size : 0
  if (coverage < 0.3 || c.pattern_mix.length === 0) return null
  const total = c.pattern_mix.reduce((s, m) => s + m.count, 0)
  if (total === 0) return null
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex h-[3px] w-24 overflow-hidden rounded-full bg-border/40 shrink-0" aria-hidden="true">
        {c.pattern_mix.map((m) => (
          <span
            key={m.pattern}
            style={{
              width: `${(m.count / total) * 100}%`,
              background: PATTERN_COLORS[m.pattern] ?? 'var(--color-text-muted)',
            }}
          />
        ))}
      </div>
      <span className="truncate text-[8.5px] font-mono text-text-muted/60">
        {c.pattern_mix.map((m) => `${m.pattern} ${Math.round((m.count / total) * 100)}%`).join(' · ')}
        {' — '}
        {isEs ? `sobre ${c.labeled_count} clasificados` : `over ${c.labeled_count} labeled`}
      </span>
    </div>
  )
}

export default function RedesKnownDossier() {
  const { i18n } = useTranslation('redes')
  const isEs = i18n.language.startsWith('es')
  const lang: 'en' | 'es' = isEs ? 'es' : 'en'

  const [searchParams, setSearchParams] = useSearchParams()

  // RUNG 2 — actor view: /network?vendor=12345 (promoted ladder in Phase B)
  const vendorParam = searchParams.get('vendor')
  const vendorId = vendorParam ? parseInt(vendorParam, 10) : null

  // Lens + selections — lazy-init from URL so deep links survive mount.
  const [lens, setLens] = useState<LensKey>(() =>
    searchParams.get('lens') === 'institutions' ? 'institutions' : 'clusters',
  )
  const [commId, setCommId] = useState<number | null>(() => {
    const raw = searchParams.get('comm')
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n >= 0 ? n : null
  })
  const [instId, setInstId] = useState<number | null>(() => {
    const raw = searchParams.get('inst')
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  })
  const [instSort, setInstSort] = useState<InstSortKey>('value')
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('value')
  const [patternFilter, setPatternFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [pins, setPins] = useState<number[]>(readPins)
  const [linkCopied, setLinkCopied] = useState(false)
  const plateRef = useRef<HTMLDivElement | null>(null)

  const togglePin = (id: number) => {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-12)
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable — pin survives the session only */
      }
      return next
    })
  }

  const copyTrailLink = () => {
    try {
      void navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  // Write lens/comm/inst back to the URL (replace — no history spam).
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (lens === 'institutions') next.set('lens', 'institutions')
    else next.delete('lens')
    if (commId != null) next.set('comm', String(commId))
    else next.delete('comm')
    if (instId != null) next.set('inst', String(instId))
    else next.delete('inst')
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, commId, instId])

  const { data: index, isLoading: indexLoading, isError: indexError } = useQuery({
    queryKey: ['trama-index'],
    queryFn: () => networkApi.getCommunitiesIndex(),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    enabled: vendorId == null,
  })

  // Default to the highest-value community: the real mesh must be
  // visceral on first paint, not hidden behind a click.
  const effectiveComm = commId ?? index?.communities[0]?.community_id ?? null

  const { data: graph, isLoading: graphLoading, isError: graphError } = useQuery({
    queryKey: ['trama-graph', effectiveComm],
    queryFn: () => networkApi.getCommunityGraph(effectiveComm as number),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    enabled: vendorId == null && lens === 'clusters' && effectiveComm != null,
  })

  // Institution lens ("El Sitio" graft) — fetched once, sorted client-side.
  const { data: capture, isLoading: captureLoading, isError: captureError } = useQuery({
    queryKey: ['trama-capture'],
    queryFn: () => networkApi.getInstitutionCapture(120, 'value'),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    enabled: vendorId == null && lens === 'institutions',
  })

  const sortedInstitutions = useMemo(() => {
    if (!capture) return []
    let list = capture.institutions
    if (query.trim() && lens === 'institutions') {
      const q = query.trim().toLowerCase()
      list = list.filter((i) => i.name.toLowerCase().includes(q))
    }
    const sorted = [...list]
    switch (instSort) {
      case 'top1_share':
        sorted.sort((a, b) => (b.top1_share_pct ?? 0) - (a.top1_share_pct ?? 0))
        break
      case 'hhi':
        sorted.sort((a, b) => (b.latest_hhi ?? 0) - (a.latest_hhi ?? 0))
        break
      case 'risk':
        sorted.sort((a, b) => (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
        break
      default:
        sorted.sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    }
    return sorted
  }, [capture, instSort, query, lens])

  const maxInstValue = useMemo(
    () => Math.max(...(capture?.institutions.map((i) => i.total_value_mxn) ?? [1]), 1),
    [capture],
  )

  const effectiveInst = instId ?? capture?.institutions[0]?.institution_id ?? null

  const { data: star, isLoading: starLoading, isError: starError } = useQuery({
    queryKey: ['trama-star', effectiveInst],
    queryFn: () => networkApi.getInstitutionStar(effectiveInst as number),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    enabled: vendorId == null && lens === 'institutions' && effectiveInst != null,
  })

  const selectedCaptureItem = useMemo(
    () => capture?.institutions.find((i) => i.institution_id === effectiveInst) ?? null,
    [capture, effectiveInst],
  )

  const filtered = useMemo(() => {
    if (!index) return []
    let list = index.communities
    if (patternFilter) {
      list = list.filter((c) => c.pattern_mix[0]?.pattern === patternFilter)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (c) => c.hub_vendor_name.toLowerCase().includes(q) || `c-${c.community_id}`.includes(q),
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'risk':
        sorted.sort((a, b) => b.avg_risk - a.avg_risk)
        break
      case 'size':
        sorted.sort((a, b) => b.size - a.size)
        break
      case 'sb':
        sorted.sort((a, b) => (b.sb_rate ?? 0) - (a.sb_rate ?? 0))
        break
      case 'gt':
        sorted.sort((a, b) => b.gt_vendor_count - a.gt_vendor_count)
        break
      default:
        sorted.sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    }
    // Pinned clusters surface first (stable within their own sort order).
    if (pins.length > 0) {
      const pinSet = new Set(pins)
      return [
        ...sorted.filter((c) => pinSet.has(c.community_id)),
        ...sorted.filter((c) => !pinSet.has(c.community_id)),
      ]
    }
    return sorted
  }, [index, patternFilter, query, sortBy, pins])

  const visible = showAll ? filtered : filtered.slice(0, 60)

  const totals = useMemo(() => {
    if (!index) return null
    return {
      communities: index.total_communities,
      value: index.communities.reduce((s, c) => s + c.total_value_mxn, 0),
      gt: index.communities.reduce((s, c) => s + c.gt_vendor_count, 0),
      sanctioned: index.communities.reduce((s, c) => s + c.sanctioned_count, 0),
    }
  }, [index])

  // RUNG 2 early return AFTER all hooks (rules of hooks).
  if (vendorId !== null && Number.isFinite(vendorId) && vendorId > 0) {
    return <VendorNetworkView vendorId={vendorId} />
  }

  const selectCommunity = (id: number) => {
    setCommId(id)
    setSelectedVendor(null)
    plateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectInstitution = (id: number) => {
    setInstId(id)
    setSelectedVendor(null)
    plateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Cross-lens jump: a "feeding clan" chip opens that community's mesh. */
  const jumpToClan = (cid: number) => {
    setLens('clusters')
    setCommId(cid)
    setSelectedVendor(null)
    setQuery('')
  }

  const sortLabels: Record<SortKey, { en: string; es: string }> = {
    value: { en: 'Value', es: 'Valor' },
    risk: { en: 'Risk', es: 'Riesgo' },
    size: { en: 'Size', es: 'Tamaño' },
    sb: { en: 'Single bid', es: 'Prop. única' },
    gt: { en: 'GT cases', es: 'Casos GT' },
  }

  // W4 — one origin provider over the body tree so an actor opened to its vendor
  // dossier (RUNG-3) gets a "← Volver a La Trama" thread back to the exact cluster
  // + lens. NOT wrapped over the RUNG-3 early return (it owns its own breadcrumb).
  return (
    <DossierOriginProvider
      value={{ route: `/network?${searchParams.toString()}`, label: lang === 'en' ? 'The Mesh' : 'La Trama' }}
    >
    <div className="relative space-y-8 max-w-6xl mx-auto pb-12">
      {/* Paper-grain atmosphere — contemplative atlas surface */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="network-page-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="17" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#network-page-paper-grain)" />
      </svg>

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="border-b border-border/60 pb-8">
          <div
            className="flex items-center gap-3 mb-4"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIV</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>{isEs ? 'Grafo de co-licitación · Louvain' : 'Co-bidding graph · Louvain'}</span>
            </span>
          </div>

          <h1
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(34px, 5vw, 60px)',
              lineHeight: 1.02,
              letterSpacing: '-0.012em',
            }}
            className="text-text-primary mb-4"
          >
            {isEs ? (
              <>
                La{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>trama</span>{' '}
                real.
              </>
            ) : (
              <>
                The real{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>mesh</span>.
              </>
            )}
          </h1>

          <p
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.55,
              maxWidth: '68ch',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.005em',
            }}
          >
            {isEs ? (
              <>
                El Atlas dibuja una metáfora. Esta lámina dibuja el{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>grafo forense</em>: cada
                arista es un par real de proveedores que licitaron juntos; cada cúmulo, una comunidad detectada
                sobre la red de co-licitación. Sin posiciones inventadas.
              </>
            ) : (
              <>
                The Atlas draws a metaphor. This plate draws the{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>forensic graph</em>: every
                edge is a real pair of vendors that bid together; every cluster, a community detected over the
                co-bidding network. No invented positions.
              </>
            )}
          </p>

          {/* Stat band — everything from the live index, nothing invented */}
          {totals && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  v: formatNumber(totals.communities),
                  l: isEs ? 'cúmulos de co-licitación' : 'co-bidding clusters',
                },
                {
                  v: formatCompactMXN(totals.value),
                  l: isEs ? 'valor en cúmulos indexados' : 'value across indexed clusters',
                },
                {
                  v: formatNumber(totals.gt),
                  l: isEs ? 'proveedores con caso GT' : 'vendors with GT case',
                },
                {
                  v: formatNumber(totals.sanctioned),
                  l: isEs ? 'sancionados SFP en cúmulos' : 'SFP-sanctioned in clusters',
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-sm border border-border bg-background-card px-4 py-3"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
                >
                  <p
                    className="text-text-primary"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: '24px',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {s.v}
                  </p>
                  <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Instrument: index rail ←→ mesh plate ─────────────────── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-6 items-start">
          {/* RUNG 0 — index rail (two lenses) */}
          <aside className="order-2 lg:order-1 lg:sticky lg:top-4">
            {/* Lens tabs — CÚMULOS (default) | INSTITUCIONES */}
            <div className="mb-3 flex items-stretch rounded-sm border border-border overflow-hidden" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={lens === 'clusters'}
                onClick={() => {
                  setLens('clusters')
                  setQuery('')
                }}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] transition-colors',
                  lens === 'clusters' ? 'bg-accent/12 text-accent' : 'text-text-muted/60 hover:text-text-secondary',
                )}
              >
                <Network className="h-3 w-3" aria-hidden="true" />
                {isEs ? 'Cúmulos' : 'Clusters'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={lens === 'institutions'}
                onClick={() => {
                  setLens('institutions')
                  setQuery('')
                }}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] border-l border-border transition-colors',
                  lens === 'institutions' ? 'bg-accent/12 text-accent' : 'text-text-muted/60 hover:text-text-secondary',
                )}
              >
                <Building2 className="h-3 w-3" aria-hidden="true" />
                {isEs ? 'Instituciones' : 'Institutions'}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent/90">
                {lens === 'clusters'
                  ? isEs ? '§ Índice de cúmulos' : '§ Cluster index'
                  : isEs ? '§ Compradores sitiados' : '§ Besieged buyers'}
              </span>
              <span className="text-[10px] font-mono text-text-muted/50">
                {lens === 'clusters'
                  ? `${filtered.length}/${index?.communities.length ?? 0}`
                  : `${sortedInstitutions.length}/${capture?.total ?? 0}`}
              </span>
              <button
                type="button"
                onClick={copyTrailLink}
                className="ml-auto rounded-sm border border-border px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary hover:bg-border/20 transition-colors"
              >
                {linkCopied ? (isEs ? 'Copiado ✓' : 'Copied ✓') : isEs ? 'Copiar enlace' : 'Copy link'}
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted/40" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lens === 'clusters'
                    ? isEs ? 'Buscar firma eje o C-NNN…' : 'Search hub firm or C-NNN…'
                    : isEs ? 'Buscar institución…' : 'Search institution…'
                }
                aria-label={
                  lens === 'clusters'
                    ? isEs ? 'Buscar cúmulo' : 'Search cluster'
                    : isEs ? 'Buscar institución' : 'Search institution'
                }
                className="w-full rounded-sm border border-border bg-background px-8 py-1.5 text-[12px] font-mono text-text-primary placeholder:text-text-muted/40 focus:border-accent/50 focus:outline-none"
              />
            </div>

            {/* Institution sort pills */}
            {lens === 'institutions' && (
              <div className="mb-3 flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/50 mr-1">
                  {isEs ? 'Ordenar:' : 'Sort:'}
                </span>
                {(
                  [
                    ['value', isEs ? 'Valor' : 'Value'],
                    ['top1_share', 'Top-1'],
                    ['hhi', 'HHI'],
                    ['risk', isEs ? 'Riesgo' : 'Risk'],
                  ] as Array<[InstSortKey, string]>
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setInstSort(k)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors',
                      instSort === k
                        ? 'bg-text-primary/8 border-text-primary/20 text-text-primary'
                        : 'border-border text-text-muted/50 hover:border-border-hover hover:text-text-secondary',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Institution rail */}
            {lens === 'institutions' && (
              <>
                {captureLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-14 rounded-sm border border-border/40 bg-border/20 animate-pulse" />
                    ))}
                  </div>
                )}
                {captureError && (
                  <div className="rounded-sm border border-border/60 bg-background px-4 py-6 text-center">
                    <p className="text-[12px] font-mono text-text-muted">
                      {isEs
                        ? 'No se pudo cargar el índice de instituciones.'
                        : 'Institution index could not be loaded.'}
                    </p>
                  </div>
                )}
                {!captureLoading && !captureError && (
                  <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-1" role="list">
                    {sortedInstitutions.map((inst, rank) => {
                      const active = inst.institution_id === effectiveInst
                      const daHot = (inst.direct_award_pct ?? 0) > OECD_DIRECT_AWARD_LIMIT * 100
                      const hhiHot = (inst.latest_hhi ?? 0) >= HHI_CONCENTRATED
                      return (
                        <div
                          key={inst.institution_id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={active}
                          onClick={() => selectInstitution(inst.institution_id)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault()
                              selectInstitution(inst.institution_id)
                            }
                          }}
                          className={cn(
                            'w-full text-left rounded-sm border px-2.5 py-2 transition-colors cursor-pointer flex items-center gap-2',
                            active
                              ? 'border-accent/50 bg-accent/8'
                              : 'border-border/60 bg-background-card hover:border-border-hover',
                          )}
                          style={active ? { boxShadow: 'inset 2px 0 0 var(--color-accent)' } : undefined}
                        >
                          <WellDisc inst={inst} maxValue={maxInstValue} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="min-w-0 flex items-baseline gap-1.5 text-[11px] font-mono font-bold text-text-primary">
                                <span className="shrink-0 text-[10px] text-text-muted/60">{rank + 1}</span>
                                {/* W1 — known buyers ("Instituto Mexicano del Seguro Social")
                                    must stay recognizable: md (48) + 2-line clamp, full on hover. */}
                                <span
                                  className="min-w-0"
                                  title={inst.name}
                                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25 }}
                                >
                                  {formatEntityName('institution', inst.name, 'md')}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] font-mono font-bold text-text-primary">
                                {formatCompactMXN(inst.total_value_mxn)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2.5 text-[9.5px] font-mono text-text-muted/70">
                              <span>
                                DA{' '}
                                <span style={daHot ? { color: RISK_TEXT_COLORS.high, fontWeight: 700 } : undefined}>
                                  {inst.direct_award_pct != null ? `${Math.round(inst.direct_award_pct)}%` : '—'}
                                </span>
                              </span>
                              <span>
                                Top-1{' '}
                                <span className={cn((inst.top1_share_pct ?? 0) >= 50 && 'text-accent font-bold')}>
                                  {inst.top1_share_pct != null ? `${Math.round(inst.top1_share_pct)}%` : '—'}
                                </span>
                              </span>
                              <span>
                                HHI{' '}
                                <span style={hhiHot ? { color: RISK_TEXT_COLORS.high, fontWeight: 700 } : undefined}>
                                  {inst.latest_hhi != null ? formatNumber(Math.round(inst.latest_hhi)) : '—'}
                                </span>
                              </span>
                              {inst.feeding_communities.length > 0 && (
                                <span className="text-accent font-bold">
                                  {inst.feeding_communities.length} {isEs ? 'clanes' : 'clans'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {sortedInstitutions.length === 0 && (
                      <p className="py-8 text-center text-[11px] font-mono text-text-muted/50">
                        {isEs ? 'Sin instituciones para esta búsqueda' : 'No institutions match this search'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Cluster sort + pattern filter */}
            {lens === 'clusters' && (
            <>
            <div className="mb-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/50 mr-1">
                  {isEs ? 'Ordenar:' : 'Sort:'}
                </span>
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortBy(k)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors',
                      sortBy === k
                        ? 'bg-text-primary/8 border-text-primary/20 text-text-primary'
                        : 'border-border text-text-muted/50 hover:border-border-hover hover:text-text-secondary',
                    )}
                  >
                    {isEs ? sortLabels[k].es : sortLabels[k].en}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/50 mr-1">
                  {isEs ? 'Patrón dominante:' : 'Dominant pattern:'}
                </span>
                <button
                  onClick={() => setPatternFilter(null)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border transition-colors',
                    patternFilter === null
                      ? 'bg-text-primary/10 border-text-primary/30 text-text-primary'
                      : 'border-border text-text-muted/60 hover:border-border-hover',
                  )}
                >
                  {isEs ? 'Todos' : 'All'}
                </button>
                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPatternFilter(patternFilter === p ? null : p)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border transition-colors',
                      patternFilter === p ? 'border-transparent text-white' : 'border-border text-text-muted/60 hover:border-border-hover',
                    )}
                    style={patternFilter === p ? { background: PATTERN_COLORS[p] ?? 'var(--color-text-muted)' } : undefined}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Index rows */}
            {indexLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-16 rounded-sm border border-border/40 bg-border/20 animate-pulse" />
                ))}
              </div>
            )}
            {indexError && (
              <div className="rounded-sm border border-border/60 bg-background px-4 py-6 text-center">
                <p className="text-[12px] font-mono text-text-muted">
                  {isEs
                    ? 'No se pudo cargar el índice de cúmulos. El servidor puede estar reiniciando.'
                    : 'Cluster index could not be loaded. The server may be restarting.'}
                </p>
              </div>
            )}
            {!indexLoading && !indexError && (
              <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-1" role="list">
                {visible.map((c, rank) => {
                  const lbl = clusterLabel(c, isEs)
                  const active = c.community_id === effectiveComm
                  const pinned = pins.includes(c.community_id)
                  const daHot = (c.da_rate ?? 0) > OECD_DIRECT_AWARD_LIMIT
                  return (
                    <div
                      key={c.community_id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onClick={() => selectCommunity(c.community_id)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          selectCommunity(c.community_id)
                        }
                      }}
                      className={cn(
                        'w-full text-left rounded-sm border px-3 py-2 transition-colors cursor-pointer',
                        active
                          ? 'border-accent/50 bg-accent/8'
                          : 'border-border/60 bg-background-card hover:border-border-hover',
                      )}
                      style={active ? { boxShadow: 'inset 2px 0 0 var(--color-accent)' } : undefined}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate">
                          <span className="text-[10px] font-mono font-bold text-text-muted/60 mr-1.5">
                            {rank + 1}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-text-primary">{lbl.code}</span>
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-text-primary">
                            {formatCompactMXN(c.total_value_mxn)}
                          </span>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              togglePin(c.community_id)
                            }}
                            aria-label={
                              pinned
                                ? isEs ? `Desfijar ${lbl.code}` : `Unpin ${lbl.code}`
                                : isEs ? `Fijar ${lbl.code}` : `Pin ${lbl.code}`
                            }
                            aria-pressed={pinned}
                            className={cn(
                              'p-0.5 rounded-sm transition-colors',
                              pinned ? 'text-accent' : 'text-text-muted/30 hover:text-text-muted',
                            )}
                          >
                            <Pin className="h-3 w-3" aria-hidden="true" fill={pinned ? 'currentColor' : 'none'} />
                          </button>
                        </span>
                      </div>
                      {/* W1 — the hub firm IS the cluster's identity: own row, 2-line
                          clamp (md=40 chars), full name on native hover. */}
                      <span
                        className="block mt-0.5 text-[10.5px] font-mono text-text-secondary"
                        title={c.hub_vendor_name}
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25 }}
                      >
                        {lbl.orbit}
                      </span>
                      <div className="mt-1 flex items-center gap-2.5 text-[9.5px] font-mono text-text-muted/70">
                        <span>
                          {c.size.toLocaleString(isEs ? 'es-MX' : 'en-US')} {isEs ? 'actores' : 'actors'}
                        </span>
                        <span>
                          DA{' '}
                          <span style={daHot ? { color: RISK_TEXT_COLORS.high, fontWeight: 700 } : undefined}>
                            {c.da_rate != null ? `${Math.round(c.da_rate * 100)}%` : '—'}
                          </span>
                        </span>
                        <span>
                          {isEs ? 'PU' : 'SB'} {c.sb_rate != null ? `${Math.round(c.sb_rate * 100)}%` : '—'}
                        </span>
                        <span>
                          {isEs ? 'riesgo' : 'risk'}{' '}
                          <span style={{ color: RISK_TEXT_COLORS[getRiskLevelFromScore(c.avg_risk)], fontWeight: 700 }}>
                            {Math.round(c.avg_risk * 100)}%
                          </span>
                        </span>
                        {c.gt_vendor_count > 0 && (
                          <span className="text-accent font-bold">{c.gt_vendor_count} GT</span>
                        )}
                        {c.sanctioned_count > 0 && (
                          <span style={{ color: RISK_TEXT_COLORS.critical }} className="inline-flex items-center gap-0.5 font-bold">
                            <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
                            {c.sanctioned_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <PatternMixBar c={c} isEs={isEs} />
                      </div>
                    </div>
                  )
                })}
                {!showAll && filtered.length > 60 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full rounded-sm border border-border/60 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:bg-border/20 transition-colors"
                  >
                    {isEs ? `Mostrar los ${filtered.length} cúmulos` : `Show all ${filtered.length} clusters`}
                  </button>
                )}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-[11px] font-mono text-text-muted/50">
                    {isEs ? 'Sin cúmulos para este filtro' : 'No clusters match this filter'}
                  </p>
                )}
              </div>
            )}
            </>
            )}
          </aside>

          {/* RUNG 1 — the mesh plate + dossier */}
          <div ref={plateRef} className="order-1 lg:order-2 min-w-0 scroll-mt-4">
            {lens === 'clusters' && graphLoading && (
              <div className="h-[540px] rounded-sm border border-border/40 bg-border/10 animate-pulse flex items-center justify-center">
                <p className="text-[11px] font-mono text-text-muted/60">
                  {isEs ? 'Trazando la trama…' : 'Drawing the mesh…'}
                </p>
              </div>
            )}
            {lens === 'clusters' && graphError && (
              <div className="rounded-sm border border-border/60 bg-background px-6 py-10 text-center">
                <Network className="mx-auto mb-3 h-7 w-7 text-text-muted/40" aria-hidden="true" />
                <p className="text-[12px] font-mono text-text-muted">
                  {isEs
                    ? 'No se pudo cargar el grafo de este cúmulo. Intenta de nuevo en unos segundos.'
                    : 'This cluster graph could not be loaded. Try again in a few seconds.'}
                </p>
              </div>
            )}
            {lens === 'clusters' && graph && !graphLoading && (
              <>
                <PlateFrame
                  lang={lang}
                  folio="XIV"
                  contextLabel={{ en: 'The real mesh · co-bidding graph', es: 'La trama real · grafo de co-licitación' }}
                  caption={
                    isEs
                      ? `Lámina — Cúmulo C-${graph.community_id}: ${graph.rendered_members}${graph.truncated ? ` de ${formatNumber(graph.total_members)}` : ''} actores y ${formatNumber(graph.edges.length)} aristas reales de co-licitación. Posiciones por fuerza dirigida sobre co_bidding_stats; ningún vínculo es ilustrativo.`
                      : `Plate — Cluster C-${graph.community_id}: ${graph.rendered_members}${graph.truncated ? ` of ${formatNumber(graph.total_members)}` : ''} actors and ${formatNumber(graph.edges.length)} real co-bidding edges. Force-directed positions over co_bidding_stats; no tie is illustrative.`
                  }
                >
                  <CommunityForceGraph
                    data={graph}
                    lang={lang}
                    selectedVendorId={selectedVendor}
                    onSelectVendor={setSelectedVendor}
                  />
                  {/* Truncation honesty strip (locked decision: giants → top-100).
                      Below the canvas — above it, it collides with the
                      PlateFrame header at mobile widths. */}
                  {graph.truncated && (
                    <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70">
                      {isEs
                        ? `Mostrando los 100 actores más centrales (pagerank) de ${formatNumber(graph.total_members)}`
                        : `Showing the 100 most central actors (pagerank) of ${formatNumber(graph.total_members)}`}
                      {graph.edges_truncated && (isEs ? ' · aristas recortadas a 2,500' : ' · edges capped at 2,500')}
                    </p>
                  )}
                </PlateFrame>

                {/* Dossier strip — stats + roster */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-sm border border-border bg-background-card px-4 py-3.5"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
                  >
                    <p className="mb-2.5 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
                      {isEs ? '§ Firma del cúmulo' : '§ Cluster signature'}
                    </p>
                    <div className="space-y-2.5">
                      <DeviationRow
                        label={isEs ? 'Adjudicación directa' : 'Direct award'}
                        value={graph.stats.da_rate ?? 0}
                        benchmark={OECD_DIRECT_AWARD_LIMIT}
                        benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                        maxDelta={0.75}
                      />
                      <DeviationRow
                        label={isEs ? 'Propuesta única' : 'Single bid'}
                        value={graph.stats.sb_rate ?? 0}
                        benchmark={OECD_SINGLE_BID_LIMIT}
                        benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                        maxDelta={0.75}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono text-text-muted">
                      <span>
                        {isEs ? 'Valor total' : 'Total value'}{' '}
                        <span className="text-text-primary font-bold">{formatCompactMXN(graph.stats.total_value_mxn)}</span>
                      </span>
                      <span>
                        {isEs ? 'Riesgo medio' : 'Avg risk'}{' '}
                        <span style={{ color: RISK_TEXT_COLORS[getRiskLevelFromScore(graph.stats.avg_risk)], fontWeight: 700 }}>
                          {Math.round(graph.stats.avg_risk * 100)}%
                        </span>
                      </span>
                      <span>
                        {isEs ? 'Casos GT' : 'GT cases'}{' '}
                        <span className="text-accent font-bold">{graph.stats.gt_vendor_count}</span>
                      </span>
                      <span>
                        {isEs ? 'Sancionados' : 'Sanctioned'}{' '}
                        <span style={{ color: RISK_TEXT_COLORS.critical, fontWeight: 700 }}>{graph.stats.sanctioned_count}</span>
                      </span>
                    </div>
                    {graph.stats.labeled_count / Math.max(graph.total_members, 1) >= 0.3 &&
                      graph.stats.pattern_mix.length > 0 && (
                        <div className="mt-3 border-t border-border/50 pt-2.5">
                          <p className="mb-1 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/60">
                            {isEs ? 'Mezcla de patrones ARIA' : 'ARIA pattern mix'}
                          </p>
                          <div className="flex h-[5px] w-full overflow-hidden rounded-full bg-border/40" aria-hidden="true">
                            {graph.stats.pattern_mix.map((m) => (
                              <span
                                key={m.pattern}
                                style={{
                                  width: `${(m.count / Math.max(graph.stats.labeled_count, 1)) * 100}%`,
                                  background: PATTERN_COLORS[m.pattern] ?? 'var(--color-text-muted)',
                                }}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-[8.5px] font-mono text-text-muted/60">
                            {graph.stats.pattern_mix
                              .map((m) => `${m.pattern} ${Math.round((m.count / Math.max(graph.stats.labeled_count, 1)) * 100)}%`)
                              .join(' · ')}{' '}
                            — {isEs ? `sobre ${graph.stats.labeled_count} clasificados` : `over ${graph.stats.labeled_count} labeled`}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Roster — keyboard-reachable fallback for the graph */}
                  <div
                    className="rounded-sm border border-border bg-background-card px-4 py-3.5"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
                  >
                    {/* W2 — header reconciles the sort (pagerank centrality) with
                        what the eye reads. The order now tracks a VISIBLE channel
                        (the influence bar); degree is demoted to muted context. */}
                    <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
                      {isEs ? '§ Más centrales · por influencia' : '§ Most central · by influence'}
                    </p>
                    <p className="mb-2.5 text-[8.5px] font-mono text-text-muted/45">
                      {isEs ? 'centralidad pagerank · conexiones = grado' : 'pagerank centrality · ties = degree'}
                    </p>
                    {(() => {
                      const roster = [...graph.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 10)
                      // √pagerank domain — keeps the descending channel visible under
                      // the near-power-law pagerank distribution (audit caution C).
                      const maxInfl = Math.sqrt(roster[0]?.pagerank ?? 1) || 1
                      return (
                    <ul className="space-y-2">
                      {roster.map((n) => {
                        const pat = n.primary_pattern && PATTERN_COLORS[n.primary_pattern] ? n.primary_pattern : null
                        return (
                          <li key={n.vendor_id} className="min-w-0">
                            <EntityIdentityChip
                              type="vendor"
                              id={n.vendor_id}
                              name={n.name}
                              size="sm"
                              riskScore={n.risk_score}
                              fullName
                            />
                            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                              <DotBar
                                value={Math.sqrt(n.pagerank)}
                                max={maxInfl}
                                color="var(--color-accent)"
                                ariaLabel={isEs ? 'Influencia (centralidad pagerank)' : 'Influence (pagerank centrality)'}
                              />
                              {pat && (
                                <span
                                  className="text-[8.5px] font-mono font-bold px-1 rounded-sm"
                                  style={{ color: PATTERN_COLORS[pat], background: `${PATTERN_COLORS[pat]}1f` }}
                                >
                                  {pat}
                                </span>
                              )}
                              <span
                                className="text-[9px] font-mono text-text-muted/55"
                                title={isEs ? 'conteo bruto de co-licitaciones' : 'raw co-bidding tie count'}
                              >
                                {n.degree} {isEs ? 'conexiones' : 'ties'}
                                {n.is_sanctioned && (
                                  <span style={{ color: RISK_TEXT_COLORS.critical }}> · SFP</span>
                                )}
                              </span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                      )
                    })()}
                    {selectedVendor != null && (
                      <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-text-muted/70">
                          {isEs ? 'Actor seleccionado en la trama' : 'Actor selected in the mesh'}
                        </span>
                        <button
                          onClick={() => {
                            const next = new URLSearchParams(searchParams)
                            next.set('vendor', String(selectedVendor))
                            // Anchor the breadcrumb ladder: the C-NNN crumb
                            // needs comm in the URL even on the default view.
                            if (effectiveComm != null) next.set('comm', String(effectiveComm))
                            setSearchParams(next)
                          }}
                          className="rounded-sm border border-accent/40 bg-accent/8 px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-accent hover:bg-accent/15 transition-colors"
                        >
                          {isEs ? 'Ver su red →' : 'View its ring →'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {lens === 'clusters' && !graph && !graphLoading && !graphError && !indexLoading && (
              <div className="rounded-sm border border-border/60 bg-background px-6 py-10 text-center">
                <Network className="mx-auto mb-3 h-7 w-7 text-text-muted/40" aria-hidden="true" />
                <p className="text-[12px] font-mono text-text-muted">
                  {isEs ? 'Selecciona un cúmulo del índice para trazar su trama.' : 'Select a cluster from the index to draw its mesh.'}
                </p>
              </div>
            )}

            {/* ── Institution lens: the siege plate ─────────────────── */}
            {lens === 'institutions' && (starLoading || captureLoading) && (
              <div className="h-[540px] rounded-sm border border-border/40 bg-border/10 animate-pulse flex items-center justify-center">
                <p className="text-[11px] font-mono text-text-muted/60">
                  {isEs ? 'Levantando el sitio…' : 'Raising the siege…'}
                </p>
              </div>
            )}
            {lens === 'institutions' && starError && (
              <div className="rounded-sm border border-border/60 bg-background px-6 py-10 text-center">
                <Building2 className="mx-auto mb-3 h-7 w-7 text-text-muted/40" aria-hidden="true" />
                <p className="text-[12px] font-mono text-text-muted">
                  {isEs
                    ? 'No se pudo cargar la telaraña de esta institución.'
                    : 'This institution web could not be loaded.'}
                </p>
              </div>
            )}
            {lens === 'institutions' && star && !starLoading && (
              <>
                <PlateFrame
                  lang={lang}
                  folio="XIV"
                  contextLabel={{ en: 'The siege · institution capture web', es: 'El sitio · telaraña de captura' }}
                  caption={
                    isEs
                      ? `Lámina — ${star.name}: sus ${star.vendors.length} proveedores principales por valor contratado, de ${formatNumber(star.total_vendors)} totales. Aros de color agrupan firmas del mismo clan de co-licitación.`
                      : `Plate — ${star.name}: its top ${star.vendors.length} vendors by contracted value, of ${formatNumber(star.total_vendors)} total. Colored rings group firms from the same co-bidding clan.`
                  }
                >
                  <InstitutionStarGraph
                    data={star}
                    lang={lang}
                    selectedVendorId={selectedVendor}
                    onSelectVendor={setSelectedVendor}
                  />
                </PlateFrame>

                {/* Siege dossier */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-sm border border-border bg-background-card px-4 py-3.5"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
                  >
                    <p className="mb-2.5 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
                      {isEs ? '§ Firma del sitio' : '§ Siege signature'}
                    </p>
                    {selectedCaptureItem ? (
                      <>
                        <div className="space-y-2.5">
                          <DeviationRow
                            label={isEs ? 'Adjudicación directa' : 'Direct award'}
                            value={(selectedCaptureItem.direct_award_pct ?? 0) / 100}
                            benchmark={OECD_DIRECT_AWARD_LIMIT}
                            benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                            maxDelta={0.75}
                          />
                          <DeviationRow
                            label={isEs ? 'Propuesta única' : 'Single bid'}
                            value={(selectedCaptureItem.single_bid_pct ?? 0) / 100}
                            benchmark={OECD_SINGLE_BID_LIMIT}
                            benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                            maxDelta={0.75}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono text-text-muted">
                          <span>
                            {isEs ? 'Gasto total' : 'Total spend'}{' '}
                            <span className="text-text-primary font-bold">
                              {formatCompactMXN(selectedCaptureItem.total_value_mxn)}
                            </span>
                          </span>
                          <span>
                            {isEs ? 'Proveedores' : 'Vendors'}{' '}
                            <span className="text-text-primary font-bold">{formatNumber(selectedCaptureItem.vendor_count)}</span>
                          </span>
                          <span>
                            HHI{' '}
                            <span
                              style={
                                (selectedCaptureItem.latest_hhi ?? 0) >= HHI_CONCENTRATED
                                  ? { color: RISK_TEXT_COLORS.high, fontWeight: 700 }
                                  : { fontWeight: 700 }
                              }
                              className="text-text-primary"
                            >
                              {selectedCaptureItem.latest_hhi != null
                                ? formatNumber(Math.round(selectedCaptureItem.latest_hhi))
                                : '—'}
                            </span>{' '}
                            <span className="text-text-muted/50">
                              {isEs ? '(≥2,500 concentrado)' : '(≥2,500 concentrated)'}
                            </span>
                          </span>
                          <span>
                            {isEs ? 'Riesgo medio' : 'Avg risk'}{' '}
                            <span
                              style={{
                                color: RISK_TEXT_COLORS[getRiskLevelFromScore(selectedCaptureItem.avg_risk_score ?? 0)],
                                fontWeight: 700,
                              }}
                            >
                              {selectedCaptureItem.avg_risk_score != null
                                ? `${Math.round(selectedCaptureItem.avg_risk_score * 100)}%`
                                : '—'}
                            </span>
                          </span>
                        </div>
                        {selectedCaptureItem.top1_vendor && (
                          <div className="mt-3 border-t border-border/50 pt-2.5">
                            <p className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/60">
                              {isEs ? 'Proveedor dominante' : 'Dominant vendor'}
                              {selectedCaptureItem.top1_share_pct != null && (
                                <span className="text-accent font-bold ml-1.5">
                                  {Math.round(selectedCaptureItem.top1_share_pct)}% {isEs ? 'del gasto' : 'of spend'}
                                </span>
                              )}
                            </p>
                            <EntityIdentityChip
                              type="vendor"
                              id={selectedCaptureItem.top1_vendor.vendor_id}
                              name={selectedCaptureItem.top1_vendor.vendor_name}
                              size="sm"
                              riskScore={selectedCaptureItem.top1_vendor.avg_risk_score}
                              fullName
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] font-mono text-text-muted/60">
                        {isEs ? 'Sin métricas para esta institución.' : 'No metrics for this institution.'}
                      </p>
                    )}
                  </div>

                  {/* Clans + roster */}
                  <div
                    className="rounded-sm border border-border bg-background-card px-4 py-3.5"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
                  >
                    <p className="mb-2.5 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
                      {isEs ? '§ Los clanes que se alimentan' : '§ The feeding clans'}
                    </p>
                    {selectedCaptureItem && selectedCaptureItem.feeding_communities.length > 0 ? (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {selectedCaptureItem.feeding_communities.map((f) => (
                          <button
                            key={f.community_id}
                            type="button"
                            onClick={() => jumpToClan(f.community_id)}
                            className="rounded-sm border border-accent/40 bg-accent/8 px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-accent hover:bg-accent/15 transition-colors"
                            title={isEs ? 'Abrir el cúmulo en la trama' : 'Open the cluster in the mesh'}
                          >
                            C-{f.community_id} · {f.vendor_count} {isEs ? 'firmas' : 'firms'} →
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-3 text-[10px] font-mono text-text-muted/60">
                        {isEs
                          ? 'Ningún clan con ≥2 firmas entre sus proveedores principales.'
                          : 'No clan with ≥2 firms among its top vendors.'}
                      </p>
                    )}
                    <p className="mb-2 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/60">
                      {isEs ? 'Quiénes se llevan el gasto' : 'Who takes the spend'}
                    </p>
                    <ul className="space-y-1.5">
                      {star.vendors.slice(0, 8).map((v) => (
                        <li key={v.vendor_id} className="flex items-center justify-between gap-2 min-w-0">
                          <EntityIdentityChip
                            type="vendor"
                            id={v.vendor_id}
                            name={v.vendor_name}
                            size="xs"
                            riskScore={v.avg_risk_score}
                            fullName
                          />
                          <span className="shrink-0 text-[9px] font-mono text-text-muted/60">
                            {formatCompactMXN(v.total_value_mxn)}
                            {v.community_id != null && <span> · C-{v.community_id}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {selectedVendor != null && (
                      <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-text-muted/70">
                          {isEs ? 'Actor seleccionado en el sitio' : 'Actor selected in the siege'}
                        </span>
                        <button
                          onClick={() => {
                            const next = new URLSearchParams(searchParams)
                            next.set('vendor', String(selectedVendor))
                            setSearchParams(next)
                          }}
                          className="rounded-sm border border-accent/40 bg-accent/8 px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-accent hover:bg-accent/15 transition-colors"
                        >
                          {isEs ? 'Ver su red →' : 'View its ring →'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Methodology footer ───────────────────────────────────── */}
        <div className="mt-8 rounded-sm border border-border bg-background-card px-5 py-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-1.5">
            {isEs ? 'Metodología' : 'Methodology'}
          </p>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {isEs ? (
              <>
                Las aristas provienen de pares reales de co-licitación (proveedores que participaron en los mismos
                procedimientos). Los cúmulos son comunidades Louvain detectadas sobre esa red; la centralidad de cada
                actor es su pagerank dentro del grafo. Tasas DA/propuesta única promediadas del motor ARIA por
                cúmulo; riesgo del modelo v0.8.5 (AUC test 0.785). Es un{' '}
                <em>indicador de riesgo</em>, no una probabilidad de corrupción. Los cúmulos de más de 150 actores se
                muestran recortados a sus 100 más centrales.
              </>
            ) : (
              <>
                Edges come from real co-bidding pairs (vendors that participated in the same procedures). Clusters are
                Louvain communities detected over that network; each actor&apos;s centrality is its pagerank within the
                graph. DA/single-bid rates are ARIA engine averages per cluster; risk from model v0.8.5 (test AUC
                0.785). This is a <em>risk indicator</em>, not a probability of corruption. Clusters above 150 actors
                are truncated to their 100 most central members.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
    </DossierOriginProvider>
  )
}
