import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-[10px] font-mono font-semibold tracking-[0.15em] uppercase text-text-muted">
        {t('notFound.code')}
      </p>
      <div className="font-mono text-text-primary text-[8rem] leading-none font-bold select-none">
        404
      </div>
      <h1 className="text-2xl font-bold text-text-primary">
        {t('notFound.title')}
      </h1>
      <p className="text-base text-text-secondary max-w-md">
        {t('notFound.description')}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-text-primary text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backHome')}
        </button>
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-semibold text-text-secondary hover:bg-background-elevated hover:border-border transition-colors"
        >
          {t('notFound.viewContracts')}
        </button>
      </div>
    </div>
  )
}
