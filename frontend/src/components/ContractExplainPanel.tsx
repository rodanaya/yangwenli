import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { api } from '@/api/client'

interface Props {
  contractId: number
  riskLevel: string
}

export function ContractExplainPanel({ contractId, riskLevel }: Props) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only show for medium/high/critical risk
  if (!['medium', 'high', 'critical'].includes(riskLevel)) return null

  async function fetchExplanation() {
    if (explanation) {
      setOpen(!open)
      return
    }
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ explanation: string }>(
        `/api/v1/ai/contracts/${contractId}/explain`
      )
      setExplanation(data.data.explanation)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 503) {
        setError(t('contractExplain.notConfigured'))
      } else {
        setError(t('contractExplain.couldNotLoad'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 border border-accent/30 rounded-lg overflow-hidden">
      <button
        onClick={fetchExplanation}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-accent/10 hover:bg-accent/15 transition-colors text-left"
      >
        <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="text-sm text-accent/90 font-medium">{t('contractExplain.explain')}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 ml-auto text-accent" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto text-accent" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-background-elevated/60">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              {t('contractExplain.generating')}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-sm text-risk-critical">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {explanation && (
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
