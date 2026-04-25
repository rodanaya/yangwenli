import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthField, AuthErrorPill } from '@/components/auth/AuthField'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title={t('login.title')} overline={t('login.overline', { defaultValue: 'Acceso' })}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="login-email"
          label={t('login.emailLabel')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('login.emailPlaceholder')}
        />
        <AuthField
          id="login-password"
          label={t('login.passwordLabel')}
          type="password"
          autoComplete="current-password"
          required
          mono
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('login.passwordPlaceholder')}
        />

        {error && <AuthErrorPill message={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-text-muted font-mono">
        {t('login.noAccount')}{' '}
        <Link
          to="/register"
          className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
        >
          {t('login.createAccount')}
        </Link>
      </p>
    </AuthShell>
  )
}
