/**
 * PageFooter — the canonical credibility strip that closes a page.
 *
 * Chrome-consistency sweep (2026-06-03): the credibility footer was reimplemented
 * per page (Journalists, Executive) with drifting content and a HARDCODED contract
 * count. This is the single shared strip — mirror of the shared <PageHeader>. The
 * contract count is LIVE via useExecutiveSummary; the model version comes from
 * CURRENT_MODEL_VERSION. Bilingual inline (no per-page i18n namespace dependency).
 *
 * Use on any page that should end with the source/model/credibility line. Pages
 * with a genuinely page-specific footer (a methodology note, a contract
 * disclaimer) pass that prose via `note` instead of rolling their own <footer>.
 */
import { useTranslation } from 'react-i18next'
import { useExecutiveSummary } from '@/hooks/useExecutiveSummary'
import { CURRENT_MODEL_VERSION } from '@/lib/constants'

interface PageFooterProps {
  /** Optional editorial line under the strip (methodology note, disclaimer). */
  note?: string
  /** Override the default top margin (e.g. tighter inside a narrow column). */
  className?: string
}

const MODEL_TEST_AUC = '0.785' // v0.8.5 model-card metric

export function PageFooter({ note, className }: PageFooterProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language.startsWith('es')
  const { totalContracts } = useExecutiveSummary()
  const loc = isEs ? 'es-MX' : 'en-US'

  return (
    <footer className={className ?? 'mt-16 pt-8 pb-16 border-t border-border'}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
        <span>
          {isEs ? 'Fuente' : 'Source'}:{' '}
          <span className="text-text-secondary">COMPRANET / SHCP</span>
        </span>
        <span className="text-text-primary" aria-hidden="true">·</span>
        <span>
          {isEs ? 'Modelo de riesgo' : 'Risk model'}{' '}
          <span className="text-text-secondary tabular-nums">{CURRENT_MODEL_VERSION}</span>
        </span>
        <span className="text-text-primary" aria-hidden="true">·</span>
        <span>
          {isEs ? 'AUC prueba' : 'Test AUC'}{' '}
          <span className="text-text-secondary tabular-nums">{MODEL_TEST_AUC}</span>
        </span>
        <span className="text-text-primary" aria-hidden="true">·</span>
        <span>
          <span className="text-text-secondary tabular-nums">{totalContracts.toLocaleString(loc)}</span>{' '}
          {isEs ? 'contratos analizados' : 'contracts analyzed'}
        </span>
      </div>
      {note && (
        <p
          className="mt-3 max-w-2xl text-[11px] italic leading-relaxed text-text-muted"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {note}
        </p>
      )}
    </footer>
  )
}
