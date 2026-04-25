/**
 * AuthField — labeled input matching the editorial auth-form treatment.
 *
 * Replaces 8 near-identical label+input blocks across LoginPage/RegisterPage.
 * Defaults to sans serif (font-mono only on password fields per editorial
 * guidance — emails are read normally, tokens are read precisely).
 */
import { type InputHTMLAttributes } from 'react'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label, rendered as a uppercase mono caption. */
  label: string
  /** Field id (also htmlFor target). */
  id: string
  /** Use mono font in the input value (e.g. for password tokens). Default false. */
  mono?: boolean
}

export function AuthField({
  label,
  id,
  mono = false,
  className,
  ...inputProps
}: AuthFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-mono tracking-[0.08em] uppercase text-text-muted mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors ${
          mono ? 'font-mono' : 'font-sans'
        } ${className ?? ''}`}
        {...inputProps}
      />
    </div>
  )
}

/**
 * AuthErrorPill — editorial error display with a left bar instead of dark
 * mode wash. Replaces the `bg-risk-critical/10/50 border-red-900/60 text-risk-critical`
 * pill that washes out on cream.
 */
export function AuthErrorPill({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-l-4 px-3 py-2 text-xs font-mono"
      style={{
        borderColor: 'var(--color-risk-critical)',
        backgroundColor: 'color-mix(in srgb, var(--color-risk-critical) 8%, transparent)',
        color: 'var(--color-text-primary)',
      }}
    >
      {message}
    </p>
  )
}
