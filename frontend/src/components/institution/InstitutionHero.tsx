/**
 * InstitutionHero — cover slug for the unified institution dossier.
 *
 * Built 2026-05-26 (DESIGNUS round 7, Phase 2 component 1/5). Mirrors
 * VendorHero's NYT/ICIJ investigation aesthetic but scoped to institution
 * semantics:
 *
 *   - Identity = institution name + siglas chip + sector accent
 *   - Verdict = high-risk-contracts % (the institution-level signal),
 *     not avg risk score (which is dominated by their LOW-risk routine
 *     procurement and doesn't tell the institutional story)
 *   - Lede = data-driven, frames the spending portrait
 *   - TOC anchors point to: subject · timeline · suppliers · spending ·
 *     risk · methodology
 */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import type { InstitutionDetailResponse } from '@/api/types'
import {
  RISK_COLORS,
  SECTOR_COLORS,
  SECTORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import {
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
} from '@/lib/utils'

// Dossier section anchors — the five narrative chapters were removed in the
// 2026-06-03 operational rebuild; these are the real reference sections.
const TOC_ANCHORS: Array<{ id: string; en: string; es: string; numeral?: string }> = [
  { id: 'suppliers',   en: 'Suppliers',   es: 'Proveedores' },
  { id: 'methodology', en: 'Methodology', es: 'Metodología' },
]

interface InstitutionHeroProps {
  institution: InstitutionDetailResponse
  actions?: ReactNode
  showTOC?: boolean
}

export function InstitutionHero({
  institution,
  actions,
  showTOC = true,
}: InstitutionHeroProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es')
  const lang: 'en' | 'es' = isEs ? 'es' : 'en'

  const sectorCode = SECTORS.find((s) => s.id === institution.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#64748b'
  const sectorName = lang === 'es' ? SECTORS.find((s) => s.code === sectorCode)?.name : SECTORS.find((s) => s.code === sectorCode)?.nameEN

  // Verdict number = high-risk contract percentage (the institutional signal)
  const hrPct = institution.high_risk_pct ?? institution.high_risk_percentage ?? 0
  const avgRisk = institution.avg_risk_score ?? 0
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const hrLevel: 'critical' | 'high' | 'medium' | 'low' =
    hrPct >= 25 ? 'critical' : hrPct >= 15 ? 'high' : hrPct >= 5 ? 'medium' : 'low'
  const verdictColor = RISK_COLORS[hrLevel]

  const editorialName = toTitleCase(institution.name)
  const lede = buildInstitutionLede({ institution, sectorName, lang })

  return (
    <header className="relative">
      <div
        aria-hidden="true"
        className="absolute left-0 right-0"
        style={{
          top: 0,
          height: 6,
          background: sectorAccent,
        }}
      />

      <div className="pt-8 pb-6">
        {/* Row 1 — index strip + actions */}
        <div className="flex items-baseline justify-between gap-4 mb-5">
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
            INST · I-{String(institution.id).padStart(5, '0')}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">{actions}</div>
          )}
        </div>

        {/* Row 2 — § kicker */}
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
          § {lang === 'es' ? 'EL EXPEDIENTE · INSTITUCIÓN' : 'EL EXPEDIENTE · INSTITUTION DOSSIER'}
        </div>

        {/* Row 3 — headline + verdict card */}
        <div className="grid gap-6 lg:gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
          <div className="min-w-0">
            <h1
              className="text-balance mb-1.5"
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(32px, 4.4vw, 48px)',
                lineHeight: 1.04,
                letterSpacing: '-0.012em',
                color: 'var(--color-text-primary)',
              }}
            >
              {editorialName}
            </h1>
            {institution.siglas && (
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
                {institution.siglas}
              </div>
            )}

            {/* Metadata rule */}
            <div className="mt-4" style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 14 }}>
              <InstitutionMetaRule
                institution={institution}
                sectorName={sectorName ?? null}
                lang={lang}
              />
            </div>
          </div>

          {/* Verdict card seal */}
          <VerdictCard
            hrPct={hrPct}
            hrLevel={hrLevel}
            verdictColor={verdictColor}
            avgRisk={avgRisk}
            riskLevel={riskLevel}
            lang={lang}
          />
        </div>

        {/* Hairline */}
        <div aria-hidden="true" className="mt-6" style={{ height: 1, background: 'var(--color-border)' }} />

        {/* Lede */}
        <div className="mt-6" style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 20, maxWidth: '68ch' }}>
          <p
            style={{
              fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.005em',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: '3.5em',
                float: 'left',
                lineHeight: 0.85,
                color: sectorAccent,
                marginRight: '0.08em',
                marginTop: '0.05em',
                marginBottom: '-0.05em',
              }}
            >
              {editorialName.charAt(0)}
            </span>
            {editorialName.slice(1) + ' '}
            {lede.replace(/^[^.]+\.\s*/, '')}
          </p>
        </div>

        {/* TOC */}
        {showTOC && (
          <OnThePageStrip sectorAccent={sectorAccent} lang={lang} />
        )}
      </div>
    </header>
  )
}

// ───────────────────── subcomponents ────────────────────────────────────────

function VerdictCard({
  hrPct,
  hrLevel,
  verdictColor,
  avgRisk,
  riskLevel,
  lang,
}: {
  hrPct: number
  hrLevel: 'critical' | 'high' | 'medium' | 'low'
  verdictColor: string
  avgRisk: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  lang: 'en' | 'es'
}) {
  const avgRiskPct = Math.round(avgRisk * 100)
  return (
    <aside
      className="flex-shrink-0 relative"
      style={{ width: 168, paddingTop: 6, paddingBottom: 8, paddingLeft: 18, paddingRight: 18 }}
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0"
        style={{ height: 2, background: verdictColor }}
      />
      <div className="text-center">
        <div
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 46,
            lineHeight: 1,
            color: verdictColor,
            letterSpacing: '-0.02em',
          }}
        >
          {hrPct.toFixed(0)}
          <span className="font-mono" style={{ fontSize: 18, fontStyle: 'normal', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 2 }}>%</span>
        </div>
        <div
          className="font-mono mt-1"
          style={{ fontSize: 9, color: 'var(--color-text-muted)', opacity: 0.6, letterSpacing: '0.10em', textTransform: 'uppercase' }}
        >
          {lang === 'es' ? 'contratos de alto riesgo' : 'high-risk contracts'}
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
        {lang === 'es' ? localizeLevel(hrLevel, 'es') : hrLevel.toUpperCase()}
      </div>
      {avgRisk > 0 && (
        <div
          className="font-mono text-center mt-1"
          style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
        >
          {lang === 'es' ? 'riesgo prom.' : 'avg risk'} {avgRiskPct} ({riskLevel})
        </div>
      )}
    </aside>
  )
}

function InstitutionMetaRule({
  institution,
  sectorName,
  lang,
}: {
  institution: InstitutionDetailResponse
  sectorName: string | null
  lang: 'en' | 'es'
}) {
  const [siglasCopied, setSiglasCopied] = useState(false)
  async function copySiglas() {
    if (!institution.siglas) return
    try {
      await navigator.clipboard.writeText(institution.siglas)
      setSiglasCopied(true)
      setTimeout(() => setSiglasCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const tags: string[] = []
  if (sectorName) tags.push(sectorName)
  if (institution.institution_type) tags.push(institution.institution_type)
  if (institution.vendor_count) {
    tags.push(
      lang === 'es'
        ? `${formatNumber(institution.vendor_count)} proveedores`
        : `${formatNumber(institution.vendor_count)} vendors`,
    )
  }
  if (institution.total_contracts) {
    tags.push(
      lang === 'es'
        ? `${formatNumber(institution.total_contracts)} contratos`
        : `${formatNumber(institution.total_contracts)} contracts`,
    )
  }

  return (
    <div className="space-y-1.5">
      {institution.siglas && (
        <div
          className="font-mono tabular-nums flex items-center gap-1.5"
          style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>{lang === 'es' ? 'Siglas ·' : 'Siglas ·'}</span>
          <button
            type="button"
            onClick={copySiglas}
            className="inline-flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
            aria-label={lang === 'es' ? 'Copiar siglas' : 'Copy siglas'}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
          >
            <span>{institution.siglas}</span>
            {siglasCopied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3 opacity-50" aria-hidden="true" />}
          </button>
          {siglasCopied && (
            <span
              className="font-mono ml-1"
              style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent)', opacity: 0.8 }}
              role="status"
            >
              {lang === 'es' ? 'Copiado' : 'Copied'}
            </span>
          )}
        </div>
      )}
      {tags.length > 0 && (
        <div
          className="font-mono"
          style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}
        >
          {tags.map((tag, i) => (
            <span key={i}>
              {i > 0 && (
                <span className="mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
              )}
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function OnThePageStrip({ sectorAccent, lang }: { sectorAccent: string; lang: 'en' | 'es' }) {
  return (
    <nav
      aria-label={lang === 'es' ? 'En esta página' : 'On this page'}
      className="mt-10"
    >
      <div className="flex items-center justify-center gap-3 mb-3">
        <div aria-hidden="true" style={{ height: 1, width: 80, background: 'var(--color-border)' }} />
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          {lang === 'es' ? 'En esta página' : 'On this page'}
        </span>
        <div aria-hidden="true" style={{ height: 1, width: 80, background: 'var(--color-border)' }} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {TOC_ANCHORS.map((a, i) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="group font-mono inline-flex items-baseline gap-1.5 transition-colors"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            {i > 0 && (
              <span aria-hidden="true" className="-ml-1.5 mr-1" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>·</span>
            )}
            {a.numeral && (
              <span style={{ color: sectorAccent, fontWeight: 700, fontVariant: 'small-caps' }}>{a.numeral}.</span>
            )}
            <span className="group-hover:text-text-primary transition-colors" style={{ borderBottom: '1px solid transparent', paddingBottom: 2 }}>
              {lang === 'es' ? a.es : a.en}
            </span>
          </a>
        ))}
      </div>
      <div aria-hidden="true" className="mt-4" style={{ height: 1, background: 'var(--color-border)' }} />
    </nav>
  )
}

// ───────────────────── helpers ──────────────────────────────────────────────

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
}

function buildInstitutionLede({
  institution,
  sectorName,
  lang,
}: {
  institution: InstitutionDetailResponse
  sectorName?: string
  lang: 'en' | 'es'
}): string {
  const name = toTitleCase(institution.name)
  const spend = formatCompactMXN(institution.total_amount_mxn ?? 0)
  const usd = formatCompactUSD(institution.total_amount_mxn ?? 0)
  const contracts = formatNumber(institution.total_contracts ?? 0)
  const vendors = institution.vendor_count ? formatNumber(institution.vendor_count) : null
  const hr = Math.round(institution.high_risk_pct ?? institution.high_risk_percentage ?? 0)
  const da = Math.round(institution.direct_award_pct ?? institution.direct_award_rate ?? 0)

  // Frame 1: high HR% — flag the institution as a procurement-pathology surface
  if (hr >= 20 && vendors) {
    return lang === 'es'
      ? `${name} concentra ${spend} (≈${usd}) repartidos en ${contracts} contratos entre ${vendors} proveedores. ${hr}% de esos contratos fueron marcados de alto riesgo por el modelo, ${da}% adjudicados sin licitación pública${sectorName ? ` — dentro del sector ${sectorName}` : ''}.`
      : `${name} concentrates ${spend} (≈${usd}) spread across ${contracts} contracts among ${vendors} suppliers. ${hr}% of those contracts were flagged high-risk by the model, ${da}% awarded without an open bid${sectorName ? ` — within the ${sectorName} sector` : ''}.`
  }
  // Frame 2: standard
  return lang === 'es'
    ? `${name} ha contratado ${spend} (≈${usd}) en ${contracts} contratos${vendors ? ` con ${vendors} proveedores` : ''}${sectorName ? `, dentro del sector ${sectorName}` : ''}. ${da}% adjudicación directa.`
    : `${name} has contracted ${spend} (≈${usd}) across ${contracts} contracts${vendors ? ` with ${vendors} suppliers` : ''}${sectorName ? `, within the ${sectorName} sector` : ''}. ${da}% direct-award.`
}
