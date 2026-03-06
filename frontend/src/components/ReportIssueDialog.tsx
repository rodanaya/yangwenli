/**
 * ReportIssueDialog — always-accessible user feedback channel.
 *
 * Lets any user report a bug, wrong data, or feature request.
 * Auto-captures the current page URL.  Submits to POST /api/v1/issues.
 */
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MessageSquarePlus, CheckCircle2, Loader2, Bug, Database, Lightbulb, HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { issueApi } from '@/api/client'

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

type Category = 'bug' | 'wrong_data' | 'feature_request' | 'other'

const CATEGORIES: { value: Category; label: string; description: string; Icon: React.ElementType; color: string }[] = [
  {
    value: 'bug',
    label: 'Bug',
    description: 'Page broken, chart not loading, error message',
    Icon: Bug,
    color: 'text-red-400 border-red-500/30 bg-red-500/5',
  },
  {
    value: 'wrong_data',
    label: 'Wrong data',
    description: 'Incorrect amount, wrong vendor name, missing record',
    Icon: Database,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  },
  {
    value: 'feature_request',
    label: 'Feature request',
    description: 'New chart, filter, export format, or analysis',
    Icon: Lightbulb,
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'General feedback or anything else',
    Icon: HelpCircle,
    color: 'text-text-muted border-border/40 bg-surface/30',
  },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const location = useLocation()

  const [category, setCategory] = useState<Category>('bug')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: { category: string; subject: string; description: string; page_url: string; email?: string }) =>
      issueApi.submit(data),
    onSuccess: () => {
      setSubmitted(true)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    mutation.mutate({
      category,
      subject: subject.trim(),
      description: description.trim(),
      page_url: window.location.origin + location.pathname + location.search,
      email: email.trim() || undefined,
    })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset form on close (after a brief delay so the animation finishes)
      setTimeout(() => {
        setCategory('bug')
        setSubject('')
        setDescription('')
        setEmail('')
        setSubmitted(false)
        mutation.reset()
      }, 200)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-accent" />
            Report an issue
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          // ── Success state ───────────────────────────────────────────────
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-semibold text-text-primary">Thanks, we received it.</p>
            <p className="text-sm text-text-muted max-w-xs">
              We'll look into it. If you left an email we'll follow up when it's resolved.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          // ── Form ────────────────────────────────────────────────────────
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">

            {/* Category selector */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-2">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(({ value, label, description, Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      category === value
                        ? color + ' ring-1 ring-inset ring-current/40'
                        : 'border-border/30 text-text-secondary hover:border-border/60 hover:bg-sidebar-hover'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-semibold">{label}</span>
                    </div>
                    <span className="text-[10px] text-text-muted leading-tight block">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Subject <span className="text-risk-critical">*</span>
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                autoFocus
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Description <span className="text-risk-critical">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What were you expecting? Include any relevant IDs or values."
                rows={3}
                className="resize-none text-sm"
                required
                maxLength={2000}
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Email <span className="text-text-muted">(optional — for follow-up)</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {/* Auto-captured URL */}
            <p className="text-[10px] text-text-muted/60">
              Current page will be captured automatically: <span className="font-mono">{location.pathname}</span>
            </p>

            {/* Error */}
            {mutation.isError && (
              <p className="text-xs text-risk-critical">Failed to submit — please try again.</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!subject.trim() || !description.trim() || mutation.isPending}>
                {mutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
                ) : (
                  'Send report'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
