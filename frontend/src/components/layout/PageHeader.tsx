import React from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ElementType
  actions?: React.ReactNode
  breadcrumb?: BreadcrumbItem[]
  label?: string        // e.g. "PANORAMA NACIONAL" — editorial section label
  serif?: boolean       // use Playfair Display for title
}

export function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb, label, serif }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8"
    >
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-3 text-[11px] text-text-muted/60">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              {item.href ? (
                <NavLink to={item.href} className="hover:text-text-muted transition-colors">
                  {item.label}
                </NavLink>
              ) : (
                <span>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Editorial label */}
      {label && (
        <div className="editorial-rule mb-3">
          <span className="editorial-label text-accent">{label}</span>
        </div>
      )}

      {/* Title + actions row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Crimson accent bar */}
          <div className="w-[3px] min-h-[2rem] mt-0.5 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {Icon && <Icon className="h-5 w-5 text-accent opacity-75 flex-shrink-0" aria-hidden="true" />}
              <h1 className={`text-2xl font-bold text-text-primary tracking-tight leading-tight ${serif ? 'font-editorial' : ''}`}>
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-text-muted max-w-2xl leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex-shrink-0 mt-0.5">{actions}</div>
        )}
      </div>
    </motion.div>
  )
}
