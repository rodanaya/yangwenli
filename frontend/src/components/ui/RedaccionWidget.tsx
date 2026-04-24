/**
 * RedaccionWidget — ARIA editorial picks feed for the Dashboard.
 * Shows 3 "investigation story cards" from the ARIA queue,
 * formatted like a newspaper editorial sidebar.
 */
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ariaApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS } from '@/lib/constants'
import { ArrowRight } from 'lucide-react'

interface StoryCard {
  vendorId: number
  vendorName: string
  headline: string
  tier: 1 | 2 | 3 | 4
  patternType: string
  ipsScore: number
  avgRiskScore: number
  primarySector: string
}

function generateHeadline(pattern: string | null, sector: string, vendorName: string): string {
  const sectorLabel = sector || 'gobierno'
  const p = (pattern || '').toUpperCase()
  if (p.startsWith('P1')) return `Monopolio detectado: ${sectorLabel}`
  if (p.startsWith('P2')) return `Empresa fantasma presunta: ${vendorName}`
  if (p.startsWith('P3')) return `Posible intermediario: ${sectorLabel}`
  if (p.startsWith('P6')) return `Captura institucional: ${sectorLabel}`
  return `Anomalia en contrataciones: ${sectorLabel}`
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
  2: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  3: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
  4: 'bg-risk-low/15 text-risk-low border-risk-low/30',
}

function ipsColor(score: number): string {
  if (score >= 0.7) return RISK_COLORS.critical
  if (score >= 0.5) return RISK_COLORS.high
  if (score >= 0.3) return RISK_COLORS.medium
  return RISK_COLORS.low
}

function StoryCardSkeleton() {
  return (
    <div className="border-t border-border pt-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-2 w-1/2" />
    </div>
  )
}

export default function RedaccionWidget() {
  const { t } = useTranslation('common')
  const { data, isLoading, error } = useQuery({
    queryKey: ['aria', 'queue', 'redaccion-widget'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 3 }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const stories: StoryCard[] = (data?.data ?? []).slice(0, 3).map((item) => ({
    vendorId: item.vendor_id,
    vendorName: item.vendor_name,
    headline: generateHeadline(item.primary_pattern, item.primary_sector_name ?? '', item.vendor_name),
    tier: item.ips_tier,
    patternType: item.primary_pattern ?? '',
    ipsScore: item.ips_final,
    avgRiskScore: item.avg_risk_score,
    primarySector: item.primary_sector_name ?? '',
  }))

  return (
    <div className="rounded-sm border border-border bg-background-card p-4">
      {/* Section label */}
      <p className="text-xs tracking-widest text-text-muted font-semibold mb-4" style={{ fontVariant: 'all-small-caps' }}>
        REDACCION RUBLI
      </p>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            <StoryCardSkeleton />
            <StoryCardSkeleton />
            <StoryCardSkeleton />
          </>
        ) : error || stories.length === 0 ? (
          <p className="text-xs text-text-muted italic">{t('redaccion.noAlerts')}</p>
        ) : (
          stories.map((story) => (
            <div key={story.vendorId} className="border-t border-border pt-3">
              {/* Vendor name */}
              <Link
                to={`/thread/${story.vendorId}`}
                className="block text-sm font-bold text-text-primary hover:text-accent transition-colors leading-snug"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {story.vendorName.length > 60
                  ? story.vendorName.slice(0, 57) + '...'
                  : story.vendorName}
              </Link>

              {/* Headline */}
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                {story.headline}
              </p>

              {/* Tier badge + IPS bar */}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[story.tier] ?? TIER_COLORS[4]}`}>
                  T{story.tier}
                </span>
                {(() => {
                  const N = 20, DR = 2, DG = 5
                  const pct = Math.min(story.ipsScore, 1)
                  const filled = Math.round(pct * N)
                  const color = ipsColor(story.ipsScore)
                  return (
                    <svg viewBox={`0 0 ${N * DG} 6`} className="flex-1" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                      {Array.from({ length: N }).map((_, i) => (
                        <circle key={i} cx={i * DG + DR} cy={3} r={DR}
                          fill={i < filled ? color : '#f3f1ec'}
                          stroke={i < filled ? undefined : '#e2ddd6'}
                          strokeWidth={i < filled ? 0 : 0.5}
                          fillOpacity={i < filled ? 0.85 : 1}
                        />
                      ))}
                    </svg>
                  )
                })()}
                <span className="text-[10px] font-mono text-text-muted">
                  {(story.ipsScore * 100).toFixed(0)}
                </span>
              </div>

              {/* Investigate link */}
              <Link
                to={`/thread/${story.vendorId}`}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary mt-1.5 transition-colors"
              >
                Red Thread <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Footer link */}
      <div className="border-t border-border mt-4 pt-3">
        <Link
          to="/aria"
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" />
          Ver todos los casos
        </Link>
      </div>
    </div>
  )
}
