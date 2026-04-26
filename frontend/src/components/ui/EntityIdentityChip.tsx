/**
 * EntityIdentityChip — the unifying primitive that renders ANY entity in the
 * platform with one consistent grammar.
 *
 * Per docs/SITE_SKELETON.md: the platform has 9 entity types (vendor,
 * institution, sector, category, case, pattern, network, investigation,
 * story). Before this primitive, each of 28+ surfaces invented its own
 * vendor/institution/category cell — different name casing, different
 * risk encoding, different navigation target. The 6-agent audit found
 * 5 distinct vendor name renderings + 6 risk visual treatments across
 * the same set of pages.
 *
 * This component is the single funnel:
 *   <EntityIdentityChip type="vendor" id={29277} name={v.name}
 *     riskScore={v.avg_risk_score} ariaTier={v.tier}
 *     flags={['gt', 'efos']} />
 *
 * Renders: type icon · formatted name · right-aligned context badge.
 * Click → navigates to canonical dossier route /{type}/:id (or
 * /thread/:id for vendors per the dossier scheme).
 */
import { Link } from 'react-router-dom'
import {
  Building2, Landmark, Layers, Tag, FileWarning,
  Fingerprint, Network as NetworkIcon, Briefcase, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatEntityName, type EntityType } from '@/lib/entity/format'
import { getRiskLevelFromScore } from '@/lib/constants'

const ICON_FOR_TYPE = {
  vendor: Building2,
  institution: Landmark,
  sector: Layers,
  category: Tag,
  case: FileWarning,
  pattern: Fingerprint,
  network: NetworkIcon,
  investigation: Briefcase,
  story: FileText,
} as const

/**
 * Canonical route for an entity dossier. /thread/:id is the narrative
 * format for vendors (co-exists with /vendors/:id structured-tabs view).
 * The chip routes to /vendors/:id by default; opt-in `narrative` flag
 * routes to /thread/:id instead.
 */
function dossierHref(type: EntityType, id: string | number, narrative = false): string {
  const idStr = String(id)
  switch (type) {
    case 'vendor':
      return narrative ? `/thread/${idStr}` : `/vendors/${idStr}`
    case 'institution':
      return `/institutions/${idStr}`
    case 'sector':
      return `/sectors/${idStr}`
    case 'category':
      return `/categories/${idStr}`
    case 'case':
      return `/cases/${idStr}`
    case 'pattern':
      return `/patterns/${idStr}`
    case 'network':
      return `/network/community/${idStr}`
    case 'investigation':
      return `/investigation/${idStr}`
    case 'story':
      return `/stories/${idStr}`
  }
}

const RISK_COLOR_CLASS: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'text-risk-critical',
  high: 'text-risk-high',
  medium: 'text-risk-medium',
  low: 'text-text-muted',
}

const RISK_DOT_BG: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'bg-risk-critical',
  high: 'bg-risk-high',
  medium: 'bg-risk-medium',
  low: 'bg-text-muted',
}

const TIER_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4',
}

const TIER_BG: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30',
  2: 'bg-risk-high/10 text-risk-high border-risk-high/30',
  3: 'bg-risk-medium/10 text-risk-medium border-risk-medium/30',
  4: 'bg-text-muted/10 text-text-muted border-border',
}

/** Optional status flags shown as badges. EFOS/SFP/GT/Ghost/FP. */
type FlagKind = 'gt' | 'efos' | 'sfp' | 'ghost' | 'fp_structural'

const FLAG_LABEL: Record<FlagKind, string> = {
  gt: 'GT', efos: 'EFOS', sfp: 'SFP', ghost: 'Ghost', fp_structural: 'Estructural',
}

const FLAG_TONE: Record<FlagKind, string> = {
  gt: 'bg-risk-critical/15 text-risk-critical',
  efos: 'bg-risk-critical/15 text-risk-critical',
  sfp: 'bg-risk-high/15 text-risk-high',
  ghost: 'bg-risk-high/15 text-risk-high',
  fp_structural: 'bg-text-muted/15 text-text-muted',
}

export interface EntityIdentityChipProps {
  type: EntityType
  id: string | number
  name: string | null | undefined

  /** Sizes: xs=20px height (compact lists), sm=24px (table rows), md=32px (cards) */
  size?: 'xs' | 'sm' | 'md'

  /** Optional risk score (0-1). If provided, renders a risk dot. */
  riskScore?: number | null

  /** Optional ARIA tier (1-4). If provided, renders a tier badge. */
  ariaTier?: 1 | 2 | 3 | 4 | null

  /** Optional status flags. Max 2 rendered (highest priority first). */
  flags?: FlagKind[]

  /** Sector code for vendor/institution/category — sets a left-edge color dot. */
  sectorCode?: string | null

  /** If true (and type=vendor), routes to /thread/:id instead of /vendors/:id. */
  narrative?: boolean

  /** Hide the type icon (when context already implies the type, e.g. inside a vendor list). */
  hideIcon?: boolean

  className?: string
}

export function EntityIdentityChip({
  type,
  id,
  name,
  size = 'sm',
  riskScore,
  ariaTier,
  flags,
  sectorCode,
  narrative = false,
  hideIcon = false,
  className,
}: EntityIdentityChipProps) {
  const Icon = ICON_FOR_TYPE[type]
  const displayName = formatEntityName(type, name, size)
  const href = dossierHref(type, id, narrative)

  const heightCls = size === 'xs' ? 'h-5 text-[11px]' : size === 'sm' ? 'h-6 text-xs' : 'h-8 text-sm'
  const iconSize = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const dotSize = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const tierSize = size === 'xs' ? 'text-[9px] px-1 py-px' : 'text-[10px] px-1 py-0.5'

  const riskLevel = typeof riskScore === 'number' ? getRiskLevelFromScore(riskScore) : null
  const flagsToShow = (flags ?? []).slice(0, 2)

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-1.5 transition-colors',
        'hover:bg-background-elevated/60 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
        heightCls,
        className,
      )}
      title={name ?? ''}
    >
      {sectorCode && (
        <span
          className={cn('rounded-full flex-shrink-0', dotSize)}
          style={{ backgroundColor: `var(--color-sector-${sectorCode}, var(--color-text-muted))` }}
          aria-hidden="true"
        />
      )}
      {!hideIcon && <Icon className={cn(iconSize, 'flex-shrink-0 text-text-muted')} aria-hidden="true" />}
      <span
        className={cn(
          'truncate font-medium',
          riskLevel ? RISK_COLOR_CLASS[riskLevel] : 'text-text-primary',
        )}
      >
        {displayName}
      </span>
      {ariaTier && (
        <span className={cn('flex-shrink-0 rounded-sm border font-mono font-bold tracking-wider uppercase', tierSize, TIER_BG[ariaTier])}>
          {TIER_LABEL[ariaTier]}
        </span>
      )}
      {riskLevel && !ariaTier && (
        <span
          className={cn('flex-shrink-0 rounded-full', dotSize, RISK_DOT_BG[riskLevel])}
          aria-label={`Risk: ${riskLevel}`}
          title={`Risk: ${riskLevel} (${riskScore?.toFixed(2)})`}
        />
      )}
      {flagsToShow.map((flag) => (
        <span
          key={flag}
          className={cn('flex-shrink-0 rounded-sm font-mono font-bold uppercase', tierSize, FLAG_TONE[flag])}
        >
          {FLAG_LABEL[flag]}
        </span>
      ))}
    </Link>
  )
}
