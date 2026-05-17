import { shortenContractName } from '@/lib/utils'

interface TruncatedNameProps {
  name: string
  maxChars?: number
  className?: string
  isContract?: boolean
}

export function TruncatedName({ name, maxChars = 60, className, isContract }: TruncatedNameProps) {
  const display = isContract ? shortenContractName(name, maxChars) : name
  const isTruncated = display.length < name.length || display.endsWith('…')
  if (!isTruncated) return <span className={className}>{display}</span>
  return (
    <span className={className} title={name} style={{ cursor: 'help' }}>
      {display}
    </span>
  )
}
