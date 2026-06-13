/**
 * ModelTimeline — "The Model Research Log" (DESIGNUS, /methodology Day-7, W3).
 *
 * Replaces the old `ModelEvolutionTimeline` (a clipped `overflow-x-auto` row of
 * w-40 cards that hid the ACTIVE v0.8.5 card off the right edge). Reuters
 * *Carbon's Casualties / Time of Evidence* mechanic: a continuous date axis with
 * "present = right terminus" — v0.8.5 lands exactly at the plot's right edge so
 * "where the model is now" reads first.
 *
 * Axis: 2026-02-01 → 2026-05-02, TOTAL_DAYS=90. The three month-only February
 * iterations (v3.3/v4.0/v5.0) are an honest "February flurry" cluster at day 0
 * (no fabricated day-gaps); only day-resolved releases plot at true positions.
 *
 * Desktop = SVG date axis; <sm = a vertical-stack fallback (decided up front —
 * not a scaled axis with sub-32px labels). No API; no horizontal scroll.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch } from 'lucide-react'

type Kind = 'superseded' | 'overlay' | 'active'

interface Step {
  version: string
  day: number          // days since 2026-02-01 (axis origin)
  dateLabel: string
  titleKey: string
  descKey: string
  metric: string
  kind: Kind
  cluster?: boolean    // the February flurry (snapped to day 0, no real day)
}

// Chronological. Fixes the old array's v0.6.5-after-v5.1 inversion.
const STEPS: Step[] = [
  { version: 'v3.3', day: 0, dateLabel: 'Feb 2026', titleKey: 'v33Title', descKey: 'v33Desc', metric: 'AUC 0.584', kind: 'superseded', cluster: true },
  { version: 'v4.0', day: 0, dateLabel: 'Feb 2026', titleKey: 'v40Title', descKey: 'v40Desc', metric: 'AUC 0.942', kind: 'superseded', cluster: true },
  { version: 'v5.0', day: 0, dateLabel: 'Feb 2026', titleKey: 'v50Title', descKey: 'v50Desc', metric: 'AUC 0.960', kind: 'superseded', cluster: true },
  { version: 'v5.1', day: 26, dateLabel: 'Feb 27, 2026', titleKey: 'v51Title', descKey: 'v51Desc', metric: 'AUC 0.957 (temporal)', kind: 'superseded' },
  { version: 'v5.2 layer', day: 34, dateLabel: 'Mar 7, 2026', titleKey: 'v52Title', descKey: 'v52Desc', metric: '~130K dual-confirmed', kind: 'overlay' },
  { version: 'v0.6.5', day: 52, dateLabel: 'Mar 25, 2026', titleKey: 'v60Title', descKey: 'v60Desc', metric: 'AUC 0.828 (test)', kind: 'superseded' },
  { version: 'v0.8.5', day: 90, dateLabel: 'May 2, 2026', titleKey: 'v85Title', descKey: 'v85Desc', metric: 'AUC 0.785 (test)', kind: 'active' },
]

const VW = 760
const PAD_L = 24
const PAD_R = 88
const PLOT = VW - PAD_L - PAD_R // 648
const TOTAL_DAYS = 90
const AXIS_Y = 116
const ZINC = '#71717a'
const OCHRE = '#a06820'
const x = (day: number) => PAD_L + (day / TOTAL_DAYS) * PLOT

// Month ticks (Feb/Mar/Apr); NOW sits at the terminus.
const MONTH_TICKS = [
  { day: 0, label: 'Feb' },
  { day: 28, label: 'Mar' },
  { day: 59, label: 'Apr' },
]

export function ModelTimeline() {
  const { t } = useTranslation('methodology')
  const active = STEPS.find((s) => s.kind === 'active')!
  const [hovered, setHovered] = useState<string>(active.version)
  const shown = STEPS.find((s) => s.version === hovered) ?? active
  const dayResolved = STEPS.filter((s) => !s.cluster)
  const cluster = STEPS.filter((s) => s.cluster)

  return (
    <div className="fern-card">
      <div className="px-5 pt-4 pb-3">
        <div className="editorial-rule mb-2">
          <GitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="editorial-label text-accent">{t('evolution.title')}</span>
        </div>
        <p className="text-xs text-text-muted">{t('evolution.subtitle')}</p>
      </div>

      {/* ── Desktop: Reuters annotated date axis ───────────────────────── */}
      <div className="hidden sm:block px-5 pb-4">
        <svg viewBox={`0 0 ${VW} 180`} width="100%" role="img" aria-label={t('evolution.title')} style={{ overflow: 'visible' }}>
          {/* axis baseline */}
          <line x1={PAD_L} y1={AXIS_Y} x2={x(90)} y2={AXIS_Y} stroke="var(--color-border)" strokeWidth={1} />
          {/* month ticks */}
          {MONTH_TICKS.map((m) => (
            <g key={m.label}>
              <line x1={x(m.day)} y1={AXIS_Y - 3} x2={x(m.day)} y2={AXIS_Y + 3} stroke="var(--color-border)" strokeWidth={1} />
              <text x={x(m.day)} y={AXIS_Y + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">{m.label}</text>
            </g>
          ))}
          {/* NOW gridline + label at the terminus */}
          <line x1={x(90)} y1={28} x2={x(90)} y2={AXIS_Y} stroke={OCHRE} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
          <text x={x(90)} y={AXIS_Y + 16} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing="0.12em" fontFamily="var(--font-family-mono, monospace)" fill={OCHRE}>{t('evolution.axisNow')}</text>

          {/* February flurry cluster — 3 superseded iterations, no real day */}
          <g>
            {cluster.map((s, i) => (
              <circle key={s.version} cx={PAD_L + i * 5} cy={AXIS_Y} r={3} fill={ZINC} opacity={0.55} />
            ))}
            <text x={PAD_L} y={AXIS_Y - 14} fontSize={9} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">
              Feb · v3.3 / v4.0 / v5.0
            </text>
          </g>

          {/* day-resolved dots */}
          {dayResolved.map((s) => {
            const isActive = s.kind === 'active'
            const cx = x(s.day)
            const fill = isActive ? OCHRE : ZINC
            return (
              <g
                key={s.version}
                tabIndex={0}
                role="button"
                aria-label={`${s.version} · ${s.dateLabel} · ${s.metric}`}
                onMouseEnter={() => setHovered(s.version)}
                onFocus={() => setHovered(s.version)}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {/* hit area */}
                <rect x={cx - 14} y={AXIS_Y - 34} width={28} height={56} fill="transparent" />
                {isActive && <circle cx={cx} cy={AXIS_Y} r={10} fill="none" stroke={OCHRE} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />}
                <circle
                  cx={cx} cy={AXIS_Y} r={isActive ? 6 : 4}
                  fill={s.kind === 'overlay' ? 'none' : fill}
                  stroke={s.kind === 'overlay' ? ZINC : 'none'}
                  strokeWidth={s.kind === 'overlay' ? 1.5 : 0}
                  strokeDasharray={s.kind === 'overlay' ? '2 2' : undefined}
                />
                {/* version chip above */}
                <text
                  x={cx} y={AXIS_Y - 16} textAnchor={isActive ? 'end' : 'middle'}
                  fontSize={10} fontWeight={isActive ? 700 : 500}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={isActive ? OCHRE : (hovered === s.version ? 'var(--color-text-primary)' : 'var(--color-text-secondary)')}
                >
                  {s.version}
                </text>
                {/* active terminus: ACTIVE pin + metric (always visible) */}
                {isActive && (
                  <>
                    <text x={cx} y={AXIS_Y - 30} textAnchor="end" fontSize={8} fontWeight={700} letterSpacing="0.12em" fontFamily="var(--font-family-mono, monospace)" fill={OCHRE}>
                      {t('evolution.active')}
                    </text>
                    <text x={cx} y={AXIS_Y + 30} textAnchor="end" fontSize={10} fontWeight={700} fontFamily="var(--font-family-mono, monospace)" fill={OCHRE}>
                      {s.metric}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {/* hover/focus detail strip (reserved band — no layout shift) */}
        <div className="mt-1 min-h-[3.25rem] border-t border-border/30 pt-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-bold" style={{ color: shown.kind === 'active' ? OCHRE : 'var(--color-text-secondary)' }}>
              {shown.version}
            </span>
            <span className="font-mono text-[10px] text-text-muted">{shown.dateLabel}</span>
            <span className="font-mono text-[10px] text-text-muted">· {shown.metric}</span>
          </div>
          <p className="text-xs text-text-primary font-medium mt-0.5">{t(`evolution.steps.${shown.titleKey}`)}</p>
          <p className="text-xs text-text-muted leading-relaxed">{t(`evolution.steps.${shown.descKey}`)}</p>
        </div>
      </div>

      {/* ── Mobile (<sm): vertical stack — decided up front (no scaled axis) ── */}
      <div className="sm:hidden px-5 pb-5 space-y-2">
        <div className="rounded-sm border border-border/40 bg-background-elevated/20 p-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Feb 2026</p>
          <p className="text-[11px] text-text-secondary mt-0.5">v3.3 · v4.0 · v5.0 — {t('evolution.subtitle')}</p>
        </div>
        {dayResolved.map((s) => {
          const isActive = s.kind === 'active'
          return (
            <div
              key={s.version}
              className="rounded-sm border p-2.5"
              style={{
                borderColor: isActive ? `${OCHRE}66` : 'var(--color-border)',
                background: isActive ? `${OCHRE}0d` : 'transparent',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] font-bold" style={{ color: isActive ? OCHRE : 'var(--color-text-secondary)' }}>{s.version}</span>
                <span className="font-mono text-[10px] text-text-muted">{s.dateLabel}</span>
              </div>
              <p className="text-xs text-text-primary font-medium mt-1">{t(`evolution.steps.${s.titleKey}`)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px]" style={{ color: isActive ? OCHRE : 'var(--color-text-muted)' }}>{s.metric}</span>
                {isActive && (
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ color: OCHRE, background: `${OCHRE}1a` }}>
                    {t('evolution.active')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ModelTimeline
