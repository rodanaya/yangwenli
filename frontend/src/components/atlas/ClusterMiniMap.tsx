import * as React from 'react'

export interface ClusterMiniMapProps {
  clusters: Array<{ code: string; fx: number; fy: number; color: string; label: string }>
  pinnedCode: string | null
  onJumpToCluster: (code: string) => void
  lang: 'en' | 'es'
}

export function ClusterMiniMap({
  clusters,
  pinnedCode,
  onJumpToCluster,
  lang,
}: ClusterMiniMapProps): React.ReactElement {
  const ariaLabel =
    lang === 'en'
      ? 'Cluster mini-map for navigation'
      : 'Mini-mapa de clústeres para navegación'

  return (
    <div
      className="absolute z-20"
      style={{
        top: 56,
        right: 16,
        background: 'var(--color-background-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: 6,
      }}
    >
      <svg
        width={110}
        height={80}
        viewBox="0 0 110 80"
        role="img"
        aria-label={ariaLabel}
      >
        <style>{`@keyframes cluster-mini-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>
        <rect
          x={1}
          y={1}
          width={108}
          height={78}
          fill="none"
          stroke="var(--color-border)"
        />
        {clusters.map(c => {
          const cx = c.fx * 110
          const cy = c.fy * 80
          const isPinned = c.code === pinnedCode
          return (
            <g
              key={c.code}
              onClick={() => onJumpToCluster(c.code)}
              style={{ cursor: 'pointer' }}
            >
              <title>{c.code} · {c.label}</title>
              {isPinned && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="none"
                  stroke={c.color}
                  strokeWidth={1.5}
                  style={{ animation: 'cluster-mini-pulse 2s ease-in-out infinite' }}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isPinned ? 4 : 3}
                fill={c.color}
              />
            </g>
          )
        })}
      </svg>
      <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted text-center mt-1">
        {lang === 'en' ? 'Tap to fly' : 'Toca para volar'}
      </div>
    </div>
  )
}
