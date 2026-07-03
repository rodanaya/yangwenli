/**
 * El Dictamen — document chrome.
 *
 * Four self-contained exports shared by the /methodology page: the reconciled
 * masthead, the flat "clause" section wrapper (Parts I–VI), the folding
 * "annex" disclosure (Annexes A–C, plus the risk-evidence sub-fold in Part
 * II), and the sticky left index rail. No data fetching, no framer-motion,
 * no lucide icons besides the masthead's print button. Spec:
 * `.claude/designs/methodology-fable-2026-07-02-spec.md` §4.3.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

const SERIF = '"EB Garamond", Georgia, serif'
const SERIF_DISPLAY = '"Playfair Display", "EB Garamond", Georgia, serif'
const OCHRE = '#a06820'

// ============================================================================
// DictamenMasthead
// ============================================================================

interface AnchorStat {
  value: string
  label: { en: string; es: string }
  sub: { en: string; es: string }
}

const ANCHOR_STATS: AnchorStat[] = [
  {
    value: '0.785',
    label: { en: 'Test AUC', es: 'AUC de prueba' },
    sub: {
      en: 'vendor-stratified hold-out · train 0.797',
      es: 'retención estratificada por proveedor · entrenamiento 0.797',
    },
  },
  {
    value: '11.01%',
    label: { en: 'High-risk rate', es: 'Tasa de alto riesgo' },
    sub: { en: 'OECD range: 2–15%', es: 'rango OCDE: 2–15%' },
  },
  {
    value: '1,427',
    label: { en: 'Ground-truth cases', es: 'Casos de verdad fundamental' },
    sub: {
      en: '1,554 vendors · ~302K contracts',
      es: '1,554 proveedores · ~302K contratos',
    },
  },
]

export function DictamenMasthead({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  return (
    <header className={cn('relative', className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p
          className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted"
          style={{ letterSpacing: '0.18em' }}
        >
          {lang === 'es' ? 'RUBLI · ' : 'RUBLI · '}
          <em style={{ color: OCHRE, fontStyle: 'normal' }}>EL DICTAMEN</em>
          {lang === 'es'
            ? ' · MODELO v0.8.5 · CORRIDA CAL-v8-202605020212'
            : ' · MODEL v0.8.5 · RUN CAL-v8-202605020212'}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 print:hidden"
        >
          <Printer className="h-3 w-3" aria-hidden="true" />
          {lang === 'es' ? 'Imprimir / PDF' : 'Print / PDF'}
        </button>
      </div>

      <h1
        className="mt-4 text-text-primary"
        style={{
          fontFamily: SERIF,
          fontStyle: 'normal',
          fontWeight: 500,
          fontSize: 'clamp(36px, 5.5vw, 62px)',
          lineHeight: 0.98,
        }}
      >
        {lang === 'es' ? (
          <>
            Cómo calificamos 3.05 millones de contratos —{' '}
            <span style={{ color: OCHRE }}>y lo que el modelo no puede ver.</span>
          </>
        ) : (
          <>
            How we score 3.05 million contracts —{' '}
            <span style={{ color: OCHRE }}>and what the model cannot see.</span>
          </>
        )}
      </h1>

      <p
        className="mt-4 text-text-secondary"
        style={{ fontFamily: SERIF, fontSize: 17, maxWidth: '68ch', lineHeight: 1.55 }}
      >
        {lang === 'es'
          ? 'Un modelo logístico regularizado con corrección positivo–no-etiquetado, entrenado con 1,427 casos documentados de corrupción y probado con proveedores que nunca vio. Esta página es el expediente completo: los pesos, las matemáticas, los fracasos que conservamos y los límites que declaramos.'
          : 'A regularized logistic model with positive–unlabeled correction, trained on 1,427 documented corruption cases and tested on vendors it never saw. This page is the full record: the weights, the math, the failures we kept, and the limits we declare.'}
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {ANCHOR_STATS.map((stat) => (
          <div key={stat.value}>
            <div
              className="tabular-nums"
              style={{
                fontFamily: SERIF_DISPLAY,
                fontStyle: 'normal',
                fontWeight: 800,
                fontSize: 'clamp(26px, 3vw, 34px)',
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-text-primary">
              {lang === 'es' ? stat.label.es : stat.label.en}
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-text-muted leading-[1.4]">
              {lang === 'es' ? stat.sub.es : stat.sub.en}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border" />
    </header>
  )
}

// ============================================================================
// ClauseSection
// ============================================================================

interface ClauseSectionProps {
  id: string
  numeral: string
  title: { en: string; es: string }
  dek?: { en: string; es: string }
  kicker?: { en: string; es: string }
  children: React.ReactNode
}

export function ClauseSection({ id, numeral, title, dek, kicker, children }: ClauseSectionProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-baseline gap-4">
        <span
          className="shrink-0"
          style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, color: OCHRE }}
          aria-hidden="true"
        >
          {numeral}
        </span>
        <div className="min-w-0">
          {kicker && (
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-muted">
              {lang === 'es' ? kicker.es : kicker.en}
            </p>
          )}
          <h2
            className="text-text-primary"
            style={{ fontFamily: SERIF, fontStyle: 'normal', fontWeight: 500, fontSize: 26, lineHeight: 1.15 }}
          >
            {lang === 'es' ? title.es : title.en}
          </h2>
          {dek && (
            <p
              className="mt-2 text-text-secondary"
              style={{ fontFamily: SERIF, fontSize: 16, maxWidth: '68ch', lineHeight: 1.5 }}
            >
              {lang === 'es' ? dek.es : dek.en}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border" />
      <div className="mt-6">{children}</div>
    </section>
  )
}

// ============================================================================
// AnnexFold
// ============================================================================

interface AnnexFoldProps {
  id: string
  marker: string
  title: { en: string; es: string }
  defaultOpen?: boolean
  children: React.ReactNode
}

export function AnnexFold({ id, marker, title, defaultOpen = false, children }: AnnexFoldProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `annex-content-${id}`
  const titleText = lang === 'es' ? title.es : title.en

  const headerLabel =
    marker === '§'
      ? `§ ${titleText}`
      : lang === 'es'
        ? `ANEXO ${marker} — ${titleText}`
        : `ANNEX ${marker} — ${titleText}`

  return (
    <section id={id} className="scroll-mt-24">
      <div className="border-t border-border" />
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer select-none group"
      >
        <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-text-primary group-hover:text-accent transition-colors">
          {marker !== '§' && <span style={{ color: OCHRE }}>{marker}</span>}
          {marker !== '§' && ' — '}
          {marker === '§' ? headerLabel : titleText}
        </span>
        <span
          className="font-mono text-text-muted shrink-0 transition-transform"
          style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {isOpen && (
        <div id={contentId} className="pb-6 border-b border-border">
          {children}
        </div>
      )}
      {!isOpen && (
        <div id={`${contentId}-print`} className="hidden print:block pb-6 border-b border-border">
          {children}
        </div>
      )}
    </section>
  )
}

// ============================================================================
// IndiceRail
// ============================================================================

interface IndiceRailProps {
  clauses: Array<{ id: string; numeral: string; label: { en: string; es: string } }>
}

export function IndiceRail({ clauses }: IndiceRailProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  return (
    <nav className="hidden lg:block sticky top-6 self-start" aria-label={lang === 'es' ? 'Índice' : 'Index'}>
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted mb-3">
        {lang === 'es' ? 'ÍNDICE' : 'INDEX'}
      </p>
      <ul className="space-y-2">
        {clauses.map((clause) => (
          <li key={clause.id}>
            <a
              href={`#${clause.id}`}
              className="flex items-baseline gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <span
                className="font-mono text-right shrink-0"
                style={{ width: 24, color: OCHRE, fontSize: 13 }}
                aria-hidden="true"
              >
                {clause.numeral}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                {lang === 'es' ? clause.label.es : clause.label.en}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
