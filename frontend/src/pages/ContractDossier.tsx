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
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'

import {
  ChapterShell,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

function toTitleCase(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
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

  // SHAP top-4 contributors
  const topContributors = (() => {
    const features = explanation?.features ?? []
    return [...features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 4)
  })()

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  const sectorName = lang === 'es'
    ? SECTORS.find((s) => s.id === contract.sector_id)?.name
    : SECTORS.find((s) => s.id === contract.sector_id)?.nameEN

  const lede = buildLede({ contract, sectorName, lang })

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

      {/* § THE TRANSACTION */}
      <ChapterShell id="transaction">
        <FadeIn>
          <SubheadRule label={lang === 'es' ? 'La transacción' : 'The transaction'} />
          <dl className="mt-7 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            <TransactionField
              label={lang === 'es' ? 'Proveedor' : 'Vendor'}
              value={contract.vendor_name ? toTitleCase(contract.vendor_name) : '—'}
              href={contract.vendor_id ? `/vendors/${contract.vendor_id}` : undefined}
            />
            <TransactionField
              label={lang === 'es' ? 'Institución' : 'Institution'}
              value={contract.institution_name ? toTitleCase(contract.institution_name) : '—'}
              href={contract.institution_id ? `/institutions/${contract.institution_id}` : undefined}
            />
            <TransactionField
              label={lang === 'es' ? 'Procedimiento' : 'Procedure'}
              value={contract.procedure_type_normalized ?? contract.procedure_type ?? '—'}
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
            {contract.sector_name && (
              <TransactionField
                label={lang === 'es' ? 'Sector' : 'Sector'}
                value={contract.sector_name}
              />
            )}
            {contract.data_quality_grade && (
              <TransactionField
                label={lang === 'es' ? 'Calidad de datos' : 'Data quality'}
                value={contract.data_quality_grade}
              />
            )}
            {contract.url && (
              <div className="sm:col-span-2 pt-2">
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
        </FadeIn>
      </ChapterShell>

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* § RISK READING */}
      <ChapterShell id="risk-reading">
        <FadeIn>
          <SubheadRule label={lang === 'es' ? 'Lectura del riesgo' : 'Risk reading'} />
          {explanation?.explanation_available && topContributors.length > 0 ? (
            <div className="mt-7 max-w-3xl mx-auto">
              <p
                className="mb-5"
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {lang === 'es'
                  ? `El modelo v0.8.5 marca este contrato en ${riskPct} de 100. Los factores que más empujan el veredicto:`
                  : `The v0.8.5 model rates this contract at ${riskPct} of 100. The factors pushing the verdict the most:`}
              </p>
              <ul className="space-y-3 list-none p-0">
                {topContributors.map((f, i) => {
                  const isPositive = f.contribution > 0
                  const factorColor = isPositive ? verdictColor : 'var(--color-text-muted)'
                  const sign = isPositive ? '+' : ''
                  return (
                    <li key={i} className="flex items-baseline gap-3 px-3 py-2" style={{ borderLeft: `2px solid ${factorColor}` }}>
                      <span style={{ fontSize: 11, color: factorColor, fontWeight: 700, minWidth: 14 }} aria-hidden="true">
                        {isPositive ? '▲' : '▽'}
                      </span>
                      <span
                        className="flex-1 min-w-0"
                        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}
                      >
                        {f.label}
                      </span>
                      <span
                        className="font-mono tabular-nums text-right flex-shrink-0"
                        style={{ fontSize: 11, color: factorColor, fontWeight: 700, minWidth: 60 }}
                      >
                        {sign}{f.contribution.toFixed(3)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {explanation.model_version && (
                <p
                  className="mt-5 font-mono text-center"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    opacity: 0.7,
                  }}
                >
                  {lang === 'es' ? 'modelo' : 'model'} {explanation.model_version} · {lang === 'es' ? 'descomposición SHAP' : 'SHAP decomposition'}
                </p>
              )}
            </div>
          ) : (
            <p
              className="mt-7 text-center"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--color-text-muted)',
              }}
            >
              {lang === 'es'
                ? 'No hay descomposición SHAP disponible para este contrato.'
                : 'No SHAP decomposition available for this contract.'}
            </p>
          )}
        </FadeIn>
      </ChapterShell>

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* § CONTEXT */}
      <ChapterShell id="context">
        <FadeIn>
          <SubheadRule label={lang === 'es' ? 'Contexto' : 'Context'} />
          <div className="mt-7 max-w-3xl mx-auto">
            <LedeParagraph sectorAccent={sectorAccent}>
              {lang === 'es'
                ? `Este contrato es uno de muchos entre ${contract.vendor_name ? toTitleCase(contract.vendor_name) : 'el proveedor'} y ${contract.institution_name ? toTitleCase(contract.institution_name) : 'la institución'}. Para entender el patrón, abra cualquiera de las dos fichas:`
                : `This contract is one of many between ${contract.vendor_name ? toTitleCase(contract.vendor_name) : 'the vendor'} and ${contract.institution_name ? toTitleCase(contract.institution_name) : 'the institution'}. To see the pattern, open either dossier:`}
            </LedeParagraph>
            <div className="mt-5 flex flex-wrap gap-3">
              {contract.vendor_id && contract.vendor_name && (
                <button
                  type="button"
                  onClick={() => navigate(`/vendors/${contract.vendor_id}`)}
                  className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.12em] hover:opacity-90 transition-opacity"
                  style={{
                    fontSize: 11,
                    background: sectorAccent,
                    color: '#fff',
                    padding: '10px 16px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {lang === 'es' ? 'Ficha del proveedor' : 'Open vendor dossier'} ↗
                </button>
              )}
              {contract.institution_id && contract.institution_name && (
                <button
                  type="button"
                  onClick={() => navigate(`/institutions/${contract.institution_id}`)}
                  className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.12em] hover:bg-background-card transition-colors"
                  style={{
                    fontSize: 11,
                    background: 'var(--color-background-elevated)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 16px',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'es' ? 'Ficha de la institución' : 'Open institution dossier'} ↗
                </button>
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
  lang,
}: {
  contract: Awaited<ReturnType<typeof contractApi.getById>>
  sectorName?: string
  lang: 'en' | 'es'
}): string {
  const vendor = contract.vendor_name ? toTitleCase(contract.vendor_name) : (lang === 'es' ? 'un proveedor' : 'a vendor')
  const inst = contract.institution_name ? toTitleCase(contract.institution_name) : (lang === 'es' ? 'una institución' : 'an institution')
  const yr = contract.contract_year ?? '—'
  const procType = (contract.procedure_type_normalized ?? contract.procedure_type ?? '').toLowerCase()
  const score = Number(contract.risk_score ?? 0)
  const isDA = contract.is_direct_award
  const isSB = contract.is_single_bid

  if (score >= 0.60) {
    return lang === 'es'
      ? `${vendor} obtuvo este contrato de ${inst} en ${yr} mediante ${procType || 'el procedimiento registrado'}. El modelo de riesgo lo califica como crítico — ${formatPctSafe(contract.amount_mxn)} y las señales de procuración lo confirman: ${isDA ? 'adjudicación directa' : ''}${isSB ? (isDA ? ' + ' : '') + 'único postor' : ''}.`
      : `${vendor} obtained this contract from ${inst} in ${yr} via ${procType || 'the recorded procedure'}. The risk model rates it critical — the procurement signals confirm it: ${isDA ? 'direct award' : ''}${isSB ? (isDA ? ' + ' : '') + 'single bid' : ''}.`
  }
  if (isDA) {
    return lang === 'es'
      ? `${vendor} recibió este contrato de ${inst} en ${yr} mediante adjudicación directa.`
      : `${vendor} received this contract from ${inst} in ${yr} via direct award.`
  }
  return lang === 'es'
    ? `${vendor} recibió este contrato de ${inst} en ${yr}${procType ? ` mediante ${procType}` : ''}${sectorName ? `, dentro del sector ${sectorName}` : ''}.`
    : `${vendor} received this contract from ${inst} in ${yr}${procType ? ` via ${procType}` : ''}${sectorName ? `, within the ${sectorName} sector` : ''}.`
}

function formatPctSafe(n: number | undefined): string {
  if (n == null) return '—'
  return formatCompactMXN(n)
}
