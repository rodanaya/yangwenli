/**
 * El Vacío / The Gap — post-CompraNet 2025-2026 procurement recovered
 * by scraping ComprasMX (Mexico's procurement successor after CompraNet
 * was legally abolished April 2025).
 *
 * Data window: Sep 29 2025 – present (bulk CompraNet feed froze Sep 28 2025).
 * Source: ComprasMX (Secretaría Anticorrupción) reverse-engineered API.
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { slideUp } from '@/lib/animations'
import {
  FileSearch,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Loader2,
  AlertCircle,
  Users,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { gapApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { cn, formatCompactMXN, formatNumber, formatDualCurrency, clampPage } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import type { GapContractFilterParams, GapContractItem, GapSummaryResponse } from '@/api/types'
import { useDebouncedValue } from '@/hooks/useDebouncedSearch'

// ─── risk level pill ──────────────────────────────────────────────────────────

const RISK_LEVEL_LABELS_ES: Record<string, string> = {
  critical: 'CRÍTICO',
  high: 'ALTO',
  medium: 'MEDIO',
  low: 'BAJO',
}

const RISK_LEVEL_LABELS_EN: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

function RiskLevelPill({ level, lang }: { level: string; lang: string }) {
  const label = lang === 'es' ? RISK_LEVEL_LABELS_ES[level] : RISK_LEVEL_LABELS_EN[level]
  if (!label) return null

  // Bible §3.10: low = text-text-muted, no green
  const isLow = level === 'low'
  const color = isLow ? undefined : RISK_COLORS[level as keyof typeof RISK_COLORS]

  return (
    <span
      className={cn(
        'text-[9px] font-mono tracking-wide px-1.5 py-0.5 rounded border',
        isLow && 'text-text-muted border-border'
      )}
      style={!isLow && color ? { color, borderColor: color } : undefined}
    >
      {label}
    </span>
  )
}

// ─── stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="border border-border rounded-sm p-4 bg-surface flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-text-muted text-xs font-mono uppercase tracking-widest">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div
        className="font-serif text-2xl font-bold tabular-nums leading-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-text-muted text-xs font-mono">{sub}</div>}
    </div>
  )
}

// ─── structural grade block ───────────────────────────────────────────────────

function GradeBlock({ summary, lang }: { summary: GapSummaryResponse; lang: string }) {
  const { by_risk_level, worst_institutions, grade_methodology } = summary
  const total =
    by_risk_level.critical + by_risk_level.high + by_risk_level.medium + by_risk_level.low
  if (total === 0) return null

  const levels: Array<{ key: keyof typeof by_risk_level; label_es: string; label_en: string }> = [
    { key: 'critical', label_es: 'Crítico', label_en: 'Critical' },
    { key: 'high', label_es: 'Alto', label_en: 'High' },
    { key: 'medium', label_es: 'Medio', label_en: 'Medium' },
    { key: 'low', label_es: 'Bajo', label_en: 'Low' },
  ]

  return (
    <div className="border border-border rounded-sm bg-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono mb-1">
            {lang === 'es'
              ? 'Indicador de banderas estructurales'
              : 'Structural red-flag indicator'}
          </div>
          <div className="font-serif text-lg font-bold text-text-primary">
            {lang === 'es'
              ? 'Nivel de alerta estructural'
              : 'Structural alert grade'}
          </div>
        </div>
        <ShieldAlert className="w-6 h-6 shrink-0 text-text-muted mt-1" />
      </div>

      {/* distribution bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {levels.map(({ key }) => {
            const count = by_risk_level[key]
            const pct = total > 0 ? (count / total) * 100 : 0
            if (pct < 0.5) return null
            const isLow = key === 'low'
            const color = isLow ? '#71717a' : RISK_COLORS[key as keyof typeof RISK_COLORS]
            return (
              <div
                key={key}
                title={`${lang === 'es' ? levels.find((l) => l.key === key)?.label_es : levels.find((l) => l.key === key)?.label_en}: ${formatNumber(count)}`}
                style={{ width: `${pct}%`, backgroundColor: color, opacity: isLow ? 0.4 : 1 }}
              />
            )
          })}
        </div>
        {/* legend */}
        <div className="flex flex-wrap gap-3">
          {levels.map(({ key, label_es, label_en }) => {
            const count = by_risk_level[key]
            const pct = total > 0 ? (count / total) * 100 : 0
            const isLow = key === 'low'
            const color = isLow ? undefined : RISK_COLORS[key as keyof typeof RISK_COLORS]
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isLow ? '#71717a' : color,
                    opacity: isLow ? 0.4 : 1,
                  }}
                />
                <span
                  className={cn(
                    'text-xs font-mono',
                    isLow ? 'text-text-muted' : 'text-text-secondary'
                  )}
                  style={!isLow && color ? { color } : undefined}
                >
                  {lang === 'es' ? label_es : label_en}
                </span>
                <span className="text-xs font-mono text-text-muted tabular-nums">
                  {formatNumber(count)} ({pct.toFixed(0)}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* worst institutions */}
      {worst_institutions.length > 0 && (
        <div>
          <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono mb-2">
            {lang === 'es'
              ? 'Instituciones con mayor concentración de alertas'
              : 'Institutions with highest alert concentration'}
          </div>
          <div className="flex flex-wrap gap-2">
            {worst_institutions.map((inst) => (
              <div
                key={inst.siglas}
                className="flex items-center gap-1.5 border border-border rounded-sm px-2 py-1 bg-surface-2"
              >
                <span className="text-xs font-mono font-semibold text-text-primary">
                  {inst.siglas}
                </span>
                <span className="text-text-muted text-[10px]">·</span>
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{ color: RISK_COLORS.critical }}
                >
                  {inst.avg_score.toFixed(1)}
                </span>
                <span className="text-[10px] text-text-muted font-mono">
                  ({formatNumber(inst.count)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* methodology caption */}
      <div className="border-t border-border pt-3 text-[10px] text-text-muted font-mono leading-relaxed">
        <strong className="text-text-secondary">
          {lang === 'es' ? 'Nota metodológica: ' : 'Methodological note: '}
        </strong>
        {grade_methodology
          ? grade_methodology
          : lang === 'es'
          ? 'Este indicador refleja señales estructurales observables (sin licitación, monto no revelado, excepción de fuente única, proveedor EFOS, concentración, magnitud) — NO es el modelo de probabilidad de corrupción v0.8.5. Los datos post-horizonte carecen de las 18 características del modelo histórico.'
          : 'This indicator reflects observable structural signals (no-bid, undisclosed amount, sole-source exception, EFOS vendor, concentration, magnitude) — NOT the v0.8.5 corruption-probability model. Post-horizon data lacks the 18 features of the historical model.'}
      </div>
    </div>
  )
}

// ─── exception article panel ──────────────────────────────────────────────────

function ExceptionPanel({ items, lang }: { items: GapSummaryResponse['by_exception_article']; lang: string }) {
  if (!items.length) return null

  const total = items.reduce((s, i) => s + i.count, 0)

  return (
    <div className="border border-border rounded-sm p-4 bg-surface">
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono mb-3">
        {lang === 'es' ? 'Artículo de excepción invocado' : 'Exception article invoked'}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0
          return (
            <div key={item.article} className="flex items-center gap-2">
              <div
                className="w-44 shrink-0 text-xs font-mono text-text-secondary whitespace-normal break-words leading-tight"
              >
                {item.article || (lang === 'es' ? 'No especificado' : 'Unspecified')}
              </div>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: RISK_COLORS.critical }}
                />
              </div>
              <div className="text-xs font-mono text-text-muted w-14 text-right">
                {formatNumber(item.count)}{' '}
                <span className="text-text-on-dark-muted">({pct.toFixed(0)}%)</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-text-muted font-mono">
        {lang === 'es'
          ? 'Cada adjudicación directa requiere un artículo legal de justificación. La concentración en un solo artículo es señal de elusión sistemática del proceso competitivo.'
          : 'Each direct award requires a legal exception article. Concentration in a single article is a marker of systematic competitive-process avoidance.'}
      </div>
    </div>
  )
}

// ─── sector breakdown ─────────────────────────────────────────────────────────

function SectorBar({ items, lang }: { items: GapSummaryResponse['by_sector']; lang: string }) {
  if (!items.length) return null

  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, 8)
  const max = sorted[0]?.count ?? 1

  return (
    <div className="border border-border rounded-sm p-4 bg-surface">
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono mb-3">
        {lang === 'es' ? 'Distribución por sector' : 'By sector'}
      </div>
      <div className="space-y-2">
        {sorted.map((item) => {
          const sector = SECTORS.find((s) => s.id === item.sector_id)
          const color = sector ? SECTOR_COLORS[sector.code] : '#64748b'
          const pct = max > 0 ? (item.count / max) * 100 : 0
          const label =
            lang === 'es' ? sector?.name ?? item.sector : sector?.nameEN ?? item.sector
          return (
            <div key={item.sector_id} className="flex items-center gap-2">
              <div
                className="w-36 shrink-0 text-xs font-mono text-text-secondary whitespace-normal break-words leading-tight"
              >
                {label}
              </div>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="text-xs font-mono text-text-muted w-10 text-right">
                {formatNumber(item.count)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── amount badge ─────────────────────────────────────────────────────────────

function AmountCell({ item, lang }: { item: GapContractItem; lang: string }) {
  if (!item.amount_best && item.amount_source === 'none') {
    return <span className="text-text-muted font-mono text-xs">—</span>
  }

  const amount = item.amount_best ?? 0

  return (
    <div className="text-right">
      <span className="font-mono text-sm tabular-nums">{formatCompactMXN(amount)}</span>
      {item.amount_source === 'estimated' && (
        <span
          className="ml-1 text-[9px] font-mono tracking-wide px-1 py-0.5 rounded border"
          style={{ color: RISK_COLORS.medium, borderColor: RISK_COLORS.medium, opacity: 0.8 }}
          title={
            lang === 'es'
              ? 'Monto estimado — no recuperado del PDF de fallo'
              : 'Estimated — not recovered from award PDF'
          }
        >
          EST
        </span>
      )}
      {item.amount_source === 'fallo_ocr' && (
        <span
          className="ml-1 text-[9px] font-mono tracking-wide px-1 py-0.5 rounded border border-border text-text-muted"
          title={
            lang === 'es'
              ? 'Monto recuperado mediante OCR del PDF de fallo'
              : 'Amount recovered via OCR of award PDF'
          }
        >
          OCR
        </span>
      )}
    </div>
  )
}

// ─── flag chips ───────────────────────────────────────────────────────────────

function FlagChips({ item, lang }: { item: GapContractItem; lang: string }) {
  const chips: React.ReactNode[] = []

  if (item.is_direct_award) {
    chips.push(
      <span
        key="da"
        className="text-[9px] font-mono tracking-wide px-1 py-0.5 rounded border"
        style={{ color: RISK_COLORS.critical, borderColor: RISK_COLORS.critical }}
        title={lang === 'es' ? 'Adjudicación directa' : 'Direct award (no-bid)'}
      >
        DA
      </span>
    )
  }
  if (item.is_young_vendor) {
    chips.push(
      <span
        key="young"
        className="text-[9px] font-mono tracking-wide px-1 py-0.5 rounded border"
        style={{ color: RISK_COLORS.medium, borderColor: RISK_COLORS.medium }}
        title={lang === 'es' ? 'Empresa <3 años' : 'Company <3 years old'}
      >
        ⚠ {lang === 'es' ? 'JOVEN' : 'YOUNG'}
      </span>
    )
  }
  if (item.efos_flag) {
    chips.push(
      <span
        key="efos"
        className="text-[9px] font-mono tracking-wide px-1 py-0.5 rounded border"
        style={{ color: RISK_COLORS.high, borderColor: RISK_COLORS.high }}
        title={lang === 'es' ? 'EFOS — SAT lista de emisores de facturas falsas' : 'EFOS — SAT tax-fraud register flag'}
      >
        EFOS
      </span>
    )
  }

  return chips.length > 0 ? <div className="flex flex-wrap gap-1">{chips}</div> : null
}

// ─── register table ───────────────────────────────────────────────────────────

function Register({ items, lang }: { items: GapContractItem[]; lang: string }) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-text-muted text-sm font-mono">
        {lang === 'es'
          ? 'Sin resultados con los filtros actuales.'
          : 'No results with current filters.'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm min-w-[860px]">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[5%]">
              {lang === 'es' ? 'Nivel' : 'Level'}
            </th>
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[27%]">
              {lang === 'es' ? 'Título' : 'Title'}
            </th>
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[12%]">
              {lang === 'es' ? 'Institución' : 'Institution'}
            </th>
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[16%]">
              {lang === 'es' ? 'Proveedor' : 'Vendor'}
            </th>
            <th className="text-right px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[11%]">
              {lang === 'es' ? 'Monto' : 'Amount'}
            </th>
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[12%]">
              {lang === 'es' ? 'Excepción' : 'Exception'}
            </th>
            <th className="text-left px-3 py-2 text-[9px] font-mono tracking-widest text-text-muted uppercase w-[17%]">
              {lang === 'es' ? 'Alertas' : 'Flags'}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={`${item.procedure_number}-${idx}`}
              className={cn(
                'border-b border-border last:border-0 hover:bg-surface-2 transition-colors',
                idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2/30'
              )}
            >
              <td className="px-3 py-2.5 align-top">
                {item.risk_level ? (
                  <RiskLevelPill level={item.risk_level} lang={lang} />
                ) : (
                  <span className="text-text-muted font-mono text-[10px]">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-medium text-text-primary leading-snug line-clamp-3 text-xs" title={item.title || undefined}>
                  {item.title || <span className="text-text-muted">—</span>}
                </div>
                {item.publication_date && (
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    {item.publication_date.slice(0, 10)}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="text-xs font-mono text-text-secondary">
                  {item.institution_siglas || item.institution || '—'}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="text-xs text-text-secondary leading-snug">
                  {item.vendor ? (
                    formatVendorName(item.vendor, 999)
                  ) : (
                    <span className="text-text-muted font-mono">—</span>
                  )}
                </div>
                {item.vendor_rfc && (
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    {item.vendor_rfc}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 align-top">
                <AmountCell item={item} lang={lang} />
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="text-[10px] text-text-muted font-mono leading-snug">
                  {item.exception_article || '—'}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <FlagChips item={item} lang={lang} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── pagination ───────────────────────────────────────────────────────────────

function buildPageRange(page: number, totalPages: number): Array<number | '...'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const range: Array<number | '...'> = [1]
  if (page > 3) range.push('...')
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
    range.push(p)
  }
  if (page < totalPages - 2) range.push('...')
  range.push(totalPages)
  return range
}

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
  lang: string
}

function Pagination({ page, totalPages, total, onPage, lang }: PaginationProps) {
  if (totalPages <= 1) return null

  const range = buildPageRange(page, totalPages)

  return (
    <div className="flex items-center justify-between gap-4 pt-3">
      <span className="text-xs text-text-muted font-mono">
        {formatNumber(total)} {lang === 'es' ? 'registros' : 'records'}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={lang === 'es' ? 'Página anterior' : 'Previous page'}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {range.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-text-muted font-mono text-xs">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPage(p as number)}
              className="min-w-[2rem]"
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label={lang === 'es' ? 'Página siguiente' : 'Next page'}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Gap() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state from URL
  const q = searchParams.get('q') ?? ''
  const directAward = searchParams.get('da') // '0' | '1' | null
  const recoveredOnly = searchParams.get('rec') === '1'
  const youngOnly = searchParams.get('young') === '1'
  const sectorId = searchParams.get('sector') ? Number(searchParams.get('sector')) : undefined
  const riskLevel = searchParams.get('risk') as GapContractFilterParams['risk_level'] | null
  const sort = (searchParams.get('sort') ?? 'risk') as 'amount' | 'date' | 'risk'
  const page = clampPage(Number(searchParams.get('page') ?? '1'), 1)

  // Local search input state (debounced before hitting API)
  const [inputQ, setInputQ] = useState(q)
  const debouncedQ = useDebouncedValue(inputQ, 300)

  // Sync debounced search to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (debouncedQ) {
      next.set('q', debouncedQ)
    } else {
      next.delete('q')
    }
    next.delete('page')
    // Only update if value actually changed
    if (next.get('q') !== searchParams.get('q')) {
      setSearchParams(next)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ])

  // Generic filter setter — always resets page
  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value === undefined || value === '') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    next.delete('page')
    setSearchParams(next)
  }

  const hasActiveFilters = !!(
    directAward ||
    recoveredOnly ||
    youngOnly ||
    sectorId ||
    debouncedQ ||
    riskLevel ||
    sort !== 'risk'
  )

  const clearFilters = () => {
    setInputQ('')
    setSearchParams(new URLSearchParams())
  }

  // Summary query
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['gap-summary'],
    queryFn: () => gapApi.getSummary(),
    staleTime: 10 * 60 * 1000,
  })

  // Contracts query
  const contractParams: GapContractFilterParams = {
    q: debouncedQ || undefined,
    direct_award: directAward === '1' ? 1 : directAward === '0' ? 0 : undefined,
    recovered_only: recoveredOnly || undefined,
    young_only: youngOnly || undefined,
    sector_id: sectorId,
    risk_level: riskLevel ?? undefined,
    sort,
    page,
    per_page: 50,
  }

  const {
    data: contractsData,
    isLoading: contractsLoading,
    isFetching,
  } = useQuery({
    queryKey: ['gap-contracts', contractParams],
    queryFn: () => gapApi.getContracts(contractParams),
    staleTime: 5 * 60 * 1000,
  })

  const contracts = contractsData?.data ?? []
  const pagination = contractsData?.pagination

  // Sector options for dropdown
  const sectorOptions = useMemo(
    () =>
      SECTORS.map((s) => ({
        id: s.id,
        label: lang === 'es' ? s.name : s.nameEN,
      })),
    [lang]
  )

  return (
    <motion.div
      {...slideUp}
      className="max-w-6xl mx-auto px-4 py-8 space-y-8"
      aria-label={
        lang === 'es'
          ? 'El Apagón — contratos post-CompraNet 2025-2026'
          : 'The Blackout — post-CompraNet 2025-2026 procurement'
      }
    >
      {/* ── hero band — headline on the left, key figures fill the right
          gutter. Previously the header was a left-only block with the stat
          tiles in a full-width row below, leaving the whole right side of
          the headline as dead whitespace. ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] items-start gap-x-10 gap-y-6">
        {/* header (left column) */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono">
            <FileSearch className="w-3 h-3" />
            {lang === 'es'
              ? 'EL APAGÓN · RECUPERACIÓN COMPRASMX · SEP 2025–2026'
              : 'THE BLACKOUT · COMPRASMX RECOVERY · SEP 2025–2026'}
          </div>
          <h1 className="font-serif text-3xl font-bold text-text-primary">
            {lang === 'es' ? 'El Apagón' : 'The Blackout'}
          </h1>
          <p className="text-text-secondary leading-relaxed">
            {lang === 'es'
              ? 'El feed masivo de CompraNet se congeló el 28 de septiembre de 2025 cuando el sistema fue abolido legalmente. Mediante ingeniería inversa de su sucesor —ComprasMX (Secretaría Anticorrupción)— recuperamos las adjudicaciones post-cierre que de otro modo quedaban fuera del registro público.'
              : 'The CompraNet bulk feed froze on September 28 2025 when the system was legally abolished. By reverse-engineering its successor — ComprasMX (Secretaría Anticorrupción) — we recovered the post-freeze awards that would otherwise fall outside the public record.'}
          </p>
          {summary && !summaryLoading && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted font-mono pt-1">
              <span className="opacity-60">
                {lang === 'es' ? 'Ventana de datos:' : 'Data window:'} {summary.data_window}
              </span>
              <span className="opacity-40">·</span>
              <span className="opacity-60">
                {lang === 'es' ? 'Fuente:' : 'Source:'} {summary.source}
              </span>
            </div>
          )}
        </div>

        {/* key figures (right column) — moved up from below to fill the gutter */}
        {summaryLoading ? (
          <div className="grid w-full grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-sm" />
            ))}
          </div>
        ) : summary && summary.available ? (
          <div className="grid w-full grid-cols-2 gap-3">
            <StatTile
              icon={FileSearch}
              label={lang === 'es' ? 'Procedimientos recuperados' : 'Procedures recovered'}
              value={formatNumber(summary.total_contracts)}
              sub={lang === 'es' ? 'post-28 sep 2025' : 'post-Sep 28 2025'}
            />
            <StatTile
              icon={AlertTriangle}
              label={lang === 'es' ? 'Sin licitación' : 'No-bid awards'}
              value={`${summary.direct_award_pct.toFixed(1)}%`}
              sub={`${formatNumber(summary.direct_award_count)} ${lang === 'es' ? 'adjudicaciones directas' : 'direct awards'}`}
              accent={RISK_COLORS.critical}
            />
            <StatTile
              icon={ShieldAlert}
              label={lang === 'es' ? 'Montos OCR recuperados' : 'OCR-recovered amounts'}
              value={formatCompactMXN(summary.recovered_sum_mxn)}
              sub={`${formatNumber(summary.recovered_count)} ${lang === 'es' ? 'con monto real' : 'with real amount'}`}
            />
            <StatTile
              icon={Users}
              label={lang === 'es' ? 'Empresas <3 años' : 'Companies <3 yrs old'}
              value={formatNumber(summary.young_vendor_count)}
              sub={lang === 'es' ? 'ganaron adjudicaciones' : 'winning awards'}
              accent={RISK_COLORS.medium}
            />
          </div>
        ) : null}
      </div>

      {/* ── availability gate ── */}
      {!summaryLoading && summary && !summary.available && (
        <div className="border border-border rounded-sm p-4 bg-surface flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-text-muted" />
          <div className="text-sm text-text-secondary">
            {lang === 'es'
              ? 'Los datos de ComprasMX no están disponibles actualmente. El pipeline de recuperación puede estar en curso o los datos no han sido ingestados.'
              : 'ComprasMX data is not currently available. The recovery pipeline may still be running or the data has not yet been ingested.'}
          </div>
        </div>
      )}

      {summaryError && (
        <div className="border border-border rounded-sm p-4 bg-surface flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: RISK_COLORS.critical }} />
          <div className="text-sm text-text-secondary">
            {lang === 'es'
              ? 'No se pudo cargar el resumen. El endpoint /gap/summary puede no estar disponible todavía.'
              : 'Could not load summary. The /gap/summary endpoint may not be available yet.'}
          </div>
        </div>
      )}

      {/* ── editorial callout ── */}
      {summary && (
        <div className="border-l-4 pl-4 py-1" style={{ borderLeftColor: RISK_COLORS.critical }}>
          <p className="text-sm text-text-secondary leading-relaxed">
            {lang === 'es' ? (
              <>
                <strong className="text-text-primary font-semibold">
                  {summary.direct_award_pct.toFixed(1)}% de los procedimientos fueron adjudicaciones
                  directas
                </strong>{' '}
                — sin convocatoria pública ni competencia de proveedores. La media OCDE para
                contrataciones de emergencia es 20–40%; compras de rutina esperan &lt;30%. El{' '}
                {formatDualCurrency(summary.best_available_sum_mxn)} en valor agregado abarca solo los
                contratos donde se recuperó o estimó el monto.
              </>
            ) : (
              <>
                <strong className="text-text-primary font-semibold">
                  {summary.direct_award_pct.toFixed(1)}% of procedures were direct awards
                </strong>{' '}
                — no public tender, no competitive bidding. The OECD benchmark for emergency
                procurement is 20–40%; routine purchases expect &lt;30%. The{' '}
                {formatDualCurrency(summary.best_available_sum_mxn)} in aggregate value covers only
                contracts where an amount was recovered or estimated.
              </>
            )}
          </p>
        </div>
      )}

      {/* ── structural grade block ── */}
      {summaryLoading ? (
        <Skeleton className="h-48 rounded-sm" />
      ) : summary ? (
        <GradeBlock summary={summary} lang={lang} />
      ) : null}

      {/* ── analytics panels ── */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExceptionPanel items={summary.by_exception_article} lang={lang} />
          <SectorBar items={summary.by_sector} lang={lang} />
        </div>
      )}

      {/* ── register section ── */}
      <div className="space-y-4">
        <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono">
          {lang === 'es' ? 'Registro de contratos' : 'Contract register'}
        </div>

        {/* filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              placeholder={lang === 'es' ? 'Buscar título o proveedor…' : 'Search title or vendor…'}
              className="pl-8 pr-3 py-1.5 text-xs rounded-sm border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-focus w-52 font-mono"
              aria-label={lang === 'es' ? 'Buscar contratos' : 'Search contracts'}
            />
          </div>

          {/* risk level */}
          <select
            value={riskLevel ?? ''}
            onChange={(e) => setFilter('risk', e.target.value || undefined)}
            className="px-2.5 py-1.5 text-xs rounded-sm border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-border-focus font-mono"
            aria-label={lang === 'es' ? 'Filtrar por nivel de riesgo' : 'Filter by risk level'}
          >
            <option value="">
              {lang === 'es' ? 'Todos los niveles' : 'All levels'}
            </option>
            <option value="critical">{lang === 'es' ? 'Crítico' : 'Critical'}</option>
            <option value="high">{lang === 'es' ? 'Alto' : 'High'}</option>
            <option value="medium">{lang === 'es' ? 'Medio' : 'Medium'}</option>
            <option value="low">{lang === 'es' ? 'Bajo' : 'Low'}</option>
          </select>

          {/* DA toggle */}
          <select
            value={directAward ?? ''}
            onChange={(e) => setFilter('da', e.target.value || undefined)}
            className="px-2.5 py-1.5 text-xs rounded-sm border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-border-focus font-mono"
            aria-label={lang === 'es' ? 'Filtrar por tipo' : 'Filter by award type'}
          >
            <option value="">{lang === 'es' ? 'Todos los tipos' : 'All types'}</option>
            <option value="1">
              {lang === 'es' ? 'Sólo adjudicaciones directas' : 'Direct awards only'}
            </option>
            <option value="0">
              {lang === 'es' ? 'Sólo licitaciones' : 'Competitive only'}
            </option>
          </select>

          {/* sector */}
          <select
            value={sectorId ?? ''}
            onChange={(e) => setFilter('sector', e.target.value || undefined)}
            className="px-2.5 py-1.5 text-xs rounded-sm border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-border-focus font-mono"
            aria-label={lang === 'es' ? 'Filtrar por sector' : 'Filter by sector'}
          >
            <option value="">{lang === 'es' ? 'Todos los sectores' : 'All sectors'}</option>
            {sectorOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* recovered toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recoveredOnly}
              onChange={(e) => setFilter('rec', e.target.checked ? '1' : undefined)}
              className="rounded border-border"
              aria-label={lang === 'es' ? 'Solo con monto OCR' : 'OCR amount only'}
            />
            <span className="text-xs font-mono text-text-secondary">
              {lang === 'es' ? 'Solo con monto OCR' : 'OCR amount only'}
            </span>
          </label>

          {/* young vendor toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={youngOnly}
              onChange={(e) => setFilter('young', e.target.checked ? '1' : undefined)}
              className="rounded border-border"
              aria-label={lang === 'es' ? 'Solo empresas jóvenes' : 'Young vendors only'}
            />
            <span className="text-xs font-mono text-text-secondary">
              {lang === 'es' ? 'Empresas jóvenes' : 'Young vendors'}
            </span>
          </label>

          {/* sort */}
          <select
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-sm border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-border-focus font-mono"
            aria-label={lang === 'es' ? 'Ordenar por' : 'Sort by'}
          >
            <option value="risk">{lang === 'es' ? 'Mayor riesgo' : 'Highest risk'}</option>
            <option value="amount">{lang === 'es' ? 'Mayor monto' : 'Highest amount'}</option>
            <option value="date">{lang === 'es' ? 'Más recientes' : 'Most recent'}</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-xs text-text-muted"
              aria-label={lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
            >
              <X className="w-3 h-3" />
              {lang === 'es' ? 'Limpiar' : 'Clear'}
            </Button>
          )}

          {isFetching && (
            <Loader2
              className="w-4 h-4 animate-spin text-text-muted"
              aria-label={lang === 'es' ? 'Cargando…' : 'Loading…'}
            />
          )}
        </div>

        {/* table */}
        {contractsLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-sm" />
            ))}
          </div>
        ) : (
          <Register items={contracts} lang={lang} />
        )}

        {/* pagination */}
        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            total={pagination.total}
            onPage={(p) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(p))
              setSearchParams(next)
            }}
            lang={lang}
          />
        )}
      </div>

      {/* ── honesty footnotes ── */}
      <div className="border-t border-border pt-4 text-xs text-text-muted font-mono space-y-1">
        <div>
          {lang === 'es'
            ? '† Montos: solo las adjudicaciones de mayor valor tienen monto real (OCR del PDF de fallo). El resto usa estimaciones o figura como no disponible.'
            : '† Amounts: only the highest-value awards have a real figure (OCR of the award PDF). The rest use estimates or show as unavailable.'}
        </div>
        <div>
          {lang === 'es'
            ? '† Proveedores: nombres extraídos por OCR. Pueden contener errores tipográficos o estar incompletos.'
            : '† Vendors: names extracted via OCR from award PDFs. May contain errors or be incomplete.'}
        </div>
        <div>
          {lang === 'es'
            ? '† Nivel de alerta: indicador estructural basado en señales observables, NO el modelo v0.8.5 de probabilidad de corrupción (los datos post-horizonte carecen de sus características).'
            : '† Alert level: structural indicator from observable signals, NOT the v0.8.5 corruption-probability model (post-horizon data lacks its features).'}
        </div>
      </div>
    </motion.div>
  )
}
