/**
 * InstitutionBadge
 * Shows institution logo (if available) or a styled initials badge.
 * Used in: NetworkGraph nodes, MoneyFlow nodes, institution cards, tables.
 *
 * InstitutionLogoBanner also fetches from Wikipedia when no local SVG exists.
 */

import { getInstitutionGroup } from '../lib/institution-groups'
import { useWikipediaImage } from '../hooks/useWikipediaImage'

interface InstitutionBadgeProps {
  name: string
  /** px size — same for width and height */
  size?: number
  className?: string
  /** If true, show full group name as tooltip */
  showTooltip?: boolean
}

function getInitials(name: string): string {
  // Try acronym first (all-caps words)
  const acronym = name.match(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g)
  if (acronym && acronym.length > 0) return acronym[0].slice(0, 4)
  // Fallback: first letters of each word
  return name
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('')
}

export function InstitutionBadge({
  name,
  size = 36,
  className = '',
  showTooltip = true,
}: InstitutionBadgeProps) {
  const group = getInstitutionGroup(name)
  const tooltipText = showTooltip ? (group?.name ?? name) : undefined

  if (group?.logo) {
    return (
      <div
        title={tooltipText}
        className={`inline-flex items-center justify-center overflow-hidden rounded ${className}`}
        style={{ width: size, height: size * 0.4, minWidth: size }}
      >
        <img
          src={group.logo}
          alt={group.shortName}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => {
            // Fallback to initials badge on load error
            const target = e.currentTarget
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.style.background = group.color
              parent.style.borderRadius = '4px'
              parent.innerHTML = `<span style="color:white;font-weight:700;font-size:${size * 0.3}px;font-family:var(--font-family-mono)">${group.shortName}</span>`
            }
          }}
        />
      </div>
    )
  }

  // Initials badge
  const bg = group?.color ?? '#64748b'
  const initials = group?.shortName ?? getInitials(name)
  const fontSize = size <= 24 ? size * 0.38 : size * 0.3

  return (
    <div
      title={tooltipText}
      className={`inline-flex items-center justify-center rounded font-bold font-mono text-text-primary flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize,
        letterSpacing: '0.03em',
        userSelect: 'none',
      }}
    >
      {initials.slice(0, 4)}
    </div>
  )
}

/**
 * InstitutionLogoBanner — wider rectangular version for cards and headers.
 * Priority: local SVG → Wikipedia thumbnail → initials pill.
 * Only fetches Wikipedia in header/detail contexts (not in tables/lists).
 */
export function InstitutionLogoBanner({
  name,
  height = 28,
  className = '',
  /** Set true in detail/profile headers to enable Wikipedia image fetch */
  enableWiki = false,
}: {
  name: string
  height?: number
  className?: string
  enableWiki?: boolean
}) {
  const group = getInstitutionGroup(name)
  const wikiArticle = enableWiki ? (group?.wikiArticle ?? null) : null
  const { src: wikiSrc } = useWikipediaImage(wikiArticle)

  if (group?.logo) {
    return (
      <img
        src={group.logo}
        alt={group.shortName}
        title={group.name}
        style={{ height, width: 'auto', maxWidth: height * 4 }}
        className={`object-contain ${className}`}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  if (wikiSrc) {
    return (
      <img
        src={wikiSrc}
        alt={group?.shortName ?? name}
        title={group?.name ?? name}
        style={{ height, width: 'auto', maxWidth: height * 4, borderRadius: 4 }}
        className={`object-contain ${className}`}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  const bg = group?.color ?? '#64748b'
  const label = group?.shortName ?? getInitials(name)

  return (
    <span
      className={`inline-flex items-center px-2 rounded text-text-primary font-bold font-mono ${className}`}
      style={{ backgroundColor: bg, height, fontSize: height * 0.45 }}
      title={group?.name ?? name}
    >
      {label}
    </span>
  )
}
