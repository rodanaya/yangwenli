/**
 * ChapterTiles — the dashboard's «Headline numbers» (Folio·V): four chapter
 * tiles read left-to-right as one argument (spend → bypass → flag → catch).
 * Each column is a chapter rail (Roman + rule + kicker) above a tile that is
 * the chapter's story link, with its own micro-viz.
 *
 * Module-level components (PARALLAX D10 § Change 8): declared inside the
 * page's render they remounted — and replayed their entrance motion — on
 * every page render.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RISK_COLORS, RISK_INK_ON_PLATE, RISK_TEXT_COLORS } from '@/lib/constants'

// Chapter-marker rail: one Roman per step, sitting above the tile. Each
// marker carries the tile's accent (marks) and its AA ink (type) so the eye
// can map marker → tile at a glance.
type Step = {
  roman: string
  accent: string // marks: the rail rule + drop-line
  ink: string    // type: the Roman + kicker (AA on the paper)
  kicker: { en: string; es: string }
  tail: { en: string; es: string } | null
  story: string
  ariaLabel: { en: string; es: string }
}

const STEPS: Step[] = [
  {
    roman: 'I',
    accent: '#a06820',
    ink: 'var(--color-accent-hover)',
    kicker: { en: 'The spend', es: 'El gasto' },
    tail:   { en: 'of which —', es: 'del cual —' },
    story: '/stories/el-gran-precio',
    ariaLabel: { en: 'Chapter I, The Spend — Read: The Bigger the Contract the Higher the Risk', es: 'Capítulo I, El gasto — Leer: A Mayor Contrato, Mayor Riesgo' },
  },
  {
    roman: 'II',
    accent: '#dc2626',
    ink: RISK_TEXT_COLORS.critical,
    kicker: { en: 'The bypass', es: 'El desvío' },
    tail:   { en: 'inside that bypass —', es: 'dentro de ese desvío —' },
    story: '/stories/marea-de-adjudicaciones',
    ariaLabel: { en: 'Chapter II, The Bypass — Read: The Direct Award Tide', es: 'Capítulo II, El desvío — Leer: La Marea de las Adjudicaciones' },
  },
  {
    roman: 'III',
    accent: '#f59e0b',
    ink: RISK_INK_ON_PLATE.high, // the rail sits on the plate paper
    kicker: { en: 'The flag', es: 'La marca' },
    tail:   { en: 'and the catch —', es: 'y la captura —' },
    story: '/stories/el-sexenio-del-riesgo',
    ariaLabel: { en: 'Chapter III, The Flag — Read: The Era of Risk', es: 'Capítulo III, La marca — Leer: El Sexenio del Riesgo' },
  },
  {
    roman: 'IV',
    accent: 'var(--color-text-primary)',
    ink: 'var(--color-text-primary)',
    kicker: { en: 'The catch', es: 'La captura' },
    tail: null,
    story: '/stories/volatilidad-el-precio-del-riesgo',
    ariaLabel: { en: 'Chapter IV, The Catch — Read: Price Volatility — The Algorithm\'s Smoking Gun', es: 'Capítulo IV, La captura — Leer: Volatilidad — El Precio del Riesgo' },
  },
]

// Shared tile chrome — a single panel with the accent moved to the
// chapter rail above, not the tile's left edge. The bottom hairline
// unifies the row visually.
const tileBase =
  'relative block group p-5 pt-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1'

function ChapterRail({ step, delay, lang }: { step: Step; delay: number; lang: 'en' | 'es' }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-baseline gap-2.5">
        <span
          className="leading-none tabular-nums"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'normal',
            fontWeight: 800,
            fontSize: 22,
            color: step.ink,
          }}
        >
          {step.roman}
        </span>
        <span className="h-[2px] flex-1" style={{ background: step.accent, opacity: 0.55 }} />
        <span className="text-[13px] font-mono uppercase tracking-[0.18em] whitespace-nowrap" style={{ color: step.ink }}>
          {lang === 'en' ? step.kicker.en : step.kicker.es}
        </span>
      </div>
    </motion.div>
  )
}

// Each "column": the chapter rail above, the tile (the chapter's story link)
// below, sharing one width.
function ColumnFrame({ children, step, ariaLabel, lang }: {
  children: ReactNode
  step: Step
  ariaLabel: string
  lang: 'en' | 'es'
}) {
  return (
    <div className="relative flex flex-col">
      <ChapterRail step={step} lang={lang} delay={0.05 + STEPS.indexOf(step) * 0.06} />
      <Link
        to={step.story}
        data-tile={step.roman}
        className={`${tileBase} surface-card rounded-sm mt-2`}
        aria-label={ariaLabel}
      >
        {/* drop-line fusing chapter rail to tile (lg only — on stacked
            layouts the rail already sits flush above) */}
        <span
          className="hidden lg:block absolute -top-2 left-0 w-[2px] h-2"
          style={{ background: step.accent, opacity: 0.55 }}
          aria-hidden="true"
        />
        {children}
      </Link>
    </div>
  )
}

export interface ChapterTilesStats {
  highCriticalCount: number
  highCriticalRate: number
  valueAtRisk: number
  valueAtRiskPct: number
}

export function ChapterTiles({ lang, stats, headlineSpend, headlineSpendUSD }: {
  lang: 'en' | 'es'
  stats: ChapterTilesStats
  headlineSpend: string
  headlineSpendUSD: string | null
}) {
  const spendCurrencyLabel = 'MXN'
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">

      {/* Chapter I — The Spend */}
      <ColumnFrame
        lang={lang}
        step={STEPS[0]}
        ariaLabel={lang === 'en' ? STEPS[0].ariaLabel.en : STEPS[0].ariaLabel.es}
      >
        <div
          className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'normal',
            fontSize: 48,
            color: '#a06820',
          }}
        >
          {headlineSpend}
        </div>
        {headlineSpendUSD && (
          <div className="font-mono text-[13px] tracking-[0.04em] tabular-nums mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {headlineSpendUSD}
          </div>
        )}
        <div className="font-mono text-[12px] tracking-[0.1em] text-text-muted mt-1">
          {spendCurrencyLabel} {lang === 'en' ? '· over 23 years' : '· en 23 años'}
        </div>
        <div className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
          {lang === 'en' ? 'ANALYZED SPEND' : 'GASTO ANALIZADO'}
        </div>
        <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
          {Array.from({ length: 23 }).map((_, i) => {
            const w = 7
            const gap = 1.5
            const x = i * (w + gap)
            const heights = [10, 11, 12, 13, 14, 15, 16, 17, 17, 17, 18, 18, 18, 19, 20, 20, 20, 20, 19, 22, 21, 19, 14]
            const h = heights[i] ?? 14
            return <rect key={i} x={x} y={22 - h} width={w} height={h} fill="#a06820" fillOpacity={0.55} rx={1} />
          })}
        </svg>
        <div className="mt-2.5 pt-1.5 text-[13px] font-mono text-text-muted leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
          {lang === 'en' ? '3.05M contracts · 12 sectors · post-outlier' : '3.05M contratos · 12 sectores · post-atípicos'}
        </div>
      </ColumnFrame>

      {/* Chapter II — The Bypass */}
      <ColumnFrame
        lang={lang}
        step={STEPS[1]}
        ariaLabel={lang === 'en' ? STEPS[1].ariaLabel.en : STEPS[1].ariaLabel.es}
      >
        <div
          className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'normal',
            fontSize: 48,
            color: '#dc2626',
          }}
        >
          75<span className="text-[26px] align-baseline" style={{ fontFamily: 'inherit' }}>%</span>
        </div>
        <div className="font-mono text-[12px] tracking-[0.1em] text-text-muted mt-1.5">
          {lang === 'en' ? '· vs the EU 10% line' : '· vs la línea UE del 10%'}
        </div>
        <div className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
          {lang === 'en' ? 'DIRECT AWARDS' : 'ADJUDICACIÓN DIRECTA'}
        </div>
        <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
          {Array.from({ length: 100 }).map((_, i) => {
            const cols = 25
            const col = i % cols
            const row = Math.floor(i / cols)
            const cx = 4 + col * 7.5
            const cy = 4 + row * 5
            const isDA = i < 75
            return (
              <circle key={i} cx={cx} cy={cy} r={1.6}
                fill={isDA ? '#dc2626' : 'var(--color-border-hover)'}
                fillOpacity={isDA ? 0.85 : 0.55} />
            )
          })}
          {/* OECD ceiling reference mark — neutral, never green: a
              procurement-only model can't certify "safe" (Bible §3.10) */}
          <line x1={4 + 30 * 7.5 / 25} x2={4 + 30 * 7.5 / 25} y1={1} y2={21}
            stroke="var(--color-text-muted)" strokeWidth={1.2} strokeDasharray="2 2" opacity={0.8} />
        </svg>
        <div className="mt-2.5 pt-1.5 text-[13px] font-mono text-text-muted leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
          {lang === 'en' ? 'seven times the EU scoreboard line' : 'siete veces la línea del Tablero UE'}
        </div>
      </ColumnFrame>

      {/* Chapter III — The Flag */}
      <ColumnFrame
        lang={lang}
        step={STEPS[2]}
        ariaLabel={lang === 'en' ? STEPS[2].ariaLabel.en : STEPS[2].ariaLabel.es}
      >
        <div
          className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'normal',
            fontSize: 40,
            color: RISK_TEXT_COLORS.high,
          }}
        >
          {formatNumber(stats.highCriticalCount)}
        </div>
        <div className="font-mono text-[13px] tracking-[0.04em] tabular-nums mt-1" style={{ color: RISK_TEXT_COLORS.high }}>
          {formatCompactMXN(stats.valueAtRisk)} {lang === 'en' ? 'at stake' : 'en juego'} · {stats.valueAtRiskPct}%
        </div>
        <div className="font-mono text-[12px] tracking-[0.1em] text-text-muted mt-1">
          {lang === 'en'
            ? `· ${stats.highCriticalRate}% of contracts · calibration target 2–15%`
            : `· ${stats.highCriticalRate}% de contratos · meta de calibración 2–15%`}
        </div>
        <div className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
          {lang === 'en' ? 'HIGH + CRITICAL' : 'ALTO + CRÍTICO'}
        </div>
        <div className="flex h-[14px] w-full rounded-sm overflow-hidden gap-[1px]" style={{ background: 'var(--color-border)' }}>
          <div style={{ width: '5.20%', background: '#dc2626', opacity: 0.85 }} />
          <div style={{ width: '5.90%', background: '#f59e0b', opacity: 0.85 }} />
          <div style={{ width: '16.20%', background: '#a06820', opacity: 0.40 }} />
          <div style={{ width: '72.70%', background: 'var(--color-text-muted)', opacity: 0.20 }} />
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-text-muted mt-2.5 pt-1.5 leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
          <span style={{ color: RISK_TEXT_COLORS.critical }}><span aria-hidden="true" style={{ color: RISK_COLORS.critical }}>●</span> {lang === 'en' ? 'crit' : 'crít'} 5%</span>
          <span style={{ color: RISK_TEXT_COLORS.high }}><span aria-hidden="true" style={{ color: RISK_COLORS.high }}>●</span> {lang === 'en' ? 'high' : 'alto'} 6%</span>
          <span style={{ color: RISK_TEXT_COLORS.medium }}><span aria-hidden="true" style={{ color: RISK_COLORS.medium }}>●</span> {lang === 'en' ? 'med' : 'med'} 16%</span>
        </div>
      </ColumnFrame>

      {/* Chapter IV — The Catch */}
      <ColumnFrame
        lang={lang}
        step={STEPS[3]}
        ariaLabel={lang === 'en' ? STEPS[3].ariaLabel.en : STEPS[3].ariaLabel.es}
      >
        <div
          className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'normal',
            fontSize: 48,
            color: 'var(--color-text-primary)',
          }}
        >
          0.785
        </div>
        <div className="font-mono text-[12px] tracking-[0.1em] text-text-muted mt-1.5">
          {lang === 'en' ? '· test set · random = 0.5 · perfect = 1.0' : '· conjunto de prueba · azar = 0.5 · perfecto = 1.0'}
        </div>
        <div className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
          {lang === 'en' ? 'MODEL ACCURACY' : 'PRECISIÓN MODELO'}
        </div>
        <div className="relative h-[14px] w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div
            className="absolute inset-y-0 rounded-sm"
            style={{
              left: '0%',
              width: '57%',
              background: 'linear-gradient(90deg, var(--color-text-muted) 0%, #a06820 100%)',
              opacity: 0.65,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-[2px]"
            style={{ left: '57%', background: 'var(--color-text-primary)' }}
          />
          <div
            className="absolute -bottom-0.5 -translate-x-1/2 w-2 h-2 rotate-45 rounded-[1px]"
            style={{ left: '57%', background: 'var(--color-text-primary)' }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-text-muted mt-2.5 pt-1.5 leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
          <span>0.5 {lang === 'en' ? '· random' : '· azar'}</span>
          <span style={{ color: 'var(--color-accent-hover)' }}><span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>●</span> v0.8.5</span>
          <span>1.0 {lang === 'en' ? '· perfect' : '· perfecto'}</span>
        </div>
      </ColumnFrame>

    </div>
  )
}
