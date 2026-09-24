/**
 * CaptureLeaders — FINDING 04 «Institutional capture»: the P6 explainer, the
 * live P6 vendor count, a Cleveland pair per capture leader (filled = top
 * vendor share, open = second) and a hover strip with the hovered row's
 * numbers. The card is one <Link> to the P6 queue; the rows are hover-only
 * (not interactive), so nothing nests inside the link.
 *
 * Owns its hover state (PARALLAX D10 § Change 8): a row hover re-renders this
 * card, not the whole dashboard.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { CaptureLeadersResponse } from '@/api/types'
import { formatNumber } from '@/lib/utils'

export function CaptureLeaders({ lang, leaders, p6Count }: {
  lang: 'en' | 'es'
  leaders: CaptureLeadersResponse['leaders'] | undefined
  /** Live P6 vendor count (aria_stats.pattern_counts.P6). */
  p6Count: number
}) {
  // Which capture-leader row is under the cursor (data-only detail strip).
  const [capDetail, setCapDetail] = useState<{ label: string; top: number; second: number } | null>(null)
  return (
      <motion.article
        className="surface-card rounded-sm border-l-2"
        style={{ borderLeftColor: '#a06820' }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Link
          to="/aria?pattern=P6"
          className="group block h-full p-5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          aria-label={lang === 'en' ? 'Open institutional capture pattern (ARIA P6) investigation queue' : 'Abrir cola de captura institucional (ARIA P6)'}
        >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-mono uppercase tracking-[0.15em] text-text-muted">
            {lang === 'en' ? 'FINDING 04 · INSTITUTIONAL CAPTURE' : 'HALLAZGO 04 · CAPTURA INSTITUCIONAL'}
          </span>
          <span className="text-[13px] font-mono uppercase tracking-[0.1em] opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: 'var(--color-accent-hover)' }}>
            {lang === 'en' ? 'investigate' : 'investigar'}
            <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        </div>

        {/* Plain-English explanation of the pattern, before any number */}
        <p className="text-sm text-text-secondary leading-[1.55] mb-3">
          {lang === 'en'
            ? <>One vendor controls <strong className="text-text-primary">80%+ of one institution's category budget for five-plus years</strong>. RUBLI calls this <span className="font-mono" style={{ color: 'var(--color-accent-hover)' }}>P6 — capture</span>: a monopoly built inside a single agency, often invisible at the national level.</>
            : <>Un proveedor controla <strong className="text-text-primary">80% o más del presupuesto de una categoría dentro de una institución durante cinco o más años</strong>. RUBLI lo llama <span className="font-mono" style={{ color: 'var(--color-accent-hover)' }}>P6 — captura</span>: un monopolio construido dentro de una sola dependencia, frecuentemente invisible a nivel nacional.</>
          }
        </p>

        <div className="flex items-end gap-3 mb-4">
          <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: 'var(--color-accent-hover)' }}>{formatNumber(p6Count)}</span>
          <span className="font-mono text-[13px] text-text-muted mb-1 leading-[1.35]">{lang === 'en' ? 'vendors fit\nthe P6 fingerprint' : 'proveedores ajustan\na la huella P6'}</span>
        </div>
        {/* Cleveland pair per institution: filled dot = top vendor share,
            open dot = second vendor share. Gap reveals capture. */}
        <div className="mb-4">
          {(() => {
            // Live top-5 from capture_results (sorted by capture score DESC).
            // Fallback to static values if the API hasn't resolved yet.
            const INST_DATA = leaders ?? [
              { label: 'ASIPONA', top: 76, second: 20, captured: true  },
              { label: 'LOTERIA', top: 77, second:  2, captured: true  },
              { label: 'SIAP',    top: 81, second: 16, captured: true  },
              { label: 'SPF',     top: 70, second:  9, captured: true  },
              { label: 'AFAC',    top: 81, second: 10, captured: true  },
            ]
            const SVG_W = 240
            const PAD_L = 10
            const PAD_R = 52  // gap label space
            const TRACK_W = SVG_W - PAD_L - PAD_R
            const xPos = (pct: number) => PAD_L + (pct / 100) * TRACK_W
            const ROW_H = 22

            return (
              <>
                {INST_DATA.map((inst, iIdx) => {
                  const gap = inst.top - inst.second
                  const dotColor = inst.captured ? '#a06820' : 'var(--color-text-primary)'
                  return (
                    <div
                      key={inst.label}
                      className="flex items-center gap-2 mb-[3px]"
                      data-capture-row
                      onMouseEnter={() => setCapDetail({ label: inst.label, top: inst.top, second: inst.second })}
                      onMouseLeave={() => setCapDetail(null)}
                    >
                      <span
                        className="text-[8px] font-mono flex-shrink-0 text-right"
                        style={{
                          width: 46,
                          color: inst.captured ? 'var(--color-accent-hover)' : 'var(--color-text-muted)',
                          fontWeight: inst.captured ? 700 : 400,
                        }}
                      >
                        {inst.captured ? '▶ ' : ''}{inst.label}
                      </span>

                      <motion.svg
                        width={SVG_W}
                        height={ROW_H}
                        style={{ flexShrink: 0, overflow: 'visible' }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.1 + iIdx * 0.08 }}
                      >
                        {/* Guide line */}
                        <line
                          x1={PAD_L}
                          x2={SVG_W - PAD_R}
                          y1={ROW_H / 2}
                          y2={ROW_H / 2}
                          stroke="var(--color-border)"
                          strokeWidth={0.6}
                        />
                        {/* Connector between the two dots */}
                        <line
                          x1={xPos(inst.second)}
                          x2={xPos(inst.top)}
                          y1={ROW_H / 2}
                          y2={ROW_H / 2}
                          stroke={inst.captured ? '#a06820' : 'var(--color-text-muted)'}
                          strokeWidth={1.4}
                          strokeOpacity={inst.captured ? 0.85 : 0.45}
                        />
                        {/* Open circle = second vendor */}
                        <circle
                          cx={xPos(inst.second)}
                          cy={ROW_H / 2}
                          r={4}
                          fill="none"
                          stroke="var(--color-text-muted)"
                          strokeWidth={1.2}
                        />
                        {/* Filled circle = top vendor */}
                        <circle
                          cx={xPos(inst.top)}
                          cy={ROW_H / 2}
                          r={5}
                          fill={dotColor}
                          fillOpacity={inst.captured ? 1 : 0.7}
                        />
                        {/* Gap annotation */}
                        <text
                          x={SVG_W - PAD_R + 5}
                          y={ROW_H / 2 + 3.5}
                          fontSize={8}
                          fontFamily="var(--font-family-mono,monospace)"
                          fontWeight="700"
                          fill={inst.captured ? 'var(--color-accent-hover)' : 'var(--color-text-muted)'}
                        >
                          +{Number.isInteger(gap) ? gap : gap.toFixed(1)}pp
                        </text>
                      </motion.svg>
                    </div>
                  )
                })}

                <div className="text-[8px] font-mono text-text-muted mt-1.5 leading-[1.4]">
                  {lang === 'en'
                    ? '● top vendor share · ○ second vendor · gap = concentration advantage'
                    : '● cuota proveedor 1 · ○ proveedor 2 · brecha = ventaja de concentración'}
                </div>
                {/* Hover dossier — data-only (the whole card is already a
                    <Link> to /aria?pattern=P6; nesting anchors here
                    would be the nested-interactive trap). Defaults to the
                    top row so touch/keyboard readers see real numbers. */}
                {(() => {
                  const d = capDetail ?? INST_DATA[0] ?? null
                  if (!d) return null
                  const gp = d.top - d.second
                  const gpLabel = Number.isInteger(gp) ? gp : gp.toFixed(1)
                  return (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-1.5 rounded-sm px-2 py-1.5 text-[13px] font-mono leading-[1.5]"
                      style={{ background: 'rgba(160,104,32,0.07)', border: '1px solid rgba(160,104,32,0.18)', minHeight: 40 }}
                    >
                      <span style={{ color: 'var(--color-accent-hover)', fontWeight: 700 }}>{d.label}</span>
                      {' — '}
                      {lang === 'en'
                        ? `top vendor ${d.top}% · second ${d.second}% · gap +${gpLabel}pp`
                        : `proveedor 1 ${d.top}% · proveedor 2 ${d.second}% · brecha +${gpLabel}pp`}
                      <span className="block" style={{ color: 'var(--color-text-muted)' }}>
                        {lang === 'en'
                          ? 'P6 capture signature · risk indicator, not a verdict · click opens the P6 queue'
                          : 'Huella de captura P6 · indicador de riesgo, no un veredicto · clic abre la cola P6'}
                      </span>
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </div>
        <h3 className="font-semibold text-[15px] text-text-primary leading-[1.3] mb-1.5">
          {lang === 'en' ? 'One vendor locks one institution — year after year, no competition.' : 'Un proveedor captura una institución — año tras año, sin competencia.'}
        </h3>
        <p className="text-sm text-text-secondary leading-[1.6]">
          {lang === 'en'
            ? 'P6 capture differs from national monopoly: abnormal concentration in one agency with above-threshold risk. Detectable only through cross-institution comparison.'
            : 'La captura P6 difiere del monopolio nacional: concentración anormal en una sola agencia con riesgo por encima del umbral. Solo detectable comparando entre instituciones.'}
        </p>
        </Link>
      </motion.article>
  )
}
