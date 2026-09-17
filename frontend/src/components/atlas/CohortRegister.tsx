/**
 * CohortRegister — Lámina «La Cohorte» for /atlas scope 1.
 *
 * Renders in the same PlateFrame slot as PadronBand once a cohort slice is
 * selected: the vendor-level ledger behind that slice, PAGE_CHARTER
 * Archetype B (§ EL SALDO sentence + § EL REGISTRO ledger). Sorted by risk
 * indicator DESC (server contract); "Load more" walks the keyset cursor.
 *
 * The API's AtlasClusterVendorItem carries pattern_confidences (a dict), not
 * a single primary_pattern code — patrón column below picks the
 * highest-confidence key per vendor. Deviation from the original spec,
 * flagged because the field doesn't exist on the wire.
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, type AtlasClusterVendorItem } from '@/api/client'
import { AtlasBreadcrumb } from '@/components/atlas/AtlasBreadcrumb'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { formatCompactMXN } from '@/lib/utils'
import { usePublishSiblingList, useOriginRowFlash } from '@/lib/nav/wayfinding'
import { ADMIN_DISPLAY_ACCENTED, getAdministrationByPeriodKey } from '@/lib/administrations'

const MONO = "'IBM Plex Mono', monospace"
const PAGE_LIMIT = 50

interface Props {
  lens: string
  code: string
  label: string
  lensLabel: string
  lang: 'en' | 'es'
  onGoHome: () => void
  onLoaded?: (loaded: number, total: number) => void
  /** Scope 2 (Sep 2026): clicking a row (outside the chip) opens the
   *  vendor's short card + relation pivots in-page instead of navigating
   *  out to the dossier — the chip stays the way out. */
  onOpenVendor?: (vendor: AtlasClusterVendorItem) => void
  /** Sexenio global time filter (Sep 2026) — API vocabulary. */
  period: string | null
}

function primaryPatternOf(v: AtlasClusterVendorItem): string {
  const pc = v.pattern_confidences
  if (!pc) return ''
  let best: string | null = null
  let bestVal = -Infinity
  for (const [k, val] of Object.entries(pc)) {
    if (val > bestVal) { bestVal = val; best = k }
  }
  return best ?? ''
}

export function CohortRegister({ lens, code, label, lensLabel, lang, onGoHome, onLoaded, onOpenVendor, period }: Props) {
  const isEs = lang === 'es'
  const location = useLocation()
  const periodAdmin = useMemo(() => getAdministrationByPeriodKey(period), [period])

  const firstPage = useQuery({
    queryKey: ['atlas-cohort-vendors', lens, code, period],
    queryFn: () => atlasApi.getClusterVendors({ lens, code, limit: PAGE_LIMIT, period: period ?? undefined }),
    enabled: !!lens && !!code,
    staleTime: 5 * 60 * 1000,
  })

  // Accumulated pages beyond the first — reset whenever the cohort (or the
  // sexenio filter, which changes the underlying vendor set) changes.
  const [morePages, setMorePages] = useState<AtlasClusterVendorItem[][]>([])
  const [nextCursor, setNextCursor] = useState<number | null | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(false)

  useEffect(() => {
    setMorePages([])
    setNextCursor(undefined)
    setMoreError(false)
  }, [lens, code, period])

  useEffect(() => {
    if (firstPage.data && nextCursor === undefined) setNextCursor(firstPage.data.next_cursor)
  }, [firstPage.data, nextCursor])

  const vendors = useMemo(
    () => [...(firstPage.data?.vendors ?? []), ...morePages.flat()],
    [firstPage.data, morePages],
  )
  const total = firstPage.data?.total ?? 0

  async function loadMore() {
    if (nextCursor == null || loadingMore) return
    setLoadingMore(true)
    setMoreError(false)
    try {
      const res = await atlasApi.getClusterVendors({ lens, code, limit: PAGE_LIMIT, cursor: nextCursor, period: period ?? undefined })
      setMorePages((p) => [...p, res.vendors])
      setNextCursor(res.next_cursor)
    } catch {
      setMoreError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    onLoaded?.(vendors.length, total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors.length, total])

  // El Hilo: publish this register as a vendor sibling list so /vendors/:id
  // gets a working Prev/Next stepper + "back to the register" link.
  const search = location.search
  usePublishSiblingList(
    vendors.length
      ? {
          kind: 'vendor',
          items: vendors.map((v) => ({ id: String(v.vendor_id), label: v.name })),
          backTo: `${location.pathname}${search}`,
          backLabel: isEs ? `${label} · registro` : `${label} · register`,
        }
      : null,
  )
  useOriginRowFlash('vendor', vendors.length > 0)

  const pageMax = useMemo(
    () => vendors.reduce((m, v) => Math.max(m, v.total_amount_mxn), 1),
    [vendors],
  )

  const saldo = useMemo(() => {
    if (vendors.length === 0) return null
    const n = Math.min(10, vendors.length)
    const topSum = vendors.slice(0, n).reduce((s, v) => s + v.total_amount_mxn, 0)
    const pageSum = vendors.reduce((s, v) => s + v.total_amount_mxn, 0)
    const share = pageSum > 0 ? (topSum / pageSum) * 100 : 0
    const critical = vendors.filter((v) => v.risk_level === 'critical').length
    return { n, share, critical }
  }, [vendors])

  return (
    <div>
      <AtlasBreadcrumb lang={lang} lensLabel={lensLabel} clusterLabel={label} onGoHome={onGoHome} />
      <div className="pt-10">
        {firstPage.isLoading ? (
          <p className="font-mono text-[12px] text-text-muted py-10 text-center" style={{ letterSpacing: '0.08em' }}>
            {isEs ? 'Cargando proveedores…' : 'Loading vendors…'}
          </p>
        ) : firstPage.isError ? (
          <p className="font-mono text-[12px] text-text-muted py-10 text-center" style={{ letterSpacing: '0.08em' }}>
            {isEs ? 'No se pudo cargar el registro.' : 'Could not load the register.'}
          </p>
        ) : vendors.length === 0 ? (
          <p className="font-mono text-[12px] text-text-muted py-10 text-center" style={{ letterSpacing: '0.08em' }}>
            {isEs ? 'Sin proveedores en esta cohorte.' : 'No vendors in this cohort.'}
          </p>
        ) : (
          <>
            <p
              className="font-mono mb-1"
              style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {isEs ? '§ EL SALDO' : '§ THE BALANCE'}
            </p>
            {saldo && (
              <p
                className="mb-4"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontSize: 'clamp(1rem, 1.6vw, 1.25rem)',
                  lineHeight: 1.4,
                  color: 'var(--color-text-primary)',
                }}
              >
                {isEs ? (
                  <>
                    Los primeros {saldo.n} (de {total.toLocaleString('es-MX')} en la cohorte
                    {period && periodAdmin ? <> durante {ADMIN_DISPLAY_ACCENTED[periodAdmin.key]}</> : null}) se llevan{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{saldo.share.toFixed(0)}%</strong>
                    {' '}del dinero de esta página; {saldo.critical} traen indicador crítico.
                  </>
                ) : (
                  <>
                    The first {saldo.n} (of {total.toLocaleString('en-US')} in the cohort
                    {period && periodAdmin ? <> during {ADMIN_DISPLAY_ACCENTED[periodAdmin.key]}</> : null}) take{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{saldo.share.toFixed(0)}%</strong>
                    {' '}of this page's money; {saldo.critical} carry a critical indicator.
                  </>
                )}
              </p>
            )}

            <p
              className="font-mono mb-1.5"
              style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {isEs ? '§ EL REGISTRO' : '§ THE REGISTER'}
            </p>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 560 }}>
                <div
                  className="grid items-center gap-2 py-1 border-b border-border font-mono uppercase"
                  style={{ gridTemplateColumns: '40px minmax(0,1fr) 110px 110px 64px 56px', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                >
                  <span>Nº</span>
                  <span>{isEs ? 'Proveedor' : 'Vendor'}</span>
                  <span />
                  <span className="text-right">{isEs ? 'Monto' : 'Amount'}</span>
                  <span className="text-right">{isEs ? 'Contr.' : 'Contr.'}</span>
                  <span>{isEs ? 'Patrón' : 'Pattern'}</span>
                </div>
                {vendors.map((v, i) => (
                  <div
                    key={v.vendor_id}
                    data-wf-row={String(v.vendor_id)}
                    role={onOpenVendor ? 'button' : undefined}
                    tabIndex={onOpenVendor ? 0 : undefined}
                    aria-label={onOpenVendor ? v.name : undefined}
                    onClick={onOpenVendor ? () => onOpenVendor(v) : undefined}
                    onKeyDown={onOpenVendor ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenVendor(v) }
                    } : undefined}
                    className="grid items-center gap-2 hover:bg-background-elevated/40 transition-colors border-b border-border/50"
                    style={{ gridTemplateColumns: '40px minmax(0,1fr) 110px 110px 64px 56px', height: 40, cursor: onOpenVendor ? 'pointer' : undefined, outline: 'none' }}
                  >
                    <span className="font-mono tabular-nums text-[13px] text-text-primary">
                      {String(i + 1).padStart(3, '0')}
                    </span>
                    <span className="min-w-0" onClick={(e) => e.stopPropagation()}>
                      <EntityIdentityChip
                        type="vendor"
                        id={v.vendor_id}
                        name={v.name}
                        size="sm"
                        riskScore={v.risk_score}
                        ariaTier={v.tier as 1 | 2 | 3 | 4}
                        sectorCode={v.primary_sector_code}
                      />
                    </span>
                    <DotBar value={v.total_amount_mxn} max={pageMax} color="var(--color-accent)" />
                    <span className="font-mono tabular-nums text-[13px] text-text-primary text-right whitespace-nowrap">
                      {formatCompactMXN(v.total_amount_mxn)}
                    </span>
                    <span className="font-mono tabular-nums text-[13px] text-text-secondary text-right">
                      {v.total_contracts}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted" style={{ fontFamily: MONO }}>
                      {primaryPatternOf(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="font-mono tabular-nums text-[11px] text-text-muted">
                {isEs
                  ? `${vendors.length.toLocaleString('es-MX')} de ${total.toLocaleString('es-MX')}`
                  : `${vendors.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`}
              </span>
              {nextCursor != null && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="font-mono uppercase text-[11px] px-2 py-1 border border-border rounded-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors disabled:opacity-50"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {loadingMore
                    ? (isEs ? 'Cargando…' : 'Loading…')
                    : (isEs ? 'Cargar más' : 'Load more')}
                </button>
              )}
            </div>
            {moreError && (
              <p className="font-mono text-[11px] text-text-muted mt-1">
                {isEs ? 'No se pudo cargar la siguiente página.' : 'Could not load the next page.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
