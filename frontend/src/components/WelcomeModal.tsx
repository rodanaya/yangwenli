import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Shield,
  BarChart3,
  Search,
  Target,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Folder,
  User,
  Command,
} from 'lucide-react'

const STORAGE_KEY = 'rubli-welcome-dismissed'

const STEPS = [
  {
    icon: Shield,
    titleKey: 'welcome.step1Title',
    descKey: 'welcome.step1Desc',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: BarChart3,
    titleKey: 'welcome.step2Title',
    descKey: 'welcome.step2Desc',
    color: 'text-risk-high',
    bgColor: 'bg-risk-high/10',
  },
  {
    icon: Search,
    titleKey: 'welcome.step3Title',
    descKey: 'welcome.step3Desc',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    icon: Target,
    titleKey: 'welcome.step4Title',
    descKey: 'welcome.step4Desc',
    color: 'text-signal-live',
    bgColor: 'bg-signal-live/10',
  },
]

// ── Step 2: Mini risk bar visualisation ──────────────────────────────────────
function RiskBarDemo({ t }: { t: (key: string) => string }) {
  const levels = [
    { label: t('welcome.step2Critical'), pct: 68, color: '#f87171', active: true },
    { label: t('welcome.step2High'),     pct: 45, color: '#fb923c', active: false },
    { label: t('welcome.step2Medium'),   pct: 22, color: '#fbbf24', active: false },
    { label: t('welcome.step2Low'),      pct: 6,  color: '#4ade80', active: false },
  ]

  return (
    <div className="w-full max-w-xs mx-auto mt-3 space-y-2">
      <p className="text-[11px] font-mono text-text-muted text-center mb-2">
        {t('welcome.step2ScoreLabel')}
      </p>
      {levels.map(({ label, pct, color, active }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="text-[10px] w-28 text-right shrink-0 font-medium"
            style={{ color: active ? color : undefined }}
          >
            {label}
          </span>
          {(() => {
            const N = 20, DR = 2, DG = 5
            const filled = Math.max(1, Math.round((pct / 100) * N))
            return (
              <svg viewBox={`0 0 ${N * DG} 6`} className="flex-1" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                {Array.from({ length: N }).map((_, k) => (
                  <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                    fill={k < filled ? color : '#2d2926'}
                    fillOpacity={k < filled ? (active ? 1 : 0.35) : 1}
                  />
                ))}
              </svg>
            )
          })()}
          {active && (
            <span className="text-[10px] font-mono shrink-0" style={{ color }}>
              0.68
            </span>
          )}
        </div>
      ))}
      <p className="text-[11px] text-text-muted text-center mt-3 leading-snug italic">
        {t('welcome.step2Caveat')}
      </p>
    </div>
  )
}

// ── Step 3: Keyboard shortcut display ────────────────────────────────────────
function SearchDemo({ t }: { t: (key: string) => string }) {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  return (
    <div className="w-full max-w-xs mx-auto mt-4 space-y-4">
      {/* Shortcut badge */}
      <div className="flex items-center justify-center gap-2">
        <kbd className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background-elevated text-xs font-mono text-text-primary">
          {isMac ? (
            <Command className="h-3 w-3" />
          ) : (
            <span>Ctrl</span>
          )}
        </kbd>
        <span className="text-text-muted text-xs">+</span>
        <kbd className="px-2 py-1 rounded border border-border bg-background-elevated text-xs font-mono text-text-primary">
          K
        </kbd>
      </div>

      {/* Mock search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background-elevated/80">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <span className="text-xs text-text-muted italic">
          {t('welcome.step3SearchPlaceholder')}
        </span>
      </div>
    </div>
  )
}

// ── Step 4: 3-step investigation flow ────────────────────────────────────────
function WorkflowDemo({ t }: { t: (key: string) => string }) {
  const steps = [
    { icon: Search, label: t('welcome.step4Step1') },
    { icon: User,   label: t('welcome.step4Step2') },
    { icon: Folder, label: t('welcome.step4Step3') },
  ]

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      {steps.map(({ icon: Icon, label }, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent/10 border border-accent/20">
              <Icon className="h-4.5 w-4.5 text-accent" />
            </div>
            <span className="text-[10px] text-text-muted text-center leading-tight max-w-[60px]">
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="h-3.5 w-3.5 text-text-muted/50 mb-4 mx-0.5 shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const location = useLocation()
  const { t } = useTranslation('common')

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'
    if (!dismissed && isDashboard) {
      setOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  const currentStep = STEPS[step]
  const Icon = currentStep.icon
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent size="md" className="dark bg-[#060911] border-[#1c2238]">
        {/* Editorial header */}
        <DialogHeader className="border-b border-[#1c2238] pb-4">
          <div className="flex items-center gap-3 mb-1">
            {/* Heliocentric mark */}
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="flex-shrink-0">
              <ellipse cx="16" cy="16" rx="11" ry="3.5" stroke="#d4922a" strokeWidth="0.6" opacity="0.5" transform="rotate(-20 16 16)" fill="none"/>
              <circle cx="16" cy="16" r="4" fill="#d4922a" opacity="0.08"/>
              <circle cx="16" cy="16" r="2.8" fill="#d4922a" opacity="0.13"/>
              <circle cx="16" cy="16" r="2.2" fill="#b07c1e"/>
              <circle cx="16" cy="16" r="1.5" fill="#d4922a"/>
              <circle cx="16" cy="16" r="0.9" fill="#f0b840"/>
              <circle cx="26.3" cy="12.2" r="1.0" fill="#6d7fa8" opacity="0.8"/>
            </svg>
            <div>
              <DialogTitle className="flex items-center gap-2 leading-none">
                <span className="text-white font-black text-xl tracking-tight">RUBLI</span>
                <span className="text-[9px] font-bold text-[#d4922a] bg-[#d4922a]/15 px-1.5 py-0.5 rounded tracking-widest uppercase leading-none">v0.2.5</span>
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-[#5a6280] text-xs leading-relaxed font-mono mt-1">
            Red Unificada de Búsqueda de Licitaciones Irregulares — inteligencia procuratoria impulsada por IA
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step content */}
          <div className="flex flex-col items-center text-center py-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-sm ${currentStep.bgColor} mb-4 border border-white/5`}>
              <Icon className={`h-8 w-8 ${currentStep.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-[#e6e9f4] mb-2">
              {t(currentStep.titleKey)}
            </h3>
            <p className="text-sm text-[#5a6280] leading-relaxed max-w-md">
              {t(currentStep.descKey)}
            </p>

            {/* Step-specific visual extras */}
            {step === 1 && <RiskBarDemo t={t} />}
            {step === 2 && <SearchDemo t={t} />}
            {step === 3 && <WorkflowDemo t={t} />}
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4922a] focus-visible:ring-offset-1 focus-visible:ring-offset-[#060911] ${
                  i === step ? 'w-6 bg-[#d4922a]' : 'w-1.5 bg-[#1c2238] hover:bg-[#5a6280]/40'
                }`}
                aria-label={`Paso ${i + 1}`}
                aria-pressed={i === step}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-[#1c2238] pt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs text-[#5a6280] hover:text-[#8d97b8] hover:bg-[#131828]"
            >
              {t('welcome.skip')}
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  className="border-[#1c2238] bg-transparent text-[#8d97b8] hover:bg-[#131828] hover:text-[#e6e9f4]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {isLast ? (
                <Button
                  onClick={handleGetStarted}
                  size="sm"
                  className="bg-[#d4922a] hover:bg-[#b07c1e] text-white border-0"
                >
                  {t('welcome.getStarted')} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  size="sm"
                  className="bg-[#d4922a] hover:bg-[#b07c1e] text-white border-0"
                >
                  {t('welcome.next')} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
