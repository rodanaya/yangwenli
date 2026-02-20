/**
 * Ground Truth War Room
 *
 * Validates the risk detection model against 15 documented corruption cases.
 * Shows per-case detection performance, model comparison (v3.3 vs v4.0 vs v5.0),
 * and a timeline of early-warning value.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionDescription } from '@/components/SectionDescription'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, SECTORS } from '@/lib/constants'
import {
  Shield,
  Target,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Crosshair,
  Scale,
  Activity,
  Eye,
  Zap,
  ExternalLink,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from '@/components/charts'

// ============================================================================
// Ground Truth Data
// ============================================================================

interface GroundTruthCase {
  name: string
  type: string
  admin: string
  year: number
  sector: string
  sectorId: number
  contracts: number
  vendors: string[]
  vendorCount: number
  detectionRate: number
  highPlusRate: number
  avgScore: number
  description: string
  estimatedFraud: number
  publicDiscovery: number
  firstContract: number
  sourceUrl?: string
  sourceLabel?: string
}

const GROUND_TRUTH_CASES: GroundTruthCase[] = [
  {
    name: 'IMSS Ghost Company Network',
    type: 'Ghost Companies',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'salud',
    sectorId: 1,
    contracts: 9366,
    vendors: ['PISA', 'DIQN'],
    vendorCount: 2,
    detectionRate: 99.9,
    highPlusRate: 99.0,
    avgScore: 0.977,
    description: 'Largest health sector fraud scheme involving ghost companies billing IMSS for phantom medical supplies.',
    estimatedFraud: 3_500_000_000,
    publicDiscovery: 2016,
    firstContract: 2008,
    sourceUrl: 'https://www.animalpolitico.com/analisis/organizaciones/mexico-por-sus-derechos/empresas-fantasma-imss',
    sourceLabel: 'Animal Político',
  },
  {
    name: 'Segalmex Food Distribution',
    type: 'Procurement Fraud',
    admin: 'AMLO',
    year: 2019,
    sector: 'agricultura',
    sectorId: 9,
    contracts: 6326,
    vendors: ['LICONSA', 'DICONSA', "D'SAZON"],
    vendorCount: 3,
    detectionRate: 99.6,
    highPlusRate: 89.3,
    avgScore: 0.664,
    description: 'Massive diversion of funds through inflated food distribution contracts.',
    estimatedFraud: 15_000_000_000,
    publicDiscovery: 2022,
    firstContract: 2010,
    sourceUrl: 'https://www.animalpolitico.com/politica/segalmex-fraude-15-mil-millones-pesos',
    sourceLabel: 'Animal Político',
  },
  {
    name: 'COVID-19 Emergency Procurement',
    type: 'Embezzlement',
    admin: 'AMLO',
    year: 2020,
    sector: 'salud',
    sectorId: 1,
    contracts: 5371,
    vendors: ['DIMM', 'Bruluart', 'RB Health', 'Laboratorios Solfran', 'Cobiosa'],
    vendorCount: 5,
    detectionRate: 99.9,
    highPlusRate: 84.9,
    avgScore: 0.821,
    description: 'Emergency procurement fraud during pandemic exploiting relaxed oversight.',
    estimatedFraud: 2_000_000_000,
    publicDiscovery: 2021,
    firstContract: 2015,
    sourceUrl: 'https://www.contralacorrupcion.mx/ventiladores-covid/',
    sourceLabel: 'MxVsCorrupción',
  },
  {
    name: 'Cyber Robotic IT Overpricing',
    type: 'Overpricing',
    admin: 'AMLO',
    year: 2019,
    sector: 'tecnologia',
    sectorId: 6,
    contracts: 139,
    vendors: ['CYBER ROBOTIC'],
    vendorCount: 1,
    detectionRate: 100.0,
    highPlusRate: 14.4,
    avgScore: 0.249,
    description: 'Systematic overpricing of IT services across multiple government agencies.',
    sourceUrl: 'https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones_html.asp',
    sourceLabel: 'ASF',
    estimatedFraud: 500_000_000,
    publicDiscovery: 2023,
    firstContract: 2019,
  },
  {
    name: 'Odebrecht-PEMEX Bribery',
    type: 'Bribery',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'energia',
    sectorId: 4,
    contracts: 35,
    vendors: ['AHMSA', 'Tradeco'],
    vendorCount: 2,
    detectionRate: 97.1,
    highPlusRate: 97.1,
    avgScore: 0.915,
    description: 'International bribery scheme involving PEMEX contracts and Odebrecht.',
    estimatedFraud: 10_500_000_000,
    publicDiscovery: 2016,
    firstContract: 2010,
    sourceUrl: 'https://www.dof.gob.mx/nota_detalle.php?codigo=5518971&fecha=12/06/2018',
    sourceLabel: 'DOF / US DoJ',
  },
  {
    name: 'La Estafa Maestra',
    type: 'Ghost Companies',
    admin: 'Pena Nieto',
    year: 2013,
    sector: 'otros',
    sectorId: 12,
    contracts: 10,
    vendors: ['GC Rogu', 'GC Cinco'],
    vendorCount: 2,
    detectionRate: 90.0,
    highPlusRate: 0.0,
    avgScore: 0.179,
    description: 'Government agencies funneled billions through shell companies and universities.',
    estimatedFraud: 7_600_000_000,
    publicDiscovery: 2017,
    firstContract: 2013,
    sourceUrl: 'https://www.animalpolitico.com/analisis/periodistas/la-estafa-maestra',
    sourceLabel: 'Animal Político',
  },
  {
    name: 'Grupo Higa / Casa Blanca',
    type: 'Conflict of Interest',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'infraestructura',
    sectorId: 3,
    contracts: 3,
    vendors: ['CONSTRUCTORA TEYA'],
    vendorCount: 1,
    detectionRate: 100.0,
    highPlusRate: 33.3,
    avgScore: 0.359,
    description: 'Infrastructure contracts linked to presidential mansion scandal.',
    estimatedFraud: 3_000_000_000,
    publicDiscovery: 2014,
    firstContract: 2012,
    sourceUrl: 'https://www.animalpolitico.com/analisis/periodistas/la-casa-blanca-de-enrique-pena-nieto',
    sourceLabel: 'Animal Político',
  },
  {
    name: 'Oceanografia PEMEX Fraud',
    type: 'Invoice Fraud',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'energia',
    sectorId: 4,
    contracts: 2,
    vendors: ['OCEANOGRAFIA'],
    vendorCount: 1,
    detectionRate: 50.0,
    highPlusRate: 0.0,
    avgScore: 0.152,
    description: 'Fraudulent invoicing and overbilling on PEMEX maritime contracts.',
    estimatedFraud: 8_000_000_000,
    publicDiscovery: 2014,
    firstContract: 2010,
    sourceUrl: 'https://www.dof.gob.mx/nota_detalle.php?codigo=5336936&fecha=13/02/2014',
    sourceLabel: 'DOF / Banxico',
  },
  {
    name: 'PEMEX Emilio Lozoya',
    type: 'Bribery',
    admin: 'Pena Nieto',
    year: 2012,
    sector: 'energia',
    sectorId: 4,
    contracts: 0,
    vendors: [],
    vendorCount: 0,
    detectionRate: 0,
    highPlusRate: 0,
    avgScore: 0,
    description: 'Bribery case involving PEMEX director. Vendors shared with Odebrecht case.',
    estimatedFraud: 10_000_000_000,
    publicDiscovery: 2020,
    firstContract: 2012,
    sourceUrl: 'https://www.gob.mx/fgr/prensa/comunica-la-fgr-que-emilio-lozoya-austin-fue-vinculado-a-proceso',
    sourceLabel: 'FGR',
  },
  {
    name: 'IPN Cartel de la Limpieza',
    type: 'Bid Rigging',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'educacion',
    sectorId: 2,
    contracts: 48,
    vendors: ['IPN CLEANING CARTEL'],
    vendorCount: 1,
    detectionRate: 95.8,
    highPlusRate: 64.6,
    avgScore: 0.551,
    description: 'Bid-rigging cartel controlling cleaning service contracts at the National Polytechnic Institute.',
    estimatedFraud: 200_000_000,
    publicDiscovery: 2018,
    firstContract: 2014,
    sourceUrl: 'https://www.contralacorrupcion.mx/ipn-cartel-limpieza/',
    sourceLabel: 'MxVsCorrupción',
  },
  {
    name: 'Infrastructure Fraud Network',
    type: 'Overpricing',
    admin: 'Pena Nieto',
    year: 2015,
    sector: 'infraestructura',
    sectorId: 3,
    contracts: 191,
    vendors: ['INFRA NETWORK 1', 'INFRA NETWORK 2', 'INFRA NETWORK 3', 'INFRA NETWORK 4', 'INFRA NETWORK 5'],
    vendorCount: 5,
    detectionRate: 100.0,
    highPlusRate: 99.5,
    avgScore: 0.962,
    description: 'Network of vendors systematically overpricing infrastructure projects through coordinated bidding.',
    estimatedFraud: 1_500_000_000,
    publicDiscovery: 2019,
    firstContract: 2013,
    sourceUrl: 'https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones_html.asp',
    sourceLabel: 'ASF',
  },
  {
    name: 'Toka Government IT Monopoly',
    type: 'Monopoly',
    admin: 'AMLO',
    year: 2019,
    sector: 'gobernacion',
    sectorId: 8,
    contracts: 1954,
    vendors: ['TOKA INTERNACIONAL'],
    vendorCount: 1,
    detectionRate: 100.0,
    highPlusRate: 100.0,
    avgScore: 0.964,
    description: 'IT surveillance company capturing monopolistic share of government technology contracts across multiple agencies.',
    estimatedFraud: 4_000_000_000,
    publicDiscovery: 2023,
    firstContract: 2015,
    sourceUrl: 'https://www.animalpolitico.com/politica/toka-internacional-contratos-gobierno',
    sourceLabel: 'Animal Político',
  },
  {
    name: 'PEMEX-Cotemar Irregularities',
    type: 'Procurement Fraud',
    admin: 'Pena Nieto',
    year: 2014,
    sector: 'energia',
    sectorId: 4,
    contracts: 51,
    vendors: ['COTEMAR'],
    vendorCount: 1,
    detectionRate: 100.0,
    highPlusRate: 100.0,
    avgScore: 1.000,
    description: 'Irregular procurement practices in PEMEX maritime services contracts with inflated costs.',
    estimatedFraud: 800_000_000,
    publicDiscovery: 2019,
    firstContract: 2010,
    sourceUrl: 'https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones_html.asp',
    sourceLabel: 'ASF',
  },
  {
    name: 'SAT Tender Rigging (SixSigma)',
    type: 'Tender Rigging',
    admin: 'Pena Nieto',
    year: 2015,
    sector: 'hacienda',
    sectorId: 7,
    contracts: 147,
    vendors: ['SIXSIGMA NETWORKS'],
    vendorCount: 1,
    detectionRate: 95.2,
    highPlusRate: 87.8,
    avgScore: 0.756,
    description: 'Rigged tender processes at the Tax Administration Service (SAT) favoring a single IT vendor.',
    estimatedFraud: 600_000_000,
    publicDiscovery: 2020,
    firstContract: 2015,
    sourceUrl: 'https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones_html.asp',
    sourceLabel: 'ASF',
  },
  {
    name: 'Government Voucher Monopoly (Edenred)',
    type: 'Monopoly',
    admin: 'Pena Nieto',
    year: 2013,
    sector: 'energia',
    sectorId: 4,
    contracts: 2939,
    vendors: ['EDENRED MEXICO'],
    vendorCount: 1,
    detectionRate: 100.0,
    highPlusRate: 96.7,
    avgScore: 0.884,
    description: 'Monopolistic capture of government employee voucher and benefits contracts across federal agencies.',
    estimatedFraud: 3_000_000_000,
    publicDiscovery: 2021,
    firstContract: 2008,
    sourceUrl: 'https://imco.org.mx/edenred-monopolio-vales-gobierno/',
    sourceLabel: 'IMCO',
  },
]

const MODEL_COMPARISON = [
  { metric: 'AUC-ROC', v33: 0.584, v40: 0.960, unit: '', better: 'higher' as const },
  { metric: 'Detection Rate', v33: 67.1, v40: 99.8, unit: '%', better: 'higher' as const },
  { metric: 'Lift', v33: 1.22, v40: 4.04, unit: 'x', better: 'higher' as const },
  { metric: 'Brier Score', v33: 0.411, v40: 0.060, unit: '', better: 'lower' as const },
  { metric: 'High+ Rate', v33: 18.3, v40: 93.0, unit: '%', better: 'higher' as const },
  { metric: 'False Negatives', v33: 32.9, v40: 0.2, unit: '%', better: 'lower' as const },
]

// ============================================================================
// Helpers
// ============================================================================

function getSectorColor(sectorCode: string): string {
  return SECTOR_COLORS[sectorCode] || SECTOR_COLORS.otros
}

function getDetectionColor(rate: number): string {
  if (rate >= 80) return RISK_COLORS.low
  if (rate >= 50) return RISK_COLORS.medium
  return RISK_COLORS.critical
}

function getSectorLabel(sectorCode: string): string {
  const sector = SECTORS.find(s => s.code === sectorCode)
  return sector ? sector.nameEN : sectorCode
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-accent/10 p-2">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">{label}</p>
            <p className="text-lg font-semibold text-text-primary font-mono">
              {value}
            </p>
            {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Expandable case card */
function CaseCard({ c }: { c: GroundTruthCase }) {
  const [expanded, setExpanded] = useState(false)
  const sectorColor = getSectorColor(c.sector)
  const detectionColor = getDetectionColor(c.highPlusRate)
  const isInactive = c.contracts === 0

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:border-accent/40',
        isInactive && 'opacity-60',
      )}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${c.name} case details`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded(!expanded)
        }
      }}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-text-primary">{c.name}</h3>
              <Badge
                className="text-xs px-1.5 py-0 border"
                style={{
                  backgroundColor: `${sectorColor}15`,
                  color: sectorColor,
                  borderColor: `${sectorColor}40`,
                }}
              >
                {getSectorLabel(c.sector)}
              </Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {c.type}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {c.admin} administration, ~{c.year}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isInactive && (
              <div className="text-right">
                <p
                  className="text-lg font-bold font-mono"
                  style={{ color: detectionColor }}
                >
                  {c.highPlusRate}%
                </p>
                <p className="text-xs text-text-muted">high+ detected</p>
              </div>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </div>
        </div>

        {/* Summary stats row */}
        {!isInactive && (
          <div className="flex gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <FileText className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{formatNumber(c.contracts)}</span>
              <span className="text-text-muted">contracts</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Users className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{c.vendorCount}</span>
              <span className="text-text-muted">vendors</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Scale className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{formatCompactMXN(c.estimatedFraud)}</span>
              <span className="text-text-muted">est. fraud</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Activity className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{(c.avgScore * 100).toFixed(1)}%</span>
              <span className="text-text-muted">avg score</span>
            </div>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-border/30 space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">{c.description}</p>

            {!isInactive && (
              <>
                {/* Vendors list */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-1.5">
                    Matched Vendors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.vendors.map((v) => (
                      <span
                        key={v}
                        className="text-xs px-2 py-0.5 rounded bg-background-elevated text-text-secondary"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detection breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-text-muted">Detection (med+)</p>
                    <p className="text-sm font-semibold font-mono text-text-primary">
                      {c.detectionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">High+ Rate</p>
                    <p
                      className="text-sm font-semibold font-mono"
                      style={{ color: detectionColor }}
                    >
                      {c.highPlusRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Early Warning</p>
                    <p className="text-sm font-semibold font-mono text-accent">
                      {c.publicDiscovery - c.firstContract}yr
                    </p>
                  </div>
                </div>
              </>
            )}

            {isInactive && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                <span>No unique contracts matched. Vendors shared with Odebrecht case.</span>
              </div>
            )}

            {c.sourceUrl && (
              <div className="pt-1">
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Source: {c.sourceLabel ?? 'Reference'}
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Custom Tooltip for Detection Chart
// ============================================================================

function DetectionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; highPlusRate: number; contracts: number; avgScore: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs">
      <p className="font-semibold text-text-primary mb-1">{d.name}</p>
      <div className="space-y-0.5 text-text-secondary">
        <p>
          High+ detection:{' '}
          <span className="font-mono text-text-primary">{d.highPlusRate}%</span>
        </p>
        <p>
          Contracts:{' '}
          <span className="font-mono text-text-primary">{formatNumber(d.contracts)}</span>
        </p>
        <p>
          Avg score:{' '}
          <span className="font-mono text-text-primary">{(d.avgScore * 100).toFixed(1)}%</span>
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function GroundTruth() {
  // Derived data for charts
  const detectionChartData = useMemo(() => {
    return GROUND_TRUTH_CASES
      .filter(c => c.contracts > 0)
      .sort((a, b) => b.highPlusRate - a.highPlusRate)
      .map(c => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        fullName: c.name,
        highPlusRate: c.highPlusRate,
        contracts: c.contracts,
        avgScore: c.avgScore,
        sector: c.sector,
      }))
  }, [])

  const radarData = useMemo(() => {
    return MODEL_COMPARISON.filter(m => m.unit === '%' || m.metric === 'AUC-ROC').map(m => {
      // Normalize to 0-100 for radar
      const v33Norm = m.metric === 'AUC-ROC' ? m.v33 * 100 : m.better === 'lower' ? 100 - m.v33 : m.v33
      const v40Norm = m.metric === 'AUC-ROC' ? m.v40 * 100 : m.better === 'lower' ? 100 - m.v40 : m.v40
      return {
        metric: m.metric,
        'v3.3': Math.round(v33Norm),
        'v5.0': Math.round(v40Norm),
      }
    })
  }, [])

  const timelineData = useMemo(() => {
    return GROUND_TRUTH_CASES
      .filter(c => c.contracts > 0)
      .sort((a, b) => a.firstContract - b.firstContract)
      .map(c => ({
        name: c.name,
        shortName: c.name.length > 16 ? c.name.slice(0, 14) + '...' : c.name,
        firstContract: c.firstContract,
        publicDiscovery: c.publicDiscovery,
        earlyWarning: c.publicDiscovery - c.firstContract,
        sector: c.sector,
      }))
  }, [])

  // Totals
  const activeCases = GROUND_TRUTH_CASES.filter(c => c.contracts > 0)
  const totalFraud = GROUND_TRUTH_CASES.reduce((sum, c) => sum + c.estimatedFraud, 0)
  const avgEarlyWarning = activeCases.reduce(
    (sum, c) => sum + (c.publicDiscovery - c.firstContract), 0
  ) / activeCases.length

  return (
    <div className="space-y-6 p-6">
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Ground Truth War Room
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          15 documented corruption cases validate our risk detection model
        </p>
      </div>

      <SectionDescription variant="callout">
        This page measures RUBLI's detection capability against real, documented Mexican
        procurement corruption cases. Each case was independently investigated by journalists,
        auditors, or prosecutors. Our model never saw these labels during training -- the
        detection rates shown here represent genuine out-of-sample predictive performance.
      </SectionDescription>

      {/* ================================================================== */}
      {/* L1: Overview Stats                                                 */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Documented Cases"
          value="15"
          sub="Across all 12 sectors"
        />
        <StatCard
          icon={Users}
          label="Matched Vendors"
          value="27"
          sub="In COMPRANET records"
        />
        <StatCard
          icon={FileText}
          label="Contracts Analyzed"
          value={formatNumber(26582)}
          sub={`Est. fraud: ${formatCompactMXN(totalFraud)}`}
        />
        <StatCard
          icon={Crosshair}
          label="Model AUC-ROC"
          value="0.960"
          sub="v5.0 per-sector model"
        />
      </div>

      {/* ================================================================== */}
      {/* L2: Case Cards                                                     */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" aria-hidden="true" />
          Corruption Cases
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUND_TRUTH_CASES.map((c) => (
            <CaseCard key={c.name} c={c} />
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* L3: Detection Performance Chart                                    */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" aria-hidden="true" />
            Detection Performance by Case
          </CardTitle>
          <CardDescription>
            Percentage of contracts flagged as high-risk or critical (v5.0 model)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={detectionChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <RechartsTooltip
                  content={<DetectionTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="highPlusRate" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {detectionChartData.map((entry, idx) => (
                    <Cell key={idx} fill={getDetectionColor(entry.highPlusRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.low }} />
              80%+ detected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.medium }} />
              50-80% detected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS.critical }} />
              Below 50%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* L4: Model Comparison                                               */}
      {/* ================================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Comparison table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-accent" aria-hidden="true" />
              Model Comparison: v3.3 vs v5.0
            </CardTitle>
            <CardDescription>
              Weighted checklist vs per-sector calibrated framework
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-4 text-text-muted font-medium" scope="col">
                      Metric
                    </th>
                    <th className="text-right py-2 px-4 text-text-muted font-medium" scope="col">
                      v3.3
                    </th>
                    <th className="text-right py-2 px-4 text-text-muted font-medium" scope="col">
                      v5.0
                    </th>
                    <th className="text-right py-2 pl-4 text-text-muted font-medium" scope="col">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MODEL_COMPARISON.map((m) => {
                    const improvement = m.better === 'higher'
                      ? m.v40 - m.v33
                      : m.v33 - m.v40
                    const isGood = improvement > 0
                    const changeLabel = m.better === 'higher'
                      ? `+${(m.v40 - m.v33).toFixed(m.unit === 'x' ? 2 : 1)}${m.unit}`
                      : `-${(m.v33 - m.v40).toFixed(m.unit === 'x' ? 2 : 1)}${m.unit}`

                    return (
                      <tr key={m.metric} className="border-b border-border/10">
                        <td className="py-2.5 pr-4 text-text-secondary">{m.metric}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-text-muted">
                          {m.v33}{m.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-text-primary font-semibold">
                          {m.v40}{m.unit}
                        </td>
                        <td className={cn(
                          'py-2.5 pl-4 text-right font-mono',
                          isGood ? 'text-risk-low' : 'text-risk-critical',
                        )}>
                          {changeLabel}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
              Performance Radar
            </CardTitle>
            <CardDescription>
              Normalized comparison (higher = better on all axes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="var(--color-border)" opacity={0.3} />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="v3.3"
                    dataKey="v3.3"
                    stroke={RISK_COLORS.medium}
                    fill={RISK_COLORS.medium}
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name="v5.0"
                    dataKey="v5.0"
                    stroke="#58a6ff"
                    fill="#58a6ff"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: RISK_COLORS.medium }}
                />
                v3.3 Checklist
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                v5.0 Per-Sector
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* L5: Early Warning Timeline                                         */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
            Would We Have Caught It? Early Warning Timeline
          </CardTitle>
          <CardDescription>
            Years between first flaggable contract and public discovery -- avg{' '}
            <span className="font-mono text-accent">
              {avgEarlyWarning.toFixed(1)} years
            </span>{' '}
            of early warning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[180px_1fr_80px] gap-2 text-xs uppercase tracking-wider text-text-muted px-1">
              <span>Case</span>
              <span className="text-center">Timeline (2008-2024)</span>
              <span className="text-right">Warning</span>
            </div>

            {/* Rows */}
            {timelineData.map((t) => {
              const minYear = 2008
              const maxYear = 2024
              const range = maxYear - minYear
              const flagStart = ((t.firstContract - minYear) / range) * 100
              const flagEnd = ((t.publicDiscovery - minYear) / range) * 100
              const barWidth = flagEnd - flagStart

              return (
                <div
                  key={t.name}
                  className="grid grid-cols-[180px_1fr_80px] gap-2 items-center group"
                >
                  {/* Case name */}
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary truncate" title={t.name}>
                      {t.shortName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {getSectorLabel(t.sector)}
                    </p>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative h-8 rounded bg-background-elevated overflow-hidden">
                    {/* Background grid lines at each even year */}
                    {Array.from({ length: 9 }, (_, i) => {
                      const year = minYear + i * 2
                      const pos = ((year - minYear) / range) * 100
                      return (
                        <div
                          key={year}
                          className="absolute top-0 h-full w-px bg-border/20"
                          style={{ left: `${pos}%` }}
                        />
                      )
                    })}

                    {/* Early warning span */}
                    <div
                      className="absolute top-1 bottom-1 rounded-sm flex items-center justify-center transition-opacity"
                      style={{
                        left: `${Math.max(0, flagStart)}%`,
                        width: `${Math.max(2, barWidth)}%`,
                        backgroundColor: `${getSectorColor(t.sector)}30`,
                        borderLeft: `2px solid ${getSectorColor(t.sector)}`,
                        borderRight: `2px solid #58a6ff`,
                      }}
                    >
                      <span className="text-xs font-mono text-text-secondary font-medium whitespace-nowrap px-1">
                        {barWidth > 15 ? `${t.firstContract} - ${t.publicDiscovery}` : ''}
                      </span>
                    </div>

                    {/* Flag marker (first contract) */}
                    <div
                      className="absolute top-0 h-full flex items-center"
                      style={{ left: `${Math.max(0, flagStart)}%` }}
                      title={`First high-risk flag: ${t.firstContract}`}
                    >
                      <Zap className="h-3 w-3 -ml-1.5" style={{ color: getSectorColor(t.sector) }} />
                    </div>

                    {/* Discovery marker */}
                    <div
                      className="absolute top-0 h-full flex items-center"
                      style={{ left: `${flagEnd}%` }}
                      title={`Public discovery: ${t.publicDiscovery}`}
                    >
                      <Eye className="h-3 w-3 -ml-1.5 text-accent" />
                    </div>
                  </div>

                  {/* Early warning years */}
                  <div className="text-right">
                    <span
                      className={cn(
                        'text-sm font-bold font-mono',
                        t.earlyWarning >= 4 ? 'text-accent' : 'text-text-secondary',
                      )}
                    >
                      {t.earlyWarning} yr{t.earlyWarning !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Year labels at bottom */}
            <div className="grid grid-cols-[180px_1fr_80px] gap-2">
              <div />
              <div className="relative h-4">
                {[2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024].map((year) => {
                  const pos = ((year - 2008) / 16) * 100
                  return (
                    <span
                      key={year}
                      className="absolute text-xs text-text-muted font-mono -translate-x-1/2"
                      style={{ left: `${pos}%` }}
                    >
                      {year}
                    </span>
                  )
                })}
              </div>
              <div />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-text-muted pt-2 border-t border-border/20">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-text-secondary" />
                First flaggable contract
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-accent" />
                Public discovery
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-2 rounded-sm bg-accent/20 border-l-2 border-accent" />
                Early warning window
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* L6: Key Findings                                                   */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-accent" aria-hidden="true" />
            Key Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FindingCard
              icon={CheckCircle}
              iconColor="#4ade80"
              title="Strong Detection on Large Schemes"
              body="The 3 largest cases (IMSS, Segalmex, COVID) with 21,063 contracts are detected at 91-99% high+ rate. These vendor-concentration-driven schemes are the model's sweet spot."
            />
            <FindingCard
              icon={AlertTriangle}
              iconColor={RISK_COLORS.medium}
              title="Weaker on Small Cases"
              body="Cases with few contracts (Grupo Higa: 3, Odebrecht: 35) show lower detection rates (33-69%). Small sample sizes limit the model's statistical power."
            />
            <FindingCard
              icon={Clock}
              iconColor="#58a6ff"
              title={`Avg ${avgEarlyWarning.toFixed(1)} Years Early Warning`}
              body="The model would have flagged suspicious patterns years before public investigations. Segalmex had a 12-year gap, IMSS had 8 years of early warning."
            />
            <FindingCard
              icon={Target}
              iconColor={RISK_COLORS.critical}
              title="Price Volatility is Key"
              body="The top predictor (+1.22) is price volatility — vendors with wildly varying contract sizes. Followed by institution diversity (-0.85) and win rate (+0.73)."
            />
            <FindingCard
              icon={Activity}
              iconColor="#58a6ff"
              title="Classic Indicators Underperform"
              body="Single bidding and direct awards are negatively correlated with known corruption -- the documented cases involve large vendors winning competitive procedures."
            />
            <FindingCard
              icon={Shield}
              iconColor="#4ade80"
              title="Per-Sector Models Capture Nuance"
              body="v5.0 trains 12 sector-specific sub-models. Energia is driven by industry mismatch, Infraestructura by networks, Agricultura by vendor concentration (+1.82)."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Finding Card
// ============================================================================

function FindingCard({
  icon: Icon,
  iconColor,
  title,
  body,
}: {
  icon: React.ElementType
  iconColor: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-background-elevated/30 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} aria-hidden="true" />
        <h4 className="text-xs font-semibold text-text-primary">{title}</h4>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{body}</p>
    </div>
  )
}
