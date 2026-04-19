/**
 * CorruptionClusters (/clusters) — editorial overview of the 7 ARIA
 * corruption pattern typologies.
 *
 * Structure:
 *   Lede           — EditorialPageShell: framing + stats strip
 *   Act I          — "LA TOPOGRAFÍA": bubble map (IPS × T1 count)
 *   Act II         — "LOS PATRONES": 7 pattern cards w/ live T1 vendors
 *   Act III        — "LA EVIDENCIA DOCUMENTADA": GT distribution by type
 *
 * Data sources:
 *   - Pattern summaries are hardcoded from the ARIA v1.1 queue run
 *     (run 28d5c453, 2026-03-25). Not fetched because numbers are canonical.
 *   - Top-3 T1 vendors per pattern are fetched live from /api/v1/aria/queue
 *     with 7 parallel TanStack Query calls.
 */
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, AlertTriangle } from 'lucide-react'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { Skeleton } from '@/components/ui/skeleton'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
import { formatNumber, toTitleCase } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Pattern metadata — the 7 ARIA typologies
// ────────────────────────────────────────────────────────────────────────────
interface PatternFull {
  code: string
  label: string
  desc: string
  rule: string
  color: string
  vendors: number
  t1: number
  avgIps: number
}

const PATTERNS_FULL: PatternFull[] = [
  {
    code: 'P5',
    label: 'Sobreprecio Sistemático',
    desc: 'Contratos con precios 2σ sobre el promedio sectorial, o marcada incongruencia industrial. Patrón dominante en T1 — 180 proveedores con IPS >0.60.',
    rule: 'z_price_ratio > 2.0 OR industry_mismatch > 0.50; price_hypothesis_count > 3 → +0.15',
    color: '#dc2626',
    vendors: 3985,
    t1: 180,
    avgIps: 0.472,
  },
  {
    code: 'P7',
    label: 'Red de Contratistas',
    desc: 'Redes multi-proveedor confirmadas por evidencia externa (SFP, ASF, periodismo de investigación). La red Grupo Higa es el caso arquetípico.',
    rule: 'External flag (SFP/ASF/GT) + network_member_count > 3 → conf 0.5+',
    color: '#dc2626',
    vendors: 257,
    t1: 56,
    avgIps: 0.733,
  },
  {
    code: 'P1',
    label: 'Monopolio Concentrado',
    desc: 'Un proveedor acapara >3% del valor total de su sector — señal de concentración anormal de mercado. IMSS, Segalmex y Edenred son los casos modelo.',
    rule: 'sector_share > 3% → 0.8 conf; > 1% → 0.5; boost +0.15 si institución única > 70%',
    color: '#dc2626',
    vendors: 44,
    t1: 23,
    avgIps: 0.769,
  },
  {
    code: 'P3',
    label: 'Intermediaria de Uso Único',
    desc: 'Ráfaga de contratos de alto valor en poco tiempo, seguida de inactividad o desaparición. Perfil clásico de empresa puente o facturadora.',
    rule: 'burst_score > 0.5 (fracción de contratos en primer 20% de vida activa)',
    color: '#f59e0b',
    vendors: 2974,
    t1: 26,
    avgIps: 0.287,
  },
  {
    code: 'P6',
    label: 'Captura Institucional',
    desc: 'El proveedor obtiene >80% de sus contratos de una sola institución, sostenido por años. Señal de relación privilegiada o conflicto de interés institucional.',
    rule: 'top_institution_ratio > 0.80 AND total_contracts > 10 → 0.6; institution_count = 1 → 0.8',
    color: '#78716c',
    vendors: 15923,
    t1: 31,
    avgIps: 0.218,
  },
  {
    code: 'P2',
    label: 'Empresa Fantasma',
    desc: 'Empresas sin RFC verificable, con pocos contratos por adjudicación directa, que luego desaparecen. 13,960 en lista EFOS definitivo del SAT.',
    rule: 'is_efos_definitivo → 0.90; OR no_rfc + years≤2 + contratos≤10 + DA>80% + valor≥1M → 0.50',
    color: '#57534e',
    vendors: 6034,
    t1: 1,
    avgIps: 0.214,
  },
  {
    code: 'P4',
    label: 'Colusión en Licitaciones',
    desc: 'Vendedores que compiten en los mismos procesos pero nunca se ganan entre sí — indicador clásico de colusión y repartición de mercado.',
    rule: 'co_bid_rate > 50% AND win_rate > 70% AND baja varianza de precios',
    color: '#f59e0b',
    vendors: 220,
    t1: 3,
    avgIps: 0.229,
  },
]

// ── Bubble map data (same 7 patterns, different ordering optional) ──────────
const BUBBLE_DATA = PATTERNS_FULL.map((p) => ({
  code: p.code,
  avgIps: p.avgIps,
  t1: p.t1,
  vendors: p.vendors,
  color: p.color,
}))

// ── GT evidence distribution (documented cases from ground_truth_cases) ─────
const GT_TYPES = [
  { type: 'Fraude en adquisiciones', count: 432, color: '#dc2626' },
  { type: 'Captura institucional',   count: 317, color: '#dc2626' },
  { type: 'Captura licitación única', count: 216, color: '#f59e0b' },
  { type: 'Empresa fantasma',        count: 144, color: '#f59e0b' },
  { type: 'Monopolio',               count: 71,  color: '#78716c' },
  { type: 'Sobreprecio',             count: 70,  color: '#78716c' },
  { type: 'Otros',                   count: 93,  color: '#57534e' },
]
const GT_TOTAL = GT_TYPES.reduce((s, t) => s + t.count, 0)

// Totals for the stat strip
const TOTAL_VENDORS = PATTERNS_FULL.reduce((s, p) => s + p.vendors, 0)
const TOTAL_T1 = PATTERNS_FULL.reduce((s, p) => s + p.t1, 0)
const AVG_T1_IPS = 0.849 // Canonical from ARIA stats

// ============================================================================
// BubbleMap — Act I, IPS × T1 count for all 7 patterns
// ============================================================================
function BubbleMap() {
  const SVG_W = 640
  const SVG_H = 280
  const PAD_L = 50
  const PAD_R = 20
  const PAD_T = 20
  const PAD_B = 40
  const PLOT_W = SVG_W - PAD_L - PAD_R
  const PLOT_H = SVG_H - PAD_T - PAD_B
  const Y_MAX = 200

  const x = (ips: number) => PAD_L + ips * PLOT_W
  const y = (t1: number) => PAD_T + PLOT_H - (t1 / Y_MAX) * PLOT_H
  // Radius: √vendors * 0.8, floor 12 (P1 etc), cap 80 (P6).
  const r = (v: number) => Math.max(12, Math.min(80, Math.sqrt(v) * 0.8))

  const xTicks = [0, 0.25, 0.5, 0.75, 1.0]
  const yTicks = [0, 50, 100, 150, 200]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Mapa de burbujas: los 7 patrones ARIA graficados por IPS promedio (eje X) y conteo de proveedores T1 (eje Y). El tamaño de cada burbuja es proporcional al conteo total de proveedores."
    >
      {/* Grid: risk threshold lines */}
      <line
        x1={x(0.4)} x2={x(0.4)}
        y1={PAD_T} y2={PAD_T + PLOT_H}
        stroke="#dc2626" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="3 4"
      />
      <line
        x1={x(0.6)} x2={x(0.6)}
        y1={PAD_T} y2={PAD_T + PLOT_H}
        stroke="#dc2626" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="3 4"
      />
      <line
        x1={PAD_L} x2={PAD_L + PLOT_W}
        y1={y(50)} y2={y(50)}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 3"
      />
      <line
        x1={PAD_L} x2={PAD_L + PLOT_W}
        y1={y(100)} y2={y(100)}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 3"
      />

      {/* Y axis */}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + PLOT_H} stroke="#3f3f46" strokeWidth={1} />
      {yTicks.map((t) => (
        <g key={`yt-${t}`}>
          <line x1={PAD_L - 3} x2={PAD_L} y1={y(t)} y2={y(t)} stroke="#3f3f46" strokeWidth={1} />
          <text
            x={PAD_L - 6}
            y={y(t) + 3}
            fill="#71717a"
            fontSize={9}
            fontFamily="var(--font-family-mono, monospace)"
            textAnchor="end"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x={PAD_L - 32}
        y={PAD_T + PLOT_H / 2}
        fill="#71717a"
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="middle"
        transform={`rotate(-90 ${PAD_L - 32} ${PAD_T + PLOT_H / 2})`}
      >
        PROVEEDORES T1
      </text>

      {/* X axis */}
      <line
        x1={PAD_L} x2={PAD_L + PLOT_W}
        y1={PAD_T + PLOT_H} y2={PAD_T + PLOT_H}
        stroke="#3f3f46" strokeWidth={1}
      />
      {xTicks.map((t) => (
        <g key={`xt-${t}`}>
          <line
            x1={x(t)} x2={x(t)}
            y1={PAD_T + PLOT_H} y2={PAD_T + PLOT_H + 3}
            stroke="#3f3f46" strokeWidth={1}
          />
          <text
            x={x(t)}
            y={PAD_T + PLOT_H + 14}
            fill="#71717a"
            fontSize={9}
            fontFamily="var(--font-family-mono, monospace)"
            textAnchor="middle"
          >
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      <text
        x={PAD_L + PLOT_W / 2}
        y={SVG_H - 8}
        fill="#71717a"
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="middle"
      >
        IPS PROMEDIO →
      </text>

      {/* Threshold annotations */}
      <text
        x={x(0.6) + 3}
        y={PAD_T + 10}
        fill="#dc2626"
        fontSize={8}
        fontFamily="var(--font-family-mono, monospace)"
        opacity={0.7}
      >
        T1 ≥0.60
      </text>
      <text
        x={x(0.4) + 3}
        y={PAD_T + 22}
        fill="#f59e0b"
        fontSize={8}
        fontFamily="var(--font-family-mono, monospace)"
        opacity={0.7}
      >
        T2 ≥0.40
      </text>

      {/* Bubbles — draw largest first so smaller ones stay legible on top */}
      {[...BUBBLE_DATA]
        .sort((a, b) => b.vendors - a.vendors)
        .map((d) => (
          <g key={`bubble-${d.code}`}>
            <circle
              cx={x(d.avgIps)}
              cy={y(d.t1)}
              r={r(d.vendors)}
              fill={d.color}
              fillOpacity={0.18}
              stroke={d.color}
              strokeOpacity={0.7}
              strokeWidth={1.5}
            />
            <text
              x={x(d.avgIps)}
              y={y(d.t1) - 2}
              fill={d.color}
              fontSize={11}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.code}
            </text>
            <text
              x={x(d.avgIps)}
              y={y(d.t1) + 10}
              fill="#a1a1aa"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.t1} T1
            </text>
          </g>
        ))}
    </svg>
  )
}

// ============================================================================
// EvidenceStrip — Act III, horizontal stacked bar of GT types
// ============================================================================
function EvidenceStrip() {
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded border border-border/30">
        {GT_TYPES.map((t) => {
          const pct = (t.count / GT_TOTAL) * 100
          return (
            <div
              key={t.type}
              className="relative group"
              style={{ width: `${pct}%`, backgroundColor: t.color, opacity: 0.75 }}
              title={`${t.type}: ${t.count} (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white/90">
                  {t.count}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
        {GT_TYPES.map((t) => (
          <div key={t.type} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-[11px] text-text-secondary truncate">{t.type}</span>
            <span className="ml-auto text-[11px] font-mono text-text-muted tabular-nums">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// PatternCard — one of the 7 editorial cards
// ============================================================================
function PatternCard({ pattern, topVendors, isLoading }: {
  pattern: PatternFull
  topVendors: AriaQueueItem[] | undefined
  isLoading: boolean
}) {
  return (
    <div
      id={pattern.code.toLowerCase()}
      className="surface-card p-5 rounded-lg border border-border/30 hover:border-border/60 transition-all scroll-mt-20"
      style={{ borderLeft: `3px solid ${pattern.color}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span
            className="text-[10px] font-mono font-bold tracking-[0.15em]"
            style={{ color: pattern.color }}
          >
            {pattern.code}
          </span>
          <h3 className="text-base font-bold text-text-primary mt-0.5 leading-tight">
            {pattern.label}
          </h3>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-xl font-black tabular-nums leading-none"
            style={{ color: pattern.color }}
          >
            {pattern.t1}
          </div>
          <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
            T1 · IPS {pattern.avgIps.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-muted leading-relaxed mb-3">{pattern.desc}</p>

      {/* Classification rule */}
      <div className="rounded border border-border/30 bg-background-elevated/20 px-3 py-2 mb-3">
        <p className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider mb-1">
          Regla de clasificación
        </p>
        <p className="text-[11px] font-mono text-text-secondary leading-relaxed break-words">
          {pattern.rule}
        </p>
      </div>

      {/* Top vendors */}
      <div>
        <p className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider mb-2">
          Proveedores T1
        </p>
        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-4/6" />
          </div>
        ) : topVendors && topVendors.length > 0 ? (
          <ul className="space-y-1">
            {topVendors.slice(0, 3).map((v) => (
              <li key={v.vendor_id} className="flex items-center gap-2 text-[11px]">
                <Link
                  to={`/vendors/${v.vendor_id}`}
                  className="text-text-primary hover:text-accent truncate flex-1 min-w-0 transition-colors"
                  title={toTitleCase(v.vendor_name)}
                >
                  {toTitleCase(v.vendor_name)}
                </Link>
                <span
                  className="font-mono tabular-nums flex-shrink-0"
                  style={{ color: pattern.color }}
                >
                  {v.ips_final.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-text-muted/50 italic">Sin T1 actuales en este patrón.</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
        <span className="text-[10px] font-mono text-text-muted">
          {pattern.vendors.toLocaleString()} proveedores
        </span>
        <Link
          to={`/aria?pattern=${pattern.code}`}
          className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1 tracking-wide"
        >
          Ver en ARIA
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// CorruptionClusters — top-level page
// ============================================================================
export default function CorruptionClusters() {
  // Parallel fetch: top 3 T1 vendors for each of the 7 patterns
  const topVendorQueries = useQueries({
    queries: PATTERNS_FULL.map((p) => ({
      queryKey: ['aria-cluster-top', p.code] as const,
      queryFn: () => ariaApi.getQueue({ pattern: p.code, tier: 1, per_page: 3 }),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  })

  return (
    <EditorialPageShell
      kicker="ANÁLISIS · ARIA v1.1"
      headline={
        <>
          7 <span style={{ color: '#dc2626' }}>tipologías</span> de captura del Estado
        </>
      }
      paragraph={`ARIA detectó ${formatNumber(TOTAL_VENDORS)} proveedores en 7 patrones de irregularidad. Cada patrón representa una arquitectura distinta de desvío — desde monopolios sectoriales hasta redes de empresas fantasma. Juntos cubren 6.5T MXN en contratos de riesgo.`}
      stats={[
        {
          value: formatNumber(TOTAL_VENDORS),
          label: 'PROVEEDORES EN PATRONES',
          sub: 'Total clasificado por ARIA',
        },
        {
          value: formatNumber(TOTAL_T1),
          label: 'EN TIER 1 CRÍTICO',
          color: '#dc2626',
          sub: 'IPS ≥ 0.60 · investigación inmediata',
        },
        {
          value: AVG_T1_IPS.toFixed(3),
          label: 'IPS PROMEDIO T1',
          sub: 'Promedio ponderado del Tier 1',
        },
      ]}
      severity="critical"
    >
      {/* ================================================================ */}
      {/* ACT I — LA TOPOGRAFÍA                                            */}
      {/* ================================================================ */}
      <Act
        number="I"
        label="LA TOPOGRAFÍA"
        title={<>Dónde vive cada patrón</>}
        className="mt-8"
      >
        <section className="surface-card p-5">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-sm font-bold text-text-primary">
              Patrones ARIA por IPS promedio y densidad T1
            </h3>
            <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider flex-shrink-0">
              640 × 280 SVG
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed max-w-prose">
            Cada burbuja es un patrón. Su <strong>área</strong> es proporcional al número
            total de proveedores clasificados; su posición horizontal es el IPS promedio
            (severidad); vertical, el número de proveedores T1. Los tres patrones de la
            derecha — <span className="font-mono text-red-500">P1</span>,
            {' '}<span className="font-mono text-red-500">P7</span>,
            {' '}<span className="font-mono text-red-500">P5</span> — concentran el
            riesgo más severo.
          </p>
          <BubbleMap />
        </section>
      </Act>

      {/* ================================================================ */}
      {/* ACT II — LOS PATRONES                                            */}
      {/* ================================================================ */}
      <Act
        number="II"
        label="LOS PATRONES"
        title={<>Siete arquitecturas de captura</>}
        className="mt-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PATTERNS_FULL.map((pattern, idx) => {
            const q = topVendorQueries[idx]
            const topVendors = q.data?.data
            return (
              <PatternCard
                key={pattern.code}
                pattern={pattern}
                topVendors={topVendors}
                isLoading={q.isLoading}
              />
            )
          })}
        </div>

        {/* Legend: color = severity class */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[10px] font-mono text-text-muted tracking-wider uppercase">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#dc2626' }} />
            Severidad crítica
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
            Alta
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#78716c' }} />
            Media
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#57534e' }} />
            Baja
          </div>
        </div>
      </Act>

      {/* ================================================================ */}
      {/* ACT III — LA EVIDENCIA DOCUMENTADA                               */}
      {/* ================================================================ */}
      <Act
        number="III"
        label="LA EVIDENCIA DOCUMENTADA"
        title={<>De dónde sabemos qué es qué</>}
        className="mt-10"
      >
        <section className="surface-card p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-text-primary">
              Casos documentados por tipo de corrupción
            </h3>
            <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
              {GT_TOTAL.toLocaleString()} casos · GT v1.1
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-prose">
            La biblioteca de casos confirmados (ground truth) que alimenta ARIA. Cada
            patrón hereda su lógica de clasificación de estos casos documentados —
            sanciones SFP, auditorías ASF, investigaciones periodísticas y listas EFOS
            del SAT.
          </p>

          <EvidenceStrip />

          <div className="flex items-start gap-2 pt-3 border-t border-border/20 text-[11px] text-text-muted leading-relaxed">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500/70" />
            <p>
              La distribución de casos documentados <strong>no</strong> refleja la
              incidencia real de cada tipo — refleja qué tipos han sido investigados.
              Fraude en adquisiciones (432) y captura institucional (317) dominan
              porque son los patrones más fáciles de documentar a partir de datos de
              contratación pública.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end pt-4">
          <Link
            to="/aria"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent hover:underline tracking-wider uppercase"
          >
            Explorar cola ARIA completa
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Act>
    </EditorialPageShell>
  )
}
