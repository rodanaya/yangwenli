/**
 * ChapterSubject — Chapter I of the vendor dossier narrative.
 *
 * Redesigned 2026-05-22 (DESIGNUS round 6, component 2/10). Argument:
 * SCALE. After the hero says WHO, this chapter says HOW BIG — and what
 * that scale actually means in human terms.
 *
 * Three editorial moves:
 *   1. Lede paragraph (Source Serif italic, sector-rule)
 *   2. THE SCALE — framed number block (Playfair Italic 800 huge)
 *   3. TANGIBLY — three equivalence framings (healthcare / infra / edu)
 *   4. THE PROCUREMENT SIGNATURE — two horizontal proportion bars
 *      with inline reference annotations
 *
 * Drops the previous chapter's redundant vendor name + chip row (the
 * hero already owns identity). Chapter title is now a magazine-cover
 * composition: big Playfair Italic roman numeral + serif chapter name
 * + Source Serif italic subtitle.
 *
 * Animation: single chapter entrance via framer-motion `whileInView`,
 * opacity-only fade triggered when scrolled into view. No per-element
 * stagger — the whole chapter arrives as one editorial unit.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChapterSubjectProps {
  vendor: {
    name: string
    total_value_mxn: number
    total_contracts: number
    primary_sector_name?: string
    avg_risk_score?: number
    first_contract_year?: number
    last_contract_year?: number
    high_risk_pct: number
    direct_award_pct: number
  }
  /** Accepted for call-site compatibility — chapter no longer uses ARIA tier
   *  badge (the hero verdict card owns that signal). */
  aria?: { ips_final: number; ips_tier: number; primary_sector_name?: string | null } | null
  /** Accepted for call-site compatibility — component uses useTranslation. */
  t?: unknown
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChapterSubject({ vendor }: ChapterSubjectProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorName = vendor.primary_sector_name ?? null
  const sectorCode = sectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const yearsActive = vendor.first_contract_year && vendor.last_contract_year
    ? (vendor.last_contract_year - vendor.first_contract_year + 1)
    : 0

  // Pick the most arresting equivalent (single line) for the lede, plus
  // three picks for the TANGIBLY block (across categories).
  const equivalences = pickEquivalences(vendor.total_value_mxn, lang)
  const ledeEquivalent = equivalences[0] ?? null

  // Pre-compose the lede prose — single sentence, data-driven.
  const lede = buildSubjectLede({
    vendor,
    yearsActive,
    ledeEquivalent,
    lang,
  })

  return (
    <ChapterShell id="chapter-subject">
      <ChapterHeading
        numeral="I"
        title={lang === 'es' ? 'El Sujeto' : 'Subject'}
        subtitle={lang === 'es' ? 'La escala de la relación' : 'The scale of the relationship'}
        sectorAccent={sectorAccent}
      />

      {/* The lede paragraph — Source Serif italic, sector-rule left bar */}
      <FadeIn className="mt-12">
        <p
          style={{
            fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 18,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.005em',
            maxWidth: '64ch',
            borderLeft: `2px solid ${sectorAccent}`,
            paddingLeft: 20,
          }}
        >
          {lede}
        </p>
      </FadeIn>

      {/* THE SCALE — framed number block */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'A escala' : 'Drawing the scale'} />
        <div className="flex justify-center mt-8">
          <ScaleBlock
            mxn={vendor.total_value_mxn}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </div>
      </FadeIn>

      {/* TANGIBLY — equivalence list */}
      {equivalences.length > 0 && (
        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'En términos tangibles' : 'Tangibly'} />
          <EquivalenceList items={equivalences} sectorAccent={sectorAccent} />
        </FadeIn>
      )}

      {/* THE PROCUREMENT SIGNATURE — two horizontal bars */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La firma de contratación' : 'The procurement signature'} />
        <div className="mt-7 space-y-7 max-w-3xl">
          <SignatureBar
            label={lang === 'es' ? 'Adjudicación directa' : 'Direct award'}
            value={vendor.direct_award_pct ?? 0}
            sectorAccent={sectorAccent}
            referenceValue={48}
            referenceLabel={lang === 'es' ? 'norma nacional ≈ 48%' : 'national norm ≈ 48%'}
          />
          <SignatureBar
            label={lang === 'es' ? 'Contratos de alto riesgo' : 'High-risk contracts'}
            value={vendor.high_risk_pct ?? 0}
            sectorAccent={sectorAccent}
            // Risk-critical fill when value exceeds OECD upper band
            highRiskTint={vendor.high_risk_pct > 15}
            referenceBandMin={2}
            referenceBandMax={15}
            referenceLabel={lang === 'es' ? 'banda OECD 2–15%' : 'OECD reference band 2–15%'}
          />
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/**
 * Chapter container — provides id anchor for TOC and width constraint.
 */
function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-20 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

/**
 * Chapter heading — the magazine-cover composition. Big Playfair Italic
 * roman numeral, serif uppercase title, italic subtitle. Centered.
 * Reusable across all six narrative chapters; only the numeral, title,
 * and subtitle change.
 */
function ChapterHeading({
  numeral,
  title,
  subtitle,
  sectorAccent,
}: {
  numeral: string
  title: string
  subtitle: string
  sectorAccent: string
}) {
  return (
    <header className="text-center">
      <div
        aria-hidden="true"
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 'clamp(72px, 9vw, 120px)',
          lineHeight: 0.85,
          color: sectorAccent,
          letterSpacing: '-0.04em',
          marginBottom: 24,
        }}
      >
        {numeral}.
      </div>
      <h2
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: '0.30em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          marginBottom: 10,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 15,
          color: 'var(--color-text-muted)',
          maxWidth: '32ch',
          margin: '0 auto',
          lineHeight: 1.45,
        }}
      >
        {subtitle}
      </p>
    </header>
  )
}

/**
 * Subhead rule — hairline-flanked uppercase label. Matches the
 * "ON THIS PAGE" pattern from the hero. Used as section dividers
 * within a chapter.
 */
function SubheadRule({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        aria-hidden="true"
        style={{ height: 1, width: 60, background: 'var(--color-border)' }}
      />
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
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{ height: 1, width: 60, background: 'var(--color-border)' }}
      />
    </div>
  )
}

/**
 * Scale block — the framed number. Sector-accent hairline border,
 * generous padding, Playfair Italic 800 number, MXN label + USD
 * companion below. The chapter's central visual anchor.
 */
function ScaleBlock({
  mxn,
  sectorAccent,
  lang,
}: {
  mxn: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  // Split the formatted MXN into number + unit so we can typographically
  // separate them. formatCompactMXN returns e.g. "133.2B MXN" / "133.2 mil millones MXN"
  const formatted = formatCompactMXN(mxn)
  // Strip the "MXN" suffix — we'll render the unit on its own line
  const numberPart = formatted.replace(/\s*MXN\s*$/i, '').trim()
  const usd = formatCompactUSD(mxn)

  return (
    <div
      style={{
        border: `1px solid ${sectorAccent}55`,
        padding: '32px 48px',
        background: `${sectorAccent}06`,
        textAlign: 'center',
        minWidth: 280,
        maxWidth: 480,
      }}
    >
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 'clamp(56px, 8vw, 88px)',
          lineHeight: 1,
          color: sectorAccent,
          letterSpacing: '-0.025em',
        }}
      >
        {numberPart}
      </div>
      <div
        aria-hidden="true"
        className="mx-auto my-4"
        style={{ height: 1, width: 60, background: `${sectorAccent}55` }}
      />
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {lang === 'es' ? 'Pesos mexicanos' : 'Mexican pesos'}
      </div>
      <div
        className="font-mono tabular-nums"
        style={{
          fontSize: 12,
          letterSpacing: '0.05em',
          color: 'var(--color-text-secondary)',
        }}
      >
        ≈ {usd}
      </div>
    </div>
  )
}

/**
 * Equivalence list — three lines of "≈ {phrase}". Source Serif italic
 * with the ≈ glyph in sector accent. No bullets — the glyph carries it.
 */
function EquivalenceList({
  items,
  sectorAccent,
}: {
  items: string[]
  sectorAccent: string
}) {
  return (
    <ul
      className="mt-7 max-w-2xl mx-auto space-y-3 list-none p-0"
      style={{ textAlign: 'left' }}
    >
      {items.map((text, i) => (
        <li
          key={i}
          className="flex items-baseline gap-3"
          style={{
            fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: sectorAccent,
              fontWeight: 600,
              fontSize: 18,
              flexShrink: 0,
              minWidth: 16,
              fontStyle: 'normal',
            }}
          >
            ≈
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Signature bar — horizontal proportion bar with inline reference.
 * Used for the procurement-pathology stats (direct award, high-risk).
 *
 * Supports either:
 *   - referenceValue: single tick at one percentage (national norm)
 *   - referenceBandMin/Max: shaded band across a percentage range (OECD)
 */
function SignatureBar({
  label,
  value,
  sectorAccent,
  highRiskTint,
  referenceValue,
  referenceBandMin,
  referenceBandMax,
  referenceLabel,
}: {
  label: string
  value: number
  sectorAccent: string
  highRiskTint?: boolean
  referenceValue?: number
  referenceBandMin?: number
  referenceBandMax?: number
  referenceLabel?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const fillColor = highRiskTint ? RISK_COLORS.critical : sectorAccent

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 22,
            color: fillColor,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {Math.round(value)}
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              fontStyle: 'normal',
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              marginLeft: 4,
            }}
          >
            %
          </span>
        </span>
      </div>

      {/* The bar itself */}
      <div
        className="relative w-full"
        style={{
          height: 6,
          background: 'var(--color-background-elevated)',
          border: '1px solid var(--color-border)',
        }}
        aria-hidden="true"
      >
        {/* Reference band (if provided) — drawn behind the fill */}
        {referenceBandMin != null && referenceBandMax != null && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${referenceBandMin}%`,
              width: `${referenceBandMax - referenceBandMin}%`,
              background: 'var(--color-border)',
              opacity: 0.6,
              borderRight: `1px dashed var(--color-text-muted)`,
              borderLeft: `1px dashed var(--color-text-muted)`,
            }}
          />
        )}
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${clamped}%`,
            background: fillColor,
            opacity: 0.92,
          }}
        />
        {/* Reference value tick (single) */}
        {referenceValue != null && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${referenceValue}%`,
              width: 1,
              background: 'var(--color-text-muted)',
              opacity: 0.6,
            }}
          >
            {/* Tick extension above + below bar */}
            <div
              className="absolute"
              style={{
                top: -3,
                bottom: -3,
                left: 0,
                width: 1,
                background: 'var(--color-text-muted)',
                opacity: 0.6,
              }}
            />
          </div>
        )}
      </div>

      {/* Reference annotation below the bar */}
      {referenceLabel && (
        <div
          className="mt-1.5 flex items-baseline gap-1.5"
          style={{
            fontFamily: '"Source Serif Pro", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
        >
          <span aria-hidden="true" style={{ fontFamily: 'inherit', fontStyle: 'normal' }}>▎</span>
          <span>{referenceLabel}</span>
        </div>
      )}
    </div>
  )
}

/**
 * FadeIn wrapper — single opacity entrance on scroll-into-view. Replaces
 * the previous per-element framer-motion stagger so the whole chapter
 * arrives as one editorial unit.
 */
function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build the lede paragraph — single sentence framing scale + signature.
 * Data-driven; picks the strongest framing from the vendor's data.
 */
function buildSubjectLede({
  vendor,
  yearsActive,
  ledeEquivalent,
  lang,
}: {
  vendor: ChapterSubjectProps['vendor']
  yearsActive: number
  ledeEquivalent: string | null
  lang: 'en' | 'es'
}): string {
  const name = formatVendorName(vendor.name, 300)
  const direct = Math.round(vendor.direct_award_pct ?? 0)
  const hr = Math.round(vendor.high_risk_pct ?? 0)
  const yearsPhrase = yearsActive >= 2
    ? (lang === 'es' ? `${yearsActive} años de contratos públicos` : `${yearsActive} years of public contracts`)
    : (lang === 'es' ? 'su historial de contratación' : 'its procurement history')

  // Strong frame: equivalence available + high HR%
  if (ledeEquivalent && hr >= 80) {
    return lang === 'es'
      ? `A lo largo de ${yearsPhrase}, ${name} recibió de la contratación federal mexicana el equivalente a ${ledeEquivalent.replace(/^≈\s*/, '')} — ${direct}% otorgado sin licitación pública, ${hr}% marcado por el modelo de riesgo.`
      : `Across ${yearsPhrase}, ${name} received from Mexican federal procurement the equivalent of ${ledeEquivalent.replace(/^≈\s*/, '')} — ${direct}% awarded without an open bid, ${hr}% flagged by the risk model.`
  }
  // Frame with equivalence, moderate signals
  if (ledeEquivalent) {
    return lang === 'es'
      ? `A lo largo de ${yearsPhrase}, ${name} recibió el equivalente a ${ledeEquivalent.replace(/^≈\s*/, '')}. ${direct}% del total se adjudicó directamente.`
      : `Across ${yearsPhrase}, ${name} received the equivalent of ${ledeEquivalent.replace(/^≈\s*/, '')}. ${direct}% of the total was awarded by direct procurement.`
  }
  // Standard frame, no equivalence (small vendor)
  return lang === 'es'
    ? `A lo largo de ${yearsPhrase}, ${name} participó en ${formatNumber(vendor.total_contracts)} contratos por ${formatCompactMXN(vendor.total_value_mxn)}. ${direct}% adjudicación directa, ${hr}% marcados de alto riesgo.`
    : `Across ${yearsPhrase}, ${name} took ${formatNumber(vendor.total_contracts)} contracts worth ${formatCompactMXN(vendor.total_value_mxn)}. ${direct}% direct-award, ${hr}% flagged high-risk.`
}

/**
 * Pick up to 3 tangible equivalences for a given MXN amount, across
 * categories (healthcare / infrastructure / education) so each line
 * gives a different mental anchor. Sources for reference unit costs:
 *
 *   IMSS pediatric oncology — ~4.2B MXN/year (CIE Programs 2022)
 *   Federal-tier hospital   — ~800M MXN to build (SHCP estimate)
 *   Federal highway km      — ~30M MXN/km (SCT 2023 average)
 *   School classroom (equip)— ~800k MXN (SEP/INIFED 2022)
 */
function pickEquivalences(mxn: number, lang: 'en' | 'es'): string[] {
  const out: string[] = []

  // 1. Healthcare framing
  if (mxn >= 4_200_000_000) {
    const years = Math.round(mxn / 4_200_000_000)
    out.push(
      lang === 'es'
        ? `${formatNumber(years)} años de financiamiento oncológico pediátrico del IMSS`
        : `${formatNumber(years)} years of IMSS pediatric oncology funding`,
    )
  } else if (mxn >= 100_000_000) {
    const months = Math.round(mxn / (4_200_000_000 / 12))
    if (months >= 1) {
      out.push(
        lang === 'es'
          ? `${months} meses de financiamiento oncológico pediátrico del IMSS`
          : `${months} months of IMSS pediatric oncology funding`,
      )
    }
  }

  // 2. Infrastructure framing — pick the most relatable scale
  if (mxn >= 1_600_000_000) {
    const hospitals = Math.round(mxn / 800_000_000)
    out.push(
      lang === 'es'
        ? `${formatNumber(hospitals)} hospitales federales construidos`
        : `${formatNumber(hospitals)} federal-tier hospitals built`,
    )
  } else if (mxn >= 30_000_000) {
    const km = Math.round(mxn / 30_000_000)
    if (km >= 2) {
      out.push(
        lang === 'es'
          ? `${formatNumber(km)} kilómetros de carretera federal`
          : `${formatNumber(km)} kilometers of federal highway`,
      )
    }
  }

  // 3. Education framing
  if (mxn >= 800_000) {
    const classrooms = Math.round(mxn / 800_000)
    if (classrooms >= 10) {
      out.push(
        lang === 'es'
          ? `${formatNumber(classrooms)} aulas escolares equipadas`
          : `${formatNumber(classrooms)} school classrooms equipped`,
      )
    }
  }

  return out.slice(0, 3)
}
