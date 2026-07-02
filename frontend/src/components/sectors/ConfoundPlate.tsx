/**
 * ConfoundPlate — §B of /sectors WHO "El Libro Mayor de la Exposición".
 *
 * The centrepiece plate of the Confounded Ledger redesign (DESIGNUS panel,
 * winner [plate] + judge amendments). Twelve rows, each carrying TWO markers
 * on TWO scales sharing one baseline:
 *
 *   Lane 1 — absolute VaR, LOG scale (filled dot ●, RISK_COLORS.critical).
 *            Log rescues ranks 4–12 from the linear sliver-collapse: an 80×
 *            leader-to-tail spread becomes ~1.9 readable decades.
 *   Lane 2 — exposure over the sector's OWN spend, linear 0–100% (hollow
 *            ring ○, intensity-colored). The ½-of-own-spend flag is pinned
 *            at 50%; only Hacienda crosses it — the scandal made geometric.
 *
 * Named precedents (folio skill citation discipline):
 *   FT Visual Vocabulary Cleveland dumbbell (two markers, two scales, one
 *   row spine) · NYT Upshot annotated dot strip (log position + named
 *   callouts on the plate) · Reuters Forever Pollution (named outliers only
 *   at the breaks — exactly two annotations).
 *
 * Per the judge's directives: NO cross-gutter "disagreement connector"
 * (its length encoded inverse-VaR garbage), solid Lane-1 dot (no two-tone
 * core at r=5), sort lens URL-synced (?lens=var|intensity) with a ~280ms
 * FLIP reorder.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { LedgerRow } from './ExposureLedger'
import { intensityColor } from './ExposureLedger'
import { makeLogFrac, ownSpendShare, orderForLens } from './confoundScales'
import type { PlateLens } from './confoundScales'

const ROW_H = 44
// Shared column template: rank · name · lane1 (log VaR) · gutter · lane2 (own-spend) · readout
const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '26px 138px minmax(0,1fr) 26px 200px 58px',
  columnGap: 10,
  alignItems: 'center',
}

// Lane-1 axis ticks, in MXN. Labels render as 0.1 · 0.5 · 1 (billones / trillions).
const VAR_TICKS = [1e11, 5e11, 1e12]

const SERIF_NAME: React.CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 500,
}

const MONO_MICRO: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

/**
 * OwnSpendTrack — the single Lane-2 sub-component, shared with §C
 * (SelfCaptureBand). One hairline track 0–100%, the ½ + 80% editorial flags,
 * and a hollow intensity ring at the sector's own-spend share.
 */
export function OwnSpendTrack({
  share,
  ringColor,
  height = 28,
}: {
  share: number
  ringColor: string
  height?: number
}) {
  return (
    <div className="relative w-full" style={{ height }} aria-hidden="true">
      {/* track */}
      <span
        className="absolute left-0 right-0"
        style={{ top: '50%', height: 1, background: 'var(--color-border)' }}
      />
      {/* ½ + 80% flags */}
      <span
        className="absolute inset-y-0"
        style={{ left: '50%', width: 1, background: 'var(--color-text-primary)', opacity: 0.16 }}
      />
      <span
        className="absolute inset-y-0"
        style={{ left: '80%', width: 1, background: 'var(--color-text-primary)', opacity: 0.09 }}
      />
      {/* hollow intensity ring */}
      <span
        className="absolute rounded-full"
        style={{
          left: `${share * 100}%`,
          top: '50%',
          width: 10,
          height: 10,
          transform: 'translate(-50%, -50%)',
          border: `1.5px solid ${ringColor}`,
          background: 'var(--color-background)',
        }}
      />
    </div>
  )
}

export function ConfoundPlate({
  rows,
  lang,
  lens,
  onLensChange,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
  lens: PlateLens
  onLensChange: (l: PlateLens) => void
}) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<number | null>(null)

  const logFrac = useMemo(() => makeLogFrac(rows), [rows])
  const ordered = useMemo(() => orderForLens(rows, lens), [rows, lens])
  const orderIndex = useMemo(
    () => new Map(ordered.map((r, i) => [r.sectorId, i])),
    [ordered],
  )

  // The two named outliers — computed argmax, never hardcoded (Reuters
  // discipline: annotate the breaks only).
  const maxVarId = useMemo(
    () => (rows.length ? [...rows].sort((a, b) => b.varMxn - a.varMxn)[0].sectorId : null),
    [rows],
  )
  const maxIntId = useMemo(
    () =>
      rows.length
        ? [...rows].sort((a, b) => ownSpendShare(b) - ownSpendShare(a))[0].sectorId
        : null,
    [rows],
  )

  if (rows.length === 0) return null

  const isEs = lang === 'es'

  const caption = isEs
    ? 'Dos escalas, una línea: monto observado (●, log) contra saturación del gasto propio (○). Casi todo el registro rebasa la bandera de ½ — el modelo pondera anomalías de monto alto — pero ninguna argolla llega tan lejos como la de mayor saturación. Cambie el orden a intensidad y mire la inversión.'
    : 'Two scales, one line: flagged amount (●, log) against saturation of own spend (○). Nearly the whole registry clears the ½ flag — the model weights high-value anomalies — but no ring reaches as far as the saturation leader. Flip the sort to intensity and watch the inversion.'

  const sortControl = (
    <div className="flex items-center gap-1" role="group" aria-label={isEs ? 'Ordenar el registro' : 'Sort the registry'}>
      <span className="font-mono" style={{ ...MONO_MICRO, fontSize: 9, color: 'var(--color-text-muted)' }}>
        {isEs ? 'Ordenar' : 'Sort'}
      </span>
      {(
        [
          { key: 'var' as PlateLens, es: 'VaR ↓', en: 'VaR ↓' },
          { key: 'intensity' as PlateLens, es: 'Intensidad ↓', en: 'Intensity ↓' },
        ]
      ).map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={() => onLensChange(b.key)}
          aria-pressed={lens === b.key}
          className="px-2 py-1 font-mono rounded-sm border transition-colors"
          style={{
            ...MONO_MICRO,
            fontSize: 9,
            fontWeight: 700,
            ...(lens === b.key
              ? { background: 'var(--color-text-primary)', color: 'var(--color-background)', borderColor: 'transparent' }
              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }),
          }}
        >
          {isEs ? b.es : b.en}
        </button>
      ))}
    </div>
  )

  return (
    <PlateFrame
      lang={lang}
      folio="II·b"
      contextLabel={{ en: 'Registry of sector exposure', es: 'Registro de exposición sectorial' }}
      caption={caption}
    >
      {/* ── How to read — plain-language key (both breakpoints) ────────────
          The plate's whole trick is two markers on two scales; spell it out
          so the reader can name what ● and ○ mean before decoding any row. */}
      <div className="mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="font-mono mb-2" style={{ ...MONO_MICRO, fontSize: 9, color: 'var(--color-text-muted)' }}>
          {isEs ? 'Cómo leer · dos marcadores, dos preguntas' : 'How to read · two markers, two questions'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-7">
          <span className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="shrink-0 self-center rounded-full"
              style={{ width: 9, height: 9, background: RISK_COLORS.critical }}
            />
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13.5, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)', fontStyle: 'italic', fontWeight: 600 }}>
                {isEs ? '¿Cuánto dinero?' : 'How much money?'}
              </strong>{' '}
              {isEs ? 'pesos que el modelo observa. Escala log: cada paso vale 10×.' : 'pesos the model flags for review. Log scale — each step is 10× the last.'}
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="shrink-0 self-center rounded-full"
              style={{ width: 9, height: 9, border: '1.5px solid var(--color-text-secondary)', background: 'var(--color-background)' }}
            />
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13.5, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)', fontStyle: 'italic', fontWeight: 600 }}>
                {isEs ? '¿Qué tan saturado?' : 'How saturated?'}
              </strong>{' '}
              {isEs ? 'qué parte del gasto propio del sector está señalada (0–100%).' : "the share of the sector's own spend that's flagged (0–100%)."}
            </span>
          </span>
        </div>
        <p
          className="mt-2"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.45, color: 'var(--color-text-muted)', maxWidth: '72ch' }}
        >
          {isEs
            ? 'Son dos rankings distintos. Cuando no coinciden, el sector es chico en pesos pero arde en su propia casa — eso es el confundido.'
            : "They're two different rankings. When they disagree, a sector is small in pesos but burning hot in its own house — that's the confound."}
        </p>
      </div>

      {/* ── Desktop plate (md+) ──────────────────────────────────────────── */}
      <div className="hidden md:block">
        {/* Sort control — its own full-width row, right-aligned */}
        <div className="flex justify-end mb-2">{sortControl}</div>

        {/* Header strip: lane captions on top, editorial flags below */}
        <div style={GRID} className="mb-1">
          <span />
          <span />
          <span className="relative self-stretch" style={{ minHeight: 42 }}>
            <span
              className="absolute top-0 left-0 font-mono whitespace-nowrap"
              style={{ ...MONO_MICRO, fontSize: 9, color: 'var(--color-text-muted)' }}
            >
              ● {isEs ? 'Monto observado · log' : 'Flagged amount · log'}
            </span>
          </span>
          <span />
          <span className="relative self-stretch" style={{ minHeight: 42 }}>
            <span
              className="absolute top-0 left-0 font-mono whitespace-nowrap"
              style={{ ...MONO_MICRO, fontSize: 9, color: 'var(--color-text-muted)' }}
            >
              ○ {isEs ? '% del gasto propio' : '% of own spend'}
            </span>
            {/* ½ flag label */}
            <span
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
              aria-hidden="true"
            >
              <span className="flex items-baseline gap-1 whitespace-nowrap">
                <span
                  style={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  ½
                </span>
                <span className="font-mono" style={{ ...MONO_MICRO, fontSize: 8, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'gasto propio' : 'own spend'}
                </span>
              </span>
              <span style={{ width: 1, height: 5, marginTop: 2, background: 'rgba(160, 104, 32, 0.7)' }} />
            </span>
            {/* 80% flag label */}
            <span
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: '80%', transform: 'translateX(-50%)', opacity: 0.6 }}
              aria-hidden="true"
            >
              <span className="font-mono whitespace-nowrap" style={{ ...MONO_MICRO, fontSize: 8, color: 'var(--color-text-muted)' }}>
                80%
              </span>
              <span style={{ width: 1, height: 5, marginTop: 2, background: 'rgba(160, 104, 32, 0.45)' }} />
            </span>
          </span>
          <span />
        </div>

        {/* Rows — absolutely positioned for the FLIP sort transition */}
        <div
          role="list"
          className="relative"
          style={{ height: rows.length * ROW_H }}
          onMouseLeave={() => setHovered(null)}
        >
          {rows.map((r) => {
            const idx = orderIndex.get(r.sectorId) ?? 0
            const share = ownSpendShare(r)
            const dotFrac = logFrac(r.varMxn)
            const ringColor = intensityColor(r.avgRiskScore)
            const sector = SECTOR_COLORS[r.sectorCode] ?? SECTOR_COLORS.otros
            const isHover = hovered === r.sectorId
            const dimmed = hovered !== null && !isHover
            const sharePct = (share * 100).toFixed(0)

            const aria = isEs
              ? `${r.name} — ${formatCompactMXN(r.varMxn)} monto observado · ${sharePct}% de su propio gasto`
              : `${r.name} — ${formatCompactMXN(r.varMxn)} flagged amount · ${sharePct}% of its own spend`

            return (
              <div
                key={r.sectorId}
                role="listitem"
                className="absolute inset-x-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                style={{
                  height: ROW_H,
                  transform: `translateY(${idx * ROW_H}px)`,
                  transition: 'transform 280ms cubic-bezier(0.2, 0, 0.2, 1), opacity 140ms ease',
                  opacity: dimmed ? 0.45 : 1,
                  borderBottom: '1px solid var(--color-border)',
                }}
                tabIndex={0}
                aria-label={aria}
                onMouseEnter={() => setHovered(r.sectorId)}
                onFocus={() => setHovered(r.sectorId)}
                onBlur={() => setHovered(null)}
                onClick={() => navigate(`/sectors/${r.sectorId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/sectors/${r.sectorId}`)
                  }
                }}
              >
                <div style={{ ...GRID, height: '100%' }}>
                  {/* rank in the ACTIVE lens */}
                  <span className="font-mono tabular-nums text-right" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* name + sector rule */}
                  <span
                    className="truncate"
                    style={{
                      ...SERIF_NAME,
                      fontSize: 15,
                      color: 'var(--color-text-primary)',
                      borderLeft: `3px solid ${sector}`,
                      paddingLeft: 8,
                      textDecoration: isHover ? 'underline' : 'none',
                      textUnderlineOffset: 2,
                      textDecorationThickness: 1,
                    }}
                  >
                    {r.name}
                  </span>

                  {/* Lane 1 — log VaR */}
                  <span className="relative h-full block">
                    {/* stem: reach from 0 to the dot */}
                    <span
                      className="absolute"
                      style={{
                        left: 0,
                        width: `${dotFrac * 100}%`,
                        top: '50%',
                        height: 1,
                        background: sector,
                        opacity: isHover ? 0.7 : 0.35,
                      }}
                    />
                    {/* filled VaR dot */}
                    <span
                      className="absolute rounded-full"
                      style={{
                        left: `${dotFrac * 100}%`,
                        top: '50%',
                        width: isHover ? 13 : 10,
                        height: isHover ? 13 : 10,
                        transform: 'translate(-50%, -50%)',
                        background: RISK_COLORS.critical,
                        transition: 'width 140ms ease, height 140ms ease',
                      }}
                    />
                    {/* hover readout: the VaR value, beside the dot */}
                    {isHover && (
                      <span
                        className="absolute font-mono tabular-nums whitespace-nowrap"
                        style={{
                          left: dotFrac < 0.62 ? `calc(${dotFrac * 100}% + 12px)` : undefined,
                          right: dotFrac >= 0.62 ? `calc(${(1 - dotFrac) * 100}% + 12px)` : undefined,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 10,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {formatCompactMXN(r.varMxn)}
                      </span>
                    )}
                    {/* named outlier — largest volume */}
                    {r.sectorId === maxVarId && !isHover && (
                      <span
                        className="absolute font-mono whitespace-nowrap"
                        style={{
                          right: `calc(${(1 - dotFrac) * 100}% + 12px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 8.5,
                          fontStyle: 'italic',
                          letterSpacing: '0.06em',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {isEs ? 'mayor volumen —' : 'largest volume —'}
                      </span>
                    )}
                  </span>

                  {/* gutter — deliberately empty (the judge excised the connector) */}
                  <span />

                  {/* Lane 2 — own-spend share */}
                  <span className="relative h-full block">
                    {/* track */}
                    <span className="absolute left-0 right-0" style={{ top: '50%', height: 1, background: 'var(--color-border)' }} />
                    {/* ½ + 80% flag hairlines (per-row → continuous column) */}
                    <span className="absolute inset-y-0" style={{ left: '50%', width: 1, background: 'var(--color-text-primary)', opacity: 0.14 }} />
                    <span className="absolute inset-y-0" style={{ left: '80%', width: 1, background: 'var(--color-text-primary)', opacity: 0.08 }} />
                    {/* hollow intensity ring */}
                    <span
                      className="absolute rounded-full"
                      style={{
                        left: `${share * 100}%`,
                        top: '50%',
                        width: isHover ? 13 : 10,
                        height: isHover ? 13 : 10,
                        transform: 'translate(-50%, -50%)',
                        border: `1.5px solid ${ringColor}`,
                        background: 'var(--color-background)',
                        transition: 'width 140ms ease, height 140ms ease',
                      }}
                    />
                    {/* named outlier — highest intensity */}
                    {r.sectorId === maxIntId && (
                      <span
                        className="absolute font-mono whitespace-nowrap"
                        style={{
                          right: `calc(${(1 - share) * 100}% + 10px)`,
                          top: 3,
                          fontSize: 8.5,
                          fontStyle: 'italic',
                          letterSpacing: '0.06em',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {isEs ? 'mayor saturación ↘' : 'highest saturation ↘'}
                      </span>
                    )}
                  </span>

                  {/* own-spend % readout */}
                  <span
                    className="text-right tabular-nums"
                    style={{
                      fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: 14,
                      color: ringColor,
                    }}
                  >
                    {sharePct}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Ruler row: lane-1 log ticks + lane-2 quartile ruler */}
        <div style={GRID} className="mt-1" aria-hidden="true">
          <span />
          <span />
          <span className="relative block" style={{ height: 16 }}>
            {VAR_TICKS.map((t) => {
              const f = logFrac(t)
              if (f <= 0 || f >= 1) return null
              return (
                <span key={t} className="absolute flex flex-col items-center" style={{ left: `${f * 100}%`, transform: 'translateX(-50%)' }}>
                  <span style={{ width: 1, height: 4, background: 'var(--color-border)' }} />
                  <span className="font-mono tabular-nums" style={{ fontSize: 8.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {t / 1e12}
                  </span>
                </span>
              )
            })}
            <span
              className="absolute right-0 top-0 font-mono"
              style={{ ...MONO_MICRO, fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.7 }}
            >
              {isEs ? 'billones MXN' : 'trillions MXN'}
            </span>
          </span>
          <span />
          <span className="relative block" style={{ height: 16 }}>
            {[0, 25, 50, 75, 100].map((t) => (
              <span
                key={t}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${t}%`,
                  transform: t === 0 ? 'translateX(0)' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
              >
                <span style={{ width: 1, height: 4, background: 'var(--color-border)' }} />
                <span className="font-mono tabular-nums" style={{ fontSize: 8.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                  {t}
                </span>
              </span>
            ))}
          </span>
          <span />
        </div>
      </div>

      {/* ── Mobile plate (<md): Lane 2 only — intensity is the point ─────── */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          {sortControl}
          <span className="font-mono" style={{ ...MONO_MICRO, fontSize: 8.5, color: 'var(--color-text-muted)' }}>
            ○ {isEs ? '% del gasto propio · bandera = ½' : '% of own spend · flag = ½'}
          </span>
        </div>
        <div role="list">
          {ordered.map((r, idx) => {
            const share = ownSpendShare(r)
            const ringColor = intensityColor(r.avgRiskScore)
            const sector = SECTOR_COLORS[r.sectorCode] ?? SECTOR_COLORS.otros
            return (
              <div
                key={r.sectorId}
                role="listitem"
                tabIndex={0}
                className="py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                style={{ borderBottom: '1px solid var(--color-border)', borderLeft: `3px solid ${sector}`, paddingLeft: 10 }}
                onClick={() => navigate(`/sectors/${r.sectorId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/sectors/${r.sectorId}`)
                  }
                }}
                aria-label={
                  isEs
                    ? `${r.name} — ${formatCompactMXN(r.varMxn)} · ${(share * 100).toFixed(0)}% del gasto propio`
                    : `${r.name} — ${formatCompactMXN(r.varMxn)} · ${(share * 100).toFixed(0)}% of own spend`
                }
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate" style={{ ...SERIF_NAME, fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {r.name}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {formatCompactMXN(r.varMxn)}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: 13,
                      color: ringColor,
                      minWidth: 36,
                      textAlign: 'right',
                    }}
                  >
                    {(share * 100).toFixed(0)}%
                  </span>
                </div>
                <OwnSpendTrack share={share} ringColor={ringColor} height={20} />
              </div>
            )
          })}
        </div>
      </div>
    </PlateFrame>
  )
}
