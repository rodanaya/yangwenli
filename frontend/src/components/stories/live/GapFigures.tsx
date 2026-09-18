/**
 * GapFigures — the five live figures of «El Vacío» (Story Day 1, SD-01).
 *
 * The story used to carry its `/gap` numbers as typed literals, which went
 * stale the moment the September refresh lifted prod from 69,516 awards to
 * 94,899. Every figure here reads the same `/gap/summary` cut the `/gap` page
 * reads, through one shared query — so the story cannot drift from the register
 * again, and the reader can click through from a figure into the live filter.
 *
 * The five plates are the ones `/gap` already publishes (BlackoutTimeline,
 * FunnelStrip, ExceptionCatalog, BuyersLedger + CounterpartyExhibit,
 * GradeBlock). Nothing is forked: each is imported and dressed in the story's
 * ChartCard chrome (eyebrow · Playfair title · anchor · annotation · stamp).
 *
 * Honesty (STORY_DAYS principle 6): when the query fails or the staging table
 * is absent the card says so in one mono line and points at `/gap`. It never
 * substitutes a typed number for a live one.
 *
 * All five ship in ONE lazy chunk — they always appear together on the same
 * page, so five separate chunks would be five requests for one story.
 */
import { useNavigate, Link } from 'react-router-dom'
import type { GapSummaryResponse } from '@/api/types'
import { ChartCard } from '@/components/stories/InlineCharts'
import { BlackoutTimeline } from '@/components/gap/BlackoutTimeline'
import { ExceptionCatalog } from '@/components/gap/ExceptionCatalog'
import { BuyersLedger } from '@/components/gap/BuyersLedger'
import { CounterpartyExhibit } from '@/components/gap/CounterpartyExhibit'
import { GradeBlock } from '@/components/gap/GradeBlock'
import { FunnelStrip } from '@/components/capture/FunnelStrip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { useGapSummary } from './useGapSummary'

/** The five figure slots a chapter can ask for. Mirrors `StoryChartConfig.live`. */
export type GapFigureKind =
  | 'gap-blackout'
  | 'gap-funnel'
  | 'gap-exceptions'
  | 'gap-buyers'
  | 'gap-grade'

const STAMP = { en: 'RECOVERED · OCR', es: 'RECUPERADO · OCR' } as const

// ── card chrome, per figure ───────────────────────────────────────────────

interface Chrome {
  eyebrow: string
  title: string
  annotation: string
}

function chromeFor(kind: GapFigureKind, es: boolean): Chrome {
  switch (kind) {
    case 'gap-blackout':
      return es
        ? {
            eyebrow: 'FIGURA I · EL REGISTRO',
            title: 'Veintitrés años de registro, luego silencio',
            annotation:
              'Diagrama, no escala: la regla sólida es el flujo oficial de CompraNet de 2002 al 28 de septiembre de 2025; la punteada es lo que RUBLI recuperó del portal sucesor desde entonces. Cifras en vivo de /gap/summary.',
          }
        : {
            eyebrow: 'FIGURE I · THE RECORD',
            title: 'Twenty-three years of record, then silence',
            annotation:
              'A diagram, not a scale: the solid rule is the official CompraNet feed from 2002 to September 28 2025; the dashed one is what RUBLI recovered from the successor portal after it. Figures live from /gap/summary.',
          }
    case 'gap-funnel':
      return es
        ? {
            eyebrow: 'FIGURA II · LA RECUPERACIÓN',
            title: 'La recuperación, en tres cortes',
            annotation:
              'El largo de cada barra está en escala logarítmica solo para que el corte más pequeño siga siendo visible — la proporción honesta es el conteo y el porcentaje impresos, nunca la longitud.',
          }
        : {
            eyebrow: 'FIGURE II · THE RECOVERY',
            title: 'The recovery, in three cuts',
            annotation:
              'Bar length is log-scaled only so the smallest cut stays visible — the honest proportion is the printed count and percentage, never the length.',
          }
    case 'gap-exceptions':
      return es
        ? {
            eyebrow: 'FIGURA III · LAS EXCEPCIONES',
            title: 'Las puertas legales por las que pasaron las adjudicaciones',
            annotation:
              'Cada adjudicación sin concurso debe citar el artículo que la exenta de licitar. Art. 55 es el umbral de bajo monto (rutinario); las fracciones del Art. 54 son discrecionales. Cifras en vivo de /gap/summary.',
          }
        : {
            eyebrow: 'FIGURE III · THE EXCEPTIONS',
            title: 'The legal doors the awards walked through',
            annotation:
              'Every no-bid award must cite the article that exempts it from tendering. Art. 55 is the low-value threshold (routine); the Art. 54 fractions are discretionary. Figures live from /gap/summary.',
          }
    case 'gap-buyers':
      return es
        ? {
            eyebrow: 'FIGURA IV · LOS COMPRADORES',
            title: 'Quién compró a oscuras',
            annotation:
              'Clic en una institución para abrir el registro de /gap ya filtrado por ella. El indicador 0–100 es estructural (mínimo 50 adjudicaciones por institución) — no es el modelo v0.8.5.',
          }
        : {
            eyebrow: 'FIGURE IV · THE BUYERS',
            title: 'Who bought in the dark',
            annotation:
              'Click an institution to open the /gap register already filtered to it. The 0–100 indicator is structural (minimum 50 awards per institution) — it is not the v0.8.5 model.',
          }
    case 'gap-grade':
      return es
        ? {
            eyebrow: 'FIGURA V · LA CALIFICACIÓN',
            title: 'La oscuridad, calificada',
            annotation:
              'Distribución de las cuatro bandas del indicador estructural sobre todas las adjudicaciones recuperadas. Cifras en vivo de /gap/summary.',
          }
        : {
            eyebrow: 'FIGURE V · THE GRADE',
            title: 'The dark, graded',
            annotation:
              'The four-band distribution of the structural indicator across every recovered award. Figures live from /gap/summary.',
          }
  }
}

// ── in-flight and failure states ──────────────────────────────────────────

/** The lazy chunk can land before the query resolves — hold the card's shape
 *  rather than flashing the failure line at a request that is still running. */
function Loading({ kind, lang }: { kind: GapFigureKind; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const { eyebrow, title } = chromeFor(kind, es)
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <div
        role="status"
        aria-label={es ? 'Cargando la figura en vivo' : 'Loading the live figure'}
        className="h-40 rounded-sm bg-surface-2 motion-safe:animate-pulse"
      />
    </ChartCard>
  )
}


function Unavailable({ kind, lang }: { kind: GapFigureKind; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const { eyebrow, title } = chromeFor(kind, es)
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <p className="px-2 py-8 font-mono text-[12px] leading-relaxed text-text-muted">
        {es ? 'Figura en vivo no disponible — ver ' : 'Live figure unavailable — see '}
        <Link to="/gap" className="underline underline-offset-2 hover:text-text-secondary">
          /gap
        </Link>
      </p>
    </ChartCard>
  )
}

// ── the five plates ───────────────────────────────────────────────────────

function Blackout({ s, lang, stage }: { s: GapSummaryResponse; lang: 'en' | 'es'; stage: number }) {
  const es = lang === 'es'
  const c = chromeFor('gap-blackout', es)
  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      annotation={c.annotation}
      anchor={{
        value: formatNumber(s.total_contracts),
        label: es ? 'recuperadas tras el congelamiento' : 'recovered after the freeze',
      }}
    >
      <div className="px-2">
        <BlackoutTimeline totalContracts={s.total_contracts} lang={lang} stage={stage} />
      </div>
    </ChartCard>
  )
}

function Funnel({ s, lang }: { s: GapSummaryResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = chromeFor('gap-funnel', es)
  const recovered = formatCompactMXN(s.recovered_sum_mxn)
  // The funnel takes its step labels as plain strings, so the amount inside one
  // cannot be wrapped in a nowrap span. Non-breaking spaces do the same job in
  // one character: the line may break before the amount, never inside it
  // (STORY_DAYS.md § 7).
  const recoveredNb = recovered.replace(/ /g, ' ')
  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      annotation={c.annotation}
      anchor={{ value: recovered, label: es ? 'leído de las imágenes' : 'read off the images' }}
    >
      <div className="px-2 py-2">
        <FunnelStrip
          lang={lang}
          tiers={[
            {
              count: s.total_contracts,
              color: 'var(--color-text-muted)',
              labelEn:
                'procedures published after the freeze, enumerated through the reproduced signature',
              labelEs:
                'procedimientos publicados tras el congelamiento, enumerados con la firma reproducida',
            },
            {
              count: s.direct_award_count,
              color: 'var(--color-accent)',
              labelEn: 'awarded with no public tender',
              labelEs: 'adjudicados sin licitación pública',
            },
            {
              count: s.recovered_count,
              color: 'var(--color-risk-critical)',
              labelEn: `with a price read off the scanned award notice by OCR — ${recoveredNb}`,
              labelEs: `con precio leído del fallo escaneado por OCR — ${recoveredNb}`,
            },
          ]}
        />
      </div>
    </ChartCard>
  )
}

function Exceptions({ s, lang }: { s: GapSummaryResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = chromeFor('gap-exceptions', es)
  const threshold = s.by_exception_article.find((a) => (a.article || '').startsWith('Art. 55'))
  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      annotation={c.annotation}
      anchor={
        threshold
          ? {
              value: formatNumber(threshold.count),
              label: es ? 'citan el umbral de bajo monto' : 'cite the low-value threshold',
            }
          : undefined
      }
    >
      {/* No extra inset: the catalog's rows are the widest thing any of these
          figures render, so they get the card's own gutter and nothing more. */}
      <div className="pb-2">
        <ExceptionCatalog
          items={s.by_exception_article}
          daCount={s.direct_award_count}
          lang={lang}
          heading={false}
        />
      </div>
    </ChartCard>
  )
}

function Buyers({ s, lang }: { s: GapSummaryResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const navigate = useNavigate()
  const c = chromeFor('gap-buyers', es)
  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      annotation={c.annotation}
      anchor={{
        value: formatNumber(s.young_vendor_count),
        label: es ? 'proveedores con menos de tres años' : 'vendors younger than three years',
      }}
    >
      <div className="px-2 pb-2 space-y-6">
        <BuyersLedger
          items={s.worst_institutions}
          lang={lang}
          // `/gap` reads its free-text filter from `?q=` and LIKE-matches
          // institution_siglas, which is exactly what the page's own row click
          // does (Gap.tsx pickBuyer) — same filter, arrived at from the story.
          onPick={(siglas) => navigate(`/gap?q=${encodeURIComponent(siglas)}#registro`)}
        />
        <div className="border-t border-border pt-6">
          <CounterpartyExhibit
            youngCount={s.young_vendor_count}
            efosCount={s.efos_count}
            lang={lang}
          />
        </div>
      </div>
    </ChartCard>
  )
}

function Grade({ s, lang }: { s: GapSummaryResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = chromeFor('gap-grade', es)
  const r = s.by_risk_level
  const total = r.critical + r.high + r.medium + r.low
  const alertPct = total > 0 ? ((100 * (r.critical + r.high)) / total).toFixed(1) : null
  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      annotation={c.annotation}
      anchor={
        alertPct
          ? {
              value: `${alertPct}%`,
              label: es
                ? 'con banderas estructurales altas o críticas'
                : 'carry high or critical structural flags',
            }
          : undefined
      }
    >
      <div className="px-2 pb-2">
        <GradeBlock summary={s} lang={lang} bare />
      </div>
    </ChartCard>
  )
}

// ── the single entry point the story renders ──────────────────────────────

export default function LiveGapFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: GapFigureKind
  lang: 'en' | 'es'
  /** F1 only — the blackout diagram's scroll beat (0–3). */
  stage?: number
}) {
  const { data, isError, isPending } = useGapSummary()

  if (isPending) return <Loading kind={kind} lang={lang} />
  if (isError || !data?.available) return <Unavailable kind={kind} lang={lang} />

  switch (kind) {
    case 'gap-blackout':
      return <Blackout s={data} lang={lang} stage={stage} />
    case 'gap-funnel':
      return <Funnel s={data} lang={lang} />
    case 'gap-exceptions':
      return <Exceptions s={data} lang={lang} />
    case 'gap-buyers':
      return <Buyers s={data} lang={lang} />
    case 'gap-grade':
      return <Grade s={data} lang={lang} />
  }
}
