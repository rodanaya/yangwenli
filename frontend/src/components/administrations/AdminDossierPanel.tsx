/**
 * AdminDossierPanel — per-administration deep-dive panel.
 *
 * Three-column layout: political context + scandals + key figures (col 1),
 * procurement fingerprint stats + grade card (col 2), top vendors + top
 * sectors (col 3). Header strip with party badge, year range, contract
 * count, and high-risk callout.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) — was the single
 * largest function in the page (~370 LOC) and made the parent module
 * 3,671 LOC. Now lives here so the parent stays scannable and this
 * panel can be reused elsewhere if needed.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Banknote,
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  BookOpen,
  Landmark,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { DotBar } from '@/components/ui/DotBar'
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
import { PresidentAvatar } from './PresidentAvatar'
import { ProcurementGradeCard } from './ProcurementGradeCard'
import { DOSSIER_DATA, PARTY_COLORS, SEVERITY_COLORS } from './data'
import type { AdminAgg, AdminMeta, AdminName } from './types'

export interface DossierPanelProps {
  adminName: AdminName
  adminMeta: AdminMeta
  agg: AdminAgg | undefined
  vendors: Array<{ name: string; total_mxn: number; contracts: number; risk_pct: number }>
  vendorsLoading: boolean
  sectorData: Array<{ sectorId: number; code: string; name: string; color: string; contracts: number; da: number; sb: number; hr: number; risk: number }>
}

export function AdminDossierPanel({
  adminName,
  adminMeta,
  agg,
  vendors,
  vendorsLoading,
  sectorData,
}: DossierPanelProps) {
  const { t, i18n } = useTranslation('administrations')
  const isEs = i18n.language?.startsWith('es') ?? false
  const dossier = DOSSIER_DATA[adminName]
  const partyColor = PARTY_COLORS[adminMeta.party] || '#64748b'

  // Top sectors by contract count from live sectorData
  const topSectors = useMemo(() => {
    const sorted = [...sectorData]
      .filter((s) => s.contracts > 0)
      .sort((a, b) => b.contracts - a.contracts)
      .slice(0, 5)
    return sorted
  }, [sectorData])

  // Flag Fox era DA as data artifact (Structure A 2002-2010 didn't record DA reliably)
  const isFoxEra = adminName === 'Fox'
  const fingerprintItems = agg ? [
    { labelKey: 'dossier.fingerprint.totalSpend',   value: formatCompactMXN(agg.totalValue),               icon: Banknote },
    { labelKey: 'dossier.fingerprint.directAward',  value: isFoxEra ? `${agg.directAwardPct.toFixed(1)}%*` : `${agg.directAwardPct.toFixed(1)}%`, icon: Shield },
    { labelKey: 'dossier.fingerprint.singleBid',    value: `${agg.singleBidPct.toFixed(1)}%`,              icon: Users },
    { labelKey: 'dossier.fingerprint.avgRisk',      value: `${(agg.avgRisk * 100).toFixed(1)}%`,           icon: Activity },
    { labelKey: 'dossier.fingerprint.highRisk',     value: `${agg.highRiskPct.toFixed(1)}%`,               icon: AlertTriangle },
    { labelKey: 'dossier.fingerprint.valueAtRisk',  value: formatCompactMXN(agg.valueAtRisk),              icon: Banknote },
    { labelKey: 'dossier.fingerprint.vendors',      value: formatNumber(agg.vendorCount),                  icon: FileText },
  ] : []

  return (
    <motion.div
      key={adminName}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-sm border border-border/50 bg-background-card overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: partyColor }}
    >
      {/* Dossier Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/30 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] tracking-[0.28em] uppercase font-bold text-text-muted mb-1.5">
            {t('dossier.sectionLabel')}
          </div>
          <div className="flex items-center gap-3">
            <PresidentAvatar
              wikiArticle={adminMeta.wikiArticle}
              fullName={adminMeta.fullName}
              color={adminMeta.color}
              size={52}
            />
            <div>
              <h2
                style={{ fontFamily: 'var(--font-family-serif)' }}
                className="text-xl font-bold text-text-primary leading-tight"
              >
                {adminMeta.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${partyColor}20`,
                    color: partyColor,
                    border: `1px solid ${partyColor}40`,
                  }}
                >
                  {adminMeta.party}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {adminMeta.dataStart}–{Math.min(adminMeta.end, 2025)}
                </span>
                {agg && (
                  <span className="text-xs text-text-muted font-mono">
                    {formatNumber(agg.contracts)} {t('contracts')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Risk badge — rate + absolute MXN at risk */}
        {agg && (
          <div className="text-right flex-shrink-0 space-y-2">
            <div>
              <div className="text-[9px] text-text-muted uppercase tracking-[0.15em] font-mono mb-0.5">
                {t('dossier.fingerprint.highRisk')}
              </div>
              <div
                className="text-2xl font-bold font-mono"
                style={{ color: agg.highRiskPct > 12 ? RISK_COLORS.critical : agg.highRiskPct > 7 ? RISK_COLORS.high : 'var(--color-text-secondary)' }}
              >
                {agg.highRiskPct.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[9px] text-text-muted uppercase tracking-[0.15em] font-mono mb-0.5">
                {isEs ? 'MXN en riesgo' : 'MXN at risk'}
              </div>
              <div className="text-sm font-bold font-mono text-text-primary">
                {formatCompactMXN(agg.valueAtRisk)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Political Context */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                {t('dossier.politicalContext')}
              </span>
            </div>
            <p
              style={{ fontFamily: 'var(--font-family-serif)' }}
              className="text-sm text-text-secondary leading-relaxed"
            >
              {t(`dossier.contexts.${dossier.contextKey}`)}
            </p>
          </div>

          {/* Known Scandals */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-risk-high" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                {t('dossier.knownScandals')}
              </span>
              {dossier.scandals.length > 0 && (
                <span className="text-[9px] font-mono text-text-muted ml-auto">
                  {dossier.scandals.length}
                </span>
              )}
            </div>
            {dossier.scandals.length === 0 ? (
              <div className="rounded-sm border border-border/20 bg-background-elevated/20 px-3 py-3 text-center">
                <Shield className="h-4 w-4 text-text-muted/40 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-text-muted italic leading-relaxed">
                  {t('dossier.noScandals')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dossier.scandals.map((scandal) => {
                  const sevColor = SEVERITY_COLORS[scandal.severity]
                  const sevLabel = scandal.severity === 'critical'
                    ? t('dossier.severityLabels.critical')
                    : scandal.severity === 'high'
                    ? t('dossier.severityLabels.high')
                    : t('dossier.severityLabels.medium')
                  return (
                    <div
                      key={scandal.key}
                      className="rounded-sm border bg-background-elevated/20 overflow-hidden transition-colors hover:bg-background-elevated/40"
                      style={{ borderColor: `${sevColor}30`, borderLeftWidth: 3, borderLeftColor: sevColor }}
                    >
                      <div className="px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-[0.15em]"
                            style={{
                              backgroundColor: `${sevColor}20`,
                              color: sevColor,
                              border: `1px solid ${sevColor}40`,
                            }}
                          >
                            {sevLabel}
                          </span>
                          {scandal.caseId && (
                            <Link
                              to={`/cases/${scandal.caseId}`}
                              className="text-[9px] text-accent hover:text-accent/80 font-mono transition-colors flex items-center gap-0.5 ml-auto"
                            >
                              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                              {t('dossier.linkToCases')}
                            </Link>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary leading-snug">
                          {t(`dossier.scandals.${scandal.key}`)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <Link
                  to="/cases"
                  className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 font-mono mt-1 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {t('dossier.linkToCases')}
                </Link>
              </div>
            )}
          </div>

          {/* Key Figures — most revealing stats for this admin */}
          {agg && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Landmark className="h-3.5 w-3.5 text-accent" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                  {t('dossier.keyFigures')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(() => {
                  const highestRiskSector = [...sectorData].filter(s => s.contracts > 100).sort((a, b) => b.risk - a.risk)[0]
                  const figures = [
                    {
                      label: t('dossier.keyFiguresLabels.highestRiskSector'),
                      value: highestRiskSector ? highestRiskSector.name : '--',
                      sub: highestRiskSector ? `${(highestRiskSector.risk * 100).toFixed(1)}%` : '',
                      color: highestRiskSector?.color || '#64748b',
                    },
                    {
                      label: t('dossier.keyFiguresLabels.singleBidRate'),
                      value: `${agg.singleBidPct.toFixed(1)}%`,
                      sub: agg.singleBidPct > 20 ? t('dossier.keyFiguresLabels.aboveAvg') : t('dossier.keyFiguresLabels.typical'),
                      color: agg.singleBidPct > 20 ? 'var(--color-risk-critical)' : 'var(--color-risk-high)',
                    },
                    {
                      label: t('dossier.keyFiguresLabels.directAwardRate'),
                      value: `${agg.directAwardPct.toFixed(1)}%`,
                      sub: agg.directAwardPct > 70 ? t('dossier.keyFiguresLabels.critical') : agg.directAwardPct > 50 ? t('dossier.keyFiguresLabels.elevated') : t('dossier.keyFiguresLabels.moderate'),
                      color: agg.directAwardPct > 70 ? 'var(--color-risk-critical)' : agg.directAwardPct > 50 ? 'var(--color-risk-high)' : 'var(--color-risk-medium)',
                    },
                  ]
                  return figures.map((fig) => (
                    <div
                      key={fig.label}
                      className="rounded-sm border border-border/20 bg-background-elevated/20 px-2 py-2 text-center"
                    >
                      <div className="text-[8px] text-text-muted uppercase tracking-[0.15em] font-mono mb-0.5 truncate">
                        {fig.label}
                      </div>
                      <div className="text-sm font-bold font-mono" style={{ color: fig.color }}>
                        {fig.value}
                      </div>
                      {fig.sub && (
                        <div className="text-[9px] text-text-muted font-mono mt-0.5">
                          {fig.sub}
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Procurement Fingerprint */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                {t('dossier.procurementFingerprint')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fingerprintItems.map(({ labelKey, value, icon: Icon }) => (
                <div
                  key={labelKey}
                  className="rounded-sm border border-border/30 bg-background-elevated/30 px-3 py-2"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon className="h-3 w-3 text-text-muted flex-shrink-0" />
                    <span className="text-[9px] text-text-muted uppercase tracking-[0.15em] font-mono truncate">
                      {t(labelKey)}
                    </span>
                  </div>
                  <div
                    className="text-sm font-bold font-mono"
                    style={{ color: adminMeta.color }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {/* Enhancement A: Procurement Grade Card */}
            {agg && <ProcurementGradeCard agg={agg} />}
          </div>
        </div>

        {/* Column 3: Top Vendors + Top Sectors */}
        <div className="lg:col-span-1 space-y-4">
          {/* Top Vendors */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                {t('vendorSection.title')}
              </span>
            </div>
            <AdminVendorBreakdown
              vendors={vendors.slice(0, 5)}
              eraColor={adminMeta.color}
              loading={vendorsLoading}
            />
          </div>

          {/* Top Sectors */}
          {topSectors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-muted font-mono">
                  {t('dossier.topSectors')}
                </span>
              </div>
              <div className="space-y-1.5">
                {topSectors.map((sector, idx) => {
                  const maxContracts = topSectors[0]?.contracts ?? 1
                  const pct = Math.min(100, (sector.contracts / maxContracts) * 100)
                  return (
                    <div key={sector.sectorId} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-muted w-4 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sector.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-text-secondary truncate">{sector.name}</span>
                          <span className="font-mono text-text-muted ml-1 flex-shrink-0">
                            {formatNumber(sector.contracts)}
                          </span>
                        </div>
                        <DotBar
                          value={pct}
                          max={100}
                          color={sector.color}
                          emptyColor="var(--color-background-elevated)"
                          emptyStroke="var(--color-border-hover)"
                          dots={20}
                          dotR={1.75}
                          dotGap={4.5}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] font-mono text-text-muted/60 mt-1.5">
                1 ● ≈ 5% del sector líder
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default AdminDossierPanel
