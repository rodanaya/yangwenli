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

import { FadeIn } from '@/components/dossier/primitives'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DossierSectionHeader } from '@/components/dossier/DossierSectionHeader'
import { ActaLedger } from '@/components/contract/ActaLedger'
import { RelationSection, getRelationSectionMeta } from '@/components/contract/RelationSection'
import { localizeProcedure, describeContractFactor, buildChargeLine, sanitizeContractText } from '@/lib/contract-format'
import { formatEntityName } from '@/lib/entity/format'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
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

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  const sectorName = lang === 'es'
    ? SECTORS.find((s) => s.id === contract.sector_id)?.name
    : SECTORS.find((s) => s.id === contract.sector_id)?.nameEN

  const lede = buildLede({ contract, sectorName, riskBreakdown, lang })
  const objectionCount = riskBreakdown?.factors?.length ?? 0
  const relMeta = getRelationSectionMeta(context)

  // Masthead: computed charge line (the finding), confidence interval, sanitized text.
  const charge = buildChargeLine(contract, context, riskBreakdown, lang)
  const ciLo = contract.risk_confidence_lower != null ? Math.round(Number(contract.risk_confidence_lower) * 100) : null
  const ciHi = contract.risk_confidence_upper != null ? Math.round(Number(contract.risk_confidence_upper) * 100) : null
  const hasCI = ciLo != null && ciHi != null
  const cleanDesc = sanitizeContractText(contract.description ?? contract.title)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest"
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
        <div className="pt-10 pb-8">
          <div className="flex items-baseline justify-between gap-4 mb-7">
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: 13,
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
              fontSize: 12,
              fontStyle: 'normal',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: sectorAccent,
              fontWeight: 500,
            }}
          >
            § {lang === 'es' ? 'EL SUMARIO · ACTA DE CONTRATO' : 'EL SUMARIO · CONTRACT RECORD'}
          </div>

          {/* Fused masthead band — amount + verdict share one baseline (W5) */}
          <div
            className="grid gap-6 lg:gap-10 items-baseline"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
              paddingTop: 20,
              paddingBottom: 20,
            }}
          >
            <div className="min-w-0">
              <h1
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 'clamp(44px, 5.5vw, 64px)',
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
            </div>

            {/* Verdict cell — shares the band baseline, vertical divider */}
            <div
              className="flex-shrink-0"
              style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 24, minWidth: 132 }}
            >
              <div
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 44,
                  lineHeight: 1,
                  color: verdictColor,
                  letterSpacing: '-0.02em',
                }}
              >
                {riskPct ?? '—'}
                <span
                  className="font-mono"
                  style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)', opacity: 0.55, letterSpacing: '0.06em' }}
                >
                  {' '}/100
                </span>
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: 12,
                  marginTop: 6,
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
              {hasCI && (
                <div
                  className="font-mono tabular-nums"
                  style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                >
                  {lang === 'es' ? 'IC' : 'CI'} {ciLo}–{ciHi}
                </div>
              )}
            </div>
          </div>

          {/* Charge line — the computed finding (W8), display size when high-stakes */}
          {charge && (
            <p
              className="tabular-nums"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'normal',
                fontSize: charge.tier === 'routine' ? 16 : 'clamp(19px, 2.2vw, 26px)',
                lineHeight: 1.3,
                color: charge.tier === 'routine' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                maxWidth: '48ch',
                marginTop: 18,
                borderLeft: `2px solid ${sectorAccent}`,
                paddingLeft: 16,
              }}
            >
              {charge.text}
            </p>
          )}

          {/* Sanitized description (W4) — 2-line clamp */}
          {cleanDesc && (
            <p
              className="mt-4"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'normal',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                maxWidth: '64ch',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {cleanDesc}
            </p>
          )}

          {/* Lede deck — the transaction sentence, demoted below the charge */}
          <p
            className="mt-3"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'normal',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
              maxWidth: '68ch',
              letterSpacing: '0.005em',
            }}
          >
            {lede}
          </p>
        </div>
      </header>

      {/* Remade body — «El Sumario»: the annotated record (§1 acta) then
          «La Prueba» pair-flow exhibit (§2). Reading column. */}
      <div className="mt-10 max-w-4xl mx-auto px-4 sm:px-8 space-y-10">

        {/* §1 · EL ACTA — the contract as an annotated record: risk-model
            objections pinned in the margin beside the field they indict.
            Merges the former §1 facts grid + §2 risk ledger + official card
            + signal tags into one acta (ActaLedger). */}
        <section id="acta">
          <FadeIn>
            <DossierSectionHeader
              id="acta"
              eyebrow={lang === 'es' ? 'Acta' : 'Record'}
              title={lang === 'es' ? 'El acta, anotada línea por línea' : 'The record, annotated line by line'}
              meta={
                objectionCount > 0
                  ? `${objectionCount} ${lang === 'es' ? 'objeciones' : 'objections'}`
                  : (riskPct != null ? `${riskPct}/100` : undefined)
              }
              accent={sectorAccent}
            />
            <p
              className="mb-4"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'normal',
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
              }}
            >
              {riskPct != null
                ? (lang === 'es'
                    ? `El modelo v0.8.5 lo marca en ${riskPct}/100 — las objeciones se anotan bajo la línea que señalan.`
                    : `The v0.8.5 model rates it ${riskPct}/100 — its objections are noted beneath the line they flag.`)
                : (lang === 'es'
                    ? 'Sin puntuación registrada para este contrato. El acta se presenta sin objeciones del modelo.'
                    : 'No recorded score for this contract. The record is presented without model objections.')}
            </p>
            <ActaLedger
              contract={contract}
              breakdown={riskBreakdown}
              explanation={explanation}
              context={context}
              riskPct={riskPct}
              sectorAccent={sectorAccent}
              lang={lang}
            />
            <p
              className="mt-3 font-mono"
              style={{ fontSize: 13, letterSpacing: '0.08em', color: 'var(--color-text-muted)', opacity: 0.75 }}
            >
              {lang === 'es'
                ? 'Factores ordenados por severidad — indicadores estadísticos, no probabilidades.'
                : 'Factors ranked by severity — statistical indicators, not probabilities.'}
            </p>
          </FadeIn>
        </section>

        {/* §2 · LA RELACIÓN — the vendor↔institution relationship drawn as a
            time ribbon with this contract inked and named (RelationRibbon);
            size-only RatioBullet fallback when the pair has ≤1 contract.
            Dual-mode header via getRelationSectionMeta. */}
        {relMeta.mode !== 'none' && (
          <section id="cotejo">
            <FadeIn>
              <DossierSectionHeader
                id="cotejo"
                eyebrow={lang === 'es' ? relMeta.eyebrow.es : relMeta.eyebrow.en}
                title={lang === 'es' ? relMeta.title.es : relMeta.title.en}
                meta={relMeta.meta ? (lang === 'es' ? relMeta.meta.es : relMeta.meta.en) : undefined}
                accent={sectorAccent}
              />
              <RelationSection
                context={context}
                contract={contract}
                sectorName={sectorName ?? contract.sector_name ?? ''}
                sectorAccent={sectorAccent}
                lang={lang}
              />
            </FadeIn>
          </section>
        )}

      </div>

      {/* § TERMINAL BAND — coda (adónde ir) + provenance fused into one band (W1/W7) */}
      <section
        id="adonde-ir"
        className="max-w-4xl mx-auto px-4 sm:px-8"
        style={{ borderTop: '1px solid var(--color-border)', marginTop: 40, paddingTop: 28, paddingBottom: 48 }}
      >
        <FadeIn>
          <div className="grid gap-8 md:gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,44ch)]">
            {/* Left — Adónde ir */}
            <div>
              <p
                className="font-mono mb-4"
                style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
              >
                § {lang === 'es' ? 'Adónde ir' : 'Where to go next'}
              </p>
              <Link
                to="/aria"
                state={{ from: '/contracts', vendorId: contract.vendor_id }}
                className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                style={{ fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}
                aria-label={lang === 'es' ? 'Ver al proveedor en la Lista de Vigilancia de ARIA' : 'See this vendor in the ARIA Watchlist'}
              >
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                {lang === 'es' ? 'Ver proveedor en la Lista de Vigilancia' : 'See vendor in the Watchlist'} →
              </Link>

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

            {/* Right — Metodología y procedencia */}
            <div id="methodology">
              <p
                className="font-mono mb-3"
                style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
              >
                § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
              </p>
              <p
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'normal',
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {lang === 'es'
                  ? 'Datos COMPRANET 2002–2025. La puntuación de riesgo y sus factores provienen del modelo v0.8.5; son indicadores estadísticos, no determinaciones legales.'
                  : 'COMPRANET data 2002–2025. The risk score and its factors come from the v0.8.5 model; they are statistical indicators, not legal determinations.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/methodology')}
                className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
                style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: 0 }}
              >
                {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
              </button>
            </div>
          </div>
        </FadeIn>
      </section>
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
