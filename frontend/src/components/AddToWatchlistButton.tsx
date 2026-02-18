/**
 * Reusable "Add to Watchlist" button with inline form.
 * Drop into any vendor/institution/contract page.
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { watchlistApi, type WatchlistItemCreate } from '@/api/client'
import {
  Eye,
  Plus,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react'

interface AddToWatchlistButtonProps {
  itemType: 'vendor' | 'institution' | 'contract'
  itemId: number
  itemName: string
  defaultReason?: string
  className?: string
  size?: 'sm' | 'default'
}

export function AddToWatchlistButton({
  itemType,
  itemId,
  itemName,
  defaultReason = '',
  className,
  size = 'sm',
}: AddToWatchlistButtonProps) {
  const { t } = useTranslation('watchlist')
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState(defaultReason)
  const [priority, setPriority] = useState<'medium' | 'high' | 'low'>('medium')
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: (item: WatchlistItemCreate) => watchlistApi.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      setShowForm(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: () => {
      // Keep form open so user can retry
    },
  })

  const handleSubmit = () => {
    if (!reason.trim()) return
    mutation.mutate({
      item_type: itemType,
      item_id: itemId,
      reason: reason.trim(),
      priority,
    })
  }

  if (success) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <CheckCircle className="h-4 w-4 mr-1.5 text-risk-low" />
        {t('added', { defaultValue: 'Added' })}
      </Button>
    )
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => setShowForm(true)}
        className={className}
      >
        <Eye className="h-4 w-4 mr-1.5" />
        {t('addToWatchlist', { defaultValue: 'Add to Watchlist' })}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/[0.03] p-2">
      <input
        className="flex-1 min-w-0 text-xs bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50"
        placeholder={`Why track ${itemName}?`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        autoFocus
      />
      <select
        className="text-xs bg-background-elevated border border-border/50 rounded px-1.5 py-1.5 text-text-secondary"
        value={priority}
        onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <Button
        size="sm"
        className="h-7 text-xs"
        disabled={!reason.trim() || mutation.isPending}
        onClick={handleSubmit}
      >
        {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => setShowForm(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
