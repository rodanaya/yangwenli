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
              ? 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/70 text-red-300 border border-red-700 shrink-0'
              : 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800 shrink-0'
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
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-950/60 text-orange-300 border border-orange-700 shrink-0"
          title="Sanctioned by SFP (Secretaría de la Función Pública)"
          aria-label="SFP sanctioned"
        >
          SFP
        </span>
      )}
    </>
  )
}
