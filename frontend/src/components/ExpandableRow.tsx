/**
 * ExpandableRow
 * Table row that expands inline to show detail content.
 * Supports smooth CSS transitions and max 5 simultaneously expanded rows.
 */

import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

// ============================================================================
// Context to track expanded rows (max 5)
// ============================================================================

interface ExpandableContextValue {
  expandedIds: Set<string | number>
  toggle: (id: string | number) => void
  isExpanded: (id: string | number) => boolean
}

const ExpandableContext = createContext<ExpandableContextValue | null>(null)

interface ExpandableProviderProps {
  maxExpanded?: number
  children: React.ReactNode
}

export function ExpandableProvider({ maxExpanded = 5, children }: ExpandableProviderProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set())

  const toggle = useCallback((id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // Enforce max expanded limit — remove oldest if at capacity
        if (next.size >= maxExpanded) {
          const first = next.values().next().value
          if (first !== undefined) next.delete(first)
        }
        next.add(id)
      }
      return next
    })
  }, [maxExpanded])

  const isExpanded = useCallback((id: string | number) => {
    return expandedIds.has(id)
  }, [expandedIds])

  return (
    <ExpandableContext.Provider value={{ expandedIds, toggle, isExpanded }}>
      {children}
    </ExpandableContext.Provider>
  )
}

export function useExpandable() {
  const ctx = useContext(ExpandableContext)
  if (!ctx) {
    throw new Error('useExpandable must be used within an ExpandableProvider')
  }
  return ctx
}

// ============================================================================
// ExpandableRow Component
// ============================================================================

interface ExpandableRowProps {
  id: string | number
  /** The main row content (table cells) */
  cells: React.ReactNode
  /** The expanded detail content */
  detail: React.ReactNode
  /** Number of columns for the detail row's colspan */
  colSpan: number
  className?: string
  onClick?: () => void
}

export function ExpandableRow({
  id,
  cells,
  detail,
  colSpan,
  className,
  onClick,
}: ExpandableRowProps) {
  const { toggle, isExpanded } = useExpandable()
  const expanded = isExpanded(id)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    } else {
      setHeight(0)
    }
  }, [expanded])

  const handleClick = () => {
    toggle(id)
    onClick?.()
  }

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer transition-colors hover:bg-background-elevated/50',
          expanded && 'bg-background-elevated/30',
          className,
        )}
        onClick={handleClick}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {cells}
      </tr>
      <tr
        className={cn(
          'transition-all duration-200 ease-in-out',
          !expanded && 'invisible',
        )}
        aria-hidden={!expanded}
      >
        <td colSpan={colSpan} className="p-0 border-b border-border">
          <div
            style={{
              maxHeight: expanded ? `${Math.max(height, 500)}px` : '0px',
              opacity: expanded ? 1 : 0,
            }}
            className="overflow-hidden transition-all duration-200 ease-in-out"
          >
            <div ref={contentRef} className="p-4 bg-background-elevated/20">
              {detail}
            </div>
          </div>
        </td>
      </tr>
    </>
  )
}

// ============================================================================
// Expand Chevron indicator
// ============================================================================

export function ExpandChevron({ id }: { id: string | number }) {
  const { isExpanded } = useExpandable()
  const expanded = isExpanded(id)

  return (
    <ChevronRight
      className={cn(
        'h-4 w-4 text-text-muted transition-transform duration-200',
        expanded && 'rotate-90',
      )}
      aria-hidden="true"
    />
  )
}
