import { useQuery } from '@tanstack/react-query'
import { storiesApi } from '@/api/client'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, Download } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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

type TFunction = ReturnType<typeof useTranslation<'journalists'>>['t']

function getStories(t: TFunction): StoryDef[] {
  return [
    // Row 1 — AMLO themed
    {
      slug: 'la-cuarta-adjudicacion',
      outlet: 'data_analysis',
      type: 'era',
      headline: t('stories.la-cuarta-adjudicacion.headline'),
      subheadline: t('stories.la-cuarta-adjudicacion.subheadline'),
      leadStatValue: '81.9%',
      leadStatLabel: t('stories.la-cuarta-adjudicacion.statLabel'),
      leadStatColor: '#dc2626',
      estimatedMinutes: 12,
      era: 'AMLO',
      tags: ['AMLO', 'era'],
    },
    {
      slug: 'el-granero-vacio',
      outlet: 'investigative',
      type: 'case',
      headline: t('stories.el-granero-vacio.headline'),
      subheadline: t('stories.el-granero-vacio.subheadline'),
      leadStatValue: '15',
      leadStatLabel: t('stories.el-granero-vacio.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 15,
      era: 'AMLO',
      tags: ['AMLO', 'case'],
    },
    {
      slug: 'los-nuevos-ricos-de-la-4t',
      outlet: 'data_analysis',
      type: 'thematic',
      headline: t('stories.los-nuevos-ricos-de-la-4t.headline'),
      subheadline: t('stories.los-nuevos-ricos-de-la-4t.subheadline'),
      leadStatValue: '1,253',
      leadStatLabel: t('stories.los-nuevos-ricos-de-la-4t.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 10,
      era: 'AMLO',
      tags: ['AMLO', 'thematic'],
    },
    // Row 2 — AMLO continued + Cross-era
    {
      slug: 'hemoser-el-2-de-agosto',
      outlet: 'data_analysis',
      type: 'case',
      headline: t('stories.hemoser-el-2-de-agosto.headline'),
      subheadline: t('stories.hemoser-el-2-de-agosto.subheadline'),
      leadStatValue: '17.2',
      leadStatLabel: t('stories.hemoser-el-2-de-agosto.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 8,
      era: 'AMLO',
      tags: ['AMLO', 'case', 'salud'],
    },
    {
      slug: 'la-austeridad-que-no-fue',
      outlet: 'longform',
      type: 'era',
      headline: t('stories.la-austeridad-que-no-fue.headline'),
      subheadline: t('stories.la-austeridad-que-no-fue.subheadline'),
      leadStatValue: '80.0%',
      leadStatLabel: t('stories.la-austeridad-que-no-fue.statLabel'),
      leadStatColor: '#71717a',
      estimatedMinutes: 14,
      era: 'AMLO',
      tags: ['AMLO', 'era'],
    },
    {
      slug: 'cero-competencia',
      outlet: 'longform',
      type: 'thematic',
      headline: t('stories.cero-competencia.headline'),
      subheadline: t('stories.cero-competencia.subheadline'),
      leadStatValue: '505,219',
      leadStatLabel: t('stories.cero-competencia.statLabel'),
      leadStatColor: '#71717a',
      estimatedMinutes: 11,
      tags: ['thematic'],
    },
    // Row 3 — Cross-era + Cases
    {
      slug: 'triangulo-farmaceutico',
      outlet: 'investigative',
      type: 'thematic',
      headline: t('stories.triangulo-farmaceutico.headline'),
      subheadline: t('stories.triangulo-farmaceutico.subheadline'),
      leadStatValue: '270',
      leadStatLabel: t('stories.triangulo-farmaceutico.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 13,
      tags: ['thematic', 'salud'],
    },
    {
      slug: 'avalancha-diciembre',
      outlet: 'longform',
      type: 'thematic',
      headline: t('stories.avalancha-diciembre.headline'),
      subheadline: t('stories.avalancha-diciembre.subheadline'),
      leadStatValue: '57.5',
      leadStatLabel: t('stories.avalancha-diciembre.statLabel'),
      leadStatColor: '#71717a',
      estimatedMinutes: 9,
      tags: ['thematic'],
    },
    {
      slug: 'cartel-del-corazon',
      outlet: 'investigative',
      type: 'case',
      headline: t('stories.cartel-del-corazon.headline'),
      subheadline: t('stories.cartel-del-corazon.subheadline'),
      leadStatValue: '50',
      leadStatLabel: t('stories.cartel-del-corazon.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 12,
      tags: ['case', 'salud'],
    },
    // Row 4 — Infrastructure + PEN
    {
      slug: 'infraestructura-sin-competencia',
      outlet: 'longform',
      type: 'thematic',
      headline: t('stories.infraestructura-sin-competencia.headline'),
      subheadline: t('stories.infraestructura-sin-competencia.subheadline'),
      leadStatValue: '2.1',
      leadStatLabel: t('stories.infraestructura-sin-competencia.statLabel'),
      leadStatColor: '#71717a',
      estimatedMinutes: 14,
      tags: ['thematic', 'infraestructura'],
    },
    {
      slug: 'la-casa-de-los-contratos',
      outlet: 'data_analysis',
      type: 'era',
      headline: t('stories.la-casa-de-los-contratos.headline'),
      subheadline: t('stories.la-casa-de-los-contratos.subheadline'),
      leadStatValue: '85',
      leadStatLabel: t('stories.la-casa-de-los-contratos.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 16,
      era: 'Pena Nieto',
      tags: ['Pena Nieto', 'era', 'infraestructura'],
    },
    {
      slug: 'oceanografia',
      outlet: 'investigative',
      type: 'case',
      headline: t('stories.oceanografia.headline'),
      subheadline: t('stories.oceanografia.subheadline'),
      leadStatValue: '22.4',
      leadStatLabel: t('stories.oceanografia.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 15,
      era: 'Pena Nieto',
      tags: ['Pena Nieto', 'case'],
    },
    // Row 5 — Systemic
    {
      slug: 'sixsigma-hacienda',
      outlet: 'data_analysis',
      type: 'case',
      headline: t('stories.sixsigma-hacienda.headline'),
      subheadline: t('stories.sixsigma-hacienda.subheadline'),
      leadStatValue: '27',
      leadStatLabel: t('stories.sixsigma-hacienda.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 10,
      tags: ['case'],
    },
    {
      slug: 'sexenio-a-sexenio',
      outlet: 'longform',
      type: 'era',
      headline: t('stories.sexenio-a-sexenio.headline'),
      subheadline: t('stories.sexenio-a-sexenio.subheadline'),
      leadStatValue: '82%',
      leadStatLabel: t('stories.sexenio-a-sexenio.statLabel'),
      leadStatColor: '#71717a',
      estimatedMinutes: 18,
      tags: ['era'],
    },
    {
      slug: 'red-fantasma',
      outlet: 'data_analysis',
      type: 'thematic',
      headline: t('stories.red-fantasma.headline'),
      subheadline: t('stories.red-fantasma.subheadline'),
      leadStatValue: '13,960',
      leadStatLabel: t('stories.red-fantasma.statLabel'),
      leadStatColor: '#dc2626',
      estimatedMinutes: 7,
      tags: ['thematic'],
    },
    // 10 new investigative stories
    {
      slug: 'el-ano-sin-excusas',
      outlet: 'data_analysis',
      type: 'year',
      headline: t('stories.el-ano-sin-excusas.headline'),
      subheadline: t('stories.el-ano-sin-excusas.subheadline'),
      leadStatValue: '81.9%',
      leadStatLabel: t('stories.el-ano-sin-excusas.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 9,
      era: 'AMLO',
      tags: ['AMLO', 'year'],
    },
    {
      slug: 'insabi-el-experimento',
      outlet: 'data_analysis',
      type: 'case',
      headline: t('stories.insabi-el-experimento.headline'),
      subheadline: t('stories.insabi-el-experimento.subheadline'),
      leadStatValue: '94%',
      leadStatLabel: t('stories.insabi-el-experimento.statLabel'),
      leadStatColor: '#dc2626',
      estimatedMinutes: 11,
      era: 'AMLO',
      tags: ['AMLO', 'case', 'salud'],
    },
    {
      slug: 'tren-maya-sin-reglas',
      outlet: 'longform',
      type: 'case',
      headline: t('stories.tren-maya-sin-reglas.headline'),
      subheadline: t('stories.tren-maya-sin-reglas.subheadline'),
      leadStatValue: '$180B',
      leadStatLabel: t('stories.tren-maya-sin-reglas.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 13,
      era: 'AMLO',
      tags: ['AMLO', 'case', 'infraestructura'],
    },
    {
      slug: 'fabrica-de-monopolios',
      outlet: 'data_analysis',
      type: 'thematic',
      headline: t('stories.fabrica-de-monopolios.headline'),
      subheadline: t('stories.fabrica-de-monopolios.subheadline'),
      leadStatValue: '70%',
      leadStatLabel: t('stories.fabrica-de-monopolios.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 10,
      era: 'AMLO',
      tags: ['AMLO', 'thematic'],
    },
    {
      slug: 'el-dinero-de-todos',
      outlet: 'investigative',
      type: 'thematic',
      headline: t('stories.el-dinero-de-todos.headline'),
      subheadline: t('stories.el-dinero-de-todos.subheadline'),
      leadStatValue: '1,253',
      leadStatLabel: t('stories.el-dinero-de-todos.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 12,
      tags: ['thematic'],
    },
    {
      slug: 'pandemia-sin-supervision',
      outlet: 'data_analysis',
      type: 'case',
      headline: t('stories.pandemia-sin-supervision.headline'),
      subheadline: t('stories.pandemia-sin-supervision.subheadline'),
      leadStatValue: '73%',
      leadStatLabel: t('stories.pandemia-sin-supervision.statLabel'),
      leadStatColor: '#dc2626',
      estimatedMinutes: 10,
      era: 'AMLO',
      tags: ['AMLO', 'case', 'salud'],
    },
    {
      slug: 'pemex-el-gigante',
      outlet: 'longform',
      type: 'case',
      headline: t('stories.pemex-el-gigante.headline'),
      subheadline: t('stories.pemex-el-gigante.subheadline'),
      leadStatValue: '$2T',
      leadStatLabel: t('stories.pemex-el-gigante.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 14,
      tags: ['case'],
    },
    {
      slug: 'atlas-del-riesgo',
      outlet: 'data_analysis',
      type: 'thematic',
      headline: t('stories.atlas-del-riesgo.headline'),
      subheadline: t('stories.atlas-del-riesgo.subheadline'),
      leadStatValue: '118,061',
      leadStatLabel: t('stories.atlas-del-riesgo.statLabel'),
      leadStatColor: '#dc2626',
      estimatedMinutes: 8,
      tags: ['thematic', 'salud', 'infraestructura'],
    },
    {
      slug: 'la-herencia-envenenada',
      outlet: 'data_analysis',
      type: 'era',
      headline: t('stories.la-herencia-envenenada.headline'),
      subheadline: t('stories.la-herencia-envenenada.subheadline'),
      leadStatValue: '505,219',
      leadStatLabel: t('stories.la-herencia-envenenada.statLabel'),
      leadStatColor: '#e6420e',
      estimatedMinutes: 10,
      era: 'AMLO',
      tags: ['AMLO', 'era'],
    },
    {
      slug: 'dividir-para-evadir',
      outlet: 'longform',
      type: 'thematic',
      headline: t('stories.dividir-para-evadir.headline'),
      subheadline: t('stories.dividir-para-evadir.subheadline'),
      leadStatValue: '247,946',
      leadStatLabel: t('stories.dividir-para-evadir.statLabel'),
      leadStatColor: '#1e3a5f',
      estimatedMinutes: 11,
      tags: ['thematic'],
    },
    // New COMPRANET story
    {
      slug: 'la-maquina-de-papel',
      outlet: 'longform',
      type: 'thematic',
      headline: t('stories.la-maquina-de-papel.headline'),
      subheadline: t('stories.la-maquina-de-papel.subheadline'),
      leadStatValue: '23',
      leadStatLabel: t('stories.la-maquina-de-papel.statLabel'),
      leadStatColor: '#3b82f6',
      estimatedMinutes: 16,
      tags: ['thematic'],
    },
  ]
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

interface FilterDef {
  id: string
  labelKey: string
  match: (s: StoryDef) => boolean
}

const FILTERS: FilterDef[] = [
  { id: 'all', labelKey: 'filters.all', match: () => true },
  { id: 'amlo', labelKey: 'filters.amlo', match: (s) => s.tags.includes('AMLO') },
  { id: 'pena', labelKey: 'filters.pena', match: (s) => s.tags.includes('Pena Nieto') },
  { id: 'salud', labelKey: 'filters.salud', match: (s) => s.tags.includes('salud') },
  { id: 'infra', labelKey: 'filters.infra', match: (s) => s.tags.includes('infraestructura') },
  { id: 'case', labelKey: 'filters.case', match: (s) => s.type === 'case' },
  { id: 'thematic', labelKey: 'filters.thematic', match: (s) => s.type === 'thematic' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Journalists() {
  const { t } = useTranslation('journalists')
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
  const totalCases = 748

  // Build stories array with translations
  const stories = useMemo(() => getStories(t), [t])

  // Filtered stories
  const currentFilter = FILTERS.find((f) => f.id === activeFilter) ?? FILTERS[0]
  const filtered = useMemo(
    () => stories.filter(currentFilter.match),
    [stories, activeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const featured = stories[0] // "La Cuarta Adjudicacion"

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Editorial masthead — single unified header */}
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="pt-12 sm:pt-16 pb-10 sm:pb-14"
        >
          <EditorialHeadline
            section={t('masthead.section')}
            headline={t('masthead.headline')}
            subtitle={t('masthead.subtitle')}
            className="mb-4"
          />
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <FuentePill source="COMPRANET" count={3051294} countLabel={t('masthead.compranetLabel')} verified={true} />
            <FuentePill source="SAT EFOS" count={13960} countLabel={t('masthead.satEfosLabel')} />
          </div>
          <p className="text-xs text-zinc-500 mb-8">
            {t('masthead.lastUpdated')}
          </p>

          {/* Stat row — key numbers surface in the header, not a separate hero */}
          <div className="flex flex-wrap gap-8 sm:gap-12 mb-8">
            <div>
              <AnimatedNumber
                value={totalContracts}
                duration={2000}
                className="text-3xl sm:text-4xl font-black text-white tabular-nums"
              />
              <p className="text-sm text-zinc-500 mt-1">{t('hero.contractsLabel')}</p>
            </div>
            <div>
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                <AnimatedNumber value={totalValueBillions} decimals={2} prefix="$" suffix="T" duration={1800} />
              </span>
              <p className="text-sm text-zinc-500 mt-1">{t('hero.valueLabel')}</p>
            </div>
            <div>
              <AnimatedNumber
                value={totalCases}
                duration={1600}
                className="text-3xl sm:text-4xl font-black text-white tabular-nums"
              />
              <p className="text-sm text-zinc-500 mt-1">{t('hero.casesLabel')}</p>
            </div>
          </div>

          {/* Crimson divider */}
          <div className="h-[2px] w-24 bg-[#dc2626]" />
        </motion.div>

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
                    {t('featured.label')}
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
                  {t('featured.readMore')} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
                  {t('featured.statSuffix')}
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
              {t(f.labelKey)}
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
                {t('grid.noStories')}
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
                  {t('methodology.title')}
                  <MetodologiaTooltip
                    title={t('methodology.tooltipTitle')}
                    body={t('methodology.tooltipBody')}
                    link="/methodology"
                  />
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                  {t('methodology.description')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <button
                  onClick={() => navigate('/methodology')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('methodology.viewMethodology')}
                </button>
                <button
                  onClick={() => navigate('/settings?tab=export')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('methodology.downloadData')}
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
