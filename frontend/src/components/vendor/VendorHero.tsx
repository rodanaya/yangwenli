/**
 * VendorHero — cover slug for the unified vendor dossier.
 *
 * Redesigned 2026-05-22 (DESIGNUS round 6, component 1/10). NYT/ICIJ
 * investigation aesthetic: typographic restraint, asymmetric balance,
 * generous negative space, two-color architectural thread (sector accent
 * + risk-tier accent). Replaces the previous 13-block hero that bundled
 * everything into one place — now the hero just IDENTIFIES, DECLARES,
 * and POINTS TO sections below. SHAP drivers, stat row, verdict sentence,
 * Build Investigation Thread CTA are all dropped (their content lives in
 * the dossier sections below, not in the cover slug).
 *
 * Composition:
 *   6px sector rail · index strip · § kicker · headline + verdict-card
 *   · priority alerts (if any) · drop-cap lede · "ON THE PAGE" TOC
 *
 * Five typographic registers, used exclusively:
 *   1. Headline serif (EB Garamond italic)        — vendor name
 *   2. Editorial serif (EB Garamond italic)        — lede paragraph
 *   3. Display num (Playfair Italic 800)          — verdict number, drop cap
 *   4. Mono kicker (IBM Plex Mono)                — index, §, metadata, TOC
 *   5. Body sans (system)                         — chips, controls
 *
 * Two chromatic colors:
 *   • Sector accent — 6px rail, § kicker, lede left rule, drop cap,
 *                     TOC roman numerals, metadata rule
 *   • Risk-tier color — verdict card top bar, big number, tier label,
 *                       chip tints
 */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import type {
  VendorDetailResponse,
  VendorSHAPResponse,
} from '@/api/types'
import {
  PriorityAlert,
  type PriorityFlag,
} from '@/components/ui/PriorityAlert'
import {
  RISK_COLORS,
  SECTOR_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import {
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
} from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { VendorEquivalences } from '@/components/vendor/VendorEquivalences'
import type { VendorScorecardData } from '@/components/ui/ScorecardWidgets'

// Dossier section anchors — must match the id="..." attributes on the
// VendorDossier shell. The six narrative chapters were removed in the 2026-06-03
// operational rebuild; these are the real reference sections (no roman numerals).
const TOC_ANCHORS: Array<{ id: string; en: string; es: string; numeral?: string }> = [
  { id: 'evidence',    en: 'Evidence',    es: 'Evidencia'    },
  { id: 'activity',    en: 'Activity',    es: 'Actividad'    },
  { id: 'network',     en: 'Network',     es: 'Red'          },
  { id: 'methodology', en: 'Methodology', es: 'Metodología'  },
]

interface VendorHeroProps {
  vendor: VendorDetailResponse
  scorecard?: VendorScorecardData | null
  flags: PriorityFlag[]
  shap?: VendorSHAPResponse | null
  /** Right-aligned action buttons (Watch / Share / Export). */
  actions?: ReactNode
  /** ARIA investigative tier — 1=critical, 4=low. */
  ariaTier?: 1 | 2 | 3 | 4 | null
  /** Ground-truth confirmed corruption case. Drives the GT chip. */
  isGroundTruth?: boolean
  /** Show the "ON THE PAGE" TOC strip. Default true (unified dossier);
   *  pass false in the legacy /print/vendors/:id context where the
   *  surrounding chrome is tabs, not scroll sections. */
  showTOC?: boolean
}

export function VendorHero({
  vendor,
  flags,
  actions,
  ariaTier,
  isGroundTruth,
  showTOC = true,
}: VendorHeroProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es')
  const lang: 'en' | 'es' = isEs ? 'es' : 'en'

  const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#64748b'

  const score = vendor.avg_risk_score ?? 0
  const riskLevel = score > 0 ? getRiskLevelFromScore(score) : 'low'
  const riskColor = score > 0 ? RISK_COLORS[riskLevel] : 'var(--color-text-muted)'
  const riskPct = score > 0 ? Math.round(score * 100) : null

  // Lede paragraph — data-driven, picks the strongest frame.
  const lede = buildVendorLede(vendor, { lang, isGroundTruth: !!isGroundTruth })

  // Editorial vendor name + legal-form split. Mexican vendors typically
  // end in "S.A. de C.V.", "S.C.", "S. de R.L.", etc. Split for typographic
  // hierarchy: name big, legal form quiet beneath it.
  const { displayName, legalForm } = splitNameAndLegalForm(vendor.name)
  // Hero headline gets the full editorial name (no maxLength truncation).
  // formatVendorName defaults to maxLength=28 for compact UI — that's the
  // wrong contract for a magazine cover slug, so pass 300 explicitly.
  const editorialName = formatVendorName(displayName, 300)

  return (
    <header className="relative">
      {/* ─── 6px sector rail — content-width top rule. (Honest: a true viewport
          bleed would run under the fixed left sidebar; the old `--container-pad`
          bleed was undefined and silently did nothing anyway — standards §4.) ── */}
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

        {/* ─── Row 1: index strip + actions ─────────────────────────── */}
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
            EXP · D-{String(vendor.id).padStart(5, '0')}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          )}
        </div>

        {/* ─── Row 2: § kicker ──────────────────────────────────────── */}
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
          § {isEs ? 'EL EXPEDIENTE · PROVEEDOR' : 'EL EXPEDIENTE · VENDOR DOSSIER'}
        </div>

        {/* ─── Row 3: headline + verdict card ───────────────────────── */}
        <div className="grid gap-6 lg:gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
          {/* Left column — name + meta */}
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
            {legalForm && (
              <div
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: 16,
                  fontWeight: 400,
                  color: 'var(--color-text-secondary)',
                  opacity: 0.55,
                  letterSpacing: '0.01em',
                }}
              >
                {legalForm}
              </div>
            )}

            {/* Metadata rule — RFC + tags with 2px sector left rule */}
            <div
              className="mt-4"
              style={{
                borderLeft: `2px solid ${sectorAccent}`,
                paddingLeft: 14,
              }}
            >
              <VendorMetaRule
                vendor={vendor}
                lang={lang}
              />
            </div>
          </div>

          {/* Right column — verdict card seal */}
          <VerdictCard
            riskPct={riskPct}
            riskLevel={riskLevel}
            riskColor={riskColor}
            ariaTier={ariaTier ?? null}
            isGroundTruth={!!isGroundTruth}
            isEfos={!!vendor.is_efos_ghost}
            isSfp={!!vendor.is_sfp_sanctioned}
            lang={lang}
          />
        </div>

        {/* Full-width hairline below the headline row */}
        <div
          aria-hidden="true"
          className="mt-6"
          style={{ height: 1, background: 'var(--color-border)' }}
        />

        {/* ─── Row 4: priority alerts (if any), repositioned above lede */}
        {flags.length > 0 && (
          <aside
            aria-labelledby="vendor-marginal-note"
            className="mt-5"
            style={{
              borderLeft: `2px solid var(--color-accent)`,
              paddingLeft: 14,
              paddingTop: 6,
              paddingBottom: 6,
            }}
          >
            <p
              id="vendor-marginal-note"
              className="font-mono"
              style={{
                fontSize: 9.5,
                fontStyle: 'italic',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              {isEs ? 'Nota al margen' : 'Marginal note'}
            </p>
            <PriorityAlert flags={flags} />
          </aside>
        )}

        {/* ─── Row 5: the editorial block — lede (left) and its human-scale
            translation (right) as a two-column cover spread. They used to
            stack down the left half, leaving the right ~40% of the cover
            empty; side-by-side fills the width and shortens the hero. Falls
            back to a single stacked column below `lg`. ──────────────── */}
        <div className="mt-6 grid items-start gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Lede text={lede} sectorAccent={sectorAccent} />
          <VendorEquivalences flush totalMxn={vendor.total_value_mxn} lang={lang} accent={sectorAccent} />
        </div>

        {/* ─── Row 6: ON THE PAGE TOC strip ─────────────────────────── */}
        {showTOC && (
          <OnThePageStrip sectorAccent={sectorAccent} lang={lang} />
        )}
      </div>
    </header>
  )
}

// ───────────────────────── subcomponents ────────────────────────────────────

/**
 * The verdict card seal — risk number + tier + signal chips. Visual
 * anchor on the right column of the headline row. ~160px wide.
 */
function VerdictCard({
  riskPct,
  riskLevel,
  riskColor,
  ariaTier,
  isGroundTruth,
  isEfos,
  isSfp,
  lang,
}: {
  riskPct: number | null
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  riskColor: string
  ariaTier: 1 | 2 | 3 | 4 | null
  isGroundTruth: boolean
  isEfos: boolean
  isSfp: boolean
  lang: 'en' | 'es'
}) {
  // Build chips inline — only show ones that actually fire
  const chips: Array<{ label: string; color: string; title: string }> = []
  if (isGroundTruth) {
    chips.push({
      label: 'GT',
      color: RISK_COLORS.critical,
      title: lang === 'es' ? 'Caso confirmado en Ground Truth' : 'Confirmed ground-truth case',
    })
  }
  if (ariaTier != null && ariaTier <= 2) {
    chips.push({
      label: `T${ariaTier}`,
      color: ariaTier === 1 ? RISK_COLORS.critical : RISK_COLORS.high,
      title: lang === 'es' ? `Cohorte Tier-${ariaTier} de ARIA` : `ARIA Tier-${ariaTier} cohort`,
    })
  }
  if (isEfos) {
    chips.push({
      label: 'EFOS',
      color: RISK_COLORS.critical,
      title: lang === 'es' ? 'Empresa fantasma confirmada (SAT)' : 'Confirmed shell company (SAT)',
    })
  }
  if (isSfp) {
    chips.push({
      label: 'SFP',
      color: RISK_COLORS.critical,
      title: lang === 'es' ? 'Sancionada por la SFP' : 'Sanctioned by the SFP',
    })
  }

  return (
    <aside
      aria-label={lang === 'es' ? 'Veredicto de riesgo' : 'Risk verdict'}
      className="flex-shrink-0 relative"
      style={{
        width: 168,
        paddingTop: 6,
        paddingBottom: 8,
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      {/* 2px risk-tier top bar */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0"
        style={{ height: 2, background: riskColor }}
      />

      {/* Big number */}
      <div className="text-center">
        <div
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 46,
            lineHeight: 1,
            color: riskColor,
            letterSpacing: '-0.02em',
          }}
        >
          {riskPct ?? '—'}
        </div>
        <div
          className="font-mono tabular-nums mt-1"
          style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            opacity: 0.55,
            letterSpacing: '0.06em',
          }}
        >
          / 100
        </div>
      </div>

      {/* Hairline divider */}
      <div
        aria-hidden="true"
        className="my-3 mx-auto"
        style={{
          height: 1,
          width: '60%',
          background: 'var(--color-border)',
        }}
      />

      {/* Tier label */}
      <div
        className="font-mono text-center"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: riskColor,
          fontWeight: 700,
        }}
      >
        {riskPct == null
          ? (lang === 'es' ? 'Sin puntuación' : 'Not scored')
          : (lang === 'es' ? localizeRiskLevel(riskLevel, 'es') : riskLevel.toUpperCase())}
      </div>

      {/* Chips inline */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
          {chips.map((c, i) => (
            <span
              key={i}
              className="font-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: c.color,
                background: `${c.color}1f`,
                border: `1px solid ${c.color}44`,
                padding: '2px 5px',
                borderRadius: 2,
              }}
              title={c.title}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </aside>
  )
}

/**
 * Vendor metadata rule — RFC + tags line under the headline. Lives inside
 * a sector-accent left rule. Mono register so it reads as document
 * metadata, not as voice.
 */
function VendorMetaRule({
  vendor,
  lang,
}: {
  vendor: VendorDetailResponse
  lang: 'en' | 'es'
}) {
  const [rfcCopied, setRfcCopied] = useState(false)

  async function copyRfc() {
    if (!vendor.rfc) return
    try {
      await navigator.clipboard.writeText(vendor.rfc)
      setRfcCopied(true)
      setTimeout(() => setRfcCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  // Tag fragments — build dynamically, hide gracefully when missing
  const tagFragments: string[] = []
  if (vendor.primary_sector_name) {
    const sectorName = vendor.primary_sector_name.charAt(0).toUpperCase() + vendor.primary_sector_name.slice(1).toLowerCase()
    tagFragments.push(sectorName)
  }
  const topInst = vendor.top_institutions?.[0]
  if (topInst && vendor.total_value_mxn > 0) {
    const share = (topInst.total_amount_mxn / vendor.total_value_mxn) * 100
    if (share >= 35) {
      // Use siglas-style — first acronym candidate from name
      const acronym = institutionAcronym(topInst.institution_name)
      tagFragments.push(lang === 'es' ? `${acronym} dominante` : `${acronym} dominant`)
    }
  }
  if (vendor.first_contract_year && vendor.last_contract_year) {
    if (vendor.first_contract_year === vendor.last_contract_year) {
      tagFragments.push(`${vendor.first_contract_year}`)
    } else {
      tagFragments.push(`${vendor.first_contract_year}–${vendor.last_contract_year}`)
    }
  }
  if (vendor.total_institutions > 1) {
    tagFragments.push(
      lang === 'es'
        ? `${formatNumber(vendor.total_institutions)} instituciones`
        : `${formatNumber(vendor.total_institutions)} institutions`
    )
  }

  return (
    <div className="space-y-1.5">
      {vendor.rfc && (
        <div
          className="font-mono tabular-nums flex items-center gap-1.5"
          style={{
            fontSize: 12,
            letterSpacing: '0.04em',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>RFC ·</span>
          <button
            type="button"
            onClick={copyRfc}
            className="inline-flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
            aria-label={lang === 'es' ? 'Copiar RFC' : 'Copy RFC'}
            title={lang === 'es' ? 'Copiar RFC' : 'Copy RFC'}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
          >
            <span>{vendor.rfc}</span>
            {rfcCopied ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3 opacity-50" aria-hidden="true" />
            )}
          </button>
          {rfcCopied && (
            <span
              className="font-mono ml-1"
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                opacity: 0.8,
              }}
              role="status"
              aria-live="polite"
            >
              {lang === 'es' ? 'Copiado' : 'Copied'}
            </span>
          )}
        </div>
      )}
      {tagFragments.length > 0 && (
        <div
          className="font-mono"
          style={{
            fontSize: 12,
            letterSpacing: '0.04em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {tagFragments.map((tag, i) => (
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

/**
 * The lede — single paragraph in EB Garamond italic with a Playfair
 * drop cap on the first letter. Sector-accent left rule. The signature
 * editorial gesture of the hero.
 */
function Lede({ text, sectorAccent }: { text: string; sectorAccent: string }) {
  if (!text) return null
  const firstChar = text.charAt(0)
  const rest = text.slice(1)
  return (
    <div
      style={{
        borderLeft: `2px solid ${sectorAccent}`,
        paddingLeft: 20,
        maxWidth: '68ch',
      }}
    >
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 17,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.005em',
          /* Hanging punctuation: ❡ pilcrow appears before drop cap as
             a quiet typographic flourish at low opacity. */
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
          {firstChar}
        </span>
        {rest}
      </p>
    </div>
  )
}

/**
 * The "ON THE PAGE" TOC strip — foreshadowing anchor list. Hairline rules
 * flank the label; section names render in slim mono uppercase with
 * roman numerals (for narrative chapters) in sector accent.
 */
function OnThePageStrip({ sectorAccent, lang }: { sectorAccent: string; lang: 'en' | 'es' }) {
  return (
    <nav
      aria-label={lang === 'es' ? 'En esta página' : 'On this page'}
      className="mt-10"
    >
      {/* Label with flanking hairlines */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div
          aria-hidden="true"
          style={{ height: 1, width: 80, background: 'var(--color-border)' }}
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
          {lang === 'es' ? 'En esta página' : 'On this page'}
        </span>
        <div
          aria-hidden="true"
          style={{ height: 1, width: 80, background: 'var(--color-border)' }}
        />
      </div>

      {/* Anchor list */}
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
              <span
                style={{
                  color: sectorAccent,
                  fontWeight: 700,
                  fontVariant: 'small-caps',
                }}
              >
                {a.numeral}.
              </span>
            )}
            <span
              className="group-hover:text-text-primary transition-colors"
              style={{
                borderBottom: '1px solid transparent',
                paddingBottom: 2,
              }}
            >
              {lang === 'es' ? a.es : a.en}
            </span>
          </a>
        ))}
      </div>

      {/* Closing hairline */}
      <div
        aria-hidden="true"
        className="mt-4"
        style={{ height: 1, background: 'var(--color-border)' }}
      />
    </nav>
  )
}

// ───────────────────────── helpers ──────────────────────────────────────────

/**
 * Split a Mexican vendor name into display name + legal form.
 * "GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V." → { display, legal }.
 */
function splitNameAndLegalForm(raw: string): { displayName: string; legalForm: string | null } {
  if (!raw) return { displayName: raw, legalForm: null }
  // Match common Mexican corporate suffixes
  const patterns = [
    /,?\s*S\.?A\.?\s*DE\s*C\.?V\.?/i,
    /,?\s*S\.?\s*DE\s*R\.?L\.?\s*DE\s*C\.?V\.?/i,
    /,?\s*S\.?\s*DE\s*R\.?L\.?/i,
    /,?\s*S\.?A\.?P\.?I\.?\s*DE\s*C\.?V\.?/i,
    /,?\s*S\.?C\.?/i,
    /,?\s*A\.?C\.?/i,
    /,?\s*S\.?A\.?B\.?\s*DE\s*C\.?V\.?/i,
  ]
  for (const re of patterns) {
    const m = raw.match(re)
    if (m && m.index !== undefined && m.index > 4) {
      return {
        displayName: raw.slice(0, m.index).trim().replace(/,$/, '').trim(),
        legalForm: m[0].replace(/^,?\s*/, '').trim(),
      }
    }
  }
  return { displayName: raw, legalForm: null }
}

/** Cheap institution-name acronym ("Instituto Mexicano del Seguro Social" → "IMSS"). */
function institutionAcronym(name: string): string {
  // Take first letter of each word ≥4 chars, max 5 letters
  const STOP = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'DELA', 'EN'])
  const letters = name
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map((w) => w[0])
    .slice(0, 5)
    .join('')
  return letters || name.slice(0, 4).toUpperCase()
}

function localizeRiskLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
}

/**
 * Build the lede paragraph — single sentence, data-driven. Picks the
 * strongest frame from the vendor's data. Same template philosophy as
 * the Z3 pull-line: name the finding, don't recite the dashboard.
 */
function buildVendorLede(
  vendor: VendorDetailResponse,
  { lang, isGroundTruth }: { lang: 'en' | 'es'; isGroundTruth: boolean },
): string {
  // Lede prose uses the full editorial name — no compact-UI truncation.
  // Split off the legal form first so the lede reads naturally.
  const { displayName: ledeDisplay } = splitNameAndLegalForm(vendor.name)
  const name = formatVendorName(ledeDisplay, 300)
  const spend = formatCompactMXN(vendor.total_value_mxn)
  const usd = formatCompactUSD(vendor.total_value_mxn)
  const contracts = formatNumber(vendor.total_contracts)
  const da = Math.round(vendor.direct_award_pct ?? 0)
  const hr = Math.round(vendor.high_risk_pct ?? 0)
  const span = vendor.first_contract_year && vendor.last_contract_year
    ? (vendor.last_contract_year - vendor.first_contract_year + 1)
    : (vendor.years_active ?? 0)
  const topInst = vendor.top_institutions?.[0]
  const topName = topInst?.institution_name
    ? institutionAcronym(topInst.institution_name)
    : null
  const dominant = topInst && vendor.total_value_mxn > 0
    ? (topInst.total_amount_mxn / vendor.total_value_mxn) * 100
    : 0

  // Frame 1: GT-confirmed + dominant client
  if (isGroundTruth && dominant >= 35 && topName) {
    return lang === 'en'
      ? `${name} received ${spend} (≈${usd}) from ${topName} over ${span} years across ${contracts} contracts. ${da}% were direct-award; ${hr}% flagged high or critical by the risk model. Confirmed corruption case in the Ground Truth database.`
      : `${name} recibió ${spend} (≈${usd}) de ${topName} a lo largo de ${span} años en ${contracts} contratos. ${da}% fueron adjudicación directa; ${hr}% marcados alto o crítico por el modelo de riesgo. Caso confirmado de corrupción en la base Ground Truth.`
  }
  // Frame 2: GT-confirmed, no single dominant client
  if (isGroundTruth) {
    return lang === 'en'
      ? `${name} holds ${contracts} contracts worth ${spend} (≈${usd}) across ${formatNumber(vendor.total_institutions)} institutions. ${da}% were direct-award; ${hr}% flagged high or critical. Confirmed corruption case in the Ground Truth database.`
      : `${name} tiene ${contracts} contratos por ${spend} (≈${usd}) con ${formatNumber(vendor.total_institutions)} instituciones. ${da}% fueron adjudicación directa; ${hr}% marcados alto o crítico. Caso confirmado de corrupción en la base Ground Truth.`
  }
  // Frame 3: High HR%, no GT
  if (hr >= 80) {
    return lang === 'en'
      ? `${name} holds ${contracts} contracts worth ${spend} (≈${usd}) — ${hr}% of them flagged high or critical by the risk model. ${da}% awarded without an open bid.${topName && dominant >= 35 ? ` ${topName} accounts for ${Math.round(dominant)}% of the total.` : ''}`
      : `${name} tiene ${contracts} contratos por ${spend} (≈${usd}) — ${hr}% marcados alto o crítico por el modelo. ${da}% otorgados sin licitación pública.${topName && dominant >= 35 ? ` ${topName} representa el ${Math.round(dominant)}% del total.` : ''}`
  }
  // Frame 4: Dominant client, moderate risk
  if (dominant >= 50 && topName) {
    return lang === 'en'
      ? `${name} earned ${spend} (≈${usd}) across ${contracts} contracts over ${span} years — ${Math.round(dominant)}% from ${topName} alone.`
      : `${name} ganó ${spend} (≈${usd}) en ${contracts} contratos a lo largo de ${span} años — el ${Math.round(dominant)}% solo de ${topName}.`
  }
  // Frame 5: Standard
  return lang === 'en'
    ? `${name} is a ${vendor.primary_sector_name ?? 'public-procurement'} supplier active ${span} years, with ${contracts} contracts worth ${spend} (≈${usd}) across ${formatNumber(vendor.total_institutions)} institutions.`
    : `${name} es un proveedor del sector ${vendor.primary_sector_name ?? 'público'} activo durante ${span} años, con ${contracts} contratos por ${spend} (≈${usd}) en ${formatNumber(vendor.total_institutions)} instituciones.`
}
