/**
 * WaveformSparkline — compact time-series sparkline with pulse accent.
 *
 * Same idiom as the collusion PairDossierRow waveform: thin vertical
 * bars with a glow halo on the peak, usable for any per-page timeseries
 * (yearly contract volume, monthly risk rate, vendor concentration trend).
 */

interface WaveformSparklineProps {
  /** Numeric series, any scale — auto-normalised. */
  values: number[]
  /** Hex colour; accent tint drives both bars + peak glow. */
  accent: string
  /** Pixel height of the sparkline. Default 28. */
  height?: number
  /** Pixel width of each bar. Default 3. */
  barWidth?: number
  /** Pixel gap between bars. Default 2. */
  gap?: number
  /** Optional aria label. */
  ariaLabel?: string
}

export function WaveformSparkline({
  values,
  accent,
  height = 28,
  barWidth = 3,
  gap = 2,
  ariaLabel,
}: WaveformSparklineProps) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const peakIdx = values.indexOf(max)
  const width = values.length * (barWidth + gap)

  return (
    <svg
      width={width}
      height={height}
      aria-label={ariaLabel ?? 'timeseries sparkline'}
      role="img"
      style={{ display: 'block' }}
    >
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 2))
        const x = i * (barWidth + gap)
        const y = height - h
        const isPeak = i === peakIdx
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            fill={accent}
            opacity={isPeak ? 1 : 0.55}
            style={
              isPeak
                ? { filter: `drop-shadow(0 0 4px ${accent}cc)` }
                : undefined
            }
          />
        )
      })}
    </svg>
  )
}
