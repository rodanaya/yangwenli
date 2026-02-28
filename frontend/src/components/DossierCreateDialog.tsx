import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const PRESET_COLORS = [
  '#dc2626', '#ea580c', '#eab308', '#16a34a', '#3b82f6',
  '#8b5cf6', '#ec4899', '#64748b', '#0f766e', '#1e3a5f',
]

interface DossierCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; description: string; color: string }) => void
  loading?: boolean
}

export function DossierCreateDialog({ open, onOpenChange, onSubmit, loading }: DossierCreateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), color })
    setName('')
    setDescription('')
    setColor('#3b82f6')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Investigation Dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IMSS Contract Review 2024"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this investigation about?"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-6 w-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#fff' : 'transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 1,
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || loading}>
              {loading ? 'Creating\u2026' : 'Create Dossier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
