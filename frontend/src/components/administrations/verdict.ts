/**
 * getAdminVerdict — rule-generated verdict lede for AdminSummaryCard (M7b · A1).
 *
 * Pure function, no React. Mirrors the shape of lib/entity/verdict.ts but is
 * admin-specific: no existing primitive covers presidential-term verdicts.
 *
 * Returns an array of segments so the card can color the accent fragment
 * (the comparative multiple / superlative phrase) in ochre while keeping the
 * rest of the sentence in primary text.
 *
 * Risk-copy rule: "alto riesgo" / "indicador de riesgo" only — never
 * "probability of corruption". est_fraud_mxn is deliberately excluded.
 */
import type { AdminAgg, AdminName } from './types'

export interface EraExtras {
  gtCaseCount?: number
  decSpikePct?: number
}

export interface VerdictSegment {
  text: string
  accent?: boolean
}

interface VerdictArgs {
  adminName: AdminName
  agg: AdminAgg | undefined
  allAggs: AdminAgg[]
  allTimeAvg: { da: number; sb: number; hr: number; risk: number }
  extras?: EraExtras
  isEs: boolean
}

export function getAdminVerdict(args: VerdictArgs): VerdictSegment[] {
  const { adminName, agg, allAggs, allTimeAvg, extras, isEs } = args

  // Only compare against complete-term administrations with real data.
  const completeAggs = allAggs.filter(
    (a) => a.contracts > 0 && a.name !== 'Sheinbaum',
  )

  const segments: VerdictSegment[] = []

  // No data for the selected admin — minimal honest statement.
  if (!agg || agg.contracts === 0) {
    segments.push({
      text: isEs
        ? 'Sin registros suficientes para emitir un veredicto.'
        : 'Insufficient records to issue a verdict.',
    })
    appendAnchors(segments, extras, isEs)
    return segments
  }

  const maxHr = completeAggs.length
    ? Math.max(...completeAggs.map((a) => a.highRiskPct))
    : agg.highRiskPct
  const minHr = completeAggs.length
    ? Math.min(...completeAggs.map((a) => a.highRiskPct))
    : agg.highRiskPct
  const maxDa = completeAggs.length
    ? Math.max(...completeAggs.map((a) => a.directAwardPct))
    : agg.directAwardPct

  // Rule ladder — first match wins.
  if (adminName === 'Sheinbaum') {
    // 1. Partial term in progress.
    if (isEs) {
      segments.push({ text: 'Sexenio en curso — registros parciales desde octubre de 2024; ' })
      segments.push({ text: 'comparaciones preliminares', accent: true })
      segments.push({ text: '.' })
    } else {
      segments.push({ text: 'Term in progress — partial records since October 2024; ' })
      segments.push({ text: 'preliminary comparisons', accent: true })
      segments.push({ text: '.' })
    }
  } else if (agg.highRiskPct === maxHr) {
    // 2. Highest high-risk rate in the modern record.
    const mult = (agg.highRiskPct / allTimeAvg.hr).toFixed(1)
    if (isEs) {
      segments.push({ text: 'La tasa de alto riesgo ' })
      segments.push({ text: 'más alta del registro moderno', accent: true })
      segments.push({ text: ` — ${mult}× el promedio nacional.` })
    } else {
      segments.push({ text: 'The ' })
      segments.push({ text: 'highest high-risk rate in the modern record', accent: true })
      segments.push({ text: ` — ${mult}× the national average.` })
    }
  } else if (agg.directAwardPct === maxDa) {
    // 3. Most direct award.
    const da = agg.directAwardPct.toFixed(1)
    if (isEs) {
      segments.push({ text: 'El sexenio con ' })
      segments.push({ text: 'más adjudicación directa', accent: true })
      segments.push({ text: `: ${da}% de los contratos sin competencia.` })
    } else {
      segments.push({ text: 'The term with the ' })
      segments.push({ text: 'most direct award', accent: true })
      segments.push({ text: `: ${da}% of contracts awarded without competition.` })
    }
  } else if (agg.highRiskPct === minHr) {
    // 4. Lowest risk indicator (Fox case) — must NOT read as exoneration.
    if (isEs) {
      segments.push({ text: 'El indicador de riesgo ' })
      segments.push({ text: 'más bajo del registro', accent: true })
      segments.push({ text: ' — con la cobertura de datos más débil (Estructura A).' })
    } else {
      segments.push({ text: 'The ' })
      segments.push({ text: 'lowest risk indicator in the record', accent: true })
      segments.push({ text: ' — with the weakest data coverage (Structure A).' })
    }
  } else {
    // 5. Default comparative vs national average.
    const deltaHr = agg.highRiskPct - allTimeAvg.hr
    const pp = Math.abs(deltaHr).toFixed(1)
    const above = deltaHr >= 0
    if (isEs) {
      segments.push({ text: `Una tasa de alto riesgo ${above ? 'por encima' : 'por debajo'} del promedio nacional, ` })
      segments.push({ text: `${pp} pp`, accent: true })
      segments.push({ text: `${above ? ' arriba' : ' abajo'} de la media de 2002–2025.` })
    } else {
      segments.push({ text: `A high-risk rate ${above ? 'above' : 'below'} the national average, ` })
      segments.push({ text: `${pp} pp`, accent: true })
      segments.push({ text: `${above ? ' over' : ' under'} the 2002–2025 mean.` })
    }
  }

  appendAnchors(segments, extras, isEs)
  return segments
}

/** Append the documented-record anchor + December-spike note when present. */
function appendAnchors(
  segments: VerdictSegment[],
  extras: EraExtras | undefined,
  isEs: boolean,
): void {
  if (!extras) return
  const { gtCaseCount, decSpikePct } = extras
  if (gtCaseCount != null && gtCaseCount > 0) {
    segments.push({
      text: isEs
        ? ` ${gtCaseCount} casos documentados de corrupción vinculados a este periodo.`
        : ` ${gtCaseCount} documented corruption cases linked to this period.`,
    })
  }
  if (decSpikePct != null && decSpikePct > 10) {
    // decSpikePct is December's SHARE of the whole term's spend; a uniform
    // month would be 1/12 ≈ 8.3%. Express it as a multiple of a typical month
    // — the old copy mislabelled the raw share as "% above the average" (which
    // both misframed the metric and understated the spike ~8×). DC2.
    const decMult = decSpikePct / (100 / 12)
    segments.push({
      text: isEs
        ? ` El gasto de diciembre equivale a ${decMult.toFixed(1)}× un mes promedio (${decSpikePct.toFixed(0)}% del gasto del sexenio).`
        : ` December spending runs ${decMult.toFixed(1)}× a typical month (${decSpikePct.toFixed(0)}% of the term's spend).`,
    })
  }
}
