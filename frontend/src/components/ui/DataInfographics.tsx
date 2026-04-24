import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, BarChart2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Infographic {
  id: string
  src: string
  title_es: string
  title_en: string
  caption_es: string
  caption_en: string
  source: string
  tag_es: string
  tag_en: string
  tagColor: string
}

const INFOGRAPHICS: Infographic[] = [
  {
    id: 'da-trend',
    src: '/infographics/da-trend.svg',
    title_es: 'Adjudicación Directa: 23 Años de Opacidad',
    title_en: 'Direct Award: 23 Years of Opacity',
    caption_es:
      'La tasa de adjudicación directa en México ha crecido de 62% (2002) a 80% (2024), triplicando el límite recomendado por la OCDE del 25%. El pico fue en 2020 con 85%, en plena pandemia.',
    caption_en:
      'Mexico\'s direct award rate has grown from 62% (2002) to 80% (2024), tripling the OECD-recommended 25% limit. The peak was 85% in 2020, during the pandemic.',
    source: 'RUBLI · COMPRANET 2002–2024 · OECD Public Procurement Report 2023',
    tag_es: 'Adjudicación',
    tag_en: 'Direct Award',
    tagColor: '#5070dd',
  },
  {
    id: 'da-by-sector',
    src: '/infographics/da-by-sector.svg',
    title_es: 'Todos los Sectores Rebasan el Límite OCDE',
    title_en: 'Every Sector Exceeds the OECD Threshold',
    caption_es:
      'Ningún sector federal cumple el estándar OCDE del 25%. Agricultura lidera con 93.4% de contratos sin licitación. Incluso Energía, con el menor porcentaje, triplica el umbral internacional.',
    caption_en:
      'No federal sector meets the 25% OECD standard. Agriculture leads with 93.4% of contracts awarded without bidding. Even Energy, with the lowest rate, triples the international threshold.',
    source: 'RUBLI · COMPRANET 2002–2024 · 3,051,294 contracts analyzed',
    tag_es: 'Sectores',
    tag_en: 'Sectors',
    tagColor: '#eab308',
  },
  {
    id: 'risk-distribution',
    src: '/infographics/risk-distribution.svg',
    title_es: 'Distribución de Riesgo: 412,845 Contratos Críticos',
    title_en: 'Risk Distribution: 412,845 Critical Contracts',
    caption_es:
      'De 3.05 millones de contratos federales, 412,845 (13.49%) presentan patrones de alto o crítico riesgo de corrupción según el modelo RUBLI v0.6.5 — entrenado con 748 casos documentados.',
    caption_en:
      'Of 3.05 million federal contracts, 412,845 (13.49%) show high or critical corruption risk patterns per the RUBLI v0.6.5 model — trained on 748 documented cases.',
    source: 'RUBLI v0.6.5 · AUC=0.828 · HR=13.49% (OECD 2–15% compliant)',
    tag_es: 'Modelo de Riesgo',
    tag_en: 'Risk Model',
    tagColor: '#f87171',
  },
  {
    id: 'sexenio-comparison',
    src: '/infographics/sexenio-comparison.svg',
    title_es: 'De Fox a AMLO: La Opacidad Aumentó Cada Sexenio',
    title_en: 'From Fox to AMLO: Opacity Rose with Every Administration',
    caption_es:
      'Cada gobierno federal ha incrementado el uso de adjudicaciones directas. AMLO alcanzó 82.1%, el nivel más alto registrado — 57 puntos porcentuales por encima del estándar OCDE.',
    caption_en:
      'Every federal administration has increased direct award usage. AMLO reached 82.1%, the highest on record — 57 percentage points above the OECD standard.',
    source: 'RUBLI · COMPRANET 2002–2024 · Fox, Calderón, Peña Nieto, AMLO',
    tag_es: 'Sexenios',
    tag_en: 'Administrations',
    tagColor: '#dc2626',
  },
  {
    id: 'single-bid-sector',
    src: '/infographics/single-bid-sector.svg',
    title_es: 'Un Solo Postor: La Competencia que No Existe',
    title_en: 'Single Bidder: The Competition That Never Happened',
    caption_es:
      'Los contratos con un único participante en licitaciones formales suman más de 1.1 millones. Infraestructura lidera con 196,540 — el mayor indicador de colusión y restricción de competencia.',
    caption_en:
      'Contracts with a single participant in formal tenders total over 1.1 million. Infrastructure leads with 196,540 — the strongest indicator of collusion and restricted competition.',
    source: 'RUBLI · COMPRANET 2002–2024 · Tendered contracts with only 1 bidder',
    tag_es: 'Competencia',
    tag_en: 'Competition',
    tagColor: '#ea580c',
  },
  {
    id: 'high-risk-trend',
    src: '/infographics/high-risk-trend.svg',
    title_es: 'El Pico de Riesgo: 2020 y la Pandemia',
    title_en: 'The Risk Peak: 2020 and the Pandemic',
    caption_es:
      '2020 marcó el máximo histórico con 18.2% de contratos de alto riesgo — superando el umbral OCDE del 15%. Las compras de emergencia por COVID-19 dispararon patrones anómalos. Desde 2021 hay descenso, llegando a 9.2% en 2024.',
    caption_en:
      '2020 set the all-time record with 18.2% high-risk contracts — exceeding the 15% OECD threshold. COVID-19 emergency procurement triggered anomalous patterns. Since 2021, the rate has declined to 9.2% in 2024.',
    source: 'RUBLI v0.6.5 · Contracts rated high or critical risk 2013–2024',
    tag_es: 'Tendencia',
    tag_en: 'Trend',
    tagColor: '#10b981',
  },
]

export function DataInfographics() {
  const { t, i18n } = useTranslation('common')
  const [active, setActive] = useState(0)
  const current = INFOGRAPHICS[active]
  const isEs = i18n.language.startsWith('es')
  const title = isEs ? current.title_es : current.title_en
  const caption = isEs ? current.caption_es : current.caption_en
  const tag = isEs ? current.tag_es : current.tag_en

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
              className="text-xl font-bold text-text-primary"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('infographics.sectionTitle')}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t('infographics.sectionSubtitle')}
            </p>
          </div>
        </div>
        <span className="text-xs text-text-muted font-mono tabular-nums">
          {active + 1} / {INFOGRAPHICS.length}
        </span>
      </div>

      {/* Main viewer */}
      <div className="rounded-sm border border-border bg-background-card overflow-hidden">
        {/* Chart area */}
        <div className="relative bg-background-elevated min-h-[340px] flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.src}
              alt={title}
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
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background-elevated border border-border hover:bg-background-elevated transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background-elevated border border-border hover:bg-background-elevated transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Caption area */}
        <div className="p-6 border-t border-border">
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
                      {tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-2">{title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{caption}</p>
                  <p className="text-xs text-text-muted mt-3 font-mono">
                    {t('infographics.source')}: {current.source}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-text-secondary hover:bg-background-elevated hover:text-text-primary transition-colors"
                  title={`${t('infographics.download')} SVG`}
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
                : 'border-border opacity-50 hover:opacity-75 hover:border-border'
            }`}
          >
            <img
              src={inf.src}
              alt={isEs ? inf.title_es : inf.title_en}
              className="w-full h-full object-cover bg-background-elevated"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
