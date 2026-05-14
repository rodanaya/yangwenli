/**
 * /patterns — ARIA Investigation Patterns landing page
 *
 * Editorial folio: opens with a serif italic hero, summarizes the universe of
 * pattern-matched vendors as 3 headline numbers, then ranks the 7 ARIA
 * typologies (P1–P7) by Tier-1 severity with a dot-bar visual rank.
 *
 * Each card → /patterns/:code (dossier). Each card also exposes a direct
 * `/aria?pattern=Pn` link as an investigation pathway into the live queue.
 */
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { networkApi } from '@/api/client'
import type { PatternSpotlight } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS } from '@/lib/constants'

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
// Severity dot-bar — visual rank of t1_count / maxT1
// ---------------------------------------------------------------------------
function SeverityDotBar({ value, max }: { value: number; max: number }) {
  const N = 14
  const filled = max > 0 ? Math.max(1, Math.round((value / max) * N)) : 0
  return (
    <svg
      width={N * 7 - 3}
      height={6}
      viewBox={`0 0 ${N * 7 - 3} 6`}
      aria-hidden="true"
      className="block"
    >
      {Array.from({ length: N }).map((_, i) => (
        <circle
          key={i}
          cx={i * 7 + 3}
          cy={3}
          r={2.4}
          fill={i < filled ? RISK_COLORS.critical : 'currentColor'}
          opacity={i < filled ? 1 : 0.18}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Pattern Card
// ---------------------------------------------------------------------------
function PatternCard({
  meta,
  spotlight,
  lang,
  maxT1,
  onClick,
}: {
  meta: PatternMeta
  spotlight: PatternSpotlight | undefined
  lang: string
  maxT1: number
  onClick: () => void
}) {
  const isEs = lang === 'es'
  const name = isEs ? meta.nameEs : meta.nameEn
  const desc = isEs ? meta.descEs : meta.descEn
  const t1 = spotlight?.t1_count ?? 0

  // Left-border thickness scales with severity: 1px floor, up to 4px for the most severe
  const borderThickness = maxT1 > 0 ? 1 + Math.round((t1 / maxT1) * 3) : 1

  return (
    <div
      className="group relative border border-border rounded-sm bg-background hover:border-[color:var(--color-risk-critical)] hover:bg-[color:var(--color-accent-glow)] transition-all duration-150"
      style={{ borderLeftWidth: `${borderThickness}px`, borderLeftColor: RISK_COLORS.critical }}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left p-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)] rounded-sm"
        aria-label={`${meta.code} ${name}`}
      >
        {/* Code badge + name + severity rank */}
        <div className="flex items-start gap-3 mb-3">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-[11px] font-bold font-mono tracking-wider"
            style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: RISK_COLORS.critical }}
          >
            {meta.code}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold text-text-primary leading-snug"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {name}
              </h2>
              {spotlight && (
                <div className="flex items-center gap-2 flex-shrink-0 text-text-muted">
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em]">
                    {isEs ? 'Severidad' : 'Severity'}
                  </span>
                  <SeverityDotBar value={t1} max={maxT1} />
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-text-secondary leading-relaxed">{desc}</p>
          </div>
        </div>

        {/* Stats row — 4 columns: Vendors / T1 / GT / Avg IPS */}
        {spotlight && (
          <div className="flex items-center gap-6 mb-3 mt-3">
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
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{ color: RISK_COLORS.critical }}
              >
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
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">
                {isEs ? 'IPS Prom.' : 'Avg IPS'}
              </span>
              <span className="text-sm font-mono font-semibold tabular-nums text-text-primary">
                {spotlight.avg_ips != null ? spotlight.avg_ips.toFixed(2) : '—'}
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
                  sectorCode={v.primary_sector_name ?? null}
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

      {/* Investigation pathway — outside the button to avoid nested click */}
      {spotlight && (
        <div className="px-5 pb-4 -mt-1 flex items-center justify-end">
          <Link
            to={`/aria?pattern=${meta.code}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-[color:var(--color-accent)] transition-colors"
          >
            <ArrowUpRight className="h-3 w-3" />
            {isEs ? 'Ver en cola ARIA' : 'View in ARIA queue'}
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Headline number — Playfair-italic anchor stat used in the summary bar
// ---------------------------------------------------------------------------
function HeadlineStat({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-3xl md:text-4xl font-bold italic tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-family-serif)',
          color: color ?? 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Patterns() {
  const { i18n } = useTranslation('nav')
  const navigate = useNavigate()
  const isEs = i18n.language.startsWith('es')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pattern-spotlight'],
    queryFn: () => networkApi.getPatternSpotlight(),
    staleTime: 5 * 60 * 1000,
  })

  const patterns = data?.patterns ?? []
  const spotlightByCode = patterns.reduce<Record<string, PatternSpotlight>>(
    (acc, p) => { acc[p.code] = p; return acc },
    {}
  )

  // Aggregate totals across all 7 patterns
  const totalVendors = patterns.reduce((sum, p) => sum + (p.vendor_count ?? 0), 0)
  const totalT1 = patterns.reduce((sum, p) => sum + (p.t1_count ?? 0), 0)
  const totalGtCases = patterns.reduce((sum, p) => sum + (p.gt_case_count ?? 0), 0)
  const maxT1 = patterns.reduce((m, p) => Math.max(m, p.t1_count ?? 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Editorial folio header */}
      <header className="mb-8">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          § {isEs ? 'PATRONES · ARIA' : 'PATTERNS · ARIA'}
        </div>
        <h1
          className="text-4xl md:text-5xl font-semibold italic text-text-primary leading-[1.05] tracking-tight"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {isEs
            ? 'Siete formas en que desaparece el dinero público.'
            : 'Seven ways public money disappears.'}
        </h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed max-w-lg">
          {isEs
            ? 'Tipologías de irregularidad detectadas por el motor ARIA en 3.1 millones de contratos federales. Cada patrón es una pregunta de investigación, no una sentencia.'
            : 'Irregularity typologies detected by the ARIA engine across 3.1 million federal contracts. Each pattern is an investigative question, not a verdict.'}
        </p>
      </header>

      {/* Summary stat bar — universe of pattern-matched vendors */}
      {!isLoading && !isError && patterns.length > 0 && (
        <section
          className="mb-8 pb-6 border-b border-border"
          aria-label={isEs ? 'Resumen de patrones' : 'Pattern summary'}
        >
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-4">
            {isEs ? 'El universo' : 'The universe'}
          </div>
          <div className="grid grid-cols-3 gap-5">
            <HeadlineStat
              value={totalVendors.toLocaleString()}
              label={isEs ? 'Proveedores marcados' : 'Vendors flagged'}
            />
            <HeadlineStat
              value={totalT1.toLocaleString()}
              label={isEs ? 'En Tier 1' : 'In Tier 1'}
              color={RISK_COLORS.critical}
            />
            <HeadlineStat
              value={totalGtCases.toLocaleString()}
              label={isEs ? 'Casos GT vinculados' : 'GT cases linked'}
            />
          </div>
          <p className="mt-4 text-[11px] text-text-muted leading-relaxed">
            {isEs
              ? 'Conteos brutos sobre los 7 patrones. Un proveedor puede aparecer en varios.'
              : 'Raw counts across all 7 patterns. A vendor can appear in more than one.'}
          </p>
        </section>
      )}

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
        <>
          <div className="space-y-3">
            {PATTERN_META.map((meta) => (
              <PatternCard
                key={meta.code}
                meta={meta}
                spotlight={spotlightByCode[meta.code]}
                lang={i18n.language}
                maxT1={maxT1}
                onClick={() => navigate(`/patterns/${meta.code}`)}
              />
            ))}
          </div>

          {/* Cross-pattern editorial footnote */}
          <footer className="mt-8 pt-5 border-t border-border">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted mb-2">
              {isEs ? 'Nota metodológica' : 'Methodological note'}
            </p>
            <p
              className="text-sm italic leading-relaxed text-text-secondary"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {isEs
                ? 'Un proveedor puede coincidir con varios patrones a la vez. Muchos T1 cumplen 2 o más simultáneamente — esos cruces son donde las investigaciones suelen empezar.'
                : 'A vendor can match multiple patterns simultaneously. Many T1 vendors satisfy two or more at once — those intersections are where investigations usually begin.'}
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
