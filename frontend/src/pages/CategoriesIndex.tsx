/**
 * CategoriesIndex — "EL CONCENTRADO" / "What Mexico Buys"
 *
 * 2026-06-10 (DESIGNUS rebuild, judge synthesis — Confounded-Ledger family,
 * Archetype B). The one finding: Mexican procurement spending is wildly
 * concentrated — and the categories that swallow the most money are not the ones
 * the model flags hardest. Spend orders the page; risk undermines the order.
 *
 * Anatomy: Folio → § EL SALDO (sentence lede) → § HALLAZGOS (3 finding cards) →
 * El Filtro (URL-synced sort + sector) → § EL CONCENTRADO (dual-lens plate, the
 * centerpiece) → § LO QUE EL GASTO ESCONDE (honor roll) → § EL REGISTRO (all 72
 * rows, hover dossier, dagger disclosure) → § ADÓNDE IR (coda) → Procedencia.
 *
 * Runs on ONE endpoint — categoriesApi.getSummary(). No per-row fetches.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePublishSiblingList, useOriginRowFlash } from '@/lib/nav/wayfinding'
import { categoriesApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { FindingsBand, type Finding } from '@/components/dossier/FindingsBand'
import { CategoryConcentrationPlate } from '@/components/categories/CategoryConcentrationPlate'
import { RiskRankBand } from '@/components/categories/RiskRankBand'
import { CategoryHoverDossier } from '@/components/categories/CategoryHoverDossier'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'
import {
  type CategorySummaryItem,
  type PlateLens,
  CONTRACT_FLOOR,
  intensityColor,
} from '@/components/categories/types'
import {
  formatCompactMXN,
  formatDualCurrency,
  formatNumber,
  cn,
} from '@/lib/utils'
import {
  SECTOR_COLORS,
  SECTOR_TEXT_COLORS,
  RISK_COLORS,
  RISK_TEXT_COLORS,
  OECD_DIRECT_AWARD_LIMIT,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
} from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategorySummaryResponse {
  data: CategorySummaryItem[]
  total: number
}

type SortKey = 'spend' | 'risk' | 'contracts' | 'direct_award'

const SORT_KEYS: SortKey[] = ['spend', 'risk', 'contracts', 'direct_award']

const ALL_SECTOR_CODES = SECTORS.map((s) => s.code)
const DA_LIMIT_PCT = OECD_DIRECT_AWARD_LIMIT * 100 // 30
// Sectors with a single active category — taxonomy expansion pending (S.10–S.12).
const DAGGER_SECTOR_CODES = new Set(['educacion', 'gobernacion', 'trabajo'])

// ── URL state ─────────────────────────────────────────────────────────────────
// Param names match El Hilo P0 (?sort=&sector=) so the eventual merge is trivial.
// Defaults (spend / all / concentration) render with NO params — old bookmarks
// don't break.

function useCategoriesUrlState() {
  const [params, setParams] = useSearchParams()

  const rawSort = params.get('sort')
  const sortKey: SortKey = (SORT_KEYS as string[]).includes(rawSort ?? '') ? (rawSort as SortKey) : 'spend'

  const rawSector = params.get('sector')
  const activeSector: string | null =
    rawSector && (ALL_SECTOR_CODES as string[]).includes(rawSector) ? rawSector : null

  const rawLens = params.get('lens')
  const lens: PlateLens = rawLens === 'risk' ? 'risk' : 'concentration'

  const patch = (next: { sort?: SortKey; sector?: string | null; lens?: PlateLens }) => {
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next.sort !== undefined) {
          if (next.sort === 'spend') out.delete('sort')
          else out.set('sort', next.sort)
        }
        if (next.sector !== undefined) {
          if (next.sector === null) out.delete('sector')
          else out.set('sector', next.sector)
        }
        if (next.lens !== undefined) {
          if (next.lens === 'concentration') out.delete('lens')
          else out.set('lens', next.lens)
        }
        return out
      },
      { replace: true },
    )
  }

  return {
    sortKey,
    activeSector,
    lens,
    setSortKey: (s: SortKey) => patch({ sort: s }),
    setActiveSector: (s: string | null) => patch({ sector: s }),
    setLens: (l: PlateLens) => patch({ lens: l }),
  }
}

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

// ── Findings (3 surviving cards — the trends-dependent "rising" card is gone) ──

function computeFindings(items: CategorySummaryItem[]): Finding[] {
  if (items.length === 0) return []
  const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
  const pool = qualified.length >= 3 ? qualified : items
  const out: Finding[] = []
  const used = new Set<number>()
  const pick = (list: CategorySummaryItem[], score: (c: CategorySummaryItem) => number) =>
    [...list].filter((c) => !used.has(c.category_id)).sort((a, b) => score(b) - score(a))[0]

  const entityOf = (c: CategorySummaryItem): Finding['entity'] => ({
    type: 'category',
    id: c.category_id,
    nameEs: c.name_es,
    nameEn: c.name_en,
    sectorCode: c.sector_code,
    riskScore: c.avg_risk,
  })

  // 1 — Most captured (direct award)
  const captured = pick(pool, (c) => c.direct_award_pct)
  if (captured) {
    used.add(captured.category_id)
    out.push({
      key: 'captured',
      eyebrowEs: 'La más capturada',
      eyebrowEn: 'Most captured',
      entity: entityOf(captured),
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
      entity: entityOf(riskiest),
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
      entity: entityOf(exposed),
      anchor: `${Math.round(exposed.high_risk_pct)}%`,
      anchorColor: exposed.high_risk_pct >= 15 ? RISK_TEXT_COLORS.high : 'var(--color-text-primary)',
      proofPct: Math.min(100, exposed.high_risk_pct * 3),
      proofColor: RISK_COLORS.critical,
      deckEs: `de contratos en alto riesgo · ${formatCompactMXN(exposed.total_value)}`,
      deckEn: `of contracts high-risk · ${formatCompactMXN(exposed.total_value)}`,
    })
  }

  return out.slice(0, 3)
}

// ── Ledger row ────────────────────────────────────────────────────────────────

function LedgerRow({
  item,
  rank,
  maxValue,
  showVendor,
  lang,
  onHover,
  onLeave,
}: {
  item: CategorySummaryItem
  rank: number
  maxValue: number
  showVendor: boolean
  lang: 'en' | 'es'
  onHover: (id: number, el: HTMLElement) => void
  onLeave: () => void
}) {
  const sectorColor = item.sector_code ? SECTOR_COLORS[item.sector_code] ?? SECTOR_COLORS.otros : SECTOR_COLORS.otros
  const sbPct = item.single_bid_pct ?? 0
  const sbDotColor = sbPct > 25 ? RISK_COLORS.critical : sbPct >= 15 ? RISK_COLORS.high : 'var(--color-text-muted)'
  const spendPct = maxValue > 0 ? (item.total_value / maxValue) * 100 : 0
  const daOver = item.direct_award_pct > DA_LIMIT_PCT
  const hasDagger = DAGGER_SECTOR_CODES.has(item.sector_code)
  const name = lang === 'es' ? item.name_es : item.name_en

  return (
    <tr
      data-wf-row={item.category_id}
      className="border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ display: 'flex', alignItems: 'center', borderLeft: `3px solid ${sectorColor}` }}
      onMouseEnter={(e) => onHover(item.category_id, e.currentTarget)}
      onMouseLeave={onLeave}
      onFocusCapture={(e) => onHover(item.category_id, e.currentTarget)}
      onBlurCapture={onLeave}
    >
      <td className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2 w-full" style={{ display: 'flex' }}>
      <span className="flex-shrink-0 w-7 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>

      {/* Name + magnitude spine + top vendor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-baseline">
            <EntityIdentityChip
              type="category"
              id={item.category_id}
              name={name}
              size="sm"
              sectorCode={item.sector_code ?? null}
              riskScore={item.avg_risk ?? null}
            />
            {hasDagger && (
              <sup
                className="font-mono ml-0.5"
                style={{ fontSize: 8, color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              >
                †
              </sup>
            )}
          </span>
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
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.avg_risk * 100) / 45 * 100)}%`, background: intensityColor(item.avg_risk), opacity: 0.85 }} />
          </div>
          <div className="font-mono text-[11px] font-bold tabular-nums text-right" style={{ color: intensityColor(item.avg_risk) }}>
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
      </td>
    </tr>
  )
}

// ── Provenance note (per-page, matching the ProvenanceFooter pattern) ─────────

function ProvenanceNote({ lang }: { lang: 'en' | 'es' }) {
  return (
    <section className="mt-10 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p
        className="font-mono mb-3"
        style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
      >
        § {lang === 'es' ? 'Procedencia' : 'Provenance'}
      </p>
      <p
        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}
      >
        {lang === 'es'
          ? '72 categorías activas cubren el 99.73% del gasto clasificable (códigos Partida/CUCoP); la cobertura confiable es 2023–2025 (Estructura D, 100% Partida) — los años previos pueden tener clasificación parcial. La regla de adjudicación directa marca el techo OCDE del 30%; el punto de único postor colorea >25% crítico / ≥15% alto. Indicador de riesgo, no estimación de fraude. RUBLI v0.8.5.'
          : '72 active categories cover 99.73% of classifiable spend (Partida/CUCoP codes); reliable coverage is 2023–2025 (Structure D, 100% Partida) — earlier years may be partially classified. The direct-award rule marks the OECD 30% ceiling; the single-bid dot reddens >25% critical / ≥15% high. Risk indicator, not a fraud estimate. RUBLI v0.8.5.'}
      </p>
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesIndex() {
  const { i18n } = useTranslation('categories')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const navigate = useNavigate()

  const { sortKey, activeSector, lens, setSortKey, setActiveSector, setLens } = useCategoriesUrlState()
  // Raw query string re-exposed for the wayfinding backTo link (El Hilo P1+).
  const [searchParams] = useSearchParams()

  // One floating register dossier instance, keyed by hovered category_id.
  const [hover, setHover] = useState<{ id: number; top: number; bottom: number; containerH: number } | null>(null)

  const { data, isLoading, isError } = useQuery<CategorySummaryResponse>({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
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

  const findings = useMemo(
    () => (data?.data ? computeFindings(data.data) : []),
    [data],
  )

  // ── EL SALDO computed leads ─────────────────────────────────────────────────
  const saldo = useMemo(() => {
    if (!data?.data || data.data.length === 0) return null
    const items = data.data
    const total = items.reduce((s, c) => s + c.total_value, 0)
    // k50 / k80 over spend.
    const byValue = [...items].sort((a, b) => b.total_value - a.total_value)
    let cum = 0
    let k50 = 0
    let k80 = 0
    for (let i = 0; i < byValue.length; i++) {
      cum += byValue[i].total_value
      if (k50 === 0 && total > 0 && cum / total >= 0.5) k50 = i + 1
      if (k80 === 0 && total > 0 && cum / total >= 0.8) k80 = i + 1
    }
    const topSpend = byValue[0]
    // Riskiest gated by contract floor.
    const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    const riskiest = (qualified.length ? qualified : items)
      .slice()
      .sort((a, b) => b.avg_risk - a.avg_risk)[0]
    const meanRisk = items.reduce((s, c) => s + c.avg_risk, 0) / items.length
    const ratio = meanRisk > 0 ? riskiest.avg_risk / meanRisk : 0
    return { total, k50, k80, topSpend, riskiest, ratio }
  }, [data])

  const displayed = useMemo(() => {
    if (!data?.data) return []
    const filtered = activeSector ? data.data.filter((c) => c.sector_code === activeSector) : data.data
    return sortCategories(filtered, sortKey)
  }, [data, activeSector, sortKey])

  const maxValue = useMemo(() => (displayed.length ? Math.max(...displayed.map((c) => c.total_value)) : 0), [displayed])

  // ── Wayfinding (El Hilo P1+) — publish the ranked ledger as the sibling list
  // so a dossier's Prev/Next stepper honours this exact sort/filter, and
  // restore the origin row on browser-back.
  const activeSectorName = activeSector
    ? (lang === 'es'
        ? SECTORS.find((s) => s.code === activeSector)?.name
        : SECTORS.find((s) => s.code === activeSector)?.nameEN) ?? null
    : null
  const search = searchParams.toString()
  usePublishSiblingList(
    displayed.length
      ? {
          kind: 'category',
          items: displayed.map((c) => ({ id: String(c.category_id), label: lang === 'es' ? c.name_es : c.name_en })),
          backTo: search ? `/categories?${search}` : '/categories',
          backLabel:
            (lang === 'es' ? 'categorías' : 'categories') + (activeSectorName ? ` · ${activeSectorName}` : ''),
        }
      : null,
  )
  useOriginRowFlash('category', displayed.length > 0)

  const presentSectorCodes = useMemo(() => {
    if (!data?.data) return ALL_SECTOR_CODES
    const seen = new Set(data.data.map((c) => c.sector_code))
    return ALL_SECTOR_CODES.filter((code) => seen.has(code))
  }, [data])

  // Register hover row + edge-flip geometry.
  const hoverItem = hover ? displayed.find((c) => c.category_id === hover.id) ?? null : null
  const hoverRank = hover ? displayed.findIndex((c) => c.category_id === hover.id) + 1 : 0
  const dossierBelow = hover ? hover.top < hover.containerH / 2 : true
  const captureRect = (el: HTMLElement) => {
    const parent = el.offsetParent as HTMLElement | null
    return {
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
      containerH: parent?.offsetHeight ?? el.offsetTop + el.offsetHeight,
    }
  }

  const sortButtons: { key: SortKey; labelEs: string; labelEn: string }[] = [
    { key: 'spend', labelEs: 'Gasto', labelEn: 'Spend' },
    { key: 'risk', labelEs: 'Riesgo', labelEn: 'Risk' },
    { key: 'contracts', labelEs: 'Contratos', labelEn: 'Contracts' },
    { key: 'direct_award', labelEs: 'Adj. directa', labelEn: 'Direct award' },
  ]

  // Coda chips (computed from the same memos as EL SALDO).
  const codaRiskiest = saldo?.riskiest ?? null
  const codaCaptured = useMemo(() => {
    if (!data?.data || data.data.length === 0) return null
    const pool = data.data.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    return (pool.length ? pool : data.data).slice().sort((a, b) => b.direct_award_pct - a.direct_award_pct)[0]
  }, [data])

  return (
    <div className="min-h-screen bg-background">
      {/* ── B0 · Folio ───────────────────────────────────────────────────────── */}
      <header className="border-b border-border px-4 sm:px-6 lg:px-8 py-7">
        <div className="max-w-7xl mx-auto">
          <div className="mb-3 flex items-center gap-3 font-mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>El Qué</span>
            <span aria-hidden="true" style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {isEs ? '72 categorías' : '72 categories'}
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>COMPRANET 2002–2025
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>v0.8.5
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1
              className="text-text-primary"
              style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 0.98, letterSpacing: '-0.012em' }}
            >
              {isEs ? 'Qué compra México' : 'What Mexico Buys'}
            </h1>
            {totalValue > 0 && (
              <div className="text-right">
                <div className="tabular-nums" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', lineHeight: 1, color: 'var(--color-text-primary)' }}>
                  {formatDualCurrency(totalValue)}
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? `gasto validado · ${formatNumber(totalContracts)} contratos` : `validated spend · ${formatNumber(totalContracts)} contracts`}
                </div>
              </div>
            )}
          </div>
          <p className="mt-3" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 16, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
            {isEs
              ? 'Las categorías agrupan qué compró el gobierno —medicamentos, obra pública, software— sin importar quién. 72 categorías activas clasifican casi todo el gasto federal; aquí, ordenadas por dónde mirar primero.'
              : 'Categories group what the government bought — medicines, civil works, software — regardless of who. 72 active categories classify nearly all federal spend; here, ranked by where to look first.'}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full max-w-2xl rounded-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-sm" />)}
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="space-y-1">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
          </div>
        )}

        {isError && (
          <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {isEs ? 'No se pudieron cargar las categorías. Intenta de nuevo.' : 'Unable to load categories. Please try again.'}
          </p>
        )}

        {!isLoading && !isError && data?.data && data.data.length > 0 && (
          <>
            {/* ── B1 · § EL SALDO (sentence lede) ──────────────────────────── */}
            {saldo && (
              <section className="mb-6 pb-6 border-b border-border" aria-label={isEs ? 'El saldo' : 'The balance'}>
                <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                  § {isEs ? 'El saldo' : 'The balance'}
                </p>
                <p
                  style={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.25rem, 2.2vw, 1.6rem)',
                    lineHeight: 1.4,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {isEs ? (
                    <>
                      <SaldoNum>{saldo.k50}</SaldoNum> categorías concentran la mitad de{' '}
                      <SaldoNum>{formatCompactMXN(saldo.total)}</SaldoNum>. Pero la más cara —{' '}
                      {saldo.topSpend.name_es} — no es la de mayor riesgo:{' '}
                      <span style={{ color: SECTOR_TEXT_COLORS[saldo.riskiest.sector_code] ?? 'var(--color-text-primary)', fontWeight: 600 }}>
                        {saldo.riskiest.name_es}
                      </span>{' '}
                      marca <SaldoNum>{saldo.riskiest.avg_risk.toFixed(2)}</SaldoNum> de indicador,{' '}
                      {saldo.ratio.toFixed(1)}× el promedio del libro.
                    </>
                  ) : (
                    <>
                      <SaldoNum>{saldo.k50}</SaldoNum> categories hold half of{' '}
                      <SaldoNum>{formatCompactMXN(saldo.total)}</SaldoNum>. Yet the costliest —{' '}
                      {saldo.topSpend.name_en} — is not the riskiest:{' '}
                      <span style={{ color: SECTOR_TEXT_COLORS[saldo.riskiest.sector_code] ?? 'var(--color-text-primary)', fontWeight: 600 }}>
                        {saldo.riskiest.name_en}
                      </span>{' '}
                      posts a <SaldoNum>{saldo.riskiest.avg_risk.toFixed(2)}</SaldoNum> indicator,{' '}
                      {saldo.ratio.toFixed(1)}× the book average.
                    </>
                  )}
                </p>
                <p className="font-mono mt-3 tabular-nums" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                  {isEs
                    ? `top ${saldo.k50} = 50% del gasto · ${saldo.k80} categorías = 80% · 72 cubren 99.73% · indicador de riesgo, no estimación de fraude`
                    : `top ${saldo.k50} = 50% of spend · ${saldo.k80} categories = 80% · 72 cover 99.73% · risk indicator, not a fraud estimate`}
                </p>
              </section>
            )}

            {/* ── B1.5 · § HALLAZGOS (3 finding cards) ─────────────────────── */}
            <FindingsBand
              findings={findings}
              lang={lang}
              kickerEs="Hallazgos · dónde mirar primero"
              kickerEn="Findings · where to look first"
            />

            {/* ── B2 · El Filtro ────────────────────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="font-mono mr-1" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Ordenar' : 'Sort'}
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
                    {isEs ? labelEs : labelEn}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={isEs ? 'Filtrar por sector' : 'Filter by sector'}>
                <button
                  type="button"
                  onClick={() => setActiveSector(null)}
                  aria-pressed={activeSector === null}
                  className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                  style={activeSector === null
                    ? { background: 'var(--color-text-secondary)', borderColor: 'var(--color-text-secondary)', color: 'var(--color-background)' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {isEs ? 'Todos' : 'All'}
                </button>
                {presentSectorCodes.map((code) => {
                  const sectorActive = activeSector === code
                  const hex = SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveSector(sectorActive ? null : code)}
                      aria-pressed={sectorActive}
                      className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                      style={sectorActive ? { background: hex, borderColor: hex, color: '#ffffff' } : { background: 'transparent', borderColor: hex, color: hex }}
                    >
                      {getSectorName(code, lang)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── B3 · § EL CONCENTRADO (centerpiece) ──────────────────────── */}
            <section className="mb-6 pb-6 border-b border-border" aria-label={isEs ? 'El concentrado' : 'The concentrate'}>
              <p className="font-mono mb-3.5" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                § {isEs ? 'El concentrado · el tamaño no es el riesgo' : 'The concentrate · size is not risk'}
              </p>
              <CategoryConcentrationPlate items={data.data} lang={lang} lens={lens} onLensChange={setLens} />
            </section>

            {/* ── B3.5 · § LO QUE EL GASTO ESCONDE (honor roll) ────────────── */}
            <RiskRankBand items={data.data} lang={lang} />

            {/* ── B4 · § EL REGISTRO ───────────────────────────────────────── */}
            <section aria-label={isEs ? 'El registro' : 'The register'}>
              <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                § {isEs ? 'El registro · las 72 categorías' : 'The register · all 72 categories'}
              </p>
              <div className="rounded-sm border border-border overflow-hidden">
                <table className="w-full border-collapse" style={{ display: 'block' }}>
                  <thead style={{ display: 'block' }}>
                    <tr
                      className="px-3 sm:px-5 py-1.5 bg-background-elevated border-b border-border font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted/60"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                      <th className="w-7 flex-shrink-0 text-left font-medium" scope="col">#</th>
                      <SortHeaderTh<SortKey>
                        field="spend"
                        label={isEs ? 'Categoría · gasto' : 'Category · spend'}
                        activeField={sortKey}
                        order="desc"
                        onSort={setSortKey}
                        className="flex-1 text-left"
                      />
                      <SortHeaderTh<SortKey>
                        field="contracts"
                        label={isEs ? 'Contratos' : 'Contracts'}
                        activeField={sortKey}
                        order="desc"
                        onSort={setSortKey}
                        className="flex-shrink-0 min-w-[92px] text-right"
                      />
                      <SortHeaderTh<SortKey>
                        field="risk"
                        label={isEs ? 'Riesgo' : 'Risk'}
                        activeField={sortKey}
                        order="desc"
                        onSort={setSortKey}
                        className="flex-shrink-0 min-w-[78px] text-right"
                      />
                      <SortHeaderTh<SortKey>
                        field="direct_award"
                        label={isEs ? 'Adj. dir.' : 'Direct'}
                        activeField={sortKey}
                        order="desc"
                        onSort={setSortKey}
                        className="flex-shrink-0 min-w-[78px] text-right"
                      />
                    </tr>
                  </thead>
                  {displayed.length > 0 ? (
                    <tbody
                      style={{ display: 'block', position: 'relative' }}
                      onMouseLeave={() => setHover(null)}
                    >
                      {displayed.map((item, idx) => (
                        <LedgerRow
                          key={item.category_id}
                          item={item}
                          rank={idx + 1}
                          maxValue={maxValue}
                          showVendor={idx < 15}
                          lang={lang}
                          onHover={(id, el) => setHover({ id, ...captureRect(el) })}
                          onLeave={() => setHover(null)}
                        />
                      ))}

                      {/* Floating register dossier (desktop only) — edge-flips */}
                      {hoverItem && hover && (
                        <tr style={{ display: 'block' }}>
                          <td style={{ display: 'block', padding: 0, border: 0 }}>
                            <div
                              className="hidden md:block pointer-events-none absolute z-20"
                              style={{
                                right: 12,
                                ...(dossierBelow ? { top: hover.bottom + 6 } : { bottom: hover.containerH - hover.top + 6 }),
                              }}
                            >
                              <div className="rounded-md border border-border bg-background-card p-3 shadow-xl" style={{ width: 300 }}>
                                <CategoryHoverDossier item={hoverItem} rank={hoverRank} totalValue={totalValue} lang={lang} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ) : (
                    <tbody style={{ display: 'block' }}>
                      <tr style={{ display: 'block' }}>
                        <td className="py-12 text-center" style={{ display: 'block' }} role="status" aria-live="polite">
                          <p className="text-sm font-mono text-text-muted">
                            {isEs ? 'No hay categorías en este sector.' : 'No categories in this sector.'}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </div>

              {/* dagger margin note */}
              <p
                className="mt-3"
                style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}
              >
                {isEs
                  ? '† Sectores con una sola categoría activa — expansión de taxonomía pendiente (S.10–S.12).'
                  : '† Sectors with a single active category — taxonomy expansion pending (S.10–S.12).'}
              </p>
            </section>

            {/* ── B∞ · § ADÓNDE IR (coda) ──────────────────────────────────── */}
            <section className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }} aria-label={isEs ? 'Adónde ir' : 'Where to go next'}>
              <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                § {isEs ? 'Adónde ir' : 'Where to go next'}
              </p>
              <div className="flex items-center flex-wrap gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/aria')}
                  className="font-mono uppercase tracking-wide transition-opacity hover:opacity-70"
                  style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--color-accent)', background: 'none', border: 0, cursor: 'pointer' }}
                >
                  {isEs ? 'Ver la cola de investigación →' : 'See the investigation queue →'}
                </button>
                <div className="flex items-center flex-wrap gap-2">
                  {codaRiskiest && (
                    <EntityIdentityChip
                      type="category"
                      id={codaRiskiest.category_id}
                      name={isEs ? codaRiskiest.name_es : codaRiskiest.name_en}
                      size="sm"
                      sectorCode={codaRiskiest.sector_code}
                      riskScore={codaRiskiest.avg_risk}
                    />
                  )}
                  {codaCaptured && codaCaptured.category_id !== codaRiskiest?.category_id && (
                    <EntityIdentityChip
                      type="category"
                      id={codaCaptured.category_id}
                      name={isEs ? codaCaptured.name_es : codaCaptured.name_en}
                      size="sm"
                      sectorCode={codaCaptured.sector_code}
                      riskScore={codaCaptured.avg_risk}
                    />
                  )}
                  {codaRiskiest?.top_vendor && (
                    <EntityIdentityChip
                      type="vendor"
                      id={codaRiskiest.top_vendor.id}
                      name={codaRiskiest.top_vendor.name}
                      size="sm"
                      hideIcon
                      sectorCode={codaRiskiest.sector_code}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* ── Procedencia ──────────────────────────────────────────────── */}
            <ProvenanceNote lang={lang} />
          </>
        )}
      </div>
    </div>
  )
}

// Anchor number atom for the EL SALDO sentence — Garamond italic 800 tabular,
// colour inherits (the surrounding span sets it where needed).
function SaldoNum({ children }: { children: ReactNode }) {
  return (
    <span
      className="tabular-nums"
      style={{
        fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 800,
        color: 'var(--color-text-primary)',
      }}
    >
      {children}
    </span>
  )
}
