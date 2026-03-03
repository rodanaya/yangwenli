/**
 * WorkspaceJournalistGuide
 *
 * Shown in the Workspace when a journalist has no dossiers yet.
 * Replaces the generic empty state with a step-by-step onboarding
 * guide explaining how to use the dossier investigation workflow.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderPlus, Download, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WorkspaceJournalistGuideProps {
  onCreateDossier: () => void
  className?: string
}

interface Step {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    icon: Search,
    title: '1. Search',
    description: 'Find vendors, institutions, or contracts of interest',
  },
  {
    icon: FolderPlus,
    title: '2. Add to dossier',
    description: 'Save relevant entities to a named investigation folder',
  },
  {
    icon: Download,
    title: '3. Analyze & export',
    description: 'Review patterns, risk scores, and export evidence',
  },
]

const EXAMPLE_INVESTIGATIONS = [
  'Track a contractor across multiple agencies over several years',
  'Compare risk scores for contracts awarded before vs. after elections',
  'Build evidence for a story on single-bid awards in the health sector',
]

export default function WorkspaceJournalistGuide({
  onCreateDossier,
  className,
}: WorkspaceJournalistGuideProps) {
  const navigate = useNavigate()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center max-w-2xl mx-auto',
        className
      )}
    >
      {/* Title */}
      <h2 className="text-2xl font-semibold text-text-primary mb-2">
        Start Your Investigation
      </h2>

      {/* Description */}
      <p className="text-text-secondary mb-8 max-w-md leading-relaxed">
        Use dossiers to organize your investigation. Add vendors, institutions,
        and contracts to build a complete picture of procurement patterns.
      </p>

      {/* 3-step workflow */}
      <div
        className="flex flex-col sm:flex-row items-center gap-2 mb-8 w-full justify-center"
        role="list"
        aria-label="Investigation workflow steps"
      >
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              className="flex sm:flex-col items-center gap-2 sm:gap-0 w-full sm:w-auto"
              role="listitem"
            >
              <div className="bg-background-elevated rounded p-3 text-center flex-1 sm:flex-none sm:w-36">
                <Icon
                  className="h-6 w-6 mx-auto mb-2 text-accent"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-text-primary leading-tight">
                  {step.title}
                </p>
                <p className="text-xs text-text-secondary mt-1 leading-snug">
                  {step.description}
                </p>
              </div>

              {/* Arrow separator — hidden after last step */}
              {index < STEPS.length - 1 && (
                <ChevronRight
                  className="h-4 w-4 text-text-muted shrink-0 sm:mt-2 rotate-90 sm:rotate-0"
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Primary CTA */}
      <Button
        variant="default"
        size="lg"
        onClick={onCreateDossier}
        aria-label="Create your first dossier to begin investigating"
      >
        <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
        Create First Dossier
      </Button>

      {/* Secondary link */}
      <button
        type="button"
        onClick={() => navigate('/explore?tab=vendors')}
        className="mt-4 text-sm text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
      >
        Or search for a vendor to start{' '}
        <ChevronRight className="inline h-3 w-3" aria-hidden="true" />
      </button>

      {/* Example investigations */}
      <Card className="mt-10 w-full text-left">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Example investigations
          </p>
          <ul className="space-y-1.5" aria-label="Example investigation ideas">
            {EXAMPLE_INVESTIGATIONS.map((example) => (
              <li
                key={example}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {example}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Expandable "How it works" section */}
      <button
        type="button"
        onClick={() => setHowItWorksOpen((prev) => !prev)}
        className="mt-6 flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
        aria-expanded={howItWorksOpen}
        aria-controls="how-it-works-panel"
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', {
            'rotate-180': howItWorksOpen,
          })}
          aria-hidden="true"
        />
        How it works
      </button>

      {howItWorksOpen && (
        <div
          id="how-it-works-panel"
          className="mt-4 w-full text-left bg-background-elevated rounded-lg p-4 text-sm text-text-secondary space-y-2"
        >
          <p>
            <span className="font-medium text-text-primary">Dossiers</span> are
            private investigation folders that live in your browser. Each dossier
            can hold any mix of vendors, institutions, and individual contracts.
          </p>
          <p>
            Use the{' '}
            <span className="font-medium text-text-primary">Add to Dossier</span>{' '}
            button on any vendor or institution profile page to start collecting
            evidence. Dossiers persist between sessions so you can return to an
            investigation later.
          </p>
          <p>
            When you are ready to publish or share,{' '}
            <span className="font-medium text-text-primary">Export</span> your
            dossier as a CSV or structured JSON file containing all collected
            entities and their risk metadata.
          </p>
        </div>
      )}
    </div>
  )
}
