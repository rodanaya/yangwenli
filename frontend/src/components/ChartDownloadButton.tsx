import { useState } from 'react'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ChartDownloadButtonProps {
  targetRef: React.RefObject<HTMLDivElement>
  filename?: string
  className?: string
}

export function ChartDownloadButton({ targetRef, filename = 'chart', className }: ChartDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (!targetRef.current) return
    setLoading(true)
    try {
      const dataUrl = await toPng(targetRef.current, { cacheBust: true, backgroundColor: '#0f172a' })
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 opacity-50 hover:opacity-100 transition-opacity ${className ?? ''}`}
          onClick={handleDownload}
          disabled={loading}
          aria-label="Download chart as PNG"
        >
          <Download className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent><p className="text-xs">Download PNG</p></TooltipContent>
    </Tooltip>
  )
}
