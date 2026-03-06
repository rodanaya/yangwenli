/**
 * Annotations — lists all user-saved annotations grouped by type.
 * Route: /annotations (added to sidebar under My Workspace)
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StickyNote, FileText, Users, Trash2, RefreshCw } from 'lucide-react'
import { getAnnotations, type AnnotationEntityType } from '@/components/AnnotationPin'
import { Button } from '@/components/ui/button'

// ============================================================================
// Types
// ============================================================================

interface AnnotationEntry {
  key: string
  entityType: AnnotationEntityType
  entityId: number
  text: string
}

function parseAnnotations(): AnnotationEntry[] {
  const raw = getAnnotations()
  return Object.entries(raw).map(([key, text]) => {
    const [type, idStr] = key.split('_')
    return {
      key,
      entityType: (type === 'vendor' ? 'vendor' : 'contract') as AnnotationEntityType,
      entityId: parseInt(idStr, 10),
      text,
    }
  })
}

function deleteAnnotation(key: string): void {
  try {
    const all = getAnnotations()
    delete all[key]
    localStorage.setItem('rubli_annotations', JSON.stringify(all))
  } catch {
    // ignore
  }
}

// ============================================================================
// Row component
// ============================================================================

function AnnotationRow({
  entry,
  onDelete,
}: {
  entry: AnnotationEntry
  onDelete: (key: string) => void
}) {
  const href =
    entry.entityType === 'vendor'
      ? `/vendors/${entry.entityId}`
      : `/contracts?highlight=${entry.entityId}`

  return (
    <div className="flex items-start gap-3 rounded-md border border-border/40 bg-background-card p-3 hover:border-border/70 transition-colors">
      <div className="mt-0.5 flex-shrink-0 text-amber-400">
        <StickyNote className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={href}
          className="text-xs font-medium text-accent hover:underline font-mono"
          aria-label={`Go to ${entry.entityType} ${entry.entityId}`}
        >
          {entry.entityType === 'vendor' ? 'Vendor' : 'Contract'} #{entry.entityId}
        </Link>
        <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap break-words">
          {entry.text}
        </p>
      </div>
      <button
        onClick={() => onDelete(entry.key)}
        className="flex-shrink-0 rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label={`Delete annotation for ${entry.entityType} ${entry.entityId}`}
        title="Delete note"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================

export default function Annotations() {
  const [entries, setEntries] = useState<AnnotationEntry[]>([])

  const reload = () => setEntries(parseAnnotations())

  useEffect(() => {
    reload()
  }, [])

  const handleDelete = (key: string) => {
    deleteAnnotation(key)
    reload()
  }

  const contracts = entries.filter((e) => e.entityType === 'contract')
  const vendors = entries.filter((e) => e.entityType === 'vendor')

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-amber-400" aria-hidden="true" />
            My Annotations
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Private notes saved locally in your browser. {entries.length === 0 ? 'No notes yet.' : `${entries.length} note${entries.length > 1 ? 's' : ''} saved.`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reload}
          aria-label="Refresh annotations"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <StickyNote className="h-12 w-12 text-text-muted/30" aria-hidden="true" />
          <p className="text-sm text-text-muted max-w-xs">
            No annotations yet. Click the sticky note icon on any contract or vendor to add a note.
          </p>
          <Link to="/contracts">
            <Button variant="outline" size="sm">
              Browse Contracts
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contract annotations */}
          {contracts.length > 0 && (
            <section aria-label="Contract annotations">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-text-secondary">
                  Contracts ({contracts.length})
                </h2>
              </div>
              <div className="space-y-2">
                {contracts.map((entry) => (
                  <AnnotationRow key={entry.key} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {/* Vendor annotations */}
          {vendors.length > 0 && (
            <section aria-label="Vendor annotations">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-text-secondary">
                  Vendors ({vendors.length})
                </h2>
              </div>
              <div className="space-y-2">
                {vendors.map((entry) => (
                  <AnnotationRow key={entry.key} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
