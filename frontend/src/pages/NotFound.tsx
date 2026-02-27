import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileSearch, ArrowLeft } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <FileSearch className="h-12 w-12 text-text-muted mb-4" />
      <p className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
        {t('notFound.code')}
      </p>
      <h1 className="text-3xl font-black text-text-primary">
        {t('notFound.title')}
      </h1>
      <p className="text-sm text-text-muted max-w-md">
        {t('notFound.description')}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backHome')}
        </button>
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
        >
          {t('notFound.viewContracts')}
        </button>
      </div>
    </div>
  )
}
