/**
 * Two Worlds — methodology exhibit.
 *
 * Formerly the standalone /intersection page. It was retired (2026-06-08)
 * because as a *tool* it offered nothing ARIA doesn't: one zone duplicated the
 * queue, one listed vendors already on the official list, one listed the
 * model's own misses. But the underlying finding is a strong *credibility
 * argument* — RUBLI's model and the government's official record (SAT EFOS +
 * SFP) barely overlap, so the platform is not redundant with what the state
 * already publishes. That argument belongs here, made once, as an exhibit.
 *
 * Static by design (no drill-down): the leads live in ARIA.
 */

import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { intersectionApi } from '@/api/client'
import { formatNumber } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'

const SERIF = '"Playfair Display", "EB Garamond", Georgia, serif'
const C_MODEL = RISK_COLORS.critical // red — RUBLI model
const C_RECORD = '#64748b' // slate — the official record
const C_OVERLAP = RISK_COLORS.high // amber — agreement

export function TwoWorldsExhibit() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data } = useQuery({
    queryKey: ['intersection', 'exhibit'],
    queryFn: () => intersectionApi.getSummary(1),
    staleTime: 10 * 60 * 1000,
  })
  const w = data?.worlds
  if (!w) return null

  const legend: Array<{ k: string; n: number; color: string; gloss: [string, string] }> = [
    { k: lang === 'es' ? 'Solo el modelo' : 'Model only', n: w.ghost_signature, color: C_MODEL, gloss: ['huella fantasma que el registro nunca listó', 'ghost fingerprint the registry never listed'] },
    { k: lang === 'es' ? 'Ambos coinciden' : 'Both agree', n: w.overlap, color: C_OVERLAP, gloss: ['en EFOS/SFP y marcados por el modelo', 'on EFOS/SFP and flagged by the model'] },
    { k: lang === 'es' ? 'Solo el Estado' : 'State only', n: w.blind_spots, color: C_RECORD, gloss: ['sancionados que el modelo no ve', 'sanctioned vendors the model misses'] },
  ]

  return (
    <section id="two-worlds" className="scroll-mt-20 rounded-sm border border-border bg-background-card overflow-hidden">
      <header className="px-5 sm:px-6 py-5 border-b border-border">
        <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: C_OVERLAP }}>
          {lang === 'es' ? 'Exhibit · por qué el modelo no es redundante' : "Exhibit · why the model isn't redundant"}
        </p>
        <h3 className="mt-2 text-text-primary leading-[1.1]" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 'clamp(22px, 3vw, 34px)', letterSpacing: '-0.02em', maxWidth: '20ch' }}>
          {lang === 'es' ? 'Dos formas de ver la corrupción. Casi nunca coinciden.' : 'Two ways of seeing corruption. They almost never agree.'}
        </h3>
        <p className="mt-3 text-text-secondary" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(15px, 1.8vw, 18px)', lineHeight: 1.5 }}>
          {lang === 'es'
            ? <>El modelo de RUBLI marca <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.model_flags)}</strong> proveedores de alto riesgo. El registro oficial del Estado — SAT EFOS + SFP — lista <strong className="tabular-nums" style={{ color: C_RECORD }}>{formatNumber(w.official_record)}</strong>. Comparten <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{formatNumber(w.overlap)}</strong>. Si el modelo solo repitiera la lista oficial, sobraría; no lo hace.</>
            : <>RUBLI's model flags <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.model_flags)}</strong> high-risk suppliers. The state's official record — SAT EFOS + SFP — lists <strong className="tabular-nums" style={{ color: C_RECORD }}>{formatNumber(w.official_record)}</strong>. They share <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{formatNumber(w.overlap)}</strong>. If the model just echoed the official list it would be redundant; it doesn't.</>}
        </p>
      </header>

      {/* The Venn — static argument graphic */}
      <div className="px-3 py-4 sm:px-6">
        <svg viewBox="0 0 720 380" className="w-full h-auto" role="img" aria-label={lang === 'es' ? 'Diagrama: el modelo y el registro oficial apenas se solapan' : 'Diagram: the model and the official record barely overlap'} style={{ maxHeight: 420 }}>
          <defs><clipPath id="exhibit-lens-clip"><circle cx={270} cy={190} r={158} /></clipPath></defs>
          {/* model circle */}
          <circle cx={270} cy={190} r={158} fill={C_MODEL} fillOpacity={0.13} stroke={C_MODEL} strokeOpacity={0.6} strokeWidth={1.75} />
          <circle cx={205} cy={250} r={45} fill={C_MODEL} fillOpacity={0.22} stroke={C_MODEL} strokeOpacity={0.6} strokeWidth={1.25} />
          {/* record circle */}
          <circle cx={462} cy={190} r={70} fill={C_RECORD} fillOpacity={0.13} stroke={C_RECORD} strokeOpacity={0.6} strokeWidth={1.75} />
          {/* overlap lens */}
          <circle cx={462} cy={190} r={70} clipPath="url(#exhibit-lens-clip)" fill={C_OVERLAP} fillOpacity={0.45} stroke={C_OVERLAP} strokeOpacity={0.75} strokeWidth={1.5} />
          {/* labels */}
          <g pointerEvents="none" style={{ fontFamily: 'var(--font-family-mono, "IBM Plex Mono", monospace)' }}>
            <text x={118} y={96} fill={C_MODEL} fontSize={13} fontWeight={700} letterSpacing="1.6">{lang === 'es' ? 'MODELO RUBLI' : 'RUBLI MODEL'}</text>
            <text x={117} y={138} fill={C_MODEL} fontSize={40} fontWeight={800} fontStyle="normal" style={{ fontFamily: SERIF }}>{formatNumber(w.model_flags)}</text>
            <text x={119} y={157} fill="var(--color-text-muted)" fontSize={13}>{lang === 'es' ? 'marcados · riesgo ≥40' : 'flagged · risk ≥40'}</text>
            <text x={205} y={246} fill={C_MODEL} fontSize={22} fontWeight={800} fontStyle="normal" textAnchor="middle" style={{ fontFamily: SERIF }}>{formatNumber(w.ghost_signature)}</text>
            <text x={205} y={263} fill="var(--color-text-secondary)" fontSize={13} fontWeight={700} letterSpacing="0.5" textAnchor="middle">{lang === 'es' ? 'HUELLA FANTASMA' : 'GHOST SIGNATURE'}</text>
            <line x1={540} y1={138} x2={512} y2={166} stroke="var(--color-border)" strokeWidth={1} />
            <text x={548} y={128} fill={C_RECORD} fontSize={13} fontWeight={700} letterSpacing="1.4">{lang === 'es' ? 'REGISTRO OFICIAL' : 'OFFICIAL RECORD'}</text>
            <text x={548} y={144} fill="var(--color-text-muted)" fontSize={12}>SAT EFOS + SFP</text>
            <text x={548} y={180} fill={C_RECORD} fontSize={29} fontWeight={800} fontStyle="normal" style={{ fontFamily: SERIF }}>{formatNumber(w.official_record)}</text>
            <line x1={503} y1={235} x2={492} y2={218} stroke="var(--color-border)" strokeWidth={1} />
            <text x={508} y={247} fill="var(--color-text-secondary)" fontSize={13}>
              <tspan fontStyle="normal" fontSize={15} style={{ fontFamily: SERIF }}>{formatNumber(w.blind_spots)}</tspan>
              <tspan dx="6" fill="var(--color-text-muted)">{lang === 'es' ? 'puntos ciegos' : 'blind spots'}</tspan>
            </text>
            <line x1={410} y1={78} x2={410} y2={138} stroke={C_OVERLAP} strokeOpacity={0.6} strokeWidth={1} />
            <text x={410} y={56} fill={C_OVERLAP} fontSize={29} fontWeight={800} fontStyle="normal" textAnchor="middle" style={{ fontFamily: SERIF }}>{formatNumber(w.overlap)}</text>
            <text x={410} y={73} fill="var(--color-text-secondary)" fontSize={12} fontWeight={700} letterSpacing="0.5" textAnchor="middle">{lang === 'es' ? 'AMBOS COINCIDEN' : 'BOTH AGREE'}</text>
          </g>
        </svg>
      </div>

      {/* Legend — the three regions, as static breakdown (not a drill-down) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border-y border-border">
        {legend.map((l) => (
          <div key={l.k} className="bg-background-card px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} aria-hidden="true" />
              <span className="text-[12px] font-mono uppercase tracking-[0.12em]" style={{ color: l.color }}>{l.k}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: l.color, fontFamily: SERIF, fontStyle: 'normal' }}>{formatNumber(l.n)}</div>
            <p className="text-[12px] font-mono text-text-muted leading-[1.4] mt-0.5">{lang === 'es' ? l.gloss[0] : l.gloss[1]}</p>
          </div>
        ))}
      </div>

      <div className="px-5 sm:px-6 py-4">
        <p className="text-[13px] leading-[1.6] text-text-secondary">
          {lang === 'es'
            ? <>El «registro oficial» son solo SAT EFOS (Art. 69-B) + SFP — <strong className="text-text-primary">no</strong> incluye el corpus de casos de RUBLI, que sería circular (el modelo se entrenó con él). Los <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.ghost_signature)}</strong> proveedores que solo el modelo ve son las pistas de investigación — viven en <Link to="/aria" className="underline underline-offset-2 hover:text-text-primary">la Lista de Vigilancia (ARIA)</Link>.</>
            : <>"Official record" is SAT EFOS (Art. 69-B) + SFP only — it does <strong className="text-text-primary">not</strong> include RUBLI's own case corpus, which would be circular (the model trained on it). The <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.ghost_signature)}</strong> suppliers only the model sees are the investigation leads — they live in <Link to="/aria" className="underline underline-offset-2 hover:text-text-primary">the Queue (ARIA)</Link>.</>}
        </p>
      </div>
    </section>
  )
}
