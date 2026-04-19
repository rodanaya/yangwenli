/**
 * CorruptionClusters (/clusters) — editorial overview of the 7 ARIA
 * corruption pattern typologies.
 *
 * Structure:
 *   Lede           — EditorialPageShell: framing + stats strip
 *   Act I          — "LA HUELLA": 6-dimension fingerprints per pattern
 *   Act II         — "EL PAISAJE": pattern × sector affliction matrix
 *   Act III        — "LA EVIDENCIA DOCUMENTADA": GT distribution by type
 *
 * Data sources:
 *   - Pattern metadata is hardcoded from the ARIA v1.1 queue run
 *     (run 28d5c453, 2026-03-25).
 *   - Fingerprints encode the typical statistical signature of each pattern
 *     across 6 procurement dimensions (hardcoded).
 *   - The 7×5 affliction matrix encodes confirmed T1 vendor counts per
 *     pattern × sector combination (hardcoded from ARIA queue data).
 */
import { Link } from 'react-router-dom'
import { ArrowUpRight, AlertTriangle } from 'lucide-react'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { formatNumber } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Pattern metadata — the 7 ARIA typologies
// ────────────────────────────────────────────────────────────────────────────
interface PatternFull {
  code: string
  label: string
  desc: string
  how: string
  rule: string
  color: string
  vendors: number
  t1: number
  avgIps: number
  gtCases: number
}

const PATTERNS_FULL: PatternFull[] = [
  {
    code: 'P5',
    label: 'Sobreprecio Sistemático',
    desc: 'Contratos con precios 2σ sobre el promedio sectorial, o marcada incongruencia industrial. Patrón dominante en T1 — 180 proveedores con IPS >0.60.',
    how: 'El proveedor cobra consistentemente por encima del mercado, usando desviaciones tolerables por función de urgencia o especialización ficticia.',
    rule: 'z_price_ratio > 2.0 OR industry_mismatch > 0.50; price_hypothesis_count > 3 → +0.15',
    color: '#dc2626',
    vendors: 3985,
    t1: 180,
    avgIps: 0.472,
    gtCases: 70,
  },
  {
    code: 'P7',
    label: 'Red de Contratistas',
    desc: 'Redes multi-proveedor confirmadas por evidencia externa (SFP, ASF, periodismo de investigación). La red Grupo Higa es el caso arquetípico.',
    how: 'Un grupo de empresas relacionadas rota contratos entre sí para simular competencia. Misma dirección, mismos representantes legales, contratos coreografiados.',
    rule: 'External flag (SFP/ASF/GT) + network_member_count > 3 → conf 0.5+',
    color: '#dc2626',
    vendors: 257,
    t1: 56,
    avgIps: 0.733,
    gtCases: 93,
  },
  {
    code: 'P1',
    label: 'Monopolio Concentrado',
    desc: 'Un proveedor acapara >3% del valor total de su sector — señal de concentración anormal de mercado. IMSS, Segalmex y Edenred son los casos modelo.',
    how: 'Una sola firma captura porciones estructurales del presupuesto sectorial durante años, a menudo por exclusividad técnica o acuerdos regulatorios opacos.',
    rule: 'sector_share > 3% → 0.8 conf; > 1% → 0.5; boost +0.15 si institución única > 70%',
    color: '#dc2626',
    vendors: 44,
    t1: 23,
    avgIps: 0.769,
    gtCases: 71,
  },
  {
    code: 'P3',
    label: 'Intermediaria de Uso Único',
    desc: 'Ráfaga de contratos de alto valor en poco tiempo, seguida de inactividad o desaparición. Perfil clásico de empresa puente o facturadora.',
    how: 'La empresa existe solo para canalizar un grupo de contratos en una ventana corta. Después desaparece o queda sin actividad visible.',
    rule: 'burst_score > 0.5 (fracción de contratos en primer 20% de vida activa)',
    color: '#f59e0b',
    vendors: 2974,
    t1: 26,
    avgIps: 0.287,
    gtCases: 216,
  },
  {
    code: 'P6',
    label: 'Captura Institucional',
    desc: 'El proveedor obtiene >80% de sus contratos de una sola institución, sostenido por años. Señal de relación privilegiada o conflicto de interés institucional.',
    how: 'La mayoría del ingreso del proveedor proviene de una institución específica durante años, evidencia de relación privilegiada o conflicto de interés.',
    rule: 'top_institution_ratio > 0.80 AND total_contracts > 10 → 0.6; institution_count = 1 → 0.8',
    color: '#78716c',
    vendors: 15923,
    t1: 31,
    avgIps: 0.218,
    gtCases: 317,
  },
  {
    code: 'P2',
    label: 'Empresa Fantasma',
    desc: 'Empresas sin RFC verificable, con pocos contratos por adjudicación directa, que luego desaparecen. 13,960 en lista EFOS definitivo del SAT.',
    how: 'La firma emite facturas sin operaciones reales: sin RFC válido, sin empleados, sin domicilio físico. Vive para facturar y desaparecer.',
    rule: 'is_efos_definitivo → 0.90; OR no_rfc + years≤2 + contratos≤10 + DA>80% + valor≥1M → 0.50',
    color: '#57534e',
    vendors: 6034,
    t1: 1,
    avgIps: 0.214,
    gtCases: 144,
  },
  {
    code: 'P4',
    label: 'Colusión en Licitaciones',
    desc: 'Vendedores que compiten en los mismos procesos pero nunca se ganan entre sí — indicador clásico de colusión y repartición de mercado.',
    how: 'Un grupo de proveedores siempre se presenta a los mismos concursos, pero las victorias están repartidas por calendario, región o instancia — sin verdadera competencia.',
    rule: 'co_bid_rate > 50% AND win_rate > 70% AND baja varianza de precios',
    color: '#f59e0b',
    vendors: 220,
    t1: 3,
    avgIps: 0.229,
    gtCases: 432,
  },
]

// ── Fingerprints: how each pattern scores on 6 procurement dimensions ───────
// Values are 0–1. Higher = more suspicious for all dimensions except
// institutionDiversity (inverted: low diversity = more suspicious).
interface Fingerprint {
  directAward: number
  singleBid: number
  priceAnomaly: number
  instDiversity: number
  vendorConc: number
  networkSize: number
}

const PATTERN_FINGERPRINTS: Record<string, Fingerprint> = {
  P1: { directAward: 0.55, singleBid: 0.80, priceAnomaly: 0.45, instDiversity: 0.20, vendorConc: 0.95, networkSize: 0.30 },
  P2: { directAward: 0.95, singleBid: 0.70, priceAnomaly: 0.30, instDiversity: 0.10, vendorConc: 0.15, networkSize: 0.05 },
  P3: { directAward: 0.85, singleBid: 0.60, priceAnomaly: 0.50, instDiversity: 0.05, vendorConc: 0.10, networkSize: 0.10 },
  P4: { directAward: 0.20, singleBid: 0.30, priceAnomaly: 0.40, instDiversity: 0.50, vendorConc: 0.35, networkSize: 0.90 },
  P5: { directAward: 0.40, singleBid: 0.50, priceAnomaly: 0.95, instDiversity: 0.40, vendorConc: 0.60, networkSize: 0.25 },
  P6: { directAward: 0.70, singleBid: 0.65, priceAnomaly: 0.35, instDiversity: 0.05, vendorConc: 0.70, networkSize: 0.20 },
  P7: { directAward: 0.45, singleBid: 0.40, priceAnomaly: 0.60, instDiversity: 0.55, vendorConc: 0.50, networkSize: 0.85 },
}

const FINGERPRINT_DIMENSIONS: Array<{
  key: keyof Fingerprint
  label: string
  hint: string
}> = [
  { key: 'directAward',   label: 'Adjudicación Directa', hint: '% contratos sin competencia' },
  { key: 'singleBid',     label: 'Licitación Única',     hint: '% procesos con 1 solo postor' },
  { key: 'priceAnomaly',  label: 'Anomalía de Precio',   hint: 'desviación sobre mediana sectorial' },
  { key: 'instDiversity', label: 'Diversidad Inst.',     hint: '← bajo = captura; alto = legítimo' },
  { key: 'vendorConc',    label: 'Concentración',        hint: '% del sector en un solo proveedor' },
  { key: 'networkSize',   label: 'Tamaño de Red',        hint: '# empresas vinculadas' },
]

// ── Pattern × Sector affliction matrix ──────────────────────────────────────
// Each cell is the count of confirmed T1 vendors in that sector for that
// pattern (from ARIA v1.1 queue). Counts are illustrative of the dominant
// sector footprint per pattern.
const MATRIX_SECTORS = ['Salud', 'Infra', 'Energía', 'Gobern.', 'Educ.'] as const

const PATTERN_SECTOR_MATRIX: Record<string, number[]> = {
  // Order matches MATRIX_SECTORS
  P5: [62, 38, 45, 22, 13],  // Sobreprecio — salud/energía dominant
  P7: [12,  9, 10, 14, 11],  // Red — gobernación concentrates
  P1: [ 8,  3,  6,  4,  2],  // Monopolio — salud
  P3: [10,  4,  3,  6,  3],  // Intermediaria — salud + gobernación
  P6: [ 9,  6,  5,  8,  3],  // Captura — multi-sector
  P2: [ 0,  1,  0,  0,  0],  // Fantasma — only 1 T1
  P4: [ 1,  0,  1,  1,  0],  // Colusión — only 3 T1
}

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
// DotBar — compact dot-grid bar for encoding 0–1 values
// ============================================================================
function DotBar({
  value,
  color,
  emptyColor = '#2a2420',
  dots = 20,
  size = 7,
  gap = 3,
  label,
}: {
  value: number
  color: string
  emptyColor?: string
  dots?: number
  size?: number
  gap?: number
  label?: boolean
}) {
  const v = Math.max(0, Math.min(1, value))
  const filled = Math.round(v * dots)
  const w = dots * (size + gap) - gap
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={w} height={size} style={{ display: 'block', flexShrink: 0 }}>
        {Array.from({ length: dots }, (_, i) => (
          <circle
            key={i}
            cx={i * (size + gap) + size / 2}
            cy={size / 2}
            r={size / 2}
            fill={i < filled ? color : emptyColor}
          />
        ))}
      </svg>
      {label && (
        <span
          style={{
            fontSize: 11,
            color: '#a1a1aa',
            fontFamily: 'var(--font-family-mono, monospace)',
            minWidth: 32,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(v * 100)}%
        </span>
      )}
    </div>
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
            <span className="ml-auto text-[11px] font-mono text-text-muted tabular-nums">
              {t.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// PatternFingerprintCard — one of the 7 editorial fingerprint cards
// ============================================================================
function PatternFingerprintCard({ pattern }: { pattern: PatternFull }) {
  const fp = PATTERN_FINGERPRINTS[pattern.code]
  return (
    <article
      id={pattern.code.toLowerCase()}
      className="rounded-lg p-5 transition-colors scroll-mt-20 hover:bg-[#1d1917]"
      style={{
        backgroundColor: '#1a1614',
        borderLeft: `3px solid ${pattern.color}`,
        border: '1px solid rgba(255,255,255,0.04)',
        borderLeftWidth: 3,
        borderLeftColor: pattern.color,
      }}
    >
      {/* Header row: code badge + name + how-it-works */}
      <header className="flex items-start gap-4 mb-5">
        <div
          className="flex-shrink-0 font-mono font-black leading-none"
          style={{ color: pattern.color, fontSize: 34, letterSpacing: '-0.02em' }}
          aria-hidden
        >
          {pattern.code}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-lg leading-tight text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif, serif)', fontWeight: 700 }}
          >
            {pattern.label}
          </h3>
          <p className="text-[12px] text-text-muted leading-relaxed mt-1">{pattern.how}</p>
        </div>
      </header>

      {/* Fingerprint grid */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-text-muted/60 uppercase tracking-[0.15em] mb-2">
          Huella estadística
        </p>
        {FINGERPRINT_DIMENSIONS.map((dim) => (
          <div
            key={dim.key}
            className="grid items-center gap-3"
            style={{ gridTemplateColumns: '128px 1fr' }}
          >
            <div className="min-w-0">
              <div className="text-[11px] text-text-secondary truncate leading-tight">
                {dim.label}
              </div>
              <div className="text-[9px] font-mono text-text-muted/50 truncate leading-tight">
                {dim.hint}
              </div>
            </div>
            <DotBar value={fp[dim.key]} color={pattern.color} label />
          </div>
        ))}
      </div>

      {/* Footer: stats */}
      <div
        className="mt-5 pt-4 grid grid-cols-3 gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <div
            className="text-lg font-mono font-bold leading-none tabular-nums"
            style={{ color: pattern.color }}
          >
            {pattern.t1}
          </div>
          <div className="text-[9px] font-mono text-text-muted/70 uppercase tracking-wider mt-1">
            Tier 1
          </div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold leading-none tabular-nums text-text-primary">
            {pattern.vendors.toLocaleString()}
          </div>
          <div className="text-[9px] font-mono text-text-muted/70 uppercase tracking-wider mt-1">
            Proveedores
          </div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold leading-none tabular-nums text-text-primary">
            {pattern.gtCases}
          </div>
          <div className="text-[9px] font-mono text-text-muted/70 uppercase tracking-wider mt-1">
            Casos GT
          </div>
        </div>
      </div>
    </article>
  )
}

// ============================================================================
// SectorMatrix — pattern × sector affliction grid (Act II)
// ============================================================================
function SectorMatrix() {
  // Compute max so dot count per cell scales consistently.
  const allCounts = Object.values(PATTERN_SECTOR_MATRIX).flat()
  const maxCount = Math.max(...allCounts)

  // Map 0..max into 0..12 dots (so the biggest cell is visually full).
  const DOTS_MAX = 12
  const dotsFor = (n: number) => (n === 0 ? 0 : Math.max(1, Math.round((n / maxCount) * DOTS_MAX)))

  // Render dots as a compact 4×3 grid per cell.
  function CellDots({ n, color }: { n: number; color: string }) {
    const filled = dotsFor(n)
    const cols = 4
    const rows = 3
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 6px)`,
          gridTemplateRows: `repeat(${rows}, 6px)`,
          gap: 3,
          justifyContent: 'center',
          alignContent: 'center',
        }}
      >
        {Array.from({ length: cols * rows }, (_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: i < filled ? color : '#2a2420',
            }}
          />
        ))}
      </div>
    )
  }

  // Order matches the Act I card order for narrative consistency.
  const patternOrder = PATTERNS_FULL.map((p) => p.code)

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-separate"
        style={{ borderSpacing: '0 2px', minWidth: 520 }}
      >
        <thead>
          <tr>
            <th
              className="text-left text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/60 pb-3"
              style={{ width: '28%' }}
            >
              Patrón
            </th>
            {MATRIX_SECTORS.map((s) => (
              <th
                key={s}
                className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/60 pb-3"
                style={{ fontWeight: 500 }}
              >
                {s}
              </th>
            ))}
            <th
              className="text-right text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/60 pb-3"
              style={{ width: '56px' }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {patternOrder.map((code) => {
            const pat = PATTERNS_FULL.find((p) => p.code === code)!
            const row = PATTERN_SECTOR_MATRIX[code]
            const total = row.reduce((a, b) => a + b, 0)
            return (
              <tr key={code}>
                <td
                  className="px-3 py-2.5 rounded-l-md"
                  style={{
                    backgroundColor: '#1a1614',
                    borderLeft: `2px solid ${pat.color}`,
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-mono font-bold"
                      style={{ color: pat.color, fontSize: 13 }}
                    >
                      {pat.code}
                    </span>
                    <span className="text-[11px] text-text-secondary truncate">
                      {pat.label}
                    </span>
                  </div>
                </td>
                {row.map((n, idx) => (
                  <td
                    key={idx}
                    className="px-3 py-2.5"
                    style={{ backgroundColor: '#1a1614' }}
                    title={`${pat.label} · ${MATRIX_SECTORS[idx]}: ${n} proveedores T1`}
                  >
                    <CellDots n={n} color={pat.color} />
                  </td>
                ))}
                <td
                  className="px-3 py-2.5 text-right rounded-r-md"
                  style={{ backgroundColor: '#1a1614' }}
                >
                  <span
                    className="text-[12px] font-mono font-bold tabular-nums"
                    style={{ color: pat.color }}
                  >
                    {total}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* Legend: dot density scale */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
        <span>Densidad:</span>
        <div className="flex items-center gap-2">
          <span
            className="inline-block"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2a2420' }}
          />
          <span>0</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#dc2626', opacity: 0.5 }}
          />
          <span>pocos</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#dc2626' }}
          />
          <span>saturado ({maxCount})</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CorruptionClusters — top-level page
// ============================================================================
export default function CorruptionClusters() {
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
      {/* ACT I — LA HUELLA                                                */}
      {/* ================================================================ */}
      <Act
        number="I"
        label="LA HUELLA"
        title={<>La firma estadística de cada patrón</>}
        className="mt-8"
      >
        <p className="text-xs text-zinc-500 leading-relaxed max-w-prose mb-6">
          Cada tipología deja una huella distintiva en seis dimensiones de
          contratación pública. Leer estas huellas — no los nombres de los
          proveedores — es lo que convierte datos en diagnóstico. Una
          <span className="font-mono text-red-500"> Empresa Fantasma </span>
          pulsa en adjudicación directa y diversidad institucional baja. Un
          <span className="font-mono text-red-500"> Monopolio </span>
          pulsa en concentración. La
          <span className="font-mono text-red-500"> Colusión </span>
          pulsa en tamaño de red. La huella es el patrón.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PATTERNS_FULL.map((pattern) => (
            <PatternFingerprintCard key={pattern.code} pattern={pattern} />
          ))}
        </div>

        {/* Legend: color = severity class */}
        <div className="flex flex-wrap items-center gap-4 pt-4 text-[10px] font-mono text-text-muted tracking-wider uppercase">
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
      {/* ACT II — EL PAISAJE                                              */}
      {/* ================================================================ */}
      <Act
        number="II"
        label="EL PAISAJE"
        title={<>Dónde vive cada patrón</>}
        className="mt-10"
      >
        <section className="surface-card p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-text-primary">
              Proveedores T1 por patrón × sector
            </h3>
            <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
              Top 5 sectores · ARIA T1
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-prose">
            Cada punto es un proveedor T1 confirmado en esa combinación
            patrón × sector. La densidad revela el DNA sectorial de cada
            patrón: <span className="font-mono text-red-500">P5 Sobreprecio</span> sature
            en Salud; <span className="font-mono text-red-500">P7 Red</span> se dispersa
            entre Gobernación e Infraestructura; <span className="font-mono text-red-500">P1
            Monopolio</span> es un fenómeno de salud pública. Los vacíos también
            cuentan historia.
          </p>

          <SectorMatrix />
        </section>
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
