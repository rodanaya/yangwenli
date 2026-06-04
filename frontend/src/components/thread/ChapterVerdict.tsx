/**
 * ChapterVerdict — Chapter VI of the vendor dossier narrative.
 *
 * Redesigned 2026-05-25 (DESIGNUS round 6, component 7/10). Argument:
 * SO WHAT? Editorial closing — synthesizes evidence, presents the ARIA
 * memo, lists next steps a journalist or auditor would actually take.
 *
 * Self-contained chapter. Composition:
 *   1. Chapter heading (VI · VERDICT · Where this leaves us)
 *   2. Lede — single sentence synthesizing the case + risk indicator
 *   3. THE EVIDENCE — weighted list of signals (model · pattern · ARIA ·
 *      external · web · network)
 *   4. ARIA MEMO — when present, sector-rule italic block with expand
 *   5. WEB EVIDENCE — article cards from CENTINELA when present
 *   6. THE NEXT STEP — action buttons (vendor dossier · save · export)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cn, getRiskLevel } from '@/lib/utils'
import { ariaApi } from '@/api/client'
import { Building2, BookmarkPlus, Download, FileText } from 'lucide-react'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── Local constants ────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high:     RISK_COLORS.high,
  medium:   RISK_COLORS.medium,
  low:      'var(--color-text-muted)',
}

const PATTERN_META = (lang: 'en' | 'es'): Record<string, { label: string; color: string }> => ({
  P1: { label: lang === 'es' ? 'Monopolio concentrado' : 'Concentrated monopoly', color: RISK_COLORS.critical },
  P2: { label: lang === 'es' ? 'Empresa fantasma' : 'Ghost company', color: RISK_COLORS.critical },
  P3: { label: lang === 'es' ? 'Intermediario' : 'Intermediary', color: RISK_COLORS.high },
  P4: { label: lang === 'es' ? 'Soborno / colusión' : 'Kickback / collusion', color: RISK_COLORS.high },
  P5: { label: lang === 'es' ? 'Rotación de licitaciones' : 'Bid rotation', color: RISK_COLORS.high },
  P6: { label: lang === 'es' ? 'Captura institucional' : 'Institutional capture', color: RISK_COLORS.critical },
  P7: { label: lang === 'es' ? 'Vaciamiento presupuestal' : 'Budget dump', color: RISK_COLORS.medium },
})

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChapterVerdictProps {
  vendorId: number
  vendor: {
    name: string
    avg_risk_score?: number
    in_ground_truth?: boolean
    total_institutions: number
    sectors_count: number
    total_contracts: number
    primary_sector_name?: string
  }
  coBidderCount: number
  aria: {
    ips_final: number
    ips_tier: number
    primary_pattern: string | null
    review_status: string
    is_efos_definitivo: boolean
    is_sfp_sanctioned: boolean
    in_ground_truth: boolean
    memo_text?: string | null
    web_evidence_score?: number | null
    web_evidence_verdict?: string | null
    web_evidence_updated_at?: string | null
  } | null
  /** Accepted for call-site compatibility. */
  t?: unknown
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChapterVerdict({
  vendorId,
  vendor,
  coBidderCount,
  aria,
}: ChapterVerdictProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()

  const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const { data: webEvidence } = useQuery({
    queryKey: ['aria-web-evidence', vendorId],
    queryFn: () => ariaApi.getWebEvidence(vendorId),
    enabled: !!aria?.web_evidence_verdict && aria.web_evidence_verdict !== 'NEGATIVE',
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const score100 = (vendor.avg_risk_score ?? 0) * 100
  const patternMeta = aria?.primary_pattern ? PATTERN_META(lang)[aria.primary_pattern] : null

  const [memoExpanded, setMemoExpanded] = useState(false)

  // Build evidence rows — weighted, with sensible composition
  type EvidenceRow = { label: string; value: React.ReactNode; weight: 'high' | 'medium' | 'low' }
  const evidence: EvidenceRow[] = []

  evidence.push({
    label: lang === 'es' ? 'Indicador estadístico' : 'Statistical indicator',
    value: (
      <span>
        <span className="font-mono tabular-nums" style={{ color: riskColor, fontWeight: 700 }}>
          {score100.toFixed(0)}
        </span>
        <span className="text-text-muted"> / 100 · {localizeLevel(riskLevel, lang)}</span>
      </span>
    ),
    weight: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'medium',
  })

  if (patternMeta && aria?.primary_pattern) {
    evidence.push({
      label: lang === 'es' ? 'Patrón detectado' : 'Pattern detected',
      value: (
        <span>
          <span style={{ color: patternMeta.color, fontWeight: 700 }}>{aria.primary_pattern}</span>
          <span className="text-text-secondary"> · {patternMeta.label}</span>
        </span>
      ),
      weight: 'high',
    })
  }
  if (aria) {
    evidence.push({
      label: lang === 'es' ? 'Clasificación ARIA' : 'ARIA classification',
      value: (
        <span className="text-text-primary">
          Tier {aria.ips_tier} · IPS {(aria.ips_final * 100).toFixed(0)}
        </span>
      ),
      weight: aria.ips_tier <= 2 ? 'high' : 'medium',
    })
  }
  if (aria?.is_efos_definitivo || aria?.is_sfp_sanctioned || aria?.in_ground_truth) {
    const flags: string[] = []
    if (aria.is_efos_definitivo) flags.push('EFOS')
    if (aria.is_sfp_sanctioned) flags.push('SFP')
    if (aria.in_ground_truth) flags.push('GT')
    evidence.push({
      label: lang === 'es' ? 'Validación externa' : 'External validation',
      value: <span style={{ color: RISK_COLORS.critical, fontWeight: 700 }}>{flags.join(' · ')}</span>,
      weight: 'high',
    })
  }
  if (aria?.web_evidence_updated_at) {
    const webVerdict = aria.web_evidence_verdict
    if (webVerdict && webVerdict !== 'NEGATIVE' && (aria.web_evidence_score ?? 0) > 0) {
      const webColor =
        webVerdict === 'SANCTION' ? RISK_COLORS.critical
        : webVerdict === 'CORRUPTION_MENTION' ? RISK_COLORS.high
        : 'var(--color-text-secondary)'
      const webLabel =
        webVerdict === 'SANCTION'
          ? (lang === 'es' ? 'Sanción documentada' : 'Documented sanction')
          : webVerdict === 'CORRUPTION_MENTION'
          ? (lang === 'es' ? 'Mención noticiosa' : 'News mention')
          : (lang === 'es' ? 'Cobertura de prensa' : 'Press coverage')
      evidence.push({
        label: lang === 'es' ? 'Evidencia web' : 'Web evidence',
        value: (
          <span style={{ color: webColor }}>
            {webLabel} · {((aria.web_evidence_score ?? 0) * 100).toFixed(0)}%
          </span>
        ),
        weight: webVerdict === 'SANCTION' ? 'high' : 'medium',
      })
    }
  }
  evidence.push({
    label: lang === 'es' ? 'Red' : 'Network',
    value: (
      <span className="text-text-secondary">
        {coBidderCount} {lang === 'es' ? (coBidderCount === 1 ? 'co-licitante' : 'co-licitantes') : (coBidderCount === 1 ? 'co-bidder' : 'co-bidders')}{' '}
        · {vendor.total_institutions} {lang === 'es' ? 'inst.' : 'inst.'}
        {' '}· {vendor.sectors_count} {lang === 'es' ? (vendor.sectors_count === 1 ? 'sector' : 'sectores') : (vendor.sectors_count === 1 ? 'sector' : 'sectors')}
      </span>
    ),
    weight: 'low',
  })

  const lede = buildVerdictLede({ vendor, aria, riskLevel, patternMeta, lang })

  return (
    <ChapterShell id="chapter-verdict">
      <ChapterHeading
        numeral="VI"
        title={lang === 'es' ? 'El Veredicto' : 'Verdict'}
        subtitle={lang === 'es' ? 'Dónde nos deja esto' : 'Where this leaves us'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      {/* THE EVIDENCE */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'La evidencia' : 'The evidence'} />
        <ul className="mt-6 max-w-3xl mx-auto space-y-2 list-none p-0">
          {evidence.map((row, i) => (
            <li
              key={i}
              className="grid items-baseline"
              style={{
                gridTemplateColumns: '180px 1fr',
                gap: 16,
                borderLeft: `2px solid ${
                  row.weight === 'high' ? riskColor + 'aa'
                  : row.weight === 'medium' ? 'var(--color-border)'
                  : 'transparent'
                }`,
                paddingLeft: 14,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                }}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </FadeIn>

      {/* ARIA MEMO */}
      {aria?.memo_text && (
        <FadeIn className="mt-12">
          <SubheadRule label={lang === 'es' ? 'Memo ARIA' : 'ARIA memo'} />
          <div className="mt-6 max-w-3xl mx-auto">
            <div
              style={{
                borderLeft: `2px solid ${sectorAccent}`,
                paddingLeft: 18,
              }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: sectorAccent,
                    fontWeight: 700,
                    padding: '2px 6px',
                    background: `${sectorAccent}14`,
                    border: `1px solid ${sectorAccent}44`,
                    borderRadius: 2,
                  }}
                >
                  ES
                </span>
                <button
                  type="button"
                  onClick={() => setMemoExpanded((v) => !v)}
                  className="font-mono cursor-pointer hover:opacity-70 transition-opacity"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-secondary)',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  {memoExpanded
                    ? (lang === 'es' ? '× Colapsar' : '× Collapse')
                    : (lang === 'es' ? 'Leer memo completo →' : 'Read full memo →')}
                </button>
              </div>
              <div
                className={cn('text-text-secondary leading-relaxed', !memoExpanded && 'line-clamp-4')}
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: 13,
                  ...(memoExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
                }}
              >
                {memoExpanded ? renderMemoExpanded(aria.memo_text) : renderMemoCollapsed(aria.memo_text)}
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* WEB EVIDENCE */}
      {webEvidence && webEvidence.articles.length > 0 && (
        <FadeIn className="mt-12">
          <SubheadRule label={lang === 'es' ? 'Evidencia web · CENTINELA' : 'Web evidence · CENTINELA'} />
          <ul className="mt-6 max-w-3xl mx-auto space-y-3 list-none p-0">
            {webEvidence.articles.slice(0, 5).map((art, i) => {
              const isHigh = art.verdict === 'SANCTION' || art.verdict === 'CORRUPTION_MENTION'
              const verdictColor = art.verdict === 'SANCTION' ? RISK_COLORS.critical
                : art.verdict === 'CORRUPTION_MENTION' ? RISK_COLORS.high
                : 'var(--color-text-muted)'
              return (
                <li
                  key={i}
                  className="px-3 py-2"
                  style={{
                    borderLeft: `2px solid ${isHigh ? verdictColor : 'var(--color-border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: verdictColor,
                          padding: '2px 5px',
                          background: `${verdictColor}1f`,
                          border: `1px solid ${verdictColor}44`,
                          borderRadius: 2,
                        }}
                      >
                        {art.verdict}
                      </span>
                      {art.source_name && (
                        <span
                          className="font-mono truncate"
                          style={{ fontSize: 10, color: 'var(--color-text-muted)', maxWidth: 180 }}
                        >
                          {art.source_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                      {art.published_date && <span>{art.published_date.slice(0, 10)}</span>}
                      <span>{(art.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {art.snippet}
                  </p>
                  {art.source_url && (
                    <a
                      href={art.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-2 font-mono hover:opacity-70 transition-opacity"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                      }}
                    >
                      {lang === 'es' ? 'Ver artículo' : 'View article'} ↗
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </FadeIn>
      )}

      {/* THE NEXT STEP */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'Próximo paso' : 'Next step'} />
        <div className="mt-6 max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${vendorId}`)}
            className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] hover:opacity-90 transition-opacity"
            style={{
              fontSize: 11,
              background: RISK_COLORS.critical,
              color: '#fff',
              padding: '8px 14px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            {lang === 'es' ? 'Ficha completa' : 'Full vendor dossier'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/atlas')}
            className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] hover:bg-background-card transition-colors"
            style={{
              fontSize: 11,
              background: 'var(--color-background-elevated)',
              color: 'var(--color-text-primary)',
              padding: '8px 14px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {lang === 'es' ? 'Guardar' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              const prev = document.title
              document.title = `RUBLI — ${vendor.name} — Investigation Thread`
              window.print()
              window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
            }}
            className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] hover:bg-background-card transition-colors"
            style={{
              fontSize: 11,
              background: 'var(--color-background-elevated)',
              color: 'var(--color-text-primary)',
              padding: '8px 14px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            {lang === 'es' ? 'Exportar PDF' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/methodology')}
            className="ml-auto inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] hover:opacity-70 transition-opacity"
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <FileText className="w-3 h-3" aria-hidden="true" />
            {lang === 'es' ? 'Metodología' : 'Methodology'}
          </button>
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildVerdictLede({
  vendor,
  aria,
  riskLevel,
  patternMeta,
  lang,
}: {
  vendor: ChapterVerdictProps['vendor']
  aria: ChapterVerdictProps['aria']
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  patternMeta: { label: string; color: string } | null
  lang: 'en' | 'es'
}): string {
  const externalFlags: string[] = []
  if (aria?.is_efos_definitivo) externalFlags.push('EFOS')
  if (aria?.is_sfp_sanctioned) externalFlags.push('SFP')
  if (aria?.in_ground_truth || vendor.in_ground_truth) externalFlags.push(lang === 'es' ? 'Ground Truth' : 'Ground Truth')

  // Frame 1: GT-confirmed — strongest editorial verdict
  if (externalFlags.includes('Ground Truth') || externalFlags.includes('EFOS') || externalFlags.includes('SFP')) {
    const flagPhrase = externalFlags.length === 1
      ? externalFlags[0]
      : externalFlags.length === 2
        ? externalFlags.join(lang === 'es' ? ' y ' : ' and ')
        : (lang === 'es' ? 'múltiples registros externos' : 'multiple external registries')
    return lang === 'es'
      ? `El caso ya está documentado externamente — ${flagPhrase} — y la evidencia procuradora respalda esa lectura${patternMeta ? `, con patrón ${patternMeta.label.toLowerCase()}` : ''}. Para investigadores: la prioridad es contrastar nombres y RFCs con bases legales y proseguir con la verificación.`
      : `The case is already documented externally — ${flagPhrase} — and the procurement evidence supports that reading${patternMeta ? `, with a ${patternMeta.label.toLowerCase()} pattern` : ''}. For investigators: priority is cross-referencing names and RFCs against legal databases and pursuing verification.`
  }
  // Frame 2: Critical/high risk, no external validation
  if (riskLevel === 'critical' || riskLevel === 'high') {
    return lang === 'es'
      ? `El modelo de riesgo arroja una señal ${riskLevel === 'critical' ? 'crítica' : 'alta'}${patternMeta ? ` consistente con ${patternMeta.label.toLowerCase()}` : ''}, pero el caso no aparece todavía en registros externos. Es un perfil prioritario para verificación periodística — los patrones procuradores son fuertes; falta confirmación documental.`
      : `The risk model returns a ${riskLevel} signal${patternMeta ? ` consistent with ${patternMeta.label.toLowerCase()}` : ''}, but the case hasn't surfaced in external registries yet. This is a priority profile for journalistic verification — the procurement patterns are strong; documentary confirmation is what's missing.`
  }
  // Frame 3: Medium risk
  if (riskLevel === 'medium') {
    return lang === 'es'
      ? `El modelo identifica anomalías moderadas en este proveedor — vale la pena monitorear su evolución pero no es prioridad absoluta dentro del panorama actual.`
      : `The model identifies moderate anomalies in this vendor — worth monitoring its evolution but not an absolute priority within the current landscape.`
  }
  // Frame 4: Low risk
  return lang === 'es'
    ? `Las señales procuradoras no se destacan contra la línea base sectorial. Sin embargo, ausencia de evidencia no es evidencia de ausencia.`
    : `Procurement signals do not stand out against the sector baseline. That said, absence of evidence is not evidence of absence.`
}

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level
  return level === 'critical' ? 'crítico'
    : level === 'high' ? 'alto'
    : level === 'medium' ? 'medio'
    : 'bajo'
}

function renderMemoExpanded(memo: string): React.ReactNode {
  return memo.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-text-primary text-sm mt-3">{line.slice(4)}</h4>
    if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-text-primary text-base mt-4">{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-text-primary text-lg mt-4">{line.slice(2)}</h2>
    if (line.trim() === '') return <div key={i} className="h-2" />
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
      const isSeparator = cells.every((c) => /^[-: ]+$/.test(c))
      if (isSeparator) return null
      return (
        <div key={i} className="flex gap-2 text-xs my-1">
          {cells.map((cell, ci) => (
            <span key={ci} className={cn('flex-1 px-2 py-1 bg-background-elevated rounded', ci === 0 ? 'text-text-muted' : 'text-text-primary font-medium')}>
              {cell.trim()}
            </span>
          ))}
        </div>
      )
    }
    const parts = line.split(/\*\*(.+?)\*\*/g)
    return (
      <p key={i} className="my-1">
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-text-primary">{part}</strong> : part))}
      </p>
    )
  })
}

function renderMemoCollapsed(memo: string): string {
  const lines = memo.split('\n')
  const meaningful = lines.filter((l) => {
    const s = l.trim()
    if (!s) return false
    if (s.startsWith('#')) return false
    if (/^[=\-]{3,}$/.test(s)) return false
    if (s.startsWith('|') && s.endsWith('|')) return false
    if (/^MEMO DE INVESTIGACI[OÓ]N/i.test(s)) return false
    if (/^RESUMEN EJECUTIVO/i.test(s)) return false
    return true
  })
  return meaningful.slice(0, 3).join(' ').replace(/\*\*/g, '').slice(0, 350)
}
