/**
 * InvestigationCaseDetail
 * Full-page case detail view for a single investigation case.
 * Route: /investigation/:caseId
 *
 * Sections:
 *  1. Top bar: back button, title, badges, action buttons
 *  2. Summary cards: contracts / value / score
 *  3. Case narrative
 *  4. Involved vendors table
 *  5. Investigation questions
 *  6. Evidence log (external_sources)
 *  7. Action area: change status / add evidence / promote
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { investigationApi } from '@/api/client'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
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
  AlertCircle,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

// ============================================================================
// HELPERS
// ============================================================================

function getPriority(score: number): { level: PriorityLevel; n: number } {
  if (score >= 0.75) return { level: 'critical', n: 1 }
  if (score >= 0.50) return { level: 'high', n: 2 }
  if (score >= 0.25) return { level: 'medium', n: 3 }
  return { level: 'low', n: 4 }
}

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  critical: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30',
  high: 'bg-risk-high/15 text-risk-high border border-risk-high/30',
  medium: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30',
  low: 'bg-risk-low/15 text-risk-low border border-risk-low/30',
}

const SCORE_COLOR: Record<PriorityLevel, string> = {
  critical: 'text-risk-critical',
  high: 'text-risk-high',
  medium: 'text-risk-medium',
  low: 'text-risk-low',
}

const STATUS_CONFIG: Record<InvestigationValidationStatus, {
  icon: React.ElementType
  label: string
  className: string
}> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30',
  },
  corroborated: {
    icon: CheckCircle2,
    label: 'Corroborated',
    className: 'bg-risk-low/15 text-risk-low border border-risk-low/30',
  },
  refuted: {
    icon: XCircle,
    label: 'Refuted',
    className: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30',
  },
  inconclusive: {
    icon: HelpCircle,
    label: 'Inconclusive',
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  },
}

function StatusPill({ status }: { status: InvestigationValidationStatus }) {
  const { t } = useTranslation('investigation')
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {t(`status.${status}`)}
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

  // Evidence form state
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [evidenceType, setEvidenceType] = useState('news')

  // Data fetch
  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['investigation', 'case', caseId],
    queryFn: () => investigationApi.getCaseById(caseId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!caseId,
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      investigationApi.reviewCase(caseId!, status, notes, 'analyst'),
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
        date_published: null,
        credibility: 'medium',
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 flex-1" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-risk-critical opacity-60" />
        <p className="text-sm text-text-muted">Could not load case. It may not exist.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/investigation')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          {t('caseDetail.backToQueue')}
        </Button>
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* TOP BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {/* Back link */}
          <Link
            to="/investigation"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('caseDetail.backToQueue')}
          </Link>

          {/* Title + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary leading-snug">
              {cleanTitle}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider uppercase border',
              PRIORITY_BADGE[priority.level]
            )}>
              P{priority.n} {priority.level.toUpperCase()}
            </span>
            <StatusPill status={detail.validation_status} />
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: sectorColor + '18', color: sectorColor }}
            >
              {getSectorNameEN(detail.sector_name)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <AddToDossierButton
            entityType="note"
            entityId={detail.id}
            entityName={detail.title}
            className="h-8 text-xs"
          />
          {/* ASF Lookup */}
          <a
            href={asfSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border/50 text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
            {t('asfLookup.button')}
          </a>
          {/* News Search */}
          <a
            href={newsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border/50 text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors"
          >
            <Newspaper className="h-3.5 w-3.5" />
            {t('asfLookup.newsSearch')}
          </a>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setShowStatusModal(true)}
          >
            {t('caseDetail.changeStatus')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setShowEvidenceForm(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('caseDetail.addEvidence')}
          </Button>
          {detail.validation_status === 'corroborated' && (
            <Button
              size="sm"
              className="h-8 text-xs bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30"
              onClick={() => setShowPromoteConfirm(true)}
            >
              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
              {t('caseDetail.promoteToGroundTruth')}
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1 — SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-text-muted mb-1">{t('cases.columns.contractCount')}</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums">
              {formatNumber(detail.total_contracts)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-text-muted mb-1">Total Value</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums font-mono">
              {formatCompactMXN(detail.total_value_mxn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-text-muted mb-1">Suspicion Score</p>
            <p className={cn('text-2xl font-bold tabular-nums font-mono', SCORE_COLOR[priority.level])}>
              {(detail.suspicion_score * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2 — NARRATIVE */}
      {(detail.narrative || detail.summary) && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-accent opacity-70" />
              <h2 className="text-sm font-bold text-text-primary">{t('caseDetail.narrative')}</h2>
            </div>
            {detail.narrative && (
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {detail.narrative}
              </p>
            )}
            {detail.summary && detail.summary !== detail.narrative && (
              <p className="text-xs text-text-muted leading-relaxed mt-3 pt-3 border-t border-border/20">
                {detail.summary}
              </p>
            )}
            {/* Signals triggered */}
            {detail.signals_triggered.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/20">
                {detail.signals_triggered.map((signal) => (
                  <span
                    key={signal}
                    className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-mono"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 3 — INVOLVED VENDORS */}
      {detail.vendors.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-accent opacity-70" />
              <h2 className="text-sm font-bold text-text-primary">{t('caseDetail.vendors')}</h2>
              <span className="text-xs text-text-muted">({detail.vendors.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="pb-2 text-left text-xs font-medium text-text-muted">Vendor</th>
                    <th className="pb-2 text-left text-xs font-medium text-text-muted">Role</th>
                    <th className="pb-2 text-right text-xs font-medium text-text-muted">Contracts</th>
                    <th className="pb-2 text-right text-xs font-medium text-text-muted">Value</th>
                    <th className="pb-2 text-right text-xs font-medium text-text-muted">Avg Risk</th>
                    <th className="pb-2 text-left text-xs font-medium text-text-muted"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {detail.vendors.map((v: InvestigationVendor) => (
                    <tr key={v.vendor_id} className="hover:bg-background-elevated/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/vendors/${v.vendor_id}`}
                          className="text-xs font-medium text-text-primary hover:text-accent transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {toTitleCase(v.name)}
                        </Link>
                        {v.rfc && (
                          <p className="text-xs text-text-muted font-mono mt-0.5">{v.rfc}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs text-text-muted">{v.role}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span className="text-xs text-text-secondary tabular-nums">
                          {v.contract_count != null ? formatNumber(v.contract_count) : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span className="text-xs text-text-secondary tabular-nums font-mono">
                          {v.contract_value_mxn != null ? formatCompactMXN(v.contract_value_mxn) : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {v.avg_risk_score != null ? (
                          <span className={cn(
                            'text-xs font-bold tabular-nums',
                            SCORE_COLOR[getPriority(v.avg_risk_score).level]
                          )}>
                            {(v.avg_risk_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Link
                          to={`/contracts?vendor_id=${v.vendor_id}&sort_by=risk_score&sort_order=desc`}
                          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* External links for first vendor */}
            {firstVendor && (
              <div className="mt-3 pt-3 border-t border-border/20 flex gap-2">
                <a
                  href={asfSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border/40 text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors"
                >
                  <Shield className="h-3 w-3" />
                  {t('asfLookup.button')}
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`"${toTitleCase(firstVendor.name)}" corrupción contrato gobierno México`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border/40 text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors"
                >
                  <Newspaper className="h-3 w-3" />
                  {t('asfLookup.newsSearch')}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 4 — INVESTIGATION QUESTIONS */}
      {detail.questions.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-accent opacity-70" />
              <h2 className="text-sm font-bold text-text-primary">{t('caseDetail.questions')}</h2>
              <span className="text-xs text-text-muted">({detail.questions.length})</span>
            </div>
            <div className="space-y-2">
              {detail.questions.map((q: InvestigationQuestion) => (
                <div key={q.id} className="flex gap-2.5 p-3 rounded bg-background-elevated/30 border border-border/20">
                  <HelpCircle className="h-3.5 w-3.5 text-accent/70 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary leading-relaxed">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-muted font-mono">{q.question_type}</span>
                      {q.priority <= 2 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-risk-high/10 text-risk-high font-medium">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5 — EVIDENCE LOG */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent opacity-70" />
              <h2 className="text-sm font-bold text-text-primary">{t('caseDetail.evidence')}</h2>
              {parsedEvidence.length > 0 && (
                <span className="text-xs text-text-muted">({parsedEvidence.length})</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowEvidenceForm(!showEvidenceForm)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('caseDetail.addEvidence')}
            </Button>
          </div>

          {parsedEvidence.length === 0 && !showEvidenceForm ? (
            <p className="text-xs text-text-muted py-4 text-center">{t('caseDetail.noEvidence')}</p>
          ) : (
            <div className="space-y-2">
              {parsedEvidence.map((ev, i) => (
                <div key={i} className="flex gap-3 p-3 rounded bg-background-elevated/30 border border-border/20">
                  <Newspaper className="h-4 w-4 text-emerald-400/60 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary">{ev.source_title || 'Untitled source'}</p>
                    {ev.summary && (
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{ev.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-text-secondary font-mono">{ev.source_type}</span>
                      {ev.date_published && (
                        <span className="text-xs text-text-muted">{ev.date_published}</span>
                      )}
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          {t('source')} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline add evidence form */}
          {showEvidenceForm && (
            <div className="mt-4 p-4 rounded-lg border border-accent/20 bg-accent/[0.02] space-y-2">
              <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
                {t('evidenceForm.title')}
              </p>
              <input
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2.5 py-1.5 text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/50"
                placeholder={t('evidenceForm.urlPlaceholder')}
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
              <input
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2.5 py-1.5 text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/50"
                placeholder={t('evidenceForm.titlePlaceholder')}
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
              />
              <textarea
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2.5 py-1.5 text-text-primary placeholder-text-muted/50 resize-none focus:outline-none focus:border-accent/50"
                rows={3}
                placeholder={t('evidenceForm.summaryPlaceholder')}
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
              />
              <div className="flex items-center gap-2 pt-1">
                <select
                  className="text-xs bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-secondary"
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                >
                  <option value="news">{t('evidenceForm.types.news')}</option>
                  <option value="asf_audit">{t('evidenceForm.types.asf_audit')}</option>
                  <option value="legal">{t('evidenceForm.types.legal')}</option>
                  <option value="investigative">{t('evidenceForm.types.investigative')}</option>
                </select>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!evidenceUrl || !evidenceTitle || addEvidenceMutation.isPending}
                  onClick={() => addEvidenceMutation.mutate()}
                >
                  {addEvidenceMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span className="ml-1">{t('evidenceForm.submit')}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setShowEvidenceForm(false)}
                >
                  {t('evidenceForm.cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 6 — REVIEW ACTIONS */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h2 className="text-sm font-bold text-text-primary mb-3">{t('review')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-risk-low/30 text-risk-low hover:bg-risk-low/10"
              disabled={reviewMutation.isPending || detail.validation_status === 'corroborated'}
              onClick={() => reviewMutation.mutate({ status: 'corroborated' })}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {t('actions.corroborate')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-risk-critical/30 text-risk-critical hover:bg-risk-critical/10"
              disabled={reviewMutation.isPending || detail.validation_status === 'refuted'}
              onClick={() => reviewMutation.mutate({ status: 'refuted' })}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {t('actions.refute')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={reviewMutation.isPending || detail.validation_status === 'inconclusive'}
              onClick={() => reviewMutation.mutate({ status: 'inconclusive' })}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              {t('actions.inconclusive')}
            </Button>

            {detail.validation_status === 'corroborated' && (
              <Button
                size="sm"
                className="h-8 text-xs ml-auto bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30"
                disabled={promoteMutation.isPending}
                onClick={() => setShowPromoteConfirm(true)}
              >
                {promoteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t('actions.promoteToGroundTruth')}
              </Button>
            )}
          </div>
          {reviewMutation.isPending && (
            <p className="text-xs text-text-muted mt-2">
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
              Saving...
            </p>
          )}
          {promoteMutation.isSuccess && (
            <p className="text-xs text-risk-low mt-2">{t('actions.promotedSuccess')}</p>
          )}
        </CardContent>
      </Card>

      {/* STATUS CHANGE MODAL */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background-card rounded-xl border border-border/50 shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-sm font-bold text-text-primary mb-4">{t('caseDetail.changeStatus')}</h3>
            <div className="space-y-3">
              <select
                className="w-full text-sm bg-background-elevated border border-border/50 rounded px-3 py-2 text-text-primary"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as InvestigationValidationStatus)}
              >
                <option value="pending">{t('status.pending')}</option>
                <option value="corroborated">{t('status.corroborated')}</option>
                <option value="refuted">{t('status.refuted')}</option>
                <option value="inconclusive">{t('status.inconclusive')}</option>
              </select>
              <textarea
                className="w-full text-sm bg-background-elevated border border-border/50 rounded px-3 py-2 text-text-primary placeholder-text-muted/50 resize-none focus:outline-none focus:border-accent/50"
                rows={3}
                placeholder="Optional notes..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowStatusModal(false)}
              >
                {t('evidenceForm.cancel')}
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

      {/* PROMOTE CONFIRM MODAL */}
      {showPromoteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background-card rounded-xl border border-border/50 shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-sm font-bold text-text-primary mb-2">
              {t('caseDetail.promoteToGroundTruth')}
            </h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              {t('caseDetail.promote.confirm')}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPromoteConfirm(false)}
                disabled={promoteMutation.isPending}
              >
                {t('evidenceForm.cancel')}
              </Button>
              <Button
                size="sm"
                className="bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30"
                disabled={promoteMutation.isPending}
                onClick={() => promoteMutation.mutate()}
              >
                {promoteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                )}
                {t('caseDetail.promoteToGroundTruth')}
              </Button>
            </div>
            {promoteMutation.isSuccess && (
              <p className="text-xs text-risk-low mt-2">{t('caseDetail.promote.success')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestigationCaseDetail
