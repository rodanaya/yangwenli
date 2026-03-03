import { useState } from 'react'
import { Code2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface JsonExportButtonProps {
  data: Record<string, unknown>[]
  filename?: string
  label?: string
  className?: string
  disabled?: boolean
}

type ExportState = 'idle' | 'loading' | 'done'

export function JsonExportButton({
  data,
  filename = 'export',
  label,
  className,
  disabled,
}: JsonExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle')

  const isEmpty = !data.length
  const isDisabled = disabled || isEmpty || state === 'loading'

  const handleDownload = async () => {
    if (isDisabled) return
    setState('loading')

    // Yield to the render cycle so the spinner appears before the synchronous JSON work
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${filename}.json`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)

    setState('done')
    setTimeout(() => setState('idle'), 2000)
  }

  const icon =
    state === 'loading' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : state === 'done' ? (
      <Check className="h-3.5 w-3.5 text-emerald-400" />
    ) : (
      <Code2 className="h-3.5 w-3.5" />
    )

  const buttonContent = (
    <>
      {icon}
      {label && (
        <span className="ml-1 text-xs">
          {state === 'done' ? 'Downloaded' : label}
        </span>
      )}
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={label ? 'sm' : 'icon'}
          className={`${label ? 'h-7 px-2' : 'h-7 w-7'} ${className ?? ''}`}
          onClick={handleDownload}
          disabled={isDisabled}
          aria-label="Export as JSON"
        >
          {buttonContent}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isEmpty
            ? 'No data to export'
            : state === 'done'
            ? '✓ Downloaded'
            : 'Download as JSON'}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
