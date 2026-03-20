import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, BarChart2 } from 'lucide-react'

interface Infographic {
  id: string
  src: string
  title: string
  caption: string
  source: string
  tag: string
  tagColor: string
}

const INFOGRAPHICS: Infographic[] = [
  {
    id: 'da-trend',
    src: '/infographics/da-trend.svg',
    title: 'Adjudicación Directa: 23 Años de Opacidad',
    caption:
      'La tasa de adjudicación directa en México ha crecido de 62% (2002) a 80% (2024), triplicando el límite recomendado por la OCDE del 25%. El pico fue en 2020 con 85%, en plena pandemia.',
    source: 'RUBLI · COMPRANET 2002–2024 · OCDE Public Procurement Report 2023',
    tag: 'Adjudicación',
    tagColor: '#5070dd',
  },
  {
    id: 'da-by-sector',
    src: '/infographics/da-by-sector.svg',
    title: 'Todos los Sectores Rebasan el Límite OCDE',
    caption:
      'Ningún sector federal cumple el estándar OCDE del 25%. Agricultura lidera con 93.4% de contratos sin licitación. Incluso Energía, con el menor porcentaje, triplica el umbral internacional.',
    source: 'RUBLI · COMPRANET 2002–2024 · 3,051,294 contratos analizados',
    tag: 'Sectores',
    tagColor: '#eab308',
  },
  {
    id: 'risk-distribution',
    src: '/infographics/risk-distribution.svg',
    title: 'Distribución de Riesgo: 281,615 Contratos Críticos',
    caption:
      'De 3.05 millones de contratos federales, 281,615 (9.2%) presentan patrones de alto o crítico riesgo de corrupción según el modelo RUBLI v6.4 — entrenado con 347 casos documentados.',
    source: 'RUBLI v6.4 · AUC=0.840 · HR=9.2% (cumple OCDE 2–15%)',
    tag: 'Modelo de Riesgo',
    tagColor: '#f87171',
  },
  {
    id: 'sexenio-comparison',
    src: '/infographics/sexenio-comparison.svg',
    title: 'De Fox a AMLO: La Opacidad Aumentó Cada Sexenio',
    caption:
      'Cada gobierno federal ha incrementado el uso de adjudicaciones directas. AMLO alcanzó 82.1%, el nivel más alto registrado — 57 puntos porcentuales por encima del estándar OCDE.',
    source: 'RUBLI · COMPRANET 2002–2024 · Fox, Calderón, Peña Nieto, AMLO',
    tag: 'Sexenios',
    tagColor: '#dc2626',
  },
  {
    id: 'single-bid-sector',
    src: '/infographics/single-bid-sector.svg',
    title: 'Un Solo Postor: La Competencia que No Existe',
    caption:
      'Los contratos con un único participante en licitaciones formales suman más de 1.1 millones. Infraestructura lidera con 196,540 — el mayor indicador de colusión y restricción de competencia.',
    source: 'RUBLI · COMPRANET 2002–2024 · Contratos licitados con solo 1 postor',
    tag: 'Competencia',
    tagColor: '#ea580c',
  },
  {
    id: 'high-risk-trend',
    src: '/infographics/high-risk-trend.svg',
    title: 'El Pico de Riesgo: 2020 y la Pandemia',
    caption:
      '2020 marcó el máximo histórico con 18.2% de contratos de alto riesgo — superando el umbral OCDE del 15%. Las compras de emergencia por COVID-19 dispararon patrones anómalos. Desde 2021 hay descenso, llegando a 9.2% en 2024.',
    source: 'RUBLI v6.4 · Contratos clasificados como alto o crítico riesgo 2013–2024',
    tag: 'Tendencia',
    tagColor: '#10b981',
  },
]

export function DataInfographics() {
  const [active, setActive] = useState(0)
  const current = INFOGRAPHICS[active]

  const prev = () => setActive(i => (i === 0 ? INFOGRAPHICS.length - 1 : i - 1))
  const next = () => setActive(i => (i === INFOGRAPHICS.length - 1 ? 0 : i + 1))

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = current.src
    a.download = `rubli-infografico-${current.id}.svg`
    a.click()
  }

  return (
    <section className="mt-16 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#dc2626]/10 border border-[#dc2626]/20">
            <BarChart2 className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h2
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Infografías para Publicación
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Datos verificados · Descarga libre · Cita: RUBLI / COMPRANET
            </p>
          </div>
        </div>
        <span className="text-xs text-zinc-600 tabular-nums">
          {active + 1} / {INFOGRAPHICS.length}
        </span>
      </div>

      {/* Main viewer */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        {/* Chart area */}
        <div className="relative bg-[#040810] min-h-[340px] flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.src}
              alt={current.title}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="max-w-full max-h-[480px] w-full object-contain"
            />
          </AnimatePresence>

          {/* Nav arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-300" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5 text-zinc-300" />
          </button>
        </div>

        {/* Caption area */}
        <div className="p-6 border-t border-zinc-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + '-caption'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: current.tagColor + '22',
                        color: current.tagColor,
                        border: `1px solid ${current.tagColor}44`,
                      }}
                    >
                      {current.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{current.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{current.caption}</p>
                  <p className="text-xs text-zinc-600 mt-3 font-mono">
                    Fuente: {current.source}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  title="Descargar SVG"
                >
                  <Download className="h-3.5 w-3.5" />
                  SVG
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {INFOGRAPHICS.map((inf, i) => (
          <button
            key={inf.id}
            onClick={() => setActive(i)}
            className={`flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden border transition-all ${
              i === active
                ? 'border-[#dc2626] opacity-100 scale-100'
                : 'border-zinc-800 opacity-50 hover:opacity-75 hover:border-zinc-600'
            }`}
          >
            <img
              src={inf.src}
              alt={inf.title}
              className="w-full h-full object-cover bg-[#040810]"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
