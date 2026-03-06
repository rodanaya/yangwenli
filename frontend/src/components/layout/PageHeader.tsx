import React from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

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
}

export function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden mb-6 pb-5 border-b border-border/30">
      {/* Subtle radial background */}
      <div className="before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_left,var(--color-accent)/4%,transparent_60%)] before:pointer-events-none pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Version chip */}
      <span className="absolute top-0 right-0 text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/20 bg-accent/10 text-accent">
        v1.1
      </span>

      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2 text-[11px] text-text-muted/60">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              {item.href ? (
                <NavLink
                  to={item.href}
                  className="hover:text-text-muted transition-colors"
                >
                  {item.label}
                </NavLink>
              ) : (
                <span>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center gap-3">
        {/* Left accent bar */}
        <div className="w-[3px] h-7 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]" aria-hidden="true" />

        {Icon && <Icon className="h-6 w-6 text-accent opacity-80" aria-hidden="true" />}

        <h1 className="text-xl font-bold text-text-primary tracking-tight">{title}</h1>

        {actions && <div className="ml-auto">{actions}</div>}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1.5 ml-4 text-sm text-text-muted max-w-2xl">{subtitle}</p>
      )}
    </div>
  )
}
