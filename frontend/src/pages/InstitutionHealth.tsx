/**
 * Institution Risk Rankings
 *
 * Section 1: 3 big summary stats
 * Section 2: Sortable rankings table (20 rows, default sort by HHI desc)
 * Section 3: Top 6 "Captured Institutions" mini cards
 * Section 4: HHI explainer accordion
 *
 * Data: GET /api/v1/analysis/institution-rankings
 * Journalist-ready — no jargon, clear red flags.
 */

import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { InstitutionHealthItem, InstitutionRankingsResponse } from '@/api/types'
import {
  Building2,
  AlertTriangle,
  TrendingUp,
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
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

// =============================================================================
// Stat Cards
// =============================================================================

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5 pb-5">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-3xl font-bold tabular-nums" style={accent ? { color: accent } : undefined}>
          {value}
        </p>
        {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Captured Institution Mini Cards (Section 3)
// =============================================================================

function CapturedCard({ item, rank }: { item: InstitutionHealthItem; rank: number }) {
  const s = getHhiBadgeStyle(item.hhi)
  return (
    <Link
      to={`/institutions/${item.institution_id}`}
      className="block rounded-xl border border-border bg-background-card p-4 hover:border-accent/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Ver perfil de ${toTitleCase(item.institution_name)}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-2xl font-black tabular-nums opacity-20">#{rank}</span>
        <span
          className="rounded px-2 py-0.5 text-xs font-bold"
          style={{ backgroundColor: s.bg, color: s.text }}
        >
          HHI {item.hhi.toFixed(2)}
        </span>
      </div>
      <p className="text-sm font-semibold text-text-primary leading-snug mb-3 line-clamp-2" title={item.institution_name}>
        {toTitleCase(item.institution_name)}
      </p>
      <div className="space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Proveedor dominante</span>
          <span className="font-semibold tabular-nums text-text-primary">{item.top_vendor_share.toFixed(1)}% del gasto</span>
        </div>
        <div className="flex justify-between">
          <span>Contratos</span>
          <span className="font-semibold tabular-nums text-text-primary">{formatNumber(item.total_contracts)}</span>
        </div>
        <div className="flex justify-between">
          <span>Gasto total</span>
          <span className="font-semibold tabular-nums text-text-primary">{formatCompactMXN(item.total_value)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-accent">
        <span>Ver perfil</span>
        <ExternalLink className="h-3 w-3" />
      </div>
    </Link>
  )
}

// =============================================================================
// HHI Accordion Explainer
// =============================================================================

function HhiExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-background-card hover:bg-background-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-text-primary">
          ¿Qué es el HHI y por qué importa?
        </span>
        {open
          ? <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 py-4 bg-background-card border-t border-border space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            El <strong className="text-text-primary">Índice Herfindahl-Hirschman (HHI)</strong> mide qué tan concentrado
            está el gasto en una institución. Un HHI de <strong className="text-text-primary">1.0</strong> significa que
            todo el dinero va a un solo proveedor — señal clásica de <em>captura institucional</em>.
          </p>
          <p>
            En contratos públicos, la concentración extrema es una bandera roja: sugiere que un proveedor
            ha eliminado la competencia, ya sea por capacidad legítima, por relaciones políticas,
            o por colusión con funcionarios.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[
              { range: '0.00 – 0.10', label: 'Competitivo', color: '#16a34a', desc: 'Muchos proveedores compiten' },
              { range: '0.10 – 0.25', label: 'Moderado', color: '#eab308', desc: 'Concentración normal' },
              { range: '0.25 – 0.50', label: 'Concentrado', color: '#ea580c', desc: 'Pocos proveedores dominan' },
              { range: '0.50 – 1.00', label: 'Captura', color: '#dc2626', desc: 'Un proveedor controla el gasto' },
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
            Nota: El HHI aquí se reporta en escala 0–1 (suma de cuadrados de participaciones en porcentaje / 10,000),
            donde 1.0 representa monopolio absoluto. La escala tradicional de 0–10,000 se divide entre 10,000 para
            facilitar la comparación.
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Rankings Table
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
        aria-label="Clasificación de instituciones por riesgo"
      >
        <thead>
          <tr className="bg-background-elevated border-b border-border text-text-muted text-xs">
            <th scope="col" className="px-4 py-3 text-left w-8 font-medium">#</th>
            <th scope="col" className="px-4 py-3 text-left font-medium min-w-[220px]">Institución</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="hhi" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                Concentración HHI
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
                Contratos críticos
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-center font-medium w-28">Perfil</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const riskLevel = getRiskLevel(item.avg_risk_score)
            const riskColor = RISK_COLORS[riskLevel]
            return (
              <tr
                key={item.institution_id}
                className="border-b border-border/40 hover:bg-background-elevated/50 transition-colors"
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

  if (isLoading) return <PageSkeleton />

  if (error || !data) {
    return (
      <div className="p-8 text-center text-text-muted">
        <AlertTriangle className="mx-auto h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">No se pudieron cargar los datos. Intenta recargar la página.</p>
      </div>
    )
  }

  const items = data.data
  const totalInstitutions = data.total_institutions ?? items.length

  // Summary stats derived from data
  const monopolyRisk = items.filter(i => i.hhi >= 0.5).length
  const monopolyPct = totalInstitutions > 0
    ? ((monopolyRisk / totalInstitutions) * 100).toFixed(1)
    : '0'

  const criticalContracts = items.reduce((sum, i) => {
    // high_risk_pct is the % with critical+high risk; multiply by total contracts
    return sum + Math.round((i.high_risk_pct / 100) * i.total_contracts)
  }, 0)

  // Top 6 by HHI for the capture cards
  const capturedTop6 = useMemo(
    () => [...items].sort((a, b) => b.hhi - a.hhi).slice(0, 6),
    [items]
  )

  return (
    <motion.div
      className="space-y-8 p-4 sm:p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Page header */}
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-text-primary">
          Clasificación de Instituciones por Riesgo
        </h1>
        <p className="mt-1 text-sm text-text-muted max-w-2xl">
          ¿Qué dependencias concentran el gasto en un solo proveedor? ¿Cuáles tienen más contratos de alto
          riesgo? Esta tabla revela las instituciones con mayor vulnerabilidad a la captura institucional.
        </p>
      </motion.div>

      {/* Section 1: Summary stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={staggerItem}
      >
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Instituciones analizadas"
          value={formatNumber(totalInstitutions)}
          sublabel="Con al menos 100 contratos"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Con riesgo de captura (HHI ≥ 0.50)"
          value={`${monopolyPct}%`}
          sublabel={`${formatNumber(monopolyRisk)} instituciones en zona de monopolio`}
          accent="#dc2626"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Contratos en riesgo crítico/alto"
          value={formatNumber(criticalContracts)}
          sublabel="Estimado a partir de la muestra analizada"
          accent="#ea580c"
        />
      </motion.div>

      {/* Section 2: Rankings table */}
      <motion.div variants={staggerItem}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Las 20 instituciones más concentradas
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Haz clic en los encabezados para ordenar. Por defecto: mayor concentración primero.
            </p>
          </div>
        </div>
        <RankingsTable items={items} />
      </motion.div>

      {/* Section 3: Top 6 captured institutions */}
      <motion.div variants={staggerItem}>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Instituciones con mayor riesgo de captura
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Las 6 dependencias donde un proveedor concentra la mayor proporción del gasto total.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {capturedTop6.map((item, idx) => (
            <CapturedCard key={item.institution_id} item={item} rank={idx + 1} />
          ))}
        </div>
      </motion.div>

      {/* Section 4: HHI Explainer */}
      <motion.div variants={staggerItem}>
        <HhiExplainer />
      </motion.div>
    </motion.div>
  )
}
