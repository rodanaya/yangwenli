/**
 * AriaMemoPanel — displays LLM-generated investigation memos for a vendor
 *
 * Fetches from GET /aria/memos/{vendorId} and renders it as a § block in the
 * dossier's own voice (PARALLAX D10b § Change 3): SubSectionTitle kicker, mono
 * provenance seals, one EB Garamond reading column at the 640 measure, sources +
 * actions in a right rail when the panel itself is ≥ 64rem wide (container
 * query — the same panel also renders inside the narrow /aria row expand).
 * Chrome is bilingual (`aria` namespace); the memo text stays as written.
 * The vendor's RFC is never rendered or copied (.claude/rules/security.md § 1).
 */

import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ariaApi, vendorApi } from '@/api/client'
import type { AriaMemoResponse, VendorSHAPResponse } from '@/api/client'
import { cn } from '@/lib/utils'
import { RISK_TEXT_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatEntityName } from '@/lib/entity/format'
import { redactRfc } from '@/lib/redact'
import { Skeleton } from '@/components/ui/skeleton'
import { SubSectionTitle } from '@/components/dossier/SubSectionTitle'
import { Copy, Check, AlertCircle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AriaMemoProps {
  vendorId: number
  vendorName: string
  tier?: number
  /** Vendor flagged as structural false positive (e.g. multinational pharma OEM).
   *  Per docs/DATA_INTEGRITY_PLAN.md task N.2 — defamation guard. */
  isFalsePositive?: boolean
  fpReason?: string
  className?: string
}

// Heuristic: detect templated/auto-generated memos so the UI can demote them
// honestly. Per docs/DATA_INTEGRITY_PLAN.md task N.3 — 38% of memos are
// template strings whose "FUENTES" block is a search prompt, not citations.
function isTemplatedMemo(text: string): boolean {
  if (!text) return false
  return (
    text.includes('Buscar manualmente') ||
    text.includes('PREGUNTAS DE INVESTIGACIÓN') ||
    /Hipótesis Alternativas?:/.test(text) ||
    text.includes('Animal Político / Proceso / Latinus')
  )
}

// Heuristic: detect memos written before the Mar 25 v0.8.5 rescore.
// Per docs/DATA_INTEGRITY_PLAN.md task N.4.
function hasStaleModelReference(text: string): boolean {
  if (!text) return false
  return /\bv5\.[01]\b/.test(text) || /modelo v5\b/i.test(text)
}

// ---------------------------------------------------------------------------
// Shared type
// ---------------------------------------------------------------------------

const SERIF = '"EB Garamond", Georgia, serif'
const MEMO_OCHRE = 'var(--color-accent)'
const KICKER_STYLE = { fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 } as const
const BODY_STYLE = { fontFamily: SERIF, fontSize: 15, lineHeight: 1.55, color: 'var(--color-text-secondary)' } as const

// Mono seal — the dossier's provenance stamp (hairline border, ink only).
function Seal({ children, ink }: { children: ReactNode; ink: string }) {
  return (
    <span
      className="inline-flex items-center font-mono font-bold uppercase rounded-sm"
      style={{ fontSize: 12, letterSpacing: '0.12em', padding: '1px 6px', color: ink, border: '1px solid currentColor', lineHeight: 1.4 }}
    >
      {children}
    </span>
  )
}

const TIER_INK: Record<number, string> = {
  1: RISK_TEXT_COLORS.critical,
  2: RISK_TEXT_COLORS.high,
  3: RISK_TEXT_COLORS.medium,
  4: 'var(--color-text-muted)',
}

// Folio marginal note — mono kicker + serif body, hairline rule on the left.
function MarginNote({ title, children, rule }: { title?: string; children: ReactNode; rule: string }) {
  return (
    <div className="mb-4 max-w-[640px]" style={{ borderLeft: `1px solid ${rule}`, paddingLeft: 12 }}>
      {title && (
        <p className="font-mono uppercase mb-1" style={{ fontSize: 12, letterSpacing: '0.12em', color: rule, fontWeight: 600 }}>
          {title}
        </p>
      )}
      <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>{children}</div>
    </div>
  )
}

function MemoSkeleton() {
  return (
    <div className="space-y-3 py-2 max-w-[640px]">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

// Risk factor display names — maps SHAP factor keys to editorial labels.
// Mirrors the v0.8.5 18-feature set from CLAUDE.md Risk Model section.
const FACTOR_LABELS: Record<string, { es: string; en: string }> = {
  price_volatility: { es: 'Volatilidad de precios', en: 'Price volatility' },
  vendor_concentration: { es: 'Concentración en dependencias', en: 'Concentration in buyers' },
  price_ratio: { es: 'Ratio precio/referencia', en: 'Price-to-reference ratio' },
  institution_diversity: { es: 'Diversidad institucional', en: 'Institutional diversity' },
  cobid_herfindahl: { es: 'Concentración COBID', en: 'Co-bidding concentration' },
  recency_z: { es: 'Peso relativo reciente', en: 'Recent relative weight' },
  amount_residual_z: { es: 'Monto fuera de rango esperado', en: 'Amount outside expected range' },
  network_member_count: { es: 'Membresía en red de proveedores', en: 'Vendor-network membership' },
  amendment_flag: { es: 'Contratos con enmiendas', en: 'Amended contracts' },
  ad_period_days: { es: 'Plazo de adjudicación breve', en: 'Short award period' },
  direct_award: { es: 'Adjudicaciones directas', en: 'Direct awards' },
  pub_delay_z: { es: 'Retraso de publicación', en: 'Publication delay' },
  win_rate: { es: 'Tasa de éxito en licitaciones', en: 'Tender win rate' },
  same_day_count: { es: 'Contratos adjudicados el mismo día', en: 'Same-day awards' },
}

// SHAP-driven analytical stub — shown when no LLM memo exists for a vendor.
function MemoEmptyState({ vendorId, vendorName, isEs }: { vendorId: number; vendorName: string; isEs: boolean }) {
  const { t } = useTranslation('aria')
  const { data: shap, isLoading } = useQuery<VendorSHAPResponse>({
    queryKey: ['vendor-shap', vendorId],
    queryFn: () => vendorApi.getShap(vendorId),
    staleTime: 600_000,
    enabled: vendorId > 0,
    retry: false,
  })

  const topFactors = shap?.top_risk_factors?.slice(0, 3) ?? []
  const riskScore = shap?.risk_score

  if (isLoading) return <MemoSkeleton />

  if (!shap) {
    return (
      <div className="max-w-[640px] py-2">
        <p style={BODY_STYLE}>
          {t('memo.emptyTitle')}{' '}
          <span className="font-semibold text-text-primary">{formatEntityName('vendor', vendorName, 'full')}</span>.
        </p>
        <p className="mt-1" style={{ ...BODY_STYLE, fontSize: 14, color: 'var(--color-text-muted)' }}>{t('memo.emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[640px]">
      <MarginNote title={t('memo.stubTitle')} rule="var(--color-text-muted)">
        {t('memo.stubBody')} <strong className="text-text-primary">{t('memo.stubStrong')}</strong>
      </MarginNote>

      {riskScore != null && (
        <div className="flex items-baseline gap-3">
          <span
            className="tabular-nums leading-none"
            style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 30, color: RISK_TEXT_COLORS[getRiskLevelFromScore(riskScore)] }}
          >
            {(riskScore * 100).toFixed(0)}
          </span>
          <div>
            <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
              {t('memo.riskScale')}
            </p>
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {shap.n_contracts?.toLocaleString(isEs ? 'es-MX' : 'en-US') ?? '—'} {t('memo.contractsAnalyzed')}
            </p>
          </div>
        </div>
      )}

      {topFactors.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono" style={KICKER_STYLE}>§ {t('memo.topFactors')}</p>
          {topFactors.map((factor, i) => {
            const known = FACTOR_LABELS[factor.factor]
            const label = known ? (isEs ? known.es : known.en) : (isEs ? factor.label_es : null) ?? factor.factor.replace(/_/g, ' ')
            const pct = Math.min(100, Math.abs(factor.shap) * 200)
            return (
              <div key={factor.factor} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span style={{ ...BODY_STYLE, fontSize: 14 }}>
                    <span className="font-mono text-text-muted mr-2" style={{ fontSize: 12 }}>{i + 1}.</span>
                    {label}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 12, color: RISK_TEXT_COLORS.high }}>
                    +{factor.shap.toFixed(3)}
                  </span>
                </div>
                <div className="h-1 bg-border/50 rounded-full overflow-hidden">
                  <div className="h-full bg-risk-high/60 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="font-mono pt-3" style={{ fontSize: 12, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
        {t('memo.modelNote')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormattedMemo — turns the raw ARIA memo text (ALL-CAPS headers underlined with
// "====", "•" bullets, "Key: value" preamble) into editorial structure. The
// memo's own first line becomes a mono sub-line under the vendor title; sub-
// sections become mono § kickers; FUENTES / ACCIONES go to the rail.
// ---------------------------------------------------------------------------

const RAIL_SECTION = /^(FUENTES|ACCIONES)/i

function FormattedMemo({ text, vendorName }: { text: string; vendorName: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const main: ReactNode[] = []
  const rail: ReactNode[] = []
  let target = main
  let bullets: Array<[string, string]> = []
  let para: string[] = []
  let kvs: Array<[string, string]> = []
  let memoTitle: string | null = null
  let k = 0

  const isUnderline = (s: string) => /^[=_~–—-]{3,}$/.test(s.trim())
  const flushPara = () => {
    if (para.length) {
      target.push(<p key={`p${k++}`} style={BODY_STYLE}>{para.join(' ')}</p>)
      para = []
    }
  }
  const flushBullets = () => {
    if (bullets.length) {
      target.push(
        <ul key={`u${k++}`} className="space-y-1.5">
          {bullets.map(([mark, b], i) => (
            <li key={i} className="flex gap-2.5" style={BODY_STYLE}>
              <span aria-hidden="true" style={{ color: MEMO_OCHRE, flexShrink: 0 }}>{mark}</span>
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }
  const flushKvs = () => {
    if (kvs.length) {
      target.push(
        <dl
          key={`d${k++}`}
          className="grid gap-x-4 gap-y-1 font-mono py-2"
          style={{ gridTemplateColumns: 'max-content minmax(0, 1fr)', fontSize: 12, borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
        >
          {kvs.map(([kk, vv], i) => (
            <div key={i} className="contents">
              <dt className="uppercase" style={{ letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>{kk}</dt>
              <dd style={{ color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{vv}</dd>
            </div>
          ))}
        </dl>,
      )
      kvs = []
    }
  }
  const flushAll = () => { flushBullets(); flushPara(); flushKvs() }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const next = lines[i + 1]?.trim()
    if (isUnderline(line)) continue
    if (!line) { flushAll(); continue }

    // First non-empty line → the memo's own title (kept verbatim as a sub-line).
    if (memoTitle == null) { memoTitle = line; continue }

    // Section header: ALL-CAPS short line, or any line immediately underlined.
    const looksHeader =
      (next != null && isUnderline(next)) ||
      (/^[^a-záéíóúñü]+$/.test(line) && line.length >= 3 && line.length <= 46 && !/^[•·\-*✓→]/.test(line))
    if (looksHeader) {
      flushAll()
      const label = line.replace(/[=_~–—-]+$/, '').trim()
      target = RAIL_SECTION.test(label) ? rail : main
      target.push(
        <p key={`h${k++}`} role="heading" aria-level={4} className="font-mono pt-2" style={KICKER_STYLE}>
          § {label}
        </p>,
      )
      continue
    }

    // Bullet (• keeps the › mark; ✓ / → keep their own glyph).
    const bm = /^([•·\-*✓→])\s*(.+)$/.exec(line)
    if (bm) { flushPara(); flushKvs(); bullets.push([/[✓→]/.test(bm[1]) ? bm[1] : '›', bm[2]]); continue }

    // Key: value preamble (Tipo, Confianza, Vendor ID) — only before prose/bullets begin.
    const kv = /^([A-Za-zÁÉÍÓÚÑ][^:]{1,22}):\s+(.+)$/.exec(line)
    if (kv && bullets.length === 0 && para.length === 0 && main.length === 0) { kvs.push([kv[1], kv[2]]); continue }

    // Prose. In the rail (sources, actions) every line stays its own line.
    flushBullets(); flushKvs(); para.push(line)
    if (target === rail) flushPara()
  }
  flushAll()

  return (
    <div data-memo-body className="@container">
      <div className="max-w-[640px] mb-3">
        <p className="text-text-primary" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 21, lineHeight: 1.2, letterSpacing: '-0.005em' }}>
          {formatEntityName('vendor', vendorName, 'full')}
        </p>
        {memoTitle && (
          <p className="font-mono mt-1" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-muted)', overflowWrap: 'anywhere' }}>
            {memoTitle}
          </p>
        )}
      </div>
      <div className="@5xl:grid @5xl:gap-x-10" style={{ gridTemplateColumns: '640px minmax(0, 1fr)' }}>
        <div className="space-y-3 max-w-[640px] min-w-0">{main}</div>
        {rail.length > 0 && (
          <div className="space-y-3 min-w-0 mt-3 @5xl:mt-0 max-w-[640px]">{rail}</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AriaMemoPanel({ vendorId, vendorName, tier, isFalsePositive, fpReason, className }: AriaMemoProps) {
  const { t, i18n } = useTranslation('aria')
  const isEs = (i18n.language ?? 'es').startsWith('es')
  const [copied, setCopied] = useState(false)

  const { data: memo, isLoading, error } = useQuery<AriaMemoResponse | null>({
    queryKey: ['aria-memo', vendorId],
    queryFn: () => ariaApi.getMemo(vendorId),
    staleTime: 600_000, // 10 min
    enabled: vendorId > 0,
  })

  // Provenance — prefer the canonical memo_type column from S.3 classification,
  // fall back to text heuristic if API doesn't return it (e.g. older deploys).
  const rawText = memo?.memo_text ?? ''
  const memoText = redactRfc(rawText)
  const memoType = memo?.memo_type
  const isTemplated = memoType === 'template' || memoType === 'duplicate' || isTemplatedMemo(rawText)
  const hasStaleScore = hasStaleModelReference(rawText)

  async function handleCopy() {
    if (!memoText) return
    try {
      await navigator.clipboard.writeText(memoText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may fail in some contexts
    }
  }

  const effectiveTier = memo?.tier ?? tier
  const stamp = memo?.generated_at ?? memo?.created_at
  const dateLabel = stamp
    ? new Intl.DateTimeFormat(isEs ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(stamp))
    : undefined
  const titleId = `aria-memo-title-${vendorId}`

  return (
    <section data-memo-panel aria-labelledby={titleId} className={cn('min-w-0', className)}>
      <SubSectionTitle id={titleId} meta={dateLabel}>
        {t('memo.kicker')}
      </SubSectionTitle>

      {/* Provenance seals */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {effectiveTier != null && <Seal ink={TIER_INK[effectiveTier] ?? TIER_INK[4]}>T{effectiveTier}</Seal>}
        {memoType === 'llm_narrative' && <Seal ink="var(--color-accent-data)">LLM</Seal>}
        {(memoType === 'template' || memoType === 'duplicate') && <Seal ink={RISK_TEXT_COLORS.medium}>{t('memo.template')}</Seal>}
        {memoType === 'stub' && <Seal ink="var(--color-text-muted)">STUB</Seal>}
        <span className="font-mono" style={{ fontSize: 12, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {t('memo.aiGenerated')}
          {memo?.memo_text && !isEs && <> · {t('memo.sourceLanguage')}</>}
        </span>
      </div>

      {isLoading ? (
        <MemoSkeleton />
      ) : error ? (
        <div className="flex items-center gap-2 text-sm py-2" style={{ color: RISK_TEXT_COLORS.critical }}>
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('memo.loadError')}
        </div>
      ) : memo?.memo_text ? (
        <>
          {/* === Provenance notes (docs/DATA_INTEGRITY_PLAN.md N.2-N.4) === */}
          {isFalsePositive && (
            <MarginNote title={t('memo.fpTitle')} rule="var(--color-text-primary)">
              {t('memo.fpBody')} <strong className="text-text-primary">{t('memo.fpStrong')}</strong> {t('memo.fpTail')}
              {fpReason && (
                <span className="block mt-1 font-mono text-text-muted" style={{ fontSize: 12 }}>
                  {t('memo.fpReason')}: {fpReason}
                </span>
              )}
            </MarginNote>
          )}
          {isTemplated && !isFalsePositive && (
            <MarginNote title={t('memo.tplTitle')} rule={RISK_TEXT_COLORS.medium}>
              {t('memo.tplBody')} <strong className="text-text-primary">{t('memo.tplStrong')}</strong> {t('memo.tplTail')}
            </MarginNote>
          )}
          {hasStaleScore && (
            <p
              className="font-mono mb-4 max-w-[640px]"
              style={{ fontSize: 12, lineHeight: 1.5, letterSpacing: '0.02em', color: 'var(--color-accent-hover)', borderLeft: '1px solid var(--color-accent-hover)', paddingLeft: 12 }}
            >
              ⓘ {t('memo.stale')}
            </p>
          )}
          <FormattedMemo text={memoText} vendorName={vendorName} />

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-4 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 font-mono uppercase text-text-muted hover:text-text-primary transition-colors"
              style={{ fontSize: 12, letterSpacing: '0.12em' }}
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? t('memo.copied') : t('memo.copy')}
            </button>
            <span className="font-mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {t('memo.footer')}
            </span>
          </div>
        </>
      ) : (
        <MemoEmptyState vendorId={vendorId} vendorName={vendorName} isEs={isEs} />
      )}
    </section>
  )
}

export default AriaMemoPanel
