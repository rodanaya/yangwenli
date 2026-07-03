import * as React from 'react'

export interface ClusterPaginatorProps {
  clusters: Array<{ code: string; color: string; label: string }>
  pinnedCode: string | null
  onJumpToCluster: (code: string) => void
  lang: 'en' | 'es'
}

export function ClusterPaginator({
  clusters,
  pinnedCode,
  onJumpToCluster,
  lang,
}: ClusterPaginatorProps): React.ReactElement | null {
  const idx = clusters.findIndex(c => c.code === pinnedCode)
  if (idx < 0) return null

  const prev = clusters[(idx - 1 + clusters.length) % clusters.length]
  const next = clusters[(idx + 1) % clusters.length]

  const prevAriaLabel =
    lang === 'en'
      ? `Previous cluster: ${prev.label}`
      : `Clúster anterior: ${prev.label}`
  const nextAriaLabel =
    lang === 'en'
      ? `Next cluster: ${next.label}`
      : `Próximo clúster: ${next.label}`
  const navAriaLabel =
    lang === 'en' ? 'Cluster navigation' : 'Navegación entre clústeres'

  return (
    <div
      className="absolute z-30 left-1/2 -translate-x-1/2 bottom-14 flex items-center gap-3 px-3 py-2"
      style={{
        background: 'var(--color-background-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 999,
        fontSize: 13,
        fontFamily: 'monospace',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
      role="navigation"
      aria-label={navAriaLabel}
    >
      <button
        type="button"
        onClick={() => onJumpToCluster(prev.code)}
        className="hover:opacity-80 transition-opacity"
        style={{ color: prev.color, fontWeight: 600 }}
        aria-label={prevAriaLabel}
      >
        ‹ {prev.code}
      </button>

      <div className="flex items-center gap-1.5">
        {clusters.map(c => (
          <button
            key={c.code}
            type="button"
            onClick={() => onJumpToCluster(c.code)}
            aria-label={c.label}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: c.code === pinnedCode ? c.color : 'transparent',
              border: `1.5px solid ${c.color}`,
              cursor: 'pointer',
              padding: 0,
            }}
            className="hover:scale-110 transition-transform"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onJumpToCluster(next.code)}
        className="hover:opacity-80 transition-opacity"
        style={{ color: next.color, fontWeight: 600 }}
        aria-label={nextAriaLabel}
      >
        {next.code} ›
      </button>
    </div>
  )
}
