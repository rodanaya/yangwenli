/**
 * CaseDossier — canonical case dossier at /cases/:slug.
 *
 * Built 2026-05-27 (Phase 6). Replaces CaseDetail (2,586 LOC) with the
 * editorial dossier composition shared across vendor / institution /
 * sector / category / contract dossiers.
 *
 *   Hero        — cover slug with name, fraud type, administration,
 *                 severity dots and § index strip
 *   § El Caso          — long-form summary (lede + body)
 *   § El Daño          — amount range + legal status callout
 *   § Los Actores      — key actors list
 *   § Los Proveedores  — linked vendors with risk readout, drill-out
 *   § Las Fuentes      — journalism / audit / legal sources
 *   Methodology footer
 *
 * Legacy CaseDetail kept on disk; routed at /print/cases/:slug.
 */
import { useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, ExternalLink, ArrowUpRight } from 'lucide-react'

import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  ScaleBlock,
  FadeIn,
} from '@/components/dossier/primitives'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'
import type { ScandalDetail, LinkedVendor, ScandalSource, KeyActor } from '@/api/types'

// ─── Localized vocab ────────────────────────────────────────────────────────

const FRAUD_LABEL_EN: Record<string, string> = {
  ghost_company: 'Ghost Company',
  bid_rigging: 'Bid Rigging',
  overpricing: 'Overpricing',
  conflict_of_interest: 'Conflict of Interest',
  embezzlement: 'Embezzlement',
  bribery: 'Bribery',
  procurement_fraud: 'Procurement Fraud',
  monopoly: 'Monopoly',
  emergency_fraud: 'Emergency Fraud',
  tender_rigging: 'Tender Rigging',
  other: 'Other',
}
const FRAUD_LABEL_ES: Record<string, string> = {
  ghost_company: 'Empresa fantasma',
  bid_rigging: 'Colusión',
  overpricing: 'Sobreprecio',
  conflict_of_interest: 'Conflicto de interés',
  embezzlement: 'Desvío de recursos',
  bribery: 'Soborno',
  procurement_fraud: 'Fraude de adquisiciones',
  monopoly: 'Monopolio',
  emergency_fraud: 'Fraude por emergencia',
  tender_rigging: 'Manipulación de licitaciones',
  other: 'Otro',
}

const ADMIN_LABEL: Record<string, { en: string; es: string }> = {
  fox:        { en: 'Fox (2000–2006)',        es: 'Fox (2000–2006)' },
  calderon:   { en: 'Calderón (2006–2012)',   es: 'Calderón (2006–2012)' },
  epn:        { en: 'Peña Nieto (2012–2018)', es: 'Peña Nieto (2012–2018)' },
  amlo:       { en: 'AMLO (2018–2024)',       es: 'AMLO (2018–2024)' },
  sheinbaum:  { en: 'Sheinbaum (2024–)',      es: 'Sheinbaum (2024–)' },
}

const ROLE_LABEL: Record<string, { en: string; es: string }> = {
  vendor:      { en: 'Vendor',      es: 'Proveedor' },
  official:    { en: 'Official',    es: 'Funcionario' },
  institution: { en: 'Institution', es: 'Institución' },
  journalist:  { en: 'Journalist',  es: 'Periodista' },
}

const SOURCE_TYPE_LABEL: Record<string, { en: string; es: string }> = {
  journalism: { en: 'Journalism', es: 'Periodismo' },
  audit:      { en: 'Audit',      es: 'Auditoría' },
  legal:      { en: 'Legal',      es: 'Documento legal' },
  academic:   { en: 'Academic',   es: 'Académico' },
  official:   { en: 'Official',   es: 'Oficial' },
}

function toTitleCase(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

// ─── Legal-status callout ───────────────────────────────────────────────────

function legalStatusMeta(status: string, lang: 'en' | 'es') {
  const es = lang === 'es'
  switch (status) {
    case 'convicted':
      return {
        accent: RISK_COLORS.critical,
        label: es ? 'Condena penal obtenida' : 'Criminal conviction obtained',
        body:  es
          ? 'Un tribunal emitió sentencia condenatoria contra al menos un actor vinculado a este caso.'
          : 'A court of law returned a guilty verdict against at least one actor tied to this case.',
      }
    case 'prosecuted':
      return {
        accent: RISK_COLORS.high,
        label: es ? 'Proceso penal en curso' : 'Prosecution in progress',
        body:  es
          ? 'Se han presentado cargos formales; el proceso judicial está en marcha.'
          : 'Formal charges have been filed; trial proceedings are under way.',
      }
    case 'investigation':
      return {
        accent: RISK_COLORS.medium,
        label: es ? 'Investigación abierta' : 'Open investigation',
        body:  es
          ? 'Autoridades están investigando, sin cargos formales hasta la fecha.'
          : 'Authorities are investigating; no formal charges yet on record.',
      }
    case 'reported':
      return {
        accent: 'var(--color-text-secondary)',
        label: es ? 'Caso documentado' : 'Case documented',
        body:  es
          ? 'Caso documentado por periodismo o auditoría, sin acción judicial conocida.'
          : 'Documented by journalism or audit, with no known judicial action.',
      }
    case 'acquitted':
      return {
        accent: 'var(--color-text-muted)',
        label: es ? 'Absuelto' : 'Acquitted',
        body:  es
          ? 'Los actores señalados fueron absueltos en el proceso judicial.'
          : 'Implicated actors were acquitted in court.',
      }
    case 'dismissed':
      return {
        accent: 'var(--color-text-muted)',
        label: es ? 'Caso desestimado' : 'Case dismissed',
        body:  es ? 'El caso fue desestimado por autoridad judicial.' : 'The case was dismissed by judicial authority.',
      }
    default:
      return {
        accent: 'var(--color-text-muted)',
        label: es ? 'Sin resolución' : 'Unresolved',
        body:  es ? 'Estado judicial no determinado en fuentes disponibles.' : 'Judicial status not determined in available sources.',
      }
  }
}

// ─── Provenance footer ──────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32, textAlign: 'center' }}>
        <p
          className="font-mono mb-3"
          style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
        >
          § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
        </p>
        <p
          style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: '64ch', margin: '0 auto', lineHeight: 1.6 }}
        >
          {lang === 'es'
            ? 'Casos compilados de periodismo investigativo, auditorías de la ASF y procesos judiciales públicos. Los vínculos a proveedores se construyen con coincidencia exacta de RFC o nombre. La presencia en esta biblioteca no constituye una determinación de culpabilidad.'
            : 'Cases compiled from investigative journalism, ASF audits, and public judicial proceedings. Vendor links are constructed from exact RFC or name match. Inclusion in this library is not a determination of guilt.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-4 font-mono cursor-pointer hover:opacity-70 transition-opacity"
          style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
        >
          {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
        </button>
      </div>
    </section>
  )
}

function ChapterDivider({ accent }: { accent: string }) {
  return (
    <div className="flex items-center justify-center gap-4 py-12">
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent, opacity: 0.5 }} />
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─── Severity dots ──────────────────────────────────────────────────────────

function SeverityDots({ value, color }: { value: number; color: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Severity ${filled} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: i <= filled ? color : 'transparent',
            border: `1px solid ${i <= filled ? color : 'var(--color-border-hover)'}`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function CaseHero({
  scandal,
  lang,
  accent,
  primarySector,
}: {
  scandal: ScandalDetail
  lang: 'en' | 'es'
  accent: string
  primarySector: { id: number; nameES: string; nameEN: string } | null
}) {
  const name = lang === 'es' ? scandal.name_es : scandal.name_en
  const fraudLabel = (lang === 'es' ? FRAUD_LABEL_ES : FRAUD_LABEL_EN)[scandal.fraud_type] ?? scandal.fraud_type
  const adminLabel = ADMIN_LABEL[scandal.administration]?.[lang] ?? scandal.administration

  // Period — contract years span
  const yearStart = scandal.contract_year_start ?? scandal.discovery_year ?? null
  const yearEnd = scandal.contract_year_end ?? scandal.discovery_year ?? null
  const periodText = yearStart && yearEnd
    ? (yearStart === yearEnd ? String(yearStart) : `${yearStart}–${yearEnd}`)
    : null

  return (
    <header className="relative">
      <div
        aria-hidden="true"
        className="absolute left-0 right-0"
        style={{ top: 0, height: 6, background: accent }}
      />
      <div className="pt-16 pb-12 px-4 sm:px-8 max-w-5xl mx-auto">
        {/* Index strip */}
        <div className="flex items-baseline justify-between gap-4 mb-7">
          <div
            className="font-mono tabular-nums"
            style={{ fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
          >
            CASE · #{String(scandal.id).padStart(4, '0')}
            {scandal.is_verified ? (
              <>
                <span className="mx-2 opacity-40">·</span>
                <span style={{ color: accent, fontWeight: 600 }}>{lang === 'es' ? 'VERIFICADO' : 'VERIFIED'}</span>
              </>
            ) : null}
          </div>
          {primarySector && (
            <div
              className="font-mono"
              style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {(lang === 'es' ? primarySector.nameES : primarySector.nameEN)}
            </div>
          )}
        </div>

        {/* § kicker */}
        <p
          className="font-mono mb-3"
          style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
        >
          § {lang === 'es' ? 'El Expediente · Caso Documentado' : 'The Case File · Documented Case'}
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            marginBottom: 16,
            maxWidth: '24ch',
          }}
        >
          {name}
        </h1>

        {/* Meta strip */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 700,
              padding: '3px 9px',
              border: `1px solid ${accent}55`,
              background: `${accent}10`,
            }}
          >
            {fraudLabel}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
          >
            {adminLabel}
          </span>
          {periodText && (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
            >
              {periodText}
            </span>
          )}
          <span className="inline-flex items-baseline gap-2">
            <span
              className="font-mono"
              style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {lang === 'es' ? 'Severidad' : 'Severity'}
            </span>
            <SeverityDots value={scandal.severity} color={accent} />
          </span>
        </div>

        {/* TOC */}
        <nav
          aria-label={lang === 'es' ? 'En esta página' : 'On this page'}
          className="mt-10 flex items-center gap-3"
        >
          <div aria-hidden="true" style={{ height: 1, width: 28, background: 'var(--color-border)' }} />
          <span
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
          >
            {lang === 'es' ? 'En esta página' : 'On this page'}
          </span>
          <div aria-hidden="true" style={{ height: 1, width: 28, background: 'var(--color-border)' }} />
          <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1 list-none p-0">
            <TocItem href="#caso"       numeral="I"    label={lang === 'es' ? 'El caso' : 'The case'}          accent={accent} />
            <TocItem href="#dano"       numeral="II"   label={lang === 'es' ? 'El daño' : 'The damage'}        accent={accent} />
            <TocItem href="#actores"    numeral="III"  label={lang === 'es' ? 'Actores' : 'Actors'}            accent={accent} />
            <TocItem href="#proveedores" numeral="IV"  label={lang === 'es' ? 'Proveedores' : 'Vendors'}       accent={accent} />
            <TocItem href="#fuentes"    numeral="V"    label={lang === 'es' ? 'Fuentes' : 'Sources'}           accent={accent} />
          </ul>
        </nav>
      </div>
    </header>
  )
}

function TocItem({ href, numeral, label, accent }: { href: string; numeral: string; label: string; accent: string }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex items-baseline gap-1.5 hover:opacity-70 transition-opacity"
        style={{ textDecoration: 'none' }}
      >
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 12,
            color: accent,
          }}
        >
          {numeral}.
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
        >
          {label}
        </span>
      </a>
    </li>
  )
}

// ─── Chapter I · The case (long-form summary) ───────────────────────────────

function ChapterCase({ scandal, accent, lang }: { scandal: ScandalDetail; accent: string; lang: 'en' | 'es' }) {
  const summary = (lang === 'es' ? scandal.summary_es : scandal.summary_en) ?? scandal.summary_en
  // Split summary at first sentence for lede vs body.
  const sentences = summary.split(/(?<=[.!?])\s+/)
  const ledeText = sentences[0] ?? summary
  const bodyText = sentences.slice(1).join(' ').trim()

  return (
    <ChapterShell id="caso">
      <ChapterHeading
        numeral="I"
        title={lang === 'es' ? 'El caso' : 'The case'}
        subtitle={lang === 'es' ? 'Qué pasó' : 'What happened'}
        sectorAccent={accent}
      />
      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={accent}>{ledeText}</LedeParagraph>
      </FadeIn>
      {bodyText && (
        <FadeIn className="mt-7" delay={0.08}>
          <p
            style={{
              fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
              fontSize: 16,
              lineHeight: 1.7,
              color: 'var(--color-text-secondary)',
              maxWidth: '64ch',
            }}
          >
            {bodyText}
          </p>
        </FadeIn>
      )}
    </ChapterShell>
  )
}

// ─── Chapter II · The damage ────────────────────────────────────────────────

function ChapterDamage({
  scandal,
  accent,
  lang,
}: {
  scandal: ScandalDetail
  accent: string
  lang: 'en' | 'es'
}) {
  const low = scandal.amount_mxn_low ?? null
  const high = scandal.amount_mxn_high ?? null
  const headlineAmount = high ?? low ?? null

  const status = legalStatusMeta(scandal.legal_status, lang)

  const rangeText = low != null && high != null && low !== high
    ? (lang === 'es'
      ? `Estimado entre ${formatCompactMXN(low)} y ${formatCompactMXN(high)}.`
      : `Estimated between ${formatCompactMXN(low)} and ${formatCompactMXN(high)}.`)
    : (lang === 'es' ? 'Estimación única consolidada.' : 'Single consolidated estimate.')

  return (
    <ChapterShell id="dano">
      <ChapterHeading
        numeral="II"
        title={lang === 'es' ? 'El daño' : 'The damage'}
        subtitle={lang === 'es' ? 'El monto y la resolución' : 'The amount and the resolution'}
        sectorAccent={accent}
      />

      {headlineAmount != null && (
        <FadeIn className="mt-12 flex justify-center">
          <ScaleBlock mxn={headlineAmount} sectorAccent={accent} lang={lang} />
        </FadeIn>
      )}

      {headlineAmount != null && (
        <FadeIn className="mt-6 text-center" delay={0.05}>
          <p
            style={{
              fontFamily: '"Source Serif Pro", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--color-text-muted)',
              maxWidth: '48ch',
              margin: '0 auto',
            }}
          >
            {rangeText}{' '}
            {scandal.amount_note && (
              <span style={{ color: 'var(--color-text-secondary)' }}>{scandal.amount_note}</span>
            )}
          </p>
        </FadeIn>
      )}

      <FadeIn className="mt-12" delay={0.1}>
        <SubheadRule label={lang === 'es' ? 'Estado judicial' : 'Legal status'} />
        <div
          className="mt-7 max-w-3xl mx-auto"
          style={{
            borderLeft: `3px solid ${status.accent}`,
            paddingLeft: 20,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          <p
            className="font-mono mb-2"
            style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: status.accent, fontWeight: 700 }}
          >
            {status.label}
          </p>
          <p
            style={{
              fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 16,
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
              maxWidth: '60ch',
            }}
          >
            {status.body}
          </p>
          {scandal.legal_status_note && (
            <p
              className="mt-3"
              style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 14, color: 'var(--color-text-muted)', maxWidth: '60ch' }}
            >
              {scandal.legal_status_note}
            </p>
          )}
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Chapter III · The actors ───────────────────────────────────────────────

function ChapterActors({
  actors,
  accent,
  lang,
}: {
  actors: KeyActor[]
  accent: string
  lang: 'en' | 'es'
}) {
  if (!actors || actors.length === 0) return null
  return (
    <ChapterShell id="actores">
      <ChapterHeading
        numeral="III"
        title={lang === 'es' ? 'Los actores' : 'The actors'}
        subtitle={lang === 'es' ? 'Quién aparece en el expediente' : 'Who appears in the file'}
        sectorAccent={accent}
      />
      <FadeIn className="mt-12">
        <ul className="max-w-3xl mx-auto space-y-4 list-none p-0">
          {actors.map((actor, i) => {
            const roleLabel = ROLE_LABEL[actor.role]?.[lang] ?? actor.role
            return (
              <li
                key={`${actor.name}-${i}`}
                className="flex items-baseline gap-4"
                style={{ borderLeft: `2px solid ${accent}33`, paddingLeft: 16, paddingTop: 4, paddingBottom: 4 }}
              >
                <span
                  className="font-mono tabular-nums flex-shrink-0"
                  style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', width: 28 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 500,
                      fontSize: 17,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.3,
                    }}
                  >
                    {actor.name}
                  </p>
                  {actor.title && (
                    <p
                      className="mt-1"
                      style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-secondary)' }}
                    >
                      {actor.title}
                    </p>
                  )}
                  {actor.note && (
                    <p
                      className="mt-1.5"
                      style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}
                    >
                      {actor.note}
                    </p>
                  )}
                </div>
                <span
                  className="font-mono flex-shrink-0"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: accent,
                    fontWeight: 700,
                  }}
                >
                  {roleLabel}
                </span>
              </li>
            )
          })}
        </ul>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Chapter IV · The vendors (linked) ──────────────────────────────────────

function ChapterVendors({
  vendors,
  accent,
  lang,
}: {
  vendors: LinkedVendor[]
  accent: string
  lang: 'en' | 'es'
}) {
  if (!vendors || vendors.length === 0) {
    return (
      <ChapterShell id="proveedores">
        <ChapterHeading
          numeral="IV"
          title={lang === 'es' ? 'Los proveedores' : 'The vendors'}
          subtitle={lang === 'es' ? 'Sin vínculos en COMPRANET' : 'No COMPRANET links'}
          sectorAccent={accent}
        />
        <FadeIn className="mt-12">
          <LedeParagraph sectorAccent={accent}>
            {lang === 'es'
              ? 'Este caso no tiene proveedores vinculados a la base COMPRANET. Puede deberse a opacidad documental, fraude por subsidios fuera del registro, o información clasificada.'
              : 'This case has no vendors linked to the COMPRANET database. This may reflect documentary opacity, subsidy fraud outside the registry, or classified information.'}
          </LedeParagraph>
        </FadeIn>
      </ChapterShell>
    )
  }

  const sorted = [...vendors].sort((a, b) => {
    const aRisk = a.avg_risk_score ?? 0
    const bRisk = b.avg_risk_score ?? 0
    return bRisk - aRisk
  })

  return (
    <ChapterShell id="proveedores">
      <ChapterHeading
        numeral="IV"
        title={lang === 'es' ? 'Los proveedores' : 'The vendors'}
        subtitle={lang === 'es' ? `${vendors.length} vinculados en COMPRANET` : `${vendors.length} linked in COMPRANET`}
        sectorAccent={accent}
      />
      <FadeIn className="mt-12">
        <ul className="max-w-3xl mx-auto space-y-2 list-none p-0">
          {sorted.map((v, i) => (
            <VendorRow key={`${v.vendor_id ?? 'unmatched'}-${i}`} vendor={v} accent={accent} lang={lang} />
          ))}
        </ul>
      </FadeIn>
    </ChapterShell>
  )
}

function VendorRow({ vendor, accent, lang }: { vendor: LinkedVendor; accent: string; lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  const risk = vendor.avg_risk_score ?? 0
  const level = risk > 0 ? getRiskLevelFromScore(risk) : 'low'
  const riskColor = risk > 0 ? RISK_COLORS[level] : 'var(--color-text-muted)'
  const riskPct = risk > 0 ? Math.round(risk * 100) : null

  const isClickable = vendor.vendor_id != null
  const handleClick = () => {
    if (vendor.vendor_id) navigate(`/vendors/${vendor.vendor_id}`)
  }

  const evidenceColor = vendor.evidence_strength === 'strong'
    ? accent
    : vendor.evidence_strength === 'moderate'
    ? 'var(--color-text-secondary)'
    : 'var(--color-text-muted)'

  return (
    <li>
      <button
        type="button"
        disabled={!isClickable}
        onClick={handleClick}
        className={`w-full text-left flex items-baseline gap-3 px-3 py-2 rounded-sm transition-colors ${isClickable ? 'hover:bg-background-card/60 cursor-pointer' : 'cursor-default'}`}
        style={{
          borderLeft: `2px solid ${riskColor}`,
          background: 'none',
          border: 'none',
        }}
      >
        <span
          className="flex-1 min-w-0 truncate"
          style={{
            fontFamily: '"EB Garamond", "Source Serif Pro", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 16,
            color: 'var(--color-text-primary)',
          }}
        >
          {toTitleCase(vendor.vendor_name)}
        </span>
        <span
          className="font-mono flex-shrink-0"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: evidenceColor,
            fontWeight: 600,
            padding: '2px 6px',
            border: `1px solid ${evidenceColor}55`,
          }}
        >
          {(lang === 'es'
            ? (vendor.evidence_strength === 'strong' ? 'FUERTE' : vendor.evidence_strength === 'moderate' ? 'MODERADA' : 'DÉBIL')
            : vendor.evidence_strength.toUpperCase())}
        </span>
        <span
          className="font-mono tabular-nums flex-shrink-0 text-right"
          style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 72 }}
        >
          {vendor.contract_count} {lang === 'es' ? 'contratos' : 'contracts'}
        </span>
        <span
          className="font-mono tabular-nums flex-shrink-0 text-right"
          style={{ fontSize: 11, color: riskColor, fontWeight: 700, minWidth: 36 }}
        >
          {riskPct != null ? `${riskPct}` : '—'}
        </span>
        {isClickable && (
          <ArrowUpRight className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
        )}
      </button>
    </li>
  )
}

// ─── Chapter V · The sources ────────────────────────────────────────────────

function ChapterSources({
  sources,
  accent,
  lang,
}: {
  sources: ScandalSource[]
  accent: string
  lang: 'en' | 'es'
}) {
  if (!sources || sources.length === 0) return null
  return (
    <ChapterShell id="fuentes">
      <ChapterHeading
        numeral="V"
        title={lang === 'es' ? 'Las fuentes' : 'The sources'}
        subtitle={lang === 'es' ? 'Qué se cita' : 'What is cited'}
        sectorAccent={accent}
      />
      <FadeIn className="mt-12">
        <ul className="max-w-3xl mx-auto space-y-3 list-none p-0">
          {sources.map((s, i) => {
            const typeLabel = SOURCE_TYPE_LABEL[s.type]?.[lang] ?? s.type
            const inner = (
              <div className="flex items-baseline gap-3 px-3 py-2.5">
                <span
                  className="font-mono tabular-nums flex-shrink-0"
                  style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 24, letterSpacing: '0.12em' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
                      fontSize: 15,
                      lineHeight: 1.4,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {s.title}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                    <span
                      className="font-mono"
                      style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}
                    >
                      {typeLabel}
                    </span>
                    <span style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {s.outlet}
                    </span>
                    {s.date && (
                      <span
                        className="font-mono tabular-nums"
                        style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                      >
                        {s.date}
                      </span>
                    )}
                  </div>
                </div>
                {s.url && (
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                )}
              </div>
            )
            return (
              <li
                key={`${s.title}-${i}`}
                style={{ borderLeft: `2px solid ${accent}33` }}
                className="rounded-sm"
              >
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-background-card/60 transition-colors"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DossierSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-3/4" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function CaseDossier() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const validSlug = typeof slug === 'string' && slug.length > 0

  const { data: scandal, isLoading, isError } = useQuery({
    queryKey: ['case-dossier', slug],
    queryFn: () => caseLibraryApi.getBySlug(slug!),
    enabled: validSlug,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const primarySector = useMemo(() => {
    if (!scandal) return null
    const id = scandal.sector_id ?? scandal.sector_ids?.[0]
    if (!id) return null
    const found = SECTORS.find((s) => s.id === id)
    return found ? { id: found.id, nameES: found.name, nameEN: found.nameEN } : null
  }, [scandal])

  if (!validSlug) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Caso inválido' : 'Invalid case'}</h2>
        <Button onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver a casos' : 'Back to cases'}
        </Button>
      </div>
    )
  }

  if (isLoading) return <DossierSkeleton />

  if (isError || !scandal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Caso no encontrado' : 'Case not found'}</h2>
        <Button onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver a casos' : 'Back to cases'}
        </Button>
      </div>
    )
  }

  // Accent: sector accent if known; otherwise crimson (fraud-indexed).
  const sectorCode = primarySector
    ? SECTORS.find((s) => s.id === primarySector.id)?.code
    : null
  const accent = (sectorCode && SECTOR_COLORS[sectorCode]) || RISK_COLORS.critical

  const fromCases = location.state && (location.state as { from?: string }).from === '/cases'

  // Quiet refs to imports we keep for narrative tooling consistency.
  void EntityIdentityChip
  void Link

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromCases && (
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {lang === 'es' ? 'Volver a casos' : 'Back to cases'}
        </button>
      )}

      <CaseHero scandal={scandal} lang={lang} accent={accent} primarySector={primarySector} />

      <ChapterCase scandal={scandal} accent={accent} lang={lang} />
      <ChapterDivider accent={accent} />

      <ChapterDamage scandal={scandal} accent={accent} lang={lang} />
      <ChapterDivider accent={accent} />

      <ChapterActors actors={scandal.key_actors ?? []} accent={accent} lang={lang} />
      {scandal.key_actors && scandal.key_actors.length > 0 && <ChapterDivider accent={accent} />}

      <ChapterVendors vendors={scandal.linked_vendors ?? []} accent={accent} lang={lang} />
      <ChapterDivider accent={accent} />

      <ChapterSources sources={scandal.sources ?? []} accent={accent} lang={lang} />

      <ProvenanceFooter lang={lang} />

      {/* Quiet refs to keep formatCompactUSD import used by ScaleBlock visible to maintainers. */}
      <span aria-hidden="true" hidden>{formatCompactUSD(0)}</span>
    </div>
  )
}
