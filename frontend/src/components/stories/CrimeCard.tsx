import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Ghost,
  Gavel,
  TrendingUp,
  Users,
  Building2,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'

interface CrimeCardProps {
  caseName: string
  caseType: string
  estimatedFraudBn?: number
  yearRange: string
  vendorCount?: number
  era?: string
  caseId?: number
  onClick?: () => void
  className?: string
}

const CASE_TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  ghost_company: { icon: Ghost, color: '#dc2626', label: 'Empresa fantasma' },
  bid_rigging: { icon: Gavel, color: '#ea580c', label: 'Colusion' },
  overpricing: { icon: TrendingUp, color: '#eab308', label: 'Sobreprecio' },
  monopoly: { icon: Building2, color: '#8b5cf6', label: 'Monopolio' },
  procurement_fraud: { icon: ShieldAlert, color: '#f97316', label: 'Fraude' },
  conflict_of_interest: { icon: Users, color: '#3b82f6', label: 'Conflicto' },
  bribery: { icon: ShieldAlert, color: '#be123c', label: 'Soborno' },
}

const DEFAULT_CONFIG = { icon: ShieldAlert, color: '#64748b', label: 'Irregularidad' }

export default function CrimeCard({
  caseName,
  caseType,
  estimatedFraudBn,
  yearRange,
  vendorCount,
  era,
  caseId,
  onClick,
  className,
}: CrimeCardProps) {
  const navigate = useNavigate()
  const config = CASE_TYPE_CONFIG[caseType] || DEFAULT_CONFIG
  const IconComponent = config.icon

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (caseId) {
      navigate(`/cases/${caseId}`)
    }
  }

  const isClickable = !!(onClick || caseId)

  return (
    <motion.div
      whileHover={isClickable ? { scale: 1.01, y: -1 } : undefined}
      whileTap={isClickable ? { scale: 0.99 } : undefined}
      className={cn(
        'group relative flex items-center gap-4 rounded-lg bg-zinc-900/60 px-4 py-3 transition-all duration-200',
        isClickable && 'cursor-pointer hover:bg-zinc-800/80 hover:shadow-lg',
        className
      )}
      style={{
        borderLeft: `3px solid ${config.color}`,
        boxShadow: 'none',
      }}
      onClick={handleClick}
      role={isClickable ? 'button' : 'article'}
      aria-label={`Caso: ${caseName}, ${yearRange}${estimatedFraudBn ? `, fraude estimado ${estimatedFraudBn}B MXN` : ''}`}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Type icon/badge */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-md shrink-0"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <IconComponent size={18} style={{ color: config.color }} aria-hidden="true" />
      </div>

      {/* Center info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-zinc-100 truncate">{caseName}</h4>
          {era && (
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium shrink-0">
              {era}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            {config.label}
          </span>
          <span className="tabular-nums">{yearRange}</span>
          {vendorCount !== undefined && (
            <span>{vendorCount} proveedor{vendorCount !== 1 ? 'es' : ''}</span>
          )}
        </div>
      </div>

      {/* Fraud amount */}
      {estimatedFraudBn !== undefined && (
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-red-400 tabular-nums leading-tight">
            {estimatedFraudBn.toLocaleString('es-MX', { maximumFractionDigits: 1 })}B
          </p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">MXN</p>
        </div>
      )}

      {/* Hover glow */}
      {isClickable && (
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${config.color}30, 0 0 20px ${config.color}08`,
          }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}
