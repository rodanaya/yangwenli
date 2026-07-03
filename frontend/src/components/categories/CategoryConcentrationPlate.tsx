/**
 * CategoryConcentrationPlate — §B3 "EL CONCENTRADO" centerpiece of the
 * /categories index (DESIGNUS rebuild, Confounded-Ledger family).
 *
 * Extracted verbatim from the inline ConcentrationExhibit (shipped Jun 9 after a
 * user-driven rebuild) and given a SECOND lens. The plate is an instrumented
 * share bar: each segment's WIDTH is its slice of total spend, so the bar's
 * x-axis IS cumulative spend.
 *
 *   - lens="concentration" (default): segments sorted by spend; the ½ / 80%
 *     flags fall at fixed 50% / 80% width and annotate how FEW categories reach
 *     them — exactly the prior exhibit.
 *   - lens="risk" (the honest encoding): segments RE-SORT by avg_risk desc but
 *     WIDTH STAYS spend share. Each head segment gains a 3px top rule in
 *     intensityColor; the flags re-walk cumulative spend in risk order, so
 *     K_r ≫ k50 proves size ≠ risk both visually (fat blocks scatter right) and
 *     numerically. Width is NEVER high_risk_pct × value (that fabricates pesos).
 *
 * Transition: at rest both lenses sum to 100% width; the switch animates each
 * segment (keyed by category_id) via absolute left%/width% with a CSS transition.
 * Mobile (<md): static flex bar, concentration lens only, no toggle.
 *
 * Hover/focus: ONE floating dossier instance keyed by hovered index. The panel
 * is pointer-events-none; clicking/Enter on the segment navigates to the
 * dossier. Hex colours ONLY via style={{}} (className hex is stripped).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SECTOR_COLORS, getSectorName } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { CategorySummaryItem, PlateLens } from './types'
import { CONTRACT_FLOOR, intensityColor } from './types'

const CONC_BAR_H = 46

const sectorFill = (code: string): string => SECTOR_COLORS[code] ?? SECTOR_COLORS.otros

interface PlateSeg {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  value: number
  contracts: number
  avg_risk: number
  rank: number // rank in the ACTIVE lens order (1-based)
  sharePct: number // slice of total spend (constant across lenses)
  startPct: number // cumulative-spend start position, in lens order
  cumPct: number // cumulative-spend up-to-and-including, in lens order
  topRule: string | null // 3px top rule colour (risk lens head only)
}

interface PlateModel {
  segs: PlateSeg[]
  tail: { count: number; value: number; sharePct: number; startPct: number } | null
  total: number
  /** Head-membership flags walked over cumulative spend in the lens order. */
  flagDefs: { x: number; big: string; sub: string }[]
  /** k50 / k80 (concentration order) for the caption prose. */
  k50: number
  k80: number
  /** K at ½ spend, walked in the ACTIVE lens order (== k50 in concentration). */
  kHalfActive: number
}

function buildModel(
  items: CategorySummaryItem[],
  lens: PlateLens,
  isEs: boolean,
): PlateModel {
  // Concentration order is the reference for k50/k80 + head sizing.
  const byValue = [...items].sort((a, b) => b.total_value - a.total_value)
  const total = byValue.reduce((s, c) => s + c.total_value, 0)

  let cum = 0
  let k50 = 0
  let k80 = 0
  for (let i = 0; i < byValue.length; i++) {
    cum += byValue[i].total_value
    if (k50 === 0 && total > 0 && cum / total >= 0.5) k50 = i + 1
    if (k80 === 0 && total > 0 && cum / total >= 0.8) k80 = i + 1
  }
  const head = Math.min(byValue.length, Math.max((k80 || 15) + 3, 16))

  // Active-lens order. Concentration = by value; risk = by avg_risk desc, gated
  // by the contract floor (sub-floor categories fall into the tail).
  let ordered: CategorySummaryItem[]
  if (lens === 'risk') {
    const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    qualified.sort((a, b) => b.avg_risk - a.avg_risk)
    const subFloor = items.filter((c) => c.total_contracts < CONTRACT_FLOOR)
    ordered = [...qualified, ...subFloor]
  } else {
    ordered = byValue
  }

  // Head membership in the active lens.
  const headItems = ordered.slice(0, head)
  const tailItems = ordered.slice(head)

  // Walk cumulative SPEND in the active lens order to position segments.
  let walk = 0
  const segs: PlateSeg[] = headItems.map((c, i) => {
    const sharePct = total > 0 ? (c.total_value / total) * 100 : 0
    const startPct = total > 0 ? (walk / total) * 100 : 0
    walk += c.total_value
    const cumPct = total > 0 ? (walk / total) * 100 : 0
    return {
      category_id: c.category_id,
      name_es: c.name_es,
      name_en: c.name_en,
      sector_code: c.sector_code,
      value: c.total_value,
      contracts: c.total_contracts,
      avg_risk: c.avg_risk,
      rank: i + 1,
      sharePct,
      startPct,
      cumPct,
      topRule: lens === 'risk' ? intensityColor(c.avg_risk) : null,
    }
  })

  const tailValue = tailItems.reduce((s, c) => s + c.total_value, 0)
  const tail =
    tailItems.length > 0
      ? {
          count: tailItems.length,
          value: tailValue,
          sharePct: total > 0 ? (tailValue / total) * 100 : 0,
          startPct: segs.length ? segs[segs.length - 1].cumPct : 0,
        }
      : null

  // K at ½ spend walked in the ACTIVE order (== k50 for concentration).
  let kHalfActive = 0
  let accum = 0
  for (let i = 0; i < ordered.length; i++) {
    accum += ordered[i].total_value
    if (total > 0 && accum / total >= 0.5) {
      kHalfActive = i + 1
      break
    }
  }

  const flagDefs: PlateModel['flagDefs'] =
    lens === 'risk'
      ? ([
          kHalfActive > 0
            ? {
                x: 50,
                big: '½',
                sub: isEs ? `${kHalfActive} categorías por riesgo` : `${kHalfActive} categories by risk`,
              }
            : null,
        ].filter(Boolean) as PlateModel['flagDefs'])
      : ([
          k50 > 0 ? { x: 50, big: '½', sub: isEs ? `${k50} categorías` : `${k50} categories` } : null,
          k80 > 0 ? { x: 80, big: '80%', sub: isEs ? `${k80} categorías` : `${k80} categories` } : null,
        ].filter(Boolean) as PlateModel['flagDefs'])

  return { segs, tail, total, flagDefs, k50, k80, kHalfActive }
}

export function CategoryConcentrationPlate({
  items,
  lang,
  lens,
  onLensChange,
}: {
  items: CategorySummaryItem[]
  lang: 'en' | 'es'
  lens: PlateLens
  onLensChange: (l: PlateLens) => void
}) {
  const isEs = lang === 'es'
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)

  const { segs, tail, total, flagDefs, k50, k80 } = useMemo(
    () => buildModel(items, lens, isEs),
    [items, lens, isEs],
  )

  if (total <= 0) return null

  const TAIL_IDX = segs.length
  const hoverCenter =
    hover === null
      ? null
      : hover === TAIL_IDX && tail
        ? (tail.startPct + 100) / 2
        : segs[hover]
          ? segs[hover].startPct + segs[hover].sharePct / 2
          : null

  const legendSectors = Array.from(new Set(segs.map((s) => s.sector_code)))

  const goTo = (id: number) => navigate(`/categories/${id}`)

  // ── Lens toggle (desktop only) ────────────────────────────────────────────
  const lensBtn = (key: PlateLens, labelEs: string, labelEn: string) => {
    const isActive = lens === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => onLensChange(key)}
        aria-pressed={isActive}
        aria-label={
          isEs
            ? `Ordenar el concentrado por ${labelEs.toLowerCase()}`
            : `Order the concentrate by ${labelEn.toLowerCase()}`
        }
        className="px-2.5 py-1 font-mono transition-colors"
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderRadius: 3,
          border: '1px solid var(--color-border)',
          background: isActive ? 'var(--color-text-primary)' : 'transparent',
          color: isActive ? 'var(--color-background)' : 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
      >
        {isEs ? labelEs : labelEn} ↓
      </button>
    )
  }

  return (
    <div className="relative">
      {/* ── Lens control (md+) ───────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1.5 mb-3" role="group" aria-label={isEs ? 'Lente del concentrado' : 'Concentrate lens'}>
        <span
          className="font-mono mr-1"
          style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'Lente' : 'Lens'}
        </span>
        {lensBtn('concentration', 'Gasto', 'Spend')}
        {lensBtn('risk', 'Riesgo', 'Risk')}
      </div>

      {/* ── Threshold flags (above the bar) ──────────────────────────────── */}
      <div className="relative" style={{ height: 30 }} aria-hidden="true">
        {flagDefs.map((f) => (
          <div
            key={`${f.x}-${f.big}`}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${f.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span
                style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 700, fontSize: 15, lineHeight: 1, color: 'var(--color-text-primary)' }}
              >
                {f.big}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
              >
                {f.sub}
              </span>
            </div>
            <div style={{ width: 1, height: 7, marginTop: 3, background: 'rgba(160, 104, 32, 0.7)' }} />
          </div>
        ))}
      </div>

      {/* ── The bar ──────────────────────────────────────────────────────── */}
      {/* md+: absolute-positioned segments (FLIP-equivalent transition). */}
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <div
          className="hidden md:block relative w-full overflow-hidden"
          style={{ height: CONC_BAR_H, borderRadius: 3, background: 'var(--color-border)' }}
        >
          {segs.map((s, i) => {
            const color = sectorFill(s.sector_code)
            const active = hover === i
            const dim = hover !== null && !active
            const name = isEs ? s.name_es : s.name_en
            return (
              <button
                key={s.category_id}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => goTo(s.category_id)}
                title={`#${s.rank} ${name} · ${s.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(s.value)}`}
                aria-label={`#${s.rank} ${name} · ${s.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(s.value)} · ${isEs ? 'abrir dossier' : 'open dossier'}`}
                className="absolute top-0 h-full block p-0"
                style={{
                  left: `${s.startPct}%`,
                  width: `${Math.max(0, s.sharePct)}%`,
                  minWidth: 2,
                  background: color,
                  border: 0,
                  borderRight: '1px solid var(--color-background)',
                  borderTop: s.topRule ? `3px solid ${s.topRule}` : undefined,
                  opacity: dim ? 0.42 : 1,
                  boxShadow: active ? 'inset 0 3px 0 rgba(255,255,255,0.6)' : 'none',
                  transition:
                    'left 280ms cubic-bezier(0.2,0,0.2,1), width 280ms cubic-bezier(0.2,0,0.2,1), opacity 200ms ease',
                  cursor: 'pointer',
                }}
              >
                {s.sharePct >= 7 && (
                  <span
                    className="absolute font-mono pointer-events-none"
                    style={{
                      left: 5,
                      top: s.topRule ? 7 : 5,
                      right: 5,
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {name}
                  </span>
                )}
              </button>
            )
          })}
          {tail && (
            <button
              type="button"
              onMouseEnter={() => setHover(TAIL_IDX)}
              onFocus={() => setHover(TAIL_IDX)}
              onBlur={() => setHover(null)}
              title={`${tail.count} ${isEs ? 'categorías restantes' : 'remaining categories'} · ${tail.sharePct.toFixed(0)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(tail.value)}`}
              aria-label={`${tail.count} ${isEs ? 'categorías restantes' : 'remaining categories'} · ${tail.sharePct.toFixed(0)}% ${isEs ? 'del gasto' : 'of spend'} · ${formatCompactMXN(tail.value)}`}
              className="absolute top-0 h-full flex items-center justify-center p-0"
              style={{
                left: `${tail.startPct}%`,
                width: `${Math.max(0, tail.sharePct)}%`,
                minWidth: 2,
                background: 'var(--color-text-muted)',
                border: 0,
                opacity: hover !== null && hover !== TAIL_IDX ? 0.28 : 0.42,
                boxShadow: hover === TAIL_IDX ? 'inset 0 3px 0 rgba(255,255,255,0.45)' : 'none',
                transition:
                  'left 280ms cubic-bezier(0.2,0,0.2,1), width 280ms cubic-bezier(0.2,0,0.2,1), opacity 200ms ease',
                cursor: 'default',
              }}
            >
              <span className="font-mono pointer-events-none" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-background)' }}>
                +{tail.count}
              </span>
            </button>
          )}
        </div>

        {/* <md: static flex bar, concentration order only (no transition). */}
        <div
          className="flex md:hidden w-full overflow-hidden"
          style={{ height: CONC_BAR_H, borderRadius: 3, background: 'var(--color-border)' }}
        >
          {segs.map((s) => {
            const color = sectorFill(s.sector_code)
            const name = isEs ? s.name_es : s.name_en
            return (
              <button
                key={s.category_id}
                type="button"
                onClick={() => goTo(s.category_id)}
                title={`#${s.rank} ${name} · ${s.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'}`}
                aria-label={`#${s.rank} ${name} · ${s.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'} · ${isEs ? 'abrir dossier' : 'open dossier'}`}
                className="relative h-full block p-0"
                style={{
                  width: `${s.sharePct}%`,
                  minWidth: 2,
                  background: color,
                  border: 0,
                  borderRight: '1px solid var(--color-background)',
                  cursor: 'pointer',
                }}
              />
            )
          })}
          {tail && (
            <span
              className="relative h-full flex items-center justify-center"
              style={{ width: `${tail.sharePct}%`, minWidth: 2, background: 'var(--color-text-muted)', opacity: 0.42 }}
              aria-hidden="true"
            >
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-background)' }}>
                +{tail.count}
              </span>
            </span>
          )}
        </div>

        {/* ── Hover dossier (single instance, md+) ───────────────────────── */}
        {hover !== null && hoverCenter !== null && (() => {
          const transform =
            hoverCenter > 72
              ? 'translate(-88%, calc(-100% - 10px))'
              : hoverCenter < 28
                ? 'translate(-12%, calc(-100% - 10px))'
                : 'translate(-50%, calc(-100% - 10px))'
          const isTail = hover === TAIL_IDX && tail
          if (isTail && tail) {
            return (
              <div
                className="hidden md:block absolute z-20 pointer-events-none rounded-md border border-border bg-background-card p-3 shadow-xl"
                style={{ left: `${hoverCenter}%`, top: 0, transform, minWidth: 200, maxWidth: 270 }}
              >
                <div
                  className="font-mono mb-1.5"
                  style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
                >
                  {isEs ? 'La cola larga' : 'The long tail'}
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 800, fontSize: 28, lineHeight: 1, color: 'var(--color-text-secondary)' }}
                >
                  {tail.sharePct.toFixed(0)}%
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {isEs
                    ? `${tail.count} categorías más · ${formatCompactMXN(tail.value)}`
                    : `${tail.count} smaller categories · ${formatCompactMXN(tail.value)}`}
                </div>
              </div>
            )
          }
          const s = segs[hover]
          if (!s) return null
          const color = sectorFill(s.sector_code)
          const name = isEs ? s.name_es : s.name_en
          const riskCol = intensityColor(s.avg_risk)
          return (
            <div
              className="hidden md:block absolute z-20 pointer-events-none rounded-md border border-border bg-background-card p-3 shadow-xl"
              style={{ left: `${hoverCenter}%`, top: 0, transform, minWidth: 212, maxWidth: 286 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color }}>
                  #{s.rank}
                </span>
                <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {getSectorName(s.sector_code, lang)}
                </span>
                <span className="h-px flex-1" style={{ background: `${color}55` }} />
              </div>
              <div className="mb-1.5">
                <EntityIdentityChip type="category" id={s.category_id} name={name} size="sm" sectorCode={s.sector_code} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="tabular-nums"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 800, fontSize: 30, lineHeight: 1, color }}
                >
                  {s.sharePct.toFixed(1)}%
                </span>
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'del gasto total' : 'of total spend'}
                </span>
              </div>
              <div className="font-mono mt-1.5 flex items-center gap-2" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <span className="tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCompactMXN(s.value)}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span className="tabular-nums">{formatNumber(s.contracts)} {isEs ? 'cont.' : 'contracts'}</span>
              </div>
              {/* risk atom */}
              <div className="font-mono mt-1 flex items-center gap-1.5" style={{ fontSize: 12 }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 9999, background: riskCol, flexShrink: 0 }} />
                <span className="tabular-nums" style={{ color: riskCol, fontWeight: 700 }}>{s.avg_risk.toFixed(2)}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>· {isEs ? 'indicador de riesgo' : 'risk indicator'}</span>
              </div>
              {/* cumulative-to-here readout */}
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    {isEs ? 'Acumulado hasta aquí' : 'Running total to here'}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {s.cumPct.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, s.cumPct)}%`, background: color, opacity: 0.85 }} />
                </div>
              </div>
              <div
                className="font-mono mt-2"
                style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
              >
                {isEs ? 'Abrir dossier →' : 'Open dossier →'}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Quartile ruler ───────────────────────────────────────────────── */}
      <div className="relative mt-1.5" style={{ height: 14 }} aria-hidden="true">
        {[0, 25, 50, 75, 100].map((t) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${t}%`, transform: t === 0 ? 'translateX(0)' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
          >
            <div style={{ width: 1, height: 4, background: 'var(--color-border)' }} />
            <span className="font-mono" style={{ fontSize: 8.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginTop: 1 }}>
              {t}%
            </span>
          </div>
        ))}
      </div>

      {/* ── Caption + sector legend ──────────────────────────────────────── */}
      <div className="mt-3 flex items-start justify-between gap-x-6 gap-y-2 flex-wrap">
        <p
          className="font-mono"
          style={{ fontSize: 12, lineHeight: 1.55, letterSpacing: '0.02em', color: 'var(--color-text-muted)', maxWidth: '52ch' }}
        >
          {lens === 'risk'
            ? isEs
              ? `Mismo ancho — su tajada del gasto —, pero ahora ordenadas por indicador de riesgo. Las más caras se dispersan a la derecha: el tamaño no es el riesgo. El borde superior tiñe la intensidad.`
              : `Same width — its slice of spend — but now ordered by risk indicator. The most expensive scatter rightward: size is not risk. The top edge tints intensity.`
            : isEs
              ? `Cada bloque es una categoría; su ancho, su tajada del gasto total. Solo ${k50} concentran la mitad y ${k80}, el 80% — pasa el cursor para ver cada una.`
              : `Each block is one category; its width is its slice of total spend. Just ${k50} hold half — ${k80} hold 80%. Hover any block for the detail.`}
        </p>
        <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
          {legendSectors.map((code) => (
            <span key={code} className="flex items-center gap-1.5 font-mono" style={{ fontSize: 13, letterSpacing: '0.03em', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: sectorFill(code), flexShrink: 0 }} />
              {getSectorName(code, lang)}
            </span>
          ))}
          {tail && (
            <span className="flex items-center gap-1.5 font-mono" style={{ fontSize: 13, letterSpacing: '0.03em', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-text-muted)', opacity: 0.42, flexShrink: 0 }} />
              {isEs ? 'resto' : 'rest'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
