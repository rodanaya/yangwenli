/**
 * VennConvergence — Ch.4 of "Volatilidad" story (n-P3)
 *
 * Two overlapping ellipses representing:
 *   - Supervised model (RUBLI v0.8.5 logistic regression)
 *   - Unsupervised IForest anomaly detection (PyOD)
 * The overlap region shows the 4,200 contracts both algorithms flag.
 *
 * Self-contained: hardcoded illustrative data, no live API call.
 * SVG-based, no recharts.
 */
import { SECTOR_COLORS } from '@/lib/constants'

interface Props {
  lang?: 'en' | 'es'
}

export function VennConvergence({ lang = 'es' }: Props) {
  const W = 720
  const H = 340

  const accent  = SECTOR_COLORS.salud       // #dc2626 — overlap zone
  const blueHex = SECTOR_COLORS.educacion   // #3b82f6 — supervised
  const grayHex = SECTOR_COLORS.otros       // #64748b — unsupervised
  const textMuted = '#78716c'

  // Ellipse geometry
  const CX_LEFT  = W * 0.38
  const CX_RIGHT = W * 0.62
  const CY       = H * 0.50
  const RX       = 145
  const RY       = 100

  // Labels
  const leftLabel  = lang === 'es' ? 'Modelo supervisado' : 'Supervised model'
  const rightLabel = lang === 'es' ? 'Detección de anomalías' : 'Anomaly detection (IForest)'
  // leftSub/rightSub/LEFT_ONLY/RIGHT_ONLY/overlapLabel reserved for the
  // narrative annotations pending the follow-up commit on this component.
  const OVERLAP_CONTRACTS = '4,200'

  const title   = lang === 'es' ? 'Dos algoritmos convergen: los mismos 4,200 contratos' : 'Two algorithms agree: the same 4,200 contracts'
  const srcNote = lang === 'es'
    ? 'DATOS ILUSTRATIVOS · RUBLI v0.8.5 × PyOD IForest · validación cruzada abril 2026'
    : 'ILLUSTRATIVE DATA · RUBLI v0.8.5 × PyOD IForest · cross-model validation April 2026'

  return (
    <figure
      className="rounded-sm overflow-hidden"
      style={{ background: '#1c1917', border: '1px solid #292524' }}
      aria-label={title}
      role="img"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #292524' }}>
        <p
          className="text-xs font-mono uppercase tracking-widest mb-1"
          style={{ color: textMuted }}
        >
          {lang === 'es' ? '§ 4 · DOS ALGORITMOS CONVERGEN' : '§ 4 · TWO ALGORITHMS AGREE'}
        </p>
        <p className="text-sm font-medium" style={{ color: '#e7e5e4' }}>
          {title}
        </p>
      </div>

      {/* SVG Venn */}
      <div className="px-2 py-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', maxWidth: W }}
          aria-hidden="true"
        >
          {/* Left ellipse — supervised model (blue) */}
          <ellipse
            cx={CX_LEFT}
            cy={CY}
            rx={RX}
            ry={RY}
            fill={blueHex}
            fillOpacity={0.18}
            stroke={blueHex}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />

          {/* Right ellipse — IForest (gray) */}
          <ellipse
            cx={CX_RIGHT}
            cy={CY}
            rx={RX}
            ry={RY}
            fill={grayHex}
            fillOpacity={0.18}
            stroke={grayHex}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />

          {/* Overlap highlight — clipPath approach with a simple rect+ellipse overlay */}
          <clipPath id="venn-left-clip">
            <ellipse cx={CX_LEFT} cy={CY} rx={RX} ry={RY} />
          </clipPath>
          <ellipse
            cx={CX_RIGHT}
            cy={CY}
            rx={RX}
            ry={RY}
            fill={accent}
            fillOpacity={0.35}
            clipPath="url(#venn-left-clip)"
          />

          {/* Overlap border strokes */}
          <ellipse
            cx={CX_RIGHT}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            clipPath="url(#venn-left-clip)"
          />

          {/* LEFT label block — left-only stats */}
          <text
            x={CX_LEFT - RX * 0.55}
            y={CY - 24}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="700"
            fill={blueHex}
            textAnchor="middle"
          >
            {lang === 'es' ? '31,800' : '31,800'}
          </text>
          <text
            x={CX_LEFT - RX * 0.55}
            y={CY - 10}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            {lang === 'es' ? 'solo modelo' : 'model-only'}
          </text>

          {/* RIGHT label block — right-only stats */}
          <text
            x={CX_RIGHT + RX * 0.55}
            y={CY - 24}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="700"
            fill={grayHex}
            textAnchor="middle"
          >
            18,600
          </text>
          <text
            x={CX_RIGHT + RX * 0.55}
            y={CY - 10}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            {lang === 'es' ? 'solo IForest' : 'IForest-only'}
          </text>

          {/* Overlap center — big number */}
          <text
            x={W / 2}
            y={CY - 14}
            fontSize={26}
            fontFamily="Playfair Display, Georgia, serif"
            fontStyle="italic"
            fontWeight="800"
            fill={accent}
            textAnchor="middle"
            style={{ color: accent }}
          >
            {OVERLAP_CONTRACTS}
          </text>
          <text
            x={W / 2}
            y={CY + 7}
            fontSize={9}
            fontFamily="monospace"
            fill="#e7e5e4"
            textAnchor="middle"
          >
            {lang === 'es' ? 'contratos flagueados' : 'contracts flagged'}
          </text>
          <text
            x={W / 2}
            y={CY + 21}
            fontSize={9}
            fontFamily="monospace"
            fill="#e7e5e4"
            textAnchor="middle"
          >
            {lang === 'es' ? 'por ambos algoritmos' : 'by both algorithms'}
          </text>

          {/* Circle labels at top */}
          <text
            x={CX_LEFT}
            y={CY - RY - 14}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="600"
            fill={blueHex}
            textAnchor="middle"
          >
            {leftLabel}
          </text>
          <text
            x={CX_LEFT}
            y={CY - RY - 2}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            RUBLI v0.8.5 · regresión logística
          </text>

          <text
            x={CX_RIGHT}
            y={CY - RY - 14}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="600"
            fill={grayHex}
            textAnchor="middle"
          >
            {rightLabel}
          </text>
          <text
            x={CX_RIGHT}
            y={CY - RY - 2}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            PyOD IForest · no supervisado
          </text>

          {/* Bottom annotation */}
          <text
            x={W / 2}
            y={H - 10}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            {lang === 'es'
              ? 'Métodos independientes · sin etiquetas compartidas · misma señal'
              : 'Independent methods · no shared labels · same signal'}
          </text>
        </svg>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 text-xs font-mono"
        style={{ color: textMuted, borderTop: '1px solid #292524' }}
      >
        {srcNote}
      </div>
    </figure>
  )
}

export default VennConvergence
