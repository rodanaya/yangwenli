/**
 * PatternDiagnostic — Chapter V of the vendor dossier narrative.
 *
 * Redesigned 2026-05-25 (DESIGNUS round 6, component 6/10). Argument:
 * THE MODEL'S READING. What does v0.8.5 actually see in this vendor's
 * data — and which signals push the verdict?
 *
 * Self-contained chapter. Composition:
 *   1. Chapter heading (V · PATTERN · The model's reading)
 *   2. Lede — plain-language summary of top 2 driving signals
 *   3. ARIA PATTERN — pattern chip + description (P1..P7) when classified
 *   4. THE DIAGNOSTIC — lab-report layout with feature rows showing
 *      z-score position vs sector p25-p75 reference band
 *
 * The lab-report metaphor (preserved from the original) inherits
 * credibility from medicine — this reads as a diagnosis, not opinion.
 */

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Feature {
  feature: string
  contribution: number
  z_score: number
  label_en: string
  label_es?: string
}

interface PatternDiagnosticProps {
  features: Feature[]
  ariaPattern?: string | null
  primarySectorName?: string
  isLoading?: boolean
  /** Accepted for call-site compatibility. */
  inView?: boolean
  raisesLabel?: string
  lowersLabel?: string
  referenceLabel?: string
  diagnosisLabel?: string
  headerDiagnosis?: string
  headerFeature?: string
  headerShap?: string
  legendTail?: string
  legendWithin?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PatternDiagnostic({
  features,
  ariaPattern,
  primarySectorName,
  isLoading,
}: PatternDiagnosticProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = primarySectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const safeFeatures = Array.isArray(features) ? features : []
  const sorted = [...safeFeatures]
    .filter((f) => Math.abs(f.contribution) > 0.001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6)

  // Top-2 drivers shape the lede
  const topDrivers = sorted.filter((f) => f.contribution > 0).slice(0, 2)
  const lede = buildPatternLede({ topDrivers, ariaPattern, lang })

  const patternMeta = ariaPattern ? PATTERN_META(lang)[ariaPattern] : null

  return (
    <ChapterShell id="chapter-pattern">
      <ChapterHeading
        numeral="V"
        title={lang === 'es' ? 'El Patrón' : 'Pattern'}
        subtitle={lang === 'es' ? 'La lectura del modelo' : "The model's reading"}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      {/* ARIA PATTERN */}
      {patternMeta && ariaPattern && (
        <FadeIn className="mt-12">
          <SubheadRule label={lang === 'es' ? 'Clasificación ARIA' : 'ARIA classification'} />
          <div
            className="mt-6 max-w-3xl mx-auto px-4 py-3"
            style={{
              borderLeft: `2px solid ${patternMeta.color}`,
              paddingLeft: 16,
              background: `${patternMeta.color}08`,
            }}
          >
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: patternMeta.color,
                  fontWeight: 700,
                }}
              >
                {ariaPattern} · {patternMeta.label}
              </span>
            </div>
            <p
              style={{
                fontFamily: '"Source Serif Pro", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--color-text-secondary)',
              }}
            >
              {patternMeta.description}
            </p>
          </div>
        </FadeIn>
      )}

      {/* THE DIAGNOSTIC */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'El diagnóstico' : 'The diagnostic'} />
        <div ref={ref} className="mt-7 max-w-3xl mx-auto">
          {isLoading && safeFeatures.length === 0 ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="h-4 bg-background-elevated rounded animate-pulse w-3/4" />
              <div className="h-4 bg-background-elevated rounded animate-pulse w-full" />
              <div className="h-4 bg-background-elevated rounded animate-pulse w-5/6" />
            </div>
          ) : sorted.length === 0 ? (
            <p
              className="text-center"
              style={{
                fontFamily: '"Source Serif Pro", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--color-text-muted)',
              }}
            >
              {lang === 'es'
                ? 'No hay descomposición SHAP disponible para este proveedor.'
                : 'No SHAP decomposition available for this vendor.'}
            </p>
          ) : (
            <LabReport features={sorted} inView={inView} sectorAccent={sectorAccent} lang={lang} />
          )}
        </div>
        <p
          className="mt-5 font-mono text-center"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            opacity: 0.65,
          }}
        >
          {lang === 'es'
            ? 'MODELO v0.8.5 · DESCOMPOSICIÓN SHAP · BANDA REF SECTORIAL p25–p75'
            : 'MODEL v0.8.5 · SHAP DECOMPOSITION · SECTOR p25–p75 REFERENCE BAND'}
        </p>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── LabReport ──────────────────────────────────────────────────────────────

function LabReport({
  features,
  inView,
  sectorAccent: _sectorAccent,
  lang,
}: {
  features: Feature[]
  inView: boolean
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const SCALE_W = 380
  const ROW_H = 28
  const Z_RANGE = 3

  const xOf = (z: number) => {
    const clamped = Math.max(-Z_RANGE, Math.min(Z_RANGE, z))
    return ((clamped + Z_RANGE) / (2 * Z_RANGE)) * SCALE_W
  }

  return (
    <div>
      {/* Header row */}
      <div
        className="grid items-center pb-2 mb-2"
        style={{
          gridTemplateColumns: '170px 1fr 76px',
          gap: 16,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          {lang === 'es' ? 'Característica' : 'Feature'}
        </div>
        <div
          className="flex items-center justify-between font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            color: 'var(--color-text-muted)',
            opacity: 0.7,
          }}
        >
          <span>−3σ</span>
          <span style={{ opacity: 0.5 }}>{lang === 'es' ? 'media sectorial' : 'sector mean'}</span>
          <span>+3σ</span>
        </div>
        <div
          className="text-right font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          SHAP
        </div>
      </div>

      {/* Lab rows */}
      <div className="space-y-1">
        {features.map((f, idx) => {
          const isPositive = f.contribution > 0
          const isAnomalous = Math.abs(f.z_score) >= 1
          const markerColor = isPositive
            ? (isAnomalous ? RISK_COLORS.critical : RISK_COLORS.medium)
            : 'var(--color-text-muted)'
          const contribColor = isPositive
            ? (isAnomalous ? RISK_COLORS.critical : RISK_COLORS.high)
            : 'var(--color-text-muted)'
          const markerX = xOf(f.z_score)
          const delay = inView ? `${idx * 60}ms` : '0ms'
          const featureLabel = (lang === 'es' && f.label_es) ? f.label_es : f.label_en

          return (
            <div
              key={f.feature}
              className={cn(
                'grid items-center px-2 py-1.5',
                isAnomalous && isPositive ? 'bg-risk-critical/[0.03]' : '',
              )}
              style={{
                gridTemplateColumns: '170px 1fr 76px',
                gap: 16,
                borderLeft: isAnomalous && isPositive ? `2px solid ${markerColor}` : '2px solid transparent',
                opacity: inView ? 1 : 0,
                transition: `opacity 0.4s ease ${delay}`,
              }}
            >
              {/* Feature name */}
              <div className="min-w-0">
                <div
                  className="leading-tight truncate"
                  style={{
                    fontFamily: '"Source Serif Pro", Georgia, serif',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                  }}
                  title={featureLabel}
                >
                  {featureLabel}
                </div>
                <div
                  className="font-mono tabular-nums"
                  style={{ fontSize: 9, color: 'var(--color-text-muted)' }}
                >
                  z = {f.z_score.toFixed(2)}σ ·{' '}
                  {isPositive
                    ? (lang === 'es' ? 'sube riesgo' : 'raises')
                    : (lang === 'es' ? 'protector' : 'lowers')}
                </div>
              </div>

              {/* Lab scale */}
              <div className="relative w-full" style={{ height: ROW_H }}>
                <svg
                  viewBox={`0 0 ${SCALE_W} ${ROW_H}`}
                  className="w-full"
                  preserveAspectRatio="none"
                  style={{ height: ROW_H }}
                  role="img"
                  aria-label={`${featureLabel} z-score lab scale`}
                >
                  {/* Background rail */}
                  <line
                    x1={0}
                    x2={SCALE_W}
                    y1={ROW_H / 2}
                    y2={ROW_H / 2}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                  />
                  {/* Sector reference band p25-p75 ≈ ±0.674σ */}
                  <rect
                    x={xOf(-0.674)}
                    y={ROW_H / 2 - 6}
                    width={xOf(0.674) - xOf(-0.674)}
                    height={12}
                    fill="var(--color-text-muted)"
                    fillOpacity={0.08}
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                  />
                  {/* Center tick — sector mean */}
                  <line
                    x1={xOf(0)}
                    x2={xOf(0)}
                    y1={ROW_H / 2 - 7}
                    y2={ROW_H / 2 + 7}
                    stroke="var(--color-text-muted)"
                    strokeWidth={0.6}
                    opacity={0.5}
                  />
                  {/* ±2σ tail markers */}
                  {[-2, 2].map((z) => (
                    <line
                      key={z}
                      x1={xOf(z)}
                      x2={xOf(z)}
                      y1={ROW_H / 2 - 4}
                      y2={ROW_H / 2 + 4}
                      stroke="var(--color-text-muted)"
                      strokeWidth={0.5}
                      opacity={0.35}
                    />
                  ))}
                  {/* Out-of-range tail tinting */}
                  {Math.abs(f.z_score) >= 2 && (
                    <rect
                      x={f.z_score > 0 ? xOf(2) : 0}
                      y={ROW_H / 2 - 6}
                      width={f.z_score > 0 ? SCALE_W - xOf(2) : xOf(-2)}
                      height={12}
                      fill={markerColor}
                      fillOpacity={0.10}
                    />
                  )}
                </svg>
                {/* Vendor marker dot */}
                <span
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${(markerX / SCALE_W) * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 10,
                    height: 10,
                    backgroundColor: markerColor,
                    border: '1.5px solid var(--color-background)',
                    boxShadow: isAnomalous ? `0 0 4px ${markerColor}aa` : undefined,
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* SHAP contribution */}
              <div className="text-right">
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 15,
                    color: contribColor,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {isPositive ? '+' : ''}
                  {f.contribution.toFixed(3)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-4 mt-4 pt-3 font-mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          opacity: 0.75,
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-2 rounded-sm border border-dashed"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(115,115,115,0.08)' }}
          />
          {lang === 'es' ? 'banda ref' : 'reference'}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: RISK_COLORS.critical }}
            aria-hidden="true"
          />
          {lang === 'es' ? 'cola (|z|≥1) sube riesgo' : 'tail (|z|≥1) raises risk'}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--color-text-muted)' }}
            aria-hidden="true"
          />
          {lang === 'es' ? 'dentro de rango' : 'within range'}
        </span>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PATTERN_META = (lang: 'en' | 'es'): Record<string, { label: string; color: string; description: string }> => ({
  P1: {
    label: lang === 'es' ? 'Monopolio concentrado' : 'Concentrated monopoly',
    color: RISK_COLORS.critical,
    description: lang === 'es'
      ? 'Pocos proveedores capturan la mayor parte del gasto en categorías específicas — patrón típico de oligopolio farmacéutico o tecnológico.'
      : 'A few vendors capture most spend in specific categories — typical pharmaceutical or tech oligopoly pattern.',
  },
  P2: {
    label: lang === 'es' ? 'Empresa fantasma' : 'Ghost company',
    color: RISK_COLORS.critical,
    description: lang === 'es'
      ? 'Operaciones de muy corta duración con altos volúmenes — características de empresas creadas para canalizar fondos públicos.'
      : 'Very short-lived operations with high volumes — characteristic of companies created to channel public funds.',
  },
  P3: {
    label: lang === 'es' ? 'Intermediario' : 'Intermediary',
    color: RISK_COLORS.high,
    description: lang === 'es'
      ? 'Empresa que actúa como puente entre instituciones y proveedores finales, agregando costos sin valor productivo claro.'
      : 'Company acting as a bridge between institutions and end vendors, adding cost without clear productive value.',
  },
  P4: {
    label: lang === 'es' ? 'Soborno / colusión' : 'Kickback / collusion',
    color: RISK_COLORS.high,
    description: lang === 'es'
      ? 'Patrones de licitación que sugieren coordinación entre postores: rotación de ganadores, precios sospechosamente alineados.'
      : 'Bidding patterns suggesting coordination among bidders: winner rotation, suspiciously aligned prices.',
  },
  P5: {
    label: lang === 'es' ? 'Rotación de licitaciones' : 'Bid rotation',
    color: RISK_COLORS.high,
    description: lang === 'es'
      ? 'Patrón cíclico en el que un grupo cerrado de proveedores se turna para ganar contratos, manteniendo precios elevados.'
      : 'Cyclical pattern where a closed vendor group takes turns winning contracts, keeping prices elevated.',
  },
  P6: {
    label: lang === 'es' ? 'Captura institucional' : 'Institutional capture',
    color: RISK_COLORS.critical,
    description: lang === 'es'
      ? 'Una sola institución concentra la mayor parte del gasto del proveedor — relación de dependencia que evade controles competitivos.'
      : 'A single institution concentrates most of the vendor spend — dependency relationship that bypasses competitive controls.',
  },
  P7: {
    label: lang === 'es' ? 'Vaciamiento presupuestal' : 'Budget dump',
    color: RISK_COLORS.medium,
    description: lang === 'es'
      ? 'Concentración anómala de contratos en cierre de ejercicio fiscal — uso de remanentes para evitar la devolución al erario.'
      : 'Anomalous concentration of contracts at fiscal year-end — using surplus to avoid returning funds to the treasury.',
  },
})

function buildPatternLede({
  topDrivers,
  ariaPattern,
  lang,
}: {
  topDrivers: Feature[]
  ariaPattern?: string | null
  lang: 'en' | 'es'
}): string {
  if (topDrivers.length === 0) {
    return lang === 'es'
      ? 'El modelo de riesgo v0.8.5 no encontró señales de procuración anómalas significativas en los datos de este proveedor.'
      : "The v0.8.5 risk model found no significant procurement anomalies in this vendor's data."
  }

  const driverNames = topDrivers
    .map((f) => (lang === 'es' && f.label_es ? f.label_es : f.label_en).toLowerCase())
    .slice(0, 2)
    .join(lang === 'es' ? ' y ' : ' and ')

  if (ariaPattern && PATTERN_META(lang)[ariaPattern]) {
    const meta = PATTERN_META(lang)[ariaPattern]
    return lang === 'es'
      ? `ARIA clasifica este proveedor como ${ariaPattern} — ${meta.label.toLowerCase()}. Los factores que más empujan el modelo hacia esa lectura son ${driverNames}.`
      : `ARIA classifies this vendor as ${ariaPattern} — ${meta.label.toLowerCase()}. The factors pushing the model toward that reading are ${driverNames}.`
  }

  return lang === 'es'
    ? `Los factores que más empujan al modelo de riesgo v0.8.5 hacia su veredicto son ${driverNames}.`
    : `The factors pushing the v0.8.5 risk model toward its verdict are ${driverNames}.`
}
