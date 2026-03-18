import { useQuery } from '@tanstack/react-query'
import { storiesApi } from '@/api/client'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, Download } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { staggerContainer, slideUp, fadeIn } from '@/lib/animations'
import { ScrollReveal, AnimatedNumber } from '@/hooks/useAnimations'
import { StoryCard } from '@/components/stories/StoryCard'
import type { OutletType } from '@/components/stories/OutletBadge'
import type { StoryType } from '@/components/stories/StoryCard'

// ---------------------------------------------------------------------------
// Story definitions (hardcoded editorial content, live stats where available)
// ---------------------------------------------------------------------------

interface StoryDef {
  slug: string
  outlet: OutletType
  type: StoryType
  headline: string
  subheadline: string
  leadStatValue: string
  leadStatLabel: string
  leadStatColor?: string
  estimatedMinutes: number
  era?: string
  tags: string[]
}

const STORIES: StoryDef[] = [
  // Row 1 — AMLO themed
  {
    slug: 'la-cuarta-adjudicacion',
    outlet: 'animal_politico',
    type: 'era',
    headline: 'La Cuarta Adjudicacion',
    subheadline: 'Como el gobierno de AMLO llevo las adjudicaciones directas a su punto mas alto en 23 anos de datos.',
    leadStatValue: '81.9%',
    leadStatLabel: 'adjudicaciones directas en 2023 — record historico',
    leadStatColor: '#dc2626',
    estimatedMinutes: 12,
    era: 'AMLO',
    tags: ['AMLO', 'era'],
  },
  {
    slug: 'el-granero-vacio-segalmex',
    outlet: 'wapo',
    type: 'case',
    headline: 'El Granero Vacio: Segalmex',
    subheadline: 'La historia del fraude mas grande en la distribucion de alimentos del gobierno federal.',
    leadStatValue: '15',
    leadStatLabel: 'mil millones MXN en fraude de distribucion alimentaria',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 15,
    era: 'AMLO',
    tags: ['AMLO', 'case'],
  },
  {
    slug: 'los-nuevos-ricos-de-la-4t',
    outlet: 'animal_politico',
    type: 'thematic',
    headline: 'Los Nuevos Ricos de la 4T',
    subheadline: '1,253 empresas fantasma creadas despues de 2018 que acumulan contratos gubernamentales.',
    leadStatValue: '1,253',
    leadStatLabel: 'empresas fantasma post-2018',
    leadStatColor: '#e6420e',
    estimatedMinutes: 10,
    era: 'AMLO',
    tags: ['AMLO', 'thematic'],
  },
  // Row 2 — AMLO continued + Cross-era
  {
    slug: 'hemoser-el-2-de-agosto',
    outlet: 'animal_politico',
    type: 'case',
    headline: 'HEMOSER: El 2 de Agosto',
    subheadline: '17.2 mil millones de pesos en 12 contratos, adjudicados en un solo dia a un proveedor de hemoderivados.',
    leadStatValue: '17.2',
    leadStatLabel: 'mil millones MXN en 12 contratos, un solo dia',
    leadStatColor: '#e6420e',
    estimatedMinutes: 8,
    era: 'AMLO',
    tags: ['AMLO', 'case', 'salud'],
  },
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'nyt',
    type: 'era',
    headline: 'La Austeridad que No Fue',
    subheadline: 'En plena retorica de austeridad, el 80% de los contratos federales se entregaron sin licitacion en 2021.',
    leadStatValue: '80.0%',
    leadStatLabel: 'contratos sin licitacion en 2021',
    leadStatColor: '#71717a',
    estimatedMinutes: 14,
    era: 'AMLO',
    tags: ['AMLO', 'era'],
  },
  {
    slug: 'cero-competencia',
    outlet: 'nyt',
    type: 'thematic',
    headline: 'Cero Competencia',
    subheadline: 'Medio millon de licitaciones donde solo se presento un oferente. La competencia que nunca llego.',
    leadStatValue: '505,219',
    leadStatLabel: 'contratos con un solo oferente',
    leadStatColor: '#71717a',
    estimatedMinutes: 11,
    tags: ['thematic'],
  },
  // Row 3 — Cross-era + Cases
  {
    slug: 'el-triangulo-farmaceutico',
    outlet: 'wapo',
    type: 'thematic',
    headline: 'El Triangulo Farmaceutico',
    subheadline: 'Tres proveedores que se reparten 270 mil millones en contratos del sector salud.',
    leadStatValue: '270',
    leadStatLabel: 'mil millones MXN a 3 proveedores de salud',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 13,
    tags: ['thematic', 'salud'],
  },
  {
    slug: 'la-avalancha-de-diciembre',
    outlet: 'nyt',
    type: 'thematic',
    headline: 'La Avalancha de Diciembre',
    subheadline: 'Cada ano, el gobierno gasta mas en diciembre que en cualquier otro mes. En 2015, fueron 57.5 mil millones.',
    leadStatValue: '57.5',
    leadStatLabel: 'mil millones MXN en 31 dias — diciembre 2015',
    leadStatColor: '#71717a',
    estimatedMinutes: 9,
    tags: ['thematic'],
  },
  {
    slug: 'el-cartel-del-corazon',
    outlet: 'wapo',
    type: 'case',
    headline: 'El Cartel del Corazon',
    subheadline: 'Un cartel de equipo medico cardiaco que domino las compras publicas por mas de una decada.',
    leadStatValue: '50',
    leadStatLabel: 'mil millones MXN — cartel de equipo medico cardiaco',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 12,
    tags: ['case', 'salud'],
  },
  // Row 4 — Infrastructure + PEN
  {
    slug: 'infraestructura-sin-competencia',
    outlet: 'nyt',
    type: 'thematic',
    headline: 'Infraestructura Sin Competencia',
    subheadline: '2.1 billones de pesos en contratos de infraestructura donde solo hubo una propuesta.',
    leadStatValue: '2.1',
    leadStatLabel: 'billones MXN en contratos con propuesta unica',
    leadStatColor: '#71717a',
    estimatedMinutes: 14,
    tags: ['thematic', 'infraestructura'],
  },
  {
    slug: 'la-casa-de-los-contratos',
    outlet: 'animal_politico',
    type: 'era',
    headline: 'La Casa de los Contratos',
    subheadline: 'La red de empresas vinculadas a Grupo Higa y el megaproyecto de infraestructura del sexenio pasado.',
    leadStatValue: '85',
    leadStatLabel: 'mil millones MXN — red de fraude en infraestructura',
    leadStatColor: '#e6420e',
    estimatedMinutes: 16,
    era: 'Pena Nieto',
    tags: ['Pena Nieto', 'era', 'infraestructura'],
  },
  {
    slug: 'oceanografia-dos-fronteras',
    outlet: 'wapo',
    type: 'case',
    headline: 'Oceanografia: Dos Fronteras',
    subheadline: 'El fraude que cruzo de PEMEX a Banamex a Citibank. Una historia de facturas falsas a escala internacional.',
    leadStatValue: '22.4',
    leadStatLabel: 'mil millones MXN — fraude PEMEX-Banamex-Citibank',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 15,
    era: 'Pena Nieto',
    tags: ['Pena Nieto', 'case'],
  },
  // Row 5 — Systemic
  {
    slug: 'sixsigma-y-el-sat',
    outlet: 'animal_politico',
    type: 'case',
    headline: 'SixSigma y el SAT',
    subheadline: 'Como una empresa de tecnologia manipulo las licitaciones del SAT durante anos.',
    leadStatValue: '27',
    leadStatLabel: 'mil millones MXN — manipulacion de licitaciones, SAT',
    leadStatColor: '#e6420e',
    estimatedMinutes: 10,
    tags: ['case'],
  },
  {
    slug: 'sexenio-a-sexenio',
    outlet: 'nyt',
    type: 'era',
    headline: 'Sexenio a Sexenio',
    subheadline: 'De 63% a 82%: como las adjudicaciones directas crecieron sin parar durante 23 anos, sin importar quien gobernara.',
    leadStatValue: '82%',
    leadStatLabel: 'adjudicaciones directas — tendencia de 23 anos',
    leadStatColor: '#71717a',
    estimatedMinutes: 18,
    tags: ['era'],
  },
  {
    slug: 'el-ano-del-covid',
    outlet: 'wapo',
    type: 'year',
    headline: 'El Ano del COVID',
    subheadline: 'La emergencia sanitaria como justificacion para contratar sin competencia. 78.1% de los contratos de 2020.',
    leadStatValue: '78.1%',
    leadStatLabel: 'sin competencia, en la emergencia',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 11,
    era: 'AMLO',
    tags: ['AMLO', 'year'],
  },
]

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

interface FilterDef {
  id: string
  label: string
  match: (s: StoryDef) => boolean
}

const FILTERS: FilterDef[] = [
  { id: 'all', label: 'Todos', match: () => true },
  { id: 'amlo', label: 'AMLO', match: (s) => s.tags.includes('AMLO') },
  { id: 'pena', label: 'Pena Nieto', match: (s) => s.tags.includes('Pena Nieto') },
  { id: 'salud', label: 'Salud', match: (s) => s.tags.includes('salud') },
  { id: 'infra', label: 'Infraestructura', match: (s) => s.tags.includes('infraestructura') },
  { id: 'case', label: 'Casos', match: (s) => s.type === 'case' },
  { id: 'thematic', label: 'Tematico', match: (s) => s.type === 'thematic' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Journalists() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')

  // Pre-fetch story data for cache warming (used by child story pages)
  useQuery({
    queryKey: ['stories', 'administration-comparison'],
    queryFn: () => storiesApi.getAdministrationComparison(),
    staleTime: 10 * 60 * 1000,
  })

  useQuery({
    queryKey: ['stories', 'packages'],
    queryFn: () => storiesApi.getPackages(),
    staleTime: 10 * 60 * 1000,
  })

  // Live stats for hero counters
  const totalContracts = 3051294
  const totalValueBillions = 9.87
  const totalCases = 347

  // Filtered stories
  const currentFilter = FILTERS.find((f) => f.id === activeFilter) ?? FILTERS[0]
  const filtered = useMemo(
    () => STORIES.filter(currentFilter.match),
    [activeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const featured = STORIES[0] // "La Cuarta Adjudicacion"

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ================================================================ */}
        {/* HERO SECTION                                                      */}
        {/* ================================================================ */}
        <motion.section
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="pt-12 pb-10 sm:pt-16 sm:pb-14"
        >
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-zinc-500 mb-4">
            Plataforma de Inteligencia en Contrataciones Publicas
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            RUBLI INVESTIGACIONES
          </h1>
          <p className="text-xl sm:text-2xl text-zinc-400 font-light tracking-wide mb-10">
            Datos. Patrones. Poder.
          </p>

          {/* Three animated counters */}
          <div className="flex flex-wrap gap-8 sm:gap-12 mb-8">
            <div>
              <AnimatedNumber
                value={totalContracts}
                duration={2000}
                className="text-3xl sm:text-4xl font-black text-white tabular-nums"
              />
              <p className="text-sm text-zinc-500 mt-1">contratos analizados</p>
            </div>
            <div>
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                <AnimatedNumber value={totalValueBillions} decimals={2} prefix="$" suffix="T" duration={1800} />
              </span>
              <p className="text-sm text-zinc-500 mt-1">pesos evaluados</p>
            </div>
            <div>
              <AnimatedNumber
                value={totalCases}
                duration={1600}
                className="text-3xl sm:text-4xl font-black text-white tabular-nums"
              />
              <p className="text-sm text-zinc-500 mt-1">casos documentados</p>
            </div>
          </div>

          {/* Crimson divider */}
          <div className="h-[2px] w-24 bg-[#dc2626]" />
        </motion.section>

        {/* ================================================================ */}
        {/* FEATURED STORY                                                    */}
        {/* ================================================================ */}
        <ScrollReveal className="mb-14">
          <motion.button
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(`/stories/${featured.slug}`)}
            className={cn(
              'relative w-full rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950',
              'p-8 sm:p-12 text-left overflow-hidden group cursor-pointer transition-colors hover:border-zinc-600'
            )}
          >
            {/* Subtle accent glow */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.04] blur-3xl pointer-events-none"
              style={{ background: '#dc2626' }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#e6420e] text-white">
                    ANIMAL POLITICO
                  </span>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
                    HISTORIA DESTACADA
                  </span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {featured.headline}
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6 max-w-xl">
                  {featured.subheadline}
                </p>
                <span
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: '#dc2626' }}
                >
                  Leer investigacion <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>

              <div className="text-right lg:text-left flex-shrink-0">
                <div
                  className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none"
                  style={{ color: '#dc2626' }}
                >
                  <AnimatedNumber value={81.9} decimals={1} suffix="%" duration={2000} />
                </div>
                <p className="text-sm text-zinc-500 mt-2 max-w-[220px]">
                  adjudicaciones directas en 2023 — el ano mas alto en 23 anos
                </p>
              </div>
            </div>
          </motion.button>
        </ScrollReveal>

        {/* ================================================================ */}
        {/* FILTER BAR                                                        */}
        {/* ================================================================ */}
        <div className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeFilter === f.id
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* STORY GRID                                                        */}
        {/* ================================================================ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-16"
          >
            {filtered.map((story) => (
              <StoryCard
                key={story.slug}
                slug={story.slug}
                outlet={story.outlet}
                type={story.type}
                headline={story.headline}
                subheadline={story.subheadline}
                leadStatValue={story.leadStatValue}
                leadStatLabel={story.leadStatLabel}
                leadStatColor={story.leadStatColor}
                estimatedMinutes={story.estimatedMinutes}
                era={story.era}
                onClick={() => navigate(`/stories/${story.slug}`)}
              />
            ))}
            {filtered.length === 0 && (
              <motion.p
                variants={fadeIn}
                className="col-span-full text-center text-zinc-500 py-16"
              >
                No hay historias para este filtro.
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ================================================================ */}
        {/* BOTTOM SECTION                                                    */}
        {/* ================================================================ */}
        <ScrollReveal className="pb-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h3
                  className="text-xl font-bold text-white mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Metodologia y Datos
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                  RUBLI analiza 3 millones de contratos federales (2002-2025) con un modelo de ML
                  entrenado con 347 casos documentados de corrupcion. Codigo abierto, datos verificables.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <button
                  onClick={() => navigate('/methodology')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Ver metodologia
                </button>
                <button
                  onClick={() => navigate('/settings?tab=export')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar datos
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
