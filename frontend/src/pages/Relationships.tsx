/**
 * Relationships — Folio·XIV · Institutional Capture («Su Institución»)
 *
 * Two honest lenses, one coordinate system:
 *  · § LA PELÍCULA (Lámina XIV·a) — the 13 strict monotonic captures as an
 *    FT-dumbbell register on a shared 0–100% axis, with in-place dockets
 *    (year-by-year money ledger · lazy ARIA cross-light · institution facts).
 *  · § LA FOTOGRAFÍA (Lámina XIV·b) — the NYT-Upshot Hometown lookup over the
 *    FULL ≥100M federal field (/capture/landscape — 1,400+ institutions,
 *    cumulative №1-vendor share of recorded spend), plus § LOS 119, the
 *    complete cumulative-majority ledger.
 *
 * The film is a trajectory; the photograph is the record. The photograph is
 * NEVER labeled "today" — institution-level shares here are cumulative.
 * Anti-model identity kept: arithmetic leads, the model is cross-light only.
 *
 * Spec: .claude/designs/captura-2026-06-11-spec.md (DESIGNUS panel winner
 * «Su Institución» + the landscape universe graft from «El Censo de la
 * Captura»).
 */

import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { captureApi } from '@/api/client'
import { formatCompactMXN, formatDualCurrency } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { ArrowRight } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PageFooter } from '@/components/layout/PageFooter'
import { CaptureRegister } from '@/components/capture/CaptureRegister'
import { CaptureField } from '@/components/capture/CaptureField'
import { CaptureNowLedger } from '@/components/capture/CaptureNowLedger'

export default function Relationships() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  const { data: capData, isLoading: capLoading, isError: capError } = useQuery({
    queryKey: ['capture', 'top', 50],
    queryFn: () => captureApi.getTop({ limit: 50 }),
    staleTime: 30 * 60 * 1000,
  })
  const { data: landscape, isLoading: fieldLoading } = useQuery({
    queryKey: ['capture', 'landscape'],
    queryFn: () => captureApi.getLandscape(),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  const allCaptures = capData?.data ?? []
  const totalCaptures = capData?.total_captures ?? 0

  // § EL SALDO + § ADÓNDE IR read the single strongest pair (server-ranked).
  const strongest = allCaptures[0] ?? null
  const strongestSectorColor = strongest
    ? SECTOR_COLORS[
        SECTORS.find((s) => s.id === strongest.institution_sector_id)?.code ?? 'otros'
      ] ?? '#64748b'
    : '#64748b'
  const strongestHolds =
    strongest && capData
      ? strongest.latest_share_pct >= capData.thresholds.ceil_share_pct
      : false

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Paper-grain overlay — single filter for the unified page */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="relationships-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="14" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#relationships-paper-grain)" />
      </svg>

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Folio·XIV page hero — Institutional Capture ──────────────── */}
        <header className="mb-8 pb-6 border-b border-border">
          <div
            className="flex items-center gap-3 mb-3"
            style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 400 }}
          >
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIV</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>{lang === 'en' ? 'Institutional capture · monotonic concentration' : 'Captura institucional · concentración monótona'}</span>
            </span>
          </div>
          <h1
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: 1.04,
              letterSpacing: '-0.012em',
              color: 'var(--color-text-primary)',
            }}
          >
            {lang === 'en' ? (
              <>
                How a vendor{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  captures an institution.
                </span>
              </>
            ) : (
              <>
                Cómo un proveedor{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  captura una institución.
                </span>
              </>
            )}
          </h1>
          <p
            className="mt-4"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '17px', lineHeight: 1.55, maxWidth: '68ch', color: 'var(--color-text-secondary)', letterSpacing: '0.005em' }}
          >
            {lang === 'en'
              ? 'Monotonic concentration: the vendor began below 25% and ended above 50%, year after year, for at least four years. The climb is not proof of wrongdoing — but the geometry is publishable.'
              : 'Concentración monótona: el proveedor empezó por debajo del 25% y terminó por encima del 50%, año tras año, durante al menos cuatro años. El ascenso no es prueba de irregularidad — pero la geometría es publicable.'}
            {landscape && (
              <>
                {' '}
                {lang === 'en'
                  ? `Thirteen pairs meet the strict definition; below, the full field of ${landscape.qualifying_count.toLocaleString()} institutions to place them in.`
                  : `Trece pares cumplen la definición estricta; abajo, el campo completo de ${landscape.qualifying_count.toLocaleString()} instituciones para situarlos.`}
              </>
            )}
          </p>
        </header>

        {/* ── § EL HALLAZGO — the computed cross-dataset finding ─────────── */}
        {fieldLoading || capLoading ? (
          <div className="mb-8">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-14 w-full max-w-3xl" />
          </div>
        ) : landscape && capData ? (
          <section aria-label={lang === 'en' ? 'The finding' : 'El hallazgo'} className="mb-8">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
              {lang === 'en' ? '§ The finding' : '§ El hallazgo'}
            </p>
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: '19px',
                lineHeight: 1.5,
                maxWidth: '70ch',
                color: 'var(--color-text-secondary)',
              }}
            >
              {lang === 'en' ? (
                <>
                  Of the{' '}
                  <Num color="var(--color-text-primary)">
                    {landscape.qualifying_count.toLocaleString()}
                  </Num>{' '}
                  federal institutions with at least 100M MXN on record,{' '}
                  <Num color="var(--color-risk-critical)">{landscape.captured_now_count}</Num>{' '}
                  have handed more than half of all their recorded spend to a single vendor —
                  and <Num color="#a16207">{landscape.antesala_count}</Num> more, at least
                  40 percent. Only <Num color="var(--color-accent)">{totalCaptures}</Num>{' '}
                  climbs pass the hardest test on record: rising year after year, from under
                  25% to over 50%, without a single step back.
                </>
              ) : (
                <>
                  De las{' '}
                  <Num color="var(--color-text-primary)">
                    {landscape.qualifying_count.toLocaleString()}
                  </Num>{' '}
                  instituciones federales con al menos 100 MDP en el registro,{' '}
                  <Num color="var(--color-risk-critical)">{landscape.captured_now_count}</Num>{' '}
                  han entregado más de la mitad de todo su gasto registrado a un solo
                  proveedor — y <Num color="#a16207">{landscape.antesala_count}</Num> más,
                  al menos el 40 por ciento. Sólo{' '}
                  <Num color="var(--color-accent)">{totalCaptures}</Num> ascensos cumplen la
                  prueba más dura del registro: subir año tras año, de menos del 25% a más
                  del 50%, sin un solo retroceso.
                </>
              )}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted tabular-nums">
              {totalCaptures}{' '}
              {lang === 'en' ? 'MONOTONIC CAPTURES' : 'CAPTURAS MONÓTONAS'} ·{' '}
              {landscape.captured_now_count}/{landscape.qualifying_count.toLocaleString()}{' '}
              {lang === 'en' ? 'WITH CUMULATIVE MAJORITY' : 'CON MAYORÍA ACUMULADA'} ·{' '}
              {landscape.aria_p6_total.toLocaleString()}{' '}
              {lang === 'en' ? 'P6 FINGERPRINTS' : 'HUELLAS P6'} ·{' '}
              <a href="#la-pelicula" className="hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                {lang === 'en' ? 'SEE THE PROOF ↓' : 'VER LA PRUEBA ↓'}
              </a>
            </p>
          </section>
        ) : null}

        {/* ── § EL SALDO — the single strongest capture, as a sentence ──── */}
        {capLoading ? (
          <div className="mb-10">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-16 w-full max-w-3xl" />
          </div>
        ) : strongest ? (
          <section
            aria-label={lang === 'en' ? 'The bottom line: the strongest capture' : 'El saldo: la captura más fuerte'}
            className="mb-10"
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
              {lang === 'en' ? '§ The bottom line' : '§ El saldo'}
            </p>
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: '19px',
                lineHeight: 1.5,
                maxWidth: '70ch',
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.004em',
              }}
            >
              {lang === 'en' ? (
                <>
                  The strongest concentration on record:{' '}
                  <strong className="text-text-primary font-semibold">{strongest.vendor_name}</strong>{' '}
                  came to control{' '}
                  <Num color={strongestSectorColor}>{strongest.peak_share_pct}%</Num> of{' '}
                  <strong className="text-text-primary font-semibold">{strongest.institution_name}</strong>
                  &rsquo;s spend by {strongest.peak_year} —{' '}
                  <Num color="var(--color-text-primary)">
                    {formatDualCurrency(strongest.cumulative_value_mxn)}
                  </Num>{' '}
                  captured of the {formatCompactMXN(strongest.institution_total_window)} awarded
                  in the window
                  {strongestHolds
                    ? ` — and today still holds ${strongest.latest_share_pct}%.`
                    : ` — and has since fallen to ${strongest.latest_share_pct}%.`}{' '}
                  A high risk indicator marks the geometry, not a verdict.
                </>
              ) : (
                <>
                  La concentración más fuerte del registro:{' '}
                  <strong className="text-text-primary font-semibold">{strongest.vendor_name}</strong>{' '}
                  llegó a controlar{' '}
                  <Num color={strongestSectorColor}>{strongest.peak_share_pct}%</Num> del gasto
                  de{' '}
                  <strong className="text-text-primary font-semibold">{strongest.institution_name}</strong>{' '}
                  en {strongest.peak_year} —{' '}
                  <Num color="var(--color-text-primary)">
                    {formatDualCurrency(strongest.cumulative_value_mxn)}
                  </Num>{' '}
                  capturados de los {formatCompactMXN(strongest.institution_total_window)}{' '}
                  adjudicados en la ventana
                  {strongestHolds
                    ? ` — y hoy conserva el ${strongest.latest_share_pct}%.`
                    : ` — y hoy ha caído al ${strongest.latest_share_pct}%.`}{' '}
                  Un indicador de riesgo alto marca la geometría, no una sentencia.
                </>
              )}
            </p>
          </section>
        ) : null}

        {/* ── § LA PELÍCULA — the 13, on one shared axis ─────────────────── */}
        {capLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : capError || !capData ? (
          <div className="px-5 py-10 text-center text-[12px] text-text-muted border border-border rounded-sm">
            {lang === 'en'
              ? 'The capture register is not available right now — try again shortly.'
              : 'El registro de capturas no está disponible en este momento — intente de nuevo en breve.'}
          </div>
        ) : (
          <>
            <CaptureRegister
              data={allCaptures}
              thresholds={capData.thresholds}
              landscape={landscape}
              lang={lang}
            />

            {/* Methodology — live thresholds + the two-lens distinction */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'en' ? 'Methodology' : 'Metodología'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                {lang === 'en' ? (
                  <>
                    Computed over {capData.total_unfiltered} (institution, vendor) candidates
                    with at least {capData.thresholds.min_years} years of data. Thresholds:
                    floor {capData.thresholds.floor_share_pct}%, ceiling{' '}
                    {capData.thresholds.ceil_share_pct}%. Ranking: Δshare × √(captured MXN).
                    Data: COMPRANET federal contracts 2018–2025. The field plate (XIV·b)
                    measures something different and weaker: the №1 vendor&rsquo;s cumulative
                    share of each institution&rsquo;s full recorded spend — a photograph of
                    the record, not a trajectory, and never a statement about today.
                  </>
                ) : (
                  <>
                    Calculado sobre {capData.total_unfiltered} candidatos (institución,
                    proveedor) con al menos {capData.thresholds.min_years} años de datos.
                    Umbrales: piso {capData.thresholds.floor_share_pct}%, techo{' '}
                    {capData.thresholds.ceil_share_pct}%. Ranking: Δparticipación × √(valor
                    MXN capturado). Datos: COMPRANET contratos federales 2018–2025. La lámina
                    del campo (XIV·b) mide algo distinto y más débil: la participación
                    acumulada del proveedor №1 en todo el gasto registrado de cada
                    institución — una fotografía del registro, no una trayectoria, y nunca
                    una afirmación sobre el presente.
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {/* ── § LA FOTOGRAFÍA — the full federal field + the 119 ─────────── */}
        {fieldLoading ? (
          <div className="mt-12">
            <Skeleton className="h-4 w-48 mb-3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : landscape ? (
          <>
            <CaptureField landscape={landscape} lang={lang} />
            <CaptureNowLedger landscape={landscape} lang={lang} />
          </>
        ) : null}

        {/* ── § · ADÓNDE IR — exit ramps from the strongest capture ─────── */}
        {!capLoading && strongest ? (
          <section
            aria-label={lang === 'en' ? 'Where to go next' : 'Adónde ir'}
            className="mt-12 pt-6"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
              {lang === 'en' ? '§ · Where to go next' : '§ · Adónde ir'}
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.55] max-w-prose mb-4">
              {lang === 'en'
                ? "Trace the strongest capture to its source — the captured institution, the vendor that dominated it, or the full capture pattern in the model's queue."
                : 'Sigue la captura más fuerte hasta su origen — la institución capturada, el proveedor que la dominó, o el patrón de captura completo en la cola del modelo.'}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <EntityIdentityChip
                type="institution"
                id={strongest.institution_id}
                name={strongest.institution_name}
                size="md"
              />
              <EntityIdentityChip
                type="vendor"
                id={strongest.vendor_id}
                name={strongest.vendor_name}
                size="md"
              />
              <EntityIdentityChip
                type="pattern"
                id="P6"
                name={lang === 'en' ? 'Capture pattern (P6)' : 'Patrón de captura (P6)'}
                size="md"
              />
            </div>
            <Link
              to={`/institutions/${strongest.institution_id}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
              aria-label={
                lang === 'en'
                  ? `Investigate the capture of ${strongest.institution_name}`
                  : `Investigar la captura de ${strongest.institution_name}`
              }
            >
              {lang === 'en' ? 'Investigate the institution dossier' : 'Investigar el expediente de la institución'}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </section>
        ) : null}

        <ProvenanceFooter lang={lang} />
        <PageFooter />
      </div>
    </div>
  )
}

// ─── Inline editorial number — Garamond italic 800, hex via style only ──────

function Num({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        color,
      }}
    >
      {children}
    </span>
  )
}

// ─── ProvenanceFooter — local, matching the dossier provenance idiom ────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section className="mt-10 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p
        className="font-mono mb-2"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        § {lang === 'en' ? "What this plate can't tell you" : 'Lo que esta lámina no puede decir'}
      </p>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13.5,
          color: 'var(--color-text-secondary)',
          maxWidth: '72ch',
          lineHeight: 1.55,
        }}
      >
        {lang === 'en'
          ? 'Monotonic concentration reads how spend was awarded — not how it was performed. A high risk indicator marks a publishable geometry, not proof of wrongdoing, which only courts establish.'
          : 'La concentración monótona lee cómo se adjudicó el gasto, no cómo se ejecutó. Un indicador de riesgo alto señala una geometría publicable, no prueba de un delito, que solo los tribunales determinan.'}
      </p>
      <div className="mt-4">
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13.5,
            color: 'var(--color-text-secondary)',
            maxWidth: '72ch',
            lineHeight: 1.55,
          }}
        >
          {lang === 'en'
            ? 'COMPRANET data 2002–2025; data horizon Sep 28 2025. v0.8.5 risk model trained on 1,427 documented corruption cases. Model signals are statistical indicators, not legal determinations.'
            : 'Datos COMPRANET 2002–2025; horizonte de datos 28 sep 2025. Modelo de riesgo v0.8.5 entrenado con 1,427 casos de corrupción documentados. Las señales del modelo son indicadores estadísticos, no determinaciones legales.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
          }}
        >
          {lang === 'en' ? 'See full methodology' : 'Ver metodología completa'} ↗
        </button>
      </div>
    </section>
  )
}
