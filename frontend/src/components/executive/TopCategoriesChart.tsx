/**
 * TopCategoriesChart — ranked editorial list (was: 2-row treemap).
 *
 * Eight rows, top 8 spending categories. Each row carries:
 *   - Rank index (01–08) in mono micro-caps
 *   - Category name in Playfair serif (full text, never truncated)
 *   - Proportional DotBar (canonical primitive)
 *   - Amount in Playfair Italic 800, tabular-nums
 *   - Sector accent chip (SECTOR_COLORS, no inline hex)
 *   - Risk pip (RISK_COLORS via getRiskLevelFromScore)
 *
 * Falls back to a curated dataset when the live category_stats table is empty.
 * Row click → /categories/:id (preserved from the old treemap behavior).
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { categoriesApi } from '@/api/client'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'
import {
  SECTOR_COLORS,
  SECTOR_NAMES_EN,
  SECTOR_NAMES_ES,
  RISK_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { DotBar } from '@/components/ui/DotBar'

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
  const navigate = useNavigate()
  const { data: liveData } = useQuery({
    queryKey: ['executive', 'categories-treemap'],
    queryFn: () => categoriesApi.getSummary() as Promise<{ data: CategorySummaryItem[] }>,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  const { items, usingFallback } = useMemo(() => {
    const live = liveData?.data ?? []
    if (live.length > 0) {
      const sorted = [...live]
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 8)
        .map<CategoryCell>((c) => {
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

  const grandTotal = items.reduce((s, c) => s + c.total_value, 0)
  const maxValue = items[0]?.total_value ?? 1

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
      {/* Editorial column header — printed rank-order page, not a chart legend. */}
      <div
        className="grid items-end gap-x-4 pb-2 text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted"
        style={{ gridTemplateColumns: '28px minmax(0,1fr) 176px 110px 18px', borderBottom: '1px solid rgba(160, 104, 32, 0.22)' }}
      >
        <span>{lang === 'en' ? 'Rk' : 'No'}</span>
        <span>{lang === 'en' ? 'Category · sector' : 'Categoría · sector'}</span>
        <span className="hidden sm:block">{lang === 'en' ? 'Share of total' : 'Cuota del total'}</span>
        <span className="text-right">{lang === 'en' ? 'Spend MXN · USD' : 'Gasto (MXN)'}</span>
        <span className="text-right" aria-hidden="true">·</span>
      </div>

      {/* Ranked rows */}
      <ol className="divide-y divide-[color:rgba(160,104,32,0.12)]">
        {items.map((cat, idx) => {
          const sectorColor = SECTOR_COLORS[cat.sector_code] ?? SECTOR_COLORS.otros
          const sectorName = lang === 'en'
            ? (SECTOR_NAMES_EN[cat.sector_code] ?? cat.sector_code)
            : (SECTOR_NAMES_ES[cat.sector_code] ?? cat.sector_code)
          const riskLevel = getRiskLevelFromScore(cat.avg_risk)
          const riskColor = RISK_COLORS[riskLevel]
          const riskLabel =
            riskLevel === 'critical' ? (lang === 'en' ? 'critical' : 'crítico') :
            riskLevel === 'high'     ? (lang === 'en' ? 'high'     : 'alto') :
            riskLevel === 'medium'   ? (lang === 'en' ? 'medium'   : 'medio') :
                                       (lang === 'en' ? 'low'      : 'bajo')
          const name = lang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es
          const caption = lang === 'en' ? (cat.caption_en ?? cat.caption_es) : (cat.caption_es ?? cat.caption_en)
          const sharePct = (cat.total_value / grandTotal) * 100

          return (
            <motion.li
              key={cat.id}
              initial={{ opacity: 0, x: -4 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.42, delay: idx * 0.045, ease: 'easeOut' }}
              className="group cursor-pointer relative grid items-center gap-x-4 py-3 transition-colors hover:bg-[color:rgba(160,104,32,0.045)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ gridTemplateColumns: '28px minmax(0,1fr) 176px 110px 18px' }}
              onClick={() => navigate(`/categories/${cat.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/categories/${cat.id}`) }}
              tabIndex={0}
              role="link"
              aria-label={`${name} — ${formatCompactMXN(cat.total_value)} — ${riskLabel}`}
            >
              {/* Rank */}
              <span
                className="font-mono tabular-nums text-[11px] text-text-muted tracking-[0.05em] self-center"
              >
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Category name + sector */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 h-3 w-[3px] rounded-[1px]"
                    style={{ background: sectorColor }}
                    aria-hidden="true"
                  />
                  <span
                    className="leading-[1.15] truncate-balance"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 600,
                      fontSize: 17,
                      color: 'var(--color-text-primary)',
                    }}
                    title={name}
                  >
                    {name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[9.5px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  <span style={{ color: sectorColor, opacity: 0.95, fontWeight: 600 }}>
                    {sectorName}
                  </span>
                  {caption && (
                    <>
                      <span aria-hidden="true" className="opacity-50">·</span>
                      <span className="italic normal-case tracking-normal text-[10px] text-text-muted/85 truncate">
                        {caption}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Proportional DotBar — canonical primitive */}
              <div className="flex items-center gap-2 justify-self-start">
                <DotBar
                  value={cat.total_value}
                  max={maxValue}
                  color={sectorColor}
                  emptyColor="var(--color-border)"
                  dots={28}
                  dotR={2}
                  dotGap={5}
                  ariaLabel={`${sharePct.toFixed(1)}% ${lang === 'en' ? 'of top 8' : 'del top 8'}`}
                />
                <span className="font-mono tabular-nums text-[10px] text-text-muted w-[30px] text-right">
                  {sharePct.toFixed(0)}%
                </span>
              </div>

              {/* Amount — MXN anchor, optional USD scale companion (EN only). */}
              <div className="text-right tabular-nums flex flex-col items-end gap-0.5">
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 19,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1,
                  }}
                >
                  {formatCompactMXN(cat.total_value)}
                </span>
                {lang === 'en' && (
                  <span
                    className="font-mono text-[9.5px] tracking-[0.02em]"
                    style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}
                  >
                    ≈{formatCompactUSD(cat.total_value)}
                  </span>
                )}
              </div>

              {/* Risk pip */}
              <span
                className="justify-self-end rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: riskColor,
                  boxShadow: `0 0 0 2px var(--color-background)`,
                }}
                title={`${lang === 'en' ? 'avg risk' : 'riesgo promedio'} · ${cat.avg_risk.toFixed(2)} · ${riskLabel}`}
                aria-hidden="true"
              />
            </motion.li>
          )
        })}
      </ol>

      {/* Editorial footer — single band: totals, encoding, risk legend. */}
      <div
        className="mt-4 pt-2 flex items-start justify-between flex-wrap gap-x-4 gap-y-1.5 text-[9px] font-mono text-text-muted leading-[1.4]"
        style={{ borderTop: '1px solid rgba(160, 104, 32, 0.22)' }}
      >
        <span>
          {lang === 'en'
            ? <>top 8 <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatCompactMXN(grandTotal)}</span> of MX$9.9T total{usingFallback ? ' · illustrative figures (precompute pending)' : ''}</>
            : <>top 8 <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatCompactMXN(grandTotal)}</span> del total MX$9.9 billones{usingFallback ? ' · cifras ilustrativas (precómputo pendiente)' : ''}</>}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="opacity-80">
            {lang === 'en' ? 'bar = share of top 8 · pip = avg risk' : 'barra = cuota del top 8 · pip = riesgo promedio'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 6, height: 6, background: RISK_COLORS.critical }} aria-hidden="true" />
            {lang === 'en' ? 'critical' : 'crítico'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 6, height: 6, background: RISK_COLORS.high }} aria-hidden="true" />
            {lang === 'en' ? 'high' : 'alto'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full" style={{ width: 6, height: 6, background: RISK_COLORS.medium }} aria-hidden="true" />
            {lang === 'en' ? 'medium' : 'medio'}
          </span>
        </div>
      </div>
    </div>
  )
}
