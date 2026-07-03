/**
 * ExceptionCatalog — «El Catálogo de Excepciones» (gap redesign, 2026-07-03).
 *
 * The prosecutorial centerpiece (ProPublica «Bailout Tracker» accountability-table
 * mechanic): every no-bid award must cite a legal exception article; the catalog
 * shows which legal doors were walked through. Three-tone legal semantics END the
 * dishonest uniform-critical-red — the backend's own methodology scores Art. 55
 * (routine low-value threshold) LOWER than the discretionary Art. 54 fractions:
 *   Art. 54 fr.*  → discretionary escape  → alarm (critical/high)
 *   Art. 55       → low-value threshold   → de-alarmed zinc/muted (routine)
 *   else          → unverified            → muted, no alarm color
 */
import type { GapSummaryResponse } from '@/api/types'
import { RISK_COLORS } from '@/lib/constants'
import { DotBar } from '@/components/ui/DotBar'

type Tone = 'discretionary' | 'threshold' | 'unverified'

function toneOf(article: string): { tone: Tone; glossEs: string; glossEn: string } {
  const a = (article || '').trim()
  if (a.startsWith('Art. 54')) return {
    tone: 'discretionary',
    glossEs: 'excepción discrecional a la licitación pública',
    glossEn: 'discretionary exception to public tender',
  }
  if (a.startsWith('Art. 55')) return {
    tone: 'threshold',
    glossEs: 'adjudicación directa por monto menor (umbral legal)',
    glossEn: 'direct award by low value (legal threshold)',
  }
  return {
    tone: 'unverified',
    glossEs: 'clasificación pendiente de verificación contra la ley de 2025',
    glossEn: 'classification pending verification against the 2025 statute',
  }
}

// Alarm color per tone; `lead` gets the stronger critical for the discretionary case.
function toneColor(tone: Tone, lead: boolean): string {
  if (tone === 'discretionary') return lead ? RISK_COLORS.critical : RISK_COLORS.high
  return '#71717a' // zinc — threshold + unverified are deliberately de-alarmed (Bible §3.10, no green)
}

export function ExceptionCatalog({ items, daCount, lang }: {
  items: GapSummaryResponse['by_exception_article']; daCount: number; lang: 'en' | 'es'
}) {
  if (!items.length || daCount <= 0) return null
  const es = lang === 'es'
  const sorted = [...items].sort((a, b) => b.count - a.count)
  const lead = sorted[0]
  const rest = sorted.slice(1, 8)
  const shownSum = sorted.reduce((s, i) => s + i.count, 0)
  const coveragePct = Math.round((shownSum / daCount) * 100)
  // the prosecutorial line: the discretionary Art. 54 fractions summed
  const disc = sorted.filter((i) => (i.article || '').startsWith('Art. 54')).reduce((s, i) => s + i.count, 0)
  const discPct = ((disc / daCount) * 100).toFixed(1)

  const leadTone = toneOf(lead.article)
  const leadPct = ((lead.count / daCount) * 100).toFixed(1)

  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-muted font-mono mb-1">
        {es ? 'PIEZA CENTRAL · EL CATÁLOGO DE EXCEPCIONES' : 'CENTERPIECE · THE EXCEPTION CATALOG'}
      </div>
      <h2 className="font-serif text-2xl text-text-primary mb-5">
        {es ? 'La puerta legal de cada adjudicación sin concurso' : 'The legal door of every no-bid award'}
      </h2>

      {/* promoted lead entry */}
      <div className="border-t-2 pt-4 mb-5" style={{ borderColor: toneColor(leadTone.tone, true) }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="font-mono text-2xl sm:text-3xl text-text-primary tabular-nums" style={{ fontWeight: 500 }}>
            {lead.article}
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl sm:text-3xl tabular-nums" style={{ color: toneColor(leadTone.tone, true), fontWeight: 500 }}>{leadPct}%</span>
            <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">{es ? 'de las adjud. directas' : 'of direct awards'}</span>
          </div>
        </div>
        <div className="mt-2">
          <DotBar value={lead.count} max={daCount} dots={50} color={toneColor(leadTone.tone, true)} ariaLabel={`${lead.article}: ${leadPct}%`} />
        </div>
        <div className="mt-1.5 text-[13px] text-text-secondary">{es ? leadTone.glossEs : leadTone.glossEn}</div>
      </div>

      {/* statute register — the rest */}
      <div className="divide-y divide-border">
        {rest.map((it) => {
          const tn = toneOf(it.article)
          const c = toneColor(tn.tone, false)
          const pct = ((it.count / daCount) * 100).toFixed(1)
          return (
            <div key={it.article} className="grid grid-cols-[minmax(6.5rem,auto)_1fr] sm:grid-cols-[8rem_1fr_auto] items-center gap-x-3 gap-y-1 py-2.5">
              <div className="font-mono text-[13.5px] text-text-primary tabular-nums">{it.article || (es ? 'No especificado' : 'Unspecified')}</div>
              <div className="hidden sm:block text-[13px] text-text-secondary leading-tight">{es ? tn.glossEs : tn.glossEn}</div>
              <div className="flex items-center gap-2 justify-self-end">
                <DotBar value={it.count} max={daCount} dots={22} color={c} ariaLabel={`${it.article}: ${pct}%`} />
                <span className="font-mono text-xs tabular-nums text-text-muted w-24 text-right">
                  {it.count.toLocaleString()} <span className="text-text-on-dark-muted">({pct}%)</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* prosecutorial + coverage lines */}
      <p className="mt-4 text-sm text-text-secondary leading-relaxed">
        {es
          ? <>Las fracciones discrecionales del <strong className="text-text-primary font-semibold">Art. 54</strong> suman <strong style={{ color: RISK_COLORS.high }}>{discPct}%</strong> de las adjudicaciones directas — la firma de la elusión sistemática del concurso. El <strong className="text-text-muted">Art. 55</strong> es el umbral de monto menor: rutinario, no discrecional.</>
          : <>The discretionary <strong className="text-text-primary font-semibold">Art. 54</strong> fractions together account for <strong style={{ color: RISK_COLORS.high }}>{discPct}%</strong> of direct awards — the signature of systematic contest-avoidance. <strong className="text-text-muted">Art. 55</strong> is the low-value threshold: routine, not discretionary.</>}
      </p>
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-text-muted font-mono leading-snug">
        {es
          ? `Los 8 artículos más invocados cubren ${coveragePct}% de las adjudicaciones directas; el resto no registra artículo o invoca artículos menos frecuentes.`
          : `The 8 most-invoked articles cover ${coveragePct}% of direct awards; the rest record no article or invoke less-frequent ones.`}
      </div>
    </div>
  )
}
