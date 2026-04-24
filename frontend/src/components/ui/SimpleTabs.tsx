/**
 * SimpleTabs — lightweight accessible tab component.
 *
 * ARIA-compliant: role=tablist/tab/tabpanel, aria-selected, aria-controls,
 * aria-labelledby, roving tabindex, Arrow/Home/End keyboard navigation.
 *
 * Supports both controlled (active + onTabChange) and uncontrolled (defaultTab) usage.
 * Replaces the local SimpleTabs implementations in VendorProfile and InstitutionProfile.
 */

import { useState, useRef, useCallback, type ReactElement, type KeyboardEvent } from 'react'

export interface TabDef {
  key: string
  label: string
  icon?: React.ElementType
  /** Optional badge count shown next to label */
  badge?: number
}

interface SimpleTabsProps {
  tabs: TabDef[]
  /** Uncontrolled: initial active tab key */
  defaultTab?: string
  /** Controlled: active tab key (takes priority over defaultTab) */
  active?: string
  /** Called whenever the active tab changes */
  onTabChange?: (key: string) => void
  /** Render TabPanel children */
  children: ReactElement | ReactElement[]
  className?: string
}

export function SimpleTabs({
  tabs,
  defaultTab,
  active: controlledActive,
  onTabChange,
  children,
  className = '',
}: SimpleTabsProps) {
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.key ?? '')
  const tablistRef = useRef<HTMLDivElement>(null)

  // If `active` prop is provided, use controlled mode; otherwise use internal state
  const active = controlledActive ?? internalActive

  function handleTabChange(key: string) {
    if (controlledActive === undefined) setInternalActive(key)
    onTabChange?.(key)
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      if (!buttons) return
      const count = buttons.length

      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % count
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + count) % count
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = count - 1

      if (nextIndex !== null) {
        e.preventDefault()
        const tab = tabs[nextIndex]
        handleTabChange(tab.key)
        buttons[nextIndex].focus()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabs, controlledActive]
  )

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        ref={tablistRef}
        role="tablist"
        className="flex gap-1 border-b border-border mb-6 overflow-x-auto"
      >
        {tabs.map((tab, i) => {
          const Icon = tab.icon
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.key)}
              onKeyDown={e => handleKeyDown(e, i)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                isActive
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-background-elevated/30'
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-background-elevated text-text-secondary text-[10px] leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      {Array.isArray(children)
        ? (children as ReactElement[]).find(c => (c?.props as { tabKey?: string })?.tabKey === active)
        : children}
    </div>
  )
}

/**
 * Slot marker — wrap each tab's content in this.
 * The `tabKey` prop is read by SimpleTabs to match the correct panel.
 */
export function TabPanel({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${tabKey}`} aria-labelledby={`tab-${tabKey}`}>
      {children}
    </div>
  )
}
