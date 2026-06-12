/**
 * LA MESETA — positional rug for the within-tier IPS plateau (graft from
 * «La Criba»). Renders the page's IPS distribution ONCE, honestly: a fixed
 * labeled window, one 1.5×8px tick per row (overlaps darken — ties become
 * visibly dense), and a computed modal annotation ("71 empatan en ·86").
 * Precedent: NYT Upshot shared-axis strips. This replaces per-row spread
 * lanes — in a server-sorted register a dot per row would re-encode row
 * order (panel audit, encoding-math dim).
 */

interface MesetaRugProps {
  values: number[]
  isEs: boolean
}

const W = 240
const H = 16
const PAD = 6

export function MesetaRug({ values, isEs }: MesetaRugProps) {
  const vals = values.filter((v) => v != null && Number.isFinite(v))
  if (vals.length < 5) return null

  const lo = Math.floor(Math.min(...vals) * 100) / 100
  const hiRaw = Math.ceil(Math.max(...vals) * 100) / 100
  const hi = hiRaw > lo ? hiRaw : lo + 0.01

  // Modal bucket at 3-decimal (mills) resolution — the tie story.
  const buckets = new Map<number, number>()
  for (const v of vals) {
    const k = Math.round(v * 100)
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  let modalK = 0
  let modalN = 0
  for (const [k, n] of buckets) {
    if (n > modalN) {
      modalK = k
      modalN = n
    }
  }

  const x = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - PAD * 2)
  const fmt2 = (v: number) => '·' + String(Math.round(v * 100)).padStart(2, '0')

  const summary = isEs
    ? `IPS de los ${vals.length} de esta página: ventana ${fmt2(lo)}–${fmt2(hi)}; ${modalN} empatan en ${fmt2(modalK / 100)}.`
    : `IPS of this page's ${vals.length}: window ${fmt2(lo)}–${fmt2(hi)}; ${modalN} tie at ${fmt2(modalK / 100)}.`

  return (
    <div className="hidden sm:flex items-center gap-2.5 min-w-0">
      <svg width={W} height={H} aria-hidden="true" className="shrink-0">
        <line x1={PAD} y1={H - 3.5} x2={W - PAD} y2={H - 3.5} stroke="var(--color-border)" strokeWidth={1} />
        {vals.map((v, i) => (
          <rect
            key={i}
            x={x(v) - 0.75}
            y={3}
            width={1.5}
            height={8}
            fill="var(--color-text-secondary)"
            opacity={0.45}
          />
        ))}
      </svg>
      <span className="font-mono text-[8.5px] text-text-muted leading-tight min-w-0 truncate">
        {isEs
          ? `ventana ${fmt2(lo)}–${fmt2(hi)} · esta página · ${modalN} empatan en ${fmt2(modalK / 100)}`
          : `window ${fmt2(lo)}–${fmt2(hi)} · this page · ${modalN} tie at ${fmt2(modalK / 100)}`}
      </span>
      <span className="sr-only">{summary}</span>
    </div>
  )
}
