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
import { atlasApi, institutionApi, vendorApi } from '@/api/client'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import {
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
      <Breadcrumbs lang={lang} />
      <div className="px-4 py-3">
        {focus.kind === 'system' && <SystemBriefing lang={lang} hoverId={getHoverId(state.hover, 'sector')} />}
        {focus.kind === 'sector' && <SectorBriefing lang={lang} sectorId={focus.sectorId} sectorCode={focus.sectorCode} hoverId={getHoverId(state.hover, 'institution')} />}
        {focus.kind === 'institution' && <InstitutionBriefing lang={lang} institutionId={focus.institutionId} hoverId={getHoverId(state.hover, 'vendor')} />}
        {focus.kind === 'vendor' && <VendorBriefing lang={lang} vendorId={focus.vendorId} vendorName={focus.vendorName} />}
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
    <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted overflow-x-auto whitespace-nowrap">
      {state.stack.map((f, i) => {
        const isLast = i === state.stack.length - 1
        const label = focusLabel(f, lang)
        return (
          <span key={i} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                // Pop the stack until we land on this index
                const target = state.stack.length - 1 - i
                for (let n = 0; n < target; n++) dispatch({ type: 'pop-focus' })
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
    case 'contract': return `Contract ${f.contractId}`
  }
}

// ────────────────────────────────────────────────────────────────────────────
// System briefing — Z0 idle / Z0 hover
// ────────────────────────────────────────────────────────────────────────────

function SystemBriefing({ lang, hoverId }: { lang: 'en' | 'es'; hoverId: number | null }) {
  if (hoverId != null) {
    const sector = SECTORS.find((s) => s.id === hoverId)
    if (sector) {
      const accent = SECTOR_COLORS[sector.code] ?? '#64748b'
      return (
        <div>
          <Eyebrow color={accent}>{lang === 'en' ? 'Hovering · sector' : 'Hover · sector'}</Eyebrow>
          <h2 className="text-lg font-bold mb-1" style={{ color: accent }}>{getSectorName(sector.code, lang)}</h2>
          <p className="text-xs text-text-muted">
            {lang === 'en' ? 'Click to drill into the institutions of this sector.' : 'Clic para profundizar en las instituciones del sector.'}
          </p>
        </div>
      )
    }
  }
  return (
    <div>
      <Eyebrow>{lang === 'en' ? 'System view · Z0' : 'Vista de sistema · Z0'}</Eyebrow>
      <h2 className="text-lg font-bold mb-2 text-text-primary">{lang === 'en' ? '12 federal sectors' : '12 sectores federales'}</h2>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {lang === 'en'
          ? 'Each body is a sector. Hover for a preview. Click to drill into the institutions inside.'
          : 'Cada cuerpo es un sector. Pasa el cursor para una vista previa. Haz clic para profundizar.'}
      </p>
      <Tip lang={lang} />
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
          <h2 className="text-base font-bold mb-1 text-text-primary leading-tight">{toTitleCase(inst.name)}</h2>
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
          <h2 className="text-base font-bold mb-1 text-text-primary leading-tight">{toTitleCase(v.vendor_name)}</h2>
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
      <RiskPill score={risk} />
      <p className="mt-3 text-[11px] text-text-muted leading-relaxed">
        {lang === 'en'
          ? 'Hover a vendor body to preview. Click to open the Red Thread.'
          : 'Pasa el cursor sobre un proveedor para previsualizar. Clic para abrir el Hilo.'}
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
  const { data: vendor } = useQuery({
    queryKey: ['explore', 'vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    enabled: vendorId > 0,
    staleTime: 5 * 60 * 1000,
  })

  const displayName = vendor ? toTitleCase(vendor.name) : toTitleCase(vendorName)
  const risk = vendor?.avg_risk_score ?? 0
  const totalSpend = vendor?.total_value_mxn ?? 0
  const totalContracts = vendor?.total_contracts ?? 0

  return (
    <div>
      <Eyebrow color="var(--color-accent)">{lang === 'en' ? 'Vendor · Z3' : 'Proveedor · Z3'}</Eyebrow>
      <h2 className="text-lg font-bold mb-2 text-text-primary leading-tight">{displayName}</h2>
      <Stat label={lang === 'en' ? 'Contracts' : 'Contratos'} value={formatNumber(totalContracts)} />
      <Stat label={lang === 'en' ? 'Total value' : 'Valor total'} value={formatCompactMXN(totalSpend)} />
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
      <p className="mt-2 text-[10px] text-text-muted leading-relaxed">
        {lang === 'en'
          ? 'Z3 (contracts in space) is on the rebuild plan; for now Red Thread is the deep-dive.'
          : 'Z3 (contratos en espacio) está en el plan; por ahora el Hilo Rojo es el análisis profundo.'}
      </p>
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
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="text-[9px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm"
        style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}
      >
        {level}
      </span>
      <span className="text-sm font-mono font-bold tabular-nums" style={{ color }}>
        {(score * 100).toFixed(1)}%
      </span>
    </div>
  )
}

function Tip({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="text-[9px] font-mono text-text-muted opacity-70 leading-relaxed mt-3 pt-3 border-t border-border/40">
      <div>{lang === 'en' ? 'drag to pan' : 'arrastra para desplazar'}</div>
      <div>{lang === 'en' ? 'wheel to zoom' : 'rueda para acercar'}</div>
      <div>{lang === 'en' ? 'esc to zoom out' : 'esc para alejar'}</div>
    </div>
  )
}
