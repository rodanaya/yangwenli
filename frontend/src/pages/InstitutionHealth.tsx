/**
 * Institution Risk Rankings — Editorial Redesign
 *
 * "Captura Institucional" — which government institutions show signs
 * of vendor capture? NYT/WaPo/Fern investigative journalism aesthetic.
 *
 * Data: GET /api/v1/analysis/institution-rankings
 */

import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { InstitutionHealthItem, InstitutionRankingsResponse } from '@/api/types'
import {
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

type SortField = 'hhi' | 'top_vendor_share' | 'total_contracts' | 'avg_risk_score' | 'high_risk_pct' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'

// =============================================================================
// Helpers
// =============================================================================

/** HHI badge color. Note: the API returns HHI on a 0-1 scale (not 0-10000). */
function getHhiBadgeStyle(hhi: number): { bg: string; text: string; label: string } {
  if (hhi >= 0.5) return { bg: '#dc2626', text: '#fff', label: 'Captura' }
  if (hhi >= 0.25) return { bg: '#ea580c', text: '#fff', label: 'Concentrado' }
  if (hhi >= 0.10) return { bg: '#eab308', text: '#000', label: 'Moderado' }
  return { bg: '#16a34a', text: '#fff', label: 'Competitivo' }
}

function HhiBadge({ hhi }: { hhi: number }) {
  const s = getHhiBadgeStyle(hhi)
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {hhi.toFixed(2)} — {s.label}
    </span>
  )
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />
  return sortDir === 'desc'
    ? <ArrowDown className="ml-1 inline h-3 w-3 text-accent" />
    : <ArrowUp className="ml-1 inline h-3 w-3 text-accent" />
}

function SortButton({
  field,
  sortField,
  sortDir,
  onSort,
  children,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  children: React.ReactNode
}) {
  return (
    <button
      className="flex items-center whitespace-nowrap font-medium hover:text-accent transition-colors focus:outline-none"
      onClick={() => onSort(field)}
      aria-sort={field === sortField ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      {children}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function PageSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid grid-cols-3 gap-8">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-4 w-full max-w-2xl" />
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

// =============================================================================
// Capture Spotlight Card (Top 3 editorial cards)
// =============================================================================

function CaptureSpotlightCard({ item, rank }: { item: InstitutionHealthItem; rank: number }) {
  const s = getHhiBadgeStyle(item.hhi)
  const isCaptured = item.hhi >= 0.5

  return (
    <Link
      to={`/institutions/${item.institution_id}`}
      className="group block relative"
      aria-label={`Ver perfil de ${toTitleCase(item.institution_name)}`}
    >
      <div
        className="rounded-lg border border-border bg-background-card p-5 transition-all hover:border-accent/50 focus-within:ring-2 focus-within:ring-accent"
        style={isCaptured ? { borderLeftWidth: '4px', borderLeftColor: '#dc2626' } : undefined}
      >
        {/* Rank + HHI badge */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <span
            className="text-4xl font-black tabular-nums opacity-15 leading-none"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {rank}
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: s.bg, color: s.text }}
          >
            {s.label}
          </span>
        </div>

        {/* Institution name — serif, bold */}
        <h3
          className="text-lg font-bold text-text-primary leading-snug mb-1 line-clamp-2"
          style={{ fontFamily: 'var(--font-family-serif)' }}
          title={item.institution_name}
        >
          {toTitleCase(item.institution_name)}
        </h3>

        {item.institution_type && (
          <p className="text-xs text-text-muted mb-4">{item.institution_type}</p>
        )}

        {/* HHI score — large */}
        <div className="mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Indice HHI</p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: s.bg, fontFamily: 'var(--font-family-serif)' }}
          >
            {item.hhi.toFixed(3)}
          </p>
        </div>

        {/* Key metrics */}
        <div className="space-y-2 text-sm border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-text-muted">Proveedor dominante</span>
            <span className="font-bold tabular-nums text-text-primary">
              {item.top_vendor_share.toFixed(1)}% del gasto
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Gasto total</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatCompactMXN(item.total_value)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Contratos</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatNumber(item.total_contracts)}
            </span>
          </div>
        </div>

        {/* Link */}
        <div className="mt-4 flex items-center gap-1 text-xs text-accent group-hover:underline">
          <span>Ver perfil institucional</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

// =============================================================================
// HHI Methodology Explainer (editorial note style)
// =============================================================================

function HhiMethodologyNote() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-b border-border">
      <button
        className="w-full flex items-center justify-between py-4 text-left hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold">
            Metodologia
          </span>
          <span className="text-sm text-text-secondary">
            ¿Que es el Indice Herfindahl-Hirschman y por que importa?
          </span>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="pb-6 space-y-4">
          {/* Pull quote */}
          <blockquote
            className="border-l-4 border-red-600 pl-4 py-2 my-4"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            <p className="text-lg text-text-primary italic leading-relaxed">
              "Un HHI de 1.0 significa que todo el dinero de una dependencia
              va a un solo proveedor. Es la definicion estadistica de captura institucional."
            </p>
          </blockquote>

          <div className="text-sm text-text-secondary leading-relaxed space-y-3 max-w-3xl">
            <p>
              El <strong className="text-text-primary">Indice Herfindahl-Hirschman (HHI)</strong> mide
              que tan concentrado esta el gasto en una institucion. Se calcula sumando los cuadrados
              de la participacion de mercado de cada proveedor. Un HHI cercano a 0 indica alta competencia;
              un HHI de 1.0 indica monopolio absoluto.
            </p>
            <p>
              En contratos publicos, la concentracion extrema es una bandera roja: sugiere que un proveedor
              ha eliminado la competencia, ya sea por capacidad legitima, por relaciones politicas,
              o por colusion con funcionarios.
            </p>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { range: '0.00 - 0.10', label: 'Competitivo', color: '#16a34a', desc: 'Muchos proveedores compiten' },
              { range: '0.10 - 0.25', label: 'Moderado', color: '#eab308', desc: 'Concentracion normal' },
              { range: '0.25 - 0.50', label: 'Concentrado', color: '#ea580c', desc: 'Pocos proveedores dominan' },
              { range: '0.50 - 1.00', label: 'Captura', color: '#dc2626', desc: 'Un proveedor controla el gasto' },
            ].map(tier => (
              <div key={tier.range} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="font-semibold text-xs" style={{ color: tier.color }}>{tier.label}</span>
                </div>
                <p className="text-xs font-mono tabular-nums text-text-muted">{tier.range}</p>
                <p className="text-xs text-text-secondary">{tier.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-muted italic">
            Nota: El HHI aqui se reporta en escala 0-1 (suma de cuadrados de participaciones decimales),
            donde 1.0 representa monopolio absoluto. La escala tradicional de 0-10,000 se divide entre 10,000
            para facilitar la comparacion.
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Rankings Table (editorial style)
// =============================================================================

function RankingsTable({ items }: { items: InstitutionHealthItem[] }) {
  const [sortField, setSortField] = useState<SortField>('hhi')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const av = a[sortField] as number
        const bv = b[sortField] as number
        return sortDir === 'desc' ? bv - av : av - bv
      })
      .slice(0, 20)
  }, [items, sortField, sortDir])

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table
        className="w-full text-sm border-collapse"
        role="table"
        aria-label="Clasificacion de instituciones por riesgo de captura"
      >
        <thead>
          <tr className="bg-background-elevated border-b border-border text-text-muted text-xs">
            <th scope="col" className="px-4 py-3 text-left w-8 font-medium">#</th>
            <th scope="col" className="px-4 py-3 text-left font-medium min-w-[220px]">Institucion</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="hhi" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Concentracion HHI
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="top_vendor_share" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Proveedor top
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="total_contracts" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Contratos
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="avg_risk_score" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Riesgo prom.
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="high_risk_pct" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Contratos criticos
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-center font-medium w-28">Perfil</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const riskLevel = getRiskLevel(item.avg_risk_score)
            const riskColor = RISK_COLORS[riskLevel]
            const isCaptured = item.hhi >= 0.5
            const isConcentrated = item.hhi >= 0.25 && item.hhi < 0.5
            return (
              <tr
                key={item.institution_id}
                className="border-b border-border/40 hover:bg-background-elevated/50 transition-colors"
                style={
                  isCaptured
                    ? { borderLeft: '4px solid #dc2626' }
                    : isConcentrated
                    ? { borderLeft: '4px solid #ea580c' }
                    : undefined
                }
              >
                <td className="px-4 py-3 text-text-muted font-mono tabular-nums text-xs">
                  {idx + 1}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text-primary text-sm">
                    {toTitleCase(item.institution_name)}
                  </span>
                  {item.institution_type && (
                    <span className="ml-2 text-xs text-text-muted">
                      {item.institution_type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <HhiBadge hhi={item.hhi} />
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                  {item.top_vendor_share.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-text-secondary">
                  {formatNumber(item.total_contracts)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-semibold" style={{ color: riskColor }}>
                  {(item.avg_risk_score * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-text-secondary">
                  {item.high_risk_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    to={`/institutions/${item.institution_id}`}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    aria-label={`Ver perfil de ${toTitleCase(item.institution_name)}`}
                  >
                    Ver perfil
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function InstitutionHealth() {
  const { data, isLoading, error } = useQuery<InstitutionRankingsResponse>({
    queryKey: ['institution-rankings', 'hhi', 50, 100],
    queryFn: () => analysisApi.getInstitutionRankings('hhi', 100, 50),
    staleTime: 10 * 60 * 1000,
  })

  // All hooks MUST be called before any early returns (Rules of Hooks)
  const items = data?.data ?? []
  const capturedTop3 = useMemo(
    () => [...items].sort((a, b) => b.hhi - a.hhi).slice(0, 3),
    [items]
  )

  if (isLoading) return <PageSkeleton />

  if (error || !data) {
    return (
      <div className="p-8 text-center text-text-muted">
        <AlertTriangle className="mx-auto h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">No se pudieron cargar los datos. Intenta recargar la pagina.</p>
      </div>
    )
  }

  const totalInstitutions = data.total_institutions ?? items.length

  // Summary stats derived from data
  const capturedCount = items.filter(i => i.hhi >= 0.5).length
  const capturedSpend = items
    .filter(i => i.hhi >= 0.5)
    .reduce((sum, i) => sum + i.total_value, 0)
  const totalSpend = items.reduce((sum, i) => sum + i.total_value, 0)
  const capturedSpendPct = totalSpend > 0
    ? ((capturedSpend / totalSpend) * 100).toFixed(1)
    : '0'

  return (
    <motion.article
      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Section 1: Editorial headline */}
      <motion.div variants={staggerItem}>
        <EditorialHeadline
          section="CAPTURA INSTITUCIONAL"
          headline="Las Instituciones Bajo Control de Proveedores"
          subtitle="Un analisis del Indice Herfindahl-Hirschman revela que dependencias han sido capturadas por un solo proveedor"
        />
      </motion.div>

      {/* Section 2: Hallazgo stats row */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-2"
        variants={staggerItem}
      >
        <HallazgoStat
          value={formatNumber(totalInstitutions)}
          label="Instituciones analizadas"
          annotation="Con al menos 100 contratos cada una"
          color="border-zinc-500"
        />
        <HallazgoStat
          value={String(capturedCount)}
          label="Instituciones con captura (HHI > 0.50)"
          annotation="Un solo proveedor domina el gasto"
          color="border-red-500"
        />
        <HallazgoStat
          value={`${capturedSpendPct}%`}
          label="Del gasto en instituciones capturadas"
          annotation={formatCompactMXN(capturedSpend)}
          color="border-orange-500"
        />
      </motion.div>

      {/* Section 3: Investigation lede paragraph */}
      <motion.div variants={staggerItem}>
        <div
          className="text-lg text-text-secondary leading-relaxed max-w-3xl"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          <p>
            Cuando una sola empresa gana mas del 50% de los contratos de una
            dependencia federal, los expertos lo llaman{' '}
            <em className="text-text-primary">captura institucional</em>.
            En Mexico,{' '}
            <strong className="text-red-500">{capturedCount} dependencias</strong>{' '}
            exhiben este patron, concentrando{' '}
            <strong className="text-text-primary">{formatCompactMXN(capturedSpend)}</strong>{' '}
            en gasto publico bajo el control de un punado de proveedores.
          </p>
        </div>
      </motion.div>

      {/* Section 4: Top 3 Capture Spotlight */}
      <motion.div variants={staggerItem}>
        <div className="mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Los tres casos mas extremos
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Las dependencias donde un proveedor tiene el control mas absoluto del gasto publico.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {capturedTop3.map((item, idx) => (
            <CaptureSpotlightCard key={item.institution_id} item={item} rank={idx + 1} />
          ))}
        </div>
      </motion.div>

      {/* Section 5: Rankings table */}
      <motion.div variants={staggerItem}>
        <div className="border-t border-border pt-6 mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Las 20 instituciones mas concentradas
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Haz clic en los encabezados para ordenar. Las filas con borde rojo
            indican captura (HHI &ge; 0.50); borde naranja indica concentracion alta.
          </p>
        </div>
        <RankingsTable items={items} />
      </motion.div>

      {/* Section 6: HHI Methodology note */}
      <motion.div variants={staggerItem}>
        <HhiMethodologyNote />
      </motion.div>

      {/* Section 7: Impacto humano block */}
      <motion.div variants={staggerItem}>
        <div
          className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-5"
        >
          <p className="text-xs uppercase tracking-[0.15em] text-amber-500 font-semibold mb-3">
            Impacto
          </p>
          <p
            className="text-base text-text-secondary leading-relaxed"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            La captura institucional en salud significa que medicamentos esenciales
            son adquiridos de un solo proveedor, eliminando la competencia y
            elevando los precios. En infraestructura, implica que obras publicas
            se asignan sin competencia real. En cada caso, el ciudadano paga mas
            por menos.
          </p>
        </div>
      </motion.div>
    </motion.article>
  )
}
