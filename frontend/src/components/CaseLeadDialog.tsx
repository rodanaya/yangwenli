/**
 * CaseLeadDialog — Task 3
 * Lets analysts submit a case lead (suspected fraud) via the feedback API.
 * Used by CaseLibrary.tsx and GroundTruth.tsx.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Plus, Loader2, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { feedbackApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CaseLeadForm {
  caseName: string
  fraudType: string
  sectorId: string
  yearFrom: string
  yearTo: string
  evidence: string
  source: string
  contactEmail: string
}

const EMPTY_FORM: CaseLeadForm = {
  caseName: '',
  fraudType: '',
  sectorId: '',
  yearFrom: '',
  yearTo: '',
  evidence: '',
  source: '',
  contactEmail: '',
}

const FRAUD_TYPE_VALUES = [
  'ghost_company',
  'overpricing',
  'bid_rigging',
  'conflict_of_interest',
  'procurement_fraud',
  'bribery',
  'monopoly',
  'other',
] as const

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(
  form: CaseLeadForm,
  t: (key: string) => string,
): string | null {
  if (!form.caseName.trim()) return t('caseLeadDialog.validation.nameRequired')
  if (!form.fraudType) return t('caseLeadDialog.validation.fraudTypeRequired')
  if (!form.evidence.trim()) return t('caseLeadDialog.validation.evidenceRequired')
  if (form.evidence.trim().length < 50) return t('caseLeadDialog.validation.evidenceMinLength')
  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
    return t('caseLeadDialog.validation.emailInvalid')
  }
  return null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CaseLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CaseLeadDialog({ open, onOpenChange }: CaseLeadDialogProps) {
  const { t: ts } = useTranslation('sectors')
  const { t } = useTranslation('common')
  const [form, setForm] = useState<CaseLeadForm>(EMPTY_FORM)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000)
  }

  const handleChange = useCallback(
    (field: keyof CaseLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrorMsg(null)
    },
    []
  )

  const handleSelectChange = useCallback(
    (field: keyof CaseLeadForm) => (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setErrorMsg(null)
    },
    []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm(form, t)
    if (validationError) {
      setErrorMsg(validationError)
      return
    }

    setSubmitState('loading')
    setErrorMsg(null)

    const sectorName = form.sectorId
      ? (() => { const sec = SECTORS.find((s) => String(s.id) === form.sectorId); return sec ? ts(sec.code) : form.sectorId })()
      : 'Unknown'

    const period = form.yearFrom
      ? form.yearTo && form.yearTo !== form.yearFrom
        ? `${form.yearFrom}–${form.yearTo}`
        : form.yearFrom
      : 'Unknown period'

    const reason = [
      `[CASE_LEAD] ${form.caseName.trim()}`,
      `fraud_type:${form.fraudType}`,
      `sector:${sectorName}`,
      `period:${period}`,
      `evidence:${form.evidence.trim()}`,
      form.source.trim() ? `source:${form.source.trim()}` : null,
      form.contactEmail.trim() ? `contact:${form.contactEmail.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    try {
      await feedbackApi.submit({
        entity_type: 'contract',
        entity_id: Date.now() % 2147483647,
        feedback_type: 'needs_review',
        reason,
      })
      setSubmitState('success')
      setForm(EMPTY_FORM)
      showToast(t('caseLeadDialog.successMsg'))
      setTimeout(() => {
        setSubmitState('idle')
        onOpenChange(false)
      }, 1500)
    } catch {
      setSubmitState('error')
      setErrorMsg(t('caseLeadDialog.errorMsg'))
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setForm(EMPTY_FORM)
      setSubmitState('idle')
      setErrorMsg(null)
    }
    onOpenChange(open)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2001 }, (_, i) => currentYear - i)

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-high" aria-hidden="true" />
              {t('caseLeadDialog.title')}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-text-muted -mt-2 mb-3">
            Have information about suspected procurement fraud? Share it with our research team.
            All submissions are confidential and used only for risk model improvement.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Case name */}
            <div>
              <label htmlFor="cl-caseName" className="block text-xs font-medium text-text-secondary mb-1">
                {t('caseLeadDialog.vendorLabel')} <span className="text-risk-critical" aria-hidden="true">*</span>
              </label>
              <Input
                id="cl-caseName"
                placeholder="e.g. ABC Construcciones SA de CV or IMSS Contract Irregularity 2020"
                value={form.caseName}
                onChange={handleChange('caseName')}
                className="h-8 text-sm"
                required
                aria-required="true"
                aria-describedby="cl-caseName-hint"
              />
              <p id="cl-caseName-hint" className="text-[10px] text-text-muted mt-0.5">
                Vendor name, institution, or descriptive case title
              </p>
            </div>

            {/* Fraud type + Sector (2-col) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cl-fraudType" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('caseLeadDialog.fraudTypeLabel')} <span className="text-risk-critical" aria-hidden="true">*</span>
                </label>
                <Select
                  value={form.fraudType}
                  onValueChange={handleSelectChange('fraudType')}
                >
                  <SelectTrigger id="cl-fraudType" className="h-8 text-xs" aria-required="true">
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAUD_TYPE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{t(`caseLeadDialog.fraudTypes.${value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="cl-sector" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('caseLeadDialog.sectorLabel')}
                </label>
                <Select
                  value={form.sectorId}
                  onValueChange={handleSelectChange('sectorId')}
                >
                  <SelectTrigger id="cl-sector" className="h-8 text-xs">
                    <SelectValue placeholder="Select sector…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown / Multiple</SelectItem>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {ts(s.code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time period (2-col) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cl-yearFrom" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('caseLeadDialog.fromYear')}
                </label>
                <Select value={form.yearFrom} onValueChange={handleSelectChange('yearFrom')}>
                  <SelectTrigger id="cl-yearFrom" className="h-8 text-xs">
                    <SelectValue placeholder="Start year…" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="cl-yearTo" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('caseLeadDialog.toYear')}
                </label>
                <Select value={form.yearTo} onValueChange={handleSelectChange('yearTo')}>
                  <SelectTrigger id="cl-yearTo" className="h-8 text-xs">
                    <SelectValue placeholder="End year…" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Evidence */}
            <div>
              <label htmlFor="cl-evidence" className="block text-xs font-medium text-text-secondary mb-1">
                Evidence description <span className="text-risk-critical" aria-hidden="true">*</span>
                <span className="text-text-muted ml-1 font-normal">(min. 50 characters)</span>
              </label>
              <Textarea
                id="cl-evidence"
                placeholder="Describe the suspected fraud pattern, what you observed, any supporting data or patterns…"
                value={form.evidence}
                onChange={handleChange('evidence')}
                className="text-sm resize-none min-h-[80px]"
                required
                aria-required="true"
                aria-describedby="cl-evidence-counter"
              />
              <p
                id="cl-evidence-counter"
                className={`text-[10px] mt-0.5 ${form.evidence.length < 50 && form.evidence.length > 0 ? 'text-risk-high' : 'text-text-muted'}`}
              >
                {form.evidence.length} / 50 min. characters
              </p>
            </div>

            {/* Source */}
            <div>
              <label htmlFor="cl-source" className="block text-xs font-medium text-text-secondary mb-1">
                Source <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <Input
                id="cl-source"
                placeholder="ASF audit number, news article URL, document reference…"
                value={form.source}
                onChange={handleChange('source')}
                className="h-8 text-sm"
              />
            </div>

            {/* Contact email */}
            <div>
              <label htmlFor="cl-email" className="block text-xs font-medium text-text-secondary mb-1">
                Contact email <span className="text-text-muted font-normal">(optional, for follow-up)</span>
              </label>
              <Input
                id="cl-email"
                type="email"
                placeholder="analyst@example.org"
                value={form.contactEmail}
                onChange={handleChange('contactEmail')}
                className="h-8 text-sm"
                aria-describedby="cl-email-hint"
              />
              <p id="cl-email-hint" className="text-[10px] text-text-muted mt-0.5">
                Only used to send you updates on this case lead. Never shared publicly.
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div
                className="flex items-center gap-2 rounded-md bg-risk-critical/10 border border-risk-critical/30 px-3 py-2 text-xs text-risk-critical"
                role="alert"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errorMsg}
              </div>
            )}

            {/* Success message */}
            {submitState === 'success' && (
              <div
                className="flex items-center gap-2 rounded-md bg-risk-low/10 border border-risk-low/30 px-3 py-2 text-xs text-risk-low"
                role="status"
              >
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Case lead submitted — our team will investigate
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={submitState === 'loading'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitState === 'loading' || submitState === 'success'}
                aria-label="Submit case lead"
              >
                {submitState === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                ) : submitState === 'success' ? (
                  <Check className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                )}
                {submitState === 'success' ? 'Submitted' : 'Submit Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toastMsg && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-risk-low/90 text-white"
          role="status"
          aria-live="polite"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {toastMsg}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Trigger button — convenience wrapper used in page headers
// ---------------------------------------------------------------------------

interface CaseLeadButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default'
  className?: string
}

export function CaseLeadButton({ variant = 'outline', size = 'sm', className }: CaseLeadButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label="Submit a case lead"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Submit a Case Lead
      </Button>
      <CaseLeadDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export default CaseLeadDialog
