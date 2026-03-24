import { useNavigate } from 'react-router-dom'
import { Folder, FolderOpen, Trash2, AlertTriangle, ExternalLink, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { type DossierSummary } from '@/api/client'
import { RISK_THRESHOLDS } from '@/lib/constants'

// Re-export so callers who import DossierSummary from this file still work
export type { DossierSummary }

interface DossierCardProps {
  dossier: DossierSummary
  onOpen: (id: number) => void
  onDelete: (id: number) => void
  /** Base URL for the backend API — used to build export link */
  apiBase?: string
}

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  archived: '#64748b',
  closed: '#dc2626',
}

function getRiskColor(score: number | null | undefined): string {
  if (score == null) return 'text-text-muted'
  if (score >= RISK_THRESHOLDS.critical) return 'text-risk-critical'
  if (score >= RISK_THRESHOLDS.high) return 'text-risk-high'
  if (score >= RISK_THRESHOLDS.medium) return 'text-risk-medium'
  return 'text-risk-low'
}

function getRiskBannerClass(score: number | null | undefined): string {
  if (score == null) return 'bg-text-muted/5 border-text-muted/15'
  if (score >= RISK_THRESHOLDS.critical) return 'bg-risk-critical/5 border-risk-critical/20'
  if (score >= RISK_THRESHOLDS.high) return 'bg-risk-high/5 border-risk-high/15'
  return 'bg-risk-medium/5 border-risk-medium/15'
}

function getRiskLabel(score: number | null | undefined): string {
  if (score == null) return ''
  if (score >= RISK_THRESHOLDS.critical) return 'CRITICAL'
  if (score >= RISK_THRESHOLDS.high) return 'HIGH'
  if (score >= RISK_THRESHOLDS.medium) return 'MEDIUM'
  return 'LOW'
}

export function DossierCard({ dossier, onOpen, onDelete, apiBase = '/api/v1' }: DossierCardProps) {
  const statusColor = STATUS_COLORS[dossier.status] ?? '#64748b'
  // #89 — show risk banner for any score >= medium (0.25), not just >= high
  const hasRisk = dossier.highest_risk_score != null && dossier.highest_risk_score >= RISK_THRESHOLDS.medium

  return (
    <Card
      className="relative overflow-hidden cursor-pointer hover:border-accent/40 transition-colors group"
      style={{ borderLeftWidth: 3, borderLeftColor: dossier.color }}
      onClick={() => onOpen(dossier.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dossier.status === 'active'
              ? <FolderOpen className="h-4 w-4 text-accent shrink-0" />
              : <Folder className="h-4 w-4 text-text-muted shrink-0" />
            }
            <h3 className="font-semibold text-sm truncate">{dossier.name}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              className="text-[10px] px-1.5 py-0 h-4 font-medium border-0"
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              {dossier.status}
            </Badge>
            {/* #93 — Export button */}
            <a
              href={`${apiBase}/workspace/dossiers/${dossier.id}/export`}
              download={`dossier-${dossier.id}.json`}
              aria-label="Export dossier"
              title="Export dossier"
              className="inline-flex items-center justify-center h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-3 w-3" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-risk-critical"
              onClick={(e) => { e.stopPropagation(); onDelete(dossier.id) }}
              aria-label="Delete dossier"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {dossier.description && (
          <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{dossier.description}</p>
        )}

        {/* #89 — Risk summary banner: shown for medium/high/critical scores */}
        {hasRisk && dossier.highest_risk_name && (
          <div className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded border ${getRiskBannerClass(dossier.highest_risk_score)}`}>
            <AlertTriangle className={`h-3 w-3 shrink-0 ${getRiskColor(dossier.highest_risk_score)}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${getRiskColor(dossier.highest_risk_score)}`}>
              {getRiskLabel(dossier.highest_risk_score)}
            </span>
            <span className="text-[10px] text-text-muted truncate">
              Máx riesgo: {dossier.highest_risk_name}
            </span>
            <span className={`ml-auto text-[10px] font-mono font-bold shrink-0 ${getRiskColor(dossier.highest_risk_score)}`}>
              {((dossier.highest_risk_score ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* #90 — Item count as colored badge */}
        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{
              backgroundColor: `${dossier.color}18`,
              color: dossier.color,
              borderColor: `${dossier.color}40`,
            }}
          >
            {dossier.item_count} elemento{dossier.item_count !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>Actualizado {formatDate(dossier.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DossierItemCard — used inside an open dossier to show individual items
// ============================================================================

interface DossierItemCardProps {
  item: {
    id: number
    item_type: 'vendor' | 'institution' | 'contract' | 'note'
    item_id?: number | null
    item_name: string
    annotation?: string | null
    /** Hex color for the item dot (#95) */
    color?: string
    created_at: string
  }
  onRemove: (itemId: number) => void
}

export function DossierItemCard({ item, onRemove }: DossierItemCardProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border/40 bg-background-elevated/30 group hover:border-border/70 transition-colors">
      {/* #95 — colored dot before item name */}
      {item.color && item.color !== '#888888' && (
        <span
          className="shrink-0 rounded-full"
          style={{ width: 10, height: 10, backgroundColor: item.color }}
          aria-hidden="true"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.item_name}</p>
        {/* #94 — annotation as italic grey text */}
        {item.annotation && (
          <p className="text-xs text-text-muted/70 italic truncate mt-0.5">{item.annotation}</p>
        )}
        <p className="text-[10px] text-text-muted/70 mt-0.5 capitalize">{item.item_type}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* "View Contracts" action — vendor items only */}
        {item.item_type === 'vendor' && item.item_id != null && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 text-accent hover:bg-accent/10"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/vendors/${item.item_id}?tab=contracts`)
            }}
            aria-label={`View contracts for ${item.item_name}`}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Contracts
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-text-muted hover:text-risk-critical"
          onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
          aria-label={`Remove ${item.item_name} from dossier`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
