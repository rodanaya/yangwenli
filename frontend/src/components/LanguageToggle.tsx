import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

export function LanguageToggle() {
  const { i18n } = useTranslation()

  const toggle = () => {
    const next = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5 text-xs"
      title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <Languages className="h-3.5 w-3.5" />
      {i18n.language === 'es' ? 'EN' : 'ES'}
    </Button>
  )
}
