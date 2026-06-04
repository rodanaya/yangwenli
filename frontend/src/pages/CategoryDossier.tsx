/**
 * CategoryDossier — canonical category dossier at /categories/:id.
 *
 * 2026-06-03 (DESIGNUS — operational rebuild, P0 propagation from
 * docs/WEBSITE_STANDARDS.md). Reclassified from a four-chapter narrative
 * (Subject / Timeline·TimelineHourglass / Vendors / Risk — ChapterShells with
 * Roman numerals) into a dense OPERATIONAL dossier, matching the vendor and
 * institution dossiers:
 *
 *   Hero          — identity + verdict seal (high-risk %)
 *   Command panel — CategoryStatStrip + CategoryDiagnosticGrid (decisive
 *                   numbers · market concentration · OECD deviation · top
 *                   vendors · risk over time)
 *   Vendors       — full-width vendor reference table (EntityIdentityChip)
 *   Methodology   — provenance footer
 *
 * The dropped vendor list rendered a raw navigate('/vendors/${id}') and
 * toTitleCase(name) — both Hard Rule #1 / formatVendorName violations now
 * resolved by routing through EntityIdentityChip. Legacy CategoryProfile
 * retains /print/categories/:id.
 */
import { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import {
  CategoryStatStrip,
  CategoryDiagnosticGrid,
  CategoryVendorTable,
  type CategoryLike,
} from '@/components/category/CategoryCommandPanel'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO' : level === 'high' ? 'ALTO' : level === 'medium' ? 'MEDIO' : 'BAJO'
}

// Reference-section header — tight, left-aligned (mirrors Vendor/Institution).
function DossierSectionHeader({
  id,
  eyebrow,
  title,
  meta,
  accent,
}: {
  id: string
  eyebrow: string
  title: string
  meta?: string
  accent: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-2 mb-5" style={{ borderBottom: `1px solid ${accent}33` }}>
      <div className="flex items-baseline gap-3 min-w-0">
        <span id={`${id}-eyebrow`} className="font-mono flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>
          § {eyebrow}
        </span>
        <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}>
          {title}
        </h2>
      </div>
      {meta && (
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {meta}
        </span>
      )}
    </div>
  )
}

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="mt-16 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p className="font-mono mb-2" style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
      </p>
      <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: '72ch', lineHeight: 1.55 }}>
        {lang === 'es'
          ? 'Datos COMPRANET 2002–2025. Categorías clasificadas con el modelo automático. Modelo de riesgo v0.8.5. Las señales agregadas a nivel de categoría son indicadores estadísticos del patrón procurador, no determinaciones legales.'
          : 'COMPRANET data 2002–2025. Categories classified by the auto-model. v0.8.5 risk model. Category-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
      </p>
      <button
        type="button"
        onClick={() => navigate('/methodology')}
        className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
        style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
      >
        {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
      </button>
    </section>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function CategoryDossier() {
  const { id } = useParams<{ id: string }>()
  const categoryId = Number(id)
  const validId = Number.isFinite(categoryId) && categoryId > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['cat-dossier', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: trendsData } = useQuery({
    queryKey: ['cat-dossier', 'trends', 2002, 2025],
    queryFn: () => categoriesApi.getTrends(2002, 2025),
    staleTime: 5 * 60 * 1000,
  })
  const { data: topVendorsData } = useQuery({
    queryKey: ['cat-dossier', 'top-vendors', categoryId],
    queryFn: () => categoriesApi.getTopVendors(categoryId, 10),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const category = useMemo(() => {
    if (!summaryData?.data) return null
    return summaryData.data.find((c: { category_id: number }) => c.category_id === categoryId) ?? null
  }, [summaryData, categoryId])

  // Hooks must run on every render in the same order — keep this before the
  // early returns below. React error #310 fired here on first ship.
  const categoryTrends = useMemo(() => {
    // /categories/trends returns a FLAT { data: [{category_id, year, contracts,
    // value, avg_risk}], total } — one row per category-year, not nested under
    // a `.categories[].trend` array (the prior reshape read a key that never
    // existed, so the timeline was silently always empty).
    if (!trendsData?.data) return []
    return (trendsData.data as Array<{ category_id: number; year: number; contracts: number; value: number; avg_risk: number | null }>)
      .filter((t) => t.category_id === categoryId)
      .map((t) => ({ year: t.year, total_value: t.value, total_contracts: t.contracts, avg_risk: t.avg_risk }))
      .sort((a, b) => a.year - b.year)
  }, [trendsData, categoryId])

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'ID inválido' : 'Invalid ID'}</h2>
        <Button onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />{lang === 'es' ? 'Volver a categorías' : 'Back to categories'}
        </Button>
      </div>
    )
  }
  if (summaryLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-96" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
      </div>
    </div>
  )
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Categoría no encontrada' : 'Category not found'}</h2>
        <Button onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />{lang === 'es' ? 'Volver' : 'Back'}
        </Button>
      </div>
    )
  }

  const c = category as CategoryLike
  const sectorCode = c.sector_code ?? null
  const accent = SECTOR_COLORS[sectorCode ?? 'otros'] ?? '#a06820'
  const sectorName = sectorCode ? (lang === 'es'
    ? SECTORS.find((s) => s.code === sectorCode)?.name
    : SECTORS.find((s) => s.code === sectorCode)?.nameEN) : null

  const displayName = lang === 'es' ? c.name_es : c.name_en
  const avgRisk = c.avg_risk ?? 0
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const riskPct = Math.round(avgRisk * 100)
  const hrPct = c.high_risk_pct ?? 0
  const daPct = c.direct_award_pct ?? 0

  // Verdict — the categories /summary endpoint exposes no high_risk_pct (unlike
  // institution/sector, which verdict on HR%), so average risk is the signal
  // here. Avoids a misleading "0% high-risk" seal.
  const verdictColor = RISK_COLORS[riskLevel]

  // Concentration + vendor rows from the fast endpoint.
  const concentration = topVendorsData
    ? { hhi: topVendorsData.hhi ?? 0, concentration_label: topVendorsData.concentration_label, top3_share_pct: topVendorsData.top3_share_pct ?? 0 }
    : null
  const vendorRows = topVendorsData?.data ?? []

  const lede = buildLede({ displayName, totalSpend: c.total_value ?? 0, sectorName, hrPct, daPct, lang })
  const dropChar = displayName.charAt(0)

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest">
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />{lang === 'es' ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      {/* HERO */}
      <header className="relative">
        <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 0, height: 6, background: accent }} />
        <div className="pt-8 pb-8">
          <div className="font-mono tabular-nums mb-3" style={{ fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            CAT · C-{String(c.category_id).padStart(3, '0')}{sectorCode && (<> · {sectorCode.toUpperCase()}</>)}
          </div>
          <div className="font-mono mb-4" style={{ fontSize: 10, fontStyle: 'italic', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontWeight: 500 }}>
            § {lang === 'es' ? 'EL EXPEDIENTE · CATEGORÍA' : 'EL EXPEDIENTE · CATEGORY DOSSIER'}
          </div>

          <div className="grid gap-6 lg:gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <div className="min-w-0">
              <h1
                className="text-balance mb-2"
                style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(32px, 4.4vw, 46px)', lineHeight: 1.04, letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
              >
                {displayName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 15, color: 'var(--color-text-secondary)' }}>
                <span style={{ opacity: 0.7 }}>{lang === 'es' ? 'Categoría de gasto' : 'Spending category'}</span>
                {sectorName && c.sector_id != null && (
                  <>
                    <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
                    <EntityIdentityChip type="sector" id={c.sector_id} name={sectorName} size="sm" />
                  </>
                )}
              </div>
            </div>

            {/* Verdict seal */}
            <aside className="flex-shrink-0 relative" style={{ width: 168, paddingTop: 6, paddingBottom: 8, paddingLeft: 18, paddingRight: 18 }}>
              <div aria-hidden="true" className="absolute top-0 left-0 right-0" style={{ height: 2, background: verdictColor }} />
              <div className="text-center">
                <div className="tabular-nums" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 46, lineHeight: 1, color: verdictColor, letterSpacing: '-0.02em' }}>
                  {riskPct || '—'}
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 9, color: 'var(--color-text-muted)', opacity: 0.6, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  {lang === 'es' ? 'riesgo prom. · de 100' : 'avg risk · of 100'}
                </div>
              </div>
              <div aria-hidden="true" className="my-3 mx-auto" style={{ height: 1, width: '60%', background: 'var(--color-border)' }} />
              <div className="font-mono text-center" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor, fontWeight: 700 }}>
                {lang === 'es' ? localizeLevel(riskLevel, 'es') : riskLevel.toUpperCase()}
              </div>
              <div className="font-mono text-center mt-1" style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
                {Math.round(daPct)}% {lang === 'es' ? 'adj. directa' : 'direct-award'}
              </div>
            </aside>
          </div>

          <div aria-hidden="true" className="mt-6" style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Lede */}
          <div className="mt-6" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 20, maxWidth: '68ch' }}>
            <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.55, color: 'var(--color-text-secondary)', letterSpacing: '0.005em' }}>
              <span aria-hidden="true" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: '3.5em', float: 'left', lineHeight: 0.85, color: accent, marginRight: '0.08em', marginTop: '0.05em', marginBottom: '-0.05em' }}>
                {dropChar}
              </span>
              {lede.slice(dropChar.length)}
            </p>
          </div>
        </div>
      </header>

      {/* COMMAND PANEL */}
      <div className="mt-6">
        <CategoryStatStrip category={c} trends={categoryTrends} lang={lang} />
      </div>
      <div className="mt-7">
        <CategoryDiagnosticGrid
          category={c}
          concentration={concentration}
          vendors={vendorRows}
          trends={categoryTrends}
          accent={accent}
          lang={lang}
        />
      </div>

      {/* REFERENCE — full vendor table */}
      <div className="mt-14">
        <section id="vendors" className="scroll-mt-20">
          <DossierSectionHeader
            id="vendors"
            eyebrow={lang === 'es' ? 'Proveedores' : 'Vendors'}
            title={lang === 'es' ? 'Quién captura el mercado' : 'Who captures the market'}
            meta={vendorRows.length ? (lang === 'es' ? `Los ${vendorRows.length} mayores` : `Top ${vendorRows.length}`) : undefined}
            accent={accent}
          />
          <CategoryVendorTable vendors={vendorRows} lang={lang} />
        </section>
      </div>

      <ProvenanceFooter lang={lang} />
    </div>
  )
}

function buildLede({
  displayName,
  totalSpend,
  sectorName,
  hrPct,
  daPct,
  lang,
}: {
  displayName: string
  totalSpend: number
  sectorName?: string | null
  hrPct: number
  daPct: number
  lang: 'en' | 'es'
}): string {
  const fmt = (n: number) => formatCompactMXN(n)
  if (hrPct >= 15) {
    return lang === 'es'
      ? `${displayName} agrupa ${fmt(totalSpend)}${sectorName ? ` dentro del sector ${sectorName}` : ''}. ${hrPct.toFixed(0)}% de los contratos están marcados por el modelo y ${daPct.toFixed(0)}% adjudicados sin licitación — un perfil de categoría bajo tensión.`
      : `${displayName} aggregates ${fmt(totalSpend)}${sectorName ? ` within the ${sectorName} sector` : ''}. ${hrPct.toFixed(0)}% of contracts are flagged by the model and ${daPct.toFixed(0)}% direct-award — a category profile under tension.`
  }
  return lang === 'es'
    ? `${displayName} agrupa ${fmt(totalSpend)}${sectorName ? ` dentro del sector ${sectorName}` : ''}, con ${daPct.toFixed(0)}% de adjudicación directa.`
    : `${displayName} aggregates ${fmt(totalSpend)}${sectorName ? ` within the ${sectorName} sector` : ''}, with ${daPct.toFixed(0)}% direct-award.`
}
