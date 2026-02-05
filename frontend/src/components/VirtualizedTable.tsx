import React, { useRef, memo, type ReactNode, type CSSProperties } from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { Card, CardContent } from '@/components/ui/card'

interface Column<T> {
  id: string
  header: ReactNode
  accessor: keyof T | ((row: T) => ReactNode)
  width?: number | string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface VirtualizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowHeight?: number
  height?: number | string
  overscan?: number
  getRowKey: (row: T, index: number) => string | number
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

/**
 * High-performance virtualized table component using @tanstack/react-virtual.
 * Only renders visible rows plus overscan, enabling 60fps scrolling for massive datasets.
 *
 * @example
 * ```tsx
 * <VirtualizedTable
 *   data={contracts}
 *   columns={[
 *     { id: 'title', header: 'Title', accessor: 'title' },
 *     { id: 'amount', header: 'Amount', accessor: (row) => formatMXN(row.amount), align: 'right' },
 *   ]}
 *   getRowKey={(row) => row.id}
 *   height={600}
 * />
 * ```
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  height = 600,
  overscan = 10,
  getRowKey,
  onRowClick,
  emptyMessage = 'No data available',
  className,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-text-muted">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background-card">
          <div className="flex">
            {columns.map((col) => (
              <div
                key={col.id}
                className={`p-3 text-xs font-medium text-text-muted ${col.className || ''}`}
                style={{
                  width: col.width,
                  minWidth: col.minWidth,
                  flex: col.width ? undefined : 1,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </div>
            ))}
          </div>
        </div>

        {/* Virtualized body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = data[virtualRow.index]
              const key = getRowKey(row, virtualRow.index)

              return (
                <VirtualizedRow
                  key={key}
                  virtualRow={virtualRow}
                  row={row}
                  columns={columns}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                />
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface VirtualizedRowProps<T> {
  virtualRow: VirtualItem
  row: T
  columns: Column<T>[]
  onClick?: () => void
}

const VirtualizedRow = memo(function VirtualizedRow<T>({
  virtualRow,
  row,
  columns,
  onClick,
}: VirtualizedRowProps<T>) {
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: `${virtualRow.size}px`,
    transform: `translateY(${virtualRow.start}px)`,
  }

  return (
    <div
      style={style}
      className={`flex border-b border-border ${onClick ? 'cursor-pointer hover:bg-background-elevated/50' : ''} transition-colors`}
      onClick={onClick}
    >
      {columns.map((col) => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]

        return (
          <div
            key={col.id}
            className={`p-3 text-sm ${col.className || ''}`}
            style={{
              width: col.width,
              minWidth: col.minWidth,
              flex: col.width ? undefined : 1,
              textAlign: col.align || 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value as ReactNode}
          </div>
        )
      })}
    </div>
  )
}) as <T>(props: VirtualizedRowProps<T>) => React.JSX.Element

/**
 * Simpler virtualized list for non-tabular data
 */
interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  itemHeight: number
  height: number | string
  overscan?: number
  getKey: (item: T, index: number) => string | number
  className?: string
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  overscan = 5,
  getKey,
  className,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className || ''}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]
          const key = getKey(item, virtualRow.index)

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualizedTable
