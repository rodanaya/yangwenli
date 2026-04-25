import { useTranslation } from 'react-i18next'
import { ScrollReveal } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'

interface ChapterBannerProps {
  number: number
  title: string
  subtitle?: string
  era?: string
  color?: string
  className?: string
}

export default function ChapterBanner({
  number,
  title,
  subtitle,
  era,
  color = 'var(--color-sector-salud)',
  className,
}: ChapterBannerProps) {
  const { t } = useTranslation('common')
  const paddedNumber = String(number).padStart(2, '0')

  return (
    <ScrollReveal className={cn('my-12', className)}>
      <div
        className="relative w-full bg-background overflow-hidden rounded-lg"
        style={{ borderTop: `2px solid ${color}` }}
        role="heading"
        aria-level={2}
        aria-label={`${t('storyType.chapter', 'Chapter')} ${paddedNumber}: ${title}`}
      >
        {/* Large background number */}
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[10rem] md:text-[14rem] font-bold font-mono leading-none select-none pointer-events-none"
          style={{ color, opacity: 0.06 }}
          aria-hidden="true"
        >
          {paddedNumber}
        </span>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-8 md:py-12">
          <div className="space-y-2">
            <p
              className="text-[11px] uppercase tracking-[0.2em] font-semibold"
              style={{ color }}
            >
              {t('storyType.chapter', 'Chapter')} {paddedNumber}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-text-primary leading-tight max-w-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm md:text-base text-text-secondary max-w-xl">
                {subtitle}
              </p>
            )}
          </div>

          {era && (
            <span
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border shrink-0"
              style={{
                borderColor: color,
                color,
                backgroundColor: `${color}10`,
              }}
            >
              {era}
            </span>
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}
