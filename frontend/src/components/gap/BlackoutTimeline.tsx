/**
 * BlackoutTimeline — «La Línea del Registro» (gap redesign, 2026-07-03).
 *
 * The blackout drawn, not narrated (Reuters «Time of Evidence» mechanic): the
 * official-feed track is a solid rule that runs 2002 → 28 Sep 2025 and STOPS DEAD;
 * a dashed ochre "recovered by RUBLI" track picks up exactly where it dies and runs
 * open-ended to the right. The void is the chart — no linear axis, no year ticks
 * between the break points (this is a diagram, not a scale). Fixed data, no API.
 * No italics (Jul-3 legibility standard).
 */
import { formatNumber } from '@/lib/utils'

export function BlackoutTimeline({ totalContracts, lang }: { totalContracts: number; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const W = 900, H = 128
  const x0 = 40, xBreak = W * 0.62, xEnd = W - 30
  const y1 = 44, y2 = 96
  const ochre = 'var(--color-accent)'
  const muted = 'var(--color-text-muted)'
  const total = formatNumber(totalContracts)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="block"
      aria-label={es
        ? `Línea de tiempo: el feed oficial de CompraNet corre de 2002 al 28 de septiembre de 2025 y termina; una línea punteada muestra ${total} adjudicaciones recuperadas por RUBLI después.`
        : `Timeline: the official CompraNet feed runs 2002 to September 28 2025 and ends; a dashed line shows ${total} awards recovered by RUBLI afterward.`}>
      {/* Track 1 — official record, dies at the break */}
      <text x={x0} y={y1 - 14} fontSize="9.5" letterSpacing="1.6" fill={muted} fontFamily="ui-monospace, monospace">
        {es ? 'REGISTRO OFICIAL' : 'OFFICIAL RECORD'}
      </text>
      <line x1={x0} y1={y1} x2={xBreak} y2={y1} stroke={muted} strokeWidth="2" />
      <circle cx={x0} cy={y1} r="3" fill={muted} />
      {/* the death mark */}
      <line x1={xBreak - 6} y1={y1 - 7} x2={xBreak + 6} y2={y1 + 7} stroke={muted} strokeWidth="1.6" />
      <line x1={xBreak - 6} y1={y1 + 7} x2={xBreak + 6} y2={y1 - 7} stroke={muted} strokeWidth="1.6" />
      {/* start + break annotations */}
      <text x={x0} y={y1 + 18} fontSize="9.5" fill={muted} fontFamily="ui-monospace, monospace">2002 · CompraNet</text>
      <line x1={W * 0.44} y1={y1} x2={W * 0.44} y2={y1 - 9} stroke={muted} strokeWidth="1" />
      <text x={W * 0.44} y={y1 - 13} fontSize="9" fill={muted} fontFamily="ui-monospace, monospace" textAnchor="middle">
        {es ? 'ABR 2025 · abolido por ley' : 'APR 2025 · abolished by law'}
      </text>
      <text x={xBreak} y={y1 - 13} fontSize="9" fill={muted} fontFamily="ui-monospace, monospace" textAnchor="middle">
        {es ? '28 SEP 2025 · último registro' : 'SEP 28 2025 · last record'}
      </text>

      {/* Track 2 — recovered, picks up where track 1 died, open-ended */}
      <text x={x0} y={y2 - 14} fontSize="9.5" letterSpacing="1.6" fill={ochre} fontFamily="ui-monospace, monospace">
        {es ? 'RECUPERADO POR RUBLI' : 'RECOVERED BY RUBLI'}
      </text>
      <line x1={xBreak} y1={y2} x2={xEnd - 10} y2={y2} stroke={ochre} strokeWidth="2" strokeDasharray="5 5" />
      {/* connector from the death to the recovered track */}
      <line x1={xBreak} y1={y1 + 8} x2={xBreak} y2={y2} stroke={ochre} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
      {/* arrowhead */}
      <path d={`M ${xEnd - 12} ${y2 - 4} L ${xEnd} ${y2} L ${xEnd - 12} ${y2 + 4}`} fill="none" stroke={ochre} strokeWidth="2" />
      <text x={xBreak} y={y2 + 18} fontSize="9.5" fill={ochre} fontFamily="ui-monospace, monospace">
        {es ? `29 SEP 2025 → · ${total} adjudicaciones · OCR` : `SEP 29 2025 → · ${total} awards · OCR`}
      </text>
    </svg>
  )
}
