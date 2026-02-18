import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setOpen(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
    navigate('/executive')
  }

  const currentStep = STEPS[step]
  const Icon = currentStep.icon
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
              RUBLI
            </span>
          </DialogTitle>
          <DialogDescription>
            {t('welcome.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step content */}
          <div className="flex flex-col items-center text-center py-6">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${currentStep.bgColor} mb-4`}>
              <Icon className={`h-8 w-8 ${currentStep.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t(currentStep.titleKey)}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed max-w-md">
              {t(currentStep.descKey)}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border hover:bg-text-muted/40'
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs text-text-muted"
            >
              {t('welcome.skip')}
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {isLast ? (
                <Button onClick={handleGetStarted} size="sm">
                  {t('welcome.getStarted')} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)} size="sm">
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
