/**
 * BriefingPanel — right rail of /explore. Reads the active focus + hover
 * from ExploreState and renders an entity preview. The preview adapts
 * based on the entity kind (system / sector / institution / vendor).
 *
 * No legacy ClusterDetailPanel logic, no ZoomedClusterPanel — this is a
 * fresh component that reads only ExploreState.
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { atlasApi, contractApi, institutionApi, sectorApi, vendorApi } from '@/api/client'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  isCurrentViewPinned,
  useCurrentFocus,
  useExploreState,
  useExploreDispatch,
  type Focus,
} from './ExploreState'

interface BriefingPanelProps {
  lang: 'en' | 'es'
}

export function BriefingPanel({ lang }: BriefingPanelProps) {
  const state = useExploreState()
  const focus = useCurrentFocus(state)

  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: 'var(--color-background-card, #fff)',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      <div className="border-b border-border flex items-center justify-between gap-3">
        <Breadcrumbs lang={lang} />
        <PinToggleButton lang={lang} />
      </div>
      <div className="px-4 py-3">
        {focus.kind === 'system' && <SystemBriefing lang={lang} hoverId={getHoverId(state.hover, 'sector')} />}
        {focus.kind === 'sector' && <SectorBriefing lang={lang} sectorId={focus.sectorId} sectorCode={focus.sectorCode} hoverId={getHoverId(state.hover, 'institution')} />}
        {focus.kind === 'institution' && <InstitutionBriefing lang={lang} institutionId={focus.institutionId} hoverId={getHoverId(state.hover, 'vendor')} />}
        {focus.kind === 'vendor' && <VendorBriefing lang={lang} vendorId={focus.vendorId} vendorName={focus.vendorName} />}
        {focus.kind === 'contract' && <ContractBriefing lang={lang} contractId={focus.contractId} />}
      </div>
    </aside>
  )
}

function getHoverId(hover: ReturnType<typeof useExploreState>['hover'], kind: Focus['kind']): number | null {
  if (!hover || hover.kind !== kind) return null
  return hover.id
}

function Breadcrumbs({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  return (
    <div className="flex-1 min-w-0 px-4 py-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted overflow-x-auto whitespace-nowrap">
      {state.stack.map((f, i) => {
        const isLast = i === state.stack.length - 1
        const label = focusLabel(f, lang)
        return (
          <span key={i} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                // 2026-05-09 Phase 3: single dispatch instead of looping
                // pop-focus, so the URL writer only fires once.
                dispatch({ type: 'pop-to-level', level: i })
              }}
              className={isLast ? 'text-text-primary' : 'hover:text-text-secondary transition-colors'}
              style={{ cursor: isLast ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', color: 'inherit' }}
              disabled={isLast}
            >
              {label}
            </button>
            {!isLast && <span className="opacity-60">›</span>}
          </span>
        )
      })}
    </div>
  )
}

/**
 * PinToggleButton — pin the current focus so it stays highlighted as
 * the user navigates to other entities. The pin survives zoom
 * transitions and full-page reloads (persisted to localStorage in
 * ExploreState's reducer). Hidden when the user is at Z0 — pinning
 * "system" is meaningless.
 *
 * Per docs/SCAFFOLDING_OF_THE_UNIVERSE.md Gap 4.
 */
function PinToggleButton({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  const focus = useCurrentFocus(state)
  const pinned = isCurrentViewPinned(state)
  const hasPinAtAll = state.pinnedPath != null && state.pinnedPath.length > 0

  // No pin button at Z0 — can't pin the system root.
  if (focus.kind === 'system') {
    // But if a pin exists from a previous view, offer a "clear pin" affordance.
    if (!hasPinAtAll) return <span className="pr-3" />
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: 'unpin' })}
        className="mr-3 my-1 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors hover:bg-background-elevated text-text-muted whitespace-nowrap"
        style={{ background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
        aria-label={lang === 'en' ? 'Clear pinned entity' : 'Quitar fijado'}
        title={lang === 'en' ? 'Clear the pinned entity' : 'Quitar la entidad fijada'}
      >
        ✕ {lang === 'en' ? 'Pin' : 'Fijado'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: pinned ? 'unpin' : 'pin-current' })}
      className="mr-3 my-1 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors whitespace-nowrap"
      style={{
        background: pinned ? 'var(--color-accent)' : 'transparent',
        color: pinned ? 'white' : 'var(--color-text-secondary)',
        border: `1px solid ${pinned ? 'var(--color-accent)' : 'var(--color-border)'}`,
        cursor: 'pointer',
      }}
      aria-pressed={pinned}
      title={
        pinned
          ? lang === 'en' ? 'Unpin this view' : 'Quitar fijado de esta vista'
          : lang === 'en' ? 'Pin this view so it stays highlighted as you navigate' : 'Fijar esta vista para que se resalte al navegar'
      }
    >
      {pinned
        ? (lang === 'en' ? '📍 Pinned' : '📍 Fijado')
        : (lang === 'en' ? '📍 Pin' : '📍 Fijar')}
    </button>
  )
}

function focusLabel(f: Focus, lang: 'en' | 'es'): string {
  switch (f.kind) {
    case 'system': return lang === 'en' ? 'System' : 'Sistema'
    case 'sector': return getSectorName(f.sectorCode, lang)
    case 'institution': {
      const t = toTitleCase(f.institutionName)
      return t.length > 22 ? t.slice(0, 21) + '…' : t
    }
    case 'vendor': {
      const t = toTitleCase(f.vendorName)
      return t.length > 22 ? t.slice(0, 21) + '…' : t
    }
    case 'contract': return lang === 'en' ? `Contract ${f.contractId}` : `Contrato ${f.contractId}`
  }
}

// ────────────────────────────────────────────────────────────────────────────
// System briefing — Z0 idle / Z0 hover
// ────────────────────────────────────────────────────────────────────────────

function SystemBriefing({ lang, hoverId }: { lang: 'en' | 'es'; hoverId: number | null }) {
  const dispatch = useExploreDispatch()

  // Fetch aggregated sector stats for the Z0 summary panel.
  // Same query key as Z1Layer so the cache is shared.
  const { data: sectorStats } = useQuery({
    queryKey: ['explore', 'z0-sector-stats'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 30 * 60 * 1000,
  })

  // Aggregate platform-wide totals from the sector list response.
  // SectorListResponse has top-level total_contracts / total_value_mxn;
  // avg risk is derived from the per-sector rows.
  const totals = sectorStats
    ? {
        contracts: sectorStats.total_contracts,
        value: sectorStats.total_value_mxn,
        highRiskPct:
          sectorStats.data.length > 0
            ? sectorStats.data.reduce((s, x) => s + (Number(x.avg_risk_score) || 0), 0) /
              sectorStats.data.length
            : null,
      }
    : null

  if (hoverId != null) {
    const sector = SECTORS.find((s) => s.id === hoverId)
    if (sector) {
      const accent = SECTOR_COLORS[sector.code] ?? '#64748b'
      return <SectorHoverPreview sector={sector} accent={accent} lang={lang} />
    }
  }

  return (
    <div>
      <Eyebrow>{lang === 'en' ? 'System view · Z0' : 'Vista de sistema · Z0'}</Eyebrow>
      <h2 className="text-lg font-bold mb-1 text-text-primary">
        {lang === 'en' ? '12 federal sectors' : '12 sectores federales'}
      </h2>

      {/* Platform-wide totals */}
      {totals ? (
        <>
          <Stat
            label={lang === 'en' ? 'Contracts' : 'Contratos'}
            value={formatNumber(totals.contracts)}
          />
          <Stat
            label={lang === 'en' ? 'Total value' : 'Valor total'}
            value={formatCompactMXN(totals.value)}
          />
          {totals.highRiskPct != null && (
            <Stat
              label={lang === 'en' ? 'Avg risk score' : 'Riesgo promedio'}
              value={`${(totals.highRiskPct * 100).toFixed(1)}%`}
            />
          )}
        </>
      ) : (
        <div className="space-y-2 my-3">
          <div className="h-3 w-3/4 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-background-elevated rounded animate-pulse" />
        </div>
      )}

      {/* Sector quick-nav — clickable buttons for each of the 12 sectors */}
      <div className="mt-3 mb-1">
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-2">
          {lang === 'en' ? 'Click a sector to drill in' : 'Haz clic en un sector para profundizar'}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {SECTORS.map((s) => {
            const accent = SECTOR_COLORS[s.code] ?? '#64748b'
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  dispatch({ type: 'drill-into-sector', sectorId: s.id, sectorCode: s.code })
                }
                className="flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors rounded-sm"
                style={{
                  background: `${accent}12`,
                  border: `1px solid ${accent}30`,
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: accent,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span className="text-[10px] font-mono truncate leading-none">
                  {getSectorName(s.code, lang)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Tip lang={lang} />
    </div>
  )
}

/**
 * Live sector preview — fetched on hover. The query key is per-sector so the
 * panel only loads what the user is actually pointing at; cache is shared
 * across the rest of the app via TanStack Query so subsequent visits to
 * /sectors/:id are instant.
 */
function SectorHoverPreview({
  sector,
  accent,
  lang,
}: {
  sector: typeof SECTORS[number]
  accent: string
  lang: 'en' | 'es'
}) {
  // Reuse the same query key + limit as Z1Layer so the cache is shared —
  // hovering a sector pre-warms the drill-in. Backend requires limit >= 10
  // (422 if smaller); we use 60 to match Z1's call exactly.
  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'z1', sector.id],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId: sector.id, limit: 60 }),
    staleTime: 10 * 60 * 1000,
  })

  // Aggregate from the spatial endpoint's sector header (it ships totals).
  const totals = data
    ? {
        institutions: data.total ?? 0,
        contracts: data.institutions.reduce((s, i) => s + (i.total_contracts || 0), 0),
        value: data.institutions.reduce((s, i) => s + (i.total_amount_mxn || 0), 0),
        avgRisk:
          data.institutions.length > 0
            ? data.institutions.reduce((s, i) => s + (i.risk || 0), 0) / data.institutions.length
            : 0,
      }
    : null

  return (
    <div>
      <Eyebrow color={accent}>{lang === 'en' ? 'Hovering · sector' : 'Hover · sector'}</Eyebrow>
      <h2 className="text-lg font-bold mb-2" style={{ color: accent }}>
        {getSectorName(sector.code, lang)}
      </h2>
      {isLoading && (
        <div className="space-y-2 py-1" aria-live="polite">
          <div className="h-3 w-2/3 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-2/5 bg-background-elevated rounded animate-pulse" />
        </div>
      )}
      {totals && (
        <>
          <Stat label={lang === 'en' ? 'Institutions' : 'Instituciones'} value={formatNumber(totals.institutions)} />
          <Stat label={lang === 'en' ? 'Contracts' : 'Contratos'} value={formatNumber(totals.contracts)} />
          <Stat label={lang === 'en' ? 'Total value' : 'Valor total'} value={formatCompactMXN(totals.value)} />
          <RiskPill score={totals.avgRisk} />
        </>
      )}
      <p className="mt-3 text-[11px] text-text-muted leading-relaxed">
        {lang === 'en' ? 'Click to drill into institutions.' : 'Clic para profundizar a instituciones.'}
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sector briefing — Z1
// ────────────────────────────────────────────────────────────────────────────

function SectorBriefing({
  lang,
  sectorId,
  sectorCode,
  hoverId,
}: {
  lang: 'en' | 'es'
  sectorId: number
  sectorCode: string
  hoverId: number | null
}) {
  const accent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  // We already have the spatial endpoint; reuse it for the hover preview.
  const { data } = useQuery({
    queryKey: ['explore', 'z1', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0,
    staleTime: 10 * 60 * 1000,
  })
  if (hoverId != null && data) {
    const inst = data.institutions.find((i) => i.institution_id === hoverId)
    if (inst) {
      return (
        <div>
          <Eyebrow color={accent}>{lang === 'en' ? 'Hovering · institution' : 'Hover · institución'}</Eyebrow>
          {/* Canonical entity chrome — same chip that renders this
              institution in every other surface (Bible §3.1 / CLAUDE.md
              hard rule #1). Click routes through /institutions/:id
              which DeepLinkRedirects back into the universe. */}
          <div className="mb-2">
            <EntityIdentityChip
              type="institution"
              id={inst.institution_id}
              name={inst.name}
              size="md"
              riskScore={inst.risk}
              sectorCode={sectorCode}
            />
          </div>
          <Stat label={lang === 'en' ? 'Contracts' : 'Contratos'} value={formatNumber(inst.total_contracts)} />
          <Stat label={lang === 'en' ? 'Total value' : 'Valor total'} value={formatCompactMXN(inst.total_amount_mxn)} />
          {inst.direct_award_pct != null && (
            <Stat label={lang === 'en' ? 'Direct award %' : 'Adj. directa %'} value={`${(inst.direct_award_pct * 100).toFixed(0)}%`} />
          )}
          <RiskPill score={inst.risk} />
          <p className="mt-2 text-[11px] text-text-muted">
            {lang === 'en' ? 'Click to drill into vendors.' : 'Clic para profundizar a proveedores.'}
          </p>
        </div>
      )
    }
  }
  return (
    <div>
      <Eyebrow color={accent}>{lang === 'en' ? `Sector · Z1` : `Sector · Z1`}</Eyebrow>
      <h2 className="text-lg font-bold mb-2" style={{ color: accent }}>{lang === 'en' ? data?.sector_name_en : data?.sector_name_es}</h2>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {lang === 'en'
          ? `${data?.total ?? '—'} institutions in this sector. Hover any body for a preview, click to drill into vendors.`
          : `${data?.total ?? '—'} instituciones en este sector. Pasa el cursor para una vista previa, clic para profundizar.`}
      </p>
      <SectorStoryChip sectorCode={sectorCode} lang={lang} />
      <Tip lang={lang} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Institution briefing — Z2
// ────────────────────────────────────────────────────────────────────────────

function InstitutionBriefing({
  lang,
  institutionId,
  hoverId,
}: {
  lang: 'en' | 'es'
  institutionId: number
  hoverId: number | null
}) {
  const navigate = useNavigate()
  const { data: inst } = useQuery({
    queryKey: ['explore', 'institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: institutionId > 0,
    staleTime: 5 * 60 * 1000,
  })
  const { data: vendors } = useQuery({
    queryKey: ['explore', 'z2', institutionId],
    queryFn: () => institutionApi.getVendors(institutionId, 30),
    enabled: institutionId > 0,
    staleTime: 5 * 60 * 1000,
  })

  if (hoverId != null && vendors?.data) {
    const v = vendors.data.find((x) => x.vendor_id === hoverId)
    if (v) {
      const risk = v.avg_risk_score ?? 0
      return (
        <div>
          <Eyebrow color={RISK_COLORS[getRiskLevelFromScore(risk)]}>
            {lang === 'en' ? 'Hovering · vendor' : 'Hover · proveedor'}
          </Eyebrow>
          {/* Canonical vendor chip — name through formatVendorName,
              risk dot driven by avg_risk_score. */}
          <div className="mb-2">
            <EntityIdentityChip
              type="vendor"
              id={v.vendor_id}
              name={v.vendor_name}
              size="md"
              riskScore={risk}
            />
          </div>
          <Stat label={lang === 'en' ? 'Contracts here' : 'Contratos aquí'} value={formatNumber(v.contract_count)} />
          <Stat label={lang === 'en' ? 'Value' : 'Valor'} value={formatCompactMXN(v.total_value_mxn)} />
          <RiskPill score={risk} />
          <p className="mt-2 text-[11px] text-text-muted">
            {lang === 'en' ? 'Click to open the Red Thread for this vendor.' : 'Clic para abrir el Hilo Rojo del proveedor.'}
          </p>
        </div>
      )
    }
  }

  if (!inst) return null
  const displayName = toTitleCase(inst.name)
  const totalSpend = inst.total_amount_mxn ?? 0
  const totalContracts = inst.total_contracts ?? 0
  const vendorCount = inst.vendor_count
  const directAwardPct = inst.direct_award_pct ?? inst.direct_award_rate ?? null
  const risk = inst.avg_risk_score ?? 0
  const highRiskPct = inst.high_risk_percentage ?? null
  const longestTenured = (inst.longest_tenured_vendors ?? [])[0]

  return (
    <div>
      <Eyebrow color="var(--color-accent)">{lang === 'en' ? 'Institution · Z2' : 'Institución · Z2'}</Eyebrow>
      <h2 className="text-lg font-bold mb-2 text-text-primary leading-tight">{displayName}</h2>
      <Stat label={lang === 'en' ? 'Contracts' : 'Contratos'} value={formatNumber(totalContracts)} />
      <Stat label={lang === 'en' ? 'Total value' : 'Valor total'} value={formatCompactMXN(totalSpend)} />
      {vendorCount != null && <Stat label={lang === 'en' ? 'Vendors' : 'Proveedores'} value={formatNumber(vendorCount)} />}
      {directAwardPct != null && (
        <Stat
          label={lang === 'en' ? 'Direct award %' : 'Adj. directa %'}
          // Backend is inconsistent: institutionApi.getById returns
          // direct_award_rate as a 0–100 percentage (e.g. 67.78 for IMSS),
          // while atlasApi.getSectorInstitutionsSpatial returns
          // direct_award_pct as a 0–1 fraction. Heuristic: > 1 → already %.
          value={`${(directAwardPct > 1 ? directAwardPct : directAwardPct * 100).toFixed(0)}%`}
        />
      )}
      {highRiskPct != null && (
        <Stat
          label={lang === 'en' ? 'High-risk contracts' : 'Contratos alto riesgo'}
          value={`${(highRiskPct > 1 ? highRiskPct : highRiskPct * 100).toFixed(1)}%`}
        />
      )}
      {longestTenured && (
        <div className="flex items-center justify-between py-1 border-b border-border/40 gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-muted shrink-0">
            {lang === 'en' ? 'Longest tenure' : 'Mayor antigüedad'}
          </span>
          {/* Canonical vendor chip — clicks through DeepLinkRedirect
              back into the universe focused on that vendor. */}
          <EntityIdentityChip
            type="vendor"
            id={longestTenured.vendor_id}
            name={longestTenured.vendor_name}
            size="xs"
            riskScore={longestTenured.avg_risk_score ?? null}
          />
        </div>
      )}
      <RiskPill score={risk} />
      <button
        type="button"
        onClick={() => navigate(`/print/institutions/${institutionId}`)}
        className="mt-3 w-full py-1.5 px-3 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
      >
        {lang === 'en' ? '◆ Full dossier (printable)' : '◆ Dossier completo (imprimible)'}
      </button>
      <p className="mt-3 text-[11px] text-text-muted leading-relaxed">
        {lang === 'en'
          ? 'Hover a vendor body to preview. Click to drill into Z3 (the contract scatter).'
          : 'Pasa el cursor sobre un proveedor para previsualizar. Clic para profundizar a Z3.'}
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Vendor briefing — Z3 (deep-link to /thread)
// ────────────────────────────────────────────────────────────────────────────

function VendorBriefing({
  lang,
  vendorId,
  vendorName,
}: {
  lang: 'en' | 'es'
  vendorId: number
  vendorName: string
}) {
  const navigate = useNavigate()
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['explore', 'vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    enabled: vendorId > 0,
    staleTime: 5 * 60 * 1000,
  })

  const displayName = vendor ? toTitleCase(vendor.name) : toTitleCase(vendorName)
  const risk = vendor?.avg_risk_score ?? 0
  const totalSpend = vendor?.total_value_mxn ?? 0
  const totalContracts = vendor?.total_contracts ?? 0
  const directAwardPct = vendor?.direct_award_pct ?? null
  const yearsActive = vendor?.years_active ?? null
  const firstYear = vendor?.first_contract_year
  const lastYear = vendor?.last_contract_year
  const topInstitution = vendor?.top_institutions?.[0]
  const isEfos = vendor?.is_efos_ghost === true
  const isSfp = vendor?.is_sfp_sanctioned === true

  // 2026-05-12 (Audit V007 P1): on first hydration the vendor query is
  // pending while the briefing renders stats that fall back to 0 — the
  // user reads "CONTRACTS 0, TOTAL VALUE MX$0, LOW 0.0%" for ~2s as a
  // working answer. Render skeleton lines during isLoading so the
  // numbers don't lie during the fetch.
  if (isLoading && !vendor) {
    return (
      <div>
        <Eyebrow color="var(--color-accent)">{lang === 'en' ? 'Vendor · Z3' : 'Proveedor · Z3'}</Eyebrow>
        <h2 className="text-lg font-bold mb-2 text-text-primary leading-tight">{displayName}</h2>
        <div className="space-y-2 mt-3" aria-live="polite">
          <div className="h-3 w-3/4 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-background-elevated rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Eyebrow color="var(--color-accent)">{lang === 'en' ? 'Vendor · Z3' : 'Proveedor · Z3'}</Eyebrow>
      <h2 className="text-lg font-bold mb-2 text-text-primary leading-tight">{displayName}</h2>

      {/* External-watchlist red flags — only render if true */}
      {(isEfos || isSfp) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {isEfos && (
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm bg-risk-critical/10 text-risk-critical border border-risk-critical/30">
              EFOS
            </span>
          )}
          {isSfp && (
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm bg-risk-high/10 text-risk-high border border-risk-high/30">
              SFP
            </span>
          )}
        </div>
      )}

      <Stat label={lang === 'en' ? 'Contracts' : 'Contratos'} value={formatNumber(totalContracts)} />
      <Stat label={lang === 'en' ? 'Total value' : 'Valor total'} value={formatCompactMXN(totalSpend)} />
      {directAwardPct != null && (
        <Stat
          label={lang === 'en' ? 'Direct award %' : 'Adj. directa %'}
          value={`${(directAwardPct > 1 ? directAwardPct : directAwardPct * 100).toFixed(0)}%`}
        />
      )}
      {yearsActive != null && firstYear != null && lastYear != null && (
        <Stat
          label={lang === 'en' ? 'Active' : 'Activo'}
          value={`${firstYear}–${lastYear} (${yearsActive}y)`}
        />
      )}
      {topInstitution && (() => {
        const ti = topInstitution as {
          institution_id?: number
          institution_name?: string
          name?: string
        }
        const name = ti.institution_name ?? ti.name ?? null
        if (!name) return null
        if (!ti.institution_id) {
          // No id → fall back to a plain Stat row.
          return <Stat label={lang === 'en' ? 'Top client' : 'Cliente top'} value={name} />
        }
        return (
          <div className="flex items-center justify-between py-1 border-b border-border/40 gap-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-muted shrink-0">
              {lang === 'en' ? 'Top client' : 'Cliente top'}
            </span>
            <EntityIdentityChip
              type="institution"
              id={ti.institution_id}
              name={name}
              size="xs"
            />
          </div>
        )
      })()}
      <RiskPill score={risk} />
      <button
        type="button"
        onClick={() => navigate(`/thread/${vendorId}`)}
        className="mt-4 w-full py-2 px-3 text-[11px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors"
        style={{
          background: 'var(--color-accent)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {lang === 'en' ? '→ Open Red Thread' : '→ Abrir Hilo Rojo'}
      </button>
      <button
        type="button"
        onClick={() => navigate(`/print/vendors/${vendorId}`)}
        className="mt-2 w-full py-1.5 px-3 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
      >
        {lang === 'en' ? '◆ Full dossier (printable)' : '◆ Dossier completo (imprimible)'}
      </button>
      <p className="mt-3 text-[10px] text-text-muted leading-relaxed">
        {lang === 'en'
          ? 'Click a contract on the canvas for the contract detail view.'
          : 'Clic en un contrato en el lienzo para el detalle.'}
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// BriefingShell — Gap 7. Universal wrapper for the four states every
// entity briefing has: loading, empty, error, ready. Replaces the
// "each briefing reimplements its own spinner/empty line" pattern that
// produced 3 different loading affordances across SystemBriefing,
// SectorBriefing, InstitutionBriefing, VendorBriefing, ContractBriefing.
//
// The shell is intentionally minimal — it does NOT render an entity
// header (each briefing keeps its own eyebrow + identity chip). It
// only wraps the body content slot with consistent state visuals.
// ────────────────────────────────────────────────────────────────────────────

type BriefingState = 'loading' | 'empty' | 'error' | 'ready'

interface BriefingShellProps {
  state: BriefingState
  lang: 'en' | 'es'
  /** Optional override for the loading copy. */
  loadingLabel?: string
  /** Optional override for the empty-state copy. */
  emptyLabel?: string
  /** Optional override for the error-state copy. */
  errorLabel?: string
  /** Optional retry handler — renders a small "retry" button under the error message. */
  onRetry?: () => void
  /** Always-rendered prefix (eyebrow + identity row). */
  header: React.ReactNode
  /** Body content, rendered only when state === 'ready'. */
  children: React.ReactNode
}

function BriefingShell({
  state,
  lang,
  loadingLabel,
  emptyLabel,
  errorLabel,
  onRetry,
  header,
  children,
}: BriefingShellProps) {
  return (
    <div>
      {header}
      {state === 'loading' && (
        <div className="space-y-2 py-2" aria-live="polite" aria-label={loadingLabel ?? (lang === 'en' ? 'Loading…' : 'Cargando…')}>
          <div className="h-4 w-3/4 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-background-elevated rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-background-elevated rounded animate-pulse" />
        </div>
      )}
      {state === 'empty' && (
        <p className="text-xs text-text-secondary py-2 leading-relaxed">
          {emptyLabel ?? (lang === 'en' ? 'No data for this view.' : 'Sin datos para esta vista.')}
        </p>
      )}
      {state === 'error' && (
        <div className="py-2">
          <p className="text-xs text-text-secondary leading-relaxed mb-2">
            {errorLabel ?? (lang === 'en' ? 'Could not load this entity.' : 'No se pudo cargar esta entidad.')}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-primary transition-colors"
              style={{ background: 'none', border: '1px solid var(--color-border)', padding: '4px 10px', cursor: 'pointer', borderRadius: 3 }}
            >
              {lang === 'en' ? '↻ Retry' : '↻ Reintentar'}
            </button>
          )}
        </div>
      )}
      {state === 'ready' && children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Contract briefing — Z4 (in-canvas focus, briefing only — visual stays Z3)
// ────────────────────────────────────────────────────────────────────────────

function ContractBriefing({
  lang,
  contractId,
}: {
  lang: 'en' | 'es'
  contractId: number
}) {
  const navigate = useNavigate()
  const dispatch = useExploreDispatch()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['explore', 'contract', contractId],
    queryFn: () => contractApi.getById(contractId),
    enabled: contractId > 0,
    staleTime: 5 * 60 * 1000,
    // 2026-05-12 (Audit G7 FAIL): React Query's default of 3 retries
    // with exponential backoff meant an invalid contract id (e.g. a
    // shared deep link to a since-deleted contract) sat on
    // "Loading contract…" for 10–15s before BriefingShell flipped to
    // error state. Don't retry on 4xx — they're not transient. One
    // retry on 5xx covers the genuinely flaky case.
    retry: (failureCount, err) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status != null && status >= 400 && status < 500) return false
      return failureCount < 1
    },
  })

  // The loading/error/empty paths use the muted shell. The "ready" path
  // (below) replaces "Contract · Z4" with an editorial verdict header —
  // a journalist hitting a deep link should land on a finding, not on
  // database nomenclature.
  if (isLoading || isError || !data) {
    const state: BriefingState = isLoading ? 'loading' : isError ? 'error' : 'empty'
    const eyebrow = (
      <Eyebrow color="var(--color-accent)">{lang === 'en' ? 'Contract · Z4' : 'Contrato · Z4'}</Eyebrow>
    )
    return (
      <BriefingShell
        state={state}
        lang={lang}
        header={eyebrow}
        loadingLabel={lang === 'en' ? 'Loading contract…' : 'Cargando contrato…'}
        errorLabel={lang === 'en' ? 'Could not load this contract.' : 'No se pudo cargar este contrato.'}
        emptyLabel={lang === 'en' ? 'No data for this contract.' : 'Sin datos para este contrato.'}
        onRetry={state === 'error' ? () => refetch() : undefined}
      >
        {null}
      </BriefingShell>
    )
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const risk = Number(data.risk_score ?? 0)
  const riskLevel = getRiskLevelFromScore(risk)
  const riskColor = RISK_COLORS[riskLevel]
  const amount = Number(data.amount_mxn ?? 0)
  const date = data.contract_date || data.award_date || (data.contract_year ? String(data.contract_year) : '—')
  const procedure = data.procedure_type_normalized || data.procedure_type || (data.is_direct_award ? (lang === 'en' ? 'Direct award' : 'Adj. directa') : '—')
  const title = data.title || data.description || (lang === 'en' ? `Contract ${data.id}` : `Contrato ${data.id}`)
  const risk_factors = data.risk_factors || []
  const ciLo = data.risk_confidence_lower
  const ciHi = data.risk_confidence_upper

  // Sector accent: drives the verdict header tint + left rail.
  const sectorCode = data.sector_id != null
    ? SECTORS.find((s) => s.id === data.sector_id)?.code
    : undefined
  const sectorAccent = sectorCode ? (SECTOR_COLORS[sectorCode] ?? riskColor) : riskColor
  const sectorLabel = sectorCode ? getSectorName(sectorCode, lang) : (data.sector_name || '—')

  // Risk level → editorial label (verdict, not database enum).
  const riskLabel: Record<string, { en: string; es: string }> = {
    critical: { en: 'Critical risk', es: 'Riesgo crítico' },
    high: { en: 'High risk', es: 'Alto riesgo' },
    medium: { en: 'Medium risk', es: 'Riesgo medio' },
    low: { en: 'Low risk', es: 'Riesgo bajo' },
  }
  const verdictLabel = riskLabel[riskLevel]?.[lang] ?? riskLevel

  // Active boolean flags only — silence the false ones.
  type Flag = { key: string; label: string }
  const flags: Flag[] = []
  if (data.is_direct_award) flags.push({ key: 'da', label: lang === 'en' ? 'DIRECT AWARD' : 'ADJ. DIRECTA' })
  if (data.is_single_bid) flags.push({ key: 'sb', label: lang === 'en' ? 'SINGLE BID' : 'OFERTA ÚNICA' })
  if (data.is_year_end) flags.push({ key: 'ye', label: lang === 'en' ? 'YEAR-END' : 'FIN DE AÑO' })
  if (data.is_election_year) flags.push({ key: 'el', label: lang === 'en' ? 'ELECTION YEAR' : 'AÑO ELECTORAL' })
  if (data.is_threshold_gaming) flags.push({ key: 'tg', label: lang === 'en' ? 'THRESHOLD GAME' : 'UMBRAL' })

  // Risk-factor taxonomy (truncated dictionary — anything unrecognized
  // falls through as the raw code, which is honest).
  const factorLabel = (code: string) => {
    const map: Record<string, { en: string; es: string }> = {
      direct_award: { en: 'Direct award', es: 'Adjudicación directa' },
      single_bid: { en: 'Single bid', es: 'Una sola oferta' },
      price_volatility: { en: 'Price volatility', es: 'Volatilidad de precio' },
      vendor_concentration: { en: 'Vendor concentration', es: 'Concentración de proveedor' },
      institution_diversity: { en: 'Low institution diversity', es: 'Baja diversidad institucional' },
      network_member: { en: 'Network member', es: 'Miembro de red' },
      same_day: { en: 'Same-day awards', es: 'Adj. mismo día' },
      ad_period: { en: 'Short ad period', es: 'Publicación corta' },
      threshold_gaming: { en: 'Threshold gaming', es: 'Manipulación de umbral' },
      year_end: { en: 'Year-end award', es: 'Adj. fin de año' },
      amendment: { en: 'Amendments', es: 'Modificaciones' },
      cobid: { en: 'Co-bid concentration', es: 'Concentración co-licitantes' },
    }
    return map[code]?.[lang] || code.replace(/_/g, ' ')
  }

  // Contract duration in days (only when both start + end exist).
  let durationDays: number | null = null
  if (data.start_date && data.end_date) {
    const a = Date.parse(data.start_date)
    const b = Date.parse(data.end_date)
    if (!isNaN(a) && !isNaN(b) && b >= a) durationDays = Math.round((b - a) / 86400000)
  }

  // Narrative synthesis under the RiskPill — one sentence that names
  // the top two factors and the total count. If there are none we fall
  // back to a confidence-only line so the section never reads empty.
  const renderRiskNarrative = () => {
    if (risk_factors.length === 0) {
      if (ciLo != null && ciHi != null) {
        return lang === 'en'
          ? `Indicator within 95% CI ${(ciLo * 100).toFixed(0)}–${(ciHi * 100).toFixed(0)}%.`
          : `Indicador dentro del IC 95% ${(ciLo * 100).toFixed(0)}–${(ciHi * 100).toFixed(0)}%.`
      }
      return null
    }
    const lead = risk_factors.slice(0, 2).map(factorLabel)
    const rest = risk_factors.length - lead.length
    const joined = lead.length === 2
      ? lang === 'en' ? `${lead[0]} and ${lead[1].toLowerCase()}` : `${lead[0]} y ${lead[1].toLowerCase()}`
      : lead[0]
    const total = risk_factors.length
    if (rest > 0) {
      return lang === 'en'
        ? `Flagged for ${joined.toLowerCase()} among ${total} indicators.`
        : `Marcado por ${joined.toLowerCase()} entre ${total} indicadores.`
    }
    return lang === 'en'
      ? `Flagged for ${joined.toLowerCase()}.`
      : `Marcado por ${joined.toLowerCase()}.`
  }

  const vendorId = data.vendor_id

  return (
    <div>
      {/* ── 1. Editorial verdict header ─────────────────────────────────
          Sector · risk level. The risk score is the verdict; the sector
          places it on the map. Replaces "Contract · Z4". */}
      <div
        className="mb-3 pl-2 border-l-2"
        style={{ borderColor: sectorAccent }}
      >
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] leading-tight">
          <span style={{ color: sectorAccent }}>{sectorLabel}</span>
          <span className="text-text-muted mx-1">·</span>
          <span style={{ color: riskColor }}>{verdictLabel}</span>
        </div>
      </div>

      {/* ── 2. Title as headline (Playfair Display) ────────────────────── */}
      <h2
        className="mb-1 text-text-primary leading-[1.15] line-clamp-4"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: '1.0625rem',
          fontWeight: 700,
          letterSpacing: '-0.005em',
        }}
      >
        {toTitleCase(title)}
      </h2>
      {data.contract_number && (
        <div className="text-[10px] font-mono text-text-muted mb-3 tracking-wide truncate">
          № {data.contract_number}
        </div>
      )}

      {/* ── 3. Flag row — boolean red flags, only when true ────────────── */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {flags.map((f) => (
            <span
              key={f.key}
              className="text-[8.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
              style={{
                color: riskColor,
                background: `${riskColor}14`,
                border: `1px solid ${riskColor}40`,
              }}
            >
              {f.label}
            </span>
          ))}
        </div>
      )}

      {/* ── 4. Anchor stat — Amount in Playfair Italic 800 ─────────────── */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted mb-0.5">
          {lang === 'en' ? 'Awarded amount' : 'Monto adjudicado'}
        </div>
        <div
          className="leading-none tabular-nums"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: '2rem',
            color: riskColor,
            letterSpacing: '-0.01em',
          }}
        >
          {formatCompactMXN(amount)}
        </div>
        {data.is_high_value && (
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mt-1">
            {lang === 'en' ? 'High-value contract' : 'Contrato de alto valor'}
          </div>
        )}
      </div>

      {/* ── 5. Secondary stats — compact 2-col grid ────────────────────── */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3 pb-3 border-b border-border/40">
        <MicroStat
          label={lang === 'en' ? 'Date' : 'Fecha'}
          value={String(date).slice(0, 10)}
        />
        <MicroStat
          label={lang === 'en' ? 'Procedure' : 'Procedimiento'}
          value={procedure}
        />
        {durationDays != null && (
          <MicroStat
            label={lang === 'en' ? 'Duration' : 'Duración'}
            value={lang === 'en' ? `${durationDays}d` : `${durationDays}d`}
          />
        )}
        {data.data_quality_grade && (
          <MicroStat
            label={lang === 'en' ? 'Data quality' : 'Calidad'}
            value={`${data.data_quality_grade}${data.source_structure ? ` · ${data.source_structure}` : ''}`}
          />
        )}
        {data.publication_delay_days != null && (
          <MicroStat
            label={lang === 'en' ? 'Ad period' : 'Publicación'}
            value={`${data.publication_delay_days}d`}
          />
        )}
        {data.contract_year != null && data.sexenio_year != null && (
          <MicroStat
            label={lang === 'en' ? 'Sexenio yr.' : 'Año sexenio'}
            value={`Y${data.sexenio_year}`}
          />
        )}
      </div>

      {/* ── 6. Institution chip ───────────────────────────────────────── */}
      {data.institution_id && (
        <div className="mb-3">
          <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-1">
            {lang === 'en' ? 'Contracting institution' : 'Institución contratante'}
          </div>
          <EntityIdentityChip
            type="institution"
            id={data.institution_id}
            name={data.institution_name ?? '—'}
            size="md"
          />
        </div>
      )}

      {/* ── 7. Risk verdict + narrative ────────────────────────────────── */}
      <div className="mb-3 pb-3 border-b border-border/40">
        <RiskPill score={risk} />
        {(() => {
          const narrative = renderRiskNarrative()
          if (!narrative) return null
          return (
            <p className="mt-2 text-[11px] text-text-secondary leading-snug">
              {narrative}
              {risk_factors.length > 0 && ciLo != null && ciHi != null && (
                <span className="text-[9px] font-mono text-text-muted ml-1">
                  (CI {(ciLo * 100).toFixed(0)}–{(ciHi * 100).toFixed(0)}%)
                </span>
              )}
            </p>
          )
        })()}

        {/* ── 8. Risk factor mini-list — bullets, max 4 ─────────────── */}
        {risk_factors.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {risk_factors.slice(0, 4).map((f) => (
              <li
                key={f}
                className="text-[11px] leading-snug text-text-secondary flex items-start gap-1.5"
              >
                <span
                  className="inline-block mt-[5px] shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: riskColor,
                  }}
                />
                <span>{factorLabel(f)}</span>
              </li>
            ))}
            {risk_factors.length > 4 && (
              <li className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted pl-3.5">
                + {risk_factors.length - 4} {lang === 'en' ? 'more' : 'más'}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── 9. COMPRANET source link ──────────────────────────────────── */}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-primary transition-colors mb-3"
        >
          <ExternalLink className="w-3 h-3" />
          <span>{lang === 'en' ? 'View on COMPRANET' : 'Ver en COMPRANET'}</span>
        </a>
      )}

      {/* ── 10. CTAs — Red Thread (primary) + Dossier (secondary) ─────── */}
      {vendorId != null && vendorId > 0 && (
        <>
          <button
            type="button"
            onClick={() => navigate(`/thread/${vendorId}`)}
            className="w-full py-2 px-3 text-[11px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors"
            style={{
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'en' ? '→ Open Red Thread' : '→ Abrir Hilo Rojo'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/print/vendors/${vendorId}`)}
            className="mt-2 w-full py-1.5 px-3 text-[10px] font-mono uppercase tracking-[0.14em] rounded-sm transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            {lang === 'en' ? '◆ Full dossier' : '◆ Dossier completo'}
          </button>
        </>
      )}

      {/* ── 11. De-emphasized back link ────────────────────────────────── */}
      <button
        type="button"
        onClick={() => dispatch({ type: 'pop-focus' })}
        className="mt-4 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70 hover:text-text-secondary transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        ← {lang === 'en' ? 'back to vendor (esc)' : 'volver al proveedor (esc)'}
      </button>
    </div>
  )
}

/**
 * MicroStat — compact label-over-value atom for the secondary stats
 * grid. Smaller than the row-based `Stat` so two fit comfortably in the
 * 280px rail.
 */
function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted leading-tight mb-0.5">
        {label}
      </div>
      <div className="text-[12px] font-mono tabular-nums text-text-primary truncate">
        {value}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms
// ────────────────────────────────────────────────────────────────────────────

function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] mb-2"
      style={{ color: color ?? 'var(--color-text-muted)' }}
    >
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-border/40">
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
      <span className="text-sm font-mono font-bold tabular-nums text-text-primary">{value}</span>
    </div>
  )
}

function RiskPill({ score }: { score: number }) {
  const level = getRiskLevelFromScore(score)
  const color = RISK_COLORS[level]
  // Score bar — 22 dots, score×22 filled. Mirrors the DotBar primitive
  // rhythm used elsewhere in the app, just inline so this stays a single
  // briefing-panel atom.
  const N = 22
  const filled = Math.max(0, Math.min(N, Math.round(score * N)))
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[9px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-sm"
          style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}
        >
          {level}
        </span>
        <span className="text-sm font-mono font-bold tabular-nums" style={{ color }}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
      <svg width="100%" height={6} viewBox={`0 0 ${N * 5} 6`} preserveAspectRatio="none">
        {Array.from({ length: N }, (_, i) => (
          <rect
            key={i}
            x={i * 5}
            y={1}
            width={3}
            height={4}
            rx={1}
            fill={i < filled ? color : 'var(--color-border)'}
            opacity={i < filled ? 1 : 0.6}
          />
        ))}
      </svg>
    </div>
  )
}

/**
 * SectorStoryChip — surfaces a curated long-form narrative when the user
 * has drilled into a sector that has one. Maps sector code → story slug
 * so the briefing rail becomes an entry point into the editorial layer
 * for journalists who want context, not just data.
 *
 * Coverage today: salud (pharma cartel) · agricultura + hacienda (estafa
 * maestra) · salud also gets covid-year as a secondary suggestion. Other
 * sectors get no chip (rather than a noisy "no story available" line).
 */
function SectorStoryChip({ sectorCode, lang }: { sectorCode: string; lang: 'en' | 'es' }) {
  const story = SECTOR_STORY_MAP[sectorCode]
  if (!story) return null
  return (
    <a
      href={`/stories/${story.slug}`}
      className="block mt-3 mb-2 px-3 py-2 transition-colors"
      style={{
        background: 'var(--color-background-elevated)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${SECTOR_COLORS[sectorCode] ?? 'var(--color-accent)'}`,
        borderRadius: 4,
        textDecoration: 'none',
      }}
    >
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-0.5">
        {lang === 'en' ? '📖 read · related story' : '📖 lectura · historia relacionada'}
      </div>
      <div className="text-[12px] font-bold text-text-primary leading-snug">
        {lang === 'en' ? story.titleEn : story.titleEs}
      </div>
    </a>
  )
}

const SECTOR_STORY_MAP: Record<string, { slug: string; titleEn: string; titleEs: string }> = {
  salud: {
    slug: 'el-monopolio-invisible',
    titleEn: 'The Invisible Monopoly',
    titleEs: 'El monopolio invisible',
  },
  infraestructura: {
    slug: 'captura-institucional',
    titleEn: 'Inside Institutional Capture',
    titleEs: 'Captura Institucional',
  },
  hacienda: {
    slug: 'la-ilusion-competitiva',
    titleEn: 'The Competition That Never Was',
    titleEs: 'La Ilusión Competitiva',
  },
  energia: {
    slug: 'captura-institucional',
    titleEn: 'Inside Institutional Capture',
    titleEs: 'Captura Institucional',
  },
  defensa: {
    slug: 'el-sexenio-del-riesgo',
    titleEn: 'The Era of Risk',
    titleEs: 'El Sexenio del Riesgo',
  },
  gobernacion: {
    slug: 'marea-de-adjudicaciones',
    titleEn: 'The Direct Award Tide',
    titleEs: 'La Marea de las Adjudicaciones',
  },
  otros: {
    slug: 'marea-de-adjudicaciones',
    titleEn: 'The Direct Award Tide',
    titleEs: 'La Marea de las Adjudicaciones',
  },
}

function Tip({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="text-[9px] font-mono text-text-muted opacity-70 leading-relaxed mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-x-3">
      <div>{lang === 'en' ? 'drag · pan' : 'arrastra · desplazar'}</div>
      <div>{lang === 'en' ? 'wheel · zoom' : 'rueda · acercar'}</div>
      <div>{lang === 'en' ? 'pinch · zoom' : 'pellizca · acercar'}</div>
      <div>{lang === 'en' ? '+ / − · zoom' : '+ / − · acercar'}</div>
      <div>{lang === 'en' ? 'esc · back' : 'esc · atrás'}</div>
      <div>{lang === 'en' ? '0 · home' : '0 · inicio'}</div>
      <div>{lang === 'en' ? '⌘K · search' : '⌘K · buscar'}</div>
    </div>
  )
}
