/**
 * OfficialProfile — per-official rollup at /officials/:name.
 *
 * The destination the /contracts/:id acta RESPONSABLE row links into: a Responsable de
 * la Unidad Compradora aggregated across every buying unit they signed for
 * (2018+, from official_risk_profiles). Volume-led, risk shown only as a
 * labeled indicator — "no es una acusación" (the table names private-ish
 * individuals identified by a free-text string, so the framing is deliberate).
 */
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

import { officialsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { toTitleCase, formatCompactMXN, formatNumber } from '@/lib/utils'

export default function OfficialProfile() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const decoded = name ? decodeURIComponent(name) : ''

  const { data, isLoading, isError } = useQuery({
    queryKey: ['official-profile', decoded],
    queryFn: () => officialsApi.getProfile(decoded),
    enabled: !!decoded,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">
          {isEs ? 'Funcionario no encontrado' : 'Official not found'}
        </h2>
        <p className="text-sm text-text-muted mb-5 max-w-md">
          {isEs
            ? 'No hay perfil para este responsable, o no alcanza el mínimo de contratos (2018+).'
            : 'No profile for this officer, or they fall below the contract floor (2018+).'}
        </p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {isEs ? 'Volver' : 'Back'}
        </Button>
      </div>
    )
  }

  const { summary, institutions } = data
  const heroLevel = getRiskLevelFromScore(summary.avg_risk_score)
  const locale = isEs ? 'es-MX' : 'en-US'
  const displayName = toTitleCase(data.official_name)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.12em] text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {isEs ? 'Volver' : 'Back'}
      </button>

      {/* HERO */}
      <header className="pb-5 border-b border-border">
        <div className="font-mono mb-2" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          {isEs ? 'Responsable de la Unidad Compradora' : 'Procurement officer of record'}
        </div>
        <h1
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.1,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {displayName}
        </h1>
        {/* Summary stat rail */}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label={isEs ? 'Contratos' : 'Contracts'} value={formatNumber(summary.total_contracts)} />
          <Stat label={isEs ? 'Valor' : 'Value'} value={formatCompactMXN(summary.total_value_mxn)} />
          <Stat label={isEs ? 'Instituciones' : 'Institutions'} value={String(summary.institution_count)} />
          <Stat label={isEs ? 'Adj. directa' : 'Direct award'} value={`${summary.direct_award_pct.toFixed(0)}%`} />
          <Stat
            label={isEs ? 'Indicador de riesgo' : 'Risk indicator'}
            value={summary.avg_risk_score.toFixed(2)}
            color={RISK_COLORS[heroLevel]}
          />
          <Stat
            label={isEs ? 'Periodo' : 'Span'}
            value={`${summary.first_contract_year ?? '—'}–${summary.last_contract_year ?? '—'}`}
          />
        </div>
      </header>

      {/* PER-INSTITUTION BREAKDOWN */}
      <section className="mt-8">
        <div className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          § {isEs ? `Por institución · ${summary.institution_count}` : `By institution · ${summary.institution_count}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted border-b border-border">
                <th className="text-left font-medium py-2 pr-3">{isEs ? 'Institución' : 'Institution'}</th>
                <th className="text-right font-medium py-2 px-3">{isEs ? 'Contratos' : 'Contracts'}</th>
                <th className="text-right font-medium py-2 px-3">{isEs ? 'Adj. directa' : 'Direct award'}</th>
                <th className="text-right font-medium py-2 px-3">{isEs ? 'Postor único' : 'Single bid'}</th>
                <th className="text-right font-medium py-2 px-3">{isEs ? 'Proveedores' : 'Vendors'}</th>
                <th className="text-right font-medium py-2 pl-3">{isEs ? 'Indicador' : 'Risk ind.'}</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((row) => {
                const level = getRiskLevelFromScore(row.avg_risk_score)
                return (
                  <tr key={row.institution_id} className="border-b border-border/40">
                    <td className="py-2 pr-3">
                      {row.institution_id ? (
                        <EntityIdentityChip
                          type="institution"
                          id={row.institution_id}
                          name={row.institution_name ?? `#${row.institution_id}`}
                          size="sm"
                        />
                      ) : (
                        <span className="text-text-secondary">{row.institution_name ?? '—'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{row.total_contracts.toLocaleString(locale)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{row.direct_award_pct.toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{row.single_bid_pct.toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{row.vendor_diversity.toLocaleString(locale)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} aria-hidden="true" />
                        <span style={{ color: RISK_COLORS[level] }}>{row.avg_risk_score.toFixed(2)}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">{data.note}</p>
      </section>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-xl font-bold tabular-nums leading-none" style={color ? { color } : { color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1 font-mono">{label}</div>
    </div>
  )
}
