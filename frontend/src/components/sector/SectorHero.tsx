/**
 * SectorHero — cover slug for the unified sector dossier.
 *
 * Built 2026-05-26 (DESIGNUS round 8, Phase 3 component 1/5). Mirrors
 * the institution dossier's editorial register but scoped to sector
 * semantics. The hero verdict is HR% (procurement-pathology share of
 * the entire sector's contract base) since avg risk is dominated by
 * routine procurement and obscures the sector signal.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SectorDetailResponse } from '@/api/types'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  SECTOR_COLORS,
  getRiskLevelFromScore,
  getSectorName,
} from '@/lib/constants'
import {
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
} from '@/lib/utils'

const TOC_ANCHORS: Array<{ id: string; en: string; es: string; numeral?: string }> = [
  { id: 'institutions',en: 'Institutions',es: 'Instituciones' },
  { id: 'methodology', en: 'Methodology', es: 'Metodología'   },
]

interface SectorHeroProps {
  sector: SectorDetailResponse
  actions?: ReactNode
  showTOC?: boolean
}

export function SectorHero({ sector, actions, showTOC = true }: SectorHeroProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es')
  const lang: 'en' | 'es' = isEs ? 'es' : 'en'

  const sectorAccent = SECTOR_COLORS[sector.code] ?? '#64748b'
  const stats = sector.statistics

  // Verdict = HR%. Tier tiers tuned for sector aggregates (higher than
  // institution thresholds — at sector scale even 10% HR is significant).
  const hrPct = stats.high_risk_pct ?? 0
  const avgRisk = stats.avg_risk_score ?? 0
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const hrLevel: 'critical' | 'high' | 'medium' | 'low' =
    hrPct >= 20 ? 'critical' : hrPct >= 12 ? 'high' : hrPct >= 5 ? 'medium' : 'low'
  const verdictColor = RISK_COLORS[hrLevel]

  const sectorDisplayName = getSectorName(sector.code, lang)
  const lede = buildSectorLede({ sector, hrPct, avgRisk, lang })

  return (
    <header className="relative">
      <div
        aria-hidden="true"
        className="absolute left-0 right-0"
        style={{ top: 0, height: 6, background: sectorAccent }}
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
            SECT · S-{String(sector.id).padStart(2, '0')} · {sector.code.toUpperCase()}
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
          § {lang === 'es' ? 'EL EXPEDIENTE · SECTOR' : 'EL EXPEDIENTE · SECTOR DOSSIER'}
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
                fontSize: 'clamp(32px, 4.4vw, 46px)',
                lineHeight: 1.04,
                letterSpacing: '-0.012em',
                color: 'var(--color-text-primary)',
              }}
            >
              {sectorDisplayName}
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
              {(() => {
                // total_institutions is 0 in sector statistics (backend gap);
                // suppress the institutions clause rather than print "0".
                const hasInst = (stats.total_institutions ?? 0) > 0
                const inst = formatNumber(stats.total_institutions)
                const vend = formatNumber(stats.total_vendors)
                if (lang === 'es') return hasInst ? `Agregado sectorial · ${inst} instituciones · ${vend} proveedores` : `Agregado sectorial · ${vend} proveedores`
                return hasInst ? `Sector aggregate · ${inst} institutions · ${vend} suppliers` : `Sector aggregate · ${vend} suppliers`
              })()}
            </div>

            {/* Metadata rule */}
            <div className="mt-4" style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 14 }}>
              <div
                className="font-mono"
                style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}
              >
                <span>{formatNumber(stats.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}</span>
                <span className="mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
                <span>{Math.round(stats.direct_award_pct)}% {lang === 'es' ? 'adj. directa' : 'direct award'}</span>
                <span className="mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
                <span>{Math.round(stats.single_bid_pct)}% {lang === 'es' ? 'único postor' : 'single bid'}</span>
              </div>
            </div>
          </div>

          {/* Verdict card seal */}
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
                style={{
                  fontSize: 9,
                  color: 'var(--color-text-muted)',
                  opacity: 0.6,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
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
                {lang === 'es' ? 'riesgo prom.' : 'avg risk'} {Math.round(avgRisk * 100)} ({lang === 'es' ? localizeLevel(riskLevel, 'es').toLowerCase() : riskLevel})
              </div>
            )}
          </aside>
        </div>

        {/* Hairline */}
        <div aria-hidden="true" className="mt-6" style={{ height: 1, background: 'var(--color-border)' }} />

        {/* Editorial block — lede (left) + exposure ledger companion (right).
            The lede used to run full-width-left under the hairline, leaving the
            right ~40% of the cover blank. The two-column spread fills the width
            and lets the sector's money scale read as a bold numeric panel that
            does NOT duplicate the verdict seal (HR%). Falls back to a single
            stacked column below `lg`. Mirrors VendorHero's lede + companion. */}
        <div className="mt-6 grid items-start gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Lede with drop cap */}
          <div style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 20 }}>
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
                {lede.charAt(0)}
              </span>
              {lede.slice(1)}
            </p>
          </div>

          {/* Exposure & scale companion */}
          <ExposureLedger sector={sector} sectorAccent={sectorAccent} lang={lang} />
        </div>

        {/* TOC */}
        {showTOC && (
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
                    <span
                      aria-hidden="true"
                      className="-ml-1.5 mr-1"
                      style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}
                    >
                      ·
                    </span>
                  )}
                  {a.numeral && (
                    <span style={{ color: sectorAccent, fontWeight: 700, fontVariant: 'small-caps' }}>
                      {a.numeral}.
                    </span>
                  )}
                  <span
                    className="group-hover:text-text-primary transition-colors"
                    style={{ borderBottom: '1px solid transparent', paddingBottom: 2 }}
                  >
                    {lang === 'es' ? a.es : a.en}
                  </span>
                </a>
              ))}
            </div>
            <div aria-hidden="true" className="mt-4" style={{ height: 1, background: 'var(--color-border)' }} />
          </nav>
        )}
      </div>
    </header>
  )
}

/**
 * ExposureLedger — the right-column companion to the lede. A compact, bold
 * numeric panel built ONLY from `sector.statistics`. Three registers:
 *   1. Gasto total — the anchor (Playfair Italic 800 tabular, like the verdict
 *      number) so the sector's money scale reads at cover-headline weight.
 *   2. High+critical and critical-only exposure (MXN) — gated when null.
 *   3. The risk-band split (critical/high/medium/low contract counts) rendered
 *      as one full-width stacked proportion bar spanning the column.
 * Does NOT duplicate the verdict seal: the seal states HR% (a rate); this
 * states absolute exposure (pesos) + the count distribution behind it.
 */
function ExposureLedger({
  sector,
  sectorAccent,
  lang,
}: {
  sector: SectorDetailResponse
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const stats = sector.statistics

  const totalMxn = stats.total_value_mxn ?? 0
  const hiCritMxn = stats.high_critical_value_mxn ?? null
  const critMxn = stats.critical_value_mxn ?? null

  // Risk-band counts → stacked proportion bar. Order high→low risk so the
  // dangerous mass reads left-to-right.
  const bands: Array<{ key: 'critical' | 'high' | 'medium' | 'low'; count: number; es: string; en: string }> = [
    { key: 'critical', count: stats.critical_risk_count ?? 0, es: 'Crítico', en: 'Critical' },
    { key: 'high',     count: stats.high_risk_count ?? 0,     es: 'Alto',    en: 'High'     },
    { key: 'medium',   count: stats.medium_risk_count ?? 0,   es: 'Medio',   en: 'Medium'   },
    { key: 'low',      count: stats.low_risk_count ?? 0,      es: 'Bajo',    en: 'Low'      },
  ]
  const bandTotal = bands.reduce((s, b) => s + b.count, 0)
  const hasBands = bandTotal > 0

  // Share of exposure that is high+critical, for the inline caption.
  const exposureShare = totalMxn > 0 && hiCritMxn != null ? (hiCritMxn / totalMxn) * 100 : null

  return (
    <aside
      aria-label={lang === 'es' ? 'Exposición y escala del sector' : 'Sector exposure and scale'}
      className="min-w-0"
      style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 20 }}
    >
      {/* Eyebrow */}
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          fontStyle: 'italic',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: sectorAccent,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {lang === 'es' ? 'Exposición y escala' : 'Exposure & scale'}
      </div>

      {/* Anchor — Gasto total */}
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 'clamp(30px, 3.6vw, 40px)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)',
        }}
      >
        {formatCompactMXN(totalMxn)}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginTop: 4,
        }}
      >
        {lang === 'es' ? 'Gasto total del sector' : 'Total sector spend'}
        <span className="mx-1.5" style={{ opacity: 0.5 }}>·</span>
        ≈{formatCompactUSD(totalMxn)}
      </div>

      {/* Exposure tiers — two stat lines, gated when the backend leaves the
          field null (older sector_stats rows lack the band-value columns). */}
      {(hiCritMxn != null || critMxn != null) && (
        <div
          className="mt-4 grid gap-x-6 gap-y-3"
          style={{ gridTemplateColumns: hiCritMxn != null && critMxn != null ? '1fr 1fr' : '1fr' }}
        >
          {hiCritMxn != null && (
            <ExposureStat
              value={formatCompactMXN(hiCritMxn)}
              valueColor={RISK_TEXT_COLORS.high}
              label={lang === 'es' ? 'Alto + crítico' : 'High + critical'}
              caption={exposureShare != null
                ? `${exposureShare.toFixed(0)}% ${lang === 'es' ? 'del gasto' : 'of spend'}`
                : undefined}
            />
          )}
          {critMxn != null && (
            <ExposureStat
              value={formatCompactMXN(critMxn)}
              valueColor={RISK_TEXT_COLORS.critical}
              label={lang === 'es' ? 'Solo crítico' : 'Critical only'}
            />
          )}
        </div>
      )}

      {/* Risk-band split — full-width stacked proportion bar + legend. */}
      {hasBands && (
        <div className="mt-5">
          <div
            className="font-mono"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: 6,
            }}
          >
            {lang === 'es'
              ? `${formatNumber(bandTotal)} contratos por banda de riesgo`
              : `${formatNumber(bandTotal)} contracts by risk band`}
          </div>
          <div
            role="img"
            aria-label={lang === 'es' ? 'Distribución de contratos por banda de riesgo' : 'Contract distribution by risk band'}
            className="flex w-full overflow-hidden"
            style={{ height: 10, borderRadius: 2, background: 'var(--color-border)' }}
          >
            {bands.map((b) =>
              b.count > 0 ? (
                <div
                  key={b.key}
                  style={{
                    width: `${(b.count / bandTotal) * 100}%`,
                    background: b.key === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[b.key],
                    opacity: b.key === 'low' ? 0.4 : 1,
                  }}
                  title={`${lang === 'es' ? b.es : b.en} · ${formatNumber(b.count)}`}
                />
              ) : null
            )}
          </div>
          {/* Legend — only bands that fire, high→low */}
          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
            {bands.map((b) =>
              b.count > 0 ? (
                <span
                  key={b.key}
                  className="font-mono inline-flex items-center gap-1.5 tabular-nums"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 1,
                      flexShrink: 0,
                      background: b.key === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[b.key],
                      opacity: b.key === 'low' ? 0.5 : 1,
                    }}
                  />
                  <span style={{ color: b.key === 'low' ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[b.key] }}>
                    {lang === 'es' ? b.es : b.en}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    {((b.count / bandTotal) * 100).toFixed(0)}%
                  </span>
                </span>
              ) : null
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

/** A single exposure stat line — value (risk-coloured Playfair) + label + caption. */
function ExposureStat({
  value,
  valueColor,
  label,
  caption,
}: {
  value: string
  valueColor: string
  label: string
  caption?: string
}) {
  return (
    <div className="min-w-0">
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 22,
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: valueColor,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginTop: 3,
        }}
      >
        {label}
        {caption && (
          <>
            <span className="mx-1" style={{ opacity: 0.5 }}>·</span>
            {caption}
          </>
        )}
      </div>
    </div>
  )
}

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
}

function buildSectorLede({
  sector,
  hrPct,
  avgRisk,
  lang,
}: {
  sector: SectorDetailResponse
  hrPct: number
  avgRisk: number
  lang: 'en' | 'es'
}): string {
  const name = getSectorName(sector.code, lang)
  const stats = sector.statistics
  const spend = formatCompactMXN(stats.total_value_mxn)
  const usd = formatCompactUSD(stats.total_value_mxn)
  const inst = formatNumber(stats.total_institutions)
  const vendors = formatNumber(stats.total_vendors)
  const da = Math.round(stats.direct_award_pct)

  // total_institutions is 0 in sector statistics (backend gap) — drop the
  // institutions clause when absent rather than asserting "0 institutions".
  const hasInst = (stats.total_institutions ?? 0) > 0
  // "(across) X institutions and Y suppliers" → suppliers-only when no inst count
  const scaleEs = hasInst ? `entre ${inst} instituciones y ${vendors} proveedores` : `entre ${vendors} proveedores`
  const scaleEn = hasInst ? `across ${inst} institutions and ${vendors} suppliers` : `across ${vendors} suppliers`
  // "(across) X institutions" → suppliers-only when no inst count
  const acrossEs = hasInst ? `entre ${inst} instituciones` : `entre ${vendors} proveedores`
  const acrossEn = hasInst ? `across ${inst} institutions` : `across ${vendors} suppliers`

  if (hrPct >= 15) {
    return lang === 'es'
      ? `${name} mueve ${spend} (≈${usd}) repartidos ${scaleEs}. ${hrPct.toFixed(0)}% de los contratos del sector fueron marcados por el modelo, ${da}% adjudicados sin licitación pública — un perfil sectorial con tensión.`
      : `${name} moves ${spend} (≈${usd}) ${scaleEn}. ${hrPct.toFixed(0)}% of the sector's contracts are flagged by the model, ${da}% direct-award — a sector profile under tension.`
  }
  if (avgRisk > 0 && getRiskLevelFromScore(avgRisk) !== 'low') {
    return lang === 'es'
      ? `${name} agrupa ${spend} (≈${usd}) ${acrossEs}, con un riesgo promedio ${Math.round(avgRisk * 100)} y ${da}% de adjudicación directa.`
      : `${name} aggregates ${spend} (≈${usd}) ${acrossEn}, with an average risk of ${Math.round(avgRisk * 100)} and ${da}% direct-award.`
  }
  return lang === 'es'
    ? `${name} es un agregado sectorial de ${spend} (≈${usd}) distribuido ${scaleEs}. ${da}% adjudicación directa.`
    : `${name} is a sector aggregate of ${spend} (≈${usd}) distributed ${scaleEn}. ${da}% direct-award.`
}
