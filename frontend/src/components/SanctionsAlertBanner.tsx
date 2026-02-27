import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SanctionRecord {
  list_type: 'sfp' | 'efos' | 'efos_definitivo' | 'efos_presunto'
  match_method: 'rfc' | 'name_fuzzy'
  match_confidence: number
  sanction_type?: string
}

interface SanctionsAlertBannerProps {
  sanctions: SanctionRecord[]
  vendorName: string
  className?: string
}

const LIST_LABELS: Record<string, string> = {
  sfp: 'SFP Inhabilitado',
  efos: 'SAT EFOS',
  efos_definitivo: 'SAT EFOS Definitivo',
  efos_presunto: 'SAT EFOS Presunto',
}

export function SanctionsAlertBanner({
  sanctions,
  vendorName,
  className,
}: SanctionsAlertBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sanctions.length) return null

  const listTypes = [...new Set(sanctions.map((s) => LIST_LABELS[s.list_type] || s.list_type))]

  return (
    <div
      className={cn(
        'rounded-md border border-red-500/40 bg-red-500/10 p-3',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-300">
            On {sanctions.length} sanctions list{sanctions.length > 1 ? 's' : ''}:{' '}
            <span className="text-red-200">{listTypes.join(' | ')}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sanctions.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-red-500/20 text-red-300 border border-red-500/30"
              >
                {s.match_method === 'rfc' ? 'RFC' : 'Name'} match (
                {Math.round(s.match_confidence * 100)}%)
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-1 hover:bg-red-500/20 text-red-400"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-red-500/20 pt-2 space-y-1.5">
          <p className="text-xs text-text-muted">
            Vendor: <span className="text-text-secondary">{vendorName}</span>
          </p>
          {sanctions.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs text-red-300/80"
            >
              <span>{LIST_LABELS[s.list_type] || s.list_type}</span>
              <span>
                {s.sanction_type && <span className="mr-2">{s.sanction_type}</span>}
                {s.match_method === 'rfc' ? 'RFC' : 'Name fuzzy'} -{' '}
                {Math.round(s.match_confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SanctionsAlertBanner
