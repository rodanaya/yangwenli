/**
 * WayfindingSpine — the dossier-top "El Hilo" chrome (P1+).
 *
 * Replaces the old hardcoded `navigate(-1)` "Volver a ARIA" link (wrong for
 * ~99% of arrivals, which come from the index) with:
 *  - a context-aware back link that returns to the exact filtered/sorted list,
 *  - a Prev/Next sibling stepper honouring the active sort,
 *  - an "N / M" positional readout.
 *
 * When out of context (deep link / cold arrival) the back link still works via
 * the supplied fallback and the stepper renders disabled with a tooltip —
 * never a broken control.
 *
 * P2 (cross-entity origin): when an `origin` is supplied — stamped onto the
 * link state by an EntityIdentityChip inside another dossier — the back link
 * becomes entity-primary ("← Volver a Salud") and wins over the list fallback.
 * The stepper stays keyed on the published sibling list (open-Q1 decision).
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DossierOrigin, WayfindingNav } from '@/lib/nav/wayfinding'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const LINK_CLS =
  'inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary font-mono uppercase tracking-widest transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'

export function WayfindingSpine({
  nav,
  lang,
  accent,
  origin,
  showStepper = true,
  className,
}: {
  nav: WayfindingNav
  lang: 'en' | 'es'
  /** Sector/entity accent hex for the positional readout rule. */
  accent?: string
  /** Cross-entity arrival (El Hilo P2): back link targets this dossier instead of the list. */
  origin?: DossierOrigin | null
  /** Hide the sibling stepper on dossiers with no index that publishes a list (e.g. vendors). */
  showStepper?: boolean
  className?: string
}) {
  const backTo = origin?.route ?? nav.backTo
  const backText = `${lang === 'es' ? 'Volver a' : 'Back to'} ${origin?.label ?? nav.backLabel}`
  const prevLabel = lang === 'es' ? 'Anterior' : 'Previous'
  const nextLabel = lang === 'es' ? 'Siguiente' : 'Next'
  const openIndexHint =
    lang === 'es'
      ? 'Abre el índice para recorrer la lista'
      : 'Open the index to step through the list'

  return (
    <nav
      aria-label={lang === 'es' ? 'Navegación de lista' : 'List navigation'}
      className={`flex items-center justify-between gap-4 mb-4 ${className ?? ''}`}
    >
      <Link to={backTo} className={LINK_CLS}>
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        {backText}
      </Link>

      {!showStepper ? null : nav.hasContext ? (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <StepperButton
            to={nav.prevTo}
            label={prevLabel}
            icon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <span
            className="text-[11px] font-mono tabular-nums text-text-muted tracking-wider"
            aria-label={
              lang === 'es'
                ? `Posición ${nav.index} de ${nav.total}`
                : `Position ${nav.index} of ${nav.total}`
            }
          >
            <span className="text-text-primary" style={accent ? { color: accent } : undefined}>
              {nav.index}
            </span>
            <span className="px-1 text-text-muted/60">/</span>
            {nav.total}
          </span>
          <StepperButton
            to={nav.nextTo}
            label={nextLabel}
            icon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          />
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="flex items-center gap-2.5 flex-shrink-0 text-text-muted/40 cursor-default"
              aria-disabled="true"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[11px] font-mono tracking-wider select-none">— / —</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{openIndexHint}</TooltipContent>
        </Tooltip>
      )}
    </nav>
  )
}

function StepperButton({
  to,
  label,
  icon,
}: {
  to: string | null
  label: string
  icon: React.ReactNode
}) {
  if (!to) {
    return (
      <span
        className="inline-flex items-center justify-center h-6 w-6 rounded-sm text-text-muted/30 cursor-default"
        aria-disabled="true"
        aria-label={label}
      >
        {icon}
      </span>
    )
  }
  return (
    <Link
      to={to}
      aria-label={label}
      className="inline-flex items-center justify-center h-6 w-6 rounded-sm text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {icon}
    </Link>
  )
}
