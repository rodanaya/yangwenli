/**
 * VerdictBar — accountability proportion bar (DESIGNUS journalists-2026-06-22,
 * graft from the narrative-first "La Portada" proposal).
 *
 * One full-width bar segmented by the legal_status of the 43 documented
 * `procurement_scandals` (GET /cases). A ProPublica "Bailout Tracker"-style
 * indictment: "Of 43 documented scandals: N ended in impunity." Counts are
 * computed, never hardcoded. Supplementary, not load-bearing — the page's
 * swimlane + register work without it; this renders null on empty/error so the
 * page is never fetch-blocked. No green even for the "resolved" outcome
 * (platform never greens). Severity colors from RISK_COLORS.
 */

import { RISK_COLORS } from '@/lib/constants'
import type { ScandalListItem } from '@/api/types'

type Bucket = 'impunity' | 'investigation' | 'resolved' | 'other'

const BUCKET_OF: Record<string, Bucket> = {
  impunity: 'impunity',
  acquitted: 'impunity',
  investigation: 'investigation',
  ongoing: 'investigation',
  convicted: 'resolved',
  settled: 'resolved',
}

const BUCKET_COLOR: Record<Bucket, string> = {
  impunity: RISK_COLORS.critical,
  investigation: RISK_COLORS.high,
  resolved: RISK_COLORS.low, // zinc — never green, even for the "good" outcome
  other: RISK_COLORS.medium,
}

export function VerdictBar({ scandals, lang }: { scandals: ScandalListItem[]; lang: 'en' | 'es' }) {
  const isEs = lang === 'es'
  const total = scandals.length
  if (total === 0) return null

  const counts: Record<Bucket, number> = { impunity: 0, investigation: 0, resolved: 0, other: 0 }
  for (const s of scandals) {
    counts[BUCKET_OF[s.legal_status] ?? 'other'] += 1
  }

  const order: Bucket[] = ['impunity', 'investigation', 'resolved', 'other']
  const labels: Record<Bucket, { en: string; es: string }> = {
    impunity: { en: 'Impunity', es: 'Impunidad' },
    investigation: { en: 'Under investigation', es: 'En investigación' },
    resolved: { en: 'Resolved', es: 'Resueltos' },
    other: { en: 'Other', es: 'Otros' },
  }

  return (
    <section className="my-12 sm:my-14" aria-label={isEs ? 'Rendición de cuentas' : 'Accountability'}>
      <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-secondary mb-3">
        {isEs
          ? `De ${total} escándalos documentados: ${counts.impunity} terminaron en impunidad`
          : `Of ${total} documented scandals: ${counts.impunity} ended in impunity`}
      </p>
      <div className="flex w-full h-[18px] rounded-sm overflow-hidden border border-border" role="img"
        aria-label={isEs
          ? `${counts.impunity} en impunidad, ${counts.investigation} en investigación, ${counts.resolved} resueltos, de ${total}`
          : `${counts.impunity} impunity, ${counts.investigation} under investigation, ${counts.resolved} resolved, of ${total}`}>
        {order.map((b) =>
          counts[b] > 0 ? (
            <div
              key={b}
              style={{ width: `${(counts[b] / total) * 100}%`, background: BUCKET_COLOR[b] }}
              title={`${isEs ? labels[b].es : labels[b].en}: ${counts[b]}`}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
        {order.map((b) =>
          counts[b] > 0 ? (
            <span key={b} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-[1px]" style={{ background: BUCKET_COLOR[b] }} />
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted tabular-nums">
                {(isEs ? labels[b].es : labels[b].en)} · {counts[b]}
              </span>
            </span>
          ) : null,
        )}
      </div>
    </section>
  )
}
