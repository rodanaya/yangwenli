/**
 * CaptureField — § LA FOTOGRAFÍA · Lámina XIV·b
 *
 * The NYT Upshot "How Much Hotter Is Your Hometown?" mechanic ported onto the
 * full federal field: every institution with ≥100M MXN of recorded spend
 * (1,400+) as a rug tick positioned by its №1 vendor's CUMULATIVE share of
 * the recorded total. A typeahead places the reader's own institution inside
 * the distribution with a leader line + annotation card (lazily hydrated via
 * the star endpoint, which names the №1 vendor). The 13 monotonic captures
 * wear ochre caps — all of them render here, because the field's ≥100M
 * qualifier is the same one capture_results uses.
 *
 * HONEST TENSE: this is a snapshot of the RECORD, never "today" —
 * institution_top_vendors / institution_stats are whole-record aggregates.
 */

import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { networkApi, type CaptureLandscapeResponse } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, getSectorName } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { AxisTicks, ThresholdRules, shareBand, BAND_COLOR } from './captureAxis'

const OCHRE = '#a06820'

interface Props {
  landscape: CaptureLandscapeResponse
  lang: 'en' | 'es'
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function CaptureField({ landscape, lang }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const monotonicSet = useMemo(
    () => new Set(landscape.monotonic_institution_ids),
    [landscape.monotonic_institution_ids],
  )

  const selectedId = searchParams.get('inst')
    ? Number(searchParams.get('inst'))
    : null
  const selectedIdx = useMemo(
    () =>
      selectedId === null
        ? -1
        : landscape.ticks.findIndex((t) => t[0] === selectedId),
    [landscape.ticks, selectedId],
  )

  const setSelected = (id: number | null) => {
    const next = new URLSearchParams(searchParams)
    if (id === null) next.delete('inst')
    else next.set('inst', String(id))
    setSearchParams(next, { replace: true })
    setDropdownOpen(false)
  }

  const matches = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return []
    return landscape.ticks.filter((t) => normalize(t[1]).includes(q)).slice(0, 8)
  }, [landscape.ticks, query])

  const { floor_share_pct: floor, ceil_share_pct: ceil } = landscape.thresholds
  const n = landscape.qualifying_count

  // Top-3 cumulative shares get permanent named callouts (Upshot mechanic).
  // They cluster near 100%, so they stack on separate rows, right-anchored.
  const callouts = landscape.ticks.slice(0, 3)

  const caption =
    lang === 'en'
      ? `Plate — The ${n.toLocaleString()} federal institutions with ≥100M MXN on record, positioned by the №1 vendor's cumulative share of all recorded spend. The snapshot is not the film: it measures how much of the full record one vendor took, not how it was taken. Ochre caps mark the thirteen monotonic captures.`
      : `Lámina — Las ${n.toLocaleString()} instituciones federales con ≥100 MDP en el registro, situadas por la participación acumulada de su proveedor №1 en todo su gasto registrado. La fotografía no es la película: mide cuánto del registro completo tomó un proveedor, no cómo lo tomó. Las marcas ocre señalan las trece capturas monótonas.`

  return (
    <section id="la-fotografia" aria-labelledby="fotografia-heading" className="mt-12">
      <p
        id="fotografia-heading"
        className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2"
      >
        {lang === 'en'
          ? '§ THE SNAPSHOT · PLATE XIV·b — THE FEDERAL FIELD'
          : '§ LA FOTOGRAFÍA · LÁMINA XIV·b — EL CAMPO FEDERAL'}
      </p>
      <PlateFrame
        lang={lang}
        folio="XIV·b"
        contextLabel={{ en: 'The federal field', es: 'El campo federal' }}
        caption={caption}
      >
        <div className="px-4 pt-4 pb-2">
          <h3
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(20px, 2.6vw, 26px)',
              lineHeight: 1.15,
              color: 'var(--color-text-primary)',
            }}
          >
            {lang === 'en' ? (
              <>
                How captured is{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  your
                </span>{' '}
                institution?
              </>
            ) : (
              <>
                ¿Qué tan capturada está{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  su
                </span>{' '}
                institución?
              </>
            )}
          </h3>

          {/* The lookup — load-bearing mechanic */}
          <div className="relative mt-3 max-w-md">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen && matches.length > 0}
              aria-controls="capture-field-listbox"
              aria-label={
                lang === 'en' ? 'Search your institution' : 'Busque su institución'
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setDropdownOpen(false)
                if (e.key === 'Enter' && matches.length > 0) {
                  setSelected(matches[0][0])
                  setQuery(matches[0][1])
                }
              }}
              placeholder={
                lang === 'en'
                  ? `Search your institution among the ${n.toLocaleString()} measured…`
                  : `Busque su institución entre las ${n.toLocaleString()} medidas…`
              }
              className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-background-card focus:outline-none"
              style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            />
            {dropdownOpen && query.trim().length >= 2 && (
              <ul
                id="capture-field-listbox"
                role="listbox"
                className="absolute z-20 inset-x-0 top-full mt-1 border border-border rounded-sm bg-background-card shadow-sm max-h-72 overflow-y-auto"
              >
                {matches.length === 0 ? (
                  <li className="px-3 py-2.5 text-[11px] text-text-muted leading-snug">
                    {lang === 'en' ? (
                      <>
                        Not among the {n.toLocaleString()} institutions with ≥100M MXN on
                        record —{' '}
                        <Link
                          to={`/institutions?q=${encodeURIComponent(query.trim())}`}
                          className="underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          find it in the index →
                        </Link>
                      </>
                    ) : (
                      <>
                        No está entre las {n.toLocaleString()} instituciones con ≥100 MDP
                        registrados —{' '}
                        <Link
                          to={`/institutions?q=${encodeURIComponent(query.trim())}`}
                          className="underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          búsquela en el índice →
                        </Link>
                      </>
                    )}
                  </li>
                ) : (
                  matches.map((t) => (
                    <li key={t[0]} role="option" aria-selected={t[0] === selectedId}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelected(t[0])
                          setQuery(t[1])
                        }}
                        className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-background-elevated text-[12px]"
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{
                            background:
                              SECTOR_COLORS[
                                SECTORS.find((s) => s.id === t[2])?.code ?? 'otros'
                              ] ?? '#64748b',
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate flex-1">{t[1]}</span>
                        {monotonicSet.has(t[0]) && (
                          <span
                            className="font-mono text-[8.5px] uppercase tracking-wider flex-shrink-0"
                            style={{ color: 'var(--color-risk-critical)' }}
                          >
                            {lang === 'en' ? 'monotonic' : 'monótona'}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-text-muted tabular-nums flex-shrink-0">
                          {t[3]}%
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Strip + annotation card */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <div>
              <FieldStrip
                landscape={landscape}
                monotonicSet={monotonicSet}
                selectedId={selectedId}
                callouts={callouts}
                onPick={(id, name) => {
                  setSelected(id)
                  setQuery(name)
                }}
                lang={lang}
              />
              {/* band legend */}
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
                <span style={{ color: BAND_COLOR.low }}>■</span> &lt;{floor}% ·{' '}
                <span style={{ color: BAND_COLOR.mid }}>■</span> {floor}–{ceil}% ·{' '}
                <span style={{ color: 'var(--color-risk-critical)' }}>■</span> ≥{ceil}% (
                {landscape.captured_now_count}) ·{' '}
                <span style={{ color: OCHRE }}>■</span>{' '}
                {lang === 'en' ? 'the thirteen' : 'las trece'}
              </p>
            </div>
            {selectedIdx >= 0 ? (
              <AnnotationCard
                tick={landscape.ticks[selectedIdx]}
                idx={selectedIdx}
                landscape={landscape}
                isMonotonic={monotonicSet.has(landscape.ticks[selectedIdx][0])}
                onClear={() => {
                  setSelected(null)
                  setQuery('')
                }}
                lang={lang}
              />
            ) : (
              <div className="hidden lg:flex items-center justify-center border border-dashed border-border rounded-sm px-4 text-center">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {lang === 'en'
                    ? 'Look up an institution — or click a tick — to open its file here.'
                    : 'Busque una institución — o pulse una marca — para abrir su ficha aquí.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </PlateFrame>
    </section>
  )
}

// ─── The rug strip ───────────────────────────────────────────────────────────

function FieldStrip({
  landscape,
  monotonicSet,
  selectedId,
  callouts,
  onPick,
  lang,
}: {
  landscape: CaptureLandscapeResponse
  monotonicSet: Set<number>
  selectedId: number | null
  callouts: CaptureLandscapeResponse['ticks']
  onPick: (id: number, name: string) => void
  lang: 'en' | 'es'
}) {
  const { floor_share_pct: floor, ceil_share_pct: ceil } = landscape.thresholds
  const summary =
    lang === 'en'
      ? `Field of ${landscape.qualifying_count.toLocaleString()} institutions by cumulative №1-vendor share; ${landscape.captured_now_count} at or above ${ceil}%; the 13 monotonic captures marked.`
      : `Campo de ${landscape.qualifying_count.toLocaleString()} instituciones por participación acumulada del proveedor №1; ${landscape.captured_now_count} en o sobre ${ceil}%; las 13 capturas monótonas marcadas.`

  return (
    <div role="img" aria-label={summary}>
      {/* callout band — top shares cluster near 100%, so stack right-anchored rows */}
      <div className="relative h-10" aria-hidden="true">
        {callouts.map((t, i) => (
          <span
            key={t[0]}
            className="absolute font-mono text-[8.5px] uppercase tracking-wide text-text-secondary whitespace-nowrap"
            style={{
              right: `${Math.max(0, 100 - t[3])}%`,
              top: i * 13,
            }}
          >
            {t[1].length > 18 ? `${t[1].slice(0, 17)}…` : t[1]} · {t[3]}% ↘
          </span>
        ))}
      </div>
      <div className="relative h-[88px]" aria-hidden="true">
        <ThresholdRules floor={floor} ceil={ceil} lang={lang} labeled />
        {landscape.ticks.map((t) => {
          const isMono = monotonicSet.has(t[0])
          const isSel = t[0] === selectedId
          const band = shareBand(t[3], floor, ceil)
          return (
            <span
              key={t[0]}
              onClick={() => onPick(t[0], t[1])}
              title={`${t[1]} · ${t[3]}%`}
              className="absolute cursor-pointer"
              style={{
                left: `${t[3]}%`,
                top: isSel ? 18 : 30,
                width: isSel ? 3 : isMono ? 2.5 : 1.25,
                height: isSel ? 52 : isMono ? 34 : 26,
                background: isSel ? OCHRE : isMono ? OCHRE : BAND_COLOR[band],
                opacity: isSel || isMono ? 1 : 0.4,
                zIndex: isSel ? 3 : isMono ? 2 : 1,
              }}
            />
          )
        })}
        {/* selected leader line down to axis */}
        {selectedId !== null && (
          <SelectedLeader landscape={landscape} selectedId={selectedId} />
        )}
      </div>
      <div className="relative mt-1">
        <AxisTicks />
      </div>
    </div>
  )
}

function SelectedLeader({
  landscape,
  selectedId,
}: {
  landscape: CaptureLandscapeResponse
  selectedId: number
}) {
  const tick = landscape.ticks.find((t) => t[0] === selectedId)
  if (!tick) return null
  return (
    <span
      className="absolute font-mono text-[9.5px] font-bold tabular-nums px-1 rounded-sm"
      style={{
        left: `${tick[3]}%`,
        bottom: -2,
        transform: 'translateX(-50%) translateY(100%)',
        color: OCHRE,
        background: 'var(--color-background-card)',
        zIndex: 4,
      }}
    >
      ▲ {tick[3]}%
    </span>
  )
}

// ─── Annotation card — the looked-up institution's file ─────────────────────

function AnnotationCard({
  tick,
  idx,
  landscape,
  isMonotonic,
  onClear,
  lang,
}: {
  tick: CaptureLandscapeResponse['ticks'][number]
  idx: number
  landscape: CaptureLandscapeResponse
  isMonotonic: boolean
  onClear: () => void
  lang: 'en' | 'es'
}) {
  const [instId, name, sectorId, share] = tick
  const { floor_share_pct: floor, ceil_share_pct: ceil } = landscape.thresholds
  const band = shareBand(share, floor, ceil)
  const below = landscape.qualifying_count - idx - 1
  const pct = Math.round((100 * below) / landscape.qualifying_count)
  const sector = SECTORS.find((s) => s.id === sectorId)

  const { data: star, isLoading } = useQuery({
    queryKey: ['network', 'institution-star', instId],
    queryFn: () => networkApi.getInstitutionStar(instId),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
  const top1 = star?.vendors?.[0]

  return (
    <aside
      aria-live="polite"
      className="border border-border rounded-sm bg-background-card p-4 self-start"
      style={{ borderLeft: `3px solid ${sector ? SECTOR_COLORS[sector.code] : '#64748b'}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 17,
            lineHeight: 1.2,
            color: 'var(--color-text-primary)',
          }}
        >
          {name}
        </h4>
        <button
          type="button"
          onClick={onClear}
          aria-label={lang === 'en' ? 'Clear selection' : 'Borrar selección'}
          className="font-mono text-[11px] text-text-muted hover:text-text-primary"
        >
          ×
        </button>
      </div>
      {sector && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle"
            style={{ background: SECTOR_COLORS[sector.code] }}
            aria-hidden="true"
          />
          {getSectorName(sector.code, lang)}
        </p>
      )}
      <p
        className="mt-2 tabular-nums"
        style={{
          fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1,
          color: band === 'low' ? 'var(--color-text-muted)' : BAND_COLOR[band],
        }}
      >
        {share}%
      </p>
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
        {lang === 'en'
          ? 'cumulative №1-vendor share of recorded spend'
          : 'participación acumulada del proveedor №1'}
      </p>
      <p className="mt-2 text-[11.5px] text-text-secondary leading-snug">
        {lang === 'en'
          ? `More concentrated than ${pct}% of the ${landscape.qualifying_count.toLocaleString()} measured.`
          : `Más concentrada que el ${pct}% de las ${landscape.qualifying_count.toLocaleString()} medidas.`}
      </p>

      <div className="mt-3 pt-3 border-t border-border space-y-2 font-mono text-[10px] text-text-secondary tabular-nums">
        {isLoading ? (
          <p className="text-text-muted">…</p>
        ) : star ? (
          <>
            {top1 && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-text-muted mb-1">
                  {lang === 'en' ? '№1 vendor on record' : 'Proveedor №1 del registro'}
                </p>
                <EntityIdentityChip
                  type="vendor"
                  id={top1.vendor_id}
                  name={top1.vendor_name}
                  size="sm"
                  riskScore={top1.avg_risk_score}
                  className="max-w-full"
                />
                {top1.is_sanctioned && (
                  <p
                    className="mt-1 text-[9px] uppercase tracking-wider"
                    style={{ color: 'var(--color-risk-critical)' }}
                  >
                    {lang === 'en' ? 'sanctioned registry match' : 'coincide en registro de sanciones'}
                  </p>
                )}
              </div>
            )}
            <p>
              {lang === 'en' ? 'recorded spend' : 'gasto registrado'}{' '}
              {formatCompactMXN(star.total_value_mxn)}
            </p>
            <p>
              {lang === 'en' ? 'vendors on record' : 'proveedores en el registro'}{' '}
              {star.total_vendors.toLocaleString()}
            </p>
          </>
        ) : null}
      </div>

      {isMonotonic && (
        <p
          className="mt-3 font-mono text-[9.5px] uppercase tracking-wider"
          style={{ color: 'var(--color-risk-critical)' }}
        >
          <a href="#la-pelicula" className="hover:underline">
            {lang === 'en'
              ? '↑ In the film — confirmed monotonic capture'
              : '↑ En la película — captura monótona confirmada'}
          </a>
        </p>
      )}
      <div className="mt-3">
        <EntityIdentityChip type="institution" id={instId} name={name} size="sm" />
      </div>
    </aside>
  )
}
