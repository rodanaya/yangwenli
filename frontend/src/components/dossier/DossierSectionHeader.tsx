/**
 * DossierSectionHeader — tight, left-aligned § section header shared across the
 * canonical entity dossiers (vendor + contract). Mono § eyebrow + EB Garamond
 * italic title + sector-tinted hairline rule, with an optional right-aligned
 * mono meta readout.
 *
 * Lifted 2026-06-13 (DESIGNUS "El Cotejo", Day-6) from a local function in
 * VendorDossier.tsx so the contract dossier shares the exact grammar — the
 * cross-dossier-cohesion win. Caller resolves locale (pass already-localized
 * strings); this component is presentation-only.
 */

export function DossierSectionHeader({
  id,
  eyebrow,
  title,
  meta,
  accent,
}: {
  id: string
  eyebrow: string
  title: string
  meta?: string
  accent: string
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 pb-1.5 mb-3.5"
      style={{ borderBottom: `1px solid ${accent}33` }}
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          id={`${id}-eyebrow`}
          className="font-mono flex-shrink-0"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accent,
            fontWeight: 700,
          }}
        >
          § {eyebrow}
        </span>
        <h2
          className="truncate"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 18,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </h2>
      </div>
      {meta && (
        <span
          className="font-mono tabular-nums flex-shrink-0"
          style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
        >
          {meta}
        </span>
      )}
    </div>
  )
}

export default DossierSectionHeader
