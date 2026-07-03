/**
 * VendorBadge — compact watchlist status badges for vendor rows.
 *
 * EFOS  = SAT tax authority ghost company registry (sat_efos_vendors)
 * SFP   = Secretaría de la Función Pública sanctions list (sfp_sanctions)
 *
 * Usage:
 *   <VendorBadge isEfos efosStage="definitivo" />
 *   <VendorBadge isSfp />
 */

interface VendorBadgeProps {
  isEfos?: boolean
  /** EFOS stage from sat_efos_vendors.stage — "definitivo" | "desvirtuado" | other */
  efosStage?: string | null
  isSfp?: boolean
}

export function VendorBadge({ isEfos, efosStage, isSfp }: VendorBadgeProps) {
  if (!isEfos && !isSfp) return null

  const definitivo = efosStage === 'definitivo'

  return (
    <>
      {isEfos && (
        <span
          className={
            definitivo
              ? 'inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-semibold bg-risk-critical/15 text-risk-critical border border-risk-critical/40 shrink-0'
              : 'inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-semibold bg-risk-high/10 text-accent border border-risk-high/40 shrink-0'
          }
          title={
            definitivo
              ? 'Empresa en el listado definitivo EFOS (SAT — Art. 69-B CFF)'
              : 'Empresa en el listado EFOS (SAT) — stage: ' + (efosStage ?? 'desconocido')
          }
          aria-label={definitivo ? 'EFOS definitivo' : 'EFOS provisional'}
        >
          EFOS
        </span>
      )}
      {isSfp && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-semibold bg-risk-high/10 text-risk-high border border-risk-high/30 shrink-0"
          title="Sanctioned by SFP (Secretaría de la Función Pública)"
          aria-label="SFP sanctioned"
        >
          SFP
        </span>
      )}
    </>
  )
}
