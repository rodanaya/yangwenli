/**
 * FeDeArqueo — «Fe de arqueo / Auditor's note» closing honesty block for the
 * /sectors «El Arqueo» redesign (WHO Marimekko + WHAT Marimekko). House
 * precedent: /network «Fe de método» + ProPublica methodology-note discipline.
 *
 * Renders at the foot of BOTH views with view-specific numbered clauses.
 * Typography only — no chart, no dots, no icons, no green.
 *
 * Contract: props are exact per spec §3 NEW 3. Self-contained — imports only
 * from react, react-router-dom, and @/lib/utils.
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { formatCompactMXN } from '@/lib/utils'

export interface FeDeArqueoProps {
  view: 'sectores' | 'categorias'
  lang: 'en' | 'es'
  /** WHO view passes computed totals; WHAT passes null. */
  totals: {
    totalMxn: number
    varMxn: number
    contracts: number
    flaggedSharePct: number // varMxn/totalMxn × 100
    countPct: number // (high+critical counts)/contracts × 100
  } | null
}

// Kicker — mono 10px, wide tracking, uppercase, muted.
const KICKER_STYLE: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
}

// Clause numerals — mono 9.5px, muted, tabular.
const NUM_STYLE: CSSProperties = {
  fontFamily: 'ui-monospace, "IBM Plex Mono", monospace',
  fontSize: 13,
  color: 'var(--color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
}

// Clause body — EB Garamond 12.5px (the ExposureLedger marginalia pattern).
const CLAUSE_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'normal',
  fontSize: 12.5,
  lineHeight: 1.5,
  color: 'var(--color-text-secondary)',
}

type Clause = { id: string; text: string }

function clause1(lang: 'en' | 'es', totals: FeDeArqueoProps['totals']): Clause {
  if (totals) {
    const varMxn = formatCompactMXN(totals.varMxn)
    const flagged = totals.flaggedSharePct.toFixed(1)
    const count = totals.countPct.toFixed(1)
    return {
      id: 'monto-observado',
      text:
        lang === 'es'
          ? `El monto observado — hoy ${varMxn}, el ${flagged}% del valor en el ${count}% de los contratos — es un indicador de riesgo del modelo v0.8.5: pesos en contratos de nivel alto y crítico. No es una estimación de fraude ni una determinación legal; léase como cobertura de revisión, no como pérdida.`
          : `The flagged amount — today ${varMxn}, ${flagged}% of value across ${count}% of contracts — is a v0.8.5 model risk indicator: pesos in high- and critical-level contracts. It is not a fraud estimate nor a legal determination; read it as review coverage, not as loss.`,
    }
  }
  return {
    id: 'riesgo-promedio',
    text:
      lang === 'es'
        ? 'El riesgo promedio por categoría es un indicador del modelo v0.8.5 (0–100%), no una probabilidad de corrupción ni una proporción del gasto.'
        : 'Category mean risk is a v0.8.5 model indicator (0–100%), not a probability of corruption nor a share of spend.',
  }
}

function buildClauses(view: 'sectores' | 'categorias', lang: 'en' | 'es', totals: FeDeArqueoProps['totals']): Clause[] {
  const c1 = clause1(lang, totals)

  const c2: Clause = {
    id: 'ponderacion-anomalias',
    text:
      lang === 'es'
        ? 'El porcentaje observado es alto porque el modelo pondera anomalías de monto grande: la señal se concentra en pocos contratos de mucho dinero.'
        : 'The flagged share runs high because the model weights high-value anomalies: the signal concentrates in few, large contracts.',
  }

  const c3: Clause = {
    id: 'sectores-categorias',
    text:
      lang === 'es'
        ? 'Los 12 sectores agrupan ramos presupuestales (Salud = ramos 12, 50 y 51); las categorías se derivan de códigos Partida/CUCoP.'
        : 'The 12 sectors bundle federal budget branches (Health = ramos 12, 50 and 51); categories derive from Partida/CUCoP line-item codes.',
  }

  const c4: Clause = {
    id: 'cobertura-partida',
    text:
      lang === 'es'
        ? 'La clasificación por categoría es confiable de 2023 a 2025 (100% Partida en la Estructura D); años anteriores pueden tener clasificación parcial.'
        : 'Category classification is reliable for 2023–2025 (100% Partida coverage in Structure D); earlier years may be partially classified.',
  }

  const c5: Clause = {
    id: 'casos-atipicos',
    text:
      lang === 'es'
        ? 'Casos atípicos conocidos: Segalmex domina el conjunto de entrenamiento en Agricultura (6,326 contratos GT); Salud pondera riesgo por valor; Trabajo tiene N pequeño.'
        : 'Known outliers: Segalmex dominates the Agriculture training set (6,326 GT contracts); Health risk is value-weighted; Labor has small N.',
  }

  const c6: Clause = {
    id: 'fuente-congelada',
    text:
      lang === 'es'
        ? 'La fuente (COMPRANET) quedó congelada el 28 de septiembre de 2025; 2025 es un año parcial.'
        : 'The source (COMPRANET) froze on September 28, 2025; 2025 is a partial year.',
  }

  return view === 'sectores' ? [c1, c2, c3, c5, c6] : [c1, c3, c4, c5, c6]
}

export function FeDeArqueo({ view, lang, totals }: FeDeArqueoProps) {
  const clauses = buildClauses(view, lang, totals)

  return (
    <section
      aria-label={lang === 'es' ? 'Fe de arqueo — método y límites' : "Auditor's note — method and limits"}
      className="mt-6"
      style={{ borderTop: '3px double var(--color-text-muted)' }}
    >
      <div className="pt-3 px-2 sm:px-3">
        <p className="font-mono" style={KICKER_STYLE}>
          {lang === 'es' ? 'FE DE ARQUEO · MÉTODO Y LÍMITES' : "AUDITOR'S NOTE · METHOD AND LIMITS"}
        </p>

        <ol className="mt-3 space-y-2.5" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {clauses.map((c, i) => (
            <li key={c.id} className="flex gap-2.5">
              <span className="font-mono shrink-0 tabular-nums" style={{ ...NUM_STYLE, marginTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={CLAUSE_STYLE}>{c.text}</span>
            </li>
          ))}
        </ol>

        <p className="mt-3 pb-3 font-mono">
          <Link
            to="/methodology"
            className="underline decoration-1 underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ fontSize: 12, letterSpacing: '0.02em', color: 'var(--color-text-secondary)' }}
          >
            {lang === 'es' ? 'modelo v0.8.5 · AUC 0.785 · metodología ↗' : 'model v0.8.5 · AUC 0.785 · methodology ↗'}
          </Link>
        </p>
      </div>
    </section>
  )
}

export default FeDeArqueo
