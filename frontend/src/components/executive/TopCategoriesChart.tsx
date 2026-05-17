/**
 * TopCategoriesChart — 2-row proportional treemap (NOT a bar chart).
 *
 * Row 1 = the 3 biggest spend categories, taller cells with serif spend value.
 * Row 2 = the next 5 categories at compact height. Cell width within each row
 * is proportional to spend; cell color = sector palette tinted by risk score.
 *
 * Falls back to a curated dataset when the live category_stats table is empty.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
}

interface CategoryCell {
  id: string
  name_es: string
  name_en: string
  sector_code: string
  total_value: number
  avg_risk: number
  caption_es?: string
  caption_en?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback data
// ─────────────────────────────────────────────────────────────────────────────

// Editorial captions keyed by name_es prefix — applied to live data cells
// so the Pudding "annotation-as-chart" principle holds even with live data.
// Keys match the first word or two of the live category name to be robust
// against minor name changes between DB versions.
const LIVE_CAPTIONS: Record<string, { en: string; es: string }> = {
  'Medicamentos':              { en: 'IMSS-ISSSTE cluster · 1 in 4 pesos',   es: 'Clúster IMSS-ISSSTE · 1 de cada 4 pesos' },
  'Combustibles':              { en: 'Pemex-CFE supply chain',                es: 'Cadena suministro Pemex-CFE' },
  'Obra pública':              { en: 'Peña Nieto infra boom',                 es: 'Boom infra Peña Nieto' },
  'Tecnologías de Información':{ en: 'Toka-Infotec monopoly ring',            es: 'Monopolio Toka-Infotec' },
  'Servicios profesionales':   { en: 'Gobernación revolving door',            es: 'Puerta giratoria gobernación' },
  'Vehículos':                 { en: 'SCT fleet concentration',               es: 'Concentración flota SCT' },
  'Equipo médico':             { en: 'COVID 2020 equipment surge',            es: 'Pico de compras COVID 2020' },
  'Alimentos':                 { en: 'P6 capture · Segalmex',                 es: 'Captura P6 Segalmex' },
  'Material de curación':      { en: 'IMSS-ISSSTE medical supplies',          es: 'Insumos médicos IMSS-ISSSTE' },
  'Servicios generales':       { en: 'Gobernación service concentration',     es: 'Concentración servicios gobernación' },
  'Construcción':              { en: 'Military-civil overlap',                es: 'Solapamiento militar-civil' },
}

// Curated fallback — illustrative figures that round to the v0.8.5 distribution.
// Used only when category_stats is unavailable (the table doesn't exist on
// every environment yet — precompute job ships separately).
const FALLBACK_CATEGORIES: CategoryCell[] = [
  { id: 'medicamentos',  name_es: 'Medicamentos',           name_en: 'Pharmaceuticals',     sector_code: 'salud',           total_value: 1_100_000_000_000, avg_risk: 0.55, caption_es: 'Clúster IMSS-ISSSTE · 1 de cada 4 pesos', caption_en: 'IMSS-ISSSTE cluster · 1 in 4 pesos' },
  { id: 'combustibles',  name_es: 'Combustibles y energía', name_en: 'Fuel & Energy',       sector_code: 'energia',         total_value:   980_000_000_000, avg_risk: 0.42, caption_es: 'Cadena suministro Pemex-CFE',               caption_en: 'Pemex-CFE supply chain' },
  { id: 'obra_publica',  name_es: 'Obra pública',           name_en: 'Public Works',        sector_code: 'infraestructura', total_value:   870_000_000_000, avg_risk: 0.51, caption_es: 'Boom infra Peña Nieto',                    caption_en: 'Peña Nieto infra boom' },
  { id: 'tic',           name_es: 'Tecnologías de Información', name_en: 'IT Services',     sector_code: 'tecnologia',      total_value:   620_000_000_000, avg_risk: 0.68, caption_es: 'Monopolio Toka-Infotec',                   caption_en: 'Toka-Infotec monopoly ring' },
  { id: 'serv_prof',     name_es: 'Servicios profesionales', name_en: 'Professional Services', sector_code: 'gobernacion',  total_value:   540_000_000_000, avg_risk: 0.59, caption_es: 'Puerta giratoria gobernación',              caption_en: 'Gobernación revolving door' },
  { id: 'vehiculos',     name_es: 'Vehículos y transporte',  name_en: 'Vehicles & Transport', sector_code: 'infraestructura', total_value:  410_000_000_000, avg_risk: 0.46, caption_es: 'Concentración flota SCT',                 caption_en: 'SCT fleet concentration' },
  { id: 'equipo_medico', name_es: 'Equipo médico',          name_en: 'Medical Equipment',   sector_code: 'salud',           total_value:   380_000_000_000, avg_risk: 0.52, caption_es: 'Pico de compras COVID 2020',               caption_en: 'COVID 2020 equipment surge' },
  { id: 'alimentos',     name_es: 'Alimentos y despensa',   name_en: 'Food & Distribution', sector_code: 'agricultura',     total_value:   290_000_000_000, avg_risk: 0.66, caption_es: 'Captura P6 Segalmex',                     caption_en: 'P6 capture · Segalmex' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TopCategoriesChartProps {
  lang: 'en' | 'es'
}

export function TopCategoriesChart({ lang }: TopCategoriesChartProps) {
  const { data: liveData } = useQuery({
    queryKey: ['executive', 'categories-treemap'],
    queryFn: () => categoriesApi.getSummary() as Promise<{ data: CategorySummaryItem[] }>,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  // Use live data when available; otherwise the curated fallback.
  const { items, usingFallback } = useMemo(() => {
    const live = liveData?.data ?? []
    if (live.length > 0) {
      const sorted = [...live]
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 8)
        .map<CategoryCell>((c) => {
          // Match against LIVE_CAPTIONS by longest prefix match so minor
          // name variations in future DB versions still find a caption.
          const captionKey = Object.keys(LIVE_CAPTIONS).find((k) => c.name_es.startsWith(k))
          const cap = captionKey ? LIVE_CAPTIONS[captionKey] : undefined
          return {
            id: String(c.category_id),
            name_es: c.name_es,
            name_en: c.name_en || c.name_es,
            sector_code: c.sector_code,
            total_value: c.total_value,
            avg_risk: c.avg_risk,
            caption_es: cap?.es,
            caption_en: cap?.en,
          }
        })
      return { items: sorted, usingFallback: false }
    }
    return { items: FALLBACK_CATEGORIES, usingFallback: true }
  }, [liveData])

  // Split into two rows — top 3 dominate row 1, next 5 fill row 2.
  const row1 = items.slice(0, 3)
  const row2 = items.slice(3, 8)
  const row1Total = row1.reduce((s, c) => s + c.total_value, 0) || 1
  const row2Total = row2.reduce((s, c) => s + c.total_value, 0) || 1
  const grandTotal = items.reduce((s, c) => s + c.total_value, 0)

  // Risk → background-tint opacity. Low risk barely shows the sector color;
  // high risk saturates to the sector palette.
  const riskTintAlpha = (risk: number) => Math.max(0.08, Math.min(0.42, 0.08 + risk * 0.55))

  // Risk → small badge color in the corner of each cell.
  const riskBadgeColor = (risk: number) => {
    if (risk >= 0.60) return '#dc2626'
    if (risk >= 0.40) return '#f59e0b'
    if (risk >= 0.25) return '#a06820'
    return 'var(--color-text-muted)'
  }

  const renderCell = (cat: CategoryCell, rowTotal: number, idx: number, primary: boolean, baseDelay: number) => {
    const sectorColor = SECTOR_COLORS[cat.sector_code] ?? '#64748b'
    const widthPct = (cat.total_value / rowTotal) * 100
    const tintAlpha = riskTintAlpha(cat.avg_risk)
    const riskColor = riskBadgeColor(cat.avg_risk)
    const name = lang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es

    return (
      <motion.div
        key={cat.id}
        className="relative rounded-sm overflow-hidden"
        style={{
          flexBasis: `${widthPct}%`,
          flexGrow: 0,
          flexShrink: 1,
          minWidth: 56,
          background: 'var(--color-border)',
        }}
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.5, delay: (baseDelay + idx * 70) / 1000, ease: 'easeOut' }}
      >
        {/* Sector wash — intensity ∝ risk */}
        <div
          className="absolute inset-0"
          style={{ background: sectorColor, opacity: tintAlpha }}
        />
        {/* Top accent bar = sector identity */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 3, background: sectorColor, opacity: 0.85 }}
        />
        {/* Risk indicator dot — top right */}
        <div
          className="absolute top-1.5 right-1.5 rounded-full"
          style={{ width: 5, height: 5, background: riskColor, boxShadow: `0 0 6px ${riskColor}` }}
        />
        {/* Content */}
        <div className={`relative h-full flex flex-col justify-between ${primary ? 'p-3' : 'p-2'}`}>
          <div
            className={`font-mono uppercase ${primary ? 'text-[9.5px]' : 'text-[8.5px]'} leading-[1.25] tracking-[0.05em]`}
            style={{ color: 'var(--color-text-primary)', opacity: 0.92 }}
          >
            {name}
          </div>
          <div>
            <div
              className={`font-mono font-bold tabular-nums leading-none ${primary ? 'text-[20px]' : 'text-[13px]'}`}
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: primary ? "'Playfair Display', Georgia, serif" : undefined,
                fontWeight: primary ? 800 : 700,
              }}
            >
              {formatCompactMXN(cat.total_value)}
            </div>
            {(cat.caption_es || cat.caption_en) && (
              <div
                className={`leading-[1.3] mt-0.5 italic ${primary ? 'text-[8px]' : 'text-[7px]'}`}
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--color-text-muted)',
                  opacity: primary ? 0.75 : 0.65,
                }}
              >
                {lang === 'en' ? (cat.caption_en ?? cat.caption_es) : (cat.caption_es ?? cat.caption_en)}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
          {lang === 'en' ? 'No sector data available' : 'Sin datos sectoriales disponibles'}
        </p>
        <p className="mt-2 text-[10px] text-text-muted/70 leading-relaxed max-w-md mx-auto">
          {lang === 'en'
            ? 'category_stats precompute pending — try again after the next ETL run.'
            : 'Precómputo de category_stats pendiente — intenta de nuevo tras el siguiente ETL.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Row 1 — top 3 categories, taller cells */}
      <div className="flex gap-1 mb-1" style={{ height: 96 }}>
        {row1.map((cat, idx) => renderCell(cat, row1Total, idx, true, 100))}
      </div>
      {/* Row 2 — categories 4-8, compact cells */}
      <div className="flex gap-1" style={{ height: 60 }}>
        {row2.map((cat, idx) => renderCell(cat, row2Total, idx, false, 450))}
      </div>

      {/* Caption + risk legend */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[9px] font-mono text-text-muted">
          {lang === 'en'
            ? 'Cell area ∝ total spend · color = sector · intensity = avg risk'
            : 'Área celda ∝ gasto total · color = sector · intensidad = riesgo promedio'}
        </span>
        <div className="flex items-center gap-3 text-[9px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#dc2626' }} aria-hidden="true" />
            {lang === 'en' ? 'critical risk' : 'riesgo crítico'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#f59e0b' }} aria-hidden="true" />
            {lang === 'en' ? 'high' : 'alto'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#a06820' }} aria-hidden="true" />
            {lang === 'en' ? 'medium' : 'medio'}
          </span>
        </div>
      </div>
      <div className="mt-1 text-[9px] font-mono text-text-muted">
        {lang === 'en'
          ? `top 8 = ${formatCompactMXN(grandTotal)} of MX$9.9T total${usingFallback ? ' · illustrative figures (precompute pending)' : ''}`
          : `top 8 = ${formatCompactMXN(grandTotal)} del total MX$9.9 billones${usingFallback ? ' · cifras ilustrativas (precómputo pendiente)' : ''}`}
      </div>
    </div>
  )
}
