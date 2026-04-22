/**
 * AdminFingerprints — presidential risk fingerprints, dot-matrix edition.
 *
 * One row per administration (Fox → Sheinbaum). Each row shows:
 *   [party tab] [Name + years] [dot strip: high-risk %] · [dot strip: direct-award %]
 *
 * Dot-matrix protocol: each filled dot = 1/20 of the MAX_RISK_PCT range.
 * AMLO row is visually dominant by design — its high-risk rate (41.8%) fills
 * most of the strip, making the outlier immediately legible.
 */

import { useTranslation } from 'react-i18next'

const fmtB = (v: number) => {
  const b = v / 1e9
  return b >= 1000 ? `${(b / 1000).toFixed(1)}T` : `${Math.round(b)}B`
}

interface Admin {
  name: string
  fullName: string
  years: string
  party: string
  partyColor: string
  contracts: number
  value: number
  avgRisk: number
  highRiskPct: number
  directAwardPct: number
}

const ADMINS: Admin[] = [
  { name: 'Fox',         fullName: 'Vicente Fox',            years: '2001–2006',    party: 'PAN',    partyColor: '#1a5276', contracts: 206333,  value: 934149093703,  avgRisk: 0.2405, highRiskPct: 17.7, directAwardPct: 0    },
  { name: 'Calderón',    fullName: 'Felipe Calderón',        years: '2007–2012',    party: 'PAN',    partyColor: '#1a5276', contracts: 481450,  value: 2408464590942, avgRisk: 0.2435, highRiskPct: 18.5, directAwardPct: 42.3 },
  { name: 'Peña Nieto',  fullName: 'Enrique Peña Nieto',     years: '2013–2018',    party: 'PRI',    partyColor: '#c41e3a', contracts: 1228625, value: 3063252272272, avgRisk: 0.2566, highRiskPct: 23.0, directAwardPct: 73.1 },
  { name: 'AMLO',        fullName: 'A.M. López Obrador',     years: '2019–2024',    party: 'MORENA', partyColor: '#7b2d8b', contracts: 1050552, value: 2757688188124, avgRisk: 0.3109, highRiskPct: 41.8, directAwardPct: 79.4 },
  { name: 'Sheinbaum',   fullName: 'Claudia Sheinbaum',      years: '2025–pres.',   party: 'MORENA', partyColor: '#7b2d8b', contracts: 92631,   value: 718602180690,  avgRisk: 0.3016, highRiskPct: 39.5, directAwardPct: 68.3 },
]

// ── Layout constants ─────────────────────────────────────────────────────
const SVG_W        = 580
const ROW_H        = 28
const ROW_GAP      = 6
const PAD_T        = 22
const PAD_B        = 38
const SVG_H        = PAD_T + ADMINS.length * (ROW_H + ROW_GAP) + PAD_B

const PARTY_TAB_W  = 6
const PARTY_TAB_GAP = 8
const LABEL_X      = PARTY_TAB_W + PARTY_TAB_GAP
const LABEL_W      = 100

// Dot-matrix params
const DOT_R        = 3
const DOT_GAP      = 8

// Risk strip: 20 dots × 8 = 160px
const N_RISK       = 20
const BAR_RISK_X   = LABEL_X + LABEL_W + 8
const BAR_RISK_PX  = N_RISK * DOT_GAP    // 160

// Gap + pct label column
const PCT_W        = 42
const DIVIDER_X    = BAR_RISK_X + BAR_RISK_PX + PCT_W + 4

// DA strip: 15 dots × 8 = 120px
const N_DA         = 15
const BAR_DA_X     = DIVIDER_X + 10
const BAR_DA_PX    = N_DA * DOT_GAP      // 120

// Max values — AMLO fills its strip, making the outlier obvious
const MAX_RISK_PCT = 45
const MAX_DA_PCT   = 85

// Colors
const RISK_COLOR   = '#dc2626'
const DA_COLOR     = '#7c93a8'
const GRID_COLOR   = 'rgba(255,255,255,0.06)'
const HEADER_COLOR = '#a1a1aa'
const MUTED_COLOR  = '#71717a'
const TEXT_COLOR   = '#e5e5e5'
const EMPTY_DOT    = '#27272a'   // dark — blends with dark card background
const EMPTY_STROKE = '#3f3f46'   // subtle border for empty dots

export function AdminFingerprints() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const maxRiskPct = Math.max(...ADMINS.map((a) => a.highRiskPct))

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMinYMin meet"
      role="img"
      aria-label="Presidential risk fingerprints: high-risk rate and direct-award percentage by administration, 2001-2025."
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <text x={LABEL_X} y={12} fill={HEADER_COLOR} fontSize={9}
        fontFamily="var(--font-family-mono, monospace)" fontWeight="bold" letterSpacing="0.1em">
        ADMINISTRATION
      </text>
      <text x={BAR_RISK_X} y={12} fill={HEADER_COLOR} fontSize={9}
        fontFamily="var(--font-family-mono, monospace)" fontWeight="bold" letterSpacing="0.1em">
        % HIGH + CRITICAL RISK
      </text>
      <text x={BAR_DA_X} y={12} fill={HEADER_COLOR} fontSize={9}
        fontFamily="var(--font-family-mono, monospace)" fontWeight="bold" letterSpacing="0.1em">
        % DIRECT AWARD
      </text>

      {/* Header underline */}
      <line x1={0} y1={PAD_T - 6} x2={SVG_W} y2={PAD_T - 6} stroke={GRID_COLOR} strokeWidth={1} />

      {/* Divider between risk and DA sections */}
      <line
        x1={DIVIDER_X} y1={PAD_T - 2}
        x2={DIVIDER_X} y2={PAD_T + ADMINS.length * (ROW_H + ROW_GAP) - 4}
        stroke={GRID_COLOR} strokeWidth={1}
      />

      {/* OECD reference lines — cyan dashed hairlines */}
      {(() => {
        const riskOecdX = BAR_RISK_X + (15 / MAX_RISK_PCT) * BAR_RISK_PX
        const daOecdX = BAR_DA_X + (25 / MAX_DA_PCT) * BAR_DA_PX
        const y1 = PAD_T - 2
        const y2 = PAD_T + ADMINS.length * (ROW_H + ROW_GAP) - 4
        return (
          <>
            <line x1={riskOecdX} y1={y1} x2={riskOecdX} y2={y2}
              stroke="#22d3ee" strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.55} />
            <text x={riskOecdX + 2} y={y2 + 10} fill="#22d3ee" fontSize={8}
              fontFamily="var(--font-family-mono, monospace)" fillOpacity={0.75}>
              {lang === 'en' ? 'OECD 15%' : 'OCDE 15%'}
            </text>
            <line x1={daOecdX} y1={y1} x2={daOecdX} y2={y2}
              stroke="#22d3ee" strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.55} />
            <text x={daOecdX + 2} y={y2 + 10} fill="#22d3ee" fontSize={8}
              fontFamily="var(--font-family-mono, monospace)" fillOpacity={0.75}>
              {lang === 'en' ? 'OECD 25%' : 'OCDE 25%'}
            </text>
          </>
        )
      })()}

      {/* Legend: 1 dot = ~2.25% */}
      <text x={BAR_RISK_X} y={PAD_T - 8} fill="#52525b" fontSize={8}
        fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? '1 dot ≈ 2.25%' : '1 punto ≈ 2.25%'}
      </text>

      {/* ── Rows ───────────────────────────────────────────────────────── */}
      {ADMINS.map((a, idx) => {
        const rowY = PAD_T + idx * (ROW_H + ROW_GAP)
        const cy   = rowY + ROW_H / 2
        const isMaxRisk = a.highRiskPct === maxRiskPct
        const isLast = idx === ADMINS.length - 1

        const riskFilled = Math.round((Math.min(a.highRiskPct, MAX_RISK_PCT) / MAX_RISK_PCT) * N_RISK)
        const daFilled   = a.directAwardPct > 0
          ? Math.round((Math.min(a.directAwardPct, MAX_DA_PCT) / MAX_DA_PCT) * N_DA)
          : 0
        const riskAlpha  = isMaxRisk ? 1.0 : 0.72

        const isSheinbaum = idx === ADMINS.length - 1
        const spendLabel = `${fmtB(a.value)}${isSheinbaum ? '*' : ''}`

        return (
          <g key={a.name}>
            {/* AMLO outlier — very faint amber wash behind the entire row */}
            {isMaxRisk && (
              <rect
                x={0}
                y={rowY - ROW_GAP / 2}
                width={SVG_W}
                height={ROW_H + ROW_GAP}
                fill="#f59e0b"
                fillOpacity={0.04}
              />
            )}

            {/* Party color tab */}
            <rect x={0} y={rowY} width={PARTY_TAB_W} height={ROW_H} fill={a.partyColor} fillOpacity={0.9} />

            {/* Name */}
            <text x={LABEL_X} y={rowY + 14} fill={TEXT_COLOR} fontSize={12}
              fontFamily="var(--font-family-serif, Georgia, serif)" fontWeight="600">
              {a.name}
            </text>
            {/* Years + party + spend */}
            <text x={LABEL_X} y={rowY + 27} fill={MUTED_COLOR} fontSize={9}
              fontFamily="var(--font-family-mono, monospace)" letterSpacing="0.04em">
              {a.years} · {a.party} · {spendLabel}
            </text>

            {/* Risk dot strip */}
            {Array.from({ length: N_RISK }).map((_, i) => (
              <circle
                key={`r${i}`}
                cx={BAR_RISK_X + i * DOT_GAP + DOT_R}
                cy={cy}
                r={DOT_R}
                fill={i < riskFilled ? RISK_COLOR : EMPTY_DOT}
                stroke={i < riskFilled ? undefined : EMPTY_STROKE}
                strokeWidth={i < riskFilled ? 0 : 0.5}
                fillOpacity={i < riskFilled ? riskAlpha : 1}
              />
            ))}

            {/* Risk % label */}
            <text
              x={BAR_RISK_X + BAR_RISK_PX + 6}
              y={cy + 4}
              fill={isMaxRisk ? RISK_COLOR : TEXT_COLOR}
              fontSize={isMaxRisk ? 13 : 11}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={isMaxRisk ? 'bold' : 'normal'}
            >
              {a.highRiskPct.toFixed(1)}%
            </text>

            {/* DA dot strip or N/D label */}
            {a.directAwardPct > 0 ? (
              <>
                {Array.from({ length: N_DA }).map((_, i) => (
                  <circle
                    key={`d${i}`}
                    cx={BAR_DA_X + i * DOT_GAP + DOT_R}
                    cy={cy}
                    r={DOT_R}
                    fill={i < daFilled ? DA_COLOR : EMPTY_DOT}
                    stroke={i < daFilled ? undefined : EMPTY_STROKE}
                    strokeWidth={i < daFilled ? 0 : 0.5}
                    fillOpacity={i < daFilled ? 0.8 : 1}
                  />
                ))}
                <text
                  x={BAR_DA_X + BAR_DA_PX + 6}
                  y={cy + 4}
                  fill={TEXT_COLOR}
                  fontSize={11}
                  fontFamily="var(--font-family-mono, monospace)"
                >
                  {a.directAwardPct.toFixed(1)}%
                </text>
              </>
            ) : (
              <>
                {Array.from({ length: N_DA }).map((_, i) => (
                  <circle
                    key={`d${i}`}
                    cx={BAR_DA_X + i * DOT_GAP + DOT_R}
                    cy={cy}
                    r={DOT_R}
                    fill={EMPTY_DOT}
                    stroke={EMPTY_STROKE}
                    strokeWidth={0.5}
                    fillOpacity={0.4}
                  />
                ))}
                <text
                  x={BAR_DA_X}
                  y={cy + DOT_R + 9}
                  fill="#52525b"
                  fontSize={7}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontStyle="italic"
                >
                  {lang === 'en' ? 'pre-2007 data' : 'datos pre-2007'}
                </text>
              </>
            )}

            {/* Hairline separator */}
            {!isLast && (
              <line
                x1={0} y1={rowY + ROW_H + ROW_GAP / 2}
                x2={SVG_W} y2={rowY + ROW_H + ROW_GAP / 2}
                stroke={GRID_COLOR} strokeWidth={0.5}
              />
            )}
          </g>
        )
      })}

      {/* Footer caption */}
      <text x={LABEL_X} y={SVG_H - 16} fill="#52525b" fontSize={9}
        fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en'
          ? 'AMLO era: 41.8% high-risk · 2.4× Fox era · direct-award data unavailable pre-2007'
          : 'AMLO era: 41.8% high-risk · 2.4× Fox era · direct-award flag ausente pre-2007'}
      </text>
      <text x={LABEL_X} y={SVG_H - 4} fill="#3f3f46" fontSize={8}
        fontFamily="var(--font-family-mono, monospace)" fontStyle="italic">
        {lang === 'en'
          ? '* Sheinbaum: partial term (2025 data through cutoff)'
          : '* Sheinbaum: sexenio parcial (datos 2025 al corte)'}
      </text>
    </svg>
  )
}

export default AdminFingerprints
