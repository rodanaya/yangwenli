/**
 * VendorHero — compact identity + verdict + evidence block.
 *
 * Replaces the 13 stacked pre-tab blocks of the old VendorProfile (5 alert
 * banners, dossier strip, hero, metadata strip, name variants,
 * PlainLanguageRiskCard, consolidated flags, KPI grid, co-bidding alert).
 *
 * Section order: identity line → priority alerts → verdict → stat row →
 * top-3 model drivers.
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  Check,
  Building2,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  VendorDetailResponse,
  VendorSHAPResponse,
} from '@/api/types'
import {
  GradeBadge10,
  type VendorScorecardData,
} from '@/components/ui/ScorecardWidgets'
import {
  PriorityAlert,
  type PriorityFlag,
} from '@/components/ui/PriorityAlert'
import { StatRow } from '@/components/ui/StatRow'
import { DotBarRow } from '@/components/ui/DotBar'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS } from '@/lib/constants'
import {
  formatCompactMXN,
  formatPercentSafe,
  getRiskLevel,
} from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { parseFactorLabel } from '@/lib/risk-factors'

interface VendorHeroProps {
  vendor: VendorDetailResponse
  scorecard?: VendorScorecardData | null
  flags: PriorityFlag[]
  shap?: VendorSHAPResponse | null
  /** Right-aligned action buttons (watchlist, share, export, etc.) */
  actions?: ReactNode
  /** ARIA investigation queue tier (1=critical, 4=low), per docs/VENDOR_DOSSIER_SCHEME.md § 0 */
  ariaTier?: 1 | 2 | 3 | 4 | null
}

export function VendorHero({
  vendor,
  scorecard,
  flags,
  shap,
  actions,
  ariaTier,
}: VendorHeroProps) {
  const { t, i18n } = useTranslation(['vendors', 'common'])
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [rfcCopied, setRfcCopied] = useState(false)

  const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorColor = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros
  const sectorTextColor = SECTOR_TEXT_COLORS[sectorCode] ?? SECTOR_TEXT_COLORS.otros
  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const nameVariants = (vendor.name_variants ?? []).filter(
    (v) => v.variant_name && v.variant_name !== vendor.name
  )

  async function copyRfc() {
    if (!vendor.rfc) return
    try {
      await navigator.clipboard.writeText(vendor.rfc)
      setRfcCopied(true)
      setTimeout(() => setRfcCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const topDrivers = (shap?.top_risk_factors ?? []).slice(0, 3)
  const maxDriver = topDrivers.reduce(
    (m, d) => Math.max(m, Math.abs(d.shap)),
    0.001
  )

  const isEs = i18n.language.startsWith('es')

  const dateStamp = useMemo(() => {
    const d = new Date()
    return `${d.getUTCFullYear()}·${String(d.getUTCMonth() + 1).padStart(2, '0')}·${String(d.getUTCDate()).padStart(2, '0')}`
  }, [])

  const verdict = getVerdictSentence(riskLevel, vendor, isEs)

  return (
    <header className="space-y-5 pb-7 border-b border-border/50 mb-6">
      {/* ─── Row 1: identity + actions ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* ── V1: folio hero eyebrow (IBM Plex Mono archival index strip) ── */}
          <div
            className="flex items-center gap-3 mb-2"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>Folio·D</span>
            <span style={{ width: 24, height: 1, background: 'rgba(160, 104, 32, 0.45)', display: 'inline-block' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {isEs ? 'Expediente del proveedor' : 'Vendor dossier'}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ opacity: 0.7 }}>
              {isEs ? 'Indexado' : 'Indexed'} {dateStamp}
            </span>
          </div>
          {/* EB Garamond italic 500 — vendor name is the headline proper noun */}
          <h1
            className="text-balance mb-1"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.04,
              letterSpacing: '-0.012em',
              color: 'var(--color-text-primary)',
            }}
          >
            {formatVendorName(vendor.name)}
          </h1>
          <IdentityLine
            vendor={vendor}
            sectorCode={sectorCode}
            sectorColor={sectorColor}
            sectorTextColor={sectorTextColor}
            scorecard={scorecard}
            rfcCopied={rfcCopied}
            onCopyRfc={copyRfc}
            isEs={isEs}
          />
          {nameVariants.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setVariantsOpen((o) => !o)}
                aria-expanded={variantsOpen}
                aria-controls="vendor-name-variants"
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
              >
                {variantsOpen ? (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                )}
                {/* Pluralized — Spanish never uses (s); English uses singular for n=1 */}
                {isEs
                  ? `${nameVariants.length} ${nameVariants.length === 1 ? 'variante del nombre' : 'variantes del nombre'}`
                  : `${nameVariants.length} ${nameVariants.length === 1 ? 'name variant' : 'name variants'}`}
              </button>
              {variantsOpen && (
                <ul
                  id="vendor-name-variants"
                  className="mt-1.5 ml-4 text-[11px] text-text-secondary space-y-0.5 list-disc"
                >
                  {nameVariants.slice(0, 8).map((v, i) => (
                    <li key={i}>{v.variant_name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* ─── Row 2: PriorityAlert reframed as marginal note (V2) ──────────
          Left ochre 2px rule + italic mono kicker. PriorityAlert component
          itself is not modified — this is a wrapper-only editorial reframe
          per docs/FOLIO_V1_PHASE1_2026_05_06.md §5. */}
      {flags.length > 0 && (
        <aside
          aria-labelledby="vendor-marginal-note"
          style={{
            borderLeft: '2px solid var(--color-accent)',
            paddingLeft: '14px',
            paddingTop: '6px',
            paddingBottom: '6px',
            marginTop: '4px',
            marginBottom: '4px',
          }}
        >
          <p
            id="vendor-marginal-note"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '9.5px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              fontWeight: 500,
              fontStyle: 'italic',
              marginBottom: '6px',
            }}
          >
            {isEs ? 'Nota al margen' : 'Marginal note'}
          </p>
          <PriorityAlert flags={flags} />
        </aside>
      )}

      {/* ─── Row 3: verdict sentence + investigation CTA ─────────────────── */}
      {/* V3: EB Garamond regular 17px / 1.55 / max-width 68ch per plan §1.b */}
      {verdict && (
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: '17px',
            lineHeight: 1.55,
            maxWidth: '68ch',
            color: 'var(--color-text-secondary, var(--color-text-muted))',
            letterSpacing: '0.005em',
          }}
        >
          {verdict}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to={`/thread/${vendor.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-sm"
        >
          <GitBranch className="h-3 w-3" aria-hidden="true" />
          {isEs ? 'Hilo de Investigación →' : 'Build Investigation Thread →'}
        </Link>
        <Link
          to={`/aria?vendor_id=${vendor.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors border border-border/40 hover:border-border px-2.5 py-1 rounded-sm"
        >
          {isEs ? 'Cola ARIA' : 'ARIA Queue'}
          {ariaTier != null && (
            <span
              className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase"
              style={{
                background: ariaTier === 1 ? 'rgba(239,68,68,0.15)' : ariaTier === 2 ? 'rgba(245,158,11,0.15)' : ariaTier === 3 ? 'rgba(161,98,7,0.12)' : 'rgba(113,113,122,0.12)',
                color: ariaTier === 1 ? 'var(--color-risk-critical)' : ariaTier === 2 ? 'var(--color-risk-high)' : ariaTier === 3 ? 'var(--color-risk-medium)' : 'var(--color-text-muted)',
              }}
            >
              T{ariaTier}
            </span>
          )}
        </Link>
      </div>

      {/* ─── Row 4: stat row ─────────────────────────────────────────────── */}
      <StatRow
        stats={[
          {
            label: isEs ? 'Contratos' : 'Contracts',
            value: vendor.total_contracts,
          },
          {
            label: isEs ? 'Valor total' : 'Total value',
            value: formatCompactMXN(vendor.total_value_mxn),
          },
          {
            label: isEs ? 'Adj. directas' : 'Direct awards',
            value: formatPercentSafe(
              vendor.direct_award_rate_corrected ?? vendor.direct_award_pct,
              false,
              0
            ),
          },
          {
            label: isEs ? 'Instituciones' : 'Institutions',
            value: vendor.total_institutions,
          },
        ]}
      />

      {/* ─── Row 5: top-3 drivers ────────────────────────────────────────── */}
      {topDrivers.length > 0 && (
        <section aria-labelledby="vendor-drivers-title">
          <h2
            id="vendor-drivers-title"
            className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-3"
          >
            {isEs ? 'Por qué este proveedor está marcado' : 'Why this vendor flagged'}
          </h2>
          <div className="grid sm:grid-cols-3 gap-x-6 gap-y-3">
            {topDrivers.map((d) => {
              const label = isEs ? d.label_es : parseFactorLabel(d.factor).label
              return (
                <DotBarRow
                  key={d.factor}
                  label={label || d.factor}
                  readout={
                    d.shap >= 0 ? `+${d.shap.toFixed(2)}` : d.shap.toFixed(2)
                  }
                  value={Math.abs(d.shap)}
                  max={maxDriver}
                  color="var(--color-risk-critical)"
                />
              )
            })}
          </div>
        </section>
      )}
      {/* Fallback: t() reserved for future inline copy that needs i18n. */}
      {false && <span aria-hidden>{t('vendors:tabs.overview')}</span>}
    </header>
  )
}

// ───────────────────────────── subcomponents ──────────────────────────────
function IdentityLine({
  vendor,
  sectorCode,
  sectorColor,
  sectorTextColor,
  scorecard,
  rfcCopied,
  onCopyRfc,
  isEs,
}: {
  vendor: VendorDetailResponse
  sectorCode: string
  sectorColor: string
  sectorTextColor: string
  scorecard?: VendorScorecardData | null
  rfcCopied: boolean
  onCopyRfc: () => void
  isEs: boolean
}) {
  const spanYears =
    vendor.first_contract_year && vendor.last_contract_year
      ? `${vendor.first_contract_year}–${vendor.last_contract_year}`
      : `${vendor.years_active ?? 0} ${isEs ? 'años' : 'yrs'}`

  return (
    <div className="flex items-center gap-3 flex-wrap text-[13px] text-text-secondary">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[11px] font-medium"
        style={{
          backgroundColor: `${sectorColor}15`,
          borderColor: `${sectorColor}50`,
          color: sectorTextColor,
        }}
      >
        <Building2 className="h-3 w-3" />
        {sectorCode.charAt(0).toUpperCase() + sectorCode.slice(1)}
      </span>

      <span className="font-mono tabular-nums text-text-muted">
        {spanYears}
      </span>

      {vendor.rfc && (
        <button
          type="button"
          onClick={onCopyRfc}
          className="inline-flex items-center gap-1 font-mono tabular-nums text-text-muted hover:text-text-primary transition-colors"
          aria-label={isEs ? 'Copiar RFC' : 'Copy RFC'}
          title={isEs ? 'Copiar RFC' : 'Copy RFC'}
        >
          <span>{vendor.rfc}</span>
          {rfcCopied ? (
            <Check className="h-3 w-3 text-text-muted" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3 opacity-60" aria-hidden="true" />
          )}
        </button>
      )}

      {vendor.industry_name && (
        <span className="text-text-muted">· {vendor.industry_name}</span>
      )}

      {scorecard && (
        // No nested /vendors/:id/report-card route exists — render the badge
        // statically (was a Link → 404 risk, blocker per functional audit).
        <span
          className="inline-flex items-center gap-1.5 text-[11px] text-text-muted"
          title={isEs ? 'Libreta de Integridad' : 'Integrity Score'}
        >
          <GradeBadge10 grade={scorecard.grade} size="sm" />
        </span>
      )}
    </div>
  )
}

function getVerdictSentence(
  level: 'critical' | 'high' | 'medium' | 'low',
  vendor: VendorDetailResponse,
  isEs: boolean
): string {
  const name = formatVendorName(vendor.name)
  if (isEs) {
    if (level === 'critical')
      return `Los patrones de contratación de ${name} coinciden fuertemente con casos de corrupción documentados. Indicador estadístico, no prueba de irregularidades.`
    if (level === 'high')
      return `${name} muestra patrones de contratación con fuerte similitud a casos de corrupción conocidos. Requiere revisión prioritaria.`
    if (level === 'medium')
      return `${name} presenta algunas anomalías en sus patrones de contratación comparado con el baseline sectorial.`
    return `${name} no muestra anomalías significativas en sus patrones de contratación.`
  }
  if (level === 'critical')
    return `${name}'s procurement patterns closely match documented corruption cases. Statistical indicator — not proof of wrongdoing.`
  if (level === 'high')
    return `${name} shows procurement patterns with strong similarity to known corruption cases. Priority review recommended.`
  if (level === 'medium')
    return `${name} shows some anomalies in its procurement patterns relative to the sector baseline.`
  return `${name} shows few anomalies relative to the sector baseline.`
}
