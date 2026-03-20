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
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { DataInfographics } from '@/components/ui/DataInfographics'

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
    slug: 'el-granero-vacio',
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
    slug: 'triangulo-farmaceutico',
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
    slug: 'avalancha-diciembre',
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
    slug: 'cartel-del-corazon',
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
    slug: 'oceanografia',
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
    slug: 'sixsigma-hacienda',
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
    slug: 'red-fantasma',
    outlet: 'animal_politico',
    type: 'thematic',
    headline: 'Red Fantasma: Anatomia de una Empresa Inexistente',
    subheadline: 'El SAT confirma 13,960 empresas que facturaron operaciones simuladas al gobierno. Como se construyen, como operan, y como detectarlas.',
    leadStatValue: '13,960',
    leadStatLabel: 'empresas en lista EFOS del SAT — operaciones simuladas confirmadas',
    leadStatColor: '#dc2626',
    estimatedMinutes: 7,
    tags: ['thematic'],
  },
  // 10 new investigative stories
  {
    slug: 'el-ano-sin-excusas',
    outlet: 'animal_politico',
    type: 'year',
    headline: '2023: El Año en que México Rompió Todos los Récords',
    subheadline: 'El último año completo del sexenio registró la tasa más alta de contratos sin licitación en la historia moderna del país: 81.9% del gasto federal.',
    leadStatValue: '81.9%',
    leadStatLabel: 'contratos sin competencia en 2023',
    leadStatColor: '#e6420e',
    estimatedMinutes: 9,
    era: 'AMLO',
    tags: ['AMLO', 'year'],
  },
  {
    slug: 'insabi-el-experimento',
    outlet: 'animal_politico',
    type: 'case',
    headline: 'INSABI: El Experimento que Colapsó el Abasto',
    subheadline: 'La disolución del Seguro Popular desmanteló los mecanismos de competencia en compras de medicamentos, disparando adjudicaciones directas al 94%.',
    leadStatValue: '94%',
    leadStatLabel: 'adjudicaciones directas en compras INSABI',
    leadStatColor: '#dc2626',
    estimatedMinutes: 11,
    era: 'AMLO',
    tags: ['AMLO', 'case', 'salud'],
  },
  {
    slug: 'tren-maya-sin-reglas',
    outlet: 'nyt',
    type: 'case',
    headline: 'Tren Maya: $180 Mil Millones Sin Una Sola Licitación',
    subheadline: 'El proyecto de infraestructura más caro de México evitó las reglas de contratación mediante declaratorias de emergencia y contratos directos a empresas sin experiencia ferroviaria.',
    leadStatValue: '$180B',
    leadStatLabel: 'MXN en contratos sin licitación',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 13,
    era: 'AMLO',
    tags: ['AMLO', 'case', 'infraestructura'],
  },
  {
    slug: 'fabrica-de-monopolios',
    outlet: 'animal_politico',
    type: 'thematic',
    headline: 'La Fábrica de Monopolios',
    subheadline: 'En energía y tecnología, el 10% de los proveedores se quedó con más del 70% del presupuesto. El modelo AMLO repitió el patrón priísta pero a mayor escala.',
    leadStatValue: '70%',
    leadStatLabel: 'del presupuesto a 10% de proveedores',
    leadStatColor: '#e6420e',
    estimatedMinutes: 10,
    era: 'AMLO',
    tags: ['AMLO', 'thematic'],
  },
  {
    slug: 'el-dinero-de-todos',
    outlet: 'wapo',
    type: 'thematic',
    headline: 'El Dinero de Todos: Cómo la Contratación se Concentró en Pocas Manos',
    subheadline: 'En dos décadas, el gasto federal mexicano pasó de una competencia amplia a un oligopolio. El análisis de RUBLI sobre 3.1 millones de contratos revela un estrechamiento sistemático de quién se beneficia.',
    leadStatValue: '1,253',
    leadStatLabel: 'proveedores con riesgo crítico',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 12,
    tags: ['thematic'],
  },
  {
    slug: 'pandemia-sin-supervision',
    outlet: 'animal_politico',
    type: 'case',
    headline: 'Pandemia Sin Supervisión',
    subheadline: 'México gastó más de 40,000 millones en compras COVID sin licitación. El 73% fue a empresas creadas menos de dos años antes de recibir el contrato.',
    leadStatValue: '73%',
    leadStatLabel: 'a empresas recién creadas',
    leadStatColor: '#dc2626',
    estimatedMinutes: 10,
    era: 'AMLO',
    tags: ['AMLO', 'case', 'salud'],
  },
  {
    slug: 'pemex-el-gigante',
    outlet: 'nyt',
    type: 'case',
    headline: 'PEMEX Nunca Compite: El Agujero Negro de $2 Billones',
    subheadline: 'PEMEX y CFE concentran el 40% de la contratación federal pero menos del 5% es competitiva. Veinte años de datos muestran que el patrón precedió a AMLO — y lo sobrevivió.',
    leadStatValue: '$2T',
    leadStatLabel: 'MXN en compras energéticas sin competencia',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 14,
    tags: ['case'],
  },
  {
    slug: 'atlas-del-riesgo',
    outlet: 'animal_politico',
    type: 'thematic',
    headline: 'Atlas del Riesgo: Los Sectores Donde la Corrupción Deja Más Huellas',
    subheadline: 'El modelo RUBLI identifica 118,061 contratos con señales de alerta crítica. Salud y agricultura concentran el riesgo más alto, pero infraestructura suma los mayores montos.',
    leadStatValue: '118,061',
    leadStatLabel: 'contratos en nivel crítico de riesgo (v6.4, umbral ≥0.60)',
    leadStatColor: '#dc2626',
    estimatedMinutes: 8,
    tags: ['thematic', 'salud', 'infraestructura'],
  },
  {
    slug: 'la-herencia-envenenada',
    outlet: 'animal_politico',
    type: 'era',
    headline: 'La Herencia Envenenada: Lo que AMLO Dejó en las Finanzas Públicas',
    subheadline: 'El sexenio concluyó con tasas históricas de contratación directa, 247,946 contratos sospechosos de fraccionamiento y una deuda de transparencia que tomará años resolver.',
    leadStatValue: '505,219',
    leadStatLabel: 'contratos licitados en solitario',
    leadStatColor: '#e6420e',
    estimatedMinutes: 10,
    era: 'AMLO',
    tags: ['AMLO', 'era'],
  },
  {
    slug: 'dividir-para-evadir',
    outlet: 'nyt',
    type: 'thematic',
    headline: 'Dividir para Evadir: 247,946 Contratos Diseñados para Burlar el Escrutinio',
    subheadline: 'La ley exige licitación pública por encima de ciertos umbrales. El análisis de RUBLI encontró 247,946 contratos agrupados justo por debajo de esos límites — un patrón estadísticamente improbable por azar.',
    leadStatValue: '247,946',
    leadStatLabel: 'contratos con fraccionamiento sospechoso',
    leadStatColor: '#1e3a5f',
    estimatedMinutes: 11,
    tags: ['thematic'],
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

        {/* Editorial masthead */}
        <div className="pt-12 sm:pt-16">
          <EditorialHeadline
            section="PARA PERIODISTAS"
            headline="Herramientas de Investigaci&oacute;n"
            subtitle="Datos, metodolog&iacute;a y gu&iacute;as para periodistas de investigaci&oacute;n"
            className="mb-4"
          />
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <FuentePill source="COMPRANET" count={3051294} countLabel="contratos" verified={true} />
            <FuentePill source="SAT EFOS" count={13960} countLabel="empresas fantasma" />
          </div>
        </div>

        {/* ================================================================ */}
        {/* HERO SECTION                                                      */}
        {/* ================================================================ */}
        <motion.section
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="pb-10 sm:pb-14"
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
            Datos. Patrones. Pistas.
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
        {/* INFOGRAPHICS GALLERY                                              */}
        {/* ================================================================ */}
        <DataInfographics />

        {/* ================================================================ */}
        {/* BOTTOM SECTION                                                    */}
        {/* ================================================================ */}
        <ScrollReveal className="pb-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h3
                  className="text-xl font-bold text-white mb-2 flex items-center gap-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Metodologia y Datos
                  <MetodologiaTooltip
                    title="Modelo de riesgo v6.4"
                    body="Regresi&oacute;n log&iacute;stica con 16 z-scores, 13 sub-modelos sectoriales, AUC=0.840. Entrenado con 347 casos documentados de corrupci&oacute;n. PU-learning (Elkan &amp; Noto 2008)."
                    link="/methodology"
                  />
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
