import { useQuery } from '@tanstack/react-query'
import { analysisApi, phiApi, storiesApi } from '@/api/client'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shield, BarChart3, Download, Copy, Check, ExternalLink, ArrowRight, BookOpen, AlertTriangle, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn, formatCompactMXN, getRiskLevel } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS } from '@/lib/constants'
import type { StoryPackage } from '@/api/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PHIIndicator {
  value: number
  light: 'green' | 'yellow' | 'red'
  label: string
  description: string
  benchmark: string
}

interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  indicators: Record<string, PHIIndicator>
}

interface PHINational {
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  indicators: Record<string, PHIIndicator>
}

interface PHISectorsResponse {
  methodology: {
    name: string
    based_on: string[]
  }
  national: PHINational
  sectors: PHISector[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_ORDER: Record<string, number> = { F: 0, D: 1, 'D+': 2, 'C-': 3, C: 4, 'C+': 5, 'B-': 6, B: 7, 'B+': 8, 'A-': 9, A: 10, 'A+': 11 }

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-600'
  if (grade.startsWith('B')) return 'text-blue-600'
  if (grade.startsWith('C')) return 'text-amber-600'
  if (grade.startsWith('D')) return 'text-orange-600'
  return 'text-red-600'
}

function gradeBg(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-50 border-emerald-200'
  if (grade.startsWith('B')) return 'bg-blue-50 border-blue-200'
  if (grade.startsWith('C')) return 'bg-amber-50 border-amber-200'
  if (grade.startsWith('D')) return 'bg-orange-50 border-orange-200'
  return 'bg-red-50 border-red-200'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Journalists() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data: overview } = useQuery({
    queryKey: ['analysis', 'overview'],
    queryFn: () => analysisApi.getOverview(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: phiData } = useQuery<PHISectorsResponse>({
    queryKey: ['phi', 'sectors'],
    queryFn: () => phiApi.getSectors(),
    staleTime: 10 * 60 * 1000,
  })

  // Sort sectors by grade ascending (worst first)
  const sortedSectors = useMemo(() => {
    if (!phiData?.sectors) return []
    return [...phiData.sectors].sort(
      (a, b) => (GRADE_ORDER[a.grade] ?? -1) - (GRADE_ORDER[b.grade] ?? -1)
    )
  }, [phiData])

  // Find worst sector for the story hook card
  const worstSector = sortedSectors[0]

  const handleCopy = () => {
    const text = 'Segun datos de RUBLI (rubli.mx), plataforma de analisis de contratacion publica basada en datos de COMPRANET (2002-2025), que utiliza un modelo de aprendizaje automatico entrenado con 289 casos documentados de corrupcion.'
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highRiskPct = overview?.high_risk_pct
    ? `${overview.high_risk_pct.toFixed(1)}%`
    : '12.3%'

  const highRiskCount = overview?.high_risk_contracts
    ? overview.high_risk_contracts.toLocaleString('es-MX')
    : '375,000'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf9f6' }}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 1: Hero */}
        {/* ---------------------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="editorial-rule mb-4">
            <span className="editorial-label" style={{ color: '#c41e3a' }}>PARA PERIODISTAS</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
          >
            Todo lo que necesitas para investigar el gasto publico
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mb-8 leading-relaxed">
            Datos verificados, metodologia transparente, y herramientas de analisis para investigadores y periodistas.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/report-card')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#c41e3a' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#a01830' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#c41e3a' }}
            >
              Ver el Reporte
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/contracts')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
            >
              Explorar contratos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 2: StoryFinder — publishable story packages */}
        {/* ---------------------------------------------------------------- */}
        <StoryFinderSection
          navigate={navigate}
          highRiskPct={highRiskPct}
          highRiskCount={highRiskCount}
          worstSector={worstSector}
        />

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 3: How to Use This for Your Story */}
        {/* ---------------------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <div className="editorial-rule mb-3">
            <span className="editorial-label" style={{ color: '#c41e3a' }}>GUIA RAPIDA</span>
          </div>
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
          >
            Como usar RUBLI para tu historia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StepCard
              step={1}
              icon={Search}
              title="Encuentra a tu proveedor"
              description="Busca por nombre o RFC en nuestra base de datos de 320K proveedores"
              cta="Buscar proveedor"
              onClick={() => navigate('/investigation')}
            />
            <StepCard
              step={2}
              icon={Shield}
              title="Revisa su perfil de riesgo"
              description="Mira su puntuacion ML, historial de contratos, y conexiones de red"
              cta="Ejemplo: perfil de proveedor"
              onClick={() => navigate('/investigation')}
            />
            <StepCard
              step={3}
              icon={BarChart3}
              title="Investiga el sector"
              description="Compara con el promedio del sector y revisa las calificaciones del Reporte"
              cta="Ver sectores"
              onClick={() => navigate('/sectors')}
            />
            <StepCard
              step={4}
              icon={Download}
              title="Exporta tus datos"
              description="Descarga contratos, perfiles de proveedores, y estadisticas en CSV o JSON"
              cta="Centro de exportacion"
              onClick={() => navigate('/settings?tab=export')}
            />
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 4: Sector Report Card Summary */}
        {/* ---------------------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16"
        >
          <div className="editorial-rule mb-3">
            <span className="editorial-label" style={{ color: '#c41e3a' }}>REPORTE 2025</span>
          </div>
          <h2
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
          >
            Calificaciones por Sector
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Sector</th>
                    <th className="text-center px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Calificacion</th>
                    <th className="text-center px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider hidden sm:table-cell">Tasa de competencia</th>
                    <th className="text-center px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider hidden md:table-cell">Licitaciones con 1 postor</th>
                    <th className="text-right px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSectors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-stone-400">
                        Cargando datos del sector...
                      </td>
                    </tr>
                  )}
                  {sortedSectors.map((sector, i) => {
                    const competitionRate = sector.indicators?.competition_rate?.value
                    const singleBidRate = sector.indicators?.single_bidding?.value
                    return (
                      <tr
                        key={sector.sector_id}
                        className={cn(
                          'border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer',
                          i === sortedSectors.length - 1 && 'border-b-0'
                        )}
                        onClick={() => navigate('/sectors')}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate('/sectors') }}
                      >
                        <td className="px-5 py-3.5 font-medium text-[#1a1714]">
                          {capitalize(sector.sector_name)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-9 h-7 rounded-md text-xs font-bold border',
                              gradeBg(sector.grade),
                              gradeColor(sector.grade)
                            )}
                          >
                            {sector.grade}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono text-stone-600 hidden sm:table-cell">
                          {competitionRate != null ? `${(competitionRate * 100).toFixed(1)}%` : '--'}
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono text-stone-600 hidden md:table-cell">
                          {singleBidRate != null ? `${(singleBidRate * 100).toFixed(1)}%` : '--'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-xs text-stone-400 hover:text-stone-600 transition-colors inline-flex items-center gap-1">
                            Ver detalles <ArrowRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 5: Methodology & Attribution */}
        {/* ---------------------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-16"
        >
          <div className="editorial-rule mb-3">
            <span className="editorial-label" style={{ color: '#c41e3a' }}>METODOLOGIA</span>
          </div>
          <h2
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
          >
            Nota metodologica
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
              <div className="flex gap-3">
                <BookOpen className="h-5 w-5 flex-shrink-0 text-stone-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1a1714] mb-1">Fuente de datos</p>
                  <p>COMPRANET (Sistema de Informacion de Contrataciones del Sector Publico), la base de datos oficial de contratos federales del gobierno mexicano.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <BarChart3 className="h-5 w-5 flex-shrink-0 text-stone-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1a1714] mb-1">Periodo y cobertura</p>
                  <p>2002-2025. Mas de 3 millones de contratos federales evaluados, cubriendo 12 sectores y 23 anios de actividad.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Shield className="h-5 w-5 flex-shrink-0 text-stone-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1a1714] mb-1">Modelo de riesgo</p>
                  <p>v6.0, basado en metodologia OCDE e IMF CRI. 16 indicadores z-score, 12 modelos por sector, regresion logistica ElasticNet con correccion PU-learning (Elkan & Noto, 2008).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ExternalLink className="h-5 w-5 flex-shrink-0 text-stone-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1a1714] mb-1">Verdad base</p>
                  <p>289 casos documentados de corrupcion en Mexico, desde IMSS hasta Segalmex, Odebrecht, La Estafa Maestra, y mas.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1a1714] mb-1">Advertencia importante</p>
                  <p>Las puntuaciones son indicadores estadisticos de similitud con patrones documentados de corrupcion. No determinan culpabilidad. Un puntaje alto indica que el contrato se parece a casos conocidos, no que sea corrupto.</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-stone-100">
              <button
                onClick={() => navigate('/methodology')}
                className="text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{ color: '#c41e3a' }}
              >
                Ver metodologia completa <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 6: Contact / Attribution */}
        {/* ---------------------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-10"
        >
          <div className="editorial-rule mb-3">
            <span className="editorial-label" style={{ color: '#c41e3a' }}>ATRIBUCION</span>
          </div>
          <h2
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
          >
            Usando RUBLI en tu investigacion?
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 sm:p-8">
            <p className="text-sm text-stone-600 mb-5 leading-relaxed">
              Si utilizas datos o hallazgos de RUBLI en tu trabajo periodistico, te pedimos incluir la siguiente atribucion. Puedes copiar el texto directamente:
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-stone-700 leading-relaxed italic">
                &ldquo;Segun datos de RUBLI (rubli.mx), plataforma de analisis de contratacion publica basada en datos de COMPRANET (2002-2025), que utiliza un modelo de aprendizaje automatico entrenado con 289 casos documentados de corrupcion.&rdquo;
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                copied
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Texto copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar texto de atribucion
                </>
              )}
            </button>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StoryFinder Section (Section 2)
// ---------------------------------------------------------------------------

interface StoryFinderSectionProps {
  navigate: ReturnType<typeof useNavigate>
  highRiskPct: string
  highRiskCount: string
  worstSector: PHISector | undefined
}

function StoryFinderSection({ navigate, highRiskPct, highRiskCount, worstSector }: StoryFinderSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: packages, isLoading, isError } = useQuery<StoryPackage[]>({
    queryKey: ['stories', 'packages'],
    queryFn: async () => {
      const resp = await storiesApi.getPackages()
      return resp.packages
    },
    staleTime: 10 * 60 * 1000,
  })

  const hasPackages = packages && packages.length > 0

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-16"
    >
      <div className="editorial-rule mb-6">
        <span className="editorial-label" style={{ color: '#c41e3a' }}>
          HISTORIAS LISTAS PARA PUBLICAR
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-7 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* Story packages from API */}
      {!isLoading && hasPackages && (
        <div className="grid grid-cols-1 gap-4">
          {packages.map((pkg) => (
            <StoryPackageCard
              key={pkg.id}
              pkg={pkg}
              isExpanded={expandedId === pkg.id}
              onToggle={() => toggleExpand(pkg.id)}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Fallback: original StoryCard grid (on error or empty) */}
      {!isLoading && (isError || !hasPackages) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StoryCard
            stat={`${highRiskPct} de contratos en alto riesgo`}
            description={`Mas de ${highRiskCount} contratos muestran patrones similares a casos documentados de corrupcion`}
            onClick={() => navigate('/report-card')}
          />
          <StoryCard
            stat="289 casos documentados"
            description="Nuestro modelo se entreno con casos reales de corrupcion en Mexico, desde IMSS hasta La Estafa Maestra"
            onClick={() => navigate('/model')}
          />
          <StoryCard
            stat="6-8 billones MXN evaluados"
            description="23 anios de contratos federales: el panorama mas completo disponible"
            onClick={() => navigate('/explore')}
          />
          {worstSector ? (
            <StoryCard
              stat={`Sector ${capitalize(worstSector.sector_name)}: ${worstSector.grade}`}
              description="El sector con peor calificacion en transparencia procuratoria"
              onClick={() => navigate('/sectors')}
            />
          ) : (
            <StoryCard
              stat="12 sectores evaluados"
              description="Cada sector con calificacion independiente de salud procuratoria"
              onClick={() => navigate('/sectors')}
            />
          )}
        </div>
      )}
    </motion.section>
  )
}

// ---------------------------------------------------------------------------
// StoryPackageCard — expandable card for a single story package
// ---------------------------------------------------------------------------

const DIFFICULTY_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  rapida:               { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Historia rapida' },
  requiere_solicitud:   { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',   label: 'Requiere solicitud' },
  investigacion_larga:  { bg: 'bg-red-50 border-red-200',        text: 'text-red-700',     label: 'Investigacion profunda' },
}

const DIFFICULTY_ICONS: Record<string, string> = {
  rapida: '\u26A1',
  requiere_solicitud: '\uD83D\uDCCB',
  investigacion_larga: '\uD83D\uDD0D',
}

function StoryPackageCard({
  pkg,
  isExpanded,
  onToggle,
  navigate,
}: {
  pkg: StoryPackage
  isExpanded: boolean
  onToggle: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const badge = DIFFICULTY_BADGES[pkg.difficulty] ?? DIFFICULTY_BADGES.rapida

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header — always visible */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
              badge.bg,
              badge.text
            )}
          >
            {DIFFICULTY_ICONS[pkg.difficulty]} {badge.label}
          </span>
        </div>
        <h3
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
        >
          {pkg.title}
        </h3>
        <p className="text-sm italic text-stone-500 mb-2">
          {pkg.key_question}
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          {pkg.lede}
        </p>
        <button
          onClick={onToggle}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: '#c41e3a' }}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
          />
        </button>
      </div>

      {/* Expandable detail section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 sm:px-6 border-t border-stone-100 pt-5 space-y-5">
              {/* Ejemplos concretos */}
              {pkg.examples.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Ejemplos concretos
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-100">
                          <th className="text-left py-1.5 pr-3 font-semibold text-stone-500 text-xs">Proveedor</th>
                          <th className="text-right py-1.5 px-3 font-semibold text-stone-500 text-xs">Valor</th>
                          <th className="text-left py-1.5 px-3 font-semibold text-stone-500 text-xs hidden sm:table-cell">Sector</th>
                          <th className="text-center py-1.5 pl-3 font-semibold text-stone-500 text-xs">Riesgo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkg.examples.slice(0, 5).map((ex, i) => {
                          const riskLevel = ex.avg_risk_score != null ? getRiskLevel(ex.avg_risk_score) : null
                          const vendorName = ex.vendor_name ?? 'Proveedor desconocido'
                          return (
                            <tr key={i} className="border-b border-stone-50">
                              <td className="py-1.5 pr-3">
                                <button
                                  onClick={() =>
                                    navigate(`/investigation?vendor=${encodeURIComponent(vendorName)}`)
                                  }
                                  className="text-sm font-medium hover:underline text-left"
                                  style={{ color: '#c41e3a' }}
                                >
                                  {vendorName}
                                </button>
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono text-stone-600 text-xs">
                                {ex.total_value_mxn != null ? formatCompactMXN(ex.total_value_mxn) : '--'}
                              </td>
                              <td className="py-1.5 px-3 text-stone-500 text-xs hidden sm:table-cell">
                                {ex.primary_sector_name ? capitalize(ex.primary_sector_name) : '--'}
                              </td>
                              <td className="py-1.5 pl-3 text-center">
                                {riskLevel ? (
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: RISK_COLORS[riskLevel] }}
                                    title={riskLevel}
                                  />
                                ) : (
                                  <span className="text-xs text-stone-300">--</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Defensa esperada */}
              {pkg.defense && (
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Defensa esperada
                  </p>
                  <blockquote className="border-l-2 border-stone-300 pl-4 text-sm italic text-stone-500 leading-relaxed">
                    {pkg.defense}
                  </blockquote>
                </div>
              )}

              {/* Proximos pasos */}
              {pkg.next_steps.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Proximos pasos
                  </p>
                  <ol className="list-decimal list-inside text-sm text-stone-600 space-y-1">
                    {pkg.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Explore button */}
              <button
                onClick={() => navigate('/contracts')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#c41e3a' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#a01830' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#c41e3a' }}
              >
                Explorar datos completos
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StoryCard({
  stat,
  description,
  onClick,
}: {
  stat: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 text-left hover:shadow-md hover:border-stone-300 transition-all group"
    >
      <p
        className="text-lg font-bold mb-2"
        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1714' }}
      >
        {stat}
      </p>
      <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
      <span
        className="inline-flex items-center gap-1 mt-3 text-xs font-semibold transition-colors"
        style={{ color: '#c41e3a' }}
      >
        Ver datos <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </button>
  )
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  step: number
  icon: React.ElementType
  title: string
  description: string
  cta: string
  onClick: () => void
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 flex gap-4">
      <div className="flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#c41e3a' }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
          Paso {step}
        </p>
        <p className="font-semibold text-[#1a1714] mb-1">{title}</p>
        <p className="text-sm text-stone-500 leading-relaxed mb-3">{description}</p>
        <button
          onClick={onClick}
          className="text-sm font-medium inline-flex items-center gap-1 transition-colors"
          style={{ color: '#c41e3a' }}
        >
          {cta} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
