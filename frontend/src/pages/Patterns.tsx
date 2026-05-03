/**
 * /patterns — ARIA Investigation Patterns landing page
 *
 * Lists all 7 ARIA patterns (P1–P7) with vendor counts and top-vendor previews.
 * Each card is editorial-weight, not a compact grid tile.
 * Click → /patterns/:code
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { networkApi } from '@/api/client'
import type { PatternSpotlight } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ---------------------------------------------------------------------------
// Hardcoded editorial metadata per pattern
// ---------------------------------------------------------------------------
interface PatternMeta {
  code: string
  nameEn: string
  nameEs: string
  descEn: string
  descEs: string
}

const PATTERN_META: PatternMeta[] = [
  {
    code: 'P1',
    nameEn: 'Monopoly',
    nameEs: 'Monopolio',
    descEn: 'Single vendor captures ≥60% of a regulated market segment over 3+ years.',
    descEs: 'Un proveedor captura ≥60% de un segmento de mercado regulado durante 3+ años.',
  },
  {
    code: 'P2',
    nameEn: 'Ghost Company',
    nameEs: 'Empresa Fantasma',
    descEn: 'Vendor appears in one burst year with no prior/subsequent history. RFC unverifiable.',
    descEs: 'Proveedor aparece en un año de ráfaga sin historia previa/posterior. RFC inverificable.',
  },
  {
    code: 'P3',
    nameEn: 'Intermediary',
    nameEs: 'Intermediario',
    descEn: 'Vendor with zero employees or minimal footprint routes contracts to subcontractors.',
    descEs: 'Proveedor sin empleados o huella mínima que enruta contratos a subcontratistas.',
  },
  {
    code: 'P4',
    nameEn: 'Kickback',
    nameEs: 'Soborno',
    descEn: 'Direct-award concentration to one institution + identical amounts + round numbers.',
    descEs: 'Concentración en adjudicación directa a una institución + montos idénticos + números redondos.',
  },
  {
    code: 'P5',
    nameEn: 'Bid Rotation',
    nameEs: 'Rotación de Ofertas',
    descEn: 'Vendors rotate wins across procedures at the same institution.',
    descEs: 'Proveedores rotan victorias entre procedimientos en la misma institución.',
  },
  {
    code: 'P6',
    nameEn: 'Institutional Capture',
    nameEs: 'Captura Institucional',
    descEn: 'One institution sends ≥70% of its spend to ≤3 vendors over a sexenio.',
    descEs: 'Una institución envía ≥70% de su gasto a ≤3 proveedores durante un sexenio.',
  },
  {
    code: 'P7',
    nameEn: 'Budget Dump',
    nameEs: 'Vaciado de Presupuesto',
    descEn: 'Concentration of contracts in December to exhaust annual budget.',
    descEs: 'Concentración de contratos en diciembre para agotar el presupuesto anual.',
  },
]

// ---------------------------------------------------------------------------
// Pattern Card
// ---------------------------------------------------------------------------
function PatternCard({
  meta,
  spotlight,
  lang,
  onClick,
}: {
  meta: PatternMeta
  spotlight: PatternSpotlight | undefined
  lang: string
  onClick: () => void
}) {
  const isEs = lang === 'es'
  const name = isEs ? meta.nameEs : meta.nameEn
  const desc = isEs ? meta.descEs : meta.descEn

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border border-border rounded-sm p-5 bg-background hover:border-[color:var(--color-risk-critical)] hover:bg-[color:var(--color-accent-glow)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]"
      aria-label={`${meta.code} ${name}`}
    >
      {/* Code badge + name */}
      <div className="flex items-start gap-3 mb-3">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-[11px] font-bold font-mono tracking-wider"
          style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
        >
          {meta.code}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-semibold text-text-primary leading-snug"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {name}
          </h2>
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">{desc}</p>
        </div>
      </div>

      {/* Stats row */}
      {spotlight && (
        <div className="flex items-center gap-5 mb-3 mt-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">
              {isEs ? 'Proveedores' : 'Vendors'}
            </span>
            <span className="text-sm font-mono font-semibold tabular-nums text-text-primary">
              {spotlight.vendor_count.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">T1</span>
            <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: '#dc2626' }}>
              {spotlight.t1_count.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">
              {isEs ? 'Casos GT' : 'GT Cases'}
            </span>
            <span className="text-sm font-mono font-semibold tabular-nums text-text-primary">
              {spotlight.gt_case_count.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Top vendor chips */}
      {spotlight && spotlight.top_vendors.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted mb-1.5">
            {isEs ? 'Proveedores Principales' : 'Top Vendors'}
          </div>
          {spotlight.top_vendors.slice(0, 3).map((v) => (
            <div key={v.vendor_id} onClick={(e) => e.stopPropagation()}>
              <EntityIdentityChip
                type="vendor"
                id={v.vendor_id}
                name={v.vendor_name}
                size="sm"
                riskScore={v.avg_risk_score}
              />
            </div>
          ))}
        </div>
      )}

      {/* No data fallback */}
      {!spotlight && (
        <div className="text-[11px] font-mono text-text-muted mt-1">
          {isEs ? 'Sin datos disponibles' : 'No data available'}
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Patterns() {
  const { i18n } = useTranslation('nav')
  const navigate = useNavigate()
  const isEs = i18n.language === 'es'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pattern-spotlight'],
    queryFn: () => networkApi.getPatternSpotlight(),
    staleTime: 5 * 60 * 1000,
  })

  const spotlightByCode = (data?.patterns ?? []).reduce<Record<string, PatternSpotlight>>(
    (acc, p) => { acc[p.code] = p; return acc },
    {}
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page hero */}
      <header className="mb-8">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-2">
          § {isEs ? 'PATRONES' : 'PATTERNS'}
        </div>
        <h1
          className="text-3xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {isEs ? 'Patrones de Investigación ARIA' : 'ARIA Investigation Patterns'}
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-lg">
          {isEs
            ? 'Siete tipologías de irregularidades de adquisición detectadas por el motor ARIA en 3.1M contratos.'
            : 'Seven procurement irregularity typologies detected by the ARIA engine across 3.1M contracts.'}
        </p>
      </header>

      {/* Loading / error states */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-sm bg-[color:var(--color-sidebar)] animate-pulse border border-border"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-border rounded-sm p-4 text-sm text-text-muted font-mono">
          {isEs ? 'Error cargando patrones.' : 'Error loading patterns.'}
        </div>
      )}

      {/* Pattern list */}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {PATTERN_META.map((meta) => (
            <PatternCard
              key={meta.code}
              meta={meta}
              spotlight={spotlightByCode[meta.code]}
              lang={i18n.language}
              onClick={() => navigate(`/patterns/${meta.code}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
