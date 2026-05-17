import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Search } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/explore?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-[10px] font-mono font-semibold tracking-[0.18em] uppercase text-text-muted">
        {t('notFound.code')}
      </p>

      {/* Outlined 404 — accent moment without flat-ink shout */}
      <div
        aria-hidden="true"
        className="font-mono text-[7rem] sm:text-[9rem] leading-none font-bold select-none"
        style={{
          WebkitTextStroke: '1.5px var(--color-accent)',
          color: 'transparent',
        }}
      >
        404
      </div>

      <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-text-primary leading-tight max-w-xl">
        {t('notFound.title')}
      </h1>
      <p className="text-base text-text-secondary max-w-md leading-relaxed">
        {t('notFound.description')}
      </p>

      {/* Inline search — perfect editorial moment for vendor/institution lookup */}
      <form onSubmit={handleSearch} className="w-full max-w-md mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('notFound.searchPlaceholder')}
            className="w-full rounded-sm border border-border bg-background-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label={t('notFound.searchPlaceholder')}
          />
        </div>
        <button
          type="submit"
          className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          disabled={!query.trim()}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('notFound.searchPlaceholder')}</span>
        </button>
      </form>

      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-sm border border-border text-sm font-semibold text-text-secondary hover:bg-background-elevated hover:border-border-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backHome')}
        </button>
        <button
          onClick={() => navigate('/journalists')}
          className="flex items-center gap-2 px-4 py-2 rounded-sm bg-text-primary text-background text-sm font-semibold hover:bg-text-secondary transition-colors"
        >
          {t('notFound.viewInvestigations')}
        </button>
      </div>
    </div>
  )
}
