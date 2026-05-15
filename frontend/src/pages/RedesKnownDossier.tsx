/**
 * RedesKnownDossier — "LA RED INVISIBLE"
 *
 * Community-centered network intelligence. Instead of showing atomized
 * co-bidding pairs, this page organizes the corruption landscape around
 * the ten largest vendor communities that have captured Mexican
 * procurement institutions.
 *
 * Three acts:
 *   I   Los Núcleos       — SVG cluster of communities (size = value,
 *                           color = dominant corruption pattern)
 *   II  El Dossier        — editorial card per community with network
 *                           signature (DA rate, single bid, price anomaly)
 *   III Flujo de Valor    — particle Sankey: top 5 communities → top 5
 *                           captured institutions
 *
 * No ECharts, no vendor-pair lists, no vendor-detail side panel. The
 * page tells one story: who has captured which institution, and how
 * much money flows through it.
 */
import { useMemo, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ariaApi, networkApi, type PatternSpotlight, type PatternSpotlightResponse, type CommunityItem } from '@/api/client'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS } from '@/lib/constants'
import { FONT_MONO, FONT_SERIF } from '@/lib/editorial'
import { FlowParticle, type FlowLink, type FlowNode } from '@/components/charts/FlowParticle'
import { AlertTriangle, Building2, Ghost, Network, ShieldAlert, Users, ChevronRight, Activity } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PlateFrame } from '@/components/atlas/PlateFrame'

// ---------------------------------------------------------------------------
// Community corpus — illustrative top 10 communities derived from ARIA
// patterns + Louvain community detection. These represent the dominant
// vendor clusters that have captured specific institutions.
// ---------------------------------------------------------------------------

type PatternCode = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'

interface Community {
  id: string
  name: string
  sector: keyof typeof SECTOR_COLORS
  pattern: PatternCode
  vendors: number
  value: number
  institution: string
  avgRisk: number
  confirmed: number
  /** Direct-award rate 0-1, illustrative per community */
  daRate: number
  /** Single-bid rate 0-1 */
  sbRate: number
  /** Price-anomaly rate 0-1 */
  paRate: number
  verdict: string
}

// ---------------------------------------------------------------------------
// buildCommunitiesFromSpotlight — derives community structure from real
// ARIA pattern-spotlight data. Each P1-P7 pattern becomes one community.
// vendor_count, avg_ips and gt_case_count are real database values.
// value/daRate/sbRate/paRate are set to 0 (unknown at pattern aggregate
// level) — callers must guard on c.value === 0 before rendering MXN.
// ---------------------------------------------------------------------------

const PATTERN_NAMES: Record<string, { en: string; es: string }> = {
  P1: { en: 'Monopoly Cluster', es: 'Cluster Monopolio' },
  P2: { en: 'Ghost Company Network', es: 'Red Empresas Fantasma' },
  P3: { en: 'Intermediary Ring', es: 'Red de Intermediarios' },
  P4: { en: 'Bid Rigging Cartel', es: 'Cártel de Licitaciones' },
  P5: { en: 'Rotation & Overpricing', es: 'Rotación y Sobreprecio' },
  P6: { en: 'Institutional Capture', es: 'Captura Institucional' },
  P7: { en: 'Budget Dump Ring', es: 'Red Vaciado Presupuestal' },
}

const PATTERN_SECTORS: Record<string, keyof typeof SECTOR_COLORS> = {
  P1: 'energia',
  P2: 'salud',
  P3: 'tecnologia',
  P4: 'infraestructura',
  P5: 'salud',
  P6: 'gobernacion',
  P7: 'hacienda',
}

function buildCommunitiesFromSpotlight(
  spotlight: PatternSpotlightResponse | undefined,
  isEs: boolean,
): Community[] {
  if (!spotlight?.patterns?.length) return buildCommunities(isEs)

  return spotlight.patterns.map((p) => {
    const names = PATTERN_NAMES[p.code] ?? { en: p.code, es: p.code }
    return {
      id: p.code,
      name: isEs ? names.es : names.en,
      sector: PATTERN_SECTORS[p.code] ?? 'otros',
      pattern: p.code as PatternCode,
      vendors: p.vendor_count,
      value: p.total_value_mxn ?? 0,
      institution: '',     // unknown at pattern aggregate level
      avgRisk: p.avg_ips,
      confirmed: p.gt_case_count,
      daRate: 0,           // unknown
      sbRate: 0,           // unknown
      paRate: 0,           // unknown
      verdict: isEs
        ? `${p.vendor_count.toLocaleString('es-MX')} proveedores con patrón ${p.code} · ${p.t1_count} en cola T1 · ${p.gt_case_count} casos documentados`
        : `${p.vendor_count.toLocaleString()} vendors flagged ${p.code} · ${p.t1_count} in T1 queue · ${p.gt_case_count} documented cases`,
    }
  })
}

// ---------------------------------------------------------------------------
// buildCommunitiesFromLouvain — maps real Louvain community data (from
// vendor_graph_features) to the Community shape. vendor count and avg_risk
// are real; value/daRate/sbRate/paRate are unknown at community aggregate
// level and left at 0.
// ---------------------------------------------------------------------------

function buildCommunitiesFromLouvain(
  communities: CommunityItem[],
  isEs: boolean,
): Community[] {
  return communities.slice(0, 10).map((c, i) => {
    // Infer dominant pattern from avg_risk (rough heuristic until real pattern
    // assignment is available from the graph pipeline)
    const pattern: PatternCode = c.avg_risk >= 0.7 ? 'P2' : c.avg_risk >= 0.6 ? 'P6' : 'P5'
    return {
      id: `L${String(c.community_id).padStart(3, '0')}`,
      name: isEs
        ? `Comunidad ${i + 1} · ${c.sector_count} sectores`
        : `Community ${i + 1} · ${c.sector_count} sectors`,
      sector: 'otros' as keyof typeof SECTOR_COLORS,
      pattern,
      vendors: c.size,      // REAL
      value: 0,             // unknown at community aggregate level
      institution: '',
      avgRisk: c.avg_risk,  // REAL
      confirmed: 0,
      daRate: 0,
      sbRate: 0,
      paRate: 0,
      verdict: isEs
        ? `Comunidad detectada por Louvain con ${c.size} proveedores y riesgo promedio ${(c.avg_risk * 100).toFixed(0)}%.`
        : `Louvain-detected community with ${c.size} vendors and avg risk ${(c.avg_risk * 100).toFixed(0)}%.`,
    }
  })
}

// Legacy hardcoded corpus — kept as fallback when spotlight API is unavailable.
// DO NOT use these values in new features: all MXN amounts are fabricated.
function buildCommunities(isEs: boolean): Community[] {
  return [
    {
      id: 'C01',
      name: isEs ? 'Red Salud-IMSS' : 'Health-IMSS Network',
      sector: 'salud',
      pattern: 'P2',
      vendors: 847,
      value: 234_000_000_000,
      institution: 'IMSS',
      avgRisk: 0.78,
      confirmed: 12,
      daRate: 0.91,
      sbRate: 0.68,
      paRate: 0.42,
      verdict: isEs
        ? 'Red de proveedores de medicamentos y material de curación concentrada en IMSS; 12 vendedores con sentencia o sanción firme.'
        : 'Network of drug and medical-supply vendors concentrated in IMSS; 12 vendors with a final sentence or sanction.',
    },
    {
      id: 'C02',
      name: isEs ? 'Consorcio Infraestructura Sur' : 'Southern Infrastructure Consortium',
      sector: 'infraestructura',
      pattern: 'P7',
      vendors: 234,
      value: 187_000_000_000,
      institution: 'SCT',
      avgRisk: 0.71,
      confirmed: 8,
      daRate: 0.38,
      sbRate: 0.74,
      paRate: 0.51,
      verdict: isEs
        ? 'Constructoras que rotan entre sí en licitaciones de obra pública de la SCT; patrón de rotación (bid rotation) detectado en 74% de procesos.'
        : 'Construction firms rotating among themselves in SCT public-works tenders; bid-rotation pattern detected in 74% of processes.',
    },
    {
      id: 'C03',
      name: isEs ? 'Red Energía-Pemex' : 'Energy-Pemex Network',
      sector: 'energia',
      pattern: 'P1',
      vendors: 156,
      value: 312_000_000_000,
      institution: 'Pemex',
      avgRisk: 0.69,
      confirmed: 6,
      daRate: 0.82,
      sbRate: 0.55,
      paRate: 0.34,
      verdict: isEs
        ? 'Proveedores especializados de Pemex con monopolio de facto en servicios de perforación y suministro técnico.'
        : 'Specialized Pemex vendors with de facto monopoly in drilling services and technical supply.',
    },
    {
      id: 'C04',
      name: isEs ? 'Cluster Educación-SEP' : 'Education-SEP Cluster',
      sector: 'educacion',
      pattern: 'P6',
      vendors: 412,
      value: 89_000_000_000,
      institution: 'SEP',
      avgRisk: 0.64,
      confirmed: 9,
      daRate: 0.73,
      sbRate: 0.48,
      paRate: 0.29,
      verdict: isEs
        ? 'Proveedores de libros, uniformes y materiales con acceso privilegiado a SEP; patrón de captura institucional.'
        : 'Vendors of books, uniforms, and materials with privileged access to SEP; institutional-capture pattern.',
    },
    {
      id: 'C05',
      name: isEs ? 'Red Salud-ISSSTE' : 'Health-ISSSTE Network',
      sector: 'salud',
      pattern: 'P5',
      vendors: 189,
      value: 145_000_000_000,
      institution: 'ISSSTE',
      avgRisk: 0.72,
      confirmed: 7,
      daRate: 0.79,
      sbRate: 0.61,
      paRate: 0.58,
      verdict: isEs
        ? 'Sobreprecio estructural en servicios de laboratorio y hemodiálisis contratados por ISSSTE; precios 58% sobre mediana sectorial.'
        : 'Structural overpricing in lab and dialysis services contracted by ISSSTE; prices 58% above sector median.',
    },
    {
      id: 'C06',
      name: isEs ? 'Consorcio Gobernación' : 'Interior Consortium',
      sector: 'gobernacion',
      pattern: 'P6',
      vendors: 298,
      value: 67_000_000_000,
      institution: 'SEGOB',
      avgRisk: 0.61,
      confirmed: 5,
      daRate: 0.88,
      sbRate: 0.42,
      paRate: 0.24,
      verdict: isEs
        ? 'Proveedores de servicios migratorios y administrativos con adjudicación directa dominante (88%).'
        : 'Migration and administrative service vendors with dominant direct award (88%).',
    },
    {
      id: 'C07',
      name: isEs ? 'Red Tecnología-SHCP' : 'Technology-SHCP Network',
      sector: 'tecnologia',
      pattern: 'P4',
      vendors: 87,
      value: 43_000_000_000,
      institution: 'SAT',
      avgRisk: 0.58,
      confirmed: 4,
      daRate: 0.67,
      sbRate: 0.71,
      paRate: 0.45,
      verdict: isEs
        ? 'Facturadores con cruce en EFOS definitivo ofreciendo servicios de TI al SAT; red de facturación cuestionada.'
        : 'Invoicers flagged on the EFOS definitivo list offering IT services to SAT; questioned invoicing network.',
    },
    {
      id: 'C08',
      name: isEs ? 'Cluster Agricultura-SAGARPA' : 'Agriculture-SAGARPA Cluster',
      sector: 'agricultura',
      pattern: 'P3',
      vendors: 143,
      value: 78_000_000_000,
      institution: 'SAGARPA',
      avgRisk: 0.67,
      confirmed: 11,
      daRate: 0.69,
      sbRate: 0.53,
      paRate: 0.47,
      verdict: isEs
        ? 'Intermediarios en distribución de fertilizante y semillas (Segalmex-adyacente); 11 casos con imputación penal.'
        : 'Intermediaries in fertilizer and seed distribution (Segalmex-adjacent); 11 cases with criminal indictments.',
    },
    {
      id: 'C09',
      name: isEs ? 'Red Obras-CFE' : 'CFE Works Network',
      sector: 'energia',
      pattern: 'P5',
      vendors: 201,
      value: 156_000_000_000,
      institution: 'CFE',
      avgRisk: 0.65,
      confirmed: 6,
      daRate: 0.58,
      sbRate: 0.64,
      paRate: 0.52,
      verdict: isEs
        ? 'Obras de transmisión eléctrica con sobreprecios sistemáticos; proveedores rotatorios entre CFE y subsidiarias.'
        : 'Electric-transmission works with systematic overpricing; vendors rotating between CFE and subsidiaries.',
    },
    {
      id: 'C10',
      name: isEs ? 'Cluster Defensa-SEDENA' : 'Defense-SEDENA Cluster',
      sector: 'defensa',
      pattern: 'P1',
      vendors: 34,
      value: 92_000_000_000,
      institution: 'SEDENA',
      avgRisk: 0.59,
      confirmed: 3,
      daRate: 0.96,
      sbRate: 0.81,
      paRate: 0.19,
      verdict: isEs
        ? 'Proveedores militares con cláusulas de seguridad nacional; 96% adjudicación directa por ley, pero concentración anómala en 34 RFCs.'
        : 'Military vendors with national-security clauses; 96% direct award by law, but anomalous concentration in 34 RFCs.',
    },
  ]
}

// ---------------------------------------------------------------------------
// Pattern palette & metadata
// ---------------------------------------------------------------------------

const PATTERN_HEX: Record<PatternCode, string> = {
  P1: '#ef4444', // red-500     · Monopolio
  P2: '#dc2626', // crimson     · Ghost
  P3: '#f97316', // orange-500  · Intermediario
  P4: '#ea580c', // orange-600  · EFOS
  P5: '#f59e0b', // amber-500   · Overpricing / rotation
  P6: '#1a1410', // near-black  · Capture
  P7: '#eab308', // yellow-500  · Mixed / temporal
}

function buildPatternLabel(isEs: boolean): Record<PatternCode, string> {
  return {
    P1: isEs ? 'Monopolio Estructural' : 'Structural Monopoly',
    P2: isEs ? 'Empresa Fantasma' : 'Ghost Company',
    P3: isEs ? 'Intermediario Sospechoso' : 'Suspicious Intermediary',
    P4: isEs ? 'Facturador EFOS' : 'EFOS Invoicer',
    P5: isEs ? 'Sobreprecio / Rotación' : 'Overpricing / Rotation',
    P6: isEs ? 'Captura Institucional' : 'Institutional Capture',
    P7: isEs ? 'Patrón Mixto' : 'Mixed Pattern',
  }
}

const PATTERN_ICON: Record<PatternCode, React.ElementType> = {
  P1: Building2,
  P2: Ghost,
  P3: Network,
  P4: ShieldAlert,
  P5: Activity,
  P6: ShieldAlert,
  P7: AlertTriangle,
}

// ---------------------------------------------------------------------------
// DotBar — local wrapper around the canonical primitive (one renderer for
// the codebase). Local API kept stable so this file's many call sites don't
// have to change. Geometry maps: size→dotR (radius=size/2), size+gap→dotGap.
// ---------------------------------------------------------------------------

import { DotBar as CanonicalDotBar } from '@/components/ui/DotBar'

function DotBar({
  value,
  color,
  emptyColor = 'var(--color-background-elevated)',
  dots = 20,
  size = 6,
  gap = 2,
}: {
  value: number
  color: string
  emptyColor?: string
  dots?: number
  size?: number
  gap?: number
}) {
  return (
    <CanonicalDotBar
      value={value}
      max={1}
      color={color}
      emptyColor={emptyColor}
      emptyStroke="var(--color-border-hover)"
      dots={dots}
      dotR={size / 2}
      dotGap={size + gap}
      ariaLabel={`${Math.round(Math.max(0, Math.min(1, value)) * 100)} percent`}
    />
  )
}


// ---------------------------------------------------------------------------
// ACT I — LOS NÚCLEOS
// SVG cluster of the ten communities. Size maps to value captured; color
// maps to dominant pattern. Hovering reveals a tooltip; clicking scrolls
// to the community's dossier card below.
// ---------------------------------------------------------------------------

interface NucleusProps {
  communities: Community[]
  activeId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  isEs: boolean
}

function Nucleos({ communities, activeId, onHover, onSelect, isEs }: NucleusProps) {
  const W = 900
  const H = 440

  // Radius scale: use vendors (always real) for sizing.
  // value may be 0 when built from spotlight data — never use it for geometry.
  const maxV = Math.max(...communities.map((c) => c.vendors))
  const rOf = (v: number) => 16 + 52 * Math.sqrt(v / maxV)

  // Deterministic, organic 3-row staggered layout — no overlap, flows L→R.
  // Sorted by vendors desc so the two largest anchor the left.
  const sorted = [...communities].sort((a, b) => b.vendors - a.vendors)
  // Dynamic row layout adapts to n communities (7 from spotlight, 10 fallback).
  const n = sorted.length
  const rowConfig: number[][] =
    n <= 7
      ? [[0, 1, 2], [3, 4], [5, 6]]            // 3-2-2 for 7
      : [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9]]   // 3-4-3 for 10
  const rows = rowConfig
  const rowYs = [0.24, 0.52, 0.80]
  const positioned: { c: Community; x: number; y: number; r: number }[] = []
  rows.forEach((rowIdx, ri) => {
    const count = rowIdx.length
    rowIdx.forEach((i, ci) => {
      const c = sorted[i]
      if (!c) return
      const x = (W * (ci + 1)) / (count + 1)
      // Slight vertical jitter, deterministic
      const jitter = ((ri + ci) % 2 === 0 ? -1 : 1) * 12
      const y = H * rowYs[ri] + jitter
      positioned.push({ c, x, y, r: rOf(c.vendors) })
    })
  })

  const active = positioned.find((p) => p.c.id === activeId)

  return (
    <div className="relative rounded-sm border border-border/30 bg-background-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-risk-critical/80"
          style={{ fontFamily: FONT_MONO }}
        >
          {isEs ? 'Acto I · Los Núcleos' : 'Act I · The Cores'}
        </p>
        <h2
          className="text-xl md:text-2xl font-bold text-text-primary mt-1 leading-tight"
          style={{ fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}
        >
          {isEs
            ? `${communities.length} clústeres de patrones ARIA`
            : `${communities.length} ARIA pattern clusters`}
        </h2>
        <p className="text-[12px] text-text-muted/70 mt-1.5 max-w-3xl leading-relaxed">
          {isEs
            ? 'Cada círculo representa un patrón de corrupción ARIA (P1–P7). El tamaño refleja el número de proveedores en ese patrón; el color, el tipo de corrupción dominante. Datos en tiempo real de la base de datos ARIA.'
            : 'Each circle represents one ARIA corruption pattern (P1–P7). Size reflects the vendor count in that pattern; color encodes the dominant corruption type. Live data from the ARIA database.'}
        </p>
      </div>

      <div className="relative" onMouseLeave={() => onHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Cluster of corruption communities"
          style={{ display: 'block', fontFamily: FONT_MONO }}
        >
          {/* Faint baseline */}
          <line
            x1={40}
            y1={H - 14}
            x2={W - 40}
            y2={H - 14}
            stroke="var(--color-border)"
            strokeDasharray="2 4"
          />

          {positioned.map(({ c, x, y, r }) => {
            const fill = PATTERN_HEX[c.pattern]
            const isActive = c.id === activeId
            const dim = activeId !== null && !isActive
            return (
              <g
                key={c.id}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer', transition: 'opacity 180ms' }}
                opacity={dim ? 0.35 : 1}
                onMouseEnter={() => onHover(c.id)}
                onClick={() => onSelect(c.id)}
                aria-label={`${c.name}: ${formatNumber(c.vendors)} vendors${c.value > 0 ? ', ' + formatCompactMXN(c.value) : ''}`}
              >
                {/* Halo for active */}
                {isActive && (
                  <circle
                    r={r + 10}
                    fill="none"
                    stroke={fill}
                    strokeOpacity={0.35}
                    strokeWidth={1.2}
                  />
                )}
                {/* Main circle */}
                <circle
                  r={r}
                  fill={fill}
                  fillOpacity={isActive ? 0.9 : 0.72}
                  stroke={isActive ? 'var(--color-text-primary)' : 'var(--color-background-card)'}
                  strokeWidth={isActive ? 1.6 : 1.2}
                />
                {/* Pattern code label inside */}
                <text
                  y={-2}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={Math.max(9, Math.min(13, r * 0.22))}
                  fontWeight={700}
                  style={{ fontFamily: FONT_MONO, letterSpacing: '0.08em' }}
                >
                  {c.pattern}
                </text>
                {/* Vendor count inside bubble */}
                <text
                  y={12}
                  textAnchor="middle"
                  fill="#fff"
                  fillOpacity={0.85}
                  fontSize={Math.max(8, Math.min(11, r * 0.16))}
                  style={{ fontFamily: FONT_MONO }}
                >
                  {formatNumber(c.vendors)} {isEs ? 'provs' : 'vendors'}
                </text>
                {/* Community name beneath */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={10}
                  style={{ fontFamily: FONT_MONO }}
                >
                  {c.name.length > 26 ? c.name.slice(0, 24) + '…' : c.name}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Floating tooltip for active community */}
        {active && (
          <div
            className="absolute z-10 rounded-sm border border-border bg-background/95 shadow-xl px-3.5 py-2.5 text-[11px] backdrop-blur-sm"
            style={{
              left: `${Math.min(80, (active.x / W) * 100)}%`,
              top: `${(active.y / H) * 100}%`,
              transform: 'translate(-50%, -120%)',
              minWidth: 240,
            }}
          >
            <div
              className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: PATTERN_HEX[active.c.pattern] }}
              />
              <span
                className="text-[13px] font-bold text-text-primary leading-tight"
                style={{ fontFamily: FONT_SERIF }}
              >
                {active.c.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-text-muted uppercase tracking-wider">{isEs ? 'Vendedores' : 'Vendors'}</span>
              <DotBar
                value={active.c.vendors / 900}
                color={PATTERN_HEX[active.c.pattern]}
                dots={18}
                size={4}
                gap={2}
              />
              <span className="text-text-secondary font-mono font-bold tabular-nums min-w-[40px] text-right">
                {formatNumber(active.c.vendors)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px]">
              <span className="text-text-secondary">{isEs ? 'Valor' : 'Value'}</span>
              <span className="text-text-muted font-mono">
                {active.c.value > 0
                  ? formatCompactMXN(active.c.value)
                  : isEs ? 'pendiente análisis' : 'pending analysis'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                style={{
                  backgroundColor: `${PATTERN_HEX[active.c.pattern]}25`,
                  color: PATTERN_HEX[active.c.pattern],
                  border: `1px solid ${PATTERN_HEX[active.c.pattern]}55`,
                }}
              >
                {active.c.pattern} · {buildPatternLabel(isEs)[active.c.pattern]}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 pointer-events-auto flex-wrap">
              <Link
                to={`/patterns/${active.c.pattern}`}
                className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors"
                style={{ color: PATTERN_HEX[active.c.pattern], background: `${PATTERN_HEX[active.c.pattern]}18`, border: `1px solid ${PATTERN_HEX[active.c.pattern]}40` }}
                onClick={(e) => e.stopPropagation()}
              >
                {isEs ? 'Dossier →' : 'Dossier →'}
              </Link>
              <Link
                to={`/aria?pattern=${active.c.pattern}`}
                className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors"
                style={{ color: PATTERN_HEX[active.c.pattern], background: `${PATTERN_HEX[active.c.pattern]}18`, border: `1px solid ${PATTERN_HEX[active.c.pattern]}40` }}
                onClick={(e) => e.stopPropagation()}
              >
                ARIA →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Legend strip */}
      <div className="px-5 py-3 border-t border-border flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-muted/50">
          {isEs ? 'Patrones:' : 'Patterns:'}
        </span>
        {(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as PatternCode[]).map((p) => {
          const label = buildPatternLabel(isEs)[p]
          return (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 text-[10px] text-text-muted/70"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: PATTERN_HEX[p] }}
              />
              <span className="font-mono font-bold text-[10px]">{p}</span>
              <span className="text-[10px]">{label}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TopVendorsPanel — shows real ARIA T1 vendors for a community's pattern
// ---------------------------------------------------------------------------

function TopVendorsPanel({
  spotlight,
  color,
  isEs,
}: {
  spotlight: PatternSpotlight | undefined
  color: string
  isEs: boolean
}) {
  if (!spotlight || spotlight.top_vendors.length === 0) return null
  return (
    <div className="pt-3 mt-1 border-t border-border">
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-2">
        {isEs ? `Principales investigados (${spotlight.code})` : `Top subjects (${spotlight.code})`}
      </div>
      <div className="space-y-1">
        {spotlight.top_vendors.slice(0, 4).map((v, i) => (
          <div
            key={v.vendor_id}
            className="flex items-center gap-2 rounded px-2 py-1 hover:bg-background-card transition-colors"
          >
            <span
              className="text-[9px] font-mono font-bold w-3 text-right tabular-nums flex-shrink-0"
              style={{ color }}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" />
            </div>
            <span
              className="text-[10px] font-mono font-bold tabular-nums flex-shrink-0"
              style={{ color }}
            >
              {v.ips_final.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ACT II — EL DOSSIER
// One editorial card per community with a network signature (DA rate,
// single-bid rate, price-anomaly rate), value captured, and verdict.
// ---------------------------------------------------------------------------

function CommunityDossier({
  c,
  communities,
  isActive,
  onHover,
  innerRef,
  isEs,
  patternSpotlight,
}: {
  c: Community
  communities: Community[]
  isActive: boolean
  onHover: (id: string | null) => void
  innerRef: (el: HTMLDivElement | null) => void
  isEs: boolean
  patternSpotlight: PatternSpotlight | undefined
}) {
  const fill = PATTERN_HEX[c.pattern]
  // sectorFill for backgrounds/borders (vivid); sectorTextColor for readable text labels
  const sectorFill = SECTOR_COLORS[c.sector] ?? '#64748b'
  const sectorTextColor = SECTOR_TEXT_COLORS[c.sector] ?? '#475569'
  const Icon = PATTERN_ICON[c.pattern]

  // Normalizers for member-bar and confirmed-bar (relative to our corpus)
  const maxVendors = Math.max(...communities.map((x) => x.vendors))
  const maxConfirmed = Math.max(...communities.map((x) => x.confirmed))
  const maxValue = Math.max(...communities.map((x) => x.value))
  const hasRealValues = maxValue > 0

  return (
    <div
      ref={innerRef}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'rounded-sm border overflow-hidden transition-all',
        'bg-surface-card border-border',
        isActive ? 'border-border ring-1 ring-border' : 'hover:border-border',
      )}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: fill,
      }}
    >
      <div className="p-5 space-y-3.5">
        {/* Header row: pattern badge + institution */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: fill }}
              aria-hidden="true"
            />
            <Link
              to={`/patterns/${c.pattern}`}
              className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] hover:underline"
              style={{ color: fill }}
              onClick={(e) => e.stopPropagation()}
            >
              {c.pattern} · {buildPatternLabel(isEs)[c.pattern]}
            </Link>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-semibold border"
            style={{
              color: sectorTextColor,
              borderColor: `${sectorFill}55`,
              backgroundColor: `${sectorFill}12`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: sectorFill }}
            />
            {c.institution}
          </div>
        </div>

        {/* Community name */}
        <h3
          className="text-lg text-text-primary font-bold leading-tight"
          style={{ fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}
        >
          {c.name}
        </h3>

        {/* Value captured — hero number (only shown when real; 0 = unknown) */}
        <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: fill }}>
          <div
            className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5"
          >
            {isEs ? 'Valor capturado' : 'Value captured'}
          </div>
          {c.value > 0 ? (
            <div
              className="text-3xl tabular-nums leading-none"
              style={{ color: fill, fontFamily: FONT_SERIF, fontWeight: 800, fontStyle: 'italic' }}
            >
              {formatCompactMXN(c.value)}
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl tabular-nums leading-none text-text-muted/40"
                style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontStyle: 'italic' }}
              >
                —
              </span>
              <span className="text-[10px] text-text-muted/50 font-mono">
                {isEs ? 'pendiente análisis de comunidades' : 'pending community analysis'}
              </span>
            </div>
          )}
        </div>

        {/* Stat bars: Members · Confirmed · Avg Risk */}
        <div className="space-y-1.5 pt-1">
          <StatRow
            label={isEs ? 'Proveedores' : 'Vendors'}
            value={formatNumber(c.vendors)}
            bar={<DotBar value={c.vendors / maxVendors} color={fill} dots={18} />}
          />
          <StatRow
            label={isEs ? 'Casos confirmados' : 'Confirmed cases'}
            value={`${c.confirmed}`}
            bar={
              <DotBar
                value={c.confirmed / maxConfirmed}
                color="#dc2626"
                dots={18}
              />
            }
          />
          <StatRow
            label={isEs ? 'Riesgo promedio' : 'Avg risk'}
            value={`${(c.avgRisk * 100).toFixed(0)}%`}
            bar={<DotBar value={c.avgRisk} color="#f59e0b" dots={18} />}
          />
          {hasRealValues ? (
            <StatRow
              label={isEs ? 'Cuota top-10' : 'Top-10 share'}
              value={`${((c.value / maxValue) * 100).toFixed(0)}%`}
              bar={<DotBar value={c.value / maxValue} color={fill} dots={18} />}
            />
          ) : (
            <StatRow
              label={isEs ? 'Cuota en red' : 'Network share'}
              value={`${((c.vendors / maxVendors) * 100).toFixed(0)}%`}
              bar={<DotBar value={c.vendors / maxVendors} color={fill} dots={18} />}
            />
          )}
        </div>

        {/* Network signature — only shown when per-community rates are known */}
        {(c.daRate > 0 || c.sbRate > 0 || c.paRate > 0) ? (
          <div className="pt-3 mt-1 border-t border-border">
            <div
              className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-2"
            >
              {isEs ? 'Firma de red' : 'Network signature'}
            </div>
            <div className="space-y-1.5">
              <SignatureRow
                label={isEs ? 'Adjudicación Directa' : 'Direct Award'}
                value={c.daRate}
                color="#ef4444"
                benchmark={0.25}
                benchmarkLabel={isEs ? 'OCDE 25%' : 'OECD 25%'}
              />
              <SignatureRow
                label={isEs ? 'Propuesta Única' : 'Single Bid'}
                value={c.sbRate}
                color="#f59e0b"
              />
              <SignatureRow
                label={isEs ? 'Precio Anómalo' : 'Price Anomaly'}
                value={c.paRate}
                color="#eab308"
              />
            </div>
          </div>
        ) : (
          <div className="pt-3 mt-1 border-t border-border">
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-1">
              {isEs ? 'Firma de red' : 'Network signature'}
            </div>
            <p className="text-[10px] text-text-muted/50 font-mono italic">
              {isEs
                ? 'Tasas por comunidad pendientes de análisis de grafo'
                : 'Per-community rates pending graph analysis'}
            </p>
          </div>
        )}

        {/* Verdict */}
        <div className="pt-3 border-t border-border">
          <div
            className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-1.5"
          >
            {isEs ? 'Veredicto editorial' : 'Editorial verdict'}
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed italic">
            &ldquo;{c.verdict}&rdquo;
          </p>
        </div>

        {/* Real ARIA top vendors for this pattern */}
        <TopVendorsPanel spotlight={patternSpotlight} color={fill} isEs={isEs} />
      </div>

      {/* Investigation CTA footer */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3 bg-background-elevated/40">
        <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
          {c.vendors > 0 ? `${formatNumber(c.vendors)} ${isEs ? 'proveedores' : 'vendors'} · ${c.pattern}` : c.pattern}
        </span>
        <div className="flex items-center gap-2">
          {c.pattern.startsWith('P') && (
            <Link
              to={`/aria?pattern=${c.pattern}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors"
              style={{
                background: `${fill}18`,
                color: fill,
                border: `1px solid ${fill}40`,
              }}
            >
              {isEs ? 'Investigar en ARIA' : 'Investigate in ARIA'}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          <Link
            to={`/patterns`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors border border-border hover:border-border-hover"
          >
            {isEs ? 'Ver patrones' : 'All patterns'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  bar,
}: {
  label: string
  value: string
  bar: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <span className="text-text-muted/60 w-28 shrink-0">{label}</span>
      <div className="flex-1 flex items-center">{bar}</div>
      <span className="text-text-primary font-mono font-bold tabular-nums w-12 text-right">
        {value}
      </span>
    </div>
  )
}

function SignatureRow({
  label,
  value,
  color,
  benchmark,
  benchmarkLabel,
}: {
  label: string
  value: number
  color: string
  benchmark?: number
  benchmarkLabel?: string
}) {
  const pct = Math.round(value * 100)
  const overBenchmark = benchmark != null && value > benchmark
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted/70 w-28 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <DotBar value={value} color={color} dots={22} size={5} gap={2} />
        {benchmark != null && (
          <span
            className="absolute top-0 bottom-0 w-px bg-cyan-400/60"
            style={{ left: `${benchmark * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-mono font-bold tabular-nums w-10 text-right',
          overBenchmark ? 'text-risk-critical' : 'text-text-primary',
        )}
      >
        {pct}%
      </span>
      {benchmarkLabel && (
        <span className="text-[9px] text-[color:var(--color-oecd)]/70 font-mono w-16 text-right">
          {benchmarkLabel}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ACT III — FLUJO DE VALOR
// FlowParticle: top 5 communities → top 5 captured institutions.
// ---------------------------------------------------------------------------

function FlujoDeValor({ communities, isEs }: { communities: Community[]; isEs: boolean }) {
  // Determine whether we have real MXN values or only vendor counts.
  const hasRealValues = communities.some((c) => c.value > 0)

  const { sources, targets, links } = useMemo(() => {
    // Sort by whichever dimension is real; fall back to vendors when values are 0.
    const top5 = [...communities]
      .sort((a, b) => (hasRealValues ? b.value - a.value : b.vendors - a.vendors))
      .slice(0, 5)
    // Flow weight: use real MXN when available, otherwise use vendor count.
    const flowOf = (c: Community) => (hasRealValues ? c.value : c.vendors)
    // Target label: use institution name when set, otherwise pattern name.
    const targetOf = (c: Community) => c.institution || c.name
    const sources: FlowNode[] = top5.map((c) => ({
      id: `s-${c.id}`,
      label: c.name,
      value: flowOf(c),
    }))
    const targets: FlowNode[] = top5.map((c) => ({
      id: `t-${c.id}`,
      label: targetOf(c),
      value: flowOf(c),
    }))
    const links: FlowLink[] = top5.map((c) => ({
      sourceId: `s-${c.id}`,
      targetId: `t-${c.id}`,
      value: flowOf(c),
      critical: c.avgRisk >= 0.65,
    }))
    return { sources, targets, links }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communities, hasRealValues])

  const totalFlow = links.reduce((s, l) => s + l.value, 0)

  return (
    <div className="rounded-sm border border-border/30 bg-background-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-risk-high/80"
          style={{ fontFamily: FONT_MONO }}
        >
          {isEs ? 'Acto III · Flujo de Valor' : 'Act III · Value Flow'}
        </p>
        <h2
          className="text-xl md:text-2xl font-bold text-text-primary mt-1 leading-tight"
          style={{ fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}
        >
          {isEs ? 'Cómo fluye el dinero: patrones → instituciones' : 'How money flows: patterns → institutions'}
        </h2>
        <p className="text-[12px] text-text-muted/70 mt-1.5 max-w-3xl leading-relaxed">
          {isEs ? (
            <>
              Cada partícula representa una fracción del flujo relativo. Los flujos rojos
              marcan clústeres con indicador de riesgo promedio ≥ 65%.{' '}
              {hasRealValues ? (
                <>
                  Total mostrado:{' '}
                  <span className="text-text-primary font-mono font-bold">
                    {formatCompactMXN(totalFlow)}
                  </span>{' '}
                  a través de los 5 clústeres más grandes.
                </>
              ) : (
                <>
                  El ancho del flujo es proporcional al número de proveedores;
                  el valor monetario estará disponible con la próxima sincronización de comunidades.
                </>
              )}
            </>
          ) : (
            <>
              Each particle represents a fraction of relative flow. Red flows
              mark clusters with average risk indicator ≥ 65%.{' '}
              {hasRealValues ? (
                <>
                  Total shown:{' '}
                  <span className="text-text-primary font-mono font-bold">
                    {formatCompactMXN(totalFlow)}
                  </span>{' '}
                  across the 5 largest clusters.
                </>
              ) : (
                <>
                  Flow width is proportional to vendor count;
                  monetary value will be available with the next community sync.
                </>
              )}
            </>
          )}
        </p>
      </div>

      <div className="p-4">
        <FlowParticle
          sources={sources}
          targets={targets}
          links={links}
          sourceLabel={isEs ? 'Comunidad' : 'Community'}
          targetLabel={isEs ? 'Institución' : 'Institution'}
          width={860}
          height={360}
          maxDotsPerFlow={80}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header stats derived from live ARIA queue for context
// ---------------------------------------------------------------------------

function HeaderStats({ communities, isEs }: { communities: Community[]; isEs: boolean }) {
  const { data: stats } = useQuery({
    queryKey: ['aria-stats-red'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const totalCorpusValue = useMemo(
    () => communities.reduce((s, c) => s + c.value, 0),
    [communities],
  )
  const totalCorpusVendors = useMemo(
    () => communities.reduce((s, c) => s + c.vendors, 0),
    [communities],
  )
  const totalCorpusConfirmed = useMemo(
    () => communities.reduce((s, c) => s + c.confirmed, 0),
    [communities],
  )
  const hasRealValues = totalCorpusValue > 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <HeaderStat
        label={isEs ? 'Clústeres' : 'Clusters'}
        value={String(communities.length)}
        sublabel={isEs ? 'patrones ARIA activos' : 'active ARIA patterns'}
      />
      <HeaderStat
        label={isEs ? 'Proveedores en red' : 'Vendors in network'}
        value={formatNumber(totalCorpusVendors)}
        sublabel={
          isEs
            ? `de ${stats ? formatNumber(stats.queue_total) : '—'} en cola ARIA`
            : `of ${stats ? formatNumber(stats.queue_total) : '—'} in ARIA queue`
        }
      />
      {hasRealValues ? (
        <HeaderStat
          label={isEs ? 'Valor capturado' : 'Value captured'}
          value={formatCompactMXN(totalCorpusValue)}
          sublabel={isEs ? 'estimado en la red' : 'estimated in network'}
          accent="#ef4444"
        />
      ) : (
        <HeaderStat
          label={isEs ? 'Valor capturado' : 'Value captured'}
          value="—"
          sublabel={isEs ? 'pendiente análisis de grafo' : 'pending graph analysis'}
        />
      )}
      <HeaderStat
        label={isEs ? 'Casos documentados' : 'Documented cases'}
        value={String(totalCorpusConfirmed)}
        sublabel={isEs ? 'con evidencia en GT' : 'with GT evidence'}
        accent="#f59e0b"
      />
    </div>
  )
}

function HeaderStat({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string
  value: string
  sublabel: string
  accent?: string
}) {
  return (
    <div className="rounded-sm border border-border bg-background-card px-4 py-3">
      <div
        className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-1"
      >
        {label}
      </div>
      <div
        className="text-2xl font-mono font-black tabular-nums leading-none"
        style={{ color: accent ?? 'var(--color-text-primary)' }}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-muted/60 mt-1 leading-snug">{sublabel}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RedesKnownDossier() {
  const { i18n } = useTranslation('redes')
  const isEs = i18n.language.startsWith('es')

  const { data: spotlightData } = useQuery({
    queryKey: ['pattern-spotlight'],
    queryFn: () => networkApi.getPatternSpotlight(),
    staleTime: 30 * 60 * 1000,
  })

  const { data: communitiesData } = useQuery({
    queryKey: ['network-communities-v2'],
    queryFn: () => networkApi.getCommunities({ min_size: 3, min_avg_risk: 0.0, limit: 20 }),
    staleTime: 60 * 60 * 1000,
  })

  const usingLouvain =
    (communitiesData?.graph_ready === true) && (communitiesData.communities.length > 0)

  const communities = useMemo(() => {
    // Prefer ARIA pattern spotlight (P1–P7): named patterns, real GT counts,
    // meaningful vendor counts. Louvain communities currently lack sector data
    // (0 sectors on all communities) and are not yet ready as primary view.
    if (spotlightData?.patterns?.length) {
      return buildCommunitiesFromSpotlight(spotlightData, isEs)
    }
    // Fall back to Louvain only when spotlight is unavailable
    if (communitiesData?.graph_ready && communitiesData.communities.length > 0) {
      return buildCommunitiesFromLouvain(communitiesData.communities, isEs)
    }
    return []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communitiesData, spotlightData, isEs, i18n.language])

  const spotlightByCode = useMemo(() => {
    const map: Record<string, PatternSpotlight> = {}
    spotlightData?.patterns.forEach((p) => { map[p.code] = p })
    return map
  }, [spotlightData])

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const dossierRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const effectiveActive = hoverId ?? activeId

  // When user clicks a community in the cluster, scroll its dossier card into view.
  useEffect(() => {
    if (!activeId) return
    const el = dossierRefs.current[activeId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeId])

  return (
    <div className="relative space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page paper-grain — scoped to this contemplative atlas surface.
          Pattern from rubli-folio-aesthetic § "Atmosphere — paper-grain
          overlay". */}
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
      {/* Folio·XIV hero — replaces the prior editorial header. EB Garamond
          italic 500 + ochre normal-weight fragment per
          rubli-folio-aesthetic § Typography. Named precedent: OCCRP /
          ICIJ shell-company flow diagrams; the Nucleos cluster + Act III
          FlowParticle Sankey are exactly that vocabulary. Cited in plan
          docs/FOLIO_V1_PHASE4_2026_05_07.md § 4. */}
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
            <span style={{ color: '#a06820', fontWeight: 500 }}>Folio·XIV</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>
              {isEs ? 'Inteligencia de red · ARIA + Louvain' : 'Network intelligence · ARIA + Louvain'}
            </span>
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
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                red invisible.
              </span>
            </>
          ) : (
            <>
              The{' '}
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                invisible
              </span>
              {' '}network.
            </>
          )}
        </h1>

        <p
          className="mb-5"
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
              No buscamos proveedores corruptos uno por uno. Buscamos{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>comunidades</em>{' '}
              que capturan instituciones. Siete patrones de comportamiento detectados por ARIA
              sobre 3.1M contratos federales.
            </>
          ) : (
            <>
              We do not hunt corrupt vendors one by one. We hunt{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>communities</em>{' '}
              that capture institutions. Seven behavioral patterns detected by ARIA
              over 3.1M federal contracts.
            </>
          )}
        </p>

        {/* Data-source indicator */}
        <div className="mb-4">
          <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60">
            {usingLouvain
              ? (isEs
                  ? `Comunidades detectadas por Louvain · ${communitiesData!.total_communities.toLocaleString(isEs ? 'es-MX' : 'en-US')} nodos`
                  : `Louvain-detected communities · ${communitiesData!.total_communities.toLocaleString()} nodes`)
              : (isEs
                  ? 'Vista por patrones ARIA · datos en tiempo real'
                  : 'ARIA pattern view · live data')}
          </span>
        </div>

        {/* Real-data callout derived from spotlight query */}
        <div className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/8 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent)] animate-pulse flex-shrink-0" />
          <span className="text-sm font-mono">
            <span className="text-[color:var(--color-accent)] font-bold">
              {formatNumber(communities.reduce((s, c) => s + c.vendors, 0))}
            </span>
            <span className="text-text-muted/70 ml-1.5">
              {isEs ? 'proveedores en ' : 'vendors across '}
            </span>
            <span className="text-[color:var(--color-accent)] font-bold">
              {communities.length}
            </span>
            <span className="text-text-muted/70 ml-1.5">
              {isEs ? 'clústeres de patrones · ' : 'pattern clusters · '}
            </span>
            <span className="text-[color:var(--color-accent)] font-bold">
              {communities.reduce((s, c) => s + c.confirmed, 0)}
            </span>
            <span className="text-text-muted/70 ml-1.5">
              {isEs ? 'casos documentados' : 'documented cases'}
            </span>
          </span>
        </div>
      </div>

      {/* Context stats */}
      <HeaderStats communities={communities} isEs={isEs} />

      {/* Former Act 0 — "Circuit Board" SVG network — removed per 5-agent
          editorial review (data-viz, UX, investigative editor all flagged
          it as decorative with no readable structure: no node labels, no
          legend, no axis, no ordering logic visible at page scale). Nucleos
          (labeled community bubbles below) was already doing the
          investigative work; the CircuitBoard was visual noise above it.
          Component definition retained upstream in case a future labeled
          version is built, but not rendered. */}

      {/* ACT I — Nucleos (now the lead network viz) */}
      <PlateFrame
        lang={isEs ? 'es' : 'en'}
        folio="XIV"
        contextLabel={{ en: 'Network atlas', es: 'Atlas de redes' }}
        caption={
          isEs
            ? 'Lámina — Clústeres de patrones ARIA. El tamaño del círculo es proporcional al número de proveedores; el color codifica el patrón dominante.'
            : 'Plate — ARIA pattern clusters. Circle size is proportional to vendor count; color encodes the dominant pattern.'
        }
      >
        <Nucleos
          communities={communities}
          activeId={effectiveActive}
          onHover={setHoverId}
          onSelect={(id) => setActiveId(id === activeId ? null : id)}
          isEs={isEs}
        />
      </PlateFrame>

      {/* Act II intro */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-risk-high/80"
          >
            {isEs ? 'Acto II · El Dossier' : 'Act II · The Dossier'}
          </span>
          <ChevronRight className="w-3 h-3 text-text-muted/40" aria-hidden="true" />
          <span className="text-[11px] text-text-muted/60">
            {isEs
              ? 'Firma de red por comunidad — contrastada con el techo OCDE'
              : 'Network signature per community — contrasted with the OECD ceiling'}
          </span>
        </div>
        <h2
          className="text-2xl md:text-3xl font-bold text-text-primary mb-2 leading-tight"
          style={{ fontFamily: FONT_SERIF, letterSpacing: '-0.015em' }}
        >
          {isEs ? 'Cada patrón, su propia patología' : 'Every pattern, its own pathology'}
        </h2>
        <p className="text-sm text-text-muted/70 max-w-3xl leading-relaxed">
          {isEs
            ? 'Debajo, cada clúster de patrón ARIA muestra el número real de proveedores, casos documentados e indicador de riesgo promedio. Cuando esté disponible el análisis de comunidades Louvain, se añadirán tasas de adjudicación directa, propuesta única y anomalía de precio por comunidad.'
            : 'Below, each ARIA pattern cluster shows the real vendor count, documented cases, and average risk indicator. When Louvain community analysis is available, per-community direct-award, single-bid, and price-anomaly rates will be added.'}
        </p>
      </div>

      {/* ACT II — Dossier grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communities.map((c) => (
          <CommunityDossier
            key={c.id}
            c={c}
            communities={communities}
            isActive={effectiveActive === c.id}
            onHover={(id) => setHoverId(id)}
            innerRef={(el) => {
              dossierRefs.current[c.id] = el
            }}
            isEs={isEs}
            patternSpotlight={spotlightByCode[c.pattern]}
          />
        ))}
      </div>

      {/* ACT III — Flujo de Valor */}
      <FlujoDeValor communities={communities} isEs={isEs} />

      {/* Methodological footer */}
      <div
        className="rounded-sm border border-border bg-background-card px-5 py-4 mt-6"
      >
        <div className="flex items-start gap-3">
          <Users className="w-4 h-4 text-text-muted/40 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted/50 mb-1.5"
            >
              {isEs ? 'Metodología' : 'Methodology'}
            </p>
            <p className="text-[12px] text-text-secondary leading-relaxed max-w-3xl">
              {isEs ? (
                <>
                  Las comunidades se detectan con el algoritmo de Louvain sobre la red de
                  co-contratación (vendedores que aparecen juntos en procedimientos,
                  operan en la misma institución en ventanas de tiempo solapadas, o
                  comparten patrones de adjudicación). Las firmas de red provienen del
                  motor ARIA v1.1 (Run{' '}
                  <span className="font-mono text-text-primary/80">28d5c453</span>) combinado con
                  el modelo de riesgo v0.8.5 (AUC test 0.785). Los veredictos son
                  editoriales; las métricas son del motor.
                </>
              ) : (
                <>
                  Communities are detected with the Louvain algorithm over the
                  co-contracting network (vendors that appear together in procedures,
                  operate at the same institution in overlapping time windows, or share
                  award patterns). Network signatures come from the ARIA v1.1 engine
                  (Run <span className="font-mono text-text-primary/80">28d5c453</span>)
                  combined with risk model v0.8.5 (test AUC 0.785). Verdicts are
                  editorial; metrics come from the engine.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
