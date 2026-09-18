/**
 * BlackoutTimeline — «La Línea del Registro» (gap redesign, 2026-07-03;
 * re-cut as HTML/CSS for PARALLAX Day 2 § Change 2, 2026-09-17).
 *
 * The blackout drawn, not narrated (Reuters «Time of Evidence» mechanic): the
 * official-feed track is a solid rule that runs 2002 → 28 Sep 2025 and STOPS DEAD;
 * a dashed ochre "recovered by RUBLI" track picks up exactly where it dies and runs
 * open-ended to the right. The void is the chart — no linear axis, no year ticks
 * between the break points (this is a diagram, not a scale). Fixed data, no API.
 * No italics (Jul-3 legibility standard).
 *
 * Why this is no longer an SVG: the labels used to live inside a 900×128 viewBox,
 * so they scaled WITH it — `fontSize="9"` renders at ≈3.5px once the plate is
 * ~330px wide (390 viewport), far below the Day-1 10px legibility floor. HTML owns
 * the glyphs now and SVG owns nothing: every label is a real 11px mono text node at
 * every width, while the rules are borders and the geometry stays percentage-based.
 *
 * Layout: the dated annotations sit on the rule at `lg` and above, and become a
 * legend under the tracks below it. `lg` (not `sm`) because the two upper
 * annotations are ~170–195px wide at 11px and are anchored at 44% / 62% — they
 * only clear each other, and the ochre recovery line only clears the right edge,
 * once the plate interior is ≥ ~930px (lg viewport = 1024 − 32 page gutter −
 * 56 PlateFrame padding = 936). The abolition annotation additionally gets its own
 * row above the death annotation, with a longer leader tick, so the pair cannot
 * intersect at any width where the on-rule layout renders.
 */
import { formatNumber } from '@/lib/utils'

// Percentage anchors — the same break points the SVG used (x0 = 0, xBreak = 62%,
// the abolition tick at 44%, the open end at 97%).
const ABOLISHED = 44
const BREAK = 62
const END = 97

// Geometry, in px, on a 128px-tall stage (mirrors the old y1 = 44 / y2 = 96).
const TRACK_1_Y = 44
const TRACK_2_Y = 96

const LABEL = 'font-mono text-[11px]'
const PINNED = `${LABEL} absolute whitespace-nowrap leading-none`

// Story Day 1 § F1: the plate can be drawn in four beats so the el-vacio hero
// can step it as the reader scrolls. `/gap` passes nothing and gets stage 3 —
// today's full drawing — so the page is unchanged.
//   0 the official track alone · 1 + the abolition tick · 2 + the death mark
//   3 + the recovery track
// Staged elements fade rather than mount, so nothing reflows between beats and
// the absolute anchors stay put. Reduced motion drops the fade, not the beat.
const STEP = 'transition-opacity duration-[400ms] ease-out motion-reduce:transition-none'
const on = (visible: boolean) => ({ opacity: visible ? 1 : 0 })

export function BlackoutTimeline({
  totalContracts,
  lang,
  stage = 3,
}: {
  totalContracts: number
  lang: 'en' | 'es'
  /** 0–3. Defaults to the full drawing. */
  stage?: number
}) {
  const es = lang === 'es'
  const total = formatNumber(totalContracts)
  const showAbolition = stage >= 1
  const showDeath = stage >= 2
  const showRecovery = stage >= 3
  const ochre = 'var(--color-accent)'
  const muted = 'var(--color-text-muted)'

  const officialName = es ? 'REGISTRO OFICIAL' : 'OFFICIAL RECORD'
  const recoveredName = es ? 'RECUPERADO POR RUBLI' : 'RECOVERED BY RUBLI'
  const startAnnotation = '2002 · CompraNet'
  const abolishedAnnotation = es ? 'ABR 2025 · abolido por ley' : 'APR 2025 · abolished by law'
  const deathAnnotation = es ? '28 SEP 2025 · último registro' : 'SEP 28 2025 · last record'
  const recoveredAnnotation = es
    ? `29 SEP 2025 → · ${total} adjudicaciones · OCR`
    : `SEP 29 2025 → · ${total} awards · OCR`

  return (
    <div
      role="img"
      aria-label={es
        ? `Línea de tiempo: el feed oficial de CompraNet corre de 2002 al 28 de septiembre de 2025 y termina; una línea punteada muestra ${total} adjudicaciones recuperadas por RUBLI después.`
        : `Timeline: the official CompraNet feed runs 2002 to September 28 2025 and ends; a dashed line shows ${total} awards recovered by RUBLI afterward.`}
    >
      {/* ── the diagram ───────────────────────────────────────────────── */}
      <div aria-hidden="true" className="relative h-[112px] lg:h-[128px]">
        {/* row A — the abolition annotation and its leader tick (on-rule only) */}
        <span
          className={`${PINNED} ${STEP} hidden lg:block`}
          style={{ top: 2, left: `${ABOLISHED}%`, transform: 'translateX(-50%)', color: muted, ...on(showAbolition) }}
        >
          {abolishedAnnotation}
        </span>
        <span
          aria-hidden="true"
          className={`absolute ${STEP} hidden lg:block`}
          style={{ top: 18, left: `${ABOLISHED}%`, width: 1, height: TRACK_1_Y - 18, background: muted, opacity: showAbolition ? 0.6 : 0 }}
        />

        {/* row B — the track-1 name, and the death annotation over the break.
            At 20 (not 26) it clears the 17px death glyph centred on the rule. */}
        <span className={PINNED} style={{ top: 20, left: 0, letterSpacing: '0.16em', color: muted }}>
          {officialName}
        </span>
        <span
          className={`${PINNED} ${STEP} hidden lg:block`}
          style={{ top: 20, left: `${BREAK}%`, transform: 'translateX(-50%)', color: muted, ...on(showDeath) }}
        >
          {deathAnnotation}
        </span>

        {/* track 1 — the official record, a solid rule that stops dead */}
        <span
          aria-hidden="true"
          className="absolute"
          style={{ top: TRACK_1_Y, left: 0, width: `${BREAK}%`, borderTop: `2px solid ${muted}` }}
        />
        <span
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ top: TRACK_1_Y - 2, left: 0, width: 6, height: 6, background: muted }}
        />
        {/* the death mark — two crossed rules, not a glyph: at 11px the mono ×
            reads as a typo, and this beat is the whole point of the plate */}
        {[45, -45].map((deg) => (
          <span
            key={deg}
            aria-hidden="true"
            className={`absolute ${STEP}`}
            style={{
              top: TRACK_1_Y,
              left: `${BREAK}%`,
              width: 19,
              height: 1.6,
              background: muted,
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              ...on(showDeath),
            }}
          />
        ))}
        <span className={PINNED} style={{ top: TRACK_1_Y + 10, left: 0, color: muted }}>
          {startAnnotation}
        </span>

        {/* the connector — from the death down to the recovered track */}
        <span
          aria-hidden="true"
          className={`absolute ${STEP}`}
          style={{
            top: TRACK_1_Y + 9,
            left: `${BREAK}%`,
            height: TRACK_2_Y - TRACK_1_Y - 9,
            borderLeft: `1px dashed ${ochre}`,
            opacity: showRecovery ? 0.6 : 0,
          }}
        />

        {/* track 2 — recovered, picks up where track 1 died, open-ended */}
        <span
          className={`${PINNED} ${STEP}`}
          style={{ top: TRACK_2_Y - 22, left: 0, letterSpacing: '0.16em', color: ochre, ...on(showRecovery) }}
        >
          {recoveredName}
        </span>
        <span
          aria-hidden="true"
          className={`absolute ${STEP}`}
          style={{ top: TRACK_2_Y, left: `${BREAK}%`, width: `${END - BREAK}%`, borderTop: `2px dashed ${ochre}`, ...on(showRecovery) }}
        />
        <span
          aria-hidden="true"
          className={`absolute font-mono leading-none ${STEP}`}
          style={{
            top: TRACK_2_Y,
            left: `${END}%`,
            transform: 'translate(-30%, -50%)',
            fontSize: 17,
            color: ochre,
            ...on(showRecovery),
          }}
        >
          →
        </span>
        <span
          className={`${PINNED} ${STEP} hidden lg:block`}
          style={{ top: TRACK_2_Y + 10, left: `${BREAK}%`, color: ochre, ...on(showRecovery) }}
        >
          {recoveredAnnotation}
        </span>
      </div>

      {/* ── below lg: the three break annotations that leave the rule become a
            legend, so nothing can overlap and nothing overflows the plate.
            `startAnnotation` is not here — it stays pinned at left:0, where it
            fits at every width. ── */}
      <ul aria-hidden="true" className={`${LABEL} lg:hidden mt-1 space-y-1 leading-snug`}>
        <li className={STEP} style={{ color: muted, ...on(showAbolition) }}>{abolishedAnnotation}</li>
        <li className={STEP} style={{ color: muted, ...on(showDeath) }}>{deathAnnotation}</li>
        <li className={STEP} style={{ color: ochre, ...on(showRecovery) }}>{recoveredAnnotation}</li>
      </ul>
    </div>
  )
}
