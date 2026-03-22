/**
 * ResponsibleUseNotice — responsible use statement for vendor/investigation pages.
 * Reminds users that risk scores are statistical indicators, not verdicts.
 */

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ResponsibleUseNoticeProps {
  className?: string
}

export function ResponsibleUseNotice({ className }: ResponsibleUseNoticeProps) {
  return (
    <aside
      aria-label="Responsible use notice"
      className={cn(
        'border-l-2 border-amber-500/50 bg-amber-950/10 px-4 py-3 text-xs text-stone-500',
        className
      )}
    >
      <span className="font-medium text-stone-400">
        Risk scores are statistical indicators, not verdicts.
      </span>{' '}
      High scores do not constitute proof of wrongdoing. Scores should not be used as the sole
      basis for excluding vendors from procurement.{' '}
      <a
        href="mailto:rubli@contact.com?subject=Data+Dispute"
        className="underline underline-offset-2 hover:text-stone-300 transition-colors"
      >
        Dispute or correct data
      </a>
      {' '}·{' '}
      <Link
        to="/methodology"
        className="underline underline-offset-2 hover:text-stone-300 transition-colors"
      >
        Methodology
      </Link>
    </aside>
  )
}

export default ResponsibleUseNotice
