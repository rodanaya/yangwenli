/**
 * EvidenceIndex — «Las marcas de evidencia» (§3.5 network-la-trama-fable spec).
 *
 * Horizontal wrap strip that reads the graph's evidence marks (E1..E4) into
 * the record: an ochre "tent" glyph per mark + one EB Garamond clause.
 * Clicking a mark focuses its vendor (edge marks focus the higher-pagerank
 * endpoint) — mirrors the ICIJ Pandora annotated-diagram numbered overlay.
 */
import type { JSX } from 'react'
import type { EvidenceEntry } from '@/lib/network/evidence'
import { cn } from '@/lib/utils'

interface EvidenceIndexProps {
  entries: EvidenceEntry[]
  onFocusVendor: (vendorId: number) => void
  lang: 'en' | 'es'
}

export function EvidenceIndex({ entries, onFocusVendor, lang }: EvidenceIndexProps): JSX.Element | null {
  if (entries.length === 0) return null

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--color-border)' }}>
      <div
        className="font-mono uppercase mb-2"
        style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--color-text-muted)' }}
      >
        {lang === 'es' ? '§ Marcas de evidencia' : '§ Evidence marks'}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {entries.map((entry) => {
          const clause = lang === 'es' ? entry.clause_es : entry.clause_en
          const ariaLabel =
            lang === 'es'
              ? `Enfocar firma señalada por la marca ${entry.id}: ${clause}`
              : `Focus the firm flagged by mark ${entry.id}: ${clause}`
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onFocusVendor(entry.focusVendorId)}
              aria-label={ariaLabel}
              className={cn(
                'flex items-start gap-2 text-left max-w-[320px]',
                'hover:opacity-80 transition-opacity cursor-pointer',
              )}
            >
              <span
                className="flex-shrink-0 flex items-center justify-center font-mono"
                style={{
                  width: 11,
                  height: 11,
                  marginTop: 1,
                  background: 'var(--color-accent)',
                  color: '#ffffff',
                  fontSize: 8,
                  lineHeight: 1,
                }}
              >
                {entry.id}
              </span>
              <span
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: 13,
                  lineHeight: 1.35,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {clause}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
