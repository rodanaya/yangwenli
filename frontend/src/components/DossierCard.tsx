import { Folder, FolderOpen, Trash2 } from 'lucide-react'
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

export function DossierCard({ dossier, onOpen, onDelete }: DossierCardProps) {
  const statusColor = STATUS_COLORS[dossier.status] ?? '#64748b'
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

        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{dossier.item_count} item{dossier.item_count !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Updated {formatDate(dossier.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
