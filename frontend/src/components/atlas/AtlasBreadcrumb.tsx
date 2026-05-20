/**
 * AtlasBreadcrumb — 32px-tall context strip pinned to the top of the
 * constellation canvas while a cluster is zoomed.
 *
 * "← The Observatory · {Lens} · {Cluster}"
 *
 * Only the first crumb ("← The Observatory") is a clickable back link —
 * pops one level to the galaxy view. The lens crumb is contextual label
 * (the user is already viewing this lens, so clicking it would be a no-op
 * disguised as navigation). The cluster crumb is the current location.
 *
 * M-OBS Phase 2: this strip replaces the "where am I?" job that used to be
 * implicit in the right rail's title block.
 * M-OBS Phase 5 (2026-05-20): demoted the lens crumb from button to span
 * so the breadcrumb has exactly one back affordance, not two redundant ones.
 */

interface AtlasBreadcrumbProps {
  lang: 'en' | 'es'
  lensLabel: string
  clusterLabel: string
  onGoHome: () => void
}

export function AtlasBreadcrumb({
  lang,
  lensLabel,
  clusterLabel,
  onGoHome,
}: AtlasBreadcrumbProps) {
  const observatory = lang === 'en' ? 'The Observatory' : 'El Observatorio'

  const handleGoHome = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    onGoHome()
  }

  return (
    <nav
      aria-label={observatory}
      className="h-8 px-3 flex items-center gap-2 absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/40 overflow-hidden whitespace-nowrap"
      style={{ letterSpacing: '0.1em' }}
    >
      <button
        type="button"
        onClick={handleGoHome}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoHome(e) }}
        className="font-mono text-[11px] uppercase text-text-secondary hover:text-text-primary cursor-pointer transition-colors shrink-0"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          letterSpacing: '0.1em',
        }}
      >
        ← {observatory}
      </button>
      {/* Lens crumb hides on the narrowest viewports — the cluster label
          (the current location) is more useful when space is tight. */}
      <span
        className="font-mono text-[11px] uppercase text-text-muted select-none hidden sm:inline shrink-0"
        style={{ letterSpacing: '0.1em' }}
      >
        ·
      </span>
      <span
        className="font-mono text-[11px] uppercase text-text-muted select-none hidden sm:inline shrink-0"
        style={{ letterSpacing: '0.1em' }}
      >
        {lensLabel}
      </span>
      <span
        className="font-mono text-[11px] uppercase text-text-muted select-none shrink-0"
        style={{ letterSpacing: '0.1em' }}
      >
        ·
      </span>
      <span
        className="font-mono text-[11px] uppercase text-text-primary truncate min-w-0"
        style={{ letterSpacing: '0.1em' }}
        aria-current="page"
        title={clusterLabel}
      >
        {clusterLabel}
      </span>
    </nav>
  )
}
