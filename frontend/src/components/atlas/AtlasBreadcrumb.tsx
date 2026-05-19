/**
 * AtlasBreadcrumb — 32px-tall context strip pinned to the top of the
 * constellation canvas while a cluster is zoomed.
 *
 * "← The Observatory · {Lens} · {Cluster}"
 *
 * The first two crumbs are clickable shortcuts back to the galaxy view.
 * The final crumb is the current location (non-interactive).
 *
 * M-OBS Phase 2: this strip replaces the "where am I?" job that used to be
 * implicit in the right rail's title block.
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
      className="h-8 px-3 flex items-center gap-2 absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/40"
      style={{ letterSpacing: '0.1em' }}
    >
      <button
        type="button"
        onClick={handleGoHome}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoHome(e) }}
        className="font-mono text-[11px] uppercase text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          letterSpacing: '0.1em',
        }}
      >
        ← {observatory}
      </button>
      <span
        className="font-mono text-[11px] uppercase text-text-muted select-none"
        style={{ letterSpacing: '0.1em' }}
      >
        ·
      </span>
      <button
        type="button"
        onClick={handleGoHome}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoHome(e) }}
        className="font-mono text-[11px] uppercase text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          letterSpacing: '0.1em',
        }}
      >
        {lensLabel}
      </button>
      <span
        className="font-mono text-[11px] uppercase text-text-muted select-none"
        style={{ letterSpacing: '0.1em' }}
      >
        ·
      </span>
      <span
        className="font-mono text-[11px] uppercase text-text-primary"
        style={{ letterSpacing: '0.1em' }}
        aria-current="page"
      >
        {clusterLabel}
      </span>
    </nav>
  )
}
