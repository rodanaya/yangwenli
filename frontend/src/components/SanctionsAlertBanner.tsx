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
  efos_definitivo: 'SAT EFOS Definitivo (Confirmed)',
  efos_presunto: 'SAT EFOS Presunto (Alleged)',
}

// Tooltip explanation for EFOS stages
const EFOS_TOOLTIP =
  'Definitivo: Tax authority has formally confirmed this is a ghost company. Presunto: Under investigation.'

function getSanctionChipClass(listType: string) {
  if (listType === 'efos_presunto') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
  return 'bg-red-500/20 text-red-300 border-red-500/30'
}

export function SanctionsAlertBanner({
  sanctions,
  vendorName,
  className,
}: SanctionsAlertBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sanctions.length) return null

  const listTypes = [...new Set(sanctions.map((s) => LIST_LABELS[s.list_type] || s.list_type))]
  // Use amber border if ALL sanctions are presunto (no confirmed EFOS or SFP)
  const allPresunto = sanctions.every((s) => s.list_type === 'efos_presunto')

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        allPresunto
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-red-500/40 bg-red-500/10',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={cn('h-4 w-4 mt-0.5 shrink-0', allPresunto ? 'text-amber-400' : 'text-red-400')}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', allPresunto ? 'text-amber-300' : 'text-red-300')}>
            On {sanctions.length} sanctions list{sanctions.length > 1 ? 's' : ''}:{' '}
            <span className={allPresunto ? 'text-amber-200' : 'text-red-200'}>{listTypes.join(' | ')}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sanctions.map((s, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border',
                  getSanctionChipClass(s.list_type)
                )}
                title={s.list_type.startsWith('efos') ? EFOS_TOOLTIP : undefined}
              >
                {s.match_method === 'rfc' ? 'RFC' : 'Name'} match (
                {Math.round(s.match_confidence * 100)}%)
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'shrink-0 rounded p-1',
            allPresunto
              ? 'hover:bg-amber-500/20 text-amber-400'
              : 'hover:bg-red-500/20 text-red-400'
          )}
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
        <div
          className={cn(
            'mt-3 border-t pt-2 space-y-1.5',
            allPresunto ? 'border-amber-500/20' : 'border-red-500/20'
          )}
        >
          <p className="text-xs text-text-muted">
            Vendor: <span className="text-text-secondary">{vendorName}</span>
          </p>
          {sanctions.map((s, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between text-xs',
                s.list_type === 'efos_presunto' ? 'text-amber-300/80' : 'text-red-300/80'
              )}
            >
              <span title={s.list_type.startsWith('efos') ? EFOS_TOOLTIP : undefined}>
                {LIST_LABELS[s.list_type] || s.list_type}
              </span>
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
