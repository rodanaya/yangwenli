/**
 * VennConvergence — Ch.4 of "Volatilidad" story.
 *
 * Two overlapping ellipses representing:
 *   - Supervised model (RUBLI v0.8.5 logistic regression)
 *   - Unsupervised IForest anomaly detection (PyOD)
 * The overlap region shows the 4,200 contracts both algorithms flag.
 *
 * 2026-06-15: brought into the cream editorial system — wraps the SVG in
 * the shared `ChartCard` shell and recolors the overlap labels (were hard
 * white for a dark card) for the light background.
 *
 * Self-contained: hardcoded illustrative data. The "illustrative" caveat is
 * carried honestly in the card annotation.
 */
import { SECTOR_COLORS } from '@/lib/constants'
import { ChartCard } from './InlineCharts'

interface Props {
  lang?: 'en' | 'es'
}

export function VennConvergence({ lang = 'es' }: Props) {
  const W = 720
  const H = 320

  const accent  = SECTOR_COLORS.salud       // #dc2626 — overlap zone
  const blueHex = SECTOR_COLORS.educacion   // #3b82f6 — supervised
  const grayHex = SECTOR_COLORS.otros       // #64748b — unsupervised
  const textMuted = 'var(--color-text-muted)'
  const overlapInk = 'var(--color-text-primary)'

  // Ellipse geometry
  const CX_LEFT  = W * 0.38
  const CX_RIGHT = W * 0.62
  const CY       = H * 0.50
  const RX       = 145
  const RY       = 96

  const leftLabel  = lang === 'es' ? 'Modelo supervisado' : 'Supervised model'
  const rightLabel = lang === 'es' ? 'Detección de anomalías' : 'Anomaly detection (IForest)'
  const OVERLAP_CONTRACTS = '4,200'

  const title = lang === 'es'
    ? 'Dos algoritmos convergen: los mismos 4,200 contratos'
    : 'Two algorithms agree: the same 4,200 contracts'
  const annotation = lang === 'es'
    ? 'Validación cruzada ilustrativa — dos métodos independientes (RUBLI v0.8.5, regresión logística supervisada + PyOD IForest, detección de anomalías no supervisada), sin etiquetas de entrenamiento compartidas, convergen en los mismos 4,200 contratos.'
    : 'Illustrative cross-model validation — two independent methods (RUBLI v0.8.5 supervised logistic regression + PyOD IForest unsupervised anomaly detection), with no shared training labels, converge on the same 4,200 contracts.'

  return (
    <ChartCard
      title={title}
      eyebrow="MODEL CONVERGENCE · 2 METHODS"
      annotation={annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Left ellipse — supervised model (blue) */}
        <ellipse
          cx={CX_LEFT}
          cy={CY}
          rx={RX}
          ry={RY}
          fill={blueHex}
          fillOpacity={0.16}
          stroke={blueHex}
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />

        {/* Right ellipse — IForest (gray) */}
        <ellipse
          cx={CX_RIGHT}
          cy={CY}
          rx={RX}
          ry={RY}
          fill={grayHex}
          fillOpacity={0.16}
          stroke={grayHex}
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />

        {/* Overlap highlight — clip the right ellipse to the left's shape */}
        <clipPath id="venn-left-clip">
          <ellipse cx={CX_LEFT} cy={CY} rx={RX} ry={RY} />
        </clipPath>
        <ellipse
          cx={CX_RIGHT}
          cy={CY}
          rx={RX}
          ry={RY}
          fill={accent}
          fillOpacity={0.28}
          clipPath="url(#venn-left-clip)"
        />
        <ellipse
          cx={CX_RIGHT}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          clipPath="url(#venn-left-clip)"
        />

        {/* LEFT-only stats */}
        <text x={CX_LEFT - RX * 0.55} y={CY - 24} fontSize={11} fontFamily="monospace"
          fontWeight="700" fill={blueHex} textAnchor="middle">31,800</text>
        <text x={CX_LEFT - RX * 0.55} y={CY - 10} fontSize={9} fontFamily="monospace"
          fill={textMuted} textAnchor="middle">
          {lang === 'es' ? 'solo modelo' : 'model-only'}
        </text>

        {/* RIGHT-only stats */}
        <text x={CX_RIGHT + RX * 0.55} y={CY - 24} fontSize={11} fontFamily="monospace"
          fontWeight="700" fill={grayHex} textAnchor="middle">18,600</text>
        <text x={CX_RIGHT + RX * 0.55} y={CY - 10} fontSize={9} fontFamily="monospace"
          fill={textMuted} textAnchor="middle">
          {lang === 'es' ? 'solo IForest' : 'IForest-only'}
        </text>

        {/* Overlap center — big number + caption */}
        <text x={W / 2} y={CY - 12} fontSize={28}
          fontFamily="Playfair Display, Georgia, serif" fontStyle="italic" fontWeight="800"
          fill={accent} textAnchor="middle">
          {OVERLAP_CONTRACTS}
        </text>
        <text x={W / 2} y={CY + 8} fontSize={9} fontFamily="monospace"
          fill={overlapInk} textAnchor="middle">
          {lang === 'es' ? 'contratos señalados' : 'contracts flagged'}
        </text>
        <text x={W / 2} y={CY + 22} fontSize={9} fontFamily="monospace"
          fill={overlapInk} textAnchor="middle">
          {lang === 'es' ? 'por ambos algoritmos' : 'by both algorithms'}
        </text>

        {/* Circle labels at top */}
        <text x={CX_LEFT} y={CY - RY - 14} fontSize={11} fontFamily="monospace"
          fontWeight="600" fill={blueHex} textAnchor="middle">{leftLabel}</text>
        <text x={CX_LEFT} y={CY - RY - 2} fontSize={9} fontFamily="monospace"
          fill={textMuted} textAnchor="middle">
          {lang === 'es' ? 'RUBLI v0.8.5 · regresión logística' : 'RUBLI v0.8.5 · logistic regression'}
        </text>

        <text x={CX_RIGHT} y={CY - RY - 14} fontSize={11} fontFamily="monospace"
          fontWeight="600" fill={grayHex} textAnchor="middle">{rightLabel}</text>
        <text x={CX_RIGHT} y={CY - RY - 2} fontSize={9} fontFamily="monospace"
          fill={textMuted} textAnchor="middle">
          {lang === 'es' ? 'PyOD IForest · no supervisado' : 'PyOD IForest · unsupervised'}
        </text>

        {/* Bottom annotation */}
        <text x={W / 2} y={H - 8} fontSize={9} fontFamily="monospace"
          fill={textMuted} textAnchor="middle">
          {lang === 'es'
            ? 'Métodos independientes · sin etiquetas compartidas · misma señal'
            : 'Independent methods · no shared labels · same signal'}
        </text>
      </svg>
    </ChartCard>
  )
}

export default VennConvergence
