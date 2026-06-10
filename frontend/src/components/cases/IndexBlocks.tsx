/**
 * IndexBlocks — the front-page tiers of El Padrón (/cases).
 *
 *   LeadCase          — above-the-fold lead (FT print section lead): serif
 *                       headline, full summary, amount sledgehammer, seal,
 *                       impunity-arc micro.
 *   SecondaryCaseCard — below-the-fold half-column story card (ranks 2–5).
 *   AgateLedger       — the dense ruled register (FT markets-page density):
 *                       ~36px single-line rows, disposition rail, tabular
 *                       amounts in neutral ink.
 *
 * DESIGNUS synthesis 2026-06-10: EDITOR's front-page skeleton + ARCHIVO's
 * disposition encoding. Amounts are deliberately UNCOLORED (the old page
 * painted them in a 10-hue fraud rainbow).
 */
import { ChevronRight } from 'lucide-react'
import { formatCompactMXN } from '@/lib/utils'
import type { ScandalListItem } from '@/api/types'
import {
  arcMicro,
  dispositionFor,
  dispositionLabel,
  folio,
  fraudLabel,
  impunityGap,
  sexenioLabel,
  type Lang,
} from './casesVocab'
import { DispositionSeal, SeverityDots } from './CasesShared'

function caseName(cas: ScandalListItem, lang: Lang): string {
  return lang === 'es' && cas.name_es ? cas.name_es : cas.name_en
}

function caseSummary(cas: ScandalListItem, lang: Lang): string {
  return (lang === 'es' && cas.summary_es ? cas.summary_es : cas.summary_en) ?? ''
}

function yearSpan(cas: ScandalListItem): string {
  if (!cas.contract_year_start) return '—'
  return cas.contract_year_end && cas.contract_year_end !== cas.contract_year_start
    ? `${cas.contract_year_start}–${cas.contract_year_end}`
    : String(cas.contract_year_start)
}

// ─── LeadCase ───────────────────────────────────────────────────────────────

export function LeadCase({
  cas,
  lang,
  onOpen,
}: {
  cas: ScandalListItem
  lang: Lang
  onOpen: () => void
}) {
  const meta = dispositionFor(cas.legal_status)
  const amount = cas.amount_mxn_high ?? cas.amount_mxn_low ?? null
  const gap = impunityGap(cas)

  // The finding — derived ONLY from API fields (panel veto on hand-authored
  // numbers): discovery year + disposition + computed gap.
  const finding = (() => {
    if (cas.legal_status === 'convicted') {
      return lang === 'es'
        ? 'Condena obtenida — la única del padrón.'
        : 'Conviction secured — the only one on the docket.'
    }
    if (gap && meta.isOpen && cas.discovery_year) {
      return lang === 'es'
        ? `Descubierto en ${cas.discovery_year}. ${gap.years} años después, sin condena.`
        : `Uncovered in ${cas.discovery_year}. ${gap.years} years on, no conviction.`
    }
    return lang === 'es' ? 'Documentado. Sin condena.' : 'Documented. No conviction.'
  })()

  return (
    <section
      className="py-7"
      style={{ borderBottom: '1px solid var(--color-border)' }}
      aria-label={lang === 'es' ? 'Caso líder' : 'Lead case'}
    >
      <div
        className="flex items-baseline justify-between gap-4 mb-4 font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
          {lang === 'es' ? 'Caso líder · mayor daño documentado' : 'Lead case · largest documented loss'}
        </span>
        <span className="tabular-nums">{folio(cas.id)}</span>
      </div>

      <div className="grid gap-7 md:grid-cols-[1.55fr_1fr] items-start">
        {/* Left — headline + deck */}
        <div>
          <button type="button" onClick={onOpen} className="text-left group">
            <h2
              className="group-hover:opacity-80 transition-opacity"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(24px, 3.2vw, 38px)',
                lineHeight: 1.08,
                letterSpacing: '-0.01em',
                color: 'var(--color-text-primary)',
                maxWidth: '24ch',
              }}
            >
              {caseName(cas, lang)}
            </h2>
          </button>
          <p
            className="mt-3"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              maxWidth: '62ch',
            }}
          >
            {caseSummary(cas, lang)}
          </p>

          {/* Meta footer */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <DispositionSeal status={cas.legal_status} lang={lang} size="md" />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
            >
              {fraudLabel(cas.fraud_type, lang)}
            </span>
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
            >
              {sexenioLabel(cas, lang)}
            </span>
            <SeverityDots severity={cas.severity} lang={lang} />
            {cas.ground_truth_case_id != null && (
              <span
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--color-accent)', fontWeight: 700 }}
              >
                ▪ GT
              </span>
            )}
          </div>
          <p
            className="mt-2 font-mono tabular-nums"
            style={{ fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
          >
            {arcMicro(cas, lang)}
          </p>
        </div>

        {/* Right — amount plate + the finding */}
        <div>
          {amount != null && (
            <div
              style={{
                border: `1px solid ${meta.fill}44`,
                background: `${meta.fill}08`,
                padding: '20px 24px',
                textAlign: 'center',
              }}
            >
              <div
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: 'clamp(34px, 4.4vw, 52px)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: meta.ink,
                }}
              >
                {formatCompactMXN(amount)}
              </div>
              <div
                className="font-mono mt-2 uppercase"
                style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
              >
                {lang === 'es' ? 'Pérdida documentada' : 'Documented loss'}
                {cas.amount_mxn_high && cas.amount_mxn_high !== cas.amount_mxn_low && (
                  <span> · {lang === 'es' ? 'estimación alta' : 'high estimate'}</span>
                )}
              </div>
            </div>
          )}
          <div className="mt-3" style={{ borderLeft: '2px solid rgba(160,104,32,0.45)', paddingLeft: 12 }}>
            <p
              className="font-mono uppercase mb-1"
              style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}
            >
              {lang === 'es' ? 'El hallazgo' : 'The finding'}
            </p>
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 1.45,
                color: 'var(--color-text-primary)',
              }}
            >
              {finding}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="mt-4 inline-flex items-center gap-1.5 font-mono uppercase hover:opacity-70 transition-opacity"
            style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-text-primary)', fontWeight: 600 }}
          >
            {lang === 'es' ? 'Leer el expediente' : 'Read the file'}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── SecondaryCaseCard ──────────────────────────────────────────────────────

export function SecondaryCaseCard({
  cas,
  lang,
  onOpen,
  withGutter,
}: {
  cas: ScandalListItem
  lang: Lang
  onOpen: () => void
  /** Right-edge newspaper gutter rule (odd columns). */
  withGutter?: boolean
}) {
  return (
    <article
      className="py-4 md:pr-7"
      style={withGutter ? { borderRight: '1px solid var(--color-border)' } : undefined}
    >
      <button type="button" onClick={onOpen} className="text-left group w-full">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--color-text-secondary)' }}
          >
            {fraudLabel(cas.fraud_type, lang)}
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
          >
            {folio(cas.id)}
          </span>
        </div>
        <h3
          className="group-hover:opacity-80 transition-opacity"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(17px, 1.8vw, 21px)',
            lineHeight: 1.2,
            color: 'var(--color-text-primary)',
          }}
        >
          {caseName(cas, lang)}
        </h3>
        <p
          className="mt-1.5 line-clamp-2"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
          }}
        >
          {caseSummary(cas, lang)}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap">
          <DispositionSeal status={cas.legal_status} lang={lang} />
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 600 }}
          >
            {cas.amount_mxn_low ? formatCompactMXN(cas.amount_mxn_low) : '—'}
          </span>
        </div>
        <p
          className="mt-1.5 font-mono tabular-nums"
          style={{ fontSize: 9.5, letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}
        >
          {arcMicro(cas, lang)}
        </p>
      </button>
    </article>
  )
}

// ─── AgateLedger ────────────────────────────────────────────────────────────

const AGATE_GRID =
  'grid grid-cols-[3px_minmax(0,1fr)_96px_24px] sm:grid-cols-[3px_64px_minmax(0,1fr)_72px_118px_96px_24px] md:grid-cols-[3px_64px_minmax(0,1fr)_104px_64px_72px_118px_96px_24px]'

export function AgateLedger({
  cases,
  lang,
  onOpen,
  header,
}: {
  cases: ScandalListItem[]
  lang: Lang
  onOpen: (cas: ScandalListItem) => void
  /** Optional section header line above the column rule. */
  header?: string
}) {
  if (cases.length === 0) return null
  return (
    <section aria-label={header ?? (lang === 'es' ? 'El archivo' : 'The archive')}>
      {header && (
        <div
          className="flex items-center gap-3 mt-8 mb-2 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 600 }}
        >
          <span>{header}</span>
          <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        </div>
      )}

      {/* Column header rule */}
      <div
        className={`${AGATE_GRID} items-baseline gap-x-3 pb-1.5 font-mono uppercase`}
        style={{
          fontSize: 8.5,
          letterSpacing: '0.16em',
          color: 'var(--color-text-muted)',
          borderBottom: '1px solid var(--color-text-primary)',
        }}
        aria-hidden="true"
      >
        <span />
        <span className="hidden sm:block">{lang === 'es' ? 'Folio' : 'File'}</span>
        <span>{lang === 'es' ? 'Caso' : 'Case'}</span>
        <span className="hidden md:block">{lang === 'es' ? 'Sexenio' : 'Term'}</span>
        <span className="hidden md:block">{lang === 'es' ? 'Años' : 'Years'}</span>
        <span className="hidden sm:block">{lang === 'es' ? 'Grav.' : 'Sev.'}</span>
        <span className="hidden sm:block">{lang === 'es' ? 'Estado' : 'Status'}</span>
        <span className="text-right">{lang === 'es' ? 'Pérdida' : 'Loss'}</span>
        <span />
      </div>

      <ul className="list-none p-0 m-0">
        {cases.map((cas) => (
          <AgateRow key={cas.id} cas={cas} lang={lang} onOpen={() => onOpen(cas)} />
        ))}
      </ul>
    </section>
  )
}

function AgateRow({
  cas,
  lang,
  onOpen,
}: {
  cas: ScandalListItem
  lang: Lang
  onOpen: () => void
}) {
  const meta = dispositionFor(cas.legal_status)
  return (
    <li style={{ borderBottom: '1px solid var(--color-border)' }} data-wf-row={cas.slug}>
      <button
        type="button"
        onClick={onOpen}
        className={`${AGATE_GRID} w-full items-center gap-x-3 py-2 text-left transition-colors group`}
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,104,32,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Disposition rail */}
        <span
          aria-hidden="true"
          className="self-stretch"
          style={{ background: meta.ring ? 'var(--color-accent)' : meta.fill, opacity: meta.ring ? 1 : 0.85 }}
        />
        {/* Folio */}
        <span
          className="hidden sm:block font-mono tabular-nums"
          style={{ fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-accent)' }}
        >
          {folio(cas.id)}
        </span>
        {/* Name */}
        <span className="min-w-0 truncate">
          <span
            className="group-hover:opacity-75 transition-opacity"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontWeight: 500,
              fontSize: 14.5,
              color: 'var(--color-text-primary)',
            }}
          >
            {caseName(cas, lang)}
          </span>
          {cas.ground_truth_case_id != null && (
            <span
              className="font-mono ml-2"
              style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--color-accent)', fontWeight: 700 }}
            >
              ▪GT
            </span>
          )}
        </span>
        {/* Sexenio */}
        <span
          className="hidden md:block font-mono uppercase truncate"
          style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
        >
          {sexenioLabel(cas, lang)}
        </span>
        {/* Years */}
        <span
          className="hidden md:block font-mono tabular-nums"
          style={{ fontSize: 10.5, color: 'var(--color-text-secondary)' }}
        >
          {yearSpan(cas)}
        </span>
        {/* Severity */}
        <span className="hidden sm:block">
          <SeverityDots severity={cas.severity} lang={lang} />
        </span>
        {/* Status */}
        <span
          className="hidden sm:flex items-center gap-1 font-mono uppercase truncate"
          style={{ fontSize: 9, letterSpacing: '0.1em', color: meta.ink, fontWeight: 600 }}
        >
          {meta.ring && (
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                border: '1.5px solid var(--color-accent)',
                flexShrink: 0,
              }}
            />
          )}
          {dispositionLabel(cas.legal_status, lang)}
        </span>
        {/* Loss — neutral tabular, never rainbow */}
        <span
          className="text-right tabular-nums"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11.5,
            color: 'var(--color-text-primary)',
          }}
        >
          {cas.amount_mxn_low ? formatCompactMXN(cas.amount_mxn_low) : '—'}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 justify-self-end text-text-muted group-hover:translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
      </button>
    </li>
  )
}
