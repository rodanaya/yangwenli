import { Folder, FolderOpen, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export interface DossierSummary {
  id: number
  name: string
  description?: string | null
  status: 'active' | 'archived' | 'closed'
  color: string
  item_count: number
  highest_risk_score?: number | null
  highest_risk_name?: string | null
  created_at: string
  updated_at: string
}

interface DossierCardProps {
  dossier: DossierSummary
  onOpen: (id: number) => void
  onDelete: (id: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  archived: '#64748b',
  closed: '#dc2626',
}

function getRiskColor(score: number | null | undefined): string {
  if (!score && score !== 0) return 'text-text-muted'
  if (score >= 0.5) return 'text-risk-critical'
  if (score >= 0.3) return 'text-risk-high'
  if (score >= 0.1) return 'text-risk-medium'
  return 'text-risk-low'
}

function getRiskLabel(score: number | null | undefined): string {
  if (!score && score !== 0) return ''
  if (score >= 0.5) return 'CRITICAL'
  if (score >= 0.3) return 'HIGH'
  if (score >= 0.1) return 'MEDIUM'
  return 'LOW'
}

export function DossierCard({ dossier, onOpen, onDelete }: DossierCardProps) {
  const statusColor = STATUS_COLORS[dossier.status] ?? '#64748b'
  const hasRisk = dossier.highest_risk_score != null && dossier.highest_risk_score >= 0.3

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

        {/* Highest-risk item highlight */}
        {hasRisk && dossier.highest_risk_name && (
          <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-risk-high/5 border border-risk-high/15">
            <AlertTriangle className={`h-3 w-3 shrink-0 ${getRiskColor(dossier.highest_risk_score)}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${getRiskColor(dossier.highest_risk_score)}`}>
              {getRiskLabel(dossier.highest_risk_score)}
            </span>
            <span className="text-[10px] text-text-muted truncate">
              {dossier.highest_risk_name}
            </span>
            <span className={`ml-auto text-[10px] font-mono font-bold shrink-0 ${getRiskColor(dossier.highest_risk_score)}`}>
              {((dossier.highest_risk_score ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{dossier.item_count} item{dossier.item_count !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Updated {formatDate(dossier.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
