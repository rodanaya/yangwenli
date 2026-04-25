/**
 * InvestigationCaseDetail — Editorial redesign (NYT/FT investigative desk)
 * Route: /investigation/:caseId
 *
 * An investigator workflow tool dressed as a case file. Warm dark palette
 * (#141210 → #1a1614), serif headlines, inline DotBars for risk magnitude,
 * evidence cards instead of data-dump tables.
 *
 * Sections:
 *  1. Editorial header — breadcrumb, title, badges, action row
 *  2. Summary strip — three stats with DotBars for magnitude
 *  3. Case narrative — warm card with serif body (if narrative/summary)
 *  4. Vendor evidence cards — each vendor is an evidence item with risk DotBar
 *  5. Investigation questions — question cards with inline validation buttons
 *  6. Evidence log — timeline of external sources + inline add-evidence form
 *  7. Review action rail — status change, corroborate/refute, promote-to-GT
 *  8. Modals — status change, promote confirm
 */

import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { investigationApi } from '@/api/client'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatDate, formatNumber, toTitleCase } from '@/lib/utils'
import { SECTOR_COLORS, getSectorNameEN, getRiskLevelFromScore } from '@/lib/constants'
import type {
  InvestigationValidationStatus,
  InvestigationVendor,
  InvestigationQuestion,
  ExternalEvidence,
} from '@/api/types'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ExternalLink,
  Newspaper,
  Shield,
  ArrowUpRight,
  Loader2,
  Plus,
  Send,
  FileText,
  Users,
} from 'lucide-react'

// ============================================================================
// PALETTE — warm-dark editorial surface
// ============================================================================

// Bible §2: cream page ground, white cards, warm border, dark ink.
const BG = 'var(--color-background)'           // page — cream #faf9f6
const CARD = 'var(--color-background-card)'    // card surface — white
const CARD_HI = 'var(--color-background-elevated)' // elevated card
const BORDER = 'var(--color-border)'
const BORDER_HI = 'var(--color-border-hover)'
const INK = 'var(--color-text-primary)'        // primary text — dark ink
const INK_MUTED = 'var(--color-text-secondary)'   // secondary
const INK_DIM = 'var(--color-text-muted)'         // tertiary
const INK_FAINT = 'var(--color-text-muted)'       // overlines / captions
const EMPTY_DOT = 'var(--color-background-elevated)'   // dotbar empty (cream)
const EMPTY_STROKE = 'var(--color-border-hover)'        // dotbar empty stroke

// ============================================================================
// INLINE DotBar — NYT-style categorical magnitude indicator
// ============================================================================

function DotBar({
  value,
  max = 1,
  color = '#ef4444',
  dots = 20,
  size = 6,
  gap = 2,
}: {
  value: number
  max?: number
  color?: string
  dots?: number
  size?: number
  gap?: number
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = Math.round(ratio * dots)
  const w = dots * (size + gap) - gap
  return (
    <svg width={w} height={size} style={{ display: 'block' }} aria-hidden="true">
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={i * (size + gap) + size / 2}
          cy={size / 2}
          r={size / 2}
          fill={i < filled ? color : EMPTY_DOT}
          stroke={i < filled ? undefined : EMPTY_STROKE}
          strokeWidth={i < filled ? 0 : 0.5}
        />
      ))}
    </svg>
  )
}

// ============================================================================
// TYPES / HELPERS
// ============================================================================

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

function getPriority(score: number): { level: PriorityLevel; n: number } {
  const level = getRiskLevelFromScore(score)
  const n = level === 'critical' ? 1 : level === 'high' ? 2 : level === 'medium' ? 3 : 4
  return { level, n }
}

const LEVEL_COLOR: Record<PriorityLevel, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#a16207',
  low: 'var(--color-text-muted)',
}

const STATUS_CONFIG: Record<InvestigationValidationStatus, {
  icon: React.ElementType
  labelKey: string
  color: string
}> = {
  pending:       { icon: Clock,        labelKey: 'caseDetail.statusPending',       color: '#f59e0b' },
  corroborated:  { icon: CheckCircle2, labelKey: 'caseDetail.statusCorroborated',  color: '#22c55e' },
  refuted:       { icon: XCircle,      labelKey: 'caseDetail.statusRefuted',       color: '#ef4444' },
  inconclusive:  { icon: HelpCircle,   labelKey: 'caseDetail.statusInconclusive',  color: '#78716c' },
}

const EVIDENCE_STRENGTH_COLOR: Record<string, string> = {
  confirmed: '#22c55e',
  strong: '#22c55e',
  likely: '#f59e0b',
  moderate: '#f59e0b',
  suspected: '#a16207',
  weak: '#78716c',
  unknown: '#78716c',
}

function StatusPill({ status, t }: { status: InvestigationValidationStatus; t: (key: string) => string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.14em]"
      style={{
        color: config.color,
        border: `1px solid ${config.color}44`,
        backgroundColor: `${config.color}14`,
      }}
    >
      <Icon className="h-3 w-3" />
      {t(config.labelKey)}
    </span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvestigationCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('investigation')

  // Modals / forms
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false)

  // Status change state
  const [newStatus, setNewStatus] = useState<InvestigationValidationStatus>('corroborated')
  const [statusNotes, setStatusNotes] = useState('')
  const [reviewerName, setReviewerName] = useState('')

  // Evidence form state
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [evidenceType, setEvidenceType] = useState('news')
  const [credibility, setCredibility] = useState<'low' | 'medium' | 'high'>('medium')
  const [datePublished, setDatePublished] = useState('')

  // Data fetch
  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['investigation', 'case', caseId],
    queryFn: () => investigationApi.getCaseById(caseId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!caseId,
    retry: (count, err) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404 && count < 2
    },
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      investigationApi.reviewCase(caseId!, status, notes, reviewerName || 'analyst'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
      setShowStatusModal(false)
      setStatusNotes('')
    },
  })

  // Add evidence mutation
  const addEvidenceMutation = useMutation({
    mutationFn: () =>
      investigationApi.addEvidence(caseId!, [{
        source_url: evidenceUrl,
        source_title: evidenceTitle,
        source_type: evidenceType,
        summary: evidenceSummary,
        date_published: datePublished || null,
        credibility: credibility,
      }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
      setShowEvidenceForm(false)
      setEvidenceUrl('')
      setEvidenceTitle('')
      setEvidenceSummary('')
    },
  })

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: () =>
      investigationApi.promoteToGroundTruth(
        caseId!,
        detail?.title || caseId!,
        detail?.case_type
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
      setShowPromoteConfirm(false)
    },
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: 32 }}>
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // ── Error state — editorial "not found" ───────────────────────────────────
  if (isError || !detail) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.2em', color: INK_FAINT, marginBottom: 16, textTransform: 'uppercase' }}>
            {t('caseDetail.notFoundLabel')}
          </p>
          <h1 style={{ fontSize: 32, fontFamily: 'serif', color: INK, marginBottom: 12, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {t('caseDetail.notFoundTitle', { caseId })}
          </h1>
          <p style={{ color: INK_DIM, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            {t('caseDetail.notFoundBody')}
          </p>
          <button
            onClick={() => navigate('/investigation')}
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            {t('caseDetail.allInvestigations')}
          </button>
        </div>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const priority = getPriority(detail.suspicion_score)
  const sectorColor = SECTOR_COLORS[detail.sector_name] || '#64748b'
  const cleanTitle = toTitleCase(
    detail.title
      .replace(/ - Anomalous Procurement Pattern$/, '')
      .replace(/ - Externally Corroborated Investigation$/, '')
  )

  // Parse external_sources — stored as array of record objects
  let parsedEvidence: ExternalEvidence[] = []
  try {
    if (Array.isArray(detail.external_sources) && detail.external_sources.length > 0) {
      parsedEvidence = detail.external_sources.map((s) => ({
        source_url: (s.source_url || s.url || '') as string,
        source_title: (s.source_title || s.title || '') as string,
        source_type: (s.source_type || 'news') as string,
        summary: (s.summary || s.description || '') as string,
        date_published: (s.date_published || null) as string | null,
        credibility: (s.credibility || 'medium') as string,
      }))
    }
  } catch {
    // ignore parse errors
  }

  const firstVendor = detail.vendors[0]
  const newsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${cleanTitle}" ASF auditoría corrupción México`)}`
  const asfSearchUrl = `https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones.asp`

  // Confidence pill color
  const confidencePct = (detail.confidence * 100).toFixed(0)
  const confidenceColor = detail.confidence >= 0.75 ? '#22c55e' : detail.confidence >= 0.5 ? '#f59e0b' : '#78716c'

  // Summary-strip scales
  const VALUE_CEIL = 100_000_000_000 // 100 B MXN cap for DotBar scale
  const valueRatio = Math.min(1, detail.total_value_mxn / VALUE_CEIL)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK }}>
      <div className="mx-auto max-w-6xl px-6 md:px-8 py-8 md:py-10 space-y-8">

        {/* ═══════════════════════════════════════════════════════════════════
            HEADER — editorial masthead
            ═══════════════════════════════════════════════════════════════════ */}

        <header className="space-y-5" style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 24 }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/investigation')}
              className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: INK_DIM,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ArrowLeft className="h-3 w-3" />
              {t('caseDetail.breadcrumb')}
            </button>
            <span style={{ color: INK_FAINT, fontSize: 10 }}>/</span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: INK_MUTED,
                fontWeight: 700,
              }}
            >
              {detail.case_id}
            </span>
          </div>

          {/* Title block */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: LEVEL_COLOR[priority.level],
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                {t('caseDetail.caseLabel')} · P{priority.n} {priority.level.toUpperCase()}
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-family-serif, Georgia, serif)',
                  fontSize: 'clamp(1.75rem, 3.6vw, 2.5rem)',
                  fontWeight: 700,
                  lineHeight: 1.08,
                  letterSpacing: '-0.022em',
                  color: INK,
                  marginBottom: 14,
                }}
              >
                {cleanTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={detail.validation_status} t={t} />
                {/* Confidence */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{
                    color: confidenceColor,
                    border: `1px solid ${confidenceColor}44`,
                    backgroundColor: `${confidenceColor}14`,
                  }}
                >
                  <Shield className="h-3 w-3" />
                  {t('caseDetail.confidencePct', { pct: confidencePct })}
                </span>
                {/* Fraud type */}
                {detail.case_type && (
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: INK_MUTED,
                      padding: '2px 10px',
                      borderRadius: 999,
                      border: `1px solid ${BORDER_HI}`,
                      backgroundColor: CARD_HI,
                    }}
                  >
                    {detail.case_type.replace(/_/g, ' ')}
                  </span>
                )}
                {/* Sector */}
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{
                    backgroundColor: `${sectorColor}18`,
                    color: sectorColor,
                    border: `1px solid ${sectorColor}33`,
                  }}
                >
                  {getSectorNameEN(detail.sector_name)}
                </span>
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <AddToDossierButton
                entityType="note"
                entityId={detail.id}
                entityName={detail.title}
                className="h-8 text-xs"
              />
              <a
                href={asfSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: INK_MUTED,
                  border: `1px solid ${BORDER_HI}`,
                  padding: '6px 12px',
                  borderRadius: 4,
                  backgroundColor: CARD,
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                ASF
              </a>
              <a
                href={newsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: INK_MUTED,
                  border: `1px solid ${BORDER_HI}`,
                  padding: '6px 12px',
                  borderRadius: 4,
                  backgroundColor: CARD,
                }}
              >
                <Newspaper className="h-3.5 w-3.5" />
                News
              </a>
              <button
                onClick={() => setShowStatusModal(true)}
                className="transition-colors hover:opacity-80"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: INK,
                  border: `1px solid ${BORDER_HI}`,
                  padding: '6px 12px',
                  borderRadius: 4,
                  backgroundColor: CARD_HI,
                  cursor: 'pointer',
                }}
              >
                {t('caseDetail.changeStatusBtn')}
              </button>
              <button
                onClick={() => setShowEvidenceForm(true)}
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                  padding: '6px 12px',
                  borderRadius: 4,
                  backgroundColor: 'rgba(245,158,11,0.08)',
                  cursor: 'pointer',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('caseDetail.addEvidenceBtn')}
              </button>
              {detail.validation_status === 'corroborated' && (
                <button
                  onClick={() => setShowPromoteConfirm(true)}
                  className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)',
                    padding: '6px 12px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(34,197,94,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {t('caseDetail.promoteToGT')}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            SUMMARY STRIP — three stats with DotBars
            ═══════════════════════════════════════════════════════════════════ */}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ backgroundColor: BORDER, border: `1px solid ${BORDER}` }}>
          {/* Vendors */}
          <div style={{ backgroundColor: CARD, padding: '20px 24px' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_DIM, marginBottom: 8 }}>
              {t('caseDetail.vendorsInvolved')}
            </div>
            <div style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, color: INK, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {formatNumber(detail.vendor_count || detail.vendors.length)}
            </div>
            <div style={{ fontSize: 11, color: INK_DIM, marginTop: 6 }}>
              {t('caseDetail.acrossContracts', { n: formatNumber(detail.total_contracts) })}
            </div>
          </div>

          {/* Total value */}
          <div style={{ backgroundColor: CARD, padding: '20px 24px' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_DIM, marginBottom: 8 }}>
              {t('caseDetail.totalValue')}
            </div>
            <div style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, color: INK, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {formatCompactMXN(detail.total_value_mxn)}
            </div>
            <div className="mt-2.5">
              <DotBar value={valueRatio} max={1} color="#f59e0b" dots={20} size={5} gap={2} />
            </div>
            <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 6, fontFamily: 'monospace' }}>
              {t('caseDetail.scaleMXN')}
            </div>
          </div>

          {/* Avg suspicion score */}
          <div style={{ backgroundColor: CARD, padding: '20px 24px' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_DIM, marginBottom: 8 }}>
              {t('caseDetail.suspicionScore')}
            </div>
            <div style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, color: LEVEL_COLOR[priority.level], lineHeight: 1, letterSpacing: '-0.01em' }}>
              {(detail.suspicion_score * 100).toFixed(0)}
              <span style={{ fontSize: 20, opacity: 0.6 }}>%</span>
            </div>
            <div className="mt-2.5">
              <DotBar value={detail.suspicion_score} max={1} color={LEVEL_COLOR[priority.level]} dots={20} size={5} gap={2} />
            </div>
            <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 6, fontFamily: 'monospace' }}>
              {t('caseDetail.riskThresholdHint')}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            CASE NARRATIVE — serif editorial block
            ═══════════════════════════════════════════════════════════════════ */}

        {(detail.narrative || detail.summary) && (
          <section
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${LEVEL_COLOR[priority.level]}`,
              borderRadius: 4,
              padding: '24px 28px',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4" style={{ color: INK_DIM }} />
              <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_DIM, fontWeight: 700 }}>
                {t('caseDetail.caseNarrative')}
              </p>
            </div>

            {detail.narrative && (
              <div
                style={{
                  fontFamily: 'var(--font-family-serif, Georgia, serif)',
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: INK,
                }}
                className="space-y-2"
              >
                {(() => {
                  const lines = detail.narrative.split('\n')
                  const elements: React.ReactNode[] = []
                  let i = 0
                  while (i < lines.length) {
                    const line = lines[i]
                    // Pipe table
                    if (line.trim().startsWith('|')) {
                      const tableLines: string[] = []
                      while (i < lines.length && lines[i].trim().startsWith('|')) {
                        tableLines.push(lines[i])
                        i++
                      }
                      const rows = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l))
                      if (rows.length > 0) {
                        const parseCells = (row: string) =>
                          row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
                        const [headerRow, ...bodyRows] = rows
                        elements.push(
                          <div key={`table-${i}`} className="overflow-x-auto my-4" style={{ fontFamily: 'var(--font-family-sans, system-ui)' }}>
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr>
                                  {parseCells(headerRow).map((cell, ci) => (
                                    <th
                                      key={ci}
                                      className="px-3 py-2 text-left"
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: INK,
                                        borderBottom: `1px solid ${BORDER_HI}`,
                                        backgroundColor: CARD_HI,
                                      }}
                                    >
                                      {cell}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {bodyRows.map((row, ri) => (
                                  <tr key={ri}>
                                    {parseCells(row).map((cell, ci) => (
                                      <td
                                        key={ci}
                                        className="px-3 py-2"
                                        style={{
                                          fontSize: 12,
                                          color: INK_MUTED,
                                          borderBottom: `1px solid ${BORDER}`,
                                        }}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      }
                      continue
                    }
                    if (line.startsWith('### ')) { elements.push(<h4 key={i} style={{ fontFamily: 'var(--font-family-sans, system-ui)', fontSize: 13, fontWeight: 700, color: INK, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{line.slice(4)}</h4>); i++; continue }
                    if (line.startsWith('## ')) { elements.push(<h3 key={i} style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontSize: 20, fontWeight: 700, color: INK, marginTop: 20, marginBottom: 8, letterSpacing: '-0.01em' }}>{line.slice(3)}</h3>); i++; continue }
                    if (line.startsWith('# ')) { elements.push(<h2 key={i} style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontSize: 24, fontWeight: 700, color: INK, marginTop: 24, marginBottom: 10, letterSpacing: '-0.015em' }}>{line.slice(2)}</h2>); i++; continue }
                    if (line.trim() === '') { elements.push(<div key={i} className="h-2" />); i++; continue }
                    const parts = line.split(/\*\*(.+?)\*\*/g)
                    elements.push(
                      <p key={i}>
                        {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700, color: INK }}>{part}</strong> : part)}
                      </p>
                    )
                    i++
                  }
                  return elements
                })()}
              </div>
            )}

            {detail.summary && detail.summary !== detail.narrative && (
              <p
                style={{
                  fontSize: 13,
                  color: INK_DIM,
                  lineHeight: 1.7,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${BORDER}`,
                  fontStyle: 'italic',
                }}
              >
                {detail.summary}
              </p>
            )}

            {/* Signals triggered */}
            {detail.signals_triggered.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 8, fontWeight: 600 }}>
                  {t('caseDetail.signalsTriggered')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.signals_triggered.map((signal) => (
                    <span
                      key={signal}
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        padding: '3px 8px',
                        borderRadius: 3,
                        backgroundColor: 'rgba(245,158,11,0.1)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VENDOR EVIDENCE CARDS
            ═══════════════════════════════════════════════════════════════════ */}

        {detail.vendors.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: INK_DIM }} />
                <h2 style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, fontWeight: 700 }}>
                  {t('caseDetail.vendorsInvolved')}
                </h2>
                <span style={{ fontSize: 11, color: INK_DIM, fontFamily: 'monospace' }}>
                  ({detail.vendors.length})
                </span>
              </div>
              {firstVendor && (
                <div className="flex gap-2">
                  <a
                    href={asfSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                    style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: INK_DIM,
                      padding: '4px 8px',
                      borderRadius: 3,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <Shield className="h-3 w-3" />
                    {t('caseDetail.asfLookupBtn')}
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`"${toTitleCase(firstVendor.name)}" corrupción contrato gobierno México`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
                    style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: INK_DIM,
                      padding: '4px 8px',
                      borderRadius: 3,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <Newspaper className="h-3 w-3" />
                    {t('caseDetail.newsBtn')}
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {detail.vendors.map((v: InvestigationVendor) => {
                const vRisk = v.avg_risk_score ?? 0
                const vLevel = getPriority(vRisk).level
                const vColor = LEVEL_COLOR[vLevel]
                return (
                  <div
                    key={v.vendor_id}
                    style={{
                      backgroundColor: CARD,
                      border: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${vColor}`,
                      borderRadius: 4,
                      padding: 18,
                    }}
                  >
                    {/* Top row: name + risk number */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/vendors/${v.vendor_id}`}
                          style={{
                            fontSize: 15,
                            fontFamily: 'var(--font-family-serif, Georgia, serif)',
                            fontWeight: 600,
                            color: INK,
                            lineHeight: 1.25,
                            display: 'block',
                            letterSpacing: '-0.01em',
                          }}
                          className="transition-colors hover:underline"
                        >
                          {toTitleCase(v.name)}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {v.rfc && (
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: INK_FAINT, letterSpacing: '0.03em' }}>
                              {v.rfc}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: 'monospace',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: INK_DIM,
                              padding: '1px 6px',
                              borderRadius: 2,
                              border: `1px solid ${BORDER_HI}`,
                            }}
                          >
                            {v.role}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {v.avg_risk_score != null ? (
                          <>
                            <div style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 700, color: vColor, lineHeight: 1, letterSpacing: '-0.01em' }}>
                              {(v.avg_risk_score * 100).toFixed(0)}
                              <span style={{ fontSize: 11, opacity: 0.6 }}>%</span>
                            </div>
                            <div style={{ fontSize: 9, fontFamily: 'monospace', color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                              {t('caseDetail.riskLabel')}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: INK_FAINT }}>—</span>
                        )}
                      </div>
                    </div>

                    {/* Risk DotBar */}
                    {v.avg_risk_score != null && (
                      <div className="mb-3">
                        <DotBar value={v.avg_risk_score} max={1} color={vColor} dots={24} size={4} gap={2} />
                      </div>
                    )}

                    {/* Counts row */}
                    <div className="grid grid-cols-2 gap-3 mb-3" style={{ fontSize: 11 }}>
                      <div>
                        <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 3 }}>
                          {t('caseDetail.contractsLabel')}
                        </div>
                        <div style={{ fontSize: 13, fontFamily: 'monospace', color: INK, fontWeight: 600 }}>
                          {v.contract_count != null ? formatNumber(v.contract_count) : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 3 }}>
                          {t('caseDetail.valueLabel')}
                        </div>
                        <div style={{ fontSize: 13, fontFamily: 'monospace', color: INK, fontWeight: 600 }}>
                          {v.contract_value_mxn != null ? formatCompactMXN(v.contract_value_mxn) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Footer: deep-dive links */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: `1px solid ${BORDER}` }}
                    >
                      <Link
                        to={`/contracts?vendor_id=${v.vendor_id}&sort_by=risk_score&sort_order=desc`}
                        className="inline-flex items-center gap-1 transition-colors hover:opacity-80"
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: INK_DIM,
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('caseDetail.contractsLabel')}
                      </Link>
                      <Link
                        to={`/thread/${v.vendor_id}`}
                        className="inline-flex items-center gap-1 transition-colors hover:opacity-80"
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#ef4444',
                        }}
                      >
                        {t('caseDetail.redThread')}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            INVESTIGATION QUESTIONS
            ═══════════════════════════════════════════════════════════════════ */}

        {detail.questions.length > 0 && (
          <section>
            <div className="flex items-baseline gap-2 mb-4">
              <HelpCircle className="h-4 w-4" style={{ color: INK_DIM }} />
              <h2 style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, fontWeight: 700 }}>
                {t('caseDetail.investigationQuestions')}
              </h2>
              <span style={{ fontSize: 11, color: INK_DIM, fontFamily: 'monospace' }}>
                ({detail.questions.length})
              </span>
            </div>

            <div className="space-y-3">
              {detail.questions.map((q: InvestigationQuestion) => (
                <div
                  key={q.id}
                  style={{
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                    padding: '16px 20px',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: q.priority <= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(168,162,158,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: q.priority <= 2 ? '#ef4444' : INK_DIM }}>
                        Q{q.priority}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: INK }}>
                        {q.question_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: INK_FAINT,
                          }}
                        >
                          {q.question_type.replace(/_/g, ' ')}
                        </span>
                        {q.priority <= 2 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'monospace',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 2,
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.25)',
                              fontWeight: 600,
                            }}
                          >
                            {t('caseDetail.highPriorityLabel')}
                          </span>
                        )}
                        {q.supporting_evidence && q.supporting_evidence.length > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: INK_DIM,
                            }}
                          >
                            · {t('caseDetail.supportingEvidence_other', { count: q.supporting_evidence.length })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            EVIDENCE LOG — external sources timeline
            ═══════════════════════════════════════════════════════════════════ */}

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: INK_DIM }} />
              <h2 style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, fontWeight: 700 }}>
                {t('caseDetail.evidenceLog')}
              </h2>
              {parsedEvidence.length > 0 && (
                <span style={{ fontSize: 11, color: INK_DIM, fontFamily: 'monospace' }}>
                  ({parsedEvidence.length})
                </span>
              )}
            </div>
            <button
              onClick={() => setShowEvidenceForm(!showEvidenceForm)}
              className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#f59e0b',
                padding: '5px 10px',
                borderRadius: 3,
                border: '1px solid rgba(245,158,11,0.3)',
                backgroundColor: 'rgba(245,158,11,0.08)',
                cursor: 'pointer',
              }}
            >
              <Plus className="h-3 w-3" />
              {t('caseDetail.addEvidenceBtn')}
            </button>
          </div>

          {parsedEvidence.length === 0 && !showEvidenceForm ? (
            <div
              style={{
                backgroundColor: CARD,
                border: `1px dashed ${BORDER_HI}`,
                borderRadius: 4,
                padding: '32px 20px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 12, color: INK_DIM, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                {t('caseDetail.noEvidenceLogged')}
              </p>
              <p style={{ fontSize: 11, color: INK_FAINT, marginTop: 6 }}>
                {t('caseDetail.attachEvidenceHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-0" style={{ position: 'relative' }}>
              {/* Timeline line */}
              {parsedEvidence.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: 12,
                    bottom: 12,
                    width: 1,
                    backgroundColor: BORDER_HI,
                  }}
                />
              )}

              {parsedEvidence.map((ev, i) => {
                const strengthColor = EVIDENCE_STRENGTH_COLOR[ev.credibility?.toLowerCase() || 'unknown'] || INK_DIM
                return (
                  <div key={i} className="flex gap-4 py-3" style={{ position: 'relative' }}>
                    {/* Timeline node */}
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        backgroundColor: CARD_HI,
                        border: `2px solid ${strengthColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                        zIndex: 1,
                      }}
                    >
                      <Newspaper className="h-2.5 w-2.5" style={{ color: strengthColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Date + source type */}
                      <div className="flex items-center gap-2 mb-1">
                        {ev.date_published && (
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: INK_DIM, letterSpacing: '0.05em' }}>
                            {(() => {
                              try {
                                return formatDate(ev.date_published)
                              } catch {
                                return ev.date_published
                              }
                            })()}
                          </span>
                        )}
                        {ev.date_published && (
                          <span style={{ fontSize: 10, color: INK_FAINT }}>·</span>
                        )}
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: 'monospace',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: INK_DIM,
                          }}
                        >
                          {ev.source_type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: 10, color: INK_FAINT }}>·</span>
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: 'monospace',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: strengthColor,
                            fontWeight: 600,
                          }}
                        >
                          {ev.credibility || 'unknown'}
                        </span>
                      </div>

                      {/* Title */}
                      {ev.source_url ? (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 transition-colors hover:underline"
                          style={{
                            fontSize: 14,
                            fontFamily: 'var(--font-family-serif, Georgia, serif)',
                            fontWeight: 600,
                            color: INK,
                            lineHeight: 1.35,
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {ev.source_title || t('caseDetail.untitledSource')}
                          <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60" />
                        </a>
                      ) : (
                        <p
                          style={{
                            fontSize: 14,
                            fontFamily: 'var(--font-family-serif, Georgia, serif)',
                            fontWeight: 600,
                            color: INK,
                            lineHeight: 1.35,
                          }}
                        >
                          {ev.source_title || t('caseDetail.untitledSource')}
                        </p>
                      )}

                      {/* Summary */}
                      {ev.summary && (
                        <p style={{ fontSize: 12, color: INK_MUTED, lineHeight: 1.6, marginTop: 4 }}>
                          {ev.summary}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Inline add-evidence form */}
          {showEvidenceForm && (
            <div
              className="mt-5"
              style={{
                backgroundColor: 'rgba(245,158,11,0.04)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 4,
                padding: 18,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#f59e0b',
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {t('caseDetail.logNewEvidence')}
              </p>
              <div className="space-y-2">
                <input
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '8px 12px',
                    color: INK,
                    outline: 'none',
                  }}
                  placeholder={t('caseDetail.sourceUrlPlaceholder')}
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <input
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '8px 12px',
                    color: INK,
                    outline: 'none',
                  }}
                  placeholder="Article / document title"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                />
                <textarea
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '8px 12px',
                    color: INK,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                  rows={3}
                  placeholder="Summary / relevance to this case"
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                />
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <select
                    style={{
                      fontSize: 12,
                      backgroundColor: CARD,
                      border: `1px solid ${BORDER_HI}`,
                      borderRadius: 3,
                      padding: '6px 10px',
                      color: INK_MUTED,
                      outline: 'none',
                    }}
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                  >
                    <option value="news">News article</option>
                    <option value="asf_audit">ASF audit</option>
                    <option value="legal">Legal filing</option>
                    <option value="investigative">Investigative report</option>
                  </select>
                  <select
                    style={{
                      fontSize: 12,
                      backgroundColor: CARD,
                      border: `1px solid ${BORDER_HI}`,
                      borderRadius: 3,
                      padding: '6px 10px',
                      color: INK_MUTED,
                      outline: 'none',
                    }}
                    value={credibility}
                    onChange={(e) => setCredibility(e.target.value as 'low' | 'medium' | 'high')}
                  >
                    <option value="low">Low credibility</option>
                    <option value="medium">Medium credibility</option>
                    <option value="high">High credibility</option>
                  </select>
                  <input
                    type="date"
                    style={{
                      fontSize: 12,
                      backgroundColor: CARD,
                      border: `1px solid ${BORDER_HI}`,
                      borderRadius: 3,
                      padding: '6px 10px',
                      color: INK_MUTED,
                      outline: 'none',
                    }}
                    value={datePublished}
                    onChange={(e) => setDatePublished(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!evidenceUrl || !evidenceTitle || addEvidenceMutation.isPending}
                    onClick={() => addEvidenceMutation.mutate()}
                  >
                    {addEvidenceMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setShowEvidenceForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            REVIEW ACTION RAIL
            ═══════════════════════════════════════════════════════════════════ */}

        <section
          style={{
            backgroundColor: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: '18px 24px',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_DIM, fontWeight: 700, marginBottom: 4 }}>
                Review decision
              </p>
              <p style={{ fontSize: 13, color: INK_MUTED }}>
                Corroborate, refute, or mark inconclusive based on the evidence above.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={reviewMutation.isPending || detail.validation_status === 'corroborated'}
                onClick={() => reviewMutation.mutate({ status: 'corroborated' })}
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                  backgroundColor: 'rgba(34,197,94,0.08)',
                  padding: '7px 14px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Corroborate
              </button>
              <button
                disabled={reviewMutation.isPending || detail.validation_status === 'refuted'}
                onClick={() => reviewMutation.mutate({ status: 'refuted' })}
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  padding: '7px 14px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Refute
              </button>
              <button
                disabled={reviewMutation.isPending || detail.validation_status === 'inconclusive'}
                onClick={() => reviewMutation.mutate({ status: 'inconclusive' })}
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: INK_MUTED,
                  border: `1px solid ${BORDER_HI}`,
                  backgroundColor: CARD_HI,
                  padding: '7px 14px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Inconclusive
              </button>
              {detail.validation_status === 'corroborated' && (
                <button
                  disabled={promoteMutation.isPending}
                  onClick={() => setShowPromoteConfirm(true)}
                  className="inline-flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.3)',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    padding: '7px 14px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {promoteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  Promote to GT
                </button>
              )}
            </div>
          </div>
          {reviewMutation.isPending && (
            <p style={{ fontSize: 11, color: INK_DIM, marginTop: 10, fontFamily: 'monospace' }}>
              <Loader2 className="h-3 w-3 animate-spin inline mr-1.5" />
              Saving…
            </p>
          )}
          {promoteMutation.isSuccess && (
            <p style={{ fontSize: 11, color: '#22c55e', marginTop: 10, fontFamily: 'monospace' }}>
              Promoted to ground truth.
            </p>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MODALS
            ═══════════════════════════════════════════════════════════════════ */}

        {showStatusModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <div
              style={{
                backgroundColor: CARD,
                border: `1px solid ${BORDER_HI}`,
                borderRadius: 6,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                padding: 24,
                width: '100%',
                maxWidth: 480,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: INK_DIM,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Review workflow
              </p>
              <h3
                style={{
                  fontSize: 20,
                  fontFamily: 'var(--font-family-serif, Georgia, serif)',
                  color: INK,
                  marginBottom: 16,
                  letterSpacing: '-0.01em',
                }}
              >
                Change case status
              </h3>
              <div className="space-y-2.5">
                <select
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD_HI,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '9px 12px',
                    color: INK,
                    outline: 'none',
                  }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as InvestigationValidationStatus)}
                >
                  <option value="pending">Pending</option>
                  <option value="corroborated">Corroborated</option>
                  <option value="refuted">Refuted</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
                <textarea
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD_HI,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '9px 12px',
                    color: INK,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                  rows={3}
                  placeholder="Review notes (optional)"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
                <input
                  style={{
                    width: '100%',
                    fontSize: 13,
                    backgroundColor: CARD_HI,
                    border: `1px solid ${BORDER_HI}`,
                    borderRadius: 3,
                    padding: '9px 12px',
                    color: INK,
                    outline: 'none',
                  }}
                  placeholder="Reviewer name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-4 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ status: newStatus, notes: statusNotes })}
                >
                  {reviewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showPromoteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <div
              style={{
                backgroundColor: CARD,
                border: `1px solid ${BORDER_HI}`,
                borderRadius: 6,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                padding: 24,
                width: '100%',
                maxWidth: 480,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#f59e0b',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Ground truth
              </p>
              <h3
                style={{
                  fontSize: 20,
                  fontFamily: 'var(--font-family-serif, Georgia, serif)',
                  color: INK,
                  marginBottom: 10,
                  letterSpacing: '-0.01em',
                }}
              >
                Promote to ground truth?
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: INK_MUTED,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                This case will be added to the ground truth corpus and used for future risk model
                calibration. This action is recorded and auditable.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPromoteConfirm(false)}
                  disabled={promoteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={promoteMutation.isPending}
                  onClick={() => promoteMutation.mutate()}
                >
                  {promoteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  )}
                  Promote
                </Button>
              </div>
              {promoteMutation.isSuccess && (
                <p style={{ fontSize: 11, color: '#22c55e', marginTop: 10, fontFamily: 'monospace' }}>
                  Promoted successfully.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvestigationCaseDetail
