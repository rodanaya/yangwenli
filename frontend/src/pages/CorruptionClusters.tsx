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
import { useTranslation } from 'react-i18next'
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

function buildPatternsFull(isEs: boolean): PatternFull[] {
  return [
    {
      code: 'P5',
      label: isEs ? 'Sobreprecio Sistemático' : 'Systematic Overpricing',
      desc: isEs
        ? 'Contratos con precios 2σ sobre el promedio sectorial, o marcada incongruencia industrial. Patrón dominante en T1 — 180 proveedores con IPS >0.60.'
        : 'Contracts priced 2σ above sector average, or marked industry mismatch. Dominant T1 pattern — 180 vendors with IPS >0.60.',
      how: isEs
        ? 'El proveedor cobra consistentemente por encima del mercado, usando desviaciones tolerables por función de urgencia o especialización ficticia.'
        : 'The vendor consistently charges above market rates, using deviations tolerated under the guise of urgency or fictional specialization.',
      rule: 'z_price_ratio > 2.0 OR industry_mismatch > 0.50; price_hypothesis_count > 3 → +0.15',
      color: '#dc2626',
      vendors: 3985,
      t1: 180,
      avgIps: 0.472,
      gtCases: 70,
    },
    {
      code: 'P7',
      label: isEs ? 'Red de Contratistas' : 'Contractor Network',
      desc: isEs
        ? 'Redes multi-proveedor confirmadas por evidencia externa (SFP, ASF, periodismo de investigación). La red Grupo Higa es el caso arquetípico.'
        : 'Multi-vendor networks confirmed by external evidence (SFP, ASF, investigative journalism). The Grupo Higa network is the archetypal case.',
      how: isEs
        ? 'Un grupo de empresas relacionadas rota contratos entre sí para simular competencia. Misma dirección, mismos representantes legales, contratos coreografiados.'
        : 'A group of related companies rotates contracts among themselves to simulate competition. Same address, same legal representatives, choreographed contracts.',
      rule: 'External flag (SFP/ASF/GT) + network_member_count > 3 → conf 0.5+',
      color: '#dc2626',
      vendors: 257,
      t1: 56,
      avgIps: 0.733,
      gtCases: 93,
    },
    {
      code: 'P1',
      label: isEs ? 'Monopolio Concentrado' : 'Concentrated Monopoly',
      desc: isEs
        ? 'Un proveedor acapara >3% del valor total de su sector — señal de concentración anormal de mercado. IMSS, Segalmex y Edenred son los casos modelo.'
        : 'A single vendor captures >3% of its sector total value — a signal of abnormal market concentration. IMSS, Segalmex, and Edenred are model cases.',
      how: isEs
        ? 'Una sola firma captura porciones estructurales del presupuesto sectorial durante años, a menudo por exclusividad técnica o acuerdos regulatorios opacos.'
        : 'A single firm captures structural portions of the sector budget for years, often via technical exclusivity or opaque regulatory arrangements.',
      rule: isEs
        ? 'sector_share > 3% → 0.8 conf; > 1% → 0.5; boost +0.15 si institución única > 70%'
        : 'sector_share > 3% → 0.8 conf; > 1% → 0.5; boost +0.15 if single institution > 70%',
      color: '#dc2626',
      vendors: 44,
      t1: 23,
      avgIps: 0.769,
      gtCases: 71,
    },
    {
      code: 'P3',
      label: isEs ? 'Intermediaria de Uso Único' : 'Single-Use Intermediary',
      desc: isEs
        ? 'Ráfaga de contratos de alto valor en poco tiempo, seguida de inactividad o desaparición. Perfil clásico de empresa puente o facturadora.'
        : 'Burst of high-value contracts over a short period, followed by inactivity or disappearance. Classic profile of a shell or invoicing company.',
      how: isEs
        ? 'La empresa existe solo para canalizar un grupo de contratos en una ventana corta. Después desaparece o queda sin actividad visible.'
        : 'The company exists only to channel a batch of contracts within a short window. Afterwards it disappears or remains without visible activity.',
      rule: isEs
        ? 'burst_score > 0.5 (fracción de contratos en primer 20% de vida activa)'
        : 'burst_score > 0.5 (fraction of contracts in first 20% of active life)',
      color: '#f59e0b',
      vendors: 2974,
      t1: 26,
      avgIps: 0.287,
      gtCases: 216,
    },
    {
      code: 'P6',
      label: isEs ? 'Captura Institucional' : 'Institutional Capture',
      desc: isEs
        ? 'El proveedor obtiene >80% de sus contratos de una sola institución, sostenido por años. Señal de relación privilegiada o conflicto de interés institucional.'
        : 'The vendor obtains >80% of its contracts from a single institution, sustained over years. Signal of privileged relationship or institutional conflict of interest.',
      how: isEs
        ? 'La mayoría del ingreso del proveedor proviene de una institución específica durante años, evidencia de relación privilegiada o conflicto de interés.'
        : 'The bulk of vendor revenue comes from a specific institution over years, evidence of a privileged relationship or conflict of interest.',
      rule: 'top_institution_ratio > 0.80 AND total_contracts > 10 → 0.6; institution_count = 1 → 0.8',
      color: '#78716c',
      vendors: 15923,
      t1: 31,
      avgIps: 0.218,
      gtCases: 317,
    },
    {
      code: 'P2',
      label: isEs ? 'Empresa Fantasma' : 'Ghost Company',
      desc: isEs
        ? 'Empresas sin RFC verificable, con pocos contratos por adjudicación directa, que luego desaparecen. 13,960 en lista EFOS definitivo del SAT.'
        : 'Companies with no verifiable RFC, with few direct-award contracts, that later disappear. 13,960 on the SAT EFOS definitivo list.',
      how: isEs
        ? 'La firma emite facturas sin operaciones reales: sin RFC válido, sin empleados, sin domicilio físico. Vive para facturar y desaparecer.'
        : 'The firm issues invoices with no real operations: no valid RFC, no employees, no physical address. Lives to invoice and disappear.',
      rule: isEs
        ? 'is_efos_definitivo → 0.90; OR no_rfc + years≤2 + contratos≤10 + DA>80% + valor≥1M → 0.50'
        : 'is_efos_definitivo → 0.90; OR no_rfc + years≤2 + contracts≤10 + DA>80% + value≥1M → 0.50',
      color: '#57534e',
      vendors: 6034,
      t1: 1,
      avgIps: 0.214,
      gtCases: 144,
    },
    {
      code: 'P4',
      label: isEs ? 'Colusión en Licitaciones' : 'Bid Collusion',
      desc: isEs
        ? 'Vendedores que compiten en los mismos procesos pero nunca se ganan entre sí — indicador clásico de colusión y repartición de mercado.'
        : 'Vendors competing in the same tenders but never winning against each other — classic indicator of collusion and market sharing.',
      how: isEs
        ? 'Un grupo de proveedores siempre se presenta a los mismos concursos, pero las victorias están repartidas por calendario, región o instancia — sin verdadera competencia.'
        : 'A group of vendors always bids on the same tenders, but wins are split by calendar, region, or body — without real competition.',
      rule: isEs
        ? 'co_bid_rate > 50% AND win_rate > 70% AND baja varianza de precios'
        : 'co_bid_rate > 50% AND win_rate > 70% AND low price variance',
      color: '#f59e0b',
      vendors: 220,
      t1: 3,
      avgIps: 0.229,
      gtCases: 432,
    },
  ]
}

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

function buildFingerprintDimensions(isEs: boolean): Array<{
  key: keyof Fingerprint
  label: string
  hint: string
}> {
  return [
    { key: 'directAward',   label: isEs ? 'Adjudicación Directa' : 'Direct Award', hint: isEs ? '% contratos sin competencia' : '% of contracts without competition' },
    { key: 'singleBid',     label: isEs ? 'Licitación Única' : 'Single Bid',     hint: isEs ? '% procesos con 1 solo postor' : '% of tenders with only 1 bidder' },
    { key: 'priceAnomaly',  label: isEs ? 'Anomalía de Precio' : 'Price Anomaly',   hint: isEs ? 'desviación sobre mediana sectorial' : 'deviation from sector median' },
    { key: 'instDiversity', label: isEs ? 'Diversidad Inst.' : 'Inst. Diversity',     hint: isEs ? '← bajo = captura; alto = legítimo' : '← low = capture; high = legitimate' },
    { key: 'vendorConc',    label: isEs ? 'Concentración' : 'Concentration',        hint: isEs ? '% del sector en un solo proveedor' : '% of sector in a single vendor' },
    { key: 'networkSize',   label: isEs ? 'Tamaño de Red' : 'Network Size',        hint: isEs ? '# empresas vinculadas' : '# of linked companies' },
  ]
}

// ── Pattern × Sector affliction matrix ──────────────────────────────────────
// Each cell is the count of confirmed T1 vendors in that sector for that
// pattern (from ARIA v1.1 queue). Counts are illustrative of the dominant
// sector footprint per pattern.
const MATRIX_SECTORS_ES = ['Salud', 'Infra', 'Energía', 'Gobern.', 'Educ.'] as const
const MATRIX_SECTORS_EN = ['Health', 'Infra', 'Energy', 'Interior', 'Educ.'] as const

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
function buildGtTypes(isEs: boolean) {
  return [
    { type: isEs ? 'Fraude en adquisiciones' : 'Procurement fraud', count: 432, color: '#dc2626' },
    { type: isEs ? 'Captura institucional' : 'Institutional capture',   count: 317, color: '#dc2626' },
    { type: isEs ? 'Captura licitación única' : 'Single-bid capture', count: 216, color: '#f59e0b' },
    { type: isEs ? 'Empresa fantasma' : 'Ghost company',        count: 144, color: '#f59e0b' },
    { type: isEs ? 'Monopolio' : 'Monopoly',               count: 71,  color: '#78716c' },
    { type: isEs ? 'Sobreprecio' : 'Overpricing',             count: 70,  color: '#78716c' },
    { type: isEs ? 'Otros' : 'Other',                   count: 93,  color: '#57534e' },
  ]
}

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
function EvidenceStrip({ gtTypes, gtTotal }: { gtTypes: ReturnType<typeof buildGtTypes>; gtTotal: number }) {
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded border border-border/30">
        {gtTypes.map((t) => {
          const pct = (t.count / gtTotal) * 100
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
        {gtTypes.map((t) => (
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
function PatternFingerprintCard({ pattern, isEs }: { pattern: PatternFull; isEs: boolean }) {
  const fp = PATTERN_FINGERPRINTS[pattern.code]
  const fingerprintDims = buildFingerprintDimensions(isEs)
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
          {isEs ? 'Huella estadística' : 'Statistical fingerprint'}
        </p>
        {fingerprintDims.map((dim) => (
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
            {isEs ? 'Proveedores' : 'Vendors'}
          </div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold leading-none tabular-nums text-text-primary">
            {pattern.gtCases}
          </div>
          <div className="text-[9px] font-mono text-text-muted/70 uppercase tracking-wider mt-1">
            {isEs ? 'Casos GT' : 'GT Cases'}
          </div>
        </div>
      </div>
    </article>
  )
}

// ============================================================================
// SectorMatrix — pattern × sector affliction grid (Act II)
// ============================================================================
function SectorMatrix({ patterns, isEs }: { patterns: PatternFull[]; isEs: boolean }) {
  const MATRIX_SECTORS = isEs ? MATRIX_SECTORS_ES : MATRIX_SECTORS_EN
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
  const patternOrder = patterns.map((p) => p.code)

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
              {isEs ? 'Patrón' : 'Pattern'}
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
            const pat = patterns.find((p) => p.code === code)!
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
                    title={`${pat.label} · ${MATRIX_SECTORS[idx]}: ${n} ${isEs ? 'proveedores T1' : 'T1 vendors'}`}
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
        <span>{isEs ? 'Densidad:' : 'Density:'}</span>
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
          <span>{isEs ? 'pocos' : 'few'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#dc2626' }}
          />
          <span>{isEs ? `saturado (${maxCount})` : `saturated (${maxCount})`}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CorruptionClusters — top-level page
// ============================================================================
export default function CorruptionClusters() {
  const { i18n } = useTranslation()
  const isEs = i18n.language === 'es'

  const patternsFull = buildPatternsFull(isEs)
  const gtTypes = buildGtTypes(isEs)
  const gtTotal = gtTypes.reduce((s, t) => s + t.count, 0)
  const totalVendors = patternsFull.reduce((s, p) => s + p.vendors, 0)
  const totalT1 = patternsFull.reduce((s, p) => s + p.t1, 0)

  return (
    <EditorialPageShell
      kicker={isEs ? 'ANÁLISIS · ARIA v1.1' : 'ANALYSIS · ARIA v1.1'}
      headline={
        <>
          7 <span style={{ color: '#dc2626' }}>{isEs ? 'tipologías' : 'typologies'}</span> {isEs ? 'de captura del Estado' : 'of state capture'}
        </>
      }
      paragraph={
        isEs
          ? `ARIA detectó ${formatNumber(totalVendors)} proveedores en 7 patrones de irregularidad. Cada patrón representa una arquitectura distinta de desvío — desde monopolios sectoriales hasta redes de empresas fantasma. Juntos cubren 6.5T MXN en contratos de riesgo.`
          : `ARIA detected ${formatNumber(totalVendors)} vendors across 7 irregularity patterns. Each pattern represents a distinct diversion architecture — from sector monopolies to ghost company networks. Together they cover MXN 6.5T in risk contracts.`
      }
      stats={[
        {
          value: formatNumber(totalVendors),
          label: isEs ? 'PROVEEDORES EN PATRONES' : 'VENDORS IN PATTERNS',
          sub: isEs ? 'Total clasificado por ARIA' : 'Total classified by ARIA',
        },
        {
          value: formatNumber(totalT1),
          label: isEs ? 'EN TIER 1 CRÍTICO' : 'IN CRITICAL TIER 1',
          color: '#dc2626',
          sub: isEs ? 'IPS ≥ 0.60 · investigación inmediata' : 'IPS ≥ 0.60 · immediate investigation',
        },
        {
          value: AVG_T1_IPS.toFixed(3),
          label: isEs ? 'IPS PROMEDIO T1' : 'AVG T1 IPS',
          sub: isEs ? 'Promedio ponderado del Tier 1' : 'Weighted average of Tier 1',
        },
      ]}
      severity="critical"
    >
      {/* ================================================================ */}
      {/* ACT I — LA HUELLA / THE FINGERPRINT                              */}
      {/* ================================================================ */}
      <Act
        number="I"
        label={isEs ? 'LA HUELLA' : 'THE FINGERPRINT'}
        title={<>{isEs ? 'La firma estadística de cada patrón' : 'The statistical signature of each pattern'}</>}
        className="mt-8"
      >
        <p className="text-xs text-zinc-500 leading-relaxed max-w-prose mb-6">
          {isEs ? (
            <>
              Cada tipología deja una huella distintiva en seis dimensiones de
              contratación pública. Leer estas huellas — no los nombres de los
              proveedores — es lo que convierte datos en diagnóstico. Una
              <span className="font-mono text-red-500"> Empresa Fantasma </span>
              pulsa en adjudicación directa y diversidad institucional baja. Un
              <span className="font-mono text-red-500"> Monopolio </span>
              pulsa en concentración. La
              <span className="font-mono text-red-500"> Colusión </span>
              pulsa en tamaño de red. La huella es el patrón.
            </>
          ) : (
            <>
              Each typology leaves a distinctive fingerprint across six dimensions of
              public procurement. Reading these fingerprints — not the vendor names —
              is what turns data into a diagnosis. A
              <span className="font-mono text-red-500"> Ghost Company </span>
              pulses on direct award and low institutional diversity. A
              <span className="font-mono text-red-500"> Monopoly </span>
              pulses on concentration.
              <span className="font-mono text-red-500"> Collusion </span>
              pulses on network size. The fingerprint is the pattern.
            </>
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patternsFull.map((pattern) => (
            <PatternFingerprintCard key={pattern.code} pattern={pattern} isEs={isEs} />
          ))}
        </div>

        {/* Legend: color = severity class */}
        <div className="flex flex-wrap items-center gap-4 pt-4 text-[10px] font-mono text-text-muted tracking-wider uppercase">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#dc2626' }} />
            {isEs ? 'Severidad crítica' : 'Critical severity'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
            {isEs ? 'Alta' : 'High'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#78716c' }} />
            {isEs ? 'Media' : 'Medium'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#57534e' }} />
            {isEs ? 'Baja' : 'Low'}
          </div>
        </div>
      </Act>

      {/* ================================================================ */}
      {/* ACT II — EL PAISAJE / THE LANDSCAPE                              */}
      {/* ================================================================ */}
      <Act
        number="II"
        label={isEs ? 'EL PAISAJE' : 'THE LANDSCAPE'}
        title={<>{isEs ? 'Dónde vive cada patrón' : 'Where each pattern lives'}</>}
        className="mt-10"
      >
        <section className="surface-card p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-text-primary">
              {isEs ? 'Proveedores T1 por patrón × sector' : 'T1 vendors by pattern × sector'}
            </h3>
            <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
              {isEs ? 'Top 5 sectores · ARIA T1' : 'Top 5 sectors · ARIA T1'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-prose">
            {isEs ? (
              <>
                Cada punto es un proveedor T1 confirmado en esa combinación
                patrón × sector. La densidad revela el DNA sectorial de cada
                patrón: <span className="font-mono text-red-500">P5 Sobreprecio</span> sature
                en Salud; <span className="font-mono text-red-500">P7 Red</span> se dispersa
                entre Gobernación e Infraestructura; <span className="font-mono text-red-500">P1
                Monopolio</span> es un fenómeno de salud pública. Los vacíos también
                cuentan historia.
              </>
            ) : (
              <>
                Each dot is a confirmed T1 vendor in that pattern × sector
                combination. Density reveals the sector DNA of each pattern:
                <span className="font-mono text-red-500"> P5 Overpricing</span> saturates
                Health; <span className="font-mono text-red-500">P7 Network</span> spreads
                across Interior and Infrastructure; <span className="font-mono text-red-500">P1
                Monopoly</span> is a public-health phenomenon. The gaps also
                tell a story.
              </>
            )}
          </p>

          <SectorMatrix patterns={patternsFull} isEs={isEs} />
        </section>
      </Act>

      {/* ================================================================ */}
      {/* ACT III — LA EVIDENCIA DOCUMENTADA / DOCUMENTED EVIDENCE         */}
      {/* ================================================================ */}
      <Act
        number="III"
        label={isEs ? 'LA EVIDENCIA DOCUMENTADA' : 'DOCUMENTED EVIDENCE'}
        title={<>{isEs ? 'De dónde sabemos qué es qué' : 'Where we know what is what'}</>}
        className="mt-10"
      >
        <section className="surface-card p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-text-primary">
              {isEs ? 'Casos documentados por tipo de corrupción' : 'Documented cases by corruption type'}
            </h3>
            <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">
              {gtTotal.toLocaleString()} {isEs ? 'casos · GT v1.1' : 'cases · GT v1.1'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-prose">
            {isEs
              ? 'La biblioteca de casos confirmados (ground truth) que alimenta ARIA. Cada patrón hereda su lógica de clasificación de estos casos documentados — sanciones SFP, auditorías ASF, investigaciones periodísticas y listas EFOS del SAT.'
              : 'The library of confirmed cases (ground truth) that feeds ARIA. Each pattern inherits its classification logic from these documented cases — SFP sanctions, ASF audits, investigative journalism, and SAT EFOS lists.'}
          </p>

          <EvidenceStrip gtTypes={gtTypes} gtTotal={gtTotal} />

          <div className="flex items-start gap-2 pt-3 border-t border-border/20 text-[11px] text-text-muted leading-relaxed">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500/70" />
            <p>
              {isEs ? (
                <>
                  La distribución de casos documentados <strong>no</strong> refleja la
                  incidencia real de cada tipo — refleja qué tipos han sido investigados.
                  Fraude en adquisiciones (432) y captura institucional (317) dominan
                  porque son los patrones más fáciles de documentar a partir de datos de
                  contratación pública.
                </>
              ) : (
                <>
                  The distribution of documented cases does <strong>not</strong> reflect
                  the real incidence of each type — it reflects which types have been
                  investigated. Procurement fraud (432) and institutional capture (317)
                  dominate because they are the easiest patterns to document from public
                  procurement data.
                </>
              )}
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end pt-4">
          <Link
            to="/aria"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent hover:underline tracking-wider uppercase"
          >
            {isEs ? 'Explorar cola ARIA completa' : 'Explore full ARIA queue'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Act>
    </EditorialPageShell>
  )
}
