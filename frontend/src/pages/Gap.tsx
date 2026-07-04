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
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { gapApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS } from '@/lib/constants'
import { cn, formatCompactMXN, formatNumber, formatDualCurrency, clampPage } from '@/lib/utils'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { DotBar } from '@/components/ui/DotBar'
import { BlackoutTimeline } from '@/components/gap/BlackoutTimeline'
import { ExceptionCatalog } from '@/components/gap/ExceptionCatalog'
import { BuyersLedger } from '@/components/gap/BuyersLedger'
import { CounterpartyExhibit } from '@/components/gap/CounterpartyExhibit'
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

// ─── structural grade block ───────────────────────────────────────────────────

function GradeBlock({ summary, lang }: { summary: GapSummaryResponse; lang: string }) {
  const { by_risk_level, grade_methodology } = summary
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

// ─── sector breakdown ─────────────────────────────────────────────────────────

function SectorBar({ items, lang, onPick }: { items: GapSummaryResponse['by_sector']; lang: 'en' | 'es'; onPick: (id: number) => void }) {
  if (!items.length) return null
  const es = lang === 'es'
  const totalAll = items.reduce((s, i) => s + i.count, 0)
  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, 8)
  const leader = sorted[0]
  const leaderSector = SECTORS.find((s) => s.id === leader?.sector_id)
  const leaderName = leader ? (es ? leaderSector?.name ?? leader.sector : leaderSector?.nameEN ?? leader.sector) : ''
  const leaderPct = leader && totalAll > 0 ? Math.round((leader.count / totalAll) * 100) : 0
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-muted font-mono mb-3">
        {es ? 'LOS SECTORES · POR PROCEDIMIENTOS' : 'SECTORS · BY PROCEDURES'}
      </div>
      <div className="divide-y divide-border">
        {sorted.map((item) => {
          const sector = SECTORS.find((s) => s.id === item.sector_id)
          const color = sector ? SECTOR_COLORS[sector.code] : '#64748b'
          const textColor = sector ? SECTOR_TEXT_COLORS[sector.code] : '#94a3b8'
          const label = es ? sector?.name ?? item.sector : sector?.nameEN ?? item.sector
          const share = totalAll > 0 ? (item.count / totalAll) * 100 : 0
          return (
            <button key={item.sector_id} onClick={() => onPick(item.sector_id)}
              className="w-full grid grid-cols-[1fr_auto] items-center gap-x-3 py-2 text-left cursor-pointer hover:bg-surface-2 transition-colors"
              aria-label={es ? `Filtrar el registro por ${label}` : `Filter the register by ${label}`}>
              <span className="text-[12.5px] font-medium truncate" style={{ color: textColor }}>{label}</span>
              <span className="flex items-center gap-2 justify-self-end">
                <DotBar value={item.count} max={totalAll} dots={22} color={color} ariaLabel={`${label}: ${share.toFixed(0)}%`} />
                <span className="font-mono text-xs tabular-nums text-text-muted w-20 text-right">{formatNumber(item.count)} <span className="text-text-on-dark-muted">({share.toFixed(0)}%)</span></span>
              </span>
            </button>
          )
        })}
      </div>
      {leader && (
        <div className="mt-3 text-[10px] text-text-muted font-mono leading-snug">
          {es
            ? `${leaderName} concentra ${leaderPct}% de la recuperación — por número de procedimientos, no por valor (la mayoría de los montos no son públicos).`
            : `${leaderName} holds ${leaderPct}% of the recovery — by number of procedures, not value (most amounts aren’t public).`}
        </div>
      )}
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
              {lang === 'es' ? 'Proveedor (OCR)' : 'Vendor (OCR)'}
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
                <div className="font-medium text-text-primary leading-snug text-xs">
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

  const L: 'en' | 'es' = lang === 'es' ? 'es' : 'en'
  const scrollToRegister = () => document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const pickBuyer = (siglas: string) => { setInputQ(siglas); scrollToRegister() }
  const pickSector = (id: number) => { setFilter('sector', String(id)); scrollToRegister() }

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
      {/* ── ACT I · masthead + «La Línea del Registro» ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase font-mono">
          <span style={{ color: 'var(--color-accent)' }}>Folio·X</span>
          <span className="text-text-muted">· {lang === 'es' ? 'EL APAGÓN · RECUPERACIÓN COMPRASMX · SEP 2025 —' : 'THE BLACKOUT · COMPRASMX RECOVERY · SEP 2025 —'}</span>
        </div>
        <h1 className="font-serif text-text-primary" style={{ fontWeight: 500, fontSize: 'clamp(32px, 5vw, 54px)', lineHeight: 1.04 }}>
          {lang === 'es' ? 'El registro se apagó en septiembre. ' : 'The public record went dark in September. '}
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{lang === 'es' ? 'Esto es lo que se compró a oscuras.' : 'This is what was bought in the dark.'}</span>
        </h1>
        {summary && (
          <p className="text-deck text-text-secondary" style={{ maxWidth: '68ch' }}>
            {lang === 'es'
              ? `CompraNet fue abolido por ley en abril de 2025; su feed público murió el 28 de septiembre. Su sucesor, ComprasMX, publica los fallos carpeta por carpeta detrás de una firma criptográfica, sin exportación masiva. RUBLI reprodujo la firma y leyó ${formatNumber(summary.total_contracts)} adjudicaciones de los PDF escaneados de fallo.`
              : `CompraNet was abolished by law in April 2025; its public feed died on September 28. Its successor, ComprasMX, releases awards one folder at a time behind a cryptographic signature, with no bulk export. RUBLI reproduced the signature and read ${formatNumber(summary.total_contracts)} awards off the scanned award PDFs.`}
          </p>
        )}
        {summary && !summaryLoading && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted font-mono pt-1">
            <span className="opacity-60">{lang === 'es' ? 'Ventana:' : 'Window:'} {summary.data_window}</span>
            <span className="opacity-40">·</span>
            <span className="opacity-60">{lang === 'es' ? 'Fuente:' : 'Source:'} {summary.source}</span>
          </div>
        )}
      </div>

      {summary && summary.available && (
        <PlateFrame lang={L} folio="X·a" contextLabel={{ es: 'Expediente de recuperación', en: 'Recovery dossier' }}
          caption={lang === 'es'
            ? 'Lámina — La vida del registro público de compras federales, 2002–2026. La línea superior es el feed oficial; muere el 28 de septiembre de 2025. La línea punteada es lo que RUBLI recuperó del sucesor.'
            : 'Plate — The life of the public federal-procurement record, 2002–2026. The upper line is the official feed; it dies on September 28 2025. The dashed line is what RUBLI recovered from the successor.'}>
          <div className="py-3"><BlackoutTimeline totalContracts={summary.total_contracts} lang={L} /></div>
        </PlateFrame>
      )}

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

      {/* ── ACT II · Tres golpes — the three anchor numbers, each stated once ── */}
      {summary && summary.available && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border-l-2 pl-4" style={{ borderColor: 'var(--color-text-muted)' }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-1">{lang === 'es' ? 'PROCEDIMIENTOS RECUPERADOS' : 'PROCEDURES RECOVERED'}</div>
            <div className="font-serif text-text-primary tabular-nums" style={{ fontWeight: 500, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1 }}>{formatNumber(summary.total_contracts)}</div>
            <div className="mt-1.5 text-[12px] text-text-secondary leading-snug">{lang === 'es' ? 'posteriores al 28 sep 2025 · fuera del registro público' : 'after Sep 28 2025 · outside the public record'}</div>
          </div>
          <div className="border-l-2 pl-4" style={{ borderColor: RISK_COLORS.critical }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-1">{lang === 'es' ? 'SIN CONCURSO' : 'NO CONTEST'}</div>
            <div className="font-serif tabular-nums" style={{ color: RISK_COLORS.critical, fontWeight: 500, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1 }}>{summary.direct_award_pct.toFixed(1)}%</div>
            <div className="mt-1.5 text-[12px] text-text-secondary leading-snug">{formatNumber(summary.direct_award_count)} {lang === 'es' ? 'adjud. directas · referencia OCDE: rutina <30%, emergencia 20–40%' : 'direct awards · OECD reference: routine <30%, emergency 20–40%'}</div>
          </div>
          <div className="border-l-2 pl-4" style={{ borderColor: 'var(--color-text-muted)' }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-1">{lang === 'es' ? 'VALOR MEJOR DISPONIBLE' : 'BEST AVAILABLE VALUE'}</div>
            <div className="font-serif text-text-primary tabular-nums" style={{ fontWeight: 500, fontSize: 'clamp(22px,3vw,34px)', lineHeight: 1.05 }}>{formatDualCurrency(summary.best_available_sum_mxn)}</div>
            <div className="mt-1.5 text-[12px] text-text-secondary leading-snug">{formatNumber(summary.recovered_count)} {lang === 'es' ? `montos reales por OCR (${formatDualCurrency(summary.recovered_sum_mxn)}); el resto estimado o no revelado` : `real amounts via OCR (${formatDualCurrency(summary.recovered_sum_mxn)}); the rest estimated or undisclosed`}</div>
          </div>
        </div>
      )}

      {/* ── ACT III · El Catálogo de Excepciones (centerpiece) ── */}
      {summary && summary.available && summary.by_exception_article.length > 0 && (
        <PlateFrame lang={L} folio="X·b" contextLabel={{ es: 'Expediente de recuperación', en: 'Recovery dossier' }}
          caption={lang === 'es' ? 'Lámina — El artículo legal invocado en cada adjudicación directa. La concentración en las fracciones discrecionales del Art. 54 es la firma de la elusión del concurso.' : 'Plate — The legal article invoked in each direct award. Concentration in the discretionary Art. 54 fractions is the signature of contest-avoidance.'}>
          <ExceptionCatalog items={summary.by_exception_article} daCount={summary.direct_award_count} lang={L} />
        </PlateFrame>
      )}

      {/* ── ACT IV · Los Compradores + Los Sectores ── */}
      {summary && summary.available && (
        <PlateFrame lang={L} folio="X·c" contextLabel={{ es: 'Columna analítica', en: 'Analytical spine' }}
          caption={lang === 'es' ? 'Lámina — Quién compró y en qué. Instituciones por concentración de alertas; sectores por número de procedimientos recuperados.' : 'Plate — Who bought and in what. Institutions by alert concentration; sectors by number of recovered procedures.'}>
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8">
            <BuyersLedger items={summary.worst_institutions} lang={L} onPick={pickBuyer} />
            <SectorBar items={summary.by_sector} lang={L} onPick={pickSector} />
          </div>
        </PlateFrame>
      )}

      {/* ── ACT V · La Contraparte Ausente (blind spot as exhibit) ── */}
      {summary && summary.available && (
        <PlateFrame lang={L} folio="X·d" contextLabel={{ es: 'Expediente de recuperación', en: 'Recovery dossier' }}
          caption={lang === 'es' ? 'Lámina — Lo que el expediente recuperado nombra con fiabilidad, y lo que no.' : 'Plate — What the recovered file reliably names, and what it doesn’t.'}>
          <CounterpartyExhibit youngCount={summary.young_vendor_count} efosCount={summary.efos_count} lang={L} />
        </PlateFrame>
      )}

      {/* ── ACT VI · structural-alert strip (register preamble) ── */}
      {summaryLoading ? (
        <Skeleton className="h-40 rounded-sm" />
      ) : summary ? (
        <GradeBlock summary={summary} lang={lang} />
      ) : null}

      {/* ── ACT VII · Muestra del registro ── */}
      <div id="registro" className="space-y-4 scroll-mt-8">
        <div>
          <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-muted font-mono mb-1">
            {lang === 'es' ? 'MUESTRA · EL REGISTRO RECUPERADO' : 'SAMPLE · THE RECOVERED RECORD'}
          </div>
          <h2 className="font-serif text-2xl text-text-primary">
            {lang === 'es' ? 'Una muestra de las adjudicaciones recuperadas' : 'A sample of the recovered awards'}
          </h2>
          <p className="mt-1 text-[13px] text-text-secondary" style={{ maxWidth: '68ch' }}>
            {lang === 'es' ? 'Cada fila es un procedimiento leído de un PDF de fallo escaneado — no un padrón completo ni un registro de proveedores.' : 'Each row is a procedure read from a scanned award PDF — not a complete registry or a vendor ledger.'}
          </p>
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

      {/* ── Fe de recuperación (colophon) ── */}
      <div className="border-t border-border pt-4 text-xs text-text-muted font-mono space-y-1">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-secondary mb-1">
          {lang === 'es' ? 'FE DE RECUPERACIÓN' : 'RECOVERY COLOPHON'}
        </div>
        {summary && (
          <div>
            {lang === 'es'
              ? `† Método: firma criptográfica de ComprasMX reproducida por RUBLI; montos leídos por OCR de los PDF de fallo. Ventana: ${summary.data_window}.`
              : `† Method: ComprasMX cryptographic signature reproduced by RUBLI; amounts read via OCR from award PDFs. Window: ${summary.data_window}.`}
          </div>
        )}
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
