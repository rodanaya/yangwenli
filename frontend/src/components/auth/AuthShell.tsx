/**
 * AuthShell — shared masthead + card wrapper for Login and Register pages.
 *
 * Replaces the duplicated masthead block (RUBLI logo + serif name + tagline)
 * and outer card layout that was copy-pasted between LoginPage and RegisterPage.
 * Single source of truth for the editorial auth screen treatment.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface AuthShellProps {
  /** Card title rendered as the form heading. */
  title: string
  /** Card body — form + footer link. */
  children: ReactNode
  /** Optional small section overline above the card title. */
  overline?: string
}

export function AuthShell({ title, children, overline }: AuthShellProps) {
  const { t } = useTranslation('auth')
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Masthead */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <RubliMark />
          </div>
          <h1
            className="text-2xl font-bold text-text-primary tracking-tight font-editorial"
          >
            RUBLI
          </h1>
          <p className="mt-1 text-[10px] text-text-muted tracking-[0.14em] uppercase font-mono">
            {t('tagline')}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-sm border border-border bg-background-elevated p-6 shadow-sm">
          {overline && (
            <p className="text-[10px] font-mono font-semibold tracking-[0.15em] uppercase text-text-muted mb-2">
              {overline}
            </p>
          )}
          <h2 className="text-base font-semibold text-text-primary mb-5 tracking-tight font-editorial">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}

function RubliMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <line x1="2" y1="23" x2="11" y2="23" stroke="var(--color-text-primary)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="21" y1="23" x2="30" y2="23" stroke="var(--color-text-primary)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="5" r="8" fill="var(--color-risk-critical)" opacity="0.10" />
      <circle cx="16" cy="5" r="5" fill="var(--color-risk-critical)" opacity="0.10" />
      <polyline points="11,23 16,5 21,23" stroke="var(--color-risk-critical)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="miter" />
      <circle cx="16" cy="5" r="2.4" fill="var(--color-risk-critical)" />
      <circle cx="15.2" cy="4.3" r="0.9" fill="#fda4af" opacity="0.85" />
    </svg>
  )
}
