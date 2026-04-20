import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      await register(email, password, name)
      navigate('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Masthead */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <line x1="2" y1="23" x2="11" y2="23" stroke="#2e2926" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="21" y1="23" x2="30" y2="23" stroke="#2e2926" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="16" cy="5" r="8" fill="#dc2626" opacity="0.10"/>
              <circle cx="16" cy="5" r="5" fill="#dc2626" opacity="0.10"/>
              <polyline points="11,23 16,5 21,23" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="miter"/>
              <circle cx="16" cy="5" r="2.4" fill="#dc2626"/>
              <circle cx="15.2" cy="4.3" r="0.9" fill="#fda4af" opacity="0.85"/>
            </svg>
          </div>
          <h1
            className="text-2xl font-bold text-zinc-100 tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)' }}
          >
            RUBLI
          </h1>
          <p className="mt-1 text-[10px] text-zinc-500 tracking-[0.14em] uppercase font-mono">
            Red Unificada de Búsqueda de Licitaciones Irregulares
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-5 tracking-tight">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-[11px] font-mono tracking-[0.08em] uppercase text-zinc-500 mb-1.5"
              >
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Ana García"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-[11px] font-mono tracking-[0.08em] uppercase text-zinc-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-[11px] font-mono tracking-[0.08em] uppercase text-zinc-500 mb-1.5"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm"
                className="block text-[11px] font-mono tracking-[0.08em] uppercase text-zinc-500 mb-1.5"
              >
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-red-950/50 border border-red-900/60 px-3 py-2 text-xs text-red-400 font-mono"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-600 font-mono">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
