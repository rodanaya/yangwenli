/**
 * Shared types for /administrations and its extracted helpers.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) so dossier-panel
 * and grade-card components can be split out of the page module without
 * circular imports.
 */
import type { YearOverYearChange } from '@/api/types'

/** Stable string IDs that name each presidential administration. */
export type AdminName = 'Fox' | 'Calderon' | 'Pena Nieto' | 'AMLO' | 'Sheinbaum'

/** Per-administration aggregate metrics. Used by dossier panel + comparison views. */
export interface AdminAgg {
  name: AdminName
  contracts: number
  totalValue: number
  avgRisk: number
  directAwardPct: number
  singleBidPct: number
  highRiskPct: number
  /** totalValue × highRiskPct / 100 */
  valueAtRisk: number
  vendorCount: number
  institutionCount: number
  years: YearOverYearChange[]
  /** Derived: contracts / yearCount. Used in comparison tables. */
  contractsPerYear: number
  /** Derived: totalValue / yearCount. */
  valuePerYear: number
  yearCount: number
}

/** Metric selector for the Admin × Sector heatmap matrix. */
export type MatrixMetric = 'risk' | 'da' | 'hr' | 'sb'

/** Static dossier metadata — political context + known scandals per admin. */
export interface ScandalRef {
  /** i18n key under `administrations.dossier.scandals.*` */
  key: string
  /** When present, renders a link to /cases/:caseId. */
  caseId?: string
  severity: 'critical' | 'high' | 'medium'
}

export interface DossierEntry {
  /** i18n key under `administrations.dossier.contexts.*` */
  contextKey: string
  scandals: ScandalRef[]
  /** Sector codes ranked by spending priority for this era. */
  topSectorKeys: string[]
}

/** Shape of one entry in the ADMINISTRATIONS constant. */
export interface AdminMeta {
  name: AdminName
  fullName: string
  start: number
  end: number
  dataStart: number
  color: string
  party: string
  wikiArticle: string
}
