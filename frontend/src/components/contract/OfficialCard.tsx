/**
 * OfficialCard — named-official accountability block (§1 graft, DESIGNUS
 * "El Cotejo" from the El Funcionario lens). ProPublica *Bailout Tracker*
 * mechanic: promote the human who authorized the award to a serif headline.
 *
 * Data: GET /contracts/{id}/context `.official` (responsible_uc / exception_article
 * / category name — fields SELECT c.* carries but ContractDetail drops) + the
 * contract's own sexenio_year / is_election_year for the political-cycle band.
 *
 * responsible_uc is already title-case in the DB → rendered as plain styled
 * text (NOT formatEntityName('person', …) — 'person' is not in EntityType).
 * Renders nothing when there is no named official.
 */
import { Link } from 'react-router-dom'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { getAdministrationByYear } from '@/lib/administrations'
import { RISK_COLORS } from '@/lib/constants'
import type { ContractContextResponse } from '@/api/types'

const INK_BORDER = '1px solid var(--color-border)'
const INK_INSET = 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)'

export function OfficialCard({
  official,
  contractYear,
  sexenioYear,
  isElectionYear,
  sectorAccent,
  lang,
}: {
  official: ContractContextResponse['official'] | null | undefined
  contractYear: number | null | undefined
  sexenioYear: number | null | undefined
  isElectionYear: boolean | null | undefined
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const name = official?.responsible_uc?.trim()
  if (!name) return null

  const categoryName = isEs
    ? official?.category_name_es || official?.category_name_en
    : official?.category_name_en || official?.category_name_es
  const exception = official?.exception_article?.trim()

  const admin = getAdministrationByYear(contractYear)
  const term = admin ? (isEs ? admin.long : admin.short) : null

  return (
    <div
      className="rounded-sm px-4 py-3.5"
      style={{ border: INK_BORDER, boxShadow: INK_INSET, background: 'var(--color-background-elevated)' }}
    >
      {/* Headline — the named official, serif. Links to their cross-institution
          rollup (/officials/:name); falls back to a graceful 404 if they sit
          below the contract floor / outside the 2018+ window. */}
      <Link
        to={`/officials/${encodeURIComponent(name)}`}
        className="hover:opacity-70 transition-opacity"
        style={{
          display: 'inline-block',
          textDecoration: 'none',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.15,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.005em',
        }}
      >
        {name}
      </Link>
      <div
        className="font-mono mt-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {isEs ? 'Unidad responsable · autorizó la adjudicación' : 'Responsible unit · authorized the award'}
      </div>

      {/* Conditional fact rows — hidden (not "—") when null */}
      {(exception || categoryName) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {exception && (
            <div className="min-w-0">
              <span
                className="font-mono block"
                style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
              >
                {isEs ? 'Excepción legal' : 'Legal exception'}
              </span>
              <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {exception}
              </span>
            </div>
          )}
          {categoryName && official?.category_id != null && (
            <div className="min-w-0">
              <span
                className="font-mono block mb-1"
                style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
              >
                {isEs ? 'Categoría' : 'Category'}
              </span>
              <EntityIdentityChip
                type="category"
                id={official.category_id}
                name={categoryName}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Sexenio band — political-cycle context (PoliticalContextRow content) */}
      {(term || sexenioYear != null) && (
        <div
          className="mt-3 pt-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ borderTop: `1px solid ${sectorAccent}22` }}
        >
          {term && (
            <span
              className="font-mono"
              style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
            >
              {term}
            </span>
          )}
          {sexenioYear != null && (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
            >
              {isEs ? `· año ${sexenioYear} del sexenio` : `· year ${sexenioYear} of the term`}
            </span>
          )}
          {isElectionYear && (
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: RISK_COLORS.medium,
                background: `${RISK_COLORS.medium}1f`,
                border: `1px solid ${RISK_COLORS.medium}44`,
                padding: '1px 5px',
                borderRadius: 2,
              }}
            >
              {isEs ? 'Año electoral' : 'Election year'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
