/**
 * SubSectionTitle — tier-2 editorial header inside a dossier tab.
 *
 * Sits below DossierSectionHeader (tier-1, EB Garamond title) but above
 * data rows. A subtle top hairline rule + mono § eyebrow with an amber accent
 * dot + an optional right-aligned mono meta string (counts like "10 contratos").
 *
 * The accent dot uses var(--color-accent) (warm amber) — SubSectionTitle is a
 * shared primitive, not per-sector, so it never reads the sector palette.
 */
export function SubSectionTitle({
  id,
  children,
  meta,
  className,
}: {
  id: string
  children: React.ReactNode
  meta?: string
  className?: string
}) {
  return (
    <div
      id={id}
      className={className}
      style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, marginBottom: 8 }}
      role="heading"
      aria-level={3}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--color-accent)', flexShrink: 0 }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
            }}
          >
            {children}
          </span>
        </div>
        {meta && (
          <span
            className="font-mono tabular-nums flex-shrink-0"
            style={{ fontSize: 12, letterSpacing: '0.06em', color: 'var(--color-text-muted)', opacity: 0.7 }}
          >
            {meta}
          </span>
        )}
      </div>
    </div>
  )
}
