/**
 * ContractDossier — canonical contract dossier at /contracts/:id.
 *
 * Built 2026-05-26 (DESIGNUS round 9, Phase 4). Contracts are single
 * transactions — no aggregate narrative. Composition is lighter than
 * the vendor/institution/sector dossiers:
 *
 *   Hero        — cover slug with amount + risk-verdict seal
 *   § The transaction      — parties, procedure, dates, source PDF
 *   § Risk reading         — SHAP top contributors in plain language
 *   § Context              — vendor + institution chips → drill-out
 *   Methodology footer
 *
 * Legacy ContractDetail (958 LOC) moved to /print/contracts/:id.
 */
import { useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'

import {
  ChapterShell,
  SubheadRule,
  FadeIn,
} from '@/components/dossier/primitives'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DossierSectionHeader } from '@/components/dossier/DossierSectionHeader'
import { ContractSignalTags } from '@/components/contract/ContractSignalTags'
import { OfficialCard } from '@/components/contract/OfficialCard'
import { RiskFactorLedger } from '@/components/contract/RiskFactorLedger'
import { ContractCotejo } from '@/components/contract/ContractCotejo'
import { localizeProcedure, describeContractFactor } from '@/lib/contract-format'
import { formatEntityName } from '@/lib/entity/format'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatDate } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
}

// §1 La transacción field grammar (matches TransactionField's dt/dd styling so
// the chip-bearing party rows align with the scalar rows).
const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
}
const FIELD_VALUE_STYLE: React.CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontSize: 14,
  color: 'var(--color-text-primary)',
  lineHeight: 1.4,
}

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32, textAlign: 'center' }}>
        <p
          className="font-mono mb-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
        </p>
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            maxWidth: '64ch',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          {lang === 'es'
            ? 'Datos COMPRANET 2002–2025. La puntuación de riesgo y su descomposición SHAP provienen del modelo v0.8.5; son indicadores estadísticos, no determinaciones legales.'
            : 'COMPRANET data 2002–2025. Risk score and its SHAP decomposition come from the v0.8.5 model; they are statistical indicators, not legal determinations.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-4 font-mono cursor-pointer hover:opacity-70 transition-opacity"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
          }}
        >
          {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
        </button>
      </div>
    </section>
  )
}

function ChapterDivider({ sectorAccent }: { sectorAccent?: string }) {
  const color = sectorAccent ?? 'var(--color-border)'
  return (
    <div className="flex items-center justify-center gap-4 py-12">
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ContractDossier() {
  const { id } = useParams<{ id: string }>()
  const contractId = Number(id)
  const validId = Number.isFinite(contractId) && contractId > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: contract, isLoading: contractLoading, isError: contractError } = useQuery({
    queryKey: ['contract-dossier', contractId, 'detail'],
    queryFn: () => contractApi.getById(contractId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const { data: explanation } = useQuery({
    queryKey: ['contract-dossier', contractId, 'explain'],
    queryFn: () => contractApi.getRiskExplanation(contractId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
  })

  // §2 POR QUÉ — prod-true risk factors (parses risk_factors server-side; works
  // WITHOUT contract_z_features, unlike risk-explain). The honest centerpiece.
  const { data: riskBreakdown } = useQuery({
    queryKey: ['contract-dossier', contractId, 'risk-breakdown'],
    queryFn: () => contractApi.getRiskBreakdown(contractId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  // §1 OfficialCard + §3 EL COTEJO — size-in-context + relationship + named
  // official, all 0ms PK/indexed reads bundled additively.
  const { data: context } = useQuery({
    queryKey: ['contract-dossier', contractId, 'context'],
    queryFn: () => contractApi.getContext(contractId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const [contractNoCopied, setContractNoCopied] = useState(false)
  async function copyContractNo() {
    if (!contract?.contract_number) return
    try {
      await navigator.clipboard.writeText(contract.contract_number)
      setContractNoCopied(true)
      setTimeout(() => setContractNoCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'ID inválido' : 'Invalid ID'}</h2>
        <Button onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver a contratos' : 'Back to contracts'}
        </Button>
      </div>
    )
  }
  if (contractLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-96" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
  if (contractError || !contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Contrato no encontrado' : 'Contract not found'}</h2>
        <Button onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver a contratos' : 'Back to contracts'}
        </Button>
      </div>
    )
  }

  const sectorCode = SECTORS.find((s) => s.id === contract.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const score = Number(contract.risk_score ?? 0)
  const level = score > 0 ? getRiskLevelFromScore(score) : 'low'
  const verdictColor = score > 0 ? RISK_COLORS[level] : 'var(--color-text-muted)'
  const riskPct = score > 0 ? Math.round(score * 100) : null

  // Build signal pills
  const signals: Array<{ label: string; color: string; tooltip: string }> = []
  if (contract.is_direct_award) {
    signals.push({
      label: lang === 'es' ? 'ADJ. DIRECTA' : 'DIRECT AWARD',
      color: RISK_COLORS.high,
      tooltip: lang === 'es' ? 'Otorgado sin licitación pública' : 'Awarded without an open bid',
    })
  }
  if (contract.is_single_bid) {
    signals.push({
      label: lang === 'es' ? 'ÚNICO POSTOR' : 'SINGLE BID',
      color: RISK_COLORS.critical,
      tooltip: lang === 'es' ? 'Procedimiento competitivo con un solo postor' : 'Competitive procedure with only one bidder',
    })
  }
  if (Number(contract.amount_mxn) > 500_000_000) {
    signals.push({
      label: lang === 'es' ? 'ALTO MONTO' : 'LARGE',
      color: RISK_COLORS.medium,
      tooltip: lang === 'es' ? 'Valor del contrato supera 500M MXN' : 'Contract value exceeds 500M MXN',
    })
  }
  if (contract.is_year_end) {
    signals.push({
      label: lang === 'es' ? 'FIN DE AÑO' : 'YEAR-END',
      color: RISK_COLORS.medium,
      tooltip: lang === 'es' ? 'Otorgado en noviembre o diciembre' : 'Awarded in November or December',
    })
  }
  if (contract.is_threshold_gaming) {
    signals.push({
      label: lang === 'es' ? 'JUEGO DE UMBRAL' : 'THRESHOLD GAMING',
      color: RISK_COLORS.critical,
      tooltip: lang === 'es' ? 'Monto cerca del umbral del procedimiento' : 'Amount suspiciously close to procedure threshold',
    })
  }

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  const sectorName = lang === 'es'
    ? SECTORS.find((s) => s.id === contract.sector_id)?.name
    : SECTORS.find((s) => s.id === contract.sector_id)?.nameEN

  const lede = buildLede({ contract, sectorName, riskBreakdown, lang })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {lang === 'es' ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      {/* HERO */}
      <header className="relative">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0"
          style={{ top: 0, height: 6, background: sectorAccent }}
        />
        <div className="pt-16 pb-12">
          <div className="flex items-baseline justify-between gap-4 mb-7">
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: 11,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            >
              CONT · #{contract.id}
              {contract.contract_number && (
                <>
                  <span className="mx-2 opacity-40">·</span>
                  <button
                    type="button"
                    onClick={copyContractNo}
                    className="inline-flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                    style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}
                  >
                    {contract.contract_number}
                    {contractNoCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            className="font-mono mb-4"
            style={{
              fontSize: 10,
              fontStyle: 'italic',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: sectorAccent,
              fontWeight: 500,
            }}
          >
            § {lang === 'es' ? 'EL CONTRATO · EXPEDIENTE' : 'EL CONTRATO · CONTRACT DOSSIER'}
          </div>

          <div className="grid gap-6 lg:gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <div className="min-w-0">
              {/* Amount as the headline */}
              <h1
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: 'clamp(48px, 6vw, 72px)',
                  lineHeight: 1,
                  letterSpacing: '-0.025em',
                  color: verdictColor,
                  marginBottom: 4,
                }}
              >
                {formatCompactMXN(Number(contract.amount_mxn ?? 0))}
              </h1>
              <div
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: 16,
                  fontWeight: 400,
                  color: 'var(--color-text-secondary)',
                  opacity: 0.6,
                  letterSpacing: '0.02em',
                }}
              >
                ≈ {formatCompactUSD(Number(contract.amount_mxn ?? 0))} · {contract.contract_year ?? '—'}
              </div>

              {/* Title in italic serif */}
              {(contract.description ?? contract.title) && (
                <p
                  className="mt-4"
                  style={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: 'var(--color-text-secondary)',
                    borderLeft: `2px solid ${sectorAccent}`,
                    paddingLeft: 14,
                    maxWidth: '60ch',
                  }}
                >
                  {(contract.description ?? contract.title)?.slice(0, 280)}
                  {((contract.description ?? contract.title)?.length ?? 0) > 280 && '…'}
                </p>
              )}
            </div>

            {/* Verdict card */}
            <aside
              className="flex-shrink-0 relative"
              style={{ width: 168, paddingTop: 10, paddingBottom: 12, paddingLeft: 18, paddingRight: 18 }}
            >
              <div aria-hidden="true" className="absolute top-0 left-0 right-0" style={{ height: 2, background: verdictColor }} />
              <div className="text-center">
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 52,
                    lineHeight: 1,
                    color: verdictColor,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {riskPct ?? '—'}
                </div>
                <div
                  className="font-mono tabular-nums mt-1"
                  style={{ fontSize: 10, color: 'var(--color-text-muted)', opacity: 0.55, letterSpacing: '0.06em' }}
                >
                  / 100
                </div>
              </div>
              <div aria-hidden="true" className="my-3 mx-auto" style={{ height: 1, width: '60%', background: 'var(--color-border)' }} />
              <div
                className="font-mono text-center"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: verdictColor,
                  fontWeight: 700,
                }}
              >
                {riskPct == null
                  ? (lang === 'es' ? 'Sin puntuación' : 'Not scored')
                  : (lang === 'es' ? localizeLevel(level, 'es') : level.toUpperCase())}
              </div>
              {signals.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                  {signals.slice(0, 3).map((s, i) => (
                    <span
                      key={i}
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: s.color,
                        background: `${s.color}1f`,
                        border: `1px solid ${s.color}44`,
                        padding: '2px 5px',
                        borderRadius: 2,
                      }}
                      title={s.tooltip}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          </div>

          <div aria-hidden="true" className="mt-8" style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Lede */}
          <div className="mt-10" style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 20, maxWidth: '68ch' }}>
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.005em',
              }}
            >
              {lede}
            </p>
          </div>
        </div>
      </header>

      {/* Reworked body — tight DossierSectionHeader grammar (W3), centered
          reading column. ChapterShell py-20 + 2 ChapterDividers removed. */}
      <div className="mt-10 max-w-3xl mx-auto px-4 sm:px-8 space-y-10">

        {/* §1 · LA TRANSACCIÓN — parties as chips, localized procedure, the
            named-official card + signal-tag rail + honest quality/era block */}
        <section id="transaction">
          <FadeIn>
            <DossierSectionHeader
              id="transaction"
              eyebrow={lang === 'es' ? 'Acta' : 'Record'}
              title={lang === 'es' ? 'La transacción' : 'The transaction'}
              meta={localizeProcedure(contract.procedure_type_normalized ?? contract.procedure_type, lang)}
              accent={sectorAccent}
            />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <div>
                <dt className="font-mono mb-1.5" style={FIELD_LABEL_STYLE}>{lang === 'es' ? 'Proveedor' : 'Vendor'}</dt>
                <dd>
                  {contract.vendor_id && contract.vendor_name ? (
                    <EntityIdentityChip
                      type="vendor"
                      id={contract.vendor_id}
                      name={contract.vendor_name}
                      riskScore={score > 0 ? score : null}
                      sectorCode={sectorCode}
                      fullName
                    />
                  ) : (
                    <span style={FIELD_VALUE_STYLE}>{contract.vendor_name ? formatEntityName('vendor', contract.vendor_name) : '—'}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono mb-1.5" style={FIELD_LABEL_STYLE}>{lang === 'es' ? 'Institución' : 'Institution'}</dt>
                <dd>
                  {contract.institution_id && contract.institution_name ? (
                    <EntityIdentityChip
                      type="institution"
                      id={contract.institution_id}
                      name={contract.institution_name}
                      sectorCode={sectorCode}
                      fullName
                    />
                  ) : (
                    <span style={FIELD_VALUE_STYLE}>{contract.institution_name ? formatEntityName('institution', contract.institution_name) : '—'}</span>
                  )}
                </dd>
              </div>
              <TransactionField
                label={lang === 'es' ? 'Procedimiento' : 'Procedure'}
                value={localizeProcedure(contract.procedure_type_normalized ?? contract.procedure_type, lang)}
              />
              <TransactionField
                label={lang === 'es' ? 'Número' : 'Number'}
                value={contract.procedure_number ?? '—'}
                mono
              />
              <TransactionField
                label={lang === 'es' ? 'Fecha del contrato' : 'Contract date'}
                value={contract.contract_date ? formatDate(contract.contract_date) : '—'}
                mono
              />
              <TransactionField
                label={lang === 'es' ? 'Fecha de adjudicación' : 'Award date'}
                value={contract.award_date ? formatDate(contract.award_date) : '—'}
                mono
              />
              {contract.publication_date && (
                <TransactionField
                  label={lang === 'es' ? 'Publicación' : 'Publication'}
                  value={formatDate(contract.publication_date)}
                  mono
                />
              )}
              {contract.url && (
                <div className="sm:col-span-2 pt-1">
                  <a
                    href={contract.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                    style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {lang === 'es' ? 'Documento fuente' : 'Source document'}
                  </a>
                </div>
              )}
            </dl>

            {/* Named-official accountability card (graft; renders only when the
                buying official is on record) */}
            <div className="mt-5">
              <OfficialCard
                official={context?.official}
                contractYear={contract.contract_year}
                sexenioYear={contract.sexenio_year}
                isElectionYear={contract.is_election_year}
                sectorAccent={sectorAccent}
                lang={lang}
              />
            </div>

            {/* Signal-tag rail (TRUE-only) */}
            <div className="mt-4">
              <ContractSignalTags contract={contract} lang={lang} />
            </div>

            {/* Honest quality/era block (replaces the naked grade letter) */}
            {contract.data_quality_grade && (() => {
              const ERA: Record<string, string> = { A: '2002–2010', B: '2010–2017', C: '2018–2022', D: '2023–2025' }
              const struct = contract.source_structure
              const era = struct ? ERA[struct] : undefined
              const structText = struct
                ? `${lang === 'es' ? ' · Estructura' : ' · Structure'} ${struct}${era ? ` — ${era}` : ''}`
                : ''
              return (
                <p
                  className="mt-3"
                  style={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {lang === 'es' ? 'Calidad de datos ' : 'Data quality '}{contract.data_quality_grade}{structText}
                </p>
              )
            })()}
          </FadeIn>
        </section>

        {/* §2 · POR QUÉ — prod-true severity-ranked risk ledger (W1/W2/W5) */}
        <section id="por-que">
          <FadeIn>
            <DossierSectionHeader
              id="por-que"
              eyebrow={lang === 'es' ? 'Diagnóstico' : 'Diagnosis'}
              title={lang === 'es' ? 'Por qué está marcado' : "Why it's flagged"}
              meta={riskPct != null ? `${riskPct}/100` : undefined}
              accent={sectorAccent}
            />
            <RiskFactorLedger
              breakdown={riskBreakdown}
              explanation={explanation}
              contract={contract}
              riskPct={riskPct}
              lang={lang}
            />
          </FadeIn>
        </section>

        {/* §3 · EL COTEJO — size-in-context bullet + pair register (W6) */}
        <section id="cotejo">
          <FadeIn>
            <DossierSectionHeader
              id="cotejo"
              eyebrow={lang === 'es' ? 'Cotejo' : 'Cross-reference'}
              title={lang === 'es' ? 'El tamaño en contexto' : 'Size in context'}
              meta={
                context?.pair?.this_rank === 1
                  ? (lang === 'es' ? 'el mayor del par' : 'largest of the pair')
                  : undefined
              }
              accent={sectorAccent}
            />
            <ContractCotejo
              context={context}
              contract={contract}
              sectorName={sectorName ?? contract.sector_name ?? ''}
              sectorAccent={sectorAccent}
              lang={lang}
            />
          </FadeIn>
        </section>

      </div>

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* § ADÓNDE IR — mandatory coda: investigate CTA + entity chips (charter §II / §IV #13) */}
      <ChapterShell id="adonde-ir">
        <FadeIn>
          <SubheadRule label={lang === 'es' ? 'Adónde ir' : 'Where to go next'} />
          <div className="mt-7 max-w-3xl mx-auto">
            {/* Investigate CTA — amber, mono, uppercase */}
            <Link
              to="/aria"
              state={{ from: '/contracts', vendorId: contract.vendor_id }}
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
              style={{ fontSize: 11, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}
              aria-label={lang === 'es' ? 'Ver al proveedor en La Cola de investigación de ARIA' : 'See this vendor in the ARIA investigation queue'}
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              {lang === 'es' ? 'Ver proveedor en La Cola' : 'See vendor in the queue'} →
            </Link>

            {/* Related-entity chips — recomposed from already-fetched contract data */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {contract.vendor_id && contract.vendor_name && (
                <EntityIdentityChip
                  type="vendor"
                  id={contract.vendor_id}
                  name={contract.vendor_name}
                  riskScore={score > 0 ? score : null}
                  sectorCode={sectorCode}
                />
              )}
              {contract.institution_id && contract.institution_name && (
                <EntityIdentityChip
                  type="institution"
                  id={contract.institution_id}
                  name={contract.institution_name}
                  sectorCode={sectorCode}
                />
              )}
              {contract.sector_id != null && (sectorName ?? contract.sector_name) && (
                <EntityIdentityChip
                  type="sector"
                  id={contract.sector_id}
                  name={sectorName ?? contract.sector_name}
                  sectorCode={sectorCode}
                />
              )}
            </div>
          </div>
        </FadeIn>
      </ChapterShell>

      <ProvenanceFooter lang={lang} />
    </div>
  )
}

// ─── TransactionField ──────────────────────────────────────────────────────

function TransactionField({
  label,
  value,
  href,
  mono,
}: {
  label: string
  value: string
  href?: string
  mono?: boolean
}) {
  const navigate = useNavigate()
  const valueStyle: React.CSSProperties = {
    fontFamily: mono ? 'var(--font-family-mono, monospace)' : '"EB Garamond", Georgia, serif',
    fontSize: 14,
    color: 'var(--color-text-primary)',
    fontVariantNumeric: mono ? 'tabular-nums' : undefined,
    lineHeight: 1.4,
  }
  return (
    <div>
      <dt
        className="font-mono mb-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </dt>
      <dd>
        {href ? (
          <button
            type="button"
            onClick={() => navigate(href)}
            className="text-left hover:opacity-70 transition-opacity cursor-pointer"
            style={{ ...valueStyle, background: 'none', border: 'none', padding: 0 }}
          >
            {value}
          </button>
        ) : (
          <span style={valueStyle}>{value}</span>
        )}
      </dd>
    </div>
  )
}

// ─── Lede builder ──────────────────────────────────────────────────────────

function buildLede({
  contract,
  sectorName,
  riskBreakdown,
  lang,
}: {
  contract: Awaited<ReturnType<typeof contractApi.getById>>
  sectorName?: string
  riskBreakdown?: Awaited<ReturnType<typeof contractApi.getRiskBreakdown>>
  lang: 'en' | 'es'
}): string {
  const vendor = contract.vendor_name
    ? formatEntityName('vendor', contract.vendor_name)
    : (lang === 'es' ? 'un proveedor' : 'a vendor')
  const inst = contract.institution_name
    ? formatEntityName('institution', contract.institution_name)
    : (lang === 'es' ? 'una institución' : 'an institution')
  const yr = contract.contract_year ?? '—'
  // localizeProcedure returns a capitalized label ("Licitación pública"); lower
  // the initial for mid-sentence use ("…mediante licitación pública").
  const procLabel = localizeProcedure(contract.procedure_type_normalized ?? contract.procedure_type, lang)
  const procLower = procLabel === '—' ? '' : procLabel.charAt(0).toLowerCase() + procLabel.slice(1)
  const score = Number(contract.risk_score ?? 0)

  // Top factor by SEVERITY (never the v0.6.5-decoy weight) — feeds the critical lede.
  const topFactor = (() => {
    const factors = riskBreakdown?.factors ?? []
    if (!factors.length) return null
    const described = factors.map((f) => describeContractFactor(f, lang)).sort((a, b) => b.sortKey - a.sortKey)
    return described[0]?.severity ? described[0] : null
  })()

  if (score >= 0.60) {
    const via = procLower ? (lang === 'es' ? `mediante ${procLower}` : `via ${procLower}`) : ''
    const signal = topFactor ? topFactor.label.toLowerCase() : null
    if (lang === 'es') {
      const base = `${vendor} obtuvo este contrato de ${inst} en ${yr}${via ? ` ${via}` : ''}. El modelo de riesgo lo califica como crítico`
      return signal ? `${base} — la señal dominante: ${signal}.` : `${base}.`
    }
    const amount = formatCompactMXN(Number(contract.amount_mxn ?? 0))
    const base = `${vendor} obtained this ${amount} contract from ${inst} in ${yr}${via ? ` ${via}` : ''}. The risk model rates it critical`
    return signal ? `${base} — the leading signal: ${signal}.` : `${base}.`
  }
  return lang === 'es'
    ? `${vendor} recibió este contrato de ${inst} en ${yr}${procLower ? ` mediante ${procLower}` : ''}${sectorName ? `, dentro del sector ${sectorName}` : ''}.`
    : `${vendor} received this contract from ${inst} in ${yr}${procLower ? ` via ${procLower}` : ''}${sectorName ? `, within the ${sectorName} sector` : ''}.`
}
