import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FolderOpen } from 'lucide-react'

const PRESET_COLORS = [
  '#dc2626', '#ea580c', '#eab308', '#16a34a', '#3b82f6',
  '#8b5cf6', '#ec4899', '#64748b', '#0f766e', '#1e3a5f',
]

const QUICK_TEMPLATES = [
  {
    label: 'Vendor Investigation',
    name: 'Vendor Investigation',
    description: 'Tracking procurement history, risk scores, and network connections for a specific vendor.',
    color: '#dc2626',
  },
  {
    label: 'Contract Review',
    name: 'Contract Review',
    description: 'Reviewing suspicious contracts for irregularities, red flags, and pricing anomalies.',
    color: '#ea580c',
  },
  {
    label: 'Sector Analysis',
    name: 'Sector Analysis',
    description: 'Analyzing procurement patterns, concentration, and corruption indicators within a government sector.',
    color: '#3b82f6',
  },
]

interface DossierCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; description: string; color: string }) => void
  loading?: boolean
}

export function DossierCreateDialog({ open, onOpenChange, onSubmit, loading }: DossierCreateDialogProps) {
  const { t } = useTranslation('common')
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

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[number]) => {
    setName(tpl.name)
    setDescription(tpl.description)
    setColor(tpl.color)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dossier.newTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Quick-start templates */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-2">Quick Start</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary hover:bg-accent/5 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name + live preview row */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium text-text-secondary block mb-1">{t('dossier.nameLabel')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IMSS Contract Review 2024"
                autoFocus
                required
              />
            </div>
            {/* Mini live preview */}
            <div
              className="mt-5 shrink-0 w-32 rounded border border-border/50 bg-background-elevated/40 p-2 text-xs overflow-hidden"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <FolderOpen className="h-3 w-3 text-accent shrink-0" />
                <span className="font-semibold text-[11px] truncate text-text-primary">
                  {name || 'New Dossier'}
                </span>
              </div>
              <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
                {description || 'No description'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">{t('dossier.description')}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dossier.descriptionPlaceholder')}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">{t('dossier.color')}</label>
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
              {t('dossier.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || loading}>
              {loading ? t('dossier.creating') : t('dossier.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
