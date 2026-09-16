/**
 * VendorPivots — Lámina «El Proveedor» for /atlas scope 2.
 *
 * A SHORT card plus four relation pivots, docked in the same plate slot as
 * CohortRegister (scope 1). This is explicitly NOT a dossier — the real
 * dossier is /vendors/:id, which this panel hands off to at every turn.
 * Design principle: every panel shows a RELATION and states it in one
 * sentence with numbers, never a bare list.
 *
 * The short card's headline figures come from the AtlasClusterVendorItem row
 * the caller clicked in CohortRegister (no extra request). When that row is
 * unavailable — a hard reload of ?scope=proveedor&vendor=N — this component
 * re-fetches the cohort's first page under the SAME React Query key
 * CohortRegister uses, so it's usually already cached and, failing that,
 * falls back to whatever vendor_name the pivot endpoints report.
 */
import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, vendorApi, networkApi, type AtlasClusterVendorItem } from '@/api/client'
import { AtlasBreadcrumb } from '@/components/atlas/AtlasBreadcrumb'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { formatCompactMXN, formatDualCurrency, formatNumber } from '@/lib/utils'
import { getRiskLevelFromScore } from '@/lib/constants'
import { ADMIN_ORDER, ADMIN_DISPLAY_ACCENTED, getAdministrationByYear, type AdministrationKey } from '@/lib/administrations'
import { usePublishSiblingList } from '@/lib/nav/wayfinding'

const MONO = "'IBM Plex Mono', monospace"
const PAGE_LIMIT = 50
const CB_SVG_W = 110
const CB_ROW_H = 28
const SEX_COL_W = 52
const SEX_GAP = 12
const SEX_H = 80

interface Props {
  lens: string
  code: string
  cohortLabel: string
  lensLabel: string
  vendorId: number
  vendorRow: AtlasClusterVendorItem | null
  lang: 'en' | 'es'
  onGoHome: () => void
  onExitToCohort: () => void
  onVendorLoaded?: (info: {
    vendorId: number
    label: string
    institutions: number
    coBidders: number
    categories: number
  }) => void
}

const RISK_WORD: Record<'critical' | 'high' | 'medium' | 'low', { en: string; es: string }> = {
  critical: { en: 'critical', es: 'crítico' },
  high: { en: 'high', es: 'alto' },
  medium: { en: 'medium', es: 'medio' },
  low: { en: 'low', es: 'bajo' },
}

function primaryPatternOf(v: AtlasClusterVendorItem | null): string {
  const pc = v?.pattern_confidences
  if (!pc) return ''
  let best: string | null = null
  let bestVal = -Infinity
  for (const [k, val] of Object.entries(pc)) {
    if (val > bestVal) { bestVal = val; best = k }
  }
  return best ?? ''
}

function PivotKicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono mb-1.5"
      style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
    >
      {children}
    </p>
  )
}

export function VendorPivots({
  lens, code, cohortLabel, lensLabel, vendorId, vendorRow, lang, onGoHome, onExitToCohort, onVendorLoaded,
}: Props) {
  const isEs = lang === 'es'
  const location = useLocation()

  // Same query key CohortRegister's first page uses — React Query dedupes,
  // so this costs no extra request when the user just clicked a row there.
  // Also doubles as: (a) the sibling-list source once CohortRegister
  // unmounts, (b) the vendorRow fallback after a hard reload.
  const cohortVendors = useQuery({
    queryKey: ['atlas-cohort-vendors', lens, code],
    queryFn: () => atlasApi.getClusterVendors({ lens, code, limit: PAGE_LIMIT }),
    enabled: !!lens && !!code,
    staleTime: 5 * 60 * 1000,
  })
  const row = vendorRow ?? cohortVendors.data?.vendors.find((v) => v.vendor_id === vendorId) ?? null

  const institutionsQ = useQuery({
    queryKey: ['vendor-institutions', vendorId],
    queryFn: () => vendorApi.getInstitutions(vendorId, 50),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })
  const coBiddersQ = useQuery({
    queryKey: ['vendor-cobidders', vendorId],
    queryFn: () => networkApi.getCoBidders(vendorId, 3, 8),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })
  const timelineQ = useQuery({
    queryKey: ['vendor-risk-timeline', vendorId],
    queryFn: () => vendorApi.getRiskTimeline(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })
  const categoriesQ = useQuery({
    queryKey: ['vendor-categories', vendorId],
    queryFn: () => vendorApi.getCategories(vendorId),
    enabled: !!vendorId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const vendorLabel =
    row?.name ?? institutionsQ.data?.vendor_name ?? coBiddersQ.data?.vendor_name ?? timelineQ.data?.vendor_name ?? `#${vendorId}`

  // El Hilo: keep the sibling stepper alive while this panel owns the plate
  // slot (CohortRegister, which normally publishes it, is unmounted).
  const search = location.search
  usePublishSiblingList(
    cohortVendors.data?.vendors.length
      ? {
          kind: 'vendor',
          items: cohortVendors.data.vendors.map((v) => ({ id: String(v.vendor_id), label: v.name })),
          backTo: `${location.pathname}${search}`,
          backLabel: isEs ? `${cohortLabel} · registro` : `${cohortLabel} · register`,
        }
      : null,
  )

  // ── § EL SALDO — institutions math ──────────────────────────────────────
  const institutions = institutionsQ.data?.data ?? null
  const institutionsTotal = institutionsQ.data?.total ?? institutions?.length ?? 0
  const institutionsSum = useMemo(() => (institutions ?? []).reduce((s, i) => s + i.total_value_mxn, 0), [institutions])
  const topInstitution = useMemo(() => {
    if (!institutions || institutions.length === 0) return null
    return [...institutions].sort((a, b) => b.total_value_mxn - a.total_value_mxn)[0]
  }, [institutions])
  const topInstitutionShare = topInstitution && institutionsSum > 0 ? (topInstitution.total_value_mxn / institutionsSum) * 100 : 0

  // ── § EL SALDO — co-bidders math ────────────────────────────────────────
  const coBidders = coBiddersQ.data?.co_bidders ?? null
  const totalProcedures = coBiddersQ.data?.total_procedures ?? 0
  const topPartner = useMemo(() => {
    if (!coBidders || coBidders.length === 0) return null
    return [...coBidders].sort((a, b) => b.co_bid_count - a.co_bid_count)[0]
  }, [coBidders])

  // ── Categories ───────────────────────────────────────────────────────────
  const categories = categoriesQ.data?.categories ?? null
  const topCategory = useMemo(() => {
    if (!categories || categories.length === 0) return null
    return [...categories].sort((a, b) => b.share_of_vendor_value - a.share_of_vendor_value)[0]
  }, [categories])
  const totalContracts = categoriesQ.data?.total_contracts ?? row?.total_contracts ?? null

  // ── Sexenios — group the year timeline into the 5 canonical terms ───────
  const sexenioRows = useMemo(() => {
    const tl = timelineQ.data?.timeline ?? []
    const byAdmin = new Map<AdministrationKey, { value: number; contracts: number }>()
    for (const key of ADMIN_ORDER) byAdmin.set(key, { value: 0, contracts: 0 })
    for (const yr of tl) {
      const admin = getAdministrationByYear(yr.year)
      if (!admin) continue
      const acc = byAdmin.get(admin.key)!
      acc.value += yr.total_value ?? 0
      acc.contracts += yr.contract_count ?? 0
    }
    return ADMIN_ORDER.map((key) => ({ key, ...byAdmin.get(key)! }))
  }, [timelineQ.data])
  const sexenioValueSum = sexenioRows.reduce((s, r) => s + r.value, 0)
  const sexenioContractSum = sexenioRows.reduce((s, r) => s + r.contracts, 0)
  // Backend risk-timeline DOES carry a value field (total_value) — this
  // fallback only fires for the pathological case of an all-zero timeline.
  const byCount = sexenioValueSum <= 0 && sexenioContractSum > 0
  const sexenioMax = Math.max(1, ...sexenioRows.map((r) => (byCount ? r.contracts : r.value)))
  const topSexenio = useMemo(() => {
    if (sexenioValueSum <= 0 && sexenioContractSum <= 0) return null
    return [...sexenioRows].sort((a, b) => (byCount ? b.contracts - a.contracts : b.value - a.value))[0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sexenioRows, byCount])
  const topSexenioShare = topSexenio
    ? byCount
      ? (sexenioContractSum > 0 ? (topSexenio.contracts / sexenioContractSum) * 100 : 0)
      : (sexenioValueSum > 0 ? (topSexenio.value / sexenioValueSum) * 100 : 0)
    : 0

  // Report up for the plate caption — only once institutions + co-bidders
  // have settled for THIS vendor, mirroring CohortRegister's onLoaded gate.
  useEffect(() => {
    if (!onVendorLoaded) return
    if (institutionsQ.isLoading || coBiddersQ.isLoading) return
    onVendorLoaded({
      vendorId,
      label: vendorLabel,
      institutions: institutionsTotal,
      coBidders: coBidders?.length ?? 0,
      categories: categories?.length ?? 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, vendorLabel, institutionsTotal, coBidders, categories, institutionsQ.isLoading, coBiddersQ.isLoading])

  const patternCode = primaryPatternOf(row)

  return (
    <div>
      <AtlasBreadcrumb
        lang={lang}
        lensLabel={lensLabel}
        midLabel={cohortLabel}
        onMidClick={onExitToCohort}
        clusterLabel={vendorLabel}
        onGoHome={onGoHome}
      />
      <div className="pt-10">
        {/* ── Short card ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
          <EntityIdentityChip
            type="vendor"
            id={vendorId}
            name={vendorLabel}
            size="md"
            riskScore={row?.risk_score}
            ariaTier={row ? (row.tier as 1 | 2 | 3 | 4) : undefined}
            sectorCode={row?.primary_sector_code}
            fullName
          />
          {row && (
            <p
              className="tabular-nums"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)',
                color: 'var(--color-accent)',
                margin: 0,
              }}
            >
              {formatDualCurrency(row.total_amount_mxn)}
            </p>
          )}
        </div>
        {row && (
          <p className="font-mono tabular-nums mb-5" style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
            {formatNumber(row.total_contracts)} {isEs ? 'contratos' : 'contracts'}
            {' · '}
            {isEs ? 'riesgo' : 'risk'} {RISK_WORD[getRiskLevelFromScore(row.risk_score)][lang]}
            {' · '}
            {row.primary_sector_name}
            {patternCode && <> · {patternCode}</>}
          </p>
        )}

        {/* ── § EL SALDO ──────────────────────────────────────────────── */}
        <div className="mb-5">
          <PivotKicker>{isEs ? '§ EL SALDO' : '§ THE BALANCE'}</PivotKicker>
          {!topInstitution && !topPartner && (institutionsQ.isLoading || coBiddersQ.isLoading) ? (
            <p className="font-mono text-[12px] text-text-muted">{isEs ? 'Calculando…' : 'Computing…'}</p>
          ) : !topInstitution && !topPartner ? (
            <p className="font-mono text-[12px] text-text-muted">{isEs ? 'Sin relaciones registradas todavía.' : 'No relations on record yet.'}</p>
          ) : (
            <p
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontSize: 'clamp(1rem, 1.6vw, 1.25rem)',
                lineHeight: 1.4,
                color: 'var(--color-text-primary)',
              }}
            >
              {topInstitution && (
                isEs ? (
                  <>Vende a {institutionsTotal} {institutionsTotal === 1 ? 'institución' : 'instituciones'}; {topInstitution.institution_name} concentra{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{topInstitutionShare.toFixed(0)}%</strong> de su valor.{' '}</>
                ) : (
                  <>Sells to {institutionsTotal} {institutionsTotal === 1 ? 'institution' : 'institutions'}; {topInstitution.institution_name} accounts for{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{topInstitutionShare.toFixed(0)}%</strong> of its value.{' '}</>
                )
              )}
              {topPartner && (
                isEs ? (
                  <>Comparte {formatNumber(totalProcedures)} procedimientos con {coBidders?.length ?? 0} co-licitantes; el más cercano es {topPartner.vendor_name}.</>
                ) : (
                  <>Shares {formatNumber(totalProcedures)} procedures with {coBidders?.length ?? 0} co-bidders; the closest is {topPartner.vendor_name}.</>
                )
              )}
            </p>
          )}
        </div>

        {/* ── Pivot 1 — co-licitantes ─────────────────────────────────── */}
        <div className="border border-border rounded-sm p-3 mb-3">
          <PivotKicker>{isEs ? '§ CO-LICITANTES' : '§ CO-BIDDERS'}</PivotKicker>
          {coBiddersQ.isLoading ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Cargando…' : 'Loading…'}</p>
          ) : coBiddersQ.isError ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'No se pudo cargar.' : 'Could not load.'}</p>
          ) : !coBidders || coBidders.length === 0 ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Sin co-licitantes registrados.' : 'No co-bidders on record.'}</p>
          ) : (
            <div className="flex gap-2 items-start overflow-x-auto">
              <svg
                width={CB_SVG_W}
                height={coBidders.length * CB_ROW_H}
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x={0} y={0} width={4} height={coBidders.length * CB_ROW_H} fill="var(--color-accent)" opacity={0.7} />
                {coBidders.map((c, i) => {
                  const maxCount = Math.max(...coBidders.map((x) => x.co_bid_count))
                  const sw = Math.min(6, Math.max(1.5, maxCount > 0 ? (c.co_bid_count / maxCount) * 6 : 1.5))
                  const vy = (coBidders.length * CB_ROW_H) / 2
                  const py = i * CB_ROW_H + CB_ROW_H / 2
                  return (
                    <path
                      key={c.vendor_id}
                      d={`M4,${vy} C${CB_SVG_W * 0.45},${vy} ${CB_SVG_W * 0.55},${py} ${CB_SVG_W - 4},${py}`}
                      fill="none"
                      stroke="var(--color-text-primary)"
                      strokeOpacity={0.38}
                      strokeWidth={sw}
                    />
                  )
                })}
              </svg>
              <div className="flex-1 min-w-0">
                {coBidders.map((c) => (
                  <div key={c.vendor_id} className="flex items-center justify-between gap-2" style={{ height: CB_ROW_H }}>
                    <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="xs" />
                    <span className="font-mono tabular-nums text-[11px] text-text-muted whitespace-nowrap">{formatNumber(c.co_bid_count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pivot 2 — instituciones que le compran ───────────────────── */}
        <div className="border border-border rounded-sm p-3 mb-3">
          <PivotKicker>{isEs ? '§ INSTITUCIONES QUE LE COMPRAN' : '§ INSTITUTIONS THAT BUY FROM IT'}</PivotKicker>
          {institutionsQ.isLoading ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Cargando…' : 'Loading…'}</p>
          ) : institutionsQ.isError ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'No se pudo cargar.' : 'Could not load.'}</p>
          ) : !institutions || institutions.length === 0 ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Sin instituciones registradas.' : 'No institutions on record.'}</p>
          ) : (
            <>
              {topInstitution && (
                <p className="mb-2" style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {isEs
                    ? <>{topInstitution.institution_name} concentra <strong style={{ color: 'var(--color-accent)' }}>{topInstitutionShare.toFixed(0)}%</strong> de su valor.</>
                    : <>{topInstitution.institution_name} accounts for <strong style={{ color: 'var(--color-accent)' }}>{topInstitutionShare.toFixed(0)}%</strong> of its value.</>}
                </p>
              )}
              <div className="overflow-x-auto">
                <div style={{ minWidth: 420 }}>
                  <div
                    className="grid items-center gap-2 py-1 border-b border-border font-mono uppercase"
                    style={{ gridTemplateColumns: '28px minmax(0,1fr) 90px 90px 50px', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                  >
                    <span>Nº</span>
                    <span>{isEs ? 'Institución' : 'Institution'}</span>
                    <span />
                    <span className="text-right">{isEs ? 'Monto' : 'Amount'}</span>
                    <span className="text-right">{isEs ? 'Contr.' : 'Contr.'}</span>
                  </div>
                  {[...institutions].sort((a, b) => b.total_value_mxn - a.total_value_mxn).slice(0, 10).map((inst, i) => (
                    <div
                      key={inst.institution_id}
                      className="grid items-center gap-2 border-b border-border/50"
                      style={{ gridTemplateColumns: '28px minmax(0,1fr) 90px 90px 50px', height: 32 }}
                    >
                      <span className="font-mono tabular-nums text-[12px] text-text-primary">{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.institution_name} size="sm" fullName />
                      </span>
                      <DotBar value={inst.total_value_mxn} max={topInstitution?.total_value_mxn ?? 1} color="var(--color-accent)" />
                      <span className="font-mono tabular-nums text-[12px] text-text-primary text-right whitespace-nowrap">{formatCompactMXN(inst.total_value_mxn)}</span>
                      <span className="font-mono tabular-nums text-[12px] text-text-secondary text-right">{inst.contract_count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {institutions.length > 10 && (
                <Link to={`/vendors/${vendorId}`} className="font-mono text-[11px] mt-1.5 inline-block hover:underline" style={{ color: 'var(--color-text-muted)' }}>
                  {isEs ? 'ver todas en el expediente →' : 'see all in the dossier →'}
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── Pivot 3 — sexenios ────────────────────────────────────────── */}
        <div className="border border-border rounded-sm p-3 mb-3">
          <PivotKicker>{isEs ? '§ SEXENIOS' : '§ ADMINISTRATIONS'}</PivotKicker>
          {timelineQ.isLoading ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Cargando…' : 'Loading…'}</p>
          ) : timelineQ.isError ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'No se pudo cargar.' : 'Could not load.'}</p>
          ) : sexenioValueSum <= 0 && sexenioContractSum <= 0 ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Sin historial por año.' : 'No year-by-year history.'}</p>
          ) : (
            <>
              {topSexenio && (
                <p className="mb-2" style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {isEs
                    ? <><strong style={{ color: 'var(--color-accent)' }}>{topSexenioShare.toFixed(0)}%</strong> de su {byCount ? 'número de contratos' : 'valor'} cayó en {ADMIN_DISPLAY_ACCENTED[topSexenio.key]}.</>
                    : <><strong style={{ color: 'var(--color-accent)' }}>{topSexenioShare.toFixed(0)}%</strong> of its {byCount ? 'contract count' : 'value'} fell in {ADMIN_DISPLAY_ACCENTED[topSexenio.key]}.</>}
                </p>
              )}
              <svg width={ADMIN_ORDER.length * (SEX_COL_W + SEX_GAP) - SEX_GAP} height={SEX_H + 16} aria-hidden="true">
                <defs>
                  <pattern id="vp-hatch" width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
                  </pattern>
                </defs>
                {sexenioRows.map((r, i) => {
                  const v = byCount ? r.contracts : r.value
                  const h = sexenioMax > 0 ? (v / sexenioMax) * SEX_H : 0
                  const x = i * (SEX_COL_W + SEX_GAP)
                  return (
                    <g key={r.key}>
                      <rect x={x} y={SEX_H - h} width={SEX_COL_W} height={h} fill="url(#vp-hatch)" />
                      <rect x={x} y={SEX_H} width={SEX_COL_W} height={4} fill="var(--color-accent)" />
                      <text x={x + SEX_COL_W / 2} y={SEX_H + 15} textAnchor="middle" fontFamily={MONO} fontSize={9} fill="var(--color-text-muted)">
                        {ADMIN_DISPLAY_ACCENTED[r.key]}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </>
          )}
        </div>

        {/* ── Pivot 4 — categorías en que vende ─────────────────────────── */}
        <div className="border border-border rounded-sm p-3 mb-4">
          <PivotKicker>{isEs ? '§ CATEGORÍAS EN QUE VENDE' : '§ CATEGORIES IT SELLS IN'}</PivotKicker>
          {categoriesQ.isLoading ? (
            <p className="font-mono text-[12px] text-text-muted py-3">{isEs ? 'Cargando…' : 'Loading…'}</p>
          ) : categoriesQ.isError || !categories || categories.length === 0 ? (
            <p className="font-mono text-[12px] text-text-muted py-3">
              {isEs ? 'Sin datos de categorías para este proveedor todavía.' : 'No category data for this vendor yet.'}
            </p>
          ) : (
            <>
              {topCategory && (
                <p className="mb-2" style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {isEs
                    ? <>{topCategory.name_es} es <strong style={{ color: 'var(--color-accent)' }}>{(topCategory.share_of_vendor_value * 100).toFixed(0)}%</strong> de su valor.</>
                    : <>{topCategory.name_en} is <strong style={{ color: 'var(--color-accent)' }}>{(topCategory.share_of_vendor_value * 100).toFixed(0)}%</strong> of its value.</>}
                </p>
              )}
              <div className="overflow-x-auto">
                <div style={{ minWidth: 420 }}>
                  <div
                    className="grid items-center gap-2 py-1 border-b border-border font-mono uppercase"
                    style={{ gridTemplateColumns: '28px minmax(0,1fr) 90px 90px 50px', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                  >
                    <span>Nº</span>
                    <span>{isEs ? 'Categoría' : 'Category'}</span>
                    <span />
                    <span className="text-right">{isEs ? 'Monto' : 'Amount'}</span>
                    <span className="text-right">{isEs ? 'Contr.' : 'Contr.'}</span>
                  </div>
                  {[...categories].sort((a, b) => b.share_of_vendor_value - a.share_of_vendor_value).slice(0, 10).map((c, i) => (
                    <div
                      key={c.category_id}
                      className="grid items-center gap-2 border-b border-border/50"
                      style={{ gridTemplateColumns: '28px minmax(0,1fr) 90px 90px 50px', height: 32 }}
                    >
                      <span className="font-mono tabular-nums text-[12px] text-text-primary">{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <EntityIdentityChip type="category" id={c.category_id} name={isEs ? c.name_es : c.name_en} size="sm" fullName />
                      </span>
                      <DotBar value={c.share_of_vendor_value} max={1} color="var(--color-accent)" />
                      <span className="font-mono tabular-nums text-[12px] text-text-primary text-right whitespace-nowrap">{formatCompactMXN(c.total_amount_mxn)}</span>
                      <span className="font-mono tabular-nums text-[12px] text-text-secondary text-right">{c.contracts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {totalContracts != null && (
          <Link
            to={`/contracts?vendor_id=${vendorId}`}
            className="font-mono text-[12px] hover:underline inline-block mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {isEs ? `Ver ${formatNumber(totalContracts)} contratos →` : `See ${formatNumber(totalContracts)} contracts →`}
          </Link>
        )}

        {/* ── Coda ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <span className="font-mono text-[11px] uppercase text-text-muted" style={{ letterSpacing: '0.1em' }}>
            {isEs ? 'Abrir expediente →' : 'Open dossier →'}
          </span>
          <EntityIdentityChip type="vendor" id={vendorId} name={vendorLabel} size="sm" />
          {topInstitution && (
            <EntityIdentityChip type="institution" id={topInstitution.institution_id} name={topInstitution.institution_name} size="sm" />
          )}
          {topPartner && (
            <EntityIdentityChip type="vendor" id={topPartner.vendor_id} name={topPartner.vendor_name} size="sm" />
          )}
        </div>
      </div>
    </div>
  )
}
