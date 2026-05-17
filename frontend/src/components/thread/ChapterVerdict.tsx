/**
 * ChapterVerdict — Chapter 6: The Verdict
 * Extracted from RedThread.tsx.
 *
 * Synthesizes all evidence into a prosecutorial closing argument:
 * Question → Evidence → Finding → Memo → Next Steps.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cn, getRiskLevel } from '@/lib/utils'
import { ariaApi } from '@/api/client'
import { Building2, BookmarkPlus, Download, FileText } from 'lucide-react'

// ─── Local constants ─────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

function getPatternMeta(t: (key: string) => string): Record<string, { label: string; color: string; bg: string; description: string }> {
  return {
    P1: { label: t('patterns.P1.label'), color: 'var(--color-risk-critical)',   bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P1.description') },
    P2: { label: t('patterns.P2.label'), color: 'var(--color-risk-critical)',   bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P2.description') },
    P3: { label: t('patterns.P3.label'), color: 'var(--color-risk-high)',       bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P3.description') },
    P4: { label: t('patterns.P4.label'), color: 'var(--color-risk-high)',       bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P4.description') },
    P5: { label: t('patterns.P5.label'), color: 'var(--color-accent-data)',     bg: 'rgba(37,99,235,0.10)',   description: t('patterns.P5.description') },
    P6: { label: t('patterns.P6.label'), color: 'var(--color-accent)',          bg: 'rgba(160,104,32,0.10)',  description: t('patterns.P6.description') },
    P7: { label: t('patterns.P7.label'), color: 'var(--color-sector-hacienda)', bg: 'rgba(22,163,74,0.10)',   description: t('patterns.P7.description') },
  }
}

// ─── VerdictGauge ────────────────────────────────────────────────────────────

function VerdictGauge({ score, color }: { score: number; color: string }) {
  const W = 160
  const H = 92
  const cx = W / 2
  const cy = H - 6
  const R = 64
  const angleRad = ((score / 100) * 180 - 180) * (Math.PI / 180)
  const needleLen = R - 6
  const nx = cx + Math.cos(angleRad) * needleLen
  const ny = cy + Math.sin(angleRad) * needleLen

  const segments = [
    { from: 0,  to: 25,  color: 'var(--color-text-muted)' },
    { from: 25, to: 40,  color: 'var(--color-risk-medium)' },
    { from: 40, to: 60,  color: 'var(--color-risk-high)' },
    { from: 60, to: 100, color: 'var(--color-risk-critical)' },
  ]

  const arcPoint = (pct: number) => {
    const a = (pct / 100) * 180 - 180
    const r = a * (Math.PI / 180)
    return { x: cx + Math.cos(r) * R, y: cy + Math.sin(r) * R }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[160px] h-auto" role="img" aria-label={`Risk score gauge: ${score.toFixed(0)} out of 100`}>
      {segments.map((s) => {
        const p1 = arcPoint(s.from)
        const p2 = arcPoint(s.to)
        const largeArc = s.to - s.from > 50 ? 1 : 0
        return (
          <path
            key={`seg-${s.from}`}
            d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y}`}
            stroke={s.color}
            strokeWidth={6}
            fill="none"
            opacity={0.85}
            strokeLinecap="butt"
          />
        )
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="var(--color-background-card)" stroke={color} strokeWidth={2} />
      <text x={cx} y={cy - R - 8} textAnchor="middle" fontSize={20} fontFamily="var(--font-family-serif)" fontStyle="italic" fontWeight={800} fill={color}>
        {score.toFixed(0)}
      </text>
    </svg>
  )
}

// ─── ChapterShell ────────────────────────────────────────────────────────────

function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-5 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

function RedThreadChapter({ label, title }: { label: string; title: React.ReactNode }) {
  return (
    <header>
      <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">{label}</h2>
      <h2 className="font-serif text-xl font-bold text-text-primary mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {title}
      </h2>
    </header>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChapterVerdictProps {
  vendorId: number
  vendor: {
    name: string
    avg_risk_score?: number
    in_ground_truth?: boolean
    total_institutions: number
    sectors_count: number
    total_contracts: number
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
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  t?: unknown
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChapterVerdict({
  vendorId,
  vendor,
  coBidderCount,
  aria,
}: ChapterVerdictProps) {
  const { t } = useTranslation('redThread')
  const navigate = useNavigate()

  const { data: webEvidence } = useQuery({
    queryKey: ['aria-web-evidence', vendorId],
    queryFn: () => ariaApi.getWebEvidence(vendorId),
    enabled: !!aria?.web_evidence_verdict && aria.web_evidence_verdict !== 'NEGATIVE',
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const PATTERN_META = getPatternMeta(t)
  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const patternMeta = aria?.primary_pattern ? PATTERN_META[aria.primary_pattern] : null
  const score100 = (vendor.avg_risk_score ?? 0) * 100

  const [memoExpanded, setMemoExpanded] = useState(false)

  const finding =
    riskLevel === 'critical' ? t('verdict.finding.critical', { defaultValue: 'The data warrants urgent investigation.' })
    : riskLevel === 'high'   ? t('verdict.finding.high',     { defaultValue: 'Statistical signals warrant scrutiny.' })
    : riskLevel === 'medium' ? t('verdict.finding.medium',   { defaultValue: 'Anomalies present. Verification recommended.' })
    : t('verdict.finding.low', { defaultValue: 'No standout signals against sector baseline.' })

  type EvidenceRow = { label: string; value: React.ReactNode; weight: 'high' | 'medium' | 'low' }
  const evidence: EvidenceRow[] = [
    {
      label: t('verdict.evidence.signal', { defaultValue: 'Statistical signal' }),
      value: <span><span className="font-mono tabular-nums" style={{ color: riskColor }}>{score100.toFixed(1)} / 100</span> <span className="text-text-muted">({riskLevel})</span></span>,
      weight: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'medium',
    },
  ]
  if (patternMeta && aria?.primary_pattern) {
    evidence.push({
      label: t('verdict.evidence.pattern', { defaultValue: 'Pattern detected' }),
      value: <span style={{ color: patternMeta.color }}>{aria.primary_pattern} · <span className="text-text-primary">{patternMeta.label}</span></span>,
      weight: 'high',
    })
  }
  if (aria) {
    evidence.push({
      label: t('verdict.evidence.aria', { defaultValue: 'ARIA classification' }),
      value: <span className="text-text-primary">Tier {aria.ips_tier} · IPS {(aria.ips_final * 100).toFixed(0)}</span>,
      weight: aria.ips_tier <= 2 ? 'high' : 'medium',
    })
  }
  if (aria?.is_efos_definitivo || aria?.is_sfp_sanctioned || aria?.in_ground_truth) {
    const flags: string[] = []
    if (aria.is_efos_definitivo) flags.push('EFOS')
    if (aria.is_sfp_sanctioned) flags.push('SFP')
    if (aria.in_ground_truth) flags.push(t('verdict.groundTruthLabel', { defaultValue: 'GT' }))
    evidence.push({
      label: t('verdict.evidence.external', { defaultValue: 'External validation' }),
      value: <span className="text-accent">{flags.join(' · ')}</span>,
      weight: 'high',
    })
  }
  if (aria?.web_evidence_updated_at) {
    const webVerdict = aria.web_evidence_verdict
    if (webVerdict && webVerdict !== 'NEGATIVE' && (aria.web_evidence_score ?? 0) > 0) {
      const webColor = webVerdict === 'SANCTION' ? 'var(--color-risk-critical)' : webVerdict === 'CORRUPTION_MENTION' ? 'var(--color-risk-high)' : 'var(--color-text-secondary)'
      const webLabel = webVerdict === 'SANCTION' ? 'Sanción documentada' : webVerdict === 'CORRUPTION_MENTION' ? 'Mención en noticias' : 'Cobertura periodística'
      evidence.push({
        label: 'Evidencia web (CENTINELA)',
        value: <span style={{ color: webColor }}>{webLabel} · {((aria.web_evidence_score ?? 0) * 100).toFixed(0)}%</span>,
        weight: webVerdict === 'SANCTION' ? 'high' : 'medium',
      })
    } else {
      evidence.push({
        label: 'Búsqueda web (CENTINELA)',
        value: <span className="text-text-muted">Sin cobertura encontrada</span>,
        weight: 'low',
      })
    }
  }
  evidence.push({
    label: t('verdict.evidence.network', { defaultValue: 'Network' }),
    value: <span className="text-text-primary">{coBidderCount} co-bidder{coBidderCount === 1 ? '' : 's'} · {vendor.total_institutions} inst. · {vendor.sectors_count} sector{vendor.sectors_count === 1 ? '' : 's'}</span>,
    weight: 'low',
  })

  return (
    <ChapterShell id="chapter-verdict">
      <RedThreadChapter label={t('chapters.headings.verdict')} title={t('verdict.heading')} />

      {/* Verdict header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1">
            {t('verdict.theQuestion', { defaultValue: 'The Question' })}
          </p>
          <p className="text-text-primary text-base leading-snug max-w-md">
            {t('verdict.questionText', {
              defaultValue: "Does this vendor's procurement record warrant investigation?",
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <VerdictGauge score={score100} color={riskColor} />
        </div>
      </div>

      {/* The Evidence */}
      <div className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theEvidence', { defaultValue: 'The Evidence' })}
        </p>
        <ul className="space-y-1.5">
          {evidence.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-[150px_1fr] gap-3 items-baseline border-l-2 pl-3 py-1"
              style={{
                borderLeftColor: row.weight === 'high' ? riskColor + '99' : row.weight === 'medium' ? 'var(--color-border)' : 'transparent',
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">{row.label}</span>
              <span className="text-xs">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The Finding */}
      <div className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theFinding', { defaultValue: 'The Finding' })}
        </p>
        <p
          className="text-text-primary leading-snug max-w-2xl"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)',
            borderLeft: `2px solid ${riskColor}`,
            paddingLeft: '0.85rem',
          }}
        >
          {finding}
        </p>
      </div>

      {/* ARIA memo */}
      {aria?.memo_text && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
              {t('verdict.ariaMemoTitle', { defaultValue: 'ARIA Intelligence Memo' })}
            </p>
            <button
              onClick={() => setMemoExpanded((v) => !v)}
              className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors"
            >
              {memoExpanded ? '— Collapse' : '+ Read full memo'}
            </button>
          </div>
          <div className="border-l-2 border-[var(--color-accent)] pl-3">
            <div
              className={cn('text-text-secondary text-xs leading-relaxed', !memoExpanded && 'line-clamp-4')}
              style={!memoExpanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
            >
              {memoExpanded ? (
                aria.memo_text.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-text-primary text-xs mt-2">{line.slice(4)}</h4>
                  if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-text-primary text-sm mt-3">{line.slice(3)}</h3>
                  if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-text-primary text-base mt-3">{line.slice(2)}</h2>
                  if (line.trim() === '') return <div key={i} className="h-1" />
                  if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                    const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
                    const isSeparator = cells.every((c) => /^[-: ]+$/.test(c))
                    if (isSeparator) return null
                    return (
                      <div key={i} className="flex gap-2 text-[11px] my-1">
                        {cells.map((cell, ci) => (
                          <span key={ci} className={cn('flex-1 px-2 py-0.5 bg-background-elevated rounded', ci === 0 ? 'text-text-muted' : 'text-text-primary font-medium')}>{cell.trim()}</span>
                        ))}
                      </div>
                    )
                  }
                  const parts = line.split(/\*\*(.+?)\*\*/g)
                  return (
                    <p key={i} className="my-0.5">
                      {parts.map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-text-primary">{part}</strong> : part))}
                    </p>
                  )
                })
              ) : (
                aria.memo_text.replace(/[#*]/g, '').slice(0, 380)
              )}
            </div>
          </div>
        </div>
      )}

      {/* CENTINELA web evidence articles */}
      {webEvidence && webEvidence.articles.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
            Evidencia Web · CENTINELA
          </p>
          <div className="flex flex-col gap-1.5">
            {webEvidence.articles.slice(0, 5).map((art, i) => {
              const isHigh = art.verdict === 'SANCTION' || art.verdict === 'CORRUPTION_MENTION'
              return (
                <div key={i} className={cn('border rounded-sm p-2 text-[11px]', isHigh ? 'border-risk-high/40 bg-risk-high/5' : 'border-border bg-background-elevated')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-mono font-bold uppercase tracking-wider text-[9px] px-1 py-0.5 rounded border', art.verdict === 'SANCTION' ? 'text-risk-critical bg-risk-critical/10 border-risk-critical/30' : art.verdict === 'CORRUPTION_MENTION' ? 'text-risk-high bg-risk-high/10 border-risk-high/30' : 'text-text-secondary bg-background-card border-border')}>
                        {art.verdict}
                      </span>
                      {art.source_name && (
                        <span className="text-[9px] font-mono text-text-muted truncate max-w-[120px]">{art.source_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {art.published_date && (
                        <span className="text-[9px] font-mono text-text-muted">{art.published_date.slice(0, 16)}</span>
                      )}
                      <span className="text-text-muted font-mono tabular-nums text-[9px]">{(art.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-text-primary mt-1 leading-snug">{art.snippet}</p>
                  {art.source_url && (
                    <a
                      href={art.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors underline"
                    >
                      Ver artículo →
                    <span className="sr-only"> (opens in new tab)</span></a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* The Next Step */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theNextStep', { defaultValue: 'The Next Step' })}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/vendors/${vendorId}`)}
            className="inline-flex items-center gap-1.5 bg-[var(--color-risk-critical)] hover:opacity-90 text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-opacity"
          >
            <Building2 className="w-3.5 h-3.5" />
            {t('verdict.fullVendorProfile')}
          </button>
          <Link
            to="/workspace"
            className="inline-flex items-center gap-1.5 bg-background-elevated hover:bg-background-card text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-colors border border-border"
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {t('verdict.addToWorkspace')}
          </Link>
          <button
            onClick={() => {
              const prev = document.title
              document.title = `RUBLI — ${vendor.name} — Investigation Thread`
              window.print()
              window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
            }}
            className="inline-flex items-center gap-1.5 bg-background-elevated hover:bg-background-card text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-colors border border-border"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            {t('verdict.exportPdf')}
          </button>
          <Link
            to="/methodology"
            className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
          >
            <FileText className="w-3 h-3" aria-hidden="true" />
            {t('verdict.methodologyLink')}
          </Link>
        </div>
      </div>
    </ChapterShell>
  )
}
