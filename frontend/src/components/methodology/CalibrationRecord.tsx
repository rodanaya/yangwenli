/**
 * CalibrationRecord — "the instrument's calibration record" (El Dictamen, Part III).
 *
 * Named precedent: Reuters Graphics annotated time series — editorial moments
 * pinned directly to the line, not stranded in a caption. Replaces the old
 * `ModelEvolutionTimeline` horizontal card carousel.
 *
 * The editorial point: our headline AUC went DOWN on purpose. Early versions
 * (v4.0/v5.0/v5.1) posted inflated AUCs because training and test data shared
 * vendors and time windows. v0.6.5 introduced a vendor-stratified split (the
 * honest correction); v0.8.5 recalibrated on top of it. The drop from 0.957 to
 * 0.828 is not regression — it is the model finally being tested honestly.
 *
 * Static SVG only — no framer-motion, no <circle> (dots are banned on this
 * surface). Vertices are 6px square ticks. Colors applied via `style`, never
 * className. Design spec: methodology-fable-2026-07-02-spec.md §4.2.
 */
import { useTranslation } from 'react-i18next'
import { PlateFrame } from '@/components/atlas/PlateFrame'

type Kind = 'superseded' | 'overlay' | 'active'

interface CalibrationEntry {
  version: string
  day: number // days since the Feb-2026 origin — x-axis position (plotted by date, not array order)
  dateLabel: { en: string; es: string }
  descKey: string // t(`evolution.steps.${descKey}`)
  metric: string // display metric, mono (same both locales — contains "AUC" / numerals)
  auc: number | null // null for v5.2 (overlay — no AUC)
  kind: Kind
}

// Exact mirror of the page's MODEL_EVOLUTION_STEPS facts. v5.2 (Mar 7, day 34)
// predates v0.6.5 (Mar 25, day 52) — plotted by date, not array order.
const CALIBRATION_LOG: CalibrationEntry[] = [
  { version: 'v3.3', day: 0, dateLabel: { en: 'Feb 2026', es: 'feb 2026' }, descKey: 'v33Desc', metric: 'AUC 0.584', auc: 0.584, kind: 'superseded' },
  { version: 'v4.0', day: 6, dateLabel: { en: 'Feb 2026', es: 'feb 2026' }, descKey: 'v40Desc', metric: 'AUC 0.942', auc: 0.942, kind: 'superseded' },
  { version: 'v5.0', day: 12, dateLabel: { en: 'Feb 2026', es: 'feb 2026' }, descKey: 'v50Desc', metric: 'AUC 0.960', auc: 0.960, kind: 'superseded' },
  { version: 'v5.1', day: 26, dateLabel: { en: 'Feb 27, 2026', es: '27 feb 2026' }, descKey: 'v51Desc', metric: 'AUC 0.957 (temporal)', auc: 0.957, kind: 'superseded' },
  { version: 'v5.2', day: 34, dateLabel: { en: 'Mar 7, 2026', es: '7 mar 2026' }, descKey: 'v52Desc', metric: '~130K dual-confirmed', auc: null, kind: 'overlay' },
  { version: 'v0.6.5', day: 52, dateLabel: { en: 'Mar 25, 2026', es: '25 mar 2026' }, descKey: 'v60Desc', metric: 'AUC 0.828 (test)', auc: 0.828, kind: 'superseded' },
  { version: 'v0.8.5', day: 90, dateLabel: { en: 'May 2, 2026', es: '2 may 2026' }, descKey: 'v85Desc', metric: 'AUC 0.785 (test)', auc: 0.785, kind: 'active' },
]

const OCHRE = '#a06820'
const TOTAL_DAYS = 90

// Chart geometry
const VW = 720
const VH = 300
const PAD_L = 46
const PAD_R = 96
const PLOT_W = VW - PAD_L - PAD_R
const CHART_TOP = 42 // y-pixel for AUC=1.0
const CHART_BOTTOM = 214 // y-pixel for AUC=0.5
const AUC_MIN = 0.5
const AUC_MAX = 1.0

const xPos = (day: number) => PAD_L + (day / TOTAL_DAYS) * PLOT_W
const yPos = (auc: number) => CHART_BOTTOM - ((auc - AUC_MIN) / (AUC_MAX - AUC_MIN)) * (CHART_BOTTOM - CHART_TOP)

const GRIDLINES = [0.6, 0.7, 0.8, 0.9]

export default function CalibrationRecord({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('methodology')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  const lined = CALIBRATION_LOG.filter((e) => e.auc !== null)
  const v52 = CALIBRATION_LOG.find((e) => e.version === 'v5.2')!
  const v51 = CALIBRATION_LOG.find((e) => e.version === 'v5.1')!
  const v40 = CALIBRATION_LOG.find((e) => e.version === 'v4.0')!
  const v65 = CALIBRATION_LOG.find((e) => e.version === 'v0.6.5')!
  const v33 = CALIBRATION_LOG.find((e) => e.version === 'v3.3')!

  const linePath = lined
    .map((e, i) => `${i === 0 ? 'M' : 'L'} ${xPos(e.day)} ${yPos(e.auc!)}`)
    .join(' ')

  const plateCaption =
    lang === 'en'
      ? 'Plate III·a — the calibration record of the instrument, 2026. Test AUC by version; the shaded span marks scores inflated by train/test leakage.'
      : 'Lámina III·a — el historial de calibración del instrumento, 2026. AUC de prueba por versión; la franja sombreada marca puntuaciones infladas por fuga entre entrenamiento y prueba.'

  const ariaLabel =
    lang === 'en'
      ? 'Step chart of test AUC across model versions, annotated with the leakage correction'
      : 'Gráfica escalonada del AUC de prueba por versión del modelo, anotada con la corrección de fuga de información'

  return (
    <div className={className}>
      <PlateFrame
        lang={lang}
        folio="III·a"
        contextLabel={{ en: 'Calibration record', es: 'Historial de calibración' }}
        caption={plateCaption}
      >
        {/* ── Plate headline ─────────────────────────────────────────── */}
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '24px',
            lineHeight: 1.15,
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
          }}
        >
          {lang === 'en'
            ? 'Our headline number went down on purpose.'
            : 'Nuestra cifra principal bajó a propósito.'}
        </p>
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: '15px',
            lineHeight: 1.4,
            color: 'var(--color-text-secondary)',
            maxWidth: '68ch',
            marginBottom: '18px',
          }}
        >
          {lang === 'en'
            ? 'Early versions posted AUC as high as 0.960 — inflated by information leaking between training and test: vendors and time windows shared across the split. v0.6.5 stratified the split; v0.8.5 recalibrated. The honest number is 0.785.'
            : 'Las primeras versiones registraron AUC de hasta 0.960 — inflado por información filtrada entre entrenamiento y prueba: proveedores y ventanas temporales compartidos entre ambos lados. v0.6.5 estratificó la división; v0.8.5 recalibró. El número honesto es 0.785.'}
        </p>

        {/* ── Step chart ──────────────────────────────────────────────── */}
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          className="h-auto"
          role="img"
          aria-label={ariaLabel}
          style={{ overflow: 'visible' }}
        >
          {/* pre-stratification wash — spans v4.0 to v5.1 */}
          <rect
            x={xPos(v40.day)}
            y={CHART_TOP}
            width={xPos(v51.day) - xPos(v40.day)}
            height={CHART_BOTTOM - CHART_TOP}
            fill={OCHRE}
            opacity={0.06}
          />
          <line
            x1={xPos(v40.day)}
            y1={CHART_TOP}
            x2={xPos(v51.day)}
            y2={CHART_TOP}
            stroke={OCHRE}
            strokeWidth={2}
            strokeDasharray="1 3"
            opacity={0.5}
          />
          <text
            x={(xPos(v40.day) + xPos(v51.day)) / 2}
            y={CHART_TOP - 8}
            textAnchor="middle"
            fontSize={9.5}
            fontFamily="var(--font-family-mono, monospace)"
            letterSpacing="0.02em"
            fill={OCHRE}
            opacity={0.85}
          >
            {lang === 'en' ? 'pre-stratification era — AUCs not comparable' : 'época pre-estratificación — AUCs no comparables'}
          </text>

          {/* gridlines */}
          {GRIDLINES.map((g) => (
            <g key={g}>
              <line x1={PAD_L} y1={yPos(g)} x2={xPos(TOTAL_DAYS)} y2={yPos(g)} stroke="var(--color-border)" strokeWidth={1} opacity={0.5} />
              <text x={PAD_L - 8} y={yPos(g) + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)" className="tabular-nums">
                {g.toFixed(1)}
              </text>
            </g>
          ))}

          {/* random-baseline dashed rule at AUC = 0.5 */}
          <line x1={PAD_L} y1={yPos(0.5)} x2={xPos(TOTAL_DAYS)} y2={yPos(0.5)} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
          <text x={xPos(TOTAL_DAYS) + 4} y={yPos(0.5) + 3} fontSize={9} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">
            {lang === 'en' ? 'random = 0.5' : 'azar = 0.5'}
          </text>

          {/* y-axis caption */}
          <text x={PAD_L} y={CHART_TOP - 20} fontSize={9} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)" letterSpacing="0.04em">
            {lang === 'en' ? 'AUC (test)' : 'AUC (prueba)'}
          </text>

          {/* v5.2 overlay flag — dashed vertical rule at its date position */}
          <line x1={xPos(v52.day)} y1={CHART_TOP} x2={xPos(v52.day)} y2={CHART_BOTTOM} stroke="var(--color-text-secondary)" strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
          <g className="hidden sm:block">
            <text
              x={xPos(v52.day)}
              y={CHART_TOP - 8}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-secondary)"
            >
              {lang === 'en' ? 'v5.2 overlay — explanations only; alters no scores' : 'capa v5.2 — solo explicaciones; no altera puntuaciones'}
            </text>
          </g>

          {/* stepped ink line */}
          <path d={linePath} fill="none" stroke="var(--color-text-primary)" strokeWidth={1.5} />

          {/* vertices — 6px square ticks, never circles */}
          {lined.map((e) => {
            const cx = xPos(e.day)
            const cy = yPos(e.auc!)
            const isActive = e.kind === 'active'
            return (
              <g key={e.version}>
                <rect
                  x={cx - 3}
                  y={cy - 3}
                  width={6}
                  height={6}
                  fill={isActive ? OCHRE : 'var(--color-text-primary)'}
                />
                {isActive && (
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={700}
                    letterSpacing="0.12em"
                    fontFamily="var(--font-family-mono, monospace)"
                    fill={OCHRE}
                  >
                    {t('evolution.active').toUpperCase()}
                  </text>
                )}
                {/* version + date label below axis */}
                <text
                  x={cx}
                  y={CHART_BOTTOM + 18}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={isActive ? 700 : 500}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={isActive ? OCHRE : 'var(--color-text-secondary)'}
                >
                  {e.version}
                </text>
                <text
                  x={cx}
                  y={CHART_BOTTOM + 30}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                >
                  {e.dateLabel[lang]}
                </text>
              </g>
            )
          })}

          {/* v3.3 honesty tag */}
          <g className="hidden sm:block">
            <text
              x={xPos(v33.day)}
              y={yPos(v33.auc!) + 18}
              textAnchor="start"
              fontSize={8.5}
              fontStyle="italic"
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {lang === 'en' ? 'null-model baseline' : 'línea base modelo nulo'}
            </text>
          </g>

          {/* leader-line annotation on the 0.957 → 0.828 drop */}
          <g className="hidden sm:block">
            <line
              x1={(xPos(v51.day) + xPos(v65.day)) / 2}
              y1={(yPos(v51.auc!) + yPos(v65.auc!)) / 2}
              x2={(xPos(v51.day) + xPos(v65.day)) / 2 + 26}
              y2={yPos(v51.auc!) - 34}
              stroke="var(--color-text-secondary)"
              strokeWidth={1}
              opacity={0.55}
            />
            <foreignObject
              x={(xPos(v51.day) + xPos(v65.day)) / 2 + 20}
              y={yPos(v51.auc!) - 68}
              width={190}
              height={54}
            >
              <p
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: '12.5px',
                  lineHeight: 1.3,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}
              >
                {lang === 'en'
                  ? 'Mar 2026 · v0.6.5: vendor-stratified split, time-windowed labels. The drop is the correction.'
                  : 'Mar 2026 · v0.6.5: división estratificada por proveedor, etiquetas con ventana temporal. La caída es la corrección.'}
              </p>
            </foreignObject>
          </g>
        </svg>

        {/* ── Service register ────────────────────────────────────────── */}
        <div className="mt-6 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
          {CALIBRATION_LOG.map((e) => {
            const isActive = e.kind === 'active'
            const isOverlay = e.kind === 'overlay'
            return (
              <div
                key={e.version}
                className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft: isActive ? `2px solid ${OCHRE}` : '2px solid transparent',
                  paddingLeft: '10px',
                }}
              >
                <span
                  className="font-mono tabular-nums shrink-0"
                  style={{ fontSize: '10px', color: 'var(--color-text-muted)', width: '84px' }}
                >
                  {e.dateLabel[lang]}
                </span>
                <span
                  className="font-mono shrink-0"
                  style={{ fontSize: '11px', fontWeight: 700, color: isActive ? OCHRE : 'var(--color-text-primary)', width: '58px' }}
                >
                  {e.version}
                </span>
                <span className="flex-1 min-w-0" style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {t(`evolution.steps.${e.descKey}`)}
                  {isOverlay && (
                    <span
                      className="ml-2 font-mono uppercase align-middle"
                      style={{ fontSize: '8.5px', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
                    >
                      {t('evolution.overlay')}
                    </span>
                  )}
                </span>
                <span
                  className="font-mono tabular-nums shrink-0"
                  style={{ fontSize: '10.5px', fontWeight: isActive ? 700 : 500, color: isActive ? OCHRE : 'var(--color-text-muted)' }}
                >
                  {e.metric}
                </span>
              </div>
            )
          })}
        </div>
      </PlateFrame>
    </div>
  )
}

export { CalibrationRecord }
