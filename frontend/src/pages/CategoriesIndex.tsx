/**
 * CategoriesIndex — "El Qué" / "What Was Bought"
 *
 * 2026-06-09 (DESIGNUS — category index rebuild). The page was a 3-column grid
 * of 72 near-identical cards: near-zero information scent, no ranking, no
 * comparison, endless scroll, a treemap bolted on as decoration. It read weaker
 * than the category list already shipped on /sectors?view=categories.
 *
 * Rebuilt as the definitive category surface in the sibling Exposure-Ledger
 * grammar (Sectors.tsx / InstitutionLeague.tsx): a newsroom FINDINGS BAND
 * (computed "where to look first" leads) over a concentration ribbon and a dense
 * ranked LEDGER — one row per category, every metric in one column, inline
 * micro-viz (magnitude spine · risk · direct-award-vs-OECD · single-bid dot ·
 * top vendor). The treemap survives, demoted to a collapsible disclosure.
 * Runs entirely on the two fast endpoints (getSummary + getTrends).
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { CategoryTreemap } from '@/components/categories/CategoryTreemap'
import {
  formatCompactMXN,
  formatDualCurrency,
  formatNumber,
  cn,
} from '@/lib/utils'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  RISK_TEXT_COLORS,
  OECD_DIRECT_AWARD_LIMIT,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
} from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopVendor {
  id: number
  name: string
}

interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  high_risk_pct: number | null
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: TopVendor | null
}

interface CategorySummaryResponse {
  data: CategorySummaryItem[]
  total: number
}

type SortKey = 'spend' | 'risk' | 'contracts' | 'direct_award'

const ALL_SECTOR_CODES = SECTORS.map((s) => s.code)
const DA_LIMIT_PCT = OECD_DIRECT_AWARD_LIMIT * 100 // 30
const CONTRACT_FLOOR = 200 // suppress tiny-base categories from the findings band

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortCategories(items: CategorySummaryItem[], key: SortKey): CategorySummaryItem[] {
  const sorted = [...items]
  switch (key) {
    case 'spend':
      return sorted.sort((a, b) => b.total_value - a.total_value)
    case 'risk':
      return sorted.sort((a, b) => b.avg_risk - a.avg_risk)
    case 'contracts':
      return sorted.sort((a, b) => b.total_contracts - a.total_contracts)
    case 'direct_award':
      return sorted.sort((a, b) => b.direct_award_pct - a.direct_award_pct)
  }
}

// ── Findings band ─────────────────────────────────────────────────────────────

interface Finding {
  key: string
  eyebrowEs: string
  eyebrowEn: string
  item: CategorySummaryItem
  anchor: string
  anchorColor: string
  proofPct: number
  proofColor: string
  deckEs: string
  deckEn: string
}

function computeFindings(
  items: CategorySummaryItem[],
  risers: Map<number, number>,
): Finding[] {
  if (items.length === 0) return []
  const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
  const pool = qualified.length >= 4 ? qualified : items
  const out: Finding[] = []
  // Each finding should surface a *different* category — "where to look first"
  // is most useful pointing at four distinct places, not the same one twice.
  const used = new Set<number>()
  const pick = (list: CategorySummaryItem[], score: (c: CategorySummaryItem) => number) =>
    [...list].filter((c) => !used.has(c.category_id)).sort((a, b) => score(b) - score(a))[0]

  // 1 — Most captured (direct award)
  const captured = pick(pool, (c) => c.direct_award_pct)
  if (captured) {
    used.add(captured.category_id)
    out.push({
      key: 'captured',
      eyebrowEs: 'La más capturada',
      eyebrowEn: 'Most captured',
      item: captured,
      anchor: `${Math.round(captured.direct_award_pct)}%`,
      anchorColor: captured.direct_award_pct > DA_LIMIT_PCT * 2 ? RISK_TEXT_COLORS.critical : RISK_TEXT_COLORS.high,
      proofPct: captured.direct_award_pct,
      proofColor: RISK_COLORS.high,
      deckEs: `adjudicación directa · ${Math.round(captured.single_bid_pct)}% único postor`,
      deckEn: `direct award · ${Math.round(captured.single_bid_pct)}% single bid`,
    })
  }

  // 2 — Highest risk indicator (model avg)
  const riskiest = pick(pool, (c) => c.avg_risk)
  if (riskiest) {
    used.add(riskiest.category_id)
    const lvl = getRiskLevelFromScore(riskiest.avg_risk)
    out.push({
      key: 'risk',
      eyebrowEs: 'Mayor riesgo',
      eyebrowEn: 'Highest risk',
      item: riskiest,
      anchor: `${Math.round(riskiest.avg_risk * 100)}`,
      anchorColor: RISK_TEXT_COLORS[lvl] ?? 'var(--color-text-primary)',
      proofPct: Math.min(100, riskiest.avg_risk * 100 * 2),
      proofColor: RISK_COLORS[lvl] ?? RISK_COLORS.medium,
      deckEs: 'indicador de riesgo medio · de 100',
      deckEn: 'mean risk indicator · of 100',
    })
  }

  // 3 — Heaviest exposure (high-risk share, value-floored)
  const bigEnough = items.filter((c) => c.total_value >= 1e9 && c.high_risk_pct != null)
  const exposed = pick(bigEnough.length ? bigEnough : items, (c) => c.high_risk_pct ?? 0)
  if (exposed && exposed.high_risk_pct != null) {
    used.add(exposed.category_id)
    out.push({
      key: 'exposure',
      eyebrowEs: 'Mayor exposición',
      eyebrowEn: 'Heaviest exposure',
      item: exposed,
      anchor: `${Math.round(exposed.high_risk_pct)}%`,
      anchorColor: exposed.high_risk_pct >= 15 ? RISK_TEXT_COLORS.high : 'var(--color-text-primary)',
      proofPct: Math.min(100, exposed.high_risk_pct * 3),
      proofColor: RISK_COLORS.critical,
      deckEs: `de contratos en alto riesgo · ${formatCompactMXN(exposed.total_value)}`,
      deckEn: `of contracts high-risk · ${formatCompactMXN(exposed.total_value)}`,
    })
  }

  // 4 — Fastest rising (recent vs prior spend) — only if trends present
  if (risers.size > 0) {
    const ranked = items
      .filter((c) => risers.has(c.category_id))
      .map((c) => ({ c, g: risers.get(c.category_id)! }))
      .sort((a, b) => b.g - a.g)
    const top = ranked.find((r) => !used.has(r.c.category_id))
    if (top && top.g > 0.15) {
      used.add(top.c.category_id)
      out.push({
        key: 'rising',
        eyebrowEs: 'El alza',
        eyebrowEn: 'Fastest rising',
        item: top.c,
        anchor: `+${Math.round(top.g * 100)}%`,
        anchorColor: RISK_TEXT_COLORS.high,
        proofPct: Math.min(100, top.g * 100),
        proofColor: RISK_COLORS.high,
        deckEs: 'gasto · últimos 3 años vs previos',
        deckEn: 'spend · last 3 years vs prior',
      })
    }
  }

  return out.slice(0, 4)
}

function FindingCard({ finding, lang }: { finding: Finding; lang: 'en' | 'es' }) {
  const name = lang === 'es' ? finding.item.name_es : finding.item.name_en
  return (
    <article
      className="p-3.5 flex flex-col gap-2"
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
        borderRadius: 3,
        borderLeft: `3px solid ${SECTOR_COLORS[finding.item.sector_code] ?? '#64748b'}`,
      }}
    >
      <p
        className="font-mono"
        style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        {lang === 'es' ? finding.eyebrowEs : finding.eyebrowEn}
      </p>
      <div className="min-w-0">
        <EntityIdentityChip
          type="category"
          id={finding.item.category_id}
          name={name}
          size="sm"
          sectorCode={finding.item.sector_code}
          riskScore={finding.item.avg_risk}
        />
      </div>
      <div
        className="tabular-nums"
        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1, color: finding.anchorColor }}
      >
        {finding.anchor}
      </div>
      <div
        className="relative overflow-hidden"
        style={{ height: 4, background: 'var(--color-border)', borderRadius: 999 }}
        aria-hidden="true"
      >
        <div style={{ position: 'absolute', inset: 0, width: `${Math.max(3, Math.min(100, finding.proofPct))}%`, background: finding.proofColor, borderRadius: 999 }} />
      </div>
      <p className="font-mono" style={{ fontSize: 9.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {lang === 'es' ? finding.deckEs : finding.deckEn}
      </p>
    </article>
  )
}

// ── Concentration exhibit ─────────────────────────────────────────────────────
// "The concentration spine" — an instrumented share bar. Each segment's WIDTH is
// its slice of total spend, so the bar's x-axis IS cumulative spend: the ½ and
// 80% marks fall at fixed 50% / 80% of the width, and editorial flags annotate
// how FEW categories it takes to reach them. Reuters / FT annotated-bar grammar
// + NYT Upshot named callouts; replaces the flat, un-hoverable 22px ribbon with
// a real React hover dossier (the native `title` could barely be triggered),
// a quartile ruler, inline named segments, and a sector legend.

interface ConcSeg {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  value: number
  contracts: number
  rank: number
  sharePct: number
  startPct: number
  cumPct: number
}

const CONC_BAR_H = 46

function ConcentrationExhibit({
  items,
  lang,
}: {
  items: CategorySummaryItem[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const [hover, setHover] = useState<number | null>(null)

  const { segs, tail, total, k50, k80 } = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.total_value - a.total_value)
    const total = sorted.reduce((s, c) => s + c.total_value, 0)
    let cum = 0
    let k50 = 0
    let k80 = 0
    const cumArr: number[] = []
    for (let i = 0; i < sorted.length; i++) {
      cum += sorted[i].total_value
      cumArr.push(cum)
      if (k50 === 0 && total > 0 && cum / total >= 0.5) k50 = i + 1
      if (k80 === 0 && total > 0 && cum / total >= 0.8) k80 = i + 1
    }
    // Render enough leading categories as discrete segments that the 80% flag
    // lands comfortably inside the discrete region; lump the long tail into one.
    const head = Math.min(sorted.length, Math.max((k80 || 15) + 3, 16))
    const segs: ConcSeg[] = sorted.slice(0, head).map((c, i) => {
      const sharePct = total > 0 ? (c.total_value / total) * 100 : 0
      const cumPct = total > 0 ? (cumArr[i] / total) * 100 : 0
      return {
        category_id: c.category_id,
        name_es: c.name_es,
        name_en: c.name_en,
        sector_code: c.sector_code,
        value: c.total_value,
        contracts: c.total_contracts,
        rank: i + 1,
        sharePct,
        startPct: cumPct - sharePct,
        cumPct,
      }
    })
    const tailItems = sorted.slice(head)
    const tailValue = tailItems.reduce((s, c) => s + c.total_value, 0)
    const tail =
      tailItems.length > 0
        ? {
            count: tailItems.length,
            value: tailValue,
            sharePct: total > 0 ? (tailValue / total) * 100 : 0,
            startPct: segs.length ? segs[segs.length - 1].cumPct : 0,
          }
        : null
    return { segs, tail, total, k50, k80 }
  }, [items])

  if (total <= 0) return null

  const TAIL_IDX = segs.length
  const hoverCenter =
    hover === null
      ? null
      : hover === TAIL_IDX && tail
        ? (tail.startPct + 100) / 2
        : segs[hover]
          ? segs[hover].startPct + segs[hover].sharePct / 2
          : null

  const legendSectors = Array.from(new Set(segs.map((s) => s.sector_code)))

  const flagDefs = [
    k50 > 0 ? { x: 50, big: '½', sub: isEs ? `${k50} categorías` : `${k50} categories` } : null,
    k80 > 0 ? { x: 80, big: '80%', sub: isEs ? `${k80} categorías` : `${k80} categories` } : null,
  ].filter(Boolean) as { x: number; big: string; sub: string }[]

  return (
    <div className="relative">
      {/* ── Threshold flags (above the bar) ──────────────────────────────────── */}
      <div className="relative" style={{ height: 30 }} aria-hidden="true">
        {flagDefs.map((f) => (
          <div
            key={f.x}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${f.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span
                style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 15, lineHeight: 1, color: 'var(--color-text-primary)' }}
              >
                {f.big}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
              >
                {f.sub}
              </span>
            </div>
            <div style={{ width: 1, height: 7, marginTop: 3, background: 'rgba(160, 104, 32, 0.7)' }} />
          </div>
        ))}
      </div>

      {/* ── The bar (interactive segments) ───────────────────────────────────── */}
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <div
          className="flex w-full overflow-hidden"
          style={{ height: CONC_BAR_H, borderRadius: 3, background: 'var(--color-border)' }}
        >
          {segs.map((s, i) => {
            const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
            const active = hover === i
            const dim = hover !== null && !active
            const name = isEs ? s.name_es : s.name_en
            return (
              <button
                key={s.category_id}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`#${s.rank} ${name} · ${s.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(s.value)}`}
                className="relative h-full block p-0"
                style={{
                  width: `${s.sharePct}%`,
                  minWidth: 2,
                  background: color,
                  border: 0,
                  borderRight: '1px solid var(--color-background)',
                  opacity: dim ? 0.42 : 1,
                  boxShadow: active ? 'inset 0 3px 0 rgba(255,255,255,0.6)' : 'none',
                  transition: 'opacity 140ms ease',
                  cursor: 'pointer',
                }}
              >
                {s.sharePct >= 7 && (
                  <span
                    className="absolute font-mono pointer-events-none"
                    style={{
                      left: 5,
                      top: 5,
                      right: 5,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {name}
                  </span>
                )}
              </button>
            )
          })}
          {tail && (
            <button
              type="button"
              onMouseEnter={() => setHover(TAIL_IDX)}
              onFocus={() => setHover(TAIL_IDX)}
              onBlur={() => setHover(null)}
              aria-label={`${tail.count} ${isEs ? 'categorías restantes' : 'remaining categories'} · ${tail.sharePct.toFixed(0)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(tail.value)}`}
              className="relative h-full flex items-center justify-center p-0"
              style={{
                width: `${tail.sharePct}%`,
                minWidth: 2,
                background: 'var(--color-text-muted)',
                border: 0,
                opacity: hover !== null && hover !== TAIL_IDX ? 0.28 : 0.42,
                boxShadow: hover === TAIL_IDX ? 'inset 0 3px 0 rgba(255,255,255,0.45)' : 'none',
                transition: 'opacity 140ms ease',
                cursor: 'pointer',
              }}
            >
              <span
                className="font-mono pointer-events-none"
                style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-background)' }}
              >
                +{tail.count}
              </span>
            </button>
          )}
        </div>

        {/* ── Hover dossier (DOM, anchored above the hovered segment) ─────────── */}
        {hover !== null && hoverCenter !== null && (() => {
          const transform =
            hoverCenter > 72
              ? 'translate(-88%, calc(-100% - 10px))'
              : hoverCenter < 28
                ? 'translate(-12%, calc(-100% - 10px))'
                : 'translate(-50%, calc(-100% - 10px))'
          const isTail = hover === TAIL_IDX && tail
          if (isTail && tail) {
            return (
              <div
                className="absolute z-20 pointer-events-none rounded-md border border-border bg-background-card p-3 shadow-xl"
                style={{ left: `${hoverCenter}%`, top: 0, transform, minWidth: 200, maxWidth: 270 }}
              >
                <div
                  className="font-mono mb-1.5"
                  style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
                >
                  {isEs ? 'La cola larga' : 'The long tail'}
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 28, lineHeight: 1, color: 'var(--color-text-secondary)' }}
                >
                  {tail.sharePct.toFixed(0)}%
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {isEs
                    ? `${tail.count} categorías más · ${formatCompactMXN(tail.value)}`
                    : `${tail.count} smaller categories · ${formatCompactMXN(tail.value)}`}
                </div>
              </div>
            )
          }
          const s = segs[hover]
          if (!s) return null
          const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const name = isEs ? s.name_es : s.name_en
          return (
            <div
              className="absolute z-20 pointer-events-none rounded-md border border-border bg-background-card p-3 shadow-xl"
              style={{ left: `${hoverCenter}%`, top: 0, transform, minWidth: 212, maxWidth: 280 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-mono"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color }}
                >
                  #{s.rank}
                </span>
                <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {getSectorName(s.sector_code, lang)}
                </span>
                <span className="h-px flex-1" style={{ background: `${color}55` }} />
              </div>
              <div className="mb-1.5">
                <EntityIdentityChip
                  type="category"
                  id={s.category_id}
                  name={name}
                  size="sm"
                  sectorCode={s.sector_code}
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="tabular-nums"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 1, color }}
                >
                  {s.sharePct.toFixed(1)}%
                </span>
                <span className="font-mono" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'del gasto total' : 'of total spend'}
                </span>
              </div>
              <div className="font-mono mt-1.5 flex items-center gap-2" style={{ fontSize: 10.5, color: 'var(--color-text-secondary)' }}>
                <span className="tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCompactMXN(s.value)}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span className="tabular-nums">{formatNumber(s.contracts)} {isEs ? 'cont.' : 'contracts'}</span>
              </div>
              {/* cumulative-to-here readout */}
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    {isEs ? 'Acumulado hasta aquí' : 'Running total to here'}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {s.cumPct.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, s.cumPct)}%`, background: color, opacity: 0.85 }} />
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Quartile ruler (turns the bar into a measuring rule) ─────────────── */}
      <div className="relative mt-1.5" style={{ height: 14 }} aria-hidden="true">
        {[0, 25, 50, 75, 100].map((t) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${t}%`, transform: t === 0 ? 'translateX(0)' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
          >
            <div style={{ width: 1, height: 4, background: 'var(--color-border)' }} />
            <span className="font-mono" style={{ fontSize: 8.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginTop: 1 }}>
              {t}%
            </span>
          </div>
        ))}
      </div>

      {/* ── Caption + sector legend ──────────────────────────────────────────── */}
      <div className="mt-3 flex items-start justify-between gap-x-6 gap-y-2 flex-wrap">
        <p
          className="font-mono"
          style={{ fontSize: 10.5, lineHeight: 1.55, letterSpacing: '0.02em', color: 'var(--color-text-muted)', maxWidth: '50ch' }}
        >
          {isEs
            ? `Cada bloque es una categoría; su ancho, su tajada del gasto total. Solo ${k50} concentran la mitad y ${k80}, el 80% — pasa el cursor para ver cada una.`
            : `Each block is one category; its width is its slice of total spend. Just ${k50} hold half — ${k80} hold 80%. Hover any block for the detail.`}
        </p>
        <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
          {legendSectors.map((code) => (
            <span key={code} className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9, letterSpacing: '0.03em', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SECTOR_COLORS[code] ?? '#64748b', flexShrink: 0 }} />
              {getSectorName(code, lang)}
            </span>
          ))}
          {tail && (
            <span className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9, letterSpacing: '0.03em', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-text-muted)', opacity: 0.42, flexShrink: 0 }} />
              {isEs ? 'resto' : 'rest'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Ledger row ────────────────────────────────────────────────────────────────

function LedgerRow({
  item,
  rank,
  maxValue,
  showVendor,
  lang,
}: {
  item: CategorySummaryItem
  rank: number
  maxValue: number
  showVendor: boolean
  lang: 'en' | 'es'
}) {
  const sectorColor = item.sector_code ? SECTOR_COLORS[item.sector_code] ?? '#64748b' : '#64748b'
  const riskLevel = getRiskLevelFromScore(item.avg_risk)
  const sbPct = item.single_bid_pct ?? 0
  const sbDotColor = sbPct > 25 ? RISK_COLORS.critical : sbPct >= 15 ? RISK_COLORS.high : RISK_COLORS.low
  const spendPct = maxValue > 0 ? (item.total_value / maxValue) * 100 : 0
  const daOver = item.direct_award_pct > DA_LIMIT_PCT

  return (
    <div
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-7 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>

      {/* Name + magnitude spine + top vendor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <EntityIdentityChip
            type="category"
            id={item.category_id}
            name={lang === 'es' ? item.name_es : item.name_en}
            size="sm"
            sectorCode={item.sector_code ?? null}
            riskScore={item.avg_risk ?? null}
          />
          {showVendor && item.top_vendor && (
            <span className="hidden md:flex items-center gap-1 text-[10px] text-text-muted/70 font-mono min-w-0">
              <EntityIdentityChip
                type="vendor"
                id={item.top_vendor.id}
                name={item.top_vendor.name}
                size="xs"
                hideIcon
                sectorCode={item.sector_code ?? null}
              />
            </span>
          )}
        </div>
        {/* magnitude spine */}
        <div className="mt-1 h-1 rounded-full bg-background-elevated overflow-hidden w-full max-w-[220px]" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, spendPct)}%`, background: sectorColor, opacity: 0.55 }} />
        </div>
      </div>

      {/* Spend + contracts */}
      <div className="flex-shrink-0 text-right min-w-[92px]">
        <div className="font-mono text-sm tabular-nums text-text-primary">{formatCompactMXN(item.total_value)}</div>
        <div className="text-[10px] font-mono text-text-muted mt-0.5">
          {formatNumber(item.total_contracts)} {lang === 'es' ? 'cont.' : 'contracts'}
        </div>
      </div>

      {/* Risk */}
      <div className="flex-shrink-0 min-w-[78px]">
        <div className="flex items-center justify-end gap-1.5">
          <div className="w-12 h-1 rounded-full bg-background-elevated overflow-hidden hidden sm:block" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.avg_risk * 100) / 45 * 100)}%`, background: RISK_COLORS[riskLevel], opacity: 0.85 }} />
          </div>
          <div className="font-mono text-[11px] font-bold tabular-nums text-right" style={{ color: RISK_COLORS[riskLevel] }}>
            {(item.avg_risk * 100).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Direct award (with single-bid dot + OECD reference) */}
      <div className="flex-shrink-0 min-w-[78px]">
        <div className="flex items-center justify-end gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ background: sbDotColor }}
            title={`${sbPct.toFixed(1)}% ${lang === 'es' ? 'único postor' : 'single bid'}`}
            aria-label={`${sbPct.toFixed(1)}% ${lang === 'es' ? 'único postor' : 'single bid'}`}
          />
          <div className="hidden sm:block w-12 h-1 rounded-full bg-background-elevated overflow-hidden relative" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.direct_award_pct)}%`, background: daOver ? RISK_COLORS.high : 'var(--color-text-muted)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: -1, bottom: -1, left: `${DA_LIMIT_PCT}%`, width: 1, background: 'var(--color-text-muted)' }} />
          </div>
          <div className="font-mono text-sm tabular-nums" style={{ color: daOver ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)' }}>
            {item.direct_award_pct.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesIndex() {
  const { i18n } = useTranslation('categories')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [activeSector, setActiveSector] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  const { data, isLoading, isError } = useQuery<CategorySummaryResponse>({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 600_000,
  })
  // Trends power the "fastest rising" finding only — gated on its own query so
  // first paint never blocks on it.
  const { data: trendsData } = useQuery({
    queryKey: ['categories', 'trends', 2002, 2025],
    queryFn: () => categoriesApi.getTrends(2002, 2025),
    staleTime: 600_000,
  })

  const totalValue = useMemo(
    () => (data?.data ? data.data.reduce((s, c) => s + c.total_value, 0) : 0),
    [data],
  )
  const totalContracts = useMemo(
    () => (data?.data ? data.data.reduce((s, c) => s + c.total_contracts, 0) : 0),
    [data],
  )

  // Recent-vs-prior spend growth per category (2022–2024 vs 2019–2021).
  const risers = useMemo(() => {
    const m = new Map<number, number>()
    const rows = (trendsData?.data ?? []) as Array<{ category_id: number; year: number; value: number }>
    if (rows.length === 0) return m
    const recent = new Map<number, number>()
    const prior = new Map<number, number>()
    for (const r of rows) {
      if (r.year >= 2022 && r.year <= 2024) recent.set(r.category_id, (recent.get(r.category_id) ?? 0) + (r.value ?? 0))
      else if (r.year >= 2019 && r.year <= 2021) prior.set(r.category_id, (prior.get(r.category_id) ?? 0) + (r.value ?? 0))
    }
    for (const [id, rec] of recent) {
      const pri = prior.get(id) ?? 0
      if (rec >= 1e9 && pri > 0) m.set(id, (rec - pri) / pri)
    }
    return m
  }, [trendsData])

  const findings = useMemo(
    () => (data?.data ? computeFindings(data.data, risers) : []),
    [data, risers],
  )

  const displayed = useMemo(() => {
    if (!data?.data) return []
    const filtered = activeSector ? data.data.filter((c) => c.sector_code === activeSector) : data.data
    return sortCategories(filtered, sortKey)
  }, [data, activeSector, sortKey])

  const maxValue = useMemo(() => (displayed.length ? Math.max(...displayed.map((c) => c.total_value)) : 0), [displayed])

  const presentSectorCodes = useMemo(() => {
    if (!data?.data) return ALL_SECTOR_CODES
    const seen = new Set(data.data.map((c) => c.sector_code))
    return ALL_SECTOR_CODES.filter((code) => seen.has(code))
  }, [data])

  const sortButtons: { key: SortKey; labelEs: string; labelEn: string }[] = [
    { key: 'spend', labelEs: 'Gasto', labelEn: 'Spend' },
    { key: 'risk', labelEs: 'Riesgo', labelEn: 'Risk' },
    { key: 'contracts', labelEs: 'Contratos', labelEn: 'Contracts' },
    { key: 'direct_award', labelEs: 'Adj. directa', labelEn: 'Direct award' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border px-4 sm:px-6 lg:px-8 py-7">
        <div className="max-w-7xl mx-auto">
          <div className="mb-3 flex items-center gap-3 font-mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>El Qué</span>
            <span aria-hidden="true" style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {lang === 'es' ? '72 categorías de gasto' : '72 spending categories'}
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>COMPRANET 2002–2025
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>v0.8.5
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1
              className="text-text-primary"
              style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 0.98, letterSpacing: '-0.012em' }}
            >
              {lang === 'es' ? 'Qué compra México' : 'What Mexico Buys'}
            </h1>
            {totalValue > 0 && (
              <div className="text-right">
                <div className="tabular-nums" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', lineHeight: 1, color: 'var(--color-text-primary)' }}>
                  {formatDualCurrency(totalValue)}
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {lang === 'es' ? `gasto validado · ${formatNumber(totalContracts)} contratos` : `validated spend · ${formatNumber(totalContracts)} contracts`}
                </div>
              </div>
            )}
          </div>
          <p className="mt-3 max-w-[68ch]" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 16, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
            {lang === 'es'
              ? 'Las categorías agrupan qué compró el gobierno —medicamentos, obra pública, software— sin importar quién. 72 categorías activas clasifican casi todo el gasto federal; aquí, ordenadas por dónde mirar primero.'
              : 'Categories group what the government bought — medicines, civil works, software — regardless of who. 72 active categories classify nearly all federal spend; here, ranked by where to look first.'}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-sm" />)}
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="space-y-1">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
          </div>
        )}

        {isError && (
          <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'es' ? 'No se pudieron cargar las categorías. Intenta de nuevo.' : 'Unable to load categories. Please try again.'}
          </p>
        )}

        {!isLoading && !isError && data?.data && data.data.length > 0 && (
          <>
            {/* ── FINDINGS BAND ──────────────────────────────────────────────── */}
            {findings.length > 0 && (
              <section className="mb-6 pb-6 border-b border-border" aria-label={lang === 'es' ? 'Dónde mirar primero' : 'Where to look first'}>
                <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                  § {lang === 'es' ? 'Dónde mirar primero' : 'Where to look first'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {findings.map((f) => <FindingCard key={f.key} finding={f} lang={lang} />)}
                </div>
              </section>
            )}

            {/* ── CONCENTRATION EXHIBIT ──────────────────────────────────────── */}
            <section className="mb-6 pb-6 border-b border-border" aria-label={lang === 'es' ? 'Concentración del gasto' : 'Spend concentration'}>
              <p className="font-mono mb-3.5" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                § {lang === 'es' ? 'Dónde se concentra el dinero' : 'Where the money concentrates'}
              </p>
              <ConcentrationExhibit items={data.data} lang={lang} />
            </section>

            {/* ── CONTROLS ───────────────────────────────────────────────────── */}
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="font-mono mr-1" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {lang === 'es' ? 'Ordenar' : 'Sort'}
                </span>
                {sortButtons.map(({ key, labelEs, labelEn }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortKey(key)}
                    aria-pressed={sortKey === key}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] rounded-sm border transition-colors',
                      sortKey === key ? 'bg-text-primary text-background border-transparent' : 'text-text-muted border-border hover:text-text-secondary',
                    )}
                  >
                    {lang === 'es' ? labelEs : labelEn}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={lang === 'es' ? 'Filtrar por sector' : 'Filter by sector'}>
                <button
                  type="button"
                  onClick={() => setActiveSector(null)}
                  aria-pressed={activeSector === null}
                  className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                  style={activeSector === null
                    ? { background: 'var(--color-text-secondary)', borderColor: 'var(--color-text-secondary)', color: 'var(--color-background)' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {lang === 'es' ? 'Todos' : 'All'}
                </button>
                {presentSectorCodes.map((code) => {
                  const isActive = activeSector === code
                  const hex = SECTOR_COLORS[code] ?? '#64748b'
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveSector(isActive ? null : code)}
                      aria-pressed={isActive}
                      className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                      style={isActive ? { background: hex, borderColor: hex, color: '#ffffff' } : { background: 'transparent', borderColor: hex, color: hex }}
                    >
                      {getSectorName(code, lang)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── LEDGER ─────────────────────────────────────────────────────── */}
            <div className="rounded-sm border border-border overflow-hidden">
              <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-1.5 bg-background-elevated border-b border-border font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted/60">
                <span className="w-7 flex-shrink-0">#</span>
                <span className="flex-1">{lang === 'es' ? 'Categoría' : 'Category'}</span>
                <span className="flex-shrink-0 min-w-[92px] text-right">{lang === 'es' ? 'Gasto' : 'Spend'}</span>
                <span className="flex-shrink-0 min-w-[78px] text-right">{lang === 'es' ? 'Riesgo' : 'Risk'}</span>
                <span className="flex-shrink-0 min-w-[78px] text-right">{lang === 'es' ? 'Adj. dir.' : 'Direct'}</span>
              </div>
              {displayed.length > 0 ? (
                displayed.map((item, idx) => (
                  <LedgerRow key={item.category_id} item={item} rank={idx + 1} maxValue={maxValue} showVendor={idx < 15} lang={lang} />
                ))
              ) : (
                <div className="py-12 text-center" role="status" aria-live="polite">
                  <p className="text-sm font-mono text-text-muted">
                    {lang === 'es' ? 'No hay categorías en este sector.' : 'No categories in this sector.'}
                  </p>
                </div>
              )}
            </div>

            {/* ── THE MAP (demoted to a disclosure) ──────────────────────────── */}
            <details className="mt-5 group" open={showMap} onToggle={(e) => setShowMap((e.currentTarget as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer font-mono list-none" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                {showMap
                  ? (lang === 'es' ? '▾ Ocultar el mapa de gasto' : '▾ Hide the spending map')
                  : (lang === 'es' ? '▸ Ver el mapa de gasto (treemap)' : '▸ See the spending map (treemap)')}
              </summary>
              {showMap && (
                <div className="mt-3">
                  <CategoryTreemap categories={data.data} lang={lang} activeSector={activeSector} />
                </div>
              )}
            </details>

            {/* ── Methodology footer ─────────────────────────────────────────── */}
            <p className="mt-6 pt-5 border-t border-border font-mono" style={{ fontSize: 10.5, lineHeight: 1.6, letterSpacing: '0.03em', color: 'var(--color-text-muted)', maxWidth: '78ch' }}>
              {lang === 'es'
                ? 'Las categorías usan códigos Partida/CUCoP; la cobertura confiable es 2023–2025 (Estructura D, 100% Partida) — los años previos pueden tener clasificación parcial. La línea es la fila gris en la regla del procedimiento; el punto de único postor colorea >25% crítico / ≥15% alto. Indicador de riesgo · no estimación de fraude. RUBLI v0.8.5.'
                : 'Categories use Partida/CUCoP codes; reliable coverage is 2023–2025 (Structure D, 100% Partida) — earlier years may be partially classified. The OECD direct-award ceiling (30%) is the tick on each row; the single-bid dot reddens >25% critical / ≥15% high. Risk indicator · not a fraud estimate. RUBLI v0.8.5.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
