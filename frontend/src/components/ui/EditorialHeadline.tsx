import { cn } from '@/lib/utils'

interface EditorialHeadlineProps {
  section: string
  headline: string
  subtitle?: string
  className?: string
}

export function EditorialHeadline({ section, headline, subtitle, className }: EditorialHeadlineProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="h-px bg-border" />
      <div className="py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {section}
        </span>
        <h1
          className="mt-2 text-3xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {headline}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base text-text-secondary font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="h-px bg-border" />
    </div>
  )
}

export default EditorialHeadline
