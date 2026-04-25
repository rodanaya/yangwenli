/**
 * CitationBlock — collapsible citation panel for academic and journalistic use.
 * Shows APA, BibTeX, and plain-text citation formats with copy-to-clipboard.
 */

import { useState } from 'react'
import { BookOpen, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface CitationBlockProps {
  /** Which pages/datasets this citation covers */
  context?: string
  className?: string
}

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

const BIBTEX = `@misc{rubli2026,
  title        = {{RUBLI: Mexican Federal Procurement Intelligence Platform}},
  author       = {{RUBLI Project}},
  year         = {2026},
  version      = {2.1},
  howpublished = {\\url{${APP_URL}}},
  note         = {Open-source procurement analytics. 3.1M contracts 2002--2025. Risk model v0.6.5 (AUC=0.828).}
}`

const APA = `RUBLI Project. (2026). RUBLI: Mexican Federal Procurement Intelligence Platform (v0.2.5). Retrieved from ${APP_URL}`

const PLAIN = `Source: RUBLI Procurement Intelligence Platform (v0.2.5, 2026). Data from COMPRANET (SHCP), 3.1 million federal contracts 2002–2025. Risk scores are statistical similarity indicators, not legal determinations. Methodology: ${APP_URL}/methodology`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded border border-border hover:border-border"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <><Check className="h-3 w-3 text-text-muted" /><span className="text-text-muted">Copied</span></>
      ) : (
        <><Copy className="h-3 w-3" /><span>Copy</span></>
      )}
    </button>
  )
}

export function CitationBlock({ context, className = '' }: CitationBlockProps) {
  const [open, setOpen] = useState(false)
  const [activeFormat, setActiveFormat] = useState<'apa' | 'bibtex' | 'plain'>('apa')

  const citationText = activeFormat === 'apa' ? APA : activeFormat === 'bibtex' ? BIBTEX : PLAIN

  return (
    <div className={`border border-border rounded-lg bg-background-card ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-background-elevated transition-colors rounded-lg"
        aria-expanded={open}
      >
        <BookOpen className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
        <span className="text-xs text-text-secondary font-medium flex-1">
          How to cite this data{context ? ` — ${context}` : ''}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Format selector */}
          <div className="flex gap-1">
            {(['apa', 'bibtex', 'plain'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wide transition-colors ${
                  activeFormat === fmt
                    ? 'bg-background-elevated text-text-secondary border border-border'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                {fmt === 'plain' ? 'Plain' : fmt.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Citation text */}
          <div className="relative">
            <pre className="text-[11px] text-text-secondary font-mono bg-background-elevated rounded p-3 whitespace-pre-wrap leading-relaxed border border-border">
              {citationText}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={citationText} />
            </div>
          </div>

          <p className="text-[10px] text-text-muted leading-relaxed">
            Risk scores are statistical similarity indicators — not legal determinations or proof of wrongdoing.
            Source data: COMPRANET (Secretaría de Hacienda y Crédito Público, México).
          </p>
        </div>
      )}
    </div>
  )
}
