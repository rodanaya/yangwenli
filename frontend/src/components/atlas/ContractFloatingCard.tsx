/**
 * ContractFloatingCard — Atlas P6 Frontier C.
 *
 * Rendered when a contract dot in a vendor's planetary orbit is clicked.
 * Sibling to ClusterFloatingCard / CanvasVendorHaloCard — same visual idiom
 * (Playfair anchor + mono kicker + sector-accent left border), but
 * scoped to a single contract: title, institution, amount, risk, procedure.
 *
 * The card pins to the top-right of the Observatory viewport (where the
 * cluster card would sit during cluster-zoom) so it never sits on top of the
 * orbiting dots. Caller owns positioning via `style` overrides if needed; the
 * default sits below the breadcrumb strip.
 *
 * "View full contract →" links to `/contracts/{id}` (route already exists in
 * App.tsx — see Contracts.tsx l.1535 / Executive.tsx l.1982 for parity).
 *
 * Inline drill-chain (2026-08): the institution row is now a link
 * (`onViewInstitution`) and, when related vendors at the same institution
 * are available, a chip row lets the user jump the planetary-mode focus to
 * one of them (`onSelectVendor`) without leaving /atlas — see Atlas.tsx
 * `jumpToRelatedVendor`.
 */

import { useNavigate } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import type { VendorContractDot } from '@/lib/atlas/use-vendor-contracts'
import type { RelatedVendor } from '@/lib/atlas/use-institution-vendors'

interface ContractFloatingCardProps {
  contract: VendorContractDot
  vendorAccentColor?: string
  onClose: () => void
  lang: 'en' | 'es'
  /** Related vendors at the contract's institution — jump the orbit to one. */
  relatedVendors?: RelatedVendor[]
  onSelectVendor?: (vendor: { id: number; name: string }) => void
  /** Navigate to the full institution dossier (escape hatch — institutions aren't graph nodes here). */
  onViewInstitution?: () => void
}

const COPY = {
  en: {
    eyebrow: 'CONTRACT',
    risk: 'RISK',
    da: 'DIRECT AWARD',
    sb: 'SINGLE BID',
    institution: 'Institution',
    amount: 'Amount',
    date: 'Date',
    procedure: 'Procedure',
    view: 'View full contract',
    close: 'Close contract card',
    untitled: 'Untitled contract',
    unknownInst: 'Institution not recorded',
    unknownAmount: 'Amount unavailable',
    unknownDate: 'Date unavailable',
    unknownProc: 'Procedure unavailable',
    otherVendors: 'Other vendors here',
  },
  es: {
    eyebrow: 'CONTRATO',
    risk: 'RIESGO',
    da: 'ADJ. DIRECTA',
    sb: 'OFERTA ÚNICA',
    institution: 'Institución',
    amount: 'Monto',
    date: 'Fecha',
    procedure: 'Procedimiento',
    view: 'Ver contrato completo',
    close: 'Cerrar tarjeta de contrato',
    untitled: 'Contrato sin título',
    unknownInst: 'Institución no registrada',
    unknownAmount: 'Monto no disponible',
    unknownDate: 'Fecha no disponible',
    unknownProc: 'Procedimiento no disponible',
    otherVendors: 'Otros proveedores aquí',
  },
} as const

const RISK_LABEL: Record<'critical' | 'high' | 'medium' | 'low', { en: string; es: string }> = {
  critical: { en: 'CRIT', es: 'CRÍT' },
  high:     { en: 'HIGH', es: 'ALTO' },
  medium:   { en: 'MED',  es: 'MED'  },
  low:      { en: 'LOW',  es: 'BAJO' },
}

function formatDate(iso: string | null, lang: 'en' | 'es'): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function ContractFloatingCard({
  contract,
  vendorAccentColor,
  onClose,
  lang,
  relatedVendors,
  onSelectVendor,
  onViewInstitution,
}: ContractFloatingCardProps) {
  const navigate = useNavigate()
  const t = COPY[lang]

  const rs = contract.riskScore
  const level = contract.riskLevel ?? (rs !== null ? getRiskLevelFromScore(rs) : null)
  const riskColor = level ? RISK_COLORS[level] : 'var(--color-text-muted)'
  const accent = vendorAccentColor ?? (level ? RISK_COLORS[level] : 'var(--color-border)')
  const pct = rs !== null ? Math.round(rs * 100) : null
  const riskLabel = level ? RISK_LABEL[level][lang] : null

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/contracts/${contract.id}`)
  }
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const dateLabel = formatDate(contract.contractDate, lang)
  const amountLabel = contract.amount !== null && contract.amount > 0
    ? formatCompactMXN(contract.amount)
    : t.unknownAmount

  return (
    <div
      role="dialog"
      aria-label={contract.title ?? t.untitled}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: 296,
        background: 'var(--color-background-card)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 2,
        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        padding: '10px 12px 12px',
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 13,
            letterSpacing: '0.14em',
            color: 'var(--color-text-muted)',
          }}
        >
          {t.eyebrow} · #{contract.id}
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.close}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            lineHeight: 0,
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-1"
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'normal',
          fontWeight: 600,
          fontSize: 15,
          lineHeight: 1.2,
          color: 'var(--color-text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
        title={contract.title ?? undefined}
      >
        {contract.title ?? t.untitled}
      </div>

      {/* Risk row */}
      {pct !== null && riskLabel && (
        <div className="flex items-center gap-2 mt-2">
          <span
            className="font-mono"
            style={{
              fontSize: 13,
              letterSpacing: '0.12em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {t.risk}
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 13, color: riskColor, fontWeight: 700 }}
          >
            {pct}%
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 13, letterSpacing: '0.1em', color: riskColor, fontWeight: 700 }}
          >
            {riskLabel}
          </span>
          {contract.isDirectAward && (
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 8,
                letterSpacing: '0.1em',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            >
              {t.da}
            </span>
          )}
          {contract.isSingleBid && (
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 8,
                letterSpacing: '0.1em',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            >
              {t.sb}
            </span>
          )}
        </div>
      )}

      {/* Meta grid */}
      <dl
        className="mt-2.5"
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}
      >
        <dt
          className="font-mono uppercase"
          style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
        >
          {t.amount}
        </dt>
        <dd
          className="font-mono tabular-nums"
          style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {amountLabel}
        </dd>

        <dt
          className="font-mono uppercase"
          style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
        >
          {t.institution}
        </dt>
        <dd
          style={{
            fontSize: 13,
            color: onViewInstitution && contract.institutionId ? 'var(--color-accent)' : 'var(--color-text-primary)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
          title={contract.institutionName ?? undefined}
        >
          {onViewInstitution && contract.institutionId ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewInstitution() }}
              className="hover:underline text-left"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
            >
              {contract.institutionName ?? t.unknownInst}
            </button>
          ) : (
            contract.institutionName ?? t.unknownInst
          )}
        </dd>

        <dt
          className="font-mono uppercase"
          style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
        >
          {t.date}
        </dt>
        <dd
          className="font-mono tabular-nums"
          style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {dateLabel ?? t.unknownDate}
        </dd>

        <dt
          className="font-mono uppercase"
          style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
        >
          {t.procedure}
        </dt>
        <dd
          style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}
          title={contract.procedureType ?? undefined}
        >
          {contract.procedureType ?? t.unknownProc}
        </dd>
      </dl>

      {relatedVendors && relatedVendors.length > 0 && onSelectVendor && (
        <div className="mt-3">
          <div
            className="font-mono uppercase"
            style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            {t.otherVendors}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relatedVendors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectVendor({ id: v.id, name: v.name }) }}
                className="hover:underline transition-colors"
                title={formatVendorName(v.name, 80)}
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 2,
                  padding: '2px 6px',
                  cursor: 'pointer',
                }}
              >
                {formatVendorName(v.name, 22)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleView}
        className="inline-flex items-center gap-1 font-mono uppercase mt-3 hover:underline transition-colors"
        style={{
          color: 'var(--color-accent)',
          fontSize: 12,
          letterSpacing: '0.12em',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {t.view}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}

export default ContractFloatingCard
