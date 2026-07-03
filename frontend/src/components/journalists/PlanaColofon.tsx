// ---------------------------------------------------------------------------
// PlanaColofon — «Fe de plana» / "Editor's note".
//
// The honesty colophon that closes every sibling folio (Fe de arqueo / Fe de
// carta). Names what the status rubric means, states the empty top rung as of
// this cut, and repeats the platform's two standing caveats: the model emits a
// risk indicator (not a probability of corruption) and the source is frozen.
// Pure typography — a double rule, roman-numeral clauses, one link out.
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom'

export function PlanaColofon({
  lang,
  total,
  procesadoCount,
}: {
  lang: 'en' | 'es'
  total: number
  procesadoCount: number
}) {
  const isEs = lang === 'es'

  const clauseI = isEs
    ? 'Cada investigación lleva su rúbrica de avance: PISTA DE DATOS (el patrón existe solo en los datos; no acusa a nadie), REPORTADO (la prensa — esta casa u otra — lo ha documentado), BAJO AUDITORÍA (un órgano fiscalizador — ASF, COFECE, OIC — lo ha revisado), PROCESADO (existe proceso penal o civil). La rúbrica mide la distancia entre el dato y la consecuencia, no la gravedad del hallazgo.'
    : 'Each investigation carries its progress rubric: DATA LEAD (the pattern exists only in the data; it accuses no one), REPORTED (the press — this desk or another — has documented it), UNDER AUDIT (an oversight body — ASF, COFECE, OIC — has reviewed it), PROSECUTED (criminal or civil proceedings exist). The rubric measures the distance between data and consequence, not the gravity of the finding.'

  const clauseII =
    procesadoCount === 0
      ? isEs
        ? `Al corte, ninguna de las ${total} ha llegado a proceso.`
        : `As of this cut, none of the ${total} has reached prosecution.`
      : isEs
        ? `Al corte, ${procesadoCount} de las ${total} han llegado a proceso.`
        : `As of this cut, ${procesadoCount} of the ${total} have reached prosecution.`

  const clauseIII = isEs
    ? 'Las cifras dentro de cada historia provienen del modelo v0.8.5 y de casos documentados. El modelo emite un indicador de riesgo, no una probabilidad de corrupción; una pista de datos señala un patrón, no un culpable.'
    : 'The figures inside each story come from model v0.8.5 and from documented cases. The model emits a risk indicator, not a probability of corruption; a data lead names a pattern, not a culprit.'

  const clauseIV = isEs
    ? 'La fuente (COMPRANET) quedó congelada el 28 de septiembre de 2025; 2025 es un año parcial. La cobertura de RFC en 2002–2010 es de 0.1%: los primeros años están subexpuestos.'
    : 'The source (COMPRANET) froze on September 28, 2025; 2025 is a partial year. RFC coverage for 2002–2010 is 0.1%: the early years are underexposed.'

  const clauses: Array<{ n: string; body: string }> = [
    { n: 'i', body: clauseI },
    { n: 'ii', body: clauseII },
    { n: 'iii', body: clauseIII },
    { n: 'iv', body: clauseIV },
  ]

  return (
    <section
      className="mt-14 sm:mt-16 pt-7"
      style={{ borderTop: '3px double var(--color-text-muted)' }}
      aria-label={isEs ? 'Fe de plana' : "Editor's note"}
    >
      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted mb-5">
        {isEs ? 'FE DE PLANA · MÉTODO Y LÍMITES' : 'EDITOR’S NOTE · METHOD AND LIMITS'}
      </div>

      <div className="space-y-3.5 max-w-3xl">
        {clauses.map((c) => (
          <div key={c.n} className="flex gap-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted pt-[3px] shrink-0 w-6 tabular-nums">
              {c.n}
            </span>
            <p
              className="text-text-secondary"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: '13px', lineHeight: 1.55 }}
            >
              {c.body}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted tabular-nums">
        {isEs ? 'modelo v0.8.5 · AUC de prueba 0.785 · ' : 'model v0.8.5 · test AUC 0.785 · '}
        <Link to="/methodology" className="underline decoration-1 underline-offset-2 hover:text-text-secondary transition-colors">
          {isEs ? 'metodología ↗' : 'methodology ↗'}
        </Link>
      </p>
    </section>
  )
}
