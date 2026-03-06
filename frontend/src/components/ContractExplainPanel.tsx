import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { api } from '@/api/client'

interface Props {
  contractId: number
  riskLevel: string
}

export function ContractExplainPanel({ contractId, riskLevel }: Props) {
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
      setExplanation(data.explanation)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 503) {
        setError('AI explanation not configured. Set ANTHROPIC_API_KEY on the server.')
      } else {
        setError('Could not load explanation. Try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 border border-purple-500/30 rounded-lg overflow-hidden">
      <button
        onClick={fetchExplanation}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-purple-950/40 hover:bg-purple-900/40 transition-colors text-left"
      >
        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <span className="text-sm text-purple-300 font-medium">Explain this risk score</span>
        {open ? (
          <ChevronUp className="w-4 h-4 ml-auto text-purple-400" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto text-purple-400" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-gray-900/60">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Generating explanation...
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {explanation && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
