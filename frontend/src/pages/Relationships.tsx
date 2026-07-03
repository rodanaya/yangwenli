/**
 * Relationships — Folio·XIV · Institutional Capture
 * «LA LÍNEA QUE NADIE CRUZA SOLO» (DESIGNUS captura-2026-06-23, precedent-first 88/100)
 *
 * Show before tell. One scroll, no clicks:
 *  · §A EL EMBUDO — the nested funnel (field ⊃ majority ⊃ climbs), the W7 spine.
 *  · §B EL SALDO — a 277B-MXN cumulative-of-record sledgehammer (the scale).
 *  · §B′/§C LA PELÍCULA — the 13 captures as Reuters threshold-crossing
 *    trajectories (the centerpiece), with a documented climber as Exhibit A.
 *  · §E EL REGISTRO — the 119 ledger + "is your institution here?" search.
 *
 * The arithmetic leads; the v0.8.5 model is cross-light only. The §B figure is
 * a CUMULATIVE-of-record total (never a live "flow"). Spec:
 * .claude/designs/captura-2026-06-23-spec.md.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { captureApi } from '@/api/client'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'
import { PageFooter } from '@/components/layout/PageFooter'
import { FunnelStrip } from '@/components/capture/FunnelStrip'
import { MoneySledgehammer } from '@/components/capture/MoneySledgehammer'
import { CaptureFilm } from '@/components/capture/CaptureFilm'
import { CaptureNowLedger } from '@/components/capture/CaptureNowLedger'
import { BAND_COLOR } from '@/components/capture/captureAxis'

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

  // §B — Σ window_total_mxn over the 119 (cumulative-of-record, not a flow).
  const sum119 = useMemo(
    () => (landscape ? landscape.captured_now.reduce((a, c) => a + c.window_total_mxn, 0) : 0),
    [landscape],
  )

  const funnelTiers = useMemo(() => {
    if (!landscape || !capData) return null
    return [
      {
        count: landscape.qualifying_count,
        labelEn: 'federal institutions with over 100M MXN on record',
        labelEs: 'instituciones federales con más de 100M MXN en el registro',
        color: BAND_COLOR.low,
      },
      {
        count: landscape.captured_now_count,
        labelEn: 'where one vendor already holds the majority of the record',
        labelEs: 'donde un proveedor ya tiene la mayoría del registro',
        color: BAND_COLOR.mid,
      },
      {
        count: capData.total_captures,
        labelEn: 'where that majority was built year by year — the strict climbs',
        labelEs: 'donde esa mayoría se construyó año con año — los ascensos estrictos',
        color: 'var(--color-risk-critical)',
        anchor: '#la-pelicula',
      },
    ]
  }, [landscape, capData])

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Paper-grain overlay */}
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
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="mb-8 pb-6 border-b border-border">
          <div
            className="flex items-center gap-3 mb-3"
            style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 400 }}
          >
            <span style={{ fontStyle: 'normal', fontWeight: 300 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIV</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>{lang === 'en' ? 'Institutional capture · monotonic concentration' : 'Captura institucional · concentración monótona'}</span>
            </span>
          </div>
          <h1
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
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
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>captures an institution.</span>
              </>
            ) : (
              <>
                Cómo un proveedor{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>captura una institución.</span>
              </>
            )}
          </h1>
          <p
            className="mt-4 max-w-2xl"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '17px', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}
          >
            {lang === 'en'
              ? "A vendor's share of an institution's spend climbs past the 50% ceiling, year after year. The climb is not proof of wrongdoing — but the geometry is publishable."
              : 'La participación de un proveedor en el gasto de una institución sube más allá del techo del 50%, año tras año. El ascenso no es prueba de irregularidad — pero la geometría es publicable.'}
          </p>
        </header>

        {/* ── §A · EL EMBUDO — the funnel spine ────────────────────────── */}
        {fieldLoading || capLoading ? (
          <div className="mb-10 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
          </div>
        ) : funnelTiers ? (
          <section className="mb-10" aria-label={lang === 'en' ? 'The funnel' : 'El embudo'}>
            <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-4">
              {lang === 'en' ? '§ THE FUNNEL' : '§ EL EMBUDO'}
            </p>
            <FunnelStrip tiers={funnelTiers} lang={lang} />
          </section>
        ) : null}

        {/* ── §B · EL SALDO — the sledgehammer ─────────────────────────── */}
        {fieldLoading ? (
          <div className="mb-12">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : landscape ? (
          <section className="mb-12" aria-label={lang === 'en' ? 'The reckoning' : 'El saldo'}>
            <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
              {lang === 'en' ? '§ THE RECKONING' : '§ EL SALDO'}
            </p>
            <MoneySledgehammer
              value={formatCompactMXN(sum119)}
              valueSub={lang === 'en' ? formatCompactUSD(sum119) : undefined}
              eyebrow={
                lang === 'en'
                  ? `ACROSS THESE ${landscape.captured_now_count} INSTITUTIONS, ONE VENDOR HOLDS THE MAJORITY OF`
                  : `EN ESTAS ${landscape.captured_now_count} INSTITUCIONES, UN SOLO PROVEEDOR CONCENTRA LA MAYORÍA DE`
              }
              deck={
                lang === 'en'
                  ? 'of recorded spend — cumulative across the full record, not one year’s flow.'
                  : 'del gasto registrado — acumulado en todo el registro, no el flujo de un año.'
              }
              microStats={[
                { value: String(capData?.total_captures ?? 13), label: lang === 'en' ? 'built year by year' : 'construidas año con año' },
                { value: landscape.qualifying_count.toLocaleString(), label: lang === 'en' ? 'in the field' : 'en el campo' },
                { value: landscape.aria_p6_total.toLocaleString(), label: lang === 'en' ? 'vendor fingerprints (P6)' : 'huellas de proveedor (P6)' },
              ]}
              ariaLabel={
                lang === 'en'
                  ? `Across ${landscape.captured_now_count} institutions, one vendor holds the majority of ${formatCompactMXN(sum119)} of recorded spend, cumulative.`
                  : `En ${landscape.captured_now_count} instituciones, un solo proveedor concentra la mayoría de ${formatCompactMXN(sum119)} del gasto registrado, acumulado.`
              }
            />
          </section>
        ) : null}

        {/* ── §B′ + §C · LA PELÍCULA — the centerpiece ─────────────────── */}
        {capLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
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
            <CaptureFilm data={allCaptures} thresholds={capData.thresholds} landscape={landscape} lang={lang} />

            {/* Methodology — live thresholds */}
            <div className="mt-8 pt-4 border-t border-border">
              <p className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'en' ? 'Methodology' : 'Metodología'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-3xl">
                {lang === 'en'
                  ? `Computed over ${capData.total_unfiltered} (institution, vendor) candidates with at least ${capData.thresholds.min_years} years of data. Thresholds: floor ${capData.thresholds.floor_share_pct}%, ceiling ${capData.thresholds.ceil_share_pct}%. Ranking: Δshare × √(captured MXN). Data: COMPRANET federal contracts 2018–2025. The trajectory recolors at the ${capData.thresholds.ceil_share_pct}% ceiling — zinc below, red above — so spikes and reversals read as honestly as clean climbs.`
                  : `Calculado sobre ${capData.total_unfiltered} candidatos (institución, proveedor) con al menos ${capData.thresholds.min_years} años de datos. Umbrales: piso ${capData.thresholds.floor_share_pct}%, techo ${capData.thresholds.ceil_share_pct}%. Ranking: Δparticipación × √(valor MXN capturado). Datos: COMPRANET contratos federales 2018–2025. La trayectoria recolorea en el techo del ${capData.thresholds.ceil_share_pct}% — zinc abajo, rojo arriba — para que los picos y reversiones se lean tan honestamente como los ascensos limpios.`}
              </p>
            </div>
          </>
        )}

        {/* ── §E · EL REGISTRO — the 119 + your institution ────────────── */}
        {!fieldLoading && landscape ? (
          <CaptureNowLedger landscape={landscape} lang={lang} />
        ) : null}

        <ProvenanceFooter lang={lang} />
        <PageFooter />
      </div>
    </div>
  )
}

// ─── ProvenanceFooter — local, matching the dossier provenance idiom ─────────
function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section className="mt-10 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p
        className="font-mono mb-2"
        style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}
      >
        § {lang === 'en' ? "What this plate can't tell you" : 'Lo que esta lámina no puede decir'}
      </p>
      <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
        {lang === 'en'
          ? 'Monotonic concentration reads how spend was awarded — not how it was performed. A high risk indicator marks a publishable geometry, not proof of wrongdoing, which only courts establish.'
          : 'La concentración monótona lee cómo se adjudicó el gasto, no cómo se ejecutó. Un indicador de riesgo alto señala una geometría publicable, no prueba de un delito, que solo los tribunales determinan.'}
      </p>
      <div className="mt-4">
        <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          {lang === 'en'
            ? 'COMPRANET data 2002–2025; data horizon Sep 28 2025. v0.8.5 risk model trained on 1,427 documented corruption cases. Model signals are statistical indicators, not legal determinations.'
            : 'Datos COMPRANET 2002–2025; horizonte de datos 28 sep 2025. Modelo de riesgo v0.8.5 entrenado con 1,427 casos de corrupción documentados. Las señales del modelo son indicadores estadísticos, no determinaciones legales.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
          style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
        >
          {lang === 'en' ? 'See full methodology' : 'Ver metodología completa'} ↗
        </button>
      </div>
    </section>
  )
}
