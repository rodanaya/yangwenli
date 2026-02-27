import { useState } from 'react'
import { FolderOpen, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvestigationFolder {
  id: number
  name: string
  description?: string
  color: string
  item_count?: number
}

interface FolderSidebarProps {
  folders: InvestigationFolder[]
  activeFolderId?: number
  onSelect: (folderId: number | null) => void
  onCreateFolder: (name: string, color: string) => void
  onDeleteFolder: (folderId: number) => void
  className?: string
}

const FOLDER_COLORS = [
  '#dc2626',
  '#3b82f6',
  '#16a34a',
  '#eab308',
  '#8b5cf6',
  '#f97316',
]

export function FolderSidebar({
  folders,
  activeFolderId,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  className,
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0])
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreateFolder(trimmed, newColor)
    setNewName('')
    setCreating(false)
  }

  return (
    <div className={cn('space-y-1', className)}>
      {/* All items */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
          activeFolderId == null
            ? 'bg-accent/15 text-accent'
            : 'text-text-secondary hover:bg-background-elevated'
        )}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">All items</span>
      </button>

      {/* Folder list */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="relative"
          onMouseEnter={() => setHoveredId(folder.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <button
            onClick={() => onSelect(folder.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
              activeFolderId === folder.id
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:bg-background-elevated'
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="flex-1 text-left truncate">{folder.name}</span>
            {folder.item_count != null && (
              <span className="shrink-0 text-[10px] text-text-muted">
                {folder.item_count}
              </span>
            )}
          </button>

          {hoveredId === folder.id && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(folder.id)
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-red-400 hover:bg-red-500/10"
              aria-label={`Delete folder ${folder.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {/* Create new folder */}
      {creating ? (
        <div className="space-y-1.5 rounded-md border border-border p-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Folder name"
            className="w-full rounded bg-background-elevated px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
          <div className="flex items-center gap-1">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  'h-4 w-4 rounded-full border-2',
                  newColor === c ? 'border-white' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreate}
              className="flex-1 rounded bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent-hover"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded p-1 text-text-muted hover:text-text-primary"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-background-elevated transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Folder
        </button>
      )}
    </div>
  )
}

export default FolderSidebar
